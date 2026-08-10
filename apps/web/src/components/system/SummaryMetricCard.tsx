import type { ReactNode } from 'react';
import { Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
  metaTooltip?: ReactNode;
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
  metaTooltip,
  status,
  icon,
  tone = 'muted',
  className,
  valueClassName,
  loading = false,
}: SummaryMetricCardProps) {
  return (
    <Card className={cn('relative overflow-hidden', getSemanticBorderToneClassName(tone), className)} aria-busy={loading}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                {loading ? <Skeleton className="h-3 w-24 rounded-full" /> : label}
              </p>
              {!loading && metaTooltip ? (
                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className="inline-flex size-4 items-center justify-center rounded-full border bg-background text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                        aria-label={`${label} info`}
                      >
                        <Info className="size-3" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-64 text-xs leading-relaxed">
                      {metaTooltip}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : null}
            </div>
            <div className={cn('font-display data-number mt-2 min-h-8 text-2xl font-semibold text-foreground', valueClassName)}>
              {loading ? <Skeleton className="h-8 w-20 rounded-md" /> : value}
            </div>
            {status ? (
              <div className="mt-2">{loading ? <Skeleton className="h-5 w-24 rounded-full" /> : status}</div>
            ) : null}
            {meta && !metaTooltip && (
              <div className="mt-1 text-xs text-muted-foreground">
                {loading ? <Skeleton className="h-3 w-40 rounded-full" /> : meta}
              </div>
            )}
          </div>
          {icon && (
            <div className={cn('rounded-md p-2.5', loading ? 'bg-muted/70' : getSemanticSurfaceToneClassName(tone))}>
              {loading ? <Skeleton className="size-5 rounded-md" /> : icon}
            </div>
          )}
        </div>
      </CardContent>
      <div className={cn('pointer-events-none absolute inset-x-4 bottom-0 h-px', getSemanticSurfaceToneClassName(tone))} />
    </Card>
  );
}
