# QA Report: Prime Tower Layout Fix

Date: 2026-04-29
Scope: Demand, Customer, and Intelligence shared tower layout
Target: `http://127.0.0.1:5192`

## Finding

The shared tower page rendered two page titles in sequence:

- `PageHeader` at the top of `PrimeTowerPage`
- `DecisionHeader` inside the operating workspace

The `DecisionHeader` also placed `Decision readiness` and three evidence cards in a vertical right sidebar. On wide screens, the sidebar height stretched the entire hero card to more than 530px, leaving the main title/action area with a large blank zone and pushing the linked entity strip below the first viewport.

The same issue also affected `/overview`, because it used the same default `DecisionHeader` plus a separate `PageHeader`.

## Pre-fix Measurement

Measured at `2048x768`:

- `/intelligence/creators`: hero `534px`, linked strip `y=760`, duplicated title
- `/intelligence/trends`: hero `534px`, linked strip `y=760`, duplicated title
- `/demand/campaign-ops`: hero `534px`, linked strip `y=760`, duplicated title
- `/customer/crm-compact`: hero `554px`, linked strip `y=780`, duplicated title
- `/overview`: default decision hero was vertically stretched by the evidence sidebar and duplicated the page-level intro.

## Fix

- Removed the duplicate `PageHeader` from shared tower pages.
- Removed the duplicate `PageHeader` from `/overview`.
- Added a compact `DecisionHeader` variant for tower workspaces.
- Reused the compact `DecisionHeader` variant for `/overview`.
- Moved evidence cards into a horizontal evidence band under the hero title/action row.
- Added `data-testid="prime-tower-hero"` for browser regression coverage.

## Post-fix Measurement

Measured at `2048x768`:

- `/intelligence/creators`: hero `337px`, linked strip `y=441`, one title
- `/intelligence/trends`: hero `337px`, linked strip `y=441`, one title
- `/demand/campaign-ops`: hero `337px`, linked strip `y=441`, one title
- `/customer/crm-compact`: hero `337px`, linked strip `y=441`, one title
- `/overview`: hero `337px`, linked strip `y=445`, one title

Screenshot evidence:

- `.gstack/qa-reports/screenshots/prime-tower-layout-after-2026-04-29.png`

## Regression Added

Added `tests/prime-tower-layout.spec.ts`.

The test verifies:

- Intelligence, Demand, and Customer representative tower routes render one primary heading.
- Overview and tower routes keep the first decision hero compact.
- Shared tower hero height stays under `380px` on wide screens.
- Linked entity strip remains inside the first viewport.

## Verification

Passed:

- `npx playwright test tests/prime-tower-layout.spec.ts`
- `npx playwright test tests/prime-tower-layout.spec.ts tests/ui-responsive-genesis.spec.ts`
- `npx playwright test tests/prime-route-shell.spec.ts tests/ui-responsive-genesis.spec.ts tests/ui-a11y-shell.spec.ts tests/prime-tower-layout.spec.ts`
- `npm run build:dev`
- `npm run test`

Note: the `gstack` browse binary reported `NEEDS_SETUP`, so browser QA used the existing Playwright setup for this fix.
