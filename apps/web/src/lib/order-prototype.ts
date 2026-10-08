import { completionBlocker, confirmationBlocker, paymentAllowsPreparation, workflowActions, workflowBlocker, type WorkflowAction } from '../../../../packages/order-workflow/rules.js';
import type { CanonicalStatus, OrderRecord, ShipmentTrackingStatus } from './orders-api';
import { prototypeTrackingOptions, shipmentTrackingLabels } from './order-shipment-history';
import { preparationPackageError, preparationPaymentKind, prototypePreparation } from './order-preparation';

const storageKey = 'prime.order-prototype.v1';
type Session = { initial: OrderRecord; current: OrderRecord };
let memory: Record<string, Session> = {};
function sessions(): Record<string, Session> {
  try { return JSON.parse(sessionStorage.getItem(storageKey) || '{}'); } catch { return memory; }
}
function save(session: Session) {
  memory = {...sessions(), [session.current.id]: session};
  try { sessionStorage.setItem(storageKey, JSON.stringify(memory)); } catch { /* The prototype still works in memory. */ }
}
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

/** Only the local simulator uses manual rules; the actual record remains a demo. */
export function prototypeWorkflowOrder(order: OrderRecord): OrderRecord {
  return order.source === 'demo' ? {...order, source: 'manual'} : order;
}
export function restoreOrderPrototype(order: OrderRecord): OrderRecord {
  if (order.source !== 'demo') return order;
  const session = sessions()[order.id];
  return session?.initial.source === 'demo' && session.current.source === 'demo' && session.initial.version === order.version ? copy(session.current) : order;
}
function assertDemo(order: OrderRecord) {
  if (order.source !== 'demo') throw new Error('Prototype actions are available only for sample orders.');
}
function required(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required.`);
  return value.trim();
}

export function restartOrderPrototype(order: OrderRecord): OrderRecord {
  assertDemo(order);
  const initial = copy(sessions()[order.id]?.initial || order);
  const current = copy(initial);
  const now = new Date().toISOString();
  Object.assign(current, {canonicalStatus: 'created', version: order.version + 1, orderedAt: now, shipments: [], transitions: [], returnRequests: [], exceptions: [], hold: undefined, readyForPickup: false, pickupOverdue: false, syncError: false, slaRisk: false, sla: 'Not scheduled', reservation: 'Not reserved', needsPaymentVerification: false});
  current.payment = current.metadata.handlingType === 'marketplace' || current.metadata.shippingMode === 'platform' || preparationPaymentKind(current) === 'gateway' ? copy(initial.payment) : {...current.payment, state: 'Unpaid', reference: ''};
  current.operations = {...current.operations, work: undefined, shipBy: new Date(Date.now() + 86400000).toISOString(), printStatus: {pickList: 'Not printed', shippingLabel: 'Not printed', packingSlip: 'Not printed'}};
  if (current.operations.settlement) current.operations.settlement.status = 'estimated';
  current.activity = [{id: crypto.randomUUID(), at: now, actor: 'Prototype', message: 'Prototype restarted — awaiting confirmation'}];
  save({initial, current});
  return copy(current);
}

/** Local-only command handler: never calls an API, carrier, payment or inventory service. */
export function runOrderPrototype(order: OrderRecord, input: Record<string, unknown>): OrderRecord {
  assertDemo(order);
  const existing = sessions()[order.id];
  if (existing && existing.current.version !== order.version) throw new Error('Prototype changed. Refresh this order and try again.');
  const current = applyPrototypeCommand(order, input);
  save({initial: existing?.initial || copy(order), current});
  return copy(current);
}

// Build the complete update before saving: a failed preparation leaves every field unchanged.
function applyPrototypeCommand(order: OrderRecord, input: Record<string, unknown>, packageOptional = false): OrderRecord {
  if (['prepare-shipment', 'marketplace-ready', 'marketplace-handover'].includes(String(input.action))) return applyPreparation(order, input);
  const current = copy(order);
  const now = new Date().toISOString();
  const action = String(input.action);
  const workflowOrder = prototypeWorkflowOrder(current);
  if (workflowActions.includes(action as WorkflowAction)) {
    const blocker = workflowBlocker(workflowOrder, action as WorkflowAction);
    if (blocker) throw new Error(blocker);
  }
  const transition = (toStatus: CanonicalStatus) => {
    current.transitions.push({fromStatus: current.canonicalStatus, toStatus, reason: 'Prototype simulation', transitionedAt: now});
    current.canonicalStatus = toStatus;
  };
  const track = (status: ShipmentTrackingStatus, location?: string, description?: string) => {
    const shipment = current.shipments[0];
    shipment.trackingEvents ||= [];
    shipment.trackingEvents.unshift({id: crypto.randomUUID(), status, occurredAt: now, location, description, source: 'prototype'});
  };
  let message: string;
  switch (action) {
    case 'transition': {
      const to = input.toStatus as CanonicalStatus;
      const allowed: Partial<Record<CanonicalStatus, CanonicalStatus[]>> = {draft: ['created', 'canceled'], created: ['acknowledged', 'canceled'], acknowledged: ['canceled'], delivered: ['closed']};
      if (current.hold?.active || !allowed[current.canonicalStatus]?.includes(to)) throw new Error('This step is not available at the current order stage.');
      if (to === 'closed') { const blocker = completionBlocker(workflowOrder); if (blocker) throw new Error(blocker); }
      if (to === 'acknowledged') { const blocker = confirmationBlocker(workflowOrder); if (blocker) throw new Error(blocker); }
      if (to === 'canceled') required(input.reason, 'Cancellation reason');
      transition(to);
      message = `Prototype status updated to ${to}`;
      break;
    }
    case 'payment':
      if (['closed', 'canceled'].includes(current.canonicalStatus) || current.payment.state !== 'Unpaid') throw new Error('Payment cannot be recorded at this stage.');
      current.payment = {...current.payment, state: 'Paid', reference: required(input.reference, 'Sample payment reference')};
      current.needsPaymentVerification = false;
      message = 'Payment received (simulated)';
      break;
    case 'gateway-payment':
      if (preparationPaymentKind(current) !== 'gateway' || !['Unpaid', 'Pending', 'Authorized'].includes(current.payment.state) || ['closed', 'canceled'].includes(current.canonicalStatus)) throw new Error('A gateway payment update is not available for this order.');
      current.payment = {...current.payment, state: 'Paid', reference: `DEMO-GATEWAY-${current.orderKey}`};
      current.needsPaymentVerification = false;
      message = 'Payment gateway reported payment received (simulated)';
      break;
    case 'prepare':
      current.metadata.warehouse = required(input.warehouse, 'Dispatch warehouse');
      if (current.metadata.warehouse === 'Unassigned') throw new Error('Choose a dispatch warehouse.');
      current.operations = {...current.operations, work: {preparedAt: now, preparedBy: 'Prototype', stockMode: 'physical-check'}};
      if (input.shipBy) current.operations.shipBy = new Date(String(input.shipBy)).toISOString();
      transition('fulfillment_in_progress');
      message = 'Preparation started (simulated)';
      break;
    case 'record-shipment': {
      const carrier = required(input.carrier, 'Carrier');
      const service = required(input.service, 'Service');
      const tracking = required(input.tracking, 'Sample tracking number');
      current.shipments = [{id: `prototype-${crypto.randomUUID()}`, source: 'prototype', carrier, service, tracking, status: 'Awaiting packing', collectionMethod: input.collectionMethod === 'dropoff' ? 'dropoff' : 'pickup'}];
      current.operations = {...current.operations, carrier, service};
      track('created', current.metadata.warehouse, 'Sample tracking number created. No carrier booking.');
      message = 'Shipment created (simulated; no carrier booking)';
      break;
    }
    case 'pack': {
      const items = input.items as {lineId: string; quantity: number}[];
      if (!Array.isArray(items) || items.length !== current.lines.length || new Set(items.map(item => item.lineId)).size !== items.length || current.lines.some((line, i) => !items.some(item => item.lineId === (line.id || String(i)) && item.quantity === line.quantity))) throw new Error('Verify all units before finishing packing.');
      if (input.labelAttached !== true) throw new Error('Confirm the sample shipping label is attached.');
      const parcel = input.package as NonNullable<OrderRecord['operations']>['package'];
      if (!parcel && !packageOptional) throw new Error('Enter the parcel weight and dimensions.');
      const parcelError = preparationPackageError(parcel);
      if (parcelError) throw new Error(parcelError);
      current.operations = {...current.operations, package: parcel, work: {...current.operations?.work, packedAt: now, packedBy: 'Prototype', verifiedItems: items, labelAttachedAt: now}};
      current.readyForPickup = true;
      current.shipments[0].status = 'Awaiting pickup';
      track('ready_for_pickup', current.metadata.warehouse, 'Parcel packed and ready for pickup.');
      message = 'Packing verified — ready to ship (simulated)';
      break;
    }
    case 'handover':
      if (input.carrierAccepted !== true) throw new Error('Confirm the simulated carrier pickup.');
      Object.assign(current.shipments[0], {status: 'In transit', deliveryOutcome: 'in_transit', pickedUpAt: now, pickupReference: required(input.reference, 'Sample pickup reference')});
      current.readyForPickup = false;
      current.pickupOverdue = false;
      transition('shipped');
      track('picked_up', current.metadata.warehouse, String(input.reference));
      message = 'Carrier pickup (simulated)';
      break;
    case 'delivery':
      Object.assign(current.shipments[0], {status: 'Delivered', deliveryOutcome: 'delivered', deliveredAt: now, deliveryReference: required(input.reference, 'Sample delivery reference')});
      transition('delivered');
      track('delivered', 'Sample delivery address', String(input.reference));
      message = 'Delivery successful (simulated)';
      break;
    case 'carrier-update': {
      const shipment = current.shipments[0];
      const status = input.status as ShipmentTrackingStatus;
      if (!shipment || (shipment.id || shipment.tracking) !== input.shipmentKey || !prototypeTrackingOptions(current, shipment).includes(status)) throw new Error('This tracking update is not available at the current shipment stage.');
      shipment.status = shipmentTrackingLabels[status];
      const descriptions: Partial<Record<ShipmentTrackingStatus, string>> = {
        in_transit: 'Parcel scanned at the sorting hub.', out_for_delivery: 'Courier is delivering the parcel.',
        delivery_failed: 'Recipient unavailable. Awaiting another attempt or return.',
        delivered: 'Parcel delivered to the recipient.', returning: 'Delivery failed. Parcel is on its way back to the sender.',
        returned: 'Carrier reports the parcel returned. Warehouse inspection and refund are still separate steps.',
      };
      const location = status === 'in_transit' ? 'Sample sorting hub' : status === 'returning' ? 'Sample return hub' : status === 'returned' ? current.metadata.warehouse : 'Sample delivery area';
      track(status, location, descriptions[status]);
      if (status === 'delivered') {
        Object.assign(shipment, {deliveryOutcome: 'delivered', deliveredAt: now, deliveryReference: 'Simulated carrier delivery confirmation'});
        transition('delivered');
      } else if (status === 'delivery_failed') shipment.deliveryOutcome = 'failed';
      else if (status === 'returning') {
        shipment.deliveryOutcome = 'returning';
        current.returnRequests.push({id: `prototype-return-${crypto.randomUUID()}`, status: 'in_transit', reason: 'Failed delivery — return to sender (simulated)', items: current.lines.map(line => ({sku: line.sku, quantity: line.quantity}))});
      } else if (status === 'returned') {
        shipment.deliveryOutcome = 'returned';
        // A carrier return scan is not warehouse receipt, stock restocking or a refund.
        const request = current.returnRequests.find(item => item.status === 'in_transit');
        if (request) request.status = 'awaiting_inspection';
      } else shipment.deliveryOutcome = 'in_transit';
      message = `Carrier update (simulated): ${shipmentTrackingLabels[status]}`;
      break;
    }
    case 'note': current.metadata.notes = String(input.note || ''); message = 'Internal note updated'; break;
    case 'assign': current.metadata.assignee = required(input.assignee, 'Owner'); message = 'Owner updated'; break;
    case 'warehouse': current.metadata.warehouse = required(input.warehouse, 'Warehouse'); message = 'Dispatch warehouse updated'; break;
    case 'hold':
      if (!['created', 'acknowledged', 'allocated', 'fulfillment_in_progress'].includes(current.canonicalStatus)) throw new Error('Only orders before dispatch can be held.');
      current.hold = {active: true, reason: required(input.reason, 'Hold reason'), actor: 'Prototype', at: now}; message = 'Order put on hold'; break;
    case 'release-hold':
      if (!current.hold?.active) throw new Error('Order is not on hold.');
      required(input.reason, 'Release reason'); current.hold.active = false; message = 'Order hold released'; break;
    case 'exception': current.exceptions.push({id: crypto.randomUUID(), at: now, status: 'open', summary: required(input.summary, 'Issue')}); message = 'Issue recorded'; break;
    case 'resolve-exception': {
      const issue = current.exceptions.find(item => item.id === input.exceptionId);
      if (!issue) throw new Error('Issue not found.');
      issue.status = 'resolved'; message = 'Issue resolved'; break;
    }
    default: throw new Error('This action is not supported by the prototype.');
  }
  current.version += 1;
  current.activity.unshift({id: crypto.randomUUID(), at: now, actor: 'Prototype', message});
  return copy(current);
}

function applyPreparation(order: OrderRecord, input: Record<string, unknown>): OrderRecord {
  const preparation = prototypePreparation(order);
  if (!preparation || preparation.action !== input.action) throw new Error('This preparation action is not available for this order.');
  if (preparation.blocker) throw new Error(preparation.blocker);
  const marketplace = preparation.marketplace;
  let working = copy(order);
  // Only this simulated platform response supplies warehouse work/shipment data on its behalf.
  working.metadata = {...working.metadata, handlingType: 'self', shippingMode: 'seller'};
  if (marketplace) working.payment = {...working.payment, state: 'Paid'};
  if (input.action === 'marketplace-handover') {
    const at = new Date().toISOString();
    working.operations = {...working.operations, work: {...working.operations?.work, preparedAt: working.operations?.work?.preparedAt || at, packedAt: working.operations?.work?.packedAt || at}};
    working = applyPrototypeCommand(working, {action: 'handover', carrierAccepted: true, reference: 'Simulated marketplace pickup confirmation'});
  } else {
    if (!paymentAllowsPreparation(working)) {
      if (preparationPaymentKind(working) === 'gateway') {
        if (input.paymentUpdate !== 'gateway-paid') throw new Error('Simulate the gateway payment update before preparing this card order.');
        working = applyPrototypeCommand(working, {action: 'gateway-payment'});
      } else {
        if (input.paymentReceived !== true) throw new Error('Confirm the payment received before marking this prepaid order ready.');
        working = applyPrototypeCommand(working, {action: 'payment', reference: input.paymentReference});
      }
    }
    if (!working.operations?.work?.preparedAt) {
      const shipments = working.shipments;
      working.shipments = [];
      working.readyForPickup = false;
      working = applyPrototypeCommand(working, {action: 'prepare', warehouse: marketplace ? order.metadata.warehouse && order.metadata.warehouse !== 'Unassigned' ? order.metadata.warehouse : 'Marketplace warehouse' : input.warehouse});
      working.shipments = shipments;
    }
    if (!marketplace && order.metadata.shippingMode !== 'platform' && input.shipBy) working.operations = {...working.operations, shipBy: new Date(String(input.shipBy)).toISOString()};
    if (!working.shipments.length) {
      const platform = marketplace || order.metadata.shippingMode === 'platform';
      working = applyPrototypeCommand(working, {action: 'record-shipment', carrier: platform ? order.operations?.carrier || 'Platform carrier' : input.carrier, service: platform ? order.operations?.service || 'Standard' : input.service, tracking: platform ? `DEMO-PLATFORM-${order.orderKey}` : input.tracking, collectionMethod: input.collectionMethod || 'pickup'});
    }
    working = applyPrototypeCommand(working, {action: 'pack', labelAttached: marketplace || input.labelAttached === true, package: marketplace ? order.operations?.package : Object.prototype.hasOwnProperty.call(input, 'package') ? input.package : order.operations?.package, items: marketplace ? order.lines.map((line, i) => ({lineId: line.id || String(i), quantity: line.quantity})) : input.items}, true);
  }
  working.metadata = {...working.metadata, handlingType: order.metadata.handlingType, shippingMode: order.metadata.shippingMode};
  if (marketplace) {
    working.payment = copy(order.payment);
    working.activity.unshift({id: crypto.randomUUID(), at: new Date().toISOString(), actor: 'Prototype marketplace', message: input.action === 'marketplace-ready' ? 'Marketplace packed the order and assigned its shipment (simulated)' : 'Marketplace handed the parcel to the carrier (simulated)'});
  }
  return working;
}
