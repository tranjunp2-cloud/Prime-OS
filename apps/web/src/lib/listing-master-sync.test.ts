// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { addProduct, deleteProduct, getProductById, getProducts, updateProduct, type ChannelListing, type Product } from './product-store';
import { listingMasterSync, masterSyncSnapshot, masterSyncValidation, saveListingMasterSync, masterSyncPlan, initialMasterSyncPreference, syncsField, type MasterSyncPreference } from './listing-master-sync';
import { PRICING_STORAGE_KEY, savePricingRule } from './pricing-rules';

const listing: ChannelListing = { channel: 'lazada', external_id: 'listing-a', store_name: 'Shop A', shop_sku: 'SKU-A', status: 'active', listing_url: null, last_synced_at: '2026-10-01T00:00:00Z', reported_stock: 0 };
const id = 'master-sync-test';
function fixture(): Product {
  const product: Product = { ...getProducts()[0], id, status: 'draft', name: 'Saved Master name', images: ['/one.jpg'], import_activation_paused: true,
    channels: [listing, { ...listing, external_id: 'listing-b', shop_sku: 'SKU-B' }], channel_overrides: {} };
  addProduct(product);
  return getProductById(id)!;
}
afterEach(() => { vi.restoreAllMocks(); deleteProduct(id); localStorage.removeItem(PRICING_STORAGE_KEY); });

describe('Listing-owned Master data sync', () => {
  it('reviews independent values against Master and requires that review before resuming control', () => {
    fixture();
    updateProduct(id, { id, channels: [{ ...listing, master_data_sync: { enabled: false, fields: [], updated_at: '' }, local_draft: { values: { title: 'Independent title', description: 'Independent description', images: ['/independent.jpg'] }, updated_at: '' } }] });
    const before = getProductById(id)!, target = before.channels[0];
    const choice: MasterSyncPreference = { enabled: true, fields: ['content', 'media'] };
    const plan = masterSyncPlan(before, target, choice);
    expect(plan.groups[0].current).toContain('Independent title');
    expect(plan.groups[0].proposed).toContain(before.name);
    expect(() => saveListingMasterSync(id, target, choice, masterSyncSnapshot(before))).toThrow('Review the latest');
    saveListingMasterSync(id, target, choice, masterSyncSnapshot(before), plan.signature);
    const after = getProductById(id)!;
    expect(after.channels[0].master_data_sync).toMatchObject(choice);
    expect(after.channels[0].local_draft).toEqual(target.local_draft);
    expect(after.channels[0].last_synced_at).toEqual(target.last_synced_at);
    expect(after.activity?.at(-1)?.title).toBe('Master sync preference updated');
  });
  it('rejects an outdated review when local edits change even without a preference change', () => {
    const before = fixture(), choice: MasterSyncPreference = { enabled: true, fields: ['content'] };
    const plan = masterSyncPlan(before, before.channels[0], choice);
    updateProduct(id, { id, channels: [{ ...before.channels[0], local_draft: { values: { description: 'Changed elsewhere' }, updated_at: '' } }] });
    expect(() => saveListingMasterSync(id, before.channels[0], choice, masterSyncSnapshot(before), plan.signature)).toThrow('This listing changed');
    const current = getProductById(id)!;
    expect(() => saveListingMasterSync(id, current.channels[0], choice, masterSyncSnapshot(current), plan.signature)).toThrow('Review the latest');
  });
  it('does not infer sync from publication, timestamps or missing editor configuration', () => {
    expect(listingMasterSync(listing)).toEqual({ enabled: false, fields: [] });
    expect(listingMasterSync()).toEqual({ enabled: false, fields: [] });
  });
  it('preserves explicitly stored content preferences but ignores inventory-only policy', () => {
    const override = { enabled: true, title: '', description: '', price_markup: 0, listing_mode: 'master', media_scope: 'custom', sync_policy: 'automatic' };
    expect(listingMasterSync(listing, override)).toEqual({ enabled: true, fields: ['content'] });
    expect(listingMasterSync(listing, { ...override, listing_mode: 'manual' }).enabled).toBe(false);
    expect(listingMasterSync({ ...listing, publication_unconfirmed: true }, override).enabled).toBe(false);
    expect(listingMasterSync({ ...listing, master_data_sync: { enabled: false, fields: ['content'], updated_at: '' } }, override).enabled).toBe(false);
  });
  it('saves only the exact listing and preserves Master lifecycle, stock, price, links and sync receipt', () => {
    const before = fixture();
    saveListingMasterSync(id, before.channels[0], { enabled: true, fields: ['content', 'media'] }, masterSyncSnapshot(before));
    const after = getProductById(id)!;
    expect(after.channels[0]).toEqual({ ...before.channels[0], master_data_sync: { enabled: true, fields: ['content', 'media'], updated_at: expect.any(String) } });
    expect(after.channels[1]).toEqual(before.channels[1]);
    for (const field of ['status', 'name', 'description', 'images', 'inventory', 'skus', 'retail_price', 'channel_overrides'] as const) expect(after[field]).toEqual(before[field]);
    expect(after.activity?.at(-1)).toMatchObject({ scope: 'listing', kind: 'updated', title: 'Master sync preference updated' });
  });
  it('does not treat missing marketplace creation fields as a sync blocker', () => {
    const product = fixture();
    expect(masterSyncValidation(product, { enabled: true, fields: ['content', 'media'] })).toBeUndefined();
    expect(masterSyncValidation({ ...product, images: [] }, { enabled: true, fields: ['media'] })).toContain('at least one image');
    expect(masterSyncValidation({ ...product, images: [] }, { enabled: false, fields: ['media'] })).toBeUndefined();
    expect(masterSyncValidation(product, { enabled: true, fields: [] })).toContain('at least one data group');
  });
  it('does not update in-memory state when persistence fails', () => {
    const product = fixture();
    const before = JSON.stringify(product);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage full'); });
    expect(() => saveListingMasterSync(id, product.channels[0], { enabled: true, fields: ['media'] }, masterSyncSnapshot(product))).toThrow('Storage full');
    expect(JSON.stringify(getProductById(id))).toBe(before);
  });
  it('rejects changed Master data before enabling and allows turning off without revalidation', () => {
    const product = fixture();
    updateProduct(id, { id, name: 'Changed after preview' });
    expect(() => saveListingMasterSync(id, product.channels[0], { enabled: true, fields: ['content'] }, masterSyncSnapshot(product))).toThrow('Master data changed');
    expect(() => saveListingMasterSync(id, product.channels[0], { enabled: false, fields: [] }, masterSyncSnapshot(product))).not.toThrow();
  });
  it('rejects stale preferences, removed listings and ambiguous identity', () => {
    const product = fixture();
    saveListingMasterSync(id, product.channels[0], { enabled: true, fields: ['media'] }, masterSyncSnapshot(product));
    expect(() => saveListingMasterSync(id, product.channels[0], { enabled: false, fields: [] }, masterSyncSnapshot(product))).toThrow('This listing changed');
    updateProduct(id, { id, channels: [listing, { ...listing }] });
    expect(() => saveListingMasterSync(id, listing, { enabled: true, fields: ['media'] }, masterSyncSnapshot(product))).toThrow('This listing changed');
    updateProduct(id, { id, channels: [] });
    expect(() => saveListingMasterSync(id, listing, { enabled: true, fields: ['media'] }, masterSyncSnapshot(product))).toThrow('This listing changed');
  });
});

describe('Unified five-group sync policy', () => {
  function ready() {
    fixture();
    updateProduct(id, { id, product_type: 'single', has_variants: false, skus: [], inventory: { wh_crjp: 20 }, retail_price: 1000, price_currency: 'JPY', pkg_length: 10, pkg_width: 8, pkg_height: 2, pkg_weight: 100, country_of_origin: 'JP', hs_code: '1234', import_sources: [] });
    return getProductById(id)!;
  }
  const preference: MasterSyncPreference = { enabled: true, fields: ['content', 'media', 'price', 'inventory', 'shipping'], pricing: { currency: 'JPY' }, inventory: { warehouse_id: 'wh_crjp', safety_buffer: 3, allocation_cap: 12 } };
  it('requires reviewed values before saving all five groups and does not write shop or Master data', () => {
    const before = ready();
    const plan = masterSyncPlan(before, before.channels[0], preference);
    expect(plan.error).toBeUndefined();
    expect(plan.stockRows).toEqual([{ sku: 'SKU-A', quantity: 12 }]);
    expect(() => saveListingMasterSync(id, before.channels[0], preference, masterSyncSnapshot(before))).toThrow('Review the latest');
    saveListingMasterSync(id, before.channels[0], preference, masterSyncSnapshot(before), plan.signature);
    const after = getProductById(id)!;
    expect(after.channels[0].master_data_sync).toMatchObject(preference);
    expect(after.channels[0]).toEqual({ ...before.channels[0], master_data_sync: { ...preference, updated_at: expect.any(String) } });
    for (const field of ['status', 'images', 'inventory', 'retail_price', 'price_currency', 'skus', 'channel_overrides'] as const) expect(after[field]).toEqual(before[field]);
    expect(after.channels[1]).toEqual(before.channels[1]);
    expect(listingMasterSync(after.channels[0])).toEqual(preference);
  });
  it('off overrides every group and bypasses incomplete config without clearing shop values', () => {
    const before = ready();
    const off = { ...preference, enabled: false, inventory: undefined, pricing: undefined };
    expect(masterSyncPlan(before, listing, off).error).toBeUndefined();
    saveListingMasterSync(id, before.channels[0], off, 'stale-master-is-allowed-for-off');
    const saved = listingMasterSync(getProductById(id)!.channels[0], { enabled: true, title: '', description: '', price_markup: 0, listing_mode: 'master', media_scope: 'all', sync_policy: 'automatic' });
    for (const field of preference.fields) expect(syncsField(saved, field)).toBe(false);
    expect(getProductById(id)!.channels[0].reported_stock).toBe(0);
  });
  it('never opts imported links or old configurations into price or stock', () => {
    const master = ready();
    const initial = initialMasterSyncPreference(master, { ...listing, publication_unconfirmed: true }, { enabled: false, fields: [] });
    expect(initial.fields).toEqual([]);
    expect(initial.inventory?.warehouse_id).toBe('');
    expect(initial.enabled).toBe(false);
  });
  it('does not block content and images for missing price, stock or shipping', () => {
    const master = { ...ready(), inventory: {}, retail_price: 0, pkg_weight: 0 };
    expect(masterSyncPlan(master, listing, { enabled: true, fields: ['content', 'media'] }).error).toBeUndefined();
    expect(masterSyncPlan(master, listing, preference).error).toBeTruthy();
  });
  it('distinguishes unknown stock from zero and applies zero caps and large buffers safely', () => {
    const master = ready();
    const stockOnly = { ...preference, fields: ['inventory' as const] };
    expect(masterSyncPlan({ ...master, inventory: {} }, listing, stockOnly).error).toContain('Missing stock is not zero');
    expect(masterSyncPlan({ ...master, inventory: { wh_crjp: 0 } }, listing, stockOnly).stockRows[0].quantity).toBe(0);
    expect(masterSyncPlan(master, listing, { ...stockOnly, inventory: { warehouse_id: 'wh_crjp', safety_buffer: 50 } }).stockRows[0].quantity).toBe(0);
    expect(masterSyncPlan(master, listing, { ...stockOnly, inventory: { warehouse_id: 'wh_crjp', safety_buffer: 0, allocation_cap: 0 } }).stockRows[0].quantity).toBe(0);
  });
  it.each([-1, 0.5, NaN, Infinity])('rejects invalid buffer %s', safety_buffer => {
    expect(masterSyncPlan(ready(), listing, { ...preference, fields: ['inventory'], inventory: { warehouse_id: 'wh_crjp', safety_buffer } }).error).toContain('whole numbers');
  });
  it('excludes external fulfillment and non-existent warehouses', () => {
    const master = ready();
    const amazon = { ...listing, channel: 'amazon' as const };
    const fba = { ...master, channels: [amazon], channel_overrides: { amazon: { enabled: true, title: '', description: '', price_markup: 0, fulfillment: 'FBA' } } };
    expect(masterSyncPlan(fba, amazon, { ...preference, fields: ['inventory'] }).error).toContain('Amazon FBA');
    expect(masterSyncPlan(fba, amazon, { ...preference, fields: ['inventory'], inventory: { ...preference.inventory!, fulfillment: 'FBM' } }).error).toContain('Amazon FBA');
    expect(masterSyncPlan({ ...master, channels: [amazon] }, amazon, { ...preference, fields: ['inventory'] }).error).toContain('Confirm Amazon fulfillment');
    expect(masterSyncPlan({ ...master, channels: [amazon] }, amazon, { ...preference, fields: ['inventory'], inventory: { ...preference.inventory!, fulfillment: 'FBM' } }).error).toBeUndefined();
    expect(masterSyncPlan(master, listing, { ...preference, fields: ['inventory'], inventory: { warehouse_id: 'missing', safety_buffer: 0 } }).error).toContain('Choose an active');
  });
  it('requires exact variant mappings and computes separate SKU values', () => {
    const master = { ...ready(), product_type: 'variant' as const, has_variants: true, skus: [{ id: 'one', sku_code: 'MASTER-ONE', variation_name: 'One', price: 500, stock_by_location: { wh_crjp: 4 }, status: 'active' as const, weight_g: 1, units_per_carton: 1 }, { id: 'two', sku_code: 'MASTER-TWO', variation_name: 'Two', price: 800, stock_by_location: { wh_crjp: 8 }, status: 'active' as const, weight_g: 1, units_per_carton: 1 }] };
    expect(masterSyncPlan(master, listing, preference).error).toContain('variant-SKU');
    const mapped = { ...listing, variant_mappings: [{ shop_sku: 'SHOP-ONE', master_sku_id: 'one' }, { shop_sku: 'SHOP-TWO', master_sku_id: 'two' }] };
    const plan = masterSyncPlan(master, mapped, preference);
    expect(plan.error).toBeUndefined();
    expect(plan.stockRows).toEqual([{ sku: 'SHOP-ONE', quantity: 1 }, { sku: 'SHOP-TWO', quantity: 5 }]);
    expect(plan.groups.find(group => group.field === 'price')?.proposed).toEqual(['SHOP-ONE: 500 JPY', 'SHOP-TWO: 800 JPY']);
  });
  it('blocks unsupported shipping groups and incomplete packaging', () => {
    const master = ready();
    expect(masterSyncPlan(master, { ...listing, channel: 'pos' }, { ...preference, fields: ['shipping'] }).error).toContain('does not use shipping');
    expect(masterSyncPlan({ ...master, pkg_weight: 0 }, listing, { ...preference, fields: ['shipping'] }).error).toContain('dimensions and weight');
  });
  it('rejects changed stock since the preview', () => {
    const master = ready();
    const plan = masterSyncPlan(master, master.channels[0], preference);
    updateProduct(id, { id, inventory: { wh_crjp: 99 } });
    expect(() => saveListingMasterSync(id, master.channels[0], preference, masterSyncSnapshot(master), plan.signature)).toThrow('Master data changed');
  });
  it('calculates cross-currency only from an explicit rule and invalidates changed rules', () => {
    const master = ready();
    const rule = { id: 'sync-fx', name: 'JPY to USD', code: 'FX', baseCurrency: 'JPY', targetCurrency: 'USD', fxRate: 0.01, fxValidityHours: 0, adjustmentPct: 0, marketplaceFeePct: 0, taxPct: 0, roundingIncrement: 0, minPrice: 0, maxPrice: 0, enabled: true, version: 1, rateUpdatedAt: new Date().toISOString() };
    const chosen = { ...preference, fields: ['price' as const], pricing: { currency: 'USD', rule_id: rule.id } };
    expect(masterSyncPlan(master, listing, chosen).error).toContain('unavailable');
    savePricingRule(rule);
    const plan = masterSyncPlan(master, listing, chosen);
    expect(plan.error).toBeUndefined();
    expect(plan.groups.find(group => group.field === 'price')?.proposed).toEqual(['10 USD']);
    savePricingRule({ ...rule, fxRate: 0.02 });
    expect(() => saveListingMasterSync(id, master.channels[0], chosen, masterSyncSnapshot(master), plan.signature)).toThrow('Review the latest');
  });
});
