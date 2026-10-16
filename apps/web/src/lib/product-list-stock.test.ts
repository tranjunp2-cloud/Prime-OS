import { describe, expect, it } from 'vitest';
import { productListStock, recordedStock } from './product-list-stock';
import { getProducts, type Product, type Sku } from './product-store';

const sku = (id: string, stock?: Record<string, number>): Sku => ({ id, sku_code: id, variation_name: id, status: 'active', weight_g: 0, units_per_carton: 1, stock_by_location: stock });
const product = (skus: Sku[], extra: Partial<Product> = {}): Product => ({ ...getProducts()[0], has_variants: true, inventory: { wh_crjp: 999 }, skus, ...extra });

describe('catalog recorded stock', () => {
  it('sums the same SKU/location records for parent and variant totals, including external stock', () => {
    const result = productListStock(product([sku('blue', { wh_crjp: 20, wh_fbsmy: 10 }), sku('red', { wh_3plvn: 7 })]));
    expect(result.total).toBe(37);
    expect(result.variants.map(item => item.total)).toEqual([30, 7]);
    expect(result.incomplete).toBe(false);
  });
  it('reports a zero variant even when the product total is healthy', () => {
    expect(productListStock(product([sku('blue', { wh_crjp: 117 }), sku('red', { wh_crjp: 0 })])))
      .toMatchObject({ total: 117, status: 'in-stock', outOfStockVariants: 1 });
  });
  it('never falls back to parent stock or an unscoped SKU count', () => {
    const result = productListStock(product([{ ...sku('blue'), stock: 40 }, sku('red', {})]));
    expect(result.total).toBeNull();
    expect(result.variants.every(item => item.total === null)).toBe(true);
    expect(result.outOfStockVariants).toBe(0);
    expect(result.unrecordedVariants).toBe(2);
  });
  it('marks partial totals and does not classify a partial zero as out of stock', () => {
    expect(productListStock(product([sku('blue', { wh_crjp: 20 }), sku('unknown')])))
      .toMatchObject({ total: 20, incomplete: true, status: 'unrecorded', unrecordedVariants: 1 });
    expect(productListStock(product([sku('blue', { wh_crjp: 0, wh_3plvn: NaN })])))
      .toMatchObject({ total: 0, incomplete: true, outOfStockVariants: 0 });
  });
  it('keeps inactive physical stock in the total but excludes inactive variants from selling warnings', () => {
    const result = productListStock(product([{ ...sku('old', { wh_crjp: 4 }), status: 'inactive' }, { ...sku('retired', { wh_crjp: 0 }), status: 'inactive' }, sku('blue', { wh_crjp: 10 })]));
    expect(result).toMatchObject({ total: 14, lowStockVariants: 0, outOfStockVariants: 0 });
  });
  it('distinguishes empty, invalid and genuine zero counts', () => {
    expect(recordedStock()).toMatchObject({ total: null });
    expect(recordedStock({ a: 0 })).toMatchObject({ total: 0, incomplete: false });
    expect(recordedStock({ a: '', b: null, c: -1, d: Infinity, e: 1.5 })).toMatchObject({ total: null, incomplete: true });
  });
  it('uses product inventory only for single products, without counting their internal SKU records twice', () => {
    expect(productListStock(product([sku('internal', { wh_crjp: 999 })], { has_variants: false, inventory: { wh_crjp: 5, wh_fbsmy: 2 } }))).toMatchObject({ total: 7, variants: [] });
    expect(productListStock(product([], { has_variants: false, inventory: {} }))).toMatchObject({ total: null, status: 'unrecorded' });
  });
});
