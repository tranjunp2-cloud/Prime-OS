import type { CatalogImportItem } from './catalog-import-store';
import type { Product } from './product-store';
import { hasVerifiedLegacySingleStructure, resolveSourceSkuMappings, sourceSkuDataError, sourceSkuItems, suggestSourceSkuMappings, type SkuMapping } from './listing-sku-mapping';

/** Move one source SKU, keeping displaced SKUs explicitly unmatched. Never match by position. */
export function assignMatrixSku(rows: SkuMapping[], masterId: string, shopSku: string): SkuMapping[] {
  return rows.map(row => ({ ...row, master_sku_id: shopSku && row.shop_sku === shopSku ? masterId
    : row.master_sku_id === masterId ? '' : row.master_sku_id }));
}

export function sourceMatrixState(source: CatalogImportItem, product: Product, chosen?: SkuMapping[], verifiedSingles: string[] = []) {
  const items = sourceSkuItems(source);
  const variant = product.has_variants || product.product_type === 'variant';
  const verifiedWithoutSku = !variant && hasVerifiedLegacySingleStructure(source, verifiedSingles);
  const error = verifiedWithoutSku ? '' : sourceSkuDataError(source);
  const rows = resolveSourceSkuMappings(source, product, chosen);
  const active = new Set(product.skus.filter(sku => sku.status === 'active' && sku.sku_code.trim()).map(sku => sku.id));
  const valid = error ? [] : variant ? rows.filter(row => active.has(row.master_sku_id)
    && rows.filter(other => other.master_sku_id === row.master_sku_id).length === 1) : [];
  const unknown = source.variants === 0 && !verifiedSingles.includes(source.id);
  const singleMatch = !variant && !error && items.length === 1 && !unknown;
  const pending = items.filter(item => !singleMatch && !valid.some(row => row.shop_sku === item.sku));
  const suggestions = suggestSourceSkuMappings(source, product);
  return { items, rows, valid, pending, error, unknown, singleMatch, suggestions, verifiedWithoutSku,
    matched: singleMatch ? 1 : valid.length, needsReview: Boolean(error || unknown || pending.length) };
}

/** A seller-approved local proposal only; no enrichment, stock import, or changes to existing SKUs. */
export function proposeMatrixSku(product: Product, input: { id: string; code: string; label: string; price?: number }): Product {
  const code = input.code.trim();
  if (!code) throw new Error('Enter a Master SKU code.');
  if ([product.sku_code, ...product.skus.map(sku => sku.sku_code)].some(existing => existing.trim().toLowerCase() === code.toLowerCase())) {
    throw new Error('This code already exists in the Master. Choose a different code or match the existing SKU.');
  }
  if (!input.label.trim()) throw new Error('Enter a variant name so sellers can recognize this SKU.');
  if (input.price !== undefined && !(Number.isFinite(input.price) && input.price > 0)) throw new Error('Enter a price greater than zero, or leave it empty to finish later.');
  return { ...structuredClone(product), has_variants: true, product_type: 'variant',
    skus: [...structuredClone(product.skus), { id: input.id, sku_code: code, variation_name: input.label.trim(), price: input.price,
      weight_g: 0, units_per_carton: 1, status: 'active' }] };
}
