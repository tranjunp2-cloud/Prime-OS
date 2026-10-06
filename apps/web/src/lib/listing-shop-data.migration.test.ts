// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getCatalogImportItems, saveCatalogImportItems } from './catalog-import-store';

beforeEach(() => { localStorage.clear(); vi.resetModules(); });
afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });

describe('Stored listing snapshot recovery', () => {
  it('persists proven source values across reloads without changing Master status, updated time or sync preference', async () => {
    const store = await import('./product-store');
    const source = getCatalogImportItems({ requireConfirmation: true }).find(item => item.id === 'imp-007')!;
    const now = '2026-09-20T00:00:00Z';
    const old = { ...store.getProducts()[0], id: 'snapshot-migration-test', sku_code: 'SNAPSHOT-MIGRATION', status: 'draft' as const, import_result: undefined, import_sources: [], listing_review_migrated: true, updated_at: now, channels: [{ channel: source.channel, store_name: source.storeName, external_id: source.listingId, status: 'active' as const, last_synced_at: now, listing_url: null, master_data_sync: { enabled: false, fields: [] as Array<'content' | 'media'>, updated_at: now } }] };
    store.addProduct(old);
    const before = store.getProductById(old.id)!;
    vi.resetModules();
    const reloaded = await import('./product-store');
    const migrated = reloaded.getProductById(old.id)!;
    expect(migrated.status).toBe(before.status);
    expect(migrated.updated_at).toBe(before.updated_at);
    expect(migrated.channels[0]).toEqual({ ...before.channels[0], shop_snapshot: expect.objectContaining({ price: { amount: 4200, currency: 'JPY' }, stock: 0, title: source.title }) });
    const persisted = JSON.parse(localStorage.getItem('primeos-product-master-v5')!).find((product: { id: string }) => product.id === old.id);
    expect(persisted.channels[0].shop_snapshot).toEqual(migrated.channels[0].shop_snapshot);
    saveCatalogImportItems([]);
    vi.resetModules();
    const afterQueueClear = await import('./product-store');
    expect(afterQueueClear.getProductById(old.id)?.channels).toEqual(migrated.channels);
  });
  it('keeps the original stored products if snapshot recovery cannot be persisted', async () => {
    const store = await import('./product-store');
    const source = getCatalogImportItems({ requireConfirmation: true }).find(item => item.id === 'imp-007')!;
    store.addProduct({ ...store.getProducts()[0], id: 'snapshot-quota-test', sku_code: 'SNAPSHOT-QUOTA', import_result: undefined, listing_review_migrated: true, channels: [{ channel: source.channel, store_name: source.storeName, external_id: source.listingId, status: 'active', listing_url: null, last_synced_at: null }] });
    const stored = localStorage.getItem('primeos-product-master-v5');
    const write = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) { if (key === 'primeos-product-master-v5') throw new Error('Quota exceeded'); return write.call(this, key, value); });
    vi.resetModules();
    const reloaded = await import('./product-store');
    expect(reloaded.getProductById('snapshot-quota-test')?.channels[0].shop_snapshot?.stock).toBe(0);
    expect(localStorage.getItem('primeos-product-master-v5')).toBe(stored);
  });
});
