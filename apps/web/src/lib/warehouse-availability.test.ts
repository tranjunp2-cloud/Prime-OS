import { afterEach, describe, expect, it, vi } from 'vitest';
import { getProducts, type Product } from './product-store';
import { addInventoryPosition, clearInventoryStore, getInventoryPositions, subscribeInventory, updatePosition, type InventoryPosition } from './inventory-store';
import { availabilityAt, syncRecordedInventoryCounts, warehouseAvailability } from './warehouse-availability';
const product: Product = { ...getProducts()[0], id: 'atp-test', sku_code: 'ATP-TEST', has_variants: false, skus: [], inventory: { wh_crjp: 100 } };
const position: InventoryPosition = { id: 'position', sku_id: 'atp-test_default', product_id: product.id, warehouse_id: 'wh_crjp', on_hand: 100, reserved_unpaid: 10, reserved_paid: 5, allocated: 5, safety_stock: 5, campaign_lock: 3, unfulfillable: 2, inbound: 50, outbound: 0, return_pending: 0, version: 1, updated_at: '2026-09-30T00:00:00Z' };
afterEach(clearInventoryStore);
describe('warehouse availability', () => {
  it('counts each order hold once and excludes incoming stock from ready-to-sell ATP', () => {
    const stock = availabilityAt(product, ['wh_crjp'], [position]);
    expect(stock.onHand.quantity).toBe(100);
    expect(stock.held.quantity).toBe(20);
    expect(stock.unavailable.quantity).toBe(10);
    expect(stock.atp).toEqual({ quantity: 70, incomplete: false });
    expect(stock.items[0].incoming).toBe(50);
  });
  it('keeps missing data distinct from a confirmed zero and marks partial subtotals', () => {
    const both = { ...product, inventory: { wh_crjp: 100, wh_rslsg: 0 } };
    const stock = availabilityAt(both, ['wh_crjp', 'wh_rslsg', 'wh_3plvn'], [position]);
    expect(stock.atp).toEqual({ quantity: 70, incomplete: true });
    expect(stock.tracked).toBe(2);
    expect(stock.covered).toBe(1);
    expect(availabilityAt(both, ['wh_rslsg'], []).atp.quantity).toBeNull();
    expect(availabilityAt(product, ['wh_crjp'], [{ ...position, reserved_unpaid: 100 }]).atp.quantity).toBe(0);
  });
  it('sums child positions, clamps each location independently, and never adds parent cache', () => {
    const variants = { ...product, has_variants: true, inventory: { wh_crjp: 999 }, skus: [{ id: 'a', sku_code: 'A', variation_name: 'Blue', weight_g: 0, units_per_carton: 1, status: 'active' as const, stock_by_location: { wh_crjp: 5 } }, { id: 'b', sku_code: 'B', variation_name: 'Red', weight_g: 0, units_per_carton: 1, status: 'active' as const, stock_by_location: { wh_crjp: 20 } }] };
    const positions = [
      { ...position, id: 'a', sku_id: 'a', on_hand: 5, reserved_unpaid: 8, reserved_paid: 0, allocated: 0, safety_stock: 0, campaign_lock: 0, unfulfillable: 0 },
      { ...position, id: 'b', sku_id: 'b', on_hand: 20, reserved_unpaid: 0, reserved_paid: 0, allocated: 0, safety_stock: 0, campaign_lock: 0, unfulfillable: 0 },
    ];
    const stock = availabilityAt(variants, ['wh_crjp'], positions);
    expect(stock.onHand.quantity).toBe(25);
    expect(stock.atp.quantity).toBe(20);
    expect(availabilityAt(variants, ['wh_crjp'], positions, 'A').atp.quantity).toBe(0);
    const partial = { ...variants, skus: [variants.skus[0], { ...variants.skus[1], stock_by_location: {} }] };
    expect(warehouseAvailability([partial], ['wh_crjp', 'wh_rslsg'], positions.slice(0, 1)).onHand.incomplete).toBe(true);
    expect(warehouseAvailability([partial], ['wh_crjp', 'wh_rslsg'], positions.slice(0, 1)).atp.incomplete).toBe(true);
  });
  it('does not allocate marketplace-owned quantities to Prime OS sales', () => {
    const external = { ...product, inventory: { wh_fbajp: 100 } };
    const stock = availabilityAt(external, ['wh_fbajp'], [{ ...position, warehouse_id: 'wh_fbajp' }]);
    expect(stock.onHand.quantity).toBe(100);
    expect(stock.atp.quantity).toBeNull();
    expect(stock.items[0].state).toBe('external');
  });
  it('refuses duplicated, invalid, mismatched and unrelated position data', () => {
    expect(availabilityAt(product, ['wh_crjp'], [position, { ...position, id: 'duplicate' }]).items[0].state).toBe('invalid');
    expect(availabilityAt(product, ['wh_crjp'], [{ ...position, safety_stock: NaN }]).atp.quantity).toBeNull();
    expect(availabilityAt(product, ['wh_crjp'], [{ ...position, on_hand: 90 }]).items[0].state).toBe('mismatch');
    expect(availabilityAt(product, ['wh_crjp'], [{ ...position, product_id: 'another' }]).atp.quantity).toBeNull();
    expect(availabilityAt(product, ['wh_crjp'], [{ ...position, sku_id: 'another' }]).atp.quantity).toBeNull();
  });
  it('resolves a legacy demo warehouse alias without losing holds', () => {
    const stock = availabilityAt(product, ['wh_crjp'], [{ ...position, warehouse_id: 'wh_rakjp' }]);
    expect(stock.atp.quantity).toBe(70);
  });
  it('synchronizes an explicit stock adjustment and leaves holds unchanged', () => {
    addInventoryPosition(position);
    const next = { ...product, inventory: { wh_crjp: 110 } };
    syncRecordedInventoryCounts(product, next, ['wh_crjp'], product.sku_code);
    expect(getInventoryPositions()[0]).toMatchObject({ on_hand: 110, reserved_unpaid: 10, reserved_paid: 5, allocated: 5 });
    expect(availabilityAt(next, ['wh_crjp'], getInventoryPositions()).atp.quantity).toBe(80);
    clearInventoryStore();
    syncRecordedInventoryCounts(product, next, ['wh_crjp'], product.sku_code);
    expect(getInventoryPositions()).toHaveLength(0);
  });
  it('notifies an open warehouse view when inventory holds change', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeInventory(listener);
    addInventoryPosition(position);
    updatePosition(position.id, { reserved_unpaid: 12 });
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    clearInventoryStore();
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
