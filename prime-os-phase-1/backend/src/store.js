import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { seedDatabase } from './seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, '../data');
const dbPath = path.join(dataDir, 'admin-db.json');
export const resourceKeys = [
  'intelligenceCreators',
  'intelligenceCustomers',
  'launchDecisions',
  'products',
  'listings',
  'inventoryBrain',
  'warehouses',
  'omsOrders',
  'fulfillmentControl',
  'policies',
  'eventAudit',
  'campaignOps',
  'contentCreatorOps',
  'leadResponseCapture',
  'retargetingOutreach',
  'capitalReadiness',
  'capitalOffers',
  'riskTrust',
  'settlementRepayment',
  'financePortfolio',
  'crmCompact',
  'serviceDesk',
  'admins',
  'users'
];

function cloneSeedDatabase() {
  return JSON.parse(JSON.stringify(seedDatabase));
}

function normalizeDatabase(database) {
  const baseDatabase = cloneSeedDatabase();
  const normalized = {};
  const legacyAliases = {
    capitalOffers: 'lendingPartnerFlow',
    riskTrust: 'riskTrustLayer',
  };

  for (const resource of resourceKeys) {
    const legacyKey = legacyAliases[resource];
    normalized[resource] = Array.isArray(database?.[resource])
      ? database[resource]
      : legacyKey && Array.isArray(database?.[legacyKey])
        ? database[legacyKey]
        : baseDatabase[resource];
  }

  return normalized;
}

async function ensureDatabase() {
  await mkdir(dataDir, { recursive: true });

  try {
    const raw = await readFile(dbPath, 'utf8');
    const parsed = JSON.parse(raw);
    const normalized = normalizeDatabase(parsed);

    if (JSON.stringify(parsed) !== JSON.stringify(normalized)) {
      await writeFile(dbPath, JSON.stringify(normalized, null, 2));
    }
  } catch {
    await writeFile(dbPath, JSON.stringify(cloneSeedDatabase(), null, 2));
  }
}

async function readDatabase() {
  await ensureDatabase();
  const raw = await readFile(dbPath, 'utf8');
  return normalizeDatabase(JSON.parse(raw));
}

async function writeDatabase(nextDatabase) {
  await ensureDatabase();
  await writeFile(dbPath, JSON.stringify(nextDatabase, null, 2));
}

export function isSupportedResource(resource) {
  return resourceKeys.includes(resource);
}

export async function listResource(resource) {
  const database = await readDatabase();
  return database[resource] ?? [];
}

export async function getResourceItem(resource, id) {
  const items = await listResource(resource);
  return items.find((item) => item.id === id) ?? null;
}

export async function createResourceItem(resource, payload) {
  const database = await readDatabase();
  const now = new Date().toISOString();
  const record = {
    ...payload,
    id: payload.id ?? randomUUID(),
    updatedAt: now,
    createdAt: payload.createdAt ?? now
  };

  database[resource] = [record, ...(database[resource] ?? [])];
  await writeDatabase(database);
  return record;
}

export async function updateResourceItem(resource, id, payload) {
  const database = await readDatabase();
  const items = database[resource] ?? [];
  const targetIndex = items.findIndex((item) => item.id === id);

  if (targetIndex === -1) {
    return null;
  }

  const updatedRecord = {
    ...items[targetIndex],
    ...payload,
    id,
    updatedAt: new Date().toISOString()
  };

  items[targetIndex] = updatedRecord;
  database[resource] = items;
  await writeDatabase(database);
  return updatedRecord;
}

export async function deleteResourceItem(resource, id) {
  const database = await readDatabase();
  const items = database[resource] ?? [];
  const target = items.find((item) => item.id === id) ?? null;

  if (!target) {
    return null;
  }

  database[resource] = items.filter((item) => item.id !== id);
  await writeDatabase(database);
  return target;
}

export async function getAdminMeta() {
  const database = await readDatabase();
  const counts = Object.fromEntries(resourceKeys.map((resource) => [resource, database[resource].length]));
  const totalRecords = resourceKeys.reduce((sum, resource) => sum + database[resource].length, 0);

  return {
    resourceCounts: counts,
    totalRecords,
    adminCount: database.admins.length,
    userCount: database.users.length,
    writableResourceCount: resourceKeys.length,
    updatedAt: new Date().toISOString()
  };
}

export async function resetDatabase() {
  const nextDatabase = cloneSeedDatabase();
  await writeDatabase(nextDatabase);
  return nextDatabase;
}
