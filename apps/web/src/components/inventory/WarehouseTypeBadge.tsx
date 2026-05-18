import { Badge } from '@/components/ui/badge';

const typeConfig: Record<string, { label: string; className: string }> = {
  internal: { label: 'Internal', className: 'bg-sky-500/14 text-sky-700 dark:bg-sky-500/18 dark:text-sky-300' },
  fba:     { label: 'FBA', className: 'bg-amber-500/16 text-amber-800 dark:bg-amber-500/18 dark:text-amber-300' },
  fbs:     { label: 'FBS', className: 'bg-orange-500/14 text-orange-700 dark:bg-orange-500/18 dark:text-orange-300' },
  '3pl':   { label: '3PL', className: 'bg-violet-500/14 text-violet-700 dark:bg-violet-500/18 dark:text-violet-300' },
  virtual: { label: 'Virtual', className: 'bg-muted text-muted-foreground' },
};

interface WarehouseTypeBadgeProps {
  type: string;
  className?: string;
}

export function WarehouseTypeBadge({ type, className }: WarehouseTypeBadgeProps) {
  const config = typeConfig[type] ?? { label: type, className: 'bg-muted text-muted-foreground' };
  return (
    <Badge className={`text-xs font-medium ${config.className} ${className ?? ''}`}>
      {config.label}
    </Badge>
  );
}
