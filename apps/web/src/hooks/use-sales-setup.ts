import { useState, useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import { readSellerDemo } from '@/components/seller-onboarding/demo-state';
import { channelIntegrationsApi } from '@/lib/channel-integrations-api';
import { getProducts } from '@/lib/product-store';
import { getWarehouses } from '@/lib/warehouse-store';
import { canonicalShopWarehouseId } from '@/lib/shop-warehouse-settings';
import { buildSalesSetup, type SalesSetupIntent } from '@/lib/sales-setup';
import { useDemoDataMode } from './use-demo-data-mode';

const preferencesKey = 'prime:sales-setup-guidance:v1';
const preferencesEvent = 'prime:sales-setup-guidance-change';
type Preferences = { hidden: boolean };
const defaults: Preferences = { hidden: false };
function readPreferences() {
  try { return localStorage.getItem(preferencesKey) ?? ''; } catch { return ''; }
}
function subscribe(listener: () => void) {
  window.addEventListener(preferencesEvent, listener);
  window.addEventListener('storage', listener);
  return () => { window.removeEventListener(preferencesEvent, listener); window.removeEventListener('storage', listener); };
}
function parsePreferences(raw: string): Preferences {
  try {
    const parsed = JSON.parse(raw);
    return { hidden: parsed?.hidden === true };
  } catch { return defaults; }
}

// The prototype stores setup answers and display preferences on this browser.
export function useSalesSetupPreferences() {
  const raw = useSyncExternalStore(subscribe, readPreferences, () => '');
  const [error, setError] = useState('');
  const preferences = parsePreferences(raw);
  function update(patch: Partial<Preferences>) {
    try {
      localStorage.setItem(preferencesKey, JSON.stringify({ ...parsePreferences(readPreferences()), ...patch }));
      window.dispatchEvent(new Event(preferencesEvent));
      setError('');
    } catch { setError('Could not save this preference. Please try again.'); }
  }
  return { preferences, update, error };
}

export function useSalesSetup() {
  const { noData } = useDemoDataMode();
  const setup = readSellerDemo();
  const intent: SalesSetupIntent = !setup.deferred.includes(4) && ['manual', 'channel'].includes(setup.catalog) ? setup.catalog as SalesSetupIntent : 'later';
  const stockNeeded = setup.completed.includes(3) && Boolean(setup.warehouse.trim());
  const query = useQuery({
    queryKey: ['sales-setup', noData, intent, stockNeeded],
    queryFn: async () => {
      // No-data is an isolated preview: seeded products and shops must not count.
      if (noData) return buildSalesSetup(intent, stockNeeded, {
        productCount: 0,
        warehouseIds: [],
        channels: [],
      });
      const channels = intent === 'channel' ? (await channelIntegrationsApi.channels()).data : [];
      return buildSalesSetup(intent, stockNeeded, {
        productCount: getProducts().length,
        warehouseIds: getWarehouses().filter(warehouse => warehouse.status === 'active' && !warehouse.is_virtual).map(warehouse => canonicalShopWarehouseId(warehouse.id)),
        channels: channels.map(channel => ({ ...channel, warehouse: channel.warehouse ? { ...channel.warehouse, id: canonicalShopWarehouseId(channel.warehouse.id) } : null })),
      });
    },
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: true,
    refetchInterval: query => query.state.data?.steps.some(step => step.status === 'running') ? 10_000 : false,
  });
  return { ...query, setup };
}
