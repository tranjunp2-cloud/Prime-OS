import { createContext, useContext, useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { demoDataModeFromParams, readDemoDataMode, subscribeDemoDataMode, writeDemoDataMode, type DemoDataMode } from '@/lib/demo-data-mode';

export const DemoDataModeContext = createContext<DemoDataMode | null>(null);

export function useDemoDataMode() {
  const inheritedMode = useContext(DemoDataModeContext);
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const saved = useSyncExternalStore(subscribeDemoDataMode, readDemoDataMode, () => 'with-data' as const);
  const appliedLocation = useRef<string | null>(null);
  const locationId = `${location.key}:${location.pathname}${location.search}`;
  // Deep links take effect before paint. A stale URL cannot undo a cross-tab change.
  const incoming = inheritedMode === null && appliedLocation.current !== locationId ? demoDataModeFromParams(params) : undefined;
  const mode = inheritedMode ?? incoming ?? saved;
  useLayoutEffect(() => {
    appliedLocation.current = locationId;
    if (incoming) {
      if (incoming !== readDemoDataMode()) writeDemoDataMode(incoming);
      return;
    }
    const urlMode = demoDataModeFromParams(params);
    if (inheritedMode === null && urlMode && urlMode !== saved) {
      // Keep links that preserve the current query from reintroducing an old
      // mode after a storage event or a completed creation flow.
      const next = new URLSearchParams(params);
      next.delete('demo'); next.delete('preview');
      if (saved === 'no-data') next.set('demo', 'no-data');
      setParams(next, { replace: true });
    }
  }, [incoming, inheritedMode, locationId, params, saved, setParams]);
  function setMode(nextMode: DemoDataMode, clearParams: string[] = []) {
    writeDemoDataMode(nextMode);
    const next = new URLSearchParams(params);
    for (const key of ['demo', 'preview', ...clearParams]) next.delete(key);
    if (nextMode === 'no-data') next.set('demo', 'no-data');
    setParams(next);
  }
  return { mode, noData: mode === 'no-data', setMode };
}
