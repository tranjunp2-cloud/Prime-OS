// @vitest-environment jsdom
import { readyMasterFields } from '@/test/fixtures/listing-master';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { confirmListingIntake, pendingShopListings, snapshotListingMatch, snapshotListingSource, suggestedListingBrandId } from './product-listing-intake';
import { getCatalogImportItems, saveCatalogImportItems, type CatalogImportItem } from './catalog-import-store';
import { addProduct, deleteProduct, getProductById, getProducts, updateProduct, type Product } from './product-store';
import { getStoredMasterReadiness } from './product-master-readiness';
import { getChannelListingState } from './channel-listing-state';
import { getProductCatalogSettings, saveProductCatalogSettings, type ProductCatalogSettings } from './product-catalog-settings-store';
import { resolveListingShopData } from './listing-shop-data';

let originalItems: CatalogImportItem[];
let beforeIds: Set<string>;
let target: Product;
let items: CatalogImportItem[];
let settings: ProductCatalogSettings;
beforeEach(() => {
  settings = getProductCatalogSettings();
  originalItems = getCatalogImportItems({ requireConfirmation: true });
  beforeIds = new Set(getProducts().map(product => product.id));
  target = { ...getProducts()[0], ...readyMasterFields(), id: `intake-target-${crypto.randomUUID()}`, sku_code: `INTAKE-${crypto.randomUUID()}`, has_variants: false, product_type: 'single', skus: [], channels: [], channel_overrides: {}, status: 'draft', import_result: undefined, import_sources: [], inventory: { wh_crjp: 17 } };
  addProduct(target);
  items = ['a', 'b'].map((id, index) => ({ id, channel: 'shopee', storeName: `Test shop ${index}`, title: 'Test same product', channelSku: `SHOP-${id}`, listingId: 'same-id-in-different-shops', variants: 1, channelStock: 42, image: '', channelCategory: '', price: 123, currency: 'JPY', status: 'suggested', confidence: 99, suggestedProductId: 'prod_001', resolution: 'later' }));
  saveCatalogImportItems(items);
});
afterEach(() => {
  vi.restoreAllMocks();
  getProducts().filter(product => !beforeIds.has(product.id)).forEach(product => deleteProduct(product.id));
  saveCatalogImportItems(originalItems);
  saveProductCatalogSettings(settings);
});

describe('Explicit shop-listing intake', () => {
  it('does not link or create when merely reading high-confidence suggestions', () => {
    const count = getProducts().length;
    expect(pendingShopListings()).toHaveLength(2);
    expect(getProducts()).toHaveLength(count);
    expect(getCatalogImportItems({ requireConfirmation: true })[0].confirmed).not.toBe(true);
    expect(getProductById(target.id)?.channels).toEqual([]);
    expect(getProductById(target.id)?.status).toBe('draft');
  });
  it('links several shops to the chosen Master without overwriting Master data or enabling sync', () => {
    const before = structuredClone(getProductById(target.id)!);
    expect(confirmListingIntake(['a', 'b'], { productId: target.id })).toMatchObject({ productId: target.id, reviewSaved: true });
    const after = getProductById(target.id)!;
    expect(after.status).toBe(before.status);
    expect(after.channels).toHaveLength(2);
    expect(after.channels.map(listing => listing.store_name)).toEqual(['Test shop 0', 'Test shop 1']);
    for (const field of ['name', 'images', 'description', 'category', 'specifications', 'retail_price', 'inventory', 'channel_overrides'] as const) expect(after[field]).toEqual(before[field]);
    expect(after.channels[0]).toMatchObject({ shop_sku: 'SHOP-a', reported_stock: 42, shop_snapshot: { price: { amount: 123, currency: 'JPY' }, stock: 42, listing_id: items[0].listingId }, publication_unconfirmed: true, last_synced_at: null });
    expect(getChannelListingState(after, 'shopee').publication).toBe('unconfirmed');
    expect(pendingShopListings()).toEqual([]);
    expect(getCatalogImportItems()[0].resolvedProductId).toBe(target.id);
  });
  it('creates one complete Active Master from reviewed data without summing shop stock', () => {
    const { productId } = confirmListingIntake(['a', 'b'], { name: 'Grouped product', sku: 'INTAKE-GROUP-TEST', completion: readyMasterFields(), sourceId: 'b' });
    expect(getProductById(productId)).toMatchObject({ name: 'Reviewed product', status: 'published', inventory: {}, channel_overrides: {}, retail_price: 123 });
    expect(getProductById(productId)?.channels).toHaveLength(2);
    expect(getProductById(productId)?.skus).toEqual([]);
    expect(getStoredMasterReadiness(getProductById(productId)!).ready).toBe(true);
  });
  it.each(['draft', 'review', 'published'] as const)('preserves %s status without changing unrelated Masters', status => {
    updateProduct(target.id, { id: target.id, status, import_activation_paused: status !== 'published' });
    const unrelated = structuredClone(getProducts().filter(product => product.id !== target.id));
    confirmListingIntake(['a'], { productId: target.id });
    expect(getProductById(target.id)).toMatchObject({ status, import_activation_paused: status !== 'published' });
    expect(getProducts().filter(product => product.id !== target.id)).toEqual(unrelated);
  });
  it.each(['existing', 'new'] as const)('persists the correct lifecycle status for an %s Master after reload', async mode => {
    const result = confirmListingIntake(['a'], mode === 'existing' ? { productId: target.id } : { name: 'Persisted Active Master', sku: 'INTAKE-PERSISTED', completion: readyMasterFields(), sourceId: 'a' });
    saveCatalogImportItems([]);
    vi.resetModules();
    const reloaded = await import('./product-store');
    expect(reloaded.getProductById(result.productId)).toMatchObject({ status: mode === 'existing' ? 'draft' : 'published', listing_review_migrated: true });
    expect(reloaded.getProductById(result.productId)?.channels).toHaveLength(1);
    const saved = reloaded.getProductById(result.productId)!;
    expect(resolveListingShopData(saved, saved.channels[0], [])).toMatchObject({ price: { amount: 123, currency: 'JPY' }, stock: 42, title: items[0].title });
  });
  it('copies reviewed identity and chosen catalog references, with explicit original-currency pricing', () => {
    const category = settings.categories.find(item => item.status === 'Active')!;
    const brand = settings.brands.find(item => item.status === 'Active')!;
    const source = { ...items[0], brand: 'Raw shop brand', price: 34, currency: 'USD', gtin: '0012345', mpn: 'BRUSH-12', modelNumber: 'MODEL-2026', packQuantity: 12, prod_weight: 250 };
    saveCatalogImportItems([source]);
    const { productId } = confirmListingIntake(['a'], { name: source.title, sku: 'INTAKE-IDENTITY', completion: readyMasterFields({ categoryId: category.id, retail_price: 34, price_currency: 'USD' }), sourceId: 'a', productType: 'single', categoryId: category.id, brandId: brand.id, copySourcePrice: true, reviewedSources: [snapshotListingSource(source)] });
    expect(getProductById(productId)).toMatchObject({ categoryId: category.id, category: category.name, brandId: brand.id, brand: brand.name, product_type: 'single', has_variants: false, gtin: '0012345', mpn: 'BRUSH-12', model_number: 'MODEL-2026', pack_quantity: 12, prod_weight: 250, retail_price: 34, price_currency: 'USD', inventory: {}, status: 'published' });
    expect(getProductById(productId)?.import_sources?.[0]).toMatchObject({ brand: 'Raw shop brand', price: 34, currency: 'USD' });
    expect(getProductById(productId)?.channels[0].publication_unconfirmed).toBe(true);
  });
  it('does not infer identifiers or pack quantity from the title, or use raw shop taxonomy as a Master category', () => {
    saveCatalogImportItems([{ ...items[0], title: 'Brush 12 pieces', brand: 'Unknown uncatalogued brand', channelCategory: 'Shop art brushes', price: 34, currency: 'USD' }]);
    const { productId } = confirmListingIntake(['a'], { name: 'Brush 12 pieces', sku: 'INTAKE-MISSING', completion: readyMasterFields(), sourceId: 'a' });
    expect(getProductById(productId)).toMatchObject({ brand: '', gtin: '', mpn: '', model_number: '', retail_price: 123 });
    expect(getProductById(productId)?.pack_quantity).toBeUndefined();
  });
  it('suggests only an unambiguous active brand by name, code or alias and allows explicit unassignment', () => {
    const brand = { ...settings.brands[0], id: 'intake-brand', name: 'Canonical Brand', code: 'CB', aliases: ['Shop Brand'], status: 'Active' as const };
    saveProductCatalogSettings({ ...settings, brands: [brand] });
    const source = { ...items[0], brand: ' shop brand ' };
    expect(suggestedListingBrandId(source)).toBe(brand.id);
    expect(suggestedListingBrandId({ ...source, brand: 'cb' })).toBe(brand.id);
    saveCatalogImportItems([source]);
    const { productId } = confirmListingIntake(['a'], { name: source.title, sku: 'INTAKE-NO-BRAND', completion: readyMasterFields(), sourceId: 'a', brandId: '' });
    expect(getProductById(productId)?.brand).toBe('');
    saveProductCatalogSettings({ ...settings, brands: [brand, { ...brand, id: 'other-brand' }] });
    expect(suggestedListingBrandId(source)).toBe('');
    saveProductCatalogSettings({ ...settings, brands: [{ ...brand, status: 'Inactive' }] });
    expect(suggestedListingBrandId(source)).toBe('');
  });
  it.each(['category', 'brand'] as const)('rejects an unavailable %s before creating or linking', kind => {
    const beforeCount = getProducts().length;
    const entry = kind === 'category' ? settings.categories[0] : settings.brands[0];
    const changed = kind === 'category' ? { ...settings, categories: settings.categories.map(item => item.id === entry.id ? { ...item, status: 'Inactive' as const } : item) }
      : { ...settings, brands: settings.brands.map(item => item.id === entry.id ? { ...item, status: 'Inactive' as const } : item) };
    saveProductCatalogSettings(changed);
    for (const id of [entry.id, 'nonexistent-catalog-id']) {
      expect(() => confirmListingIntake(['a'], { name: 'Test product', sku: 'INTAKE-UNAVAILABLE', completion: readyMasterFields(), sourceId: 'a', [`${kind}Id`]: id })).toThrow(/no longer available/);
    }
    expect(getProducts()).toHaveLength(beforeCount);
    expect(getCatalogImportItems({ requireConfirmation: true })[0].confirmed).not.toBe(true);
  });
  it('rejects an invalid source price and allows a reviewed replacement', () => {
    saveCatalogImportItems([{ ...items[0], price: -12, currency: '' }]);
    expect(() => confirmListingIntake(['a'], { name: 'Test product', sku: 'INTAKE-PRICE', completion: readyMasterFields(), sourceId: 'a', copySourcePrice: true })).toThrow(/valid price and currency/);
    const { productId } = confirmListingIntake(['a'], { name: 'Test product', sku: 'INTAKE-PRICE', completion: readyMasterFields(), sourceId: 'a', copySourcePrice: false });
    expect(getProductById(productId)?.retail_price).toBe(123);
  });
  it('blocks creation if any source changes after the data preview was opened', () => {
    const reviewedSources = items.map(snapshotListingSource);
    const count = getProducts().length;
    saveCatalogImportItems([items[0], { ...items[1], price: 999 }]);
    expect(() => confirmListingIntake(['a', 'b'], { name: 'Test product', sku: 'INTAKE-STALE', completion: readyMasterFields(), sourceId: 'a', reviewedSources })).toThrow(/changed during review/);
    expect(getProducts()).toHaveLength(count);
    expect(getCatalogImportItems({ requireConfirmation: true }).every(item => !item.confirmed)).toBe(true);
  });
  it('requires all reviewed snapshots to still match before a manual confirmation writes anything', () => {
    const reviewed = items.map(item => snapshotListingMatch(item, getProductById(target.id)!));
    expect(() => confirmListingIntake(['a', 'b'], { productId: target.id, reviewed: [reviewed[0], reviewed[0]] })).toThrow(/changed during review/);
    saveCatalogImportItems([{ ...items[0], brand: 'Changed in source' }, items[1]]);
    expect(() => confirmListingIntake(['a', 'b'], { productId: target.id, reviewed })).toThrow(/changed during review/);
    expect(getProductById(target.id)?.channels).toEqual([]);
    expect(getCatalogImportItems({ requireConfirmation: true }).every(item => !item.confirmed)).toBe(true);
    saveCatalogImportItems(items);
    confirmListingIntake(['a', 'b'], { productId: target.id, reviewed });
    expect(getProductById(target.id)?.channels).toHaveLength(2);
  });
  it('rejects duplicate confirmation, stale exclusions, duplicate source identities and archived targets', () => {
    saveCatalogImportItems([{ ...items[0], status: 'ignored', resolution: 'ignore' }]);
    expect(() => confirmListingIntake(['a'], { productId: target.id })).toThrow(/excluded/);
    saveCatalogImportItems([items[0], { ...items[0], id: 'b' }]);
    expect(() => confirmListingIntake(['a', 'b'], { productId: target.id })).toThrow(/more than once/);
    saveCatalogImportItems(items);
    confirmListingIntake(['a'], { productId: target.id });
    expect(() => confirmListingIntake(['a'], { productId: target.id })).toThrow(/already linked/);
    const archived = { ...target, id: `${target.id}-archived`, status: 'archived' as const };
    addProduct(archived);
    expect(() => confirmListingIntake(['b'], { productId: archived.id })).toThrow(/Archived/);
  });
  it('requires variant-level matching rather than pretending different SKUs are identical', () => {
    saveCatalogImportItems([{ ...items[0], variants: 3 }, items[1]]);
    expect(() => confirmListingIntake(['a'], { productId: target.id })).toThrow(/variant-SKU/);
    expect(() => confirmListingIntake(['a'], { name: 'Variants', sku: 'VARIANT-INTAKE', completion: readyMasterFields(), sourceId: 'a', productType: 'single' })).toThrow(/multiple SKUs/);
    expect(() => confirmListingIntake(['a', 'b'], { name: 'Variants', sku: 'VARIANT-INTAKE', completion: readyMasterFields(), sourceId: 'a' })).toThrow(/separately/);
    expect(() => confirmListingIntake(['a'], { name: 'Variants', sku: 'VARIANT-INTAKE', completion: readyMasterFields(), sourceId: 'a' })).toThrow(/required details/);
  });
  it('does not mutate products or confirm when required persistence fails', () => {
    const before = structuredClone(getProducts());
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage full'); });
    expect(() => confirmListingIntake(['a'], { name: 'Not saved', sku: 'UNSAVED-INTAKE', completion: readyMasterFields(), sourceId: 'a' })).toThrow('Storage full');
    expect(() => confirmListingIntake(['a'], { productId: target.id })).toThrow('Storage full');
    expect(getProducts()).toEqual(before);
    expect(getCatalogImportItems({ requireConfirmation: true })[0].confirmed).not.toBe(true);
  });
  it('reports a failed secondary receipt honestly without duplicating the saved link', () => {
    const set = Storage.prototype.setItem;
    let writes = 0;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function(this: Storage, key, value) {
      if (++writes === 2) throw new Error('Receipt failed');
      return set.call(this, key, value);
    });
    const result = confirmListingIntake(['a'], { productId: target.id });
    expect(result.reviewSaved).toBe(false);
    expect(getProductById(target.id)?.status).toBe('draft');
    expect(getProductById(target.id)?.channels).toHaveLength(1);
    expect(pendingShopListings().map(item => item.id)).toEqual(['b']);
  });
});
