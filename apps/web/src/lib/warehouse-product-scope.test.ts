import { describe, expect, it } from 'vitest';
import { getProducts, type Product, type StockTransferRecord } from './product-store';
import type { InventoryPosition } from './inventory-store';
import { warehouseProductLocations, warehouseProductPresence } from './warehouse-product-scope';
import { availabilityAt } from './warehouse-availability';

const product: Product = { ...getProducts()[0], id: 'scope', sku_code: 'SCOPE', has_variants: false, skus: [], inventory: {}, inventory_transfers: [], channels: [] };
const position: InventoryPosition = { id: 'record', product_id: product.id, sku_id: 'scope_default', warehouse_id: 'wh_crjp', on_hand: 0, reserved_unpaid: 0, reserved_paid: 0, allocated: 0, safety_stock: 0, campaign_lock: 0, unfulfillable: 0, inbound: 0, outbound: 0, return_pending: 0, version: 1, updated_at: '2026-10-08T00:00:00Z' };
const transfer: StockTransferRecord = { id: 'transfer', sku: 'SCOPE', fromWarehouseId: 'wh_crjp', toWarehouseId: 'wh_rslsg', quantity: 5, fromBefore: 5, fromAfter: 0, toBefore: null, toAfter: 5, createdAt: '2026-10-08T00:00:00Z', status: 'in_transit' };

describe('warehouse product membership', () => {
  it('includes positive and zero counts without any shops, excluding unrelated locations', () => {
    expect(warehouseProductLocations({ ...product, inventory: { wh_crjp: 7, wh_rslsg: 0 } }, [])).toEqual(['wh_crjp', 'wh_rslsg']);
    expect(warehouseProductPresence(product, 'wh_crjp', []).related).toBe(false);
    expect(warehouseProductLocations({ ...product, channels: getProducts()[0].channels }, [])).toEqual([]);
  });
  it('requires a matching product and SKU for inventory records, including zero records', () => {
    expect(warehouseProductPresence(product, 'wh_crjp', [position])).toMatchObject({ related: true, hasCount: false, hasRecord: true });
    expect(warehouseProductLocations(product, [{ ...position, product_id: 'other' }, { ...position, sku_id: 'other' }])).toEqual([]);
  });
  it('retains holds and incoming records without inventing a physical count', () => {
    expect(warehouseProductPresence(product, 'wh_crjp', [{ ...position, inbound: 4, reserved_paid: 2, safety_stock: 1 }])).toMatchObject({ related: true, hasCount: false, incoming: true, orderHolds: true, otherHolds: true });
    expect(availabilityAt(product, ['wh_crjp'], [position]).onHand.quantity).toBeNull();
  });
  it('includes in-transit source and destination but not completed or unrelated transfers', () => {
    const pending = { ...product, inventory_transfers: [transfer] };
    expect(warehouseProductLocations(pending, [])).toEqual(['wh_crjp', 'wh_rslsg']);
    expect(warehouseProductPresence(pending, 'wh_rslsg', []).incoming).toBe(true);
    expect(warehouseProductPresence(pending, 'wh_crjp', []).outgoing).toBe(true);
    expect(warehouseProductLocations({ ...product, inventory_transfers: [{ ...transfer, status: 'received' }, { ...transfer, sku: 'OTHER' }] }, [])).toEqual([]);
    const stock = availabilityAt(pending, ['wh_crjp', 'wh_rslsg', 'wh_3plvn'], []);
    expect(stock.items).toHaveLength(2);
    expect(stock.atp.quantity).toBeNull();
    expect(stock.onHand.quantity).toBeNull();
  });
  it('uses actual variants rather than cached parent inventory', () => {
    const variants = { ...product, has_variants: true, inventory: { wh_3plvn: 999 }, skus: [{ id: 'blue', sku_code: 'BLUE', variation_name: 'Blue', weight_g: 0, units_per_carton: 1, status: 'active' as const, stock_by_location: { wh_crjp: 0 } }, { id: 'red', sku_code: 'RED', variation_name: 'Red', weight_g: 0, units_per_carton: 1, status: 'active' as const, stock_by_location: {} }] };
    expect(warehouseProductLocations(variants, [])).toEqual(['wh_crjp']);
    expect(warehouseProductPresence(variants, 'wh_crjp', [], 'RED').related).toBe(false);
    expect(warehouseProductPresence(variants, 'wh_crjp', [{ ...position, sku_id: 'red', inbound: 4 }], 'RED').related).toBe(true);
  });
  it('deduplicates legacy location aliases across records and pending transfers', () => {
    expect(warehouseProductLocations({ ...product, inventory: { wh_crjp: 0 }, inventory_transfers: [{ ...transfer, fromWarehouseId: 'wh_rakjp' }] }, [{ ...position, warehouse_id: 'wh_rakjp' }])).toEqual(['wh_crjp', 'wh_rslsg']);
  });
});
