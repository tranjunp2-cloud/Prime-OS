import { createPrimeAuthHeaders, resolvePrimeBackendBase } from '@/lib/prime/backend-auth';
import { restoreOrderPrototype, runOrderPrototype } from './order-prototype';
import { orderMappingIssues } from './order-line-resolution';

export type CanonicalStatus = 'draft' | 'created' | 'acknowledged' | 'allocated' | 'fulfillment_in_progress' | 'partially_shipped' | 'shipped' | 'delivered' | 'closed' | 'canceled';
export type ShipmentTrackingStatus = 'created' | 'ready_for_pickup' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivery_failed' | 'delivered' | 'returning' | 'returned' | 'ready_for_collection' | 'collected';
export interface ShipmentTrackingEvent { id: string; status: ShipmentTrackingStatus; occurredAt: string; location?: string; description?: string; source: 'carrier' | 'seller' | 'prototype' }
export interface OrderLine { /** Shop listing identity, used to resolve the Master SKU and warehouse. */ listingId?: string; shopSku?: string; inventory?: { onHand: number; committed: number; reservedForOrder?: number; checkedAt: string; warehouse: string }; imageUrl?: string; variant?: string; id?: string; sku: string; name: string; quantity: number; unitPrice: number; lineTotal?: number }
export interface ManualOrderInput {
  orderKey: string; requestKey: string; canonicalStatus: 'draft' | 'created'; currencyCode: string;
  buyerSnapshot: { name: string; phone: string; email: string; phoneCountry?: string };
  shippingAddressSnapshot: { address: string; city: string; country: string; postalCode: string };
  lines: OrderLine[]; totals: { discount: number; shipping: number; tax: number };
  payment: { state: string; method: string; reference: string; refundedMerchandiseAmount?: number };
  metadata: { handlingType?: 'self' | 'marketplace'; shippingMode?: 'seller' | 'platform'; store: string; warehouse: string; assignee: string; notes: string; tags: string };
}
export interface OrderRecord extends Omit<ManualOrderInput, 'metadata' | 'canonicalStatus' | 'totals'> {
  id: string; marketplaceOrderId?: string; buyerNote?: string; source: string; version: number; canonicalStatus: CanonicalStatus; orderedAt: string;
  hold?: {active:boolean; reason:string; at:string; actor:string};
  operations?: {
    shipBy?: string; carrier?: string; service?: string;
    work?: { preparedAt?: string; preparedBy?: string; stockMode?: 'physical-check'; packedAt?: string; packedBy?: string; labelAttachedAt?: string; verifiedItems?: {lineId: string; quantity: number}[] };
    package?: { weightKg: number; lengthCm: number; widthCm: number; heightCm: number };
    printStatus?: { pickList?: string; shippingLabel?: string; packingSlip?: string };
    settlement?: { platformFees: number; sellerShipping: number; adjustments: number; netAmount: number; status: 'estimated' | 'settled' };
    invoice?: { requested: boolean; company?: string; taxId?: string; address?: string };
  };
  totals: { subtotal?: number; discount?: number; shipping?: number; tax?: number; grandTotal: number };
  metadata: Omit<ManualOrderInput['metadata'], 'tags'> & { tags: string[]; platform?: string; storeName?: string };
  transitions: { fromStatus: string; toStatus: string; reason: string; transitionedAt: string }[];
  shipments: { id?: string; source?: string; service?: string; deliveryMethod?: 'carrier' | 'store_pickup'; collectionMethod?: 'pickup' | 'dropoff'; collectionAt?: string; pickedUpAt?: string; pickupReference?: string; deliveredAt?: string; deliveryReference?: string; deliveryOutcome?: 'in_transit' | 'failed' | 'returning' | 'returned' | 'delivered'; carrier: string; tracking: string; status: string; labelUrl?: string; trackingEvents?: ShipmentTrackingEvent[] }[];
  returnRequests: { id: string; status: string; reason: string; items: unknown[] }[];
  exceptions: { id: string; summary: string; status: string; at: string }[];
  activity: { id: string; at: string; message: string; actor: string }[];
  needsPaymentVerification?: boolean; sla?: string; slaRisk?: boolean; reservation?: string; syncError?: boolean; readyForPickup?: boolean; pickupOverdue?: boolean;
  prototypeStockVersion?: 1; reservationExpiresAt?: string;
}
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = createPrimeAuthHeaders(); if (init.body) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${resolvePrimeBackendBase()}/api/v1/orders${path}`, { ...init, headers });
  const body = await response.json(); if (!response.ok) throw new Error(body.message || 'Order request failed'); return body;
}
export const ordersApi = {
  list: async () => {
    if (import.meta.env.VITE_PRIME_PROTOTYPE === 'true') {
      const { listPrototypeOrders } = await import('./order-prototype-data');
      return {data: listPrototypeOrders(), canWrite: true, currentUserName: 'PrimeOS Admin'};
    }
    const result = await request<{ data: OrderRecord[]; canWrite: boolean; currentUserName?: string }>('');
    return {...result, data: result.data.map(restoreOrderPrototype)};
  },
  create: async (input: ManualOrderInput) => {
    if (import.meta.env.VITE_PRIME_PROTOTYPE === 'true') {
      const { createPrototypeOrder } = await import('./order-prototype-data');
      return {data: createPrototypeOrder(input)};
    }
    return request<{ data: OrderRecord }>('', { method: 'POST', body: JSON.stringify(input) });
  },
  command: async (order: OrderRecord, action: Record<string, unknown>): Promise<{data: OrderRecord}> => {
    if (order.source === 'pos-demo') throw new Error('Manage this counter sale in Prime POS.');
    if (order.source === 'demo') return {data: runOrderPrototype(order, action)};
    if (import.meta.env.VITE_PRIME_PROTOTYPE === 'true') throw new Error('Only sample orders can be changed in the prototype.');
    return request<{ data: OrderRecord }>(`/${encodeURIComponent(order.id)}/actions`, { method: 'POST', body: JSON.stringify({ ...action, version: order.version }) });
  },
};
export const orderStageLabels = {
  confirmation: 'Awaiting confirmation', preparing: 'Preparing', ready: 'Ready to ship',
  shipping: 'Shipping', delivered: 'Delivered', completed: 'Completed',
} as const;
export const orderLabels: Record<CanonicalStatus, string> = { draft: 'Draft', created: orderStageLabels.confirmation, acknowledged: 'Preparing · Confirmed', allocated: 'Preparing · Stock allocated', fulfillment_in_progress: 'Preparing · Packing', partially_shipped: 'Shipping · Partially shipped', shipped: orderStageLabels.shipping, delivered: orderStageLabels.delivered, closed: orderStageLabels.completed, canceled: 'Cancelled' };
export function isReadyToShip(order: OrderRecord) {
  return order.canonicalStatus === 'fulfillment_in_progress' && Boolean(order.readyForPickup);
}
export function orderDisplayStatus(order: OrderRecord): string {
  if (order.canonicalStatus === 'created') return orderStageLabels.confirmation;
  if (['acknowledged', 'allocated', 'fulfillment_in_progress'].includes(order.canonicalStatus)) return isReadyToShip(order) ? orderStageLabels.ready : orderStageLabels.preparing;
  if (['partially_shipped', 'shipped'].includes(order.canonicalStatus)) return orderStageLabels.shipping;
  return orderLabels[order.canonicalStatus];
}
export function orderMoney(amount: number, currency = 'VND') { return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount); }
export function orderRow(order: OrderRecord) {
  return { ...order, date: new Date(order.orderedAt).toLocaleString(), customer: order.buyerSnapshot.name, phone: order.buyerSnapshot.phone, tags: order.metadata.tags, store: order.metadata.store, owner: order.source === 'manual' ? 'Manual order' : 'Example order', warehouse: order.metadata.warehouse, total: orderMoney(order.totals.grandTotal, order.currencyCode), paymentState: order.payment.state, status: orderDisplayStatus(order), sla: order.sla || 'Not scheduled', slaRisk: order.slaRisk || false, assignee: order.metadata.assignee, reservation: order.reservation || 'Not reported', carrier: order.shipments[0]?.carrier || 'Not assigned', tracking: order.shipments[0]?.tracking || 'Pending', needsPaymentVerification: !['draft','closed','canceled'].includes(order.canonicalStatus) && order.payment.state === 'Unpaid' && Boolean(order.needsPaymentVerification || order.payment.reference?.trim()), syncError: order.syncError || false, readyForPickup: order.readyForPickup || false, pickupOverdue: order.pickupOverdue || false };
}
export type OrderRow = ReturnType<typeof orderRow>;
export function orderStockStatusLabel(order: Pick<OrderRecord, 'reservation' | 'canonicalStatus'>) {
  if (order.canonicalStatus === 'draft') return 'Not submitted';
  const labels: Record<string, string> = {
    Reserved: 'Reserved for this order', Dispatched: 'Deducted from stock', Released: 'Reservation released',
    'Allocation failed': 'Not enough stock to reserve', 'Reservation expired': 'Stock reservation expired',
    'Not reserved': 'No stock reserved', 'Not reported': 'Reservation not reported',
  };
  return labels[order.reservation || ''] || order.reservation || 'Reservation not reported';
}
export function exportOrders(records: OrderRecord[]) {
  const cell = (v: unknown) => `"${String(v ?? '').replace(/^[=+@\-\t\r]/, "'$&").replace(/"/g, '""')}"`;
  const rows = [['Order', 'Date', 'Customer', 'Phone', 'Channel', 'Warehouse', 'Status', 'Payment', 'Currency', 'Total', 'Tracking', 'Owner'], ...records.map((o) => [o.orderKey, o.orderedAt, o.buyerSnapshot.name, o.buyerSnapshot.phone, o.metadata.store, o.metadata.warehouse, o.canonicalStatus, o.payment.state, o.currencyCode, o.totals.grandTotal, o.shipments.map((s) => s.tracking).join('; '), o.metadata.assignee])];
  const url = URL.createObjectURL(new Blob(['\uFEFF' + rows.map((r) => r.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = 'orders.csv'; a.click(); URL.revokeObjectURL(url);
}

export interface OrderAttention { code: string; reason: string; reviewAction?: string }

/** Attention can require a review or simply flag urgency without blocking the next step. */
export function getOrderAttention(order: OrderRecord): OrderAttention[] {
  const issues: OrderAttention[] = [];
  const add = (code: string, reason: string, reviewAction?: string) => issues.push({code, reason, reviewAction});
  if (order.hold?.active) add('hold', `On hold: ${order.hold.reason}`, 'Review hold');
  if (orderMappingIssues(order).length) add('product-mapping', 'Needs product mapping', 'Map products');
  if (order.shipments.some(s=>s.deliveryOutcome==='failed')) add('delivery', 'Failed delivery', 'Review delivery');
  const active = !['draft', 'closed', 'canceled'].includes(order.canonicalStatus);
  if (active && order.payment.state === 'Unpaid' && (order.needsPaymentVerification || order.payment.reference?.trim())) add('payment', 'Payment evidence to review', 'Review payment');
  if (active && order.reservation === 'Allocation failed') add('stock', 'Allocation failed', 'Review stock');
  if (active && order.reservation === 'Reservation expired') add('stock-expired', 'Stock reservation expired', 'Review stock');
  if (active && order.pickupOverdue) add('pickup', 'Pickup overdue');
  if (active && /breached|overdue/i.test(order.sla || '') && !order.pickupOverdue) add('overdue', 'Processing overdue');
  if (order.syncError) add('sync', 'Channel sync failed', 'Review sync issue');
  if (order.returnRequests.some(request => request.status.toLowerCase() === 'requested')) add('return-request', 'Return request awaiting review', 'Review return');
  if (order.returnRequests.some(request => ['received', 'awaiting_inspection'].includes(request.status.toLowerCase()))) add('return-inspection', 'Returned items awaiting inspection', 'Review return');
  if (order.canonicalStatus === 'canceled' && order.payment.state === 'Paid') add('refund', 'Cancelled order with payment received', 'Review refund');
  if (order.exceptions.some((issue) => issue.status === 'open')) add('exception', 'Open exception', 'Review issue');
  return issues;
}

export function getOrderAttentionReasons(order: OrderRecord): string[] {
  return getOrderAttention(order).map(issue => issue.reason);
}

export function orderHandlingLabel(order: OrderRecord) { return order.metadata.handlingType === 'self' ? 'Seller fulfilled' : order.metadata.handlingType === 'marketplace' ? 'Marketplace fulfilled' : 'Not specified'; }
