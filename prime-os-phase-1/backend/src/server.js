import express from 'express';
import cors from 'cors';
import {
  authenticatePassword,
  createSessionToken,
  toSafeAccount,
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
  process.env.PRIME_ALLOW_DEMO_CREDENTIALS === 'true'
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

function getClientAddress(request) {
  return request.ip || request.socket?.remoteAddress || 'unknown';
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

  clearLoginAttempts(request, email);
  const token = createSessionToken(account);
  response.json({
    ...token,
    session: buildSession(account)
  });
});

app.post('/api/auth/logout', async (_request, response) => {
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

app.listen(port, () => {
  console.log(`Prime OS backend listening on http://localhost:${port}`);
});
