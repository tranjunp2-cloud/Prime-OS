import type { ConnectedChannelRecord } from './channel-integrations-api';
import type { Product } from './product-store';
import type { CatalogImportItem } from './catalog-import-store';
import { resolveListingShop } from './warehouse-shop-sources';
import { syncListingOverride } from './listing-master-sync';

/** Only count exact shop matches in the local catalog, never a platform-wide estimate. */
export function shopWarehouseImpact(products: Product[], shop: ConnectedChannelRecord, shops: ConnectedChannelRecord[], imports: readonly CatalogImportItem[] = []) {
  return products.filter(product => product.status !== 'archived').flatMap(product => product.channels
    .filter(listing => listing.status === 'active' && !listing.publication_unconfirmed && resolveListingShop(product, listing, shops, imports)?.id === shop.id)
    .map(listing => {
      const inventory = listing.master_data_sync?.inventory;
      const legacy = syncListingOverride(product, listing);
      const fba = listing.channel === 'amazon' && (inventory?.fulfillment ?? legacy?.fulfillment) === 'FBA';
      const group = fba || (inventory && inventory.source !== 'shop_default') ? 'own' as const
        : !inventory && legacy?.warehouse?.trim() ? 'review' as const : 'default' as const;
      return { id: `${product.id}:${listing.channel}:${listing.external_id}:${listing.shop_sku}`, name: product.name,
        sku: listing.shop_sku || product.sku_code, group,
        label: fba ? 'Amazon-managed stock' : group === 'own' ? 'Own stock source' : group === 'review' ? 'Saved source needs confirmation' : 'Uses shop default' };
    }));
}
