import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { LifecycleStage } from '@/lib/oms-types';
import { getStatusMeta } from '@/components/system/semantic-helpers';

interface LifecycleStageBadgeProps {
  stage: LifecycleStage;
  className?: string;
}

export function LifecycleStageBadge({ stage, className }: LifecycleStageBadgeProps) {
  const meta = getStatusMeta('oms-lifecycle', stage);
  return (
    <Badge variant="secondary" className={cn(meta.className, className)}>
      {meta.label}
    </Badge>
  );
}
