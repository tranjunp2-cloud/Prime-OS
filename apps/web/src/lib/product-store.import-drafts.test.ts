// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Product } from './product-store';

const storageKey = 'primeos-product-master-v5';
const migrationKey = 'primeos-incomplete-import-drafts-v1';
const draftIds = ['prod_import_test_incomplete_02', 'prod_import_imp-003'];
let drafts: Product[];

async function reloadProducts(products: Product[]) {
  window.localStorage.setItem(storageKey, JSON.stringify(products));
  vi.resetModules();
  return (await import('./product-store')).getProducts();
}

beforeEach(async () => {
  window.localStorage.clear();
  vi.resetModules();
  drafts = (await import('./product-store')).getProducts().filter(product => draftIds.includes(product.id));
  window.localStorage.removeItem(migrationKey);
});

afterEach(() => window.localStorage.clear());

describe('incomplete imported Product Master drafts', () => {
  it('seeds both cases as drafts with the missing image issue', () => {
    expect(drafts).toHaveLength(2);
    drafts.forEach(product => {
      expect(product.status).toBe('draft');
      expect(product.import_result).toBe('incomplete');
      expect(product.import_issues).toEqual(['Product image is required']);
    });
  });

  it('repairs and persists the stale published status without changing listing data', async () => {
    const stale = drafts.map(product => ({
      ...product,
      status: 'published' as const,
      channels: [{ ...product.channels[0], status: 'active' as const, last_synced_at: '2026-09-29T10:00:00Z' }],
      channel_overrides: { shopee: { ...product.channel_overrides?.shopee, listing_sku: `${product.sku_code}-SHOP`, stock_quantity: '7' } },
    }));
    const loaded = await reloadProducts(stale);
    stale.forEach(product => {
      const repaired = loaded.find(item => item.id === product.id)!;
      expect(repaired.status).toBe('draft');
      expect(repaired.channels).toEqual(product.channels);
      expect(repaired.channel_overrides).toEqual(product.channel_overrides);
      expect(repaired.import_issues).toEqual(product.import_issues);
    });
    expect(JSON.parse(window.localStorage.getItem(storageKey)!)).toEqual(stale.map(product => ({ ...product, status: 'draft' })));
  });

  it.each(['published', 'restored'] as const)('retains the existing %s revision when resetting the requested demo', async status => {
    const published = drafts.map(product => ({
      ...product,
      status: 'published' as const,
      revisions: [{ id: 'rev-1', number: 1, status, createdAt: '2026-09-28T00:00:00Z', createdBy: 'Seller', summary: 'Published master' }],
    }));
    const loaded = await reloadProducts(published);
    published.forEach(product => {
      const draft = loaded.find(item => item.id === product.id)!;
      expect(draft.status).toBe('draft');
      expect(draft.revisions).toEqual(product.revisions);
    });
    expect(window.localStorage.getItem(migrationKey)).toBe('1');
    // A later publication must not be reset again, even with an incomplete draft.
    const republished = await reloadProducts(published);
    published.forEach(product => {
      expect(republished.find(item => item.id === product.id)?.status).toBe('published');
    });
  });

  it('does not reset completed media or republish state on subsequent reloads', async () => {
    const completed = drafts.map(product => ({
      ...product,
      status: 'published' as const,
      import_result: 'published' as const,
      import_issues: [],
      images: ['/uploaded-product.jpg'],
      image_alt_texts: ['Uploaded product'],
      asin: 'B012345678',
    }));
    const loaded = await reloadProducts(completed);
    completed.forEach(product => {
      expect(loaded.find(item => item.id === product.id)).toMatchObject({
        status: 'published', import_result: 'published', import_issues: [],
        images: product.images, image_alt_texts: product.image_alt_texts, asin: product.asin,
      });
    });
  });

  it('does not change archived or unrelated product statuses', async () => {
    const archived = { ...drafts[0], status: 'archived' as const };
    const unrelated = { ...drafts[1], id: 'seller-created-product', status: 'published' as const };
    const loaded = await reloadProducts([archived, unrelated]);
    expect(loaded.find(product => product.id === archived.id)?.status).toBe('archived');
    expect(loaded.find(product => product.id === unrelated.id)?.status).toBe('published');
  });
});
