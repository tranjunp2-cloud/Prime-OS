# Phase 04 - Identity Matching And Future Placeholder Cards

## Context Links
- Parent plan: `docs/plans/2026-05-06-customer-profile-floor/plan.md`
- Boundary report: `reports/01-architecture-and-boundary-report.md`

## Overview
- Date: 2026-05-06
- Description: Add duplicate warnings and future module placeholders without adding out-of-scope workflows.
- Priority: P1
- Implementation status: complete
- Review status: validated

## Key Insights
- Identity matching is UI suggestion only in V1.
- Future module cards help show scalability without scope creep.
- Merge UI must not perform a merge yet.

## Requirements
- Potential duplicate account warning.
- Potential duplicate contact warning.
- Matching reasons.
- Simple merge suggestion UI only.
- Placeholder cards for Lead/Inquiry/RFQ, Deal Pipeline, Quote, Orders, Timeline, Intelligence, Finance, Ecom/COS.

## Architecture
- `IdentityMatchAlerts` receives matches for selected account/contact.
- `FutureModulePlaceholders` renders disabled/read-only cards with owner boundary labels.
- No navigation unless current route exists and context is safe.

## Related Code Files
- `prime-os-phase-1/app/src/components/prime/customer-profile/IdentityMatchAlerts.tsx`
- `prime-os-phase-1/app/src/components/prime/customer-profile/FutureModulePlaceholders.tsx`
- `prime-os-phase-1/app/src/lib/prime/customer-profile-floor.ts`

## Implementation Steps
1. Compute selected-account matches.
2. Render warning cards with reasons.
3. Add "Review merge suggestion" affordance.
4. Add disabled `Merge later` / `Mark reviewed` mock buttons.
5. Add future module placeholder grid.

## Todo List
- [x] Duplicate account alert.
- [x] Duplicate contact alert.
- [x] Reason list.
- [x] Merge suggestion UI only.
- [x] Future connection cards.

## Completion Notes
- Identity match alerts render duplicate account/contact warnings, confidence, and reason badges.
- Merge copy is explicitly suggestion-only; no destructive merge action is wired.
- Future module placeholders label ownership boundaries for Demand, CRM, Ecom/COS, Intelligence, and Finance.

## Success Criteria
- Duplicate warnings explain why a record may match.
- No actual merge or destructive operation exists.
- Future modules are clearly out of scope and owned elsewhere.

## Risk Assessment
- Risk: false positives undermine trust.
- Mitigation: show confidence and reasons; do not auto-merge.

## Security Considerations
- Duplicate detection should not reveal hidden records in future multi-tenant mode.

## Next Steps
Move to Phase 5 QA.
