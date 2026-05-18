import type { Order } from '@/lib/oms-types';
import { getWarehouseById } from '@/lib/warehouse-store';
import {
  resolveChannelOrderReference,
  resolveOrderBusinessId,
  resolveWarehouseId,
} from '@/lib/contracts/identity';
import {
  joinText,
  toOptionalText,
} from '@/lib/contracts/display';

export interface OrderWarehouseUiModel {
  id: string | null;
  name: string | null;
  code: string | null;
  type: string | null;
  is_virtual: boolean | null;
  display_name: string | null;
  display_code: string | null;
  display_label: string | null;
}

export type OrderUiModel = Omit<Order, 'allocated_warehouse'> & {
  display_order_id: string;
  display_channel_order_ref: string | null;
  display_customer_name: string;
  display_customer_email: string | null;
  display_tracking_number: string | null;
  display_ship_to_label: string | null;
  display_ship_to_postal_code: string | null;
  resolved_warehouse_id: string | null;
  resolved_warehouse: OrderWarehouseUiModel | null;
  allocated_warehouse: OrderWarehouseUiModel | null;
};

function toWarehouseUiModel(source: {
  id?: string | null;
  name?: string | null;
  code?: string | null;
  type?: string | null;
  is_virtual?: boolean | null;
} | null | undefined): OrderWarehouseUiModel | null {
  if (!source) return null;

  const displayName = toOptionalText(source.name);
  const displayCode = toOptionalText(source.code);

  return {
    id: source.id ?? null,
    name: source.name ?? null,
    code: source.code ?? null,
    type: source.type ?? null,
    is_virtual: source.is_virtual ?? null,
    display_name: displayName,
    display_code: displayCode,
    display_label: joinText([displayCode, displayName], ' · '),
  };
}

export function hydrateOrderUiModel(order: Order): OrderUiModel {
  const resolvedWarehouseId = resolveWarehouseId(order);
  const warehouseFromStore = resolvedWarehouseId ? getWarehouseById(resolvedWarehouseId) : null;
  const allocatedWarehouse = toWarehouseUiModel({
    id: order.allocated_warehouse_id ?? warehouseFromStore?.id ?? null,
    name: order.allocated_warehouse?.name ?? warehouseFromStore?.name ?? null,
    code: order.allocated_warehouse?.code ?? warehouseFromStore?.code ?? null,
    type: order.allocated_warehouse?.type ?? warehouseFromStore?.type ?? null,
    is_virtual: order.allocated_warehouse?.is_virtual ?? warehouseFromStore?.is_virtual ?? null,
  });

  return {
    ...order,
    display_order_id: resolveOrderBusinessId(order) ?? order.id,
    display_channel_order_ref: resolveChannelOrderReference(order),
    display_customer_name: toOptionalText(order.customer_name) ?? 'Unknown Customer',
    display_customer_email: toOptionalText(order.customer_email),
    display_tracking_number: toOptionalText(order.tracking_number),
    display_ship_to_label: joinText([
      order.ship_to?.city,
      order.ship_to?.country,
    ]),
    display_ship_to_postal_code: toOptionalText(order.ship_to?.postal_code),
    resolved_warehouse_id: resolvedWarehouseId,
    resolved_warehouse: allocatedWarehouse,
    allocated_warehouse: allocatedWarehouse,
  };
}

export function hydrateOrdersUiModel(orders: Order[]) {
  return orders.map(hydrateOrderUiModel);
}
