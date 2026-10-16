import { describe, expect, it } from 'vitest';
import { legacyStoreManagementTarget } from './navigation';

describe('legacy Main POS links', () => {
  it.each([
    ['catalog', '/pos/products'],
    ['stock', '/warehouses/store-stock'],
    ['customers', '/customers'],
    ['shifts', '/client-reports/pos-shifts'],
    ['policies', '/pos/settings'],
    ['stores', '/pos/settings'],
  ])('routes %s to its owning module and keeps demo context', (tab, path) => {
    expect(legacyStoreManagementTarget(`?tab=${tab}&demo=no-data&scope=commerce`)).toBe(`${path}?demo=no-data&scope=commerce`);
  });
  it('opens completed orders and preserves a specific receipt or status', () => {
    expect(legacyStoreManagementTarget('?tab=transactions&order=sale-1')).toBe('/orders?order=sale-1&status=completed');
    expect(legacyStoreManagementTarget('?tab=transactions&status=all')).toBe('/orders?status=all');
  });
  it('does not redirect a canonical settings URL, preventing a loop', () => {
    expect(legacyStoreManagementTarget('?demo=with-data')).toBeUndefined();
    expect(legacyStoreManagementTarget('?tab=unknown')).toBe('/pos/settings');
  });
});
