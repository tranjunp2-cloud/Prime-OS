import type { ChannelWizardDraft } from '@/components/products/ChannelListingWizard';
import { LISTING_DESTINATIONS, type ListingDestinationKey } from './channel-listing-destinations';
import { CHANNEL_MARKET_LOCALES } from './channel-market-locale';
import { configuredListing } from './product-channel-listings';
import { initialListingPricing, pricingNeedsReview, quoteListingPrice } from './pricing-rules';
import { getProductById, updateProductLinksAtomically, type ChannelListing, type Product } from './product-store';

const channelFor = (key: ListingDestinationKey): ChannelListing['channel'] => key === 'webstore' ? 'website' : key;
const sameShop = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
const recordedShop = (listing: ChannelListing) => listing.store_name
  || (listing.external_id && listing.shop_snapshot?.listing_id === listing.external_id
    && listing.shop_snapshot.channel === listing.channel ? listing.shop_snapshot.store_name : undefined);

/** Match a shop, not a marketplace. Never treat a suggested import match as a linked listing. */
export function availableListingDestinations(product?: Product | null) {
  return LISTING_DESTINATIONS.filter(destination => {
    if (destination.connectionStatus !== 'connected' || !destination.account) return false;
    if (!product) return true;
    const channel = channelFor(destination.key);
    const override = product.channel_overrides?.[destination.key];
    const configured = configuredListing(product.channels, channel, override?.listing_sku || '');
    if (product.channels.some(listing => listing.channel === channel
      && (recordedShop(listing) ? sameShop(recordedShop(listing)!, destination.account!)
        : listing === configured && sameShop(override?.pricing_shop_label || destination.account!, destination.account!)))) return false;
    // A saved legacy setup without a listing record still belongs to its configured shop.
    return !(override?.enabled && sameShop(override.pricing_shop_label || destination.account, destination.account)
      && (!configured || !recordedShop(configured) || sameShop(recordedShop(configured)!, destination.account)));
  });
}

/** Fresh creation values come only from Master, never from another shop's override. */
export function freshChannelListingDrafts(product: Product): Record<ListingDestinationKey, ChannelWizardDraft> {
  return Object.fromEntries(LISTING_DESTINATIONS.map(destination => {
    const key = destination.key;
    const locale = CHANNEL_MARKET_LOCALES[key];
    const content = locale ? product.localized_content?.[locale.locale] : undefined;
    return [key, {
      ...initialListingPricing(undefined, key, destination.account || key),
      enabled: false, title: content?.name || product.name, description: content?.description || product.description,
      price_markup: '', listing_sku: '', category: product.category, fulfillment: '', variant_scope: 'all',
      listing_mode: key === 'amazon' ? 'offer_only' : 'manual',
      identifier: (key === 'amazon' ? product.asin : product.gtin) || '', condition: key === 'amazon' ? 'new_new' : '',
      stock_quantity: '', warehouse: '', brand: key === 'rakuten' ? '' : product.brand,
      shipping_option: '', bullet_points: '', search_terms: '', preorder_days: '', warranty: '', certification: '',
      video_url: '', web_slug: '', pos_barcode: product.gtin || '', visibility: key === 'webstore' ? 'public' : '',
      sync_policy: 'disabled', safety_buffer: '0', allocation_cap: '', media_scope: 'all', compliance_notes: '',
      tax_code: '', attribute_material: '', attribute_color: '', localized_content_confirmed: false,
    }];
  })) as Record<ListingDestinationKey, ChannelWizardDraft>;
}

/** Append-only, atomic local creation. No provider calls, no existing configuration writes. */
export function createChannelListingDrafts(productId: string, selected: Record<string, ChannelWizardDraft>, expectedVersion: number) {
  const product = getProductById(productId);
  if (!product || product.status === 'archived') throw new Error('This Master is unavailable. Close setup and return to Channel listings.');
  if ((product.record_version ?? 1) !== expectedVersion) throw new Error('This Master changed during setup. Close and reopen Create listing to use the latest data.');
  const entries = Object.entries(selected);
  if (!entries.length) throw new Error('Choose at least one shop.');
  const available = availableListingDestinations(product);
  const now = new Date().toISOString();
  const created = entries.map(([key, draft]): ChannelListing => {
    const destination = available.find(shop => shop.key === key);
    if (!destination) throw new Error('A selected shop already has a listing or is unavailable. Close and reopen Create listing.');
    if (!draft.listing_sku.trim()) throw new Error('Enter a SKU for each new listing.');
    if (pricingNeedsReview(draft, quoteListingPrice(product.retail_price, product.price_currency, draft))) throw new Error('Review and confirm each listing price before creating drafts.');
    const stock = key === 'amazon' && draft.fulfillment === 'FBA' ? undefined
      : draft.stock_quantity.trim() ? Number(draft.stock_quantity) : undefined;
    if (stock !== undefined && (!Number.isSafeInteger(stock) || stock < 0)) throw new Error('Listing stock must be a whole number of zero or more.');
    const config = { ...draft, enabled: true, price_markup: Number(draft.price_markup || 0) };
    return {
      channel: channelFor(destination.key), store_name: destination.account, shop_sku: draft.listing_sku.trim(),
      external_id: null, status: 'draft', listing_url: null, last_synced_at: null,
      creation_config: config,
      master_data_sync: { enabled: false, fields: [], updated_at: now },
      local_draft: { updated_at: now, values: {
        title: draft.title, description: draft.description, brand: draft.brand, category: draft.category,
        images: [...product.images], price: { amount: draft.channel_price!, currency: draft.channel_currency! }, stock,
        shipping: { length: product.pkg_length, width: product.pkg_width, height: product.pkg_height,
          weight: product.pkg_weight, country: product.country_of_origin, hs_code: product.hs_code, notes: draft.compliance_notes },
        channel_settings: { condition: draft.condition, search_terms: draft.search_terms, bullet_points: draft.bullet_points,
          preorder_days: draft.preorder_days, warranty: draft.warranty, certification: draft.certification, video_url: draft.video_url,
          web_slug: draft.web_slug, pos_barcode: draft.pos_barcode, visibility: draft.visibility, tax_code: draft.tax_code,
          attribute_material: draft.attribute_material, attribute_color: draft.attribute_color },
      } },
    };
  });
  updateProductLinksAtomically([{ id: product.id, channels: [...product.channels, ...created],
    import_sources: product.import_sources, record_version: expectedVersion + 1 }]);
  return created;
}
