// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addProduct, deleteProduct, getProducts, type Product } from './product-store';
import { clearInventoryStore, getInventoryPositions, updatePosition } from './inventory-store';
import { recordWarehouseCounts } from './warehouse-stock-operations';
import { availabilityAt } from './warehouse-availability';
import { recordWarehouseTransfer, receiveWarehouseTransfer } from './warehouse-transfers';
import { createManagedWarehouse, deleteWarehouse, restoreSavedWarehouses, getWarehouseById, WAREHOUSE_STORAGE_KEY } from './warehouse-store';

const product: Product = { ...getProducts()[0], id: 'warehouse-flow-test', sku_code: 'WH-FLOW', has_variants: false, skus: [], inventory: {}, warehouse_positions: [], inventory_adjustments: [], inventory_transfers: [] };
const count = (warehouseId: string, quantity: number, expected: number | null = null) => ({ productId: product.id, sku: product.sku_code, warehouseId, quantity, expected, reason: 'Opening stock', confirmNoHolds: true });
beforeEach(() => { clearInventoryStore(); addProduct(product); });
afterEach(() => { vi.restoreAllMocks(); deleteProduct(product.id); clearInventoryStore(); });

describe('seller warehouse journey', () => {
  it('records opening, receipt and correction separately and rejects crossed purposes', () => {
    recordWarehouseCounts([{ ...count('wh_crjp', 7), kind: 'opening' }]);
    const receipt = { ...count('wh_crjp', 10, 7), kind: 'receipt' as const, reason: 'Goods received' };
    expect(() => recordWarehouseCounts([{ ...receipt, quantity: 7 }])).toThrow(/positive received/);
    expect(() => recordWarehouseCounts([{ ...receipt, kind: 'adjustment' }])).toThrow(/Use Receive stock/);
    recordWarehouseCounts([receipt]);
    expect(() => recordWarehouseCounts([{ ...count('wh_crjp', 5, 10), kind: 'opening' }])).toThrow(/already recorded/);
    recordWarehouseCounts([{ ...count('wh_crjp', 5, 10), kind: 'adjustment', reason: 'Physical stock count' }]);
    const saved = getProducts().find(item => item.id === product.id)!;
    expect(saved.inventory.wh_crjp).toBe(5);
    expect(saved.inventory_adjustments?.map(item => [item.kind, item.before, item.after])).toEqual([['adjustment', 10, 5], ['receipt', 7, 10], ['opening', null, 7]]);
    const disk = JSON.parse(localStorage.getItem('primeos-product-master-v5')!).find((item: Product) => item.id === product.id);
    expect(disk.inventory_adjustments.map((item: { kind: string }) => item.kind)).toEqual(['adjustment', 'receipt', 'opening']);
  });
  it('persists a warehouse before exposing it and restores contact information', () => {
    localStorage.removeItem(WAREHOUSE_STORAGE_KEY);
    const saved = createManagedWarehouse({ name: ' New warehouse ', code: 'qa-flow', country: 'SG', address: 'Singapore', manager: 'Seller', phone: '123' });
    expect(saved).toMatchObject({ name: 'New warehouse', code: 'QA-FLOW', country: 'SG', manager: 'Seller' });
    expect(() => createManagedWarehouse({ name: 'Duplicate', code: 'qa-flow', country: 'SG', address: 'Singapore' })).toThrow(/already in use/);
    deleteWarehouse(saved.id); restoreSavedWarehouses();
    expect(getWarehouseById(saved.id)?.phone).toBe('123');
    deleteWarehouse(saved.id); localStorage.removeItem(WAREHOUSE_STORAGE_KEY);
  });
  it('keeps all opening counts and audit entries unchanged if the batch cannot be persisted', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage full'); });
    expect(() => recordWarehouseCounts([count('wh_crjp', 10), count('wh_rslsg', 0)])).toThrow('Storage full');
    expect(getProducts().find(item => item.id === product.id)?.inventory).toEqual({});
    expect(getInventoryPositions()).toHaveLength(0);
  });
  it('records unknown-to-zero separately from skipped stock and initializes verified ATP atomically', () => {
    recordWarehouseCounts([count('wh_crjp', 10), count('wh_rslsg', 0)]);
    const saved = getProducts().find(item => item.id === product.id)!;
    expect(saved.inventory).toEqual({ wh_crjp: 10, wh_rslsg: 0 });
    expect(saved.inventory_adjustments?.every(item => item.before === null)).toBe(true);
    expect(availabilityAt(saved, ['wh_crjp'], getInventoryPositions()).atp.quantity).toBe(10);
    const disk = JSON.parse(localStorage.getItem('primeos-product-master-v5')!).find((item: Product) => item.id === product.id);
    expect(disk.warehouse_positions).toHaveLength(2);
    expect(disk.warehouse_positions.map((item: { on_hand: number }) => item.on_hand)).toEqual([10, 0]);
  });
  it('leaves unknown reservations unknown without explicit verification', () => {
    recordWarehouseCounts([{ ...count('wh_crjp', 10), confirmNoHolds: false }]);
    expect(getInventoryPositions()).toHaveLength(0);
    expect(availabilityAt(getProducts().find(item => item.id === product.id)!, ['wh_crjp'], []).atp.quantity).toBeNull();
  });
  it('protects holds, keeps destination unchanged in transit and receives exactly once', () => {
    recordWarehouseCounts([count('wh_crjp', 10), count('wh_rslsg', 0)]);
    const source = getInventoryPositions().find(item => item.warehouse_id === 'wh_crjp')!;
    updatePosition(source.id, { reserved_paid: 4, safety_stock: 1 });
    const input = { productId: product.id, sku: product.sku_code, from: 'wh_crjp', to: 'wh_rslsg', quantity: 6, expectedFrom: 10, expectedTo: 0, mode: 'in_transit' as const };
    expect(() => recordWarehouseTransfer(input)).toThrow(/Only 5 units/);
    const transfer = recordWarehouseTransfer({ ...input, quantity: 3 });
    let saved = getProducts().find(item => item.id === product.id)!;
    expect(saved.inventory).toEqual({ wh_crjp: 7, wh_rslsg: 0 });
    expect(availabilityAt(saved, ['wh_rslsg'], getInventoryPositions()).items[0]).toMatchObject({ atp: 0, incoming: 3 });
    expect(availabilityAt(saved, ['wh_crjp'], getInventoryPositions()).atp.quantity).toBe(2);
    receiveWarehouseTransfer(product.id, transfer.id);
    saved = getProducts().find(item => item.id === product.id)!;
    expect(saved.inventory).toEqual({ wh_crjp: 7, wh_rslsg: 3 });
    expect(availabilityAt(saved, ['wh_rslsg'], getInventoryPositions()).items[0]).toMatchObject({ atp: 3, incoming: 0 });
    expect(() => receiveWarehouseTransfer(product.id, transfer.id)).toThrow(/already been received/);
    expect(getInventoryPositions().find(item => item.id === source.id)?.reserved_paid).toBe(4);
  });
  it('rejects the entire batch if another change recorded one of its locations', () => {
    recordWarehouseCounts([count('wh_crjp', 5)]);
    expect(() => recordWarehouseCounts([count('wh_rslsg', 2), count('wh_crjp', 10)])).toThrow(/Stock changed/);
    expect(getProducts().find(item => item.id === product.id)?.inventory).toEqual({ wh_crjp: 5 });
  });
});
