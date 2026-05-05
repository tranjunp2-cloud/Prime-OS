# Demand Code Map

Date: 2026-05-05
Scope: Demand UI only. No app code changed in this plan step.

## Agent Note
- Tried `code-mapper` subagent, but provider credentials failed with `404 No active credentials`.
- This scout was completed locally from repo reads.

## Current Routes
- `prime-os-phase-1/app/src/App.tsx`
- Canonical:
  - `/demand` -> `PrimeDemandHubPage`
  - `/demand/hub` -> `PrimeDemandHubPage`
  - `/demand/sources` -> `PrimeDemandSourcesPage`
  - `/demand/campaigns` -> `PrimeTowerPage towerId="campaign-ops"`
  - `/demand/content-social` -> `PrimeTowerPage towerId="content-creator-ops"`
  - `/demand/leads-rfqs` -> `PrimeTowerPage towerId="lead-response-capture"`
  - `/demand/re-engage` -> `PrimeTowerPage towerId="retargeting-outreach"`
- Legacy redirects preserve query strings:
  - `/demand/campaign-ops` -> `/demand/campaigns`
  - `/demand/content-creator-ops` -> `/demand/content-social?view=creator-proof`
  - `/demand/lead-response-capture` -> `/demand/leads-rfqs`
  - `/demand/retargeting-outreach` -> `/demand/re-engage`
  - `/demand/acquisition` -> `/demand/sources`
  - `/demand/campaign` -> `/demand/campaigns`
  - `/demand/lead-capture` -> `/demand/leads-rfqs`
  - `/demand/retargeting` -> `/demand/re-engage`

## Navigation
- `prime-os-phase-1/app/src/lib/prime/prime-navigation.ts`
- Demand area already has target IA:
  - Demand Hub
  - Sources
  - Campaigns
  - Content & Social
  - Leads & RFQs
  - Re-engage
- Likely no nav restructure needed unless copy/active labels change.

## Main UI Files
- `prime-os-phase-1/app/src/pages/prime/PrimeOverview.tsx`
  - Newer style reference.
  - Pattern: compact command bar, health metric row, priority action queue, risk radar, area status map, evidence stack, recent events.
- `prime-os-phase-1/app/src/pages/prime/PrimeTowerPage.tsx`
  - Demand exports: `PrimeDemandHubPage`, `PrimeDemandSourcesPage`.
  - Generic Demand pages: `PrimeTowerPage` + `DemandExecutionPanel`.
  - Existing Demand panel has route tabs, focused URL context, product signal hero, recommended action, action list, local execution queue, setup dialog.

## Data Sources
- `prime-os-phase-1/app/src/lib/prime/prime-data.ts`
- Demand uses:
  - `campaigns`, `leads`, `rfqs`, `socialStreams`, `activationPlays`
  - cross-tower guardrails: `forecasts`, `tickets`, `orders`, `products`, `customers`
- No backend/data contract change required for UI clarity pass.

## Tests Touchpoints
- `prime-os-phase-1/app/tests/prime-route-shell.spec.ts`
  - core Demand routes load
  - legacy redirects
  - query context preservation
  - command palette to Demand focused context
- `prime-os-phase-1/app/tests/prime-tower-layout.spec.ts`
  - currently checks `/demand/campaign-ops` compact tower hero.
  - likely add canonical Demand routes or update expectations to the Overview-style command bar.
- `prime-os-phase-1/app/tests/ui-a11y-shell.spec.ts`
- `prime-os-phase-1/app/tests/ui-responsive-genesis.spec.ts`

## Risks
- `PrimeTowerPage.tsx` is large; Demand-only edits can conflict with other tower work.
- Existing tests expect `data-testid="prime-tower-hero"` and heading `Campaign Ops` on legacy route.
- Demand route labels already changed to canonical names; old copy may still appear inside `towerJobDescriptions` and tests.
- Dialog/action behavior is stateful; keep local mock action semantics intact.

## Recommended Ownership
- Demand UI implementation: `PrimeTowerPage.tsx` Demand exports + `DemandExecutionPanel` only.
- Overview reference/test changes: `PrimeOverview.tsx` read-only unless extracting shared helpers.
- Route/navigation changes: avoid unless new labels require tests.
