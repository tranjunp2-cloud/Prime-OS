import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getStatusMeta, type StatusDomain } from '@/components/system/semantic-helpers';

interface StatusBadgeProps {
  status: string;
  domain?: StatusDomain;
  className?: string;
  fallbackLabel?: string;
}

export function StatusBadge({ status, domain, className, fallbackLabel }: StatusBadgeProps) {
  if (!domain) {
    return (
      <Badge variant="secondary" className={cn(className)}>
        {fallbackLabel ?? status}
      </Badge>
    );
  }

  const meta = getStatusMeta(domain, status);

  return (
    <Badge variant="secondary" className={cn(meta.className, className)}>
      {meta.label}
    </Badge>
  );
}
