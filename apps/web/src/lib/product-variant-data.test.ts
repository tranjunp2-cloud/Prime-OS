// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { getAttributesForCategory } from './product-catalog-settings-store';
import { getProducts } from './product-store';

describe('Product Master variant demo data', () => {
  it('gives every configurable Product Master canonical variant option metadata', () => {
    const configurableProducts = getProducts().filter(product => product.has_variants);

    expect(configurableProducts.length).toBeGreaterThan(0);
    configurableProducts.forEach(product => {
      expect(product.variant_options?.length, product.id).toBeGreaterThan(0);
      product.variant_options?.forEach(option => {
        expect(option.attributeKey, product.id).not.toBe('');
        expect(option.name, product.id).not.toMatch(/^Option \d+$/);
        expect(option.values.length, `${product.id}:${option.name}`).toBeGreaterThan(0);
      });
    });
  });

  it('keeps every SKU matrix value inside its canonical option dimension', () => {
    getProducts().filter(product => product.has_variants).forEach(product => {
      product.skus.forEach(sku => {
        const values = sku.variation_name.split('/').map(value => value.trim()).filter(Boolean);
        values.forEach((value, index) => {
          expect(product.variant_options?.[index]?.values, `${product.id}:${sku.sku_code}`).toContain(value);
        });
      });
    });
  });

  it('exposes each seeded option dimension through its product category', () => {
    getProducts().filter(product => product.has_variants).forEach(product => {
      const categoryKeys = getAttributesForCategory(product.category).map(attribute => attribute.key);
      product.variant_options?.forEach(option => expect(categoryKeys, `${product.id}:${product.category}`).toContain(option.attributeKey));
    });
  });
});
