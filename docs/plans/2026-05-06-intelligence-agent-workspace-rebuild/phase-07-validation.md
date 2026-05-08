# Phase 07 — Validation

## Context Links

- Parent plan: `docs/plans/2026-05-06-intelligence-agent-workspace-rebuild/plan.md`
- Depends on: Phase 01-06

## Overview

- Date: 2026-05-06
- Priority: P1
- Status: pending
- Review status: not reviewed

Validate route, UX, responsive behavior, and boundaries.

## Key Insights

- This is a workflow product; route loading is not enough.
- Need task-based validation.

## Requirements

- Route smoke tests.
- Build test.
- Browser screenshot.
- Keyboard flow.
- Responsive checks.
- Usability scenarios.

## Architecture

- Use existing Playwright route tests.
- Add focused tests only if adjacent pattern exists.

## Related Code Files

- `prime-os-phase-1/app/tests/prime-route-shell.spec.ts`
- `prime-os-phase-1/app/src/pages/prime/PrimeTowerPage.tsx`

## Implementation Steps

1. Run route smoke for Intelligence routes.
2. Run build.
3. Browser inspect `/intelligence/decision-hub`.
4. Check mobile width.
5. Check keyboard focus.
6. Verify no direct Demand mutation.

## Todo List

- [ ] Route smoke.
- [ ] Build.
- [ ] Browser screenshot.
- [ ] Mobile width check.
- [ ] Keyboard check.
- [ ] Boundary review.

## Success Criteria

- Routes load with no console errors.
- Build passes.
- Operator can complete handoff flow.
- Workspace remains usable at narrow width.

## Risk Assessment

- Risk: testing only visual load.
- Mitigation: validate actual task flow.

## Security Considerations

- Confirm actions are local/reviewed only.
- No silent external execution.

## Next Steps

Review plan with user, then implement Phase 1-2 only.
