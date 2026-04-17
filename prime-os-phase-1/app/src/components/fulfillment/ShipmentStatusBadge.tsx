import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ShipmentStatus } from '@/lib/fulfillment-types';
import { getStatusMeta } from '@/components/system/semantic-helpers';

interface ShipmentStatusBadgeProps {
  status: ShipmentStatus | string;
  className?: string;
}

export function ShipmentStatusBadge({ status, className }: ShipmentStatusBadgeProps) {
  const meta = getStatusMeta('shipment', status as ShipmentStatus);
  return (
    <Badge variant="secondary" className={cn(meta.className, className)}>
      {meta.label}
    </Badge>
  );
}
