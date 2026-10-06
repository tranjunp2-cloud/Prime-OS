// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { getCatalogImportItems } from './catalog-import-store';
import { getProducts } from './product-store';
import { evidenceSummary, groupEvidenceSummary, listingMatchEvidence, packTitleHint, rankMasterCandidates, safeListingUrl, suggestedMasterForReview } from './listing-match-evidence';

const product = { ...getProducts()[0], id: 'evidence-target', name: 'Precision Brush Set 12-piece', sku_code: 'BRUSH-12', brand: 'Maker', has_variants: false, product_type: 'single' as const, skus: [], status: 'draft' as const };
const listing = { ...getCatalogImportItems({ requireConfirmation: true })[0], channelSku: ' brush-12 ', title: 'Precision Brush Set 12 pieces', brand: 'Other maker', variants: 1, suggestedProductId: product.id };
describe('Listing identity evidence', () => {
  it('summarizes evidence across every selected listing without using the first as a group match', () => {
    const sources = [listing, { ...listing, channelSku: 'DIFFERENT', brand: product.brand, variants: 3 }];
    expect(groupEvidenceSummary(sources, product)).toEqual({ skuMatches: 1, withDifferences: 2, withMissingData: 2, withVariants: 1 });
    expect(groupEvidenceSummary([...sources].reverse(), product)).toEqual(groupEvidenceSummary(sources, product));
    expect(groupEvidenceSummary([{ ...listing, channelSku: '', brand: '', variants: 0 }], product)).toMatchObject({ skuMatches: 0, withDifferences: 0, withMissingData: 1, withVariants: 1 });
  });
  it('explains actual fields, never treats absent identifiers or title hints as matches', () => {
    const evidence = listingMatchEvidence(listing, product);
    expect(evidence.find(row => row.key === 'sku')?.state).toBe('match');
    expect(evidence.find(row => row.key === 'brand')?.state).toBe('different');
    expect(evidence.find(row => row.key === 'gtin')?.state).toBe('missing');
    expect(evidence.find(row => row.key === 'pack')?.state).toBe('missing');
    expect(listingMatchEvidence({ ...listing, gtin: '' }, { ...product, gtin: '' }).find(row => row.key === 'gtin')?.state).toBe('missing');
    expect(packTitleHint(listing.title)).toBe('Title says “12 pieces” · unverified');
    expect(packTitleHint('Palette 24 colors')).toBe('');
  });
  it('does not infer identity from equal variant counts or from prices and categories', () => {
    const evidence = listingMatchEvidence({ ...listing, variants: 3 }, { ...product, has_variants: true, skus: getProducts()[0].skus.slice(0, 3) });
    expect(evidence.find(row => row.key === 'structure')?.state).toBe('check');
    expect(evidence.some(row => ['price', 'stock', 'category'].includes(row.key))).toBe(false);
    expect(evidenceSummary(listing, product)).toEqual(evidenceSummary({ ...listing, confidence: 100, channelStock: 999, price: 999, channelCategory: 'Another category' }, product));
  });
  it('ranks actual identity evidence and searches all available Masters without using seed confidence', () => {
    const other = { ...product, id: 'unrelated', name: 'Unrelated pencil', sku_code: 'PENCIL-01' };
    const archived = { ...product, id: 'archived', status: 'archived' as const };
    expect(rankMasterCandidates([listing], [other, archived, product], '').map(item => item.id)).toEqual([product.id, other.id]);
    expect(rankMasterCandidates([listing], [other, product], 'pencil')).toEqual([other]);
    expect(rankMasterCandidates([listing], [other, product], 'Maker')).toHaveLength(2);
  });
  it('only offers real, safe source URLs', () => {
    expect(safeListingUrl(undefined)).toBeUndefined();
    expect(safeListingUrl('javascript:alert(1)')).toBeUndefined();
    expect(safeListingUrl('https://user:password@example.com')).toBeUndefined();
    expect(safeListingUrl('https://example.com/listing/123')).toBe('https://example.com/listing/123');
  });
  it('preselects only an explicit shared available suggestion, including flagged suggestions for review', () => {
    const source = { ...listing, confirmed: false, status: 'conflict' as const, resolution: 'later' as const, confidence: 58 };
    expect(suggestedMasterForReview([source], [product])).toEqual(product);
    expect(suggestedMasterForReview([source, { ...source, id: 'second' }], [product])).toEqual(product);
    expect(suggestedMasterForReview([], [product])).toBeNull();
    expect(suggestedMasterForReview([source], [])).toBeNull();
    expect(suggestedMasterForReview([source], [{ ...product, status: 'archived' }])).toBeNull();
    expect(suggestedMasterForReview([{ ...source, suggestedProductId: undefined }], [product])).toBeNull();
    expect(suggestedMasterForReview([source, { ...source, suggestedProductId: undefined }], [product])).toBeNull();
    expect(suggestedMasterForReview([source, { ...source, suggestedProductId: 'other' }], [product, { ...product, id: 'other' }])).toBeNull();
    expect(suggestedMasterForReview([{ ...source, confirmed: true }], [product])).toBeNull();
  });
});
