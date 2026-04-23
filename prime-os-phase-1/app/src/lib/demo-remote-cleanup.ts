import { supabase } from '@/integrations/supabase/client';

const DEMO_EMAIL = 'demo@primeos.local';
const CLEANUP_VERSION = 'primeos-demo-cleanup-v1';
const LEGACY_SKU_CODES = new Set([
  'NISSIN-RAOH-TONKOTSU-90G',
  'ICHIRAN-RAMEN-SET-5',
]);

function getCleanupStorageKey(userId: string) {
  return `primeos.demo.cleanup.${userId}`;
}

function getStoredCleanupVersion(userId: string) {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(getCleanupStorageKey(userId));
}

function markCleanupVersion(userId: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(getCleanupStorageKey(userId), CLEANUP_VERSION);
}

export function isCanonicalDemoUser(user: { email?: string | null } | null | undefined) {
  return user?.email === DEMO_EMAIL;
}

export async function clearLegacyRemoteDemoFulfillment(user: {
  id: string;
  email?: string | null;
}) {
  if (!isCanonicalDemoUser(user)) {
    return { cleaned: false, reason: 'not-demo-user' as const };
  }

  if (getStoredCleanupVersion(user.id) === CLEANUP_VERSION) {
    return { cleaned: false, reason: 'already-cleaned' as const };
  }

  const { data: jobs, error: jobsError } = await supabase
    .from('fulfillment_jobs')
    .select('id, job_code')
    .eq('user_id', user.id);

  if (jobsError) {
    throw jobsError;
  }

  const jobIds = (jobs ?? []).map((job) => job.id);
  if (jobIds.length === 0) {
    markCleanupVersion(user.id);
    return { cleaned: false, reason: 'no-remote-jobs' as const };
  }

  const { data: items, error: itemsError } = await supabase
    .from('fulfillment_job_items')
    .select('id, sku_code, job_id')
    .in('job_id', jobIds);

  if (itemsError) {
    throw itemsError;
  }

  const looksLegacy = (jobs ?? []).some((job) => !job.job_code) || (items ?? []).some((item) => (
    !!item.sku_code && LEGACY_SKU_CODES.has(item.sku_code)
  ));

  if (!looksLegacy) {
    markCleanupVersion(user.id);
    return { cleaned: false, reason: 'not-legacy' as const };
  }

  const { data: shipments, error: shipmentsError } = await supabase
    .from('shipments')
    .select('id')
    .eq('user_id', user.id)
    .in('job_id', jobIds);

  if (shipmentsError) {
    throw shipmentsError;
  }

  const shipmentIds = (shipments ?? []).map((shipment) => shipment.id);

  if (shipmentIds.length > 0) {
    const { error: trackingEventsError } = await supabase
      .from('tracking_events')
      .delete()
      .in('shipment_id', shipmentIds);

    if (trackingEventsError) {
      throw trackingEventsError;
    }

    const { error: shipmentEventsError } = await supabase
      .from('shipment_events')
      .delete()
      .in('shipment_id', shipmentIds);

    if (shipmentEventsError) {
      throw shipmentEventsError;
    }
  }

  const { error: exceptionsError } = await supabase
    .from('fulfillment_exceptions')
    .delete()
    .in('job_id', jobIds);

  if (exceptionsError) {
    throw exceptionsError;
  }

  const { error: jobItemsError } = await supabase
    .from('fulfillment_job_items')
    .delete()
    .in('job_id', jobIds);

  if (jobItemsError) {
    throw jobItemsError;
  }

  if (shipmentIds.length > 0) {
    const { error: shipmentsDeleteError } = await supabase
      .from('shipments')
      .delete()
      .in('id', shipmentIds);

    if (shipmentsDeleteError) {
      throw shipmentsDeleteError;
    }
  }

  const { error: jobsDeleteError } = await supabase
    .from('fulfillment_jobs')
    .delete()
    .in('id', jobIds);

  if (jobsDeleteError) {
    throw jobsDeleteError;
  }

  markCleanupVersion(user.id);

  return {
    cleaned: true,
    reason: 'legacy-removed' as const,
    removedJobs: jobIds.length,
    removedShipments: shipmentIds.length,
  };
}
