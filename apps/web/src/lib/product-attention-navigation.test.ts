import { describe, expect, it } from 'vitest';
import { getProductAttentionHref, getProductAttentionTarget } from './product-attention-navigation';

describe('catalog attention badge navigation', () => {
  it.each(['Product identity mismatch', 'Variant structure conflict'])('keeps mapping review out of Master data navigation for %s', issue => {
    expect(getProductAttentionHref({ id: 'import-review', import_result: 'needs_review', import_issues: [issue] }))
      .toBe('/products/import-review/edit');
  });

  it('opens the missing imported image rather than an unrelated missing GTIN', () => {
    expect(getProductAttentionHref({ id: 'import', import_result: 'incomplete', import_issues: ['Product image is required'] }, ['GTIN']))
      .toBe('/products/import/edit?section=product-data&focus=media');
  });

  it.each([
    ['Product name', 'product-data', 'identity'],
    ['Master SKU', 'product-data', 'sku'],
    ['Brand', 'product-data', 'brand'],
    ['Category', 'product-data', 'category'],
    ['Description', 'product-data', 'content'],
    ['GTIN', 'product-data', 'gtin'],
    ['Product image', 'product-data', 'media'],
    ['Variant price is missing', 'commerce', 'pricing'],
    ['Package weight is missing', 'product-data', 'shipping'],
  ])('opens the relevant section for %s', (field, section, focus) => {
    expect(getProductAttentionHref({ id: 'manual' }, [field]))
      .toBe(`/products/manual/edit?section=${section}&focus=${focus}`);
    expect(getProductAttentionTarget(focus)?.section).toBe(section);
  });

  it('falls back to basic product data when an import issue is unrecognized', () => {
    expect(getProductAttentionHref({ id: 'import', import_result: 'incomplete', import_issues: ['Unknown requirement'] }))
      .toBe('/products/import/edit?section=product-data&focus=basic');
  });

  it.each(['ready', 'published', 'matched'] as const)('opens missing data for %s imports independently from mapping', import_result => {
    expect(getProductAttentionHref({ id: 'ready', import_result }, ['Product image']))
      .toBe('/products/ready/edit?section=product-data&focus=media');
  });

  it('ignores invalid focus parameters and safely encodes product ids', () => {
    expect(getProductAttentionTarget(null)).toBeNull();
    expect(getProductAttentionTarget('unknown')).toBeNull();
    expect(getProductAttentionTarget('__proto__')).toBeNull();
    expect(getProductAttentionHref({ id: 'part/1' })).toBe('/products/part%2F1/edit');
  });
});
