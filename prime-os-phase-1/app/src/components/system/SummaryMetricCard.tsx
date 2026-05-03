import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  getSemanticBorderToneClassName,
  getSemanticSurfaceToneClassName,
  type SemanticTone,
} from '@/components/system/semantic-helpers';

interface SummaryMetricCardProps {
  label: string;
  value: ReactNode;
  meta?: ReactNode;
  status?: ReactNode;
  icon?: ReactNode;
  tone?: SemanticTone;
  className?: string;
  valueClassName?: string;
  loading?: boolean;
}

export function SummaryMetricCard({
  label,
  value,
  meta,
  status,
  icon,
  tone = 'muted',
  className,
  valueClassName,
  loading = false,
}: SummaryMetricCardProps) {
  return (
    <Card className={cn('relative overflow-hidden border', getSemanticBorderToneClassName(tone), className)} aria-busy={loading}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              {loading ? <Skeleton className="h-3 w-24 rounded-full" /> : label}
            </p>
            <div className={cn('font-display data-number mt-2 min-h-[2rem] text-2xl font-semibold text-foreground', valueClassName)}>
              {loading ? <Skeleton className="h-8 w-20 rounded-md" /> : value}
            </div>
            {status ? (
              <div className="mt-2">{loading ? <Skeleton className="h-5 w-24 rounded-full" /> : status}</div>
            ) : null}
            {meta && (
              <div className="mt-1 text-xs text-muted-foreground">
                {loading ? <Skeleton className="h-3 w-40 rounded-full" /> : meta}
              </div>
            )}
          </div>
          {icon && (
            <div className={cn('rounded-xl p-2.5', loading ? 'bg-muted/70' : getSemanticSurfaceToneClassName(tone))}>
              {loading ? <Skeleton className="size-5 rounded-md" /> : icon}
            </div>
          )}
        </div>
      </CardContent>
      <div className={cn('pointer-events-none absolute inset-x-5 bottom-0 h-px', getSemanticSurfaceToneClassName(tone))} />
    </Card>
  );
}
