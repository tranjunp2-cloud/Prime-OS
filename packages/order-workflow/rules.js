// Shared eligibility rules: the UI and API must agree before a seller acts.
export const workflowLabels = {
  prepare: 'Prepare order',
  'record-shipment': 'Add carrier shipment',
  pack: 'Pack & verify',
  handover: 'Record carrier pickup',
  delivery: 'Record delivery',
};
export const workflowActions = Object.keys(workflowLabels);
export function activeReturn(order) {
  return (order.returnRequests || []).some(item => !['closed', 'canceled', 'cancelled', 'rejected', 'completed', 'refunded'].includes(item.status.toLowerCase()));
}
export function paymentAllowsPreparation(order) {
  return order.payment.state === 'Paid' || (order.payment.state === 'Unpaid' && order.payment.method === 'COD');
}
export function confirmationBlocker(order) {
  if (order.source !== 'manual') return 'Confirm this order in Seller Center until channel actions are connected.';
  if (order.canonicalStatus !== 'created') return 'This order is not awaiting confirmation.';
  if (order.hold?.active) return 'Release the order hold before confirming.';
  if (!order.lines.length) return 'Add order items before confirming.';
  if (activeReturn(order)) return 'Resolve the active return before confirming.';
  if (order.exceptions.some(item => item.status === 'open')) return 'Resolve the open issues before confirming.';
  if (order.syncError) return 'Resolve the channel sync error before confirming.';
  if (order.reservation === 'Allocation failed') return 'Review the stock allocation failure before confirming.';
  if (order.payment.state === 'Unpaid' && (order.needsPaymentVerification || order.payment.reference?.trim())) return 'Review the payment evidence before confirming.';
  return null;
}
// Eligibility for the packing queue. Historical reprints remain a separate action.
export function packingSlipBlocker(order) {
  if (order.metadata.handlingType !== 'self') return 'Packing slips in this queue are for seller-fulfilled orders.';
  if (!['acknowledged', 'allocated', 'fulfillment_in_progress'].includes(order.canonicalStatus)) return 'Confirm the order first, or use Reprint for a dispatched order.';
  if (!order.lines.length) return 'This order has no items to print.';
  if (order.hold?.active) return 'Release the order hold before printing.';
  if (activeReturn(order) || order.shipments.some(item => ['returning', 'returned'].includes(item.deliveryOutcome))) return 'Resolve the return before preparing packing slips.';
  if (order.exceptions.some(item => item.status === 'open')) return 'Resolve the open issues before printing for packing.';
  return null;
}
export function completionBlocker(order) {
  if (order.source !== 'manual') return 'Completion is managed by the order source.';
  if (order.hold?.active) return 'Release the order hold first.';
  if (order.canonicalStatus !== 'delivered') return 'The order must be delivered before completion.';
  if (order.payment.state !== 'Paid') return 'Record the payment received before completing this order.';
  if (activeReturn(order)) return 'Resolve the active return before completing this order.';
  if (order.exceptions.some(item => item.status === 'open')) return 'Resolve the open issues before completing this order.';
  if (order.shipments.some(item => item.deliveryOutcome !== 'delivered')) return 'All shipments must be delivered before completion.';
  return null;
}
export function workflowBlocker(order, action) {
  if (!workflowActions.includes(action)) return 'Unknown order action.';
  if (order.source === 'demo') return 'Sample orders cannot be processed.';
  if (order.source !== 'manual') return 'Process this order in Seller Center until channel actions are connected.';
  if (order.metadata.handlingType === 'marketplace') return 'This order is fulfilled by a marketplace warehouse. Await its fulfillment update.';
  if (order.hold?.active) return 'Release the order hold before processing.';
  if (activeReturn(order)) return 'Resolve the active return before processing.';
  if (['draft', 'created', 'closed', 'canceled'].includes(order.canonicalStatus)) return 'This action is not available at the current order stage.';
  if (order.canonicalStatus === 'partially_shipped' || order.shipments.length > 1) return 'Split shipments require separate fulfillment handling.';
  if (['prepare', 'record-shipment', 'pack', 'handover'].includes(action)) {
    if (order.exceptions.some(item => item.status === 'open')) return 'Resolve the open issues before processing.';
    if (!paymentAllowsPreparation(order)) return 'Record payment before preparing a prepaid order. Unpaid COD orders can proceed.';
  }
  const work = order.operations?.work;
  if (action === 'prepare') {
    const unrecordedPreparation = order.canonicalStatus === 'fulfillment_in_progress' && !work?.preparedAt && !order.shipments.length && !order.readyForPickup;
    if (!['acknowledged', 'allocated'].includes(order.canonicalStatus) && !unrecordedPreparation) return 'Preparation evidence is missing. Review the existing shipment before continuing.';
    if (!order.lines.length) return 'Add order items before preparing.';
  } else if (action === 'record-shipment') {
    if (order.canonicalStatus !== 'fulfillment_in_progress' || !work?.preparedAt) return 'Prepare the order before adding a shipment.';
    if (order.shipments.length) return 'A shipment already exists. Review it before continuing.';
    if (order.metadata.shippingMode === 'platform') return 'Arrange shipping in Seller Center; platform shipment synchronization is not connected yet.';
  } else if (action === 'pack') {
    if (order.canonicalStatus !== 'fulfillment_in_progress' || !work?.preparedAt) return 'Prepare the order first.';
    if (work.packedAt) return 'Packing is already confirmed.';
    if (!order.shipments[0]?.tracking) return 'Add the carrier shipment before verifying packing.';
  } else if (action === 'handover') {
    if (order.canonicalStatus !== 'fulfillment_in_progress' || !order.readyForPickup || !work?.packedAt) return 'Verify all items and attach the carrier label before pickup.';
    if (!order.shipments[0]?.tracking) return 'A carrier tracking number is required.';
  } else if (action === 'delivery') {
    if (order.canonicalStatus !== 'shipped' || !order.shipments[0]?.pickedUpAt) return 'Record carrier pickup before delivery.';
  }
  return null;
}
export function nextWorkflowAction(order) {
  let key;
  if (['acknowledged', 'allocated'].includes(order.canonicalStatus)) key = 'prepare';
  else if (order.canonicalStatus === 'fulfillment_in_progress') {
    key = !order.operations?.work?.preparedAt ? 'prepare' : !order.shipments.length ? 'record-shipment' : !order.operations?.work?.packedAt ? 'pack' : 'handover';
  } else if (order.canonicalStatus === 'shipped') key = 'delivery';
  if (!key) return null;
  return { key, label: workflowLabels[key], blocker: workflowBlocker(order, key) };
}
