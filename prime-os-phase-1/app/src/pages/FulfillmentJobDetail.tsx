import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Package, Truck } from 'lucide-react';
import { ActionToolbar } from '@/components/system/ActionToolbar';
import { ConfirmDialog } from '@/components/system/ConfirmDialog';
import { DetailInfoCard } from '@/components/system/DetailInfoCard';
import { EmptyState } from '@/components/system/EmptyState';
import { PageHeader } from '@/components/system/PageHeader';
import { PriorityBadge } from '@/components/system/PriorityBadge';
import { SlaIndicator } from '@/components/system/SlaIndicator';
import { FbaShipmentPanel } from '@/components/fulfillment/FbaShipmentPanel';
import { FlowTypeBadge } from '@/components/fulfillment/FlowTypeBadge';
import { FulfillmentWorkflowTimeline } from '@/components/fulfillment/FulfillmentWorkflowTimeline';
import { JobStatusBadge } from '@/components/fulfillment/JobStatusBadge';
import { ShipmentStatusBadge } from '@/components/fulfillment/ShipmentStatusBadge';
import { TrackingTimeline } from '@/components/fulfillment/TrackingTimeline';
import { CreateShipmentDialog } from '@/components/fulfillment/CreateShipmentDialog';
import { ExceptionDialog } from '@/components/fulfillment/ExceptionDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  useCreateException,
  useCreateShipment,
  useFulfillmentJob,
  useFulfillmentJobItems,
  useJobExceptions,
  useJobShipments,
  useTrackingEvents,
  useUpdateFulfillmentJob,
  useUpdateJobStatus,
} from '@/hooks/use-fulfillment-jobs';
import {
  EXCEPTION_SEVERITY_COLORS,
  EXCEPTION_TYPE_LABELS,
  FBA_INBOUND_STATUS_COLORS,
  FBA_INBOUND_STATUS_LABELS,
  FBA_PREP_STATUS_COLORS,
  FBA_PREP_STATUS_LABELS,
  isJobReadOnly,
  type FbaPrepStatus,
  type JobStatus,
} from '@/lib/fulfillment-types';
import {
  getFulfillmentSlaState,
} from '@/lib/fulfillment-sla';
import { useDetailNavigation } from '@/hooks/use-detail-navigation';
import { useI18n } from '@/lib/i18n/I18nContext';
import { formatLocalizedDateTime, formatMessage } from '@/lib/i18n/format';
import { SkuBadge } from '@/components/system/SkuBadge';

const NEXT_STATUS: Partial<Record<JobStatus, JobStatus>> = {
  pending: 'picking',
  picking: 'packed',
  packed: 'shipped',
};

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

function buildFbaShipmentCode(jobId: string, jobCode: string | null) {
  const seed = (jobCode ?? jobId.slice(0, 8)).replace(/[^a-z0-9]/gi, '').toUpperCase();
  return `FBA-${seed}`;
}

export default function FulfillmentJobDetail() {
  const { locale } = useI18n();
  const { id } = useParams<{ id: string }>();
  const [advanceConfirmOpen, setAdvanceConfirmOpen] = useState(false);
  const [exceptionOpen, setExceptionOpen] = useState(false);
  const [createShipmentOpen, setCreateShipmentOpen] = useState(false);
  const copy = {
    'en-US': {
      fulfillmentJobs: 'Fulfillment Jobs',
      notFoundTitle: 'Job not found',
      notFoundDescription: 'This fulfillment job may have been reseeded or the URL no longer points to an active demo record.',
      backTo: 'Back to {label}',
      jobLabel: 'Job {code}',
      readOnly: 'Read-only observer flow',
      openExceptions: '{count} open {label}',
      exceptionSingle: 'exception',
      exceptionPlural: 'exceptions',
      flagException: 'Flag Exception',
      startPicking: 'Start Picking',
      markPacked: 'Mark Packed',
      createShipment: 'Create Shipment',
      order: 'Order',
      warehouse: 'Warehouse',
      customer: 'Customer',
      slaDue: 'SLA Due',
      fbaReadiness: 'FBA Readiness',
      shipmentId: 'Shipment ID',
      pendingConfirmation: 'Pending confirmation',
      fcDestination: 'FC Destination',
      unassigned: 'Unassigned',
      exceptionWatch: 'Exception Watch',
      openCases: '{count} open {label}',
      caseSingle: 'case',
      casePlural: 'cases',
      severitySuffix: 'severity',
      awaitingNotes: 'Awaiting operator notes.',
      logged: 'Logged {time}',
      jobItems: 'Job Items ({count})',
      noItems: 'No items in this job.',
      sku: 'SKU',
      product: 'Product',
      ordered: 'Ordered',
      picked: 'Picked',
      packed: 'Packed',
      status: 'Status',
      shipment: 'Shipment',
      carrier: 'Carrier',
      tracking: 'Tracking',
      exceptions: 'Exceptions ({count})',
      noNote: 'No note provided.',
      moveToPacked: 'Move job to packed?',
      moveToPackedDescription: 'Use this after picking is complete. The job will advance to packed and become ready for shipment creation.',
      keepPicking: 'Keep Picking',
    },
    'ja-JP': {
      fulfillmentJobs: 'フルフィルメントジョブ',
      notFoundTitle: 'ジョブが見つかりません',
      notFoundDescription: 'このフルフィルメントジョブは再生成されたか、URLが有効なデモレコードを指していない可能性があります。',
      backTo: '{label}へ戻る',
      jobLabel: 'ジョブ {code}',
      readOnly: '参照専用フロー',
      openExceptions: '{count} 件の未解決{label}',
      exceptionSingle: '例外',
      exceptionPlural: '例外',
      flagException: '例外を登録',
      startPicking: 'ピッキング開始',
      markPacked: '梱包済みにする',
      createShipment: '出荷を作成',
      order: '注文',
      warehouse: '倉庫',
      customer: '顧客',
      slaDue: 'SLA期限',
      fbaReadiness: 'FBA準備状況',
      shipmentId: '出荷ID',
      pendingConfirmation: '確認待ち',
      fcDestination: 'FC宛先',
      unassigned: '未割当',
      exceptionWatch: '例外監視',
      openCases: '{count} 件の未解決{label}',
      caseSingle: '案件',
      casePlural: '案件',
      severitySuffix: '重大度',
      awaitingNotes: 'オペレーターのメモ待ちです。',
      logged: '{time} に記録',
      jobItems: 'ジョブ明細 ({count})',
      noItems: 'このジョブに明細はありません。',
      sku: 'SKU',
      product: '商品',
      ordered: '注文数',
      picked: 'ピック済み',
      packed: '梱包済み',
      status: 'ステータス',
      shipment: '出荷',
      carrier: '配送会社',
      tracking: '追跡番号',
      exceptions: '例外 ({count})',
      noNote: 'メモはありません。',
      moveToPacked: 'このジョブを梱包済みにしますか？',
      moveToPackedDescription: 'ピッキング完了後に使用します。ジョブは packed に進み、出荷作成が可能になります。',
      keepPicking: 'ピッキングに戻る',
    },
    'vi-VN': {
      fulfillmentJobs: 'Lệnh fulfillment',
      notFoundTitle: 'Không tìm thấy lệnh',
      notFoundDescription: 'Lệnh fulfillment này có thể đã được seed lại hoặc URL không còn trỏ tới bản ghi demo đang hoạt động.',
      backTo: 'Quay lại {label}',
      jobLabel: 'Lệnh {code}',
      readOnly: 'Luồng chỉ quan sát',
      openExceptions: '{count} {label} đang mở',
      exceptionSingle: 'ngoại lệ',
      exceptionPlural: 'ngoại lệ',
      flagException: 'Đánh dấu ngoại lệ',
      startPicking: 'Bắt đầu picking',
      markPacked: 'Đánh dấu đã đóng gói',
      createShipment: 'Tạo lệnh giao hàng',
      order: 'Đơn hàng',
      warehouse: 'Kho',
      customer: 'Khách hàng',
      slaDue: 'Hạn SLA',
      fbaReadiness: 'Mức sẵn sàng FBA',
      shipmentId: 'Mã lô hàng',
      pendingConfirmation: 'Chờ xác nhận',
      fcDestination: 'FC đích',
      unassigned: 'Chưa gán',
      exceptionWatch: 'Theo dõi ngoại lệ',
      openCases: '{count} {label} đang mở',
      caseSingle: 'case',
      casePlural: 'case',
      severitySuffix: 'mức độ',
      awaitingNotes: 'Đang chờ ghi chú từ vận hành.',
      logged: 'Ghi nhận lúc {time}',
      jobItems: 'Mặt hàng trong lệnh ({count})',
      noItems: 'Chưa có mặt hàng trong lệnh này.',
      sku: 'SKU',
      product: 'Sản phẩm',
      ordered: 'Đặt',
      picked: 'Đã pick',
      packed: 'Đã đóng gói',
      status: 'Trạng thái',
      shipment: 'Lô giao hàng',
      carrier: 'Đơn vị vận chuyển',
      tracking: 'Mã vận đơn',
      exceptions: 'Ngoại lệ ({count})',
      noNote: 'Chưa có ghi chú.',
      moveToPacked: 'Chuyển lệnh sang đã đóng gói?',
      moveToPackedDescription: 'Dùng sau khi picking hoàn tất. Lệnh sẽ chuyển sang packed và sẵn sàng tạo shipment.',
      keepPicking: 'Tiếp tục picking',
    },
  }[locale] ?? {
    fulfillmentJobs: 'Fulfillment Jobs',
    notFoundTitle: 'Job not found',
    notFoundDescription: 'This fulfillment job may have been reseeded or the URL no longer points to an active demo record.',
    backTo: 'Back to {label}',
    jobLabel: 'Job {code}',
    readOnly: 'Read-only observer flow',
    openExceptions: '{count} open {label}',
    exceptionSingle: 'exception',
    exceptionPlural: 'exceptions',
    flagException: 'Flag Exception',
    startPicking: 'Start Picking',
    markPacked: 'Mark Packed',
    createShipment: 'Create Shipment',
    order: 'Order',
    warehouse: 'Warehouse',
    customer: 'Customer',
    slaDue: 'SLA Due',
    fbaReadiness: 'FBA Readiness',
    shipmentId: 'Shipment ID',
    pendingConfirmation: 'Pending confirmation',
    fcDestination: 'FC Destination',
    unassigned: 'Unassigned',
    exceptionWatch: 'Exception Watch',
    openCases: '{count} open {label}',
    caseSingle: 'case',
    casePlural: 'cases',
    severitySuffix: 'severity',
    awaitingNotes: 'Awaiting operator notes.',
    logged: 'Logged {time}',
    jobItems: 'Job Items ({count})',
    noItems: 'No items in this job.',
    sku: 'SKU',
    product: 'Product',
    ordered: 'Ordered',
    picked: 'Picked',
    packed: 'Packed',
    status: 'Status',
    shipment: 'Shipment',
    carrier: 'Carrier',
    tracking: 'Tracking',
    exceptions: 'Exceptions ({count})',
    noNote: 'No note provided.',
    moveToPacked: 'Move job to packed?',
    moveToPackedDescription: 'Use this after picking is complete. The job will advance to packed and become ready for shipment creation.',
    keepPicking: 'Keep Picking',
  };
  const localizedExceptionTypes = {
    'en-US': EXCEPTION_TYPE_LABELS,
    'ja-JP': { short_pick: 'ピッキング不足', damaged: '破損', delivery_failed: '配送失敗', other: 'その他' },
    'vi-VN': { short_pick: 'Thiếu khi pick', damaged: 'Hư hỏng', delivery_failed: 'Giao hàng thất bại', other: 'Khác' },
  }[locale] ?? EXCEPTION_TYPE_LABELS;
  const severityLabels = {
    'en-US': EXCEPTION_SEVERITY_LABELS,
    'ja-JP': { low: '低', med: '中', high: '高' },
    'vi-VN': { low: 'Thấp', med: 'Trung bình', high: 'Cao' },
  }[locale] ?? EXCEPTION_SEVERITY_LABELS;
  const itemStatusLabels = {
    'en-US': { open: 'Open', picked: 'Picked', packed: 'Packed', short_pick: 'Short Pick' },
    'ja-JP': { open: '未処理', picked: 'ピック済み', packed: '梱包済み', short_pick: '不足' },
    'vi-VN': { open: 'Mở', picked: 'Đã pick', packed: 'Đã đóng gói', short_pick: 'Thiếu hàng' },
  }[locale] ?? { open: 'Open', picked: 'Picked', packed: 'Packed', short_pick: 'Short Pick' };
  const localizedPrepStatus = {
    'en-US': FBA_PREP_STATUS_LABELS,
    'ja-JP': { none: 'Prep不要', preparing: '準備中', prepped: 'Prep完了', labelled: 'ラベル済み' },
    'vi-VN': { none: 'Không cần prep', preparing: 'Đang chuẩn bị', prepped: 'Đã prep', labelled: 'Đã dán nhãn' },
  }[locale] ?? FBA_PREP_STATUS_LABELS;
  const localizedInboundStatus = {
    'en-US': FBA_INBOUND_STATUS_LABELS,
    'ja-JP': { working: '作業中', shipping: 'FCへ配送中', receiving: '受領中', closed: '完了', cancelled: 'キャンセル', deleted: '削除済み' },
    'vi-VN': { working: 'Đang xử lý', shipping: 'Đang gửi tới FC', receiving: 'Đang nhận', closed: 'Hoàn tất', cancelled: 'Đã hủy', deleted: 'Đã xóa' },
  }[locale] ?? FBA_INBOUND_STATUS_LABELS;
  const formatDateTime = (value: string | Date | null | undefined) => formatLocalizedDateTime(locale, value, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const { backLabel, goBack } = useDetailNavigation('/fulfillment', copy.fulfillmentJobs);

  const { data: job, isLoading } = useFulfillmentJob(id);
  const { data: items = [] } = useFulfillmentJobItems(id);
  const { data: shipments = [] } = useJobShipments(id);
  const { data: exceptions = [] } = useJobExceptions(id);

  const statusMut = useUpdateJobStatus();
  const updateJobMut = useUpdateFulfillmentJob();
  const createShipmentMut = useCreateShipment();
  const createExceptionMut = useCreateException();

  const primaryShipment = shipments[0];
  const { data: trackingEvents = [] } = useTrackingEvents(primaryShipment?.id);

  function handleAdvance() {
    if (!id || !job) return;
    const next = NEXT_STATUS[job.status as JobStatus];
    if (!next) return;
    if (next === 'packed') {
      setAdvanceConfirmOpen(true);
      return;
    }
    statusMut.mutate({ jobId: id, status: next });
  }

  function handleConfirmPackedTransition() {
    if (!id) return;
    statusMut.mutate({ jobId: id, status: 'packed' });
    setAdvanceConfirmOpen(false);
  }

  function handleCreateShipment(data: { carrierCode: string; trackingNumber?: string; serviceLevel?: string }) {
    if (!id) return;
    createShipmentMut.mutate({ jobId: id, ...data });
    setCreateShipmentOpen(false);
  }

  function handleUpdateFbaPrepStatus(status: FbaPrepStatus) {
    if (!id) return;

    updateJobMut.mutate({
      jobId: id,
      updates: {
        fba_prep_status: status,
        labeled_at: status === 'labelled' ? new Date().toISOString() : null,
      },
    });
  }

  function handleConfirmFbaShipment(fulfillmentCenterId: string) {
    if (!id || !job) return;

    updateJobMut.mutate({
      jobId: id,
      updates: {
        fulfillment_center_id: fulfillmentCenterId,
        fba_shipment_id: job.fba_shipment_id ?? buildFbaShipmentCode(job.id, job.job_code),
        inbound_shipment_status: 'shipping',
      },
    });
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-6 lg:p-8">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (!job) {
    return (
      <EmptyState
        title={copy.notFoundTitle}
        description={copy.notFoundDescription}
        icon={<Package />}
        variant="unavailable"
        className="mx-6 mt-6 max-w-5xl lg:mx-8"
        action={(
          <Button variant="outline" onClick={goBack}>
            {formatMessage(copy.backTo, { label: backLabel })}
          </Button>
        )}
      />
    );
  }

  const unresolvedExceptions = exceptions.filter((exception) => !exception.resolved_at);
  const latestException = unresolvedExceptions[0] ?? exceptions[0] ?? null;
  const highestSeverity = unresolvedExceptions.reduce<'low' | 'med' | 'high'>((current, exception) => (
    EXCEPTION_SEVERITY_WEIGHT[exception.severity] > EXCEPTION_SEVERITY_WEIGHT[current]
      ? exception.severity
      : current
  ), 'low');

  const inboundStatus = job.inbound_shipment_status ?? 'working';
  const prepStatus = job.fba_prep_status ?? 'none';
  const slaState = getFulfillmentSlaState(job.sla_due_at);
  const slaBreached = slaState === 'overdue';
  const slaAtRisk = slaState === 'at_risk';
  const readOnlyJob = isJobReadOnly(job);

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 overflow-x-auto">
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={goBack}
              aria-label={formatMessage(copy.backTo, { label: backLabel })}
            >
              <ArrowLeft className="size-4" />
            </Button>
            <span>{formatMessage(copy.jobLabel, { code: job.display_job_code })}</span>
          </div>
        }
        description={
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <JobStatusBadge status={job.status} />
            <FlowTypeBadge flowType={job.flow_type} />
            {readOnlyJob && (
              <Badge variant="outline" className="text-xs">
                {copy.readOnly}
              </Badge>
            )}
            {job.priority && <PriorityBadge priority={job.priority} className="uppercase" />}
            {slaBreached && <SlaIndicator state="overdue" className="text-xs" />}
            {slaAtRisk && <SlaIndicator state="at_risk" className="text-xs" />}
            {unresolvedExceptions.length > 0 && (
              <Badge variant="destructive" className="text-xs">
                {formatMessage(copy.openExceptions, {
                  count: unresolvedExceptions.length,
                  label: unresolvedExceptions.length === 1 ? copy.exceptionSingle : copy.exceptionPlural,
                })}
              </Badge>
            )}
          </div>
        }
        actions={
          <ActionToolbar alwaysVisible className="gap-2 opacity-100">
            <Button variant="outline" size="sm" onClick={() => setExceptionOpen(true)}>
              <AlertTriangle className="mr-1 size-3.5" />
              {copy.flagException}
            </Button>
            {!readOnlyJob && job.status === 'pending' && (
              <Button size="sm" onClick={handleAdvance}>{copy.startPicking}</Button>
            )}
            {!readOnlyJob && job.status === 'picking' && (
              <Button size="sm" onClick={handleAdvance}>{copy.markPacked}</Button>
            )}
            {!readOnlyJob && job.status === 'packed' && (
              <Button size="sm" onClick={() => setCreateShipmentOpen(true)}>
                <Truck className="mr-1 size-3.5" />
                {copy.createShipment}
              </Button>
            )}
          </ActionToolbar>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <DetailInfoCard
          label={copy.order}
          value={job.order?.display_order_id ?? job.display_order_id}
          meta={job.order?.display_channel_order_ref ?? undefined}
        />
        <DetailInfoCard
          label={copy.warehouse}
          value={job.warehouse?.display_name ?? '—'}
          meta={job.warehouse?.display_code ?? undefined}
        />
        <DetailInfoCard label={copy.customer} value={job.display_customer_name} />
        <DetailInfoCard
          label={copy.slaDue}
          value={formatDateTime(job.sla_due_at)}
          tone={slaState === 'overdue' ? 'danger' : slaState === 'at_risk' ? 'warning' : 'default'}
        />
      </div>

      <FulfillmentWorkflowTimeline job={job} />

      {(job.flow_type === 'fba' || unresolvedExceptions.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {job.flow_type === 'fba' && (
            <Card className="border-orange-500/20 bg-orange-500/8 dark:bg-orange-500/10">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm text-orange-800 dark:text-orange-200">
                  <Package className="size-4 text-orange-600 dark:text-orange-300" />
                  {copy.fbaReadiness}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${FBA_PREP_STATUS_COLORS[prepStatus]}`}>
                    {localizedPrepStatus[prepStatus]}
                  </span>
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${FBA_INBOUND_STATUS_COLORS[inboundStatus]}`}>
                    {localizedInboundStatus[inboundStatus]}
                  </span>
                </div>
                <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                  <div>
                    <span className="block uppercase tracking-[0.14em]">{copy.shipmentId}</span>
                    <span className="font-mono text-foreground">{job.fba_shipment_id ?? copy.pendingConfirmation}</span>
                  </div>
                  <div>
                    <span className="block uppercase tracking-[0.14em]">{copy.fcDestination}</span>
                    <span className="font-mono text-foreground">{job.fulfillment_center_id ?? copy.unassigned}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {unresolvedExceptions.length > 0 && latestException && (
            <Card className="border-rose-500/20 bg-rose-500/8 dark:bg-rose-500/10">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm text-rose-800 dark:text-rose-200">
                  <AlertTriangle className="size-4 text-destructive" />
                  {copy.exceptionWatch}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="destructive" className="text-xs">
                    {formatMessage(copy.openCases, {
                      count: unresolvedExceptions.length,
                      label: unresolvedExceptions.length === 1 ? copy.caseSingle : copy.casePlural,
                    })}
                  </Badge>
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${EXCEPTION_SEVERITY_COLORS[highestSeverity]}`}>
                    {severityLabels[highestSeverity]} {copy.severitySuffix}
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-rose-900 dark:text-rose-100">{localizedExceptionTypes[latestException.type]}</p>
                  <p className="text-muted-foreground">{latestException.note ?? copy.awaitingNotes}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatMessage(copy.logged, { time: formatDateTime(latestException.created_at) })}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Package className="size-4" />
            {formatMessage(copy.jobItems, { count: items.length })}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">{copy.noItems}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{copy.sku}</TableHead>
                  <TableHead>{copy.product}</TableHead>
                  <TableHead className="text-center">{copy.ordered}</TableHead>
                  <TableHead className="text-center">{copy.picked}</TableHead>
                  <TableHead className="text-center">{copy.packed}</TableHead>
                  <TableHead>{copy.status}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {item.resolved_product_id ? (
                        <Link
                          to={`/products/${item.resolved_product_id}`}
                          className="inline-flex transition-opacity hover:opacity-90"
                        >
                          <SkuBadge sku={item.display_sku_code} size="compact" />
                        </Link>
                      ) : (
                        <SkuBadge sku={item.display_sku_code} size="compact" />
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex flex-col gap-0.5">
                        {item.resolved_product_id ? (
                          <Link
                            to={`/products/${item.resolved_product_id}`}
                            className="font-medium transition-colors hover:text-primary hover:underline"
                          >
                            {item.display_product_name}
                          </Link>
                        ) : (
                          <span className="font-medium">{item.display_product_name}</span>
                        )}
                        {item.resolved_variation_name && (
                          <span className="text-xs text-muted-foreground">{item.resolved_variation_name}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{item.display_quantity_ordered}</TableCell>
                    <TableCell className="text-center">{item.picked_qty}</TableCell>
                    <TableCell className="text-center">{item.packed_qty}</TableCell>
                    <TableCell>
                      <Badge variant={item.status === 'packed' ? 'default' : 'outline'} className="text-xs">
                        {itemStatusLabels[item.status as keyof typeof itemStatusLabels] ?? item.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {primaryShipment && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Truck className="size-4" />
              {copy.shipment}
              <ShipmentStatusBadge status={primaryShipment.status} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-4 text-sm sm:grid-cols-2">
              <div><span className="text-muted-foreground">{copy.carrier}:</span> <span className="font-medium">{primaryShipment.display_carrier_label ?? primaryShipment.carrier_code}</span></div>
              <div><span className="text-muted-foreground">{copy.tracking}:</span> <span className="font-mono text-xs">{primaryShipment.display_tracking_number ?? '—'}</span></div>
            </div>
            <TrackingTimeline
              events={trackingEvents}
              isReadOnly={false}
              onAddEvent={() => {}}
              hasShipment={true}
              isShipmentDispatched={primaryShipment.status === 'shipped' || primaryShipment.status === 'delivered'}
              shipmentStatus={primaryShipment.status}
              trackingNumber={primaryShipment.display_tracking_number}
            />
          </CardContent>
        </Card>
      )}

      {job.flow_type === 'fba' && id && (
        <FbaShipmentPanel
          job={job}
          onUpdatePrepStatus={handleUpdateFbaPrepStatus}
          onConfirmShipment={handleConfirmFbaShipment}
          isUpdating={updateJobMut.isPending}
        />
      )}

      {exceptions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="size-4" />
              {formatMessage(copy.exceptions, { count: exceptions.length })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              {exceptions.map((exception) => (
                <div key={exception.id} className="flex items-start gap-3 rounded-lg border border-border bg-background/80 p-3 text-sm">
                  <AlertTriangle className="mt-0.5 size-4 text-destructive" />
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <Badge variant="destructive" className="text-xs">
                        {localizedExceptionTypes[exception.type]}
                      </Badge>
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${EXCEPTION_SEVERITY_COLORS[exception.severity]}`}>
                        {severityLabels[exception.severity]}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(exception.created_at)}
                      </span>
                    </div>
                    <p className="text-muted-foreground">{exception.note ?? copy.noNote}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <CreateShipmentDialog
        open={createShipmentOpen}
        onOpenChange={setCreateShipmentOpen}
        onSubmit={handleCreateShipment}
        isLoading={createShipmentMut.isPending}
      />

      <ConfirmDialog
        open={advanceConfirmOpen}
        onOpenChange={setAdvanceConfirmOpen}
        title={copy.moveToPacked}
        description={copy.moveToPackedDescription}
        confirmText={copy.markPacked}
        cancelText={copy.keepPicking}
        isConfirming={statusMut.isPending}
        onConfirm={handleConfirmPackedTransition}
      />

      <ExceptionDialog
        open={exceptionOpen}
        onOpenChange={setExceptionOpen}
        onSubmit={async ({ type, severity, note }) => {
          if (!id) return;
          await createExceptionMut.mutateAsync({ jobId: id, type, severity, note });
          setExceptionOpen(false);
        }}
        isLoading={createExceptionMut.isPending}
      />
    </div>
  );
}
