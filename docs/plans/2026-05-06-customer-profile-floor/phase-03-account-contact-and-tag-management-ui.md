# Phase 03 - Account Contact And Tag Management UI

## Context Links
- Parent plan: `docs/plans/2026-05-06-customer-profile-floor/plan.md`
- Domain contracts: `phase-01-domain-contracts-and-mock-data.md`

## Overview
- Date: 2026-05-06
- Description: Add create/edit account, contact management, and tag assignment using mock local state.
- Priority: P1
- Implementation status: complete
- Review status: validated

## Key Insights
- This floor must feel useful, not read-only.
- Create/edit should update mock UI state only.
- Contact and tag management are identity operations, not outreach automation.

## Requirements
- Create account dialog/sheet.
- Edit account dialog/sheet.
- Contact list under selected account.
- Add/edit contact.
- Primary contact indicator with single-primary rule.
- Add/remove tags from seeded taxonomy.
- Segment usage placeholder for tags.

## Architecture
- Use Radix Dialog/Sheet, existing Input/Select/Button/Badge/Table.
- Keep form logic local and typed.
- Avoid react-hook-form unless surrounding code already uses it in similar Prime pages.

## Related Code Files
- `prime-os-phase-1/app/src/components/prime/customer-profile/AccountEditorDialog.tsx`
- `prime-os-phase-1/app/src/components/prime/customer-profile/ContactManagementPanel.tsx`
- `prime-os-phase-1/app/src/components/prime/customer-profile/CustomerTagsEditor.tsx`

## Implementation Steps
1. Add account create/edit dialog.
2. Add contact management panel.
3. Add primary contact rule.
4. Add tag picker/removal.
5. Add toast feedback for local mock actions.
6. Add basic validation.

## Todo List
- [x] Account fields validated.
- [x] Contact email required.
- [x] Primary contact unique.
- [x] Tag color/category visible.
- [x] Segment usage placeholder.

## Completion Notes
- Account create/edit dialog updates local mock state and requires company plus primary email.
- Contact add/edit dialog requires name plus email and supports role/channel/primary-contact fields.
- Primary contact updates normalize one primary contact per selected account.
- Tag assignment/removal uses seeded tag taxonomy and shows color/category usage copy.

## Success Criteria
- User can create/edit account in current session.
- User can add/edit contacts under account.
- User can assign/remove tags.
- UI clearly says mock/local until backend exists if needed.

## Risk Assessment
- Risk: fake persistence may confuse users.
- Mitigation: no backend claims; optional "local mock" helper copy in dev/demo context.

## Security Considerations
- Validate email/phone shape client-side.
- Avoid storing mock PII in browser storage unless explicitly chosen.

## Next Steps
Move to Phase 4 identity matching.
