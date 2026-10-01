// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { repairDraftListingDemo } from './draft-listing-demo';
import type { Product } from './product-store';

const legacy = {
  id: 'prod_005', sku_code: 'CR-TAI-BSZ', status: 'draft', updated_at: '2026-04-06T08:00:00Z',
  channels: [
    { channel: 'rakuten', external_id: 'R001002002', status: 'active', listing_url: null, last_synced_at: null },
    { channel: 'website', external_id: null, status: 'active', listing_url: '/products/CR-TAI-BSZ', last_synced_at: null },
  ],
} as Product;
afterEach(() => { localStorage.clear(); vi.resetModules(); });

describe('safe repair of inherited draft demo listings', () => {
  it('repairs only the exact untouched legacy listings and is idempotent', () => {
    const repaired = repairDraftListingDemo(legacy);
    expect(repaired.channels.every(listing => listing.status === 'draft' && !listing.external_id && !listing.listing_url)).toBe(true);
    expect(repaired.status).toBe('draft');
    expect(repairDraftListingDemo(repaired)).toBe(repaired);
    expect(legacy.channels[0].status).toBe('active');
  });

  it.each([
    { id: 'user-created' }, { sku_code: 'MY-OWN-SKU' }, { status: 'published' }, { status: 'archived' },
    { updated_at: '2026-10-01T10:00:00Z' }, { record_version: 2 },
    { revisions: [{ number: 1 }] }, { import_source: 'Rakuten · My shop' },
  ])('preserves modified, imported or published records: %j', patch => {
    const product = { ...legacy, ...patch } as Product;
    expect(repairDraftListingDemo(product)).toBe(product);
  });

  it('preserves changed listings, overrides and provider timestamps', () => {
    for (const listing of [
      { ...legacy.channels[0], external_id: 'REAL-LISTING' },
      { ...legacy.channels[0], last_synced_at: '2026-10-01T10:00:00Z' },
      { ...legacy.channels[0], status: 'pending' as const },
    ]) {
      const product = { ...legacy, channels: [listing] };
      expect(repairDraftListingDemo(product)).toBe(product);
    }
    const configured = { ...legacy, channels: [legacy.channels[0]], channel_overrides: { rakuten: { enabled: true, title: 'My edited listing', description: '', price_markup: 0 } } };
    expect(repairDraftListingDemo(configured)).toBe(configured);
  });

  it('ships both new-demo drafts with no fabricated live listings', async () => {
    localStorage.clear(); vi.resetModules();
    const store = await import('./product-store');
    for (const id of ['prod_005', 'prod_demo_headphones_002']) {
      expect(store.getProductById(id)!.status).toBe('draft');
      expect(store.getProductById(id)!.channels.every(listing => listing.status === 'draft')).toBe(true);
    }
    expect(store.getProductById('prod_import_test_review_02')!.channels.some(listing => listing.status === 'active')).toBe(true);
  });

  it('migrates untouched stored fixtures once without revisiting later user changes', async () => {
    localStorage.clear(); vi.resetModules();
    localStorage.setItem('primeos-product-master-v5', JSON.stringify([legacy]));
    let store = await import('./product-store');
    expect(store.getProductById(legacy.id)!.channels[0].status).toBe('draft');
    expect(JSON.parse(localStorage.getItem('primeos-product-master-v5')!)[0].channels[0].status).toBe('draft');
    store.updateProduct(legacy.id, { id: legacy.id, channels: legacy.channels });
    vi.resetModules(); store = await import('./product-store');
    expect(store.getProductById(legacy.id)!.channels[0].status).toBe('active');
  });

  it('preserves a fixture that has user-saved Amazon listing work', async () => {
    localStorage.clear(); vi.resetModules();
    const product = { ...legacy, id: 'prod_demo_headphones_002', sku_code: 'DEMO-ELC-002', channels: [{ ...legacy.channels[0], channel: 'amazon', external_id: 'B0G432Z31H' }] };
    localStorage.setItem('primeos-product-master-v5', JSON.stringify([product]));
    localStorage.setItem('primeos.amazon-listing-overrides.v1', JSON.stringify({ [product.id]: { productId: product.id, status: 'draft', title: 'Edited listing' } }));
    const store = await import('./product-store');
    expect(store.getProductById(product.id)!.channels).toEqual(product.channels);
  });
});
