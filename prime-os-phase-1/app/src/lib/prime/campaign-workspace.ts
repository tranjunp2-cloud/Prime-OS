import type { PrimeCampaign, PrimeSnapshot } from './prime-data';

export type CampaignWorkspaceTab =
  | 'overview'
  | 'pipeline'
  | 'planner'
  | 'readiness'
  | 'execution-queue'
  | 'results';

export type CampaignStage =
  | 'idea'
  | 'draft'
  | 'ready'
  | 'queued'
  | 'running'
  | 'paused'
  | 'completed';

export type CampaignObjective =
  | 'generate-leads'
  | 'capture-rfqs'
  | 're-engage-buyers'
  | 'launch-sku'
  | 'clear-inventory'
  | 'test-demand'
  | 'improve-marketplace-traffic';

export type CampaignReadinessStatus = 'ready' | 'warning' | 'blocked' | 'needs-review';
export type CampaignExecutionStatus = 'recommended' | 'reviewed' | 'queued' | 'executing' | 'done' | 'failed' | 'cancelled';

export interface CampaignWorkspaceSummary {
  activeCampaigns: number;
  queuedActions: number;
  readiness: number;
  guardrailAlerts: number;
  traffic: number;
  leads: number;
  rfqs: number;
  orders: number;
  spend: number;
  revenue: number;
  roas: number;
}

export interface CampaignPipelineItem {
  id: string;
  name: string;
  stage: CampaignStage;
  owner: string;
  skuCode: string;
  channel: string;
  readiness: number;
  nextAction: string;
  status: PrimeCampaign['status'];
}

export interface CampaignPlannerDraft {
  id: string;
  campaignId: string;
  objective: CampaignObjective;
  campaignName: string;
  targetSku: string;
  targetAudience: string;
  messageOffer: string;
  channel: string;
  owner: string;
  timeline: string;
  expectedOutcome: string;
}

export interface CampaignReadinessCheck {
  id: string;
  area: string;
  status: CampaignReadinessStatus;
  blocker: string;
  owner: string;
  fix: string;
  campaignId: string;
}

export interface CampaignExecutionActionRow {
  id: string;
  actionType: string;
  title: string;
  campaignId: string;
  campaignName: string;
  channel: string;
  owner: string;
  status: CampaignExecutionStatus;
  guardrail: string;
}

export interface CampaignResultReadback {
  id: string;
  campaignId: string;
  campaignName: string;
  reach: number;
  leads: number;
  rfqs: number;
  orders: number;
  revenue: number;
  spend: number;
  roas: number;
  sourceQuality: number;
  skuSignal: string;
  status: 'strong' | 'good' | 'learning' | 'watch';
}

export interface CampaignWorkspaceSnapshot {
  summary: CampaignWorkspaceSummary;
  campaigns: CampaignPipelineItem[];
  plannerDrafts: CampaignPlannerDraft[];
  readinessChecks: CampaignReadinessCheck[];
  executionActions: CampaignExecutionActionRow[];
  results: CampaignResultReadback[];
  selectedCampaignId: string | null;
}

export const CAMPAIGN_WORKSPACE_TABS: Array<{ id: CampaignWorkspaceTab; label: string; detail: string }> = [
  { id: 'overview', label: 'Overview', detail: 'Health, blockers, next action' },
  { id: 'pipeline', label: 'Pipeline', detail: 'Lifecycle and ownership' },
  { id: 'planner', label: 'Planner', detail: 'Objective, SKU, audience, route' },
  { id: 'readiness', label: 'Readiness', detail: 'Launch safety checks' },
  { id: 'execution-queue', label: 'Execution Queue', detail: 'Drafts, tasks, queue state' },
  { id: 'results', label: 'Results', detail: 'Leads, RFQs, orders, revenue' },
];

export const CAMPAIGN_OBJECTIVES: Array<{ id: CampaignObjective; label: string; detail: string }> = [
  { id: 'generate-leads', label: 'Generate Leads', detail: 'Create new demand leads.' },
  { id: 'capture-rfqs', label: 'Capture RFQs', detail: 'Convert buyer intent into RFQs.' },
  { id: 're-engage-buyers', label: 'Re-engage Buyers', detail: 'Activate prior or dormant buyers.' },
  { id: 'launch-sku', label: 'Launch SKU', detail: 'Launch or relaunch a product route.' },
  { id: 'clear-inventory', label: 'Clear Inventory', detail: 'Move stock without breaking guardrails.' },
  { id: 'test-demand', label: 'Test Demand', detail: 'Validate market demand before scale.' },
  { id: 'improve-marketplace-traffic', label: 'Improve Marketplace Traffic', detail: 'Increase marketplace discovery.' },
];

const owners = ['CRM Ops', 'Demand Team', 'Content Team', 'Ecom Ops', 'Finance Ops', 'Marketplace Ops'];
const stageByIndex: CampaignStage[] = ['queued', 'draft', 'running', 'ready', 'paused', 'completed'];
const objectiveByIndex: CampaignObjective[] = [
  're-engage-buyers',
  'test-demand',
  'launch-sku',
  'clear-inventory',
  'capture-rfqs',
  'improve-marketplace-traffic',
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function percent(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function roas(revenue: number, spend: number) {
  if (!spend) return 0;
  return Number((revenue / spend).toFixed(1));
}

function compact(value: number) {
  if (value >= 1_000_000) return `${Math.round(value / 100_000) / 10}M`;
  if (value >= 1_000) return `${Math.round(value / 100) / 10}K`;
  return String(value);
}

function campaignReadiness(campaign: PrimeCampaign, index: number, snapshot: PrimeSnapshot) {
  const forecast = snapshot.forecasts.find((item) => item.skuCode === campaign.skuCode);
  const stockPenalty = forecast?.risk === 'high' ? 18 : forecast?.risk === 'medium' ? 8 : 0;
  const statusBase = campaign.status === 'active' ? 82 : campaign.status === 'testing' ? 66 : 54;
  const conversionLift = clamp(percent(campaign.rfqs, campaign.leads || 1), 0, 18);
  return clamp(statusBase + conversionLift - stockPenalty - index * 2, 38, 96);
}

function statusFromReadiness(readiness: number): CampaignReadinessStatus {
  if (readiness < 55) return 'blocked';
  if (readiness < 72) return 'needs-review';
  if (readiness < 84) return 'warning';
  return 'ready';
}

function resultStatus(result: CampaignResultReadback['roas'], readiness: number): CampaignResultReadback['status'] {
  if (result >= 2.4 && readiness >= 80) return 'strong';
  if (result >= 1.6) return 'good';
  if (readiness < 60) return 'watch';
  return 'learning';
}

export function normalizeCampaignWorkspaceTab(value: string | null | undefined): CampaignWorkspaceTab {
  const match = CAMPAIGN_WORKSPACE_TABS.find((tab) => tab.id === value);
  return match?.id ?? 'overview';
}

export function buildCampaignWorkspace(snapshot: PrimeSnapshot, options: { selectedCampaignId?: string | null } = {}): CampaignWorkspaceSnapshot {
  const selectedCampaignId = options.selectedCampaignId && snapshot.campaigns.some((campaign) => campaign.id === options.selectedCampaignId)
    ? options.selectedCampaignId
    : snapshot.campaigns[0]?.id ?? null;

  const campaigns: CampaignPipelineItem[] = snapshot.campaigns.map((campaign, index) => {
    const readiness = campaignReadiness(campaign, index, snapshot);
    const forecast = snapshot.forecasts.find((item) => item.skuCode === campaign.skuCode);
    const stockBlocked = forecast?.risk === 'high';
    const stage = stockBlocked ? 'draft' : campaign.status === 'paused' ? 'paused' : stageByIndex[index % stageByIndex.length];

    return {
      id: campaign.id,
      name: campaign.name,
      stage,
      owner: owners[index % owners.length],
      skuCode: campaign.skuCode,
      channel: campaign.channel,
      readiness,
      nextAction: stockBlocked ? 'Fix stock guardrail' : readiness >= 84 ? 'Queue execution' : readiness >= 70 ? 'Review setup' : 'Complete readiness',
      status: campaign.status,
    };
  });

  const plannerDrafts: CampaignPlannerDraft[] = snapshot.campaigns.map((campaign, index) => ({
    id: `planner_${campaign.id}`,
    campaignId: campaign.id,
    objective: objectiveByIndex[index % objectiveByIndex.length],
    campaignName: campaign.name,
    targetSku: campaign.skuCode,
    targetAudience: campaign.targetSegment,
    messageOffer: index % 2 === 0 ? 'Proof-led bundle quote with refill support' : 'Marketplace discovery route with RFQ CTA',
    channel: campaign.channel,
    owner: owners[index % owners.length],
    timeline: index === 0 ? 'This week' : `${index + 1} week plan`,
    expectedOutcome: `${campaign.leads} leads, ${campaign.rfqs} RFQs, ${campaign.orders} orders`,
  }));

  const readinessChecks: CampaignReadinessCheck[] = snapshot.campaigns.flatMap((campaign, campaignIndex) => {
    const pipeline = campaigns[campaignIndex];
    const forecast = snapshot.forecasts.find((item) => item.skuCode === campaign.skuCode);
    const stockBlocked = forecast?.risk === 'high';
    const base: CampaignReadinessCheck[] = [
      {
        id: `${campaign.id}-audience`,
        area: 'Audience',
        status: campaign.leads > 40 ? 'ready' : 'needs-review',
        blocker: campaign.leads > 40 ? 'None' : 'Audience size is thin',
        owner: 'CRM Ops',
        fix: campaign.leads > 40 ? 'Keep segment locked' : 'Add source or CRM audience proof',
        campaignId: campaign.id,
      },
      {
        id: `${campaign.id}-content`,
        area: 'Content',
        status: campaignIndex % 3 === 1 ? 'warning' : 'ready',
        blocker: campaignIndex % 3 === 1 ? 'CTA copy needs approval' : 'None',
        owner: 'Content Team',
        fix: campaignIndex % 3 === 1 ? 'Approve CTA and proof asset' : 'Reuse approved proof',
        campaignId: campaign.id,
      },
      {
        id: `${campaign.id}-inventory`,
        area: 'Stock / ATS',
        status: stockBlocked ? 'blocked' : 'ready',
        blocker: stockBlocked ? `${forecast?.ats ?? 0} ATS vs ${forecast?.demand7d ?? campaign.leads} demand` : 'None',
        owner: 'Ecom Ops',
        fix: stockBlocked ? 'Create stock top-up task before scale' : 'Monitor daily ATS',
        campaignId: campaign.id,
      },
      {
        id: `${campaign.id}-owner`,
        area: 'Owner / Channel',
        status: pipeline.readiness >= 70 ? 'ready' : 'needs-review',
        blocker: pipeline.readiness >= 70 ? 'None' : 'Owner or channel evidence incomplete',
        owner: pipeline.owner,
        fix: pipeline.readiness >= 70 ? 'Proceed to queue review' : 'Assign owner and confirm channel route',
        campaignId: campaign.id,
      },
    ];

    return base;
  });

  const executionActions: CampaignExecutionActionRow[] = snapshot.campaigns.map((campaign, index) => {
    const pipeline = campaigns[index];
    const blocked = readinessChecks.some((check) => check.campaignId === campaign.id && check.status === 'blocked');
    const actionTypes = ['Send campaign message', 'Create ad set', 'Create SEO task', 'Create stock top-up task'];
    return {
      id: `queue_${campaign.id}`,
      actionType: actionTypes[index % actionTypes.length],
      title: blocked ? `Resolve blocker for ${campaign.name}` : `Prepare execution for ${campaign.name}`,
      campaignId: campaign.id,
      campaignName: campaign.name,
      channel: campaign.channel,
      owner: pipeline.owner,
      status: blocked ? 'reviewed' : index === 0 ? 'recommended' : index === 2 ? 'executing' : 'queued',
      guardrail: blocked ? 'ATS risk' : 'Safe',
    };
  });

  const results: CampaignResultReadback[] = snapshot.campaigns.map((campaign, index) => {
    const pipeline = campaigns[index];
    const campaignRoas = roas(campaign.revenue, campaign.spend);
    const sourceQuality = clamp(62 + percent(campaign.rfqs, campaign.leads || 1) + index * 3, 45, 96);
    return {
      id: `result_${campaign.id}`,
      campaignId: campaign.id,
      campaignName: campaign.name,
      reach: campaign.traffic,
      leads: campaign.leads,
      rfqs: campaign.rfqs,
      orders: campaign.orders,
      revenue: campaign.revenue,
      spend: campaign.spend,
      roas: campaignRoas,
      sourceQuality,
      skuSignal: `${campaign.skuCode} ${percent(campaign.orders, campaign.leads || 1)}% order readback`,
      status: resultStatus(campaignRoas, pipeline.readiness),
    };
  });

  const activeCampaigns = snapshot.campaigns.filter((campaign) => campaign.status === 'active').length;
  const totalTraffic = snapshot.campaigns.reduce((sum, campaign) => sum + campaign.traffic, 0);
  const totalLeads = snapshot.campaigns.reduce((sum, campaign) => sum + campaign.leads, 0);
  const totalRfqs = snapshot.campaigns.reduce((sum, campaign) => sum + campaign.rfqs, 0);
  const totalOrders = snapshot.campaigns.reduce((sum, campaign) => sum + campaign.orders, 0);
  const totalSpend = snapshot.campaigns.reduce((sum, campaign) => sum + campaign.spend, 0);
  const totalRevenue = snapshot.campaigns.reduce((sum, campaign) => sum + campaign.revenue, 0);
  const readiness = campaigns.length
    ? Math.round(campaigns.reduce((sum, campaign) => sum + campaign.readiness, 0) / campaigns.length)
    : 0;
  const guardrailAlerts = readinessChecks.filter((check) => ['blocked', 'warning', 'needs-review'].includes(check.status)).length;
  const queuedActions = executionActions.filter((action) => ['recommended', 'reviewed', 'queued', 'executing'].includes(action.status)).length;

  return {
    summary: {
      activeCampaigns,
      queuedActions,
      readiness,
      guardrailAlerts,
      traffic: totalTraffic,
      leads: totalLeads,
      rfqs: totalRfqs,
      orders: totalOrders,
      spend: totalSpend,
      revenue: totalRevenue,
      roas: roas(totalRevenue, totalSpend),
    },
    campaigns,
    plannerDrafts,
    readinessChecks,
    executionActions,
    results,
    selectedCampaignId,
  };
}

export function getCampaignWorkspaceStatusLabel(status: CampaignReadinessStatus | CampaignExecutionStatus | CampaignStage) {
  return status.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

export function getCampaignWorkspaceMoney(value: number) {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(value);
}

export function getCampaignWorkspaceCompactNumber(value: number) {
  return compact(value);
}
