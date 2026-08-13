import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'primeos-finance-ops-'));
process.env.PRIME_FINANCE_OPS_STORE_PATH = path.join(testDirectory, 'finance-ops.json');

const {
  assignReceivableOwner,
  confirmReceivablePayment,
  getFinanceForecast,
  getFinanceOpsOverview,
  getFinanceOpsSummary,
  listFinanceRisks,
  listReceivables,
  resolveFinanceRisk,
  sendPaymentReminder,
  updateFinanceTarget,
} = await import('../src/finance-ops.js');

after(() => fs.rmSync(testDirectory, { recursive: true, force: true }));

test('Finance Ops summary, aging filters, and target history are calculated and persisted', () => {
  const summary = getFinanceOpsSummary();
  assert.equal(summary.revenue_this_month, 1580000000);
  assert.equal(summary.remaining_to_target, 920000000);
  assert.equal(Number.isInteger(summary.finance_health_index), true);
  assert.equal(summary.collection_rate > 0, true);
  assert.equal(summary.overdue_count > 0, true);

  const overview = getFinanceOpsOverview();
  assert.equal(overview.finance_queue.length, 3);
  assert.equal(overview.revenue_breakdown.length, 3);
  assert.equal(overview.recent_activity.length > 0, true);

  const overdue = listReceivables({ payment_status: 'OVERDUE' });
  assert.equal(overdue.data.every((item) => item.aging_days > 0), true);
  const demoLedger = listReceivables({ limit: 100 });
  assert.equal(demoLedger.meta.total, 15);
  assert.equal(demoLedger.data.some((item) => item.collection_status === 'PAID'), true);
  assert.equal(demoLedger.data.some((item) => item.collection_status === 'DISPUTED'), true);
  assert.equal(demoLedger.data.some((item) => item.evidence?.provider_status === 'Awaiting verification'), true);
  assert.equal(Object.values(summary.aging).every((bucket) => bucket.count > 0), true);

  const target = updateFinanceTarget({ month_year: '2026-08', target_amount: 2800000000, created_by: 'admin_test' });
  assert.equal(target.target_amount, 2800000000);
  assert.equal(getFinanceForecast().target_history[0].id, target.id);

  const contractTarget = updateFinanceTarget({ target_amount: 3000000000, created_by: 'admin_test' });
  assert.equal(contractTarget.month_year, '2026-08');
});

test('collection actions persist timeline, ownership, payment, and risk state', async () => {
  const item = listReceivables({ payment_status: 'UNPAID' }).data[0];
  const reminded = sendPaymentReminder(item.id, 'CHAT');
  assert.equal(reminded.timeline[0].type, 'REMINDER_SENT');

  const assigned = assignReceivableOwner(item.id, 'finance_owner_minh');
  assert.equal(assigned.assigned_owner_name, 'Minh Tran');

  const result = confirmReceivablePayment(item.id, { file_name: 'proof.pdf', provider_status: 'Verified', uploaded_at: new Date().toISOString() });
  assert.equal(result.receivable.collection_status, 'PAID');
  assert.equal(result.receivable.balance_due, 0);
  await new Promise((resolve) => setTimeout(resolve, 10));

  const risk = listFinanceRisks().data[0];
  assert.equal(listFinanceRisks().data.some((item) => item.status === 'ACKNOWLEDGED'), true);
  assert.equal(listFinanceRisks().data.some((item) => item.status === 'RESOLVED'), true);
  assert.equal(resolveFinanceRisk(risk.id, 'ACKNOWLEDGED').status, 'ACKNOWLEDGED');
  const resolved = resolveFinanceRisk(risk.id, 'RESOLVED', 'Connector restored and proof verified.');
  assert.equal(resolved.status, 'RESOLVED');
  assert.equal(resolved.resolution_notes, 'Connector restored and proof verified.');
});
