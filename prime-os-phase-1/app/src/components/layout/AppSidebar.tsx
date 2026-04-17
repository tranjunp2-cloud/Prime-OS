import { NavLink, useLocation } from 'react-router-dom';
import {
  BarChart3,
  BellRing,
  Bot,
  BrainCircuit,
  ClipboardList,
  Gauge,
  HeartHandshake,
  LayoutDashboard,
  Megaphone,
  MessageSquareText,
  Package,
  RadioTower,
  Route,
  Boxes,
  ShoppingCart,
  Truck,
  ScanSearch,
  Shield,
  Store,
  Target,
  UserRoundCheck,
  Workflow,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeModeSwitcher } from '@/components/system/ThemeModeSwitcher';
import { LanguageToggle } from '@/components/common/LanguageToggle';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  tone?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navigationGroups: NavGroup[] = [
  {
    label: 'Prime OS',
    items: [
      { label: 'Overview', href: '/overview', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Demand Area',
    items: [
      { label: 'Acquisition', href: '/demand/acquisition', icon: RadioTower },
      { label: 'Campaign', href: '/demand/campaign', icon: Megaphone },
      { label: 'Content & Social', href: '/demand/content-social', icon: MessageSquareText },
      { label: 'Lead Capture', href: '/demand/lead-capture', icon: UserRoundCheck },
      { label: 'Retargeting', href: '/demand/retargeting', icon: Target },
    ],
  },
  {
    label: 'Customer Area',
    items: [
      { label: 'CRM Compact', href: '/customer/crm-compact', icon: HeartHandshake },
      { label: 'Service', href: '/customer/service', icon: ClipboardList },
    ],
  },
  {
    label: 'Ecom Area',
    items: [
      { label: 'Commerce Surface', href: '/ecom/commerce-surface', icon: Store },
      { label: 'Product Master', href: '/ecom/cos/product-master', icon: Package, tone: 'COS' },
      { label: 'Inventory Brain', href: '/ecom/cos/inventory-brain', icon: Boxes, tone: 'COS' },
      { label: 'OMS', href: '/ecom/cos/oms', icon: ShoppingCart, tone: 'COS' },
      { label: 'Fulfillment', href: '/ecom/cos/fulfillment', icon: Truck, tone: 'COS' },
      { label: 'Policy & Rule', href: '/ecom/cos/policy-rule', icon: Shield, tone: 'COS' },
      { label: 'Event & Audit', href: '/ecom/cos/event-audit', icon: Workflow, tone: 'COS' },
    ],
  },
  {
    label: 'Intelligence Area',
    items: [
      { label: 'Analytics', href: '/intelligence/analytics', icon: BarChart3 },
      { label: 'Attribution', href: '/intelligence/attribution', icon: Route },
      { label: 'Forecasting', href: '/intelligence/forecasting', icon: Gauge },
      { label: 'AI Operator', href: '/intelligence/ai-operator', icon: Bot },
      { label: 'Social Listening & VOC', href: '/intelligence/voc', icon: ScanSearch },
      { label: 'Automation & Alerts', href: '/intelligence/alerts', icon: BellRing },
    ],
  },
];

export function AppSidebar() {
  const location = useLocation();
  const activeGroup = navigationGroups.find((group) => (
    group.items.some((item) => location.pathname.startsWith(item.href))
  ));
  const activeItem = activeGroup?.items.find((item) => location.pathname.startsWith(item.href));

  return (
    <aside className="flex h-full w-[76px] shrink-0 flex-col border-r bg-card md:w-[292px]">
      <div className="flex h-14 items-center justify-center border-b px-3 md:justify-start md:px-4">
        <img
          src="/brand-logo.svg"
          alt="Prime OS logo"
          className="h-7 w-auto shrink-0"
        />
        <div className="hidden flex-col md:flex">
          <span className="text-sm font-semibold leading-none">Prime OS Phase 1</span>
          <span className="mt-0.5 text-[10px] leading-none text-muted-foreground">COS-first commerce operating system</span>
        </div>
      </div>

      <div className="hidden border-b px-3 py-2 md:block md:px-4">
        <div className="rounded-xl border border-border/60 bg-muted/30 px-2.5 py-2 text-center md:text-left">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Current context</p>
          <p className="mt-1 text-xs font-medium text-foreground md:text-sm">
            {activeItem ? activeItem.label : activeGroup ? activeGroup.label : 'Unified workspace'}
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3" aria-label="Primary navigation">
        <div className="space-y-4 px-3">
          {navigationGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-1.5 hidden px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground md:block">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = location.pathname.startsWith(item.href);
                  const Icon = item.icon;
                  const label = item.label;
                  return (
                    <NavLink
                      key={item.href}
                      to={item.href}
                      aria-label={label}
                      aria-current={isActive ? 'page' : undefined}
                      title={label}
                      className={cn(
                        'flex items-center justify-center gap-2.5 rounded-xl px-2 py-2 text-sm font-medium transition-colors md:justify-start',
                        isActive
                          ? 'bg-primary/10 text-primary ring-1 ring-primary/25 md:border-l-2 md:border-primary md:ring-0'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span className="hidden min-w-0 flex-1 truncate md:inline">{label}</span>
                      {item.tone ? (
                        <span className="hidden rounded border border-primary/25 px-1.5 py-0.5 text-[9px] font-semibold tracking-wider text-primary md:inline">
                          {item.tone}
                        </span>
                      ) : null}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      <div className="border-t p-3 space-y-3">
        <div className="hidden md:flex md:justify-center">
          <ThemeModeSwitcher compact />
        </div>
        <div className="hidden md:block">
          <LanguageToggle className="w-full justify-center" />
        </div>
        <NavLink
          to="/intelligence/ai-operator"
          aria-label="AI Operator"
          title="AI Operator"
          className={cn(
            'flex items-center justify-center gap-2.5 rounded-xl px-2 py-2 text-sm font-medium transition-colors md:justify-start',
            'border border-primary/20 bg-primary/10 text-primary hover:bg-primary/15'
          )}
        >
          <BrainCircuit className="size-4 shrink-0" />
          <span className="hidden md:inline">Open operator</span>
        </NavLink>
      </div>
    </aside>
  );
}
