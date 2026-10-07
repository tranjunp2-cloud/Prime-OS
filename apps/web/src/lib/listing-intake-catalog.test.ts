// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createEmptyListingCatalog } from './listing-intake-catalog';
import { getCatalogImportItems, type CatalogImportItem } from './catalog-import-store';
import { getProducts } from './product-store';
import { confirmListingIntake, getListingSuggestion, pendingListingReviews, snapshotListingMatch } from './product-listing-intake';
import { completionFields, newListingMasterPreview } from './listing-master-completion';
import { resolveSourceSkuMappings } from './listing-sku-mapping';
import { readyMasterFields } from '@/test/fixtures/listing-master';

const source = (): CatalogImportItem => ({ ...getCatalogImportItems({ requireConfirmation: true }).find(item => item.variants === 1)!, id: 'first-source', listingId: 'FIRST-SOURCE', channelSku: 'SOURCE-ONE', title: 'Precision brush set', brand: 'Source brand', confirmed: false, status: 'unmatched', resolution: 'later', image: '/source.jpg', description: readyMasterFields().description });
describe('First-Master scoped catalog', () => {
  it('starts empty, ignores stale suggestions and persists create/link decisions only in this session', () => {
    const savedProducts = structuredClone(getProducts());
    const savedImports = getCatalogImportItems({ requireConfirmation: true });
    const beforeStorage = { ...localStorage };
    const first = { ...source(), suggestedProductId: savedProducts[0].id, resolvedProductId: savedProducts[0].id };
    const second = { ...first, id: 'second', channel: 'amazon' as const, listingId: 'SECOND', channelSku: 'OTHER-CODE', title: 'Brush precision set' };
    const catalog = createEmptyListingCatalog([first, second]);
    expect(catalog.products()).toEqual([]);
    expect(getListingSuggestion(catalog.listings()[0], catalog.products()).product).toBeUndefined();
    const created = confirmListingIntake([first.id], { sourceId: first.id, name: first.title, sku: savedProducts[0].sku_code, completion: readyMasterFields({ name: first.title }) }, catalog);
    const master = catalog.products()[0];
    expect(master.id).toBe(created.productId);
    expect(master.status).toBe('published');
    expect(pendingListingReviews(catalog.products(), catalog.listings())).toHaveLength(1);
    const pending = catalog.listings()[1];
    expect(getListingSuggestion(pending, catalog.products()).product?.id).toBe(master.id);
    confirmListingIntake([pending.id], { productId: master.id, reviewed: [snapshotListingMatch(pending, master)] }, catalog);
    expect(catalog.products()[0].channels).toHaveLength(2);
    expect(pendingListingReviews(catalog.products(), catalog.listings())).toEqual([]);
    expect(getProducts()).toEqual(savedProducts);
    expect(getCatalogImportItems({ requireConfirmation: true })).toEqual(savedImports);
    expect({ ...localStorage }).toEqual(beforeStorage);
  });
  it('keeps snapshots isolated from accidental caller mutation and rejects stale review', () => {
    const catalog = createEmptyListingCatalog([source()]);
    const copy = catalog.listings(); copy[0].title = 'Changed only outside';
    expect(catalog.listings()[0].title).not.toBe(copy[0].title);
    expect(() => confirmListingIntake([source().id], { sourceId: source().id, name: 'New Master', sku: 'NEW', reviewedSources: [{ itemId: source().id, signature: 'stale' }], completion: readyMasterFields() }, catalog)).toThrow(/changed during review/);
    expect(catalog.products()).toEqual([]);
  });
  it('prefills one source and maps two three-SKU listings to three Master SKUs, not six', () => {
    const fixtures = getCatalogImportItems({ requireConfirmation: true }).filter(item => ['imp-002', 'imp-011'].includes(item.id));
    const catalog = createEmptyListingCatalog(fixtures);
    const sources = catalog.listings();
    const chosen = sources.find(item => item.channel === 'shopee')!;
    const draft = { sourceId: chosen.id, name: chosen.title, sku: 'GROUPED-SKETCHBOOK', productType: 'variant' as const, copySourcePrice: true };
    const preview = newListingMasterPreview(chosen, draft);
    expect(preview.skus.map(sku => sku.sku_code)).toEqual(chosen.variantItems!.map(sku => sku.sku));
    expect(preview.skus.map(sku => sku.price)).toEqual([3800, 3400, 4800]);
    expect(preview.variant_options?.map(option => option.attributeKey)).toEqual(['binding_type', 'paper_size']);
    const completion = completionFields({ ...preview, ...readyMasterFields({ name: chosen.title, images: preview.images, skus: preview.skus, variant_options: preview.variant_options }) });
    const mappings = Object.fromEntries(sources.map(item => [item.id, resolveSourceSkuMappings(item, preview)]));
    expect(new Set(Object.values(mappings).flatMap(rows => rows.map(row => row.master_sku_id))).size).toBe(3);
    confirmListingIntake(sources.map(item => item.id), { ...draft, completion, variantMappings: mappings }, catalog);
    const master = catalog.products()[0];
    expect(master.skus).toHaveLength(3);
    expect(master.channels).toHaveLength(2);
    expect(master.channels.every(channel => channel.variant_mappings?.length === 3)).toBe(true);
    expect(master.inventory).toEqual({});
    expect(master.skus.every(sku => sku.stock === undefined && sku.stock_by_location === undefined)).toBe(true);
  });
  it('does not blend another listing’s images/content into the chosen source', () => {
    const first = source();
    const second = { ...first, id: 'other', listingId: 'OTHER', image: '/other.jpg', description: 'Other shop description' };
    const catalog = createEmptyListingCatalog([first, second]);
    confirmListingIntake([first.id, second.id], { sourceId: first.id, name: first.title, sku: 'CHOSEN-SOURCE', completion: { ...readyMasterFields(), images: [first.image], description: first.description! } }, catalog);
    expect(catalog.products()[0].images).toEqual([first.image]);
    expect(catalog.products()[0].description).toBe(first.description);
    expect(catalog.products()[0].channels[1].shop_snapshot?.images).toEqual([second.image]);
  });
  it('does not suggest ambiguous or identity-conflicting newly created Masters', () => {
    const first = source();
    const catalog = createEmptyListingCatalog([first]);
    confirmListingIntake([first.id], { sourceId: first.id, name: first.title, sku: 'FIRST', completion: readyMasterFields() }, catalog);
    const master = catalog.products()[0];
    const unlinked = { ...first, id: 'other', listingId: 'OTHER', suggestedProductId: undefined, confirmed: false };
    expect(getListingSuggestion(unlinked, [master, { ...master, id: 'duplicate' }]).product).toBeUndefined();
    expect(getListingSuggestion({ ...unlinked, gtin: 'OTHER-GTIN' }, [{ ...master, gtin: 'FIRST-GTIN' }]).product).toBeUndefined();
  });
});
