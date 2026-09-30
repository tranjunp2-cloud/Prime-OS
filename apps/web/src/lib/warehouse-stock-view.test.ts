import { describe, expect, it } from 'vitest';
import { getProducts, type Product } from './product-store';
import { applyWarehouseStockChange, initializeProductStockLocation, stockAt, sumStock } from './warehouse-stock-view';
const product: Product = { ...getProducts()[0], has_variants: true, inventory: { wh_crjp: 999 }, skus: [{ ...getProducts()[0].skus[0], id: 'a', sku_code: 'A', stock_by_location: { wh_crjp: 5, wh_fbajp: 3 } }, { ...getProducts()[0].skus[0], id: 'b', sku_code: 'B', stock_by_location: { wh_crjp: 0 } }] };
describe('warehouse stock semantics', () => {
  it('sums children without double counting parent stock and distinguishes missing from zero', () => {
    expect(stockAt(product, 'wh_crjp')).toEqual({ quantity: 5, incomplete: false });
    expect(stockAt(product, 'wh_fbajp')).toEqual({ quantity: 3, incomplete: true });
    expect(stockAt(product, 'unknown')).toEqual({ quantity: null, incomplete: false });
    expect(stockAt({ ...product, has_variants: false, inventory: { zero: 0 } }, 'zero').quantity).toBe(0);
    expect(sumStock([stockAt(product, 'wh_crjp'), stockAt(product, 'wh_fbajp')])).toEqual({ quantity: 8, incomplete: true });
  });
  it('blocks external stock, parent SKU writes and invalid quantities at the mutation boundary', () => {
    expect(() => applyWarehouseStockChange(product, { type: 'adjustment', from: 'wh_fbajp', sku: 'A', quantity: 1 })).toThrow(/read only/);
    expect(() => applyWarehouseStockChange(product, { type: 'adjustment', from: 'wh_crjp', sku: product.sku_code, quantity: 1 })).toThrow(/variant SKU/);
    expect(() => applyWarehouseStockChange(product, { type: 'adjustment', from: 'wh_crjp', sku: 'A', quantity: NaN })).toThrow(/whole quantity/);
    expect(() => applyWarehouseStockChange(product, { type: 'transfer', from: 'wh_crjp', to: 'wh_rslsg', sku: 'A', quantity: 6 })).toThrow(/recorded stock/);
  });
  it('moves the chosen child SKU and leaves siblings unchanged', () => {
    const next = applyWarehouseStockChange(product, { type: 'transfer', from: 'wh_crjp', to: 'wh_rslsg', sku: 'A', quantity: 2 });
    expect(next.skus[0].stock_by_location).toMatchObject({ wh_crjp: 3, wh_rslsg: 2 });
    expect(next.skus[1]).toEqual(product.skus[1]);
    expect(product.skus[0].stock_by_location?.wh_crjp).toBe(5);
  });
  it('records an initial count without modifying other balances or marketplace data', () => {
    const single = { ...product, has_variants: false, inventory: { wh_crjp: 3 } };
    for (const quantity of [0, 8]) {
      const next = initializeProductStockLocation(single, 'wh_3plvn', quantity);
      expect(next.inventory).toEqual({ wh_crjp: 3, wh_3plvn: quantity });
      expect(next.channels).toBe(single.channels);
      expect(next.skus).toBe(single.skus);
      expect(single.inventory).toEqual({ wh_crjp: 3 });
    }
  });
  it('rejects initialization for existing balances, external locations, variants and invalid counts', () => {
    const single = { ...product, has_variants: false, inventory: { wh_crjp: 0 } };
    expect(() => initializeProductStockLocation(single, 'wh_crjp', 2)).toThrow(/already recorded/);
    for (const warehouseId of ['wh_fbajp', 'wh_fbsmy', 'unknown']) expect(() => initializeProductStockLocation(single, warehouseId, 2)).toThrow(/editable warehouse/);
    expect(() => initializeProductStockLocation(product, 'wh_3plvn', 2)).toThrow(/variant SKU/);
    for (const quantity of [-1, 0.5, NaN, Infinity]) expect(() => initializeProductStockLocation(single, 'wh_3plvn', quantity)).toThrow(/whole number/);
  });
});
