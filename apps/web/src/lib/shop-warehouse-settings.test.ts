// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { channelIntegrationsApi } from './channel-integrations-api';
import { getProducts, type ChannelListing } from './product-store';
import { connectionWarehouseChoices, loadConnectedShops, readConnectedShops, saveShopWarehouse, shopWarehouse } from './shop-warehouse-settings';
import { shopWarehouseImpact } from './shop-warehouse-impact';
import { resolveProductShopSources } from './warehouse-shop-sources';
import { masterSyncPlan, refreshShopDefaultReview, type MasterSyncPreference } from './listing-master-sync';
import { warehouseDemoShops } from '@/test/fixtures/warehouse-shops';

const shop = warehouseDemoShops[2];
const listing: ChannelListing = { channel: 'shopee', store_name: shop.store_name, external_id: 'default-source', shop_sku: 'SHOP-SKU', status: 'active', listing_url: null, last_synced_at: null,
  shop_snapshot: { channel: 'shopee', listing_id: 'default-source', store_name: shop.store_name, shop_sku: 'SHOP-SKU', title: '', category: '', images: [], recorded_at: '', requirements: { channel: 'shopee', category: '', revision: 'test', origin: 'prototype', fields: [] } } };
const preference: MasterSyncPreference = { enabled: true, fields: ['inventory'], inventory: { source: 'shop_default', warehouse_id: '', safety_buffer: 1 } };
const product = { ...getProducts()[0], status: 'active' as const, product_type: 'single' as const, has_variants: false, skus: [], channels: [listing], channel_overrides: {}, import_sources: [], inventory: { wh_crjp: 10, wh_3plvn: 30 } };
const target = { id: 'wh_crjp', name: 'CyberRecord Japan HQ', code: 'CR-JP', city: 'Tokyo' };
afterEach(() => vi.restoreAllMocks());

describe('shared shop default warehouse', () => {
  it('deduplicates aliases in connection setup while retaining server-known IDs and custom locations', () => {
    const custom = { id: 'custom', name: 'Custom', code: 'CUSTOM', city: '' };
    const choices = connectionWarehouseChoices([shop.warehouse!, { ...shop.warehouse!, id: 'wh_hn_01' }, target, custom, { ...target, id: 'wh_fbajp' }]);
    expect(choices.map(w => [w.id, w.name])).toEqual([['wh_hcm_01', 'Vietnam 3PL Partner'], ['wh_crjp', 'CyberRecord Japan HQ'], ['custom', 'Custom']]);
  });
  it('normalizes legacy names for display but sends the raw ID for conflict checking', async () => {
    vi.spyOn(channelIntegrationsApi, 'channels').mockResolvedValue({ data: [shop] });
    await loadConnectedShops();
    expect(shopWarehouse(shop.warehouse)?.name).toBe('Vietnam 3PL Partner');
    const api = vi.spyOn(channelIntegrationsApi, 'linkWarehouse').mockResolvedValue({ data: { ...shop, warehouse: target } });
    await saveShopWarehouse(shop, target);
    expect(api).toHaveBeenCalledWith(shop.id, target, 'wh_hcm_01');
    expect(readConnectedShops().shops[0].warehouse).toEqual(target);
    expect(readConnectedShops().shops[0].sync_services).toEqual(shop.sync_services);
  });
  it('never publishes a failed save or accepts an external warehouse', async () => {
    vi.spyOn(channelIntegrationsApi, 'channels').mockResolvedValue({ data: [shop] });
    await loadConnectedShops();
    const api = vi.spyOn(channelIntegrationsApi, 'linkWarehouse').mockRejectedValue(new Error('Already linked elsewhere'));
    await expect(saveShopWarehouse(shop, target)).rejects.toThrow('elsewhere');
    expect(readConnectedShops().shops[0]).toEqual(shop);
    await expect(saveShopWarehouse(shop, { ...target, id: 'wh_fbajp' })).rejects.toThrow('merchant-managed');
    expect(api).toHaveBeenCalledTimes(1);
  });
  it('previews exact active listings, leaving explicit, FBA and unresolved legacy choices intact', () => {
    const own = { ...listing, external_id: 'own', master_data_sync: { ...preference, inventory: { warehouse_id: 'wh_crjp', safety_buffer: 0 }, updated_at: '' } };
    const legacy = { ...listing, external_id: 'legacy', creation_config: { enabled: true, title: '', description: '', price_markup: 0, warehouse: 'dedicated' } };
    const inherited = { ...listing, master_data_sync: { ...preference, updated_at: '' } };
    const rows = shopWarehouseImpact([{ ...product, channels: [inherited, own, legacy, { ...listing, external_id: 'another', store_name: 'Another shop', shop_snapshot: undefined }, { ...listing, external_id: 'unconfirmed', publication_unconfirmed: true }] }], shop, [shop]);
    expect(rows.map(row => row.group)).toEqual(['default', 'own', 'review']);
    const fbaShop = warehouseDemoShops[0];
    const fba = { ...listing, channel: 'amazon' as const, store_name: fbaShop.store_name, shop_snapshot: undefined, master_data_sync: { ...preference, inventory: { ...preference.inventory!, fulfillment: 'FBA' as const }, updated_at: '' } };
    expect(shopWarehouseImpact([{ ...product, channels: [fba] }], fbaShop, [fbaShop])[0].group).toBe('own');
  });
  it('inherited stock follows a saved default and explicit sources keep their warehouse', async () => {
    vi.spyOn(channelIntegrationsApi, 'channels').mockResolvedValue({ data: [shop] }); await loadConnectedShops();
    expect(masterSyncPlan(product, listing, preference).stockRows[0].quantity).toBe(29);
    const savedListing = { ...listing, master_data_sync: { ...preference, updated_at: '' } };
    expect(resolveProductShopSources({ ...product, channels: [savedListing] }, [shop]).confirmed[0]).toMatchObject({ warehouseId: 'wh_3plvn', source: 'shop', stockSync: 'enabled' });
    vi.spyOn(channelIntegrationsApi, 'linkWarehouse').mockResolvedValue({ data: { ...shop, warehouse: target } }); await saveShopWarehouse(shop, target);
    expect(masterSyncPlan(product, listing, preference).stockRows[0].quantity).toBe(9);
    expect(resolveProductShopSources({ ...product, channels: [savedListing] }, readConnectedShops().shops).confirmed[0].warehouseId).toBe('wh_crjp');
    expect(masterSyncPlan(product, listing, { ...preference, inventory: { warehouse_id: 'wh_3plvn', safety_buffer: 1 } }).stockRows[0].quantity).toBe(29);
    expect(product.inventory).toEqual({ wh_crjp: 10, wh_3plvn: 30 });
  });
  it('blocks an inherited source when the shop is unknown, not configured or unavailable', async () => {
    const api = vi.spyOn(channelIntegrationsApi, 'channels').mockResolvedValue({ data: [] }); await loadConnectedShops();
    expect(masterSyncPlan(product, listing, preference).error).toMatch(/matched shop/);
    api.mockResolvedValue({ data: [{ ...shop, warehouse: null }] }); await loadConnectedShops();
    expect(masterSyncPlan(product, listing, preference).error).toMatch(/default warehouse/);
    api.mockRejectedValue(new Error('Offline')); await expect(loadConnectedShops()).rejects.toThrow('Offline');
    expect(masterSyncPlan(product, listing, preference).error).toMatch(/Load the shop/);
    expect(masterSyncPlan(product, listing, { ...preference, inventory: { warehouse_id: 'wh_crjp', safety_buffer: 0 } }).error).toBeUndefined();
  });
  it('requires a new review if another screen changed the shop default, even for equal quantities', async () => {
    const api = vi.spyOn(channelIntegrationsApi, 'channels').mockResolvedValue({ data: [shop] }); await loadConnectedShops();
    const sameCounts = { ...product, inventory: { wh_crjp: 10, wh_3plvn: 10 } };
    const reviewed = masterSyncPlan(sameCounts, listing, preference).signature;
    api.mockResolvedValue({ data: [{ ...shop, warehouse: target }] });
    await expect(refreshShopDefaultReview(sameCounts, listing, preference, reviewed)).rejects.toThrow('default warehouse changed');
  });
});
