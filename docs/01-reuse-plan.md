# 01 - Reuse Plan

## Reuse as-is

| Asset | Reason | Prime OS destination |
|---|---|---|
| Product pages | Product identity, SKU, media, pricing, variants already exist | Ecom Area / COS / Product Master Floor |
| Listings page | Marketplace listing context already exists | Product Master support and Commerce Surface context |
| Inventory page | ATS/inventory position proof already exists | Inventory Brain Floor |
| Warehouses page | Warehouse node model supports ATS and fulfillment | Inventory Brain / Fulfillment support |
| Orders and Order Detail | OMS lifecycle, order lines, events already exist | OMS Orchestration Floor |
| Fulfillment and Fulfillment Job Detail | Job, shipment, tracking, exception proof already exists | Fulfillment Control Floor |
| Returns and Return Detail | RMA/service issue proof already exists | COS returns support and Service Tower linkage |
| UI system primitives | Strong design consistency and operational density | All new Prime screens |
| Product images and brand asset | Existing proof visuals | Product Master and commerce context |
| In-memory stores and `demo-data-seeder.ts` | Backbone for live demo data | All Prime-linked mock data |

## Reuse with wrapper

| Asset | Wrapper approach | Prime OS destination |
|---|---|---|
| App shell | Replace navigation with Area/Tower/Floor shell; keep layout/component patterns | Prime OS shell |
| Global copilot workspace | Keep component, frame as AI Operator context surface | Intelligence Area / AI Operator Tower |
| SLA policies | Keep original page; add Policy & Rule landing wrapper | COS / Policy & Rule Floor |
| Routing plans | Keep original page; add Policy & Rule landing wrapper | COS / Policy & Rule Floor |
| OMS events and tracking events | Aggregate into Event & Audit wrapper | COS / Event & Audit Floor |
| Returns/RMA | Keep original COS screens; link to Service Tower cases | Customer Area / Service Tower and COS returns |

## Refactor lightly

| Asset | Change | Guardrail |
|---|---|---|
| `App.tsx` routes | Map old COS routes into `/ecom/cos/*` and redirect old URLs | Keep original page components |
| `AppLayout.tsx` | Remove auth gate for BOD prototype and seed demo data automatically | Do not rewrite COS domain screens |
| `AppSidebar.tsx` | Replace old nav with Prime OS IA | Preserve visual interaction pattern |
| `package.json` | Rename app package to `@primeos/web` | Keep dependency stack and lockfile lineage |

## Build new

| New module | Purpose |
|---|---|
| `src/lib/prime/prime-data.ts` | Adapter layer that reads COS stores and generates linked Demand, Customer, Intelligence mock entities |
| `PrimeOverview.tsx` | BOD-ready system overview |
| `PrimeTowerPage.tsx` | Visible Demand, Customer, and Intelligence tower pages |
| `CommerceSurfacePage.tsx` | Lightweight storefront/RFQ/assisted commerce bridge |
| `CosPolicyRulePage.tsx` | Wrapper around reused SLA/routing screens |
| `CosEventAuditPage.tsx` | Wrapper over OMS events, tracking, alerts, and AI recommendations |
| Docs package | Audit, reuse plan, system map, screen map, mock linkage, demo flows, BOD walkthrough |
| Migration package | Explicit reused/wrapped/new file lists |

## Ignore / archive for Phase 1

- Real backend, auth, API, Supabase integration, infra, and production data engineering.
- Full enterprise CRM tower split.
- Full analytics warehouse.
- Full campaign execution engine.
- Settings screen in primary BOD nav.
- Existing dashboard as the main Prime overview; it is useful reference but not the Prime OS story.

## Non-negotiable reuse boundary

Prime OS is not adopting COS as a permanent framework. COS is the Phase 1 proof asset for the Ecom/COS Tower. We preserve it, wrap it, and extend around it.
