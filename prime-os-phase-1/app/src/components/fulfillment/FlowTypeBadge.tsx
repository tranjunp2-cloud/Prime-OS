import { Badge } from '@/components/ui/badge';
import type { FlowType } from '@/lib/fulfillment-types';

const config: Record<FlowType, { label: string; className: string }> = {
  seller_fulfilled: { label: 'CR Direct', className: 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/12 dark:text-emerald-300' },
  marketplace_observer: { label: 'Marketplace', className: 'bg-amber-500/10 text-amber-800 dark:bg-amber-500/12 dark:text-amber-300' },
  third_party_3pl: { label: '3PL', className: 'bg-violet-500/10 text-violet-700 dark:bg-violet-500/12 dark:text-violet-300' },
  fba: { label: 'FBA', className: 'bg-orange-500/10 text-orange-700 dark:bg-orange-500/12 dark:text-orange-300' },
};

interface FlowTypeBadgeProps {
  flowType: FlowType | string;
  className?: string;
}

export function FlowTypeBadge({ flowType, className }: FlowTypeBadgeProps) {
  const c = config[flowType as FlowType] ?? { label: flowType, className: 'bg-muted text-muted-foreground' };
  return (
    <Badge className={`text-xs font-medium ${c.className} ${className ?? ''}`}>
      {c.label}
    </Badge>
  );
}
