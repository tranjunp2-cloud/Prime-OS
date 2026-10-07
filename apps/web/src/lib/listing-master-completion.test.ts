// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readyMasterFields } from '@/test/fixtures/listing-master';
import { addProduct, deleteProduct, getProductById, getProducts, updateProduct, type Product } from './product-store';
import { getCatalogImportItems, saveCatalogImportItems, type CatalogImportItem } from './catalog-import-store';
import { applyMasterCompletion, assertMasterComplete, completionFields, prepareMasterCompletion, variantMappingError, type MasterCompletion } from './listing-master-completion';
import { confirmListingIntake, confirmSuggestedListingLinks, pendingShopListings, snapshotListingMatch } from './product-listing-intake';
import { getStoredMasterReadiness } from './product-master-readiness';
import { getProductCatalogSettings } from './product-catalog-settings-store';

let originals: Set<string>;
let imports: CatalogImportItem[];
let master: Product;
let source: CatalogImportItem;
beforeEach(() => {
  originals = new Set(getProducts().map(product => product.id));
  imports = getCatalogImportItems({ requireConfirmation: true });
  master = { ...getProducts()[0], ...readyMasterFields(), id: 'completion-master', sku_code: 'COMPLETION-MASTER',
    name: 'Seller-owned Master', brand: 'Reviewed Brand', has_variants: false, product_type: 'single',
    status: 'draft', channels: [], channel_overrides: {}, inventory: {}, import_result: undefined, import_issues: [] };
  addProduct(master);
  source = { id: 'completion-source', channel: 'amazon', listingId: 'completion-listing', storeName: 'Completion shop',
    title: 'Shop title', channelSku: master.sku_code, brand: master.brand, variants: 1, image: '', channelCategory: 'Raw shop category',
    price: 999, currency: 'USD', channelStock: 90, status: 'suggested', confidence: 99, resolution: 'later', suggestedProductId: master.id };
  saveCatalogImportItems([source]);
});
afterEach(() => {
  vi.restoreAllMocks();
  getProducts().filter(product => !originals.has(product.id)).forEach(product => deleteProduct(product.id));
  saveCatalogImportItems(imports);
});

describe('Complete and activate a Master in listing review', () => {
  it('blocks invented source SKUs when the imported variant data is absent or incomplete', () => {
    const skus = ['Red', 'Blue'].map((variation_name, index) => ({ id: `validation-${index}`, sku_code: `VALID-${index}`, variation_name, status: 'active' as const, weight_g: 0, units_per_carton: 1 }));
    const variantMaster = { ...master, has_variants: true, product_type: 'variant' as const, skus };
    const variantSource = { ...source, variants: 2 };
    const mappings = { [source.id]: skus.map(sku => ({ shop_sku: sku.sku_code, master_sku_id: sku.id })) };
    expect(variantMappingError([variantSource], variantMaster, mappings)).toMatch(/Listing SKU data is incomplete/);
    expect(variantMappingError([{ ...variantSource, variantItems: [{ sku: 'SHOP-RED', label: 'Red' }] }], variantMaster, mappings)).toMatch(/Listing SKU data is incomplete/);
    expect(variantMappingError([{ ...variantSource, variantItems: [{ sku: 'SHOP-RED', label: 'Red' }, { sku: 'SHOP-BLUE', label: 'Blue' }] }], variantMaster, mappings)).toMatch(/exact child SKUs/);
  });
  it('preserves existing data and cover, merges source galleries and fills only empty content/package fields', () => {
    const gallery = { ...source, image: '/listing.jpg', images: ['/listing.jpg', '/detail.jpg'], description: 'Source description', pkg_length: 25 };
    const candidate = prepareMasterCompletion({ ...master, images: ['/cover.jpg', '/detail.jpg'], pkg_length: 0 }, [gallery]);
    expect(candidate.images).toEqual(['/cover.jpg', '/detail.jpg', '/listing.jpg']);
    expect(candidate.pkg_length).toBe(25);
    expect(candidate.description).toBe(master.description);
    expect(candidate.retail_price).toBe(master.retail_price);
    expect(candidate.inventory).toEqual({});
    expect(candidate.sku_code).toBe(master.sku_code);
    expect(prepareMasterCompletion({ ...master, description: '' }, [gallery]).description).toBe('Source description');
    expect(master.images).not.toContain('/listing.jpg');
  });
  it('requires complete data only when creating a new Master', () => {
    updateProduct(master.id, { id: master.id, images: ['/same.jpg', '/same.jpg', '/same.jpg'], description: '' });
    const before = JSON.stringify(getProducts());
    expect(() => confirmListingIntake([source.id], { name: 'New incomplete Master', sku: 'NEW-INCOMPLETE', sourceId: source.id })).toThrow(/1 product image.*description/);
    expect(JSON.stringify(getProducts())).toBe(before);
    expect(pendingShopListings()).toHaveLength(1);
    expect(getProductById(master.id)?.status).toBe('draft');
  });
  it('links an incomplete Draft without editing its data, gallery or status', () => {
    updateProduct(master.id, { id: master.id, description: '', pkg_weight: 0 });
    const before = getProductById(master.id)!;
    const count = getProducts().length;
    const result = confirmListingIntake([source.id], { productId: master.id, reviewed: [snapshotListingMatch(source, before)] });
    const updated = getProductById(result.productId)!;
    expect(getProducts()).toHaveLength(count);
    expect(updated).toMatchObject({ id: master.id, sku_code: master.sku_code, status: 'draft', inventory: {}, pkg_weight: 0, description: '', images: before.images });
    expect(getStoredMasterReadiness(updated).ready).toBe(false);
    expect(updated.channels[0]).toMatchObject({ publication_unconfirmed: true, reported_stock: 90, last_synced_at: null });
  });
  it('does not accept stock, shop settings, status or SKU identity from completion patches', () => {
    const patch = { inventory: { injected: 90 }, sku_code: 'CHANGED', status: 'published', channel_overrides: { amazon: { enabled: true } } };
    const candidate = applyMasterCompletion(master, [source], patch as Partial<MasterCompletion>);
    expect(candidate).toMatchObject({ inventory: {}, sku_code: master.sku_code, status: 'draft', channel_overrides: {} });
  });
  it('does not overwrite fields changed elsewhere while the completion form was open', () => {
    const snapshot = snapshotListingMatch(source, getProductById(master.id)!);
    updateProduct(master.id, { id: master.id, pkg_weight: 250 });
    expect(() => confirmListingIntake([source.id], { productId: master.id, reviewed: [snapshot] })).toThrow(/changed during review/);
    expect(getProductById(master.id)).toMatchObject({ pkg_weight: 250, status: 'draft', channels: [] });
  });
  it('rolls back content, status and mapping together when storage fails', () => {
    const before = JSON.stringify(getProducts());
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw Error('Storage full'); });
    expect(() => confirmListingIntake([source.id], { productId: master.id })).toThrow('Storage full');
    expect(JSON.stringify(getProducts())).toBe(before);
    expect(pendingShopListings()).toHaveLength(1);
  });
  it('links incomplete bulk destinations without activating or completing them', () => {
    const second = { ...master, id: 'completion-second', sku_code: 'COMPLETION-SECOND', description: '' };
    addProduct(second);
    const secondSource = { ...source, id: 'second-source', listingId: 'second-listing', channelSku: second.sku_code, suggestedProductId: second.id };
    saveCatalogImportItems([source, secondSource]);
    const reviews = [snapshotListingMatch(source, getProductById(master.id)!), snapshotListingMatch(secondSource, getProductById(second.id)!)];
    confirmSuggestedListingLinks(reviews);
    expect(getProductById(second.id)?.description).toBe('');
    expect(getProductById(master.id)?.status).toBe('draft');
    expect(getProductById(second.id)?.status).toBe('draft');
  });
  it('preserves legacy duplicate identities but rejects new duplicate SKU codes', () => {
    addProduct({ ...master, id: 'legacy-duplicate' });
    expect(() => assertMasterComplete(master, [source])).not.toThrow();
    expect(() => assertMasterComplete({ ...master, id: 'new-duplicate' }, [source])).toThrow(/SKU already exists/);
  });
  it('creates an Active variant Master only with real child SKUs, valid prices/options and complete mappings', () => {
    const attribute = getProductCatalogSettings().attributes.find(item => item.status === 'Active'
      && ['Single select', 'Multi-select'].includes(item.type) && item.options.split(',').filter(Boolean).length >= 2)!;
    const values = attribute.options.split(',').slice(0, 2).map(value => value.trim());
    const childSkus = values.map((value, index) => ({ id: `child-${index}`, sku_code: `COMPLETION-CHILD-${index}`, variation_name: value,
      status: 'active' as const, price: 30, weight_g: 0, units_per_carton: 1, stock: 99, stock_by_location: { imported: 99 } }));
    const variantSource = { ...source, variants: 2, variantItems: values.map((label, index) => ({ sku: `SHOP-${index}`, label })) };
    saveCatalogImportItems([variantSource]);
    const completion = completionFields({ ...master, variant_options: [{ attributeKey: attribute.key, name: attribute.name, values }], skus: childSkus });
    const target = { name: 'Variant Master', sku: 'COMPLETE-VARIANTS', sourceId: source.id, productType: 'variant' as const, completion };
    expect(() => confirmListingIntake([source.id], target)).toThrow(/variant-SKU matching/);
    const mappings = { [source.id]: childSkus.map((sku, index) => ({ shop_sku: `SHOP-${index}`, master_sku_id: sku.id })) };
    const { productId } = confirmListingIntake([source.id], { ...target, variantMappings: mappings });
    const created = getProductById(productId)!;
    expect(created.status).toBe('published');
    expect(getStoredMasterReadiness(created).ready).toBe(true);
    expect(created.inventory).toEqual({});
    expect(created.skus.every(sku => sku.stock === undefined && sku.stock_by_location === undefined)).toBe(true);
    expect(created.channels[0].variant_mappings).toEqual(mappings[source.id]);
  });
});
