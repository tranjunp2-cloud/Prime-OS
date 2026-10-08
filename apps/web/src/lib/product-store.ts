import { normalizeDemoStockLocations } from './demo-warehouse-locations';
import type { InventoryPosition } from './inventory-store';
import { getProductCatalogSettings, resolveCatalogCategory } from './product-catalog-settings-store';
import type { ListingPricing } from './pricing-rules';
import { repairDraftListingDemo } from './draft-listing-demo';
import { getSavedAmazonListing } from './amazon-listing-store';
import { completeActiveProductDemo } from './active-product-demo';
import { withProductActivity, type ProductActivity } from './product-activity';
import { getCatalogImportItems } from './catalog-import-store';
import { recoverListingShopSnapshots } from './listing-shop-data';
import { completeWarehouseListingDemo } from './warehouse-listing-demo';
// Shared product store — singleton in-memory for local mockup
// Replaces Supabase queries
// AUTO-SEEDS on first import

export type ProductType = 'single' | 'variant';

export type StockTransferRecord = {
  id: string;
  sku: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  quantity: number;
  fromBefore: number;
  fromAfter: number;
  toBefore: number | null;
  toAfter: number;
  createdAt: string;
  status?: 'in_transit' | 'received';
  receivedAt?: string;
};

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
  stock_by_location?: Record<string, number>;
}

export interface VariantOptionDefinition {
  attributeKey: string;
  name: string;
  values: string[];
}

export interface ChannelOverride extends ListingPricing {
  enabled: boolean;
  title: string;
  price_markup: number;
  channel_price?: number;
  channel_currency?: string;
  description: string;
  listing_sku?: string;
  category?: string;
  fulfillment?: string;
  variant_scope?: string;
  selected_variant_ids?: string[];
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
  localized_content_confirmed?: boolean;
}

export interface ChannelListing {
  channel: 'website' | 'pos' | 'shopee' | 'lazada' | 'tiktok' | 'amazon' | 'social' | 'rakuten';
  external_id: string | null;
  status: 'draft' | 'active' | 'inactive' | 'pending';
  listing_url: string | null;
  last_synced_at: string | null;
  /** Read-only import identity; mapping is not a publish/sync operation. */
  store_name?: string;
  shop_sku?: string;
  reported_stock?: number;
  /** Durable shop-owned values. Never populated from Master prices or warehouse stock. */
  shop_snapshot?: ShopListingSnapshot;
  /** Listing-owned edits, not a provider snapshot or a successful shop update. */
  local_draft?: { values: ListingDraftValues; updated_at: string };
  /** Creation setup belongs to this exact shop, never to every listing on the channel. */
  creation_config?: ChannelOverride;
  publication_unconfirmed?: boolean;
  /** Fingerprint of the legacy mapping issues explicitly reviewed for this exact listing. */
  identity_review_signature?: string;
  variant_mappings?: Array<{ shop_sku: string; master_sku_id: string }>;
  /** Saved review work is not a confirmed SKU mapping or permission to sync. */
  review_pending?: {
    issues: string[];
    sku_mapping_pending: boolean;
    draft_mappings?: Array<{ shop_sku: string; master_sku_id: string }>;
    master_draft?: Partial<Pick<Product, 'name' | 'description' | 'category' | 'categoryId' | 'images' | 'retail_price' | 'price_currency' | 'specifications' | 'pkg_length' | 'pkg_width' | 'pkg_height' | 'pkg_weight' | 'variant_options' | 'skus' | 'has_variants' | 'product_type' | 'brand' | 'brandId' | 'gtin' | 'mpn' | 'model_number' | 'pack_quantity' | 'field_mappings'>>;
    master_signature?: string;
    verified_single?: boolean;
    saved_at: string;
  };
  /** Explicit, listing-owned Master data preference. Never a remote sync receipt. */
  master_data_sync?: {
    enabled: boolean;
    fields: Array<'content' | 'media' | 'price' | 'inventory' | 'shipping'>;
    pricing?: { currency: string; rule_id?: string };
    inventory?: { source?: 'shop_default' | 'warehouse'; warehouse_id: string; safety_buffer: number; allocation_cap?: number; fulfillment?: 'FBA' | 'FBM' };
    updated_at: string;
  };
}

export interface ListingDraftValues {
  title?: string;
  description?: string;
  brand?: string;
  category?: string;
  images?: string[];
  price?: { amount: number; currency: string };
  stock?: number;
  shipping?: { length?: number; width?: number; height?: number; weight?: number; country?: string; hs_code?: string; notes?: string };
  channel_settings?: Partial<Pick<ChannelOverride, 'condition' | 'search_terms' | 'bullet_points' | 'preorder_days' | 'warranty' | 'certification' | 'video_url' | 'web_slug' | 'pos_barcode' | 'visibility' | 'tax_code' | 'attribute_material' | 'attribute_color'>>;
}

export interface ShopListingSnapshot {
  requirements?: import('./listing-requirements').ListingRequirements;
  mapping_fields?: import('./listing-field-mapping').ImportedMappingField[];
  channel: ChannelListing['channel'];
  store_name: string;
  listing_id: string;
  shop_sku: string;
  title: string;
  description?: string;
  brand?: string;
  images: string[];
  category: string;
  price?: { amount: number; currency: string };
  stock?: number;
  shipping?: ListingDraftValues['shipping'];
  channel_settings?: ListingDraftValues['channel_settings'];
  variant_items?: Array<{ sku: string; label: string; price?: { amount: number; currency: string }; stock?: number }>;
  variant_count?: number;
  listing_url?: string;
  identifiers?: { gtin?: string; mpn?: string; model?: string };
  /** Provider retrieval time, if recorded. Do not substitute mapping/save time. */
  retrieved_at?: string;
  recorded_at: string;
}

export interface MarketPrice {
  market: 'JP' | 'SG' | 'VN';
  currency: 'JPY' | 'SGD' | 'VND';
  enabled: boolean;
  price: number;
}

/**
 * A reusable price calculation chain applied on top of the canonical retail price.
 * Effective price = round_increment(
 *   retail_price × fxRate × (1+adjustmentPct/100) × (1+marketplaceFeePct/100) × (1+taxPct/100),
 *   roundingIncrement
 * ) clamped to [minPrice, maxPrice].
 */
export interface PricePolicy {
  id: string;
  name: string;
  code: string;
  targetCurrency: string;
  fxRate: number;           // 1 base_currency = fxRate target_currency
  fxValidityHours: number;  // 0 = manual/fixed rate
  adjustmentPct: number;    // markup (+) or markdown (-) %
  marketplaceFeePct: number;
  taxPct: number;
  roundingIncrement: number;  // e.g. 1000 for VND, 0.1 for SGD
  minPrice: number;           // 0 = no floor
  maxPrice: number;           // 0 = no ceiling
  enabled: boolean;
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
  /**
   * Localized values for attributes that have isLocalizable=true, keyed by attributeKey.
   * e.g. { care_instructions: 'お手入れ方法：...' }
   * Spec §5.2: only attributes with isLocalizable=true may carry a locale coordinate.
   */
  attributeValues?: Record<string, string>;
}

// Product schema — SSOT: Product Master owns identity, pricing, media, variants
// NOT owned here: ATS ledger (→ Inventory), order state (→ OMS), fulfillment (→ Fulfillment)
//
// ⚠️  ARCHITECTURE NOTE (spec: Attributes, Validation & Rules):
//     The `products` table in production will only keep:
//       sku, productKind, status, familyId, mediaStrategy, parentProductId
//     Fields marked [→ dynamic attr] will move to product_family_attributes (driven by familyId).
//     Fields marked [→ product_identifiers] will move to a shared identifier namespace table.
export interface Product {
  /** Reviewed import provenance only; never a recurring or outbound sync rule. */
  field_mappings?: import('./listing-field-mapping').MasterFieldMappings;
  id: string;
  // Identity — fixed ✅
  name: string;          // [→ dynamic attr, surface: 'basic', isLocalizable: true, isRequired: true]
  sku_code: string;      // Fixed: varchar 180, no whitespace/control chars
  product_type: ProductType;  // Fixed: 'single' | 'variant' (spec: 'simple' | 'configurable')
  gtin: string;          // [→ product_identifiers, shared namespace with ean/upc/isbn/jan]
  mpn: string;           // [→ product_identifiers, unique per type]
  model_number: string;  // [→ dynamic attr, surface: 'basic']
  /** Units in a sellable pack, when explicitly recorded (not units per carton). */
  pack_quantity?: number;
  brand: string;         // [→ dynamic attr, surface: 'basic', type: enum, option governance]
  /** Stable reference to the canonical Brand registry entry. Legacy records may only have `brand`. */
  brandId?: string;
  asin: string;          // [→ product_identifiers, unique per type]
  manufacturer: string;  // [→ dynamic attr, surface: 'basic']
  // Details
  category: string;      // Taxonomy ref — kept as-is (prototype: doubles as Family proxy)
  /** Stable schema reference. `category` remains a display/legacy name, not identity. */
  categoryId?: string;
  condition: string;
  description: string;   // [→ dynamic attr, surface: 'basic', isLocalizable: true, isRequired: true]
  localized_content?: Partial<Record<string, LocalizedProductContent>>; // key = BCP-47 locale, e.g. 'ja-JP'
  // Pricing — spec: purchase_price & rrp should be type 'money' {amount, currency}
  original_price: number;   // [→ dynamic attr 'purchase_price', type: money]
  retail_price: number;     // [→ dynamic attr 'recommended_retail_price', type: money]
  price_currency: string;   // Will be absorbed into money type in production
  /** @deprecated Use price_policies instead. Kept for backward compat with stored data. */
  market_prices?: MarketPrice[];
  /** Reusable pricing calculation chains (FX + adjustments + fees + tax + rounding). */
  price_policies?: PricePolicy[];
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
  country_of_origin: string;  // [→ dynamic attr, surface: 'basic' or 'dynamic' per family]
  hs_code: string;
  // Media — spec: images should be asset_ref type (DAM integration), not raw URLs
  images: string[];           // [→ dynamic attr, surface: 'media', type: array<asset_ref>]
  image_alt_texts?: string[];
  slug?: string;
  meta_title?: string;
  meta_description?: string;
  /** Category attributes use a stable `attributeKey`; legacy/custom entries may only have a name.
   *  TODO: In production, driven by product_family_attributes with surface='dynamic'.
   *  TODO: Extend to support 13 data types: string, number, integer, boolean, enum, date,
   *        datetime, money, measurement, object, array, asset_ref, commerce_entity_ref. */
  specifications?: Array<{ attributeKey?: string; name: string; value: string }>;
  // Inventory (raw stock per warehouse — ATS computed by Inventory tower)

  inventory_adjustments?: Array<{ id: string; warehouseId: string; sku: string; before: number | null; after: number; reason: string; createdAt: string; kind?: 'opening' | 'receipt' | 'adjustment' | 'availability' }>;
  inventory_transfers?: StockTransferRecord[];
  /** Explicitly verified balances; stored with the count and audit event in one write. */
  warehouse_positions?: InventoryPosition[];
  inventory: Record<string, number>;
  has_variants: boolean;
  // Channels (marketplace listings)
  channels: ChannelListing[];
  channel_overrides?: Partial<Record<'webstore' | 'pos' | 'shopee' | 'lazada' | 'tiktok' | 'amazon' | 'social' | 'rakuten', ChannelOverride>>;
  associations?: ProductAssociation[];
  revisions?: ProductRevision[];
  /** Local prototype event log; persisted atomically with the changed product/listing data. */
  activity?: ProductActivity[];
  /** Incremented on every save and used for optimistic concurrency checks. */
  record_version?: number;
  // Workflow
  status: 'draft' | 'review' | 'published' | 'archived';
  import_result?: 'needs_review' | 'incomplete' | 'ready' | 'matched' | 'published';
  import_source?: string;
  /** Restoring to Draft is explicit; import validation must not republish it on save/reload. */
  import_activation_paused?: boolean;
  import_issues?: string[];
  import_sources?: Array<{ channel: ChannelListing['channel']; store: string; brand: string; price: number; currency: string; listing_id?: string; shop_sku?: string }>;
  /** Preserve reviewed/moved legacy links instead of reseeding the old demo relationships on reload. */
  listing_review_migrated?: boolean;
  created_at: string;
  updated_at: string;
  // Variants
  /** Canonical variant dimensions used to generate and hydrate the SKU matrix. */
  variant_options?: VariantOptionDefinition[];
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
    brandId: 'cyber-records',
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
    inventory: { wh_crjp: 45, wh_rslsg: 12, wh_fbsmy: 8, wh_fbajp: 30 },
    has_variants: true,
    variant_options: [
      { attributeKey: 'color', name: 'Color', values: ['Black'] },
      { attributeKey: 'paper_size', name: 'Paper Size', values: ['A4', 'B5', 'A5'] },
    ],
    channels: [{ channel: 'amazon', external_id: 'B0G432Z31H', status: 'active', listing_url: null, last_synced_at: null }],
    status: 'published',
    created_at: '2026-04-01T08:00:00Z',
    updated_at: '2026-04-06T08:00:00Z',
    skus: [
      { id: 'sku_001a', sku_code: 'CR-NTB-BLK-A5-A4', variation_name: 'Black / A4', weight_g: 230, units_per_carton: 20, status: 'active',
        stock_by_location: { wh_crjp: 18, wh_rslsg: 5, wh_fbsmy: 3, wh_fbajp: 12 } },
      { id: 'sku_001b', sku_code: 'CR-NTB-BLK-A5-B5', variation_name: 'Black / B5', weight_g: 210, units_per_carton: 20, status: 'active',
        stock_by_location: { wh_crjp: 15, wh_rslsg: 4, wh_fbsmy: 3, wh_fbajp: 10 } },
      { id: 'sku_001c', sku_code: 'CR-NTB-BLK-A5-A5', variation_name: 'Black / A5', weight_g: 195, units_per_carton: 24, status: 'active',
        stock_by_location: { wh_crjp: 12, wh_rslsg: 3, wh_fbsmy: 2, wh_fbajp: 8 } },
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
    brandId: 'cyber-records',
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
    inventory: { wh_crjp: 80, wh_rslsg: 20, wh_rakjp: 15 },
    has_variants: true,
    variant_options: [
      { attributeKey: 'binding_type', name: 'Binding Type', values: ['Hardcover', 'Softcover'] },
      { attributeKey: 'paper_size', name: 'Paper Size', values: ['A5', 'A4'] },
    ],
    channels: [{ channel: 'rakuten', external_id: 'R001002003', status: 'active', listing_url: null, last_synced_at: null }],
    status: 'published',
    created_at: '2026-04-01T08:00:00Z',
    updated_at: '2026-04-06T08:00:00Z',
    skus: [
      { id: 'sku_002a', sku_code: 'CR-SKB-MDN-A5-HC', variation_name: 'Hardcover / A5', weight_g: 180, units_per_carton: 20, status: 'active',
        stock_by_location: { wh_crjp: 35, wh_rslsg: 8, wh_rakjp: 7 } },
      { id: 'sku_002b', sku_code: 'CR-SKB-MDN-A5-PB', variation_name: 'Softcover / A5', weight_g: 165, units_per_carton: 24, status: 'active',
        stock_by_location: { wh_crjp: 28, wh_rslsg: 7, wh_rakjp: 5 } },
      { id: 'sku_002c', sku_code: 'CR-SKB-MDN-A5-A4', variation_name: 'Hardcover / A4', weight_g: 280, units_per_carton: 12, status: 'active',
        stock_by_location: { wh_crjp: 17, wh_rslsg: 5, wh_rakjp: 3 } },
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
    brandId: 'cyber-records',
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
    inventory: { wh_crjp: 40, wh_rslsg: 20, wh_fbsmy: 12, wh_fbajp: 0 },
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
    brandId: 'cyber-records',
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
    inventory: { wh_crjp: 200, wh_fbsmy: 50, wh_3plvn: 25, wh_rakjp: 40 },
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
    brandId: 'cyber-records',
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
    inventory: { wh_crjp: 0, wh_rslsg: 4 },
    has_variants: false,
    channels: [
      { channel: 'rakuten', external_id: null, status: 'draft', listing_url: null, last_synced_at: null },
      { channel: 'website', external_id: null, status: 'draft', listing_url: null, last_synced_at: null },
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
    variant_options: [{ attributeKey: 'color', name: 'Color', values: ['Midnight Black'] }],
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
    channels: [{ channel: 'amazon', external_id: null, status: 'draft', listing_url: null, last_synced_at: null }],
    variant_options: [{ attributeKey: 'color', name: 'Color', values: ['Cloud White'] }],
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
    variant_options: [{ attributeKey: 'material', name: 'Material', values: ['Natural Canvas'] }],
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
  brand: 'Kuretake',
  brandId: 'kuretake',
  asin: '',
  manufacturer: 'Kuretake Co., Ltd.',
  category: 'Art Supplies',
  condition: 'new',
  description: 'Complete calligraphy starter kit by Kuretake. Includes brush pen, ink cartridges, practice sheets, and instruction booklet. Suitable for beginners and intermediate learners. Traditional Japanese calligraphy tools with modern ink delivery system.',
  original_price: 0,
  retail_price: 5200,
  price_currency: 'JPY',
  prod_length: 25,
  prod_height: 5,
  prod_width: 15,
  prod_weight: 350,
  pkg_length: 28,
  pkg_height: 6,
  pkg_width: 18,
  pkg_weight: 450,
  country_of_origin: 'JP',
  hs_code: '9608100000',
  images: [],
  inventory: { wh_crjp: 18, wh_fbsmy: 24, wh_3plvn: 30 },
  has_variants: false,
  channels: [
    { channel: 'shopee', external_id: 'SHP-9012283', status: 'pending', listing_url: null, last_synced_at: null },
  ],
  channel_overrides: {
    shopee: { enabled: true, title: 'Premium Calligraphy Starter Kit', description: '', price_markup: 0, listing_sku: 'SHO-SHP-CALLI-KIT', category: 'Art Supplies > Calligraphy', stock_quantity: '24', variant_scope: 'all', listing_mode: 'master', sync_policy: 'automatic', safety_buffer: '0', allocation_cap: '24', media_scope: 'all' },
  },
  status: 'draft',
  created_at: '2026-09-18T06:48:26Z',
  updated_at: '2026-09-28T09:05:00Z',
  skus: [{ id: 'sku_import_imp-003', sku_code: 'SHP-CALLI-KIT', variation_name: 'Default', weight_g: 350, units_per_carton: 1, status: 'active', price: 5200, stock: 0 }],
}];

const DEMO_LOCALIZED_NAMES: Record<string, { ja: string; vi: string; ms: string }> = {
  prod_001: { ja: '日本製クラフト紙・黒ハードカバーノート', vi: 'Sổ bìa cứng màu đen — Giấy thủ công Nhật Bản', ms: 'Buku nota kulit keras hitam — Kertas kraf Jepun' },
  prod_002: { ja: '水彩紙スケッチブック Pro 200gsm', vi: 'Sổ phác thảo Pro — Giấy màu nước 200gsm', ms: 'Buku lakaran Pro — Kertas cat air 200gsm' },
  prod_003: { ja: '精密画筆12本セット', vi: 'Bộ cọ vẽ chính xác 12 món', ms: 'Set berus lukisan tepat 12 keping' },
  prod_004: { ja: '日本の妖怪・伝統画コレクション（10枚）', vi: 'Sinh vật huyền thoại Nhật Bản — Bộ tranh truyền thống 10 tờ', ms: 'Makhluk mitos Jepun — Koleksi seni tradisional 10 helai' },
  prod_005: { ja: '日本伝統精密裁縫セット', vi: 'Bộ may đo chính xác truyền thống Nhật Bản', ms: 'Set jahitan tepat tradisional Jepun' },
  'prod_import_imp-003': { ja: 'プレミアム書道入門セット', vi: 'Bộ thư pháp cao cấp cho người mới', ms: 'Kit permulaan kaligrafi premium' },
  prod_demo_electronics: { ja: 'ワイヤレス・スタジオヘッドホン', vi: 'Tai nghe phòng thu không dây', ms: 'Fon kepala studio tanpa wayar' },
  prod_demo_headphones_002: { ja: 'コンパクト・ワイヤレスヘッドホン', vi: 'Tai nghe không dây nhỏ gọn', ms: 'Fon kepala tanpa wayar kompak' },
  prod_demo_bag: { ja: 'デイリー・キャンバストートバッグ', vi: 'Túi tote vải canvas hằng ngày', ms: 'Beg tote kanvas harian' },
  prod_demo_books: { ja: '日本デザイン資料集', vi: 'Sách tham khảo thiết kế Nhật Bản', ms: 'Buku rujukan reka bentuk Jepun' },
};

const DEMO_COMPLETED_LOCALE: Record<string, 'ja-JP' | 'vi-VN' | 'ms-MY'> = {
  'prod_import_imp-003': 'vi-VN',
  prod_001: 'ja-JP',
  prod_002: 'vi-VN',
  prod_003: 'ms-MY',
  prod_004: 'ja-JP',
  prod_005: 'vi-VN',
  prod_demo_electronics: 'ms-MY',
  prod_demo_headphones_002: 'ja-JP',
  prod_demo_bag: 'vi-VN',
  prod_demo_books: 'ms-MY',
};

const DEMO_PARTIAL_LOCALE_PRODUCTS = new Set(['prod_002', 'prod_005', 'prod_demo_electronics']);

function withDemoLocales(product: Product): Product {
  const names = DEMO_LOCALIZED_NAMES[product.id];
  const completedLocale = DEMO_COMPLETED_LOCALE[product.id];
  if (!names || !completedLocale) return product;
  const content = {
    'ja-JP': { name: names.ja, description: `${names.ja}の商品仕様、素材、使用方法を日本のお客様向けにまとめています。` },
    'vi-VN': { name: names.vi, description: `${names.vi}. Nội dung sản phẩm, vật liệu và hướng dẫn sử dụng dành cho thị trường Việt Nam.` },
    'ms-MY': { name: names.ms, description: `${names.ms}. Maklumat produk, bahan dan panduan penggunaan untuk pasaran Malaysia.` },
  };
  const selectedContent = DEMO_PARTIAL_LOCALE_PRODUCTS.has(product.id)
    ? { ...content[completedLocale], description: '' }
    : content[completedLocale];
  return {
    ...product,
    localized_content: { [completedLocale]: selectedContent },
  };
}

const IMPORT_REVIEW_DEMO_PRODUCTS: Product[] = [
  { ...SEED_PRODUCTS[2], id: 'prod_import_review_demo', name: 'Artist Precision Brush Set — Imported', sku_code: 'IMP-BRUSH-12', status: 'review', inventory: { wh_crjp: 40, wh_rslsg: 20, wh_fbsmy: 12, wh_fbajp: 0 }, channels: [{ channel: 'amazon', external_id: 'B0IMPORTBRUSH', status: 'active', listing_url: null, last_synced_at: '2026-09-28T08:40:00Z' }, { channel: 'shopee', external_id: 'SHP-BRUSH-12', status: 'active', listing_url: null, last_synced_at: '2026-09-28T08:40:00Z' }, { channel: 'lazada', external_id: 'LZD-BRUSH-12', status: 'pending', listing_url: null, last_synced_at: '2026-09-28T08:40:00Z' }], channel_overrides: { amazon: { enabled: true, title: 'Artist Precision Brush Set 24 Pieces', description: '', price_markup: 0, channel_price: 34, channel_currency: 'USD', brand: 'Da Vinci', listing_sku: 'AMZ-BRUSH-24', category: 'Arts, Crafts & Sewing > Brushes', variant_scope: 'all', listing_mode: 'master', sync_policy: 'automatic', safety_buffer: '0', allocation_cap: '12', media_scope: 'all' }, shopee: { enabled: true, title: 'Artist Precision Brush Set', description: '', price_markup: 0, channel_price: 4900, channel_currency: 'JPY', brand: 'CYBER-RECORDS', listing_sku: 'SHP-BRUSH-12', category: 'Art Supplies > Brushes', variant_scope: 'all', listing_mode: 'master', sync_policy: 'automatic', safety_buffer: '0', allocation_cap: '11', media_scope: 'all' }, lazada: { enabled: true, title: 'Artist Precision Brush Set', description: '', price_markup: 0, channel_price: 4700, channel_currency: 'JPY', brand: 'Da Vinci', listing_sku: 'LZD-BRUSH-24', category: 'Stationery > Painting Tools', variant_scope: 'all', listing_mode: 'master', sync_policy: 'automatic', safety_buffer: '0', allocation_cap: '9', media_scope: 'all' } }, import_result: 'needs_review', import_source: 'Possible product mismatch · 3 linked listings', import_sources: [{ channel: 'amazon', store: 'Prime Beauty US', brand: 'Da Vinci', price: 34, currency: 'USD' }, { channel: 'shopee', store: 'Prime Beauty Official', brand: 'CYBER-RECORDS', price: 4900, currency: 'JPY' }, { channel: 'lazada', store: 'Prime Flagship Store', brand: 'Da Vinci', price: 4700, currency: 'JPY' }], import_issues: ['Product identity mismatch: GTIN, model and pack size differ'], updated_at: '2026-09-28T08:40:00Z' },
  { ...SEED_PRODUCTS[1], id: 'prod_import_ready_demo', name: 'Watercolor Sketchbook Pro — Imported', sku_code: 'IMP-SKETCH-A5', status: 'published', channels: [{ channel: 'lazada', external_id: 'LZD-READY-SKETCH', status: 'active', listing_url: null, last_synced_at: '2026-09-28T08:42:00Z' }], import_result: 'published', import_source: 'Lazada · Prime Flagship Store', import_issues: [], updated_at: '2026-09-28T08:42:00Z' },
];

const ADDITIONAL_IMPORT_TEST_PRODUCTS: Product[] = [
  {
    ...IMPORTED_DEMO_PRODUCTS[0],
    id: 'prod_import_test_incomplete_02',
    name: '[Test 2] Calligraphy Starter Kit',
    sku_code: 'TEST2-CALLI-KIT',
    images: [],
    asin: '',
    status: 'draft',
    import_result: 'incomplete',
    import_source: 'Shopee · Test Store VN',
    import_issues: ['Product image is required'],
    updated_at: '2026-09-28T15:42:00Z',
  },
  {
    ...IMPORT_REVIEW_DEMO_PRODUCTS[1],
    id: 'prod_import_test_ready_02',
    name: '[Test 2] Watercolor Sketchbook Pro',
    sku_code: 'TEST2-SKETCH-A5',
    status: 'published',
    import_result: 'published',
    import_source: 'Lazada · Test Flagship Store',
    import_issues: [],
    updated_at: '2026-09-28T15:41:00Z',
  },
  {
    ...IMPORT_REVIEW_DEMO_PRODUCTS[0],
    id: 'prod_import_test_review_02',
    name: '[Test 2] Artist Precision Brush Set',
    sku_code: 'TEST2-BRUSH-12',
    inventory: { wh_crjp: 7, wh_rslsg: 3, wh_fbsmy: 2, wh_fbajp: 0 },
    status: 'review',
    import_result: 'needs_review',
    import_source: 'Variant and pack conflict · 3 linked test listings',
    import_issues: ['Variant structure conflict: imported listing is a 2-pack with 4 variants'],
    updated_at: '2026-09-28T15:40:00Z',
  },
  {
    ...SEED_PRODUCTS[3],
    id: 'prod_import_test_matched_02',
    name: '[Test 2] Japanese Mythical Art Print',
    sku_code: 'TEST2-MYTH-ART-10',
    channels: [...SEED_PRODUCTS[3].channels, { channel: 'shopee', external_id: 'SHP-TEST2-MYTH', status: 'active', listing_url: null, last_synced_at: '2026-09-28T15:39:00Z' }],
    status: 'published',
    import_result: 'matched',
    import_source: 'Shopee · Test Store VN',
    import_issues: [],
    updated_at: '2026-09-28T15:39:00Z',
  },
];

const DEFAULT_PRODUCTS = [...ADDITIONAL_IMPORT_TEST_PRODUCTS, ...IMPORTED_DEMO_PRODUCTS.map(product => ({ ...product, import_result: 'incomplete' as const, import_source: 'Shopee · Prime Beauty Official', import_issues: ['Product image is required'] })), ...IMPORT_REVIEW_DEMO_PRODUCTS, ...SEED_PRODUCTS, ...CATEGORY_DEMO_PRODUCTS]
  .map(product => product.id === 'prod_001' ? { ...product, channels: [...product.channels, { channel: 'shopee' as const, external_id: 'SHP-9012281', status: 'active' as const, listing_url: null, last_synced_at: '2026-09-28T08:38:00Z' }], import_result: 'matched' as const, import_source: 'Shopee · Prime Beauty Official', import_issues: [], updated_at: '2026-09-28T08:38:00Z' } : product)
  .map(withDemoLocales)
  .map(product => completeActiveProductDemo(product))
  .map(completeWarehouseListingDemo);

// Singleton store backed by localStorage so prototype-created Product Masters
// survive reloads and direct navigation to their detail/edit routes.
const PRODUCT_STORAGE_KEY = 'primeos-product-master-v5';
const DELETED_PRODUCT_STORAGE_KEY = 'primeos-product-master-deleted-v1';
const DEMO_LOCALE_MIGRATION_KEY = 'primeos-demo-locale-shape-v2';
const DEMO_IMPORT_DRAFT_MIGRATION_KEY = 'primeos-incomplete-import-drafts-v1';
const DEMO_LISTING_DRAFT_MIGRATION_KEY = 'primeos-draft-listing-fixtures-v1';
const ACTIVE_DEMO_COMPLETION_KEY = 'primeos-active-demo-completed-v1';
const ACTIVE_DEMO_BACKUP_KEY = 'primeos-active-demo-before-completion-v1';
const INCOMPLETE_IMPORT_DEMO_IDS = new Set(['prod_import_test_incomplete_02', 'prod_import_imp-003']);

function normalizeStoredProduct(product: Product): Product {
  const now = new Date().toISOString();
  const category = resolveCatalogCategory(product, getProductCatalogSettings().categories);
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
    pack_quantity: Number.isInteger(product.pack_quantity) && product.pack_quantity! > 0 ? product.pack_quantity : undefined,
    brand: typeof product.brand === 'string' ? product.brand : '',
    brandId: typeof product.brandId === 'string' ? product.brandId : undefined,
    asin: typeof product.asin === 'string' ? product.asin : '',
    manufacturer: typeof product.manufacturer === 'string' ? product.manufacturer : '',
    category: category?.name ?? (typeof product.category === 'string' ? product.category : ''),
    categoryId: product.categoryId || category?.id,
    condition: typeof product.condition === 'string' ? product.condition : 'new',
    description: typeof product.description === 'string' ? product.description : '',
    localized_content: product.localized_content && typeof product.localized_content === 'object' ? product.localized_content : {},
    original_price: Number(product.original_price) || 0,
    retail_price: Number(product.retail_price) || 0,
    price_currency: typeof product.price_currency === 'string' ? product.price_currency : 'JPY',
    market_prices: Array.isArray(product.market_prices) ? product.market_prices : [],
    price_policies: Array.isArray(product.price_policies) ? product.price_policies : [],
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
    field_mappings: product.field_mappings && typeof product.field_mappings === 'object' && !Array.isArray(product.field_mappings) ? structuredClone(product.field_mappings) : undefined,
    inventory_adjustments: Array.isArray(product.inventory_adjustments) ? product.inventory_adjustments : [],
    inventory_transfers: Array.isArray(product.inventory_transfers) ? product.inventory_transfers : [],
    warehouse_positions: Array.isArray(product.warehouse_positions) ? structuredClone(product.warehouse_positions) : [],
    inventory: product.inventory && typeof product.inventory === 'object' && !Array.isArray(product.inventory) ? normalizeDemoStockLocations(product.inventory) : {},
    has_variants: Boolean(product.has_variants),
    channels: Array.isArray(product.channels) ? product.channels : [],
    channel_overrides: product.channel_overrides && typeof product.channel_overrides === 'object' ? product.channel_overrides : {},
    associations: Array.isArray(product.associations) ? product.associations : [],
    revisions: Array.isArray(product.revisions) ? product.revisions : [],
    activity: Array.isArray(product.activity) ? product.activity : [],
    record_version: Number(product.record_version) || 1,
    status: ['draft', 'review', 'published', 'archived'].includes(product.status) ? product.status : 'draft',
    import_activation_paused: product.import_activation_paused === true,
    import_result: ['needs_review', 'incomplete', 'ready', 'matched', 'published'].includes(product.import_result ?? '') ? product.import_result : undefined,
    import_source: typeof product.import_source === 'string' ? product.import_source : undefined,
    import_issues: Array.isArray(product.import_issues) ? product.import_issues.filter((issue): issue is string => typeof issue === 'string') : undefined,
    import_sources: Array.isArray(product.import_sources) ? product.import_sources : undefined,
    listing_review_migrated: product.listing_review_migrated === true,
    created_at: typeof product.created_at === 'string' ? product.created_at : now,
    updated_at: typeof product.updated_at === 'string' ? product.updated_at : now,
    variant_options: Array.isArray(product.variant_options)
      ? product.variant_options.filter(option => option && typeof option.attributeKey === 'string' && typeof option.name === 'string' && Array.isArray(option.values)).map(option => ({ attributeKey: option.attributeKey, name: option.name, values: option.values.filter((value): value is string => typeof value === 'string') }))
      : undefined,
    skus: Array.isArray(product.skus) ? product.skus.map(sku => ({ ...sku, ...(sku.stock_by_location ? { stock_by_location: normalizeDemoStockLocations(sku.stock_by_location) } : {}) })) : [],
    _variants: Array.isArray(product._variants) ? product._variants : undefined,
  };
}

function activateValidatedImport(product: Product): Product {
  // The import validator owns readiness. Never bypass unresolved mapping or
  // missing-data decisions, and never reactivate an archived product.
  const importPassed = product.import_result === 'ready' || product.import_result === 'published';
  if (!importPassed || product.import_issues?.length || product.status === 'archived' || product.import_activation_paused) return product;
  if (product.status === 'published' && product.import_result === 'published') return product;

  const now = new Date().toISOString();
  const revisions = product.revisions ?? [];
  return {
    ...product,
    status: 'published',
    import_result: 'published',
    updated_at: now,
    revisions: product.status === 'published' ? revisions : [...revisions, {
      id: genId('rev'),
      number: Math.max(0, ...revisions.map(revision => revision.number)) + 1,
      status: 'published',
      createdAt: now,
      createdBy: 'PrimeOS',
      summary: 'Activated automatically after import validation',
    }],
  };
}

function loadStoredProducts(): Product[] {
  if (typeof window === 'undefined') return DEFAULT_PRODUCTS.map(normalizeStoredProduct);
  try {
    const raw = window.localStorage.getItem(PRODUCT_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(DEMO_LOCALE_MIGRATION_KEY, '1');
      window.localStorage.setItem(DEMO_IMPORT_DRAFT_MIGRATION_KEY, '1');
      window.localStorage.setItem(DEMO_LISTING_DRAFT_MIGRATION_KEY, '1');
      return DEFAULT_PRODUCTS.map(normalizeStoredProduct);
    }
    const stored = JSON.parse(raw) as unknown;
    if (!Array.isArray(stored)) return DEFAULT_PRODUCTS.map(normalizeStoredProduct);
    const shouldResetDemoLocales = window.localStorage.getItem(DEMO_LOCALE_MIGRATION_KEY) !== '1';
    const rawProducts = stored.filter((item): item is Product => Boolean(item && typeof item === 'object' && 'id' in item && 'sku_code' in item));
    const importItems = getCatalogImportItems({ requireConfirmation: true });
    const storedProducts = rawProducts.map(product => Array.isArray(product.channels) ? recoverListingShopSnapshots(product, importItems) : product);
    if (storedProducts.some((product, index) => product !== rawProducts[index])) {
      // Persist only recovered listing snapshots, not unrelated normalization or new timestamps.
      try { window.localStorage.setItem(PRODUCT_STORAGE_KEY, JSON.stringify(storedProducts)); }
      catch { /* Keep recovered values visible without discarding the original products on a storage failure. */ }
    }
    // Reset the two requested incomplete demo cases to Draft once, preserving
    // their revision history and listings. Future publications stay untouched.
    const shouldResetImportDrafts = window.localStorage.getItem(DEMO_IMPORT_DRAFT_MIGRATION_KEY) !== '1';
    const shouldRepairDraftListings = window.localStorage.getItem(DEMO_LISTING_DRAFT_MIGRATION_KEY) !== '1';
    const valid = storedProducts.map(product => {
      if (shouldRepairDraftListings && !getSavedAmazonListing(product.id)) product = repairDraftListingDemo(product);
      return shouldResetImportDrafts && INCOMPLETE_IMPORT_DEMO_IDS.has(product.id)
        && product.status === 'published'
        && product.import_result === 'incomplete'
        ? { ...product, status: 'draft' as const }
        : product;
    });
    if (valid.some((product, index) => product !== storedProducts[index])) {
      window.localStorage.setItem(PRODUCT_STORAGE_KEY, JSON.stringify(valid));
    }
    if (shouldResetImportDrafts) window.localStorage.setItem(DEMO_IMPORT_DRAFT_MIGRATION_KEY, '1');
    if (shouldRepairDraftListings) window.localStorage.setItem(DEMO_LISTING_DRAFT_MIGRATION_KEY, '1');
    const migrated = valid.map(storedProduct => {
      const product = normalizeStoredProduct(storedProduct);
      const normalized = (product as Product & { product_type?: string }).product_type === 'bundle'
        ? { ...product, product_type: product.has_variants ? 'variant' as const : 'single' as const }
        : product;
      const defaultVariantOptions = DEFAULT_PRODUCTS.find(candidate => candidate.id === normalized.id)?.variant_options;
      const defaultLocalizedContent = DEFAULT_PRODUCTS.find(candidate => candidate.id === normalized.id)?.localized_content;
      const withVariantOptions = normalized.has_variants && !normalized.variant_options?.length && defaultVariantOptions?.length
        ? { ...normalized, variant_options: defaultVariantOptions.map(option => ({ ...option, values: [...option.values] })) }
        : normalized;
      // Shipped demo masters intentionally keep only one completed secondary locale
      // so every market-level locale path remains testable. User-created masters are untouched.
      const withLocalizedContent = shouldResetDemoLocales && defaultLocalizedContent && DEMO_COMPLETED_LOCALE[normalized.id]
        ? { ...withVariantOptions, localized_content: { ...defaultLocalizedContent } }
        : withVariantOptions;
      // Keep the shipped demo taxonomy representative without overwriting user-assigned categories.
      const defaultImport = DEFAULT_PRODUCTS.find(candidate => candidate.id === withLocalizedContent.id);
      // Editable drafts and completed imports are not fixtures to reset on load.
      // In particular, preserve uploaded media and the linked listings' own state.
      if (withLocalizedContent.listing_review_migrated) return withLocalizedContent;
      if (INCOMPLETE_IMPORT_DEMO_IDS.has(withLocalizedContent.id)
        || withLocalizedContent.import_result === 'ready'
        || withLocalizedContent.import_result === 'published') {
        return {
          ...withLocalizedContent,
          import_result: withLocalizedContent.import_result ?? defaultImport?.import_result,
          import_source: withLocalizedContent.import_source ?? defaultImport?.import_source,
          import_issues: withLocalizedContent.import_result ? withLocalizedContent.import_issues : defaultImport?.import_issues,
        };
      }
      const withImportDemo = defaultImport?.import_result
        ? {
            ...withLocalizedContent,
            import_result: withLocalizedContent.import_result ?? defaultImport.import_result,
            import_source: withLocalizedContent.import_source ?? defaultImport.import_source,
            import_sources: withLocalizedContent.import_sources ?? defaultImport.import_sources,
            import_issues: withLocalizedContent.import_result === 'needs_review' && (defaultImport.id === 'prod_import_review_demo' || defaultImport.id === 'prod_import_test_review_02')
              ? defaultImport.import_issues
              : withLocalizedContent.import_result ? withLocalizedContent.import_issues : defaultImport.import_issues,
            // Saved listing identities and source choices survive fixture updates.
            channels: withLocalizedContent.channels,
            channel_overrides: withLocalizedContent.channel_overrides ?? defaultImport.channel_overrides,
            ...(defaultImport.import_result === 'incomplete' && defaultImport.import_issues?.includes('Product image is required')
              ? { images: [], image_alt_texts: [], asin: '' }
              : {}),
          }
        : withLocalizedContent;
      const hasRecordedStockOperation = Boolean(withImportDemo.inventory_adjustments?.length || withImportDemo.inventory_transfers?.length || withImportDemo.warehouse_positions?.length);
      const withOperationalDemoStock = hasRecordedStockOperation ? withImportDemo : withImportDemo.id === 'prod_import_test_review_02'
        ? { ...withImportDemo, inventory: { wh_crjp: 7, wh_rslsg: 3, wh_fbsmy: 2, wh_fbajp: 0 } }
        : withImportDemo.id === 'prod_import_review_demo' || withImportDemo.id === 'prod_003'
          ? { ...withImportDemo, inventory: { wh_crjp: 40, wh_rslsg: 20, wh_fbsmy: 12, wh_fbajp: 0 } }
          : withImportDemo;
      return !storedProduct.categoryId && withOperationalDemoStock.id === 'prod_003' && withOperationalDemoStock.category === 'Art Supplies'
        ? { ...withOperationalDemoStock, category: 'Painting Accessories', categoryId: 'painting-accessories' }
        : !storedProduct.categoryId && withOperationalDemoStock.id === 'prod_demo_electronics' && withOperationalDemoStock.category === 'Electronics'
          ? { ...withOperationalDemoStock, category: 'Headphones', categoryId: 'headphones' }
          : withOperationalDemoStock;
    });
    if (shouldResetDemoLocales) window.localStorage.setItem(DEMO_LOCALE_MIGRATION_KEY, '1');
    const storedIds = new Set(migrated.map(product => product.id));
    const deletedIds = new Set<string>(JSON.parse(window.localStorage.getItem(DELETED_PRODUCT_STORAGE_KEY) ?? '[]'));
    return [...migrated.filter(product => !deletedIds.has(product.id)), ...DEFAULT_PRODUCTS.filter(product => !storedIds.has(product.id) && !deletedIds.has(product.id)).map(normalizeStoredProduct)];
  } catch {
    return DEFAULT_PRODUCTS.map(normalizeStoredProduct);
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

/** Migrate references only; reading a product must not persist unrelated demo normalization. */
function persistCategoryReferences(): void {
  if (typeof window === 'undefined') return;
  try {
    const stored = JSON.parse(window.localStorage.getItem(PRODUCT_STORAGE_KEY) ?? 'null') as Product[] | null;
    if (!Array.isArray(stored)) return;
    let changed = false;
    const migrated = stored.map(product => {
      const resolved = _products.find(candidate => candidate.id === product.id);
      if (!resolved?.categoryId || (product.categoryId === resolved.categoryId && product.category === resolved.category)) return product;
      changed = true;
      return { ...product, categoryId: resolved.categoryId, category: resolved.category };
    });
    if (changed) window.localStorage.setItem(PRODUCT_STORAGE_KEY, JSON.stringify(migrated));
  } catch { /* Leave the original storage untouched if migration cannot be persisted. */ }
}

function completeStoredActiveDemo(products: Product[]): Product[] {
  if (typeof window === 'undefined' || window.localStorage.getItem(ACTIVE_DEMO_COMPLETION_KEY) === '1') return products;
  const completed = products.map(product => completeActiveProductDemo(product));
  const changed = completed.filter((product, index) => product !== products[index]);
  try {
    if (changed.length) {
      const stored = JSON.parse(window.localStorage.getItem(PRODUCT_STORAGE_KEY) ?? 'null') as Product[] | null;
      const changedIds = new Set(changed.map(product => product.id));
      // Keep the original target records for recovery; never overwrite other browser records.
      window.localStorage.setItem(ACTIVE_DEMO_BACKUP_KEY, JSON.stringify((stored ?? products).filter(product => changedIds.has(product.id))));
      const persisted = stored
        ? stored.map(product => changed.find(candidate => candidate.id === product.id) ?? product)
        : completed;
      window.localStorage.setItem(PRODUCT_STORAGE_KEY, JSON.stringify(persisted));
    }
    window.localStorage.setItem(ACTIVE_DEMO_COMPLETION_KEY, '1');
    return completed;
  } catch {
    // Do not report fixture changes that could not be saved.
    return products;
  }
}

function completeStoredWarehouseListings(products: Product[]): Product[] {
  if (typeof window === 'undefined') return products.map(completeWarehouseListingDemo);
  const key = 'primeos-warehouse-listing-identity-v1';
  if (window.localStorage.getItem(key) === '1') return products;
  const completed = products.map(completeWarehouseListingDemo);
  try {
    const stored = JSON.parse(window.localStorage.getItem(PRODUCT_STORAGE_KEY) ?? 'null') as Product[] | null;
    if (stored) {
      const changed = completed.filter((product, index) => product !== products[index]);
      if (changed.length) {
        window.localStorage.setItem('primeos-warehouse-listing-before-completion-v1', JSON.stringify(stored.filter(product => changed.some(item => item.id === product.id))));
        // Persist only listing changes, not other normalization from reading the catalog.
        window.localStorage.setItem(PRODUCT_STORAGE_KEY, JSON.stringify(stored.map(product => {
          const next = changed.find(item => item.id === product.id);
          return next ? { ...product, channels: next.channels } : product;
        })));
      }
    }
    window.localStorage.setItem(key, '1');
    return completed;
  } catch { return products; }
}

const loadedProducts = completeStoredWarehouseListings(loadStoredProducts());
const activatedProducts = loadedProducts.map(activateValidatedImport);
let _products: Product[] = completeStoredActiveDemo(activatedProducts);
let categoryReferencesPersisted = false;
if (activatedProducts.some((product, index) => product !== loadedProducts[index])) persistProducts();

export function getProducts(): Product[] {
  const categories = getProductCatalogSettings().categories;
  let changed = false;
  const resolved = _products.map(product => {
    const category = resolveCatalogCategory(product, categories);
    if (!category || (product.categoryId === category.id && product.category === category.name)) return product;
    changed = true;
    return { ...product, categoryId: category.id, category: category.name };
  });
  if (changed) _products = resolved;
  if (changed || !categoryReferencesPersisted) { persistCategoryReferences(); categoryReferencesPersisted = true; }
  return _products;
}

export function addProduct(p: Product): void;
export function addProduct(p: Product, options: { requirePersistence?: boolean }): void;
export function addProduct(p: Product, options?: { requirePersistence?: boolean }): void {
  const normalized = withProductActivity(_products.find(product => product.id === p.id), activateValidatedImport(normalizeStoredProduct(p)));
  const next = [normalized, ..._products.filter(product => product.id !== normalized.id)];
  if (options?.requirePersistence && typeof window !== 'undefined') window.localStorage.setItem(PRODUCT_STORAGE_KEY, JSON.stringify(next));
  _products = next;
  if (!options?.requirePersistence) persistProducts();
}

export function updateProduct(id: string, p: Partial<Product> & { id: string }, options?: { requirePersistence?: boolean }): void {
  const next = _products.map(x => x.id === id ? withProductActivity(x, activateValidatedImport(normalizeStoredProduct({ ...x, ...p, ...(p.category !== undefined && p.category !== x.category && !Object.prototype.hasOwnProperty.call(p, 'categoryId') ? { categoryId: undefined } : {}), updated_at: new Date().toISOString() }))) : x);
  // Stock transfers must persist the count and its audit record together before changing live state.
  if (options?.requirePersistence && typeof window !== 'undefined') window.localStorage.setItem(PRODUCT_STORAGE_KEY, JSON.stringify(next));
  _products = next;
  if (!options?.requirePersistence) persistProducts();
}

/** Save one inventory operation, including multiple SKU counts, atomically. */
export function commitWarehouseProducts(updates: Product[]): void {
  const byId = new Map(updates.map(product => [product.id, product]));
  if (byId.size !== updates.length || updates.some(product => !_products.some(current => current.id === product.id))) throw new Error('Products changed. Reload and review the selected products.');
  const now = new Date().toISOString();
  const next = _products.map(current => {
    const update = byId.get(current.id);
    return update ? { ...current, inventory: update.inventory, skus: update.skus, warehouse_positions: update.warehouse_positions, inventory_adjustments: update.inventory_adjustments, inventory_transfers: update.inventory_transfers, updated_at: now } : current;
  });
  if (typeof window !== 'undefined') window.localStorage.setItem(PRODUCT_STORAGE_KEY, JSON.stringify(next));
  _products = next;
}

/** Commit several listing relationships in one write, before exposing any live-state change. */
export function updateProductLinksAtomically(updates: Array<Pick<Product, 'id' | 'channels' | 'import_sources' | 'record_version'> & Partial<Pick<Product, 'channel_overrides'>>>, options?: { activateMasters?: boolean }): void {
  const byId = new Map(updates.map(update => [update.id, update]));
  if (!updates.length || byId.size !== updates.length || updates.some(update => !_products.some(product => product.id === update.id))) {
    throw new Error('The selected Masters changed. Return to review and try again.');
  }
  if (options?.activateMasters && _products.some(product => byId.has(product.id) && product.status === 'archived')) {
    throw new Error('Archived products must be restored before confirming listing links.');
  }
  const now = new Date().toISOString();
  const next = _products.map(product => {
    const update = byId.get(product.id);
    return update ? withProductActivity(product, { ...product, channels: update.channels, import_sources: update.import_sources, record_version: update.record_version, ...(update.channel_overrides ? { channel_overrides: update.channel_overrides } : {}), listing_review_migrated: true, ...(options?.activateMasters ? { status: 'published' as const, import_activation_paused: false } : {}), updated_at: now }, now) : product;
  });
  if (typeof window !== 'undefined') window.localStorage.setItem(PRODUCT_STORAGE_KEY, JSON.stringify(next));
  _products = next;
}

/** A reviewed reassignment and an optional new Master must succeed or fail together. */
export function commitListingReviewProducts(updates: Product[], created?: Product): void {
  const byId = new Map(updates.map(product => [product.id, product]));
  if (byId.size !== updates.length || updates.some(product => !_products.some(current => current.id === product.id))
    || (created && (_products.some(product => product.id === created.id) || byId.has(created.id)))) {
    throw new Error('The selected Masters changed. Return to review and try again.');
  }
  const now = new Date().toISOString();
  const next = _products.map(product => byId.has(product.id) ? withProductActivity(product, normalizeStoredProduct({ ...byId.get(product.id)!, updated_at: now }), now) : product);
  if (created) next.unshift(withProductActivity(undefined, normalizeStoredProduct(created), now));
  // Preserve the caller's explicit lifecycle decision; never infer status from completeness.
  if (typeof window !== 'undefined') window.localStorage.setItem(PRODUCT_STORAGE_KEY, JSON.stringify(next));
  _products = next;
}

export function deleteProduct(id: string, options?: { requirePersistence?: boolean }): void {
  // The tombstone is authoritative on reload, even if saving the filtered list fails.
  // Lifecycle UI must not report success when deletion could not be persisted.
  if (options?.requirePersistence && typeof window !== 'undefined') {
    const deletedIds = new Set<string>(JSON.parse(window.localStorage.getItem(DELETED_PRODUCT_STORAGE_KEY) ?? '[]'));
    deletedIds.add(id);
    window.localStorage.setItem(DELETED_PRODUCT_STORAGE_KEY, JSON.stringify([...deletedIds]));
  }
  _products = _products.filter(x => x.id !== id);
  if (typeof window !== 'undefined') {
    try {
      const deletedIds = new Set<string>(JSON.parse(window.localStorage.getItem(DELETED_PRODUCT_STORAGE_KEY) ?? '[]'));
      deletedIds.add(id);
      window.localStorage.setItem(DELETED_PRODUCT_STORAGE_KEY, JSON.stringify([...deletedIds]));
    } catch {
      // The in-memory deletion still works if storage is unavailable.
    }
  }
  persistProducts();
}

export function getProductById(id: string): Product | undefined {
  return getProducts().find(x => x.id === id);
}

/** Operational demo generators must never invent orders or holds for user-created masters. */
export function isDemoProduct(id: string): boolean {
  return DEFAULT_PRODUCTS.some(product => product.id === id);
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
