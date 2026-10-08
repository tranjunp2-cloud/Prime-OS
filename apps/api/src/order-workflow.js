import { randomUUID } from 'node:crypto';
import { workflowBlocker } from '../../../packages/order-workflow/rules.js';

function reject(message) { throw Object.assign(new Error(message), { statusCode: 409 }); }
function required(value, label, max = 1000) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) reject(`${label} is required.`);
  return value.trim();
}
function eventTime(input, order) {
  const at = input.occurredAt ? Date.parse(input.occurredAt) : Date.now();
  if (!Number.isFinite(at) || at > Date.now() + 300000 || at < Date.parse(order.orderedAt) - 300000) reject('Enter a valid event time after the order was placed, not in the future.');
  const previous = input.action === 'delivery' ? order.shipments[0]?.pickedUpAt : order.operations?.work?.packedAt;
  if (previous && at < Date.parse(previous)) reject('Event time cannot be earlier than the preceding fulfillment step.');
  return new Date(at).toISOString();
}
function positive(value, label, max) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > max) reject(`${label} must be greater than zero and no more than ${max}.`);
  return value;
}
export function applyOrderWorkflow(order, input, actor, allOrders) {
  const reason = workflowBlocker(order, input.action);
  if (reason) reject(reason);
  const now = new Date().toISOString();
  order.operations ||= {};
  const work = order.operations.work ||= {};
  function transition(status, reason) {
    if (order.canonicalStatus === status) return;
    order.transitions.push({ fromStatus: order.canonicalStatus, toStatus: status, reason, transitionedAt: now });
    order.canonicalStatus = status;
  }
  if (input.action === 'prepare') {
    const warehouse = required(input.warehouse || order.metadata.warehouse, 'Dispatch warehouse');
    if (warehouse.toLowerCase() === 'unassigned') reject('Choose the dispatch warehouse before preparing.');
    if (input.shipBy) {
      if (!Number.isFinite(Date.parse(input.shipBy))) reject('Enter a valid ship-by deadline.');
      order.operations.shipBy = new Date(input.shipBy).toISOString();
    }
    order.metadata.warehouse = warehouse;
    Object.assign(work, { preparedAt: now, preparedBy: actor, stockMode: 'physical-check' });
    transition('fulfillment_in_progress', 'Preparation started; verify physical stock before packing');
    return `Preparation started at ${warehouse}. Inventory was not reserved.`;
  }
  if (input.action === 'record-shipment') {
    const carrier = required(input.carrier, 'Carrier', 120);
    const tracking = required(input.tracking, 'Carrier-issued tracking number', 150);
    if (allOrders.some(other => other.id !== order.id && other.shipments.some(shipment => shipment.carrier.toLowerCase() === carrier.toLowerCase() && shipment.tracking.toLowerCase() === tracking.toLowerCase()))) reject('This carrier tracking number is already attached to another order.');
    let labelUrl;
    if (input.labelUrl) {
      try {
        const url = new URL(required(input.labelUrl, 'Shipping label URL', 8000));
        if (url.protocol !== 'https:' || url.username || url.password) reject('Use an HTTPS link to the carrier-issued shipping label.');
        labelUrl = url.href;
      } catch { reject('Use an HTTPS link to the carrier-issued shipping label.'); }
    }
    if (!['pickup', 'dropoff'].includes(input.collectionMethod)) reject('Choose carrier pickup or drop-off.');
    if (input.collectionAt && !Number.isFinite(Date.parse(input.collectionAt))) reject('Enter a valid collection time.');
    const service = required(input.service, 'Shipping service', 120);
    order.shipments.push({ id: `shipment_${randomUUID()}`, carrier, tracking, service, labelUrl, status: 'Awaiting packing', source: 'manual', collectionMethod: input.collectionMethod, collectionAt: input.collectionAt ? new Date(input.collectionAt).toISOString() : undefined, recordedAt: now, recordedBy: actor });
    Object.assign(order.operations, { carrier, service });
    return `Carrier shipment recorded: ${carrier} · ${tracking}. Pickup must be arranged with the carrier.`;
  }
  if (input.action === 'pack') {
    if (!Array.isArray(input.items) || input.items.length !== order.lines.length) reject('Verify every order line before completing packing.');
    const checked = new Map();
    for (const item of input.items) {
      if (checked.has(item.lineId)) reject('Each order line must be verified once.');
      checked.set(item.lineId, item.quantity);
    }
    for (const [index, line] of order.lines.entries()) {
      if (checked.get(line.id || String(index)) !== line.quantity) reject(`Verify all ${line.quantity} units of ${line.sku}.`);
    }
    if (input.labelAttached !== true) reject('Confirm that the carrier shipping label is attached.');
    const parcel = input.package || {};
    order.operations.package = { weightKg: positive(parcel.weightKg, 'Weight (kg)', 1000), lengthCm: positive(parcel.lengthCm, 'Length (cm)', 500), widthCm: positive(parcel.widthCm, 'Width (cm)', 500), heightCm: positive(parcel.heightCm, 'Height (cm)', 500) };
    Object.assign(work, { packedAt: now, packedBy: actor, verifiedItems: input.items.map(item => ({ lineId: item.lineId, quantity: item.quantity })), labelAttachedAt: now });
    order.readyForPickup = true;
    order.shipments[0].status = 'Awaiting pickup';
    return 'All items verified, parcel packed and carrier label attached. Ready for pickup.';
  }
  if (input.action === 'handover') {
    if (input.carrierAccepted !== true) reject('Confirm the carrier has accepted the parcel.');
    const reference = required(input.reference, 'Carrier pickup evidence / Reference');
    const at = eventTime(input, order);
    Object.assign(order.shipments[0], { status: 'In transit', deliveryOutcome: 'in_transit', pickedUpAt: at, pickupReference: reference, pickupRecordedBy: actor });
    order.readyForPickup = false;
    order.pickupOverdue = false;
    transition('shipped', 'Carrier acceptance recorded by seller');
    return `Carrier pickup recorded with evidence: ${reference}`;
  }
  if (input.action === 'delivery') {
    const reference = required(input.reference, 'Delivery evidence / Reference');
    const at = eventTime(input, order);
    Object.assign(order.shipments[0], { status: 'Delivered', deliveryOutcome: 'delivered', deliveredAt: at, deliveryReference: reference, deliveryRecordedBy: actor });
    transition('delivered', 'Delivery evidence recorded by seller');
    return `Delivery recorded with evidence: ${reference}`;
  }
  reject('Unsupported fulfillment action.');
}
