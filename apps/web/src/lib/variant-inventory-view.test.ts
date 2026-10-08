import { describe, expect, it } from 'vitest';
import { getProducts, type Product } from './product-store';
import type { InventoryPosition } from './inventory-store';
import { variantInventoryView } from './variant-inventory-view';

const child = { weight_g: 0, units_per_carton: 1, status: 'active' as const, price: 10 };
const product: Product = { ...getProducts()[0], id: 'variant-stock-test', has_variants: true, inventory: { wh_crjp: 999 }, channels: [], skus: [
  { ...child, id: 'blue', sku_code: 'BLUE', variation_name: 'Blue', stock_by_location: { wh_crjp: 5, wh_fbajp: 0 } },
  { ...child, id: 'red', sku_code: 'RED', variation_name: 'Red', stock_by_location: { wh_rslsg: 7 } },
] };
const position: InventoryPosition = { id: 'position', product_id: product.id, sku_id: 'blue', warehouse_id: 'wh_crjp', on_hand: 5, reserved_unpaid: 1, reserved_paid: 0, allocated: 0, safety_stock: 1, campaign_lock: 0, unfulfillable: 0, inbound: 0, outbound: 0, return_pending: 0, version: 1, updated_at: '2026-10-08T00:00:00Z' };

describe('variant inventory membership', () => {
  it('shows only this saved SKU’s records, including zero, without adding parent stock', () => {
    const view = variantInventoryView(product, 'blue', []);
    expect(view.locations.map(location => location.id)).toEqual(['wh_crjp', 'wh_fbajp']);
    expect(view.total).toBe(5);
    expect(view.recordedCount).toBe(2);
    expect(view.locations[1]).toMatchObject({ external: true, writable: false, balance: { onHand: 0 } });
    expect(view.availableLocations.map(location => location.id)).toEqual(['wh_rslsg', 'wh_3plvn']);
  });
  it('never treats an unsaved or unrecorded SKU as zero or assigns all registry warehouses', () => {
    expect(variantInventoryView(product, undefined, [])).toMatchObject({ sku: undefined, locations: [], total: null, availableLocations: [] });
    const empty = { ...product, skus: [{ ...product.skus[0], stock_by_location: {} }] };
    const view = variantInventoryView(empty, 'blue', []);
    expect(view).toMatchObject({ locations: [], total: null, incomplete: false });
    expect(view.availableLocations.map(location => location.id)).toEqual(['wh_crjp', 'wh_rslsg', 'wh_3plvn']);
  });
  it('retains locations with holds or inbound records and distinguishes partial counts', () => {
    const positions = [position, { ...position, id: 'inbound', warehouse_id: 'wh_3plvn', on_hand: 0, inbound: 12 }];
    const view = variantInventoryView(product, 'blue', positions);
    expect(view.locations.map(location => location.id)).toEqual(['wh_crjp', 'wh_fbajp', 'wh_3plvn']);
    expect(view.locations[2]).toMatchObject({ balance: { onHand: null, atp: null }, presence: { incoming: true, orderHolds: true } });
    expect(view).toMatchObject({ total: 5, incomplete: true });
  });
  it('keeps recorded count distinct from available stock and missing hold data', () => {
    const view = variantInventoryView(product, 'blue', [position]);
    expect(view.locations[0].balance).toMatchObject({ onHand: 5, atp: 3, state: 'ready' });
    expect(variantInventoryView(product, 'blue', []).locations[0].balance).toMatchObject({ onHand: 5, atp: null, state: 'missing' });
  });
  it('retains unknown locations read-only and never includes sibling SKU positions', () => {
    const legacy = { ...product, skus: [{ ...product.skus[0], stock_by_location: { removed_warehouse: 2 } }, product.skus[1]] };
    const view = variantInventoryView(legacy, 'blue', [{ ...position, sku_id: 'red', warehouse_id: 'wh_3plvn' }]);
    expect(view.locations).toHaveLength(1);
    expect(view.locations[0]).toMatchObject({ id: 'removed_warehouse', label: 'Unknown stock location', writable: false });
    expect(view.total).toBe(2);
  });
});
