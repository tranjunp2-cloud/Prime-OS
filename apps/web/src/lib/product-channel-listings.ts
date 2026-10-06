import type { CatalogImportItem } from './catalog-import-store';
import type { ChannelListing } from './product-store';

/** A channel configuration never takes ownership of a link-only imported listing. */
export function configuredListing(listings: readonly ChannelListing[], channel: ChannelListing['channel'], sku: string) {
  const candidates = listings.filter(listing => listing.channel === channel && !listing.publication_unconfirmed && !listing.creation_config);
  const exact = candidates.filter(listing => sku.trim() && (listing.shop_sku === sku.trim() || listing.external_id === sku.trim()));
  if (exact.length === 1) return exact[0];
  return candidates.length === 1 ? candidates[0] : undefined;
}

/** Import details must belong to this exact shop listing, not just its channel or SKU. */
export function importedListingDetails(listing: ChannelListing, items: readonly CatalogImportItem[]) {
  if (!listing.external_id || !listing.store_name) return undefined;
  const matches = items.filter(item => item.channel === listing.channel && item.storeName === listing.store_name && item.listingId === listing.external_id);
  return matches.length === 1 ? matches[0] : undefined;
}
