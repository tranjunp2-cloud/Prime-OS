import { getCatalogImportItems } from './catalog-import-store';
import { listingMasterSync, listingSyncIdentity, masterSyncPlan, masterSyncSnapshot, masterSyncSourceChanges, MASTER_SYNC_FIELDS, MASTER_SYNC_GROUPS, syncListingOverride, syncsField, type MasterSyncField, type MasterSyncPreference } from './listing-master-sync';
import { listingImportSource, recordedListingPrice, resolveListingShopData, type ListingShopData } from './listing-shop-data';
import { getProductById, updateProductLinksAtomically, type ChannelListing, type ListingDraftValues, type Product } from './product-store';

export const LISTING_DRAFT_FIELDS: Record<keyof ListingDraftValues, { label: string; group?: MasterSyncField }> = {
  title: { label: 'Listing title', group: 'content' }, description: { label: 'Description', group: 'content' },
  brand: { label: 'Brand', group: 'content' }, category: { label: 'Shop category' },
  images: { label: 'Images', group: 'media' }, price: { label: 'Listing price', group: 'price' },
  stock: { label: 'Shop stock', group: 'inventory' }, shipping: { label: 'Shipping & compliance', group: 'shipping' },
  channel_settings: { label: 'Channel details' },
};

export const LISTING_CHANNEL_FIELDS = {
  condition: 'Condition', search_terms: 'Search terms', bullet_points: 'Bullet points', preorder_days: 'Pre-order days', warranty: 'Warranty',
  certification: 'Certification', video_url: 'Video URL', web_slug: 'Storefront URL', pos_barcode: 'POS barcode', visibility: 'Sales visibility',
  tax_code: 'Tax code', attribute_material: 'Material', attribute_color: 'Color / pattern',
} as const;

/** Overlay local edits for editing only. Provider readouts and sync previews still use the snapshot. */
export function listingEditableValues(product: Product, listing: ChannelListing): ListingDraftValues {
  const items = getCatalogImportItems({ requireConfirmation: true });
  const data = resolveListingShopData(product, listing, items);
  const override = syncListingOverride(product, listing);
  const pendingPrice = override?.pricing_source === 'manual' && override.manual_price?.trim() ? recordedListingPrice(Number(override.manual_price), override.channel_currency) : undefined;
  const savedStock = override?.stock_quantity?.trim() ? Number(override.stock_quantity) : undefined;
  const base: ListingDraftValues = {
    title: data.title, description: data.description, brand: data.brand,
    category: data.category,
    images: data.images, price: pendingPrice ?? (data.price ? { amount: data.price.amount, currency: data.price.currency } : undefined),
    stock: data.stock ?? (Number.isSafeInteger(savedStock) && savedStock! >= 0 ? savedStock : undefined),
    shipping: data.shipping ?? (override?.compliance_notes ? { notes: override.compliance_notes } : undefined),
    channel_settings: { ...Object.fromEntries(Object.keys(LISTING_CHANNEL_FIELDS).flatMap(key => {
      const value = override?.[key as keyof typeof LISTING_CHANNEL_FIELDS];
      return value !== undefined ? [[key, value]] : [];
    })), ...data.channelSettings },
  };
  return mergeListingValues(base, listing.local_draft?.values);
}

/** Nested groups are sparse patches, too: editing one field must not erase its siblings. */
export function mergeListingValues(base: ListingDraftValues, patch?: ListingDraftValues): ListingDraftValues {
  return { ...base, ...patch,
    ...(patch?.shipping ? { shipping: { ...base.shipping, ...patch.shipping } } : {}),
    ...(patch?.channel_settings ? { channel_settings: { ...base.channel_settings, ...patch.channel_settings } } : {}),
  };
}

/** Freeze the displayed group when opting out, including unchanged values inherited for preview. */
export function listingIndependentPatch(values: ListingDraftValues, patch: ListingDraftValues, groups: readonly MasterSyncField[]): ListingDraftValues {
  const frozen = Object.fromEntries(Object.entries(values).filter(([field, value]) => value !== undefined
    && groups.includes(LISTING_DRAFT_FIELDS[field as keyof ListingDraftValues]?.group as MasterSyncField))) as ListingDraftValues;
  return mergeListingValues(frozen, patch);
}

export function listingStockManagedByAmazon(product: Product, listing: ChannelListing) {
  return listing.channel === 'amazon' && (syncListingOverride(product, listing)?.fulfillment?.toUpperCase() === 'FBA'
    || listing.master_data_sync?.inventory?.fulfillment === 'FBA');
}

/** Table preview is explicitly labelled Local draft, never presented as fresh shop data. */
export function listingDraftTableData(listing: ChannelListing, data: ListingShopData): ListingShopData {
  const values = listing.local_draft?.values;
  return { ...data, ...(values?.price ? { price: { ...values.price, origin: 'saved' as const } } : {}),
    ...(values?.stock !== undefined ? { stock: values.stock } : {}) };
}

export function listingEditSnapshot(product: Product, listing: ChannelListing) {
  return JSON.stringify([listing, listingEditableValues(product, listing), syncListingOverride(product, listing)]);
}

export function listingHasMultipleSkus(product: Product, listing: ChannelListing) {
  const source = listingImportSource(product, listing, getCatalogImportItems({ requireConfirmation: true }));
  return (source?.variants ?? 0) > 1 || (listing.shop_snapshot?.variant_count ?? 0) > 1
    || (listing.shop_snapshot?.variant_items?.length ?? 0) > 1 || (listing.variant_mappings?.length ?? 0) > 1;
}

export function listingDraftErrors(product: Product, listing: ChannelListing, patch: ListingDraftValues, independentGroups: readonly MasterSyncField[] = []) {
  const errors: Partial<Record<keyof ListingDraftValues, string>> = {};
  const preference = listingMasterSync(listing, syncListingOverride(product, listing));
  for (const field of Object.keys(patch) as Array<keyof ListingDraftValues>) {
    const group = LISTING_DRAFT_FIELDS[field]?.group;
    if (group && syncsField(preference, group) && !independentGroups.includes(group)) errors[field] = `Turn off ${MASTER_SYNC_FIELDS[group]} sync before editing this group independently.`;
  }
  if (patch.title !== undefined && !patch.title.trim()) errors.title = 'Enter a listing title.';
  if (patch.price) {
    if (!Number.isFinite(patch.price.amount) || patch.price.amount < 0) errors.price = 'Enter a price of zero or more.';
    if (!/^[A-Z]{3}$/.test(patch.price.currency)) errors.price = 'Enter a three-letter currency code.';
    const currency = resolveListingShopData(product, listing, getCatalogImportItems({ requireConfirmation: true })).price?.currency;
    if (currency && patch.price.currency !== currency) errors.price = `Keep this listing’s currency (${currency}).`;
  }
  if (patch.stock !== undefined && (!Number.isSafeInteger(patch.stock) || patch.stock < 0)) errors.stock = 'Enter a whole number of zero or more.';
  if (listingHasMultipleSkus(product, listing)) {
    if (patch.price) errors.price = 'This listing has multiple SKUs. Update prices per SKU in the shop; an aggregate price cannot replace them.';
    if (patch.stock !== undefined) errors.stock = 'This listing has multiple SKUs. Update stock per SKU in the shop; an aggregate quantity cannot replace them.';
  }
  if (patch.stock !== undefined && listingStockManagedByAmazon(product, listing)) errors.stock = 'Amazon manages FBA stock. It cannot be edited here.';
  if (patch.images && (!patch.images.length || patch.images.some(url => !/^(https?:\/\/|\/(?!\/)|data:image\/(png|jpeg|webp|gif);base64,)/i.test(url)))) errors.images = 'Keep at least one image. Use an uploaded image or an http(s) image URL.';
  if (patch.shipping && ['length', 'width', 'height', 'weight'].some(key => {
    const value = patch.shipping?.[key as 'length'];
    return value !== undefined && (!Number.isFinite(value) || value <= 0);
  })) errors.shipping = 'Package dimensions and weight must be greater than zero.';
  if (patch.channel_settings) {
    if (Object.entries(patch.channel_settings).some(([key, value]) => !Object.prototype.hasOwnProperty.call(LISTING_CHANNEL_FIELDS, key) || typeof value !== 'string')) errors.channel_settings = 'Only supported channel details can be edited.';
    const days = patch.channel_settings.preorder_days;
    if (days?.trim() && (!Number.isSafeInteger(Number(days)) || Number(days) < 0)) errors.channel_settings = 'Pre-order days must be a whole number of zero or more.';
    const video = patch.channel_settings.video_url;
    if (video?.trim() && !/^https?:\/\//i.test(video)) errors.channel_settings = 'Enter an http(s) video URL.';
  }
  return errors;
}

export interface ListingSyncDraft {
  preference: MasterSyncPreference;
  masterSnapshot: string;
  reviewedPlan: string;
}

/** Commit edits and source choices together. Never write Master, siblings, or provider receipts. */
export function saveListingLocalDraft(productId: string, target: ChannelListing, patch: ListingDraftValues, expectedSnapshot: string, syncChange: readonly MasterSyncField[] | ListingSyncDraft = []) {
  const product = getProductById(productId);
  if (!product || product.status === 'archived') throw new Error('This product is no longer editable. Close and reopen the listing.');
  const matches = product.channels.filter(listing => listingSyncIdentity(listing) === listingSyncIdentity(target));
  if (matches.length !== 1 || listingEditSnapshot(product, matches[0]) !== expectedSnapshot) throw new Error('This listing or its sync settings changed. Close and reopen it to review the latest values.');
  if (Object.keys(patch).some(key => !Object.prototype.hasOwnProperty.call(LISTING_DRAFT_FIELDS, key))) throw new Error('Only listing fields can be edited here.');
  const listing = matches[0];
  const preference = listingMasterSync(listing, syncListingOverride(product, listing));
  const transaction = 'preference' in syncChange ? syncChange : undefined;
  const nextPreference = transaction?.preference;
  if (nextPreference && (new Set(nextPreference.fields).size !== nextPreference.fields.length || nextPreference.fields.some(field => !MASTER_SYNC_GROUPS.includes(field)) || nextPreference.enabled !== (nextPreference.fields.length > 0))) throw new Error('Choose a valid data source for each group.');
  const groups = transaction ? MASTER_SYNC_GROUPS.filter(group => syncsField(preference, group) && !syncsField(transaction.preference, group)) : [...new Set(syncChange as readonly MasterSyncField[])];
  if (groups.some(group => !Object.values(LISTING_DRAFT_FIELDS).some(field => field.group === group) || !syncsField(preference, group))) throw new Error('Sync settings changed. Reopen the listing before editing independently.');
  if (transaction) {
    const followingChanges = masterSyncSourceChanges(preference, nextPreference!).filter(group => syncsField(nextPreference!, group));
    if (followingChanges.length && masterSyncSnapshot(product) !== transaction.masterSnapshot) throw new Error('Master data changed. Reopen the listing and review the latest values.');
    const plan = masterSyncPlan(product, listing, nextPreference!);
    // Unrelated legacy setup must not prevent turning a group off.
    const syncError = plan.groups.find(group => followingChanges.includes(group.field) && group.error)?.error;
    if (syncError) throw new Error(syncError);
    if (plan.signature !== transaction.reviewedPlan) throw new Error('Sync values changed. Review the latest listing and Master values before saving.');
    if (Object.keys(patch).some(key => { const group = LISTING_DRAFT_FIELDS[key as keyof ListingDraftValues].group; return group && syncsField(nextPreference!, group); })) throw new Error('Following Master and editing the same group independently cannot be saved together.');
  }
  const current = listingEditableValues(product, listing);
  const changes = Object.fromEntries(Object.entries(patch).filter(([key, value]) => value !== undefined && JSON.stringify(value) !== JSON.stringify(current[key as keyof ListingDraftValues]))) as ListingDraftValues;
  const error = Object.values(listingDraftErrors(product, listing, changes, groups))[0];
  if (error) throw new Error(error);
  if (!Object.keys(changes).length && !groups.length && !transaction) return;
  const values = listingIndependentPatch(mergeListingValues(current, patch), changes, groups);
  const now = new Date().toISOString();
  const local_draft = Object.keys(values).length ? { values: mergeListingValues(listing.local_draft?.values ?? {}, values), updated_at: now } : listing.local_draft;
  const fields = preference.fields.filter(field => !groups.includes(field));
  const channels = product.channels.map(item => item === listing ? { ...item, ...(local_draft ? { local_draft } : {}),
    ...(transaction ? { master_data_sync: { ...transaction.preference, updated_at: now } } : groups.length ? { master_data_sync: { ...preference, enabled: fields.length > 0, fields, updated_at: now } } : {}),
  } : item);
  updateProductLinksAtomically([{ id: product.id, channels, import_sources: product.import_sources, record_version: (product.record_version ?? 1) + 1 }]);
}
