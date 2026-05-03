# Phase 03 — Dashboard Pages Polish

## Context links
- Parent: `plan.md`

## Overview
Date: 2026-05-03
Priority: P1
Status: completed

## Key Insights
- App has many operational pages; polish should focus shared patterns: KPIs, cards, tables, status badges, charts.

## Requirements
- Make dashboard/control tower visually dense but scannable.
- Standardize page headers, filters, empty/loading/error states.
- Improve data tables: sticky affordances, row hover, status clarity, responsive fallback.
- Charts need legends/tooltips/text summaries where possible.

## Architecture
- Prefer shared small components/pattern helpers over page rewrites.
- Touch high-traffic pages first: Dashboard, PrimeOverview/Tower, Orders, Inventory, Products/Listings, Fulfillment/Returns.

## Related code files
- `prime-os-phase-1/app/src/pages/Dashboard.tsx`
- `prime-os-phase-1/app/src/pages/prime/*.tsx`
- `prime-os-phase-1/app/src/pages/Orders.tsx`
- `prime-os-phase-1/app/src/pages/Inventory.tsx`
- `prime-os-phase-1/app/src/components/orders/*`
- `prime-os-phase-1/app/src/components/inventory/*`
- `prime-os-phase-1/app/src/components/ui/chart.tsx`

## Implementation Steps
1. Identify repeated page-header/card/table patterns.
2. Create/adjust shared layout primitives only if duplication is real.
3. Polish KPI cards with consistent metadata/actions.
4. Polish tables/forms states.
5. Add accessible chart summaries/labels where low-risk.

## Todo list
- [x] Page pattern audit
- [x] KPI/card polish
- [x] Table/status polish
- [x] Empty/loading/error states
- [x] Chart a11y pass

## Success Criteria
- Page hierarchy obvious in 5 seconds.
- Status colors paired with labels/icons, not color-only.
- No major layout shift in loading states.

## Risk Assessment
- Many pages increase scope; use highest-traffic surfaces first.

## Security Considerations
- UI-only; avoid changing business logic/data mutations.

## Next steps
Admin alignment after main app patterns solid.
