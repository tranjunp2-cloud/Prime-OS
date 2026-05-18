# 00 - COS Audit

Source of truth audited:

- Legacy COS workspace captured before PrimeOS wrapping
- Current Phase 1 runtime workspace: `/apps/web`

## Audit result

COS is a React/Vite commerce operations mock with a strong Ecom control core. The existing app already has product, inventory, OMS, fulfillment, returns, SLA/routing, dashboard, design-system, copilot shell, and local in-memory stores. Phase 1 should preserve these proof assets and wrap them into Prime OS instead of rebuilding them.

## Existing app structure

- `frontend/src/App.tsx` - route registry.
- `frontend/src/components/layout/AppLayout.tsx` and `AppSidebar.tsx` - original app shell.
- `frontend/src/pages/*` - COS screens.
- `frontend/src/components/{products,inventory,orders,fulfillment,returns,system,copilot}` - reusable component surface.
- `frontend/src/lib/*-store.ts` - in-memory domain stores.
- `frontend/src/lib/demo-data-seeder.ts` - demo data backbone.
- `frontend/public/images/products/*` and `frontend/public/brand-logo.svg` - visual assets.
- `docs/CLAUDE.md`, `docs/design/*`, `docs/planning/*`, `docs/marketing/*` - domain/design/ops notes.

## Existing screens

| Existing screen | Domain | Prime OS mapping | Phase 1 decision |
|---|---|---|---|
| `Dashboard.tsx` | Control Tower summary | Reference for overview patterns | Do not reuse directly as Prime overview |
| `Products.tsx` | Product Master | Ecom Area / COS / Product Master Floor | Reuse as-is |
| `ProductDetail.tsx` | Product Master detail | Product Master Floor detail | Reuse as-is |
| `ProductCreatePage.tsx` | Product create/edit | Product Master Floor mutation mock | Reuse as-is |
| `Listings.tsx` | Marketplace listings | Product Master / Commerce Surface context | Reuse as-is under COS |
| `Inventory.tsx` | Inventory positions / ATS | Inventory Brain Floor | Reuse as-is |
| `Warehouses.tsx` | Warehouse nodes | Inventory Brain / Fulfillment support | Reuse as-is |
| `Orders.tsx` | OMS order list | OMS Orchestration Floor | Reuse as-is |
| `OrderDetail.tsx` | OMS lifecycle/event detail | OMS + Event & Audit | Reuse as-is |
| `Fulfillment.tsx` | Fulfillment jobs | Fulfillment Control Floor | Reuse as-is |
| `FulfillmentJobDetail.tsx` | Shipment/job operations | Fulfillment Control Floor detail | Reuse as-is |
| `Returns.tsx` | Returns/RMA | Service and COS returns support | Reuse as-is under COS returns |
| `ReturnDetail.tsx` | Return/RMA detail | Service proof and customer issue context | Reuse as-is |
| `SlaPolicies.tsx` | SLA rules | Policy & Rule Floor | Reuse via wrapper |
| `RoutingPlans.tsx` | Routing rules | Policy & Rule Floor | Reuse via wrapper |
| `Settings.tsx` | App settings | Not required for BOD demo | Ignore for Phase 1 nav |
| `UIRegressionReview.tsx` | QA review | Internal QA | Keep hidden route |

## Existing mock data

Core data is in local singleton stores and seeded by `demo-data-seeder.ts`.

- Product Master: `product-store.ts`, product images, SKUs, variants, prices, channels.
- Listings: `listing-store.ts`, marketplace/listing status per SKU.
- Inventory Brain: `inventory-store.ts`, inventory positions by SKU and warehouse.
- Warehouses: `warehouse-store.ts`, warehouse nodes and warehouse types.
- OMS: `order-store.ts`, `oms-types.ts`, order headers, line items, lifecycle events.
- Fulfillment: `fulfillment-store.ts`, `fulfillment-types.ts`, jobs, job items, shipments, tracking events, exceptions.
- Returns/Service-like proof: `return-store.ts`, return/RMA lifecycle.
- Dashboard/reference analytics: `dashboard/seedControlTower.ts`, `dashboard/useDashboard.ts`.
- Copilot context patterns: `components/copilot/*`, `lib/copilot/*`, `components/global-copilot/*`.

## Existing entities

- Product
- SKU
- Channel listing
- Inventory position
- Warehouse
- Order
- Order item
- Order event
- Fulfillment job
- Fulfillment job item
- Shipment
- Tracking event
- Fulfillment exception
- Return item / RMA

## Reusable components and design system

- UI foundation: shadcn/Radix components in `components/ui`.
- System primitives: `PageHeader`, `SummaryMetricCard`, `StatusBadge`, `DataTable`, `SlaIndicator`, `PriorityBadge`, `ChannelBadge`, `ThemeModeSwitcher`.
- Domain tables and badges across product, inventory, order, fulfillment, and returns modules.
- Visual vocabulary: dense operations dashboard, dark/light mode tokens, command-like sidebar, data tables, badges, status colors, product media.

## Reusable flows

1. Product Master -> SKU -> listing.
2. SKU -> inventory position -> warehouse ATS.
3. Order -> order line -> lifecycle event.
4. Order -> allocation/warehouse -> fulfillment job.
5. Fulfillment job -> shipment -> tracking event.
6. Return/RMA -> QC/disposition -> customer issue proof.
7. SLA/routing policies -> fulfillment and service guardrails.

## Gaps vs Prime OS architecture

- Demand Area is not implemented as visible towers.
- Customer Area exists only as customer fields inside orders and returns; it needs CRM Compact + Service wrappers.
- Commerce Surface Tower is missing.
- Intelligence Area is not explicit across Analytics, Attribution, Forecasting, AI Operator, VOC, and Alerts.
- Policy & Rule exists as SLA/routing screens but needs a Prime wrapper.
- Event & Audit exists as OMS/order/fulfillment events but needs an aggregate floor.
- Mock data is strong inside COS but not yet normalized into cross-area Prime relationships.
- BOD walkthrough/docs are missing.

## Audit decision

COS is strong enough to become the Phase 1 Ecom Area control core. The Prime OS work should create a shell around it, link new mock entities to the existing stores, and keep source mapping explicit.
