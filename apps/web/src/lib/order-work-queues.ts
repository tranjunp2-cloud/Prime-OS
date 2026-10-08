import { getOrderAttentionReasons, isReadyToShip, orderStageLabels, type OrderRecord } from './orders-api';

export type OrderQueue = 'all' | 'draft' | 'pending' | 'ready' | 'shipping' | 'delivered' | 'completed' | 'returns' | 'cancelled';
export const workQueues: { key: OrderQueue; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: orderStageLabels.confirmation },
  { key: 'ready', label: 'To ship' },
  { key: 'shipping', label: orderStageLabels.shipping },
  { key: 'delivered', label: orderStageLabels.delivered },
  { key: 'completed', label: orderStageLabels.completed },
  { key: 'returns', label: 'Returns & refunds' },
  { key: 'cancelled', label: 'Cancelled' },
];

export function hasActiveReturn(order: OrderRecord) {
  return order.returnRequests.some(request => !['closed', 'canceled', 'cancelled', 'rejected', 'completed', 'refunded'].includes(request.status.toLowerCase()));
}

export function hasReturnHistory(order: OrderRecord) {
  return order.returnRequests.length > 0 || /refunded/i.test(order.payment.state)
    || order.shipments.some(shipment => ['returning', 'returned'].includes(shipment.deliveryOutcome || ''));
}

/** Primary groups partition submitted orders; return history alone does not change their stage. */
export function orderQueue(order: OrderRecord): OrderQueue {
  if (order.canonicalStatus === 'draft') return 'draft';
  if (order.canonicalStatus === 'canceled') return 'cancelled';
  if (hasActiveReturn(order) || /refunded/i.test(order.payment.state)
    || order.shipments.some(shipment => ['returning', 'returned'].includes(shipment.deliveryOutcome || ''))) return 'returns';
  if (order.canonicalStatus === 'created') return 'pending';
  if (['acknowledged', 'allocated', 'fulfillment_in_progress'].includes(order.canonicalStatus)) return 'ready';
  if (['partially_shipped', 'shipped'].includes(order.canonicalStatus)) return 'shipping';
  return order.canonicalStatus === 'delivered' ? 'delivered' : 'completed';
}

export function matchesOrderQueue(order: OrderRecord, queue: OrderQueue) {
  return queue === 'all' ? order.canonicalStatus !== 'draft' : orderQueue(order) === queue;
}

const queueFilters: Partial<Record<OrderQueue, { key: string; label: string }[]>> = {
  pending: [{ key: 'awaiting-payment', label: 'Awaiting payment' }],
  ready: [{ key: 'preparing', label: orderStageLabels.preparing }, { key: 'pickup', label: orderStageLabels.ready }],
  shipping: [{ key: 'transit', label: 'On the way' }, { key: 'failed', label: 'Delivery failed' }],
  returns: [{ key: 'requested', label: 'Return requested' }, { key: 'returning', label: 'On the way back' }, { key: 'received', label: 'Return received' }, { key: 'refunded', label: 'Refunded' }],
};

export function getQueueFilters(queue: OrderQueue) {
  return [...(queueFilters[queue] || []), { key: 'review', label: 'Needs review' }];
}

export function matchesQueueFilter(order: OrderRecord, filter: string) {
  switch (filter) {
    case 'awaiting-payment': return order.payment.state === 'Unpaid' && order.payment.method !== 'COD';
    case 'review': return getOrderAttentionReasons(order).length > 0;
    case 'preparing': return orderQueue(order) === 'ready' && !isReadyToShip(order);
    case 'pickup': return isReadyToShip(order);
    case 'failed': return order.shipments.some(shipment => shipment.deliveryOutcome === 'failed');
    case 'transit': return !order.shipments.some(shipment => shipment.deliveryOutcome === 'failed');
    case 'requested': return order.returnRequests.some(request => ['requested', 'authorized'].includes(request.status));
    case 'returning': return order.shipments.some(shipment => shipment.deliveryOutcome === 'returning');
    case 'received': return order.returnRequests.some(request => ['received', 'inspected', 'disposed'].includes(request.status)) || order.shipments.some(shipment => shipment.deliveryOutcome === 'returned');
    case 'refunded': return /refunded/i.test(order.payment.state);
    default: return true;
  }
}
