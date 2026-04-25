import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
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
  const isExternal = node.external || /^https?:\/\//.test(href);
  const baseClassName = cn(
    'group relative flex min-h-10 items-center gap-2.5 rounded-md text-sm font-medium outline-none transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out hover:-translate-y-px focus-visible:shadow-[0_0_0_3px_hsl(var(--ring)/0.12)]',
    isLeaf ? 'justify-center px-2 py-2 md:justify-start md:pl-3 md:pr-2' : 'justify-center px-2.5 py-2 md:justify-start',
    isActive
      ? isLeaf
        ? 'bg-primary text-primary-foreground shadow-[0_4px_12px_hsl(var(--primary)/0.22)]'
        : 'bg-[hsl(var(--surface-toolbar))] text-foreground ring-1 ring-border'
      : 'text-muted-foreground hover:bg-[hsl(var(--surface-hover))] hover:text-foreground'
  );

  const content = (
    <>
      {Icon ? <Icon className={cn('size-4 shrink-0', isActive && isLeaf ? 'text-primary-foreground' : isActive && 'text-primary')} /> : null}
      <span className="hidden min-w-0 flex-1 truncate md:inline">{node.label}</span>
      {node.badge ? (
        <span className="hidden rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary md:inline">
          {node.badge}
        </span>
      ) : null}
      {node.children?.length ? (
        <ChevronRight className={cn('hidden size-3.5 shrink-0 text-muted-foreground transition-transform md:block', isActive && 'rotate-90 text-primary')} />
      ) : null}
    </>
  );

  if (isExternal) {
    return (
      <a
        href={href}
        aria-label={node.label}
        title={node.label}
        target="_blank"
        rel="noreferrer"
        className={baseClassName}
      >
        {content}
      </a>
    );
  }

  return (
    <NavLink
      to={href}
      aria-label={node.label}
      aria-current={isActive && isLeaf ? 'page' : undefined}
      title={node.label}
      className={baseClassName}
    >
      {content}
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
          'group relative flex min-h-10 w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm font-medium outline-none transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out hover:-translate-y-px focus-visible:shadow-[0_0_0_3px_hsl(var(--ring)/0.12)] md:pl-3 md:pr-2',
          isActive
            ? 'bg-[hsl(var(--surface-toolbar))] text-foreground ring-1 ring-border'
            : 'text-muted-foreground hover:bg-[hsl(var(--surface-hover))] hover:text-foreground'
        )}
      >
        {Icon ? <Icon className={cn('size-4 shrink-0', isActive && 'text-primary')} /> : null}
        <span className="hidden min-w-0 flex-1 truncate md:inline">{node.label}</span>
        {node.badge ? (
          <span className="hidden rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary md:inline">
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
  const [overviewNode, ...areaNodes] = primeNavigation;

  return (
    <aside className="flex h-full w-[var(--sidebar-width-compact)] shrink-0 flex-col border-r border-border bg-card/95 md:w-[var(--sidebar-width-expanded)]">
      <div className="flex h-[var(--header-height)] items-center justify-center border-b border-border px-3 md:justify-start md:px-4">
        <img
          src="/brand-logo.svg"
          alt="Prime OS logo"
          className="h-7 w-auto shrink-0"
        />
        <div className="hidden min-w-0 flex-col md:flex">
          <span className="font-display truncate text-sm font-semibold leading-none">Prime OS</span>
          <span className="mt-0.5 truncate text-[10px] leading-none text-muted-foreground">Closed-loop commerce platform</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3" aria-label="Primary navigation">
        <div className="space-y-4 px-2.5 md:px-3">
          <div>
            <SidebarLink node={overviewNode} activeIds={activeIds} isLeaf />
          </div>

          {areaNodes.map((node) => (
            <AreaSection key={node.id} node={node} activeIds={activeIds} />
          ))}
        </div>
      </nav>

      <div className="space-y-3 border-t border-border p-3">
        <div className="hidden md:flex md:justify-center">
          <ThemeModeSwitcher compact />
        </div>
        <div className="hidden md:block">
          <LanguageToggle className="w-full justify-center" />
        </div>
      </div>
    </aside>
  );
}
