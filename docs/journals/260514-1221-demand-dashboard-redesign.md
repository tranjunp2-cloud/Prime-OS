---
date: 2026-05-14
type: journal
topic: demand-dashboard-redesign
plan: /Users/admin/Desktop/PrimeOS_LarkVer/docs/plans/260514-1156-demand-dashboard-redesign/demand-dashboard-redesign-plan.html
---

# Demand Dashboard Redesign

## Context

Demand Hub needed to become Demand Dashboard: the first Demand suite screen that summarizes MDEC, Sources, Campaigns, Content & Social, Leads/RFQs, and Re-engage with visual operating context.

## What Happened

- Added a dedicated `DemandDashboardSnapshot` read model so dashboard math is testable outside JSX.
- Renamed the visible Demand entry from Demand Hub to Demand Dashboard in navigation and shell dictionaries.
- Rebuilt the Demand entry screen around KPI cards, Demand function cards, a readiness chart, a funnel infographic, priority moves, guardrails, and outcome readback.
- Preserved `/demand` and `/demand/hub` route compatibility.

## Decisions

- Keep the dashboard operational, not a BI report: every visual routes to a Demand function or owner workspace.
- Use existing Recharts and `ChartContainer`; no new chart dependency.
- Put Demand functions before queues so users see the suite map before detailed work.
- Keep Sources as a separate product function, but summarize it prominently in the Dashboard.

## Verification

- `npm run test -- demand-dashboard demand-sources prime-navigation`
- `npm run lint -- --quiet`
- `npm run build:dev`
- Playwright smoke on `/demand` and `/demand/hub`: title, nav, breadcrumb, chart rendering, console errors, and desktop/mobile overflow.

## Next

- Review the visual balance in the browser with real viewport sizes.
- If approved, commit the Demand Dashboard slice together with the Sources slice or split them into separate commits.
