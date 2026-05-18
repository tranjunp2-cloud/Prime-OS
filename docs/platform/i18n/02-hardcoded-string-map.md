# 02 - Hardcoded String Map

Date: 2026-04-30

## Scan Summary

Source scan on `app/src/**/*.{ts,tsx}` found:

- 548 hardcoded JSX/string candidates
- 156 inline `locale === ...` branch candidates

These numbers are intentionally conservative. Some candidates are IDs, enum values, route names, test fixtures, or product names that should remain canonical.

## Priority Files

| Priority | Path | Reason |
|---|---|---|
| Done | `app/src/components/layout/AppLayout.tsx` | Global search, session text, logout, and search result type labels moved to shell dictionary. |
| Done | `app/src/components/layout/PrimeCommandPalette.tsx` | Command/search language moved to shell dictionary. |
| Done | `app/src/components/layout/AppSidebar.tsx` | Sidebar route labels and mobile helper text moved to shell dictionary. |
| Done | `app/src/pages/Auth.tsx` | Auth screen copy moved to auth dictionary and language toggle added. |
| P0 | `app/src/pages/prime/PrimeOverview.tsx` | First screen and BOD demo surface. |
| P0 | `app/src/pages/prime/PrimeTowerPage.tsx` | Largest hardcoded operating-language file. |
| P1 | `app/src/pages/prime/CommerceSurfacePage.tsx` | Ecom/COS handoff language. |
| P1 | `app/src/pages/prime/CosPolicyRulePage.tsx` | Guardrail/policy language. |
| P1 | `app/src/pages/prime/CosEventAuditPage.tsx` | Decision trace/audit language. |
| P1 | `app/src/pages/Warehouses.tsx` | Many inline locale branches already exist and should move into dictionaries. |
| P1 | `app/src/pages/SlaPolicies.tsx` | Many inline locale branches already exist and should move into dictionaries. |
| P1 | `app/src/components/oms/RoutingConfigEditor.tsx` | Routing rule editor uses inline locale branches. |

## Representative Hardcoded Strings

Shell/search resolved in this pass:

- `Global entity search`
- `Search product, SKU, order, lead, customer, alert...`
- `Open command palette`
- `Search PrimeOS`
- `Prime OS session`
- `Demo workspace`
- `Signing out...`
- `Logout`

Prime pages:

- `Channel lane`
- `Decision state`
- `Sort by`
- `All channels`
- `Launch now`
- `Warm-up needed`
- `At risk`
- `Overall match`
- `Launch readiness`

Dashboard/supporting components:

- `Orchestration Pipeline`
- `Priority Alerts`
- `Fulfillment Node Performance`
- `Performance Breakdown`
- `By Channel`
- `By Warehouse`

## Migration Order

1. Shell and command/search strings.
2. Prime Overview and Prime Tower operating language.
3. COS inline locale maps in Warehouse/SLA/Routing/Fulfillment details.
4. Demand routes.
5. Customer routes.
6. Intelligence routes.

## Notes

- Do not translate canonical data identifiers: SKU, ASIN, GTIN, order IDs, campaign IDs, customer IDs, warehouse codes, and route paths.
- Product names, customer names, and company names from mock data should remain stable unless a later demo-data localization layer is explicitly added.
- Avoid adding ad hoc `locale === ...` branches. New copy should go through dictionaries or a typed domain map.
