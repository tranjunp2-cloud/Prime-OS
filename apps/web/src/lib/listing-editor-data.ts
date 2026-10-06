import { getCatalogImportItems } from './catalog-import-store';
import { listingEditableValues } from './listing-local-draft';
import { listingMasterSync, syncListingOverride, syncsField } from './listing-master-sync';
import { resolveListingShopData } from './listing-shop-data';
import { listingDetailDemoValues, listingDetailDemoMetadata } from './listing-shop-demo';
import type { ChannelListing, ListingDraftValues, Product } from './product-store';

export type ListingValueSource = 'master' | 'demo' | 'draft' | 'saved';
const missing = (value: unknown) => value === undefined || value === null || (typeof value === 'string' && !value.trim()) || (Array.isArray(value) && !value.length);

/** Editor-only read model. Actual recorded values always win; previews never enter a shop snapshot. */
export function listingEditorData(product: Product, listing: ChannelListing) {
  const recorded = listingEditableValues(product, listing);
  const rawMetadata = resolveListingShopData(product, listing, getCatalogImportItems({ requireConfirmation: true }));
  const demo = listing.creation_config ? undefined : listingDetailDemoValues(product, listing, rawMetadata);
  const demoMetadata = listing.creation_config ? undefined : listingDetailDemoMetadata(product, listing, rawMetadata);
  const metadata = { ...rawMetadata, sku: rawMetadata.sku || demoMetadata?.sku,
    identifiers: { gtin: rawMetadata.identifiers?.gtin || demoMetadata?.identifiers.gtin,
      mpn: rawMetadata.identifiers?.mpn || demoMetadata?.identifiers.mpn, model: rawMetadata.identifiers?.model || demoMetadata?.identifiers.model } };
  const preference = listingMasterSync(listing, syncListingOverride(product, listing));
  const master: ListingDraftValues = {
    ...(syncsField(preference, 'content') ? { title: product.name, description: product.description, brand: product.brand } : {}),
    ...(syncsField(preference, 'media') ? { images: product.images } : {}),
    ...(syncsField(preference, 'shipping') ? { shipping: {
      length: product.pkg_length > 0 ? product.pkg_length : undefined, width: product.pkg_width > 0 ? product.pkg_width : undefined,
      height: product.pkg_height > 0 ? product.pkg_height : undefined, weight: product.pkg_weight > 0 ? product.pkg_weight : undefined,
      country: product.country_of_origin, hs_code: product.hs_code,
    } } : {}),
  };
  const sources: Record<string, ListingValueSource> = {};
  const values: ListingDraftValues = { ...recorded };
  for (const key of ['title', 'description', 'brand', 'category', 'images', 'price', 'stock'] as const) {
    // An explicit empty local value is still a user choice, not an invitation to refill.
    if (listing.local_draft?.values[key] !== undefined) sources[key] = 'draft';
    else if (missing(recorded[key]) || (key === 'images' && recorded.images?.every(image => demoMetadata?.brokenImages.includes(image)))) {
      const source = !missing(demo?.[key]) ? 'demo' : !missing(master[key]) ? 'master' : undefined;
      if (source) { Object.assign(values, { [key]: source === 'master' ? master[key] : demo?.[key] }); sources[key] = source; }
    }
  }
  for (const group of ['shipping', 'channel_settings'] as const) {
    const current = recorded[group] ?? {};
    const defaults = { ...demo?.[group], ...master[group] };
    const result: Record<string, unknown> = { ...current };
    for (const key of new Set([...Object.keys(current), ...Object.keys(defaults)])) {
      const own = listing.local_draft?.values[group] as Record<string, unknown> | undefined;
      const path = `${group}.${key}`;
      if (own?.[key] !== undefined) sources[path] = 'draft';
      else if (missing(current[key as keyof typeof current])) {
        const masterValue = (master[group] as Record<string, unknown> | undefined)?.[key];
        const demoValue = (demo?.[group] as Record<string, unknown> | undefined)?.[key];
        if (!missing(demoValue)) { result[key] = demoValue; sources[path] = 'demo'; }
        else if (!missing(masterValue)) { result[key] = masterValue; sources[path] = 'master'; }
      }
    }
    Object.assign(values, { [group]: Object.keys(result).length ? result : undefined });
  }
  if (!sources.price && recorded.price && (metadata.price?.origin === 'saved' || recorded.price.amount !== metadata.price?.amount)) sources.price = 'saved';
  if (!sources.stock && recorded.stock !== undefined && metadata.stock === undefined) sources.stock = 'saved';
  return { recorded, values, sources, metadata, demoMetadata,
    listingId: listing.external_id || demoMetadata?.listingId,
    fulfillment: syncListingOverride(product, listing)?.fulfillment || demoMetadata?.fulfillment,
    hasDemo: Boolean(demoMetadata) || Object.values(sources).includes('demo'), hasMasterPreview: Object.values(sources).includes('master') };
}
