# Codebase Map

## Route Ownership

- `/overview` is routed to `PrimeOverview` in `prime-os-phase-1/app/src/App.tsx`.
- `/`, `/dashboard`, and catch-all routes redirect to `/overview`.
- The sidebar top item is defined in `prime-os-phase-1/app/src/lib/prime/prime-navigation.ts` as `id: 'overview'`, `label: 'Overview'`, `href: '/overview'`.
- `AppSidebar` renders the first `primeNavigation` node as the standalone overview item.

## Current Overview Implementation

File:

```text
prime-os-phase-1/app/src/pages/prime/PrimeOverview.tsx
```

Current component structure:

- `PrimeOverview`
- `MissionBrief`
- `OperatorModeSwitch`
- `PriorityMissionList`
- `PriorityMissionCard`
- `DependencyRiskFlow`
- `SystemHealthStrip`
- `SecondarySignalsPanel`

The page currently derives all data locally after calling `getPrimeSnapshot()`.

## Data Source

`getPrimeSnapshot()` in:

```text
prime-os-phase-1/app/src/lib/prime/prime-data.ts
```

Snapshot includes:

- Products, orders, order events, order items.
- Inventory positions and forecasts.
- Listings, warehouses, fulfillment, shipments, tracking, returns.
- Campaigns, leads, RFQs, activation plays.
- Customers, tickets, VOC insights.
- Alerts, recommendations, insight models.
- Aggregate metrics.

This is enough to build suite health, KPI, priority, dependency, and quick-link summaries without backend changes.

## Existing Chart Infrastructure

Reusable chart wrapper:

```text
prime-os-phase-1/app/src/components/ui/chart.tsx
```

Existing example usage:

```text
prime-os-phase-1/app/src/pages/prime/PrimeFinSupportPage.tsx
```

Use `ChartContainer`, `ChartTooltip`, and Recharts primitives already present in the app.

## Existing Deep Links

Useful current routes include:

- `/intelligence/product-operation-agent?view=command`
- `/intelligence/consulting-agent?tab=kpi`
- `/intelligence/consulting-agent?tab=signals`
- `/intelligence/consulting-agent?tab=launch`
- `/demand/campaigns`
- `/ecom/cos/product-master`
- `/ecom/cos/inventory-brain`
- `/ecom/cos/oms`
- `/ecom/cos/fulfillment`
- `/finance/fin-support`
- `/customer/crm-compact`
- `/customer/service`

Verify any additional route before adding it to the quick-link hub.

## Safe Boundaries

Safer:

- Change `label: 'Overview'` to `General Dashboard` while keeping id/href.
- Extract view-model helpers from `PrimeOverview`.
- Add chart components that consume derived rows.
- Preserve existing link targets and redirects.

Medium risk:

- Changing navigation label affects sidebar, search, breadcrumbs, and Product Settings.
- Reordering `PrimeOverview` can change user expectations around priority actions.

Higher risk:

- Changing `getPrimeSnapshot()` shape.
- Changing seeded demo stores.
- Removing existing redirect behavior.
