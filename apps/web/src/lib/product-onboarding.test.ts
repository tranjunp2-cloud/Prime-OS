import { describe, expect, it } from 'vitest';
import { productGettingStartedState, productIntroMode, suggestMasterSku, type ChannelSetupSnapshot } from './product-onboarding';
import type { ConnectedChannelRecord } from './channel-integrations-api';

const shop = (overrides: Partial<ConnectedChannelRecord> = {}) => ({ id: 'shop-1', status: 'CONNECTED', synced_listings: 0, ...overrides }) as ConnectedChannelRecord;
const state = (snapshot: ChannelSetupSnapshot, count = 0) => productGettingStartedState(snapshot, count);
describe('Product onboarding next step', () => {
  it('does not call a loading or failed shop empty', () => {
    expect(state({ status: 'loading', channels: [] }).kind).toBe('loading');
    expect(state({ status: 'loaded', channels: [shop({ status: 'INITIAL_SYNCING' })] }).kind).toBe('loading');
    expect(state({ status: 'error', channels: [] })).toMatchObject({ kind: 'error', action: 'Try again' });
  });
  it('offers connection recovery without blocking manual creation', () => {
    expect(state({ status: 'loaded', channels: [shop({ status: 'EXPIRED' })] }).kind).toBe('connection');
  });
  it('offers a first connection only after confirming no shops exist, even if prototype listings remain', () => {
    expect(state({ status: 'loaded', channels: [] }, 21)).toMatchObject({ kind: 'no-channels', action: 'Connect channel' });
    expect(state({ status: 'loading', channels: [] }).kind).toBe('loading');
    expect(state({ status: 'error', channels: [] }).kind).toBe('error');
  });
  it('keeps preview states deterministic without modifying the supplied connection snapshot', () => {
    const snapshot: ChannelSetupSnapshot = { status: 'loaded', channels: [shop()] };
    const before = JSON.stringify(snapshot);
    expect(productGettingStartedState(snapshot, 21, 'no-channels').kind).toBe('no-channels');
    expect(productGettingStartedState({ status: 'loading', channels: [] }, 21, 'no-products').kind).toBe('listings');
    expect(productGettingStartedState({ status: 'loaded', channels: [] }, 0, 'no-products').kind).toBe('empty');
    expect(JSON.stringify(snapshot)).toBe(before);
  });
  it('offers review only for available unconfirmed listing details', () => {
    expect(state({ status: 'loaded', channels: [shop()] }, 3)).toMatchObject({ kind: 'listings', action: 'Review shop listings' });
    expect(state({ status: 'loaded', channels: [shop({ synced_listings: 803 })] }).kind).toBe('reported');
    expect(state({ status: 'loaded', channels: [shop()] }).kind).toBe('empty');
  });
  it('shows onboarding only before the first Master, unless explicitly previewing', () => {
    expect(productIntroMode(0, false, false)).toBe('intro');
    expect(productIntroMode(1, false, false)).toBe('catalog');
    expect(productIntroMode(0, true, false)).toBe('empty');
    expect(productIntroMode(18, true, true)).toBe('intro');
  });
  it('generates an unused internal SKU without relying on shop codes', () => {
    expect(suggestMasterSku(['prd-0001', 'PRD-0002', 'SHP-15'])).toBe('PRD-0003');
  });
});
