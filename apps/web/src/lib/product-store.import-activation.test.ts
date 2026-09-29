// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Product } from './product-store';

const storageKey = 'primeos-product-master-v5';
let readyProduct: Product;

async function loadStored(product: Product) {
  window.localStorage.setItem(storageKey, JSON.stringify([product]));
  vi.resetModules();
  const store = await import('./product-store');
  return { store, product: store.getProductById(product.id)! };
}

beforeEach(async () => {
  window.localStorage.clear();
  vi.resetModules();
  const store = await import('./product-store');
  readyProduct = { ...store.getProductById('prod_import_ready_demo')!, status: 'draft' };
});

afterEach(() => window.localStorage.clear());

describe('automatic activation after a successful import', () => {
  it.each(['ready', 'published'] as const)('activates and persists a validated %s import without changing its listings', async import_result => {
    const input: Product = {
      ...readyProduct,
      import_result,
      channels: [{ ...readyProduct.channels[0], status: 'pending', external_id: 'SELLER-LZD-SKU' }],
      channel_overrides: { lazada: { enabled: true, title: 'Seller listing title', description: 'Seller content', price_markup: 5, stock_quantity: '18', sync_policy: 'manual' } },
    };
    const { product } = await loadStored(input);
    expect(product).toMatchObject({ status: 'published', import_result: 'published' });
    expect(product.channels).toEqual(input.channels);
    expect(product.channel_overrides).toEqual(input.channel_overrides);
    expect(product.images).toEqual(input.images);
    expect(product.revisions).toHaveLength(1);
    expect(product.revisions?.[0].summary).toBe('Activated automatically after import validation');

    const persisted: Product[] = JSON.parse(window.localStorage.getItem(storageKey)!);
    expect(persisted.find(item => item.id === input.id)?.status).toBe('published');
    vi.resetModules();
    const reloaded = (await import('./product-store')).getProductById(input.id)!;
    expect(reloaded.status).toBe('published');
    expect(reloaded.revisions).toEqual(product.revisions);
  });

  it('activates immediately on import creation and on clearing the final missing-data issue', async () => {
    const store = await import('./product-store');
    const id = 'new-validated-import';
    store.addProduct({ ...readyProduct, id, import_result: 'ready' });
    expect(store.getProductById(id)?.status).toBe('published');

    const draftId = 'incomplete-import';
    store.addProduct({ ...readyProduct, id: draftId, import_result: 'incomplete', import_issues: ['Product image is required'] });
    expect(store.getProductById(draftId)?.status).toBe('draft');
    store.updateProduct(draftId, { id: draftId, import_result: 'ready', import_issues: [] });
    expect(store.getProductById(draftId)?.status).toBe('published');
    expect(store.getProductById(draftId)?.revisions).toHaveLength(1);
  });

  it.each([
    { import_result: 'incomplete', import_issues: ['Product image is required'] },
    { import_result: 'needs_review', import_issues: ['Variant mapping requires review'] },
    { import_result: 'matched', import_issues: [] },
    { import_result: 'ready', import_issues: ['Unresolved import issue'] },
    { import_result: 'published', import_issues: ['Unresolved import issue'] },
    { import_result: undefined, import_issues: [] },
  ] satisfies Partial<Product>[])('leaves unapproved imports and manual drafts unchanged: $import_result', async overrides => {
    const input = { ...readyProduct, id: 'not-approved', ...overrides };
    const { product } = await loadStored(input);
    expect(product.status).toBe('draft');
    expect(product.revisions).toEqual([]);
  });

  it('does not reactivate archived products', async () => {
    const { product } = await loadStored({ ...readyProduct, status: 'archived', import_result: 'ready' });
    expect(product.status).toBe('archived');
    expect(product.revisions).toEqual([]);
  });

  it('retains existing revisions when activating and does not add revisions on ordinary edits', async () => {
    const oldRevision = { id: 'rev-old', number: 3, status: 'published' as const, createdAt: '2026-09-28T00:00:00Z', createdBy: 'Seller', summary: 'Earlier revision' };
    const { store, product } = await loadStored({ ...readyProduct, revisions: [oldRevision] });
    expect(product.revisions).toHaveLength(2);
    expect(product.revisions?.[0]).toEqual(oldRevision);
    expect(product.revisions?.[1].number).toBe(4);
    store.updateProduct(product.id, { id: product.id, name: 'Updated name' });
    expect(store.getProductById(product.id)?.revisions).toEqual(product.revisions);
  });
});
