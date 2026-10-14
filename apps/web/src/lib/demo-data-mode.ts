export type DemoDataMode = 'with-data' | 'no-data';
export const DEMO_DATA_MODE_KEY = 'prime:demo-data-mode:v1';
const legacyKey = 'prime:overview-demo-mode';
const changeEvent = 'prime:demo-data-mode-change';
let fallback: DemoDataMode = 'with-data';
let memoryOnly = false;

// Presentation preference only: never clear business data when changing modes.
export function readDemoDataMode(): DemoDataMode {
  if (memoryOnly) return fallback;
  try {
    const saved = localStorage.getItem(DEMO_DATA_MODE_KEY) ?? localStorage.getItem(legacyKey);
    return saved === 'no-data' ? 'no-data' : 'with-data';
  } catch { return fallback; }
}
export function writeDemoDataMode(mode: DemoDataMode) {
  fallback = mode;
  try { localStorage.setItem(DEMO_DATA_MODE_KEY, mode); localStorage.setItem(legacyKey, mode); memoryOnly = false; }
  catch { memoryOnly = true; }
  window.dispatchEvent(new Event('prime:demo-data-mode-change'));
}
export function subscribeDemoDataMode(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (!event.key || event.key === DEMO_DATA_MODE_KEY || event.key === legacyKey) { memoryOnly = false; listener(); }
  };
  window.addEventListener(changeEvent, listener);
  window.addEventListener('storage', onStorage);
  return () => { window.removeEventListener(changeEvent, listener); window.removeEventListener('storage', onStorage); };
}
export function demoDataModeFromParams(params: URLSearchParams): DemoDataMode | undefined {
  if (params.get('demo') === 'no-data') return 'no-data';
  if (['with-data', 'data'].includes(params.get('demo') ?? '')) return 'with-data';
  if (['first-product', 'no-channels'].includes(params.get('preview') ?? '')) return 'no-data';
  return undefined;
}
