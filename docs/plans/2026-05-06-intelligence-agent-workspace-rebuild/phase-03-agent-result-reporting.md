# Phase 03 — Agent Result Reporting

## Context Links

- Parent plan: `docs/plans/2026-05-06-intelligence-agent-workspace-rebuild/plan.md`
- Depends on: Phase 01, Phase 02

## Overview

- Date: 2026-05-06
- Priority: P1
- Status: pending
- Review status: not reviewed

Make agent output explainable and trustworthy.

## Key Insights

- Operators need proof chain, not AI prose.
- Trust requires evidence, freshness, confidence, and alternatives.

## Requirements

- Agent report cards.
- Evidence list.
- Confidence meter.
- Source freshness.
- Rejected alternatives.
- Risk/guardrail summary.

## Architecture

- Reports belong to selected DecisionPackage.
- Evidence grouped by decision, not by source type.

## Related Code Files

- `prime-os-phase-1/app/src/pages/prime/PrimeTowerPage.tsx`
- `prime-os-phase-1/app/src/lib/prime/prime-data.ts`

## Implementation Steps

1. Render report summary.
2. Add evidence stack.
3. Add confidence/freshness.
4. Add rejected alternatives.
5. Add risk summary.

## Todo List

- [ ] Agent report component.
- [ ] Evidence item component.
- [ ] Confidence display.
- [ ] Freshness display.
- [ ] Risk display.

## Success Criteria

- Operator can explain why package exists.
- Operator can see weak evidence quickly.
- Operator can request more data when evidence weak.

## Risk Assessment

- Risk: fake certainty.
- Mitigation: confidence + rejected alternatives + stale markers.

## Security Considerations

- Display AI confidence as support, not truth.
- Avoid wording that implies autonomous execution.

## Next Steps

Phase 4 Demand handoff preview.
