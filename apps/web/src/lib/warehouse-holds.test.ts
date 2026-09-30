// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as products from './product-store';
import { addInventoryPosition, clearInventoryStore, getInventoryPositions, updatePosition, type InventoryPosition } from './inventory-store';
import { availabilityAt } from './warehouse-availability';
import { changeWarehouseHold, getHoldContext } from './warehouse-holds';
import { getStockHoldHistory, recordStockHoldChange, STOCK_HOLD_STORAGE_KEY } from './stock-hold-history';

const product = { ...products.getProducts()[0], id: 'hold-test', sku_code: 'HOLD', has_variants: false, skus: [], inventory: { wh_crjp: 20 } };
const position: InventoryPosition = { id: 'hold-position', product_id: product.id, sku_id: `${product.id}_default`, warehouse_id: 'wh_crjp', on_hand: 20, reserved_unpaid: 2, reserved_paid: 3, allocated: 0, safety_stock: 2, campaign_lock: 0, unfulfillable: 1, inbound: 100, outbound: 0, return_pending: 0, version: 1, updated_at: '2026-09-30T00:00:00Z' };
const input = { productId: product.id, warehouseId: 'wh_crjp', sku: 'HOLD', kind: 'campaign_lock' as const, action: 'hold' as const, quantity: 4, note: 'October campaign', expectedPosition: position };
beforeEach(() => { window.localStorage.removeItem(STOCK_HOLD_STORAGE_KEY); clearInventoryStore(); vi.spyOn(products, 'getProducts').mockReturnValue([product]); addInventoryPosition(position); });
afterEach(() => { vi.restoreAllMocks(); clearInventoryStore(); window.localStorage.removeItem(STOCK_HOLD_STORAGE_KEY); });

describe('warehouse holds', () => {
  it('updates holds and ATP while preserving physical stock, orders and other categories', () => {
    changeWarehouseHold(input);
    expect(getInventoryPositions()[0]).toMatchObject({ ...position, campaign_lock: 4, version: 2, updated_at: expect.any(String) });
    const balance = availabilityAt(product, ['wh_crjp'], getInventoryPositions());
    expect(balance.onHand.quantity).toBe(20);
    expect(balance.held.quantity).toBe(5);
    expect(balance.unavailable.quantity).toBe(7);
    expect(balance.atp.quantity).toBe(8);
    expect(product.inventory.wh_crjp).toBe(20);
    expect(getStockHoldHistory()[0]).toMatchObject({ kind: 'campaign_lock', before: 0, after: 4, note: 'October campaign' });
  });
  it('restores saved holds after reseeding and can release them without losing history', () => {
    changeWarehouseHold(input);
    clearInventoryStore(); addInventoryPosition({ ...position, id: 'new-seed-id' });
    expect(getInventoryPositions()[0].campaign_lock).toBe(4);
    changeWarehouseHold({ ...input, action: 'release', expectedPosition: getInventoryPositions()[0] });
    expect(availabilityAt(product, ['wh_crjp'], getInventoryPositions()).atp.quantity).toBe(12);
    clearInventoryStore(); addInventoryPosition(position);
    expect(getInventoryPositions()[0].campaign_lock).toBe(0);
    expect(getStockHoldHistory().map(item => [item.before, item.after])).toEqual([[4, 0], [0, 4]]);
  });
  it('rejects invalid amounts, over-holding and over-release without modifying history', () => {
    for (const quantity of [0, -1, 0.5, NaN, Infinity, 13]) expect(() => changeWarehouseHold({ ...input, quantity })).toThrow();
    expect(() => changeWarehouseHold({ ...input, action: 'release' })).toThrow(/Only 0/);
    expect(getInventoryPositions()[0]).toEqual(position);
    expect(getStockHoldHistory()).toHaveLength(0);
  });
  it('blocks external, missing, mismatched and stale inventory', () => {
    expect(() => changeWarehouseHold({ ...input, warehouseId: 'wh_fbajp' })).toThrow(/editable warehouse/);
    expect(() => changeWarehouseHold({ ...input, warehouseId: 'wh_rslsg' })).toThrow(/No on-hand/);
    updatePosition(position.id, { reserved_paid: 4 });
    expect(() => changeWarehouseHold(input)).toThrow(/Stock changed/);
    vi.mocked(products.getProducts).mockReturnValue([{ ...product, inventory: { wh_crjp: 19 } }]);
    expect(() => changeWarehouseHold(input)).toThrow(/do not match/);
    expect(getStockHoldHistory()).toHaveLength(0);
  });
  it('requires a variant and changes only its selected warehouse position', () => {
    const variantProduct = { ...product, has_variants: true, skus: [{ id: 'blue', sku_code: 'BLUE', variation_name: 'Blue', weight_g: 0, units_per_carton: 1, status: 'active' as const, stock_by_location: { wh_crjp: 20 } }, { id: 'red', sku_code: 'RED', variation_name: 'Red', weight_g: 0, units_per_carton: 1, status: 'active' as const, stock_by_location: { wh_crjp: 20 } }] };
    vi.mocked(products.getProducts).mockReturnValue([variantProduct]);
    clearInventoryStore();
    addInventoryPosition({ ...position, id: 'blue-position', sku_id: 'blue' });
    addInventoryPosition({ ...position, id: 'red-position', sku_id: 'red' });
    expect(() => getHoldContext(variantProduct, 'wh_crjp', '', getInventoryPositions())).toThrow(/variant SKU/);
    changeWarehouseHold({ ...input, sku: 'BLUE', expectedPosition: getInventoryPositions()[0] });
    expect(getInventoryPositions().map(item => item.campaign_lock)).toEqual([4, 0]);
  });
  it('does not change balances when history cannot be saved', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage is full'); });
    expect(() => changeWarehouseHold(input)).toThrow(/Storage is full/);
    expect(getInventoryPositions()[0]).toEqual(position);
    expect(getStockHoldHistory()).toHaveLength(0);
  });
  it('does not overwrite holds saved by another tab against an older live balance', () => {
    recordStockHoldChange({ id: 'other-tab', productId: product.id, skuId: position.sku_id, sku: product.sku_code, warehouseId: 'wh_crjp', kind: 'safety_stock', before: 2, after: 10, note: '', createdAt: new Date().toISOString() });
    expect(() => changeWarehouseHold(input)).toThrow(/another tab/);
    expect(getInventoryPositions()[0]).toEqual(position);
    expect(getStockHoldHistory()).toHaveLength(1);
  });
});
