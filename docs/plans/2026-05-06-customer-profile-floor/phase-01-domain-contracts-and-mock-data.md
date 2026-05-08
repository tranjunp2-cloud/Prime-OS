# Phase 01 - Domain Contracts And Mock Data

## Context Links
- Parent plan: `docs/plans/2026-05-06-customer-profile-floor/plan.md`
- Source data: `prime-os-phase-1/app/src/lib/prime/prime-data.ts`
- Architecture notes: `reports/01-architecture-and-boundary-report.md`

## Overview
- Date: 2026-05-06
- Description: Define Customer Profile Floor domain model and mock selectors.
- Priority: P1
- Implementation status: complete
- Review status: validated

## Key Insights
- Current `PrimeCustomer` is too flat for account/contact identity.
- This floor needs account/contact/tag/match types before UI.
- Mock data should be isolated and replaceable by real API later.

## Requirements
- Define `CustomerAccount`, `CustomerContact`, `CustomerTag`, `CustomerOwner`, `IdentityMatch`.
- Seed realistic accounts derived from existing Prime customers.
- Seed multiple contacts per account, one primary contact max.
- Seed tag taxonomy with color/category.
- Add duplicate detection helper using normalized company/domain/email/phone.

## Architecture
- Add `prime-os-phase-1/app/src/lib/prime/customer-profile-floor.ts`.
- Export selectors used by UI only.
- Do not mutate `PrimeCustomer` unless config labels require it.

## Related Code Files
- `prime-os-phase-1/app/src/lib/prime/customer-profile-floor.ts`
- `prime-os-phase-1/app/src/lib/prime/prime-data.ts`

## Implementation Steps
1. Create typed domain file.
2. Map `getPrimeSnapshot().customers` into account seeds.
3. Add contact seeds.
4. Add tag taxonomy.
5. Add identity matching helper and sample matches.
6. Add small pure-function tests if feasible.

## Todo List
- [x] Add domain types.
- [x] Add seed builders.
- [x] Add filter helper.
- [x] Add duplicate match helper.
- [x] Add exported `buildCustomerProfileFloor(snapshot)`.

## Completion Notes
- `customer-profile-floor.ts` defines account, contact, tag, owner, identity match, future-module, filter, and floor aggregate types.
- Mock floor data is built from `PrimeSnapshot` and remains isolated from backend mutation.
- Duplicate helpers detect account/contact matches with reasons and confidence.
- Validation: lint/test/build passed on 2026-05-06; lint reported warnings only, no errors.

## Success Criteria
- UI can render all required sections from one typed floor object.
- Duplicate logic returns account/contact matches with reasons.
- No Demand/RFQ/order mutations are introduced.

## Risk Assessment
- Risk: over-modeling future CRM.
- Mitigation: only identity/account/contact/tag fields in V1.

## Security Considerations
- Do not introduce PII persistence beyond existing local mock context.
- Use realistic but fake emails/phones.

## Next Steps
Move to Phase 2 shell.
