import { describe, expect, it } from 'vitest';
import { buildFinanceTrustProfile, type FinanceDocumentLike } from './finance-trust-profile';
import type { FinanceControlPlaneSnapshot } from './finance-control-plane';
import { getPrimeSnapshot } from './prime-data';

const controlPlane: FinanceControlPlaneSnapshot = {
  capitalReadiness: [
    {
      id: 'capital-test',
      programName: 'JP refill review package',
      market: 'JP',
      owner: 'Finance lead',
      fundingNeed: 240000,
      readinessScore: 86,
      readinessReason: 'Commerce proof, settlement lane, and repeat-customer demand are connected.',
      status: 'ready',
    },
  ],
  capitalOffers: [],
  riskTrust: [
    {
      id: 'risk-test',
      profileName: 'Inventory readiness lane',
      signalSource: 'OMS + Inventory',
      trustScore: 74,
      severity: 'high',
      owner: 'Risk lead',
      topRisk: 'Inventory pressure before campaign scale',
      recommendedFix: 'Confirm supplier timing before routing to lender review.',
      status: 'watch',
    },
  ],
  settlementRepayment: [
    {
      id: 'settlement-test',
      facilityName: 'JP marketplace settlement lane',
      market: 'JP',
      repaymentSource: 'Marketplace settlement split',
      outstandingBalance: 120000,
      nextDueAmount: 30000,
      nextDueDate: '2026-05-18T09:00:00.000Z',
      collectionMode: 'split_settlement',
      status: 'collecting',
    },
  ],
};

const documents: FinanceDocumentLike[] = [
  { id: 'business-registration', status: 'verified' },
  { id: 'settlement-records', status: 'reusable' },
  { id: 'bank-statements', status: 'verifying' },
  { id: 'invoice-records', status: 'uploaded' },
  { id: 'logistics-records', status: 'rejected', issue: 'Carrier reference is missing.' },
  { id: 'marketplace-reports', status: 'verified' },
];

describe('finance trust profile read model', () => {
  it('builds the Phase 3 financial trust contracts from commerce evidence', () => {
    const result = buildFinanceTrustProfile({
      snapshot: getPrimeSnapshot(),
      controlPlane,
      documents,
      fundingRange: '¥9,600,000-¥12,960,000',
      generatedAt: '2026-05-09T09:00:00.000Z',
    });

    expect(result.profile).toMatchObject({
      id: 'capital-test',
      readinessScore: 86,
      readinessGrade: 'A-',
      blockerSummary: 'Inventory pressure before campaign scale',
    });
    expect(result.profile.metrics).toHaveLength(6);
    expect(result.profile.metrics.every((metric) => metric.sourceOfTruthOwner && metric.evidenceIds.length > 0)).toBe(true);
    expect(result.profile.receivables.sourceOwners).toEqual(expect.arrayContaining(['Demand', 'Finance', 'OMS']));
    expect(result.profile.settlementSignals[0]).toMatchObject({
      sourceOfTruthOwner: 'Finance',
      repaymentSource: 'Marketplace settlement split',
    });
  });

  it('keeps the evidence pack and bank preview bounded to review readiness', () => {
    const result = buildFinanceTrustProfile({
      snapshot: getPrimeSnapshot(),
      controlPlane,
      documents,
      fundingRange: '¥9,600,000-¥12,960,000',
    });

    expect(result.evidencePack.items.map((item) => item.category)).toEqual([
      'orders',
      'settlements',
      'invoices',
      'logistics-export',
      'marketplace-health',
    ]);
    expect(result.evidencePack.items.map((item) => item.sourceOfTruthOwner)).toEqual(expect.arrayContaining([
      'OMS',
      'Finance',
      'Demand',
      'Fulfillment / Shipment',
      'Marketplace',
    ]));
    expect(result.evidencePack.items.find((item) => item.id === 'settlements')?.status).toBe('reusable');
    expect(result.evidencePack.items.find((item) => item.id === 'invoices')?.status).toBe('uploaded');
    expect(result.evidencePack.items.find((item) => item.id === 'logistics-export')?.status).toBe('rejected');
    expect(result.bankReviewSummary.guardrailCopy).toContain('Preview only');
    expect(result.bankReviewSummary.guardrailCopy).toContain('no approval promise');
    expect(result.bankReviewSummary.nextAction).toContain('evidence');
  });
});
