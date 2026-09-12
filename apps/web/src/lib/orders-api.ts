import { createPrimeAuthHeaders, resolvePrimeBackendBase } from '@/lib/prime/backend-auth';

export type CanonicalStatus = 'draft' | 'created' | 'acknowledged' | 'allocated' | 'fulfillment_in_progress' | 'partially_shipped' | 'shipped' | 'delivered' | 'closed' | 'canceled';
export interface OrderLine { inventory?: { onHand: number; committed: number; reservedForOrder?: number; checkedAt: string; warehouse: string }; imageUrl?: string; variant?: string; id?: string; sku: string; name: string; quantity: number; unitPrice: number; lineTotal?: number }
export interface ManualOrderInput {
  orderKey: string; requestKey: string; canonicalStatus: 'draft' | 'created'; currencyCode: string;
  buyerSnapshot: { name: string; phone: string; email: string };
  shippingAddressSnapshot: { address: string; city: string; country: string; postalCode: string };
  lines: OrderLine[]; totals: { discount: number; shipping: number; tax: number };
  payment: { state: string; method: string; reference: string };
  metadata: { handlingType?: 'self' | 'marketplace'; store: string; warehouse: string; assignee: string; notes: string; tags: string };
}
export interface OrderRecord extends Omit<ManualOrderInput, 'metadata' | 'canonicalStatus' | 'totals'> {
  id: string; marketplaceOrderId?: string; buyerNote?: string; source: string; version: number; canonicalStatus: CanonicalStatus; orderedAt: string;
  hold?: {active:boolean; reason:string; at:string; actor:string};
  operations?: {
    shipBy?: string; carrier?: string; service?: string;
    package?: { weightKg: number; lengthCm: number; widthCm: number; heightCm: number };
    printStatus?: { pickList?: string; shippingLabel?: string; packingSlip?: string };
    settlement?: { platformFees: number; sellerShipping: number; adjustments: number; netAmount: number; status: 'estimated' | 'settled' };
    invoice?: { requested: boolean; company?: string; taxId?: string; address?: string };
  };
  totals: { subtotal?: number; discount?: number; shipping?: number; tax?: number; grandTotal: number };
  metadata: Omit<ManualOrderInput['metadata'], 'tags'> & { tags: string[] };
  transitions: { fromStatus: string; toStatus: string; reason: string; transitionedAt: string }[];
  shipments: { deliveryOutcome?: 'in_transit' | 'failed' | 'returning' | 'returned' | 'delivered'; carrier: string; tracking: string; status: string; labelUrl?: string }[];
  returnRequests: { id: string; status: string; reason: string; items: unknown[] }[];
  exceptions: { id: string; summary: string; status: string; at: string }[];
  activity: { id: string; at: string; message: string; actor: string }[];
  needsPaymentVerification?: boolean; sla?: string; slaRisk?: boolean; reservation?: string; syncError?: boolean; readyForPickup?: boolean; pickupOverdue?: boolean;
}
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = createPrimeAuthHeaders(); if (init.body) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${resolvePrimeBackendBase()}/api/v1/orders${path}`, { ...init, headers });
  const body = await response.json(); if (!response.ok) throw new Error(body.message || 'Order request failed'); return body;
}
export const ordersApi = {
  list: () => request<{ data: OrderRecord[]; canWrite: boolean; currentUserName?: string }>(''),
  create: (input: ManualOrderInput) => request<{ data: OrderRecord }>('', { method: 'POST', body: JSON.stringify(input) }),
  command: (order: OrderRecord, action: Record<string, unknown>) => request<{ data: OrderRecord }>(`/${encodeURIComponent(order.id)}/actions`, { method: 'POST', body: JSON.stringify({ ...action, version: order.version }) }),
};
export const orderLabels: Record<CanonicalStatus, string> = { draft: 'Draft', created: 'To Confirm', acknowledged: 'Confirmed', allocated: 'Stock Allocated', fulfillment_in_progress: 'Packing', partially_shipped: 'Partially Shipped', shipped: 'In Transit', delivered: 'Delivered', closed: 'Completed', canceled: 'Cancelled' };
export function orderDisplayStatus(order: OrderRecord): string {
  if (order.canonicalStatus === 'created') return 'To Confirm';
  if (['acknowledged', 'allocated', 'fulfillment_in_progress'].includes(order.canonicalStatus)) return order.canonicalStatus === 'fulfillment_in_progress' && order.readyForPickup ? 'Ready to Ship' : 'Processing';
  if (['partially_shipped', 'shipped'].includes(order.canonicalStatus)) return 'In Transit';
  return orderLabels[order.canonicalStatus];
}
export function orderMoney(amount: number, currency = 'VND') { return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount); }
export function orderRow(order: OrderRecord) {
  return { ...order, date: new Date(order.orderedAt).toLocaleString(), customer: order.buyerSnapshot.name, phone: order.buyerSnapshot.phone, tags: order.metadata.tags, store: order.metadata.store, owner: order.source === 'manual' ? 'Manual order' : 'Example order', warehouse: order.metadata.warehouse, total: orderMoney(order.totals.grandTotal, order.currencyCode), payment: order.payment.state, status: orderDisplayStatus(order), sla: order.sla || 'Not scheduled', slaRisk: order.slaRisk || false, assignee: order.metadata.assignee, reservation: order.reservation || 'Not reserved', carrier: order.shipments[0]?.carrier || 'Not assigned', tracking: order.shipments[0]?.tracking || 'Pending', needsPaymentVerification: !['draft','closed','canceled'].includes(order.canonicalStatus) && order.payment.state === 'Unpaid' && Boolean(order.needsPaymentVerification || order.payment.reference?.trim()), syncError: order.syncError || false, readyForPickup: order.readyForPickup || false, pickupOverdue: order.pickupOverdue || false };
}
export type OrderRow = ReturnType<typeof orderRow>;
export function exportOrders(records: OrderRecord[]) {
  const cell = (v: unknown) => `"${String(v ?? '').replace(/^[=+@\-\t\r]/, "'$&").replace(/"/g, '""')}"`;
  const rows = [['Order', 'Date', 'Customer', 'Phone', 'Channel', 'Warehouse', 'Status', 'Payment', 'Currency', 'Total', 'Tracking', 'Owner'], ...records.map((o) => [o.orderKey, o.orderedAt, o.buyerSnapshot.name, o.buyerSnapshot.phone, o.metadata.store, o.metadata.warehouse, o.canonicalStatus, o.payment.state, o.currencyCode, o.totals.grandTotal, o.shipments.map((s) => s.tracking).join('; '), o.metadata.assignee])];
  const url = URL.createObjectURL(new Blob(['\uFEFF' + rows.map((r) => r.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = 'orders.csv'; a.click(); URL.revokeObjectURL(url);
}

/** Exception signals are independent of the normal order lifecycle. */
export function getOrderAttentionReasons(order: OrderRecord): string[] {
  const reasons: string[] = [];
  if (order.hold?.active) reasons.push(`On hold: ${order.hold.reason}`);
  if (order.shipments.some(s=>s.deliveryOutcome==='failed')) reasons.push('Failed delivery');
  const active = !['draft', 'closed', 'canceled'].includes(order.canonicalStatus);
  if (active && order.payment.state === 'Unpaid' && (order.needsPaymentVerification || order.payment.reference?.trim())) reasons.push('Payment evidence to review');
  if (active && order.reservation === 'Allocation failed') reasons.push('Allocation failed');
  if (active && order.pickupOverdue) reasons.push('Pickup overdue');
  if (active && /breached|overdue/i.test(order.sla || '') && !order.pickupOverdue) reasons.push('Processing overdue');
  if (order.syncError) reasons.push('Channel sync failed');
  if (order.exceptions.some((issue) => issue.status === 'open')) reasons.push('Open exception');
  return reasons;
}

export function orderHandlingLabel(order: OrderRecord) { return order.metadata.handlingType === 'self' ? 'Seller fulfilled' : order.metadata.handlingType === 'marketplace' ? 'Marketplace fulfilled' : 'Not specified'; }
