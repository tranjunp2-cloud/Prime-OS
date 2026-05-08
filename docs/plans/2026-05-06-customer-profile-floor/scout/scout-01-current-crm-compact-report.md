# Scout 01 - Current CRM Compact Code

## Current Route
- `/customer/crm-compact` renders `PrimeTowerPage towerId="crm-compact"` from `prime-os-phase-1/app/src/App.tsx`.
- Sidebar label lives in `prime-os-phase-1/app/src/lib/prime/prime-navigation.ts`.
- Tower config lives in `prime-os-phase-1/app/src/lib/prime/prime-data.ts`.

## Current Data
- `PrimeCustomer` has `id`, `name`, `company`, `email`, `segment`, `lifecycle`, `totalOrders`, `totalRevenue`, `lastOrderId`, `b2bAccount`, `notes`, `timeline`.
- `buildCustomers()` derives customers from OMS orders and campaigns.
- Current data lacks account/contact separation, tags taxonomy, owner object, customer type, identity matches.

## Current UI
- `CustomerPanel()` in `PrimeTowerPage.tsx` maps `snapshot.customers` into CRM records with owner, campaign, product, ticket, score, next follow-up.
- UI includes recommended customer hero, metrics, compare table, and profile dialog.
- Dialog includes tabs: overview, timeline, route, service/RFQ.

## Reuse
- Keep shared `DecisionHeader`, `LinkedEntityStrip`, `OperatingLoop`, `EvidenceStack`, `RegistryList`, cards, table, badge, tabs, dialog/sheet.
- Reuse `SummaryMetricCard`, `RuntimeContextCard`, `MetricPill` if local and appropriate.

## Replace
- Replace `CustomerPanel` branch for `crm-compact` with `CustomerProfileFloor`.
- Keep Service Tower branch intact.
- Move Customer Profile code out of `PrimeTowerPage.tsx` if possible.

## Test Touchpoints
- `prime-tower-layout.spec.ts` expects heading `CRM Compact`; update if label changes.
- `prime-route-shell.spec.ts` covers shell/Demand; add Customer Profile floor tests.
