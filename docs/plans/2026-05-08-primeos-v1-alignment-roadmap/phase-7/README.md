# Phase 7 - QA Hardening Evidence

## Context

- Project context: Prime OS V1 alignment roadmap, Sprint 7 QA hardening milestone.
- Business goal: prove no P0/P1 regression remains on the closed-loop demo path before release proof.
- Stakeholders: QA Expert, FE, Product Manager, Domain Architect.
- Impacted domains: Shell, Intelligence, Demand, Customer, Ecom / COS, Finance.
- Boundary: QA evidence validates existing Area-owned workflows; it does not create new business ownership.

## Completed

- Added a Phase 7 Playwright release evidence spec that captures proof-route screenshots and validates no fatal app console/page errors.
- Generated a fresh screenshot pack for official proof routes across EN/VI/JA desktop and EN mobile.
- Wrote `manifest.json` and `index.html` contact-sheet index for review.
- Reused existing expanded Phase 6 a11y/responsive gates as hardening baseline.
- Kept external image/resource load noise out of the fatal console gate; app console errors and page exceptions still fail the gate.

## Screenshot Evidence

| Artifact | Path | Status |
| --- | --- | --- |
| Screenshot folder | `research/screenshots/phase-7-release-proof/` | Generated |
| Manifest | `research/screenshots/phase-7-release-proof/manifest.json` | 36 screenshots |
| Contact-sheet index | `research/screenshots/phase-7-release-proof/index.html` | Generated |

Coverage:

- Routes: 9 official closed-loop proof routes.
- Locales/viewports: `en-US 1440x1000`, `vi-VN 1440x1000`, `ja-JP 1440x1000`, `en-US 390x844`.
- Dynamic journeys: first OMS order detail and first Return detail are opened from their list pages before capture.

## Validation Evidence

| Gate | Result | Notes |
| --- | --- | --- |
| `npm run test:ui -- tests/phase7-release-evidence.spec.ts` | Pass: 2 / 2 | Screenshot manifest + no fatal console/page errors. |
| `npm run lint` | Pass: 0 errors / 43 warnings | Warnings are existing non-blocking backlog. |
| `npm run test` | Pass: 25 files / 93 tests | Unit/contract regression check. |
| `npm run test:ui -- tests/ui-a11y-shell.spec.ts` | Pass: 18 / 18 | From Phase 6 hardening baseline. |
| `npm run test:ui -- tests/ui-responsive-genesis.spec.ts` | Pass: 70 / 70 | From Phase 6 hardening baseline. |
| `npm run test:ui -- tests/ui-regression.spec.ts tests/ui-darkmode-regression.spec.ts` | Pass: 5 / 5 | From Phase 6 visual baseline. |
| `npm run test:ui -- tests/prime-route-shell.spec.ts` | Pass: 58 / 58 | From Phase 6 route baseline. |

## Open Defects

| ID | Severity | Area | Route | Owner | Release impact |
| --- | --- | --- | --- | --- | --- |
| None | - | - | - | - | No P0/P1 regression open from Phase 7 gates. |

## Carryover

| Item | Reason | Owner | Target |
| --- | --- | --- | --- |
| Full 66-route recapture | Phase 7 focused official proof path; old 66-route corpus remains broader regression evidence. | QA | V1.1 or final release proof if PM requests full corpus refresh. |
| Real auth form a11y | Current demo uses local bypass and redirects `/auth` to `/overview`. | FE + QA | When real auth is re-enabled. |
| Lint warning cleanup | 43 warnings are pre-existing and non-blocking. | FE | V1.1 hardening. |

## Signoff Readiness

- QA: ready for release proof review.
- Product: proof route screenshot evidence is available.
- Domain: no ownership drift detected; source truth remains with owning Areas.
