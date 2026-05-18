import { Badge } from '@/components/ui/badge';
import type { PartnerType } from '@/lib/partner-types';

const config: Record<PartnerType, { label: string; className: string }> = {
  '3pl': { label: '3PL', className: 'bg-violet-500/14 text-violet-700 dark:bg-violet-500/18 dark:text-violet-300' },
  carrier: { label: 'Carrier', className: 'bg-sky-500/14 text-sky-700 dark:bg-sky-500/18 dark:text-sky-300' },
  supplier: { label: 'Supplier', className: 'bg-orange-500/14 text-orange-700 dark:bg-orange-500/18 dark:text-orange-300' },
  marketplace: { label: 'Marketplace', className: 'bg-teal-500/14 text-teal-700 dark:bg-teal-500/18 dark:text-teal-300' },
};

interface PartnerTypeBadgeProps {
  type: PartnerType;
  className?: string;
}

export function PartnerTypeBadge({ type, className }: PartnerTypeBadgeProps) {
  const cfg = config[type] ?? { label: type, className: 'bg-muted text-muted-foreground' };
  return (
    <Badge className={`text-xs font-medium ${cfg.className} ${className ?? ''}`}>
      {cfg.label}
    </Badge>
  );
}
