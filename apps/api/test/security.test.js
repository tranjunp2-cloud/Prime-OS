import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import fs from 'node:fs';
import { createServer } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';

process.env.NODE_ENV = 'test';
process.env.PRIME_ALLOW_DEMO_CREDENTIALS = 'true';
process.env.PRIME_SKIP_CONNECTOR_LIVE_PROBES = 'true';
process.env.PRIME_SESSION_SECRET = 'prime-os-local-dev-session-secret-change-me';
const connectorStoreDir = fs.mkdtempSync(path.join(os.tmpdir(), 'primeos-connector-test-'));
process.env.PRIME_CONNECTORS_STORE_PATH = path.join(connectorStoreDir, 'connectors.json');
process.env.PRIME_CONNECTOR_EVENTS_STORE_PATH = path.join(connectorStoreDir, 'connector-webhook-events.json');
process.env.PRIME_CONNECTOR_DOMAIN_EVENTS_STORE_PATH = path.join(connectorStoreDir, 'connector-domain-events.json');
process.env.PRIME_CONNECTOR_DOMAIN_RECORDS_STORE_PATH = path.join(connectorStoreDir, 'connector-domain-records.json');
process.env.PRIME_CONNECTOR_OAUTH_SESSIONS_STORE_PATH = path.join(connectorStoreDir, 'connector-oauth-sessions.json');
process.env.PRIME_CONNECTOR_CREDENTIAL_VAULT_STORE_PATH = path.join(connectorStoreDir, 'connector-credential-vault.json');

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
  fs.rmSync(connectorStoreDir, { recursive: true, force: true });
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

async function readRequestBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function hmacHex(secret, value, algorithm = 'sha256') {
  return createHmac(algorithm, secret).update(value, 'utf8').digest('hex');
}

function hmacBase64(secret, value) {
  return createHmac('sha256', secret).update(value, 'utf8').digest('base64');
}

function metaSignature(secret, body) {
  return `sha256=${hmacHex(secret, body)}`;
}

function demoAccessTokenForProvider(provider) {
  const tokens = {
    telegram: '123456789:PrimeOSDemoBotToken_1234567890',
    stripe: 'sk_test_primeos_123456',
    shopify: 'shpat_primeos_123456',
    woocommerce: 'ck_primeos_wc_123456',
    slack: 'xoxb-primeos-demo-token-123456',
  };
  return tokens[provider] || `${provider}_access_token_123456`;
}

function demoConnectorSetupPayload(connector) {
  const requiredFields = connector.requiredFields || [];
  const payload = {
    accountRef: `${connector.provider}_account_123456`,
  };

  if (requiredFields.includes('appId')) {
    payload.appId = `${connector.provider}_app_123456`;
  }

  if (requiredFields.includes('accessToken')) {
    payload.accessToken = demoAccessTokenForProvider(connector.provider);
  }

  if (requiredFields.includes('webhookUrl')) {
    payload.webhookUrl = `${baseUrl}/webhooks/connectors/${connector.id}`;
  }

  if (requiredFields.includes('verifyToken')) {
    payload.verifyToken = `${connector.provider}_webhook_secret_123456`;
  }

  return payload;
}

function stripeSignature(secret, body, timestamp = Math.floor(Date.now() / 1000)) {
  return `t=${timestamp},v1=${hmacHex(secret, `${timestamp}.${body}`)}`;
}

function slackSignature(secret, body, timestamp = Math.floor(Date.now() / 1000)) {
  return {
    timestamp: String(timestamp),
    signature: `v0=${hmacHex(secret, `v0:${timestamp}:${body}`)}`,
  };
}

function vnpaySignData(payload) {
  return Object.entries(payload)
    .filter(([key, value]) => (
      key.startsWith('vnp_') &&
      key !== 'vnp_SecureHash' &&
      key !== 'vnp_SecureHashType' &&
      value !== undefined &&
      value !== null &&
      String(value) !== ''
    ))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value)).replace(/%20/g, '+')}`)
    .join('&');
}

function withVnpayHash(payload, secret) {
  return {
    ...payload,
    vnp_SecureHash: hmacHex(secret, vnpaySignData(payload), 'sha512'),
  };
}

function readPersistedConnectorEvents() {
  return JSON.parse(fs.readFileSync(process.env.PRIME_CONNECTOR_EVENTS_STORE_PATH, 'utf8'));
}

function readPersistedConnectorDomainEvents() {
  return JSON.parse(fs.readFileSync(process.env.PRIME_CONNECTOR_DOMAIN_EVENTS_STORE_PATH, 'utf8'));
}

function readPersistedConnectorDomainRecords() {
  return JSON.parse(fs.readFileSync(process.env.PRIME_CONNECTOR_DOMAIN_RECORDS_STORE_PATH, 'utf8'));
}

function readPersistedConnectorOAuthSessions() {
  return JSON.parse(fs.readFileSync(process.env.PRIME_CONNECTOR_OAUTH_SESSIONS_STORE_PATH, 'utf8'));
}

function readPersistedConnectors() {
  return JSON.parse(fs.readFileSync(process.env.PRIME_CONNECTORS_STORE_PATH, 'utf8'));
}

function readPersistedCredentialVault() {
  return JSON.parse(fs.readFileSync(process.env.PRIME_CONNECTOR_CREDENTIAL_VAULT_STORE_PATH, 'utf8'));
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

test('demo local bypass token is rejected in local mode', async () => {
  const session = await request('/api/session', {
    headers: { Authorization: 'Bearer prime-local-bypass-token' }
  });
  assert.equal(session.status, 401);
});

test('demo local CORS allows Vite preview origin', async () => {
  const { response, body } = await login('admin@primeos.local', 'Admin@PrimeOS2026!');
  assert.equal(response.status, 200);

  const session = await request('/api/session', {
    headers: {
      Authorization: `Bearer ${body.token}`,
      Origin: 'http://127.0.0.1:4173'
    }
  });
  assert.equal(session.status, 200);
  assert.equal(session.headers.get('access-control-allow-origin'), 'http://127.0.0.1:4173');
});

test('growth-os snapshot is public but mutations require authenticated session', async () => {
  const snapshotResponse = await request('/api/public/growth-os');
  assert.equal(snapshotResponse.status, 200);
  const snapshot = await snapshotResponse.json();
  assert.equal(snapshot.modules.some((module) => module.id === 'crm-follow-up'), true);
  assert.equal(snapshot.connectorReadiness.total, snapshot.connectors.length);
  assert.equal(snapshot.connectorReadiness.tiers.some((tier) => tier.id === 'P0' && tier.total >= 12), true);
  assert.equal(snapshot.connectorReadiness.tiers.some((tier) => tier.id === 'P1' && tier.total >= 10), true);
  assert.equal(snapshot.connectorReadiness.webhook > 0, true);
  assert.equal(snapshot.connectorReadiness.oauth > 0, true);
  assert.equal(snapshot.connectorReadiness.nextSetup[0].priorityTier, 'P0');
  assert.equal(snapshot.connectorReadiness.nextSetup[0].priorityWave, 'Wave 1 - Messaging and social capture');
  assert.equal(snapshot.connectorReadiness.nextSetup.every((item) => item.adapterKey), true);

  const unauthenticatedMutation = await request('/api/growth-os/leads', {
    method: 'POST',
    body: JSON.stringify({ company: 'Demo Co', contact: 'Demo Contact', source: 'PrimeWeb' })
  });
  assert.equal(unauthenticatedMutation.status, 401);

  const unauthenticatedStageMove = await request('/api/growth-os/leads/lead_001/stage', {
    method: 'POST',
    body: JSON.stringify({ stage: 'qualified' })
  });
  assert.equal(unauthenticatedStageMove.status, 401);

  const unauthenticatedFollowUp = await request('/api/growth-os/leads/lead_001/follow-up', {
    method: 'POST',
    body: JSON.stringify({ note: 'Called customer' })
  });
  assert.equal(unauthenticatedFollowUp.status, 401);

  const unauthenticatedConnectorTest = await request('/api/growth-os/connectors/connector_instagram/test', {
    method: 'POST',
    body: JSON.stringify({ accountRef: 'Prime IG' })
  });
  assert.equal(unauthenticatedConnectorTest.status, 401);

  const { response, body } = await login('admin@primeos.local', 'Admin@PrimeOS2026!');
  assert.equal(response.status, 200);
  const createLead = await request('/api/growth-os/leads', {
    method: 'POST',
    headers: { Authorization: `Bearer ${body.token}` },
    body: JSON.stringify({ company: 'Demo Co', contact: 'Demo Contact', source: 'PrimeWeb' })
  });
  assert.equal(createLead.status, 201);
  const lead = await createLead.json();
  assert.equal(lead.company, 'Demo Co');

  const stageMove = await request(`/api/growth-os/leads/${lead.id}/stage`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${body.token}` },
    body: JSON.stringify({ stage: 'qualified', nextAction: 'Book discovery call', dueAt: 'Tomorrow 09:00' })
  });
  assert.equal(stageMove.status, 200);
  const movedLead = await stageMove.json();
  assert.equal(movedLead.stage, 'qualified');
  assert.equal(movedLead.nextAction, 'Book discovery call');

  const followUp = await request(`/api/growth-os/leads/${lead.id}/follow-up`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${body.token}` },
    body: JSON.stringify({ note: 'Discovery call booked', nextAction: 'Send recap', dueAt: 'Tomorrow 10:00' })
  });
  assert.equal(followUp.status, 200);
  const followedLead = await followUp.json();
  assert.equal(followedLead.lastActivity, 'Discovery call booked');
  assert.equal(followedLead.nextAction, 'Send recap');
  assert.equal(followedLead.score, movedLead.score + 2);

  const connectorPayload = {
    accountRef: 'PrimeOS Instagram Business',
    appId: 'ig_app_2026',
    accessToken: 'instagram-live-token-9087',
    webhookUrl: 'https://api.primeos.local/webhooks/connectors/instagram',
    verifyToken: 'prime-verify-9087'
  };
  const connectorTest = await request('/api/growth-os/connectors/connector_instagram/test', {
    method: 'POST',
    headers: { Authorization: `Bearer ${body.token}` },
    body: JSON.stringify(connectorPayload)
  });
  assert.equal(connectorTest.status, 200);
  const testedConnector = await connectorTest.json();
  assert.equal(testedConnector.ok, true);
  assert.equal(testedConnector.connector.direction, 'two_way');
  assert.equal(testedConnector.connector.maskedCredential, '****9087');
  assert.equal(testedConnector.adapterProfile.adapterKey, 'meta_instagram_business');
  assert.equal(testedConnector.readinessChecks.some((check) => check.key === 'scope_plan' && check.status === 'ready'), true);
  assert.equal(testedConnector.readinessChecks.some((check) => check.key === 'webhook_signature' && check.status === 'ready'), true);

  const connectorConnect = await request('/api/growth-os/connectors/connector_instagram/connect', {
    method: 'POST',
    headers: { Authorization: `Bearer ${body.token}` },
    body: JSON.stringify(connectorPayload)
  });
  assert.equal(connectorConnect.status, 200);
  const connectedConnector = await connectorConnect.json();
  assert.equal(connectedConnector.status, 'connected');
  assert.equal(connectedConnector.provider, 'instagram');
  assert.equal(connectedConnector.inboundEnabled, true);
  assert.equal(connectedConnector.outboundEnabled, true);
  assert.equal(connectedConnector.maskedCredential, '****9087');

  const sampleWebhook = await request('/api/growth-os/connectors/connector_instagram/sample-webhook', {
    method: 'POST',
    headers: { Authorization: `Bearer ${body.token}` },
    body: JSON.stringify({})
  });
  assert.equal(sampleWebhook.status, 201);
  const sampleWebhookBody = await sampleWebhook.json();
  assert.equal(sampleWebhookBody.ok, true);
  assert.equal(sampleWebhookBody.signatureMode, 'meta_hub_signature');
  assert.equal(sampleWebhookBody.event.signatureStatus, 'verified');
  assert.equal(sampleWebhookBody.event.domainRoute, 'message');
  assert.ok(sampleWebhookBody.event.domainRecordId);

  const failedWebhookVerify = await request('/webhooks/connectors/connector_instagram?hub.verify_token=wrong-token&hub.challenge=prime-ok');
  assert.equal(failedWebhookVerify.status, 403);

  const webhookVerify = await request('/webhooks/connectors/connector_instagram?hub.verify_token=prime-verify-9087&hub.challenge=prime-ok');
  assert.equal(webhookVerify.status, 200);
  assert.equal(await webhookVerify.text(), 'prime-ok');

  const unsignedWebhookIngest = await request('/webhooks/connectors/connector_instagram', {
    method: 'POST',
    body: JSON.stringify({ object: 'instagram', entry: [{ id: 'ig_evt_unsigned' }] })
  });
  assert.equal(unsignedWebhookIngest.status, 401);

  const instagramPayload = { object: 'instagram', entry: [{ id: 'ig_evt_001' }] };
  const instagramBody = JSON.stringify(instagramPayload);
  const webhookIngest = await request('/webhooks/connectors/connector_instagram', {
    method: 'POST',
    headers: { 'X-Hub-Signature-256': metaSignature('prime-verify-9087', instagramBody) },
    body: instagramBody
  });
  assert.equal(webhookIngest.status, 202);
  const webhookBody = await webhookIngest.json();
  assert.equal(webhookBody.ok, true);
  assert.equal(webhookBody.event.provider, 'instagram');
  assert.equal(webhookBody.event.adapterKey, 'meta_instagram_business');
  assert.equal(webhookBody.event.signatureStatus, 'verified');
  assert.equal(webhookBody.event.domainRoute, 'message');
  assert.ok(webhookBody.event.domainRecordId);

  const webhookEvents = await request('/api/growth-os/connectors/connector_instagram/events', {
    headers: { Authorization: `Bearer ${body.token}` }
  });
  assert.equal(webhookEvents.status, 200);
  const eventBody = await webhookEvents.json();
  assert.equal(eventBody.events.some((event) => event.externalEventId === 'ig_evt_001'), true);
  const domainEvents = await request('/api/growth-os/connectors/connector_instagram/domain-events', {
    headers: { Authorization: `Bearer ${body.token}` }
  });
  assert.equal(domainEvents.status, 200);
  const domainEventsBody = await domainEvents.json();
  assert.equal(domainEventsBody.events.some((event) => event.domain === 'message' && event.externalEventId === 'ig_evt_001' && event.domainRecordId), true);

  const domainRecords = await request('/api/growth-os/connectors/connector_instagram/domain-records?domain=message', {
    headers: { Authorization: `Bearer ${body.token}` }
  });
  assert.equal(domainRecords.status, 200);
  const domainRecordsBody = await domainRecords.json();
  assert.equal(domainRecordsBody.summary.total >= 1, true);
  assert.equal(domainRecordsBody.records.some((record) => record.domain === 'message' && record.externalEventId === 'ig_evt_001' && record.externalRef === 'ig_evt_001'), true);
  assert.equal(readPersistedConnectorDomainRecords().message.some((record) => record.externalEventId === 'ig_evt_001'), true);
});

test('oauth connector setup starts PKCE session and accepts provider callback state', async () => {
  const { response, body } = await login('admin@primeos.local', 'Admin@PrimeOS2026!');
  assert.equal(response.status, 200);
  const authHeaders = { Authorization: `Bearer ${body.token}` };
  const redirectUri = `${baseUrl}/oauth/connectors/connector_gmail/callback`;
  const tokenRequests = [];
  const revocationRequests = [];
  const probeRequests = [];
  const tokenServer = createServer(async (request, response) => {
    if (request.url === '/probe/gmail') {
      probeRequests.push({
        authorization: request.headers.authorization,
      });
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ emailAddress: 'demo@primeos.local', messagesTotal: 12 }));
      return;
    }

    const body = await readRequestBody(request);
    const params = new URLSearchParams(body);
    if (request.url === '/revoke') {
      revocationRequests.push(params);
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ ok: true }));
      return;
    }
    tokenRequests.push(params);
    response.writeHead(200, { 'Content-Type': 'application/json' });
    if (params.get('grant_type') === 'refresh_token') {
      response.end(JSON.stringify({
        access_token: 'ya29.primeos-refreshed-access-token-2222',
        expires_in: 7200,
        token_type: 'Bearer',
        scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify'
      }));
      return;
    }
    response.end(JSON.stringify({
      access_token: 'ya29.primeos-access-token-9876',
      refresh_token: '1//primeos-refresh-token-5432',
      expires_in: 3600,
      token_type: 'Bearer',
      scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify'
    }));
  });
  await new Promise((resolve) => tokenServer.listen(0, '127.0.0.1', resolve));
  const tokenUrl = `http://127.0.0.1:${tokenServer.address().port}/token`;
  const revocationUrl = `http://127.0.0.1:${tokenServer.address().port}/revoke`;
  process.env.PRIME_CONNECTOR_PROBE_BASE_URL = `http://127.0.0.1:${tokenServer.address().port}`;

  try {
    const start = await request('/api/growth-os/connectors/connector_gmail/oauth/start', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        accountRef: 'demo@primeos.local',
        appId: 'google-client-id-demo.apps.googleusercontent.com',
        clientSecret: 'google-client-secret-demo',
        redirectUri,
        tokenUrl,
        revocationUrl
      })
    });
    assert.equal(start.status, 200);
    const session = await start.json();
    assert.equal(session.connectorId, 'connector_gmail');
    assert.equal(session.oauthProvider, 'google');
    assert.equal(session.pkce, true);
    assert.equal(session.encryptedCodeVerifier, undefined);
    assert.equal(session.encryptedClientSecret, undefined);

    const authUrl = new URL(session.authorizationUrl);
    assert.equal(authUrl.origin + authUrl.pathname, 'https://accounts.google.com/o/oauth2/v2/auth');
    assert.equal(authUrl.searchParams.get('client_id'), 'google-client-id-demo.apps.googleusercontent.com');
    assert.equal(authUrl.searchParams.get('redirect_uri'), redirectUri);
    assert.equal(authUrl.searchParams.get('state'), session.state);
    assert.equal(authUrl.searchParams.get('code_challenge_method'), 'S256');
    assert.ok(authUrl.searchParams.get('code_challenge'));
    assert.ok(authUrl.searchParams.get('scope').includes('https://www.googleapis.com/auth/gmail.readonly'));

    const badCallback = await request('/oauth/connectors/connector_gmail/callback?state=wrong-state&code=demo-code');
    assert.equal(badCallback.status, 404);

    const callback = await request(`/oauth/connectors/connector_gmail/callback?state=${encodeURIComponent(session.state)}&code=provider-code-1234`);
    assert.equal(callback.status, 200);
    const callbackBody = await callback.json();
    assert.equal(callbackBody.ok, true);
    assert.equal(callbackBody.session.status, 'token_exchanged');
    assert.equal(callbackBody.session.accessTokenLast4, '9876');
    assert.equal(callbackBody.session.refreshTokenLast4, '5432');
    assert.equal(callbackBody.session.encryptedAccessToken, undefined);
    assert.equal(callbackBody.session.accessTokenRef, undefined);
    assert.equal(callbackBody.connector.status, 'connected');
    assert.equal(callbackBody.connector.credentialStatus, 'configured');
    assert.equal(callbackBody.connector.maskedCredential, 'oauth:9876');
    assert.equal(callbackBody.connector.credentialMeta.appId, 'google-client-id-demo.apps.googleusercontent.com');
    assert.equal(callbackBody.connector.credentialMeta.encryptedToken, undefined);
    assert.equal(callbackBody.connector.credentialMeta.tokenRef, undefined);

    assert.equal(tokenRequests.length, 1);
    assert.equal(tokenRequests[0].get('grant_type'), 'authorization_code');
    assert.equal(tokenRequests[0].get('code'), 'provider-code-1234');
    assert.equal(tokenRequests[0].get('client_secret'), 'google-client-secret-demo');
    assert.ok(tokenRequests[0].get('code_verifier'));

    const refresh = await request(`/api/growth-os/connectors/connector_gmail/oauth/sessions/${encodeURIComponent(session.state)}/refresh`, {
      method: 'POST',
      headers: authHeaders
    });
    assert.equal(refresh.status, 200);
    const refreshBody = await refresh.json();
    assert.equal(refreshBody.session.status, 'token_exchanged');
    assert.equal(refreshBody.session.tokenExchangeStatus, 'refreshed');
    assert.equal(refreshBody.session.accessTokenLast4, '2222');
    assert.equal(refreshBody.session.refreshTokenLast4, '5432');
    assert.equal(refreshBody.connector.maskedCredential, 'oauth:2222');
    assert.equal(tokenRequests.length, 2);
    assert.equal(tokenRequests[1].get('grant_type'), 'refresh_token');
    assert.equal(tokenRequests[1].get('refresh_token'), '1//primeos-refresh-token-5432');
    const persistedConnectedConnector = readPersistedConnectors().find((item) => item.id === 'connector_gmail');
    assert.ok(persistedConnectedConnector.credentialMeta.tokenRef);
    assert.ok(persistedConnectedConnector.credentialMeta.refreshTokenRef);
    assert.equal(persistedConnectedConnector.credentialMeta.encryptedToken, undefined);
    assert.equal(persistedConnectedConnector.credentialMeta.encryptedRefreshToken, undefined);
    const activeVaultEntries = readPersistedCredentialVault().filter((item) => item.connectorId === 'connector_gmail' && item.status === 'active');
    assert.equal(activeVaultEntries.some((item) => item.type === 'oauth_access_token' && item.last4 === '2222'), true);
    assert.equal(activeVaultEntries.some((item) => item.type === 'oauth_refresh_token' && item.last4 === '5432'), true);

    const probe = await request('/api/growth-os/connectors/connector_gmail/probe', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ state: session.state })
    });
    assert.equal(probe.status, 200);
    const probeBody = await probe.json();
    assert.equal(probeBody.ok, true);
    assert.equal(probeBody.status, 'ready');
    assert.equal(probeBody.expectedPath, 'emailAddress');
    assert.equal(probeRequests.length, 1);
    assert.equal(probeRequests[0].authorization, 'Bearer ya29.primeos-refreshed-access-token-2222');

    const revoke = await request(`/api/growth-os/connectors/connector_gmail/oauth/sessions/${encodeURIComponent(session.state)}/revoke`, {
      method: 'POST',
      headers: authHeaders
    });
    assert.equal(revoke.status, 200);
    const revokeBody = await revoke.json();
    assert.equal(revokeBody.ok, true);
    assert.equal(revokeBody.providerCalled, true);
    assert.equal(revokeBody.session.status, 'revoked');
    assert.equal(revokeBody.session.revocationStatus, 'provider_revoked');
    assert.equal(revokeBody.session.encryptedRefreshToken, undefined);
    assert.equal(revokeBody.session.refreshTokenRef, undefined);
    assert.equal(revokeBody.connector.status, 'disconnected');
    assert.equal(revokeBody.connector.credentialStatus, 'removed');
    assert.equal(revocationRequests.length, 1);
    assert.equal(revocationRequests[0].get('token'), '1//primeos-refresh-token-5432');
    assert.equal(revocationRequests[0].get('token_type_hint'), 'refresh_token');

    const status = await request(`/api/growth-os/connectors/connector_gmail/oauth/sessions/${encodeURIComponent(session.state)}`, {
      headers: authHeaders
    });
    assert.equal(status.status, 200);
    assert.equal((await status.json()).status, 'revoked');
    assert.equal(readPersistedConnectorOAuthSessions().some((item) => item.state === session.state && item.status === 'revoked' && !item.accessTokenRef && !item.refreshTokenRef && !item.encryptedAccessToken && !item.encryptedRefreshToken), true);
    const revokedVaultEntries = readPersistedCredentialVault().filter((item) => item.connectorId === 'connector_gmail' && item.status === 'revoked');
    assert.equal(revokedVaultEntries.some((item) => item.type === 'oauth_access_token' && !item.encryptedCredential), true);
    assert.equal(revokedVaultEntries.some((item) => item.type === 'oauth_refresh_token' && !item.encryptedCredential), true);
    assert.equal(readPersistedConnectors().some((item) => item.id === 'connector_gmail'), false);
  } finally {
    delete process.env.PRIME_CONNECTOR_PROBE_BASE_URL;
    await new Promise((resolve, reject) => tokenServer.close((error) => (error ? reject(error) : resolve())));
  }
});

test('wave 1 connector webhooks enforce provider signature profiles', async () => {
  const { response, body } = await login('admin@primeos.local', 'Admin@PrimeOS2026!');
  assert.equal(response.status, 200);
  const authHeaders = { Authorization: `Bearer ${body.token}` };

  const connect = async (connectorId, payload) => {
    const connected = await request(`/api/growth-os/connectors/${connectorId}/connect`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(payload)
    });
    assert.equal(connected.status, 200);
    return connected.json();
  };

  await connect('connector_stripe', {
    accountRef: 'acct_primeos_stripe',
    accessToken: 'sk_test_primeos_123456',
    webhookUrl: `${baseUrl}/webhooks/connectors/connector_stripe`,
    verifyToken: 'whsec_primeos_stripe_123456'
  });
  const stripePayload = { id: 'evt_stripe_001', type: 'payment_intent.succeeded', data: { object: { id: 'pi_prime_001' } } };
  const stripeBody = JSON.stringify(stripePayload);
  const stripeIngest = await request('/webhooks/connectors/connector_stripe', {
    method: 'POST',
    headers: { 'Stripe-Signature': stripeSignature('whsec_primeos_stripe_123456', stripeBody) },
    body: stripeBody
  });
  assert.equal(stripeIngest.status, 202);
  const stripeIngestBody = await stripeIngest.json();
  assert.equal(stripeIngestBody.event.signatureStatus, 'verified');
  assert.equal(stripeIngestBody.event.domainRoute, 'payment');
  assert.ok(stripeIngestBody.event.domainRecordId);

  await connect('connector_shopify', {
    accountRef: 'primeos-demo.myshopify.com',
    accessToken: 'shpat_primeos_123456',
    webhookUrl: `${baseUrl}/webhooks/connectors/connector_shopify`,
    verifyToken: 'shopify_webhook_secret_123456'
  });
  const shopifyPayload = { id: 501, topic: 'orders/create', admin_graphql_api_id: 'gid://shopify/Order/501' };
  const shopifyBody = JSON.stringify(shopifyPayload);
  const shopifyIngest = await request('/webhooks/connectors/connector_shopify', {
    method: 'POST',
    headers: { 'X-Shopify-Hmac-Sha256': hmacBase64('shopify_webhook_secret_123456', shopifyBody) },
    body: shopifyBody
  });
  assert.equal(shopifyIngest.status, 202);
  const shopifyIngestBody = await shopifyIngest.json();
  assert.equal(shopifyIngestBody.event.signatureStatus, 'verified');
  assert.equal(shopifyIngestBody.event.domainRoute, 'order');
  assert.ok(shopifyIngestBody.event.domainRecordId);

  await connect('connector_shopee', {
    accountRef: 'primeos-shopee-shop',
    accessToken: 'shopee_partner_token_123456',
    webhookUrl: `${baseUrl}/webhooks/connectors/connector_shopee`,
    verifyToken: 'shopee_webhook_secret_123456'
  });
  const shopeePayload = { event_id: 'shopee_evt_001', order_sn: '240623ABC001', event: 'order_status_update' };
  const shopeeBody = JSON.stringify(shopeePayload);
  const shopeeBadSignature = await request('/webhooks/connectors/connector_shopee', {
    method: 'POST',
    headers: { 'X-Shopee-Signature': hmacHex('wrong_secret', shopeeBody) },
    body: shopeeBody
  });
  assert.equal(shopeeBadSignature.status, 401);
  const shopeeIngest = await request('/webhooks/connectors/connector_shopee', {
    method: 'POST',
    headers: { 'X-Shopee-Signature': hmacHex('shopee_webhook_secret_123456', shopeeBody) },
    body: shopeeBody
  });
  assert.equal(shopeeIngest.status, 202);
  const shopeeIngestBody = await shopeeIngest.json();
  assert.equal(shopeeIngestBody.event.signatureStatus, 'verified');
  assert.equal(shopeeIngestBody.event.domainRoute, 'order');
  assert.ok(shopeeIngestBody.event.domainRecordId);

  await connect('connector_vnpay', {
    accountRef: 'primeos-vnpay-merchant',
    accessToken: 'vnpay_terminal_key_123456',
    webhookUrl: `${baseUrl}/webhooks/connectors/connector_vnpay`,
    verifyToken: 'vnpay_hash_secret_123456'
  });
  const vnpayPayload = withVnpayHash({
    vnp_TmnCode: 'PRIMEOS',
    vnp_TxnRef: 'PAY001',
    vnp_Amount: '2500000',
    vnp_ResponseCode: '00',
    vnp_TransactionNo: '14123456'
  }, 'vnpay_hash_secret_123456');
  const vnpayIngest = await request('/webhooks/connectors/connector_vnpay', {
    method: 'POST',
    body: JSON.stringify(vnpayPayload)
  });
  assert.equal(vnpayIngest.status, 202);
  const vnpayBody = await vnpayIngest.json();
  assert.equal(vnpayBody.event.provider, 'vnpay');
  assert.equal(vnpayBody.event.signatureStatus, 'verified');
  assert.equal(vnpayBody.event.domainRoute, 'payment');
  assert.ok(vnpayBody.event.domainRecordId);

  const persistedRecords = readPersistedConnectorDomainRecords();
  assert.equal(persistedRecords.payment.some((record) => record.externalEventId === 'evt_stripe_001' && record.paymentRef === 'pi_prime_001'), true);
  assert.equal(persistedRecords.payment.some((record) => record.externalEventId === 'PAY001' && record.paymentRef === 'PAY001'), true);
  assert.equal(persistedRecords.order.some((record) => record.externalEventId === '501' && record.orderRef === '501'), true);
  assert.equal(persistedRecords.order.some((record) => record.externalEventId === 'shopee_evt_001' && record.orderRef === '240623ABC001'), true);
});

test('connector domain event queue supports dead-letter, requeue, and retry', async () => {
  const { response, body } = await login('admin@primeos.local', 'Admin@PrimeOS2026!');
  assert.equal(response.status, 200);
  const authHeaders = { Authorization: `Bearer ${body.token}` };

  const connected = await request('/api/growth-os/connectors/connector_stripe/connect', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      accountRef: 'acct_primeos_stripe_queue',
      accessToken: 'sk_test_primeos_queue_123456',
      webhookUrl: `${baseUrl}/webhooks/connectors/connector_stripe`,
      verifyToken: 'whsec_primeos_stripe_123456'
    })
  });
  assert.equal(connected.status, 200);

  const stripePayload = { id: 'evt_stripe_queue_001', type: 'payment_intent.succeeded', data: { object: { id: 'pi_prime_queue_001' } } };
  const stripeBody = JSON.stringify(stripePayload);
  const ingest = await request('/webhooks/connectors/connector_stripe', {
    method: 'POST',
    headers: { 'Stripe-Signature': stripeSignature('whsec_primeos_stripe_123456', stripeBody) },
    body: stripeBody
  });
  assert.equal(ingest.status, 202);
  const ingestBody = await ingest.json();
  const domainEventId = ingestBody.event.domainEventId;
  assert.ok(domainEventId);

  const routedList = await request('/api/growth-os/connectors/connector_stripe/domain-events?status=routed', {
    headers: authHeaders
  });
  assert.equal(routedList.status, 200);
  const routedBody = await routedList.json();
  assert.equal(routedBody.events.some((event) => event.id === domainEventId && event.attemptCount === 1), true);
  assert.equal(routedBody.summary.routed >= 1, true);

  const paymentRecords = await request('/api/growth-os/connectors/connector_stripe/domain-records?domain=payment', {
    headers: authHeaders
  });
  assert.equal(paymentRecords.status, 200);
  const paymentRecordsBody = await paymentRecords.json();
  assert.equal(paymentRecordsBody.summary.byDomain.payment >= 1, true);
  assert.equal(paymentRecordsBody.records.some((record) => record.domainEventId === domainEventId && record.paymentRef === 'pi_prime_queue_001'), true);

  const deadLetter = await request(`/api/growth-os/connectors/connector_stripe/domain-events/${domainEventId}/dead-letter`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ reason: 'Downstream finance route failed in queue test.' })
  });
  assert.equal(deadLetter.status, 200);
  const deadLetterBody = await deadLetter.json();
  assert.equal(deadLetterBody.event.status, 'dead_letter');
  assert.equal(deadLetterBody.event.lastError.includes('finance route failed'), true);

  const retryWhileDeadLettered = await request(`/api/growth-os/connectors/connector_stripe/domain-events/${domainEventId}/retry`, {
    method: 'POST',
    headers: authHeaders
  });
  assert.equal(retryWhileDeadLettered.status, 409);

  const requeue = await request(`/api/growth-os/connectors/connector_stripe/domain-events/${domainEventId}/requeue`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ reason: 'Finance queue is healthy again.' })
  });
  assert.equal(requeue.status, 200);
  const requeueBody = await requeue.json();
  assert.equal(requeueBody.event.status, 'retry_pending');
  assert.ok(requeueBody.event.nextRetryAt);

  const retry = await request(`/api/growth-os/connectors/connector_stripe/domain-events/${domainEventId}/retry`, {
    method: 'POST',
    headers: authHeaders
  });
  assert.equal(retry.status, 200);
  const retryBody = await retry.json();
  assert.equal(retryBody.event.status, 'routed');
  assert.equal(retryBody.event.attemptCount, 2);
  assert.equal(retryBody.event.lastError, null);

  const persistedEvent = readPersistedConnectorDomainEvents().find((event) => event.id === domainEventId);
  assert.equal(persistedEvent.status, 'routed');
  assert.equal(persistedEvent.attemptCount, 2);
});

test('wave 2 connectors expose adapter profiles and enforce available signature guards', async () => {
  const snapshotResponse = await request('/api/public/growth-os');
  assert.equal(snapshotResponse.status, 200);
  const snapshot = await snapshotResponse.json();
  const waveTwoProviders = [
    'line',
    'telegram',
    'gmail',
    'outlook',
    'google_sheets',
    'slack',
    'paypal',
    'momo',
    'myinvois',
    'meta_ads',
    'tiktok_ads',
    'google_analytics'
  ];

  for (const provider of waveTwoProviders) {
    const connector = snapshot.connectors.find((item) => item.provider === provider);
    assert.ok(connector, `${provider} connector exists`);
    assert.notEqual(connector.adapterProfile.adapterKey, 'generic_rest_connector', `${provider} has provider adapter profile`);
    assert.ok(connector.adapterProfile.requiredScopes.length > 0, `${provider} has scope plan`);
  }

  const { response, body } = await login('admin@primeos.local', 'Admin@PrimeOS2026!');
  assert.equal(response.status, 200);
  const authHeaders = { Authorization: `Bearer ${body.token}` };

  const testConnector = async (connectorId, payload) => {
    const tested = await request(`/api/growth-os/connectors/${connectorId}/test`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(payload)
    });
    assert.equal(tested.status, 200);
    return tested.json();
  };

  const lineTest = await testConnector('connector_line', {
    accountRef: 'primeos-line-channel',
    accessToken: 'line_channel_token_123456',
    webhookUrl: `${baseUrl}/webhooks/connectors/connector_line`,
    verifyToken: 'line_channel_secret_123456'
  });
  assert.equal(lineTest.adapterProfile.adapterKey, 'line_messaging_channel');
  assert.equal(lineTest.readinessChecks.some((check) => check.key === 'webhook_signature' && check.status === 'ready'), true);
  const linePayload = { events: [{ webhookEventId: 'line_evt_001', type: 'message' }] };
  const lineBody = JSON.stringify(linePayload);
  const lineIngest = await request('/webhooks/connectors/connector_line', {
    method: 'POST',
    headers: { 'X-Line-Signature': hmacBase64('line_channel_secret_123456', lineBody) },
    body: lineBody
  });
  assert.equal(lineIngest.status, 202);
  const lineEvent = await lineIngest.json();
  assert.equal(lineEvent.event.externalEventId, 'line_evt_001');
  assert.equal(lineEvent.event.signatureStatus, 'verified');

  await testConnector('connector_telegram', {
    accountRef: '@primeos_demo_bot',
    accessToken: 'telegram_bot_token_123456',
    webhookUrl: `${baseUrl}/webhooks/connectors/connector_telegram`,
    verifyToken: 'telegram_secret_123456'
  });
  const telegramPayload = { update_id: 20260623, message: { message_id: 1, text: '/start' } };
  const telegramMissingSecret = await request('/webhooks/connectors/connector_telegram', {
    method: 'POST',
    body: JSON.stringify(telegramPayload)
  });
  assert.equal(telegramMissingSecret.status, 401);
  const telegramIngest = await request('/webhooks/connectors/connector_telegram', {
    method: 'POST',
    headers: { 'X-Telegram-Bot-Api-Secret-Token': 'telegram_secret_123456' },
    body: JSON.stringify(telegramPayload)
  });
  assert.equal(telegramIngest.status, 202);
  assert.equal((await telegramIngest.json()).event.signatureStatus, 'verified');

  await testConnector('connector_slack', {
    accountRef: 'primeos-workspace/#ops',
    accessToken: 'xoxb-primeos-slack-token',
    webhookUrl: `${baseUrl}/webhooks/connectors/connector_slack`,
    verifyToken: 'slack_signing_secret_123456'
  });
  const slackPayload = { type: 'event_callback', event_id: 'slack_evt_001', event: { type: 'app_mention' } };
  const slackBody = JSON.stringify(slackPayload);
  const slackSigned = slackSignature('slack_signing_secret_123456', slackBody);
  const slackBadSignature = await request('/webhooks/connectors/connector_slack', {
    method: 'POST',
    headers: {
      'X-Slack-Request-Timestamp': slackSigned.timestamp,
      'X-Slack-Signature': slackSignature('wrong_secret', slackBody, Number(slackSigned.timestamp)).signature
    },
    body: slackBody
  });
  assert.equal(slackBadSignature.status, 401);
  const slackIngest = await request('/webhooks/connectors/connector_slack', {
    method: 'POST',
    headers: {
      'X-Slack-Request-Timestamp': slackSigned.timestamp,
      'X-Slack-Signature': slackSigned.signature
    },
    body: slackBody
  });
  assert.equal(slackIngest.status, 202);
  assert.equal((await slackIngest.json()).event.externalEventId, 'slack_evt_001');

  await testConnector('connector_momo', {
    accountRef: 'primeos-momo-partner',
    accessToken: 'momo_partner_token_123456',
    webhookUrl: `${baseUrl}/webhooks/connectors/connector_momo`,
    verifyToken: 'momo_ipn_secret_123456'
  });
  const momoPayload = { event_id: 'momo_evt_001', event: 'payment.completed', amount: 2500000 };
  const momoBody = JSON.stringify(momoPayload);
  const momoIngest = await request('/webhooks/connectors/connector_momo', {
    method: 'POST',
    headers: { 'X-MoMo-Signature': hmacHex('momo_ipn_secret_123456', momoBody) },
    body: momoBody
  });
  assert.equal(momoIngest.status, 202);
  const momoEvent = await momoIngest.json();
  assert.equal(momoEvent.event.signatureStatus, 'verified');
  assert.equal(momoEvent.event.domainRoute, 'payment');
  assert.ok(momoEvent.event.domainRecordId);
  assert.equal(readPersistedConnectorEvents().some((event) => event.externalEventId === 'momo_evt_001'), true);
  assert.equal(readPersistedConnectorDomainEvents().some((event) => event.domain === 'payment' && event.externalEventId === 'momo_evt_001'), true);
  assert.equal(readPersistedConnectorDomainRecords().payment.some((record) => record.externalEventId === 'momo_evt_001' && record.paymentRef === 'momo_evt_001'), true);
});

test('listed wave 3 and long-tail connectors have adapter profiles and durable webhook events', async () => {
  const snapshotResponse = await request('/api/public/growth-os');
  assert.equal(snapshotResponse.status, 200);
  const snapshot = await snapshotResponse.json();
  const listedProviders = [
    'whatsapp',
    'messenger',
    'wechat',
    'telegram',
    'line',
    'zalo',
    'viber',
    'gmail',
    'outlook',
    'facebook',
    'instagram',
    'tiktok',
    'youtube',
    'meta_ads',
    'google_ads',
    'tiktok_ads',
    'linkedin_ads',
    'shopify',
    'woocommerce',
    'shopee',
    'lazada',
    'amazon',
    'tiktok_shop',
    'myinvois',
    'stripe',
    'paypal',
    'vnpay',
    'momo',
    'google_sheets',
    'slack',
    'notion',
    'zapier',
    'google_analytics'
  ];

  for (const provider of listedProviders) {
    const connector = snapshot.connectors.find((item) => item.provider === provider);
    assert.ok(connector, `${provider} connector exists`);
    assert.notEqual(connector.adapterProfile.adapterKey, 'generic_rest_connector', `${provider} has adapter profile`);
    assert.ok(connector.adapterProfile.requiredScopes.length > 0, `${provider} has required scopes`);
    assert.ok(connector.requiredFields.length > 0, `${provider} has setup fields`);
  }

  const { response, body } = await login('admin@primeos.local', 'Admin@PrimeOS2026!');
  assert.equal(response.status, 200);

  for (const provider of listedProviders) {
    const connector = snapshot.connectors.find((item) => item.provider === provider);
    const credentialTest = await request(`/api/growth-os/connectors/${connector.id}/test`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${body.token}` },
      body: JSON.stringify(demoConnectorSetupPayload(connector))
    });
    assert.equal(credentialTest.status, 200, `${provider} setup payload is accepted`);
    const credentialTestBody = await credentialTest.json();
    assert.equal(
      credentialTestBody.readinessChecks.some((check) => check.key === 'credential_provider' && check.status === 'ready'),
      true,
      `${provider} credential provider check is ready`
    );
  }

  const invalidStripeConnector = snapshot.connectors.find((item) => item.provider === 'stripe');
  const invalidStripeTest = await request(`/api/growth-os/connectors/${invalidStripeConnector.id}/test`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${body.token}` },
    body: JSON.stringify({
      ...demoConnectorSetupPayload(invalidStripeConnector),
      accessToken: 'invalid_stripe_key_123456'
    })
  });
  assert.equal(invalidStripeTest.status, 200);
  const invalidStripeBody = await invalidStripeTest.json();
  assert.equal(
    invalidStripeBody.readinessChecks.some((check) => check.key === 'credential_provider' && check.status === 'watch'),
    true
  );

  const wooPayload = {
    accountRef: 'https://primeos-woo.example',
    accessToken: 'ck_primeos_wc_123456',
    webhookUrl: `${baseUrl}/webhooks/connectors/connector_woocommerce`,
    verifyToken: 'woocommerce_webhook_secret_123456'
  };
  const wooTest = await request('/api/growth-os/connectors/connector_woocommerce/test', {
    method: 'POST',
    headers: { Authorization: `Bearer ${body.token}` },
    body: JSON.stringify(wooPayload)
  });
  assert.equal(wooTest.status, 200);
  const wooTestBody = await wooTest.json();
  assert.equal(wooTestBody.adapterProfile.adapterKey, 'woocommerce_rest');
  assert.equal(wooTestBody.readinessChecks.some((check) => check.key === 'webhook_signature' && check.status === 'ready'), true);
  assert.equal(wooTestBody.readinessChecks.some((check) => check.key === 'credential_provider' && check.status === 'ready'), true);

  const wooEvent = { id: 'woo_evt_001', topic: 'order.created', order_id: 'woo_order_001' };
  const wooBody = JSON.stringify(wooEvent);
  const wooBadSignature = await request('/webhooks/connectors/connector_woocommerce', {
    method: 'POST',
    headers: { 'X-WC-Webhook-Signature': hmacBase64('wrong_secret', wooBody) },
    body: wooBody
  });
  assert.equal(wooBadSignature.status, 401);

  const wooIngest = await request('/webhooks/connectors/connector_woocommerce', {
    method: 'POST',
    headers: { 'X-WC-Webhook-Signature': hmacBase64('woocommerce_webhook_secret_123456', wooBody) },
    body: wooBody
  });
  assert.equal(wooIngest.status, 202);
  const wooIngestBody = await wooIngest.json();
  assert.equal(wooIngestBody.event.signatureStatus, 'verified');
  assert.equal(wooIngestBody.event.domainRoute, 'order');
  assert.ok(wooIngestBody.event.domainRecordId);
  assert.equal(readPersistedConnectorEvents().some((event) => event.externalEventId === 'woo_evt_001'), true);
  assert.equal(readPersistedConnectorDomainEvents().some((event) => event.domain === 'order' && event.externalEventId === 'woo_evt_001'), true);
  assert.equal(readPersistedConnectorDomainRecords().order.some((record) => record.externalEventId === 'woo_evt_001' && record.orderRef === 'woo_order_001'), true);
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
