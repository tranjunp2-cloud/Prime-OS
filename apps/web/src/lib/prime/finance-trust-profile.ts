import type { FinanceControlPlaneSnapshot, RiskTrustRecord, SettlementRepaymentRecord } from './finance-control-plane';
import type { PrimeSnapshot } from './prime-data';
import { buildMyInvoisEvidenceSummary } from './myinvois';

export type FinanceEvidenceOwner =
  | 'Finance'
  | 'CRM'
  | 'Customer'
  | 'OMS'
  | 'Inventory'
  | 'Fulfillment / Shipment'
  | 'Marketplace';

export type FinanceDocumentStatus = 'missing' | 'uploaded' | 'uploading' | 'verifying' | 'verified' | 'rejected' | 'reusable';
export type CommerceEvidenceStatus = 'missing' | 'uploaded' | 'verified' | 'rejected' | 'reusable';

export interface FinanceDocumentLike {
  id: string;
  status: FinanceDocumentStatus;
  issue?: string;
}

export interface SettlementSignal {
  id: string;
  label: string;
  market: string;
  repaymentSource: string;
  collectionMode: string;
  outstandingBalance: number;
  nextDueAmount: number;
  nextDueDate?: string;
  status: string;
  score: number;
  sourceOfTruthOwner: FinanceEvidenceOwner;
  evidenceIds: string[];
}

export interface ReceivableSnapshot {
  openReceivables: number;
  projectedPayout: number;
  nextDueAmount: number;
  nextDueDate?: string;
  payoutCadence: string;
  sourceOwners: FinanceEvidenceOwner[];
  evidenceIds: string[];
}

export interface FinancialTrustMetric {
  id: string;
  label: string;
  value: string;
  score: number;
  detail: string;
  sourceOfTruthOwner: FinanceEvidenceOwner;
  evidenceIds: string[];
}

export interface FinancialTrustProfile {
  id: string;
  merchantName: string;
  readinessScore: number;
  readinessGrade: string;
  readinessNarrative: string;
  commerceActivityScore: number;
  settlementConsistency: number;
  refundRatio: number;
  inventoryStability: number;
  repeatCustomerRate: number;
  repeatCustomerCount: number;
  receivables: ReceivableSnapshot;
  settlementSignals: SettlementSignal[];
  metrics: FinancialTrustMetric[];
  blockerSummary: string;
  generatedAt: string;
}

export interface CommerceEvidenceItem {
  id: string;
  label: string;
  category: 'orders' | 'settlements' | 'invoices' | 'logistics-export' | 'marketplace-health';
  status: CommerceEvidenceStatus;
  sourceOfTruthOwner: FinanceEvidenceOwner;
  summary: string;
  records: number;
  linkedRoute: string;
  documentId?: string;
  connectorEvidence?: {
    label: string;
    status: CommerceEvidenceStatus;
    detail: string;
  };
}

export interface CommerceEvidencePack {
  id: string;
  summary: string;
  items: CommerceEvidenceItem[];
  reusableDocumentCount: number;
  openIssueCount: number;
}

export interface BankReviewSummary {
  profileId: string;
  reviewerViewTitle: string;
  readinessLabel: string;
  fundingRange: string;
  primaryBlocker: string;
  evidenceCoverage: string;
  documentSummary: string;
  nextAction: string;
  guardrailCopy: string;
  sharedEvidence: string[];
}

export interface FundingApplicationStatus {
  lender: string;
  status: 'Draft' | 'Pre-check Review' | 'Need Additional Documents' | 'Bank Reviewing' | 'Terms Proposed' | 'Rejected';
  nextAction: string;
  evidenceState: CommerceEvidenceStatus;
  riskGuardrail: string;
}

export interface BuildFinanceTrustProfileInput {
  snapshot: PrimeSnapshot;
  controlPlane: FinanceControlPlaneSnapshot;
  documents: FinanceDocumentLike[];
  fundingRange: string;
  generatedAt?: string;
}

const yen = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
  maximumFractionDigits: 0,
});

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function financeReadinessGrade(score: number) {
  if (score >= 90) return 'A';
  if (score >= 82) return 'A-';
  if (score >= 74) return 'B+';
  if (score >= 66) return 'B';
  return 'Review';
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function documentStatus(documents: FinanceDocumentLike[], documentId: string): FinanceDocumentStatus | undefined {
  return documents.find((document) => document.id === documentId)?.status;
}

function evidenceStatus(documents: FinanceDocumentLike[], documentIds: string[], fallback: CommerceEvidenceStatus): CommerceEvidenceStatus {
  const statuses = documentIds.map((documentId) => documentStatus(documents, documentId)).filter(Boolean) as FinanceDocumentStatus[];

  if (statuses.includes('rejected')) return 'rejected';
  if (statuses.includes('reusable')) return 'reusable';
  if (statuses.includes('verified')) return 'verified';
  if (statuses.some((status) => status === 'uploaded' || status === 'uploading' || status === 'verifying')) return 'uploaded';
  if (statuses.includes('missing')) return 'missing';

  return fallback;
}

function strongestRisk(risks: RiskTrustRecord[]) {
  return [...risks].sort((left, right) => {
    const severityRank = { high: 3, medium: 2, low: 1 };
    return (severityRank[right.severity as keyof typeof severityRank] ?? 0) - (severityRank[left.severity as keyof typeof severityRank] ?? 0);
  })[0];
}

function buildSettlementSignals(rows: SettlementRepaymentRecord[]): SettlementSignal[] {
  return rows.map((row) => {
    const collecting = row.status === 'collecting' || row.status === 'scheduled';
    const hasDuePath = Boolean(row.nextDueAmount && row.nextDueDate && row.repaymentSource);

    return {
      id: row.id,
      label: row.facilityName,
      market: row.market,
      repaymentSource: row.repaymentSource || 'Repayment source pending',
      collectionMode: row.collectionMode || 'Manual review',
      outstandingBalance: row.outstandingBalance ?? 0,
      nextDueAmount: row.nextDueAmount ?? 0,
      nextDueDate: row.nextDueDate,
      status: row.status,
      score: clampScore(collecting ? (hasDuePath ? 88 : 76) : 62),
      sourceOfTruthOwner: 'Finance',
      evidenceIds: ['settlements', 'receivables-payout'],
    };
  });
}

export function buildFinanceTrustProfile(input: BuildFinanceTrustProfileInput) {
  const { snapshot, controlPlane, documents, fundingRange } = input;
  const generatedAt = input.generatedAt ?? '2026-05-09T09:00:00.000Z';
  const primaryReadiness = [...controlPlane.capitalReadiness].sort((left, right) => right.readinessScore - left.readinessScore)[0];
  const settlementSignals = buildSettlementSignals(controlPlane.settlementRepayment);
  const strongestBlocker = strongestRisk(controlPlane.riskTrust);

  const totalOrders = snapshot.orders.length;
  const totalCustomers = Math.max(snapshot.customers.length, 1);
  const repeatCustomerCount = snapshot.customers.filter((customer) => customer.totalOrders > 1 || customer.lifecycle === 'retention').length;
  const repeatCustomerRate = (repeatCustomerCount / totalCustomers) * 100;
  const refundRatio = totalOrders ? (snapshot.returnsCount / totalOrders) * 100 : 0;
  const mediumInventoryRisks = snapshot.forecasts.filter((forecast) => forecast.risk === 'medium').length;
  const highInventoryRisks = snapshot.forecasts.filter((forecast) => forecast.risk === 'high').length;
  const totalOutstanding = controlPlane.settlementRepayment.reduce((sum, row) => sum + (row.outstandingBalance ?? 0), 0);
  const totalNextDue = controlPlane.settlementRepayment.reduce((sum, row) => sum + (row.nextDueAmount ?? 0), 0);
  const rfqReceivables = snapshot.rfqs.reduce((sum, rfq) => sum + rfq.value, 0);
  const averageCampaignRevenue = snapshot.campaigns.length ? snapshot.metrics.revenue / snapshot.campaigns.length : snapshot.metrics.revenue;
  const myInvoisEvidence = buildMyInvoisEvidenceSummary(snapshot.orders, snapshot.orderItems, snapshot.orderEvents);

  const commerceActivityScore = clampScore(
    54 +
    Math.min(totalOrders * 2, 18) +
    Math.min(snapshot.metrics.leadToOrderRate / 2, 18) +
    Math.min(snapshot.orderEvents.length / 3, 10),
  );
  const settlementConsistency = clampScore(
    64 +
    settlementSignals.length * 8 +
    settlementSignals.filter((signal) => signal.status === 'collecting' || signal.status === 'scheduled').length * 4,
  );
  const inventoryStability = clampScore(
    88 -
    highInventoryRisks * 18 -
    mediumInventoryRisks * 8 +
    Math.min(snapshot.listingsCount, 4) * 2,
  );
  const repeatCustomerScore = clampScore(62 + repeatCustomerRate / 2);
  const refundScore = clampScore(98 - refundRatio * 6);

  const readinessScore = primaryReadiness?.readinessScore ?? clampScore(
    (commerceActivityScore + settlementConsistency + inventoryStability + repeatCustomerScore + refundScore) / 5,
  );

  const receivables: ReceivableSnapshot = {
    openReceivables: rfqReceivables,
    projectedPayout: Math.round(Math.max(averageCampaignRevenue, snapshot.metrics.revenue * 0.22)),
    nextDueAmount: totalNextDue,
    nextDueDate: controlPlane.settlementRepayment.find((row) => row.nextDueDate)?.nextDueDate,
    payoutCadence: settlementSignals.length > 1 ? 'Multiple settlement lanes' : 'Single settlement lane',
    sourceOwners: ['CRM', 'Finance', 'OMS'],
    evidenceIds: ['settlements', 'invoices', 'orders'],
  };

  const metrics: FinancialTrustMetric[] = [
    {
      id: 'commerce-activity',
      label: 'Commerce activity score',
      value: formatPercent(commerceActivityScore),
      score: commerceActivityScore,
      detail: `${totalOrders} orders, ${snapshot.orderEvents.length} OMS events, and ${snapshot.metrics.leadToOrderRate}% lead-to-order conversion feed the file.`,
      sourceOfTruthOwner: 'OMS',
      evidenceIds: ['orders'],
    },
    {
      id: 'settlement-consistency',
      label: 'Settlement consistency',
      value: formatPercent(settlementConsistency),
      score: settlementConsistency,
      detail: `${settlementSignals.length} repayment lane(s) connect payout movement to funding review.`,
      sourceOfTruthOwner: 'Finance',
      evidenceIds: ['settlements'],
    },
    {
      id: 'receivables-payout',
      label: 'Receivables / payout snapshot',
      value: yen.format(receivables.openReceivables + receivables.projectedPayout),
      score: clampScore(70 + Math.min(snapshot.rfqs.length * 4, 16) + Math.min(settlementSignals.length * 5, 12)),
      detail: `${yen.format(receivables.openReceivables)} RFQ receivables plus ${yen.format(receivables.projectedPayout)} projected payout context.`,
      sourceOfTruthOwner: 'CRM',
      evidenceIds: ['invoices', 'settlements'],
    },
    {
      id: 'refund-ratio',
      label: 'Refund ratio',
      value: formatPercent(refundRatio),
      score: refundScore,
      detail: `${snapshot.returnsCount} return(s) across ${Math.max(totalOrders, 1)} order(s) keep exception pressure visible.`,
      sourceOfTruthOwner: 'OMS',
      evidenceIds: ['orders', 'marketplace-health'],
    },
    {
      id: 'inventory-stability',
      label: 'Inventory stability',
      value: formatPercent(inventoryStability),
      score: inventoryStability,
      detail: `${highInventoryRisks} high-risk and ${mediumInventoryRisks} medium-risk forecast signal(s) shape the readiness ceiling.`,
      sourceOfTruthOwner: 'Inventory',
      evidenceIds: ['logistics-export', 'marketplace-health'],
    },
    {
      id: 'repeat-customer-signal',
      label: 'Repeat customer signal',
      value: `${repeatCustomerCount} repeat`,
      score: repeatCustomerScore,
      detail: `${formatPercent(repeatCustomerRate)} of known accounts show repeat or retention behavior.`,
      sourceOfTruthOwner: 'Customer',
      evidenceIds: ['orders', 'marketplace-health'],
    },
  ];

  const evidencePack: CommerceEvidencePack = {
    id: 'commerce-evidence-pack',
    summary: 'Bank-review preview assembled from commerce execution evidence; MyInvois-valid invoice activity is surfaced as verified commerce evidence, not accounting truth.',
    items: [
      {
        id: 'orders',
        label: 'Orders and OMS events',
        category: 'orders',
        status: totalOrders ? 'verified' : 'missing',
        sourceOfTruthOwner: 'OMS',
        summary: 'Order cadence, lifecycle state, fulfillment events, and refund pressure.',
        records: totalOrders + snapshot.orderEvents.length,
        linkedRoute: '/ecom/cos/oms',
        documentId: 'settlement-records',
      },
      {
        id: 'settlements',
        label: 'Settlement and repayment lanes',
        category: 'settlements',
        status: evidenceStatus(documents, ['settlement-records', 'bank-statements'], settlementSignals.length ? 'verified' : 'missing'),
        sourceOfTruthOwner: 'Finance',
        summary: 'Payout route, repayment source, next due amount, and collection mode.',
        records: settlementSignals.length,
        linkedRoute: '/finance/fin-support#status',
        documentId: 'settlement-records',
      },
      {
        id: 'invoices',
        label: myInvoisEvidence.candidateCount > 0 ? 'MyInvois-valid invoices and RFQ receivables' : 'Invoices and MyInvois readiness',
        category: 'invoices',
        status: myInvoisEvidence.evidenceStatus === 'missing'
          ? evidenceStatus(documents, ['invoice-records'], snapshot.rfqs.length ? 'uploaded' : 'missing')
          : myInvoisEvidence.evidenceStatus,
      sourceOfTruthOwner: 'CRM',
        summary: myInvoisEvidence.candidateCount > 0
          ? `MyInvois evidence: ${myInvoisEvidence.summaryLine}`
          : 'Invoice context and receivable exposure before lender review.',
        records: snapshot.rfqs.length + myInvoisEvidence.candidateCount,
        linkedRoute: '/ecom/cos/oms',
        documentId: 'invoice-records',
        connectorEvidence: myInvoisEvidence.candidateCount > 0
          ? {
              label: 'Malaysia MyInvois',
              status: myInvoisEvidence.evidenceStatus === 'missing' ? 'uploaded' : myInvoisEvidence.evidenceStatus,
              detail: myInvoisEvidence.summaryLine,
            }
          : undefined,
      },
      {
        id: 'logistics-export',
        label: 'Logistics / export records',
        category: 'logistics-export',
        status: evidenceStatus(documents, ['logistics-records'], snapshot.shipmentsCount ? 'uploaded' : 'missing'),
        sourceOfTruthOwner: 'Fulfillment / Shipment',
        summary: 'Shipment count, tracking events, carrier proof, and cross-border readiness.',
        records: snapshot.shipmentsCount + snapshot.trackingEventsCount,
        linkedRoute: '/ecom/cos/fulfillment',
        documentId: 'logistics-records',
      },
      {
        id: 'marketplace-health',
        label: 'Marketplace health',
        category: 'marketplace-health',
        status: evidenceStatus(documents, ['marketplace-reports'], snapshot.listingsCount ? 'verified' : 'missing'),
        sourceOfTruthOwner: 'Marketplace',
        summary: 'Listing health, campaign proof, refund ratio, and account-quality signals.',
        records: snapshot.listingsCount + snapshot.campaigns.length,
        linkedRoute: '/crm/campaigns',
        documentId: 'marketplace-reports',
      },
    ],
    reusableDocumentCount: documents.filter((document) => document.status === 'reusable').length,
    openIssueCount: documents.filter((document) => document.status === 'missing' || document.status === 'rejected').length
      + (myInvoisEvidence.invalidCount > 0 || myInvoisEvidence.blockingFields.length > 0 ? 1 : 0),
  };

  const coveredEvidence = evidencePack.items.filter((item) => item.status !== 'missing' && item.status !== 'rejected');
  const bankReviewSummary: BankReviewSummary = {
    profileId: primaryReadiness?.id ?? 'finance-trust-profile',
    reviewerViewTitle: 'Bank-review summary preview',
    readinessLabel: `${financeReadinessGrade(readinessScore)} / ${readinessScore}% readiness`,
    fundingRange,
    primaryBlocker: strongestBlocker?.topRisk || 'No high-severity blocker in the mock control plane.',
    evidenceCoverage: `${coveredEvidence.length}/${evidencePack.items.length} evidence lines review-ready`,
    documentSummary: `${evidencePack.reusableDocumentCount} reusable document(s), ${evidencePack.openIssueCount} open issue(s)`,
    nextAction: evidencePack.openIssueCount
      ? 'Resolve rejected or missing evidence before routing the package to stricter lender review.'
      : 'Review merchant consent and route the evidence pack to selected lender pre-check.',
    guardrailCopy: 'Preview only: no approval promise, eligibility decision, underwriting result, or disbursement commitment is represented by PrimeOS.',
    sharedEvidence: coveredEvidence.map((item) => item.label),
  };

  const profile: FinancialTrustProfile = {
    id: primaryReadiness?.id ?? 'finance-trust-profile',
    merchantName: 'Prime Commerce Japan KK',
    readinessScore,
    readinessGrade: financeReadinessGrade(readinessScore),
    readinessNarrative: primaryReadiness?.readinessReason || 'Readiness is composed from commerce activity, settlement reliability, inventory stability, refund pressure, and repeat-customer proof.',
    commerceActivityScore,
    settlementConsistency,
    refundRatio,
    inventoryStability,
    repeatCustomerRate,
    repeatCustomerCount,
    receivables,
    settlementSignals,
    metrics,
    blockerSummary: bankReviewSummary.primaryBlocker,
    generatedAt,
  };

  return {
    profile,
    evidencePack,
    bankReviewSummary,
  };
}
