// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import { getCatalogImportItems, saveCatalogImportItems } from './catalog-import-store';

describe('catalog import demo scenarios', () => {
  beforeEach(() => window.localStorage.clear());

  it('seeds a broad set of review states and decisions', () => {
    const items = getCatalogImportItems();

    expect(items).toHaveLength(34);
    expect(new Set(items.map((item) => item.channel))).toEqual(new Set(['shopee', 'amazon', 'lazada']));
    expect(new Set(items.map((item) => item.status))).toEqual(new Set(['matched', 'suggested', 'unmatched', 'conflict', 'ignored']));
    expect(new Set(items.map((item) => item.resolution))).toEqual(new Set(['link', 'create', 'later', 'ignore']));
  });

  it('includes safe, manual-review, grouped, and confirmed mappings', () => {
    const items = getCatalogImportItems();
    const safeSuggestions = items.filter((item) => item.status === 'suggested' && item.resolution === 'link' && item.confirmed && item.confidence >= 85);
    const manualSuggestions = items.filter((item) => item.status === 'suggested' && item.resolution === 'later' && item.confidence < 85);
    const groupedCandidates = items.filter((item) => item.suggestedProductId === 'prod_001');

    expect(safeSuggestions.length).toBeGreaterThanOrEqual(3);
    expect(manualSuggestions.length).toBeGreaterThanOrEqual(3);
    expect(groupedCandidates.length).toBeGreaterThanOrEqual(3);
    expect(items.some((item) => item.confirmed)).toBe(true);
  });

  it('includes dedicated 95% high-confidence and 100% exact-match groups', () => {
    const items = getCatalogImportItems();
    const groupConfidence = (productId: string) => Math.min(...items
      .filter((item) => item.suggestedProductId === productId && ['matched', 'suggested'].includes(item.status) && item.resolution !== 'ignore')
      .map((item) => item.confidence));

    expect(groupConfidence('prod_001')).toBe(95);
    expect(groupConfidence('prod_003')).toBe(100);
  });

  it('persists reviewer decisions for the active demo version', () => {
    const [first, ...rest] = getCatalogImportItems();
    saveCatalogImportItems([{ ...first, confirmed: true }, ...rest]);

    expect(getCatalogImportItems()[0].confirmed).toBe(true);
  });
});
