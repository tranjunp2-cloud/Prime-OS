import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import {
  ArrowLeft, Info, Image, Package, Truck, Layers, Check, Lock,
  Plus, X, Trash2, AlertTriangle, Upload, Loader2, Boxes, PackageCheck,
  Globe2, Circle, CircleCheck, CircleAlert, CloudUpload, Search, ChevronDown, ChevronRight, Save, ExternalLink,
  ShoppingBag, Store, MonitorSmartphone, MessageSquare, Radio, Tags, Star, MoreHorizontal,
} from 'lucide-react';
import { ConfirmDialog } from '@/components/system/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { addProduct, updateProduct, getProductById, getAllSkus, getProducts, type Product, type ChannelListing, type ProductType, type MarketPrice, type ProductAssociation, type ProductRevision } from '@/lib/product-store';
import { getWarehouses } from '@/lib/warehouse-store';
import type { AmazonVariant } from '@/lib/amazon-catalog';
import { uploadProductImage, validateImageFile } from '@/lib/product-images';
import { useI18n } from '@/lib/i18n/I18nContext';
import { formatLocalizedNumber, formatMessage } from '@/lib/i18n/format';
import { cn } from '@/lib/utils';
import { ChannelListingWizard, type ChannelWizardDraft } from '@/components/products/ChannelListingWizard';
import { ChannelListingEditorDrawer } from '@/components/products/ChannelListingEditorDrawer';
import { getActiveCatalogBrands, getActiveCatalogCategories, getAttributesForCategory, getProductCatalogSettings, saveProductCatalogSettings, type CatalogAttribute, type CatalogBrand } from '@/lib/product-catalog-settings-store';
import { getCatalogImportItems } from '@/lib/catalog-import-store';

// ─── Types ────────────────────────────────────────────────────────────────────

interface VariantGroup {
  id: string;
  name: string;
  values: string[];
}

interface VariantItem {
  key: string;          // e.g. "Red / M"
  sku_code: string;
  price: string;
  stock: string;
  selected: boolean;
  image_url: string;
}

type OverrideChannel = 'webstore' | 'pos' | 'shopee' | 'lazada' | 'tiktok' | 'amazon' | 'social' | 'rakuten';
interface ChannelOverrideForm extends ChannelWizardDraft {}

type ProductWorkspace = 'overview' | 'product-data' | 'commerce' | 'distribution' | 'activity';
type ContentLocale = 'en-US' | 'ja-JP' | 'vi-VN';

const PRODUCT_WORKSPACES: Array<{ id: ProductWorkspace; label: string; description: string; icon: typeof Package }> = [
  { id: 'overview', label: 'Overview', description: 'Status and next steps', icon: Package },
  { id: 'product-data', label: 'Product data', description: 'Identity and attributes', icon: Tags },
  { id: 'commerce', label: 'Pricing & Inventory', description: 'Variants, pricing and stock', icon: ShoppingBag },
  { id: 'distribution', label: 'Media & Channels', description: 'Images and channel listings', icon: Globe2 },
  { id: 'activity', label: 'Version history', description: 'Published revisions', icon: Info },
];

function resolveProductWorkspace(value: string | null): ProductWorkspace {
  return PRODUCT_WORKSPACES.some(workspace => workspace.id === value) ? value as ProductWorkspace : 'overview';
}

function completionWorkspaceFor(checkId: string): { id: ProductWorkspace; label: string } {
  if (['identity', 'content', 'category', 'shipping'].includes(checkId)) return { id: 'product-data', label: 'Product data' };
  if (['price', 'variants'].includes(checkId)) return { id: 'commerce', label: 'Pricing & Inventory' };
  return { id: 'distribution', label: 'Media & Channels' };
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
const CURRENCIES = ['JPY', 'USD', 'SGD', 'MYR', 'VND'];
const COMMERCE_MARKETS: Array<{ market: MarketPrice['market']; label: string; currency: MarketPrice['currency'] }> = [
  { market: 'JP', label: 'Japan', currency: 'JPY' },
  { market: 'SG', label: 'Singapore', currency: 'SGD' },
  { market: 'VN', label: 'Vietnam', currency: 'VND' },
];
const COUNTRIES = ['JP', 'CN', 'KR', 'US', 'SG', 'MY', 'VN', 'TW', 'TH', 'ID'];
// Associations stay in the product model, but are hidden until a customer-facing
// recommendation, accessory, replacement, or upsell workflow consumes them.
const SHOW_PRODUCT_ASSOCIATIONS = false;
type VersionHistoryEntry = ProductRevision & { changes: string[] };
const DEMO_VERSION_HISTORY: VersionHistoryEntry[] = [
  { id: 'demo-rev-1', number: 1, status: 'published', createdAt: '2026-09-15T08:10:00+07:00', createdBy: 'PrimeOS Admin', summary: 'Created the canonical Product Master from imported listings', changes: ['Created master identity and SKU', 'Mapped the Headphones category', 'Linked PrimeWeb and PrimePOS listings'] },
  { id: 'demo-rev-2', number: 2, status: 'published', createdAt: '2026-09-16T14:35:00+07:00', createdBy: 'Mai Nguyen', summary: 'Completed product attributes and variant structure', changes: ['Added Color as a variant option', 'Generated Black and White variants', 'Updated canonical pricing and inventory'] },
  { id: 'demo-rev-3', number: 3, status: 'restored', createdAt: '2026-09-17T10:20:00+07:00', createdBy: 'PrimeOS Admin', summary: 'Restored approved media and product content', changes: ['Restored the approved English description', 'Restored the main product image', 'Kept channel-owned listing overrides unchanged'] },
];
const OVERRIDE_CHANNELS: Array<{
  key: OverrideChannel;
  label: string;
  description: string;
  account?: string;
  connectionStatus: 'connected' | 'attention' | 'not_connected';
  unavailableReason?: string;
  icon: typeof Globe2;
  iconClassName: string;
}> = [
  { key: 'webstore', label: 'PrimeWeb', description: 'Online storefront', account: 'primebeauty.vn', connectionStatus: 'connected' as const, icon: Globe2, iconClassName: 'bg-emerald-50 text-emerald-600' },
  { key: 'pos', label: 'PrimePOS', description: 'Retail outlets', account: 'District 1 Flagship', connectionStatus: 'connected' as const, icon: Store, iconClassName: 'bg-violet-50 text-violet-600' },
  { key: 'shopee', label: 'Shopee', description: 'Marketplace', account: 'Prime Beauty Official', connectionStatus: 'connected' as const, icon: ShoppingBag, iconClassName: 'bg-orange-50 text-orange-600' },
  { key: 'lazada', label: 'Lazada', description: 'Marketplace', account: 'Prime Flagship Store', connectionStatus: 'attention' as const, unavailableReason: 'Reconnect the expired store before creating a listing.', icon: ShoppingBag, iconClassName: 'bg-blue-50 text-blue-600' },
  { key: 'tiktok', label: 'TikTok Shop', description: 'Social commerce', account: 'Prime Live Store', connectionStatus: 'attention' as const, unavailableReason: 'Resolve the channel sync error before creating a listing.', icon: MonitorSmartphone, iconClassName: 'bg-slate-100 text-slate-700' },
  { key: 'amazon', label: 'Amazon', description: 'Global marketplace', account: 'Prime Beauty US', connectionStatus: 'attention' as const, unavailableReason: 'Resolve the channel sync error before creating a listing.', icon: ShoppingBag, iconClassName: 'bg-amber-50 text-amber-700' },
  { key: 'rakuten', label: 'Rakuten', description: 'Marketplace', account: 'Prime Beauty JP', connectionStatus: 'connected' as const, icon: ShoppingBag, iconClassName: 'bg-rose-50 text-rose-700' },
  { key: 'social', label: 'Social Inbox', description: 'Chat-assisted sales', connectionStatus: 'not_connected' as const, unavailableReason: 'Connect a Social Inbox workspace before creating a listing.', icon: MessageSquare, iconClassName: 'bg-sky-50 text-sky-600' },
];

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
const overrideByListingChannel = Object.fromEntries(
  Object.entries(listingChannelByOverride).map(([override, listing]) => [listing, override]),
) as Record<ChannelListing['channel'], OverrideChannel>;

function buildExistingListingMatches(product: Product | null) {
  if (!product) return undefined;
  const importItems = getCatalogImportItems();
  const importedSourceId = product.id.startsWith('prod_import_') ? product.id.slice('prod_import_'.length) : null;
  const matches = product.channels.reduce<Record<string, { listingId: string; title: string; status: string; differenceCount: number }>>((result, listing) => {
    const channelKey = overrideByListingChannel[listing.channel];
    const importMatch = importItems
      .filter(item => item.channel === listing.channel && (
        item.id === importedSourceId
        || item.resolvedProductId === product.id
        || item.suggestedProductId === product.id
      ))
      .sort((left, right) => Number(Boolean(right.confirmed)) - Number(Boolean(left.confirmed)) || right.confidence - left.confidence)[0];
    const confidence = importMatch?.confidence ?? (listing.external_id ? 100 : 90);
    result[channelKey] = {
      listingId: importMatch?.listingId || listing.external_id || `${channelKey.toUpperCase()}-${product.sku_code}`,
      title: importMatch?.title || product.name,
      status: `${listing.status === 'active' ? 'Active' : listing.status === 'pending' ? 'Pending' : 'Inactive'} on ${OVERRIDE_CHANNELS.find(channel => channel.key === channelKey)?.label ?? listing.channel}`,
      differenceCount: confidence === 100 ? 0 : confidence >= 95 ? 1 : confidence >= 85 ? 2 : 4,
    };
    return result;
  }, {});
  return Object.keys(matches).length ? matches : undefined;
}
function channelSetupComplete(key: OverrideChannel, value: ChannelOverrideForm) {
  if (!value.listing_sku.trim()) return false;
  if (key === 'webstore') return Boolean(value.web_slug.trim());
  if (key === 'pos') return Boolean(value.pos_barcode.trim());
  if (key === 'social') return Boolean(value.visibility);
  if (key === 'amazon') return Boolean(value.identifier.trim() && value.condition && value.fulfillment);
  if (key === 'tiktok') return Boolean(value.category.trim() && value.stock_quantity && value.warehouse);
  if (key === 'rakuten') return Boolean(value.category.trim() && value.stock_quantity && value.identifier.trim());
  return Boolean(value.category.trim() && value.stock_quantity && value.shipping_option);
}
const DEFAULT_CATEGORY_TREE = [
  { label: 'Fashion', children: [
    { label: 'Apparel', children: ['Jacket', 'Shoe', 'Hat'] },
    { label: 'Accessories', children: ['Bag', 'Watch', 'Sunglasses'] },
  ] },
  { label: 'Electronics', children: [
    { label: 'Consumer Electronics', children: ['Electronics', 'Headphones'] },
  ] },
  { label: 'Lifestyle', children: [
    { label: 'Home & Living', children: ['Home & Living', 'Food & Beverages'] },
    { label: 'Leisure', children: ['Sports', 'Bicycle', 'Books', 'Toys'] },
  ] },
  { label: 'Personal Care', children: [
    { label: 'Beauty', children: ['Beauty & Personal Care'] },
  ] },
];

function buildCategoryTree() {
  const categories = getActiveCatalogCategories();
  if (!categories.length) return DEFAULT_CATEGORY_TREE;
  const childrenByParent = new Map<string | null, typeof categories>();
  categories.forEach(category => childrenByParent.set(category.parentId, [...(childrenByParent.get(category.parentId) ?? []), category]));
  const sorted = (items: typeof categories) => [...items].sort((a, b) => a.name.localeCompare(b.name));
  return sorted(childrenByParent.get(null) ?? []).map(root => {
    const branches = sorted(childrenByParent.get(root.id) ?? []);
    return {
      label: root.name,
      children: branches.length ? branches.map(branch => {
        const leaves = sorted(childrenByParent.get(branch.id) ?? []).map(leaf => leaf.name);
        return { label: branch.name, children: leaves.length ? leaves : [branch.name] };
      }) : [{ label: root.name, children: [root.name] }],
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
  category: '', condition: 'new',
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

// Cartesian product of string arrays
function cartesian<T>(arrs: T[][]): T[][] {
  return arrs.reduce<T[][]>(
    (acc, arr) => acc.flatMap(x => arr.map(v => [...x, v])),
    [[]]
  );
}

function hydrateExistingVariants(product: Product | null): { groups: VariantGroup[]; items: VariantItem[] } {
  if (!product?.has_variants || product.skus.length === 0) return { groups: [], items: [] };
  const parsed = product.skus.map(sku => sku.variation_name.split('/').map(value => value.trim()).filter(Boolean));
  const optionCount = Math.min(2, Math.max(...parsed.map(values => values.length), 1));
  const groups = Array.from({ length: optionCount }, (_, index) => ({
    id: `existing-option-${index + 1}`,
    name: `Option ${index + 1}`,
    values: Array.from(new Set(parsed.map(values => values[index]).filter(Boolean))),
  }));
  const aggregateStock = Object.values(product.inventory).reduce((total, value) => total + Number(value || 0), 0);
  const baseStock = Math.floor(aggregateStock / product.skus.length);
  const remainder = aggregateStock % product.skus.length;
  const items = product.skus.map((sku, index) => ({
    key: sku.variation_name || sku.sku_code,
    sku_code: sku.sku_code,
    price: String(sku.price ?? product.retail_price),
    stock: String(sku.stock ?? baseStock + (index < remainder ? 1 : 0)),
    selected: sku.status === 'active',
    image_url: sku.image_url ?? '',
  }));
  return { groups, items };
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

function BrandReferencePicker({ brands, brandId, brandName, onSelect, onCreate }: { brands: CatalogBrand[]; brandId: string; brandName: string; onSelect: (brand: CatalogBrand | null) => void; onCreate: (name: string) => CatalogBrand }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const normalizedQuery = query.trim().toLowerCase();
  const results = brands.filter(brand => !normalizedQuery || [brand.name, brand.code, ...brand.aliases].some(value => value.toLowerCase().includes(normalizedQuery))).slice(0, 8);
  const duplicate = Boolean(createName.trim()) && brands.some(brand => brand.name.trim().toLowerCase() === createName.trim().toLowerCase());
  const selected = brands.find(brand => brand.id === brandId) ?? brands.find(brand => brand.name === brandName);

  const createBrand = () => {
    if (!createName.trim() || duplicate) return;
    const brand = onCreate(createName.trim());
    onSelect(brand);
    setCreateName('');
    setCreateOpen(false);
  };

  return <><Popover open={open} onOpenChange={next => { setOpen(next); if (next) setQuery(''); }}><PopoverTrigger asChild><Button type="button" variant="outline" role="combobox" aria-expanded={open} className={cn('h-10 w-full justify-between px-3 font-normal', !selected && 'text-muted-foreground')}><span className="truncate">{selected?.name ?? 'Select canonical brand'}</span><ChevronDown className="size-4 opacity-60" /></Button></PopoverTrigger><PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-0"><div className="border-b p-2"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Search brands..." className="h-10 pl-9" /></div></div><div className="max-h-64 overflow-y-auto p-1">{results.length ? results.map(brand => <button key={brand.id} type="button" onClick={() => { onSelect(brand); setOpen(false); }} className="flex min-h-10 w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><span className="min-w-0"><span className="block truncate font-medium">{brand.name}</span><span className="block truncate font-mono text-[11px] text-muted-foreground">{brand.code}</span></span>{selected?.id === brand.id ? <Check className="size-4 shrink-0 text-emerald-500" /> : null}</button>) : <p className="px-3 py-4 text-center text-xs text-muted-foreground">No matching brand found.</p>}{selected ? <button type="button" onClick={() => { onSelect(null); setOpen(false); }} className="min-h-10 w-full rounded-md px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted">Clear brand</button> : null}</div><div className="border-t p-1"><button type="button" onClick={() => { setCreateName(query); setOpen(false); setCreateOpen(true); }} className="flex min-h-10 w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Plus className="size-4" />Create new brand</button></div></PopoverContent></Popover><Dialog open={createOpen} onOpenChange={setCreateOpen}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Create brand</DialogTitle><DialogDescription>Create a reusable canonical Brand and link it to this Product Master.</DialogDescription></DialogHeader><div className="space-y-2 py-2"><Label htmlFor="inline-brand-name">Brand name</Label><Input id="inline-brand-name" autoFocus value={createName} onChange={event => setCreateName(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); createBrand(); } }} placeholder="e.g. Sony" aria-invalid={duplicate} />{duplicate ? <p className="text-xs font-medium text-destructive">This Brand already exists. Select it from the list instead.</p> : null}</div><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button type="button" disabled={!createName.trim() || duplicate} onClick={createBrand}>Create and select</Button></div></DialogContent></Dialog></>;
}

function DynamicAttributeValueControl({ attribute, value, onChange }: { attribute: CatalogAttribute & { required: boolean }; value: string; onChange: (value: string) => void }) {
  const options = attribute.options.split(',').map(option => option.trim()).filter(Boolean);
  const selectedValues = value.split(',').map(option => option.trim()).filter(Boolean);
  if (attribute.type === 'Single select') return <select value={value} onChange={event => onChange(event.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><option value="">Select {attribute.name.toLowerCase()}</option>{options.map(option => <option key={option} value={option}>{option}</option>)}</select>;
  if (attribute.type === 'Multi-select') return <div className="flex min-h-10 flex-wrap gap-2 rounded-md border border-input p-2">{options.map(option => { const checked = selectedValues.includes(option); return <button key={option} type="button" aria-pressed={checked} onClick={() => onChange(checked ? selectedValues.filter(item => item !== option).join(', ') : [...selectedValues, option].join(', '))} className={cn('rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary', checked ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-muted')}>{option}</button>; })}</div>;
  if (attribute.type === 'Number') return <Input type="number" value={value} onChange={event => onChange(event.target.value)} placeholder="Enter a number" />;
  if (attribute.type === 'Measurement' || attribute.type === 'Measurement set') {
    const unit = attribute.unit || 'cm';
    const numericValue = value.endsWith(` ${unit}`) ? value.slice(0, -(unit.length + 1)) : value;
    return <div className="grid grid-cols-[1fr_88px] gap-2"><Input type="number" value={numericValue} onChange={event => onChange(event.target.value ? `${event.target.value} ${unit}` : '')} placeholder="0" /><div className="grid place-items-center rounded-md border bg-muted/30 px-3 text-sm font-medium text-muted-foreground">{unit}</div></div>;
  }
  if (attribute.type === 'Country selector') return <select value={value} onChange={event => onChange(event.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><option value="">Select country</option>{['Japan', 'Singapore', 'Vietnam', 'China', 'South Korea', 'United States', 'United Kingdom', 'Other'].map(country => <option key={country}>{country}</option>)}</select>;
  if (attribute.type === 'Rich text') return <Textarea value={value} onChange={event => onChange(event.target.value)} rows={3} placeholder={`Enter ${attribute.name.toLowerCase()}`} />;
  return <Input value={value} onChange={event => onChange(event.target.value)} placeholder={`Enter ${attribute.name.toLowerCase()}`} />;
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
  onManageAttribute: (key: string) => void;
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
}

function VariantSection({
  groups, onGroupsChange, items, onItemsChange,
  parentSku, basePrice, currency, existingSkus, availableAttributes, onManageAttribute, copy,
}: VariantSectionProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [addGroupName, setAddGroupName] = useState('');
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [bulkPrice, setBulkPrice] = useState('');
  const [bulkStock, setBulkStock] = useState('');
  const [bulkSku, setBulkSku] = useState('');

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
      return existing ?? {
        key,
        sku_code: `${parentSku}-${skuSuffix}`,
        price: basePrice,
        stock: '0',
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

  function updateItem(key: string, field: keyof VariantItem, value: string | boolean) {
    setItems(initializedItems.map(i => i.key === key ? { ...i, [field]: value } : i));
  }

  function toggleSelectAll(selected: boolean) {
    setItems(initializedItems.map(i => ({ ...i, selected })));
  }

  function applyBulkValues() {
    setItems(initializedItems.map((item, index) => ({
      ...item,
      price: bulkPrice || item.price,
      stock: bulkStock || item.stock,
      sku_code: bulkSku ? `${bulkSku.trim().toUpperCase()}-${String(index + 1).padStart(3, '0')}` : item.sku_code,
    })));
  }

  function updateGroupImage(firstValue: string, imageUrl: string) {
    setItems(initializedItems.map(item => item.key.split(' / ')[0] === firstValue ? { ...item, image_url: imageUrl } : item));
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
    onGroupsChange([...groups, { id: genId('grp'), name, values: [] }]);
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
    onGroupsChange(groups.map(group => group.id === groupId ? { ...group, name: attribute.name, values: [] } : group));
  }

  const totalSelected = items.filter(i => i.selected).length;
  const totalCombinations = variantKeys.length;
  const remainingAttributes = availableAttributes.filter(attribute =>
    !groups.some(group => group.name.trim().toLowerCase() === attribute.name.trim().toLowerCase())
  );

  return (
    <div className="space-y-4">

        {/* Existing Groups */}
        {groups.map(group => {
          const canonicalAttribute = availableAttributes.find(attribute => attribute.name.trim().toLowerCase() === group.name.trim().toLowerCase());
          const canonicalOptions = canonicalAttribute?.options ?? [];
          return <div key={group.id} className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium">{canonicalAttribute?.name ?? group.name}</p>{canonicalAttribute ? <p className="mt-0.5 text-[11px] text-muted-foreground">Select values available for this product.</p> : <p className="mt-0.5 text-[11px] font-medium text-amber-600">This option type is not defined for the selected category.</p>}</div>
              {groups.length > 1 ? <Button variant="ghost" size="icon" className="size-7 text-destructive" aria-label={`Remove ${canonicalAttribute?.name ?? group.name} from variants`} onClick={() => deleteGroup(group.id)}>
                <Trash2 className="size-3.5" />
              </Button> : null}
            </div>
            {canonicalAttribute ? <><div className="flex flex-wrap gap-2" role="group" aria-label={`Select ${canonicalAttribute.name} variant values`}>{canonicalOptions.map(option => { const selected = group.values.some(value => value.toLowerCase() === option.toLowerCase()); return <button key={option} type="button" aria-pressed={selected} onClick={() => toggleGroupValue(group.id, option)} className={cn('min-h-9 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary', selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background hover:border-primary/40 hover:bg-primary/5')}>{option}{selected ? <Check className="ml-1.5 inline size-3" /> : null}</button>; })}</div><button type="button" onClick={() => onManageAttribute(canonicalAttribute.key)} className="text-[11px] font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{canonicalAttribute.name} not listed? Manage values</button></> : <div className="space-y-2 rounded-lg border border-amber-300/50 bg-amber-500/5 p-3"><label className="text-xs font-semibold" htmlFor={`replace-variant-${group.id}`}>Replace “{group.name}” with a valid option type</label><select id={`replace-variant-${group.id}`} value="" onChange={event => replaceGroupAttribute(group.id, event.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Select option type</option>{availableAttributes.filter(attribute => !groups.some(current => current.id !== group.id && current.name.toLowerCase() === attribute.name.toLowerCase())).map(attribute => <option key={attribute.key} value={attribute.name}>{attribute.name}</option>)}</select></div>}
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
        {remainingAttributes.length > 0 && groups.length < 2 ? <p className="text-[11px] text-muted-foreground">Add another option type configured for this category, such as Size.</p> : null}

        {/* Variant Matrix Summary */}
        {totalCombinations > 0 && (
          <div className="border-t pt-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">
                {groups.map(group => `${group.values.length} ${group.name.toLowerCase()}${group.values.length === 1 ? '' : 's'}`).join(' × ')} <span aria-hidden="true">·</span> <strong className="text-foreground">{totalCombinations} {totalCombinations === 1 ? 'variant' : 'variants'}</strong>
              </p>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <Checkbox
                  checked={totalSelected === totalCombinations}
                  onCheckedChange={v => toggleSelectAll(Boolean(v))}
                />
                {copy.selectAll}
              </label>
            </div>

            {/* Variant Table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="border-b bg-muted/40 p-3"><p className="mb-2 text-xs font-semibold">Bulk edit</p><div className="grid gap-2 sm:grid-cols-[1fr_1fr_1.2fr_auto]">
                <Field label="Price"><Input type="number" value={bulkPrice} onChange={event => setBulkPrice(event.target.value)} placeholder="No change" className="h-8 text-xs" /></Field>
                <Field label="Stock"><Input type="number" value={bulkStock} onChange={event => setBulkStock(event.target.value)} placeholder="No change" className="h-8 text-xs" /></Field>
                <Field label="SKU prefix"><Input value={bulkSku} onChange={event => setBulkSku(event.target.value)} placeholder="e.g. SHIRT" className="h-8 text-xs uppercase" /></Field>
                <Button type="button" size="sm" className="self-end" disabled={!bulkPrice && !bulkStock && !bulkSku.trim()} onClick={applyBulkValues}>Apply</Button>
              </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs" aria-label="Variant pricing matrix">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="w-8 p-2"></th>
                      <th className="text-left p-2 font-medium">{copy.variant}</th>
                      <th className="text-left p-2 font-medium w-16">Image</th>
                      <th className="text-left p-2 font-medium w-40">{copy.skuCode}</th>
                      <th className="text-right p-2 font-medium w-28">{copy.price} ({currency})</th>
                      <th className="text-right p-2 font-medium w-24">{copy.stock}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {initializedItems.map((item, itemIndex) => {
                      const skuDup = item.sku_code && existingSkus.includes(item.sku_code) && !(item.sku_code.startsWith(parentSku));
                      const firstValue = item.key.split(' / ')[0];
                      const isFirstInGroup = itemIndex === 0 || initializedItems[itemIndex - 1]?.key.split(' / ')[0] !== firstValue;
                      const groupSize = initializedItems.filter(candidate => candidate.key.split(' / ')[0] === firstValue).length;
                      return (
                        <tr key={item.key} className={`border-b last:border-0 ${item.selected ? '' : 'opacity-40'}`}>
                          <td className="p-1.5 text-center">
                            <Checkbox
                              checked={item.selected}
                              onCheckedChange={v => updateItem(item.key, 'selected', Boolean(v))}
                            />
                          </td>
                          <td className="p-2 font-medium text-foreground">{item.key}</td>
                          {isFirstInGroup ? <td className="p-1.5 align-middle" rowSpan={groupSize}>
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
                            <p className="mt-1 max-w-12 truncate text-center text-[9px] text-muted-foreground">{firstValue}</p>
                          </td> : null}
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
                          <td className="p-1.5">
                            <Input
                              value={item.stock}
                              onChange={e => updateItem(item.key, 'stock', e.target.value)}
                              className="h-7 text-xs text-right font-mono"
                              placeholder="0"
                              type="number"
                            />
                          </td>
                        </tr>
                      );
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
  const existingListingMatches = useMemo(() => buildExistingListingMatches(existingProduct), [existingProduct]);
  const existingSkuList = getAllSkus();
  const [catalogBrands, setCatalogBrands] = useState<CatalogBrand[]>(() => getActiveCatalogBrands());
  const categoryTree = useMemo(() => buildCategoryTree(), []);

  const [inventory, setInventory] = useState<Record<string, string>>(
    existingProduct
      ? Object.fromEntries(Object.entries(existingProduct.inventory).map(([k, v]) => [k, String(v)]))
      : Object.fromEntries(WAREHOUSES.map(w => [w.id, '0']))
  );
  const [marketPrices, setMarketPrices] = useState<MarketPrice[]>(() => COMMERCE_MARKETS.map(market => {
    const saved = existingProduct?.market_prices?.find(item => item.market === market.market);
    const canonicalMarket = existingProduct?.price_currency === market.currency;
    return saved ?? {
      market: market.market,
      currency: market.currency,
      enabled: Boolean(canonicalMarket),
      price: canonicalMarket ? existingProduct?.retail_price ?? 0 : 0,
    };
  }));
  const [associations, setAssociations] = useState<ProductAssociation[]>(existingProduct?.associations ?? []);
  const [associationProductId, setAssociationProductId] = useState('');
  const [associationType, setAssociationType] = useState<ProductAssociation['type']>('related');
  const [revisionDetail, setRevisionDetail] = useState<VersionHistoryEntry | null>(null);
  const associationCandidates = useMemo(() => getProducts().filter(product => product.id !== existingProduct?.id), [existingProduct?.id]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync form when URL search params change (e.g. after dialog navigate)
  const searchParams = new URLSearchParams(location.search);
  const urlSku = searchParams.get('sku') ?? '';
  const urlFamily = searchParams.get('family') ?? '';
  const selectedRevisionId = searchParams.get('revision');
  const selectedRevision = existingProduct?.revisions?.find(revision => revision.id === selectedRevisionId);
  const isHistorical = Boolean(selectedRevisionId && selectedRevision);
  const versionHistoryEntries: VersionHistoryEntry[] = existingProduct?.revisions?.length
    ? existingProduct.revisions.map(revision => ({ ...revision, changes: [revision.summary] }))
    : existingProduct?.id === 'prod_import_imp-003' ? DEMO_VERSION_HISTORY : [];
  const requestedContentLocale = searchParams.get('locale');
  const contentLocale: ContentLocale = requestedContentLocale === 'ja-JP' || requestedContentLocale === 'vi-VN' ? requestedContentLocale : 'en-US';
  const canWrite = searchParams.get('mode') !== 'viewer' && !isHistorical;
  const [localizedContent, setLocalizedContent] = useState(existingProduct?.localized_content ?? {});
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
    return { ...EMPTY_FORM, sku_code: urlSku || '', category: urlFamily || '' };
  };

  const [form, setForm] = useState<FormState>(initForm);
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
            selected: true,
            image_url: '',
          };
        });
        setVariantItems(items);
      }

      setForm(prev => ({
        ...prev,
        ...(urlSku ? { sku_code: urlSku } : {}),
        ...(urlFamily ? { category: urlFamily } : {}),
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
  const [channelOverrides, setChannelOverrides] = useState<Record<OverrideChannel, ChannelOverrideForm>>(() => {
    const saved = existingProduct?.channel_overrides;
    const make = (key: OverrideChannel): ChannelOverrideForm => ({
      enabled: saved?.[key]?.enabled ?? Boolean(existingProduct?.channels.some(listing => listing.channel === listingChannelByOverride[key])),
      title: saved?.[key]?.title ?? '',
      price_markup: saved?.[key]?.price_markup ? String(saved[key]?.price_markup) : '',
      description: saved?.[key]?.description ?? '',
      listing_sku: saved?.[key]?.listing_sku ?? '',
      category: saved?.[key]?.category ?? '',
      fulfillment: saved?.[key]?.fulfillment ?? '',
      variant_scope: saved?.[key]?.variant_scope ?? 'all',
      listing_mode: saved?.[key]?.listing_mode ?? 'master',
      identifier: saved?.[key]?.identifier ?? (key === 'amazon' ? existingProduct?.asin ?? '' : existingProduct?.gtin ?? ''),
      condition: saved?.[key]?.condition ?? (key === 'amazon' ? 'new_new' : ''),
      stock_quantity: saved?.[key]?.stock_quantity ?? '',
      warehouse: saved?.[key]?.warehouse ?? '',
      brand: saved?.[key]?.brand ?? existingProduct?.brand ?? '',
      shipping_option: saved?.[key]?.shipping_option ?? '',
      bullet_points: saved?.[key]?.bullet_points ?? '',
      search_terms: saved?.[key]?.search_terms ?? '',
      preorder_days: saved?.[key]?.preorder_days ?? '',
      warranty: saved?.[key]?.warranty ?? '',
      certification: saved?.[key]?.certification ?? '',
      video_url: saved?.[key]?.video_url ?? '',
      web_slug: saved?.[key]?.web_slug ?? '',
      pos_barcode: saved?.[key]?.pos_barcode ?? existingProduct?.gtin ?? '',
      visibility: saved?.[key]?.visibility ?? (key === 'webstore' ? 'public' : key === 'social' ? 'agents' : ''),
      sync_policy: saved?.[key]?.sync_policy ?? 'automatic',
      safety_buffer: saved?.[key]?.safety_buffer ?? '0',
      allocation_cap: saved?.[key]?.allocation_cap ?? '',
      media_scope: saved?.[key]?.media_scope ?? 'all',
      compliance_notes: saved?.[key]?.compliance_notes ?? '',
      tax_code: saved?.[key]?.tax_code ?? '',
      attribute_material: saved?.[key]?.attribute_material ?? '',
      attribute_color: saved?.[key]?.attribute_color ?? '',
    });
    return Object.fromEntries(OVERRIDE_CHANNELS.map(channel => [channel.key, make(channel.key)])) as Record<OverrideChannel, ChannelOverrideForm>;
  });
  const [channelListingWizardOpen, setChannelListingWizardOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<OverrideChannel | null>(null);
  const [channelRemovalTarget, setChannelRemovalTarget] = useState<OverrideChannel | null>(null);
  const [channelListingDrafts, setChannelListingDrafts] = useState<Record<OverrideChannel, ChannelOverrideForm>>(channelOverrides);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishPercent, setPublishPercent] = useState(0);
  const [readinessStatus, setReadinessStatus] = useState<'unchecked' | 'checking' | 'blocked' | 'ready' | 'published'>(
    existingProduct?.status === 'published' ? 'published' : 'unchecked',
  );
  const [readinessReviewOpen, setReadinessReviewOpen] = useState(false);
  const [publishConfirmationOpen, setPublishConfirmationOpen] = useState(false);
  const [skuChangeOpen, setSkuChangeOpen] = useState(false);
  const [pendingMasterSku, setPendingMasterSku] = useState('');
  const [skuChangeConfirmed, setSkuChangeConfirmed] = useState(false);
  const [skuChangeError, setSkuChangeError] = useState('');
  const [, setDraftSaveGeneration] = useState(0);
  const [catalogSettingsVersion, setCatalogSettingsVersion] = useState(0);
  const [dirtyTrackingReady, setDirtyTrackingReady] = useState(false);
  const [hasScrolledFromTop, setHasScrolledFromTop] = useState(false);
  const baselineSnapshotRef = useRef('');
  const latestSnapshotRef = useRef('');

  useEffect(() => {
    if (editId && recoveredImportProduct && !storedProduct) {
      addProduct(recoveredImportProduct);
    }
  }, [editId, recoveredImportProduct, storedProduct]);

  // Images (stored as data URLs)
  const [images, setImages] = useState<string[]>(existingProduct?.images ?? []);
  const [imageAltTexts, setImageAltTexts] = useState<string[]>(existingProduct?.image_alt_texts ?? []);
  const [uploadingImageCount, setUploadingImageCount] = useState(0);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [categoryLevelOne, setCategoryLevelOne] = useState(categoryTree[0].label);
  const [categoryLevelTwo, setCategoryLevelTwo] = useState(categoryTree[0].children[0].label);
  const [pendingCategory, setPendingCategory] = useState(form.category);
  const [activeSection, setActiveSection] = useState<ProductWorkspace>(() => resolveProductWorkspace(new URLSearchParams(location.search).get('section')));
  const [specifications, setSpecifications] = useState<Array<{ id: string; attributeKey?: string; name: string; value: string }>>(
    existingProduct?.specifications?.map(item => ({ ...item, id: genId('spec') })) ?? []
  );

  useEffect(() => {
    if (!form.category) {
      setSpecifications(current => current.filter(item => !item.attributeKey));
      return;
    }
    const categoryAttributes = getAttributesForCategory(form.category).filter(item => item.key !== 'brand');
    setSpecifications(current => {
      const canonical = categoryAttributes.map(attribute => {
        const existing = current.find(item => item.attributeKey === attribute.key)
          ?? current.find(item => !item.attributeKey && item.name.trim().toLowerCase() === attribute.name.toLowerCase());
        return existing
          ? { ...existing, attributeKey: attribute.key, name: attribute.name }
          : { id: genId('spec'), attributeKey: attribute.key, name: attribute.name, value: '' };
      });
      const categoryKeys = new Set(categoryAttributes.map(attribute => attribute.key));
      const categoryNames = new Set(categoryAttributes.map(attribute => attribute.name.toLowerCase()));
      const custom = current.filter(item => !categoryKeys.has(item.attributeKey ?? '') && !categoryNames.has(item.name.trim().toLowerCase()));
      return [...canonical, ...custom.filter(item => item.name || item.value)];
    });
  }, [form.category, catalogSettingsVersion]);

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
  }

  function createCanonicalBrand(name: string): CatalogBrand {
    const canonicalName = name.trim();
    const brand: CatalogBrand = {
      id: `${slugify(canonicalName)}-${Date.now().toString(36)}`,
      name: canonicalName,
      code: slugify(canonicalName).replace(/-/g, '_').toUpperCase(),
      manufacturer: '', country: '', website: '', productCount: 0,
      status: 'Unverified', source: 'internal', aliases: [], mappings: {},
    };
    const settings = getProductCatalogSettings();
    saveProductCatalogSettings({ ...settings, brands: [...settings.brands, brand] });
    setCatalogBrands(current => [...current, brand]);
    toast({ title: 'Brand created', description: `${brand.name} was added to the Brand registry and selected.` });
    return brand;
  }

  function updateProductName(value: string) {
    if (!canWrite) return;
    if (contentLocale !== 'en-US') {
      setLocalizedContent(current => ({ ...current, [contentLocale]: { name: value, description: current[contentLocale]?.description ?? '' } }));
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
    if (contentLocale !== 'en-US') {
      setLocalizedContent(current => ({ ...current, [contentLocale]: { name: current[contentLocale]?.name ?? '', description: value } }));
      return;
    }
    setField('description', value);
  }

  function selectContentLocale(nextLocale: ContentLocale) {
    const nextParams = new URLSearchParams(location.search);
    nextParams.set('locale', nextLocale);
    navigate({ pathname: location.pathname, search: nextParams.toString() }, { replace: true });
  }

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

  function openChannelListingSetup() {
    if (!existingProduct || isDirty) {
      toast({
        title: existingProduct ? 'Save this Product Master first' : 'Create this Product Master first',
        description: 'Channel listings must use a saved Product Master revision.',
        variant: 'destructive',
      });
      return;
    }
    setChannelListingDrafts(Object.fromEntries(Object.entries(channelOverrides).map(([key, value]) => [key, { ...value }])) as Record<OverrideChannel, ChannelOverrideForm>);
    setChannelListingWizardOpen(true);
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
      identity: 'product-name', content: 'product-description', category: 'product-category-trigger',
      shipping: 'product-section-shipping', price: 'product-section-pricing', variants: 'variant-attributes-title',
      media: 'product-media-panel', channels: 'product-section-channels',
    };
    selectWorkspace(workspace);
    window.setTimeout(() => {
      const target = document.getElementById(targetByCheck[checkId] ?? '');
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target?.focus({ preventScroll: true });
    }, 120);
  }

  useEffect(() => {
    setActiveSection(resolveProductWorkspace(new URLSearchParams(location.search).get('section')));
  }, [location.search]);

  async function handleImageUpload(file: File, mode: 'primary' | 'gallery') {
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

  function handleSave(statusOverride?: Product['status'], options: { navigateAfter?: boolean; force?: boolean } = {}) {
    if (!canWrite) return false;
    const latestVersion = existingProduct ? getProductById(existingProduct.id)?.record_version ?? 1 : 1;
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
    if (!form.sku_code.trim()) e.sku_code = copy.skuRequired;
    else if (existingSkuList.some(sku => sku.toUpperCase() === form.sku_code.trim().toUpperCase() && sku.toUpperCase() !== existingProduct?.sku_code.toUpperCase())) {
      e.sku_code = 'This Master SKU is already in use.';
    }
    if (!form.name.trim()) e.name = copy.nameRequired;
    if (!form.category) e.category = copy.categoryRequired;
    if (form.category && missingRequiredCategoryAttributes.length) {
      e.attributes = `Complete required product attributes: ${missingRequiredCategoryAttributes.map(attribute => attribute.name).join(', ')}.`;
    }

    // Variant SKU duplicate check
    if (form.has_variants) {
      const selectedItems = variantItems.filter(i => i.selected && i.sku_code.trim());
      for (const item of selectedItems) {
        if (existingSkuList.includes(item.sku_code.trim().toUpperCase())) {
          e.variant_duplicate = formatMessage(copy.variantDuplicate, { sku: item.sku_code });
          break;
        }
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
      .map(i => ({
        id: genId('sku'),
        sku_code: i.sku_code.trim().toUpperCase(),
        variation_name: i.key,
        weight_g: 0,
        units_per_carton: 10,
        status: 'active' as const,
        image_url: i.image_url,
        price: num(i.price),
        stock: num(i.stock),
      }));

    const variantRetailPrices = variants.map(variant => variant.price).filter(price => price > 0);
    const selectedChannels: ChannelListing[] = OVERRIDE_CHANNELS
      .filter(channel => channelOverrides[channel.key].enabled)
      .map(channel => {
        const listingChannel = listingChannelByOverride[channel.key];
        const existingListing = existingProduct?.channels.find(listing => listing.channel === listingChannel);
        return existingListing ? {
          ...existingListing,
          external_id: channelOverrides[channel.key].listing_sku.trim() || existingListing.external_id,
        } : {
          channel: listingChannel,
          external_id: channelOverrides[channel.key].listing_sku.trim() || null,
          status: 'pending' as const,
          listing_url: null,
          last_synced_at: null,
        };
      });
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
      condition: form.condition,
      description: form.description.trim(),
      localized_content: localizedContent,
      original_price: num(form.original_price),
      retail_price: form.has_variants && variantRetailPrices.length > 0 ? Math.min(...variantRetailPrices) : num(form.retail_price),
      price_currency: form.price_currency,
      market_prices: marketPrices,
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
      specifications: specifications.filter(item => item.attributeKey && categoryAttributesForProduct.some(attribute => attribute.key === item.attributeKey) && item.value.trim()).map(({ attributeKey, name, value }) => ({ attributeKey, name: name.trim(), value: value.trim() })),
      inventory: Object.fromEntries(Object.entries(inventory).map(([k, v]) => [k, num(v)])),
      has_variants: form.has_variants,
      channels: selectedChannels,
      channel_overrides: Object.fromEntries(Object.entries(channelOverrides).map(([key, value]) => [key, {
        enabled: value.enabled,
        title: value.title.trim(),
        price_markup: num(value.price_markup),
        description: value.description.trim(),
        listing_sku: value.listing_sku.trim(),
        category: value.category.trim(),
        fulfillment: value.fulfillment,
        variant_scope: value.variant_scope,
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
      }])),
      associations,
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
      skus: variants,
      _variants: variants,
    };

    if (storedProduct) {
      updateProduct(existingProduct.id, payload);
      toast({ title: copy.updated, description: formatMessage(copy.updatedDescription, { name: payload.name }) });
    } else {
      addProduct(payload);
      toast({ title: copy.created, description: formatMessage(copy.createdDescription, { name: payload.name }) });
    }

    baselineSnapshotRef.current = latestSnapshotRef.current;
    loadedVersionRef.current = payload.record_version ?? loadedVersionRef.current;
    setDraftSaveGeneration(value => value + 1);
    if (statusOverride === 'published') setReadinessStatus('published');
    else setReadinessStatus('unchecked');
    if (options.navigateAfter !== false) navigate('/products/master-catalog');
    else if (!existingProduct) navigate(`/products/${payload.id}/edit`, { replace: true });
    return true;
  }

  const totalStock = Object.values(inventory).reduce((s, v) => s + num(v), 0);
  const masterSkuLocked = Boolean(existingProduct && (
    existingProduct.status !== 'draft' || existingProduct.channels.length > 0 || totalStock > 0
  ));
  const selectedVariantItems = variantItems.filter(item => item.selected);
  const listingEditorVariants = useMemo(() => variantItems.filter(item => item.selected).map(item => ({ id: item.key, label: item.key, sku: item.sku_code })), [variantItems]);
  const hasGeneratedVariants = form.has_variants && selectedVariantItems.length > 0;
  const variantPricingReady = hasGeneratedVariants && selectedVariantItems.every(item => item.sku_code.trim() && num(item.price) > 0) && selectedVariantItems.reduce((sum, item) => sum + num(item.stock), 0) > 0;
  const pricingAndInventoryReady = hasGeneratedVariants ? variantPricingReady : num(form.retail_price) > 0 && totalStock > 0;
  const logisticsReady = Boolean(form.pkg_length && form.pkg_width && form.pkg_height && form.pkg_weight);
  const shippingPackageRequired = OVERRIDE_CHANNELS.some(channel =>
    channelOverrides[channel.key].enabled && !['pos', 'social'].includes(channel.key)
  );
  const completionChecks = useMemo(() => {
    const channelReadyForPublishing =
      Object.values(channelOverrides).some(item => item.enabled) &&
      form.name.trim().length >= 3 &&
      form.description.trim().length >= 100 &&
      Boolean(form.category) &&
      images.length >= 3 &&
      pricingAndInventoryReady &&
      (!shippingPackageRequired || logisticsReady);
    const checks = [
      { id: 'identity', label: 'Add product name and master SKU', done: form.name.trim().length >= 3 && Boolean(form.sku_code.trim()) },
      { id: 'media', label: 'Add at least 3 product images', done: images.length >= 3 },
      { id: 'content', label: 'Write a detailed description (100+ characters)', done: form.description.trim().length >= 100 },
      { id: 'category', label: 'Select an accurate product category', done: Boolean(form.category) },
      { id: 'price', label: form.has_variants ? 'Configure variant pricing and stock' : 'Configure base price and inventory', done: pricingAndInventoryReady },
    ];

    if (shippingPackageRequired) checks.push({ id: 'shipping', label: 'Configure shipping package dimensions and weight', done: logisticsReady });

    if (form.has_variants) {
      checks.push({
        id: 'variants',
        label: 'Complete all selected variants',
        done: variantGroups.length > 0 && hasGeneratedVariants && selectedVariantItems.every(item => item.sku_code.trim()),
      });
    }

    checks.push({ id: 'channels', label: 'Prepare at least one channel for publishing', done: channelReadyForPublishing });
    return checks;
  }, [channelOverrides, form, hasGeneratedVariants, images.length, logisticsReady, pricingAndInventoryReady, selectedVariantItems, shippingPackageRequired, variantGroups.length]);
  const completion = Math.round((completionChecks.filter(check => check.done).length / completionChecks.length) * 100);
  const categoryAttributesForProduct = getAttributesForCategory(form.category).filter(item => item.key !== 'brand');
  const requiredCategoryAttributes = categoryAttributesForProduct.filter(attribute => attribute.required);
  const specificationForAttribute = (attribute: CatalogAttribute) => specifications.find(spec => spec.attributeKey === attribute.key)
    ?? specifications.find(spec => !spec.attributeKey && spec.name.trim().toLowerCase() === attribute.name.toLowerCase());
  useEffect(() => {
    if (!form.has_variants || !form.category) return;

    const seedKey = `${form.category}:${form.product_type}:${catalogSettingsVersion}`;
    if (variantAutoSeedKeyRef.current === seedKey) return;
    variantAutoSeedKeyRef.current = seedKey;
    if (variantGroups.length > 0) return;

    const eligibleAttributes = getAttributesForCategory(form.category).filter(attribute =>
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
  }, [catalogSettingsVersion, form.category, form.has_variants, form.product_type, specifications, variantGroups.length]);
  const missingRequiredCategoryAttributes = requiredCategoryAttributes.filter(attribute => !specificationForAttribute(attribute)?.value.trim());
  const catalogCategories = getActiveCatalogCategories();
  const selectedCatalogCategory = catalogCategories.find(category => category.name === form.category);
  const categoryParent = selectedCatalogCategory?.parentId ? catalogCategories.find(category => category.id === selectedCatalogCategory.parentId) : undefined;
  const categoryRoot = categoryParent?.parentId ? catalogCategories.find(category => category.id === categoryParent.parentId) : categoryParent;
  const categoryPath = [categoryRoot?.name, categoryParent?.name, selectedCatalogCategory?.name].filter((value, index, values) => value && values.indexOf(value) === index);
  const selectedCategoryGroup = categoryTree.find(item => item.label === categoryLevelOne) ?? categoryTree[0];
  const selectedCategorySubgroup = selectedCategoryGroup.children.find(item => item.label === categoryLevelTwo) ?? selectedCategoryGroup.children[0];
  const matchingCategoryPaths = categoryTree.flatMap(group => group.children.flatMap(subgroup => subgroup.children.map(leaf => ({ group: group.label, subgroup: subgroup.label, leaf })))).filter(item => !categorySearch.trim() || `${item.group} ${item.subgroup} ${item.leaf}`.toLowerCase().includes(categorySearch.trim().toLowerCase()));
  const currentSnapshot = JSON.stringify({ form, localizedContent, inventory, marketPrices, images, imageAltTexts, variantGroups, variantItems, channelOverrides, associations, specifications });
  latestSnapshotRef.current = currentSnapshot;
  const isDirty = dirtyTrackingReady && currentSnapshot !== baselineSnapshotRef.current;

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
    if (isDirty && readinessStatus !== 'unchecked' && readinessStatus !== 'checking') {
      setReadinessStatus('unchecked');
    }
  }, [isDirty, readinessStatus]);

  useEffect(() => {
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    const shouldDisable = !canWrite && activeSection !== 'activity';
    const controls = document.querySelectorAll<HTMLElement>('[data-editor-fields] input, [data-editor-fields] textarea, [data-editor-fields] select, [data-editor-fields] button');
    controls.forEach(control => {
      if ('disabled' in control) (control as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLButtonElement).disabled = shouldDisable;
    });
    return () => controls.forEach(control => {
      if ('disabled' in control) (control as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLButtonElement).disabled = false;
    });
  }, [activeSection, canWrite]);

  function checkReadiness() {
    if (isDirty) return;
    setReadinessStatus('checking');
    window.setTimeout(() => {
      const nextStatus = completionChecks.every(check => check.done) ? 'ready' : 'blocked';
      setReadinessStatus(nextStatus);
      if (nextStatus === 'blocked') setReadinessReviewOpen(true);
      toast({
        title: nextStatus === 'ready' ? 'Product is ready to publish' : 'Product needs attention',
        description: nextStatus === 'ready'
          ? 'The saved draft passed all prototype readiness checks.'
          : 'Review the incomplete requirements before publishing.',
        variant: nextStatus === 'ready' ? undefined : 'destructive',
      });
    }, 650);
  }

  function beginPublish() {
    if (readinessStatus !== 'ready' || isDirty) return;
    setPublishConfirmationOpen(false);
    setPublishOpen(true);
    setPublishPercent(8);
    [24, 42, 68, 86, 100].forEach((value, index) => {
      window.setTimeout(() => setPublishPercent(value), 360 * (index + 1));
    });
    window.setTimeout(() => {
      handleSave('published', { navigateAfter: false });
      toast({ title: 'Product revision published', description: 'Channel listings remain separate and ready for submission.' });
    }, 2200);
  }

  const primaryAction = isDirty
    ? 'save'
    : readinessStatus === 'checking'
      ? 'checking'
      : readinessStatus === 'blocked'
        ? 'review'
        : readinessStatus === 'ready'
          ? 'publish'
          : readinessStatus === 'published'
            ? 'published'
            : 'check';
  const displayedProductName = contentLocale === 'en-US' ? form.name : localizedContent[contentLocale]?.name ?? '';
  const displayedProductDescription = contentLocale === 'en-US' ? form.description : localizedContent[contentLocale]?.description ?? '';

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
              <Button variant="outline" onClick={() => navigate('/products/catalog-imports')}>
                Open Catalog Imports
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

  return (
    <div data-testid="product-editor-page" className="flex min-h-full flex-col bg-background">
      {/* Top Bar */}
      <div className={`sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b bg-card/95 px-4 backdrop-blur transition-[padding,box-shadow] duration-200 motion-reduce:transition-none sm:px-6 ${hasScrolledFromTop ? 'py-2 shadow-sm' : 'py-4'}`}>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-3">
          <button onClick={() => navigate('/products/master-catalog')} className="flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="size-4" />
            {hasScrolledFromTop ? (existingProduct ? 'Edit Product' : 'Create Product') : copy.productMaster}
          </button>
          {!hasScrolledFromTop ? <><span className="text-muted-foreground">/</span><span className="truncate text-sm font-medium">
            {existingProduct ? copy.editDetails : copy.createNew}
          </span></> : null}
          </div>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <select aria-label="Content locale" value={contentLocale} onChange={event => selectContentLocale(event.target.value as ContentLocale)} className="h-9 rounded-md border border-input bg-background px-2 text-xs font-semibold"><option value="en-US">English</option><option value="ja-JP">日本語</option><option value="vi-VN">Tiếng Việt</option></select>
          {!canWrite && !isHistorical ? <Badge variant="outline">View only</Badge> : null}
          {isHistorical ? <Button type="button" variant="outline" onClick={returnToCurrentDraft}><ArrowLeft className="size-4" />Return to current draft</Button> : canWrite ? <Button
            onClick={() => {
              if (primaryAction === 'save') handleSave('draft', { navigateAfter: false });
              if (primaryAction === 'check') checkReadiness();
              if (primaryAction === 'review') setReadinessReviewOpen(true);
              if (primaryAction === 'publish') setPublishConfirmationOpen(true);
            }}
            disabled={uploadingImageCount > 0 || publishOpen || primaryAction === 'checking' || primaryAction === 'published'}
          >
            {uploadingImageCount > 0 || primaryAction === 'checking' ? <Loader2 className="size-4 animate-spin" /> : primaryAction === 'publish' || primaryAction === 'published' ? <CloudUpload className="size-4" /> : primaryAction === 'review' ? <CircleAlert className="size-4" /> : primaryAction === 'check' ? <PackageCheck className="size-4" /> : <Save className="size-4" />}
            {primaryAction === 'save' ? (existingProduct ? 'Save changes' : 'Save draft') : primaryAction === 'checking' ? 'Checking readiness…' : primaryAction === 'review' ? 'Review issues' : primaryAction === 'publish' ? 'Publish changes' : primaryAction === 'published' ? 'Published' : 'Check readiness'}
          </Button> : null}
        </div>
      </div>

      {isHistorical ? <div className="mx-4 mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm sm:mx-6"><Info className="size-4 text-amber-600" /><strong>Viewing revision {selectedRevision?.number}</strong><span className="text-muted-foreground">This historical revision is read-only.</span></div> : null}

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
        <div className="grid w-full grid-cols-1 gap-6 px-4 py-6 sm:px-6 xl:grid-cols-[220px_minmax(0,1fr)_300px]">

          <nav className="h-fit overflow-x-auto xl:sticky xl:top-20" aria-label="Product editor workspaces">
            <div className="flex min-w-max gap-1 xl:min-w-0 xl:flex-col">
              {PRODUCT_WORKSPACES.map(workspace => {
                const WorkspaceIcon = workspace.icon;
                const active = activeSection === workspace.id;
                return <button key={workspace.id} type="button" disabled={isHistorical && workspace.id !== 'activity'} onClick={() => selectWorkspace(workspace.id)} aria-current={active ? 'page' : undefined} className={cn('flex min-h-12 items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40 xl:w-full', active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground')}>
                  <WorkspaceIcon className="size-4 shrink-0" />
                  <span className="min-w-0"><span className="block text-sm font-semibold">{workspace.label}</span><span className="hidden truncate text-[11px] font-normal text-muted-foreground xl:block">{workspace.description}</span></span>
                </button>;
              })}
            </div>
          </nav>

          {/* Left Column */}
          <div data-editor-fields className="flex flex-col gap-5">

            {activeSection === 'overview' ? <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base"><Package className="size-4 text-primary" />Product overview</CardTitle>
                <p className="text-xs leading-5 text-muted-foreground">Review the canonical product status and continue with the next required task.</p>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Master SKU</p><p className="mt-1 truncate font-mono text-sm font-semibold">{form.sku_code || 'Not assigned'}</p></div>
                  <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Product type</p><p className="mt-1 text-sm font-semibold">{form.has_variants ? 'Product with variants' : 'Single product'}</p></div>
                  <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Category</p><p className="mt-1 truncate text-sm font-semibold">{form.category || 'Not selected'}</p></div>
                  <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Status</p><p className="mt-1 text-sm font-semibold capitalize">{readinessStatus === 'unchecked' ? 'Draft' : readinessStatus}</p></div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                  <div><p className="text-sm font-semibold">{completionChecks.filter(check => !check.done).length ? `${completionChecks.filter(check => !check.done).length} items need attention` : 'Required details are complete'}</p><p className="mt-1 text-xs text-muted-foreground">Master readiness and channel readiness are checked separately.</p></div>
                  <Button type="button" variant="outline" onClick={() => selectWorkspace(completionChecks.some(check => !check.done && ['identity', 'content', 'category'].includes(check.id)) ? 'product-data' : completionChecks.some(check => !check.done && ['price', 'variants', 'shipping'].includes(check.id)) ? 'commerce' : 'distribution')}>Continue setup<ChevronRight className="size-4" /></Button>
                </div>
              </CardContent>
            </Card> : null}

            {/* Product media belongs to the canonical master and is prepared before channel distribution. */}
            {activeSection === 'distribution' ? <Card id="product-media-panel" tabIndex={-1}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-2 text-sm"><Image className="size-4 text-primary" />{copy.media}</CardTitle><p className="mt-1.5 text-xs leading-5 text-muted-foreground">Add and arrange the canonical images inherited by channel listings.</p></div><Badge variant="outline" className={cn(images.length >= 3 && 'border-emerald-300 text-emerald-700')}>{images.length}/3 required · 9 max</Badge></div>
              </CardHeader>
              <CardContent className="space-y-4">
                {images.length === 0 ? <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed bg-muted/20 px-6 py-8 text-center transition-colors hover:border-primary/40 hover:bg-muted/40 focus-within:ring-2 focus-within:ring-ring"><input type="file" accept="image/*" multiple className="sr-only" aria-label="Upload product images" onChange={async event => { const files = Array.from(event.target.files ?? []).slice(0, 9); for (const [index, file] of files.entries()) await handleImageUpload(file, index === 0 ? 'primary' : 'gallery'); event.target.value = ''; }} /><span className="grid size-11 place-items-center rounded-full bg-primary/10 text-primary"><Upload className="size-5" /></span><span className="mt-3 text-sm font-semibold">Upload product images</span><span className="mt-1 text-xs text-muted-foreground">Drop files here or browse · JPG, PNG · up to 9 images</span></label> : <><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{images.map((url, index) => <div key={url} className="group relative aspect-square overflow-hidden rounded-xl border bg-muted/20"><img src={url} alt={index === 0 ? copy.mainAlt : formatMessage(copy.additionalImageAlt, { index: index + 1 })} className="size-full object-cover" />{index === 0 ? <Badge className="absolute left-2 top-2 gap-1"><Star className="size-3 fill-current" />Main</Badge> : <Button type="button" size="sm" variant="secondary" className="absolute bottom-2 left-2 h-7 px-2 text-[11px] opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100" onClick={() => { setImages(items => [items[index], ...items.filter((_, itemIndex) => itemIndex !== index)]); setImageAltTexts(items => [items[index] ?? '', ...items.filter((_, itemIndex) => itemIndex !== index)]); }}>Set as main</Button>}<button type="button" onClick={() => { setImages(items => items.filter((_, itemIndex) => itemIndex !== index)); setImageAltTexts(items => items.filter((_, itemIndex) => itemIndex !== index)); }} aria-label={`Remove image ${index + 1}`} className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-black/65 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100 group-focus-within:opacity-100"><X className="size-3.5" /></button></div>)}{images.length < 9 ? <label className="flex aspect-square min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-muted/20 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/40 focus-within:ring-2 focus-within:ring-ring"><input type="file" accept="image/*" multiple className="sr-only" aria-label="Add more product images" onChange={async event => { const files = Array.from(event.target.files ?? []).slice(0, 9 - images.length); for (const file of files) await handleImageUpload(file, 'gallery'); event.target.value = ''; }} /><Plus className="size-5" /><span>Add images</span></label> : null}</div><p className="text-[11px] text-muted-foreground">The first image is the main image. Images appear in this order on supported channels.</p></>}
                {images.length > 0 ? <details className="group rounded-lg border"><summary className="flex min-h-11 cursor-pointer list-none items-center px-4 text-sm font-medium">Image accessibility text<Badge variant="outline" className="ml-auto">{images.length}</Badge><ChevronRight className="ml-2 size-4 transition-transform group-open:rotate-90" /></summary><div className="space-y-2 border-t p-4">{images.map((url, index) => <div key={`${url}-distribution-alt`} className="flex items-center gap-3"><img src={url} alt="" className="size-10 rounded-md border object-cover" /><Input value={imageAltTexts[index] ?? ''} maxLength={125} onChange={event => setImageAltTexts(current => { const next = [...current]; next[index] = event.target.value; return next; })} placeholder={`Describe image ${index + 1}`} aria-label={`Alt text for image ${index + 1}`} className="h-9 text-xs" /></div>)}</div></details> : null}
              </CardContent>
            </Card> : null}

            {/* Sales Channels */}
            <Card id="product-section-channels" className={cn('border-primary/20', activeSection !== 'distribution' && 'hidden')}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><CardTitle className="flex items-center gap-2 text-sm"><Globe2 className="size-4 text-primary" />Sales Channels</CardTitle><p className="mt-1.5 text-xs leading-5 text-muted-foreground">Create one listing for each connected store. Product variants are included and managed inside each listing.</p></div>
                  <Button type="button" disabled={!existingProduct || isDirty} onClick={openChannelListingSetup}><Plus className="size-4" />Create channel listings</Button>
                </div>
              </CardHeader>
              <CardContent>
                {!existingProduct || isDirty ? <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" /><div><p className="font-semibold">A saved Product Master revision is required</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Save the current changes before creating channel listings. Listings inherit data from the last saved revision.</p></div></div> : null}
                {Object.values(channelOverrides).every(channel => !channel.enabled) ? <div className="flex min-h-28 w-full items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/20 px-4 text-center text-sm text-muted-foreground"><Radio className="size-5" /><span><strong className="block text-foreground">No channel listings configured</strong><span className="mt-1 block text-xs">Choose connected stores and configure their listing details without leaving this Product Master.</span></span></div> : <div className="space-y-3">{OVERRIDE_CHANNELS.filter(channel => channelOverrides[channel.key].enabled).map(channel => { const override = channelOverrides[channel.key]; const ChannelIcon = channel.icon; const complete = channelSetupComplete(channel.key, override); const listing = existingProduct?.channels.find(item => item.channel === listingChannelByOverride[channel.key]); const includedVariantCount = form.has_variants ? selectedVariantItems.length : 1; return <div key={channel.key} className="flex min-h-20 w-full flex-wrap items-center gap-3 rounded-lg border p-3"><span className={cn('grid size-9 place-items-center rounded-lg', channel.iconClassName)}><ChannelIcon className="size-4" /></span><span className="min-w-[180px] flex-1"><span className="flex flex-wrap items-center gap-x-2 gap-y-1"><strong className="text-sm">{channel.label}</strong>{channel.account ? <span className="truncate text-xs text-muted-foreground">{channel.account}</span> : null}</span><span className="mt-1 block truncate text-xs text-muted-foreground"><span className="font-medium text-foreground/80">Parent listing SKU:</span> <span className="font-mono">{override.listing_sku || 'Not configured'}</span></span><span className="mt-1 block text-[11px] text-muted-foreground">{form.has_variants ? `${includedVariantCount} variant${includedVariantCount === 1 ? '' : 's'} included` : 'Single sellable SKU'} · {listing?.last_synced_at ? `Published ${new Date(listing.last_synced_at).toLocaleDateString()}` : 'Not published yet'}</span></span><span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', complete ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300')}>{complete ? 'Ready' : 'Needs setup'}</span><Button type="button" variant="outline" size="sm" onClick={() => setEditingChannel(channel.key)}>Manage listing<ChevronRight className="size-3.5" /></Button><DropdownMenu><DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="icon" className="size-9 shrink-0" aria-label={`More actions for ${channel.label}`}><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-52"><DropdownMenuLabel>Listing actions</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onSelect={() => setChannelRemovalTarget(channel.key)}><Trash2 className="size-4" />{listing?.last_synced_at ? 'Unpublish and remove' : 'Remove listing'}</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>; })}</div>}
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
            <Card id="product-section-basic" className={cn(activeSection !== 'product-data' && 'hidden')}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm"><Package className="size-4 text-primary" />Basic information</CardTitle>
                <p className="text-xs leading-5 text-muted-foreground">Core identity, category and customer-facing product information.</p>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
                  <div className="sm:col-span-6">
                    <Field label={copy.skuCode} required error={errors.sku_code}>
                      <div className="relative">
                        <Input value={form.sku_code} onChange={e => setField('sku_code', e.target.value.toUpperCase())} placeholder={copy.skuPlaceholder} className={cn('font-mono uppercase', masterSkuLocked && 'pr-9 bg-muted/30')} readOnly={masterSkuLocked} aria-readonly={masterSkuLocked} aria-describedby={masterSkuLocked ? 'master-sku-lock-reason' : undefined} />
                        {masterSkuLocked ? <Lock className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /> : null}
                      </div>
                      {masterSkuLocked ? <div id="master-sku-lock-reason" className="flex flex-wrap items-center justify-between gap-1.5 text-xs"><span className="text-muted-foreground">Locked because linked records must be reviewed before changing it.</span><button type="button" onClick={openMasterSkuChange} className="font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Change Master SKU</button></div> : existingProduct ? <p className="text-xs text-muted-foreground">Editable while this draft has no inventory or channel listings.</p> : null}
                    </Field>
                  </div>
                  <div className="sm:col-span-6">
                    <Field label={`${copy.productName}${contentLocale !== 'en-US' ? ` · ${contentLocale}` : ''}`} required={contentLocale === 'en-US'} error={contentLocale === 'en-US' ? errors.name : undefined}>
                    <Input id="product-name" value={displayedProductName} onChange={e => updateProductName(e.target.value)} placeholder={contentLocale === 'en-US' ? copy.namePlaceholder : form.name || copy.namePlaceholder} minLength={3} maxLength={120} />
                    {contentLocale !== 'en-US' && !displayedProductName ? <p className="text-xs text-muted-foreground">Empty translation. The English canonical value will be used as fallback.</p> : null}
                    </Field>
                  </div>
                  <div className="sm:col-span-6">
                    <Field label={copy.category} required error={errors.category}>
                      <Button id="product-category-trigger" type="button" variant="outline" className="w-full justify-between font-normal" onClick={() => { setPendingCategory(form.category); setCategoryOpen(true); }} aria-haspopup="dialog"><span className={form.category ? '' : 'text-muted-foreground'}>{form.category || copy.selectCategory}</span><ChevronRight className="size-4 rotate-90" /></Button>
                      {selectedCatalogCategory ? <div className="space-y-1 text-xs text-muted-foreground"><p>{categoryPath.join(' / ')}</p><p>{requiredCategoryAttributes.length} required {requiredCategoryAttributes.length === 1 ? 'attribute' : 'attributes'}</p></div> : null}
                    </Field>
                  </div>
                  <div className="sm:col-span-6">
                    <Field label="Default condition">
                      <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={form.condition} onChange={e => setField('condition', e.target.value)}>
                        {CONDITIONS.map(c => <option key={c} value={c}>{conditionLabels[c as keyof typeof conditionLabels]}</option>)}
                      </select>
                    </Field>
                  </div>
                  <div className="sm:col-span-12">
                    <Field label={`${copy.description}${contentLocale !== 'en-US' ? ` · ${contentLocale}` : ''}`} required={contentLocale === 'en-US'}>
                      <Textarea id="product-description" value={displayedProductDescription} onChange={e => updateProductDescription(e.target.value)} placeholder={contentLocale === 'en-US' ? copy.descriptionPlaceholder : form.description || copy.descriptionPlaceholder} rows={2} className="min-h-16 resize-y" />
                      {contentLocale === 'en-US' ? <p className="text-xs text-muted-foreground">Use at least 100 characters for readiness.</p> : null}
                      {contentLocale !== 'en-US' && !displayedProductDescription ? <p className="text-xs text-muted-foreground">Empty translation. The English canonical description will be used as fallback.</p> : null}
                    </Field>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 border-t pt-5 sm:grid-cols-2">
                  <Field label="Brand"><BrandReferencePicker brands={catalogBrands} brandId={form.brandId} brandName={form.brand} onSelect={brand => setForm(current => ({ ...current, brand: brand?.name ?? '', brandId: brand?.id ?? '' }))} onCreate={createCanonicalBrand} /></Field>
                  <Field label="GTIN / Barcode"><Input value={form.gtin} onChange={e => setField('gtin', e.target.value)} placeholder={copy.gtinPlaceholder} inputMode="numeric" /></Field>
                </div>
                <div className="overflow-hidden rounded-lg border">
                  <button type="button" aria-expanded={advancedIdentityOpen} onClick={() => setAdvancedIdentityOpen(open => !open)} className="flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm font-medium transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"><ChevronDown className={cn('size-4 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none', advancedIdentityOpen ? 'rotate-180' : '')} /><span>More identifiers</span><span className="ml-auto text-xs font-normal text-muted-foreground">Manufacturer, MPN and model</span></button>
                  {advancedIdentityOpen ? <div className="grid grid-cols-1 gap-4 border-t bg-muted/10 p-4 md:grid-cols-3"><Field label="Manufacturer"><Input value={form.manufacturer} onChange={e => setField('manufacturer', e.target.value)} placeholder={copy.manufacturerPlaceholder} /></Field><Field label="MPN"><Input value={form.mpn} onChange={e => setField('mpn', e.target.value)} placeholder={copy.mpnPlaceholder} /></Field><Field label="Model number"><Input value={form.model_number} onChange={e => setField('model_number', e.target.value)} placeholder={copy.modelPlaceholder} /></Field></div> : null}
                </div>
                <section className="mt-5 space-y-4 border-t pt-5" aria-labelledby="product-attributes-title">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><h3 id="product-attributes-title" className="text-sm font-semibold">Product attributes</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Fields are loaded automatically from the selected category.</p></div>
                    {missingRequiredCategoryAttributes.length ? <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50">{missingRequiredCategoryAttributes.length} required {missingRequiredCategoryAttributes.length === 1 ? 'field' : 'fields'} missing</Badge> : requiredCategoryAttributes.length ? <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50">Required fields complete</Badge> : null}
                  </div>
                  {!form.category ? <div className="rounded-lg border border-dashed bg-muted/10 px-4 py-5 text-center"><p className="text-sm font-medium">Attributes will appear after selecting a category</p><p className="mt-1 text-xs text-muted-foreground">Use the Product category field above to load its required attributes.</p></div> : categoryAttributesForProduct.length ? <div className="divide-y overflow-hidden rounded-lg border">{categoryAttributesForProduct.map(attribute => { const spec = specificationForAttribute(attribute); const managedGroup = form.has_variants ? variantGroups.find(group => group.name.trim().toLowerCase() === attribute.name.trim().toLowerCase()) : undefined; const missingRequired = attribute.required && !spec?.value.trim() && !managedGroup?.values.length; return <div key={attribute.key} className="grid gap-3 p-4 sm:grid-cols-[minmax(150px,0.7fr)_minmax(0,1.3fr)] sm:items-start"><div><div className="flex items-center gap-2"><Label htmlFor={`product-attribute-${attribute.key}`} className="text-sm font-semibold">{attribute.name}</Label>{managedGroup ? <Badge variant="outline" className="border-primary/30 bg-primary/5 text-[10px] text-primary">Variant attribute</Badge> : attribute.required ? <span className="text-xs font-semibold text-destructive">Required</span> : <span className="text-xs text-muted-foreground">Optional</span>}</div><p className="mt-1 text-xs text-muted-foreground">{attribute.type}</p></div><div className="space-y-1.5" id={`product-attribute-${attribute.key}`}>{managedGroup ? <div className="flex min-h-10 flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2"><div><p className="text-sm font-medium">Managed by variants</p><p className="mt-0.5 text-xs text-muted-foreground">{managedGroup.values.length ? managedGroup.values.join(', ') : 'Add at least one value in Commerce'}</p></div><Button type="button" variant="ghost" size="sm" onClick={() => selectWorkspace('commerce')}>Manage variants<ChevronRight className="size-3.5" /></Button></div> : <><DynamicAttributeValueControl attribute={attribute} value={spec?.value ?? ''} onChange={nextValue => setSpecifications(current => current.map(item => item.attributeKey === attribute.key || (!item.attributeKey && item.name.toLowerCase() === attribute.name.toLowerCase()) ? { ...item, attributeKey: attribute.key, name: attribute.name, value: nextValue } : item))} />{missingRequired ? <p className="text-xs font-medium text-destructive">Enter a value before saving.</p> : attribute.required && attribute.validation ? <p className="text-xs text-muted-foreground">{attribute.validation}</p> : null}</>}</div></div>; })}</div> : <div className="rounded-lg border border-dashed bg-muted/10 px-4 py-5 text-center"><p className="text-sm font-medium">No additional attributes required</p><p className="mt-1 text-xs text-muted-foreground">This category does not require extra product information.</p></div>}

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4"><div><p className="text-xs font-medium">Attribute setup</p><p className="mt-1 text-xs text-muted-foreground">Changes open in Catalog Setup. Save there to return to this product.</p></div><DropdownMenu><DropdownMenuTrigger asChild><Button type="button" variant="outline" size="sm" disabled={!form.category || !canWrite}>Manage attribute setup<ChevronDown className="size-3.5" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-80"><DropdownMenuLabel>Manage {form.category || 'category'} attributes</DropdownMenuLabel>{categoryAttributesForProduct.filter(attribute => attribute.type === 'Single select' || attribute.type === 'Multi-select').map(attribute => <DropdownMenuItem key={attribute.key} className="min-h-14 items-start gap-3" onSelect={() => openAttributeSetup({ attribute: attribute.key })}><Tags className="mt-0.5 size-4 shrink-0 text-primary" /><span><span className="block font-medium">Edit {attribute.name} values</span><span className="mt-0.5 block text-xs leading-4 text-muted-foreground">Add or edit selectable values used across products.</span></span><ChevronRight className="ml-auto mt-0.5 size-3.5 shrink-0 text-muted-foreground" /></DropdownMenuItem>)}{categoryAttributesForProduct.some(attribute => attribute.type === 'Single select' || attribute.type === 'Multi-select') ? <DropdownMenuSeparator /> : null}<DropdownMenuItem className="min-h-14 items-start gap-3" onSelect={() => openAttributeSetup({ category: form.category })}><Layers className="mt-0.5 size-4 shrink-0 text-primary" /><span><span className="block font-medium">Manage attributes for {form.category}</span><span className="mt-0.5 block text-xs leading-4 text-muted-foreground">Assign fields and set which ones are required.</span></span><ChevronRight className="ml-auto mt-0.5 size-3.5 shrink-0 text-muted-foreground" /></DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>
                </section>
              </CardContent>
            </Card>

            {activeSection === 'commerce' ? <Card id="product-markets" className="order-2">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm"><Globe2 className="size-4 text-primary" />{form.has_variants ? 'Base prices by market' : 'Prices by market'}</CardTitle>
                <p className="text-xs leading-5 text-muted-foreground">{form.has_variants ? 'Set the default price used when creating new variant SKUs in each market.' : 'Set the Product Master price for each market.'} Channel-specific adjustments are configured in each listing.</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="overflow-hidden rounded-lg border">
                  <div className="hidden grid-cols-[minmax(140px,1fr)_90px_minmax(140px,0.8fr)_90px] gap-3 border-b bg-muted/30 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:grid">
                    <span>Market</span><span>Currency</span><span>{form.has_variants ? 'Base price' : 'Market price'}</span><span>Status</span>
                  </div>
                  {COMMERCE_MARKETS.map(market => {
                    const value = marketPrices.find(item => item.market === market.market)!;
                    return <div key={market.market} className="grid gap-3 border-b p-4 last:border-b-0 sm:grid-cols-[minmax(140px,1fr)_90px_minmax(140px,0.8fr)_90px] sm:items-center">
                      <div><p className="text-sm font-semibold">{market.label}</p><p className="text-xs text-muted-foreground">{market.market}</p></div>
                      <span className="text-sm font-medium">{market.currency}</span>
                      <Input aria-label={`${market.label} ${form.has_variants ? 'base' : 'market'} price`} type="number" min="0" value={value.price || ''} disabled={!value.enabled} placeholder="0" onChange={event => setMarketPrices(current => current.map(item => item.market === market.market ? { ...item, price: num(event.target.value) } : item))} />
                      <button type="button" role="switch" aria-checked={value.enabled} aria-label={`${value.enabled ? 'Disable' : 'Enable'} ${market.label} market`} onClick={() => setMarketPrices(current => current.map(item => item.market === market.market ? { ...item, enabled: !item.enabled } : item))} className={cn('rounded-full px-2.5 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', value.enabled ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground')}>{value.enabled ? 'Available' : 'Disabled'}</button>
                    </div>;
                  })}
                </div>
                <div className="flex items-start gap-2 rounded-lg bg-muted/30 p-3 text-xs leading-5 text-muted-foreground"><Info className="mt-0.5 size-3.5 shrink-0" /><span>{form.has_variants ? 'These prices initialize new variants only. After creation, edit the selling price for each SKU in the variant matrix.' : 'These prices belong to the Product Master.'} Shopee, Amazon and other listing adjustments do not change them.</span></div>
                {OVERRIDE_CHANNELS.some(channel => channelOverrides[channel.key].enabled) ? <div className="space-y-2 border-t pt-3"><p className="text-xs font-semibold">Channel price adjustments</p>{OVERRIDE_CHANNELS.filter(channel => channelOverrides[channel.key].enabled).map(channel => <div key={channel.key} className="flex min-h-9 items-center gap-3 rounded-md border px-3 text-xs"><span className="font-medium">{channel.label}</span><span className="ml-auto text-muted-foreground">{num(channelOverrides[channel.key].price_markup) ? `${num(channelOverrides[channel.key].price_markup) > 0 ? '+' : ''}${channelOverrides[channel.key].price_markup}% override` : 'Uses canonical price'}</span></div>)}</div> : null}
              </CardContent>
            </Card> : null}

            {/* Variant setup and pricing */}
            <Card id="product-section-pricing" className={cn('order-1', activeSection !== 'commerce' && 'hidden')}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm"><Layers className="size-4 text-primary" />{form.has_variants ? 'Variants & Pricing' : 'Pricing & Inventory'}</CardTitle>
                <p className="text-xs leading-5 text-muted-foreground">{form.has_variants ? 'Configure the variant attributes, SKU matrix and pricing for this Product Master.' : 'Configure the canonical price and inventory for this single-SKU Product Master.'}</p>
              </CardHeader>
              <CardContent className="space-y-5">
                {form.has_variants ? <section className="space-y-4" aria-labelledby="variant-attributes-title">
                  <div className="flex items-start justify-between gap-3"><div><h3 id="variant-attributes-title" className="text-sm font-semibold">Variant options</h3><p className="mt-1 text-xs text-muted-foreground">Select the Color, Size or other category values that create sellable SKUs.</p></div><span className="shrink-0 text-xs tabular-nums text-muted-foreground">{variantGroups.length} of 2</span></div>
                  <VariantSection
                    groups={variantGroups}
                    onGroupsChange={setVariantGroups}
                    items={variantItems}
                    onItemsChange={setVariantItems}
                    parentSku={form.sku_code}
                    basePrice={String(marketPrices.find(market => market.enabled && market.currency === form.price_currency)?.price || num(form.retail_price) || '')}
                    currency={form.price_currency}
                    existingSkus={existingSkuList}
                    availableAttributes={categoryAttributesForProduct.filter(attribute => (attribute.type === 'Single select' || attribute.type === 'Multi-select') && attribute.options.trim()).map(attribute => ({ key: attribute.key, name: attribute.name, options: attribute.options.split(',').map(option => option.trim()).filter(Boolean) }))}
                    onManageAttribute={key => openAttributeSetup({ attribute: key })}
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
                  />
                </section> : null}

                {!form.has_variants ? <section className="space-y-4 border-t pt-5" aria-labelledby="product-pricing-title">
                  <div><h3 id="product-pricing-title" className="text-sm font-semibold">Pricing</h3></div>
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
              </CardContent>
            </Card>

            {activeSection === 'commerce' && !form.has_variants ? <Card>
              <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><Package className="size-4 text-primary" />Inventory by location</CardTitle><p className="text-xs leading-5 text-muted-foreground">Set the available stock for this single-SKU Product Master.</p></CardHeader>
              <CardContent className="space-y-2">{WAREHOUSES.map(warehouse => <div key={warehouse.id} className="grid min-h-12 grid-cols-[minmax(0,1fr)_120px] items-center gap-3 rounded-lg border px-3"><div><p className="text-sm font-medium">{warehouse.label}</p><p className="text-xs text-muted-foreground">{warehouse.code}</p></div><div className="flex items-center gap-2"><Input aria-label={`${warehouse.label} available stock`} value={inventory[warehouse.id] ?? '0'} onChange={event => setInventory(current => ({ ...current, [warehouse.id]: event.target.value }))} type="number" min="0" className="h-8 text-right font-mono text-xs" /><span className="text-xs text-muted-foreground">{copy.units}</span></div></div>)}<div className="flex items-center justify-between border-t pt-3 text-sm"><span className="text-muted-foreground">{copy.totalStock}</span><strong>{formatLocalizedNumber(locale, totalStock)} {copy.units}</strong></div></CardContent>
            </Card> : null}

            {/* Shipping & Logistics */}
            <Card id="product-section-shipping" className={cn(activeSection !== 'product-data' && 'hidden')}>
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
            <Card id="product-section-more" className={cn(activeSection !== 'product-data' && 'hidden')}>
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

            {activeSection === 'activity' ? <Card>
              <CardHeader><CardTitle className="text-base">Version history</CardTitle><p className="text-xs leading-5 text-muted-foreground">Review canonical publication history. Published revisions cannot be edited.</p></CardHeader>
              <CardContent className="space-y-4">
                <button type="button" onClick={() => setRevisionDetail(null)} aria-pressed={!revisionDetail} className={cn('flex min-h-16 w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', !revisionDetail ? 'border-primary/40 bg-primary/5' : 'hover:bg-muted/30')}><span className="grid size-9 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">D</span><div className="min-w-0 flex-1"><p className="text-sm font-semibold">Current draft</p><p className="text-xs text-muted-foreground">Updated {new Date(existingProduct?.updated_at ?? Date.now()).toLocaleString()}</p></div><Badge>Current</Badge></button>
                {versionHistoryEntries.length ? <div className="overflow-hidden rounded-lg border"><div className="grid grid-cols-3 gap-3 border-b bg-muted/20 px-4 py-3 text-xs"><div><p className="text-muted-foreground">Published revisions</p><p className="mt-1 text-lg font-semibold text-foreground">{versionHistoryEntries.length}</p></div><div><p className="text-muted-foreground">Latest revision</p><p className="mt-1 text-lg font-semibold text-foreground">v{versionHistoryEntries.at(-1)?.number}</p></div><div><p className="text-muted-foreground">Last published by</p><p className="mt-1 truncate text-sm font-semibold text-foreground">{versionHistoryEntries.at(-1)?.createdBy}</p></div></div><div className="divide-y">{[...versionHistoryEntries].reverse().map(revision => <button type="button" key={revision.id} onClick={() => setRevisionDetail(revision)} aria-pressed={revisionDetail?.id === revision.id} className={cn('flex min-h-20 w-full items-center gap-3 p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring', revisionDetail?.id === revision.id ? 'bg-primary/5' : 'hover:bg-muted/30')}><span className={cn('grid size-10 shrink-0 place-items-center rounded-full border bg-background text-xs font-bold', revisionDetail?.id === revision.id && 'border-primary text-primary')}>v{revision.number}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{revision.summary}</p><Badge variant={revision.status === 'restored' ? 'secondary' : 'outline'}>{revision.status === 'restored' ? 'Restored' : 'Published'}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{revision.createdBy} · {new Date(revision.createdAt).toLocaleString()}</p><p className="mt-1 truncate text-[11px] text-muted-foreground">{revision.changes.join(' · ')}</p></div><ChevronRight className="size-4 shrink-0 text-muted-foreground" /></button>)}</div></div> : <div className="rounded-lg border border-dashed p-8 text-center"><p className="text-sm font-semibold">No published revisions yet</p><p className="mt-1 text-xs text-muted-foreground">Complete readiness and publish the Product Master to create revision 1.</p></div>}
                <div className="rounded-lg bg-muted/30 p-3 text-xs leading-5 text-muted-foreground"><strong className="text-foreground">Channel activity is separate.</strong> Publishing a Product Master revision does not automatically publish marketplace listings.</div>
              </CardContent>
            </Card> : null}
          </div>

          {/* Right Column */}
          <div data-editor-fields className="space-y-5 xl:sticky xl:top-20 xl:h-fit">

            {activeSection === 'activity' ? <Card>
              <CardHeader className="pb-3"><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-base">{revisionDetail ? `Revision ${revisionDetail.number}` : 'Current draft'}</CardTitle><p className="mt-1 text-xs leading-5 text-muted-foreground">{revisionDetail ? 'Read-only Product Master snapshot' : 'Latest editable Product Master state'}</p></div>{revisionDetail ? <Badge variant={revisionDetail.status === 'restored' ? 'secondary' : 'outline'}>{revisionDetail.status === 'restored' ? 'Restored' : 'Published'}</Badge> : <Badge>Current</Badge>}</div></CardHeader>
              <CardContent className="space-y-4">
                {revisionDetail ? <><div className="grid gap-3 rounded-lg border bg-muted/20 p-4"><div><p className="text-xs text-muted-foreground">Published by</p><p className="mt-1 text-sm font-semibold">{revisionDetail.createdBy}</p></div><div><p className="text-xs text-muted-foreground">Published at</p><p className="mt-1 text-sm">{new Date(revisionDetail.createdAt).toLocaleString()}</p></div></div><div><p className="text-sm font-semibold">Summary</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{revisionDetail.summary}</p></div><div><p className="text-sm font-semibold">Changes in this revision</p><ul className="mt-2 space-y-2">{revisionDetail.changes.map(change => <li key={change} className="flex items-start gap-2 text-sm text-muted-foreground"><CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" /><span>{change}</span></li>)}</ul></div><div className="rounded-lg bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">Channel listing changes are not included in this Product Master revision.</div></> : <><div className="grid gap-3 rounded-lg border bg-muted/20 p-4"><div><p className="text-xs text-muted-foreground">Master SKU</p><p className="mt-1 font-mono text-sm font-semibold">{form.sku_code || 'Not assigned'}</p></div><div><p className="text-xs text-muted-foreground">Last updated</p><p className="mt-1 text-sm">{new Date(existingProduct?.updated_at ?? Date.now()).toLocaleString()}</p></div></div><div><p className="text-sm font-semibold">Draft status</p><p className="mt-1 text-sm leading-6 text-muted-foreground">This draft can still be edited. Run readiness checks and publish it to create the next immutable revision.</p></div><Button type="button" variant="outline" className="w-full" onClick={() => selectWorkspace('overview')}>Review readiness</Button></>}
              </CardContent>
            </Card> : null}

            <Card className={cn(activeSection === 'activity' && 'hidden')}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-2 text-sm"><CircleAlert className="size-4 text-amber-500" />Product readiness</CardTitle><p className="mt-1 text-xs leading-5 text-muted-foreground">Requirements across the entire Product Master.</p></div><span className="text-xs font-semibold tabular-nums text-muted-foreground">{completionChecks.filter(check => check.done).length}/{completionChecks.length}</span></div>
                <Progress value={completion} className="mt-3 h-1.5" aria-label={`${completion}% of product requirements complete`} />
              </CardHeader>
              <CardContent className="space-y-3">
                {completionChecks.some(check => !check.done) ? <ul className="space-y-1">{completionChecks.filter(check => !check.done).map(check => { const workspace = completionWorkspaceFor(check.id); return <li key={check.id}><button type="button" onClick={() => openCompletionItem(check.id)} className="flex min-h-11 w-full items-start gap-2 rounded-md px-2 py-2 text-left text-xs leading-5 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="mt-1.5 size-2 shrink-0 rounded-full bg-amber-400" /><span className="min-w-0 flex-1"><span className="block text-[10px] font-semibold uppercase tracking-wide text-primary">{workspace.label}</span><span className="block">{check.label}</span></span><ChevronRight className="mt-2 size-3.5 shrink-0" /></button></li>; })}</ul> : <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-xs font-medium text-emerald-700"><CircleCheck className="size-4" />Ready to publish.</div>}
              </CardContent>
            </Card>

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
                      <div key={url} className="relative aspect-square rounded-md overflow-hidden border">
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
                  <p className={cn('mt-2 flex items-center gap-1.5 text-[11px]', images.length >= 3 ? 'text-emerald-600' : 'text-muted-foreground')}>
                    {images.length >= 3 ? <CircleCheck className="size-3.5" /> : <Circle className="size-3.5" />}
                    {images.length >= 3 ? 'Minimum image requirement met' : `${images.length} of 3 minimum images added`}
                  </p>
                </div>
                {images.length > 0 ? <div className="space-y-2 border-t pt-3"><p className="text-xs font-medium">Image alt text</p>{images.map((url, index) => <div key={`${url}-alt`} className="flex items-center gap-2"><img src={url} alt="" className="size-8 rounded border object-cover" /><Input value={imageAltTexts[index] ?? ''} maxLength={125} onChange={event => setImageAltTexts(current => { const next = [...current]; next[index] = event.target.value; return next; })} placeholder={`Describe image ${index + 1}`} aria-label={`Alt text for image ${index + 1}`} className="h-8 text-xs" /></div>)}</div> : null}
              </CardContent>
            </Card>

          </div>
        </div>
      </div>

      <ChannelListingWizard
        open={channelListingWizardOpen}
        onOpenChange={setChannelListingWizardOpen}
        channels={OVERRIDE_CHANNELS}
        drafts={channelListingDrafts}
        masterSku={form.sku_code}
        productName={form.name}
        productCategory={form.category}
        availableStock={totalStock}
        imageCount={images.length}
        productType={form.product_type}
        existingMatches={existingListingMatches}
        onChange={(channel, patch) => setChannelListingDrafts(current => ({
          ...current,
          [channel]: { ...current[channel as OverrideChannel], ...patch },
        }))}
        onSubmitted={() => {
          setChannelOverrides(Object.fromEntries(Object.entries(channelListingDrafts).map(([key, value]) => [key, { ...value }])) as Record<OverrideChannel, ChannelOverrideForm>);
          toast({ title: 'Channel listing drafts created', description: 'Review readiness and provider validation before publishing.' });
        }}
      />

      <ChannelListingEditorDrawer
        open={editingChannel !== null}
        onOpenChange={open => { if (!open) setEditingChannel(null); }}
        channel={editingChannel ? OVERRIDE_CHANNELS.find(channel => channel.key === editingChannel) ?? null : null}
        draft={editingChannel ? channelOverrides[editingChannel] : null}
        masterSku={form.sku_code}
        productVariants={listingEditorVariants}
        onSave={patch => {
          if (!editingChannel) return;
          setChannelOverrides(current => ({
            ...current,
            [editingChannel]: { ...current[editingChannel], ...patch },
          }));
          toast({ title: 'Listing draft updated', description: 'The Product Master remains unchanged.' });
        }}
      />

      <ConfirmDialog
        open={channelRemovalTarget !== null}
        onOpenChange={open => { if (!open) setChannelRemovalTarget(null); }}
        title={channelRemovalTarget ? `Remove ${OVERRIDE_CHANNELS.find(channel => channel.key === channelRemovalTarget)?.label ?? 'channel'} listing?` : 'Remove channel listing?'}
        description={<span className="space-y-2"><span className="block">This removes the channel-specific setup from this Product Master. Product data, variants, prices and inventory will not be deleted.</span><span className="block font-medium text-foreground">You can create the listing again later.</span></span>}
        confirmText="Remove listing"
        cancelText="Keep listing"
        variant="destructive"
        onConfirm={() => {
          if (!channelRemovalTarget) return;
          const channel = OVERRIDE_CHANNELS.find(item => item.key === channelRemovalTarget);
          setChannelOverrides(current => ({
            ...current,
            [channelRemovalTarget]: { ...current[channelRemovalTarget], enabled: false },
          }));
          setChannelListingDrafts(current => ({
            ...current,
            [channelRemovalTarget]: { ...current[channelRemovalTarget], enabled: false },
          }));
          if (editingChannel === channelRemovalTarget) setEditingChannel(null);
          setChannelRemovalTarget(null);
          toast({ title: `${channel?.label ?? 'Channel'} listing removed`, description: 'Save the Product Master to keep this change.' });
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
        <DialogContent className="max-h-[85vh] overflow-hidden p-0 sm:max-w-3xl">
          <DialogHeader className="border-b p-5"><DialogTitle>Select product category</DialogTitle><DialogDescription>Choose the most accurate master category. Channel mappings can be configured during publishing.</DialogDescription></DialogHeader>
          <div className="p-5">
            <div className="relative mb-4"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={categorySearch} onChange={event => setCategorySearch(event.target.value)} placeholder="Search categories..." className="pl-9" /></div>
            {categorySearch.trim() ? <div className="max-h-80 space-y-1 overflow-y-auto rounded-lg border p-2">{matchingCategoryPaths.map(item => <button key={`${item.group}-${item.subgroup}-${item.leaf}`} type="button" onClick={() => { setCategoryLevelOne(item.group); setCategoryLevelTwo(item.subgroup); setPendingCategory(item.leaf); }} className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-muted ${pendingCategory === item.leaf ? 'bg-primary/10 text-primary' : ''}`}><span>{item.group} / {item.subgroup} / <strong>{item.leaf}</strong></span>{pendingCategory === item.leaf ? <Check className="size-4" /> : null}</button>)}</div> : <div className="grid min-h-72 grid-cols-1 overflow-hidden rounded-lg border sm:grid-cols-3">
              <div className="border-b p-2 sm:border-b-0 sm:border-r">{categoryTree.map(group => <button key={group.label} type="button" onClick={() => { setCategoryLevelOne(group.label); setCategoryLevelTwo(group.children[0].label); }} className={`flex min-h-11 w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${categoryLevelOne === group.label ? 'bg-primary/10 font-semibold text-primary' : 'hover:bg-muted'}`}>{group.label}<ChevronRight className="size-4" /></button>)}</div>
              <div className="border-b p-2 sm:border-b-0 sm:border-r">{selectedCategoryGroup.children.map(group => <button key={group.label} type="button" onClick={() => setCategoryLevelTwo(group.label)} className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${categoryLevelTwo === group.label ? 'bg-primary/10 font-semibold text-primary' : 'hover:bg-muted'}`}>{group.label}<ChevronRight className="size-4" /></button>)}</div>
              <div className="p-2">{selectedCategorySubgroup.children.map(category => <button key={category} type="button" onClick={() => setPendingCategory(category)} className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${pendingCategory === category ? 'bg-primary/10 font-semibold text-primary' : 'hover:bg-muted'}`}>{category}{pendingCategory === category ? <Check className="size-4" /> : null}</button>)}</div>
            </div>}
          </div>
          <div className="flex flex-col gap-3 border-t p-5 sm:flex-row sm:items-center"><p className="mr-auto truncate text-xs text-muted-foreground">Selected: <strong className="text-foreground">{pendingCategory || 'None'}</strong></p><Button variant="outline" onClick={() => setCategoryOpen(false)}>Cancel</Button><Button disabled={!pendingCategory} onClick={() => { setField('category', pendingCategory); setCategoryOpen(false); setCategorySearch(''); }}>Confirm Category</Button></div>
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
      <Dialog open={readinessReviewOpen} onOpenChange={setReadinessReviewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Review product readiness</DialogTitle><DialogDescription>Complete these master-data requirements, save the draft, then run the check again.</DialogDescription></DialogHeader>
          <div className="max-h-[55vh] space-y-2 overflow-y-auto py-2" role="status">
            {completionChecks.map(check => <button key={check.id} type="button" onClick={() => { setReadinessReviewOpen(false); openCompletionItem(check.id); }} className="flex min-h-12 w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {check.done ? <CircleCheck className="size-5 shrink-0 text-emerald-600" /> : <CircleAlert className="size-5 shrink-0 text-amber-600" />}
              <span className={`text-sm ${check.done ? 'text-muted-foreground' : 'font-semibold text-foreground'}`}>{check.label}</span>
              <ChevronRight className="ml-auto size-4 text-muted-foreground" />
            </button>)}
          </div>
          <div className="flex justify-end gap-2 border-t pt-4"><Button variant="outline" onClick={() => setReadinessReviewOpen(false)}>Close</Button><Button disabled={isDirty || !completionChecks.every(check => check.done)} onClick={() => { setReadinessReviewOpen(false); checkReadiness(); }}>Run check again</Button></div>
        </DialogContent>
      </Dialog>
      <Dialog open={publishConfirmationOpen} onOpenChange={setPublishConfirmationOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Publish this Product revision?</DialogTitle><DialogDescription>The saved master data becomes the current canonical revision. Marketplace listings will not be submitted automatically.</DialogDescription></DialogHeader>
          <div className="rounded-lg border bg-muted/30 p-4 text-sm"><div className="flex items-center justify-between"><span className="text-muted-foreground">Master SKU</span><strong className="font-mono">{form.sku_code}</strong></div></div>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setPublishConfirmationOpen(false)}>Cancel</Button><Button onClick={beginPublish}><CloudUpload className="size-4" />Publish revision</Button></div>
        </DialogContent>
      </Dialog>
      <Dialog open={publishOpen} onOpenChange={open => { if (publishPercent >= 100) setPublishOpen(open); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{publishPercent >= 100 ? 'Product revision published' : 'Publishing Product revision'}</DialogTitle><DialogDescription>{publishPercent >= 100 ? 'The canonical master record is current. Channel listings are ready for their own submission flow.' : 'Prime OS is freezing the reviewed master data into a canonical revision.'}</DialogDescription></DialogHeader>
          <div className="space-y-5 py-2">
            <div><div className="mb-2 flex items-center justify-between text-sm font-semibold"><span>Overall sync progress</span><span className="tabular-nums text-primary">{publishPercent}%</span></div><Progress value={publishPercent} className="h-2.5" /></div>
            <div className="space-y-2">
              {[
                { label: 'Draft snapshot saved', threshold: 24 },
                { label: 'Readiness evidence verified', threshold: 42 },
                { label: 'Product facts frozen', threshold: 68 },
                { label: 'Canonical revision activated', threshold: 86 },
                { label: 'Channel listings queued', threshold: 100 },
              ].map((step, index) => {
                const complete = publishPercent >= step.threshold;
                const active = !complete && (index === 0 || publishPercent >= [0, 24, 42, 68, 86][index]);
                return <div key={step.label} className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
                  {complete ? <CircleCheck className="size-4 text-emerald-600" /> : active ? <Loader2 className="size-4 animate-spin text-primary" /> : <CircleAlert className="size-4 text-muted-foreground/50" />}
                  <span className={`text-sm ${complete ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{step.label}</span>
                  <span className="ml-auto text-xs tabular-nums text-muted-foreground">{complete ? '100%' : active ? 'Syncing…' : 'Queued'}</span>
                </div>;
              })}
            </div>
            {publishPercent >= 100 ? <div className="flex justify-end"><Button onClick={() => { setPublishOpen(false); navigate('/products/master-catalog'); }}>Return to Product Master</Button></div> : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
