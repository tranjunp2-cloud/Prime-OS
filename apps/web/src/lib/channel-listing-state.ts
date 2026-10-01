import type { AmazonListingDraft } from './amazon-listing-store';
import type { Product } from './product-store';

export type ListingIndicator = 'live' | 'draft' | 'inactive' | 'unconfirmed' | 'pending' | 'error' | 'missing';
export type CatalogChannelKey = 'primeweb' | 'pos' | 'shopee' | 'lazada' | 'amazon' | 'rakuten';

export const listingIndicatorLabel: Record<ListingIndicator, string> = {
  live: 'Live on channel', draft: 'Draft', inactive: 'Inactive',
  unconfirmed: 'Status unconfirmed', pending: 'Processing', error: 'Update failed', missing: 'Not linked',
};

/** Publication on a channel and the latest submission are independent of Master lifecycle.
 * A pull timestamp (last_synced_at) is NOT proof that the published Master is up to date there.
 */
export function getChannelListingState(product: Product, channel: CatalogChannelKey, amazon?: AmazonListingDraft | null) {
  const sourceChannel = channel === 'primeweb' ? 'website' : channel;
  const overrideKey = channel === 'primeweb' ? 'webstore' : channel;
  const listing = product.channels.find(item => item.channel === sourceChannel);
  const configured = Boolean(product.channel_overrides?.[overrideKey]?.enabled);
  const submission = channel === 'amazon' ? amazon : null;
  // A completed Amazon submission alone is not marketplace approval. Only the
  // listing's publication status establishes whether it is live.
  const publication = listing?.status === 'active' ? 'live'
    : listing?.status === 'inactive' ? 'inactive'
    : listing?.status === 'pending' ? 'unconfirmed'
    : submission && (submission.lastSyncedAt || submission.status !== 'draft') ? 'unconfirmed'
    : listing?.status === 'draft' || configured || submission ? 'draft' : 'missing';
  const processing = submission?.status === 'queued' || submission?.status === 'syncing';
  const failed = submission?.status === 'error';
  const indicator: ListingIndicator = failed ? 'error' : processing || listing?.status === 'pending' ? 'pending' : publication;
  const publicationLabel = publication === 'draft' ? 'Draft — not sent'
    : publication === 'unconfirmed' ? 'Not confirmed'
    : listingIndicatorLabel[publication];
  const updateLabel = failed ? 'Submission failed' : processing ? 'Submission in progress'
    : submission?.status === 'draft' && publication !== 'draft' ? 'Draft changes — not sent'
    : submission?.status === 'synced' ? 'Last submission succeeded'
    : publication === 'draft' || publication === 'missing' ? 'Not sent'
    : listing?.status === 'pending' ? 'Awaiting channel confirmation'
    : 'Not verified';
  const masterLabel = product.status === 'published' ? 'Active' : product.status === 'archived' ? 'Archived' : 'Draft';
  const explanation = publication === 'live' && masterLabel === 'Draft'
    ? 'This listing already exists on the channel. The Master is still a draft; these statuses are independent.'
    : publication === 'live' && masterLabel === 'Archived'
    ? 'Archiving this Master does not unpublish the channel listing.'
    : publication === 'draft'
    ? 'Saved locally. This listing has not been sent to the channel.'
    : 'Listing status does not confirm that it matches the latest Master data.';
  return { indicator, publication, publicationLabel, updateLabel, masterLabel, explanation };
}
