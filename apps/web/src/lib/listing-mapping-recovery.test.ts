// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { getCatalogImportItems } from './catalog-import-store';
import { getProducts, type Product } from './product-store';
import { resolveSourceSkuMappings } from './listing-sku-mapping';
import { listingMappingRecovery } from './listing-mapping-recovery';

const source = { ...getCatalogImportItems()[0], id: 'source', variants: 2, variantItems: [{ sku: 'SHOP-RED', label: 'Red' }, { sku: 'SHOP-BLUE', label: 'Blue' }] };
const master: Product = { ...getProducts()[0], has_variants: true, product_type: 'variant', skus: ['Red', 'Blue', 'Green'].map((variation_name, i) => ({ id: `sku-${i}`, sku_code: `MASTER-${i}`, variation_name, status: 'active', weight_g: 0, units_per_carton: 1 })) };
const mappings = { [source.id]: resolveSourceSkuMappings(source, master) };

describe('Listing mapping recovery', () => {
  it('allows a subset of Master variants rather than requiring equal SKU counts', () => {
    expect(listingMappingRecovery(source, master, mappings)).toBeNull();
    const single = { ...source, variants: 1, variantItems: source.variantItems.slice(0, 1) };
    expect(listingMappingRecovery(single, master, { [single.id]: resolveSourceSkuMappings(single, master) })).toBeNull();
  });
  it('does not confuse differences in shop identity fields with a SKU blocker', () => {
    expect(listingMappingRecovery({ ...source, brand: 'Different shop brand', channelSku: 'DIFFERENT-PARENT-CODE', title: 'Different listing title' }, master, mappings)).toBeNull();
  });
  it.each([
    { variants: 3, variantItems: source.variantItems },
    { variants: 2, variantItems: [] },
    { variants: 2, variantItems: [{ sku: '', label: 'Red' }, source.variantItems[1]] },
    { variants: 2, variantItems: [{ sku: 'DUPLICATE', label: 'Red' }, { sku: ' duplicate ', label: 'Blue' }] },
  ])('prioritizes refreshing incomplete or duplicate source data over creating variants: %j', patch => {
    const incomplete = { ...source, ...patch };
    const issue = listingMappingRecovery(incomplete, { ...master, has_variants: false, product_type: 'single', skus: [] }, {});
    expect(issue?.action).toBe('reload');
  });
  it('requires explicit verification of an unknown structure, not merely viewing it', () => {
    const unknown = { ...source, variants: 0 };
    expect(listingMappingRecovery(unknown, master, mappings)?.action).toBe('structure');
    expect(listingMappingRecovery(unknown, master, mappings, [source.id])).toBeNull();
  });
  it('offers Master setup for N-to-single and insufficient active SKUs', () => {
    expect(listingMappingRecovery(source, { ...master, has_variants: false, product_type: 'single', skus: [] }, {})?.action).toBe('setup');
    const inactive = { ...master, skus: master.skus.map(sku => ({ ...sku, status: 'inactive' as const })) };
    expect(listingMappingRecovery(source, inactive, mappings)).toMatchObject({ action: 'setup', title: 'No available Master SKUs' });
  });
  it('explains duplicate target matches within a listing', () => {
    const duplicate = { [source.id]: mappings[source.id].map(row => ({ ...row, master_sku_id: 'sku-0' })) };
    expect(listingMappingRecovery(source, master, duplicate)).toMatchObject({ action: 'matches', title: 'A Master SKU is selected more than once' });
  });
  it.each(['', 'removed-sku'])('offers pair review for missing or invalid target %j', id => {
    const incomplete = { [source.id]: mappings[source.id].map((row, i) => i ? row : { ...row, master_sku_id: id }) };
    expect(listingMappingRecovery(source, master, incomplete)?.action).toBe('matches');
  });
  it('allows different listings to share the same confirmed Master SKUs', () => {
    const other = { ...source, id: 'other-shop' };
    const shared = { ...mappings, [other.id]: mappings[source.id] };
    expect(listingMappingRecovery(source, master, shared)).toBeNull();
    expect(listingMappingRecovery(other, master, shared)).toBeNull();
  });
});
