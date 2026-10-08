import { useEffect, useSyncExternalStore } from 'react';
import { loadConnectedShops, readConnectedShops, subscribeConnectedShops } from '@/lib/shop-warehouse-settings';

export function useConnectedShops() {
  const snapshot = useSyncExternalStore(subscribeConnectedShops, readConnectedShops, readConnectedShops);
  useEffect(() => {
    const refresh = () => { void loadConnectedShops().catch(() => {}); };
    refresh();
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);
  return { ...snapshot, reload: loadConnectedShops };
}
