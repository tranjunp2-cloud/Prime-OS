---
title: "Codebase Map: Fin Support Overview"
created: 2026-05-14
source: "code-mapper"
---

# Codebase Map: Fin Support Overview

## Primary Path

- Route: `prime-os-phase-1/app/src/App.tsx` maps `/finance/fin-support` to `PrimeFinSupportPage`.
- Page: `prime-os-phase-1/app/src/pages/prime/PrimeFinSupportPage.tsx`.
- Search params: page reads `tab`; missing/unknown defaults to `overview`.
- Overview render: `OverviewCockpit`.

## Current Overview Composition

`OverviewCockpit` currently composes:

- `FundingReadinessHero`
- `ReadinessBreakdownGrid`
- `BankReviewSummaryPreview`
- `EvidencePackageSnapshot`
- `RiskBlockerPanel`
- `RecommendedRoutesPreview`

These are useful ingredients, but the current order makes every section feel equally important.

## Data Sources

- `fetchFinanceControlPlane`: readiness, offers, risk trust, repayment lanes.
- `buildFinanceTrustProfile`: metrics, receivables, settlement signals, evidence pack, bank review summary.
- Page-local derived data:
  - `eligibilitySignals`
  - `blockers`
  - `lenders`
  - `applications`
  - `documents`

## Existing Chart Support

- Recharts is installed.
- Shared chart wrapper exists at `prime-os-phase-1/app/src/components/ui/chart.tsx`.
- Existing chart patterns appear in other app areas and can be reused.

## Safe Boundaries

- Keep `PrimeFinSupportPage` as route/state/data owner.
- Avoid changing `finance-control-plane.ts` API contracts.
- Preserve `FinanceSupportTab` IDs.
- Extract overview UI only if it reduces file complexity.

## Known Risks

- `documents` state seeds from the first lender and may not reseed after async data changes.
- Some legacy hash links point to anchors that overview sections may not expose consistently.
- `mainBlocker` severity sorting only prioritizes high vs non-high.
- Existing finance types may contain unused strictness issues; do not expand scope unless implementation touches them.
