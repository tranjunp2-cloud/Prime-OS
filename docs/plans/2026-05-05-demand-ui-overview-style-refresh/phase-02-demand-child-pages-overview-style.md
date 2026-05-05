# Phase 02: Demand Child Pages Overview Style

## Context Links
- Parent: `plan.md`
- Scout: `scout/01-demand-code-map.md`
- Research: `research/01-overview-style-and-demand-ux.md`

## Parallelization Info
- Can run with Phase 01 only if ownership is limited to `DemandExecutionPanel`.
- Must finish before Phase 03.

## Overview
- Date: 2026-05-05
- Description: Make Campaigns, Content & Social, Leads & RFQs, Re-engage read like focused Demand workspaces, not separate tool cards.
- Priority: P2
- Implementation status: completed
- Review status: passed

## Key Insights
- Existing child pages already have tabs, focused URL context, recommended action, action setup dialog.
- Main problem is hierarchy/copy density, not missing capability.

## Requirements
- Preserve route tabs and focused URL context behavior.
- Put a compact command bar/recommended action above fold.
- Convert action-card area into a clearer action queue on dense screens.
- Add explicit readback panel: CRM/COS/Intelligence destination and outcome.
- Replace legacy/internal copy where visible: "Campaign Ops" -> "Campaigns", "Creator Ops" -> "Content & Social".

## Architecture
- Keep all action arrays and `runDemandAction`.
- Keep setup dialog behavior.
- Add local render helpers only inside `DemandExecutionPanel`.

## Related Code Files
- `prime-os-phase-1/app/src/pages/prime/PrimeTowerPage.tsx`

## File Ownership
- Owns only `DemandExecutionPanel`, its local helper render functions, and visible Demand child copy in the same section.
- No `PrimeDemandHubPage` edits.

## Implementation Steps
1. Audit current four route variants and query hints.
2. Replace large product-signal hero with compact command bar.
3. Keep recommended action first.
4. Rework action list into readable queue/list with stable heights.
5. Add readback/guardrail panel near execution proof.
6. Preserve dialog safety note and toast behavior.

## Todo
- [x] Update page copy.
- [x] Add command bar.
- [x] Rework action list layout.
- [x] Add readback panel.
- [x] Verify query context visuals.

## Success Criteria
- Each child page answers: what action, why now, owner, target, guardrail, next system.
- Legacy route tests still find focused context and active Demand tab.

## Conflict Prevention
- Do not touch `PrimeDemandHubPage`.
- Avoid moving shared components outside the file unless Phase 01 agrees.

## Risk Assessment
- Medium: tests may rely on legacy heading `Campaign Ops`.
- Mitigation: update tests in Phase 03 only after UI copy decision.

## Security Considerations
- Action buttons remain local mock operations.
- Safety note stays visible in setup dialog.

## Next Steps
- Phase 03 updates tests and runs QA.
