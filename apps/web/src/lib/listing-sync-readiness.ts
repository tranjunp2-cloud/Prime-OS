import type { CatalogImportItem } from './catalog-import-store';
import type { ChannelListing, ListingDraftValues, Product } from './product-store';
import { checkListingRequirements } from './listing-requirements';
import { resolveListingShopData, snapshotShopListing } from './listing-shop-data';

/** Uses only this listing's snapshot/local edits. Master data applies only to followed groups. */
export function listingSyncReadiness(product: Product, listing: ChannelListing, items: readonly CatalogImportItem[] = [],
  preference = listing.master_data_sync, proposedValues?: ListingDraftValues) {
  const data = resolveListingShopData(product, listing, items);
  const saved = listing.local_draft?.values;
  const local = { ...saved, ...proposedValues, shipping: { ...saved?.shipping, ...proposedValues?.shipping }, channel_settings: { ...saved?.channel_settings, ...proposedValues?.channel_settings } };
  const values: ListingDraftValues = { ...data, ...local,
    shipping: { ...data.shipping, ...local?.shipping }, channel_settings: { ...data.channelSettings, ...local?.channel_settings } };
  const follows = (field: string) => preference?.enabled && preference.fields.includes(field as 'content');
  if (follows('content')) Object.assign(values, { title: product.name, description: product.description, brand: product.brand });
  if (follows('media')) values.images = product.images;
  if (follows('shipping')) values.shipping = { length: product.pkg_length, width: product.pkg_width, height: product.pkg_height, weight: product.pkg_weight, country: product.country_of_origin, hs_code: product.hs_code };
  const requirements = checkListingRequirements(listing.channel, data.requirements, values);
  const rows = listing.variant_mappings ?? [];
  const variant = product.has_variants || product.product_type === 'variant';
  const mappingPending = Boolean(listing.review_pending?.sku_mapping_pending)
    || (!variant && (data.variantCount ?? 1) > 1)
    || (variant && (!rows.length || data.variantCount !== rows.length
      || rows.some(row => !row.shop_sku.trim() || !product.skus.some(sku => sku.id === row.master_sku_id && sku.status === 'active'))
      || new Set(rows.map(row => row.shop_sku)).size !== rows.length || new Set(rows.map(row => row.master_sku_id)).size !== rows.length
      || data.variants?.some(sku => !rows.some(row => row.shop_sku === sku.sku))));
  const reasons = [
    ...(product.status !== 'published' ? ['Master is not Active'] : []),
    ...(mappingPending ? ['SKU mapping needs confirmation'] : []),
    ...(requirements.state !== 'complete' ? [requirements.message] : []),
  ];
  return { requirements, values, mappingPending, reasons, ready: !reasons.length,
    label: mappingPending ? 'Mapping unfinished' : requirements.state === 'blocked' ? 'Missing channel details'
      : requirements.state === 'unchecked' ? 'Requirements not checked' : product.status !== 'published' ? 'Master not Active' : 'Data ready' };
}

export function previewListing(source: CatalogImportItem, product: Product, mappings: ChannelListing['variant_mappings'], patch?: ListingDraftValues): ChannelListing {
  const existing = product.channels.find(link => link.channel === source.channel && link.external_id === source.listingId && (!link.store_name || link.store_name === source.storeName));
  return { ...existing, channel: source.channel, external_id: source.listingId, store_name: source.storeName,
    shop_sku: source.channelSku, shop_snapshot: snapshotShopListing(source), status: 'draft', last_synced_at: null, listing_url: null,
    review_pending: undefined, variant_mappings: mappings,
    ...(patch ? { local_draft: { values: { ...existing?.local_draft?.values, ...patch,
      shipping: { ...existing?.local_draft?.values.shipping, ...patch.shipping }, channel_settings: { ...existing?.local_draft?.values.channel_settings, ...patch.channel_settings } }, updated_at: '' } } : {}) };
}
