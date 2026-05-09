export type PrimeRole = 'factory' | 'agency' | 'bank' | 'lead-provider' | 'creator-agency';

export type RoleCapability = {
  label: string;
  boundary: 'Can view' | 'Can act' | 'Needs approval';
  detail: string;
};

export type PartnerHandoff = {
  label: string;
  owner: string;
  evidence: string;
  nextAction: string;
  href: string;
};

export type PartnerWorkspaceSummary = {
  role: PrimeRole;
  title: string;
  job: string;
  evidence: string;
  nextAction: string;
  boundary: string;
  capabilities: RoleCapability[];
  handoffs: PartnerHandoff[];
};

export const PRIME_ROLE_LABELS: Record<PrimeRole, string> = {
  factory: 'Factory owner',
  agency: 'Agency operator',
  bank: 'Bank reviewer',
  'lead-provider': 'Lead provider',
  'creator-agency': 'Creator / KOL agency',
};

const partnerWorkspaces: Record<PrimeRole, PartnerWorkspaceSummary> = {
  factory: {
    role: 'factory',
    title: 'Factory owner operating view',
    job: 'See sales output, fulfillment risk, inventory pressure, and funding readiness before approving scale.',
    evidence: 'Reads Demand leads/RFQs, OMS orders, Inventory ATS, Customer repeat signals, and Finance readiness.',
    nextAction: 'Approve the next production or funding review handoff only after blockers are visible.',
    boundary: 'Can review operating evidence and request owner action; cannot edit OMS, Inventory, Finance, or Customer source truth from this demo view.',
    capabilities: [
      { label: 'View commerce output', boundary: 'Can view', detail: 'Orders, RFQs, lead conversion, and revenue-at-risk summary.' },
      { label: 'Request owner follow-up', boundary: 'Needs approval', detail: 'Routes action to the owning Area instead of bypassing workflow.' },
      { label: 'Approve demo scale decision', boundary: 'Can act', detail: 'Marks the next review step for the operator walkthrough only.' },
    ],
    handoffs: [
      { label: 'Funding readiness', owner: 'Finance', evidence: 'Financial Trust Profile', nextAction: 'Review funding package', href: '/finance/fin-support?role=bank' },
      { label: 'Order risk', owner: 'Ecom / COS', evidence: 'OMS + Inventory signals', nextAction: 'Clear fulfillment blocker', href: '/ecom/cos/oms' },
    ],
  },
  agency: {
    role: 'agency',
    title: 'Agency operator delegated workspace',
    job: 'Run delegated demand/customer tasks and report outcomes without owning merchant system-of-record data.',
    evidence: 'Reads campaign queue, lead response state, CRM handoff status, and reportable order outcomes.',
    nextAction: 'Work the assigned response queue and return proof to the merchant operator.',
    boundary: 'Can update assigned task status in demo language; cannot change product truth, order state, finance readiness, or customer identity ownership.',
    capabilities: [
      { label: 'View assigned queue', boundary: 'Can view', detail: 'Campaign, lead, RFQ, and customer follow-up context.' },
      { label: 'Prepare response', boundary: 'Can act', detail: 'Draft outreach and reportable outcome notes for owner review.' },
      { label: 'Escalate exceptions', boundary: 'Needs approval', detail: 'Blocked orders, refunds, or finance-sensitive claims stay owner-approved.' },
    ],
    handoffs: [
      { label: 'Lead response', owner: 'Demand', evidence: 'Lead + RFQ queue', nextAction: 'Prepare response proof', href: '/demand/leads-rfqs?role=agency' },
      { label: 'Customer follow-up', owner: 'Customer', evidence: 'CRM timeline', nextAction: 'Return outcome note', href: '/customer/crm-compact' },
    ],
  },
  bank: {
    role: 'bank',
    title: 'Bank reviewer evidence workspace',
    job: 'Review a funding package preview with source evidence, blockers, document state, and next action.',
    evidence: 'Reads Financial Trust Profile, Commerce Evidence Pack, document state, and no-approval guardrail.',
    nextAction: 'Request missing evidence or move the package to human lender review outside PrimeOS.',
    boundary: 'Can review evidence preview only; PrimeOS does not approve credit, underwrite, commit terms, or disburse funds.',
    capabilities: [
      { label: 'Review evidence package', boundary: 'Can view', detail: 'Readiness score, coverage, blocker, and document status.' },
      { label: 'Request missing docs', boundary: 'Needs approval', detail: 'Merchant/operator must upload and verify documents.' },
      { label: 'Credit decision', boundary: 'Needs approval', detail: 'Decision remains lender-owned outside PrimeOS.' },
    ],
    handoffs: [
      { label: 'Evidence pack', owner: 'Finance', evidence: 'Bank Review Summary', nextAction: 'Review blocker', href: '/finance/fin-support#bank-review-summary' },
      { label: 'Commerce source', owner: 'OMS / Demand / Inventory', evidence: 'Source-owner mapping', nextAction: 'Verify source coverage', href: '/finance/fin-support#commerce-evidence-pack' },
    ],
  },
  'lead-provider': {
    role: 'lead-provider',
    title: 'Lead provider contribution view',
    job: 'See lead quality, conversion feedback, and what proof is needed before more leads are accepted.',
    evidence: 'Reads lead quality, RFQ conversion, campaign context, and downstream order feedback.',
    nextAction: 'Improve source quality or route warmer leads to the assigned Demand owner.',
    boundary: 'Can view contribution feedback and submit lead context; cannot access full CRM, Finance, OMS, or customer private records.',
    capabilities: [
      { label: 'View conversion feedback', boundary: 'Can view', detail: 'Lead-to-RFQ and lead-to-order signals.' },
      { label: 'Submit source context', boundary: 'Can act', detail: 'Adds attribution/evidence notes for Demand review.' },
      { label: 'Access customer records', boundary: 'Needs approval', detail: 'Private CRM and order details stay merchant-owned.' },
    ],
    handoffs: [
      { label: 'Lead quality loop', owner: 'Demand', evidence: 'Lead + RFQ conversion', nextAction: 'Tune source mix', href: '/demand/sources' },
      { label: 'Outcome feedback', owner: 'Intelligence', evidence: 'Conversion signal', nextAction: 'Update source scoring', href: '/intelligence/signals' },
    ],
  },
  'creator-agency': {
    role: 'creator-agency',
    title: 'Creator agency performance view',
    job: 'Tie creator traffic to leads, RFQs, orders, and launch decisions without owning merchant operations.',
    evidence: 'Reads creator fit, audience quality, campaign proof, lead conversion, and order readback.',
    nextAction: 'Propose the next creator proof asset or escalation to Demand/Intelligence owner.',
    boundary: 'Can view creator proof and propose assets; cannot change SKU truth, pricing, order state, or finance readiness.',
    capabilities: [
      { label: 'View creator proof', boundary: 'Can view', detail: 'Creator fit, audience quality, traffic, leads, and orders.' },
      { label: 'Propose launch asset', boundary: 'Can act', detail: 'Submits draft proof for Demand owner approval.' },
      { label: 'Change offer or SKU', boundary: 'Needs approval', detail: 'Product Master and merchant owner retain source truth.' },
    ],
    handoffs: [
      { label: 'Creator signal', owner: 'Intelligence', evidence: 'Creator fit + VOC', nextAction: 'Review launch match', href: '/intelligence/signals?view=creators' },
      { label: 'Campaign activation', owner: 'Demand', evidence: 'Creator proof asset', nextAction: 'Approve campaign route', href: '/demand/content-social?view=creator-proof' },
    ],
  },
};

export function getPartnerWorkspaceSummary(role: PrimeRole | string | null): PartnerWorkspaceSummary | null {
  if (!role || !(role in partnerWorkspaces)) return null;
  return partnerWorkspaces[role as PrimeRole];
}
