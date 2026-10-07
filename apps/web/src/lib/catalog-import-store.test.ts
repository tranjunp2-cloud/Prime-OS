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

  it('provides complete independent SKU snapshots for both Sketchbook shops', () => {
    const items = getCatalogImportItems({ requireConfirmation: true }).filter(item => ['imp-002', 'imp-011'].includes(item.id));
    for (const item of items) {
      expect(item.variantItems).toHaveLength(3);
      expect(item.variantItems!.every(sku => sku.sku && sku.label && sku.price?.currency === item.currency)).toBe(true);
      expect(item.variantItems!.reduce((total, sku) => total + (sku.stock ?? 0), 0)).toBe(item.channelStock);
      expect(item.confirmed).not.toBe(true);
    }
    expect(items[0].variantItems![0].label).not.toBe(items[1].variantItems![0].label);
  });

  it('backfills only absent demo SKU details without resetting persisted decisions or writing storage', () => {
    const original = getCatalogImportItems({ requireConfirmation: true }).find(item => item.id === 'imp-002')!;
    const legacy = { ...original, variantItems: undefined, resolution: 'ignore' as const, confirmed: true, resolvedProductId: 'user-chosen-master', price: 123 };
    saveCatalogImportItems([legacy]);
    const saved = window.localStorage.getItem('prime-catalog-import-review-v12');
    const [loaded] = getCatalogImportItems({ requireConfirmation: true });
    expect(loaded).toMatchObject({ resolution: 'ignore', confirmed: true, resolvedProductId: 'user-chosen-master', price: 123 });
    expect(loaded.variantItems).toHaveLength(3);
    expect(window.localStorage.getItem('prime-catalog-import-review-v12')).toBe(saved);
  });

  it('does not overwrite supplied SKU data or enrich another shop, identity or variant count', () => {
    const original = getCatalogImportItems({ requireConfirmation: true }).find(item => item.id === 'imp-011')!;
    for (const patch of [{ variantItems: [] }, { variantItems: [{ sku: 'CUSTOM', label: 'Custom' }] }, { storeName: 'Other shop', variantItems: undefined }, { listingId: 'Other listing', variantItems: undefined }, { variants: 2, variantItems: undefined }]) {
      saveCatalogImportItems([{ ...original, ...patch }]);
      expect(getCatalogImportItems({ requireConfirmation: true })[0].variantItems).toEqual(patch.variantItems);
    }
  });
});
