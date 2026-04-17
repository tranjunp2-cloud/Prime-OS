import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { getSemanticSurfaceToneClassName, type SemanticTone } from '@/components/system/semantic-helpers';

export interface EmptyStateProps {
    title: string;
    description?: string;
    icon?: ReactNode;
    action?: ReactNode;
    className?: string;
    variant?: 'empty' | 'filtered' | 'unavailable' | 'error';
}

const variantToneMap: Record<NonNullable<EmptyStateProps['variant']>, SemanticTone> = {
  empty: 'muted',
  filtered: 'info',
  unavailable: 'warning',
  error: 'danger',
};

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
  variant = 'empty',
}: EmptyStateProps) {
  const tone = variantToneMap[variant];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-[1.75rem] border border-border/60 bg-card px-6 py-12 text-center text-card-foreground',
        className,
      )}
    >
      {icon && (
        <div className={cn('mb-4 flex size-12 items-center justify-center rounded-full [&>svg]:size-6', getSemanticSurfaceToneClassName(tone))}>
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold tracking-tight text-foreground">{title}</h3>
      {description && (
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
