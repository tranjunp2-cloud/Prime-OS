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
export type PrimeArea = 'Intelligence' | 'Demand' | 'Customer' | 'Ecom/COS' | 'Finance';
export type SourceOwner = 'Intelligence' | 'Demand' | 'Customer' | 'Product Master' | 'OMS' | 'Inventory' | 'Fulfillment/Shipment' | 'Finance' | 'Event & Audit';
export type LinkedEntityType = 'recommendation' | 'signal' | 'campaign' | 'lead' | 'rfq' | 'customer' | 'product' | 'sku' | 'listing' | 'order' | 'reservation' | 'shipment' | 'return' | 'ticket' | 'finance_profile' | 'domain_event' | 'audit_id';
export type EvidenceQuality = 'verified' | 'derived' | 'stale' | 'missing' | 'conflicting';

export type SignalLineageInput = {
  owner: SourceOwner;
  entityType: LinkedEntityType;
  entityId: string;
  fieldPath?: string;
  capturedAt: string;
  freshnessAt: string;
  quality: EvidenceQuality;
};

export type SignalLineageTransform = {
  step: 'normalize' | 'score' | 'cluster' | 'summarize' | 'recommend';
  actor: 'system' | 'agent' | 'operator';
  modelRunId?: string;
  promptVersion?: string;
  ruleVersion?: string;
  outputHash: string;
  createdAt: string;
};

export type SignalLineage = {
  id: string;
  signalId: string;
  inputs: SignalLineageInput[];
  transforms: SignalLineageTransform[];
  auditIds: string[];
};

export type IntelligenceSignal = {
  id: string;
  family: SignalCardSourceType;
  title: string;
  summary: string;
  sourceOfTruthOwner: SourceOwner;
  readModelOwner: 'Intelligence';
  sourceSystem: string;
  sourceEntityType: LinkedEntityType;
  sourceEntityId: string;
  linkedEntities: Array<{ type: LinkedEntityType; id: string; owner: SourceOwner }>;
  strengthScore: number;
  confidence: number;
  freshnessAt: string;
  observedAt: string;
  lineageId: string;
  recommendedDecisionId?: string;
  quality: EvidenceQuality;
};

export type RecommendationEvidence = {
  id: string;
  recommendationId: string;
  evidenceItems: Array<{
    id: string;
    label: string;
    summary: string;
    supportsRecommendation: boolean;
    weight: number;
    owner: SourceOwner;
    entityType: LinkedEntityType;
    entityId: string;
    sourceRoute?: string;
    freshnessAt: string;
    quality: EvidenceQuality;
  }>;
  rejectedAlternatives: Array<{ option: string; reason: string; evidenceIds: string[] }>;
  guardrails: Array<{ owner: SourceOwner; message: string; blocking: boolean; entityId?: string }>;
  confidence: number;
  confidenceReason: string;
  generatedBy: { runtime: 'rule' | 'llm' | 'hybrid'; modelRunId?: string; promptVersion?: string };
};

export type RecommendationFeedback = {
  id: string;
  recommendationId: string;
  actorId: string;
  actorRole: string;
  decision: 'approved' | 'rejected' | 'needs_more_evidence' | 'sent_to_demand' | 'suppressed';
  reason?: string;
  evidenceIds: string[];
  demandHandoffId?: string;
  createdAt: string;
  auditId: string;
};

export type ActionOutcome = {
  id: string;
  recommendationId?: string;
  handoffId?: string;
  sourceOfTruthOwner: SourceOwner;
  readModelOwner: 'Intelligence';
  actionEntityType: LinkedEntityType;
  actionEntityId: string;
  outcomeType: 'accepted' | 'rejected' | 'campaign_created' | 'lead_created' | 'rfq_created' | 'order_created' | 'blocked' | 'learned';
  metrics: Array<{ name: string; value: number | string; unit?: string; owner: SourceOwner }>;
  learningNote: string;
  occurredAt: string;
  observedAt: string;
  auditIds: string[];
};

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
  sourceOfTruthOwner: SourceOwner;
  readModelOwner: 'Intelligence';
  lineage: SignalLineage;
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
  recommendationEvidence: RecommendationEvidence;
  feedback?: RecommendationFeedback;
  actionOutcome?: ActionOutcome;
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
  const signalId = `signal-${recommendation.id}`;
  const signalEvidenceIds = [recommendation.id, voc?.id, forecast?.id].filter(Boolean) as string[];
  const signalLineage: SignalLineage = {
    id: `lineage-${recommendation.id}`,
    signalId,
    inputs: [
      { owner: 'Intelligence', entityType: 'signal', entityId: stream?.id ?? signalId, fieldPath: 'audienceSignal', capturedAt: '12m ago', freshnessAt: stream ? freshnessLabel(stream.freshnessMinutes) : 'live', quality: stream ? 'derived' : 'missing' },
      { owner: 'Customer', entityType: 'customer', entityId: voc?.customerId ?? voc?.id ?? 'voc-mesh', fieldPath: 'voc.summary', capturedAt: 'today', freshnessAt: 'today', quality: voc ? 'verified' : 'missing' },
      { owner: 'Inventory', entityType: 'sku', entityId: forecast?.skuId ?? campaign?.skuId ?? recommendation.id, fieldPath: 'forecast.ats', capturedAt: 'live', freshnessAt: 'live', quality: forecast ? 'verified' : 'missing' },
    ],
    transforms: [
      { step: 'normalize', actor: 'system', ruleVersion: 'phase-5-readmodel-v1', outputHash: `norm-${recommendation.id}`, createdAt: '12m ago' },
      { step: 'recommend', actor: 'agent', modelRunId: `run-${recommendation.id}`, promptVersion: 'prime-intelligence-v1', outputHash: `rec-${recommendation.id}`, createdAt: '10m ago' },
    ],
    auditIds: [`audit-${recommendation.id}`],
  };
  const signal: SignalCard = {
    id: signalId,
    title: stream?.source ?? 'Market signal',
    source: stream?.source ?? 'Prime OS signal mesh',
    sourceType: 'market',
    linkedEntityType: 'sku',
    linkedEntityId: forecast?.skuId ?? campaign?.skuId ?? recommendation.id,
    summary: stream?.audienceSignal ?? recommendation.reasoning,
    strength: recommendation.confidence,
    freshness: stream ? freshnessLabel(stream.freshnessMinutes) : 'live',
    riskLevel,
    evidenceIds: signalEvidenceIds,
    sourceOfTruthOwner: 'Intelligence',
    readModelOwner: 'Intelligence',
    lineage: signalLineage,
  };

  const confidence = Math.max(58, Math.min(96, recommendation.confidence - (riskLevel === 'high' ? 12 : riskLevel === 'medium' ? 4 : 0)));
  const hasOutcomeReadback = recommendation.id === 'rec_campaign_001';
  const recommendationEvidence: RecommendationEvidence = {
    id: `evidence-${recommendation.id}`,
    recommendationId: recommendation.id,
    evidenceItems: [
      { id: signal.id, label: 'Market signal', summary: signal.summary, supportsRecommendation: true, weight: 35, owner: signal.sourceOfTruthOwner, entityType: 'signal', entityId: signal.id, sourceRoute: '/intelligence/signals', freshnessAt: signal.freshness, quality: 'derived' },
      { id: voc?.id ?? `voc-${recommendation.id}`, label: 'VOC', summary: voc?.summary ?? 'VOC source missing; keep recommendation in review mode.', supportsRecommendation: Boolean(voc), weight: 25, owner: 'Customer', entityType: 'customer', entityId: voc?.customerId ?? voc?.id ?? 'missing-voc', sourceRoute: '/customer/service', freshnessAt: 'today', quality: voc ? 'verified' : 'missing' },
      { id: forecast?.id ?? `forecast-${recommendation.id}`, label: 'COS guardrail', summary: forecast ? `${forecast.ats} ATS / ${forecast.demand7d} forecast` : 'Inventory guardrail missing.', supportsRecommendation: Boolean(forecast && riskLevel !== 'high'), weight: 40, owner: 'Inventory', entityType: 'sku', entityId: forecast?.skuId ?? campaign?.skuId ?? recommendation.id, sourceRoute: '/ecom/cos/inventory-brain', freshnessAt: 'live', quality: forecast ? 'verified' : 'missing' },
    ],
    rejectedAlternatives: [
      { option: 'Scale paid spend immediately', reason: riskLevel === 'high' ? 'Stock guardrail must clear first.' : 'Operator should approve message and CTA first.', evidenceIds: signalEvidenceIds },
    ],
    guardrails: [
      { owner: 'Inventory', message: forecast ? `${forecast.ats} ATS / ${forecast.demand7d} forecast` : 'Inventory proof missing.', blocking: riskLevel === 'high', entityId: forecast?.skuId },
      { owner: 'Demand', message: 'Human owner approval required before campaign execution.', blocking: false, entityId: campaign?.id },
    ],
    confidence,
    confidenceReason: `${confidence}% confidence from signal strength, VOC support, and COS guardrail freshness. Prime AI is not the source of truth.`,
    generatedBy: { runtime: 'hybrid', modelRunId: `run-${recommendation.id}`, promptVersion: 'prime-intelligence-v1' },
  };
  const feedback: RecommendationFeedback | undefined = hasOutcomeReadback ? {
    id: `feedback-${recommendation.id}`,
    recommendationId: recommendation.id,
    actorId: 'demand-owner-01',
    actorRole: 'Demand operator',
    decision: 'sent_to_demand',
    reason: 'Evidence package accepted after operator review.',
    evidenceIds: signalEvidenceIds,
    demandHandoffId: `handoff-${recommendation.id}`,
    createdAt: '8m ago',
    auditId: `audit-feedback-${recommendation.id}`,
  } : undefined;
  const actionOutcome: ActionOutcome | undefined = hasOutcomeReadback ? {
    id: `outcome-${recommendation.id}`,
    recommendationId: recommendation.id,
    handoffId: `handoff-${recommendation.id}`,
    sourceOfTruthOwner: 'Demand',
    readModelOwner: 'Intelligence',
    actionEntityType: 'campaign',
    actionEntityId: campaign?.id ?? recommendation.id,
    outcomeType: 'campaign_created',
    metrics: [
      { name: 'leads', value: campaign?.leads ?? 0, owner: 'Demand' },
      { name: 'rfqs', value: campaign?.rfqs ?? 0, owner: 'Demand' },
      { name: 'orders', value: campaign?.orders ?? 0, owner: 'OMS' },
    ],
    learningNote: campaign ? `${campaign.name} outcome is read back into Intelligence as learning evidence.` : 'Demand campaign outcome read back into Intelligence.',
    occurredAt: '8m ago',
    observedAt: 'now',
    auditIds: [`audit-outcome-${recommendation.id}`],
  } : undefined;
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
    recommendationEvidence,
    feedback,
    actionOutcome,
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
  const sourceOwner: SourceOwner = alert.area === 'Ecom Area' ? 'Inventory' : 'Demand';
  const sourceType: SignalCardSourceType = alert.area === 'Ecom Area' ? 'cos' : 'market';
  const signalId = `signal-${alert.id}`;
  const signalLineage: SignalLineage = {
    id: `lineage-${alert.id}`,
    signalId,
    inputs: [
      { owner: sourceOwner, entityType: 'domain_event', entityId: alert.linkedEntity, capturedAt: 'live', freshnessAt: 'live', quality: 'verified' },
    ],
    transforms: [
      { step: 'normalize', actor: 'system', ruleVersion: 'phase-5-alert-v1', outputHash: `norm-${alert.id}`, createdAt: 'live' },
      { step: 'recommend', actor: 'agent', modelRunId: `run-${alert.id}`, promptVersion: 'prime-intelligence-alert-v1', outputHash: `rec-${alert.id}`, createdAt: 'live' },
    ],
    auditIds: [`audit-${alert.id}`],
  };
  const linkedSignal: SignalCard = {
    id: signalId,
    title: alert.title,
    source: alert.area,
    sourceType,
    linkedEntityType: 'sku',
    linkedEntityId: alert.linkedEntity,
    summary: alert.linkedEntity,
    strength: confidence,
    freshness: 'live',
    riskLevel: alert.severity,
    evidenceIds: [alert.id],
    sourceOfTruthOwner: sourceOwner,
    readModelOwner: 'Intelligence',
    lineage: signalLineage,
  };
  const recommendationEvidence: RecommendationEvidence = {
    id: `evidence-${alert.id}`,
    recommendationId: alert.id,
    evidenceItems: [{
      id: alert.id,
      label: 'Alert',
      summary: alert.title,
      supportsRecommendation: true,
      weight: 100,
      owner: sourceOwner,
      entityType: 'domain_event',
      entityId: alert.linkedEntity,
      sourceRoute: alert.area === 'Ecom Area' ? '/ecom/cos/inventory-brain' : '/demand/campaigns',
      freshnessAt: 'live',
      quality: 'verified',
    }],
    rejectedAlternatives: [{ option: 'Send to Demand anyway', reason: 'Guardrail owner must clear blocker first.', evidenceIds: [alert.id] }],
    guardrails: [{ owner: sourceOwner, message: alert.title, blocking: alert.severity === 'high', entityId: alert.linkedEntity }],
    confidence,
    confidenceReason: 'Alert package confidence comes from source-domain guardrail state; Prime AI is not the source of truth.',
    generatedBy: { runtime: 'rule' },
  };

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
    recommendationEvidence,
    linkedSignals: [linkedSignal],
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
