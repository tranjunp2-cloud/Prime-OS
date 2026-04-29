# QA Report: Dark Mode UI Fix

Date: 2026-04-29 13:26 +07
Target: `http://127.0.0.1:5192`
Scope: dark-mode semantic cards, overview operating loop, linked entity chips, and top search layout.

## QA Setup

The requested `gstack` QA skill was checked first.

- `gstack-update-check`: `UPGRADE_AVAILABLE 0.3.5 1.20.0.0`
- browse binary: `NEEDS_SETUP`

Because the browser tool was not built in this workspace, QA was performed with the existing Playwright setup and screenshots were saved under `.gstack/qa-reports/screenshots/`.

## Findings

### 1. Dark semantic surfaces stayed light

Affected examples:

- Operating loop cards: `Decision`, `Outcome`
- Linked chips: `SKU`, `CRM`
- Evidence stack semantic cards

Root cause:

The app uses classes such as:

- `dark:bg-sky-500/12`
- `dark:bg-emerald-500/12`
- `bg-sky-500/14`
- `bg-amber-500/18`

Tailwind was not configured with those custom opacity steps, so many `/8`, `/12`, `/14`, `/16`, `/18`, `/24`, and `/28` color utilities were not generated. Dark text and borders existed, but dark backgrounds were missing, leaving light cards in dark mode.

### 2. Top search layout was too dependent on flex behavior

The top header used a flex row where the search button and session/logout controls competed for width. This was fragile across wide and constrained viewports.

## Fixes

### Tailwind opacity scale

Updated `tailwind.config.js` to include the custom opacity steps already used throughout the app:

- `8`
- `12`
- `14`
- `16`
- `18`
- `24`
- `28`

This fixes the root cause globally, not just the visible Prime overview cards.

### Search layout

Updated `AppLayout` header to use a responsive grid:

- search column: `minmax(20rem,42rem)`
- spacer column: flexible
- session/logout column: fixed auto

This keeps search readable while preserving clear space for session controls.

## Evidence

Before:

- `.gstack/qa-reports/screenshots/darkmode-before-2026-04-29.png`

After:

- `.gstack/qa-reports/screenshots/darkmode-after-2026-04-29.png`
- `.gstack/qa-reports/screenshots/darkmode-after-local-2026-04-29.png`

Measured after local restart:

- `Operator chooses the route` card background: `rgba(14, 165, 233, 0.12)`
- search width at `2048x768`: `672px`

## Regression Added

Added `tests/ui-darkmode-regression.spec.ts`.

Coverage:

- Dark mode overview semantic surfaces must not render as solid light backgrounds.
- Top search keeps stable width and leaves room for session/logout controls.

## Verification

Passed:

- `npx playwright test tests/ui-darkmode-regression.spec.ts`
- `npx playwright test tests/ui-darkmode-regression.spec.ts tests/ui-responsive-genesis.spec.ts tests/prime-tower-layout.spec.ts`
- `npm run build:dev`
- `npm run test`

Local server restarted:

- `http://127.0.0.1:5192/overview`
