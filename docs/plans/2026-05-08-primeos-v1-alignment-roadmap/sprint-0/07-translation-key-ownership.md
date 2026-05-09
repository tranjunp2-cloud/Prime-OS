# 07 - Translation Key Ownership List

## Locale Targets

Supported locales:

- `en-US`
- `ja-JP`
- `vi-VN`

Sprint 0 target: first-fold primary UI on official demo routes must not mix languages for labels, headings, nav, CTA, badges, status, owner/next-action/evidence metadata, Prime AI prompts, command palette entries, finance risk copy, and dialog titles.

## Ownership

| Surface | Key owner | Reviewer | Risk reviewer | Priority |
| --- | --- | --- | --- | --- |
| Prime shell navigation | FE | QA Expert | n/a | P0 |
| Area/Tower/Floor breadcrumbs | FE + UX Architect | Domain Architect | n/a | P0 |
| Overview first fold | UX Architect + FE | PM | n/a | P0 |
| Decision Hub labels | AI Engineer + FE | QA Expert | Domain Architect | P0 |
| Leads & RFQs labels | FE | PM + BA | n/a | P0 |
| Customer Profile labels | UX Architect + FE | BA + QA Expert | n/a | P0 |
| OMS detail labels | FE | OMS owner + QA Expert | n/a | P0 |
| Return detail labels | FE | Fulfillment owner + QA Expert | n/a | P0 |
| Fin Support first fold | FE + PM | QA Expert | Compliance/Risk Reviewer | P0 |
| Finance documents/status/blockers | FE + PM | QA Expert | Compliance/Risk Reviewer | P0 |
| Command palette | FE | UX Architect + QA Expert | n/a | P0 |
| Prime AI global overlay | AI Engineer + FE | QA Expert | Domain Architect | P0 |
| Finance Prime AI overlay | AI Engineer + FE | QA Expert | Compliance/Risk Reviewer | P0 |
| Role mode copy | PM + UX Architect | Domain Architect + QA Expert | Security/Risk Reviewer | P1 |

## Risk Language Rules

Finance and bank-facing copy must use:

- readiness
- evidence
- blocker
- review
- document status
- suggested next action

Finance and bank-facing copy must not imply:

- guaranteed approval
- eligibility decision
- disbursement commitment
- underwriting result
- lender acceptance
- production credit decisioning

## QA Scope

Official proof routes:

- `/intelligence/decision-hub`
- `/demand/leads-rfqs`
- `/customer/crm-compact?floor=overview`
- `/customer/crm-compact?floor=account`
- `/ecom/cos/oms/:id`
- `/ecom/cos/returns/:id`
- `/finance/fin-support#documents`
- `/finance/fin-support#status`
- `/intelligence/launch-decisions`

QA checks:

- EN/VI/JA first-fold primary UI.
- No mixed-language heading, CTA, nav, badge, or table headers.
- Locale-specific Finance wording reviewed by Risk Reviewer.
- Command palette route labels match Prime navigation.
- Prime AI text cites system evidence and does not become source-of-truth.

## Existing Automation

| Check | Existing file |
| --- | --- |
| Dictionary coverage and parity | `prime-os-phase-1/app/src/lib/i18n/i18n-foundation.test.ts` |
| Shell dictionary keys | `prime-os-phase-1/app/src/lib/i18n/shell-dictionaries.ts` |
| Ops dictionaries | `prime-os-phase-1/app/src/lib/i18n/ops-dictionaries.ts` |
| Prime route shell smoke | `prime-os-phase-1/app/tests/prime-route-shell.spec.ts` |

Remaining gap: visual/runtime hardcoded copy in route bodies, overlays, mock data, and table/status content still needs screenshot review per route.
