import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: string | number;
  delta?: number;
  sparkline?: number[];
  format?: 'number' | 'currency' | 'percent';
  onClick?: () => void;
  icon?: React.ReactNode;
}

function Sparkline({ data, className }: { data: number[]; className?: string }) {
  if (!data.length) return null;
  
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const width = 80;
  const height = 24;
  const padding = 2;
  
  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1 || 1)) * (width - 2 * padding);
    const y = height - padding - ((value - min) / range) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className={cn('opacity-60', className)}>
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function KPICard({ 
  title, 
  value, 
  delta, 
  sparkline = [], 
  format = 'number',
  onClick,
  icon,
}: KPICardProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'string') return val;
    if (val === 0 && format === 'currency') return '—';
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('ja-JP', { 
          style: 'currency', 
          currency: 'JPY',
          maximumFractionDigits: 0,
        }).format(val);
      case 'percent':
        return `${val.toFixed(1)}%`;
      default:
        return new Intl.NumberFormat('ja-JP').format(val);
    }
  };

  const getDeltaColor = (d: number) => {
    if (d > 0) return 'text-success';
    if (d < 0) return 'text-destructive';
    return 'text-muted-foreground';
  };

  const DeltaIcon = delta !== undefined && delta > 0 
    ? TrendingUp 
    : delta !== undefined && delta < 0 
      ? TrendingDown 
      : Minus;

  return (
    <Card 
      className={cn(
        'transition-all duration-200',
        onClick && 'cursor-pointer hover:shadow-md hover:border-primary/50'
      )}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold tracking-tight">{formatValue(value)}</p>
            
            {delta !== undefined && (
              <div className={cn('flex items-center gap-1 text-xs', getDeltaColor(delta))}>
                <DeltaIcon className="size-3" />
                <span>{delta > 0 ? '+' : ''}{delta.toFixed(1)}%</span>
                <span className="text-muted-foreground">vs prev period</span>
              </div>
            )}
          </div>
          
          <div className="flex flex-col items-end gap-2">
            {icon && (
              <div className="p-2 rounded-md bg-primary/10 text-primary">
                {icon}
              </div>
            )}
            {sparkline.length > 0 && (
              <Sparkline data={sparkline} className="text-primary" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
