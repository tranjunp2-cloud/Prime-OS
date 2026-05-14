---
date: 2026-05-14
type: journal
topic: source-icons-graphics-audit
related:
  - /Users/admin/Desktop/PrimeOS_LarkVer/docs/journals/260514-1435-marketplace-source-subpages.md
  - /Users/admin/Desktop/PrimeOS_LarkVer/docs/journals/260514-1452-source-functions-workspace.md
---

# Source Workspace Icon And Graphic Audit

## Context

The Sources workspace had enough tables, KPI cards, and charts, but the overview layer still required clearer visual language. The goal was to help operators quickly understand source classes and the operating flow without reading every card.

## What Happened

- Added function-specific icon selection for Marketplace, Social, Ads, Partner, and Manual Import source children.
- Added `Marketplace route map` to the Marketplace Source overview, showing marketplace account classes, state, quality, lead count, and RFQ count.
- Added shared route maps for Social Source, Ads Source, Partner Source, and Manual Import.
- Added a shared `Operating source loop` infographic that links Source → Signal → Lead/RFQ → Readback.
- Kept all graphics semantic and clickable; no emoji, no new icon library, no decorative-only visuals.

## UX Notes

- Icons now explain source category before the user reads card text.
- Route maps make setup gaps visible without forcing users into tables.
- The operating loop turns the source registry into an action model and keeps deep links discoverable.

## Verification

- `npm run lint -- --quiet`
- `npm run test -- demand-sources marketplace-source prime-navigation`
- `npm run build:dev`
- Playwright smoke checked overview pages for Marketplace, Social, Ads, Partner, and Manual Import; route map and operating loop rendered with no runtime errors.

## Next

- Browser-review visual density and icon recognizability with the user.
- If accepted, consider extracting route-map components from `PrimeTowerPage.tsx`.
