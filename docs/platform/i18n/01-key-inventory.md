# 01 - I18n Key Inventory

Date: 2026-04-30

## Locale Source

Supported locales are defined in `app/src/lib/i18n/dictionaries.ts`:

- `en-US`
- `ja-JP`
- `vi-VN`

Default locale:

- `en-US`

Locale metadata now lives next to the locale list:

- native name
- short label
- default currency

## Dictionary Source

Current dictionary composition:

- `dictionaries.ts` owns the main app dictionary shape.
- `shell-dictionaries.ts` owns shell, auth, and Prime navigation copy.
- `ops-dictionaries.ts` owns nested fulfillment and audit dictionaries.
- `dictionaries` exports `Record<Locale, Dictionary>`.

## Top-Level Dictionary Groups

Current main groups:

- `sidebar`
- `settings`
- `warehouses`
- `ordersAllocation`
- `dashboard`
- `liveView`
- `products`
- `orders`
- `inventory`
- `listings`
- `returnsPage`
- `common`
- `controlTower`
- `fulfillment`
- `audit`

## Key Usage Snapshot

Source scan found 534 unique direct `t('...')` usages.

Shell/auth/navigation copy now uses typed domain dictionaries instead of `t('...')`, so it is tested through dictionary parity and nav coverage checks.

Representative key groups currently used:

- `common.*`
- `controlTower.*`
- `fulfillment.*`
- `inventory.*`
- `listings.*`
- `orders.*`
- `products.*`
- `returnsPage.*`
- `settings.*`
- `sidebar.*`
- `warehouses.*`

## Current Coverage Status

| Surface | Dictionary coverage | Remaining issue |
|---|---|---|
| Settings | Present | Low risk |
| Sidebar | Present | Route labels now have shell-domain localization |
| Auth | Present | Auth screen copy and language toggle added |
| Command/search shell | Present | Global shell strings moved to shell-domain dictionary |
| Product Master | Partial to strong | Some product/detail subcomponents still use inline locale objects |
| Inventory/Warehouse | Partial to strong | Some tables and ledger filters remain hardcoded |
| OMS/Orders | Partial to strong | Some status/plural helpers remain inline |
| Fulfillment/Returns | Partial to strong | Several detail panels still use inline locale maps |
| Prime Overview/Tower pages | Weak | Many visible strings are hardcoded |
| Demand/Customer/Intelligence | Weak to partial | Translation should be done route-by-route after shell |

## Key Governance Rules

- `en-US` remains the source dictionary.
- `ja-JP` and `vi-VN` must keep the same key shape.
- Non-default locales must not introduce placeholders that do not exist in `en-US`.
- Empty translation strings are not allowed.
- IDs, route paths, entity names, SKUs, order codes, and mock data canonical IDs should not be translated.
