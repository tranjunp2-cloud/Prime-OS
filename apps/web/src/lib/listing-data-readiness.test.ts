// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import type { CatalogImportItem } from './catalog-import-store';
import { importedListingDataReadiness } from './listing-data-readiness';
import { createEmptyListingCatalog } from './listing-intake-catalog';
import { newListingMasterPreview } from './listing-master-completion';
import { confirmListingIntake, getListingSuggestion } from './product-listing-intake';
import { resolveListingShopData } from './listing-shop-data';
import { listingSyncReadiness } from './listing-sync-readiness';
import { masterSyncPlan } from './listing-master-sync';

const source: CatalogImportItem = {
  id: 'complete-shop', channel: 'shopee', storeName: 'Source shop', listingId: 'shop-listing-1',
  title: 'Listing title', channelSku: 'SHOP-1', brand: 'Brand', description: 'Listing description',
  image: '/shop.jpg', channelCategory: 'Art', price: 15, currency: 'USD', channelStock: 0,
  variants: 1, status: 'unmatched', confidence: 0, resolution: 'later',
};
function setup(patch: Partial<CatalogImportItem> = {}) {
  const catalog = createEmptyListingCatalog([{ ...source, ...patch }]);
  const master = { ...newListingMasterPreview(source, { name: 'Master name', sku: 'MASTER-1' }),
    name: 'Master name', description: 'Master description', images: ['/master.jpg'], retail_price: 999,
    status: 'published' as const, inventory: { wh_crjp: 100 } };
  catalog.add(master);
  return { catalog, master };
}

describe('Listing-owned data required before linking', () => {
  it('accepts a complete listing with zero stock and a zero price', () => {
    expect(importedListingDataReadiness({ ...source, price: 0 }).ready).toBe(true);
  });
  it.each([
    [{ listingId: '' }, 'Listing ID'], [{ storeName: ' ' }, 'Shop'], [{ channelSku: '' }, 'Shop SKU'],
    [{ title: ' ' }, 'Title'], [{ description: '<p>&nbsp;</p>' }, 'Description'], [{ image: '', images: [] }, 'Product image'],
    [{ channelCategory: '' }, 'Category'], [{ price: NaN }, 'Listing price & currency'],
    [{ currency: '' }, 'Listing price & currency'], [{ channelStock: undefined }, 'Shop stock'],
    [{ channelStock: -1 }, 'Shop stock'], [{ channelStock: 1.5 }, 'Shop stock'],
  ] as Array<[Partial<CatalogImportItem>, string]>)('rejects missing or invalid source data %j', (patch, field) => {
    const item = { ...source, ...patch };
    expect(importedListingDataReadiness(item)).toMatchObject({ ready: false, missing: expect.arrayContaining([field]) });
    const { catalog, master } = setup(patch);
    const before = catalog.products(); const imports = catalog.listings();
    expect(() => confirmListingIntake([item.id], { productId: master.id, defer: true }, catalog)).toThrow(/Missing listing data/);
    expect(catalog.products()).toEqual(before);
    expect(catalog.listings()).toEqual(imports);
  });
  it('requires every variant SKU, price and stock, without treating missing values as zero', () => {
    const variants = [{ sku: 'RED', label: 'Red', price: { amount: 1, currency: 'USD' }, stock: 0 },
      { sku: 'BLUE', label: 'Blue', price: { amount: 2, currency: 'USD' }, stock: 4 }];
    expect(importedListingDataReadiness({ ...source, variants: 2, variantItems: variants }).ready).toBe(true);
    for (const rows of [variants.slice(0, 1), [variants[0], { ...variants[1], sku: ' red ' }],
      [variants[0], { ...variants[1], stock: undefined }], [variants[0], { ...variants[1], price: undefined }]]) {
      expect(importedListingDataReadiness({ ...source, variants: 2, variantItems: rows }).ready).toBe(false);
    }
  });
  it.each([
    [{ variants: 0 }, 'SKU structure'],
    [{ variants: 2, variantItems: [{ sku: 'RED', label: 'Red' }, { sku: 'BLUE', label: 'Blue' }] }, 'Variant SKU details, prices & stock'],
  ] as Array<[Partial<CatalogImportItem>, string]>)('allows only a SKU-pending deferred link when SKU details are missing %j', (patch, field) => {
    const item = { ...source, ...patch };
    expect(importedListingDataReadiness(item)).toMatchObject({ ready: false, baseReady: true, skuMissing: [field] });
    const { catalog, master } = setup(patch);
    const before = catalog.products();
    expect(() => confirmListingIntake([item.id], { productId: master.id }, catalog)).toThrow();
    expect(catalog.products()).toEqual(before);
    confirmListingIntake([item.id], { productId: master.id, defer: true }, catalog);
    const link = catalog.products()[0].channels[0];
    expect(link.variant_mappings).toBeUndefined();
    expect(link.review_pending).toMatchObject({ sku_mapping_pending: true, issues: expect.arrayContaining(['Verify imported SKU details']) });
  });
  it('rejects a mixed batch atomically and does not create a Master from an incomplete listing', () => {
    const { catalog, master } = setup();
    catalog.saveListings([...catalog.listings(), { ...source, id: 'missing', listingId: 'other', description: '' }]);
    const before = catalog.products();
    expect(() => confirmListingIntake([source.id, 'missing'], { productId: master.id }, catalog)).toThrow(/Description/);
    expect(() => confirmListingIntake(['missing'], { name: 'New', sku: 'NEW', sourceId: 'missing', defer: true }, catalog)).toThrow(/Description/);
    expect(catalog.products()).toEqual(before);
    expect(catalog.listings().every(item => !item.confirmed)).toBe(true);
  });
  it('persists all source values with the link, even after the import queue is cleared', () => {
    const { catalog, master } = setup();
    confirmListingIntake([source.id], { productId: master.id }, catalog);
    catalog.saveListings([]);
    const product = catalog.products()[0];
    expect(resolveListingShopData(product, product.channels[0], [])).toMatchObject({
      title: source.title, description: source.description, images: [source.image], sku: source.channelSku,
      category: source.channelCategory, price: { amount: 15, currency: 'USD' }, stock: 0,
    });
    expect(product).toMatchObject({ inventory: master.inventory, retail_price: 999, name: 'Master name' });
    expect(product.channels[0].last_synced_at).toBeNull();
  });
  it('never quick-confirms an incomplete suggestion', () => {
    const { master } = setup();
    const item = { ...source, channelSku: master.sku_code, brand: master.brand, status: 'matched' as const,
      suggestedProductId: master.id, confidence: 100, description: '' };
    expect(getListingSuggestion(item, [master])).toMatchObject({ eligible: false, reason: expect.stringContaining('Description') });
  });
  it('reports legacy empty relationships and blocks sync even if Master/local data could fill fields', () => {
    const { master } = setup();
    const listing = { channel: source.channel, external_id: source.listingId, store_name: source.storeName,
      status: 'active' as const, listing_url: null, last_synced_at: null,
      local_draft: { values: { title: 'Local', description: 'Local description', images: ['/local.jpg'], price: { amount: 10, currency: 'USD' }, stock: 1, category: 'Art' }, updated_at: '' } };
    expect(listingSyncReadiness(master, listing)).toMatchObject({ incompleteSource: true, ready: false, label: 'Listing data incomplete' });
    expect(masterSyncPlan(master, listing, { enabled: true, fields: ['content', 'media'] }).error).toContain('Missing listing data');
    expect(masterSyncPlan(master, listing, { enabled: false, fields: [] }).error).toBeUndefined();
  });
});
