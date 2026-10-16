# Prime POS interactive prototype

Enter through the Prime POS workspace (`/pos/register`). A fresh browser opens a resumable three-step setup. Existing stores open their saved register without repeating onboarding.

## First-time setup

1. **Store & register:** enter the store name, address, business type and first register, or use an existing store/register. Setup is manager-only; cashiers reuse saved configuration.
2. **Stock & pricing:** select an active internal/3PL warehouse or create a shared stock location. Choose the selling currency and an optional existing pricing rule. Creating a location never assumes an opening quantity.
3. **Products:** select Master SKUs/variants and review their automatically filled name, image, price and warehouse availability. Save & open POS, or add products later. Pending items can be saved; only sale-critical issues prevent checkout.

Draft progress survives navigation and reload. `/pos/products` manages the store selection; `/pos/settings` manages stores, registers, stock source, pricing and sales/return policies. Equipment remains register-specific. Adding another store starts its own setup, not another setup for every cashier.

## Main navigation

There is no separate Stores & POS module. Existing Main modules own their corresponding tasks:

| Module | Responsibility | Route |
| --- | --- | --- |
| POS → Settings | Stores, registers, stock location, pricing and sales/return policies | `/pos/settings` |
| POS → Products | Select existing Master SKUs to offer at the store | `/pos/products` |
| Main → Product Master | Canonical product identity, variants, images and base prices | `/products/master-catalog` |
| Warehouses → Store stock & purchasing | Store quantities, inbound shipments, inspection returns | `/warehouses/store-stock` |
| Orders → Completed | Same POS sales and receipts alongside other channel orders | `/orders?status=completed` |
| Customers | Shared order-derived customer records and purchase history | `/customers` |
| Analytics → POS shift review | Read-only reconciliation across stores | `/client-reports/pos-shifts` |
| Prime POS workspace | Selling, payment, refunds, shifts, equipment, receiving, tables/kitchen | `/pos/*` |

Legacy `/settings/stores`, `/settings/stores/policies` and `/products/pos-assortment` links redirect into POS. Older `?tab=…` links still resolve to the relevant owner and retain other query parameters. The local ledger key is unchanged, so saved shifts, demo products, stock, customers and receipts survive. Contacts that have no completed purchase remain available in the POS customer picker; the common Main directory is order-derived.

Main owns Product Master, warehouse counts, shared pricing rules, incoming shipments, customer history and shift review. POS owns store setup, SKU availability at each store, carts, payments, returns, drawer movements, receipt printing, receiving and equipment. Restaurant/café stores additionally show tables and kitchen navigation.

## Review paths

The legacy scenarios below use `seedPos()` explicitly in tests; fresh user sessions do not create these stores automatically.

1. In POS → Products, select Central Flagship and inspect its preserved demo products.
2. Open a shift with $100. Add two Everyday canvas totes, attach a customer, apply a 10% discount and pay $50 cash. The total is $43.20; change is $6.80.
3. Review the same receipt in POS Transactions, Main Orders → Completed. Return one tote for $21.60. Sellable stock increases by one; damaged returns remain excluded from sellable stock.
4. Close the shift with $121.60. A different physical count requires a closing note. Main → Analytics → POS shift review shows expected cash, counted cash and variance.
5. Receive PO-1001 at the store. A shortage requires a note. Reload and check the stock remains updated in Main and POS.
6. Select Riverside Café. Open its shift, add a latte and send it to Table 01. In Kitchen, prepare, mark ready and serve. In Tables, move/merge the table or review its bill. Payment clears the open table tickets.
7. Switch the demo role to Cashier. POS configuration and product selection become read-only. Use the Store manager role to edit them again.

## State and boundaries

- A localStorage snapshot (`prime.pos-demo.v1`) holds the POS ledger and setup draft. New offerings persist only `{ productId, skuId }` references. No duplicate Master or copied POS stock record is created.
- Product names/images/SKU codes and prices are read from Product Master. Variant prices use the specific SKU. Currency mismatches stay pending without a valid shared pricing rule. Missing or ambiguous warehouse availability stays unknown, never zero. Sales use available-to-promise stock, preserving holds and buffers.
- Linked sales and sellable refunds adjust the shared warehouse count and append stock audit records. A local recovery journal (`prime.pos-inventory-commit.v1`) restores the previous stock if saving the POS ledger fails. This is browser-prototype recovery, not a production cross-service transaction or concurrency protocol.
- Main Orders receives a read-through projection via `order-adapter.ts` in prototype mode. Existing order-derived customer history can consume these records. Counter receipts use their own detail view and cannot run shipping workflow commands.
- Existing self-contained demo products and stockrooms are retained for old scenarios; they are labeled separately from linked Master SKUs. No live product, inventory, payment or finance service is called.
- Receipts retain their original prices and currency. Store currency cannot change after cash history exists; open/held carts and table orders protect stock-location/register changes. Real payment authorization, backend permissions, offline payment queues and concurrent multi-register reconciliation remain outside this prototype.
- Device actions explicitly simulate connection/test results. Browser Print prints the selected demo receipt.
- Held carts, store selection, shifts, transactions, returns, kitchen tickets and stock survive reloads. Storage events refresh other tabs; this is not a production concurrent-write protocol.

## Validation

```sh
npx vitest run src/features/primepos src/lib/order-customers.test.ts src/lib/order-work-queues.test.ts src/pages/Orders.test.tsx src/components/layout/AppSidebar.warehouses.test.tsx src/components/shared/WorkspaceDemoBoundary.test.tsx
npx playwright test --config=playwright.pos.config.ts
```

The browser suite uses installed Chrome and a prototype Vite server (port 5181; override with `POS_TEST_PORT`). It covers resumable setup, empty-catalog setup, shared Master stock, cashier restrictions, legacy sale → Main order → partial return → shift close, receiving, café flows and responsive light/dark layouts. Full-project TypeScript validation may still report unrelated existing errors; focused tests and the prototype build are the validation gates for this change.
