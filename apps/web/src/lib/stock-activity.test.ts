import { describe, expect, it } from 'vitest';
import { getProducts } from './product-store';
import { createStockActivitySource, defaultActivityFilters } from './stock-activity';
import type { StockHoldChange } from './stock-hold-history';

const now = new Date('2026-09-30T12:00:00');
const warehouses = [{ id: 'wh_crjp', name: 'Japan' }, { id: 'wh_rslsg', name: 'Singapore' }];
const product = { ...getProducts()[0], id: 'activity-product', name: 'Brush Set', sku_code: 'BRUSH', inventory_adjustments: [
  { id: 'adjust-new', warehouseId: 'wh_crjp', sku: 'BRUSH', before: 8, after: 10, reason: 'Physical count', createdAt: '2026-09-30T09:00:00' },
  { id: 'adjust-old', warehouseId: 'wh_crjp', sku: 'BRUSH', before: null, after: 8, reason: 'Initial count', createdAt: '2026-07-01T09:00:00' },
], inventory_transfers: [{ id: 'move-1', sku: 'BRUSH', fromWarehouseId: 'wh_crjp', toWarehouseId: 'wh_rslsg', quantity: 2, fromBefore: 10, fromAfter: 8, toBefore: null, toAfter: 2, createdAt: '2026-09-30T10:00:00' }] };
const holds: StockHoldChange[] = [
  { id: 'held-1', productId: product.id, skuId: 'brush', sku: 'BRUSH', warehouseId: 'wh_crjp', kind: 'campaign_lock', before: 0, after: 4, note: 'Campaign', createdAt: '2026-09-30T11:00:00' },
  { id: 'released-1', productId: product.id, skuId: 'brush', sku: 'BRUSH', warehouseId: 'wh_crjp', kind: 'campaign_lock', before: 4, after: 1, note: '', createdAt: '2026-09-30T11:30:00' },
];
const source = createStockActivitySource([product], holds, warehouses);
describe('stock activity source', () => {
  it('merges saved records newest first and excludes older activity by default', () => {
    const result = source.query(defaultActivityFilters, 1, null, now);
    expect(result.items.map(item => item.id)).toEqual(['released-1', 'held-1', 'move-1', 'adjust-new']);
    expect(result.allTotal).toBe(5);
    expect(result.items[0]).toMatchObject({ type: 'release', quantity: 3 });
    expect(result.items[2]).toMatchObject({ type: 'transfer', quantity: 2, destinationBefore: null, warehouseNames: ['Japan', 'Singapore'] });
    expect(source.query({ ...defaultActivityFilters, period: 'all' }, 1, null, now).items.at(-1)).toMatchObject({ before: null, after: 8 });
  });
  it('combines search/type/warehouse filters and matches both ends of a transfer', () => {
    const filters = { ...defaultActivityFilters, search: 'brush move-1', type: 'transfer' as const };
    for (const warehouseId of ['wh_crjp', 'wh_rslsg']) expect(source.query({ ...filters, warehouseId }, 1, null, now).total).toBe(1);
    expect(source.query({ ...filters, type: 'adjustment' }, 1, null, now).total).toBe(0);
  });
  it('uses inclusive calendar dates and rejects reversed ranges', () => {
    expect(source.query({ ...defaultActivityFilters, period: 'custom', from: '2026-09-30', to: '2026-09-30' }, 1, null, now).total).toBe(4);
    expect(source.query({ ...defaultActivityFilters, period: 'custom', from: '2026-10-01', to: '2026-09-30' }, 1, null, now)).toMatchObject({ total: 0, invalidDateRange: true });
  });
  it('returns only 25 records with stable boundaries for a large history', () => {
    const large = createStockActivitySource([{ ...product, inventory_transfers: [], inventory_adjustments: Array.from({ length: 10001 }, (_, index) => ({ ...product.inventory_adjustments[0], id: `record-${String(index).padStart(5, '0')}` })) }], [], warehouses);
    const first = large.query(defaultActivityFilters, 1, null, now);
    const second = large.query(defaultActivityFilters, 2, null, now);
    expect(first).toMatchObject({ total: 10001, pages: 401, page: 1 });
    expect(first.items).toHaveLength(25);
    expect(second.items).toHaveLength(25);
    expect(first.items.some(item => second.items.some(other => other.id === item.id))).toBe(false);
    expect(large.query(defaultActivityFilters, 999, null, now)).toMatchObject({ page: 401, items: [expect.objectContaining({ id: 'record-00000' })] });
  });
  it('finds a saved record without silently changing filters', () => {
    expect(source.query({ ...defaultActivityFilters, type: 'transfer' }, 1, 'adjust-new', now)).toMatchObject({ focusHidden: true, total: 1 });
    expect(source.query(defaultActivityFilters, 99, 'adjust-new', now)).toMatchObject({ focusHidden: false, page: 1 });
  });
});
