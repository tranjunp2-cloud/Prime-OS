import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bot,
  Boxes,
  CircleDollarSign,
  ClipboardList,
  Globe,
  HeartHandshake,
  ImagePlus,
  Megaphone,
  PackageCheck,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Store,
  TrendingUp,
  UserRoundCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { PageHeader } from '@/components/system/PageHeader';
import { SummaryMetricCard } from '@/components/system/SummaryMetricCard';
import { getPrimeSnapshot, getSkuLabel, getSkuProductName } from '@/lib/prime/prime-data';

const currency = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
  maximumFractionDigits: 0,
});

const compactNumber = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function areaTone(score: number): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (score >= 80) return 'default';
  if (score >= 60) return 'secondary';
  if (score >= 35) return 'outline';
  return 'destructive';
}

function scoreCopy(score: number) {
  if (score >= 80) return 'Ready';
  if (score >= 60) return 'Watch';
  return 'Needs work';
}

export function PrimeOverview() {
  const snapshot = getPrimeSnapshot();

  const totalTraffic = snapshot.campaigns.reduce((sum, campaign) => sum + campaign.traffic, 0);
  const totalLeads = snapshot.leads.length;
  const totalOrders = snapshot.orders.length;
  const totalRfqs = snapshot.rfqs.length;
  const repeatCustomers = snapshot.customers.filter((customer) => customer.totalOrders > 1).length;
  const highRiskForecasts = snapshot.forecasts.filter((forecast) => forecast.risk === 'high');
  const watchForecasts = snapshot.forecasts.filter((forecast) => forecast.risk !== 'low');
  const openTickets = snapshot.tickets.filter((ticket) => ticket.status !== 'resolved');
  const topCampaign = snapshot.campaigns[0] ?? null;
  const topPlay = snapshot.activationPlays[0] ?? null;
  const topRecommendation = snapshot.recommendations[0] ?? null;
  const topCustomer = [...snapshot.customers].sort((left, right) => {
    if (right.totalRevenue !== left.totalRevenue) return right.totalRevenue - left.totalRevenue;
    return right.totalOrders - left.totalOrders;
  })[0] ?? null;
  const topForecast = watchForecasts[0] ?? snapshot.forecasts[0] ?? null;
  const heroProduct = snapshot.products.find((product) => product.id === topCampaign?.productId)
    ?? snapshot.products[0]
    ?? null;
  const heroProductImage = heroProduct?.images?.[0];
  const heroSku = topCampaign?.skuCode || topForecast?.skuCode || '';
  const heroProductLabel = heroSku ? getSkuLabel(heroSku) : heroProduct?.name || 'Product route pending';
  const leadToOrderRate = snapshot.metrics.leadToOrderRate;

  const intelligenceScore = clampScore(72 + snapshot.insightModels.length * 4 + snapshot.vocInsights.length * 2);
  const ecomScore = clampScore(62 + snapshot.products.length * 4 + snapshot.inventoryPositions.length - highRiskForecasts.length * 16);
  const demandScore = clampScore(58 + snapshot.campaigns.length * 7 + Math.min(18, leadToOrderRate));
  const financeScore = clampScore(64 + repeatCustomers * 5 - highRiskForecasts.length * 8);
  const customerScore = clampScore(66 + snapshot.customers.length * 3 - openTickets.length * 7);
  const systemScore = clampScore((intelligenceScore + ecomScore + demandScore + financeScore + customerScore) / 5);

  const operatingAreas = [
    {
      area: 'Intelligence',
      href: '/intelligence/launch-decisions',
      icon: Sparkles,
      score: intelligenceScore,
      title: 'Decide the best route',
      description: 'Creators, trends, and launch decisions explain what to sell, why now, and what evidence supports it.',
      metric: `${snapshot.insightModels.length + snapshot.vocInsights.length} signals`,
      action: 'Open Launch Decisions',
      accent: 'from-violet-500/15 via-background to-sky-500/10',
    },
    {
      area: 'Ecom',
      href: '/ecom/cos/product-master',
      icon: Store,
      score: ecomScore,
      title: 'Keep product ready',
      description: 'Catalog, inventory, OMS, fulfillment, returns, and policy keep the route sellable without hidden blockers.',
      metric: `${snapshot.products.length} products`,
      action: 'Check Ecom readiness',
      accent: 'from-emerald-500/15 via-background to-cyan-500/10',
    },
    {
      area: 'Demand',
      href: '/demand/campaign-ops',
      icon: Megaphone,
      score: demandScore,
      title: 'Turn decision into reach',
      description: 'Campaign Ops, creator work, lead capture, and retargeting create the actual buyer touches.',
      metric: `${compactNumber.format(totalTraffic)} reach`,
      action: 'Run Demand action',
      accent: 'from-blue-500/15 via-background to-indigo-500/10',
    },
    {
      area: 'Finance',
      href: '/finance/health',
      icon: CircleDollarSign,
      score: financeScore,
      title: 'Protect scale capital',
      description: 'Finance health, capital offers, and risk eligibility show whether the seller can safely scale the route.',
      metric: `${financeScore}% health`,
      action: 'Review Finance',
      accent: 'from-amber-500/15 via-background to-emerald-500/10',
    },
    {
      area: 'Customer',
      href: '/customer/crm-compact',
      icon: HeartHandshake,
      score: customerScore,
      title: 'Own buyer memory',
      description: 'CRM Compact and Service keep buyer history, follow-up, RFQ, and support context attached.',
      metric: `${snapshot.customers.length} profiles`,
      action: 'Open CRM Compact',
      accent: 'from-rose-500/15 via-background to-orange-500/10',
    },
  ];

  const guardrails = [
    ...watchForecasts.slice(0, 2).map((forecast) => ({
      id: forecast.id,
      label: 'Ecom guardrail',
      title: getSkuProductName(forecast.skuCode),
      detail: `${forecast.ats} ATS vs ${forecast.demand7d} projected 7-day demand. ${forecast.suggestedAction}`,
      tone: forecast.risk === 'high' ? 'destructive' as const : 'secondary' as const,
    })),
    ...openTickets.slice(0, 2).map((ticket) => ({
      id: ticket.id,
      label: 'Customer guardrail',
      title: ticket.subject,
      detail: `${ticket.linkedEntity} · SLA ${ticket.sla}`,
      tone: ticket.priority === 'high' ? 'destructive' as const : 'secondary' as const,
    })),
  ];

  return (
    <div className="min-h-full bg-background">
      <PageHeader
        title="PrimeOS Overview"
        description="The whole operating loop in one view: Intelligence decides, Demand executes, Ecom supports, Finance protects scale, and Customer closes the memory loop."
        actions={(
          <>
            <Button asChild variant="outline" size="sm">
              <Link to="/intelligence/launch-decisions">Start with Intelligence</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/demand/campaign-ops">Execute in Demand</Link>
            </Button>
          </>
        )}
      />

      <div className="space-y-6 p-4 md:p-6">
        <Card className="overflow-hidden rounded-lg border">
          <CardHeader className="border-b bg-gradient-to-br from-primary/10 via-background to-emerald-500/10">
            <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)_190px] xl:items-stretch">
              <div className="relative min-h-[230px] overflow-hidden rounded-3xl border bg-gradient-to-br from-sky-500/10 via-background to-emerald-500/10 p-4 shadow-sm">
                <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-primary/20 blur-3xl" />
                <div className="relative flex items-center justify-between gap-3">
                  <Badge variant="secondary" className="rounded-full bg-background/80">Live route</Badge>
                  <Badge variant={topCampaign?.status === 'active' ? 'default' : 'secondary'}>{topCampaign?.status || 'ready'}</Badge>
                </div>
                <div className="relative mt-4 flex items-center gap-3">
                  <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border bg-background/80 shadow-sm">
                    {heroProductImage ? (
                      <img src={heroProductImage} alt={heroProductLabel} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <ImagePlus className="size-6" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Product route</div>
                    <div className="mt-2 line-clamp-3 text-base font-semibold">{heroProductLabel}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{heroSku || 'SKU pending'}</div>
                  </div>
                </div>
                <div className="relative mt-4 rounded-2xl border bg-background/80 p-3 shadow-sm">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Buyer memory</div>
                  <div className="mt-1 text-sm font-semibold">{topCustomer?.name || 'Customer route pending'}</div>
                  <div className="text-xs text-muted-foreground">{topCustomer?.company || 'CRM Compact will own the next follow-up.'}</div>
                </div>
              </div>

              <div className="min-w-0">
                <Badge variant="outline">PrimeOS recommends</Badge>
                <CardTitle className="mt-3 text-3xl tracking-tight">
                  {topCampaign ? `Scale ${topCampaign.name}` : 'Pick the next closed-loop launch route'}
                </CardTitle>
                <p className="mt-3 max-w-4xl text-base leading-7 text-muted-foreground">
                  {topRecommendation?.reasoning || 'PrimeOS combines market intelligence, product readiness, campaign execution, finance health, and customer memory into one operating recommendation.'}
                </p>
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <OverviewEvidenceCard label="Intelligence" value={topRecommendation?.target || 'Launch route'} detail={topRecommendation ? `${topRecommendation.confidence}% confidence` : 'Decision context ready'} />
                  <OverviewEvidenceCard label="Demand" value={topPlay?.audience || topCampaign?.targetSegment || 'Buyer audience'} detail={topPlay ? `+${topPlay.projectedLift}% projected lift` : `${totalLeads} leads in motion`} />
                  <OverviewEvidenceCard label="Guardrail" value={topForecast ? scoreCopy(ecomScore) : 'Clear'} detail={topForecast ? `${topForecast.risk} stock risk` : 'No stock blocker detected'} />
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button asChild>
                    <Link to="/intelligence/launch-decisions">
                      Open Launch Decisions
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/customer/crm-compact">
                      Open CRM Compact
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="rounded-3xl border bg-background/80 p-5 text-center shadow-sm">
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">System readiness</div>
                <div className="mt-3 text-5xl font-semibold tracking-tight">{systemScore}%</div>
                <Badge variant={areaTone(systemScore)} className="mt-3">{scoreCopy(systemScore)}</Badge>
                <p className="mt-4 text-sm text-muted-foreground">One score across Intelligence, Ecom, Demand, Finance, and Customer.</p>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <SummaryMetricCard label="Revenue" value={currency.format(snapshot.metrics.revenue)} meta={`${repeatCustomers} repeat buyers in CRM memory.`} icon={<ShoppingCart className="size-5" />} tone="success" />
          <SummaryMetricCard label="Demand reach" value={compactNumber.format(totalTraffic)} meta={`${snapshot.campaigns.length} campaigns · ${totalLeads} leads.`} icon={<Megaphone className="size-5" />} tone="info" />
          <SummaryMetricCard label="Lead to order" value={`${leadToOrderRate}%`} meta={`${totalLeads} leads · ${totalOrders} orders · ${totalRfqs} RFQs.`} icon={<TrendingUp className="size-5" />} tone="warning" />
          <SummaryMetricCard label="Products covered" value={snapshot.products.length} meta={`${snapshot.inventoryPositions.length} inventory rows across ${snapshot.warehousesCount} warehouses.`} icon={<Boxes className="size-5" />} tone="purple" />
          <SummaryMetricCard label="Needs attention" value={highRiskForecasts.length + openTickets.length} meta={`${highRiskForecasts.length} SKU risks · ${openTickets.length} service cases.`} icon={<AlertTriangle className="size-5" />} tone={highRiskForecasts.length + openTickets.length ? 'danger' : 'muted'} />
        </div>

        <section className="grid gap-4 xl:grid-cols-5">
          {operatingAreas.map((area) => {
            const Icon = area.icon;

            return (
              <Link
                key={area.area}
                to={area.href}
                className={`group flex min-h-[260px] flex-col rounded-lg border bg-gradient-to-br ${area.accent} p-4 shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="rounded-2xl border bg-background/75 p-2 shadow-sm">
                    <Icon className="size-5 text-primary" />
                  </div>
                  <Badge variant={areaTone(area.score)}>{area.score}%</Badge>
                </div>
                <div className="mt-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{area.area}</div>
                  <div className="mt-2 text-xl font-semibold leading-tight">{area.title}</div>
                  <p className="mt-2 line-clamp-4 text-sm leading-6 text-muted-foreground">{area.description}</p>
                </div>
                <div className="mt-auto pt-5">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium">{area.metric}</span>
                    <span className="text-xs text-muted-foreground">{scoreCopy(area.score)}</span>
                  </div>
                  <Progress value={area.score} className="mt-2 h-1.5" />
                  <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                    {area.action}
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </Link>
            );
          })}
        </section>

        <Card className="rounded-lg border">
          <CardHeader>
            <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle>Closed-loop execution path</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">This is the mental model: each area has a job, a handoff, and a reason it exists.</p>
              </div>
              <Badge variant="outline">PrimeOS loop</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 lg:grid-cols-5">
              <LoopStep icon={<Bot className="size-5" />} title="Intelligence" detail="Choose the route and explain why." href="/intelligence/launch-decisions" />
              <LoopStep icon={<PackageCheck className="size-5" />} title="Ecom" detail="Confirm product, stock, order, and fulfillment can support it." href="/ecom/cos/product-master" />
              <LoopStep icon={<Megaphone className="size-5" />} title="Demand" detail="Create messages, ads, KOL work, SEO, and retargeting." href="/demand/campaign-ops" />
              <LoopStep icon={<ShieldCheck className="size-5" />} title="Finance" detail="Check cash health, capital offers, and eligibility risk." href="/finance/health" />
              <LoopStep icon={<UserRoundCheck className="size-5" />} title="Customer" detail="Capture buyer memory, replies, service, and repeat loops." href="/customer/crm-compact" />
            </div>
          </CardContent>
        </Card>

        <section className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
          <Card className="rounded-lg border">
            <CardHeader>
              <CardTitle>Next actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {snapshot.recommendations.slice(0, 3).map((recommendation) => (
                <OverviewActionCard
                  key={recommendation.id}
                  label="AI recommendation"
                  title={recommendation.target}
                  detail={recommendation.action}
                  meta={`${recommendation.confidence}% confidence`}
                  href="/intelligence/launch-decisions"
                />
              ))}
              {snapshot.activationPlays.slice(0, 3).map((play) => (
                <OverviewActionCard
                  key={play.id}
                  label="Demand play"
                  title={play.audience}
                  detail={play.nextBestAction}
                  meta={`+${play.projectedLift}% projected lift`}
                  href="/demand/campaign-ops"
                />
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-lg border">
            <CardHeader>
              <CardTitle>Guardrails before scale</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {guardrails.length ? guardrails.map((guardrail) => (
                <div key={guardrail.id} className="rounded-2xl border bg-muted/20 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{guardrail.label}</div>
                      <div className="mt-1 font-semibold">{guardrail.title}</div>
                    </div>
                    <Badge variant={guardrail.tone}>Watch</Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{guardrail.detail}</p>
                </div>
              )) : (
                <div className="rounded-2xl border bg-emerald-500/10 p-4">
                  <div className="font-semibold">No major guardrail is blocking scale.</div>
                  <p className="mt-1 text-sm text-muted-foreground">Ecom, Customer, and Finance signals are currently healthy enough to keep executing.</p>
                </div>
              )}
              <div className="grid gap-2 sm:grid-cols-2">
                <Button asChild variant="outline" className="justify-between">
                  <Link to="/ecom/cos/inventory-brain">
                    Check inventory
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="justify-between">
                  <Link to="/finance/risk-trust">
                    Check finance risk
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}

function OverviewEvidenceCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border bg-background/75 p-3 shadow-sm">
      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="mt-2 line-clamp-2 text-sm font-semibold">{value}</div>
      <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{detail}</div>
    </div>
  );
}

function LoopStep({
  icon,
  title,
  detail,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  href: string;
}) {
  return (
    <Link to={href} className="group rounded-3xl border bg-muted/20 p-4 transition-colors hover:border-primary/40 hover:bg-primary/5">
      <div className="flex items-center justify-between gap-3">
        <div className="rounded-2xl border bg-background p-2 text-primary shadow-sm">{icon}</div>
        <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>
      <div className="mt-4 font-semibold">{title}</div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p>
    </Link>
  );
}

function OverviewActionCard({
  label,
  title,
  detail,
  meta,
  href,
}: {
  label: string;
  title: string;
  detail: string;
  meta: string;
  href: string;
}) {
  return (
    <Link to={href} className="group rounded-2xl border bg-muted/20 p-4 transition-colors hover:border-primary/40 hover:bg-primary/5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
          <div className="mt-2 font-semibold">{title}</div>
        </div>
        <Badge variant="outline">{meta}</Badge>
      </div>
      <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">{detail}</p>
      <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
        Open
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
