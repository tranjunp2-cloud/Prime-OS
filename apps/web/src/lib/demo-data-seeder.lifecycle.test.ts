// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { localStorage.clear(); vi.resetModules(); });
describe('operational demo data isolation', () => {
  it('seeds channel lifecycle independently of Master lifecycle', async () => {
    localStorage.clear(); vi.resetModules();
    const store = await import('./product-store');
    const product = store.getProductById('prod_001')!;
    store.updateProduct(product.id, { id: product.id, status: 'draft', import_result: undefined });
    const { seedDemoData } = await import('./demo-data-seeder');
    await seedDemoData();
    const { getListingsBySku } = await import('./listing-store');
    expect(getListingsBySku(product.skus[0].id).filter(listing => listing.channel === 'amazon').every(listing => listing.status === 'published')).toBe(true);
    const localDraft = store.getProductById('prod_005')!;
    const draftListings = getListingsBySku(localDraft.skus[0].id);
    expect(draftListings.length).toBeGreaterThan(0);
    expect(draftListings.every(listing => listing.status === 'draft' && listing.published_at === null)).toBe(true);
  });

  it('does not invent orders or inventory for a user-created unused master', async () => {
    localStorage.clear(); vi.resetModules();
    const store = await import('./product-store');
    const product = { ...store.getProducts()[0], id: 'user-created-unused', sku_code: 'USER-UNUSED-SKU', status: 'archived' as const,
      has_variants: false, inventory: { wh_crjp: 0 }, skus: [], channels: [], channel_overrides: {}, import_result: undefined };
    store.addProduct(product);
    const { seedDemoData } = await import('./demo-data-seeder');
    expect(await seedDemoData()).toEqual({ success: true });
    const { getAllOrderItems } = await import('./order-store');
    const { getInventoryPositions } = await import('./inventory-store');
    const { productDeletionBlockers } = await import('./product-lifecycle');
    expect(getAllOrderItems().length).toBeGreaterThan(0);
    expect(getAllOrderItems().some(item => item.sku === product.sku_code)).toBe(false);
    expect(getInventoryPositions().length).toBeGreaterThan(0);
    expect(getInventoryPositions().some(item => item.product_id === product.id)).toBe(false);
    expect(productDeletionBlockers(store.getProductById(product.id)!)).toEqual([]);
  });
});
