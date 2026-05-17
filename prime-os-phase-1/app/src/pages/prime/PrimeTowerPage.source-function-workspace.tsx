import { ArrowRight, CheckCircle2, ClipboardList, Globe, ImagePlus, Instagram, Mail, Megaphone, MessageCircle, PackagePlus, PanelsTopLeft, Phone, RadioTower, ScanSearch, Search, Send, SlidersHorizontal, Sparkles, Target, TrendingUp, Upload, Youtube } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getSkuLabel, getSkuProductName } from '@/lib/prime/prime-data';
import { buildDemandSourcesOverview, getDemandSourceTypeLabel, type DemandSource, type DemandSourceFunction, type DemandSourceType } from '@/lib/prime/demand-sources';
import { getMarketplaceSourcePageMeta, type MarketplaceSourcePage } from '@/lib/prime/marketplace-source';
import { cn } from '@/lib/utils';
import { SourceOperatingLoopGraphic, marketplacePageIcon, sourceChildIcon, sourceGraphicToneClassName } from './PrimeTowerPage.marketplace-workspace';

type SourceWorkspacePage = MarketplaceSourcePage;

export function getSourceFunctionPage(value: string | null): SourceWorkspacePage {
  return getMarketplaceSourcePage(value);
}

export function getSourceFunctionPageHref(type: DemandSourceType, page: SourceWorkspacePage, sourceId?: string) {
  const params = new URLSearchParams({ function: type, page });
  if (sourceId) params.set('sourceId', sourceId);
  return `/demand/sources?${params.toString()}`;
}

function sourceFunctionIcon(type: DemandSourceType) {
  if (type === 'social') return MessageCircle;
  if (type === 'ads') return Megaphone;
  if (type === 'partner') return HeartHandshake;
  if (type === 'manual') return Upload;
  return Globe;
}

function sourceFunctionUnitLabel(type: DemandSourceType) {
  if (type === 'social') return 'channel';
  if (type === 'ads') return 'ad source';
  if (type === 'partner') return 'partner';
  if (type === 'manual') return 'import source';
  return 'source';
}

function sourceFunctionPageLabel(page: SourceWorkspacePage, type: DemandSourceType) {
  if (page === 'overview') return 'Overview';
  if (page === 'accounts') {
    if (type === 'social') return 'Social Channels';
    if (type === 'ads') return 'Ad Accounts';
    if (type === 'partner') return 'Partner Network';
    if (type === 'manual') return 'Import Batches';
    return 'Connections';
  }
  if (page === 'demand-signals') return 'Demand Signals';
  if (page === 'product-sku-signals') return 'Product / SKU Signals';
  if (page === 'inquiry-lead-intake') return 'Lead Intake';
  if (page === 'campaign-attribution') return 'Campaign Attribution';
  if (page === 'source-quality') return 'Source Quality';
  if (page === 'data-health') return 'Data Health';
  return 'Source Detail';
}

function sourceFunctionPageDescription(page: SourceWorkspacePage, meta: DemandSourceFunction) {
  const unit = sourceFunctionUnitLabel(meta.id);
  if (page === 'overview') return `${meta.label} health, top action, and source quality.`;
  if (page === 'accounts') return `Connection, owner, status, freshness, and blocker view for every ${unit}.`;
  if (page === 'demand-signals') return `Normalized ${meta.label.toLowerCase()} signals before they become lead or RFQ work.`;
  if (page === 'product-sku-signals') return 'SKU/category demand, stock risk, listing or content fit, and recommended route.';
  if (page === 'inquiry-lead-intake') return 'Source-linked leads and RFQs with owner, intent, duplicate, and SLA context.';
  if (page === 'campaign-attribution') return 'Campaign/source readback preview with first-touch and last-touch confidence.';
  if (page === 'source-quality') return 'Quality score, reason trail, blockers, and next operating action.';
  if (page === 'data-health') return 'Freshness, ingestion mode, duplicate risk, missing mappings, and reconciliation actions.';
  return 'Full drill-down for one selected source, including lineage, quality, blockers, and handoff routes.';
}

function childForSource(source: DemandSource, meta: DemandSourceFunction, index = 0) {
  const normalized = `${source.name} ${source.connectedChannel} ${source.sourceSignal}`.toLowerCase();
  const matched = meta.children.find((child) => normalized.includes(child.toLowerCase().split(' ')[0]));
  return matched || meta.children[index % meta.children.length] || meta.label;
}

function buildSourceConnectionRows(sources: DemandSource[], meta: DemandSourceFunction) {
  return meta.children.map((child, index) => {
    const matches = sources.filter((source, sourceIndex) => childForSource(source, meta, sourceIndex) === child);
    const primary = matches[0];
    const blockers = matches.flatMap((source) => source.blockers);
    const signalVolume = matches.reduce((sum, source) => sum + source.signalVolume, 0);
    const leadCount = matches.reduce((sum, source) => sum + source.leadCount, 0);
    const rfqCount = matches.reduce((sum, source) => sum + source.rfqCount, 0);
    const quality = matches.length ? Math.round(matches.reduce((sum, source) => sum + source.qualityScore, 0) / matches.length) : 0;
    return {
      id: `${meta.id}-${child.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      child,
      primary,
      status: primary ? (blockers.length || primary.status === 'needs_review' ? 'needs_review' : primary.status) : 'inactive',
      owner: primary?.ownerLabel || `Unassigned ${sourceFunctionUnitLabel(meta.id)} owner`,
      market: primary?.market || 'Regional',
      ingestionMode: primary?.ingestionMode || 'manual',
      lastSyncAt: primary?.lastSyncAt || 'Not connected',
      signalVolume,
      leadCount,
      rfqCount,
      quality,
      blockers: primary ? blockers : [`No ${sourceFunctionUnitLabel(meta.id)} connected yet`],
    };
  });
}

function buildSourceDataHealthRows(sources: DemandSource[], meta: DemandSourceFunction) {
  return buildSourceConnectionRows(sources, meta).map((row) => {
    const duplicateRate = row.primary?.duplicateRate || 0;
    const status = !row.primary
      ? 'failed'
      : row.primary.freshnessMinutes > 60
        ? 'stale'
        : duplicateRate >= 14
          ? 'duplicate_risk'
          : row.blockers.length
            ? 'mapping_issue'
            : 'healthy';
    return {
      ...row,
      status,
      duplicateRate,
      freshnessMinutes: row.primary?.freshnessMinutes || 0,
      errorCount: status === 'healthy' ? 0 : Math.max(1, row.blockers.length),
      unmappedCount: row.primary?.linkedSkuIds.length ? 0 : 1,
      actionLabel: status === 'healthy' ? 'Open detail' : status === 'duplicate_risk' ? 'Dedupe' : status === 'failed' ? 'Reconnect' : 'Review',
    };
  });
}

function SourceFunctionVisualRouteMap({ meta, sources }: { meta: DemandSourceFunction; sources: DemandSource[] }) {
  const rows = buildSourceConnectionRows(sources, meta);
  const HeaderIcon = sourceFunctionIcon(meta.id);
  return (
    <Card className="rounded-2xl border">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <HeaderIcon className="size-5 text-primary" />
              {meta.label} route map
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">A visual registry of source classes, quality, contribution, and setup gaps.</p>
          </div>
          <Badge variant="outline">{rows.length} source classes</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {rows.map((row, index) => {
          const Icon = sourceChildIcon(meta.id, row.child);
          return (
            <Link
              key={row.id}
              to={row.primary ? getSourceFunctionPageHref(meta.id, 'detail', row.primary.id) : getSourceFunctionPageHref(meta.id, 'accounts')}
              className="rounded-2xl border bg-background p-4 transition-colors hover:border-primary/35 hover:bg-primary/5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className={`flex size-11 items-center justify-center rounded-xl border ${sourceGraphicToneClassName(index)}`}>
                  <Icon className="size-5" />
                </div>
                <Badge variant={marketplaceStatusVariant(row.status)}>{prettyMarketplaceLabel(row.status)}</Badge>
              </div>
              <div className="mt-4 font-semibold">{row.child}</div>
              <p className="mt-1 line-clamp-2 min-h-10 text-xs text-muted-foreground">{row.primary?.sourceSignal || row.blockers[0]}</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                <div><div className="text-muted-foreground">Q</div><div className="font-semibold">{row.quality}</div></div>
                <div><div className="text-muted-foreground">Lead</div><div className="font-semibold">{row.leadCount}</div></div>
                <div><div className="text-muted-foreground">RFQ</div><div className="font-semibold">{row.rfqCount}</div></div>
              </div>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function SourceFunctionWorkspace({
  meta,
  page,
  sources,
  selectedSourceId,
}: {
  meta: DemandSourceFunction;
  page: SourceWorkspacePage;
  sources: DemandSource[];
  selectedSourceId: string | null;
}) {
  const overview = buildDemandSourcesOverview(sources);
  const PageIcon = marketplacePageIcon(page);
  const pageLabel = sourceFunctionPageLabel(page, meta.id);

  return (
    <div className="min-h-full bg-background">
      <div className="space-y-5 p-4 md:p-6">
        <Card className="rounded-2xl border">
          <CardContent className="p-2">
            <div className="flex gap-2 overflow-x-auto">
              {MARKETPLACE_SOURCE_PAGES.filter((item) => item.id !== 'detail').map((item) => {
                const ItemIcon = marketplacePageIcon(item.id);
                const isActive = page === item.id;
                return (
                  <Link
                    key={item.id}
                    to={getSourceFunctionPageHref(meta.id, item.id)}
                    className={`inline-flex min-w-fit items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                  >
                    <ItemIcon className="size-4" />
                    {sourceFunctionPageLabel(item.id, meta.id)}
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
              {pageLabel}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{sourceFunctionPageDescription(page, meta)}</p>
          </CardHeader>
        </Card>

        {page === 'overview' ? <SourceFunctionOverviewView meta={meta} sources={sources} overview={overview} /> : null}
        {page === 'accounts' ? <SourceFunctionConnectionsView meta={meta} sources={sources} /> : null}
        {page === 'demand-signals' ? <SourceFunctionSignalsView meta={meta} sources={sources} /> : null}
        {page === 'product-sku-signals' ? <SourceFunctionSkuView meta={meta} sources={sources} overview={overview} /> : null}
        {page === 'inquiry-lead-intake' ? <SourceFunctionIntakeView meta={meta} sources={sources} /> : null}
        {page === 'campaign-attribution' ? <SourceFunctionAttributionView meta={meta} sources={sources} /> : null}
        {page === 'source-quality' ? <SourceFunctionQualityView meta={meta} sources={sources} overview={overview} /> : null}
        {page === 'data-health' ? <SourceFunctionDataHealthView meta={meta} sources={sources} /> : null}
        {page === 'detail' ? <SourceFunctionDetailView meta={meta} sources={sources} selectedSourceId={selectedSourceId} /> : null}
        {!sources.length ? (
          <Card className="rounded-2xl border border-dashed">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
              <div>
                <div className="font-semibold">No {meta.label.toLowerCase()} records yet</div>
                <p className="mt-1 text-sm text-muted-foreground">Connect or import a {sourceFunctionUnitLabel(meta.id)} before scaling this function.</p>
              </div>
              <Button asChild variant="outline">
                <Link to="/demand/sources">Back to all Sources</Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function SourceFunctionKpiStrip({ meta, sources, overview }: { meta: DemandSourceFunction; sources: DemandSource[]; overview: ReturnType<typeof buildDemandSourcesOverview> }) {
  const connections = buildSourceConnectionRows(sources, meta);
  const Icon = sourceFunctionIcon(meta.id);
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
      <SummaryMetricCard label="Source rows" value={sources.length} metaTooltip={`Total ${meta.label} DemandSource rows.`} icon={<Icon className="size-5" />} tone="info" />
      <SummaryMetricCard label="Active routes" value={connections.filter((row) => row.status !== 'inactive').length} metaTooltip={`Connected ${sourceFunctionUnitLabel(meta.id)} routes.`} icon={<CircleUserRound className="size-5" />} tone="success" />
      <SummaryMetricCard label="Leads" value={overview.totalLeads} metaTooltip="Leads traced to this source function." icon={<UserRoundCheck className="size-5" />} tone="teal" />
      <SummaryMetricCard label="RFQs" value={overview.totalRfqs} metaTooltip="RFQs traced to this source function." icon={<ClipboardList className="size-5" />} tone="warning" />
      <SummaryMetricCard label="Top quality" value={overview.topSource?.qualityScore || 0} metaTooltip={overview.topSource?.name || 'No source data.'} icon={<Target className="size-5" />} tone="purple" />
      <SummaryMetricCard label="Needs review" value={overview.sourcesNeedingReview} metaTooltip="Sources blocked by data quality or operating guardrails." icon={<BellRing className="size-5" />} tone={overview.sourcesNeedingReview ? 'warning' : 'success'} />
    </div>
  );
}

function SourceFunctionQualityChart({ meta, sources }: { meta: DemandSourceFunction; sources: DemandSource[] }) {
  const rows = buildSourceConnectionRows(sources, meta);
  const config = {
    quality: {
      label: 'Quality',
      color: 'hsl(var(--primary))',
    },
  } satisfies ChartConfig;

  return (
    <ChartContainer config={config} className="h-64 w-full" aria-label={`${meta.label} quality: ${rows.map((row) => `${row.child} ${row.quality}`).join(', ')}`}>
      <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 42, top: 8, bottom: 8 }}>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" domain={[0, 100]} hide />
        <YAxis type="category" dataKey="child" width={128} tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Bar dataKey="quality" fill="var(--color-quality)" radius={[0, 6, 6, 0]} barSize={18}>
          <LabelList dataKey="quality" position="right" formatter={(value: number) => `${value}`} className="fill-foreground font-medium" />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

function SourceFunctionFunnel({ meta, sources }: { meta: DemandSourceFunction; sources: DemandSource[] }) {
  const signalVolume = sources.reduce((sum, source) => sum + source.signalVolume, 0);
  const leads = sources.reduce((sum, source) => sum + source.leadCount, 0);
  const rfqs = sources.reduce((sum, source) => sum + source.rfqCount, 0);
  const traffic = sources.reduce((sum, source) => sum + source.campaignTraffic, 0);
  const stages = [
    { label: 'Signals', value: signalVolume, href: getSourceFunctionPageHref(meta.id, 'demand-signals') },
    { label: 'Traffic', value: traffic, href: getSourceFunctionPageHref(meta.id, 'campaign-attribution') },
    { label: 'Leads', value: leads, href: getSourceFunctionPageHref(meta.id, 'inquiry-lead-intake') },
    { label: 'RFQs', value: rfqs, href: getSourceFunctionPageHref(meta.id, 'inquiry-lead-intake') },
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

function SourceFunctionOverviewView({ meta, sources, overview }: { meta: DemandSourceFunction; sources: DemandSource[]; overview: ReturnType<typeof buildDemandSourcesOverview> }) {
  const topSource = overview.topSource;
  const reviewSources = sources.filter((source) => source.status === 'needs_review' || source.blockers.length > 0).slice(0, 4);
  return (
    <div className="space-y-4">
      <SourceFunctionKpiStrip meta={meta} sources={sources} overview={overview} />
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
        <SourceFunctionVisualRouteMap meta={meta} sources={sources} />
        <SourceOperatingLoopGraphic
          type={meta.id}
          hrefForPage={(page) => getSourceFunctionPageHref(meta.id, page)}
        />
      </section>
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
        <Card className="rounded-2xl border">
          <CardHeader>
            <CardTitle>First-screen answer</CardTitle>
            <p className="text-sm text-muted-foreground">Which {meta.label.toLowerCase()} route deserves action now?</p>
          </CardHeader>
          <CardContent>
            {topSource ? (
              <div className="rounded-2xl border bg-primary/5 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-2xl font-semibold tracking-tight">{topSource.name}</div>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{topSource.actionReason}</p>
                  </div>
                  <div className="min-w-24 rounded-xl bg-background p-3 text-center shadow-sm">
                    <div className="text-xs text-muted-foreground">Quality</div>
                    <div className="text-2xl font-semibold">{topSource.qualityScore}</div>
                  </div>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-4">
                  <RuntimeContextCard label="Route" value={childForSource(topSource, meta)} detail={topSource.market} />
                  <RuntimeContextCard label="Leads / RFQs" value={`${topSource.leadCount} / ${topSource.rfqCount}`} detail="Source-linked conversion." />
                  <RuntimeContextCard label="Freshness" value={topSource.lastSyncAt} detail={`${topSource.freshnessMinutes} minutes.`} />
                  <RuntimeContextCard label="SKU" value={topSource.skuCode} detail={topSource.productName} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button asChild><Link to={topSource.nextActionRoute}>{topSource.nextAction}<ArrowRight className="size-4" /></Link></Button>
                  <Button asChild variant="outline"><Link to={getSourceFunctionPageHref(meta.id, 'detail', topSource.id)}>View detail</Link></Button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">No {meta.label.toLowerCase()} records yet.</div>
            )}
          </CardContent>
        </Card>
        <Card className="rounded-2xl border">
          <CardHeader>
            <CardTitle>{meta.label} quality</CardTitle>
            <p className="text-sm text-muted-foreground">Quality score by {sourceFunctionUnitLabel(meta.id)} class.</p>
          </CardHeader>
          <CardContent>
            <SourceFunctionQualityChart meta={meta} sources={sources} />
          </CardContent>
        </Card>
      </section>
      <section className="grid gap-4 xl:grid-cols-[minmax(340px,0.75fr)_minmax(0,1.25fr)]">
        <Card className="rounded-2xl border">
          <CardHeader><CardTitle>Signal to RFQ funnel</CardTitle></CardHeader>
          <CardContent><SourceFunctionFunnel meta={meta} sources={sources} /></CardContent>
        </Card>
        <Card className="rounded-2xl border border-warning/30 bg-warning/5">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Needs-review lane</CardTitle>
              <Badge variant="warning">{reviewSources.length} visible</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {reviewSources.length ? reviewSources.map((source) => (
              <Link key={source.id} to={getSourceFunctionPageHref(meta.id, 'detail', source.id)} className="rounded-xl border bg-background p-4 transition-colors hover:border-primary/35 hover:bg-primary/5">
                <div className="font-semibold">{source.name}</div>
                <p className="mt-2 text-sm text-muted-foreground">{source.blockers[0] || source.actionReason}</p>
              </Link>
            )) : (
              <div className="rounded-xl border bg-background p-4 text-sm text-muted-foreground">No review blockers are visible.</div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function SourceFunctionConnectionsView({ meta, sources }: { meta: DemandSourceFunction; sources: DemandSource[] }) {
  const rows = buildSourceConnectionRows(sources, meta);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryMetricCard label="Connected" value={rows.filter((row) => row.status !== 'inactive').length} metaTooltip={`Connected ${sourceFunctionUnitLabel(meta.id)} routes.`} icon={<CircleUserRound className="size-5" />} tone="info" />
        <SummaryMetricCard label="Healthy" value={rows.filter((row) => row.status === 'active').length} metaTooltip="Routes without current source blockers." icon={<Gauge className="size-5" />} tone="success" />
        <SummaryMetricCard label="Pending review" value={rows.filter((row) => row.status === 'needs_review').length} metaTooltip="Routes blocked by quality or data issues." icon={<BellRing className="size-5" />} tone="warning" />
        <SummaryMetricCard label="Not connected" value={rows.filter((row) => row.status === 'inactive').length} metaTooltip="Expected function children without a connected row." icon={<SlidersHorizontal className="size-5" />} tone="purple" />
      </div>
      <Card className="rounded-2xl border">
        <CardHeader>
          <CardTitle>{sourceFunctionPageLabel('accounts', meta.id)} registry</CardTitle>
          <p className="text-sm text-muted-foreground">Owner, status, ingestion, freshness, leads, RFQs, and blocker state.</p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table variant="embedded">
            <TableHeader>
              <TableRow>
                <TableHead>{sourceFunctionUnitLabel(meta.id)}</TableHead>
                <TableHead>Owner / market</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ingestion</TableHead>
                <TableHead>Last sync</TableHead>
                <TableHead className="text-right">Signals</TableHead>
                <TableHead className="text-right">Leads / RFQs</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.child}</TableCell>
                  <TableCell><div>{row.owner}</div><div className="text-xs text-muted-foreground">{row.market}</div></TableCell>
                  <TableCell><Badge variant={marketplaceStatusVariant(row.status)}>{prettyMarketplaceLabel(row.status)}</Badge></TableCell>
                  <TableCell>{row.ingestionMode}</TableCell>
                  <TableCell>{row.lastSyncAt}</TableCell>
                  <TableCell className="text-right">{formatCompactCount(row.signalVolume)}</TableCell>
                  <TableCell className="text-right">{row.leadCount} / {row.rfqCount}</TableCell>
                  <TableCell><Button asChild size="sm" variant="outline"><Link to={row.primary ? getSourceFunctionPageHref(meta.id, 'detail', row.primary.id) : getSourceFunctionPageHref(meta.id, 'data-health')}>{row.primary ? 'Open detail' : 'Review setup'}</Link></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SourceFunctionSignalsView({ meta, sources }: { meta: DemandSourceFunction; sources: DemandSource[] }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryMetricCard label="Signal volume" value={formatCompactCount(sources.reduce((sum, source) => sum + source.signalVolume, 0))} metaTooltip="Normalized signal volume for this source function." icon={<RadioTower className="size-5" />} tone="info" />
        <SummaryMetricCard label="Fresh signals" value={sources.filter((source) => source.freshnessMinutes <= 30).length} metaTooltip="Sources updated inside the current freshness window." icon={<Gauge className="size-5" />} tone="success" />
        <SummaryMetricCard label="Watch signals" value={sources.filter((source) => source.status === 'needs_review').length} metaTooltip="Signals needing operator review." icon={<BellRing className="size-5" />} tone="warning" />
        <SummaryMetricCard label="Avg conversion" value={`${sources.length ? Math.round(sources.reduce((sum, source) => sum + source.conversionRate, 0) / sources.length) : 0}%`} metaTooltip="Average signal-to-lead conversion." icon={<TrendingUp className="size-5" />} tone="purple" />
      </div>
      <Card className="rounded-2xl border">
        <CardHeader><CardTitle>Normalized signal queue</CardTitle><p className="text-sm text-muted-foreground">Every signal keeps source, owner, SKU, freshness, and action context.</p></CardHeader>
        <CardContent className="space-y-3">
          {sources.map((source, index) => (
            <Link key={source.id} to={getSourceFunctionPageHref(meta.id, 'detail', source.id)} className="grid gap-3 rounded-xl border p-4 transition-colors hover:border-primary/35 hover:bg-primary/5 md:grid-cols-[1fr_120px_120px_120px_auto] md:items-center">
              <div><div className="font-semibold">{source.sourceSignal}</div><p className="mt-1 text-sm text-muted-foreground">{childForSource(source, meta, index)} / {source.name}</p></div>
              <div><div className="text-xs text-muted-foreground">Volume</div><div className="font-semibold">{formatCompactCount(source.signalVolume)}</div></div>
              <div><div className="text-xs text-muted-foreground">Freshness</div><div className="font-semibold">{source.freshnessMinutes}m</div></div>
              <div><div className="text-xs text-muted-foreground">SKU</div><div className="font-semibold">{source.skuCode}</div></div>
              <Badge variant={sourceStatusVariant(source)}>{source.nextAction}</Badge>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function SourceFunctionSkuView({ meta, sources, overview }: { meta: DemandSourceFunction; sources: DemandSource[]; overview: ReturnType<typeof buildDemandSourcesOverview> }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryMetricCard label="SKU rows" value={overview.skuSignals.length} metaTooltip="SKU/category rows with source contribution." icon={<PackagePlus className="size-5" />} tone="info" />
        <SummaryMetricCard label="Stock blocked" value={sources.filter((source) => source.inventoryRisk === 'high').length} metaTooltip="Sources blocked by high inventory risk." icon={<BellRing className="size-5" />} tone="warning" />
        <SummaryMetricCard label="Finance watch" value={sources.filter((source) => source.financeRisk === 'high').length} metaTooltip="Sources blocked by finance review." icon={<CircleDollarSign className="size-5" />} tone="purple" />
        <SummaryMetricCard label="Mapped campaigns" value={sources.filter((source) => source.linkedCampaignIds.length > 0).length} metaTooltip="Sources linked to campaign work." icon={<Megaphone className="size-5" />} tone="success" />
      </div>
      <Card className="rounded-2xl border">
        <CardHeader><CardTitle>Product / SKU signal matrix</CardTitle><p className="text-sm text-muted-foreground">SKU demand and guardrails across {meta.label.toLowerCase()}.</p></CardHeader>
        <CardContent className="space-y-3">
          {sources.map((source, index) => (
            <Link key={source.id} to={getSourceFunctionPageHref(meta.id, 'detail', source.id)} className="grid gap-3 rounded-xl border p-3 transition-colors hover:border-primary/35 hover:bg-primary/5 md:grid-cols-[1fr_120px_110px_110px_110px_auto] md:items-center">
              <div><div className="font-semibold">{source.skuCode}</div><p className="mt-1 text-xs text-muted-foreground">{source.productName} / {childForSource(source, meta, index)}</p></div>
              <div><div className="text-xs text-muted-foreground">Demand</div><div className="font-semibold">{formatCompactCount(source.signalVolume)}</div></div>
              <div><div className="text-xs text-muted-foreground">Leads</div><div className="font-semibold">{source.leadCount}</div></div>
              <div><div className="text-xs text-muted-foreground">RFQs</div><div className="font-semibold">{source.rfqCount}</div></div>
              <div><div className="text-xs text-muted-foreground">Quality</div><div className="font-semibold">{source.qualityScore}</div></div>
              <Badge variant={sourceRiskBadgeVariant(source.inventoryRisk)}>Stock {source.inventoryRisk}</Badge>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function SourceFunctionIntakeView({ meta, sources }: { meta: DemandSourceFunction; sources: DemandSource[] }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryMetricCard label="Leads" value={sources.reduce((sum, source) => sum + source.leadCount, 0)} metaTooltip="Lead volume from this source function." icon={<UserRoundCheck className="size-5" />} tone="info" />
        <SummaryMetricCard label="RFQs" value={sources.reduce((sum, source) => sum + source.rfqCount, 0)} metaTooltip="RFQ volume from this source function." icon={<ClipboardList className="size-5" />} tone="success" />
        <SummaryMetricCard label="Route leads" value={sources.filter((source) => source.nextAction === 'Route leads').length} metaTooltip="Sources ready for lead routing." icon={<ArrowRight className="size-5" />} tone="teal" />
        <SummaryMetricCard label="Duplicate watch" value={sources.filter((source) => source.duplicateRate >= 14).length} metaTooltip="Rows that should not auto-route." icon={<Trash2 className="size-5" />} tone="warning" />
      </div>
      <Card className="rounded-2xl border">
        <CardHeader><CardTitle>Lead and RFQ intake queue</CardTitle><p className="text-sm text-muted-foreground">Operator-owned handoff queue with source lineage preserved.</p></CardHeader>
        <CardContent className="space-y-3">
          {sources.map((source) => (
            <div key={source.id} className="grid gap-3 rounded-xl border bg-background p-4 md:grid-cols-[1fr_110px_110px_110px_auto] md:items-center">
              <div><div className="font-semibold">{source.name}</div><p className="mt-1 text-sm text-muted-foreground">{source.sourceSignal}</p></div>
              <div><div className="text-xs text-muted-foreground">Owner</div><div className="font-semibold">{source.ownerLabel}</div></div>
              <div><div className="text-xs text-muted-foreground">Leads</div><div className="font-semibold">{source.leadCount}</div></div>
              <div><div className="text-xs text-muted-foreground">RFQs</div><div className="font-semibold">{source.rfqCount}</div></div>
              <div className="flex flex-wrap gap-2 md:justify-end">
                <Button asChild size="sm"><Link to={source.nextActionRoute}>{source.nextAction}</Link></Button>
                <Button asChild size="sm" variant="outline"><Link to={getSourceFunctionPageHref(meta.id, 'detail', source.id)}>Detail</Link></Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function SourceFunctionAttributionView({ meta, sources }: { meta: DemandSourceFunction; sources: DemandSource[] }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryMetricCard label="Touchpoints" value={sources.reduce((sum, source) => sum + source.attribution.length, 0)} metaTooltip="Source attribution touchpoints." icon={<PanelsTopLeft className="size-5" />} tone="info" />
        <SummaryMetricCard label="Campaign traffic" value={formatCompactCount(sources.reduce((sum, source) => sum + source.campaignTraffic, 0))} metaTooltip="Campaign traffic linked to this source function." icon={<Megaphone className="size-5" />} tone="success" />
        <SummaryMetricCard label="Low confidence" value={sources.filter((source) => source.attribution.some((touchpoint) => touchpoint.confidence < 70)).length} metaTooltip="Attribution rows needing review." icon={<BellRing className="size-5" />} tone="warning" />
        <SummaryMetricCard label="Preview only" value="Readback" metaTooltip="Attribution here is a readback preview, not final truth." icon={<ScanSearch className="size-5" />} tone="purple" />
      </div>
      <Card className="rounded-2xl border">
        <CardHeader><CardTitle>Attribution readback preview</CardTitle><p className="text-sm text-muted-foreground">First-touch, last-touch, campaign, and RFQ readback context.</p></CardHeader>
        <CardContent className="space-y-3">
          {sources.map((source) => (
            <Link key={source.id} to={getSourceFunctionPageHref(meta.id, 'detail', source.id)} className="block rounded-xl border p-4 transition-colors hover:border-primary/35 hover:bg-primary/5">
              <div className="grid gap-3 md:grid-cols-[1fr_260px_120px_120px_auto] md:items-center">
                <div><div className="font-semibold">{source.name}</div><p className="mt-1 text-xs text-muted-foreground">{source.sourceSignal}</p></div>
                <div className="flex flex-wrap gap-1.5">{source.attribution.map((touchpoint) => <Badge key={`${source.id}-${touchpoint.label}`} variant="outline">{touchpoint.label} {touchpoint.confidence}%</Badge>)}</div>
                <div><div className="text-xs text-muted-foreground">Leads / RFQs</div><div className="font-semibold">{source.leadCount} / {source.rfqCount}</div></div>
                <div><div className="text-xs text-muted-foreground">Traffic</div><div className="font-semibold">{formatCompactCount(source.campaignTraffic)}</div></div>
                <Badge variant={source.attribution.some((touchpoint) => touchpoint.confidence < 70) ? 'warning' : 'default'}>Preview</Badge>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function SourceFunctionQualityView({ meta, sources, overview }: { meta: DemandSourceFunction; sources: DemandSource[]; overview: ReturnType<typeof buildDemandSourcesOverview> }) {
  return (
    <div className="space-y-4">
      <SourceFunctionKpiStrip meta={meta} sources={sources} overview={overview} />
      <Card className="rounded-2xl border">
        <CardHeader><CardTitle>{meta.label} quality ranking</CardTitle><p className="text-sm text-muted-foreground">Numeric score is paired with reason trail, blocker, and action route.</p></CardHeader>
        <CardContent className="space-y-3">
          {sources.map((source) => (
            <Link key={source.id} to={getSourceFunctionPageHref(meta.id, 'detail', source.id)} className="block rounded-xl border p-4 transition-colors hover:border-primary/35 hover:bg-primary/5">
              <div className="grid gap-3 md:grid-cols-[1fr_240px_140px_auto] md:items-center">
                <div><div className="font-semibold">{source.name}</div><p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{source.scoreReasons.join(' / ')}</p></div>
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

function SourceFunctionDataHealthView({ meta, sources }: { meta: DemandSourceFunction; sources: DemandSource[] }) {
  const rows = buildSourceDataHealthRows(sources, meta);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <SummaryMetricCard label="Healthy" value={rows.filter((row) => row.status === 'healthy').length} metaTooltip="Feeds without source health blockers." icon={<Gauge className="size-5" />} tone="success" />
        <SummaryMetricCard label="Stale" value={rows.filter((row) => row.status === 'stale').length} metaTooltip="Feeds past freshness threshold." icon={<BellRing className="size-5" />} tone="warning" />
        <SummaryMetricCard label="Duplicate risk" value={rows.filter((row) => row.status === 'duplicate_risk').length} metaTooltip="Duplicate rate over review threshold." icon={<Trash2 className="size-5" />} tone="purple" />
        <SummaryMetricCard label="Unmapped" value={rows.reduce((sum, row) => sum + row.unmappedCount, 0)} metaTooltip="Rows without mapped SKU/campaign context." icon={<SlidersHorizontal className="size-5" />} tone="info" />
        <SummaryMetricCard label="Errors" value={rows.reduce((sum, row) => sum + row.errorCount, 0)} metaTooltip="Data-health issues blocking scale recommendations." icon={<ScanSearch className="size-5" />} tone="warning" />
      </div>
      <Card className="rounded-2xl border">
        <CardHeader><CardTitle>{meta.label} data health</CardTitle><p className="text-sm text-muted-foreground">Freshness, ingestion, duplicate rate, missing mapping, and reconciliation action.</p></CardHeader>
        <CardContent className="space-y-3">
          {rows.map((row) => (
            <div key={row.id} className="grid gap-3 rounded-xl border bg-background p-4 md:grid-cols-[1fr_120px_120px_120px_120px_auto] md:items-center">
              <div><div className="font-semibold">{row.child}</div><p className="mt-1 text-xs text-muted-foreground">{row.ingestionMode} / owner {row.owner}</p></div>
              <Badge variant={marketplaceStatusVariant(row.status)}>{prettyMarketplaceLabel(row.status)}</Badge>
              <div><div className="text-xs text-muted-foreground">Last sync</div><div className="font-semibold">{row.lastSyncAt}</div></div>
              <div><div className="text-xs text-muted-foreground">Errors</div><div className="font-semibold">{row.errorCount}</div></div>
              <div><div className="text-xs text-muted-foreground">Dupes</div><div className="font-semibold">{row.duplicateRate}%</div></div>
              <Button asChild size="sm" variant="outline"><Link to={row.primary ? getSourceFunctionPageHref(meta.id, 'detail', row.primary.id) : getSourceFunctionPageHref(meta.id, 'accounts')}>{row.actionLabel}</Link></Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function SourceFunctionDetailView({ meta, sources, selectedSourceId }: { meta: DemandSourceFunction; sources: DemandSource[]; selectedSourceId: string | null }) {
  const source = sources.find((item) => item.id === selectedSourceId) || sources[0] || null;
  if (!source) {
    return <Card className="rounded-2xl border border-dashed"><CardContent className="p-6 text-sm text-muted-foreground">No source is selected for detail.</CardContent></Card>;
  }
  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={sourceStatusVariant(source)}>{source.status.replace('_', ' ')}</Badge>
                <Badge variant="outline">{childForSource(source, meta)}</Badge>
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
            <RuntimeContextCard label="Owner" value={source.ownerLabel} detail={source.connectedChannel} />
            <RuntimeContextCard label="SKU" value={source.skuCode} detail={source.productName} />
            <RuntimeContextCard label="Leads / RFQs" value={`${source.leadCount} / ${source.rfqCount}`} detail="Source lineage." />
            <RuntimeContextCard label="Freshness" value={source.lastSyncAt} detail={`${source.freshnessMinutes} minutes.`} />
          </div>
        </CardContent>
      </Card>
      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="rounded-2xl border">
          <CardHeader><CardTitle>Quality engine</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <SourceQualityBar value={source.qualityScore} />
            {source.scoreReasons.map((reason) => <div key={reason} className="rounded-xl border bg-muted/20 p-3 text-sm text-muted-foreground">{reason}</div>)}
            {source.blockers.map((blocker) => <div key={blocker} className="rounded-xl border border-warning/25 bg-warning/10 p-3 text-sm text-warning">{blocker}</div>)}
          </CardContent>
        </Card>
        <Card className="rounded-2xl border">
          <CardHeader><CardTitle>Lineage and readback</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <EvidenceCard label="Signal volume" value={formatCompactCount(source.signalVolume)} meta={source.sourceSignal} />
            <EvidenceCard label="Traffic" value={formatCompactCount(source.campaignTraffic)} meta={source.linkedCampaignIds.join(', ') || 'No campaign link'} />
            <EvidenceCard label="Conversion" value={`${source.conversionRate}%`} meta={`${source.rfqRate}% RFQ rate`} />
            <EvidenceCard label="Data health" value={`${source.duplicateRate}% duplicates`} meta={source.blockers[0] || 'No hard blocker'} />
          </CardContent>
        </Card>
      </section>
      <div className="flex flex-wrap gap-2">
        <Button asChild><Link to={source.nextActionRoute}>{source.nextAction}<ArrowRight className="size-4" /></Link></Button>
        <Button asChild variant="outline"><Link to="/demand/campaigns">Open campaigns</Link></Button>
        <Button asChild variant="outline"><Link to="/demand/leads-rfqs">Open leads/RFQs</Link></Button>
        <Button asChild variant="outline"><Link to={getSourceFunctionPageHref(meta.id, 'data-health')}>Review data health</Link></Button>
      </div>
    </div>
  );
}

