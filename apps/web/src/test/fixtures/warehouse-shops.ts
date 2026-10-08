import type { ConnectedChannelRecord } from '@/lib/channel-integrations-api';

/** Matches the connected shops shipped by the prototype API, including warehouse aliases. */
export const warehouseDemoShops: ConnectedChannelRecord[] = [
  ['amazon', 'Amazon', 'Prime Beauty US', 'wh_crossborder_01'],
  ['rakuten', 'Rakuten', 'Prime Beauty JP', 'wh_crossborder_01'],
  ['shopee', 'Shopee', 'Prime Beauty Official', 'wh_hcm_01'],
  ['lazada', 'Lazada', 'Prime Flagship Store', 'wh_hn_01'],
].map(([platform, name, store_name, warehouse]) => ({ id: `channel_${platform}`, platform, name, store_name,
  region: platform === 'amazon' ? 'US' : 'JP', type: 'Marketplace', status: 'CONNECTED', synced_listings: 10,
  sync_progress: 100, errors: 0, last_sync_at: '', sync_services: { price: true, stock: platform !== 'amazon', orders: true },
  warehouse: { id: warehouse, name: warehouse, code: warehouse, city: '' } }));
