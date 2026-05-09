# Phase 4 - Multi-Sided Ecosystem Role Surfaces

Ngày cập nhật: 2026-05-09

## Context

Project context: Prime OS.

Business goal: Prime OS chứng minh đây là ecosystem OS, không chỉ internal merchant admin. Role-aware demo surfaces cho thấy factory owner, agency operator, bank reviewer, lead provider, và creator/KOL agency tham gia cùng một operating loop với boundary rõ ràng.

Stakeholders:

- Factory owner cần xem sales output, operational risk, finance readiness trước khi approve scale.
- Agency operator cần thấy delegated queue và reportable outcomes nhưng không sở hữu source-of-truth.
- Bank reviewer cần evidence package preview, blocker, document state, no-credit-decision guardrail.
- Lead provider cần conversion feedback và source-quality loop mà không xem private CRM/OMS/Finance.
- Creator/KOL agency cần thấy creator traffic nối đến leads/orders mà không sửa SKU/price/order/finance truth.

## Implementation Scope

P0 completed:

- Added typed Phase 4 role/workspace contracts:
  - `PrimeRole`
  - `RoleCapability`
  - `PartnerWorkspaceSummary`
  - `PartnerHandoff`
- Added shared `PartnerWorkspacePanel` with:
  - role label
  - top job
  - evidence summary
  - next-action handoff cards
  - view/action/approval boundaries
- Wired role-aware surfaces to accepted demo routes:
  - `/overview?role=factory`
  - `/overview?role=agency`
  - `/finance/fin-support?role=bank`
  - `/demand/leads-rfqs?role=lead-provider`
  - `/intelligence/signals?view=creators&role=creator-agency`
- Kept Phase 4 demo-level only:
  - no auth/RBAC implementation
  - no external login
  - no full partner portal
  - no real partner write permissions

## Boundary Decisions

Prime OS owns:

- Demo role-mode read models.
- Partner workspace composition.
- View/action/approval copy.
- Partner handoff cards linking to owning Areas/Towers.

Prime OS does not implement in Phase 4:

- Authentication or authorization enforcement.
- External partner tenant login.
- Full partner portals.
- Bank underwriting or credit decisioning.
- Lead-provider access to private CRM/OMS/Finance records.
- Creator agency control over Product Master, pricing, order state, or finance readiness.

Guardrails:

- Role surfaces are demo read/assist views, not production permissions.
- Every role states what it can view, can act on, and what needs approval.
- Partner handoffs route back to owning Areas/Towers instead of creating duplicate ownership.
- Bank reviewer copy remains evidence-preview only and does not imply approval, offer, terms, or disbursement.

## Validation

Commands run from `prime-os-phase-1/app`:

```bash
npm run test -- src/lib/prime/finance-trust-profile.test.ts src/lib/prime/customer-profile-floor.test.ts src/lib/prime/prime-navigation.test.ts
npm run test:ui -- tests/prime-route-shell.spec.ts --grep "Phase 4 partner workspaces"
npm run lint
npm run build:dev
```

## Acceptance Status

| Acceptance | Status | Evidence |
| --- | --- | --- |
| At least 5 PRD user stories have visible product surface. | Complete | Five role query routes render partner workspace panels. |
| Each role has top job, evidence, next action. | Complete | `PartnerWorkspaceSummary` requires job, evidence, nextAction, and handoffs. |
| Demo can explain Prime OS as ecosystem layer. | Complete | Role surfaces show partner handoffs across Demand, Customer, COS, Intelligence, and Finance. |
| Each role surface states view/action boundary. | Complete | `RoleCapability` has `Can view`, `Can act`, and `Needs approval` labels. |
| Bank and partner roles are review/assist surfaces, not full ownership. | Complete | Bank/partner boundary copy blocks credit decision, source-truth edits, and private record access. |

## Residual Risks

- Query-param role mode is not RBAC; production permissions still need IAM design.
- Partner workspace copy is English-only for Phase 4 and should enter i18n before localization QA.
- Role surfaces are lightweight proof panels; V1.1 can expand into richer role-specific task queues if demo feedback supports it.
