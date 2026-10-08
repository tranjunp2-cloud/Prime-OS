import { completionBlocker } from './order-processing';
import { confirmationBlocker } from './order-bulk';
import { hasActiveReturn } from './order-work-queues';
import { orderLabels, orderStageLabels, orderDisplayStatus, type CanonicalStatus, type OrderRecord } from './orders-api';

export type DetailTab = 'overview' | 'items' | 'payment' | 'delivery' | 'returns' | 'activity' | 'exceptions';
export interface OrderFlow {
  title: string;
  description: string;
  focus: DetailTab;
  reviewLabel: string;
  stage: number;
  tone: 'neutral' | 'attention' | 'success';
}
const flows: Record<CanonicalStatus, OrderFlow> = {
  draft: { title: 'Draft', description: 'Review the customer, delivery address and items before submitting this order.', focus: 'items', reviewLabel: 'Review items', stage: 0, tone: 'neutral' },
  created: { title: 'Order needs confirmation', description: 'Check the order details and payment terms before confirming.', focus: 'items', reviewLabel: 'Review items', stage: 1, tone: 'attention' },
  acknowledged: { title: orderStageLabels.preparing, description: 'The order is confirmed. Choose the dispatch warehouse and verify physical stock before packing.', focus: 'delivery', reviewLabel: 'Review allocation', stage: 2, tone: 'attention' },
  allocated: { title: orderStageLabels.preparing, description: 'Review the assigned warehouse and fulfillment details before preparing the shipment.', focus: 'delivery', reviewLabel: 'Review fulfillment', stage: 2, tone: 'attention' },
  fulfillment_in_progress: { title: orderStageLabels.preparing, description: 'Add the carrier shipment, verify the items and finish packing.', focus: 'delivery', reviewLabel: 'View fulfillment', stage: 2, tone: 'neutral' },
  partially_shipped: { title: orderStageLabels.shipping, description: 'Check each shipment separately. Some items may still be awaiting handoff.', focus: 'delivery', reviewLabel: 'View shipments', stage: 3, tone: 'attention' },
  shipped: { title: orderStageLabels.shipping, description: 'Track the shipment and review delivery exceptions. Order confirmation is complete.', focus: 'delivery', reviewLabel: 'Track delivery', stage: 3, tone: 'neutral' },
  delivered: { title: 'Delivered', description: 'Review delivery and payment records before closing the order.', focus: 'payment', reviewLabel: 'Review payment', stage: 4, tone: 'success' },
  closed: { title: 'Completed', description: 'Review the final order, delivery and payment records.', focus: 'activity', reviewLabel: 'View history', stage: 4, tone: 'success' },
  canceled: { title: 'Cancelled', description: 'This order is no longer being fulfilled. Review the cancellation reason and payment record.', focus: 'activity', reviewLabel: 'View cancellation', stage: -1, tone: 'neutral' },
};
export function getOrderDetailStatus(order: OrderRecord): string {
  return orderDisplayStatus(order);
}
export function getOrderDetailSteps(order: OrderRecord) {
  const labels = Object.values(orderStageLabels);
  const index = ({draft:-1, created:0, acknowledged:1, allocated:1, fulfillment_in_progress:order.readyForPickup ? 2 : 1, partially_shipped:3, shipped:3, delivered:4, closed:5, canceled:-1})[order.canonicalStatus];
  return labels.map((label,i) => {
    const states = [['created'],['acknowledged'],[],['partially_shipped','shipped'],['delivered'],['closed']][i];
    const event = order.transitions.find((entry) => states.includes(entry.toStatus));
    const recordedAt = i === 0 ? order.orderedAt : i === 2 ? order.operations?.work?.packedAt : undefined;
    return {label,current:i===index,passed:i<index,at:event?.transitionedAt || recordedAt};
  });
}
export function getOrderDetailFlow(order: OrderRecord): OrderFlow {
  if (order.hold?.active) return {title:'On hold',description:order.hold.reason,focus:'exceptions',reviewLabel:'Review hold',stage:-1,tone:'attention'};
  if (hasActiveReturn(order)) {
    return { title: 'Return in progress', description: 'Review the return request separately from the original order and its payment status.', focus: 'returns', reviewLabel: 'Review return', stage: -1, tone: 'attention' };
  }
  if (getOrderDetailStatus(order) === orderStageLabels.ready) return {...flows.fulfillment_in_progress, title:orderStageLabels.ready, description:'Packing is complete. The order is waiting for carrier pickup.'};
  return flows[order.canonicalStatus];
}
export function getOrderDetailPermissions(order: OrderRecord, canWrite: boolean) {
  const editable = order.source === 'demo' || (canWrite && order.source === 'manual');
  const early = ['draft', 'created', 'acknowledged'].includes(order.canonicalStatus);
  const terminal = ['closed', 'canceled'].includes(order.canonicalStatus);
  return {
    editable,
    ownerAndNotes: canWrite || order.source === 'demo',
    editDraft: editable && order.source !== 'demo' && !order.hold?.active && order.canonicalStatus === 'draft',
    submit: editable && !order.hold?.active && order.canonicalStatus === 'draft',
    confirm: !confirmationBlocker(order, canWrite),
    cancel: editable && !order.hold?.active && early,
    warehouse: editable && early,
    payment: editable && !terminal && !['Paid', 'Refunded', 'Partially refunded'].includes(order.payment.state),
    close: editable && !completionBlocker(order),
  };
}
export function getOrderActivity(order: OrderRecord) {
  const statusLabel = (status: string) => orderLabels[status as CanonicalStatus] || status.replace(/_/g, ' ');
  return [
    ...order.activity.map((e) => ({ key: e.id, at: e.at, title: e.message, detail: e.actor ? `Recorded by ${e.actor}` : '' })),
    ...order.transitions.map((t, index) => ({ key: `transition-${index}`, at: t.transitionedAt, title: `${statusLabel(t.fromStatus)} → ${statusLabel(t.toStatus)}`, detail: t.reason || '' })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}
