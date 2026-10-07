import type { CatalogImportItem } from './catalog-import-store';
import type { Product } from './product-store';

export type EvidenceState = 'match' | 'different' | 'missing' | 'check';
export type MatchEvidence = {
  key: string;
  label: string;
  listing: string;
  master: string;
  state: EvidenceState;
  note?: string;
};
const normalized = (value?: string) => value?.trim().replace(/\s+/g, ' ').toLocaleUpperCase() || '';
const quantity = (value?: number) => Number.isInteger(value) && value! > 0 ? `${value} units` : '';
export const hasVariantMapping = (item: CatalogImportItem, product: Product) => item.variants !== 1 || product.has_variants || product.product_type === 'variant' || product.skus.length > 1;

/** Names can offer a clue, never verified pack-size evidence. */
export function packTitleHint(title: string) {
  const hint = title.match(/\b\d+\s*[-–]?\s*(?:pieces?|pcs?|sheets?)\b|\bpack\s+of\s+\d+\b/i)?.[0];
  return hint ? `Title says “${hint}” · unverified` : '';
}

export function listingMatchEvidence(item: CatalogImportItem, product: Product): MatchEvidence[] {
  const values: [string, string, string | undefined, string | undefined][] = [
    ['sku', 'SKU', item.channelSku, product.sku_code],
    ['brand', 'Brand', item.brand, product.brand],
    ['model', 'Model', item.modelNumber, product.model_number],
    ['mpn', 'Manufacturer part number', item.mpn, product.mpn],
    ['gtin', 'Barcode (GTIN)', item.gtin, product.gtin],
    ['pack', 'Pack quantity', quantity(item.packQuantity), quantity(product.pack_quantity)],
  ];
  const rows: MatchEvidence[] = values.map(([key, label, listing, master]) => ({
    key, label, listing: listing?.trim() || '', master: master?.trim() || '',
    state: !normalized(listing) || !normalized(master) ? 'missing' : normalized(listing) === normalized(master) ? 'match' : 'different',
    ...(key === 'sku' && normalized(listing) !== normalized(master) ? { note: 'Shop and Master codes can differ. Check the product itself.' } : {}),
  }));
  const variants = hasVariantMapping(item, product);
  rows.push({ key: 'structure', label: 'Product structure', listing: item.variants === 0 ? '' : item.variants === 1 ? 'Single product · 1 SKU' : `${item.variants} SKUs`, master: product.has_variants || product.product_type === 'variant' || product.skus.length > 1 ? `Variants · ${product.skus.length} recorded SKUs` : 'Single product · 1 SKU', state: item.variants === 0 ? 'missing' : variants ? 'check' : 'match', ...(variants ? { note: 'Each child SKU must be matched. Equal SKU counts do not confirm a match.' } : {}) });
  return rows;
}

export function evidenceSummary(item: CatalogImportItem, product: Product) {
  const identity = listingMatchEvidence(item, product).filter(row => row.key !== 'structure');
  return {
    matches: identity.filter(row => row.state === 'match'),
    differences: identity.filter(row => row.state === 'different'),
    missing: identity.filter(row => row.state === 'missing'),
    variants: hasVariantMapping(item, product),
  };
}

/** Count listings, not fields, so one source's evidence never represents a whole group. */
export function groupEvidenceSummary(items: CatalogImportItem[], product: Product) {
  const summaries = items.map(item => evidenceSummary(item, product));
  return {
    skuMatches: summaries.filter(summary => summary.matches.some(row => row.key === 'sku')).length,
    withDifferences: summaries.filter(summary => summary.differences.length > 0).length,
    withMissingData: summaries.filter(summary => summary.missing.length > 0).length,
    withVariants: summaries.filter(summary => summary.variants).length,
  };
}

/** Recompute a conservative suggestion after creation. Never match by rank/count alone. */
function sourceBasedCandidate(item: CatalogImportItem, products: Product[]) {
  const titleKey = (value: string) => normalized(value).split(/[^\p{L}\p{N}]+/u).filter(Boolean).sort().join(' ');
  const candidates = products.filter(product => product.status !== 'archived' && !listingMatchEvidence(item, product)
    .some(row => ['gtin', 'mpn', 'model', 'pack'].includes(row.key) && row.state === 'different') && (
    (normalized(item.gtin) && normalized(item.gtin) === normalized(product.gtin)) ||
    product.channels.some(channel => {
      const source = channel.shop_snapshot;
      return source && normalized(item.brand) && normalized(item.brand) === normalized(source.brand)
        && titleKey(item.title) === titleKey(source.title) && item.variants === source.variant_count;
    })
  ));
  return candidates.length === 1 ? candidates[0] : null;
}

/** Preselect for review only; every resulting relationship still needs confirmation. */
export function suggestedMasterForReview(items: CatalogImportItem[], products: Product[]) {
  if (!items.length || items.some(item => item.confirmed || item.status === 'ignored' || item.resolution === 'ignore')) return null;
  const candidates = items.map(item => products.find(product => product.id === item.suggestedProductId && product.status !== 'archived') ?? sourceBasedCandidate(item, products));
  return candidates[0] && candidates.every(product => product?.id === candidates[0]?.id) ? candidates[0] : null;
}

/** Ranking only: never expose this heuristic as a probability or bypass confirmation. */
export function rankMasterCandidates(items: CatalogImportItem[], products: Product[], query: string) {
  const term = normalized(query);
  const score = (product: Product) => items.reduce((total, item) => {
    const rows = listingMatchEvidence(item, product);
    const weights: Record<string, number> = { gtin: 40, sku: 30, model: 15, mpn: 15, brand: 4, pack: 2 };
    const evidence = rows.reduce((sum, row) => sum + (row.state === 'match' ? (weights[row.key] ?? 0) : 0), 0);
    const words = new Set(normalized(item.title).split(/[^\p{L}\p{N}]+/u).filter(word => word.length > 2));
    const common = new Set(normalized(product.name).split(/[^\p{L}\p{N}]+/u).filter(word => words.has(word))).size;
    return total + evidence + Math.min(common, 6) + (item.suggestedProductId === product.id ? 8 : 0);
  }, 0);
  return products.filter(product => product.status !== 'archived' && normalized(`${product.name} ${product.sku_code} ${product.brand}`).includes(term))
    .map(product => ({ product, score: score(product) }))
    .sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name))
    .map(({ product }) => product);
}

export function safeListingUrl(value?: string) {
  if (!value) return undefined;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : undefined; }
  catch { return undefined; }
}
