import { useEffect, useReducer } from 'react';
import { PRICING_CHANGED, PRICING_STORAGE_KEY } from '@/lib/pricing-rules';

export function usePricingRevision() {
  const [revision, refresh] = useReducer(value => value + 1, 0);
  useEffect(() => {
    const storage = (event: StorageEvent) => { if (event.key === PRICING_STORAGE_KEY || event.key === null) refresh(); };
    window.addEventListener(PRICING_CHANGED, refresh);
    window.addEventListener('storage', storage);
    // Expiring FX rates also invalidate an open review without another user action.
    const timer = window.setInterval(refresh, 30000);
    return () => { window.removeEventListener(PRICING_CHANGED, refresh); window.removeEventListener('storage', storage); window.clearInterval(timer); };
  }, []);
  return revision;
}
