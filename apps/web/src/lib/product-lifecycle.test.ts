// @vitest-environment jsdom
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { addProduct, deleteProduct, getProductById, getProducts, updateProduct, type Product } from './product-store';
import { performProductLifecycleAction, productDeletionBlockers } from './product-lifecycle';
import { _seedOrderItems } from './order-store';
import { addInventoryPosition, clearInventoryStore } from './inventory-store';
import { STOCK_HOLD_STORAGE_KEY } from './stock-hold-history';

let id: string;
let product: Product;
beforeEach(() => {
  id = `lifecycle-unit-${crypto.randomUUID()}`;
  clearInventoryStore(); _seedOrderItems([]); localStorage.removeItem(STOCK_HOLD_STORAGE_KEY);
  product = { ...getProducts()[0], id, sku_code: 'LIFECYCLE-UNIT', status: 'draft', channels: [], channel_overrides: {}, inventory: {}, skus: [],
    inventory_adjustments: [], inventory_transfers: [], associations: [], revisions: [], import_result: undefined, import_issues: [] };
  addProduct(product);
});
afterEach(() => { vi.restoreAllMocks(); deleteProduct(id); deleteProduct('lifecycle-ref'); clearInventoryStore(); _seedOrderItems([]); localStorage.removeItem(STOCK_HOLD_STORAGE_KEY); });

describe('Product lifecycle guards', () => {
  it.each(['draft', 'archived'] as const)('deletes an unused %s product without requiring readiness', status => {
    updateProduct(id, { id, status, name: '', images: [], description: '' });
    expect(productDeletionBlockers(getProductById(id)!)).toEqual([]);
    performProductLifecycleAction(id, 'delete');
    expect(getProductById(id)).toBeUndefined();
  });
  it('blocks both configured listing drafts and linked listings', () => {
    updateProduct(id, { id, channels: [{ channel: 'shopee', external_id: 'linked', status: 'pending', listing_url: null, last_synced_at: null }] });
    expect(() => performProductLifecycleAction(id, 'delete')).toThrow(/listings/);
    updateProduct(id, { id, channels: [], channel_overrides: { shopee: { enabled: true, title: '', description: '', price_markup: 0 } } });
    expect(() => performProductLifecycleAction(id, 'delete')).toThrow(/listings/);
  });
  it('blocks stock at any location rather than relying on a net total', () => {
    updateProduct(id, { id, inventory: { a: 5, b: -5 } });
    expect(() => performProductLifecycleAction(id, 'delete')).toThrow(/Stock/);
  });
  it.each([{ stock_by_location: { a: 2 } }, { stock: 2 }])('blocks variant stock even when Master inventory is empty (%j)', stock => {
    updateProduct(id, { id, has_variants: true, skus: [{ id: 'child', sku_code: 'CHILD', variation_name: 'Child', price: 0, weight_g: 0, units_per_carton: 1, status: 'active', ...stock }] });
    expect(() => performProductLifecycleAction(id, 'delete')).toThrow(/Stock/);
  });
  it('blocks reserved inventory and inbound quantities', () => {
    addInventoryPosition({ id: 'position', product_id: id, sku_id: 'child', warehouse_id: 'a', on_hand: 0, reserved_unpaid: 0, reserved_paid: 1, allocated: 0, inbound: 3, outbound: 0, unfulfillable: 0, return_pending: 0, safety_stock: 0, campaign_lock: 0, version: 1, updated_at: '' });
    expect(() => performProductLifecycleAction(id, 'delete')).toThrow(/reserved/);
  });
  it('blocks historical orders including child SKUs', () => {
    updateProduct(id, { id, skus: [{ id: 'child', sku_code: 'CHILD-ORDER', variation_name: 'Child', price: 0, weight_g: 0, units_per_carton: 1, status: 'inactive', stock_by_location: {} }] });
    _seedOrderItems([{ id: 'item', order_id: 'old-order', sku: 'child-order', product_name: '', quantity: 1, price_per_unit: 0, created_at: '' }]);
    expect(() => performProductLifecycleAction(id, 'delete')).toThrow(/orders/);
  });
  it('retains zero-stock products with inventory history', () => {
    updateProduct(id, { id, inventory_adjustments: [{ id: 'adjust', warehouseId: 'a', sku: product.sku_code, before: 1, after: 0, reason: 'Count', createdAt: '' }] });
    expect(() => performProductLifecycleAction(id, 'delete')).toThrow(/inventory history/);
  });
  it('fails closed when hold history cannot be verified', () => {
    localStorage.setItem(STOCK_HOLD_STORAGE_KEY, '{broken');
    expect(() => performProductLifecycleAction(id, 'delete')).toThrow(/could not be checked/);
  });
  it('preserves references from other products', () => {
    addProduct({ ...product, id: 'lifecycle-ref', associations: [{ productId: id, type: 'related' }] });
    expect(() => performProductLifecycleAction(id, 'delete')).toThrow(/Other products/);
  });
  it('requires archiving an Active product first and preserves listing data', () => {
    updateProduct(id, { id, status: 'published' });
    expect(() => performProductLifecycleAction(id, 'delete')).toThrow(/Archive/);
    performProductLifecycleAction(id, 'archive');
    expect(getProductById(id)?.status).toBe('archived');
    expect(getProductById(id)?.channels).toEqual(product.channels);
  });
  it('restores validated imports to Draft and keeps Draft across saves and reload', async () => {
    updateProduct(id, { id, status: 'archived', import_result: 'published' });
    performProductLifecycleAction(id, 'restore');
    const restored = getProductById(id)!;
    expect(restored.status).toBe('draft');
    expect(restored.import_result).toBe('published');
    updateProduct(id, { id, name: 'Changed draft' });
    addProduct(getProductById(id)!);
    expect(getProductById(id)?.status).toBe('draft');
    expect(getProductById(id)?.import_activation_paused).toBe(true);
    vi.resetModules();
    const reloaded = await import('./product-store');
    expect(reloaded.getProductById(id)?.status).toBe('draft');
    expect(reloaded.getProductById(id)?.import_result).toBe('published');
  });
  it('does not remove a product when persistence fails', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage full'); });
    expect(() => performProductLifecycleAction(id, 'delete')).toThrow('Storage full');
    expect(getProductById(id)).toBeDefined();
  });
});
