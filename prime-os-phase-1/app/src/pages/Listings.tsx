import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, FileText, Globe2, Plus } from 'lucide-react';
import { ChannelBadge } from '@/components/system/ChannelBadge';
import { DataTable, type Column } from '@/components/system/DataTable';
import { FiltersBar } from '@/components/system/FiltersBar';
import { PageHeader } from '@/components/system/PageHeader';
import { SkuBadge } from '@/components/system/SkuBadge';
import { StatusBadge } from '@/components/system/StatusBadge';
import { SummaryMetricCard } from '@/components/system/SummaryMetricCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getChannelMeta } from '@/components/system/semantic-helpers';
import { useListings } from '@/hooks/use-listings';
import type { ListingUiModel } from '@/lib/contracts/listings';
import { useI18n } from '@/lib/i18n/I18nContext';
import { formatMessage } from '@/lib/i18n/format';

const CHANNELS = ['rakuten', 'shopee', 'amazon', 'website'] as const;

export default function Listings() {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState<string>('');

  const { data: listings = [] } = useListings();

  const query = search.trim().toLowerCase();
  const hasActiveFilters = Boolean(query || channelFilter);

  const filtered = listings.filter((listing) => {
    const channelMatch = !channelFilter || listing.channel === channelFilter;
    const searchMatch = !query || [
      listing.display_channel_sku,
      listing.display_channel_product_id,
      listing.display_title,
      listing.display_product_name,
      listing.channel,
    ].some((value) => (value ?? '').toLowerCase().includes(query));

    return channelMatch && searchMatch;
  });

  const channelCounts = CHANNELS.reduce<Record<string, number>>((acc, channel) => {
    acc[channel] = listings.filter((listing) => listing.channel === channel).length;
    return acc;
  }, {} as Record<string, number>);

  const statusCounts = listings.reduce<Record<string, number>>((acc, listing) => {
    acc[listing.status] = (acc[listing.status] ?? 0) + 1;
    return acc;
  }, {});

  const summaryCards = [
    {
      label: t('listings.totalListings'),
      value: listings.length,
      meta: formatMessage(t('listings.totalListingsMeta'), { count: CHANNELS.length }),
      icon: <Globe2 className="size-4" />,
      tone: 'info' as const,
    },
    {
      label: t('listings.published'),
      value: statusCounts.published ?? 0,
      meta: t('listings.publishedMeta'),
      icon: <CheckCircle2 className="size-4" />,
      tone: 'success' as const,
    },
    {
      label: t('listings.draft'),
      value: statusCounts.draft ?? 0,
      meta: t('listings.draftMeta'),
      icon: <FileText className="size-4" />,
      tone: 'muted' as const,
    },
    {
      label: t('listings.needsAttention'),
      value: (statusCounts.paused ?? 0) + (statusCounts.error ?? 0),
      meta: t('listings.needsAttentionMeta'),
      icon: <AlertTriangle className="size-4" />,
      tone: 'danger' as const,
    },
  ];

  const columns: Column<ListingUiModel>[] = [
    {
      header: t('listings.colProduct'),
      className: 'min-w-[220px]',
      cell: (listing) => (
        <div className="flex flex-col gap-0.5">
          {listing.product_id ? (
            <Link
              to={`/ecom/cos/product-master/${listing.product_id}`}
              className="truncate text-sm font-medium text-foreground transition-colors hover:text-primary hover:underline"
            >
              {listing.display_product_name}
            </Link>
          ) : (
            <span className="truncate text-sm font-medium text-foreground">{listing.display_product_name}</span>
          )}
          <span className="truncate text-xs text-muted-foreground">
            {listing.display_title}
          </span>
        </div>
      ),
    },
    {
      header: t('listings.colSku'),
      width: '164px',
      cell: (listing) => (
        <SkuBadge sku={listing.display_channel_sku} size="compact" />
      ),
    },
    {
      header: t('listings.colChannel'),
      width: '120px',
      cell: (listing) => <ChannelBadge platform={listing.channel} />,
    },
    {
      header: t('listings.colChannelId'),
      className: 'min-w-[160px]',
      cell: (listing) => (
        <span className="block truncate font-mono text-xs text-muted-foreground">
          {listing.display_channel_product_id}
        </span>
      ),
    },
    {
      header: t('listings.colPrice'),
      className: 'text-right',
      width: '130px',
      cell: (listing) => (
        <span className="block text-right font-mono text-sm font-medium">
          {listing.display_price}
        </span>
      ),
    },
    {
      header: t('listings.colStatus'),
      width: '120px',
      cell: (listing) => <StatusBadge status={listing.status} domain="listing" />,
    },
    {
      header: t('listings.colPublished'),
      width: '120px',
      cell: (listing) => <span className="text-sm text-muted-foreground">{listing.display_published_at}</span>,
    },
    {
      header: t('listings.colLastSynced'),
      width: '120px',
      cell: (listing) => <span className="text-sm text-muted-foreground">{listing.display_last_synced_at}</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      <PageHeader
        title={t('listings.pageTitle')}
        description={formatMessage(t('listings.pageDesc'), { count: listings.length, channels: CHANNELS.length })}
        actions={<Button><Plus className="mr-2 size-4" />{t('listings.newListing')}</Button>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <SummaryMetricCard
            key={card.label}
            label={card.label}
            value={card.value}
            meta={card.meta}
            icon={card.icon}
            tone={card.tone}
          />
        ))}
      </div>

      <FiltersBar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: t('listings.searchPlaceholder'),
          onClear: () => setSearch(''),
        }}
        primaryFilters={{
          value: channelFilter,
          onChange: setChannelFilter,
          options: [
            { value: '', label: t('listings.allChannels'), count: listings.length },
            ...CHANNELS.map((channel) => ({
              value: channel,
              label: getChannelMeta(channel).label,
              count: channelCounts[channel] ?? 0,
            })),
          ],
        }}
        resultCount={hasActiveFilters ? formatMessage(t('listings.resultCount'), {
          count: filtered.length,
          suffix: filtered.length !== 1 ? 's' : '',
        }) : undefined}
        clearAll={hasActiveFilters ? () => {
          setSearch('');
          setChannelFilter('');
        } : undefined}
      />

      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Globe2 className="size-4 text-muted-foreground" />
          <h2 className="text-base font-semibold">{t('listings.sectionTitle')}</h2>
        </div>
        <DataTable
          columns={columns}
          data={filtered}
          keyExtractor={(listing) => listing.id}
          emptyTitle={hasActiveFilters ? t('listings.filteredEmptyTitle') : t('listings.emptyTitle')}
          emptyDescription={hasActiveFilters
            ? t('listings.filteredEmptyDesc')
            : t('listings.emptyDesc')}
          emptyVariant={hasActiveFilters ? 'filtered' : 'empty'}
        />
      </div>
    </div>
  );
}
