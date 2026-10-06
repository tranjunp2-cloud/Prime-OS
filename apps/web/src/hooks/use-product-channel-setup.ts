import { useCallback, useEffect, useState } from 'react';
import { channelIntegrationsApi } from '@/lib/channel-integrations-api';
import type { ChannelSetupSnapshot } from '@/lib/product-onboarding';

/** Read only. Opening the guide never starts a sync or changes a shop. */
export function useProductChannelSetup(enabled: boolean, shopId?: string | null) {
  const [snapshot, setSnapshot] = useState<ChannelSetupSnapshot>({ status: 'loading', channels: [] });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt(value => value + 1), []);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setSnapshot({ status: 'loading', channels: [] });
    const load = async () => {
      try {
        const response = await channelIntegrationsApi.channels();
        const scoped = shopId ? response.data.filter(channel => channel.id === shopId) : response.data;
        if (cancelled) return;
        const channels = await Promise.all(scoped.map(async channel => channel.status === 'INITIAL_SYNCING'
          ? { ...channel, ...await channelIntegrationsApi.syncStatus(channel.id) } : channel));
        if (shopId && channels.length === 0) throw new Error('Shop not available');
        if (cancelled) return;
        setSnapshot({ status: 'loaded', channels });
        if (channels.some(channel => channel.status === 'INITIAL_SYNCING')) timer = setTimeout(load, 5000);
      } catch {
        if (!cancelled) setSnapshot({ status: 'error', channels: [] });
      }
    };
    void load();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [enabled, shopId, attempt]);
  return { snapshot, retry };
}
