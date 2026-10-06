import { describe, expect, it } from 'vitest';
import type { ChannelListing, Product } from './product-store';
import { listingShopDemoData } from './listing-shop-demo';
import { resolveListingShopData, type ListingShopData } from './listing-shop-data';

const link = (channel: ChannelListing['channel']): ChannelListing => ({ channel, external_id: null, status: 'active', listing_url: null, last_synced_at: null });
const channels = [link('website'), link('lazada'), link('rakuten')];
const product = {
  id: 'prod_005', sku_code: 'CR-TAI-BSZ', channels,
  channel_overrides: Object.fromEntries(['webstore', 'lazada', 'rakuten'].map(key => [key, { enabled: true, title: '', description: '', price_markup: 0 }])),
  inventory: { warehouse: 999 }, retail_price: 888,
} as Product;

describe('Legacy listing demo presentation', () => {
  it('fills the three known demo rows without altering saved prices or source objects', () => {
    const before = structuredClone(product);
    const inputs: ListingShopData[] = [
      { price: { amount: 1, currency: 'VND', origin: 'saved' } },
      { price: { amount: 4200, currency: 'MYR', origin: 'saved' } }, {},
    ];
    const originalInputs = structuredClone(inputs);
    const results = channels.map((listing, index) => listingShopDemoData(product, listing, inputs[index]));
    expect(results.map(result => result.demo)).toEqual([true, true, true]);
    expect(results.map(result => result.data.stock)).toEqual([24, 13, 9]);
    expect(results.map(result => result.data.sku)).toEqual(['WEB-CR-TAI-BSZ', 'CR-TAI-BSZ', 'RKT-CR-TAI-BSZ']);
    expect(results.map(result => result.data.price)).toEqual([
      inputs[0].price, inputs[1].price, { amount: 4200, currency: 'JPY', origin: 'demo' },
    ]);
    expect(product).toEqual(before);
    expect(inputs).toEqual(originalInputs);
    expect(resolveListingShopData(product, channels[2], [])).toMatchObject({ price: undefined, stock: undefined });
  });
  it('preserves real zero stock and zero price', () => {
    const data: ListingShopData = { price: { amount: 0, currency: 'JPY', origin: 'saved' }, stock: 0 };
    expect(listingShopDemoData(product, channels[2], data)).toEqual({ data, demo: false });
  });
  it('does not fill unknown values for other products or changed demo identities', () => {
    for (const changed of [{ ...product, id: 'another-master' }, { ...product, sku_code: 'OTHER' }]) {
      expect(listingShopDemoData(changed, channels[0], {})).toEqual({ data: {}, demo: false });
    }
    for (const data of [{ shop: 'Another shop' }, { sku: 'OTHER-SKU' }]) {
      expect(listingShopDemoData(product, channels[0], data)).toEqual({ data, demo: false });
    }
  });
  it('never fills imported snapshots, reported shop prices, or imported-only siblings', () => {
    const imported = { ...channels[1], publication_unconfirmed: true, shop_sku: 'CR-TAI-BSZ-JP' };
    const master = { ...product, channels: [...channels, imported] };
    expect(listingShopDemoData(master, imported, {})).toEqual({ data: {}, demo: false });
    for (const data of [
      { price: { amount: 4300, currency: 'JPY', origin: 'shop' as const } },
      { recordedAt: '2026-10-01T00:00:00Z' }, { retrievedAt: '2026-10-01T00:00:00Z' },
    ]) expect(listingShopDemoData(product, channels[1], data)).toEqual({ data, demo: false });
    const snapshot = { ...channels[1], shop_snapshot: {} as NonNullable<ChannelListing['shop_snapshot']> };
    expect(listingShopDemoData({ ...product, channels: [snapshot] }, snapshot, {})).toEqual({ data: {}, demo: false });
  });
  it('requires the uniquely configured row and excludes disabled configurations', () => {
    const ambiguous = { ...product, channels: [...channels, { ...channels[1] }] };
    expect(listingShopDemoData(ambiguous, channels[1], {}).demo).toBe(false);
    expect(listingShopDemoData({ ...product, channel_overrides: {} }, channels[1], {}).demo).toBe(false);
  });
});
