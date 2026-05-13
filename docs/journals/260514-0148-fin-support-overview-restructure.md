---
title: "Fin Support Overview Restructure"
created: 2026-05-14
plan: docs/plans/260514-0110-fin-support-overview-restructure
area: finance
---

# Fin Support Overview Restructure

## Context

The Finance / Fin Support overview had become too card-heavy and tab-heavy. The user asked to restructure `/finance/fin-support?tab=overview` so the page reads as an enterprise SaaS funding workflow, with charts where they improve understanding.

## What Changed

- Grouped the visible Fin Support navigation into `Overview`, `Package`, `Routes`, and `Audit` while preserving the existing tab query values.
- Rebuilt the overview around a readiness decision strip, evidence health visualization, work queue, funding path visualization, and compact bank-review summary.
- Converted dense evidence/blocker/route preview content into compact rows with a shared detail dialog.
- Preserved legacy hash anchors for existing Finance redirects and handoff links.
- Preserved `role=bank` and other existing query params during tab changes.
- Added a visible local snapshot badge when the finance control-plane request falls back to local data.

## Validation

- `npm run build:dev` passed.
- `npx eslint src/pages/prime/PrimeFinSupportPage.tsx` passed.
- `npm run test -- src/lib/prime/finance-trust-profile.test.ts` passed.
- Scoped TypeScript grep found no `PrimeFinSupportPage` or `finance-trust-profile` errors.
- Playwright smoke covered all tab values at mobile/tablet/desktop widths, legacy hash anchors, `role=bank` preservation, and Escape-to-close dialog behavior.

## Decisions

- Kept `PrimeFinSupportPage.tsx` as the route/data owner rather than extracting a new component tree in this pass.
- Used existing Recharts only for the readiness chart; route fit uses simpler accessible progress bars to avoid cramped chart labels.
- Did not change finance APIs, data builders, or underwriting semantics.
- Left unrelated Operation Agent and Lazyweb research changes untouched.
