import { createPrimeAuthHeaders, resolvePrimeBackendBase } from '@/lib/prime/backend-auth';

export type ChannelCategory = 'Marketplaces' | 'E-Commerce/Web' | 'Retail POS' | 'Social';
export type CatalogStrategy = 'AUTO_MATCH_SKU' | 'CREATE_NEW_MASTERS' | 'MANUAL_LATER';

export interface AvailablePlatform {
  id: string;
  name: string;
  category: ChannelCategory;
  auth_type: 'OAUTH2' | 'API_KEY';
  color: string;
  icon_url: string;
  regions: string[];
}

export interface ChannelWarehouse { id: string; name: string; code: string; city: string }

export interface ConnectedChannelRecord {
  id: string;
  platform: string;
  name: string;
  store_name: string;
  region: string;
  type: 'Marketplace' | 'E-Commerce/Web' | 'Retail POS' | 'Social';
  status: 'CONNECTED' | 'EXPIRED' | 'SYNC_ERROR' | 'INITIAL_SYNCING';
  synced_listings: number;
  sync_progress: number;
  warehouse: ChannelWarehouse | null;
  sync_services: { price: boolean; stock: boolean; orders: boolean };
  errors: number;
  last_sync_at: string;
}

export interface ConnectChannelPayload {
  platform: string;
  store_name: string;
  region: string;
  auth_code: string;
  physical_warehouse_id: string;
  sync_services: { price: boolean; stock: boolean; orders: boolean };
  is_default_pickup: boolean;
  is_default_return: boolean;
  catalog_strategy: CatalogStrategy;
}

async function request<T>(path: string, init: RequestInit = {}) {
  const headers = createPrimeAuthHeaders();
  if (init.body) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${resolvePrimeBackendBase()}${path}`, { ...init, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || 'Channel integration request failed.');
  return body as T;
}

export const channelIntegrationsApi = {
  platforms: () => request<{ data: AvailablePlatform[] }>('/api/v1/channels/available-platforms'),
  warehouses: () => request<{ data: ChannelWarehouse[] }>('/api/v1/warehouses'),
  channels: () => request<{ data: ConnectedChannelRecord[] }>('/api/v1/channels'),
  connect: (payload: ConnectChannelPayload) => request<{ data: ConnectedChannelRecord }>('/api/v1/channels/connect', { method: 'POST', body: JSON.stringify(payload) }),
  syncStatus: (id: string) => request<{ id: string; status: ConnectedChannelRecord['status']; synced_listings: number; sync_progress: number }>(`/api/v1/channels/${encodeURIComponent(id)}/sync-status`),
  authorizationUrl: (platform: string, region: string) => {
    const query = new URLSearchParams({ region, return_origin: window.location.origin });
    return `${resolvePrimeBackendBase()}/api/v1/channels/${encodeURIComponent(platform)}/authorize?${query}`;
  },
};
