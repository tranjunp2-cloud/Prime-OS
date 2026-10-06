// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { availableListingDestinations, createChannelListingDrafts, freshChannelListingDrafts } from './channel-listing-creation';
import { addProduct, deleteProduct, getProductById, getProducts, updateProduct, type ChannelListing, type Product } from './product-store';
import { confirmedPricing, quoteListingPrice } from './pricing-rules';
import { configuredListing } from './product-channel-listings';
import { listingEditableValues, listingEditSnapshot, saveListingLocalDraft } from './listing-local-draft';
import { syncListingOverride } from './listing-master-sync';
import { unlinkListingFromMaster } from './listing-unlink';
import type { ListingDestinationKey } from './channel-listing-destinations';

let master: Product;
beforeEach(() => {
  master = { ...getProducts()[0], id: 'creation-test-' + crypto.randomUUID(), status: 'draft', record_version: 1,
    channels: [], channel_overrides: {}, import_sources: [], activity: [], retail_price: 4200, price_currency: 'JPY' };
  addProduct(master);
});
afterEach(() => { vi.restoreAllMocks(); deleteProduct(master.id); });
function ready(key: ListingDestinationKey) {
  const draft = { ...freshChannelListingDrafts(master)[key], listing_sku: 'NEW-' + key,
    pricing_source: 'manual' as const, manual_price: '42', stock_quantity: '12' };
  return { ...draft, ...confirmedPricing(draft, quoteListingPrice(master.retail_price, master.price_currency, draft)) };
}
function existing(shop = 'Prime Beauty US'): ChannelListing {
  return { channel: 'amazon', store_name: shop, external_id: 'ASIN-EXISTING', shop_sku: 'US-SKU',
    status: 'active', listing_url: 'https://example.com/existing', last_synced_at: '2026-09-20T00:00:00Z',
    master_data_sync: { enabled: true, fields: ['content', 'media'], updated_at: '2026-09-20T00:00:00Z' } };
}
describe('creation-only listing flow', () => {
  it('matches the exact shop, not just the marketplace or a suggested import', () => {
    master.channels = [existing()];
    expect(availableListingDestinations(master).map(shop => shop.key)).toContain('amazon');
    master.channels.push(existing('Prime Beauty Japan'));
    expect(availableListingDestinations(master).map(shop => shop.key)).not.toContain('amazon');
  });
  it('excludes legacy configured shops even when their records have no shop name', () => {
    master.channels = [{ ...existing(), store_name: undefined }];
    expect(availableListingDestinations(master).map(shop => shop.key)).not.toContain('amazon');
    master.channels = [];
    master.channel_overrides = { amazon: { enabled: true, title: 'Old', description: '', price_markup: 0 } };
    expect(availableListingDestinations(master).map(shop => shop.key)).not.toContain('amazon');
  });
  it('builds a fresh draft without copying a different shop’s saved values or selection', () => {
    master.channel_overrides = { amazon: { enabled: true, title: 'US listing title', description: 'US text', price_markup: 22,
      listing_sku: 'US-SKU', pricing_shop_label: 'Prime Beauty US', channel_currency: 'USD', channel_price: 99 } };
    const draft = freshChannelListingDrafts(master).amazon;
    expect(draft).toMatchObject({ enabled: false, title: master.name, listing_sku: '', channel_currency: 'JPY', pricing_shop_label: 'Prime Beauty Japan' });
    expect(draft.channel_price).toBeUndefined();
  });
  it('appends only selected shops while preserving every existing listing, override and Master value', () => {
    const old = existing();
    const override = { enabled: true, title: 'US-specific title', description: 'US', price_markup: 0, pricing_shop_label: 'Prime Beauty US', listing_sku: 'US-SKU' };
    updateProduct(master.id, { id: master.id, channels: [old], channel_overrides: { amazon: override } });
    const before = getProductById(master.id)!;
    const [created] = createChannelListingDrafts(master.id, { amazon: ready('amazon') }, 1);
    const after = getProductById(master.id)!;
    expect(after.channels).toEqual([old, created]);
    expect(after.channel_overrides).toEqual(before.channel_overrides);
    for (const key of ['name', 'description', 'images', 'inventory', 'status', 'retail_price', 'skus', 'import_sources'] as const) expect(after[key]).toEqual(before[key]);
    expect(created).toMatchObject({ store_name: 'Prime Beauty Japan', external_id: null, status: 'draft',
      last_synced_at: null, master_data_sync: { enabled: false, fields: [] }, local_draft: { values: { price: { amount: 42, currency: 'JPY' }, stock: 12 } } });
    expect(created.shop_snapshot).toBeUndefined();
    expect(availableListingDestinations(after).map(shop => shop.key)).not.toContain('amazon');
    expect(configuredListing(after.channels, 'amazon', 'US-SKU')).toEqual(old);
    expect(syncListingOverride(after, created)?.pricing_shop_label).toBe('Prime Beauty Japan');
    expect(listingEditableValues(after, created).images).toEqual(master.images);
  });
  it('rejects empty, occupied, unavailable and stale submissions without writes', () => {
    const before = getProductById(master.id);
    expect(() => createChannelListingDrafts(master.id, {}, 1)).toThrow('Choose');
    expect(() => createChannelListingDrafts(master.id, { tiktok: ready('tiktok') }, 1)).toThrow('unavailable');
    expect(() => createChannelListingDrafts(master.id, { amazon: ready('amazon') }, 0)).toThrow('changed');
    expect(getProductById(master.id)).toEqual(before);
    createChannelListingDrafts(master.id, { amazon: ready('amazon') }, 1);
    const saved = getProductById(master.id);
    expect(() => createChannelListingDrafts(master.id, { amazon: ready('amazon'), pos: ready('pos') }, 2)).toThrow('already has');
    expect(getProductById(master.id)).toEqual(saved);
  });
  it('does not report success or expose partial state when storage fails', () => {
    const before = getProductById(master.id);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage full'); });
    expect(() => createChannelListingDrafts(master.id, { pos: ready('pos'), amazon: ready('amazon') }, 1)).toThrow('Storage full');
    expect(getProductById(master.id)).toEqual(before);
  });
  it('keeps the existing shop safe when a new sibling draft is edited or unlinked', () => {
    updateProduct(master.id, { id: master.id, channels: [existing()], channel_overrides: { amazon: { enabled: true, title: 'US title', description: '', price_markup: 0, pricing_shop_label: 'Prime Beauty US', listing_sku: 'US-SKU' } } });
    const before = getProductById(master.id)!;
    const [created] = createChannelListingDrafts(master.id, { amazon: ready('amazon') }, 1);
    const saved = getProductById(master.id)!;
    saveListingLocalDraft(master.id, created, { title: 'Japan-only edit' }, listingEditSnapshot(saved, created));
    const edited = getProductById(master.id)!;
    const editedListing = edited.channels.find(listing => listing.store_name === 'Prime Beauty Japan')!;
    expect(listingEditableValues(edited, editedListing).title).toBe('Japan-only edit');
    expect(edited.channels[0]).toEqual(before.channels[0]);
    expect(edited.channel_overrides).toEqual(before.channel_overrides);
    unlinkListingFromMaster(master.id, editedListing, listingEditSnapshot(edited, editedListing));
    expect(getProductById(master.id)!.channels).toEqual(before.channels);
    expect(getProductById(master.id)!.channel_overrides).toEqual(before.channel_overrides);
  });
});
