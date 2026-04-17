// Shared product store — singleton in-memory for local mockup
// Replaces Supabase queries
// AUTO-SEEDS on first import

export type ProductType = 'single' | 'variant' | 'bundle';

export interface Sku {
  id: string;
  sku_code: string;
  variation_name: string;
  weight_g: number;
  units_per_carton: number;
  status: 'active' | 'inactive';
}

export interface ChannelListing {
  channel: 'rakuten' | 'shopee' | 'amazon' | 'website';
  external_id: string | null;
  status: 'active' | 'inactive' | 'pending';
  listing_url: string | null;
  last_synced_at: string | null;
}

// Product schema — SSOT: Product Master owns identity, pricing, media, variants
// NOT owned here: ATS ledger (→ Inventory), order state (→ OMS), fulfillment (→ Fulfillment)
export interface Product {
  id: string;
  // Identity
  name: string;
  sku_code: string;
  product_type: ProductType;
  gtin: string;
  mpn: string;
  model_number: string;
  brand: string;
  asin: string;
  manufacturer: string;
  // Details
  category: string;
  condition: string;
  description: string;
  // Pricing
  original_price: number;
  retail_price: number;
  price_currency: string;
  // Dimensions
  prod_length: number;
  prod_height: number;
  prod_width: number;
  prod_weight: number;
  pkg_length: number;
  pkg_height: number;
  pkg_width: number;
  pkg_weight: number;
  // Compliance
  country_of_origin: string;
  hs_code: string;
  // Media
  images: string[];
  // Inventory (raw stock per warehouse — ATS computed by Inventory tower)
  inventory: Record<string, number>;
  has_variants: boolean;
  // Channels (marketplace listings)
  channels: ChannelListing[];
  // Workflow
  status: 'draft' | 'review' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
  // Variants
  skus: Sku[];
  _variants?: Sku[];
}

export interface ResolvedProductSku {
  product: Product;
  sku: Sku;
}

function genId(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

// ─── Real product images ─────────────────────────────────────────────────────────
// Photos live in frontend/public/images/products/{ASIN}/
const IMG = (asin: string) => `/images/products/${asin}/1.jpg`;

const SEED_PRODUCTS: Product[] = [
  {
    id: 'prod_001',
    sku_code: 'CR-NTB-BLK-A5',
    product_type: 'variant',
    gtin: '4582512450001',
    mpn: 'NTB-HC-001',
    model_number: 'NTB-2025-HC',
    brand: 'CYBER-RECORDS',
    asin: 'B0G432Z31H',
    manufacturer: 'CyberRecord Japan Co.',
    name: 'Black Hardcover Notebook — Japanese Craft Paper',
    category: 'Stationery',
    condition: 'new',
    description: 'Premium Japanese craft paper hardcover notebook. Thread-bound for durability. Acid-free 100gsm paper. Available in A5, B5, and A4 sizes.',
    original_price: 1800,
    retail_price: 2800,
    price_currency: 'JPY',
    prod_length: 21,
    prod_height: 1.5,
    prod_width: 15,
    prod_weight: 195,
    pkg_length: 22,
    pkg_height: 2,
    pkg_width: 16,
    pkg_weight: 250,
    country_of_origin: 'JP',
    hs_code: '4820100000',
    images: [IMG('B0G432Z31H')],
    inventory: { wh_crjp: 45, wh_rslsg: 12, wh_fbsmy: 8 },
    has_variants: true,
    channels: [{ channel: 'amazon', external_id: 'B0G432Z31H', status: 'active', listing_url: null, last_synced_at: null }],
    status: 'published',
    created_at: '2026-04-01T08:00:00Z',
    updated_at: '2026-04-06T08:00:00Z',
    skus: [
      { id: 'sku_001a', sku_code: 'CR-NTB-BLK-A5-A4', variation_name: 'Black / A4', weight_g: 230, units_per_carton: 20, status: 'active' },
      { id: 'sku_001b', sku_code: 'CR-NTB-BLK-A5-B5', variation_name: 'Black / B5', weight_g: 210, units_per_carton: 20, status: 'active' },
      { id: 'sku_001c', sku_code: 'CR-NTB-BLK-A5-A5', variation_name: 'Black / A5', weight_g: 195, units_per_carton: 24, status: 'active' },
    ],
  },
  {
    id: 'prod_002',
    sku_code: 'CR-SKB-MDN-A5',
    product_type: 'variant',
    gtin: '4582512450018',
    mpn: 'SKB-WC-001',
    model_number: 'SKB-2025-PRO',
    brand: 'CYBER-RECORDS',
    asin: 'B0FH1K4CMN',
    manufacturer: 'CyberRecord Japan Co.',
    name: 'Sketchbook Pro — 200gsm Watercolor Paper',
    category: 'Art Supplies',
    condition: 'new',
    description: 'Professional watercolor sketchbook with 200gsm cold-press cotton paper. Stitched binding lies flat. 48 sheets per book.',
    original_price: 2400,
    retail_price: 3800,
    price_currency: 'JPY',
    prod_length: 21,
    prod_height: 0.8,
    prod_width: 15,
    prod_weight: 165,
    pkg_length: 22,
    pkg_height: 1.5,
    pkg_width: 16,
    pkg_weight: 220,
    country_of_origin: 'JP',
    hs_code: '4820100000',
    images: [IMG('B0FH1K4CMN')],
    inventory: { wh_crjp: 80, wh_rslsg: 20 },
    has_variants: true,
    channels: [{ channel: 'rakuten', external_id: 'R001002003', status: 'active', listing_url: null, last_synced_at: null }],
    status: 'published',
    created_at: '2026-04-01T08:00:00Z',
    updated_at: '2026-04-06T08:00:00Z',
    skus: [
      { id: 'sku_002a', sku_code: 'CR-SKB-MDN-A5-HC', variation_name: 'Hardcover / A5', weight_g: 180, units_per_carton: 20, status: 'active' },
      { id: 'sku_002b', sku_code: 'CR-SKB-MDN-A5-PB', variation_name: 'Softcover / A5', weight_g: 165, units_per_carton: 24, status: 'active' },
      { id: 'sku_002c', sku_code: 'CR-SKB-MDN-A5-A4', variation_name: 'Hardcover / A4', weight_g: 280, units_per_carton: 12, status: 'active' },
    ],
  },
  {
    id: 'prod_003',
    sku_code: 'CR-BSH-SET-12',
    product_type: 'single',
    gtin: '4582512450002',
    mpn: 'BSH-SET-12',
    model_number: 'BSH-2025-12P',
    brand: 'CYBER-RECORDS',
    asin: 'B0FQHTSM8B',
    manufacturer: 'CyberRecord Japan Co.',
    name: 'Artist Precision Paint Brush Set — 12-piece',
    category: 'Art Supplies',
    condition: 'new',
    description: '12-piece precision paint brush set. Nylon + natural bristle combo. Sizes 00 to 16. Comes with storage case.',
    original_price: 3200,
    retail_price: 4900,
    price_currency: 'JPY',
    prod_length: 18,
    prod_height: 2,
    prod_width: 8,
    prod_weight: 85,
    pkg_length: 20,
    pkg_height: 3,
    pkg_width: 10,
    pkg_weight: 120,
    country_of_origin: 'JP',
    hs_code: '9603400000',
    images: [IMG('B0FQHTSM8B')],
    inventory: { wh_crjp: 60, wh_rslsg: 15, wh_fbsmy: 10 },
    has_variants: false,
    channels: [
      { channel: 'amazon', external_id: 'B0FQHTSM8B', status: 'active', listing_url: null, last_synced_at: null },
      { channel: 'shopee', external_id: 'SH-ARCH-001', status: 'active', listing_url: null, last_synced_at: null },
    ],
    status: 'published',
    created_at: '2026-04-01T08:00:00Z',
    updated_at: '2026-04-06T08:00:00Z',
    skus: [
      { id: 'sku_003a', sku_code: 'CR-BSH-SET-12', variation_name: '12-piece Set', weight_g: 85, units_per_carton: 30, status: 'active' },
    ],
  },
  {
    id: 'prod_004',
    sku_code: 'CR-ART-MYTH-10',
    product_type: 'single',
    gtin: '4582512450003',
    mpn: 'ART-MYTH-10',
    model_number: 'ART-2024-MYTH',
    brand: 'CYBER-RECORDS',
    asin: 'B0G5Y7YCDD',
    manufacturer: 'CyberRecord Japan Co.',
    name: 'Japanese Mythical Creatures — Traditional Art Collection (10 sheets)',
    category: 'Art Supplies',
    condition: 'new',
    description: 'Set of 10 traditional Japanese mythical creature art sheets. Ink jet print on 200gsm art paper. Features Kappa, Tengu, Kitsune, Tanuki, and more.',
    original_price: 1200,
    retail_price: 1980,
    price_currency: 'JPY',
    prod_length: 30,
    prod_height: 0.3,
    prod_width: 42,
    prod_weight: 150,
    pkg_length: 32,
    pkg_height: 1,
    pkg_width: 44,
    pkg_weight: 200,
    country_of_origin: 'JP',
    hs_code: '4908900000',
    images: [IMG('B0G5Y7YCDD')],
    inventory: { wh_crjp: 200, wh_fbsmy: 50, wh_3plvn: 25 },
    has_variants: false,
    channels: [
      { channel: 'amazon', external_id: 'B0G5Y7YCDD', status: 'active', listing_url: null, last_synced_at: null },
      { channel: 'rakuten', external_id: 'R001002001', status: 'active', listing_url: null, last_synced_at: null },
    ],
    status: 'published',
    created_at: '2026-04-01T08:00:00Z',
    updated_at: '2026-04-06T08:00:00Z',
    skus: [
      { id: 'sku_004a', sku_code: 'CR-ART-MYTH-10', variation_name: '10-sheet Set', weight_g: 150, units_per_carton: 50, status: 'active' },
    ],
  },
  {
    id: 'prod_005',
    sku_code: 'CR-TAI-BSZ',
    product_type: 'single',
    gtin: '4582512450004',
    mpn: 'TAI-SET-B',
    model_number: 'TAI-2024-PRO',
    brand: 'CYBER-RECORDS',
    asin: 'B0FH6LHSXD',
    manufacturer: 'CyberRecord Japan Co.',
    name: 'Traditional Japanese Precision Tailoring Set',
    category: 'Art Supplies',
    condition: 'new',
    description: 'Precision tailoring set inspired by traditional Japanese craftsmanship. Includes fabric marker, stitch unpicker, thimble, and measuring tape.',
    original_price: 2800,
    retail_price: 4200,
    price_currency: 'JPY',
    prod_length: 12,
    prod_height: 3,
    prod_width: 8,
    prod_weight: 120,
    pkg_length: 14,
    pkg_height: 4,
    pkg_width: 10,
    pkg_weight: 160,
    country_of_origin: 'JP',
    hs_code: '9017200000',
    images: [IMG('B0FH6LHSXD')],
    inventory: { wh_crjp: 80, wh_rslsg: 20 },
    has_variants: false,
    channels: [
      { channel: 'rakuten', external_id: 'R001002002', status: 'active', listing_url: null, last_synced_at: null },
      { channel: 'website', external_id: null, status: 'active', listing_url: '/products/CR-TAI-BSZ', last_synced_at: null },
    ],
    status: 'draft',
    created_at: '2026-04-01T08:00:00Z',
    updated_at: '2026-04-06T08:00:00Z',
    skus: [
      { id: 'sku_005a', sku_code: 'CR-TAI-BSZ', variation_name: 'Full Set', weight_g: 120, units_per_carton: 40, status: 'active' },
    ],
  },
];

// Singleton store
let _products: Product[] = [...SEED_PRODUCTS];

export function getProducts(): Product[] {
  return _products;
}

export function addProduct(p: Product): void {
  _products = [p, ..._products];
}

export function updateProduct(id: string, p: Partial<Product> & { id: string }): void {
  _products = _products.map(x => x.id === id ? { ...x, ...p, updated_at: new Date().toISOString() } : x);
}

export function deleteProduct(id: string): void {
  _products = _products.filter(x => x.id !== id);
}

export function getProductById(id: string): Product | undefined {
  return _products.find(x => x.id === id);
}

export function getResolvedProductSkuById(skuId: string): ResolvedProductSku | undefined {
  for (const product of _products) {
    const sku = product.skus.find((candidate) => candidate.id === skuId);
    if (!sku) continue;
    return { product, sku };
  }

  return undefined;
}

export function getProductBySkuId(skuId: string): Product | undefined {
  return getResolvedProductSkuById(skuId)?.product;
}

export function getAllSkus(): string[] {
  return _products.map(p => p.sku_code);
}

export { genId };
