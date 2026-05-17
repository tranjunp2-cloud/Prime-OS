import { ArrowRight, CheckCircle2, ClipboardList, Globe, ImagePlus, Instagram, Mail, Megaphone, MessageCircle, PackagePlus, PanelsTopLeft, Phone, RadioTower, ScanSearch, Search, Send, SlidersHorizontal, Sparkles, Target, TrendingUp, Upload, Youtube } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getSkuLabel, getSkuProductName } from '@/lib/prime/prime-data';
import { getDemandSourceTypeLabel, type DemandSourceType } from '@/lib/prime/demand-sources';
import { getMarketplaceSourcePageHref, getMarketplaceSourcePageMeta, type MarketplaceCampaignAttribution, type MarketplaceDataHealthItem, type MarketplaceDemandSignal, type MarketplaceInquiry, type MarketplaceSkuSignal, type MarketplaceSourcePage, type MarketplaceSourceSnapshot } from '@/lib/prime/marketplace-source';
import { cn } from '@/lib/utils';

export function marketplacePageIcon(page: MarketplaceSourcePage) {
  const icons = {
    overview: Globe,
    accounts: CircleUserRound,
    'demand-signals': RadioTower,
    'product-sku-signals': PackagePlus,
    'inquiry-lead-intake': MessageCircle,
    'campaign-attribution': Megaphone,
    'source-quality': Gauge,
    'data-health': SlidersHorizontal,
    detail: ScanSearch,
  } as const;

  return icons[page] || Globe;
}

function marketplaceStatusVariant(status: string): 'default' | 'secondary' | 'warning' | 'outline' | 'destructive' {
  if (status === 'active' || status === 'healthy' || status === 'routed' || status === 'converted_to_rfq') return 'default';
  if (status === 'needs_review' || status === 'stale' || status === 'needs_qualification' || status === 'mapping_issue' || status === 'duplicate_risk') return 'warning';
  if (status === 'failed' || status === 'duplicate' || status === 'suppressed') return 'destructive';
  if (status === 'inactive') return 'secondary';
  return 'outline';
}

function prettyMarketplaceLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export function sourceGraphicToneClassName(index: number) {
  const tones = [
    'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300',
    'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-300',
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300',
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300',
    'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300',
  ];
  return tones[index % tones.length];
}

export function sourceChildIcon(type: DemandSourceType, child: string) {
  const normalized = child.toLowerCase();
  if (type === 'marketplace') {
    if (normalized.includes('shop') || normalized.includes('market')) return Globe;
    return PackagePlus;
  }
  if (type === 'social') {
    if (normalized.includes('instagram')) return Instagram;
    if (normalized.includes('youtube')) return Youtube;
    if (normalized.includes('line') || normalized.includes('community')) return MessageCircle;
    if (normalized.includes('facebook')) return MessageCircle;
    return RadioTower;
  }
  if (type === 'ads') {
    if (normalized.includes('google')) return Search;
    if (normalized.includes('meta')) return Target;
    if (normalized.includes('marketplace')) return Globe;
    return Megaphone;
  }
  if (type === 'partner') {
    if (normalized.includes('creator') || normalized.includes('kol')) return Sparkles;
    if (normalized.includes('affiliate')) return Heart;
    if (normalized.includes('agency')) return PanelsTopLeft;
    return HeartHandshake;
  }
  if (normalized.includes('csv') || normalized.includes('upload')) return Upload;
  if (normalized.includes('sales')) return Phone;
  if (normalized.includes('event')) return CalendarCheck;
  if (normalized.includes('offline')) return Mail;
  return ClipboardList;
}

export function SourceOperatingLoopGraphic({
  type,
  hrefForPage,
}: {
  type: DemandSourceType;
  hrefForPage: (page: SourceWorkspacePage) => string;
}) {
  const stages = [
    { label: 'Source', detail: 'Origin registry', icon: sourceFunctionIcon(type), href: hrefForPage('accounts') },
    { label: 'Signal', detail: 'Intent evidence', icon: RadioTower, href: hrefForPage('demand-signals') },
    { label: 'Lead / RFQ', detail: 'Qualified demand', icon: UserRoundCheck, href: hrefForPage('inquiry-lead-intake') },
    { label: 'Readback', detail: 'Campaign outcome', icon: TrendingUp, href: hrefForPage('campaign-attribution') },
  ];

  return (
    <Card className="rounded-2xl border bg-muted/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-5 text-primary" />
          Operating source loop
        </CardTitle>
        <p className="text-sm text-muted-foreground">Icon path from origin to commercial readback; each step opens its operating page.</p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-4">
          {stages.map((stage, index) => {
            const Icon = stage.icon;
            return (
              <Link
                key={stage.label}
                to={stage.href}
                className="group relative rounded-2xl border bg-background p-4 transition-colors hover:border-primary/35 hover:bg-primary/5"
              >
                <div className={`flex size-11 items-center justify-center rounded-xl border ${sourceGraphicToneClassName(index)}`}>
                  <Icon className="size-5" />
                </div>
                <div className="mt-4 font-semibold">{stage.label}</div>
                <p className="mt-1 text-sm text-muted-foreground">{stage.detail}</p>
                <div className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary">
                  Open
                  <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function MarketplaceVisualRouteMap({ marketplace }: { marketplace: MarketplaceSourceSnapshot }) {
  return (
    <Card className="rounded-2xl border">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe className="size-5 text-primary" />
              Marketplace route map
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">A visual registry of marketplace accounts, quality, and lead/RFQ contribution.</p>
          </div>
          <Badge variant="outline">{marketplace.accounts.length} account classes</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {marketplace.accounts.map((account, index) => {
          const Icon = sourceChildIcon('marketplace', account.marketplace);
          const quality = account.sourceIds.length
            ? Math.round(marketplace.sources.filter((source) => account.sourceIds.includes(source.id)).reduce((sum, source) => sum + source.qualityScore, 0) / account.sourceIds.length)
            : 0;
          return (
            <Link
              key={account.id}
              to={account.sourceIds[0] ? getMarketplaceSourcePageHref('detail', account.sourceIds[0]) : getMarketplaceSourcePageHref('accounts')}
              className="rounded-2xl border bg-background p-4 transition-colors hover:border-primary/35 hover:bg-primary/5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className={`flex size-11 items-center justify-center rounded-xl border ${sourceGraphicToneClassName(index)}`}>
                  <Icon className="size-5" />
                </div>
                <Badge variant={marketplaceStatusVariant(account.status)}>{prettyMarketplaceLabel(account.status)}</Badge>
              </div>
              <div className="mt-4 font-semibold">{account.marketplace}</div>
              <p className="mt-1 line-clamp-2 min-h-10 text-xs text-muted-foreground">{account.storefrontName}</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                <div><div className="text-muted-foreground">Q</div><div className="font-semibold">{quality}</div></div>
                <div><div className="text-muted-foreground">Lead</div><div className="font-semibold">{account.leadCount}</div></div>
                <div><div className="text-muted-foreground">RFQ</div><div className="font-semibold">{account.rfqCount}</div></div>
              </div>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}

function MarketplaceSourceWorkspace({ marketplace }: { marketplace: MarketplaceSourceSnapshot }) {
  const pageMeta = getMarketplaceSourcePageMeta(marketplace.page);
  const PageIcon = marketplacePageIcon(marketplace.page);

  return (
    <div className="min-h-full bg-background">
      <div className="space-y-5 p-4 md:p-6">
        <Card className="rounded-2xl border">
          <CardContent className="p-2">
            <div className="flex gap-2 overflow-x-auto">
              {MARKETPLACE_SOURCE_PAGES.filter((item) => item.id !== 'detail').map((item) => {
                const Icon = marketplacePageIcon(item.id);
                const isActive = marketplace.page === item.id;
                return (
                  <Link
                    key={item.id}
                    to={getMarketplaceSourcePageHref(item.id)}
                    className={`inline-flex min-w-fit items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border bg-muted/10">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <PageIcon className="size-5" />
              {pageMeta.label}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{pageMeta.description}</p>
          </CardHeader>
        </Card>

        {marketplace.page === 'overview' ? <MarketplaceOverviewView marketplace={marketplace} /> : null}
        {marketplace.page === 'accounts' ? <MarketplaceAccountsView marketplace={marketplace} /> : null}
        {marketplace.page === 'demand-signals' ? <MarketplaceDemandSignalsView marketplace={marketplace} /> : null}
        {marketplace.page === 'product-sku-signals' ? <MarketplaceSkuSignalsView marketplace={marketplace} /> : null}
        {marketplace.page === 'inquiry-lead-intake' ? <MarketplaceInquiryLeadIntakeView marketplace={marketplace} /> : null}
        {marketplace.page === 'campaign-attribution' ? <MarketplaceCampaignAttributionView marketplace={marketplace} /> : null}
        {marketplace.page === 'source-quality' ? <MarketplaceSourceQualityView marketplace={marketplace} /> : null}
        {marketplace.page === 'data-health' ? <MarketplaceDataHealthView marketplace={marketplace} /> : null}
        {marketplace.page === 'detail' ? <MarketplaceDetailView marketplace={marketplace} /> : null}
      </div>
    </div>
  );
}

function MarketplaceKpiStrip({ marketplace }: { marketplace: MarketplaceSourceSnapshot }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
      <SummaryMetricCard label="Marketplace sources" value={marketplace.overview.totalMarketplaceSources} metaTooltip="Total DemandSource rows classified as Marketplace Source." icon={<Globe className="size-5" />} tone="info" />
      <SummaryMetricCard label="Active marketplaces" value={marketplace.overview.activeMarketplaces} metaTooltip="Marketplace accounts with live or reviewable signal sources." icon={<CircleUserRound className="size-5" />} tone="success" />
      <SummaryMetricCard label="Marketplace leads" value={marketplace.overview.totalMarketplaceLeads} metaTooltip="Lead count traced to marketplace source lineage." icon={<UserRoundCheck className="size-5" />} tone="teal" />
      <SummaryMetricCard label="RFQs" value={marketplace.overview.totalRfqs} metaTooltip="RFQs linked back through marketplace sources and campaigns." icon={<ClipboardList className="size-5" />} tone="warning" />
      <SummaryMetricCard label="Top marketplace" value={marketplace.overview.topDemandMarketplace} metaTooltip="Marketplace with the strongest blend of signals, leads, and RFQs." icon={<Target className="size-5" />} tone="purple" />
      <SummaryMetricCard label="Quality score" value={`${marketplace.overview.marketplaceSourceQualityScore}`} metaTooltip="Average quality score for marketplace sources." icon={<Gauge className="size-5" />} tone={marketplace.overview.sourcesNeedingReview ? 'warning' : 'success'} />
    </div>
  );
}

function MarketplaceQualityChart({ marketplace }: { marketplace: MarketplaceSourceSnapshot }) {
  const chartData = marketplace.accounts.map((account) => ({
    marketplace: account.marketplace,
    quality: account.sourceIds.length
      ? Math.round(marketplace.sources.filter((source) => account.sourceIds.includes(source.id)).reduce((sum, source) => sum + source.qualityScore, 0) / account.sourceIds.length)
      : 0,
  }));
  const config = {
    quality: {
      label: 'Quality',
      color: 'hsl(var(--primary))',
    },
  } satisfies ChartConfig;

  return (
    <ChartContainer config={config} className="h-64 w-full" aria-label={`Marketplace source quality: ${chartData.map((row) => `${row.marketplace} ${row.quality}`).join(', ')}`}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 42, top: 8, bottom: 8 }}>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" domain={[0, 100]} hide />
        <YAxis type="category" dataKey="marketplace" width={112} tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Bar dataKey="quality" fill="var(--color-quality)" radius={[0, 6, 6, 0]} barSize={18}>
          <LabelList dataKey="quality" position="right" formatter={(value: number) => `${value}`} className="fill-foreground font-medium" />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

function MarketplaceFunnel({ marketplace }: { marketplace: MarketplaceSourceSnapshot }) {
  const stages = [
    { label: 'Signals', value: marketplace.overview.totalSignalVolume, href: getMarketplaceSourcePageHref('demand-signals') },
    { label: 'Inquiries', value: marketplace.inquiries.length, href: getMarketplaceSourcePageHref('inquiry-lead-intake') },
    { label: 'Leads', value: marketplace.overview.totalMarketplaceLeads, href: getMarketplaceSourcePageHref('inquiry-lead-intake') },
    { label: 'RFQs', value: marketplace.overview.totalRfqs, href: getMarketplaceSourcePageHref('inquiry-lead-intake') },
    { label: 'Readback', value: marketplace.attribution.reduce((sum, item) => sum + item.orders, 0), href: getMarketplaceSourcePageHref('campaign-attribution') },
  ];
  const max = Math.max(...stages.map((stage) => stage.value), 1);

  return (
    <div className="space-y-3">
      {stages.map((stage, index) => (
        <Link key={stage.label} to={stage.href} className="block rounded-xl border bg-background p-3 transition-colors hover:border-primary/35 hover:bg-primary/5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-md border bg-muted text-xs font-semibold">{index + 1}</span>
              <span className="text-sm font-semibold">{stage.label}</span>
            </div>
            <span className="text-sm font-semibold tabular-nums">{formatCompactCount(stage.value)}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(8, Math.round(stage.value / max * 100))}%` }} />
          </div>
        </Link>
      ))}
    </div>
  );
}

function MarketplaceOverviewView({ marketplace }: { marketplace: MarketplaceSourceSnapshot }) {
  const topSource = marketplace.sources[0];
  const reviewItems = [
    ...marketplace.sources.filter((source) => source.status === 'needs_review' || source.blockers.length > 0).slice(0, 2).map((source) => ({
      id: source.id,
      title: source.name,
      detail: source.blockers[0] || source.actionReason,
      href: getMarketplaceSourcePageHref('detail', source.id),
    })),
    ...marketplace.dataHealth.filter((item) => item.status !== 'healthy').slice(0, 2).map((item) => ({
      id: item.id,
      title: `${item.marketplace} data health`,
      detail: `${prettyMarketplaceLabel(item.status)} / ${item.actionLabel}`,
      href: getMarketplaceSourcePageHref('data-health'),
    })),
  ];

  return (
    <div className="space-y-4">
      <MarketplaceKpiStrip marketplace={marketplace} />
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
        <MarketplaceVisualRouteMap marketplace={marketplace} />
        <SourceOperatingLoopGraphic
          type="marketplace"
          hrefForPage={(page) => getMarketplaceSourcePageHref(page)}
        />
      </section>
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
        <Card className="rounded-2xl border">
          <CardHeader>
            <CardTitle>First-screen answer</CardTitle>
            <p className="text-sm text-muted-foreground">Which marketplace source deserves action now?</p>
          </CardHeader>
          <CardContent>
            {topSource ? (
              <div className="rounded-2xl border bg-primary/5 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-2xl font-semibold tracking-tight">{topSource.name}</div>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{topSource.actionReason}</p>
                  </div>
                  <div className="min-w-24 rounded-xl bg-background p-3 text-center shadow-sm">
                    <div className="text-xs text-muted-foreground">Quality</div>
                    <div className="text-2xl font-semibold">{topSource.qualityScore}</div>
                  </div>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-4">
                  <RuntimeContextCard label="Marketplace" value={marketplace.accounts.find((account) => account.sourceIds.includes(topSource.id))?.marketplace || 'Marketplace'} detail={topSource.market} />
                  <RuntimeContextCard label="Leads / RFQs" value={`${topSource.leadCount} / ${topSource.rfqCount}`} detail="Marketplace source lineage." />
                  <RuntimeContextCard label="Freshness" value={topSource.lastSyncAt} detail={`${topSource.freshnessMinutes} minutes.`} />
                  <RuntimeContextCard label="SKU" value={topSource.skuCode} detail={topSource.productName} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button asChild>
                    <Link to={topSource.nextActionRoute}>
                      {topSource.nextAction}
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to={getMarketplaceSourcePageHref('detail', topSource.id)}>View detail</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                No marketplace sources connected yet. Review Sources setup before scaling marketplace demand.
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="rounded-2xl border">
          <CardHeader>
            <CardTitle>Marketplace quality</CardTitle>
            <p className="text-sm text-muted-foreground">Quality score by marketplace account class.</p>
          </CardHeader>
          <CardContent>
            <MarketplaceQualityChart marketplace={marketplace} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(340px,0.75fr)_minmax(0,1.25fr)]">
        <Card className="rounded-2xl border">
          <CardHeader>
            <CardTitle>Signal to outcome funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <MarketplaceFunnel marketplace={marketplace} />
          </CardContent>
        </Card>
        <Card className="rounded-2xl border border-warning/30 bg-warning/5">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Needs-review lane</CardTitle>
              <Badge variant="warning">{reviewItems.length} visible</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {reviewItems.length ? reviewItems.map((item) => (
              <Link key={item.id} to={item.href} className="rounded-xl border bg-background p-4 transition-colors hover:border-primary/35 hover:bg-primary/5">
                <div className="font-semibold">{item.title}</div>
                <p className="mt-2 text-sm text-muted-foreground">{item.detail}</p>
              </Link>
            )) : (
              <div className="rounded-xl border bg-background p-4 text-sm text-muted-foreground">No marketplace review blockers are visible.</div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function MarketplaceAccountsView({ marketplace }: { marketplace: MarketplaceSourceSnapshot }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryMetricCard label="Connected accounts" value={marketplace.accounts.filter((account) => account.status !== 'inactive').length} metaTooltip="Accounts with at least one active or reviewable marketplace source." icon={<CircleUserRound className="size-5" />} tone="info" />
        <SummaryMetricCard label="Healthy feeds" value={marketplace.dataHealth.filter((item) => item.status === 'healthy').length} metaTooltip="Marketplace feeds without stale, duplicate, or mapping blockers." icon={<Gauge className="size-5" />} tone="success" />
        <SummaryMetricCard label="Pending review" value={marketplace.accounts.filter((account) => account.status === 'needs_review').length} metaTooltip="Accounts blocked by owner, mapping, quality, or sync concerns." icon={<BellRing className="size-5" />} tone="warning" />
        <SummaryMetricCard label="Stale syncs" value={marketplace.accounts.filter((account) => account.status === 'stale' || account.freshnessMinutes > 60).length} metaTooltip="Accounts whose latest source data is stale." icon={<SlidersHorizontal className="size-5" />} tone="purple" />
      </div>
      <Card className="rounded-2xl border">
        <CardHeader>
          <CardTitle>Marketplace account registry</CardTitle>
          <p className="text-sm text-muted-foreground">Account/storefront status, owner, ingestion mode, sync, linked SKUs, and action blockers.</p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table variant="embedded">
            <TableHeader>
              <TableRow>
                <TableHead>Marketplace</TableHead>
                <TableHead>Account / storefront</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last sync</TableHead>
                <TableHead className="text-right">Signals</TableHead>
                <TableHead className="text-right">Leads / RFQs</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {marketplace.accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">{account.marketplace}</TableCell>
                  <TableCell>
                    <div className="font-medium">{account.accountName}</div>
                    <div className="text-xs text-muted-foreground">{account.storefrontName} / {account.market}</div>
                  </TableCell>
                  <TableCell>{account.ownerLabel}</TableCell>
                  <TableCell><Badge variant={marketplaceStatusVariant(account.status)}>{prettyMarketplaceLabel(account.status)}</Badge></TableCell>
                  <TableCell>{account.lastSyncAt}</TableCell>
                  <TableCell className="text-right">{formatCompactCount(account.signalVolume)}</TableCell>
                  <TableCell className="text-right">{account.leadCount} / {account.rfqCount}</TableCell>
                  <TableCell>
                    <Button asChild size="sm" variant="outline">
                      <Link to={account.sourceIds[0] ? getMarketplaceSourcePageHref('detail', account.sourceIds[0]) : getMarketplaceSourcePageHref('data-health')}>
                        {account.status === 'inactive' ? 'Reconnect' : 'Open detail'}
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function MarketplaceDemandSignalsView({ marketplace }: { marketplace: MarketplaceSourceSnapshot }) {
  const signalTypes = Array.from(new Set(marketplace.demandSignals.map((signal) => signal.signalType)));
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryMetricCard label="Signal volume" value={formatCompactCount(marketplace.overview.totalSignalVolume)} metaTooltip="Normalized marketplace signal volume." icon={<RadioTower className="size-5" />} tone="info" />
        <SummaryMetricCard label="High intent" value={marketplace.demandSignals.filter((signal) => signal.confidence >= 78).length} metaTooltip="Signals with confidence at or above 78." icon={<Target className="size-5" />} tone="success" />
        <SummaryMetricCard label="Fresh signals" value={marketplace.demandSignals.filter((signal) => signal.freshnessMinutes <= 30).length} metaTooltip="Signals refreshed in 30 minutes or less." icon={<Gauge className="size-5" />} tone="teal" />
        <SummaryMetricCard label="Signal types" value={signalTypes.length} metaTooltip={signalTypes.map(prettyMarketplaceLabel).join(', ')} icon={<SlidersHorizontal className="size-5" />} tone="purple" />
      </div>
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
        <Card className="rounded-2xl border">
          <CardHeader>
            <CardTitle>Marketplace demand signals</CardTitle>
            <p className="text-sm text-muted-foreground">Normalized intent events with source, SKU, confidence, freshness, and next action.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {marketplace.demandSignals.map((signal) => (
              <MarketplaceSignalRow key={signal.id} signal={signal} />
            ))}
          </CardContent>
        </Card>
        <Card className="rounded-2xl border">
          <CardHeader>
            <CardTitle>Marketplace x signal type</CardTitle>
          </CardHeader>
          <CardContent>
            <MarketplaceSignalHeatmap marketplace={marketplace} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function MarketplaceSignalRow({ signal }: { signal: MarketplaceDemandSignal }) {
  return (
    <Link to={getMarketplaceSourcePageHref('detail', signal.sourceId)} className="grid gap-3 rounded-xl border bg-background p-3 transition-colors hover:border-primary/35 hover:bg-primary/5 md:grid-cols-[1fr_120px_120px_120px_auto] md:items-center">
      <div className="min-w-0">
        <div className="font-semibold">{prettyMarketplaceLabel(signal.signalType)}</div>
        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{signal.marketplace} / {signal.productName} / {signal.skuCode}</p>
      </div>
      <div>
        <div className="text-xs text-muted-foreground">Volume</div>
        <div className="font-semibold">{formatCompactCount(signal.volume)}</div>
      </div>
      <div>
        <div className="text-xs text-muted-foreground">Confidence</div>
        <div className="font-semibold">{signal.confidence}%</div>
      </div>
      <div>
        <div className="text-xs text-muted-foreground">Freshness</div>
        <div className="font-semibold">{signal.freshnessMinutes}m</div>
      </div>
      <Badge variant="outline">{signal.recommendedAction}</Badge>
    </Link>
  );
}

function MarketplaceSignalHeatmap({ marketplace }: { marketplace: MarketplaceSourceSnapshot }) {
  const types: MarketplaceDemandSignal['signalType'][] = ['search_trend', 'product_view', 'add_to_cart', 'wishlist', 'inquiry', 'buyer_behavior', 'campaign_click', 'order_readback'];
  return (
    <div className="space-y-2">
      {marketplace.accounts.map((account) => (
        <div key={account.id} className="grid grid-cols-[92px_repeat(4,minmax(0,1fr))] gap-2 xl:grid-cols-[102px_repeat(8,minmax(0,1fr))]">
          <div className="truncate text-xs font-semibold">{account.marketplace}</div>
          {types.map((type) => {
            const value = marketplace.demandSignals
              .filter((signal) => signal.marketplace === account.marketplace && signal.signalType === type)
              .reduce((sum, signal) => sum + signal.volume, 0);
            return (
              <div key={`${account.id}-${type}`} className={`rounded-md border px-2 py-1 text-center text-[11px] ${value ? 'border-primary/25 bg-primary/10 text-primary' : 'bg-muted/25 text-muted-foreground'}`} title={`${account.marketplace} ${type}: ${value}`}>
                {value ? formatCompactCount(value) : '-'}
              </div>
            );
          })}
        </div>
      ))}
      <p className="text-xs text-muted-foreground">Cells show normalized signal volume by marketplace and signal type.</p>
    </div>
  );
}

function MarketplaceSkuSignalsView({ marketplace }: { marketplace: MarketplaceSourceSnapshot }) {
  const mapped = marketplace.skuSignals.filter((signal) => signal.isMapped);
  const unmapped = marketplace.skuSignals.filter((signal) => !signal.isMapped);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryMetricCard label="Active SKU demand" value={mapped.length} metaTooltip="Marketplace SKU/listing signals mapped to internal SKUs." icon={<PackagePlus className="size-5" />} tone="info" />
        <SummaryMetricCard label="Top SKU quality" value={mapped[0]?.listingPerformance || 0} metaTooltip={mapped[0]?.productName || 'No mapped SKU.'} icon={<Sparkles className="size-5" />} tone="success" />
        <SummaryMetricCard label="Inventory blocked" value={marketplace.skuSignals.filter((signal) => signal.inventoryRisk === 'high').length} metaTooltip="Marketplace SKU signals blocked by high inventory risk." icon={<BellRing className="size-5" />} tone="warning" />
        <SummaryMetricCard label="Unmapped" value={unmapped.length} metaTooltip="Marketplace listing/SKU rows without internal mapping." icon={<SlidersHorizontal className="size-5" />} tone="purple" />
      </div>
      <Card className="rounded-2xl border">
        <CardHeader>
          <CardTitle>SKU signal matrix</CardTitle>
          <p className="text-sm text-muted-foreground">Mapped SKU demand by marketplace with listing performance, price fit, and guardrails.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {marketplace.skuSignals.map((signal) => (
            <Link key={signal.id} to={getMarketplaceSourcePageHref('detail', signal.linkedSourceIds[0])} className="grid gap-3 rounded-xl border p-3 transition-colors hover:border-primary/35 hover:bg-primary/5 md:grid-cols-[1fr_110px_110px_110px_110px_auto] md:items-center">
              <div className="min-w-0">
                <div className="font-semibold">{signal.skuCode}</div>
                <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{signal.productName} / {signal.category}</p>
              </div>
              <div><div className="text-xs text-muted-foreground">Marketplace</div><div className="font-semibold">{signal.marketplace}</div></div>
              <div><div className="text-xs text-muted-foreground">Demand</div><div className="font-semibold">{formatCompactCount(signal.demandSignal)}</div></div>
              <div><div className="text-xs text-muted-foreground">Listing</div><div className="font-semibold">{signal.listingPerformance}%</div></div>
              <div><div className="text-xs text-muted-foreground">Price fit</div><div className="font-semibold">{signal.priceCompetitiveness}%</div></div>
              <Badge variant={sourceRiskBadgeVariant(signal.inventoryRisk)}>Stock {signal.inventoryRisk}</Badge>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function MarketplaceInquiryLeadIntakeView({ marketplace }: { marketplace: MarketplaceSourceSnapshot }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <SummaryMetricCard label="New inquiries" value={marketplace.inquiries.filter((item) => item.status === 'new').length} metaTooltip="Marketplace messages or questions awaiting qualification." icon={<MessageCircle className="size-5" />} tone="info" />
        <SummaryMetricCard label="Qualified leads" value={marketplace.inquiries.filter((item) => item.status === 'routed').length} metaTooltip="Inquiries already routed as lead work." icon={<UserRoundCheck className="size-5" />} tone="success" />
        <SummaryMetricCard label="RFQ ready" value={marketplace.inquiries.filter((item) => item.status === 'converted_to_rfq').length} metaTooltip="Inquiry rows with RFQ readiness/readback." icon={<ClipboardList className="size-5" />} tone="teal" />
        <SummaryMetricCard label="SLA risk" value={marketplace.inquiries.filter((item) => item.slaAgeHours >= 12).length} metaTooltip="Marketplace inquiries aging past the safe response window." icon={<BellRing className="size-5" />} tone="warning" />
        <SummaryMetricCard label="Duplicate risk" value={marketplace.inquiries.filter((item) => item.status === 'duplicate').length} metaTooltip="Inquiries that should not auto-route." icon={<Trash2 className="size-5" />} tone="purple" />
      </div>
      <Card className="rounded-2xl border">
        <CardHeader>
          <CardTitle>Inquiry and lead intake queue</CardTitle>
          <p className="text-sm text-muted-foreground">Explicit qualification, owner/SLA, duplicate state, and handoff lineage.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {marketplace.inquiries.map((inquiry) => (
            <MarketplaceInquiryRow key={inquiry.id} inquiry={inquiry} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function MarketplaceInquiryRow({ inquiry }: { inquiry: MarketplaceInquiry }) {
  const canRoute = inquiry.status !== 'duplicate' && inquiry.status !== 'suppressed';
  return (
    <div className="grid gap-3 rounded-xl border bg-background p-4 md:grid-cols-[1fr_110px_110px_110px_auto] md:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="font-semibold">{inquiry.buyerLabel}</div>
          <Badge variant={marketplaceStatusVariant(inquiry.status)}>{prettyMarketplaceLabel(inquiry.status)}</Badge>
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{inquiry.summary}</p>
      </div>
      <div><div className="text-xs text-muted-foreground">Intent</div><div className="font-semibold">{prettyMarketplaceLabel(inquiry.intent)}</div></div>
      <div><div className="text-xs text-muted-foreground">Score</div><div className="font-semibold">{inquiry.leadScore}</div></div>
      <div><div className="text-xs text-muted-foreground">SLA age</div><div className="font-semibold">{inquiry.slaAgeHours}h</div></div>
      <div className="flex flex-wrap gap-2 md:justify-end">
        <Button size="sm" disabled={!canRoute}>{inquiry.rfqReadiness >= 50 ? 'Create RFQ' : 'Qualify'}</Button>
        <Button asChild size="sm" variant="outline">
          <Link to={getMarketplaceSourcePageHref('detail', inquiry.sourceId)}>Detail</Link>
        </Button>
      </div>
    </div>
  );
}

function MarketplaceCampaignAttributionView({ marketplace }: { marketplace: MarketplaceSourceSnapshot }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryMetricCard label="Attributed leads" value={marketplace.attribution.reduce((sum, item) => sum + item.leads, 0)} metaTooltip="Marketplace leads with campaign/source readback." icon={<UserRoundCheck className="size-5" />} tone="info" />
        <SummaryMetricCard label="Campaign RFQs" value={marketplace.attribution.reduce((sum, item) => sum + item.rfqs, 0)} metaTooltip="RFQs connected to marketplace campaign touchpoints." icon={<ClipboardList className="size-5" />} tone="success" />
        <SummaryMetricCard label="Orders readback" value={marketplace.attribution.reduce((sum, item) => sum + item.orders, 0)} metaTooltip="Order readback preview; not final attribution truth." icon={<TrendingUp className="size-5" />} tone="warning" />
        <SummaryMetricCard label="Low confidence" value={marketplace.attribution.filter((item) => item.attributionConfidence < 70).length} metaTooltip="Rows needing review before attribution decisions." icon={<BellRing className="size-5" />} tone="purple" />
      </div>
      <Card className="rounded-2xl border">
        <CardHeader>
          <CardTitle>Campaign attribution preview</CardTitle>
          <p className="text-sm text-muted-foreground">Marketplace campaign source, promotion, lead/RFQ mapping, and confidence readback.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {marketplace.attribution.map((item) => (
            <MarketplaceAttributionRow key={item.id} item={item} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function MarketplaceAttributionRow({ item }: { item: MarketplaceCampaignAttribution }) {
  return (
    <Link to={getMarketplaceSourcePageHref('detail', item.sourceId)} className="block rounded-xl border bg-background p-4 transition-colors hover:border-primary/35 hover:bg-primary/5">
      <div className="grid gap-3 md:grid-cols-[1fr_220px_120px_120px_auto] md:items-center">
        <div className="min-w-0">
          <div className="font-semibold">{item.campaignName}</div>
          <p className="mt-1 text-xs text-muted-foreground">{item.marketplace} / preview readback, not final attribution truth</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {item.touchpoints.map((touchpoint) => (
            <Badge key={`${item.id}-${touchpoint.label}`} variant="outline">{touchpoint.label} {touchpoint.confidence}%</Badge>
          ))}
        </div>
        <div><div className="text-xs text-muted-foreground">Leads / RFQs</div><div className="font-semibold">{item.leads} / {item.rfqs}</div></div>
        <div><div className="text-xs text-muted-foreground">Orders</div><div className="font-semibold">{item.orders}</div></div>
        <Badge variant={item.attributionConfidence < 70 ? 'warning' : 'default'}>{item.attributionConfidence}% confidence</Badge>
      </div>
    </Link>
  );
}

function MarketplaceSourceQualityView({ marketplace }: { marketplace: MarketplaceSourceSnapshot }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryMetricCard label="Average quality" value={marketplace.overview.marketplaceSourceQualityScore} metaTooltip="Average marketplace source quality." icon={<Gauge className="size-5" />} tone="info" />
        <SummaryMetricCard label="Top source" value={marketplace.sources[0]?.qualityScore || 0} metaTooltip={marketplace.sources[0]?.name || 'No marketplace source.'} icon={<Target className="size-5" />} tone="success" />
        <SummaryMetricCard label="Scale candidates" value={marketplace.sources.filter((source) => source.nextAction === 'Scale').length} metaTooltip="High-quality RFQ-ready sources without hard blockers." icon={<TrendingUp className="size-5" />} tone="teal" />
        <SummaryMetricCard label="Review sources" value={marketplace.overview.sourcesNeedingReview} metaTooltip="Stale, duplicate, inventory, finance, or mapping blockers." icon={<BellRing className="size-5" />} tone="warning" />
      </div>
      <Card className="rounded-2xl border">
        <CardHeader>
          <CardTitle>Marketplace source quality ranking</CardTitle>
          <p className="text-sm text-muted-foreground">Every score shows reasons, blockers, and recommended action.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {marketplace.sources.map((source) => (
            <Link key={source.id} to={getMarketplaceSourcePageHref('detail', source.id)} className="block rounded-xl border p-4 transition-colors hover:border-primary/35 hover:bg-primary/5">
              <div className="grid gap-3 md:grid-cols-[1fr_240px_140px_auto] md:items-center">
                <div className="min-w-0">
                  <div className="font-semibold">{source.name}</div>
                  <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{source.scoreReasons.join(' / ')}</p>
                </div>
                <SourceQualityBar value={source.qualityScore} />
                <Badge variant={sourceStatusVariant(source)}>{source.nextAction}</Badge>
                <div className="text-xs text-muted-foreground md:text-right">{source.blockers[0] || source.actionReason}</div>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function MarketplaceDataHealthView({ marketplace }: { marketplace: MarketplaceSourceSnapshot }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <SummaryMetricCard label="Healthy feeds" value={marketplace.dataHealth.filter((item) => item.status === 'healthy').length} metaTooltip="Marketplace feeds without current blockers." icon={<Gauge className="size-5" />} tone="success" />
        <SummaryMetricCard label="Stale feeds" value={marketplace.dataHealth.filter((item) => item.status === 'stale').length} metaTooltip="Feeds past freshness threshold." icon={<BellRing className="size-5" />} tone="warning" />
        <SummaryMetricCard label="Duplicate risk" value={marketplace.dataHealth.filter((item) => item.status === 'duplicate_risk').length} metaTooltip="Feeds with duplicate risk requiring review." icon={<Trash2 className="size-5" />} tone="purple" />
        <SummaryMetricCard label="Unmapped rows" value={marketplace.dataHealth.reduce((sum, item) => sum + item.unmappedSkuCount + item.unmappedListingCount, 0)} metaTooltip="Listings or SKUs not mapped to internal objects." icon={<SlidersHorizontal className="size-5" />} tone="info" />
        <SummaryMetricCard label="Failed syncs" value={marketplace.dataHealth.filter((item) => item.status === 'failed').length} metaTooltip="Disconnected or failed marketplace feeds." icon={<ScanSearch className="size-5" />} tone="warning" />
      </div>
      <Card className="rounded-2xl border">
        <CardHeader>
          <CardTitle>Marketplace feed health</CardTitle>
          <p className="text-sm text-muted-foreground">Sync freshness, missing mappings, duplicate rate, and reconciliation actions.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {marketplace.dataHealth.map((item) => (
            <MarketplaceFeedHealthRow key={item.id} item={item} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function MarketplaceFeedHealthRow({ item }: { item: MarketplaceDataHealthItem }) {
  return (
    <div className="grid gap-3 rounded-xl border bg-background p-4 md:grid-cols-[1fr_120px_120px_120px_120px_auto] md:items-center">
      <div className="min-w-0">
        <div className="font-semibold">{item.marketplace}</div>
        <p className="mt-1 text-xs text-muted-foreground">{item.ingestionMode} / owner {item.ownerLabel}</p>
      </div>
      <Badge variant={marketplaceStatusVariant(item.status)}>{prettyMarketplaceLabel(item.status)}</Badge>
      <div><div className="text-xs text-muted-foreground">Last sync</div><div className="font-semibold">{item.lastSyncAt}</div></div>
      <div><div className="text-xs text-muted-foreground">Errors</div><div className="font-semibold">{item.errorCount}</div></div>
      <div><div className="text-xs text-muted-foreground">Dupes</div><div className="font-semibold">{item.duplicateRate}%</div></div>
      <Button asChild size="sm" variant="outline">
        <Link to={getMarketplaceSourcePageHref(item.actionLabel === 'Open detail' ? 'accounts' : 'data-health')}>{item.actionLabel}</Link>
      </Button>
    </div>
  );
}

export function MarketplaceDetailView({ marketplace }: { marketplace: MarketplaceSourceSnapshot }) {
  const source = marketplace.selectedSource;
  if (!source) {
    return (
      <Card className="rounded-2xl border border-dashed">
        <CardContent className="p-6 text-sm text-muted-foreground">No marketplace source is selected for detail.</CardContent>
      </Card>
    );
  }
  const account = marketplace.accounts.find((item) => item.sourceIds.includes(source.id));
  const signals = marketplace.demandSignals.filter((signal) => signal.sourceId === source.id);
  const inquiries = marketplace.inquiries.filter((inquiry) => inquiry.sourceId === source.id);
  const attribution = marketplace.attribution.filter((item) => item.sourceId === source.id);
  const health = account ? marketplace.dataHealth.find((item) => item.accountId === account.id) : null;

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={sourceStatusVariant(source)}>{source.status.replace('_', ' ')}</Badge>
                <Badge variant="outline">{account?.marketplace || 'Marketplace'}</Badge>
                <Badge variant="outline">{source.market}</Badge>
              </div>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight">{source.name}</h2>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{source.sourceSignal}</p>
            </div>
            <div className="rounded-xl border bg-muted/20 p-4 text-center">
              <div className="text-xs text-muted-foreground">Quality</div>
              <div className="text-3xl font-semibold">{source.qualityScore}</div>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <RuntimeContextCard label="Owner" value={source.ownerLabel} detail={account?.accountName || 'Marketplace account'} />
            <RuntimeContextCard label="SKU" value={source.skuCode} detail={source.productName} />
            <RuntimeContextCard label="Leads / RFQs" value={`${source.leadCount} / ${source.rfqCount}`} detail="Marketplace lineage." />
            <RuntimeContextCard label="Freshness" value={source.lastSyncAt} detail={health ? prettyMarketplaceLabel(health.status) : 'No feed row'} />
          </div>
        </CardContent>
      </Card>
      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="rounded-2xl border">
          <CardHeader>
            <CardTitle>Quality engine</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <SourceQualityBar value={source.qualityScore} />
            {source.scoreReasons.map((reason) => (
              <div key={reason} className="rounded-xl border bg-muted/20 p-3 text-sm text-muted-foreground">{reason}</div>
            ))}
            {source.blockers.map((blocker) => (
              <div key={blocker} className="rounded-xl border border-warning/25 bg-warning/10 p-3 text-sm text-warning">{blocker}</div>
            ))}
          </CardContent>
        </Card>
        <Card className="rounded-2xl border">
          <CardHeader>
            <CardTitle>Lineage and readback</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <EvidenceCard label="Signals" value={signals.length} meta={signals.slice(0, 2).map((signal) => prettyMarketplaceLabel(signal.signalType)).join(', ') || 'No signal row'} />
            <EvidenceCard label="Inquiries" value={inquiries.length} meta={inquiries[0]?.summary || 'No inquiry row'} />
            <EvidenceCard label="Attribution" value={`${attribution[0]?.attributionConfidence || 0}%`} meta={attribution[0]?.campaignName || 'No campaign readback'} />
            <EvidenceCard label="Data health" value={health ? prettyMarketplaceLabel(health.status) : 'Missing'} meta={health ? `${health.errorCount} errors / ${health.unmappedSkuCount} unmapped SKUs` : 'No health row'} />
          </CardContent>
        </Card>
      </section>
      <div className="flex flex-wrap gap-2">
        <Button asChild><Link to={source.nextActionRoute}>{source.nextAction}<ArrowRight className="size-4" /></Link></Button>
        <Button asChild variant="outline"><Link to="/demand/campaigns">Open campaigns</Link></Button>
        <Button asChild variant="outline"><Link to="/demand/leads-rfqs">Open leads/RFQs</Link></Button>
        <Button asChild variant="outline"><Link to={getMarketplaceSourcePageHref('data-health')}>Review data health</Link></Button>
      </div>
    </div>
  );
}
