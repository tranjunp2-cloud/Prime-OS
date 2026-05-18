import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ToolbarSurface } from '@/components/system/surfaces/PanelSurfaces';

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <ToolbarSurface className={cn('relative overflow-hidden px-4 py-4 sm:px-5 sm:py-4', className)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 max-w-3xl">
          {typeof title === 'string' ? (
            <h1 className="font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h1>
          ) : (
            <div className="font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</div>
          )}
          {description && (
            typeof description === 'string' ? (
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
            ) : (
              <div className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</div>
            )
          )}
        </div>
        {actions && (
          <div className="flex w-full flex-wrap items-center gap-2 self-start lg:w-auto lg:flex-shrink-0 lg:justify-end">
            {actions}
          </div>
        )}
      </div>
    </ToolbarSurface>
  );
}
