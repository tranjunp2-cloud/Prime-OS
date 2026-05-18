// Order Store — singleton in-memory store matching oms-types.ts schema
// Demo data is seeded by demo-data-seeder.ts

import type { Order, OrderItem, OrderEvent } from './oms-types';

let _orders: Order[] = [];
let _orderItems: OrderItem[] = [];
let _orderEvents: OrderEvent[] = [];

// ── Orders ──────────────────────────────────────────────────────────────────────

export function getOrders(): Order[] {
  return _orders;
}

export function getOrderById(id: string): Order | undefined {
  return _orders.find(o => o.id === id);
}

export function addOrder(o: Order): void {
  _orders = [o, ..._orders];
}

export function updateOrder(id: string, updates: Partial<Order>): void {
  _orders = _orders.map(o => o.id === id ? { ...o, ...updates, updated_at: new Date().toISOString() } : o);
}

export function getOrdersByStatus(status: string): Order[] {
  if (!status) return _orders;
  return _orders.filter(o => o.status === status);
}

export function getOrderCountByStatus(status: string): number {
  return _orders.filter(o => o.status === status).length;
}

// ── Order Items ────────────────────────────────────────────────────────────────

export function getOrderItems(orderId: string): OrderItem[] {
  return _orderItems.filter(i => i.order_id === orderId);
}

export function addOrderItem(item: OrderItem): void {
  _orderItems = [..._orderItems, item];
}

// ── Order Events ────────────────────────────────────────────────────────────────

export function getOrderEvents(orderId: string): OrderEvent[] {
  return _orderEvents.filter(e => e.order_id === orderId).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function addOrderEvent(event: OrderEvent): void {
  _orderEvents = [..._orderEvents, event];
}

// ── Seed helpers (called by demo-data-seeder) ───────────────────────────────────

export function _seedOrders(orders: Order[]): void {
  _orders = orders;
}

export function _seedOrderItems(items: OrderItem[]): void {
  _orderItems = items;
}

export function _seedOrderEvents(events: OrderEvent[]): void {
  _orderEvents = events;
}

export function _clearAll(): void {
  _orders = [];
  _orderItems = [];
  _orderEvents = [];
}
