import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  ArrowLeft, Package, Truck, AlertTriangle, CalendarClock, Loader2,
} from 'lucide-react';
import { ActionToolbar } from '@/components/system/ActionToolbar';
import { ChannelBadge } from '@/components/system/ChannelBadge';
import { PageHeader } from '@/components/system/PageHeader';
import { EmptyState } from '@/components/system/EmptyState';
import { ConfirmDialog } from '@/components/system/ConfirmDialog';
import { DetailInfoCard } from '@/components/system/DetailInfoCard';
import { SkuBadge } from '@/components/system/SkuBadge';
import { StatusBadge } from '@/components/system/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useOrder,
  useOrderItems,
  useOrderEvents,
  useOrderReservations,
  useAllocateWarehouse,
  useReserveInventory,
  useSendToFulfillment,
  useCancelOrder,
} from '@/hooks/use-orders';
import { getWarehouses } from '@/lib/warehouse-store';
import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge';
import { LifecycleStageBadge } from '@/components/orders/LifecycleStageBadge';
import { OrderEventTimeline } from '@/components/orders/OrderEventTimeline';
import { useToast } from '@/hooks/use-toast';
import { useDetailNavigation } from '@/hooks/use-detail-navigation';
import { useMutation } from '@tanstack/react-query';
import type { FlowType } from '@/lib/oms-types';
import { useI18n } from '@/lib/i18n/I18nContext';
import {
  formatLocalizedDate,
  formatLocalizedMoney,
  formatMessage,
} from '@/lib/i18n/format';

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { locale, t } = useI18n();
  const { toast } = useToast();
  const warehouses = getWarehouses();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const { backLabel, goBack } = useDetailNavigation('/orders', t('orders.pageTitle'));

  const { data: order, isLoading } = useOrder(id);
  const { data: items = [] } = useOrderItems(id);
  const { data: events = [] } = useOrderEvents(id);
  const { data: reservations = [] } = useOrderReservations(id);
  const allocateWarehouse = useAllocateWarehouse();
  const reserveInventory = useReserveInventory();
  const sendToFulfillment = useSendToFulfillment();
  const cancelOrder = useCancelOrder();

  // Manual allocate mutation
  const [showAllocateDialog, setShowAllocateDialog] = useState(false);
  const allocateMutation = useMutation({
    mutationFn: async ({ warehouseId }: { warehouseId: string }) => {
      await allocateWarehouse.mutateAsync({ orderId: id!, warehouseId });
    },
    onSuccess: () => toast({ title: t('orders.detailAllocate') }),
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Reserve inventory mutation
  const reserveMutation = useMutation({
    mutationFn: async ({ warehouseId }: { warehouseId: string }) => {
      const itemsPayload = items.map((item) => ({
        skuId: item.sku,
        qty: item.quantity,
      }));
      await reserveInventory.mutateAsync({ orderId: id!, warehouseId, items: itemsPayload });
    },
    onSuccess: () => toast({ title: t('orders.detailReserve') }),
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Send to fulfillment mutation
  const sendMutation = useMutation({
    mutationFn: async ({ warehouseId, flowType }: { warehouseId: string; flowType: FlowType }) => {
      const itemsPayload = items.map((item) => ({
        skuId: item.sku,
        skuCode: item.sku,
        qty: item.quantity,
      }));
      await sendToFulfillment.mutateAsync({ orderId: id!, warehouseId, flowType, items: itemsPayload });
    },
    onSuccess: () => toast({ title: t('orders.detailSendFulfillment') }),
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      await cancelOrder.mutateAsync({ orderId: id! });
    },
    onSuccess: () => {
      toast({ title: t('orders.detailCancel') });
      goBack();
    },
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const isAnyActionPending = allocateMutation.isPending
    || reserveMutation.isPending
    || sendMutation.isPending
    || cancelMutation.isPending;
  const pendingActionLabel = allocateMutation.isPending
    ? t('orders.detailAllocatePending')
    : reserveMutation.isPending
      ? t('orders.detailReservePending')
      : sendMutation.isPending
        ? t('orders.detailSendPending')
        : cancelMutation.isPending
          ? t('orders.detailCancelPending')
          : null;

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <EmptyState
        title={t('orders.detailNotFound')}
        description={t('orders.detailNotFoundDesc')}
        icon={<Package />}
        variant="unavailable"
        className="mx-6 mt-6 lg:mx-8"
        action={(
          <Button variant="outline" onClick={goBack}>
            <ArrowLeft className="mr-1 size-3.5" />
            {t('orders.detailBack')}
          </Button>
        )}
      />
    );
  }

  const allocatedWarehouse = warehouses.find((w) => w.id === order.resolved_warehouse_id);

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      {/* Header */}
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="size-8" aria-label={`Back to ${backLabel}`} onClick={goBack}>
              <ArrowLeft className="size-4" />
            </Button>
            <span>{formatMessage(t('orders.detailOrder'), { id: order.display_order_id })}</span>
          </div>
        }
        description={
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            {order.channel && <ChannelBadge platform={order.channel} />}
            {order.display_channel_order_ref && (
              <Badge variant="outline" className="text-xs font-mono">
                Ref: {order.display_channel_order_ref}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {formatMessage(t('orders.detailPlacedOn'), {
                date: formatLocalizedDate(locale, order.order_date),
              })}
            </span>
          </div>
        }
        actions={
          <ActionToolbar alwaysVisible className="gap-2 opacity-100">
            {order.risk_flags && order.risk_flags.length > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="size-3" />
                {formatMessage(
                  order.risk_flags.length === 1 ? t('orders.detailRiskFlag') : t('orders.detailRiskFlags'),
                  { count: order.risk_flags.length },
                )}
              </Badge>
            )}
          </ActionToolbar>
        }
      />

      {/* Status Banner */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-lg border bg-card">
        <OrderStatusBadge status={order.status} />
        {order.lifecycle_stage && <LifecycleStageBadge stage={order.lifecycle_stage} />}
        {order.sla_target_days && (
          <Badge variant="outline" className="gap-1">
            <CalendarClock className="size-3" />
            {formatMessage(t('orders.detailSla'), { days: order.sla_target_days })}
          </Badge>
        )}
        {allocatedWarehouse && (
          <Badge variant="outline" className="gap-1">
            <Truck className="size-3" />
            {allocatedWarehouse.code}
          </Badge>
        )}
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <DetailInfoCard
          label={t('orders.cardCustomer')}
          value={order.display_customer_name}
          meta={order.display_customer_email ?? undefined}
        />
        <DetailInfoCard
          label={t('orders.colTotal')}
          value={formatLocalizedMoney(locale, order.total_amount, order.currency)}
          meta={formatMessage(t('orders.detailTotalMeta'), {
            amount: formatLocalizedMoney(locale, order.subtotal_amount, order.currency),
          })}
          valueClassName="font-mono font-semibold"
        />
        <DetailInfoCard
          label={t('orders.colWarehouse')}
          value={order.resolved_warehouse?.display_name ?? allocatedWarehouse?.name ?? '—'}
          meta={order.resolved_warehouse?.display_code ?? allocatedWarehouse?.code ?? undefined}
        />
        <DetailInfoCard
          label={t('orders.cardShipTo')}
          value={order.display_ship_to_label ?? '—'}
          meta={order.display_ship_to_postal_code ?? undefined}
        />
      </div>

      {/* Action Buttons */}
      {order.status !== 'cancelled' && order.status !== 'completed' && order.status !== 'returned' && (
        <Card>
          <CardHeader><CardTitle className="text-base">{t('orders.detailActionsTitle')}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <ActionToolbar alwaysVisible className="flex-wrap gap-2 opacity-100">
              {/* Allocate Warehouse */}
              {!allocatedWarehouse && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAllocateDialog(true)}
                  disabled={isAnyActionPending}
                >
                  {allocateMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Truck className="size-3.5" />}
                  {t('orders.detailAllocate')}
                </Button>
              )}

              {/* Reserve Inventory */}
              {allocatedWarehouse && !reservations.length && order.lifecycle_stage !== 'reserved' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => reserveMutation.mutate({ warehouseId: allocatedWarehouse.id })}
                  disabled={isAnyActionPending}
                >
                  {reserveMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
                  {reserveMutation.isPending ? t('orders.detailReservePending') : t('orders.detailReserve')}
                </Button>
              )}

              {/* Send to Fulfillment */}
              {allocatedWarehouse && (order.lifecycle_stage === 'reserved' || order.status === 'ready_to_ship') && (
                <>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => sendMutation.mutate({
                      warehouseId: allocatedWarehouse.id,
                      flowType: 'seller_fulfilled',
                    })}
                    disabled={isAnyActionPending}
                  >
                    {sendMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
                    {sendMutation.isPending ? t('orders.detailSendPending') : t('orders.detailSendDirect')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => sendMutation.mutate({
                      warehouseId: allocatedWarehouse.id,
                      flowType: '3pl_managed',
                    })}
                    disabled={isAnyActionPending}
                  >
                    {sendMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
                    {sendMutation.isPending ? t('orders.detailSendPending') : t('orders.detailSend3pl')}
                  </Button>
                </>
              )}

              {/* Cancel */}
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setCancelDialogOpen(true)}
                disabled={isAnyActionPending}
              >
                {cancelMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
                {cancelMutation.isPending ? t('orders.detailCancelPending') : t('orders.detailCancel')}
              </Button>
            </ActionToolbar>

            {pendingActionLabel && (
              <p className="text-sm text-muted-foreground">{pendingActionLabel}</p>
            )}

            {/* Allocate Dialog */}
            {showAllocateDialog && (
              <div className="mt-2 rounded-2xl border border-border/60 bg-muted/10 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium">{t('orders.detailSelectWarehouse')}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('orders.detailSelectWarehouseDesc')}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowAllocateDialog(false)}
                    disabled={allocateMutation.isPending}
                  >
                    {t('orders.detailCloseAllocate')}
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {warehouses.filter(w => w.status === 'active').map(w => (
                    <Button
                      key={w.id}
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        allocateMutation.mutate({ warehouseId: w.id });
                        setShowAllocateDialog(false);
                      }}
                      disabled={isAnyActionPending}
                    >
                      {allocateMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
                      {w.code}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Order Items */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Package className="size-4" />{t('orders.cardItems')}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('orders.colSku')}</TableHead>
                <TableHead>{t('products.colProduct')}</TableHead>
                <TableHead className="text-right">{t('orders.colQty')}</TableHead>
                <TableHead className="text-right">{t('orders.colUnitPrice')}</TableHead>
                <TableHead className="text-right">{t('orders.colTotal')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {t('orders.detailNoItems')}
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <SkuBadge sku={item.sku} size="compact" />
                    </TableCell>
                    <TableCell className="font-medium text-sm">{item.product_name}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatLocalizedMoney(locale, item.price_per_unit, order.currency)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatLocalizedMoney(locale, item.quantity * item.price_per_unit, order.currency)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Reservations */}
      {reservations.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">{t('orders.reservationsTitle')}</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('orders.colSku')}</TableHead>
                  <TableHead>{t('orders.colWarehouse')}</TableHead>
                  <TableHead className="text-right">{t('orders.colQty')}</TableHead>
                  <TableHead>{t('orders.colStatus')}</TableHead>
                  <TableHead>{t('orders.colDate')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reservations.map((res) => (
                  <TableRow key={res.id}>
                    <TableCell>
                      <SkuBadge sku={res.sku?.sku_code ?? res.sku_id} size="compact" />
                    </TableCell>
                    <TableCell className="text-sm">{res.warehouse?.code ?? res.warehouse_id}</TableCell>
                    <TableCell className="text-right font-semibold">{res.qty}</TableCell>
                    <TableCell>
                      <StatusBadge status={res.status} domain="reservation" />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatLocalizedDate(locale, res.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Event Timeline */}
      {events.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">{t('orders.tabTimeline')}</CardTitle></CardHeader>
          <CardContent>
            <OrderEventTimeline events={events} />
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        title={t('orders.detailCancelTitle')}
        description={t('orders.detailCancelDesc')}
        confirmText={t('orders.detailCancel')}
        confirmingText={t('orders.detailCancelPending')}
        cancelText={t('orders.detailKeepOrder')}
        variant="destructive"
        isConfirming={cancelMutation.isPending}
        onConfirm={() => cancelMutation.mutate()}
      />
    </div>
  );
}
