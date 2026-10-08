export const SELLER_DEMO_KEY = 'prime:seller-onboarding-demo:v1';
export const steps = ['Workspace', 'Markets & channels', 'Selling profiles', 'Stock location', 'Your catalog'];
export interface SellerDemo {
  step: number;
  view: 'setup' | 'home';
  completed: number[];
  name: string;
  language: string;
  currency: string;
  theme: string;
  timezone: string;
  market: string;
  channels: string[];
  connected: string[];
  business: string;
  sellerType: string;
  email: string;
  warehouse: string;
  address: string;
  catalog: string;
}
export const freshSellerDemo = (): SellerDemo => ({
  step: 0, view: 'setup', completed: [], name: '', language: 'Tiếng Việt', currency: 'VND', theme: 'System', timezone: 'Asia/Ho_Chi_Minh', market: 'Vietnam', channels: [], connected: [], business: '', sellerType: 'Business', email: '', warehouse: '', address: '', catalog: 'later',
});
export function readSellerDemo(): SellerDemo {
  try {
    const raw = JSON.parse(localStorage.getItem(SELLER_DEMO_KEY) || 'null');
    const defaults = freshSellerDemo();
    if (!raw || typeof raw !== 'object') return defaults;
    for (const key of Object.keys(defaults) as (keyof SellerDemo)[]) {
      if (Array.isArray(defaults[key])) continue;
      if (typeof raw[key] !== typeof defaults[key]) return defaults;
    }
    if (!Number.isInteger(raw.step) || raw.step < 0 || raw.step > 4 || !['setup', 'home'].includes(raw.view)) return defaults;
    if (!Array.isArray(raw.completed) || !raw.completed.every((v: unknown) => Number.isInteger(v) && Number(v) >= 0 && Number(v) <= 4)) return defaults;
    if (![raw.channels, raw.connected].every(v => Array.isArray(v) && v.every(item => typeof item === 'string'))) return defaults;
    return { ...defaults, ...raw };
  } catch { return freshSellerDemo(); }
}
export function stepError(data: SellerDemo): string {
  if (data.step === 0 && !data.name.trim()) return 'Enter a workspace name to continue.';
  if (data.step === 1 && data.channels.some(channel => !data.connected.includes(channel))) return 'Connect each selected channel, or deselect it to set up later.';
  if (data.step === 2 && (!data.business.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))) return 'Enter your selling name and a valid contact email.';
  if (data.step === 3 && (!data.warehouse.trim() || !data.address.trim())) return 'Enter a stock location name and address.';
  if (data.step === 4 && data.catalog === 'channel' && !data.connected.length) return 'Connect a channel first, or choose to add products later.';
  return '';
}
