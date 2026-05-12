import { describe, expect, it } from 'vitest';
import { flattenPrimeProductSettingsItems, primeProductSettingsGroups } from './prime-product-settings-nav';

describe('primeProductSettingsGroups', () => {
  it('keeps all operating areas as product settings groups', () => {
    expect(primeProductSettingsGroups.map((group) => group.id)).toEqual([
      'intelligence',
      'ecom',
      'demand',
      'finance',
      'customer',
    ]);
  });

  it('exposes existing Prime OS route products and floors', () => {
    const items = flattenPrimeProductSettingsItems();
    const ids = new Set(items.map((item) => item.id));

    expect(ids).toContain('product-master');
    expect(ids).toContain('inventory-brain');
    expect(ids).toContain('oms');
    expect(ids).toContain('fulfillment');
    expect(ids).toContain('policy-rule');
    expect(ids).toContain('event-audit');
    expect(ids).toContain('campaign-ops');
    expect(ids).toContain('crm-compact');
    expect(ids).toContain('fin-support');
  });

  it('does not create empty navigation targets', () => {
    expect(flattenPrimeProductSettingsItems().every((item) => item.href.startsWith('/'))).toBe(true);
  });
});
