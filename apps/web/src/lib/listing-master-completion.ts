import type { CatalogImportItem } from './catalog-import-store';
import { getProducts, type Product, type ProductType } from './product-store';
import { getProductCatalogSettings, resolveCatalogCategory } from './product-catalog-settings-store';
import { getStoredMasterReadiness } from './product-master-readiness';

export type MasterCompletion = Pick<Product, 'name' | 'description' | 'category' | 'categoryId' | 'images' | 'retail_price' | 'price_currency' | 'specifications' | 'pkg_length' | 'pkg_width' | 'pkg_height' | 'pkg_weight' | 'variant_options' | 'skus'>;
export type VariantMappings = Record<string, Array<{ shop_sku: string; master_sku_id: string }>>;
export const completionKeys = ['name', 'description', 'category', 'categoryId', 'images', 'retail_price', 'price_currency', 'specifications', 'pkg_length', 'pkg_width', 'pkg_height', 'pkg_weight', 'variant_options', 'skus'] as const;
export function completionFields(product: Product): MasterCompletion {
  return Object.fromEntries(completionKeys.map(key => [key, structuredClone(product[key])])) as MasterCompletion;
}
export function sourceImages(source: CatalogImportItem) {
  return [...new Set([source.image, ...(source.images ?? [])].map(value => value.trim()).filter(Boolean))];
}
export function prepareMasterCompletion(master: Product, sources: CatalogImportItem[]): Product {
  const next = structuredClone(master);
  next.images = [...new Set([...master.images, ...sources.flatMap(sourceImages)])].slice(0, 9);
  if (!next.description.trim()) next.description = sources.find(source => source.description?.trim())?.description ?? '';
  for (const key of ['pkg_length', 'pkg_width', 'pkg_height', 'pkg_weight'] as const) {
    if (!(next[key] > 0)) next[key] = sources.find(source => Number.isFinite(source[key]) && source[key]! > 0)?.[key] ?? 0;
  }
  return next;
}
export function newListingMasterPreview(source: CatalogImportItem, input: { name: string; sku: string; productType?: ProductType; categoryId?: string; brandId?: string; copySourcePrice?: boolean }): Product {
  const settings = getProductCatalogSettings();
  const category = settings.categories.find(item => item.id === input.categoryId && item.status === 'Active');
  const brand = settings.brands.find(item => item.id === input.brandId && item.status === 'Active');
  return {
    id: 'new-listing-master', name: input.name.trim(), sku_code: input.sku.trim().toUpperCase(),
    product_type: input.productType ?? (source.variants > 1 ? 'variant' : 'single'), has_variants: input.productType ? input.productType === 'variant' : source.variants > 1,
    brand: brand?.name ?? '', brandId: brand?.id, category: category?.name ?? '', categoryId: category?.id,
    gtin: source.gtin?.trim() ?? '', mpn: source.mpn?.trim() ?? '', model_number: source.modelNumber?.trim() ?? '', pack_quantity: Number.isInteger(source.packQuantity) && source.packQuantity! > 0 ? source.packQuantity : undefined,
    asin: '', manufacturer: '', condition: 'new', description: source.description ?? '', original_price: 0,
    retail_price: input.copySourcePrice ? source.price : 0, price_currency: input.copySourcePrice ? source.currency.trim().toUpperCase() : 'JPY',
    prod_length: source.prod_length ?? 0, prod_width: source.prod_width ?? 0, prod_height: source.prod_height ?? 0, prod_weight: source.prod_weight ?? 0,
    pkg_length: source.pkg_length ?? 0, pkg_width: source.pkg_width ?? 0, pkg_height: source.pkg_height ?? 0, pkg_weight: source.pkg_weight ?? 0,
    images: sourceImages(source), country_of_origin: '', hs_code: '', inventory: {}, channels: [], channel_overrides: {}, skus: [],
    status: 'draft', created_at: '', updated_at: '',
  };
}
/** Only reviewed content may change here. Inventory, identity, shop state and sync are never accepted from form patches. */
export function applyMasterCompletion(master: Product, sources: CatalogImportItem[], patch?: Partial<MasterCompletion>): Product {
  const product = prepareMasterCompletion(master, sources);
  if (patch) for (const key of completionKeys) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) Object.assign(product, { [key]: structuredClone(patch[key]) });
  }
  const settings = getProductCatalogSettings();
  const category = resolveCatalogCategory(product, settings.categories);
  if (category) { product.category = category.name; product.categoryId = category.id; }
  product.images = [...new Set(product.images.map(image => image.trim()).filter(Boolean))];
  if (master.skus.some(previous => !product.skus.some(sku => sku.id === previous.id))) {
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
export function assertMasterComplete(product: Product, sources: CatalogImportItem[]) {
  const readiness = completionReadiness(product, sources);
  if (!readiness.ready) throw new Error(`Complete required details before activating: ${readiness.missing.join('; ')}.`);
  if (!/^[A-Z]{3}$/.test(product.price_currency)) throw new Error('Choose a valid three-letter currency.');
  if (product.images.length > 9 || product.images.some(url => !/^(https?:\/\/|\/(?!\/)|data:image\/(png|jpeg|webp);base64,)/i.test(url))) throw new Error('Use up to 9 valid product image URLs or uploaded images.');
  const codes = [product.sku_code, ...(product.has_variants ? product.skus.map(sku => sku.sku_code) : [])].map(code => code.trim().toUpperCase());
  if (codes.some(code => !code) || new Set(codes).size !== codes.length) throw new Error('Every Master and variant SKU must be distinct.');
  const original = getProducts().find(other => other.id === product.id);
  const originalCodes = new Set(original ? [original.sku_code, ...original.skus.map(sku => sku.sku_code)].map(code => code.trim().toUpperCase()) : []);
  // Preserve an existing identity, including legacy duplicates. Enforce uniqueness
  // for new/edited codes without forcing sellers to rename a linked Master.
  const changedCodes = codes.filter(code => !originalCodes.has(code));
  if (getProducts().some(other => other.id !== product.id && [other.sku_code, ...other.skus.map(sku => sku.sku_code)].some(code => changedCodes.includes(code.trim().toUpperCase())))) throw new Error('This SKU already exists on another Master. Choose a unique SKU.');
}
export function variantMappingError(sources: CatalogImportItem[], product: Product, mappings: VariantMappings = {}, verifiedSingles: string[] = []) {
  for (const source of sources) {
    const count = source.variants === 0 && verifiedSingles.includes(source.id)
      ? product.has_variants ? mappings[source.id]?.length ?? 0 : 1 : source.variants;
    if (!product.has_variants && product.product_type !== 'variant') {
      if (count !== 1) return 'These listings need variant-SKU matching. Choose a variant Master or create one from this listing.';
      continue;
    }
    const rows = mappings[source.id] ?? [];
    if (count < 1 || rows.length !== count || rows.some(row => !row.shop_sku.trim() || !product.skus.some(sku => sku.id === row.master_sku_id && sku.status === 'active'))
      || new Set(rows.map(row => row.shop_sku.trim().toUpperCase())).size !== count
      || new Set(rows.map(row => row.master_sku_id)).size !== count) return 'Complete variant-SKU matching for every source SKU before linking.';
    if (source.variantItems?.length && source.variantItems.some(item => !rows.some(row => row.shop_sku.trim() === item.sku.trim()))) return 'Map the exact child SKUs reported by the source listing.';
  }
  return '';
}
