// @vitest-environment jsdom
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Product } from './product-store';
import { completeActiveProductDemo } from './active-product-demo';
import { getStoredMasterReadiness } from './product-master-readiness';
import { getProductCatalogSettings } from './product-catalog-settings-store';

const productKey = 'primeos-product-master-v5';
const completedKey = 'primeos-active-demo-completed-v1';
const backupKey = 'primeos-active-demo-before-completion-v1';
beforeEach(() => { localStorage.clear(); vi.resetModules(); });
afterEach(() => { localStorage.clear(); vi.restoreAllMocks(); vi.resetModules(); });

describe('Complete Active prototype data', () => {
  it('ships every Active demo with 100% real readiness and three distinct existing media assets', async () => {
    const { getProducts } = await import('./product-store');
    const active = getProducts().filter(product => product.status === 'published');
    expect(active.length).toBeGreaterThanOrEqual(10);
    for (const product of active) {
      expect(getStoredMasterReadiness(product).missing, product.sku_code).toEqual([]);
      expect(new Set(product.images).size, product.sku_code).toBeGreaterThanOrEqual(3);
      for (const image of product.images) expect(existsSync(resolve(process.cwd(), 'public', image.slice(1))), image).toBe(true);
      expect(product.skus.every(sku => Number(sku.price) > 0), product.sku_code).toBe(true);
    }
    expect(getProductCatalogSettings().attributes.find(attribute => attribute.key === 'material')?.options.split(',').map(option => option.trim())).toContain('Paper');
  });

  it('leaves draft, review, archived and non-fixture products untouched', async () => {
    const { getProducts } = await import('./product-store');
    for (const product of getProducts().filter(product => product.status !== 'published')) expect(completeActiveProductDemo(product)).toBe(product);
    const seed = getProducts().find(product => product.status === 'published')!;
    for (const patch of [{ id: 'user-created-active' }, { sku_code: 'CUSTOM-SKU' }, { status: 'draft' }, { status: 'review' }, { status: 'archived' }]) {
      const product = { ...seed, ...patch, images: [] } as Product;
      expect(completeActiveProductDemo(product)).toBe(product);
    }
  });

  it('preserves user content, taxonomy, prices and existing stock while filling missing fixture data', async () => {
    const { getProductById } = await import('./product-store');
    const product: Product = { ...getProductById('prod_demo_bag')!, images: ['/my-upload.jpg'], image_alt_texts: ['My custom photo'],
      description: 'User-owned product description. '.repeat(6), retail_price: 7777, inventory: { 'my-warehouse': 83 },
      specifications: [{ attributeKey: 'color', name: 'Color', value: 'Blue' }, { name: 'Custom field', value: 'Keep this' }] };
    const completed = completeActiveProductDemo(product);
    expect(completed.images[0]).toBe('/my-upload.jpg');
    expect(completed.image_alt_texts?.[0]).toBe('My custom photo');
    expect(completed.specifications).toEqual(expect.arrayContaining(product.specifications!));
    expect(completed).toMatchObject({ description: product.description, retail_price: 7777, inventory: product.inventory, categoryId: product.categoryId, status: 'published' });
    expect(completeActiveProductDemo(completed)).toBe(completed);
    expect(product.images).toEqual(['/my-upload.jpg']);
  });

  it('repairs the resolved Active brush example without changing the separate review/stock-risk example', async () => {
    const { getProductById } = await import('./product-store');
    const review = getProductById('prod_import_test_review_02')!;
    const resolved = { ...getProductById('prod_import_review_demo')!, status: 'published' as const, import_result: 'published' as const, import_issues: [], inventory: { wh_crjp: 7, wh_rslsg: 3, wh_fbsmy: 2 } };
    const completed = completeActiveProductDemo(resolved);
    expect(getStoredMasterReadiness(completed).missing).toEqual([]);
    expect(Object.values(completed.inventory).reduce((sum, value) => sum + value, 0)).toBe(72);
    expect(completed.channels.every(listing => listing.status === 'active')).toBe(true);
    expect(completed.channels.map(listing => listing.external_id)).toEqual(resolved.channels.map(listing => listing.external_id));
    expect(completeActiveProductDemo(review)).toBe(review);
    expect(review.channels.some(listing => listing.status === 'pending')).toBe(true);
  });

  it('migrates stored Active fixtures once, keeps a backup and never refills later user edits', async () => {
    let store = await import('./product-store');
    const active = { ...store.getProductById('prod_demo_electronics')!, images: ['/images/products/B0G432Z31H/1.jpg'], description: 'Old short demo description', specifications: [] };
    const draft = { ...store.getProductById('prod_005')!, name: 'User-edited draft' };
    const archived = { ...active, id: 'archived-user-product', status: 'archived' };
    localStorage.setItem(productKey, JSON.stringify([active, draft, archived]));
    localStorage.removeItem(completedKey);
    vi.resetModules(); store = await import('./product-store');
    expect(getStoredMasterReadiness(store.getProductById(active.id)!).ready).toBe(true);
    expect(JSON.parse(localStorage.getItem(backupKey)!)).toEqual([active]);
    const stored = JSON.parse(localStorage.getItem(productKey)!) as Product[];
    expect(stored.find(product => product.id === draft.id)).toEqual(draft);
    expect(stored.find(product => product.id === archived.id)).toEqual(archived);
    store.updateProduct(active.id, { id: active.id, images: [] });
    vi.resetModules(); store = await import('./product-store');
    expect(store.getProductById(active.id)?.images).toEqual([]);
    expect(getStoredMasterReadiness(store.getProductById(active.id)!).ready).toBe(false);
    expect(JSON.parse(localStorage.getItem(backupKey)!)).toEqual([active]);
  });
});
