import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { SystemPageHeader } from '@/components/system/SystemPageHeader';
import { useInRouterContext } from 'react-router-dom';
import { DemoDataModeToggle } from '@/components/shared/DemoDataModeToggle';

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
  const inRouter = useInRouterContext();
  return (
    <SystemPageHeader
      title={title}
      description={description}
      icon={Icon}
      status={titleAccessory ?? (inRouter ? <DemoDataModeToggle /> : undefined)}
      secondaryActions={actions}
      variant="workspace"
      className={className}
    />
  );
}
