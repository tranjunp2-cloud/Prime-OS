import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import type { AlertSeverity } from '@/lib/dashboard/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getAlertSeverityMeta } from '@/components/system/semantic-helpers';

interface AlertSeverityBadgeProps {
  severity: AlertSeverity;
  className?: string;
}

const severityIcons = {
  CRITICAL: AlertCircle,
  WARNING: AlertTriangle,
  INFO: Info,
} as const;

export function AlertSeverityBadge({ severity, className }: AlertSeverityBadgeProps) {
  const meta = getAlertSeverityMeta(severity);
  const Icon = severityIcons[severity];

  return (
    <Badge
      variant="secondary"
      className={cn('border border-transparent px-2.5 py-1 text-[11px] font-semibold', meta.className, className)}
      aria-label={`${meta.label}: ${meta.description}`}
      title={meta.description}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {meta.label}
    </Badge>
  );
}
