# Phase 04 — Responsive QA And A11y

## Context links
- Parent: `plan.md`
- Depends on: Phases 01-03 complete

## Overview
- Date: 2026-05-06
- Description: Validate route behavior, responsive layout, accessibility, and build health.
- Priority: P2
- Implementation status: completed
- Review status: completed

## Key Insights
- This screen is dense; responsive and keyboard behavior are high-risk.
- Existing lint warnings are known; do not broaden scope.

## Requirements
- Validate desktop/tablet/mobile layout.
- Validate keyboard focus for queue rows, drawer actions, tabs/accordion.
- Keep route shell tests passing.

## Architecture
- Add/adjust tests only around changed behavior.
- Prefer Playwright route smoke over brittle visual snapshot unless existing pattern exists.

## Related code files
- `prime-os-phase-1/app/tests/prime-route-shell.spec.ts`
- `prime-os-phase-1/app/tests/prime-tower-layout.spec.ts`
- Relevant component/unit tests if adjacent patterns exist

## Implementation Steps
1. Run lint/test/build baseline after UI changes.
2. Run Playwright route shell tests.
3. Add focused smoke for Decision Hub if current tests miss selected drawer behavior.
4. Check 375px, 768px, 1440px layouts.
5. Document remaining warnings if unrelated.

## Todo list
- [x] Run `npm run lint`.
- [x] Run `npm run test`.
- [x] Run `npm run build:dev`.
- [x] Run Playwright route tests.
- [x] Add targeted tests if needed.

## Success Criteria
- No failing lint/test/build.
- No horizontal scroll at 375px.
- Drawer/workbench usable by keyboard.
- Existing Prime route coverage still passes.

## Risk Assessment
- Risk: tests brittle due dense copy. Mitigation: test semantic labels/actions.

## Security Considerations
- Confirm no new `VITE_*` secrets or unsafe AI execution paths.

## Next steps
- Ready for implementation after user approves plan.
