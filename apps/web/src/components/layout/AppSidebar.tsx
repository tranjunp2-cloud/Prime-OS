import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRightLeft,
  BadgePercent,
  BarChart3,
  Building2,
  Boxes,
  CalendarClock,
  ChevronRight,
  CircleHelp,
  Clock3,
  ClipboardCheck,
  CreditCard,
  FilePlus2,
  Gift,
  Globe2,
  Home,
  Image,
  LayoutGrid,
  Link2,
  Menu,
  MessageSquare,
  MonitorSmartphone,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Printer,
  RadioTower,
  Search,
  Settings2,
  ShoppingBag,
  Sparkles,
  Store,
  Tags,
  Truck,
  Undo2,
  UsersRound,
  Warehouse,
  WalletCards,
  type LucideIcon,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { SidebarUserFooter } from './SidebarUserFooter';

const sidebarCollapsedStorageKey = 'primeos.sidebar.collapsed';

type NavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  children?: NavItem[];
};

type NavGroup = { id: string; label: string; items: NavItem[] };
type SearchResult = NavItem & { trail: string[]; parentIds: string[] };

const mainNavigation: NavGroup[] = [
  { id: 'overview', label: 'Overview', items: [
    { id: 'home', label: 'Home', href: '/admin/dashboard', icon: Home },
    { id: 'analytics', label: 'Analytics', href: '/client-reports', icon: BarChart3 },
  ] },
  { id: 'operations', label: 'Operations', items: [
    { id: 'orders', label: 'Orders', href: '/orders', icon: ShoppingBag },
    { id: 'products', label: 'Products', icon: Package, children: [
      { id: 'master-catalog', label: 'Master Catalog', href: '/products/master-catalog', icon: Boxes },
      { id: 'product-categories', label: 'Categories & Attributes', href: '/products/categories', icon: Tags },
    ] },
    { id: 'warehouse', label: 'Warehouse', icon: Warehouse, children: [
      { id: 'warehouse-mapping', label: 'Warehouse Mapping', href: '/warehouse/mapping', icon: Link2 },
      { id: 'warehouse-stock', label: 'Stock Levels', href: '/warehouse/stock', icon: Boxes },
      { id: 'warehouse-transfers', label: 'Stock Transfers', href: '/warehouse/transfers', icon: ArrowRightLeft },
      { id: 'warehouse-adjustments', label: 'Adjustments', href: '/warehouse/adjustments', icon: ClipboardCheck },
    ] },
    { id: 'channels', label: 'Sales Channels', icon: Store, children: [
      { id: 'connected-channels', label: 'Connected Channels', href: '/sales-channels/connected-channels', icon: Store },
      { id: 'live-commerce', label: 'Live Commerce', href: '/sales-channels/live-commerce', icon: RadioTower },
      { id: 'conversation-channels', label: 'Conversation Channels', href: '/sales-channels/conversation-channels', icon: MessageSquare },
    ] },
  ] },
  { id: 'growth', label: 'Growth & Engagement', items: [
    { id: 'customers', label: 'Customers', icon: UsersRound, children: [
      { id: 'customer-directory', label: 'Customer Directory', href: '/crm/customers', icon: UsersRound },
      { id: 'contact-leads', label: 'Contact Leads', href: '/crm/contact-leads', icon: MessageSquare },
      { id: 'segments-tags', label: 'Segments & Tags', href: '/crm/segments', icon: Tags },
      { id: 'quick-replies', label: 'Quick Replies', href: '/crm/quick-replies', icon: MessageSquare },
      { id: 'cs-analytics', label: 'CS Analytics', href: '/crm/cs-analytics', icon: BarChart3 },
    ] },
    { id: 'promotions', label: 'Promotions', icon: BadgePercent, children: [
      { id: 'discount-codes', label: 'Discount Codes', href: '/promotions/discount-codes', icon: BadgePercent },
      { id: 'automatic-discounts', label: 'Automatic Discounts', href: '/promotions/automatic', icon: Sparkles },
      { id: 'flash-sale', label: 'Flash Sale', href: '/promotions/flash-sale', icon: Clock3 },
      { id: 'loyalty', label: 'Loyalty & Membership', href: '/promotions/loyalty', icon: Gift },
      { id: 'promotion-analytics', label: 'Promotion Analytics', href: '/promotions/analytics', icon: BarChart3 },
    ] },
  ] },
  { id: 'automation', label: 'Automation', items: [
    { id: 'scheduled-tasks', label: 'Scheduled Tasks', href: '/automation/scheduled-tasks', icon: CalendarClock },
  ] },
  { id: 'finance-billing', label: 'Finance & Billing', items: [
    { id: 'finance-ops', label: 'Finance Ops', href: '/finance/ops', icon: WalletCards },
    { id: 'billing', label: 'Invoice Management', href: '/finance/invoices', icon: CreditCard },
  ] },
  { id: 'system', label: 'System', items: [
    { id: 'settings', label: 'Settings', icon: Settings2, children: [
      { id: 'general-business-settings', label: 'General & Business', href: '/settings/general', icon: Building2 },
      { id: 'team-access-settings', label: 'Team & Access', href: '/settings/team-access', icon: UsersRound },
      { id: 'payment-settings', label: 'Payments', href: '/settings/payments', icon: CreditCard },
      { id: 'shipping-delivery-settings', label: 'Shipping & Delivery', href: '/settings/shipping-delivery', icon: Truck },
      { id: 'customer-data-settings', label: 'Customer Data & Privacy', href: '/settings/customer-data', icon: UsersRound },
      { id: 'template-notification-settings', label: 'Templates & Notifications', href: '/settings/templates-notifications', icon: Printer },
    ] },
    { id: 'faq', label: 'Help Center', href: '/faq', icon: CircleHelp },
  ] },
];

const primeWebNavigation: NavGroup[] = [{ id: 'primeweb', label: 'Storefront Builder', items: [
  { id: 'theme-editor', label: 'Theme Editor', href: '/builder/theme', icon: LayoutGrid },
  { id: 'pages-content', label: 'Pages & Content', href: '/builder/pages', icon: FilePlus2 },
  { id: 'navigation-menus', label: 'Navigation & Menus', href: '/builder/navigation', icon: Menu },
  { id: 'banners-popups', label: 'Banners & Popups', href: '/builder/banners', icon: Image },
  { id: 'domains-seo', label: 'Custom Domains & SEO', href: '/builder/domains', icon: Globe2 },
  { id: 'pixel-integrations', label: 'Pixel Integrations', href: '/builder/integrations', icon: Link2 },
] }];

const posNavigation: NavGroup[] = [{ id: 'pos', label: 'Point of Sale', items: [
  { id: 'fast-checkout', label: 'Fast Checkout', href: '/pos/register', icon: MonitorSmartphone },
  { id: 'shift-management', label: 'Shift Management', href: '/pos/shifts', icon: Store },
  { id: 'today-transactions', label: 'Today Transactions', href: '/pos/transactions', icon: ShoppingBag },
  { id: 'returns-refunds', label: 'Return / Refund', href: '/pos/returns', icon: Undo2 },
  { id: 'hardware-setup', label: 'Hardware Setup', href: '/pos/hardware', icon: Settings2 },
] }];

function hrefIsActive(href: string | undefined, pathname: string, search: string) {
  if (!href) return false;
  const [hrefPath, hrefSearch = ''] = href.split('?');
  const reservedProductRoutes = new Set(['master-catalog', 'categories', 'inventory', 'new']);
  const productSegments = pathname.split('/').filter(Boolean);
  const isProductEditorRoute = pathname === '/products/new'
    || (productSegments[0] === 'products' && productSegments.length >= 2 && !reservedProductRoutes.has(productSegments[1]) && (productSegments.length === 2 || (productSegments.length === 3 && productSegments[2] === 'edit')));
  const pathMatches = hrefPath === '/overview' || hrefPath === '/orders'
    ? pathname === hrefPath
    : hrefPath === '/products/master-catalog'
      ? pathname === hrefPath || isProductEditorRoute
    : hrefPath === '/products'
      ? pathname === hrefPath || (/^\/products\/[^/]+/.test(pathname) && pathname !== '/products/new')
      : pathname === hrefPath || pathname.startsWith(`${hrefPath}/`);
  if (!pathMatches) return false;
  if (!hrefSearch) return hrefPath !== '/overview' || !new URLSearchParams(search).get('module');
  const current = new URLSearchParams(search);
  return [...new URLSearchParams(hrefSearch)].every(([key, value]) => current.get(key) === value);
}

function findActivePath(items: NavItem[], pathname: string, search: string, parents: NavItem[] = []): NavItem[] {
  for (const item of items) {
    const trail = [...parents, item];
    if (item.children) {
      const childTrail = findActivePath(item.children, pathname, search, trail);
      if (childTrail.length) return childTrail;
    }
    if (hrefIsActive(item.href, pathname, search)) return trail;
  }
  return [];
}

function flattenItems(items: NavItem[], trail: string[] = [], parentIds: string[] = []): SearchResult[] {
  return items.flatMap((item) => {
    const result = { ...item, trail, parentIds };
    return [result, ...(item.children ? flattenItems(item.children, [...trail, item.label], [...parentIds, item.id]) : [])];
  });
}

function resolveLevel(items: NavItem[], ids: string[]) {
  let current = items;
  let parent: NavItem | undefined;
  for (const id of ids) {
    parent = current.find((item) => item.id === id);
    if (!parent?.children) break;
    current = parent.children;
  }
  return { items: current, parent };
}

function getFirstChildHref(item: NavItem): string | undefined {
  for (const child of item.children ?? []) {
    if (child.href) return child.href;
    const nestedHref = getFirstChildHref(child);
    if (nestedHref) return nestedHref;
  }
  return undefined;
}

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(() => typeof window !== 'undefined' && window.localStorage.getItem(sidebarCollapsedStorageKey) === 'true');
  const [levelPath, setLevelPath] = useState<string[]>([]);
  const [direction, setDirection] = useState(1);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const workspace = location.pathname.startsWith('/builder') ? 'primeweb' : location.pathname.startsWith('/pos') ? 'pos' : 'main';
  const scope = new URLSearchParams(location.search).get('scope');
  const groups = workspace === 'primeweb'
    ? primeWebNavigation
    : workspace === 'pos'
      ? posNavigation
      : scope === 'commerce'
        ? mainNavigation.filter((group) => group.id !== 'growth')
        : scope === 'growth'
          ? mainNavigation.filter((group) => group.id !== 'operations')
          : mainNavigation;
  const rootItems = useMemo(() => groups.flatMap((group) => group.items), [groups]);
  const activePath = useMemo(() => findActivePath(rootItems, location.pathname, location.search), [rootItems, location.pathname, location.search]);
  const activeParentPath = activePath.slice(0, -1).filter((item) => item.children).map((item) => item.id).join('/');
  const activeId = activePath.at(-1)?.id;
  const currentLevel = resolveLevel(rootItems, levelPath);
  const normalizedQuery = query.trim().toLowerCase();
  const searchResults = useMemo(() => normalizedQuery ? flattenItems(rootItems).filter((item) => `${item.trail.join(' ')} ${item.label}`.toLowerCase().includes(normalizedQuery)) : [], [normalizedQuery, rootItems]);

  useEffect(() => {
    setLevelPath(activeParentPath ? activeParentPath.split('/') : []);
    setQuery('');
  }, [activeParentPath, workspace, location.pathname, location.search]);

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.key.toLowerCase() !== 'f' || event.metaKey || event.ctrlKey || event.altKey || target?.matches('input, textarea, select, [contenteditable="true"]')) return;
      event.preventDefault();
      if (collapsed) setCollapsed(false);
      window.requestAnimationFrame(() => searchRef.current?.focus());
    };
    window.addEventListener('keydown', focusSearch);
    return () => window.removeEventListener('keydown', focusSearch);
  }, [collapsed]);

  const toggleCollapsed = () => setCollapsed((value) => {
    window.localStorage.setItem(sidebarCollapsedStorageKey, String(!value));
    return !value;
  });

  const enter = (item: NavItem, ids = levelPath) => {
    if (!item.children) return;
    setDirection(1);
    setLevelPath([...ids, item.id]);
    setQuery('');
    const firstChildHref = getFirstChildHref(item);
    if (firstChildHref) navigate(firstChildHref);
  };

  const goBack = () => {
    setDirection(-1);
    setLevelPath((value) => value.slice(0, -1));
  };

  const renderItem = (item: NavItem, searchResult?: SearchResult) => {
    const Icon = item.icon;
    const active = item.id === activeId || Boolean(item.children?.some((child) => activePath.some((activeItem) => activeItem.id === child.id)));
    const content = <>
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span className={cn('hidden min-w-0 flex-1 truncate text-left', !collapsed && 'md:block')}>{item.label}</span>
      {!collapsed && item.children ? <ChevronRight className="hidden size-4 shrink-0 text-muted-foreground md:block" aria-hidden="true" /> : null}
    </>;
    const className = cn(
      'group relative flex min-h-11 w-full min-w-0 items-center justify-center gap-3 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
      !collapsed && 'md:justify-start',
      active ? 'bg-primary/10 font-semibold text-primary before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-r-full before:bg-primary' : 'text-sidebar-foreground/75 hover:bg-slate-100 hover:text-sidebar-foreground dark:hover:bg-zinc-800',
    );
    const itemElement = item.children ? (
      <button type="button" className={className} onClick={() => enter(item, searchResult?.parentIds ?? levelPath)} aria-label={`Open ${item.label}`}>{content}</button>
    ) : (
      <NavLink className={className} to={item.href ?? '/overview'} onClick={() => setQuery('')} aria-current={active ? 'page' : undefined}>{content}</NavLink>
    );
    return <Tooltip key={`${item.id}-${searchResult?.trail.join('-') ?? 'nav'}`}><TooltipTrigger asChild>{itemElement}</TooltipTrigger><TooltipContent side="right" className={cn(!collapsed && 'md:hidden')}>{item.label}</TooltipContent></Tooltip>;
  };

  return (
    <aside className={cn('app-sidebar-light flex h-full w-[var(--sidebar-width-compact)] shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200', collapsed ? 'md:w-[var(--sidebar-width-compact)]' : 'md:w-[var(--sidebar-width-expanded)]')} data-collapsed={collapsed}>
      <div className={cn('flex h-[var(--header-height)] shrink-0 items-center border-b border-sidebar-border px-2', collapsed ? 'justify-center' : 'justify-center md:justify-between md:px-4')}>
        <span className={cn('flex h-12 w-[5.5rem] shrink-0 items-center justify-center', collapsed && 'md:hidden')}><img src="/product-logo.png" alt="Unifi Business" width="104" height="59" className="block h-auto max-h-full w-full object-contain" /></span>
        <Tooltip><TooltipTrigger asChild><button type="button" onClick={toggleCollapsed} className="hidden size-11 shrink-0 items-center justify-center rounded-lg text-sidebar-foreground/65 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:hover:bg-zinc-800 md:flex" aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'} aria-expanded={!collapsed}>{collapsed ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}</button></TooltipTrigger><TooltipContent side="right">{collapsed ? 'Expand navigation' : 'Collapse navigation'}</TooltipContent></Tooltip>
      </div>

      <nav className="flex-1 overflow-hidden px-2 py-3 md:px-3" aria-label="Primary navigation">
        <div className="flex h-full flex-col">
          <div className="mb-3 shrink-0">
            <div className={cn('relative', collapsed && 'flex justify-center')}>
              <Search className={cn('pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground', collapsed && 'left-1/2 -translate-x-1/2')} aria-hidden="true" />
              <input ref={searchRef} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find navigation" aria-label="Find navigation" className={cn('h-10 w-full rounded-md border border-sidebar-border bg-background pl-9 pr-11 text-[13px] outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/15', collapsed && 'w-10 cursor-pointer px-0 text-transparent placeholder:text-transparent')} onFocus={() => { if (collapsed) toggleCollapsed(); }} />
              {!collapsed ? <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-sidebar-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">F</kbd> : null}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
            <AnimatePresence initial={false} mode="wait" custom={direction}>
              <motion.div key={normalizedQuery ? 'search' : levelPath.join('/') || 'root'} custom={direction} initial={{ opacity: 0, x: direction > 0 ? 22 : -22 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: direction > 0 ? -22 : 22 }} transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}>
                {normalizedQuery ? (
                  <section>
                    <p className={cn('mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground', collapsed && 'hidden')}>{searchResults.length} result{searchResults.length === 1 ? '' : 's'}</p>
                    <div className="grid gap-1">{searchResults.map((item) => <div key={`${item.parentIds.join('.')}-${item.id}`}>{renderItem(item, item)}{!collapsed && item.trail.length ? <p className="-mt-1 mb-1 ml-10 truncate pr-2 text-[10px] text-muted-foreground">{item.trail.join(' / ')}</p> : null}</div>)}</div>
                    {!searchResults.length && !collapsed ? <p className="px-3 py-8 text-center text-xs text-muted-foreground">No navigation items found.</p> : null}
                  </section>
                ) : levelPath.length ? (
                  <section>
                    <button type="button" onClick={goBack} className={cn('mb-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-md px-3 text-[13px] font-semibold hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:hover:bg-zinc-800', !collapsed && 'md:justify-start')} aria-label={`Back from ${currentLevel.parent?.label ?? 'submenu'}`}><ArrowLeft className="size-4" /><span className={cn('hidden truncate', !collapsed && 'md:block')}>{currentLevel.parent?.label}</span></button>
                    <div className="grid gap-1">{currentLevel.items.map((item) => renderItem(item))}</div>
                  </section>
                ) : (
                  <div className={cn('grid', collapsed ? 'gap-2' : 'gap-4')}>
                    {groups.map((group) => <section key={group.id} aria-labelledby={`nav-group-${group.id}`}><h2 id={`nav-group-${group.id}`} className={cn('mb-1.5 hidden px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground', !collapsed && 'md:block')}>{group.label}</h2><div className="grid gap-1">{group.items.map((item) => renderItem(item))}</div></section>)}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </nav>

      <SidebarUserFooter collapsed={collapsed} />
    </aside>
  );
}
