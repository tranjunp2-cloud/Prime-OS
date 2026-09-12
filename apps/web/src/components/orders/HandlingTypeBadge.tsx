import { orderHandlingLabel, type OrderRecord } from '@/lib/orders-api';
import { cn } from '@/lib/utils';

export function HandlingTypeBadge({ order }: { order: OrderRecord }) {
  const type = order.metadata.handlingType;
  return <span className={cn(
    'inline-flex whitespace-nowrap rounded-md border px-2 py-1 text-xs font-medium',
    type === 'self'
      ? 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-300'
      : type === 'marketplace'
        ? 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-300'
        : 'border-border bg-muted/40 text-muted-foreground',
  )}>{orderHandlingLabel(order)}</span>;
}
