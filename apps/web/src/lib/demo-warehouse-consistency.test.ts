// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { warehouseDemoShops } from '@/test/fixtures/warehouse-shops';

beforeEach(() => { localStorage.clear(); vi.resetModules(); });
async function seeded() {
  const seed = await import('./demo-data-seeder');
  expect(await seed.seedDemoData('warehouse-consistency', warehouseDemoShops)).toEqual({ success: true });
  return {
    products: (await import('./product-store')).getProducts(),
    positions: (await import('./inventory-store')).getInventoryPositions(),
    orders: (await import('./order-store')).getOrders(),
    lines: (await import('./order-store')).getAllOrderItems(),
    reservations: (await import('./reservation-store')).getReservations(),
  };
}

describe('coherent warehouse demo records', () => {
  it('does not generate reservations or other holds for the pending Calligraphy listing', async () => {
    const { products, positions, lines } = await seeded();
    const product = products.find(item => item.sku_code === 'TEST2-CALLI-KIT')!;
    const stock = positions.find(item => item.product_id === product.id && item.warehouse_id === 'wh_crjp')!;
    expect(stock).toMatchObject({ on_hand: 18, reserved_unpaid: 0, reserved_paid: 0, allocated: 0, safety_stock: 0, campaign_lock: 0, unfulfillable: 0, inbound: 0, order_holds: [] });
    expect(lines.some(line => line.product_id === product.id)).toBe(false);
    expect((await import('./warehouse-availability')).availabilityAt(product, ['wh_crjp'], positions).atp.quantity).toBe(18);
  });

  it('backs every order hold with the exact active order line and mirrors it in the reservation ledger', async () => {
    const { positions, orders, lines, reservations } = await seeded();
    const { orderHoldCounters, orderHoldsForPosition } = await import('./warehouse-order-holds');
    let total = 0;
    for (const position of positions) {
      const references = orderHoldsForPosition(position, orders, lines);
      expect(position.order_holds).toEqual(references);
      expect(position).toMatchObject(orderHoldCounters(references));
      const held = position.reserved_unpaid + position.reserved_paid + position.allocated;
      expect(held + position.safety_stock + position.campaign_lock + position.unfulfillable).toBeLessThanOrEqual(position.on_hand);
      for (const reference of references) {
        expect(orders.find(order => order.id === reference.orderId)?.status).toBe('ready_to_ship');
        expect(reservations.filter(item => item.order_item_id === reference.lineId)).toHaveLength(1);
        expect(reservations.find(item => item.order_item_id === reference.lineId)).toMatchObject({ product_id: position.product_id, sku_id: position.sku_id, warehouse_id: position.warehouse_id, qty: reference.quantity, order_ref: reference.orderNumber });
      }
      total += held;
    }
    expect(total).toBeGreaterThan(0);
    expect(reservations.reduce((sum, item) => sum + item.qty, 0)).toBe(total);
    expect(reservations.every(item => orders.some(order => order.order_id === item.order_ref))).toBe(true);
  });

  it('links every generated line to its actual Product Master and uses only the five demo locations', async () => {
    const { products, positions, orders, lines } = await seeded();
    const ids = (await import('./warehouse-store')).getWarehouses().map(item => item.id);
    expect(ids).toHaveLength(5);
    for (const line of lines) {
      const product = products.find(item => item.id === line.product_id)!;
      expect(product).toBeDefined();
      expect(product.skus.some(sku => sku.id === line.sku_id)).toBe(true);
      expect(line.sku).toBe(product.has_variants ? product.skus.find(sku => sku.id === line.sku_id)!.sku_code : product.sku_code);
    }
    for (const position of positions) expect(ids).toContain(position.warehouse_id);
    for (const order of orders) if (order.allocated_warehouse_id) expect(ids).toContain(order.allocated_warehouse_id);
    const { getFulfillmentJobs } = await import('./fulfillment-store');
    for (const job of getFulfillmentJobs()) expect(job.warehouse_id).toBe(orders.find(order => order.id === job.order_id)?.allocated_warehouse_id);
  });

  it('preserves saved counts and holds whose legacy order source cannot be verified', async () => {
    const store = await import('./product-store');
    const product = store.getProducts().find(item => item.sku_code === 'TEST2-CALLI-KIT')!;
    const saved = { id: 'saved-position', product_id: product.id, sku_id: product.skus[0].id, warehouse_id: 'wh_crjp', on_hand: 30, reserved_unpaid: 1, reserved_paid: 2, allocated: 0, safety_stock: 3, campaign_lock: 1, unfulfillable: 2, inbound: 4, outbound: 0, return_pending: 0, version: 7, updated_at: '2026-10-08T00:00:00Z' };
    store.updateProduct(product.id, { id: product.id, inventory: { ...product.inventory, wh_crjp: 30 }, warehouse_positions: [saved] });
    const { products, positions } = await seeded();
    expect(positions.find(item => item.id === saved.id)).toEqual(saved);
    const stock = (await import('./warehouse-availability')).availabilityAt(products.find(item => item.id === product.id)!, ['wh_crjp'], positions);
    expect(stock.items[0]).toMatchObject({ onHand: 30, held: 3, unavailable: 6, atp: 21, orderSourcesVerified: false });
  });

  it('is idempotent and does not double holds when seeding is called concurrently or again', async () => {
    const seed = await import('./demo-data-seeder');
    await Promise.all([seed.seedDemoData('a', []), seed.seedDemoData('b', [])]);
    const { getInventoryPositions } = await import('./inventory-store');
    const before = structuredClone(getInventoryPositions());
    await seed.seedDemoData('c', []);
    expect(getInventoryPositions()).toEqual(before);
  });

  it('leaves an order unreserved when its warehouse has insufficient stock', async () => {
    const store = await import('./product-store');
    const product = store.getProductById('prod_001')!;
    store.updateProduct(product.id, { id: product.id, inventory: { wh_crjp: 0 }, skus: product.skus.map(sku => ({ ...sku, stock_by_location: { wh_crjp: 0 } })) });
    const { orders, positions } = await seeded();
    expect(orders.find(order => order.order_id === 'PRIME-NB-1001')).toMatchObject({ status: 'pending', lifecycle_stage: 'validated', allocated_warehouse_id: null, risk_flags: ['STOCK_NOT_RESERVED'] });
    expect(positions.filter(item => item.product_id === product.id).every(item => item.reserved_paid === 0 && item.allocated === 0)).toBe(true);
  });

  it('uses a confirmed listing/shop source instead of assigning a random sales channel', async () => {
    const store = await import('./product-store');
    const product = store.getProductById('prod_001')!;
    store.updateProduct(product.id, { id: product.id, channels: [{ channel: 'amazon', status: 'active', store_name: 'QA Amazon', external_id: 'QA-AMZ', listing_url: null, last_synced_at: null, variant_mappings: product.skus.map(sku => ({ shop_sku: sku.sku_code, master_sku_id: sku.id })) }], channel_overrides: {} });
    const { seedDemoData } = await import('./demo-data-seeder');
    await seedDemoData('source-test', [{ id: 'qa-amazon', platform: 'amazon', name: 'Amazon', store_name: 'QA Amazon', region: 'JP', type: 'Marketplace', status: 'CONNECTED', synced_listings: 1, sync_progress: 100, warehouse: { id: 'wh_crjp', name: 'Japan HQ', code: 'JP', city: 'Tokyo' }, sync_services: { price: true, stock: true, orders: true }, errors: 0, last_sync_at: '' }]);
    const { getOrders, getOrderItems } = await import('./order-store');
    const matching = getOrders().filter(order => order.allocated_warehouse_id === 'wh_crjp' && getOrderItems(order.id).some(line => line.product_id === product.id));
    expect(matching.length).toBeGreaterThan(0);
    for (const order of matching) expect(order).toMatchObject({ channel: 'amazon', allocation_policy_snapshot: { stock_source_label: 'Amazon · QA Amazon' } });
  });

  it('uses Manual only for an explicitly manual scenario; every generated marketplace order retains its exact source', async () => {
    const { orders, lines, products } = await seeded();
    const { resolveProductShopSources, shopsAtWarehouse } = await import('./warehouse-shop-sources');
    expect(orders.filter(order => order.channel === 'manual').map(order => order.order_id)).toEqual(['PRIME-TAI-1005']);
    for (const order of orders.filter(item => item.allocation_policy_snapshot?.shop_id)) {
      const snapshot = order.allocation_policy_snapshot!;
      for (const line of lines.filter(item => item.order_id === order.id)) {
        const product = products.find(item => item.id === line.product_id)!;
        const sources = resolveProductShopSources(product, warehouseDemoShops);
        const shops = shopsAtWarehouse(sources, snapshot.stock_source_warehouse_id as string, product.has_variants ? line.sku_id : undefined).shops;
        expect(shops.some(item => item.shop.id === snapshot.shop_id && item.shop.platform === order.channel && item.listings.some(listing => listing.listing.external_id === snapshot.listing_id))).toBe(true);
      }
    }
    expect(orders.find(order => order.order_id === 'PRIME-NB-1001')).toMatchObject({ channel: 'amazon', allocation_policy_snapshot: { stock_source_label: 'Amazon · Prime Beauty US', shop_id: 'channel_amazon', listing_id: 'B0G432Z31H', stock_source_warehouse_id: 'wh_crjp' } });
  });

  it('does not disguise an unknown shop as Manual or reserve its stock when connections are unavailable', async () => {
    const seed = await import('./demo-data-seeder');
    await seed.seedDemoData('no-connections', []);
    const { getOrders } = await import('./order-store');
    const { getInventoryPositions } = await import('./inventory-store');
    expect(getOrders().filter(order => order.channel === 'manual').map(order => order.order_id)).toEqual(['PRIME-TAI-1005']);
    expect(getOrders().find(order => order.order_id === 'PRIME-NB-1001')).toMatchObject({ channel: 'amazon', status: 'pending', allocated_warehouse_id: null, risk_flags: ['SHOP_SOURCE_UNCONFIRMED'] });
    expect(getInventoryPositions().every(position => !position.order_holds?.length)).toBe(true);
  });
});
