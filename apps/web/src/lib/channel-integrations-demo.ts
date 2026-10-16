import type { AvailablePlatform, ChannelWarehouse, ConnectChannelPayload, ConnectedChannelRecord } from './channel-integrations-api';

const warehouses: Record<string, ChannelWarehouse> = {
  hcm: { id: 'wh_hcm_01', name: 'HCM Central', code: 'HCM-CENTRAL', city: 'Ho Chi Minh City' },
  hanoi: { id: 'wh_hn_01', name: 'Hanoi Hub', code: 'HN-HUB', city: 'Hanoi' },
  crossBorder: { id: 'wh_crossborder_01', name: 'Cross-border DC', code: 'CBD-01', city: 'Ho Chi Minh City' },
  districtOne: { id: 'wh_d1_01', name: 'D1 Flagship Store', code: 'D1-POS', city: 'Ho Chi Minh City' },
};

export const demoChannelWarehouses = Object.values(warehouses);

export const demoAvailablePlatforms: AvailablePlatform[] = [
  { id: 'shopee', name: 'Shopee', category: 'Marketplaces', auth_type: 'OAUTH2', color: '#EE4D2D', icon_url: '/platform-icons/shopee.svg', regions: ['VN', 'SG', 'TH', 'MY'] },
  { id: 'lazada', name: 'Lazada', category: 'Marketplaces', auth_type: 'OAUTH2', color: '#6C2CFF', icon_url: '/platform-icons/lazada.svg', regions: ['VN', 'SG', 'TH', 'MY'] },
  { id: 'tiktok_shop', name: 'TikTok Shop', category: 'Marketplaces', auth_type: 'OAUTH2', color: '#111827', icon_url: '/platform-icons/tiktok_shop.svg', regions: ['VN', 'SG', 'TH', 'MY', 'US'] },
  { id: 'amazon', name: 'Amazon', category: 'Marketplaces', auth_type: 'OAUTH2', color: '#111827', icon_url: '/platform-icons/amazon.svg', regions: ['SG', 'US'] },
  { id: 'rakuten', name: 'Rakuten', category: 'Marketplaces', auth_type: 'API_KEY', color: '#BF0000', icon_url: '/platform-icons/rakuten.svg', regions: ['SG', 'US'] },
  { id: 'primeweb', name: 'PrimeWeb', category: 'E-Commerce/Web', auth_type: 'API_KEY', color: '#4F46E5', icon_url: '/platform-icons/primeweb.svg', regions: ['VN', 'SG', 'TH', 'MY', 'US'] },
  { id: 'woocommerce', name: 'WooCommerce', category: 'E-Commerce/Web', auth_type: 'API_KEY', color: '#96588A', icon_url: '/platform-icons/woocommerce.svg', regions: ['VN', 'SG', 'TH', 'MY', 'US'] },
  { id: 'shopify', name: 'Shopify', category: 'E-Commerce/Web', auth_type: 'OAUTH2', color: '#95BF47', icon_url: '/platform-icons/shopify.svg', regions: ['VN', 'SG', 'TH', 'MY', 'US'] },
  { id: 'primepos', name: 'PrimePOS', category: 'Retail POS', auth_type: 'API_KEY', color: '#059669', icon_url: '/platform-icons/primepos.svg', regions: ['VN', 'SG', 'TH', 'MY', 'US'] },
  { id: 'facebook', name: 'Facebook Shop', category: 'Social', auth_type: 'OAUTH2', color: '#1877F2', icon_url: '/platform-icons/facebook.svg', regions: ['VN', 'SG', 'TH', 'MY', 'US'] },
  { id: 'instagram', name: 'Instagram Shopping', category: 'Social', auth_type: 'OAUTH2', color: '#C13584', icon_url: '/platform-icons/instagram.svg', regions: ['VN', 'SG', 'TH', 'MY', 'US'] },
];

type DemoChannel = Omit<ConnectedChannelRecord, 'id' | 'sync_progress' | 'last_sync_at'> & {
  sync_progress?: number;
  last_sync_at?: string;
};

function channel(input: DemoChannel): ConnectedChannelRecord {
  return {
    ...input,
    id: `channel_${input.platform}`,
    sync_progress: input.sync_progress ?? (input.status === 'CONNECTED' ? 100 : 0),
    last_sync_at: input.last_sync_at ?? '2026-10-13T05:42:00.000Z',
  };
}

/** Read-only fallback used when an unauthenticated prototype preview cannot reach the demo API. */
export const demoConnectedChannels: ConnectedChannelRecord[] = [
  channel({ platform: 'primeweb', name: 'PrimeWeb', store_name: 'primebeauty.vn', region: 'VN', type: 'E-Commerce/Web', status: 'CONNECTED', synced_listings: 1240, warehouse: warehouses.hcm, sync_services: { price: true, stock: true, orders: true }, errors: 0 }),
  channel({ platform: 'shopee', name: 'Shopee', store_name: 'Prime Beauty Official', region: 'VN', type: 'Marketplace', status: 'CONNECTED', synced_listings: 1186, warehouse: warehouses.hcm, sync_services: { price: true, stock: true, orders: true }, errors: 0 }),
  channel({ platform: 'lazada', name: 'Lazada', store_name: 'Prime Flagship Store', region: 'VN', type: 'Marketplace', status: 'EXPIRED', synced_listings: 972, warehouse: warehouses.hanoi, sync_services: { price: false, stock: false, orders: false }, errors: 3, last_sync_at: '2026-10-12T02:15:00.000Z' }),
  channel({ platform: 'amazon', name: 'Amazon', store_name: 'Prime Beauty US', region: 'US', type: 'Marketplace', status: 'SYNC_ERROR', synced_listings: 684, warehouse: warehouses.crossBorder, sync_services: { price: true, stock: false, orders: true }, errors: 5, last_sync_at: '2026-10-13T03:20:00.000Z' }),
  channel({ platform: 'rakuten', name: 'Rakuten', store_name: 'Prime Beauty JP', region: 'JP', type: 'Marketplace', status: 'CONNECTED', synced_listings: 416, warehouse: warehouses.crossBorder, sync_services: { price: true, stock: true, orders: true }, errors: 0 }),
  channel({ platform: 'primepos', name: 'PrimePOS', store_name: 'District 1 Flagship', region: 'VN', type: 'Retail POS', status: 'CONNECTED', synced_listings: 1240, warehouse: warehouses.districtOne, sync_services: { price: true, stock: true, orders: true }, errors: 0 }),
  channel({ platform: 'tiktok_shop', name: 'TikTok Shop', store_name: 'Prime Live Store', region: 'VN', type: 'Marketplace', status: 'SYNC_ERROR', synced_listings: 803, warehouse: null, sync_services: { price: true, stock: false, orders: true }, errors: 4, last_sync_at: '2026-10-13T04:05:00.000Z' }),
];

export function createDemoConnectedChannel(input: ConnectChannelPayload): ConnectedChannelRecord {
  const platform = demoAvailablePlatforms.find(item => item.id === input.platform)!;
  return {
    id: `channel_demo_${input.platform}_${Date.now()}`,
    platform: platform.id,
    name: platform.name,
    store_name: input.store_name,
    region: input.region,
    type: platform.category === 'Marketplaces' ? 'Marketplace' : platform.category,
    status: 'CONNECTED',
    synced_listings: 0,
    sync_progress: 100,
    warehouse: demoChannelWarehouses.find(item => item.id === input.physical_warehouse_id) ?? null,
    sync_services: input.sync_services,
    errors: 0,
    last_sync_at: new Date().toISOString(),
  };
}
