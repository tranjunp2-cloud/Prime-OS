import fs from 'node:fs';
import path from 'node:path';
import { getGrowthOsSnapshot } from './growth-os.js';
import { listResource } from './store.js';

const STORE_PATH = path.resolve(process.env.PRIME_ONBOARDING_STORE_PATH || path.join('data', 'onboarding.json'));
const CELEBRATION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const stepDefinitions = [
  {
    key: 'create_warehouse',
    title: 'Set up a physical warehouse',
    description: 'Create the location that will hold and fulfill your inventory.',
    target_url: '/warehouses',
  },
  {
    key: 'connect_first_channel',
    title: 'Connect your first sales channel',
    description: 'Connect a marketplace or storefront to begin synchronizing commerce data.',
    target_url: '/sales-channels/connected-channels',
  },
  {
    key: 'map_warehouse',
    title: 'Map a channel warehouse',
    description: 'Link a channel location to the physical warehouse that fulfills its orders.',
    target_url: '/warehouses?view=channel-mapping',
  },
  {
    key: 'connect_second_channel',
    title: 'Connect a second sales channel',
    description: 'Complete the omnichannel setup by connecting another commerce channel.',
    target_url: '/channels/lazada/connect',
  },
];

function ensureStore() {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  if (!fs.existsSync(STORE_PATH)) fs.writeFileSync(STORE_PATH, JSON.stringify({ preferences: {} }, null, 2));
}

function readStore() {
  ensureStore();
  const data = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
  return { preferences: data.preferences && typeof data.preferences === 'object' ? data.preferences : {} };
}

function writeStore(store) {
  ensureStore();
  const temporaryPath = `${STORE_PATH}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify(store, null, 2));
  fs.renameSync(temporaryPath, STORE_PATH);
}

function accountKey(account) {
  return account?.id || account?.email || 'anonymous';
}

function validationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function getPreferences(account) {
  const store = readStore();
  return store.preferences[accountKey(account)] || {
    is_collapsed: false,
    is_dismissed: false,
    completed_at: null,
  };
}

function savePreferences(account, nextPreferences) {
  const store = readStore();
  store.preferences[accountKey(account)] = nextPreferences;
  writeStore(store);
  return nextPreferences;
}

export async function getOnboardingStatus(account) {
  const [warehouses, inventoryPositions] = await Promise.all([
    listResource('warehouses'),
    listResource('inventoryBrain'),
  ]);
  const snapshot = getGrowthOsSnapshot();
  const connectedChannels = snapshot.connectors.filter((connector) => (
    connector.category === 'Commerce' && connector.status === 'connected'
  ));
  const warehouseCodes = new Set(warehouses.map((warehouse) => warehouse.code).filter(Boolean));
  const hasChannelWarehouseMapping = connectedChannels.length > 0 && inventoryPositions.some((position) => (
    position.warehouseCode && warehouseCodes.has(position.warehouseCode)
  ));
  const completedByKey = {
    create_warehouse: warehouses.length > 0,
    connect_first_channel: connectedChannels.length > 0,
    map_warehouse: hasChannelWarehouseMapping,
    connect_second_channel: connectedChannels.length >= 2,
  };
  const steps = stepDefinitions.map((step) => ({
    ...step,
    status: completedByKey[step.key] ? 'COMPLETED' : 'PENDING',
  }));
  const completedSteps = steps.filter((step) => step.status === 'COMPLETED').length;
  const isCompleted = completedSteps === steps.length;
  let preferences = getPreferences(account);

  if (isCompleted && !preferences.completed_at) {
    preferences = savePreferences(account, { ...preferences, completed_at: new Date().toISOString() });
  }

  const celebrationExpiresAt = preferences.completed_at
    ? new Date(new Date(preferences.completed_at).getTime() + CELEBRATION_WINDOW_MS).toISOString()
    : null;
  const celebrationActive = Boolean(
    isCompleted
    && celebrationExpiresAt
    && Date.now() < new Date(celebrationExpiresAt).getTime()
    && !preferences.is_dismissed
  );
  const firstPending = steps.find((step) => step.status === 'PENDING') || null;

  return {
    total_steps: steps.length,
    completed_steps: completedSteps,
    is_completed: isCompleted,
    is_collapsed: Boolean(preferences.is_collapsed),
    is_dismissed: Boolean(preferences.is_dismissed || (isCompleted && !celebrationActive)),
    celebration_active: celebrationActive,
    celebration_expires_at: celebrationExpiresAt,
    next_step: firstPending,
    steps,
  };
}

export function updateOnboardingPreferences(account, payload = {}) {
  const allowedKeys = ['is_collapsed', 'is_dismissed'];
  const providedKeys = Object.keys(payload);
  if (!providedKeys.length || providedKeys.some((key) => !allowedKeys.includes(key))) {
    throw validationError('Provide is_collapsed or is_dismissed.');
  }
  for (const key of providedKeys) {
    if (typeof payload[key] !== 'boolean') throw validationError(`${key} must be a boolean.`);
  }
  const current = getPreferences(account);
  return savePreferences(account, {
    ...current,
    ...Object.fromEntries(providedKeys.map((key) => [key, payload[key]])),
    updated_at: new Date().toISOString(),
  });
}
