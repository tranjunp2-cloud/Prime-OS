import { listingEditSnapshot } from './listing-local-draft';
import { listingSyncIdentity, syncListingOverride } from './listing-master-sync';
import { getProductById, updateProductLinksAtomically, type ChannelListing } from './product-store';
import { getCatalogImportItems, saveCatalogImportItems } from './catalog-import-store';

/** Remove one local relationship, never a shop listing or another shop's configuration. */
export function unlinkListingFromMaster(productId: string, target: ChannelListing, expectedSnapshot: string) {
  const product = getProductById(productId);
  if (!product || product.status === 'archived') throw new Error('This Master is no longer editable.');
  const matches = product.channels.filter(listing => listingSyncIdentity(listing) === listingSyncIdentity(target));
  if (matches.length !== 1 || listingEditSnapshot(product, matches[0]) !== expectedSnapshot) throw new Error('This listing changed. Close and reopen the confirmation.');
  const listing = matches[0];
  const overrideKey = listing.channel === 'website' ? 'webstore' : listing.channel;
  const ownedOverride = listing.creation_config ? undefined : syncListingOverride(product, listing);
  const overrides = { ...product.channel_overrides };
  if (ownedOverride) overrides[overrideKey] = { ...ownedOverride, enabled: false };
  const items = getCatalogImportItems({ requireConfirmation: true });
  const sources = items.filter(item => item.channel === listing.channel && item.listingId === listing.external_id
    && (!listing.store_name || item.storeName === listing.store_name));
  const source = sources.length === 1 ? sources[0] : undefined;
  // Queue first: the still-existing relationship remains authoritative until
  // the product commit succeeds, so an interrupted write cannot create two owners.
  if (source) saveCatalogImportItems(items.map(item => item === source ? { ...item, confirmed: false, resolvedProductId: undefined, resolution: 'later' } : item));
  try { updateProductLinksAtomically([{
    id: product.id, channels: product.channels.filter(item => item !== listing),
    import_sources: product.import_sources, record_version: (product.record_version ?? 1) + 1,
    ...(ownedOverride ? { channel_overrides: overrides } : {}),
  }]); } catch (error) {
    if (source) { try { saveCatalogImportItems(items); } catch { /* The intact relationship still prevents duplicate mapping. */ } }
    throw error;
  }
  return ownedOverride ? overrideKey : undefined;
}
