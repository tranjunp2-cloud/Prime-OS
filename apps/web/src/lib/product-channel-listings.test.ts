import { describe, expect, it } from 'vitest';
import { configuredListing, importedListingDetails } from './product-channel-listings';
import type { ChannelListing } from './product-store';
import type { CatalogImportItem } from './catalog-import-store';

const listing: ChannelListing = { channel: 'lazada', store_name: 'Same shop', external_id: 'external-1', shop_sku: 'SKU-1', status: 'active', last_synced_at: null, listing_url: null };
describe('Listing row identity', () => {
  it('does not bind a channel configuration to a link-only import, even when it comes first', () => {
    const imported = { ...listing, publication_unconfirmed: true, external_id: 'import', shop_sku: 'IMPORTED' };
    expect(configuredListing([imported, listing], 'lazada', 'SKU-1')).toBe(listing);
    expect(configuredListing([imported], 'lazada', 'IMPORTED')).toBeUndefined();
  });
  it('distinguishes same-shop listings by SKU and does not guess ambiguous ownership', () => {
    const second = { ...listing, external_id: 'external-2', shop_sku: 'SKU-2' };
    expect(configuredListing([listing, second], 'lazada', 'SKU-2')).toBe(second);
    expect(configuredListing([listing, second], 'lazada', '')).toBeUndefined();
    expect(configuredListing([listing], 'amazon', 'SKU-1')).toBeUndefined();
  });
  it('looks up source details by channel, shop and listing ID, never channel/SKU alone', () => {
    const source = { channel: 'lazada', storeName: 'Same shop', listingId: 'external-1', channelSku: 'SKU-1', price: 12, currency: 'USD' } as CatalogImportItem;
    const wrongShop = { ...source, storeName: 'Other shop', price: 99 };
    const wrongListing = { ...source, listingId: 'external-2', price: 55 };
    expect(importedListingDetails(listing, [wrongShop, wrongListing, source])).toBe(source);
    expect(importedListingDetails(listing, [wrongShop, wrongListing])).toBeUndefined();
    expect(importedListingDetails(listing, [source, { ...source }])).toBeUndefined();
    expect(importedListingDetails({ ...listing, store_name: undefined }, [source])).toBeUndefined();
  });
});
