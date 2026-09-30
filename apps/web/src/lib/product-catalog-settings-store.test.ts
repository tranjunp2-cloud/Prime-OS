// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  getAttributesForCategory,
  getActiveCatalogBrands,
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

  it('makes default brands usable without internal verification', () => {
    expect(getActiveCatalogBrands().every(brand => brand.status === 'Active')).toBe(true);
  });

  it.each(['Verified', 'Unverified'])('restores legacy %s brands as Active without changing identity or mappings', status => {
    const settings = getProductCatalogSettings();
    const legacyBrand = { ...settings.brands[0], status };
    localStorage.setItem('prime-product-catalog-settings-v2', JSON.stringify({ ...settings, brands: [legacyBrand] }));

    expect(getProductCatalogSettings().brands).toEqual([{ ...legacyBrand, status: 'Active' }]);
    expect(getActiveCatalogBrands().map(brand => brand.id)).toEqual([legacyBrand.id]);
    saveProductCatalogSettings(getProductCatalogSettings());
    expect(getProductCatalogSettings().brands[0]).toEqual({ ...legacyBrand, status: 'Active' });
  });

  it('preserves inactive brands and excludes them from product selection', () => {
    const settings = getProductCatalogSettings();
    const inactive = { ...settings.brands[0], status: 'Inactive' as const };
    saveProductCatalogSettings({ ...settings, brands: [inactive, settings.brands[1]] });

    expect(getProductCatalogSettings().brands[0]).toEqual(inactive);
    expect(getActiveCatalogBrands().map(brand => brand.id)).toEqual([settings.brands[1].id]);
  });
});
