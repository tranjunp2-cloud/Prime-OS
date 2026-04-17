import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getStatusMeta } from '@/components/system/semantic-helpers';

interface ReturnStatusBadgeProps {
  status: string;
  className?: string;
}

export function ReturnStatusBadge({ status, className }: ReturnStatusBadgeProps) {
  const meta = getStatusMeta('returns', status);
  return (
    <Badge variant="secondary" className={cn(meta.className, className)}>
      {meta.label}
    </Badge>
  );
}
