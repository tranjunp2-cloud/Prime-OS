import { getListings } from '@/lib/listing-store';
import { getProducts } from '@/lib/product-store';
import { hydrateListingUiModels, type ListingUiModel } from '@/lib/contracts/listings';
import { useI18n } from '@/lib/i18n/I18nContext';

export type { ListingUiModel } from '@/lib/contracts/listings';

export function useListings() {
  const { locale } = useI18n();
  const listings = hydrateListingUiModels(getListings(), getProducts(), locale);
  return { data: listings, isLoading: false };
}

export function useListing(listingId: string | undefined) {
  const { locale } = useI18n();
  if (!listingId) return { data: null as ListingUiModel | null, isLoading: false };

  const listing = hydrateListingUiModels(getListings(), getProducts(), locale)
    .find((candidate) => candidate.id === listingId) ?? null;

  return { data: listing, isLoading: false };
}
