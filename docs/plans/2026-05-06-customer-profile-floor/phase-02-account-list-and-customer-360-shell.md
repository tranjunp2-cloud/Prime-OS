# Phase 02 - Account List And Customer 360 Shell

## Context Links
- Parent plan: `docs/plans/2026-05-06-customer-profile-floor/plan.md`
- Research: `research/researcher-01-lazyweb-and-product-report.md`
- Current UI: `prime-os-phase-1/app/src/pages/prime/PrimeTowerPage.tsx`

## Overview
- Date: 2026-05-06
- Description: Replace CRM Compact hero/table with Customer Profile Floor list-detail workspace.
- Priority: P1
- Implementation status: complete
- Review status: validated

## Key Insights
- Account list should be primary.
- Customer 360 should explain account identity, owner, lifecycle, tags, contacts, duplicate risk.
- Future modules stay visible as placeholders.

## Requirements
- Search box.
- Filter by tag, owner, lifecycle, customer type.
- Account table/card fallback.
- Selected Account 360 panel.
- Header copy uses `CRM Tower` and `Customer Profile Floor`.

## Architecture
- Prefer dedicated component folder: `src/components/prime/customer-profile/`.
- `PrimeTowerPage` should delegate rendering to `<CustomerProfileFloor />`.
- Keep Service branch unchanged.

## Related Code Files
- `prime-os-phase-1/app/src/pages/prime/PrimeTowerPage.tsx`
- `prime-os-phase-1/app/src/components/prime/customer-profile/CustomerProfileFloor.tsx`
- `prime-os-phase-1/app/src/lib/prime/prime-navigation.ts`
- `prime-os-phase-1/app/src/lib/prime/prime-data.ts`

## Implementation Steps
1. Add component shell.
2. Add filter state and selected account state.
3. Render account list table desktop, cards mobile.
4. Render Customer 360 summary panel.
5. Wire "Create account" and "Edit account" buttons to placeholder handlers until Phase 3.

## Todo List
- [x] Account list toolbar.
- [x] Account table.
- [x] Mobile account cards.
- [x] Customer 360 shell.
- [x] Empty state.
- [x] Responsive no-overlap check.

## Completion Notes
- `CustomerProfileFloor` renders account search/filter controls for tag, owner, lifecycle, and customer type.
- Desktop table and mobile account cards share the same selected-account state.
- Customer 360 panel shows identity facts, owner, lifecycle, customer type, revenue read, primary contact, notes, and future-module placeholders.
- Customer Profile Floor now has explicit sub-floor navigation: Account, Contact, Identity Matching, and Customer Tags. Account is no longer a catch-all tab container.
- Responsive route overflow checks for `/customer/crm-compact` passed after rerunning the 1440x1000 setup-timeout case.

## Success Criteria
- Operator can view accounts and select one.
- First viewport shows identity health, account count, duplicate warnings, owner coverage.
- No full CRM pipeline UI remains.

## Risk Assessment
- Risk: making a dashboard card farm.
- Mitigation: list-detail-action layout from Lazyweb report.

## Security Considerations
- Do not display real secrets or payment data.

## Next Steps
Move to Phase 3 management UI.
