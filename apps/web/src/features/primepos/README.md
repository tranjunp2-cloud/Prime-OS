# Prime POS interactive prototype

Main entry: `/settings/stores`. Counter entry: `/pos/register`.

Main owns store/register configuration, the demo assortment and prices, return/discount policies, incoming shipments, customer history and shift review. POS owns carts, payments, returns, drawer movements, receipt printing, receiving and store equipment. Restaurant/café stores additionally show tables and kitchen navigation.

## Review paths

1. In Main, select Central Flagship, inspect its assortment and open POS.
2. Open a shift with $100. Add two Everyday canvas totes, attach a customer, apply a 10% discount and pay $50 cash. The total is $43.20; change is $6.80.
3. Review the same receipt in POS Transactions, Main Stores & POS → Transactions, or Main Orders → Completed. Return one tote for $21.60. Sellable stock increases by one; damaged returns remain excluded from sellable stock.
4. Close the shift with $121.60. A different physical count requires a closing note. Main → Shift review shows expected cash, counted cash and variance.
5. Receive PO-1001 at the store. A shortage requires a note. Reload and check the stock remains updated in Main and POS.
6. Select Riverside Café. Open its shift, add a latte and send it to Table 01. In Kitchen, prepare, mark ready and serve. In Tables, move/merge the table or review its bill. Payment clears the open table tickets.
7. Switch the demo role to Cashier. Main configuration becomes read-only. Use the Store manager role to edit it again.

## State and boundaries

- A single localStorage snapshot (`prime.pos-demo.v1`) holds the demo ledger. Main and POS read the same records. Mutations validate before saving and publish only after storage succeeds.
- Main Orders receives a read-through projection via `order-adapter.ts` in prototype mode. Existing order-derived customer history can consume these records. Counter receipts use their own detail view and cannot run shipping workflow commands.
- The demo store assortment, stockrooms and purchasing data are self-contained; they are not a migration of the legacy PHP application or a connector to the existing warehouse service. No live product, inventory or finance service is updated.
- Prices and cash use USD to keep this review scenario consistent. Currency conversion, real payment authorization, device discovery, offline payment queues, backend permissions and production reconciliation are outside this UI prototype.
- Device actions explicitly simulate connection/test results. Browser Print prints the selected demo receipt.
- Held carts, store selection, shifts, transactions, returns, kitchen tickets and stock survive reloads. Storage events refresh other tabs; this is not a production concurrent-write protocol.

## Validation

```sh
npx vitest run src/features/primepos src/lib/order-customers.test.ts src/lib/order-work-queues.test.ts src/pages/Orders.test.tsx src/components/layout/AppSidebar.warehouses.test.tsx
npx playwright test --config=playwright.pos.config.ts
```

The browser suite uses the installed Chrome channel and a prototype Vite server on port 5181. It covers sale → Main order → partial return → shift close, receiving, cashier restrictions, kitchen/table checkout, held carts, equipment simulation, persistence and responsive light/dark layouts.
