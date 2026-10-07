import { describe, expect, it } from 'vitest';
import type { CatalogImportItem } from './catalog-import-store';
import type { Product } from './product-store';
import { resolveSourceSkuMappings, sourceSkuDataError, sourceSkuItems, suggestSourceSkuMappings } from './listing-sku-mapping';

const source: CatalogImportItem = {
  id: 'shop-source', channel: 'amazon', listingId: 'shop-id', storeName: 'Shop', channelSku: 'PARENT',
  title: 'Sketchbook', variants: 3, image: '', channelCategory: '', price: 27, currency: 'USD', channelStock: 88,
  status: 'suggested', confidence: 90, resolution: 'later',
  variantItems: [
    { sku: 'SHOP-A4', label: 'Hardcover / A4' },
    { sku: 'MASTER-A5-HC', label: 'Hardcover / A5' },
    { sku: 'SHOP-A5-SC', label: 'Softcover / A5' },
  ],
};
const product: Pick<Product, 'skus'> = { skus: [
  { id: 'hc-a5', sku_code: 'MASTER-A5-HC', variation_name: 'Hardcover / A5', status: 'active', weight_g: 0, units_per_carton: 1 },
  { id: 'sc-a5', sku_code: 'MASTER-A5-SC', variation_name: 'Softcover / A5', status: 'active', weight_g: 0, units_per_carton: 1 },
  { id: 'hc-a4', sku_code: 'MASTER-A4-HC', variation_name: 'Hardcover / A4', status: 'active', weight_g: 0, units_per_carton: 1 },
] };

describe('Source SKU prefill and conservative suggestions', () => {
  it('matches unique source identity independent of row order and shop code prefixes', () => {
    expect(suggestSourceSkuMappings(source, product)).toEqual([
      { shop_sku: 'SHOP-A4', master_sku_id: 'hc-a4', reason: 'Variant matches' },
      { shop_sku: 'MASTER-A5-HC', master_sku_id: 'hc-a5', reason: 'SKU matches' },
      { shop_sku: 'SHOP-A5-SC', master_sku_id: 'sc-a5', reason: 'Variant matches' },
    ]);
    expect(suggestSourceSkuMappings(source, { skus: [...product.skus].reverse() })).toEqual(suggestSourceSkuMappings(source, product));
  });
  it('retains explicit choices and cleared values by source SKU, not index', () => {
    const chosen = [
      { shop_sku: 'MASTER-A5-HC', master_sku_id: '' },
      { shop_sku: 'SHOP-A4', master_sku_id: 'sc-a5' },
      { shop_sku: 'SHOP-A5-SC', master_sku_id: 'hc-a4' },
    ];
    expect(resolveSourceSkuMappings(source, product, chosen).map(row => row.master_sku_id)).toEqual(['sc-a5', '', 'hc-a4']);
  });
  it('does not infer mappings from SKU count, partial labels, parent codes or array order', () => {
    const unrelated = { ...source, variantItems: source.variantItems!.map((item, index) => ({ ...item, sku: `OTHER-${index}`, label: 'Hardcover' })) };
    expect(suggestSourceSkuMappings(unrelated, product).every(row => !row.master_sku_id)).toBe(true);
    expect(sourceSkuItems({ ...source, variantItems: undefined })).toEqual([]);
  });
  it('rejects incomplete and duplicate source data, without filling missing children from Master', () => {
    for (const items of [undefined, [], source.variantItems!.slice(0, 2), [source.variantItems![0], source.variantItems![0], source.variantItems![2]], source.variantItems!.map((item, index) => index ? item : { ...item, sku: '' })]) {
      const incomplete = { ...source, variantItems: items };
      expect(sourceSkuDataError(incomplete)).not.toBe('');
      expect(suggestSourceSkuMappings(incomplete, product).every(row => !row.master_sku_id)).toBe(true);
    }
  });
  it('leaves conflicting, ambiguous and inactive matches for manual review', () => {
    const one = { ...source, variants: 1, variantItems: [{ sku: 'MASTER-A5-HC', label: 'Hardcover / A4' }] };
    expect(suggestSourceSkuMappings(one, product)[0].master_sku_id).toBe('');
    const ambiguous = { skus: [...product.skus, { ...product.skus[2], id: 'duplicate', sku_code: 'OTHER-A4' }] };
    expect(suggestSourceSkuMappings(source, ambiguous)[0].master_sku_id).toBe('');
    const inactive = { skus: product.skus.map(sku => ({ ...sku, status: 'inactive' as const })) };
    expect(suggestSourceSkuMappings(source, inactive).every(row => !row.master_sku_id)).toBe(true);
  });
  it('does not silently map two shop SKUs to the same Master SKU', () => {
    const duplicateVariant = { ...source, variants: 2, variantItems: [{ sku: 'SHOP-1', label: 'Hardcover / A4' }, { sku: 'SHOP-2', label: 'Hardcover / A4' }] };
    expect(suggestSourceSkuMappings(duplicateVariant, product).every(row => !row.master_sku_id)).toBe(true);
  });
  it('uses the recorded shop code for a single-SKU source', () => {
    expect(sourceSkuItems({ ...source, variants: 1, variantItems: undefined })).toEqual([{ sku: 'PARENT', label: 'Single product' }]);
  });
});
