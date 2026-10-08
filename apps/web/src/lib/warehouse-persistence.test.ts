// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => { vi.resetModules(); localStorage.clear(); });

describe('warehouse reload', () => {
  it('restores opening stock and verified ATP without demo stock or holds overwriting them', async () => {
    const store = await import('./product-store');
    const inventory = await import('./inventory-store');
    const operations = await import('./warehouse-stock-operations');
    const warehouses = await import('./warehouse-store');
    const warehouse = warehouses.createManagedWarehouse({ name: 'Reload warehouse', code: 'RELOAD', country: 'VN', address: 'Demo address' });
    const demo = store.getProducts().find(product => product.id === 'prod_import_test_review_02')!;
    operations.recordWarehouseCounts([{ productId: demo.id, sku: demo.sku_code, warehouseId: warehouse.id, expected: null, quantity: 12, reason: 'Opening stock', confirmNoHolds: true }]);
    const unverified = store.getProducts().find(product => product.id === 'prod_import_review_demo')!;
    operations.recordWarehouseCounts([{ productId: unverified.id, sku: unverified.sku_code, warehouseId: warehouse.id, expected: null, quantity: 5, reason: 'Physical stock count' }]);
    expect(inventory.getInventoryPositions().find(position => position.warehouse_id === warehouse.id)?.on_hand).toBe(12);

    vi.resetModules();
    const seed = await import('./demo-data-seeder');
    await seed.seedDemoData();
    const reloaded = await import('./product-store');
    const liveInventory = await import('./inventory-store');
    const availability = await import('./warehouse-availability');
    const saved = reloaded.getProducts().find(product => product.id === demo.id)!;
    expect(saved.inventory[warehouse.id]).toBe(12);
    expect(saved.inventory_adjustments?.[0]).toMatchObject({ before: null, after: 12 });
    expect(availability.availabilityAt(saved, [warehouse.id], liveInventory.getInventoryPositions()).items[0]).toMatchObject({ atp: 12, held: 0, unavailable: 0 });
    const unknown = reloaded.getProducts().find(product => product.id === unverified.id)!;
    expect(unknown.inventory[warehouse.id]).toBe(5);
    expect(availability.availabilityAt(unknown, [warehouse.id], liveInventory.getInventoryPositions()).items[0]).toMatchObject({ atp: null, held: null, unavailable: null });
  });
});
