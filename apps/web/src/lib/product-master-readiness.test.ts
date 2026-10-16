// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getMasterReadinessChecks, type MasterReadinessInput, type VariantItem } from './product-master-readiness';
import * as warehouses from './warehouse-store';

const input: MasterReadinessInput = {
  name: 'Notebook', sku_code: 'NOTEBOOK', category: '', description: 'A paper notebook.',
  images: ['/cover.jpg'], retail_price: 100, inventory: { wh_crjp: 0 }, has_variants: false,
  variantGroups: [], variantItems: [], specifications: [], shippingPackageRequired: false,
  pkg_length: 0, pkg_width: 0, pkg_height: 0, pkg_weight: 0,
};
const variant: VariantItem = { key: 'Blue', sku_code: 'NOTEBOOK-BLUE', price: '100', stock: '0',
  stock_by_location: { wh_crjp: '0' }, selected: true, image_url: '' };
const check = (overrides: Partial<MasterReadinessInput>, id = 'inventory') => getMasterReadinessChecks({ ...input, ...overrides }).find(item => item.id === id)!;
afterEach(() => vi.restoreAllMocks());

describe('Required Master warehouse and image', () => {
  it('has six independent requirements, allowing zero stock and no channel', () => {
    const checks = getMasterReadinessChecks(input);
    expect(checks.map(item => item.id)).toEqual(['identity', 'sku', 'content', 'media', 'price', 'inventory']);
    expect(checks.every(item => item.done)).toBe(true);
  });
  it.each<NonNullable<MasterReadinessInput['inventory']>>([{}, { wh_crjp: '' }, { wh_crjp: '  ' }, { wh_crjp: -1 }, { wh_crjp: NaN }, { wh_crjp: Infinity }, { unknown: 10 }])('does not count an unassigned or invalid warehouse: %j', inventory => {
    expect(check({ inventory }).done).toBe(false);
  });
  it('requires a warehouse that is still active', () => {
    vi.spyOn(warehouses, 'getWarehouses').mockReturnValue(warehouses.getWarehouses().map(warehouse => ({ ...warehouse, status: 'inactive' })));
    expect(check({}).done).toBe(false);
  });
  it('uses selected variant warehouse membership, never aggregate stock or an unselected variant', () => {
    expect(check({ has_variants: true, variantItems: [variant] }).done).toBe(true);
    expect(check({ has_variants: true, variantItems: [{ ...variant, selected: false }] }).done).toBe(false);
    expect(check({ has_variants: true, variantItems: [{ ...variant, stock: '50', stock_by_location: {} }] }).done).toBe(false);
    expect(check({ has_variants: true, variantItems: [] }).done).toBe(false);
  });
  it('does not let image and warehouse requirements satisfy each other', () => {
    expect(check({ images: [], inventory: { wh_crjp: 0 } }, 'media').done).toBe(false);
    expect(check({ images: ['/cover.jpg'], inventory: {} }).done).toBe(false);
  });
});
