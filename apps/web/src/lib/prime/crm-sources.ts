import type {
  PrimeCampaign,
  PrimeLead,
  PrimeRfq,
  PrimeSnapshot,
  PrimeSocialStream,
} from './prime-data';

export type CrmSourceType = 'marketplace' | 'social' | 'ads' | 'partner' | 'manual';
export type CrmSourceStatus = 'active' | 'inactive' | 'needs_review' | 'suppressed';
export type SourceActionLabel = 'Scale' | 'Test' | 'Fix' | 'Pause' | 'Review' | 'Route leads';

export interface CrmSourceFunction {
  id: CrmSourceType;
  label: string;
  description: string;
  children: string[];
}

export const SOURCE_FUNCTION_CATALOG: CrmSourceFunction[] = [
  {
    id: 'marketplace',
    label: 'Marketplace Source',
    description: 'Marketplace demand from storefronts, search intent, shop inquiries, and listing performance.',
    children: ['Amazon', 'Rakuten', 'Shopee', 'TikTok Shop', 'Other marketplaces'],
  },
  {
    id: 'social',
    label: 'Social Source',
    description: 'Organic and community signals from comments, inboxes, creator posts, and social listening.',
    children: ['Facebook', 'Instagram', 'TikTok', 'YouTube', 'LINE / community'],
  },
  {
    id: 'ads',
    label: 'Ads Source',
    description: 'Paid demand from ad accounts, UTM reports, retargeting, and sponsored placements.',
    children: ['Google Ads', 'Meta Ads', 'TikTok Ads', 'Marketplace Ads', 'Sponsored campaign'],
  },
  {
    id: 'partner',
    label: 'Partner Source',
    description: 'Referral and business-development demand from partners, affiliates, agencies, and creators.',
    children: ['Distributor', 'Agency', 'Affiliate', 'KOL / creator', 'Business partner'],
  },
  {
    id: 'manual',
    label: 'Manual Import',
    description: 'Operator-entered or imported demand lists that require batch traceability and dedupe review.',
    children: ['CSV upload', 'Sales team input', 'Event list', 'Offline contact', 'Legacy lead data'],
  },
];

export interface SourceTouchpoint {
  label: string;
  sourceId: string;
  campaignId?: string;
  confidence: number;
}

export interface CrmSource {
  id: string;
  name: string;
  type: CrmSourceType;
  status: CrmSourceStatus;
  ownerLabel: string;
  market: string;
  connectedChannel: string;
  ingestionMode: 'api' | 'crawler' | 'partner-feed' | 'manual' | 'derived';
  linkedCampaignIds: string[];
  linkedSkuIds: string[];
  linkedCategoryIds: string[];
  qualityScore: number;
  leadCount: number;
  rfqCount: number;
  signalVolume: number;
  campaignTraffic: number;
  conversionRate: number;
  rfqRate: number;
  duplicateRate: number;
  costPerQualifiedLead?: number;
  freshnessMinutes: number;
  lastSyncAt: string;
  nextAction: SourceActionLabel;
  nextActionRoute: string;
  actionReason: string;
  sourceSignal: string;
  productName: string;
  skuCode: string;
  inventoryRisk: 'low' | 'medium' | 'high' | 'unknown';
  financeRisk: 'low' | 'medium' | 'high' | 'unknown';
  scoreReasons: string[];
  blockers: string[];
  attribution: SourceTouchpoint[];
  importBatch?: {
    id: string;
    rows: number;
    owner: string;
    duplicateRate: number;
  };
}

export interface CrmSourcesOverview {
  totalActiveSources: number;
  totalLeads: number;
  totalRfqs: number;
  averageQualityScore: number;
  sourcesNeedingReview: number;
  topSource: CrmSource | null;
  weakestSource: CrmSource | null;
  typeMix: Array<{ type: CrmSourceType; count: number; quality: number }>;
  skuSignals: Array<{
    skuCode: string;
    productName: string;
    sourceScores: Array<{ sourceName: string; score: number; level: 'high' | 'medium' | 'low' }>;
  }>;
}

const SOURCE_TYPE_LABELS: Record<CrmSourceType, string> = {
  marketplace: 'Marketplace',
  social: 'Social',
  ads: 'Ads',
  partner: 'Partner',
  manual: 'Manual',
};

export function getCrmSourceTypeLabel(type: CrmSourceType) {
  return SOURCE_TYPE_LABELS[type];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function percent(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function classifySourceType(label: string, ingestionMode?: PrimeSocialStream['ingestionMode']): CrmSourceType {
  const normalized = label.toLowerCase();
  if (ingestionMode === 'partner-feed') return 'partner';
  if (normalized.includes('rakuten') || normalized.includes('amazon') || normalized.includes('shopee') || normalized.includes('marketplace')) {
    return 'marketplace';
  }
  if (normalized.includes('ads') || normalized.includes('meta') || normalized.includes('google') || normalized.includes('sponsored') || normalized.includes('retargeting')) {
    return 'ads';
  }
  if (normalized.includes('partner') || normalized.includes('distributor') || normalized.includes('affiliate')) {
    return 'partner';
  }
  if (normalized.includes('csv') || normalized.includes('manual') || normalized.includes('import')) {
    return 'manual';
  }
  return 'social';
}

function getOwner(type: CrmSourceType, index: number) {
  const owners: Record<CrmSourceType, string[]> = {
    marketplace: ['Japan marketplace team', 'CRM marketplace owner'],
    social: ['CRM social operator', 'Creator commerce owner'],
    ads: ['Growth team', 'Paid acquisition owner'],
    partner: ['BD team', 'Partner source owner'],
    manual: ['Sales ops', 'Import owner'],
  };
  const pool = owners[type];
  return pool[index % pool.length];
}

function getMarket(label: string) {
  const normalized = label.toLowerCase();
  if (normalized.includes('vn') || normalized.includes('zalo')) return 'Vietnam';
  if (normalized.includes('rakuten') || normalized.includes('jp')) return 'Japan';
  if (normalized.includes('amazon')) return 'US / JP';
  return 'Regional';
}

function campaignProduct(snapshot: PrimeSnapshot, campaign?: PrimeCampaign) {
  const product = snapshot.products.find((item) => item.id === campaign?.productId);
  return {
    productName: product?.name || 'Unassigned SKU route',
    category: product?.category || 'Unmapped category',
    skuCode: campaign?.skuCode || product?.sku_code || 'Unmapped SKU',
  };
}

function forecastRisk(snapshot: PrimeSnapshot, skuId?: string) {
  if (!skuId) return 'unknown' as const;
  return snapshot.forecasts.find((forecast) => forecast.skuId === skuId)?.risk || 'unknown';
}

function financeRisk(campaign?: PrimeCampaign) {
  if (!campaign) return 'unknown' as const;
  const roas = campaign.spend ? campaign.revenue / campaign.spend : 0;
  if (roas < 1.8) return 'high';
  if (roas < 2.6) return 'medium';
  return 'low';
}

function linkedLeads(leads: PrimeLead[], campaignId?: string) {
  if (!campaignId) return [];
  return leads.filter((lead) => lead.campaignId === campaignId);
}

function linkedRfqs(rfqs: PrimeRfq[], leads: PrimeLead[]) {
  const leadIds = new Set(leads.map((lead) => lead.id));
  return rfqs.filter((rfq) => leadIds.has(rfq.leadId));
}

function scoreSource(input: {
  streamStatus?: PrimeSocialStream['status'];
  signalVolume: number;
  leadCount: number;
  rfqCount: number;
  campaignTraffic: number;
  freshnessMinutes: number;
  duplicateRate: number;
  inventoryRisk: CrmSource['inventoryRisk'];
  financeRisk: CrmSource['financeRisk'];
}) {
  const leadRate = input.campaignTraffic ? input.leadCount / input.campaignTraffic : input.signalVolume ? input.leadCount / input.signalVolume : 0;
  const rfqRate = input.leadCount ? input.rfqCount / input.leadCount : 0;
  const freshnessScore = input.freshnessMinutes <= 10 ? 12 : input.freshnessMinutes <= 30 ? 8 : 3;
  const statusScore = input.streamStatus === 'lagging' ? -12 : input.streamStatus === 'watch' ? -4 : 8;
  const duplicatePenalty = Math.round(input.duplicateRate / 2);
  const inventoryPenalty = input.inventoryRisk === 'high' ? 18 : input.inventoryRisk === 'medium' ? 8 : 0;
  const financePenalty = input.financeRisk === 'high' ? 12 : input.financeRisk === 'medium' ? 5 : 0;
  const score = clamp(
    Math.round(52 + leadRate * 240 + rfqRate * 90 + freshnessScore + statusScore - duplicatePenalty - inventoryPenalty - financePenalty),
    24,
    96,
  );

  const reasons = [
    `${percent(input.leadCount, input.campaignTraffic || input.signalVolume)}% lead conversion signal`,
    `${percent(input.rfqCount, input.leadCount)}% lead-to-RFQ readiness`,
    input.freshnessMinutes <= 10 ? 'Fresh source signal' : 'Source freshness needs watch',
  ];
  const blockers: string[] = [];
  if (input.inventoryRisk === 'high') blockers.push('Linked SKU has high inventory risk');
  if (input.financeRisk === 'high') blockers.push('Campaign economics need Finance review');
  if (input.duplicateRate >= 14) blockers.push('Duplicate risk is above review threshold');
  if (input.streamStatus === 'lagging') blockers.push('Source is lagging or stale');

  return { score, reasons, blockers };
}

function actionForSource(input: {
  score: number;
  blockers: string[];
  leadCount: number;
  rfqCount: number;
  type: CrmSourceType;
  streamStatus?: PrimeSocialStream['status'];
}) {
  if (input.blockers.length > 0 && input.blockers.some((blocker) => blocker.includes('inventory') || blocker.includes('Finance'))) {
    return {
      label: 'Review' as const,
      route: input.blockers.some((blocker) => blocker.includes('Finance')) ? '/finance/fin-support?tab=overview' : '/ecom/cos/inventory-brain',
      reason: input.blockers[0],
    };
  }
  if (input.streamStatus === 'lagging' || input.score < 58) {
    return {
      label: 'Fix' as const,
      route: '/crm/content-social',
      reason: 'Fix creative, CTA, or source mapping before spending more effort.',
    };
  }
  if (input.rfqCount >= 8 && input.score >= 78) {
    return {
      label: 'Scale' as const,
      route: '/crm/campaigns',
      reason: 'RFQ quality and source score are high enough for controlled scale.',
    };
  }
  if (input.leadCount >= 40 && input.rfqCount < 8) {
    return {
      label: 'Route leads' as const,
      route: '/crm/leads-rfqs',
      reason: 'Lead volume is present; route qualification before campaign scale.',
    };
  }
  return {
    label: input.type === 'partner' ? 'Review' : 'Test',
    route: input.type === 'partner' ? '/crm/leads-rfqs' : '/crm/campaigns',
    reason: 'Run a controlled test and preserve source lineage.',
  } as const;
}

function statusForSource(score: number, blockers: string[], streamStatus?: PrimeSocialStream['status']): CrmSourceStatus {
  if (blockers.some((blocker) => blocker.includes('stale') || blocker.includes('Duplicate'))) return 'needs_review';
  if (streamStatus === 'lagging' || score < 52) return 'needs_review';
  return 'active';
}

function buildFromStream(snapshot: PrimeSnapshot, stream: PrimeSocialStream, index: number): CrmSource {
  const campaign = snapshot.campaigns[index % Math.max(snapshot.campaigns.length, 1)];
  const leads = linkedLeads(snapshot.leads, campaign?.id);
  const rfqs = linkedRfqs(snapshot.rfqs, leads);
  const type = classifySourceType(stream.source, stream.ingestionMode);
  const product = campaignProduct(snapshot, campaign);
  const inventoryRisk = forecastRisk(snapshot, campaign?.skuId);
  const campaignFinanceRisk = financeRisk(campaign);
  const duplicateRate = clamp(stream.status === 'lagging' ? 18 : stream.status === 'watch' ? 11 : 5 + index * 2, 3, 22);
  const { score, reasons, blockers } = scoreSource({
    streamStatus: stream.status,
    signalVolume: stream.eventVolume,
    leadCount: leads.length || campaign?.leads || 0,
    rfqCount: rfqs.length || campaign?.rfqs || 0,
    campaignTraffic: campaign?.traffic || stream.eventVolume,
    freshnessMinutes: stream.freshnessMinutes,
    duplicateRate,
    inventoryRisk,
    financeRisk: campaignFinanceRisk,
  });
  const action = actionForSource({
    score,
    blockers,
    leadCount: leads.length || campaign?.leads || 0,
    rfqCount: rfqs.length || campaign?.rfqs || 0,
    type,
    streamStatus: stream.status,
  });

  return {
    id: `source_${stream.id}`,
    name: stream.source,
    type,
    status: statusForSource(score, blockers, stream.status),
    ownerLabel: getOwner(type, index),
    market: getMarket(stream.source),
    connectedChannel: stream.source.split('/')[0].trim(),
    ingestionMode: stream.ingestionMode,
    linkedCampaignIds: campaign ? [campaign.id] : [],
    linkedSkuIds: campaign ? [campaign.skuId] : [],
    linkedCategoryIds: [product.category],
    qualityScore: score,
    leadCount: leads.length || campaign?.leads || 0,
    rfqCount: rfqs.length || campaign?.rfqs || 0,
    signalVolume: stream.eventVolume,
    campaignTraffic: campaign?.traffic || 0,
    conversionRate: percent(leads.length || campaign?.leads || 0, campaign?.traffic || stream.eventVolume),
    rfqRate: percent(rfqs.length || campaign?.rfqs || 0, leads.length || campaign?.leads || 0),
    duplicateRate,
    costPerQualifiedLead: campaign?.leads ? Math.round(campaign.spend / campaign.leads) : undefined,
    freshnessMinutes: stream.freshnessMinutes,
    lastSyncAt: `${stream.freshnessMinutes}m ago`,
    nextAction: action.label,
    nextActionRoute: action.route,
    actionReason: action.reason,
    sourceSignal: stream.audienceSignal,
    productName: product.productName,
    skuCode: product.skuCode,
    inventoryRisk,
    financeRisk: campaignFinanceRisk,
    scoreReasons: reasons,
    blockers,
    attribution: [
      { label: 'First touch', sourceId: stream.id, campaignId: campaign?.id, confidence: clamp(score - 8, 50, 94) },
      { label: 'Last touch', sourceId: stream.id, campaignId: campaign?.id, confidence: clamp(score - 2, 50, 96) },
    ],
  };
}

function buildFromCampaign(snapshot: PrimeSnapshot, campaign: PrimeCampaign, index: number): CrmSource {
  const leads = linkedLeads(snapshot.leads, campaign.id);
  const rfqs = linkedRfqs(snapshot.rfqs, leads);
  const type = classifySourceType(campaign.channel);
  const product = campaignProduct(snapshot, campaign);
  const inventoryRisk = forecastRisk(snapshot, campaign.skuId);
  const campaignFinanceRisk = financeRisk(campaign);
  const duplicateRate = clamp(campaign.status === 'testing' ? 12 : 6 + index, 4, 18);
  const { score, reasons, blockers } = scoreSource({
    signalVolume: campaign.traffic,
    leadCount: leads.length || campaign.leads,
    rfqCount: rfqs.length || campaign.rfqs,
    campaignTraffic: campaign.traffic,
    freshnessMinutes: 15 + index * 7,
    duplicateRate,
    inventoryRisk,
    financeRisk: campaignFinanceRisk,
  });
  const action = actionForSource({
    score,
    blockers,
    leadCount: leads.length || campaign.leads,
    rfqCount: rfqs.length || campaign.rfqs,
    type,
  });

  return {
    id: `source_campaign_${campaign.id}`,
    name: campaign.channel,
    type,
    status: campaign.status === 'paused' ? 'inactive' : statusForSource(score, blockers),
    ownerLabel: getOwner(type, index + 2),
    market: getMarket(campaign.channel),
    connectedChannel: campaign.channel,
    ingestionMode: 'derived',
    linkedCampaignIds: [campaign.id],
    linkedSkuIds: [campaign.skuId],
    linkedCategoryIds: [product.category],
    qualityScore: score,
    leadCount: leads.length || campaign.leads,
    rfqCount: rfqs.length || campaign.rfqs,
    signalVolume: campaign.traffic,
    campaignTraffic: campaign.traffic,
    conversionRate: percent(leads.length || campaign.leads, campaign.traffic),
    rfqRate: percent(rfqs.length || campaign.rfqs, leads.length || campaign.leads),
    duplicateRate,
    costPerQualifiedLead: campaign.leads ? Math.round(campaign.spend / campaign.leads) : undefined,
    freshnessMinutes: 15 + index * 7,
    lastSyncAt: `${15 + index * 7}m ago`,
    nextAction: action.label,
    nextActionRoute: action.route,
    actionReason: action.reason,
    sourceSignal: `${campaign.targetSegment} source generated ${campaign.leads} leads and ${campaign.rfqs} RFQs.`,
    productName: product.productName,
    skuCode: product.skuCode,
    inventoryRisk,
    financeRisk: campaignFinanceRisk,
    scoreReasons: reasons,
    blockers,
    attribution: [
      { label: 'Campaign source', sourceId: campaign.id, campaignId: campaign.id, confidence: clamp(score, 50, 96) },
      { label: 'RFQ readback', sourceId: campaign.id, campaignId: campaign.id, confidence: clamp(score - 5, 50, 92) },
    ],
  };
}

function buildManualImportSource(snapshot: PrimeSnapshot): CrmSource {
  const leads = snapshot.leads.slice(0, 6);
  const rfqs = linkedRfqs(snapshot.rfqs, leads);
  const duplicateRate = 16;
  const { score, reasons, blockers } = scoreSource({
    signalVolume: 42,
    leadCount: leads.length,
    rfqCount: rfqs.length,
    campaignTraffic: 42,
    freshnessMinutes: 74,
    duplicateRate,
    inventoryRisk: 'unknown',
    financeRisk: 'unknown',
  });
  const action = actionForSource({
    score,
    blockers,
    leadCount: leads.length,
    rfqCount: rfqs.length,
    type: 'manual',
  });

  return {
    id: 'source_manual_event_import',
    name: 'Event list / CSV import',
    type: 'manual',
    status: 'needs_review',
    ownerLabel: 'Sales ops',
    market: 'Regional',
    connectedChannel: 'Manual upload',
    ingestionMode: 'manual',
    linkedCampaignIds: [],
    linkedSkuIds: [],
    linkedCategoryIds: ['Imported leads'],
    qualityScore: score,
    leadCount: leads.length,
    rfqCount: rfqs.length,
    signalVolume: 42,
    campaignTraffic: 0,
    conversionRate: percent(leads.length, 42),
    rfqRate: percent(rfqs.length, leads.length),
    duplicateRate,
    freshnessMinutes: 74,
    lastSyncAt: '74m ago',
    nextAction: action.label,
    nextActionRoute: action.route,
    actionReason: action.reason,
    sourceSignal: 'Manual import needs dedupe and owner confirmation before routing.',
    productName: 'Mixed imported interest',
    skuCode: 'Mixed',
    inventoryRisk: 'unknown',
    financeRisk: 'unknown',
    scoreReasons: reasons,
    blockers: blockers.length ? blockers : ['Manual import requires batch review'],
    attribution: [
      { label: 'Import batch', sourceId: 'manual_import_batch_001', confidence: 68 },
      { label: 'Manual override available', sourceId: 'manual_import_batch_001', confidence: 55 },
    ],
    importBatch: {
      id: 'manual_import_batch_001',
      rows: 42,
      owner: 'Sales ops',
      duplicateRate,
    },
  };
}

export function buildCrmSources(snapshot: PrimeSnapshot): CrmSource[] {
  const streamSources = snapshot.socialStreams.map((stream, index) => buildFromStream(snapshot, stream, index));
  const campaignSources = snapshot.campaigns.map((campaign, index) => buildFromCampaign(snapshot, campaign, index));
  return [...streamSources, ...campaignSources, buildManualImportSource(snapshot)].sort((a, b) => b.qualityScore - a.qualityScore);
}

export function buildCrmSourcesOverview(sources: CrmSource[]): CrmSourcesOverview {
  const activeSources = sources.filter((source) => source.status === 'active');
  const totalLeads = sources.reduce((sum, source) => sum + source.leadCount, 0);
  const totalRfqs = sources.reduce((sum, source) => sum + source.rfqCount, 0);
  const averageQualityScore = sources.length
    ? Math.round(sources.reduce((sum, source) => sum + source.qualityScore, 0) / sources.length)
    : 0;
  const sourcesNeedingReview = sources.filter((source) => source.status === 'needs_review' || source.blockers.length > 0).length;
  const topSource = sources[0] || null;
  const weakestSource = [...sources].sort((a, b) => a.qualityScore - b.qualityScore)[0] || null;
  const typeMix = (['marketplace', 'social', 'ads', 'partner', 'manual'] as CrmSourceType[]).map((type) => {
    const typedSources = sources.filter((source) => source.type === type);
    return {
      type,
      count: typedSources.length,
      quality: typedSources.length
        ? Math.round(typedSources.reduce((sum, source) => sum + source.qualityScore, 0) / typedSources.length)
        : 0,
    };
  });

  const skuCodes = Array.from(new Set(sources.flatMap((source) => source.skuCode === 'Mixed' ? [] : [source.skuCode]))).slice(0, 5);
  const skuSignals = skuCodes.map((skuCode) => {
    const sourceMatches = sources
      .filter((source) => source.skuCode === skuCode)
      .slice(0, 4)
      .map((source) => ({
        sourceName: source.name,
        score: source.qualityScore,
        level: source.qualityScore >= 78 ? 'high' as const : source.qualityScore >= 60 ? 'medium' as const : 'low' as const,
      }));
    const productName = sources.find((source) => source.skuCode === skuCode)?.productName || 'SKU route';
    return { skuCode, productName, sourceScores: sourceMatches };
  });

  return {
    totalActiveSources: activeSources.length,
    totalLeads,
    totalRfqs,
    averageQualityScore,
    sourcesNeedingReview,
    topSource,
    weakestSource,
    typeMix,
    skuSignals,
  };
}
