import { type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChannelBadge } from '@/components/system/ChannelBadge';
import { OrderStatusBadge } from './OrderStatusBadge';
import { LifecycleStageBadge } from './LifecycleStageBadge';
import { AlertTriangle } from 'lucide-react';
import { DataTable, type Column } from '@/components/system/DataTable';
import type { OrderStatus, Channel } from '@/lib/oms-types';
import { useI18n } from '@/lib/i18n/I18nContext';
import { buildListNavigationState } from '@/hooks/use-detail-navigation';
import { formatLocalizedDate, formatLocalizedMoney } from '@/lib/i18n/format';

export interface OrderListItem {
  id: string;
  order_id: string;
  order_date: string;
  customer_name: string | null;
  channel: Channel;
  total_amount: number;
  status: OrderStatus;
  lifecycle_stage?: string;
  risk_flags?: string[];
  tracking_number?: string | null;
}

interface OrdersTableProps {
  orders: OrderListItem[];
  isLoading: boolean;
  emptyState?: ReactNode;
}

export function OrdersTable({ orders, isLoading, emptyState }: OrdersTableProps) {
  const { locale, t } = useI18n();
  const location = useLocation();
  const listNavigationState = buildListNavigationState(location.pathname, location.search, t('orders.pageTitle'));

  const columns: Column<OrderListItem>[] = [
    {
      header: t('orders.colOrderId'),
      className: 'min-w-[220px]',
      cell: (order) => (
        <div className="flex items-center gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Link
                to={`/ecom/cos/oms/${order.id}`}
                state={listNavigationState}
                className="truncate text-sm font-semibold text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                onClick={(event) => event.stopPropagation()}
              >
                {order.order_id}
              </Link>
              {order.risk_flags && order.risk_flags.length > 0 && (
                <AlertTriangle className="size-4 text-destructive" />
              )}
            </div>
            <div className="mt-1 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              {formatLocalizedDate(locale, order.order_date)}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: t('orders.colCustomer'),
      className: 'min-w-[220px]',
      cell: (order) => order.customer_name ?? '—',
    },
    {
      header: t('orders.colChannel'),
      className: 'min-w-[160px]',
      cell: (order) => <ChannelBadge platform={order.channel} />,
    },
    {
      header: t('orders.colTotal'),
      className: 'min-w-[140px] text-right',
      cell: (order) => (
        <span className="font-medium">{formatLocalizedMoney(locale, order.total_amount, 'JPY')}</span>
      ),
    },
    {
      header: t('orders.colStatus'),
      className: 'min-w-[260px]',
      cell: (order) => (
        <div className="flex items-center gap-2 whitespace-nowrap">
          <OrderStatusBadge status={order.status} />
          {order.lifecycle_stage && (
            <LifecycleStageBadge stage={order.lifecycle_stage as import('@/lib/oms-types').LifecycleStage} className="text-xs" />
          )}
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={orders}
      keyExtractor={(item) => item.id}
      isLoading={isLoading}
      emptyState={emptyState}
      rowHref={(item) => `/ecom/cos/oms/${item.id}`}
      rowState={() => listNavigationState}
      rowLabel={(item) => `${t('common.viewDetails')}: ${item.order_id}`}
      variant="index"
      wrapperClassName="[&_table]:min-w-[1040px]"
      emptyTitle={t('orders.emptyFilteredTitle')}
      emptyDescription={t('orders.emptyFilteredDesc')}
      emptyVariant="filtered"
    />
  );
}
