import { channelIntegrationsApi, type ChannelWarehouse, type ConnectedChannelRecord } from './channel-integrations-api';
import { DEMO_WAREHOUSE_ALIASES } from './demo-warehouse-locations';
import { getWarehouseById, getWarehouses } from './warehouse-store';

export const canonicalShopWarehouseId = (id: string) => DEMO_WAREHOUSE_ALIASES[id] ?? id;
export function shopWarehouse(warehouse: ChannelWarehouse | null): ChannelWarehouse | null {
  if (!warehouse) return null;
  const known = getWarehouseById(canonicalShopWarehouseId(warehouse.id));
  return known ? { id: known.id, name: known.name, code: known.code, city: known.address ?? '' } : warehouse;
}
export const merchantWarehouses = () => getWarehouses().filter(w => !DEMO_WAREHOUSE_ALIASES[w.id] && w.status === 'active' && !w.is_virtual && !['fba', 'fbs'].includes(w.type));

type Snapshot = { shops: ConnectedChannelRecord[]; status: 'idle' | 'loading' | 'ready' | 'error'; error?: string };
let snapshot: Snapshot = { shops: [], status: 'idle' };
let pending: Promise<ConnectedChannelRecord[]> | undefined;
let revision = 0;
const listeners = new Set<() => void>();
export const readConnectedShops = () => snapshot;
export function subscribeConnectedShops(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
function publish(next: Snapshot) { snapshot = next; listeners.forEach(listener => listener()); }

/** Keep raw server warehouse IDs for compare-and-swap; normalize names only for display. */
export function loadConnectedShops(): Promise<ConnectedChannelRecord[]> {
  if (pending) return pending;
  const request = ++revision;
  if (snapshot.status !== 'ready') publish({ ...snapshot, status: 'loading', error: undefined });
  const work = channelIntegrationsApi.channels().then(({ data }) => {
    if (request === revision) publish({ shops: data, status: 'ready' });
    return snapshot.shops;
  }).catch(error => {
    if (request === revision) publish({ ...snapshot, status: 'error', error: error instanceof Error ? error.message : 'Could not load shops.' });
    throw error;
  }).finally(() => { if (pending === work) pending = undefined; });
  pending = work;
  return work;
}
export async function saveShopWarehouse(shop: ConnectedChannelRecord, warehouse: ChannelWarehouse) {
  if (!merchantWarehouses().some(item => item.id === warehouse.id)) throw new Error('Choose an active merchant-managed warehouse.');
  const { data } = await channelIntegrationsApi.linkWarehouse(shop.id, warehouse, shop.warehouse?.id ?? null);
  ++revision; pending = undefined;
  publish({ status: 'ready', shops: snapshot.shops.some(item => item.id === data.id) ? snapshot.shops.map(item => item.id === data.id ? data : item) : [...snapshot.shops, data] });
  return data;
}

/** Connection setup still submits a server-known ID while using the same warehouse names. */
export function connectionWarehouseChoices(warehouses: ChannelWarehouse[]) {
  const choices = new Map<string, ChannelWarehouse>();
  for (const raw of warehouses) {
    const display = shopWarehouse(raw)!;
    const known = getWarehouseById(display.id);
    if (known && (known.status !== 'active' || known.is_virtual || ['fba', 'fbs'].includes(known.type))) continue;
    if (!choices.has(display.id) || raw.id === display.id) choices.set(display.id, { ...display, id: raw.id });
  }
  return [...choices.values()];
}
