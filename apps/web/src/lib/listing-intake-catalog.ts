import { getCatalogImportItems, saveCatalogImportItems, type CatalogImportItem } from './catalog-import-store';
import { addProduct, commitListingReviewProducts, getProducts, type Product } from './product-store';

/** The entire review (reads, validation and writes) must use the same catalog. */
export interface ListingIntakeCatalog {
  preview?: boolean;
  products: () => Product[];
  listings: () => CatalogImportItem[];
  saveListings: (items: CatalogImportItem[]) => void;
  commit: (products: Product[], created?: Product) => void;
  add: (product: Product) => void;
}

export const savedListingCatalog: ListingIntakeCatalog = {
  products: () => getProducts(),
  listings: () => getCatalogImportItems({ requireConfirmation: true }),
  saveListings: items => saveCatalogImportItems(items),
  commit: (products, created) => commitListingReviewProducts(products, created),
  add: product => { addProduct(product, { requirePersistence: true }); },
};

/** Session-only first-use demo. Never reset saved Masters or import decisions. */
export function createEmptyListingCatalog(sources: CatalogImportItem[]): ListingIntakeCatalog {
  let products: Product[] = [];
  let listings = structuredClone(sources).map(item => ({ ...item, suggestedProductId: undefined,
    resolvedProductId: undefined, confirmed: false, existingLinkReview: undefined,
    status: 'unmatched' as const, resolution: 'later' as const, confidence: 0 } as CatalogImportItem));
  return {
    preview: true,
    products: () => structuredClone(products),
    listings: () => structuredClone(listings),
    saveListings: items => { listings = structuredClone(items); },
    commit: (updates, created) => { products = [...(created ? [structuredClone(created)] : []), ...products.map(product => structuredClone(updates.find(update => update.id === product.id) ?? product))]; },
    add: product => { products = [...products, structuredClone(product)]; },
  };
}
