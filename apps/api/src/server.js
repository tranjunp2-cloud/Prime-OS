import express from 'express';
import { createOrderStore } from './orders.js';
import cors from 'cors';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { WebSocketServer } from 'ws';
import {
  authenticatePassword,
  createSessionToken,
  listIdentityAccounts,
  revokeSessionToken,
  toSafeAccount,
  updateIdentityAccount,
  verifySessionToken
} from './auth.js';
import {
  createResourceItem,
  deleteResourceItem,
  getAdminMeta,
  getResourceItem,
  isSupportedResource,
  listResource,
  resourceKeys,
  resetDatabase,
  updateResourceItem
} from './store.js';
import {
  approveGrowthAiAction,
  connectGrowthConnector,
  createConnectorSampleWebhook,
  createGrowthLead,
  deadLetterConnectorDomainEvent,
  disconnectGrowthConnector,
  findRawConnector,
  completeConnectorOAuthSetup,
  getConnectorAccessToken,
  getConnectorDomainEventSummary,
  getConnectorDomainEvents,
  getConnectorDomainRecordSummary,
  getConnectorDomainRecords,
  getConnectorWebhookEvents,
  getConnectorOAuthSetupSession,
  getGrowthOsSnapshot,
  ingestConnectorWebhook,
  logGrowthLeadFollowUp,
  probeGrowthConnector,
  refreshConnectorOAuthToken,
  requeueConnectorDomainEvent,
  retryConnectorDomainEvent,
  revokeConnectorOAuthToken,
  startConnectorOAuthSetup,
  testGrowthConnector,
  updateGrowthLeadStage,
  verifyConnectorWebhook
} from './growth-os.js';
import {
  getTelegramMessages,
  sendTelegramMessage,
  startTelegramPolling,
  stopTelegramPolling,
  addOutboundMessage,
} from './telegram-gateway.js';
import {
  getConversations,
  getConversation,
  sendConversationMessage,
} from './crm-chat.js';
import { start as startWorkerQueue, stop as stopWorkerQueue, getStats as getWorkerQueueStats, getDeadLetters, requeueDeadLetter, drainDeadLetters } from './worker-queue.js';
import { startCredentialHealthMonitor, stopCredentialHealthMonitor, getAllConnectorHealth, getCredentialHealthStats } from './credential-health-monitor.js';
import {
  bulkDeleteScheduledTasks,
  bulkToggleScheduledTasks,
  createScheduledTask,
  deleteScheduledTask,
  getScheduledTask,
  listScheduledTasks,
  listTaskExecutionLogs,
  runScheduledTaskNow,
  scheduledTaskTemplates,
  startScheduledTaskScheduler,
  toggleScheduledTask,
  updateScheduledTask,
} from './scheduled-tasks.js';
import {
  assignReceivableOwner,
  confirmReceivablePayment,
  flagReceivableDispute,
  getFinanceForecast,
  getFinanceOpsOverview,
  getFinanceOpsSummary,
  getReceivable,
  listFinanceRisks,
  listReceivables,
  resolveFinanceRisk,
  sendPaymentReminder,
  updateFinanceTarget,
} from './finance-ops.js';
import { createFeedback } from './feedbacks.js';
import { getOnboardingStatus, updateOnboardingPreferences } from './onboarding.js';
import {
  connectChannel,
  getChannelPlatform,
  getChannelSyncStatus,
  listAvailablePlatforms,
  listChannelWarehouses,
  listConnectedChannels,
} from './channel-integrations.js';
import {
  createLiveSession,
  endLiveSession,
  getLiveCommerceOptions,
  getLiveSession,
  getLiveSessionEvents,
  getLiveSessionSummary,
  listLiveSessions,
  topUpLiveSession,
  updateLiveSession,
} from './live-commerce.js';
import { connectConversationChannel, deleteConversationChannel, listConversationChannels, listQuickLinkableStores, reauthorizeConversationChannel, testConversationPing, toggleConversationPause, updateConversationChannel } from './conversation-channels.js';

const app = express();
const port = Number(process.env.PORT || 8180);
const demoCredentialsEnabled = process.env.PRIME_ALLOW_DEMO_CREDENTIALS === 'true';
const dockerDemoTrafficEnabled = process.env.PRIME_ALLOW_DOCKER_DEMO_TRAFFIC === 'true';
const host = process.env.HOST || (demoCredentialsEnabled ? '127.0.0.1' : '0.0.0.0');
const configuredAllowedOrigins = String(process.env.PRIME_ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const localDevOrigins = [
  'http://127.0.0.1:4173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'http://localhost:5173',
  'http://127.0.0.1:5174',
  'http://localhost:5174',
  'http://127.0.0.1:5177',
  'http://localhost:5177',
  'http://127.0.0.1:5178',
  'http://localhost:5178',
  'http://127.0.0.1:5188',
  'http://localhost:5188',
  'http://127.0.0.1:3007',
  'http://localhost:3007'
];
const allowedOrigins = new Set(
  demoCredentialsEnabled
    ? [...localDevOrigins, ...configuredAllowedOrigins]
    : configuredAllowedOrigins
);
const loginWindowMs = Number(process.env.PRIME_LOGIN_RATE_LIMIT_WINDOW_MS || 1000 * 60 * 10);
const loginMaxAttempts = Number(process.env.PRIME_LOGIN_RATE_LIMIT_MAX || 8);
const loginAttempts = new Map();
const accessModel = {
  admin: {
    roleLabel: 'Admin control room',
    description: 'Full CRUD across PrimeOS intelligence, ecom/COS, crm, finance, customer, and identity surfaces.',
    visibleResources: resourceKeys,
    writableResources: resourceKeys,
    canReset: true
  },
  user: {
    roleLabel: 'User read-only view',
    description: 'Read-only access across PrimeOS control surfaces. Identity and mutation authority stay hidden.',
    visibleResources: resourceKeys.filter((resource) => !['admins', 'users'].includes(resource)),
    writableResources: [],
    canReset: false
  }
};

app.disable('x-powered-by');
app.use((_request, response, next) => {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Origin is not allowed by PrimeOS CORS policy.'));
  },
  credentials: false,
  allowedHeaders: [
    'Authorization',
    'Content-Type',
    'Stripe-Signature',
    'X-Hub-Signature-256',
    'X-Shopify-Hmac-Sha256',
    'X-PrimeOS-Signature',
    'X-Shopee-Signature',
    'X-Lazada-Signature',
    'X-TTS-Signature',
    'X-Zalo-Signature',
    'X-TikTok-Signature',
    'X-Line-Signature',
    'X-Slack-Signature',
    'X-Slack-Request-Timestamp',
    'X-Telegram-Bot-Api-Secret-Token',
    'X-MoMo-Signature',
    'X-WC-Webhook-Signature'
  ],
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(express.json({
  limit: process.env.PRIME_JSON_LIMIT || '1mb',
  verify(request, _response, buffer) {
    request.rawBody = buffer.toString('utf8');
  }
}));

app.use((request, response, next) => {
  const requestId = request.header('x-request-id') || `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  request.primeRequestId = requestId;
  response.setHeader('X-Request-Id', requestId);
  next();
});

const accountWorkspace = {
  id: 'ws_primeos_local',
  name: 'PrimeOS main workspace',
  slug: 'primeos-main',
  default_locale: 'vi-VN',
  default_timezone: 'Asia/Ho_Chi_Minh',
  markets: ['VN', 'JP']
};
const roleDefinitions = [
  {
    role_key: 'admin',
    label: 'Admin',
    description: 'Full workspace, configuration, member, and audit access.',
    permissions: ['account.profile.read_self', 'account.profile.update_self', 'workspace.read', 'iam.members.read', 'iam.members.invite', 'iam.members.suspend', 'iam.members.reactivate', 'iam.members.update_role', 'iam.roles.read', 'iam.roles.update', 'iam.audit.read']
  },
  {
    role_key: 'pos_cashier',
    label: 'POS Cashier',
    description: 'Checkout, returns, assigned register, and shift operations.',
    permissions: ['account.profile.read_self', 'account.profile.update_self', 'workspace.read', 'iam.roles.read', 'pos.checkout', 'pos.returns', 'pos.shift.read']
  },
  {
    role_key: 'crm_sales',
    label: 'CRM Sales',
    description: 'Leads, customer profiles, conversations, and follow-up activities.',
    permissions: ['account.profile.read_self', 'account.profile.update_self', 'workspace.read', 'iam.roles.read', 'crm.customers.read', 'crm.leads.manage', 'crm.conversations.manage']
  },
  {
    role_key: 'warehouse_manager',
    label: 'Warehouse Manager',
    description: 'Inventory, fulfillment, transfers, and stock adjustments.',
    permissions: ['account.profile.read_self', 'account.profile.update_self', 'workspace.read', 'iam.roles.read', 'inventory.read', 'inventory.adjust', 'fulfillment.manage']
  },
  {
    role_key: 'web_editor',
    label: 'Web Editor',
    description: 'PrimeWeb content, navigation, theme, and publishing workflows.',
    permissions: ['account.profile.read_self', 'account.profile.update_self', 'workspace.read', 'iam.roles.read', 'web.content.manage', 'web.theme.manage', 'web.publish']
  }
];
const membershipOverrides = new Map([
  ['login_user_001', { role_key: 'warehouse_manager', status: 'active', last_active_at: '2026-08-13T12:18:00.000Z' }]
]);
const memberInvitations = [
  { id: 'inv_demo_web', workspace_id: accountWorkspace.id, email: 'maya.web@unifi.business', role_key: 'web_editor', seat_type: 'seller_operator', status: 'pending', expires_at: '2026-08-20T03:00:00.000Z', created_at: '2026-08-13T03:00:00.000Z' },
  { id: 'inv_demo_pos', workspace_id: accountWorkspace.id, email: 'cashier.tanbinh@unifi.business', role_key: 'pos_cashier', seat_type: 'seller_operator', status: 'pending', expires_at: '2026-08-19T04:30:00.000Z', created_at: '2026-08-12T04:30:00.000Z' },
  { id: 'inv_demo_crm', workspace_id: accountWorkspace.id, email: 'sales.hcm@unifi.business', role_key: 'crm_sales', seat_type: 'seller_operator', status: 'pending', expires_at: '2026-08-18T08:15:00.000Z', created_at: '2026-08-11T08:15:00.000Z' }
];
const accountAuditEvents = [
  { id: 'audit_demo_008', workspace_id: accountWorkspace.id, actor_principal_id: 'login_admin_001', session_id: null, action: 'catalog.price.updated', target_type: 'master_product', target_id: 'CR-NTB-BLK-A5', before: { price: 2650000 }, after: { price: 2800000 }, result: 'success', request_id: 'demo_price', ip: '127.0.0.1', user_agent: 'PrimeOS Web', created_at: '2026-08-13T12:42:00.000Z' },
  { id: 'audit_demo_007', workspace_id: accountWorkspace.id, actor_principal_id: 'login_user_001', session_id: null, action: 'inventory.adjustment.approved', target_type: 'warehouse_stock', target_id: 'WH-HCM-CR-SKB-MDN-A5', before: { available: 42 }, after: { available: 48 }, result: 'success', request_id: 'demo_inventory', ip: '127.0.0.1', user_agent: 'PrimeOS Web', created_at: '2026-08-13T11:20:00.000Z' },
  { id: 'audit_demo_006', workspace_id: accountWorkspace.id, actor_principal_id: 'login_admin_001', session_id: null, action: 'promotion.campaign.cancelled', target_type: 'promotion', target_id: 'FLASH-AUG-15', before: { status: 'scheduled' }, after: { status: 'cancelled' }, result: 'success', request_id: 'demo_promo', ip: '127.0.0.1', user_agent: 'PrimeOS Web', created_at: '2026-08-13T09:05:00.000Z' },
  { id: 'audit_demo_005', workspace_id: accountWorkspace.id, actor_principal_id: 'login_admin_001', session_id: null, action: 'iam.role.permissions.updated', target_type: 'role_definition', target_id: 'warehouse_manager', before: { rules: 6 }, after: { rules: 7 }, result: 'success', request_id: 'demo_role', ip: '127.0.0.1', user_agent: 'PrimeOS Web', created_at: '2026-08-12T10:35:00.000Z' },
  { id: 'audit_demo_004', workspace_id: accountWorkspace.id, actor_principal_id: 'login_admin_001', session_id: null, action: 'order.delete.blocked', target_type: 'commerce_order', target_id: 'ORD-10508', before: null, after: null, result: 'failure', request_id: 'demo_blocked', ip: '127.0.0.1', user_agent: 'PrimeOS Web', created_at: '2026-08-12T08:10:00.000Z' },
  { id: 'audit_demo_003', workspace_id: accountWorkspace.id, actor_principal_id: 'login_admin_001', session_id: null, action: 'iam.member.invited', target_type: 'invitation', target_id: 'inv_demo_web', before: null, after: { role_key: 'web_editor' }, result: 'success', request_id: 'demo_invite', ip: '127.0.0.1', user_agent: 'PrimeOS Web', created_at: '2026-08-11T07:45:00.000Z' }
];

function nowIso() {
  return new Date().toISOString();
}

function getRoleKey(account) {
  return account?.role === 'admin' ? 'admin' : 'warehouse_manager';
}

function getMembershipForAccount(account) {
  const override = membershipOverrides.get(account.id) || {};
  return {
    id: `wm_${account.id}`,
    workspace_id: accountWorkspace.id,
    principal_id: account.id,
    role_key: override.role_key || getRoleKey(account),
    seat_type: account.seatType || (account.role === 'admin' ? 'full_admin' : 'seller_operator'),
    status: override.status || 'active',
    last_active_at: override.last_active_at || null
  };
}

function getPrincipal(account) {
  return {
    id: account.id,
    email: account.email,
    display_name: account.fullName,
    status: getMembershipForAccount(account).status,
    auth_methods: ['password']
  };
}

function getCapabilitiesForAccount(account) {
  const membership = getMembershipForAccount(account);
  return roleDefinitions.find((role) => role.role_key === membership.role_key)?.permissions || [];
}

function buildAccountEnvelope(account) {
  return {
    principal: getPrincipal(account),
    membership: getMembershipForAccount(account),
    workspace: accountWorkspace,
    capabilities: getCapabilitiesForAccount(account)
  };
}

function getSafeAccountById(accountId) {
  return listIdentityAccounts().find((account) => account.id === accountId) || null;
}

function requireCapability(request, response, capability) {
  const capabilities = getCapabilitiesForAccount(toSafeAccount(request.primeAccount));
  if (!capabilities.includes(capability)) {
    response.status(403).json({
      error: {
        code: 'iam.forbidden',
        message: 'You do not have permission for this account action.',
        request_id: request.primeRequestId
      }
    });
    return false;
  }
  return true;
}

function appendAccountAudit(request, action, targetType, targetId, before = null, after = null, result = 'success') {
  const event = {
    id: `audit_${Date.now().toString(36)}_${accountAuditEvents.length + 1}`,
    workspace_id: accountWorkspace.id,
    actor_principal_id: request.primeAccount?.id || null,
    session_id: null,
    action,
    target_type: targetType,
    target_id: targetId,
    before,
    after,
    result,
    request_id: request.primeRequestId,
    ip: getClientAddress(request),
    user_agent: request.header('user-agent') || null,
    created_at: nowIso()
  };
  accountAuditEvents.unshift(event);
  return event;
}

function accountError(response, status, code, message, requestId, details = []) {
  response.status(status).json({
    error: { code, message, details, request_id: requestId }
  });
}

function getClientAddress(request) {
  return request.ip || request.socket?.remoteAddress || 'unknown';
}

function isLoopbackAddress(address) {
  const normalized = String(address || '').replace(/^::ffff:/, '');
  return normalized === '127.0.0.1' || normalized === '::1' || normalized === 'localhost';
}

function isPrivateContainerAddress(address) {
  const normalized = String(address || '').replace(/^::ffff:/, '');
  return /^10\./.test(normalized)
    || /^192\.168\./.test(normalized)
    || /^172\.(1[6-9]|2\d|3[01])\./.test(normalized);
}

function rejectRemoteDemoTraffic(request, response, next) {
  const clientAddress = getClientAddress(request);
  if (
    !demoCredentialsEnabled
    || isLoopbackAddress(clientAddress)
    || (dockerDemoTrafficEnabled && isPrivateContainerAddress(clientAddress))
  ) {
    next();
    return;
  }

  response.status(403).json({ message: 'Demo credentials are only available from loopback.' });
}

function getLoginAttemptKey(request, email) {
  return `${getClientAddress(request)}:${String(email || '').trim().toLowerCase()}`;
}

function isLoginRateLimited(request, email) {
  if (!Number.isFinite(loginWindowMs) || !Number.isFinite(loginMaxAttempts) || loginMaxAttempts <= 0) {
    return false;
  }

  const now = Date.now();
  const key = getLoginAttemptKey(request, email);
  const current = loginAttempts.get(key);

  if (!current || now > current.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: now + loginWindowMs });
    return false;
  }

  current.count += 1;
  return current.count > loginMaxAttempts;
}

function clearLoginAttempts(request, email) {
  loginAttempts.delete(getLoginAttemptKey(request, email));
}

function getBearerToken(request) {
  const authorization = String(request.header('authorization') || '');
  const [scheme, token] = authorization.split(' ');

  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token;
}

function requireAuthenticatedSession(request, response, next) {
  const token = getBearerToken(request);
  const account = token ? verifySessionToken(token) : null;

  if (!account) {
    response.status(401).json({ message: 'Login required. Please sign in again.' });
    return;
  }

  if (getMembershipForAccount(toSafeAccount(account)).status !== 'active') {
    response.status(403).json({ message: 'Account is not active.' });
    return;
  }

  request.primeAccount = account;
  next();
}

function buildSession(account) {
  const role = account?.role === 'admin' ? 'admin' : 'user';
  const model = accessModel[role];
  const hiddenResources = resourceKeys.filter((resource) => !model.visibleResources.includes(resource));
  const resourcePermissions = Object.fromEntries(resourceKeys.map((resource) => ([
    resource,
    {
      read: model.visibleResources.includes(resource),
      write: model.writableResources.includes(resource)
    }
  ])));

  return {
    role,
    roleLabel: model.roleLabel,
    description: model.description,
    canReset: model.canReset,
    canWrite: model.writableResources.length > 0,
    visibleResources: model.visibleResources,
    writableResources: model.writableResources,
    hiddenResources,
    resourcePermissions,
    account: toSafeAccount(account)
  };
}

function checkResourcePermission(request, response, action) {
  const session = buildSession(request.primeAccount);
  const { resource } = request.params;

  if (!isSupportedResource(resource)) {
    response.status(404).json({ message: `Unknown resource: ${resource}` });
    return null;
  }

  const permission = session.resourcePermissions[resource];
  if (!permission?.read) {
    response.status(403).json({ message: `${session.roleLabel} cannot access ${resource}.` });
    return null;
  }

  if (action === 'write' && !permission.write) {
    response.status(403).json({ message: `${session.roleLabel} is read-only for ${resource}.` });
    return null;
  }

  return session;
}

app.get('/health', async (_request, response) => {
  response.json({
    ok: true,
    service: 'prime-os-backend',
    timestamp: new Date().toISOString(),
    workerQueue: getWorkerQueueStats(),
  });
});

app.get('/api/public/growth-os', async (_request, response) => {
  response.json(getGrowthOsSnapshot());
});

app.get('/webhooks/connectors/:connectorId', async (request, response, next) => {
  try {
    const result = verifyConnectorWebhook(request.params.connectorId, request.query ?? {});
    response.type('text/plain').send(result.challenge);
  } catch (error) {
    next(error);
  }
});

app.post('/webhooks/connectors/:connectorId', async (request, response, next) => {
  try {
    const event = ingestConnectorWebhook(request.params.connectorId, request.body ?? {}, request.headers ?? {}, request.rawBody || '');
    response.status(202).json({ ok: true, event });
  } catch (error) {
    next(error);
  }
});

app.get('/oauth/connectors/:connectorId/callback', async (request, response, next) => {
  try {
    const result = await completeConnectorOAuthSetup(request.params.connectorId, request.query ?? {});
    response.json(result);
  } catch (error) {
    next(error);
  }
});

app.use(rejectRemoteDemoTraffic);

app.post('/api/auth/login', async (request, response) => {
  const { email, password } = request.body ?? {};

  if (isLoginRateLimited(request, email)) {
    response.status(429).json({ message: 'Too many login attempts. Please try again later.' });
    return;
  }

  const account = authenticatePassword(email, password);

  if (!account) {
    response.status(401).json({ message: 'Invalid email or password.' });
    return;
  }

  if (getMembershipForAccount(toSafeAccount(account)).status !== 'active') {
    response.status(403).json({ message: 'Account is not active.' });
    return;
  }

  clearLoginAttempts(request, email);
  const token = createSessionToken(account);
  response.json({
    ...token,
    session: buildSession(account)
  });
});

app.post('/api/auth/logout', async (request, response) => {
  const token = getBearerToken(request);
  if (token) {
    revokeSessionToken(token);
  }

  response.json({ ok: true });
});

app.use('/api', (request, response, next) => {
  const isChannelAuthorizationRedirect = request.method === 'GET' && /^\/v1\/channels\/[^/]+\/authorize$/.test(request.path);
  if (isChannelAuthorizationRedirect) return next();
  return requireAuthenticatedSession(request, response, next);
});

app.get('/api/session', async (request, response) => {
  response.json(buildSession(request.primeAccount));
});

app.post('/api/v1/system/feedback', (request, response, next) => {
  try {
    createFeedback(request.body || {}, toSafeAccount(request.primeAccount));
    response.status(201).json({ success: true, message: 'Feedback submitted successfully' });
  } catch (error) {
    next(error);
  }
});

app.get('/api/v1/onboarding/status', async (request, response, next) => {
  try {
    response.json(await getOnboardingStatus(toSafeAccount(request.primeAccount)));
  } catch (error) {
    next(error);
  }
});

app.patch('/api/v1/onboarding/preferences', (request, response, next) => {
  try {
    updateOnboardingPreferences(toSafeAccount(request.primeAccount), request.body || {});
    response.json({ success: true, preferences: request.body });
  } catch (error) {
    next(error);
  }
});

app.get('/api/meta', async (request, response, next) => {
  try {
    const session = buildSession(request.primeAccount);
    const meta = await getAdminMeta();
    const visibleCounts = Object.fromEntries(
      session.visibleResources.map((resource) => [resource, meta.resourceCounts[resource] ?? 0])
    );

    response.json({
      resourceCounts: visibleCounts,
      totalVisibleRecords: session.visibleResources.reduce(
        (sum, resource) => sum + (meta.resourceCounts[resource] ?? 0),
        0
      ),
      adminCount: session.resourcePermissions.admins.read ? meta.adminCount : 0,
      userCount: session.resourcePermissions.users.read ? meta.userCount : 0,
      writableResourceCount: session.writableResources.length,
      updatedAt: meta.updatedAt
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/reset', async (request, response, next) => {
  try {
    const session = buildSession(request.primeAccount);
    if (!session.canReset) {
      response.status(403).json({ message: `${session.roleLabel} cannot reset backend seed data.` });
      return;
    }

    const database = await resetDatabase();
    response.json({
      ok: true,
      counts: Object.fromEntries(resourceKeys.map((resource) => [resource, database[resource].length]))
    });
  } catch (error) {
    next(error);
  }
});


app.get('/api/v1/me', async (request, response) => {
  const account = toSafeAccount(request.primeAccount);
  membershipOverrides.set(account.id, { ...(membershipOverrides.get(account.id) || {}), last_active_at: nowIso() });
  response.json({ data: buildAccountEnvelope(account), meta: { request_id: request.primeRequestId } });
});

app.patch('/api/v1/me', async (request, response) => {
  if (!requireCapability(request, response, 'account.profile.update_self')) return;
  const fullName = String(request.body?.display_name || request.body?.fullName || '').trim();
  if (fullName.length < 2) {
    accountError(response, 400, 'account.invalid_display_name', 'Display name must be at least 2 characters.', request.primeRequestId, [{ field: 'display_name', reason: 'too_short' }]);
    return;
  }

  const before = buildAccountEnvelope(toSafeAccount(request.primeAccount));
  const updated = updateIdentityAccount(request.primeAccount.id, { fullName });
  if (!updated) {
    accountError(response, 404, 'account.not_found', 'Account not found.', request.primeRequestId);
    return;
  }
  request.primeAccount.fullName = updated.fullName;
  const after = buildAccountEnvelope(updated);
  appendAccountAudit(request, 'account.profile.updated', 'principal', updated.id, before.principal, after.principal);
  response.json({ data: after, meta: { request_id: request.primeRequestId } });
});

app.get('/api/v1/workspace', async (request, response) => {
  if (!requireCapability(request, response, 'workspace.read')) return;
  response.json({ data: accountWorkspace, meta: { request_id: request.primeRequestId } });
});

app.get('/api/v1/role-definitions', async (request, response) => {
  if (!requireCapability(request, response, 'iam.roles.read')) return;
  response.json({ data: roleDefinitions, meta: { request_id: request.primeRequestId } });
});

app.patch('/api/v1/role-definitions/:roleKey', async (request, response) => {
  if (!requireCapability(request, response, 'iam.roles.update')) return;
  const role = roleDefinitions.find((item) => item.role_key === request.params.roleKey);
  if (!role) return accountError(response, 404, 'iam.role_not_found', 'Role definition not found.', request.primeRequestId);
  if (role.role_key === 'admin') return accountError(response, 409, 'iam.admin_role_locked', 'The Admin role is protected and cannot be modified.', request.primeRequestId);
  const permissions = Array.isArray(request.body?.permissions) ? [...new Set(request.body.permissions.map(String))] : null;
  if (!permissions?.length) return accountError(response, 400, 'iam.invalid_permissions', 'Select at least one permission.', request.primeRequestId);
  const before = { ...role, permissions: [...role.permissions] };
  role.permissions = permissions;
  appendAccountAudit(request, 'iam.role.permissions.updated', 'role_definition', role.role_key, before, role);
  response.json({ data: role, meta: { request_id: request.primeRequestId } });
});

app.get('/api/v1/workspace-members', async (request, response) => {
  if (!requireCapability(request, response, 'iam.members.read')) return;
  const accounts = listIdentityAccounts();
  const activeMembers = accounts.map((account) => ({
    principal: getPrincipal(account),
    membership: getMembershipForAccount(account)
  }));
  const invitedMembers = memberInvitations
    .filter((invite) => invite.status === 'pending')
    .map((invite) => ({
      principal: {
        id: `principal_${invite.id}`,
        email: invite.email,
        display_name: invite.email,
        status: 'invited',
        auth_methods: []
      },
      membership: {
        id: `wm_${invite.id}`,
        workspace_id: accountWorkspace.id,
        principal_id: `principal_${invite.id}`,
        role_key: invite.role_key,
        seat_type: invite.seat_type,
        status: 'invited',
        last_active_at: null
      },
      invitation: invite
    }));
  response.json({ data: [...activeMembers, ...invitedMembers], meta: { request_id: request.primeRequestId } });
});

app.post('/api/v1/workspace-member-invitations', async (request, response) => {
  if (!requireCapability(request, response, 'iam.members.invite')) return;
  const email = String(request.body?.email || '').trim().toLowerCase();
  const roleKey = String(request.body?.role_key || 'crm_sales');
  const allowedRoleKeys = new Set(roleDefinitions.map((role) => role.role_key));

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    accountError(response, 400, 'iam.invalid_email', 'A valid email is required.', request.primeRequestId, [{ field: 'email', reason: 'invalid' }]);
    return;
  }
  if (!allowedRoleKeys.has(roleKey)) {
    accountError(response, 400, 'iam.invalid_role', 'Role is not supported for invitations.', request.primeRequestId, [{ field: 'role_key', reason: 'unsupported' }]);
    return;
  }
  const exists = listIdentityAccounts().some((account) => account.email === email) || memberInvitations.some((invite) => invite.email === email && invite.status === 'pending');
  if (exists) {
    accountError(response, 409, 'iam.member_exists', 'Member already exists in workspace.', request.primeRequestId, [{ field: 'email', reason: 'duplicate' }]);
    return;
  }

  const invitation = {
    id: `inv_${Date.now().toString(36)}_${memberInvitations.length + 1}`,
    workspace_id: accountWorkspace.id,
    email,
    role_key: roleKey,
    seat_type: roleKey === 'admin' ? 'full_admin' : 'seller_operator',
    status: 'pending',
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
    created_at: nowIso()
  };
  memberInvitations.unshift(invitation);
  appendAccountAudit(request, 'iam.member.invited', 'invitation', invitation.id, null, invitation);
  response.status(201).json({ data: invitation, meta: { request_id: request.primeRequestId } });
});

app.post('/api/v1/workspace-member-invitations/:invitationId/resend', async (request, response) => {
  if (!requireCapability(request, response, 'iam.members.invite')) return;
  const invitation = memberInvitations.find((item) => item.id === request.params.invitationId && item.status === 'pending');
  if (!invitation) return accountError(response, 404, 'iam.invitation_not_found', 'Pending invitation not found.', request.primeRequestId);
  const before = { ...invitation };
  invitation.expires_at = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();
  invitation.last_sent_at = nowIso();
  appendAccountAudit(request, 'iam.invitation.resent', 'invitation', invitation.id, before, invitation);
  response.json({ data: invitation, meta: { request_id: request.primeRequestId } });
});

app.delete('/api/v1/workspace-member-invitations/:invitationId', async (request, response) => {
  if (!requireCapability(request, response, 'iam.members.invite')) return;
  const invitation = memberInvitations.find((item) => item.id === request.params.invitationId && item.status === 'pending');
  if (!invitation) return accountError(response, 404, 'iam.invitation_not_found', 'Pending invitation not found.', request.primeRequestId);
  const before = { ...invitation };
  invitation.status = 'cancelled';
  appendAccountAudit(request, 'iam.invitation.cancelled', 'invitation', invitation.id, before, invitation);
  response.json({ data: invitation, meta: { request_id: request.primeRequestId } });
});

app.patch('/api/v1/workspace-members/:membershipId/role', async (request, response) => {
  if (!requireCapability(request, response, 'iam.members.update_role')) return;
  const membershipId = String(request.params.membershipId || '');
  const nextRoleKey = String(request.body?.role_key || '');
  if (!roleDefinitions.some((role) => role.role_key === nextRoleKey)) return accountError(response, 400, 'iam.invalid_role', 'Role is not supported.', request.primeRequestId);
  if (membershipId.startsWith('wm_inv_')) {
    const invitation = memberInvitations.find((item) => `wm_${item.id}` === membershipId && item.status === 'pending');
    if (!invitation) return accountError(response, 404, 'iam.invitation_not_found', 'Pending invitation not found.', request.primeRequestId);
    const before = { ...invitation };
    invitation.role_key = nextRoleKey;
    invitation.seat_type = nextRoleKey === 'admin' ? 'full_admin' : 'seller_operator';
    appendAccountAudit(request, 'iam.invitation.role.updated', 'invitation', invitation.id, before, invitation);
    return response.json({ data: invitation, meta: { request_id: request.primeRequestId } });
  }
  const accountId = membershipId.replace(/^wm_/, '');
  const target = getSafeAccountById(accountId);
  if (!target) return accountError(response, 404, 'iam.member_not_found', 'Workspace member not found.', request.primeRequestId);
  const before = getMembershipForAccount(target);
  membershipOverrides.set(target.id, { ...(membershipOverrides.get(target.id) || {}), role_key: nextRoleKey });
  const after = getMembershipForAccount(target);
  appendAccountAudit(request, 'iam.member.role.updated', 'workspace_membership', before.id, before, after);
  response.json({ data: { principal: getPrincipal(target), membership: after }, meta: { request_id: request.primeRequestId } });
});

app.post('/api/v1/workspace-members/:membershipId/deactivate', async (request, response) => {
  if (!requireCapability(request, response, 'iam.members.suspend')) return;
  const accountId = String(request.params.membershipId || '').replace(/^wm_/, '');
  const target = getSafeAccountById(accountId);
  if (!target) {
    accountError(response, 404, 'iam.member_not_found', 'Workspace member not found.', request.primeRequestId);
    return;
  }
  const activeAdmins = listIdentityAccounts().filter((account) => getMembershipForAccount(account).role_key === 'admin' && getMembershipForAccount(account).status === 'active');
  if (target.role === 'admin' && activeAdmins.length <= 1) {
    accountError(response, 409, 'iam.last_admin', 'Cannot deactivate the last active admin.', request.primeRequestId);
    return;
  }
  const before = getMembershipForAccount(target);
  membershipOverrides.set(target.id, { ...(membershipOverrides.get(target.id) || {}), status: 'suspended' });
  const after = getMembershipForAccount(target);
  appendAccountAudit(request, 'iam.member.deactivated', 'workspace_membership', before.id, before, after);
  response.json({ data: { principal: getPrincipal(target), membership: after }, meta: { request_id: request.primeRequestId } });
});

app.post('/api/v1/workspace-members/:membershipId/reactivate', async (request, response) => {
  if (!requireCapability(request, response, 'iam.members.reactivate')) return;
  const accountId = String(request.params.membershipId || '').replace(/^wm_/, '');
  const target = getSafeAccountById(accountId);
  if (!target) {
    accountError(response, 404, 'iam.member_not_found', 'Workspace member not found.', request.primeRequestId);
    return;
  }
  const before = getMembershipForAccount(target);
  membershipOverrides.set(target.id, { ...(membershipOverrides.get(target.id) || {}), status: 'active' });
  const after = getMembershipForAccount(target);
  appendAccountAudit(request, 'iam.member.reactivated', 'workspace_membership', before.id, before, after);
  response.json({ data: { principal: getPrincipal(target), membership: after }, meta: { request_id: request.primeRequestId } });
});

app.get('/api/v1/audit-events', async (request, response) => {
  if (!requireCapability(request, response, 'iam.audit.read')) return;
  response.json({ data: accountAuditEvents.slice(0, 25), meta: { request_id: request.primeRequestId } });
});

app.get('/api/growth-os', async (_request, response) => {
  response.json(getGrowthOsSnapshot());
});

app.post('/api/growth-os/leads', async (request, response, next) => {
  try {
    const lead = createGrowthLead(request.body ?? {});
    response.status(201).json(lead);
  } catch (error) {
    next(error);
  }
});

app.post('/api/growth-os/leads/:leadId/stage', async (request, response, next) => {
  try {
    response.json(updateGrowthLeadStage(request.params.leadId, request.body ?? {}));
  } catch (error) {
    next(error);
  }
});

app.post('/api/growth-os/leads/:leadId/follow-up', async (request, response, next) => {
  try {
    response.json(logGrowthLeadFollowUp(request.params.leadId, request.body ?? {}));
  } catch (error) {
    next(error);
  }
});

app.post('/api/growth-os/connectors/:connectorId/test', async (request, response, next) => {
  try {
    response.json(await testGrowthConnector(request.params.connectorId, request.body ?? {}));
  } catch (error) {
    next(error);
  }
});

app.post('/api/growth-os/connectors/:connectorId/probe', async (request, response, next) => {
  try {
    response.json(await probeGrowthConnector(request.params.connectorId, request.body ?? {}));
  } catch (error) {
    next(error);
  }
});

app.post('/api/growth-os/connectors/:connectorId/oauth/start', async (request, response, next) => {
  try {
    response.json(startConnectorOAuthSetup(request.params.connectorId, request.body ?? {}));
  } catch (error) {
    next(error);
  }
});

app.get('/api/growth-os/connectors/:connectorId/oauth/sessions/:state', async (request, response, next) => {
  try {
    response.json(getConnectorOAuthSetupSession(request.params.connectorId, request.params.state));
  } catch (error) {
    next(error);
  }
});

app.post('/api/growth-os/connectors/:connectorId/oauth/sessions/:state/refresh', async (request, response, next) => {
  try {
    response.json(await refreshConnectorOAuthToken(request.params.connectorId, request.params.state));
  } catch (error) {
    next(error);
  }
});

app.post('/api/growth-os/connectors/:connectorId/oauth/sessions/:state/revoke', async (request, response, next) => {
  try {
    response.json(await revokeConnectorOAuthToken(request.params.connectorId, request.params.state));
  } catch (error) {
    next(error);
  }
});

app.post('/api/growth-os/connectors/:connectorId/connect', async (request, response, next) => {
  try {
    const connector = await connectGrowthConnector(request.params.connectorId, request.body ?? {});
    if (connector.provider === 'telegram' && connector.status === 'connected') {
      try {
        const rawConnector = findRawConnector(request.params.connectorId);
        if (rawConnector) {
          await startTelegramPolling(rawConnector);
        }
      } catch (err) {
        console.error(`[telegram-gateway] Failed to start polling: ${err.message}`);
      }
    }
    response.json(connector);
  } catch (error) {
    next(error);
  }
});

app.post('/api/growth-os/connectors/:connectorId/disconnect', async (request, response, next) => {
  try {
    const connectorId = request.params.connectorId;
    const connector = disconnectGrowthConnector(connectorId);
    stopTelegramPolling(connectorId);
    response.json(connector);
  } catch (error) {
    next(error);
  }
});

app.get('/api/growth-os/connectors/:connectorId/messages', async (request, response) => {
  response.json(getTelegramMessages(request.params.connectorId));
});

app.get('/api/growth-os/connectors/:connectorId/events', async (request, response, next) => {
  try {
    response.json({ events: getConnectorWebhookEvents(request.params.connectorId) });
  } catch (error) {
    next(error);
  }
});

app.post('/api/growth-os/connectors/:connectorId/sample-webhook', async (request, response, next) => {
  try {
    response.status(201).json(createConnectorSampleWebhook(request.params.connectorId, request.body ?? {}));
  } catch (error) {
    next(error);
  }
});

app.get('/api/growth-os/connectors/:connectorId/domain-events', async (request, response, next) => {
  try {
    const filters = {
      domain: request.query?.domain,
      status: request.query?.status,
    };
    response.json({
      events: getConnectorDomainEvents(request.params.connectorId, filters),
      summary: getConnectorDomainEventSummary(request.params.connectorId),
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/growth-os/connectors/:connectorId/domain-records', async (request, response, next) => {
  try {
    const domain = request.query?.domain || 'all';
    response.json({
      records: getConnectorDomainRecords(request.params.connectorId, domain),
      summary: getConnectorDomainRecordSummary(request.params.connectorId),
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/growth-os/connectors/:connectorId/domain-events/:eventId/retry', async (request, response, next) => {
  try {
    response.json({ event: retryConnectorDomainEvent(request.params.connectorId, request.params.eventId) });
  } catch (error) {
    next(error);
  }
});

app.post('/api/growth-os/connectors/:connectorId/domain-events/:eventId/dead-letter', async (request, response, next) => {
  try {
    response.json({ event: deadLetterConnectorDomainEvent(request.params.connectorId, request.params.eventId, request.body ?? {}) });
  } catch (error) {
    next(error);
  }
});

app.post('/api/growth-os/connectors/:connectorId/domain-events/:eventId/requeue', async (request, response, next) => {
  try {
    response.json({ event: requeueConnectorDomainEvent(request.params.connectorId, request.params.eventId, request.body ?? {}) });
  } catch (error) {
    next(error);
  }
});

app.post('/api/growth-os/connectors/:connectorId/send', async (request, response, next) => {
  try {
    const connector = findRawConnector(request.params.connectorId);
    if (!connector) {
      response.status(404).json({ message: 'Connector not found' });
      return;
    }
    if (connector.provider !== 'telegram') {
      response.status(400).json({ message: 'Send is only supported for Telegram connectors' });
      return;
    }
    const { chatId, text } = request.body ?? {};
    if (!chatId || !text) {
      response.status(400).json({ message: 'chatId and text are required' });
      return;
    }
    const token = getConnectorAccessToken(connector);
    if (!token) {
      response.status(400).json({ message: 'No valid access token found' });
      return;
    }
    const result = await sendTelegramMessage(token, chatId, text);
    addOutboundMessage(connector.id, { chatId, text });
    response.json({ ok: true, messageId: result.message_id, chatId, text });
  } catch (error) {
    if (error.message) {
      response.status(400).json({ message: error.message });
      return;
    }
    next(error);
  }
});

app.get('/api/crm/conversations', async (_request, response) => {
  response.json(getConversations());
});

app.get('/api/crm/conversations/:conversationId', async (request, response) => {
  const connectorId = request.query.connectorId;
  const conv = getConversation(request.params.conversationId, connectorId);
  if (!conv) {
    response.status(404).json({ message: 'Conversation not found' });
    return;
  }
  response.json(conv);
});

app.post('/api/crm/conversations/:conversationId/send', async (request, response, next) => {
  try {
    const { connectorId, text } = request.body ?? {};
    if (!connectorId) {
      response.status(400).json({ message: 'connectorId is required' });
      return;
    }
    const result = await sendConversationMessage(request.params.conversationId, connectorId, text);
    response.json(result);
  } catch (error) {
    if (error.statusCode) {
      response.status(error.statusCode).json({ message: error.message });
      return;
    }
    if (error.message) {
      response.status(400).json({ message: error.message });
      return;
    }
    next(error);
  }
});

app.get('/api/crm/queue', async (_request, response) => {
  const { getCrmQueue, getCrmQueueStats } = await import('./crm-chat.js');
  response.json({ items: getCrmQueue(), stats: getCrmQueueStats() });
});

app.post('/api/crm/queue', async (request, response) => {
  const { createCrmQueueItem } = await import('./crm-chat.js');
  const { platform, customerName, customerId, messageText, conversationId } = request.body ?? {};
  if (!platform || !customerName || !messageText) {
    response.status(400).json({ message: 'platform, customerName, and messageText are required' });
    return;
  }
  const item = createCrmQueueItem({ platform, customerName, customerId, messageText, conversationId });
  response.status(201).json(item);
});

app.post('/api/crm/queue/:crmId/assign', async (request, response) => {
  const { assignCrmItem } = await import('./crm-chat.js');
  const { operatorId } = request.body ?? {};
  if (!operatorId) {
    response.status(400).json({ message: 'operatorId is required' });
    return;
  }
  const item = assignCrmItem(request.params.crmId, operatorId);
  if (!item) {
    response.status(404).json({ message: 'CRM item not found' });
    return;
  }
  response.json(item);
});

app.get('/api/crm/bookings', async (_request, response) => {
  const { getBookings } = await import('./crm-chat.js');
  response.json(getBookings());
});

app.post('/api/crm/bookings', async (request, response) => {
  const { createBooking } = await import('./crm-chat.js');
  const { customerId, customerName, packageId, staffId, startTime } = request.body ?? {};
  if (!customerName || !packageId || !staffId || !startTime) {
    response.status(400).json({ message: 'customerName, packageId, staffId, and startTime are required' });
    return;
  }
  const booking = createBooking({ customerId, customerName, packageId, staffId, startTime });
  response.status(201).json(booking);
});

app.post('/api/growth-os/ai-actions/:actionId/approve', async (request, response) => {
  const action = approveGrowthAiAction(request.params.actionId);
  if (!action) {
    response.status(404).json({ message: `AI action not found: ${request.params.actionId}` });
    return;
  }

  response.json(action);
});

app.get('/api/growth-os/connectors/health', async (_request, response) => {
  response.json({
    connectors: getAllConnectorHealth(),
    stats: getCredentialHealthStats(),
  });
});

app.get('/api/admin/worker-queue', async (request, response) => {
  const session = buildSession(request.primeAccount);
  if (!session.canReset) {
    response.status(403).json({ message: 'Admin access required.' });
    return;
  }
  response.json({
    stats: getWorkerQueueStats(),
    deadLetters: getDeadLetters(),
  });
});

function requireScheduledTaskWrite(request, response) {
  const session = buildSession(request.primeAccount);
  if (!session.canWrite) {
    response.status(403).json({ message: `${session.roleLabel} cannot modify scheduled tasks.` });
    return false;
  }
  return true;
}

app.get('/api/v1/scheduled-tasks/templates', (_request, response) => {
  response.json({ data: scheduledTaskTemplates });
});

app.get('/api/v1/scheduled-tasks', (request, response) => {
  response.json(listScheduledTasks({
    status: request.query.status,
    search: request.query.search,
    page: request.query.page,
    page_size: request.query.page_size,
  }));
});

app.post('/api/v1/scheduled-tasks/bulk-delete', (request, response) => {
  if (!requireScheduledTaskWrite(request, response)) return;
  const deleted = bulkDeleteScheduledTasks(request.body?.ids);
  response.json({ ok: true, deleted });
});

app.post('/api/v1/scheduled-tasks/bulk-toggle-status', (request, response) => {
  if (!requireScheduledTaskWrite(request, response)) return;
  const updated = bulkToggleScheduledTasks(request.body?.ids, request.body?.status);
  response.json({ ok: true, updated });
});

app.post('/api/v1/scheduled-tasks', (request, response, next) => {
  if (!requireScheduledTaskWrite(request, response)) return;
  try {
    response.status(201).json({ data: createScheduledTask(request.body ?? {}) });
  } catch (error) {
    next(error);
  }
});

app.get('/api/v1/scheduled-tasks/:id/logs', (request, response) => {
  const task = getScheduledTask(request.params.id);
  if (!task) {
    response.status(404).json({ message: 'Scheduled task not found.' });
    return;
  }
  response.json(listTaskExecutionLogs(request.params.id, request.query));
});

app.post('/api/v1/scheduled-tasks/:id/toggle-status', (request, response, next) => {
  if (!requireScheduledTaskWrite(request, response)) return;
  try {
    const task = toggleScheduledTask(request.params.id, request.body?.status);
    if (!task) return response.status(404).json({ message: 'Scheduled task not found.' });
    response.json({ data: task });
  } catch (error) {
    next(error);
  }
});

app.post('/api/v1/scheduled-tasks/:id/run-now', (request, response) => {
  if (!requireScheduledTaskWrite(request, response)) return;
  const queued = runScheduledTaskNow(request.params.id);
  if (!queued) return response.status(404).json({ message: 'Scheduled task not found.' });
  response.status(202).json({ data: queued });
});

app.get('/api/v1/scheduled-tasks/:id', (request, response) => {
  const task = getScheduledTask(request.params.id);
  if (!task) return response.status(404).json({ message: 'Scheduled task not found.' });
  response.json({ data: task });
});

app.put('/api/v1/scheduled-tasks/:id', (request, response, next) => {
  if (!requireScheduledTaskWrite(request, response)) return;
  try {
    const task = updateScheduledTask(request.params.id, request.body ?? {});
    if (!task) return response.status(404).json({ message: 'Scheduled task not found.' });
    response.json({ data: task });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/v1/scheduled-tasks/:id', (request, response) => {
  if (!requireScheduledTaskWrite(request, response)) return;
  const task = deleteScheduledTask(request.params.id);
  if (!task) return response.status(404).json({ message: 'Scheduled task not found.' });
  response.json({ ok: true, removed: task });
});

function requireLiveCommerceWrite(request, response) {
  const session = buildSession(request.primeAccount);
  if (!session.canWrite) {
    response.status(403).json({ message: `${session.roleLabel} cannot modify live commerce sessions.` });
    return false;
  }
  return true;
}

app.get('/api/v1/live-sessions/summary', (_request, response) => {
  response.json({ data: getLiveSessionSummary() });
});

app.get('/api/v1/live-sessions/options', (request, response) => {
  response.json({ data: getLiveCommerceOptions(request.query.warehouse_id) });
});

app.get('/api/v1/live-sessions', (request, response) => {
  response.json(listLiveSessions(request.query));
});

app.post('/api/v1/live-sessions', (request, response, next) => {
  if (!requireLiveCommerceWrite(request, response)) return;
  try { response.status(201).json({ data: createLiveSession(request.body ?? {}) }); } catch (error) { next(error); }
});

app.get('/api/v1/live-sessions/:id/events', (request, response) => {
  const events = getLiveSessionEvents(request.params.id);
  if (!events) return response.status(404).json({ message: 'Live session not found.' });
  response.json({ data: events });
});

app.get('/api/v1/live-sessions/:id', (request, response) => {
  const session = getLiveSession(request.params.id);
  if (!session) return response.status(404).json({ message: 'Live session not found.' });
  response.json({ data: session });
});

app.put('/api/v1/live-sessions/:id', (request, response, next) => {
  if (!requireLiveCommerceWrite(request, response)) return;
  try {
    const session = updateLiveSession(request.params.id, request.body ?? {});
    if (!session) return response.status(404).json({ message: 'Live session not found.' });
    response.json({ data: session });
  } catch (error) { next(error); }
});

app.post('/api/v1/live-sessions/:id/top-up-stock', (request, response, next) => {
  if (!requireLiveCommerceWrite(request, response)) return;
  try {
    const session = topUpLiveSession(request.params.id, request.body ?? {});
    if (!session) return response.status(404).json({ message: 'Live session not found.' });
    response.json({ data: session });
  } catch (error) { next(error); }
});

app.post('/api/v1/live-sessions/:id/end-session', (request, response, next) => {
  if (!requireLiveCommerceWrite(request, response)) return;
  try {
    const session = endLiveSession(request.params.id);
    if (!session) return response.status(404).json({ message: 'Live session not found.' });
    response.json({ data: session });
  } catch (error) { next(error); }
});

function requireConversationWrite(request,response){const session=buildSession(request.primeAccount);if(!session.canWrite){response.status(403).json({message:`${session.roleLabel} cannot modify conversation channels.`});return false;}return true;}
app.get('/api/v1/conversation-channels',(_request,response)=>response.json({data:listConversationChannels()}));
app.get('/api/v1/conversation-channels/quick-linkable-stores',(_request,response)=>response.json({data:listQuickLinkableStores()}));
app.post('/api/v1/conversation-channels/connect',(request,response,next)=>{if(!requireConversationWrite(request,response))return;try{response.status(201).json({data:connectConversationChannel(request.body||{})});}catch(error){next(error);}});
app.put('/api/v1/conversation-channels/:id',(request,response,next)=>{if(!requireConversationWrite(request,response))return;try{const data=updateConversationChannel(request.params.id,request.body||{});return data?response.json({data}):response.status(404).json({message:'Conversation channel not found.'});}catch(error){next(error);}});
app.post('/api/v1/conversation-channels/:id/test-ping',(request,response)=>{if(!requireConversationWrite(request,response))return;const data=testConversationPing(request.params.id);return data?response.json({data}):response.status(404).json({message:'Conversation channel not found.'});});
app.post('/api/v1/conversation-channels/:id/test-webhook',(request,response)=>{if(!requireConversationWrite(request,response))return;const data=testConversationPing(request.params.id);return data?response.json({data}):response.status(404).json({message:'Conversation channel not found.'});});
app.post('/api/v1/conversation-channels/:id/reauthorize',(request,response)=>{if(!requireConversationWrite(request,response))return;const data=reauthorizeConversationChannel(request.params.id);return data?response.json({data}):response.status(404).json({message:'Conversation channel not found.'});});
app.post('/api/v1/conversation-channels/:id/toggle-pause',(request,response)=>{if(!requireConversationWrite(request,response))return;const data=toggleConversationPause(request.params.id);return data?response.json({data}):response.status(404).json({message:'Conversation channel not found.'});});
app.delete('/api/v1/conversation-channels/:id',(request,response)=>{if(!requireConversationWrite(request,response))return;const removed=deleteConversationChannel(request.params.id);return removed?response.json({ok:true,removed}):response.status(404).json({message:'Conversation channel not found.'});});

function requireFinanceOpsWrite(request, response) {
  const session = buildSession(request.primeAccount);
  if (!session.canWrite) {
    response.status(403).json({ message: `${session.roleLabel} cannot modify Finance Ops.` });
    return false;
  }
  return true;
}

app.get('/api/v1/finance/ops/summary', (_request, response) => {
  response.json({ data: getFinanceOpsSummary() });
});

app.get('/api/v1/finance/ops/overview', (_request, response) => {
  response.json({ data: getFinanceOpsOverview() });
});

app.get('/api/v1/finance/ops/receivables', (request, response) => {
  response.json(listReceivables(request.query));
});

app.get('/api/v1/finance/ops/receivables/:id', (request, response) => {
  const item = getReceivable(request.params.id);
  if (!item) return response.status(404).json({ message: 'Receivable item not found.' });
  response.json({ data: item });
});

app.post('/api/v1/finance/ops/receivables/:id/send-reminder', (request, response) => {
  if (!requireFinanceOpsWrite(request, response)) return;
  const item = sendPaymentReminder(request.params.id, request.body?.channel);
  if (!item) return response.status(404).json({ message: 'Receivable item not found.' });
  response.json({ data: item });
});

app.post('/api/v1/finance/ops/receivables/:id/assign-owner', (request, response, next) => {
  if (!requireFinanceOpsWrite(request, response)) return;
  try {
    const item = assignReceivableOwner(request.params.id, request.body?.owner_id);
    if (!item) return response.status(404).json({ message: 'Receivable item not found.' });
    response.json({ data: item });
  } catch (error) {
    next(error);
  }
});

app.post('/api/v1/finance/ops/receivables/:id/confirm-payment', (request, response) => {
  if (!requireFinanceOpsWrite(request, response)) return;
  const result = confirmReceivablePayment(request.params.id, request.body?.payment_proof || null, request.body?.collection_note);
  if (!result) return response.status(404).json({ message: 'Receivable item not found.' });
  response.json({ data: result.receivable, sync_event: result.sync_event });
});

app.post('/api/v1/finance/ops/receivables/:id/flag-dispute', (request, response) => {
  if (!requireFinanceOpsWrite(request, response)) return;
  const item = flagReceivableDispute(request.params.id, request.body?.reason);
  if (!item) return response.status(404).json({ message: 'Receivable item not found.' });
  response.json({ data: item });
});

app.get('/api/v1/finance/ops/forecast', (_request, response) => {
  response.json({ data: getFinanceForecast() });
});

app.put('/api/v1/finance/ops/target', (request, response, next) => {
  if (!requireFinanceOpsWrite(request, response)) return;
  try {
    response.json({ data: updateFinanceTarget({ ...request.body, created_by: request.primeAccount?.id }) });
  } catch (error) {
    next(error);
  }
});

app.get('/api/v1/finance/ops/risks', (request, response) => {
  response.json(listFinanceRisks(request.query));
});

app.post('/api/v1/finance/ops/risks/:id/resolve', (request, response, next) => {
  if (!requireFinanceOpsWrite(request, response)) return;
  try {
    const item = resolveFinanceRisk(request.params.id, request.body?.status || 'RESOLVED', request.body?.resolution_notes);
    if (!item) return response.status(404).json({ message: 'Finance risk not found.' });
    response.json({ data: item });
  } catch (error) {
    next(error);
  }
});

app.get('/api/v1/channels', (_request, response) => {
  response.json({ data: listConnectedChannels() });
});

app.get('/api/v1/channels/connected-stores', (_request, response) => {
  response.json({ data: listConnectedChannels() });
});

app.get('/api/v1/channels/available-platforms', (_request, response) => {
  response.json({ data: listAvailablePlatforms() });
});

app.get('/api/v1/warehouses', (_request, response) => {
  response.json({ data: listChannelWarehouses() });
});

app.get('/api/v1/channels/:id/sync-status', (request, response) => {
  const status = getChannelSyncStatus(request.params.id);
  if (!status) return response.status(404).json({ message: 'Connected channel not found.' });
  response.json(status);
});

app.get('/api/v1/channels/:platform/authorize', (request, response) => {
  const platform = getChannelPlatform(request.params.platform);
  if (!platform) return response.status(404).json({ message: 'Channel platform not found.' });
  const region = String(request.query.region || 'VN');
  if (!platform.regions.includes(region)) return response.status(400).json({ message: 'Region is not supported for this platform.' });
  const requestedOrigin = String(request.query.return_origin || 'http://127.0.0.1:5188');
  const returnOrigin = allowedOrigins.has(requestedOrigin) ? requestedOrigin : 'http://127.0.0.1:5188';
  const callback = new URL('/channels/callback', returnOrigin);
  callback.searchParams.set('platform', platform.id);
  callback.searchParams.set('auth_code', `oauth_code_${platform.id}_${Date.now()}`);
  response.redirect(302, callback.toString());
});

app.post('/api/v1/channels/connect', (request, response, next) => {
  const session = buildSession(request.primeAccount);
  if (!session.canWrite) return response.status(403).json({ message: `${session.roleLabel} cannot connect stores.` });
  try {
    response.status(201).json({ data: connectChannel(request.body || {}) });
  } catch (error) {
    if (error.statusCode) return response.status(error.statusCode).json({ message: error.message });
    next(error);
  }
});

app.post('/api/admin/worker-queue/dead-letters/requeue', async (request, response) => {
  const session = buildSession(request.primeAccount);
  if (!session.canReset) {
    response.status(403).json({ message: 'Admin access required.' });
    return;
  }
  const { jobId } = request.body || {};
  if (jobId) {
    const job = requeueDeadLetter(jobId);
    response.json({ ok: !!job, job });
  } else {
    const count = drainDeadLetters();
    response.json({ ok: true, requeued: count });
  }
});

const orderStore = createOrderStore();
app.get('/api/v1/orders', (request, response, next) => {
  const session = buildSession(request.primeAccount);
  if (!session.visibleResources.includes('omsOrders')) return response.status(403).json({ message: 'Order access required.' });
  try { response.json({ data: orderStore.list(), canWrite: session.writableResources.includes('omsOrders'), currentUserName: request.primeAccount.fullName }); }
  catch (error) { next(error); }
});
app.post('/api/v1/orders', (request, response, next) => {
  if (!buildSession(request.primeAccount).writableResources.includes('omsOrders')) return response.status(403).json({ message: 'Order write access required.' });
  try { response.status(201).json({ data: orderStore.create(request.body || {}, request.primeAccount.id) }); }
  catch (error) { if (error.statusCode) return response.status(error.statusCode).json({ message: error.message }); next(error); }
});
app.post('/api/v1/orders/:id/actions', (request, response, next) => {
  if (!buildSession(request.primeAccount).writableResources.includes('omsOrders')) return response.status(403).json({ message: 'Order write access required.' });
  try { response.json({ data: orderStore.command(request.params.id, request.body || {}, request.primeAccount.id) }); }
  catch (error) { if (error.statusCode) return response.status(error.statusCode).json({ message: error.message }); next(error); }
});

app.get('/api/:resource', async (request, response, next) => {
  try {
    const session = checkResourcePermission(request, response, 'read');
    if (!session) return;

    response.json(await listResource(request.params.resource));
  } catch (error) {
    next(error);
  }
});

app.get('/api/:resource/:id', async (request, response, next) => {
  try {
    const session = checkResourcePermission(request, response, 'read');
    if (!session) return;
    const { resource, id } = request.params;

    const item = await getResourceItem(resource, id);
    if (!item) {
      response.status(404).json({ message: `Resource not found: ${id}` });
      return;
    }

    response.json(item);
  } catch (error) {
    next(error);
  }
});

app.post('/api/:resource', async (request, response, next) => {
  try {
    const session = checkResourcePermission(request, response, 'write');
    if (!session) return;
    const { resource } = request.params;

    const created = await createResourceItem(resource, request.body ?? {});
    response.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

app.put('/api/:resource/:id', async (request, response, next) => {
  try {
    const session = checkResourcePermission(request, response, 'write');
    if (!session) return;
    const { resource, id } = request.params;

    const updated = await updateResourceItem(resource, id, request.body ?? {});
    if (!updated) {
      response.status(404).json({ message: `Resource not found: ${id}` });
      return;
    }

    response.json(updated);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/:resource/:id', async (request, response, next) => {
  try {
    const session = checkResourcePermission(request, response, 'write');
    if (!session) return;
    const { resource, id } = request.params;

    const removed = await deleteResourceItem(resource, id);
    if (!removed) {
      response.status(404).json({ message: `Resource not found: ${id}` });
      return;
    }

    response.json({ ok: true, removed });
  } catch (error) {
    next(error);
  }
});

app.use((error, _request, response, _next) => {
  if (error.message?.includes('CORS')) {
    response.status(403).json({ message: 'Origin is not allowed.' });
    return;
  }

  const message = error instanceof Error ? error.message : 'Unknown backend error';
  const statusCode = error.statusCode || 500;

  if (statusCode >= 500) {
    console.error('[PrimeOS backend]', error);
  }

  response.status(statusCode).json({
    message: statusCode >= 500 ? 'Backend error.' : message
  });
});

function attachLiveCommerceWebSocket(server) {
  const socketServer = new WebSocketServer({ noServer: true });
  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '/', 'http://primeos.local');
    const match = url.pathname.match(/^\/api\/v1\/live-sessions\/([^/]+)\/stream$/);
    if (!match) return socket.destroy();
    const account = verifySessionToken(url.searchParams.get('token'));
    const session = account ? getLiveSession(decodeURIComponent(match[1])) : null;
    if (!account || !session || session.status !== 'LIVE') return socket.destroy();
    socketServer.handleUpgrade(request, socket, head, (client) => socketServer.emit('connection', client, request, session));
  });
  socketServer.on('connection', (client, _request, session) => {
    client.send(JSON.stringify({ type: 'CONNECTED', session_id: session.id, occurred_at: new Date().toISOString() }));
    const timer = setInterval(() => {
      if (client.readyState !== client.OPEN) return;
      const units = 1 + Math.floor(Math.random() * 3);
      client.send(JSON.stringify({ id: `evt_${randomUUID()}`, type: 'ORDER_CAPTURED', message: `Order #LIVE-${2800 + Math.floor(Math.random() * 900)} captured`, units, amount: units * 159000, occurred_at: new Date().toISOString() }));
    }, 5000);
    client.on('close', () => clearInterval(timer));
  });
}

if (process.env.NODE_ENV !== 'test') {
  const server = createServer(app);
  attachLiveCommerceWebSocket(server);
  server.listen(port, host, () => {
    console.log(`Prime OS backend listening on http://${host}:${port}`);

    startWorkerQueue();
    startCredentialHealthMonitor();
    startScheduledTaskScheduler();

    // Auto-start Telegram polling for any persisted connected connectors
    try {
      const snapshot = getGrowthOsSnapshot();
      for (const connector of snapshot.connectors) {
        if (connector.provider === 'telegram' && connector.status === 'connected') {
          const raw = findRawConnector(connector.id);
          if (raw) {
            startTelegramPolling(raw).catch((err) => {
              console.error(`[telegram-gateway] Auto-start failed for ${connector.id}: ${err.message}`);
            });
          }
        }
      }
    } catch (err) {
      console.error(`[telegram-gateway] Auto-start scan failed: ${err.message}`);
    }
  });
}

export { app };
