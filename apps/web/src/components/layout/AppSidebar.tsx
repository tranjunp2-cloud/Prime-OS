import { NavLink, useLocation } from 'react-router-dom';
import {
  CalendarCheck,
  CircleDollarSign,
  FileText,
  Headphones,
  PlugZap,
  ShoppingCart,
  Sparkles,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import { LanguageToggle } from '@/components/common/LanguageToggle';
import { ThemeModeSwitcher } from '@/components/system/ThemeModeSwitcher';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface AppNavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

const appNavItems: AppNavItem[] = [
  { id: 'overview', label: 'Performance', href: '/overview', icon: Sparkles },
  { id: 'service', label: 'Service', href: '/customer/service', icon: Headphones, badge: '3' },
  { id: 'cos', label: 'COS', href: '/overview?module=cos', icon: ShoppingCart, badge: '2' },
  { id: 'scheduled', label: 'Task', href: '/overview?module=scheduled', icon: CalendarCheck, badge: '3' },
  { id: 'connectors', label: 'Connectors', href: '/overview?module=connectors', icon: PlugZap, badge: '41' },
  { id: 'finance', label: 'Finance', href: '/overview?module=finance', icon: CircleDollarSign },
  { id: 'automation', label: 'Automation', href: '/overview?module=automation', icon: Workflow },
  { id: 'reports', label: 'Client Reports', href: '/client-reports', icon: FileText },
];

function getActiveModule(pathname: string, search: string) {
  if (pathname.startsWith('/client-reports') || pathname.startsWith('/reports')) {
    return 'reports';
  }

  if (pathname.startsWith('/customer/service')) {
    return 'service';
  }

  if (pathname.startsWith('/crm')) {
    return 'service';
  }

  if (pathname !== '/overview') {
    return '';
  }

  const module = new URLSearchParams(search).get('module') || 'overview';

  return module === 'analytics' || module === 'ai' ? 'overview' : module;
}

export function AppSidebar() {
  const location = useLocation();
  const activeModule = getActiveModule(location.pathname, location.search);

  return (
    <aside className="flex h-full w-[4.75rem] shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-[inset_-1px_0_0_hsl(var(--sidebar-border))] md:w-[15rem]">
      <div className="flex h-16 items-center justify-center border-b border-sidebar-border/80 px-3 md:justify-start md:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-md bg-white p-1 shadow-sm">
            <img src="/primeos-mark.png" alt="PrimeOS" className="h-full w-full object-contain" />
          </span>
          <span className="hidden min-w-0 md:block">
            <span className="block truncate text-sm font-semibold text-sidebar-foreground">PrimeOS</span>
            <span className="block truncate text-xs text-sidebar-foreground/55">Control workspace</span>
          </span>
        </div>
      </div>

      <div className="hidden border-b border-sidebar-border/80 px-4 py-3 md:block">
        <div className="rounded-md border border-sidebar-border bg-sidebar-accent/55 p-3">
          <div className="flex items-center justify-between gap-2 text-[11px] font-medium uppercase text-sidebar-foreground/55">
            <span>System</span>
            <span className="flex items-center gap-1.5 text-emerald-200">
              <span className="size-1.5 rounded-full bg-emerald-300" />
              Live
            </span>
          </div>
          <div className="mt-2 text-sm font-semibold leading-none text-sidebar-foreground">Command center</div>
          <div className="mt-1 text-xs text-sidebar-foreground/55">Workspace map</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 md:px-3" aria-label="Primary navigation">
        <div className="grid gap-1.5">
          {appNavItems.map((item) => {
            const Icon = item.icon;
            const active = activeModule === item.id;

            const link = (
              <NavLink
                key={item.id}
                to={item.href}
                aria-label={item.label}
                className={cn(
                  'group flex min-h-10 min-w-0 items-center justify-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring md:justify-start',
                  active
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-[0_8px_22px_hsl(var(--sidebar-primary)/0.22)]'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="hidden min-w-0 flex-1 truncate md:inline">
                  {item.label}
                </span>
                {item.badge ? (
                  <span className={cn(
                    'hidden min-w-6 shrink-0 rounded-md border px-1.5 py-0.5 text-center text-[11px] font-semibold leading-none md:inline-flex md:justify-center',
                    active
                      ? 'border-white/20 bg-white/15 text-sidebar-primary-foreground'
                      : 'border-sidebar-border bg-sidebar-accent/70 text-sidebar-foreground/70'
                  )}>
                    {item.badge}
                  </span>
                ) : null}
              </NavLink>
            );

            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right" className="md:hidden">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-sidebar-border/80 p-2 md:p-3">
        <div className="hidden space-y-2 md:block">
          <LanguageToggle compact className="w-full justify-center border-sidebar-border bg-sidebar-accent/70" />
          <div className="flex items-center gap-2 rounded-md border border-sidebar-border bg-sidebar-accent/45 px-2.5 py-2">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-sidebar-primary/25 text-[11px] font-semibold text-sidebar-foreground">AD</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold text-sidebar-foreground">Admin</span>
              <span className="block truncate text-[11px] text-sidebar-foreground/55">PrimeOS Team</span>
            </span>
          </div>
        </div>
        <div className="grid gap-2 md:hidden">
          <ThemeModeSwitcher compact />
        </div>
      </div>
    </aside>
  );
}
