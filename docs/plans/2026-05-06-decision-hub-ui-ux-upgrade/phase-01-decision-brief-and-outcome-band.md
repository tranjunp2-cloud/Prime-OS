# Phase 01 — Decision Brief And Outcome Band

## Context links
- Parent: `plan.md`
- Lazyweb: `.lazyweb/design-improve/decision-hub-2026-05-06/report.md`
- Code: `prime-os-phase-1/app/src/components/prime/PrimeOperatingSystem.tsx`, `prime-os-phase-1/app/src/pages/prime/PrimeTowerPage.tsx`

## Overview
- Date: 2026-05-06
- Description: Replace flat hero/metric hierarchy with one operator decision brief and outcome-learning band.
- Priority: P1
- Implementation status: completed
- Review status: completed

## Key Insights
- Above fold must answer: decision, why now, owner, next action, confidence, SLA.
- Current readiness + signals/models/actions cards repeat info without enough operator priority.

## Requirements
- Add compact decision brief using existing cards/badges/progress/buttons.
- Surface top decision, evidence, owner handoff, urgency/SLA, confidence.
- Reframe KPI cards as outcome learning: closed loop, accuracy/confidence trend, stale evidence, projected lift.

## Architecture
- UI-only composition; no new business rules.
- If data fields missing, derive display from existing mock contract names and mark as replaceable.
- Keep reusable component props generic: `DecisionBrief`, `OutcomeLearningBand` only if extraction reduces duplication.

## Related code files
- `prime-os-phase-1/app/src/components/prime/PrimeOperatingSystem.tsx`
- `prime-os-phase-1/app/src/pages/prime/PrimeTowerPage.tsx`

## Implementation Steps
1. Identify Decision Hub render block and existing data arrays.
2. Add decision brief section above loop/workbench.
3. Replace repeated metric strip with outcome-learning band.
4. Preserve existing CTA routes.
5. Verify responsive stacking at 375px, 768px, desktop.

## Todo list
- [x] Map current data to brief fields.
- [x] Create brief UI.
- [x] Create outcome-learning band.
- [x] Remove/reposition duplicate metric cards.

## Success Criteria
- First viewport has one obvious primary action.
- Operator can identify next decision without scrolling.
- No duplicated readiness/signal cards in above-fold area.

## Risk Assessment
- Risk: over-compressing context. Mitigation: keep secondary details in workbench/drawer.

## Security Considerations
- No execution side effects.
- No AI action escalation.

## Next steps
- Continue Phase 02 workbench.
