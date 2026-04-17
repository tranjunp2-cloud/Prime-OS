import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle } from 'lucide-react';
import { isSlaBreached, isSlaAtRisk } from '@/lib/sla-policy-types';

interface SlaBreachBadgeProps {
  deadline: string | Date | null | undefined;
  className?: string;
}

export function SlaBreachBadge({ deadline, className }: SlaBreachBadgeProps) {
  const breached = isSlaBreached(deadline ? new Date(deadline) : null);
  const atRisk = isSlaAtRisk(deadline ? new Date(deadline) : null);

  if (!deadline) return null;

  if (breached) {
    return (
      <Badge variant="destructive" className={`gap-1 ${className ?? ''}`}>
        <AlertTriangle className="size-3" />
        SLA Breached
      </Badge>
    );
  }

  if (atRisk) {
    return (
      <Badge className={`gap-1 bg-orange-500/14 text-orange-700 dark:bg-orange-500/18 dark:text-orange-300 ${className ?? ''}`}>
        <Clock className="size-3" />
        SLA At Risk
      </Badge>
    );
  }

  // Show countdown
  const now = new Date();
  const d = new Date(deadline);
  const diffMs = d.getTime() - now.getTime();
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  const diffM = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  let label = `${diffH}h ${diffM}m`;
  if (diffH > 24) {
    label = `${Math.floor(diffH / 24)}d ${diffH % 24}h`;
  }

  return (
    <Badge variant="outline" className={`gap-1 ${className ?? ''}`}>
      <Clock className="size-3" />
      {label}
    </Badge>
  );
}
