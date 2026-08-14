import { createPrimeAuthHeaders, resolvePrimeBackendBase } from '@/lib/prime/backend-auth';

export type Platform = 'FACEBOOK_MESSENGER' | 'ZALO_OA' | 'INSTAGRAM_DIRECT' | 'WHATSAPP_BUSINESS' | 'WEB_LIVECHAT' | 'TIKTOK_SHOP_CHAT' | 'LAZADA_CHAT' | 'SHOPEE_CHAT';
export type Strategy = 'ROUND_ROBIN' | 'TEAM_QUEUE';
export type ConnectionType = 'QUICK_LINK' | 'STANDALONE_OAUTH';

export interface QuickStore {
  id: string;
  platform: Platform;
  store_name: string;
  channel_name: string;
  connection_status: string;
  chat_scope_ready: boolean;
  oauth_reuse_available: boolean;
  avatar_key: string;
}

export interface Channel {
  id: string;
  connection_type: ConnectionType;
  source_store_id: string | null;
  platform: Platform;
  display_name: string;
  account_name: string;
  status: 'CONNECTED' | 'NEEDS_REVIEW' | 'PAUSED';
  latency_status: string;
  webhook_health: string;
  webhook_latency_ms: number | null;
  last_ping_at: string;
  token_expires_at: string;
  sync_scopes: string[];
  routing: { strategy: Strategy; target_team_id: string; sla_threshold_minutes: number };
  automation: { enable_welcome: boolean; welcome_message: string; enable_ai_copilot: boolean; enable_ai_order_lookup: boolean };
  created_at: string;
}

export interface ConnectPayload {
  connection_type: ConnectionType;
  source_store_id: string | null;
  platform: Platform;
  display_name: string;
  account_name?: string;
  auth_code?: string;
  sync_scopes?: string[];
  routing: Channel['routing'];
  automation: Channel['automation'];
}

const demoStorageKey = 'prime-os-demo-conversation-channels';
const demoChannels: Channel[] = [
  { id: 'conv_fb_01', connection_type: 'STANDALONE_OAUTH', source_store_id: null, platform: 'FACEBOOK_MESSENGER', display_name: 'Facebook Messenger', account_name: 'Prime Beauty Vietnam', status: 'CONNECTED', latency_status: 'Real-time', webhook_health: 'HEALTHY', webhook_latency_ms: 184, last_ping_at: '2026-08-14T07:39:56.084Z', token_expires_at: '2026-09-28T07:40:56.084Z', sync_scopes: ['DMS', 'COMMENTS'], routing: { strategy: 'ROUND_ROBIN', target_team_id: 'team_cs_01', sla_threshold_minutes: 10 }, automation: { enable_welcome: true, welcome_message: 'Hello {{customer_name}}! How can Prime Beauty help you today?', enable_ai_copilot: true, enable_ai_order_lookup: true }, created_at: '2026-08-01T10:00:00Z' },
  { id: 'conv_zalo_01', connection_type: 'STANDALONE_OAUTH', source_store_id: null, platform: 'ZALO_OA', display_name: 'Zalo Official Account', account_name: 'Prime Official Account', status: 'CONNECTED', latency_status: 'Real-time', webhook_health: 'HEALTHY', webhook_latency_ms: 226, last_ping_at: '2026-08-14T07:38:56.084Z', token_expires_at: '2026-10-14T07:40:56.084Z', sync_scopes: ['MESSAGES', 'FOLLOW_EVENTS'], routing: { strategy: 'TEAM_QUEUE', target_team_id: 'team_social_cs', sla_threshold_minutes: 10 }, automation: { enable_welcome: true, welcome_message: 'Hello {{customer_name}}! How can we support you?', enable_ai_copilot: false, enable_ai_order_lookup: true }, created_at: '2026-08-03T08:30:00Z' },
  { id: 'conv_shopee_01', connection_type: 'QUICK_LINK', source_store_id: 'channel_shopee', platform: 'SHOPEE_CHAT', display_name: 'Shopee Chat', account_name: 'Prime Beauty Official', status: 'NEEDS_REVIEW', latency_status: 'Delayed 8m', webhook_health: 'DEGRADED', webhook_latency_ms: 480000, last_ping_at: '2026-08-14T07:32:56.084Z', token_expires_at: '2026-08-19T07:40:56.084Z', sync_scopes: ['CHATS', 'ORDER_CONTEXT'], routing: { strategy: 'ROUND_ROBIN', target_team_id: 'team_marketplace_cs', sla_threshold_minutes: 12 }, automation: { enable_welcome: false, welcome_message: '', enable_ai_copilot: true, enable_ai_order_lookup: true }, created_at: '2026-08-05T12:00:00Z' },
  { id: 'conv_ig_01', connection_type: 'STANDALONE_OAUTH', source_store_id: null, platform: 'INSTAGRAM_DIRECT', display_name: 'Instagram Direct', account_name: 'Prime Beauty Studio', status: 'PAUSED', latency_status: 'Paused by Minh Tran', webhook_health: 'PAUSED', webhook_latency_ms: null, last_ping_at: '2026-08-14T04:40:56.084Z', token_expires_at: '2026-09-11T07:40:56.084Z', sync_scopes: ['DMS', 'COMMENTS', 'STORY_MENTIONS'], routing: { strategy: 'TEAM_QUEUE', target_team_id: 'team_social_cs', sla_threshold_minutes: 20 }, automation: { enable_welcome: true, welcome_message: 'Hello {{customer_name}}! Thanks for reaching Prime Beauty Studio.', enable_ai_copilot: true, enable_ai_order_lookup: false }, created_at: '2026-08-07T09:15:00Z' },
  { id: 'conv_web_01', connection_type: 'STANDALONE_OAUTH', source_store_id: null, platform: 'WEB_LIVECHAT', display_name: 'PrimeWeb LiveChat', account_name: 'primebeauty.vn', status: 'CONNECTED', latency_status: 'Real-time', webhook_health: 'HEALTHY', webhook_latency_ms: 92, last_ping_at: '2026-08-14T07:40:12.084Z', token_expires_at: '2027-08-14T07:40:56.084Z', sync_scopes: ['MESSAGES', 'VISITOR_CONTEXT'], routing: { strategy: 'ROUND_ROBIN', target_team_id: 'team_cs_01', sla_threshold_minutes: 5 }, automation: { enable_welcome: true, welcome_message: 'Welcome back, {{customer_name}}. What are you shopping for today?', enable_ai_copilot: true, enable_ai_order_lookup: true }, created_at: '2026-08-10T03:20:00Z' },
];

const demoQuickStores: QuickStore[] = [
  { id: 'channel_tiktok_shop', platform: 'TIKTOK_SHOP_CHAT', store_name: 'Prime Live Store', channel_name: 'TikTok Shop', connection_status: 'CONNECTED', chat_scope_ready: true, oauth_reuse_available: true, avatar_key: 'tiktok_shop' },
  { id: 'channel_lazada', platform: 'LAZADA_CHAT', store_name: 'Prime Flagship Store', channel_name: 'Lazada', connection_status: 'CONNECTED', chat_scope_ready: true, oauth_reuse_available: true, avatar_key: 'lazada' },
];

function cloneDemoChannels() {
  return JSON.parse(JSON.stringify(demoChannels)) as Channel[];
}

function readDemoChannels() {
  if (typeof window === 'undefined') return cloneDemoChannels();
  const stored = window.sessionStorage.getItem(demoStorageKey);
  if (!stored) {
    const seeded = cloneDemoChannels();
    window.sessionStorage.setItem(demoStorageKey, JSON.stringify(seeded));
    return seeded;
  }
  try { return JSON.parse(stored) as Channel[]; } catch { return cloneDemoChannels(); }
}

function writeDemoChannels(channels: Channel[]) {
  if (typeof window !== 'undefined') window.sessionStorage.setItem(demoStorageKey, JSON.stringify(channels));
}

async function call<T>(path: string, init: RequestInit = {}) {
  const headers = createPrimeAuthHeaders();
  if (init.body) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${resolvePrimeBackendBase()}${path}`, { ...init, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || 'Conversation channel request failed.');
  return body as T;
}

async function withDemoFallback<T>(request: () => Promise<T>, fallback: () => T) {
  try { return await request(); } catch { return fallback(); }
}

export const conversationApi = {
  list: () => withDemoFallback(
    async () => {
      const response = await call<{ data: Channel[] }>('/api/v1/conversation-channels');
      return response.data.length ? response : { data: readDemoChannels() };
    },
    () => ({ data: readDemoChannels() }),
  ),
  quickStores: () => withDemoFallback(
    () => call<{ data: QuickStore[] }>('/api/v1/conversation-channels/quick-linkable-stores'),
    () => {
      const linked = new Set(readDemoChannels().map((channel) => channel.source_store_id));
      return { data: demoQuickStores.filter((store) => !linked.has(store.id)) };
    },
  ),
  connect: (payload: ConnectPayload) => withDemoFallback(
    () => call<{ data: Channel }>('/api/v1/conversation-channels/connect', { method: 'POST', body: JSON.stringify(payload) }),
    () => {
      const channel: Channel = { id: `conv_demo_${Date.now()}`, ...payload, account_name: payload.account_name || payload.display_name, status: 'CONNECTED', latency_status: 'Real-time', webhook_health: 'HEALTHY', webhook_latency_ms: 128, last_ping_at: new Date().toISOString(), token_expires_at: '2027-08-14T07:40:56.084Z', sync_scopes: payload.sync_scopes || ['MESSAGES'], created_at: new Date().toISOString() };
      writeDemoChannels([channel, ...readDemoChannels()]);
      return { data: channel };
    },
  ),
  ping: (id: string) => withDemoFallback(
    () => call<{ data: unknown }>(`/api/v1/conversation-channels/${id}/test-ping`, { method: 'POST' }),
    () => {
      const channels = readDemoChannels();
      const channel = channels.find((item) => item.id === id);
      if (channel) { channel.status = 'CONNECTED'; channel.webhook_health = 'HEALTHY'; channel.latency_status = 'Real-time'; channel.webhook_latency_ms = 146; channel.last_ping_at = new Date().toISOString(); writeDemoChannels(channels); }
      return { data: { channel, test: { ok: true, latency_ms: 146 } } };
    },
  ),
  update: (id: string, payload: Partial<Channel>) => withDemoFallback(
    () => call<{ data: Channel }>(`/api/v1/conversation-channels/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    () => {
      const channels = readDemoChannels();
      const index = channels.findIndex((item) => item.id === id);
      if (index >= 0) channels[index] = { ...channels[index], ...payload, routing: { ...channels[index].routing, ...(payload.routing || {}) }, automation: { ...channels[index].automation, ...(payload.automation || {}) } };
      writeDemoChannels(channels);
      return { data: channels[index] };
    },
  ),
  reauthorize: (id: string) => conversationApi.update(id, { status: 'CONNECTED', webhook_health: 'HEALTHY', token_expires_at: '2027-11-14T07:40:56.084Z' }),
  pause: (id: string) => {
    const channel = readDemoChannels().find((item) => item.id === id);
    const paused = channel?.status !== 'PAUSED';
    return withDemoFallback(
      () => call<{ data: Channel }>(`/api/v1/conversation-channels/${id}/toggle-pause`, { method: 'POST' }),
      () => conversationApi.update(id, { status: paused ? 'PAUSED' : 'CONNECTED', webhook_health: paused ? 'PAUSED' : 'HEALTHY', latency_status: paused ? 'Paused by current user' : 'Real-time' }),
    );
  },
  remove: (id: string) => withDemoFallback(
    () => call<{ ok: boolean }>(`/api/v1/conversation-channels/${id}`, { method: 'DELETE' }),
    () => { writeDemoChannels(readDemoChannels().filter((item) => item.id !== id)); return { ok: true }; },
  ),
};
