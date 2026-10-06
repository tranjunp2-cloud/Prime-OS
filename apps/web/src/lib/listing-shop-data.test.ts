import { describe, expect, it } from 'vitest';
import type { CatalogImportItem } from './catalog-import-store';
import type { ChannelListing, Product } from './product-store';
import { listingImportSource, recoverListingShopSnapshots, resolveListingShopData, snapshotShopListing } from './listing-shop-data';

const listing: ChannelListing = { channel: 'lazada', store_name: 'Shop A', external_id: 'provider-1', shop_sku: 'SKU-1', status: 'active', listing_url: null, last_synced_at: null };
const item: CatalogImportItem = { id: 'import-1', channel: 'lazada', storeName: 'Shop A', listingId: 'provider-1', channelSku: 'SKU-1', title: 'Shop title', image: '/one.jpg', images: ['/one.jpg', '/two.jpg'], description: 'Shop description', brand: 'Shop brand', variants: 1, channelStock: 0, channelCategory: 'Shop category', price: 25, currency: 'MYR', status: 'matched', confidence: 100, resolution: 'later', retrievedAt: '2026-10-01T12:00:00Z' };
const product = (channels = [listing], extra: Partial<Product> = {}) => ({ channels, channel_overrides: {}, import_sources: [], inventory: { warehouse: 999 }, retail_price: 888, price_currency: 'JPY', ...extra }) as Product;

describe('Listing-owned source snapshots', () => {
  it('retains the full source detail after the transient queue is removed', () => {
    const full = { ...item, pkg_length: 14, pkg_width: 10, pkg_height: 4, pkg_weight: 160, shipping: { country: 'JP' }, channelSettings: { condition: 'New' },
      variantItems: [{ sku: 'A', label: 'Small', price: { amount: 0, currency: 'MYR' }, stock: 0 }, { sku: 'B', label: 'Large' }], variants: 2,
      listingUrl: 'https://example.com/listing', gtin: '1234', mpn: 'MPN-A', modelNumber: 'Model A' };
    const saved = { ...listing, shop_snapshot: snapshotShopListing(full) };
    const details = resolveListingShopData(product([saved]), saved, []);
    expect(details).toMatchObject({ shipping: { length: 14, width: 10, height: 4, weight: 160, country: 'JP' }, channelSettings: { condition: 'New' },
      variants: full.variantItems, variantCount: 2, listingUrl: full.listingUrl, identifiers: { gtin: '1234', mpn: 'MPN-A', model: 'Model A' } });
    expect(details.variants?.[1].stock).toBeUndefined();
    expect(details.variants?.[1].price).toBeUndefined();
  });
  it('enriches old detail snapshots only from the same source revision, idempotently', () => {
    const old = snapshotShopListing(item);
    delete old.shipping; delete old.variant_count;
    const saved = { ...listing, shop_snapshot: old };
    const master = product([saved]);
    const full = { ...item, pkg_weight: 160 };
    const after = recoverListingShopSnapshots(master, [full]);
    expect(after.channels[0].shop_snapshot?.shipping).toEqual({ weight: 160 });
    expect(after.channels[0].shop_snapshot?.recorded_at).toBe(old.recorded_at);
    expect(recoverListingShopSnapshots(after, [full])).toBe(after);
    expect(recoverListingShopSnapshots(master, [{ ...full, retrievedAt: undefined }])).toBe(master);
    expect(recoverListingShopSnapshots(master, [{ ...full, retrievedAt: '2026-09-01T00:00:00Z' }])).toBe(master);
    expect(recoverListingShopSnapshots(master, [{ ...full, title: 'Different revision' }])).toBe(master);
  });
  it('records price, currency, zero stock, images and actual retrieval time without using save time', () => {
    const snapshot = snapshotShopListing(item, '2026-10-06T00:00:00Z');
    expect(snapshot).toMatchObject({ price: { amount: 25, currency: 'MYR' }, stock: 0, images: ['/one.jpg', '/two.jpg'], retrieved_at: item.retrievedAt, recorded_at: '2026-10-06T00:00:00Z' });
    expect(snapshotShopListing({ ...item, retrievedAt: undefined }).retrieved_at).toBeUndefined();
  });
  it('retains a complete snapshot after the review queue is cleared and sync is toggled', () => {
    const saved = { ...listing, shop_snapshot: snapshotShopListing(item) };
    const before = resolveListingShopData(product([saved]), saved, []);
    expect(before).toMatchObject({ price: { amount: 25, currency: 'MYR', origin: 'shop' }, stock: 0, title: 'Shop title', images: ['/one.jpg', '/two.jpg'] });
    const enabled = { ...saved, master_data_sync: { enabled: true, fields: ['content' as const], updated_at: '2026-10-06T00:00:00Z' } };
    expect(resolveListingShopData(product([enabled]), enabled, [])).toEqual(before);
  });
  it('never crosses a shop, provider ID or ambiguous import entry', () => {
    const otherShop = { ...item, storeName: 'Shop B', price: 100 };
    const otherListing = { ...item, listingId: 'provider-2', price: 200 };
    expect(resolveListingShopData(product(), listing, [otherShop, otherListing]).price).toBeUndefined();
    expect(listingImportSource(product(), listing, [item, { ...item }])).toBeUndefined();
    const poisoned = { ...listing, shop_snapshot: snapshotShopListing(otherShop) };
    expect(resolveListingShopData(product([poisoned]), poisoned, []).price).toBeUndefined();
  });
  it('recovers an old link with no shop only from a unique provider ID', () => {
    const old = { ...listing, store_name: undefined };
    expect(listingImportSource(product([old]), old, [item])).toEqual(item);
    expect(listingImportSource(product([old]), old, [item, { ...item, storeName: 'Shop B' }])).toBeUndefined();
    expect(listingImportSource(product([old]), old, [{ ...item, listingId: 'not-the-provider-id' }])).toBeUndefined();
    expect(listingImportSource(product([old], { channel_overrides: { lazada: { enabled: true, title: '', description: '', price_markup: 0, pricing_shop_label: 'Shop B' } } }), old, [item])).toBeUndefined();
  });
  it('recovers unambiguous legacy import price without changing its currency', () => {
    const provenance = { channel: 'lazada' as const, store: 'Shop A', brand: 'Old brand', price: 4300, currency: 'JPY' };
    expect(resolveListingShopData(product([listing], { import_sources: [provenance] }), listing, []).price).toEqual({ amount: 4300, currency: 'JPY', origin: 'shop' });
    const sibling = { ...listing, external_id: 'provider-2', shop_sku: 'SKU-2' };
    expect(resolveListingShopData(product([listing, sibling], { import_sources: [provenance] }), listing, []).price).toBeUndefined();
    expect(resolveListingShopData(product([listing, sibling], { import_sources: [{ ...provenance, listing_id: 'provider-1' }] }), listing, []).price?.amount).toBe(4300);
    expect(resolveListingShopData(product([listing], { import_sources: [{ ...provenance, store: 'Shop B' }] }), listing, []).price).toBeUndefined();
  });
  it('reads explicit legacy manual prices but never substitutes Master or allocated inventory', () => {
    const master = product([listing], { channel_overrides: { lazada: { enabled: true, title: '', description: '', price_markup: 0, pricing_source: 'manual', manual_price: '0', channel_currency: 'MYR', allocation_cap: '12', stock_quantity: '20' } } });
    expect(resolveListingShopData(master, listing, [])).toMatchObject({ price: { amount: 0, currency: 'MYR', origin: 'saved' } });
    expect(resolveListingShopData(master, listing, []).stock).toBeUndefined();
    expect(resolveListingShopData(product(), listing, []).price).toBeUndefined();
  });
  it('does not apply a configured sibling’s saved price to an imported-only listing', () => {
    const imported = { ...listing, publication_unconfirmed: true, external_id: 'imported' };
    const master = product([listing, imported], { channel_overrides: { lazada: { enabled: true, title: '', description: '', price_markup: 0, channel_price: 99, channel_currency: 'USD', listing_sku: 'SKU-1' } } });
    expect(resolveListingShopData(master, listing, []).price?.amount).toBe(99);
    expect(resolveListingShopData(master, imported, []).price).toBeUndefined();
  });
  it.each([null, undefined, NaN, Infinity, -1])('keeps an invalid number (%s) unknown instead of coercing it to zero', bad => {
    const invalid = { ...item, price: bad, channelStock: bad } as CatalogImportItem;
    const saved = { ...listing, shop_snapshot: snapshotShopListing(invalid) };
    const data = resolveListingShopData(product([saved]), saved, []);
    expect(data.price).toBeUndefined();
    expect(data.stock).toBeUndefined();
  });
  it('requires price and currency from the same source', () => {
    expect(snapshotShopListing({ ...item, currency: '' }).price).toBeUndefined();
    const master = product([listing], { channel_overrides: { lazada: { enabled: true, title: '', description: '', price_markup: 0, channel_price: 99 } } });
    expect(resolveListingShopData(master, listing, []).price).toBeUndefined();
  });
  it('prefers a newer dated import, never an older or undated queue entry', () => {
    const saved = { ...listing, shop_snapshot: snapshotShopListing(item) };
    const master = product([saved]);
    expect(resolveListingShopData(master, saved, [{ ...item, price: 5, retrievedAt: undefined }]).price?.amount).toBe(25);
    expect(resolveListingShopData(master, saved, [{ ...item, price: 5, retrievedAt: '2026-09-01T00:00:00Z' }]).price?.amount).toBe(25);
    expect(resolveListingShopData(master, saved, [{ ...item, price: 5, channelStock: 7, retrievedAt: '2026-10-02T00:00:00Z' }])).toMatchObject({ price: { amount: 5 }, stock: 7 });
  });
  it('backfills only proven snapshots, idempotently, preserving Master, source values, status and timestamps', () => {
    const unknown = { ...listing, external_id: null };
    const master = product([listing, unknown], { name: 'Master', status: 'draft', updated_at: '2026-09-01T00:00:00Z' });
    const original = structuredClone(master);
    const recovered = recoverListingShopSnapshots(master, [item]);
    expect(master).toEqual(original);
    expect(recovered).toEqual({ ...master, channels: [{ ...listing, shop_snapshot: expect.any(Object) }, unknown] });
    expect(recoverListingShopSnapshots(recovered, [item])).toBe(recovered);
  });
});
