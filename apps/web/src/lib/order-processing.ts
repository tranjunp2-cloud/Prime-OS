import { nextWorkflowAction, workflowBlocker as sharedWorkflowBlocker, completionBlocker as sharedCompletionBlocker, workflowLabels as sharedWorkflowLabels, paymentAllowsPreparation } from '../../../../packages/order-workflow/rules.js';
import type { OrderRecord } from './orders-api';
import { prototypeWorkflowOrder } from './order-prototype';
import { prototypePreparation } from './order-preparation';
export type ProcessingAction = 'prepare' | 'record-shipment' | 'pack' | 'handover' | 'delivery' | 'prepare-shipment';
export const workflowLabels = {...sharedWorkflowLabels, 'prepare-shipment': 'Prepare shipment'};
export { paymentAllowsPreparation };
export const workflowBlocker = (order: OrderRecord, action: ProcessingAction) => action === 'prepare-shipment'
  ? prototypePreparation(order)?.action === action ? prototypePreparation(order)!.blocker : 'Shipment preparation is not available at this stage.'
  : sharedWorkflowBlocker(prototypeWorkflowOrder(order), action);
export const completionBlocker = (order: OrderRecord) => sharedCompletionBlocker(prototypeWorkflowOrder(order));
export function orderNextAction(order: OrderRecord) {
  const preparation = prototypePreparation(order);
  if (preparation?.marketplace) return null;
  if (preparation) return {key: 'prepare-shipment' as const, label: workflowLabels['prepare-shipment'], blocker: preparation.blocker};
  if (order.source === 'demo' && order.canonicalStatus === 'shipped' && order.metadata.handlingType === 'marketplace') return {key: 'delivery' as const, label: 'View shipment journey', blocker: null};
  return nextWorkflowAction(prototypeWorkflowOrder(order)) as { key: ProcessingAction; label: string; blocker: string | null } | null;
}
export function orderDeadline(order: OrderRecord) {
  if (!['created', 'acknowledged', 'allocated', 'fulfillment_in_progress'].includes(order.canonicalStatus)) return null;
  const time = Date.parse(order.operations?.shipBy || '');
  return Number.isFinite(time) ? time : null;
}
export function deadlineLabel(order: OrderRecord) {
  if (['shipped', 'delivered', 'closed'].includes(order.canonicalStatus)) return 'Handed over';
  if (order.canonicalStatus === 'canceled') return 'Not applicable';
  const time = orderDeadline(order);
  if (time === null) return order.sla && order.sla !== 'Not scheduled' ? order.sla : 'No deadline';
  const remaining = time - Date.now();
  return `${remaining < 0 ? 'Overdue · ' : remaining <= 86400000 ? 'Due soon · ' : ''}${new Date(time).toLocaleString('en-GB', {day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}`;
}
