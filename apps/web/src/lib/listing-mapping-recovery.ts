import type { CatalogImportItem } from './catalog-import-store';
import type { Product } from './product-store';
import { variantMappingError, type VariantMappings } from './listing-master-completion';
import { sourceSkuDataError, sourceSkuItems } from './listing-sku-mapping';

type MappingRecovery = {
  title: string;
  detail: string;
  action: 'structure' | 'reload' | 'setup' | 'matches';
  actionLabel: string;
};

/** Explain the existing confirmation guard without imposing rules on deferred links. */
export function listingMappingRecovery(source: CatalogImportItem, master: Product, mappings: VariantMappings, verifiedSingles: string[] = []): MappingRecovery | null {
  if (source.variants === 0 && !verifiedSingles.includes(source.id)) return {
    title: 'Check the listing’s SKU structure',
    detail: 'The imported data does not say whether this listing is a single product or has variants. Verify its structure before confirming the mapping.',
    action: 'structure', actionLabel: 'Check source structure',
  };
  if (!variantMappingError([source], master, mappings, verifiedSingles)) return null;
  const sourceError = sourceSkuDataError(source);
  if (sourceError) return {
    title: sourceError.includes('duplicate') ? 'Listing SKU codes are duplicated' : 'Listing SKU data is incomplete',
    detail: sourceError.includes('duplicate')
      ? 'The imported listing has duplicate SKU codes. Refresh the source data before matching individual SKUs.'
      : `${sourceSkuItems(source).length} of ${source.variants || 'unknown'} source SKUs loaded. Reload the listing data; if it is still incomplete, sync the listing from its channel first.`,
    action: 'reload', actionLabel: 'Reload listing data',
  };
  if (!master.has_variants && master.product_type !== 'variant') return {
    title: 'This listing needs variant SKUs',
    detail: `This listing has ${source.variants} SKUs; the Master is a single product. If they are the same product, review the proposed variants. Existing stock will not be split or copied.`,
    action: 'setup', actionLabel: 'Set up SKUs',
  };
  const available = master.skus.filter(sku => sku.status === 'active' && sku.sku_code.trim());
  if (available.length < sourceSkuItems(source).length) return {
    title: available.length ? 'The Master needs more available SKUs' : 'No available Master SKUs',
    detail: `${sourceSkuItems(source).length} source SKUs need matching; the Master has ${available.length} available. Review or add the missing variants without combining different source SKUs into one.`,
    action: 'setup', actionLabel: 'Review Master SKUs',
  };
  const selected = (mappings[source.id] ?? []).map(row => row.master_sku_id).filter(Boolean);
  const duplicate = new Set(selected).size !== selected.length;
  return {
    title: duplicate ? 'A Master SKU is selected more than once' : 'Choose a match for every source SKU',
    detail: duplicate
      ? 'Different SKUs within this listing need distinct Master SKU matches. Review the selected pairs before confirming.'
      : 'Some source SKUs have no valid Master match. Review the suggested pairs or choose the correct Master SKU.',
    action: 'matches', actionLabel: 'Review SKU matches',
  };
}
