import { AlertTriangle, Clock3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getSlaMeta, getSlaTextClassName, type SlaState } from '@/components/system/semantic-helpers';

interface SlaIndicatorProps {
  state: SlaState;
  className?: string;
  label?: string;
  variant?: 'badge' | 'text';
  showIcon?: boolean;
}

export function SlaIndicator({
  state,
  className,
  label,
  variant = 'badge',
  showIcon = true,
}: SlaIndicatorProps) {
  const meta = getSlaMeta(state);
  const content = label ?? meta.label;
  const Icon = state === 'overdue' ? AlertTriangle : Clock3;

  if (variant === 'text') {
    return (
      <span className={cn('inline-flex items-center gap-1 text-sm', getSlaTextClassName(state), className)}>
        {showIcon && <Icon className="size-3.5" />}
        {content}
      </span>
    );
  }

  return (
    <Badge
      variant={state === 'overdue' ? 'destructive' : state === 'at_risk' ? 'warning' : 'secondary'}
      className={cn(state !== 'overdue' && meta.className, className)}
    >
      {showIcon && <Icon className="size-3" />}
      {content}
    </Badge>
  );
}
