import type { CatalogImportItem } from './catalog-import-store';
import type { ConnectedChannelRecord } from './channel-integrations-api';
import type { ChannelListing, Product } from './product-store';
import { DEMO_WAREHOUSE_ALIASES } from './demo-warehouse-locations';
import { resolveListingShopData } from './listing-shop-data';
import { configuredListing } from './product-channel-listings';

export type ShopLinksState = 'loading' | 'ready' | 'error';
export type WarehouseListingSource = {
  listing: ChannelListing;
  shop: ConnectedChannelRecord;
  warehouseId: string;
  source: 'listing' | 'shop';
  stockSync: 'enabled' | 'disabled' | 'not_configured';
};
export type UnconfirmedShopSource = { listing: ChannelListing; shopName?: string; warehouseId?: string; reason: string };
export type ProductShopSources = { confirmed: WarehouseListingSource[]; unconfirmed: UnconfirmedShopSource[] };
export type WarehouseShopSummary = { shops: { shop: ConnectedChannelRecord; listings: WarehouseListingSource[] }[]; unconfirmed: UnconfirmedShopSource[] };

const locationId = (id: string) => DEMO_WAREHOUSE_ALIASES[id] ?? id;
const platformKey = (key: string) => ({ tiktok_shop: 'tiktok', tiktokshop: 'tiktok', primeweb: 'website', webstore: 'website', woocommerce: 'website', shopify: 'website', primepos: 'pos', facebook: 'social', instagram: 'social' }[key] ?? key);
const shopNameKey = (name: string) => name.trim().toLocaleLowerCase();

/** Exact shop identity is shared by previews, listing settings and warehouse rows. */
export function resolveListingShop(product: Product, listing: ChannelListing, shops: ConnectedChannelRecord[], imports: readonly CatalogImportItem[] = []) {
  const data = resolveListingShopData(product, listing, imports);
  const candidates = data.shop?.trim() ? shops.filter(shop => platformKey(shop.platform) === listing.channel && shopNameKey(shop.store_name) === shopNameKey(data.shop!)) : [];
  return candidates.length === 1 ? candidates[0] : undefined;
}
export function listingStockWarehouseId(product: Product, listing: ChannelListing, inventory: NonNullable<ChannelListing['master_data_sync']>['inventory'], shops: ConnectedChannelRecord[], imports: readonly CatalogImportItem[] = []) {
  const id = inventory?.source === 'shop_default' ? resolveListingShop(product, listing, shops, imports)?.warehouse?.id : inventory?.warehouse_id;
  return id?.trim() ? locationId(id) : undefined;
}

/** Resolve an exact listing/shop relationship before applying warehouse scope.
 * A platform logo, matching SKU, or sole shop on a channel is never ownership evidence.
 */
export function resolveProductShopSources(product: Product, shops: ConnectedChannelRecord[], imports: readonly CatalogImportItem[] = []): ProductShopSources {
  const result: ProductShopSources = { confirmed: [], unconfirmed: [] };
  for (const listing of product.channels.filter(item => item.status === 'active' && !item.publication_unconfirmed)) {
    const explicitSource = listing.master_data_sync?.inventory;
    const followsDefault = !explicitSource || explicitSource.source === 'shop_default';
    const warehouseId = listingStockWarehouseId(product, listing, explicitSource, shops, imports);
    const data = resolveListingShopData(product, listing, imports);
    const unknown = (reason: string, source = warehouseId) => result.unconfirmed.push({ listing, shopName: data.shop, warehouseId: source, reason });
    if (!data.shop?.trim()) { unknown('The listing’s shop has not been identified.'); continue; }
    const candidates = shops.filter(shop => platformKey(shop.platform) === listing.channel && shopNameKey(shop.store_name) === shopNameKey(data.shop!));
    if (candidates.length !== 1) { unknown(candidates.length ? 'More than one connection matches this shop. Its source needs confirmation.' : 'The listing’s shop could not be matched to a connection.'); continue; }
    const shop = candidates[0];
    const legacy = product.channel_overrides?.[listing.channel === 'website' ? 'webstore' : listing.channel];
    const ownsLegacy = legacy?.enabled && configuredListing(product.channels, listing.channel, legacy.listing_sku || '') === listing
      && (!listing.store_name || !legacy.pricing_shop_label || listing.store_name === legacy.pricing_shop_label);
    const ownConfig = listing.creation_config ?? (ownsLegacy ? legacy : undefined);
    // Older source modes may represent dedicated or multiple warehouses. Never replace
    // a saved listing choice with the shop default when its source is not resolved here.
    if (!explicitSource && ownConfig?.warehouse?.trim()) { unknown('This listing has a saved stock source that needs confirmation.'); continue; }
    // A saved listing source overrides the shop default, including an unfinished source selection.
    const source = followsDefault ? shop.warehouse?.id ? locationId(shop.warehouse.id) : undefined : warehouseId;
    if (!source) { unknown('No stock source has been selected for this listing.'); continue; }
    if (listing.channel === 'amazon' && (explicitSource?.fulfillment ?? ownConfig?.fulfillment) === 'FBA') {
      unknown('Amazon manages this FBA listing’s stock; its warehouse source needs provider confirmation.', source); continue;
    }
    if (listing.review_pending?.sku_mapping_pending) { unknown('Confirm this listing’s SKU mapping before assigning its stock source.', source); continue; }
    const preference = listing.master_data_sync;
    result.confirmed.push({ listing, shop, warehouseId: source, source: followsDefault ? 'shop' : 'listing',
      stockSync: !preference ? 'not_configured' : preference.enabled && preference.fields.includes('inventory') && Boolean(warehouseId) ? 'enabled' : 'disabled' });
  }
  return result;
}

/** Counts shops, not platform logos or number of listings. */
export function shopsAtWarehouse(sources: ProductShopSources, warehouseId: string, skuId?: string): WarehouseShopSummary {
  const groups = new Map<string, WarehouseShopSummary['shops'][number]>();
  const unconfirmed = sources.unconfirmed.filter(item => !item.warehouseId || item.warehouseId === locationId(warehouseId));
  for (const item of sources.confirmed.filter(item => item.warehouseId === locationId(warehouseId))) {
    if (skuId) {
      if (!item.listing.variant_mappings?.length) { unconfirmed.push({ listing: item.listing, shopName: item.shop.store_name, warehouseId, reason: 'This variant’s listing mapping has not been confirmed.' }); continue; }
      if (!item.listing.variant_mappings.some(mapping => mapping.master_sku_id === skuId)) continue;
    }
    const group = groups.get(item.shop.id) ?? { shop: item.shop, listings: [] };
    group.listings.push(item);
    groups.set(item.shop.id, group);
  }
  return { shops: [...groups.values()].sort((a, b) => a.shop.store_name.localeCompare(b.shop.store_name)), unconfirmed };
}
