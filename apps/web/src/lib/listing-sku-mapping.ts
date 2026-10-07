import type { CatalogImportItem } from './catalog-import-store';
import type { Product, ShopListingSnapshot } from './product-store';

type SourceSku = NonNullable<ShopListingSnapshot['variant_items']>[number];
export type SkuMapping = { shop_sku: string; master_sku_id: string };
const normalized = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();

/** Shop-owned data only. Never manufacture child SKUs from the parent or Master. */
export function sourceSkuItems(source: CatalogImportItem): SourceSku[] {
  if (source.variantItems !== undefined) return source.variantItems;
  return source.variants <= 1 && source.channelSku.trim()
    ? [{ sku: source.channelSku, label: 'Single product' }] : [];
}

export function sourceSkuDataError(source: CatalogImportItem) {
  const items = sourceSkuItems(source);
  if (!items.length || (source.variants > 0 && items.length !== source.variants) || items.some(item => !item.sku.trim())) {
    return 'Listing SKU data is incomplete. Reload listing data before matching.';
  }
  if (new Set(items.map(item => normalized(item.sku))).size !== items.length) {
    return 'Listing SKU data contains duplicate codes. Reload listing data before matching.';
  }
  return '';
}

/** Conservative suggestions, not confirmed links. No positional or parent-SKU matching. */
export function suggestSourceSkuMappings(source: CatalogImportItem, product: Pick<Product, 'skus'>) {
  const active = product.skus.filter(sku => sku.status === 'active' && sku.sku_code.trim());
  const incomplete = Boolean(sourceSkuDataError(source));
  const suggestions = sourceSkuItems(source).map(item => {
    const exact = active.filter(sku => normalized(sku.sku_code) === normalized(item.sku));
    const sameVariant = item.label.trim() ? active.filter(sku => normalized(sku.variation_name) === normalized(item.label)) : [];
    // Conflicting code/variant evidence must be checked by the seller, not guessed.
    const codeMatch = exact.length === 1 && (!item.label.trim() || !exact[0].variation_name.trim()
      || normalized(exact[0].variation_name) === normalized(item.label));
    const match = incomplete ? undefined : exact.length ? codeMatch ? exact[0] : undefined
      : sameVariant.length === 1 ? sameVariant[0] : undefined;
    return { shop_sku: item.sku, master_sku_id: match?.id ?? '', reason: match ? exact.length ? 'SKU matches' : 'Variant matches' : '' };
  });
  // Two source SKUs must never be silently collapsed into the same Master SKU.
  return suggestions.map(row => row.master_sku_id && suggestions.filter(other => other.master_sku_id === row.master_sku_id).length > 1
    ? { ...row, master_sku_id: '', reason: '' } : row);
}

export function resolveSourceSkuMappings(source: CatalogImportItem, product: Pick<Product, 'skus'>, chosen?: SkuMapping[]): SkuMapping[] {
  return suggestSourceSkuMappings(source, product).map(row => ({
    shop_sku: row.shop_sku,
    // Explicit user choices, including clearing a suggestion, survive rerenders.
    master_sku_id: chosen ? chosen.find(item => item.shop_sku === row.shop_sku)?.master_sku_id ?? '' : row.master_sku_id,
  }));
}
