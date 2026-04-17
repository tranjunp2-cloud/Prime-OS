import * as React from 'react';
import { cn } from '@/lib/utils';

type DivProps = React.HTMLAttributes<HTMLDivElement>;

export function GlassPanel({ className, ...props }: DivProps) {
  return <div className={cn('surface-glass rounded-3xl', className)} {...props} />;
}

export function SolidPanel({ className, ...props }: DivProps) {
  return <div className={cn('surface-solid rounded-3xl', className)} {...props} />;
}

export function ToolbarSurface({ className, ...props }: DivProps) {
  return <div className={cn('surface-toolbar rounded-[1.75rem] hairline-highlight', className)} {...props} />;
}

export function WorkspacePane({ className, ...props }: DivProps) {
  return <div className={cn('surface-workspace rounded-[2rem] hairline-highlight', className)} {...props} />;
}
