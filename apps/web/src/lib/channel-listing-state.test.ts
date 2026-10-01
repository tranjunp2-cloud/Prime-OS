// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createAmazonListingDraft } from './amazon-listing-store';
import { getProducts, type Product } from './product-store';
import { getChannelListingState } from './channel-listing-state';

function fixture(patch: Partial<Product> = {}): Product {
  return { ...getProducts()[0], status: 'draft', channels: [], channel_overrides: {}, revisions: [],
    import_result: undefined, import_source: undefined, import_sources: [], ...patch };
}
const activeListing = { channel: 'amazon' as const, status: 'active' as const, external_id: 'EXISTING-ASIN', listing_url: null, last_synced_at: '2026-09-28T08:40:00Z' };

describe('independent Master, channel publication and submission state', () => {
  it('retains a live imported listing while its Master needs review', () => {
    const product = fixture({ status: 'review', import_source: 'Amazon · Existing shop', channels: [activeListing] });
    const before = JSON.stringify(product);
    expect(getChannelListingState(product, 'amazon')).toMatchObject({ indicator: 'live', publicationLabel: 'Live on channel', masterLabel: 'Draft', updateLabel: 'Not verified' });
    expect(getChannelListingState(product, 'amazon').explanation).toContain('statuses are independent');
    expect(JSON.stringify(product)).toBe(before);
  });

  it('does not treat enabled overrides or a saved local listing as queued', () => {
    const product = fixture({ channel_overrides: { amazon: { enabled: true, title: '', description: '', price_markup: 0 } } });
    expect(getChannelListingState(product, 'amazon').indicator).toBe('draft');
    expect(getChannelListingState(fixture(), 'amazon', createAmazonListingDraft(product))).toMatchObject({ indicator: 'draft', publicationLabel: 'Draft — not sent', updateLabel: 'Not sent' });
  });

  it('keeps a local draft gray even when the Master is Active', () => {
    const product = fixture({ status: 'published', channels: [{ ...activeListing, external_id: null, last_synced_at: null, status: 'draft' }] });
    expect(getChannelListingState(product, 'amazon')).toMatchObject({ indicator: 'draft', masterLabel: 'Active' });
  });

  it('does not call a published Master current just because a listing is live or was pulled recently', () => {
    const product = fixture({ status: 'published', channels: [activeListing] });
    expect(getChannelListingState(product, 'amazon')).toMatchObject({ indicator: 'live', masterLabel: 'Active', updateLabel: 'Not verified' });
  });

  it('keeps the current live listing when a new edit is only saved as a draft', () => {
    const product = fixture({ status: 'published', channels: [activeListing] });
    const saved = { ...createAmazonListingDraft(product), lastSyncedAt: activeListing.last_synced_at };
    expect(getChannelListingState(product, 'amazon', saved)).toMatchObject({ indicator: 'live', publication: 'live', updateLabel: 'Draft changes — not sent' });
  });

  it.each(['queued', 'syncing', 'error'] as const)('preserves Live while a later update is %s', status => {
    const product = fixture({ channels: [activeListing] });
    const saved = { ...createAmazonListingDraft(product), status };
    expect(getChannelListingState(product, 'amazon', saved)).toMatchObject({ publication: 'live', indicator: status === 'error' ? 'error' : 'pending' });
  });

  it('does not equate successful submission with marketplace approval', () => {
    const product = fixture({ channels: [{ ...activeListing, status: 'draft' }] });
    const saved = { ...createAmazonListingDraft(product), status: 'synced' as const, lastSyncedAt: activeListing.last_synced_at };
    expect(getChannelListingState(product, 'amazon', saved)).toMatchObject({ indicator: 'unconfirmed', publicationLabel: 'Not confirmed', updateLabel: 'Last submission succeeded' });
  });

  it('distinguishes pending, inactive and not-linked listings', () => {
    expect(getChannelListingState(fixture({ channels: [{ ...activeListing, status: 'pending' }] }), 'amazon').indicator).toBe('pending');
    expect(getChannelListingState(fixture({ channels: [{ ...activeListing, status: 'inactive' }] }), 'amazon').indicator).toBe('inactive');
    expect(getChannelListingState(fixture(), 'amazon').indicator).toBe('missing');
  });

  it('does not unpublish a listing when its Master is archived', () => {
    expect(getChannelListingState(fixture({ status: 'archived', channels: [activeListing] }), 'amazon')).toMatchObject({ indicator: 'live', masterLabel: 'Archived' });
  });
});
