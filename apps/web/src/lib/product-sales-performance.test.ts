import { describe, expect, it } from 'vitest';
import { demoProductSales, salesChange, salesShopsForProduct, salesWindow, summarizeProductSales, type ProductSalesData, type ProductSalesLine, type SalesShop } from './product-sales-performance';

const now = new Date('2026-10-05T19:45:00Z');
const shop = (id = 'shop-a', extra: Partial<SalesShop> = {}): SalesShop => ({ id, name: id, channel: 'amazon', coveredFrom: '2026-04-01T00:00:00Z', coveredUntil: '2026-10-05T00:00:00Z', updatedAt: '2026-10-05T01:00:00Z', ...extra });
const line = (id: string, extra: Partial<ProductSalesLine> = {}): ProductSalesLine => ({ id, orderId: 'order-1', productId: 'master-1', shopId: 'shop-a', listingId: 'listing-1', sku: 'BRUSH-PACK-12', quantity: 2, completedAt: '2026-10-04T12:00:00Z', status: 'completed', ...extra });
const summarize = (lines: ProductSalesLine[], shops = [shop()]) => summarizeProductSales('master-1', { demo: false, shops, lines }, 30, now);

describe('Product sales performance', () => {
  it('uses complete UTC days and an equal previous period', () => {
    const range = salesWindow(30, now);
    expect(new Date(range.start).toISOString()).toBe('2026-09-05T00:00:00.000Z');
    expect(new Date(range.end).toISOString()).toBe('2026-10-05T00:00:00.000Z');
    expect(range.start - range.previousStart).toBe(range.end - range.start);
  });
  it('uses sale-time product IDs, ignores other products with the same SKU, pending, cancelled and invalid quantities', () => {
    const result = summarize([line('good'), line('other', { productId: 'master-2' }), line('cancelled', { status: 'cancelled' }), line('pending', { status: 'pending' }), line('bad', { quantity: -2 }), line('nan', { quantity: NaN }), line('fraction', { quantity: 1.5 })]);
    expect(result.units).toBe(2);
    expect(result.orders).toBe(1);
  });
  it('deduplicates imported lines and orders while summing variants without multiplying pack size', () => {
    const result = summarize([line('one'), line('one'), line('two', { sku: 'BRUSH-RED', quantity: 3 }), line('other-shop', { shopId: 'shop-b', quantity: 1 })], [shop(), shop('shop-b')]);
    expect(result.units).toBe(6);
    expect(result.orders).toBe(2); // Same order ID at two shops is not the same order.
    expect(result.rows[0].orders).toBe(1);
  });
  it('honors start-inclusive, end-exclusive completion dates', () => {
    const result = summarize([line('start', { completedAt: '2026-09-05T00:00:00Z' }), line('end', { completedAt: '2026-10-05T00:00:00Z' }), line('before', { completedAt: '2026-09-04T23:59:59Z' }), line('invalid', { completedAt: 'not-a-date' })]);
    expect(result.units).toBe(2);
    expect(result.rows[0].previousUnits).toBe(2);
  });
  it('ranks shops separately within the same channel and sorts by units', () => {
    const result = summarize([line('one'), line('two', { shopId: 'shop-b', quantity: 8 })], [shop(), shop('shop-b')]);
    expect(result.rows.map(row => row.id)).toEqual(['shop-b', 'shop-a']);
    expect(result.leaders.map(row => row.id)).toEqual(['shop-b']);
  });
  it('does not rank, compare or include incomplete shops in totals', () => {
    const result = summarize([line('one'), line('two', { shopId: 'shop-b', quantity: 800 })], [shop(), shop('shop-b', { coveredFrom: '2026-10-01T00:00:00Z' }), shop('missing', { coveredFrom: null, coveredUntil: null })]);
    expect(result.completeShops).toBe(1);
    expect(result.units).toBe(2);
    expect(result.rows.map(row => row.coverage)).toEqual(['complete', 'partial', 'unavailable']);
    expect(result.rows[1].change).toBeNull();
    expect(result.leaders[0].id).toBe('shop-a');
  });
  it('distinguishes zero sales from unavailable coverage, and has no zero-sales winner', () => {
    const empty = summarize([]);
    expect(empty.completeShops).toBe(1);
    expect(empty.units).toBe(0);
    expect(empty.leaders).toEqual([]);
    expect(summarize([], [shop('missing', { coveredFrom: null })]).completeShops).toBe(0);
  });
  it('reports tied leaders instead of arbitrarily picking one', () => {
    expect(summarize([line('one'), line('two', { shopId: 'shop-b' })], [shop(), shop('shop-b')]).leaders).toHaveLength(2);
  });
  it('only compares complete periods with nonzero baselines', () => {
    expect(salesChange(2, 0, true)).toBeNull();
    expect(salesChange(2, 1, false)).toBeNull();
    expect(salesChange(0, 2, true)).toBe(-100);
    expect(summarize([line('one'), line('prior', { completedAt: '2026-08-20T12:00:00Z', quantity: 1 })]).change).toBe(100);
    expect(summarize([line('one')], [shop('shop-a', { coveredFrom: '2026-09-05T00:00:00Z' })]).change).toBeNull();
  });
  it('reports the oldest complete-shop update and does not invent missing timestamps', () => {
    expect(summarize([], [shop(), shop('b', { updatedAt: '2026-10-05T00:30:00Z' })]).updatedAt).toBe('2026-10-05T00:30:00.000Z');
    expect(summarize([], [shop(), shop('b', { updatedAt: null })]).updatedAt).toBeNull();
  });
  it('keeps demo examples deterministic, isolated and period-sensitive', () => {
    const product = { id: 'master-1', sku_code: 'PACK', channels: [{ channel: 'amazon' as const, external_id: 'listing-a', store_name: 'Shop A', status: 'draft' as const, listing_url: null, last_synced_at: null }] };
    const before = JSON.stringify(product);
    const demo: ProductSalesData = demoProductSales(product, now);
    expect(demo.demo).toBe(true);
    expect(demo).toEqual(demoProductSales(product, now));
    const small = summarizeProductSales(product.id, demo, 7, now);
    const large = summarizeProductSales(product.id, demo, 90, now);
    expect(large.units).toBeGreaterThan(small.units);
    expect(large.completeShops).toBe(1);
    expect(JSON.stringify(product)).toBe(before);
    expect(salesShopsForProduct(product)[0].coveredFrom).toBeNull();
  });
  it('groups named demo shops but never combines unnamed shops by channel alone', () => {
    const listing = { channel: 'amazon' as const, external_id: null, status: 'active' as const, listing_url: null, last_synced_at: null };
    expect(salesShopsForProduct({ channels: [listing, { ...listing }] })).toHaveLength(2);
    expect(salesShopsForProduct({ channels: [{ ...listing, store_name: 'A' }, { ...listing, store_name: 'A' }] })).toHaveLength(1);
    expect(salesShopsForProduct(undefined)).toEqual([]);
  });
});
