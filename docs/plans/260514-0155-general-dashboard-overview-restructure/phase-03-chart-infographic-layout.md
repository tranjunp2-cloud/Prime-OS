# Phase 03: Chart Infographic Layout

Status: completed

## Goal

Make the General Dashboard visibly dashboard-like: chart-backed, scannable, and cross-suite. Charts should clarify system state, not decorate the page.

## Required Visuals

1. **Suite readiness chart**
   - Horizontal bar chart using `ChartContainer` and Recharts.
   - Rows: Intelligence, Ecom/COS, Demand, Finance, Customer.
   - Include numeric labels and status labels.

2. **Risk/status distribution**
   - Use stacked bar, segmented strip, or compact count chart.
   - Values: Ready, Watch, Critical.
   - Include text summary such as `2 Critical, 1 Watch, 2 Ready`.

3. **Dependency flow infographic**
   - Show lane: Inventory -> Demand -> Orders -> Customer -> Finance.
   - Each node shows status, signal, owner suite, and link.
   - Provide accessible text labels; do not rely on arrows/color alone.

4. **KPI strip**
   - Revenue at risk.
   - Demand readiness.
   - Inventory pressure.
   - Orders at risk.
   - Customer issues.
   - Finance readiness.

## Layout

Desktop:

```text
Header / Snapshot
Suite readiness chart | KPI strip
Dependency flow       | Quick access hub
Top priorities        | Optional detail/audit
```

Tablet:

```text
Header
Suite readiness chart
KPI strip
Dependency flow
Quick access hub
Top priorities
```

Mobile:

```text
Header
KPI rows
Suite readiness labeled bars
Quick links
Dependency flow rows
Priorities
```

## Tasks

1. Reuse `components/ui/chart.tsx`.
2. Use restrained enterprise styling:
   - flat surfaces
   - low shadow
   - no decorative gradient/orb background
   - status color plus text label
3. Keep chart heights stable to avoid layout jumps.
4. Ensure charts degrade into labeled rows on small screens if necessary.

## Acceptance

- At least three visual summaries render in `/overview`.
- Charts have `aria-label` and visible labels.
- Chart colors are not the only source of status meaning.
- Mobile does not show tiny unreadable charts.
- No new chart dependency is added.
