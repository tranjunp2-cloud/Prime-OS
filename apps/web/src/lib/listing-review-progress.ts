import type { CatalogImportItem } from './catalog-import-store';
import type { ChannelListing, Product } from './product-store';
import { completionFields, completionReadiness, newListingMasterPreview, prepareMasterCompletion, reviewMasterSignature, variantMappingError, type VariantMappings } from './listing-master-completion';
import { resolveSourceSkuMappings, sourceSkuDataError, sourceSkuItems, suggestSourceSkuMappings } from './listing-sku-mapping';

export function pendingReviewFor(source: CatalogImportItem, product: Product) {
  return product.channels.find(link => link.channel === source.channel && link.external_id === source.listingId
    && (!link.store_name || link.store_name === source.storeName))?.review_pending;
}

/** Local, evidence-based proposals only. No guessed child SKUs, prices, or warehouse stock. */
export function prepareReviewVariants(master: Product, sources: CatalogImportItem[]): Product {
  const next = prepareMasterCompletion(master, sources);
  if (!sources.some(source => source.variants > 1) && !master.has_variants) return next;
  next.has_variants = true;
  next.product_type = 'variant';
  for (const source of sources) {
    if (sourceSkuDataError(source)) continue;
    const suggestions = suggestSourceSkuMappings(source, next);
    for (const [index, sku] of sourceSkuItems(source).entries()) {
      if (suggestions[index]?.master_sku_id) continue;
      // Conflicting existing codes need a seller decision, never duplicate an identity.
      if (next.skus.some(existing => existing.sku_code.trim().toUpperCase() === sku.sku.trim().toUpperCase())) continue;
      next.skus.push({ id: `review-${source.id}-${index}`, sku_code: sku.sku, variation_name: sku.label,
        price: sku.price?.currency.toUpperCase() === next.price_currency.toUpperCase() ? sku.price.amount : undefined,
        weight_g: 0, units_per_carton: 1, status: 'active' });
    }
    const proposed = newListingMasterPreview(source, { name: next.name, sku: next.sku_code, productType: 'variant' });
    if (!next.variant_options?.length) next.variant_options = proposed.variant_options;
    else for (const option of proposed.variant_options ?? []) {
      const same = next.variant_options.find(existing => option.attributeKey && existing.attributeKey === option.attributeKey);
      if (same) same.values = [...new Set([...same.values, ...option.values])];
    }
  }
  return next;
}

export function reviewProgressIssues(source: CatalogImportItem, product: Product, mappings: VariantMappings, verified: string[], includeMaster: boolean) {
  const issues: string[] = [];
  if (variantMappingError([source], product, mappings, verified)) {
    const rows = mappings[source.id] ?? [];
    const unmatched = sourceSkuItems(source).filter(sku => {
      const row = rows.find(row => row.shop_sku === sku.sku);
      return !row || !product.has_variants || !product.skus.some(sku => sku.id === row.master_sku_id && sku.status === 'active')
        || rows.filter(other => other.master_sku_id === row.master_sku_id).length !== 1;
    }).length;
    issues.push(sourceSkuDataError(source) || source.variants === 0
      ? 'Verify imported SKU details' : `${unmatched || source.variants} SKU${(unmatched || source.variants) === 1 ? '' : 's'} need mapping`);
  }
  if (includeMaster) issues.push(...completionReadiness(product, [source]).missing);
  return issues.length ? issues : ['Review saved details and confirm'];
}

export function savedReviewProgress(source: CatalogImportItem, master: Product, mappings: VariantMappings, verified: string[], draft?: Product, includeMaster = false): NonNullable<ChannelListing['review_pending']> {
  return {
    issues: reviewProgressIssues(source, draft ?? master, mappings, verified, includeMaster),
    // Draft matches have not been confirmed against the persisted Master.
    sku_mapping_pending: Boolean(variantMappingError([source], master, mappings, verified)) || Boolean(draft),
    draft_mappings: mappings[source.id], verified_single: verified.includes(source.id),
    master_draft: draft ? completionFields(draft) : undefined,
    master_signature: draft ? reviewMasterSignature(master) : undefined,
    saved_at: new Date().toISOString(),
  };
}

export const resolvedReviewMappings = (sources: CatalogImportItem[], product: Product, mappings: VariantMappings): VariantMappings =>
  Object.fromEntries(sources.map(source => [source.id, resolveSourceSkuMappings(source, product, mappings[source.id])]));
