import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

process.env.NODE_ENV = 'test';
process.env.PRIME_ALLOW_DEMO_CREDENTIALS = 'true';
process.env.PRIME_SESSION_SECRET = 'prime-os-local-dev-session-secret-change-me';

const { app } = await import('../src/server.js');
let server;
let baseUrl;
let token;

async function request(path, options = {}) {
  return fetch(`${baseUrl}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) } });
}

before(async () => {
  await new Promise((resolve, reject) => { server = app.listen(0, '127.0.0.1', resolve); server.once('error', reject); });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  const login = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: 'admin@primeos.local', password: 'Admin@PrimeOS2026!' }) });
  token = (await login.json()).token;
});

after(async () => { await new Promise((resolve) => server.close(resolve)); });

test('Team & Access exposes demo members, five roles, permission editing, invitations, and audit logs', async () => {
  const rolesResponse = await request('/api/v1/role-definitions');
  const roles = await rolesResponse.json();
  assert.equal(rolesResponse.status, 200);
  assert.equal(roles.data.length, 5);
  assert.deepEqual(roles.data.map((role) => role.role_key), ['admin', 'pos_cashier', 'crm_sales', 'warehouse_manager', 'web_editor']);

  const membersResponse = await request('/api/v1/workspace-members');
  const members = await membersResponse.json();
  assert.equal(membersResponse.status, 200);
  assert.equal(members.data.length >= 5, true);
  assert.equal(members.data.filter((member) => member.membership.status === 'invited').length >= 3, true);

  const updatedRole = await request('/api/v1/role-definitions/web_editor', { method: 'PATCH', body: JSON.stringify({ permissions: ['workspace.read', 'web.content.manage', 'web.publish'] }) });
  assert.equal(updatedRole.status, 200);
  assert.equal((await updatedRole.json()).data.permissions.includes('web.publish'), true);

  const invited = await request('/api/v1/workspace-member-invitations', { method: 'POST', body: JSON.stringify({ email: 'demo.finance@unifi.business', role_key: 'crm_sales' }) });
  assert.equal(invited.status, 201);
  const invitation = (await invited.json()).data;
  const changedInvitationRole = await request(`/api/v1/workspace-members/wm_${invitation.id}/role`, { method: 'PATCH', body: JSON.stringify({ role_key: 'web_editor' }) });
  assert.equal(changedInvitationRole.status, 200);
  const resent = await request(`/api/v1/workspace-member-invitations/${invitation.id}/resend`, { method: 'POST' });
  assert.equal(resent.status, 200);
  const cancelled = await request(`/api/v1/workspace-member-invitations/${invitation.id}`, { method: 'DELETE' });
  assert.equal(cancelled.status, 200);

  const auditResponse = await request('/api/v1/audit-events');
  const audit = await auditResponse.json();
  assert.equal(auditResponse.status, 200);
  assert.equal(audit.data.some((event) => event.action === 'iam.role.permissions.updated'), true);
  assert.equal(audit.data.some((event) => event.action === 'iam.invitation.cancelled'), true);
});
