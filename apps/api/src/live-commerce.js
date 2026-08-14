import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const STORE_PATH = path.resolve(process.env.PRIME_LIVE_COMMERCE_STORE_PATH || path.join('data', 'live-commerce.json'));
const RELEASE_POLICIES = new Set(['IMMEDIATE_ON_END', 'HOLD_2_HOURS', 'MANUAL_RELEASE']);

const channels = [
  { id: 'tiktok_vn_01', name: 'TikTok Shop', account_name: 'Prime Live Store' },
  { id: 'shopee_vn_01', name: 'Shopee Live', account_name: 'Prime Beauty Official' },
  { id: 'primeweb_vn_01', name: 'PrimeWeb', account_name: 'primebeauty.vn' },
];

const warehouses = [
  { id: 'wh_hcm_01', name: 'HCM Central Warehouse' },
  { id: 'wh_hanoi_01', name: 'Hanoi Fulfillment Hub' },
  { id: 'wh_d1_01', name: 'District 1 Flagship' },
];

const inventorySeed = {
  wh_hcm_01: [
    { sku_id: 'PRM-SRM-01', title: 'Prime Renewal Serum', variant: '30 ml', available_atp: 920, reserved_live: 0, base_price: 349000 },
    { sku_id: 'PRM-LIP-02', title: 'Velvet Tint', variant: 'Rose 02', available_atp: 680, reserved_live: 0, base_price: 189000 },
    { sku_id: 'PRM-SPF-50', title: 'Daily Defense Sunscreen', variant: 'SPF 50 · 50 ml', available_atp: 740, reserved_live: 0, base_price: 279000 },
    { sku_id: 'PRM-MSK-05', title: 'Hydra Sheet Mask', variant: '5 pack', available_atp: 480, reserved_live: 0, base_price: 129000 },
  ],
  wh_hanoi_01: [
    { sku_id: 'PRM-SRM-01', title: 'Prime Renewal Serum', variant: '30 ml', available_atp: 510, reserved_live: 0, base_price: 349000 },
    { sku_id: 'PRM-LIP-02', title: 'Velvet Tint', variant: 'Rose 02', available_atp: 420, reserved_live: 0, base_price: 189000 },
    { sku_id: 'PRM-CLN-01', title: 'Gentle Gel Cleanser', variant: '150 ml', available_atp: 360, reserved_live: 0, base_price: 239000 },
  ],
  wh_d1_01: [
    { sku_id: 'PRM-SRM-01', title: 'Prime Renewal Serum', variant: '30 ml', available_atp: 180, reserved_live: 0, base_price: 349000 },
    { sku_id: 'PRM-LIP-02', title: 'Velvet Tint', variant: 'Rose 02', available_atp: 260, reserved_live: 0, base_price: 189000 },
  ],
};

function isoOffset(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function buildSeed() {
  return {
    channels,
    warehouses,
    inventory: inventorySeed,
    sessions: [
      {
        id: 'live_88_beauty', title: '8.8 Beauty Mega Live', channel_id: 'tiktok_vn_01', host_name: 'Linh Nguyen', warehouse_id: 'wh_hcm_01', scheduled_start_at: isoOffset(-1), duration_hours: 4, auto_release_policy: 'IMMEDIATE_ON_END', enable_safety_buffer: true, status: 'LIVE', allocated_qty: 800, sold_qty: 612, orders_count: 284, attributed_revenue: 48620000,
        allocated_items: [
          { sku_id: 'PRM-SRM-01', title: 'Prime Renewal Serum', variant: '30 ml', allocated_qty: 500, sold_qty: 394, live_price: 299000 },
          { sku_id: 'PRM-LIP-02', title: 'Velvet Tint', variant: 'Rose 02', allocated_qty: 300, sold_qty: 218, live_price: 159000 },
        ], created_at: isoOffset(-24), updated_at: isoOffset(-0.02), ended_at: null, release_status: 'RESERVED',
      },
      {
        id: 'live_shopee_payday', title: 'Shopee Payday Showcase', channel_id: 'shopee_vn_01', host_name: 'Mai Anh', warehouse_id: 'wh_hanoi_01', scheduled_start_at: isoOffset(1), duration_hours: 3, auto_release_policy: 'HOLD_2_HOURS', enable_safety_buffer: true, status: 'SCHEDULED', allocated_qty: 540, sold_qty: 318, orders_count: 126, attributed_revenue: 22440000,
        allocated_items: [{ sku_id: 'PRM-SRM-01', title: 'Prime Renewal Serum', variant: '30 ml', allocated_qty: 300, sold_qty: 184, live_price: 309000 }, { sku_id: 'PRM-LIP-02', title: 'Velvet Tint', variant: 'Rose 02', allocated_qty: 240, sold_qty: 134, live_price: 169000 }], created_at: isoOffset(-10), updated_at: isoOffset(-1), ended_at: null, release_status: 'RESERVED',
      },
      {
        id: 'live_primeweb_drop', title: 'PrimeWeb Product Drop', channel_id: 'primeweb_vn_01', host_name: 'Brand Team', warehouse_id: 'wh_hcm_01', scheduled_start_at: isoOffset(27), duration_hours: 2, auto_release_policy: 'IMMEDIATE_ON_END', enable_safety_buffer: true, status: 'SCHEDULED', allocated_qty: 320, sold_qty: 0, orders_count: 0, attributed_revenue: 0,
        allocated_items: [{ sku_id: 'PRM-SPF-50', title: 'Daily Defense Sunscreen', variant: 'SPF 50 · 50 ml', allocated_qty: 320, sold_qty: 0, live_price: 249000 }], created_at: isoOffset(-6), updated_at: isoOffset(-2), ended_at: null, release_status: 'RESERVED',
      },
    ],
  };
}

function ensureStore() {
  if (fs.existsSync(STORE_PATH)) return;
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(buildSeed(), null, 2));
}

function readStore() {
  ensureStore();
  return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
}

function writeStore(store) {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  throw error;
}

function hydrate(session, store) {
  return {
    ...session,
    channel: store.channels.find((item) => item.id === session.channel_id) || null,
    warehouse: store.warehouses.find((item) => item.id === session.warehouse_id) || null,
    reserved_qty: session.sold_qty,
  };
}

function validateBase(payload, store, existing = null) {
  const result = { ...(existing || {}), ...payload };
  if (!String(result.title || '').trim()) badRequest('Session title is required.');
  if (!store.channels.some((item) => item.id === result.channel_id)) badRequest('Select a valid live channel.');
  if (!store.warehouses.some((item) => item.id === result.warehouse_id)) badRequest('Select a valid physical warehouse.');
  if (!String(result.host_name || '').trim()) badRequest('Host name is required.');
  if (Number.isNaN(Date.parse(result.scheduled_start_at))) badRequest('Scheduled start must be a valid date and time.');
  if (!(Number(result.duration_hours) > 0 && Number(result.duration_hours) <= 24)) badRequest('Duration must be between 0 and 24 hours.');
  if (!RELEASE_POLICIES.has(result.auto_release_policy)) badRequest('Select a valid auto-release policy.');
  return result;
}

export function getLiveCommerceOptions(warehouseId) {
  const store = readStore();
  const selectedId = warehouseId || store.warehouses[0]?.id;
  return { channels: store.channels, warehouses: store.warehouses, inventory: store.inventory[selectedId] || [] };
}

export function getLiveSessionSummary() {
  const store = readStore();
  const open = store.sessions.filter((item) => ['LIVE', 'SCHEDULED'].includes(item.status));
  const allocated_stock = open.reduce((sum, item) => sum + item.allocated_qty, 0);
  const sold_units = open.reduce((sum, item) => sum + item.sold_qty, 0);
  return {
    active_sessions: store.sessions.filter((item) => item.status === 'LIVE').length,
    scheduled_today: store.sessions.filter((item) => item.status === 'SCHEDULED' && new Date(item.scheduled_start_at).toDateString() === new Date().toDateString()).length,
    allocated_stock,
    sold_units,
    sold_percentage: allocated_stock ? Math.round((sold_units / allocated_stock) * 100) : 0,
    live_orders: open.reduce((sum, item) => sum + item.orders_count, 0),
    attributed_revenue: open.reduce((sum, item) => sum + item.attributed_revenue, 0),
  };
}

export function listLiveSessions(query = {}) {
  const store = readStore();
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const filtered = store.sessions.filter((item) => (!query.status || query.status === 'ALL' || item.status === query.status) && (!query.channel_id || item.channel_id === query.channel_id));
  return { data: filtered.slice((page - 1) * limit, page * limit).map((item) => hydrate(item, store)), meta: { page, limit, total: filtered.length } };
}

export function getLiveSession(id) {
  const store = readStore();
  const session = store.sessions.find((item) => item.id === id);
  return session ? hydrate(session, store) : null;
}

export function createLiveSession(payload = {}) {
  const store = readStore();
  const base = validateBase(payload, store);
  if (!Array.isArray(payload.allocated_items) || !payload.allocated_items.length) badRequest('Allocate at least one SKU.');
  const source = store.inventory[base.warehouse_id] || [];
  const seen = new Set();
  const allocatedItems = payload.allocated_items.map((item) => {
    if (seen.has(item.sku_id)) badRequest(`Duplicate SKU allocation: ${item.sku_id}.`);
    seen.add(item.sku_id);
    const sku = source.find((candidate) => candidate.sku_id === item.sku_id);
    if (!sku) badRequest(`SKU is not available in the selected warehouse: ${item.sku_id}.`);
    const qty = Number(item.allocated_qty);
    if (!Number.isInteger(qty) || qty <= 0) badRequest(`Allocated quantity must be a positive integer for ${item.sku_id}.`);
    if (qty > sku.available_atp) badRequest(`${item.sku_id} allocation exceeds available ATP (${sku.available_atp}).`);
    const livePrice = Number(item.live_price);
    if (!Number.isFinite(livePrice) || livePrice < 0) badRequest(`Enter a valid live price for ${item.sku_id}.`);
    return { sku_id: sku.sku_id, title: sku.title, variant: sku.variant, allocated_qty: qty, sold_qty: 0, live_price: livePrice };
  });
  for (const item of allocatedItems) {
    const sku = source.find((candidate) => candidate.sku_id === item.sku_id);
    sku.available_atp -= item.allocated_qty;
    sku.reserved_live += item.allocated_qty;
  }
  const now = new Date().toISOString();
  const session = { id: `live_${randomUUID()}`, title: base.title.trim(), channel_id: base.channel_id, host_name: base.host_name.trim(), warehouse_id: base.warehouse_id, scheduled_start_at: new Date(base.scheduled_start_at).toISOString(), duration_hours: Number(base.duration_hours), auto_release_policy: base.auto_release_policy, enable_safety_buffer: base.enable_safety_buffer !== false, status: new Date(base.scheduled_start_at).getTime() <= Date.now() ? 'LIVE' : 'SCHEDULED', allocated_items: allocatedItems, allocated_qty: allocatedItems.reduce((sum, item) => sum + item.allocated_qty, 0), sold_qty: 0, orders_count: 0, attributed_revenue: 0, created_at: now, updated_at: now, ended_at: null, release_status: 'RESERVED' };
  store.sessions.unshift(session);
  writeStore(store);
  return hydrate(session, store);
}

export function updateLiveSession(id, payload = {}) {
  const store = readStore();
  const index = store.sessions.findIndex((item) => item.id === id);
  if (index < 0) return null;
  if (store.sessions[index].status !== 'SCHEDULED') badRequest('Only scheduled sessions can be edited.');
  const next = validateBase(payload, store, store.sessions[index]);
  store.sessions[index] = { ...store.sessions[index], title: next.title.trim(), channel_id: next.channel_id, host_name: next.host_name.trim(), scheduled_start_at: new Date(next.scheduled_start_at).toISOString(), duration_hours: Number(next.duration_hours), auto_release_policy: next.auto_release_policy, enable_safety_buffer: next.enable_safety_buffer !== false, updated_at: new Date().toISOString() };
  writeStore(store);
  return hydrate(store.sessions[index], store);
}

export function topUpLiveSession(id, payload = {}) {
  const store = readStore();
  const session = store.sessions.find((item) => item.id === id);
  if (!session) return null;
  if (session.status !== 'LIVE') badRequest('Stock can only be topped up for a live session.');
  const quantity = Number(payload.additional_qty);
  if (!Number.isInteger(quantity) || quantity <= 0) badRequest('Additional quantity must be a positive integer.');
  const sku = (store.inventory[session.warehouse_id] || []).find((item) => item.sku_id === payload.sku_id);
  if (!sku) badRequest('SKU is not available in the assigned warehouse.');
  if (quantity > sku.available_atp) badRequest(`Top-up exceeds available ATP (${sku.available_atp}).`);
  sku.available_atp -= quantity;
  sku.reserved_live += quantity;
  let allocated = session.allocated_items.find((item) => item.sku_id === payload.sku_id);
  if (!allocated) {
    allocated = { sku_id: sku.sku_id, title: sku.title, variant: sku.variant, allocated_qty: 0, sold_qty: 0, live_price: sku.base_price };
    session.allocated_items.push(allocated);
  }
  allocated.allocated_qty += quantity;
  session.allocated_qty += quantity;
  session.updated_at = new Date().toISOString();
  writeStore(store);
  return hydrate(session, store);
}

export function endLiveSession(id) {
  const store = readStore();
  const session = store.sessions.find((item) => item.id === id);
  if (!session) return null;
  if (session.status === 'ENDED') return hydrate(session, store);
  const unsold = session.allocated_items.reduce((sum, item) => sum + Math.max(0, item.allocated_qty - item.sold_qty), 0);
  const now = new Date();
  session.status = 'ENDED';
  session.ended_at = now.toISOString();
  session.updated_at = session.ended_at;
  if (session.auto_release_policy === 'IMMEDIATE_ON_END') {
    for (const item of session.allocated_items) {
      const sku = (store.inventory[session.warehouse_id] || []).find((candidate) => candidate.sku_id === item.sku_id);
      const release = Math.max(0, item.allocated_qty - item.sold_qty);
      if (sku) { sku.available_atp += release; sku.reserved_live = Math.max(0, sku.reserved_live - item.allocated_qty); }
    }
    session.release_status = 'RELEASED';
  } else if (session.auto_release_policy === 'HOLD_2_HOURS') {
    session.release_status = 'SCHEDULED';
    session.release_scheduled_at = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
  } else {
    session.release_status = 'MANUAL_HOLD';
  }
  session.unsold_qty = unsold;
  writeStore(store);
  return hydrate(session, store);
}

export function getLiveSessionEvents(id) {
  const session = getLiveSession(id);
  if (!session) return null;
  const now = Date.now();
  return [
    { id: `${id}_evt_1`, type: 'ORDER_CAPTURED', message: 'Order #LIVE-2846 captured', units: 2, amount: 458000, occurred_at: new Date(now - 35000).toISOString() },
    { id: `${id}_evt_2`, type: 'STOCK_RESERVED', message: '3 units reserved for PRM-SRM-01', units: 3, amount: 0, occurred_at: new Date(now - 92000).toISOString() },
    { id: `${id}_evt_3`, type: 'ORDER_CAPTURED', message: 'Order #LIVE-2845 captured', units: 1, amount: 159000, occurred_at: new Date(now - 151000).toISOString() },
  ];
}
