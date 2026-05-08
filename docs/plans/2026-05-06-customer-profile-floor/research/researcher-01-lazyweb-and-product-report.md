# Research 01 - Lazyweb + Product Synthesis

## Inputs
- User spec: Customer Profile Floor under Customer Area / CRM Tower.
- Lazyweb report: `.lazyweb/design-research/crm-compact-demand-customer-2026-05-06/report.md`.
- Prime OS AGENTS boundary: Area -> Tower -> Floor, preserve sources of truth.

## Findings
- Build identity foundation, not sales CRM.
- Best UI model: account action workspace with queue/list, selected Customer 360, reason-coded status, owner, handoff trail.
- For this floor, reduce the prior "next action" emphasis and focus on identity completeness, account ownership, duplicate risk, contacts, and tags.
- Current CRM Compact already overreaches into next-best-action, product route, demand channel, service watch; those should become placeholders/read-only context or move later.

## Design Stance
- Aesthetic: compact enterprise identity console.
- DFII: 11/15.
- Rationale: high context fit, feasible with current Tailwind/Radix stack, low perf risk, moderate consistency risk if kept inside monolithic `PrimeTowerPage.tsx`.

## Must-Have UX Pattern
```txt
Account List / Filters -> Selected Account 360 -> Contacts / Tags / Identity Alerts -> Future Module Placeholders
```

## Boundaries
- Customer owns profile/account/contact/tag/match.
- Demand, Deal, Quote, Order, Intelligence, Finance appear as "not connected yet" placeholders.
- No fake order/deal logic in forms.

## Risks
- Reusing CRM Compact copy may keep next-best-action as center too early.
- Adding create/edit inside `PrimeTowerPage.tsx` will worsen file size.
- Route rename may break tests/nav unless redirect is planned.

## Recommendation
Extract Customer Profile Floor into dedicated domain file and components. Keep existing route stable for first implementation.
