import { useEffect, useState } from 'react';
import { CheckCircle2, Clock3, Package, ShoppingCart, Truck } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { FiltersBar } from '@/components/system/FiltersBar';
import { EmptyState } from '@/components/system/EmptyState';
import { PageHeader } from '@/components/system/PageHeader';
import { SummaryMetricCard } from '@/components/system/SummaryMetricCard';
import { OrdersTable } from '@/components/orders/OrdersTable';
import { Button } from '@/components/ui/button';
import { useInitialLoading } from '@/hooks/use-initial-loading';
import { useOrders, useOrderStatusCounts } from '@/hooks/use-orders';
import type { OrderListItem } from '@/components/orders/OrdersTable';
import type { OrderUiModel } from '@/lib/contracts/orders';
import { useI18n } from '@/lib/i18n/I18nContext';
import { formatMessage } from '@/lib/i18n/format';

function toOrderListItem(order: OrderUiModel): OrderListItem {
  return {
    id: order.id,
    order_id: order.display_order_id,
    order_date: order.order_date,
    customer_name: order.display_customer_name,
    channel: order.channel,
    total_amount: order.total_amount,
    status: order.status,
    lifecycle_stage: order.lifecycle_stage,
    risk_flags: order.risk_flags ?? [],
    tracking_number: order.display_tracking_number ?? undefined,
  };
}

function getTabCount(value: string, counts: Record<string, number>, total: number): number {
  if (value === '') return total;
  return counts[value] ?? 0;
}

export default function Orders() {
  const { locale, t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const statusTabs = [
    { value: '', label: t('orders.statusAll') },
    { value: 'pending', label: t('orders.statusPending') },
    { value: 'ready_to_ship', label: t('orders.statusReady') },
    { value: 'shipping', label: t('orders.statusShipping') },
    { value: 'completed', label: t('orders.statusCompleted') },
    { value: 'cancelled', label: t('orders.statusCancelled') },
    { value: 'returned', label: t('orders.statusReturned') },
  ];
  const initialFilter = searchParams.get('status') ?? '';
  const [filter, setFilter] = useState<string>(
    statusTabs.some((tab) => tab.value === initialFilter) ? initialFilter : '',
  );
  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const isInitialLoading = useInitialLoading();

  useEffect(() => {
    const nextParams = new URLSearchParams();
    if (filter) nextParams.set('status', filter);
    if (search.trim()) nextParams.set('q', search.trim());
    setSearchParams(nextParams, { replace: true });
  }, [filter, search, setSearchParams]);

  const { data: orders = [], isLoading } = useOrders({
    status: filter || undefined,
    search: search || undefined,
  });
  const { data: counts = {} } = useOrderStatusCounts({ search: search || undefined });

  const orderListItems = orders.map(toOrderListItem);
  const totalCount = counts['all'] ?? orders.length;
  const resultCount = search || filter
    ? formatMessage(t('orders.resultCount'), {
        count: orders.length,
        suffix: locale === 'en-US' && orders.length !== 1 ? 's' : '',
      })
    : undefined;

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      <PageHeader
        title={t('orders.pageTitle')}
        description={`${totalCount} · ${t('orders.pageDesc')}`}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryMetricCard
          label={t('orders.kpiTotalOrders')}
          value={totalCount}
          meta={t('orders.kpiTotalMeta')}
          icon={<Package className="size-4" />}
          tone="info"
        />
        <SummaryMetricCard
          label={t('orders.kpiPending')}
          value={counts.pending ?? 0}
          meta={t('orders.kpiPendingMeta')}
          icon={<Clock3 className="size-4" />}
          tone="warning"
        />
        <SummaryMetricCard
          label={t('orders.statusReady')}
          value={counts.ready_to_ship ?? 0}
          meta={t('orders.kpiReadyMeta')}
          icon={<CheckCircle2 className="size-4" />}
          tone="success"
        />
        <SummaryMetricCard
          label={t('orders.kpiShipping')}
          value={counts.shipping ?? 0}
          meta={t('orders.kpiShippingMeta')}
          icon={<Truck className="size-4" />}
          tone="teal"
        />
      </div>

      <FiltersBar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: t('orders.searchPlaceholder'),
          onClear: () => setSearch(''),
        }}
        primaryFilters={{
          value: filter,
          onChange: setFilter,
          options: statusTabs.map((tab) => ({
            value: tab.value,
            label: tab.label,
            count: getTabCount(tab.value, counts, totalCount),
          })),
        }}
        resultCount={resultCount}
        clearAll={search || filter ? () => {
          setSearch('');
          setFilter('');
        } : undefined}
      />

      {/* Data Table — unified component */}
      <OrdersTable
        orders={orderListItems}
        isLoading={isInitialLoading || isLoading}
        emptyState={!isInitialLoading && orders.length === 0 ? (
          <EmptyState
            title={search || filter ? t('orders.emptyFilteredTitle') : t('orders.emptyTitle')}
            description={search || filter
              ? t('orders.emptyFilteredDesc')
              : t('orders.emptyDesc')}
            icon={<ShoppingCart className="size-5" />}
            variant={search || filter ? 'filtered' : 'empty'}
            action={search || filter ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSearch('');
                  setFilter('');
                }}
              >
                {t('orders.clearFilters')}
              </Button>
            ) : undefined}
            className="min-h-[320px]"
          />
        ) : undefined}
      />
    </div>
  );
}
