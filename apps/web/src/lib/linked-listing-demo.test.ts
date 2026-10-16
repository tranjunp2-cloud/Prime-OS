// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { completeLinkedListingDemo } from './linked-listing-demo';
import { listingDataReadiness } from './listing-data-readiness';
import { resolveListingShopData } from './listing-shop-data';
import { listingEditorData } from './listing-editor-data';

beforeEach(() => { localStorage.clear(); vi.resetModules(); });
describe('Complete shipped listing demo snapshots', () => {
  it('has independent complete values for all three shops, clearly marked as demo', async () => {
    const { getProductById } = await import('./product-store');
    const product = getProductById('prod_import_test_matched_02')!;
    expect(product.channels).toHaveLength(3);
    const currencies: string[] = [];
    for (const listing of product.channels) {
      const data = resolveListingShopData(product, listing, []);
      expect(data.origin).toBe('prototype');
      expect(listingDataReadiness(data, listing.external_id).missing).toEqual([]);
      expect(listingEditorData(product, listing).hasDemo).toBe(true);
      currencies.push(data.price!.currency);
    }
    expect(currencies.sort()).toEqual(['JPY', 'JPY', 'USD']);
    expect(completeLinkedListingDemo(product)).toBe(product);
  });
  it('never fills user listings or overwrites source snapshots, user edits, or explicit empty data', async () => {
    const { getProductById } = await import('./product-store');
    const original = getProductById('prod_import_test_matched_02')!;
    const bare = { ...original.channels[0], shop_snapshot: undefined, shop_sku: undefined, reported_stock: undefined };
    for (const patch of [{ shop_sku: '' }, { reported_stock: 0 }, { store_name: 'My shop' },
      { shop_snapshot: original.channels[0].shop_snapshot }, { local_draft: { values: { description: '' }, updated_at: '' } }]) {
      const product = { ...original, channels: [{ ...bare, ...patch }] };
      expect(completeLinkedListingDemo(product)).toBe(product);
    }
    const custom = { ...original, id: 'user-product', channels: [bare] };
    expect(completeLinkedListingDemo(custom)).toBe(custom);
  });
  it('backs up the three legacy records, persists once, and never recreates removed links', async () => {
    let store = await import('./product-store');
    const original = store.getProductById('prod_import_test_matched_02')!;
    const legacy = { ...original, inventory: { wh_crjp: 999 }, channels: original.channels.map(listing => ({ ...listing, shop_snapshot: undefined, shop_sku: undefined, reported_stock: undefined })) };
    localStorage.setItem('primeos-product-master-v5', JSON.stringify([legacy]));
    localStorage.removeItem('primeos-linked-listing-data-v1');
    vi.resetModules(); store = await import('./product-store');
    expect(store.getProductById(original.id)?.channels.every(listing => listing.shop_snapshot)).toBe(true);
    expect(store.getProductById(original.id)?.inventory).toEqual({ wh_crjp: 999 });
    expect(JSON.parse(localStorage.getItem('primeos-linked-listing-data-backup-v1')!)[0].channels[0].shop_snapshot).toBeUndefined();
    store.updateProduct(original.id, { id: original.id, channels: [] });
    vi.resetModules(); store = await import('./product-store');
    expect(store.getProductById(original.id)?.channels).toEqual([]);
  });
});
