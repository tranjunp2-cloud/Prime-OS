import { getProductById, updateProductLinksAtomically, type ChannelListing, type ChannelOverride, type ListingDraftValues, type Product } from './product-store';
import { configuredListing } from './product-channel-listings';
import { getCatalogImportItems } from './catalog-import-store';
import { resolveListingShopData } from './listing-shop-data';
import { formatPrice, quoteListingPrice, readPricing } from './pricing-rules';
import { getWarehouses } from './warehouse-store';

export type MasterSyncPreference = Omit<NonNullable<ChannelListing['master_data_sync']>, 'updated_at'>;
export type MasterSyncField = MasterSyncPreference['fields'][number];
export const MASTER_SYNC_FIELDS: Record<MasterSyncField, string> = { content: 'Product content', media: 'Images', price: 'Selling price', inventory: 'Stock', shipping: 'Shipping & compliance' };
export const MASTER_SYNC_GROUPS = Object.keys(MASTER_SYNC_FIELDS) as MasterSyncField[];
export const MASTER_SYNC_VALUE_KEYS: Record<MasterSyncField, Array<keyof ListingDraftValues>> = { content: ['title', 'description', 'brand'], media: ['images'], price: ['price'], inventory: ['stock'], shipping: ['shipping'] };
const validField = (field: string): field is MasterSyncField => MASTER_SYNC_GROUPS.includes(field as MasterSyncField);
export const syncsField = (preference: MasterSyncPreference, field: MasterSyncField) => preference.enabled && preference.fields.includes(field);

export function masterSyncSourceChanges(previous: MasterSyncPreference, next: MasterSyncPreference): MasterSyncField[] {
  return MASTER_SYNC_GROUPS.filter(group => syncsField(previous, group) !== syncsField(next, group)
    || (syncsField(next, group) && (group === 'price' ? JSON.stringify(previous.pricing) !== JSON.stringify(next.pricing)
      : group === 'inventory' && JSON.stringify(previous.inventory) !== JSON.stringify(next.inventory))));
}

/** Never infer consent from Active, a timestamp, or default-filled editor forms. */
export function listingMasterSync(listing?: ChannelListing, savedOverride?: ChannelOverride): MasterSyncPreference {
  if (listing?.master_data_sync) {
    const { updated_at: _updatedAt, ...saved } = listing.master_data_sync;
    const fields = [...new Set((saved.fields ?? []).filter(validField))].filter(field => !listing.review_pending?.sku_mapping_pending || !['price', 'inventory'].includes(field));
    return { ...saved, enabled: saved.enabled && fields.length > 0, fields };
  }
  // Imported links do not inherit another listing's channel-level preferences.
  if (listing?.publication_unconfirmed) return { enabled: false, fields: [] };
  const fields: MasterSyncField[] = [];
  if (savedOverride?.enabled && savedOverride.listing_mode === 'master') fields.push('content');
  if (savedOverride?.enabled && savedOverride.media_scope === 'all') fields.push('media');
  return { enabled: fields.length > 0, fields };
}

export function listingSyncIdentity(listing: ChannelListing) {
  return JSON.stringify([listing.channel, listing.store_name ?? '', listing.external_id, listing.shop_sku ?? '']);
}

export function masterSyncValidation(product: Product, preference: MasterSyncPreference): string | undefined {
  if (!preference.enabled) return;
  if (!preference.fields.length) return 'Choose at least one data group to sync.';
  if (preference.fields.includes('content') && !product.name.trim()) return 'Add a product name to the Master before syncing product content.';
  if (preference.fields.includes('media') && !product.images.some(image => image.trim())) return 'Add at least one image to the Master before syncing images.';
}

/** Local preference only. Preserve Master lifecycle, shop data, and all sync timestamps. */
export function saveListingMasterSync(productId: string, target: ChannelListing, preference: MasterSyncPreference, expectedMasterData: string, reviewedPlan?: string) {
  const product = getProductById(productId);
  if (!product || product.status === 'archived') throw new Error('This Master is no longer editable. Refresh and try again.');
  const matches = product.channels.filter(listing => listingSyncIdentity(listing) === listingSyncIdentity(target));
  if (matches.length !== 1 || JSON.stringify(matches[0]) !== JSON.stringify(target)) throw new Error('This listing changed. Close this dialog and review its latest settings.');
  if (preference.enabled && masterSyncSnapshot(product) !== expectedMasterData) throw new Error('Master data changed while you were reviewing. Close this dialog and review the latest data.');
  const fields = [...new Set(preference.fields.filter(validField))];
  const error = masterSyncValidation(product, { ...preference, fields });
  if (error) throw new Error(error);
  const plan = masterSyncPlan(product, matches[0], { ...preference, fields });
  if (plan.error) throw new Error(plan.error);
  const hasIndependentValues = fields.some(field => MASTER_SYNC_VALUE_KEYS[field].some(key => matches[0].local_draft?.values[key] !== undefined));
  if (preference.enabled && (hasIndependentValues || reviewedPlan !== undefined || fields.some(field => ['price', 'inventory', 'shipping'].includes(field))) && plan.signature !== reviewedPlan) throw new Error('Review the latest listing and Master values before saving.');
  const channels = product.channels.map(listing => listing === matches[0] ? { ...listing, master_data_sync: { ...preference, fields, updated_at: new Date().toISOString() } } : listing);
  updateProductLinksAtomically([{ id: product.id, channels, import_sources: product.import_sources, record_version: (product.record_version ?? 1) + 1 }]);
}

export function masterSyncSnapshot(product: Product) {
  return JSON.stringify([product.name, product.description, product.brand, product.images, product.product_type, product.has_variants, product.retail_price, product.price_currency, product.inventory, product.skus, product.pkg_length, product.pkg_width, product.pkg_height, product.pkg_weight, product.country_of_origin, product.hs_code, product.channel_overrides]);
}

/** Channel-level legacy settings only belong to their uniquely configured listing. */
export function syncListingOverride(product: Product, listing: ChannelListing) {
  if (listing.creation_config) return listing.creation_config;
  const override = product.channel_overrides?.[listing.channel === 'website' ? 'webstore' : listing.channel];
  return override?.enabled && (!listing.store_name || !override.pricing_shop_label || listing.store_name === override.pricing_shop_label)
    && configuredListing(product.channels, listing.channel, override.listing_sku || '') === listing ? override : undefined;
}

export function initialMasterSyncPreference(product: Product, listing: ChannelListing, preference: MasterSyncPreference): MasterSyncPreference {
  const override = syncListingOverride(product, listing);
  const data = resolveListingShopData(product, listing, getCatalogImportItems({ requireConfirmation: true }));
  const shop = readPricing().shops.find(shop => shop.shopId === override?.pricing_shop_id);
  return { ...preference,
    pricing: preference.pricing ?? { currency: data.price?.currency || shop?.currency || override?.channel_currency || '', rule_id: shop?.ruleId },
    inventory: preference.inventory ?? { warehouse_id: '', safety_buffer: 0 },
  };
}

export interface MasterSyncGroupPreview { field: MasterSyncField; current: string[]; proposed: string[]; currentImages?: string[]; proposedImages?: string[]; error?: string }
const whole = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

/** One plan powers validation, review and every legacy-editor readout. Never writes shop values. */
export function masterSyncPlan(product: Product, listing: ChannelListing, preference: MasterSyncPreference,
  registry = readPricing(), warehouses = getWarehouses()) {
  const recorded = resolveListingShopData(product, listing, getCatalogImportItems({ requireConfirmation: true }));
  const local = listing.local_draft?.values;
  const data = { ...recorded, ...local, shipping: { ...recorded.shipping, ...local?.shipping } };
  const override = syncListingOverride(product, listing);
  const unknown = 'Not recorded';
  const groups: MasterSyncGroupPreview[] = [
    { field: 'content', current: [data.title || unknown, data.brand || unknown], proposed: [product.name, product.brand || unknown], error: !product.name.trim() ? 'Add a product name to the Master.' : undefined },
    { field: 'media', current: [data.images ? `${data.images.length} image${data.images.length === 1 ? '' : 's'}` : unknown], proposed: [`${product.images.filter(image => image.trim()).length} Master image${product.images.filter(image => image.trim()).length === 1 ? '' : 's'}`], currentImages: data.images ?? [], proposedImages: product.images.filter(image => image.trim()), error: !product.images.some(image => image.trim()) ? 'Add at least one image to the Master before syncing images.' : undefined },
  ];
  const variant = product.product_type === 'variant' || product.has_variants;
  const mappings = listing.variant_mappings ?? [];
  const mappedSkus = mappings.map(mapping => product.skus.find(sku => sku.id === mapping.master_sku_id));
  const sourceSkus = recorded.variants;
  const mappingError = listing.review_pending?.sku_mapping_pending || (!variant && (recorded.variantCount ?? 1) > 1)
    || (variant && (!mappings.length || mappedSkus.some(sku => !sku || sku.status !== 'active')
    || (recorded.variantCount && mappings.length !== recorded.variantCount)
    || sourceSkus?.some(sku => !mappings.some(mapping => mapping.shop_sku.trim() === sku.sku.trim()))
    || new Set(mappings.map(mapping => mapping.master_sku_id)).size !== mappings.length
    || new Set(mappings.map(mapping => mapping.shop_sku)).size !== mappings.length || mappings.some(mapping => !mapping.shop_sku.trim())))
    ? 'Confirm the listing’s variant-SKU mappings before syncing price or stock.' : undefined;
  const targets = variant ? mappedSkus.flatMap((sku, index) => sku ? [{ label: mappings[index].shop_sku, price: sku.price, stock: sku.stock_by_location ?? {} }] : [])
    : [{ label: listing.shop_sku || product.sku_code, price: product.retail_price, stock: product.inventory }];
  const pricing = preference.pricing;
  const currency = pricing?.currency || '';
  const knownCurrency = data.price?.currency || override?.channel_currency;
  const pricingRegistry = { ...registry, shops: [{ shopId: 'sync-preview', label: 'This listing', currency, ruleId: pricing?.rule_id }] };
  const quotes = targets.map(target => quoteListingPrice(target.price ?? NaN, product.price_currency,
    { pricing_source: 'shop', pricing_shop_id: 'sync-preview', channel_currency: currency }, pricingRegistry));
  const priceError = mappingError || (knownCurrency && currency !== knownCurrency ? `Keep the listing currency (${knownCurrency}); choose a matching pricing rule.` : undefined)
    || quotes.find(quote => quote.error)?.error;
  groups.push({ field: 'price', current: [data.price ? formatPrice(data.price.amount, data.price.currency) : unknown],
    proposed: quotes.map((quote, index) => `${variant ? targets[index].label + ': ' : ''}${quote.error || formatPrice(quote.amount, quote.currency)}`), error: priceError });
  const config = preference.inventory;
  const warehouse = warehouses.find(warehouse => warehouse.id === config?.warehouse_id && warehouse.status === 'active' && !warehouse.is_virtual && !['fba', 'fbs'].includes(warehouse.type));
  const quantities = targets.map(target => target.stock[config?.warehouse_id || '']);
  const stockError = mappingError || (listing.channel === 'amazon' && (override?.fulfillment === 'FBA' || config?.fulfillment === 'FBA') ? 'Amazon FBA manages stock; Master stock sync is unavailable.' : undefined)
    || (listing.channel === 'amazon' && override?.fulfillment !== 'FBM' && config?.fulfillment !== 'FBM' ? 'Confirm Amazon fulfillment before enabling stock sync.' : undefined)
    || (!warehouse ? 'Choose an active merchant-managed warehouse.' : undefined)
    || (!whole(config?.safety_buffer) || (config?.allocation_cap != null && !whole(config.allocation_cap)) ? 'Buffer and cap must be whole numbers of zero or more.' : undefined)
    || (quantities.some(quantity => !whole(quantity)) ? 'Record stock for every mapped SKU at this warehouse. Missing stock is not zero.' : undefined);
  const stockRows = targets.map((target, index) => ({ sku: target.label, quantity: stockError ? undefined : Math.min(Math.max(0, quantities[index] - config!.safety_buffer), config?.allocation_cap ?? Infinity) }));
  groups.push({ field: 'inventory', current: [data.stock == null ? unknown : `${data.stock} units`],
    proposed: [warehouse?.name || 'No warehouse selected', ...stockRows.map(row => `${variant ? row.sku + ': ' : ''}${row.quantity == null ? 'Quantity unavailable' : row.quantity + ' units'}`)], error: stockError });
  const shipping = [`${product.pkg_length} × ${product.pkg_width} × ${product.pkg_height} cm · ${product.pkg_weight} g`,
    product.country_of_origin ? `Origin: ${product.country_of_origin}` : '', product.hs_code ? `HS code: ${product.hs_code}` : ''].filter(Boolean);
  const shippingError = ['pos', 'social'].includes(listing.channel) ? 'This channel does not use shipping data.'
    : [product.pkg_length, product.pkg_width, product.pkg_height, product.pkg_weight].some(value => !Number.isFinite(value) || value <= 0) ? 'Complete package dimensions and weight in the Master first.' : undefined;
  const currentShipping = [data.shipping.length !== undefined ? `Length: ${data.shipping.length} cm` : '', data.shipping.width !== undefined ? `Width: ${data.shipping.width} cm` : '',
    data.shipping.height !== undefined ? `Height: ${data.shipping.height} cm` : '', data.shipping.weight !== undefined ? `Weight: ${data.shipping.weight} g` : '',
    data.shipping.country ? `Origin: ${data.shipping.country}` : '', data.shipping.hs_code ? `HS code: ${data.shipping.hs_code}` : '', data.shipping.notes || override?.compliance_notes || ''].filter(Boolean);
  groups.push({ field: 'shipping', current: currentShipping.length ? currentShipping : [unknown], proposed: shipping, error: shippingError });
  const selected = preference.enabled ? groups.filter(group => preference.fields.includes(group.field)) : [];
  const error = masterSyncValidation(product, preference) || selected.find(group => group.error)?.error;
  return { groups, stockRows, error, signature: JSON.stringify([preference, selected, local, quotes.map(quote => quote.signature), stockRows]) };
}
