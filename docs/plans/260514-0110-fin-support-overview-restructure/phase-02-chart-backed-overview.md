# Phase 02: Chart-Backed Overview

Status: completed

## Context

The app already has Recharts and `components/ui/chart.tsx`. Finance data is already suitable for charts through `financeTrust.profile.metrics`, `financeTrust.evidencePack.items`, `financeTrust.profile.settlementSignals`, and `lenders`.

## Requirements

- Use existing chart infrastructure.
- Keep chart labels explicit; do not rely on color alone.
- Avoid fake precision and avoid approval language.
- Provide text/list fallback content beside or below charts.

## Chart Plan

| Chart | Data Source | Purpose | Recommended Form |
|---|---|---|---|
| Readiness factors | `financeTrust.profile.metrics` | Show score strengths and weak areas | Horizontal bar chart or bullet grid |
| Evidence coverage | `financeTrust.evidencePack.items` | Show verified/reusable/uploaded/rejected/missing mix | Stacked status bar with counts |
| Route fit | `lenders[].matchPercent` | Compare lender route viability | Horizontal bar chart with top routes |
| Settlement lanes | `financeTrust.profile.settlementSignals` | Show repayment/settlement confidence | Compact bar list |
| Readiness score | `readinessScore` | Anchor page decision | Large grade with small progress ring or bullet |

## Data Helpers

Create pure helpers if extraction is accepted:

```ts
function buildReadinessChartData(metrics: FinanceTrustProfile['profile']['metrics']) {
  return metrics.map((metric) => ({
    label: metric.label,
    value: metric.score,
    target: 85,
    status: metric.status,
  }));
}
```

Keep helper output testable. Avoid asserting Recharts DOM structure in tests.

## Implementation Steps

- Add `FinSupportOverviewCharts.tsx` or local chart components near the overview.
- Use `ChartContainer` and `ChartTooltipContent` for consistent styling.
- Replace `ReadinessBreakdownGrid` with a chart + compact metric summary.
- Replace `EvidencePackageSnapshot` full card row with coverage chart + top exceptions list.
- Replace `RecommendedRoutesPreview` full card grid with route fit chart + top route list.

## Checklist

- [x] Readiness chart shows all six metrics with visible labels and values.
- [x] Evidence coverage chart shows count/status labels.
- [x] Route chart shows match percent and review window in adjacent text.
- [x] Charts render on mobile without horizontal scroll.
- [x] No chart uses color as the only meaning.
- [x] Chart copy says readiness/reviewability, not approval.

## Risks

- Recharts can be brittle in tests; test data transforms instead.
- Too many charts can become decoration; only keep charts that improve scanning.
- A gauge can imply final approval; keep guardrail copy near the score.
