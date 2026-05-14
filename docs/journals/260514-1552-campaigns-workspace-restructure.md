---
title: "Campaigns Workspace Restructure Session"
date: 2026-05-14
route: "/demand/campaigns"
plan: "docs/plans/260514-1529-campaigns-workspace-restructure/plan.md"
status: completed
---

# Campaigns Workspace Restructure Session

## Context

The user wanted Demand Center > Campaigns reduced into a clearer workspace with six tabs:

- Overview
- Pipeline
- Planner
- Readiness
- Execution Queue
- Results

The goal was to replace the mixed one-page Campaigns command surface with a structured operating workspace that answers: what campaign is active, what is blocked, what should be planned, what is safe to run, which actions are queued, and what results came back.

## What Changed

- Created `prime-os-phase-1/app/src/lib/prime/campaign-workspace.ts`.
- Added `buildCampaignWorkspace()` to derive summary, pipeline, planner drafts, readiness checks, execution actions, and results from the existing Prime snapshot.
- Added Campaigns tab constants and objective constants.
- Updated `PrimeTowerPage.tsx` so `campaign-ops` renders a dedicated Campaigns workspace first, without the generic tower chrome above it.
- Added route-driven Campaigns sections using `?tab=overview|pipeline|planner|readiness|execution-queue|results`.
- Moved the Campaigns sections into sidebar sub-items under Campaigns.
- Removed the old in-page Demand sibling navigation row so Campaigns, Content & Social, Leads & RFQs, and Re-engage do not duplicate sidebar navigation.
- Preserved the local action setup dialog and safety boundary: drafts/tasks only, no external send/publish/inventory mutation.
- Added `campaign-workspace.test.ts`.
- Updated the Campaigns Playwright smoke test to assert the new tabs and Results route.
- Updated the Playwright session helper to seed `prime-os-auth-token`, matching current auth restore behavior.

## Verification

- `npm run test -- src/lib/prime/campaign-workspace.test.ts src/lib/prime/demand-dashboard.test.ts`
- `npm run test -- src/lib/prime/prime-navigation.test.ts src/lib/prime/campaign-workspace.test.ts`
- `npx playwright test tests/prime-route-shell.spec.ts -g "Campaigns workspace"`
- `npx playwright test tests/prime-route-shell.spec.ts -g "Campaigns workspace|Demand query context"`
- `npm run build:dev`

Production `npm run build` still requires `VITE_SUPABASE_URL`, so the verified build command is the local development build.

## Notes

The new workspace is intentionally read-model driven. Future work should extract the large Campaigns JSX into smaller components if the page grows further, but the first pass keeps changes scoped to avoid breaking sibling Demand surfaces.
