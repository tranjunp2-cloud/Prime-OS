import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';

process.env.NODE_ENV = 'test';
process.env.PRIME_ALLOW_DEMO_CREDENTIALS = 'true';
process.env.PRIME_SESSION_SECRET = 'prime-os-local-dev-session-secret-change-me';
const storeDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'primeos-finance-api-'));
process.env.PRIME_FINANCE_OPS_STORE_PATH = path.join(storeDirectory, 'finance-ops.json');

const { app } = await import('../src/server.js');
let server;
let baseUrl;
let token;

async function request(urlPath, options = {}) {
  return fetch(`${baseUrl}${urlPath}`, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) } });
}

before(async () => {
  await new Promise((resolve, reject) => {
    server = app.listen(0, '127.0.0.1', resolve);
    server.once('error', reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  const login = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: 'admin@primeos.local', password: 'Admin@PrimeOS2026!' }) });
  token = (await login.json()).token;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  fs.rmSync(storeDirectory, { recursive: true, force: true });
});

test('Finance Ops API exposes summary, ledger actions, forecast, target, and risks', async () => {
  const summaryResponse = await request('/api/v1/finance/ops/summary');
  assert.equal(summaryResponse.status, 200);
  assert.equal((await summaryResponse.json()).data.finance_health_index > 0, true);

  const overviewResponse = await request('/api/v1/finance/ops/overview');
  assert.equal(overviewResponse.status, 200);
  assert.equal((await overviewResponse.json()).data.revenue_breakdown.length, 3);

  const ledgerResponse = await request('/api/v1/finance/ops/receivables?payment_status=OVERDUE');
  const ledger = await ledgerResponse.json();
  assert.equal(ledgerResponse.status, 200);
  const item = ledger.data[0];

  const reminder = await request(`/api/v1/finance/ops/receivables/${item.id}/send-reminder`, { method: 'POST', body: JSON.stringify({ channel: 'EMAIL' }) });
  assert.equal(reminder.status, 200);

  const payment = await request(`/api/v1/finance/ops/receivables/${item.id}/confirm-payment`, { method: 'POST', body: JSON.stringify({ payment_proof: { file_name: 'proof.pdf', provider_status: 'Verified', uploaded_at: new Date().toISOString() } }) });
  const paymentBody = await payment.json();
  assert.equal(payment.status, 200);
  assert.equal(paymentBody.data.collection_status, 'PAID');
  assert.equal(paymentBody.sync_event.status, 'PENDING');

  const targetResponse = await request('/api/v1/finance/ops/target', { method: 'PUT', body: JSON.stringify({ target_amount: 2900000000 }) });
  assert.equal(targetResponse.status, 200);

  const risksResponse = await request('/api/v1/finance/ops/risks');
  const risks = await risksResponse.json();
  const resolved = await request(`/api/v1/finance/ops/risks/${risks.data[0].id}/resolve`, { method: 'POST', body: JSON.stringify({ resolution_notes: 'Control reviewed and remediated.' }) });
  assert.equal(resolved.status, 200);
  assert.equal((await resolved.json()).data.status, 'RESOLVED');
});
