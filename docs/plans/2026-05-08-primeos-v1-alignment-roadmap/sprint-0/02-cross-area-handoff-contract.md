# 02 - Cross-Area Handoff Contract

## Purpose

Prime OS V1 proof depends on visible, auditable handoffs. A handoff is not only a link between pages; it is an operating object that states source, target, owner, next action, evidence, impact, status, and audit trail.

Supported proof path:

`Intelligence -> Demand -> Customer -> Ecom/COS -> Finance -> Intelligence`

## TypeScript Contract

```ts
type PrimeArea = 'Intelligence' | 'Demand' | 'Customer' | 'Ecom/COS' | 'Finance';

type PrimeLinkedEntityType =
  | 'audit_id'
  | 'creator'
  | 'domain_event'
  | 'finance_profile'
  | 'sku'
  | 'product'
  | 'listing'
  | 'warehouse'
  | 'campaign'
  | 'lead'
  | 'rfq'
  | 'customer'
  | 'order'
  | 'order_event'
  | 'reservation'
  | 'shipment'
  | 'return'
  | 'ticket'
  | 'policy'
  | 'routing_plan'
  | 'segment'
  | 'sla'
  | 'recommendation';

type PrimeHandoffStatus =
  | 'draft'
  | 'ready'
  | 'blocked'
  | 'sent'
  | 'accepted'
  | 'rejected'
  | 'completed'
  | 'learned';

type PrimeEvidenceItem = {
  source: string;
  entityId?: string;
  label: string;
  value: string;
  freshness?: string;
};

type PrimeBusinessImpact = {
  metric: string;
  value: string;
  rationale: string;
};

type PrimeHandoff = {
  id: string;
  sourceArea: PrimeArea;
  sourceTower: string;
  sourceFloor?: string;
  targetArea: PrimeArea;
  targetTower: string;
  targetFloor?: string;
  sourceOfTruthOwner: string;
  readModelOwner?: string;
  linkedEntityType: PrimeLinkedEntityType;
  linkedEntityId: string;
  trigger: string;
  nextAction: string;
  owner: string;
  status: PrimeHandoffStatus;
  evidence: PrimeEvidenceItem[];
  businessImpact: PrimeBusinessImpact;
  guardrails: string[];
  requiresHumanApproval: boolean;
  auditId: string;
  createdAt: string;
  updatedAt: string;
};
```

## Common Card / Action Metadata

```ts
type PrimeActionStatus =
  | 'ready'
  | 'watch'
  | 'critical'
  | 'blocked'
  | 'done'
  | 'read_only'
  | 'permission_required';

type PrimeAllowedAction =
  | 'view'
  | 'draft'
  | 'send'
  | 'approve'
  | 'reject'
  | 'escalate';

type PrimeActionMetadata = {
  id: string;
  title: string;
  area: PrimeArea;
  tower: string;
  floor?: string;
  owner: string;
  nextAction: string;
  sourceArea?: PrimeArea;
  targetArea?: PrimeArea;
  sourceOfTruthOwner: string;
  linkedEntityType: PrimeLinkedEntityType;
  linkedEntityId: string;
  evidence: PrimeEvidenceItem[];
  businessImpact: PrimeBusinessImpact;
  status: PrimeActionStatus;
  priority?: 'P0' | 'P1' | 'P2';
  confidence?: number;
  dueAt?: string;
  auditId: string;
  href: string;
  allowedActions?: PrimeAllowedAction[];
};
```

## Required Handoffs For V1 Proof

| Handoff | Source | Target | Required evidence | Owner |
| --- | --- | --- | --- | --- |
| H1 | Intelligence / Decision Hub | Demand / Leads & RFQs | signal source, confidence, forecast/creator/customer/VOC evidence | Intelligence Operator; source truth belongs to evidence source domain |
| H2 | Demand / Leads & RFQs | Customer / Customer Profile | lead score, RFQ id, campaign attribution, buyer context | Demand Operator |
| H3 | Customer / Customer Profile | Ecom/COS / OMS or Commerce Surface | customer lifecycle, quote/RFQ continuity, owner, next action | Customer Owner |
| H4 | Ecom/COS / OMS | Finance / Fin Support | order state, SLA, fulfillment/tracking, return/refund risk, audit id | OMS Owner |
| H5 | Finance / Fin Support | Intelligence / Decision Hub | readiness status, blocker, document state, bank summary, no-approval copy guardrail | Finance/Risk Owner |

## Validation Rules

- A handoff is invalid if `sourceOfTruthOwner` is empty.
- A handoff is invalid if `linkedEntityId` points to a display-only mock object with no replacement API path.
- Intelligence may be `sourceArea`, but Intelligence or Prime AI cannot be `sourceOfTruthOwner` unless the linked entity is an Intelligence-owned recommendation/readback. For cross-domain evidence, `sourceOfTruthOwner` must be the underlying evidence source domain, such as Demand, Customer, Product Master, OMS, Inventory, Fulfillment/Shipment, Finance, or Event & Audit.
- Ecom/COS handoff must name one bounded context: Product Master, OMS, Inventory, or Fulfillment/Shipment.
- Finance handoff must cite commerce evidence; it cannot rely on accounting-only KPI.
- Role-specific surfaces can filter handoffs, but must not create new operational truth.

## Example

```ts
const exampleHandoff: PrimeHandoff = {
  id: 'handoff_intel_demand_001',
  sourceArea: 'Intelligence',
  sourceTower: 'Decision Hub',
  sourceFloor: 'Decision queue',
  targetArea: 'Demand',
  targetTower: 'Leads & RFQs',
  targetFloor: 'RFQ intake',
  sourceOfTruthOwner: 'Inventory',
  readModelOwner: 'Intelligence/Demand',
  linkedEntityType: 'recommendation',
  linkedEntityId: 'rec_high_intent_creator_rfq',
  trigger: 'Creator traffic converts into RFQs while ATS/SLA risk is rising.',
  nextAction: 'Review RFQ owner and route qualified buyer into Customer timeline.',
  owner: 'Demand Operator',
  status: 'ready',
  evidence: [
    { source: 'Signals', entityId: 'sig_creator_fit_001', label: 'Creator fit', value: 'High', freshness: '12m' },
    { source: 'Inventory', entityId: 'sku_001', label: 'ATS risk', value: 'Medium', freshness: 'live' }
  ],
  businessImpact: {
    metric: 'qualified_rfq_value',
    value: 'P0 proof route',
    rationale: 'Links demand signal to customer, OMS, and finance readiness.'
  },
  guardrails: ['Human approval required before customer message or paid spend.'],
  requiresHumanApproval: true,
  auditId: 'audit_prime_v1_s0_001',
  createdAt: '2026-05-08T00:00:00.000Z',
  updatedAt: '2026-05-08T00:00:00.000Z'
};
```
