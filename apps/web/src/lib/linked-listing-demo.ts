import type { Product, ShopListingSnapshot } from './product-store';

const images = ['/images/products/B0G5Y7YCDD/1.jpg', '/images/products/demo-complete/art-detail.svg', '/images/products/demo-complete/art-package.svg'];
const description = 'Set of 10 Japanese mythical creature art prints on paper. Includes Kappa, Tengu, Kitsune, Tanuki and other traditional motifs. Supplied as ten unframed sheets. Sample listing content for the PrimeOS prototype.';
const fixtures: Array<Pick<ShopListingSnapshot, 'channel' | 'store_name' | 'listing_id' | 'shop_sku' | 'title' | 'category' | 'price' | 'stock'>> = [
  { channel: 'shopee', store_name: 'Prime Beauty Official', listing_id: 'SHP-TEST2-MYTH', shop_sku: 'SHP-TEST2-MYTH-10', title: 'Japanese Mythical Creatures Art Collection · 10 Sheets', category: 'Home Decor > Art Prints', price: { amount: 3200, currency: 'JPY' }, stock: 52 },
  { channel: 'amazon', store_name: 'Prime Beauty US', listing_id: 'DEMO-AMZ-TEST2-MYTH', shop_sku: 'AMZ-TEST2-MYTH-10', title: 'Japanese Mythical Creatures Traditional Art Prints · Set of 10', category: 'Home & Kitchen > Wall Art', price: { amount: 22, currency: 'USD' }, stock: 268 },
  { channel: 'rakuten', store_name: 'Prime Beauty JP', listing_id: 'DEMO-RKT-TEST2-MYTH', shop_sku: 'RKT-TEST2-MYTH-10', title: 'Japanese Mythical Art Print Collection · 10 Sheets', category: 'Interior > Art Prints', price: { amount: 1980, currency: 'JPY' }, stock: 44 },
];

/** Repair only the three shipped identity-only demo records. Never fabricate
 * provider values for user products or replace an existing snapshot/edit. */
export function completeLinkedListingDemo(product: Product): Product {
  if (product.id !== 'prod_import_test_matched_02' || product.sku_code !== 'TEST2-MYTH-ART-10') return product;
  let changed = false;
  const channels = product.channels.map(listing => {
    const fixture = fixtures.find(item => item.channel === listing.channel && item.listing_id === listing.external_id && item.store_name === listing.store_name);
    if (!fixture || listing.shop_snapshot || listing.local_draft || listing.review_pending || listing.creation_config
      || listing.publication_unconfirmed || listing.shop_sku !== undefined || listing.reported_stock !== undefined) return listing;
    changed = true;
    const snapshot: ShopListingSnapshot = { ...fixture, origin: 'prototype', description, brand: 'CYBER-RECORDS', images: [...images], variant_count: 1,
      shipping: { length: 32, width: 23, height: 2, weight: 240, country: 'JP' },
      channel_settings: { condition: 'New', attribute_material: 'Paper', tax_code: 'Standard taxable goods' },
      requirements: { channel: fixture.channel, category: fixture.category, revision: 'prototype-linked-art-v1', origin: 'prototype', fields: [
        { key: 'title', label: 'Title', kind: 'text' }, { key: 'description', label: 'Description', kind: 'text' },
        { key: 'category', label: 'Category', kind: 'text' }, { key: 'images', label: 'Images', kind: 'images' },
      ] }, recorded_at: '2026-10-15T00:00:00Z' };
    return { ...listing, shop_sku: fixture.shop_sku, reported_stock: fixture.stock, shop_snapshot: snapshot };
  });
  return changed ? { ...product, channels } : product;
}
