# Phase 05 - Routing QA Responsive And Tests

## Context Links
- Parent plan: `docs/plans/2026-05-06-customer-profile-floor/plan.md`
- Existing tests: `prime-os-phase-1/app/tests/prime-route-shell.spec.ts`, `prime-os-phase-1/app/tests/prime-tower-layout.spec.ts`

## Overview
- Date: 2026-05-06
- Description: Update routing/nav labels, test shell behavior, verify responsive UI.
- Priority: P1
- Implementation status: complete
- Review status: validated

## Key Insights
- Current tests expect `CRM Compact`.
- Existing route should not break demo flows.
- UI has many dense controls; mobile overlap risk is real.

## Requirements
- Decide canonical route and redirects.
- Update sidebar labels.
- Update tower layout tests.
- Add Customer Profile Floor route/render tests.
- Run lint, test, build, Playwright.
- Capture screenshots desktop/mobile if UI changed materially.

## Architecture
- Lowest-risk route plan: keep `/customer/crm-compact`, relabel inside screen.
- Higher-clarity route plan: add `/customer/crm/customer-profile`, redirect `/customer/crm-compact`.
- Choose before implementation.

## Related Code Files
- `prime-os-phase-1/app/src/App.tsx`
- `prime-os-phase-1/app/src/lib/prime/prime-navigation.ts`
- `prime-os-phase-1/app/tests/prime-route-shell.spec.ts`
- `prime-os-phase-1/app/tests/prime-tower-layout.spec.ts`

## Implementation Steps
1. Update labels/routes.
2. Update tests expecting old heading.
3. Add assertions for account list, filters, Customer 360, identity alerts.
4. Run validation commands.
5. Fix responsive/a11y issues.

## Todo List
- [x] Route decision applied.
- [x] Sidebar label updated.
- [x] Tests updated.
- [x] Desktop responsive check passed.
- [x] Mobile responsive check passed.
- [x] Validation commands pass.

## Completion Notes
- Route decision: preserve `/customer/crm-compact`; relabel nav/screen to Customer Profile / CRM Tower.
- Sidebar now shows nested Customer Profile floors: Account, Contact, Identity Matching, and Customer Tags. Query-aware active matching highlights the selected floor.
- `prime-route-shell.spec.ts` includes Customer Profile Floor assertions for route render, account list, Customer 360, identity matching, future links, customer query focus, and empty-filter detail bounds.
- `prime-tower-layout.spec.ts` customer layout slice passed for wide desktop.
- `ui-responsive-genesis.spec.ts` customer route overflow slice passed across mobile/tablet/desktop after rerunning the 1440x1000 setup-timeout case.
- Final combined targeted Playwright run passed: `npx playwright test tests/prime-route-shell.spec.ts tests/prime-tower-layout.spec.ts --workers=1` -> 54 tests.

## Success Criteria
- Customer route renders without auth or shell regressions.
- Mobile has no horizontal scroll or overlapping controls.
- Tests pass.

## Risk Assessment
- Risk: route rename breaks docs/demo flows.
- Mitigation: redirect old path and update tests/docs.

## Security Considerations
- No destructive actions.
- Merge buttons are non-destructive mock only.

## Next Steps
Done. Future work should introduce canonical `/customer/crm/customer-profile` only with redirect coverage.
