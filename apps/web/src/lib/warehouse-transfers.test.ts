// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addProduct, deleteProduct, getProducts, updateProduct, type Product } from './product-store';
import { recordWarehouseTransfer } from './warehouse-transfers';
import { addInventoryPosition, clearInventoryStore, getInventoryPositions } from './inventory-store';
const product: Product = { ...getProducts()[0], id: 'transfer-test', sku_code: 'TRANSFER', has_variants: false, skus: [], inventory: { wh_crjp: 20, wh_rslsg: 3 }, inventory_transfers: [], inventory_adjustments: [] };
const input = { productId: product.id, sku: product.sku_code, from: 'wh_crjp', to: 'wh_rslsg', quantity: 4, expectedFrom: 20, expectedTo: 3 };
beforeEach(() => { addProduct(product); clearInventoryStore(); addInventoryPosition({ id: 'transfer-position', product_id: product.id, sku_id: `${product.id}_default`, warehouse_id: 'wh_crjp', on_hand: 20, reserved_unpaid: 1, reserved_paid: 2, allocated: 0, safety_stock: 1, campaign_lock: 0, unfulfillable: 0, inbound: 0, outbound: 0, return_pending: 0, version: 1, updated_at: new Date().toISOString() }); });
afterEach(() => { vi.restoreAllMocks(); deleteProduct(product.id); clearInventoryStore(); });
describe('recorded stock transfers', () => {
  it('persists both balances and a truthful audit record together, preserving holds', () => {
    const record = recordWarehouseTransfer(input);
    const saved = getProducts().find(item => item.id === product.id)!;
    expect(saved.inventory).toEqual({ wh_crjp: 16, wh_rslsg: 7 });
    expect(saved.inventory_transfers).toEqual([record]);
    expect(record).toMatchObject({ quantity: 4, fromBefore: 20, fromAfter: 16, toBefore: 3, toAfter: 7 });
    const stored = JSON.parse(localStorage.getItem('primeos-product-master-v5')!).find((item: Product) => item.id === product.id);
    expect(stored.inventory_transfers).toEqual([record]);
    expect(stored.inventory).toEqual(saved.inventory);
    expect(getInventoryPositions()[0]).toMatchObject({ on_hand: 16, reserved_unpaid: 1, reserved_paid: 2, safety_stock: 1 });
  });
  it('preserves balances and creates no record if durable storage fails', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage full'); });
    expect(() => recordWarehouseTransfer(input)).toThrow('Storage full');
    expect(getProducts().find(item => item.id === product.id)).toMatchObject({ inventory: product.inventory, inventory_transfers: [] });
    expect(getInventoryPositions()[0].on_hand).toBe(20);
  });
  it('blocks stale counts, invalid quantities and marketplace warehouses without an audit entry', () => {
    expect(() => recordWarehouseTransfer({ ...input, expectedFrom: 21 })).toThrow(/Stock changed/);
    for (const quantity of [0, -1, 0.5, 21]) expect(() => recordWarehouseTransfer({ ...input, quantity })).toThrow();
    expect(() => recordWarehouseTransfer({ ...input, to: 'wh_fbajp', expectedTo: null })).toThrow(/read only/);
    expect(getProducts().find(item => item.id === product.id)?.inventory_transfers).toEqual([]);
  });
  it('records unknown destination counts honestly and moves only the selected variant', () => {
    updateProduct(product.id, { id: product.id, has_variants: true, skus: [
      { id: 'blue', sku_code: 'BLUE', variation_name: 'Blue', weight_g: 0, units_per_carton: 1, status: 'active', stock_by_location: { wh_crjp: 10 } },
      { id: 'red', sku_code: 'RED', variation_name: 'Red', weight_g: 0, units_per_carton: 1, status: 'active', stock_by_location: { wh_crjp: 5, wh_rslsg: 2 } },
    ] });
    const record = recordWarehouseTransfer({ ...input, sku: 'BLUE', expectedFrom: 10, expectedTo: null });
    const saved = getProducts().find(item => item.id === product.id)!;
    expect(record).toMatchObject({ sku: 'BLUE', toBefore: null, toAfter: 4 });
    expect(saved.skus[0].stock_by_location).toEqual({ wh_crjp: 6, wh_rslsg: 4 });
    expect(saved.skus[1].stock_by_location).toEqual({ wh_crjp: 5, wh_rslsg: 2 });
    expect(saved.inventory).toEqual({ wh_crjp: 11, wh_rslsg: 6 });
  });
});
