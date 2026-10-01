import type { Product } from './product-store';
import { getAttributesForCategory, getProductCatalogSettings, resolveCatalogCategory, type ProductCatalogSettings } from './product-catalog-settings-store';
import { assignedCategoryAttributes, missingCategoryAttributes, type Specification } from './category-schema';

export interface VariantGroup { id: string; name: string; values: string[] }
export interface VariantItem {
  id?: string;
  key: string;
  sku_code: string;
  price: string;
  stock: string;
  stock_by_location: Record<string, string>;
  selected: boolean;
  image_url: string;
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

/** One checklist for live editor input and saved products in the catalog. */
export function getMasterReadinessChecks(input: MasterReadinessInput, settings: ProductCatalogSettings = getProductCatalogSettings()): MasterReadinessCheck[] {
  const category = resolveCatalogCategory(input, settings.categories);
  const attributes = assignedCategoryAttributes(category, settings.attributes);
  const options = input.variantGroups.map(group => ({
    attributeKey: attributes.find(attribute => attribute.name.toLowerCase() === group.name.toLowerCase())?.key ?? '',
    name: group.name, values: group.values,
  }));
  const missingAttributes = missingCategoryAttributes(attributes, { specifications: input.specifications, has_variants: input.has_variants, variant_options: options });
  const selected = input.variantItems.filter(item => item.selected);
  const generated = input.has_variants && selected.length > 0;
  const variantPricingReady = generated && selected.every(item => item.sku_code.trim() && Number(item.price) > 0)
    && selected.reduce((total, item) => total + Number(item.stock || 0), 0) > 0;
  const totalStock = Object.values(input.inventory).reduce<number>((total, value) => total + Number(value || 0), 0);
  const selectable = settings.attributes.filter(attribute => attribute.status === 'Active'
    && ['Single select', 'Multi-select'].includes(attribute.type) && attribute.options.trim());
  const invalidGroups = input.variantGroups.filter(group => !selectable.some(attribute => attribute.name.trim().toLowerCase() === group.name.trim().toLowerCase()));
  const checks: MasterReadinessCheck[] = [
    { id: 'identity', label: 'Add product name and master SKU', done: input.name.trim().length >= 3 && Boolean(input.sku_code.trim()) },
    { id: 'media', label: 'Add at least 3 product images', done: input.images.length >= 3 },
    { id: 'content', label: 'Write a detailed description (100+ characters)', done: richTextPlainText(input.description).length >= 100 },
    { id: 'category', label: 'Select an active product category', done: category?.status === 'Active' },
    { id: 'price', label: input.has_variants ? 'Configure variant pricing and stock' : 'Configure base price and inventory',
      done: generated ? variantPricingReady : Number(input.retail_price) > 0 && totalStock > 0 },
  ];
  if (attributes.some(attribute => attribute.required)) checks.push({
    id: 'attributes', label: missingAttributes.length ? `Complete required attributes: ${missingAttributes.map(attribute => attribute.name).join(', ')}` : 'Complete required category attributes',
    done: missingAttributes.length === 0,
  });
  if (input.shippingPackageRequired) checks.push({
    id: 'shipping', label: 'Configure shipping package dimensions and weight',
    done: Boolean(Number(input.pkg_length) && Number(input.pkg_width) && Number(input.pkg_height) && Number(input.pkg_weight)),
  });
  if (input.has_variants) checks.push({
    id: 'variants',
    label: invalidGroups.length > 0 ? `Replace ${invalidGroups.length} invalid variant option ${invalidGroups.length === 1 ? 'type' : 'types'}`
      : input.variantGroups.length === 0 ? 'Add at least one valid variant option'
        : input.variantGroups.some(group => group.values.length === 0) ? 'Select values for every variant option' : 'Complete all selected variants',
    done: input.variantGroups.length > 0 && invalidGroups.length === 0 && input.variantGroups.every(group => group.values.length > 0)
      && generated && selected.every(item => Boolean(item.sku_code.trim())),
  });
  return checks;
}

export function getStoredMasterReadiness(product: Product, settings: ProductCatalogSettings = getProductCatalogSettings()) {
  const variants = hydrateExistingVariants(product);
  const onlineChannels = ['webstore', 'shopee', 'lazada', 'tiktok', 'amazon', 'rakuten'] as const;
  const shippingPackageRequired = onlineChannels.some(key => product.channel_overrides?.[key]?.enabled
    ?? product.channels.some(listing => listing.channel === (key === 'webstore' ? 'website' : key)));
  const checks = getMasterReadinessChecks({
    ...product, variantGroups: variants.groups, variantItems: variants.items,
    specifications: product.specifications ?? [], shippingPackageRequired,
  }, settings);
  const missing = checks.filter(check => !check.done).map(check => check.label);
  return { checks, missing, score: Math.round((checks.length - missing.length) / checks.length * 100), ready: missing.length === 0 };
}
