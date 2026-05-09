# 03 - V1 Demo Route Checklist

## Official Proof Scenario

Scenario name: `Commerce signal to funding readiness loop`

Business proof: one operator can follow an evidence-backed path from signal to demand, customer context, commerce execution, finance readiness, and outcome feedback.

## P0 Demo Route Checklist

| Step | Route | Area / Tower / Floor | QA proof target | Existing evidence |
| --- | --- | --- | --- | --- |
| 1 | `/intelligence/decision-hub` | Intelligence / Decision Hub / Decision queue | Trigger signal, confidence, source, target action, human approval boundary | `035-intelligence-decision-hub.png`, `036`, `037`, `038` |
| 2 | `/demand/leads-rfqs?lead=lead_1_1` | Demand / Leads & RFQs / RFQ intake | Demand input preserved from signal, owner, next action, evidence readback | `008-demand-leads-rfqs.png` |
| 3 | `/customer/crm-compact?floor=overview` | Customer / Customer Profile / Overview | Customer context and timeline/continuity target, not table-only view | `016-customer-customer-profile-overview.png` |
| 4 | `/customer/crm-compact?floor=account` | Customer / Customer Profile / Account Profile | Account owner, lifecycle, contact, quote/order/service context | `017-customer-customer-profile-account.png` |
| 5 | `/ecom/cos/oms/:id` | Ecom/COS / OMS / Order detail | Order state, SLA/routing owner, audit trail, no empty fallback | `048-ecom-detail-order-detail.png` |
| 6 | `/ecom/cos/returns/:id` | Ecom/COS / Fulfillment/Shipment / Return detail | Return execution state, owner, next action, exception path | `050-ecom-detail-return-detail.png` |
| 7 | `/finance/fin-support#documents` | Finance / Fin Support / Documents | Evidence pack and reusable docs with no approval overclaim | `013-finance-fin-support-documents.png` |
| 8 | `/finance/fin-support#status` | Finance / Fin Support / Status | Commerce-backed readiness/application state | `014-finance-fin-support-status.png` |
| 9 | `/intelligence/launch-decisions` | Intelligence / Launch Decisions / Outcome readback | Outcome closes loop with evidence/confidence | `045-intelligence-launch-decisions.png` |

P0 gate for every route:

- Answers `what happened`.
- Answers `what next`.
- Shows `who owns it`.
- Shows `what evidence`.
- Shows `business impact`.
- Has route owner and QA owner.
- Has desktop and mobile QA target.
- Has EN/VI/JA first-fold locale target.

## Proof Scenario Step Contract

| Step | Route | Operator action | Owner | Evidence | Business impact | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `/intelligence/decision-hub` | Review recommended opportunity/risk package. | Intelligence Operator | signal source, confidence, linked forecast/VOC/creator/customer evidence | Shows Prime OS can decide what matters now. | Send qualified signal to Demand. |
| 2 | `/demand/leads-rfqs?lead=lead_1_1` | Validate lead/RFQ and assign owner. | Demand Operator | campaign attribution, lead score, RFQ id, product/SKU reference | Converts signal into demand input. | Handoff buyer context to Customer. |
| 3 | `/customer/crm-compact?floor=overview` | Read customer continuity and next follow-up. | Customer Owner | lead/RFQ, order, service, finance signal references | Prevents Customer from being table-only CRM. | Open account context and confirm quote/order path. |
| 4 | `/customer/crm-compact?floor=account` | Confirm account owner, lifecycle, contact, and follow-up. | Customer Owner | account/contact/tags/identity evidence | Preserves buyer context before commerce execution. | Route quote/order work to Ecom/COS. |
| 5 | `/ecom/cos/oms/:id` | Inspect order state, SLA, routing, exception, audit. | OMS Owner | order events, SLA/routing state, inventory/fulfillment links | Proves COS is execution source of truth. | Send commerce evidence to Finance. |
| 6 | `/ecom/cos/returns/:id` | Inspect return/service risk and owner. | Fulfillment/Shipment Owner | return state, RMA, tracking/disposition, service link | Shows trust risk from execution. | Add blocker/evidence to finance readiness. |
| 7 | `/finance/fin-support#documents` | Check reusable commerce evidence pack. | Finance Owner | orders, documents, logistics/export, marketplace health | Proves readiness from commerce evidence. | Review status and blockers. |
| 8 | `/finance/fin-support#status` | Confirm readiness, blocker, and no-approval copy. | Finance Owner + Risk Reviewer | readiness, application status, bank-facing summary | Bridges commerce operations to funding readiness. | Feed outcome/readiness back to Intelligence. |
| 9 | `/intelligence/launch-decisions` | Review outcome feedback and next recommendation. | Intelligence Operator | accepted action, observed order/finance consequence, remaining risk | Closes the learning loop. | Decide next campaign/customer/COS action. |

## Per-Route QA Targets

| Route | Route owner | QA owner | Locale target | Mobile target | Required states |
| --- | --- | --- | --- | --- | --- |
| `/intelligence/decision-hub` | AI Engineer + FE | QA Expert | EN/VI/JA first fold | `390x844` | ready, loading, blocked |
| `/demand/leads-rfqs?lead=lead_1_1` | FE + BA | QA Expert | EN/VI/JA first fold | `390x844` | ready, empty/no lead, loading |
| `/customer/crm-compact?floor=overview` | UX + FE | QA Expert | EN/VI/JA first fold | `390x844` | ready, empty/no customer, loading |
| `/customer/crm-compact?floor=account` | UX + FE | QA Expert | EN/VI/JA first fold | `390x844` | ready, empty filter, dialog open |
| `/ecom/cos/oms/:id` | FE + OMS owner | QA Expert | EN/VI/JA first fold | `390x844` | ready, not found, loading |
| `/ecom/cos/returns/:id` | FE + Fulfillment owner | QA Expert | EN/VI/JA first fold | `390x844` | ready, not found, loading |
| `/finance/fin-support#documents` | FE + PM | QA Expert + Risk Reviewer | EN/VI/JA first fold | `390x844` | ready, missing docs, rejected doc |
| `/finance/fin-support#status` | FE + PM | QA Expert + Risk Reviewer | EN/VI/JA first fold | `390x844` | ready, blocker, in review |
| `/intelligence/launch-decisions` | AI Engineer + FE | QA Expert | EN/VI/JA first fold | `390x844` | ready, no outcome, blocked |

## Phase 1 Trust-Breaking Route Checklist

| Route | Risk | Owner | Sprint 1 gate |
| --- | --- | --- | --- |
| `/overview` | Duplicate critical narrative, mixed locale, unclear top action | Product Manager + UX Architect | <= 2 red critical signals first fold where possible; one top action visible |
| `/ecom/cos/policy-rule/sla` | Empty-looking policy page weakens policy claim | FE + Domain Architect | SLA state, owner, next action, policy source visible |
| `/ecom/cos/oms/:id` | Detail route can look empty/error-like | FE + OMS reviewer | state, SLA, owner, audit trail visible |
| `/ecom/cos/returns/:id` | Detail route can look empty/error-like | FE + Fulfillment reviewer | return state, disposition, owner, next action visible |
| `/intelligence/decision-hub` | Repeated narrative and weak evidence differentiation | AI Engineer + UX Architect | source/confidence/target action visible |
| `/finance/fin-support` | Finance wizard + Prime AI copy can overclaim | PM + Risk Reviewer | readiness language only, no approval/disbursement claim |
| command palette / Prime AI overlays | Mixed locale and AI-as-truth risk | QA + AI Engineer | localized first-fold labels; assistant cites system evidence |

## Screenshot Baseline

Current baseline:

- Folder: `research/screenshots/20260508-073532-primeos-pages-popups-vi/`
- Locale: `vi-VN`
- Viewport: `1440x1200`
- Count: `66`
- Status: all `ok`

Sprint 0 classification:

| Classification | Screenshot indexes | Use |
| --- | --- | --- |
| P0 proof route | `035`, `008`, `016`, `017`, `048`, `050`, `013`, `014`, `045` | Official V1 evidence path |
| P0 detail risk | `032`, `048`, `050` | Trust-breaking empty/detail pages |
| Overlay risk | `051`, `052`, `060`, `066` | Command palette, Prime AI, finance AI, creator shortlist |
| Regression breadth | all `001-066` | Route corpus must recapture with zero route failure |

Missing Sprint 1+ evidence targets:

- EN first-fold screenshot for official proof route list.
- JA first-fold screenshot for official proof route list.
- Mobile `390x844` screenshot for official proof route list.
- Failure/empty-state screenshot for order not found, return not found, no lead/customer match, and finance blocker state.

## Validation Commands

Run from `prime-os-phase-1/app`:

```bash
npm run lint
npm run test
npm run build
npm run test:ui -- prime-route-shell.spec.ts
npm run test:ui -- cos-critical-flows.spec.ts
npm run test:ui -- ui-a11y-shell.spec.ts
npm run test:ui -- ui-responsive-genesis.spec.ts
npm run test:ui -- ui-regression.spec.ts
npm run test:ui -- ui-darkmode-regression.spec.ts
```

Sprint 0 is documentation/contract work, so these commands are Sprint 1 readiness commands. Sprint 0 validation is markdown/file integrity plus traceability.
