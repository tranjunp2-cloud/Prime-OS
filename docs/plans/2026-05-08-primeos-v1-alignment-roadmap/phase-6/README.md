# Phase 6 - Release Hardening And QA Evidence

## Context

- Project context: Prime OS V1 alignment roadmap.
- Business goal: make the PRD alignment demo release-ready with repeatable QA evidence.
- Stakeholders: QA Expert, Product Manager, FE, UX, Domain Architect, Finance/Risk reviewer.
- Impacted domains: Shell, Intelligence, Demand, Customer, Ecom / COS, Finance.
- Ownership boundary: Intelligence recommends and reads outcomes only; Demand/COS/Customer/Finance own execution and source truth.

## Scope Completed

- Expanded a11y smoke coverage to the official proof path: Decision Hub, Launch Decisions, Demand lead/RFQ context, Customer floors, Finance evidence/status hash routes, OMS and Return detail journeys.
- Expanded responsive coverage to proof routes across mobile/tablet/desktop plus dynamic OMS/Return detail journeys at `390x844`.
- Aligned `/auth` QA with the current local bypass shell behavior.
- Replaced the invalid overview Radix tabs pattern with an accessible `aria-pressed` button group.
- Fixed destructive button/badge foreground contrast for OMS detail a11y.
- Updated dark-mode regression checks to current overview shell/search/account behavior.
- Corrected route ownership matrix so role surfaces stay hosted by Prime OS owning Areas instead of introducing `Ecosystem` as an Area.

## Validation Evidence

| Gate | Result | Notes |
| --- | --- | --- |
| `npm run test` | Pass: 25 files / 93 tests | Unit + contract coverage. |
| `npm run test:ui -- tests/prime-route-shell.spec.ts` | Pass: 58 / 58 | Rerun after transient server refusal. |
| `npm run test:ui -- tests/ui-a11y-shell.spec.ts` | Pass: 18 / 18 | Includes dynamic OMS/Return detail a11y. |
| `npm run test:ui -- tests/ui-responsive-genesis.spec.ts` | Pass: 70 / 70 | Includes proof routes at 5 viewports + detail journeys. |
| `npm run test:ui -- tests/ui-regression.spec.ts tests/ui-darkmode-regression.spec.ts` | Pass: 5 / 5 | Visual + dark-mode smoke. |
| `npm run lint` | Pass: 0 errors / 43 warnings | Warnings are pre-existing/react-refresh/hooks/console. |
| `npm run build:dev` | Pass | Vite chunk-size warning only. |
| `VITE_SUPABASE_URL=https://phase6.supabase.co VITE_SUPABASE_ANON_KEY=phase6-dummy-key VITE_SUPABASE_PUBLISHABLE_KEY=phase6-dummy-key npm run build` | Pass | Production env validator requires non-empty Supabase values. |

## Closed-Loop Proof Routes

| Step | Route | Domain truth |
| --- | --- | --- |
| 1 | `/intelligence/decision-hub` | Intelligence evidence/recommendation only. |
| 2 | `/demand/leads-rfqs?lead=lead_1_1` | Demand owns lead/RFQ capture. |
| 3 | `/customer/crm-compact?floor=overview` | Customer owns account/contact context. |
| 4 | `/customer/crm-compact?floor=account` | Customer owns account profile boundaries. |
| 5 | `/ecom/cos/oms` plus first order detail | OMS owns order state/SLA/audit. |
| 6 | `/ecom/cos/returns` plus first return detail | Fulfillment/Shipment owns return execution. |
| 7 | `/finance/fin-support#documents` | Finance reads reusable commerce evidence. |
| 8 | `/finance/fin-support#status` | Finance owns readiness/status language. |
| 9 | `/intelligence/launch-decisions` | Intelligence reads accepted action/outcome back. |

## Assumptions And Risks

- Local bypass auth is intentional for this demo build; real auth relaunch needs form-label/error a11y coverage restored.
- Production build was validated with dummy Supabase env because frontend env validation blocks empty values.
- One combined Playwright run hit a transient `ERR_CONNECTION_REFUSED`/shell timeout; isolated reruns passed.
- Existing lint warnings remain outside Phase 6 scope.

## Signoff

- QA: ready for V1 demo evidence review.
- Product: route proof path maps to PRD closed-loop story.
- Domain: no new Area introduced; role surfaces stay hosted by owning Areas.
