import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
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
import { useI18n } from '@/lib/i18n/I18nContext';
import { formatMessage } from '@/lib/i18n/format';
import {
  getShellDictionary,
  getShellNavBadge,
  getShellNavLabel,
  type ShellDictionary,
} from '@/lib/i18n/shell-dictionaries';
import type { Locale } from '@/lib/i18n/dictionaries';

function SidebarLink({
  node,
  activeIds,
  locale,
  isLeaf = false,
}: {
  node: PrimeNavNode;
  activeIds: Set<string>;
  locale: Locale;
  isLeaf?: boolean;
}) {
  const Icon = node.icon;
  const isActive = activeIds.has(node.id);
  const href = getPrimeNodeHref(node);
  const isExternal = node.external || /^https?:\/\//.test(href);
  const label = getShellNavLabel(locale, node.id, node.label);
  const badge = node.badge ? getShellNavBadge(locale, node.badge) : null;
  const baseClassName = cn(
    'group prime-transition-fast relative flex min-h-10 items-center gap-2.5 rounded-lg text-sm font-medium outline-none hover:-translate-y-px focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
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
      <span className="hidden min-w-0 flex-1 truncate md:inline">{label}</span>
      {badge ? (
        <span className="hidden rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary md:inline">
          {badge}
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
        aria-label={label}
        title={label}
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
      aria-label={label}
      aria-current={isActive && isLeaf ? 'page' : undefined}
      title={label}
      className={baseClassName}
    >
      {content}
    </NavLink>
  );
}

function SidebarFolder({
  node,
  activeIds,
  locale,
  shellCopy,
}: {
  node: PrimeNavNode;
  activeIds: Set<string>;
  locale: Locale;
  shellCopy: ShellDictionary;
}) {
  const Icon = node.icon;
  const isActive = activeIds.has(node.id);
  const label = getShellNavLabel(locale, node.id, node.label);
  const badge = node.badge ? getShellNavBadge(locale, node.badge) : null;
  const navigate = useNavigate();
  const [open, setOpen] = useState(isActive);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileTop, setMobileTop] = useState(80);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isActive) {
      setOpen(true);
    }
  }, [isActive]);

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    const closeIfOutside = (event: PointerEvent) => {
      const target = event.target as Node | null;

      if (!target) {
        return;
      }

      if (buttonRef.current?.contains(target) || flyoutRef.current?.contains(target)) {
        return;
      }

      setMobileOpen(false);
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileOpen(false);
      }
    };

    document.addEventListener('pointerdown', closeIfOutside);
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('pointerdown', closeIfOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [mobileOpen]);

  const handleToggle = () => {
    const href = node.href ? getPrimeNodeHref(node) : '';

    if (href && !node.external && !/^https?:\/\//.test(href)) {
      navigate(href);
    }

    setOpen((value) => !value);

    if (!window.matchMedia('(max-width: 767px)').matches) {
      setMobileOpen(false);
      return;
    }

    const rect = buttonRef.current?.getBoundingClientRect();
    const preferredTop = rect ? rect.top - 8 : 80;
    const maxTop = Math.max(72, window.innerHeight - 420);
    setMobileTop(Math.min(Math.max(72, preferredTop), maxTop));
    setMobileOpen((value) => !value);
  };

  return (
    <div className="space-y-1">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        aria-expanded={open || mobileOpen}
        aria-label={formatMessage(shellCopy.openNavigation, { label })}
        title={label}
        className={cn(
          'group prime-transition-fast relative flex min-h-10 w-full items-center justify-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium outline-none hover:-translate-y-px focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background md:justify-start md:pl-3 md:pr-2',
          isActive
            ? 'bg-[hsl(var(--surface-toolbar))] text-foreground ring-1 ring-border'
            : 'text-muted-foreground hover:bg-[hsl(var(--surface-hover))] hover:text-foreground'
        )}
      >
        {Icon ? <Icon className={cn('size-4 shrink-0', isActive && 'text-primary')} /> : null}
        <span className="hidden min-w-0 flex-1 truncate md:inline">{label}</span>
        {badge ? (
          <span className="hidden rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary md:inline">
            {badge}
          </span>
        ) : null}
        <ChevronRight className={cn('hidden size-3.5 shrink-0 transition-transform md:block', open && 'rotate-90', isActive ? 'text-primary' : 'text-muted-foreground')} />
      </button>

      {open ? (
        <div className={cn('ml-5 hidden space-y-1 border-l pl-2 md:block', isActive ? 'border-primary/35' : 'border-border/70')}>
          {node.children?.map((child) => (
            child.children?.length
              ? <SidebarFolder key={child.id} node={child} activeIds={activeIds} locale={locale} shellCopy={shellCopy} />
              : <SidebarLink key={child.id} node={child} activeIds={activeIds} locale={locale} isLeaf />
          ))}
        </div>
      ) : null}

      {mobileOpen && node.children?.length ? (
        <div
          ref={flyoutRef}
          className="fixed left-[84px] z-50 max-h-[calc(100vh-5rem)] w-[min(320px,calc(100vw-96px))] overflow-y-auto rounded-2xl border bg-card p-3 shadow-2xl md:hidden"
          style={{ top: mobileTop }}
        >
          <div className="mb-2 flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2">
            {Icon ? <Icon className={cn('size-4 shrink-0', isActive && 'text-primary')} /> : null}
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-foreground">{label}</div>
              <div className="text-[11px] text-muted-foreground">{formatMessage(shellCopy.mobileTabs, { count: node.children.length })}</div>
            </div>
          </div>

          <div className="space-y-1">
            {node.children.map((child) => (
              <MobileNavNode
                key={child.id}
                node={child}
                activeIds={activeIds}
                locale={locale}
                shellCopy={shellCopy}
                onNavigate={() => setMobileOpen(false)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MobileNavNode({
  node,
  activeIds,
  locale,
  shellCopy,
  onNavigate,
  depth = 0,
}: {
  node: PrimeNavNode;
  activeIds: Set<string>;
  locale: Locale;
  shellCopy: ShellDictionary;
  onNavigate: () => void;
  depth?: number;
}) {
  const Icon = node.icon;
  const href = getPrimeNodeHref(node);
  const isExternal = node.external || /^https?:\/\//.test(href);
  const isActive = activeIds.has(node.id);
  const label = getShellNavLabel(locale, node.id, node.label);
  const badge = node.badge ? getShellNavBadge(locale, node.badge) : null;
  const className = cn(
    'flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70',
    depth > 0 && 'ml-4',
    isActive
      ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
      : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
  );
  const content = (
    <>
      {Icon ? <Icon className="size-4 shrink-0" /> : null}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {badge ? (
        <span className="rounded border border-primary/25 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary">
          {badge}
        </span>
      ) : null}
      {!node.children?.length ? <ChevronRight className="size-3.5 shrink-0" /> : null}
    </>
  );

  return (
    <div className="space-y-1">
      {isExternal ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className={className}
          onClick={onNavigate}
        >
          {content}
        </a>
      ) : (
        <NavLink to={href} className={className} onClick={onNavigate}>
          {content}
        </NavLink>
      )}

      {node.children?.length ? (
        <div className="space-y-1 border-l border-border/80 pl-1">
          {node.children.map((child) => (
            <MobileNavNode
              key={child.id}
              node={child}
              activeIds={activeIds}
              locale={locale}
              shellCopy={shellCopy}
              onNavigate={onNavigate}
              depth={depth + 1}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AreaSection({
  node,
  activeIds,
  locale,
  shellCopy,
}: {
  node: PrimeNavNode;
  activeIds: Set<string>;
  locale: Locale;
  shellCopy: ShellDictionary;
}) {
  const label = getShellNavLabel(locale, node.id, node.label);
  const childCount = node.children?.length ?? 0;
  return (
    <section aria-label={label} className="space-y-1.5">
      <div className="hidden items-center justify-between px-3 md:flex">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </span>
        {childCount > 0 ? (
          <span className="font-identifier rounded-full border border-border px-1.5 py-0.5 text-[9px] text-muted-foreground">
            {childCount}
          </span>
        ) : null}
      </div>
      {childCount > 0 ? (
        <SidebarFolder node={node} activeIds={activeIds} locale={locale} shellCopy={shellCopy} />
      ) : (
        <SidebarLink node={node} activeIds={activeIds} locale={locale} />
      )}
    </section>
  );
}

export function AppSidebar() {
  const { locale } = useI18n();
  const location = useLocation();
  const routeKey = `${location.pathname}${location.search}${location.pathname === '/account' ? location.hash : ''}`;
  const activePath = getPrimeNavPath(routeKey);
  const activeIds = new Set(activePath.map((node) => node.id));
  const [overviewNode, ...areaNodes] = primeNavigation;
  const shellCopy = getShellDictionary(locale);

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
          <span className="mt-0.5 truncate text-[10px] leading-none text-muted-foreground">{shellCopy.brandDescriptor}</span>
        </div>
      </div>

      <nav className="scrollbar-visible flex-1 overflow-y-auto py-3" aria-label={shellCopy.primaryNavigation}>
        <div className="space-y-5 px-2.5 md:px-3">
          <div>
            <SidebarLink node={overviewNode} activeIds={activeIds} locale={locale} isLeaf />
          </div>

          {areaNodes.map((node) => (
            <AreaSection key={node.id} node={node} activeIds={activeIds} locale={locale} shellCopy={shellCopy} />
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
