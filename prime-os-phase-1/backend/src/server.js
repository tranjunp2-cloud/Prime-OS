import express from 'express';
import cors from 'cors';
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

const app = express();
const port = Number(process.env.PORT || 8180);
const demoCredentialsEnabled = process.env.PRIME_ALLOW_DEMO_CREDENTIALS === 'true';
const host = process.env.HOST || (demoCredentialsEnabled ? '127.0.0.1' : '0.0.0.0');
const configuredAllowedOrigins = String(process.env.PRIME_ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const localDevOrigins = [
  'http://127.0.0.1:5173',
  'http://localhost:5173',
  'http://127.0.0.1:5174',
  'http://localhost:5174'
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
    description: 'Full CRUD across PrimeOS intelligence, ecom/COS, demand, finance, customer, and identity surfaces.',
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
  allowedHeaders: ['Authorization', 'Content-Type'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(express.json({ limit: process.env.PRIME_JSON_LIMIT || '1mb' }));

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
    description: 'Quản lý workspace, thành viên và quyền truy cập cơ bản.',
    permissions: ['account.profile.read_self', 'account.profile.update_self', 'workspace.read', 'iam.members.read', 'iam.members.invite', 'iam.members.suspend', 'iam.members.reactivate', 'iam.roles.read', 'iam.audit.read']
  },
  {
    role_key: 'operator',
    label: 'Operator',
    description: 'Vận hành PrimeOS và tự quản lý hồ sơ cá nhân.',
    permissions: ['account.profile.read_self', 'account.profile.update_self', 'workspace.read', 'iam.roles.read']
  },
  {
    role_key: 'viewer',
    label: 'Viewer',
    description: 'Xem thông tin cá nhân/workspace, không có quyền quản trị.',
    permissions: ['account.profile.read_self', 'workspace.read', 'iam.roles.read']
  }
];
const membershipOverrides = new Map();
const memberInvitations = [];
const accountAuditEvents = [];

function nowIso() {
  return new Date().toISOString();
}

function getRoleKey(account) {
  return account?.role === 'admin' ? 'admin' : 'operator';
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

function rejectRemoteDemoTraffic(request, response, next) {
  if (!demoCredentialsEnabled || isLoopbackAddress(getClientAddress(request))) {
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
    timestamp: new Date().toISOString()
  });
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

app.use('/api', requireAuthenticatedSession);

app.get('/api/session', async (request, response) => {
  response.json(buildSession(request.primeAccount));
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
  const roleKey = String(request.body?.role_key || 'operator');
  const allowedRoleKeys = new Set(['admin', 'operator', 'viewer']);

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
    seat_type: roleKey === 'viewer' ? 'viewer' : 'seller_operator',
    status: 'pending',
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
    created_at: nowIso()
  };
  memberInvitations.unshift(invitation);
  appendAccountAudit(request, 'iam.member.invited', 'invitation', invitation.id, null, invitation);
  response.status(201).json({ data: invitation, meta: { request_id: request.primeRequestId } });
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

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, host, () => {
    console.log(`Prime OS backend listening on http://${host}:${port}`);
  });
}

export { app };
