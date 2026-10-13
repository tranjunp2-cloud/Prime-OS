import { describe, expect, it } from 'vitest';
import type { CatalogImportItem } from './catalog-import-store';
import type { Product } from './product-store';
import { assignMatrixSku, proposeMatrixSku, sourceMatrixState } from './listing-sku-matrix';

const product: Product = {
  id: 'master', name: 'Colour variants', sku_code: 'MASTER', has_variants: true,
  product_type: 'variant', price_currency: 'JPY', inventory: { warehouse: 7 },
  gtin: '', mpn: '', model_number: '', brand: '', asin: '', manufacturer: '',
  category: '', condition: 'new', description: 'Test product', original_price: 100, retail_price: 100,
  prod_length: 0, prod_height: 0, prod_width: 0, prod_weight: 0,
  pkg_length: 0, pkg_height: 0, pkg_width: 0, pkg_weight: 0,
  country_of_origin: '', hs_code: '', images: [], channels: [], status: 'draft',
  created_at: '2026-10-12T00:00:00Z', updated_at: '2026-10-12T00:00:00Z',
  skus: ['Red', 'Blue', 'Green'].map((label, i) => ({ id: `m${i}`, sku_code: `MASTER-${label}`, variation_name: label, status: 'active', price: 100, weight_g: 0, units_per_carton: 1, stock_by_location: { warehouse: i + 1 } })),
};
const source = { id: 'shop', variants: 2, channelSku: 'LISTING', variantItems: [{ sku: 'BLUE', label: 'Blue' }, { sku: 'RED', label: 'Red' }] } as CatalogImportItem;

describe('Master-anchored SKU matrix', () => {
  it('aligns by SKU identity, not source order; an extra Master variant is not an unmapped shop SKU', () => {
    const state = sourceMatrixState(source, product);
    expect(state.valid).toEqual([{ shop_sku: 'BLUE', master_sku_id: 'm1' }, { shop_sku: 'RED', master_sku_id: 'm0' }]);
    expect(state.pending).toEqual([]);
    expect(state.needsReview).toBe(false);
  });
  it('allows different shops to share the same Master SKU', () => {
    expect(sourceMatrixState({ ...source, id: 'other' }, product).valid).toEqual(sourceMatrixState(source, product).valid);
  });
  it('moves a SKU and retains the displaced one as explicitly unmapped', () => {
    const original = sourceMatrixState(source, product).rows;
    const moved = assignMatrixSku(original, 'm1', 'RED');
    expect(moved).toEqual([{ shop_sku: 'BLUE', master_sku_id: '' }, { shop_sku: 'RED', master_sku_id: 'm1' }]);
    expect(original[0].master_sku_id).toBe('m1');
    expect(sourceMatrixState(source, product, moved).pending).toEqual([source.variantItems![0]]);
  });
  it('retains explicitly cleared pairs instead of suggesting again', () => {
    const cleared = assignMatrixSku(sourceMatrixState(source, product).rows, 'm0', '');
    expect(sourceMatrixState(source, product, cleared).pending.map(item => item.sku)).toEqual(['RED']);
  });
  it('counts stale and duplicated target mappings as unresolved, never as coverage', () => {
    for (const ids of [['m0', 'm0'], ['gone', '']]) {
      const rows = source.variantItems!.map((item, i) => ({ shop_sku: item.sku, master_sku_id: ids[i] }));
      expect(sourceMatrixState(source, product, rows).matched).toBe(0);
    }
  });
  it('does not call missing or duplicate source records matched', () => {
    for (const items of [undefined, [{ sku: 'RED', label: 'Red' }], [{ sku: 'RED', label: 'Red' }, { sku: 'red', label: 'Blue' }]]) {
      const state = sourceMatrixState({ ...source, variantItems: items }, product);
      expect(state.error).toBeTruthy();
      expect(state.needsReview).toBe(true);
      expect(state.matched).toBe(0);
    }
  });
  it('never collapses three shop SKUs into one single Master', () => {
    const state = sourceMatrixState(source, { ...product, has_variants: false, product_type: 'single', skus: [] });
    expect(state.pending).toHaveLength(2);
    expect(state.matched).toBe(0);
  });
  it('requires verification when source structure was not recorded', () => {
    const single = { ...source, variants: 0, variantItems: undefined };
    const master = { ...product, has_variants: false, product_type: 'single' as const, skus: [] };
    expect(sourceMatrixState(single, master).needsReview).toBe(true);
    expect(sourceMatrixState(single, master, undefined, [source.id]).singleMatch).toBe(true);
  });
  it('adds only the requested SKU and preserves all stock, identity, and existing rows', () => {
    const before = structuredClone(product);
    const next = proposeMatrixSku(product, { id: 'new', code: ' NEW ', label: ' Yellow ' });
    expect(next.skus.at(-1)).toMatchObject({ id: 'new', sku_code: 'NEW', variation_name: 'Yellow', price: undefined });
    expect(next.skus.at(-1)).not.toHaveProperty('stock_by_location');
    expect(next.skus.slice(0, -1)).toEqual(product.skus);
    expect(next.inventory).toEqual(product.inventory);
    expect(next.sku_code).toBe(product.sku_code);
    expect(product).toEqual(before);
  });
  it('rejects a duplicate product/child identity, blank variant name, or invalid price', () => {
    for (const code of ['master', 'master-RED']) expect(() => proposeMatrixSku(product, { id: 'new', code, label: 'Variant' })).toThrow('already exists');
    expect(() => proposeMatrixSku(product, { id: 'new', code: 'NEW', label: '' })).toThrow('variant name');
    expect(() => proposeMatrixSku(product, { id: 'new', code: 'NEW', label: 'New', price: -1 })).toThrow('greater than zero');
  });
});
