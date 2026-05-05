import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bot,
  Boxes,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  FileText,
  Megaphone,
  PackageCheck,
  Radar,
  ShieldCheck,
  Sparkles,
  Store,
  TrendingUp,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { getPrimeSnapshot, getSkuProductName } from '@/lib/prime/prime-data';

const currency = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
  maximumFractionDigits: 0,
});

const compactNumber = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

type OperatingStatus = 'Ready' | 'Watch' | 'Critical';

type PriorityAction = {
  id: string;
  title: string;
  owner: string;
  object: string;
  reason: string;
  due: string;
  risk: OperatingStatus;
  impact: string;
  href: string;
  cta: string;
  evidence: string;
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function scoreStatus(score: number): OperatingStatus {
  if (score >= 80) return 'Ready';
  if (score >= 60) return 'Watch';
  return 'Critical';
}

function statusRank(status: OperatingStatus) {
  if (status === 'Critical') return 0;
  if (status === 'Watch') return 1;
  return 2;
}

function statusClass(status: OperatingStatus) {
  if (status === 'Critical') return 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300';
  if (status === 'Watch') return 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300';
  return 'border-emerald-500/30 bg-background text-emerald-700 dark:text-emerald-300';
}

function statusDotClass(status: OperatingStatus) {
  if (status === 'Critical') return 'bg-red-500';
  if (status === 'Watch') return 'bg-amber-500';
  return 'bg-emerald-500';
}

function riskLabel(count: number) {
  return count === 1 ? '1 risk' : `${count} risks`;
}

function openPrimeAi() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('prime-ai:open'));
  }
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
  const highPriorityTickets = openTickets.filter((ticket) => ticket.priority === 'high');
  const ordersAtRisk = snapshot.orders.filter((order) => (
    order.risk_flags.length > 0
    || order.status === 'pending'
    || order.status === 'ready_to_ship'
    || order.status === 'shipping'
  ));
  const topCampaign = snapshot.campaigns[0] ?? null;
  const topForecast = highRiskForecasts[0] ?? watchForecasts[0] ?? snapshot.forecasts[0] ?? null;
  const topTicket = highPriorityTickets[0] ?? openTickets[0] ?? null;
  const topRecommendation = snapshot.recommendations[0] ?? null;
  const topPlay = snapshot.activationPlays[0] ?? null;
  const leadToOrderRate = snapshot.metrics.leadToOrderRate;
  const revenueAtRisk = (
    watchForecasts.reduce((sum, forecast) => sum + Math.max(0, forecast.demand7d - forecast.ats) * 22000, 0)
    + highPriorityTickets.length * 125000
    + ordersAtRisk.length * 18000
  );

  const intelligenceScore = clampScore(74 + snapshot.insightModels.length * 4 + snapshot.vocInsights.length * 2);
  const ecomScore = clampScore(66 + snapshot.products.length * 3 + snapshot.inventoryPositions.length - highRiskForecasts.length * 18);
  const demandScore = clampScore(60 + snapshot.campaigns.length * 6 + Math.min(18, leadToOrderRate));
  const financeScore = clampScore(70 + repeatCustomers * 4 - highRiskForecasts.length * 7 - ordersAtRisk.length);
  const customerScore = clampScore(72 + snapshot.customers.length * 2 - openTickets.length * 8);
  const systemScore = clampScore((intelligenceScore + ecomScore + demandScore + financeScore + customerScore) / 5);
  const systemStatus = scoreStatus(systemScore);

  const priorityActions: PriorityAction[] = [
    topForecast ? {
      id: `forecast-${topForecast.id}`,
      title: topForecast.risk === 'high' ? 'Resolve inventory pressure before campaign scale' : 'Validate inventory pressure',
      owner: 'Ecom / COS',
      object: topForecast.skuCode,
      reason: `${topForecast.ats} ATS vs ${topForecast.demand7d} projected 7-day demand.`,
      due: topForecast.risk === 'high' ? 'Today' : 'Next 24h',
      risk: topForecast.risk === 'high' ? 'Critical' : 'Watch',
      impact: currency.format(Math.max(0, topForecast.demand7d - topForecast.ats) * 22000),
      href: '/ecom/cos/inventory-brain',
      cta: 'Check inventory',
      evidence: topForecast.suggestedAction,
    } : null,
    topTicket ? {
      id: `ticket-${topTicket.id}`,
      title: 'Clear customer issue blocking trust loop',
      owner: 'Customer',
      object: topTicket.linkedEntity,
      reason: `${topTicket.subject}. SLA ${topTicket.sla}.`,
      due: topTicket.priority === 'high' ? 'Today' : 'This week',
      risk: topTicket.priority === 'high' ? 'Critical' : 'Watch',
      impact: `${topTicket.priority} priority`,
      href: '/customer/service',
      cta: 'Open service',
      evidence: 'Ticket is linked to CRM timeline and COS order context.',
    } : null,
    topRecommendation ? {
      id: topRecommendation.id,
      title: topRecommendation.target,
      owner: 'Intelligence',
      object: topRecommendation.target,
      reason: topRecommendation.reasoning,
      due: 'Today',
      risk: topRecommendation.confidence >= 82 ? 'Watch' : 'Ready',
      impact: `${topRecommendation.confidence}% confidence`,
      href: '/intelligence/launch-decisions',
      cta: 'Review decision',
      evidence: topRecommendation.action,
    } : null,
    topPlay ? {
      id: topPlay.id,
      title: 'Run next demand play against reachable audience',
      owner: 'Demand',
      object: topPlay.audience,
      reason: topPlay.trigger,
      due: 'Next run',
      risk: demandScore >= 80 ? 'Ready' : 'Watch',
      impact: `+${topPlay.projectedLift}% lift`,
      href: '/demand/campaigns',
      cta: 'Open queue',
      evidence: topPlay.nextBestAction,
    } : null,
    {
      id: 'finance-readiness',
      title: financeScore >= 80 ? 'Keep finance guardrail in monitor mode' : 'Review finance readiness before demand expansion',
      owner: 'Finance',
      object: 'Scale capital',
      reason: `${financeScore}% finance readiness with ${ordersAtRisk.length} order risk signals.`,
      due: financeScore >= 80 ? 'This week' : 'Today',
      risk: scoreStatus(financeScore),
      impact: currency.format(revenueAtRisk),
      href: '/finance/risk-trust',
      cta: 'Review finance',
      evidence: 'Finance guardrail protects campaign scale from fulfillment and cash risk.',
    },
  ].filter(Boolean).sort((left, right) => statusRank(left.risk) - statusRank(right.risk)).slice(0, 5) as PriorityAction[];

  const attentionCount = priorityActions.filter((action) => action.risk !== 'Ready').length;
  const criticalCount = priorityActions.filter((action) => action.risk === 'Critical').length;
  const watchCount = priorityActions.filter((action) => action.risk === 'Watch').length;

  const healthMetrics = [
    {
      label: 'Revenue at risk',
      value: currency.format(revenueAtRisk),
      status: revenueAtRisk > 250000 ? 'Critical' as const : revenueAtRisk > 0 ? 'Watch' as const : 'Ready' as const,
      context: `${watchForecasts.length} stock signals, ${ordersAtRisk.length} order signals`,
      cause: revenueAtRisk > 0 ? 'Exposure comes from inventory and service blockers.' : 'No material exposure detected.',
      href: '/finance/risk-trust',
      icon: CircleDollarSign,
    },
    {
      label: 'Demand readiness',
      value: `${demandScore}%`,
      status: scoreStatus(demandScore),
      context: `${compactNumber.format(totalTraffic)} reach, ${totalLeads} leads`,
      cause: `${leadToOrderRate}% lead-to-order with ${totalRfqs} RFQs attached.`,
      href: '/demand/campaigns',
      icon: TrendingUp,
    },
    {
      label: 'Inventory pressure',
      value: `${watchForecasts.length} SKU`,
      status: highRiskForecasts.length ? 'Critical' as const : watchForecasts.length ? 'Watch' as const : 'Ready' as const,
      context: highRiskForecasts.length ? `${highRiskForecasts.length} critical` : 'No critical SKU',
      cause: topForecast ? `${topForecast.skuCode}: ${topForecast.ats} ATS vs ${topForecast.demand7d} demand.` : 'Inventory coverage is clear.',
      href: '/ecom/cos/inventory-brain',
      icon: Boxes,
    },
    {
      label: 'Orders at risk',
      value: String(ordersAtRisk.length),
      status: ordersAtRisk.length > 3 ? 'Critical' as const : ordersAtRisk.length ? 'Watch' as const : 'Ready' as const,
      context: `${totalOrders} total orders`,
      cause: ordersAtRisk.length ? 'Open lifecycle or risk flags need COS review.' : 'No order blocker in the queue.',
      href: '/ecom/cos/oms',
      icon: PackageCheck,
    },
    {
      label: 'Customer issues',
      value: String(openTickets.length),
      status: highPriorityTickets.length ? 'Critical' as const : openTickets.length ? 'Watch' as const : 'Ready' as const,
      context: `${highPriorityTickets.length} high priority`,
      cause: topTicket ? `${topTicket.subject} is still open.` : 'Service queue is clear.',
      href: '/customer/service',
      icon: UsersRound,
    },
  ];

  const riskRadar = [
    {
      area: 'Inventory',
      title: highRiskForecasts.length ? 'ATS below launch demand' : watchForecasts.length ? 'SKU coverage needs watch' : 'Stock coverage ready',
      status: highRiskForecasts.length ? 'Critical' as const : watchForecasts.length ? 'Watch' as const : 'Ready' as const,
      owner: 'Ecom / COS',
      entity: topForecast?.skuCode || 'Inventory Brain',
      href: '/ecom/cos/inventory-brain',
    },
    {
      area: 'Finance',
      title: financeScore >= 80 ? 'Capital guardrail ready' : 'Scale finance needs review',
      status: scoreStatus(financeScore),
      owner: 'Finance',
      entity: `${financeScore}% readiness`,
      href: '/finance/risk-trust',
    },
    {
      area: 'Customer',
      title: highPriorityTickets.length ? 'High priority service issue' : openTickets.length ? 'Open service queue' : 'Service queue clear',
      status: highPriorityTickets.length ? 'Critical' as const : openTickets.length ? 'Watch' as const : 'Ready' as const,
      owner: 'Customer',
      entity: topTicket?.linkedEntity || 'CRM Compact',
      href: '/customer/service',
    },
    {
      area: 'Demand',
      title: demandScore >= 80 ? 'Demand engine ready' : 'Demand proof needs operator review',
      status: scoreStatus(demandScore),
      owner: 'Demand',
      entity: topCampaign?.name || 'Campaign queue',
      href: '/demand/campaigns',
    },
    {
      area: 'Ecom',
      title: ecomScore >= 80 ? 'COS route ready' : 'Product and order route needs watch',
      status: scoreStatus(ecomScore),
      owner: 'Ecom / COS',
      entity: `${snapshot.products.length} products`,
      href: '/ecom/cos/product-master',
    },
  ].sort((left, right) => statusRank(left.status) - statusRank(right.status));

  const areaStatus = [
    {
      area: 'Intelligence',
      status: scoreStatus(intelligenceScore),
      summary: 'Recommendations, VOC and model signals are ready for operator review.',
      metric: `${snapshot.insightModels.length + snapshot.vocInsights.length} active signals`,
      blocker: topRecommendation ? topRecommendation.target : 'No blocker',
      readiness: intelligenceScore,
      href: '/intelligence/launch-decisions',
      action: 'Review decisions',
      icon: Sparkles,
      risks: snapshot.alerts.filter((alert) => alert.area === 'Intelligence Area').length,
    },
    {
      area: 'Demand',
      status: scoreStatus(demandScore),
      summary: 'Campaigns, leads, RFQs and activation plays are connected.',
      metric: `${snapshot.campaigns.length} campaigns`,
      blocker: demandScore < 80 ? `${leadToOrderRate}% lead to order` : 'No blocker',
      readiness: demandScore,
      href: '/demand/campaigns',
      action: 'Open campaigns',
      icon: Megaphone,
      risks: demandScore < 80 ? 1 : 0,
    },
    {
      area: 'Ecom / COS',
      status: scoreStatus(ecomScore),
      summary: 'Catalog, inventory and OMS signals show route readiness.',
      metric: `${snapshot.inventoryPositions.length} inventory rows`,
      blocker: highRiskForecasts.length ? `${highRiskForecasts.length} critical SKU` : 'No blocker',
      readiness: ecomScore,
      href: '/ecom/cos/product-master',
      action: 'Check COS',
      icon: Store,
      risks: highRiskForecasts.length,
    },
    {
      area: 'Customer',
      status: scoreStatus(customerScore),
      summary: 'CRM memory and service queue protect buyer trust.',
      metric: `${snapshot.customers.length} profiles`,
      blocker: openTickets.length ? `${openTickets.length} open tickets` : 'No blocker',
      readiness: customerScore,
      href: '/customer/crm-compact',
      action: 'Open CRM',
      icon: UsersRound,
      risks: openTickets.length,
    },
    {
      area: 'Finance',
      status: scoreStatus(financeScore),
      summary: 'Finance health gates whether demand should expand today.',
      metric: `${financeScore}% readiness`,
      blocker: financeScore < 80 ? 'Review risk trust' : 'No blocker',
      readiness: financeScore,
      href: '/finance/risk-trust',
      action: 'Review risk',
      icon: ShieldCheck,
      risks: financeScore < 80 ? 1 : 0,
    },
  ];

  const evidenceItems = [
    {
      label: 'Inventory evidence',
      value: topForecast ? getSkuProductName(topForecast.skuCode) : 'Inventory coverage',
      detail: topForecast ? `${topForecast.skuCode}: ${topForecast.ats} ATS vs ${topForecast.demand7d} demand.` : 'No pressure forecast detected.',
      status: topForecast?.risk === 'high' ? 'Critical' as const : topForecast ? 'Watch' as const : 'Ready' as const,
    },
    {
      label: 'Demand evidence',
      value: topCampaign?.name || 'Demand route',
      detail: `${compactNumber.format(totalTraffic)} reach, ${totalLeads} leads, ${totalRfqs} RFQs, ${totalOrders} orders.`,
      status: scoreStatus(demandScore),
    },
    {
      label: 'Customer evidence',
      value: topTicket?.subject || 'Service queue',
      detail: topTicket ? `${topTicket.linkedEntity}, SLA ${topTicket.sla}.` : `${repeatCustomers} repeat buyers with clear service queue.`,
      status: highPriorityTickets.length ? 'Critical' as const : openTickets.length ? 'Watch' as const : 'Ready' as const,
    },
    {
      label: 'AI evidence',
      value: topRecommendation?.target || 'Recommendation queue',
      detail: topRecommendation ? `${topRecommendation.confidence}% confidence. ${topRecommendation.action}` : 'No recommendation pending.',
      status: topRecommendation && topRecommendation.confidence >= 82 ? 'Watch' as const : 'Ready' as const,
    },
  ];

  const activityItems = [
    ...snapshot.orderEvents.slice(0, 2).map((event) => ({
      id: event.id,
      source: 'OMS',
      object: event.order_id,
      detail: event.message,
      time: event.created_at,
    })),
    ...snapshot.activationPlays.slice(0, 2).map((play) => ({
      id: play.id,
      source: 'Demand',
      object: play.audience,
      detail: play.nextBestAction,
      time: 'Next run',
    })),
    ...snapshot.tickets.slice(0, 2).map((ticket) => ({
      id: ticket.id,
      source: 'CRM',
      object: ticket.linkedEntity,
      detail: ticket.subject,
      time: ticket.sla,
    })),
  ].slice(0, 6);

  return (
    <div className="min-h-full bg-background">
      <div className="space-y-4 p-4 md:p-6">
        <section data-testid="overview-command-bar" className="rounded-lg border bg-card shadow-sm">
          <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.75fr)_auto] lg:items-center">
            <div className="min-w-0">
              <Badge variant="outline" className="mb-3 rounded-full">Today Command Bar</Badge>
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Operating Home</h1>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                Mission Control for today: decisions, risks, owners and next actions across Prime OS.
              </p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                <span>{attentionCount} actions need attention</span>
                <span className="text-muted-foreground">/</span>
                <span>{criticalCount} critical</span>
                <span className="text-muted-foreground">/</span>
                <span>{currency.format(revenueAtRisk)} exposure</span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <span className={`size-2 rounded-full ${statusDotClass(systemStatus)}`} />
                <span>{systemScore}% launch readiness, {watchCount} watch items.</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <Button asChild size="sm">
                <Link to="/intelligence/launch-decisions">
                  Review decisions
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="#priority-action-queue">
                  Open action queue
                </Link>
              </Button>
              <Button size="sm" variant="ghost" onClick={openPrimeAi} aria-label="Open Prime AI for Operating Home">
                <Bot className="size-4" />
                Ask Prime AI
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {healthMetrics.map((metric) => (
            <HealthMetricCard key={metric.label} {...metric} />
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.85fr)]">
          <Card id="priority-action-queue" className="rounded-lg border shadow-sm">
            <CardHeader className="border-b pb-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ClipboardList className="size-5" />
                    Priority Action Queue
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Top operating actions sorted by severity, urgency and revenue impact.
                  </p>
                </div>
                <Badge variant="outline" className="w-fit">{priorityActions.length} actions</Badge>
              </div>
            </CardHeader>
            <CardContent className="divide-y p-0">
              {priorityActions.map((action, index) => (
                <PriorityActionRow key={action.id} action={action} rank={index + 1} />
              ))}
            </CardContent>
          </Card>

          <aside className="space-y-4">
            <Card className="rounded-lg border shadow-sm">
              <CardHeader className="border-b pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Radar className="size-4" />
                  Risk Radar
                </CardTitle>
              </CardHeader>
              <CardContent className="divide-y p-0">
                {riskRadar.map((item) => (
                  <RiskRadarRow key={item.area} {...item} />
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-lg border shadow-sm">
              <CardHeader className="border-b pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="size-4" />
                  Area Status Map
                </CardTitle>
              </CardHeader>
              <CardContent className="divide-y p-0">
                {areaStatus.map((area) => (
                  <AreaStatusRow key={area.area} {...area} />
                ))}
              </CardContent>
            </Card>
          </aside>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="rounded-lg border shadow-sm">
            <CardHeader className="border-b pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="size-4" />
                Evidence Stack
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 p-4 md:grid-cols-2">
              {evidenceItems.map((item) => (
                <EvidenceCard key={item.label} {...item} />
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-lg border shadow-sm">
            <CardHeader className="border-b pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock3 className="size-4" />
                Recent Operating Events
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y p-0">
              {activityItems.map((item) => (
                <div key={item.id} className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="rounded-full">{item.source}</Badge>
                        <span className="truncate text-sm font-medium">{item.object}</span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{item.detail}</p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">{item.time}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}

function HealthMetricCard({
  label,
  value,
  status,
  context,
  cause,
  href,
  icon: Icon,
}: {
  label: string;
  value: string;
  status: OperatingStatus;
  context: string;
  cause: string;
  href: string;
  icon: LucideIcon;
}) {
  return (
    <Link to={href} className="group rounded-lg border bg-card p-3 shadow-sm transition-colors hover:border-primary/40 hover:bg-muted/20">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
        </div>
        <div className="rounded-lg border bg-background p-2 text-muted-foreground">
          <Icon className="size-4" />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <StatusBadge status={status} />
        <span className="truncate text-xs text-muted-foreground">{context}</span>
      </div>
      <p className="mt-2 line-clamp-2 min-h-9 text-sm leading-5 text-muted-foreground">{cause}</p>
    </Link>
  );
}

function PriorityActionRow({ action, rank }: { action: PriorityAction; rank: number }) {
  return (
    <div className="grid gap-3 p-4 transition-colors hover:bg-muted/20 lg:grid-cols-[44px_minmax(0,1fr)_auto] lg:items-center">
      <div className="flex size-9 items-center justify-center rounded-lg border bg-background text-sm font-semibold">
        {rank}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={action.risk} />
          <Badge variant="outline">{action.owner}</Badge>
          <span className="text-xs text-muted-foreground">{action.object}</span>
        </div>
        <h2 className="mt-2 text-base font-semibold leading-tight">{action.title}</h2>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{action.reason}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border bg-background px-2 py-1 text-muted-foreground">
            Due <span className="font-medium text-foreground">{action.due}</span>
          </span>
          <span className="rounded-full border bg-background px-2 py-1 text-muted-foreground">
            Impact <span className="font-medium text-foreground">{action.impact}</span>
          </span>
          <span className="line-clamp-1 rounded-full border bg-background px-2 py-1 text-muted-foreground">
            Evidence <span className="font-medium text-foreground">{action.evidence}</span>
          </span>
        </div>
      </div>
      <Button asChild size="sm" variant={action.risk === 'Critical' ? 'default' : 'outline'} className="justify-between">
        <Link to={action.href}>
          {action.cta}
          <ArrowRight className="size-4" />
        </Link>
      </Button>
    </div>
  );
}

function RiskRadarRow({
  area,
  title,
  status,
  owner,
  entity,
  href,
}: {
  area: string;
  title: string;
  status: OperatingStatus;
  owner: string;
  entity: string;
  href: string;
}) {
  return (
    <Link to={href} className="block p-3 transition-colors hover:bg-muted/20">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`size-2 rounded-full ${statusDotClass(status)}`} />
            <span className="text-sm font-semibold">{area}</span>
          </div>
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{title}</p>
          <div className="mt-2 text-xs text-muted-foreground">{owner} / {entity}</div>
        </div>
        <StatusBadge status={status} />
      </div>
    </Link>
  );
}

function AreaStatusRow({
  area,
  status,
  summary,
  metric,
  blocker,
  readiness,
  href,
  action,
  icon: Icon,
  risks,
}: {
  area: string;
  status: OperatingStatus;
  summary: string;
  metric: string;
  blocker: string;
  readiness: number;
  href: string;
  action: string;
  icon: LucideIcon;
  risks: number;
}) {
  return (
    <Link to={href} className="block p-3 transition-colors hover:bg-muted/20">
      <div className="flex items-start gap-3">
        <div className="rounded-lg border bg-background p-2 text-muted-foreground">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-semibold">{area}</div>
            <StatusBadge status={status} />
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{summary}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{metric}</span>
            <span>{riskLabel(risks)}</span>
            <span>{blocker}</span>
          </div>
          <Progress value={readiness} className="mt-3 h-1.5" />
          <div className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
            {action}
            <ArrowRight className="size-4" />
          </div>
        </div>
      </div>
    </Link>
  );
}

function EvidenceCard({
  label,
  value,
  detail,
  status,
}: {
  label: string;
  value: string;
  detail: string;
  status: OperatingStatus;
}) {
  return (
    <div className="rounded-lg border bg-muted/10 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="mt-2 line-clamp-1 font-semibold">{value}</div>
        </div>
        <StatusBadge status={status} />
      </div>
      <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: OperatingStatus }) {
  const Icon = status === 'Ready' ? CheckCircle2 : status === 'Watch' ? AlertTriangle : AlertTriangle;

  return (
    <Badge variant="outline" className={`gap-1 rounded-full ${statusClass(status)}`}>
      <Icon className="size-3" />
      {status}
    </Badge>
  );
}
