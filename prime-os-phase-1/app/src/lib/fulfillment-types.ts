// Fulfillment module types

export type FlowType = 'seller_fulfilled' | 'marketplace_observer' | 'third_party_3pl' | 'fba';
export type JobStatus = 'pending' | 'picking' | 'packed' | 'shipped' | 'done' | 'cancelled' | 'exception' | 'observing';
export type JobItemStatus = 'open' | 'picked' | 'packed' | 'short_pick';
export type ShipmentStatus = 'draft' | 'label_created' | 'shipped' | 'delivered' | 'failed';
export type CarrierCode = 'japan_post' | 'sagawa' | 'yamato' | 'ecms' | 'manual';
export type ExceptionType = 'short_pick' | 'damaged' | 'delivery_failed' | 'other';
export type ExceptionSeverity = 'low' | 'med' | 'high';
export type FbaPrepStatus = 'none' | 'preparing' | 'prepped' | 'labelled';
export type FbaInboundStatus = 'working' | 'shipping' | 'receiving' | 'closed' | 'cancelled' | 'deleted';
export type Priority = 'critical' | 'normal';

export interface FulfillmentJob {
  id: string;
  order_id: string;
  warehouse_id: string;
  user_id: string;
  fulfillment_type: string | null;
  flow_type: FlowType;
  status: JobStatus;
  priority: Priority | null;
  sla_target_days: number | null;
  sla_due_at: string | null;
  job_code: string | null;
  notes: string | null;
  assigned_to: string | null;
  partner_id: string | null;
  handoff_status: string | null;
  external_priority: string | null;
  external_notes: string | null;
  picked_at?: string | null;
  packed_at?: string | null;
  labeled_at?: string | null;
  shipped_at?: string | null;
  // List views currently surface shipment summary directly on the job record.
  carrier?: CarrierCode | string | null;
  tracking_number?: string | null;
  // FBA-specific fields
  fba_shipment_id: string | null;
  fulfillment_center_id: string | null;
  fba_prep_status: FbaPrepStatus | null;
  inbound_shipment_status: FbaInboundStatus | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  order?: {
    order_id: string;
    customer_name: string;
    total_amount: number;
    channel: string;
  };
  warehouse?: {
    name: string;
    code: string;
    is_virtual: boolean | null;
    type: string;
  };
  partner?: {
    id: string;
    name: string;
    partner_type: string;
  } | null;
}

export interface FulfillmentJobItem {
  id: string;
  job_id: string;
  sku_id: string;
  qty: number;
  quantity_ordered?: number;
  picked_qty: number;
  packed_qty: number;
  status: JobItemStatus;
  created_at: string;
  updated_at: string;
  // Joined fields
  sku?: {
    sku_code: string;
    variation_name: string | null;
    product?: {
      id?: string;
      title: string;
    };
  };
  // Alternate joined field names (used by FulfillmentJobDetail)
  sku_code?: string;
  product_name?: string;
}

export interface Shipment {
  id: string;
  job_id: string;
  user_id: string;
  carrier_code: string;
  service_level: string | null;
  tracking_number: string | null;
  label_url: string | null;
  shipped_at: string | null;
  status: ShipmentStatus;
  created_at: string;
  updated_at: string;
}

export interface Package {
  id: string;
  shipment_id: string;
  package_no: number;
  weight_g: number | null;
  dimensions_mm: { length?: number; width?: number; height?: number } | null;
  items: { sku_id: string; qty: number }[];
  created_at: string;
  updated_at: string;
}

export interface TrackingEvent {
  id: string;
  shipment_id: string;
  event_time: string;
  event_code: string;
  event_message: string;
  raw_payload: Record<string, unknown> | null;
  created_at: string;
}

export interface FulfillmentException {
  id: string;
  job_id: string;
  type: ExceptionType;
  severity: ExceptionSeverity;
  note: string | null;
  resolved_at: string | null;
  created_at: string;
}

// UI constants
export const FLOW_TYPE_LABELS: Record<FlowType, string> = {
  seller_fulfilled: 'CR Direct',
  marketplace_observer: 'Marketplace',
  third_party_3pl: '3PL',
  fba: 'FBA',
};

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  pending: 'Pending',
  picking: 'Picking',
  packed: 'Packed',
  shipped: 'Shipped',
  done: 'Done',
  cancelled: 'Cancelled',
  exception: 'Exception',
  observing: 'Observing',
};

export const JOB_STATUS_COLORS: Record<JobStatus, string> = {
  pending: 'bg-sky-500/14 text-sky-700 dark:bg-sky-500/18 dark:text-sky-300',
  picking: 'bg-sky-500/14 text-sky-700 dark:bg-sky-500/18 dark:text-sky-300',
  packed: 'bg-violet-500/14 text-violet-700 dark:bg-violet-500/18 dark:text-violet-300',
  shipped: 'bg-teal-500/14 text-teal-700 dark:bg-teal-500/18 dark:text-teal-300',
  done: 'bg-emerald-500/14 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  cancelled: 'bg-destructive/10 text-destructive',
  exception: 'bg-rose-500/14 text-rose-700 dark:bg-rose-500/18 dark:text-rose-300',
  observing: 'bg-cyan-500/14 text-cyan-700 dark:bg-cyan-500/18 dark:text-cyan-300',
};

export const CARRIER_LABELS: Record<CarrierCode, string> = {
  japan_post: 'Japan Post',
  sagawa: 'Sagawa Express',
  yamato: 'Yamato Transport',
  ecms: 'ECMS Express',
  manual: 'Manual Entry',
};

export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  draft: 'Draft',
  label_created: 'Label Created',
  shipped: 'Shipped',
  delivered: 'Delivered',
  failed: 'Failed',
};

export const EXCEPTION_TYPE_LABELS: Record<ExceptionType, string> = {
  short_pick: 'Short Pick',
  damaged: 'Damaged',
  delivery_failed: 'Delivery Failed',
  other: 'Other',
};

export const EXCEPTION_SEVERITY_COLORS: Record<ExceptionSeverity, string> = {
  low: 'bg-muted text-muted-foreground',
  med: 'bg-orange-500/14 text-orange-700 dark:bg-orange-500/18 dark:text-orange-300',
  high: 'bg-destructive/10 text-destructive',
};

// Helper to check if a job is read-only (marketplace/virtual)
export function isJobReadOnly(job: FulfillmentJob): boolean {
  return job.flow_type === 'marketplace_observer' || job.warehouse?.is_virtual === true;
}

// ─── FBA-specific types & helpers ─────────────────────────────────────────────

export const FLOW_TYPE_COLORS: Record<FlowType, string> = {
  seller_fulfilled: 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/12 dark:text-emerald-300',
  marketplace_observer: 'bg-amber-500/10 text-amber-800 dark:bg-amber-500/12 dark:text-amber-300',
  third_party_3pl: 'bg-violet-500/10 text-violet-700 dark:bg-violet-500/12 dark:text-violet-300',
  fba: 'bg-orange-500/10 text-orange-700 dark:bg-orange-500/12 dark:text-orange-300',
};

export const FBA_PREP_STATUS_LABELS: Record<FbaPrepStatus, string> = {
  none: 'No Prep',
  preparing: 'Preparing',
  prepped: 'Prepped',
  labelled: 'Labelled',
};

export const FBA_PREP_STATUS_COLORS: Record<FbaPrepStatus, string> = {
  none: 'bg-muted text-muted-foreground',
  preparing: 'bg-sky-500/14 text-sky-700 dark:bg-sky-500/18 dark:text-sky-300',
  prepped: 'bg-amber-500/14 text-amber-800 dark:bg-amber-500/18 dark:text-amber-300',
  labelled: 'bg-emerald-500/14 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
};

export const FBA_INBOUND_STATUS_LABELS: Record<FbaInboundStatus, string> = {
  working: 'Working',
  shipping: 'Shipping to FC',
  receiving: 'Receiving',
  closed: 'Closed',
  cancelled: 'Cancelled',
  deleted: 'Deleted',
};

export const FBA_INBOUND_STATUS_COLORS: Record<FbaInboundStatus, string> = {
  working: 'bg-sky-500/14 text-sky-700 dark:bg-sky-500/18 dark:text-sky-300',
  shipping: 'bg-amber-500/14 text-amber-800 dark:bg-amber-500/18 dark:text-amber-300',
  receiving: 'bg-violet-500/14 text-violet-700 dark:bg-violet-500/18 dark:text-violet-300',
  closed: 'bg-emerald-500/14 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  cancelled: 'bg-muted text-muted-foreground',
  deleted: 'bg-muted text-muted-foreground',
};
