# Research: Marketplace API Comparison — Amazon SP-API vs Rakuten RMS

**Version:** 1.0.0
**Last Updated:** 2026-04-07
**Authors:** Minh Pham, Claude (AI-assisted)
**Status:** Draft
**Source:** Amazon SP-API v2026-01-01, Rakuten RMS SyncHub Functional Spec (v0.5), GitHub OSS libraries

---

## 1. Executive Summary

This document maps the 19-item research checklist against Amazon SP-API and Rakuten RMS capabilities, identifies gaps in ECH-Kenshin's current implementation, and proposes a cross-platform status mapping for the unified SaaS.

### Current State

| Platform | Read API | Write API | Orders | Inventory | Connector |
|----------|----------|-----------|--------|-----------|-----------|
| **Amazon** | ✅ Catalog + Listings + ProductType | ✅ putListing, patchListing, submitMedia | ⚠️ Schema only | ⚠️ Schema only | ✅ Production |
| **Rakuten** | ⚠️ Public catalog only | ❌ None | ❌ None | ❌ None | ⚠️ MVP identification |

---

## 2. Platform Scope in MVP (Research Item #1)

### Amazon SP-API — Confirmed Scope

| Capability | API | Status in ECH |
|------------|-----|---------------|
| Catalog search | Catalog Items API v2022-04-01 | ✅ Implemented |
| Listing pull | Listings Items API v2021-08-01 | ✅ Implemented |
| Listing submit | Listings Items API (PUT/PATCH) | ✅ Implemented |
| Product type schema | Product Type Definitions API v2020-09-01 | ✅ Implemented |
| Order pull | Orders API v2026-01-01 | ❌ Not started |
| Inventory sync | — (via Listings API inventory fields) | ❌ Not started |
| Restrictions check | Listings Restrictions API | ✅ Implemented |

### Rakuten RMS — Required Scope

| Capability | API | Status in ECH |
|------------|-----|---------------|
| Catalog search (public) | Rakuten Ichiba Item Search API | ✅ MVP implemented |
| Product CRUD (seller) | ItemAPI 2.0 (get, upsert, patch, delete, search) | ❌ Not started |
| Inventory sync | InventoryAPI 2.1 (bulk-get, bulk-upsert) | ❌ Not started |
| Order pull | RakutenPayOrderAPI (searchOrder, getOrder) | ❌ Not started |
| Order confirm/cancel | RakutenPayOrderAPI (confirmOrder, cancelOrder) | ❌ Not started |
| Shipping update | RakutenPayOrderAPI (updateOrderShipping) | ❌ Not started |
| Image upload | CabinetAPI (R-Cabinet) | ❌ Not started |
| Category/genre | NavigationAPI 2.0 / CategoryAPI 2.0 | ❌ Not started |
| Shop info | ShopAPI | ❌ Not started |
| License management | LicenseManagementAPI | ❌ Not started |

### Authentication Comparison

| Aspect | Amazon SP-API | Rakuten RMS |
|--------|---------------|-------------|
| **Auth model** | OAuth 2.0 (LWA refresh token) | License Key + Service Secret |
| **Token lifetime** | ~1 hour (auto-refresh) | 90 days (manual renewal) |
| **Scope** | Per-seller (marketplace-specific) | Per-shop (License Key per store) |
| **Credential format** | client_id + client_secret + refresh_token | serviceSecret + licenseKey (Base64 → `ESA` header) |
| **Rate limiting** | Token bucket per endpoint (2-5 req/s) | 1 req/s general |
| **Sandbox** | SP-API sandbox endpoints | Dedicated test shop accounts |

---

## 3. Read API (Research Item #2)

### Amazon — What We Can Pull

| Dataset | API | Key Fields | Implemented |
|---------|-----|------------|-------------|
| Product summary | Catalog Items `?includedData=summaries` | title, brand, color, size, manufacturer | ✅ |
| Full attributes | Catalog Items `?includedData=attributes` | All structured attrs (material, dimensions, bullet_point, etc.) | ✅ |
| Classifications | Catalog Items `?includedData=classifications` | Browse nodes, category path | ✅ |
| Dimensions | Catalog Items `?includedData=dimensions` | Package/item dimensions | ✅ |
| Images | Catalog Items `?includedData=images` | Image URLs by variant | ✅ |
| Identifiers | Catalog Items `?includedData=identifiers` | ASIN, EAN/JAN, UPC | ✅ |
| Relationships | Catalog Items `?includedData=relationships` | Parent ASINs | ✅ |
| Seller listings | Listings Items `?includedData=summaries,issues` | SKU, status, price, fulfillment, parent/child | ✅ |
| Product type schema | Product Type Definitions | JSON Schema per product type | ✅ |
| **Orders** | Orders API `searchOrders` / `getOrder` | See §6 | ❌ |

### Rakuten RMS — What We Can Pull

| Dataset | API | Key Fields | Implemented |
|---------|-----|------------|-------------|
| Public catalog | Ichiba Item Search | itemName, itemPrice, JAN, genreId, thumbnail | ✅ (public) |
| Seller product list | ItemAPI 2.0 `items.search` | manageNumber, itemName, itemPrice, SKUs, status, images | ❌ |
| Product detail | ItemAPI 2.0 `items.get` | Full item fields (see §5 for structure) | ❌ |
| Genre/category | NavigationAPI 2.0 | Genre tree, genre attributes | ❌ |
| Inventory | InventoryAPI 2.1 `bulk-get` | SKU-level stock quantities | ❌ |
| Orders | RakutenPayOrderAPI `searchOrder` / `getOrder` | See §6 | ❌ |
| Shop info | ShopAPI | Shop name, URL, settings | ❌ |

**Key difference:** Amazon Catalog Items API returns rich structured data in a single call with `includedData` parameter. Rakuten requires separate API calls for product info, inventory, and images. Rakuten's public API returns flat summary data only; full data requires seller-authenticated ItemAPI 2.0.

---

## 4. Write API (Research Item #3)

### Amazon — What We Can Push

| Operation | API Method | Key Fields | Implemented |
|-----------|-----------|------------|-------------|
| Create listing | `putListingsItem` | Full product data per product type schema | ✅ |
| Update listing | `patchListingsItem` | Partial updates (price, quantity, attributes) | ✅ |
| Submit media | Media upload via Listings API | Product images | ✅ |
| Bulk operations | JSON_LISTINGS_FEED | Batch create/update | ⚠️ Schema only |

### Rakuten RMS — What We Can Push

| Operation | API Method | Key Fields | Status |
|-----------|-----------|------------|--------|
| Create product | ItemAPI 2.0 `items.insert` | Full item data (see §5) | ❌ |
| Update product | ItemAPI 2.0 `items.update` | Item fields (URL/SKU/genre immutable) | ❌ |
| Delete product | ItemAPI 2.0 `items.delete` | By manageNumber | ❌ |
| Activate/Deactivate | ItemAPI 2.0 (hideItems flag) | Toggle sale status | ❌ |
| Upload images | CabinetAPI | PNG/TIFF/BMP → auto-convert to JPEG, max 4MB total | ❌ |
| Update inventory | InventoryAPI 2.1 `inventories.bulk.upsert` | SKU-level quantity | ❌ |
| Confirm order | RakutenPayOrderAPI `confirmOrder` | Package number, tax rate, change note | ❌ |
| Cancel order | RakutenPayOrderAPI `cancelOrder` | Reason code | ❌ |
| Cancel after shipping | RakutenPayOrderAPI `cancelAfterShipping` | Return flag | ❌ |
| Update shipping | RakutenPayOrderAPI `updateOrderShipping` | Carrier, tracking number, ship date | ❌ |

**Key difference:** Amazon uses a unified Listings API for all product write operations with JSON Schema validation. Rakuten uses separate APIs for products (ItemAPI), inventory (InventoryAPI), images (CabinetAPI), and orders (RakutenPayOrderAPI).

**Important Rakuten constraint:** Sellers must register for CSV Bulk product edit (¥11,000/month) before they can use API create/edit/delete.

---

## 5. Product Data Structure (Research Items #4, #10, #11)

### Amazon Product Structure

```
Product (ASIN)
├── productType: "SHIRT" (from Product Type Definitions)
├── summaries: { itemName, brand, color, size, manufacturer }
├── attributes: { JSONB per product type schema }
│   ├── bullet_point[], product_description
│   ├── material, item_package_dimensions
│   ├── purchasable_offer (price), item_weight
│   └── ... (20+ attribute groups)
├── identifiers: { ASIN, EAN/JAN, UPC }
├── classifications: { browseNode hierarchy }
├── images: { MAIN, PT01-PT08, SWATCH }
├── relationships: { parentAsins[] }
└── Seller Listing (SKU)
    ├── sku, status, price, fulfillmentChannel
    ├── parentSku, variationChildSkus[]
    ├── variationType: "parent" | "child" | "standalone"
    └── variationTheme: ["Size", "Color"]
```

### Rakuten Product Structure

```
Item (manageNumber = Product URL identifier)
├── itemName: 商品名 (max 255 chars)
├── itemPrice: 販売価格
├── genreId: ジャンルID (immutable after creation)
├── catalogId: JAN/EAN code (optional, with reason if omitted)
├── productType:
│   ├── Normal (通常商品) — can have subscription
│   ├── Distribution (頒布会商品) — 2-12 deliveries
│   └── Pre-order (予約商品) — with release date
├── description: 商品説明 (max 5120 chars)
├── images: via CabinetAPI (first = main image)
│   └── URL: image.rakuten.co.jp/_shop_{id}/cabinet/image
├── status: Active (sale) / Inactive (not sale) — via hideItems flag
├── genreAttributes: per-genre required/optional fields
└── SKU Structure:
    ├── Single SKU: 1 manageNumber = 1 SKU
    └── Multi-SKU: 1 manageNumber = N SKUs
        ├── SKU Classify: axis name (e.g., "Color", "Size")
        ├── SKU Values: axis values per classify
        ├── Per-SKU: price, quantity (via InventoryAPI)
        └── Variant display as parent + child rows
```

### SKU / Variation Comparison (Research Item #10)

| Aspect | Amazon | Rakuten |
|--------|--------|---------|
| **Parent concept** | Parent ASIN (productType=configurable) | manageNumber (Product URL) |
| **Child concept** | Child ASIN with own SKU | SKU under same manageNumber |
| **Variation axes** | variationTheme[] (e.g., ["Size","Color"]) | SKU Classify (横軸: Color, 縦軸: Size) |
| **Linking** | parentSku ↔ variationChildSkus[] | Implicit under same manageNumber |
| **Independent pricing** | Each child ASIN has own price | Each SKU has own price |
| **Independent inventory** | Each SKU has own quantity | Each SKU has own quantity (via InventoryAPI) |
| **Max variations** | Depends on product type (typically 2 axes) | 2 axes (横軸/縦軸) |
| **Standalone** | productType=simple, no parent | Single SKU item |

### ECH-Kenshin Mapping

```
Amazon Parent ASIN ──┐
                     ├──→ Product (parentId=null, productType=configurable)
Rakuten manageNumber─┘        ├── familyVariantId → axes definition
                              ├── child Product (parentId=parent.id)
                              │   ├── sku (unique per org)
                              │   └── values: JSONB (EAV attributes)
                              └── channel_listings (per channel)
                                  ├── externalId (ASIN or manageNumber)
                                  └── channel_values: JSONB
```

### Required vs Optional Fields (Research Item #11)

| Field | Amazon | Rakuten | Common Model |
|-------|--------|---------|-------------|
| Product name/title | Required | Required (itemName) | ✅ Required |
| SKU | Required | Required (manageNumber) | ✅ Required |
| Price | Required | Required (itemPrice) | ✅ Required |
| Description | Required per type | Required (説明文) | ✅ Required |
| Images | Required (1+ main) | Optional (but recommended) | ⚠️ Recommended |
| JAN/EAN | Optional | Optional (catalogId, with reason) | Optional |
| Category | Required (productType) | Required (genreId) | ✅ Required |
| Brand | Required per type | Optional (via genre attrs) | ⚠️ Type-dependent |
| Dimensions | Optional | Not in standard fields | Optional |
| Weight | Optional | Not in standard fields | Optional |
| Bullet points | Required per type | Not applicable | Platform-specific |
| Genre attributes | N/A | Required per genreId | Platform-specific |
| Product type tag | N/A | Required (Normal/Distribution/Pre-order) | Platform-specific |

---

## 6. Order Data (Research Items #7, #8, #9)

### Amazon Orders API v2026-01-01

**Endpoints:**

| Endpoint | Method | Path |
|----------|--------|------|
| Search Orders | GET | `/orders/2026-01-01/orders` |
| Get Order | GET | `/orders/2026-01-01/orders/{orderId}` |

**Search Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `createdAfter` / `createdBefore` | datetime | Filter by creation time (mutually exclusive with lastUpdated) |
| `lastUpdatedAfter` / `lastUpdatedBefore` | datetime | Filter by update time |
| `fulfillmentStatuses` | array | Filter by status |
| `marketplaceIds` | array | Up to 50 marketplaces |
| `fulfilledBy` | array | MERCHANT or AMAZON |
| `maxResultsPerPage` | int | 1-100 (default 100) |
| `paginationToken` | string | Cursor (expires after 24h) |
| `includedData` | array | BUYER, RECIPIENT, PROCEEDS, EXPENSE, PROMOTION, CANCELLATION, FULFILLMENT, PACKAGES |

**Amazon Order Model:**

```typescript
interface AmazonOrder {
  orderId: string;                    // Amazon-defined
  orderAliases?: Alias[];             // aliasType: SELLER_ORDER_ID
  createdTime: datetime;
  lastUpdatedTime: datetime;
  programs?: OrderProgram[];          // PRIME, PREORDER, AMAZON_BUSINESS, etc.
  associatedOrders?: AssociatedOrder[]; // REPLACEMENT_ORIGINAL_ID, EXCHANGE_ORIGINAL_ID
  salesChannel: {
    channelName: 'AMAZON' | 'NON_AMAZON';
    marketplaceId: string;
    marketplaceName: string;
  };
  buyer?: {
    buyerName: string;
    buyerEmail: string;               // Anonymized, FBM only
    buyerCompanyName?: string;
    buyerPurchaseOrderNumber?: string;
  };
  recipient?: {
    deliveryAddress: CustomerAddress;
    deliveryPreference?: DeliveryPreference;
  };
  proceeds?: { grandTotal: Money };
  fulfillment: {
    fulfillmentStatus: FulfillmentStatus;
    fulfilledBy: 'AMAZON' | 'MERCHANT';
    fulfillmentServiceLevel: ServiceLevel;
    shipByWindow?: DateTimeRange;
    deliverByWindow?: DateTimeRange;
  };
  orderItems: AmazonOrderItem[];
  packages?: OrderPackage[];          // FBM only
}

interface AmazonOrderItem {
  orderItemId: string;
  quantityOrdered: number;
  product: {
    asin: string;
    title: string;
    sellerSku: string;
    condition: { conditionType: 'NEW'|'USED', conditionSubtype: string };
    price: { unitPrice: Money, priceDesignation?: 'BUSINESS_PRICE' };
    serialNumbers?: string[];
  };
  proceeds?: { proceedsTotal: Money, breakdowns: ProceedsBreakdown[] };
  expense?: { pointsCost: PointsCost };
  promotion?: { breakdowns: PromotionBreakdown[] };
  cancellation?: { cancellationRequest: { requester: 'BUYER'|'SELLER', cancelReason: string } };
  fulfillment?: {
    quantityFulfilled: number;
    quantityUnfulfilled: number;
    packing?: { giftOption: { giftMessage, giftWrapLevel } };
    shipping?: { scheduledDeliveryWindow, shippingConstraints, internationalShipping };
  };
}

interface OrderPackage {  // FBM only
  packageReferenceId: string;
  createdTime: datetime;
  packageStatus: {
    status: 'PENDING'|'SHIPPED'|'IN_TRANSIT'|'DELIVERED'|'CANCELLED'|'UNDELIVERABLE'|'RETURNED'|'EXCEPTION';
    detailedStatus?: string;  // e.g. OUT_FOR_DELIVERY
  };
  carrier: string;
  shipTime: datetime;
  shippingService: string;
  trackingNumber: string;
  shipFromAddress: MerchantAddress;
  packageItems: { orderItemId: string, quantity: number, transparencyCodes?: string[] }[];
}
```

### Rakuten RMS Order API (RakutenPayOrderAPI)

**Endpoints:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| searchOrder | POST | Search orders by date range + status filter |
| getOrder | POST | Get order details by order number list |
| confirmOrder | POST | Confirm pending orders |
| cancelOrder | POST | Cancel orders before shipping |
| cancelAfterShipping | POST | Cancel/return after shipping (sets returnFlag) |
| updateOrderShipping | POST | Update carrier, tracking, ship date |
| getSubStatusList | GET | Get custom sub-status options |
| updateOrderSubStatus | POST | Set custom sub-status on orders |

**Search Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `dateType` | int | Period search type (1=order date, etc.) |
| `startDatetime` / `endDatetime` | datetime | ISO 8601 with +0900 timezone |
| `orderProgressList` | int[] | Status codes: [100,200,300,400,500,600,700,800,900] |
| `PaginationRequestModel` | object | { requestRecordsAmount: max 1000, requestPage: 1-based } |

**Auth Header:** `Authorization: ESA {base64(serviceSecret:licenseKey)}`

**Rakuten Order Model (derived from SyncHub spec + OSS libraries):**

```typescript
interface RakutenOrder {
  orderNumber: string;                // Rakuten order ID
  orderDatetime: datetime;
  orderProgress: number;              // Status code (100-900)
  // Buyer info
  ordererModel: {
    familyName: string;               // 姓
    firstName: string;                // 名
    zipCode: string;
    prefecture: string;               // 都道府県
    city: string;
    subAddress: string;
    phoneNumber: string;
    emailAddress: string;
  };
  // Delivery info
  deliveryModel: {
    deliveryName: string;
    deliveryZipCode: string;
    deliveryPrefecture: string;
    deliveryCity: string;
    deliverySubAddress: string;
    deliveryPhoneNumber: string;
  };
  // Package/basket info
  basketModelList: {
    basketId: number;                  // Package identifier
    shippingModelList: {
      shippingDetailId: number;
      deliveryCompany: string;        // Carrier code
      shippingNumber: string;         // Tracking number
      shippingDate: string;           // YYYY-MM-DD
    }[];
    itemModelList: {
      itemName: string;
      manageNumber: string;           // Product URL identifier
      itemNumber: string;             // SKU
      price: number;
      units: number;                  // Quantity
    }[];
  }[];
  // Payment
  paymentModel: {
    totalPrice: number;
    shippingCost: number;
    taxAmount: number;
    pointAmount: number;              // Rakuten Points used
    couponAmount: number;
  };
  // Status-specific
  subStatusId?: number;               // Custom sub-status
  returnFlag?: boolean;               // Set by cancelAfterShipping
}
```

**Notification:** Rakuten sends webhook `受注情報通知（SKU移行後）` when new orders are placed → triggers SyncHub to call `getOrder`.

---

## 7. Cross-Platform Order Status Mapping (Research Item #9)

### Rakuten Order Status Codes

| Code | Japanese | English | Description |
|------|----------|---------|-------------|
| 100 | 注文確認待ち | Awaiting Confirmation | New order, shop has not confirmed yet |
| 200 | 楽天処理中 | Rakuten Processing | After shop confirmation, payment audit in progress |
| 300 | 発送待ち | Awaiting Shipment | Payment verified, ready to ship |
| 400 | 変更確定待ち | Awaiting Change Confirmation | Order modification pending |
| 500 | 発送済み | Shipped | All items shipped |
| 600 | 支払手続き中 | Payment Processing | Settlement in progress |
| 700 | 支払手続き済み | Payment Completed | Settlement complete |
| 800 | キャンセル確定待ち | Awaiting Cancellation | Cancellation requested, pending |
| 900 | キャンセル確定 | Cancelled | Order cancelled |

### Amazon Order Fulfillment Status

| Status | Description |
|--------|-------------|
| PENDING_AVAILABILITY | Pre-order, awaiting release date |
| PENDING | Placed but not ready for shipment |
| UNSHIPPED | Ready for shipment, no items shipped |
| PARTIALLY_SHIPPED | Some items shipped |
| SHIPPED | All items shipped |
| CANCELLED | Order cancelled |
| UNFULFILLABLE | Cannot fulfill (FBA only) |

### Amazon Package Status (FBM only)

| Status | Description |
|--------|-------------|
| PENDING | Package not yet shipped |
| SHIPPED | Handed to carrier |
| IN_TRANSIT | In carrier network |
| DELIVERED | Delivered to customer |
| CANCELLED | Package cancelled |
| UNDELIVERABLE | Cannot deliver |
| RETURNED | Returned to sender |
| EXCEPTION | Delivery exception |

### Unified ECH-Kenshin Order Status Model

```
┌─────────────────────────────────────────────────────────────────┐
│                    ECH Unified Status                            │
│                                                                  │
│  ┌──────────┐   ┌────────────┐   ┌───────────┐   ┌──────────┐  │
│  │  PENDING  │──→│ PROCESSING │──→│  SHIPPED  │──→│DELIVERED │  │
│  └────┬─────┘   └─────┬──────┘   └─────┬─────┘   └──────────┘  │
│       │               │               │                         │
│       ▼               ▼               ▼                         │
│  ┌──────────┐   ┌────────────┐   ┌───────────┐                 │
│  │CANCELLED │   │ CANCELLED  │   │ RETURNED  │                 │
│  └──────────┘   └────────────┘   └───────────┘                 │
└─────────────────────────────────────────────────────────────────┘
```

| ECH Status | Amazon Fulfillment | Amazon Package | Rakuten Code | Description |
|------------|-------------------|----------------|--------------|-------------|
| `new` | PENDING_AVAILABILITY, PENDING | — | 100 | Order received, awaiting confirmation |
| `processing` | UNSHIPPED | PENDING | 200, 300, 400 | Confirmed, payment verified, ready to ship |
| `shipped` | PARTIALLY_SHIPPED, SHIPPED | SHIPPED, IN_TRANSIT | 500 | Items handed to carrier |
| `delivered` | — | DELIVERED | 600, 700 | Delivered + payment settled |
| `cancelled` | CANCELLED, UNFULFILLABLE | CANCELLED | 800, 900 | Order cancelled |
| `returned` | — | RETURNED | 500+returnFlag | Post-shipping cancellation/return |

### Channel Status Preservation

The `orders` table stores both unified and original status:

```sql
-- orders table
status          TEXT    -- ECH unified: new, processing, shipped, delivered, cancelled, returned
channel_status  TEXT    -- Original: "UNSHIPPED", "300", etc.

-- order_status_history table
status          TEXT    -- ECH unified status at this point
channel_status  TEXT    -- Original platform status
source          TEXT    -- 'channel' | 'system' | 'user'
```

---

## 8. Inventory Data (Research Item #6)

### Amazon Inventory

Amazon does NOT have a separate Inventory API for sellers in the traditional sense. Inventory is managed through:

1. **Listings API** — `quantity` field in listing data (FBM)
2. **FBA Inventory** — Managed by Amazon, read via FBA Inventory API
3. **Feeds API** — Bulk inventory updates via `POST_INVENTORY_AVAILABILITY_DATA`

### Rakuten Inventory

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /es/2.1/inventories/bulk-get` | POST | Get stock for multiple SKUs |
| `POST /es/2.1/inventories/bulk-upsert` | POST | Update stock for multiple SKUs |

**Key fields per SKU:**
- `manageNumber` — Product identifier
- `itemNumber` — SKU identifier
- `quantity` — Available stock count

**Sync pattern from SyncHub spec:**
- After product creation → call `inventories.bulk.upsert` to set initial quantity
- Polling: recall API every 5 minutes to update stock levels
- On Product Master inventory edit → push to all linked EC malls

### ECH-Kenshin Inventory Architecture

Current schema (5 tables) maps well to both platforms:

```
inventory_items (sku, warehouseId, quantityOnHand, quantityReserved, version)
     │
     ├── inventory_ledger (append-only: received, sold, reserved, released, adjusted, transferred, returned)
     │
     ├── channel_stock_rules (channelId, warehouseId, bufferStock, maxStock)
     │
     └── stock_sync_queue (sku, channelId, status: pending/syncing/synced/error)
```

**Gap:** Need `InventoryConnector` interface with platform-specific implementations:
- `AmazonInventoryConnector` — push via Listings API quantity field or Feeds API
- `RakutenInventoryConnector` — push via InventoryAPI 2.1 bulk-upsert

---

## 9. Mapping: Common vs Unique Fields (Research Items #12, #13)

### Common Fields (can standardize)

| Common Field | Amazon Source | Rakuten Source |
|-------------|-------------|---------------|
| `title` | `summaries.itemName` | `itemName` |
| `price` | `purchasable_offer.our_price` | `itemPrice` |
| `sku` | Listing SKU | `itemNumber` (SKU under manageNumber) |
| `externalId` | ASIN | `manageNumber` |
| `janCode` | `identifiers[type=EAN]` | `catalogId` |
| `description` | `product_description` | `description` (max 5120) |
| `mainImage` | `images[variant=MAIN]` | First image from CabinetAPI |
| `category` | `classifications.browseNodeId` | `genreId` |
| `status` | Listing status | hideItems flag |
| `quantity` | Listing quantity | InventoryAPI quantity |
| `parentId` | `parentSku` | Same `manageNumber` (implicit) |
| `variationAxes` | `variationTheme[]` | SKU Classify names |

### Amazon-Unique Fields

| Field | Description | Handling |
|-------|-------------|----------|
| `bullet_point[]` | Up to 5 bullet points | Store in `channel_values` |
| `item_package_dimensions` | L×W×H×weight | Store in `channel_values` |
| `browse_node` hierarchy | Category tree path | Store in `channel_values` |
| `fulfillmentChannel` | FBA/FBM | Store in `channel_values` |
| `condition` | NEW/USED + subtype | Store in `channel_values` |
| `brand` | Required per type | Map to common if available |
| `material`, `color`, `size` | Structured attributes | Map to common if available |
| Product Type JSON Schema | Dynamic validation | `marketplace_product_types` |

### Rakuten-Unique Fields

| Field | Description | Handling |
|-------|-------------|----------|
| `productType` tag | Normal/Distribution/Pre-order | Store in `channel_values` |
| `subscription` settings | Subscription price (≥5% below selling) | Store in `channel_values` |
| `distribution` deliveries | 2-12 package deliveries | Store in `channel_values` |
| `preOrder` release date | Sales start date | Store in `channel_values` |
| `genreAttributes` | Per-genre required fields | Store in `channel_values` |
| `hideItems` flag | Active/Inactive toggle | Map to listing status |
| `manageNumber` | Product URL (immutable) | Store as `externalId` |

---

## 10. Product Master / Listing Master / Inventory Relations (Research Items #14, #15, #16)

### Data Flow: Platform → ECH-Kenshin

```
Amazon SP-API                          ECH-Kenshin                         Rakuten RMS
─────────────                          ───────────                         ───────────
Catalog Items API ──┐                                                ┌── ItemAPI 2.0
Listings Items API ─┤    ┌─────────────────────────┐                 ├── InventoryAPI 2.1
                    ├───→│    imported_listings      │←───────────────┤
                    │    │  (raw marketplace data)   │                │
                    │    └──────────┬────────────────┘                │
                    │               │ MappingEngine                   │
                    │               ▼                                 │
                    │    ┌─────────────────────────┐                 │
                    │    │      products            │                 │
                    │    │  (Product Master - PIM)  │                 │
                    │    │  values: JSONB (EAV)     │                 │
                    │    └──────────┬────────────────┘                │
                    │               │                                 │
                    │               ▼                                 │
                    │    ┌─────────────────────────┐                 │
                    │    │   channel_listings       │                 │
                    │    │  (Listing Master)        │                 │
                    │    │  channel_values: JSONB   │←────────────────┘
                    │    └──────────┬────────────────┘
                    │               │
                    │               ▼
Orders API ─────────┤    ┌─────────────────────────┐    ┌── RakutenPayOrderAPI
                    ├───→│      orders              │←───┤
                    │    │  (Order Management)      │    │
                    │    └──────────────────────────┘    │
                    │                                     │
                    │    ┌─────────────────────────┐    │
                    ├───→│   inventory_items        │←───┤── InventoryAPI 2.1
                    │    │  (Inventory Management)  │    │
                    │    └──────────────────────────┘    │
```

### Rakuten-specific Integration Points

1. **Product Master:** Rakuten `manageNumber` → `imported_listings.externalId` → match to `products` via JAN/title/AI mapping
2. **Listing Master:** `channel_listings` with `channelId` pointing to Rakuten channel, `channel_values` storing Rakuten-specific fields (genreAttributes, productType tag, subscription settings)
3. **Inventory:** `inventory_items.sku` ↔ Rakuten `itemNumber`, sync via `stock_sync_queue` → `RakutenInventoryConnector` → InventoryAPI 2.1

---

## 11. ERD / Database Impact (Research Item #17)

### New Tables Required: None

The current 48-table schema accommodates Rakuten without new tables. Rakuten data flows through existing structures:

| Existing Table | Rakuten Usage |
|---------------|---------------|
| `channels` | New row: type='rakuten', credentials=licenseKey+serviceSecret |
| `channel_listings` | Rakuten listings with channel_values JSONB |
| `channel_attribute_mappings` | Rakuten field → PIM attribute mappings |
| `marketplace_product_types` | Rakuten genre-based schemas |
| `imported_listings` | Raw Rakuten product data (match flow) |
| `listing_submissions` | Track Rakuten API write operations |
| `orders` | Rakuten orders with channel_status storing numeric codes |
| `order_items` | Rakuten order line items |
| `order_status_history` | Rakuten status transitions (100→200→300→...) |
| `inventory_items` | SKU-level stock linked to Rakuten products |
| `stock_sync_queue` | Queue for pushing updates to Rakuten InventoryAPI |

### Schema Modifications Needed

1. **`channels` table** — Ensure credential JSONB supports `{ licenseKey, serviceSecret, shopUrl, expireDate }` for Rakuten auth model
2. **`listing_submissions.operation`** — Generalize enum: current Amazon-specific values (`putListingsItem`, `patchListingsItem`) → add generic values (`create_listing`, `update_listing`, `delete_listing`, `update_inventory`)
3. **`orders.channel_status`** — Already TEXT, can store Rakuten numeric codes as strings ("100", "200", etc.)

---

## 12. Phase Priorities (Research Items #18, #19)

### Phase 0 — Research (Current Document) ✅

| # | Item | Amazon | Rakuten |
|---|------|--------|---------|
| 1 | Platform scope | ✅ | ✅ |
| 2 | Read API | ✅ | ✅ |
| 3 | Write API | ✅ | ✅ |
| 4 | Product structure | ✅ | ✅ |
| 5-6 | Listing + Inventory | ✅ | ✅ |
| 7-9 | Order + Status | ✅ | ✅ |
| 10-13 | SKU + Mapping | ✅ | ✅ |
| 14-17 | Relations + ERD | ✅ | ✅ |

### Phase 1 — MVP Implementation Priority

**Must-have for MVP (ship to market):**

| Priority | Item | Amazon | Rakuten | Effort |
|----------|------|--------|---------|--------|
| P0 | Product Read (seller) | ✅ Done | ItemAPI 2.0 connector | M |
| P0 | Product Write | ✅ Done | ItemAPI 2.0 insert/update | L |
| P0 | Order Read | Orders API connector | RakutenPayOrderAPI connector | L |
| P0 | Cross-platform status mapping | Implement in OMS tower | Implement in OMS tower | M |
| P1 | Inventory sync | Connect existing schema to API | InventoryAPI 2.1 connector | M |
| P1 | Order actions (confirm/cancel) | N/A (Amazon auto-processes) | confirmOrder, cancelOrder | M |
| P1 | Shipping update | Feeds API or Order API | updateOrderShipping | S |

**Deferred (Phase 2+):**

| Item | Reason |
|------|--------|
| Rakuten CabinetAPI (image upload) | Can use existing image URLs initially |
| Rakuten NavigationAPI (genre tree) | Can hardcode common genres |
| Amazon Feeds API (bulk operations) | Single-item API sufficient for MVP |
| AI Product Master mapping | SyncHub-style feature, complex |
| Subscription/Distribution product types | Niche Rakuten features |
| Return/refund flow | Post-MVP |

---

## 13. Implementation Recommendations

### New Connectors Needed

```typescript
// 1. RakutenSellerConnector (extends existing RakutenPublicConnector pattern)
interface IRakutenSellerConnector extends
  ICatalogSearchable,      // ItemAPI 2.0 search
  IListingPullable,        // ItemAPI 2.0 get
  IListingSubmittable,     // ItemAPI 2.0 insert/update/delete
  IInventorySyncable {     // InventoryAPI 2.1 bulk-get/bulk-upsert
  // Auth: ESA header with serviceSecret + licenseKey
  // Rate limit: 1 req/s
}

// 2. AmazonOrderConnector
interface IAmazonOrderConnector extends
  IOrderPullable,          // Orders API searchOrders/getOrder
  IOrderTrackable {        // Package status tracking
  // Auth: existing LWA OAuth
  // Rate limit: TBD (check SP-API rate limits doc)
}

// 3. RakutenOrderConnector
interface IRakutenOrderConnector extends
  IOrderPullable,          // searchOrder/getOrder
  IOrderActionable,        // confirmOrder, cancelOrder, cancelAfterShipping
  IOrderTrackable {        // updateOrderShipping
  // Auth: ESA header
  // Webhook: 受注情報通知 for real-time order notifications
}
```

### OMS Tower Implementation

The OMS tower has schema but no server code. Required modules:

```
towers/oms/
├── orders/
│   ├── orders.controller.ts       — REST endpoints
│   ├── orders.service.ts          — Business logic
│   ├── orders-sync.service.ts     — Pull from Amazon/Rakuten
│   └── orders-status.mapper.ts    — Cross-platform status mapping
├── order-items/
│   └── order-items.service.ts
└── oms.module.ts
```

---

## Sources

- Amazon SP-API Orders v2026-01-01: [GitHub Model](https://github.com/amzn/selling-partner-api-models/blob/main/models/orders-api-model/orders_2026-01-01.json)
- Rakuten RMS SyncHub Functional Spec v0.5 (PDF, 46 pages)
- [Rakuten.RMS.Api .NET Library](https://github.com/JakeJP/Rakuten.RMS.Api)
- [rms_api_ruby — RakutenPayOrderAPI docs](https://github.com/Kaicoh/rms_api_ruby/blob/master/docs/rakuten_pay_order_api.md)
- [rms-api-sample (PHP)](https://github.com/yheihei/rms-api-sample)
- [Rakuten order flow explanation](https://www.apro-soken.co.jp/column/order/post-8.html)
