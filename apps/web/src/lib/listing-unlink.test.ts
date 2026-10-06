// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { addProduct, deleteProduct, getProductById, getProducts, updateProduct, type ChannelListing } from './product-store';
import { listingEditSnapshot } from './listing-local-draft';
import { unlinkListingFromMaster } from './listing-unlink';
import { resolveListingShopData } from './listing-shop-data';
import { listingMasterSync, syncListingOverride } from './listing-master-sync';
import { getCatalogImportItems, saveCatalogImportItems, type CatalogImportItem } from './catalog-import-store';

const id = 'unlink-listing-test';
const managed: ChannelListing = { channel: 'lazada', store_name: 'Shop A', external_id: 'one', shop_sku: 'SKU-A', status: 'active', listing_url: '/shop/one', last_synced_at: '2026-10-01', local_draft: { values: { title: 'Retain this local title' }, updated_at: '' } };
function fixture() {
  addProduct({ ...getProducts()[0], id, status: 'draft', import_result: undefined, import_activation_paused: true, channels: [managed, { ...managed, external_id: 'two', shop_sku: 'SKU-B', publication_unconfirmed: true }, { ...managed, store_name: 'Shop B', publication_unconfirmed: true }],
    channel_overrides: { lazada: { enabled: true, title: 'Owned title', description: '', price_markup: 0, listing_sku: 'SKU-A', pricing_shop_label: 'Shop A', listing_mode: 'master', media_scope: 'all' } } });
  return getProductById(id)!;
}
afterEach(() => { vi.restoreAllMocks(); deleteProduct(id); });
describe('Unlink one listing', () => {
  it('returns the exact imported item to review and rolls its queue state back if the Master write fails', () => {
    const items = getCatalogImportItems({ requireConfirmation: true });
    const source: CatalogImportItem = { ...items[0], id: 'unlink-source', channel: 'lazada', storeName: 'Shop A', listingId: 'two', channelSku: 'SKU-B', resolution: 'link', confirmed: true, resolvedProductId: id };
    try {
      saveCatalogImportItems([...items, source]);
      const before = fixture(); const target = before.channels[1];
      const nativeSet = Storage.prototype.setItem;
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
        if (String(value).includes('Listing unlinked from this Master')) throw new Error('Storage full');
        nativeSet.call(this, key, value);
      });
      expect(() => unlinkListingFromMaster(id, target, listingEditSnapshot(before, target))).toThrow('Storage full');
      expect(getCatalogImportItems({ requireConfirmation: true }).find(item => item.id === source.id)).toEqual(source);
      expect(getProductById(id)).toBe(before);
      vi.restoreAllMocks();
      unlinkListingFromMaster(id, target, listingEditSnapshot(before, target));
      expect(getCatalogImportItems({ requireConfirmation: true }).find(item => item.id === source.id)).toMatchObject({ confirmed: false, resolution: 'later' });
      expect(getCatalogImportItems({ requireConfirmation: true }).find(item => item.id === source.id)?.resolvedProductId).toBeUndefined();
      expect(getCatalogImportItems({ requireConfirmation: true }).filter(item => item.id !== source.id)).toEqual(items);
    } finally { vi.restoreAllMocks(); saveCatalogImportItems(items); }
  });
  it('removes only the exact link, retains a recoverable snapshot and disables only its legacy configuration', () => {
    const before = fixture();
    expect(unlinkListingFromMaster(id, before.channels[0], listingEditSnapshot(before, before.channels[0]))).toBe('lazada');
    const after = getProductById(id)!;
    expect(after.channels).toEqual(before.channels.slice(1));
    expect(after.channel_overrides?.lazada).toEqual({ ...before.channel_overrides?.lazada, enabled: false });
    for (const key of ['name', 'status', 'images', 'description', 'brand', 'inventory', 'retail_price', 'skus', 'import_sources'] as const) expect(after[key]).toEqual(before[key]);
    const events = after.activity!.slice(before.activity!.length);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ kind: 'unlinked', listing: { externalId: 'one', shop: 'Shop A' }, unlinkedSnapshot: { listing: before.channels[0], override: before.channel_overrides?.lazada } });
    expect(after.listing_review_migrated).toBe(true);
    expect(syncListingOverride(after, after.channels[0])).toBeUndefined();
    expect(listingMasterSync(after.channels[0])).toEqual({ enabled: false, fields: [] });
    expect(resolveListingShopData(after, after.channels[0], []).title).toBeUndefined();
  });
  it('unlinks an imported sibling without disabling the configured listing', () => {
    const before = fixture();
    expect(unlinkListingFromMaster(id, before.channels[1], listingEditSnapshot(before, before.channels[1]))).toBeUndefined();
    const after = getProductById(id)!;
    expect(after.channels).toEqual([before.channels[0], before.channels[2]]);
    expect(after.channel_overrides).toEqual(before.channel_overrides);
  });
  it('rejects stale, duplicate, removed and archived targets', () => {
    const before = fixture(); const target = before.channels[0]; const snapshot = listingEditSnapshot(before, target);
    updateProduct(id, { id, channels: [{ ...target, reported_stock: 42 }] });
    expect(() => unlinkListingFromMaster(id, target, snapshot)).toThrow('changed');
    updateProduct(id, { id, channels: [target, target] });
    expect(() => unlinkListingFromMaster(id, target, snapshot)).toThrow('changed');
    updateProduct(id, { id, channels: [] });
    expect(() => unlinkListingFromMaster(id, target, snapshot)).toThrow('changed');
    updateProduct(id, { id, channels: [target], status: 'archived' });
    expect(() => unlinkListingFromMaster(id, target, snapshot)).toThrow('no longer editable');
  });
  it('does not expose an unlink or history event when persistence fails', () => {
    const before = fixture();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage full'); });
    expect(() => unlinkListingFromMaster(id, before.channels[0], listingEditSnapshot(before, before.channels[0]))).toThrow('Storage full');
    expect(getProductById(id)).toBe(before);
  });
});
