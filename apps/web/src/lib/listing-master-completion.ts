import type { CatalogImportItem } from './catalog-import-store';
import { getProducts, type Product, type ProductType } from './product-store';
import { getProductCatalogSettings, resolveCatalogCategory } from './product-catalog-settings-store';
import { getStoredMasterReadiness } from './product-master-readiness';
import { sourceSkuDataError, sourceSkuItems } from './listing-sku-mapping';
import { fieldMappingErrors, initialFieldMappings, importedFieldCandidates, mappingDecision, suggestAttributeFields } from './listing-field-mapping';

export type MasterCompletion = Pick<Product, 'name' | 'description' | 'category' | 'categoryId' | 'images' | 'retail_price' | 'price_currency' | 'specifications' | 'pkg_length' | 'pkg_width' | 'pkg_height' | 'pkg_weight' | 'variant_options' | 'skus'> & Partial<Pick<Product, 'has_variants' | 'product_type' | 'brand' | 'brandId' | 'gtin' | 'mpn' | 'model_number' | 'pack_quantity' | 'field_mappings'>>;
export type VariantMappings = Record<string, Array<{ shop_sku: string; master_sku_id: string }>>;
export const completionKeys = ['name', 'description', 'category', 'categoryId', 'images', 'retail_price', 'price_currency', 'specifications', 'pkg_length', 'pkg_width', 'pkg_height', 'pkg_weight', 'variant_options', 'skus', 'has_variants', 'product_type', 'brand', 'brandId', 'gtin', 'mpn', 'model_number', 'pack_quantity', 'field_mappings'] as const;
export function completionFields(product: Product): MasterCompletion {
  return Object.fromEntries(completionKeys.map(key => [key, structuredClone(product[key])])) as MasterCompletion;
}
export const reviewMasterSignature = (product: Product) => JSON.stringify(completionFields(product));
export function sourceImages(source: CatalogImportItem) {
  return [...new Set([source.image, ...(source.images ?? [])].map(value => value.trim()).filter(Boolean))];
}
export function prepareMasterCompletion(master: Product, sources: CatalogImportItem[]): Product {
  const next = structuredClone(master);
  next.images = [...new Set([...master.images, ...sources.flatMap(sourceImages)])].slice(0, 9);
  if (!next.description.trim()) {
    const source = importedFieldCandidates(sources).find(field => field.key === 'description');
    if (source) { next.description = String(source.value); next.field_mappings = { ...next.field_mappings, description: mappingDecision(source, next.description, 'source') }; }
  }
  for (const key of ['pkg_length', 'pkg_width', 'pkg_height', 'pkg_weight'] as const) {
    if (!(next[key] > 0)) {
      const source = importedFieldCandidates(sources).find(field => field.key === key && Number(field.value) > 0);
      if (source) { next[key] = Number(source.value); next.field_mappings = { ...next.field_mappings, [key]: mappingDecision(source, next[key], 'source') }; }
    }
  }
  return suggestAttributeFields(next, sources);
}
export function newListingMasterPreview(source: CatalogImportItem, input: { name: string; sku: string; productType?: ProductType; categoryId?: string; brandId?: string; copySourcePrice?: boolean }): Product {
  const settings = getProductCatalogSettings();
  const category = settings.categories.find(item => item.id === input.categoryId && item.status === 'Active');
  const brand = settings.brands.find(item => item.id === input.brandId && item.status === 'Active');
  const hasVariants = input.productType ? input.productType === 'variant' : source.variants > 1;
  const sourceSkus = hasVariants && !sourceSkuDataError(source) ? sourceSkuItems(source) : [];
  const parts = sourceSkus.map(sku => sku.label.split('/').map(value => value.trim()));
  const optionCount = parts.length && parts.every(values => values.length === parts[0].length) ? parts[0].length : 0;
  const variantOptions = Array.from({ length: Math.min(2, optionCount) }, (_, index) => {
    const values = [...new Set(parts.map(part => part[index]).filter(Boolean))];
    const candidates = settings.attributes.filter(attribute => attribute.status === 'Active' && ['Single select', 'Multi-select'].includes(attribute.type)
      && values.length > 0 && values.every(value => attribute.options.split(',').some(option => option.trim().toLowerCase() === value.toLowerCase())));
    const attribute = candidates.length === 1 ? candidates[0] : undefined;
    return { attributeKey: attribute?.key ?? '', name: attribute?.name ?? `Option ${index + 1}`, values };
  });
  const product: Product = {
    id: 'new-listing-master', name: input.name.trim(), sku_code: input.sku.trim().toUpperCase(),
    product_type: input.productType ?? (source.variants > 1 ? 'variant' : 'single'), has_variants: input.productType ? input.productType === 'variant' : source.variants > 1,
    brand: brand?.name ?? '', brandId: brand?.id, category: category?.name ?? '', categoryId: category?.id,
    gtin: source.gtin?.trim() ?? '', mpn: source.mpn?.trim() ?? '', model_number: source.modelNumber?.trim() ?? '', pack_quantity: Number.isInteger(source.packQuantity) && source.packQuantity! > 0 ? source.packQuantity : undefined,
    asin: '', manufacturer: '', condition: 'new', description: source.description ?? '', original_price: 0,
    retail_price: input.copySourcePrice ? source.price : 0, price_currency: input.copySourcePrice ? source.currency.trim().toUpperCase() : 'JPY',
    prod_length: source.prod_length ?? 0, prod_width: source.prod_width ?? 0, prod_height: source.prod_height ?? 0, prod_weight: source.prod_weight ?? 0,
    pkg_length: source.pkg_length ?? 0, pkg_width: source.pkg_width ?? 0, pkg_height: source.pkg_height ?? 0, pkg_weight: source.pkg_weight ?? 0,
    images: sourceImages(source), country_of_origin: '', hs_code: '', inventory: {}, channels: [], channel_overrides: {},
    variant_options: variantOptions,
    skus: sourceSkus.map((sku, index) => ({ id: `source-${source.id}-${index}`, sku_code: sku.sku,
      variation_name: sku.label, price: input.copySourcePrice && sku.price?.currency.toUpperCase() === source.currency.toUpperCase() ? sku.price.amount : undefined,
      weight_g: 0, units_per_carton: 1, status: 'active' as const })),
    status: 'draft', created_at: '', updated_at: '',
  };
  product.field_mappings = initialFieldMappings(product, source);
  return product;
}
/** Only reviewed content may change here. Inventory, identity, shop state and sync are never accepted from form patches. */
export function applyMasterCompletion(master: Product, sources: CatalogImportItem[], patch?: Partial<MasterCompletion>, creating = false): Product {
  const product = creating ? prepareMasterCompletion(master, sources) : structuredClone(master);
  if (patch) for (const key of completionKeys) {
    if (creating && (key === 'has_variants' || key === 'product_type')) continue;
    if (Object.prototype.hasOwnProperty.call(patch, key)) Object.assign(product, { [key]: structuredClone(patch[key]) });
  }
  const settings = getProductCatalogSettings();
  const category = resolveCatalogCategory(product, settings.categories);
  if (category) { product.category = category.name; product.categoryId = category.id; }
  product.images = [...new Set(product.images.map(image => image.trim()).filter(Boolean))];
  if (!creating && master.skus.some(previous => !product.skus.some(sku => sku.id === previous.id))) {
    throw new Error('Existing variant SKUs cannot be removed during listing review. Keep them and map the source SKUs.');
  }
  product.skus = product.skus.map(sku => {
    const previous = master.skus.find(item => item.id === sku.id);
    return { ...sku, stock: previous?.stock, stock_by_location: previous?.stock_by_location };
  });
  return product;
}
export function completionReadiness(product: Product, sources: CatalogImportItem[]) {
  // Include intended relationships so shipping validation agrees with the saved Master/editor.
  const candidate = { ...product, channels: [...product.channels, ...sources.map(source => ({ channel: source.channel, external_id: source.listingId, status: 'draft' as const, listing_url: null, last_synced_at: null }))] };
  return getStoredMasterReadiness(candidate);
}
export function assertMasterComplete(product: Product, sources: CatalogImportItem[], products = getProducts()) {
  const fieldError = fieldMappingErrors(product, sources, products.find(other => other.id === product.id))[0];
  if (fieldError) throw new Error(fieldError);
  const readiness = completionReadiness(product, sources);
  if (!readiness.ready) throw new Error(`Complete required details before activating: ${readiness.missing.join('; ')}.`);
  if (!/^[A-Z]{3}$/.test(product.price_currency)) throw new Error('Choose a valid three-letter currency.');
  if (product.images.length > 9 || product.images.some(url => !/^(https?:\/\/|\/(?!\/)|data:image\/(png|jpeg|webp);base64,)/i.test(url))) throw new Error('Use up to 9 valid product image URLs or uploaded images.');
  const codes = [product.sku_code, ...(product.has_variants ? product.skus.map(sku => sku.sku_code) : [])].map(code => code.trim().toUpperCase());
  if (codes.some(code => !code) || new Set(codes).size !== codes.length) throw new Error('Every Master and variant SKU must be distinct.');
  const original = products.find(other => other.id === product.id);
  const originalCodes = new Set(original ? [original.sku_code, ...original.skus.map(sku => sku.sku_code)].map(code => code.trim().toUpperCase()) : []);
  // Preserve an existing identity, including legacy duplicates. Enforce uniqueness
  // for new/edited codes without forcing sellers to rename a linked Master.
  const changedCodes = codes.filter(code => !originalCodes.has(code));
  if (products.some(other => other.id !== product.id && [other.sku_code, ...other.skus.map(sku => sku.sku_code)].some(code => changedCodes.includes(code.trim().toUpperCase())))) throw new Error('This SKU already exists on another Master. Choose a unique SKU.');
}
export function variantMappingError(sources: CatalogImportItem[], product: Product, mappings: VariantMappings = {}, verifiedSingles: string[] = []) {
  for (const source of sources) {
    const count = source.variants === 0 && verifiedSingles.includes(source.id)
      ? product.has_variants ? mappings[source.id]?.length ?? 0 : 1 : source.variants;
    if (!product.has_variants && product.product_type !== 'variant') {
      if (count !== 1) return 'These listings need variant-SKU matching. Choose a variant Master or create one from this listing.';
      continue;
    }
    const sourceError = sourceSkuDataError(source);
    if (sourceError) return sourceError;
    const rows = mappings[source.id] ?? [];
    if (count < 1 || rows.length !== count || rows.some(row => !row.shop_sku.trim() || !product.skus.some(sku => sku.id === row.master_sku_id && sku.status === 'active'))
      || new Set(rows.map(row => row.shop_sku.trim().toUpperCase())).size !== count
      || new Set(rows.map(row => row.master_sku_id)).size !== count) return 'Complete variant-SKU matching for every source SKU before linking.';
    if (sourceSkuItems(source).some(item => !rows.some(row => row.shop_sku.trim() === item.sku.trim()))) return 'Map the exact child SKUs reported by the source listing.';
  }
  return '';
}
