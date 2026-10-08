import type { OrderRecord, ShipmentTrackingEvent, ShipmentTrackingStatus } from './orders-api';

export const shipmentTrackingLabels: Record<ShipmentTrackingStatus, string> = {
  created: 'Shipment created', ready_for_pickup: 'Awaiting pickup', picked_up: 'Picked up',
  in_transit: 'In transit', out_for_delivery: 'Out for delivery', delivery_failed: 'Delivery failed',
  delivered: 'Delivered', returning: 'Returning to sender', returned: 'Returned to sender',
};
type Shipment = OrderRecord['shipments'][number];

/** Only show recorded milestones. Seller evidence is not a carrier scan. */
export function getShipmentHistory(shipment: Shipment, prototype = false): ShipmentTrackingEvent[] {
  const events = [...(shipment.trackingEvents || [])];
  for (const [status, occurredAt, description] of [
    ['picked_up', shipment.pickedUpAt, shipment.pickupReference],
    ['delivered', shipment.deliveredAt, shipment.deliveryReference],
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
  if (order.source !== 'demo' || order.hold?.active || order.canonicalStatus !== 'shipped' || !shipment.pickedUpAt || order.shipments.length !== 1) return [];
  if (shipment.deliveryOutcome === 'returned' || shipment.deliveryOutcome === 'delivered') return [];
  if (shipment.deliveryOutcome === 'returning') return ['returned'];
  if (shipment.deliveryOutcome === 'failed') return ['out_for_delivery', 'returning'];
  const latest = getShipmentHistory(shipment, true)[0]?.status;
  if (latest === 'out_for_delivery') return ['delivered', 'delivery_failed'];
  if (latest === 'in_transit') return ['out_for_delivery'];
  return ['in_transit'];
}
