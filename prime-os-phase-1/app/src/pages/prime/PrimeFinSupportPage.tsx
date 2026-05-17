import { type ChangeEvent, type DragEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts';
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Bot,
  Building2,
  ChevronLeft,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileCheck2,
  FileText,
  Gauge,
  Info,
  Link2,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Truck,
  Upload,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PartnerWorkspacePanel } from '@/components/prime/PartnerWorkspacePanel';
import {
  fetchFinanceControlPlane,
  type CapitalOffersRecord,
  type CapitalReadinessRecord,
  type FinanceControlPlaneSnapshot,
  type RiskTrustRecord,
  type SettlementRepaymentRecord,
} from '@/lib/prime/finance-control-plane';
import {
  buildFinanceTrustProfile,
  type BankReviewSummary,
  type CommerceEvidencePack,
  type CommerceEvidenceStatus,
  type FinanceDocumentStatus,
  type FinancialTrustProfile,
} from '@/lib/prime/finance-trust-profile';
import { getPartnerWorkspaceSummary } from '@/lib/prime/partner-workspace';
import { getPrimeSnapshot } from '@/lib/prime/prime-data';
import { useI18n } from '@/lib/i18n/I18nContext';
import type { Locale } from '@/lib/i18n/dictionaries';
import { cn } from '@/lib/utils';

const currency = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
  maximumFractionDigits: 0,
});
const fundingDisplayMultiplier = 40;

type FundingStepStatus = 'complete' | 'active' | 'blocked' | 'pending';
type DocumentStatus = FinanceDocumentStatus;
type ApplicationStatus = 'Draft' | 'Pre-check Review' | 'Need Additional Documents' | 'Bank Reviewing' | 'Terms Proposed' | 'Rejected';
type LoanWizardStepId = 'profile' | 'purpose' | 'commerce' | 'documents' | 'routing' | 'review' | 'tracking';
type FinanceSupportTab = 'overview' | 'evidence' | 'documents' | 'routes' | 'applications' | 'audit';
type FinanceSupportGroupId = 'overview' | 'package' | 'routes' | 'audit';

type EligibilitySignal = {
  label: string;
  value: string;
  detail: string;
  score: number;
  icon: LucideIcon;
};

type RiskBlocker = {
  blocker: string;
  impact: string;
  recommendation: string;
  severity: 'high' | 'medium' | 'low';
};

type OverviewDetail = {
  title: string;
  eyebrow: string;
  status?: string;
  body: string;
  facts: Array<{ label: string; value: string }>;
  actionLabel: string;
  actionTab: FinanceSupportTab;
};

type LenderMatch = {
  id: string;
  bankName: string;
  financingType: string;
  estimatedRange: string;
  matchPercent: number;
  requirements: string[];
  reviewWindow: string;
  source: string;
};

type FundingStep = {
  label: string;
  detail: string;
  status: FundingStepStatus;
};

type FinancingDocument = {
  id: string;
  label: string;
  description: string;
  banks: string[];
  status: DocumentStatus;
  progress: number;
  fileName?: string;
  issue?: string;
};

type ApplicationItem = {
  lender: string;
  status: ApplicationStatus;
  timeline: string;
  nextAction: string;
  pending: string;
};

type LoanProfileDraft = {
  legalName: string;
  corporateNumber: string;
  representative: string;
  requestedAmount: string;
  fundingPurpose: string;
  targetReviewTiming: string;
  repaymentSource: string;
};

type LoanWizardStep = {
  id: LoanWizardStepId;
  title: string;
  summary: string;
  icon: LucideIcon;
};

type LoanWizardMoodCopy = {
  title: string;
  detail: string;
  reassurance: string;
  ariaLabel: string;
};

type JapanLoanDocument = {
  id: string;
  label: string;
  detail: string;
  lenderUse: string;
  linkedDocumentId?: string;
  fallbackStatus: DocumentStatus;
};

const finSupportCopy = {
  'en-US': {
    routeLabel: 'Finance / Fin Support',
    usingLocalSnapshot: 'Using local snapshot',
    title: 'Bank-ready funding cockpit',
    titleInfo: 'Prime OS turns commerce operations into bank-reviewable evidence. From operating data to funding readiness.',
    fixBlockers: 'Fix blockers',
    preparePackage: 'Prepare bank-ready package',
    noMajorBlocker: 'No major blocker',
    tabs: {
      overview: 'Overview',
      evidence: 'Evidence',
      documents: 'Documents',
      routes: 'Review Routes',
      applications: 'Applications',
      audit: 'Audit',
    },
    groups: {
      overview: { label: 'Overview', detail: 'Readiness answer and next action' },
      package: { label: 'Package', detail: 'Evidence and documents' },
      routes: { label: 'Routes', detail: 'Review routes and applications' },
      audit: { label: 'Audit', detail: 'Traceability history' },
    },
    aiTitles: {
      evidence: 'Evidence AI',
      documents: 'Document AI',
      routes: 'Route AI',
      applications: 'Application AI',
      audit: 'Audit AI',
    },
  },
  'ja-JP': {
    routeLabel: 'ファイナンス / 資金サポート',
    usingLocalSnapshot: 'ローカルスナップショットを使用中',
    title: '銀行提出向け資金調達コックピット',
    titleInfo: 'Prime OSはコマース運用データを銀行レビュー可能な根拠へ変換し、運用データから資金調達準備度までつなぎます。',
    fixBlockers: 'ブロッカーを解消',
    preparePackage: '銀行提出パッケージを準備',
    noMajorBlocker: '大きなブロッカーなし',
    tabs: {
      overview: '概要',
      evidence: '根拠',
      documents: '書類',
      routes: '審査ルート',
      applications: '申請',
      audit: '監査',
    },
    groups: {
      overview: { label: '概要', detail: '準備度の回答と次アクション' },
      package: { label: 'パッケージ', detail: '根拠と書類' },
      routes: { label: 'ルート', detail: '審査ルートと申請' },
      audit: { label: '監査', detail: 'トレーサビリティ履歴' },
    },
    aiTitles: {
      evidence: '根拠AI',
      documents: '書類AI',
      routes: 'ルートAI',
      applications: '申請AI',
      audit: '監査AI',
    },
  },
  'vi-VN': {
    routeLabel: 'Tài chính / Hỗ trợ vốn',
    usingLocalSnapshot: 'Đang dùng snapshot cục bộ',
    title: 'Buồng lái hồ sơ vốn sẵn sàng cho ngân hàng',
    titleInfo: 'Prime OS chuyển dữ liệu vận hành commerce thành bằng chứng có thể đưa vào quy trình review ngân hàng, từ vận hành tới mức sẵn sàng gọi vốn.',
    fixBlockers: 'Gỡ điểm chặn',
    preparePackage: 'Chuẩn bị gói hồ sơ ngân hàng',
    noMajorBlocker: 'Không có điểm chặn lớn',
    tabs: {
      overview: 'Tổng quan',
      evidence: 'Bằng chứng',
      documents: 'Tài liệu',
      routes: 'Route xét duyệt',
      applications: 'Hồ sơ nộp',
      audit: 'Kiểm toán',
    },
    groups: {
      overview: { label: 'Tổng quan', detail: 'Mức sẵn sàng và hành động tiếp theo' },
      package: { label: 'Gói hồ sơ', detail: 'Bằng chứng và tài liệu' },
      routes: { label: 'Route', detail: 'Route xét duyệt và hồ sơ nộp' },
      audit: { label: 'Kiểm toán', detail: 'Lịch sử truy vết' },
    },
    aiTitles: {
      evidence: 'AI bằng chứng',
      documents: 'AI tài liệu',
      routes: 'AI route',
      applications: 'AI hồ sơ',
      audit: 'AI kiểm toán',
    },
  },
} as Record<Locale, any>;


const financeSupportTabs: Array<{ id: FinanceSupportTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'documents', label: 'Documents' },
  { id: 'routes', label: 'Review Routes' },
  { id: 'applications', label: 'Applications' },
  { id: 'audit', label: 'Audit' },
];

const financeSupportGroups: Array<{
  id: FinanceSupportGroupId;
  label: string;
  detail: string;
  tabs: FinanceSupportTab[];
  defaultTab: FinanceSupportTab;
}> = [
  { id: 'overview', label: 'Overview', detail: 'Readiness answer and next action', tabs: ['overview'], defaultTab: 'overview' },
  { id: 'package', label: 'Package', detail: 'Evidence and documents', tabs: ['evidence', 'documents'], defaultTab: 'evidence' },
  { id: 'routes', label: 'Routes', detail: 'Review routes and applications', tabs: ['routes', 'applications'], defaultTab: 'routes' },
  { id: 'audit', label: 'Audit', detail: 'Traceability history', tabs: ['audit'], defaultTab: 'audit' },
];

const legacyFinanceHashTabs: Record<string, FinanceSupportTab> = {
  status: 'applications',
  lenders: 'routes',
  blockers: 'overview',
  'funding-application-flow': 'applications',
  'commerce-evidence-pack': 'evidence',
};

const readinessChartConfig = {
  score: { label: 'Readiness score', color: 'hsl(var(--primary))' },
} satisfies ChartConfig;

function InfoHint({ children, label = 'More information' }: { children: ReactNode; label?: string }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="inline-flex size-4 shrink-0 items-center justify-center rounded-full border bg-background text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            aria-label={label}
          >
            <Info className="size-3" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-72 text-xs leading-relaxed">
          {children}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

const loanWizardSteps: LoanWizardStep[] = [
  { id: 'profile', title: 'Business profile', summary: 'Registered identity, representative, operating base.', icon: Building2 },
  { id: 'purpose', title: 'Funding purpose', summary: 'Amount, use of funds, timing, repayment source.', icon: Banknote },
  { id: 'commerce', title: 'Commerce proof', summary: 'Operational signals PrimeOS can attach to the file.', icon: TrendingUp },
  { id: 'documents', title: 'Document pack', summary: 'Japan SME lending documents uploaded once, reused across lenders.', icon: FileText },
  { id: 'routing', title: 'Review routing', summary: 'Partner bank, guarantee-backed, or JFC-style review path.', icon: ShieldCheck },
  { id: 'review', title: 'Review & consent', summary: 'Final pre-check before PrimeOS sends the package.', icon: FileCheck2 },
  { id: 'tracking', title: 'Track next steps', summary: 'Additional documents, bank review, contract, lender milestones.', icon: Clock3 },
];

const loanWizardMoodCopy: Record<LoanWizardStepId, LoanWizardMoodCopy> = {
  profile: {
    title: 'Identity check, kept calm',
    detail: 'Confirm the registered business once. PrimeOS keeps the lender file tidy as you move.',
    reassurance: 'Draft saves stay local to the workflow until you submit pre-check.',
    ariaLabel: 'Animated business profile document being checked',
  },
  purpose: {
    title: 'Funds mapped to work',
    detail: 'Turn the request into a clear use-of-funds story lenders can evaluate quickly.',
    reassurance: 'Inventory, campaign, equipment, and working-capital needs stay separated.',
    ariaLabel: 'Animated funding chips moving toward a use of funds tray',
  },
  commerce: {
    title: 'Operations become proof',
    detail: 'PrimeOS translates stable orders, payouts, inventory, and service quality into trust signals.',
    reassurance: 'Commerce evidence supports the file without asking the merchant to rewrite it.',
    ariaLabel: 'Animated commerce signals flowing into a trust shield',
  },
  documents: {
    title: 'Upload once, reuse often',
    detail: 'The document pack is organized once, then mapped to each potential review-route requirement.',
    reassurance: 'Missing or rejected files stay visible before the package is routed.',
    ariaLabel: 'Animated documents sliding into an upload folder',
  },
  routing: {
    title: 'Lender paths stay visible',
    detail: 'Partner banks, guarantee routes, and direct review paths stay separate but coordinated.',
    reassurance: 'PrimeOS routes the same verified package instead of duplicating work.',
    ariaLabel: 'Animated lender nodes connected by a routing path',
  },
  review: {
    title: 'One more quiet check',
    detail: 'Review consent, blockers, review routes, and document readiness before pre-check.',
    reassurance: 'No approval promise is shown; the workflow stays deterministic.',
    ariaLabel: 'Animated checklist being reviewed before submission',
  },
  tracking: {
    title: 'After submit, no guessing',
    detail: 'Next actions move into document requests, bank review, and lender milestone tracking.',
    reassurance: 'Additional document requests return to the same support flow.',
    ariaLabel: 'Animated funding timeline moving toward lender review milestones',
  },
};

const japanLoanDocuments: JapanLoanDocument[] = [
  {
    id: 'registry',
    label: 'Corporate registry / business registration',
    detail: 'Company identity, operating address, representative authority.',
    lenderUse: 'Identity check',
    linkedDocumentId: 'business-registration',
    fallbackStatus: 'missing',
  },
  {
    id: 'tax-return',
    label: 'Tax returns / financial statements',
    detail: 'Recent fiscal documents for cashflow and profitability review.',
    lenderUse: 'Lender review',
    linkedDocumentId: 'tax-documents',
    fallbackStatus: 'missing',
  },
  {
    id: 'trial-balance',
    label: 'Recent trial balance',
    detail: 'Fresh operating view when growth shifted after fiscal close.',
    lenderUse: 'Current business view',
    fallbackStatus: 'missing',
  },
  {
    id: 'bank-statement',
    label: 'Bank statements / payout account',
    detail: 'Settlement movement, repayment account, and cash cycle proof.',
    lenderUse: 'Repayment evidence',
    linkedDocumentId: 'bank-statements',
    fallbackStatus: 'missing',
  },
  {
    id: 'settlement',
    label: 'Settlement and marketplace reports',
    detail: 'Commerce-native proof of revenue, refund ratio, account quality, and channel stability.',
    lenderUse: 'Operational evidence review',
    linkedDocumentId: 'settlement-records',
    fallbackStatus: 'missing',
  },
  {
    id: 'invoice-logistics',
    label: 'Invoices, logistics, export records',
    detail: 'Supports purchase orders, inventory financing, export fulfillment, and B2B receivables.',
    lenderUse: 'Use-of-funds proof',
    linkedDocumentId: 'logistics-records',
    fallbackStatus: 'missing',
  },
  {
    id: 'estimate',
    label: 'Equipment quote / purchase estimate',
    detail: 'Needed when financing is tied to equipment or fixed-asset purchase.',
    lenderUse: 'Equipment loan proof',
    fallbackStatus: 'missing',
  },
];

const fallbackFinanceData: FinanceControlPlaneSnapshot = {
  capitalReadiness: [
    {
      id: 'capital_001',
      programName: 'JP notebook scale readiness',
      market: 'JP',
      owner: 'Finance lead',
      linkedLaunch: 'JP notebook refill comeback',
      linkedSku: 'CR-NTB-BLK-A5-A4',
      fundingNeed: 280000,
      readinessScore: 88,
      readinessReason: 'Validated launch plan, repeat-customer pull, and creator proof already align around one SKU.',
      nextReview: '2026-05-05T09:00:00.000Z',
      status: 'ready',
    },
    {
      id: 'capital_002',
      programName: 'SEA quote-first expansion readiness',
      market: 'SEA',
      owner: 'Regional finance',
      linkedLaunch: 'SEA collectible quote-first launch',
      linkedSku: 'CR-ART-MYTH-10',
      fundingNeed: 420000,
      readinessScore: 74,
      readinessReason: 'Wholesale intent is real, but MOQ, inventory, and repayment path still need tighter confirmation.',
      nextReview: '2026-05-12T09:00:00.000Z',
      status: 'watch',
    },
  ],
  capitalOffers: [
    {
      id: 'offer_001',
      offerName: 'JP campaign scale line',
      providerName: 'SMBC growth desk',
      capitalType: 'campaign_financing',
      market: 'JP',
      owner: 'Partnership lead',
      linkedLaunch: 'JP notebook refill comeback',
      amount: 280000,
      feeRate: 2.8,
      termDays: 45,
      repaymentModel: 'split_settlement',
      status: 'active',
    },
    {
      id: 'offer_002',
      offerName: 'SEA RFQ working capital line',
      providerName: 'SEA embedded capital partner',
      capitalType: 'working_capital',
      market: 'SEA',
      owner: 'Finance partnerships',
      linkedLaunch: 'SEA collectible quote-first launch',
      amount: 420000,
      feeRate: 3.4,
      termDays: 60,
      repaymentModel: 'invoice_sweep',
      status: 'onboarding',
    },
  ],
  riskTrust: [
    {
      id: 'risk_001',
      profileName: 'Notebook refill trust lane',
      signalSource: 'OMS + CRM compact + service history',
      trustScore: 84,
      severity: 'medium',
      owner: 'Risk lead',
      topRisk: 'Inventory pressure on refill SKU before campaign scale',
      recommendedFix: 'Lock bundle pricing and stock allocation before wider paid deployment.',
      status: 'active',
    },
    {
      id: 'risk_002',
      profileName: 'SEA quote-first trust lane',
      signalSource: 'Inventory brain + RFQ pipeline',
      trustScore: 71,
      severity: 'high',
      owner: 'Ops risk',
      topRisk: 'Cross-border stock and MOQ uncertainty could delay settlement.',
      recommendedFix: 'Confirm MOQ, supplier timing, and invoice repayment sequence before funding.',
      status: 'watch',
    },
  ],
  settlementRepayment: [
    {
      id: 'settlement_001',
      facilityName: 'JP refill launch settlement',
      market: 'JP',
      disbursementTarget: 'Campaign Ops budget',
      repaymentSource: 'Split settlement from launch revenue',
      outstandingBalance: 180000,
      nextDueAmount: 42000,
      nextDueDate: '2026-05-06T09:00:00.000Z',
      collectionMode: 'split_settlement',
      status: 'collecting',
    },
    {
      id: 'settlement_002',
      facilityName: 'SEA quote-first repayment lane',
      market: 'SEA',
      disbursementTarget: 'Supplier + sales ops',
      repaymentSource: 'Invoice sweep from converted RFQs',
      outstandingBalance: 420000,
      nextDueAmount: 70000,
      nextDueDate: '2026-05-14T09:00:00.000Z',
      collectionMode: 'invoice_sweep',
      status: 'scheduled',
    },
  ],
};

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function humanize(value?: string) {
  if (!value) return 'Not set';
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatShortDate(value?: string) {
  if (!value) return 'Pending';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Pending';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
}

function readinessGrade(score: number) {
  if (score >= 90) return 'A';
  if (score >= 82) return 'A-';
  if (score >= 74) return 'B+';
  if (score >= 66) return 'B';
  return 'Review';
}

function statusClass(status: FundingStepStatus | DocumentStatus | ApplicationStatus | CommerceEvidenceStatus) {
  if (status === 'complete' || status === 'verified' || status === 'reusable') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  }

  if (
    status === 'active' ||
    status === 'uploaded' ||
    status === 'uploading' ||
    status === 'verifying' ||
    status === 'Pre-check Review' ||
    status === 'Bank Reviewing' ||
    status === 'Terms Proposed'
  ) {
    return 'border-primary/25 bg-primary/10 text-primary';
  }

  if (status === 'blocked' || status === 'rejected' || status === 'Need Additional Documents' || status === 'Rejected') {
    return 'border-destructive/30 bg-destructive/10 text-destructive';
  }

  return 'border-border bg-muted/30 text-muted-foreground';
}

function rangeFromOffers(offers: CapitalOffersRecord[], readinessRows: CapitalReadinessRecord[]) {
  const values = [
    ...offers.map((offer) => offer.amount ?? 0),
    ...readinessRows.map((row) => row.fundingNeed ?? 0),
  ].filter((value) => value > 0);

  if (!values.length) return 'Pending bank match';

  const low = Math.min(...values) * fundingDisplayMultiplier;
  const high = Math.max(...values) * fundingDisplayMultiplier * 1.35;

  return `${currency.format(low)}-${currency.format(high)}`;
}

function buildLenders(offers: CapitalOffersRecord[], readinessScore: number): LenderMatch[] {
  const partnerNames = ['UOB SME Finance', 'MUFG Commerce Line', 'SMBC Growth Desk', 'Regional SME Bank'];
  const partnerTypes = ['Working capital', 'Campaign financing', 'Invoice financing', 'Inventory line'];

  const offerMatches = offers.map((offer, index) => ({
    id: offer.id,
    bankName: offer.providerName || partnerNames[index] || 'Partner lender',
    financingType: humanize(offer.capitalType),
    estimatedRange: offer.amount ? `${currency.format(offer.amount * fundingDisplayMultiplier)}-${currency.format(offer.amount * fundingDisplayMultiplier * 1.25)}` : 'Pending',
    matchPercent: clamp((offer.status === 'active' ? 86 : 74) + readinessScore / 10 - (offer.feeRate ?? 0)),
    requirements: [
      humanize(offer.repaymentModel),
      offer.linkedLaunch || 'Linked operating plan',
      `${offer.termDays ?? 45} day review window`,
    ],
    reviewWindow: offer.status === 'active' ? '2-4 business days' : '5-7 business days',
    source: offer.market,
  }));

  const synthetic = partnerNames.slice(offerMatches.length).map((name, index) => ({
    id: `partner-${index}`,
    bankName: name,
    financingType: partnerTypes[index + offerMatches.length] || 'SME financing',
    estimatedRange: `${currency.format(10000000 + index * 5000000)}-${currency.format(26000000 + index * 7000000)}`,
    matchPercent: clamp(readinessScore - index * 6),
    requirements: ['Verified settlements', 'Marketplace report', 'Inventory turnover proof'],
    reviewWindow: index === 0 ? '3-5 business days' : '5-10 business days',
    source: 'Partner network',
  }));

  return [...offerMatches, ...synthetic].slice(0, 4).sort((left, right) => right.matchPercent - left.matchPercent);
}

function buildDocuments(lenders: LenderMatch[]): FinancingDocument[] {
  const bankNames = lenders.slice(0, 3).map((lender) => lender.bankName);

  return [
    { id: 'business-registration', label: 'Business registration', description: 'Company identity and merchant ownership.', banks: bankNames, status: 'verified', progress: 100, fileName: 'business-registration.pdf' },
    { id: 'tax-documents', label: 'Tax documents', description: 'Latest tax filing or equivalent proof.', banks: bankNames, status: 'missing', progress: 0 },
    { id: 'bank-statements', label: 'Bank statements', description: 'Operating cashflow and settlement movement.', banks: bankNames, status: 'verifying', progress: 72, fileName: 'bank-statement-apr.pdf' },
    { id: 'settlement-records', label: 'Settlement records', description: 'Marketplace payout and repayment reliability.', banks: bankNames, status: 'reusable', progress: 100, fileName: 'settlement-ledger.csv' },
    { id: 'invoice-records', label: 'Invoice records', description: 'B2B order proof and receivables context.', banks: bankNames.slice(0, 2), status: 'uploaded', progress: 100, fileName: 'b2b-invoices-may.pdf' },
    { id: 'logistics-records', label: 'Logistics/export records', description: 'Fulfillment reliability and shipping proof.', banks: bankNames.slice(1), status: 'rejected', progress: 100, fileName: 'export-docs.zip', issue: 'Carrier reference is missing.' },
    { id: 'marketplace-reports', label: 'Marketplace reports', description: 'Sales health, refunds, and account quality.', banks: bankNames, status: 'verified', progress: 100, fileName: 'marketplace-health.xlsx' },
  ];
}

function buildApplications(lenders: LenderMatch[], docs: FinancingDocument[]): ApplicationItem[] {
  const missingCount = docs.filter((doc) => doc.status === 'missing' || doc.status === 'rejected').length;

  return lenders.slice(0, 3).map((lender, index) => ({
    lender: lender.bankName,
    status: index === 0 && missingCount === 0 ? 'Bank Reviewing' : index === 0 ? 'Need Additional Documents' : index === 1 ? 'Draft' : 'Pre-check Review',
    timeline: index === 0 ? 'Submitted today' : index === 1 ? 'Ready after tax docs' : 'Partner pre-check active',
    nextAction: index === 0 ? 'Resolve pending documents' : index === 1 ? 'Review requirements' : 'Confirm data consent',
    pending: index === 0 ? `${missingCount} document issues` : lender.requirements[0],
  }));
}

function openPrimeAi(context: Record<string, string>) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('prime-ai:open', { detail: context }));
  }
}

export function PrimeFinSupportPage() {
  const { locale } = useI18n();
  const copy = finSupportCopy[locale];
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab') as FinanceSupportTab | null;
  const legacyHash = typeof window !== 'undefined' ? window.location.hash.replace('#', '') : '';
  const legacyHashTab = legacyFinanceHashTabs[legacyHash];
  const activeTab: FinanceSupportTab = financeSupportTabs.some((tab) => tab.id === requestedTab) ? requestedTab! : legacyHashTab ?? 'overview';
  const setActiveTab = (tab: FinanceSupportTab) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', tab);
    setSearchParams(nextParams);
  };
  const snapshot = getPrimeSnapshot();
  const partnerWorkspace = getPartnerWorkspaceSummary(searchParams.get('role'));
  const financeQuery = useQuery({
    queryKey: ['prime-fin-support-control-plane'],
    queryFn: fetchFinanceControlPlane,
    staleTime: 30 * 1000,
    retry: 1,
  });
  const controlPlane = financeQuery.data ?? fallbackFinanceData;
  const usingLocalSnapshot = financeQuery.isError && !financeQuery.data;
  const primaryReadiness = [...controlPlane.capitalReadiness].sort((left, right) => right.readinessScore - left.readinessScore)[0];
  const readinessScore = primaryReadiness?.readinessScore ?? 72;
  const lenders = useMemo(() => buildLenders(controlPlane.capitalOffers, readinessScore), [controlPlane.capitalOffers, readinessScore]);
  const [documents, setDocuments] = useState<FinancingDocument[]>(() => buildDocuments(lenders));
  const [aiPrompt, setAiPrompt] = useState('Explain what will improve funding readiness fastest.');
  const [loanWizardOpen, setLoanWizardOpen] = useState(false);
  const [loanWizardStep, setLoanWizardStep] = useState(0);
  const [loanDraft, setLoanDraft] = useState<LoanProfileDraft>({
    legalName: 'Prime Commerce Japan KK',
    corporateNumber: '7010401180000',
    representative: primaryReadiness?.owner || 'Finance lead',
    requestedAmount: currency.format((primaryReadiness?.fundingNeed ?? 280000) * fundingDisplayMultiplier),
    fundingPurpose: 'Inventory replenishment and campaign working capital',
    targetReviewTiming: 'Target review completion within 3-4 weeks',
    repaymentSource: 'Marketplace settlements and split-repayment lane',
  });

  const eligibleRange = rangeFromOffers(controlPlane.capitalOffers, controlPlane.capitalReadiness);
  const mainBlocker = [...controlPlane.riskTrust].sort((left, right) => (right.severity === 'high' ? 1 : 0) - (left.severity === 'high' ? 1 : 0))[0];
  const missingDocs = documents.filter((doc) => doc.status === 'missing' || doc.status === 'rejected').length;
  const verifiedDocs = documents.filter((doc) => doc.status === 'verified' || doc.status === 'reusable').length;
  const applications = buildApplications(lenders, documents);
  const financeTrust = useMemo(() => buildFinanceTrustProfile({
    snapshot,
    controlPlane,
    documents,
    fundingRange: eligibleRange,
  }), [controlPlane, documents, eligibleRange, snapshot]);
  const applicationReady = missingDocs === 0;

  const eligibilitySignals: EligibilitySignal[] = [
    { label: 'Order stability', value: `${snapshot.orders.length} orders`, detail: 'Orders and fulfillment events prove operating consistency.', score: clamp(68 + snapshot.orders.length / 4), icon: TrendingUp },
    { label: 'Repeat customers', value: `${snapshot.customers.filter((customer) => customer.totalOrders > 1).length} repeat`, detail: 'Repeat purchase behavior improves trust in future cashflow.', score: clamp(70 + snapshot.customers.length * 2), icon: UsersRound },
    { label: 'Fulfillment reliability', value: `${snapshot.orderEvents.length} events`, detail: 'OMS and shipment history create operational repayment evidence.', score: clamp(76 + snapshot.orderEvents.length), icon: Truck },
    { label: 'Settlement consistency', value: `${controlPlane.settlementRepayment.length} lanes`, detail: 'Settlement records connect revenue collection to repayment paths.', score: clamp(72 + controlPlane.settlementRepayment.length * 8), icon: CircleDollarSign },
    { label: 'Campaign efficiency', value: `${snapshot.campaigns.length} campaigns`, detail: 'Demand data proves the business can deploy capital into growth.', score: clamp(66 + snapshot.metrics.leadToOrderRate), icon: Sparkles },
    { label: 'Marketplace health', value: `${snapshot.returnsCount} returns`, detail: 'Low refund pressure and service visibility protect lender confidence.', score: clamp(85 - snapshot.returnsCount * 4), icon: ShieldCheck },
  ];

  const blockers: RiskBlocker[] = controlPlane.riskTrust.map((risk) => ({
    blocker: risk.topRisk || risk.profileName,
    impact: risk.severity === 'high' ? 'May delay lender review or lower the indicative request ceiling.' : 'Needs clearer proof before stronger review routes are available.',
    recommendation: risk.recommendedFix || 'Attach stronger operational proof before submission.',
    severity: risk.severity === 'high' ? 'high' : risk.severity === 'medium' ? 'medium' : 'low',
  }));

  const fundingSteps: FundingStep[] = [
    { label: 'Verify business profile', detail: 'Company identity, owner, market, and payout account.', status: 'complete' },
    { label: 'Connect operational data', detail: 'Orders, fulfillment, inventory, settlement, campaigns, CRM.', status: 'complete' },
    { label: 'Upload required documents', detail: `${verifiedDocs}/${documents.length} documents verified.`, status: missingDocs ? 'active' : 'complete' },
    { label: 'Review readiness', detail: `${readinessGrade(readinessScore)} readiness with ${blockers.length} risk blocker(s).`, status: blockers.some((blocker) => blocker.severity === 'high') ? 'blocked' : 'active' },
    { label: 'Prepare review package', detail: `${lenders.length} potential review route(s) available after consent.`, status: applicationReady ? 'active' : 'pending' },
    { label: 'Track lender review', detail: 'Follow document requests, lender-review milestones, and contract handoff state.', status: applications.some((item) => item.status === 'Bank Reviewing') ? 'active' : 'pending' },
  ];

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;

    setDocuments((current) => current.map((doc) => {
      if (doc.status !== 'missing' && doc.status !== 'rejected') return doc;
      return {
        ...doc,
        fileName: file.name,
        progress: 100,
        status: 'verifying',
        issue: undefined,
      };
    }));
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    handleFiles(event.dataTransfer.files);
  };

  const askAi = (context: string) => {
    openPrimeAi({
      page: 'Fin Support',
      readiness: readinessGrade(readinessScore),
      range: eligibleRange,
      blocker: mainBlocker?.topRisk || 'No blocker',
      context,
      prompt: aiPrompt,
    });
  };

  const updateLoanDraft = (field: keyof LoanProfileDraft, value: string) => {
    setLoanDraft((current) => ({ ...current, [field]: value }));
  };

  const aiActions: Record<FinanceSupportTab, string[]> = {
    overview: ['Explain readiness score', 'Explain blocker reasons', 'Recommend next best action', 'Draft bank-ready summary'],
    evidence: ['Explain evidence gaps', 'Suggest stronger evidence', 'Map evidence to review route'],
    documents: ['Generate missing document checklist', 'Explain rejected documents', 'Suggest reusable documents'],
    routes: ['Compare routes', 'Explain route fit', 'Recommend route from current evidence'],
    applications: ['Summarize pending requirements', 'Draft follow-up message', 'Explain application status'],
    audit: ['Explain score changes', 'Summarize evidence history'],
  };
  const auditEvents = [
    { timestamp: new Date().toISOString(), eventType: 'Readiness score', source: 'Finance control plane', description: `${readinessGrade(readinessScore)} / ${readinessScore}% calculated from commerce evidence.`, actor: 'Prime OS' },
    ...financeTrust.evidencePack.items.slice(0, 4).map((item) => ({ timestamp: new Date().toISOString(), eventType: 'Evidence verification', source: item.sourceOfTruthOwner, description: `${item.label}: ${humanize(item.status)} with ${item.records} record(s).`, actor: item.sourceOfTruthOwner })),
    ...documents.slice(0, 4).map((doc) => ({ timestamp: doc.fileName ? '2026-05-13T09:30:00Z' : '2026-05-12T16:00:00Z', eventType: 'Document change', source: doc.banks[0] || 'Document center', description: `${doc.label}: ${humanize(doc.status)}${doc.issue ? ` — ${doc.issue}` : ''}.`, actor: 'Finance operator' })),
    { timestamp: '2026-05-13T10:15:00Z', eventType: 'AI summary', source: 'Prime AI', description: 'Drafted bank-ready summary preview from verified operating sources.', actor: 'Prime AI' },
  ];

  useEffect(() => {
    if (!legacyHash) return;
    window.requestAnimationFrame(() => document.getElementById(legacyHash)?.scrollIntoView({ block: 'start' }));
  }, [activeTab, legacyHash]);

  return (
    <div className="min-h-full bg-background">
      <div className="space-y-5 p-4 md:p-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <CircleDollarSign className="size-4 text-primary" /> {copy.routeLabel}
            {usingLocalSnapshot ? <Badge variant="outline" className="rounded-full normal-case tracking-normal">{copy.usingLocalSnapshot}</Badge> : null}
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{copy.title}</h1>
                <InfoHint label={`${copy.title} info`}>{copy.titleInfo}</InfoHint>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => setActiveTab('documents')}>{copy.fixBlockers}</Button>
              <Button type="button" variant="secondary" onClick={() => setLoanWizardOpen(true)}>{copy.preparePackage}</Button>
            </div>
          </div>
        </div>

        {partnerWorkspace ? <PartnerWorkspacePanel summary={partnerWorkspace} /> : null}
        <FinanceTabs activeTab={activeTab} onChange={setActiveTab} copy={copy} />

        {activeTab === 'overview' ? (
          <OverviewCockpit
            readinessScore={readinessScore}
            eligibleRange={eligibleRange}
            mainBlocker={mainBlocker?.topRisk || copy.noMajorBlocker}
            nextAction={financeTrust.bankReviewSummary.nextAction}
            signals={eligibilitySignals}
            summary={financeTrust.bankReviewSummary}
            evidencePack={financeTrust.evidencePack}
            blockers={blockers}
            lenders={lenders}
            onTabChange={setActiveTab}
            onAskAi={() => askAi('overview')}
          />
        ) : null}

        {activeTab === 'evidence' ? (
          <TwoColumnTab
            main={<EvidenceTab evidencePack={financeTrust.evidencePack} signals={eligibilitySignals} onTabChange={setActiveTab} />}
            side={<PrimeAiPanel title={copy.aiTitles.evidence} actions={aiActions.evidence} prompt={aiPrompt} onPromptChange={setAiPrompt} onAskAi={() => askAi('evidence')} />}
          />
        ) : null}

        {activeTab === 'documents' ? (
          <TwoColumnTab
            main={<DocumentsTab documents={documents} verifiedDocs={verifiedDocs} missingDocs={missingDocs} lenders={lenders} onDrop={handleDrop} onFiles={handleFiles} />}
            side={<PrimeAiPanel title={copy.aiTitles.documents} actions={aiActions.documents} prompt={aiPrompt} onPromptChange={setAiPrompt} onAskAi={() => askAi('documents')} />}
          />
        ) : null}

        {activeTab === 'routes' ? (
          <TwoColumnTab
            main={<ReviewRoutesTab lenders={lenders} documents={documents} blockers={blockers} />}
            side={<PrimeAiPanel title={copy.aiTitles.routes} actions={aiActions.routes} prompt={aiPrompt} onPromptChange={setAiPrompt} onAskAi={() => askAi('routes')} />}
          />
        ) : null}

        {activeTab === 'applications' ? (
          <TwoColumnTab
            main={<ApplicationsTab applications={applications} documents={documents} />}
            side={<PrimeAiPanel title={copy.aiTitles.applications} actions={aiActions.applications} prompt={aiPrompt} onPromptChange={setAiPrompt} onAskAi={() => askAi('applications')} />}
          />
        ) : null}

        {activeTab === 'audit' ? (
          <TwoColumnTab
            main={<AuditTab auditEvents={auditEvents} readinessScore={readinessScore} />}
            side={<PrimeAiPanel title={copy.aiTitles.audit} actions={aiActions.audit} prompt={aiPrompt} onPromptChange={setAiPrompt} onAskAi={() => askAi('audit')} />}
          />
        ) : null}
      </div>
      <LoanProfileWizard
        open={loanWizardOpen}
        stepIndex={loanWizardStep}
        readinessScore={readinessScore}
        eligibleRange={eligibleRange}
        draft={loanDraft}
        lenders={lenders}
        blockers={blockers}
        documents={documents}
        applications={applications}
        onFiles={handleFiles}
        onOpenChange={setLoanWizardOpen}
        onStepChange={setLoanWizardStep}
        onDraftChange={updateLoanDraft}
        onAskAi={() => askAi('loan-profile-wizard')}
      />
    </div>
  );
}


function FinanceTabs({ activeTab, onChange, copy }: { activeTab: FinanceSupportTab; onChange: (tab: FinanceSupportTab) => void; copy: (typeof finSupportCopy)[Locale] }) {
  const activeGroup = financeSupportGroups.find((group) => group.tabs.includes(activeTab)) ?? financeSupportGroups[0];

  return (
    <div className="overflow-x-auto rounded-xl border bg-card p-1">
      <div className="flex min-w-max gap-1">
        {financeSupportGroups.map((group) => {
          const active = activeGroup.id === group.id;

          return (
            <button
              key={group.id}
              type="button"
              onClick={() => onChange(group.defaultTab)}
              className={cn(
                'rounded-lg px-3 py-2 text-left transition md:min-w-44',
                active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
              )}
              aria-current={active ? 'page' : undefined}
            >
              <span className="block text-sm font-semibold">{copy.groups[group.id].label}</span>
              <span className={cn('mt-0.5 hidden text-xs md:block', active ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                {copy.groups[group.id].detail}
              </span>
            </button>
          );
        })}
      </div>
      {activeGroup.tabs.length > 1 ? (
        <div className="mt-1 flex min-w-max gap-1 border-t px-1 pt-1">
          {activeGroup.tabs.map((tabId) => {
            const tab = financeSupportTabs.find((item) => item.id === tabId);
            if (!tab) return null;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChange(tab.id)}
                className={cn(
                  'rounded-md px-2.5 py-1.5 text-xs font-medium transition',
                  activeTab === tab.id ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                )}
              >
                {copy.tabs[tab.id]}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function TwoColumnTab({ main, side }: { main: ReactNode; side: ReactNode }) {
  return <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">{main}<aside className="xl:sticky xl:top-4">{side}</aside></div>;
}

function FundingDecisionStrip({ readinessScore, eligibleRange, mainBlocker, nextAction, onAskAi, onTabChange }: { readinessScore: number; eligibleRange: string; mainBlocker: string; nextAction: string; onAskAi: () => void; onTabChange: (tab: FinanceSupportTab) => void }) {
  return (
    <section className="rounded-2xl border bg-card shadow-sm">
      <div className="grid gap-4 p-4 lg:grid-cols-[280px_minmax(0,1fr)_260px] lg:p-5">
        <div className="rounded-xl border bg-muted/20 p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Readiness</div>
          <div className="mt-3 flex items-end gap-3">
            <div className="text-5xl font-semibold tracking-tight">{readinessGrade(readinessScore)}</div>
            <div className="pb-1 text-xl font-semibold tabular-nums">{readinessScore}%</div>
          </div>
          <Progress value={readinessScore} className="mt-4 h-2" />
          <p className="mt-3 text-xs leading-5 text-muted-foreground">Preview only. This does not represent credit approval, underwriting, or disbursement.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <DecisionFact label="Indicative range" value={eligibleRange} />
          <DecisionFact label="Top blocker" value={mainBlocker} tone="risk" />
          <div className="rounded-xl border bg-background p-3 sm:col-span-2">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Next action</div>
            <p className="mt-1 text-sm font-medium leading-6">{nextAction}</p>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-3 rounded-xl border bg-background p-3">
          <div>
            <div className="text-sm font-semibold">Funding command</div>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">Resolve the blocker first, then prepare the review package.</p>
          </div>
          <div className="grid gap-2">
            <Button type="button" onClick={() => onTabChange('documents')}>{copy.fixBlockers}</Button>
            <Button type="button" variant="outline" onClick={onAskAi}>
              <Bot className="size-4" />
              Ask Prime AI
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function DecisionFact({ label, value, tone }: { label: string; value: string; tone?: 'risk' }) {
  return (
    <div className={cn('rounded-xl border bg-background p-3', tone === 'risk' && 'border-amber-500/30 bg-amber-500/5')}>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold leading-6">{value}</div>
    </div>
  );
}

function OverviewCockpit({ readinessScore, eligibleRange, mainBlocker, nextAction, signals, summary, evidencePack, blockers, lenders, onTabChange, onAskAi }: { readinessScore: number; eligibleRange: string; mainBlocker: string; nextAction: string; signals: EligibilitySignal[]; summary: BankReviewSummary; evidencePack: CommerceEvidencePack; blockers: RiskBlocker[]; lenders: LenderMatch[]; onTabChange: (tab: FinanceSupportTab) => void; onAskAi: () => void }) {
  const [detail, setDetail] = useState<OverviewDetail | null>(null);
  const highPriorityBlockers = [...blockers].sort((left, right) => severityRank(right.severity) - severityRank(left.severity)).slice(0, 4);

  return (
    <div className="space-y-4">
      <FundingDecisionStrip readinessScore={readinessScore} eligibleRange={eligibleRange} mainBlocker={mainBlocker} nextAction={nextAction} onTabChange={onTabChange} onAskAi={onAskAi} />

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <ReadinessEvidencePanel signals={signals} evidencePack={evidencePack} onOpenEvidence={() => onTabChange('evidence')} onOpenDetail={setDetail} />
        <div id="blockers">
          <WorkQueuePanel blockers={highPriorityBlockers} onOpenDetail={setDetail} onTabChange={onTabChange} />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.72fr)]">
        <FundingPathPanel lenders={lenders.slice(0, 4)} onOpenDetail={setDetail} onTabChange={onTabChange} />
        <BankReviewSummaryPreview summary={summary} />
      </section>

      <OverviewDetailDialog detail={detail} onOpenChange={(open) => !open && setDetail(null)} onTabChange={onTabChange} />
    </div>
  );
}

function ReadinessEvidencePanel({ signals, evidencePack, onOpenEvidence, onOpenDetail }: { signals: EligibilitySignal[]; evidencePack: CommerceEvidencePack; onOpenEvidence: () => void; onOpenDetail: (detail: OverviewDetail) => void }) {
  const chartData = signals.map((signal) => ({
    label: signal.label.replace(' consistency', '').replace(' reliability', ''),
    score: Math.round(signal.score),
    status: readinessStatus(signal.score),
  }));
  const exceptions = evidencePack.items.filter((item) => item.status === 'missing' || item.status === 'rejected' || item.status === 'uploaded').slice(0, 3);

  return (
    <Card className="rounded-2xl">
      <CardHeader className="border-b">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-1.5 text-base">
              Evidence Health
              <InfoHint label="Evidence Health info">Readiness factors and evidence coverage from current PrimeOS operating sources.</InfoHint>
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Charts summarize the package; rows open the source detail.</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onOpenEvidence}>Open package</Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="text-sm font-semibold">Readiness factors</div>
            <Badge variant="outline" className="rounded-full">Target 85%</Badge>
          </div>
          <ChartContainer
            config={readinessChartConfig}
            className="h-64 w-full"
            aria-label={`Readiness factors: ${signals.map((signal) => `${signal.label} ${Math.round(signal.score)} percent`).join(', ')}`}
          >
            <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 44, top: 4, bottom: 4 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" domain={[0, 100]} hide />
              <YAxis type="category" dataKey="label" width={118} tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Bar dataKey="score" fill="var(--color-score)" radius={[0, 6, 6, 0]} barSize={18}>
                <LabelList dataKey="score" position="right" formatter={(value: number) => `${value}%`} className="fill-foreground font-medium" />
              </Bar>
            </BarChart>
          </ChartContainer>
          <ul className="sr-only">
            {signals.map((signal) => (
              <li key={signal.label}>{signal.label}: {Math.round(signal.score)} percent, {readinessStatus(signal.score)}. {signal.detail}</li>
            ))}
          </ul>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {signals.slice(0, 3).map((signal) => (
              <div key={signal.label} className="rounded-lg border bg-muted/20 p-2 text-xs">
                <div className="font-medium">{signal.label}</div>
                <div className="mt-1 text-muted-foreground">{Math.round(signal.score)}% · {readinessStatus(signal.score)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <EvidenceCoverageBar evidencePack={evidencePack} />
          <div>
            <div className="mb-2 text-sm font-semibold">Needs attention</div>
            <div className="space-y-2">
              {(exceptions.length ? exceptions : evidencePack.items.slice(0, 3)).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onOpenDetail({
                    eyebrow: 'Evidence detail',
                    title: item.label,
                    status: humanize(item.status),
                    body: item.summary,
                    facts: [
                      { label: 'Owner', value: item.sourceOfTruthOwner },
                      { label: 'Records', value: String(item.records) },
                      { label: 'Route', value: item.linkedRoute },
                    ],
                    actionLabel: 'Open package',
                    actionTab: item.documentId ? 'documents' : 'evidence',
                  })}
                  className="w-full rounded-lg border bg-background p-3 text-left transition hover:border-primary/35 hover:bg-muted/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="line-clamp-1 text-sm font-medium">{item.label}</div>
                      <div className="mt-1 text-xs text-muted-foreground">Owner: {item.sourceOfTruthOwner}</div>
                    </div>
                    <Badge variant="outline" className={cn('shrink-0', statusClass(item.status))}>{humanize(item.status)}</Badge>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EvidenceCoverageBar({ evidencePack }: { evidencePack: CommerceEvidencePack }) {
  const statuses: CommerceEvidenceStatus[] = ['verified', 'reusable', 'uploaded', 'missing', 'rejected'];
  const colors: Record<CommerceEvidenceStatus, string> = {
    verified: 'bg-emerald-500',
    reusable: 'bg-teal-500',
    uploaded: 'bg-primary',
    missing: 'bg-muted-foreground/35',
    rejected: 'bg-destructive',
  };
  const counts = statuses.map((status) => ({
    status,
    count: evidencePack.items.filter((item) => item.status === status).length,
  }));
  const total = Math.max(1, evidencePack.items.length);
  const openIssueCount = evidencePack.items.filter((item) => item.status === 'missing' || item.status === 'rejected').length;
  const readyCount = evidencePack.items.length - openIssueCount;

  return (
    <div className="rounded-xl border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold">Evidence coverage</div>
        <Badge variant="outline" className="rounded-full">{readyCount}/{evidencePack.items.length} ready</Badge>
      </div>
      <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-muted" aria-label={`Evidence coverage ${readyCount} of ${evidencePack.items.length} ready`}>
        {counts.map(({ status, count }) => count ? <span key={status} className={colors[status]} style={{ width: `${(count / total) * 100}%` }} /> : null)}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        {counts.map(({ status, count }) => (
          <div key={status} className="flex items-center justify-between gap-2 rounded-md border bg-background px-2 py-1.5">
            <span>{humanize(status)}</span>
            <span className="font-semibold tabular-nums">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkQueuePanel({ blockers, onOpenDetail, onTabChange }: { blockers: RiskBlocker[]; onOpenDetail: (detail: OverviewDetail) => void; onTabChange: (tab: FinanceSupportTab) => void }) {
  return (
    <Card className="rounded-2xl">
      <CardHeader className="border-b">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-1.5 text-base">
              Work Queue
              <InfoHint label="Work Queue info">Prioritized blockers and package actions before bank review.</InfoHint>
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Open a row for impact, recommendation, and route context.</p>
          </div>
          <Badge variant="outline" className="rounded-full">{blockers.length} items</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 p-3">
        {blockers.length ? blockers.map((blocker) => (
          <div key={blocker.blocker} className="rounded-xl border bg-background p-3">
            <button
              type="button"
              onClick={() => onOpenDetail({
                eyebrow: 'Risk blocker',
                title: blocker.blocker,
                status: humanize(blocker.severity),
                body: blocker.impact,
                facts: [
                  { label: 'Owner', value: 'Finance / Ops' },
                  { label: 'Recommendation', value: blocker.recommendation },
                  { label: 'Severity', value: humanize(blocker.severity) },
                ],
                actionLabel: blocker.severity === 'high' ? 'Resolve blocker' : 'Open package',
                actionTab: 'documents',
              })}
              className="w-full text-left"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={severityClass(blocker.severity)}>{humanize(blocker.severity)}</Badge>
                    <span className="text-sm font-semibold">Finance / Ops</span>
                  </div>
                  <div className="mt-2 line-clamp-2 font-medium">{blocker.blocker}</div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{blocker.recommendation}</p>
                </div>
                <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
              </div>
            </button>
            <div className="mt-3 flex justify-end">
              <Button type="button" size="sm" variant={blocker.severity === 'high' ? 'default' : 'outline'} onClick={() => onTabChange('documents')}>
                Resolve
              </Button>
            </div>
          </div>
        )) : (
          <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">No critical blockers detected. Prepare the package for route review.</div>
        )}
      </CardContent>
    </Card>
  );
}

function FundingPathPanel({ lenders, onOpenDetail, onTabChange }: { lenders: LenderMatch[]; onOpenDetail: (detail: OverviewDetail) => void; onTabChange: (tab: FinanceSupportTab) => void }) {
  return (
    <Card id="lenders" className="rounded-2xl">
      <CardHeader className="border-b">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-1.5 text-base">
              Funding Path
              <InfoHint label="Funding Path info">Route-fit preview from current readiness and evidence. No approval promise.</InfoHint>
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Compare likely review paths before opening the full route tab.</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => onTabChange('routes')}>Compare routes</Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 p-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(320px,1fr)]">
        {lenders.length ? <RouteFitBars lenders={lenders} /> : <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">No review routes are available from the current evidence package.</div>}
        <div className="space-y-2">
          {lenders.slice(0, 3).map((lender) => (
            <button
              key={lender.id}
              type="button"
              onClick={() => onOpenDetail({
                eyebrow: 'Route preview',
                title: lender.bankName,
                status: `${Math.round(lender.matchPercent)}% route fit`,
                body: lender.financingType,
                facts: [
                  { label: 'Indicative range', value: lender.estimatedRange },
                  { label: 'Review window', value: lender.reviewWindow },
                  { label: 'Top requirement', value: lender.requirements[0] || 'No listed requirement' },
                ],
                actionLabel: 'Open routes',
                actionTab: 'routes',
              })}
              className="w-full rounded-xl border bg-background p-3 text-left transition hover:border-primary/35 hover:bg-muted/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="line-clamp-1 font-semibold">{lender.bankName}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{lender.estimatedRange} · {lender.reviewWindow}</div>
                </div>
                <Badge variant="outline">{Math.round(lender.matchPercent)}%</Badge>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function RouteFitBars({ lenders }: { lenders: LenderMatch[] }) {
  return (
    <div className="rounded-xl border bg-muted/20 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="text-sm font-semibold">Route fit</div>
        <Badge variant="outline" className="rounded-full">Top {Math.min(4, lenders.length)}</Badge>
      </div>
      <div className="space-y-3">
        {lenders.map((lender) => {
          const value = Math.round(lender.matchPercent);

          return (
            <div key={lender.id} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="line-clamp-1 text-muted-foreground">{lender.bankName}</span>
                <span className="font-semibold tabular-nums">{value}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-background" aria-label={`${lender.bankName} route fit ${value}%`}>
                <div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OverviewDetailDialog({ detail, onOpenChange, onTabChange }: { detail: OverviewDetail | null; onOpenChange: (open: boolean) => void; onTabChange: (tab: FinanceSupportTab) => void }) {
  return (
    <Dialog open={Boolean(detail)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-2xl">
        {detail ? (
          <>
            <DialogHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="rounded-full">{detail.eyebrow}</Badge>
                {detail.status ? <Badge variant="outline" className="rounded-full">{detail.status}</Badge> : null}
              </div>
              <DialogTitle className="mt-2 text-xl">{detail.title}</DialogTitle>
              <DialogDescription>{detail.body}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              {detail.facts.map((fact) => (
                <MiniFact key={fact.label} label={fact.label} value={fact.value} />
              ))}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
              <Button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  onTabChange(detail.actionTab);
                }}
              >
                {detail.actionLabel}
                <ArrowRight className="size-4" />
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function severityRank(severity: RiskBlocker['severity']) {
  return severity === 'high' ? 3 : severity === 'medium' ? 2 : 1;
}

function severityClass(severity: RiskBlocker['severity']) {
  if (severity === 'high') return 'border-destructive/30 bg-destructive/10 text-destructive';
  if (severity === 'medium') return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200';
  return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
}

function FundingReadinessHero({ readinessScore, eligibleRange, mainBlocker, nextAction, onAskAi, onTabChange }: { readinessScore: number; eligibleRange: string; mainBlocker: string; nextAction: string; onAskAi: () => void; onTabChange: (tab: FinanceSupportTab) => void }) {
  return (
    <section className="overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/20 via-card to-card shadow-sm">
      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:p-6">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2"><Badge className="rounded-full">Prime OS readiness score</Badge><Badge variant="outline" className="rounded-full">Bank-ready evidence package</Badge></div>
          <div className="mt-5 flex flex-wrap items-end gap-4"><div className="text-6xl font-semibold tracking-tight">{readinessGrade(readinessScore)}</div><div className="pb-2 text-2xl font-semibold">{readinessScore}%</div></div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <MiniFact label="Indicative range" value={eligibleRange} />
            <MiniFact label="Blocking issue" value={mainBlocker} />
          </div>
          <div className="mt-4 rounded-xl border bg-background/70 p-4"><div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Next best action</div><p className="mt-1 text-sm leading-6 text-muted-foreground">{nextAction}</p></div>
          <div className="mt-5 flex flex-wrap gap-2"><Button type="button" onClick={() => onTabChange('documents')}>{copy.fixBlockers}</Button><Button type="button" variant="secondary" onClick={() => onTabChange('documents')}>{copy.preparePackage}</Button><Button type="button" variant="outline" onClick={onAskAi}><Bot className="size-4" />Ask Prime AI</Button></div>
        </div>
        <div className="rounded-2xl border bg-background/70 p-4">
          <div className="text-sm font-semibold">First-screen answer</div>
          <div className="mt-4 space-y-3 text-sm"><DecisionAnswer label="Am I ready?" value={`${readinessGrade(readinessScore)} / ${readinessScore}% — reviewable after blocker cleanup.`} /><DecisionAnswer label="What blocks me?" value={mainBlocker} /><DecisionAnswer label="What next?" value={nextAction} /></div>
          <Progress value={readinessScore} className="mt-5 h-2" />
        </div>
      </div>
    </section>
  );
}

function DecisionAnswer({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border bg-card p-3"><div className="text-xs font-medium text-muted-foreground">{label}</div><div className="mt-1 font-medium">{value}</div></div>; }

function readinessStatus(score: number) { return score >= 85 ? 'Strong' : score >= 72 ? 'Stable' : score >= 55 ? 'Watch' : 'Blocked'; }

function ReadinessBreakdownGrid({ signals }: { signals: EligibilitySignal[] }) {
  return <Card className="rounded-2xl"><CardHeader><CardTitle className="flex items-center gap-1.5 text-base">Readiness Breakdown<InfoHint label="Readiness Breakdown info">Compact diagnostics from verified operating sources.</InfoHint></CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2">{signals.map((signal) => <ReadinessMetricCard key={signal.label} signal={signal} />)}</CardContent></Card>;
}
function ReadinessMetricCard({ signal }: { signal: EligibilitySignal }) { const Icon=signal.icon; const status=readinessStatus(signal.score); return <div className="rounded-xl border bg-background p-3"><div className="flex items-start justify-between gap-2"><div><div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">{signal.label}<InfoHint label={`${signal.label} info`}>{signal.detail}</InfoHint></div><div className="mt-1 font-semibold">{signal.value}</div></div><Icon className="size-4 text-primary" /></div><div className="mt-3 flex items-center justify-between gap-2"><Badge variant="outline" className={status === 'Blocked' ? 'border-destructive/30 bg-destructive/10 text-destructive' : status === 'Watch' ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200'}>{status}</Badge><span className="text-sm font-semibold">{Math.round(signal.score)}%</span></div></div>; }

function EvidencePackageSnapshot({ evidencePack, onOpenEvidence }: { evidencePack: CommerceEvidencePack; onOpenEvidence: () => void }) { return <Card className="rounded-2xl"><CardHeader className="border-b"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle className="flex items-center gap-1.5 text-base">Evidence Package Snapshot<InfoHint label="Evidence Package Snapshot info">Summary only. Full source details live in Evidence.</InfoHint></CardTitle></div><Button type="button" variant="outline" size="sm" onClick={onOpenEvidence}>Open Evidence tab</Button></div></CardHeader><CardContent className="grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-5">{evidencePack.items.slice(0,5).map((item) => <div key={item.id} className="rounded-xl border bg-background p-3"><div className="flex items-center justify-between gap-2"><div className="font-medium line-clamp-1">{item.label}</div><Badge variant="outline" className={statusClass(item.status)}>{humanize(item.status)}</Badge></div><div className="mt-3 text-sm text-muted-foreground">{item.records} records</div><div className="mt-1 text-xs text-muted-foreground">Owner: {item.sourceOfTruthOwner}</div></div>)}</CardContent></Card>; }

function RiskBlockerPanel({ blockers, onTabChange }: { blockers: RiskBlocker[]; onTabChange: (tab: FinanceSupportTab) => void }) { return <Card className="rounded-2xl"><CardHeader><CardTitle className="flex items-center gap-1.5 text-base">Risk Blockers<InfoHint label="Risk Blockers info">Most important issues before partner review.</InfoHint></CardTitle></CardHeader><CardContent className="space-y-3">{blockers.map((blocker) => <div key={blocker.blocker} className="rounded-xl border bg-background p-3"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline" className={blocker.severity === 'high' ? 'border-destructive/30 bg-destructive/10 text-destructive' : 'bg-muted/30'}>{humanize(blocker.severity)}</Badge><span className="font-semibold">{blocker.blocker}</span></div><p className="mt-2 text-sm text-muted-foreground">Impact: {blocker.impact}</p><p className="mt-1 text-sm text-muted-foreground">Recommendation: {blocker.recommendation}</p><div className="mt-3 flex items-center justify-between text-xs text-muted-foreground"><span>Owner: Finance / Ops</span><Button type="button" size="sm" variant="outline" onClick={() => onTabChange('documents')}>Resolve</Button></div></div>)}</CardContent></Card>; }

function RecommendedRoutesPreview({ lenders, onTabChange }: { lenders: LenderMatch[]; onTabChange: (tab: FinanceSupportTab) => void }) { return <Card className="rounded-2xl"><CardHeader><div className="flex items-center justify-between gap-3"><div><CardTitle className="flex items-center gap-1.5 text-base">Recommended Review Routes<InfoHint label="Recommended Review Routes info">Preview only. No approval promise.</InfoHint></CardTitle></div><Button type="button" size="sm" variant="outline" onClick={() => onTabChange('routes')}>Compare routes</Button></div></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2">{lenders.map((lender) => <ReviewRouteCard key={lender.id} lender={lender} compact />)}</CardContent></Card>; }

function EvidenceTab({ evidencePack, signals, onTabChange }: { evidencePack: CommerceEvidencePack; signals: EligibilitySignal[]; onTabChange: (tab: FinanceSupportTab) => void }) { return <div id="commerce-evidence-pack" className="space-y-4"><Card className="rounded-2xl"><CardHeader><CardTitle>Evidence mapped to verified operating sources</CardTitle><p className="text-sm text-muted-foreground">Coverage: {evidencePack.summary}</p></CardHeader><CardContent className="grid gap-3 md:grid-cols-3"><MiniFact label="Evidence quality score" value={`${Math.round(signals.reduce((sum, item) => sum + item.score, 0) / Math.max(1, signals.length))}%`} /><MiniFact label="Reusable evidence" value={`${evidencePack.reusableDocumentCount} document(s)`} /><MiniFact label="Open issues" value={`${evidencePack.openIssueCount} issue(s)`} /></CardContent></Card><EvidenceSourceTable evidencePack={evidencePack} onTabChange={onTabChange} /></div>; }
function EvidenceSourceTable({ evidencePack, onTabChange }: { evidencePack: CommerceEvidencePack; onTabChange: (tab: FinanceSupportTab) => void }) { return <Card className="rounded-2xl"><CardHeader><CardTitle className="text-base">Evidence source lines</CardTitle></CardHeader><CardContent className="overflow-x-auto p-0"><table className="w-full min-w-[860px] text-sm"><thead className="border-b bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="p-3">Evidence group</th><th className="p-3">Source owner</th><th className="p-3">Records</th><th className="p-3">Status</th><th className="p-3">Readiness dimension</th><th className="p-3">Action</th></tr></thead><tbody className="divide-y">{evidencePack.items.map((item) => <tr key={item.id}><td className="p-3 font-medium">{item.label}<div className="mt-1 text-xs text-muted-foreground">{item.summary}</div></td><td className="p-3">{item.sourceOfTruthOwner}</td><td className="p-3">{item.records}</td><td className="p-3"><Badge variant="outline" className={statusClass(item.status)}>{humanize(item.status)}</Badge></td><td className="p-3">{humanize(item.category)}</td><td className="p-3"><Button type="button" size="sm" variant="outline" onClick={() => onTabChange('audit')}>Open source records</Button></td></tr>)}</tbody></table></CardContent></Card>; }

function DocumentsTab({ documents, verifiedDocs, missingDocs, lenders, onDrop, onFiles }: { documents: FinancingDocument[]; verifiedDocs: number; missingDocs: number; lenders: LenderMatch[]; onDrop: (event: DragEvent<HTMLDivElement>) => void; onFiles: (files: FileList | null) => void }) { return <div className="space-y-4"><Card className="rounded-2xl"><CardHeader><CardTitle>Document completeness</CardTitle><p className="text-sm text-muted-foreground">{verifiedDocs}/{documents.length} verified or reusable. {missingDocs} missing/rejected blocker(s).</p></CardHeader><CardContent><Progress value={(verifiedDocs / Math.max(1, documents.length)) * 100} className="h-2" /></CardContent></Card><DocumentSubmissionCenter documents={documents} verifiedDocs={verifiedDocs} onDrop={onDrop} onFiles={onFiles} /><DocumentRequirementList documents={documents} lenders={lenders} /></div>; }
function DocumentRequirementList({ documents, lenders }: { documents: FinancingDocument[]; lenders: LenderMatch[] }) { return <Card className="rounded-2xl"><CardHeader><CardTitle className="text-base">Document mapping to review routes</CardTitle></CardHeader><CardContent className="divide-y p-0">{documents.map((doc) => <div key={doc.id} className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_180px]"><div><div className="flex flex-wrap items-center gap-2"><span className="font-medium">{doc.label}</span><Badge variant="outline" className={statusClass(doc.status)}>{humanize(doc.status)}</Badge></div><p className="mt-1 text-sm text-muted-foreground">Required by: {(doc.banks.length ? doc.banks : lenders.slice(0, 2).map((lender) => lender.bankName)).join(', ')}</p>{doc.issue ? <p className="mt-1 text-sm text-destructive">Issue: {doc.issue}</p> : null}<p className="mt-1 text-xs text-muted-foreground">Last updated: {doc.fileName ? 'May 13, 2026' : 'Pending upload'}</p></div><Button type="button" variant="outline" size="sm">{doc.status === 'missing' ? 'Upload' : doc.status === 'rejected' ? 'Replace' : doc.status === 'verifying' ? 'Verify' : 'View'}</Button></div>)}</CardContent></Card>; }

function ReviewRoutesTab({ lenders, documents, blockers }: { lenders: LenderMatch[]; documents: FinancingDocument[]; blockers: RiskBlocker[] }) { return <div id="lenders" className="space-y-4"><div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">Preview only. No approval promise. Eligibility and underwriting depend on partner review.</div><div className="grid gap-3 md:grid-cols-2">{lenders.map((lender) => <ReviewRouteCard key={lender.id} lender={lender} blockers={blockers} />)}</div><ReviewRouteComparisonTable lenders={lenders} documents={documents} /></div>; }
function ReviewRouteCard({ lender, blockers, compact }: { lender: LenderMatch; blockers?: RiskBlocker[]; compact?: boolean }) { return <Card className="rounded-2xl"><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-1.5 text-base">{lender.bankName}<InfoHint label={`${lender.bankName} info`}>{lender.financingType}</InfoHint></CardTitle></div><Badge variant="outline">{Math.round(lender.matchPercent)}%</Badge></div></CardHeader><CardContent className="space-y-3 text-sm"><MiniFact label="Indicative range" value={lender.estimatedRange} /><MiniFact label="Review window" value={lender.reviewWindow} />{!compact ? <><div><div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Main requirements</div><ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">{lender.requirements.map((item) => <li key={item}>{item}</li>)}</ul></div><div className="text-muted-foreground">Missing requirements: {blockers?.[0]?.blocker || 'No critical missing requirement'}</div><Button type="button" className="w-full" variant="outline">View route</Button></> : <Button type="button" size="sm" variant="outline">View route</Button>}</CardContent></Card>; }
function ReviewRouteComparisonTable({ lenders, documents }: { lenders: LenderMatch[]; documents: FinancingDocument[] }) { const missing=documents.filter((doc)=>doc.status==='missing'||doc.status==='rejected').length; return <Card className="rounded-2xl"><CardHeader><CardTitle className="text-base">Route comparison</CardTitle></CardHeader><CardContent className="overflow-x-auto p-0"><table className="w-full min-w-[900px] text-sm"><thead className="border-b bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="p-3">Route</th><th className="p-3">Funding type</th><th className="p-3">Indicative range</th><th className="p-3">Review window</th><th className="p-3">Evidence required</th><th className="p-3">Missing docs</th><th className="p-3">Match</th><th className="p-3">Status</th></tr></thead><tbody className="divide-y">{lenders.map((lender)=><tr key={lender.id}><td className="p-3 font-medium">{lender.bankName}</td><td className="p-3">{lender.financingType}</td><td className="p-3">{lender.estimatedRange}</td><td className="p-3">{lender.reviewWindow}</td><td className="p-3">{lender.requirements.join(', ')}</td><td className="p-3">{missing}</td><td className="p-3">{Math.round(lender.matchPercent)}%</td><td className="p-3"><Badge variant="outline">Preview</Badge></td></tr>)}</tbody></table></CardContent></Card>; }

function ApplicationsTab({ applications, documents }: { applications: ApplicationItem[]; documents: FinancingDocument[] }) { return <div id="status" className="space-y-4"><Card id="funding-application-flow" className="rounded-2xl"><CardHeader><CardTitle>Funding application tracker</CardTitle><p className="text-sm text-muted-foreground">Drafts, partner milestones, pending requirements, and internal notes.</p></CardHeader><CardContent className="grid gap-3 md:grid-cols-3"><MiniFact label="Applications" value={String(applications.length)} /><MiniFact label="Pending requirements" value={String(documents.filter((doc)=>doc.status==='missing'||doc.status==='rejected').length)} /><MiniFact label="Next action" value={applications[0]?.nextAction || 'No active application'} /></CardContent></Card><ApplicationStatusTracker applications={applications} /><ApplicationTimeline applications={applications} /></div>; }
function ApplicationTimeline({ applications }: { applications: ApplicationItem[] }) { return <Card className="rounded-2xl"><CardHeader><CardTitle className="text-base">Partner milestones</CardTitle></CardHeader><CardContent className="space-y-3">{applications.map((app, index)=><div key={app.lender} className="flex gap-3 rounded-xl border bg-background p-3"><div className="flex size-8 shrink-0 items-center justify-center rounded-full border bg-muted/30 text-sm font-semibold">{index+1}</div><div><div className="font-medium">{app.lender} — {app.status}</div><p className="mt-1 text-sm text-muted-foreground">{app.timeline}. Next: {app.nextAction}. Owner: Finance lead.</p></div></div>)}</CardContent></Card>; }

function AuditTab({ auditEvents, readinessScore }: { auditEvents: Array<{ timestamp: string; eventType: string; source: string; description: string; actor: string }>; readinessScore: number }) { return <div className="space-y-4"><Card className="rounded-2xl"><CardHeader><CardTitle>Traceability and confidence history</CardTitle><p className="text-sm text-muted-foreground">Current readiness score: {readinessScore}%. Audit supports enterprise trust, not lender approval.</p></CardHeader></Card><AuditTrailTable auditEvents={auditEvents} /></div>; }
function AuditTrailTable({ auditEvents }: { auditEvents: Array<{ timestamp: string; eventType: string; source: string; description: string; actor: string }> }) { return <Card className="rounded-2xl"><CardHeader><CardTitle className="text-base">Audit trail</CardTitle></CardHeader><CardContent className="overflow-x-auto p-0"><table className="w-full min-w-[820px] text-sm"><thead className="border-b bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="p-3">Timestamp</th><th className="p-3">Event</th><th className="p-3">Source</th><th className="p-3">Description</th><th className="p-3">Actor</th></tr></thead><tbody className="divide-y">{auditEvents.map((event, index)=><tr key={`${event.eventType}-${index}`}><td className="p-3">{formatShortDate(event.timestamp)}</td><td className="p-3 font-medium">{event.eventType}</td><td className="p-3">{event.source}</td><td className="p-3 text-muted-foreground">{event.description}</td><td className="p-3">{event.actor}</td></tr>)}</tbody></table></CardContent></Card>; }

function PrimeAiPanel({ title, actions, prompt, onPromptChange, onAskAi }: { title: string; actions: string[]; prompt: string; onPromptChange: (value: string) => void; onAskAi: () => void }) { return <Card className="rounded-2xl"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Bot className="size-4" />{title}</CardTitle><p className="text-sm text-muted-foreground">Contextual assistant. It explains evidence and drafts summaries; it does not make credit decisions.</p></CardHeader><CardContent className="space-y-3"><div className="space-y-2">{actions.map((action)=><button key={action} type="button" onClick={() => onPromptChange(action)} className="flex w-full items-center gap-2 rounded-lg border bg-background p-2 text-left text-sm hover:bg-muted/40"><Sparkles className="size-4 text-primary" />{action}</button>)}</div><Textarea value={prompt} onChange={(event)=>onPromptChange(event.target.value)} className="min-h-[96px]" /><Button type="button" className="w-full justify-between" onClick={onAskAi}>Ask Prime AI<Send className="size-4" /></Button></CardContent></Card>; }

function FinSupportHero({
  readinessScore,
  eligibleRange,
  lenderCount,
  blocker,
  loading,
  degraded,
  onAskAi,
  onOpenLoanWizard,
}: {
  readinessScore: number;
  eligibleRange: string;
  lenderCount: number;
  blocker: string;
  loading: boolean;
  degraded: boolean;
  onAskAi: () => void;
  onOpenLoanWizard: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="grid gap-4 p-4 md:p-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(520px,0.85fr)]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-full">Fin Support</Badge>
            <Badge variant="outline" className="rounded-full">Funding review package</Badge>
            {loading ? <Badge variant="outline" className="rounded-full">Refreshing</Badge> : null}
            {degraded ? <Badge variant="outline" className="rounded-full">{copy.usingLocalSnapshot}</Badge> : null}
          </div>
          <h1 className="mt-4 max-w-4xl text-3xl font-semibold tracking-tight md:text-4xl">
            Prepare a funding review package from your commerce operations.
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            PrimeOS organizes order stability, fulfillment performance, settlement consistency, inventory movement, and customer trust into evidence for lender review.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild>
              <a href="#funding-application-flow">
                Prepare Review Package
                <ArrowRight className="size-4" />
              </a>
            </Button>
            <Button type="button" variant="secondary" onClick={onOpenLoanWizard}>
              <FileCheck2 className="size-4" />
              Start Funding Readiness Wizard
            </Button>
            <Button type="button" variant="outline" onClick={onAskAi} className="hidden sm:inline-flex">
              <Bot className="size-4" />
              Ask Prime AI
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border bg-muted/20 p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Funding Readiness</div>
            <div className="mt-2 flex items-end gap-3">
              <div className="text-5xl font-semibold tracking-tight">{readinessGrade(readinessScore)}</div>
              <div className="pb-1 text-sm text-muted-foreground">{readinessScore}% score</div>
            </div>
            <Progress value={readinessScore} className="mt-4 h-2" />
          </div>
          <HeroFact label="Indicative need range" value={eligibleRange} icon={<Banknote className="size-4" />} />
          <HeroFact label="Review routes" value={String(lenderCount)} icon={<Building2 className="size-4" />} />
          <HeroFact label="Main blocker" value={blocker} icon={<AlertTriangle className="size-4" />} />
        </div>
      </div>
    </section>
  );
}

function LoanProfileWizard({
  open,
  stepIndex,
  readinessScore,
  eligibleRange,
  draft,
  lenders,
  blockers,
  documents,
  applications,
  onFiles,
  onOpenChange,
  onStepChange,
  onDraftChange,
  onAskAi,
}: {
  open: boolean;
  stepIndex: number;
  readinessScore: number;
  eligibleRange: string;
  draft: LoanProfileDraft;
  lenders: LenderMatch[];
  blockers: RiskBlocker[];
  documents: FinancingDocument[];
  applications: ApplicationItem[];
  onFiles: (files: FileList | null) => void;
  onOpenChange: (open: boolean) => void;
  onStepChange: (step: number) => void;
  onDraftChange: (field: keyof LoanProfileDraft, value: string) => void;
  onAskAi: () => void;
}) {
  const currentStep = loanWizardSteps[stepIndex] ?? loanWizardSteps[0];
  const StepIcon = currentStep.icon;
  const wizardBodyRef = useRef<HTMLDivElement | null>(null);
  const isFinalStep = stepIndex === loanWizardSteps.length - 1;
  const wizardProgress = ((stepIndex + 1) / loanWizardSteps.length) * 100;
  const missingDocumentCount = japanLoanDocuments.filter((doc) => {
    const mappedDocument = doc.linkedDocumentId ? documents.find((item) => item.id === doc.linkedDocumentId) : undefined;
    const status = mappedDocument?.status ?? doc.fallbackStatus;
    return status === 'missing' || status === 'rejected';
  }).length;
  const primaryLender = lenders[0];

  const goBack = () => onStepChange(Math.max(0, stepIndex - 1));
  const goNext = () => onStepChange(Math.min(loanWizardSteps.length - 1, stepIndex + 1));
  const submitPreCheck = () => {
    onStepChange(0);
    onOpenChange(false);
  };

  useEffect(() => {
    wizardBodyRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, [currentStep.id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="z-[190]"
        className="z-[200] top-[calc(var(--header-height)+3.75rem)] grid max-h-[calc(100dvh-var(--header-height)-5rem)] w-[min(1120px,calc(100vw-3rem))] !max-w-[1120px] grid-rows-[auto_minmax(0,1fr)] translate-y-0 overflow-hidden rounded-[1.75rem] border bg-background p-0 shadow-2xl"
      >
        <DialogHeader className="min-w-0 border-b bg-card px-5 py-4 pr-12 md:px-6 md:pr-16">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="rounded-full">Japan SME pre-check</Badge>
                <Badge variant="outline" className="rounded-full">{readinessGrade(readinessScore)} readiness</Badge>
                <Badge variant="outline" className="rounded-full">{eligibleRange}</Badge>
              </div>
              <DialogTitle className="mt-3 flex items-center gap-2 text-2xl tracking-tight">
                <StepIcon className="size-5 text-primary" />
                Funding Readiness Wizard
              </DialogTitle>
              <DialogDescription className="mt-1 max-w-3xl">
                Build a funding review package from commerce signals, Japan SME documents, and partner-bank routing.
              </DialogDescription>
            </div>
            <div className="min-w-[180px] rounded-2xl border bg-background/80 p-3 lg:mr-8">
              <div className="flex items-center justify-between text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                <span>Progress</span>
                <span>{stepIndex + 1}/{loanWizardSteps.length}</span>
              </div>
              <Progress value={wizardProgress} className="mt-2 h-1.5" />
            </div>
          </div>
        </DialogHeader>

        <div className="grid min-h-0 min-w-0 overflow-hidden md:grid-cols-[250px_minmax(0,1fr)]">
          <aside className="hidden min-h-0 overflow-y-auto border-r bg-muted/15 p-3 md:block">
            <div className="space-y-1.5">
              {loanWizardSteps.map((step, index) => {
                const Icon = step.icon;
                const active = index === stepIndex;

                return (
                  <button
                    key={step.id}
                    type="button"
                    aria-label={`Open ${step.title} step`}
                    aria-current={active ? 'step' : undefined}
                    onClick={() => onStepChange(index)}
                    className={cn(
                      'w-full rounded-xl border px-3 py-2.5 text-left transition-colors',
                      active ? 'border-primary/35 bg-primary/10 text-foreground shadow-sm ring-2 ring-primary/10' : 'border-transparent text-muted-foreground hover:border-border hover:bg-background',
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2 text-sm font-semibold">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border bg-background text-xs">{index + 1}</span>
                      <Icon className="size-4 shrink-0" />
                      <span className="min-w-0 leading-snug">{step.title}</span>
                    </div>
                    <p className="mt-1 line-clamp-1 pl-9 text-xs leading-5">{step.summary}</p>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="flex min-h-0 min-w-0 flex-col">
            <div className="min-w-0 border-b p-3 md:hidden">
              <div className="scrollbar-visible flex max-w-full gap-2 overflow-x-auto overflow-y-hidden pb-1">
                {loanWizardSteps.map((step, index) => (
                  <button
                    key={step.id}
                    type="button"
                    aria-label={`Open ${step.title} step`}
                    onClick={() => onStepChange(index)}
                    className={cn(
                      'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium',
                      index === stepIndex ? 'border-primary/40 bg-primary/10 text-primary' : 'bg-background text-muted-foreground',
                    )}
                  >
                    {index + 1}. {step.title}
                  </button>
                ))}
              </div>
            </div>

            <div ref={wizardBodyRef} className="min-h-0 flex-1 overflow-y-auto p-4 pb-20 md:p-6 md:pb-8">
              <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_220px] 2xl:items-start">
                <LoanWizardStepContent
                  stepId={currentStep.id}
                  draft={draft}
                  readinessScore={readinessScore}
                  eligibleRange={eligibleRange}
                  lenders={lenders}
                  primaryLender={primaryLender}
                  blockers={blockers}
                  documents={documents}
                  applications={applications}
                  missingDocumentCount={missingDocumentCount}
                  onFiles={onFiles}
                  onDraftChange={onDraftChange}
                />
                <LoanWizardMoodPanel stepId={currentStep.id} stepIndex={stepIndex} />
              </div>
            </div>

            <DialogFooter className="min-w-0 border-t bg-card px-4 py-3 md:px-6 sm:justify-between">
              <div className="flex min-w-0 flex-wrap gap-2">
                <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
                  Save draft
                </Button>
                <Button type="button" variant="ghost" className="rounded-xl" onClick={onAskAi}>
                  <Bot className="size-4" />
                  Ask Prime AI
                </Button>
              </div>
              <div className="flex min-w-0 flex-wrap gap-2">
                <Button type="button" variant="outline" className="rounded-xl" onClick={goBack} disabled={stepIndex === 0}>
                  <ChevronLeft className="size-4" />
                  Back
                </Button>
                <Button type="button" className="rounded-xl px-5" onClick={isFinalStep ? submitPreCheck : goNext}>
                  {isFinalStep ? 'Submit pre-check' : 'Next'}
                  {!isFinalStep ? <ArrowRight className="size-4" /> : <CheckCircle2 className="size-4" />}
                </Button>
              </div>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LoanWizardMoodPanel({ stepId, stepIndex }: { stepId: LoanWizardStepId; stepIndex: number }) {
  const mood = loanWizardMoodCopy[stepId];

  return (
    <aside className="order-first overflow-hidden rounded-2xl border bg-gradient-to-br from-background via-muted/20 to-primary/5 p-3 shadow-sm 2xl:order-none">
      <LoanWizardMotionStyles />
      <div className="flex items-center justify-between gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <span className="whitespace-nowrap">Step {stepIndex + 1} calm flow</span>
        <Badge variant="outline" className="whitespace-nowrap rounded-full bg-background/70">Saved</Badge>
      </div>
      <div className="grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)] 2xl:block">
        <LoanWizardIllustration stepId={stepId} ariaLabel={mood.ariaLabel} />
        <div>
      <div className="mt-3 2xl:mt-3">
        <h3 className="text-sm font-semibold">{mood.title}</h3>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">{mood.detail}</p>
      </div>
      <div className="mt-3 rounded-lg border bg-background/70 p-2 text-xs leading-5 text-muted-foreground">
        {mood.reassurance}
      </div>
        </div>
      </div>
    </aside>
  );
}

function LoanWizardMotionStyles() {
  return (
    <style>
      {`
        @keyframes primeLoanFloat {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(0, -7px, 0); }
        }
        @keyframes primeLoanSlide {
          0%, 100% { transform: translate3d(-10px, 0, 0); opacity: .65; }
          45%, 55% { transform: translate3d(18px, 12px, 0); opacity: 1; }
        }
        @keyframes primeLoanPulse {
          0%, 100% { transform: scale(1); opacity: .72; }
          50% { transform: scale(1.06); opacity: 1; }
        }
        @keyframes primeLoanStamp {
          0%, 100% { transform: scale(.96) rotate(-2deg); opacity: .78; }
          45%, 60% { transform: scale(1.03) rotate(0deg); opacity: 1; }
        }
        @keyframes primeLoanBar {
          0%, 100% { transform: scaleY(.55); opacity: .55; }
          45%, 60% { transform: scaleY(1); opacity: 1; }
        }
        @keyframes primeLoanPath {
          from { stroke-dashoffset: 30; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes primeLoanCheck {
          0%, 28% { transform: scale(.82); opacity: .35; }
          42%, 100% { transform: scale(1); opacity: 1; }
        }
        @keyframes primeLoanDot {
          0%, 100% { transform: translateX(0); opacity: .65; }
          50% { transform: translateX(76px); opacity: 1; }
        }
        .prime-loan-anim .prime-loan-float { animation: primeLoanFloat 3.4s ease-in-out infinite; }
        .prime-loan-anim .prime-loan-slide { animation: primeLoanSlide 3.2s ease-in-out infinite; }
        .prime-loan-anim .prime-loan-pulse { animation: primeLoanPulse 2.4s ease-in-out infinite; }
        .prime-loan-anim .prime-loan-stamp { animation: primeLoanStamp 3s ease-in-out infinite; }
        .prime-loan-anim .prime-loan-bar { animation: primeLoanBar 2.2s ease-in-out infinite; transform-origin: bottom; }
        .prime-loan-anim .prime-loan-path { animation: primeLoanPath 2.8s linear infinite; stroke-dasharray: 6 8; }
        .prime-loan-anim .prime-loan-check { animation: primeLoanCheck 3.2s ease-in-out infinite; }
        .prime-loan-anim .prime-loan-dot { animation: primeLoanDot 3s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .prime-loan-anim *, .prime-loan-anim .prime-loan-path {
            animation: none !important;
            transition: none !important;
          }
        }
      `}
    </style>
  );
}

function LoanWizardIllustration({ stepId, ariaLabel }: { stepId: LoanWizardStepId; ariaLabel: string }) {
  const shellClass = 'prime-loan-anim relative mt-3 h-28 overflow-hidden rounded-xl border bg-background/80 2xl:h-32';
  const glow = <div className="absolute inset-x-8 top-6 h-20 rounded-full bg-primary/10 blur-2xl" />;

  if (stepId === 'profile') {
    return (
      <div className={shellClass} role="img" aria-label={ariaLabel}>
        {glow}
        <div className="absolute left-5 top-7 flex size-14 items-center justify-center rounded-xl border bg-card shadow-sm">
          <Building2 className="size-7 text-primary" />
        </div>
        <div className="prime-loan-float absolute right-7 top-6 w-20 rounded-lg border bg-card p-2 shadow-sm">
          <FileText className="size-5 text-primary" />
          <div className="mt-2 space-y-1">
            <span className="block h-1.5 rounded-full bg-muted" />
            <span className="block h-1.5 w-3/4 rounded-full bg-muted" />
          </div>
        </div>
        <div className="prime-loan-stamp absolute bottom-5 left-8 inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="size-3" />
          Ready
        </div>
      </div>
    );
  }

  if (stepId === 'purpose') {
    return (
      <div className={shellClass} role="img" aria-label={ariaLabel}>
        {glow}
        <div className="absolute bottom-5 left-8 right-8 h-10 rounded-xl border bg-muted/30" />
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="prime-loan-slide absolute top-8 flex size-10 items-center justify-center rounded-full border bg-amber-500/15 text-amber-700 shadow-sm dark:text-amber-300"
            style={{ left: `${22 + index * 34}px`, animationDelay: `${index * 180}ms` }}
          >
            <CircleDollarSign className="size-5" />
          </div>
        ))}
        <div className="absolute bottom-8 right-9 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
          <Banknote className="size-4 text-primary" />
          Use of funds
        </div>
      </div>
    );
  }

  if (stepId === 'commerce') {
    return (
      <div className={shellClass} role="img" aria-label={ariaLabel}>
        {glow}
        <div className="absolute bottom-7 left-7 flex h-20 items-end gap-2">
          {[38, 58, 76, 50].map((height, index) => (
            <span
              key={height}
              className="prime-loan-bar w-4 rounded-t-md bg-primary/60"
              style={{ height, animationDelay: `${index * 140}ms` }}
            />
          ))}
        </div>
        <div className="prime-loan-pulse absolute right-7 top-9 flex size-16 items-center justify-center rounded-2xl border bg-card shadow-sm">
          <ShieldCheck className="size-8 text-emerald-600 dark:text-emerald-400" />
        </div>
      </div>
    );
  }

  if (stepId === 'documents') {
    return (
      <div className={shellClass} role="img" aria-label={ariaLabel}>
        {glow}
        <div className="absolute bottom-6 left-7 right-7 h-16 rounded-2xl border bg-card shadow-sm">
          <div className="absolute -top-3 left-5 h-5 w-16 rounded-t-lg border bg-card" />
          <Upload className="absolute bottom-4 right-5 size-5 text-primary" />
        </div>
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="prime-loan-slide absolute top-6 w-14 rounded-lg border bg-background p-2 shadow-sm"
            style={{ left: `${24 + index * 26}px`, animationDelay: `${index * 200}ms` }}
          >
            <span className="block h-1.5 rounded-full bg-muted" />
            <span className="mt-1 block h-1.5 w-2/3 rounded-full bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (stepId === 'routing') {
    return (
      <div className={shellClass} role="img" aria-label={ariaLabel}>
        {glow}
        <svg className="absolute inset-0 size-full text-primary/45" viewBox="0 0 260 144" aria-hidden="true">
          <path className="prime-loan-path" d="M58 74 C96 28 146 112 204 60" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
        {[
          { label: 'A', left: 'left-7', top: 'top-14' },
          { label: 'B', left: 'left-[108px]', top: 'top-8' },
          { label: 'C', left: 'right-7', top: 'top-12' },
        ].map((node, index) => (
          <div
            key={node.label}
            className={cn('prime-loan-pulse absolute flex size-12 items-center justify-center rounded-xl border bg-card shadow-sm', node.left, node.top)}
            style={{ animationDelay: `${index * 240}ms` }}
          >
            <Building2 className="size-6 text-primary" />
          </div>
        ))}
      </div>
    );
  }

  if (stepId === 'review') {
    return (
      <div className={shellClass} role="img" aria-label={ariaLabel}>
        {glow}
        <div className="absolute inset-x-7 top-6 space-y-2 rounded-xl border bg-card p-3 shadow-sm">
          {['Identity', 'Documents', 'Consent'].map((item, index) => (
            <div key={item} className="flex items-center gap-2 rounded-lg bg-muted/25 px-2 py-1.5">
              <CheckCircle2
                className="prime-loan-check size-4 text-emerald-600 dark:text-emerald-400"
                style={{ animationDelay: `${index * 260}ms` }}
              />
              <span className="text-xs font-medium text-muted-foreground">{item}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={shellClass} role="img" aria-label={ariaLabel}>
      {glow}
      <div className="absolute left-8 right-8 top-16 h-1 rounded-full bg-muted" />
      <div className="prime-loan-dot absolute left-8 top-[58px] flex size-5 items-center justify-center rounded-full border bg-primary text-primary-foreground shadow-sm">
        <span className="size-1.5 rounded-full bg-current" />
      </div>
      {['Draft', 'Review', 'Funds'].map((item, index) => (
        <div
          key={item}
          className="absolute top-[78px] text-center text-[11px] font-medium text-muted-foreground"
          style={{ left: `${24 + index * 75}px` }}
        >
          <span className="mx-auto mb-1 block size-2 rounded-full bg-primary/60" />
          {item}
        </div>
      ))}
    </div>
  );
}

function LoanWizardStepContent({
  stepId,
  draft,
  readinessScore,
  eligibleRange,
  lenders,
  primaryLender,
  blockers,
  documents,
  applications,
  missingDocumentCount,
  onFiles,
  onDraftChange,
}: {
  stepId: LoanWizardStepId;
  draft: LoanProfileDraft;
  readinessScore: number;
  eligibleRange: string;
  lenders: LenderMatch[];
  primaryLender?: LenderMatch;
  blockers: RiskBlocker[];
  documents: FinancingDocument[];
  applications: ApplicationItem[];
  missingDocumentCount: number;
  onFiles: (files: FileList | null) => void;
  onDraftChange: (field: keyof LoanProfileDraft, value: string) => void;
}) {
  if (stepId === 'profile') {
    return (
      <div className="space-y-4">
        <WizardSectionHeader
          title="Confirm registered business identity"
          detail="Japan SME lenders usually start with legal identity, representative authority, business address, and operating history before formal lender review."
        />
        <div className="grid gap-3 md:grid-cols-2">
          <WizardField label="Legal business name" value={draft.legalName} onChange={(value) => onDraftChange('legalName', value)} />
          <WizardField label="Corporate number" value={draft.corporateNumber} onChange={(value) => onDraftChange('corporateNumber', value)} />
          <WizardField label="Representative / owner" value={draft.representative} onChange={(value) => onDraftChange('representative', value)} />
          <MiniFact label="Readiness grade" value={`${readinessGrade(readinessScore)} / ${readinessScore}%`} />
        </div>
        <WizardCallout
          label="PrimeOS role"
          detail="PrimeOS prepares the funding profile and routes evidence. Final credit decision, terms, contract, and any funding movement stay with the lender or guarantee institution."
        />
      </div>
    );
  }

  if (stepId === 'purpose') {
    return (
      <div className="space-y-4">
        <WizardSectionHeader
          title="Define use of funds and repayment path"
          detail="This keeps the application closer to working-capital, inventory, campaign, export, or equipment financing instead of generic borrowing."
        />
        <div className="grid gap-3 md:grid-cols-2">
          <WizardField label="Requested amount" value={draft.requestedAmount} onChange={(value) => onDraftChange('requestedAmount', value)} />
          <WizardField label="Target review timing" value={draft.targetReviewTiming} onChange={(value) => onDraftChange('targetReviewTiming', value)} />
          <WizardField label="Funding purpose" value={draft.fundingPurpose} onChange={(value) => onDraftChange('fundingPurpose', value)} className="md:col-span-2" />
          <WizardField label="Repayment source" value={draft.repaymentSource} onChange={(value) => onDraftChange('repaymentSource', value)} className="md:col-span-2" />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <MiniFact label="Indicative need range" value={eligibleRange} />
          <MiniFact label="Primary review route" value={primaryLender?.bankName || 'Pending'} />
          <MiniFact label="Estimated review window" value={primaryLender?.reviewWindow || 'After pre-check'} />
        </div>
      </div>
    );
  }

  if (stepId === 'commerce') {
    const proofSignals = [
      { label: 'Order stability', detail: 'Order cadence and fulfillment history support revenue predictability.', score: readinessScore },
      { label: 'Settlement consistency', detail: 'Payout records show repayment capacity and account movement.', score: clamp(readinessScore - 4) },
      { label: 'Inventory turnover', detail: 'Stock movement proves capital can convert back into orders.', score: clamp(readinessScore - 8) },
      { label: 'Refund / service pressure', detail: 'Low exception pressure protects lender confidence.', score: clamp(readinessScore - 6) },
    ];

    return (
      <div className="space-y-4">
        <WizardSectionHeader
          title="Attach operating evidence"
          detail="This is where PrimeOS differs from a finance dashboard: lender-review evidence comes from commerce execution, not static KPI reporting."
        />
        <div className="grid gap-3 md:grid-cols-2">
          {proofSignals.map((signal) => (
            <div key={signal.label} className="rounded-lg border bg-background p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">{signal.label}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{signal.detail}</p>
                </div>
                <Badge variant="outline" className="bg-primary/10 text-primary">{signal.score}%</Badge>
              </div>
              <Progress value={signal.score} className="mt-3 h-1.5" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (stepId === 'documents') {
    return (
      <div className="space-y-4">
        <WizardSectionHeader
          title="Prepare one reusable document pack"
          detail="Merchant uploads once. PrimeOS maps the same verified documents to partner banks, guarantee-backed routes, and direct lender requests."
        />
        <div className="divide-y rounded-lg border">
          {japanLoanDocuments.map((doc) => {
            const mappedDocument = doc.linkedDocumentId ? documents.find((item) => item.id === doc.linkedDocumentId) : undefined;
            const status = mappedDocument?.status ?? doc.fallbackStatus;

            return (
              <div key={doc.id} className="grid gap-3 p-3 md:grid-cols-[minmax(0,1fr)_140px] md:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{doc.label}</span>
                    <Badge variant="outline" className={statusClass(status)}>{humanize(status)}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{doc.detail}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{doc.lenderUse}{mappedDocument?.fileName ? ` / ${mappedDocument.fileName}` : ''}</p>
                </div>
                <label className="inline-flex h-8 cursor-pointer items-center justify-center rounded-md border border-border bg-transparent px-3 text-[13px] font-medium transition-colors hover:border-muted-foreground/45 hover:bg-accent">
                  Attach
                  <input
                    type="file"
                    className="hidden"
                    onChange={(event: ChangeEvent<HTMLInputElement>) => onFiles(event.target.files)}
                  />
                </label>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (stepId === 'routing') {
    const routingOptions = [
      {
        label: 'Partner bank route',
        detail: `${primaryLender?.bankName || 'Matched bank'} receives the profile, document pack, and operating proof first.`,
        status: primaryLender ? `${primaryLender.matchPercent}% match` : 'Pending match',
      },
      {
        label: 'Credit guarantee route',
        detail: 'PrimeOS prepares a guarantee-friendly package when the bank needs third-party SME credit support.',
        status: missingDocumentCount ? `${missingDocumentCount} docs before routing` : 'Ready to route',
      },
      {
        label: 'JFC-style direct review',
        detail: 'Use when working capital or equipment purpose fits a public-finance style review path.',
        status: 'Interview likely',
      },
    ];

    return (
      <div className="space-y-4">
        <WizardSectionHeader
          title="Select lender and guarantee path"
          detail="The page behaves like financing orchestration: PrimeOS packages one merchant file, then routes to suitable capital providers."
        />
        <div className="grid gap-3">
          {routingOptions.map((option) => (
            <div key={option.label} className="rounded-lg border bg-background p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{option.label}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{option.detail}</p>
                </div>
                <Badge variant="outline" className="bg-muted/30">{option.status}</Badge>
              </div>
            </div>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {lenders.slice(0, 2).map((lender) => (
            <MiniFact key={lender.id} label={lender.bankName} value={`${lender.financingType} / ${lender.estimatedRange}`} />
          ))}
        </div>
      </div>
    );
  }

  if (stepId === 'review') {
    return (
      <div className="space-y-4">
        <WizardSectionHeader
        title="Review package before pre-check"
          detail="No approval promise. This step confirms consent, missing evidence, and what PrimeOS can share with potential review routes."
        />
        <div className="grid gap-3 md:grid-cols-2">
          <MiniFact label="Applicant" value={draft.legalName} />
          <MiniFact label="Requested amount" value={draft.requestedAmount} />
          <MiniFact label="Funding purpose" value={draft.fundingPurpose} />
          <MiniFact label="Review routes" value={`${lenders.length} partners`} />
        </div>
        <div className="space-y-2 rounded-lg border bg-background p-3">
          {[
            'Share uploaded documents with selected partner lenders.',
            'Share PrimeOS operating signals for readiness review.',
            'Allow additional-document requests to appear in Application Status Tracker.',
          ].map((item) => (
            <div key={item} className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="mt-0.5 size-4 text-emerald-500" />
              <span>{item}</span>
            </div>
          ))}
        </div>
        {blockers.length ? (
          <WizardCallout label="Open blockers" detail={blockers.slice(0, 2).map((blocker) => blocker.blocker).join(' / ')} />
        ) : null}
      </div>
    );
  }

  const timeline = [
    { label: 'Pre-check', detail: 'PrimeOS validates profile, documents, and route fit.' },
    { label: 'Need additional documents', detail: 'Missing tax, statement, invoice, or guarantee documents are requested.' },
    { label: 'Bank / guarantee review', detail: 'Partner lender performs formal credit and guarantee review.' },
    { label: 'Contract handoff', detail: 'Any proposed terms move to lender contract and representative confirmation outside PrimeOS decisioning.' },
    { label: 'Lender milestone', detail: 'Contract, terms, and any funding movement stay owned by the lender.' },
  ];

  return (
    <div className="space-y-4">
      <WizardSectionHeader
        title="Track lender lifecycle"
        detail="After pre-check, the deterministic workflow moves into document requests, lender review, contract handoff, and lender-owned milestones."
      />
      <div className="space-y-3">
        {timeline.map((item, index) => (
          <div key={item.label} className="flex gap-3 rounded-lg border bg-background p-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full border bg-muted/30 text-sm font-semibold">{index + 1}</div>
            <div>
              <div className="font-semibold">{item.label}</div>
              <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {applications.slice(0, 3).map((application) => (
          <MiniFact key={application.lender} label={application.lender} value={`${application.status} / ${application.nextAction}`} />
        ))}
      </div>
    </div>
  );
}

function WizardSectionHeader({ title, detail }: { title: string; detail: string }) {
  return (
    <div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{detail}</p>
    </div>
  );
}

function WizardField({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={cn('block space-y-1.5', className)}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function WizardCallout({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}

function HeroFact({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="flex items-center justify-between gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <span>{label}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <div className="mt-2 line-clamp-2 text-sm font-semibold">{value}</div>
    </div>
  );
}

function FinancialTrustProfilePanel({ profile }: { profile: FinancialTrustProfile }) {
  return (
    <section id="financial-trust-profile" data-testid="finance-trust-profile" className="rounded-lg border bg-card shadow-sm">
      <div className="border-b px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="rounded-full">Financial Trust Profile</Badge>
              <Badge variant="outline" className="rounded-full">Commerce-backed</Badge>
            </div>
            <h2 className="mt-3 text-lg font-semibold">Financial trust built from operating evidence</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{profile.readinessNarrative}</p>
          </div>
          <div className="rounded-lg border bg-background p-3 sm:min-w-44">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Internal readiness</div>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-4xl font-semibold">{profile.readinessGrade}</span>
              <span className="pb-1 text-sm text-muted-foreground">{profile.readinessScore}%</span>
            </div>
            <Progress value={profile.readinessScore} className="mt-3 h-2" />
          </div>
        </div>
      </div>

      <div className="grid gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="grid gap-3 md:grid-cols-2">
          {profile.metrics.map((metric) => (
            <div key={metric.id} className="rounded-lg border bg-background p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{metric.label}</div>
                  <div className="mt-1 text-lg font-semibold">{metric.value}</div>
                </div>
                <Badge variant="outline" className="bg-muted/30">{metric.sourceOfTruthOwner}</Badge>
              </div>
              <p className="mt-2 line-clamp-3 text-sm leading-5 text-muted-foreground">{metric.detail}</p>
              <Progress value={metric.score} className="mt-3 h-1.5" />
              <div className="mt-2 text-xs text-muted-foreground">Evidence: {metric.evidenceIds.join(', ')}</div>
            </div>
          ))}
        </div>

        <aside className="rounded-lg border bg-muted/20 p-3">
          <div className="flex items-center gap-2">
            <CircleDollarSign className="size-4 text-primary" />
            <h3 className="text-sm font-semibold">Receivables / payout snapshot</h3>
          </div>
          <div className="mt-3 grid gap-2">
            <MiniFact label="Open receivables" value={currency.format(profile.receivables.openReceivables)} />
            <MiniFact label="Projected payout" value={currency.format(profile.receivables.projectedPayout)} />
            <MiniFact label="Next due amount" value={currency.format(profile.receivables.nextDueAmount)} />
            <MiniFact label="Next due date" value={formatShortDate(profile.receivables.nextDueDate)} />
          </div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Source owners: {profile.receivables.sourceOwners.join(', ')}. This is a readiness snapshot, not an accounting ledger.
          </p>
        </aside>
      </div>
    </section>
  );
}

function BankReviewSummaryPreview({ summary }: { summary: BankReviewSummary }) {
  return (
    <section id="bank-review-summary" data-testid="bank-review-summary" className="rounded-lg border bg-card shadow-sm">
      <div className="border-b px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="rounded-full">Bank-facing preview</Badge>
          <Badge variant="outline" className="rounded-full">No approval promise</Badge>
        </div>
        <div className="mt-3 flex items-center gap-1.5">
          <h2 className="text-lg font-semibold">{summary.reviewerViewTitle}</h2>
          <InfoHint label={`${summary.reviewerViewTitle} info`}>One summary a reviewer can scan before requesting more evidence or opening formal lender review.</InfoHint>
        </div>
      </div>
      <div className="space-y-3 p-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <MiniFact label="Readiness" value={summary.readinessLabel} />
          <MiniFact label="Indicative range" value={summary.fundingRange} />
          <MiniFact label="Evidence coverage" value={summary.evidenceCoverage} />
          <MiniFact label="Document state" value={summary.documentSummary} />
        </div>
        <div className="rounded-lg border bg-background p-3">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Primary blocker</div>
          <p className="mt-1 text-sm text-muted-foreground">{summary.primaryBlocker}</p>
        </div>
        <div className="rounded-lg border bg-background p-3">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Next action</div>
          <p className="mt-1 text-sm text-muted-foreground">{summary.nextAction}</p>
        </div>
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
          {summary.guardrailCopy}
        </div>
      </div>
    </section>
  );
}

function CommerceEvidencePackPanel({ evidencePack }: { evidencePack: CommerceEvidencePack }) {
  return (
    <section id="commerce-evidence-pack" data-testid="commerce-evidence-pack" className="rounded-lg border bg-card shadow-sm">
      <div className="border-b px-4 py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="rounded-full">Commerce Evidence Pack</Badge>
              <Badge variant="outline" className="rounded-full">{evidencePack.reusableDocumentCount} reusable document(s)</Badge>
              <Badge variant="outline" className="rounded-full">{evidencePack.openIssueCount} open issue(s)</Badge>
            </div>
            <h2 className="mt-3 text-lg font-semibold">Evidence lines mapped to source owners</h2>
            <p className="mt-1 max-w-4xl text-sm leading-6 text-muted-foreground">{evidencePack.summary}</p>
          </div>
        </div>
      </div>
      <div className="grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-5">
        {evidencePack.items.map((item) => (
          <div key={item.id} className="flex min-h-52 flex-col rounded-lg border bg-background p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">{item.label}</div>
                <div className="mt-1 text-xs text-muted-foreground">{item.sourceOfTruthOwner}</div>
              </div>
              <Badge variant="outline" className={statusClass(item.status)}>{humanize(item.status)}</Badge>
            </div>
            <p className="mt-3 flex-1 text-sm leading-5 text-muted-foreground">{item.summary}</p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>{item.records} record(s)</span>
              {item.documentId ? <span>{item.documentId}</span> : null}
            </div>
            <Button asChild size="sm" variant="outline" className="mt-3 justify-between">
              <a href={item.linkedRoute}>
                Open source
                <ArrowRight className="size-4" />
              </a>
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

function FundingApplicationFlow({ steps, onAskAi }: { steps: FundingStep[]; onAskAi: () => void }) {
  return (
    <Card id="funding-application-flow" className="rounded-lg border shadow-sm">
      <CardHeader className="border-b pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileCheck2 className="size-5" />
              Funding Application Flow
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">One guided workflow from operational proof to a consented lender-review package.</p>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={onAskAi}>
            <Bot className="size-4" />
            Explain readiness
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-3">
        {steps.map((step, index) => (
          <div key={step.label} className="rounded-lg border bg-background p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg border bg-card text-sm font-semibold">{index + 1}</div>
              <Badge variant="outline" className={statusClass(step.status)}>{humanize(step.status)}</Badge>
            </div>
            <h2 className="mt-3 text-sm font-semibold">{step.label}</h2>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">{step.detail}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function EligibilitySignals({ signals }: { signals: EligibilitySignal[] }) {
  return (
    <section id="eligibility" className="rounded-lg border bg-card shadow-sm">
      <div className="border-b px-4 py-3">
        <h2 className="text-base font-semibold">Readiness Signals</h2>
        <p className="mt-1 text-sm text-muted-foreground">Operational trust signals that make the business easier to review, without implying lender approval.</p>
      </div>
      <div className="grid gap-px bg-border/70 md:grid-cols-2 xl:grid-cols-3">
        {signals.map((signal) => {
          const Icon = signal.icon;

          return (
            <div key={signal.label} className="bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{signal.label}</div>
                  <div className="mt-1 text-lg font-semibold">{signal.value}</div>
                </div>
                <div className="rounded-lg border bg-background p-2 text-primary">
                  <Icon className="size-4" />
                </div>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{signal.detail}</p>
              <Progress value={signal.score} className="mt-3 h-1.5" />
            </div>
          );
        })}
      </div>
    </section>
  );
}

function RiskBlockers({ blockers }: { blockers: RiskBlocker[] }) {
  return (
    <Card id="blockers" className="rounded-lg border shadow-sm">
      <CardHeader className="border-b pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Gauge className="size-4" />
          Risk Blockers
        </CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">Clear these operating gaps before routing the package to stricter review paths.</p>
      </CardHeader>
      <CardContent className="divide-y p-0">
        {blockers.map((blocker) => (
          <div key={blocker.blocker} className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={blocker.severity === 'high' ? 'border-destructive/30 bg-destructive/10 text-destructive' : 'bg-muted/30'}>
                {humanize(blocker.severity)}
              </Badge>
              <span className="text-sm font-semibold">{blocker.blocker}</span>
            </div>
            <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
              <div className="rounded-lg border bg-background p-3">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Operational impact</div>
                <p className="mt-1 text-muted-foreground">{blocker.impact}</p>
              </div>
              <div className="rounded-lg border bg-background p-3">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Recommendation</div>
                <p className="mt-1 text-muted-foreground">{blocker.recommendation}</p>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function MatchedLenders({ lenders }: { lenders: LenderMatch[] }) {
  return (
    <Card id="lenders" className="rounded-lg border shadow-sm">
      <CardHeader className="border-b pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="size-4" />
          Potential Review Routes
        </CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">PrimeOS previews review routes based on operating proof. Route fit is not a lender acceptance or offer.</p>
      </CardHeader>
      <CardContent className="grid gap-3 p-3 md:grid-cols-2">
        {lenders.map((lender) => (
          <div key={lender.id} className="rounded-lg border bg-background p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold">{lender.bankName}</div>
                <div className="mt-1 text-sm text-muted-foreground">{lender.financingType}</div>
              </div>
              <Badge variant="outline" className="bg-primary/10 text-primary">{lender.matchPercent}% route fit</Badge>
            </div>
            <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
              <MiniFact label="Range" value={lender.estimatedRange} />
              <MiniFact label="Review window" value={lender.reviewWindow} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {lender.requirements.map((requirement) => (
                <Badge key={requirement} variant="outline" className="rounded-full bg-muted/30">{requirement}</Badge>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function MiniFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-2">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}

function DocumentSubmissionCenter({
  documents,
  verifiedDocs,
  onDrop,
  onFiles,
}: {
  documents: FinancingDocument[];
  verifiedDocs: number;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onFiles: (files: FileList | null) => void;
}) {
  return (
    <Card id="documents" className="rounded-lg border shadow-sm">
      <CardHeader className="border-b pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Upload className="size-4" />
              Document Submission Center
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Upload once. PrimeOS maps reusable documents to potential review-route requirements.</p>
          </div>
          <Badge variant="outline">{verifiedDocs}/{documents.length} verified</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-3">
        <div
          className="rounded-lg border border-dashed bg-muted/20 p-5 text-center"
          onDragOver={(event) => event.preventDefault()}
          onDrop={onDrop}
        >
          <Upload className="mx-auto size-6 text-muted-foreground" />
          <div className="mt-2 text-sm font-semibold">Drag documents here</div>
          <p className="mt-1 text-xs text-muted-foreground">Business registration, tax, bank, settlement, invoice, logistics, marketplace reports.</p>
          <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium shadow-sm hover:bg-muted/30">
            Select file
            <input
              type="file"
              className="hidden"
              onChange={(event: ChangeEvent<HTMLInputElement>) => onFiles(event.target.files)}
            />
          </label>
        </div>

        <div className="divide-y rounded-lg border">
          {documents.map((doc) => (
            <div key={doc.id} className="grid gap-3 p-3 md:grid-cols-[minmax(0,1fr)_160px] md:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <FileText className="size-4 text-muted-foreground" />
                  <span className="font-medium">{doc.label}</span>
                  <Badge variant="outline" className={statusClass(doc.status)}>{humanize(doc.status)}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{doc.description}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>{doc.fileName || 'No file attached'}</span>
                  <span>{doc.banks.length} review-route mappings</span>
                  {doc.issue ? <span className="text-destructive">{doc.issue}</span> : null}
                </div>
              </div>
              <Progress value={doc.progress} className="h-2" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ApplicationStatusTracker({ applications }: { applications: ApplicationItem[] }) {
  return (
    <Card id="status" className="rounded-lg border shadow-sm">
      <CardHeader className="border-b pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock3 className="size-4" />
          Application Status Tracker
        </CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">Track lender review, next action, pending requirements, and lender-owned milestones.</p>
      </CardHeader>
      <CardContent className="divide-y p-0">
        {applications.map((item) => (
          <div key={item.lender} className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-semibold">{item.lender}</div>
              <Badge variant="outline" className={statusClass(item.status)}>{item.status}</Badge>
            </div>
            <div className="mt-3 grid gap-2 text-sm">
              <TrackerLine icon={<Clock3 className="size-4" />} label="Timeline" value={item.timeline} />
              <TrackerLine icon={<ArrowRight className="size-4" />} label="Next action" value={item.nextAction} />
              <TrackerLine icon={<Link2 className="size-4" />} label="Pending" value={item.pending} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function TrackerLine({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-muted/20 p-2">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div>
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <div className="mt-0.5">{value}</div>
      </div>
    </div>
  );
}

function PrimeAiFundingSupport({
  prompt,
  onPromptChange,
  onAskAi,
}: {
  prompt: string;
  onPromptChange: (value: string) => void;
  onAskAi: () => void;
}) {
  return (
    <Card className="rounded-lg border shadow-sm">
      <CardHeader className="border-b pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="size-4" />
          Prime AI Support
        </CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">Prime AI explains readiness signals and missing evidence. It does not make credit decisions.</p>
      </CardHeader>
      <CardContent className="space-y-3 p-3">
        <div className="grid gap-2">
          {[
            'Explain blocker reasons',
            'Recommend stronger documents',
            'Explain readiness changes',
            'Suggest operating fixes',
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 rounded-lg border bg-background p-2 text-sm">
              <CheckCircle2 className="size-4 text-emerald-500" />
              {item}
            </div>
          ))}
        </div>
        <Textarea
          value={prompt}
          onChange={(event) => onPromptChange(event.target.value)}
          className="min-h-[96px]"
          aria-label="Prime AI funding prompt"
        />
        <Button type="button" className="w-full justify-between" onClick={onAskAi}>
          Ask Prime AI
          <Send className="size-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
