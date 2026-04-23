import express from 'express';
import cors from 'cors';
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
const allowedRoles = ['admin', 'user'];
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
    description: 'Read-only access across PrimeOS control surfaces, including mirrored Ecom/COS lanes. Admin authority stays hidden.',
    visibleResources: resourceKeys.filter((resource) => resource !== 'admins'),
    writableResources: [],
    canReset: false
  }
};

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '15mb' }));

function resolveRole(request) {
  const rawRole = String(request.header('x-prime-role') || 'user').toLowerCase();
  return allowedRoles.includes(rawRole) ? rawRole : 'user';
}

function buildSession(role) {
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
    resourcePermissions
  };
}

function checkResourcePermission(request, response, action) {
  const role = resolveRole(request);
  const session = buildSession(role);
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

app.get('/api/session', async (request, response) => {
  const role = resolveRole(request);
  response.json(buildSession(role));
});

app.get('/api/meta', async (request, response, next) => {
  try {
    const role = resolveRole(request);
    const session = buildSession(role);
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
      userCount: meta.userCount,
      writableResourceCount: session.writableResources.length,
      updatedAt: meta.updatedAt
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/reset', async (request, response, next) => {
  try {
    const role = resolveRole(request);
    const session = buildSession(role);
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
  const message = error instanceof Error ? error.message : 'Unknown backend error';
  response.status(500).json({ message });
});

app.listen(port, () => {
  console.log(`Prime OS backend listening on http://localhost:${port}`);
});
