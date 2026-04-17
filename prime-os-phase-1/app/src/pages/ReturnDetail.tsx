import { useParams } from 'react-router-dom';
import { ArrowLeft, Package, RotateCcw, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { PageHeader } from '@/components/system/PageHeader';
import { DetailInfoCard } from '@/components/system/DetailInfoCard';
import { EmptyState } from '@/components/system/EmptyState';
import { SkuBadge } from '@/components/system/SkuBadge';
import { ReturnStatusStepper } from '@/components/fulfillment/ReturnStatusStepper';
import { QCDialog } from '@/components/fulfillment/QCDialog';
import { DispositionDialog } from '@/components/fulfillment/DispositionDialog';
import { ReturnStatusBadge } from '@/components/fulfillment/ReturnStatusBadge';
import { useReturn, useReturnItems, useUpdateReturnItem, useRestockReturnItem } from '@/hooks/use-returns';
import { useDetailNavigation } from '@/hooks/use-detail-navigation';
import { useState } from 'react';
import type { ReturnItemUiModel } from '@/lib/contracts/returns';
import { useI18n } from '@/lib/i18n/I18nContext';
import { formatLocalizedDate, formatLocalizedMoney, formatMessage } from '@/lib/i18n/format';

export default function ReturnDetail() {
  const { id } = useParams<{ id: string }>();
  const { locale, t } = useI18n();
  const [qcItem, setQcItem] = useState<ReturnItemUiModel | null>(null);
  const [dispositionItem, setDispositionItem] = useState<ReturnItemUiModel | null>(null);
  const { backLabel, goBack } = useDetailNavigation('/returns', t('returnsPage.pageTitle'));

  const { data: ret, isLoading } = useReturn(id);
  const { data: items = [] } = useReturnItems(id);

  const updateItemMut = useUpdateReturnItem();
  const restockMut = useRestockReturnItem();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-6 lg:p-8">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (!ret) {
    return (
      <EmptyState
        title={t('returnsPage.detailNotFound')}
        description={t('returnsPage.detailNotFoundDesc')}
        icon={<RotateCcw />}
        variant="unavailable"
        className="mx-6 mt-6 lg:mx-8"
        action={(
          <Button variant="outline" onClick={goBack}>
            <ArrowLeft className="mr-1 size-3.5" />
            {t('returnsPage.detailBack')}
          </Button>
        )}
      />
    );
  }

  const qcedItems = items.filter(i => i.qc_outcome != null);
  const pendingQC = items.filter(i => i.qc_outcome == null);
  const dispositionedItems = items.filter(i => i.disposition != null);

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 overflow-x-auto">
      {/* Header */}
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="size-8" onClick={goBack} aria-label={`Back to ${backLabel}`}>
              <ArrowLeft className="size-4" />
            </Button>
            <span>RMA {ret.display_rma}</span>
          </div>
        }
        description={
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <ReturnStatusBadge status={ret.status} />
            {ret.display_order_id && (
              <Badge variant="outline" className="text-xs">
                {formatMessage(t('returnsPage.detailOrder'), { id: ret.display_order_id })}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {formatMessage(t('returnsPage.detailItemsCount'), {
                count: items.length,
                suffix: locale === 'en-US' && items.length !== 1 ? 's' : '',
              })}
            </Badge>
          </div>
        }
      />

      {/* Status Stepper */}
      <Card>
        <CardContent className="p-5">
          <ReturnStatusStepper currentStatus={ret.status} />
        </CardContent>
      </Card>

      {/* Return Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <DetailInfoCard label={t('returnsPage.detailCustomer')} value={ret.display_customer_name} />
        <DetailInfoCard label={t('returnsPage.colReason')} value={ret.display_reason ?? '—'} />
        <DetailInfoCard
          label={t('returnsPage.detailRefundAmount')}
          value={formatLocalizedMoney(locale, ret.total_refund_amount, 'JPY')}
        />
        <DetailInfoCard
          label={t('returnsPage.detailCreated')}
          value={formatLocalizedDate(locale, ret.created_at)}
        />
      </div>

      {/* Return Items */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Package className="size-4" />
            {formatMessage(t('returnsPage.detailItemsTitle'), { count: items.length })}
            {pendingQC.length > 0 && (
              <Badge variant="destructive" className="text-xs ml-2">
                {formatMessage(t('returnsPage.detailPendingQc'), { count: pendingQC.length })}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">{t('returnsPage.detailNoItems')}</div>
          ) : (
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead>{t('orders.colSku')}</TableHead>
                  <TableHead>{t('products.colProduct')}</TableHead>
                  <TableHead className="text-center">{t('returnsPage.detailExpected')}</TableHead>
                  <TableHead className="text-center">{t('returnsPage.detailReceived')}</TableHead>
                  <TableHead className="text-center">{t('returnsPage.detailGrade')}</TableHead>
                  <TableHead>{t('returnsPage.detailQcResult')}</TableHead>
                  <TableHead>{t('returnsPage.detailDisposition')}</TableHead>
                  <TableHead className="w-40">{t('returnsPage.detailActions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <SkuBadge sku={item.display_sku_code} size="compact" />
                    </TableCell>
                    <TableCell className="text-sm">{item.display_product_name}</TableCell>
                    <TableCell className="text-center">{item.quantity_expected}</TableCell>
                    <TableCell className="text-center">{item.quantity_received ?? '—'}</TableCell>
                    <TableCell className="text-center">
                      {item.qc_grade ? (
                        <Badge className={`text-xs ${
                          item.qc_grade === 'A' ? 'bg-emerald-500/14 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' :
                          item.qc_grade === 'B' ? 'bg-sky-500/14 text-sky-700 dark:bg-sky-500/18 dark:text-sky-300' :
                          item.qc_grade === 'C' ? 'bg-amber-500/14 text-amber-800 dark:bg-amber-500/18 dark:text-amber-300' :
                          'bg-rose-500/14 text-rose-700 dark:bg-rose-500/18 dark:text-rose-300'
                        }`}>{item.qc_grade}</Badge>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      {item.qc_outcome === 'pass' && <Badge variant="default" className="bg-emerald-500/14 text-xs gap-1 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"><CheckCircle className="size-3" />{t('returnsPage.detailPass')}</Badge>}
                      {item.qc_outcome === 'fail' && <Badge variant="destructive" className="text-xs gap-1"><AlertTriangle className="size-3" />{t('returnsPage.detailFail')}</Badge>}
                      {!item.qc_outcome && <Badge variant="outline" className="text-xs text-muted-foreground">{t('returnsPage.detailPending')}</Badge>}
                    </TableCell>
                    <TableCell>
                      {item.disposition ? (
                        <Badge variant="outline" className="text-xs">{item.disposition}</Badge>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {item.qc_outcome == null && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setQcItem(item)}
                          >
                            {t('returnsPage.detailQcAction')}
                          </Button>
                        )}
                        {item.qc_outcome != null && item.disposition == null && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setDispositionItem(item)}
                          >
                            {t('returnsPage.detailDispositionAction')}
                          </Button>
                        )}
                        {item.disposition === 'restock' && (
                          <Badge variant="default" className="h-7 gap-1 bg-emerald-500/14 text-xs text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                            <CheckCircle className="size-3" />{t('returnsPage.detailRestocked')}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* QC Summary */}
      {qcedItems.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{t('returnsPage.detailQcSummary')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6 text-sm">
              <div>
                <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                  {formatMessage(t('returnsPage.detailPassedCount'), {
                    count: qcedItems.filter(i => i.qc_outcome === 'pass').length,
                  })}
                </span>
              </div>
              <div>
                <span className="font-semibold text-destructive">
                  {formatMessage(t('returnsPage.detailFailedCount'), {
                    count: qcedItems.filter(i => i.qc_outcome === 'fail').length,
                  })}
                </span>
              </div>
              <div>
                <span className="font-semibold text-sky-700 dark:text-sky-300">
                  {formatMessage(t('returnsPage.detailRestockedCount'), {
                    count: dispositionedItems.filter(i => i.disposition === 'restock').length,
                  })}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      {qcItem && (
        <QCDialog
          open={!!qcItem}
          onOpenChange={v => { if (!v) setQcItem(null); }}
          item={qcItem}
          onSubmit={async ({ grade, outcome, notes }) => {
            if (!qcItem) return;
            await updateItemMut.mutateAsync({
              id: qcItem.id,
              qc_grade: grade,
              qc_outcome: outcome,
              notes,
            });
            setQcItem(null);
          }}
          isLoading={updateItemMut.isPending}
        />
      )}

      {dispositionItem && (
        <DispositionDialog
          open={!!dispositionItem}
          onOpenChange={v => { if (!v) setDispositionItem(null); }}
          item={dispositionItem}
          onSubmit={async ({ disposition, reason }) => {
            if (!dispositionItem) return;
            if (disposition === 'restock') {
              await restockMut.mutateAsync({
                returnItemId: dispositionItem.id,
                skuId: dispositionItem.sku_id,
                warehouseId: '', // would be selected in real UI
                quantity: dispositionItem.quantity_received ?? 0,
              });
            } else {
              await updateItemMut.mutateAsync({
                id: dispositionItem.id,
                disposition,
                disposition_reason: reason,
              });
            }
            setDispositionItem(null);
          }}
          isLoading={updateItemMut.isPending || restockMut.isPending}
        />
      )}
    </div>
  );
}
