import { Badge } from '@/components/ui/badge';

const typeConfig: Record<string, { label: string; className: string }> = {
  RESERVE:      { label: 'Reserve', className: 'bg-violet-500/14 text-violet-700 dark:bg-violet-500/18 dark:text-violet-300' },
  RELEASE:      { label: 'Release', className: 'bg-muted text-muted-foreground' },
  SHIP:         { label: 'Ship', className: 'bg-teal-500/14 text-teal-700 dark:bg-teal-500/18 dark:text-teal-300' },
  RETURN:       { label: 'Return', className: 'bg-orange-500/14 text-orange-700 dark:bg-orange-500/18 dark:text-orange-300' },
  ADJUST:       { label: 'Adjust', className: 'bg-sky-500/14 text-sky-700 dark:bg-sky-500/18 dark:text-sky-300' },
  REPLENISH:    { label: 'Replenish', className: 'bg-emerald-500/14 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' },
  RECEIVE:      { label: 'Receive', className: 'bg-indigo-500/14 text-indigo-700 dark:bg-indigo-500/18 dark:text-indigo-300' },
  TRANSFER_IN:  { label: 'Transfer In', className: 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/12 dark:text-emerald-300' },
  TRANSFER_OUT: { label: 'Transfer Out', className: 'bg-rose-500/10 text-rose-700 dark:bg-rose-500/12 dark:text-rose-300' },
};

interface MovementTypeBadgeProps {
  type: string;
  className?: string;
}

export function MovementTypeBadge({ type, className }: MovementTypeBadgeProps) {
  const config = typeConfig[type] ?? { label: type, className: 'bg-muted text-muted-foreground' };
  return (
    <Badge className={`text-xs font-medium ${config.className} ${className ?? ''}`}>
      {config.label}
    </Badge>
  );
}
