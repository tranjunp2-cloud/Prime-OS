import { ClipboardList, Package2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useI18n } from '@/lib/i18n/I18nContext';
import { formatMessage } from '@/lib/i18n/format';
import { getLocalizedDispositionLabel, getLocalizedQcOutcomeLabel } from '@/lib/i18n/ops-labels';
import type { ReturnItem } from '@/lib/partner-types';
import type { ReturnQueueFilter, ReturnReviewStats } from '@/lib/return-detail-utils';
import { cn } from '@/lib/utils';
import { SkuBadge } from '@/components/system/SkuBadge';

interface ReturnReviewQueueProps {
  items: ReturnItem[];
  selectedItemId: string | null;
  filter: ReturnQueueFilter;
  stats: ReturnReviewStats;
  onFilterChange: (filter: ReturnQueueFilter) => void;
  onSelect: (itemId: string) => void;
}

function getOutcomeBadgeClass(qcOutcome: ReturnItem['qc_outcome']) {
  if (qcOutcome === 'pass') return 'border border-emerald-500/15 bg-emerald-500/10 text-emerald-200 shadow-none';
  if (qcOutcome === 'fail') return 'border border-destructive/15 bg-destructive/10 text-destructive shadow-none';
  return 'border border-edge-divider/70 bg-surface-hover/62 text-muted-foreground shadow-none';
}

export function ReturnReviewQueue({
  items,
  selectedItemId,
  filter,
  stats,
  onFilterChange,
  onSelect,
}: ReturnReviewQueueProps) {
  const { t } = useI18n();

  return (
    <div className="surface-solid rounded-lg border border-edge-divider/55 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {t('fulfillment.returnDetail.queueLabel')}
          </p>
          <h3 className="mt-1 text-lg font-semibold tracking-[-0.03em] text-foreground">
            {t('fulfillment.returnDetail.queueTitle')}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('fulfillment.returnDetail.queueDesc')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="border-edge-divider/70 bg-surface-hover/70 text-foreground">
            {formatMessage(t('fulfillment.returnDetail.reviewedCount'), {
              reviewed: String(stats.reviewed),
              total: String(stats.total),
            })}
          </Badge>
          <Badge variant="outline" className="border-edge-divider/70 bg-transparent text-muted-foreground">
            {formatMessage(t('fulfillment.returnDetail.pendingCount'), { count: String(stats.pending) })}
          </Badge>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {([
          ['pending', t('fulfillment.returnDetail.filterPending')],
          ['reviewed', t('fulfillment.returnDetail.filterReviewed')],
          ['all', t('fulfillment.returnDetail.filterAll')],
        ] as const).map(([value, label]) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={filter === value ? 'secondary' : 'ghost'}
            className={cn(
              'rounded-full px-3',
              filter === value
                ? 'border border-primary/20 bg-primary/12 text-primary hover:bg-primary/15'
                : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={() => onFilterChange(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="mt-5 rounded-lg border border-dashed border-edge-divider/60 bg-background/20 px-4 py-10 text-center">
          <ClipboardList className="mx-auto size-8 text-muted-foreground/70" />
          <p className="mt-3 text-sm font-medium text-foreground">{t('fulfillment.returnDetail.queueEmptyTitle')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('fulfillment.returnDetail.queueEmptyDesc')}</p>
        </div>
      ) : (
        <ScrollArea className="mt-5 max-h-[58vh] pr-1">
          <div className="flex flex-col gap-3">
            {items.map((item) => {
              const isSelected = item.id === selectedItemId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item.id)}
                  className={cn(
                    'w-full rounded-lg border px-4 py-3 text-left transition-all duration-200',
                    isSelected
                      ? 'border-primary/30 bg-primary/10 shadow-[0_0_0_1px_rgba(99,102,241,0.15)]'
                      : 'border-edge-divider/55 bg-background/25 hover:border-edge-highlight/20 hover:bg-surface-hover/40'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Package2 className="size-4 text-muted-foreground" />
                        <p className="truncate text-sm font-semibold text-foreground">{item.sku?.product?.title || '—'}</p>
                      </div>
                      {item.sku?.variation_name && (
                        <p className="mt-1 truncate pl-6 text-xs text-muted-foreground">{item.sku.variation_name}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="shrink-0 border-edge-divider/70 bg-transparent text-foreground">
                      {formatMessage(t('fulfillment.returnDetail.qtyShort'), { count: String(item.qty) })}
                    </Badge>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 pl-6">
                    <SkuBadge sku={item.sku?.sku_code} size="compact" />
                    <Badge className={getOutcomeBadgeClass(item.qc_outcome)}>
                      {getLocalizedQcOutcomeLabel(item.qc_outcome, t)}
                    </Badge>
                    <Badge variant="secondary" className="border-edge-divider/70 bg-surface-hover/70 text-foreground">
                      {getLocalizedDispositionLabel(item.disposition, t)}
                    </Badge>
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
