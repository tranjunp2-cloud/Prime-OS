import { orderDisplayStatus, type CanonicalStatus, type OrderRecord } from './orders-api';

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
  acknowledged: { title: 'Processing', description: 'The order is confirmed. Assign stock through fulfillment before packing.', focus: 'delivery', reviewLabel: 'Review allocation', stage: 2, tone: 'attention' },
  allocated: { title: 'Processing', description: 'Review the assigned warehouse and fulfillment details before preparing the shipment.', focus: 'delivery', reviewLabel: 'Review fulfillment', stage: 2, tone: 'attention' },
  fulfillment_in_progress: { title: 'Processing', description: 'Follow preparation and handoff in the fulfillment record.', focus: 'delivery', reviewLabel: 'View fulfillment', stage: 2, tone: 'neutral' },
  partially_shipped: { title: 'In Transit', description: 'Check each shipment separately. Some items may still be awaiting handoff.', focus: 'delivery', reviewLabel: 'View shipments', stage: 3, tone: 'attention' },
  shipped: { title: 'In Transit', description: 'Track the shipment and review delivery exceptions. Order confirmation is complete.', focus: 'delivery', reviewLabel: 'Track delivery', stage: 3, tone: 'neutral' },
  delivered: { title: 'Delivered', description: 'Review delivery and payment records before closing the order.', focus: 'payment', reviewLabel: 'Review payment', stage: 4, tone: 'success' },
  closed: { title: 'Completed', description: 'Review the final order, delivery and payment records.', focus: 'activity', reviewLabel: 'View history', stage: 4, tone: 'success' },
  canceled: { title: 'Cancelled', description: 'This order is no longer being fulfilled. Review the cancellation reason and payment record.', focus: 'activity', reviewLabel: 'View cancellation', stage: -1, tone: 'neutral' },
};
export function getOrderDetailStatus(order: OrderRecord): string {
  return orderDisplayStatus(order);
}
export function getOrderDetailSteps(order: OrderRecord) {
  const labels = ['To Confirm', 'Processing', 'Ready to Ship', 'In Transit', 'Delivered', 'Completed'];
  const index = ({draft:-1, created:0, acknowledged:1, allocated:1, fulfillment_in_progress:order.readyForPickup ? 2 : 1, partially_shipped:3, shipped:3, delivered:4, closed:5, canceled:-1})[order.canonicalStatus];
  return labels.map((label,i) => {
    const states = [['created'],['acknowledged'],[],['partially_shipped','shipped'],['delivered'],['closed']][i];
    const event = order.transitions.find((entry) => states.includes(entry.toStatus));
    return {label,current:i===index,passed:i<index,at:event?.transitionedAt};
  });
}
export function getOrderDetailFlow(order: OrderRecord): OrderFlow {
  if (order.hold?.active) return {title:'On hold',description:order.hold.reason,focus:'exceptions',reviewLabel:'Review hold',stage:-1,tone:'attention'};
  if (order.returnRequests.some((r) => !['closed', 'canceled', 'rejected'].includes(r.status))) {
    return { title: 'Return in progress', description: 'Review the return request separately from the original order and its payment status.', focus: 'returns', reviewLabel: 'Review return', stage: -1, tone: 'attention' };
  }
  if (getOrderDetailStatus(order) === 'Ready to Ship') return {...flows.fulfillment_in_progress, title:'Ready to Ship', description:'Packing is complete. The order is waiting for carrier pickup.'};
  return flows[order.canonicalStatus];
}
export function getOrderDetailPermissions(order: OrderRecord, canWrite: boolean) {
  const editable = canWrite && order.source !== 'demo';
  const early = ['draft', 'created', 'acknowledged'].includes(order.canonicalStatus);
  const terminal = ['closed', 'canceled'].includes(order.canonicalStatus);
  return {
    editable,
    ownerAndNotes: canWrite,
    editDraft: editable && !order.hold?.active && order.canonicalStatus === 'draft',
    submit: editable && !order.hold?.active && order.canonicalStatus === 'draft',
    confirm: editable && !order.hold?.active && order.canonicalStatus === 'created',
    cancel: editable && !order.hold?.active && early,
    warehouse: editable && early,
    payment: editable && !terminal && order.payment.state !== 'Paid' && order.payment.state !== 'Refunded',
    close: editable && !order.hold?.active && order.canonicalStatus === 'delivered' && order.payment.state === 'Paid' && !order.returnRequests.some((r) => !['closed', 'canceled', 'rejected'].includes(r.status)),
  };
}
export function getOrderActivity(order: OrderRecord) {
  return [
    ...order.activity.map((e) => ({ key: e.id, at: e.at, title: e.message, detail: e.actor ? `Recorded by ${e.actor}` : '' })),
    ...order.transitions.map((t, index) => ({ key: `transition-${index}`, at: t.transitionedAt, title: `${t.fromStatus.replace(/_/g, ' ')} → ${t.toStatus.replace(/_/g, ' ')}`, detail: t.reason || '' })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}
