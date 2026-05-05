# Phase 03: Demand QA And Copy Alignment

## Context Links
- Parent: `plan.md`
- Phase 01: `phase-01-demand-hub-command-room.md`
- Phase 02: `phase-02-demand-child-pages-overview-style.md`

## Parallelization Info
- Depends on Phase 01 and Phase 02.
- Not parallel with implementation unless writing new specs in isolated files.

## Overview
- Date: 2026-05-05
- Description: Validate Demand routes, redirects, responsive behavior, accessibility, and copy alignment.
- Priority: P2
- Implementation status: completed
- Review status: passed

## Key Insights
- Current route shell tests already cover canonical and legacy Demand routes.
- Layout tests may need updates if Demand moves away from `prime-tower-hero`.

## Requirements
- Keep canonical + legacy route coverage.
- Add assertions for new Demand command bar/queue/pipeline.
- Keep query preservation test for lead/RFQ/campaign focused context.
- Run build and targeted Playwright.

## Architecture
- Test changes only; no production code in this phase except tiny copy fixes if tests reveal accessible-name issues.

## Related Code Files
- `prime-os-phase-1/app/tests/prime-route-shell.spec.ts`
- `prime-os-phase-1/app/tests/prime-tower-layout.spec.ts`
- Optional: `prime-os-phase-1/app/tests/ui-a11y-shell.spec.ts`
- Optional: `prime-os-phase-1/app/tests/ui-responsive-genesis.spec.ts`

## File Ownership
- Owns tests listed above.
- Does not modify `PrimeTowerPage.tsx` unless implementation phases are done and a tiny accessible label fix is required.

## Implementation Steps
1. Update route-shell expectations for new hub/child visible landmarks.
2. Update layout spec to support canonical Demand routes and new command bar.
3. Add mobile viewport smoke for `/demand/hub` and one child route.
4. Run targeted Playwright.
5. Run build/test command set.

## Todo
- [x] Update route-shell tests.
- [x] Update layout tests.
- [x] Add responsive/a11y smoke if needed.
- [x] Run validation commands.
- [x] Document residual risk.

## Success Criteria
- Demand canonical routes load.
- Legacy redirects preserve query strings.
- New command bar/queue/pipeline visible.
- Desktop hero/command area remains compact.
- No horizontal scroll at mobile smoke viewport.

## Conflict Prevention
- Keep test edits scoped to Demand expectations.
- Do not rewrite shared helpers unless required.

## Risk Assessment
- Low to medium: Playwright env can be slow/flaky.
- Mitigation: run targeted specs first; broader suite only if targeted passes.

## Security Considerations
- Tests should assert no real external send language if action dialog is touched.

## Next Steps
- After plan approval, implement Phase 01/02, then Phase 03.
