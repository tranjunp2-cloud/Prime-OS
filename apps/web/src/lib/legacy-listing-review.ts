import type { CatalogImportItem } from './catalog-import-store';
import type { VariantMappings } from './listing-master-completion';
import { commitListingReviewProducts, getProducts, type ChannelListing, type Product } from './product-store';
import { getCatalogImportItems } from './catalog-import-store';
import { listingImportSource, resolveListingShopData, snapshotShopListing } from './listing-shop-data';
import type { ListingIntakeCatalog } from './listing-intake-catalog';

export function legacyMappingIssues(product: Pick<Product, 'import_result' | 'import_issues'>) {
  if (product.import_result !== 'needs_review') return [];
  const issues = product.import_issues ?? [];
  return issues.length ? issues.filter(issue => /identity|mapping|\bpack\b|variant.*(?:conflict|review|mismatch)|same product|brand.*(?:differ|mismatch)/i.test(issue)) : ['Confirm existing listing identities'];
}

/** Commit only after the caller validates the seller's complete, fresh review snapshots. */
export function commitExistingListingReviews(items: CatalogImportItem[], destination: Product, created: boolean, mappings?: VariantMappings, progress?: Record<string, ChannelListing['review_pending']>, catalog?: ListingIntakeCatalog, listingDrafts?: Record<string, import('./product-store').ListingDraftValues>) {
  const products = catalog?.products() ?? getProducts();
  const changes = new Map<string, Product>();
  const editable = (product: Product) => {
    if (!changes.has(product.id)) changes.set(product.id, structuredClone(product));
    return changes.get(product.id)!;
  };
  const target = editable(destination);
  for (const item of items) {
    const review = item.existingLinkReview;
    const original = products.find(product => product.id === review?.productId);
    if (!review || !original || original.status === 'archived') throw new Error('Restore the current Master before changing its links.');
    const source = editable(original);
    const matches = source.channels.filter(link => legacyReviewKey(link) === review.key);
    if (matches.length !== 1) throw new Error('This listing identity is missing or duplicated. Check its shop and listing ID before moving it.');
    const link = matches[0];
    if (!link.external_id) throw new Error('This listing has no external ID. Verify its shop identity before continuing.');
    const imported = listingImportSource(source, link, catalog?.listings() ?? getCatalogImportItems({ requireConfirmation: true }));
    if (!link.shop_snapshot && imported) link.shop_snapshot = snapshotShopListing(imported);
    link.review_pending = progress?.[item.id];
    const patch = listingDrafts?.[item.id];
    if (patch) link.local_draft = { values: { ...link.local_draft?.values, ...patch,
      shipping: { ...link.local_draft?.values.shipping, ...patch.shipping }, channel_settings: { ...link.local_draft?.values.channel_settings, ...patch.channel_settings } }, updated_at: new Date().toISOString() };
    if (link.review_pending?.sku_mapping_pending && link.master_data_sync?.enabled) {
      const fields = link.master_data_sync.fields.filter(field => field !== 'price' && field !== 'inventory');
      link.master_data_sync = { ...link.master_data_sync, fields, enabled: fields.length > 0, updated_at: new Date().toISOString() };
    }
    if (source.id === target.id) {
      if (!progress) link.identity_review_signature = legacyIssueSignature(destination);
      if (!progress && mappings?.[item.id]) link.variant_mappings = mappings[item.id];
      continue;
    }
    if (target.channels.some(other => other.channel === link.channel && other.external_id === link.external_id
      && (!other.store_name || !link.store_name || other.store_name === link.store_name))) {
      throw new Error('This Master already contains the listing. Choose another Master or keep its current link.');
    }
    const overrideKey = link.channel === 'website' ? 'webstore' : link.channel;
    const override = source.channel_overrides?.[overrideKey];
    // Legacy overrides are channel-scoped. Never silently overwrite another shop's settings.
    if (override && (source.channels.filter(other => other.channel === link.channel).length !== 1
      || target.channels.some(other => other.channel === link.channel) || target.channel_overrides?.[overrideKey])) {
      throw new Error('These channel settings belong to multiple listings. Review one shop-specific mapping before moving this link.');
    }
    source.channels = source.channels.filter(other => other !== link);
    target.channels.push({ ...link, identity_review_signature: legacyIssueSignature(destination), variant_mappings: progress ? undefined : mappings?.[item.id], master_data_sync: { enabled: false, fields: [], updated_at: new Date().toISOString() } });
    if (override) {
      target.channel_overrides = { ...target.channel_overrides, [overrideKey]: override };
      if (source.channel_overrides) delete source.channel_overrides[overrideKey];
    }
    const provenance = (source.import_sources ?? []).filter(record => record.channel === link.channel && (!link.store_name || record.store === link.store_name));
    target.import_sources = [...(target.import_sources ?? []), ...provenance.filter(record => !(target.import_sources ?? []).some(other => JSON.stringify(other) === JSON.stringify(record)))];
    // Retain history on the source whenever another listing could use it.
    if (!source.channels.some(other => other.channel === link.channel)) source.import_sources = source.import_sources?.filter(record => record.channel !== link.channel);
  }
  for (const product of changes.values()) {
    if (legacyMappingIssues(product).length && !unresolvedLegacyLinks(product).length) {
      const mapping = legacyMappingIssues(product);
      product.import_issues = (product.import_issues ?? []).filter(issue => !mapping.includes(issue));
      product.import_result = product.import_issues.length ? 'incomplete' : undefined;
    }
    product.listing_review_migrated = true;
    product.record_version = (product.record_version ?? 1) + 1;
  }
  // Existing lifecycle states are unchanged. New destinations arrive already validated and Active.
  if (created) changes.delete(target.id);
  if (catalog) catalog.commit([...changes.values()], created ? target : undefined);
  else commitListingReviewProducts([...changes.values()], created ? target : undefined);
}
export const legacyReviewKey = (listing: ChannelListing) => JSON.stringify([listing.channel, listing.store_name || '', listing.external_id || '']);
export const legacyIssueSignature = (product: Product) => JSON.stringify(legacyMappingIssues(product));
export function unresolvedLegacyLinks(product: Product) {
  const issues = legacyMappingIssues(product);
  return product.channels.filter(link => link.review_pending || (issues.length && link.identity_review_signature !== JSON.stringify(issues)));
}

/** Read-only projection: all persisted relationships, inventory and shop state stay untouched. */
export function legacyListingReviews(products: Product[], imports: CatalogImportItem[]): CatalogImportItem[] {
  return products.flatMap(product => unresolvedLegacyLinks(product).map(link => {
    const sameChannel = product.channels.filter(item => item.channel === link.channel);
    const override = sameChannel.length === 1 ? product.channel_overrides?.[link.channel === 'website' ? 'webstore' : link.channel] : undefined;
    const importSources = (product.import_sources ?? []).filter(source => source.channel === link.channel && (!link.store_name || source.store === link.store_name));
    const provenance = importSources.length === 1 ? importSources[0] : undefined;
    const candidates = imports.filter(item => item.channel === link.channel && item.listingId === link.external_id && (!link.store_name || item.storeName === link.store_name));
    const source = candidates.length === 1 ? candidates[0] : undefined;
    const shopData = resolveListingShopData(product, link, imports);
    const key = legacyReviewKey(link);
    return {
      ...source,
      id: `existing-link:${product.id}:${key}`, channel: link.channel,
      listingId: link.external_id || '', storeName: link.store_name || provenance?.store || source?.storeName || 'Shop not recorded',
      title: shopData.title || `Listing ${link.external_id || '(ID not recorded)'}`,
      channelSku: shopData.sku || '',
      image: shopData.images?.[0] || '', images: shopData.images, description: shopData.description,
      variants: shopData.variantCount ?? source?.variants ?? 0,
      variantItems: shopData.variants ?? source?.variantItems,
      mappingFields: source?.mappingFields ?? link.shop_snapshot?.mapping_fields,
      requirements: shopData.requirements,
      shipping: source?.shipping ?? link.shop_snapshot?.shipping,
      modelNumber: source?.modelNumber ?? link.shop_snapshot?.identifiers?.model,
      mpn: source?.mpn ?? link.shop_snapshot?.identifiers?.mpn,
      gtin: source?.gtin ?? link.shop_snapshot?.identifiers?.gtin,
      channelStock: shopData.stock ?? NaN,
      channelCategory: source?.channelCategory || override?.category || '',
      price: shopData.price?.amount ?? NaN,
      currency: shopData.price?.currency || '',
      brand: shopData.brand || '',
      retrievedAt: shopData.retrievedAt,
      listingUrl: source?.listingUrl || link.listing_url || undefined,
      status: 'conflict' as const, confidence: 0, suggestedProductId: product.id,
      resolution: 'later' as const, confirmed: false, resolvedProductId: undefined,
      existingLinkReview: { productId: product.id, key, issues: link.review_pending?.issues ?? legacyMappingIssues(product), signature: JSON.stringify({ product, source }) },
    };
  }));
}
