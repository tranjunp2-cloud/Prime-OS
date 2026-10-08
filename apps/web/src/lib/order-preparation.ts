import { activeReturn } from '../../../../packages/order-workflow/rules.js';
import type { OrderRecord } from './orders-api';

export function preparationPaymentKind(order: OrderRecord) {
  return order.payment.method === 'Card' ? 'gateway' : 'manual';
}

export function preparationPackageError(parcel: NonNullable<OrderRecord['operations']>['package']) {
  if (!parcel) return null;
  const {weightKg, lengthCm, widthCm, heightCm} = parcel;
  return [weightKg, lengthCm, widthCm, heightCm].some(value => !Number.isFinite(value) || value <= 0)
    || weightKg > 1000 || [lengthCm, widthCm, heightCm].some(value => value > 500)
    ? 'Enter a weight between 0 and 1,000 kg and each dimension between 0 and 500 cm, or leave all measurements empty.'
    : null;
}

export function prototypePreparation(order: OrderRecord) {
  if (order.source !== 'demo' || !['acknowledged', 'allocated', 'fulfillment_in_progress'].includes(order.canonicalStatus)) return null;
  const marketplace = order.metadata.handlingType === 'marketplace';
  if (!marketplace && order.readyForPickup) return null;
  const blocker = order.hold?.active ? 'Release the order hold first.'
    : activeReturn(order) ? 'Resolve the active return first.'
    : order.exceptions.some(issue => issue.status === 'open') ? 'Resolve the open issues first.'
    : order.shipments.length > 1 ? 'Review split shipments separately.'
    : !order.lines.length ? 'Add order items before preparing.' : null;
  return {marketplace, blocker, action: marketplace ? order.readyForPickup ? 'marketplace-handover' : 'marketplace-ready' : 'prepare-shipment'} as const;
}
