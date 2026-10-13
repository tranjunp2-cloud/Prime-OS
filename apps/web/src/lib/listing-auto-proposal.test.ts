// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { getProducts } from './product-store';
import { getCatalogImportItems } from './catalog-import-store';
import { proposeListingReview, proposedSkuPrice } from './listing-auto-proposal';
import { variantMappingError } from './listing-master-completion';

const fixtures = () => {
  const products = getProducts();
  const master = structuredClone(products.find(product => product.id === 'prod_001')!);
  const listings = getCatalogImportItems({ requireConfirmation: true });
  const notebook = listings.find(source => source.id === 'imp-009')!;
  const sketchbook = listings.find(source => source.id === 'imp-011')!;
  const palette = listings.find(source => source.channelSku === 'AMZ-WC-PALETTE-24')!;
  return { products, master, notebook, sketchbook, palette };
};

describe('Automatic listing review proposals', () => {
  it('prefills the entire screenshot case with separate proposed rows, not false Notebook matches', () => {
    const { products, master, notebook, sketchbook, palette } = fixtures();
    const sources = [palette, notebook, sketchbook];
    const before = structuredClone({ master, sources });
    const { product, mappings } = proposeListingReview(master, sources, products);
    expect(Object.values(mappings).flat()).toHaveLength(6);
    expect(variantMappingError(sources, product, mappings)).toBe('');
    expect(mappings[notebook.id].every(row => master.skus.some(sku => sku.id === row.master_sku_id))).toBe(true);
    expect(mappings[sketchbook.id].every(row => !master.skus.some(sku => sku.id === row.master_sku_id))).toBe(true);
    expect(product.skus).toHaveLength(master.skus.length + 4);
    expect(product.skus.slice(0, master.skus.length)).toEqual(master.skus);
    expect(product.skus.slice(master.skus.length).every(sku => !sku.stock_by_location && sku.stock === undefined)).toBe(true);
    expect(product.inventory).toEqual(master.inventory);
    expect(product.channels).toEqual(master.channels);
    expect({ master, sources }).toEqual(before);
    expect(proposeListingReview(master, sources, products)).toEqual({ product, mappings });
  });
  it('uses a labelled Master base-price proposal for foreign currency, never relabels USD as JPY', () => {
    const { products, master, sketchbook } = fixtures();
    const result = proposeListingReview(master, [sketchbook], products);
    for (const row of result.mappings[sketchbook.id]) {
      const sku = result.product.skus.find(sku => sku.id === row.master_sku_id)!;
      expect(sku.price).toBe(master.retail_price);
      expect(proposedSkuPrice(master, sketchbook, row.shop_sku).explanation).toContain('not a currency conversion');
    }
  });
  it('copies same-currency child prices and reuses a proposed row across shops with the same variant', () => {
    const { products, master, sketchbook } = fixtures();
    const first = { ...sketchbook, variantItems: sketchbook.variantItems!.map(sku => ({ ...sku, price: { amount: 3900, currency: 'JPY' } })) };
    const second = { ...first, id: 'another-shop', variantItems: first.variantItems.map(sku => ({ ...sku, sku: `OTHER-${sku.sku}` })) };
    const result = proposeListingReview(master, [first, second], products);
    expect(result.product.skus).toHaveLength(master.skus.length + 3);
    expect(result.mappings[first.id].map(row => row.master_sku_id)).toEqual(result.mappings[second.id].map(row => row.master_sku_id));
    expect(result.product.skus.slice(-3).every(sku => sku.price === 3900)).toBe(true);
  });
  it('does not merge two indistinguishable source records within one listing', () => {
    const { products, master, sketchbook } = fixtures();
    const source = { ...sketchbook, variantItems: sketchbook.variantItems!.map(item => ({ ...item, label: 'Same label' })) };
    const result = proposeListingReview(master, [source], products);
    expect(new Set(result.mappings[source.id].map(row => row.master_sku_id)).size).toBe(3);
    expect(variantMappingError([source], result.product, result.mappings)).toBe('');
  });
  it('generates unique proposed internal codes while preserving source codes and seller clears', () => {
    const { products, master, sketchbook } = fixtures();
    const item = sketchbook.variantItems![0];
    const reserved = { ...master, id: 'another-master', sku_code: item.sku };
    const result = proposeListingReview(master, [sketchbook], [...products, reserved], {
      [sketchbook.id]: [{ shop_sku: sketchbook.variantItems![1].sku, master_sku_id: '' }],
    });
    expect(result.product.skus.find(sku => sku.id === result.mappings[sketchbook.id][0].master_sku_id)?.sku_code).not.toBe(item.sku);
    expect(result.mappings[sketchbook.id][0].shop_sku).toBe(item.sku);
    expect(result.mappings[sketchbook.id][1].master_sku_id).toBe('');
  });
  it('leaves truly unavailable source data unresolved rather than inventing SKU records', () => {
    const { products, master, sketchbook } = fixtures();
    for (const variantItems of [undefined, []]) {
      const result = proposeListingReview(master, [{ ...sketchbook, variantItems }], products);
      expect(result.product.skus).toEqual(master.skus);
      expect(result.mappings[sketchbook.id]).toBeUndefined();
    }
  });
  it('fills available empty fields with provenance, keeping existing Master values', () => {
    const { products, master, sketchbook } = fixtures();
    const source = { ...sketchbook, description: 'Imported description', modelNumber: 'SHOP-MODEL' };
    const result = proposeListingReview({ ...master, description: '', model_number: '' }, [source], products);
    expect(result.product.description).toBe('Imported description');
    expect(result.product.model_number).toBe('SHOP-MODEL');
    expect(result.product.field_mappings?.model_number.source?.listingId).toBe(source.listingId);
    expect(result.product.name).toBe(master.name);
    expect(result.product.brand).toBe(master.brand);
  });
});
