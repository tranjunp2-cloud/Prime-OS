import { describe, expect, it } from 'vitest';
import { customerChannels } from './customer-channels';
import type { OrderRecord } from './orders-api';

function order(store: string, source = 'demo', metadata = {}): OrderRecord {
  return { source, metadata: { store, ...metadata } } as OrderRecord;
}

describe('customer channel logos and shop names', () => {
  it('reuses sample shop names and deduplicates repeated orders per channel', () => {
    expect(customerChannels([order('Shopee'), order('Shopee'), order('TikTok Shop')])).toEqual([
      { key: 'shopee', label: 'Shopee', shops: ['Prime Beauty Official'] },
      { key: 'tiktokshop', label: 'TikTok Shop', shops: ['Prime Live Store'] },
    ]);
  });
  it('keeps all distinct shop snapshots on the same channel', () => {
    expect(customerChannels([
      order('Shopee', 'api', { storeName: 'Shop A' }),
      order('Shop B', 'api', { platform: 'shopee' }),
      order('Shopee', 'api', { storeName: 'Shop A' }),
    ])).toEqual([{ key: 'shopee', label: 'Shopee', shops: ['Shop A', 'Shop B'] }]);
  });
  it('does not guess missing shops or substitute demo shops for real orders', () => {
    expect(customerChannels([order('Shopee', 'api'), order('', 'manual')])).toEqual([
      { key: 'shopee', label: 'Shopee', shops: ['Shop not provided'] },
      { key: 'unknown', label: 'Unknown channel', shops: ['Shop not provided'] },
    ]);
  });
  it('prefers explicit shop names to the demo fallback and recognizes channel aliases', () => {
    expect(customerChannels([order('pos', 'demo', { storeName: 'Custom POS Shop' })])).toEqual([
      { key: 'primepos', label: 'PrimePOS', shops: ['Custom POS Shop'] },
    ]);
  });
});
