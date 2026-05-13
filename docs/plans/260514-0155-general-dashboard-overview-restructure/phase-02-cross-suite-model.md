# Phase 02: Cross-Suite Model

Status: completed

## Goal

Create a clear view model for General Dashboard from existing `getPrimeSnapshot()` data. The page should not duplicate ad hoc derivation across chart and card components.

## Data Inputs

Use existing snapshot data:

- `products`, `orders`, `orderItems`, `orderEvents`
- `inventoryPositions`, `forecasts`
- `campaigns`, `leads`, `rfqs`, `activationPlays`
- `customers`, `tickets`, `vocInsights`
- `alerts`, `recommendations`, `insightModels`
- `metrics`

Do not change seed stores or `getPrimeSnapshot()` fields unless an existing field is wrong.

## View Model Shape

Recommended pure helper output:

```ts
type GeneralDashboardModel = {
  summary: {
    readinessScore: number;
    readinessStatus: 'Ready' | 'Watch' | 'Critical';
    revenueAtRisk: number;
    blockedSuites: number;
    primarySignal: string;
  };
  suites: Array<{
    id: string;
    label: string;
    readiness: number;
    status: 'Ready' | 'Watch' | 'Critical';
    blockerCount: number;
    primaryMetric: string;
    primaryHref: string;
    primaryAction: string;
  }>;
  kpis: Array<{
    label: string;
    value: string;
    status: 'Ready' | 'Watch' | 'Critical';
    source: string;
    href: string;
  }>;
  dependencyFlow: Array<{
    stage: string;
    suite: string;
    status: 'Ready' | 'Watch' | 'Critical';
    signal: string;
    href: string;
  }>;
  quickLinks: Array<{
    suite: string;
    links: Array<{ label: string; href: string; count?: string; status?: string }>;
  }>;
  priorities: PriorityAction[];
};
```

## Tasks

1. Extract current readiness scoring into named helpers.
2. Normalize suite labels:
   - Intelligence
   - Ecom/COS
   - Demand
   - Finance
   - Customer
   - Platform/Admin only if there is a useful link or metric.
3. Build chart-ready rows:
   - suite readiness rows
   - status distribution counts
   - KPI rows
   - dependency flow rows
4. Build quick-link groups from existing known routes.
5. Keep priority ranking behavior stable unless the new model reveals a bug.

## Acceptance

- Chart and card components consume the same derived model.
- No chart recomputes business logic independently.
- Quick links use existing routes only.
- Model helper is pure and can be unit tested without rendering React.
