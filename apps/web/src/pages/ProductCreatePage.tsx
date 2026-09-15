import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import {
  ArrowLeft, Info, Image, Package, Truck, Layers, Check, Lock,
  Plus, X, Trash2, AlertTriangle, Upload, Loader2, Boxes, PackageCheck,
  Globe2, CircleCheck, CircleAlert, CloudUpload, Search, ChevronDown, ChevronRight, Save,
  ShoppingBag, Store, MonitorSmartphone, MessageSquare, Radio,
} from 'lucide-react';
import { ConfirmDialog } from '@/components/system/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { addProduct, updateProduct, getProductById, getAllSkus, type Product, type ChannelListing, type ProductType } from '@/lib/product-store';
import { getWarehouses } from '@/lib/warehouse-store';
import type { AmazonVariant } from '@/lib/amazon-catalog';
import { uploadProductImage, validateImageFile } from '@/lib/product-images';
import { useI18n } from '@/lib/i18n/I18nContext';
import { formatLocalizedNumber, formatMessage } from '@/lib/i18n/format';
import { cn } from '@/lib/utils';
import type { ChannelWizardDraft } from '@/components/products/ChannelListingWizard';
import { getActiveCatalogBrands, getActiveCatalogCategories, getAttributesForCategory } from '@/lib/product-catalog-settings-store';

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

interface FormState {
  gtin: string;
  mpn: string;
  model_number: string;
  brand: string;
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
const COUNTRIES = ['JP', 'CN', 'KR', 'US', 'SG', 'MY', 'VN', 'TW', 'TH', 'ID'];
const OVERRIDE_CHANNELS: Array<{
  key: OverrideChannel;
  label: string;
  description: string;
  icon: typeof Globe2;
  iconClassName: string;
}> = [
  { key: 'webstore', label: 'PrimeWeb', description: 'Online storefront', icon: Globe2, iconClassName: 'bg-emerald-50 text-emerald-600' },
  { key: 'pos', label: 'PrimePOS', description: 'Retail outlets', icon: Store, iconClassName: 'bg-violet-50 text-violet-600' },
  { key: 'shopee', label: 'Shopee', description: 'Marketplace', icon: ShoppingBag, iconClassName: 'bg-orange-50 text-orange-600' },
  { key: 'lazada', label: 'Lazada', description: 'Marketplace', icon: ShoppingBag, iconClassName: 'bg-blue-50 text-blue-600' },
  { key: 'tiktok', label: 'TikTok Shop', description: 'Social commerce', icon: MonitorSmartphone, iconClassName: 'bg-slate-100 text-slate-700' },
  { key: 'amazon', label: 'Amazon', description: 'Global marketplace', icon: ShoppingBag, iconClassName: 'bg-amber-50 text-amber-700' },
  { key: 'rakuten', label: 'Rakuten', description: 'Marketplace', icon: ShoppingBag, iconClassName: 'bg-rose-50 text-rose-700' },
  { key: 'social', label: 'Social Inbox', description: 'Chat-assisted sales', icon: MessageSquare, iconClassName: 'bg-sky-50 text-sky-600' },
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
  const groups = new Map<string, Map<string, string[]>>();
  categories.forEach(category => {
    if (!groups.has(category.group)) groups.set(category.group, new Map());
    const parent = category.parent && category.parent !== 'None (root category)' ? category.parent : category.group;
    const children = groups.get(category.group)!;
    children.set(parent, [...(children.get(parent) ?? []), category.name]);
  });
  return Array.from(groups, ([label, children]) => ({ label, children: Array.from(children, ([childLabel, leaves]) => ({ label: childLabel, children: leaves })) }));
}
const PRODUCT_TYPE_ICONS = {
  single: Package,
  variant: Layers,
} satisfies Record<ProductType, typeof PackageCheck>;

const EMPTY_FORM: FormState = {
  gtin: '', mpn: '', model_number: '', brand: '',
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
function slugify(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
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
  parentSku, basePrice, currency, existingSkus, copy,
}: VariantSectionProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [groupInput, setGroupInput] = useState<Record<string, string>>({});
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

  function deleteGroupValue(groupId: string, valIdx: number) {
    onGroupsChange(groups.map(g =>
      g.id === groupId ? { ...g, values: g.values.filter((_, i) => i !== valIdx) } : g
    ));
  }

  function addValueToGroup(groupId: string, val: string) {
    if (!val.trim()) return;
    const normalized = val.trim();
    if (groups.find(g => g.id === groupId)?.values.find(v => v.toLowerCase() === normalized.toLowerCase())) {
      return;
    }
    onGroupsChange(groups.map(g =>
      g.id === groupId ? { ...g, values: [...g.values, normalized] } : g
    ));
    // clear input
    setGroupInput(prev => ({ ...prev, [groupId]: '' }));
  }

  const totalSelected = items.filter(i => i.selected).length;
  const totalCombinations = variantKeys.length;

  return (
    <div className="space-y-4">

        {/* Existing Groups */}
        {groups.map(group => (
          <div key={group.id} className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{group.name}</p>
              <Button variant="ghost" size="icon" className="size-7 text-destructive" onClick={() => deleteGroup(group.id)}>
                <Trash2 className="size-3.5" />
              </Button>
            </div>
            {/* Values */}
            <div className="flex flex-wrap gap-1.5">
              {group.values.map((val, vi) => (
                <span key={vi} className="inline-flex items-center gap-1 bg-muted rounded-full px-2.5 py-0.5 text-xs font-medium">
                  {val}
                  <button
                    onClick={() => deleteGroupValue(group.id, vi)}
                    className="ml-0.5 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="size-2.5" />
                  </button>
                </span>
              ))}
            </div>
            {/* Add value */}
            <div className="flex gap-1.5">
              <Input
                value={groupInput[group.id] ?? ''}
                onChange={e => setGroupInput(prev => ({ ...prev, [group.id]: e.target.value }))}
                placeholder={formatMessage(copy.addValuePlaceholder, { group: group.name })}
                className="h-8 text-xs"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addValueToGroup(group.id, groupInput[group.id] ?? '');
                  }
                }}
              />
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => addValueToGroup(group.id, groupInput[group.id] ?? '')}>
                <Plus className="size-3 mr-0.5" /> {copy.add}
              </Button>
            </div>
          </div>
        ))}

        {/* Add Group */}
        {showAddGroup ? (
          <div className="border border-dashed border-border rounded-lg p-3 space-y-2">
            <Input
              value={addGroupName}
              onChange={e => { setAddGroupName(e.target.value); setErrors({}); }}
              placeholder={copy.addGroupPlaceholder}
              className="h-8 text-xs"
              autoFocus
            />
            {errors.addGroup && <p className="text-xs text-destructive">{errors.addGroup}</p>}
            <div className="flex gap-1.5">
              <Button size="sm" className="h-8 text-xs" onClick={addGroup}>{copy.addAttribute}</Button>
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
            disabled={groups.length >= 2}
          >
            <Plus className="size-3 mr-1" /> {copy.addVariantAttribute}
          </Button>
        )}
        <p className="text-[11px] text-muted-foreground">Up to 2 attributes are supported, for example Color × Size.</p>

        {/* Variant Matrix Summary */}
        {totalCombinations > 0 && (
          <div className="border-t pt-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">
                {formatMessage(copy.variantsWillBeCreated, { count: totalCombinations })}
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
              <div className="grid gap-2 border-b bg-muted/40 p-3 sm:grid-cols-[1fr_1fr_1.2fr_auto]">
                <Field label="Bulk Price"><Input type="number" value={bulkPrice} onChange={event => setBulkPrice(event.target.value)} placeholder="Leave unchanged" className="h-8 text-xs" /></Field>
                <Field label="Bulk Stock"><Input type="number" value={bulkStock} onChange={event => setBulkStock(event.target.value)} placeholder="Leave unchanged" className="h-8 text-xs" /></Field>
                <Field label="SKU Prefix"><Input value={bulkSku} onChange={event => setBulkSku(event.target.value)} placeholder="e.g. SHIRT" className="h-8 text-xs uppercase" /></Field>
                <Button type="button" size="sm" className="self-end" disabled={!bulkPrice && !bulkStock && !bulkSku.trim()} onClick={applyBulkValues}>Apply to all</Button>
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
      additionalImages: 'Additional Images ({count}/9)',
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
      additionalImages: '追加画像 ({count}/9)',
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
      additionalImages: 'Ảnh bổ sung ({count}/9)',
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
    additionalImages: 'Additional Images ({count}/9)',
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
  const existingProduct = editId ? getProductById(editId) : null;
  const existingSkuList = getAllSkus();
  const catalogBrands = useMemo(() => getActiveCatalogBrands(), []);
  const categoryTree = useMemo(() => buildCategoryTree(), []);

  const [inventory, setInventory] = useState<Record<string, string>>(
    existingProduct
      ? Object.fromEntries(Object.entries(existingProduct.inventory).map(([k, v]) => [k, String(v)]))
      : Object.fromEntries(WAREHOUSES.map(w => [w.id, '0']))
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync form when URL search params change (e.g. after dialog navigate)
  const searchParams = new URLSearchParams(location.search);
  const urlSku = searchParams.get('sku') ?? '';
  const urlFamily = searchParams.get('family') ?? '';

  const initForm = () => {
    if (existingProduct) {
      return {
        gtin: existingProduct.gtin,
        mpn: existingProduct.mpn,
        model_number: existingProduct.model_number,
        brand: existingProduct.brand,
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
        ...(urlBrand ? { brand: urlBrand } : {}),
        ...(urlMsrp ? { original_price: urlMsrp } : {}),
        ...(urlVariants === '1' ? { has_variants: true } : {}),
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const [packageWeightUnit, setPackageWeightUnit] = useState<'g' | 'kg'>('g');
  const [channelOverrides] = useState<Record<OverrideChannel, ChannelOverrideForm>>(() => {
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
  const [dirtyTrackingReady, setDirtyTrackingReady] = useState(false);
  const [hasScrolledFromTop, setHasScrolledFromTop] = useState(false);
  const baselineSnapshotRef = useRef('');
  const latestSnapshotRef = useRef('');

  useEffect(() => {
    if (editId && !existingProduct) navigate('/products/new', { replace: true });
  }, [editId, existingProduct, navigate]);

  // Images (stored as data URLs)
  const [images, setImages] = useState<string[]>(existingProduct?.images ?? []);
  const [imageAltTexts, setImageAltTexts] = useState<string[]>(existingProduct?.image_alt_texts ?? []);
  const [uploadingImageCount, setUploadingImageCount] = useState(0);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [categoryLevelOne, setCategoryLevelOne] = useState(categoryTree[0].label);
  const [categoryLevelTwo, setCategoryLevelTwo] = useState(categoryTree[0].children[0].label);
  const [pendingCategory, setPendingCategory] = useState(form.category);
  const [activeSection, setActiveSection] = useState('basic');
  const [specifications, setSpecifications] = useState<Array<{ id: string; name: string; value: string }>>(
    existingProduct?.specifications?.map(item => ({ ...item, id: genId('spec') })) ?? [{ id: genId('spec'), name: '', value: '' }]
  );

  useEffect(() => {
    if (!form.category) return;
    const categoryAttributes = getAttributesForCategory(form.category).filter(item => item.key !== 'brand');
    setSpecifications(current => {
      const existingNames = new Set(current.map(item => item.name.toLowerCase()));
      const missing = categoryAttributes.filter(item => !existingNames.has(item.name.toLowerCase())).map(item => ({ id: genId('spec'), name: item.name, value: '' }));
      return missing.length ? [...current.filter(item => item.name || item.value), ...missing] : current;
    });
  }, [form.category]);

  // Variant state
  const [variantGroups, setVariantGroups] = useState<VariantGroup[]>(() => hydrateExistingVariants(existingProduct).groups);
  const [variantItems, setVariantItems] = useState<VariantItem[]>(() => hydrateExistingVariants(existingProduct).items);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; target: Exclude<ProductType, 'variant'> }>({ open: false, target: 'single' });

  function setField<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(e => ({ ...e, [k]: '' }));
  }

  function updateProductName(value: string) {
    setForm(current => ({
      ...current,
      name: value,
      slug: current.slug && current.slug !== slugify(current.name) ? current.slug : slugify(value),
    }));
    if (errors.name) setErrors(current => ({ ...current, name: '' }));
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

  function scrollToSection(id: string) {
    document.getElementById(`product-section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveSection(id);
  }

  useEffect(() => {
    const ids = ['channels', 'basic', 'pricing', 'shipping', 'more'];
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActiveSection(visible.target.id.replace('product-section-', ''));
    }, { rootMargin: '-25% 0px -60% 0px', threshold: [0.05, 0.25] });
    ids.forEach(id => { const element = document.getElementById(`product-section-${id}`); if (element) observer.observe(element); });
    return () => observer.disconnect();
  }, []);

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

  function handleSave(statusOverride?: Product['status'], options: { navigateAfter?: boolean } = {}) {
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
      asin: form.asin.trim(),
      manufacturer: form.manufacturer.trim(),
      name: form.name.trim(),
      category: form.category,
      condition: form.condition,
      description: form.description.trim(),
      original_price: num(form.original_price),
      retail_price: form.has_variants && variantRetailPrices.length > 0 ? Math.min(...variantRetailPrices) : num(form.retail_price),
      price_currency: form.price_currency,
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
      specifications: specifications.filter(item => item.name.trim() && item.value.trim()).map(({ name, value }) => ({ name: name.trim(), value: value.trim() })),
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
      status: statusOverride ?? existingProduct?.status ?? 'draft',
      created_at: existingProduct?.created_at ?? now,
      updated_at: now,
      skus: variants,
      _variants: variants,
    };

    if (existingProduct) {
      updateProduct(existingProduct.id, payload);
      toast({ title: copy.updated, description: formatMessage(copy.updatedDescription, { name: payload.name }) });
    } else {
      addProduct(payload);
      toast({ title: copy.created, description: formatMessage(copy.createdDescription, { name: payload.name }) });
    }

    baselineSnapshotRef.current = latestSnapshotRef.current;
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
  const hasGeneratedVariants = form.has_variants && selectedVariantItems.length > 0;
  const variantPricingReady = hasGeneratedVariants && selectedVariantItems.every(item => item.sku_code.trim() && num(item.price) > 0) && selectedVariantItems.reduce((sum, item) => sum + num(item.stock), 0) > 0;
  const pricingAndInventoryReady = hasGeneratedVariants ? variantPricingReady : num(form.retail_price) > 0 && totalStock > 0;
  const logisticsReady = Boolean(form.pkg_length && form.pkg_width && form.pkg_height && form.pkg_weight);
  const completionChecks = useMemo(() => {
    const channelReadyForPublishing =
      Object.values(channelOverrides).some(item => item.enabled) &&
      form.name.trim().length >= 3 &&
      form.description.trim().length >= 100 &&
      Boolean(form.category) &&
      images.length >= 3 &&
      pricingAndInventoryReady &&
      logisticsReady;
    const checks = [
      { id: 'identity', label: 'Add product name and master SKU', done: form.name.trim().length >= 3 && Boolean(form.sku_code.trim()) },
      { id: 'media', label: 'Add at least 3 product images', done: images.length >= 3 },
      { id: 'content', label: 'Write a detailed description (100+ characters)', done: form.description.trim().length >= 100 },
      { id: 'category', label: 'Select an accurate product category', done: Boolean(form.category) },
      { id: 'price', label: form.has_variants ? 'Configure variant pricing and stock' : 'Configure base price and inventory', done: pricingAndInventoryReady },
      { id: 'shipping', label: 'Configure package weight and dimensions', done: logisticsReady },
    ];

    if (form.has_variants) {
      checks.push({
        id: 'variants',
        label: 'Complete all selected variants',
        done: variantGroups.length > 0 && hasGeneratedVariants && selectedVariantItems.every(item => item.sku_code.trim()),
      });
    }

    checks.push({ id: 'channels', label: 'Prepare at least one channel for publishing', done: channelReadyForPublishing });
    return checks;
  }, [channelOverrides, form, hasGeneratedVariants, images.length, logisticsReady, pricingAndInventoryReady, selectedVariantItems, variantGroups.length]);
  const completion = Math.round((completionChecks.filter(check => check.done).length / completionChecks.length) * 100);
  const completedIdentityFields = [form.brand, form.gtin, form.manufacturer, form.mpn, form.model_number]
    .filter(value => value.trim()).length;
  const completedProductDetails = [
    Boolean(form.sku_code.trim()),
    form.name.trim().length >= 3,
    Boolean(form.category),
    form.description.trim().length >= 100,
  ].filter(Boolean).length;
  const readiness = (Object.entries(channelOverrides) as Array<[OverrideChannel, ChannelOverrideForm]>).map(([key, override]) => {
    const masterDataReady = form.name.trim().length >= 3 && form.description.trim().length >= 100 && Boolean(form.category) && images.length >= 3 && pricingAndInventoryReady && logisticsReady;
    const overrideStarted = Boolean(override.title.trim() || override.description.trim() || override.price_markup);
    const incompleteOverride = overrideStarted && (!override.title.trim() || !override.description.trim());
    const listingSetupIncomplete = !channelSetupComplete(key, override);
    const channel = OVERRIDE_CHANNELS.find(item => item.key === key);
    return {
      key,
      label: channel?.label ?? key,
      state: !override.enabled ? 'inactive' : !masterDataReady ? 'blocked' : listingSetupIncomplete || incompleteOverride ? 'warning' : 'ready',
      detail: !override.enabled ? 'Not selected' : !masterDataReady ? 'Complete the required master product data' : listingSetupIncomplete ? 'Complete channel SKU, category and fulfillment' : incompleteOverride ? 'Complete or clear the optional overrides' : '100% Ready',
    } as const;
  });
  const completedSpecifications = specifications.filter(item => item.name.trim() && item.value.trim()).length;
  const requiredAttributeCount = [
    form.name.trim().length >= 3,
    Boolean(form.sku_code.trim()),
    form.description.trim().length >= 100,
    Boolean(form.category),
    pricingAndInventoryReady,
    logisticsReady,
    Boolean(form.country_of_origin),
    images.length >= 3,
    form.has_variants ? hasGeneratedVariants : true,
    Object.values(channelOverrides).some(item => item.enabled),
  ].filter(Boolean).length;
  const recommendedAttributeCount = [form.gtin, form.mpn, form.model_number, form.brand, form.asin, form.manufacturer, form.original_price, form.prod_length, form.prod_height, form.prod_width, form.prod_weight, form.hs_code, form.slug, form.meta_title, form.meta_description].filter(value => String(value).trim()).length;
  const completedAttributeCount = requiredAttributeCount + recommendedAttributeCount + completedSpecifications;
  const totalAttributeCount = 45;
  const selectedCategoryGroup = categoryTree.find(item => item.label === categoryLevelOne) ?? categoryTree[0];
  const selectedCategorySubgroup = selectedCategoryGroup.children.find(item => item.label === categoryLevelTwo) ?? selectedCategoryGroup.children[0];
  const matchingCategoryPaths = categoryTree.flatMap(group => group.children.flatMap(subgroup => subgroup.children.map(leaf => ({ group: group.label, subgroup: subgroup.label, leaf })))).filter(item => !categorySearch.trim() || `${item.group} ${item.subgroup} ${item.leaf}`.toLowerCase().includes(categorySearch.trim().toLowerCase()));
  const currentSnapshot = JSON.stringify({ form, inventory, images, imageAltTexts, variantGroups, variantItems, channelOverrides, specifications });
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

  if (editId && !existingProduct) return null;

  return (
    <div data-testid="product-editor-page" className="flex min-h-full flex-col bg-background">
      {/* Top Bar */}
      <div className={`sticky top-0 z-[100] flex flex-wrap items-center gap-3 border-b bg-card/95 px-4 backdrop-blur transition-[padding,box-shadow] duration-200 motion-reduce:transition-none sm:px-6 ${hasScrolledFromTop ? 'py-2 shadow-sm' : 'py-4'}`}>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-3">
          <button onClick={() => navigate('/products/master-catalog')} className="flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="size-4" />
            {hasScrolledFromTop ? (existingProduct ? 'Edit Product' : 'Create Product') : copy.productMaster}
          </button>
          {!hasScrolledFromTop ? <><span className="text-muted-foreground">/</span><span className="truncate text-sm font-medium">
            {existingProduct ? copy.editDetails : copy.createNew}
          </span></> : null}
          {hasScrolledFromTop ? <div className="ml-2 flex min-w-24 max-w-sm flex-1 items-center gap-2"><Progress value={completion} aria-label={`Overall Completion: ${completion}%`} className="h-2" /><span className="shrink-0 text-xs font-semibold tabular-nums text-primary">{completion}%</span></div> : null}
          </div>
          {!hasScrolledFromTop ? <div className="mt-3 flex max-w-xl items-center gap-3">
            <div className="flex items-center gap-2 whitespace-nowrap text-xs font-semibold text-foreground"><span>Overall Completion</span><span className="tabular-nums text-primary">{completion}%</span></div>
            <Progress value={completion} aria-label={`Overall Completion: ${completion}%`} className="h-2" />
          </div> : null}
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Button variant="ghost" className="text-primary hover:bg-primary/5 hover:text-primary" onClick={() => handleSave('draft', { navigateAfter: false })} disabled={uploadingImageCount > 0 || !isDirty}>
            {uploadingImageCount > 0 ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save Draft
          </Button>
          <Button
            onClick={() => {
              if (primaryAction === 'save') handleSave('draft', { navigateAfter: false });
              if (primaryAction === 'check') checkReadiness();
              if (primaryAction === 'review') setReadinessReviewOpen(true);
              if (primaryAction === 'publish') setPublishConfirmationOpen(true);
            }}
            disabled={uploadingImageCount > 0 || publishOpen || primaryAction === 'checking' || primaryAction === 'published'}
          >
            {uploadingImageCount > 0 || primaryAction === 'checking' ? <Loader2 className="size-4 animate-spin" /> : primaryAction === 'publish' || primaryAction === 'published' ? <CloudUpload className="size-4" /> : primaryAction === 'review' ? <CircleAlert className="size-4" /> : primaryAction === 'check' ? <PackageCheck className="size-4" /> : <Save className="size-4" />}
            {primaryAction === 'save' ? 'Save changes' : primaryAction === 'checking' ? 'Checking readiness…' : primaryAction === 'review' ? 'Review issues' : primaryAction === 'publish' ? 'Publish changes' : primaryAction === 'published' ? 'Published' : 'Check readiness'}
          </Button>
        </div>
      </div>

      <div className="border-b bg-muted/20 px-4 py-2 sm:px-6" aria-live="polite">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
          <span className="font-semibold text-foreground">Prototype workflow</span>
          {[
            { id: 'draft', label: 'Draft saved', done: !isDirty },
            { id: 'readiness', label: 'Readiness checked', done: readinessStatus === 'ready' || readinessStatus === 'published' },
            { id: 'published', label: 'Revision published', done: readinessStatus === 'published' },
          ].map((step, index) => <div key={step.id} className="flex items-center gap-2"><span className={`grid size-5 place-items-center rounded-full border text-[10px] font-bold ${step.done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-border bg-background text-muted-foreground'}`}>{step.done ? <Check className="size-3" /> : index + 1}</span><span className={step.done ? 'font-medium text-foreground' : 'text-muted-foreground'}>{step.label}</span></div>)}
          {isDirty ? <span className="ml-auto font-medium text-amber-700">Unsaved changes</span> : null}
        </div>
      </div>

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
            {errors.variant_duplicate ?? errors.sku_code ?? errors.name ?? errors.category ?? copy.errorFallback}
          </p>
        </div>
      )}

      <nav className="sticky top-[104px] z-30 flex min-h-12 gap-1 overflow-x-auto border-b bg-background/95 px-6 backdrop-blur sm:top-14" aria-label="Product form sections">
        {[
          ['basic', 'Basic & Classification'],
          ['pricing', 'Structure & Pricing'],
          ['shipping', 'Shipping & Inventory'],
          ['more', 'More Information'],
          ['channels', 'Channel Handoff'],
        ].map(([id, label]) => <button key={id} type="button" onClick={() => scrollToSection(id)} aria-current={activeSection === id ? 'step' : undefined} className={`relative min-h-12 shrink-0 px-3 text-sm font-medium transition-colors ${activeSection === id ? 'text-primary after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-primary' : 'text-muted-foreground hover:text-foreground'}`}>{label}</button>)}
      </nav>

      {/* Content */}
      <div data-testid="product-editor-content">
        <div className="grid w-full grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_300px]">

          {/* Left Column */}
          <div className="flex flex-col gap-5">

            {/* Sales Channels */}
            <Card id="product-section-channels" className="order-5 scroll-mt-28 border-primary/20">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><CardTitle className="flex items-center gap-2 text-sm"><Globe2 className="size-4 text-primary" />Sales Channels</CardTitle><p className="mt-1.5 text-xs leading-5 text-muted-foreground">Create and configure channel listings directly from this Product Master. Every channel keeps its own SKU, category, fulfillment and overrides.</p></div>
                  <Button type="button" onClick={() => existingProduct ? navigate(`/products/${existingProduct.id}/channel-listings/new`) : handleSave('draft', { navigateAfter: false })}><Plus className="size-4" />{existingProduct ? 'Create channel listings' : 'Save master to continue'}</Button>
                </div>
              </CardHeader>
              <CardContent>
                {Object.values(channelOverrides).every(channel => !channel.enabled) ? <div className="flex min-h-28 w-full items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/20 px-4 text-center text-sm text-muted-foreground"><Radio className="size-5" /><span><strong className="block text-foreground">No channel listings configured</strong><span className="mt-1 block text-xs">Save this Product Master, then create listings in the dedicated channel workspace.</span></span></div> : <div className="space-y-3">{OVERRIDE_CHANNELS.filter(channel => channelOverrides[channel.key].enabled).map(channel => { const override = channelOverrides[channel.key]; const ChannelIcon = channel.icon; const complete = channelSetupComplete(channel.key, override); return <button key={channel.key} type="button" onClick={() => existingProduct && navigate(`/products/${existingProduct.id}/channel-listings/new`)} className="flex min-h-16 w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className={cn('grid size-9 place-items-center rounded-lg', channel.iconClassName)}><ChannelIcon className="size-4" /></span><span className="min-w-0 flex-1"><strong className="block text-sm">{channel.label}</strong><span className="block truncate font-mono text-xs text-muted-foreground">{override.listing_sku || 'Channel SKU not configured'}</span></span><span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', complete ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>{complete ? 'Ready' : 'Needs setup'}</span><ChevronRight className="size-4 text-muted-foreground" /></button>; })}</div>}
              </CardContent>
            </Card>

            {/* Product Identity */}
            <Card id="product-section-basic" className="order-1 scroll-mt-28">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Layers className="size-4 text-primary" />
                    {copy.productIdentity}
                  </CardTitle>
                  <span className="text-xs tabular-nums text-muted-foreground">{completedIdentityFields} of 5 completed</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Brand">
                    <select value={form.brand} onChange={e => setField('brand', e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><option value="">Select canonical brand</option>{catalogBrands.map(brand => <option key={brand.id} value={brand.name}>{brand.name}{brand.status === 'Unverified' ? ' · Needs review' : ''}</option>)}</select>
                  </Field>
                  <Field label="GTIN / Barcode">
                    <Input value={form.gtin} onChange={e => setField('gtin', e.target.value)} placeholder={copy.gtinPlaceholder} inputMode="numeric" />
                  </Field>
                </div>
                <div className="overflow-hidden rounded-lg border">
                  <button type="button" aria-expanded={advancedIdentityOpen} onClick={() => setAdvancedIdentityOpen(open => !open)} className="flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm font-medium transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                    <ChevronDown className={cn('size-4 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none', advancedIdentityOpen ? 'rotate-180' : '')} />
                    <span>Advanced identifiers</span>
                    <span className="ml-auto text-xs font-normal text-muted-foreground">MPN, model and manufacturer</span>
                  </button>
                  {advancedIdentityOpen ? <div className="grid grid-cols-1 gap-4 border-t bg-muted/10 p-4 md:grid-cols-3">
                    <Field label="Manufacturer">
                      <Input value={form.manufacturer} onChange={e => setField('manufacturer', e.target.value)} placeholder={copy.manufacturerPlaceholder} />
                    </Field>
                    <Field label="MPN">
                      <Input value={form.mpn} onChange={e => setField('mpn', e.target.value)} placeholder={copy.mpnPlaceholder} />
                    </Field>
                    <Field label="Model Number">
                      <Input value={form.model_number} onChange={e => setField('model_number', e.target.value)} placeholder={copy.modelPlaceholder} />
                    </Field>
                  </div> : null}
                </div>
                <p className="text-xs text-muted-foreground">Amazon ASIN is managed in the Amazon channel listing.</p>
              </CardContent>
            </Card>

            {/* Product Details */}
            <Card className="order-1">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Package className="size-4 text-primary" />
                    {copy.productDetails}
                  </CardTitle>
                  <span className="text-xs tabular-nums text-muted-foreground">{completedProductDetails} of 4 completed</span>
                </div>
              </CardHeader>
              <CardContent>
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
                    <Field label={copy.productName} required error={errors.name}>
                    <Input value={form.name} onChange={e => updateProductName(e.target.value)} placeholder={copy.namePlaceholder} minLength={3} maxLength={120} />
                    </Field>
                  </div>
                  <div className="sm:col-span-6">
                    <Field label={copy.category} required error={errors.category}>
                      <Button type="button" variant="outline" className="w-full justify-between font-normal" onClick={() => { setPendingCategory(form.category); setCategoryOpen(true); }} aria-haspopup="dialog"><span className={form.category ? '' : 'text-muted-foreground'}>{form.category || copy.selectCategory}</span><ChevronRight className="size-4 rotate-90" /></Button>
                    </Field>
                  </div>
                  <div className="sm:col-span-6">
                    <Field label={copy.condition}>
                      <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={form.condition} onChange={e => setField('condition', e.target.value)}>
                        {CONDITIONS.map(c => <option key={c} value={c}>{conditionLabels[c as keyof typeof conditionLabels]}</option>)}
                      </select>
                    </Field>
                  </div>
                  <div className="sm:col-span-12">
                    <Field label={copy.description}>
                      <Textarea value={form.description} onChange={e => setField('description', e.target.value)} placeholder={copy.descriptionPlaceholder} rows={2} className="min-h-16 resize-y" />
                    </Field>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Product Structure */}
            <Card id="product-section-pricing" className="order-2 scroll-mt-28">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm"><Layers className="size-4 text-primary" />Structure &amp; Pricing</CardTitle>
                <p className="text-xs leading-5 text-muted-foreground">Choose the selling structure, then configure the pricing and variant data that belong to it.</p>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Product structure">
                  {([
                    { type: 'single', title: 'Single product', description: 'One SKU with one price and stock record.' },
                    { type: 'variant', title: 'Product with variants', description: 'Multiple SKUs by Color, Size or other options.' },
                  ] as const).map(option => {
                    const TypeIcon = PRODUCT_TYPE_ICONS[option.type];
                    const selected = form.product_type === option.type;
                    return <button key={option.type} type="button" role="radio" aria-checked={selected} onClick={() => handleProductTypeChange(option.type)} className={`min-h-20 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${selected ? 'border-primary bg-primary/5' : 'hover:border-primary/30 hover:bg-muted/30'}`}>
                      <span className="flex items-start gap-3">
                        <span className={`grid size-8 shrink-0 place-items-center rounded-md ${selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}><TypeIcon className="size-4" /></span>
                        <span><span className="flex items-center gap-2 text-sm font-semibold">{option.title}{selected ? <Check className="size-4 text-primary" /> : null}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{option.description}</span></span>
                      </span>
                    </button>;
                  })}
                </div>
                {form.has_variants ? <section className="space-y-4 border-t pt-5" aria-labelledby="variant-attributes-title">
                  <div className="flex items-start justify-between gap-3"><div><h3 id="variant-attributes-title" className="text-sm font-semibold">Variant attributes</h3><p className="mt-1 text-xs text-muted-foreground">Add up to two attributes, such as Color × Size, to generate the SKU matrix.</p></div><span className="shrink-0 text-xs tabular-nums text-muted-foreground">{variantGroups.length} of 2</span></div>
                  <VariantSection
                    groups={variantGroups}
                    onGroupsChange={setVariantGroups}
                    items={variantItems}
                    onItemsChange={setVariantItems}
                    parentSku={form.sku_code}
                    basePrice={form.retail_price}
                    currency={form.price_currency}
                    existingSkus={existingSkuList}
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

                {!hasGeneratedVariants ? <section className="space-y-4 border-t pt-5" aria-labelledby="product-pricing-title">
                  <div><h3 id="product-pricing-title" className="text-sm font-semibold">{form.has_variants ? 'Default variant pricing' : 'Pricing'}</h3>{form.has_variants ? <p className="mt-1 text-xs leading-5 text-muted-foreground">Used only to initialize new variants. After the matrix is generated, manage prices per SKU.</p> : null}</div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
                  <div className="sm:col-span-4">
                  <Field label={copy.originalPrice}>
                    <Input value={form.original_price} onChange={e => setField('original_price', e.target.value)} placeholder="0" type="number" />
                  </Field>
                  </div>
                  <div className="sm:col-span-4">
                  <Field label={copy.retailPrice}>
                    <Input value={form.retail_price} onChange={e => setField('retail_price', e.target.value)} placeholder="0" type="number" />
                  </Field>
                  </div>
                  <div className="sm:col-span-2"><Field label="Currency"><select className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={form.price_currency} onChange={e => setField('price_currency', e.target.value)}>{CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}</select></Field></div>
                  <div className="flex items-end sm:col-span-2"><div className="flex h-9 w-full items-center justify-between rounded-md bg-muted/40 px-3 text-xs"><span className="text-muted-foreground">{copy.margin}</span><strong className="tabular-nums">{(() => { const retail = num(form.retail_price); const original = num(form.original_price); return retail > 0 ? `${(((retail - original) / retail) * 100).toFixed(1)}%` : '—'; })()}</strong></div></div>
                  </div>
                  {num(form.retail_price) > 0 ? <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-muted/30 px-3 py-2 text-xs"><span className="text-muted-foreground">Estimated profit</span><strong className="tabular-nums">{formatLocalizedNumber(locale, Math.max(0, num(form.retail_price) - num(form.original_price)))} {form.price_currency}</strong><span className="text-muted-foreground">before fees and channel adjustments</span></div> : null}
                </section> : <div className="flex items-center justify-between gap-3 border-t pt-4 text-xs"><span className="text-muted-foreground">Pricing is managed per SKU in the variant matrix above.</span><Button type="button" variant="outline" size="sm" onClick={() => document.querySelector('[aria-label="Variant pricing matrix"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>Manage variant pricing</Button></div>}
              </CardContent>
            </Card>

            {/* Shipping & Logistics */}
            <Card id="product-section-shipping" className="order-3 scroll-mt-28">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Truck className="size-4 text-primary" />
                  Shipping & Logistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <RowField label={copy.productDimensions} fields={[
                  { label: copy.length, value: form.prod_length, onChange: v => setField('prod_length', v), placeholder: '0', suffix: 'cm' },
                  { label: copy.width, value: form.prod_width, onChange: v => setField('prod_width', v), placeholder: '0', suffix: 'cm' },
                  { label: copy.height, value: form.prod_height, onChange: v => setField('prod_height', v), placeholder: '0', suffix: 'cm' },
                  { label: copy.weight, value: form.prod_weight, onChange: v => setField('prod_weight', v), placeholder: '0', suffix: 'g' },
                ]} />
                <div className="flex items-center justify-between gap-3">
                  <div><Label>Package Dimensions & Weight</Label><p className="mt-1 text-xs text-muted-foreground">Required for marketplace shipping rates and carrier labels.</p></div>
                  <select aria-label="Package weight unit" value={packageWeightUnit} onChange={event => setPackageWeightUnit(event.target.value as 'g' | 'kg')} className="h-8 rounded-md border border-input bg-background px-2 text-xs font-semibold"><option value="g">Grams (g)</option><option value="kg">Kilograms (kg)</option></select>
                </div>
                <RowField label="L × W × H" fields={[
                  { label: copy.length, value: form.pkg_length, onChange: v => setField('pkg_length', v), placeholder: '0', suffix: 'cm' },
                  { label: copy.width, value: form.pkg_width, onChange: v => setField('pkg_width', v), placeholder: '0', suffix: 'cm' },
                  { label: copy.height, value: form.pkg_height, onChange: v => setField('pkg_height', v), placeholder: '0', suffix: 'cm' },
                  { label: 'Package Weight', value: packageWeightUnit === 'kg' && form.pkg_weight ? String(num(form.pkg_weight) / 1000) : form.pkg_weight, onChange: v => setField('pkg_weight', packageWeightUnit === 'kg' ? String(num(v) * 1000) : v), placeholder: '0', suffix: packageWeightUnit },
                ]} />
              </CardContent>
            </Card>

            {/* Others */}
            <Card id="product-section-more" className="order-4 scroll-mt-28">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Info className="size-4 text-primary" />
                  {copy.others}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
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
                <div className="border-t pt-4">
                  <div className="mb-3 flex items-center justify-between"><div><Label>Specifications</Label><p className="mt-1 text-xs text-muted-foreground">Reusable attributes shown across channels.</p></div><Button type="button" variant="outline" size="sm" disabled={specifications.length >= 20} onClick={() => setSpecifications(current => [...current, { id: genId('spec'), name: '', value: '' }])}><Plus className="size-3.5" />Add information</Button></div>
                  <div className="space-y-2">{specifications.map((spec, index) => <div key={spec.id} className="grid grid-cols-[1fr_1fr_auto] gap-2"><Input value={spec.name} onChange={event => setSpecifications(current => current.map(item => item.id === spec.id ? { ...item, name: event.target.value } : item))} placeholder="Attribute name" aria-label={`Specification ${index + 1} name`} /><Input value={spec.value} onChange={event => setSpecifications(current => current.map(item => item.id === spec.id ? { ...item, value: event.target.value } : item))} placeholder="Value" aria-label={`Specification ${index + 1} value`} /><Button type="button" variant="ghost" size="icon" aria-label={`Remove specification ${index + 1}`} onClick={() => setSpecifications(current => current.filter(item => item.id !== spec.id))}><Trash2 className="size-4" /></Button></div>)}</div>
                </div>
                <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
                  <div className="sm:col-span-2"><Field label="Product URL"><div className="flex h-10 items-center rounded-md border border-input bg-muted/20 pl-3 text-xs text-muted-foreground"><span className="shrink-0">store.primeweb.com/products/</span><Input value={form.slug} onChange={event => setField('slug', slugify(event.target.value))} className="h-9 border-0 bg-transparent px-1 font-mono text-xs shadow-none focus-visible:ring-0" placeholder="product-url" /></div></Field></div>
                  <Field label="SEO Meta Title"><Input value={form.meta_title} maxLength={70} onChange={event => setField('meta_title', event.target.value)} placeholder={form.name || 'Search result title'} /><p className="text-right text-[10px] text-muted-foreground">{form.meta_title.length}/70</p></Field>
                  <Field label="SEO Meta Description"><Textarea rows={2} value={form.meta_description} maxLength={160} onChange={event => setField('meta_description', event.target.value)} placeholder="Short search-engine description" /><p className="text-right text-[10px] text-muted-foreground">{form.meta_description.length}/160</p></Field>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-5">

            <Card>
              <CardHeader className="pb-3"><div className="flex items-center justify-between"><CardTitle className="text-sm">Product Content Strength</CardTitle><span className="text-sm font-bold tabular-nums text-primary">{completion}%</span></div><Progress value={completion} className="mt-2 h-2" /></CardHeader>
              <CardContent><ul className="space-y-2">{completionChecks.map(check => <li key={check.id} className={`flex items-start gap-2 text-xs leading-5 ${check.done ? 'text-foreground' : 'text-muted-foreground'}`}><span className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border ${check.done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-border'}`}>{check.done ? <Check className="size-2.5" /> : null}</span><span>{check.label}</span></li>)}</ul></CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><CircleCheck className="size-4 text-primary" />Channel Readiness</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {readiness.every(channel => channel.state === 'inactive') ? <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-center text-xs leading-5 text-muted-foreground">No publishing channels selected yet.</div> : readiness.filter(channel => channel.state !== 'inactive').map(channel => <div key={channel.key} className="rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <span className={`size-2.5 rounded-full ${channel.state === 'ready' ? 'bg-emerald-500' : channel.state === 'warning' ? 'bg-amber-400' : 'bg-rose-500'}`} />
                    <span className="text-sm font-semibold">{channel.label}</span>
                    <span className={`ml-auto text-xs font-semibold ${channel.state === 'ready' ? 'text-emerald-700' : channel.state === 'warning' ? 'text-amber-700' : 'text-rose-700'}`}>{channel.state === 'ready' ? '100%' : channel.state === 'warning' ? 'Needs content' : 'Blocked'}</span>
                  </div>
                  <p className="mt-1.5 pl-[18px] text-[11px] leading-4 text-muted-foreground">{channel.detail}</p>
                </div>)}
              </CardContent>
            </Card>

            {/* Product data coverage */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Product Data Coverage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">All fields</span><span className="font-semibold tabular-nums">{completedAttributeCount}/{totalAttributeCount}</span></div>
                <Progress value={(completedAttributeCount / totalAttributeCount) * 100} className="h-1.5" />
                <div className="space-y-2 border-t pt-3 text-xs">
                  <div className="flex items-center justify-between"><span className="text-muted-foreground">Required</span><span className={cn('font-semibold tabular-nums', requiredAttributeCount === 10 ? 'text-emerald-700' : 'text-amber-700')}>{requiredAttributeCount}/10</span></div>
                  <div className="flex items-center justify-between"><span className="text-muted-foreground">Recommended</span><span className="font-semibold tabular-nums">{recommendedAttributeCount}/15</span></div>
                  <div className="flex items-center justify-between"><span className="text-muted-foreground">Custom specifications</span><span className="font-semibold tabular-nums">{completedSpecifications}/20</span></div>
                </div>
              </CardContent>
            </Card>

            {/* Media */}
            <Card>
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
                  <p className="text-xs text-muted-foreground mb-1.5">{formatMessage(copy.additionalImages, { count: images.length - 1 })}</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {Array.from({ length: Math.min(9, 9 - (images.length - 1)) }).map((_, i) => (
                      <label
                        key={i}
                        className="aspect-square rounded-md border-2 border-dashed border-border flex items-center justify-center bg-muted/30 text-xs text-muted-foreground hover:bg-muted/50 transition-colors cursor-pointer"
                      >
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={async e => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            await handleImageUpload(file, 'gallery');
                            e.target.value = '';
                          }}
                        />
                        +
                      </label>
                    ))}
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
                  </div>
                </div>
                {images.length > 0 ? <div className="space-y-2 border-t pt-3"><p className="text-xs font-medium">Image alt text</p>{images.map((url, index) => <div key={`${url}-alt`} className="flex items-center gap-2"><img src={url} alt="" className="size-8 rounded border object-cover" /><Input value={imageAltTexts[index] ?? ''} maxLength={125} onChange={event => setImageAltTexts(current => { const next = [...current]; next[index] = event.target.value; return next; })} placeholder={`Describe image ${index + 1}`} aria-label={`Alt text for image ${index + 1}`} className="h-8 text-xs" /></div>)}</div> : null}
              </CardContent>
            </Card>

            {/* Inventory Information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Package className="size-4 text-primary" />
                  {copy.inventoryInformation}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {WAREHOUSES.map(wh => (
                    <div key={wh.id} className="flex items-center justify-between">
                      <span className="text-sm flex items-center gap-1.5">
                        <span>{wh.code}</span>
                        {wh.label}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Input
                          value={inventory[wh.id] ?? '0'}
                          onChange={e => setInventory(prev => ({ ...prev, [wh.id]: e.target.value }))}
                          className="w-16 h-7 text-xs text-right font-mono"
                          type="number"
                          min="0"
                        />
                        <span className="text-xs text-muted-foreground">{copy.units}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-2 border-t flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">{copy.totalStock}</span>
                  <span className="text-sm font-semibold">{formatLocalizedNumber(locale, totalStock)} {copy.units}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

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
            {completionChecks.map(check => <button key={check.id} type="button" onClick={() => { setReadinessReviewOpen(false); scrollToSection(check.id === 'identity' || check.id === 'content' || check.id === 'category' ? 'basic' : check.id === 'media' ? 'more' : check.id === 'price' || check.id === 'variants' ? 'pricing' : check.id === 'shipping' ? 'shipping' : 'channels'); }} className="flex min-h-12 w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
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
          <div className="rounded-lg border bg-muted/30 p-4 text-sm"><div className="flex items-center justify-between"><span className="text-muted-foreground">Master SKU</span><strong className="font-mono">{form.sku_code}</strong></div><div className="mt-2 flex items-center justify-between"><span className="text-muted-foreground">Ready channels</span><strong>{readiness.filter(channel => channel.state === 'ready').length}</strong></div></div>
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
