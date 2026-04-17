import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { BrainCircuit, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getPrimeNavPath,
  getPrimeNodeHref,
  primeNavigation,
  type PrimeNavNode,
} from '@/lib/prime/prime-navigation';
import { ThemeModeSwitcher } from '@/components/system/ThemeModeSwitcher';
import { LanguageToggle } from '@/components/common/LanguageToggle';

function SidebarLink({
  node,
  activeIds,
  isLeaf = false,
}: {
  node: PrimeNavNode;
  activeIds: Set<string>;
  isLeaf?: boolean;
}) {
  const Icon = node.icon;
  const isActive = activeIds.has(node.id);
  const href = getPrimeNodeHref(node);

  return (
    <NavLink
      to={href}
      aria-label={node.label}
      aria-current={isActive && isLeaf ? 'page' : undefined}
      title={node.label}
      className={cn(
        'group flex min-h-11 items-center gap-2.5 rounded-lg text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/70',
        isLeaf ? 'justify-center px-2 py-2 md:justify-start md:pl-3 md:pr-2' : 'justify-center px-2.5 py-2 md:justify-start',
        isActive
          ? isLeaf
            ? 'bg-primary/10 text-primary ring-1 ring-primary/25'
            : 'bg-muted/70 text-foreground'
          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
      )}
    >
      {Icon ? <Icon className={cn('size-4 shrink-0', isActive && 'text-primary')} /> : null}
      <span className="hidden min-w-0 flex-1 truncate md:inline">{node.label}</span>
      {node.badge ? (
        <span className="hidden rounded border border-primary/25 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary md:inline">
          {node.badge}
        </span>
      ) : null}
      {node.children?.length ? (
        <ChevronRight className={cn('hidden size-3.5 shrink-0 text-muted-foreground transition-transform md:block', isActive && 'rotate-90 text-primary')} />
      ) : null}
    </NavLink>
  );
}

function SidebarFolder({
  node,
  activeIds,
}: {
  node: PrimeNavNode;
  activeIds: Set<string>;
}) {
  const Icon = node.icon;
  const isActive = activeIds.has(node.id);
  const [open, setOpen] = useState(isActive);

  useEffect(() => {
    if (isActive) {
      setOpen(true);
    }
  }, [isActive]);

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className={cn(
          'group flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/70 md:pl-3 md:pr-2',
          isActive
            ? 'bg-muted/70 text-foreground ring-1 ring-primary/15'
            : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
        )}
      >
        {Icon ? <Icon className={cn('size-4 shrink-0', isActive && 'text-primary')} /> : null}
        <span className="hidden min-w-0 flex-1 truncate md:inline">{node.label}</span>
        {node.badge ? (
          <span className="hidden rounded border border-primary/25 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary md:inline">
            {node.badge}
          </span>
        ) : null}
        <ChevronRight className={cn('hidden size-3.5 shrink-0 transition-transform md:block', open && 'rotate-90', isActive ? 'text-primary' : 'text-muted-foreground')} />
      </button>

      {open ? (
        <div className={cn('ml-5 hidden space-y-1 border-l pl-2 md:block', isActive ? 'border-primary/35' : 'border-border/70')}>
          {node.children?.map((child) => (
            child.children?.length
              ? <SidebarFolder key={child.id} node={child} activeIds={activeIds} />
              : <SidebarLink key={child.id} node={child} activeIds={activeIds} isLeaf />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AreaSection({
  node,
  activeIds,
}: {
  node: PrimeNavNode;
  activeIds: Set<string>;
}) {
  return (
    <section aria-label={node.label} className="space-y-1.5">
      <SidebarFolder node={node} activeIds={activeIds} />
    </section>
  );
}

export function AppSidebar() {
  const location = useLocation();
  const activePath = getPrimeNavPath(location.pathname);
  const activeIds = new Set(activePath.map((node) => node.id));
  const contextLabel = activePath.length
    ? activePath.map((node) => node.label).join(' / ')
    : 'Unified workspace';
  const [overviewNode, ...areaNodes] = primeNavigation;

  return (
    <aside className="flex h-full w-[76px] shrink-0 flex-col border-r bg-card md:w-[316px]">
      <div className="flex h-14 items-center justify-center border-b px-3 md:justify-start md:px-4">
        <img
          src="/brand-logo.svg"
          alt="Prime OS logo"
          className="h-7 w-auto shrink-0"
        />
        <div className="hidden min-w-0 flex-col md:flex">
          <span className="truncate text-sm font-semibold leading-none">Prime OS Phase 1</span>
          <span className="mt-0.5 truncate text-[10px] leading-none text-muted-foreground">COS-first commerce operating system</span>
        </div>
      </div>

      <div className="hidden border-b px-3 py-2 md:block md:px-4">
        <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-left">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Current context</p>
          <p className="mt-1 text-sm font-medium leading-snug text-foreground">
            {contextLabel}
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3" aria-label="Primary navigation">
        <div className="space-y-4 px-3">
          <div>
            <SidebarLink node={overviewNode} activeIds={activeIds} isLeaf />
          </div>

          {areaNodes.map((node) => (
            <AreaSection key={node.id} node={node} activeIds={activeIds} />
          ))}
        </div>
      </nav>

      <div className="space-y-3 border-t p-3">
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
            'flex min-h-11 items-center justify-center gap-2.5 rounded-lg border border-primary/20 bg-primary/10 px-2 py-2 text-sm font-medium text-primary outline-none transition-colors hover:bg-primary/15 focus-visible:ring-2 focus-visible:ring-primary/70 md:justify-start'
          )}
        >
          <BrainCircuit className="size-4 shrink-0" />
          <span className="hidden md:inline">Open operator</span>
        </NavLink>
      </div>
    </aside>
  );
}
