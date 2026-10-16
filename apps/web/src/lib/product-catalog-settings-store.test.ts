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
    expect(attributes.some(attribute => attribute.required)).toBe(false);
  });

  it('suggests removable attributes for every demo category, including Material in Art Supplies', () => {
    expect(getProductCatalogSettings().categories.flatMap(category => category.attributes).every(attribute => !attribute.required)).toBe(true);
    expect(getAttributesForCategory('Art Supplies').find(attribute => attribute.key === 'material')?.required).toBe(false);
  });

  it('migrates old seed requirements without losing catalog options, mappings or selected product values', () => {
    const settings = getProductCatalogSettings();
    const art = settings.categories.find(category => category.id === 'art-supplies')!;
    art.attributes[0].required = true;
    const shoe = settings.categories.find(category => category.id === 'shoe')!;
    shoe.attributes.slice(0, 2).forEach(attribute => { attribute.required = true; });
    settings.attributes[0].options += ', Handmade';
    localStorage.setItem('prime-product-catalog-settings-v2', JSON.stringify({ ...settings, attributeRequirementsVersion: undefined }));
    localStorage.setItem('primeos-product-master-v5', 'existing product values');

    const migrated = getProductCatalogSettings();
    expect(migrated.categories.find(category => category.id === art.id)).toEqual({ ...art, attributes: art.attributes.map(attribute => ({ ...attribute, required: false })) });
    expect(getAttributesForCategory('Shoe').every(attribute => !attribute.required)).toBe(true);
    expect(migrated.attributes[0].options).toContain('Handmade');
    expect(localStorage.getItem('primeos-product-master-v5')).toBe('existing product values');
    saveProductCatalogSettings(migrated);
    expect(getProductCatalogSettings()).toEqual(migrated);
  });

  it('preserves customized legacy category rules instead of resetting all requirements', () => {
    const settings = getProductCatalogSettings();
    const art = settings.categories.find(category => category.id === 'art-supplies')!;
    art.attributes = [{ key: 'material', required: true }, { key: 'color', required: true }];
    settings.categories.push({ ...art, id: 'custom-art', name: 'Custom art', attributes: [{ key: 'material', required: true }] });
    localStorage.setItem('prime-product-catalog-settings-v2', JSON.stringify({ ...settings, attributeRequirementsVersion: undefined }));
    expect(getAttributesForCategory('Art Supplies').every(attribute => attribute.required)).toBe(true);
    expect(getAttributesForCategory('Custom art')[0].required).toBe(true);
  });

  it('honors explicitly saved required rules, including rules identical to an old seed', () => {
    const settings = getProductCatalogSettings();
    settings.categories.find(category => category.id === 'art-supplies')!.attributes[0].required = true;
    saveProductCatalogSettings(settings);
    expect(getAttributesForCategory('Art Supplies').find(attribute => attribute.key === 'material')?.required).toBe(true);
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
