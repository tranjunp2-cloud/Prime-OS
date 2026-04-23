# FUL — Fulfillment Tower

> FBA/FBM dispatch, shipment tracking, and fulfillment rules.

## Scope

The FUL tower manages the fulfillment lifecycle: dispatching orders to fulfillment providers (FBA or FBM), tracking shipments, and applying fulfillment rules. Currently schema-defined with tower implementation pending.

## Database Tables (3)

- `shipments` — shipment records (carrier, tracking, status)
- `shipment_items` — line items within a shipment
- `fulfillment_rules` — rules engine for fulfillment routing (which orders go to FBA vs FBM)

## Planned Features

- FBA (Fulfilled by Amazon) integration via SP-API Feeds
- FBM (Fulfilled by Merchant) dispatch workflows
- Shipment tracking with carrier integration
- Fulfillment rule engine (route by product type, warehouse proximity, stock level)

## Implementation Status

Schema defined in `packages/database/src/schemas/ful/`. Server tower implementation not yet started.
