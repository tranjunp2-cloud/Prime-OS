import type { CatalogImportItem } from './catalog-import-store';
import type { ChannelListing, ChannelOverride, Product, ShopListingSnapshot } from './product-store';
import { configuredListing } from './product-channel-listings';

const validNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const validDate = (value?: string) => value && Number.isFinite(Date.parse(value)) ? value : undefined;
export function recordedListingPrice(amount: unknown, currency: unknown) {
  return validNumber(amount) && typeof currency === 'string' && /^[A-Z]{3}$/.test(currency.trim().toUpperCase())
    ? { amount, currency: currency.trim().toUpperCase() } : undefined;
}

export function savedListingPrice(override?: ChannelOverride): ListingShopData['price'] {
  const price = recordedListingPrice(override?.channel_price, override?.channel_currency)
    ?? (override?.pricing_source === 'manual' && override.manual_price?.trim()
      ? recordedListingPrice(Number(override.manual_price), override.channel_currency) : undefined)
    ?? (override?.listing_mode === 'manual' && !override.pricing_source && override.price_markup > 0
      ? recordedListingPrice(override.price_markup, override.channel_currency) : undefined);
  return price ? { ...price, origin: 'saved' } : undefined;
}

/** Keep the source with the relationship, even if the transient review queue is later cleared. */
export function snapshotShopListing(item: CatalogImportItem, recordedAt = new Date().toISOString()): ShopListingSnapshot {
  const shipping = { ...Object.fromEntries(['length', 'width', 'height', 'weight'].flatMap(key => {
    const value = item[`pkg_${key}` as 'pkg_length'];
    return validNumber(value) && value > 0 ? [[key, value]] : [];
  })), ...item.shipping };
  return {
    channel: item.channel, store_name: item.storeName, listing_id: item.listingId, shop_sku: item.channelSku,
    title: item.title, description: item.description, brand: item.brand,
    images: [...new Set([item.image, ...(item.images ?? [])].filter(image => typeof image === 'string' && Boolean(image.trim())))],
    category: item.channelCategory, price: recordedListingPrice(item.price, item.currency),
    stock: validNumber(item.channelStock) ? item.channelStock : undefined,
    shipping: Object.keys(shipping).length ? shipping : undefined,
    channel_settings: item.channelSettings ? { ...item.channelSettings } : undefined,
    variant_items: item.variantItems?.map(variant => ({ ...variant, price: recordedListingPrice(variant.price?.amount, variant.price?.currency), stock: validNumber(variant.stock) ? variant.stock : undefined })),
    variant_count: item.variants,
    listing_url: item.listingUrl,
    identifiers: { gtin: item.gtin, mpn: item.mpn, model: item.modelNumber },
    retrieved_at: validDate(item.retrievedAt), recorded_at: recordedAt,
  };
}

// Older snapshots omitted detail fields. Enrich only the same source revision;
// an older or undated queue must never replace a newer provider snapshot.
function enrichSnapshot(saved: ShopListingSnapshot, source?: CatalogImportItem): ShopListingSnapshot {
  if (!source || source.retrievedAt !== saved.retrieved_at || source.title !== saved.title
    || source.channelSku !== saved.shop_sku || source.price !== saved.price?.amount || source.currency !== saved.price?.currency
    || source.channelStock !== saved.stock) return saved;
  const incoming = snapshotShopListing(source, saved.recorded_at);
  const additions = Object.fromEntries((['shipping', 'channel_settings', 'variant_items', 'variant_count', 'listing_url', 'identifiers'] as const)
    .filter(key => saved[key] === undefined && incoming[key] !== undefined).map(key => [key, incoming[key]]));
  return Object.keys(additions).length ? { ...saved, ...additions } : saved;
}

function ownOverride(product: Product, listing: ChannelListing): ChannelOverride | undefined {
  if (listing.creation_config) return listing.creation_config;
  const override = product.channel_overrides?.[listing.channel === 'website' ? 'webstore' : listing.channel];
  if (!override?.enabled) return undefined;
  if (listing.store_name && override?.pricing_shop_label && listing.store_name !== override.pricing_shop_label) return undefined;
  return configuredListing(product.channels, listing.channel, override?.listing_sku || '') === listing ? override : undefined;
}

/** Old records may lack a shop name. Recover only from one exact provider ID, never from a SKU or channel alone. */
export function listingImportSource(product: Product, listing: ChannelListing, items: readonly CatalogImportItem[]) {
  if (!listing.external_id) return undefined;
  const matches = items.filter(item => item.channel === listing.channel && item.listingId === listing.external_id
    && (!listing.store_name || item.storeName === listing.store_name));
  if (matches.length !== 1) return undefined;
  const source = matches[0];
  if (!listing.store_name) {
    const shop = ownOverride(product, listing)?.pricing_shop_label;
    if (shop && shop !== source.storeName) return undefined;
    const provenance = (product.import_sources ?? []).filter(record => record.channel === listing.channel);
    if (provenance.length && !provenance.some(record => record.store === source.storeName)) return undefined;
  }
  return source;
}

function ownSnapshot(listing: ChannelListing) {
  const snapshot = listing.shop_snapshot;
  return snapshot && listing.external_id && snapshot.channel === listing.channel && snapshot.listing_id === listing.external_id
    && (!listing.store_name || snapshot.store_name === listing.store_name) ? snapshot : undefined;
}

/** Legacy provenance did not include listing IDs. Use it only if one relationship can own it. */
function ownProvenance(product: Product, listing: ChannelListing) {
  const shop = listing.store_name || ownSnapshot(listing)?.store_name || ownOverride(product, listing)?.pricing_shop_label;
  const candidates = (product.import_sources ?? []).filter(record => record.channel === listing.channel && (!shop || record.store === shop));
  const exact = candidates.filter(record => record.listing_id && record.listing_id === listing.external_id);
  if (exact.length) return exact.length === 1 ? exact[0] : undefined;
  const unscoped = candidates.filter(record => !record.listing_id);
  const possibleOwners = product.channels.filter(link => link.channel === listing.channel && (!shop || !link.store_name || link.store_name === shop));
  return unscoped.length === 1 && possibleOwners.length === 1 ? unscoped[0] : undefined;
}

export interface ListingShopData {
  shop?: string;
  sku?: string;
  title?: string;
  description?: string;
  brand?: string;
  category?: string;
  images?: string[];
  price?: { amount: number; currency: string; origin: 'shop' | 'saved' | 'demo' };
  stock?: number;
  shipping?: ShopListingSnapshot['shipping'];
  channelSettings?: ShopListingSnapshot['channel_settings'];
  variants?: ShopListingSnapshot['variant_items'];
  variantCount?: number;
  listingUrl?: string;
  identifiers?: ShopListingSnapshot['identifiers'];
  retrievedAt?: string;
  recordedAt?: string;
}

/** A single read model for the table, read-only details and sync preview. No Master fallbacks. */
export function resolveListingShopData(product: Product, listing: ChannelListing, items: readonly CatalogImportItem[]): ListingShopData {
  const source = listingImportSource(product, listing, items);
  const persisted = ownSnapshot(listing);
  // An undated queue entry must not replace a durable snapshot with potentially older values.
  const newer = source?.retrievedAt && validDate(source.retrievedAt)
    && (!persisted?.retrieved_at || Date.parse(source.retrievedAt) > Date.parse(persisted.retrieved_at));
  const snapshot = source && (!persisted || newer) ? snapshotShopListing(source) : persisted ? enrichSnapshot(persisted, source) : undefined;
  const override = ownOverride(product, listing);
  const provenance = ownProvenance(product, listing);
  const shopPrice = recordedListingPrice(snapshot?.price?.amount, snapshot?.price?.currency)
    ?? recordedListingPrice(provenance?.price, provenance?.currency);
  const savedPrice = savedListingPrice(override);
  return {
    shop: listing.store_name || snapshot?.store_name || provenance?.store,
    sku: listing.shop_sku || snapshot?.shop_sku || override?.listing_sku || provenance?.shop_sku,
    title: snapshot?.title || override?.title,
    description: snapshot?.description ?? override?.description,
    brand: snapshot?.brand ?? provenance?.brand ?? override?.brand,
    category: snapshot?.category ?? override?.category,
    images: snapshot?.images,
    shipping: snapshot?.shipping,
    channelSettings: snapshot?.channel_settings,
    variants: snapshot?.variant_items,
    variantCount: snapshot?.variant_count,
    listingUrl: snapshot?.listing_url || listing.listing_url || source?.listingUrl,
    identifiers: snapshot?.identifiers,
    price: shopPrice ? { ...shopPrice, origin: 'shop' } : savedPrice,
    stock: validNumber(snapshot?.stock) ? snapshot.stock : validNumber(listing.reported_stock) ? listing.reported_stock : undefined,
    retrievedAt: validDate(snapshot?.retrieved_at),
    // Only a persisted snapshot has a meaningful local capture time during a read.
    recordedAt: validDate(persisted?.recorded_at),
  };
}

/** Safe, idempotent backfill: adds source snapshots only; does not touch lifecycle, sync or Master data. */
export function recoverListingShopSnapshots(product: Product, items: readonly CatalogImportItem[]) {
  let changed = false;
  const channels = product.channels.map(listing => {
    const source = listingImportSource(product, listing, items);
    const saved = ownSnapshot(listing);
    const newer = source?.retrievedAt && validDate(source.retrievedAt)
      && (!saved?.retrieved_at || Date.parse(source.retrievedAt) > Date.parse(saved.retrieved_at));
    if (!source) return listing;
    if (saved && !newer) {
      const enriched = enrichSnapshot(saved, source);
      if (enriched === saved) return listing;
      changed = true;
      return { ...listing, shop_snapshot: enriched };
    }
    changed = true;
    return { ...listing, shop_snapshot: snapshotShopListing(source) };
  });
  return changed ? { ...product, channels } : product;
}
