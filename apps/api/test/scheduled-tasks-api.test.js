import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';

process.env.NODE_ENV = 'test';
process.env.PRIME_ALLOW_DEMO_CREDENTIALS = 'true';
process.env.PRIME_SESSION_SECRET = 'prime-os-local-dev-session-secret-change-me';
const storeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'primeos-scheduled-api-test-'));
process.env.PRIME_SCHEDULED_TASKS_STORE_PATH = path.join(storeDir, 'scheduled-tasks.json');

const { app } = await import('../src/server.js');

let server;
let baseUrl;
let token;

async function request(urlPath, options = {}) {
  return fetch(`${baseUrl}${urlPath}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) },
  });
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
  fs.rmSync(storeDir, { recursive: true, force: true });
});

test('scheduled task API supports create, update, run, logs, toggle, and delete', async () => {
  const createdResponse = await request('/api/v1/scheduled-tasks', { method: 'POST', body: JSON.stringify({ template_id: 'daily-customer-follow-up', title: 'API follow-up test' }) });
  assert.equal(createdResponse.status, 201);
  const created = (await createdResponse.json()).data;

  const updatedResponse = await request(`/api/v1/scheduled-tasks/${created.id}`, { method: 'PUT', body: JSON.stringify({ cron_expression: '30 11 * * *', human_schedule: 'Daily at 11:30 AM' }) });
  assert.equal(updatedResponse.status, 200);
  assert.equal((await updatedResponse.json()).data.human_schedule, 'Daily at 11:30 AM');

  const runResponse = await request(`/api/v1/scheduled-tasks/${created.id}/run-now`, { method: 'POST' });
  assert.equal(runResponse.status, 202);
  await new Promise((resolve) => setTimeout(resolve, 25));

  const logsResponse = await request(`/api/v1/scheduled-tasks/${created.id}/logs`);
  const logs = await logsResponse.json();
  assert.equal(logsResponse.status, 200);
  assert.equal(logs.meta.total, 1);
  assert.equal(logs.data[0].trigger_type, 'MANUAL_RUN_NOW');

  const pausedResponse = await request(`/api/v1/scheduled-tasks/${created.id}/toggle-status`, { method: 'POST', body: JSON.stringify({ status: 'PAUSED' }) });
  assert.equal((await pausedResponse.json()).data.next_run_at, null);

  const deletedResponse = await request(`/api/v1/scheduled-tasks/${created.id}`, { method: 'DELETE' });
  assert.equal(deletedResponse.status, 200);
});
