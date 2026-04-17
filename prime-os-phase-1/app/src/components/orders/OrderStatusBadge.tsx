import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getStatusMeta } from '@/components/system/semantic-helpers';

interface OrderStatusBadgeProps {
  status: string;
  className?: string;
}

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const meta = getStatusMeta('oms', status);
  return (
    <Badge variant="secondary" className={cn(meta.className, className)}>
      {meta.label}
    </Badge>
  );
}
