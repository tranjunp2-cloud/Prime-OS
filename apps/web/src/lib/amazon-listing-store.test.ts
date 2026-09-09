// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { getAmazonListing, getSavedAmazonListing, saveAmazonListing, updateAmazonListing } from './amazon-listing-store';
import type { Product } from './product-store';

const product = {
  id: 'prod_amazon_test',
  name: 'Prime Test Product',
  sku_code: 'PRIME-TEST',
  brand: 'Prime',
  category: 'Office Products',
  description: 'A sufficiently useful master description for an Amazon listing.',
  condition: 'new',
  retail_price: 1200,
  country_of_origin: 'JP',
  pkg_weight: 250,
  inventory: { tokyo: 8 },
  asin: '',
  channel_overrides: {},
} as Product;

describe('amazon listing prototype store', () => {
  beforeEach(() => window.localStorage.clear());

  it('inherits initial values without mutating Product Master', () => {
    const listing = getAmazonListing(product);
    expect(listing.title).toBe(product.name);
    expect(listing.quantity).toBe(8);
    expect(getSavedAmazonListing(product.id)).toBeNull();
  });

  it('persists Amazon-only overrides and sync state across reads', () => {
    const saved = saveAmazonListing({ ...getAmazonListing(product), title: 'Amazon-only title' });
    updateAmazonListing(product.id, { status: 'queued' });

    expect(getSavedAmazonListing(product.id)).toMatchObject({ title: 'Amazon-only title', status: 'queued' });
    expect(saved.productId).toBe(product.id);
    expect(product.name).toBe('Prime Test Product');
  });
});
