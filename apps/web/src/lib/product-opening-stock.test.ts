import { beforeEach, describe, expect, it } from 'vitest';
import { getProducts, type Product } from './product-store';
import { clearInventoryStore, getInventoryPositions } from './inventory-store';
import { prepareProductOpeningStock } from './product-opening-stock';

let previous: Product;
beforeEach(() => {
  clearInventoryStore();
  previous = { ...getProducts()[0], id: 'opening-stock-test', has_variants: true, inventory_adjustments: [], warehouse_positions: [],
    skus: [{ id: 'kept-sku', sku_code: 'KEPT', variation_name: 'White', status: 'active', price: 50, weight_g: 0, units_per_carton: 1, stock_by_location: { wh_crjp: 7 } }] };
});
describe('New SKU opening stock', () => {
  const withNew = (locations: Record<string, number>) => ({ ...previous, skus: [...previous.skus, { ...previous.skus[0], id: 'new-sku', sku_code: 'NEW', stock_by_location: locations }] });
  it('prepares zero and positive counts with audit records, without mutating live products or inventory', () => {
    const draft = withNew({ wh_crjp: 0, wh_rslsg: 8 });
    const result = prepareProductOpeningStock(draft, previous);
    expect(result.skus[0]).toEqual(previous.skus[0]);
    expect(result.inventory_adjustments).toHaveLength(2);
    expect(result.inventory_adjustments?.every(item => item.kind === 'opening' && item.before === null && item.sku === 'NEW')).toBe(true);
    expect(result.warehouse_positions?.map(item => [item.sku_id, item.on_hand])).toEqual([['new-sku', 0], ['new-sku', 8]]);
    expect(previous.inventory_adjustments).toEqual([]);
    expect(getInventoryPositions()).toEqual([]);
    expect(prepareProductOpeningStock(result, result).inventory_adjustments).toHaveLength(2);
  });
  it('does not invent warehouses for a new SKU without counts', () => {
    expect(prepareProductOpeningStock(withNew({}), previous).inventory_adjustments).toEqual([]);
  });
  it.each([-1, 1.5, NaN, Infinity])('rejects invalid opening count %s', count => {
    expect(() => prepareProductOpeningStock(withNew({ wh_crjp: count }), previous)).toThrow(/whole count/);
  });
  it('rejects unknown and channel-managed warehouses', () => {
    for (const id of ['missing', 'wh_fbajp']) expect(() => prepareProductOpeningStock(withNew({ [id]: 2 }), previous)).toThrow(/active, editable warehouse/);
  });
  it('does not record a single-to-variant migration as fresh stock', () => {
    previous = { ...previous, has_variants: false, inventory: { wh_crjp: 7 } };
    const next = prepareProductOpeningStock({ ...previous, has_variants: true }, previous);
    expect(next.inventory_adjustments).toEqual([]);
  });
});
