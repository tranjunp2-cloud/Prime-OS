import { getCatalogImportItems, type CatalogImportItem } from './catalog-import-store';
import type { ConnectedChannelRecord } from './channel-integrations-api';
import { demoConnectedChannels } from './channel-integrations-demo';
import { resolveListingShopData } from './listing-shop-data';
import type { OrderLine, OrderRecord } from './orders-api';
import { pendingMappingReviews } from './product-listing-intake';
import { getProducts, type ChannelListing, type Product } from './product-store';
import { readConnectedShops } from './shop-warehouse-settings';
import { resolveListingStockSource } from './warehouse-shop-sources';
import { getWarehouseById } from './warehouse-store';

/** Which relationship is missing: ① listing ↔ Master SKU, ② shop ↔ warehouse, ③ stock at that warehouse. */
export type OrderLineGap = 'mapping' | 'warehouse' | 'stock';
export type OrderLineResolution =
  | { status: 'unchecked' }
  | { status: 'ready'; product: Product; listing: ChannelListing; skuId?: string; warehouseId: string; available: number }
  | { status: 'blocked'; gap: OrderLineGap; reason: string; product?: Product; listing?: ChannelListing; warehouseId?: string };
export type OrderCatalogContext = { products: Product[]; shops: ConnectedChannelRecord[]; imports: readonly CatalogImportItem[] };

// Orders before preparation still need a stock source; later stages already have one.
const AWAITING_PREPARATION = ['created', 'acknowledged', 'allocated'];
const key = (value?: string) => value?.trim().toLocaleLowerCase() ?? '';
const channelKey = (platform?: string) => {
  const value = key(platform).replace(/[\s_-]+/g, '');
  return ({ tiktokshop: 'tiktok', primeweb: 'website', primepos: 'pos' } as Record<string, string>)[value] ?? value;
};

/** Prototype catalog state: saved Masters, the import queue and connected shops (demo shops until loaded). */
export function orderCatalogContext(): OrderCatalogContext {
  const connected = readConnectedShops();
  return {
    products: getProducts(),
    shops: connected.status === 'ready' && connected.shops.length ? connected.shops : demoConnectedChannels,
    imports: getCatalogImportItems({ requireConfirmation: true }),
  };
}

/** Resolve one order line through ① ② ③. Lines without a shop listing identity are not checked. */
export function resolveOrderLine(order: OrderRecord, line: OrderLine, context: OrderCatalogContext = orderCatalogContext()): OrderLineResolution {
  if (!line.listingId?.trim()) return { status: 'unchecked' };
  const channel = channelKey(order.metadata.platform);
  const shop = key(order.metadata.storeName);
  const label = line.shopSku || line.listingId;
  const owners = context.products.filter(product => product.status !== 'archived').flatMap(product => product.channels
    .filter(listing => listing.channel === channel && listing.external_id === line.listingId
      && key(resolveListingShopData(product, listing, context.imports).shop) === shop)
    .map(listing => ({ product, listing })));
  if (!owners.length) return { status: 'blocked', gap: 'mapping', reason: `Listing ${label} is not linked to a Product Master.` };
  if (owners.length > 1) return { status: 'blocked', gap: 'mapping', reason: `Listing ${label} is linked to more than one Product Master. Review its links.` };
  const { product, listing } = owners[0];
  const blocked = (gap: OrderLineGap, reason: string, warehouseId?: string) => ({ status: 'blocked', gap, reason, product, listing, warehouseId }) as const;
  if (listing.review_pending?.sku_mapping_pending) return blocked('mapping', `Confirm the SKU mapping for listing ${label}.`);
  const variant = product.has_variants || product.product_type === 'variant';
  const row = variant ? listing.variant_mappings?.find(mapping => key(mapping.shop_sku) === key(line.shopSku)) : undefined;
  const sku = variant ? product.skus.find(item => item.id === row?.master_sku_id && item.status === 'active') : undefined;
  if (variant && !sku) return blocked('mapping', `Shop SKU ${line.shopSku || '(missing)'} is not mapped to a Master SKU.`);
  const source = resolveListingStockSource(product, listing, context.shops, context.imports);
  if ('unconfirmed' in source) return blocked('warehouse', source.unconfirmed.reason, source.unconfirmed.warehouseId);
  const warehouseId = source.confirmed.warehouseId;
  // A Draft Master may fulfil orders; only the mapped SKU's stock at this warehouse matters.
  const available = (sku ? sku.stock_by_location?.[warehouseId] : product.inventory?.[warehouseId]) ?? 0;
  if (available < line.quantity) {
    const name = getWarehouseById(warehouseId)?.name ?? warehouseId;
    return blocked('stock', `${name} has ${available} of ${line.quantity} units of ${sku?.sku_code ?? product.sku_code}.`, warehouseId);
  }
  return { status: 'ready', product, listing, skuId: sku?.id, warehouseId, available };
}

/** Blocked lines while the order still awaits preparation. One blocked line holds the whole order. */
export function orderMappingIssues(order: OrderRecord, context?: OrderCatalogContext) {
  if (!AWAITING_PREPARATION.includes(order.canonicalStatus) || !order.lines?.some(line => line.listingId?.trim())) return [];
  const resolved = context ?? orderCatalogContext();
  return order.lines.flatMap(line => {
    const resolution = resolveOrderLine(order, line, resolved);
    return resolution.status === 'blocked' ? [{ line, resolution }] : [];
  });
}

/** The listing to open in the Master review for a mapping gap, if one is reviewable. */
export function orderLineReviewListing(order: OrderRecord, line: OrderLine, context: OrderCatalogContext = orderCatalogContext()): CatalogImportItem | undefined {
  const channel = channelKey(order.metadata.platform);
  const matches = (item: CatalogImportItem) => item.channel === channel && item.listingId === line.listingId && key(item.storeName) === key(order.metadata.storeName);
  return pendingMappingReviews(context.products, [...context.imports]).find(matches)
    ?? context.imports.find(item => matches(item) && !item.confirmed && item.resolution !== 'ignore');
}
