import {
  getSkuLabel,
  getSkuProductName,
  type PrimeAlert,
  type PrimeForecast,
  type PrimeRecommendation,
  type PrimeSnapshot,
} from './prime-data';

export type SignalCardSourceType = 'market' | 'creator' | 'voc' | 'campaign' | 'customer' | 'cos' | 'finance';
export type IntelligencePackageStatus = 'running' | 'review_needed' | 'ready_for_demand' | 'sent_to_demand' | 'blocked' | 'outcome_learned';
export type IntelligenceRiskLevel = 'low' | 'medium' | 'high';
export type IntelligenceAgentStatus = 'running' | 'needs_review' | 'ready' | 'blocked';

export type SignalCard = {
  id: string;
  title: string;
  source: string;
  sourceType: SignalCardSourceType;
  linkedEntityType: 'sku' | 'campaign' | 'customer' | 'rfq' | 'creator' | 'order' | 'segment';
  linkedEntityId: string;
  summary: string;
  strength: number;
  freshness: string;
  riskLevel: IntelligenceRiskLevel;
  evidenceIds: string[];
};

export type AgentEvidenceReport = {
  id: string;
  agentId: string;
  agentName: string;
  status: IntelligenceAgentStatus;
  finding: string;
  hypothesis: string;
  confidence: number;
  evidence: Array<{
    label: string;
    source: string;
    freshness: string;
    value: string;
    linkedEntityId?: string;
  }>;
  rejectedAlternatives: Array<{ option: string; reason: string }>;
  risks: Array<{ label: string; severity: IntelligenceRiskLevel; mitigation: string }>;
  generatedAt: string;
};

export type DemandHandoffPayload = {
  targetRoute: string;
  objective: string;
  audience: string;
  productRoute?: string;
  offer?: string;
  messageAngle?: string;
  channel?: string;
  cta?: string;
  ownerRecommendation: string;
  guardrails: string[];
  requiresApproval: boolean;
};

export type DecisionPackage = {
  id: string;
  title: string;
  status: IntelligencePackageStatus;
  priority: 'P0' | 'P1' | 'P2';
  owner: string;
  nextOwner: 'Demand' | 'Customer' | 'Ecom/COS' | 'Finance';
  finding: string;
  confidence: number;
  expectedImpact: { label: string; value: string; rationale: string };
  riskLevel: IntelligenceRiskLevel;
  recommendedDemandAction: 'campaign' | 'content' | 'creator' | 'lead_response' | 'retargeting' | 'suppress' | 'request_more_data';
  evidenceReport: AgentEvidenceReport;
  linkedSignals: SignalCard[];
  handoffPayload: DemandHandoffPayload;
  readback?: { state: 'accepted' | 'rejected' | 'campaign_created' | 'outcome_learned'; note: string; updatedAt: string };
};

export type AgentRunSummary = {
  id: string;
  name: string;
  status: IntelligenceAgentStatus;
  activeFocus: string;
  outputCount: number;
  lastRun: string;
};

export type IntelligenceWorkspaceSnapshot = {
  agents: AgentRunSummary[];
  packages: DecisionPackage[];
  stats: {
    running: number;
    needsReview: number;
    readyForDemand: number;
    blocked: number;
    learned: number;
  };
};

const freshnessLabel = (minutes: number) => minutes < 60 ? `${minutes}m` : `${Math.round(minutes / 60)}h`;
const riskFromForecast = (forecast?: PrimeForecast): IntelligenceRiskLevel => forecast?.risk === 'high' ? 'high' : forecast?.risk === 'medium' ? 'medium' : 'low';
const statusFromRisk = (risk: IntelligenceRiskLevel, confidence: number): IntelligencePackageStatus => {
  if (risk === 'high') return 'blocked';
  if (confidence >= 84) return 'ready_for_demand';
  return 'review_needed';
};

function buildRecommendationPackage(snapshot: PrimeSnapshot, recommendation: PrimeRecommendation, index: number): DecisionPackage {
  const campaign = snapshot.campaigns[index % Math.max(snapshot.campaigns.length, 1)];
  const stream = snapshot.socialStreams[index % Math.max(snapshot.socialStreams.length, 1)];
  const voc = snapshot.vocInsights[index % Math.max(snapshot.vocInsights.length, 1)];
  const forecast = campaign ? snapshot.forecasts.find((item) => item.skuCode === campaign.skuCode) : snapshot.forecasts[0];
  const baseRiskLevel = riskFromForecast(forecast);
  const riskLevel: IntelligenceRiskLevel = recommendation.id === 'rec_inventory_001'
    ? baseRiskLevel
    : recommendation.id === 'rec_service_001'
      ? 'medium'
      : 'low';
  const productRoute = campaign ? getSkuLabel(campaign.skuCode) : recommendation.target;
  const signal: SignalCard = {
    id: `signal-${recommendation.id}`,
    title: stream?.source ?? 'Market signal',
    source: stream?.source ?? 'Prime OS signal mesh',
    sourceType: 'market',
    linkedEntityType: 'sku',
    linkedEntityId: forecast?.skuId ?? campaign?.skuId ?? recommendation.id,
    summary: stream?.audienceSignal ?? recommendation.reasoning,
    strength: recommendation.confidence,
    freshness: stream ? freshnessLabel(stream.freshnessMinutes) : 'live',
    riskLevel,
    evidenceIds: [recommendation.id, voc?.id, forecast?.id].filter(Boolean) as string[],
  };

  const confidence = Math.max(58, Math.min(96, recommendation.confidence - (riskLevel === 'high' ? 12 : riskLevel === 'medium' ? 4 : 0)));
  const hasOutcomeReadback = recommendation.id === 'rec_campaign_001';
  return {
    id: `pkg-${recommendation.id}`,
    title: recommendation.target,
    status: hasOutcomeReadback ? 'outcome_learned' : statusFromRisk(riskLevel, confidence),
    priority: riskLevel === 'high' ? 'P0' : confidence >= 84 ? 'P1' : 'P2',
    owner: 'Intelligence Operator',
    nextOwner: riskLevel === 'high' ? 'Ecom/COS' : 'Demand',
    finding: recommendation.reasoning,
    confidence,
    expectedImpact: {
      label: campaign ? 'Revenue proof' : 'Decision lift',
      value: campaign ? `¥${campaign.revenue.toLocaleString()}` : `${confidence}%`,
      rationale: campaign ? `${campaign.leads} leads, ${campaign.rfqs} RFQs, ${campaign.orders} orders already attached.` : recommendation.action,
    },
    riskLevel,
    recommendedDemandAction: riskLevel === 'high' ? 'request_more_data' : 'campaign',
    evidenceReport: {
      id: `report-${recommendation.id}`,
      agentId: index % 2 ? 'persona-analyst' : 'market-scout',
      agentName: index % 2 ? 'Persona Analyst' : 'Market Scout',
      status: riskLevel === 'high' ? 'blocked' : confidence >= 84 ? 'ready' : 'needs_review',
      finding: recommendation.reasoning,
      hypothesis: `Demand should test ${productRoute} with a reviewed campaign package before broader scale.`,
      confidence,
      evidence: [
        { label: 'Market signal', source: signal.source, freshness: signal.freshness, value: signal.summary, linkedEntityId: signal.linkedEntityId },
        { label: 'VOC', source: voc?.source ?? 'VOC mesh', freshness: 'today', value: voc?.summary ?? 'No VOC signal attached.' },
        { label: 'COS guardrail', source: 'Inventory forecast', freshness: 'live', value: forecast ? `${forecast.ats} ATS / ${forecast.demand7d} forecast` : 'No forecast attached.' },
      ],
      rejectedAlternatives: [
        { option: 'Scale paid spend immediately', reason: riskLevel === 'high' ? 'Stock guardrail must clear first.' : 'Operator should approve message and CTA first.' },
      ],
      risks: [
        { label: riskLevel === 'high' ? 'Stock risk' : 'Message fit risk', severity: riskLevel, mitigation: riskLevel === 'high' ? forecast?.suggestedAction ?? 'Check COS guardrail.' : 'Review audience, CTA, and Demand owner before send.' },
      ],
      generatedAt: index === 0 ? '12m ago' : `${18 + index * 7}m ago`,
    },
    linkedSignals: [signal],
    handoffPayload: {
      targetRoute: '/demand/campaigns',
      objective: recommendation.action,
      audience: campaign?.targetSegment ?? 'Qualified demand segment',
      productRoute,
      offer: campaign ? `${getSkuProductName(campaign.skuCode)} launch route` : 'Offer pending',
      messageAngle: voc?.action ?? recommendation.reasoning,
      channel: campaign?.channel ?? 'Campaign Ops',
      cta: 'Request quote / review campaign setup',
      ownerRecommendation: 'Demand Campaign Ops',
      guardrails: [forecast ? `${forecast.ats} ATS / ${forecast.demand7d} forecast` : 'No COS forecast attached', riskLevel === 'high' ? 'Hold scale until COS clears.' : 'Human approval required before Demand execution.'],
      requiresApproval: true,
    },
    readback: hasOutcomeReadback ? {
      state: 'campaign_created',
      note: campaign ? `Demand accepted the package and staged ${campaign.name} as a campaign route.` : 'Demand accepted the package and staged a campaign route.',
      updatedAt: '8m ago',
    } : undefined,
  };
}

function buildAlertPackage(snapshot: PrimeSnapshot, alert: PrimeAlert, index: number): DecisionPackage {
  const confidence = alert.severity === 'high' ? 68 : 76;
  return {
    id: `pkg-${alert.id}`,
    title: alert.title,
    status: alert.severity === 'high' ? 'blocked' : 'review_needed',
    priority: alert.severity === 'high' ? 'P0' : 'P2',
    owner: 'Launch Risk Analyst',
    nextOwner: alert.area === 'Ecom Area' ? 'Ecom/COS' : 'Demand',
    finding: `Guardrail detected for ${alert.linkedEntity}.`,
    confidence,
    expectedImpact: { label: 'Risk avoided', value: alert.severity, rationale: 'Block or review before Demand receives campaign payload.' },
    riskLevel: alert.severity,
    recommendedDemandAction: 'request_more_data',
    evidenceReport: {
      id: `report-${alert.id}`,
      agentId: 'launch-risk-analyst',
      agentName: 'Launch Risk Analyst',
      status: alert.severity === 'high' ? 'blocked' : 'needs_review',
      finding: alert.title,
      hypothesis: 'This package should not move to Demand until guardrail owner clears the blocker.',
      confidence,
      evidence: [{ label: 'Alert', source: alert.area, freshness: 'live', value: alert.linkedEntity }],
      rejectedAlternatives: [{ option: 'Send to Demand anyway', reason: 'Would duplicate operational risk inside Demand.' }],
      risks: [{ label: alert.title, severity: alert.severity, mitigation: 'Route to owning area before campaign scale.' }],
      generatedAt: `${10 + index * 5}m ago`,
    },
    linkedSignals: [{
      id: `signal-${alert.id}`,
      title: alert.title,
      source: alert.area,
      sourceType: alert.area === 'Ecom Area' ? 'cos' : 'market',
      linkedEntityType: 'sku',
      linkedEntityId: alert.linkedEntity,
      summary: alert.linkedEntity,
      strength: confidence,
      freshness: 'live',
      riskLevel: alert.severity,
      evidenceIds: [alert.id],
    }],
    handoffPayload: {
      targetRoute: '/demand/campaigns',
      objective: 'Hold Demand handoff until guardrail clears.',
      audience: 'Demand Campaign Ops',
      ownerRecommendation: alert.area.replace(' Area', ''),
      guardrails: [alert.title, alert.linkedEntity],
      requiresApproval: true,
    },
  };
}

export function buildIntelligenceWorkspace(snapshot: PrimeSnapshot): IntelligenceWorkspaceSnapshot {
  const packages = [
    ...snapshot.recommendations.slice(0, 4).map((recommendation, index) => buildRecommendationPackage(snapshot, recommendation, index)),
    ...snapshot.alerts.slice(0, 2).map((alert, index) => buildAlertPackage(snapshot, alert, index)),
  ];

  const agents: AgentRunSummary[] = [
    { id: 'market-scout', name: 'Market Scout', status: packages.some((item) => item.evidenceReport.agentId === 'market-scout' && item.status === 'ready_for_demand') ? 'ready' : 'running', activeFocus: 'Market demand + campaign route', outputCount: packages.filter((item) => item.evidenceReport.agentId === 'market-scout').length, lastRun: '12m ago' },
    { id: 'persona-analyst', name: 'Persona Analyst', status: 'needs_review', activeFocus: 'Buyer persona + message fit', outputCount: packages.filter((item) => item.evidenceReport.agentId === 'persona-analyst').length, lastRun: '19m ago' },
    { id: 'message-strategist', name: 'Message Strategist', status: 'running', activeFocus: 'Offer, CTA, channel angle', outputCount: snapshot.activationPlays.length, lastRun: 'live' },
    { id: 'launch-risk-analyst', name: 'Launch Risk Analyst', status: packages.some((item) => item.status === 'blocked') ? 'blocked' : 'ready', activeFocus: 'COS + Demand guardrails', outputCount: packages.filter((item) => item.riskLevel === 'high').length, lastRun: '10m ago' },
  ];

  return {
    agents,
    packages,
    stats: {
      running: agents.filter((agent) => agent.status === 'running').length,
      needsReview: packages.filter((item) => item.status === 'review_needed').length,
      readyForDemand: packages.filter((item) => item.status === 'ready_for_demand').length,
      blocked: packages.filter((item) => item.status === 'blocked').length,
      learned: packages.filter((item) => item.status === 'outcome_learned').length,
    },
  };
}
