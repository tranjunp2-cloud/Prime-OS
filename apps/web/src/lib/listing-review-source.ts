import type { CatalogImportItem } from './catalog-import-store';
import { sourceSkuDataError } from './listing-sku-mapping';

/** Queue summaries can omit child records. Read the imported source, never the destination Master. */
export function hydrateReviewSkuSources(sources: CatalogImportItem[], imported: CatalogImportItem[]): CatalogImportItem[] {
  return sources.map(source => {
    if (source.variantItems !== undefined) return structuredClone(source);
    const latest = imported.find(item => item.id === source.id && item.listingId === source.listingId
      && item.channel === source.channel && item.storeName === source.storeName
      && item.channelSku === source.channelSku && item.variants === source.variants
      && !item.confirmed && item.resolution !== 'ignore');
    return structuredClone(latest?.variantItems && !sourceSkuDataError(latest)
      ? { ...source, variantItems: latest.variantItems } : source);
  });
}
