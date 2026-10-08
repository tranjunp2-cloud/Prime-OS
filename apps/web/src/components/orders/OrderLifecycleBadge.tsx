import { orderStageLabels } from '@/lib/orders-api';
import { cn } from '@/lib/utils';

export function OrderLifecycleBadge({ status }: { status: string }) {
  const tone = status === orderStageLabels.confirmation
    ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
    : status === orderStageLabels.preparing
      ? 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300'
      : status === orderStageLabels.ready
        ? 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300'
        : status === orderStageLabels.shipping
          ? 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300'
          : status === orderStageLabels.delivered
            ? 'border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300'
            : status === orderStageLabels.completed
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : 'border-border bg-muted text-muted-foreground';
  return <span className={cn('inline-flex whitespace-nowrap rounded-md border px-2 py-1 text-xs font-semibold', tone)}>{status}</span>;
}
