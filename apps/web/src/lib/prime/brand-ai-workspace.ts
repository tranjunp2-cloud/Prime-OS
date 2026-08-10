export type BrandAiStatus = 'draft' | 'generating' | 'review_needed' | 'approved' | 'shared';

export type BrandAiSourceType = 'product' | 'campaign' | 'crm' | 'marketplace' | 'finance' | 'manual';

export interface BrandAiEvidenceSource {
  id: string;
  label: string;
  type: BrandAiSourceType;
  status: 'connected' | 'warning' | 'missing';
  coverage: number;
  lastSync: string;
  route: string;
}

export interface BrandAiPackage {
  id: string;
  name: string;
  market: string;
  category: string;
  owner: string;
  status: BrandAiStatus;
  readiness: number;
  evidenceCoverage: number;
  confidence: number;
  freshness: string;
  primaryGoal: string;
  recommendedAction: string;
  route: string;
  reviewRoute: string;
  shareRoute: string;
  sections: Array<{
    id: string;
    label: string;
    score: number;
    state: 'approved' | 'needs_review' | 'draft';
    insight: string;
  }>;
  icp: Array<{
    segment: string;
    urgency: number;
    fit: number;
    demandSignal: string;
  }>;
  positioning: Array<{
    axis: string;
    score: number;
  }>;
  risks: Array<{
    label: string;
    severity: 'low' | 'medium' | 'high';
    owner: string;
  }>;
}

export interface BrandAiGenerationStep {
  id: string;
  label: string;
  detail: string;
  progress: number;
  state: 'done' | 'running' | 'queued' | 'warning';
}

export interface BrandAiWorkspaceSnapshot {
  packages: BrandAiPackage[];
  sources: BrandAiEvidenceSource[];
  generation: BrandAiGenerationStep[];
  metrics: {
    activePackages: number;
    approvedPackages: number;
    reviewNeeded: number;
    averageReadiness: number;
    reusableContext: number;
  };
  registry: Array<{
    id: string;
    name: string;
    market: string;
    owner: string;
    status: BrandAiStatus;
    readiness: number;
    evidenceCoverage: number;
    nextAction: string;
    route: string;
  }>;
}

export const brandAiSourceLabels: Record<BrandAiSourceType, string> = {
  campaign: 'Campaigns',
  crm: 'Customer / CRM',
  finance: 'Finance guardrails',
  manual: 'Manual answers',
  marketplace: 'Marketplace signals',
  product: 'Product Master',
};

const packages: BrandAiPackage[] = [
  {
    id: 'venus-beauty',
    name: 'Venus Beauty',
    market: 'Japan / SEA',
    category: 'Beauty commerce intelligence',
    owner: 'Intelligence lead',
    status: 'review_needed',
    readiness: 84,
    evidenceCoverage: 78,
    confidence: 82,
    freshness: '2h ago',
    primaryGoal: 'Create a reusable brand intelligence foundation for launch, demand planning, and operator decisions.',
    recommendedAction: 'Review claim evidence before sending the package to CRM Campaigns.',
    route: '/intelligence/branding-agent/venus-beauty',
    reviewRoute: '/intelligence/branding-agent/venus-beauty/review',
    shareRoute: '/intelligence/branding-agent/venus-beauty/share',
    sections: [
      { id: 'foundation', label: 'Brand foundation', score: 92, state: 'approved', insight: 'Clear offer, market, and category framing.' },
      { id: 'icp', label: 'ICP & demand map', score: 84, state: 'needs_review', insight: 'Two buyer segments need stronger source proof.' },
      { id: 'positioning', label: 'Positioning wedge', score: 88, state: 'approved', insight: 'Differentiation is strongest around speed-to-launch and evidence reuse.' },
      { id: 'messaging', label: 'Messaging brief', score: 76, state: 'needs_review', insight: 'Primary promise needs evidence-backed claim language.' },
      { id: 'signals', label: 'Signal map', score: 81, state: 'needs_review', insight: 'Marketplace trend and creator signal align, but CRM coverage is thin.' },
      { id: 'agent-json', label: 'Agent context JSON', score: 90, state: 'approved', insight: 'Ready for Consulting Agent and CRM handoff.' },
    ],
    icp: [
      { segment: 'Founder-led beauty SMB', urgency: 86, fit: 91, demandSignal: 'Needs launch narrative before paid acquisition.' },
      { segment: 'Marketplace brand operator', urgency: 74, fit: 84, demandSignal: 'Needs repeatable proof points and competitor map.' },
      { segment: 'Agency growth lead', urgency: 63, fit: 72, demandSignal: 'Needs campaign-ready messaging, less product setup.' },
    ],
    positioning: [
      { axis: 'Clarity', score: 92 },
      { axis: 'Proof', score: 78 },
      { axis: 'Differentiation', score: 86 },
      { axis: 'ICP fit', score: 84 },
      { axis: 'Reuse', score: 90 },
    ],
    risks: [
      { label: 'Two claims still rely on inferred competitor positioning.', severity: 'medium', owner: 'Brand reviewer' },
      { label: 'CRM evidence coverage is below strict review threshold.', severity: 'medium', owner: 'Customer ops' },
    ],
  },
  {
    id: 'atelier-coffee',
    name: 'Atelier Coffee',
    market: 'Vietnam',
    category: 'Premium packaged beverage',
    owner: 'CRM strategist',
    status: 'approved',
    readiness: 91,
    evidenceCoverage: 88,
    confidence: 87,
    freshness: 'Today',
    primaryGoal: 'Prepare market narrative and source map for a marketplace launch test.',
    recommendedAction: 'Send approved positioning and ICP to Campaign Planner.',
    route: '/intelligence/branding-agent/atelier-coffee',
    reviewRoute: '/intelligence/branding-agent/atelier-coffee/review',
    shareRoute: '/intelligence/branding-agent/atelier-coffee/share',
    sections: [
      { id: 'foundation', label: 'Brand foundation', score: 95, state: 'approved', insight: 'Category and promise are clear.' },
      { id: 'icp', label: 'ICP & demand map', score: 89, state: 'approved', insight: 'Buyer segments map to campaign channels.' },
      { id: 'positioning', label: 'Positioning wedge', score: 92, state: 'approved', insight: 'Premium ritual positioning is strong.' },
      { id: 'messaging', label: 'Messaging brief', score: 88, state: 'approved', insight: 'Messaging can be reused by content and ads.' },
      { id: 'signals', label: 'Signal map', score: 86, state: 'approved', insight: 'Marketplace and social signals are aligned.' },
      { id: 'agent-json', label: 'Agent context JSON', score: 94, state: 'approved', insight: 'Ready for downstream agents.' },
    ],
    icp: [
      { segment: 'Premium home brewer', urgency: 80, fit: 88, demandSignal: 'Search lift around giftable coffee sets.' },
      { segment: 'Office procurement', urgency: 72, fit: 83, demandSignal: 'Repeat order signal from B2B inquiries.' },
    ],
    positioning: [
      { axis: 'Clarity', score: 94 },
      { axis: 'Proof', score: 86 },
      { axis: 'Differentiation', score: 89 },
      { axis: 'ICP fit', score: 91 },
      { axis: 'Reuse', score: 88 },
    ],
    risks: [
      { label: 'Seasonality assumption should be rechecked before Q4 scale.', severity: 'low', owner: 'CRM strategist' },
    ],
  },
  {
    id: 'nordic-desk',
    name: 'Nordic Desk',
    market: 'Japan',
    category: 'Workspace accessories',
    owner: 'Consulting operator',
    status: 'generating',
    readiness: 62,
    evidenceCoverage: 55,
    confidence: 64,
    freshness: 'Live',
    primaryGoal: 'Generate a first-pass brand package for consulting onboarding.',
    recommendedAction: 'Continue generation with available product and marketplace evidence.',
    route: '/intelligence/branding-agent/nordic-desk',
    reviewRoute: '/intelligence/branding-agent/nordic-desk/review',
    shareRoute: '/intelligence/branding-agent/nordic-desk/share',
    sections: [
      { id: 'foundation', label: 'Brand foundation', score: 70, state: 'draft', insight: 'Basic input is complete.' },
      { id: 'icp', label: 'ICP & demand map', score: 58, state: 'draft', insight: 'Customer evidence is still missing.' },
      { id: 'positioning', label: 'Positioning wedge', score: 64, state: 'draft', insight: 'Alternatives are being mapped.' },
      { id: 'messaging', label: 'Messaging brief', score: 52, state: 'draft', insight: 'Claims not ready yet.' },
    ],
    icp: [
      { segment: 'Remote workspace buyer', urgency: 68, fit: 74, demandSignal: 'Inquiry signal around desk organization.' },
      { segment: 'Small office admin', urgency: 59, fit: 67, demandSignal: 'Bulk interest needs RFQ validation.' },
    ],
    positioning: [
      { axis: 'Clarity', score: 68 },
      { axis: 'Proof', score: 52 },
      { axis: 'Differentiation', score: 61 },
      { axis: 'ICP fit', score: 66 },
      { axis: 'Reuse', score: 60 },
    ],
    risks: [
      { label: 'Insufficient customer evidence for strong ICP claims.', severity: 'high', owner: 'Customer ops' },
    ],
  },
];

const sources: BrandAiEvidenceSource[] = [
  { id: 'product-master', label: 'Product Master', type: 'product', status: 'connected', coverage: 92, lastSync: '8m ago', route: '/ecom/cos/product-master' },
  { id: 'campaigns', label: 'Campaigns', type: 'campaign', status: 'connected', coverage: 84, lastSync: '12m ago', route: '/crm/campaigns' },
  { id: 'marketplace', label: 'Marketplace Source', type: 'marketplace', status: 'connected', coverage: 78, lastSync: '20m ago', route: '/crm/sources?function=marketplace' },
  { id: 'crm', label: 'Customer / CRM', type: 'crm', status: 'warning', coverage: 58, lastSync: 'Yesterday', route: '/customer/crm-compact' },
  { id: 'finance', label: 'Finance guardrails', type: 'finance', status: 'connected', coverage: 73, lastSync: '1h ago', route: '/finance/fin-support' },
  { id: 'manual', label: 'Manual answers', type: 'manual', status: 'connected', coverage: 69, lastSync: 'Draft', route: '/intelligence/branding-agent/create' },
];

const generation: BrandAiGenerationStep[] = [
  { id: 'collect', label: 'Collect', detail: 'Answers, URLs, files, and linked PrimeOS sources.', progress: 100, state: 'done' },
  { id: 'understand', label: 'Understand', detail: 'Separate facts, assumptions, inferences, and unknowns.', progress: 82, state: 'done' },
  { id: 'position', label: 'Position', detail: 'Map ICP, alternatives, wedge, and message angles.', progress: 64, state: 'running' },
  { id: 'guardrail', label: 'Guardrail', detail: 'Check evidence coverage, stale source, and launch blockers.', progress: 48, state: 'warning' },
  { id: 'package', label: 'Package', detail: 'Generate docs, JSON context, handoff actions, and version.', progress: 24, state: 'queued' },
];

export function buildBrandAiWorkspaceSnapshot(): BrandAiWorkspaceSnapshot {
  const averageReadiness = Math.round(packages.reduce((total, item) => total + item.readiness, 0) / packages.length);
  const approvedPackages = packages.filter((item) => item.status === 'approved' || item.status === 'shared').length;
  const reviewNeeded = packages.filter((item) => item.status === 'review_needed').length;
  const reusableContext = packages.reduce((total, item) => total + item.sections.filter((section) => section.state === 'approved').length, 0);

  return {
    packages,
    sources,
    generation,
    metrics: {
      activePackages: packages.length,
      approvedPackages,
      reviewNeeded,
      averageReadiness,
      reusableContext,
    },
    registry: packages.map((item) => ({
      id: item.id,
      name: item.name,
      market: item.market,
      owner: item.owner,
      status: item.status,
      readiness: item.readiness,
      evidenceCoverage: item.evidenceCoverage,
      nextAction: item.recommendedAction,
      route: item.route,
    })),
  };
}

export function getBrandAiPackage(id?: string) {
  if (!id) return packages[0];
  return packages.find((item) => item.id === id) || packages[0];
}
