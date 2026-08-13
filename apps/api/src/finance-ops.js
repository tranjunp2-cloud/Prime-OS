import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { emit } from './event-bus.js';
import { enqueue, getStats as getWorkerStats } from './worker-queue.js';

const STORE_PATH = path.resolve(process.env.PRIME_FINANCE_OPS_STORE_PATH || path.join('data', 'finance-ops.json'));
const DEMO_SEED_VERSION = 2;

const owners = [
  { id: 'finance_owner_linh', name: 'Linh Nguyen' },
  { id: 'finance_owner_minh', name: 'Minh Tran' },
  { id: 'finance_owner_anh', name: 'Anh Pham' },
];

function isoNow() {
  return new Date().toISOString();
}

function validationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function seedReceivable(input) {
  const balance = input.total_amount - input.collected_amount;
  return {
    id: randomUUID(),
    customer_id: randomUUID(),
    balance_due: balance,
    last_reminder_sent_at: null,
    evidence: null,
    timeline: [
      { id: randomUUID(), at: '2026-08-01T08:00:00.000Z', type: 'CREATED', message: 'Receivable created from source record.' },
      ...(input.collected_amount ? [{ id: randomUUID(), at: '2026-08-06T09:30:00.000Z', type: 'PARTIAL_PAYMENT', message: `Partial payment of ${input.collected_amount} was recorded.` }] : []),
    ],
    ...input,
  };
}

function demoTimeline(...entries) {
  return entries.map(([at, type, message]) => ({ id: randomUUID(), at, type, message }));
}

function seedStore() {
  const receivables = [
    seedReceivable({ source_type: 'COMMERCE_ORDER', source_id: 'ORD-10492', customer_name: 'Nguyen Minh Anh', total_amount: 12650000, collected_amount: 0, due_date: '2026-08-13', collection_status: 'UNPAID', assigned_owner_id: 'finance_owner_linh', assigned_owner_name: 'Linh Nguyen', linked_invoice_id: 'INV-2026-0813-001', invoice_status: 'Issued', payment_method: 'Bank transfer' }),
    seedReceivable({ source_type: 'SERVICE_BOOKING', source_id: 'BOOK-8821', customer_name: 'Tran Bao Chau', total_amount: 2340000, collected_amount: 1000000, due_date: '2026-08-10', collection_status: 'PARTIAL', assigned_owner_id: null, assigned_owner_name: null, linked_invoice_id: 'INV-2026-0813-002', invoice_status: 'Pending', payment_method: 'Xendit' }),
    seedReceivable({ source_type: 'COMMERCE_ORDER', source_id: 'ORD-10461', customer_name: 'Pham Thuy Linh', total_amount: 4785000, collected_amount: 0, due_date: '2026-08-02', collection_status: 'UNPAID', assigned_owner_id: 'finance_owner_minh', assigned_owner_name: 'Minh Tran', linked_invoice_id: 'INV-2026-0812-017', invoice_status: 'Draft', payment_method: 'Cash on delivery' }),
    seedReceivable({ source_type: 'COMMERCE_ORDER', source_id: 'ORD-10398', customer_name: 'Vo Thanh Mai', total_amount: 18450000, collected_amount: 4000000, due_date: '2026-07-07', collection_status: 'PARTIAL', assigned_owner_id: 'finance_owner_anh', assigned_owner_name: 'Anh Pham', linked_invoice_id: 'INV-2026-0810-026', invoice_status: 'Issued', payment_method: 'Bank transfer', evidence: { file_name: 'bank-transfer-ord-10398.pdf', provider_status: 'Awaiting verification', uploaded_at: '2026-08-12T04:20:00.000Z' } }),
    seedReceivable({ source_type: 'SERVICE_BOOKING', source_id: 'BOOK-7714', customer_name: 'Do Quang Huy', total_amount: 8650000, collected_amount: 0, due_date: '2026-08-17', collection_status: 'UNPAID', assigned_owner_id: null, assigned_owner_name: null, linked_invoice_id: null, invoice_status: 'Not issued', payment_method: 'Stripe' }),
    seedReceivable({ source_type: 'COMMERCE_ORDER', source_id: 'ORD-10508', customer_name: 'Le Hoang Nam', total_amount: 28920000, collected_amount: 0, due_date: '2026-08-12', collection_status: 'DISPUTED', assigned_owner_id: 'finance_owner_linh', assigned_owner_name: 'Linh Nguyen', linked_invoice_id: 'INV-2026-0812-018', invoice_status: 'Error', payment_method: 'Bank transfer' }),
    seedReceivable({ source_type: 'COMMERCE_ORDER', source_id: 'ORD-10521', customer_name: 'Lotus Beauty Co., Ltd.', total_amount: 42600000, collected_amount: 20000000, due_date: '2026-08-13', collection_status: 'PARTIAL', assigned_owner_id: 'finance_owner_anh', assigned_owner_name: 'Anh Pham', linked_invoice_id: 'INV-2026-0813-021', invoice_status: 'Issued', payment_method: 'Bank transfer', evidence: { file_name: 'lotus-beauty-deposit.pdf', provider_status: 'Verified', uploaded_at: '2026-08-12T07:45:00.000Z' }, timeline: demoTimeline(['2026-08-12T07:45:00.000Z', 'PROOF_VERIFIED', 'Deposit proof was verified by Anh Pham.'], ['2026-08-10T03:20:00.000Z', 'REMINDER_SENT', 'Payment reminder sent through email.'], ['2026-08-04T08:00:00.000Z', 'CREATED', 'Receivable created from source record.']) }),
    seedReceivable({ source_type: 'SERVICE_BOOKING', source_id: 'BOOK-8945', customer_name: 'Aurora Wellness Studio', total_amount: 15750000, collected_amount: 0, due_date: '2026-08-09', collection_status: 'UNPAID', assigned_owner_id: 'finance_owner_minh', assigned_owner_name: 'Minh Tran', linked_invoice_id: 'INV-2026-0811-031', invoice_status: 'Pending', payment_method: 'Stripe', timeline: demoTimeline(['2026-08-12T02:15:00.000Z', 'REMINDER_SENT', 'Second payment reminder sent through email.'], ['2026-08-09T02:15:00.000Z', 'REMINDER_SENT', 'First payment reminder sent through email.'], ['2026-08-03T08:00:00.000Z', 'CREATED', 'Receivable created from service booking.']) }),
    seedReceivable({ source_type: 'COMMERCE_ORDER', source_id: 'ORD-10477', customer_name: 'Minh Long Trading', total_amount: 36800000, collected_amount: 12000000, due_date: '2026-08-06', collection_status: 'PARTIAL', assigned_owner_id: 'finance_owner_linh', assigned_owner_name: 'Linh Nguyen', linked_invoice_id: 'INV-2026-0806-014', invoice_status: 'Issued', payment_method: 'Bank transfer', evidence: { file_name: 'mlt-partial-payment.png', provider_status: 'Awaiting verification', uploaded_at: '2026-08-12T09:10:00.000Z' } }),
    seedReceivable({ source_type: 'SERVICE_BOOKING', source_id: 'BOOK-8602', customer_name: 'The Bloom Clinic', total_amount: 9800000, collected_amount: 0, due_date: '2026-07-29', collection_status: 'UNPAID', assigned_owner_id: 'finance_owner_anh', assigned_owner_name: 'Anh Pham', linked_invoice_id: 'INV-2026-0729-008', invoice_status: 'Issued', payment_method: 'Xendit' }),
    seedReceivable({ source_type: 'COMMERCE_ORDER', source_id: 'ORD-10284', customer_name: 'Saigon Retail Partners', total_amount: 78200000, collected_amount: 40000000, due_date: '2026-07-18', collection_status: 'PARTIAL', assigned_owner_id: 'finance_owner_minh', assigned_owner_name: 'Minh Tran', linked_invoice_id: 'INV-2026-0718-003', invoice_status: 'Issued', payment_method: 'Bank transfer', timeline: demoTimeline(['2026-08-11T08:45:00.000Z', 'OWNER_ASSIGNED', 'Collection escalated to Minh Tran.'], ['2026-08-08T05:30:00.000Z', 'REMINDER_SENT', 'Escalation reminder sent through email.'], ['2026-08-02T06:00:00.000Z', 'PARTIAL_PAYMENT', 'Partial payment of 40000000 was recorded.'], ['2026-07-12T08:00:00.000Z', 'CREATED', 'Receivable created from source record.']) }),
    seedReceivable({ source_type: 'SERVICE_BOOKING', source_id: 'BOOK-7440', customer_name: 'Nami Hospitality Group', total_amount: 24500000, collected_amount: 0, due_date: '2026-06-30', collection_status: 'DISPUTED', assigned_owner_id: 'finance_owner_linh', assigned_owner_name: 'Linh Nguyen', linked_invoice_id: 'INV-2026-0630-011', invoice_status: 'Cancelled', payment_method: 'Bank transfer', timeline: demoTimeline(['2026-08-10T04:00:00.000Z', 'DISPUTE_FLAGGED', 'Customer disputed the completed service scope.'], ['2026-07-01T08:00:00.000Z', 'REMINDER_SENT', 'Payment reminder sent through email.'], ['2026-06-25T08:00:00.000Z', 'CREATED', 'Receivable created from service booking.']) }),
    seedReceivable({ source_type: 'COMMERCE_ORDER', source_id: 'ORD-10532', customer_name: 'Green Corner Market', total_amount: 7250000, collected_amount: 0, due_date: '2026-08-20', collection_status: 'UNPAID', assigned_owner_id: null, assigned_owner_name: null, linked_invoice_id: 'INV-2026-0813-034', invoice_status: 'Draft', payment_method: 'Cash on delivery' }),
    seedReceivable({ source_type: 'SERVICE_BOOKING', source_id: 'BOOK-9012', customer_name: 'Mori Concept Store', total_amount: 12600000, collected_amount: 0, due_date: '2026-08-25', collection_status: 'UNPAID', assigned_owner_id: null, assigned_owner_name: null, linked_invoice_id: null, invoice_status: 'Not issued', payment_method: 'Stripe' }),
    seedReceivable({ source_type: 'COMMERCE_ORDER', source_id: 'ORD-10435', customer_name: 'An Khang Pharmacy', total_amount: 19500000, collected_amount: 19500000, due_date: '2026-08-05', collection_status: 'PAID', assigned_owner_id: 'finance_owner_anh', assigned_owner_name: 'Anh Pham', linked_invoice_id: 'INV-2026-0805-009', invoice_status: 'Issued', payment_method: 'Bank transfer', evidence: { file_name: 'ankhang-payment.pdf', provider_status: 'Verified', uploaded_at: '2026-08-05T03:12:00.000Z' }, timeline: demoTimeline(['2026-08-05T03:15:00.000Z', 'PAYMENT_CONFIRMED', 'Payment was matched and confirmed automatically.'], ['2026-08-01T08:00:00.000Z', 'CREATED', 'Receivable created from source record.']) }),
  ];

  return {
    seed_version: DEMO_SEED_VERSION,
    metrics: {
      month_year: '2026-08',
      commerce_revenue: 1220000000,
      service_booking_revenue: 360000000,
      sales_pipeline: 910000000,
      collected: 1435000000,
      order_collection_rate: 91,
      repeat_revenue_rate: 34,
      payment_connection_coverage: 75,
    },
    targets: [
      { id: randomUUID(), month_year: '2026-08', target_amount: 2500000000, created_by: 'admin_local', created_at: '2026-08-01T00:00:00.000Z' },
      { id: randomUUID(), month_year: '2026-07', target_amount: 2250000000, created_by: 'admin_local', created_at: '2026-07-01T00:00:00.000Z' },
      { id: randomUUID(), month_year: '2026-06', target_amount: 2100000000, created_by: 'admin_local', created_at: '2026-06-01T00:00:00.000Z' },
    ],
    receivables,
    risks: [
      { id: randomUUID(), risk_type: 'UNVERIFIED_PROOF', severity: 'CRITICAL', title: '4 payment proofs require verification', description: 'Manual bank receipts worth ₫42.8M have not been verified.', status: 'OPEN', created_at: '2026-08-13T02:15:00.000Z', resolved_at: null },
      { id: randomUUID(), risk_type: 'TARGET_GAP', severity: 'WARNING', title: 'Revenue target coverage is below plan', description: 'Current revenue covers 63.2% of the monthly target with 18 days remaining.', status: 'OPEN', created_at: '2026-08-13T02:20:00.000Z', resolved_at: null },
      { id: randomUUID(), risk_type: 'UNASSIGNED_SERVICE', severity: 'WARNING', title: '7 service bookings are unassigned', description: 'Bookings worth ₫86.5M need an owner before collection follow-up.', status: 'OPEN', created_at: '2026-08-13T02:25:00.000Z', resolved_at: null },
      { id: randomUUID(), risk_type: 'CONNECTOR_DISCONNECTED', severity: 'CRITICAL', title: 'Xendit payment connection is disconnected', description: 'Payment status updates may be delayed until the connection is restored.', status: 'OPEN', created_at: '2026-08-13T02:30:00.000Z', resolved_at: null },
      { id: randomUUID(), risk_type: 'LOW_REPEAT_REVENUE', severity: 'INFO', title: 'Repeat revenue is below the 40% benchmark', description: 'Repeat customers currently contribute 34% of monthly revenue.', status: 'OPEN', created_at: '2026-08-13T02:35:00.000Z', resolved_at: null },
      { id: randomUUID(), risk_type: 'UNVERIFIED_PROOF', severity: 'WARNING', title: 'High-value deposit is awaiting verification', description: 'The ₫12M proof attached to ORD-10477 needs a finance reviewer.', status: 'ACKNOWLEDGED', created_at: '2026-08-12T09:15:00.000Z', acknowledged_at: '2026-08-12T10:00:00.000Z', resolved_at: null },
      { id: randomUUID(), risk_type: 'CONNECTOR_DISCONNECTED', severity: 'INFO', title: 'Stripe webhook latency returned to normal', description: 'Delayed payment notifications were replayed successfully.', status: 'RESOLVED', created_at: '2026-08-10T03:00:00.000Z', resolved_at: '2026-08-10T04:20:00.000Z', resolution_notes: 'Webhook queue replayed and reconciliation completed.' },
    ],
    payment_connections: [
      { id: 'stripe', name: 'Stripe', status: 'CONNECTED' },
      { id: 'xendit', name: 'Xendit', status: 'DISCONNECTED' },
      { id: 'bank', name: 'Bank gateways', status: 'CONNECTED' },
      { id: 'cod', name: 'Carrier COD', status: 'CONNECTED' },
    ],
    source_records: Object.fromEntries(receivables.map((item) => [`${item.source_type}:${item.source_id}`, { source_type: item.source_type, source_id: item.source_id, financial_status: item.collection_status === 'PAID' ? 'COLLECTED' : 'PAYMENT_PENDING', updated_at: '2026-08-13T00:00:00.000Z' }])),
    source_sync_events: [],
  };
}

function ensureStore() {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  if (!fs.existsSync(STORE_PATH)) fs.writeFileSync(STORE_PATH, JSON.stringify(seedStore(), null, 2));
}

function readStore() {
  ensureStore();
  const parsed = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
  if (parsed.seed_version !== DEMO_SEED_VERSION) {
    const demoStore = seedStore();
    writeStore(demoStore);
    return demoStore;
  }
  return { ...seedStore(), ...parsed };
}

function writeStore(store) {
  ensureStore();
  const temporaryPath = `${STORE_PATH}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify(store, null, 2));
  fs.renameSync(temporaryPath, STORE_PATH);
}

function latestTarget(store) {
  return [...store.targets].sort((left, right) => right.created_at.localeCompare(left.created_at))[0];
}

function getAging(receivable, today = new Date()) {
  const due = new Date(`${receivable.due_date}T00:00:00.000Z`);
  const current = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const dayDifference = Math.floor((current.getTime() - due.getTime()) / 86400000);
  const agingDays = Math.max(0, dayDifference);
  let agingBucket = 'DUE_TODAY';
  if (agingDays > 30) agingBucket = 'OVERDUE_30_PLUS';
  else if (agingDays >= 8) agingBucket = 'OVERDUE_8_30';
  else if (agingDays >= 1) agingBucket = 'OVERDUE_1_7';
  return { ...receivable, aging_days: agingDays, aging_bucket: agingBucket, is_due: dayDifference >= 0 };
}

export function getFinanceOpsSummary() {
  const store = readStore();
  const target = latestTarget(store)?.target_amount || 0;
  const revenue = store.metrics.commerce_revenue + store.metrics.service_booking_revenue;
  const amountToCollect = store.receivables.reduce((sum, item) => sum + item.balance_due, 0);
  const targetCoverage = target ? Math.min(100, (revenue / target) * 100) : 0;
  const health = Math.round((targetCoverage + store.metrics.order_collection_rate + store.metrics.repeat_revenue_rate + store.metrics.payment_connection_coverage) / 4);
  const openRisks = store.risks.filter((risk) => risk.status !== 'RESOLVED');
  const overdueItems = store.receivables.map((item) => getAging(item)).filter((item) => item.collection_status !== 'PAID' && item.aging_days > 0);
  const totalCollectable = store.metrics.collected + amountToCollect;
  const collectionRate = totalCollectable ? (store.metrics.collected / totalCollectable) * 100 : 0;
  return {
    month_year: store.metrics.month_year,
    revenue_this_month: revenue,
    target_amount: target,
    target_progress: targetCoverage,
    collected: store.metrics.collected,
    collection_rate: collectionRate,
    amount_to_collect: amountToCollect,
    overdue_count: overdueItems.length,
    remaining_to_target: Math.max(0, target - revenue),
    finance_health_index: health,
    finance_health_status: health >= 80 ? 'HEALTHY' : health >= 60 ? 'WATCH' : 'AT_RISK',
    health_components: {
      target_coverage: Math.round(targetCoverage),
      order_collection_rate: store.metrics.order_collection_rate,
      repeat_revenue_rate: store.metrics.repeat_revenue_rate,
      payment_connection_coverage: store.metrics.payment_connection_coverage,
    },
    overview: {
      commerce_revenue: store.metrics.commerce_revenue,
      service_booking_revenue: store.metrics.service_booking_revenue,
      sales_pipeline: store.metrics.sales_pipeline,
      active_risk_count: openRisks.length,
    },
    aging: Object.fromEntries(['DUE_TODAY', 'OVERDUE_1_7', 'OVERDUE_8_30', 'OVERDUE_30_PLUS'].map((bucket) => {
      const items = store.receivables.map((item) => getAging(item)).filter((item) => item.collection_status !== 'PAID' && item.is_due && item.aging_bucket === bucket);
      return [bucket, { count: items.length, amount: items.reduce((sum, item) => sum + item.balance_due, 0) }];
    })),
    finance_queue: [
      { id: 'queue_unpaid', type: 'COLLECTIONS', severity: 'CRITICAL', title: 'High-value payments need collection', description: 'Open receivables above ₫10M require immediate follow-up.', action_label: 'Open Ledger', target_view: 'collections' },
      { id: 'queue_gap', type: 'FORECAST', severity: 'WARNING', title: 'Monthly target still has a material gap', description: 'Use committed and probable opportunities to build a recovery plan.', action_label: 'View Bridge', target_view: 'forecast' },
      { id: 'queue_controls', type: 'RISK', severity: 'CRITICAL', title: 'Payment connection and proof controls need review', description: `${openRisks.length} active finance risks are waiting for action.`, action_label: 'Review Controls', target_view: 'risk' },
    ],
  };
}

export function getFinanceOpsOverview() {
  const store = readStore();
  const summary = getFinanceOpsSummary();
  const repeatRevenue = Math.round(summary.revenue_this_month * (store.metrics.repeat_revenue_rate / 100));
  const recentActivity = store.receivables
    .flatMap((receivable) => receivable.timeline.map((entry) => ({
      ...entry,
      receivable_id: receivable.id,
      source_id: receivable.source_id,
      customer_name: receivable.customer_name,
    })))
    .sort((left, right) => right.at.localeCompare(left.at))
    .slice(0, 8);

  return {
    finance_queue: summary.finance_queue,
    revenue_breakdown: [
      { key: 'commerce', label: 'Commerce Revenue', amount: store.metrics.commerce_revenue, color: '#635bff' },
      { key: 'services', label: 'Service Bookings', amount: store.metrics.service_booking_revenue, color: '#38bdf8' },
      { key: 'repeat', label: 'Repeat Revenue', amount: repeatRevenue, color: '#10b981' },
    ],
    recent_activity: recentActivity,
  };
}

export function listReceivables({ search = '', source_type, payment_status, owner_id, aging_bucket, page = 1, page_size, limit = 25 } = {}) {
  const store = readStore();
  const query = String(search).trim().toLowerCase();
  const filtered = store.receivables.map((item) => getAging(item)).filter((item) => {
    const searchMatches = !query || `${item.source_id} ${item.linked_invoice_id || ''} ${item.customer_name}`.toLowerCase().includes(query);
    const sourceMatches = !source_type || source_type === 'ALL' || item.source_type === source_type;
    const statusMatches = !payment_status || payment_status === 'ALL' || (payment_status === 'OVERDUE' ? item.is_due && item.aging_days > 0 && item.collection_status !== 'PAID' : item.collection_status === payment_status);
    const ownerMatches = !owner_id || owner_id === 'ALL' || (owner_id === 'UNASSIGNED' ? !item.assigned_owner_id : item.assigned_owner_id === owner_id);
    const agingMatches = !aging_bucket || aging_bucket === 'ALL' || (item.is_due && item.aging_bucket === aging_bucket);
    return searchMatches && sourceMatches && statusMatches && ownerMatches && agingMatches;
  }).sort((left, right) => right.balance_due - left.balance_due);
  const safePage = Math.max(1, Number(page) || 1);
  const safeSize = Math.min(100, Math.max(1, Number(page_size ?? limit) || 25));
  const start = (safePage - 1) * safeSize;
  return { data: filtered.slice(start, start + safeSize), meta: { page: safePage, page_size: safeSize, total: filtered.length }, owners };
}

export function getReceivable(id) {
  const item = readStore().receivables.find((receivable) => receivable.id === id);
  return item ? getAging(item) : null;
}

function updateReceivable(id, updater) {
  const store = readStore();
  const index = store.receivables.findIndex((item) => item.id === id);
  if (index < 0) return null;
  store.receivables[index] = updater(store.receivables[index]);
  writeStore(store);
  return getAging(store.receivables[index]);
}

export function sendPaymentReminder(id, channel = 'EMAIL') {
  return updateReceivable(id, (item) => {
    const at = isoNow();
    return { ...item, last_reminder_sent_at: at, timeline: [{ id: randomUUID(), at, type: 'REMINDER_SENT', message: `Payment reminder sent through ${channel}.` }, ...item.timeline] };
  });
}

export function assignReceivableOwner(id, ownerId) {
  const owner = owners.find((item) => item.id === ownerId);
  if (!owner) throw validationError('A valid owner_id is required.');
  return updateReceivable(id, (item) => ({ ...item, assigned_owner_id: owner.id, assigned_owner_name: owner.name, timeline: [{ id: randomUUID(), at: isoNow(), type: 'OWNER_ASSIGNED', message: `Collection assigned to ${owner.name}.` }, ...item.timeline] }));
}

function dispatchCollectedEvent(syncEventId, eventPayload) {
  const handler = () => {
    const store = readStore();
    const index = store.source_sync_events.findIndex((event) => event.id === syncEventId);
    if (index >= 0) {
      store.source_sync_events[index] = { ...store.source_sync_events[index], status: 'COMPLETED', completed_at: isoNow() };
      store.source_records[`${eventPayload.source_type}:${eventPayload.source_id}`] = {
        source_type: eventPayload.source_type,
        source_id: eventPayload.source_id,
        financial_status: 'COLLECTED',
        updated_at: eventPayload.collected_at,
      };
      writeStore(store);
    }
    emit('finance.receivable.collected', eventPayload);
  };
  if (getWorkerStats().running) enqueue({ type: 'finance.receivable.collected', payload: eventPayload, handler, processor: 'finance-ops' });
  else setTimeout(handler, 0);
}

export function confirmReceivablePayment(id, paymentProof = null, collectionNote = '') {
  const store = readStore();
  const index = store.receivables.findIndex((item) => item.id === id);
  if (index < 0) return null;
  const current = store.receivables[index];
  const at = isoNow();
  const syncEvent = { id: randomUUID(), event_type: 'finance.receivable.collected', source_type: current.source_type, source_id: current.source_id, status: 'PENDING', created_at: at, completed_at: null };
  const updated = {
    ...current,
    collected_amount: current.total_amount,
    balance_due: 0,
    collection_status: 'PAID',
    evidence: paymentProof || current.evidence,
    timeline: [{ id: randomUUID(), at, type: 'PAYMENT_CONFIRMED', message: `Manual payment confirmed and source sync queued.${String(collectionNote || '').trim() ? ` Note: ${String(collectionNote).trim()}` : ''}` }, ...current.timeline],
  };
  store.receivables[index] = updated;
  store.metrics.collected += current.balance_due;
  store.source_sync_events.unshift(syncEvent);
  writeStore(store);
  dispatchCollectedEvent(syncEvent.id, { receivable_id: id, source_type: updated.source_type, source_id: updated.source_id, collection_status: 'COLLECTED', collected_at: at });
  return { receivable: getAging(updated), sync_event: syncEvent };
}

export function flagReceivableDispute(id, reason = 'Flagged for finance review.') {
  return updateReceivable(id, (item) => ({ ...item, collection_status: 'DISPUTED', timeline: [{ id: randomUUID(), at: isoNow(), type: 'DISPUTE_FLAGGED', message: reason }, ...item.timeline] }));
}

export function getFinanceForecast() {
  const store = readStore();
  const summary = getFinanceOpsSummary();
  const amountToCollect = summary.amount_to_collect;
  const levers = [
    { id: 'receivables', label: 'Collect Outstanding Receivables', amount: amountToCollect, coverage: 0.82 },
    { id: 'proposals', label: 'Close Pending Proposals', amount: 420000000, coverage: 0.55 },
    { id: 'bookings', label: 'Complete Pending Service Bookings', amount: 185000000, coverage: 0.72 },
    { id: 'repeat', label: 'Increase Repeat Revenue', amount: 160000000, coverage: 0.45 },
  ];
  return {
    month_year: store.metrics.month_year,
    target: latestTarget(store),
    target_history: [...store.targets].sort((left, right) => right.created_at.localeCompare(left.created_at)),
    revenue_this_month: summary.revenue_this_month,
    remaining_to_target: summary.remaining_to_target,
    gap_bridge: levers,
    probability: [
      { category: 'Committed', amount: 310000000, probability: 0.9 },
      { category: 'Probable', amount: 365000000, probability: 0.65 },
      { category: 'Pipeline', amount: 235000000, probability: 0.3 },
    ],
  };
}

export function updateFinanceTarget({ month_year, target_amount, created_by }) {
  const amount = Number(target_amount);
  const effectiveMonth = month_year || readStore().metrics.month_year || isoNow().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(effectiveMonth)) throw validationError('month_year must use YYYY-MM format.');
  if (!Number.isFinite(amount) || amount <= 0) throw validationError('target_amount must be a positive number.');
  const store = readStore();
  const target = { id: randomUUID(), month_year: effectiveMonth, target_amount: amount, created_by: created_by || 'admin_local', created_at: isoNow() };
  store.targets.unshift(target);
  store.metrics.month_year = effectiveMonth;
  writeStore(store);
  return target;
}

export function listFinanceRisks({ status = 'ALL', severity = 'ALL' } = {}) {
  const store = readStore();
  const data = store.risks.filter((risk) => (status === 'ALL' || risk.status === status) && (severity === 'ALL' || risk.severity === severity));
  return { data, meta: { total: data.length }, payment_connections: store.payment_connections };
}

export function resolveFinanceRisk(id, requestedStatus = 'RESOLVED', resolutionNotes = '') {
  if (!['ACKNOWLEDGED', 'RESOLVED'].includes(requestedStatus)) throw validationError('status must be ACKNOWLEDGED or RESOLVED.');
  const store = readStore();
  const index = store.risks.findIndex((risk) => risk.id === id);
  if (index < 0) return null;
  store.risks[index] = { ...store.risks[index], status: requestedStatus, resolution_notes: String(resolutionNotes || '').trim() || null, resolved_at: requestedStatus === 'RESOLVED' ? isoNow() : null };
  writeStore(store);
  return store.risks[index];
}

export const financeOpsOwners = owners;
