// Shared database types for SME_ECH
// These mirror the Supabase schema

export type Channel = 'rakuten' | 'shopee' | 'amazon' | 'tiktok';
export type WarehouseType = 'internal' | 'fba' | 'fbs' | '3pl' | 'virtual';
export type WarehouseStatus = 'active' | 'inactive' | 'syncing';
export type ProductStatus = 'draft' | 'review' | 'published' | 'archived';
export type SkuStatus = 'active' | 'inactive';
export type ListingStatus = 'draft' | 'published' | 'paused' | 'error';
export type OrderStatus =
  | 'created' | 'confirmed' | 'allocated'
  | 'fulfillment_requested' | 'shipped' | 'delivered'
  | 'closed' | 'cancelled' | 'exception';
export type JobStatus = 'pending' | 'picking' | 'packing' | 'labeled' | 'shipped' | 'done' | 'exception';
export type ShipmentStatus = 'booked' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'exception';
export type ReturnStatus = 'authorized' | 'in_transit' | 'received' | 'qc' | 'dispositioned' | 'completed';
export type QCGrade = 'A' | 'B' | 'C' | 'D';
export type Disposition = 'restock' | 'unfulfillable' | 'refurbish' | 'liquidate' | 'destroy';
export type ReservationStatus = 'active' | 'confirmed' | 'fulfilled' | 'released' | 'expired';

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  country: string;
  address: string | null;
  type: WarehouseType;
  is_virtual: boolean;
  capabilities: string[];
  status: WarehouseStatus;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  description: string | null;
  status: ProductStatus;
  images: string[];
  created_at: string;
  updated_at: string;
  skus?: Sku[];
}

export interface Sku {
  id: string;
  product_id: string;
  sku_code: string;
  barcode: string | null;
  weight_grams: number | null;
  dimensions: { length: number; width: number; height: number } | null;
  units_per_carton: number;
  attributes: Record<string, string>;
  compliance: { hs_code: string; country_of_origin: string; hazard_flag: boolean } | null;
  status: SkuStatus;
  created_at: string;
  updated_at: string;
}

export interface Listing {
  id: string;
  sku_id: string;
  channel: Channel;
  channel_product_id: string | null;
  channel_sku: string | null;
  title: string | null;
  description: string | null;
  price: number | null;
  currency: string;
  category_id: string | null;
  attributes: Record<string, string>;
  images: string[];
  status: ListingStatus;
  error_message: string | null;
  published_at: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryPosition {
  id: string;
  warehouse_id: string;
  sku_id: string;
  on_hand: number;
  reserved: number;
  inbound: number;
  outbound: number;
  unfulfillable: number;
  returns: number;
  updated_at: string;
  warehouse?: Warehouse;
  sku?: Sku;
}

export interface Order {
  id: string;
  order_number: string;
  channel: Channel;
  channel_order_id: string | null;
  status: OrderStatus;
  customer_name: string | null;
  customer_email: string | null;
  shipping_address: {
    name?: string;
    line1?: string;
    line2?: string;
    city?: string;
    country?: string;
    postal_code?: string;
  };
  total_value: number | null;
  currency: string;
  warehouse_id: string | null;
  priority: 'standard' | 'express' | 'critical';
  is_at_risk: boolean;
  sla_deadline: string | null;
  created_at: string;
  confirmed_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  lines?: OrderLine[];
  warehouse?: Warehouse;
}

export interface OrderLine {
  id: string;
  order_id: string;
  sku_id: string;
  quantity: number;
  unit_price: number | null;
  reservation_id: string | null;
  created_at: string;
  sku?: Sku;
}

export interface Reservation {
  id: string;
  sku_id: string;
  warehouse_id: string;
  order_id: string | null;
  quantity: number;
  status: ReservationStatus;
  ttl_minutes: number;
  expires_at: string | null;
  created_at: string;
  confirmed_at: string | null;
  released_at: string | null;
}

export interface FulfillmentJob {
  id: string;
  order_id: string | null;
  warehouse_id: string | null;
  status: JobStatus;
  created_at: string;
  picked_at: string | null;
  packed_at: string | null;
  labeled_at: string | null;
  shipped_at: string | null;
  warehouse?: Warehouse;
  order?: Order;
}

export interface Shipment {
  id: string;
  job_id: string | null;
  carrier: string | null;
  tracking_number: string | null;
  status: ShipmentStatus;
  origin_address: Record<string, unknown>;
  destination_address: Record<string, unknown>;
  estimated_delivery: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  created_at: string;
  job?: FulfillmentJob;
}

export interface ReturnItem {
  id: string;
  order_id: string | null;
  rma_number: string | null;
  reason: string | null;
  status: ReturnStatus;
  qc_grade: QCGrade | null;
  disposition: Disposition | null;
  refund_amount: number | null;
  qc_notes: string | null;
  created_at: string;
  received_at: string | null;
  completed_at: string | null;
  order?: Order;
}
