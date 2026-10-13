import { isReadyToShip, type OrderRecord } from './orders-api';
import { activeReturn, paymentAllowsPreparation } from '../../../../packages/order-workflow/rules.js';
import { isStorePickup } from './order-shipment-history';

export function shippingLabelUrl(order: OrderRecord, shipment: OrderRecord['shipments'][number]): string | undefined {
  const url = shipment.labelUrl;
  if (url?.startsWith('https://')) return url;
  // Demo documents are local assets, never carrier documents or externally generated URLs.
  if (order.source === 'demo' && url && /^\/samples\/orders\/shipping-label\.html(?:\?|$)/.test(url)) return url;
  return undefined;
}

/** Original outbound labels that have not been handed to a carrier. */
export function pendingShippingLabels(order: OrderRecord) {
  return order.shipments.filter(shipment => !isStorePickup(shipment)
    && !shipment.pickedUpAt && !shipment.deliveredAt && !shipment.deliveryOutcome
    && !shipment.trackingEvents?.some(event => !['created', 'ready_for_pickup'].includes(event.status))
    && ['created', 'shipment created', 'ready_for_pickup', 'awaiting pickup', 'ready to ship'].includes(shipment.status.trim().toLowerCase())
    && shippingLabelUrl(order, shipment));
}

/** Daily dispatch queue; historical label access stays in order details. */
export function shippingLabelQueueBlocker(order: OrderRecord): string | null {
  if (order.metadata.handlingType !== 'self') return 'The marketplace warehouse handles labels for this order.';
  if (!['acknowledged', 'allocated', 'fulfillment_in_progress'].includes(order.canonicalStatus)) return 'This order is not preparing for carrier handover.';
  if (isReadyToShip(order)) return 'This order is already ready to ship. Access its label from order details if needed.';
  if (order.hold?.active || order.exceptions.some(issue => issue.status === 'open')) return 'Resolve the hold or open issues before printing shipping labels.';
  if (activeReturn(order) || order.shipments.some(shipment => ['returning', 'returned'].includes(shipment.deliveryOutcome || ''))) return 'Resolve the return before printing outbound shipping labels.';
  if (!paymentAllowsPreparation(order)) return 'Payment must be resolved before printing a shipping label.';
  if (order.syncError || ['Allocation failed', 'Reservation expired'].includes(order.reservation || '')) return 'Resolve the order issues before printing shipping labels.';
  if (order.operations?.printStatus?.shippingLabel?.split('·')[0].trim().toLowerCase() === 'printed') return 'The shipping label is already recorded as printed.';
  if (order.operations?.work?.labelAttachedAt) return 'The shipping label is already attached to the parcel.';
  if (!pendingShippingLabels(order).length) return 'No shipping label is awaiting printing for carrier handover.';
  return null;
}
