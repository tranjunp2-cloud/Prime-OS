// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { getProducts, type Product } from './product-store';
import { getProductCatalogSettings, saveProductCatalogSettings } from './product-catalog-settings-store';
import { getCatalogImportItems, saveCatalogImportItems } from './catalog-import-store';
import { getMasterReadinessChecks, getStoredMasterReadiness, hydrateExistingVariants } from './product-master-readiness';
import { isImportedMaster, isMasterReadyToPublish, matchesCatalogView, matchesTodoFilter } from './product-catalog-views';

let product: Product;
beforeEach(() => {
  localStorage.clear();
  const settings = getProductCatalogSettings();
  const category = { ...settings.categories[0], id: 'readiness-category', name: 'Readiness category', parentId: null, status: 'Active' as const, attributes: [] };
  saveProductCatalogSettings({ ...settings, categories: [...settings.categories, category] });
  product = { ...getProducts()[0], id: 'readiness-fixture', name: 'Complete Master', sku_code: 'COMPLETE-MASTER',
    category: category.name, categoryId: category.id, status: 'draft', has_variants: false, product_type: 'single',
    images: ['/one.jpg', '/two.jpg', '/three.jpg'], description: 'Complete product description for the catalog. '.repeat(5),
    retail_price: 1000, inventory: { wh_crjp: 50 }, skus: [], variant_options: [], specifications: [],
    channels: [], channel_overrides: {}, pkg_length: 0, pkg_width: 0, pkg_height: 0, pkg_weight: 0,
    import_result: undefined, import_source: undefined, import_sources: [], import_issues: [] };
});

describe('Catalog lifecycle views', () => {
  it.each(['draft', 'review', 'published', 'archived'] as const)('separates lifecycle from readiness and listing status for %s', status => {
    const record = { ...product, status };
    expect(matchesCatalogView(record, 'all', false)).toBe(true);
    expect(matchesCatalogView(record, 'todo', false)).toBe(['draft', 'review'].includes(status));
    expect(matchesCatalogView(record, 'active', false)).toBe(status === 'published');
    expect(matchesCatalogView(record, 'archived', false)).toBe(status === 'archived');
    expect(matchesCatalogView(record, 'todo', true)).toBe(true);
    expect(matchesTodoFilter(record, 'issues', true)).toBe(true);
    expect(matchesTodoFilter(record, 'issues', false)).toBe(false);
    expect(matchesTodoFilter(record, 'drafts', true)).toBe(['draft', 'review'].includes(status));
    expect(matchesTodoFilter(record, 'all', false)).toBe(['draft', 'review'].includes(status));
  });

  it('unions issues and drafts without double-counting or changing lifecycle', () => {
    const records = [
      { product, issue: false },
      { product: { ...product, id: 'draft-issue' }, issue: true },
      { product: { ...product, id: 'active-issue', status: 'published' as const }, issue: true },
      { product: { ...product, id: 'active-ok', status: 'published' as const }, issue: false },
    ];
    const before = JSON.stringify(records);
    const todo = records.filter(record => matchesCatalogView(record.product, 'todo', record.issue));
    expect(todo.map(record => record.product.id)).toEqual([product.id, 'draft-issue', 'active-issue']);
    expect(todo.filter(record => matchesTodoFilter(record.product, 'issues', record.issue))).toHaveLength(2);
    expect(todo.filter(record => matchesTodoFilter(record.product, 'drafts', record.issue))).toHaveLength(2);
    expect(JSON.stringify(records)).toBe(before);
  });

  it('requires an unpublished, complete and reviewed Master for Ready to publish', () => {
    expect(isMasterReadyToPublish(product)).toBe(true);
    expect(isMasterReadyToPublish({ ...product, status: 'published' })).toBe(false);
    expect(isMasterReadyToPublish({ ...product, status: 'review' })).toBe(false);
    expect(isMasterReadyToPublish({ ...product, status: 'archived' })).toBe(false);
    expect(isMasterReadyToPublish({ ...product, import_result: 'needs_review' })).toBe(false);
    expect(isMasterReadyToPublish({ ...product, import_result: 'ready', images: ['/one.jpg'] })).toBe(false);
  });

  it('does not classify a manually-published Master as imported', () => {
    expect(isImportedMaster(product)).toBe(false);
    expect(isImportedMaster({ ...product, status: 'published', import_result: 'published' })).toBe(false);
    expect(isImportedMaster({ ...product, import_source: 'Shopee · Shop A' })).toBe(true);
    expect(isImportedMaster({ ...product, import_result: 'matched' })).toBe(true);
    expect(isImportedMaster({ ...product, import_sources: [{ channel: 'lazada', store: 'Shop B', brand: '', price: 1, currency: 'JPY' }] })).toBe(true);
  });

  it('recognizes resolved listing imports without requiring a legacy source string', () => {
    const imported = { ...getCatalogImportItems()[0], id: 'readiness-import', resolvedProductId: product.id, resolution: 'create' as const };
    saveCatalogImportItems([imported]);
    expect(isImportedMaster(product)).toBe(true);
    saveCatalogImportItems([{ ...imported, resolution: 'later' }]);
    expect(isImportedMaster(product)).toBe(false);
  });
});

describe('Shared Master readiness', () => {
  it('uses the editor checklist for stored data without requiring a channel listing', () => {
    const variants = hydrateExistingVariants(product);
    const editor = getMasterReadinessChecks({ ...product, specifications: [], variantGroups: variants.groups, variantItems: variants.items, shippingPackageRequired: false });
    expect(getStoredMasterReadiness(product).checks).toEqual(editor);
    expect(getStoredMasterReadiness(product).ready).toBe(true);
    expect(editor.some(check => check.id === 'channels')).toBe(false);
  });

  it('checks image count and visible description text, not stale import flags', () => {
    const incomplete = { ...product, import_result: 'ready' as const, images: ['/one.jpg'], description: '<p title="'.padEnd(150, 'x') + '">Short</p>' };
    expect(getStoredMasterReadiness(incomplete).checks.filter(check => !check.done).map(check => check.id)).toEqual(['media', 'content']);
  });

  it('requires an active category and its actual required attributes', () => {
    const settings = getProductCatalogSettings();
    const category = settings.categories.find(item => item.id === product.categoryId)!;
    saveProductCatalogSettings({ ...settings, categories: [{ ...category, attributes: [{ key: 'color', required: true }] }] });
    expect(getStoredMasterReadiness(product).missing).toContain('Complete required attributes: Color');
    const complete = { ...product, specifications: [{ attributeKey: 'color', name: 'Color', value: 'Blue' }] };
    expect(getStoredMasterReadiness(complete).ready).toBe(true);
    saveProductCatalogSettings({ ...settings, categories: [{ ...category, status: 'Inactive' }] });
    expect(getStoredMasterReadiness(complete).missing).toContain('Select an active product category');
  });

  it('checks shipping only for enabled online channels, respecting explicit disabled overrides', () => {
    const listing = { channel: 'shopee' as const, external_id: 'SHO-123', status: 'active' as const, listing_url: null, last_synced_at: null };
    expect(getStoredMasterReadiness({ ...product, channels: [listing] }).missing).toContain('Configure shipping package dimensions and weight');
    expect(getStoredMasterReadiness({ ...product, channels: [{ ...listing, channel: 'pos' }] }).ready).toBe(true);
    expect(getStoredMasterReadiness({ ...product, channels: [listing], channel_overrides: { shopee: { enabled: false, title: '', description: '', price_markup: 0 } } }).ready).toBe(true);
  });

  it('uses selected variant price, stock and valid option types', () => {
    const variant: Product = { ...product, has_variants: true, product_type: 'variant', retail_price: 0, inventory: {},
      variant_options: [{ attributeKey: 'color', name: 'Color', values: ['Blue'] }],
      skus: [{ id: 'blue', sku_code: 'BLUE-001', variation_name: 'Blue', price: 10, stock_by_location: { wh_crjp: 2 }, weight_g: 10, units_per_carton: 1, status: 'active' }] };
    expect(getStoredMasterReadiness(variant).ready).toBe(true);
    expect(getStoredMasterReadiness({ ...variant, skus: [{ ...variant.skus[0], price: 0 }] }).checks.find(check => check.id === 'price')?.done).toBe(false);
    expect(getStoredMasterReadiness({ ...variant, variant_options: [{ attributeKey: 'unknown', name: 'Unknown option', values: ['Blue'] }] }).checks.find(check => check.id === 'variants')?.done).toBe(false);
  });
});
