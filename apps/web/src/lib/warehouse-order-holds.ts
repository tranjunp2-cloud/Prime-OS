import type { InventoryPosition, OrderHoldReference } from './inventory-store';
import type { Order, OrderItem } from './oms-types';
import { canonicalWarehouseId } from './stock-hold-history';

/** An assigned warehouse alone is not a reservation. Closed/shipped orders never hold stock. */
export function orderHoldState(order: Order): OrderHoldReference['state'] | null {
  if (!['pending', 'ready_to_ship'].includes(order.status)) return null;
  if (order.lifecycle_stage === 'released_to_fulfillment') return 'allocated';
  if (order.lifecycle_stage === 'reserved') return 'reserved_paid';
  return null;
}

/** Exact product + SKU + warehouse linkage; SKU labels can be duplicated across imported masters. */
export function orderHoldsForPosition(position: InventoryPosition, orders: Order[], lines: OrderItem[]): OrderHoldReference[] {
  return orders.flatMap(order => {
    const state = orderHoldState(order);
    if (!state || canonicalWarehouseId(order.allocated_warehouse_id ?? order.warehouse_id ?? '') !== canonicalWarehouseId(position.warehouse_id)) return [];
    return lines.filter(line => line.order_id === order.id && line.product_id === position.product_id && line.sku_id === position.sku_id
      && Number.isSafeInteger(line.quantity) && line.quantity > 0).map(line => ({
      orderId: order.id, orderNumber: order.order_id, lineId: line.id, quantity: line.quantity, state,
      source: typeof order.allocation_policy_snapshot?.stock_source_label === 'string' ? order.allocation_policy_snapshot.stock_source_label
        : order.channel === 'manual' ? 'Manual order' : order.channel,
    }));
  });
}

export function orderHoldCounters(holds: OrderHoldReference[]) {
  return holds.reduce((counts, hold) => ({ ...counts, [hold.state]: counts[hold.state] + hold.quantity }), { reserved_unpaid: 0, reserved_paid: 0, allocated: 0 });
}
