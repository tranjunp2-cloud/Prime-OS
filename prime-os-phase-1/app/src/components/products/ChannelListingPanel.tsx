// Channel Listing Panel — marketplace channel management
import { useState } from 'react';
import { RefreshCw, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ChannelWordmark } from '@/components/system/ChannelBrand';
import type { ChannelListing } from '@/lib/product-store';
import { searchAmazonCatalog } from '@/lib/amazon-catalog';
import { CHANNEL_CONFIG } from '@/lib/constants';
import { useI18n } from '@/lib/i18n/I18nContext';
import { formatLocalizedDate } from '@/lib/i18n/format';

interface ChannelListingPanelProps {
  channels: ChannelListing[];
  onChannelsChange: (channels: ChannelListing[]) => void;
  disabled?: boolean;
}

function ChannelToggle({
  config,
  listing,
  onToggle,
  onUpdate,
}: {
  config: typeof CHANNEL_CONFIG[number];
  listing: ChannelListing | undefined;
  onToggle: () => void;
  onUpdate: (updated: Partial<ChannelListing>) => void;
}) {
  const { locale } = useI18n();
  const [syncing, setSyncing] = useState(false);
  const isActive = !!listing;
  const copy = {
    'en-US': {
      pending: 'Pending',
      syncFromAmazon: 'Sync from Amazon catalog',
      externalId: 'External ID',
      listingUrl: 'Listing URL',
      active: 'Active',
      pendingSync: 'Pending sync',
      synced: 'synced',
    },
    'ja-JP': {
      pending: '保留中',
      syncFromAmazon: 'Amazonカタログから同期',
      externalId: '外部ID',
      listingUrl: '出品URL',
      active: '有効',
      pendingSync: '同期待ち',
      synced: '同期日',
    },
    'vi-VN': {
      pending: 'Đang chờ',
      syncFromAmazon: 'Đồng bộ từ catalog Amazon',
      externalId: 'ID bên ngoài',
      listingUrl: 'URL gian hàng',
      active: 'Đang hoạt động',
      pendingSync: 'Chờ đồng bộ',
      synced: 'đã đồng bộ',
    },
  }[locale] ?? {
    pending: 'Pending',
    syncFromAmazon: 'Sync from Amazon catalog',
    externalId: 'External ID',
    listingUrl: 'Listing URL',
    active: 'Active',
    pendingSync: 'Pending sync',
    synced: 'synced',
  };

  async function handleSync() {
    if (config.key !== 'amazon') return;
    if (!listing?.external_id) return;

    setSyncing(true);
    try {
      const results = await searchAmazonCatalog(listing.external_id);
      // In production: map catalog result to product fields
      void results;
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className={`rounded-[1.1rem] border p-3 transition-colors ${isActive ? `${config.bg} ${config.border}` : 'border-border bg-background/50'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={onToggle}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 ${isActive ? 'bg-primary' : 'bg-muted-foreground/25 dark:bg-muted'}`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${isActive ? 'translate-x-5' : 'translate-x-0.5'}`}
            />
          </button>
          <div className="flex min-w-0 items-center gap-2">
            <ChannelWordmark channel={config.key} className="text-foreground" />
            <span className="rounded-full border border-border/70 bg-background/70 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
              {config.code}
            </span>
          </div>
          {isActive && (
            <Badge variant="outline" className={`text-xs ${config.text} border-current`}>
              {listing?.status === 'active' ? copy.active : copy.pending}
            </Badge>
          )}
        </div>
        {isActive && (
          <div className="flex gap-1">
            {config.key === 'amazon' && (
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={handleSync}
                disabled={syncing}
                title={copy.syncFromAmazon}
              >
                <RefreshCw className={`size-3 ${syncing ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
        )}
      </div>

      {isActive && (
        <div className="space-y-2 mt-2">
          <div>
            <Label className="text-xs text-muted-foreground">{copy.externalId}</Label>
            <Input
              value={listing?.external_id ?? ''}
              onChange={e => onUpdate({ external_id: e.target.value })}
              placeholder={config.placeholder}
              className="h-7 text-xs font-mono mt-1"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">{copy.listingUrl}</Label>
            <Input
              value={listing?.listing_url ?? ''}
              onChange={e => onUpdate({ listing_url: e.target.value })}
              placeholder="https://..."
              className="h-7 text-xs mt-1"
            />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {listing?.status === 'active'
              ? <CheckCircle2 className="size-3 text-emerald-500" />
              : <AlertCircle className="size-3 text-amber-500" />
            }
            <span>
              {listing?.status === 'active' ? copy.active : copy.pendingSync}
              {listing?.last_synced_at && ` · ${copy.synced} ${formatLocalizedDate(locale, listing.last_synced_at)}`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export function ChannelListingPanel({
  channels,
  onChannelsChange,
  disabled,
}: ChannelListingPanelProps) {
  const { locale } = useI18n();
  const copy = {
    'en-US': {
      title: 'Marketplace Channels',
      empty: 'Enable channels to list this product on marketplaces.',
    },
    'ja-JP': {
      title: 'マーケットプレイス連携',
      empty: 'この商品を各マーケットプレイスに出品するには、連携チャネルを有効にしてください。',
    },
    'vi-VN': {
      title: 'Kênh bán hàng',
      empty: 'Bật các kênh để niêm yết sản phẩm này lên marketplace.',
    },
  }[locale] ?? {
    title: 'Marketplace Channels',
    empty: 'Enable channels to list this product on marketplaces.',
  };

  function toggleChannel(key: 'rakuten' | 'shopee' | 'amazon' | 'website') {
    const existing = channels.find(c => c.channel === key);
    if (existing) {
      onChannelsChange(channels.filter(c => c.channel !== key));
    } else {
      onChannelsChange([
        ...channels,
        {
          channel: key,
          external_id: null,
          status: 'pending',
          listing_url: null,
          last_synced_at: null,
        },
      ]);
    }
  }

  function updateChannel(key: 'rakuten' | 'shopee' | 'amazon' | 'website', updated: Partial<ChannelListing>) {
    onChannelsChange(
      channels.map(c => c.channel === key ? { ...c, ...updated } : c)
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <ExternalLink className="size-4 text-primary" />
          {copy.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {CHANNEL_CONFIG.map(config => (
          <ChannelToggle
            key={config.key}
            config={config}
            listing={channels.find(c => c.channel === config.key)}
            onToggle={() => !disabled && toggleChannel(config.key)}
            onUpdate={updated => updateChannel(config.key, updated)}
          />
        ))}
        {channels.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">
            {copy.empty}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
