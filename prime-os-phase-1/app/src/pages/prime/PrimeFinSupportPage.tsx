import { type ChangeEvent, type DragEvent, type ReactNode, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import {
  fetchFinanceControlPlane,
  type CapitalOffersRecord,
  type CapitalReadinessRecord,
  type FinanceControlPlaneSnapshot,
  type RiskTrustRecord,
  type SettlementRepaymentRecord,
} from '@/lib/prime/finance-control-plane';
import { getPrimeSnapshot } from '@/lib/prime/prime-data';
import { cn } from '@/lib/utils';

const currency = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
  maximumFractionDigits: 0,
});
const fundingDisplayMultiplier = 40;

type FundingStepStatus = 'complete' | 'active' | 'blocked' | 'pending';
type DocumentStatus = 'missing' | 'uploading' | 'verifying' | 'verified' | 'rejected';
type ApplicationStatus = 'Draft' | 'Under Review' | 'Need Additional Documents' | 'Bank Reviewing' | 'Approved' | 'Rejected' | 'Disbursed';
type LoanWizardStepId = 'profile' | 'purpose' | 'commerce' | 'documents' | 'routing' | 'review' | 'tracking';

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

type LenderMatch = {
  id: string;
  bankName: string;
  financingType: string;
  estimatedRange: string;
  matchPercent: number;
  requirements: string[];
  approvalSpeed: string;
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
  desiredDisbursement: string;
  repaymentSource: string;
};

type LoanWizardStep = {
  id: LoanWizardStepId;
  title: string;
  summary: string;
  icon: LucideIcon;
};

type JapanLoanDocument = {
  id: string;
  label: string;
  detail: string;
  lenderUse: string;
  linkedDocumentId?: string;
  fallbackStatus: DocumentStatus;
};

const loanWizardSteps: LoanWizardStep[] = [
  { id: 'profile', title: 'Business profile', summary: 'Registered identity, representative, operating base.', icon: Building2 },
  { id: 'purpose', title: 'Funding purpose', summary: 'Amount, use of funds, timing, repayment source.', icon: Banknote },
  { id: 'commerce', title: 'Commerce proof', summary: 'Operational signals PrimeOS can attach to the file.', icon: TrendingUp },
  { id: 'documents', title: 'Document pack', summary: 'Japan SME lending documents uploaded once, reused across lenders.', icon: FileText },
  { id: 'routing', title: 'Lender routing', summary: 'Partner bank, guarantee-backed, or JFC-style review path.', icon: ShieldCheck },
  { id: 'review', title: 'Review & consent', summary: 'Final pre-check before PrimeOS sends the package.', icon: FileCheck2 },
  { id: 'tracking', title: 'Track next steps', summary: 'Additional documents, bank review, contract, disbursement.', icon: Clock3 },
];

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
    lenderUse: 'Credit review',
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
    lenderUse: 'Operational underwriting',
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
      readinessReason: 'Approved launch, repeat-customer pull, and creator proof already align around one SKU.',
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

function readinessGrade(score: number) {
  if (score >= 90) return 'A';
  if (score >= 82) return 'A-';
  if (score >= 74) return 'B+';
  if (score >= 66) return 'B';
  return 'Review';
}

function statusClass(status: FundingStepStatus | DocumentStatus | ApplicationStatus) {
  if (status === 'complete' || status === 'verified' || status === 'Approved' || status === 'Disbursed') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  }

  if (status === 'active' || status === 'uploading' || status === 'verifying' || status === 'Under Review' || status === 'Bank Reviewing') {
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
    approvalSpeed: offer.status === 'active' ? '2-4 business days' : '5-7 business days',
    source: offer.market,
  }));

  const synthetic = partnerNames.slice(offerMatches.length).map((name, index) => ({
    id: `partner-${index}`,
    bankName: name,
    financingType: partnerTypes[index + offerMatches.length] || 'SME financing',
    estimatedRange: `${currency.format(10000000 + index * 5000000)}-${currency.format(26000000 + index * 7000000)}`,
    matchPercent: clamp(readinessScore - index * 6),
    requirements: ['Verified settlements', 'Marketplace report', 'Inventory turnover proof'],
    approvalSpeed: index === 0 ? '3-5 business days' : '5-10 business days',
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
    { id: 'settlement-records', label: 'Settlement records', description: 'Marketplace payout and repayment reliability.', banks: bankNames, status: 'verified', progress: 100, fileName: 'settlement-ledger.csv' },
    { id: 'invoice-records', label: 'Invoice records', description: 'B2B order proof and receivables context.', banks: bankNames.slice(0, 2), status: 'missing', progress: 0 },
    { id: 'logistics-records', label: 'Logistics/export records', description: 'Fulfillment reliability and shipping proof.', banks: bankNames.slice(1), status: 'rejected', progress: 100, fileName: 'export-docs.zip', issue: 'Carrier reference is missing.' },
    { id: 'marketplace-reports', label: 'Marketplace reports', description: 'Sales health, refunds, and account quality.', banks: bankNames, status: 'verified', progress: 100, fileName: 'marketplace-health.xlsx' },
  ];
}

function buildApplications(lenders: LenderMatch[], docs: FinancingDocument[]): ApplicationItem[] {
  const missingCount = docs.filter((doc) => doc.status === 'missing' || doc.status === 'rejected').length;

  return lenders.slice(0, 3).map((lender, index) => ({
    lender: lender.bankName,
    status: index === 0 && missingCount === 0 ? 'Bank Reviewing' : index === 0 ? 'Need Additional Documents' : index === 1 ? 'Draft' : 'Under Review',
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
  const snapshot = getPrimeSnapshot();
  const financeQuery = useQuery({
    queryKey: ['prime-fin-support-control-plane'],
    queryFn: fetchFinanceControlPlane,
    staleTime: 30 * 1000,
    retry: 1,
  });
  const controlPlane = financeQuery.data ?? fallbackFinanceData;
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
    desiredDisbursement: 'Within 3-4 weeks',
    repaymentSource: 'Marketplace settlements and split-repayment lane',
  });

  const eligibleRange = rangeFromOffers(controlPlane.capitalOffers, controlPlane.capitalReadiness);
  const mainBlocker = [...controlPlane.riskTrust].sort((left, right) => (right.severity === 'high' ? 1 : 0) - (left.severity === 'high' ? 1 : 0))[0];
  const missingDocs = documents.filter((doc) => doc.status === 'missing' || doc.status === 'rejected').length;
  const verifiedDocs = documents.filter((doc) => doc.status === 'verified').length;
  const applications = buildApplications(lenders, documents);
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
    impact: risk.severity === 'high' ? 'May delay lender approval or reduce funding ceiling.' : 'Needs clearer proof before best lender terms unlock.',
    recommendation: risk.recommendedFix || 'Attach stronger operational proof before submission.',
    severity: risk.severity === 'high' ? 'high' : risk.severity === 'medium' ? 'medium' : 'low',
  }));

  const fundingSteps: FundingStep[] = [
    { label: 'Verify business profile', detail: 'Company identity, owner, market, and payout account.', status: 'complete' },
    { label: 'Connect operational data', detail: 'Orders, fulfillment, inventory, settlement, campaigns, CRM.', status: 'complete' },
    { label: 'Upload required documents', detail: `${verifiedDocs}/${documents.length} documents verified.`, status: missingDocs ? 'active' : 'complete' },
    { label: 'Review eligibility', detail: `${readinessGrade(readinessScore)} readiness with ${blockers.length} risk blockers.`, status: blockers.some((blocker) => blocker.severity === 'high') ? 'blocked' : 'active' },
    { label: 'Submit to matched lenders', detail: `${lenders.length} partners ready for routing.`, status: applicationReady ? 'active' : 'pending' },
    { label: 'Track application status', detail: 'Follow bank review, document requests, approval, disbursement.', status: applications.some((item) => item.status === 'Bank Reviewing') ? 'active' : 'pending' },
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

  return (
    <div className="min-h-full bg-background">
      <div className="space-y-4 p-4 md:p-6">
        <FinSupportHero
          readinessScore={readinessScore}
          eligibleRange={eligibleRange}
          lenderCount={lenders.length}
          blocker={mainBlocker?.topRisk || 'No major blocker'}
          loading={financeQuery.isFetching && Boolean(financeQuery.data)}
          degraded={!financeQuery.data}
          onAskAi={() => askAi('hero')}
          onOpenLoanWizard={() => setLoanWizardOpen(true)}
        />

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <FundingApplicationFlow steps={fundingSteps} onAskAi={() => askAi('application-flow')} />
          <PrimeAiFundingSupport prompt={aiPrompt} onPromptChange={setAiPrompt} onAskAi={() => askAi('funding-assistant')} />
        </section>

        <EligibilitySignals signals={eligibilitySignals} />

        <section className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <RiskBlockers blockers={blockers} />
          <MatchedLenders lenders={lenders} />
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <DocumentSubmissionCenter
            documents={documents}
            verifiedDocs={verifiedDocs}
            onDrop={handleDrop}
            onFiles={handleFiles}
          />
          <ApplicationStatusTracker applications={applications} />
        </section>
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
            <Badge variant="outline" className="rounded-full">Embedded funding access</Badge>
            {loading ? <Badge variant="outline" className="rounded-full">Refreshing</Badge> : null}
            {degraded ? <Badge variant="outline" className="rounded-full">Using local snapshot</Badge> : null}
          </div>
          <h1 className="mt-4 max-w-4xl text-3xl font-semibold tracking-tight md:text-4xl">
            Unlock financing with your commerce operations.
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            PrimeOS translates order stability, fulfillment performance, settlement consistency, inventory movement, and customer trust into bank-ready funding support.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild>
              <a href="#funding-application-flow">
                Apply for Funding Support
                <ArrowRight className="size-4" />
              </a>
            </Button>
            <Button type="button" variant="secondary" onClick={onOpenLoanWizard}>
              <FileCheck2 className="size-4" />
              Start Loan Profile Wizard
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
          <HeroFact label="Eligible range" value={eligibleRange} icon={<Banknote className="size-4" />} />
          <HeroFact label="Matched banks" value={String(lenderCount)} icon={<Building2 className="size-4" />} />
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-5xl overflow-hidden rounded-2xl p-0">
        <DialogHeader className="border-b px-4 py-4 pr-12 md:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-full">Japan SME pre-check</Badge>
            <Badge variant="outline" className="rounded-full">{readinessGrade(readinessScore)} readiness</Badge>
            <Badge variant="outline" className="rounded-full">{eligibleRange}</Badge>
          </div>
          <DialogTitle className="mt-3 flex items-center gap-2 text-xl">
            <StepIcon className="size-5 text-primary" />
            Loan Profile Wizard
          </DialogTitle>
          <DialogDescription>
            Build a lender-ready funding file from commerce signals, Japan SME documents, and partner-bank routing.
          </DialogDescription>
          <Progress value={wizardProgress} className="mt-3 h-1.5" />
        </DialogHeader>

        <div className="grid min-h-0 md:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="hidden border-r bg-muted/20 p-3 md:block">
            <div className="space-y-1">
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
                      'w-full rounded-lg border px-3 py-2 text-left transition-colors',
                      active ? 'border-primary/40 bg-primary/10 text-foreground' : 'border-transparent text-muted-foreground hover:border-border hover:bg-background',
                    )}
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <span className="flex size-7 items-center justify-center rounded-md border bg-background text-xs">{index + 1}</span>
                      <Icon className="size-4" />
                      {step.title}
                    </div>
                    <p className="mt-1 line-clamp-2 pl-9 text-xs leading-5">{step.summary}</p>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="flex min-h-0 flex-col">
            <div className="border-b p-3 md:hidden">
              <div className="flex gap-2 overflow-x-auto pb-1">
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

            <div className="min-h-0 overflow-y-auto p-4 md:max-h-[calc(100dvh-15rem)] md:p-5">
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
            </div>

            <DialogFooter className="border-t bg-muted/20 px-4 py-3 md:px-5">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Save draft
              </Button>
              <Button type="button" variant="ghost" onClick={onAskAi}>
                <Bot className="size-4" />
                Ask Prime AI
              </Button>
              <Button type="button" variant="outline" onClick={goBack} disabled={stepIndex === 0}>
                <ChevronLeft className="size-4" />
                Back
              </Button>
              <Button type="button" onClick={isFinalStep ? submitPreCheck : goNext}>
                {isFinalStep ? 'Submit pre-check' : 'Next'}
                {!isFinalStep ? <ArrowRight className="size-4" /> : <CheckCircle2 className="size-4" />}
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
          detail="Japan SME lenders usually start with legal identity, representative authority, business address, and operating history before underwriting."
        />
        <div className="grid gap-3 md:grid-cols-2">
          <WizardField label="Legal business name" value={draft.legalName} onChange={(value) => onDraftChange('legalName', value)} />
          <WizardField label="Corporate number" value={draft.corporateNumber} onChange={(value) => onDraftChange('corporateNumber', value)} />
          <WizardField label="Representative / owner" value={draft.representative} onChange={(value) => onDraftChange('representative', value)} />
          <MiniFact label="Readiness grade" value={`${readinessGrade(readinessScore)} / ${readinessScore}%`} />
        </div>
        <WizardCallout
          label="PrimeOS role"
          detail="PrimeOS prepares the funding profile and routes evidence. Final credit approval stays with the lender or guarantee institution."
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
          <WizardField label="Desired disbursement timing" value={draft.desiredDisbursement} onChange={(value) => onDraftChange('desiredDisbursement', value)} />
          <WizardField label="Funding purpose" value={draft.fundingPurpose} onChange={(value) => onDraftChange('fundingPurpose', value)} className="md:col-span-2" />
          <WizardField label="Repayment source" value={draft.repaymentSource} onChange={(value) => onDraftChange('repaymentSource', value)} className="md:col-span-2" />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <MiniFact label="Eligible range" value={eligibleRange} />
          <MiniFact label="Best lender match" value={primaryLender?.bankName || 'Pending'} />
          <MiniFact label="Expected review speed" value={primaryLender?.approvalSpeed || 'After pre-check'} />
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
          detail="This is where PrimeOS differs from a finance dashboard: underwriting proof comes from commerce execution, not static KPI reporting."
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
          detail="No approval promise. This step confirms consent, missing evidence, and what PrimeOS will send to matched lenders."
        />
        <div className="grid gap-3 md:grid-cols-2">
          <MiniFact label="Applicant" value={draft.legalName} />
          <MiniFact label="Requested amount" value={draft.requestedAmount} />
          <MiniFact label="Funding purpose" value={draft.fundingPurpose} />
          <MiniFact label="Matched lenders" value={`${lenders.length} partners`} />
        </div>
        <div className="space-y-2 rounded-lg border bg-background p-3">
          {[
            'Share uploaded documents with selected partner lenders.',
            'Share PrimeOS operating signals for readiness and eligibility review.',
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
    { label: 'Contract', detail: 'Approved terms move to lender contract and representative confirmation.' },
    { label: 'Disbursement', detail: 'Funds are sent to the designated operating account.' },
  ];

  return (
    <div className="space-y-4">
      <WizardSectionHeader
        title="Track lender lifecycle"
        detail="After pre-check, the deterministic workflow moves into document requests, lender review, contract, and disbursement tracking."
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
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function WizardCallout({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
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
            <p className="mt-1 text-sm text-muted-foreground">One guided workflow from operational proof to lender submission.</p>
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
        <h2 className="text-base font-semibold">Why You Are Eligible</h2>
        <p className="mt-1 text-sm text-muted-foreground">Operational trust signals that make the business bank-readable.</p>
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
        <p className="mt-1 text-sm text-muted-foreground">Clear these operating gaps before submitting to stricter lenders.</p>
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
          Matched Banks / Lenders
        </CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">PrimeOS routes merchants to lenders based on operating proof, not static ads.</p>
      </CardHeader>
      <CardContent className="grid gap-3 p-3 md:grid-cols-2">
        {lenders.map((lender) => (
          <div key={lender.id} className="rounded-lg border bg-background p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold">{lender.bankName}</div>
                <div className="mt-1 text-sm text-muted-foreground">{lender.financingType}</div>
              </div>
              <Badge variant="outline" className="bg-primary/10 text-primary">{lender.matchPercent}% match</Badge>
            </div>
            <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
              <MiniFact label="Range" value={lender.estimatedRange} />
              <MiniFact label="Speed" value={lender.approvalSpeed} />
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
            <p className="mt-1 text-sm text-muted-foreground">Upload once. PrimeOS maps reusable documents to matched lender requirements.</p>
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
                  <span>{doc.banks.length} lender mappings</span>
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
        <p className="mt-1 text-sm text-muted-foreground">Track lender review, next action, pending requirements, approval, and disbursement.</p>
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
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
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
        <p className="mt-1 text-sm text-muted-foreground">Funding assistant, document helper, eligibility explainer. Core workflow stays deterministic.</p>
      </CardHeader>
      <CardContent className="space-y-3 p-3">
        <div className="grid gap-2">
          {[
            'Explain rejection reasons',
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
