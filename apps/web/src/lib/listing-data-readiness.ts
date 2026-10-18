import type { CatalogImportItem } from './catalog-import-store';
import type { ListingShopData } from './listing-shop-data';
import { recordedListingPrice, snapshotShopListing } from './listing-shop-data';

const text = (value: unknown) => typeof value === 'string' && Boolean(value.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim());
// Variant detail gaps can be finished after a deferred link; base listing data cannot.
const SKU_DETAIL_FIELDS = ['SKU structure', 'Variant SKU details, prices & stock'];
const stock = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && Number.isInteger(value);

/** Linking requires the listing's own captured data, not Master fallbacks,
 * local edits or a publication status. Channel publishing rules are separate. */
export function listingDataReadiness(data: ListingShopData, listingId?: string | null) {
  const missing: string[] = [];
  if (!text(listingId)) missing.push('Listing ID');
  if (!text(data.shop)) missing.push('Shop');
  if (!text(data.sku)) missing.push('Shop SKU');
  if (!text(data.title)) missing.push('Title');
  if (!text(data.description)) missing.push('Description');
  if (!text(data.category)) missing.push('Category');
  if (!data.images?.some(text)) missing.push('Product image');
  if (!recordedListingPrice(data.price?.amount, data.price?.currency)) missing.push('Listing price & currency');
  if (!stock(data.stock)) missing.push('Shop stock');
  if (!Number.isInteger(data.variantCount) || !data.variantCount || data.variantCount < 1) missing.push('SKU structure');
  else if (data.variantCount > 1) {
    const variants = data.variants ?? [];
    if (variants.length !== data.variantCount || variants.some(item => !text(item.sku) || !text(item.label)
      || !recordedListingPrice(item.price?.amount, item.price?.currency) || !stock(item.stock))
      || new Set(variants.map(item => item.sku.trim().toUpperCase())).size !== variants.length) missing.push('Variant SKU details, prices & stock');
  }
  const baseMissing = missing.filter(field => !SKU_DETAIL_FIELDS.includes(field));
  return { ready: missing.length === 0, missing, message: missing.length ? `Missing listing data: ${missing.join(', ')}` : 'Listing data complete',
    /** Enough to save a deferred link; SKU details then stay pending for orders and sync. */
    baseReady: baseMissing.length === 0, baseMissing, skuMissing: missing.filter(field => SKU_DETAIL_FIELDS.includes(field)) };
}

export function importedListingDataReadiness(item: CatalogImportItem) {
  const snapshot = snapshotShopListing(item);
  return listingDataReadiness({ shop: snapshot.store_name, sku: snapshot.shop_sku, title: snapshot.title,
    description: snapshot.description, category: snapshot.category, images: snapshot.images,
    price: snapshot.price ? { ...snapshot.price, origin: 'shop' } : undefined, stock: snapshot.stock,
    variantCount: snapshot.variant_count, variants: snapshot.variant_items }, snapshot.listing_id);
}

export function assertListingDataComplete(items: readonly CatalogImportItem[], { allowIncompleteSkus = false } = {}) {
  for (const item of items) {
    const readiness = importedListingDataReadiness(item);
    const missing = allowIncompleteSkus ? readiness.baseMissing : readiness.missing;
    if (missing.length) throw new Error(`${item.storeName || 'Unknown shop'} · ${item.channelSku || item.listingId || 'Unknown listing'}: Missing listing data: ${missing.join(', ')}. Re-import the complete listing from its shop before linking.`);
  }
}
