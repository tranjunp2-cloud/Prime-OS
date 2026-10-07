// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readyMasterFields } from '@/test/fixtures/listing-master';
import { addProduct, deleteProduct, getProductById, getProducts, updateProduct, type Product } from './product-store';
import { getCatalogImportItems, saveCatalogImportItems, type CatalogImportItem } from './catalog-import-store';
import { confirmListingIntake, pendingListingReviews, pendingMappingReviews, snapshotListingMatch, snapshotListingSource } from './product-listing-intake';
import { createEmptyListingCatalog } from './listing-intake-catalog';
import { completionFields } from './listing-master-completion';
import { prepareReviewVariants, resolvedReviewMappings } from './listing-review-progress';
import { getProductCatalogSettings } from './product-catalog-settings-store';
import { listingMasterSync, masterSyncPlan, masterSyncSnapshot, saveListingMasterSync } from './listing-master-sync';

let original: CatalogImportItem[];
let originalIds: Set<string>;
let master: Product;
let source: CatalogImportItem;
beforeEach(() => {
  original = getCatalogImportItems({ requireConfirmation: true });
  originalIds = new Set(getProducts().map(product => product.id));
  const attribute = getProductCatalogSettings().attributes.find(item => item.status === 'Active' && ['Single select', 'Multi-select'].includes(item.type) && item.options.split(',').length >= 3)!;
  master = { ...getProducts()[0], ...readyMasterFields(), id: `progress-master-${crypto.randomUUID()}`, sku_code: 'PROGRESS-MASTER', has_variants: false, product_type: 'single', status: 'published', import_result: undefined, import_sources: [], channels: [], channel_overrides: {}, inventory: { wh_crjp: 27 }, skus: [] };
  addProduct(master);
  source = { id: 'progress-source', channel: 'shopee', storeName: 'Progress shop', title: 'Same product on another shop', channelSku: 'PROGRESS-SHOP', listingId: 'progress-listing', variants: 3,
    variantItems: attribute.options.split(',').slice(0, 3).map((label, index) => ({ sku: `PROGRESS-CHILD-${index}`, label: label.trim(), price: { amount: 100 + index, currency: 'JPY' }, stock: 90 })),
    image: '/progress.jpg', description: master.description, channelCategory: 'Shop-specific taxonomy', price: 100, currency: 'JPY', channelStock: 270, status: 'suggested', resolution: 'later', confidence: 80, suggestedProductId: master.id };
  saveCatalogImportItems([source]);
});
afterEach(() => {
  vi.restoreAllMocks();
  getProducts().filter(product => !originalIds.has(product.id)).forEach(product => deleteProduct(product.id));
  saveCatalogImportItems(original);
});

describe('Deferred listing review', () => {
  it('links 3 source SKUs to an Active single Master without pretending mappings are confirmed', () => {
    const other = { channel: 'website' as const, external_id: 'unrelated', status: 'active' as const, listing_url: null, last_synced_at: null, master_data_sync: { enabled: true, fields: ['content' as const], updated_at: 'before' } };
    updateProduct(master.id, { id: master.id, channels: [other] });
    const before = structuredClone(getProductById(master.id)!);
    confirmListingIntake([source.id], { productId: master.id, defer: true, reviewed: [snapshotListingMatch(source, before)] });
    const after = getProductById(master.id)!;
    expect(after.status).toBe('published');
    expect(after.has_variants).toBe(false);
    expect(after.inventory).toEqual(before.inventory);
    expect(after.channels[0]).toEqual(other);
    expect(after.channels[1].variant_mappings).toBeUndefined();
    expect(after.channels[1].review_pending).toMatchObject({ sku_mapping_pending: true, issues: ['3 SKUs need mapping'] });
    expect(pendingListingReviews()).toHaveLength(0);
    expect(pendingMappingReviews([after])).toHaveLength(1);
    expect(listingMasterSync(after.channels[1]).enabled).toBe(false);
    expect(listingMasterSync(other).enabled).toBe(true);
    const preference = { enabled: true, fields: ['price' as const], pricing: { currency: 'JPY' } };
    expect(masterSyncPlan(after, after.channels[1], preference).error).toContain('variant-SKU');
    expect(() => saveListingMasterSync(after.id, after.channels[1], preference, masterSyncSnapshot(after))).toThrow(/variant-SKU/);
    expect(masterSyncPlan(after, after.channels[1], { enabled: true, fields: ['content'] }).error).toBeUndefined();
  });
  it('keeps partial mappings and proposed Master edits separate until explicit confirmation', () => {
    const draft = prepareReviewVariants(master, [source]);
    const mappings = resolvedReviewMappings([source], draft, {});
    mappings[source.id][1].master_sku_id = '';
    confirmListingIntake([source.id], { productId: master.id, defer: true, completion: completionFields(draft), variantMappings: mappings, reviewed: [snapshotListingMatch(source, getProductById(master.id)!)] });
    const saved = getProductById(master.id)!;
    expect(saved.skus).toEqual([]);
    expect(saved.channels[0].review_pending?.draft_mappings?.[1].master_sku_id).toBe('');
    expect(saved.channels[0].review_pending?.master_draft?.skus).toHaveLength(3);
    expect(saved.channels[0].variant_mappings).toBeUndefined();
    const resumed = pendingMappingReviews([saved])[0];
    const completeMappings = resolvedReviewMappings([resumed], draft, {});
    confirmListingIntake([resumed.id], { productId: saved.id, completion: completionFields(draft), variantMappings: completeMappings, reviewed: [snapshotListingMatch(resumed, saved)] });
    const after = getProductById(master.id)!;
    expect(after.status).toBe('published');
    expect(after.has_variants).toBe(true);
    expect(after.skus).toHaveLength(3);
    expect(after.skus.every(sku => !sku.stock_by_location && sku.stock === undefined)).toBe(true);
    expect(after.inventory).toEqual(master.inventory);
    expect(after.channels[0].review_pending).toBeUndefined();
    expect(after.channels[0].variant_mappings).toHaveLength(3);
    expect(pendingMappingReviews([after])).toHaveLength(0);
    expect(listingMasterSync(after.channels[0]).enabled).toBe(false);
  });
  it('saves a new incomplete Draft in the no-products preview and resumes without duplicating the Master', () => {
    const single = { ...source, variants: 1, variantItems: undefined, image: '', description: '' };
    const catalog = createEmptyListingCatalog([single]);
    const item = catalog.listings()[0];
    const result = confirmListingIntake([item.id], { name: item.title, sku: 'PROGRESS-NEW-DRAFT', sourceId: item.id, defer: true, reviewedSources: [snapshotListingSource(item)] }, catalog);
    const draft = catalog.products()[0];
    expect(draft.status).toBe('draft');
    expect(draft.import_activation_paused).toBe(true);
    expect(draft.channels[0].review_pending?.issues.join(' ')).toContain('description');
    const resumed = pendingMappingReviews(catalog.products(), catalog.listings())[0];
    confirmListingIntake([resumed.id], { productId: result.productId, completion: readyMasterFields(), activate: true, reviewed: [snapshotListingMatch(resumed, draft)] }, catalog);
    expect(catalog.products()).toHaveLength(1);
    expect(catalog.products()[0].status).toBe('published');
    expect(catalog.products()[0].channels).toHaveLength(1);
    expect(catalog.products()[0].channels[0].review_pending).toBeUndefined();
    expect(getProducts().some(product => product.id === result.productId)).toBe(false);
  });
  it('does not invent child SKUs when only a count is available', () => {
    const draft = prepareReviewVariants(master, [{ ...source, variantItems: undefined }]);
    expect(draft.has_variants).toBe(true);
    expect(draft.skus).toEqual([]);
  });
  it('does not silently re-enable previously configured price and stock sync after a pending mapping is resolved', () => {
    confirmListingIntake([source.id], { productId: master.id, defer: true });
    const linked = getProductById(master.id)!;
    updateProduct(master.id, { id: master.id, channels: linked.channels.map(link => ({ ...link, master_data_sync: { enabled: true, fields: ['content', 'price', 'inventory'], updated_at: 'before' } })) });
    const before = getProductById(master.id)!;
    const review = pendingMappingReviews([before])[0];
    confirmListingIntake([review.id], { productId: master.id, defer: true, reviewed: [snapshotListingMatch(review, before)] });
    const pending = getProductById(master.id)!;
    expect(pending.channels[0].master_data_sync?.fields).toEqual(['content']);
    const next = pendingMappingReviews([pending])[0];
    const draft = prepareReviewVariants(pending, [next]);
    confirmListingIntake([next.id], { productId: master.id, completion: completionFields(draft), variantMappings: resolvedReviewMappings([next], draft, {}), reviewed: [snapshotListingMatch(next, pending)] });
    const resolved = getProductById(master.id)!;
    expect(resolved.channels[0].review_pending).toBeUndefined();
    expect(listingMasterSync(resolved.channels[0])).toMatchObject({ enabled: true, fields: ['content'] });
  });
  it('rejects stale snapshots and failed persistence even when saving for later', () => {
    const reviewed = [snapshotListingMatch(source, getProductById(master.id)!)];
    saveCatalogImportItems([{ ...source, title: 'Changed source' }]);
    expect(() => confirmListingIntake([source.id], { productId: master.id, defer: true, reviewed })).toThrow(/changed during review/);
    saveCatalogImportItems([source]);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage full'); });
    expect(() => confirmListingIntake([source.id], { productId: master.id, defer: true, reviewed })).toThrow('Storage full');
    expect(getProductById(master.id)?.channels).toEqual([]);
  });
  it('persists deferred links, SKU source data and recovery actions after a reload without imports', async () => {
    confirmListingIntake([source.id], { productId: master.id, defer: true });
    saveCatalogImportItems([]);
    vi.resetModules();
    const reloaded = await import('./product-store');
    const product = reloaded.getProductById(master.id)!;
    const resumed = pendingMappingReviews([product], [])[0];
    expect(resumed.variantItems).toEqual(source.variantItems);
    expect(resumed.existingLinkReview?.issues).toContain('3 SKUs need mapping');
    expect(product.status).toBe('published');
    expect(product.channels[0].review_pending?.sku_mapping_pending).toBe(true);
  });
});
