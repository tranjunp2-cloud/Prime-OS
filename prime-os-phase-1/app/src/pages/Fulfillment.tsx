import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowUpRight, Clock3, Package, Truck } from 'lucide-react';
import { FlowTypeBadge } from '@/components/fulfillment/FlowTypeBadge';
import { JobStatusBadge } from '@/components/fulfillment/JobStatusBadge';
import { ShipmentStatusBadge } from '@/components/fulfillment/ShipmentStatusBadge';
import { DataTable, type Column } from '@/components/system/DataTable';
import { FiltersBar } from '@/components/system/FiltersBar';
import { PageHeader } from '@/components/system/PageHeader';
import { PriorityBadge } from '@/components/system/PriorityBadge';
import { SlaIndicator } from '@/components/system/SlaIndicator';
import { SummaryMetricCard } from '@/components/system/SummaryMetricCard';
import { Badge } from '@/components/ui/badge';
import { CARRIER_COLORS } from '@/lib/constants';
import { useFulfillmentJobs } from '@/hooks/use-fulfillment-jobs';
import type { FulfillmentJobUiModel } from '@/lib/contracts/fulfillment';
import {
  getExceptionsByJobId,
  type FlowType,
} from '@/lib/fulfillment-store';
import {
  CARRIER_LABELS,
  type CarrierCode,
  EXCEPTION_SEVERITY_COLORS,
  FBA_INBOUND_STATUS_COLORS,
  FBA_INBOUND_STATUS_LABELS,
  FBA_PREP_STATUS_COLORS,
  FBA_PREP_STATUS_LABELS,
  FLOW_TYPE_LABELS,
  JOB_STATUS_LABELS,
} from '@/lib/fulfillment-types';
import {
  formatFulfillmentDateTime,
  getFulfillmentSlaState,
  getFulfillmentSlaTextClassName,
  isDateToday,
} from '@/lib/fulfillment-sla';
import { buildListNavigationState } from '@/hooks/use-detail-navigation';
import { useI18n } from '@/lib/i18n/I18nContext';
import { formatMessage } from '@/lib/i18n/format';

const ACTIVE_STATUS_FILTERS = ['pending', 'picking', 'packed', 'shipped', 'done', 'exception'] as const;
const STATUS_FILTERS = ['', ...ACTIVE_STATUS_FILTERS] as const;
const FLOW_FILTERS = ['seller_fulfilled', 'marketplace_observer', 'third_party_3pl', 'fba'] as const;

const EXCEPTION_SEVERITY_LABELS = {
  low: 'Low',
  med: 'Medium',
  high: 'High',
} as const;

const EXCEPTION_SEVERITY_WEIGHT = {
  low: 0,
  med: 1,
  high: 2,
} as const;

interface FulfillmentRow {
  job: FulfillmentJobUiModel;
  slaState: ReturnType<typeof getFulfillmentSlaState>;
  exceptionCount: number;
  highestExceptionSeverity: 'low' | 'med' | 'high' | null;
}

function getCarrierLabel(carrier: FulfillmentJobUiModel['carrier']): string | null {
  if (!carrier) return null;
  return carrier in CARRIER_LABELS ? CARRIER_LABELS[carrier as CarrierCode] : carrier;
}

function getCarrierClassName(label: string | null): string {
  return label ? (CARRIER_COLORS[label] ?? 'bg-muted text-muted-foreground') : 'bg-muted text-muted-foreground';
}

function getExceptionSignal(jobId: string) {
  const unresolvedExceptions = getExceptionsByJobId(jobId).filter((exception) => !exception.resolved_at);
  const highestSeverity = unresolvedExceptions.reduce<'low' | 'med' | 'high' | null>((current, exception) => {
    if (!current) return exception.severity;
    return EXCEPTION_SEVERITY_WEIGHT[exception.severity] > EXCEPTION_SEVERITY_WEIGHT[current]
      ? exception.severity
      : current;
  }, null);

  return {
    count: unresolvedExceptions.length,
    highestSeverity,
  };
}

export default function Fulfillment() {
  const { locale } = useI18n();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus = searchParams.get('status') ?? '';
  const initialFlow = searchParams.get('flow') ?? '';
  const [jobFilter, setJobFilter] = useState<(typeof STATUS_FILTERS)[number]>(
    STATUS_FILTERS.includes(initialStatus as (typeof STATUS_FILTERS)[number])
      ? initialStatus as (typeof STATUS_FILTERS)[number]
      : '',
  );
  const [flowFilter, setFlowFilter] = useState<FlowType | ''>(
    FLOW_FILTERS.includes(initialFlow as FlowType)
      ? initialFlow as FlowType
      : '',
  );
  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const copy = {
    pageTitle: locale === 'ja-JP' ? 'フルフィルメントジョブ' : locale === 'vi-VN' ? 'Công việc fulfillment' : 'Fulfillment Jobs',
    pageDesc: locale === 'ja-JP' ? '{count} 件のジョブ' : locale === 'vi-VN' ? '{count} job' : '{count} job{suffix}',
    searchPlaceholder: locale === 'ja-JP' ? 'ジョブコード、注文番号、出荷情報で検索...' : locale === 'vi-VN' ? 'Tìm theo mã job, mã đơn hoặc shipment...' : 'Search by job code, order #, or shipment...',
    all: locale === 'ja-JP' ? 'すべて' : locale === 'vi-VN' ? 'Tất cả' : 'All',
    allFlows: locale === 'ja-JP' ? 'すべてのフロー' : locale === 'vi-VN' ? 'Tất cả luồng' : 'All Flows',
    matchingJobs: locale === 'ja-JP' ? '{count} 件の該当ジョブ' : locale === 'vi-VN' ? '{count} job phù hợp' : '{count} matching job{suffix}',
    pendingJobs: locale === 'ja-JP' ? '保留ジョブ' : locale === 'vi-VN' ? 'Job đang chờ' : 'Pending Jobs',
    pendingMeta: locale === 'ja-JP' ? 'ピッキング開始待ち' : locale === 'vi-VN' ? 'Chờ bắt đầu picking' : 'Awaiting pick start',
    pickingPacked: locale === 'ja-JP' ? 'ピッキング / 梱包中' : locale === 'vi-VN' ? 'Picking / Packed' : 'Picking/Packed',
    pickingPackedMeta: locale === 'ja-JP' ? '現場で進行中の作業量' : locale === 'vi-VN' ? 'Khối lượng vận hành đang chạy' : 'Active floor workload',
    shippedToday: locale === 'ja-JP' ? '本日出荷' : locale === 'vi-VN' ? 'Đã ship hôm nay' : 'Shipped Today',
    shippedMeta: locale === 'ja-JP' ? '出荷タイムスタンプ基準' : locale === 'vi-VN' ? 'Dựa trên timestamp shipped' : 'Based on shipped timestamp',
    exceptions: locale === 'ja-JP' ? '例外' : locale === 'vi-VN' ? 'Ngoại lệ' : 'Exceptions',
    exceptionMeta: locale === 'ja-JP' ? 'オペレーター対応が必要' : locale === 'vi-VN' ? 'Cần operator xử lý' : 'Need operator attention',
    noActiveIncidents: locale === 'ja-JP' ? 'アクティブな障害なし' : locale === 'vi-VN' ? 'Không có incident đang mở' : 'No active incidents',
    operationsQueue: locale === 'ja-JP' ? 'オペレーションキュー' : locale === 'vi-VN' ? 'Hàng đợi vận hành' : 'Operations Queue',
    recentShipments: locale === 'ja-JP' ? '最近の出荷' : locale === 'vi-VN' ? 'Shipment gần đây' : 'Recent Shipments',
    noJobsFiltered: locale === 'ja-JP' ? 'この条件に一致するジョブはありません' : locale === 'vi-VN' ? 'Không có job nào khớp bộ lọc này' : 'No fulfillment jobs match this view',
    noJobsFilteredDesc: locale === 'ja-JP' ? 'ステータス、フロー、検索条件を調整してください。' : locale === 'vi-VN' ? 'Hãy chỉnh bộ lọc trạng thái, luồng hoặc tìm kiếm.' : 'Adjust the current status, flow, or search filters to broaden the queue.',
    noJobs: locale === 'ja-JP' ? 'フルフィルメントジョブはまだありません' : locale === 'vi-VN' ? 'Chưa có fulfillment job nào' : 'No fulfillment jobs yet',
    noJobsDesc: locale === 'ja-JP' ? '注文がオペレーションに引き渡されると、ここに表示されます。' : locale === 'vi-VN' ? 'Fulfillment job sẽ xuất hiện ở đây sau khi đơn được release sang vận hành.' : 'Fulfillment jobs will appear here once orders are released to operations.',
    noShipments: locale === 'ja-JP' ? 'このビューに最近の出荷はありません' : locale === 'vi-VN' ? 'Không có shipment gần đây trong màn hiện tại' : 'No recent shipments in this view',
    noShipmentsDesc: locale === 'ja-JP' ? 'shipped または done のジョブがここに表示されます。' : locale === 'vi-VN' ? 'Các job ở trạng thái shipped hoặc done sẽ xuất hiện ở đây.' : 'Jobs marked shipped or done will appear here with carrier and SLA context.',
    standardHandling: locale === 'ja-JP' ? '標準処理' : locale === 'vi-VN' ? 'Xử lý tiêu chuẩn' : 'Standard handling',
    issue: locale === 'ja-JP' ? '件の課題' : locale === 'vi-VN' ? 'vấn đề' : 'issue',
    issues: locale === 'ja-JP' ? '件の課題' : locale === 'vi-VN' ? 'vấn đề' : 'issues',
    noFlags: locale === 'ja-JP' ? 'アクティブなフラグなし' : locale === 'vi-VN' ? 'Không có cờ đang mở' : 'No active flags',
    openJob: locale === 'ja-JP' ? 'ジョブを開く' : locale === 'vi-VN' ? 'Mở job' : 'Open job',
    openFulfillmentJob: locale === 'ja-JP' ? 'フルフィルメントジョブを開く' : locale === 'vi-VN' ? 'Mở fulfillment job' : 'Open fulfillment job',
    openShippedJob: locale === 'ja-JP' ? 'shipment job đã gửi' : locale === 'vi-VN' ? 'Mở job đã ship' : 'Open shipped fulfillment job',
    opsSignal: locale === 'ja-JP' ? '運用シグナル' : locale === 'vi-VN' ? 'Tín hiệu vận hành' : 'Ops Signal',
    carrier: locale === 'ja-JP' ? '配送業者' : locale === 'vi-VN' ? 'Hãng vận chuyển' : 'Carrier',
    tracking: locale === 'ja-JP' ? '追跡番号' : locale === 'vi-VN' ? 'Mã tracking' : 'Tracking #',
    created: locale === 'ja-JP' ? '作成' : locale === 'vi-VN' ? 'Tạo lúc' : 'Created',
  } as const;
  const listNavigationState = buildListNavigationState(location.pathname, location.search, copy.pageTitle);

  useEffect(() => {
    const nextParams = new URLSearchParams();
    if (jobFilter) nextParams.set('status', jobFilter);
    if (flowFilter) nextParams.set('flow', flowFilter);
    if (search.trim()) nextParams.set('q', search.trim());
    setSearchParams(nextParams, { replace: true });
  }, [flowFilter, jobFilter, search, setSearchParams]);

  const { data: jobs = [], isLoading } = useFulfillmentJobs();
  const jobRows: FulfillmentRow[] = jobs.map((job) => {
    const signal = getExceptionSignal(job.id);

    return {
      job,
      slaState: getFulfillmentSlaState(job.sla_due_at),
      exceptionCount: signal.count,
      highestExceptionSeverity: signal.highestSeverity,
    };
  });

  const query = search.trim().toLowerCase();
  const hasActiveFilters = Boolean(query || jobFilter || flowFilter);

  const filtered = jobRows.filter(({ job }) => {
    const statusMatch = !jobFilter || job.status === jobFilter;
    const flowMatch = !flowFilter || job.flow_type === flowFilter;
    const searchMatch = !query || [
      job.display_job_code,
      job.id,
      job.display_order_id,
      job.order?.display_channel_order_ref,
      job.display_customer_name,
      job.display_tracking_number,
      job.fba_shipment_id,
      job.fulfillment_center_id,
    ].some((value) => value?.toLowerCase().includes(query));

    return statusMatch && flowMatch && searchMatch;
  });

  const counts = ACTIVE_STATUS_FILTERS.reduce<Record<string, number>>((acc, status) => {
    acc[status] = jobs.filter((job) => job.status === status).length;
    return acc;
  }, {} as Record<string, number>);

  const flowCounts = FLOW_FILTERS.reduce<Record<FlowType, number>>((acc, flow) => {
    acc[flow] = jobs.filter((job) => job.flow_type === flow).length;
    return acc;
  }, {} as Record<FlowType, number>);

  const visibleJobs = filtered.map(({ job }) => job);
  const exceptionVisibleCount = filtered.filter((row) => row.exceptionCount > 0).length;
  const shippedJobs = filtered.filter(({ job }) => ['shipped', 'done'].includes(job.status));

  const summaryCards = [
    {
      label: copy.pendingJobs,
      value: visibleJobs.filter((job) => job.status === 'pending').length,
      meta: copy.pendingMeta,
      icon: <Package className="size-4" />,
      tone: 'info' as const,
    },
    {
      label: copy.pickingPacked,
      value: visibleJobs.filter((job) => job.status === 'picking' || job.status === 'packed').length,
      meta: copy.pickingPackedMeta,
      icon: <Clock3 className="size-4" />,
      tone: 'purple' as const,
    },
    {
      label: copy.shippedToday,
      value: visibleJobs.filter((job) => isDateToday(job.shipped_at)).length,
      meta: copy.shippedMeta,
      icon: <Truck className="size-4" />,
      tone: 'teal' as const,
    },
    {
      label: copy.exceptions,
      value: exceptionVisibleCount,
      meta: exceptionVisibleCount > 0 ? copy.exceptionMeta : copy.noActiveIncidents,
      icon: <AlertTriangle className="size-4" />,
      tone: 'danger' as const,
    },
  ];

  const statusSummary = ACTIVE_STATUS_FILTERS
    .filter((status) => counts[status] > 0)
    .map((status) => `${JOB_STATUS_LABELS[status]} ${counts[status]}`)
    .join(' · ');

  const jobColumns: Column<FulfillmentRow>[] = [
    {
      header: 'Job Code',
      width: '160px',
      cell: ({ job }) => (
        <Link
          to={`/fulfillment/jobs/${job.id}`}
          state={listNavigationState}
          className="inline-flex items-center gap-2 text-sm font-medium text-foreground transition-colors hover:text-primary hover:underline"
          onClick={(event) => event.stopPropagation()}
        >
          <span className="font-mono">{job.display_job_code}</span>
              {job.notes && <span className="inline-block size-2 rounded-full bg-orange-400" title={copy.opsSignal} />}
        </Link>
      ),
    },
    {
      header: 'Flow',
      width: '148px',
      cell: ({ job }) => <FlowTypeBadge flowType={job.flow_type} />,
    },
    {
      header: 'Order #',
      width: '160px',
      cell: ({ job }) => job.order?.id ? (
        <Link
          to={`/orders/${job.order.id}`}
          state={listNavigationState}
          className="flex flex-col gap-0.5 text-sm text-foreground transition-colors hover:text-primary hover:underline"
          onClick={(event) => event.stopPropagation()}
        >
          <span className="font-mono text-xs">{job.order.display_order_id}</span>
          {job.order.display_channel_order_ref && (
            <span className="text-xs text-muted-foreground">{job.order.display_channel_order_ref}</span>
          )}
        </Link>
      ) : (
        <span className="font-mono text-xs text-muted-foreground">{job.display_order_id}</span>
      ),
    },
    {
      header: 'Warehouse',
      width: '130px',
      cell: ({ job }) => job.warehouse?.display_code ? (
        <Badge variant="secondary" className="font-mono text-xs">
          {job.warehouse.display_code}
        </Badge>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      ),
    },
    {
      header: 'Priority',
      width: '112px',
      cell: ({ job }) => job.priority ? (
        <PriorityBadge priority={job.priority} className="uppercase" />
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      ),
    },
    {
      header: 'Status',
      width: '118px',
      cell: ({ job }) => <JobStatusBadge status={job.status} />,
    },
    {
      header: copy.opsSignal,
      className: 'min-w-[210px]',
      cell: ({ job, exceptionCount, highestExceptionSeverity }) => {
        const prepStatus = job.fba_prep_status ?? 'none';
        const inboundStatus = job.inbound_shipment_status ?? 'working';

        return (
          <div className="flex min-w-[180px] flex-col gap-1.5">
            {job.flow_type === 'fba' ? (
              <div className="flex flex-wrap gap-1.5">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${FBA_PREP_STATUS_COLORS[prepStatus]}`}>
                  {FBA_PREP_STATUS_LABELS[prepStatus]}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${FBA_INBOUND_STATUS_COLORS[inboundStatus]}`}>
                  {FBA_INBOUND_STATUS_LABELS[inboundStatus]}
                </span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">{copy.standardHandling}</span>
            )}

            {exceptionCount > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-full bg-rose-500/14 px-2 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-500/18 dark:text-rose-300">
                  {exceptionCount} {exceptionCount === 1 ? copy.issue : copy.issues}
                </span>
                {highestExceptionSeverity && (
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${EXCEPTION_SEVERITY_COLORS[highestExceptionSeverity]}`}>
                    {EXCEPTION_SEVERITY_LABELS[highestExceptionSeverity]}
                  </span>
                )}
              </div>
            ) : (job.fulfillment_center_id || job.fba_shipment_id) ? (
              <span className="font-mono text-[11px] text-muted-foreground">
                {job.fulfillment_center_id ?? job.fba_shipment_id}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">{copy.noFlags}</span>
            )}
          </div>
        );
      },
    },
    {
      header: copy.carrier,
      width: '160px',
      cell: ({ job }) => job.display_carrier_label ? (
        <Badge variant="secondary" className={getCarrierClassName(job.display_carrier_label)}>
          {job.display_carrier_label}
        </Badge>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      ),
    },
    {
      header: copy.tracking,
      width: '150px',
      cell: ({ job }) => <span className="font-mono text-xs">{job.display_tracking_number ?? '—'}</span>,
    },
    {
      header: 'SLA Due',
      width: '168px',
      cell: ({ job, slaState }) => (
        <div className="flex flex-col gap-1">
          <span className={`text-sm ${getFulfillmentSlaTextClassName(slaState)}`}>
            {formatFulfillmentDateTime(job.sla_due_at)}
          </span>
          {slaState !== 'normal' && slaState !== 'none' && (
            <SlaIndicator state={slaState} className="w-fit text-[11px]" />
          )}
        </div>
      ),
    },
    {
      header: copy.created,
      width: '152px',
      cell: ({ job }) => <span className="text-xs text-muted-foreground">{formatFulfillmentDateTime(job.created_at)}</span>,
    },
    {
      header: '',
      width: '68px',
      className: 'text-right',
      cell: ({ job }) => (
        <Link
          to={`/fulfillment/jobs/${job.id}`}
          state={listNavigationState}
          className="inline-flex justify-end text-muted-foreground transition-colors hover:text-foreground"
          onClick={(event) => event.stopPropagation()}
        >
          <ArrowUpRight className="size-4" />
          <span className="sr-only">{copy.openJob}</span>
        </Link>
      ),
    },
  ];

  const shipmentColumns: Column<FulfillmentRow>[] = [
    {
      header: 'Job',
      cell: ({ job }) => (
        <Link
          to={`/fulfillment/jobs/${job.id}`}
          state={listNavigationState}
          className="font-mono text-sm font-medium text-foreground transition-colors hover:text-primary hover:underline"
          onClick={(event) => event.stopPropagation()}
        >
          {job.display_job_code}
        </Link>
      ),
    },
    {
      header: copy.carrier,
      cell: ({ job }) => job.display_carrier_label ? (
        <Badge variant="secondary" className={getCarrierClassName(job.display_carrier_label)}>
          {job.display_carrier_label}
        </Badge>
      ) : (
        <span className="text-sm text-muted-foreground">—</span>
      ),
    },
    {
      header: copy.tracking,
      cell: ({ job }) => <span className="font-mono text-xs">{job.display_tracking_number ?? '—'}</span>,
    },
    {
      header: 'Status',
      cell: ({ job }) => (
        <ShipmentStatusBadge status={job.status === 'done' ? 'delivered' : 'shipped'} />
      ),
    },
    {
      header: 'SLA Due',
      cell: ({ job }) => {
        const state = getFulfillmentSlaState(job.sla_due_at);
        return (
          <span className={`text-sm ${getFulfillmentSlaTextClassName(state)}`}>
            {formatFulfillmentDateTime(job.sla_due_at)}
          </span>
        );
      },
    },
    {
      header: copy.created,
      cell: ({ job }) => <span className="text-xs text-muted-foreground">{formatFulfillmentDateTime(job.created_at)}</span>,
    },
  ];

  function resetFilters() {
    setSearch('');
    setJobFilter('');
    setFlowFilter('');
  }

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      <PageHeader
        title={copy.pageTitle}
        description={statusSummary
          ? `${formatMessage(copy.pageDesc, { count: jobs.length, suffix: jobs.length !== 1 ? 's' : '' })} · ${statusSummary}`
          : formatMessage(copy.pageDesc, { count: jobs.length, suffix: jobs.length !== 1 ? 's' : '' })}
      />

      <FiltersBar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: copy.searchPlaceholder,
          onClear: () => setSearch(''),
        }}
        primaryFilters={{
          value: jobFilter,
          onChange: (value) => setJobFilter(value as (typeof STATUS_FILTERS)[number]),
          options: STATUS_FILTERS.map((status) => ({
            value: status,
            label: status ? JOB_STATUS_LABELS[status] : copy.all,
            count: status ? counts[status] ?? 0 : jobs.length,
          })),
        }}
        secondaryFilters={{
          value: flowFilter,
          onChange: (value) => setFlowFilter(value as FlowType | ''),
          options: [
            { value: '', label: copy.allFlows, count: jobs.length },
            ...FLOW_FILTERS.map((flow) => ({
              value: flow,
              label: FLOW_TYPE_LABELS[flow],
              count: flowCounts[flow],
            })),
          ],
        }}
        resultCount={hasActiveFilters ? formatMessage(copy.matchingJobs, {
          count: filtered.length,
          suffix: filtered.length !== 1 ? 's' : '',
        }) : undefined}
        clearAll={hasActiveFilters ? resetFilters : undefined}
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

      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Package className="size-4 text-muted-foreground" />
          <h2 className="text-base font-semibold">{copy.operationsQueue}</h2>
        </div>
        <DataTable
          columns={jobColumns}
          data={filtered}
          isLoading={isLoading}
          keyExtractor={(row) => row.job.id}
          rowHref={(row) => `/fulfillment/jobs/${row.job.id}`}
          rowState={() => listNavigationState}
          rowLabel={(row) => `${copy.openFulfillmentJob} ${row.job.display_job_code}`}
          wrapperClassName="[&_table]:min-w-[1320px]"
          emptyTitle={hasActiveFilters ? copy.noJobsFiltered : copy.noJobs}
          emptyDescription={hasActiveFilters
            ? copy.noJobsFilteredDesc
            : copy.noJobsDesc}
          emptyVariant={hasActiveFilters ? 'filtered' : 'empty'}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Truck className="size-4 text-muted-foreground" />
          <h2 className="text-base font-semibold">{copy.recentShipments}</h2>
        </div>
        <DataTable
          columns={shipmentColumns}
          data={shippedJobs}
          isLoading={isLoading}
          keyExtractor={(row) => `ship-${row.job.id}`}
          rowHref={(row) => `/fulfillment/jobs/${row.job.id}`}
          rowState={() => listNavigationState}
          rowLabel={(row) => `${copy.openShippedJob} ${row.job.display_job_code}`}
          wrapperClassName="[&_table]:min-w-[760px]"
          emptyTitle={copy.noShipments}
          emptyDescription={copy.noShipmentsDesc}
          emptyVariant="empty"
        />
      </div>
    </div>
  );
}
