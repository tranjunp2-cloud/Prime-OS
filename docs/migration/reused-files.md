# Reused Files

The Phase 1 app was created by copying the legacy COS frontend into `/apps/web` and excluding runtime/build artifacts at copy time. The original source workspace now serves as historical reference only.

## Reused as-is in routes

- `src/pages/Products.tsx`
- `src/pages/ProductDetail.tsx`
- `src/pages/ProductCreatePage.tsx`
- `src/pages/Listings.tsx`
- `src/pages/Inventory.tsx`
- `src/pages/Warehouses.tsx`
- `src/pages/Orders.tsx`
- `src/pages/OrderDetail.tsx`
- `src/pages/Fulfillment.tsx`
- `src/pages/FulfillmentJobDetail.tsx`
- `src/pages/Returns.tsx`
- `src/pages/ReturnDetail.tsx`
- `src/pages/SlaPolicies.tsx`
- `src/pages/RoutingPlans.tsx`
- `src/pages/UIRegressionReview.tsx`

## Reused data backbone

- `src/lib/product-store.ts`
- `src/lib/listing-store.ts`
- `src/lib/inventory-store.ts`
- `src/lib/warehouse-store.ts`
- `src/lib/order-store.ts`
- `src/lib/oms-types.ts`
- `src/lib/fulfillment-store.ts`
- `src/lib/fulfillment-types.ts`
- `src/lib/return-store.ts`
- `src/lib/demo-data-seeder.ts`

## Reused UI/design assets

- `src/components/ui/*`
- `src/components/system/*`
- `src/components/{products,inventory,orders,fulfillment,returns,copilot,global-copilot}/*`
- `public/brand-logo.svg`
- `public/images/products/*`
