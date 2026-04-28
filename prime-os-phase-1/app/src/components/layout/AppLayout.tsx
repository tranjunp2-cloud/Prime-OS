import { type KeyboardEvent as ReactKeyboardEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import {
  BellRing,
  ChevronRight,
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
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { seedDemoData } from '@/lib/demo-data-seeder';
import { getPrimeSnapshot } from '@/lib/prime/prime-data';
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

const searchKindMeta: Record<SearchKind, { icon: ReactNode; label: string }> = {
  Product: { icon: <Package className="size-4" />, label: 'Product' },
  SKU: { icon: <Hash className="size-4" />, label: 'SKU' },
  Order: { icon: <ShoppingCart className="size-4" />, label: 'Order' },
  Lead: { icon: <UserRoundCheck className="size-4" />, label: 'Lead' },
  Customer: { icon: <UserRoundCheck className="size-4" />, label: 'Customer' },
  RFQ: { icon: <ClipboardList className="size-4" />, label: 'RFQ' },
  Campaign: { icon: <Megaphone className="size-4" />, label: 'Campaign' },
  Alert: { icon: <BellRing className="size-4" />, label: 'Alert' },
};

function normalizeSearchText(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

function buildSearchText(parts: unknown[]) {
  return parts.map((part) => normalizeSearchText(part)).filter(Boolean).join(' ');
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
  const navigate = useNavigate();
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

  const shouldShowSearchPanel = searchOpen && searchQuery.trim().length > 0;

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
        Skip to main content
      </a>
      <AppSidebar />
      <div className="flex-1 min-w-0 overflow-hidden">
        <GlobalCopilotWorkspace>
          <header className="sticky top-0 z-30 flex min-h-[var(--header-height)] items-center gap-3 border-b border-border bg-card/80 px-4 backdrop-blur-xl md:px-6">
            <div ref={searchBoxRef} className="relative min-w-0 flex-1 md:max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Global entity search"
                autoComplete="off"
                className="h-10 rounded-xl border-input bg-card pl-9 pr-16 text-sm transition-[border-color,box-shadow] focus-visible:border-primary/45"
                placeholder="Search product, SKU, order, lead, customer, alert..."
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
                  aria-label="Clear search"
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
                  aria-label="Open command palette"
                  className="font-identifier absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:text-foreground sm:block"
                  onClick={() => setCommandOpen(true)}
                >
                  Cmd K
                </button>
              )}

              {shouldShowSearchPanel ? (
                <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[80] overflow-hidden rounded-2xl border bg-card shadow-2xl">
                  <div className="border-b px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Search PrimeOS
                  </div>

                  {visibleSearchResults.length > 0 ? (
                    <div className="max-h-[min(70vh,420px)] overflow-y-auto p-2">
                      {visibleSearchResults.map((result, index) => {
                        const meta = searchKindMeta[result.kind];
                        const isActive = index === activeSearchIndex;

                        return (
                          <button
                            key={result.id}
                            type="button"
                            className={cn(
                              'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
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
                      Không tìm thấy kết quả phù hợp. Thử SKU, order ID, tên khách hàng hoặc tên campaign khác nhé.
                    </div>
                  )}
                </div>
              ) : null}
            </div>
            <div className="hidden min-w-0 flex-col text-right md:flex">
              <span className="text-[11px] font-medium text-muted-foreground">Prime OS session</span>
              <span className="max-w-[180px] truncate text-xs font-semibold text-foreground">
                {user?.email || 'Demo workspace'}
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              disabled={signingOut}
              className="shrink-0"
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">{signingOut ? 'Signing out...' : 'Logout'}</span>
            </Button>
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
