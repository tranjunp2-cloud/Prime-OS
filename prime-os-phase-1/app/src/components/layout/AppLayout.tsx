import { type KeyboardEvent as ReactKeyboardEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BellRing,
  ChevronRight,
  ChevronDown,
  ClipboardList,
  Hash,
  LogOut,
  Megaphone,
  Package,
  Search,
  ShoppingCart,
  UserRoundCheck,
  X,
} from 'lucide-react';
import { AppSidebar } from './AppSidebar';
import { PrimeCommandPalette } from './PrimeCommandPalette';
import { GlobalCopilotWorkspace } from '@/components/copilot/GlobalCopilotWorkspace';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { seedDemoData } from '@/lib/demo-data-seeder';
import { useI18n } from '@/lib/i18n/I18nContext';
import { getShellDictionary, getShellNavLabel } from '@/lib/i18n/shell-dictionaries';
import { getPrimeSnapshot } from '@/lib/prime/prime-data';
import { getPrimeNavPath } from '@/lib/prime/prime-navigation';
import { cn } from '@/lib/utils';

type SearchKind = 'Product' | 'SKU' | 'Order' | 'Lead' | 'Customer' | 'RFQ' | 'Campaign' | 'Alert';

interface GlobalSearchResult {
  id: string;
  kind: SearchKind;
  title: string;
  detail: string;
  href: string;
  keywords: string;
  priority: number;
}

const searchKindIcons: Record<SearchKind, ReactNode> = {
  Product: <Package className="size-4" />,
  SKU: <Hash className="size-4" />,
  Order: <ShoppingCart className="size-4" />,
  Lead: <UserRoundCheck className="size-4" />,
  Customer: <UserRoundCheck className="size-4" />,
  RFQ: <ClipboardList className="size-4" />,
  Campaign: <Megaphone className="size-4" />,
  Alert: <BellRing className="size-4" />,
};

function normalizeSearchText(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

function buildSearchText(parts: unknown[]) {
  return parts.map((part) => normalizeSearchText(part)).filter(Boolean).join(' ');
}

function getAccountInitials(fullName?: string, email?: string) {
  const source = fullName?.trim() || email?.split('@')[0] || 'PrimeOS';
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'PO';
}

function getAccountRoleLabel(role?: string) {
  if (role === 'admin') return 'Admin';
  if (role === 'user') return 'Operator';
  return 'Viewer';
}

function scoreSearchResult(result: GlobalSearchResult, query: string) {
  const normalizedQuery = normalizeSearchText(query);
  const title = normalizeSearchText(result.title);
  const keywords = normalizeSearchText(result.keywords);

  if (!normalizedQuery) {
    return 0;
  }

  if (title === normalizedQuery) {
    return 1000 + result.priority;
  }

  if (title.startsWith(normalizedQuery)) {
    return 820 + result.priority;
  }

  if (title.includes(normalizedQuery)) {
    return 640 + result.priority;
  }

  if (keywords.includes(normalizedQuery)) {
    return 420 + result.priority;
  }

  const terms = normalizedQuery.split(/\s+/).filter(Boolean);
  const matchedTerms = terms.filter((term) => keywords.includes(term)).length;

  return matchedTerms > 0 ? matchedTerms * 120 + result.priority : 0;
}

function buildGlobalSearchResults(): GlobalSearchResult[] {
  const snapshot = getPrimeSnapshot();

  const productResults = snapshot.products.flatMap((product) => {
    const productResult: GlobalSearchResult = {
      id: `product-${product.id}`,
      kind: 'Product',
      title: product.name,
      detail: `${product.brand} · ${product.sku_code} · ${product.status}`,
      href: `/ecom/cos/product-master/${product.id}`,
      keywords: buildSearchText([
        product.name,
        product.brand,
        product.category,
        product.sku_code,
        product.asin,
        product.gtin,
        product.mpn,
        product.model_number,
        product.status,
      ]),
      priority: 80,
    };

    const skuResults = product.skus.map((sku) => ({
      id: `sku-${sku.id}`,
      kind: 'SKU' as const,
      title: sku.sku_code,
      detail: `${product.name} · ${sku.variation_name}`,
      href: `/ecom/cos/product-master/${product.id}`,
      keywords: buildSearchText([sku.sku_code, sku.variation_name, product.name, product.brand, product.category]),
      priority: 90,
    }));

    return [productResult, ...skuResults];
  });

  const orderResults = snapshot.orders.map((order) => ({
    id: `order-${order.id}`,
    kind: 'Order' as const,
    title: order.order_id,
    detail: `${order.customer_name} · ${order.channel} · ${order.status}`,
    href: `/ecom/cos/oms/${order.id}`,
    keywords: buildSearchText([
      order.order_id,
      order.channel_order_ref,
      order.customer_name,
      order.customer_email,
      order.customer_phone,
      order.status,
      order.lifecycle_stage,
      order.tracking_number,
      order.channel,
    ]),
    priority: 95,
  }));

  const customerResults = snapshot.customers.map((customer) => ({
    id: `customer-${customer.id}`,
    kind: 'Customer' as const,
    title: customer.name,
    detail: `${customer.company} · ${customer.segment} · ${customer.lifecycle}`,
    href: `/customer/crm-compact?customer=${encodeURIComponent(customer.id)}`,
    keywords: buildSearchText([
      customer.name,
      customer.company,
      customer.email,
      customer.segment,
      customer.lifecycle,
      customer.b2bAccount,
      customer.notes.join(' '),
    ]),
    priority: 75,
  }));

  const leadResults = snapshot.leads.map((lead) => ({
    id: `lead-${lead.id}`,
    kind: 'Lead' as const,
    title: lead.company,
    detail: `${lead.contact} · ${lead.score} lead score · ${lead.status}`,
    href: `/demand/lead-response-capture?lead=${encodeURIComponent(lead.id)}`,
    keywords: buildSearchText([
      lead.id,
      lead.company,
      lead.contact,
      lead.email,
      lead.status,
      lead.source,
      lead.lastTouch,
    ]),
    priority: 70,
  }));

  const rfqResults = snapshot.rfqs.map((rfq) => ({
    id: `rfq-${rfq.id}`,
    kind: 'RFQ' as const,
    title: rfq.id.toUpperCase(),
    detail: `${rfq.requestedBy} · ${rfq.quantity} units · ${rfq.status}`,
    href: `/demand/lead-response-capture?rfq=${encodeURIComponent(rfq.id)}`,
    keywords: buildSearchText([rfq.id, rfq.requestedBy, rfq.status, rfq.skuId, rfq.quantity]),
    priority: 72,
  }));

  const campaignResults = snapshot.campaigns.map((campaign) => ({
    id: `campaign-${campaign.id}`,
    kind: 'Campaign' as const,
    title: campaign.name,
    detail: `${campaign.channel} · ${campaign.targetSegment} · ${campaign.status}`,
    href: `/demand/campaign-ops?campaign=${encodeURIComponent(campaign.id)}`,
    keywords: buildSearchText([
      campaign.name,
      campaign.channel,
      campaign.status,
      campaign.targetSegment,
      campaign.skuCode,
    ]),
    priority: 68,
  }));

  const alertResults = snapshot.alerts.map((alert) => ({
    id: `alert-${alert.id}`,
    kind: 'Alert' as const,
    title: alert.title,
    detail: `${alert.area} · ${alert.severity} severity`,
    href: `/intelligence/alerts?alert=${encodeURIComponent(alert.id)}`,
    keywords: buildSearchText([
      alert.id,
      alert.title,
      alert.area,
      alert.severity,
      alert.linkedEntity,
      alert.recommendationId,
    ]),
    priority: alert.severity === 'high' ? 88 : 60,
  }));

  return [
    ...productResults,
    ...orderResults,
    ...customerResults,
    ...leadResults,
    ...rfqResults,
    ...campaignResults,
    ...alertResults,
  ];
}

export function AppLayout() {
  const [bootstrapping, setBootstrapping] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const { user, signOut } = useAuth();
  const { locale } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const shellCopy = useMemo(() => getShellDictionary(locale), [locale]);
  const globalSearchResults = useMemo(() => (
    bootstrapping ? [] : buildGlobalSearchResults()
  ), [bootstrapping]);
  const visibleSearchResults = useMemo(() => {
    const query = searchQuery.trim();

    if (!query) {
      return [];
    }

    return globalSearchResults
      .map((result) => ({ result, score: scoreSearchResult(result, query) }))
      .filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, 9)
      .map((item) => item.result);
  }, [globalSearchResults, searchQuery]);

  const breadcrumbItems = useMemo(() => (
    getPrimeNavPath(location.pathname === '/account' ? `${location.pathname}${location.hash}` : location.pathname).map((node) => ({
      id: node.id,
      label: getShellNavLabel(locale, node.id, node.label),
    }))
  ), [locale, location.hash, location.pathname]);
  const accountInitials = getAccountInitials(user?.fullName, user?.email);
  const accountRoleLabel = getAccountRoleLabel(user?.role);

  const shouldShowSearchPanel = searchOpen && searchQuery.trim().length > 0;
  const searchListboxId = 'primeos-global-search-results';
  const activeSearchResult = shouldShowSearchPanel ? visibleSearchResults[activeSearchIndex] : undefined;

  useEffect(() => {
    let cancelled = false;

    const bootstrapDemoData = async () => {
      setBootstrapping(true);

      try {
        await seedDemoData('prime-os-phase-1-demo');
      } catch (error) {
        console.error('[PrimeOS] Failed to bootstrap linked demo data', error);
      } finally {
        if (!cancelled) {
          setBootstrapping(false);
        }
      }
    };

    void bootstrapDemoData();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const openCommand = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen((value) => !value);
      }
    };

    window.addEventListener('keydown', openCommand);

    return () => {
      window.removeEventListener('keydown', openCommand);
    };
  }, []);

  useEffect(() => {
    setActiveSearchIndex(0);
  }, [searchQuery]);

  useEffect(() => {
    if (!searchOpen) {
      return;
    }

    const closeIfOutside = (event: PointerEvent) => {
      const target = event.target as Node | null;

      if (target && searchBoxRef.current?.contains(target)) {
        return;
      }

      setSearchOpen(false);
    };

    document.addEventListener('pointerdown', closeIfOutside);

    return () => {
      document.removeEventListener('pointerdown', closeIfOutside);
    };
  }, [searchOpen]);

  function openSearchResult(result: GlobalSearchResult) {
    setSearchOpen(false);
    setSearchQuery('');
    navigate(result.href);
  }

  function handleSearchKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setSearchOpen(false);
      return;
    }

    if (!shouldShowSearchPanel || visibleSearchResults.length === 0) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveSearchIndex((index) => Math.min(index + 1, visibleSearchResults.length - 1));
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveSearchIndex((index) => Math.max(index - 1, 0));
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      openSearchResult(visibleSearchResults[activeSearchIndex] || visibleSearchResults[0]);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);

    try {
      await signOut();
    } finally {
      setSigningOut(false);
      navigate('/auth', { replace: true });
    }
  }

  if (bootstrapping) {
    return (
      <div className="flex h-screen overflow-hidden bg-background">
        <AppSidebar />
        <main id="main-content" className="flex-1 overflow-auto">
          <div className="flex flex-col gap-4 p-8">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-60 w-full rounded-xl" />
            <Skeleton className="h-60 w-full rounded-xl" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded focus:shadow-lg"
      >
        {shellCopy.skipToMainContent}
      </a>
      <AppSidebar />
      <div className="flex-1 min-w-0 overflow-hidden">
        <GlobalCopilotWorkspace>
          <header className="sticky top-0 z-30 grid min-h-[var(--header-height)] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-card/80 px-4 backdrop-blur-xl md:grid-cols-[minmax(20rem,42rem)_minmax(1rem,1fr)_auto] md:px-6">
            <div ref={searchBoxRef} className="relative min-w-0 md:w-full">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label={shellCopy.searchAriaLabel}
                aria-autocomplete="list"
                aria-controls={searchListboxId}
                aria-expanded={shouldShowSearchPanel}
                aria-activedescendant={activeSearchResult ? `primeos-search-result-${activeSearchResult.id}` : undefined}
                role="combobox"
                autoComplete="off"
                className="h-10 w-full rounded-xl border-input bg-card pl-9 pr-16 text-sm transition-[border-color,box-shadow] focus-visible:border-primary/45"
                placeholder={shellCopy.searchPlaceholder}
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                onKeyDown={handleSearchKeyDown}
              />
              {searchQuery ? (
                <button
                  type="button"
                  aria-label={shellCopy.clearSearch}
                  className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchOpen(false);
                  }}
                >
                  <X className="size-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  aria-label={shellCopy.openCommandPalette}
                  className="font-identifier prime-transition-fast absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground hover:border-primary/35 hover:text-foreground sm:block"
                  onClick={() => setCommandOpen(true)}
                >
                  ⌘K
                </button>
              )}

              {shouldShowSearchPanel ? (
                <div className="panel-shadow absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[80] overflow-hidden rounded-2xl border bg-card" role="region" aria-label={shellCopy.searchPanelHeading}>
                  <div className="border-b px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {shellCopy.searchPanelHeading}
                  </div>

                  {visibleSearchResults.length > 0 ? (
                    <div id={searchListboxId} className="max-h-[min(70vh,420px)] overflow-y-auto p-2" role="listbox">
                      {visibleSearchResults.map((result, index) => {
                        const meta = {
                          icon: searchKindIcons[result.kind],
                          label: shellCopy.searchKindLabels[result.kind],
                        };
                        const isActive = index === activeSearchIndex;

                        return (
                          <button
                            key={result.id}
                            id={`primeos-search-result-${result.id}`}
                            type="button"
                            role="option"
                            aria-selected={isActive}
                            className={cn(
                              'prime-transition-fast flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left',
                              isActive ? 'bg-primary/10 text-foreground ring-1 ring-primary/20' : 'hover:bg-muted/70'
                            )}
                            onMouseEnter={() => setActiveSearchIndex(index)}
                            onClick={() => openSearchResult(result)}
                          >
                            <span className={cn(
                              'flex size-9 shrink-0 items-center justify-center rounded-xl border',
                              isActive ? 'border-primary/20 bg-primary/10 text-primary' : 'bg-muted/50 text-muted-foreground'
                            )}>
                              {meta.icon}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex min-w-0 items-center gap-2">
                                <span className="truncate text-sm font-semibold">{result.title}</span>
                                <Badge variant="outline" className="shrink-0 text-[10px]">
                                  {meta.label}
                                </Badge>
                              </span>
                              <span className="mt-0.5 block truncate text-xs text-muted-foreground">{result.detail}</span>
                            </span>
                            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="px-4 py-6 text-sm text-muted-foreground">
                      {shellCopy.noSearchResults}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
            <nav className="hidden min-w-0 items-center gap-1 text-xs text-muted-foreground md:flex" aria-label="Breadcrumb">
              {breadcrumbItems.length > 0 ? breadcrumbItems.map((item, index) => (
                <span key={item.id} className="flex min-w-0 items-center gap-1">
                  {index > 0 ? <ChevronRight className="size-3 shrink-0" /> : null}
                  <span className={cn('truncate', index === breadcrumbItems.length - 1 && 'font-semibold text-foreground')}>
                    {item.label}
                  </span>
                </span>
              )) : <span aria-hidden="true" />}
            </nav>
            <div className="flex min-w-0 items-center justify-end gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 max-w-[240px] justify-start gap-2 rounded-2xl px-2.5 shadow-sm"
                    aria-label={`Open account menu for ${user?.email || shellCopy.demoWorkspace}`}
                  >
                    <Avatar className="size-8 border border-primary/15 bg-primary/10">
                      <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                        {accountInitials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden min-w-0 flex-col items-start text-left lg:flex">
                      <span className="max-w-[140px] truncate text-xs font-semibold leading-4 text-foreground">
                        {user?.fullName || shellCopy.demoWorkspace}
                      </span>
                      <span className="max-w-[140px] truncate text-[11px] leading-4 text-muted-foreground">
                        {user?.email || shellCopy.sessionLabel}
                      </span>
                    </span>
                    <Badge variant="secondary" className="hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] md:inline-flex">
                      {accountRoleLabel}
                    </Badge>
                    <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 rounded-2xl p-2">
                  <DropdownMenuLabel className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    {user?.email || shellCopy.sessionLabel}
                  </DropdownMenuLabel>
                  <DropdownMenuItem className="rounded-xl py-3 text-sm font-semibold" onSelect={() => navigate('/account')}>
                    {accountRoleLabel}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="gap-2 rounded-xl text-destructive focus:text-destructive" disabled={signingOut} onSelect={handleSignOut}>
                    <LogOut className="size-4" />
                    {signingOut ? shellCopy.signingOut : shellCopy.logout}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <PrimeCommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
          <main
            id="main-content"
            className="h-[calc(100%-var(--header-height))] min-w-0 overflow-y-auto overflow-x-auto animate-in fade-in-5 duration-200"
          >
            <Outlet />
          </main>
        </GlobalCopilotWorkspace>
      </div>
    </div>
  );
}
