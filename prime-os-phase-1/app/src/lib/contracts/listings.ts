import type { Listing } from '@/lib/listing-store';
import type { Product } from '@/lib/product-store';
import type { Locale } from '@/lib/i18n/dictionaries';
import { toDisplayDate, toDisplayMoney, toOptionalText } from '@/lib/contracts/display';

export type ListingUiModel = Listing & {
  product_id: string | null;
  product_name: string | null;
  display_product_name: string;
  display_title: string;
  display_channel_sku: string;
  display_channel_product_id: string;
  display_price: string;
  display_published_at: string;
  display_last_synced_at: string;
};

function buildSkuProductLookup(products: Product[]) {
  const lookup = new Map<string, { productId: string; productName: string }>();

  for (const product of products) {
    for (const sku of product.skus) {
      lookup.set(sku.id, { productId: product.id, productName: product.name });
    }
  }

  return lookup;
}

export function hydrateListingUiModels(listings: Listing[], products: Product[], locale: Locale = 'en-US') {
  const lookup = buildSkuProductLookup(products);

  return listings.map<ListingUiModel>((listing) => {
    const productMeta = lookup.get(listing.sku_id);

    return {
      ...listing,
      product_id: productMeta?.productId ?? null,
      product_name: productMeta?.productName ?? null,
      display_product_name: productMeta?.productName ?? '—',
      display_title: toOptionalText(listing.title) ?? '—',
      display_channel_sku: toOptionalText(listing.channel_sku) ?? '—',
      display_channel_product_id: toOptionalText(listing.channel_product_id) ?? '—',
      display_price: toDisplayMoney(listing.price, listing.currency, locale),
      display_published_at: toDisplayDate(listing.published_at, locale),
      display_last_synced_at: toDisplayDate(listing.last_synced_at, locale),
    };
  });
}
