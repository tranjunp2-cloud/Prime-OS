// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { assignedCategoryAttributes, categoryConfigurationImpact, categorySchemaDiff, reconcileSpecifications, retainedSpecifications, serializeSpecifications } from './category-schema';
import { getAttributesForCategory, getProductCatalogSettings, resolveCatalogCategory, saveProductCatalogSettings } from './product-catalog-settings-store';
import type { Product } from './product-store';

beforeEach(() => localStorage.clear());

describe('category schema safeguards', () => {
  it('does not resurrect removed assignments or deleted categories after saving', () => {
    const settings = getProductCatalogSettings();
    const shoe = settings.categories.find(category => category.id === 'shoe')!;
    saveProductCatalogSettings({ ...settings, categories: [{ ...shoe, parentId: null, attributes: [] }] });
    const reloaded = getProductCatalogSettings();
    expect(reloaded.categories).toHaveLength(1);
    expect(getAttributesForCategory('Shoe', 'shoe')).toEqual([]);
  });

  it('migrates old taxonomy shape without restoring removed attributes', () => {
    const settings = getProductCatalogSettings();
    const shoe = settings.categories.find(category => category.id === 'shoe')!;
    localStorage.setItem('prime-product-catalog-settings-v2', JSON.stringify({ ...settings, taxonomyVersion: undefined, categories: [{ ...shoe, attributes: [] }] }));
    expect(getProductCatalogSettings().categories.find(category => category.id === 'shoe')?.attributes).toEqual([]);
  });

  it('uses IDs across renames and never guesses an ambiguous name or a deleted ID', () => {
    const settings = getProductCatalogSettings();
    const original = settings.categories.find(category => category.id === 'shoe')!;
    const renamed = { ...original, name: 'Footwear' };
    expect(resolveCatalogCategory({ category: 'Shoe', categoryId: 'shoe' }, [renamed])).toBe(renamed);
    expect(resolveCatalogCategory({ category: 'Footwear' }, [renamed])?.id).toBe('shoe');
    expect(resolveCatalogCategory({ category: 'Footwear' }, [renamed, { ...renamed, id: 'duplicate' }])).toBeUndefined();
    expect(resolveCatalogCategory({ category: 'Footwear', categoryId: 'deleted' }, [renamed])).toBeUndefined();
  });

  it('retains custom values and colliding names while switching away and back', () => {
    const settings = getProductCatalogSettings();
    const shoe = settings.categories.find(category => category.id === 'shoe')!;
    const attributes = assignedCategoryAttributes(shoe, settings.attributes);
    const existing = [
      { attributeKey: 'material', name: 'Material', value: 'Cotton' },
      { attributeKey: 'legacy_material', name: 'Material', value: 'Preserve me' },
      { name: 'Custom note', value: 'Keep exactly  ' },
    ];
    const create = (attribute: { key: string; name: string }) => ({ attributeKey: attribute.key, name: attribute.name, value: '' });
    const switched = reconcileSpecifications(existing, [], create);
    expect(serializeSpecifications(switched)).toEqual(existing);
    const restored = reconcileSpecifications(switched, attributes, create);
    expect(restored.find(spec => spec.attributeKey === 'material')?.value).toBe('Cotton');
    expect(retainedSpecifications(restored, attributes)).toEqual(existing.slice(1));
    expect(restored.filter(spec => spec.attributeKey === 'material')).toHaveLength(1);
  });

  it('counts direct users and newly missing fields only, including variant values', () => {
    const settings = getProductCatalogSettings();
    const before = { ...settings.categories.find(category => category.id === 'shoe')!, attributes: [{ key: 'color', required: false }] };
    const after = { ...before, attributes: [{ key: 'color', required: true }] };
    const child = { ...before, id: 'child', parentId: before.id, name: 'Child category' };
    const product = (id: string, patch: Partial<Product> = {}) => ({ id, name: id, category: before.name, categoryId: before.id, specifications: [], ...patch } as Product);
    const products = [product('missing'), product('filled', { specifications: [{ attributeKey: 'color', name: 'Color', value: 'Blue' }] }), product('variants', { has_variants: true, variant_options: [{ attributeKey: 'color', name: 'Color', values: ['Red'] }] }), product('child-product', { categoryId: child.id })];
    const snapshot = JSON.stringify(products);
    const impact = categoryConfigurationImpact(before, after, [before, child], settings.attributes, products);
    expect(impact.affected).toHaveLength(3);
    expect(impact.newlyIncomplete.map(item => item.product.id)).toEqual(['missing']);
    expect(impact.newlyIncomplete[0].missing.map(attribute => attribute.key)).toEqual(['color']);
    expect(JSON.stringify(products)).toBe(snapshot);
    expect(categorySchemaDiff(after, before)).toMatchObject({ optional: ['color'], required: [] });
  });
});
