---
date: 2026-05-14
type: journal
topic: marketplace-source-subpages
plan: /Users/admin/Desktop/PrimeOS_LarkVer/.omx/plans/260514-1405-marketplace-source-subpages-plan.md
---

# Marketplace Source 9-Subpage Workspace

## Context

Marketplace Source needed to grow from a filtered Sources registry into a focused workspace for marketplace demand operations. The requested structure was 9 subpages: Overview, Accounts, Demand Signals, Product/SKU Signals, Inquiry & Lead Intake, Campaign Attribution, Source Quality, Data Health, and Marketplace Detail.

## What Happened

- Added a dedicated `marketplace-source` read model that derives marketplace accounts, signals, SKU/listing signals, inquiries, attribution, data health, detail state, and page metadata from the existing Prime snapshot and Demand Sources model.
- Added route-level query views under `/demand/sources?function=marketplace&page=...`, with `/demand/sources?function=marketplace` defaulting to Overview.
- Rebuilt the Marketplace Source UI as a shared workspace shell with local subnav, KPI strip, quality chart, funnel infographic, account registry, signal heatmap, SKU matrix, intake queue, attribution readback, quality ranking, data-health feed, and detail drill-down.
- Kept Marketplace Detail shareable via `page=detail&sourceId=...` and linked it from rows across multiple subpages.
- Added localized shell labels for the five Sources function children so navigation localization coverage stays complete.
- Updated tests affected by prior UI changes where explanatory copy moved behind `(i)` hover icons and where Copilot workspace tests needed a router wrapper.

## Decisions

- Use query params for Phase 1 to preserve the existing `/demand/sources?function=marketplace` contract.
- Keep all marketplace subpages inside the Marketplace Source workspace instead of expanding the global sidebar.
- Label attribution as preview/readback and keep all mutating actions as route previews, not source-of-record writes.
- Derive demo data from existing Prime/Demand read models rather than inventing a separate backend contract.

## Verification

- `npm run test -- marketplace-source`
- `npm run test -- demand-sources`
- `npm run test -- GlobalCopilotWorkspace IntelligenceDragBoard i18n-foundation Warehouses`
- `npm run test -- i18n-foundation`
- `npm run test -- --maxWorkers=1`
- `npm run lint -- --quiet`
- `npm run build:dev`
- Playwright smoke checked all 9 Marketplace Source query pages for title rendering and runtime errors.

## Next

- Browser-review the visual density at desktop and tablet widths with real data volume.
- If this pattern is approved, extract the Marketplace Source workspace from `PrimeTowerPage.tsx` into a dedicated module before adding nested route aliases.
