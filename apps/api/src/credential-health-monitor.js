import { getConnectorCredential, getConnectorAdapterProfile, getGrowthOsSnapshot, findRawConnector } from './growth-os.js';
import { callRealProviderProbe } from './connector-gateway.js';

const MONITOR_INTERVAL_MS = Math.max(30000, Number(process.env.PRIME_CREDENTIAL_HEALTH_INTERVAL_MS || 5 * 60 * 1000));
const MONITOR_CONCURRENCY = Math.max(1, Number(process.env.PRIME_CREDENTIAL_HEALTH_CONCURRENCY || 2));
const BATCH_SIZE = Math.max(2, Number(process.env.PRIME_CREDENTIAL_HEALTH_BATCH_SIZE || 6));

let monitorTimer = null;
let monitorRunning = false;
const healthCache = new Map();

function getHealthCacheKey(connector) {
  return `${connector.id}::${connector.environment || 'production'}`;
}

export function getConnectorHealth(connectorId) {
  const connector = findRawConnector(connectorId);
  if (!connector) return null;
  return healthCache.get(getHealthCacheKey(connector)) || computeStaticHealth(connector);
}

export function getAllConnectorHealth() {
  const results = [];
  const snapshot = getGrowthOsSnapshot();
  for (const connector of snapshot.connectors) {
    const cached = healthCache.get(getHealthCacheKey(connector));
    results.push(cached || computeStaticHealth(connector));
  }
  return results;
}

function computeStaticHealth(connector) {
  const adapterProfile = getConnectorAdapterProfile(connector.provider);
  const health = {
    connectorId: connector.id,
    provider: connector.provider,
    name: connector.name,
    category: connector.category,
    status: connector.status,
    syncHealth: connector.syncHealth,
    credentialStatus: connector.credentialStatus,
    lastProbeAt: connector.credentialMeta?.lastProbeAt || connector.lastTestAt || null,
    lastProbeStatus: connector.credentialMeta?.lastProbeStatus || 'unknown',
    lastProbeHttpStatus: connector.credentialMeta?.lastProbeHttpStatus || 0,
    lastProbeSource: connector.credentialMeta?.lastProbeSource || 'static',
    hasCredential: connector.credentialStatus === 'configured' || connector.credentialStatus === 'validated',
    hasOAuth: Boolean(adapterProfile.oauth),
    hasGatewayProbe: adapterProfile.probe?.probeAdapter === 'connector_gateway',
    hasWebhook: adapterProfile.supportsWebhook || false,
    webhookSignatureMode: adapterProfile.webhookSecurity?.mode || 'none',
    credentialHealth: 'unknown',
    credentialHealthCheckedAt: null,
    credentialHealthMessage: null,
    priorityTier: connector.priorityTier || 'P3',
    priorityWave: connector.priorityWave || '',
  };
  return health;
}

function updateHealthCache(connectorId, partial = {}) {
  const key = [...healthCache.keys()].find((k) => k.startsWith(`${connectorId}::`));
  if (!key) return;
  const existing = healthCache.get(key);
  if (!existing) return;
  healthCache.set(key, { ...existing, ...partial, credentialHealthCheckedAt: new Date().toISOString() });
}

async function probeConnectorHealth(connector) {
  const key = getHealthCacheKey(connector);
  if (!healthCache.has(key)) {
    healthCache.set(key, computeStaticHealth(connector));
  }

  const adapterProfile = getConnectorAdapterProfile(connector.provider);
  if (adapterProfile.probe?.probeAdapter !== 'connector_gateway') {
    healthCache.set(key, {
      ...(healthCache.get(key) || computeStaticHealth(connector)),
      credentialHealth: 'not_monitored',
      credentialHealthCheckedAt: new Date().toISOString(),
      credentialHealthMessage: 'No gateway probe configured for this connector.',
    });
    return;
  }

  const accessToken = getConnectorCredential(connector, 'accessToken');
  if (!accessToken) {
    healthCache.set(key, {
      ...(healthCache.get(key) || computeStaticHealth(connector)),
      credentialHealth: 'missing_credential',
      credentialHealthCheckedAt: new Date().toISOString(),
      credentialHealthMessage: 'No stored credential available for health check.',
    });
    return;
  }

  try {
    const { response, body } = await callRealProviderProbe({ connector, token: accessToken });
    const successPath = adapterProfile.probe.successPath;
    const expectedValue = successPath
      ? String(successPath).split('.').reduce((current, key) => current?.[key], body)
      : null;
    const expectedMatched = successPath
      ? (Array.isArray(expectedValue) ? expectedValue.length >= 0 : Boolean(expectedValue))
      : true;
    const ok = response.ok && expectedMatched;

    healthCache.set(key, {
      ...(healthCache.get(key) || computeStaticHealth(connector)),
      credentialHealth: ok ? 'healthy' : 'unhealthy',
      credentialHealthCheckedAt: new Date().toISOString(),
      credentialHealthMessage: ok
        ? `Provider API returned HTTP ${response.status}.`
        : `Provider API returned HTTP ${response.status}, expected path "${successPath}" ${expectedMatched ? 'matched' : 'not matched'}.`,
      lastProbeAt: new Date().toISOString(),
      lastProbeStatus: ok ? 'ready' : 'watch',
      lastProbeHttpStatus: response.status,
      lastProbeSource: 'health_monitor',
    });
  } catch (err) {
    healthCache.set(key, {
      ...(healthCache.get(key) || computeStaticHealth(connector)),
      credentialHealth: 'error',
      credentialHealthCheckedAt: new Date().toISOString(),
      credentialHealthMessage: err instanceof Error ? err.message : 'Unknown probe error.',
    });
  }
}

export function startCredentialHealthMonitor() {
  if (monitorRunning) return;
  monitorRunning = true;

  const tick = async () => {
    if (!monitorRunning) return;
    try {
      const snapshot = getGrowthOsSnapshot();
      const toMonitor = snapshot.connectors.filter((connector) => {
        const status = connector.status;
        const hasCredential = connector.credentialStatus === 'configured' || connector.credentialStatus === 'validated';
        const adapterProfile = getConnectorAdapterProfile(connector.provider);
        return (status === 'connected' || status === 'tested') && hasCredential && adapterProfile.probe?.probeAdapter === 'connector_gateway';
      });

      if (toMonitor.length > 0) {
        for (let i = 0; i < toMonitor.length; i += MONITOR_CONCURRENCY) {
          const batch = toMonitor.slice(i, i + MONITOR_CONCURRENCY);
          await Promise.allSettled(batch.map((connector) => probeConnectorHealth(connector)));
        }
      }

      const now = new Date().toISOString();
      for (const [key, health] of healthCache) {
        if (health.lastProbeAt && Date.now() - new Date(health.lastProbeAt).getTime() > 30 * 60 * 1000) {
          health.credentialHealth = 'stale';
          health.credentialHealthMessage = 'Health check data is stale (>30 min).';
        }
      }
    } catch (err) {
      console.error(`[credential-health-monitor] Tick failed: ${err.message}`);
    }

    monitorTimer = setTimeout(tick, MONITOR_INTERVAL_MS);
  };

  monitorTimer = setTimeout(tick, 5000);
  console.log(`[credential-health-monitor] Started, interval ${MONITOR_INTERVAL_MS}ms, concurrency ${MONITOR_CONCURRENCY}`);
}

export function stopCredentialHealthMonitor() {
  monitorRunning = false;
  if (monitorTimer) {
    clearTimeout(monitorTimer);
    monitorTimer = null;
  }
  console.log('[credential-health-monitor] Stopped');
}

export function getCredentialHealthStats() {
  const byHealth = {};
  const all = getAllConnectorHealth();
  for (const health of all) {
    byHealth[health.credentialHealth] = (byHealth[health.credentialHealth] || 0) + 1;
  }
  return {
    total: all.length,
    byHealth,
    monitorRunning,
    intervalMs: MONITOR_INTERVAL_MS,
    lastFullScan: all.reduce((latest, h) => {
      if (!h.credentialHealthCheckedAt) return latest;
      return latest > h.credentialHealthCheckedAt ? latest : h.credentialHealthCheckedAt;
    }, ''),
  };
}
