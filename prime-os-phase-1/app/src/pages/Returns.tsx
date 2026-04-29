import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/system/PageHeader';
import { FiltersBar } from '@/components/system/FiltersBar';
import { DataTable, type Column } from '@/components/system/DataTable';
import { ReturnStatusBadge } from '@/components/fulfillment/ReturnStatusBadge';
import { Badge } from '@/components/ui/badge';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useReturns } from '@/hooks/use-returns';
import type { ReturnUiModel } from '@/lib/contracts/returns';
import { buildListNavigationState } from '@/hooks/use-detail-navigation';
import { useI18n } from '@/lib/i18n/I18nContext';
import { formatMessage } from '@/lib/i18n/format';

export default function Returns() {
  const { t } = useI18n();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFilter = searchParams.get('status') ?? '';
  const [filter, setFilter] = useState(initialFilter);
  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const listNavigationState = buildListNavigationState(location.pathname, location.search, 'Returns');

  useEffect(() => {
    const nextParams = new URLSearchParams();
    if (filter) nextParams.set('status', filter);
    if (search.trim()) nextParams.set('q', search.trim());
    setSearchParams(nextParams, { replace: true });
  }, [filter, search, setSearchParams]);

  const { data: allReturns = [], isLoading } = useReturns();
  const normalizedSearch = search.trim().toLowerCase();

  const counts = allReturns.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = (acc[item.status] ?? 0) + 1;
    return acc;
  }, {});

  const returns = allReturns.filter((item) => {
    const filterMatch = !filter || item.status === filter;
    const searchMatch = !normalizedSearch || [
      item.display_rma,
      item.display_order_id,
      item.display_customer_name,
      item.display_reason,
    ].some((value) => (value ?? '').toLowerCase().includes(normalizedSearch));

    return filterMatch && searchMatch;
  });

  const columns: Column<ReturnUiModel>[] = [
    {
      header: t('returnsPage.colRma'),
      cell: (ret) => (
        <Link
          to={`/ecom/cos/returns/${ret.id}`}
          state={listNavigationState}
          className="font-mono text-sm font-semibold text-foreground transition-colors hover:text-primary hover:underline"
        >
          {ret.display_rma}
        </Link>
      ),
    },
    {
      header: t('returnsPage.colOrder'),
      cell: (ret) => <span className="text-sm">{ret.display_order_id ?? '—'}</span>,
    },
    {
      header: t('returnsPage.colReason'),
      className: 'max-w-[220px]',
      cell: (ret) => (
        <span className="block truncate text-sm text-muted-foreground">
          {ret.display_reason ?? '—'}
        </span>
      ),
    },
    {
      header: t('returnsPage.colStatus'),
      cell: (ret) => <ReturnStatusBadge status={ret.status} />,
    },
    {
      header: t('returnsPage.colGrade'),
      cell: (ret) => (
        ret.qc_grade ? (
          <Badge variant="outline" className="text-xs font-semibold">
            {ret.qc_grade}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )
      ),
    },
    {
      header: t('returnsPage.colDisposition'),
      cell: (ret) => <span className="text-sm text-muted-foreground">{ret.display_disposition ?? '—'}</span>,
    },
    {
      header: t('returnsPage.colRefund'),
      className: 'text-right',
      cell: (ret) => (
        <span className="block text-right text-sm font-medium">
          {ret.display_refund_amount}
        </span>
      ),
    },
    {
      header: t('returnsPage.colCreated'),
      cell: (ret) => <span className="text-sm text-muted-foreground">{ret.display_created_at}</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      <PageHeader title={t('returnsPage.pageTitle')} description={t('returnsPage.pageDesc')} />

      <FiltersBar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: t('returnsPage.searchPlaceholder'),
          onClear: () => setSearch(''),
        }}
        primaryFilters={{
          value: filter,
          onChange: setFilter,
          options: [
            { value: '', label: t('returnsPage.allStatuses'), count: allReturns.length },
            { value: 'approved', label: t('returnsPage.approved'), count: counts.approved ?? 0 },
            { value: 'received', label: t('returnsPage.received'), count: counts.received ?? 0 },
            { value: 'qc', label: t('returnsPage.inQc'), count: counts.qc ?? 0 },
            { value: 'completed', label: t('returnsPage.completed'), count: counts.completed ?? 0 },
          ],
        }}
        resultCount={search || filter ? formatMessage(t('returnsPage.resultCount'), {
          count: returns.length,
          suffix: returns.length !== 1 ? 's' : '',
        }) : undefined}
        clearAll={search || filter ? () => {
          setSearch('');
          setFilter('');
        } : undefined}
      />

      <DataTable
        columns={columns}
        data={returns}
        keyExtractor={(ret) => ret.id}
        isLoading={isLoading}
        rowHref={(ret) => `/ecom/cos/returns/${ret.id}`}
        rowState={() => listNavigationState}
        rowLabel={(ret) => formatMessage(t('returnsPage.openReturn'), { id: ret.rma_number ?? ret.id })}
        emptyTitle={search || filter ? t('returnsPage.filteredEmptyTitle') : t('returnsPage.emptyTitle')}
        emptyDescription={search || filter
          ? t('returnsPage.filteredEmptyDesc')
          : t('returnsPage.emptyDesc')}
        emptyVariant={search || filter ? 'filtered' : 'empty'}
      />
    </div>
  );
}
