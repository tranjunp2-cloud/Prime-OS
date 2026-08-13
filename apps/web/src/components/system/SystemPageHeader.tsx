import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type SystemPageHeaderVariant = 'workspace' | 'collection' | 'detail';

interface SystemPageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  metadata?: ReactNode;
  status?: ReactNode;
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode;
  navigation?: ReactNode;
  variant?: SystemPageHeaderVariant;
  className?: string;
}

export function SystemPageHeader({
  title,
  description,
  icon: Icon,
  metadata,
  status,
  primaryAction,
  secondaryActions,
  navigation,
  variant = 'workspace',
  className,
}: SystemPageHeaderProps) {
  return (
    <header className={cn('shrink-0 border-b border-border', className)}>
      <div className="flex flex-col gap-4 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {Icon ? (
            <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-md border border-border bg-card text-primary shadow-sm">
              <Icon className="size-4" />
            </span>
          ) : null}
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {typeof title === 'string' ? (
                <h1 className={cn('font-display font-semibold leading-tight tracking-normal text-foreground', variant === 'detail' ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl')}>{title}</h1>
              ) : (
                <div className={cn('font-display font-semibold leading-tight tracking-normal text-foreground', variant === 'detail' ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl')}>{title}</div>
              )}
              {status}
            </div>
            {description ? <div className="mt-1 max-w-3xl text-sm font-medium leading-5 text-muted-foreground">{description}</div> : null}
            {metadata ? <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">{metadata}</div> : null}
          </div>
        </div>
        {(primaryAction || secondaryActions) ? (
          <div className="flex min-w-0 flex-wrap items-center gap-2 lg:max-w-[60%] lg:justify-end">
            {secondaryActions}
            {primaryAction}
          </div>
        ) : null}
      </div>
      {navigation ? <div className="-mt-1 pb-3">{navigation}</div> : null}
    </header>
  );
}
