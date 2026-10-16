import type { ChannelListing, Product } from '@/lib/product-store';
import { getCatalogImportItems } from '@/lib/catalog-import-store';
import { listingSyncReadiness } from '@/lib/listing-sync-readiness';
import { Link } from 'react-router-dom';

export function ListingRequirementNotice({ product, listing }: { product: Product; listing: ChannelListing }) {
  const status = listingSyncReadiness(product, listing, getCatalogImportItems({ requireConfirmation: true }));
  if (status.incompleteSource) return <div className="mt-2 space-y-1 text-xs leading-5 text-amber-700 dark:text-amber-300">
    <p className="font-medium">Listing data incomplete · Link needs review</p>
    <p>{status.sourceData.message}</p>
    <Link to="/sales-channels/connected-channels" className="inline-flex min-h-11 items-center underline underline-offset-4">Re-import from connected shop</Link>
  </div>;
  return <p className={`mt-2 text-xs leading-5 ${status.ready ? 'text-muted-foreground' : 'text-amber-700 dark:text-amber-300'}`}>
    {status.ready ? 'Listing data ready · sync managed separately' : status.requirements.state === 'blocked'
      ? `${status.requirements.message} · This listing’s sync is blocked`
      : status.reasons.join(' · ')}
  </p>;
}
