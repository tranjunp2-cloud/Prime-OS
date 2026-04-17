// Partner types — referenced by PartnersTable, ReturnReviewQueue, ReturnsTable

export type PartnerType = '3pl' | 'carrier' | 'supplier' | 'marketplace';
export type PartnerStatus = 'active' | 'inactive' | 'pending';

export interface Partner {
  id: string;
  name: string;
  partner_type: PartnerType;
  status: PartnerStatus;
  contact_email: string | null;
  contact_phone: string | null;
  api_endpoint: string | null;
  capabilities: string[];
  created_at: string;
  updated_at: string;
  // Additional fields used by PartnersTable
  provider_key?: string;
  provider_secret?: string;
}

// FulfillmentPartner is the same as Partner — aliased for domain clarity
export type FulfillmentPartner = Partner;

// Return domain types
export type ReturnStatus =
  | 'requested'
  | 'approved'
  | 'in_transit'
  | 'received'
  | 'qc'
  | 'dispositioned'
  | 'completed'
  | 'cancelled'
  | 'rejected';

export type Disposition =
  | 'restock'
  | 'unfulfillable'
  | 'refurbish'
  | 'liquidation'
  | 'destroy';

export type QCOutcome = 'pass' | 'fail' | null;

export interface Return {
  id: string;
  rma_number: string;
  rma_code?: string; // alias for rma_number
  order_id: string;
  user_id: string;
  status: ReturnStatus;
  reason: string | null;
  customer_name: string;
  customer_email: string | null;
  total_refund_amount: number | null;
  warehouse_id: string | null;
  received_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  qc_grade?: string | null;
  disposition?: Disposition | null;
  refund_amount?: number | null;
  // Joined
  order?: {
    order_id: string;
    order_number?: string;
    customer_name: string;
    total_amount: number;
    channel: string;
  };
  warehouse?: {
    name: string;
    code: string;
  };
  items?: ReturnItem[];
  // 3PL partner fields
  is_partner_managed?: boolean;
  partner?: {
    name: string;
  };
}

export interface ReturnItem {
  id: string;
  return_id: string;
  sku_id: string;
  sku_code: string | null;
  product_name: string | null;
  quantity_expected: number;
  quantity_received: number | null;
  qc_grade: string | null;
  qc_outcome: QCOutcome;
  disposition: Disposition | null;
  disposition_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields (used by ReturnReviewQueue)
  sku?: {
    sku_code: string;
    variation_name: string | null;
    product?: {
      title: string;
    };
  };
  qty?: number; // alias for quantity_expected (used by ReturnReviewQueue)
}
