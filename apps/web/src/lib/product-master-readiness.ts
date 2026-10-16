import type { Product } from './product-store';
import { getAttributesForCategory, getProductCatalogSettings, type ProductCatalogSettings } from './product-catalog-settings-store';
import type { Specification } from './category-schema';
import { getMasterMediaReadiness } from './product-master-media';
import { getWarehouses } from './warehouse-store';

export interface VariantGroup { id: string; attributeKey?: string; name: string; values: string[] }
export interface VariantItem {
  id?: string;
  key: string;
  sku_code: string;
  price: string;
  stock: string;
  stock_by_location: Record<string, string>;
  selected: boolean;
  image_url: string;
  option_values?: Record<string, string>;
}

export function hydrateExistingVariants(product: Product | null): { groups: VariantGroup[]; items: VariantItem[] } {
  if (!product?.has_variants || product.skus.length === 0) return { groups: [], items: [] };
  const parsed = product.skus.map(sku => sku.variation_name.split('/').map(value => value.trim()).filter(Boolean));
  const optionCount = Math.min(2, Math.max(...parsed.map(values => values.length), 1));
  const canonicalOptions = product.variant_options?.length
    ? product.variant_options
    : Array.from({ length: optionCount }, (_, index) => {
      const values = Array.from(new Set(parsed.map(parts => parts[index]).filter(Boolean)));
      const candidates = getAttributesForCategory(product.category, product.categoryId).filter(attribute => {
        if (attribute.type !== 'Single select' && attribute.type !== 'Multi-select') return false;
        const allowed = attribute.options.split(',').map(option => option.trim().toLowerCase()).filter(Boolean);
        return values.length > 0 && values.every(value => allowed.includes(value.toLowerCase()));
      });
      const inferred = candidates.length === 1 ? candidates[0] : undefined;
      return { attributeKey: inferred?.key ?? '', name: inferred?.name ?? `Option ${index + 1}`, values };
    });
  const groups = canonicalOptions.slice(0, 2).map((option, index) => ({
    id: `existing-option-${index + 1}`,
    attributeKey: option.attributeKey,
    name: option.name,
    values: [...option.values],
  }));
  // Fallback: split aggregate inventory evenly if no per-SKU data
  const aggregateStock = Object.values(product.inventory).reduce((total, value) => total + Number(value || 0), 0);
  const baseStock = Math.floor(aggregateStock / product.skus.length);
  const remainder = aggregateStock % product.skus.length;
  const items = product.skus.map((sku, index) => ({
    id: sku.id,
    key: sku.variation_name || sku.sku_code,
    sku_code: sku.sku_code,
    price: String(sku.price ?? product.retail_price),
    stock: String(
      sku.stock_by_location
        ? Object.values(sku.stock_by_location).reduce((t, v) => t + v, 0)
        : sku.stock ?? baseStock + (index < remainder ? 1 : 0)
    ),
    stock_by_location: Object.fromEntries(
      Object.entries(sku.stock_by_location ?? {}).map(([k, v]) => [k, String(v)])
    ),
    selected: sku.status === 'active',
    image_url: sku.image_url ?? '',
    option_values: sku.option_values ?? Object.fromEntries(groups.map((group, optionIndex) => [group.attributeKey || group.name.toLowerCase(), parsed[index][optionIndex] ?? ''])),
  }));
  return { groups, items };
}

export function richTextPlainText(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>|<\/div>|<\/li>|<\/blockquote>|<\/h[1-6]>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

type NumericInput = string | number;
export interface MasterReadinessInput {
  name: string;
  sku_code: string;
  category: string;
  categoryId?: string;
  description: string;
  images: string[];
  retail_price: NumericInput;
  inventory: Record<string, NumericInput>;
  has_variants: boolean;
  variantGroups: VariantGroup[];
  variantItems: VariantItem[];
  specifications: Specification[];
  shippingPackageRequired: boolean;
  pkg_length: NumericInput;
  pkg_width: NumericInput;
  pkg_height: NumericInput;
  pkg_weight: NumericInput;
}
export interface MasterReadinessCheck { id: string; label: string; done: boolean }

/** Activation is a Master-only decision. Channel/category requirements belong to each listing. */
export function getMasterReadinessChecks(input: MasterReadinessInput, _settings?: ProductCatalogSettings): MasterReadinessCheck[] {
  const selected = input.variantItems.filter(item => item.selected);
  const positive = (value: NumericInput) => Number.isFinite(Number(value)) && Number(value) > 0;
  // A family code is not an extra sellable SKU. A converted single can retain its code and ID.
  const codes = (input.has_variants ? selected.map(item => item.sku_code) : [input.sku_code]).map(code => code.trim().toUpperCase());
  const warehouses = new Set(getWarehouses().filter(warehouse => warehouse.status === 'active').map(warehouse => warehouse.id));
  const hasWarehouse = (inventory: Record<string, NumericInput>) => Object.entries(inventory).some(([id, quantity]) =>
    warehouses.has(id) && String(quantity).trim() !== '' && Number.isFinite(Number(quantity)) && Number(quantity) >= 0);
  return [
    { id: 'identity', label: 'Add a product title', done: Boolean(input.name.trim()) },
    { id: 'sku', label: input.has_variants ? 'Complete unique Master and variant SKUs' : 'Add a Master SKU',
      done: Boolean(input.sku_code.trim()) && codes.every(Boolean) && new Set(codes).size === codes.length && (!input.has_variants || selected.length > 0) },
    { id: 'content', label: 'Add a product description', done: Boolean(richTextPlainText(input.description)) },
    { id: 'media', label: 'Add at least 1 product image', done: getMasterMediaReadiness(input.images).ready },
    { id: 'price', label: input.has_variants ? 'Configure variant prices' : 'Configure base price',
      done: input.has_variants ? selected.length > 0 && selected.every(item => positive(item.price)) : positive(input.retail_price) },
    { id: 'inventory', label: 'Assign at least 1 warehouse',
      done: input.has_variants ? selected.some(item => hasWarehouse(item.stock_by_location)) : hasWarehouse(input.inventory) },
  ];
}

export function getStoredMasterReadiness(product: Product, settings: ProductCatalogSettings = getProductCatalogSettings()) {
  const variants = hydrateExistingVariants(product);
  const checks = getMasterReadinessChecks({
    ...product, variantGroups: variants.groups, variantItems: variants.items,
    specifications: product.specifications ?? [], shippingPackageRequired: false,
  }, settings);
  const missing = checks.filter(check => !check.done).map(check => check.label);
  return { checks, missing, score: Math.round((checks.length - missing.length) / checks.length * 100), ready: missing.length === 0 };
}
