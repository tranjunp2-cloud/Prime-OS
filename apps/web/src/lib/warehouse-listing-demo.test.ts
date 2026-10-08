// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Product } from './product-store';
import { completeWarehouseListingDemo } from './warehouse-listing-demo';
import { resolveProductShopSources, shopsAtWarehouse } from './warehouse-shop-sources';
import { warehouseDemoShops } from '@/test/fixtures/warehouse-shops';

beforeEach(() => { localStorage.clear(); vi.resetModules(); });

describe('warehouse listing demo identities', () => {
  it('resolves every active shipped listing to an exact connected shop and all known variants', async () => {
    const { getProducts } = await import('./product-store');
    const identities = new Set<string>();
    for (const product of getProducts()) {
      const sources = resolveProductShopSources(product, warehouseDemoShops);
      expect(sources.unconfirmed, product.id).toEqual([]);
      for (const source of sources.confirmed) {
        const key = `${source.shop.id}:${source.listing.external_id}`;
        expect(identities.has(key), key).toBe(false);
        identities.add(key);
        if (product.has_variants) for (const sku of product.skus) {
          expect(shopsAtWarehouse(sources, source.warehouseId, sku.id).unconfirmed, sku.id).toEqual([]);
          expect(shopsAtWarehouse(sources, source.warehouseId, sku.id).shops.length).toBeGreaterThan(0);
        }
      }
    }
    const notebook = getProducts().find(product => product.id === 'prod_001')!;
    const sources = resolveProductShopSources(notebook, warehouseDemoShops);
    expect(shopsAtWarehouse(sources, 'wh_crjp').shops.map(item => item.shop.store_name)).toEqual(['Prime Beauty US']);
    expect(shopsAtWarehouse(sources, 'wh_3plvn').shops.map(item => item.shop.store_name)).toEqual(['Prime Beauty Official']);
    expect(sources.confirmed.find(item => item.shop.platform === 'amazon')?.shop.sync_services.stock).toBe(false);
  });

  it('preserves custom identities, explicit empty mapping, reviews, source settings and saved stock', async () => {
    const { getProductById } = await import('./product-store');
    const original = getProductById('prod_001')!;
    const listing = original.channels[0];
    for (const patch of [{ store_name: 'My shop' }, { store_name: '' }, { review_pending: { issues: [], sku_mapping_pending: true, saved_at: '' } }, { external_id: 'my-listing' }, { creation_config: { enabled: true, title: '', description: '', price_markup: 0 } }]) {
      const product = { ...original, channels: [{ ...listing, variant_mappings: undefined, ...patch }] };
      expect(completeWarehouseListingDemo(product)).toBe(product);
    }
    const inventory = { wh_crjp: 999 };
    const sync = { enabled: false, fields: [] as [], inventory: { warehouse_id: '', safety_buffer: 6 }, updated_at: '' };
    const product = { ...original, inventory, channels: [{ ...listing, master_data_sync: sync, variant_mappings: [] }] };
    expect(completeWarehouseListingDemo(product)).toBe(product);
    expect(product.channels[0].master_data_sync).toBe(sync);
    expect(product.inventory).toBe(inventory);
    expect(completeWarehouseListingDemo({ ...original, id: 'user-product' })).toMatchObject({ id: 'user-product', channels: original.channels });
  });

  it('backfills missing legacy fields once, keeps a backup, and does not recreate removed links on reload', async () => {
    let store = await import('./product-store');
    const original = store.getProductById('prod_001')!;
    const legacy: Product = { ...original, inventory: { wh_crjp: 45 }, channels: [{ channel: 'amazon', external_id: 'B0G432Z31H', status: 'active', listing_url: null, last_synced_at: null }] };
    const key = 'primeos-product-master-v5';
    localStorage.setItem(key, JSON.stringify([legacy]));
    localStorage.removeItem('primeos-warehouse-listing-identity-v1');
    vi.resetModules(); store = await import('./product-store');
    expect(store.getProductById(original.id)?.channels).toHaveLength(1);
    expect(store.getProductById(original.id)?.channels[0]).toMatchObject({ store_name: 'Prime Beauty US', variant_mappings: expect.any(Array) });
    expect(JSON.parse(localStorage.getItem('primeos-warehouse-listing-before-completion-v1')!)[0].channels).toEqual(legacy.channels);
    const stored = JSON.parse(localStorage.getItem(key)!) as Product[];
    expect(stored[0].inventory).toEqual(legacy.inventory);
    store.updateProduct(original.id, { id: original.id, channels: [] });
    vi.resetModules(); store = await import('./product-store');
    expect(store.getProductById(original.id)?.channels).toEqual([]);
  });
});
