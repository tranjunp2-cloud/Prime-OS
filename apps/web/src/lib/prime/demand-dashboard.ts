import { buildDemandSources, buildDemandSourcesOverview } from './demand-sources';
import type {
  PrimeActivationPlay,
  PrimeCampaign,
  PrimeForecast,
  PrimeRfq,
  PrimeSnapshot,
  PrimeTicket,
} from './prime-data';

export type DemandDashboardFunctionId =
  | 'mdec'
  | 'sources'
  | 'campaigns'
  | 'content-social'
  | 'leads-rfqs'
  | 're-engage';

export type DemandDashboardSeverity = 'critical' | 'watch' | 'ready';

export interface DemandFunctionSummary {
  id: DemandDashboardFunctionId;
  label: string;
  href: string;
  metric: string;
  detail: string;
  readiness: number;
  status: DemandDashboardSeverity;
  nextAction: string;
}

export interface DemandDashboardKpi {
  id: string;
  label: string;
  value: string;
  detail: string;
  tone: 'info' | 'purple' | 'success' | 'warning' | 'danger';
}

export interface DemandDashboardNextMove {
  id: string;
  rank: number;
  title: string;
  detail: string;
  owner: string;
  evidence: string;
  href: string;
  cta: string;
  severity: DemandDashboardSeverity;
}

export interface DemandDashboardGuardrail {
  id: string;
  label: string;
  value: string;
  detail: string;
  severity: DemandDashboardSeverity;
  href: string;
}

export interface DemandFunnelStage {
  id: string;
  label: string;
  value: number;
  displayValue: string;
  href: string;
  detail: string;
}

export interface DemandOutcomeRow {
  id: string;
  label: string;
  leads: number;
  rfqs: number;
  orders: number;
  revenue: number;
  href: string;
}

export interface DemandDashboardSnapshot {
  title: string;
  route: string;
  readiness: number;
  status: DemandDashboardSeverity;
  operatingAnswer: string;
  operatingDetail: string;
  totalLeads: number;
  totalRfqs: number;
  totalOrders: number;
  totalRevenue: number;
  totalSourceSignals: number;
  guardrailCount: number;
  functions: DemandFunctionSummary[];
  kpis: DemandDashboardKpi[];
  nextMoves: DemandDashboardNextMove[];
  guardrails: DemandDashboardGuardrail[];
  funnel: DemandFunnelStage[];
  outcomes: DemandOutcomeRow[];
  chartData: Array<{ function: string; readiness: number; status: DemandDashboardSeverity }>;
}

const DEMAND_ROUTES = {
  dashboard: '/demand/hub',
  mdec: '/demand/mdec',
  sources: '/demand/sources',
  campaigns: '/demand/campaigns',
  contentSocial: '/demand/content-social',
  leadsRfqs: '/demand/leads-rfqs',
  reEngage: '/demand/re-engage',
  inventory: '/ecom/cos/inventory-brain',
  service: '/customer/service',
} as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function percent(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function compact(value: number) {
  if (value >= 1_000_000) return `${Math.round(value / 100_000) / 10}M`;
  if (value >= 1_000) return `${Math.round(value / 100) / 10}K`;
  return String(value);
}

function money(value: number) {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(value);
}

function severityFromReadiness(readiness: number): DemandDashboardSeverity {
  if (readiness < 55) return 'critical';
  if (readiness < 78) return 'watch';
  return 'ready';
}

function buildInventoryMove(forecast?: PrimeForecast): DemandDashboardNextMove | null {
  if (!forecast || forecast.risk !== 'high') return null;

  return {
    id: `inventory-${forecast.id}`,
    rank: 1,
    title: `Resolve inventory pressure before scaling ${forecast.skuCode}`,
    detail: `${forecast.ats} ATS vs ${forecast.demand7d} projected demand. ${forecast.suggestedAction}`,
    owner: 'Demand + Ecom',
    evidence: 'Inventory guardrail',
    href: DEMAND_ROUTES.inventory,
    cta: 'Check inventory',
    severity: 'critical',
  };
}

function buildCampaignMove(campaign?: PrimeCampaign, rank = 2): DemandDashboardNextMove | null {
  if (!campaign) return null;
  const conversion = percent(campaign.orders, campaign.leads || campaign.traffic);

  return {
    id: `campaign-${campaign.id}`,
    rank,
    title: `Review ${campaign.name}`,
    detail: `${campaign.channel} has ${campaign.leads} leads, ${campaign.rfqs} RFQs, ${campaign.orders} orders, and ${conversion}% lead/order readback.`,
    owner: 'Campaigns',
    evidence: `${compact(campaign.traffic)} traffic`,
    href: DEMAND_ROUTES.campaigns,
    cta: 'Open campaign',
    severity: campaign.status === 'active' ? 'ready' : 'watch',
  };
}

function buildRfqMove(rfq?: PrimeRfq, rank = 3): DemandDashboardNextMove | null {
  if (!rfq) return null;

  return {
    id: `rfq-${rfq.id}`,
    rank,
    title: `Route RFQ from ${rfq.requestedBy}`,
    detail: `${rfq.quantity} units, ${money(rfq.value)}, status ${rfq.status}.`,
    owner: 'Leads & RFQs',
    evidence: 'Buyer intent',
    href: `${DEMAND_ROUTES.leadsRfqs}?rfq=${encodeURIComponent(rfq.id)}`,
    cta: 'Open RFQ',
    severity: rfq.status === 'converted' ? 'ready' : 'watch',
  };
}

function buildReEngageMove(play?: PrimeActivationPlay, rank = 4): DemandDashboardNextMove | null {
  if (!play) return null;

  return {
    id: `reengage-${play.id}`,
    rank,
    title: play.audience,
    detail: `${play.nextBestAction} Projected lift ${play.projectedLift}%.`,
    owner: 'Re-engage',
    evidence: play.trigger,
    href: DEMAND_ROUTES.reEngage,
    cta: 'Open play',
    severity: 'ready',
  };
}

function buildServiceGuardrail(ticket?: PrimeTicket): DemandDashboardGuardrail {
  if (!ticket) {
    return {
      id: 'service-clear',
      label: 'Service',
      value: 'Clear',
      detail: 'No open service issue blocks Demand outreach.',
      severity: 'ready',
      href: DEMAND_ROUTES.service,
    };
  }

  return {
    id: `service-${ticket.id}`,
    label: 'Service',
    value: ticket.priority === 'high' ? 'High' : 'Open',
    detail: ticket.subject,
    severity: ticket.priority === 'high' ? 'critical' : 'watch',
    href: DEMAND_ROUTES.service,
  };
}

export function buildDemandDashboardSnapshot(snapshot: PrimeSnapshot): DemandDashboardSnapshot {
  const sources = buildDemandSources(snapshot);
  const sourcesOverview = buildDemandSourcesOverview(sources);
  const activeCampaigns = snapshot.campaigns.filter((campaign) => campaign.status === 'active');
  const totalLeads = snapshot.campaigns.reduce((sum, campaign) => sum + campaign.leads, 0);
  const totalRfqs = snapshot.campaigns.reduce((sum, campaign) => sum + campaign.rfqs, 0);
  const totalOrders = snapshot.campaigns.reduce((sum, campaign) => sum + campaign.orders, 0);
  const totalTraffic = snapshot.campaigns.reduce((sum, campaign) => sum + campaign.traffic, 0);
  const totalRevenue = snapshot.campaigns.reduce((sum, campaign) => sum + campaign.revenue, 0);
  const openRfqs = snapshot.rfqs.filter((rfq) => rfq.status !== 'converted').length;
  const openLeads = snapshot.leads.filter((lead) => lead.status !== 'converted').length;
  const responseBacklog = openLeads + openRfqs;
  const sourceSignals = snapshot.socialStreams.reduce((sum, stream) => sum + stream.eventVolume, 0);
  const highRiskForecasts = snapshot.forecasts.filter((forecast) => forecast.risk === 'high');
  const openTickets = snapshot.tickets.filter((ticket) => ticket.status !== 'resolved');
  const blockedGuardrails = highRiskForecasts.length + openTickets.length;
  const primaryCampaign = snapshot.campaigns[0];
  const primaryRfq = snapshot.rfqs.find((rfq) => rfq.status !== 'converted') ?? snapshot.rfqs[0];
  const primaryPlay = snapshot.activationPlays[0];
  const topForecast = highRiskForecasts[0] ?? snapshot.forecasts.find((forecast) => forecast.risk === 'medium') ?? snapshot.forecasts[0];
  const sourceQuality = sourcesOverview.averageQualityScore || 0;
  const campaignReadiness = snapshot.campaigns.length
    ? Math.round(activeCampaigns.length / snapshot.campaigns.length * 100)
    : 0;
  const responseReadiness = clamp(100 - responseBacklog * 5 + totalRfqs, 35, 100);
  const contentReadiness = clamp(62 + snapshot.socialStreams.filter((stream) => stream.status === 'healthy').length * 8 - snapshot.socialStreams.filter((stream) => stream.status === 'lagging').length * 12, 35, 96);
  const reEngageReadiness = snapshot.activationPlays.length ? clamp(72 + snapshot.activationPlays.length * 4 - openTickets.length * 6, 42, 95) : 48;
  const mdecReadiness = clamp(68 + activeCampaigns.length * 5 - blockedGuardrails * 4, 42, 94);
  const readiness = clamp(
    Math.round((sourceQuality + campaignReadiness + responseReadiness + contentReadiness + reEngageReadiness + mdecReadiness) / 6),
    35,
    96,
  );
  const status = severityFromReadiness(readiness);

  const functions: DemandFunctionSummary[] = [
    {
      id: 'mdec',
      label: 'MDEC',
      href: DEMAND_ROUTES.mdec,
      metric: `${snapshot.socialStreams.length} channels`,
      detail: 'Composer, calendar, engagement, and escalation surface.',
      readiness: mdecReadiness,
      status: severityFromReadiness(mdecReadiness),
      nextAction: 'Open composer',
    },
    {
      id: 'sources',
      label: 'Sources',
      href: DEMAND_ROUTES.sources,
      metric: `${sourcesOverview.totalActiveSources}/${sources.length} active`,
      detail: `${sourcesOverview.sourcesNeedingReview} source(s) need owner review.`,
      readiness: sourceQuality,
      status: severityFromReadiness(sourceQuality),
      nextAction: sourcesOverview.sourcesNeedingReview ? 'Fix source quality' : 'Open registry',
    },
    {
      id: 'campaigns',
      label: 'Campaigns',
      href: DEMAND_ROUTES.campaigns,
      metric: `${activeCampaigns.length}/${snapshot.campaigns.length} active`,
      detail: primaryCampaign ? `${primaryCampaign.name} is the primary route.` : 'No campaign route.',
      readiness: campaignReadiness,
      status: severityFromReadiness(campaignReadiness),
      nextAction: blockedGuardrails ? 'Review guardrails' : 'Open campaigns',
    },
    {
      id: 'content-social',
      label: 'Content & Social',
      href: DEMAND_ROUTES.contentSocial,
      metric: `${compact(sourceSignals)} signals`,
      detail: 'Convert channel proof into assets and CTAs.',
      readiness: contentReadiness,
      status: severityFromReadiness(contentReadiness),
      nextAction: 'Open content queue',
    },
    {
      id: 'leads-rfqs',
      label: 'Leads & RFQs',
      href: DEMAND_ROUTES.leadsRfqs,
      metric: `${responseBacklog} open`,
      detail: `${openLeads} leads and ${openRfqs} RFQs require SLA ownership.`,
      readiness: responseReadiness,
      status: severityFromReadiness(responseReadiness),
      nextAction: 'Open response queue',
    },
    {
      id: 're-engage',
      label: 'Re-engage',
      href: DEMAND_ROUTES.reEngage,
      metric: `${snapshot.activationPlays.length} plays`,
      detail: 'Recover warm buyers with suppression and cooldown rules.',
      readiness: reEngageReadiness,
      status: severityFromReadiness(reEngageReadiness),
      nextAction: 'Open playbook',
    },
  ];

  const kpis: DemandDashboardKpi[] = [
    {
      id: 'readiness',
      label: 'Readiness',
      value: `${readiness}%`,
      detail: `${blockedGuardrails} guardrail(s), ${functions.filter((item) => item.status !== 'ready').length} function(s) need attention.`,
      tone: status === 'critical' ? 'danger' : status === 'watch' ? 'warning' : 'success',
    },
    {
      id: 'source-quality',
      label: 'Source quality',
      value: `${sourceQuality}%`,
      detail: `${compact(sourceSignals)} signals across ${sources.length} tracked origins.`,
      tone: 'info',
    },
    {
      id: 'response',
      label: 'Lead/RFQ queue',
      value: String(responseBacklog),
      detail: `${totalLeads} leads and ${totalRfqs} RFQs generated.`,
      tone: responseBacklog > 8 ? 'warning' : 'success',
    },
    {
      id: 'outcome',
      label: 'Outcome readback',
      value: `${totalOrders} orders`,
      detail: `${money(totalRevenue)} revenue attached to Demand.`,
      tone: 'purple',
    },
  ];

  const nextMoves = [
    buildInventoryMove(highRiskForecasts[0]),
    buildCampaignMove(primaryCampaign, highRiskForecasts.length ? 2 : 1),
    buildRfqMove(primaryRfq, highRiskForecasts.length ? 3 : 2),
    buildReEngageMove(primaryPlay, highRiskForecasts.length ? 4 : 3),
  ]
    .filter(Boolean)
    .map((move, index) => ({ ...move, rank: index + 1 })) as DemandDashboardNextMove[];

  const guardrails: DemandDashboardGuardrail[] = [
    {
      id: topForecast ? `stock-${topForecast.id}` : 'stock-clear',
      label: 'Stock',
      value: topForecast ? `${topForecast.ats}/${topForecast.demand7d}` : 'Clear',
      detail: topForecast ? `${topForecast.skuCode} is ${topForecast.risk} risk. ${topForecast.suggestedAction}` : 'No inventory risk detected.',
      severity: topForecast ? topForecast.risk === 'high' ? 'critical' : topForecast.risk === 'medium' ? 'watch' : 'ready' : 'ready',
      href: DEMAND_ROUTES.inventory,
    },
    buildServiceGuardrail(openTickets[0]),
    {
      id: 'suppression',
      label: 'Suppression',
      value: snapshot.activationPlays.length ? 'On' : 'Pending',
      detail: 'Converted buyers, open tickets, and assigned RFQs stay excluded from re-entry.',
      severity: snapshot.activationPlays.length ? 'ready' : 'watch',
      href: DEMAND_ROUTES.reEngage,
    },
  ];

  const funnel: DemandFunnelStage[] = [
    {
      id: 'sources',
      label: 'Sources',
      value: sourceSignals,
      displayValue: compact(sourceSignals),
      href: DEMAND_ROUTES.sources,
      detail: 'Origin signal volume and source quality.',
    },
    {
      id: 'campaigns',
      label: 'Campaigns',
      value: totalTraffic,
      displayValue: compact(totalTraffic),
      href: DEMAND_ROUTES.campaigns,
      detail: 'Campaign traffic and market packaging.',
    },
    {
      id: 'leads',
      label: 'Leads',
      value: totalLeads,
      displayValue: String(totalLeads),
      href: DEMAND_ROUTES.leadsRfqs,
      detail: 'Qualified buyer intent entering response.',
    },
    {
      id: 'rfqs',
      label: 'RFQs',
      value: totalRfqs,
      displayValue: String(totalRfqs),
      href: DEMAND_ROUTES.leadsRfqs,
      detail: 'Commercial requests ready for owner routing.',
    },
    {
      id: 'orders',
      label: 'Orders',
      value: totalOrders,
      displayValue: String(totalOrders),
      href: '/ecom/cos/oms',
      detail: 'Outcome readback into PrimeOS.',
    },
  ];

  const outcomes: DemandOutcomeRow[] = snapshot.campaigns.slice(0, 5).map((campaign) => ({
    id: campaign.id,
    label: campaign.name,
    leads: campaign.leads,
    rfqs: campaign.rfqs,
    orders: campaign.orders,
    revenue: campaign.revenue,
    href: DEMAND_ROUTES.campaigns,
  }));

  return {
    title: 'Demand Dashboard',
    route: DEMAND_ROUTES.dashboard,
    readiness,
    status,
    operatingAnswer: blockedGuardrails
      ? 'Fix guardrails before scaling Demand.'
      : 'Demand is ready for controlled growth.',
    operatingDetail: `${functions.filter((item) => item.status === 'ready').length}/${functions.length} functions are ready. ${totalLeads} leads, ${totalRfqs} RFQs, and ${totalOrders} orders are visible from one dashboard.`,
    totalLeads,
    totalRfqs,
    totalOrders,
    totalRevenue,
    totalSourceSignals: sourceSignals,
    guardrailCount: blockedGuardrails,
    functions,
    kpis,
    nextMoves,
    guardrails,
    funnel,
    outcomes,
    chartData: functions.map((item) => ({
      function: item.label,
      readiness: item.readiness,
      status: item.status,
    })),
  };
}
