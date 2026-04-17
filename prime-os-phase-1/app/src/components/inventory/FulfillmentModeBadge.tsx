import { Badge } from '@/components/ui/badge';

const modeConfig: Record<string, { label: string; className: string }> = {
  seller_fulfilled:    { label: 'CR Direct', className: 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/12 dark:text-emerald-300' },
  marketplace_observer:{ label: 'Marketplace', className: 'bg-amber-500/10 text-amber-800 dark:bg-amber-500/12 dark:text-amber-300' },
  third_party_3pl:     { label: '3PL', className: 'bg-violet-500/10 text-violet-700 dark:bg-violet-500/12 dark:text-violet-300' },
  fba:                 { label: 'FBA', className: 'bg-orange-500/10 text-orange-700 dark:bg-orange-500/12 dark:text-orange-300' },
};

interface FulfillmentModeBadgeProps {
  mode: string;
  className?: string;
}

export function FulfillmentModeBadge({ mode, className }: FulfillmentModeBadgeProps) {
  const config = modeConfig[mode] ?? { label: mode, className: 'bg-muted text-muted-foreground' };
  return (
    <Badge className={`text-xs font-medium ${config.className} ${className ?? ''}`}>
      {config.label}
    </Badge>
  );
}
