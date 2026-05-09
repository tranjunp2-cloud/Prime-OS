# Phase 5 - Intelligence Learning Loop Evidence

Ngày cập nhật: 2026-05-09

## Context

Project context: Prime OS.

Business goal: Intelligence Area becomes a learning loop, not another dashboard. Recommendations must show why, source, confidence, feedback, and outcome readback before they can influence Demand/COS/Customer/Finance work.

Stakeholders:

- Operator needs to know why Prime OS recommends an action and who owns execution.
- PM/manager needs source, confidence, rejected alternatives, and audit-friendly evidence.
- AI Engineer needs Prime AI/model output bounded as explanation, not source of truth.
- Domain owners need source-of-truth ownership preserved across Demand, Customer, OMS, Inventory, Finance, and Fulfillment/Shipment.

## Implementation Scope

P0 completed:

- Added Phase 5 Intelligence contracts in app code:
  - `IntelligenceSignal`
  - `SignalLineage`
  - `RecommendationEvidence`
  - `RecommendationFeedback`
  - `ActionOutcome`
- Extended Decision Hub packages with source-owner evidence, confidence reason, generated-by metadata, rejected alternatives, guardrails, feedback, and action outcome readback.
- Added Decision Hub UI proof sections for recommendation evidence, feedback/outcome loop, and explicit Prime AI/model guardrail copy.
- Added Signals UI proof for signal lineage trail, source owner, linked entity, and evidence route.
- Added Launch Decisions UI proof for outcome feedback, Demand execution ownership, OMS order-truth ownership, and Intelligence readback ownership.

Deferred:

- Real ML learning.
- Backend persistence for recommendation feedback/outcomes.
- Full Signals capability split into separate production modules.
- Automated action optimization.
- Full prompt/model audit storage.

## Boundary Decisions

Intelligence owns:

- Recommendation read model.
- Signal lineage read model.
- Evidence packaging and confidence explanation.
- Feedback/outcome readback into learning loop.

Intelligence reads but does not own:

- Demand campaign execution, lead/RFQ truth, and handoff action state.
- Customer VOC/service/customer context truth.
- OMS order truth.
- Inventory forecast/ATS guardrail truth.
- Finance readiness truth.
- Fulfillment/Shipment delivery/return proof.

Guardrails:

- `sourceOfTruthOwner` is required on evidence/outcome read models.
- Prime AI/model output is allowed only as explanation/generation metadata, not business source truth.
- Missing or blocking guardrail evidence keeps recommendations in review/blocked states.
- Execution remains owner-approved; Intelligence cannot auto-execute Demand/COS/Customer/Finance work.

## Validation

Commands run from `prime-os-phase-1/app`:

```bash
npm run test -- src/lib/prime/intelligence-workspace.test.ts
npm run test:ui -- tests/prime-route-shell.spec.ts --grep "Phase 5 Intelligence"
npm run lint
npm run build:dev
```

## Acceptance Status

| Acceptance | Status | Evidence |
| --- | --- | --- |
| Every proof-scenario recommendation has why, source, confidence, target action. | Complete | Decision Hub shows recommendation evidence, confidence reason, source owner, guardrails, and Demand handoff. |
| At least 1 action outcome feeds back into Intelligence. | Complete | Campaign-created outcome is read back with Demand and OMS-owned metrics. |
| Prime AI cannot appear as source of truth. | Complete | Contract and UI copy state model output is explanation only; evidence uses source owners. |
| Decision Hub and Signals have distinct jobs. | Complete | Decision Hub reviews recommendation packages; Signals validates lineage/source evidence. |
| Non-proof Intelligence surfaces can defer deeper split. | Complete | Full production Signals split and real ML learning deferred. |

## Residual Risks

- Feedback/outcome persistence is still mock/read-model only.
- Signal lineage timestamps are demo labels, not production event timestamps.
- Query variants for Decision Hub and Signals still share major components; V1.1 can deepen route-specific UX after release proof.
