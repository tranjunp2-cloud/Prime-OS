// @vitest-environment jsdom
import { readyMasterFields } from '@/test/fixtures/listing-master';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { confirmSuggestedListingLinks, getListingSuggestion, pendingShopListings, snapshotListingMatch } from './product-listing-intake';
import { getCatalogImportItems, saveCatalogImportItems, type CatalogImportItem } from './catalog-import-store';
import { addProduct, deleteProduct, getProductById, getProducts, updateProduct, type Product } from './product-store';

let original: CatalogImportItem[];
let ids: Set<string>;
let masters: Product[];
let items: CatalogImportItem[];
const reviews = () => items.map(item => snapshotListingMatch(item, getProductById(item.suggestedProductId!)!));
beforeEach(() => {
  original = getCatalogImportItems({ requireConfirmation: true });
  ids = new Set(getProducts().map(product => product.id));
  masters = ['a', 'b'].map(id => ({ ...getProducts()[0], ...readyMasterFields(), id: `batch-${id}`, name: `Batch product ${id}`, sku_code: `BATCH-${id.toUpperCase()}`, brand: 'Test Brand', has_variants: false, product_type: 'single', skus: [], channels: [], channel_overrides: {}, status: 'draft', import_result: undefined, import_sources: [], inventory: { wh_crjp: 17 } } as Product));
  masters.forEach(product => addProduct(product));
  items = ['a', 'b', 'c'].map((id, index) => {
    const master = masters[index === 1 ? 1 : 0];
    return { id, channel: 'shopee', storeName: `Shop ${id}`, title: master.name, brand: master.brand, channelSku: master.sku_code, listingId: `batch-listing-${id}`, variants: 1, channelStock: 42, image: '', channelCategory: '', price: 123, currency: 'JPY', status: 'suggested', confidence: 99, suggestedProductId: master.id, resolution: 'later' };
  });
  saveCatalogImportItems(items);
});
afterEach(() => {
  vi.restoreAllMocks();
  getProducts().filter(product => !ids.has(product.id)).forEach(product => deleteProduct(product.id));
  saveCatalogImportItems(original);
});

describe('Suggested listing bulk confirmation', () => {
  it('requires exact normalized SKU and brand, not confidence alone', () => {
    expect(getListingSuggestion({ ...items[0], brand: ' test brand ', channelSku: ' batch-a ' }).eligible).toBe(true);
    const flagged: Partial<CatalogImportItem>[] = [{ brand: undefined }, { brand: 'Different brand' }, { channelSku: 'SHOP-BATCH-A' }, { confidence: 94 }, { confidence: NaN }, { variants: 2 }, { status: 'conflict' }, { suggestedProductId: 'missing' }];
    flagged.forEach(changes => expect(getListingSuggestion({ ...items[0], ...changes }).eligible).toBe(false));
    expect(getProductById(masters[0].id)?.channels).toEqual([]);
    expect(getListingSuggestion(items[0], [{ ...masters[0], status: 'archived' }]).suggested).toBe(false);
    expect(getListingSuggestion(items[0], [{ ...masters[0], status: 'review' }]).eligible).toBe(true);
    expect(getListingSuggestion(items[0], [{ ...masters[0], has_variants: true }]).eligible).toBe(false);
  });
  it('links each reviewed pair to its own Master and aggregates repeated targets without merging or changing inventory', () => {
    const before = masters.map(master => structuredClone(getProductById(master.id)!));
    const persist = vi.spyOn(Storage.prototype, 'setItem');
    expect(confirmSuggestedListingLinks(reviews())).toEqual({ linkedCount: 3, masterCount: 2, productIds: ['batch-a', 'batch-b'], reviewSaved: true });
    const after = masters.map(master => getProductById(master.id)!);
    expect(after[0].channels.map(channel => channel.external_id)).toEqual(['batch-listing-a', 'batch-listing-c']);
    expect(after[1].channels.map(channel => channel.external_id)).toEqual(['batch-listing-b']);
    after.forEach((product, index) => {
      for (const field of ['name', 'sku_code', 'brand', 'images', 'description', 'category', 'inventory', 'retail_price', 'channel_overrides'] as const) expect(product[field]).toEqual(before[index][field]);
      expect(product.status).toBe(before[index].status);
      expect(product.record_version).toBe((before[index].record_version ?? 1) + 1);
      product.channels.forEach(channel => expect(channel).toMatchObject({ publication_unconfirmed: true, status: 'draft', last_synced_at: null }));
    });
    expect(persist).toHaveBeenCalledTimes(2); // One atomic relationship write, then review receipts.
    expect(pendingShopListings()).toEqual([]);
    expect(getCatalogImportItems().map(item => item.resolvedProductId)).toEqual(['batch-a', 'batch-b', 'batch-a']);
  });
  it('does not bulk-confirm conflicting identifiers even when SKU, brand and seed confidence match', () => {
    expect(getListingSuggestion({ ...items[0], gtin: 'DIFFERENT-GTIN' }, [{ ...masters[0], gtin: 'RECORDED-GTIN' }]).eligible).toBe(false);
    expect(getListingSuggestion({ ...items[0], modelNumber: 'OTHER-MODEL' }, [{ ...masters[0], model_number: 'RECORDED-MODEL' }]).eligible).toBe(false);
    expect(getListingSuggestion({ ...items[0], mpn: 'OTHER-PART' }, [{ ...masters[0], mpn: 'RECORDED-PART' }]).eligible).toBe(false);
    expect(getListingSuggestion({ ...items[0], packQuantity: 2 }, [{ ...masters[0], pack_quantity: 12 }]).eligible).toBe(false);
  });
  it('rejects all pairs before writing when one source or destination changes', () => {
    const snapshot = reviews();
    saveCatalogImportItems(items.map(item => item.id === 'b' ? { ...item, title: 'Changed pack size' } : item));
    expect(() => confirmSuggestedListingLinks(snapshot)).toThrow(/changed/);
    masters.forEach(master => expect(getProductById(master.id)?.status).toBe('draft'));
    masters.forEach(master => expect(getProductById(master.id)?.channels).toEqual([]));
    saveCatalogImportItems(items);
    updateProduct(masters[1].id, { id: masters[1].id, name: 'Changed destination' });
    expect(() => confirmSuggestedListingLinks(snapshot)).toThrow(/changed/);
    masters.forEach(master => expect(getProductById(master.id)?.channels).toEqual([]));
  });
  it('rejects duplicate pairs, source identities, ignored sources and already-linked listings', () => {
    const snapshot = reviews();
    expect(() => confirmSuggestedListingLinks([])).toThrow(/distinct/);
    expect(() => confirmSuggestedListingLinks([snapshot[0], snapshot[0]])).toThrow(/distinct/);
    const duplicate = { ...items[0], id: 'duplicate' };
    saveCatalogImportItems([...items, duplicate]);
    expect(() => confirmSuggestedListingLinks([snapshot[0], snapshotListingMatch(duplicate, getProductById('batch-a')!)])).toThrow(/more than once/);
    saveCatalogImportItems(items.map(item => item.id === 'b' ? { ...item, resolution: 'ignore' } : item));
    expect(() => confirmSuggestedListingLinks(snapshot)).toThrow(/changed/);
    masters.forEach(master => expect(getProductById(master.id)?.channels).toEqual([]));
    saveCatalogImportItems(items);
    confirmSuggestedListingLinks([snapshot[0]]);
    expect(() => confirmSuggestedListingLinks([snapshot[0]])).toThrow(/already linked/);
  });
  it('does not partially link or confirm if the atomic product write fails', () => {
    const snapshot = reviews();
    const before = structuredClone(getProducts());
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage full'); });
    expect(() => confirmSuggestedListingLinks(snapshot)).toThrow('Storage full');
    expect(getProducts()).toEqual(before);
    masters.forEach(master => expect(getProductById(master.id)?.channels).toEqual([]));
    expect(getCatalogImportItems({ requireConfirmation: true }).some(item => item.confirmed)).toBe(false);
  });
  it('reports a receipt failure but keeps the authoritative links safe from duplicates', () => {
    const snapshot = reviews();
    const set = Storage.prototype.setItem;
    let writes = 0;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function(this: Storage, key, value) {
      if (++writes === 2) throw new Error('Receipt failed');
      return set.call(this, key, value);
    });
    expect(confirmSuggestedListingLinks(snapshot).reviewSaved).toBe(false);
    masters.forEach(master => expect(getProductById(master.id)?.status).toBe('draft'));
    expect(pendingShopListings()).toEqual([]);
    expect(() => confirmSuggestedListingLinks(snapshot)).toThrow(/already linked/);
  });
});
