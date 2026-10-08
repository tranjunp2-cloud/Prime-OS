// demo-data-seeder.ts
// Seeds all ECH towers using in-memory store public APIs.
// Data format: oms-types.ts schema (Order, OrderItem, OrderEvent)
// Products / SKUs: product-store.ts schema (Product, Sku)
// Fulfillment: fulfillment-store.ts schema (FulfillmentJob)
// etc.

import { getProducts, getResolvedProductSkuById, isDemoProduct } from './product-store';
import { addWarehouse, clearWarehouseStore, restoreSavedWarehouses } from './warehouse-store';
import { addInventoryPosition, clearInventoryStore, getInventoryPositions, updatePosition } from './inventory-store';
import {
  addFulfillmentException,
  addFulfillmentJob,
  addFulfillmentJobItem,
  clearFulfillmentStore,
  createShipmentForJob,
  createTrackingEvent,
} from './fulfillment-store';
import { addReturnItem, clearReturnStore } from './return-store';
import { addListing, clearListingStore } from './listing-store';
import {
  _clearAll as clearOrders,
  addOrder,
  addOrderEvent,
  addOrderItem,
  getOrderEvents,
  getOrderItems,
  getOrders,
  getAllOrderItems,
  updateOrder,
} from './order-store';
import { createCrmItem, clearCrmQueue } from './crm-queue-store';
import { createBooking, clearBookingStore } from './booking-store';
import { clearReservationStore, createReservation, confirmReservation, allocateReservation, type ReservationSource } from './reservation-store';
import { channelIntegrationsApi, type ConnectedChannelRecord } from './channel-integrations-api';
import { resolveProductShopSources, shopsAtWarehouse } from './warehouse-shop-sources';
import { getCatalogImportItems } from './catalog-import-store';
import { orderHoldCounters, orderHoldsForPosition, orderHoldState } from './warehouse-order-holds';
import { canEditWarehouseStock } from './warehouse-stock-view';
import type { FulfillmentJob } from './fulfillment-store';
import type { Listing } from './listing-store';
import type { Order } from './oms-types';
import type { ReturnStatus } from './return-store';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function daysAhead(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

function hoursAgo(n: number): string {
  const d = new Date();
  d.setHours(d.getHours() - n);
  return d.toISOString();
}

function genId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function stableSeedId(prefix: string, value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return `${prefix}_${normalized}`;
}

function skuCode(base: string, suffix: string): string {
  return `${base}-${suffix}`.toUpperCase().replace(/\s+/g, '-');
}

type OrderStatus = 'pending' | 'ready_to_ship' | 'shipping' | 'completed' | 'cancelled' | 'returned';
type LifecycleStage = 'captured' | 'validated' | 'allocated' | 'reserved' | 'released_to_fulfillment' | 'shipped' | 'delivered' | 'closed' | 'cancelled' | 'return_in_progress';
type Channel = 'amazon' | 'rakuten' | 'shopee' | 'manual';

interface SeedSkuRef {
  skuId: string;
  productId: string;
  familyCode: string;
  skuCode: string;
  name: string;
  productName: string;
  unitPrice: number;
}

// SKU reference used for generating order lines
const SKU_REFS: SeedSkuRef[] = [];
const seededPositionIds = new Set<string>();
let demoShops: ConnectedChannelRecord[] = [];

function sourceFor(sku: SeedSkuRef, warehouseId: string | null, channel?: Channel) {
  const product = getProducts().find(item => item.id === sku.productId)!;
  const sources = resolveProductShopSources(product, demoShops, getCatalogImportItems({ requireConfirmation: true }));
  const confirmed = warehouseId ? shopsAtWarehouse(sources, warehouseId, product.has_variants ? sku.skuId : undefined).shops : [];
  const group = confirmed.find(item => ['amazon', 'rakuten', 'shopee'].includes(item.shop.platform) && (!channel || item.shop.platform === channel));
  if (!group) return undefined;
  return { channel: group.shop.platform as Channel, label: `${group.shop.name} · ${group.shop.store_name}`,
    shop_id: group.shop.id, store_name: group.shop.store_name, listing_id: group.listings[0].listing.external_id,
    stock_source_warehouse_id: group.listings[0].warehouseId };
}

function freshPositions(sku: SeedSkuRef) {
  return getInventoryPositions().filter(position => seededPositionIds.has(position.id) && position.product_id === sku.productId && position.sku_id === sku.skuId && position.on_hand > 0 && canEditWarehouseStock(position.warehouse_id));
}

const HERO_SCENARIOS = [
  {
    productCode: 'CR-NTB-BLK-A5',
    skuHint: 'A5',
    orderNumber: 'PRIME-NB-1001',
    jobCode: 'FUL-NB-1001',
    channel: 'amazon' as const,
    status: 'ready_to_ship' as OrderStatus,
    lifecycle: 'reserved' as LifecycleStage,
    warehouseId: 'wh_crjp',
    quantity: 2,
    customerIndex: 0,
    createdHoursAgo: 3,
    flowType: 'seller_fulfilled' as const,
    fulfillmentStatus: 'pending' as const,
    carrierCode: 'yamato',
    story: 'Notebook bestseller queued for same-day picking out of CR-JP.',
  },
  {
    productCode: 'CR-SKB-MDN-A5',
    skuHint: 'PB',
    orderNumber: 'PRIME-SKB-1002',
    jobCode: 'FUL-SKB-1002',
    channel: 'rakuten' as const,
    status: 'shipping' as OrderStatus,
    lifecycle: 'shipped' as LifecycleStage,
    warehouseId: 'wh_3plvn',
    quantity: 1,
    customerIndex: 1,
    createdHoursAgo: 10,
    flowType: 'third_party_3pl' as const,
    fulfillmentStatus: 'shipped' as const,
    carrierCode: 'ecms',
    story: 'Rakuten watercolor order already handed off to the Vietnam 3PL lane.',
  },
  {
    productCode: 'CR-BSH-SET-12',
    orderNumber: 'PRIME-BSH-1003',
    jobCode: 'FUL-BSH-1003',
    channel: 'shopee' as const,
    status: 'completed' as OrderStatus,
    lifecycle: 'delivered' as LifecycleStage,
    warehouseId: 'wh_fbsmy',
    quantity: 1,
    customerIndex: 5,
    createdHoursAgo: 20,
    flowType: 'seller_fulfilled' as const,
    fulfillmentStatus: 'done' as const,
    carrierCode: 'japan_post',
    story: 'Shopee campaign order delivered successfully and marked complete.',
  },
  {
    productCode: 'CR-ART-MYTH-10',
    orderNumber: 'PRIME-MYTH-1004',
    jobCode: 'FUL-MYTH-1004',
    channel: 'amazon' as const,
    status: 'shipping' as OrderStatus,
    lifecycle: 'shipped' as LifecycleStage,
    warehouseId: 'wh_fbajp',
    quantity: 3,
    customerIndex: 2,
    createdHoursAgo: 32,
    flowType: 'fba' as const,
    fulfillmentStatus: 'exception' as const,
    carrierCode: 'manual',
    story: 'FBA inbound carton requires manual Amazon review before receiving closes.',
  },
  {
    productCode: 'CR-TAI-BSZ',
    orderNumber: 'PRIME-TAI-1005',
    channel: 'manual' as const,
    status: 'pending' as OrderStatus,
    lifecycle: 'captured' as LifecycleStage,
    warehouseId: null,
    quantity: 1,
    customerIndex: 7,
    createdHoursAgo: 44,
    flowType: null,
    fulfillmentStatus: null,
    carrierCode: 'manual',
    story: 'Manual preorder entered by the seller for a tailoring set customer.',
  },
] as const;

// ─── Warehouses ────────────────────────────────────────────────────────────────

function seedWarehouses() {
  [
    { id: 'wh_crjp', code: 'CR-JP', name: 'CyberRecord Japan HQ',      country: 'JP', type: 'internal' as const, capabilities: ['pick_pack', 'cold_storage', 'fragile_handling'], status: 'active' as const, address: 'Shibuya, Tokyo, Japan',         is_virtual: false },
    { id: 'wh_rslsg', code: 'RSL-SG', name: 'Reseller Singapore Hub',  country: 'SG', type: 'internal' as const, capabilities: ['pick_pack', 'oversized'],                         status: 'active' as const, address: 'Ang Mo Kio, Singapore',             is_virtual: false },
    { id: 'wh_fbsmy', code: 'FBS-MY', name: 'Fulfillment By Shopee MY', country: 'MY', type: 'fbs' as const,      capabilities: ['pick_pack', 'same_day'],                         status: 'active' as const, address: 'Kuala Lumpur, Malaysia',            is_virtual: false },
    { id: 'wh_3plvn', code: '3PL-VN', name: 'Vietnam 3PL Partner',     country: 'VN', type: '3pl' as const,      capabilities: ['pick_pack'],                                   status: 'active' as const, address: 'Ho Chi Minh City, Vietnam',        is_virtual: false },
    { id: 'wh_fbajp', code: 'FBA-JP', name: 'Fulfillment By Amazon JP',  country: 'JP', type: 'fba' as const,      capabilities: ['prime', 'cross_border'],                       status: 'active' as const, address: null,                               is_virtual: false },
  ].forEach(w => addWarehouse(w));
}

// ─── Products & SKUs ──────────────────────────────────────────────────────────
// Uses the canonical Product Master store as the source of truth.

function seedProducts() {
  SKU_REFS.length = 0;

  for (const product of getProducts().filter(product => isDemoProduct(product.id))) {
    const skus = product.skus.length > 0
      ? product.skus
      : [{
        id: `${product.id}_default`,
        sku_code: product.sku_code,
        variation_name: 'Default',
      }];

    for (const sku of skus) {
      SKU_REFS.push({
        skuId: sku.id,
        productId: product.id,
        familyCode: product.sku_code,
        skuCode: product.has_variants ? sku.sku_code : product.sku_code,
        name: product.has_variants ? `${product.name} — ${sku.variation_name}` : product.name,
        productName: product.name,
        unitPrice: product.retail_price,
      });
    }
  }
}

// ─── Customers ─────────────────────────────────────────────────────────────────

const CUSTOMERS = [
  { name: 'Yuki Tanaka',     email: 'yuki.tanaka@example.jp',    city: 'Tokyo',        prefecture: 'Tokyo',         country: 'JP', postal: '150-0001', address: '2-3-4 Shibuya, Shibuya-ku' },
  { name: 'Sakura Yamamoto', email: 'sakura.y@example.jp',      city: 'Osaka',        prefecture: 'Osaka',         country: 'JP', postal: '530-0001', address: '5-6-7 Nakanoshima, Kita-ku' },
  { name: 'Wei Chen',        email: 'wei.chen@example.cn',    city: 'Shanghai',      prefecture: 'Shanghai',       country: 'CN', postal: '200000',  address: '123 Nanjing Road' },
  { name: 'Min-Jun Kim',     email: 'minjun.kim@example.kr',   city: 'Seoul',        prefecture: 'Seoul',          country: 'KR', postal: '03000',   address: '456 Gangnam-daero' },
  { name: 'Ahmad Razali',    email: 'ahmad.r@example.my',      city: 'Kuala Lumpur', prefecture: 'Kuala Lumpur',  country: 'MY', postal: '50000',   address: '78 Jalan Bukit Bintang' },
  { name: 'Lisa Nguyen',     email: 'lisa.ng@example.vn',      city: 'Ho Chi Minh',  prefecture: 'HCM City',       country: 'VN', postal: '70000',   address: '91 Nguyen Hue' },
  { name: 'Hiroshi Sato',     email: 'hiroshi.s@example.jp',   city: 'Nagoya',        prefecture: 'Aichi',          country: 'JP', postal: '450-0001', address: '12 Sakae, Naka-ku' },
  { name: 'Emma Thompson',    email: 'emma.t@example.sg',        city: 'Singapore',     prefecture: 'Singapore',      country: 'SG', postal: '018956',  address: '1 Raffles Place' },
  { name: 'Chen Wei',        email: 'chen.wei@example.tw',       city: 'Taipei',       prefecture: 'Taipei',         country: 'TW', postal: '10001',   address: '3 Zhongshan Road' },
  { name: 'Arisa Watanabe',  email: 'arisa.w@example.jp',      city: 'Fukuoka',      prefecture: 'Fukuoka',        country: 'JP', postal: '810-0001', address: '44 Tenjin, Chuo-ku' },
];

// ─── Status Distribution (matches UI: Pending 92, Shipping 91, Completed 95, etc.) ──────

const STATUS_MAP: { status: OrderStatus; lifecycle: LifecycleStage; cutoff: number }[] = [
  { status: 'pending',       lifecycle: 'captured',               cutoff: 0.327 },
  { status: 'ready_to_ship', lifecycle: 'reserved',              cutoff: 0.334 },
  { status: 'shipping',       lifecycle: 'shipped',               cutoff: 0.658 },
  { status: 'completed',      lifecycle: 'delivered',              cutoff: 0.996 },
  { status: 'cancelled',      lifecycle: 'cancelled',              cutoff: 1.000 },
];

function pickStatusLifecycle(idx: number): { status: OrderStatus; lifecycle: LifecycleStage } {
  const r = ((idx * 137 + 53) % 1000) / 1000;
  for (const s of STATUS_MAP) { if (r < s.cutoff) return { status: s.status, lifecycle: s.lifecycle }; }
  return { status: 'completed', lifecycle: 'delivered' };
}

function orderIdForIdx(idx: number): string {
  const suffixes = ['JP', 'JP', 'JP', 'VN', 'SG', 'MY', 'KR', 'CN', 'TW', 'JP'];
  return `PRIME-${suffixes[idx % suffixes.length]}-${String(idx + 1).padStart(4, '0')}`;
}

function findSkuRefByProductCode(productCode: string, hint?: string): SeedSkuRef {
  const candidates = SKU_REFS.filter((sku) => sku.familyCode === productCode);
  if (candidates.length === 0) {
    throw new Error(`No seeded SKU refs found for ${productCode}`);
  }

  if (!hint) return candidates[0];

  return candidates.find(sku => sku.skuCode.toLowerCase().endsWith(`-${hint.toLowerCase()}`)) ?? candidates.find((sku) => (
    sku.skuCode.toLowerCase().includes(hint.toLowerCase()) ||
    sku.name.toLowerCase().includes(hint.toLowerCase())
  )) ?? candidates[0];
}

function getStageEvents(lifecycle: LifecycleStage): { stage: LifecycleStage | 'allocated'; msg: string }[] {
  const stageEvents: { stage: LifecycleStage | 'allocated'; msg: string }[] = [];

  if (['allocated', 'reserved', 'released_to_fulfillment', 'shipped', 'delivered'].includes(lifecycle)) {
    stageEvents.push(
      { stage: 'captured', msg: 'Order captured' },
      { stage: 'allocated', msg: 'Warehouse allocated' },
    );
  } else if (lifecycle === 'captured') {
    stageEvents.push({ stage: 'captured', msg: 'Order captured' });
  }

  if (['reserved', 'released_to_fulfillment', 'shipped', 'delivered'].includes(lifecycle)) {
    stageEvents.push({ stage: 'reserved', msg: 'Inventory reserved' });
  }
  if (['released_to_fulfillment', 'shipped', 'delivered'].includes(lifecycle)) {
    stageEvents.push({ stage: 'released_to_fulfillment', msg: 'Released to fulfillment' });
  }
  if (['shipped', 'delivered'].includes(lifecycle)) {
    stageEvents.push({ stage: 'shipped', msg: 'Order shipped' });
  }
  if (lifecycle === 'delivered') {
    stageEvents.push({ stage: 'delivered', msg: 'Order delivered' });
  }
  if (lifecycle === 'return_in_progress') {
    stageEvents.push(
      { stage: 'captured', msg: 'Order captured' },
      { stage: 'shipped', msg: 'Order shipped' },
      { stage: 'return_in_progress', msg: 'Return requested' },
    );
  }
  if (lifecycle === 'cancelled') {
    stageEvents.push({ stage: 'cancelled', msg: 'Order cancelled' });
  }

  return stageEvents;
}

function seedOrderEvents(orderId: string, lifecycle: LifecycleStage, createdAt: string, story?: string) {
  const stageEvents = getStageEvents(lifecycle);

  for (let index = 0; index < stageEvents.length; index++) {
    const event = stageEvents[index];
    const eventTime = new Date(createdAt);
    eventTime.setMinutes(eventTime.getMinutes() + index * 20);
    addOrderEvent({
      id: genId('evt'),
      order_id: orderId,
      event_type: event.stage,
      message: event.msg,
      actor_type: 'system',
      actor_id: null,
      payload: null,
      created_at: eventTime.toISOString(),
    });
  }

  if (story) {
    const noteTime = new Date(createdAt);
    noteTime.setMinutes(noteTime.getMinutes() + stageEvents.length * 20 + 5);
    addOrderEvent({
      id: genId('evt'),
      order_id: orderId,
      event_type: 'note',
      message: story,
      actor_type: 'system',
      actor_id: null,
      payload: null,
      created_at: noteTime.toISOString(),
    });
  }
}

function seedHeroOrders() {
  HERO_SCENARIOS.forEach((scenario, index) => {
    const customer = CUSTOMERS[scenario.customerIndex % CUSTOMERS.length];
    const sku = findSkuRefByProductCode(scenario.productCode, 'skuHint' in scenario ? scenario.skuHint : undefined);
    const source = sourceFor(sku, scenario.warehouseId, scenario.channel);
    const historical = ['shipping', 'completed'].includes(scenario.status);
    const channel = scenario.channel;
    const unresolvedSource = !historical && channel !== 'manual' && !source;
    const status = unresolvedSource ? 'pending' : scenario.status;
    const lifecycle = unresolvedSource ? 'validated' : scenario.lifecycle;
    const warehouseId = unresolvedSource ? null : scenario.warehouseId;
    const createdAt = hoursAgo(scenario.createdHoursAgo);
    const shippingAmt = ['shipping', 'completed', 'ready_to_ship'].includes(scenario.status) ? 800 : 0;
    const subtotal = sku.unitPrice * scenario.quantity;
    const total = subtotal + shippingAmt;
    const trackingNumber = ['shipping', 'completed'].includes(scenario.status)
      ? `HERO${String(10000000 + index).padStart(10, '0')}`
      : null;

    const order: Order = {
      id: stableSeedId('demo_order', scenario.orderNumber),
      user_id: 'user_demo',
      order_id: scenario.orderNumber,
      channel,
      channel_order_ref: channel === 'manual' ? null : `${channel.toUpperCase().slice(0, 3)}-HERO-${String(1001 + index)}`,
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: `+81-80-${String(3100 + index).padStart(4, '0')}-${String(5100 + index).padStart(4, '0')}`,
      shipping_address: `${customer.address}, ${customer.city}, ${customer.prefecture} ${customer.postal}, ${customer.country}`,
      shipping_method: scenario.flowType === 'fba' ? 'Amazon Partnered Carrier' : 'Express',
      tracking_number: trackingNumber,
      ship_to: {
        name: customer.name,
        address1: customer.address,
        city: customer.city,
        prefecture: customer.prefecture,
        postal_code: customer.postal,
        country: customer.country,
      },
      currency: 'JPY',
      subtotal_amount: subtotal,
      shipping_amount: shippingAmt,
      discount_amount: 0,
      total_amount: total,
      status,
      lifecycle_stage: lifecycle,
      risk_flags: unresolvedSource ? ['SHOP_SOURCE_UNCONFIRMED'] : scenario.fulfillmentStatus === 'exception' ? ['SLA_AT_RISK', 'MANUAL_REVIEW'] : [],
      allocated_warehouse_id: warehouseId,
      allocation_policy_snapshot: { ...source, stock_source_label: channel === 'manual' ? 'Manual order' : source?.label ?? `${channel} · ${historical ? 'Historical order' : 'Shop source unconfirmed'}` },
      sla_target_days: scenario.fulfillmentStatus === 'exception' ? 2 : 3,
      order_date: createdAt,
      created_at: createdAt,
      updated_at: createdAt,
      warehouse_id: warehouseId,
    };

    addOrder(order);
    addOrderItem({
      id: stableSeedId('demo_line', scenario.orderNumber),
      order_id: order.id, product_id: sku.productId, sku_id: sku.skuId,
      sku: sku.skuCode,
      product_name: sku.productName,
      quantity: scenario.quantity,
      price_per_unit: sku.unitPrice,
      created_at: createdAt,
    });
    seedOrderEvents(order.id, lifecycle, createdAt, unresolvedSource ? 'Confirm the listing shop and warehouse source before reserving stock.' : scenario.story);
  });
}

// ─── Orders + OrderItems + Events ───────────────────────────────────────────────────

function seedOrders() {
  clearOrders();
  const candidates = SKU_REFS.flatMap(sku => {
    if (getResolvedProductSkuById(sku.skuId)?.product.id !== sku.productId) return [];
    return freshPositions(sku).flatMap(position => {
      const source = sourceFor(sku, position.warehouse_id);
      return source ? [{ sku, position, source }] : [];
    });
  });

  for (let i = 0; i < 281 && candidates.length; i++) {
    const orderId = stableSeedId('demo_order', orderIdForIdx(i));
    const { status, lifecycle } = pickStatusLifecycle(i);
    const customer = CUSTOMERS[i % CUSTOMERS.length];
    const candidate = candidates[i % candidates.length];
    const selectedSku = candidate.sku;
    const daysBack = (i * 3 + 7) % 60;
    const createdAt = daysAgo(daysBack);

    const lineCount = 1;
    let subtotal = 0;
    const lines: { sku: typeof SKU_REFS[0]; qty: number; unitPrice: number }[] = [];
    for (let li = 0; li < lineCount; li++) {
      const sku = selectedSku;
      const unitPrice = 1980 + (li * 1000) + ((i * 137 + li * 31) % 3000);
      const qty = Math.min((i % 3) + 1, candidate.position.on_hand);
      subtotal += unitPrice * qty;
      lines.push({ sku, qty, unitPrice });
    }

    const shippingAmt = ['shipping', 'completed', 'ready_to_ship'].includes(status) ? 800 : 0;
    const discount = i % 5 === 0 ? Math.floor(subtotal * 0.1) : 0;
    const total = subtotal + shippingAmt - discount;

    const hasWarehouse = ['ready_to_ship', 'shipping', 'completed'].includes(status);
    const warehouseId = hasWarehouse ? candidate.position.warehouse_id : null;
    const source = candidate.source;
    const channel = source.channel;

    const isAtRisk = status === 'pending' && i % 17 === 0;
    const riskFlags = isAtRisk ? ['HIGH_VALUE', 'SLA_AT_RISK'] : [];

    const order: Order = {
      id: orderId, user_id: 'user_demo',
      order_id: orderIdForIdx(i), channel, channel_order_ref: channel === 'manual' ? null : `${channel.toUpperCase().slice(0, 3)}-${20260000 + i}`,
      customer_name: customer.name, customer_email: customer.email,
      customer_phone: i % 2 === 0 ? `+81-90-${String(1000 + i).padStart(4, '0')}-${String(5000 + i).padStart(4, '0')}` : null,
      shipping_address: `${customer.address}, ${customer.city}, ${customer.prefecture} ${customer.postal}, ${customer.country}`,
      shipping_method: null,
      tracking_number: ['shipping', 'completed'].includes(status) ? `TRK${String(100000000 + i).padStart(12, '0')}` : null,
      ship_to: { name: customer.name, address1: customer.address, city: customer.city, prefecture: customer.prefecture, postal_code: customer.postal, country: customer.country },
      currency: 'JPY', subtotal_amount: subtotal, shipping_amount: shippingAmt, discount_amount: discount, total_amount: total,
      status, lifecycle_stage: lifecycle, risk_flags: riskFlags,
      allocated_warehouse_id: warehouseId, allocation_policy_snapshot: { ...source, stock_source_label: source.label },
      sla_target_days: 3, order_date: createdAt, created_at: createdAt, updated_at: createdAt, warehouse_id: warehouseId,
    };
    addOrder(order);

    // Order items
    for (const line of lines) {
      addOrderItem({
        id: stableSeedId('demo_line', `${orderId}-${line.sku.productId}-${line.sku.skuId}`), order_id: orderId, sku: line.sku.skuCode, product_name: line.sku.name,
        quantity: line.qty, price_per_unit: line.unitPrice, created_at: createdAt, product_id: line.sku.productId, sku_id: line.sku.skuId,
      });
    }
  }

  for (const order of getOrders()) {
    if (getOrderEvents(order.id).length === 0) {
      seedOrderEvents(order.id, order.lifecycle_stage, order.created_at);
    }
  }

  seedHeroOrders();
}

// ─── Inventory ──────────────────────────────────────────────────────────────────

function splitEvenly(total: number, parts: number): number[] {
  if (parts <= 0) return [];
  const base = Math.floor(total / parts);
  let remainder = total % parts;

  return Array.from({ length: parts }, () => {
    const value = base + (remainder > 0 ? 1 : 0);
    remainder = Math.max(0, remainder - 1);
    return value;
  });
}

function seedInventory() {
  const products = getProducts();

  for (const product of products) {
    const productSkus = SKU_REFS.filter((sku) => sku.productId === product.id);
    const inventoryEntries = Object.entries(product.inventory);
    if (productSkus.length === 0 || inventoryEntries.length === 0) continue;

    inventoryEntries.forEach(([warehouseId, totalOnHand], warehouseIndex) => {
      const perSkuOnHand = splitEvenly(totalOnHand, productSkus.length);

      productSkus.forEach((sku, skuIndex) => {
        const variantCount = product.skus.find(item => item.id === sku.skuId)?.stock_by_location?.[warehouseId];
        // A variant position must use its own recorded count, never a share of the parent total.
        if (product.has_variants && typeof variantCount !== 'number') return;
        const onHand = product.has_variants ? variantCount! : perSkuOnHand[skuIndex] ?? 0;
        const verified = product.warehouse_positions?.find(position => position.warehouse_id === warehouseId && position.sku_id === sku.skuId);
        if (verified) { addInventoryPosition(verified); return; }
        // An audited count with no verified position has unknown holds. Demo
        // percentages must never turn that unknown balance into sellable stock.
        const auditedSku = product.has_variants ? sku.skuCode : product.sku_code;
        if (product.inventory_adjustments?.some(change => change.warehouseId === warehouseId && change.sku === auditedSku)
          || product.inventory_transfers?.some(change => change.sku === auditedSku && (change.fromWarehouseId === warehouseId || change.toWarehouseId === warehouseId))) return;
        const id = stableSeedId('demo_inventory', `${product.id}-${sku.skuId}-${warehouseId}`);
        seededPositionIds.add(id);
        addInventoryPosition({
          id,
          sku_id: sku.skuId,
          product_id: sku.productId,
          warehouse_id: warehouseId,
          on_hand: onHand,
          reserved_unpaid: 0,
          reserved_paid: 0,
          allocated: 0,
          inbound: 0,
          order_holds: [],
          outbound: 0,
          unfulfillable: 0,
          return_pending: 0,
          safety_stock: 0,
          campaign_lock: 0,
          version: 1,
          updated_at: daysAgo((warehouseIndex + skuIndex) % 6),
        });
      });
    });
  }
}

/** Allocate each active demo order atomically, using only untouched demo balances. */
function reconcileDemoOrderHolds() {
  const positions = getInventoryPositions().filter(position => seededPositionIds.has(position.id));
  const remaining = new Map(positions.map(position => [position.id, Math.max(0, position.on_hand - position.safety_stock - position.campaign_lock - position.unfulfillable)]));
  for (const order of [...getOrders()].sort((a, b) => a.order_id.localeCompare(b.order_id))) {
    if (!orderHoldState(order)) continue;
    const lines = getOrderItems(order.id);
    const quantities = new Map<string, number>();
    for (const line of lines) {
      const position = positions.find(item => item.product_id === line.product_id && item.sku_id === line.sku_id && item.warehouse_id === order.allocated_warehouse_id);
      if (position) quantities.set(position.id, (quantities.get(position.id) ?? 0) + line.quantity);
    }
    const matched = lines.every(line => positions.some(item => item.product_id === line.product_id && item.sku_id === line.sku_id && item.warehouse_id === order.allocated_warehouse_id));
    if (!lines.length || !matched || [...quantities].some(([id, quantity]) => quantity > remaining.get(id)!)) {
      updateOrder(order.id, { status: 'pending', lifecycle_stage: 'validated', allocated_warehouse_id: null, warehouse_id: null, risk_flags: [...order.risk_flags, 'STOCK_NOT_RESERVED'] });
      addOrderEvent({ id: stableSeedId('demo_stock_shortage', order.id), order_id: order.id, event_type: 'reservation_failed', message: 'Stock has not been reserved. Review the available warehouse balance.', actor_type: 'system', actor_id: null, payload: null, created_at: new Date().toISOString() });
      continue;
    }
    for (const [id, quantity] of quantities) remaining.set(id, remaining.get(id)! - quantity);
  }
  refreshDemoOrderHolds();
}

function refreshDemoOrderHolds() {
  for (const position of getInventoryPositions().filter(item => seededPositionIds.has(item.id))) {
    const holds = orderHoldsForPosition(position, getOrders(), getAllOrderItems());
    updatePosition(position.id, { ...orderHoldCounters(holds), order_holds: holds });
  }
}

function seedOrderReservationLedger() {
  for (const position of getInventoryPositions()) {
    const expected = orderHoldsForPosition(position, getOrders(), getAllOrderItems());
    for (const hold of position.order_holds ?? []) {
      if (!expected.some(item => item.lineId === hold.lineId && item.quantity === hold.quantity && item.state === hold.state)) continue;
      const order = getOrders().find(item => item.id === hold.orderId)!;
      const record = createReservation({ order_ref: hold.orderNumber, sku_id: position.sku_id, warehouse_id: position.warehouse_id,
        product_id: position.product_id, order_item_id: hold.lineId, qty: hold.quantity,
        source: order.channel.toUpperCase() as ReservationSource, idempotency_key: `demo_hold:${hold.lineId}` });
      if (record && hold.state !== 'reserved_unpaid') confirmReservation(record.id);
      if (record && hold.state === 'allocated') allocateReservation(record.id);
    }
  }
}

// ─── Fulfillment Jobs ─────────────────────────────────────────────────────────

function seedFulfillmentJobs() {
  clearFulfillmentStore();

  const orders = getOrders();
  const statuses = ['pending', 'picking', 'packed', 'shipped', 'done', 'exception'] as const;
  const flowBlueprints = [
    {
      flowType: 'seller_fulfilled',
      fulfillmentType: 'CR Direct',
      warehouseId: 'wh_crjp',
      partnerId: null,
      carrierCode: 'yamato',
    },
    {
      flowType: 'third_party_3pl',
      fulfillmentType: '3PL-VN Partner',
      warehouseId: 'wh_3plvn',
      partnerId: 'partner_3plvn',
      carrierCode: 'ecms',
    },
    {
      flowType: 'marketplace_observer',
      fulfillmentType: 'Marketplace Observer',
      warehouseId: 'wh_fbsmy',
      partnerId: null,
      carrierCode: 'manual',
    },
    {
      flowType: 'fba',
      fulfillmentType: 'FBA-JP',
      warehouseId: 'wh_fbajp',
      partnerId: null,
      carrierCode: 'manual',
    },
  ] as const;
  const fulfillmentCenters = ['TYO22', 'TPR2', 'FSZ1', 'KIX1'];

  const flowBlueprintByType = {
    seller_fulfilled: flowBlueprints[0],
    third_party_3pl: flowBlueprints[1],
    marketplace_observer: flowBlueprints[2],
    fba: flowBlueprints[3],
  } as const;

  function createFulfillmentJobForOrder({
    order,
    status,
    flow,
    createdAt,
    pickedAt,
    packedAt,
    shippedAt,
    trackingNumber,
    jobCode,
    notes,
    priority = 'normal',
  }: {
    order: Order;
    status: typeof statuses[number];
    flow: Omit<typeof flowBlueprints[number], 'warehouseId'> & { warehouseId: string };
    createdAt: string;
    pickedAt: string | null;
    packedAt: string | null;
    shippedAt: string | null;
    trackingNumber: string | null;
    jobCode: string;
    notes: string | null;
    priority?: 'critical' | 'normal';
  }) {
    const isFba = flow.flowType === 'fba';
    const jobId = stableSeedId('job', jobCode);
    const prepStatus = !isFba
      ? null
      : status === 'pending'
      ? 'preparing'
      : status === 'picking'
      ? 'prepped'
      : status === 'packed' || status === 'shipped' || status === 'done'
      ? 'labelled'
      : 'preparing';
    const inboundStatus = !isFba
      ? null
      : status === 'shipped'
      ? 'shipping'
      : status === 'done'
      ? 'closed'
      : 'working';

    addFulfillmentJob({
      id: jobId,
      order_id: order.id,
      warehouse_id: flow.warehouseId,
      user_id: 'user_demo',
      fulfillment_type: flow.fulfillmentType,
      flow_type: flow.flowType,
      status,
      priority,
      sla_target_days: 3,
      sla_due_at: daysAhead(status === 'exception' ? 1 : 3),
      job_code: jobCode,
      notes,
      assigned_to: status === 'pending' ? 'staff_01' : 'staff_02',
      partner_id: flow.partnerId,
      handoff_status: flow.flowType === 'third_party_3pl' && ['shipped', 'done'].includes(status) ? 'handoff_complete' : 'pending',
      external_priority: null,
      external_notes: null,
      created_at: createdAt,
      updated_at: shippedAt ?? packedAt ?? pickedAt ?? createdAt,
      picked_at: pickedAt,
      packed_at: packedAt,
      shipped_at: shippedAt,
      carrier: flow.flowType === 'marketplace_observer' ? null : flow.carrierCode,
      tracking_number: trackingNumber,
      fba_shipment_id: isFba && status !== 'pending' ? `FBA-JP-${jobCode.slice(-4)}` : null,
      fulfillment_center_id: isFba && status !== 'pending' ? fulfillmentCenters[jobCode.length % fulfillmentCenters.length] : null,
      fba_prep_status: prepStatus,
      inbound_shipment_status: inboundStatus,
    } as FulfillmentJob);

    getOrderItems(order.id).forEach((line) => {
      const sku = SKU_REFS.find(candidate => candidate.productId === line.product_id && candidate.skuId === line.sku_id);
      if (!sku) return;

      addFulfillmentJobItem({
        id: genId('fji'),
        job_id: jobId,
        sku_id: sku.skuId,
        qty: line.quantity,
        quantity_ordered: line.quantity,
        picked_qty: status === 'pending' ? 0 : status === 'picking' ? Math.max(line.quantity - 1, 0) : line.quantity,
        packed_qty: ['packed', 'shipped', 'done'].includes(status) ? line.quantity : 0,
        status: status === 'exception'
          ? 'short_pick'
          : ['packed', 'shipped', 'done'].includes(status)
          ? 'packed'
          : status === 'picking'
          ? 'picked'
          : 'open',
        created_at: createdAt,
        updated_at: shippedAt ?? packedAt ?? pickedAt ?? createdAt,
      });
    });

    if (['shipped', 'done'].includes(status) && flow.flowType !== 'marketplace_observer') {
      const shipment = createShipmentForJob({
        jobId,
        carrierCode: flow.carrierCode,
        trackingNumber: trackingNumber ?? undefined,
        serviceLevel: isFba ? 'inbound' : 'standard',
        status: status === 'done' ? 'delivered' : 'shipped',
      });

      createTrackingEvent({
        shipmentId: shipment.id,
        eventCode: 'label_created',
        eventMessage: 'Shipping label generated for fulfillment handoff.',
        eventTime: packedAt ?? createdAt,
      });

      createTrackingEvent({
        shipmentId: shipment.id,
        eventCode: status === 'done' ? 'delivered' : 'shipped',
        eventMessage: status === 'done'
          ? 'Shipment delivered successfully.'
          : 'Shipment departed origin facility.',
        eventTime: shippedAt ?? createdAt,
      });
    }

    if (status === 'exception') {
      addFulfillmentException({
        id: genId('fex'),
        job_id: jobId,
        type: isFba ? 'delivery_failed' : 'short_pick',
        severity: isFba ? 'high' : 'med',
        note: isFba
          ? 'Amazon inbound shipment needs manual review before receiving can close.'
          : 'Picked quantity does not match reserved allocation.',
        resolved_at: null,
        created_at: packedAt ?? createdAt,
      });
    }
  }

  const backgroundOrders = orders.filter((order) => (
    !HERO_SCENARIOS.some((scenario) => scenario.orderNumber === order.order_id) &&
    ['ready_to_ship', 'shipping', 'completed'].includes(order.status)
  ));

  for (let i = 0; i < Math.min(18, backgroundOrders.length); i++) {
    const order = backgroundOrders[i % backgroundOrders.length];
    const status = order.status === 'completed' ? 'done' : order.status === 'shipping' ? 'shipped' : 'pending';
    const warehouseId = order.allocated_warehouse_id ?? order.warehouse_id!;
    const blueprint = warehouseId === 'wh_fbajp' ? flowBlueprints[3] : warehouseId === 'wh_fbsmy' ? flowBlueprints[2] : warehouseId === 'wh_3plvn' ? flowBlueprints[1] : flowBlueprints[0];
    const flow = { ...blueprint, warehouseId };
    const createdAt = daysAgo((i * 2) % 12);
    const pickedAt = ['picking', 'packed', 'shipped', 'done', 'exception'].includes(status) ? daysAgo(Math.max(0, ((i * 2) % 12) - 1)) : null;
    const packedAt = ['packed', 'shipped', 'done'].includes(status) ? daysAgo(Math.max(0, ((i * 2) % 12) - 2)) : null;
    const shippedAt = ['shipped', 'done'].includes(status) ? daysAgo(Math.max(0, ((i * 2) % 12) - 3)) : null;
    const trackingNumber = ['shipped', 'done'].includes(status) && flow.flowType !== 'marketplace_observer'
      ? `${flow.flowType === 'fba' ? 'FBA' : 'JP'}${String(10000000 + i).padStart(10, '0')}`
      : null;

    createFulfillmentJobForOrder({
      order,
      status,
      flow,
      createdAt,
      pickedAt,
      packedAt,
      shippedAt,
      trackingNumber,
      jobCode: `JOB-${String(2100 + i).padStart(4, '0')}`,
      notes: i % 6 === 0 ? 'Demo background workload generated from seeded OMS orders.' : null,
      priority: i % 5 === 0 ? 'critical' : 'normal',
    });
  }

  HERO_SCENARIOS.forEach((scenario, index) => {
    if (!scenario.fulfillmentStatus || !scenario.flowType) return;

    const order = orders.find((candidate) => candidate.order_id === scenario.orderNumber);
    if (!order || !order.allocated_warehouse_id || order.status === 'pending') return;

    const flow = { ...flowBlueprintByType[scenario.flowType], warehouseId: order.allocated_warehouse_id };
    const createdAt = hoursAgo(scenario.createdHoursAgo);
    const pickedAt = ['picking', 'packed', 'shipped', 'done', 'exception'].includes(scenario.fulfillmentStatus) ? hoursAgo(Math.max(scenario.createdHoursAgo - 1, 1)) : null;
    const packedAt = ['packed', 'shipped', 'done', 'exception'].includes(scenario.fulfillmentStatus) ? hoursAgo(Math.max(scenario.createdHoursAgo - 2, 1)) : null;
    const shippedAt = ['shipped', 'done'].includes(scenario.fulfillmentStatus) ? hoursAgo(Math.max(scenario.createdHoursAgo - 3, 1)) : null;
    const trackingNumber = ['shipped', 'done'].includes(scenario.fulfillmentStatus)
      ? `${scenario.flowType === 'fba' ? 'FBA' : 'HERO'}${String(2200 + index).padStart(6, '0')}`
      : null;

    createFulfillmentJobForOrder({
      order,
      status: scenario.fulfillmentStatus,
      flow,
      createdAt,
      pickedAt,
      packedAt,
      shippedAt,
      trackingNumber,
      jobCode: scenario.jobCode,
      notes: scenario.story,
      priority: scenario.fulfillmentStatus === 'exception' ? 'critical' : 'normal',
    });
  });
}

// ─── Returns ─────────────────────────────────────────────────────────────────

function seedReturns() {
  const returnScenarios = [
    {
      orderNumber: 'PRIME-BSH-1003',
      status: 'completed',
      reason: 'Brush tip bent on arrival',
      refundAmount: 4900,
      qcGrade: 'A' as const,
      disposition: 'restock' as const,
      qcNotes: 'Minor packaging dent only. Product passed QC and was returned to sellable stock.',
      createdAt: daysAgo(6),
      receivedAt: daysAgo(4),
      completedAt: daysAgo(2),
    },
    {
      orderNumber: 'PRIME-MYTH-1004',
      status: 'qc',
      reason: 'Outer pack damaged during FBA inbound review',
      refundAmount: 1980,
      qcGrade: 'B' as const,
      disposition: null,
      qcNotes: 'Awaiting final disposition after manual inspection.',
      createdAt: daysAgo(3),
      receivedAt: daysAgo(1),
      completedAt: null,
    },
    {
      orderNumber: 'PRIME-TAI-1005',
      status: 'authorized',
      reason: 'Customer changed mind before launch allocation',
      refundAmount: null,
      qcGrade: null,
      disposition: null,
      qcNotes: null,
      createdAt: daysAgo(1),
      receivedAt: null,
      completedAt: null,
    },
  ] as const;

  returnScenarios.forEach((scenario, index) => {
    const order = getOrders().find((candidate) => candidate.order_id === scenario.orderNumber);
    if (!order) return;

    addReturnItem({
      id: genId('ret'),
      order_id: order.id,
      rma_number: `RMA-${String(4100 + index).padStart(4, '0')}`,
      reason: scenario.reason,
      status: scenario.status as ReturnStatus,
      qc_grade: scenario.qcGrade,
      disposition: scenario.disposition,
      refund_amount: scenario.refundAmount,
      qc_notes: scenario.qcNotes,
      created_at: scenario.createdAt,
      received_at: scenario.receivedAt,
      completed_at: scenario.completedAt,
    });
  });
}

// ─── Listings ────────────────────────────────────────────────────────────────

function seedListings() {
  const supportedChannels = new Set(['amazon', 'rakuten', 'shopee', 'website']);

  getProducts().forEach((product, productIndex) => {
    const productSkus = SKU_REFS.filter((sku) => sku.productId === product.id);
    const primarySku = productSkus[0];
    if (!primarySku) return;

    product.channels
      .filter((channelConfig) => supportedChannels.has(channelConfig.channel))
      .forEach((channelConfig, channelIndex) => {
        const listingStatus = channelConfig.status === 'draft'
          ? 'draft'
          : channelConfig.status === 'active'
          ? 'published'
          : 'paused';

        addListing({
          id: genId('lst'),
          sku_id: primarySku.skuId,
          channel: channelConfig.channel as Listing['channel'],
          channel_product_id: channelConfig.external_id ?? `${channelConfig.channel.toUpperCase().slice(0, 3)}-${primarySku.skuCode}`,
          channel_sku: primarySku.skuCode,
          title: product.name,
          description: product.description,
          price: product.retail_price,
          currency: product.price_currency,
          category_id: product.category.toLowerCase().replace(/\s+/g, '-'),
          attributes: {
            brand: product.brand,
            condition: product.condition,
            origin: product.country_of_origin,
          },
          images: product.images,
          status: listingStatus,
          error_message: null,
          published_at: listingStatus === 'published' ? daysAgo(productIndex + channelIndex + 2) : null,
          last_synced_at: listingStatus !== 'draft' ? daysAgo((productIndex + channelIndex) % 4) : null,
          created_at: product.created_at,
          updated_at: product.updated_at,
        });
      });
  });
}

// ─── CRM Queue ────────────────────────────────────────────────────────────

function seedCrmQueue() {
  const seedItems = [
    { platform: 'telegram', text: 'Size XL màu đen còn không ạ?', customerName: 'Nguyen Van A', customerId: 'cust_a', intent: 'ask_stock' },
    { platform: 'whatsapp', text: 'Cho mình đặt 2 cái sketchbook A5', customerName: 'Trang Nguyen', customerId: 'cust_b', intent: 'buy_now' },
    { platform: 'facebook', text: 'Giá combo brush set bao nhiêu vậy shop?', customerName: 'Minh Pham', customerId: 'cust_c', intent: 'ask_price' },
    { platform: 'tiktok', text: 'Order #1342 chưa thấy tracking, kiểm tra giúp mình', customerName: 'Lan Tran', customerId: 'cust_d', intent: 'support', orderId: 'PRIME-NB-1001' },
    { platform: 'telegram', text: 'Bên mình có hỗ trợ ship Nhật không ạ?', customerName: 'Hieu Le', customerId: 'cust_e', intent: 'support' },
    { platform: 'zalo', text: 'Cho em chốt art mythology set ạ!', customerName: 'Thao Vu', customerId: 'cust_f', intent: 'buy_now' },
    { platform: 'instagram', text: 'Có giao hàng quốc tế ko shop? Ship Malay bao lâu?', customerName: 'Ahmad Razali', customerId: 'cust_g', intent: 'support' },
    { platform: 'line', text: '前回注文したノートブックの色違いが欲しいです', customerName: 'Yuki Tanaka', customerId: 'cust_h', intent: 'buy_now' },
  ];

  for (const item of seedItems) {
    createCrmItem({
      platform: item.platform,
      messageText: item.text,
      customerName: item.customerName,
      customerId: item.customerId,
      conversationId: `conv_${item.customerId}`,
      orderId: item.orderId,
    });
  }

  // Assign some items to operators for realistic dashboard state
  const items = [...(getOrders())]; // dummy ref
  // Manually seed some bookings too
  createBooking({
    customerId: 'cust_a',
    customerName: 'Nguyen Van A',
    packageId: 'pkg_product_demo',
    staffId: 'staff_sarah',
    startTime: new Date(Date.now() + 3600_000).toISOString(),
  });
  createBooking({
    customerId: 'cust_b',
    customerName: 'Trang Nguyen',
    packageId: 'pkg_growth_consult',
    staffId: 'staff_sarah',
    startTime: new Date(Date.now() + 7200_000).toISOString(),
  });
  createBooking({
    customerId: 'cust_f',
    customerName: 'Thao Vu',
    packageId: 'pkg_impl_workshop',
    staffId: 'staff_alex',
    startTime: new Date(Date.now() + 86400_000).toISOString(),
  });


}

// ─── Main ───────────────────────────────────────────────────────────────────────

let _seeded = false;
let seeding: Promise<{ success: boolean }> | null = null;

export function seedDemoData(_userId?: string, shops?: ConnectedChannelRecord[]): Promise<{ success: boolean }> {
  if (_seeded) return Promise.resolve({ success: true });
  if (seeding) return seeding;
  seeding = runSeedDemoData(shops);
  return seeding;
}

async function runSeedDemoData(shops?: ConnectedChannelRecord[]): Promise<{ success: boolean }> {
  try {
    demoShops = shops ?? await channelIntegrationsApi.channels().then(result => result.data).catch(() => []);
    clearWarehouseStore();
    clearOrders();
    clearInventoryStore();
    clearFulfillmentStore();
    clearReturnStore();
    clearListingStore();
    clearCrmQueue();
    clearReservationStore();
    clearBookingStore();

    seededPositionIds.clear();
    seedProducts();
    seedWarehouses();
    restoreSavedWarehouses();
    seedInventory();
    seedOrders();
    reconcileDemoOrderHolds();
    for (const product of getProducts()) for (const snapshot of product.warehouse_positions ?? []) {
      if (!getInventoryPositions().some(position => position.product_id === snapshot.product_id && position.sku_id === snapshot.sku_id && position.warehouse_id === snapshot.warehouse_id)) addInventoryPosition(snapshot);
    }
    seedFulfillmentJobs();
    refreshDemoOrderHolds();
    seedOrderReservationLedger();
    seedReturns();
    seedListings();
    seedCrmQueue();
    _seeded = true;
    return { success: true };
  } catch (e) {
    console.error('[seedDemoData]', e);
    return { success: false };
  } finally { seeding = null; }
}
