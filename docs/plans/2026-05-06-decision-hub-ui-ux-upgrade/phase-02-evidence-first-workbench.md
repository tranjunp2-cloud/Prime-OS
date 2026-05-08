# Phase 02 — Evidence-First Workbench

## Context links
- Parent: `plan.md`
- Depends on: Phase 01 field naming
- Reference: Fieldguide workflow table pattern in Lazyweb report

## Overview
- Date: 2026-05-06
- Description: Promote Decision queue into the primary operator work surface.
- Priority: P1
- Implementation status: completed
- Review status: completed

## Key Insights
- Current table is useful but visually subordinate.
- Operators need rank, evidence, confidence, risk, owner, and handoff in one scan.

## Requirements
- Rework queue rows/cards with evidence chips and risk/owner/handoff metadata.
- Add selected/active row state if Phase 03 drawer needs selection.
- Keep keyboard and screen-reader accessible row actions.

## Architecture
- Prefer local component extraction inside `PrimeTowerPage.tsx` unless reusable across towers.
- Keep evidence display data-driven and replaceable by future Intelligence API contract.

## Related code files
- `prime-os-phase-1/app/src/pages/prime/PrimeTowerPage.tsx`
- Optional tests under `prime-os-phase-1/app/tests/`

## Implementation Steps
1. Locate `Decision queue` data source and table markup.
2. Define UI model: rank, title, type, state, confidence, owner, handoff, evidence, risk.
3. Implement responsive workbench: table desktop, stacked cards mobile.
4. Add selected row affordance for drawer.
5. Preserve existing `Open` links and states.

## Todo list
- [x] Map queue fields.
- [x] Add evidence/risk chips.
- [x] Add selected state.
- [x] Mobile card layout.

## Success Criteria
- Queue is the dominant mid-page surface.
- Each decision shows evidence and action without opening another section.
- Mobile remains readable without horizontal scroll.

## Risk Assessment
- Risk: accidental UI business logic. Mitigation: classify only from explicit fields or static mock fields.

## Security Considerations
- Handoff actions remain navigational/draft only.

## Next steps
- Continue Phase 03 drawer.
