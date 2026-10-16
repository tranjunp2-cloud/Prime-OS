import { describe, expect, it } from 'vitest';
import { LISTING_DESTINATIONS } from './channel-listing-destinations';
import { demoConnectedChannels } from './channel-integrations-demo';
import { getCatalogImportItems } from './catalog-import-store';

const platformKey = (value: string) => ({ website: 'primeweb', webstore: 'primeweb', tiktok: 'tiktok_shop', pos: 'primepos' } as Record<string, string>)[value] || value;

describe('coherent sales channel demo records', () => {
  it('uses one connected shop per platform and matches every product import source', () => {
    const connected = new Map(demoConnectedChannels.map(item => [item.platform, item.store_name]));
    expect(connected.size).toBe(demoConnectedChannels.length);
    for (const item of getCatalogImportItems()) {
      expect(connected.get(platformKey(item.channel))).toBe(item.storeName);
    }
  });

  it('uses the connected shop identity in listing destinations', () => {
    for (const destination of LISTING_DESTINATIONS.filter(item => item.connectionStatus !== 'not_connected')) {
      const account = demoConnectedChannels.find(item => item.platform === platformKey(destination.key))?.store_name;
      expect(account, destination.label).toBeTruthy();
      expect(destination.account).toContain(account!);
    }
  });
});
