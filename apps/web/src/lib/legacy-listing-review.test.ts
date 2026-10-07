// @vitest-environment jsdom
import { readyMasterFields } from '@/test/fixtures/listing-master';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addProduct, commitListingReviewProducts, deleteProduct, getProductById, getProducts, updateProduct, type Product } from './product-store';
import { getCatalogImportItems, saveCatalogImportItems, type CatalogImportItem } from './catalog-import-store';
import { confirmListingIntake, pendingMappingReviews, snapshotListingMatch, snapshotListingSource } from './product-listing-intake';
import { legacyListingReviews } from './legacy-listing-review';

let originalIds: Set<string>;
let imports: CatalogImportItem[];
let source: Product;
let target: Product;
let existingSnapshots: Product[];
const fresh = (id: string) => getProductById(id)!;
const reviews = () => pendingMappingReviews().filter(item => item.existingLinkReview?.productId === source.id);
beforeEach(() => {
  originalIds = new Set(getProducts().map(product => product.id));
  existingSnapshots = [];
  imports = getCatalogImportItems({ requireConfirmation: true });
  source = { ...getProducts()[0], ...readyMasterFields(), id: `legacy-source-${crypto.randomUUID()}`, name: 'Legacy review source', sku_code: `LEGACY-${crypto.randomUUID()}`, product_type: 'single', has_variants: false, skus: [], inventory: { wh_crjp: 19 }, channels: [{ channel: 'amazon', external_id: 'legacy-listing-id', store_name: 'Test legacy shop', status: 'active', listing_url: 'https://example.com/item', last_synced_at: '2026-10-01', reported_stock: 6 }], channel_overrides: { amazon: { enabled: true, title: 'Source title', price_markup: 0, description: 'Source description', sync_policy: 'manual' } }, import_result: 'needs_review', import_issues: ['Variant structure conflict: verify pack'], import_sources: [{ channel: 'amazon', store: 'Test legacy shop', brand: 'Source brand', price: 25, currency: 'USD' }], status: 'review' };
  target = { ...source, id: `legacy-target-${crypto.randomUUID()}`, sku_code: `TARGET-${crypto.randomUUID()}`, name: 'Available target', status: 'draft', channels: [], channel_overrides: {}, import_sources: [], import_result: undefined, import_issues: [], inventory: { wh_crjp: 7 } };
  addProduct(source); addProduct(target); saveCatalogImportItems([]);
});
afterEach(() => {
  vi.restoreAllMocks();
  if (existingSnapshots.length) commitListingReviewProducts(existingSnapshots);
  getProducts().filter(product => !originalIds.has(product.id)).forEach(product => deleteProduct(product.id));
  saveCatalogImportItems(imports);
});
const confirm = (destination = fresh(source.id)) => {
  const items = reviews();
  return confirmListingIntake(items.map(item => item.id), { productId: destination.id, verifiedSingleListingIds: items.map(item => item.id), reviewed: items.map(item => snapshotListingMatch(item, destination)) });
};
describe('Existing mapping reviews stay with their Product Master', () => {
  it('passes saved shop SKU details into review even when the import queue no longer has the listing', () => {
    const link = source.channels[0];
    const variants = [{ sku: 'SHOP-RED', label: 'Red' }, { sku: 'SHOP-BLUE', label: 'Blue' }];
    updateProduct(source.id, { id: source.id, channels: [{ ...link, shop_snapshot: {
      channel: link.channel, store_name: link.store_name!, listing_id: link.external_id!, shop_sku: 'SHOP-PARENT',
      title: 'Shop variant listing', images: [], category: '', variant_count: 2, variant_items: variants, recorded_at: '2026-10-01T00:00:00Z',
    } }] });
    const before = JSON.stringify(getProducts());
    expect(reviews()[0]).toMatchObject({ variants: 2, variantItems: variants });
    expect(JSON.stringify(getProducts())).toBe(before);
  });
  it('projects every unresolved link without detaching, auto-confirming or inventing source evidence', () => {
    const before = JSON.stringify(getProducts());
    const item = reviews()[0];
    expect(reviews()).toHaveLength(1);
    expect(item).toMatchObject({ title: 'Source title', image: '', variants: 0, suggestedProductId: source.id });
    expect(item.gtin).toBeUndefined(); expect(item.packQuantity).toBeUndefined();
    expect(JSON.stringify(getProducts())).toBe(before);
  });
  it('does not bulk-confirm or assume unknown SKU structure', () => {
    const items = reviews();
    expect(() => confirmListingIntake([items[0].id], { productId: source.id })).toThrow(/Review the current/);
    expect(() => confirmListingIntake([items[0].id], { productId: source.id, reviewed: items.map(item => snapshotListingMatch(item, fresh(source.id))) })).toThrow(/variant-SKU/);
    expect(reviews()).toHaveLength(1);
  });
  it('keeps a reviewed link and clears mapping-only work without changing Master status or stock', () => {
    const before = structuredClone(fresh(source.id));
    confirm();
    expect(reviews()).toHaveLength(0);
    expect(fresh(source.id)).toMatchObject({ status: before.status, import_issues: [], inventory: before.inventory, channel_overrides: before.channel_overrides });
    expect(fresh(source.id).channels[0]).toMatchObject(before.channels[0]);
    expect(fresh(source.id).import_result).toBeUndefined();
  });
  it('clears mapping issues but retains unrelated missing-data issues', () => {
    updateProduct(source.id, { id: source.id, import_issues: ['Confirm mapping', 'Product image missing', 'Package weight missing'] });
    confirm();
    expect(fresh(source.id)).toMatchObject({ import_issues: ['Product image missing', 'Package weight missing'], status: 'review' });
  });
  it('moves only the confirmed relationship and preserves shop state, settings and both Masters’ stock', () => {
    const before = structuredClone(fresh(source.id));
    confirm(fresh(target.id));
    expect(fresh(source.id).channels).toHaveLength(0);
    expect(fresh(target.id).channels[0]).toMatchObject(before.channels[0]);
    expect(fresh(target.id).channel_overrides).toEqual(before.channel_overrides);
    expect(fresh(target.id).inventory).toEqual(target.inventory);
    expect(fresh(source.id).inventory).toEqual(source.inventory);
    expect(fresh(target.id).status).toBe('draft');
    expect(fresh(source.id).status).toBe('review');
    expect(reviews()).toHaveLength(0);
  });
  it('creates a separate Active Master without copying warehouse stock', () => {
    const items = reviews();
    const result = confirmListingIntake(items.map(item => item.id), { name: 'Separate source product', sku: `SEPARATE-${crypto.randomUUID()}`, completion: readyMasterFields(), sourceId: items[0].id, productType: 'single', verifiedSourceStructure: true, reviewedSources: items.map(snapshotListingSource) });
    expect(fresh(result.productId)).toMatchObject({ status: 'published', inventory: {}, retail_price: 123, product_type: 'single', skus: [] });
    expect(fresh(result.productId).channels[0]).toMatchObject(source.channels[0]);
    expect(fresh(source.id).channels).toHaveLength(0);
    expect(fresh(source.id).status).toBe('review');
  });
  it('rejects a changed owner snapshot and leaves all relationships untouched', () => {
    const item = reviews()[0];
    const reviewed = [snapshotListingMatch(item, fresh(target.id))];
    updateProduct(source.id, { id: source.id, name: 'Changed during review' });
    expect(() => confirmListingIntake([item.id], { productId: target.id, verifiedSingleListingIds: [item.id], reviewed })).toThrow(/changed during review/);
    expect(fresh(source.id).channels).toHaveLength(1); expect(fresh(target.id).channels).toHaveLength(0);
  });
  it('rejects a duplicate target listing without detaching the current link', () => {
    updateProduct(target.id, { id: target.id, channels: structuredClone(source.channels) });
    expect(() => confirm(fresh(target.id))).toThrow(/already contains/);
    expect(reviews()).toHaveLength(1);
  });
  it('does not overwrite other shop settings on a shared channel', () => {
    updateProduct(target.id, { id: target.id, channels: [{ ...source.channels[0], external_id: 'another-listing' }] });
    expect(() => confirm(fresh(target.id))).toThrow(/settings belong/);
    expect(fresh(source.id).channels).toHaveLength(1);
  });
  it('rolls back the new Master and all source changes when persistence fails', () => {
    const items = reviews(); const before = JSON.stringify(getProducts());
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw Error('Storage full'); });
    expect(() => confirmListingIntake([items[0].id], { name: 'Failed draft', sku: 'FAILED-LEGACY-DRAFT', completion: readyMasterFields(), sourceId: items[0].id, productType: 'single', verifiedSourceStructure: true, reviewedSources: items.map(snapshotListingSource) })).toThrow('Storage full');
    expect(JSON.stringify(getProducts())).toBe(before);
  });
  it('tracks decisions per exact shop link and preserves pending decisions on other links', () => {
    updateProduct(source.id, { id: source.id, channel_overrides: {}, channels: [source.channels[0], { ...source.channels[0], store_name: 'Second shop' }] });
    const [item] = reviews();
    confirmListingIntake([item.id], { productId: source.id, verifiedSingleListingIds: [item.id], reviewed: [snapshotListingMatch(item, fresh(source.id))] });
    expect(reviews()).toHaveLength(1); expect(reviews()[0].storeName).toBe('Second shop');
    expect(fresh(source.id).channels).toHaveLength(2);
    expect(fresh(source.id).status).toBe('review');
  });
  it('does not lose the queue when a Master is explicitly activated', () => {
    updateProduct(source.id, { id: source.id, status: 'published' });
    expect(legacyListingReviews([fresh(source.id)], [])).toHaveLength(1);
  });
  it('keeps an archived source visible but requires restoring it before changing its links', () => {
    updateProduct(source.id, { id: source.id, status: 'archived' });
    expect(reviews()).toHaveLength(1);
    expect(() => confirm(fresh(target.id))).toThrow(/Restore the current Master/);
    expect(fresh(source.id).channels).toHaveLength(1);
  });
  it('does not ask to review a newly confirmed link again because another old link needs review', () => {
    const item: CatalogImportItem = { id: 'fresh-intake', channel: 'shopee', listingId: 'fresh-listing', storeName: 'Fresh shop', title: 'Fresh listing', channelSku: 'FRESH-SKU', variants: 1, image: '', channelStock: 2, price: 2, currency: 'JPY', channelCategory: '', resolution: 'later', status: 'suggested', confidence: 90 };
    saveCatalogImportItems([item]);
    confirmListingIntake([item.id], { productId: source.id, reviewed: [snapshotListingMatch(item, fresh(source.id))] });
    expect(reviews()).toHaveLength(1);
    expect(reviews()[0].listingId).toBe(source.channels[0].external_id);
    expect(fresh(source.id).channels).toHaveLength(2);
  });
  it('does not reseed transferred demo links or erase partially reviewed decisions on reload', async () => {
    const demo = fresh('prod_import_test_review_02');
    existingSnapshots.push(structuredClone(demo));
    const [item] = pendingMappingReviews().filter(row => row.existingLinkReview?.productId === demo.id);
    expect(item).toBeDefined();
    confirmListingIntake([item.id], { productId: target.id, verifiedSingleListingIds: [item.id], reviewed: [snapshotListingMatch(item, fresh(target.id))] });
    const remaining = fresh(demo.id).channels;
    vi.resetModules();
    const reloaded = await import('./product-store');
    expect(reloaded.getProductById(demo.id)?.channels).toEqual(remaining);
    expect(remaining).toHaveLength(demo.channels.length - 1);
    expect(legacyListingReviews([reloaded.getProductById(demo.id)!], [])).toHaveLength(remaining.length);
    expect(reloaded.getProductById(target.id)?.channels).toHaveLength(1);
    expect(reloaded.getProductById(target.id)?.status).toBe('draft');
  });
  it('persists unchanged status and completed mapping decisions on reload', async () => {
    confirm();
    vi.resetModules();
    const reloaded = await import('./product-store');
    expect(reloaded.getProductById(source.id)).toMatchObject({ status: 'review', listing_review_migrated: true, import_issues: [] });
    expect(legacyListingReviews([reloaded.getProductById(source.id)!], [])).toHaveLength(0);
  });
});
