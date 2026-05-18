import { Badge } from '@/components/ui/badge';

interface VirtualWarehouseBadgeProps {
  isVirtual?: boolean;
  size?: string;
  showLabel?: boolean;
  className?: string;
}

export function VirtualWarehouseBadge({ isVirtual, className }: VirtualWarehouseBadgeProps) {
  if (!isVirtual) return null;
  return (
    <Badge variant="outline" className={`text-xs gap-1 ${className ?? ''}`}>
      Virtual
    </Badge>
  );
}

interface MarketplaceSyncBadgeProps {
  syncStatus?: string | null;
  className?: string;
}

export function MarketplaceSyncBadge({ syncStatus, className }: MarketplaceSyncBadgeProps) {
  if (!syncStatus) return null;
  const colorMap: Record<string, string> = {
    synced: 'bg-emerald-500/14 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
    syncing: 'bg-sky-500/14 text-sky-700 dark:bg-sky-500/18 dark:text-sky-300',
    error: 'bg-rose-500/14 text-rose-700 dark:bg-rose-500/18 dark:text-rose-300',
  };
  return (
    <Badge className={`text-xs gap-1 ${colorMap[syncStatus] ?? 'bg-muted text-muted-foreground'} ${className ?? ''}`}>
      {syncStatus}
    </Badge>
  );
}
