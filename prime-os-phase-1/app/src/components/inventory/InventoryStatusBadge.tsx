import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getStatusMeta } from '@/components/system/semantic-helpers';
import { Boxes, AlertTriangle, AlertCircle } from 'lucide-react';

export type InventoryHealth = 'healthy' | 'low' | 'critical';

export function computeInventoryStatus(onHand: number, lowThreshold?: number): InventoryHealth {
  if (onHand === 0) return 'critical';
  const threshold = lowThreshold ?? 10;
  if (onHand <= threshold) return 'low';
  return 'healthy';
}

const HEALTH_ICONS: Record<InventoryHealth, React.ReactNode> = {
  healthy: <Boxes className="w-3 h-3" />,
  low: <AlertTriangle className="w-3 h-3" />,
  critical: <AlertCircle className="w-3 h-3" />,
};

interface InventoryStatusBadgeProps {
  status: InventoryHealth | string;
  className?: string;
}

export function InventoryStatusBadge({ status, className }: InventoryStatusBadgeProps) {
  const health = status as InventoryHealth;
  const meta = getStatusMeta('inventory', health);
  return (
    <Badge variant="secondary" className={cn(meta.className, 'flex items-center gap-1', className)}>
      {HEALTH_ICONS[health] ?? HEALTH_ICONS.healthy}
      {meta.label}
    </Badge>
  );
}
