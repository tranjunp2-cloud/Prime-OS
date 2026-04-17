// use-orders.ts
// Reads from in-memory order-store (seeded by demo-data-seeder.ts)
// This is the demo/mock mode. Replace with Supabase queries for production.

import {
  getOrders,
  getOrderById,
  getOrderItems,
  getOrderEvents,
} from '@/lib/order-store';
import type {
  FulfillmentRequest,
  InventoryReservation,
  OrderItem,
  OrderEvent,
} from '@/lib/oms-types';
import {
  hydrateOrderUiModel,
  hydrateOrdersUiModel,
  type OrderUiModel,
} from '@/lib/contracts/orders';

export type { OrderStatus, LifecycleStage, Channel } from '@/lib/oms-types';
export type { FlowType } from '@/lib/fulfillment-store';
export type { OrderUiModel } from '@/lib/contracts/orders';

export interface OrderFilters {
  status?: string;
  channel?: string;
  warehouseId?: string;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

function filterOrders(orders: OrderUiModel[], filters: OrderFilters = {}) {
  let filtered = [...orders];

  if (filters.status && filters.status !== 'all' && filters.status !== 'returned') {
    filtered = filtered.filter((order) => order.status === filters.status);
  }
  if (filters.channel && filters.channel !== 'all') {
    filtered = filtered.filter((order) => order.channel === filters.channel);
  }
  if (filters.warehouseId && filters.warehouseId !== 'all') {
    filtered = filtered.filter((order) => order.resolved_warehouse_id === filters.warehouseId);
  }
  if (filters.search) {
    const query = filters.search.trim().toLowerCase();
    filtered = filtered.filter((order) => [
      order.display_order_id,
      order.display_channel_order_ref,
      order.display_customer_name,
      order.display_customer_email,
      order.display_tracking_number,
    ].some((value) => value?.toLowerCase().includes(query)));
  }
  if (filters.dateFrom) {
    filtered = filtered.filter((order) => new Date(order.order_date) >= filters.dateFrom!);
  }
  if (filters.dateTo) {
    filtered = filtered.filter((order) => new Date(order.order_date) <= filters.dateTo!);
  }

  return filtered;
}

// ── useOrders ──────────────────────────────────────────────────────────────────

export function useOrders(filters: OrderFilters = {}) {
  const orders = hydrateOrdersUiModel(getOrders());
  const filtered = filterOrders(orders, filters);

  // Sort newest first
  filtered.sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime());

  return { data: filtered, isLoading: false };
}

// ── useOrderStatusCounts ────────────────────────────────────────────────────────

export function useOrderStatusCounts(filters: Omit<OrderFilters, 'status'> = {}) {
  const orders = hydrateOrdersUiModel(getOrders());
  const filtered = filterOrders(orders, filters);

  const counts: Record<string, number> = { all: filtered.length };
  for (const o of filtered) {
    counts[o.status] = (counts[o.status] || 0) + 1;
  }

  return { data: counts, isLoading: false };
}

// ── useOrder ───────────────────────────────────────────────────────────────────

export function useOrder(orderId: string | undefined) {
  if (!orderId) return { data: null, isLoading: false };
  const order = getOrderById(orderId);
  return { data: order ? hydrateOrderUiModel(order) : null, isLoading: false };
}

// ── useOrderItems ──────────────────────────────────────────────────────────────

export function useOrderItems(orderId: string | undefined) {
  if (!orderId) return { data: [] as OrderItem[], isLoading: false };
  return { data: getOrderItems(orderId), isLoading: false };
}

// ── useOrderEvents ─────────────────────────────────────────────────────────────

export function useOrderEvents(orderId: string | undefined) {
  if (!orderId) return { data: [] as OrderEvent[], isLoading: false };
  return { data: getOrderEvents(orderId), isLoading: false };
}

// Stub mutations — no-op in demo mode (in-memory only)
export function useAddOrderEvent() {
  return {
    mutate: (_args?: { orderId: string; eventType: string; message: string }) => {},
    mutateAsync: async (_args?: { orderId: string; eventType: string; message: string }) => {},
  };
}

export function useAllocateWarehouse() {
  return {
    mutate: (_args: { orderId: string; warehouseId: string }) => {},
    mutateAsync: async (_args: { orderId: string; warehouseId: string }) => {},
  };
}

export function useReserveInventory() {
  return {
    mutate: (_args: { orderId: string; warehouseId: string; items: Array<{ skuId: string; qty: number }> }) => {},
    mutateAsync: async (_args: { orderId: string; warehouseId: string; items: Array<{ skuId: string; qty: number }> }) => {},
  };
}

export function useSendToFulfillment() {
  return {
    mutate: (_args: {
      orderId: string;
      warehouseId: string;
      flowType: string;
      items: Array<{ skuId: string; skuCode: string; qty: number }>;
    }) => {},
    mutateAsync: async (_args: {
      orderId: string;
      warehouseId: string;
      flowType: string;
      items: Array<{ skuId: string; skuCode: string; qty: number }>;
    }) => {},
  };
}

export function useCancelOrder() {
  return {
    mutate: (_args: { orderId: string }) => {},
    mutateAsync: async (_args: { orderId: string }) => {},
  };
}

export function useRequestReturn() {
  return {
    mutate: (_args: { orderId: string }) => {},
    mutateAsync: async (_args: { orderId: string }) => {},
  };
}

export function useUpdateOrderStatus() {
  return {
    mutate: (_args: { orderId: string; status: string }) => {},
    mutateAsync: async (_args: { orderId: string; status: string }) => {},
  };
}

// ── useOrderReservations ─────────────────────────────────────────────────────────
// Demo mode: no reservations store, return empty
export function useOrderReservations(_orderId: string | undefined) {
  return { data: [] as InventoryReservation[], isLoading: false };
}

// ── useFulfillmentRequest ─────────────────────────────────────────────────────
// Demo mode: no fulfillment_requests store, return null
export function useFulfillmentRequest(_orderId: string | undefined) {
  return { data: null as FulfillmentRequest | null, isLoading: false };
}

// ── useOrderShipments ───────────────────────────────────────────────────────────
// Demo mode: no shipments in-memory, return empty
export function useOrderShipments(_orderId: string | undefined) {
  return { data: [], isLoading: false };
}
