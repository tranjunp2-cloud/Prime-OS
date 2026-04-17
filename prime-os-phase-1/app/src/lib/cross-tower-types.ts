// Cross-Tower Integration Types
// Types for 4PL Control Tower integration between Product Master, OMS, Inventory, and Fulfillment

// ===== Partners / Carriers =====
export type PartnerType = 'carrier' | 'third_party_logistics' | 'marketplace';
export type PartnerMode = 'api' | 'edi' | 'manual' | 'observer_only';

export interface Partner {
  id: string;
  user_id: string;
  partner_type: PartnerType;
  code: string;
  name: string;
  capabilities: {
    label_printing?: boolean;
    tracking_events?: boolean;
    inventory_sync?: boolean;
    wms_sync?: boolean;
    edi?: boolean;
  };
  mode: PartnerMode;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ===== SKU Mappings =====
export interface SkuMapping {
  id: string;
  sku_id: string;
  user_id: string;
  platform: string;
  channel_sku: string | null;
  asin: string | null;
  fnsku: string | null;
  effective_from: string;
  effective_to: string | null;
  created_at: string;
  updated_at: string;
}

// ===== Domain Events (Cross-Tower Audit) =====
export type DomainEventName = 
  | 'order_created'
  | 'order_validated'
  | 'order_allocated'
  | 'reservation_created'
  | 'reservation_confirmed'
  | 'reservation_failed'
  | 'reservation_released'
  | 'fulfillment_requested'
  | 'job_created'
  | 'job_picking'
  | 'job_packed'
  | 'shipment_created'
  | 'shipment_labeled'
  | 'shipment_shipped'
  | 'shipment_delivered'
  | 'shipment_failed'
  | 'inventory_deducted'
  | 'return_requested'
  | 'return_received'
  | 'return_qc_completed'
  | 'inventory_restocked'
  | 'inventory_unfulfillable';

export type AggregateType = 'order' | 'reservation' | 'job' | 'shipment' | 'return' | 'inventory';

export interface DomainEvent {
  id: string;
  user_id: string;
  event_name: DomainEventName | string;
  aggregate_type: AggregateType;
  aggregate_id: string;
  payload: Record<string, unknown> | null;
  created_at: string;
}

// ===== Inventory Events Ledger =====
export type InventoryEventType = 
  | 'receive'
  | 'reserve'
  | 'release'
  | 'deduct_on_ship'
  | 'adjust'
  | 'return_in'
  | 'qc_pass'
  | 'qc_fail';

export interface InventoryEventLedger {
  id: string;
  user_id: string;
  event_type: InventoryEventType;
  ref_type: string; // order_line, shipment, return, adjustment
  ref_id: string | null;
  sku_id: string | null;
  warehouse_id: string | null;
  delta: {
    on_hand_qty?: number;
    reserved_qty?: number;
    available_qty?: number;
    in_transit_qty?: number;
    qc_hold_qty?: number;
    damaged_qty?: number;
  };
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ===== Shipment Events =====
export type ShipmentEventType = 
  | 'label_created'
  | 'picked_up'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'delivery_failed';

export interface ShipmentEvent {
  id: string;
  shipment_id: string;
  event_type: ShipmentEventType;
  event_time: string;
  location: string | null;
  message: string | null;
  raw_payload: Record<string, unknown> | null;
  created_at: string;
}

// ===== Return Lines =====
export type QCOutcome = 'pending' | 'pass' | 'fail';
export type ReturnDisposition = 'pending' | 'restock' | 'unfulfillable' | 'scrap';

export interface ReturnLine {
  id: string;
  return_id: string;
  sku_id: string;
  qty: number;
  qc_outcome: QCOutcome;
  disposition: ReturnDisposition;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  sku?: {
    sku_code: string;
    variation_name: string | null;
  };
}

// ===== Fulfillment Mode =====
export type FulfillmentMode = 'seller_fulfilled' | 'marketplace_managed' | 'third_party_logistics';

// ===== Extended Order with cross-tower fields =====
export interface CrossTowerOrder {
  id: string;
  order_id: string;
  channel: string;
  status: string;
  lifecycle_stage: string;
  fulfillment_mode: FulfillmentMode;
  customer_name: string;
  ship_to: Record<string, unknown> | null;
  total_amount: number;
  allocated_warehouse_id: string | null;
  sla_target_days: number | null;
  risk_flags: string[] | null;
  created_at: string;
}

// ===== UI Labels =====
export const PARTNER_TYPE_LABELS: Record<PartnerType, string> = {
  carrier: 'Carrier',
  third_party_logistics: '3PL',
  marketplace: 'Marketplace',
};

export const PARTNER_MODE_LABELS: Record<PartnerMode, string> = {
  api: 'API',
  edi: 'EDI',
  manual: 'Manual',
  observer_only: 'Observer Only',
};

export const FULFILLMENT_MODE_LABELS: Record<FulfillmentMode, string> = {
  seller_fulfilled: 'Seller Fulfilled',
  marketplace_managed: 'Marketplace Managed',
  third_party_logistics: '3PL',
};

export const QC_OUTCOME_LABELS: Record<QCOutcome, string> = {
  pending: 'Pending',
  pass: 'Pass',
  fail: 'Fail',
};

export const DISPOSITION_LABELS: Record<ReturnDisposition, string> = {
  pending: 'Pending',
  restock: 'Restock',
  unfulfillable: 'Unfulfillable',
  scrap: 'Scrap',
};

export const SHIPMENT_EVENT_LABELS: Record<ShipmentEventType, string> = {
  label_created: 'Label Created',
  picked_up: 'Picked Up',
  in_transit: 'In Transit',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  delivery_failed: 'Delivery Failed',
};

// ===== Carrier Tracking Format Helpers =====
export const CARRIER_TRACKING_FORMATS: Record<string, { prefix: string; length: number }> = {
  jp_post: { prefix: 'JP', length: 13 },
  sagawa: { prefix: 'SGW', length: 12 },
  yamato: { prefix: 'YMT', length: 12 },
  viettelpost: { prefix: 'VTP', length: 12 },
  amazon_fba: { prefix: 'TBA', length: 12 },
};

export function generateDemoTrackingNumber(carrierCode: string): string {
  const format = CARRIER_TRACKING_FORMATS[carrierCode] || { prefix: 'TRK', length: 10 };
  const randomPart = Math.random().toString().slice(2, 2 + format.length - format.prefix.length);
  return `${format.prefix}${randomPart}`;
}
