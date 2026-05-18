import { Badge } from '@/components/ui/badge';

const CAPABILITY_LABELS: Record<string, string> = {
  pick_pack: 'Pick & Pack',
  cold_storage: 'Cold Storage',
  fragile_handling: 'Fragile',
  hazmat: 'Hazmat',
  oversize: 'Oversize',
  oversized: 'Oversized',
  same_day: 'Same Day',
  cross_border: 'Cross Border',
  marketplace_fulfillment: 'Marketplace Fulfillment',
  prime: 'Prime',
};

function humanizeCapability(capability: string) {
  return capability
    .split(/[_-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

interface WarehouseCapabilityBadgesProps {
  capabilities?: string[];
  tags?: string[];
  maxVisible?: number;
  className?: string;
}

export function WarehouseCapabilityBadges({ capabilities, tags, className }: WarehouseCapabilityBadgesProps) {
  const items = capabilities ?? tags ?? [];
  if (!items.length) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="flex gap-1 flex-wrap">
      {items.map(cap => (
        <Badge key={cap} variant="outline" className={`text-xs ${className ?? ''}`}>
          {CAPABILITY_LABELS[cap] ?? humanizeCapability(cap)}
        </Badge>
      ))}
    </div>
  );
}
