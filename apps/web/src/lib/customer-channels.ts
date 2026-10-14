import type { OrderRecord } from './orders-api';
import { demoAvailablePlatforms, demoConnectedChannels } from './channel-integrations-demo';

export interface CustomerChannel {
  key: string;
  label: string;
  shops: string[];
}

function channelKey(value: string) {
  const key = value.toLowerCase().replace(/[^a-z0-9]/g, '');
  return ({ pos: 'primepos', tiktok: 'tiktokshop' } as Record<string, string>)[key] || key;
}

/** Use order snapshots; sample shop names must never be applied to real orders. */
export function customerChannels(orders: OrderRecord[]): CustomerChannel[] {
  const channels = new Map<string, CustomerChannel>();
  for (const order of orders) {
    const store = order.metadata.store.trim();
    const rawPlatform = order.metadata.platform?.trim() || store;
    const key = channelKey(rawPlatform) || 'unknown';
    const platform = demoAvailablePlatforms.find(item => channelKey(item.id) === key || channelKey(item.name) === key);
    const label = platform?.name || rawPlatform || 'Unknown channel';
    const demoShop = order.source === 'demo' ? demoConnectedChannels.find(item => channelKey(item.platform) === key)?.store_name : undefined;
    const shop = order.metadata.storeName?.trim()
      || (order.metadata.platform && store && channelKey(store) !== key ? store : '')
      || demoShop || 'Shop not provided';
    const channel = channels.get(key) || { key, label, shops: [] };
    if (!channel.shops.includes(shop)) channel.shops.push(shop);
    channels.set(key, channel);
  }
  return [...channels.values()];
}
