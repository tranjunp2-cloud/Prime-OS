import { describe, expect, it } from 'vitest';
import { getProducts, type ChannelListing, type Product } from './product-store';
import type { ConnectedChannelRecord } from './channel-integrations-api';
import type { CatalogImportItem } from './catalog-import-store';
import { resolveProductShopSources, shopsAtWarehouse } from './warehouse-shop-sources';

const shop = (id: string, platform: string, name: string, warehouse = 'wh_crjp'): ConnectedChannelRecord => ({ id, platform, name: platform, store_name: name, region: 'JP', type: 'Marketplace', status: 'CONNECTED', synced_listings: 0, sync_progress: 100, errors: 0, last_sync_at: '', sync_services: { stock: true, orders: true, price: true }, warehouse: { id: warehouse, name: warehouse, code: warehouse, city: '' } });
const listing = (channel: ChannelListing['channel'], store_name?: string, external_id = 'listing'): ChannelListing => ({ channel, store_name, external_id, status: 'active', listing_url: null, last_synced_at: null });
const product = (channels: ChannelListing[]): Product => ({ ...getProducts()[0], id: 'warehouse-source-test', channels, channel_overrides: {}, import_sources: [] });
const shops = [shop('amz', 'amazon', 'Amazon shop'), shop('rak', 'rakuten', 'Rakuten shop'), shop('shp', 'shopee', 'Shopee shop', 'wh_3plvn')];

describe('warehouse product shop sources', () => {
  it('shows only shops supplying the selected warehouse, not all product platforms', () => {
    const sources = resolveProductShopSources(product([listing('amazon', 'Amazon shop'), listing('rakuten', 'Rakuten shop'), listing('shopee', 'Shopee shop')]), shops);
    expect(shopsAtWarehouse(sources, 'wh_crjp').shops.map(item => item.shop.id)).toEqual(['amz', 'rak']);
    expect(shopsAtWarehouse(sources, 'wh_3plvn').shops.map(item => item.shop.id)).toEqual(['shp']);
  });
  it('does not infer a shop from the channel, even when only one shop exists', () => {
    const sources = resolveProductShopSources(product([listing('amazon')]), [shops[0]]);
    expect(shopsAtWarehouse(sources, 'wh_crjp')).toMatchObject({ shops: [], unconfirmed: [{ reason: 'The listing’s shop has not been identified.' }] });
  });
  it('counts unique shops rather than listings or platform logos', () => {
    const sources = resolveProductShopSources(product([listing('amazon', 'Amazon shop', 'a'), listing('amazon', 'Amazon shop', 'b'), listing('amazon', 'Second Amazon shop', 'c')]), [...shops, shop('amz-2', 'amazon', 'Second Amazon shop')]);
    const scoped = shopsAtWarehouse(sources, 'wh_crjp');
    expect(scoped.shops).toHaveLength(2);
    expect(scoped.shops[0].listings).toHaveLength(2);
  });
  it('uses a listing source before the shop default and preserves disabled sync information', () => {
    const link = { ...listing('amazon', 'Amazon shop'), master_data_sync: { enabled: false, fields: ['inventory'] as const, inventory: { warehouse_id: 'wh_3plvn', safety_buffer: 0, fulfillment: 'FBM' as const }, updated_at: '' } };
    const sources = resolveProductShopSources(product([{ ...link, master_data_sync: { ...link.master_data_sync, fields: ['inventory'] } }]), [{ ...shops[0], sync_services: { ...shops[0].sync_services, stock: false } }]);
    expect(shopsAtWarehouse(sources, 'wh_crjp').shops).toHaveLength(0);
    expect(shopsAtWarehouse(sources, 'wh_3plvn').shops[0]).toMatchObject({ shop: { sync_services: { stock: false } }, listings: [{ source: 'listing', stockSync: 'disabled' }] });
  });
  it('keeps missing, ambiguous and unfinished sources unconfirmed', () => {
    const unresolved = resolveProductShopSources(product([listing('amazon', 'Amazon shop')]), [shops[0], { ...shops[0], id: 'duplicate' }]);
    expect(unresolved.confirmed).toHaveLength(0);
    const emptySource = resolveProductShopSources(product([{ ...listing('amazon', 'Amazon shop'), master_data_sync: { enabled: true, fields: ['inventory'], inventory: { warehouse_id: '', safety_buffer: 0 }, updated_at: '' } }]), shops);
    expect(emptySource.confirmed).toHaveLength(0);
    expect(emptySource.unconfirmed[0].reason).toMatch(/No stock source/);
  });
  it('recovers legacy identity only from an exact listing record and canonicalizes warehouse aliases', () => {
    const imported = { channel: 'amazon', storeName: 'Amazon shop', listingId: 'exact', title: 'Imported', image: '', variants: 1 } as CatalogImportItem;
    const sources = resolveProductShopSources(product([listing('amazon', undefined, 'exact')]), [{ ...shops[0], warehouse: { ...shops[0].warehouse!, id: 'wh_crossborder_01' } }], [imported]);
    expect(shopsAtWarehouse(sources, 'wh_crjp').shops).toHaveLength(1);
    expect(resolveProductShopSources(product([listing('amazon', undefined, 'different')]), shops, [imported]).confirmed).toHaveLength(0);
  });
  it('does not assign FBA, unresolved SKU mappings or unconfirmed publication to merchant stock', () => {
    const sources = resolveProductShopSources(product([
      { ...listing('amazon', 'Amazon shop'), creation_config: { enabled: true, title: '', description: '', price_markup: 0, fulfillment: 'FBA' } },
      { ...listing('rakuten', 'Rakuten shop'), review_pending: { issues: [], sku_mapping_pending: true, saved_at: '' } },
      { ...listing('shopee', 'Shopee shop'), publication_unconfirmed: true },
    ]), shops);
    expect(sources.confirmed).toHaveLength(0);
    expect(sources.unconfirmed).toHaveLength(2);
  });
  it('restricts variant rows to their confirmed listing-SKU mapping', () => {
    const sources = resolveProductShopSources(product([{ ...listing('amazon', 'Amazon shop'), variant_mappings: [{ shop_sku: 'BLUE', master_sku_id: 'blue' }] }]), shops);
    expect(shopsAtWarehouse(sources, 'wh_crjp', 'blue').shops).toHaveLength(1);
    expect(shopsAtWarehouse(sources, 'wh_crjp', 'red').shops).toHaveLength(0);
  });
  it('does not replace a legacy listing source with the shop default', () => {
    const saved = { ...listing('amazon', 'Amazon shop'), creation_config: { enabled: true, title: '', description: '', price_markup: 0, warehouse: 'channel', fulfillment: 'FBA' } };
    const unresolved = resolveProductShopSources(product([saved]), shops);
    expect(unresolved.confirmed).toHaveLength(0);
    expect(unresolved.unconfirmed[0].reason).toMatch(/saved stock source/);
    const updated = resolveProductShopSources(product([{ ...saved, master_data_sync: { enabled: true, fields: ['inventory'], inventory: { warehouse_id: 'wh_crjp', safety_buffer: 0, fulfillment: 'FBM' }, updated_at: '' } }]), shops);
    expect(updated.confirmed[0]).toMatchObject({ source: 'listing', warehouseId: 'wh_crjp', stockSync: 'enabled' });
  });
});
