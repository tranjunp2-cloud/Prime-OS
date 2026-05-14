---
date: 2026-05-14
type: journal
topic: source-functions-workspace
related: /Users/admin/Desktop/PrimeOS_LarkVer/docs/journals/260514-1435-marketplace-source-subpages.md
---

# Source Functions Workspace Expansion

## Context

After Marketplace Source received a 9-subpage workspace, the remaining Sources children needed the same operating frame so Social Source, Ads Source, Partner Source, and Manual Import would not fall back to a generic filtered list.

## What Happened

- Added a shared `SourceFunctionWorkspace` for non-marketplace source functions.
- Reused the same page model as Marketplace Source: Overview, Connections, Demand Signals, Product/SKU Signals, Lead Intake, Campaign Attribution, Source Quality, Data Health, and Source Detail.
- Added function-specific labels and icons for Social Source, Ads Source, Partner Source, and Manual Import.
- Added generic read projections from existing `DemandSource` rows for connection health, signal queues, SKU guardrails, intake routing, attribution readback, quality ranking, data health, and detail drill-down.
- Preserved Marketplace Source's specialized workspace and only routed the four remaining function filters through the shared workspace.

## Decisions

- Keep the shared implementation local to `PrimeTowerPage.tsx` for now because the existing Sources UI is already there and the fastest safe path was reuse.
- Use query routes consistently: `/demand/sources?function=social&page=overview`, `/demand/sources?function=ads&page=data-health`, and equivalent routes for partner/manual.
- Keep actions as route links and previews. The workspace does not mutate CRM, ad accounts, partner feeds, or import batches.

## Verification

- `npm run lint -- --quiet`
- `npm run test -- demand-sources marketplace-source prime-navigation`
- `npm run build:dev`
- Playwright smoke for 36 routes: `social`, `ads`, `partner`, and `manual` across all 9 pages.
- `npm run test -- --maxWorkers=1`

## Next

- Review visual density in browser for the four new workspaces.
- Extract shared source-function components to a dedicated module if the next iteration adds more per-function customization.
