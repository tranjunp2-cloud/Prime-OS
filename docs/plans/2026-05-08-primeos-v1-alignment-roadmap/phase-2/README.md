# Phase 2 - Customer Area Execution Evidence

Ngày cập nhật: 2026-05-09

## Context

Project context: Prime OS.

Business goal: Customer Area trở thành relationship/context layer nối Demand, Ecom/COS, Service, Finance và Intelligence, thay vì chỉ là bảng CRM.

Stakeholders:

- Sales/operator cần biết khách hàng là ai, chuyện gì đã xảy ra, bước tiếp theo là gì, ai sở hữu, và vì sao quan trọng.
- Service operator cần thấy case owner, SLA, pending action, và customer/order context.
- PM/QA cần chứng minh Customer không duplicate truth từ Demand, OMS, Service hoặc Finance.

## Implementation Scope

P0 completed:

- Added typed Customer Phase 2 read-model contracts in app code:
  - `CustomerTimelineEvent`
  - `CustomerLifecycleStage`
  - `CustomerFollowUp`
  - `CustomerRFQQuoteLink`
  - `CustomerServiceCase`
- Mapped current mock snapshot into typed Customer read models with explicit `sourceOfTruthOwner` and `readModelOwner`.
- Upgraded `/customer/crm-compact?floor=overview` from readiness-only overview to relationship context:
  - lifecycle owner
  - primary contact
  - next action
  - business impact
  - unified timeline
  - follow-up queue
  - RFQ/quote/order continuity preview
- Upgraded account profile dialog with typed timeline, follow-up, continuity, and service/SLA panels.
- Upgraded `/customer/service` with active service ownership panel:
  - case owner
  - SLA state
  - pending action
  - related customer/order context
  - service issue to Intelligence handoff
- Added targeted Vitest and Playwright coverage for Customer contracts, Customer Profile UI, and Service ownership/SLA evidence.

Deferred:

- Dedicated timeline event filters.
- Dedicated retention/repeat purchase signal card.
- Lifecycle-stage automation beyond typed read-model derivation.
- Advanced retention automation.
- Full quote editor.
- Service automation engine.
- Real partner/customer portals.
- Real RBAC or permission model.

## Boundary Decisions

Customer owns:

- Account identity read model.
- Lifecycle stage.
- Follow-up queue.
- Customer relationship timeline composition.

Customer reads but does not own:

- Demand lead/RFQ state.
- OMS order lifecycle and order events.
- Fulfillment/Shipment return execution.
- Finance readiness or funding eligibility.
- Intelligence signal truth.

Guardrail:

- Any Customer timeline event must keep `sourceOfTruthOwner`, `sourceEntityType`, `sourceEntityId`, `readModelOwner`, `nextAction`, and `businessImpact`.
- Customer UI can display continuity, but quote/order/service state remains owned by the corresponding source domain.

## Validation

Commands run from `prime-os-phase-1/app`:

```bash
npm run test -- src/lib/prime/customer-profile-floor.test.ts src/lib/prime/prime-navigation.test.ts
npm run lint
npm run build:dev
npm run test:ui -- tests/prime-route-shell.spec.ts --grep "Customer Profile|customer|Service"
```

Results:

- Vitest: `8 passed`.
- ESLint: `0 errors`, existing warnings only.
- Build dev: passed.
- Playwright targeted Customer/Service route shell: `7 passed`.

## Acceptance Status

| Acceptance | Status | Evidence |
| --- | --- | --- |
| Customer default view answers who, what happened, what next, owner, and business impact. | Complete | Relationship overview and typed timeline/follow-up queue. |
| At least 3 cross-area timeline event types visible. | Complete | Timeline maps Customer, Demand, Ecom/COS, Service, Finance, and Intelligence sources when present. |
| Service page no longer reads as preview-only. | Complete | Service ownership panel plus owner/SLA/pending action table columns. |
| Customer no longer depends on table view as primary mental model. | Complete | Overview starts from relationship context; account table stays in Account Profile floor. |
| No duplicate customer truth between profile, service, and dialogs. | Complete | Source owner metadata added to read-model contracts. |
| Search/filter does not break. | Complete | Existing account search/filter remains functional and can match timeline/follow-up context; dedicated timeline event filters are deferred. |
| Create/edit dialogs preserve tag/contact behavior. | Complete | Existing tag/contact editor retained; tests cover profile and tag flow. |
