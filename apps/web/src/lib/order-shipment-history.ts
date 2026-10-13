import type { OrderRecord, ShipmentTrackingEvent, ShipmentTrackingStatus } from './orders-api';

export const shipmentTrackingLabels: Record<ShipmentTrackingStatus, string> = {
  created: 'Shipment created', ready_for_pickup: 'Awaiting pickup', picked_up: 'Picked up',
  in_transit: 'In transit', out_for_delivery: 'Out for delivery', delivery_failed: 'Delivery failed',
  delivered: 'Delivered', returning: 'Returning to sender', returned: 'Returned to sender',
  ready_for_collection: 'Ready for collection', collected: 'Collected by customer',
};
type Shipment = OrderRecord['shipments'][number];
export const isStorePickup = (shipment: Shipment) => shipment.deliveryMethod === 'store_pickup' || (!shipment.deliveryMethod && shipment.carrier.trim().toLowerCase() === 'store pickup');
export const isStorePickupOrder = (order: OrderRecord) => order.shipments.length > 0
  ? order.shipments.every(isStorePickup)
  : order.operations?.carrier?.trim().toLowerCase() === 'store pickup';

export function shipmentTrackingLabel(status: ShipmentTrackingStatus, storePickup = false) {
  if (storePickup && status === 'created') return 'Pickup arranged';
  if (storePickup && status === 'delivered') return 'Collected by customer';
  return shipmentTrackingLabels[status];
}

export function shipmentReference(order: OrderRecord, shipment: Shipment) {
  const pickup = isStorePickup(shipment);
  // Old pickup examples used a carrier-shaped placeholder. Show the actual order reference instead.
  if (pickup && (!shipment.tracking || (order.source === 'demo' && /^DEMO-GHN-\d+$/.test(shipment.tracking)))) {
    return {label: 'Order reference', value: order.orderKey};
  }
  return {label: pickup ? 'Pickup reference' : 'Tracking number', value: shipment.tracking};
}

/** Only show recorded milestones. Seller evidence is not a carrier scan. */
export function getShipmentHistory(shipment: Shipment, prototype = false): ShipmentTrackingEvent[] {
  const events = [...(shipment.trackingEvents || [])];
  const pickup = isStorePickup(shipment);
  for (const [status, occurredAt, description] of [
    ['picked_up', pickup ? undefined : shipment.pickedUpAt, shipment.pickupReference],
    [pickup ? 'collected' : 'delivered', shipment.deliveredAt, shipment.deliveryReference],
  ] as const) {
    if (occurredAt && !events.some(event => event.status === status && event.occurredAt === occurredAt)) events.push({id: `recorded-${status}`, status, occurredAt, description, source: prototype ? 'prototype' : 'seller'});
  }
  const seen = new Set<string>();
  return events.filter(event => {
    if (seen.has(event.id)) return false;
    seen.add(event.id); return true;
  }).sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));
}

export function prototypeTrackingOptions(order: OrderRecord, shipment: Shipment): ShipmentTrackingStatus[] {
  if (order.source !== 'demo' || isStorePickup(shipment) || order.hold?.active || order.canonicalStatus !== 'shipped' || !shipment.pickedUpAt || order.shipments.length !== 1) return [];
  if (shipment.deliveryOutcome === 'returned' || shipment.deliveryOutcome === 'delivered') return [];
  if (shipment.deliveryOutcome === 'returning') return ['returned'];
  if (shipment.deliveryOutcome === 'failed') return ['out_for_delivery', 'returning'];
  const latest = getShipmentHistory(shipment, true)[0]?.status;
  if (latest === 'out_for_delivery') return ['delivered', 'delivery_failed'];
  if (latest === 'in_transit') return ['out_for_delivery'];
  return ['in_transit'];
}
