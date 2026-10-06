import type { ConnectedChannelRecord } from './channel-integrations-api';

export type ChannelSetupSnapshot =
  | { status: 'loading' | 'error'; channels: ConnectedChannelRecord[] }
  | { status: 'loaded'; channels: ConnectedChannelRecord[] };

export type ProductOnboardingPreview = 'no-products' | 'no-channels';

// Count every Master, including drafts and archived records, before applying filters.
export function productIntroMode(productCount: number, hasCreatedMaster: boolean, preview = false) {
  if (preview) return 'intro';
  if (productCount > 0) return 'catalog';
  return hasCreatedMaster ? 'empty' : 'intro';
}

export function productGettingStartedState(snapshot: ChannelSetupSnapshot, pendingCount: number, preview?: ProductOnboardingPreview) {
  // Presentation-only previews never change saved products, imports or connections.
  if (preview === 'no-channels' || (!preview && snapshot.status === 'loaded' && snapshot.channels.length === 0)) {
    return { kind: 'no-channels' as const, title: 'Connect your first channel', detail: 'Already selling online? Connect a shop to review its existing listings.', action: 'Connect channel' };
  }
  if (preview === 'no-products' && pendingCount === 0) {
    return { kind: 'empty' as const, title: 'No shop listings to review yet', detail: 'You can still start from a product file or create a new product.', action: '' };
  }
  const syncing = snapshot.channels.some(channel => channel.status === 'INITIAL_SYNCING');
  const connectionError = snapshot.channels.some(channel => ['EXPIRED', 'SYNC_ERROR'].includes(channel.status));
  if (pendingCount > 0) return { kind: 'listings' as const, title: `${pendingCount} listings are waiting for your review`, detail: 'Use existing shop data. Choose which listings belong to the same product before linking or creating a Master.', action: 'Review shop listings' };
  if (snapshot.status === 'error') return { kind: 'error' as const, title: 'Could not check your shops', detail: 'Connection status is unavailable. Your shop listings have not been changed.', action: 'Try again' };
  if (snapshot.status === 'loading' || syncing) return { kind: 'loading' as const, title: syncing ? 'Getting listings from your shops…' : 'Checking connected shops…', detail: 'You can import a product file or create a new product while this runs.', action: '' };
  if (connectionError) return { kind: 'connection' as const, title: 'A shop connection needs attention', detail: 'Check the connection to finish getting your listings. You can still work on Product Masters.', action: 'Check connection' };
  if (snapshot.channels.some(channel => channel.synced_listings > 0)) return { kind: 'reported' as const, title: 'Your shops report existing listings', detail: 'No unlinked listing details are available in this prototype yet. Check your shops or create a new product manually.', action: 'Check shops' };
  return { kind: 'empty' as const, title: snapshot.channels.length ? 'No shop listings to review yet' : 'Already selling in a shop?', detail: snapshot.channels.length ? 'You can still start from a product file or create a new product.' : 'Connect a shop to review its existing listings and choose which ones belong to the same product.', action: snapshot.channels.length ? '' : 'Connect a shop' };
}

export function suggestMasterSku(existingSkus: string[]) {
  const used = new Set(existingSkus.map(sku => sku.trim().toUpperCase()));
  let sequence = 1;
  while (used.has(`PRD-${String(sequence).padStart(4, '0')}`)) sequence++;
  return `PRD-${String(sequence).padStart(4, '0')}`;
}
