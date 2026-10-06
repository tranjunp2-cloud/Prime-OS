// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { channelIntegrationsApi } from '@/lib/channel-integrations-api';
import { useProductChannelSetup } from './use-product-channel-setup';
vi.mock('@/lib/channel-integrations-api', () => ({ channelIntegrationsApi: { channels: vi.fn(), syncStatus: vi.fn() } }));
afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => vi.resetAllMocks());
describe('Read-only onboarding shop check', () => {
  it('does not fetch when the guide is closed', () => {
    renderHook(() => useProductChannelSetup(false));
    expect(channelIntegrationsApi.channels).not.toHaveBeenCalled();
  });
  it('retries a failed read and distinguishes zero shops from loading', async () => {
    vi.mocked(channelIntegrationsApi.channels).mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce({ data: [] });
    const { result } = renderHook(() => useProductChannelSetup(true));
    await waitFor(() => expect(result.current.snapshot.status).toBe('error'));
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.snapshot).toEqual({ status: 'loaded', channels: [] }));
  });
  it('checks sync progress without starting a sync and cancels polling when closed', async () => {
    vi.useFakeTimers();
    const channel = { id: 'new-shop', status: 'INITIAL_SYNCING', synced_listings: 0 };
    vi.mocked(channelIntegrationsApi.channels).mockResolvedValue({ data: [channel] } as never);
    vi.mocked(channelIntegrationsApi.syncStatus).mockResolvedValue({ id: channel.id, status: 'INITIAL_SYNCING', synced_listings: 10, sync_progress: 25 });
    const { result, unmount } = renderHook(() => useProductChannelSetup(true, 'new-shop'));
    await act(async () => {});
    expect(result.current.snapshot).toMatchObject({ status: 'loaded', channels: [{ synced_listings: 10 }] });
    expect(channelIntegrationsApi.syncStatus).toHaveBeenCalledWith('new-shop');
    unmount();
    await act(async () => { vi.advanceTimersByTime(15000); });
    expect(channelIntegrationsApi.channels).toHaveBeenCalledOnce();
  });
});
