import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { getSemanticTextToneClassName, type SemanticTone } from '@/components/system/semantic-helpers';

interface DetailInfoCardProps {
  label: string;
  value: ReactNode;
  meta?: ReactNode;
  className?: string;
  valueClassName?: string;
  tone?: SemanticTone | 'default';
  truncate?: boolean;
}

export function DetailInfoCard({
  label,
  value,
  meta,
  className,
  valueClassName,
  tone = 'default',
  truncate = true,
}: DetailInfoCardProps) {
  return (
    <Card className={cn('p-4', className)}>
      <div className="mb-1 text-xs text-muted-foreground">{label}</div>
      <div
        className={cn(
          'text-sm font-medium',
          truncate && 'truncate',
          tone !== 'default' && getSemanticTextToneClassName(tone),
          valueClassName,
        )}
      >
        {value}
      </div>
      {meta && <div className="mt-1 text-xs text-muted-foreground">{meta}</div>}
    </Card>
  );
}
