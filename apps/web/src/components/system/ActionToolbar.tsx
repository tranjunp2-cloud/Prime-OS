import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ActionToolbarProps {
  children: ReactNode;
  className?: string;
  alwaysVisible?: boolean;
}

export function ActionToolbar({ children, className, alwaysVisible = false }: ActionToolbarProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-1 transition-opacity',
        alwaysVisible ? 'opacity-100' : 'opacity-60 group-hover:opacity-100',
        className,
      )}
    >
      {children}
    </div>
  );
}
