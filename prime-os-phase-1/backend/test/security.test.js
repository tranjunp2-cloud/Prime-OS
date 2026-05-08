import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

process.env.NODE_ENV = 'test';
process.env.PRIME_ALLOW_DEMO_CREDENTIALS = 'true';
process.env.PRIME_SESSION_SECRET = 'prime-os-local-dev-session-secret-change-me';

const { app } = await import('../src/server.js');

let server;
let baseUrl;

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
});

async function request(path, options = {}) {
  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
}

async function login(email, password) {
  const response = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

test('logout revokes bearer token server-side', async () => {
  const { response, body } = await login('admin@primeos.local', 'Admin@PrimeOS2026!');
  assert.equal(response.status, 200);

  const logout = await request('/api/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${body.token}` }
  });
  assert.equal(logout.status, 200);

  const session = await request('/api/session', {
    headers: { Authorization: `Bearer ${body.token}` }
  });
  assert.equal(session.status, 401);
});

test('suspended member cannot use existing token or login again', async () => {
  const adminLogin = await login('admin@primeos.local', 'Admin@PrimeOS2026!');
  assert.equal(adminLogin.response.status, 200);

  const userLogin = await login('user@primeos.local', 'User@PrimeOS2026!');
  assert.equal(userLogin.response.status, 200);

  const deactivate = await request('/api/v1/workspace-members/wm_login_user_001/deactivate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminLogin.body.token}` }
  });
  assert.equal(deactivate.status, 200);

  const existingSession = await request('/api/session', {
    headers: { Authorization: `Bearer ${userLogin.body.token}` }
  });
  assert.equal(existingSession.status, 403);

  const blockedLogin = await login('user@primeos.local', 'User@PrimeOS2026!');
  assert.equal(blockedLogin.response.status, 403);
});
