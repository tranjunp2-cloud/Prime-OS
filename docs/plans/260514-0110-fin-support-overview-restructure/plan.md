---
title: "Fin Support Overview Restructure"
description: "Restructure the Finance / Fin Support overview from a tab-heavy funding cockpit into a clearer bank-readiness workflow with chart-backed summaries, progressive detail, and fewer peer-level cards."
status: completed
priority: P1
effort: 14h
created: 2026-05-14
completed: 2026-05-14
owner: "PrimeOS"
tags: [prime-os, finance, fin-support, ui-ux, dashboard, charts]
blockedBy: []
blocks: []
relatedPlans:
  - docs/plans/2026-05-08-primeos-v1-alignment-roadmap
targetRoute: "/finance/fin-support?tab=overview"
targetFiles:
  - prime-os-phase-1/app/src/pages/prime/PrimeFinSupportPage.tsx
  - prime-os-phase-1/app/src/lib/prime/finance-trust-profile.ts
  - prime-os-phase-1/app/src/components/ui/chart.tsx
---

# Fin Support Overview Restructure

## Overview

The current Fin Support overview has useful finance data, but the screen reads as many equal cards and tabs competing for attention. The user goal is simpler: understand whether the package is bank-ready, what blocks it, what evidence is missing, and which review route is viable.

This plan restructures the page into a funding readiness workflow with fewer visible zones, stronger chart summaries, and drill-down detail instead of repeating every object on the overview.

## Completion Summary

Implemented in `prime-os-phase-1/app/src/pages/prime/PrimeFinSupportPage.tsx`:

- Grouped Fin Support navigation into `Overview`, `Package`, `Routes`, and `Audit` while preserving underlying tab query values.
- Rebuilt overview around a decision strip, evidence health visualization, work queue, funding path visualization, and bank-review summary.
- Added compact rows with a shared detail dialog for evidence, blockers, and route previews.
- Preserved legacy hash anchors for `/finance/fin-support#status`, `#lenders`, `#blockers`, `#funding-application-flow`, and `#commerce-evidence-pack`.
- Preserved existing query params such as `role=bank` during tab changes.
- Added a visible local-snapshot badge for finance-control-plane fallback state.

## Scope Challenge

Build the smallest change that fixes clarity:

- Keep `/finance/fin-support?tab=overview` working.
- Keep existing finance data builders and API contracts.
- Use existing Recharts + `components/ui/chart.tsx`; do not add a chart library.
- Preserve “preview only / no approval promise” guardrail copy.
- Reduce visible peer tabs/cards on the overview.
- Add charts only where they clarify comparison, coverage, or progression.

Do not rebuild Finance, underwriting, document upload flows, or external lender integrations in this plan.

## Product Direction

Reframe the overview around four regions:

| Region | User Question | UI Pattern |
|---|---|---|
| Readiness Command | Am I bank-ready and what should I do first? | Compact decision strip with score, range, blocker, CTA |
| Evidence Health | Is the package complete enough to review? | Stacked coverage bar + evidence status list |
| Funding Path | Where can this package go next? | Route comparison chart + top route list |
| Work Queue | What needs action now? | Prioritized blocker/action list with detail drawer |

The current six tabs should no longer look like six equal destinations. Preserve query values for compatibility, but visually group them into a smaller workflow:

- `Overview`
- `Package` for Evidence + Documents
- `Routes` for Review Routes + Applications
- `Audit`

If implementation risk is high, keep the existing tab IDs internally and introduce grouped labels as a display layer only.

## Architecture

Keep `PrimeFinSupportPage.tsx` as the route, state, and data container. Extract only overview UI and pure chart data helpers if the file becomes harder to maintain.

Recommended extraction:

```text
prime-os-phase-1/app/src/pages/prime/PrimeFinSupportPage.tsx
  -> route/search params/data/container

prime-os-phase-1/app/src/pages/prime/fin-support/
  FinSupportOverview.tsx
  FinSupportOverviewCharts.tsx
  fin-support-overview-model.ts
```

The extraction is optional if it makes the first implementation too large. The mandatory part is the UI structure and chart-backed information hierarchy.

## Phases

| Phase | File | Status | Goal |
|---|---|---|---|
| 1 | [phase-01-information-architecture.md](phase-01-information-architecture.md) | completed | Reduce the tab/card overload and define the new overview zones. |
| 2 | [phase-02-chart-backed-overview.md](phase-02-chart-backed-overview.md) | completed | Add readiness, evidence, route, and settlement visualizations from existing data. |
| 3 | [phase-03-progressive-detail.md](phase-03-progressive-detail.md) | completed | Convert dense cards into compact lists with detail drawer/dialog interactions. |
| 4 | [phase-04-responsive-qa.md](phase-04-responsive-qa.md) | completed | Verify responsive layout, accessibility, guardrails, and build/test health. |

## Success Criteria

- The first viewport answers: readiness score, eligible range, top blocker, next action.
- Overview no longer shows all evidence, all blockers, and all route cards as peer sections.
- Charts summarize readiness factors, evidence coverage, and route fit without implying funding approval.
- Legacy tab query values still work or redirect predictably.
- Detail content is available through rows/drawers/dialogs rather than always occupying overview space.
- No horizontal overflow at 375, 768, 1024, and 1440 widths.
- Primary CTA is visually clear; secondary actions are subordinate.
- Existing finance guardrail copy remains visible.

## Validation

Run from `prime-os-phase-1/app`:

```bash
npm run lint
npm run test
npm run build
```

Then smoke test in the browser:

```text
http://localhost:5177/finance/fin-support?tab=overview
http://localhost:5177/finance/fin-support?tab=evidence
http://localhost:5177/finance/fin-support?tab=documents
http://localhost:5177/finance/fin-support?tab=routes
http://localhost:5177/finance/fin-support?tab=applications
http://localhost:5177/finance/fin-support?tab=audit
```

Executed:

- `npm run build:dev` passed.
- `npx eslint src/pages/prime/PrimeFinSupportPage.tsx` passed.
- `npm run test -- src/lib/prime/finance-trust-profile.test.ts` passed.
- `npx tsc --noEmit --pretty false | rg 'PrimeFinSupportPage|finance-trust-profile'` returned no scoped type errors.
- Playwright smoke passed for all six tab values across 375, 768, and 1440 widths with no horizontal overflow.
- Playwright smoke passed for legacy hash anchors, `role=bank` query preservation, and Escape-to-close detail dialog behavior.

Known environment note: `npm run build` is blocked in this workspace by missing production `VITE_SUPABASE_URL`; `build:dev` is the validated local build path.

## Reports

- [UI/UX research](reports/ui-ux-research.md)
- [Codebase map](reports/codebase-map.md)
- [Red-team review](reports/red-team-review.md)

## Cook Handoff

```bash
/ck:cook /Users/admin/Desktop/PrimeOS_LarkVer/docs/plans/260514-0110-fin-support-overview-restructure --hard
```
