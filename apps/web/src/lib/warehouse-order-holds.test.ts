import { describe, expect, it } from 'vitest';
import type { Order, OrderItem } from './oms-types';
import type { InventoryPosition } from './inventory-store';
import { orderHoldsForPosition, orderHoldCounters } from './warehouse-order-holds';

const position = { product_id: 'product', sku_id: 'sku', warehouse_id: 'wh_crjp' } as InventoryPosition;
const order: Order = { id: 'order', user_id: 'demo', order_id: 'ORD-001', channel: 'manual', channel_order_ref: null,
  customer_name: 'Demo customer', customer_email: null, customer_phone: null, shipping_address: null, shipping_method: null, tracking_number: null, ship_to: null,
  currency: 'JPY', subtotal_amount: 100, shipping_amount: 0, discount_amount: 0, total_amount: 100,
  status: 'ready_to_ship', lifecycle_stage: 'reserved', risk_flags: [], allocated_warehouse_id: 'wh_crjp', warehouse_id: 'wh_crjp',
  allocation_policy_snapshot: { stock_source_label: 'Manual order' }, sla_target_days: 3, order_date: '2026-10-08', created_at: '2026-10-08', updated_at: '2026-10-08' };
const line = { id: 'line', order_id: 'order', product_id: 'product', sku_id: 'sku', sku: 'SKU', quantity: 2 } as OrderItem;
describe('order hold source', () => {
  it('counts exact lines once and ignores products with the same imported SKU identity', () => {
    const holds = orderHoldsForPosition(position, [order], [line, { ...line, id: 'other', product_id: 'other-product', quantity: 9 }]);
    expect(holds).toEqual([{ orderId: 'order', orderNumber: 'ORD-001', lineId: 'line', source: 'Manual order', state: 'reserved_paid', quantity: 2 }]);
    expect(orderHoldCounters(holds)).toEqual({ reserved_unpaid: 0, reserved_paid: 2, allocated: 0 });
  });
  it('does not count captured, unallocated, shipped, completed, returned or cancelled orders', () => {
    for (const status of ['shipping', 'completed', 'returned', 'cancelled'] as const) expect(orderHoldsForPosition(position, [{ ...order, status }], [line])).toEqual([]);
    for (const lifecycle_stage of ['captured', 'validated', 'allocated', 'shipped', 'delivered', 'closed', 'cancelled', 'return_in_progress'] as const) expect(orderHoldsForPosition(position, [{ ...order, lifecycle_stage }], [line])).toEqual([]);
    expect(orderHoldsForPosition(position, [{ ...order, allocated_warehouse_id: null, warehouse_id: null }], [line])).toEqual([]);
  });
  it('counts fulfillment once, resolves aliases and ignores invalid quantities or missing identity', () => {
    expect(orderHoldCounters(orderHoldsForPosition(position, [{ ...order, allocated_warehouse_id: 'wh_rakjp', lifecycle_stage: 'released_to_fulfillment' }], [line]))).toEqual({ reserved_unpaid: 0, reserved_paid: 0, allocated: 2 });
    expect(orderHoldsForPosition(position, [order], [{ ...line, product_id: undefined }, { ...line, quantity: -1 }, { ...line, quantity: NaN }])).toEqual([]);
  });
});
