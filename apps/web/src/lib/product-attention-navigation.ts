import type { Product } from './product-store';

const attentionTargets = {
  'import-review': { section: 'overview', elementId: 'product-import-review' },
  basic: { section: 'product-data', elementId: 'product-section-basic' },
  identity: { section: 'product-data', elementId: 'product-name' },
  sku: { section: 'product-data', elementId: 'product-master-sku' },
  brand: { section: 'product-data', elementId: 'product-brand-field' },
  gtin: { section: 'product-data', elementId: 'product-gtin' },
  category: { section: 'product-data', elementId: 'product-category-trigger' },
  content: { section: 'product-data', elementId: 'product-description' },
  media: { section: 'product-data', elementId: 'product-media-panel' },
  pricing: { section: 'commerce', elementId: 'product-section-pricing' },
  shipping: { section: 'product-data', elementId: 'product-section-shipping' },
} as const;

type AttentionTarget = keyof typeof attentionTargets;
type AttentionProduct = Pick<Product, 'id' | 'import_result' | 'import_issues'>;

const issueTargets: Array<[RegExp, AttentionTarget]> = [
  [/image|media|photo/i, 'media'],
  [/gtin|barcode|ean|upc/i, 'gtin'],
  [/brand/i, 'brand'],
  [/category/i, 'category'],
  [/description|content/i, 'content'],
  [/variant|price|pricing|inventory|stock/i, 'pricing'],
  [/sku/i, 'sku'],
  [/name|title/i, 'identity'],
  [/shipping|package|dimension|weight/i, 'shipping'],
];

export function getProductAttentionTarget(value: string | null) {
  return value && Object.prototype.hasOwnProperty.call(attentionTargets, value)
    ? attentionTargets[value as AttentionTarget]
    : null;
}

export function getProductAttentionHref(product: AttentionProduct, missingFields: string[] = []) {
  const base = `/products/${encodeURIComponent(product.id)}/edit`;
  let target: AttentionTarget;
  if (product.import_result === 'needs_review') {
    target = 'import-review';
  } else if (product.import_result === 'incomplete' || (!product.import_result && missingFields.length > 0)) {
    // Prefer the issue displayed in the import badge over unrelated quality checks.
    const issues = [...(product.import_issues ?? []), ...missingFields];
    target = issues.map(issue => issueTargets.find(([pattern]) => pattern.test(issue))?.[1]).find(Boolean) ?? 'basic';
  } else {
    return base;
  }
  return `${base}?section=${attentionTargets[target].section}&focus=${target}`;
}
