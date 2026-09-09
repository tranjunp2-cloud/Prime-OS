import type { Product } from './product-store';

export type AmazonFulfillment = 'FBA' | 'FBM';
export type AmazonListingSyncStatus = 'draft' | 'queued' | 'syncing' | 'synced' | 'error';

export interface AmazonListingDraft {
  productId: string;
  title: string;
  bulletPoints: string[];
  searchTerms: string;
  category: string;
  fulfillment: AmazonFulfillment;
  condition: string;
  price: number;
  quantity: number;
  asin: string;
  status: AmazonListingSyncStatus;
  lastSyncedAt: string | null;
  lastError: string | null;
  updatedAt: string;
}

const STORAGE_KEY = 'primeos.amazon-listing-overrides.v1';

function readAll(): Record<string, AmazonListingDraft> {
  if (typeof window === 'undefined') return {};
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}');
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
}

function writeAll(listings: Record<string, AmazonListingDraft>) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(listings));
}

export function createAmazonListingDraft(product: Product): AmazonListingDraft {
  const amazonOverride = product.channel_overrides?.amazon;
  const available = Object.values(product.inventory ?? {}).reduce((sum, value) => sum + Number(value || 0), 0);
  return {
    productId: product.id,
    title: amazonOverride?.title || product.name,
    bulletPoints: [
      product.description.slice(0, 180),
      product.brand ? `Made by ${product.brand}` : '',
      product.country_of_origin ? `Country of origin: ${product.country_of_origin}` : '',
      product.pkg_weight ? `Package weight: ${product.pkg_weight} g` : '',
      '',
    ],
    searchTerms: [product.brand, product.category, product.sku_code].filter(Boolean).join(' '),
    category: product.category,
    fulfillment: 'FBA',
    condition: product.condition || 'new',
    price: product.retail_price,
    quantity: available,
    asin: product.asin || '',
    status: 'draft',
    lastSyncedAt: null,
    lastError: null,
    updatedAt: new Date().toISOString(),
  };
}

export function getAmazonListing(product: Product): AmazonListingDraft {
  return readAll()[product.id] ?? createAmazonListingDraft(product);
}

export function getSavedAmazonListing(productId: string): AmazonListingDraft | null {
  return readAll()[productId] ?? null;
}

/** Prototype API boundary: this mutation only touches the Amazon listing record. */
export function updateAmazonListing(productId: string, patch: Partial<AmazonListingDraft>): AmazonListingDraft {
  const listings = readAll();
  const current = listings[productId];
  if (!current) throw new Error('Save the Amazon listing draft before updating its sync state.');
  const next = { ...current, ...patch, productId, updatedAt: new Date().toISOString() };
  writeAll({ ...listings, [productId]: next });
  return next;
}

export function saveAmazonListing(listing: AmazonListingDraft): AmazonListingDraft {
  const next = { ...listing, status: listing.status === 'synced' ? 'draft' : listing.status, updatedAt: new Date().toISOString() };
  writeAll({ ...readAll(), [listing.productId]: next });
  return next;
}
