import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { SystemPageHeader } from '@/components/system/SystemPageHeader';

interface WorkspacePageHeaderProps {
  title: string;
  description: string;
  icon: LucideIcon;
  titleAccessory?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function WorkspacePageHeader({
  title,
  description,
  icon: Icon,
  titleAccessory,
  actions,
  className,
}: WorkspacePageHeaderProps) {
  return (
    <SystemPageHeader
      title={title}
      description={description}
      icon={Icon}
      status={titleAccessory}
      secondaryActions={actions}
      variant="workspace"
      className={className}
    />
  );
}
