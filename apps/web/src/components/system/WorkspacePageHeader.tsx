import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { SystemPageHeader } from '@/components/system/SystemPageHeader';

interface WorkspacePageHeaderProps {
  title: string;
  description: string;
  icon: LucideIcon;
  actions?: ReactNode;
  className?: string;
}

export function WorkspacePageHeader({
  title,
  description,
  icon: Icon,
  actions,
  className,
}: WorkspacePageHeaderProps) {
  return (
    <SystemPageHeader
      title={title}
      description={description}
      icon={Icon}
      secondaryActions={actions}
      variant="workspace"
      className={className}
    />
  );
}
