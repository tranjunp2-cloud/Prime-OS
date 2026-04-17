import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getStatusMeta } from '@/components/system/semantic-helpers';

interface WarehouseStatusBadgeProps {
  status: string;
  className?: string;
}

export function WarehouseStatusBadge({ status, className }: WarehouseStatusBadgeProps) {
  const meta = getStatusMeta('warehouse', status);
  return (
    <Badge variant="secondary" className={cn(meta.className, className)}>
      {meta.label}
    </Badge>
  );
}
