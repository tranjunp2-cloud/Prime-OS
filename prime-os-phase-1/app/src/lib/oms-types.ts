// OMS Tower Types

export type OrderStatus = 'pending' | 'ready_to_ship' | 'shipping' | 'completed' | 'cancelled' | 'returned';

export type LifecycleStage = 
  | 'captured' 
  | 'validated' 
  | 'allocated' 
  | 'reserved' 
  | 'released_to_fulfillment' 
  | 'shipped' 
  | 'delivered' 
  | 'closed' 
  | 'cancelled' 
  | 'return_in_progress';

export type Channel = 'amazon' | 'rakuten' | 'shopee' | 'manual';

export type ReservationStatus = 'reserved' | 'released' | 'consumed' | 'failed';

export type FulfillmentRequestStatus = 'queued' | 'sent' | 'accepted' | 'in_progress' | 'completed' | 'failed';

export type FlowType = 'seller_fulfilled' | 'marketplace_observing' | '3pl_managed';

export type EventType = 
  | 'captured' 
  | 'validated' 
  | 'allocated' 
  | 'reserved' 
  | 'reservation_failed'
  | 'release_to_fulfillment' 
  | 'shipped' 
  | 'delivered' 
  | 'cancelled' 
  | 'return_requested' 
  | 'exception' 
  | 'note';

export interface ShipTo {
  name: string;
  phone?: string;
  address1: string;
  address2?: string;
  city: string;
  prefecture: string;
  postal_code: string;
  country: string;
}

export interface Order {
  id: string;
  user_id: string;
  order_id: string;
  channel: Channel;
  channel_order_ref: string | null;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  shipping_address: string | null;
  shipping_method: string | null;
  tracking_number: string | null;
  ship_to: ShipTo | null;
  currency: string;
  subtotal_amount: number;
  shipping_amount: number;
  discount_amount: number;
  total_amount: number;
  status: OrderStatus;
  lifecycle_stage: LifecycleStage;
  risk_flags: string[];
  allocated_warehouse_id: string | null;
  allocation_policy_snapshot: Record<string, unknown> | null;
  sla_target_days: number | null;
  order_date: string;
  created_at: string;
  updated_at: string;
  warehouse_id: string | null;
  // Joined fields
  allocated_warehouse?: {
    id: string;
    name: string;
    code: string;
    type: string;
    is_virtual: boolean | null;
  } | null;
}

export interface OrderItem {
  id: string;
  order_id: string;
  sku: string;
  product_name: string;
  quantity: number;
  price_per_unit: number;
  created_at: string;
}

export interface OrderEvent {
  id: string;
  order_id: string;
  event_type: EventType | string;
  message: string;
  actor_type: 'system' | 'user' | 'integration';
  actor_id: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export interface InventoryReservation {
  id: string;
  order_id: string;
  warehouse_id: string;
  sku_id: string;
  qty: number;
  status: ReservationStatus;
  reason: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  sku?: {
    sku_code: string;
    variation_name: string | null;
    product?: {
      title: string;
    };
  };
  warehouse?: {
    name: string;
    code: string;
  };
}

export interface FulfillmentRequest {
  id: string;
  order_id: string;
  warehouse_id: string;
  flow_type: FlowType;
  requested_at: string;
  status: FulfillmentRequestStatus;
  payload: Record<string, unknown> | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

// UI Labels
export const LIFECYCLE_STAGE_LABELS: Record<LifecycleStage, string> = {
  captured: 'Captured',
  validated: 'Validated',
  allocated: 'Allocated',
  reserved: 'Reserved',
  released_to_fulfillment: 'Released',
  shipped: 'Shipped',
  delivered: 'Delivered',
  closed: 'Closed',
  cancelled: 'Cancelled',
  return_in_progress: 'Return In Progress',
};

export const LIFECYCLE_STAGE_COLORS: Record<LifecycleStage, string> = {
  captured: 'bg-muted text-muted-foreground',
  validated: 'bg-primary/10 text-primary',
  allocated: 'bg-cyan-500/14 text-cyan-700 dark:bg-cyan-500/18 dark:text-cyan-300',
  reserved: 'bg-violet-500/14 text-violet-700 dark:bg-violet-500/18 dark:text-violet-300',
  released_to_fulfillment: 'bg-orange-500/14 text-orange-700 dark:bg-orange-500/18 dark:text-orange-300',
  shipped: 'bg-amber-500/14 text-amber-800 dark:bg-amber-500/18 dark:text-amber-300',
  delivered: 'bg-emerald-500/14 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  closed: 'bg-muted text-muted-foreground',
  cancelled: 'bg-destructive/10 text-destructive',
  return_in_progress: 'bg-amber-500/14 text-amber-800 dark:bg-amber-500/18 dark:text-amber-300',
};

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  reserved: 'Reserved',
  released: 'Released',
  consumed: 'Consumed',
  failed: 'Failed',
};

export const RESERVATION_STATUS_COLORS: Record<ReservationStatus, string> = {
  reserved: 'bg-violet-500/14 text-violet-700 dark:bg-violet-500/18 dark:text-violet-300',
  released: 'bg-muted text-muted-foreground',
  consumed: 'bg-emerald-500/14 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  failed: 'bg-destructive/10 text-destructive',
};

export const EVENT_TYPE_LABELS: Record<string, string> = {
  captured: 'Order Captured',
  validated: 'Order Validated',
  allocated: 'Warehouse Allocated',
  reserved: 'Inventory Reserved',
  reservation_failed: 'Reservation Failed',
  release_to_fulfillment: 'Released to Fulfillment',
  shipped: 'Order Shipped',
  delivered: 'Order Delivered',
  cancelled: 'Order Cancelled',
  return_requested: 'Return Requested',
  exception: 'Exception',
  note: 'Note',
};

export const EVENT_TYPE_ICONS: Record<string, string> = {
  captured: '📥',
  validated: '✅',
  allocated: '🏭',
  reserved: '📦',
  reservation_failed: '⚠️',
  release_to_fulfillment: '🚀',
  shipped: '🚚',
  delivered: '✓',
  cancelled: '❌',
  return_requested: '↩️',
  exception: '⚠️',
  note: '📝',
};
