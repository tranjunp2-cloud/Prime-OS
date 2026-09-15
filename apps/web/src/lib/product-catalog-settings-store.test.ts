// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  getAttributesForCategory,
  getProductCatalogSettings,
  saveProductCatalogSettings,
} from './product-catalog-settings-store';

describe('product catalog settings store', () => {
  beforeEach(() => localStorage.clear());

  it('keeps brand separate from reusable attributes', () => {
    const settings = getProductCatalogSettings();
    expect(settings.brands.length).toBeGreaterThan(0);
    expect(settings.attributes.some(attribute => attribute.key === 'brand')).toBe(false);
  });

  it('marks non-taxonomy channels as not required', () => {
    const category = getProductCatalogSettings().categories[0];
    expect(category.mappings.pos).toBe('not_required');
    expect(category.mappings.social).toBe('not_required');
  });

  it('persists canonical catalog changes', () => {
    const settings = getProductCatalogSettings();
    settings.brands[0] = { ...settings.brands[0], name: 'Updated Brand' };
    saveProductCatalogSettings(settings);
    expect(getProductCatalogSettings().brands[0].name).toBe('Updated Brand');
  });

  it('resolves attributes assigned to a category', () => {
    const attributes = getAttributesForCategory('Shoe');
    expect(attributes.map(attribute => attribute.key)).toEqual(expect.arrayContaining(['material', 'color', 'size']));
    expect(attributes.some(attribute => attribute.required)).toBe(true);
  });
});
