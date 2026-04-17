import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PartnerStatus } from '@/lib/partner-types';
import { getStatusMeta } from '@/components/system/semantic-helpers';

interface PartnerStatusBadgeProps {
  status: PartnerStatus;
  className?: string;
}

export function PartnerStatusBadge({ status, className }: PartnerStatusBadgeProps) {
  const meta = getStatusMeta('partner', status);
  return (
    <Badge variant="secondary" className={cn(meta.className, className)}>
      {meta.label}
    </Badge>
  );
}
