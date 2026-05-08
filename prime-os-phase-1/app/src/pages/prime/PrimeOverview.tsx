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
  UserRoundCheck,
  Store,
  TrendingUp,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
type OperatingMode = 'command' | 'investigate' | 'audit';
type ProofTimelineType = 'Evidence' | 'Event' | 'Decision' | 'Owner Action';
type StatusTone = 'normal' | 'quiet';

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
  blocker: string;
  sla: string;
  whyNow: string;
};

type RiskFlowItem = {
  area: string;
  stage: string;
  title: string;
  status: OperatingStatus;
  owner: string;
  entity: string;
  dependency: string;
  signal: string;
  href: string;
};

type HealthMetric = {
  label: string;
  value: string;
  status: OperatingStatus;
  context: string;
  cause: string;
  href: string;
  icon: LucideIcon;
};

type AreaStatusItem = {
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
};

type EvidenceItem = {
  label: string;
  value: string;
  detail: string;
  status: OperatingStatus;
};

type ActivityItem = {
  id: string;
  source: string;
  object: string;
  detail: string;
  time: string;
};

type ProofTimelineItem = {
  id: string;
  type: ProofTimelineType;
  source: string;
  object: string;
  detail: string;
  time: string;
  status: OperatingStatus;
  href?: string;
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

function statusClass(status: OperatingStatus, tone: StatusTone = 'normal') {
  if (tone === 'quiet') {
    if (status === 'Ready') return 'border-emerald-500/20 bg-background text-emerald-700 dark:text-emerald-300';
    if (status === 'Watch') return 'border-amber-500/25 bg-background text-amber-700 dark:text-amber-300';
    return 'border-border bg-muted/40 text-muted-foreground';
  }

  if (status === 'Critical') return 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300';
  if (status === 'Watch') return 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300';
  return 'border-emerald-500/30 bg-background text-emerald-700 dark:text-emerald-300';
}

function statusDotClass(status: OperatingStatus, tone: StatusTone = 'normal') {
  if (tone === 'quiet') {
    if (status === 'Critical') return 'bg-muted-foreground';
    if (status === 'Watch') return 'bg-amber-500/70';
    return 'bg-emerald-500/70';
  }

  if (status === 'Critical') return 'bg-red-500';
  if (status === 'Watch') return 'bg-amber-500';
  return 'bg-emerald-500';
}

function riskLabel(count: number) {
  return count === 1 ? '1 risk' : `${count} risks`;
}

function openPrimeAi(context?: Record<string, string>) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('prime-ai:open', { detail: context }));
  }
}

export function PrimeOverview() {
  const [operatingMode, setOperatingMode] = useState<OperatingMode>('command');
  const [expandedActionId, setExpandedActionId] = useState<string | null>(null);
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
      blocker: topForecast.risk === 'high' ? 'ATS mismatch' : 'Coverage watch',
      sla: topForecast.risk === 'high' ? 'Resolve before campaign scale' : 'Validate before next launch push',
      whyNow: `${topForecast.ats} available units cannot support ${topForecast.demand7d} projected demand.`,
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
      blocker: 'Trust loop blocked',
      sla: topTicket.sla,
      whyNow: 'Customer trust can degrade before launch allocation and follow-up.',
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
      blocker: topRecommendation.confidence >= 82 ? 'Decision needs owner review' : 'Monitor mode',
      sla: 'Review before next operating sync',
      whyNow: `${topRecommendation.confidence}% confidence signal is ready for human decision.`,
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
      blocker: demandScore >= 80 ? 'No blocker' : 'Demand proof incomplete',
      sla: 'Queue before next run',
      whyNow: `${topPlay.projectedLift}% projected lift depends on reachable audience timing.`,
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
      href: '/finance/fin-support#funding-application-flow',
      cta: 'Review finance',
      evidence: 'Finance guardrail protects campaign scale from fulfillment and cash risk.',
      blocker: financeScore >= 80 ? 'Monitor guardrail' : 'Scale capital review',
      sla: financeScore >= 80 ? 'Weekly check' : 'Clear before demand expansion',
      whyNow: `${currency.format(revenueAtRisk)} exposure links finance readiness to fulfillment and service risk.`,
    },
  ].filter((action): action is PriorityAction => Boolean(action))
    .sort((left, right) => statusRank(left.risk) - statusRank(right.risk))
    .slice(0, 5);

  const primaryAction = priorityActions[0];
  const visiblePriorities = priorityActions.slice(0, 3);
  const secondaryActions = priorityActions.slice(3);

  const healthMetrics: HealthMetric[] = [
    {
      label: 'Revenue at risk',
      value: currency.format(revenueAtRisk),
      status: revenueAtRisk > 250000 ? 'Critical' as const : revenueAtRisk > 0 ? 'Watch' as const : 'Ready' as const,
      context: `${watchForecasts.length} stock signals, ${ordersAtRisk.length} order signals`,
      cause: revenueAtRisk > 0 ? 'Exposure comes from inventory and service blockers.' : 'No material exposure detected.',
      href: '/finance/fin-support#status',
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

  const riskRadar: RiskFlowItem[] = [
    {
      area: 'Inventory',
      stage: 'Inventory',
      title: highRiskForecasts.length ? 'ATS below launch demand' : watchForecasts.length ? 'SKU coverage needs watch' : 'Stock coverage ready',
      status: highRiskForecasts.length ? 'Critical' as const : watchForecasts.length ? 'Watch' as const : 'Ready' as const,
      owner: 'Ecom / COS',
      entity: topForecast?.skuCode || 'Inventory Brain',
      dependency: 'Inventory → Campaign readiness',
      signal: topForecast ? `${topForecast.ats} ATS vs ${topForecast.demand7d} demand` : 'Coverage clear',
      href: '/ecom/cos/inventory-brain',
    },
    {
      area: 'Demand',
      stage: 'Campaign Readiness',
      title: demandScore >= 80 ? 'Demand engine ready' : 'Demand proof needs operator review',
      status: scoreStatus(demandScore),
      owner: 'Demand',
      entity: topCampaign?.name || 'Campaign queue',
      dependency: 'Campaign readiness → Order fulfillment',
      signal: `${totalLeads} leads, ${totalRfqs} RFQs`,
      href: '/demand/campaigns',
    },
    {
      area: 'Ecom / COS',
      stage: 'Order Fulfillment',
      title: ecomScore >= 80 ? 'COS route ready' : 'Product and order route needs watch',
      status: scoreStatus(ecomScore),
      owner: 'Ecom / COS',
      entity: `${snapshot.products.length} products`,
      dependency: 'Order fulfillment → Revenue exposure',
      signal: `${ordersAtRisk.length} orders need watch`,
      href: '/ecom/cos/product-master',
    },
    {
      area: 'Finance',
      stage: 'Revenue Exposure',
      title: financeScore >= 80 ? 'Capital guardrail ready' : 'Scale finance needs review',
      status: scoreStatus(financeScore),
      owner: 'Finance',
      entity: `${financeScore}% readiness`,
      dependency: 'Revenue exposure → Customer trust',
      signal: financeScore >= 80 ? 'Capital guardrail ready' : 'Readiness below scale threshold',
      href: '/finance/fin-support#blockers',
    },
    {
      area: 'Customer',
      stage: 'Customer Trust / SLA',
      title: highPriorityTickets.length ? 'High priority service issue' : openTickets.length ? 'Open service queue' : 'Service queue clear',
      status: highPriorityTickets.length ? 'Critical' as const : openTickets.length ? 'Watch' as const : 'Ready' as const,
      owner: 'Customer',
      entity: topTicket?.linkedEntity || 'CRM Compact',
      dependency: 'Service recovery → Trust',
      signal: topTicket ? topTicket.sla : 'No active blocker',
      href: '/customer/service',
    },
  ];
  const blockedAreaCount = riskRadar.filter((item) => item.status !== 'Ready').length;
  const criticalSignals = riskRadar.filter((item) => item.status === 'Critical').slice(0, 2);
  const missionSignal = criticalSignals[0] ?? riskRadar.find((item) => item.status === 'Watch') ?? riskRadar[0];

  const areaStatus: AreaStatusItem[] = [
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
      href: '/finance/fin-support',
      action: 'Review risk',
      icon: ShieldCheck,
      risks: financeScore < 80 ? 1 : 0,
    },
  ];

  const evidenceItems: EvidenceItem[] = [
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

  const activityItems: ActivityItem[] = [
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

  const proofTimelineItems: ProofTimelineItem[] = [
    ...evidenceItems.map((item) => ({
      id: `evidence-${item.label}`,
      type: 'Evidence' as ProofTimelineType,
      source: item.label.replace(' evidence', ''),
      object: item.value,
      detail: item.detail,
      time: 'Current proof',
      status: item.status,
    })),
    ...priorityActions.slice(0, 3).map((action) => ({
      id: `owner-action-${action.id}`,
      type: 'Owner Action' as ProofTimelineType,
      source: action.owner,
      object: action.object,
      detail: `${action.cta}: ${action.whyNow}`,
      time: action.due,
      status: action.risk,
      href: action.href,
    })),
    ...activityItems.map((item) => ({
      id: `event-${item.id}`,
      type: 'Event' as ProofTimelineType,
      source: item.source,
      object: item.object,
      detail: item.detail,
      time: item.time,
      status: item.source === 'CRM' ? (highPriorityTickets.length ? 'Critical' as const : 'Watch' as const) : 'Ready' as const,
    })),
    ...(topRecommendation ? [{
      id: `decision-${topRecommendation.id}`,
      type: 'Decision' as ProofTimelineType,
      source: 'Intelligence',
      object: topRecommendation.target,
      detail: topRecommendation.action,
      time: `${topRecommendation.confidence}% confidence`,
      status: topRecommendation.confidence >= 82 ? 'Watch' as const : 'Ready' as const,
      href: '/intelligence/launch-decisions',
    }] : []),
  ].slice(0, operatingMode === 'audit' ? 12 : 8);

  const showAreaStatus = operatingMode !== 'command';
  const showProofTimeline = operatingMode !== 'command';
  const showLegacyEvidence = operatingMode === 'audit';
  const primeAiContext = primaryAction ? {
    action: primaryAction.title,
    owner: primaryAction.owner,
    object: primaryAction.object,
    risk: primaryAction.risk,
    impact: primaryAction.impact,
    blocker: primaryAction.blocker,
    evidence: primaryAction.evidence,
    dependency: missionSignal?.dependency ?? 'No active dependency',
    signal: missionSignal?.signal ?? 'No active signal',
  } : {
    action: 'Monitor Operating Home',
    owner: 'Prime OS',
    object: 'Operating Home',
    risk: systemStatus,
    impact: currency.format(revenueAtRisk),
    blocker: 'No active blocker',
    evidence: 'All operating areas are in monitor mode.',
    dependency: 'No active dependency',
    signal: 'No active signal',
  };

  return (
    <div className="min-h-full bg-background">
      <div className="space-y-4 p-4 md:p-6">
        <MissionBrief
          primaryAction={primaryAction}
          missionSignal={missionSignal}
          revenueAtRisk={revenueAtRisk}
          blockedAreaCount={blockedAreaCount}
          systemScore={systemScore}
          systemStatus={systemStatus}
          onAskAi={() => openPrimeAi(primeAiContext)}
        />

        <OperatorModeSwitch mode={operatingMode} onModeChange={setOperatingMode} />

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
          <PriorityMissionList
            actions={visiblePriorities}
            secondaryActions={secondaryActions}
            mode={operatingMode}
            expandedActionId={expandedActionId}
            onToggleAction={(id) => setExpandedActionId((current) => (current === id ? null : id))}
          />

          <DependencyRiskFlow items={riskRadar} mode={operatingMode} />
        </section>

        <SystemHealthStrip metrics={healthMetrics} />

        <SecondarySignalsPanel
          mode={operatingMode}
          showAreaStatus={showAreaStatus}
          showProofTimeline={showProofTimeline}
          showLegacyEvidence={showLegacyEvidence}
          areaStatus={areaStatus}
          evidenceItems={evidenceItems}
          activityItems={activityItems}
          proofTimelineItems={proofTimelineItems}
        />
      </div>
    </div>
  );
}

function MissionBrief({
  primaryAction,
  missionSignal,
  revenueAtRisk,
  blockedAreaCount,
  systemScore,
  systemStatus,
  onAskAi,
}: {
  primaryAction?: PriorityAction;
  missionSignal?: RiskFlowItem;
  revenueAtRisk: number;
  blockedAreaCount: number;
  systemScore: number;
  systemStatus: OperatingStatus;
  onAskAi: () => void;
}) {
  const headline = primaryAction?.title ?? 'Monitor Prime OS readiness';
  const missionCopy = primaryAction
    ? `${primaryAction.owner} owns ${primaryAction.object}. ${primaryAction.reason}`
    : 'All operating areas are ready for monitor mode.';

  return (
    <section data-testid="overview-command-bar" className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="grid gap-3 p-4 xl:grid-cols-[minmax(0,1fr)_minmax(520px,0.72fr)] xl:items-stretch">
        <div className="flex min-w-0 flex-col justify-between gap-3">
          <div className="min-w-0">
            <Badge variant="outline" className="mb-3 rounded-full bg-background/80">Operating Home</Badge>
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <span className={`size-2 rounded-full ${statusDotClass(primaryAction?.risk ?? systemStatus, 'quiet')}`} />
              <span>Today's Mission</span>
              {primaryAction ? <StatusBadge status={primaryAction.risk} /> : <StatusBadge status={systemStatus} tone="quiet" />}
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">{headline}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{missionCopy}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link to={primaryAction?.href ?? '/intelligence/launch-decisions'}>
                {primaryAction?.cta ?? 'Review decisions'}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button size="sm" variant="outline" onClick={onAskAi} aria-label="Ask Prime AI about today's mission">
              <Bot className="size-4" />
              Ask Prime AI
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <span>Primary signal</span>
              {missionSignal ? <StatusBadge status={missionSignal.status} tone="quiet" /> : null}
            </div>
            <div className="mt-2 text-sm font-semibold">{missionSignal?.stage ?? 'Operating system'}</div>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {missionSignal ? `${missionSignal.signal}. ${missionSignal.dependency}` : 'No active dependency pressure.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-1">
            <MissionStat label="Exposure" value={currency.format(revenueAtRisk)} status={revenueAtRisk > 250000 ? 'Critical' : revenueAtRisk > 0 ? 'Watch' : 'Ready'} />
            <MissionStat label="System" value={`${systemScore}%`} detail={`${blockedAreaCount} blocked`} status={systemStatus} />
          </div>
        </div>

      </div>
    </section>
  );
}

function MissionStat({
  label,
  value,
  detail,
  status,
}: {
  label: string;
  value: string;
  detail?: string;
  status: OperatingStatus;
}) {
  return (
    <div className="rounded-lg border bg-background/70 px-3 py-2">
      <div className="flex items-center justify-between gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <span>{label}</span>
        <span className={`size-2 rounded-full ${statusDotClass(status, 'quiet')}`} />
      </div>
      <div className="mt-1 text-lg font-semibold tracking-tight">{value}</div>
      {detail ? <div className="mt-1 text-xs text-muted-foreground">{detail}</div> : null}
    </div>
  );
}

function OperatorModeSwitch({
  mode,
  onModeChange,
}: {
  mode: OperatingMode;
  onModeChange: (mode: OperatingMode) => void;
}) {
  const modeCopy = {
    command: 'Action-first: mission, top 3, health, consequence flow.',
    investigate: 'Evidence-first: owners, blockers, dependencies, source detail.',
    audit: 'Traceability-first: timeline, events, evidence stack.',
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="text-sm font-semibold">Operator mode</div>
        <p className="text-xs text-muted-foreground">{modeCopy[mode]}</p>
      </div>
      <Tabs value={mode} onValueChange={(value) => onModeChange(value as OperatingMode)}>
        <TabsList className="grid w-full grid-cols-3 sm:w-auto">
          <TabsTrigger value="command">Command</TabsTrigger>
          <TabsTrigger value="investigate">Investigate</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}

function SystemHealthStrip({ metrics }: { metrics: HealthMetric[] }) {
  return (
    <section className="rounded-lg border bg-card shadow-sm">
      <div className="flex flex-col gap-2 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold">System Health</h2>
          <p className="text-xs text-muted-foreground">Compact readiness signals; details stay in owner modules.</p>
        </div>
        <Badge variant="outline" className="w-fit">{metrics.length} indicators</Badge>
      </div>
      <div className="grid gap-px bg-border/70 md:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <Link key={metric.label} to={metric.href} className="group bg-card p-3 transition-colors hover:bg-muted/20">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <span className={`size-2 rounded-full ${statusDotClass(metric.status, 'quiet')}`} />
                    <span className="truncate">{metric.label}</span>
                  </div>
                  <div className="mt-1 text-lg font-semibold tracking-tight">{metric.value}</div>
                </div>
                <div className="rounded-lg border bg-background p-2 text-muted-foreground transition-colors group-hover:text-foreground">
                  <Icon className="size-4" />
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <StatusBadge status={metric.status} tone="quiet" />
                <span className="truncate text-xs text-muted-foreground">{metric.context}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function PriorityMissionList({
  actions,
  secondaryActions,
  mode,
  expandedActionId,
  onToggleAction,
}: {
  actions: PriorityAction[];
  secondaryActions: PriorityAction[];
  mode: OperatingMode;
  expandedActionId: string | null;
  onToggleAction: (id: string) => void;
}) {
  return (
    <Card id="priority-action-queue" className="rounded-lg border shadow-sm">
      <CardHeader className="border-b pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardList className="size-5" />
              Top 3 Priorities
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Owner route, reason, impact. Details expand only when needed.</p>
          </div>
          <Badge variant="outline" className="w-fit">{actions.length} visible</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-3">
        {actions.map((action, index) => (
          <PriorityMissionCard
            key={action.id}
            action={action}
            rank={index + 1}
            mode={mode}
            expanded={expandedActionId === action.id}
            onToggle={() => onToggleAction(action.id)}
          />
        ))}

        {mode !== 'command' && secondaryActions.length ? (
          <div className="rounded-lg border bg-muted/10">
            <div className="border-b px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Secondary action tree
            </div>
            <div className="divide-y">
              {secondaryActions.map((action) => (
                <SecondaryActionRow key={action.id} action={action} />
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function PriorityMissionCard({
  action,
  rank,
  mode,
  expanded,
  onToggle,
}: {
  action: PriorityAction;
  rank: number;
  mode: OperatingMode;
  expanded: boolean;
  onToggle: () => void;
}) {
  const showDetails = expanded || mode !== 'command';
  const emphasized = rank === 1;

  return (
    <div className="rounded-lg border bg-background p-3 transition-colors hover:bg-muted/20 data-[emphasis=true]:border-primary/30" data-emphasis={emphasized}>
      <div className="grid gap-3 lg:grid-cols-[40px_minmax(0,1fr)_auto] lg:items-start">
        <div className="flex size-9 items-center justify-center rounded-lg border bg-card text-sm font-semibold">
          {rank}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={action.risk} tone={emphasized ? 'normal' : 'quiet'} />
            <Badge variant="outline" className="gap-1 rounded-full">
              <UserRoundCheck className="size-3" />
              {action.owner}
            </Badge>
            <span className="text-xs text-muted-foreground">{action.due}</span>
          </div>
          <h3 className="mt-2 text-base font-semibold leading-tight">{action.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{action.reason}</p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span><span className="font-medium text-foreground">Object:</span> {action.object}</span>
            <span><span className="font-medium text-foreground">Impact:</span> {action.impact}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Button asChild size="sm" variant={emphasized ? 'default' : 'outline'}>
            <Link to={action.href}>
              {action.cta}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          {mode === 'command' ? (
            <Button type="button" size="sm" variant="ghost" onClick={onToggle} aria-expanded={expanded}>
              Details
            </Button>
          ) : null}
        </div>
      </div>

      {showDetails ? (
        <div className="mt-3 grid gap-2 border-t pt-3 text-xs md:grid-cols-3">
          <div>
            <div className="text-muted-foreground">Blocker</div>
            <div className="mt-1 font-medium">{action.blocker}</div>
          </div>
          <div>
            <div className="text-muted-foreground">SLA</div>
            <div className="mt-1 font-medium">{action.sla}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Evidence</div>
            <div className="mt-1 line-clamp-2 font-medium">{action.evidence}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SecondaryActionRow({ action }: { action: PriorityAction }) {
  return (
    <Link to={action.href} className="grid gap-2 px-3 py-2 transition-colors hover:bg-muted/20 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={action.risk} tone="quiet" />
          <span className="truncate text-sm font-medium">{action.title}</span>
        </div>
        <div className="mt-1 truncate text-xs text-muted-foreground">{action.owner} · {action.object} · {action.impact}</div>
      </div>
      <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
        {action.cta}
        <ArrowRight className="size-3" />
      </span>
    </Link>
  );
}

function DependencyRiskFlow({
  items,
  mode,
}: {
  items: RiskFlowItem[];
  mode: OperatingMode;
}) {
  return (
    <Card className="rounded-lg border shadow-sm">
      <CardHeader className="border-b pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Radar className="size-4" />
              Dependency Risk Flow
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Business consequence order; severity stays as metadata.</p>
          </div>
          <Badge variant="outline" className="w-fit">{items.filter((item) => item.status !== 'Ready').length} active</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-3">
        <div className="grid gap-3">
          {items.map((item, index) => (
            <RiskFlowNode key={item.stage} item={item} isLast={index === items.length - 1} />
          ))}
        </div>

        {mode !== 'command' ? (
          <div className="mt-4 rounded-lg border bg-muted/10">
            <div className="border-b px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Dependency detail
            </div>
            <div className="divide-y">
              {items.map((item) => (
                <Link key={item.area} to={item.href} className="grid gap-2 px-3 py-2 transition-colors hover:bg-muted/20 sm:grid-cols-[120px_minmax(0,1fr)]">
                  <div className="flex items-center gap-2">
                    <span className={`size-2 rounded-full ${statusDotClass(item.status, 'quiet')}`} />
                    <span className="text-sm font-medium">{item.area}</span>
                  </div>
                  <div className="min-w-0 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{item.dependency}:</span> {item.signal}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function RiskFlowNode({ item, isLast }: { item: RiskFlowItem; isLast: boolean }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_24px] sm:items-center">
      <Link to={item.href} className="rounded-lg border bg-background p-3 transition-colors hover:border-primary/40 hover:bg-muted/20">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className={`size-2 rounded-full ${statusDotClass(item.status, 'quiet')}`} />
            <span className="truncate text-sm font-semibold">{item.stage}</span>
          </div>
          <StatusBadge status={item.status} tone="quiet" />
        </div>
        <p className="mt-2 line-clamp-2 text-sm font-medium">{item.signal}</p>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>{item.owner}</span>
          <span>{item.entity}</span>
        </div>
      </Link>
      {!isLast ? (
        <div className="flex items-center justify-center text-muted-foreground">
          <ArrowRight className="size-4 rotate-90 sm:rotate-0" />
        </div>
      ) : null}
    </div>
  );
}

function SecondarySignalsPanel({
  mode,
  showAreaStatus,
  showProofTimeline,
  showLegacyEvidence,
  areaStatus,
  evidenceItems,
  activityItems,
  proofTimelineItems,
}: {
  mode: OperatingMode;
  showAreaStatus: boolean;
  showProofTimeline: boolean;
  showLegacyEvidence: boolean;
  areaStatus: AreaStatusItem[];
  evidenceItems: EvidenceItem[];
  activityItems: ActivityItem[];
  proofTimelineItems: ProofTimelineItem[];
}) {
  if (mode === 'command') return null;

  return (
    <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      {showAreaStatus ? (
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
      ) : null}

      {showProofTimeline ? (
        <Card className="rounded-lg border shadow-sm">
          <CardHeader className="border-b pb-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="size-4" />
                  Operating Proof Timeline
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">Evidence, events, decisions, and owner actions in one audit-ready lane.</p>
              </div>
              <Badge variant="outline" className="w-fit">{proofTimelineItems.length} proof points</Badge>
            </div>
          </CardHeader>
          <CardContent className="divide-y p-0">
            {proofTimelineItems.map((item) => (
              <ProofTimelineRow key={item.id} {...item} />
            ))}
          </CardContent>
        </Card>
      ) : null}

      {showLegacyEvidence ? (
        <>
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
        </>
      ) : null}
    </section>
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

function ProofTimelineRow({
  type,
  source,
  object,
  detail,
  time,
  status,
  href,
}: {
  type: ProofTimelineType;
  source: string;
  object: string;
  detail: string;
  time: string;
  status: OperatingStatus;
  href?: string;
}) {
  const content = (
    <div className="grid gap-3 p-4 transition-colors hover:bg-muted/20 md:grid-cols-[150px_minmax(0,1fr)_auto] md:items-start">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="rounded-full">{type}</Badge>
        <span className={`size-2 rounded-full ${statusDotClass(status)}`} />
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">{source}</span>
          <span className="text-xs text-muted-foreground">/</span>
          <span className="truncate text-sm text-muted-foreground">{object}</span>
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{detail}</p>
      </div>
      <div className="text-xs text-muted-foreground md:text-right">{time}</div>
    </div>
  );

  return href ? <Link to={href} className="block">{content}</Link> : content;
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

function StatusBadge({ status, tone = 'normal' }: { status: OperatingStatus; tone?: StatusTone }) {
  const Icon = status === 'Ready' ? CheckCircle2 : status === 'Watch' ? AlertTriangle : AlertTriangle;

  return (
    <Badge variant="outline" className={`gap-1 rounded-full ${statusClass(status, tone)}`}>
      <Icon className="size-3" />
      {status}
    </Badge>
  );
}
