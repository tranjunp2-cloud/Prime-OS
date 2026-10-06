import { getCatalogImportItems, saveCatalogImportItems, type CatalogImportItem } from './catalog-import-store';
import { addProduct, commitListingReviewProducts, getProducts, type Product, type ProductType } from './product-store';
import { commitExistingListingReviews, legacyIssueSignature, legacyListingReviews, legacyMappingIssues } from './legacy-listing-review';
import { listingMatchEvidence } from './listing-match-evidence';
import { suggestMasterSku } from './product-onboarding';
import { getProductCatalogSettings } from './product-catalog-settings-store';
import { snapshotShopListing } from './listing-shop-data';

import { applyMasterCompletion, assertMasterComplete, newListingMasterPreview, variantMappingError, type MasterCompletion, type VariantMappings } from './listing-master-completion';

export type ListingSourceReview = { itemId: string; signature: string };
export type CreateListingMasterInput = {
  name: string;
  sku: string;
  sourceId: string;
  productType?: ProductType;
  categoryId?: string;
  brandId?: string;
  copySourcePrice?: boolean;
  reviewedSources?: ListingSourceReview[];
  verifiedSourceStructure?: boolean;
  completion?: Partial<MasterCompletion>;
  variantMappings?: VariantMappings;
};

export function snapshotListingSource(item: CatalogImportItem): ListingSourceReview {
  return { itemId: item.id, signature: JSON.stringify(item) };
}

/** Suggest only one unambiguous active catalog brand, never create one implicitly. */
export function suggestedListingBrandId(item: CatalogImportItem) {
  const name = item.brand?.trim().toLocaleLowerCase();
  if (!name) return '';
  const matches = getProductCatalogSettings().brands.filter(brand => brand.status === 'Active'
    && [brand.name, brand.code, ...brand.aliases].some(value => value.trim().toLocaleLowerCase() === name));
  return matches.length === 1 ? matches[0].id : '';
}

export function canCopyListingPrice(item: CatalogImportItem) {
  return Number.isFinite(item.price) && item.price >= 0 && /^[A-Z]{3}$/.test(item.currency?.trim().toUpperCase());
}

export function listingOwner(item: CatalogImportItem, products = getProducts()) {
  return products.find(product => product.channels.some(listing => listing.channel === item.channel
    && listing.external_id === item.listingId && (!listing.store_name || listing.store_name === item.storeName)));
}
export function pendingShopListings(products = getProducts()) {
  return getCatalogImportItems({ requireConfirmation: true }).filter(item => item.resolution !== 'ignore'
    && item.status !== 'ignored' && !item.confirmed && !listingOwner(item, products));
}
export function pendingListingReviews(products = getProducts()) {
  return [...legacyListingReviews(products, getCatalogImportItems({ requireConfirmation: true })), ...pendingShopListings(products)];
}

const normalizedIdentity = (value: string | undefined) => value?.trim().toUpperCase() || '';

export function getListingSuggestion(item: CatalogImportItem, products = getProducts()) {
  const product = products.find(product => product.id === item.suggestedProductId && product.status !== 'archived');
  const suggested = Boolean(product && (item.status === 'matched' || item.status === 'suggested'));
  const identityConflict = product && listingMatchEvidence(item, product).find(row => !['sku', 'brand', 'structure'].includes(row.key) && row.state === 'different');
  let reason = '';
  if (item.existingLinkReview) reason = 'Existing link · verify identity and pack';
  else if (item.status === 'conflict') reason = 'Check product identity and pack size';
  else if (!product) reason = 'Choose a Master or create a new one';
  else if (!suggested) reason = 'Check this suggestion individually';
  else if (item.variants !== 1 || product.has_variants || product.product_type === 'variant' || product.skus.length > 1) reason = 'Variant-SKU matching required';
  else if (!normalizedIdentity(item.brand) || !normalizedIdentity(product.brand)) reason = 'Check the missing brand';
  else if (normalizedIdentity(item.brand) !== normalizedIdentity(product.brand)) reason = 'Brand differs — review individually';
  else if (!normalizedIdentity(item.channelSku) || normalizedIdentity(item.channelSku) !== normalizedIdentity(product.sku_code)) reason = 'SKU differs — review individually';
  else if (identityConflict) reason = `${identityConflict.label} differs — review individually`;
  else if (!Number.isFinite(item.confidence) || item.confidence < 95) reason = 'Check this suggestion individually';
  return { product, suggested, eligible: suggested && !reason, reason };
}

export type ListingMatchReview = { itemId: string; productId: string; signature: string };

/** Snapshot exactly what the seller will review; never silently retarget an open confirmation. */
export function snapshotListingMatch(item: CatalogImportItem, product: Product): ListingMatchReview {
  return { itemId: item.id, productId: product.id, signature: JSON.stringify({ item, master: product }) };
}

/** Confirm relationships atomically, without editing or activating existing Masters. */
export function confirmSuggestedListingLinks(reviewed: ListingMatchReview[]) {
  const items = getCatalogImportItems({ requireConfirmation: true });
  const products = getProducts();
  if (!reviewed.length || new Set(reviewed.map(pair => pair.itemId)).size !== reviewed.length) throw new Error('Select distinct listing pairs to review.');
  const pairs = reviewed.map(pair => {
    const item = items.find(item => item.id === pair.itemId);
    if (!item || item.confirmed || item.status === 'ignored' || item.resolution === 'ignore' || listingOwner(item, products)) throw new Error('A selected listing changed or is already linked. Return to review and select the remaining listings.');
    const suggestion = getListingSuggestion(item, products);
    if (!suggestion.eligible || !suggestion.product || suggestion.product.id !== pair.productId || snapshotListingMatch(item, suggestion.product).signature !== pair.signature) {
      throw new Error('A suggested pair changed or needs an individual check. Return to review before confirming.');
    }
    return { item, product: suggestion.product };
  });
  const identities = pairs.map(({ item }) => JSON.stringify([item.channel, item.storeName, item.listingId]));
  if (new Set(identities).size !== identities.length) throw new Error('The selection contains the same shop listing more than once.');
  const changes = new Map<string, Product>();
  pairs.forEach(({ item, product }) => {
    const next = changes.get(product.id) ?? { ...product, listing_review_migrated: true, channels: [...product.channels], import_sources: [...(product.import_sources ?? [])], record_version: (product.record_version ?? 1) + 1 };
    next.channels.push({ channel: item.channel, external_id: item.listingId, store_name: item.storeName, shop_sku: item.channelSku, reported_stock: item.channelStock, shop_snapshot: snapshotShopListing(item), status: 'draft', publication_unconfirmed: true, listing_url: item.listingUrl || null, last_synced_at: null, identity_review_signature: legacyIssueSignature(product) });
    next.import_sources!.push({ channel: item.channel, store: item.storeName, listing_id: item.listingId, shop_sku: item.channelSku, brand: item.brand || '', price: item.price, currency: item.currency });
    changes.set(product.id, next);
  });
  commitListingReviewProducts([...changes.values()]);
  let reviewSaved = true;
  const destinations = new Map(reviewed.map(pair => [pair.itemId, pair.productId]));
  try { saveCatalogImportItems(items.map(item => destinations.has(item.id) ? { ...item, resolution: 'link', resolvedProductId: destinations.get(item.id), confirmed: true } : item)); }
  catch { reviewSaved = false; }
  return { linkedCount: pairs.length, masterCount: changes.size, productIds: [...changes.keys()], reviewSaved };
}

/** One explicit local decision. No outbound channel calls or inventory writes. */
export function confirmListingIntake(ids: string[], target: { productId: string; reviewed?: ListingMatchReview[]; verifiedSingleListingIds?: string[]; variantMappings?: VariantMappings } | CreateListingMasterInput) {
  const items = getCatalogImportItems({ requireConfirmation: true });
  const products = getProducts();
  const selected = [...items, ...legacyListingReviews(products, items)].filter(item => ids.includes(item.id));
  if (!selected.length || selected.length !== new Set(ids).size) throw new Error('The selection changed. Reload the listings and try again.');
  if (selected.some(item => item.resolution === 'ignore' || item.status === 'ignored')) throw new Error('A selected listing has been excluded. Refresh the list before continuing.');
  const identities = selected.map(item => `${item.channel}:${item.storeName}:${item.listingId}`);
  if (new Set(identities).size !== identities.length) throw new Error('The selection contains the same shop listing more than once. Review it before continuing.');
  if (selected.some(item => !item.existingLinkReview && (item.confirmed || listingOwner(item)))) throw new Error('A selected listing is already linked. Refresh the list before continuing.');
  const existingLinkReview = selected.some(item => item.existingLinkReview);
  if (existingLinkReview && selected.some(item => !item.existingLinkReview)) throw new Error('Review existing links separately from new listings.');
  if (existingLinkReview && (('productId' in target && !target.reviewed) || (!('productId' in target) && !target.reviewedSources))) throw new Error('Review the current listing details before confirming.');
  let product: Product;
  if ('productId' in target) {
    const existing = products.find(item => item.id === target.productId);
    if (!existing || existing.status === 'archived') throw new Error('Choose an available Product Master. Archived products must be restored first.');
    if (target.reviewed && (target.reviewed.length !== selected.length || new Set(target.reviewed.map(pair => pair.itemId)).size !== selected.length || selected.some(item => {
      const pair = target.reviewed!.find(pair => pair.itemId === item.id && pair.productId === existing.id);
      return !pair || pair.signature !== snapshotListingMatch(item, existing).signature;
    }))) throw new Error('Product or listing details changed during review. Return to listings and review the latest data before confirming.');
    product = existing;
  } else {
    const source = selected.find(item => item.id === target.sourceId);
    if (!source) throw new Error('Choose a source listing.');
    if (target.reviewedSources && (target.reviewedSources.length !== selected.length
      || new Set(target.reviewedSources.map(item => item.itemId)).size !== selected.length
      || selected.some(item => target.reviewedSources!.find(review => review.itemId === item.id)?.signature !== snapshotListingSource(item).signature))) {
      throw new Error('Source listing data changed during review. Return to listings and review the latest data before creating a Master.');
    }
    const sku = target.sku.trim().toUpperCase();
    if (target.name.trim().length < 3 || !sku) throw new Error('Enter a product name and Master SKU.');
    if (products.some(item => item.sku_code.toUpperCase() === sku || item.skus.some(variant => variant.sku_code.toUpperCase() === sku))) throw new Error('This SKU already exists. Choose the existing Master or use another SKU.');
    const productType = target.productType ?? (source.variants > 1 ? 'variant' : 'single');
    if (selected.some(item => item.variants === 0) && !target.verifiedSourceStructure) throw new Error('Verify the source product structure before creating a Master.');
    if (productType !== 'single' && productType !== 'variant') throw new Error('Choose Single product or With variants.');
    if (source.variants > 1 && productType === 'single') throw new Error('This listing has multiple SKUs. Keep With variants and prepare its SKU details in the Master.');
    if (selected.length > 1 && (productType === 'variant' || selected.some(item => item.variants > 1))) throw new Error('Import variant listings separately first. Their individual SKU details must be checked before grouping.');
    const settings = getProductCatalogSettings();
    const category = settings.categories.find(item => item.id === target.categoryId && item.status === 'Active');
    if (target.categoryId && !category) throw new Error('This category is no longer available. Choose another category or clear it.');
    const brandId = target.brandId ?? suggestedListingBrandId(source);
    const brand = settings.brands.find(item => item.id === brandId && item.status === 'Active');
    if (brandId && !brand) throw new Error('This brand is no longer available. Choose another brand or assign it later.');
    if (target.copySourcePrice && !canCopyListingPrice(source)) throw new Error('This listing has no valid price and currency. Leave base price unset and complete it in the Master.');
    const now = new Date().toISOString();
    product = { ...newListingMasterPreview(source, { ...target, brandId }), id: `prod_intake_${crypto.randomUUID()}`, created_at: now, updated_at: now };
  }
  if (!('productId' in target)) {
    product = applyMasterCompletion(product, selected, target.completion);
    assertMasterComplete(product, selected);
    activateCompletedMaster(product);
  }
  const mappingError = variantMappingError(selected, product, target.variantMappings, 'productId' in target ? target.verifiedSingleListingIds : target.verifiedSourceStructure ? selected.map(item => item.id) : []);
  if (mappingError) throw new Error(mappingError);
  if (existingLinkReview) {
    commitExistingListingReviews(selected, product, !('productId' in target), target.variantMappings);
    return { productId: product.id, reviewSaved: true };
  }
  const result: Product = {
    ...product,
    listing_review_migrated: true,
    record_version: 'productId' in target ? (product.record_version ?? 1) + 1 : 1,
    channels: [...product.channels, ...selected.map(item => ({ channel: item.channel, external_id: item.listingId,
      store_name: item.storeName, shop_sku: item.channelSku, reported_stock: item.channelStock, shop_snapshot: snapshotShopListing(item),
      status: 'draft' as const, publication_unconfirmed: true, listing_url: item.listingUrl || null, last_synced_at: null, identity_review_signature: legacyIssueSignature(product), variant_mappings: target.variantMappings?.[item.id] }))],
    import_sources: [...(product.import_sources ?? []), ...selected.map(item => ({ channel: item.channel, store: item.storeName, listing_id: item.listingId, shop_sku: item.channelSku, brand: item.brand || '', price: item.price, currency: item.currency }))],
  };
  if ('productId' in target) commitListingReviewProducts([result]);
  else addProduct(result, { requirePersistence: true });
  // The persisted Master relationship is authoritative. If the secondary review
  // receipt cannot be saved, ownership still prevents linking the listing twice.
  let reviewSaved = true;
  try {
    saveCatalogImportItems(items.map(item => ids.includes(item.id) ? { ...item, resolution: 'link', resolvedProductId: product.id, confirmed: true } : item));
  } catch { reviewSaved = false; }
  return { productId: product.id, reviewSaved };
}

function activateCompletedMaster(product: Product) {
  product.status = 'published';
  product.import_activation_paused = false;
  product.listing_review_migrated = true;
  const mappingIssues = legacyMappingIssues(product);
  product.import_issues = product.import_issues?.filter(issue => mappingIssues.includes(issue) || !/image|description|category|price|weight|dimension|required attribute/i.test(issue));
  if (!product.import_issues?.length && product.import_result === 'incomplete') product.import_result = undefined;
}

export function intakeSku() {
  return suggestMasterSku(getProducts().flatMap(product => [product.sku_code, ...product.skus.map(sku => sku.sku_code)]));
}
