import { createPrimeAuthHeaders, resolvePrimeBackendBase } from '@/lib/prime/backend-auth';

export type LiveSessionStatus = 'LIVE' | 'SCHEDULED' | 'ENDED';
export type AutoReleasePolicy = 'IMMEDIATE_ON_END' | 'HOLD_2_HOURS' | 'MANUAL_RELEASE';

export interface LiveChannel { id: string; name: string; account_name: string }
export interface LiveWarehouse { id: string; name: string }
export interface LiveInventorySku { sku_id: string; title: string; variant: string; available_atp: number; reserved_live: number; base_price: number }
export interface AllocatedLiveItem { sku_id: string; title: string; variant: string; allocated_qty: number; sold_qty: number; live_price: number }
export interface LiveSession {
  id: string; title: string; channel_id: string; host_name: string; warehouse_id: string;
  scheduled_start_at: string; duration_hours: number; auto_release_policy: AutoReleasePolicy;
  enable_safety_buffer: boolean; status: LiveSessionStatus; allocated_items: AllocatedLiveItem[];
  allocated_qty: number; reserved_qty: number; sold_qty: number; orders_count: number;
  attributed_revenue: number; release_status: string; channel: LiveChannel; warehouse: LiveWarehouse;
}
export interface LiveSummary { active_sessions: number; scheduled_today: number; allocated_stock: number; sold_units: number; sold_percentage: number; live_orders: number; attributed_revenue: number }
export interface LiveOptions { channels: LiveChannel[]; warehouses: LiveWarehouse[]; inventory: LiveInventorySku[] }
export interface LiveEvent { id: string; type: 'ORDER_CAPTURED' | 'STOCK_RESERVED'; message: string; units: number; amount: number; occurred_at: string }
export interface CreateLivePayload {
  title: string; channel_id: string; host_name: string; warehouse_id: string; scheduled_start_at: string;
  duration_hours: number; auto_release_policy: AutoReleasePolicy; enable_safety_buffer: boolean;
  allocated_items: Array<{ sku_id: string; allocated_qty: number; live_price: number }>;
}

async function request<T>(path: string, init: RequestInit = {}) {
  const headers = createPrimeAuthHeaders();
  if (init.body) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${resolvePrimeBackendBase()}${path}`, { ...init, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || 'Live Commerce request failed.');
  return body as T;
}

export const liveCommerceApi = {
  summary: () => request<{ data: LiveSummary }>('/api/v1/live-sessions/summary'),
  list: (params = new URLSearchParams()) => request<{ data: LiveSession[]; meta: { total: number } }>(`/api/v1/live-sessions?${params}`),
  options: (warehouseId?: string) => request<{ data: LiveOptions }>(`/api/v1/live-sessions/options${warehouseId ? `?warehouse_id=${encodeURIComponent(warehouseId)}` : ''}`),
  get: (id: string) => request<{ data: LiveSession }>(`/api/v1/live-sessions/${id}`),
  create: (payload: CreateLivePayload) => request<{ data: LiveSession }>('/api/v1/live-sessions', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id: string, payload: Partial<CreateLivePayload>) => request<{ data: LiveSession }>(`/api/v1/live-sessions/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  topUp: (id: string, payload: { sku_id: string; additional_qty: number }) => request<{ data: LiveSession }>(`/api/v1/live-sessions/${id}/top-up-stock`, { method: 'POST', body: JSON.stringify(payload) }),
  end: (id: string) => request<{ data: LiveSession }>(`/api/v1/live-sessions/${id}/end-session`, { method: 'POST' }),
  events: (id: string) => request<{ data: LiveEvent[] }>(`/api/v1/live-sessions/${id}/events`),
};
