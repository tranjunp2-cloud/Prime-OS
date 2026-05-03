# Phase 02 — Shell Navigation Search

## Context links
- Parent: `plan.md`
- Research: `research/01-21st-dev-scan.md`

## Overview
Date: 2026-05-03
Priority: P1
Status: completed

## Key Insights
- 21st.dev wins with search-first discovery + grouped sidebar taxonomy.
- PrimeOS needs OS-style command/search across modules, entities, actions.

## Requirements
- Improve sidebar grouping by operating area: Demand, Customer, Ecom, Intelligence, COS, Admin.
- Header should expose global search/command affordance and context breadcrumbs.
- Active nav state must be obvious.
- Mobile nav must remain usable.

## Architecture
- Work within `App.tsx`, existing navigation data, shell components.
- Reuse existing command/dialog primitives.

## Related code files
- `prime-os-phase-1/app/src/App.tsx`
- `prime-os-phase-1/app/src/lib/prime/prime-navigation.ts`
- `prime-os-phase-1/app/src/components/ui/sidebar.tsx`
- `prime-os-phase-1/app/src/components/ui/command.tsx`
- `prime-os-phase-1/app/src/components/ui/breadcrumb.tsx`

## Implementation Steps
1. Map current routes/nav groups.
2. Add/adjust grouped nav metadata.
3. Improve header context: page title, breadcrumb, command/search trigger.
4. Ensure keyboard nav + ARIA labels.
5. Check mobile/tablet layout.

## Todo list
- [x] Route/nav inventory
- [x] Grouped sidebar spec
- [x] Command/search trigger polish
- [x] Mobile nav check

## Success Criteria
- Core pages reachable within predictable groups.
- Current page highlighted.
- Search/command affordance visible like 21st.dev `K` pattern.

## Risk Assessment
- Routing tests may depend on existing labels; update tests only if behavior intentionally changes.

## Security Considerations
- Search must not expose secrets; client-only routes/actions only.

## Next steps
Move to page-level polish after shell stable.
