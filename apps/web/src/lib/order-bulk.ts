import { confirmationBlocker as sharedConfirmationBlocker, paymentAndConfirmationBlocker as sharedPaymentAndConfirmationBlocker, packingSlipBlocker } from '../../../../packages/order-workflow/rules.js';
import { isReadyToShip, type OrderRecord } from './orders-api';
import { prototypeWorkflowOrder } from './order-prototype';
import { workflowBlocker } from './order-processing';
import { shippingLabelQueueBlocker } from './order-shipping-label';

export type BatchAction = 'confirm' | 'prepare' | 'handover' | 'print';
export type ActionFilter = 'all' | 'confirm' | 'print' | 'label';
export const actionFilterLabels: Record<ActionFilter, string> = {
  all: 'All actions', confirm: 'Can confirm', print: 'Packing slip not printed', label: 'Shipping label not printed',
};
export { packingSlipBlocker };
export function hasPrintedPackingSlip(order: OrderRecord) {
  return order.operations?.printStatus?.packingSlip?.split('·')[0].trim().toLowerCase() === 'printed';
}
/** A work queue for unprinted slips, separate from permission to print or reprint. */
export function packingSlipQueueBlocker(order: OrderRecord) {
  return packingSlipBlocker(order)
    || (isReadyToShip(order) ? 'This order is already ready to ship. Print from order details if needed.' : null)
    || (hasPrintedPackingSlip(order) ? 'The packing slip is already recorded as printed. Reprint from order details if needed.' : null);
}
export function confirmationBlocker(order: OrderRecord, canWrite: boolean) {
  if (order.source !== 'demo' && !canWrite) return 'Order write access is required.';
  return sharedConfirmationBlocker(prototypeWorkflowOrder(order));
}
export function paymentAndConfirmationBlocker(order: OrderRecord, canWrite: boolean) {
  if (order.source !== 'demo' && !canWrite) return 'Order write access is required.';
  return sharedPaymentAndConfirmationBlocker(prototypeWorkflowOrder(order));
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
  if (action === 'print') return !packingSlipQueueBlocker(order);
  if (action === 'confirm') return !batchBlocker(order, action, canWrite);
  if (action === 'label') return !shippingLabelQueueBlocker(order);
  return true;
}
