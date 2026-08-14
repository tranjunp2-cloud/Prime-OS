import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const STORE_PATH = path.resolve(process.env.PRIME_CHANNEL_STORE_PATH || path.join('data', 'channel-integrations.json'));
const platforms = [
  { id: 'shopee', name: 'Shopee', category: 'Marketplaces', auth_type: 'OAUTH2', color: '#EE4D2D', regions: ['VN', 'SG', 'TH', 'MY'] },
  { id: 'lazada', name: 'Lazada', category: 'Marketplaces', auth_type: 'OAUTH2', color: '#6C2CFF', regions: ['VN', 'SG', 'TH', 'MY'] },
  { id: 'tiktok_shop', name: 'TikTok Shop', category: 'Marketplaces', auth_type: 'OAUTH2', color: '#111827', regions: ['VN', 'SG', 'TH', 'MY', 'US'] },
  { id: 'amazon', name: 'Amazon', category: 'Marketplaces', auth_type: 'OAUTH2', color: '#111827', regions: ['SG', 'US'] },
  { id: 'rakuten', name: 'Rakuten', category: 'Marketplaces', auth_type: 'API_KEY', color: '#BF0000', regions: ['SG', 'US'] },
  { id: 'primeweb', name: 'PrimeWeb', category: 'E-Commerce/Web', auth_type: 'API_KEY', color: '#4F46E5', regions: ['VN', 'SG', 'TH', 'MY', 'US'] },
  { id: 'woocommerce', name: 'WooCommerce', category: 'E-Commerce/Web', auth_type: 'API_KEY', color: '#96588A', regions: ['VN', 'SG', 'TH', 'MY', 'US'] },
  { id: 'shopify', name: 'Shopify', category: 'E-Commerce/Web', auth_type: 'OAUTH2', color: '#95BF47', regions: ['VN', 'SG', 'TH', 'MY', 'US'] },
  { id: 'primepos', name: 'PrimePOS', category: 'Retail POS', auth_type: 'API_KEY', color: '#059669', regions: ['VN', 'SG', 'TH', 'MY', 'US'] },
  { id: 'facebook', name: 'Facebook Shop', category: 'Social', auth_type: 'OAUTH2', color: '#1877F2', regions: ['VN', 'SG', 'TH', 'MY', 'US'] },
  { id: 'instagram', name: 'Instagram Shopping', category: 'Social', auth_type: 'OAUTH2', color: '#C13584', regions: ['VN', 'SG', 'TH', 'MY', 'US'] },
];

const warehouses = [
  { id: 'wh_hcm_01', name: 'HCM Central', code: 'HCM-CENTRAL', city: 'Ho Chi Minh City' },
  { id: 'wh_hn_01', name: 'Hanoi Hub', code: 'HN-HUB', city: 'Hanoi' },
  { id: 'wh_crossborder_01', name: 'Cross-border DC', code: 'CBD-01', city: 'Ho Chi Minh City' },
  { id: 'wh_d1_01', name: 'D1 Flagship Store', code: 'D1-POS', city: 'Ho Chi Minh City' },
];

function seedStore() {
  const base = [
    ['primeweb', 'PrimeWeb', 'primebeauty.vn', 'E-Commerce/Web', 'CONNECTED', 1240, 'wh_hcm_01', true, true, true, 0],
    ['shopee', 'Shopee', 'Prime Beauty Official', 'Marketplace', 'CONNECTED', 1186, 'wh_hcm_01', true, true, true, 0],
    ['lazada', 'Lazada', 'Prime Flagship Store', 'Marketplace', 'EXPIRED', 972, 'wh_hn_01', false, false, false, 3],
    ['amazon', 'Amazon', 'Prime Beauty US', 'Marketplace', 'SYNC_ERROR', 684, 'wh_crossborder_01', true, false, true, 5],
    ['rakuten', 'Rakuten', 'Prime Beauty JP', 'Marketplace', 'CONNECTED', 416, 'wh_crossborder_01', true, true, true, 0],
    ['primepos', 'PrimePOS', 'District 1 Flagship', 'Retail POS', 'CONNECTED', 1240, 'wh_d1_01', true, true, true, 0],
    ['tiktok_shop', 'TikTok Shop', 'Prime Live Store', 'Marketplace', 'SYNC_ERROR', 803, null, true, false, true, 4],
  ];
  return { channels: base.map(([platform, name, store_name, type, status, synced_listings, warehouse_id, price, stock, orders, errors]) => ({ id: `channel_${platform}`, platform, name, store_name, region: platform === 'amazon' ? 'US' : 'VN', type, status, synced_listings, sync_progress: status === 'CONNECTED' ? 100 : 0, physical_warehouse_id: warehouse_id, sync_services: { price, stock, orders }, is_default_pickup: platform === 'primeweb', is_default_return: platform === 'primeweb', catalog_strategy: 'AUTO_MATCH_SKU', errors, last_sync_at: '2026-08-14T07:00:00.000Z', poll_count: 0 })) };
}

function ensureStore() { fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true }); if (!fs.existsSync(STORE_PATH)) fs.writeFileSync(STORE_PATH, JSON.stringify(seedStore(), null, 2)); }
function readStore() { ensureStore(); return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8')); }
function writeStore(store) { ensureStore(); const temp = `${STORE_PATH}.tmp`; fs.writeFileSync(temp, JSON.stringify(store, null, 2)); fs.renameSync(temp, STORE_PATH); }

export function listAvailablePlatforms() { return platforms.map((platform) => ({ ...platform, icon_url: `/platform-icons/${platform.id}.svg` })); }
export function listChannelWarehouses() { return warehouses; }
export function listConnectedChannels() { return readStore().channels.map(enrichChannel); }
export function getChannelPlatform(platformId) { return platforms.find((platform) => platform.id === platformId) || null; }
function enrichChannel(channel) { return { ...channel, warehouse: warehouses.find((item) => item.id === channel.physical_warehouse_id) || null }; }

export function connectChannel(input) {
  const platform = getChannelPlatform(input.platform);
  if (!platform) throw Object.assign(new Error('Unsupported channel platform.'), { statusCode: 400 });
  if (!input.store_name || !input.auth_code || !input.physical_warehouse_id) throw Object.assign(new Error('Store name, authorization, and warehouse mapping are required.'), { statusCode: 400 });
  if (!warehouses.some((warehouse) => warehouse.id === input.physical_warehouse_id)) throw Object.assign(new Error('Physical warehouse not found.'), { statusCode: 400 });
  const store = readStore();
  const channel = { id: `channel_${randomUUID()}`, platform: platform.id, name: platform.name, store_name: String(input.store_name).trim(), region: input.region || 'VN', type: platform.category === 'Marketplaces' ? 'Marketplace' : platform.category, status: 'INITIAL_SYNCING', synced_listings: 0, sync_progress: 8, physical_warehouse_id: input.physical_warehouse_id, sync_services: { price: input.sync_services?.price !== false, stock: input.sync_services?.stock !== false, orders: input.sync_services?.orders !== false }, is_default_pickup: Boolean(input.is_default_pickup), is_default_return: Boolean(input.is_default_return), catalog_strategy: input.catalog_strategy || 'AUTO_MATCH_SKU', errors: 0, last_sync_at: new Date().toISOString(), poll_count: 0 };
  store.channels.unshift(channel); writeStore(store); return enrichChannel(channel);
}

export function getChannelSyncStatus(id) {
  const store = readStore();
  const index = store.channels.findIndex((channel) => channel.id === id);
  if (index < 0) return null;
  const channel = store.channels[index];
  if (channel.status === 'INITIAL_SYNCING') {
    channel.poll_count = (channel.poll_count || 0) + 1;
    channel.sync_progress = Math.min(100, channel.sync_progress + 23 + channel.poll_count * 3);
    channel.synced_listings = Math.round(803 * (channel.sync_progress / 100));
    if (channel.sync_progress >= 100) { channel.sync_progress = 100; channel.synced_listings = 803; channel.status = 'CONNECTED'; channel.last_sync_at = new Date().toISOString(); }
    store.channels[index] = channel; writeStore(store);
  }
  return { id: channel.id, status: channel.status, synced_listings: channel.synced_listings, sync_progress: channel.sync_progress };
}
