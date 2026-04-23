# Integration Guide: Marketplace Unified — Amazon SP-API & Rakuten RMS

**Version:** 1.0.0
**Last Updated:** 2026-04-07
**Authors:** Minh Pham, Claude (AI-assisted)
**Purpose:** Single reference for implementing Amazon + Rakuten integration in ECH-Kenshin

---

## Quick Reference

### What Exists

| Component | Path | Status |
|-----------|------|--------|
| Amazon connector (PIM) | `shared-kernel/infrastructure/connectors/amazon/` | ✅ Production |
| Rakuten public connector | `shared-kernel/infrastructure/connectors/rakuten-public/` | ✅ MVP |
| Connector registry | `shared-kernel/infrastructure/connectors/registries/` | ✅ Production |
| Capability interfaces | `shared-kernel/infrastructure/connectors/capabilities/` | ✅ 6 interfaces |
| PM tower (17 modules) | `towers/pm/` | ✅ Production |
| INV tower (2 modules) | `towers/inv/` | ✅ Production |
| OMS schema (3 tables) | `packages/database/src/schemas/oms/` | ✅ Schema only |
| FUL schema (3 tables) | `packages/database/src/schemas/ful/` | ✅ Schema only |

### What Needs Building

| Component | Priority | Effort |
|-----------|----------|--------|
| OMS tower (orders module) | P0 | L |
| Amazon Order connector | P0 | M |
| Rakuten Seller connector | P0 | L |
| Rakuten Order connector | P0 | M |
| Inventory connectors (both) | P1 | M |
| Cross-platform status mapper | P0 | S |

---

## 1. Authentication

### Amazon SP-API

```typescript
// Existing: apps/server/src/shared-kernel/infrastructure/connectors/amazon/amazon-auth.client.ts
// OAuth 2.0 LWA (Login with Amazon)
// Token refresh mutex prevents concurrent auth races
// Token lifetime: ~1 hour, auto-refresh with 60s pre-expiry buffer

interface AmazonCredentials {
  sellerId: string;
  marketplaceId: string;       // e.g. A1VC38T7YXB528 (JP)
  refreshToken: string;        // Per-seller
  clientId: string;            // SP-API app
  clientSecret: string;        // SP-API app
}

// Header: x-amz-access-token: {accessToken}
// Endpoint: https://sellingpartnerapi-fe.amazon.com (JP/AU/SG)
```

### Rakuten RMS

```typescript
// NEW: needs implementation
// License Key + Service Secret auth
// No OAuth — static credentials with 90-day expiry

interface RakutenCredentials {
  serviceSecret: string;       // From RMS API settings
  licenseKey: string;          // Per-shop, 90-day expiry
  shopUrl?: string;            // Shop domain
  expireDate: string;          // Track for renewal alerts
}

// Header: Authorization: ESA {base64(serviceSecret:licenseKey)}
// Content-Type: application/json; charset=utf-8
// Endpoint: https://api.rms.rakuten.co.jp
// Rate limit: 1 req/s (general)
```

**Key difference:** Amazon auto-refreshes tokens. Rakuten License Keys expire every 90 days and require manual renewal. The system should track `expireDate` and alert sellers at 10 days remaining (per SyncHub spec).

---

## 2. Product — Read

### Amazon (Implemented)

```typescript
// CatalogBrowseService → AmazonConnector.searchCatalog()
// Catalog Items API: GET /catalog/2022-04-01/items
//   ?includedData=summaries,attributes,classifications,dimensions,images,identifiers,relationships
//   Rate: 2 req/s (token bucket)
//
// Listings Items API: GET /listings/2021-08-01/items/{sellerId}/{sku}
//   ?includedData=summaries,issues,relationships
//   Rate: 5 req/s (token bucket)
//
// Returns: NormalizedListing with full attributes, parent-child, variation tree
```

### Rakuten — Seller Products (NEW)

```typescript
// ItemAPI 2.0
// Base: https://api.rms.rakuten.co.jp

// Search products
// POST /es/2.0/items/search
// Body: { hits: 30, page: 1, sort: "+updateTimestamp" }
// Returns: { items: RakutenItem[], totalResults, page }
// Note: Deleted items return only manageNumber — skip these

// Get product detail
// POST /es/2.0/items/get
// Body: { manageNumber: "product-url-123" }
// Returns: full item with all fields

// Response → NormalizedListing mapping:
interface RakutenItemToNormalizedListing {
  // manageNumber → externalId
  // itemName → title
  // itemPrice → price (number, JPY assumed)
  // catalogId → janCode
  // description → description (max 5120 chars)
  // genreId → categoryId
  // hideItems=false → status "listed", hideItems=true → status "delisted"
  // Single SKU → variationType "standalone"
  // Multi SKU → parent = manageNumber, children = itemNumber per SKU
  //   SKU classify names → variationTheme[]
}

// Rate: 1 req/s
// Polling: every 5 min for updates (per SyncHub spec)
// Delay: up to 24 hours for new/deleted products to appear in search
```

---

## 3. Product — Write

### Amazon (Implemented)

```typescript
// ListingsMarketplaceService → AmazonConnector
// putListingsItem  — create full listing (validated against Product Type schema)
// patchListingsItem — partial update (price, quantity, attributes)
// submitMedia — image upload
// Rate: 5 req/s
```

### Rakuten — Seller Products (NEW)

```typescript
// ItemAPI 2.0

// Create product
// POST /es/2.0/items/insert
// Body: { item: RakutenItemPayload }
// Required: manageNumber, itemName, itemPrice, genreId, description
// Then: CabinetAPI for images, InventoryAPI for quantity
// Product types: "normal" | "distribution" | "pre-order"
// Constraint: Seller must have CSV Bulk subscription (¥11,000/month)

// Update product
// POST /es/2.0/items/update
// Body: { item: RakutenItemPayload }
// Immutable: manageNumber (URL), SKU, genreId, productType
// Stock edit: overwrites (not incremental)

// Delete product
// POST /es/2.0/items/delete
// Body: { manageNumber: "product-url-123" }

// Activate / Deactivate
// POST /es/2.0/items/update
// Body: { item: { manageNumber, hideItems: true|false } }
// hideItems=true → "Not sale", hideItems=false → "Active"

// Upload images (CabinetAPI)
// POST /es/1.0/cabinet/file/insert
// Max 4MB total per batch
// Formats: JPG, PNG, TIFF, BMP (PNG/TIFF/BMP auto-converted to JPEG)
// First image = main image
// URL pattern: image.rakuten.co.jp/_shop_{id}/cabinet/{path}
```

---

## 4. Inventory

### Amazon

```typescript
// FBM: quantity field in Listings API (patchListingsItem)
// FBA: managed by Amazon, read-only via FBA Inventory API
// Bulk: Feeds API POST_INVENTORY_AVAILABILITY_DATA
```

### Rakuten (NEW)

```typescript
// InventoryAPI 2.1
// Base: https://api.rms.rakuten.co.jp/es/2.1/inventories

// Read stock
// POST /es/2.1/inventories/bulk-get
// Body: { inventories: [{ manageNumber, variantId }] }
// Returns: quantity per SKU

// Write stock
// POST /es/2.1/inventories/bulk-upsert
// Body: { inventories: [{ manageNumber, variantId, quantity }] }
// Overwrites current value (not incremental)
```

### ECH-Kenshin Integration Pattern

```
inventory_items.sku ←→ Amazon SKU / Rakuten itemNumber
         │
         ├── stock_sync_queue (pending → syncing → synced/error)
         │        │
         │        ├── AmazonInventoryConnector → patchListingsItem (quantity)
         │        └── RakutenInventoryConnector → bulk-upsert
         │
         └── channel_stock_rules (bufferStock, maxStock per channel)
              → effectiveQuantity = quantityOnHand - bufferStock
              → push min(effectiveQuantity, maxStock) to each channel
```

---

## 5. Orders

### Amazon Orders API v2026-01-01 (NEW)

```typescript
// GET /orders/2026-01-01/orders
// Params: createdAfter, lastUpdatedAfter, fulfillmentStatuses[],
//         marketplaceIds[], fulfilledBy[], maxResultsPerPage (1-100),
//         paginationToken (24h expiry),
//         includedData: BUYER,RECIPIENT,PROCEEDS,EXPENSE,PROMOTION,
//                       CANCELLATION,FULFILLMENT,PACKAGES

// GET /orders/2026-01-01/orders/{orderId}
// Params: includedData[]

// Rate limit header: x-amzn-RateLimit-Limit

// Key model fields for ECH mapping:
// order.orderId → orders.externalOrderId
// order.createdTime → orders.orderedAt
// order.fulfillment.fulfillmentStatus → orders.channelStatus
// order.fulfillment.fulfilledBy → order_items.fulfillmentMethod (AMAZON→fba, MERCHANT→fbm)
// order.buyer.buyerName → orders.customerName
// order.buyer.buyerEmail → orders.customerEmail
// order.recipient.deliveryAddress → orders.shippingAddress (JSONB)
// order.proceeds.grandTotal → orders.total
// order.orderItems[].product.sellerSku → order_items.sku
// order.orderItems[].product.asin → order_items.externalItemId
// order.orderItems[].product.title → order_items.title
// order.orderItems[].quantityOrdered → order_items.quantity
// order.orderItems[].product.price.unitPrice → order_items.unitPrice
// order.packages[] → (track in rawData or future packages table)
// Entire response → orders.rawData (preserve for debugging)
```

### Rakuten Order API (NEW)

```typescript
// All POST to https://api.rms.rakuten.co.jp
// Auth: ESA header

// --- READ ---

// Search orders
// POST /es/2.0/order/searchOrder
// Body: {
//   dateType: 1,  // 1=order date
//   startDatetime: "2026-04-01T00:00:00+0900",
//   endDatetime: "2026-04-07T23:59:59+0900",
//   orderProgressList: [100,200,300,400,500,600,700,800,900],
//   PaginationRequestModel: { requestRecordsAmount: 1000, requestPage: 1 }
// }
// Returns: { orderNumberList: string[] }

// Get order details
// POST /es/2.0/order/getOrder
// Body: { orderNumberList: ["order-123", "order-456"] }
// Returns: { orderModelList: RakutenOrder[] }

// Key model fields for ECH mapping:
// order.orderNumber → orders.externalOrderId
// order.orderDatetime → orders.orderedAt
// order.orderProgress → orders.channelStatus (as string "100", "300", etc.)
// order.ordererModel.familyName + firstName → orders.customerName
// order.ordererModel.emailAddress → orders.customerEmail
// order.deliveryModel → orders.shippingAddress (JSONB)
//   { name: deliveryName, line1: deliverySubAddress, city: deliveryCity,
//     state: deliveryPrefecture, postalCode: deliveryZipCode, country: "JP" }
// order.paymentModel.totalPrice → orders.total
// order.paymentModel.shippingCost → orders.shippingFee
// order.paymentModel.taxAmount → orders.tax
// order.paymentModel.couponAmount → orders.discount
// order.basketModelList[].itemModelList[].manageNumber → match to products
// order.basketModelList[].itemModelList[].itemNumber → order_items.sku
// order.basketModelList[].itemModelList[].itemName → order_items.title
// order.basketModelList[].itemModelList[].units → order_items.quantity
// order.basketModelList[].itemModelList[].price → order_items.unitPrice
// Entire response → orders.rawData
// currency: always "JPY" for Rakuten

// --- WRITE ---

// Confirm order (required step for Rakuten, not needed for Amazon)
// POST /es/2.0/order/confirmOrder
// Body: { orderNumber, ... }
// Required before confirm: packageNumber (delivery ID), taxRate (0/8/10%), changeNote
// After confirm → Rakuten verifies payment → status 200→300 or cancelled

// Cancel order (before shipping)
// POST /es/2.0/order/cancelOrder
// Body: { orderNumber, cancelReason }
// Only when status is 100 (Pending) or 300 (Ready to Ship)
// Cannot cancel if shipping date = current date

// Cancel after shipping (return)
// POST /es/2.0/order/cancelAfterShipping
// Body: { orderNumber, cancelReason }
// Only when status is 500 (Shipped), 600 (Payment processing), 700 (Payment completed)
// Sets returnFlag=true in DB

// Update shipping info
// POST /es/2.0/order/updateOrderShipping
// Body: {
//   orderNumber: "order-123",
//   BasketidModelList: [{
//     basketId: 1,
//     ShippingModelList: [{
//       shippingDetailId: 1,
//       deliveryCompany: "1001",        // Carrier code
//       shippingNumber: "tracking-123",
//       shippingDate: "2026-04-07",
//       shippingDeleteFlag: "0"          // "0"=keep, "1"=delete
//     }]
//   }]
// }
// Note: Model attribute names use uppercase (BasketidModelList, ShippingModelList)

// Webhook: 受注情報通知（SKU移行後）
// Rakuten pushes notification when new order placed → triggers getOrder
```

---

## 6. Order Status Mapping

### Platform Status Codes

```
AMAZON FULFILLMENT          RAKUTEN ORDER PROGRESS         ECH UNIFIED
───────────────────         ──────────────────────         ───────────
PENDING_AVAILABILITY   ───→ 100 注文確認待ち          ───→ new
PENDING                ───→
                            200 楽天処理中            ───→ processing
UNSHIPPED              ───→ 300 発送待ち              ───→
                            400 変更確定待ち          ───→
PARTIALLY_SHIPPED      ───→
SHIPPED                ───→ 500 発送済み              ───→ shipped
                            600 支払手続き中          ───→ delivered
(Package: DELIVERED)   ───→ 700 支払手続き済み        ───→
CANCELLED              ───→ 800 キャンセル確定待ち    ───→ cancelled
UNFULFILLABLE          ───→ 900 キャンセル確定        ───→
(Package: RETURNED)    ───→ 500+returnFlag           ───→ returned
```

### Implementation

```typescript
// towers/oms/orders/orders-status.mapper.ts

const AMAZON_TO_ECH: Record<string, OrderStatus> = {
  PENDING_AVAILABILITY: 'new',
  PENDING: 'new',
  UNSHIPPED: 'processing',
  PARTIALLY_SHIPPED: 'shipped',
  SHIPPED: 'shipped',
  CANCELLED: 'cancelled',
  UNFULFILLABLE: 'cancelled',
};

const RAKUTEN_TO_ECH: Record<number, OrderStatus> = {
  100: 'new',           // 注文確認待ち
  200: 'processing',    // 楽天処理中
  300: 'processing',    // 発送待ち
  400: 'processing',    // 変更確定待ち
  500: 'shipped',       // 発送済み (check returnFlag → 'returned')
  600: 'delivered',     // 支払手続き中
  700: 'delivered',     // 支払手続き済み
  800: 'cancelled',     // キャンセル確定待ち
  900: 'cancelled',     // キャンセル確定
};

// ECH unified statuses (from constants.ts):
// ["new", "processing", "shipped", "delivered", "cancelled", "returned"]

// Order item statuses:
// ["pending", "fulfilled", "cancelled", "returned"]

// Status change sources:
// ["channel", "system", "user"]

// Fulfillment methods:
// ["fba", "fbm", "3pl"]
```

### DB Schema (Existing)

```sql
-- orders table stores both unified and channel-specific status
orders.status          -- pgEnum: new|processing|shipped|delivered|cancelled|returned
orders.channel_status  -- varchar: "UNSHIPPED", "300", "SHIPPED", etc.
orders.raw_data        -- jsonb: entire API response preserved

-- order_status_history tracks all transitions
order_status_history.from_status   -- varchar (previous ECH status)
order_status_history.to_status     -- varchar (new ECH status)
order_status_history.source        -- pgEnum: channel|system|user
order_status_history.note          -- text (reason, channel status detail)
```

---

## 7. Product / SKU Structure Comparison

### Variation Model

```
AMAZON                              ECH-KENSHIN                         RAKUTEN
──────                              ───────────                         ───────
Parent ASIN ──────────────────→ Product (parentId=null)  ←──────── manageNumber
  productType=configurable           productType=configurable
  variationTheme=["Size","Color"]    familyVariantId → axes def
                                     variationTheme=["Size","Color"]

Child ASIN ───────────────────→ Product (parentId=parent.id) ←──── SKU under manageNumber
  own SKU                            sku (unique per org)               itemNumber
  own price                          values: JSONB (EAV)               own price
  parentSku link                     channel_listings:                  implicit parent (same manageNumber)
  variationChildSkus[]                 externalId (ASIN / manageNumber)
                                       channel_values: JSONB

Standalone ASIN ──────────────→ Product (parentId=null)  ←──────── Single-SKU item
  productType=simple                 productType=simple
```

### Field Mapping Quick Reference

| ECH Common Field | Amazon Source | Rakuten Source | DB Column |
|-----------------|-------------|---------------|-----------|
| title | `summaries.itemName` | `itemName` | `products.values.title` |
| price | `purchasable_offer.our_price` | `itemPrice` | `channel_listings.channel_values.price` |
| sku | Listing SKU | `itemNumber` | `products.sku` |
| externalId | ASIN | `manageNumber` | `channel_listings.external_id` |
| janCode | `identifiers[EAN]` | `catalogId` | `products.values.jan_code` |
| description | `product_description` | `description` | `products.values.description` |
| mainImage | `images[MAIN]` | First CabinetAPI image | `product_media` |
| category | `browseNodeId` | `genreId` | `product_categories` |
| status | Listing status enum | `hideItems` flag | `channel_listings.status` |
| parentId | `parentSku` | Same `manageNumber` | `products.parent_id` |
| variationAxes | `variationTheme[]` | SKU Classify names | `products.variation_theme` |

### Platform-Specific → channel_values JSONB

**Amazon-only:** `bullet_point[]`, `item_package_dimensions`, `browse_node`, `fulfillmentChannel`, `condition`, `brand`, `material`, Product Type JSON Schema

**Rakuten-only:** `productType` tag (Normal/Distribution/Pre-order), `subscription` settings, `distribution` deliveries (2-12), `preOrder` release date, `genreAttributes`, `hideItems` flag

---

## 8. Connector Architecture

### Existing Interfaces

```typescript
// shared-kernel/infrastructure/connectors/capabilities/

interface ICatalogSearchable {
  searchCatalog(query: string, options?: CatalogSearchOptions): Promise<CatalogSearchResult>;
}

interface IListingPullable {
  pullListings(options?: ListingPullOptions): Promise<NormalizedListing[]>;
  getListingDetail(externalId: string): Promise<NormalizedListing>;
}

interface IListingSubmittable {
  submitListing(payload: ListingSubmitPayload): Promise<SubmissionResult>;
}

interface IOrderPullable {
  getOrders(options?: {
    createdAfter?: string;
    createdBefore?: string;
    statuses?: string[];
    nextToken?: string;
  }): Promise<{ orders: NormalizedOrder[]; nextToken?: string }>;
  getOrderItems(orderId: string): Promise<NormalizedOrderItem[]>;
}

interface IRestrictionCheckable { ... }
interface IProductTypeSearchable { ... }
```

### New Interfaces Needed

```typescript
// NEW: Order write operations (Rakuten needs confirm/cancel, Amazon doesn't)
interface IOrderActionable {
  confirmOrder(orderId: string, data: ConfirmOrderData): Promise<void>;
  cancelOrder(orderId: string, reason: string): Promise<void>;
  cancelAfterShipping(orderId: string, reason: string): Promise<void>;
}

// NEW: Shipping updates
interface IOrderTrackable {
  updateShipping(orderId: string, data: ShippingUpdateData): Promise<void>;
}

// NEW: Inventory sync
interface IInventorySyncable {
  getInventory(skus: string[]): Promise<InventoryItem[]>;
  updateInventory(items: { sku: string; quantity: number }[]): Promise<void>;
}
```

### New Connectors

```typescript
// 1. RakutenSellerConnector
//    Auth: ESA header
//    Rate: 1 req/s
//    Implements: ICatalogSearchable, IListingPullable, IListingSubmittable, IInventorySyncable
//    Path: shared-kernel/infrastructure/connectors/rakuten-seller/

// 2. AmazonOrderConnector
//    Auth: existing LWA OAuth (reuse AmazonAuthClient)
//    Implements: IOrderPullable, IOrderTrackable
//    Path: shared-kernel/infrastructure/connectors/amazon/ (extend existing)

// 3. RakutenOrderConnector
//    Auth: ESA header
//    Implements: IOrderPullable, IOrderActionable, IOrderTrackable
//    Path: shared-kernel/infrastructure/connectors/rakuten-seller/ (same module)
```

### Registry Pattern

```typescript
// Existing pattern — register new connectors:
// connector.registry.ts → register('rakuten-seller', RakutenSellerConnector)
// value-unwrapper.registry.ts → register('rakuten', rakutenUnwrapper) // already done
// payload-builder.registry.ts → register('rakuten', rakutenPayloadBuilder) // NEW
```

---

## 9. OMS Tower Implementation Plan

### Module Structure

```
towers/oms/
├── oms.module.ts                    — NestJS module definition
├── orders/
│   ├── orders.controller.ts         — REST: GET /orders, GET /orders/:id, POST /orders/:id/cancel
│   ├── orders.service.ts            — Business logic, status transitions
│   ├── orders-sync.service.ts       — Pull from Amazon/Rakuten, normalize, upsert
│   ├── orders-status.mapper.ts      — Cross-platform status mapping (§6)
│   └── orders.spec.ts               — Unit tests
├── order-items/
│   └── order-items.service.ts       — Line item operations
└── order-actions/
    └── order-actions.service.ts     — Confirm, cancel, ship (Rakuten-specific)
```

### Sync Flow

```
1. Initial sync (on channel connect):
   Amazon: searchOrders(createdAfter=30daysAgo, marketplaceIds=[JP])
   Rakuten: searchOrder(dateType=1, orderProgressList=[100-900])

2. Incremental sync (every 5 min via BullMQ):
   Amazon: searchOrders(lastUpdatedAfter=lastSyncTime)
   Rakuten: searchOrder(startDatetime=lastSyncTime)

3. Real-time (Rakuten webhook):
   受注情報通知 → getOrder(orderNumber) → upsert

4. For each order:
   a. Normalize to NormalizedOrder (existing interface)
   b. Map channel status → ECH unified status (§6)
   c. Upsert orders + order_items
   d. Record status change in order_status_history
   e. Match order_items.sku → products.sku → set order_items.productId
```

---

## 10. Database Schema — No New Tables Needed

### Existing Tables Used

| Table | Amazon Usage | Rakuten Usage |
|-------|-------------|---------------|
| `channels` | type='amazon', credentials: LWA tokens | type='rakuten', credentials: licenseKey+serviceSecret+expireDate |
| `channel_listings` | ASIN-based, channel_values JSONB | manageNumber-based, channel_values JSONB |
| `channel_attribute_mappings` | 20+ SP-API attribute paths | genreId-based attribute mappings |
| `marketplace_product_types` | SP-API Product Type JSON Schema | Rakuten genre-based schemas |
| `imported_listings` | Raw catalog/listing data | Raw ItemAPI response |
| `listing_submissions` | putListingsItem, patchListingsItem | items.insert, items.update, items.delete |
| `orders` | orderId, UNSHIPPED/SHIPPED/etc. | orderNumber, 100/200/.../900 |
| `order_items` | ASIN + SKU, fulfillmentMethod=fba/fbm | manageNumber + itemNumber, fulfillmentMethod=null |
| `order_status_history` | Status transitions + Package status | Status code transitions |
| `inventory_items` | SKU ↔ Amazon listing | SKU ↔ Rakuten itemNumber |
| `stock_sync_queue` | Push via Listings API | Push via InventoryAPI 2.1 |

### Minor Schema Adjustments

1. **`listing_submissions.operation` enum** — Add generic values alongside Amazon-specific:
   - Current: `putListingsItem`, `patchListingsItem`, `submitMedia`, `JSON_LISTINGS_FEED`, `getListingsItem`
   - Add: `create_listing`, `update_listing`, `delete_listing`, `update_inventory`, `activate_listing`, `deactivate_listing`

2. **`channels.credentials` JSONB** — Ensure supports Rakuten format:
   ```jsonc
   // Amazon
   { "sellerId": "...", "marketplaceId": "...", "refreshToken": "...", "clientId": "...", "clientSecret": "..." }
   // Rakuten
   { "serviceSecret": "...", "licenseKey": "...", "shopUrl": "...", "expireDate": "2026-07-06" }
   ```

3. **`orders.channelStatus`** — Already `varchar(100)`, stores raw platform status ("UNSHIPPED", "300", etc.)

---

## 11. Rate Limiting Summary

| Platform | API | Rate | Strategy |
|----------|-----|------|----------|
| Amazon | Catalog Items | 2 req/s | Token bucket (existing) |
| Amazon | Listings Items | 5 req/s | Token bucket (existing) |
| Amazon | Orders | Check `x-amzn-RateLimit-Limit` header | Token bucket (NEW) |
| Rakuten | All APIs | 1 req/s | Simple throttle (NEW) |

---

## 12. Rakuten-Specific Constraints

1. **CSV Bulk subscription required** — Sellers must pay ¥11,000/month for API write access (items.insert/update/delete)
2. **License Key 90-day expiry** — Must track and alert (10 days before, per SyncHub spec)
3. **24-hour search delay** — New/deleted products may take up to 24 hours to appear in items.search
4. **Image conversion** — CabinetAPI auto-converts PNG/TIFF/BMP to JPEG; max 4MB per batch
5. **Immutable fields** — manageNumber (URL), SKU, genreId, productType cannot be changed after creation
6. **Order confirmation required** — Unlike Amazon, Rakuten orders must be explicitly confirmed by the seller (confirmOrder API)
7. **Uppercase model names** — Rakuten API uses uppercase attribute names in nested models (`BasketidModelList`, `ShippingModelList`)
8. **Timezone** — All Rakuten datetimes use +0900 (JST)
9. **Currency** — Always JPY for Rakuten (no decimal places)
10. **Deleted items** — In search results, deleted items return only `manageNumber` — skip these

---

## 13. Implementation Order

```
Phase 1A — Foundation (parallel)
├── OMS tower scaffold (module, controller, service, sync service)
├── Orders status mapper (Amazon + Rakuten → ECH unified)
└── listing_submissions enum generalization

Phase 1B — Order Connectors (parallel)
├── Amazon Order connector (searchOrders, getOrder → NormalizedOrder)
└── Rakuten Order connector (searchOrder, getOrder → NormalizedOrder)

Phase 1C — Rakuten Seller Connector
├── RakutenAuthClient (ESA header, expiry tracking)
├── ItemAPI 2.0 (search, get → NormalizedListing)
├── ItemAPI 2.0 (insert, update, delete → ListingSubmission)
└── Register in connector.registry + value-unwrapper.registry

Phase 1D — Order Actions + Inventory
├── Rakuten order actions (confirmOrder, cancelOrder, updateOrderShipping)
├── AmazonInventoryConnector (Listings API quantity)
└── RakutenInventoryConnector (InventoryAPI 2.1 bulk-upsert)

Phase 2 — Deferred
├── CabinetAPI (image upload)
├── NavigationAPI (genre tree)
├── Amazon Feeds API (bulk operations)
├── Subscription/Distribution product types
└── AI Product Master mapping (SyncHub-style cross-EC-mall grouping)
```

---

## Sources

- [Amazon SP-API Orders v2026-01-01 Model](https://github.com/amzn/selling-partner-api-models/blob/main/models/orders-api-model/orders_2026-01-01.json)
- [Amazon SP-API Developer Docs](https://developer-docs.amazon.com/sp-api/reference/orders-v2026-01-01)
- Rakuten RMS SyncHub Functional Spec v0.5 (internal PDF, 46 pages)
- [Rakuten.RMS.Api .NET Library](https://github.com/JakeJP/Rakuten.RMS.Api) — API structure reference
- [rms_api_ruby — RakutenPayOrderAPI](https://github.com/Kaicoh/rms_api_ruby/blob/master/docs/rakuten_pay_order_api.md)
- [rms-api-sample (PHP)](https://github.com/yheihei/rms-api-sample) — Order status codes, search params
- [Rakuten order flow (JP)](https://www.apro-soken.co.jp/column/order/post-8.html)
- ECH-Kenshin codebase: `connectors/capabilities/order.capability.ts`, `schemas/oms/*`, `lib/constants.ts`
