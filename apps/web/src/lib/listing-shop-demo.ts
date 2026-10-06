import type { ChannelListing, ListingDraftValues, Product } from './product-store';
import type { ListingShopData } from './listing-shop-data';
import { configuredListing } from './product-channel-listings';

// Presentation-only fixtures for the original tailoring demo. Never persisted as
// shop snapshots or used to calculate pricing, inventory, or outbound sync.
const fixtures = {
  website: { shops: ['primebeauty.vn', 'PrimeWeb'], sku: 'WEB-CR-TAI-BSZ', price: 750000, currency: 'VND', stock: 24 },
  lazada: { shops: ['Prime Flagship Store · MY', 'Prime Flagship Store'], sku: 'CR-TAI-BSZ', price: 129, currency: 'MYR', stock: 13 },
  rakuten: { shops: ['Prime Beauty JP'], sku: 'RKT-CR-TAI-BSZ', price: 4200, currency: 'JPY', stock: 9 },
} as const;

function demoFixture(product: Product, listing: ChannelListing, data: ListingShopData) {
  if (product.id !== 'prod_005' || product.sku_code !== 'CR-TAI-BSZ'
    || listing.publication_unconfirmed || listing.shop_snapshot || data.price?.origin === 'shop'
    || data.retrievedAt || data.recordedAt) return;
  const fixture = fixtures[listing.channel as keyof typeof fixtures];
  if (!fixture) return;
  const override = product.channel_overrides?.[listing.channel === 'website' ? 'webstore' : listing.channel];
  if (!override?.enabled || configuredListing(product.channels, listing.channel, override.listing_sku || '') !== listing) return;
  const shop = data.shop || override.pricing_shop_label;
  if ((shop && !(fixture.shops as readonly string[]).includes(shop)) || (data.sku && data.sku !== fixture.sku)) return;
  return fixture;
}

export function listingShopDemoData(product: Product, listing: ChannelListing, data: ListingShopData): { data: ListingShopData; demo: boolean } {
  const unchanged = { data, demo: false };
  const fixture = demoFixture(product, listing, data);
  if (!fixture) return unchanged;
  if (data.price && data.stock != null) return unchanged;
  return {
    demo: true,
    data: {
      ...data,
      sku: data.sku || fixture.sku,
      price: data.price ?? { amount: fixture.price, currency: fixture.currency, origin: 'demo' },
      stock: data.stock ?? fixture.stock,
    },
  };
}

/** Complete sample content for known legacy demo rows, not a provider receipt. */
export function listingDetailDemoValues(product: Product, listing: ChannelListing, data: ListingShopData): ListingDraftValues | undefined {
  const fixture = demoFixture(product, listing, data);
  if (!fixture) return importedDetailFixture(product, listing, data)?.values;
  return {
    title: 'Traditional Japanese Precision Tailoring Set', brand: 'CYBER-RECORDS',
    description: 'A compact tailoring set inspired by traditional Japanese craftsmanship. Includes a fabric marker, stitch unpicker, thimble and measuring tape.\n\nDesigned for garment repairs, sewing projects and everyday tailoring. Store tools in a dry place after use.',
    category: listing.channel === 'website' ? 'Art Supplies / Sewing & Tailoring' : listing.channel === 'lazada' ? 'Stationery & Craft / Sewing Tools' : 'Handicrafts / Sewing Tools',
    images: [1, 2, 3].map(index => `/images/products/B0FH6LHSXD/${index}.jpg`),
    price: { amount: fixture.price, currency: fixture.currency }, stock: fixture.stock,
    shipping: { length: 14, width: 10, height: 4, weight: 160, country: 'JP', hs_code: '9017200000', notes: 'Pack tools securely and protect sharp ends during shipping.' },
    channel_settings: { condition: 'New', attribute_material: 'Stainless steel / ABS', attribute_color: 'Pink', tax_code: 'Standard taxable goods',
      ...(listing.channel === 'website' ? { web_slug: '/products/traditional-japanese-precision-tailoring-set', visibility: 'Visible in online store' } : {}),
      ...(listing.channel === 'lazada' ? { warranty: 'No warranty' } : {}),
    },
  };
}

const scissorsGallery = [1, 2, 3].map(index => `/images/products/B0FH6LHSXD/${index}.jpg`);
const paletteGallery = ['front', 'detail', 'package'].map(view => `/images/products/demo-complete/palette-${view}.svg`);
const importedDetails = [
  {
    channel: 'lazada', shop: 'Prime Flagship Store', id: 'LZD-1023492', sku: 'CR-TAI-BSZ-JP',
    title: 'Traditional Japanese Precision Tailoring Scissors',
    identifiers: { gtin: '4901234567894', mpn: 'TAI-SNIP-PINK', model: 'Tailoring Snips 2026' }, fulfillment: 'Seller fulfilled',
    brokenImages: ['/images/products/B0G432Z35M/1.jpg'],
    values: {
      title: 'Traditional Japanese Precision Tailoring Scissors', brand: 'Kai Industries', category: 'Home & Living > Sewing Tools',
      description: 'Compact Japanese-style tailoring snips for clean, precise thread trimming. The spring-action handle is comfortable to use for sewing, embroidery and garment repairs.\n\nIncludes one pair of pink-handled thread snips with stainless-steel blades and a protective sleeve. Keep dry after use and store away from children.',
      images: scissorsGallery, price: { amount: 4200, currency: 'JPY' }, stock: 0,
      shipping: { length: 14, width: 10, height: 4, weight: 160, country: 'JP', hs_code: '821300', notes: 'Protect the blades with the supplied sleeve and secure the product inside its retail packaging.' },
      channel_settings: { condition: 'New', warranty: 'No warranty', attribute_material: 'Stainless steel / ABS', attribute_color: 'Pink', tax_code: 'Standard taxable goods' },
    },
  },
  {
    channel: 'amazon', shop: 'Prime Beauty US', id: 'B0NEWPAL24', sku: 'AMZ-WC-PALETTE-24',
    title: 'Watercolor Travel Palette 24 Colors',
    identifiers: { gtin: '4901234567900', mpn: 'WC-TRAVEL-24', model: 'Travel Palette 24' }, fulfillment: 'Seller fulfilled (FBM)',
    brokenImages: [],
    values: {
      title: 'Watercolor Travel Palette 24 Colors', brand: 'Mijello', category: 'Arts, Crafts & Sewing > Paints',
      description: 'A portable watercolor set with 24 individual colors in a compact travel case. The folding lid provides mixing space, while the removable half pans make it easy to organize and replace your favorite colors.\n\nSuitable for sketchbooks, travel journals and watercolor paper. Includes 24 watercolor half pans and one reusable case. Brush and paper are not included. Allow the pans to dry before closing the lid.',
      images: paletteGallery, price: { amount: 29, currency: 'USD' }, stock: 18,
      shipping: { length: 20, width: 14, height: 3, weight: 230, country: 'KR', hs_code: '321310', notes: 'Ship in the closed travel case with protective padding. Keep away from excessive heat and moisture.' },
      channel_settings: { condition: 'New', search_terms: 'watercolor travel palette 24 colors half pan portable paint set sketching journaling',
        bullet_points: '24 individual watercolor colors in removable half pans\nCompact reusable travel case with a folding mixing lid\nDesigned for travel sketching, journals and watercolor paper\nIncludes paints and case; brush and paper are not included\nAllow colors to dry before closing the case',
        attribute_material: 'Watercolor pigments / metal case', attribute_color: '24 assorted colors', tax_code: 'Standard taxable goods' },
    },
  },
] satisfies Array<{ channel: ChannelListing['channel']; shop: string; id: string; sku: string; title: string; identifiers: NonNullable<ListingShopData['identifiers']>; fulfillment: string; brokenImages: string[]; values: ListingDraftValues }>;

function importedDetailFixture(product: Product, listing: ChannelListing, data: ListingShopData) {
  if (product.id !== 'prod_005' || product.sku_code !== 'CR-TAI-BSZ') return;
  // Explicit demo identity, not a channel-wide fallback. Never borrow Master or sibling images.
  return importedDetails.find(fixture => listing.channel === fixture.channel && listing.external_id === fixture.id
    && data.shop === fixture.shop && data.sku === fixture.sku && data.title === fixture.title);
}

export function listingDetailDemoMetadata(product: Product, listing: ChannelListing, data: ListingShopData): {
  listingId: string; sku: string; identifiers: NonNullable<ListingShopData['identifiers']>; fulfillment: string; brokenImages: string[];
} | undefined {
  const imported = importedDetailFixture(product, listing, data);
  if (imported) return { listingId: imported.id, sku: imported.sku, identifiers: imported.identifiers, fulfillment: imported.fulfillment, brokenImages: imported.brokenImages };
  const fixture = demoFixture(product, listing, data);
  if (!fixture) return;
  return { listingId: listing.external_id || `DEMO-${fixture.sku}`, sku: fixture.sku,
    identifiers: { gtin: '4901234567894', mpn: 'TAI-SET-B', model: 'TAI-2024-PRO' }, fulfillment: 'Seller fulfilled', brokenImages: [] as string[] };
}
