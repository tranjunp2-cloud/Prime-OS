import { Badge } from '@/components/ui/badge';

export type AdjustmentType = 'damage' | 'cycle_count' | 'return_restock' | 'expired' | 'transfer' | 'correction';

const typeConfig: Record<string, { label: string; className: string }> = {
  damage:         { label: 'Damage', className: 'bg-rose-500/14 text-rose-700 dark:bg-rose-500/18 dark:text-rose-300' },
  cycle_count:    { label: 'Cycle Count', className: 'bg-sky-500/14 text-sky-700 dark:bg-sky-500/18 dark:text-sky-300' },
  return_restock: { label: 'Return Restock', className: 'bg-emerald-500/14 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' },
  expired:        { label: 'Expired', className: 'bg-muted text-muted-foreground' },
  transfer:       { label: 'Transfer', className: 'bg-amber-500/14 text-amber-800 dark:bg-amber-500/18 dark:text-amber-300' },
  correction:     { label: 'Correction', className: 'bg-muted text-muted-foreground' },
};

interface AdjustmentTypeBadgeProps {
  type: string;
  className?: string;
}

export function AdjustmentTypeBadge({ type, className }: AdjustmentTypeBadgeProps) {
  const config = typeConfig[type] ?? { label: type, className: 'bg-muted text-muted-foreground' };
  return (
    <Badge className={`text-xs font-medium ${config.className} ${className ?? ''}`}>
      {config.label}
    </Badge>
  );
}
