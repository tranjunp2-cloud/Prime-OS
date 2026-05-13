# Phase 03: Progressive Detail

Status: completed

## Context

The current overview exposes detailed evidence cards, blocker cards, route cards, and summary panels all at once. The user asked to classify regions and reduce card overload. Dense detail should be available only when needed.

## Requirements

- Use compact lists for blockers, evidence exceptions, and route candidates.
- Click rows to open detail in a drawer or dialog.
- Keep primary actions available in the list row.
- Preserve existing CTA semantics: fix blockers, prepare package, view route, ask Prime AI.

## Detail Surfaces

Use one reusable detail surface for overview objects:

| Object | Row Fields | Detail Content |
|---|---|---|
| Blocker | severity, title, owner, action | impact, recommendation, route/source, audit reference |
| Evidence item | status, records, owner | records, source owner, rejected/missing reason, document action |
| Route | lender, match %, range, review window | required evidence, missing items, route preview |
| Application | status, provider, next milestone | timeline, document requests, audit entries |

Use `Dialog` for low-risk implementation if a `Sheet` component is not already available. If `Sheet` exists locally, prefer right-side drawer on desktop and bottom sheet on mobile.

## Implementation Steps

- Introduce `selectedOverviewItem` state in `PrimeFinSupportPage` or `FinSupportOverview`.
- Convert blocker and route preview cards into rows.
- Add detail trigger buttons with clear labels and `aria-label`.
- Keep inline row CTAs for the most common action.
- Move verbose guardrail/detail copy into the drawer except for the short legal disclaimer.

## Checklist

- [x] Each compact list row has a clear title, status, and next action.
- [x] Detail surface opens by click and keyboard.
- [x] Escape closes the detail surface.
- [x] Primary CTA remains visible without opening detail.
- [x] Detail copy is not duplicated across overview sections.
- [x] Empty states are clear if no routes/applications/blockers exist.

## Risks

- Hiding too much detail can reduce trust; keep source owner and status visible in the row.
- Drawer implementation can add focus bugs; use existing dialog primitives if uncertain.
- “Resolve” actions must route by blocker type, not always to Documents.
