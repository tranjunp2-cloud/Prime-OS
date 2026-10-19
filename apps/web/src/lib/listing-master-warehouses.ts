import type { CatalogImportItem } from './catalog-import-store';
import type { ConnectedChannelRecord } from './channel-integrations-api';
import type { Product } from './product-store';
import { canonicalShopWarehouseId, knownConnectedShops, merchantWarehouses } from './shop-warehouse-settings';
import { canEditWarehouseStock } from './warehouse-stock-view';
import { shopsForListing } from './warehouse-shop-sources';

/** Warehouses a new Master can be stocked in: active, physical and editable by the merchant. */
export const assignableMasterWarehouses = () => merchantWarehouses().filter(warehouse => canEditWarehouseStock(warehouse.id));

/** Default stock warehouses: where the selected listings' shops fulfil orders. */
export function listingShopWarehouseIds(sources: readonly CatalogImportItem[], shops: ConnectedChannelRecord[] = knownConnectedShops()) {
  const assignable = new Set(assignableMasterWarehouses().map(warehouse => warehouse.id));
  const ids = sources.flatMap(source => {
    const matches = shopsForListing(source.channel, source.storeName, shops);
    const id = matches.length === 1 ? matches[0].warehouse?.id : undefined;
    return id ? [canonicalShopWarehouseId(id)] : [];
  });
  return [...new Set(ids)].filter(id => assignable.has(id));
}

/** Assign a new Master to warehouses with an opening count of 0. Shop stock is never copied. */
export function withMasterWarehouses(product: Product, warehouseIds: readonly string[]): Product {
  const locations = Object.fromEntries([...new Set(warehouseIds)].map(id => [id, 0]));
  const variant = product.has_variants || product.product_type === 'variant';
  return { ...product, inventory: { ...locations },
    skus: variant ? product.skus.map(sku => sku.status === 'active' ? { ...sku, stock_by_location: { ...locations } } : sku) : product.skus };
}
