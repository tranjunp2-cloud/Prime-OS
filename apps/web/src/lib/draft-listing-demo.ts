import type { Product } from './product-store';

/** Repair only the untouched legacy fixtures that copied live listings into a new draft.
 * Never infer a user's listing state from Master status, or reset edited/imported records.
 */
export function repairDraftListingDemo(product: Product): Product {
  const fixture: { sku: string; updated: string; listings: Record<string, string | null> } | null = product.id === 'prod_005' ? {
    sku: 'CR-TAI-BSZ', updated: '2026-04-06T08:00:00Z',
    listings: { rakuten: 'R001002002', website: null },
  } : product.id === 'prod_demo_headphones_002' ? {
    sku: 'DEMO-ELC-002', updated: '2026-04-06T08:00:00Z',
    listings: { amazon: 'B0G432Z31H' },
  } : null;
  if (!fixture || product.sku_code !== fixture.sku || product.status !== 'draft'
    || product.updated_at !== fixture.updated || (product.record_version ?? 1) > 1
    || product.revisions?.length || product.import_source || product.import_sources?.length
    || !Array.isArray(product.channels)) return product;
  let changed = false;
  const channels = product.channels.map(listing => {
    if (!(listing.channel in fixture.listings)
      || listing.external_id !== fixture.listings[listing.channel]
      || listing.status !== 'active' || listing.last_synced_at
      || (listing.listing_url && listing.listing_url !== '/products/CR-TAI-BSZ')
      || product.channel_overrides?.[listing.channel === 'website' ? 'webstore' : listing.channel]) return listing;
    changed = true;
    return { ...listing, status: 'draft' as const, external_id: null, listing_url: null };
  });
  return changed ? { ...product, channels } : product;
}
