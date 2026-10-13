import fs from 'node:fs';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { applyOrderWorkflow } from './order-workflow.js';
import { workflowActions, completionBlocker, confirmationBlocker, paymentAndConfirmationBlocker } from '../../../packages/order-workflow/rules.js';
import { demoOrders } from './orders-demo.js';
import { hydrateDemoShipmentHistory } from '../../../packages/order-workflow/demo-orders.js';
import { validateManualOrder } from '../../../packages/order-workflow/manual-order.js';
export { validateManualOrder } from '../../../packages/order-workflow/manual-order.js';

// Generic transitions never bypass the validated fulfillment commands below.
export const orderTransitions = {
  draft: ['created', 'canceled'], created: ['acknowledged', 'canceled'],
  acknowledged: ['allocated', 'canceled'], allocated: ['fulfillment_in_progress', 'canceled'],
  fulfillment_in_progress: ['partially_shipped', 'shipped', 'canceled'],
  partially_shipped: ['shipped', 'delivered', 'canceled'], shipped: ['delivered'],
  delivered: ['closed'], canceled: [], closed: [],
};
function fail(message, statusCode = 400) { throw Object.assign(new Error(message), { statusCode }); }
function text(value, label, required = false) {
  if (typeof value !== 'string' || value.length > 1000 || (required && !value.trim())) fail(`${label} is required or invalid.`);
  return value.trim();
}
function amount(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1e12) fail(`${label} must be a non-negative number.`);
  return value;
}

const seed = demoOrders;
export function createOrderStore(filePath = process.env.PRIME_ORDER_STORE_PATH || path.resolve('data/orders.json')) {
  function read() {
    try {
      const db = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const examples = demoOrders();
      db.orders = db.orders.map((order) => order.source === 'demo' && order.demoVersion !== 4 ? examples.find((sample) => sample.id === order.id) || order : order);
      db.orders = db.orders.map(order => hydrateDemoShipmentHistory(order, examples.find(sample => sample.id === order.id)));
      if (db.orders.some((order) => order.source === 'demo')) {
        for (const sample of examples) if (!db.orders.some((order) => order.id === sample.id)) db.orders.push(sample);
      }
      return db;
    }
    catch (error) { if (error.code !== 'ENOENT') throw error; return { orders: seed() }; }
  }
  function save(db) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const tmp = `${filePath}.${randomUUID()}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2)); fs.renameSync(tmp, filePath);
  }
  function record(order, message, actor) { order.activity.unshift({ id: randomUUID(), at: new Date().toISOString(), message, actor }); }
  return {
    list: () => read().orders,
    create(input, actor) {
      const validated = validateManualOrder(input);
      const db = read(); const existing = db.orders.find((o) => o.orderKey === validated.orderKey);
      if (existing) {
        if (existing.requestKey === input.requestKey) return existing;
        fail('Order reference already exists.', 409);
      }
      const now = new Date().toISOString();
      const order = { ...validated, id: `ord_${randomUUID()}`, requestKey: text(input.requestKey, 'Request key', true), source: 'manual', version: 1, orderedAt: now, transitions: [], shipments: [], returnRequests: [], exceptions: [], activity: [] };
      record(order, `Manual order ${validated.canonicalStatus === 'draft' ? 'saved as draft' : 'created'}`, actor);
      db.orders.unshift(order); save(db); return order;
    },
    command(id, input, actor) {
      const db = read(); const order = db.orders.find((o) => o.id === id);
      if (!order) fail('Order not found.', 404);
      if (order.source === 'demo' && !['assign', 'note'].includes(input.action)) fail('Only owner and internal notes can be edited on sample orders.', 409);
      const requestId = input.requestId ? text(input.requestId, 'Request ID', true) : null;
      const { version: ignoredVersion, requestId: ignoredRequestId, ...requestBody } = input;
      const fingerprint = createHash('sha256').update(JSON.stringify(requestBody)).digest('hex');
      const receipt = requestId && order.commandReceipts?.find(item => item.id === requestId && item.actor === actor);
      if (receipt) {
        if (receipt.fingerprint !== fingerprint) fail('Request ID was already used for another command.', 409);
        return order;
      }
      if (input.version !== order.version) fail('Order changed. Refresh before trying again.', 409);
      if (order.hold?.active && ['transition','edit-draft'].includes(input.action)) fail('Release the order hold before processing this order.', 409);
      if (workflowActions.includes(input.action)) {
        record(order, applyOrderWorkflow(order, input, actor, db.orders), actor);
      } else if (input.action === 'hold') {
        if (!['created','acknowledged','allocated','fulfillment_in_progress'].includes(order.canonicalStatus)) fail('Only orders before dispatch can be held.',409);
        if (order.hold?.active) fail('Order is already on hold.',409);
        order.hold={active:true,reason:text(input.reason,'Hold reason',true),at:new Date().toISOString(),actor};
        record(order,`Order held: ${order.hold.reason}`,actor);
      } else if (input.action === 'release-hold') {
        if (!order.hold?.active) fail('Order is not on hold.',409);
        const reason=text(input.reason,'Release reason',true);
        order.hold={...order.hold,active:false}; record(order,`Hold released: ${reason}`,actor);
      } else if (input.action === 'edit-draft') {
        if (order.canonicalStatus !== 'draft') fail('Only draft orders can be edited.', 409);
        const validated = validateManualOrder(input.order);
        if (db.orders.some((o) => o.id !== id && o.orderKey === validated.orderKey)) fail('Order reference already exists.', 409);
        Object.assign(order, validated);
        record(order, validated.canonicalStatus === 'draft' ? 'Draft updated' : 'Draft submitted', actor);
      } else if (input.action === 'transition') {
        if (order.source !== 'manual') fail('Lifecycle updates must come from the order source.', 409);
        if (input.toStatus === 'acknowledged') { const blocker = confirmationBlocker(order); if (blocker) fail(blocker, 409); }
        if (input.toStatus === 'closed') { const blocker = completionBlocker(order); if (blocker) fail(blocker, 409); }
        if (!orderTransitions[order.canonicalStatus]?.includes(input.toStatus)) fail('This status transition is not allowed.', 409);
        if (!['created', 'acknowledged', 'canceled', 'closed'].includes(input.toStatus)) fail('Use the fulfillment service to allocate or ship this order.', 409);
        if (input.toStatus === 'canceled' && !['draft', 'created', 'acknowledged'].includes(order.canonicalStatus)) fail('Cancel fulfillment and release reservations first.', 409);
        const reason = text(input.reason || '', 'Reason', input.toStatus === 'canceled');
        order.transitions.push({ fromStatus: order.canonicalStatus, toStatus: input.toStatus, reason, transitionedAt: new Date().toISOString() });
        order.canonicalStatus = input.toStatus; record(order, `Status → ${input.toStatus}${reason ? `: ${reason}` : ''}`, actor);
      } else if (input.action === 'confirm-payment-order') {
        const blocker = paymentAndConfirmationBlocker(order);
        if (blocker) fail(blocker, 409);
        if (input.paymentReceived !== true) fail('Verify that the payment was received before confirming this order.');
        const reference = text(input.reference, 'Payment evidence/reference', true);
        order.payment = {...order.payment, state: 'Paid', reference};
        order.needsPaymentVerification = false;
        record(order, 'Payment confirmed with reference', actor);
        order.transitions.push({fromStatus: 'created', toStatus: 'acknowledged', reason: 'Payment and order confirmed together', transitionedAt: new Date().toISOString()});
        order.canonicalStatus = 'acknowledged';
        record(order, 'Order confirmed — ready to prepare', actor);
      } else if (input.action === 'payment') {
        if (['canceled', 'closed'].includes(order.canonicalStatus) || ['Paid', 'Refunded', 'Partially refunded'].includes(order.payment.state)) fail('Payment cannot be confirmed in this state.', 409);
        order.payment = { ...order.payment, state: 'Paid', reference: text(input.reference, 'Payment evidence/reference', true) }; record(order, 'Payment confirmed with reference', actor);
      } else if (input.action === 'assign') {
        order.metadata.assignee = text(input.assignee, 'Assignee', true); record(order, `Assigned to ${order.metadata.assignee}`, actor);
      } else if (input.action === 'note') {
        const note = text(input.note, 'Note'); order.metadata.notes = note; record(order, `Note: ${note}`, actor);
      } else if (input.action === 'warehouse') {
        if (!['draft', 'created', 'acknowledged'].includes(order.canonicalStatus)) fail('Reroute through fulfillment after allocation.', 409);
        order.metadata.warehouse = text(input.warehouse, 'Warehouse', true); record(order, `Preferred warehouse → ${order.metadata.warehouse}; stock not reserved`, actor);
      } else if (input.action === 'exception') {
        order.exceptions.push({ id: randomUUID(), summary: text(input.summary, 'Exception', true), status: 'open', at: new Date().toISOString() }); record(order, 'Exception recorded', actor);
      } else if (input.action === 'resolve-exception') {
        const issue = order.exceptions.find((e) => e.id === input.exceptionId); if (!issue) fail('Exception not found.', 404);
        issue.status = 'resolved'; record(order, `Exception resolved: ${issue.summary}`, actor);
      } else { fail('Unsupported order action.'); }
      if (requestId) order.commandReceipts = [...(order.commandReceipts || []).slice(-99), { id: requestId, actor, fingerprint }];
      order.version += 1; save(db); return order;
    },
  };
}
