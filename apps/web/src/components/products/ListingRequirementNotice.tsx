import type { ChannelListing, Product } from '@/lib/product-store';
import { getCatalogImportItems } from '@/lib/catalog-import-store';
import { listingSyncReadiness } from '@/lib/listing-sync-readiness';

export function ListingRequirementNotice({ product, listing }: { product: Product; listing: ChannelListing }) {
  const status = listingSyncReadiness(product, listing, getCatalogImportItems({ requireConfirmation: true }));
  return <p className={`mt-2 text-xs leading-5 ${status.ready ? 'text-muted-foreground' : 'text-amber-700 dark:text-amber-300'}`}>
    {status.ready ? 'Listing data ready · sync managed separately' : status.requirements.state === 'blocked'
      ? `${status.requirements.message} · This listing’s sync is blocked`
      : status.reasons.join(' · ')}
  </p>;
}
