---
title: "General Dashboard Overview Restructure"
description: "Reframe the `/overview` page from an action-first operating home into a cross-suite General Dashboard with suite health charts, infographics, and quick links into products, functions, and suites."
status: completed
priority: P1
effort: 18h
created: 2026-05-14
completed: 2026-05-14
owner: "PrimeOS"
tags: [prime-os, overview, general-dashboard, ui-ux, dashboard, charts, navigation]
blockedBy: []
blocks: []
relatedPlans:
  - docs/plans/2026-05-08-primeos-v1-alignment-roadmap
  - docs/plans/260514-0110-fin-support-overview-restructure
targetRoute: "/overview"
targetFiles:
  - prime-os-phase-1/app/src/pages/prime/PrimeOverview.tsx
  - prime-os-phase-1/app/src/lib/prime/prime-navigation.ts
  - prime-os-phase-1/app/src/lib/prime/prime-data.ts
  - prime-os-phase-1/app/src/components/ui/chart.tsx
---

# General Dashboard Overview Restructure

## Overview

The current `/overview` page is useful, but it behaves like a daily operator queue: mission, top priorities, dependency risk, and system health. The user goal is different: this entry point should become **General Dashboard**, a cross-suite command overview that helps users see every suite at a glance, understand system health, and jump quickly into the right product, function, or suite.

Keep the route `/overview` for compatibility. Rename the visible product/page surface to **General Dashboard** and rebuild the first screen around charts, infographics, and quick links instead of a task-heavy queue.

## Scope Challenge

Build the smallest clear restructure:

- Preserve `/overview`, `/dashboard` redirect behavior, and existing app routes.
- Update visible navigation/page naming to `General Dashboard` without breaking sidebar active state or search.
- Use existing `getPrimeSnapshot()` data and local derived view models.
- Use the existing Recharts wrapper in `components/ui/chart.tsx`; do not add a chart library.
- Keep top priorities, but make them secondary to cross-suite health and navigation.
- Avoid turning the page into another tab-heavy dashboard.

Do not rebuild suite internals, backend APIs, seed stores, or the Prime AI assistant in this plan.

## Completion Summary

Implemented the General Dashboard restructure:

- Renamed the visible overview navigation label to `General Dashboard` across Prime navigation and shell dictionaries.
- Reframed `/overview` hero copy around a cross-suite snapshot instead of a daily task queue.
- Added a chart-backed suite health section using the existing Recharts `ChartContainer`.
- Added a status distribution strip, cross-suite flow summary, cross-suite KPI strip, and quick access hub.
- Kept the existing top priorities and detail/audit modes, but moved them below the dashboard scan regions.
- Preserved `/overview`, `/dashboard`, `/`, and existing suite/function routes.

## Product Direction

General Dashboard should answer three questions in the first viewport:

| Question | UI Region | Notes |
|---|---|---|
| What is healthy or blocked across all suites? | Suite health chart + KPI strip | Show status by suite with labels, not color alone. |
| What operating flow is at risk? | Dependency infographic | Inventory -> Demand -> Orders -> Customer -> Finance. |
| Where should I go next? | Quick links hub + top action | Link into the relevant suite/function quickly. |

Recommended page regions:

1. **General Dashboard header** with snapshot time, global readiness, primary signal, and one `Ask Prime AI` action.
2. **Suite health comparison** using a horizontal bar or bullet chart for Intelligence, Ecom/COS, Demand, Finance, Customer, and Platform/Admin if available.
3. **Cross-suite KPI strip** for revenue at risk, demand readiness, inventory pressure, orders at risk, customer issues, and finance readiness.
4. **Dependency flow infographic** showing how risk moves across suites, with a text/table fallback.
5. **Quick access hub** grouped by suite, with compact deep links into products/functions.
6. **Top priorities list** reduced to 3 items and placed after the dashboard scan areas.
7. **Audit/proof detail** only behind expanded rows, dialog, or a lower section.

## Chart Strategy

Use charts only where they answer a decision question:

- **Horizontal bar chart:** suite readiness comparison.
- **Segmented status strip or stacked bar:** Ready / Watch / Critical distribution.
- **Bullet KPI cards:** compact metric vs threshold for revenue, demand, inventory, orders, customer, finance.
- **Dependency flow lane:** accessible infographic with arrows and per-stage counts.
- **Small bars/sparklines only when existing data supports it:** avoid fake trends.

Avoid primary donuts, 3D charts, decorative gauges, and complex Sankey charts. If a flow visualization is used, provide adjacent text labels and row summaries.

## Architecture

Keep `PrimeOverview.tsx` as the route container, but extract pure model helpers if the file becomes hard to reason about.

Recommended structure:

```text
prime-os-phase-1/app/src/pages/prime/PrimeOverview.tsx
  -> route container, layout composition, Prime AI open handler

prime-os-phase-1/app/src/pages/prime/overview/
  general-dashboard-model.ts
  GeneralDashboardCharts.tsx
  GeneralDashboardQuickLinks.tsx
  GeneralDashboardPanels.tsx
```

Extraction is optional for the first cook pass, but the data derivation for suite health, quick links, chart rows, and priority rows should be pure enough to test.

## Phases

| Phase | File | Status | Goal |
|---|---|---|---|
| 1 | [phase-01-naming-and-ia.md](phase-01-naming-and-ia.md) | completed | Rename the surface to General Dashboard and define the new cross-suite information hierarchy. |
| 2 | [phase-02-cross-suite-model.md](phase-02-cross-suite-model.md) | completed | Build a stable view model from existing Prime snapshot data for suite health, KPI, flow, and quick links. |
| 3 | [phase-03-chart-infographic-layout.md](phase-03-chart-infographic-layout.md) | completed | Implement chart-backed summary regions and accessible infographic patterns. |
| 4 | [phase-04-quick-links-and-progressive-detail.md](phase-04-quick-links-and-progressive-detail.md) | completed | Add suite/function quick links and move dense task/evidence content behind progressive detail. |
| 5 | [phase-05-responsive-validation.md](phase-05-responsive-validation.md) | completed | Validate routing, responsive layout, keyboard access, and build/test health. |

## Success Criteria

- `/overview` shows `General Dashboard` as the visible page name.
- Sidebar/search/breadcrumb behavior remains stable; redirects to `/overview` still work.
- First viewport shows suite health, key cross-suite metrics, and quick access paths.
- At least three dashboard visuals are present: suite health chart, status/risk distribution, and dependency flow infographic.
- Every chart has accessible labels and adjacent textual values.
- Quick links cover Intelligence, Ecom/COS, Demand, Finance, and Customer at minimum.
- Top priorities remain available but do not dominate the whole page.
- The floating `Prime AI` button does not cover important cards at 375, 768, 1024, or 1440 widths.
- No horizontal overflow at 375, 768, 1024, and 1440 widths.

## Validation

Run from `prime-os-phase-1/app`:

```bash
npm run build:dev
npx eslint src/pages/prime/PrimeOverview.tsx src/lib/prime/prime-navigation.ts
npm run test -- src/lib/prime/prime-data.test.ts src/lib/prime/prime-navigation.test.ts src/App.legacy-routes.test.tsx
```

Browser smoke:

```text
http://localhost:5177/overview
http://localhost:5177/dashboard
http://localhost:5177/
```

Check:

- Active sidebar item reads `General Dashboard`.
- Header/breadcrumb naming is consistent.
- Chart surfaces render non-empty.
- Quick links navigate to expected suite/product/function routes.
- Keyboard focus order moves from header -> charts -> quick links -> priorities.
- Mobile view collapses charts into readable labeled rows.

Executed:

- `npm run build:dev` passed.
- `npx eslint src/pages/prime/PrimeOverview.tsx src/lib/prime/prime-navigation.ts src/lib/i18n/shell-dictionaries.ts` passed.
- `npm run test -- src/lib/prime/prime-navigation.test.ts src/App.legacy-routes.test.tsx` passed.
- `npx tsc --noEmit --pretty false | rg "PrimeOverview|prime-navigation"` returned no scoped type errors. Full-project `tsc` remains blocked by pre-existing unrelated type errors outside this work.
- Playwright smoke passed `/overview` at 375, 768, 1024, and 1440 widths: title visible, summary visible, chart rendered, quick access visible, and no horizontal overflow.
- Playwright smoke confirmed `/dashboard` redirects to `/overview`.

## Reports

- [UI/UX research](reports/ui-ux-research.md)
- [Codebase map](reports/codebase-map.md)
- [Red-team review](reports/red-team-review.md)

## Cook Handoff

```bash
/ck:cook /Users/admin/Desktop/PrimeOS_LarkVer/docs/plans/260514-0155-general-dashboard-overview-restructure --hard
```
