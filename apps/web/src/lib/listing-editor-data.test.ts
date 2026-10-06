// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { getProducts, type ChannelListing } from './product-store';
import { listingEditorData } from './listing-editor-data';
import { listingEditableValues } from './listing-local-draft';
import { getCatalogImportItems } from './catalog-import-store';
import { snapshotShopListing } from './listing-shop-data';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const listing: ChannelListing = { channel: 'website', external_id: 'WEB-CR-TAI-BSZ', shop_sku: 'WEB-CR-TAI-BSZ', store_name: 'primebeauty.vn', status: 'active', listing_url: null, last_synced_at: null };
function fixture() {
  const target = structuredClone(listing);
  return { ...getProducts()[0], id: 'prod_005', sku_code: 'CR-TAI-BSZ', name: 'Master name', description: 'Master description', images: ['/master.jpg'], inventory: { a: 999 }, retail_price: 888,
    channels: [target], import_sources: [], channel_overrides: { webstore: { enabled: true, title: '', description: '', price_markup: 0, listing_sku: 'WEB-CR-TAI-BSZ', listing_mode: 'master' as const, media_scope: 'all' as const, channel_price: 0, channel_currency: 'VND' } } };
}
describe('Listing editor source-aware presentation', () => {
  it('fills known demo listings completely without copying Master content or changing raw data', () => {
    const product = fixture(), before = structuredClone(product);
    const details = listingEditorData(product, product.channels[0]);
    expect(details.values).toMatchObject({ title: 'Traditional Japanese Precision Tailoring Set', price: { amount: 0, currency: 'VND' }, stock: 24, shipping: { weight: 160 } });
    expect(details.values.images).toHaveLength(3);
    expect(details.sources).toMatchObject({ title: 'demo', images: 'demo', stock: 'demo', category: 'demo', 'shipping.weight': 'demo' });
    expect(details.sources.price).toBe('saved');
    expect(product).toEqual(before);
    expect(listingEditableValues(product, product.channels[0])).toMatchObject({ title: '', stock: undefined, images: undefined });
  });
  it('does not replace snapshot values with Master or demo, even with sync on', () => {
    const product = fixture();
    product.channels[0].shop_snapshot = { channel: 'website', store_name: 'primebeauty.vn', listing_id: listing.external_id!, shop_sku: listing.shop_sku!, title: 'Actual shop title', description: 'Actual shop description', category: 'Actual category', images: ['/shop.jpg'], stock: 0, shipping: { weight: 220 }, recorded_at: '' };
    const details = listingEditorData(product, product.channels[0]);
    expect(details.values).toMatchObject({ title: 'Actual shop title', description: 'Actual shop description', category: 'Actual category', images: ['/shop.jpg'], stock: 0, shipping: { weight: 220 } });
    expect(details.hasDemo).toBe(false);
  });
  it('respects explicit local blanks and sparse nested edits', () => {
    const product = fixture();
    product.channels[0].local_draft = { values: { category: '', stock: 0, shipping: { notes: '', weight: 200 } }, updated_at: '' };
    const details = listingEditorData(product, product.channels[0]);
    expect(details.values).toMatchObject({ category: '', stock: 0, shipping: { notes: '', weight: 200, length: 14 } });
    expect(details.sources).toMatchObject({ category: 'draft', stock: 'draft', 'shipping.notes': 'draft', 'shipping.weight': 'draft' });
  });
  it('never fills an unknown independent listing from Master or another demo shop', () => {
    const product = fixture();
    const target = { ...listing, store_name: 'Other shop', master_data_sync: { enabled: false, fields: [] as [], updated_at: '' } };
    product.channels = [target];
    const details = listingEditorData(product, target);
    expect(details.values.title).not.toBe('Master name');
    expect(details.values.stock).toBeUndefined();
    expect(details.values.shipping).toBeUndefined();
    expect(details.hasDemo).toBe(false);
    expect(details.hasMasterPreview).toBe(false);
  });
  it('provides complete content, working galleries, shipping and identity for all five demo listings', () => {
    const imports = getCatalogImportItems({ requireConfirmation: true });
    const imported = ['imp-007', 'imp-008'].map(id => {
      const item = imports.find(item => item.id === id)!;
      return { channel: item.channel, external_id: item.listingId, store_name: item.storeName, shop_sku: item.channelSku, status: 'active' as const,
        listing_url: null, last_synced_at: null, publication_unconfirmed: true, shop_snapshot: snapshotShopListing(item) };
    });
    const product = { ...fixture(), channels: [listing,
      { ...listing, channel: 'lazada' as const, external_id: 'legacy-lazada', store_name: 'Prime Flagship Store · MY', shop_sku: 'CR-TAI-BSZ' },
      { ...listing, channel: 'rakuten' as const, external_id: null, store_name: 'Prime Beauty JP', shop_sku: undefined }, ...imported],
      channel_overrides: { ...fixture().channel_overrides,
        lazada: { enabled: true, title: '', description: '', price_markup: 0, listing_sku: 'CR-TAI-BSZ' },
        rakuten: { enabled: true, title: '', description: '', price_markup: 0 } } };
    const before = structuredClone(product);
    for (const target of product.channels) {
      const detail = listingEditorData(product, target);
      expect(detail.hasDemo).toBe(true);
      for (const field of ['title', 'description', 'brand', 'category'] as const) expect(detail.values[field]?.trim().length).toBeGreaterThan(0);
      expect(detail.values.images).toHaveLength(3);
      for (const image of detail.values.images!) expect(existsSync(resolve(process.cwd(), 'public', image.slice(1))), image).toBe(true);
      expect(detail.values.price?.currency).toMatch(/^[A-Z]{3}$/);
      expect(detail.values.stock).toBeGreaterThanOrEqual(0);
      for (const field of ['length', 'width', 'height', 'weight', 'country', 'hs_code', 'notes'] as const) expect(detail.values.shipping?.[field]).toBeTruthy();
      for (const field of ['condition', 'attribute_material', 'attribute_color', 'tax_code'] as const) expect(detail.values.channel_settings?.[field]).toBeTruthy();
      expect(detail.metadata.sku).toBeTruthy();
      expect(detail.listingId).toBeTruthy();
      expect(detail.fulfillment).toBeTruthy();
      expect(Object.values(detail.metadata.identifiers).every(Boolean)).toBe(true);
    }
    const palette = listingEditorData(product, product.channels[4]);
    expect(palette.values.title).toBe('Watercolor Travel Palette 24 Colors');
    expect(palette.values.images?.every(image => image.includes('palette-'))).toBe(true);
    expect(palette.values.channel_settings?.bullet_points?.split('\n')).toHaveLength(5);
    expect(listingEditorData(product, product.channels[3]).values.stock).toBe(0);
    expect(product).toEqual(before);
  });
  it('preserves custom images and edits, and never matches another imported shop or SKU', () => {
    const item = getCatalogImportItems({ requireConfirmation: true }).find(item => item.id === 'imp-008')!;
    const target: ChannelListing = { channel: item.channel, external_id: item.listingId, store_name: item.storeName, shop_sku: item.channelSku, status: 'active', listing_url: null, last_synced_at: null,
      shop_snapshot: snapshotShopListing({ ...item, image: '/custom-palette.jpg', description: 'Custom source description' }) };
    const product = { ...fixture(), channels: [target] };
    const details = listingEditorData(product, target);
    expect(details.values.images).toEqual(['/custom-palette.jpg']);
    expect(details.values.description).toBe('Custom source description');
    const local = { ...target, local_draft: { values: { images: ['/my-photo.jpg'], description: 'My edit' }, updated_at: '' } };
    expect(listingEditorData({ ...product, channels: [local] }, local).values).toMatchObject({ images: ['/my-photo.jpg'], description: 'My edit' });
    for (const changed of [{ ...target, store_name: 'Another shop' }, { ...target, shop_sku: 'OTHER' }, { ...target, external_id: 'other' }]) {
      expect(listingEditorData({ ...product, channels: [changed] }, changed).hasDemo).toBe(false);
    }
  });
});
