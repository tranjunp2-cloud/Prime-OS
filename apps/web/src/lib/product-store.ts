// Shared product store — singleton in-memory for local mockup
// Replaces Supabase queries
// AUTO-SEEDS on first import

export type ProductType = 'single' | 'variant';

export interface Sku {
  id: string;
  sku_code: string;
  variation_name: string;
  weight_g: number;
  units_per_carton: number;
  status: 'active' | 'inactive';
  image_url?: string;
  price?: number;
  stock?: number;
}

export interface ChannelOverride {
  enabled: boolean;
  title: string;
  price_markup: number;
  description: string;
  listing_sku?: string;
  category?: string;
  fulfillment?: string;
  variant_scope?: string;
  listing_mode?: string;
  identifier?: string;
  condition?: string;
  stock_quantity?: string;
  warehouse?: string;
  brand?: string;
  shipping_option?: string;
  bullet_points?: string;
  search_terms?: string;
  preorder_days?: string;
  warranty?: string;
  certification?: string;
  video_url?: string;
  web_slug?: string;
  pos_barcode?: string;
  visibility?: string;
  sync_policy?: string;
  safety_buffer?: string;
  allocation_cap?: string;
  media_scope?: string;
  compliance_notes?: string;
  tax_code?: string;
  attribute_material?: string;
  attribute_color?: string;
}

export interface ChannelListing {
  channel: 'website' | 'pos' | 'shopee' | 'lazada' | 'tiktok' | 'amazon' | 'social' | 'rakuten';
  external_id: string | null;
  status: 'active' | 'inactive' | 'pending';
  listing_url: string | null;
  last_synced_at: string | null;
}

export interface MarketPrice {
  market: 'JP' | 'SG' | 'VN';
  currency: 'JPY' | 'SGD' | 'VND';
  enabled: boolean;
  price: number;
}

export interface ProductAssociation {
  productId: string;
  type: 'related' | 'accessory' | 'replacement' | 'upsell';
}

export interface ProductRevision {
  id: string;
  number: number;
  status: 'published' | 'restored';
  createdAt: string;
  createdBy: string;
  summary: string;
}

export interface LocalizedProductContent {
  name: string;
  description: string;
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
  /** Stable reference to the canonical Brand registry entry. Legacy records may only have `brand`. */
  brandId?: string;
  asin: string;
  manufacturer: string;
  // Details
  category: string;
  condition: string;
  description: string;
  localized_content?: Partial<Record<'en-US' | 'ja-JP' | 'vi-VN', LocalizedProductContent>>;
  // Pricing
  original_price: number;
  retail_price: number;
  price_currency: string;
  /** Canonical market prices. Marketplace-specific adjustments remain in channel_overrides. */
  market_prices?: MarketPrice[];
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
  image_alt_texts?: string[];
  slug?: string;
  meta_title?: string;
  meta_description?: string;
  /** Category attributes use a stable `attributeKey`; legacy/custom entries may only have a name. */
  specifications?: Array<{ attributeKey?: string; name: string; value: string }>;
  // Inventory (raw stock per warehouse — ATS computed by Inventory tower)
  inventory: Record<string, number>;
  has_variants: boolean;
  // Channels (marketplace listings)
  channels: ChannelListing[];
  channel_overrides?: Partial<Record<'webstore' | 'pos' | 'shopee' | 'lazada' | 'tiktok' | 'amazon' | 'social' | 'rakuten', ChannelOverride>>;
  associations?: ProductAssociation[];
  revisions?: ProductRevision[];
  /** Incremented on every save and used for optimistic concurrency checks. */
  record_version?: number;
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
    category: 'Painting Accessories',
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
    inventory: { wh_crjp: 7, wh_rslsg: 3, wh_fbsmy: 2 },
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
    inventory: { wh_crjp: 0, wh_rslsg: 0 },
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

const CATEGORY_DEMO_PRODUCTS: Product[] = [
  {
    ...SEED_PRODUCTS[0],
    id: 'prod_demo_electronics',
    sku_code: 'DEMO-ELC-001',
    gtin: '4582512450100',
    name: 'Wireless Studio Headphones',
    category: 'Headphones',
    description: 'Demo Product Master linked to the Headphones category.',
    skus: [{ ...SEED_PRODUCTS[0].skus[0], id: 'sku_demo_electronics', sku_code: 'DEMO-ELC-001', variation_name: 'Midnight Black' }],
  },
  {
    ...SEED_PRODUCTS[0],
    id: 'prod_demo_headphones_002',
    sku_code: 'DEMO-ELC-002',
    gtin: '4582512450103',
    name: 'Compact Wireless Headphones',
    category: 'Headphones',
    description: 'Second demo Product Master linked to the Headphones category.',
    status: 'draft',
    skus: [{ ...SEED_PRODUCTS[0].skus[0], id: 'sku_demo_headphones_002', sku_code: 'DEMO-ELC-002', variation_name: 'Cloud White' }],
  },
  {
    ...SEED_PRODUCTS[1],
    id: 'prod_demo_bag',
    sku_code: 'DEMO-BAG-001',
    gtin: '4582512450101',
    name: 'Everyday Canvas Tote Bag',
    category: 'Bag',
    description: 'Demo Product Master linked to the Bag category.',
    skus: [{ ...SEED_PRODUCTS[1].skus[0], id: 'sku_demo_bag', sku_code: 'DEMO-BAG-001', variation_name: 'Natural Canvas' }],
  },
  {
    ...SEED_PRODUCTS[3],
    id: 'prod_demo_books',
    sku_code: 'DEMO-BOOK-001',
    gtin: '4582512450102',
    name: 'Japanese Design Reference Book',
    category: 'Books',
    description: 'Demo Product Master linked to the Books category.',
    skus: [{ ...SEED_PRODUCTS[3].skus[0], id: 'sku_demo_books', sku_code: 'DEMO-BOOK-001', variation_name: 'Hardcover Edition' }],
  },
];

const IMPORTED_DEMO_PRODUCTS: Product[] = [{
  id: 'prod_import_imp-003',
  name: 'Premium Calligraphy Starter Kit',
  sku_code: 'SHP-CALLI-KIT',
  product_type: 'single',
  gtin: '',
  mpn: '',
  model_number: '',
  brand: '',
  asin: '',
  manufacturer: '',
  category: 'Headphones',
  condition: 'new',
  description: '',
  original_price: 0,
  retail_price: 5200,
  price_currency: 'JPY',
  prod_length: 0,
  prod_height: 0,
  prod_width: 0,
  prod_weight: 0,
  pkg_length: 0,
  pkg_height: 0,
  pkg_width: 0,
  pkg_weight: 0,
  country_of_origin: '',
  hs_code: '',
  images: [],
  inventory: {},
  has_variants: false,
  channels: [
    { channel: 'website', external_id: 'WEB-SHP-CALLI-KIT', status: 'active', listing_url: '/products/premium-calligraphy-starter-kit', last_synced_at: null },
    { channel: 'pos', external_id: 'POS-SHP-CALLI-KIT', status: 'active', listing_url: null, last_synced_at: null },
    { channel: 'shopee', external_id: 'SHP-9012283', status: 'pending', listing_url: null, last_synced_at: null },
  ],
  channel_overrides: {
    webstore: { enabled: true, title: 'Premium Calligraphy Starter Kit', description: '', price_markup: 0, listing_sku: 'WEB-SHP-CALLI-KIT', web_slug: '/products/premium-calligraphy-starter-kit', visibility: 'public', variant_scope: 'all', listing_mode: 'master', sync_policy: 'automatic', safety_buffer: '0', allocation_cap: '', media_scope: 'all' },
    pos: { enabled: true, title: 'Premium Calligraphy Starter Kit', description: '', price_markup: 0, listing_sku: 'POS-SHP-CALLI-KIT', pos_barcode: 'SHP-CALLI-KIT', variant_scope: 'all', listing_mode: 'master', sync_policy: 'automatic', safety_buffer: '0', allocation_cap: '', media_scope: 'all' },
    shopee: { enabled: true, title: 'Premium Calligraphy Starter Kit', description: '', price_markup: 0, listing_sku: 'SHO-SHP-CALLI-KIT', category: 'Art Supplies > Calligraphy', stock_quantity: '24', variant_scope: 'all', listing_mode: 'master', sync_policy: 'automatic', safety_buffer: '0', allocation_cap: '24', media_scope: 'all' },
  },
  status: 'draft',
  created_at: '2026-09-18T06:48:26Z',
  updated_at: '2026-09-18T11:15:28Z',
  skus: [{ id: 'sku_import_imp-003', sku_code: 'SHP-CALLI-KIT', variation_name: 'Default', weight_g: 0, units_per_carton: 1, status: 'active', price: 5200, stock: 0 }],
}];

const DEFAULT_PRODUCTS = [...IMPORTED_DEMO_PRODUCTS, ...SEED_PRODUCTS, ...CATEGORY_DEMO_PRODUCTS];

// Singleton store backed by localStorage so prototype-created Product Masters
// survive reloads and direct navigation to their detail/edit routes.
const PRODUCT_STORAGE_KEY = 'primeos-product-master-v1';

function normalizeStoredProduct(product: Product): Product {
  const now = new Date().toISOString();
  const rawSpecifications = Array.isArray(product.specifications) ? product.specifications : [];
  const specifications = rawSpecifications
    .filter((item): item is { attributeKey?: string; name: string; value: string } => Boolean(
      item && typeof item === 'object' && typeof item.name === 'string' && typeof item.value === 'string',
    ))
    .map(item => ({ attributeKey: typeof item.attributeKey === 'string' ? item.attributeKey : undefined, name: item.name, value: item.value }));

  return {
    id: String(product.id),
    name: typeof product.name === 'string' ? product.name : '',
    sku_code: typeof product.sku_code === 'string' ? product.sku_code : '',
    product_type: product.product_type === 'variant' ? 'variant' : 'single',
    gtin: typeof product.gtin === 'string' ? product.gtin : '',
    mpn: typeof product.mpn === 'string' ? product.mpn : '',
    model_number: typeof product.model_number === 'string' ? product.model_number : '',
    brand: typeof product.brand === 'string' ? product.brand : '',
    brandId: typeof product.brandId === 'string' ? product.brandId : undefined,
    asin: typeof product.asin === 'string' ? product.asin : '',
    manufacturer: typeof product.manufacturer === 'string' ? product.manufacturer : '',
    category: typeof product.category === 'string' ? product.category : '',
    condition: typeof product.condition === 'string' ? product.condition : 'new',
    description: typeof product.description === 'string' ? product.description : '',
    localized_content: product.localized_content && typeof product.localized_content === 'object' ? product.localized_content : {},
    original_price: Number(product.original_price) || 0,
    retail_price: Number(product.retail_price) || 0,
    price_currency: typeof product.price_currency === 'string' ? product.price_currency : 'JPY',
    market_prices: Array.isArray(product.market_prices) ? product.market_prices : [],
    prod_length: Number(product.prod_length) || 0,
    prod_height: Number(product.prod_height) || 0,
    prod_width: Number(product.prod_width) || 0,
    prod_weight: Number(product.prod_weight) || 0,
    pkg_length: Number(product.pkg_length) || 0,
    pkg_height: Number(product.pkg_height) || 0,
    pkg_width: Number(product.pkg_width) || 0,
    pkg_weight: Number(product.pkg_weight) || 0,
    country_of_origin: typeof product.country_of_origin === 'string' ? product.country_of_origin : '',
    hs_code: typeof product.hs_code === 'string' ? product.hs_code : '',
    images: Array.isArray(product.images) ? product.images.filter((image): image is string => typeof image === 'string') : [],
    image_alt_texts: Array.isArray(product.image_alt_texts) ? product.image_alt_texts.filter((text): text is string => typeof text === 'string') : [],
    slug: typeof product.slug === 'string' ? product.slug : '',
    meta_title: typeof product.meta_title === 'string' ? product.meta_title : '',
    meta_description: typeof product.meta_description === 'string' ? product.meta_description : '',
    specifications,
    inventory: product.inventory && typeof product.inventory === 'object' && !Array.isArray(product.inventory) ? product.inventory : {},
    has_variants: Boolean(product.has_variants),
    channels: Array.isArray(product.channels) ? product.channels : [],
    channel_overrides: product.channel_overrides && typeof product.channel_overrides === 'object' ? product.channel_overrides : {},
    associations: Array.isArray(product.associations) ? product.associations : [],
    revisions: Array.isArray(product.revisions) ? product.revisions : [],
    record_version: Number(product.record_version) || 1,
    status: ['draft', 'review', 'published', 'archived'].includes(product.status) ? product.status : 'draft',
    created_at: typeof product.created_at === 'string' ? product.created_at : now,
    updated_at: typeof product.updated_at === 'string' ? product.updated_at : now,
    skus: Array.isArray(product.skus) ? product.skus : [],
    _variants: Array.isArray(product._variants) ? product._variants : undefined,
  };
}

function loadStoredProducts(): Product[] {
  if (typeof window === 'undefined') return [...DEFAULT_PRODUCTS];
  try {
    const raw = window.localStorage.getItem(PRODUCT_STORAGE_KEY);
    if (!raw) return [...DEFAULT_PRODUCTS];
    const stored = JSON.parse(raw) as unknown;
    if (!Array.isArray(stored)) return [...DEFAULT_PRODUCTS];
    const valid = stored.filter((item): item is Product => Boolean(item && typeof item === 'object' && 'id' in item && 'sku_code' in item));
    const migrated = valid.map(storedProduct => {
      const product = normalizeStoredProduct(storedProduct);
      const normalized = (product as Product & { product_type?: string }).product_type === 'bundle'
        ? { ...product, product_type: product.has_variants ? 'variant' as const : 'single' as const }
        : product;
      // Keep the shipped demo taxonomy representative without overwriting user-assigned categories.
      return normalized.id === 'prod_003' && normalized.category === 'Art Supplies'
        ? { ...normalized, category: 'Painting Accessories' }
        : normalized.id === 'prod_demo_electronics' && normalized.category === 'Electronics'
          ? { ...normalized, category: 'Headphones' }
        : normalized;
    });
    const storedIds = new Set(migrated.map(product => product.id));
    return [...migrated, ...DEFAULT_PRODUCTS.filter(product => !storedIds.has(product.id))];
  } catch {
    return [...DEFAULT_PRODUCTS];
  }
}

function persistProducts(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PRODUCT_STORAGE_KEY, JSON.stringify(_products));
  } catch {
    // Keep the in-memory prototype usable if storage is unavailable or full.
  }
}

let _products: Product[] = loadStoredProducts();

export function getProducts(): Product[] {
  return _products;
}

export function addProduct(p: Product): void {
  const normalized = normalizeStoredProduct(p);
  _products = [normalized, ..._products.filter(product => product.id !== normalized.id)];
  persistProducts();
}

export function updateProduct(id: string, p: Partial<Product> & { id: string }): void {
  _products = _products.map(x => x.id === id ? normalizeStoredProduct({ ...x, ...p, updated_at: new Date().toISOString() }) : x);
  persistProducts();
}

export function deleteProduct(id: string): void {
  _products = _products.filter(x => x.id !== id);
  persistProducts();
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
