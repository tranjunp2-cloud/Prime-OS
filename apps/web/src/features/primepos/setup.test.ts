// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addProduct, deleteProduct, getProducts, updateProduct as updateMaster, type Product as Master } from '@/lib/product-store';
import { clearInventoryStore, getInventoryPositions, updatePosition } from '@/lib/inventory-store';
import { recordWarehouseCounts } from '@/lib/warehouse-stock-operations';
import { masterCatalog, masterPosId } from './catalog';
import { blankSetup, changePos, checkout, clearCart, configurePosStore, currentCart, currentStore, finishPosSetup, getPos, openShift, POS_STORAGE_KEY, refundSale, resetPosCache, saveMasterSelection, savePos, saveSetupDraft, seedPos, setCartLine, setupStore } from './store';

const master: Master = { ...getProducts()[0], id: 'pos-setup-test', name: 'POS notebook', sku_code: 'POS-NOTE', product_type: 'single', has_variants: false, skus: [], retail_price: 500, price_currency: 'JPY', status: 'published', inventory: {}, warehouse_positions: [], inventory_adjustments: [], inventory_transfers: [] };
const ref = { productId: master.id, skuId: 'single' };
const id = masterPosId(ref);
const draft = () => ({ ...blankSetup(), name: 'Test store', address: 'Tokyo', warehouseId: 'wh_crjp', currency: 'JPY', selections: [ref] });
function stock() { recordWarehouseCounts([{ productId: master.id, sku: master.sku_code, warehouseId: 'wh_crjp', quantity: 10, expected: null, reason: 'Opening stock', confirmNoHolds: true }]); }
function sell() { setCartLine(id, 2); return checkout('card', 1000, currentCart(getPos()).id); }
beforeEach(() => { localStorage.clear(); resetPosCache(); clearInventoryStore(); addProduct(structuredClone(master)); });
afterEach(() => { vi.restoreAllMocks(); deleteProduct(master.id); clearInventoryStore(); });

describe('POS onboarding and canonical product selection', () => {
  it('starts a fresh browser in setup without inventing a store or products', () => {
    expect(getPos().stores).toEqual([]); expect(getPos().products).toEqual([]);
    expect(() => openShift(0)).toThrow('Set up');
  });
  it('resumes a saved setup and can finish without products', () => {
    const input = { ...draft(), step: 2 as const }; saveSetupDraft(input); resetPosCache();
    expect(getPos().setupDraft).toEqual(input); finishPosSetup(input, true); resetPosCache();
    expect(currentStore(getPos())).toMatchObject({ name: 'Test store', warehouseId: 'wh_crjp', currency: 'JPY', assortment: [], registers: ['Register 01'] });
    expect(getPos().setupDraft).toBeUndefined();
  });
  it('preserves an existing store, assortment, cash history and demo receipts', () => {
    const legacy = seedPos(); savePos(legacy); resetPosCache();
    expect(getPos()).toEqual(legacy); expect(currentStore(getPos()).id).toBe('central');
  });
  it('requires configuration but lets pending product details be reviewed later', () => {
    expect(() => finishPosSetup({ ...draft(), warehouseId: '' })).toThrow('stock location');
    const input = draft(); finishPosSetup(input); expect(getPos().stores).toHaveLength(1);
    expect(getPos().products.find(p => p.id === id)?.issue).toContain('Stock');
    expect(() => setCartLine(id, 1)).toThrow('Stock');
    expect(() => finishPosSetup({ ...input, id: 'another' })).toThrow('already exists');
  });
  it('persists identities, not copies of Master data, and reuses stable variant IDs', () => {
    updateMaster(master.id, { id: master.id, has_variants: true, product_type: 'variant', skus: [
      { id: 'red', sku_code: 'NOTE-RED', variation_name: 'Red', status: 'active', price: 700 },
      { id: 'blue', sku_code: 'NOTE-BLUE', variation_name: 'Blue', status: 'active', price: 800 },
    ] as Master['skus'] });
    const refs = ['red', 'blue'].map(skuId => ({ productId: master.id, skuId }));
    finishPosSetup({ ...draft(), selections: [...refs, refs[0]] });
    const raw = JSON.parse(localStorage.getItem(POS_STORAGE_KEY)!);
    expect(raw.products).toEqual([]); expect(raw.stock).toEqual({}); expect(raw.stores[0].masterSelections).toEqual(refs);
    expect(getPos().products.map(p => p.price)).toEqual([700, 800]);
    expect(getProducts().filter(p => p.id === master.id)).toHaveLength(1);
  });
  it('never relabels a Master price when store currency differs', () => {
    const item = masterCatalog(setupStore({ ...draft(), currency: 'USD' })).find(p => p.id === id)!;
    expect(item.price).toBe(0); expect(item.issue).toBeTruthy(); expect(item.currency).toBe('USD');
  });
  it('reads subsequent Master edits automatically without altering past receipts', () => {
    stock(); finishPosSetup(draft()); openShift(0); const sale = sell();
    updateMaster(master.id, { id: master.id, name: 'Updated notebook', retail_price: 900 });
    expect(getPos().products.find(p => p.id === id)).toMatchObject({ name: 'Updated notebook', price: 900 });
    expect(sale.lines[0].price).toBe(500); expect(sale.currency).toBe('JPY');
  });
  it('deducts shared stock, preserves holds and restores sellable returns', () => {
    stock(); const position = getInventoryPositions()[0]; updatePosition(position.id, { reserved_paid: 3, safety_stock: 1 });
    finishPosSetup(draft()); openShift(0);
    expect(getPos().stock[`${currentStore(getPos()).id}:${id}`]).toBe(6);
    const sale = sell(); expect(getProducts().find(p => p.id === master.id)?.inventory.wh_crjp).toBe(8);
    expect(getInventoryPositions()[0]).toMatchObject({ on_hand: 8, reserved_paid: 3, safety_stock: 1 });
    saveMasterSelection(currentStore(getPos()).id, []); // A removed offering remains returnable.
    refundSale(sale.id, { [id]: 1 }, 'Changed mind', true);
    expect(getProducts().find(p => p.id === master.id)?.inventory.wh_crjp).toBe(9);
    expect(getInventoryPositions()[0].reserved_paid).toBe(3);
    resetPosCache(); expect(getPos().sales[0].refunds).toHaveLength(1);
  });
  it('rolls shared stock back if saving the POS ledger fails', () => {
    stock(); finishPosSetup(draft()); openShift(0); setCartLine(id, 1);
    const setItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function(this: Storage, key, value) { if (key === POS_STORAGE_KEY) throw new Error('Storage full'); setItem.call(this, key, value); });
    expect(() => checkout('card', 500, currentCart(getPos()).id)).toThrow('Storage full');
    expect(getProducts().find(p => p.id === master.id)?.inventory.wh_crjp).toBe(10);
    expect(getInventoryPositions()[0].on_hand).toBe(10); expect(getPos().sales).toHaveLength(0);
    expect(localStorage.getItem('prime.pos-inventory-commit.v1')).toBeNull();
  });
  it('protects open work and cash currency while allowing later product selection', () => {
    stock(); finishPosSetup(draft()); setCartLine(id, 1);
    expect(() => saveMasterSelection(currentStore(getPos()).id, [])).toThrow('open carts');
    expect(() => configurePosStore({ ...currentStore(getPos()), warehouseId: 'wh_rslsg' })).toThrow('open carts');
    clearCart(); openShift(0); expect(() => configurePosStore({ ...currentStore(getPos()), currency: 'USD' })).toThrow('cash history');
  });
  it('leaves cashier configuration read-only', () => {
    finishPosSetup(draft()); changePos(s => { s.role = 'cashier'; });
    expect(() => saveSetupDraft(draft())).toThrow('manager');
    expect(() => saveMasterSelection(currentStore(getPos()).id, [])).toThrow('manager');
    expect(() => configurePosStore(currentStore(getPos()))).toThrow('manager');
  });
  it('shows a removed Master as unavailable, without deleting receipt history', () => {
    stock(); finishPosSetup(draft()); openShift(0); sell(); deleteProduct(master.id);
    expect(getPos().products.find(p => p.id === id)?.issue).toContain('removed');
    expect(getPos().sales).toHaveLength(1); expect(() => setCartLine(id, 1)).toThrow('removed');
  });
});
