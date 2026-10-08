import { confirmationBlocker as sharedConfirmationBlocker, packingSlipBlocker } from '../../../../packages/order-workflow/rules.js';
import type { OrderRecord } from './orders-api';
import { prototypeWorkflowOrder } from './order-prototype';
import { workflowBlocker } from './order-processing';

export type BatchAction = 'confirm' | 'prepare' | 'handover' | 'print';
export type ActionFilter = 'all' | 'confirm' | 'print' | 'label';
export const actionFilterLabels: Record<ActionFilter, string> = {
  all: 'All actions', confirm: 'Can confirm', print: 'Can print packing slips', label: 'Shipping label available',
};
export { packingSlipBlocker };
export function confirmationBlocker(order: OrderRecord, canWrite: boolean) {
  if (order.source !== 'demo' && !canWrite) return 'Order write access is required.';
  return sharedConfirmationBlocker(prototypeWorkflowOrder(order));
}
export function batchBlocker(order: OrderRecord, action: BatchAction, canWrite: boolean, warehouse = '') {
  if (action === 'print') return packingSlipBlocker(order);
  if (action === 'confirm') return confirmationBlocker(order, canWrite);
  if (order.source !== 'demo' && !canWrite) return 'Order write access is required.';
  const blocker = workflowBlocker(order, action);
  if (blocker) return blocker;
  if (action === 'prepare' && !(warehouse.trim() || (order.metadata.warehouse !== 'Unassigned' && order.metadata.warehouse.trim()))) return 'Choose a dispatch warehouse.';
  return null;
}
export function matchesActionFilter(order: OrderRecord, action: ActionFilter, canWrite: boolean) {
  if (action === 'confirm' || action === 'print') return !batchBlocker(order, action, canWrite);
  if (action === 'label') return order.shipments.some(shipment => shipment.labelUrl?.startsWith('https://'));
  return true;
}
