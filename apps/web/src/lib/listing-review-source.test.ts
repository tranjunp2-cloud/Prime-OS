import { describe, expect, it } from 'vitest';
import type { CatalogImportItem } from './catalog-import-store';
import { hydrateReviewSkuSources } from './listing-review-source';

const summary = { id: 'item', channel: 'shopee', storeName: 'Shop', listingId: 'source', channelSku: 'NOTEBOOK', variants: 2, title: 'Notebook', confirmed: false, resolution: 'later' } as CatalogImportItem;
const full = { ...summary, variantItems: [{ sku: 'SHOP-B5', label: 'Black / B5' }, { sku: 'SHOP-A5', label: 'Black / A5' }] };

describe('Read imported SKU data before opening review', () => {
  it('fills an omitted child snapshot from the exact imported listing without mutating data or decisions', () => {
    const sources = [{ ...summary, resolvedProductId: 'chosen-master', title: 'Reviewed title' }];
    const hydrated = hydrateReviewSkuSources(sources, [full]);
    expect(hydrated[0]).toMatchObject({ variantItems: full.variantItems, title: 'Reviewed title', resolvedProductId: 'chosen-master' });
    expect(sources[0].variantItems).toBeUndefined();
    expect(hydrated[0].variantItems).not.toBe(full.variantItems);
  });
  it('never fills data from a different shop, listing, channel, variant count, or terminal state', () => {
    for (const patch of [{ id: 'other' }, { listingId: 'other' }, { storeName: 'other' }, { channel: 'amazon' as const }, { variants: 3 }, { channelSku: 'other' }, { confirmed: true }, { resolution: 'ignore' as const }]) {
      expect(hydrateReviewSkuSources([summary], [{ ...full, ...patch }])[0].variantItems).toBeUndefined();
    }
  });
  it('does not invent missing rows or overwrite an explicitly loaded source snapshot', () => {
    expect(hydrateReviewSkuSources([summary], [{ ...full, variantItems: full.variantItems.slice(0, 1) }])[0].variantItems).toBeUndefined();
    expect(hydrateReviewSkuSources([{ ...summary, variantItems: [] }], [full])[0].variantItems).toEqual([]);
    expect(hydrateReviewSkuSources([summary], [])[0].variantItems).toBeUndefined();
  });
});
