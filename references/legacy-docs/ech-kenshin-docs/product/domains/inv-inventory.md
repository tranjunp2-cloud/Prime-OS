# INV — Inventory Tower

> Multi-warehouse stock management, optimistic locking, and append-only ledger.

## Scope

The INV tower manages physical stock across multiple warehouses, tracks every stock movement in an immutable ledger, and syncs stock levels to marketplace channels.

## Database Tables (5)

- `warehouses` — warehouse records (address and settings as JSONB)
- `inventory_items` — stock levels per product per warehouse (quantity, reserved, `version` for optimistic lock)
- `inventory_ledger` — append-only transaction log (every stock change recorded immutably)
- `channel_stock_rules` — stock allocation rules per channel (shared with PM)
- `stock_sync_queue` — queue for background stock synchronization jobs

## Server Submodules (2)

Path: `apps/server/src/towers/inv/`

- `inventory/` — stock level CRUD, stock adjustment, sync worker
- `warehouses/` — warehouse management

## Key Patterns

- **Optimistic Locking**: `inventory_items.version` column prevents concurrent update conflicts. Read version → update with WHERE version = N → increment version
- **Append-Only Ledger**: `inventory_ledger` is insert-only. Stock balance derived from SUM of ledger entries. Provides full audit trail.
- **Stock Sync Worker**: BullMQ background job that reconciles stock levels with marketplace channels based on `channel_stock_rules`
