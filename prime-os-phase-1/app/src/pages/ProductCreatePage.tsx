import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import {
  ArrowLeft, Info, Image, Package, Truck, Layers, Check,
  Plus, X, Trash2, AlertTriangle, Upload, Loader2, Boxes, PackageCheck,
} from 'lucide-react';
import { ConfirmDialog } from '@/components/system/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { addProduct, updateProduct, getProductById, getAllSkus, type Product, type ChannelListing, type ProductType } from '@/lib/product-store';
import type { AmazonVariant } from '@/lib/amazon-catalog';
import { ChannelListingPanel } from '@/components/products/ChannelListingPanel';
import { uploadProductImage, validateImageFile } from '@/lib/product-images';
import { useI18n } from '@/lib/i18n/I18nContext';
import { formatLocalizedNumber, formatMessage } from '@/lib/i18n/format';

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
}

interface FormState {
  gtin: string;
  mpn: string;
  model_number: string;
  brand: string;
  asin: string;
  manufacturer: string;
  sku_code: string;
  name: string;                   // ← was: title
  product_type: ProductType;     // ← NEW: single | variant | bundle
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
}

// ─── Constants ────────────────────────────────────────────────────────────────

const WAREHOUSES = [
  { id: 'wh_crjp', label: 'CR-JP (Japan)', code: 'JP' },
  { id: 'wh_rslsg', label: 'RSL-SG (Singapore)', code: 'SG' },
  { id: 'wh_fbsmy', label: 'FBS-MY (Malaysia)', code: 'MY' },
  { id: 'wh_3plvn', label: '3PL-VN (Vietnam)', code: 'VN' },
  { id: 'wh_fbajp', label: 'FBA-JP (Amazon Japan)', code: 'JP' },
];
const CONDITIONS = ['new', 'refurbished', 'used_like_new', 'used_acceptable'];
const CURRENCIES = ['JPY', 'USD', 'SGD', 'MYR', 'VND'];
const COUNTRIES = ['JP', 'CN', 'KR', 'US', 'SG', 'MY', 'VN', 'TW', 'TH', 'ID'];
const CATEGORIES = [
  'Watch', 'Shoe', 'Bag', 'Hat', 'Jacket', 'Sunglasses',
  'Bicycle', 'Headphones', 'Electronics', 'Food & Beverages',
  'Beauty & Personal Care', 'Home & Living', 'Sports', 'Books', 'Toys',
];
const PRODUCT_TYPE_ICONS = {
  single: Package,
  variant: Layers,
  bundle: Boxes,
} satisfies Record<ProductType, typeof PackageCheck>;

const CATEGORY_LABELS: Record<string, Record<string, string>> = {
  'en-US': Object.fromEntries(CATEGORIES.map((category) => [category, category])),
  'ja-JP': {
    Watch: '腕時計',
    Shoe: '靴',
    Bag: 'バッグ',
    Hat: '帽子',
    Jacket: 'ジャケット',
    Sunglasses: 'サングラス',
    Bicycle: '自転車',
    Headphones: 'ヘッドホン',
    Electronics: '家電・電子機器',
    'Food & Beverages': '食品・飲料',
    'Beauty & Personal Care': '美容・パーソナルケア',
    'Home & Living': 'ホーム・リビング',
    Sports: 'スポーツ',
    Books: '書籍',
    Toys: '玩具',
  },
  'vi-VN': {
    Watch: 'Đồng hồ',
    Shoe: 'Giày',
    Bag: 'Túi',
    Hat: 'Mũ',
    Jacket: 'Áo khoác',
    Sunglasses: 'Kính râm',
    Bicycle: 'Xe đạp',
    Headphones: 'Tai nghe',
    Electronics: 'Điện tử',
    'Food & Beverages': 'Thực phẩm & đồ uống',
    'Beauty & Personal Care': 'Làm đẹp & chăm sóc cá nhân',
    'Home & Living': 'Nhà cửa & đời sống',
    Sports: 'Thể thao',
    Books: 'Sách',
    Toys: 'Đồ chơi',
  },
};

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
};

function genId(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}
function num(v: string) { return v ? Number(v) : 0; }

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
  parentTitle: string;
  basePrice: string;
  existingSkus: string[];
  copy: {
    duplicateAttribute: string;
    variantGroups: string;
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
  parentSku, parentTitle, basePrice, existingSkus, copy,
}: VariantSectionProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [groupInput, setGroupInput] = useState<Record<string, string>>({});
  const [addGroupName, setAddGroupName] = useState('');
  const [showAddGroup, setShowAddGroup] = useState(false);

  // Build variant keys from groups
  const variantKeys = useMemo(() => {
    if (groups.length === 0) return [] as string[][];
    const valueArrs = groups.map(g => g.values.map(v => v.trim()).filter(Boolean));
    if (valueArrs.some(a => a.length === 0)) return [];
    return cartesian(valueArrs);
  }, [groups]);

  // Init items when keys change
  const prevKeysRef = useMemo(() => variantKeys.map(k => k.join('|')).join('||'), [variantKeys]);
  const initializedItems = useMemo<VariantItem[]>(() => {
    const currentKeys = variantKeys.map(k => k.join('|')).join('||');
    if (currentKeys === prevKeysRef && items.length > 0) return items;
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
      };
    });
  }, [variantKeys]); // eslint-disable-line react-hooks/exhaustive-deps

  function setItems(newItems: VariantItem[]) {
    onItemsChange(newItems);
  }

  function updateItem(key: string, field: keyof VariantItem, value: string | boolean) {
    setItems(items.map(i => i.key === key ? { ...i, [field]: value } : i));
  }

  function toggleSelectAll(selected: boolean) {
    setItems(items.map(i => ({ ...i, selected })));
  }

  function deleteGroup(id: string) {
    onGroupsChange(groups.filter(g => g.id !== id));
    setShowAddGroup(false);
    setAddGroupName('');
  }

  function addGroup() {
    const name = addGroupName.trim();
    if (!name) return;
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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Layers className="size-4 text-primary" />
          {copy.variantGroups}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">

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
          >
            <Plus className="size-3 mr-1" /> {copy.addVariantAttribute}
          </Button>
        )}

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
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="w-8 p-2"></th>
                      <th className="text-left p-2 font-medium">{copy.variant}</th>
                      <th className="text-left p-2 font-medium w-40">{copy.skuCode}</th>
                      <th className="text-right p-2 font-medium w-28">{copy.price} ({basePrice ? 'JPY' : '—'})</th>
                      <th className="text-right p-2 font-medium w-24">{copy.stock}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {initializedItems.map(item => {
                      const skuDup = item.sku_code && existingSkus.includes(item.sku_code) && !(item.sku_code.startsWith(parentSku));
                      return (
                        <tr key={item.key} className={`border-b last:border-0 ${item.selected ? '' : 'opacity-40'}`}>
                          <td className="p-1.5 text-center">
                            <Checkbox
                              checked={item.selected}
                              onCheckedChange={v => updateItem(item.key, 'selected', Boolean(v))}
                            />
                          </td>
                          <td className="p-2 font-medium text-foreground">{item.key}</td>
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
      </CardContent>
    </Card>
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
      productTypeBundle: 'Bundle',
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
      productTypeBundle: 'セット',
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
      productTypeBundle: 'Combo',
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
    productTypeBundle: 'Bundle',
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
  const categoryLabels = CATEGORY_LABELS[locale] ?? CATEGORY_LABELS['en-US'];

  // Edit mode: read product ID from URL param (:id) or query (?edit=)
  const queryEdit = new URLSearchParams(location.search).get('edit');
  const editId = params.id ?? (queryEdit ?? undefined);
  const existingProduct = editId ? getProductById(editId) : null;
  const existingSkuList = getAllSkus();

  // Guard: if editing but product not found, redirect to create page
  if (editId && !existingProduct) {
    navigate('/ecom/cos/product-master/new', { replace: true });
    return null;
  }


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

  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      };
    }
    return { ...EMPTY_FORM, sku_code: urlSku || '', category: urlFamily || '' };
  };

  const [form, setForm] = useState<FormState>(initForm);

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
        const groups: VariantGroup[] = Object.entries(attrMap).map(([name, values]) => ({
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

  // Channel listings
  const [channels, setChannels] = useState<ChannelListing[]>(
    existingProduct?.channels ?? []
  );

  // Images (stored as data URLs)
  const [images, setImages] = useState<string[]>(existingProduct?.images ?? []);
  const [uploadingImageCount, setUploadingImageCount] = useState(0);

  // Variant state
  const [variantGroups, setVariantGroups] = useState<VariantGroup[]>([]);
  const [variantItems, setVariantItems] = useState<VariantItem[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; type: 'toNonVariant' | 'toVariant' }>({ open: false, type: 'toNonVariant' });

  function setField<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(e => ({ ...e, [k]: '' }));
  }

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
      toast({ title: copy.imageUploaded, description: result.filename });
    } catch {
      toast({ title: copy.uploadFailed, description: copy.couldNotReadFile, variant: 'destructive' });
    } finally {
      setUploadingImageCount((count) => Math.max(0, count - 1));
    }
  }

  function handleHasVariantsChange(checked: boolean) {
    if (form.has_variants && !checked) {
      // Switching from variant → non-variant
      if (variantGroups.length > 0 || variantItems.length > 0) {
        setConfirmDialog({ open: true, type: 'toNonVariant' });
        return;
      }
    }
    if (!form.has_variants && checked) {
      // Switching from non-variant → variant
      setForm(f => ({ ...f, has_variants: true }));
      return;
    }
    setForm(f => ({ ...f, has_variants: checked }));
  }

  function handleConfirmSwitch() {
    setVariantGroups([]);
    setVariantItems([]);
    setForm(f => ({ ...f, has_variants: confirmDialog.type === 'toNonVariant' ? false : true }));
    setConfirmDialog({ open: false, type: 'toNonVariant' });
  }

  function handleSave() {
    if (uploadingImageCount > 0) {
      toast({
        title: copy.imagesStillUploading,
        description: copy.waitForUploads,
        variant: 'destructive',
      });
      return;
    }

    const e: Record<string, string> = {};
    if (!form.sku_code.trim()) e.sku_code = copy.skuRequired;
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
      return;
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
      }));

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
      retail_price: num(form.retail_price),
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
      inventory: Object.fromEntries(Object.entries(inventory).map(([k, v]) => [k, num(v)])),
      has_variants: form.has_variants,
      channels,
      status: existingProduct?.status ?? 'draft',
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

    navigate('/products');
  }

  const totalStock = Object.values(inventory).reduce((s, v) => s + num(v), 0);
  const totalVariants = variantItems.filter(i => i.selected).length;

  return (
    <div data-testid="product-editor-page" className="flex min-h-full flex-col bg-background">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-card shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/products')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="size-4" />
            {copy.productMaster}
          </button>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-medium">
            {existingProduct ? copy.editDetails : copy.createNew}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/products')} disabled={uploadingImageCount > 0}>
            {copy.cancel}
          </Button>
          <Button onClick={handleSave} disabled={uploadingImageCount > 0}>
            {uploadingImageCount > 0 ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4 mr-1.5" />}
            {existingProduct ? copy.saveChanges : copy.saveProduct}
          </Button>
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

      {/* Content */}
      <div data-testid="product-editor-content">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[1fr_300px]">

          {/* Left Column */}
          <div className="space-y-5">

            {/* Product Identity */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Layers className="size-4 text-primary" />
                  {copy.productIdentity}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: 'GTIN', key: 'gtin', placeholder: copy.gtinPlaceholder },
                    { label: 'MPN', key: 'mpn', placeholder: copy.mpnPlaceholder },
                    { label: locale === 'ja-JP' ? '型番' : locale === 'vi-VN' ? 'Model' : 'Model Number', key: 'model_number', placeholder: copy.modelPlaceholder },
                    { label: locale === 'ja-JP' ? 'ブランド名' : locale === 'vi-VN' ? 'Tên thương hiệu' : 'Brand name', key: 'brand', placeholder: copy.brandPlaceholder },
                    { label: 'ASIN', key: 'asin', placeholder: copy.asinPlaceholder },
                    { label: locale === 'ja-JP' ? 'メーカー名' : locale === 'vi-VN' ? 'Tên nhà sản xuất' : 'Manufacturer name', key: 'manufacturer', placeholder: copy.manufacturerPlaceholder },
                  ].map(f => (
                    <Field key={f.key} label={f.label}>
                      <Input value={(form as any)[f.key]} onChange={e => setField(f.key as any, e.target.value)} placeholder={f.placeholder} />
                    </Field>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Product Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Package className="size-4 text-primary" />
                  {copy.productDetails}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label={copy.skuCode} required error={errors.sku_code}>
                    <Input value={form.sku_code} onChange={e => setField('sku_code', e.target.value.toUpperCase())} placeholder={copy.skuPlaceholder} className="font-mono uppercase" />
                  </Field>
                  <Field label={copy.productName} required error={errors.name}>
                    <Input value={form.name} onChange={e => setField('name', e.target.value)} placeholder={copy.namePlaceholder} />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label={copy.description}>
                      <Textarea value={form.description} onChange={e => setField('description', e.target.value)} placeholder={copy.descriptionPlaceholder} rows={2} />
                    </Field>
                  </div>
                  <Field label={copy.category} required error={errors.category}>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.category} onChange={e => setField('category', e.target.value)}>
                      <option value="">{copy.selectCategory}</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{categoryLabels[c] ?? c}</option>)}
                    </select>
                  </Field>
                  <Field label={copy.condition}>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.condition} onChange={e => setField('condition', e.target.value)}>
                      {CONDITIONS.map(c => <option key={c} value={c}>{conditionLabels[c as keyof typeof conditionLabels]}</option>)}
                    </select>
                  </Field>
                </div>
              </CardContent>
            </Card>

            {/* Variant Groups — only if has_variants */}
            {form.has_variants && (
              <VariantSection
                groups={variantGroups}
                onGroupsChange={setVariantGroups}
                items={variantItems}
                onItemsChange={setVariantItems}
                parentSku={form.sku_code}
                parentTitle={form.name}
                basePrice={form.original_price}
                existingSkus={existingSkuList}
                copy={{
                  duplicateAttribute: copy.duplicateAttribute,
                  variantGroups: copy.variantGroups,
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
            )}

            {/* Price */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Info className="size-4 text-primary" />
                  {copy.price}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label={copy.originalPrice}>
                    <div className="flex gap-2">
                      <Input value={form.original_price} onChange={e => setField('original_price', e.target.value)} placeholder="0" type="number" className="flex-1" />
                      <select className="w-20 h-10 rounded-md border border-input bg-background px-2 py-1 text-sm" value={form.price_currency} onChange={e => setField('price_currency', e.target.value)}>
                        {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </Field>
                  <Field label={copy.retailPrice}>
                    <Input value={form.retail_price} onChange={e => setField('retail_price', e.target.value)} placeholder="0" type="number" />
                  </Field>
                  <div className="flex items-end">
                    <p className="text-xs text-muted-foreground">
                      {copy.margin}:{' '}
                      {(() => {
                        const r = num(form.retail_price);
                        const o = num(form.original_price);
                        return r > 0 ? `${(((r - o) / r) * 100).toFixed(1)}%` : '—';
                      })()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Shipping & Return */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Truck className="size-4 text-primary" />
                  {copy.shippingReturn}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <RowField label={copy.productDimensions} fields={[
                  { label: copy.length, value: form.prod_length, onChange: v => setField('prod_length', v), placeholder: '0', suffix: 'cm' },
                  { label: copy.height, value: form.prod_height, onChange: v => setField('prod_height', v), placeholder: '0', suffix: 'cm' },
                  { label: copy.width, value: form.prod_width, onChange: v => setField('prod_width', v), placeholder: '0', suffix: 'cm' },
                  { label: copy.weight, value: form.prod_weight, onChange: v => setField('prod_weight', v), placeholder: '0', suffix: 'g' },
                ]} />
                <RowField label={copy.packageDimensions} fields={[
                  { label: copy.length, value: form.pkg_length, onChange: v => setField('pkg_length', v), placeholder: '0', suffix: 'cm' },
                  { label: copy.height, value: form.pkg_height, onChange: v => setField('pkg_height', v), placeholder: '0', suffix: 'cm' },
                  { label: copy.width, value: form.pkg_width, onChange: v => setField('pkg_width', v), placeholder: '0', suffix: 'cm' },
                  { label: copy.weight, value: form.pkg_weight, onChange: v => setField('pkg_weight', v), placeholder: '0', suffix: 'g' },
                ]} />
              </CardContent>
            </Card>

            {/* Others */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Info className="size-4 text-primary" />
                  {copy.others}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-w-xs space-y-3">
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
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-5">

            {/* Product Information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Info className="size-4 text-primary" />
                  {copy.productInformation}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">{copy.productType}</Label>
                  <div className="flex flex-wrap gap-2">
                    {(['single', 'variant', 'bundle'] as const).map(pt => {
                      const TypeIcon = PRODUCT_TYPE_ICONS[pt];
                      return (
                        <label
                          key={pt}
                          className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                            form.product_type === pt
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-transparent bg-muted/50 hover:bg-muted'
                          }`}
                        >
                          <input
                            type="radio"
                            name="product_type"
                            value={pt}
                            checked={form.product_type === pt}
                            onChange={() => setField('product_type', pt)}
                            className="sr-only"
                          />
                          <TypeIcon className="size-3.5" />
                          {pt === 'single' ? copy.productTypeSingle : pt === 'variant' ? copy.productTypeVariant : copy.productTypeBundle}
                        </label>
                      );
                    })}
                  </div>
                </div>
                {form.product_type === 'variant' && (
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="has-variants"
                      checked={form.has_variants}
                      onCheckedChange={v => handleHasVariantsChange(Boolean(v))}
                      className="mt-0.5"
                    />
                    <Label htmlFor="has-variants" className="text-sm font-normal cursor-pointer">
                      {copy.hasVariations}
                    </Label>
                  </div>
                )}
                <div className="text-xs text-muted-foreground space-y-1 pt-1 border-t">
                  <p><span className="text-foreground font-medium">{copy.family}:</span> {form.category ? categoryLabels[form.category] ?? form.category : '—'}</p>
                  <p><span className="text-foreground font-medium">{copy.variants}:</span> {form.has_variants ? formatMessage(copy.selected, { count: totalVariants }) : copy.no}</p>
                </div>
              </CardContent>
            </Card>

            {/* Show Attributes */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">{copy.showAttributes}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[['all', copy.all, 50], ['required', copy.required, 10], ['recommended', copy.recommended, 15]].map(([val, label, count]) => (
                  <label key={val as string} className="flex items-center gap-2.5 cursor-pointer">
                    <input type="radio" name="show-attr" defaultChecked={val === 'all'} className="accent-primary" />
                    <span className="text-sm">{label}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{formatMessage(copy.showAll, { count: count as number })}</span>
                  </label>
                ))}
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
                        onClick={() => setImages(imgs => imgs.slice(1))}
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
                          onClick={() => setImages(imgs => imgs.filter((_, idx) => idx !== i + 1))}
                          aria-label={formatMessage(copy.removeAdditionalImage, { index: i + 2 })}
                          className="absolute top-1 right-1 size-4 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80 transition-colors"
                        >
                          <X className="size-2.5 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Channel Listing Panel */}
            <ChannelListingPanel
              channels={channels}
              onChannelsChange={setChannels}
            />

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
    </div>
  );
}
