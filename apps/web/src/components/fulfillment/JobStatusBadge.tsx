import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { JobStatus } from '@/lib/fulfillment-types';
import { getStatusMeta } from '@/components/system/semantic-helpers';

interface JobStatusBadgeProps {
  status: JobStatus | string;
  className?: string;
}

export function JobStatusBadge({ status, className }: JobStatusBadgeProps) {
  const meta = getStatusMeta('fulfillment', status as JobStatus);
  return (
    <Badge variant="secondary" className={cn(meta.className, className)}>
      {meta.label}
    </Badge>
  );
}
