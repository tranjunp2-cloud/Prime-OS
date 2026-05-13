# 260514-0210 General Dashboard Overview Restructure

## Context

Executed the Hard plan in `docs/plans/260514-0155-general-dashboard-overview-restructure` for the PrimeOS `/overview` route. The product direction was to rename the page to **General Dashboard** and make it a cross-suite overview for all suites, prioritizing charts, infographics, and quick links.

## Changes

- Renamed the visible overview nav label to `General Dashboard` in Prime navigation and shell dictionaries.
- Reworked the `/overview` hero from a mission-first operating home into a cross-suite snapshot.
- Added a dashboard summary surface with suite readiness chart, Ready/Watch/Critical distribution, dependency flow summary, cross-suite KPI strip, and quick access hub.
- Kept existing top priorities, dependency detail, and audit/proof modes below the dashboard summary instead of removing them.
- Updated the plan and phase files to completed with validation notes.

## Decisions

- Kept `/overview` and redirect behavior stable to avoid route churn.
- Used existing `getPrimeSnapshot()` derived data instead of changing backend or seed stores.
- Used the existing Recharts `ChartContainer` infrastructure rather than adding a new chart dependency.
- Treated the full-project TypeScript failures as pre-existing unrelated debt after scoped checks returned no errors for this work.

## Validation

- `npm run build:dev` passed.
- `npx eslint src/pages/prime/PrimeOverview.tsx src/lib/prime/prime-navigation.ts src/lib/i18n/shell-dictionaries.ts` passed.
- `npm run test -- src/lib/prime/prime-navigation.test.ts src/App.legacy-routes.test.tsx` passed.
- Playwright smoke passed `/overview` at 375, 768, 1024, and 1440 widths with title, summary, chart, quick access, and no horizontal overflow.
- Playwright confirmed `/dashboard` redirects to `/overview`.
