import type { ReactNode } from 'react';
import { PanelsTopLeft } from 'lucide-react';
import { SystemPageHeader } from '@/components/system/SystemPageHeader';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <SystemPageHeader
      title={title}
      description={description}
      icon={PanelsTopLeft}
      secondaryActions={actions}
      variant="collection"
      className={cn('px-4 pt-4 md:px-6', className)}
    />
  );
}
