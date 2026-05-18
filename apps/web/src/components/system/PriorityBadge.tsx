import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getPriorityMeta } from '@/components/system/semantic-helpers';

interface PriorityBadgeProps {
  priority: string | null | undefined;
  className?: string;
  fallbackLabel?: string;
}

export function PriorityBadge({ priority, className, fallbackLabel = '—' }: PriorityBadgeProps) {
  if (!priority) {
    return <span className={cn('text-xs text-muted-foreground', className)}>{fallbackLabel}</span>;
  }

  const meta = getPriorityMeta(priority);
  return (
    <Badge variant="secondary" className={cn(meta.className, className)}>
      {meta.label}
    </Badge>
  );
}
