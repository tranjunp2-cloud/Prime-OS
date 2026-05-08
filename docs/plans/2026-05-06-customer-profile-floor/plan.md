---
title: "Customer Profile Floor"
description: "Replace CRM Compact with the foundational Customer Profile Floor for Customer Area / CRM Tower."
status: complete
priority: P1
effort: 14h
branch: main
tags: [prime-os, customer, crm, customer-profile, ui, mock-data]
created: 2026-05-06
---

# Customer Profile Floor Plan

## Goal
Build Customer Area / CRM Tower / Customer Profile Floor as the identity foundation that replaces the current CRM Compact block.

## Business -> Domain -> System -> Technical
- Business: give commerce operators one trusted customer identity layer before leads, deals, quotes, orders, service, finance, and intelligence connect.
- Domain: Customer owns account, contact, identity matching, relationship owner, lifecycle, customer type, and tags.
- System: Prime OS keeps Demand, Ecom/COS, Intelligence, Finance as future read/hand-off placeholders, not owned here.
- Technical: React/Vite/Tailwind/Radix, mock data, reusable components, no backend mutation yet.

## Source Basis
- User spec: Customer Profile Floor IA and boundaries.
- Lazyweb report: `.lazyweb/design-research/crm-compact-demand-customer-2026-05-06/report.md`.
- Current code: `prime-os-phase-1/app/src/pages/prime/PrimeTowerPage.tsx` CustomerPanel/CRM Compact section.
- Current data: `prime-os-phase-1/app/src/lib/prime/prime-data.ts` `PrimeCustomer` and `getPrimeSnapshot()`.

## Product Decision
Build a compact identity workspace, not CRM pipeline.

Keep the current `/customer/crm-compact` route working during replacement. Preferred V1 can relabel nav/screen as `CRM Tower` with floor title `Customer Profile`; optional canonical route `/customer/crm/customer-profile` can redirect from old path after implementation.

## Domain Boundaries
- Include: accounts, contacts, owners, lifecycle, customer type, tags, duplicate warnings, Customer 360 overview.
- Exclude: deals, RFQs, quotes, email sync, marketing automation, helpdesk, orders, inventory, payment/finance workflows.
- Future modules appear only as placeholder cards with clear ownership labels.

## Dependency Graph
```txt
Phase 01 Contracts -> Phase 02 Shell -> Phase 03 Forms/Contacts/Tags -> Phase 04 Identity Matching -> Phase 05 QA
Phase 02 can start after Phase 01 type names stabilize.
Phase 03 and Phase 04 can run parallel after mock selectors exist.
```

## Phases
1. [Phase 01 - Domain Contracts And Mock Data](phase-01-domain-contracts-and-mock-data.md) - complete, 100%.
2. [Phase 02 - Account List And Customer 360 Shell](phase-02-account-list-and-customer-360-shell.md) - complete, 100%.
3. [Phase 03 - Account Contact And Tag Management UI](phase-03-account-contact-and-tag-management-ui.md) - complete, 100%.
4. [Phase 04 - Identity Matching And Future Placeholder Cards](phase-04-identity-matching-and-future-placeholder-cards.md) - complete, 100%.
5. [Phase 05 - Routing QA Responsive And Tests](phase-05-routing-qa-responsive-and-tests.md) - complete, 100%.

## File Ownership Matrix
| Phase | Owns / modifies |
|---|---|
| 01 | `prime-os-phase-1/app/src/lib/prime/customer-profile-floor.ts`, possible `prime-data.ts` config labels |
| 02 | new Customer Profile components, replace CRM section in `PrimeTowerPage.tsx` |
| 03 | account/contact/tag dialogs/drawers, reusable row/cards |
| 04 | identity match cards/selectors, future module placeholders |
| 05 | `App.tsx`, `prime-navigation.ts`, Playwright/Vitest tests |

## Validation Commands
- `cd prime-os-phase-1/app && npm run lint`
- `cd prime-os-phase-1/app && npm run test`
- `cd prime-os-phase-1/app && npm run build:dev`
- `cd prime-os-phase-1/app && npx playwright test tests/prime-route-shell.spec.ts tests/prime-tower-layout.spec.ts --workers=1`

## Success Criteria
- Account list supports search, tag, owner, lifecycle, and customer type filters.
- Account detail/Customer 360 shows summary, company info, owner, lifecycle, tags, contacts, identity alerts, and future-module placeholders.
- Users can create/edit account, add/edit contacts, mark primary contact, add/remove tags in mock state.
- Duplicate account/contact warnings show reason and merge suggestion UI only.
- No deal/RFQ/quote/order/service/finance logic is implemented inside this floor.
- `/customer/crm-compact` remains usable or cleanly redirects.

## Reports
- [Research Summary](research/researcher-01-lazyweb-and-product-report.md)
- [Code Scout](scout/scout-01-current-crm-compact-report.md)
- [Architecture Notes](reports/01-architecture-and-boundary-report.md)

## Completion Evidence
- Implemented domain contracts and mock selectors in `prime-os-phase-1/app/src/lib/prime/customer-profile-floor.ts`.
- Implemented Customer Profile Floor workspace in `prime-os-phase-1/app/src/components/prime/customer-profile/CustomerProfileFloor.tsx`.
- Split Customer Profile Floor into explicit sub-floor views: Account, Contact, Identity Matching, and Customer Tags via `?floor=account|contact|identity|tags`.
- Added the same four sub-floors as visible nested sidebar items under Customer Profile.
- Wired existing `/customer/crm-compact` route to CRM Tower / Customer Profile Floor via `PrimeTowerPage`.
- Updated route/navigation labels for Customer Profile while preserving the existing route.
- Validation run on 2026-05-06:
  - `npm run lint` passed with 43 existing warnings and 0 errors.
  - `npm run test` passed: 23 files, 82 tests.
  - `npm run build:dev` passed with the existing large chunk warning.
  - `npx playwright test tests/prime-route-shell.spec.ts tests/prime-tower-layout.spec.ts --workers=1` passed: 54 tests.
  - Review follow-ups fixed: filtered Customer 360 state, customer query focus, and duplicate matching false positives from blank/shared domains.

## Resolved Decisions
- Canonical route: keep `/customer/crm-compact` for V1 and relabel the screen/nav to Customer Profile / CRM Tower.
- Account creation persistence: local component state only; no backend or browser storage persistence.
- Customer Tags: limited to seeded taxonomy in V1; users can assign/remove seeded tags.
