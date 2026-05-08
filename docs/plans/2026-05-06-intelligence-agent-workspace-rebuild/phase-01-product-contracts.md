# Phase 01 — Product Contracts

## Context Links

- Parent plan: `docs/plans/2026-05-06-intelligence-agent-workspace-rebuild/plan.md`
- Main code likely: `prime-os-phase-1/app/src/pages/prime/PrimeTowerPage.tsx`
- Data likely: `prime-os-phase-1/app/src/lib/prime/prime-data.ts`

## Overview

- Date: 2026-05-06
- Priority: P1
- Status: completed
- Review status: not reviewed

Define the core Intelligence objects before UI rebuild.

## Key Insights

- Intelligence needs product objects, not just visual cards.
- `DecisionPackage` is the central object.
- Demand handoff must be typed and traceable.

## Requirements

- Define `SignalCard`.
- Define `AgentEvidenceReport`.
- Define `DecisionPackage`.
- Define `DemandHandoff`.
- Define `IntelligenceReadback`.
- Map current mock snapshot into these objects.

## Architecture

- Keep contracts in Intelligence domain layer or near existing Prime mock data first.
- Avoid putting Demand execution logic in Intelligence.
- Use mock data first; API can replace later.

## Related Code Files

- `prime-os-phase-1/app/src/lib/prime/prime-data.ts`
- `prime-os-phase-1/app/src/pages/prime/PrimeTowerPage.tsx`

## Implementation Steps

1. Locate existing Prime snapshot types.
2. Add or derive Intelligence workspace types.
3. Create mock `decisionPackages` from campaigns, forecasts, social streams, VOC, recommendations.
4. Add status enum.
5. Add helper selectors.

## Todo List

- [ ] Define type contracts.
- [ ] Create mock data mapping.
- [ ] Add helper for package confidence.
- [ ] Add helper for package status.
- [ ] Add helper for Demand target route.

## Success Criteria

- Decision packages can be rendered without UI-specific transformation.
- Each package has evidence, confidence, risk, owner, and handoff payload.
- No Demand mutation logic added.

## Risk Assessment

- Risk: over-modeling too early.
- Mitigation: keep V1 fields only; expand after UI proof.

## Security Considerations

- Agent output must be auditable.
- No external send/execution in this phase.

## Next Steps

Move to Phase 2 workspace shell.
