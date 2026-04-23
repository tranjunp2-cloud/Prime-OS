# OMS — Order Management Tower

> Order ingestion, status routing, and history tracking.

## Scope

The OMS tower handles receiving orders from marketplace channels, tracking order status through its lifecycle, and maintaining audit history. Currently schema-defined with tower implementation pending.

## Database Tables (3)

- `orders` — order records (shipping address as JSONB, status, marketplace reference)
- `order_items` — order line items (product, quantity, price)
- `order_status_history` — status change audit trail (timestamps, previous/new status)

## Planned Features

- Amazon SQS order ingestion pipeline
- Status routing engine (new → processing → shipped → delivered)
- Multi-fulfillment order splitting
- Order exception handling

## Implementation Status

Schema defined in `packages/database/src/schemas/oms/`. Server tower implementation not yet started.
