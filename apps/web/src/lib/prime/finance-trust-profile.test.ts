import { describe, expect, it } from 'vitest';
import { buildFinanceTrustProfile, type FinanceDocumentLike } from './finance-trust-profile';
import type { FinanceControlPlaneSnapshot } from './finance-control-plane';
import { getPrimeSnapshot } from './prime-data';
import type { Order, OrderItem } from '@/lib/oms-types';

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

function makeMalaysiaOrder(): Order {
  return {
    id: 'ord_my_finance',
    user_id: 'user_demo',
    order_id: 'PRIME-MY-FIN-001',
    channel: 'shopee',
    channel_order_ref: 'SHO-MY-001',
    customer_name: 'Ahmad Razali',
    customer_email: 'ahmad.r@example.my',
    customer_phone: '+60-12-345-6789',
    shipping_address: '78 Jalan Bukit Bintang, Kuala Lumpur 50000, MY',
    shipping_method: null,
    tracking_number: 'TRKMYFIN001',
    ship_to: {
      name: 'Ahmad Razali',
      phone: '+60-12-345-6789',
      address1: '78 Jalan Bukit Bintang',
      city: 'Kuala Lumpur',
      prefecture: 'Kuala Lumpur',
      postal_code: '50000',
      country: 'MY',
    },
    currency: 'MYR',
    subtotal_amount: 1000,
    shipping_amount: 20,
    discount_amount: 0,
    total_amount: 1020,
    status: 'completed',
    lifecycle_stage: 'delivered',
    risk_flags: [],
    allocated_warehouse_id: 'wh_fbsmy',
    allocation_policy_snapshot: null,
    sla_target_days: 3,
    order_date: '2026-06-01T09:00:00.000Z',
    created_at: '2026-06-01T09:00:00.000Z',
    updated_at: '2026-06-02T09:00:00.000Z',
    warehouse_id: 'wh_fbsmy',
  };
}

const malaysiaOrderItem: OrderItem = {
  id: 'item_my_finance',
  order_id: 'ord_my_finance',
  sku: 'SKU-MY-FIN',
  product_name: 'Malaysia finance evidence item',
  quantity: 1,
  price_per_unit: 1000,
  created_at: '2026-06-01T09:00:00.000Z',
};

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
    expect(result.profile.receivables.sourceOwners).toEqual(expect.arrayContaining(['CRM', 'Finance', 'OMS']));
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
      'CRM',
      'Fulfillment / Shipment',
      'Marketplace',
    ]));
    expect(result.evidencePack.items.find((item) => item.id === 'settlements')?.status).toBe('reusable');
    expect(result.evidencePack.items.find((item) => item.id === 'invoices')?.status).toBe('uploaded');
    expect(result.evidencePack.items.find((item) => item.id === 'invoices')?.connectorEvidence).toBeUndefined();
    expect(result.evidencePack.items.find((item) => item.id === 'logistics-export')?.status).toBe('rejected');
    expect(result.bankReviewSummary.guardrailCopy).toContain('Preview only');
    expect(result.bankReviewSummary.guardrailCopy).toContain('no approval promise');
    expect(result.bankReviewSummary.nextAction).toContain('evidence');
  });

  it('surfaces MyInvois connector evidence when Malaysia-scope invoices exist', () => {
    const result = buildFinanceTrustProfile({
      snapshot: {
        ...getPrimeSnapshot(),
        orders: [makeMalaysiaOrder()],
        orderItems: [malaysiaOrderItem],
        orderEvents: [],
        returnsCount: 0,
      },
      controlPlane,
      documents,
      fundingRange: 'RM48,000-RM64,800',
    });

    const invoiceEvidence = result.evidencePack.items.find((item) => item.id === 'invoices');

    expect(invoiceEvidence?.status).toBe('verified');
    expect(invoiceEvidence?.label).toContain('MyInvois-valid');
    expect(invoiceEvidence?.connectorEvidence).toMatchObject({
      label: 'Malaysia MyInvois',
      status: 'verified',
    });
  });
});
