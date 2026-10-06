import { Fragment, useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Archive, RotateCcw, Info, History, Image, Package, Truck, Layers, Check, Lock,
  Plus, X, Trash2, AlertTriangle, Upload, Loader2, Boxes, PackageCheck,
  Globe2, Circle, CircleCheck, CircleAlert, CloudUpload, Search, ChevronDown, ChevronRight, ExternalLink,
  ShoppingBag, Store, MonitorSmartphone, MessageSquare, Radio, Tags, Star, MoreHorizontal,
  Bold, Italic, Underline, Strikethrough, Code2, List, ListOrdered, Quote, Minus, AlignLeft, AlignCenter, AlignRight, AlignJustify, Link2, Undo2, Redo2, RefreshCw,
} from 'lucide-react';

import { ConfirmDialog } from '@/components/system/ConfirmDialog';
import { ProductLifecycleMenuItems } from '@/components/products/ProductLifecycleActions';
import { useProductLifecycleActions } from '@/hooks/use-product-lifecycle';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { addProduct, updateProduct, getProductById, getAllSkus, getProducts, isDemoProduct, type Product, type ChannelListing, type ProductType, type ProductAssociation } from '@/lib/product-store';
import { ProductActivityHistory } from '@/components/products/ProductActivityHistory';
import { ProductWorkspaceHelp } from '@/components/products/ProductWorkspaceHelp';
import { ProductSalesPerformance } from '@/components/products/ProductSalesPerformance';
import { ProductOverviewSnapshot } from '@/components/products/ProductOverviewSnapshot';
import { ProductChannelListings, type ProductChannelListingRow } from '@/components/products/ProductChannelListings';
import { LinkedListingDetails, type LinkedListingDetail } from '@/components/products/LinkedListingDetails';
import { ShopListingEditor } from '@/components/products/ShopListingEditor';
import { LinkExistingListingsDialog } from '@/components/products/LinkExistingListingsDialog';
import { ListingRowActions } from '@/components/products/ListingRowActions';
import { listingDraftTableData, listingEditSnapshot, saveListingLocalDraft } from '@/lib/listing-local-draft';
import { unlinkListingFromMaster } from '@/lib/listing-unlink';
import { listingActivityKey } from '@/lib/product-activity';
import { configuredListing } from '@/lib/product-channel-listings';
import { resolveListingShopData, savedListingPrice, type ListingShopData } from '@/lib/listing-shop-data';
import { listingShopDemoData } from '@/lib/listing-shop-demo';
import { ListingShopValue } from '@/components/products/ListingShopValue';
import { ListingMasterSyncControl, ListingMasterSyncDialog } from '@/components/products/ListingMasterSync';
import { listingMasterSync, masterSyncSnapshot, saveListingMasterSync, syncListingOverride, syncsField, type MasterSyncPreference } from '@/lib/listing-master-sync';
import { getWarehouses } from '@/lib/warehouse-store';
import type { AmazonVariant } from '@/lib/amazon-catalog';
import { uploadProductImage, validateImageFile } from '@/lib/product-images';
import { validateSku, validateAttributeValue } from '@/lib/product-validator';
import { useI18n } from '@/lib/i18n/I18nContext';
import { formatLocalizedNumber, formatMessage } from '@/lib/i18n/format';
import { cn } from '@/lib/utils';
import { ChannelListingWizard, type ChannelWizardDraft } from '@/components/products/ChannelListingWizard';
import { LISTING_DESTINATIONS as OVERRIDE_CHANNELS } from '@/lib/channel-listing-destinations';
import { availableListingDestinations, createChannelListingDrafts, freshChannelListingDrafts } from '@/lib/channel-listing-creation';
import { ChannelListingEditorDrawer } from '@/components/products/ChannelListingEditorDrawer';
import { ApplyMasterSheet } from '@/components/products/ApplyMasterSheet';
import { getActiveCatalogBrands, getActiveCatalogCategories, getAttributesForCategory, getProductCatalogSettings, saveProductCatalogSettings, getActiveOrgLocales, resolveCatalogCategory, type CatalogAttribute, type CatalogBrand, type OrgLocaleConfig } from '@/lib/product-catalog-settings-store';
import { assignedCategoryAttributes, categorySchemaDiff, missingCategoryAttributes, reconcileSpecifications, retainedSpecifications, serializeSpecifications } from '@/lib/category-schema';
import { rakutenBrandSuggestion } from '@/lib/brand-marketplace-demo';
import { CategorySchemaChanges } from '@/components/products/CategorySchemaChanges';
import { canonicalizeLocale, validateAttributeLocale } from '@/lib/locale-utils';
import { CHANNEL_MARKET_LOCALES } from '@/lib/channel-market-locale';
import { getCatalogImportItems } from '@/lib/catalog-import-store';
import { ChannelLogo } from '@/components/channels/ChannelLogo';
import { getProductAttentionTarget } from '@/lib/product-attention-navigation';
import { AdjustWarehouseStockDialog } from '@/components/inventory/AdjustWarehouseStockDialog';
import { ManageStockHoldsButton } from '@/components/inventory/ManageStockHoldsDialog';
import type { StockAdjustmentTarget } from '@/components/inventory/WarehouseStockTable';
import { canEditWarehouseStock, recordedQuantity } from '@/lib/warehouse-stock-view';
import { initialListingPricing, quoteListingPrice, pricingNeedsReview, formatPrice } from '@/lib/pricing-rules';
import { usePricingRevision } from '@/hooks/use-pricing';
import { getMasterReadinessChecks, hydrateExistingVariants, richTextPlainText, type VariantGroup, type VariantItem } from '@/lib/product-master-readiness';
import { getMasterMediaReadiness, MIN_MASTER_IMAGES } from '@/lib/product-master-media';


// ─── Types ────────────────────────────────────────────────────────────────────

type OverrideChannel = 'webstore' | 'pos' | 'shopee' | 'lazada' | 'tiktok' | 'amazon' | 'social' | 'rakuten';
interface ChannelOverrideForm extends ChannelWizardDraft {}

type ProductWorkspace = 'overview' | 'product-data' | 'commerce' | 'distribution' | 'activity';
/** BCP-47 locale string — driven by OrgLocaleConfig, no longer a hardcoded union. */
type ContentLocale = string;


const PRODUCT_WORKSPACES: Array<{ id: ProductWorkspace; label: string; description: string; icon: typeof Package }> = [
  { id: 'overview', label: 'Overview', description: 'Status and next steps', icon: Package },
  { id: 'product-data', label: 'Product data', description: 'Identity, content and media', icon: Tags },
  { id: 'commerce', label: 'Pricing & Inventory', description: 'Variants, pricing and stock', icon: ShoppingBag },
  { id: 'distribution', label: 'Channel listings', description: 'Shop-specific settings', icon: Globe2 },
  { id: 'activity', label: 'Activity history', description: 'Master and listing activity', icon: History },
];

function resolveProductWorkspace(value: string | null): ProductWorkspace {
  return PRODUCT_WORKSPACES.some(workspace => workspace.id === value) ? value as ProductWorkspace : 'overview';
}

function completionWorkspaceFor(checkId: string): { id: ProductWorkspace; label: string } {
  if (['identity', 'content', 'category', 'attributes', 'media', 'shipping'].includes(checkId)) return { id: 'product-data', label: 'Product data' };
  if (['price', 'variants'].includes(checkId)) return { id: 'commerce', label: 'Pricing & Inventory' };
  return { id: 'distribution', label: 'Channel listings' };
}

interface FormState {
  gtin: string;
  mpn: string;
  model_number: string;
  brand: string;
  brandId: string;
  asin: string;
  manufacturer: string;
  sku_code: string;
  name: string;                   // ← was: title
  product_type: ProductType;     // single | configurable variants
  description: string;
  category: string;
  categoryId: string;
  condition: string;
  original_price: string;
  retail_price: string;
  price_currency: string;
  prod_length: string;
  prod_height: string;
  prod_width: string;
  prod_weight: string;
  pkg_length: string;
  pkg_height: string;
  pkg_width: string;
  pkg_weight: string;
  country_of_origin: string;
  hs_code: string;               // ← NEW: HS code for cross-border
  has_variants: boolean;
  slug: string;
  meta_title: string;
  meta_description: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const WAREHOUSES = getWarehouses().map(warehouse => ({ id: warehouse.id, label: warehouse.name, code: warehouse.code }));
const CONDITIONS = ['new', 'refurbished', 'used_like_new', 'used_acceptable'];
/** ISO 4217 world currencies — code + display name for searchable picker */
const WORLD_CURRENCIES: { code: string; name: string }[] = [
  { code: 'AED', name: 'UAE Dirham' }, { code: 'AFN', name: 'Afghan Afghani' },
  { code: 'ALL', name: 'Albanian Lek' }, { code: 'AMD', name: 'Armenian Dram' },
  { code: 'ANG', name: 'Netherlands Antillean Guilder' }, { code: 'AOA', name: 'Angolan Kwanza' },
  { code: 'ARS', name: 'Argentine Peso' }, { code: 'AUD', name: 'Australian Dollar' },
  { code: 'AWG', name: 'Aruban Florin' }, { code: 'AZN', name: 'Azerbaijani Manat' },
  { code: 'BAM', name: 'Bosnia-Herzegovina Convertible Mark' }, { code: 'BBD', name: 'Barbadian Dollar' },
  { code: 'BDT', name: 'Bangladeshi Taka' }, { code: 'BGN', name: 'Bulgarian Lev' },
  { code: 'BHD', name: 'Bahraini Dinar' }, { code: 'BIF', name: 'Burundian Franc' },
  { code: 'BMD', name: 'Bermudian Dollar' }, { code: 'BND', name: 'Brunei Dollar' },
  { code: 'BOB', name: 'Bolivian Boliviano' }, { code: 'BRL', name: 'Brazilian Real' },
  { code: 'BSD', name: 'Bahamian Dollar' }, { code: 'BTN', name: 'Bhutanese Ngultrum' },
  { code: 'BWP', name: 'Botswanan Pula' }, { code: 'BYN', name: 'Belarusian Ruble' },
  { code: 'BZD', name: 'Belize Dollar' }, { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'CDF', name: 'Congolese Franc' }, { code: 'CHF', name: 'Swiss Franc' },
  { code: 'CLP', name: 'Chilean Peso' }, { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'COP', name: 'Colombian Peso' }, { code: 'CRC', name: 'Costa Rican Colón' },
  { code: 'CUP', name: 'Cuban Peso' }, { code: 'CVE', name: 'Cape Verdean Escudo' },
  { code: 'CZK', name: 'Czech Koruna' }, { code: 'DJF', name: 'Djiboutian Franc' },
  { code: 'DKK', name: 'Danish Krone' }, { code: 'DOP', name: 'Dominican Peso' },
  { code: 'DZD', name: 'Algerian Dinar' }, { code: 'EGP', name: 'Egyptian Pound' },
  { code: 'ERN', name: 'Eritrean Nakfa' }, { code: 'ETB', name: 'Ethiopian Birr' },
  { code: 'EUR', name: 'Euro' }, { code: 'FJD', name: 'Fijian Dollar' },
  { code: 'FKP', name: 'Falkland Islands Pound' }, { code: 'GBP', name: 'British Pound Sterling' },
  { code: 'GEL', name: 'Georgian Lari' }, { code: 'GHS', name: 'Ghanaian Cedi' },
  { code: 'GIP', name: 'Gibraltar Pound' }, { code: 'GMD', name: 'Gambian Dalasi' },
  { code: 'GNF', name: 'Guinean Franc' }, { code: 'GTQ', name: 'Guatemalan Quetzal' },
  { code: 'GYD', name: 'Guyanaese Dollar' }, { code: 'HKD', name: 'Hong Kong Dollar' },
  { code: 'HNL', name: 'Honduran Lempira' }, { code: 'HTG', name: 'Haitian Gourde' },
  { code: 'HUF', name: 'Hungarian Forint' }, { code: 'IDR', name: 'Indonesian Rupiah' },
  { code: 'ILS', name: 'Israeli New Shekel' }, { code: 'INR', name: 'Indian Rupee' },
  { code: 'IQD', name: 'Iraqi Dinar' }, { code: 'IRR', name: 'Iranian Rial' },
  { code: 'ISK', name: 'Icelandic Króna' }, { code: 'JMD', name: 'Jamaican Dollar' },
  { code: 'JOD', name: 'Jordanian Dinar' }, { code: 'JPY', name: 'Japanese Yen' },
  { code: 'KES', name: 'Kenyan Shilling' }, { code: 'KGS', name: 'Kyrgystani Som' },
  { code: 'KHR', name: 'Cambodian Riel' }, { code: 'KMF', name: 'Comorian Franc' },
  { code: 'KRW', name: 'South Korean Won' }, { code: 'KWD', name: 'Kuwaiti Dinar' },
  { code: 'KYD', name: 'Cayman Islands Dollar' }, { code: 'KZT', name: 'Kazakhstani Tenge' },
  { code: 'LAK', name: 'Laotian Kip' }, { code: 'LBP', name: 'Lebanese Pound' },
  { code: 'LKR', name: 'Sri Lankan Rupee' }, { code: 'LRD', name: 'Liberian Dollar' },
  { code: 'LSL', name: 'Lesotho Loti' }, { code: 'LYD', name: 'Libyan Dinar' },
  { code: 'MAD', name: 'Moroccan Dirham' }, { code: 'MDL', name: 'Moldovan Leu' },
  { code: 'MGA', name: 'Malagasy Ariary' }, { code: 'MKD', name: 'Macedonian Denar' },
  { code: 'MMK', name: 'Myanmar Kyat' }, { code: 'MNT', name: 'Mongolian Tugrik' },
  { code: 'MOP', name: 'Macanese Pataca' }, { code: 'MRU', name: 'Mauritanian Ouguiya' },
  { code: 'MUR', name: 'Mauritian Rupee' }, { code: 'MVR', name: 'Maldivian Rufiyaa' },
  { code: 'MWK', name: 'Malawian Kwacha' }, { code: 'MXN', name: 'Mexican Peso' },
  { code: 'MYR', name: 'Malaysian Ringgit' }, { code: 'MZN', name: 'Mozambican Metical' },
  { code: 'NAD', name: 'Namibian Dollar' }, { code: 'NGN', name: 'Nigerian Naira' },
  { code: 'NIO', name: 'Nicaraguan Córdoba' }, { code: 'NOK', name: 'Norwegian Krone' },
  { code: 'NPR', name: 'Nepalese Rupee' }, { code: 'NZD', name: 'New Zealand Dollar' },
  { code: 'OMR', name: 'Omani Rial' }, { code: 'PAB', name: 'Panamanian Balboa' },
  { code: 'PEN', name: 'Peruvian Sol' }, { code: 'PGK', name: 'Papua New Guinean Kina' },
  { code: 'PHP', name: 'Philippine Peso' }, { code: 'PKR', name: 'Pakistani Rupee' },
  { code: 'PLN', name: 'Polish Zloty' }, { code: 'PYG', name: 'Paraguayan Guarani' },
  { code: 'QAR', name: 'Qatari Riyal' }, { code: 'RON', name: 'Romanian Leu' },
  { code: 'RSD', name: 'Serbian Dinar' }, { code: 'RUB', name: 'Russian Ruble' },
  { code: 'RWF', name: 'Rwandan Franc' }, { code: 'SAR', name: 'Saudi Riyal' },
  { code: 'SBD', name: 'Solomon Islands Dollar' }, { code: 'SCR', name: 'Seychellois Rupee' },
  { code: 'SDG', name: 'Sudanese Pound' }, { code: 'SEK', name: 'Swedish Krona' },
  { code: 'SGD', name: 'Singapore Dollar' }, { code: 'SHP', name: 'Saint Helena Pound' },
  { code: 'SLL', name: 'Sierra Leonean Leone' }, { code: 'SOS', name: 'Somali Shilling' },
  { code: 'SRD', name: 'Surinamese Dollar' }, { code: 'SSP', name: 'South Sudanese Pound' },
  { code: 'STN', name: 'São Tomé & Príncipe Dobra' }, { code: 'SZL', name: 'Swazi Lilangeni' },
  { code: 'THB', name: 'Thai Baht' }, { code: 'TJS', name: 'Tajikistani Somoni' },
  { code: 'TMT', name: 'Turkmenistani Manat' }, { code: 'TND', name: 'Tunisian Dinar' },
  { code: 'TOP', name: 'Tongan Paʻanga' }, { code: 'TRY', name: 'Turkish Lira' },
  { code: 'TTD', name: 'Trinidad & Tobago Dollar' }, { code: 'TWD', name: 'Taiwan New Dollar' },
  { code: 'TZS', name: 'Tanzanian Shilling' }, { code: 'UAH', name: 'Ukrainian Hryvnia' },
  { code: 'UGX', name: 'Ugandan Shilling' }, { code: 'USD', name: 'US Dollar' },
  { code: 'UYU', name: 'Uruguayan Peso' }, { code: 'UZS', name: 'Uzbekistani Som' },
  { code: 'VES', name: 'Venezuelan Bolívar' }, { code: 'VND', name: 'Vietnamese Dong' },
  { code: 'VUV', name: 'Vanuatu Vatu' }, { code: 'WST', name: 'Samoan Tala' },
  { code: 'XAF', name: 'Central African CFA Franc' }, { code: 'XOF', name: 'West African CFA Franc' },
  { code: 'XUA', name: 'ADB Unit of Account' }, { code: 'YER', name: 'Yemeni Rial' },
  { code: 'ZAR', name: 'South African Rand' }, { code: 'ZMW', name: 'Zambian Kwacha' },
  { code: 'ZWL', name: 'Zimbabwean Dollar' },
];
/** Legacy 5-currency shortlist kept for the canonical price currency selector */
const CURRENCIES = ['JPY', 'USD', 'SGD', 'MYR', 'VND'];
const COUNTRIES = ['JP', 'CN', 'KR', 'US', 'SG', 'MY', 'VN', 'TW', 'TH', 'ID'];
// Associations stay in the product model, but are hidden until a customer-facing
// recommendation, accessory, replacement, or upsell workflow consumes them.
const SHOW_PRODUCT_ASSOCIATIONS = false;
const DEDICATED_WAREHOUSE_CODE_BY_CHANNEL: Partial<Record<OverrideChannel, string>> = {
  webstore: 'CR-JP',
  pos: 'RSL-SG',
  shopee: 'FBS-MY',
  lazada: '3PL-VN',
  tiktok: '3PL-VN',
  amazon: 'FBA-JP',
  rakuten: 'RAK-JP',
};

function defaultInventorySourceMode(channel: OverrideChannel) {
  if (channel === 'webstore') return 'all';
  if (channel === 'social') return '';
  return 'channel';
}

function resolveListingWarehouseIds(channel: OverrideChannel, sourceMode: string, warehouses: Array<{ id: string; code: string }>) {
  if (sourceMode === 'all') return warehouses.map(warehouse => warehouse.id);
  if (sourceMode === 'primary') return warehouses.filter(warehouse => warehouse.code === 'CR-JP').map(warehouse => warehouse.id);
  if (sourceMode === 'channel') {
    const dedicatedCode = DEDICATED_WAREHOUSE_CODE_BY_CHANNEL[channel];
    return warehouses.filter(warehouse => warehouse.code === dedicatedCode).map(warehouse => warehouse.id);
  }
  return warehouses.filter(warehouse => warehouse.id === sourceMode || warehouse.code === sourceMode).map(warehouse => warehouse.id);
}

const listingChannelByOverride: Record<OverrideChannel, ChannelListing['channel']> = {
  webstore: 'website',
  pos: 'pos',
  shopee: 'shopee',
  lazada: 'lazada',
  tiktok: 'tiktok',
  amazon: 'amazon',
  social: 'social',
  rakuten: 'rakuten',
};
function buildCategoryTree() {
  const categories = getActiveCatalogCategories();
  if (!categories.length) return [{ id: '', label: 'No categories', children: [{ id: '', label: 'No categories', children: [] as Array<{ id: string; name: string }> }] }];
  const childrenByParent = new Map<string | null, typeof categories>();
  categories.forEach(category => childrenByParent.set(category.parentId, [...(childrenByParent.get(category.parentId) ?? []), category]));
  const sorted = (items: typeof categories) => [...items].sort((a, b) => a.name.localeCompare(b.name));
  // Active children of an inactive parent remain selectable; never leave an empty tree.
  return sorted(categories.filter(category => !category.parentId || !categories.some(parent => parent.id === category.parentId))).map(root => {
    const branches = sorted(childrenByParent.get(root.id) ?? []);
    return {
      id: root.id,
      label: root.name,
      children: branches.length ? branches.map(branch => {
        const leaves = sorted(childrenByParent.get(branch.id) ?? []);
        return { id: branch.id, label: branch.name, children: [branch, ...leaves] };
      }) : [{ id: root.id, label: root.name, children: [root] }],
    };
  });
}
const PRODUCT_TYPE_ICONS = {
  single: Package,
  variant: Layers,
} satisfies Record<ProductType, typeof PackageCheck>;

const EMPTY_FORM: FormState = {
  gtin: '', mpn: '', model_number: '', brand: '', brandId: '',
  asin: '', manufacturer: '',
  sku_code: '', name: '', product_type: 'single',
  description: '',
  category: '', categoryId: '', condition: 'new',
  original_price: '', retail_price: '', price_currency: 'JPY',
  prod_length: '', prod_height: '', prod_width: '', prod_weight: '',
  pkg_length: '', pkg_height: '', pkg_width: '', pkg_weight: '',
  country_of_origin: '', hs_code: '', has_variants: false,
  slug: '', meta_title: '', meta_description: '',
};

function genId(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}
function num(v: string) { return v ? Number(v) : 0; }

function recoverImportedProductDraft(productId: string): Product | null {
  const prefix = 'prod_import_';
  if (!productId.startsWith(prefix)) return null;
  const importId = productId.slice(prefix.length);
  const item = getCatalogImportItems().find(candidate => candidate.id === importId);
  if (!item) return null;
  const categoryPath = item.channelCategory.toLowerCase();
  const category = getActiveCatalogCategories()
    .filter(candidate => categoryPath.includes(candidate.name.toLowerCase()))
    .sort((left, right) => right.name.length - left.name.length)[0]?.name ?? '';
  const now = new Date().toISOString();
  return {
    id: productId,
    name: item.title,
    sku_code: item.channelSku,
    product_type: item.variants > 1 ? 'variant' : 'single',
    gtin: '', mpn: '', model_number: '', brand: '', asin: item.channel === 'amazon' ? item.listingId : '', manufacturer: '',
    category, condition: 'new', description: '',
    original_price: 0, retail_price: item.price, price_currency: item.currency,
    prod_length: 0, prod_height: 0, prod_width: 0, prod_weight: 0,
    pkg_length: 0, pkg_height: 0, pkg_width: 0, pkg_weight: 0,
    country_of_origin: '', hs_code: '', images: item.image ? [item.image] : [], specifications: [], inventory: {},
    has_variants: item.variants > 1,
    channels: [{ channel: item.channel, external_id: item.listingId, status: 'pending', listing_url: null, last_synced_at: null }],
    status: 'draft', created_at: now, updated_at: now, skus: [],
  };
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[đĐ]/g, 'd').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/**
 * Generates a SKU suggestion from brand + category (fill-if-empty, Option B).
 * Format: BRAND-CAT-XXXX  — always uppercase, only [A-Z0-9-_] per spec.
 * Returns null when both brand and category are empty.
 */
function suggestSku(brand: string, category: string): string | null {
  const brandPart = brand.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 4);
  const catPart   = category.replace(/[^A-Za-z0-9\s&]/g, '').replace(/\s+/g, '').toUpperCase().slice(0, 4);
  if (!brandPart && !catPart) return null;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  const parts = [brandPart, catPart, rand].filter(Boolean);
  return parts.join('-');
}

// Cartesian product of string arrays
function cartesian<T>(arrs: T[][]): T[][] {
  return arrs.reduce<T[][]>(
    (acc, arr) => acc.flatMap(x => arr.map(v => [...x, v])),
    [[]]
  );
}


// ─── Field Helpers ─────────────────────────────────────────────────────────────

function Field({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}{required && <span className="text-destructive ml-0.5">*</span>}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ─── CurrencyPicker ────────────────────────────────────────────────────────────
// Currencies pinned at top (no search) — covers the prototype's primary markets
const PINNED_CURRENCIES = ['JPY', 'VND', 'USD', 'SGD', 'MYR', 'EUR', 'GBP', 'KRW', 'TWD', 'THB'];

function CurrencyRow({ c, selected, onSelect }: { c: { code: string; name: string }; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:bg-muted/50',
        selected && 'bg-primary/5 font-medium'
      )}
    >
      <span className="w-10 shrink-0 font-mono text-xs font-semibold tabular-nums">{c.code}</span>
      <span className="text-muted-foreground">·</span>
      <span className="flex-1 text-left">{c.name}</span>
      {selected && <CircleCheck className="size-3.5 shrink-0 text-primary" />}
    </button>
  );
}

function CurrencyPicker({ value, onChange }: { value: string; onChange: (code: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const selected = WORLD_CURRENCIES.find(c => c.code === value);

  const pinned = PINNED_CURRENCIES.map(code => WORLD_CURRENCIES.find(c => c.code === code)!).filter(Boolean);
  const searchResults = q
    ? WORLD_CURRENCIES.filter(c => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)).slice(0, 12)
    : [];

  const handleSelect = (code: string) => { onChange(code); setOpen(false); setQuery(''); };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="flex h-9 w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
          {selected ? (
            <span className="flex-1 text-left"><span className="font-mono font-medium">{selected.code}</span><span className="text-muted-foreground"> · {selected.name}</span></span>
          ) : (
            <span className="flex-1 text-left text-muted-foreground">Select currency…</span>
          )}
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        {/* Search bar */}
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <Search className="size-3.5 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Search target currency"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {q && <button type="button" onClick={() => setQuery('')} className="shrink-0 text-muted-foreground hover:text-foreground"><CircleCheck className="size-3.5 rotate-45" /></button>}
        </div>

        <div className="max-h-64 overflow-y-auto">
          {q ? (
            /* Search results */
            searchResults.length === 0
              ? <p className="px-3 py-4 text-center text-sm text-muted-foreground">No currency found</p>
              : <div className="py-1">{searchResults.map(c => <CurrencyRow key={c.code} c={c} selected={c.code === value} onSelect={() => handleSelect(c.code)} />)}</div>
          ) : (
            /* Pinned + separator + hint */
            <>
              <div className="px-3 pb-1 pt-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Common currencies</p>
              </div>
              <div className="pb-1">
                {pinned.map(c => <CurrencyRow key={c.code} c={c} selected={c.code === value} onSelect={() => handleSelect(c.code)} />)}
              </div>
              <div className="border-t px-3 py-2 text-[11px] text-muted-foreground">
                Type to search all 150+ currencies
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}


type BrandRole = 'Brand' | 'Manufacturer' | 'Rights holder' | 'Distributor' | 'Reseller';
type NewBrandInput = { canonicalName: string; legalName: string; country: string; website: string; roles: BrandRole[] };
const BRAND_ROLES: BrandRole[] = ['Brand', 'Manufacturer', 'Rights holder', 'Distributor', 'Reseller'];

function BrandReferencePicker({ brands, brandId, brandName, onSelect, onCreate }: { brands: CatalogBrand[]; brandId: string; brandName: string; onSelect: (brand: CatalogBrand | null) => void; onCreate: (input: NewBrandInput) => CatalogBrand }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createLegalName, setCreateLegalName] = useState('');
  const [createCountry, setCreateCountry] = useState('');
  const [createWebsite, setCreateWebsite] = useState('');
  const [createRoles, setCreateRoles] = useState<BrandRole[]>(['Brand']);
  const normalizedQuery = query.trim().toLowerCase();
  const results = brands.filter(brand => !normalizedQuery || [brand.name, brand.code, ...brand.aliases].some(value => value.toLowerCase().includes(normalizedQuery))).slice(0, 8);
  const duplicateBrand = createName.trim() ? getProductCatalogSettings().brands.find(brand => brand.name.trim().toLowerCase() === createName.trim().toLowerCase()) : undefined;
  const duplicate = Boolean(duplicateBrand);
  const invalidWebsite = Boolean(createWebsite.trim()) && !/^https?:\/\/[^\s]+$/i.test(createWebsite.trim());
  const selected = brands.find(brand => brand.id === brandId) ?? brands.find(brand => brand.name === brandName);

  const createBrand = () => {
    if (!createName.trim() || duplicate || invalidWebsite || createRoles.length === 0) return;
    const brand = onCreate({
      canonicalName: createName.trim(),
      legalName: createLegalName.trim(),
      country: createCountry.trim().toUpperCase(),
      website: createWebsite.trim(),
      roles: createRoles,
    });
    onSelect(brand);
    setCreateName('');
    setCreateLegalName('');
    setCreateCountry('');
    setCreateWebsite('');
    setCreateRoles(['Brand']);
    setCreateOpen(false);
  };

  return (
    <>
      <Popover open={open} onOpenChange={next => { setOpen(next); if (next) setQuery(''); }}>
        <PopoverTrigger asChild>
          <Button
            type="button" variant="outline" role="combobox" aria-label="Brand" aria-expanded={open}
            className={cn('h-auto min-h-10 w-full justify-between px-3 py-2 font-normal', !selected && 'text-muted-foreground')}
          >
            <span className="flex min-w-0 flex-col items-start gap-0.5">
              <span className="truncate">{selected?.name ?? 'Select canonical brand'}</span>
            </span>
            <ChevronDown className="size-4 shrink-0 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-0">
          <div className="border-b p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Search brands..." className="h-10 pl-9" />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {results.length ? results.map(brand => (
              <button
                key={brand.id} type="button"
                onClick={() => { onSelect(brand); setOpen(false); }}
                className="flex min-h-10 w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{brand.name}</span>
                  <span className="block truncate font-mono text-[11px] text-muted-foreground">{brand.code}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  {selected?.id === brand.id && <Check className="size-4 shrink-0 text-emerald-500" />}
                </span>
              </button>
            )) : <p className="px-3 py-4 text-center text-xs text-muted-foreground">No matching brand found.</p>}
            {selected ? (
              <button type="button" onClick={() => { onSelect(null); setOpen(false); }} className="min-h-10 w-full rounded-md px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted">
                Clear brand
              </button>
            ) : null}
          </div>
          <div className="border-t p-1">
            <button type="button" onClick={() => { setCreateName(query); setOpen(false); setCreateOpen(true); }} className="flex min-h-10 w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <Plus className="size-4" />Create new brand
            </button>
          </div>
        </PopoverContent>
      </Popover>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>New brand</DialogTitle>
            <DialogDescription>
              Create a shared brand for your products. You can use it as soon as it is saved.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="inline-brand-name">Canonical name <span className="text-destructive">*</span></Label>
              <Input id="inline-brand-name" autoFocus value={createName} onChange={event => setCreateName(event.target.value)} placeholder="e.g. Sony" aria-invalid={duplicate} />
              {duplicate ? <p className="text-xs font-medium text-destructive">{duplicateBrand?.status === 'Inactive' ? 'This brand is inactive. Reactivate it in Brands instead of creating a duplicate.' : 'This Brand already exists. Select it from the list instead.'}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="inline-brand-legal-name">Legal name</Label>
              <Input id="inline-brand-legal-name" value={createLegalName} onChange={event => setCreateLegalName(event.target.value)} placeholder="e.g. Sony Group Corporation" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inline-brand-country">Country</Label>
              <Input id="inline-brand-country" value={createCountry} maxLength={2} onChange={event => setCreateCountry(event.target.value.replace(/[^a-z]/gi, '').toUpperCase())} placeholder="JP" className="uppercase" />
              <p className="text-xs text-muted-foreground">ISO 2-letter country code</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="inline-brand-website">Website</Label>
              <Input id="inline-brand-website" type="url" value={createWebsite} onChange={event => setCreateWebsite(event.target.value)} placeholder="https://" aria-invalid={invalidWebsite} />
              {invalidWebsite ? <p className="text-xs font-medium text-destructive">Enter a complete URL starting with http:// or https://</p> : null}
            </div>
            <fieldset className="space-y-3 sm:col-span-2">
              <legend className="text-sm font-medium">Roles</legend>
              <div className="grid gap-3 sm:grid-cols-3">
                {BRAND_ROLES.map(role => {
                  const checked = createRoles.includes(role);
                  return <label key={role} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md px-1 text-sm">
                    <Checkbox checked={checked} onCheckedChange={next => setCreateRoles(current => next === true ? [...current, role] : current.filter(item => item !== role))} />
                    <span>{role}</span>
                  </label>;
                })}
              </div>
              {createRoles.length === 0 ? <p className="text-xs font-medium text-destructive">Select at least one role.</p> : null}
            </fieldset>
            <div className="rounded-lg border bg-muted/30 p-3 text-xs leading-5 text-muted-foreground sm:col-span-2">
              Available for Product Master immediately. Any marketplace approval requirements are handled separately for each listing.
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="button" disabled={!createName.trim() || duplicate || invalidWebsite || createRoles.length === 0} onClick={createBrand}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}


function DynamicAttributeValueControl({ attribute, value, onChange }: {
  attribute: CatalogAttribute & { required: boolean };
  value: string;
  onChange: (value: string) => void;
}) {
  const error = value.trim() ? validateAttributeValue(attribute, value) : null;
  const controlProps = { 'aria-label': attribute.name, 'aria-required': attribute.required, 'aria-invalid': Boolean(error) || (attribute.required && !value.trim()) };
  const inputCls = cn(
    'flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    error && 'border-destructive focus-visible:ring-destructive',
  );
  const errorEl = error
    ? <p className="mt-1 text-xs font-medium text-destructive">{error}</p>
    : null;

  const options = attribute.options.split(',').map(o => o.trim()).filter(Boolean);
  const selectedValues = value.split(',').map(o => o.trim()).filter(Boolean);

  // ── enum / single-select ──────────────────────────────────────────────────
  if (attribute.type === 'Single select' || attribute.type === 'Enum') {
    return (
      <>
        <select {...controlProps} value={value} onChange={e => onChange(e.target.value)} className={inputCls}>
          <option value="">Select {attribute.name.toLowerCase()}</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        {errorEl}
      </>
    );
  }

  // ── array / multi-select ──────────────────────────────────────────────────
  if (attribute.type === 'Multi-select' || attribute.type === 'Array') {
    return (
      <>
        <div role="group" {...controlProps} className={cn('flex min-h-10 flex-wrap gap-2 rounded-md border border-input p-2', error && 'border-destructive')}>
          {options.map(o => {
            const checked = selectedValues.includes(o);
            return (
              <button
                key={o} type="button" aria-pressed={checked}
                onClick={() => onChange(checked ? selectedValues.filter(i => i !== o).join(', ') : [...selectedValues, o].join(', '))}
                className={cn('rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary', checked ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-muted')}
              >{o}</button>
            );
          })}
        </div>
        {errorEl}
      </>
    );
  }

  // ── number ────────────────────────────────────────────────────────────────
  if (attribute.type === 'Number') {
    return (
      <>
        <Input {...controlProps} type="number" value={value} onChange={e => onChange(e.target.value)} placeholder="Enter a number" className={error ? 'border-destructive focus-visible:ring-destructive' : ''} />
        {errorEl}
      </>
    );
  }

  // ── integer ───────────────────────────────────────────────────────────────
  if (attribute.type === 'Integer') {
    return (
      <>
        <Input {...controlProps}
          type="number" step="1" value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Enter a whole number"
          className={error ? 'border-destructive focus-visible:ring-destructive' : ''}
        />
        {errorEl}
      </>
    );
  }

  // ── boolean ───────────────────────────────────────────────────────────────
  if (attribute.type === 'Boolean') {
    return (
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch" {...controlProps}
          aria-checked={value === 'true'}
          onClick={() => onChange(value === 'true' ? 'false' : 'true')}
          className={cn(
            'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            value === 'true' ? 'bg-primary' : 'bg-input',
          )}
        >
          <span className={cn('pointer-events-none inline-block size-5 rounded-full bg-background shadow-lg transition-transform', value === 'true' ? 'translate-x-5' : 'translate-x-0')} />
        </button>
        <span className="text-sm text-muted-foreground">{value === 'true' ? 'Yes' : value === 'false' ? 'No' : 'Not set'}</span>
        {!value && <button type="button" onClick={() => onChange('false')} className="text-xs text-muted-foreground underline">Set value</button>}
      </div>
    );
  }

  // ── date ──────────────────────────────────────────────────────────────────
  if (attribute.type === 'Date') {
    return (
      <>
        <Input {...controlProps}
          type="date" value={value} onChange={e => onChange(e.target.value)}
          className={error ? 'border-destructive focus-visible:ring-destructive' : ''}
        />
        <p className="mt-1 text-[10px] text-muted-foreground">Format: YYYY-MM-DD — only real calendar dates accepted</p>
        {errorEl}
      </>
    );
  }

  // ── datetime ──────────────────────────────────────────────────────────────
  if (attribute.type === 'Datetime') {
    return (
      <>
        <Input {...controlProps}
          type="datetime-local" value={value} onChange={e => onChange(e.target.value)}
          className={error ? 'border-destructive focus-visible:ring-destructive' : ''}
        />
        {errorEl}
      </>
    );
  }

  // ── money ─────────────────────────────────────────────────────────────────
  if (attribute.type === 'Money') {
    // Stored as "amount::CURRENCY" — split for display
    const parts = value.split('::');
    const amtVal = parts[0] ?? '';
    const curVal = parts[1] ?? 'JPY';
    const updateMoney = (amt: string, cur: string) => onChange(amt ? `${amt}::${cur}` : '');
    return (
      <>
        <div className="grid grid-cols-[1fr_96px] gap-2">
          <Input {...controlProps}
            type="number" min="0" value={amtVal}
            onChange={e => updateMoney(e.target.value, curVal)}
            placeholder="0.00"
            className={error ? 'border-destructive focus-visible:ring-destructive' : ''}
          />
          <select {...controlProps}
            value={curVal}
            onChange={e => updateMoney(amtVal, e.target.value)}
            className={cn(inputCls, 'px-2')}
          >
            {['JPY', 'USD', 'SGD', 'MYR', 'VND', 'EUR', 'GBP'].map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">Currency: 3 uppercase letters (ISO 4217) · Amount must be ≥ 0</p>
        {errorEl}
      </>
    );
  }

  // ── measurement ───────────────────────────────────────────────────────────
  if (attribute.type === 'Measurement' || attribute.type === 'Measurement set') {
    const unit = attribute.unit || 'cm';
    const numericValue = value.endsWith(` ${unit}`) ? value.slice(0, -(unit.length + 1)) : value;
    return (
      <>
        <div className="grid grid-cols-[1fr_88px] gap-2">
          <Input {...controlProps}
            type="number" min="0" value={numericValue}
            onChange={e => onChange(e.target.value ? `${e.target.value} ${unit}` : '')}
            placeholder="0"
            className={error ? 'border-destructive focus-visible:ring-destructive' : ''}
          />
          <div className="grid place-items-center rounded-md border bg-muted/30 px-3 text-sm font-medium text-muted-foreground">{unit}</div>
        </div>
        {errorEl}
      </>
    );
  }

  // ── object (JSON editor) ──────────────────────────────────────────────────
  if (attribute.type === 'Object') {
    return (
      <>
        <Textarea {...controlProps}
          value={value} onChange={e => onChange(e.target.value)}
          rows={3} placeholder='{"key": "value"}'
          className={cn('font-mono text-xs', error && 'border-destructive focus-visible:ring-destructive')}
        />
        <p className="mt-1 text-[10px] text-muted-foreground">Enter a valid JSON object</p>
        {errorEl}
      </>
    );
  }

  // ── asset_ref (URL in prototype / DAM asset ID in production) ────────────
  if (attribute.type === 'Asset ref' || attribute.type === 'asset_ref') {
    return (
      <>
        <Input {...controlProps}
          value={value} onChange={e => onChange(e.target.value)}
          placeholder="https://... (prototype) or DAM asset ID (production)"
          className={error ? 'border-destructive focus-visible:ring-destructive' : ''}
        />
        <p className="mt-1 text-[10px] text-muted-foreground">In production: replaced by DAM file picker returning an asset ID</p>
        {errorEl}
      </>
    );
  }

  // ── commerce_entity_ref (cent_[a-z0-9]{8,40}) ────────────────────────────
  if (attribute.type === 'Commerce entity ref' || attribute.type === 'commerce_entity_ref') {
    return (
      <>
        <Input {...controlProps}
          value={value} onChange={e => onChange(e.target.value)}
          placeholder="cent_abc12345"
          className={cn('font-mono', error && 'border-destructive focus-visible:ring-destructive')}
        />
        <p className="mt-1 text-[10px] text-muted-foreground">Format: cent_ + 8–40 lowercase alphanumeric chars</p>
        {errorEl}
      </>
    );
  }

  // ── country selector ──────────────────────────────────────────────────────
  if (attribute.type === 'Country selector') {
    return (
      <select {...controlProps} value={value} onChange={e => onChange(e.target.value)} className={inputCls}>
        <option value="">Select country</option>
        {['Japan', 'Singapore', 'Vietnam', 'China', 'South Korea', 'United States', 'United Kingdom', 'Other'].map(c => (
          <option key={c}>{c}</option>
        ))}
      </select>
    );
  }

  // ── rich text ─────────────────────────────────────────────────────────────
  if (attribute.type === 'Rich text') {
    return (
      <>
        <Textarea {...controlProps} value={value} onChange={e => onChange(e.target.value)} rows={3} placeholder={`Enter ${attribute.name.toLowerCase()}`} />
        {errorEl}
      </>
    );
  }

  // ── string fallback ───────────────────────────────────────────────────────
  return (
    <>
      <Input {...controlProps}
        value={value} onChange={e => onChange(e.target.value)}
        placeholder={`Enter ${attribute.name.toLowerCase()}`}
        className={error ? 'border-destructive focus-visible:ring-destructive' : ''}
      />
      {errorEl}
    </>
  );
}

function RowField({ label, fields }: {
  label: string;
  fields: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; suffix?: string }[];
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {fields.map(f => (
          <div key={f.label} className="space-y-1">
            <p className="text-xs text-muted-foreground">{f.label}{f.suffix ? ` (${f.suffix})` : ''}</p>
            <div className="relative">
              <Input value={f.value} onChange={e => f.onChange(e.target.value)} placeholder={f.placeholder} className={f.suffix ? 'pr-9' : ''} />
              {f.suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{f.suffix}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


function editorHtml(value: string) {
  if (!value) return '';
  if (/<\/?[a-z][\s\S]*>/i.test(value)) return value;
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
}

function RichTextEditor({ id, value, onChange, placeholder, readOnly = false, autoFocus = false, onFocus }: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  readOnly?: boolean;
  autoFocus?: boolean;
  onFocus?: () => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const characterCount = richTextPlainText(value).length;

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || document.activeElement === editor) return;
    const nextHtml = editorHtml(value);
    if (editor.innerHTML !== nextHtml) editor.innerHTML = nextHtml;
  }, [value]);

  useEffect(() => {
    if (autoFocus) editorRef.current?.focus();
  }, [autoFocus]);

  function runCommand(command: string, commandValue?: string) {
    if (readOnly) return;
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    onChange(editorRef.current?.innerHTML ?? '');
  }

  const controls: Array<{ label: string; icon: typeof Bold; command: string; value?: string }> = [
    { label: 'Bold', icon: Bold, command: 'bold' },
    { label: 'Italic', icon: Italic, command: 'italic' },
    { label: 'Underline', icon: Underline, command: 'underline' },
    { label: 'Strikethrough', icon: Strikethrough, command: 'strikeThrough' },
    { label: 'Code', icon: Code2, command: 'formatBlock', value: 'pre' },
    { label: 'Bulleted list', icon: List, command: 'insertUnorderedList' },
    { label: 'Numbered list', icon: ListOrdered, command: 'insertOrderedList' },
    { label: 'Quote', icon: Quote, command: 'formatBlock', value: 'blockquote' },
    { label: 'Horizontal rule', icon: Minus, command: 'insertHorizontalRule' },
    { label: 'Align left', icon: AlignLeft, command: 'justifyLeft' },
    { label: 'Align center', icon: AlignCenter, command: 'justifyCenter' },
    { label: 'Align right', icon: AlignRight, command: 'justifyRight' },
    { label: 'Justify', icon: AlignJustify, command: 'justifyFull' },
  ];

  if (readOnly) return <div id={id} className="min-h-28 rounded-lg border bg-muted/30 px-4 py-3 text-sm leading-6 text-muted-foreground" dangerouslySetInnerHTML={{ __html: editorHtml(value) || `<span>${placeholder}</span>` }} />;

  return <div className="overflow-hidden rounded-lg border border-input bg-background shadow-sm focus-within:ring-1 focus-within:ring-ring">
    <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/20 p-1.5" role="toolbar" aria-label="Description formatting">
      {controls.slice(0, 5).map(control => {
        const Icon = control.icon;
        return <button key={control.label} type="button" title={control.label} aria-label={control.label} onMouseDown={event => event.preventDefault()} onClick={() => runCommand(control.command, control.value)} className="grid size-8 place-items-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Icon className="size-4" /></button>;
      })}
      <span className="mx-1 h-5 w-px bg-border" />
      {(['H1', 'H2', 'H3'] as const).map(heading => <button key={heading} type="button" onMouseDown={event => event.preventDefault()} onClick={() => runCommand('formatBlock', heading.toLowerCase())} className="h-8 rounded px-2 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{heading}</button>)}
      <span className="mx-1 h-5 w-px bg-border" />
      {controls.slice(5).map(control => {
        const Icon = control.icon;
        return <button key={control.label} type="button" title={control.label} aria-label={control.label} onMouseDown={event => event.preventDefault()} onClick={() => runCommand(control.command, control.value)} className="grid size-8 place-items-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Icon className="size-4" /></button>;
      })}
      <span className="mx-1 h-5 w-px bg-border" />
      <button type="button" title="Insert link" aria-label="Insert link" onMouseDown={event => event.preventDefault()} onClick={() => { const url = window.prompt('Enter link URL'); if (url) runCommand('createLink', url); }} className="grid size-8 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Link2 className="size-4" /></button>
      <span className="ml-auto flex"><button type="button" title="Undo" aria-label="Undo" onMouseDown={event => event.preventDefault()} onClick={() => runCommand('undo')} className="grid size-8 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"><Undo2 className="size-4" /></button><button type="button" title="Redo" aria-label="Redo" onMouseDown={event => event.preventDefault()} onClick={() => runCommand('redo')} className="grid size-8 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"><Redo2 className="size-4" /></button></span>
    </div>
    <div className="relative">
      <div ref={editorRef} id={id} role="textbox" aria-multiline="true" aria-describedby={`${id}-character-count`} contentEditable suppressContentEditableWarning data-placeholder={placeholder} onFocus={onFocus} onInput={event => onChange(event.currentTarget.innerHTML)} className="min-h-36 px-4 pb-9 pt-3 text-sm leading-6 outline-none [&:empty:before]:pointer-events-none [&:empty:before]:text-muted-foreground [&:empty:before]:content-[attr(data-placeholder)]" />
      <span id={`${id}-character-count`} aria-live="polite" className="pointer-events-none absolute bottom-3 right-4 text-xs tabular-nums text-muted-foreground">
        {characterCount}/100
      </span>
    </div>
  </div>;
}

// ─── Variant Section ────────────────────────────────────────────────────────────

interface VariantSectionProps {
  groups: VariantGroup[];
  onGroupsChange: (g: VariantGroup[]) => void;
  items: VariantItem[];
  onItemsChange: (i: VariantItem[]) => void;
  parentSku: string;
  basePrice: string;
  currency: string;
  existingSkus: string[];
  availableAttributes: Array<{ key: string; name: string; options: string[] }>;
  onAttributeValueAdded: (key: string, value: string) => void;
  onVariantAttributeAdded: (key: string) => void;
  copy: {
    duplicateAttribute: string;
    addValuePlaceholder: string;
    add: string;
    addGroupPlaceholder: string;
    addAttribute: string;
    cancel: string;
    addVariantAttribute: string;
    variantsWillBeCreated: string;
    selectAll: string;
    variant: string;
    skuCode: string;
    price: string;
    stock: string;
    skuExists: string;
  };
  warehouses: Array<{ id: string; code: string; label: string }>;
  listingInventorySources: Array<{ key: string; label: string; warehouseIds: string[]; syncPolicy: string }>;
  onConfigureInventorySources: () => void;
  stockControlled: boolean;
  renderStock: (warehouseId: string, item: VariantItem) => React.ReactNode;
}

function VariantSection({
  groups, onGroupsChange, items, onItemsChange,
  parentSku, basePrice, currency, existingSkus, availableAttributes, onAttributeValueAdded, onVariantAttributeAdded, copy, warehouses, listingInventorySources, onConfigureInventorySources, stockControlled, renderStock,
}: VariantSectionProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [addGroupName, setAddGroupName] = useState('');
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [bulkPrice, setBulkPrice] = useState('');
  const [bulkStock, setBulkStock] = useState('');
  const [bulkSku, setBulkSku] = useState('');
  const [bulkWarehouseId, setBulkWarehouseId] = useState(warehouses[0]?.id ?? '');
  const [stockView, setStockView] = useState<'overview' | 'warehouse'>('overview');
  const [expandedStockRows, setExpandedStockRows] = useState<Set<string>>(new Set());
  const [addingValueFor, setAddingValueFor] = useState<string | null>(null);
  const [newValue, setNewValue] = useState('');
  const [newValueError, setNewValueError] = useState('');

  // Build variant keys from groups
  const variantKeys = useMemo(() => {
    if (groups.length === 0) return [] as string[][];
    const valueArrs = groups.map(g => g.values.map(v => v.trim()).filter(Boolean));
    if (valueArrs.some(a => a.length === 0)) return [];
    return cartesian(valueArrs);
  }, [groups]);

  // Init items when keys change
  const variantSignature = useMemo(() => variantKeys.map(k => k.join('|')).join('||'), [variantKeys]);
  const initializedItems = useMemo<VariantItem[]>(() => {
    return variantKeys.map(combo => {
      const key = combo.join(' / ');
      const existing = items.find(i => i.key === key);
      const skuSuffix = combo.join('-').toUpperCase().replace(/\s+/g, '-');
      return existing ? { ...existing, selected: true } : {
        key,
        sku_code: `${parentSku}-${skuSuffix}`,
        price: basePrice,
        stock: '0',
        stock_by_location: {},
        selected: true,
        image_url: '',
      };
    });
  }, [basePrice, items, parentSku, variantKeys]);

  useEffect(() => {
    const currentSignature = items.map(item => item.key.replaceAll(' / ', '|')).join('||');
    if (currentSignature !== variantSignature) onItemsChange(initializedItems);
  }, [initializedItems, items, onItemsChange, variantSignature]);

  function setItems(newItems: VariantItem[]) {
    onItemsChange(newItems);
  }

  function updateItem(key: string, field: keyof VariantItem, value: string | boolean | Record<string, string>) {
    setItems(initializedItems.map(i => i.key === key ? { ...i, [field]: value } : i));
  }

  function applyBulkValues() {
    setItems(initializedItems.map((item, index) => {
      const newItem = {
        ...item,
        price: bulkPrice || item.price,
        stock: !stockControlled && bulkStock ? bulkStock : item.stock,
        sku_code: bulkSku ? `${bulkSku.trim().toUpperCase()}-${String(index + 1).padStart(3, '0')}` : item.sku_code,
      };
      // Apply stock only to the warehouse explicitly selected by the user.
      if (!stockControlled && bulkStock && bulkWarehouseId) {
        newItem.stock_by_location = { ...item.stock_by_location, [bulkWarehouseId]: bulkStock };
        newItem.stock = String(Object.values(newItem.stock_by_location).reduce((total, value) => total + (Number(value) || 0), 0));
      }
      return newItem;
    }));
  }

  function updateGroupImage(firstValue: string, imageUrl: string) {
    setItems(initializedItems.map(item => item.key.split(' / ')[0] === firstValue ? { ...item, image_url: imageUrl } : item));
  }

  function updateLocationStock(key: string, warehouseId: string, value: string) {
    setItems(initializedItems.map(item => {
      if (item.key !== key) return item;
      const stockByLocation = { ...(item.stock_by_location ?? {}), [warehouseId]: value };
      return {
        ...item,
        stock_by_location: stockByLocation,
        stock: String(Object.values(stockByLocation).reduce((total, current) => total + (Number(current) || 0), 0)),
      };
    }));
  }

  function toggleStockDetails(key: string) {
    setExpandedStockRows(current => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function listingLabelsForWarehouse(warehouseId: string) {
    return listingInventorySources.filter(source => source.warehouseIds.includes(warehouseId)).map(source => source.label);
  }

  function deleteGroup(id: string) {
    onGroupsChange(groups.filter(g => g.id !== id));
    setShowAddGroup(false);
    setAddGroupName('');
  }

  function addGroup() {
    const name = addGroupName.trim();
    if (!name || groups.length >= 2) return;
    if (groups.find(g => g.name.toLowerCase() === name.toLowerCase())) {
      setErrors(e => ({ ...e, addGroup: copy.duplicateAttribute }));
      return;
    }
    const attribute = availableAttributes.find(item => item.name.toLowerCase() === name.toLowerCase());
    if (!attribute) return;
    onVariantAttributeAdded(attribute.key);
    onGroupsChange([...groups, { id: genId('grp'), name: attribute.name, values: [] }]);
    setAddGroupName('');
    setShowAddGroup(false);
    setErrors(e => ({ ...e, addGroup: '' }));
  }

  function toggleGroupValue(groupId: string, value: string) {
    onGroupsChange(groups.map(group => group.id === groupId
      ? { ...group, values: group.values.some(current => current.toLowerCase() === value.toLowerCase()) ? group.values.filter(current => current.toLowerCase() !== value.toLowerCase()) : [...group.values, value] }
      : group));
  }

  function replaceGroupAttribute(groupId: string, attributeName: string) {
    const attribute = availableAttributes.find(item => item.name === attributeName);
    if (!attribute) return;
    onGroupsChange(groups.map(group => group.id === groupId ? { ...group, name: attribute.name } : group));
  }

  function cancelAddValue() {
    setAddingValueFor(null);
    setNewValue('');
    setNewValueError('');
  }

  function addAttributeValue(group: VariantGroup, attribute: { key: string; name: string; options: string[] }) {
    const value = newValue.trim().replace(/\s+/g, ' ');
    if (!value) {
      setNewValueError('Enter a value.');
      return;
    }
    const existing = attribute.options.find(option => option.toLowerCase() === value.toLowerCase());
    if (existing) {
      if (!group.values.some(current => current.toLowerCase() === existing.toLowerCase())) {
        toggleGroupValue(group.id, existing);
        cancelAddValue();
      } else {
        setNewValueError(`${existing} is already selected.`);
      }
      return;
    }
    onAttributeValueAdded(attribute.key, value);
    onGroupsChange(groups.map(current => current.id === group.id ? { ...current, values: [...current.values, value] } : current));
    cancelAddValue();
  }

  const totalCombinations = variantKeys.length;
  const remainingAttributes = availableAttributes.filter(attribute =>
    !groups.some(group => group.name.trim().toLowerCase() === attribute.name.trim().toLowerCase())
  );
  const mappedListingSources = listingInventorySources.filter(source => source.warehouseIds.length > 0);
  const unmappedListingSources = listingInventorySources.filter(source => source.warehouseIds.length === 0);

  return (
    <div className="space-y-4">

        {/* Existing Groups */}
        {groups.map(group => {
          const canonicalAttribute = availableAttributes.find(attribute => attribute.name.trim().toLowerCase() === group.name.trim().toLowerCase());
          const canonicalOptions = canonicalAttribute?.options ?? [];
          const generatedVariantCount = groups
            .filter(current => current.id !== group.id)
            .reduce((total, current) => total * current.values.length, 1);
          return <div key={group.id} className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-medium">{canonicalAttribute?.name ?? group.name}</p>{canonicalAttribute ? <span className="text-[11px] tabular-nums text-muted-foreground">{group.values.length} selected</span> : null}</div>{canonicalAttribute ? <p className="mt-0.5 text-[11px] text-muted-foreground">Select values available for this product.</p> : <p className="mt-0.5 text-[11px] font-medium text-amber-600">This option type is not defined for the selected category.</p>}</div>
              {groups.length > 1 ? <Button variant="ghost" size="icon" className="size-7 text-destructive" aria-label={`Remove ${canonicalAttribute?.name ?? group.name} from variants`} onClick={() => deleteGroup(group.id)}>
                <Trash2 className="size-3.5" />
              </Button> : null}
            </div>
            {canonicalAttribute ? <>
              <div className="flex flex-wrap gap-2" role="group" aria-label={`Select ${canonicalAttribute.name} variant values`}>
                {canonicalOptions.map(option => { const selected = group.values.some(value => value.toLowerCase() === option.toLowerCase()); return <button key={option} type="button" aria-pressed={selected} onClick={() => toggleGroupValue(group.id, option)} className={cn('min-h-9 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary', selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background hover:border-primary/40 hover:bg-primary/5')}>{option}{selected ? <Check className="ml-1.5 inline size-3" /> : null}</button>; })}
                {addingValueFor !== group.id ? <button type="button" onClick={() => { setAddingValueFor(group.id); setNewValue(''); setNewValueError(''); }} className="inline-flex min-h-9 items-center rounded-full border border-dashed border-primary/50 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Plus className="mr-1 size-3.5" />Add value</button> : null}
              </div>
              {addingValueFor === group.id ? <div className="space-y-3 rounded-lg border border-dashed border-primary/40 bg-primary/[0.03] p-3">
                <div className="space-y-1.5"><Label htmlFor={`new-variant-value-${group.id}`} className="text-xs font-semibold">New {canonicalAttribute.name} value</Label><Input id={`new-variant-value-${group.id}`} value={newValue} maxLength={60} autoFocus placeholder={`Enter ${canonicalAttribute.name.toLowerCase()} value`} onChange={event => { setNewValue(event.target.value); setNewValueError(''); }} onKeyDown={event => { if (event.key === 'Escape') cancelAddValue(); if (event.key === 'Enter') { event.preventDefault(); addAttributeValue(group, canonicalAttribute); } }} aria-describedby={`new-variant-value-help-${group.id}`} className="h-9" /></div>
                {newValueError ? <p className="text-xs font-medium text-destructive" role="alert">{newValueError}</p> : null}
                <div id={`new-variant-value-help-${group.id}`} className="space-y-1 text-[11px] leading-4 text-muted-foreground"><p>The new value will also be available to other products using {canonicalAttribute.name}.</p>{generatedVariantCount > 0 ? <p className="font-medium text-foreground">Adding and selecting it will generate {generatedVariantCount} new {generatedVariantCount === 1 ? 'variant' : 'variants'} in this Product Master.</p> : <p>Select a value in the other option group before SKU rows can be generated.</p>}</div>
                <div className="flex flex-wrap gap-2"><Button type="button" size="sm" className="h-8 text-xs" disabled={!newValue.trim()} onClick={() => addAttributeValue(group, canonicalAttribute)}>{generatedVariantCount > 0 ? <>Add &amp; generate {generatedVariantCount} {generatedVariantCount === 1 ? 'variant' : 'variants'}</> : <>Add value</>}</Button><Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={cancelAddValue}>{copy.cancel}</Button></div>
              </div> : null}
            </> : <div className="space-y-2 rounded-lg border border-amber-300/50 bg-amber-500/5 p-3"><label className="text-xs font-semibold" htmlFor={`replace-variant-${group.id}`}>Replace “{group.name}” with a valid option type</label><select id={`replace-variant-${group.id}`} value="" onChange={event => replaceGroupAttribute(group.id, event.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Select option type</option>{availableAttributes.filter(attribute => !groups.some(current => current.id !== group.id && current.name.toLowerCase() === attribute.name.toLowerCase())).map(attribute => <option key={attribute.key} value={attribute.name}>{attribute.name}</option>)}</select></div>}
          </div>;
        })}

        {/* Add Group */}
        {groups.length < 2 && remainingAttributes.length > 0 && (showAddGroup ? (
          <div className="border border-dashed border-border rounded-lg p-3 space-y-2">
            <select aria-label="Variant option type" value={addGroupName} onChange={event => { setAddGroupName(event.target.value); setErrors({}); }} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" autoFocus><option value="">Select option type</option>{remainingAttributes.map(attribute => <option key={attribute.key} value={attribute.name}>{attribute.name}</option>)}</select>
            {errors.addGroup && <p className="text-xs text-destructive">{errors.addGroup}</p>}
            <div className="flex gap-1.5">
              <Button size="sm" className="h-8 text-xs" disabled={!addGroupName} onClick={addGroup}>Add option type</Button>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { setShowAddGroup(false); setAddGroupName(''); }}>
                {copy.cancel}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8"
            onClick={() => setShowAddGroup(true)}
          >
            <Plus className="size-3 mr-1" /> Add option type
          </Button>
        ))}
        {remainingAttributes.length > 0 && groups.length < 2 ? <p className="text-[11px] text-muted-foreground">Choose another catalog option such as Size or Material. It will also be added to this product category.</p> : null}

        {/* Variant Matrix Summary */}
        {totalCombinations > 0 && (
          <div className="border-t pt-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {groups.map(group => `${group.values.length} ${group.name.toLowerCase()}${group.values.length === 1 ? '' : 's'}`).join(' × ')} <span aria-hidden="true">·</span> <strong className="text-foreground">{totalCombinations} {totalCombinations === 1 ? 'variant' : 'variants'}</strong>
              </p>
              <span className="text-[11px] text-muted-foreground">All generated combinations are included</span>
            </div>

            {unmappedListingSources.length > 0 ? <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-amber-400/30 bg-amber-500/[0.06] px-3 py-2.5"><AlertTriangle className="size-4 shrink-0 text-amber-500" /><div className="min-w-0 flex-1"><p className="text-xs font-semibold">{unmappedListingSources.length} {unmappedListingSources.length === 1 ? 'listing needs' : 'listings need'} an inventory source</p><p className="mt-0.5 truncate text-[10px] text-muted-foreground">{unmappedListingSources.map(source => source.label).join(' · ')}</p></div><Button type="button" variant="outline" size="sm" className="h-8 shrink-0 text-xs" onClick={onConfigureInventorySources}>Configure sources</Button></div> : null}

            {/* Variant Table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="border-b bg-muted/40 p-3"><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-semibold">Bulk edit all variants</p><p className="mt-0.5 text-[10px] text-muted-foreground">Changes apply to all {totalCombinations} generated variants.</p></div><div className="inline-flex rounded-md border bg-background p-0.5" aria-label="Stock display mode"><button type="button" aria-pressed={stockView === 'overview'} onClick={() => setStockView('overview')} className={cn('h-7 rounded px-2.5 text-[11px] font-medium transition-colors', stockView === 'overview' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>Overview</button><button type="button" aria-pressed={stockView === 'warehouse'} onClick={() => setStockView('warehouse')} className={cn('h-7 rounded px-2.5 text-[11px] font-medium transition-colors', stockView === 'warehouse' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>By warehouse</button></div></div><div className={cn("grid gap-2", stockControlled ? "sm:grid-cols-[1fr_1fr_auto]" : "sm:grid-cols-[1fr_1fr_1fr_1.2fr_auto]")}>
                <Field label="Price"><Input type="number" value={bulkPrice} onChange={event => setBulkPrice(event.target.value)} placeholder="No change" className="h-8 text-xs" /></Field>
                {!stockControlled && <><Field label="Stock at"><select aria-label="Warehouse for bulk stock update" value={bulkWarehouseId} onChange={event => setBulkWarehouseId(event.target.value)} className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs">{warehouses.map(warehouse => <option key={warehouse.id} value={warehouse.id}>{warehouse.code} · {warehouse.label}</option>)}</select></Field>
                <Field label="Units"><Input type="number" min="0" value={bulkStock} onChange={event => setBulkStock(event.target.value)} placeholder="No change" className="h-8 text-xs" /></Field></>}
                <Field label="SKU prefix"><Input value={bulkSku} onChange={event => setBulkSku(event.target.value)} placeholder="e.g. SHIRT" className="h-8 text-xs uppercase" /></Field>
                <Button type="button" size="sm" className="self-end" disabled={!bulkPrice && (stockControlled || !bulkStock) && !bulkSku.trim()} onClick={applyBulkValues}>Apply</Button>
              </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs" aria-label="Variant pricing matrix">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      {groups.map((group, index) => <th key={group.id} className={cn('min-w-28 p-2 text-left font-medium', index === 0 && 'bg-muted/70')}>{group.name}</th>)}
                      <th className="text-left p-2 font-medium w-16">Image</th>
                      <th className="text-left p-2 font-medium w-40">{copy.skuCode}</th>
                      <th className="text-right p-2 font-medium w-28">{copy.price} ({currency})</th>
                      {stockView === 'overview' ? <><th className="w-36 p-2 text-right font-medium">Available stock</th><th className="w-48 p-2 text-left font-medium">Listing coverage</th></> : warehouses.map(wh => (
                        <th key={wh.id} className="min-w-28 p-2 text-right font-medium"><span className="block whitespace-nowrap">{wh.code}</span><span className="block max-w-28 truncate text-[10px] font-normal text-muted-foreground" title={wh.label}>{wh.label}</span></th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {initializedItems.map(item => {
                      const normalizedSku = item.sku_code.trim().toUpperCase();
                      const skuDup = Boolean(normalizedSku) && ((existingSkus.includes(item.sku_code) && !(item.sku_code.startsWith(parentSku))) || initializedItems.filter(candidate => candidate.sku_code.trim().toUpperCase() === normalizedSku).length > 1);
                      const optionValues = item.key.split(' / ');
                      const firstValue = optionValues[0];
                      const firstGroupItems = initializedItems.filter(candidate => candidate.key.split(' / ')[0] === firstValue);
                      const isFirstInGroup = firstGroupItems[0]?.key === item.key;
                      const expandedRowsInGroup = stockView === 'overview' ? firstGroupItems.filter(candidate => expandedStockRows.has(candidate.key)).length : 0;
                      const totalStockForItem = Object.values(item.stock_by_location ?? {}).reduce((total, value) => total + (Number(value) || 0), 0);
                      const activeWarehouses = warehouses.filter(warehouse => (Number(item.stock_by_location?.[warehouse.id]) || 0) > 0);
                      const listingCoverage = mappedListingSources;
                      const detailsExpanded = expandedStockRows.has(item.key);
                      return (<Fragment key={item.key}>
                        <tr className={cn('border-b', isFirstInGroup && 'border-t-2 border-t-border')}>
                          {isFirstInGroup ? <td rowSpan={firstGroupItems.length + expandedRowsInGroup} className="border-r bg-muted/20 p-3 text-center align-middle"><strong className="block text-sm text-foreground">{firstValue}</strong><span className="mt-1 block text-[10px] text-muted-foreground">{firstGroupItems.length} {firstGroupItems.length === 1 ? 'variant' : 'variants'}</span></td> : null}
                          {groups.length > 1 ? <td className="p-3 font-semibold text-foreground">{optionValues[1]}</td> : null}
                          <td className="p-1.5 align-middle">
                            <label className="grid size-9 cursor-pointer place-items-center overflow-hidden rounded-md border border-dashed bg-muted/30 hover:bg-muted/60" title="Upload variant image">
                              <input type="file" accept="image/*" className="sr-only" onChange={event => {
                                const file = event.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = () => updateGroupImage(firstValue, String(reader.result ?? ''));
                                reader.readAsDataURL(file);
                                event.target.value = '';
                              }} />
                              {item.image_url ? <img src={item.image_url} alt={`${item.key} variant`} className="size-full object-cover" /> : <Upload className="size-3.5 text-muted-foreground" />}
                            </label>
                          </td>
                          <td className="p-1.5">
                            <Input
                              value={item.sku_code}
                              onChange={e => updateItem(item.key, 'sku_code', e.target.value.toUpperCase())}
                              className={`h-7 text-xs font-mono ${skuDup ? 'border-destructive' : ''}`}
                              placeholder={copy.skuCode}
                            />
                            {skuDup && <p className="text-[10px] text-destructive mt-0.5">{copy.skuExists}</p>}
                          </td>
                          <td className="p-1.5">
                            <Input
                              value={item.price}
                              onChange={e => updateItem(item.key, 'price', e.target.value)}
                              className="h-7 text-xs text-right font-mono"
                              placeholder="0"
                              type="number"
                            />
                          </td>
                          {stockView === 'overview' ? <>
                            <td className="p-1.5 text-right"><button type="button" aria-expanded={detailsExpanded} onClick={() => toggleStockDetails(item.key)} className="ml-auto flex min-h-8 items-center gap-2 rounded-md border bg-background px-2.5 text-right transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><span><strong className="block tabular-nums">{totalStockForItem} units</strong><span className="block text-[10px] text-muted-foreground">{activeWarehouses.length} {activeWarehouses.length === 1 ? 'location' : 'locations'}</span></span>{detailsExpanded ? <ChevronDown className="size-3.5 text-muted-foreground" /> : <ChevronRight className="size-3.5 text-muted-foreground" />}</button></td>
                            <td className="p-2"><div className="flex max-w-48 flex-wrap gap-1">{listingCoverage.length ? listingCoverage.slice(0, 3).map(source => { const sourceStock = source.warehouseIds.reduce((total, warehouseId) => total + (Number(item.stock_by_location?.[warehouseId]) || 0), 0); const outOfStock = sourceStock === 0; return <span key={source.key} title={`${source.label}: ${sourceStock} units · ${source.syncPolicy} sync`} className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', outOfStock ? 'bg-amber-500/10 text-amber-600' : 'bg-muted text-muted-foreground')}>{source.label}{outOfStock ? ' · Out of stock' : ''}</span>; }) : <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">No coverage</span>}{listingCoverage.length > 3 ? <span className="text-[10px] text-muted-foreground">+{listingCoverage.length - 3}</span> : null}</div></td>
                          </> : warehouses.map(wh => (
                            <td key={wh.id} className="p-1.5">
                              {stockControlled ? renderStock(wh.id, item) : <Input
                                value={item.stock_by_location?.[wh.id] ?? ''}
                                onChange={e => updateLocationStock(item.key, wh.id, e.target.value)}
                                aria-label={`${item.key} stock at ${wh.label}`}
                                className="ml-auto h-7 w-20 text-right font-mono text-xs"
                                placeholder="0"
                                type="number"
                                min="0"
                              />}
                              <p className="mt-1 text-right text-[9px] text-muted-foreground">{listingLabelsForWarehouse(wh.id).join(' · ') || 'Not mapped'}</p>
                            </td>))}
                        </tr>
                        {stockView === 'overview' && detailsExpanded ? <tr key={`${item.key}-stock-details`} className="border-b bg-muted/15"><td colSpan={groups.length + 4} className="p-3"><div className="rounded-lg border bg-background p-3"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-semibold">Inventory for {item.key}</p><p className="mt-0.5 text-[10px] text-muted-foreground">Update physical stock and see which listings use each source.</p></div><span className="text-xs font-semibold tabular-nums">{totalStockForItem} units available</span></div><div className="grid gap-2 md:grid-cols-2">{warehouses.map(warehouse => { const labels = listingLabelsForWarehouse(warehouse.id); return <div key={warehouse.id} className="grid min-h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md border px-3 py-2"><div className="min-w-0"><p className="truncate text-xs font-semibold" title={warehouse.label}>{warehouse.label}</p><p className="text-[10px] text-muted-foreground">{warehouse.code}</p><div className="mt-1 flex flex-wrap gap-1">{labels.length ? labels.map(label => <span key={label} className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary">{label}</span>) : <span className="text-[9px] text-muted-foreground">Not used by a listing</span>}</div></div>{stockControlled ? renderStock(warehouse.id, item) : <Input value={item.stock_by_location?.[warehouse.id] ?? ''} onChange={event => updateLocationStock(item.key, warehouse.id, event.target.value)} aria-label={`${item.key} stock at ${warehouse.label}`} className="h-8 text-right font-mono text-xs" placeholder="0" type="number" min="0" />}</div>; })}</div></div></td></tr> : null}
                      </Fragment>);
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────


export default function ProductCreatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  const { locale } = useI18n();
  const copy = {
    'en-US': {
      productMaster: 'Product Master',
      editDetails: 'Edit product details',
      createNew: 'Create new product',
      cancel: 'Cancel',
      saveChanges: 'Save Changes',
      saveProduct: 'Save Product',
      uploadsInProgress: '{count} image upload{suffix} still in progress. Please wait before saving.',
      pluralSuffix: 's are',
      singularSuffix: ' is',
      errorFallback: 'Please fix the errors above.',
      uploadFailed: 'Upload failed',
      imageUploaded: 'Image uploaded',
      couldNotReadFile: 'Could not read file.',
      imagesStillUploading: 'Images still uploading',
      waitForUploads: 'Please wait for uploads to finish before saving this product.',
      skuRequired: 'SKU code is required',
      nameRequired: 'Product name is required',
      categoryRequired: 'Category is required',
      variantDuplicate: 'SKU "{sku}" already exists. Please use a different code.',
      created: 'Successfully created product',
      updated: 'Successfully updated product',
      createdDescription: '{name} is ready to use.',
      updatedDescription: '{name} has been saved.',
      productIdentity: 'Product Identity',
      productDetails: 'Product Details',
      price: 'Price',
      shippingReturn: 'Shipping & Return',
      others: 'Others',
      productInformation: 'Product Information',
      showAttributes: 'Show Attributes',
      media: 'Media',
      inventoryInformation: 'Inventory Information',
      gtinPlaceholder: 'e.g. 4901234567890',
      mpnPlaceholder: 'e.g. HP-PRO-BLK',
      modelPlaceholder: 'e.g. HP-2024-PRO',
      brandPlaceholder: 'e.g. SoundMax',
      asinPlaceholder: 'e.g. B0XXXXYYYY',
      manufacturerPlaceholder: 'e.g. SoundMax Electronics',
      skuCode: 'SKU code',
      skuPlaceholder: 'e.g. SMX-HP',
      productName: 'Product Name',
      namePlaceholder: 'e.g. Wireless Noise-Cancelling Headphones',
      description: 'Description',
      descriptionPlaceholder: 'Describe your product...',
      category: 'Product category',
      selectCategory: 'Select category',
      condition: 'Item condition',
      originalPrice: 'Original Price',
      retailPrice: 'Retail Price',
      margin: 'Margin',
      productDimensions: 'Product Dimensions',
      packageDimensions: 'Package Dimensions',
      length: 'Length',
      height: 'Height',
      width: 'Width',
      weight: 'Weight',
      countryOfOrigin: 'Country of origin',
      selectCountry: 'Select country',
      hsCode: 'HS Code',
      hsCodePlaceholder: 'e.g. 8518300000',
      hsCodeNote: 'Harmonized System code for cross-border customs',
      productType: 'Product Type',
      productTypeSingle: 'Single',
      productTypeVariant: 'Variant',
      hasVariations: 'This product has multiple variations',
      family: 'Family',
      variants: 'Variants',
      selected: '{count} selected',
      no: 'No',
      all: 'All',
      required: 'Required',
      recommended: 'Recommended',
      mainImage: 'Main Image',
      additionalImages: 'Additional images · {count} of 9',
      add: 'Add',
      units: 'units',
      totalStock: 'Total Stock',
      convertTitle: 'Convert to non-variant product?',
      convertDescription: 'The variant matrix and variant-specific SKUs you entered will be cleared if you switch this product back to a non-variant setup.',
      convertConfirm: 'Convert Product',
      keepVariants: 'Keep Variants',
      duplicateAttribute: 'This attribute already exists',
      variantGroups: 'Variant Groups',
      addValuePlaceholder: 'Add {group} value...',
      addGroupPlaceholder: 'e.g. Size, Color, Capacity...',
      addAttribute: 'Add Attribute',
      addVariantAttribute: 'Add variant attribute',
      variantsWillBeCreated: '{count} variant(s) will be created',
      selectAll: 'Select all',
      variant: 'Variant',
      stock: 'Stock',
      skuExists: 'SKU already exists',
      showAll: '0/{count}',
      mainAlt: 'Main',
      additionalImageAlt: 'Image {index}',
      removeMainImage: 'Remove main image',
      removeAdditionalImage: 'Remove additional image {index}',
    },
    'ja-JP': {
      productMaster: '商品マスター',
      editDetails: '商品詳細を編集',
      createNew: '新規商品を作成',
      cancel: 'キャンセル',
      saveChanges: '変更を保存',
      saveProduct: '商品を保存',
      uploadsInProgress: '{count} 件の画像アップロードが進行中です。保存前に完了をお待ちください。',
      pluralSuffix: '',
      singularSuffix: '',
      errorFallback: '上記のエラーを修正してください。',
      uploadFailed: 'アップロード失敗',
      imageUploaded: '画像をアップロードしました',
      couldNotReadFile: 'ファイルを読み込めませんでした。',
      imagesStillUploading: '画像をアップロード中です',
      waitForUploads: '商品を保存する前にアップロード完了までお待ちください。',
      skuRequired: 'SKUコードは必須です',
      nameRequired: '商品名は必須です',
      categoryRequired: 'カテゴリは必須です',
      variantDuplicate: 'SKU「{sku}」は既に存在します。別のコードを使用してください。',
      created: '商品を作成しました',
      updated: '商品を更新しました',
      createdDescription: '{name} を利用できます。',
      updatedDescription: '{name} を保存しました。',
      productIdentity: '商品識別情報',
      productDetails: '商品詳細',
      price: '価格',
      shippingReturn: '配送・返品',
      others: 'その他',
      productInformation: '商品情報',
      showAttributes: '表示属性',
      media: 'メディア',
      inventoryInformation: '在庫情報',
      gtinPlaceholder: '例: 4901234567890',
      mpnPlaceholder: '例: HP-PRO-BLK',
      modelPlaceholder: '例: HP-2024-PRO',
      brandPlaceholder: '例: SoundMax',
      asinPlaceholder: '例: B0XXXXYYYY',
      manufacturerPlaceholder: '例: SoundMax Electronics',
      skuCode: 'SKUコード',
      skuPlaceholder: '例: SMX-HP',
      productName: '商品名',
      namePlaceholder: '例: ワイヤレスノイズキャンセリングヘッドホン',
      description: '説明',
      descriptionPlaceholder: '商品説明を入力してください...',
      category: '商品カテゴリ',
      selectCategory: 'カテゴリを選択',
      condition: '商品の状態',
      originalPrice: '原価',
      retailPrice: '販売価格',
      margin: '粗利率',
      productDimensions: '商品サイズ',
      packageDimensions: '梱包サイズ',
      length: '長さ',
      height: '高さ',
      width: '幅',
      weight: '重量',
      countryOfOrigin: '原産国',
      selectCountry: '国を選択',
      hsCode: 'HSコード',
      hsCodePlaceholder: '例: 8518300000',
      hsCodeNote: '越境通関用のHSコード',
      productType: '商品タイプ',
      productTypeSingle: '単品',
      productTypeVariant: 'バリエーション',
      hasVariations: 'この商品は複数バリエーションを持ちます',
      family: 'ファミリー',
      variants: 'バリエーション',
      selected: '{count} 件選択',
      no: 'なし',
      all: 'すべて',
      required: '必須',
      recommended: '推奨',
      mainImage: 'メイン画像',
      additionalImages: '追加画像 · {count}/9',
      add: '追加',
      units: '点',
      totalStock: '総在庫',
      convertTitle: '非バリエーション商品へ切り替えますか？',
      convertDescription: '非バリエーション構成に戻すと、入力したバリエーション行列とSKUは削除されます。',
      convertConfirm: '商品を変換',
      keepVariants: 'バリエーションを維持',
      duplicateAttribute: 'この属性は既に存在します',
      variantGroups: 'バリエーショングループ',
      addValuePlaceholder: '{group} の値を追加...',
      addGroupPlaceholder: '例: サイズ、カラー、容量...',
      addAttribute: '属性を追加',
      addVariantAttribute: 'バリエーション属性を追加',
      variantsWillBeCreated: '{count} 件のバリエーションを作成します',
      selectAll: 'すべて選択',
      variant: 'バリエーション',
      stock: '在庫',
      skuExists: 'SKUは既に存在します',
      showAll: '0/{count}',
      mainAlt: 'メイン画像',
      additionalImageAlt: '画像 {index}',
      removeMainImage: 'メイン画像を削除',
      removeAdditionalImage: '追加画像 {index} を削除',
    },
    'vi-VN': {
      productMaster: 'Quản lý sản phẩm',
      editDetails: 'Chỉnh sửa chi tiết sản phẩm',
      createNew: 'Tạo sản phẩm mới',
      cancel: 'Hủy',
      saveChanges: 'Lưu thay đổi',
      saveProduct: 'Lưu sản phẩm',
      uploadsInProgress: 'Vẫn còn {count} ảnh đang tải lên. Vui lòng chờ xong trước khi lưu.',
      pluralSuffix: '',
      singularSuffix: '',
      errorFallback: 'Vui lòng sửa các lỗi bên trên.',
      uploadFailed: 'Tải ảnh thất bại',
      imageUploaded: 'Đã tải ảnh lên',
      couldNotReadFile: 'Không thể đọc tệp.',
      imagesStillUploading: 'Ảnh vẫn đang tải lên',
      waitForUploads: 'Vui lòng chờ ảnh tải lên xong trước khi lưu sản phẩm.',
      skuRequired: 'Mã SKU là bắt buộc',
      nameRequired: 'Tên sản phẩm là bắt buộc',
      categoryRequired: 'Danh mục là bắt buộc',
      variantDuplicate: 'SKU "{sku}" đã tồn tại. Vui lòng dùng mã khác.',
      created: 'Tạo sản phẩm thành công',
      updated: 'Cập nhật sản phẩm thành công',
      createdDescription: '{name} đã sẵn sàng để sử dụng.',
      updatedDescription: '{name} đã được lưu.',
      productIdentity: 'Thông tin định danh',
      productDetails: 'Chi tiết sản phẩm',
      price: 'Giá',
      shippingReturn: 'Vận chuyển & hoàn trả',
      others: 'Khác',
      productInformation: 'Thông tin sản phẩm',
      showAttributes: 'Hiển thị thuộc tính',
      media: 'Hình ảnh',
      inventoryInformation: 'Thông tin tồn kho',
      gtinPlaceholder: 'VD: 4901234567890',
      mpnPlaceholder: 'VD: HP-PRO-BLK',
      modelPlaceholder: 'VD: HP-2024-PRO',
      brandPlaceholder: 'VD: SoundMax',
      asinPlaceholder: 'VD: B0XXXXYYYY',
      manufacturerPlaceholder: 'VD: SoundMax Electronics',
      skuCode: 'Mã SKU',
      skuPlaceholder: 'VD: SMX-HP',
      productName: 'Tên sản phẩm',
      namePlaceholder: 'VD: Tai nghe chống ồn không dây',
      description: 'Mô tả',
      descriptionPlaceholder: 'Mô tả sản phẩm...',
      category: 'Danh mục sản phẩm',
      selectCategory: 'Chọn danh mục',
      condition: 'Tình trạng sản phẩm',
      originalPrice: 'Giá gốc',
      retailPrice: 'Giá bán',
      margin: 'Biên lợi nhuận',
      productDimensions: 'Kích thước sản phẩm',
      packageDimensions: 'Kích thước đóng gói',
      length: 'Dài',
      height: 'Cao',
      width: 'Rộng',
      weight: 'Nặng',
      countryOfOrigin: 'Xuất xứ',
      selectCountry: 'Chọn quốc gia',
      hsCode: 'Mã HS',
      hsCodePlaceholder: 'VD: 8518300000',
      hsCodeNote: 'Mã HS dùng cho thủ tục hải quan xuyên biên giới',
      productType: 'Loại sản phẩm',
      productTypeSingle: 'Đơn',
      productTypeVariant: 'Biến thể',
      hasVariations: 'Sản phẩm này có nhiều biến thể',
      family: 'Nhóm',
      variants: 'Biến thể',
      selected: 'Đã chọn {count}',
      no: 'Không',
      all: 'Tất cả',
      required: 'Bắt buộc',
      recommended: 'Khuyến nghị',
      mainImage: 'Ảnh chính',
      additionalImages: 'Ảnh bổ sung · {count} trên 9',
      add: 'Thêm',
      units: 'đơn vị',
      totalStock: 'Tổng tồn',
      convertTitle: 'Chuyển sang sản phẩm không biến thể?',
      convertDescription: 'Nếu chuyển về cấu hình không biến thể, toàn bộ matrix biến thể và SKU riêng theo biến thể sẽ bị xóa.',
      convertConfirm: 'Chuyển sản phẩm',
      keepVariants: 'Giữ lại biến thể',
      duplicateAttribute: 'Thuộc tính này đã tồn tại',
      variantGroups: 'Nhóm biến thể',
      addValuePlaceholder: 'Thêm giá trị cho {group}...',
      addGroupPlaceholder: 'VD: Kích thước, Màu sắc, Dung lượng...',
      addAttribute: 'Thêm thuộc tính',
      addVariantAttribute: 'Thêm thuộc tính biến thể',
      variantsWillBeCreated: 'Sẽ tạo {count} biến thể',
      selectAll: 'Chọn tất cả',
      variant: 'Biến thể',
      stock: 'Tồn kho',
      skuExists: 'SKU đã tồn tại',
      showAll: '0/{count}',
      mainAlt: 'Ảnh chính',
      additionalImageAlt: 'Ảnh {index}',
      removeMainImage: 'Xóa ảnh chính',
      removeAdditionalImage: 'Xóa ảnh bổ sung {index}',
    },
  }[locale] ?? {
    productMaster: 'Product Master',
    editDetails: 'Edit product details',
    createNew: 'Create new product',
    cancel: 'Cancel',
    saveChanges: 'Save Changes',
    saveProduct: 'Save Product',
    uploadsInProgress: '{count} image upload{suffix} still in progress. Please wait before saving.',
    pluralSuffix: 's are',
    singularSuffix: ' is',
    errorFallback: 'Please fix the errors above.',
    uploadFailed: 'Upload failed',
    imageUploaded: 'Image uploaded',
    couldNotReadFile: 'Could not read file.',
    imagesStillUploading: 'Images still uploading',
    waitForUploads: 'Please wait for uploads to finish before saving this product.',
    skuRequired: 'SKU code is required',
    nameRequired: 'Product name is required',
    categoryRequired: 'Category is required',
    variantDuplicate: 'SKU "{sku}" already exists. Please use a different code.',
    created: 'Successfully created product',
    updated: 'Successfully updated product',
    createdDescription: '{name} is ready to use.',
    updatedDescription: '{name} has been saved.',
    productIdentity: 'Product Identity',
    productDetails: 'Product Details',
    price: 'Price',
    shippingReturn: 'Shipping & Return',
    others: 'Others',
    productInformation: 'Product Information',
    showAttributes: 'Show Attributes',
    media: 'Media',
    inventoryInformation: 'Inventory Information',
    gtinPlaceholder: 'e.g. 4901234567890',
    mpnPlaceholder: 'e.g. HP-PRO-BLK',
    modelPlaceholder: 'e.g. HP-2024-PRO',
    brandPlaceholder: 'e.g. SoundMax',
    asinPlaceholder: 'e.g. B0XXXXYYYY',
    manufacturerPlaceholder: 'e.g. SoundMax Electronics',
    skuCode: 'SKU code',
    skuPlaceholder: 'e.g. SMX-HP',
    productName: 'Product Name',
    namePlaceholder: 'e.g. Wireless Noise-Cancelling Headphones',
    description: 'Description',
    descriptionPlaceholder: 'Describe your product...',
    category: 'Product category',
    selectCategory: 'Select category',
    condition: 'Item condition',
    originalPrice: 'Original Price',
    retailPrice: 'Retail Price',
    margin: 'Margin',
    productDimensions: 'Product Dimensions',
    packageDimensions: 'Package Dimensions',
    length: 'Length',
    height: 'Height',
    width: 'Width',
    weight: 'Weight',
    countryOfOrigin: 'Country of origin',
    selectCountry: 'Select country',
    hsCode: 'HS Code',
    hsCodePlaceholder: 'e.g. 8518300000',
    hsCodeNote: 'Harmonized System code for cross-border customs',
    productType: 'Product Type',
    productTypeSingle: 'Single',
    productTypeVariant: 'Variant',
    hasVariations: 'This product has multiple variations',
    family: 'Family',
    variants: 'Variants',
    selected: '{count} selected',
    no: 'No',
    all: 'All',
    required: 'Required',
    recommended: 'Recommended',
    mainImage: 'Main Image',
    additionalImages: 'Additional images · {count} of 9',
    add: 'Add',
    units: 'units',
    totalStock: 'Total Stock',
    convertTitle: 'Convert to non-variant product?',
    convertDescription: 'The variant matrix and variant-specific SKUs you entered will be cleared if you switch this product back to a non-variant setup.',
    convertConfirm: 'Convert Product',
    keepVariants: 'Keep Variants',
    duplicateAttribute: 'This attribute already exists',
    variantGroups: 'Variant Groups',
    addValuePlaceholder: 'Add {group} value...',
    addGroupPlaceholder: 'e.g. Size, Color, Capacity...',
    addAttribute: 'Add Attribute',
    addVariantAttribute: 'Add variant attribute',
    variantsWillBeCreated: '{count} variant(s) will be created',
    selectAll: 'Select all',
    variant: 'Variant',
    stock: 'Stock',
    skuExists: 'SKU already exists',
    showAll: '0/{count}',
    mainAlt: 'Main',
    additionalImageAlt: 'Image {index}',
    removeMainImage: 'Remove main image',
    removeAdditionalImage: 'Remove additional image {index}',
  };
  const conditionLabels = {
    'en-US': {
      new: 'New',
      refurbished: 'Refurbished',
      used_like_new: 'Used like new',
      used_acceptable: 'Used acceptable',
    },
    'ja-JP': {
      new: '新品',
      refurbished: '再整備品',
      used_like_new: '中古 - 非常に良い',
      used_acceptable: '中古 - 良い',
    },
    'vi-VN': {
      new: 'Mới',
      refurbished: 'Tân trang',
      used_like_new: 'Đã dùng - như mới',
      used_acceptable: 'Đã dùng - chấp nhận được',
    },
  }[locale] ?? {
    new: 'New',
    refurbished: 'Refurbished',
    used_like_new: 'Used like new',
    used_acceptable: 'Used acceptable',
  };
  // Edit mode: read product ID from URL param (:id) or query (?edit=)
  const queryEdit = new URLSearchParams(location.search).get('edit');
  const editId = params.id ?? (queryEdit ?? undefined);
  const storedProduct = editId ? getProductById(editId) : null;
  const recoveredImportProduct = useMemo(
    () => editId && !storedProduct ? recoverImportedProductDraft(editId) : null,
    [editId, storedProduct],
  );
  const existingProduct = storedProduct ?? recoveredImportProduct;
  const [stockAdjustment, setStockAdjustment] = useState<Partial<StockAdjustmentTarget> | null>(null);
  const [addingStockLocation, setAddingStockLocation] = useState(false);
  const existingSkuList = getAllSkus();
  const [catalogBrands, setCatalogBrands] = useState<CatalogBrand[]>(() => getActiveCatalogBrands());

  const [inventory, setInventory] = useState<Record<string, string>>(
    existingProduct
      ? Object.fromEntries(Object.entries(existingProduct.inventory).map(([k, v]) => [k, String(v)]))
      : Object.fromEntries(WAREHOUSES.map(w => [w.id, '0']))
  );
  // Legacy per-product policies are retained for migration in Settings; no longer edited here.
  const [associations, setAssociations] = useState<ProductAssociation[]>(existingProduct?.associations ?? []);
  const [associationProductId, setAssociationProductId] = useState('');
  const [associationType, setAssociationType] = useState<ProductAssociation['type']>('related');
  const associationCandidates = useMemo(() => getProducts().filter(product => product.id !== existingProduct?.id), [existingProduct?.id]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync form when URL search params change (e.g. after dialog navigate)
  const searchParams = new URLSearchParams(location.search);
  const urlSku = searchParams.get('sku') ?? '';
  const urlFamily = searchParams.get('family') ?? '';
  const selectedRevisionId = searchParams.get('revision');
  const selectedRevision = existingProduct?.revisions?.find(revision => revision.id === selectedRevisionId);
  const isHistorical = Boolean(selectedRevisionId && selectedRevision);
  const activeOrgLocales = useMemo(() => getActiveOrgLocales(), []);
  const primaryLocaleConfig = activeOrgLocales.find(locale => locale.isPrimary) ?? activeOrgLocales[0];
  const primaryLocale = primaryLocaleConfig?.locale ?? 'en-US';
  const requestedContentLocale = searchParams.get('locale');
  // Derive contentLocale: canonicalize, validate against active org locales, fallback to the org primary locale.
  const contentLocale: ContentLocale = (() => {
    if (!requestedContentLocale) return primaryLocale;
    const canonical = canonicalizeLocale(requestedContentLocale);
    const isActive = activeOrgLocales.some(l => l.locale === canonical);
    return isActive ? canonical : primaryLocale;
  })();

  const canManageProduct = searchParams.get('mode') !== 'viewer' && !isHistorical;
  const isArchived = existingProduct?.status === 'archived';
  const canWrite = canManageProduct && !isArchived;
  const [, refreshLifecycle] = useState(0);
  const [localizedContent, setLocalizedContent] = useState(existingProduct?.localized_content ?? {});
  const [focusTranslationField, setFocusTranslationField] = useState<'name' | 'description' | null>(null);
  const [mobileReferenceOpen, setMobileReferenceOpen] = useState(true);
  const invalidLocaleNotifiedRef = useRef('');
  const [staleConflictOpen, setStaleConflictOpen] = useState(false);
  const loadedVersionRef = useRef(existingProduct?.record_version ?? 1);

  const initForm = () => {
    if (existingProduct) {
      return {
        gtin: existingProduct.gtin,
        mpn: existingProduct.mpn,
        model_number: existingProduct.model_number,
        brand: existingProduct.brand,
        brandId: existingProduct.brandId ?? getActiveCatalogBrands().find(brand => [brand.name, brand.code, ...brand.aliases].some(value => value.toLowerCase() === existingProduct.brand.toLowerCase()))?.id ?? '',
        asin: existingProduct.asin,
        manufacturer: existingProduct.manufacturer,
        sku_code: existingProduct.sku_code,
        name: existingProduct.name,
        product_type: existingProduct.product_type ?? 'single',
        description: existingProduct.description,
        category: existingProduct.category,
        categoryId: existingProduct.categoryId ?? '',
        condition: existingProduct.condition,
        original_price: existingProduct.original_price ? String(existingProduct.original_price) : '',
        retail_price: existingProduct.retail_price ? String(existingProduct.retail_price) : '',
        price_currency: existingProduct.price_currency,
        prod_length: existingProduct.prod_length ? String(existingProduct.prod_length) : '',
        prod_height: existingProduct.prod_height ? String(existingProduct.prod_height) : '',
        prod_width: existingProduct.prod_width ? String(existingProduct.prod_width) : '',
        prod_weight: existingProduct.prod_weight ? String(existingProduct.prod_weight) : '',
        pkg_length: existingProduct.pkg_length ? String(existingProduct.pkg_length) : '',
        pkg_height: existingProduct.pkg_height ? String(existingProduct.pkg_height) : '',
        pkg_width: existingProduct.pkg_width ? String(existingProduct.pkg_width) : '',
        pkg_weight: existingProduct.pkg_weight ? String(existingProduct.pkg_weight) : '',
        country_of_origin: existingProduct.country_of_origin,
        hs_code: existingProduct.hs_code ?? '',
        has_variants: existingProduct.has_variants,
        slug: existingProduct.slug ?? slugify(existingProduct.name),
        meta_title: existingProduct.meta_title ?? '',
        meta_description: existingProduct.meta_description ?? '',
      };
    }
    return { ...EMPTY_FORM, sku_code: urlSku || '', category: urlFamily || '', categoryId: resolveCatalogCategory({ category: urlFamily }, getProductCatalogSettings().categories)?.id ?? '' };
  };

  const [form, setForm] = useState<FormState>(initForm);
  const rakutenBrandName = rakutenBrandSuggestion(catalogBrands.find(brand => form.brandId ? brand.id === form.brandId : brand.name === form.brand), form.brand);
  const [advancedIdentityOpen, setAdvancedIdentityOpen] = useState(() => Boolean(
    existingProduct?.mpn || existingProduct?.model_number || existingProduct?.manufacturer,
  ));
  const [complianceOpen, setComplianceOpen] = useState(() => Boolean(
    existingProduct?.country_of_origin || existingProduct?.hs_code,
  ));

  // Sync form fields when URL params change (e.g. after navigating from CreateProductDialog)
  useEffect(() => {
    if (!existingProduct) {
      const urlAsin = searchParams.get('asin') ?? '';
      const urlTitle = searchParams.get('title') ?? '';
      const urlBrand = searchParams.get('brand') ?? '';
      const urlMsrp = searchParams.get('msrp') ?? '';
      const urlVariants = searchParams.get('variants') ?? '';
      const urlVariantsJson = searchParams.get('variantsJson') ?? '';

      // Parse Amazon-selected variants
      let parsedVariants: AmazonVariant[] = [];
      if (urlVariantsJson) {
        try {
          parsedVariants = JSON.parse(urlVariantsJson) as AmazonVariant[];
        } catch { /* ignore malformed JSON */ }
      }

      // Build variant groups from Amazon selected variants
      // Group by attribute names, e.g. { Flavor: ['Matcha'], Size: ['100g', '40g'] }
      if (urlVariants === '1' && parsedVariants.length > 0) {
        const attrMap: Record<string, string[]> = {};
        for (const v of parsedVariants) {
          for (const [attr, val] of Object.entries(v.variationAttributes)) {
            if (!attrMap[attr]) attrMap[attr] = [];
            if (!attrMap[attr].includes(val)) attrMap[attr].push(val);
          }
        }
        const groups: VariantGroup[] = Object.entries(attrMap).slice(0, 2).map(([name, values]) => ({
          id: genId('grp'),
          name,
          values,
        }));
        setVariantGroups(groups);

        // Pre-populate variant items from Amazon data
        const basePrice = urlMsrp ? String(num(urlMsrp)) : '';
        const items: VariantItem[] = parsedVariants.map(v => {
          const attrLabel = Object.entries(v.variationAttributes)
            .map(([, val]) => val).join(' / ');
          const skuSuffix = Object.values(v.variationAttributes)
            .join('-').toUpperCase().replace(/\s+/g, '-');
          return {
            key: attrLabel,
            sku_code: `${urlSku}-${skuSuffix}`,
            price: v.msrp ? String(v.msrp) : basePrice,
            stock: '0',
            stock_by_location: {},
            selected: true,
            image_url: '',
          };
        });
        setVariantItems(items);
      }

      setForm(prev => ({
        ...prev,
        ...(urlSku ? { sku_code: urlSku } : {}),
        ...(urlFamily ? { category: urlFamily, categoryId: resolveCatalogCategory({ category: urlFamily }, getProductCatalogSettings().categories)?.id ?? '' } : {}),
        ...(urlAsin ? { asin: urlAsin } : {}),
        ...(urlTitle ? { name: urlTitle } : {}),
        ...(urlBrand ? { brand: urlBrand, brandId: getActiveCatalogBrands().find(brand => [brand.name, brand.code, ...brand.aliases].some(value => value.toLowerCase() === urlBrand.toLowerCase()))?.id ?? '' } : {}),
        ...(urlMsrp ? { original_price: urlMsrp } : {}),
        ...(urlVariants === '1' ? { has_variants: true } : {}),
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const [packageWeightUnit, setPackageWeightUnit] = useState<'g' | 'kg'>('g');
  usePricingRevision();
  const [channelOverrides, setChannelOverrides] = useState<Record<OverrideChannel, ChannelOverrideForm>>(() => {
    const saved = existingProduct?.channel_overrides;
    const syncStatusDemo = existingProduct?.id === 'prod_004';
    const make = (key: OverrideChannel): ChannelOverrideForm => ({
      ...initialListingPricing(existingProduct, key, OVERRIDE_CHANNELS.find(channel => channel.key === key)?.account || key),
      enabled: saved?.[key]?.enabled ?? Boolean(existingProduct?.channels.some(listing => listing.channel === listingChannelByOverride[key] && !listing.publication_unconfirmed && !listing.creation_config)),
      title: saved?.[key]?.title ?? '',
      price_markup: saved?.[key]?.price_markup ? String(saved[key]?.price_markup) : '',
      description: saved?.[key]?.description ?? '',
      listing_sku: syncStatusDemo && key === 'shopee' ? 'PB-VN-ART-10' : syncStatusDemo && key === 'amazon' ? 'PB-JP-AMZ-ART-10' : syncStatusDemo && key === 'rakuten' ? 'PB-JP-RKT-ART-10' : saved?.[key]?.listing_sku ?? '',
      category: syncStatusDemo && ['shopee', 'rakuten'].includes(key) ? 'Art & Collectibles' : saved?.[key]?.category ?? '',
      fulfillment: syncStatusDemo && key === 'amazon' ? 'FBA' : saved?.[key]?.fulfillment ?? '',
      variant_scope: saved?.[key]?.variant_scope ?? 'all',
      selected_variant_ids: saved?.[key]?.selected_variant_ids,
      listing_mode: syncStatusDemo && key === 'rakuten' ? 'manual' : saved?.[key]?.listing_mode ?? 'manual',
      identifier: saved?.[key]?.identifier ?? (key === 'amazon' ? existingProduct?.asin ?? '' : existingProduct?.gtin ?? ''),
      condition: saved?.[key]?.condition ?? (key === 'amazon' ? 'new_new' : ''),
      stock_quantity: syncStatusDemo && ['shopee', 'rakuten'].includes(key) ? (key === 'shopee' ? '100' : '95') : saved?.[key]?.stock_quantity ?? '',
      warehouse: saved?.[key]?.warehouse ?? defaultInventorySourceMode(key),
      brand: saved?.[key]?.brand ?? (key === 'rakuten' ? '' : existingProduct?.brand ?? ''),
      shipping_option: syncStatusDemo && key === 'shopee' ? 'standard' : saved?.[key]?.shipping_option ?? '',
      bullet_points: saved?.[key]?.bullet_points ?? '',
      search_terms: saved?.[key]?.search_terms ?? '',
      preorder_days: saved?.[key]?.preorder_days ?? '',
      warranty: saved?.[key]?.warranty ?? '',
      certification: saved?.[key]?.certification ?? '',
      video_url: saved?.[key]?.video_url ?? '',
      web_slug: saved?.[key]?.web_slug ?? '',
      pos_barcode: saved?.[key]?.pos_barcode ?? existingProduct?.gtin ?? '',
      visibility: saved?.[key]?.visibility ?? (key === 'webstore' ? 'public' : key === 'social' ? 'agents' : ''),
      sync_policy: syncStatusDemo && key === 'rakuten' ? 'disabled' : saved?.[key]?.sync_policy ?? 'automatic',
      safety_buffer: saved?.[key]?.safety_buffer ?? '0',
      allocation_cap: saved?.[key]?.allocation_cap ?? '',
      media_scope: syncStatusDemo && key === 'amazon' ? 'custom' : syncStatusDemo && key === 'rakuten' ? 'custom' : saved?.[key]?.media_scope ?? 'custom',
      compliance_notes: saved?.[key]?.compliance_notes ?? '',
      tax_code: saved?.[key]?.tax_code ?? '',
      attribute_material: saved?.[key]?.attribute_material ?? '',
      attribute_color: saved?.[key]?.attribute_color ?? '',
      localized_content_confirmed: saved?.[key]?.localized_content_confirmed ?? false,
    });
    return Object.fromEntries(OVERRIDE_CHANNELS.map(channel => [channel.key, make(channel.key)])) as Record<OverrideChannel, ChannelOverrideForm>;
  });
  const [channelListingWizardOpen, setChannelListingWizardOpen] = useState(false);
  const [creationChannels, setCreationChannels] = useState(() => availableListingDestinations(existingProduct));
  const creationVersion = useRef(1);
  const [linkExistingMaster, setLinkExistingMaster] = useState<Product | null>(null);
  const [newLinkedKeys, setNewLinkedKeys] = useState<string[]>([]);
  const linkExistingTrigger = useRef<HTMLButtonElement | null>(null);
  const [openChannelListingAfterSave, setOpenChannelListingAfterSave] = useState(false);
  const [editingChannel, setEditingChannel] = useState<OverrideChannel | null>(null);
  const [listingUnlinkTarget, setListingUnlinkTarget] = useState<{ listing: ChannelListing; shop: string; sku: string; snapshot: string } | null>(null);
  const [unlinkError, setUnlinkError] = useState('');
  const [viewingLinkedListing, setViewingLinkedListing] = useState<LinkedListingDetail | null>(null);
  const [editingShopListing, setEditingShopListing] = useState<{ product: Product; listing: ChannelListing; channelLabel: string; shopLabel: string } | null>(null);
  const linkedListingTrigger = useRef<HTMLButtonElement | null>(null);
  const [listingSyncSettings, setListingSyncSettings] = useState<{
    listing: ChannelListing; shop: string; sku: string; preference: MasterSyncPreference;
    master: Product; currentContent?: string; currentImages?: number; currentBrand?: string; currentDescription?: string;
  } | null>(null);
  const listingSyncTrigger = useRef<HTMLElement | null>(null);
  function openListingSyncSettings(listing: ChannelListing, shop: string, sku: string, preference: MasterSyncPreference, currentContent?: string, currentImages?: number) {
    if (!existingProduct || !canWrite) return;
    listingSyncTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const data = resolveListingShopData(existingProduct, listing, getCatalogImportItems({ requireConfirmation: true }));
    setListingSyncSettings({ listing, shop, sku, preference, master: existingProduct, currentContent: data.title ?? currentContent, currentImages: data.images?.length ?? currentImages, currentBrand: data.brand, currentDescription: data.description });
  }
  function formatSyncRecord(value: string) {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toLocaleString(locale, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }) : 'Date unavailable';
  }
  function acknowledgeListingCommit(previousVersion: number | undefined) {
    // Our listing-only commit must not raise a false Master conflict, while
    // still retaining any conflict from an external edit that came first.
    if (existingProduct && loadedVersionRef.current === previousVersion) loadedVersionRef.current = getProductById(existingProduct.id)?.record_version ?? previousVersion;
  }
  function listingActions(listing: ChannelListing, channelLabel: string, shop: string, sku: string) {
    return <ListingRowActions label={`${shop} · ${sku}`} canWrite={canWrite}
      onManage={event => {
        linkedListingTrigger.current = event.currentTarget;
        if (canWrite && existingProduct) setEditingShopListing({ product: existingProduct, listing, channelLabel, shopLabel: shop });
        else if (existingProduct) setViewingLinkedListing({ listing, channelLabel, data: resolveListingShopData(existingProduct, listing, getCatalogImportItems({ requireConfirmation: true })) });
      }}
      onActivity={() => {
        const params = new URLSearchParams(location.search);
        params.set('section', 'activity'); params.delete('historyChannel'); params.set('historyListing', listingActivityKey(listing));
        navigate({ pathname: location.pathname, search: params.toString() }); setActiveSection('activity');
      }}
      onUnlink={() => {
        if (!canWrite || !existingProduct) return;
        setUnlinkError(''); setListingUnlinkTarget({ listing, shop, sku, snapshot: listingEditSnapshot(existingProduct, listing) });
      }} />;
  }
  const [channelListingDrafts, setChannelListingDrafts] = useState<Record<OverrideChannel, ChannelOverrideForm>>(channelOverrides);
  function persistListingDrafts(drafts: Partial<Record<OverrideChannel, ChannelOverrideForm>>) {
    if (!existingProduct || !canWrite) return;
    const latest = getProductById(existingProduct.id) ?? existingProduct;
    const overrides = { ...latest.channel_overrides };
    const channels = [...latest.channels];
    for (const [key, draft] of Object.entries(drafts)) {
      if (!draft) continue;
      overrides[key as OverrideChannel] = { ...draft, price_markup: num(draft.price_markup) };
      const channel = listingChannelByOverride[key as OverrideChannel];
      const oldOverride = latest.channel_overrides?.[key as OverrideChannel];
      const target = configuredListing(latest.channels, channel, oldOverride?.listing_sku || '');
      // One-time draft edits must not silently change the ongoing sync policy.
      if (target && !target.master_data_sync) channels[channels.indexOf(target)] = { ...target, master_data_sync: { ...listingMasterSync(target, oldOverride), updated_at: new Date().toISOString() } };
      if (draft.enabled && !channels.some(item => item.channel === channel)) channels.push({ channel, external_id: null, status: 'draft', listing_url: null, last_synced_at: null, master_data_sync: { enabled: false, fields: [], updated_at: new Date().toISOString() } });
    }
    updateProduct(latest.id, { id: latest.id, channel_overrides: overrides, channels });
    // Listing-owned saves must not mark unrelated Master edits as saved (or dirty).
    if (baselineSnapshotRef.current) {
      const baseline = JSON.parse(baselineSnapshotRef.current);
      baseline.channelOverrides = { ...baseline.channelOverrides, ...drafts };
      baselineSnapshotRef.current = JSON.stringify(baseline);
    }
  }
  const listingInventorySources = useMemo(() => OVERRIDE_CHANNELS.flatMap(channel => {
    const draft = channelOverrides[channel.key];
    const listing = configuredListing(existingProduct?.channels ?? [], listingChannelByOverride[channel.key], draft.listing_sku);
    const preference = listingMasterSync(listing, existingProduct?.channel_overrides?.[channel.key]);
    if (!draft.enabled || !syncsField(preference, 'inventory') || !preference.inventory?.warehouse_id) return [];
    return [{
      key: channel.key,
      label: channel.label,
      warehouseIds: [preference.inventory.warehouse_id],
      syncPolicy: 'Master stock',
    }];
  }), [channelOverrides, existingProduct]);

  const [publishOpen, setPublishOpen] = useState(false);
  const [publishPercent, setPublishPercent] = useState(0);
  const [readinessStatus, setReadinessStatus] = useState<'unchecked' | 'checking' | 'blocked' | 'ready' | 'published'>(
    existingProduct?.status === 'published' ? 'published' : 'unchecked',
  );
  const [readinessReviewOpen, setReadinessReviewOpen] = useState(false);
  const [publishConfirmationOpen, setPublishConfirmationOpen] = useState(false);
  const [publishListingMode, setPublishListingMode] = useState<'master-only' | 'apply-listings'>('master-only');
  const [applyMasterOpen, setApplyMasterOpen] = useState(false);
  // Flow 3 — Provenance & Protect
  const [fieldProvenance, setFieldProvenance] = useState<Partial<Record<keyof FormState, { source: FieldSource; confidence?: number }>>>({
    name: { source: 'rakuten_import', confidence: 98 },
    brand: { source: 'shopee_import', confidence: 76 },
  });
  const [protectedFields, setProtectedFields] = useState<Set<keyof FormState>>(new Set());
  // Flow 4 — Apply master data sheet

  const [skuChangeOpen, setSkuChangeOpen] = useState(false);
  const [pendingMasterSku, setPendingMasterSku] = useState('');
  const [skuChangeConfirmed, setSkuChangeConfirmed] = useState(false);
  const [skuChangeError, setSkuChangeError] = useState('');
  const [, setDraftSaveGeneration] = useState(0);
  const [catalogSettingsVersion, setCatalogSettingsVersion] = useState(0);
  const categoryTree = useMemo(() => buildCategoryTree(), [catalogSettingsVersion]);
  const [dirtyTrackingReady, setDirtyTrackingReady] = useState(false);
  const [hasScrolledFromTop, setHasScrolledFromTop] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(existingProduct?.updated_at ? new Date(existingProduct.updated_at) : null);
  const baselineSnapshotRef = useRef('');
  const latestSnapshotRef = useRef('');

  useEffect(() => {
    if (editId && recoveredImportProduct && !storedProduct) {
      addProduct(recoveredImportProduct);
    }
  }, [editId, recoveredImportProduct, storedProduct]);

  // Images (stored as data URLs)
  const [images, setImages] = useState<string[]>(existingProduct?.images ?? []);
  const masterMedia = getMasterMediaReadiness(images);
  const [imageAltTexts, setImageAltTexts] = useState<string[]>(existingProduct?.image_alt_texts ?? []);
  const [uploadingImageCount, setUploadingImageCount] = useState(0);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [categoryLevelOne, setCategoryLevelOne] = useState(categoryTree[0].id);
  const [categoryLevelTwo, setCategoryLevelTwo] = useState(categoryTree[0].children[0].id);
  const [pendingCategory, setPendingCategory] = useState(form.categoryId);
  const [categoryReviewOpen, setCategoryReviewOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<ProductWorkspace>(() => resolveProductWorkspace(new URLSearchParams(location.search).get('section')));
  const [specifications, setSpecifications] = useState<Array<{ id: string; attributeKey?: string; name: string; value: string }>>(
    existingProduct?.specifications?.map(item => ({ ...item, id: genId('spec') })) ?? []
  );

  useEffect(() => {
    const categoryAttributes = getAttributesForCategory(form.category, form.categoryId).filter(item => item.key !== 'brand');
    setSpecifications(current => reconcileSpecifications(current, categoryAttributes, attribute => ({ id: genId('spec'), attributeKey: attribute.key, name: attribute.name, value: '' })));
  }, [form.category, form.categoryId, catalogSettingsVersion]);

  useEffect(() => {
    const refreshCatalogSettings = () => setCatalogSettingsVersion(current => current + 1);
    window.addEventListener('focus', refreshCatalogSettings);
    window.addEventListener('storage', refreshCatalogSettings);
    return () => {
      window.removeEventListener('focus', refreshCatalogSettings);
      window.removeEventListener('storage', refreshCatalogSettings);
    };
  }, []);

  // Variant state
  const [variantGroups, setVariantGroups] = useState<VariantGroup[]>(() => hydrateExistingVariants(existingProduct).groups);
  const [variantItems, setVariantItems] = useState<VariantItem[]>(() => hydrateExistingVariants(existingProduct).items);
  const variantAutoSeedKeyRef = useRef('');
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; target: Exclude<ProductType, 'variant'> }>({ open: false, target: 'single' });

  function setField<K extends keyof FormState>(k: K, v: FormState[K]) {
    if (!canWrite) return;
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(e => ({ ...e, [k]: '' }));
    // Flow 3: reset provenance to 'pim' when user manually edits a field
    setFieldProvenance(prev => ({ ...prev, [k]: { source: 'pim' as FieldSource } }));
  }

  function toggleFieldProtect(field: keyof FormState) {
    setProtectedFields(prev => {
      const next = new Set(prev);
      if (next.has(field)) next.delete(field); else next.add(field);
      return next;
    });
  }

  // SKU auto-suggest state — true when current sku_code was system-generated (fill-if-empty)
  const [skuAutoSuggested, setSkuAutoSuggested] = useState(false);

  // Option B: fill-if-empty SKU when brand or category changes on NEW products only.
  // Rule: only fires when sku_code is empty OR was previously auto-suggested (not user-typed).
  // Never overwrites a user-typed SKU.
  useEffect(() => {
    if (existingProduct) return;          // only for new product creation
    if (masterSkuLocked) return;          // locked SKUs are never touched
    const isEmpty = !form.sku_code.trim();
    if (!isEmpty && !skuAutoSuggested) return; // user typed something manually → respect it
    const suggestion = suggestSku(form.brand, form.category);
    if (!suggestion) return;
    setForm(f => ({ ...f, sku_code: suggestion }));
    setSkuAutoSuggested(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.brand, form.category]);


  function createCanonicalBrand(input: NewBrandInput): CatalogBrand {
    const canonicalName = input.canonicalName.trim();
    const brand: CatalogBrand = {
      id: `${slugify(canonicalName)}-${Date.now().toString(36)}`,
      name: canonicalName,
      code: slugify(canonicalName).replace(/-/g, '_').toUpperCase(),
      manufacturer: input.legalName,
      legalName: input.legalName,
      country: input.country,
      website: input.website,
      roles: input.roles,
      productCount: 0,
      status: 'Active', source: 'internal', aliases: [], mappings: {},
    };
    const settings = getProductCatalogSettings();
    saveProductCatalogSettings({ ...settings, brands: [...settings.brands, brand] });
    setCatalogBrands(current => [...current, brand]);
    toast({
      title: 'Brand created',
      description: `"${brand.name}" is selected and ready to use in this Product Master.`,
    });
    return brand;
  }

  function updateProductName(value: string) {
    if (!canWrite) return;
    if (contentLocale !== primaryLocale) {
      setLocalizedContent(current => ({
        ...current,
        [contentLocale]: {
          ...current[contentLocale],
          name: value,
          description: current[contentLocale]?.description ?? '',
        },
      }));
      return;
    }
    setForm(current => ({
      ...current,
      name: value,
      slug: current.slug && current.slug !== slugify(current.name) ? current.slug : slugify(value),
    }));
    if (errors.name) setErrors(current => ({ ...current, name: '' }));
  }

  function updateProductDescription(value: string) {
    if (!canWrite) return;
    if (contentLocale !== primaryLocale) {
      setLocalizedContent(current => ({
        ...current,
        [contentLocale]: {
          ...current[contentLocale],
          name: current[contentLocale]?.name ?? '',
          description: value,
        },
      }));
      return;
    }
    setField('description', value);
  }

  function updateLocalizedAttributeValue(attributeKey: string, value: string) {
    if (!canWrite || contentLocale === primaryLocale) return;
    setLocalizedContent(current => ({
      ...current,
      [contentLocale]: {
        ...current[contentLocale],
        name: current[contentLocale]?.name ?? '',
        description: current[contentLocale]?.description ?? '',
        attributeValues: {
          ...current[contentLocale]?.attributeValues,
          [attributeKey]: value,
        },
      },
    }));
  }

  function selectContentLocale(nextLocale: string, openProductData = false) {
    // Canonicalize (e.g. en_US → en-US) and validate against active org locales
    const canonical = canonicalizeLocale(nextLocale);
    const validationError = validateAttributeLocale('content-locale', true, canonical);
    if (validationError) {
      toast({ title: 'Locale not available', description: validationError.message, variant: 'destructive' });
      return;
    }
    const localized = localizedContent[canonical];
    const firstMissingField = canonical === primaryLocale
      ? null
      : !localized?.name?.trim()
        ? 'name'
        : !richTextPlainText(localized?.description ?? '')
          ? 'description'
          : null;
    setFocusTranslationField(firstMissingField);
    setMobileReferenceOpen(true);
    const nextParams = new URLSearchParams(location.search);
    nextParams.set('locale', canonical);
    if (firstMissingField || openProductData) {
      nextParams.set('section', 'product-data');
      setActiveSection('product-data');
    }
    navigate({ pathname: location.pathname, search: nextParams.toString() }, { replace: true });
    if (firstMissingField) {
      window.setTimeout(() => {
        const target = document.getElementById(firstMissingField === 'name' ? 'localized-product-name' : 'localized-product-description');
        target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target?.focus();
      }, 150);
    }
  }

  useEffect(() => {
    if (!requestedContentLocale) return;
    const canonical = canonicalizeLocale(requestedContentLocale);
    const validationError = validateAttributeLocale('content-locale', true, canonical);
    if (!validationError || invalidLocaleNotifiedRef.current === requestedContentLocale) return;
    invalidLocaleNotifiedRef.current = requestedContentLocale;
    toast({ title: 'Locale not available', description: validationError.message, variant: 'destructive' });
    const nextParams = new URLSearchParams(location.search);
    nextParams.set('locale', primaryLocale);
    navigate({ pathname: location.pathname, search: nextParams.toString() }, { replace: true });
  }, [location.pathname, location.search, navigate, primaryLocale, requestedContentLocale, toast]);

  function openMasterSkuChange() {
    setPendingMasterSku(form.sku_code);
    setSkuChangeConfirmed(false);
    setSkuChangeError('');
    setSkuChangeOpen(true);
  }

  function stageMasterSkuChange() {
    const normalizedSku = pendingMasterSku.trim().toUpperCase();
    if (!normalizedSku) {
      setSkuChangeError('Enter a new Master SKU.');
      return;
    }
    if (normalizedSku === form.sku_code.trim().toUpperCase()) {
      setSkuChangeError('The new Master SKU must be different from the current SKU.');
      return;
    }
    if (existingSkuList.some(sku => sku.toUpperCase() === normalizedSku && sku.toUpperCase() !== existingProduct?.sku_code.toUpperCase())) {
      setSkuChangeError('This Master SKU is already in use.');
      return;
    }
    setField('sku_code', normalizedSku);
    setSkuChangeOpen(false);
    toast({
      title: 'Master SKU change staged',
      description: 'Channel SKUs remain unchanged. Save the product to apply this change.',
    });
  }

  function selectWorkspace(id: ProductWorkspace) {
    const nextParams = new URLSearchParams(location.search);
    nextParams.set('section', id);
    nextParams.delete('focus');
    navigate({ pathname: location.pathname, search: nextParams.toString() }, { replace: true });
    setActiveSection(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openAttributeSetup(target: { attribute?: string; category?: string }) {
    if (isDirty && !handleSave('draft', { navigateAfter: false })) return;
    const params = new URLSearchParams();
    if (target.attribute) {
      params.set('tab', 'attributes');
      params.set('attribute', target.attribute);
    }
    if (target.category) {
      params.set('category', target.category);
      params.set('panel', 'attributes');
    }
    params.set('returnTo', `${location.pathname}?section=product-data`);
    params.set('returnLabel', form.name || form.sku_code || 'Product Master');
    params.set('returnMode', 'navigate');
    navigate(`/products/categories?${params.toString()}`);
  }

  function addCatalogAttributeValue(attributeKey: string, value: string) {
    const settings = getProductCatalogSettings();
    const attribute = settings.attributes.find(item => item.key === attributeKey);
    if (!attribute) return;
    const options = attribute.options.split(',').map(option => option.trim()).filter(Boolean);
    if (options.some(option => option.toLowerCase() === value.toLowerCase())) return;
    saveProductCatalogSettings({
      ...settings,
      attributes: settings.attributes.map(item => item.key === attributeKey
        ? { ...item, options: [...options, value].join(', ') }
        : item),
    });
    setCatalogSettingsVersion(current => current + 1);
    toast({
      title: `${value} added`,
      description: `The new ${attribute.name} value is selected and the variant matrix has been updated.`,
    });
  }

  function notifyVariantAttributeSelected(attributeKey: string) {
    const attribute = getProductCatalogSettings().attributes.find(item => item.key === attributeKey);
    if (!attribute) return;
    // A per-product variant choice must not silently change a shared category schema.
    toast({
      title: `${attribute.name} selected for this product`,
      description: 'Select values to generate variants. Shared category configuration is unchanged.',
    });
  }

  function openChannelListingSetup() {
    if (!masterReadyForListings) {
      if (firstMissingMasterListingCheck) openCompletionItem(firstMissingMasterListingCheck.id);
      toast({ title: 'Complete Product Master data first', description: firstMissingMasterListingCheck?.label ?? 'Required Master data is incomplete.', variant: 'destructive' });
      return;
    }
    if (!existingProduct || isDirty) {
      toast({
        title: existingProduct ? 'Save this Product Master first' : 'Create this Product Master first',
        description: 'Channel listings must use a saved Product Master revision.',
        variant: 'destructive',
      });
      return;
    }
    const savedMaster = getProductById(existingProduct.id)!;
    setChannelListingDrafts(freshChannelListingDrafts(savedMaster));
    setCreationChannels(availableListingDestinations(savedMaster));
    creationVersion.current = savedMaster.record_version ?? 1;
    setChannelListingWizardOpen(true);
  }

  function saveAndOpenChannelListingSetup() {
    if (!masterReadyForListings) {
      if (firstMissingMasterListingCheck) openCompletionItem(firstMissingMasterListingCheck.id);
      toast({ title: 'Complete Product Master data first', description: firstMissingMasterListingCheck?.label ?? 'Required Master data is incomplete.', variant: 'destructive' });
      return;
    }
    setOpenChannelListingAfterSave(true);
    if (!handleSave('draft', { navigateAfter: false })) setOpenChannelListingAfterSave(false);
  }

  function viewRevision(revisionId: string) {
    const nextParams = new URLSearchParams(location.search);
    nextParams.set('section', 'activity');
    nextParams.set('revision', revisionId);
    navigate({ pathname: location.pathname, search: nextParams.toString() }, { replace: true });
    setActiveSection('activity');
  }

  function returnToCurrentDraft() {
    const nextParams = new URLSearchParams(location.search);
    nextParams.delete('revision');
    navigate({ pathname: location.pathname, search: nextParams.toString() }, { replace: true });
  }

  function openCompletionItem(checkId: string) {
    const workspace = completionWorkspaceFor(checkId).id;
    const targetByCheck: Record<string, string> = {
      identity: 'product-name', content: 'product-description', category: 'product-category-trigger', attributes: missingRequiredCategoryAttributes[0] ? `product-attribute-${missingRequiredCategoryAttributes[0].key}` : 'product-attributes-title',
      shipping: 'product-section-shipping', price: 'product-section-pricing', variants: 'variant-attributes-title',
      media: 'product-media-panel', channels: 'product-section-channels',
    };
    selectWorkspace(workspace);
    window.setTimeout(() => {
      const target = document.getElementById(targetByCheck[checkId] ?? '');
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const control = target?.querySelector<HTMLElement>('input, select, textarea, button') ?? target;
      control?.focus({ preventScroll: true });
      if (target) {
        target.classList.add('ring-2', 'ring-primary', 'ring-offset-2', 'ring-offset-background');
        window.setTimeout(() => target.classList.remove('ring-2', 'ring-primary', 'ring-offset-2', 'ring-offset-background'), 2400);
      }
    }, 120);
  }

  useEffect(() => {
    setActiveSection(resolveProductWorkspace(new URLSearchParams(location.search).get('section')));
  }, [location.search]);

  const requestedAttentionFocus = searchParams.get('focus');
  useEffect(() => {
    if (requestedAttentionFocus === 'import-review' && existingProduct?.import_result === 'needs_review' && !isHistorical) {
      navigate('/products/master-catalog?review=links', { replace: true });
    }
  }, [requestedAttentionFocus, existingProduct?.import_result, isHistorical, navigate]);
  useEffect(() => {
    const destination = getProductAttentionTarget(requestedAttentionFocus);
    if (!destination || isHistorical || activeSection !== destination.section) return;
    const target = document.getElementById(destination.elementId);
    if (!target) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
    target.focus({ preventScroll: true });
    const highlightClasses = ['ring-2', 'ring-primary', 'ring-offset-2', 'ring-offset-background'];
    target.classList.add(...highlightClasses);
    const timer = window.setTimeout(() => target.classList.remove(...highlightClasses), 2400);
    return () => {
      window.clearTimeout(timer);
      target.classList.remove(...highlightClasses);
    };
  }, [activeSection, requestedAttentionFocus, isHistorical, existingProduct?.id]);

  async function handleImageUpload(file: File, mode: 'primary' | 'gallery') {
    if (!canWrite) return;
    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast({ title: copy.uploadFailed, description: validation.error, variant: 'destructive' });
      return;
    }

    setUploadingImageCount((count) => count + 1);
    try {
      const result = await uploadProductImage(file, existingProduct?.id ?? 'new');
      setImages((prev) => (mode === 'primary' ? [result.url, ...prev] : [...prev, result.url]));
      setImageAltTexts((prev) => (mode === 'primary' ? ['', ...prev] : [...prev, '']));
      toast({ title: copy.imageUploaded, description: result.filename });
    } catch {
      toast({ title: copy.uploadFailed, description: copy.couldNotReadFile, variant: 'destructive' });
    } finally {
      setUploadingImageCount((count) => Math.max(0, count - 1));
    }
  }

  function handleProductTypeChange(nextType: ProductType) {
    if (nextType === form.product_type) return;
    if (nextType === 'variant') {
      const eligibleAttributes = categoryAttributesForProduct.filter(attribute =>
        (attribute.type === 'Single select' || attribute.type === 'Multi-select') && attribute.options.trim()
      );
      const suggestedAttribute = eligibleAttributes.find(attribute => {
        const value = specificationForAttribute(attribute)?.value.trim();
        return Boolean(value);
      }) ?? eligibleAttributes[0];
      if (suggestedAttribute && variantGroups.length === 0) {
        const currentValue = specificationForAttribute(suggestedAttribute)?.value.trim() ?? '';
        setVariantGroups([{ id: genId('variant-group'), name: suggestedAttribute.name, values: currentValue ? [currentValue] : [] }]);
        toast({
          title: currentValue ? `${suggestedAttribute.name} moved to variants` : `${suggestedAttribute.name} added to variants`,
          description: currentValue
            ? `${currentValue} is now the first variant value. Add more values in Commerce.`
            : `Choose one or more ${suggestedAttribute.name.toLowerCase()} values in Commerce.`,
        });
      }
      setForm(current => ({ ...current, product_type: 'variant', has_variants: true }));
      return;
    }
    if (form.has_variants && (variantGroups.length > 0 || variantItems.length > 0)) {
      setConfirmDialog({ open: true, target: nextType });
      return;
    }
    setForm(current => ({ ...current, product_type: nextType, has_variants: false }));
  }

  function handleConfirmSwitch() {
    setVariantGroups([]);
    setVariantItems([]);
    setForm(current => ({ ...current, product_type: confirmDialog.target, has_variants: false }));
    setConfirmDialog({ open: false, target: 'single' });
  }

  function handleSave(statusOverride?: Product['status'], options: { navigateAfter?: boolean; force?: boolean; silent?: boolean } = {}) {
    if (!canWrite) return false;
    const latestProduct = existingProduct ? getProductById(existingProduct.id) ?? existingProduct : null;
    const latestVersion = latestProduct?.record_version ?? 1;
    if (existingProduct && latestVersion !== loadedVersionRef.current && !options.force) {
      setStaleConflictOpen(true);
      return false;
    }
    if (uploadingImageCount > 0) {
      toast({
        title: copy.imagesStillUploading,
        description: copy.waitForUploads,
        variant: 'destructive',
      });
      return false;
    }

    const e: Record<string, string> = {};
    const skuCheck = validateSku(
      form.sku_code,
      existingSkuList.filter(s => s.toUpperCase() !== existingProduct?.sku_code.toUpperCase()),
    );
    if (!skuCheck.valid) e.sku_code = skuCheck.error ?? 'Invalid SKU';
    if (!form.name.trim()) e.name = copy.nameRequired;
    if (!form.category && (statusOverride === 'published' || existingProduct?.status === 'published')) e.category = copy.categoryRequired;
    else if (form.category && !resolveCatalogCategory(form, getProductCatalogSettings().categories)) e.category = 'Select a category again to confirm its identity. Existing attribute values are preserved.';

    // Variant SKU duplicate check
    if (form.has_variants) {
      const selectedItems = variantItems.filter(i => i.selected && i.sku_code.trim());
      const ownedSkus = new Set(latestProduct?.skus.map(sku => sku.sku_code.toUpperCase()) ?? []);
      const usedSkus = new Set(existingSkuList.filter(sku => !ownedSkus.has(sku.toUpperCase())).map(sku => sku.toUpperCase()));
      for (const item of selectedItems) {
        const code = item.sku_code.trim().toUpperCase();
        if (usedSkus.has(code)) {
          e.variant_duplicate = formatMessage(copy.variantDuplicate, { sku: item.sku_code });
          break;
        }
        usedSkus.add(code);
      }
    }

    if (Object.keys(e).length > 0) {
      setErrors(e);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return false;
    }

    const now = new Date().toISOString();

    // Build variants
    const variants = variantItems
      .filter(i => i.selected && i.sku_code.trim())
      .map(i => {
        const saved = latestProduct?.skus.find(sku => sku.id === i.id);
        const locations = saved?.stock_by_location ?? (latestProduct
          ? saved ? undefined : Object.fromEntries(WAREHOUSES.filter(warehouse => canEditWarehouseStock(warehouse.id)).map(warehouse => [warehouse.id, 0]))
          : Object.fromEntries(Object.entries(i.stock_by_location).map(([id, value]) => [id, num(value)])));
        return {
          ...saved,
          id: saved?.id ?? genId('sku'),
          sku_code: i.sku_code.trim().toUpperCase(),
          variation_name: i.key,
          weight_g: saved?.weight_g ?? 0,
          units_per_carton: saved?.units_per_carton ?? 10,
          status: 'active' as const,
          image_url: i.image_url,
          price: num(i.price),
          stock: locations ? Object.values(locations).reduce((total, value) => total + value, 0) : saved?.stock,
          stock_by_location: locations,
        };
      });

    const variantRetailPrices = variants.map(variant => variant.price).filter(price => price > 0);
    // Existing relationships and their sync preferences are listing-owned. A
    // Master save must not collapse same-channel shops or replace provider IDs.
    const selectedChannels: ChannelListing[] = [...(latestProduct?.channels ?? existingProduct?.channels ?? [])];
    for (const channel of OVERRIDE_CHANNELS.filter(channel => channelOverrides[channel.key].enabled)) {
      const listingChannel = listingChannelByOverride[channel.key];
      if (!selectedChannels.some(listing => listing.channel === listingChannel)) selectedChannels.push({
        channel: listingChannel, external_id: null, shop_sku: channelOverrides[channel.key].listing_sku.trim() || undefined,
        status: 'draft', listing_url: null, last_synced_at: null,
      });
    }
    const payload: Product = {
      id: existingProduct?.id ?? genId('prod'),
      sku_code: form.sku_code.trim().toUpperCase(),
      product_type: form.product_type,
      gtin: form.gtin.trim(),
      mpn: form.mpn.trim(),
      model_number: form.model_number.trim(),
      brand: form.brand.trim(),
      brandId: form.brandId || undefined,
      asin: form.asin.trim(),
      manufacturer: form.manufacturer.trim(),
      name: form.name.trim(),
      category: form.category,
      categoryId: resolveCatalogCategory(form, getProductCatalogSettings().categories)?.id,
      condition: form.condition,
      description: form.description.trim(),
      localized_content: localizedContent,
      original_price: num(form.original_price),
      retail_price: form.has_variants && variantRetailPrices.length > 0 ? Math.min(...variantRetailPrices) : num(form.retail_price),
      price_currency: form.price_currency,
      market_prices: [], // @deprecated — use price_policies
      price_policies: existingProduct?.price_policies ?? [],
      prod_length: num(form.prod_length),
      prod_height: num(form.prod_height),
      prod_width: num(form.prod_width),
      prod_weight: num(form.prod_weight),
      pkg_length: num(form.pkg_length),
      pkg_height: num(form.pkg_height),
      pkg_width: num(form.pkg_width),
      pkg_weight: num(form.pkg_weight),
      country_of_origin: form.country_of_origin,
      hs_code: form.hs_code.trim(),
      images,
      image_alt_texts: imageAltTexts,
      slug: form.slug.trim() || slugify(form.name),
      meta_title: form.meta_title.trim(),
      meta_description: form.meta_description.trim(),
      specifications: serializeSpecifications(specifications),
      inventory: latestProduct?.inventory ?? Object.fromEntries(Object.entries(inventory).map(([k, v]) => [k, num(v)])),
      has_variants: form.has_variants,
      channels: selectedChannels,
      channel_overrides: Object.fromEntries(Object.entries(channelOverrides).map(([key, value]) => [key, {
        enabled: value.enabled,
        title: value.title.trim(),
        price_markup: num(value.price_markup),
        pricing_shop_id: value.pricing_shop_id,
        pricing_shop_label: value.pricing_shop_label,
        pricing_source: value.pricing_source,
        manual_price: value.manual_price,
        channel_price: value.channel_price,
        channel_currency: value.channel_currency,
        pricing_signature: value.pricing_signature,
        description: value.description.trim(),
        listing_sku: value.listing_sku.trim(),
        category: value.category.trim(),
        fulfillment: value.fulfillment,
        variant_scope: value.variant_scope,
        selected_variant_ids: value.selected_variant_ids,
        listing_mode: value.listing_mode,
        identifier: value.identifier.trim(),
        condition: value.condition,
        stock_quantity: value.stock_quantity,
        warehouse: value.warehouse,
        brand: value.brand.trim(),
        shipping_option: value.shipping_option,
        bullet_points: value.bullet_points.trim(),
        search_terms: value.search_terms.trim(),
        preorder_days: value.preorder_days,
        warranty: value.warranty.trim(),
        certification: value.certification.trim(),
        video_url: value.video_url.trim(),
        web_slug: value.web_slug.trim(),
        pos_barcode: value.pos_barcode.trim(),
        visibility: value.visibility,
        sync_policy: value.sync_policy,
        safety_buffer: value.safety_buffer,
        allocation_cap: value.allocation_cap,
        media_scope: value.media_scope,
        compliance_notes: value.compliance_notes.trim(),
        tax_code: value.tax_code.trim(),
        attribute_material: value.attribute_material.trim(),
        attribute_color: value.attribute_color.trim(),
        localized_content_confirmed: value.localized_content_confirmed,
      }])),
      associations,
      import_result: existingProduct?.import_result === 'needs_review' ? 'needs_review' : statusOverride === 'published'
        ? 'published'
        : existingProduct?.import_result === 'incomplete' && masterReadyForListings
          ? 'ready'
          : existingProduct?.import_result,
      import_source: existingProduct?.import_source,
      import_sources: existingProduct?.import_sources,
      import_issues: existingProduct?.import_result === 'incomplete' && masterReadyForListings
        ? []
        : existingProduct?.import_issues,
      revisions: statusOverride === 'published'
        ? [...(existingProduct?.revisions ?? []), {
          id: `rev-${Date.now().toString(36)}`,
          number: (existingProduct?.revisions?.at(-1)?.number ?? 0) + 1,
          status: 'published' as const,
          createdAt: now,
          createdBy: 'PrimeOS Admin',
          summary: 'Published canonical Product Master revision',
        }]
        : existingProduct?.revisions ?? [],
      record_version: latestVersion + 1,
      status: statusOverride ?? existingProduct?.status ?? 'draft',
      created_at: existingProduct?.created_at ?? now,
      updated_at: now,
      variant_options: form.has_variants ? variantGroups.map(group => {
        const attribute = categoryAttributesForProduct.find(candidate => candidate.name.trim().toLowerCase() === group.name.trim().toLowerCase());
        return { attributeKey: attribute?.key ?? slugify(group.name), name: attribute?.name ?? group.name, values: [...group.values] };
      }) : [],
      skus: variants,
      _variants: variants,
    };

    try {
      if (storedProduct) updateProduct(storedProduct.id, payload, { requirePersistence: true });
      else addProduct(payload, { requirePersistence: true });
    } catch {
      toast({ title: 'Could not save the Product Master', description: 'Your changes are still in this form. Check browser storage and try again.', variant: 'destructive' });
      return false;
    }
    if (!options.silent) toast({ title: storedProduct ? copy.updated : copy.created, description: formatMessage(storedProduct ? copy.updatedDescription : copy.createdDescription, { name: payload.name }) });
    setVariantItems(items => items.map(item => ({ ...item, id: variants.find(sku => sku.sku_code === item.sku_code.trim().toUpperCase())?.id ?? item.id })));

    baselineSnapshotRef.current = latestSnapshotRef.current;
    setLastSavedAt(new Date(now));
    loadedVersionRef.current = payload.record_version ?? loadedVersionRef.current;
    setDraftSaveGeneration(value => value + 1);
    if (statusOverride === 'published') setReadinessStatus('published');
    else setReadinessStatus('unchecked');
    if (options.navigateAfter !== false) navigate('/products/master-catalog');
    else if (!existingProduct) navigate(`/products/${payload.id}/edit`, { replace: true });
    return true;
  }

  function openStockAdjustment(warehouseId: string, item?: VariantItem) {
    if (!canWrite || !existingProduct || !canEditWarehouseStock(warehouseId)) return;
    const latest = getProductById(existingProduct.id);
    if (!latest) return;
    const variant = item ? latest.skus.find(sku => sku.id === item.id) : undefined;
    if (item && !variant) return;
    setAddingStockLocation(false);
    setStockAdjustment({ product: latest, warehouse: getWarehouses().find(warehouse => warehouse.id === warehouseId), sku: variant?.sku_code });
  }

  function openAddStockLocation() {
    if (!canWrite || !existingProduct || form.has_variants) return;
    const latest = getProductById(existingProduct.id);
    if (!latest) return;
    setAddingStockLocation(true);
    setStockAdjustment({ product: latest });
  }

  function refreshAdjustedStock() {
    const latest = existingProduct && getProductById(existingProduct.id);
    if (latest) {
      setInventory(Object.fromEntries(Object.entries(latest.inventory).map(([id, value]) => [id, String(value)])));
      setVariantItems(items => items.map(item => {
        const saved = latest.skus.find(sku => sku.id === item.id);
        if (!saved) return item;
        const locations = saved.stock_by_location ?? {};
        return { ...item, stock: String(Object.values(locations).reduce((total, value) => total + value, 0)), stock_by_location: Object.fromEntries(Object.entries(locations).map(([id, value]) => [id, String(value)])) };
      }));
    }
    setStockAdjustment(null);
    setAddingStockLocation(false);
  }

  function renderControlledStock(warehouseId: string, item?: VariantItem) {
    const saved = item ? existingProduct?.skus.find(sku => sku.id === item.id) : undefined;
    const value = item ? saved?.stock_by_location?.[warehouseId] : existingProduct?.inventory[warehouseId];
    const writable = canEditWarehouseStock(warehouseId);
    const needsSave = Boolean(item && !saved);
    return <div className="flex flex-wrap items-center justify-end gap-2 text-right">
      <span className="text-sm font-semibold tabular-nums">{value === undefined ? 'Not recorded' : `${value.toLocaleString()} units`}</span>
      {!writable ? <span className="text-xs text-muted-foreground">Read only</span> : needsSave ? <span className="text-xs text-muted-foreground">Save variant first</span> : canWrite && <Button type="button" variant="outline" size="sm" className="min-h-9" aria-label={`Adjust stock at ${getWarehouses().find(warehouse => warehouse.id === warehouseId)?.name}${item ? ` for ${item.key}` : ''}`} onClick={() => openStockAdjustment(warehouseId, item)}>Adjust stock</Button>}
      {existingProduct && canWrite && writable && !needsSave && <ManageStockHoldsButton product={existingProduct} warehouseId={warehouseId} sku={saved?.sku_code} />}
    </div>;
  }

  const totalStock = Object.values(inventory).reduce((s, v) => s + num(v), 0);
  const stockLocations = getWarehouses();
  const recordedLocationIds = Object.keys(existingProduct?.inventory ?? {}).filter(id => recordedQuantity(existingProduct?.inventory[id]) !== null);
  const inventoryLocations = existingProduct
    ? [
      ...stockLocations.filter(warehouse => recordedLocationIds.includes(warehouse.id)).map(warehouse => ({ id: warehouse.id, label: warehouse.name, code: warehouse.code })),
      ...recordedLocationIds.filter(id => !stockLocations.some(warehouse => warehouse.id === id)).map(id => ({ id, label: 'Unknown stock location', code: id })),
    ]
    : WAREHOUSES;
  const availableStockLocations = stockLocations.filter(warehouse => warehouse.status === 'active' && canEditWarehouseStock(warehouse.id) && !recordedLocationIds.includes(warehouse.id));
  const recordedStockTotal = recordedLocationIds.reduce((total, id) => total + existingProduct!.inventory[id], 0);
  const masterSkuLocked = Boolean(existingProduct && (
    existingProduct.status !== 'draft' || existingProduct.channels.length > 0 || totalStock > 0
  ));
  const selectedVariantItems = variantItems.filter(item => item.selected);
  const listingEditorVariants = useMemo(() => form.product_type === 'variant'
    ? variantItems.filter(item => item.selected).map(item => ({ id: item.key, label: item.key, sku: item.sku_code }))
    : [{ id: 'default', label: 'Default SKU', sku: form.sku_code }], [form.product_type, form.sku_code, variantItems]);
  const listingEditorInventorySources = editingChannel ? [
    { value: 'all', label: 'All recorded stock locations' },
    { value: 'primary', label: 'Primary fulfillment warehouse' },
    { value: 'channel', label: `${OVERRIDE_CHANNELS.find(channel => channel.key === editingChannel)?.label} dedicated stock` },
    ...stockLocations.filter(warehouse => warehouse.status === 'active' && !warehouse.is_virtual).map(warehouse => ({ value: warehouse.id, label: warehouse.name })),
  ].map(source => {
    const warehouseIds = resolveListingWarehouseIds(editingChannel, source.value, stockLocations.filter(warehouse => warehouse.status === 'active' && !warehouse.is_virtual));
    const sumRecorded = (stock: Record<string, string | number>) => {
      const values = warehouseIds.map(id => stock[id]).filter(value => value !== undefined && String(value).trim() !== '' && Number.isFinite(Number(value)));
      return values.length ? values.reduce<number>((sum, value) => sum + Number(value), 0) : null;
    };
    return { ...source, quantity: sumRecorded(inventory), ...(form.product_type === 'variant' ? { byVariant: Object.fromEntries(selectedVariantItems.map(item => [item.key, sumRecorded(item.stock_by_location ?? {})])) } : {}) };
  }) : [];
  const shippingPackageRequired = OVERRIDE_CHANNELS.some(channel =>
    channelOverrides[channel.key].enabled && !['pos', 'social'].includes(channel.key)
  );
  const catalogSettings = getProductCatalogSettings();
  const selectedCatalogCategory = resolveCatalogCategory(form, catalogSettings.categories);
  const categoryAttributesForProduct = assignedCategoryAttributes(selectedCatalogCategory, catalogSettings.attributes);
  const attributeValues = { specifications, has_variants: form.has_variants, variant_options: variantGroups.map(group => ({ attributeKey: categoryAttributesForProduct.find(attribute => attribute.name.toLowerCase() === group.name.toLowerCase())?.key ?? '', name: group.name, values: group.values })) };
  const missingRequiredCategoryAttributes = missingCategoryAttributes(categoryAttributesForProduct, attributeValues);
  const retainedAttributes = retainedSpecifications(specifications, categoryAttributesForProduct).filter(spec => spec.value.trim());
  const pendingCatalogCategory = catalogSettings.categories.find(category => category.id === pendingCategory && category.status === 'Active');
  const pendingCategoryDiff = pendingCatalogCategory ? categorySchemaDiff(selectedCatalogCategory, pendingCatalogCategory) : null;
  const pendingCategoryMissing = missingCategoryAttributes(assignedCategoryAttributes(pendingCatalogCategory, catalogSettings.attributes), { ...attributeValues, variant_options: variantGroups.map(group => ({ attributeKey: catalogSettings.attributes.find(attribute => attribute.name.toLowerCase() === group.name.toLowerCase())?.key ?? '', name: group.name, values: group.values })) });
  function stageCategoryChange() {
    if (!pendingCatalogCategory) return;
    setForm(current => ({ ...current, categoryId: pendingCatalogCategory.id, category: pendingCatalogCategory.name }));
    setCategoryReviewOpen(false);
    setCategoryOpen(false);
    setCategorySearch('');
  }
  const requiredLocalizableAttributes = categoryAttributesForProduct.filter(attribute => attribute.isLocalizable && attribute.required);
  const getLocaleCompletionStatus = (locale: OrgLocaleConfig): 'primary' | 'complete' | 'partial' | 'missing' => {
    if (locale.isPrimary) return 'primary';
    const content = localizedContent[locale.locale];
    const values = [content?.name?.trim(), richTextPlainText(content?.description ?? ''), ...requiredLocalizableAttributes.map(attribute => content?.attributeValues?.[attribute.key]?.trim())];
    const completed = values.filter(Boolean).length;
    if (completed === values.length) return 'complete';
    return completed > 0 ? 'partial' : 'missing';
  };
  const allSelectableVariantAttributes = getProductCatalogSettings().attributes.filter(attribute =>
    attribute.status === 'Active' && (attribute.type === 'Single select' || attribute.type === 'Multi-select') && attribute.options.trim()
  );
  const completionChecks = useMemo(() => getMasterReadinessChecks({
    ...form, images, inventory, variantGroups, variantItems, specifications, shippingPackageRequired,
  }), [form, images, inventory, variantGroups, variantItems, specifications, shippingPackageRequired, catalogSettingsVersion]);
  const completion = Math.round((completionChecks.filter(check => check.done).length / completionChecks.length) * 100);
  const masterListingChecks = completionChecks;
  const firstMissingMasterListingCheck = masterListingChecks.find(check => !check.done);
  const masterReadyForListings = masterListingChecks.every(check => check.done);
  const requiredCategoryAttributes = categoryAttributesForProduct.filter(attribute => attribute.required);
  const specificationForAttribute = (attribute: CatalogAttribute) => specifications.find(spec => spec.attributeKey === attribute.key)
    ?? specifications.find(spec => !spec.attributeKey && spec.name.trim().toLowerCase() === attribute.name.toLowerCase());
  useEffect(() => {
    if (!form.has_variants || !form.category) return;

    const seedKey = `${form.categoryId || form.category}:${form.product_type}:${catalogSettingsVersion}`;
    if (variantAutoSeedKeyRef.current === seedKey) return;
    variantAutoSeedKeyRef.current = seedKey;
    if (variantGroups.length > 0) return;

    const eligibleAttributes = getAttributesForCategory(form.category, form.categoryId).filter(attribute =>
      attribute.key !== 'brand'
      && (attribute.type === 'Single select' || attribute.type === 'Multi-select')
      && attribute.options.trim()
    );
    const suggestedAttribute = eligibleAttributes.find(attribute => {
      const specification = specifications.find(spec => spec.attributeKey === attribute.key)
        ?? specifications.find(spec => !spec.attributeKey && spec.name.trim().toLowerCase() === attribute.name.toLowerCase());
      return Boolean(specification?.value.trim());
    }) ?? eligibleAttributes[0];
    if (!suggestedAttribute) return;

    const specification = specifications.find(spec => spec.attributeKey === suggestedAttribute.key)
      ?? specifications.find(spec => !spec.attributeKey && spec.name.trim().toLowerCase() === suggestedAttribute.name.toLowerCase());
    const currentValue = specification?.value.trim() ?? '';
    setVariantGroups([{ id: genId('variant-group'), name: suggestedAttribute.name, values: currentValue ? [currentValue] : [] }]);
  }, [catalogSettingsVersion, form.category, form.categoryId, form.has_variants, form.product_type, specifications, variantGroups.length]);
  const catalogCategories = catalogSettings.categories;
  const categoryParent = selectedCatalogCategory?.parentId ? catalogCategories.find(category => category.id === selectedCatalogCategory.parentId) : undefined;
  const categoryRoot = categoryParent?.parentId ? catalogCategories.find(category => category.id === categoryParent.parentId) : categoryParent;
  const categoryPath = [categoryRoot?.name, categoryParent?.name, selectedCatalogCategory?.name].filter((value, index, values) => value && values.indexOf(value) === index);
  const selectedCategoryGroup = categoryTree.find(item => item.id === categoryLevelOne) ?? categoryTree[0];
  const selectedCategorySubgroup = selectedCategoryGroup.children.find(item => item.id === categoryLevelTwo) ?? selectedCategoryGroup.children[0];
  const matchingCategoryPaths = categoryTree.flatMap(group => group.children.flatMap(subgroup => subgroup.children.map(leaf => ({ group, subgroup, leaf })))).filter(item => !categorySearch.trim() || `${item.group.label} ${item.subgroup.label} ${item.leaf.name}`.toLowerCase().includes(categorySearch.trim().toLowerCase()));
  const currentSnapshot = JSON.stringify({ form, localizedContent, inventory: existingProduct ? undefined : inventory, images, imageAltTexts, variantGroups, variantItems: variantItems.map(({ id, stock, stock_by_location, ...item }) => existingProduct ? item : { ...item, stock, stock_by_location }), channelOverrides, associations, specifications });
  latestSnapshotRef.current = currentSnapshot;
  const isDirty = dirtyTrackingReady && currentSnapshot !== baselineSnapshotRef.current;
  const lifecycle = useProductLifecycleActions(action => {
    if (action === 'restore') {
      loadedVersionRef.current = getProductById(existingProduct!.id)?.record_version ?? 1;
      setReadinessStatus('unchecked');
      refreshLifecycle(value => value + 1);
    } else {
      setDirtyTrackingReady(false);
      navigate('/products/master-catalog', { replace: true });
    }
  }, isDirty);

  useEffect(() => {
    if (!openChannelListingAfterSave || !existingProduct || isDirty) return;
    setOpenChannelListingAfterSave(false);
    const savedMaster = getProductById(existingProduct.id)!;
    setChannelListingDrafts(freshChannelListingDrafts(savedMaster));
    setCreationChannels(availableListingDestinations(savedMaster));
    creationVersion.current = savedMaster.record_version ?? 1;
    setChannelListingWizardOpen(true);
  }, [channelOverrides, existingProduct, isDirty, openChannelListingAfterSave]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      baselineSnapshotRef.current = latestSnapshotRef.current;
      setDirtyTrackingReady(true);
    }, 150);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const scrollContainer = document.getElementById('main-content');
    const updateScrollState = () => setHasScrolledFromTop((scrollContainer?.scrollTop ?? window.scrollY) > 64);
    updateScrollState();
    const target: HTMLElement | Window = scrollContainer ?? window;
    target.addEventListener('scroll', updateScrollState, { passive: true });
    return () => target.removeEventListener('scroll', updateScrollState);
  }, []);

  useEffect(() => {
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [isDirty]);

  function beginPublish() {
    if (!canWrite || readinessStatus !== 'ready' || isDirty || !completionChecks.every(check => check.done)) return;
    setPublishConfirmationOpen(false);
    setPublishOpen(true);
    setPublishPercent(8);
    [24, 42, 68, 86].forEach((value, index) => {
      window.setTimeout(() => setPublishPercent(value), 360 * (index + 1));
    });
    window.setTimeout(() => {
      if (!handleSave('published', { navigateAfter: false, silent: true })) { setPublishOpen(false); return; }
      setPublishPercent(100);
      toast({
        title: 'Product Master activated',
        description: publishListingMode === 'apply-listings'
          ? 'Review the listing updates before applying the new master data.'
          : 'Channel listings were left unchanged.',
      });
    }, 2200);
  }


  const allRequirementsComplete = completionChecks.every(check => check.done);
  const showReadinessPanel = !isArchived && activeSection !== 'activity' && activeSection !== 'overview' && !allRequirementsComplete;
  const showEditorSidebar = showReadinessPanel;
  const hasPublishedRevision = readinessStatus === 'published' || existingProduct?.status === 'published';
  const primaryAction = hasPublishedRevision && !isDirty
    ? 'published'
    : !allRequirementsComplete
      ? 'complete'
      : hasPublishedRevision
        ? 'publish-updates'
        : 'publish';

  function handlePrimaryAction() {
    if (!canWrite) return;
    if (primaryAction === 'published') return;
    if (primaryAction === 'complete') {
      if (isDirty && !handleSave('draft', { navigateAfter: false, silent: true })) return;
      setReadinessStatus('blocked');
      setReadinessReviewOpen(true);
      return;
    }
    if ((isDirty || !existingProduct) && !handleSave('draft', { navigateAfter: false, silent: true })) return;
    setReadinessStatus('ready');
    setPublishListingMode('master-only');
    setPublishConfirmationOpen(true);
  }
  const displayedProductName = contentLocale === primaryLocale ? form.name : localizedContent[contentLocale]?.name ?? '';
  const displayedProductDescription = contentLocale === primaryLocale ? form.description : localizedContent[contentLocale]?.description ?? '';
  const configuredChannelCount = Object.values(channelOverrides).filter(channel => channel.enabled).length;
  const publishListingDiffs = OVERRIDE_CHANNELS.filter(channel => channelOverrides[channel.key].enabled).map(channel => {
    const draft = channelOverrides[channel.key];
    const changes: Array<{ label: string; current: string; next: string }> = [];
    const shortText = (value: string) => {
      const plain = richTextPlainText(value).trim();
      return plain ? plain.slice(0, 52) + (plain.length > 52 ? '…' : '') : 'Not set';
    };
    if (draft.title.trim() !== form.name.trim()) changes.push({ label: 'Product name', current: draft.title.trim() || 'Not set', next: form.name.trim() || 'Not set' });
    if (richTextPlainText(draft.description).trim() !== richTextPlainText(form.description).trim()) changes.push({ label: 'Description', current: shortText(draft.description), next: shortText(form.description) });
    if (draft.brand.trim() !== form.brand.trim()) changes.push({ label: 'Brand', current: draft.brand.trim() || 'Not set', next: form.brand.trim() || 'Not set' });
    if (draft.media_scope !== 'all') changes.push({ label: 'Images', current: 'Listing-specific media', next: `${images.length} Master image${images.length === 1 ? '' : 's'}` });
    const priceQuote = quoteListingPrice(num(form.retail_price), form.price_currency, draft);
    if (draft.pricing_source === 'shop' && pricingNeedsReview(draft, priceQuote)) changes.push({
      label: 'Pricing · review in listing',
      current: formatPrice(draft.channel_price, draft.channel_currency),
      next: priceQuote.error || formatPrice(priceQuote.amount, priceQuote.currency),
    });
    const nextCompliance = [
      form.pkg_length && form.pkg_width && form.pkg_height ? `Package: ${form.pkg_length}x${form.pkg_width}x${form.pkg_height}cm · ${form.pkg_weight}g` : '',
      form.country_of_origin ? `Origin: ${form.country_of_origin}` : '',
      form.hs_code ? `HS: ${form.hs_code}` : '',
    ].filter(Boolean).join('\n');
    if (nextCompliance && draft.compliance_notes.trim() !== nextCompliance) changes.push({ label: 'Shipping & compliance', current: shortText(draft.compliance_notes), next: shortText(nextCompliance) });
    return { key: channel.key, label: channel.label, account: channel.account, changes };
  }).filter(item => item.changes.length > 0);
  const publishListingChangeCount = publishListingDiffs.reduce((total, listing) => total + listing.changes.length, 0);
  const configuredChannels = OVERRIDE_CHANNELS.filter(channel => channelOverrides[channel.key].enabled).map(channel => ({
    ...channel, listing: configuredListing(existingProduct?.channels ?? [], listingChannelByOverride[channel.key], channelOverrides[channel.key].listing_sku),
  }));
  const linkedOnlyListings = (existingProduct?.channels ?? []).filter(listing => !configuredChannels.some(channel => channel.listing === listing));
  const channelListingCount = configuredChannels.length + linkedOnlyListings.length;
  const masterSyncOnCount = configuredChannels.filter(channel => listingMasterSync(channel.listing, existingProduct?.channel_overrides?.[channel.key]).enabled).length
    + linkedOnlyListings.filter(listing => listingMasterSync(listing).enabled).length;
  const importListingSnapshots = getCatalogImportItems({ requireConfirmation: true });
  const editingListing = editingChannel ? configuredChannels.find(channel => channel.key === editingChannel)?.listing : undefined;
  const editingSyncPreference = editingChannel && editingListing ? listingMasterSync(editingListing, existingProduct?.channel_overrides?.[editingChannel]) : undefined;
  const configuredShopData = new Map(configuredChannels.map(channel => {
    const data = channel.listing && existingProduct
      ? listingShopDemoData(existingProduct, channel.listing, resolveListingShopData(existingProduct, channel.listing, importListingSnapshots))
      : { data: { price: savedListingPrice(existingProduct?.channel_overrides?.[channel.key]) } as ListingShopData, demo: false };
    return [channel.key, data] as const;
  }));
  const hasDemoListingData = [...configuredShopData.values()].some(value => value.demo);
  const hasAvailableChannelToCreate = availableListingDestinations(existingProduct).length > 0;

  if (editId && !existingProduct) {
    return (
      <div className="grid min-h-full place-items-center bg-background p-6">
        <Card className="w-full max-w-lg">
          <CardContent className="p-8 text-center">
            <Package className="mx-auto size-8 text-muted-foreground" />
            <h1 className="mt-4 text-lg font-semibold">Product Master not found</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This record may have been removed or the link is no longer valid.
            </p>
            <div className="mt-5 flex justify-center gap-2">
              <Button variant="outline" onClick={() => navigate('/products/master-catalog')}>
                View Product Masters
              </Button>
              <Button onClick={() => navigate('/products/master-catalog')}>
                Back to Product Master
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── LocaleSwitcher Component ───────────────────────────────────────────────
  function LocaleSwitcher({
    locales,
    current,
    getStatus,
    onSelect,
  }: {
    locales: OrgLocaleConfig[];
    current: string;
    getStatus: (locale: OrgLocaleConfig) => 'primary' | 'complete' | 'partial' | 'missing';
    onSelect: (locale: string) => void;
  }) {
    const secondaryLocales = locales.filter(l => !l.isPrimary);
    const completedCount = secondaryLocales.filter(l => getStatus(l) === 'complete').length;
    const allComplete = secondaryLocales.length > 0 && completedCount === secondaryLocales.length;
    const currentConfig = locales.find(l => l.locale === current);

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 gap-2 px-3 text-xs font-semibold" title="Content language for Product Name, Description and localizable attributes">
            <Globe2 className="size-3.5 shrink-0" />
            <span><span className="hidden font-normal text-muted-foreground xl:inline">Content: </span>{currentConfig?.nativeLabel ?? current}</span>
            {secondaryLocales.length > 0 && (
              <span className={cn(
                'inline-flex min-w-7 items-center justify-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold leading-none',
                allComplete
                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500'
                  : 'border-border/70 bg-muted/60 text-muted-foreground',
              )}>
                {completedCount}/{secondaryLocales.length}
              </span>
            )}
            <ChevronDown className="size-3 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 pt-2 pb-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Content language</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {secondaryLocales.length === 0
                ? 'Primary language only'
                : allComplete
                  ? '✓ All translations complete'
                  : `${secondaryLocales.length - completedCount} translation${secondaryLocales.length - completedCount !== 1 ? 's' : ''} missing · Select a language to edit`}
            </p>
          </div>
          <DropdownMenuSeparator />
          {locales.map(loc => {
            const st = getStatus(loc);
            const isActive = loc.locale === current;
            const statusIcon = st === 'complete'
              ? <CircleCheck className="size-3.5 text-emerald-600 shrink-0" />
              : st === 'partial'
                ? <CircleAlert className="size-3.5 text-amber-500 shrink-0" />
                : st === 'missing'
                  ? <span className="size-2 rounded-full border-2 border-rose-400 inline-block shrink-0" />
                  : <span className="size-2 rounded-full bg-primary inline-block shrink-0" />;
            return (
              <DropdownMenuItem
                key={loc.locale}
                onSelect={() => onSelect(loc.locale)}
                className={cn('flex items-center gap-2 py-2', isActive && 'bg-primary/5')}
              >
                {statusIcon}
                <span className="flex-1 text-sm">{loc.nativeLabel}</span>
                {loc.isPrimary && <Badge variant="outline" className="text-[9px] px-1 py-0 h-auto">Primary</Badge>}
                {!loc.isPrimary && st === 'partial' && <span className="text-[10px] text-amber-500">Partial</span>}
                {!loc.isPrimary && st === 'missing' && <span className="text-[10px] text-rose-500">Missing</span>}
                {isActive && <span className="text-[10px] font-medium text-primary">Editing</span>}
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          <div className="px-3 py-2 text-[10px] leading-4 text-muted-foreground">
            Applies to Product Name, Description and localizable attributes. Languages are managed by your organization.
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div data-testid="product-editor-page" className="flex min-h-full flex-col bg-background">
      {/* Top Bar */}
      <div className={`sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b bg-card/95 px-4 backdrop-blur transition-[padding,box-shadow] duration-200 motion-reduce:transition-none sm:px-6 ${hasScrolledFromTop ? 'py-2 shadow-sm' : 'py-4'}`}>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button onClick={() => navigate('/products/master-catalog')} className="grid size-9 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Back to Product Master"><ArrowLeft className="size-4" /></button>
          <div className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-md border bg-muted/30">{images[0] ? <img src={images[0]} alt="" className="size-full object-cover" /> : <Package className="size-4 text-muted-foreground" />}</div>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2"><h1 className="truncate text-sm font-semibold sm:text-base">{form.name || (existingProduct ? 'Untitled Product Master' : 'New Product Master')}</h1><Badge variant="outline" className="hidden shrink-0 capitalize sm:inline-flex">{existingProduct?.status === 'published' ? 'Active' : existingProduct?.status ?? 'draft'}</Badge></div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground"><span className="truncate font-mono">{form.sku_code || 'SKU not assigned'}</span><span className="hidden sm:inline">· {form.has_variants ? `${selectedVariantItems.length || 0} variants` : 'Single product'}</span><span className={cn('hidden font-medium md:inline', isDirty ? 'text-amber-500' : 'text-muted-foreground')}>· {isDirty ? 'Unsaved changes' : lastSavedAt ? 'Saved' : 'Not saved'}</span></div>
          </div>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <LocaleSwitcher
            locales={activeOrgLocales}
            current={contentLocale}
            getStatus={getLocaleCompletionStatus}
            onSelect={selectContentLocale}
          />
          {!canManageProduct && !isHistorical ? <Badge variant="outline">View only</Badge> : null}
          {canWrite && isDirty && !hasPublishedRevision && <Button type="button" variant="outline" disabled={uploadingImageCount > 0 || publishOpen} onClick={() => handleSave(undefined, { navigateAfter: false })}>Save draft</Button>}
          {isHistorical ? <Button type="button" variant="outline" onClick={returnToCurrentDraft}><ArrowLeft className="size-4" />Return to current draft</Button> : isArchived && canManageProduct ? <Button type="button" onClick={() => lifecycle.requestAction(existingProduct!, 'restore')}><RotateCcw className="size-4" />Restore product</Button> : canWrite ? <Button
            onClick={handlePrimaryAction}
            disabled={uploadingImageCount > 0 || publishOpen || primaryAction === 'published'}
          >
            {uploadingImageCount > 0 ? <Loader2 className="size-4 animate-spin" /> : primaryAction === 'complete' ? <CircleAlert className="size-4" /> : <CloudUpload className="size-4" />}
            {uploadingImageCount > 0 ? 'Saving images…' : primaryAction === 'complete' ? 'Complete product' : primaryAction === 'publish-updates' ? 'Update Master' : primaryAction === 'published' ? 'Master active' : 'Activate Master'}
          </Button> : null}
          {existingProduct && canManageProduct && <DropdownMenu>
            <DropdownMenuTrigger asChild><Button type="button" variant="outline" size="icon" aria-label="Product actions"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              {!isArchived && !isHistorical && <><DropdownMenuItem onSelect={() => setReadinessReviewOpen(true)}><CircleCheck className="mr-2 size-4" />View readiness checks</DropdownMenuItem><DropdownMenuSeparator /></>}
              <ProductLifecycleMenuItems product={existingProduct} onAction={lifecycle.requestAction} disabled={uploadingImageCount > 0 || publishOpen} />
            </DropdownMenuContent>
          </DropdownMenu>}
        </div>
      </div>

      {lifecycle.dialog}
      {isArchived && !isHistorical && <div className="mx-4 mt-4 flex items-start gap-3 rounded-lg border bg-muted/20 p-4 text-sm sm:mx-6">
        <Archive className="mt-0.5 size-4 shrink-0 text-muted-foreground" /><div><p className="font-medium">This product is archived</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Restore it to Draft to edit or publish. Existing channel listings are unchanged.</p></div>
      </div>}

      {isHistorical ? <div className="mx-4 mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm sm:mx-6"><Info className="size-4 text-amber-600" /><strong>Viewing revision {selectedRevision?.number}</strong><span className="text-muted-foreground">This historical revision is read-only.</span></div> : null}

      {activeSection !== 'overview' && !isArchived && existingProduct?.import_result && existingProduct.import_result !== 'needs_review' && !(existingProduct.import_result === 'incomplete' && masterReadyForListings) ? <div id="product-import-review" tabIndex={-1} className="mx-4 mt-4 rounded-xl border bg-muted/20 p-4 sm:mx-6"><p className="text-sm font-semibold">{existingProduct.import_result === 'incomplete' ? 'Complete missing master data' : 'Imported product data'}</p>{existingProduct.import_source && <p className="mt-1 text-xs text-muted-foreground">Source: {existingProduct.import_source}</p>}{existingProduct.import_result === 'incomplete' && <p className="mt-2 text-xs text-muted-foreground">{existingProduct.import_issues?.join(' · ') || 'Complete the required fields before activating this Master.'}</p>}</div> : null}
      {activeSection !== 'overview' && !isHistorical && existingProduct?.import_result === 'needs_review' && <div className="mx-4 mt-3 flex items-center justify-end sm:mx-6"><Button variant="ghost" size="sm" onClick={() => navigate('/products/master-catalog?review=links')}>Review shop links in inbox <ArrowRight className="size-4" /></Button></div>}

      {uploadingImageCount > 0 && (
        <div className="mx-6 mt-4 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
          {formatMessage(copy.uploadsInProgress, {
            count: uploadingImageCount,
            suffix: uploadingImageCount > 1 ? copy.pluralSuffix : copy.singularSuffix,
          })}
        </div>
      )}

      {/* Errors banner */}
      {Object.keys(errors).length > 0 && (
        <div className="mx-6 mt-4 px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-3">
          <AlertTriangle className="size-4 text-destructive shrink-0" />
          <p className="text-sm text-destructive">
            {errors.variant_duplicate ?? errors.sku_code ?? errors.name ?? errors.category ?? errors.attributes ?? copy.errorFallback}
          </p>
        </div>
      )}

      {/* Content */}
      <div data-testid="product-editor-content">
        <div data-testid="product-editor-layout" className={cn('grid w-full grid-cols-1 gap-6 px-4 sm:px-6', activeSection === 'overview' ? 'py-3' : 'py-6', showEditorSidebar ? 'xl:grid-cols-[220px_minmax(0,1fr)_300px]' : 'xl:grid-cols-[220px_minmax(0,1fr)]')}>

          <nav className="h-fit overflow-x-auto xl:sticky xl:top-20" aria-label="Product editor workspaces">
            <div className="flex min-w-max gap-1 xl:min-w-0 xl:flex-col">
              {PRODUCT_WORKSPACES.map(workspace => {
                const WorkspaceIcon = workspace.icon;
                const active = activeSection === workspace.id;
                return <Fragment key={workspace.id}>
                  {workspace.id === 'product-data' && <div className="hidden items-center gap-2 px-3 pb-1 pt-4 xl:flex"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Product Master</p><ProductWorkspaceHelp scope="master" /></div>}
                  {workspace.id === 'distribution' && <div className="hidden items-center gap-2 px-3 pb-1 pt-4 xl:flex"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Shop listings</p><ProductWorkspaceHelp scope="listings" /></div>}
                  {workspace.id === 'activity' && <div className="mx-3 my-3 hidden border-t xl:block" />}
                  <button type="button" disabled={isHistorical && workspace.id !== 'activity'} onClick={() => selectWorkspace(workspace.id)} aria-current={active ? 'page' : undefined} className={cn('flex min-h-12 items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40 xl:w-full', active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground')}>
                  <WorkspaceIcon className="size-4 shrink-0" />
                  <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{workspace.label}</span></span>
                </button></Fragment>;
              })}
            </div>
          </nav>

          {/* Left Column */}
          <fieldset data-editor-fields disabled={!canWrite && activeSection !== 'activity' && activeSection !== 'overview'} className={cn('flex min-w-0 flex-col', activeSection === 'overview' ? 'gap-3' : 'gap-5')}>

            {/* Locale Context Banner — shown when editing a secondary locale */}
            {contentLocale !== primaryLocale && activeSection === 'product-data' && (() => {
              const localeConfig = activeOrgLocales.find(l => l.locale === contentLocale);
              const nameOk = Boolean(displayedProductName);
              const descOk = Boolean(richTextPlainText(displayedProductDescription));
              return (
                <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-primary/5 px-4 py-2.5 text-sm">
                  <Globe2 className="size-4 text-primary shrink-0" />
                  <span className="font-medium">
                    Editing {localeConfig?.label ?? contentLocale} translation
                  </span>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className={nameOk ? 'text-emerald-600' : 'text-amber-600'}>
                      {nameOk ? '✓' : '○'} Name
                    </span>
                    <span className="opacity-40">·</span>
                    <span className={descOk ? 'text-emerald-600' : 'text-amber-600'}>
                      {descOk ? '✓' : '○'} Description
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => selectContentLocale(primaryLocale)}
                    className="ml-auto flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <ArrowLeft className="size-3" /> Back to {primaryLocaleConfig?.nativeLabel ?? 'primary'}
                  </button>
                  <button type="button" onClick={() => setMobileReferenceOpen(open => !open)} className="w-full text-left text-xs font-medium text-primary sm:hidden">
                    {mobileReferenceOpen ? 'Hide primary-language reference' : 'Show primary-language reference'}
                  </button>
                </div>
              );
            })()}


            {activeSection === 'overview' ? <>
              <ProductOverviewSnapshot key={`snapshot-${existingProduct?.id ?? 'new-master'}`}
                name={form.name} images={images} imageAltTexts={imageAltTexts} brand={form.brand} category={form.category}
                productStructure={form.has_variants ? `${selectedVariantItems.length} variants` : 'Single product'}
                stock={formatLocalizedNumber(locale, totalStock)}
                price={num(form.retail_price) > 0 ? `${formatLocalizedNumber(locale, num(form.retail_price))} ${form.price_currency}` : 'Not configured'}
                listingCount={existingProduct?.channels.length ?? 0}
                channelCount={new Set(existingProduct?.channels.map(listing => listing.channel) ?? []).size}
                translations={activeOrgLocales.filter(item => !item.isPrimary).map(item => ({ locale: item.locale, label: item.nativeLabel, status: getLocaleCompletionStatus(item) as 'complete' | 'partial' | 'missing' }))}
                imported={Boolean(existingProduct?.import_result)} source={existingProduct?.import_source}
                onCommerce={() => selectWorkspace('commerce')} onListings={() => selectWorkspace('distribution')} onProductData={() => selectWorkspace('product-data')}
                onSelectLocale={nextLocale => selectContentLocale(nextLocale, true)}
                onReviewImportedLinks={!isHistorical && existingProduct?.import_result === 'needs_review' ? () => navigate('/products/master-catalog?review=links') : undefined}
              />
              {!isArchived && !allRequirementsComplete && <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                <p className="flex items-center gap-2 text-xs"><CircleAlert aria-hidden="true" className="size-4 shrink-0 text-amber-500" />{completionChecks.filter(check => !check.done).length} Master details need attention</p>
                <Button type="button" size="sm" variant="ghost" onClick={() => setReadinessReviewOpen(true)}>Review missing details<ChevronRight className="size-4" /></Button>
              </div>}
              <ProductSalesPerformance key={`sales-${existingProduct?.id ?? 'new-master'}`} product={existingProduct} showDemoInitially={Boolean(existingProduct && isDemoProduct(existingProduct.id))} onReviewChannels={() => selectWorkspace('distribution')} />
            </> : null}

            {/* Product media belongs to the canonical master and is prepared before channel distribution. */}
            {activeSection === 'product-data' ? <Card id="product-media-panel" tabIndex={-1} className="order-20">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-2 text-sm"><Image className="size-4 text-primary" />{copy.media}</CardTitle><p className="mt-1.5 text-xs leading-5 text-muted-foreground">Add and arrange the canonical images inherited by channel listings.</p></div><Badge variant="outline" className={cn(masterMedia.ready && 'border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300')}>{masterMedia.count} image{masterMedia.count === 1 ? '' : 's'} · {MIN_MASTER_IMAGES} required · 9 max</Badge></div>
              </CardHeader>
              <CardContent className="space-y-4">
                {images.length === 0 ? <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed bg-muted/20 px-6 py-8 text-center transition-colors hover:border-primary/40 hover:bg-muted/40 focus-within:ring-2 focus-within:ring-ring"><input type="file" accept="image/*" multiple className="sr-only" aria-label="Upload product images" onChange={async event => { const files = Array.from(event.target.files ?? []).slice(0, 9); for (const [index, file] of files.entries()) await handleImageUpload(file, index === 0 ? 'primary' : 'gallery'); event.target.value = ''; }} /><span className="grid size-11 place-items-center rounded-full bg-primary/10 text-primary"><Upload className="size-5" /></span><span className="mt-3 text-sm font-semibold">Upload product images</span><span className="mt-1 text-xs text-muted-foreground">Drop files here or browse · JPG, PNG · up to 9 images</span></label> : <><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{images.map((url, index) => <div key={`${url}:${index}`} className="group relative aspect-square overflow-hidden rounded-xl border bg-muted/20"><img src={url} alt={index === 0 ? copy.mainAlt : formatMessage(copy.additionalImageAlt, { index: index + 1 })} className="size-full object-cover" />{index === 0 ? <Badge className="absolute left-2 top-2 gap-1"><Star className="size-3 fill-current" />Main</Badge> : <Button type="button" size="sm" variant="secondary" className="absolute bottom-2 left-2 h-7 px-2 text-[11px] opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100" onClick={() => { setImages(items => [items[index], ...items.filter((_, itemIndex) => itemIndex !== index)]); setImageAltTexts(items => [items[index] ?? '', ...items.filter((_, itemIndex) => itemIndex !== index)]); }}>Set as main</Button>}<button type="button" onClick={() => { setImages(items => items.filter((_, itemIndex) => itemIndex !== index)); setImageAltTexts(items => items.filter((_, itemIndex) => itemIndex !== index)); }} aria-label={`Remove image ${index + 1}`} className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-black/65 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100 group-focus-within:opacity-100"><X className="size-3.5" /></button></div>)}{images.length < 9 ? <label className="flex aspect-square min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-muted/20 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/40 focus-within:ring-2 focus-within:ring-ring"><input type="file" accept="image/*" multiple className="sr-only" aria-label="Add more product images" onChange={async event => { const files = Array.from(event.target.files ?? []).slice(0, 9 - images.length); for (const file of files) await handleImageUpload(file, 'gallery'); event.target.value = ''; }} /><Plus className="size-5" /><span>Add images</span></label> : null}</div><p className="text-[11px] text-muted-foreground">The first image is the main image. Images appear in this order on supported channels.</p></>}
                {images.length > 0 ? <details className="group rounded-lg border"><summary className="flex min-h-11 cursor-pointer list-none items-center px-4 text-sm font-medium">Image accessibility text<Badge variant="outline" className="ml-auto">{images.length}</Badge><ChevronRight className="ml-2 size-4 transition-transform group-open:rotate-90" /></summary><div className="space-y-2 border-t p-4">{images.map((url, index) => <div key={`${url}:${index}-distribution-alt`} className="flex items-center gap-3"><img src={url} alt="" className="size-10 rounded-md border object-cover" /><Input value={imageAltTexts[index] ?? ''} maxLength={125} onChange={event => setImageAltTexts(current => { const next = [...current]; next[index] = event.target.value; return next; })} placeholder={`Describe image ${index + 1}`} aria-label={`Alt text for image ${index + 1}`} className="h-9 text-xs" /></div>)}</div></details> : null}
              </CardContent>
            </Card> : null}

            {/* Sales Channels */}
            <Card id="product-section-channels" tabIndex={-1} className={cn('border-primary/20', activeSection !== 'distribution' && 'hidden')}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><CardTitle className="flex items-center gap-2 text-sm"><Globe2 className="size-4 text-primary" />Channel listings{hasDemoListingData && <Badge variant="outline" className="font-normal text-muted-foreground">Demo data</Badge>}</CardTitle><p className="mt-1.5 text-xs leading-5 text-muted-foreground">Manage data sync between this Master and your shop listings.</p></div>
                  <div className="flex flex-wrap gap-2">
                    {canWrite && hasAvailableChannelToCreate ? <TooltipProvider delayDuration={150}><Tooltip><TooltipTrigger asChild><span className={cn('inline-flex', !masterReadyForListings && 'cursor-not-allowed')} tabIndex={!masterReadyForListings ? 0 : undefined}><Button type="button" variant="outline" aria-disabled={!masterReadyForListings} tabIndex={!masterReadyForListings ? -1 : undefined} className={cn(!masterReadyForListings && 'pointer-events-none !border-border !bg-muted !text-muted-foreground !shadow-none')} disabled={!masterReadyForListings} onClick={!existingProduct || isDirty ? saveAndOpenChannelListingSetup : openChannelListingSetup}><Plus className="size-4" />Create listing</Button></span></TooltipTrigger>{!masterReadyForListings ? <TooltipContent side="bottom" className="max-w-72"><p className="font-medium">Cannot create a listing yet</p><p className="mt-1 text-xs text-muted-foreground">Complete the required Master data first: {firstMissingMasterListingCheck?.label ?? 'required product information'}.</p></TooltipContent> : null}</Tooltip></TooltipProvider> : null}
                    {canWrite && <Button ref={linkExistingTrigger} type="button" disabled={!storedProduct} onClick={() => storedProduct && setLinkExistingMaster(structuredClone(storedProduct))}><Link2 className="size-4" />Link existing listings</Button>}
                  </div>
                </div>

              </CardHeader>
              <CardContent>
                {!isArchived && channelListingCount === 0 && !masterReadyForListings ? <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/[0.08] p-3 text-sm"><CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-500" /><div className="min-w-0 flex-1"><p className="font-semibold">Complete required Master data before creating or publishing listings</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Next required item: {firstMissingMasterListingCheck?.label ?? 'Complete Product Master data'}.</p><Button type="button" variant="link" size="sm" className="mt-1 h-auto p-0 text-amber-600" onClick={() => firstMissingMasterListingCheck && openCompletionItem(firstMissingMasterListingCheck.id)}>Fix this requirement<ChevronRight className="size-3.5" /></Button></div></div> : null}
                {canWrite && !storedProduct ? <p className="mb-4 text-xs text-muted-foreground">Save this Master before linking existing listings.</p> : null}
                {!isArchived && channelListingCount === 0 && masterReadyForListings && (!existingProduct || isDirty) ? <div className="mb-4 flex items-start gap-3 rounded-lg border border-blue-500/25 bg-blue-500/[0.06] p-3 text-sm"><Info className="mt-0.5 size-4 shrink-0 text-blue-500" /><div><p className="font-semibold">Creating a listing saves your Master first</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Linking an existing listing uses the saved Master and keeps your unsaved edits here.</p></div></div> : null}
                {channelListingCount === 0 ? <div className="flex min-h-28 items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/20 px-4 text-center text-sm text-muted-foreground"><Radio className="size-5" /><div><strong className="block text-foreground">No channel listings configured</strong><p className="mt-1 text-xs">{isArchived ? 'No channel listings are linked to this archived product.' : 'Link a shop listing when you are ready. Master activation is managed separately.'}</p></div></div> : <>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-3 border-b pb-4 text-xs">
                    <div className="flex flex-wrap items-center gap-3"><span className="text-sm font-semibold">{channelListingCount} {channelListingCount === 1 ? 'listing' : 'listings'}</span><span className="text-muted-foreground">{masterSyncOnCount} sync on</span><span className="text-muted-foreground">{channelListingCount - masterSyncOnCount} sync off</span></div>
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">Product Master <ArrowRight className="size-3.5" aria-hidden="true" /> Shop listing</span>
                  </div>
                  <ProductChannelListings rows={[
                    ...configuredChannels.map((channel): ProductChannelListingRow => {
                      const override = channelOverrides[channel.key];
                      const listing = channel.listing;
                      const savedOverride = existingProduct?.channel_overrides?.[channel.key];
                      const recordedData = configuredShopData.get(channel.key)!.data;
                      const data = listing ? listingDraftTableData(listing, recordedData) : recordedData;
                      const preference = listingMasterSync(listing, savedOverride);
                      const shop = data.shop || channel.account || channel.label;
                      return {
                        id: 'configured-' + channel.key, channelKey: channel.key, channelLabel: channel.label,
                        shop, sku: data.sku || override.listing_sku || 'Not recorded',
                        context: listing?.local_draft ? 'Local draft · Not sent to shop' : data.retrievedAt ? 'Shop data retrieved: ' + formatSyncRecord(data.retrievedAt) : undefined,
                        price: <ListingShopValue data={data} field="price" />,
                        stock: <ListingShopValue data={data} field="stock" />,
                        status: <ListingMasterSyncControl preference={preference} shop={shop} disabled={!canWrite || !listing} disabledReason={!listing ? 'Save the listing first' : isArchived ? 'Archived Master' : undefined} onOpen={() => listing && openListingSyncSettings(listing, shop, data.sku || override.listing_sku || 'Not recorded', preference)} />,
                        actions: listing ? listingActions(listing, channel.label, shop, data.sku || override.listing_sku || 'Not recorded')
                          : <Button type="button" variant="outline" size="sm" className="mr-[52px] h-11 w-28" disabled={!canWrite} onClick={() => setEditingChannel(channel.key)}>Continue setup</Button>,
                      };
                    }),
                    ...linkedOnlyListings.map((listing, index): ProductChannelListingRow => {
                      const channel = OVERRIDE_CHANNELS.find(item => listingChannelByOverride[item.key] === listing.channel)!;
                      const data = listingDraftTableData(listing, resolveListingShopData(existingProduct!, listing, importListingSnapshots));
                      const shop = data.shop || 'Shop not recorded';
                      const sku = data.sku || 'Not recorded';
                      const preference = listingMasterSync(listing);
                      return {
                        id: 'linked-' + JSON.stringify([listing.channel, listing.store_name, listing.external_id, index]),
                        channelKey: channel.key, channelLabel: channel.label, shop, sku,
                        newlyLinked: newLinkedKeys.includes(listingActivityKey(listing)),
                        context: listing.local_draft ? 'Local draft · Not sent to shop' : data.retrievedAt ? 'Shop data retrieved: ' + formatSyncRecord(data.retrievedAt) : undefined,
                        price: <ListingShopValue data={data} field="price" />,
                        stock: <ListingShopValue data={data} field="stock" />,
                        status: <ListingMasterSyncControl preference={preference} shop={shop} disabled={!canWrite} disabledReason={isArchived ? 'Archived Master' : undefined} onOpen={() => openListingSyncSettings(listing, shop, sku, preference)} />,
                        actions: listingActions(listing, channel.label, shop, sku),
                      };
                    }),
                  ]} />
                  <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">{hasDemoListingData ? 'Includes sample values. ' : 'Last recorded listing values. '}No live shop updates.</p>
                </>}
              </CardContent>
            </Card>

            {SHOW_PRODUCT_ASSOCIATIONS && activeSection === 'distribution' ? <Card id="product-associations">
              <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><Boxes className="size-4 text-primary" />Associations</CardTitle><p className="text-xs leading-5 text-muted-foreground">Connect related, accessory, replacement or upsell Product Masters.</p></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2 sm:grid-cols-[140px_minmax(0,1fr)_auto]">
                  <select aria-label="Association type" value={associationType} onChange={event => setAssociationType(event.target.value as ProductAssociation['type'])} className="h-9 rounded-md border border-input bg-background px-3 text-sm"><option value="related">Related</option><option value="accessory">Accessory</option><option value="replacement">Replacement</option><option value="upsell">Upsell</option></select>
                  <select aria-label="Product to associate" value={associationProductId} onChange={event => setAssociationProductId(event.target.value)} className="h-9 min-w-0 rounded-md border border-input bg-background px-3 text-sm"><option value="">Select Product Master</option>{associationCandidates.filter(product => !associations.some(item => item.productId === product.id)).map(product => <option key={product.id} value={product.id}>{product.name} · {product.sku_code}</option>)}</select>
                  <Button type="button" disabled={!associationProductId} onClick={() => { setAssociations(current => [...current, { productId: associationProductId, type: associationType }]); setAssociationProductId(''); }}><Plus className="size-4" />Add</Button>
                </div>
                {associations.length ? <div className="divide-y overflow-hidden rounded-lg border">{associations.map(association => { const product = associationCandidates.find(item => item.id === association.productId); return <div key={association.productId} className="flex min-h-14 items-center gap-3 p-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{product?.name ?? association.productId}</p><p className="text-xs text-muted-foreground"><span className="capitalize">{association.type}</span>{product ? ` · ${product.sku_code}` : ''}</p></div><Button type="button" variant="ghost" size="icon" aria-label={`Remove association ${product?.name ?? association.productId}`} onClick={() => setAssociations(current => current.filter(item => item.productId !== association.productId))}><Trash2 className="size-4" /></Button></div>; })}</div> : <div className="rounded-lg border border-dashed p-5 text-center"><p className="text-sm font-medium">No associated products</p><p className="mt-1 text-xs text-muted-foreground">Associations are optional and do not block publishing.</p></div>}
              </CardContent>
            </Card> : null}

            {activeSection === 'product-data' ? <Card id="product-structure-choice">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm"><Boxes className="size-4 text-primary" />Product structure</CardTitle>
                <p className="text-xs leading-5 text-muted-foreground">Choose whether this Product Master represents one sellable SKU or a family of variant SKUs before completing its attributes.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Product structure">
                  {([
                    { type: 'single', title: 'Single product', description: 'One SKU with one price, stock record and attribute value.' },
                    { type: 'variant', title: 'Product with variants', description: 'Multiple SKUs by Color, Size or another option.' },
                  ] as const).map(option => {
                    const TypeIcon = PRODUCT_TYPE_ICONS[option.type];
                    const selected = form.product_type === option.type;
                    return <button key={option.type} type="button" role="radio" aria-checked={selected} onClick={() => handleProductTypeChange(option.type)} className={`min-h-20 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${selected ? 'border-primary bg-primary/5' : 'hover:border-primary/30 hover:bg-muted/30'}`}>
                      <span className="flex items-start gap-3"><span className={`grid size-8 shrink-0 place-items-center rounded-md ${selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}><TypeIcon className="size-4" /></span><span><span className="flex items-center gap-2 text-sm font-semibold">{option.title}{selected ? <Check className="size-4 text-primary" /> : null}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{option.description}</span></span></span>
                    </button>;
                  })}
                </div>
              </CardContent>
            </Card> : null}

            {/* Basic information */}
            <Card id="product-section-basic" tabIndex={-1} className={cn(activeSection !== 'product-data' && 'hidden')}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm"><Package className="size-4 text-primary" />Basic information</CardTitle>
                <p className="text-xs leading-5 text-muted-foreground">Core identity, category and customer-facing product information.</p>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
                  <div className="sm:col-span-6">
                    <Field label={copy.skuCode} required error={errors.sku_code}>
                      <div className="relative">
                        <Input
                          id="product-master-sku"
                          value={form.sku_code}
                          onChange={e => {
                            setSkuAutoSuggested(false); // user typing → clear auto-suggest flag
                            setField('sku_code', e.target.value.toUpperCase());
                          }}
                          placeholder={copy.skuPlaceholder}
                          className={cn('font-mono uppercase', masterSkuLocked && 'pr-9 bg-muted/30')}
                          readOnly={masterSkuLocked}
                          aria-readonly={masterSkuLocked}
                          aria-describedby={masterSkuLocked ? 'master-sku-lock-reason' : undefined}
                        />
                        {masterSkuLocked ? <Lock className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /> : null}
                      </div>
                      {masterSkuLocked
                        ? <div id="master-sku-lock-reason" className="flex flex-wrap items-center justify-between gap-1.5 text-xs"><span className="text-muted-foreground">Locked because linked records must be reviewed before changing it.</span><button type="button" onClick={openMasterSkuChange} className="font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Change Master SKU</button></div>
                        : existingProduct
                          ? <p className="text-xs text-muted-foreground">Editable while this draft has no inventory or channel listings.</p>
                          : skuAutoSuggested && form.sku_code
                            ? <div className="mt-1 flex items-center justify-between gap-2">
                                <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                  <span className="inline-block size-1.5 rounded-full bg-sky-400" />
                                  Auto-suggested from brand &amp; category — edit freely
                                </p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const s = suggestSku(form.brand, form.category);
                                    if (s) { setForm(f => ({ ...f, sku_code: s })); setSkuAutoSuggested(true); }
                                  }}
                                  className="text-[11px] font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none"
                                >
                                  Regenerate
                                </button>
                              </div>
                            : <p className="text-xs text-muted-foreground">Will auto-suggest when brand or category is set</p>}
                    </Field>
                  </div>
                  <div className={cn('sm:col-span-12 grid gap-3', contentLocale !== primaryLocale ? 'sm:grid-cols-2' : 'sm:grid-cols-1')}>
                    {/* en-US column — always visible; read-only when viewing a secondary locale */}
                    <div className={cn(contentLocale !== primaryLocale && !mobileReferenceOpen && 'hidden sm:block')}>
                    <Field
                      label={contentLocale !== primaryLocale ? `${copy.productName} · ${primaryLocaleConfig?.nativeLabel ?? 'Primary'} (reference)` : copy.productName}
                      required={contentLocale === primaryLocale}
                      error={contentLocale === primaryLocale ? errors.name : undefined}
                    >
                      <Input
                        id="product-name"
                        value={form.name}
                        onChange={e => contentLocale === primaryLocale ? updateProductName(e.target.value) : undefined}
                        readOnly={!canWrite || contentLocale !== primaryLocale}
                        placeholder={copy.namePlaceholder}
                        minLength={3}
                        maxLength={120}
                        className={cn(contentLocale !== primaryLocale && 'cursor-default bg-muted/30 text-muted-foreground')}
                        aria-readonly={contentLocale !== primaryLocale}
                      />
                      {contentLocale !== primaryLocale && (
                        <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Info className="size-3" /> Switch to {primaryLocaleConfig?.nativeLabel ?? 'the primary language'} to edit
                        </p>
                      )}
                    </Field>
                    </div>

                    {/* Secondary locale column — only visible when not en-US */}
                    {contentLocale !== primaryLocale && (() => {
                      const localeLabel = activeOrgLocales.find(l => l.locale === contentLocale)?.nativeLabel ?? contentLocale;
                      return (
                        <Field label={`${copy.productName} · ${localeLabel}`}>
                          <Input
                            id="localized-product-name"
                            autoFocus={focusTranslationField === 'name'}
                            onFocus={() => setFocusTranslationField(null)}
                            value={displayedProductName}
                            onChange={e => updateProductName(e.target.value)}
                            placeholder={form.name || copy.namePlaceholder}
                            maxLength={120}
                          />
                          {displayedProductName ? (
                            <p className="mt-1 flex items-center gap-1 text-[11px] text-emerald-600">
                              <CircleCheck className="size-3" /> Translation complete
                            </p>
                          ) : (
                            <p className="mt-1 flex items-center gap-1.5 text-[11px] text-amber-600">
                              <AlertTriangle className="size-3 shrink-0" />
                              Empty — &ldquo;{form.name || '…'}&rdquo; used as fallback
                            </p>
                          )}
                        </Field>
                      );
                    })()}
                  </div>

                  <div className="sm:col-span-6">
                    <Field label={copy.category} required error={errors.category}>
                      <Button id="product-category-trigger" type="button" variant="outline" className="w-full justify-between font-normal" onClick={() => { setPendingCategory(selectedCatalogCategory?.id ?? ''); setCategoryReviewOpen(false); setCategoryOpen(true); }} aria-haspopup="dialog"><span className={form.category ? '' : 'text-muted-foreground'}>{selectedCatalogCategory?.name || form.category || copy.selectCategory}</span><ChevronRight className="size-4 rotate-90" /></Button>
                      {selectedCatalogCategory ? <p className="text-xs text-muted-foreground">{categoryPath.join(' / ')}</p> : null}
                      {form.category && !selectedCatalogCategory ? <p className="text-xs text-destructive">Select a category again to confirm its identity. Existing attribute values are preserved.</p> : null}
                    </Field>
                  </div>
                  <div className="sm:col-span-6">
                    <Field label="Default condition">
                      <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={form.condition} onChange={e => setField('condition', e.target.value)}>
                        {CONDITIONS.map(c => <option key={c} value={c}>{conditionLabels[c as keyof typeof conditionLabels]}</option>)}
                      </select>
                    </Field>
                  </div>
                  <div className={cn('sm:col-span-12 grid gap-3', contentLocale !== primaryLocale ? 'sm:grid-cols-2' : 'sm:grid-cols-1')}>
                    {/* en-US reference column */}
                    <div className={cn(contentLocale !== primaryLocale && !mobileReferenceOpen && 'hidden sm:block')}>
                    <Field
                      label={contentLocale !== primaryLocale ? `${copy.description} · ${primaryLocaleConfig?.nativeLabel ?? 'Primary'} (reference)` : copy.description}
                      required={contentLocale === primaryLocale}
                    >
                      <RichTextEditor
                        id="product-description"
                        value={form.description}
                        onChange={value => { if (contentLocale === primaryLocale) updateProductDescription(value); }}
                        readOnly={!canWrite || contentLocale !== primaryLocale}
                        placeholder={copy.descriptionPlaceholder}
                      />
                      {contentLocale !== primaryLocale
                        ? <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground"><Info className="size-3" /> Switch to {primaryLocaleConfig?.nativeLabel ?? 'the primary language'} to edit</p>
                        : null}
                    </Field>
                    </div>
                    {/* Secondary locale column */}
                    {contentLocale !== primaryLocale && (() => {
                      const localeLabel = activeOrgLocales.find(l => l.locale === contentLocale)?.nativeLabel ?? contentLocale;
                      return (
                        <Field label={`${copy.description} · ${localeLabel}`}>
                      <RichTextEditor
                        id="localized-product-description"
                        readOnly={!canWrite}
                        autoFocus={focusTranslationField === 'description'}
                        onFocus={() => setFocusTranslationField(null)}
                        value={displayedProductDescription}
                        onChange={updateProductDescription}
                        placeholder={richTextPlainText(form.description) || copy.descriptionPlaceholder}
                      />
                          {richTextPlainText(displayedProductDescription) ? (
                            <p className="mt-1 flex items-center gap-1 text-[11px] text-emerald-600">
                              <CircleCheck className="size-3" /> Translation complete
                            </p>
                          ) : (
                            <p className="mt-1 flex items-center gap-1.5 text-[11px] text-amber-600">
                              <AlertTriangle className="size-3 shrink-0" />
                              Empty — {primaryLocaleConfig?.nativeLabel ?? 'primary'} description used as fallback
                            </p>
                          )}
                        </Field>
                      );
                    })()}
                  </div>
                </div>
                <div className="grid grid-cols-1 items-start gap-4 border-t pt-5 sm:grid-cols-2">
                  <Field label="Brand">
                    <div id="product-brand-field" tabIndex={-1} className="rounded-md"><BrandReferencePicker brands={catalogBrands} brandId={form.brandId} brandName={form.brand} onSelect={brand => setForm(current => ({ ...current, brand: brand?.name ?? '', brandId: brand?.id ?? '' }))} onCreate={createCanonicalBrand} /></div>
                  </Field>

                  <Field label="GTIN / Barcode">
                    <Input id="product-gtin" value={form.gtin} onChange={e => setField('gtin', e.target.value)} placeholder={copy.gtinPlaceholder} inputMode="numeric" />
                    {/* In production: GTIN shares a uniqueness namespace with EAN, UPC, ISBN and JAN — no two products can use the same code across any of these types */}
                    <p className="text-[10px] text-muted-foreground/60">Shares namespace with EAN · UPC · ISBN · JAN</p>
                  </Field>
                </div>
                <div className="overflow-hidden rounded-lg border">
                  <button type="button" aria-expanded={advancedIdentityOpen} onClick={() => setAdvancedIdentityOpen(open => !open)} className="flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm font-medium transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"><ChevronDown className={cn('size-4 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none', advancedIdentityOpen ? 'rotate-180' : '')} /><span>More identifiers</span><span className="ml-auto text-xs font-normal text-muted-foreground">Manufacturer, MPN and model</span></button>
                  {advancedIdentityOpen ? <div className="grid grid-cols-1 gap-4 border-t bg-muted/10 p-4 md:grid-cols-3"><Field label="Manufacturer"><Input value={form.manufacturer} onChange={e => setField('manufacturer', e.target.value)} placeholder={copy.manufacturerPlaceholder} /></Field><Field label="MPN"><Input value={form.mpn} onChange={e => setField('mpn', e.target.value)} placeholder={copy.mpnPlaceholder} /></Field><Field label="Model number"><Input value={form.model_number} onChange={e => setField('model_number', e.target.value)} placeholder={copy.modelPlaceholder} /></Field></div> : null}
                </div>
                {(categoryAttributesForProduct.length > 0 || retainedAttributes.length > 0) && <section className="mt-5 space-y-4 border-t pt-5" aria-labelledby="product-attributes-title">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><h3 id="product-attributes-title" className="text-sm font-semibold">Product attributes</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Fields are loaded automatically from the selected category.</p></div>
                    {missingRequiredCategoryAttributes.length ? <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50">{missingRequiredCategoryAttributes.length} required {missingRequiredCategoryAttributes.length === 1 ? 'field' : 'fields'} missing</Badge> : requiredCategoryAttributes.length ? <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50">Required fields complete</Badge> : null}
                  </div>
                  {retainedAttributes.length ? <details className="rounded-lg border bg-muted/10 p-4"><summary className="cursor-pointer text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring">Saved values outside this category ({retainedAttributes.length})</summary><p className="mt-2 text-xs text-muted-foreground">These values are kept, but are not required by the current category. They are restored if you switch back. Translations are also preserved.</p><dl className="mt-3 space-y-2">{retainedAttributes.map((spec, index) => <div key={`${spec.attributeKey ?? spec.name}-${index}`} className="grid gap-1 text-sm sm:grid-cols-2"><dt className="text-muted-foreground">{spec.name}</dt><dd className="break-words">{spec.value}</dd></div>)}</dl></details> : null}
                  {!form.category ? <div className="rounded-lg border border-dashed bg-muted/10 px-4 py-5 text-center"><p className="text-sm font-medium">Attributes will appear after selecting a category</p><p className="mt-1 text-xs text-muted-foreground">Use the Product category field above to load its required attributes.</p></div> : categoryAttributesForProduct.length ? <div className="divide-y overflow-hidden rounded-lg border">{categoryAttributesForProduct.map(attribute => { const spec = specificationForAttribute(attribute); const managedGroup = form.has_variants ? variantGroups.find(group => group.name.trim().toLowerCase() === attribute.name.trim().toLowerCase()) : undefined; const missingRequired = attribute.required && !spec?.value.trim() && !managedGroup?.values.length; return <div key={attribute.key} className="grid gap-3 p-4 sm:grid-cols-[minmax(150px,0.7fr)_minmax(0,1.3fr)] sm:items-start"><div><div className="flex items-center gap-2"><Label htmlFor={`product-attribute-${attribute.key}`} className="text-sm font-semibold">{attribute.name}</Label>{managedGroup ? <Badge variant="outline" className="border-primary/30 bg-primary/5 text-[10px] text-primary">Variant attribute</Badge> : attribute.required ? <span className="text-xs font-semibold text-destructive">Required</span> : <span className="text-xs text-muted-foreground">Optional</span>}</div><p className="mt-1 text-xs text-muted-foreground">{attribute.type}</p></div><div className="space-y-1.5" id={`product-attribute-${attribute.key}`}>{managedGroup ? <div className="flex min-h-10 flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2"><div><p className="text-sm font-medium">Managed by variants</p><p className="mt-0.5 text-xs text-muted-foreground">{managedGroup.values.length ? managedGroup.values.join(', ') : 'Add at least one value in Commerce'}</p></div><Button type="button" variant="ghost" size="sm" onClick={() => selectWorkspace('commerce')}>Manage variants<ChevronRight className="size-3.5" /></Button></div> : <><DynamicAttributeValueControl attribute={attribute} value={spec?.value ?? ''} onChange={nextValue => setSpecifications(current => current.map(item => item.attributeKey === attribute.key || (!item.attributeKey && item.name.toLowerCase() === attribute.name.toLowerCase()) ? { ...item, attributeKey: attribute.key, name: attribute.name, value: nextValue } : item))}  />{attribute.isLocalizable && contentLocale !== primaryLocale ? <div className="mt-2 space-y-2 rounded-lg border border-dashed border-primary/30 bg-primary/[0.03] p-3"><div className="flex flex-wrap items-center gap-2"><Globe2 className="size-3.5 text-primary" /><span className="text-xs font-semibold">{activeOrgLocales.find(locale => locale.locale === contentLocale)?.nativeLabel ?? contentLocale} translation</span><span className="ml-auto text-[11px] text-muted-foreground">{localizedContent[contentLocale]?.attributeValues?.[attribute.key]?.trim() ? 'Complete' : `Using ${primaryLocaleConfig?.nativeLabel ?? 'primary'} fallback`}</span></div><DynamicAttributeValueControl attribute={attribute} value={localizedContent[contentLocale]?.attributeValues?.[attribute.key] ?? ''} onChange={value => updateLocalizedAttributeValue(attribute.key, value)} />{!localizedContent[contentLocale]?.attributeValues?.[attribute.key]?.trim() && spec?.value.trim() ? <p className="text-[11px] leading-4 text-muted-foreground">Reference: {spec.value}</p> : null}</div> : null}{missingRequired ? <p className={cn('text-xs', hasPublishedRevision ? 'font-medium text-destructive' : 'text-muted-foreground')}>Needed to activate Master. You can save a draft without this value.</p> : attribute.required && attribute.validation ? <p className="text-xs text-muted-foreground">{attribute.validation}</p> : null}</>}</div></div>; })}</div> : <div className="rounded-lg border border-dashed bg-muted/10 px-4 py-5 text-center"><p className="text-sm font-medium">No additional attributes required</p><p className="mt-1 text-xs text-muted-foreground">This category does not require extra product information.</p></div>}

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4"><div><p className="text-xs font-medium">Attribute setup</p><p className="mt-1 text-xs text-muted-foreground">Changes open in Catalog Setup. Save there to return to this product.</p></div><DropdownMenu><DropdownMenuTrigger asChild><Button type="button" variant="outline" size="sm" disabled={!form.category || !canWrite}>Manage attribute setup<ChevronDown className="size-3.5" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-80"><DropdownMenuLabel>Manage {form.category || 'category'} attributes</DropdownMenuLabel>{categoryAttributesForProduct.filter(attribute => attribute.type === 'Single select' || attribute.type === 'Multi-select').map(attribute => <DropdownMenuItem key={attribute.key} className="min-h-14 items-start gap-3" onSelect={() => openAttributeSetup({ attribute: attribute.key })}><Tags className="mt-0.5 size-4 shrink-0 text-primary" /><span><span className="block font-medium">Edit {attribute.name} values</span><span className="mt-0.5 block text-xs leading-4 text-muted-foreground">Add or edit selectable values used across products.</span></span><ChevronRight className="ml-auto mt-0.5 size-3.5 shrink-0 text-muted-foreground" /></DropdownMenuItem>)}{categoryAttributesForProduct.some(attribute => attribute.type === 'Single select' || attribute.type === 'Multi-select') ? <DropdownMenuSeparator /> : null}<DropdownMenuItem className="min-h-14 items-start gap-3" onSelect={() => openAttributeSetup({ category: selectedCatalogCategory?.id ?? form.category })}><Layers className="mt-0.5 size-4 shrink-0 text-primary" /><span><span className="block font-medium">Manage attributes for {form.category}</span><span className="mt-0.5 block text-xs leading-4 text-muted-foreground">Assign fields and set which ones are required.</span></span><ChevronRight className="ml-auto mt-0.5 size-3.5 shrink-0 text-muted-foreground" /></DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>
                </section>}
              </CardContent>
            </Card>



            {/* Variant setup and pricing */}
            <Card id="product-section-pricing" tabIndex={-1} className={cn('order-1', activeSection !== 'commerce' && 'hidden')}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm"><Layers className="size-4 text-primary" />Pricing &amp; Inventory</CardTitle>
                <p className="text-xs leading-5 text-muted-foreground">{form.has_variants ? 'Manage variants, pricing and stock for this product.' : <>Manage pricing and stock for SKU <span className="break-all font-mono text-foreground">{form.sku_code || 'Not assigned'}</span>.</>}</p>
              </CardHeader>
              <CardContent className="space-y-5">
                {form.has_variants ? <section className="space-y-4" aria-labelledby="variant-attributes-title">
                  <div className="flex items-start justify-between gap-3"><div><h3 id="variant-attributes-title" className="text-sm font-semibold">Variants</h3><p className="mt-1 text-xs text-muted-foreground">Select the Color, Size or other category values that create sellable SKUs.</p></div><span className="shrink-0 text-xs tabular-nums text-muted-foreground">{variantGroups.length} of 2</span></div>
                  <VariantSection
                    groups={variantGroups}
                    onGroupsChange={setVariantGroups}
                    items={variantItems}
                    onItemsChange={setVariantItems}
                    parentSku={form.sku_code}
                    basePrice={String(num(form.retail_price) || '')}
                    currency={form.price_currency}
                    existingSkus={existingSkuList}
                    availableAttributes={allSelectableVariantAttributes.map(attribute => ({ key: attribute.key, name: attribute.name, options: attribute.options.split(',').map(option => option.trim()).filter(Boolean) }))}
                    onAttributeValueAdded={addCatalogAttributeValue}
                    onVariantAttributeAdded={notifyVariantAttributeSelected}
                    copy={{
                      duplicateAttribute: copy.duplicateAttribute,
                      addValuePlaceholder: copy.addValuePlaceholder,
                      add: copy.add,
                      addGroupPlaceholder: copy.addGroupPlaceholder,
                      addAttribute: copy.addAttribute,
                      cancel: copy.cancel,
                      addVariantAttribute: copy.addVariantAttribute,
                      variantsWillBeCreated: copy.variantsWillBeCreated,
                      selectAll: copy.selectAll,
                      variant: copy.variant,
                      skuCode: copy.skuCode,
                      price: copy.price,
                      stock: copy.stock,
                      skuExists: copy.skuExists,
                    }}
                    warehouses={WAREHOUSES}
                    stockControlled={Boolean(existingProduct)}
                    renderStock={renderControlledStock}
                    listingInventorySources={listingInventorySources}
                    onConfigureInventorySources={() => selectWorkspace('distribution')}
                  />
                </section> : null}

                {!form.has_variants ? <section className="space-y-4 border-t pt-5" aria-labelledby="product-pricing-title">
                  <div className="flex items-center gap-2">
                    <h3 id="product-pricing-title" className="text-sm font-semibold">Pricing</h3>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">Canonical</span>
                    <span className="text-[11px] text-muted-foreground">· Source of truth for all channels</span>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
                  <div className="sm:col-span-4">
                  <Field label="Cost price">
                    <Input value={form.original_price} onChange={e => setField('original_price', e.target.value)} placeholder="0" type="number" />
                  </Field>
                  </div>
                  <div className="sm:col-span-4">
                  <Field label="Selling price">
                    <Input value={form.retail_price} onChange={e => setField('retail_price', e.target.value)} placeholder="0" type="number" />
                  </Field>
                  </div>
                  <div className="sm:col-span-2"><Field label="Currency"><select className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={form.price_currency} onChange={e => setField('price_currency', e.target.value)}>{CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}</select></Field></div>
                  <div className="flex items-end sm:col-span-2"><div className="flex h-9 w-full items-center justify-between rounded-md bg-muted/40 px-3 text-xs"><span className="text-muted-foreground">{copy.margin}</span><strong className="tabular-nums">{(() => { const retail = num(form.retail_price); const original = num(form.original_price); return retail > 0 ? `${(((retail - original) / retail) * 100).toFixed(1)}%` : '—'; })()}</strong></div></div>
                  </div>
                  {num(form.retail_price) > 0 ? <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-muted/30 px-3 py-2 text-xs"><span className="text-muted-foreground">Estimated profit</span><strong className="tabular-nums">{formatLocalizedNumber(locale, Math.max(0, num(form.retail_price) - num(form.original_price)))} {form.price_currency}</strong><span className="text-muted-foreground">before fees and channel adjustments</span></div> : null}
                </section> : null}

                {/* ── Inventory by location ───────────────────────────────── */}
                {!form.has_variants ? <section className="space-y-3 border-t pt-5" aria-labelledby="inventory-title">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 id="inventory-title" className="text-sm font-semibold">Inventory by location</h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">{existingProduct ? 'Locations with recorded stock, including zero. Each change is saved in adjustment history.' : 'Set the initial stock at each warehouse for this SKU.'}</p>
                    </div>
                    {existingProduct && canWrite && availableStockLocations.length > 0 && <Button type="button" variant="outline" size="sm" className="min-h-9 shrink-0" onClick={openAddStockLocation}><Plus className="size-3.5" />Add stock location</Button>}
                  </div>
                  {inventoryLocations.length ? <div className="overflow-hidden rounded-lg border">
                    {inventoryLocations.map((warehouse, idx) => (
                      <div key={warehouse.id} className={cn('grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4', idx < inventoryLocations.length - 1 && 'border-b')}>
                        <div>
                          <p className="text-sm font-medium">{warehouse.label}</p>
                          <p className="text-[11px] text-muted-foreground">{warehouse.code}</p>
                        </div>
                        {existingProduct ? renderControlledStock(warehouse.id) : <div className="flex items-center gap-2">
                          <Input
                            aria-label={`${warehouse.label} available stock`}
                            value={inventory[warehouse.id] ?? '0'}
                            onChange={event => setInventory(current => ({ ...current, [warehouse.id]: event.target.value }))}
                            type="number" min="0"
                            className="h-8 text-right font-mono text-xs"
                          />
                          <span className="shrink-0 text-xs text-muted-foreground">{copy.units}</span>
                        </div>}
                      </div>
                    ))}
                    <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-2.5 text-sm">
                      <span className="text-muted-foreground">{existingProduct ? 'Total recorded stock' : copy.totalStock}</span>
                      <strong className="tabular-nums">{formatLocalizedNumber(locale, existingProduct ? recordedStockTotal : totalStock)} {copy.units}</strong>
                    </div>
                  </div> : <div className="rounded-lg border border-dashed px-4 py-6 text-center"><p className="text-sm font-medium">No stock recorded yet</p><p className="mt-1 text-xs text-muted-foreground">{canWrite && availableStockLocations.length ? 'Add a stock location to record this product’s first count.' : 'Stock will appear here once recorded.'}</p></div>}
                </section> : null}


              </CardContent>
            </Card>


            {/* Shipping & Logistics */}
            <Card id="product-section-shipping" tabIndex={-1} className={cn('order-30', activeSection !== 'product-data' && 'hidden')}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><Truck className="size-4 text-primary" />Shipping & Logistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <RowField label="Product measurements · Optional" fields={[
                  { label: 'Product length', value: form.prod_length, onChange: v => setField('prod_length', v), placeholder: '0', suffix: 'cm' },
                  { label: 'Product width', value: form.prod_width, onChange: v => setField('prod_width', v), placeholder: '0', suffix: 'cm' },
                  { label: 'Product height', value: form.prod_height, onChange: v => setField('prod_height', v), placeholder: '0', suffix: 'cm' },
                  { label: 'Net weight', value: form.prod_weight, onChange: v => setField('prod_weight', v), placeholder: '0', suffix: 'g' },
                ]} />
                <div className="flex items-center justify-between gap-3">
                  <div><Label>Shipping package</Label><p className="mt-1 text-xs text-muted-foreground">{shippingPackageRequired ? 'Required by the selected online sales channels for shipping rates and carrier labels.' : 'Required when publishing to a channel that calculates shipping rates.'}</p></div>
                  <select aria-label="Package weight unit" value={packageWeightUnit} onChange={event => setPackageWeightUnit(event.target.value as 'g' | 'kg')} className="h-8 rounded-md border border-input bg-background px-2 text-xs font-semibold"><option value="g">Grams (g)</option><option value="kg">Kilograms (kg)</option></select>
                </div>
                <RowField label="Package dimensions" fields={[
                  { label: 'Package length', value: form.pkg_length, onChange: v => setField('pkg_length', v), placeholder: '0', suffix: 'cm' },
                  { label: 'Package width', value: form.pkg_width, onChange: v => setField('pkg_width', v), placeholder: '0', suffix: 'cm' },
                  { label: 'Package height', value: form.pkg_height, onChange: v => setField('pkg_height', v), placeholder: '0', suffix: 'cm' },
                  { label: 'Shipping weight', value: packageWeightUnit === 'kg' && form.pkg_weight ? String(num(form.pkg_weight) / 1000) : form.pkg_weight, onChange: v => setField('pkg_weight', packageWeightUnit === 'kg' ? String(num(v) * 1000) : v), placeholder: '0', suffix: packageWeightUnit },
                ]} />
              </CardContent>
            </Card>

            {/* Trade & Compliance */}
            <Card id="product-section-more" className={cn('order-40', activeSection !== 'product-data' && 'hidden')}>
              <button type="button" aria-expanded={complianceOpen} onClick={() => setComplianceOpen(open => !open)} className="flex min-h-16 w-full items-center gap-3 px-6 text-left transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Info className="size-4" /></span>
                <span className="min-w-0"><span className="block text-sm font-semibold">Trade &amp; Compliance</span><span className="mt-0.5 block text-xs text-muted-foreground">Country of origin and customs data for cross-border listings.</span></span>
                {(form.country_of_origin || form.hs_code) ? <span className="ml-auto shrink-0 text-xs font-medium text-emerald-600">Configured</span> : <span className="ml-auto shrink-0 text-xs text-muted-foreground">Optional</span>}
                <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none', complianceOpen && 'rotate-180')} />
              </button>
              {complianceOpen ? <CardContent className="space-y-4 border-t pt-5">
                <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2 text-xs leading-5 text-muted-foreground">Complete these fields when publishing internationally. Channel readiness will request them only when a destination or category requires customs information.</div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={copy.countryOfOrigin}>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.country_of_origin} onChange={e => setField('country_of_origin', e.target.value)}>
                      <option value="">{copy.selectCountry}</option>
                      {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                  <Field label={copy.hsCode}>
                    <Input
                      value={form.hs_code}
                      onChange={e => setField('hs_code', e.target.value.toUpperCase())}
                      placeholder={copy.hsCodePlaceholder}
                      className="font-mono uppercase"
                    />
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {copy.hsCodeNote}
                    </p>
                  </Field>
                </div>
              </CardContent> : null}
            </Card>

            {activeSection === 'activity' && (existingProduct ? <ProductActivityHistory key={`${existingProduct.id}:${searchParams.get('historyChannel') ?? ''}:${searchParams.get('historyListing') ?? ''}:${selectedRevisionId ?? ''}`} product={existingProduct} showDemoInitially={isDemoProduct(existingProduct.id)} initialListingChannel={searchParams.get('historyChannel')} initialListingKey={searchParams.get('historyListing')} initialRevisionId={selectedRevisionId} /> : <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Save this Product Master to start recording activity.</CardContent></Card>)}
          </fieldset>

          {/* Right Column */}
          {showEditorSidebar && <fieldset data-editor-fields disabled={!canWrite} className="min-w-0 space-y-5 xl:sticky xl:top-20 xl:h-fit">


            {showReadinessPanel && <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-2 text-sm">{<CircleAlert className={cn('size-4', hasPublishedRevision ? 'text-amber-500' : 'text-muted-foreground')} aria-label={hasPublishedRevision ? 'Needs attention' : 'Details to complete'} />}Product readiness</CardTitle><p className="mt-1 text-xs leading-5 text-muted-foreground">Complete these details, then activate your Master. Listing setup can wait.</p></div><span className="text-xs font-semibold tabular-nums text-muted-foreground">{completionChecks.filter(check => check.done).length}/{completionChecks.length}</span></div>
                <Progress value={completion} className="mt-3 h-1.5" aria-label={`${completion}% of product requirements complete`} />
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-1">{completionChecks.filter(check => !check.done).map(check => { const workspace = completionWorkspaceFor(check.id); return <li key={check.id}><button type="button" onClick={() => openCompletionItem(check.id)} className="flex min-h-11 w-full items-start gap-2 rounded-md px-2 py-2 text-left text-xs leading-5 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className={cn('mt-1.5 size-2 shrink-0 rounded-full', hasPublishedRevision ? 'bg-amber-400' : 'bg-muted-foreground/60')} /><span className="min-w-0 flex-1"><span className="block text-[10px] font-semibold uppercase tracking-wide text-primary">{workspace.label}</span><span className="block">{check.label}</span></span><ChevronRight className="mt-2 size-3.5 shrink-0" /></button></li>; })}</ul>
                <Button type="button" variant="ghost" size="sm" className="w-full" onClick={() => setReadinessReviewOpen(true)}>View all readiness checks</Button>
              </CardContent>
            </Card>}

            {/* Media */}
            <Card id="product-media-panel-legacy" tabIndex={-1} className="hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Image className="size-4 text-primary" />
                  {copy.media}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">{copy.mainImage}</p>
                  {images[0] ? (
                    <div className="relative size-24 rounded-lg overflow-hidden border">
                      <img src={images[0]} alt={copy.mainAlt} className="w-full h-full object-cover" />
                      <button
                        onClick={() => { setImages(imgs => imgs.slice(1)); setImageAltTexts(items => items.slice(1)); }}
                        aria-label={copy.removeMainImage}
                        className="absolute top-1 right-1 size-5 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80 transition-colors"
                      >
                        <X className="size-3 text-white" />
                      </button>
                    </div>
                  ) : (
                    <label className="size-24 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={async e => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          await handleImageUpload(file, 'primary');
                          e.target.value = '';
                        }}
                      />
                      <div className="text-center">
                        <Upload className="size-4 mx-auto mb-0.5 opacity-40" />
                        <p className="text-[10px] text-muted-foreground">{copy.add}</p>
                      </div>
                    </label>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">{formatMessage(copy.additionalImages, { count: Math.max(0, images.length - 1) })}</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {images.slice(1).map((url, i) => (
                      <div key={`${url}:${i}`} className="relative aspect-square rounded-md overflow-hidden border">
                        <img
                          src={url}
                          alt={formatMessage(copy.additionalImageAlt, { index: i + 2 })}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => { setImages(imgs => imgs.filter((_, idx) => idx !== i + 1)); setImageAltTexts(items => items.filter((_, idx) => idx !== i + 1)); }}
                          aria-label={formatMessage(copy.removeAdditionalImage, { index: i + 2 })}
                          className="absolute top-1 right-1 size-4 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80 transition-colors"
                        >
                          <X className="size-2.5 text-white" />
                        </button>
                      </div>
                    ))}
                    {images.length - 1 < 9 ? <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-border bg-muted/30 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/50 focus-within:ring-2 focus-within:ring-ring">
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        aria-label="Add an additional product image"
                        onChange={async e => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          await handleImageUpload(file, 'gallery');
                          e.target.value = '';
                        }}
                      />
                      <Plus className="size-4" />
                      <span>{copy.add}</span>
                    </label> : null}
                  </div>
                  <p className={cn('mt-2 flex items-center gap-1.5 text-[11px]', masterMedia.ready ? 'text-emerald-600' : 'text-muted-foreground')}>
                    {masterMedia.ready ? <CircleCheck className="size-3.5" /> : <Circle className="size-3.5" />}
                    {masterMedia.ready ? 'Minimum image requirement met' : `Add at least ${MIN_MASTER_IMAGES} product image`}
                  </p>
                </div>
                {images.length > 0 ? <div className="space-y-2 border-t pt-3"><p className="text-xs font-medium">Image alt text</p>{images.map((url, index) => <div key={`${url}:${index}-alt`} className="flex items-center gap-2"><img src={url} alt="" className="size-8 rounded border object-cover" /><Input value={imageAltTexts[index] ?? ''} maxLength={125} onChange={event => setImageAltTexts(current => { const next = [...current]; next[index] = event.target.value; return next; })} placeholder={`Describe image ${index + 1}`} aria-label={`Alt text for image ${index + 1}`} className="h-8 text-xs" /></div>)}</div> : null}
              </CardContent>
            </Card>

          </fieldset>}
        </div>
      </div>

      <LinkedListingDetails detail={viewingLinkedListing} masterName={form.name} onClose={() => setViewingLinkedListing(null)} restoreFocus={() => linkedListingTrigger.current?.focus()} />
      {canWrite && linkExistingMaster && <LinkExistingListingsDialog
        master={linkExistingMaster}
        hasUnsavedMasterChanges={isDirty}
        onClose={() => setLinkExistingMaster(null)}
        restoreFocus={() => linkExistingTrigger.current?.focus()}
        onLinked={(result, previousVersion, sources) => {
          acknowledgeListingCommit(previousVersion);
          const addedKeys = (getProductById(result.productId)?.channels ?? []).filter(listing => sources.some(source => source.channel === listing.channel && source.storeName === listing.store_name && source.listingId === listing.external_id)).map(listingActivityKey);
          setNewLinkedKeys(addedKeys);
          setLinkExistingMaster(null);
          toast({ title: `${addedKeys.length} listing${addedKeys.length === 1 ? '' : 's'} linked`, description: result.reviewSaved ? 'Shop data is unchanged. Master sync is off; manage each listing to change it.' : 'Links were saved, but the review receipt could not be saved. Shop data is unchanged.' });
        }}
      />}
      {editingShopListing && <ShopListingEditor
        key={JSON.stringify([editingShopListing.listing.channel, editingShopListing.listing.store_name, editingShopListing.listing.external_id, editingShopListing.listing.shop_sku])}
        {...editingShopListing}
        onClose={() => setEditingShopListing(null)}
        restoreFocus={() => (linkedListingTrigger.current?.isConnected ? linkedListingTrigger.current : document.getElementById('product-section-channels'))?.focus()}
        onSave={(patch, snapshot, syncChange) => {
          if (!canWrite) throw new Error('You do not have permission to edit this listing.');
          const previousVersion = getProductById(editingShopListing.product.id)?.record_version;
          saveListingLocalDraft(editingShopListing.product.id, editingShopListing.listing, patch, snapshot, syncChange);
          acknowledgeListingCommit(previousVersion);
          setEditingShopListing(null);
          toast({ title: 'Listing changes saved', description: 'Saved locally for this listing only. Master unchanged; no update sent to the shop.' });
        }}
      />}

      <ChannelListingWizard
        open={!isArchived && channelListingWizardOpen}
        onOpenChange={setChannelListingWizardOpen}
        channels={creationChannels}
        drafts={channelListingDrafts}
        rakutenBrandName={rakutenBrandName}
        masterSku={form.sku_code}
        basePrice={num(form.retail_price)}
        baseCurrency={form.price_currency}
        productName={form.name}
        productCategory={form.category}
        availableStock={totalStock}
        imageCount={images.length}
        productType={form.product_type}
        localizedContent={localizedContent}
        onChange={(channel, patch) => setChannelListingDrafts(current => ({
          ...current,
          [channel]: { ...current[channel as OverrideChannel], ...patch },
        }))}
        onSubmitted={selectedDrafts => {
          if (!existingProduct || !canWrite) throw new Error('You do not have permission to create listings.');
          const previousVersion = creationVersion.current;
          const created = createChannelListingDrafts(existingProduct.id, selectedDrafts, previousVersion);
          acknowledgeListingCommit(previousVersion);
          setNewLinkedKeys(created.map(listingActivityKey));
          toast({ title: 'Listing drafts created', description: 'Existing listings and Master data are unchanged. No shop update sent.' });
        }}
      />

      {listingSyncSettings && <ListingMasterSyncDialog
        {...listingSyncSettings}
        onClose={() => setListingSyncSettings(null)}
        restoreFocus={() => (listingSyncTrigger.current?.isConnected ? listingSyncTrigger.current : document.getElementById('product-section-channels'))?.focus()}
        onSave={(preference, reviewedPlan) => {
          if (!canWrite) throw new Error('You do not have permission to change this listing.');
          const previousVersion = getProductById(listingSyncSettings.master.id)?.record_version;
          saveListingMasterSync(listingSyncSettings.master.id, listingSyncSettings.listing, preference, masterSyncSnapshot(listingSyncSettings.master), reviewedPlan);
          acknowledgeListingCommit(previousVersion);
          setListingSyncSettings(null);
          toast({ title: 'Sync settings saved', description: 'Preference saved for this listing only. No update was sent to the shop.' });
        }}
      />}

      <ChannelListingEditorDrawer
        syncSettings={editingListing && editingSyncPreference && existingProduct ? { preference: editingSyncPreference, master: existingProduct, listing: editingListing, onConfigure: () => {
          const channel = OVERRIDE_CHANNELS.find(channel => channel.key === editingChannel)!;
          const data = resolveListingShopData(existingProduct, editingListing, importListingSnapshots);
          openListingSyncSettings(editingListing, data.shop || channel.account || channel.label, data.sku || 'Not recorded', editingSyncPreference);
        } } : undefined}
        open={!isArchived && editingChannel !== null}
        onOpenChange={open => { if (!open) setEditingChannel(null); }}
        channel={editingChannel ? OVERRIDE_CHANNELS.find(channel => channel.key === editingChannel) ?? null : null}
        draft={editingChannel ? channelOverrides[editingChannel] : null}
        rakutenBrandName={rakutenBrandName}
        masterSku={form.sku_code}
        productName={form.name}
        basePrice={num(form.retail_price)}
        baseCurrency={form.price_currency}
        productVariants={listingEditorVariants}
        inventorySources={listingEditorInventorySources}
        masterImages={images}
        onUploadMasterImage={canWrite ? file => handleImageUpload(file, 'gallery') : undefined}
        uploadingImages={uploadingImageCount > 0}
        masterMissingItems={masterListingChecks.filter(check => !check.done)}
        onEditMaster={checkId => { setEditingChannel(null); openCompletionItem(checkId); }}
        masterPersisted={Boolean(existingProduct)}
        masterHasUnsavedChanges={isDirty}
        masterDataComplete={masterReadyForListings}
        masterBlockingReason={firstMissingMasterListingCheck?.label}
        onSaveMaster={() => handleSave(undefined, { navigateAfter: false })}
        onSave={patch => {
          if (!editingChannel) return;
          persistListingDrafts({ [editingChannel]: { ...channelOverrides[editingChannel], ...patch } });
          setChannelOverrides(current => ({
            ...current,
            [editingChannel]: { ...current[editingChannel], ...patch },
          }));
          toast({ title: 'Listing draft updated', description: 'The Product Master remains unchanged.' });
        }}
      />

      {stockAdjustment && existingProduct && <AdjustWarehouseStockDialog
        target={stockAdjustment}
        products={[stockAdjustment.product ?? existingProduct]}
        warehouses={addingStockLocation ? availableStockLocations : getWarehouses()}
        lockProduct
        initializeLocation={addingStockLocation}
        onClose={refreshAdjustedStock}
        onSaved={() => { refreshAdjustedStock(); toast({ title: addingStockLocation ? 'Stock location added' : 'Stock adjustment recorded', description: 'Stock updated. Your other product changes are still here.' }); }}
      />}

      <ConfirmDialog
        open={listingUnlinkTarget !== null}
        onOpenChange={open => { if (!open) setListingUnlinkTarget(null); }}
        title="Unlink listing from this Master?"
        description={<span className="space-y-3"><span className="block font-medium text-foreground">{listingUnlinkTarget?.shop} · {listingUnlinkTarget?.sku}</span><span className="block">Only this link and its Master sync will be removed. The listing stays on the shop. Master data and other listings are unchanged.</span><span className="block">A copy of the local listing data is retained in activity history.</span>{unlinkError && <span role="alert" className="block text-destructive">{unlinkError}</span>}</span>}
        confirmText="Unlink from Master"
        cancelText="Keep listing"
        variant="destructive"
        onConfirm={() => {
          if (!canWrite || !existingProduct || !listingUnlinkTarget) return;
          try {
            const previousVersion = getProductById(existingProduct.id)?.record_version;
            const key = unlinkListingFromMaster(existingProduct.id, listingUnlinkTarget.listing, listingUnlinkTarget.snapshot) as OverrideChannel | undefined;
            acknowledgeListingCommit(previousVersion);
            if (key) {
              setChannelOverrides(current => ({ ...current, [key]: { ...current[key], enabled: false } }));
              setChannelListingDrafts(current => ({ ...current, [key]: { ...current[key], enabled: false } }));
              if (baselineSnapshotRef.current) {
                const baseline = JSON.parse(baselineSnapshotRef.current);
                baseline.channelOverrides[key].enabled = false;
                baselineSnapshotRef.current = JSON.stringify(baseline);
              }
            }
            setListingUnlinkTarget(null);
            toast({ title: 'Listing unlinked', description: 'Removed this link only. No change was sent to the shop; local data is retained in history.' });
          } catch (error) { setUnlinkError(error instanceof Error ? error.message : 'Unable to unlink. Try again.'); }
        }}
      />


      <Dialog open={staleConflictOpen} onOpenChange={setStaleConflictOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>This product was updated elsewhere</DialogTitle><DialogDescription>Your editor is based on an older version. Review the latest record before deciding whether to keep your edits.</DialogDescription></DialogHeader>
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm"><strong>No changes were overwritten.</strong><p className="mt-1 text-xs leading-5 text-muted-foreground">Reload to use the latest Product Master, or keep your current form values and save them as a newer version.</p></div>
          <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" onClick={() => window.location.reload()}>Reload latest</Button><Button type="button" onClick={() => { setStaleConflictOpen(false); handleSave('draft', { navigateAfter: false, force: true }); }}>Keep my changes</Button></div>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <Dialog open={skuChangeOpen} onOpenChange={setSkuChangeOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Change Master SKU</DialogTitle>
            <DialogDescription>Review linked records before staging a new canonical SKU. Channel-specific SKUs will not be changed.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/20 p-3 text-sm">
              <div><span className="block text-xs text-muted-foreground">Current Master SKU</span><strong className="mt-1 block font-mono">{form.sku_code}</strong></div>
              <div><span className="block text-xs text-muted-foreground">Product status</span><strong className="mt-1 block capitalize">{existingProduct?.status ?? 'draft'}</strong></div>
            </div>
            <Field label="New Master SKU" required error={skuChangeError}>
              <Input autoFocus value={pendingMasterSku} onChange={event => { setPendingMasterSku(event.target.value.toUpperCase()); setSkuChangeError(''); }} placeholder="e.g. SKU-0002" className="font-mono uppercase" maxLength={30} />
            </Field>
            <section className="rounded-lg border p-3" aria-labelledby="sku-impact-title">
              <h3 id="sku-impact-title" className="text-sm font-semibold">Linked records to preserve</h3>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-md bg-muted/40 p-2"><strong className="block text-base tabular-nums">{existingProduct?.channels.length ?? 0}</strong><span className="text-[11px] text-muted-foreground">Channels</span></div>
                <div className="rounded-md bg-muted/40 p-2"><strong className="block text-base tabular-nums">{Object.values(inventory).filter(value => num(value) > 0).length}</strong><span className="text-[11px] text-muted-foreground">Warehouses</span></div>
                <div className="rounded-md bg-muted/40 p-2"><strong className="block text-base tabular-nums">{existingProduct?.skus.length ?? 0}</strong><span className="text-[11px] text-muted-foreground">Variants</span></div>
              </div>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">Inventory links and variants remain attached to this Product Master. Amazon, Shopee, Lazada and other Channel SKUs keep their current values.</p>
            </section>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm">
              <Checkbox checked={skuChangeConfirmed} onCheckedChange={checked => setSkuChangeConfirmed(checked === true)} className="mt-0.5" />
              <span><strong className="block">I reviewed the affected records</strong><span className="mt-1 block text-xs leading-5 text-muted-foreground">The change is staged first and is applied when this Product Master is saved.</span></span>
            </label>
          </div>
          <div className="flex justify-end gap-2 border-t pt-4"><Button variant="outline" onClick={() => setSkuChangeOpen(false)}>Cancel</Button><Button disabled={!skuChangeConfirmed || !pendingMasterSku.trim()} onClick={stageMasterSkuChange}>Stage SKU change</Button></div>
        </DialogContent>
      </Dialog>
      <Dialog open={categoryOpen} onOpenChange={setCategoryOpen}>
        <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
          <DialogHeader className="shrink-0 border-b p-5"><DialogTitle>{categoryReviewOpen ? 'Review category change' : 'Select product category'}</DialogTitle><DialogDescription>{categoryReviewOpen ? 'Review the fields before applying this change to your draft.' : 'Choose a stable product type. Use tags or collections for promotions and seasonal groups.'}</DialogDescription></DialogHeader>
          {categoryReviewOpen && pendingCategoryDiff ? <div className="min-h-0 space-y-4 overflow-y-auto p-5">
            <p className="text-sm"><span className="text-muted-foreground">{selectedCatalogCategory?.name || form.category || 'No category'}</span> → <strong>{pendingCatalogCategory?.name}</strong></p>
            <CategorySchemaChanges diff={pendingCategoryDiff} attributes={catalogSettings.attributes} specifications={specifications} />
            {pendingCategoryMissing.length ? <div className="rounded-lg border border-amber-500/30 p-4 text-sm"><p className="font-medium text-amber-700 dark:text-amber-300">{pendingCategoryMissing.length} required {pendingCategoryMissing.length === 1 ? 'field' : 'fields'} to complete</p><p className="mt-1">{pendingCategoryMissing.map(attribute => attribute.name).join(', ')}</p><p className="mt-2 text-xs text-muted-foreground">You can save a draft now and fill these fields before publishing.</p></div> : null}
            <p className="text-sm text-muted-foreground">Existing values and translations are kept. This change is staged until you save the Master. Live listings stay unchanged.</p>
          </div> : <div className="min-h-0 overflow-y-auto p-5">
            <div className="relative mb-4"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={categorySearch} onChange={event => setCategorySearch(event.target.value)} placeholder="Search categories..." className="pl-9" /></div>
            {categorySearch.trim() ? <div className="max-h-80 space-y-1 overflow-y-auto rounded-lg border p-2">{matchingCategoryPaths.map(item => <button key={item.leaf.id} type="button" aria-pressed={pendingCategory === item.leaf.id} onClick={() => { setCategoryLevelOne(item.group.id); setCategoryLevelTwo(item.subgroup.id); setPendingCategory(item.leaf.id); }} className={`flex min-h-11 w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring ${pendingCategory === item.leaf.id ? 'bg-primary/10 text-primary' : ''}`}><span>{item.group.label} / {item.subgroup.label} / <strong>{item.leaf.name}</strong></span>{pendingCategory === item.leaf.id ? <Check className="size-4" /> : null}</button>)}</div> : <div className="grid min-h-72 grid-cols-1 overflow-hidden rounded-lg border sm:grid-cols-3">
              <div className="border-b p-2 sm:border-b-0 sm:border-r">{categoryTree.map(group => <button key={group.id} type="button" onClick={() => { setCategoryLevelOne(group.id); setCategoryLevelTwo(group.children[0].id); }} className={`flex min-h-11 w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${categoryLevelOne === group.id ? 'bg-primary/10 font-semibold text-primary' : 'hover:bg-muted'}`}>{group.label}<ChevronRight className="size-4" /></button>)}</div>
              <div className="border-b p-2 sm:border-b-0 sm:border-r">{selectedCategoryGroup.children.map(group => <button key={group.id} type="button" onClick={() => setCategoryLevelTwo(group.id)} className={`flex min-h-11 w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${categoryLevelTwo === group.id ? 'bg-primary/10 font-semibold text-primary' : 'hover:bg-muted'}`}>{group.label}<ChevronRight className="size-4" /></button>)}</div>
              <div className="p-2">{selectedCategorySubgroup.children.map(category => <button key={category.id} type="button" aria-pressed={pendingCategory === category.id} onClick={() => setPendingCategory(category.id)} className={`flex min-h-11 w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${pendingCategory === category.id ? 'bg-primary/10 font-semibold text-primary' : 'hover:bg-muted'}`}>{category.name}{pendingCategory === category.id ? <Check className="size-4" /> : null}</button>)}</div>
            </div>}
          </div>}
          <div className="flex shrink-0 flex-wrap items-center gap-3 border-t p-5"><p className="mr-auto text-xs text-muted-foreground">Selected: <strong className="text-foreground">{pendingCatalogCategory?.name || 'None'}</strong></p>{categoryReviewOpen ? <Button variant="ghost" onClick={() => setCategoryReviewOpen(false)}>Back</Button> : null}<Button variant="outline" onClick={() => setCategoryOpen(false)}>Cancel</Button><Button disabled={!pendingCatalogCategory} onClick={() => { if (!categoryReviewOpen && form.category && pendingCategory !== selectedCatalogCategory?.id) setCategoryReviewOpen(true); else stageCategoryChange(); }}>{categoryReviewOpen ? 'Apply to draft' : 'Confirm Category'}</Button></div>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
        onConfirm={handleConfirmSwitch}
        title={copy.convertTitle}
        description={copy.convertDescription}
        confirmText={copy.convertConfirm}
        cancelText={copy.keepVariants}
        variant="destructive"
      />
      <Sheet open={!isArchived && readinessReviewOpen} onOpenChange={setReadinessReviewOpen}>
        <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
          <SheetHeader className="border-b pb-4">
            <SheetTitle>{allRequirementsComplete ? 'Product readiness checks' : 'Complete this product'}</SheetTitle>
            <SheetDescription>{allRequirementsComplete ? 'All required Master details are complete. Master activation and shop listings are managed separately.' : 'Readiness updates automatically as you complete each requirement. Your valid changes are saved as a draft.'}</SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-2 overflow-y-auto py-4" role="status">
            {completionChecks.map(check => (
              <button
                key={check.id}
                type="button"
                onClick={() => { setReadinessReviewOpen(false); openCompletionItem(check.id); }}
                className="flex min-h-12 w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors duration-150 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
              >
                {check.done ? <CircleCheck className="size-5 shrink-0 text-emerald-600" /> : <CircleAlert className="size-5 shrink-0 text-amber-600" />}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${check.done ? 'text-muted-foreground' : 'font-semibold text-foreground'}`}>{check.label}</p>
                </div>
                <ChevronRight className="ml-auto size-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" onClick={() => setReadinessReviewOpen(false)}>Close</Button>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={publishConfirmationOpen} onOpenChange={setPublishConfirmationOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{hasPublishedRevision ? "Update this Product Master?" : "Activate this Product Master?"}</DialogTitle><DialogDescription>{configuredChannelCount > 0 ? 'Choose whether the new canonical data should also be applied to your configured listing drafts.' : 'This makes the Product Master Active in your catalog. It does not publish to any sales channel. You can link channels later.'}</DialogDescription></DialogHeader>
          <div className="rounded-lg border bg-muted/30 p-4 text-sm"><div className="flex items-center justify-between"><span className="text-muted-foreground">Master SKU</span><strong className="font-mono">{form.sku_code}</strong></div></div>
          {configuredChannelCount > 0 && <div className="space-y-2" role="radiogroup" aria-label="Listing update behavior">
            <button type="button" role="radio" aria-checked={publishListingMode === 'master-only'} onClick={() => setPublishListingMode('master-only')} className={cn('flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', publishListingMode === 'master-only' ? 'border-primary bg-primary/5' : 'hover:bg-muted/30')}>
              <span className={cn('mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border', publishListingMode === 'master-only' && 'border-primary')}><span className={cn('size-2 rounded-full', publishListingMode === 'master-only' && 'bg-primary')} /></span>
              <span><strong className="block text-sm">Save Master only</strong><span className="mt-1 block text-xs leading-5 text-muted-foreground">Create the canonical revision and leave all listing drafts unchanged.</span></span>
            </button>
            <button type="button" role="radio" aria-checked={publishListingMode === 'apply-listings'} disabled={configuredChannelCount === 0} onClick={() => setPublishListingMode('apply-listings')} className={cn('flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50', publishListingMode === 'apply-listings' ? 'border-primary bg-primary/5' : 'hover:bg-muted/30')}>
              <span className={cn('mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border', publishListingMode === 'apply-listings' && 'border-primary')}><span className={cn('size-2 rounded-full', publishListingMode === 'apply-listings' && 'bg-primary')} /></span>
              <span><strong className="block text-sm">Save Master & review listing updates</strong><span className="mt-1 block text-xs leading-5 text-muted-foreground">Publish the Master, then review and confirm the exact fields sent to each listing.</span>{configuredChannelCount === 0 ? <span className="mt-1 block text-xs text-muted-foreground">No channel listings are configured yet.</span> : <span className="mt-1 block text-xs font-medium text-primary">{publishListingChangeCount} field change{publishListingChangeCount === 1 ? '' : 's'} across {configuredChannelCount} listing{configuredChannelCount === 1 ? '' : 's'}</span>}</span>
            </button>
          </div>}
          {publishListingMode === 'apply-listings' && configuredChannelCount > 0 ? <div className="overflow-hidden rounded-lg border">
            <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-2.5"><div><p className="text-xs font-semibold">Listing changes detected</p><p className="mt-0.5 text-[11px] text-muted-foreground">Nothing is synced until you confirm these changes.</p></div><Badge variant="outline" className="text-[10px]">{publishListingChangeCount} changes</Badge></div>
            <div className="max-h-56 space-y-3 overflow-y-auto p-3">
              {publishListingDiffs.length ? publishListingDiffs.map(listing => <div key={listing.key} className="overflow-hidden rounded-md border">
                <div className="flex items-center gap-2 border-b bg-muted/20 px-3 py-2"><strong className="text-xs">{listing.label}</strong>{listing.account ? <span className="truncate text-[11px] text-muted-foreground">{listing.account}</span> : null}<span className="ml-auto text-[10px] font-medium text-blue-500">{listing.changes.length} {listing.changes.length === 1 ? 'field' : 'fields'}</span></div>
                <div className="divide-y divide-border/50">{listing.changes.map(change => <div key={change.label} className="grid grid-cols-[100px_minmax(0,1fr)] gap-2 px-3 py-2 text-xs"><span className="font-medium text-foreground/80">{change.label}</span><span className="min-w-0"><span className="block truncate text-muted-foreground" title={change.current}>{change.current}</span><span className="mt-0.5 flex min-w-0 items-center gap-1 font-medium text-foreground"><ChevronRight className="size-3 shrink-0 text-blue-500" /><span className="truncate" title={change.next}>{change.next}</span></span></span></div>)}</div>
              </div>) : <p className="py-3 text-center text-xs text-muted-foreground">The selected listings already match the Product Master.</p>}
            </div>
          </div> : null}
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setPublishConfirmationOpen(false)}>Cancel</Button><Button onClick={beginPublish}><CloudUpload className="size-4" />{publishListingMode === 'apply-listings' ? 'Save & continue' : hasPublishedRevision ? 'Update Master' : 'Activate Master'}</Button></div>
        </DialogContent>
      </Dialog>
      <Dialog open={publishOpen} onOpenChange={open => { if (publishPercent >= 100) setPublishOpen(open); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{publishPercent >= 100 ? 'Product Master is ready' : 'Activating Product Master'}</DialogTitle><DialogDescription>{publishPercent >= 100
            ? publishListingMode === 'apply-listings'
              ? 'The canonical revision is current. Review the prepared updates before applying them to listing drafts.'
              : 'Your shared product record is ready. No listings were published or changed. Set up a shop listing when you are ready to sell.'
            : 'Prime OS is freezing the reviewed master data into a canonical revision.'}</DialogDescription></DialogHeader>
          <div className="space-y-5 py-2">
            <div><div className="mb-2 flex items-center justify-between text-sm font-semibold"><span>Master activation progress</span><span className="tabular-nums text-primary">{publishPercent}%</span></div><Progress value={publishPercent} className="h-2.5" /></div>
            <div className="space-y-2">
              {[
                { label: 'Draft snapshot saved', threshold: 24 },
                { label: 'Readiness evidence verified', threshold: 42 },
                { label: 'Product facts frozen', threshold: 68 },
                { label: 'Canonical revision activated', threshold: 86 },
                { label: publishListingMode === 'apply-listings' ? 'Listing updates prepared' : 'Master ready', threshold: 100 },
              ].map((step, index) => {
                const complete = publishPercent >= step.threshold;
                const active = !complete && (index === 0 || publishPercent >= [0, 24, 42, 68, 86][index]);
                return <div key={step.label} className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
                  {complete ? <CircleCheck className="size-4 text-emerald-600" /> : active ? <Loader2 className="size-4 animate-spin text-primary" /> : <CircleAlert className="size-4 text-muted-foreground/50" />}
                  <span className={`text-sm ${complete ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{step.label}</span>
                  <span className="ml-auto text-xs tabular-nums text-muted-foreground">{complete ? '100%' : active ? 'Saving…' : 'Queued'}</span>
                </div>;
              })}
            </div>
            {publishPercent >= 100 ? <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={() => { setPublishOpen(false); navigate('/products/master-catalog'); }}>Back to products</Button><Button onClick={() => {
              setPublishOpen(false);
              if (publishListingMode === 'apply-listings') { setApplyMasterOpen(true); }
              else { selectWorkspace('distribution'); }
            }}>{publishListingMode === 'apply-listings' ? 'Review listing updates' : 'View shop listings'}</Button></div> : null}
          </div>
        </DialogContent>
      </Dialog>
      <ApplyMasterSheet
        key={applyMasterOpen ? 'review-open' : 'review-closed'}
        open={applyMasterOpen}
        onOpenChange={setApplyMasterOpen}
        form={{ ...form }}
        images={images}
        listingDrafts={channelOverrides}
        enabledChannels={configuredChannels.map(channel => ({ ...channel, connectionStatus: channel.connectionStatus ?? 'connected' }))}
        onApply={patch => {
          if (!canWrite) return;
          const drafts: Partial<Record<OverrideChannel, ChannelOverrideForm>> = {};
          for (const [key, value] of Object.entries(patch) as [OverrideChannel, Partial<ChannelOverrideForm>][]) drafts[key] = { ...channelOverrides[key], ...value };
          persistListingDrafts(drafts);
          setChannelOverrides(current => ({ ...current, ...drafts }));
          setApplyMasterOpen(false);
          toast({ title: 'Listing drafts updated', description: 'Selected fields were saved locally. No update was sent to the shop.' });
        }}
      />
    </div>

  );
}
