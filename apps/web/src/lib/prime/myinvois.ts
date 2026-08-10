import type { Order, OrderEvent, OrderItem } from '@/lib/oms-types';

export type MyInvoisEnvironment = 'sandbox' | 'production' | 'not_applicable';
export type MyInvoisMode = 'taxpayer' | 'intermediary' | 'not_required';
export type MyInvoisReadinessState =
  | 'not_required'
  | 'draft'
  | 'missing_buyer_tax_profile'
  | 'buyer_tin_invalid'
  | 'ready_to_submit'
  | 'submitted'
  | 'valid'
  | 'invalid'
  | 'cancelled'
  | 'credit_note_required';

export type MyInvoisEvidenceStatus = 'missing' | 'uploaded' | 'verified' | 'rejected' | 'reusable';

export interface MyInvoisDocumentReference {
  submissionUid: string | null;
  documentUuid: string | null;
  longId: string | null;
  validatedAt: string | null;
  cancellationWindowEndsAt: string | null;
}

export interface MyInvoisOrderReadiness {
  orderId: string;
  sourceType: 'order';
  scopeLabel: string;
  environment: MyInvoisEnvironment;
  mode: MyInvoisMode;
  state: MyInvoisReadinessState;
  stateLabel: string;
  reason: string;
  nextAction: string;
  blockingFields: string[];
  evidenceFields: string[];
  itemCount: number;
  totalAmount: number;
  currency: string;
  sourceDocumentCode: string;
  reference: MyInvoisDocumentReference;
  matchedInvoiceCount: number;
  submittedCount: number;
  validatedCount: number;
  invalidCount: number;
  notRequired: boolean;
}

export interface MyInvoisEvidenceSummary {
  evidenceStatus: MyInvoisEvidenceStatus;
  summaryLine: string;
  coverageLabel: string;
  candidateCount: number;
  validCount: number;
  submittedCount: number;
  draftCount: number;
  invalidCount: number;
  notRequiredCount: number;
  verifiedAmount: number;
  blockingFields: string[];
}

type MyInvoisOrderSource = Pick<
  Order,
  | 'id'
  | 'order_id'
  | 'status'
  | 'lifecycle_stage'
  | 'channel'
  | 'currency'
  | 'total_amount'
  | 'customer_name'
  | 'customer_email'
  | 'customer_phone'
  | 'shipping_address'
  | 'ship_to'
  | 'allocated_warehouse_id'
  | 'warehouse_id'
  | 'updated_at'
> & {
  ship_to?: Order['ship_to'];
};

function normalizeCountry(value: string | null | undefined) {
  return String(value || '').trim().toUpperCase();
}

function stableToken(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36).toUpperCase().padStart(8, '0');
}

function humanizeState(state: MyInvoisReadinessState) {
  return state.replace(/_/g, ' ');
}

function isMalaysiaScopedOrder(order: MyInvoisOrderSource) {
  const shipCountry = normalizeCountry(order.ship_to?.country);
  const address = String(order.shipping_address || '').toLowerCase();
  const email = String(order.customer_email || '').toLowerCase();
  const warehouse = String(order.allocated_warehouse_id || order.warehouse_id || '').toLowerCase();

  return (
    shipCountry === 'MY' ||
    address.includes('malaysia') ||
    email.endsWith('.my') ||
    warehouse.includes('my')
  );
}

function hasBuyerProfile(order: MyInvoisOrderSource) {
  return Boolean(
    String(order.customer_name || '').trim().length > 1 &&
    (String(order.customer_email || '').trim().length > 3 || String(order.customer_phone || '').trim().length > 6),
  );
}

function hasBuyerAddress(order: MyInvoisOrderSource) {
  return Boolean(
    order.ship_to?.address1 &&
    order.ship_to?.city &&
    order.ship_to?.postal_code &&
    order.ship_to?.country,
  );
}

function hasLineItems(itemCount: number) {
  return itemCount > 0;
}

function makeReference(order: MyInvoisOrderSource, prefix: string) {
  return `${prefix}-${stableToken(`${order.order_id}|${order.total_amount}|${order.updated_at}`)}`;
}

function addHours(base: string | null | undefined, hours: number) {
  const timestamp = Date.parse(base || '') || Date.now();
  return new Date(timestamp + hours * 60 * 60 * 1000).toISOString();
}

export function buildMyInvoisOrderReadiness(
  order: MyInvoisOrderSource,
  items: OrderItem[] = [],
  events: OrderEvent[] = [],
): MyInvoisOrderReadiness {
  const itemCount = items.length;
  const malaysiaScope = isMalaysiaScopedOrder(order);
  const buyerProfileReady = hasBuyerProfile(order);
  const buyerAddressReady = hasBuyerAddress(order);
  const lineItemsReady = hasLineItems(itemCount);
  const scopeLabel = malaysiaScope ? 'Malaysia pilot scope' : 'Outside Malaysia scope';
  const sourceDocumentCode = `INV-${order.order_id}`;
  const evidenceFields = ['orders', 'items', 'customer-profile'];
  const blockingFields: string[] = [];

  if (malaysiaScope) {
    if (!lineItemsReady) blockingFields.push('Line items');
    if (!buyerProfileReady) blockingFields.push('Buyer profile');
    if (!buyerAddressReady) blockingFields.push('Buyer address');
  }

  let state: MyInvoisReadinessState = 'not_required';
  let reason = 'MyInvois is not required for this order in the current snapshot.';
  let nextAction = 'No Malaysia invoice action required.';
  let environment: MyInvoisEnvironment = 'not_applicable';
  let mode: MyInvoisMode = 'not_required';

  if (malaysiaScope) {
    environment = 'sandbox';
    mode = 'taxpayer';

    if (!lineItemsReady || !buyerProfileReady || !buyerAddressReady) {
      state = 'missing_buyer_tax_profile';
      reason = 'Malaysia-scope order is missing buyer profile, address, or line items needed for invoice readiness.';
      nextAction = 'Complete the buyer profile before issuing the invoice draft.';
    } else if (order.status === 'cancelled') {
      state = 'cancelled';
      reason = 'Order is cancelled, so the invoice is no longer active.';
      nextAction = 'Keep the cancellation record and do not submit a new invoice.';
    } else if (order.status === 'returned' || order.lifecycle_stage === 'return_in_progress') {
      state = 'credit_note_required';
      reason = 'Return flow requires a credit note or refund note against the original invoice.';
      nextAction = 'Create the correct note flow before closing the return.';
    } else if (
      order.status === 'pending' ||
      order.lifecycle_stage === 'captured' ||
      order.lifecycle_stage === 'validated'
    ) {
      state = 'draft';
      reason = 'Invoice draft can be prepared, but the order still needs operational readiness.';
      nextAction = 'Prepare the invoice draft and validate the buyer tax profile.';
    } else if (
      order.status === 'ready_to_ship' ||
      order.lifecycle_stage === 'allocated' ||
      order.lifecycle_stage === 'reserved'
    ) {
      state = 'ready_to_submit';
      reason = 'Order is ready for MyInvois submission once the connector is connected.';
      nextAction = 'Submit the invoice after connector approval.';
    } else if (
      order.status === 'shipping' ||
      order.lifecycle_stage === 'released_to_fulfillment' ||
      order.lifecycle_stage === 'shipped'
    ) {
      state = 'submitted';
      reason = 'Invoice has moved into the submitted state and is waiting for validation.';
      nextAction = 'Poll submission status and capture the validation result.';
    } else if (
      order.status === 'completed' ||
      order.lifecycle_stage === 'delivered' ||
      order.lifecycle_stage === 'closed'
    ) {
      state = 'valid';
      reason = 'Completed order has a valid invoice evidence path for finance and audit.';
      nextAction = 'Use the validated invoice as finance evidence and keep the UUID trace.';
    } else {
      state = 'ready_to_submit';
      reason = 'Order has enough commerce evidence to prepare a MyInvois submission.';
      nextAction = 'Prepare the invoice and route it for approval.';
    }
  }

  const validationEvent = events.find((event) => event.event_type === 'delivered' || event.event_type === 'note');
  const validatedAt = state === 'valid' ? addHours(validationEvent?.created_at || order.updated_at, 1) : null;

  const reference: MyInvoisDocumentReference = {
    submissionUid: state === 'submitted' || state === 'valid' || state === 'invalid'
      ? makeReference(order, 'SUB')
      : null,
    documentUuid: state === 'submitted' || state === 'valid' || state === 'invalid'
      ? makeReference(order, 'UUID')
      : null,
    longId: state === 'submitted' || state === 'valid' || state === 'invalid'
      ? makeReference(order, 'LONG')
      : null,
    validatedAt,
    cancellationWindowEndsAt: state === 'valid'
      ? addHours(order.updated_at, 72)
      : null,
  };

  return {
    orderId: order.id,
    sourceType: 'order',
    scopeLabel,
    environment,
    mode,
    state,
    stateLabel: humanizeState(state),
    reason,
    nextAction,
    blockingFields,
    evidenceFields,
    itemCount,
    totalAmount: order.total_amount,
    currency: order.currency,
    sourceDocumentCode,
    reference,
    matchedInvoiceCount: state === 'valid' || state === 'submitted' ? 1 : 0,
    submittedCount: state === 'submitted' || state === 'valid' || state === 'invalid' ? 1 : 0,
    validatedCount: state === 'valid' ? 1 : 0,
    invalidCount: state === 'invalid' ? 1 : 0,
    notRequired: state === 'not_required',
  };
}

export function buildMyInvoisEvidenceSummary(
  orders: MyInvoisOrderSource[],
  items: OrderItem[] = [],
  events: OrderEvent[] = [],
): MyInvoisEvidenceSummary {
  const itemsByOrder = new Map<string, OrderItem[]>();
  const eventsByOrder = new Map<string, OrderEvent[]>();

  items.forEach((item) => {
    const rows = itemsByOrder.get(item.order_id) || [];
    rows.push(item);
    itemsByOrder.set(item.order_id, rows);
  });
  events.forEach((event) => {
    const rows = eventsByOrder.get(event.order_id) || [];
    rows.push(event);
    eventsByOrder.set(event.order_id, rows);
  });

  const readiness = orders.map((order) => buildMyInvoisOrderReadiness(
    order,
    itemsByOrder.get(order.id) || [],
    eventsByOrder.get(order.id) || [],
  ));
  const candidateReadiness = readiness.filter((item) => !item.notRequired);
  const validCount = candidateReadiness.filter((item) => item.state === 'valid').length;
  const submittedCount = candidateReadiness.filter((item) => item.state === 'submitted').length;
  const draftCount = candidateReadiness.filter((item) => item.state === 'draft' || item.state === 'ready_to_submit').length;
  const invalidCount = candidateReadiness.filter((item) => item.state === 'invalid' || item.state === 'buyer_tin_invalid').length;
  const notRequiredCount = readiness.length - candidateReadiness.length;
  const verifiedAmount = candidateReadiness
    .filter((item) => item.state === 'valid')
    .reduce((sum, item) => sum + item.totalAmount, 0);
  const blockingFields = Array.from(new Set(candidateReadiness.flatMap((item) => item.blockingFields)));

  let evidenceStatus: MyInvoisEvidenceStatus = 'missing';
  if (validCount > 0) {
    evidenceStatus = 'verified';
  } else if (invalidCount > 0) {
    evidenceStatus = 'rejected';
  } else if (submittedCount > 0 || draftCount > 0) {
    evidenceStatus = 'uploaded';
  } else if (candidateReadiness.length > 0) {
    evidenceStatus = 'uploaded';
  }

  return {
    evidenceStatus,
    summaryLine: candidateReadiness.length > 0
      ? `${validCount}/${candidateReadiness.length} Malaysia-scope invoice(s) are valid, with ${submittedCount} still submitted and ${draftCount} still in draft or ready state.`
      : 'No Malaysia-scope invoice activity detected in this snapshot.',
    coverageLabel: candidateReadiness.length > 0
      ? `${validCount}/${candidateReadiness.length} MyInvois-valid invoice(s)`
      : 'No Malaysia-scope invoices',
    candidateCount: candidateReadiness.length,
    validCount,
    submittedCount,
    draftCount,
    invalidCount,
    notRequiredCount,
    verifiedAmount,
    blockingFields,
  };
}
