import type { CatalogImportItem } from './catalog-import-store';
import type { Product } from './product-store';
import { convertField, fieldValue, importedFieldCandidates, mappingDecision, MASTER_MAPPING_TARGETS, writeMappedField } from './listing-field-mapping';
import { prepareMasterCompletion, type VariantMappings } from './listing-master-completion';
import { resolveSourceSkuMappings, sourceSkuDataError, sourceSkuItems } from './listing-sku-mapping';

/** Review-only proposals. Calling this never writes to the catalog or changes a shop. */
export function proposeListingReview(master: Product, sources: CatalogImportItem[], products: Product[], chosen: VariantMappings = {}) {
  let product = prepareMasterCompletion(master, sources);
  // Keep existing content as the default; only enrich empty fields automatically.
  if (master.images.length) product.images = structuredClone(master.images);
  const candidates = importedFieldCandidates(sources);
  for (const target of MASTER_MAPPING_TARGETS) {
    if (fieldValue(product, target.key) || product.field_mappings?.[target.key] || target.key === 'brandId' && product.brand) continue;
    for (const field of candidates.filter(field => field.key === target.sourceKey)) {
      const result = convertField(field, target, product.price_currency);
      if (result.error || !result.value) continue;
      product = writeMappedField(product, target, result.value, mappingDecision(field, result.value, 'source', result.transform));
      break;
    }
  }
  const mappings: VariantMappings = structuredClone(chosen);
  if (!product.has_variants && product.product_type !== 'variant' && !sources.some(source => source.variants > 1 && !sourceSkuDataError(source))) return { product, mappings };
  product.has_variants = true;
  product.product_type = 'variant';
  const normalize = (code: string) => code.trim().toUpperCase();
  const codes = new Set([...products.flatMap(item => [item.sku_code, ...item.skus.map(sku => sku.sku_code)]), product.sku_code, ...product.skus.map(sku => sku.sku_code)].map(normalize));
  const ids = new Set(product.skus.map(sku => sku.id));
  const singleProposals: Array<{ source: CatalogImportItem; code: string; id: string }> = [];
  for (const source of sources) {
    // A count alone is not SKU data. Do not manufacture missing provider records.
    if (sourceSkuDataError(source)) continue;
    const rows = resolveSourceSkuMappings(source, product, chosen[source.id]);
    for (const [index, item] of sourceSkuItems(source).entries()) {
      const row = rows[index];
      // Never reverse a seller's explicit clear, edit, or deferred decision.
      if (row.master_sku_id || chosen[source.id]?.some(choice => choice.shop_sku === item.sku)) continue;
      const sameSingle = source.variants === 1 && singleProposals.find(proposal => normalize(proposal.code) === normalize(item.sku)
        && proposal.source.title === source.title && proposal.source.brand === source.brand
        && !rows.some(row => row.master_sku_id === proposal.id));
      if (sameSingle) { row.master_sku_id = sameSingle.id; continue; }
      const base = normalize(item.sku).replace(/\s+/g, '-');
      let code = base;
      for (let suffix = 2; codes.has(code); suffix++) code = `${base}-${suffix}`;
      let id = `proposal-${source.id}-${index}`;
      for (let suffix = 2; ids.has(id); suffix++) id = `proposal-${source.id}-${index}-${suffix}`;
      const price = proposedSkuPrice(product, source, item.sku);
      product.skus.push({ id, sku_code: code,
        variation_name: !item.label.trim() || item.label === 'Single product' ? source.title : item.label,
        price: price.amount, weight_g: 0, units_per_carton: 1, status: 'active' });
      row.master_sku_id = id;
      if (source.variants === 1) singleProposals.push({ source, code: item.sku, id });
      codes.add(code); ids.add(id);
    }
    mappings[source.id] = rows;
  }
  return { product, mappings };
}

/** A base-price suggestion is not an FX conversion and must be labelled as such. */
export function proposedSkuPrice(product: Product, source: CatalogImportItem, shopSku: string) {
  const item = sourceSkuItems(source).find(item => item.sku === shopSku);
  const price = item?.price ?? (source.variants === 1 ? { amount: source.price, currency: source.currency } : undefined);
  if (price && price.amount > 0 && price.currency.toUpperCase() === product.price_currency.toUpperCase()) {
    return { amount: price.amount, explanation: `Copied from ${source.storeName} · ${shopSku}.` };
  }
  if (product.retail_price > 0) return { amount: product.retail_price,
    explanation: `Suggested Master base price (${product.price_currency}), not a currency conversion.${price ? ` Source price: ${price.amount} ${price.currency}.` : ' No source price available.'} Review or edit before confirming.` };
  return { amount: undefined, explanation: 'No compatible source or Master base price is available. Set a price or save progress for later.' };
}
