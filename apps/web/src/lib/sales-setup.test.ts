import { describe, expect, it } from 'vitest';
import { buildSalesSetup, type SalesSetupFacts } from './sales-setup';
import type { ConnectedChannelRecord } from './channel-integrations-api';
const empty: SalesSetupFacts = { productCount: 0, warehouseIds: [], channels: [] };
const shop: ConnectedChannelRecord = { id: 'shop', platform: 'shopee', name: 'Shopee', store_name: 'My shop', region: 'VN', type: 'Marketplace', status: 'CONNECTED', synced_listings: 0, sync_progress: 100, warehouse: { id: 'wh', name: 'Warehouse', code: 'WH', city: 'HCM' }, sync_services: { price: false, stock: false, orders: true }, errors: 0, last_sync_at: '2026-10-13T05:00:00Z' };

describe('Contextual sales setup', () => {
  it('lets exploration stay optional without a misleading 100% completed state', () => {
    expect(buildSalesSetup('later', false, empty)).toMatchObject({ steps: [], completed: 0, complete: false, next: null });
  });
  it('finishes the manual path after saving a product without requiring any shop', () => {
    expect(buildSalesSetup('manual', false, empty).next?.target_url).toBe('/products/new');
    expect(buildSalesSetup('manual', false, { ...empty, productCount: 1 })).toMatchObject({ complete: true, completed: 1 });
  });
  it('does not count a catalog choice or a stock-location answer as a saved resource', () => {
    const result = buildSalesSetup('manual', true, empty);
    expect(result.steps.map(step => step.key)).toEqual(['product', 'warehouse']);
    expect(result.completed).toBe(0);
  });
  it('finishes with one successfully synced shop, including a successful empty sync', () => {
    const result = buildSalesSetup('channel', false, { ...empty, channels: [shop] });
    expect(result.complete).toBe(true);
    expect(result.steps).toHaveLength(2);
  });
  it('keeps in-progress and failed syncs incomplete with a direct action', () => {
    for (const [status, expected] of [['INITIAL_SYNCING', 'running'], ['SYNC_ERROR', 'attention']] as const) {
      const result = buildSalesSetup('channel', false, { ...empty, channels: [{ ...shop, status }] });
      expect(result).toMatchObject({ completed: 1, complete: false, next: { key: 'sync', status: expected, target_url: '/sales-channels/connected-channels' } });
    }
  });
  it('requires reconnecting an expired shop and does not count historical sync data', () => {
    expect(buildSalesSetup('channel', false, { ...empty, channels: [{ ...shop, status: 'EXPIRED' }] })).toMatchObject({ completed: 0, complete: false, next: { key: 'channel', status: 'attention' } });
  });
  it('requires an actual matching warehouse only for the stock path', () => {
    expect(buildSalesSetup('channel', true, { ...empty, channels: [shop], warehouseIds: ['other'] })).toMatchObject({ completed: 3, complete: false, next: { key: 'mapping' } });
    expect(buildSalesSetup('channel', true, { ...empty, channels: [shop], warehouseIds: ['wh'] }).complete).toBe(true);
  });
  it('does not let an extra failing channel block a successful first-shop setup', () => {
    expect(buildSalesSetup('channel', false, { ...empty, channels: [{ ...shop, id: 'failed', status: 'SYNC_ERROR' }, shop] }).complete).toBe(true);
  });
});
