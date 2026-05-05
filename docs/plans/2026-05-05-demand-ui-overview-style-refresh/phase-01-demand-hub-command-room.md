# Phase 01: Demand Hub Command Room

## Context Links
- Parent: `plan.md`
- Scout: `scout/01-demand-code-map.md`
- Research: `research/01-overview-style-and-demand-ux.md`
- Reference: `prime-os-phase-1/app/src/pages/prime/PrimeOverview.tsx`

## Parallelization Info
- Can run with Phase 02 only if both workers coordinate inside `PrimeTowerPage.tsx`.
- Must finish before Phase 03.

## Overview
- Date: 2026-05-05
- Description: Turn `PrimeDemandHubPage` into an Overview-style Demand command room.
- Priority: P2
- Implementation status: completed
- Review status: passed

## Key Insights
- Demand Hub already has evidence, loop, metrics, moves, outcome readback.
- Missing hierarchy: ranked next action + guardrail status should be top-level.

## Requirements
- Add compact Demand command bar similar to Operating Home.
- Add Demand health row: source, campaign, response, re-engage, outcome.
- Add Priority Demand Queue across campaigns/leads/RFQs/re-engage.
- Add Demand Pipeline Board with Source -> Campaign -> Content -> Lead/RFQ -> Re-engage.
- Add Guardrail Rail showing stock/service/suppression risk.

## Architecture
- Keep data from `getPrimeSnapshot()`.
- Derive view model inside `PrimeDemandHubPage` or small local helpers.
- Reuse existing `SummaryMetricCard`, `Table`, `Badge`, `Button`, `Link`.

## Related Code Files
- `prime-os-phase-1/app/src/pages/prime/PrimeTowerPage.tsx`

## File Ownership
- Owns only `PrimeDemandHubPage` and helper functions/types placed directly near that export.
- No route/nav/test edits in this phase.

## Implementation Steps
1. Derive Demand readiness/status counts.
2. Replace current `DecisionHeader`-first layout with compact command bar.
3. Keep linked entity strip if useful, but move below command bar.
4. Add metric row and ranked queue.
5. Add pipeline board + guardrail/evidence panels.
6. Preserve links to canonical Demand routes.

## Todo
- [x] Define Demand queue item type.
- [x] Build command bar.
- [x] Build health row.
- [x] Build queue.
- [x] Build pipeline board.
- [x] Build guardrail/evidence rail.

## Success Criteria
- Operator can identify the top Demand move without reading all cards.
- Hub links route to correct child pages.
- Above-fold content stays compact on desktop.

## Conflict Prevention
- Do not touch `DemandExecutionPanel`.
- Do not alter `PrimeOverview.tsx`.

## Risk Assessment
- Medium: `PrimeTowerPage.tsx` is large and shared.
- Mitigation: keep edits localized and avoid broad refactors.

## Security Considerations
- No external sends. UI must preserve local-only mock language if adding action CTAs.

## Next Steps
- Phase 02 aligns child pages after hub direction is accepted.
