import {
  SOURCE_FUNCTION_CATALOG,
  buildDemandSources,
  type DemandSource,
} from './demand-sources';
import type {
  PrimeCampaign,
  PrimeLead,
  PrimeRfq,
  PrimeSnapshot,
} from './prime-data';

export type MarketplaceSourcePage =
  | 'overview'
  | 'accounts'
  | 'demand-signals'
  | 'product-sku-signals'
  | 'inquiry-lead-intake'
  | 'campaign-attribution'
  | 'source-quality'
  | 'data-health'
  | 'detail';

export type MarketplaceName =
  | 'Amazon'
  | 'Rakuten'
  | 'Shopee'
  | 'TikTok Shop'
  | 'Other marketplaces';

export type MarketplaceSignalType =
  | 'search_trend'
  | 'product_view'
  | 'add_to_cart'
  | 'wishlist'
  | 'inquiry'
  | 'buyer_behavior'
  | 'campaign_click'
  | 'order_readback';

export const MARKETPLACE_SOURCE_PAGES: Array<{
  id: MarketplaceSourcePage;
  label: string;
  description: string;
}> = [
  { id: 'overview', label: 'Overview', description: 'Marketplace demand health, top action, and source quality.' },
  { id: 'accounts', label: 'Marketplace Accounts', description: 'Account, storefront, owner, sync, and marketplace connection status.' },
  { id: 'demand-signals', label: 'Demand Signals', description: 'Normalized search, view, cart, inquiry, and buyer behavior signals.' },
  { id: 'product-sku-signals', label: 'Product / SKU Signals', description: 'SKU demand, listing performance, price fit, and stock risk.' },
  { id: 'inquiry-lead-intake', label: 'Inquiry & Lead Intake', description: 'Marketplace inquiries becoming qualified leads or RFQs.' },
  { id: 'campaign-attribution', label: 'Campaign Attribution', description: 'Marketplace campaign source, promotion, and RFQ readback preview.' },
  { id: 'source-quality', label: 'Source Quality', description: 'Quality scoring, blockers, duplicate risk, and recommended action.' },
  { id: 'data-health', label: 'Data Health', description: 'Sync freshness, missing data, mapping issues, and reconciliation.' },
  { id: 'detail', label: 'Marketplace Detail', description: 'Full marketplace source, account, SKU, quality, and attribution drill-down.' },
];

const MARKETPLACES: MarketplaceName[] = ['Amazon', 'Rakuten', 'Shopee', 'TikTok Shop', 'Other marketplaces'];
const MARKETPLACE_SOURCE_CATALOG = SOURCE_FUNCTION_CATALOG.find((item) => item.id === 'marketplace');

export interface MarketplaceAccount {
  id: string;
  marketplace: MarketplaceName;
  accountName: string;
  storefrontName: string;
  market: string;
  ownerLabel: string;
  status: 'active' | 'needs_review' | 'inactive' | 'stale';
  ingestionMode: DemandSource['ingestionMode'];
  lastSyncAt: string;
  freshnessMinutes: number;
  linkedSkuCount: number;
  signalVolume: number;
  leadCount: number;
  rfqCount: number;
  sourceIds: string[];
  blockers: string[];
}

export interface MarketplaceDemandSignal {
  id: string;
  signalType: MarketplaceSignalType;
  marketplace: MarketplaceName;
  accountId: string;
  sourceId: string;
  skuCode: string;
  productName: string;
  volume: number;
  confidence: number;
  freshnessMinutes: number;
  linkedCampaignId?: string;
  recommendedAction: DemandSource['nextAction'];
}

export interface MarketplaceSkuSignal {
  id: string;
  skuCode: string;
  productName: string;
  category: string;
  marketplace: MarketplaceName;
  listingPerformance: number;
  demandSignal: number;
  priceCompetitiveness: number;
  inventoryRisk: DemandSource['inventoryRisk'];
  financeRisk: DemandSource['financeRisk'];
  linkedSourceIds: string[];
  isMapped: boolean;
}

export interface MarketplaceInquiry {
  id: string;
  marketplace: MarketplaceName;
  accountId: string;
  sourceId: string;
  buyerLabel: string;
  summary: string;
  skuCode: string;
  intent: 'low' | 'medium' | 'high';
  leadScore: number;
  rfqReadiness: number;
  slaAgeHours: number;
  ownerLabel: string;
  status: 'new' | 'needs_qualification' | 'routed' | 'converted_to_rfq' | 'duplicate' | 'suppressed';
}

export interface MarketplaceCampaignAttribution {
  id: string;
  campaignId: string;
  campaignName: string;
  marketplace: MarketplaceName;
  sourceId: string;
  touchpoints: Array<{ label: string; confidence: number }>;
  leads: number;
  rfqs: number;
  orders: number;
  revenue: number;
  attributionConfidence: number;
}

export interface MarketplaceDataHealthItem {
  id: string;
  accountId: string;
  marketplace: MarketplaceName;
  ingestionMode: DemandSource['ingestionMode'];
  status: 'healthy' | 'stale' | 'failed' | 'mapping_issue' | 'duplicate_risk';
  lastSyncAt: string;
  freshnessMinutes: number;
  rowCount: number;
  errorCount: number;
  duplicateRate: number;
  unmappedListingCount: number;
  unmappedSkuCount: number;
  ownerLabel: string;
  actionLabel: 'Review' | 'Reconnect' | 'Map SKUs' | 'Dedupe' | 'Open detail';
}

export interface MarketplaceSourceSnapshot {
  page: MarketplaceSourcePage;
  sources: DemandSource[];
  accounts: MarketplaceAccount[];
  demandSignals: MarketplaceDemandSignal[];
  skuSignals: MarketplaceSkuSignal[];
  inquiries: MarketplaceInquiry[];
  attribution: MarketplaceCampaignAttribution[];
  dataHealth: MarketplaceDataHealthItem[];
  selectedSource: DemandSource | null;
  overview: {
    totalMarketplaceSources: number;
    activeMarketplaces: number;
    totalMarketplaceLeads: number;
    totalRfqs: number;
    topDemandMarketplace: MarketplaceName | 'None';
    marketplaceSourceQualityScore: number;
    sourcesNeedingReview: number;
    totalSignalVolume: number;
    staleFeeds: number;
    unmappedSkuCount: number;
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function percent(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function average(values: number[]) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function getMarketplaceSourcePage(value: string | null): MarketplaceSourcePage {
  if (MARKETPLACE_SOURCE_PAGES.some((page) => page.id === value)) {
    return value as MarketplaceSourcePage;
  }
  return 'overview';
}

export function getMarketplaceSourcePageHref(page: MarketplaceSourcePage, sourceId?: string) {
  const params = new URLSearchParams({ function: 'marketplace', page });
  if (sourceId) params.set('sourceId', sourceId);
  return `/demand/sources?${params.toString()}`;
}

export function getMarketplaceSourcePageMeta(page: MarketplaceSourcePage) {
  return MARKETPLACE_SOURCE_PAGES.find((item) => item.id === page) || MARKETPLACE_SOURCE_PAGES[0];
}

function marketplaceForSource(source: DemandSource, index = 0): MarketplaceName {
  const normalized = `${source.name} ${source.connectedChannel}`.toLowerCase();
  if (normalized.includes('amazon')) return 'Amazon';
  if (normalized.includes('rakuten')) return 'Rakuten';
  if (normalized.includes('shopee')) return 'Shopee';
  if (normalized.includes('tiktok')) return 'TikTok Shop';
  return MARKETPLACES[index % MARKETPLACES.length] || 'Other marketplaces';
}

function accountId(marketplace: MarketplaceName) {
  return `marketplace_account_${slug(marketplace)}`;
}

function sourceAccountName(marketplace: MarketplaceName) {
  const labels: Record<MarketplaceName, string> = {
    Amazon: 'Amazon marketplace account',
    Rakuten: 'Rakuten storefront account',
    Shopee: 'Shopee regional shop',
    'TikTok Shop': 'TikTok Shop commerce account',
    'Other marketplaces': 'Other marketplace account',
  };
  return labels[marketplace];
}

function accountStatus(source: DemandSource | undefined): MarketplaceAccount['status'] {
  if (!source) return 'inactive';
  if (source.freshnessMinutes > 60) return 'stale';
  if (source.status === 'needs_review' || source.blockers.length > 0) return 'needs_review';
  return source.status === 'active' ? 'active' : 'inactive';
}

function buildAccounts(sources: DemandSource[]): MarketplaceAccount[] {
  return MARKETPLACES.map((marketplace) => {
    const sourceMatches = sources.filter((source, index) => marketplaceForSource(source, index) === marketplace);
    const primarySource = sourceMatches[0];
    const blockers = sourceMatches.flatMap((source) => source.blockers);
    const inferredBlockers = primarySource ? blockers : ['No connected marketplace source yet'];
    const status = accountStatus(primarySource);

    return {
      id: accountId(marketplace),
      marketplace,
      accountName: sourceAccountName(marketplace),
      storefrontName: primarySource?.connectedChannel || `${marketplace} storefront`,
      market: primarySource?.market || (marketplace === 'Rakuten' ? 'Japan' : marketplace === 'Shopee' || marketplace === 'TikTok Shop' ? 'SEA' : 'Regional'),
      ownerLabel: primarySource?.ownerLabel || 'Unassigned marketplace owner',
      status,
      ingestionMode: primarySource?.ingestionMode || 'derived',
      lastSyncAt: primarySource?.lastSyncAt || 'Not connected',
      freshnessMinutes: primarySource?.freshnessMinutes ?? 999,
      linkedSkuCount: new Set(sourceMatches.flatMap((source) => source.linkedSkuIds)).size,
      signalVolume: sourceMatches.reduce((sum, source) => sum + source.signalVolume, 0),
      leadCount: sourceMatches.reduce((sum, source) => sum + source.leadCount, 0),
      rfqCount: sourceMatches.reduce((sum, source) => sum + source.rfqCount, 0),
      sourceIds: sourceMatches.map((source) => source.id),
      blockers: inferredBlockers,
    };
  });
}

function signalTypesForSource(source: DemandSource): MarketplaceSignalType[] {
  const base: MarketplaceSignalType[] = ['search_trend', 'product_view', 'inquiry', 'buyer_behavior'];
  if (source.campaignTraffic > 0) base.push('campaign_click');
  if (source.rfqCount > 0) base.push('order_readback');
  return base.slice(0, 5);
}

function buildDemandSignals(sources: DemandSource[]): MarketplaceDemandSignal[] {
  return sources.flatMap((source, sourceIndex) => {
    const marketplace = marketplaceForSource(source, sourceIndex);
    const baseVolume = Math.max(1, Math.round(source.signalVolume / 5));
    return signalTypesForSource(source).map((signalType, signalIndex) => ({
      id: `marketplace_signal_${source.id}_${signalType}`,
      signalType,
      marketplace,
      accountId: accountId(marketplace),
      sourceId: source.id,
      skuCode: source.skuCode,
      productName: source.productName,
      volume: Math.max(1, baseVolume - signalIndex * Math.max(1, Math.round(baseVolume * 0.15))),
      confidence: clamp(source.qualityScore - signalIndex * 4, 42, 96),
      freshnessMinutes: source.freshnessMinutes + signalIndex * 3,
      linkedCampaignId: source.linkedCampaignIds[0],
      recommendedAction: source.nextAction,
    }));
  });
}

function buildSkuSignals(sources: DemandSource[]): MarketplaceSkuSignal[] {
  const grouped = new Map<string, DemandSource[]>();
  for (const source of sources) {
    const key = source.skuCode === 'Mixed' ? `unmapped_${source.id}` : source.skuCode;
    grouped.set(key, [...(grouped.get(key) || []), source]);
  }

  return Array.from(grouped.entries()).map(([key, sourceMatches], index) => {
    const primarySource = sourceMatches[0];
    const marketplace = marketplaceForSource(primarySource, index);
    const isMapped = !key.startsWith('unmapped_') && primarySource.skuCode !== 'Unmapped SKU';

    return {
      id: `marketplace_sku_${slug(key)}`,
      skuCode: isMapped ? primarySource.skuCode : 'Unmapped marketplace SKU',
      productName: isMapped ? primarySource.productName : 'Unmapped marketplace listing',
      category: primarySource.linkedCategoryIds[0] || 'Marketplace category',
      marketplace,
      listingPerformance: clamp(average(sourceMatches.map((source) => source.qualityScore + 5)), 20, 100),
      demandSignal: sourceMatches.reduce((sum, source) => sum + source.signalVolume, 0),
      priceCompetitiveness: clamp(100 - average(sourceMatches.map((source) => source.duplicateRate + (source.financeRisk === 'high' ? 22 : source.financeRisk === 'medium' ? 10 : 0))), 25, 100),
      inventoryRisk: primarySource.inventoryRisk,
      financeRisk: primarySource.financeRisk,
      linkedSourceIds: sourceMatches.map((source) => source.id),
      isMapped,
    };
  });
}

function linkedLeadRecords(source: DemandSource, leads: PrimeLead[]) {
  const campaignIds = new Set(source.linkedCampaignIds);
  return leads.filter((lead) => campaignIds.has(lead.campaignId));
}

function linkedRfqRecords(source: DemandSource, leads: PrimeLead[], rfqs: PrimeRfq[]) {
  const leadIds = new Set(linkedLeadRecords(source, leads).map((lead) => lead.id));
  return rfqs.filter((rfq) => leadIds.has(rfq.leadId));
}

function inquiryStatus(source: DemandSource, index: number): MarketplaceInquiry['status'] {
  if (source.duplicateRate >= 14) return 'duplicate';
  if (source.rfqCount > 0) return 'converted_to_rfq';
  if (source.leadCount > 0) return index % 2 === 0 ? 'routed' : 'needs_qualification';
  return 'new';
}

function buildInquiries(sources: DemandSource[], leads: PrimeLead[], rfqs: PrimeRfq[]): MarketplaceInquiry[] {
  return sources.flatMap((source, sourceIndex) => {
    const marketplace = marketplaceForSource(source, sourceIndex);
    const linkedLeads = linkedLeadRecords(source, leads);
    const linkedRfqs = linkedRfqRecords(source, leads, rfqs);
    const leadRows = linkedLeads.length ? linkedLeads : Array.from({ length: Math.min(2, Math.max(1, source.leadCount || 1)) }, (_, index) => ({
      id: `${source.id}_derived_lead_${index}`,
      company: index === 0 ? `${marketplace} buyer desk` : `${source.market} marketplace buyer`,
      score: clamp(source.qualityScore - index * 6, 30, 96),
    }));

    return leadRows.slice(0, 3).map((lead, index) => ({
      id: `marketplace_inquiry_${source.id}_${lead.id}`,
      marketplace,
      accountId: accountId(marketplace),
      sourceId: source.id,
      buyerLabel: 'company' in lead ? lead.company : `${marketplace} buyer`,
      summary: `${source.productName} inquiry from ${source.name}; ${source.actionReason}`,
      skuCode: source.skuCode,
      intent: linkedRfqs.length || source.rfqCount > 0 ? 'high' : source.leadCount > 8 ? 'medium' : 'low',
      leadScore: clamp(('score' in lead ? lead.score : source.qualityScore) + (linkedRfqs.length ? 6 : 0), 20, 99),
      rfqReadiness: clamp(source.rfqRate || percent(source.rfqCount, source.leadCount), 0, 100),
      slaAgeHours: 2 + sourceIndex * 3 + index * 5,
      ownerLabel: source.ownerLabel,
      status: inquiryStatus(source, index),
    }));
  });
}

function campaignForSource(source: DemandSource, campaigns: PrimeCampaign[]) {
  return campaigns.find((campaign) => source.linkedCampaignIds.includes(campaign.id));
}

function buildAttribution(sources: DemandSource[], campaigns: PrimeCampaign[]): MarketplaceCampaignAttribution[] {
  return sources.map((source, index) => {
    const campaign = campaignForSource(source, campaigns);
    const marketplace = marketplaceForSource(source, index);
    return {
      id: `marketplace_attribution_${source.id}`,
      campaignId: campaign?.id || source.linkedCampaignIds[0] || `campaign_${source.id}`,
      campaignName: campaign?.name || `${marketplace} source readback`,
      marketplace,
      sourceId: source.id,
      touchpoints: source.attribution.map((touchpoint) => ({
        label: touchpoint.label,
        confidence: touchpoint.confidence,
      })),
      leads: source.leadCount,
      rfqs: source.rfqCount,
      orders: campaign?.orders || Math.max(0, Math.round(source.rfqCount * 0.8)),
      revenue: campaign?.revenue || Math.max(0, source.rfqCount * 120000),
      attributionConfidence: average(source.attribution.map((touchpoint) => touchpoint.confidence)),
    };
  });
}

function dataHealthStatus(account: MarketplaceAccount): MarketplaceDataHealthItem['status'] {
  if (account.status === 'inactive') return 'failed';
  if (account.freshnessMinutes > 60 || account.status === 'stale') return 'stale';
  if (account.blockers.some((blocker) => blocker.toLowerCase().includes('duplicate'))) return 'duplicate_risk';
  if (!account.linkedSkuCount) return 'mapping_issue';
  return 'healthy';
}

function dataHealthAction(status: MarketplaceDataHealthItem['status']): MarketplaceDataHealthItem['actionLabel'] {
  if (status === 'failed') return 'Reconnect';
  if (status === 'stale') return 'Review';
  if (status === 'mapping_issue') return 'Map SKUs';
  if (status === 'duplicate_risk') return 'Dedupe';
  return 'Open detail';
}

function buildDataHealth(accounts: MarketplaceAccount[]): MarketplaceDataHealthItem[] {
  return accounts.map((account) => {
    const status = dataHealthStatus(account);
    const duplicateBlocker = account.blockers.some((blocker) => blocker.toLowerCase().includes('duplicate'));
    return {
      id: `marketplace_health_${account.id}`,
      accountId: account.id,
      marketplace: account.marketplace,
      ingestionMode: account.ingestionMode,
      status,
      lastSyncAt: account.lastSyncAt,
      freshnessMinutes: account.freshnessMinutes,
      rowCount: account.signalVolume + account.leadCount + account.rfqCount,
      errorCount: status === 'healthy' ? 0 : Math.max(1, account.blockers.length),
      duplicateRate: duplicateBlocker ? 18 : account.status === 'inactive' ? 0 : 6,
      unmappedListingCount: account.linkedSkuCount ? 0 : 1,
      unmappedSkuCount: account.linkedSkuCount ? 0 : 1,
      ownerLabel: account.ownerLabel,
      actionLabel: dataHealthAction(status),
    };
  });
}

function activeMarketplaceCount(accounts: MarketplaceAccount[]) {
  return accounts.filter((account) => account.status === 'active' || account.status === 'needs_review').length;
}

function topMarketplace(accounts: MarketplaceAccount[]): MarketplaceName | 'None' {
  const top = [...accounts].sort((left, right) => (
    right.signalVolume + right.leadCount * 50 + right.rfqCount * 120
  ) - (
    left.signalVolume + left.leadCount * 50 + left.rfqCount * 120
  ))[0];
  return top && top.signalVolume + top.leadCount + top.rfqCount > 0 ? top.marketplace : 'None';
}

export function buildMarketplaceSourceSnapshot(
  snapshot: PrimeSnapshot,
  page: MarketplaceSourcePage = 'overview',
  sourceId?: string | null,
): MarketplaceSourceSnapshot {
  const sources = buildDemandSources(snapshot).filter((source) => source.type === 'marketplace');
  const accounts = buildAccounts(sources);
  const demandSignals = buildDemandSignals(sources);
  const skuSignals = buildSkuSignals(sources);
  const inquiries = buildInquiries(sources, snapshot.leads, snapshot.rfqs);
  const attribution = buildAttribution(sources, snapshot.campaigns);
  const dataHealth = buildDataHealth(accounts);
  const selectedSource = sourceId ? sources.find((source) => source.id === sourceId) || null : sources[0] || null;
  const sourceQualityScores = sources.map((source) => source.qualityScore);

  return {
    page,
    sources,
    accounts,
    demandSignals,
    skuSignals,
    inquiries,
    attribution,
    dataHealth,
    selectedSource,
    overview: {
      totalMarketplaceSources: sources.length,
      activeMarketplaces: activeMarketplaceCount(accounts),
      totalMarketplaceLeads: sources.reduce((sum, source) => sum + source.leadCount, 0),
      totalRfqs: sources.reduce((sum, source) => sum + source.rfqCount, 0),
      topDemandMarketplace: topMarketplace(accounts),
      marketplaceSourceQualityScore: average(sourceQualityScores),
      sourcesNeedingReview: sources.filter((source) => source.status === 'needs_review' || source.blockers.length > 0).length,
      totalSignalVolume: sources.reduce((sum, source) => sum + source.signalVolume, 0),
      staleFeeds: dataHealth.filter((item) => item.status !== 'healthy').length,
      unmappedSkuCount: dataHealth.reduce((sum, item) => sum + item.unmappedSkuCount, 0),
    },
  };
}

export function getMarketplaceCatalogChildren() {
  return MARKETPLACE_SOURCE_CATALOG?.children || MARKETPLACES;
}
