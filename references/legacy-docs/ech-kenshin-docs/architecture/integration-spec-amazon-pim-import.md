# Integration Specification: Amazon SP-API -> ECH-Kenshin PIM Import

**Version:** 1.0.0
**Last Updated:** 2026-04-04
**Authors:** Minh Pham, Claude (AI-assisted)
**Status:** Draft

---

## 1. Overview

### 1.1 Purpose

Enable comprehensive product data import from Amazon Seller Central into ECH-Kenshin's PIM system. The integration must extract **full structured attributes**, **complete parent-child variation trees**, **browse-node classifications**, and **package dimensions** — not just summary-level fields.

### 1.2 Problem Statement

The current implementation requests only `summaries,identifiers,images,productTypes,relationships` from the Catalog Items API. This returns 4 summary-level fields (itemName, brand, color, size) while the MappingEngine defines 20+ attribute paths (`product_description`, `bullet_point`, `material`, `purchasable_offer`, etc.) that require the `attributes` dataset. Result: most PIM fields import as empty.

Additionally, `searchListingsItems` requests only `summaries`, so parent-child relationships are never extracted from the seller's own listing data. The `normalizeListingItem` method hardcodes `parentExternalId: undefined`.

### 1.3 Scope

**In Scope:**
- Catalog Items API v2022-04-01 — product lookup with full `includedData`
- Listings Items API v2021-08-01 — seller listing pull with relationships
- Product Type Definitions API v2020-09-01 — schema retrieval (already correct)
- Rate limiting strategy for all three APIs
- Parent-child variation tree resolution
- Data mapping from Amazon attribute format to PIM EAV values

**Out of Scope:**
- Listing submission (PUT/PATCH) — existing flow is adequate
- Feeds API bulk operations
- Notifications/webhooks for real-time sync
- Pricing API and Product Fees API

### 1.4 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ECH-Kenshin Server                           │
│                                                                     │
│  ┌──────────────┐    ┌────────────────┐    ┌─────────────────────┐  │
│  │ CatalogBrowse│───>│ AmazonConnector│───>│  AmazonAuthClient   │  │
│  │   Service    │    │                │    │  (token mgmt)       │  │
│  └──────┬───────┘    │  ┌────────────┐│    └──────────┬──────────┘  │
│         │            │  │BatchCatalog ││               │            │
│  ┌──────▼───────┐    │  │  Items     ││    ┌──────────▼──────────┐  │
│  │ Listings     │    │  └────────────┘│    │  Token Bucket Rate  │  │
│  │ Import       │───>│  ┌────────────┐│    │  Limiter (NEW)      │  │
│  │ Service      │    │  │SearchList- ││    └──────────┬──────────┘  │
│  └──────┬───────┘    │  │ingsItems  ││               │            │
│         │            │  └────────────┘│    ┌──────────▼──────────┐  │
│  ┌──────▼───────┐    │  ┌────────────┐│    │   Amazon SP-API     │  │
│  │ Mapping      │    │  │GetProdType ││    │   (external)        │  │
│  │ Engine       │    │  │Definitions ││    └─────────────────────┘  │
│  └──────┬───────┘    │  └────────────┘│                             │
│         │            └────────────────┘                             │
│  ┌──────▼───────┐                                                   │
│  │ PIM DB       │  products.values (JSONB)                          │
│  │ (PostgreSQL) │  channel_listings.channel_values (JSONB)          │
│  └──────────────┘                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Authentication & Authorization

### 2.1 Authentication Method

**Login with Amazon (LWA) OAuth 2.0** — refresh_token grant flow.

### 2.2 Token Exchange

```yaml
endpoint:
  url: "https://api.amazon.com/auth/o2/token"
  method: POST
  content_type: "application/x-www-form-urlencoded"

request:
  grant_type: "refresh_token"
  refresh_token: "{REFRESH_TOKEN}"
  client_id: "{CLIENT_ID}"
  client_secret: "{CLIENT_SECRET}"

response:
  access_token: "string"
  token_type: "bearer"
  expires_in: 3600

usage:
  header: "x-amz-access-token: {access_token}"
```

### 2.3 Current Implementation (amazon-auth.client.ts)

- In-memory token caching with 60-second pre-expiry refresh buffer
- Regional base URLs: `na`, `eu`, `fe` (default: `fe` for Japanese market)

### 2.4 Required Fix: Token Refresh Race Condition

**Problem:** Concurrent requests can trigger parallel `refreshAuth()` calls, causing token overwrites.

**Solution:** Add a promise-based mutex so only one refresh executes at a time:

```typescript
private refreshPromise: Promise<void> | null = null;

async refreshAuth(): Promise<void> {
  if (this.accessToken && Date.now() < this.tokenExpiresAt - 60_000) return;
  if (this.refreshPromise) return this.refreshPromise;
  this.refreshPromise = this.doRefresh().finally(() => {
    this.refreshPromise = null;
  });
  return this.refreshPromise;
}
```

---

## 3. Endpoints

### 3.1 Catalog Items API — Search (Product Lookup)

**Purpose:** Retrieve comprehensive Amazon catalog data for product import into PIM.

```yaml
endpoint:
  method: GET
  path: "/catalog/2022-04-01/items"
  description: "Search catalog items by identifiers (ASIN, UPC, EAN) or keywords"

rate_limit:
  requests_per_second: 2
  burst: 2
  scope: "per selling partner app"
  header: "x-amzn-RateLimit-Limit"

headers:
  required:
    x-amz-access-token: "{access_token}"
    Accept: "application/json"

query_parameters:
  required:
    marketplaceIds:
      type: "string"
      description: "Target marketplace (e.g., A1VC38T7YXB528 for JP)"
      max_values: 1
  conditional:
    identifiers:
      type: "string (CSV)"
      description: "Up to 20 product identifiers"
      max_values: 20
      mutually_exclusive_with: "keywords"
    identifiersType:
      type: "string"
      description: "Required when identifiers is used"
      enum: ["ASIN", "EAN", "GTIN", "ISBN", "JAN", "MINSAN", "SKU", "UPC"]
    keywords:
      type: "string (CSV)"
      description: "Search terms, max 20"
      mutually_exclusive_with: "identifiers"
    sellerId:
      type: "string"
      description: "Required when identifiersType is SKU"
  optional:
    includedData:
      type: "string (CSV)"
      description: "Data sets to include in response"
      default: "summaries"
    pageSize:
      type: "integer"
      default: 10
      max: 20
    pageToken:
      type: "string"
      description: "Token for pagination"
```

#### 3.1.1 `includedData` — Current vs Required

| Dataset | Currently Requested | Should Request | PIM Impact |
|---|---|---|---|
| `summaries` | Yes | Yes | itemName, brand, color, size, status, productType |
| `identifiers` | Yes | Yes | UPC, EAN, JAN, ISBN barcodes |
| `images` | Yes | Yes | Product images with variant types (MAIN, PT01-PT08) |
| `productTypes` | Yes | Yes | Amazon product type classification |
| `relationships` | Yes | Yes | Parent-child ASIN links, variation theme axes |
| **`attributes`** | **NO** | **YES** | **Full structured product data — 100+ fields conforming to Product Type Definitions JSON Schema. This is the primary source for description, bullet_point, material, dimensions, weight, condition, pricing, and all other product attributes.** |
| **`classifications`** | **NO** | **YES** | **Browse node hierarchy — maps to PIM categories** |
| **`dimensions`** | **NO** | **YES** | **Item and package measurements (length, width, height, weight) with units** |
| `salesRanks` | No | No (optional) | BSR data — not needed for PIM core |
| `vendorDetails` | No | No | Vendor-only, not applicable to sellers |

**Required `includedData` value:**
```
summaries,attributes,identifiers,images,productTypes,relationships,classifications,dimensions
```

#### 3.1.2 Response Schema (Key Fields)

```typescript
interface CatalogItemsResponse {
  numberOfResults: number;
  pagination?: { nextToken?: string };
  items: Array<{
    asin: string;

    // summaries — basic product info per marketplace
    summaries?: Array<{
      marketplaceId: string;
      brand?: string;
      itemName?: string;
      color?: string;
      size?: string;
      manufacturer?: string;
      modelNumber?: string;
      status?: string[];          // ["Buyable"]
      productType?: string;       // "SPORT_BAT"
      itemClassification?: string; // "BASE_PRODUCT" | "VARIATION_PARENT"
    }>;

    // attributes — FULL structured product data (JSON Schema-conforming)
    // This is the critical missing dataset.
    // Keys are Amazon attribute names, values follow Amazon's wrapped format:
    //   [{ value: "actual_value", marketplace_id: "...", language_tag: "en_US" }]
    attributes?: Record<string, Array<{
      value: unknown;
      marketplace_id?: string;
      language_tag?: string;
      unit?: string;  // for measurement attributes
    }>>;

    // identifiers — barcodes per marketplace
    identifiers?: Array<{
      marketplaceId: string;
      identifiers: Array<{
        identifierType: string;  // "EAN", "UPC", "GTIN"
        identifier: string;
      }>;
    }>;

    // images — product photos with variant info
    images?: Array<{
      marketplaceId: string;
      images: Array<{
        variant: string;  // "MAIN", "PT01", "PT02"...
        link: string;
        height: number;
        width: number;
      }>;
    }>;

    // relationships — parent-child variation tree
    relationships?: Array<{
      marketplaceId: string;
      relationships: Array<{
        childAsins?: string[];
        parentAsins?: string[];
        variationTheme?: {
          attributes: string[];  // ["color", "size"]
          theme: string;         // "SIZE_NAME/COLOR_NAME"
        };
        type: string;  // "VARIATION"
      }>;
    }>;

    // classifications — browse node hierarchy (NEW)
    classifications?: Array<{
      marketplaceId: string;
      classifications: Array<{
        classificationId: string;   // browse node ID
        displayName: string;
        parent?: {
          classificationId: string;
          displayName: string;
        };
      }>;
    }>;

    // dimensions — item and package measurements (NEW)
    dimensions?: Array<{
      marketplaceId: string;
      item?: {
        height?: { value: number; unit: string };
        length?: { value: number; unit: string };
        weight?: { value: number; unit: string };
        width?: { value: number; unit: string };
      };
      package?: {
        height?: { value: number; unit: string };
        length?: { value: number; unit: string };
        weight?: { value: number; unit: string };
        width?: { value: number; unit: string };
      };
    }>;

    // productTypes — classification per marketplace
    productTypes?: Array<{
      marketplaceId: string;
      productType: string;
    }>;
  }>;
}
```

#### 3.1.3 How `attributes` Resolves Missing Data

The `attributes` dataset returns every product attribute Amazon stores, using the same keys as the Product Type Definitions JSON Schema. Examples of data that becomes available:

| Amazon Attribute Key | MappingEngine Path | PIM Field | Previously Available? |
|---|---|---|---|
| `item_name` | `item_name` | `item_name` | Only via `summaries.0.itemName` fallback |
| `product_description` | `product_description` | `description` | **NO** |
| `bullet_point` | `bullet_point` | `bullet_point` | **NO** |
| `brand` | `brand` | `brand` | Only via `summaries.0.brand` fallback |
| `color` | `color` | `color` | Only via `summaries.0.color` fallback |
| `size` | `size` | `size` | Only via `summaries.0.size` fallback |
| `material` | `material` | `material` | **NO** |
| `manufacturer` | `manufacturer` | `manufacturer` | **NO** |
| `model_number` | `model_number` | `model_number` | **NO** |
| `condition_type` | `condition_type` | `condition` | **NO** |
| `country_of_origin` | `country_of_origin` | `country_of_origin` | **NO** |
| `number_of_items` | `number_of_items` | `number_of_items` | **NO** |
| `main_product_image_locator` | `main_product_image_locator` | `main_image` | **NO** (images came from `images` dataset only) |
| `item_package_weight` | `item_package_weight` | `product_weight` | **NO** |
| `item_package_dimensions.*` | `item_package_dimensions.length/width/height` | `product_length/width/height` | **NO** |
| `purchasable_offer.0.our_price...` | `purchasable_offer.0.our_price.0.schedule.0.value_with_tax` | `base_price` | **NO** |
| `externally_assigned_product_identifier` | `externally_assigned_product_identifier` | `gtin` | **NO** |

**Impact:** Adding `attributes` to `includedData` unlocks **all 20+ default mappings** defined in `amazon-default-mappings.ts`, up from only 4 summary fallbacks.

---

### 3.2 Listings Items API — Search (Seller Listing Pull)

**Purpose:** Retrieve the seller's own listings with parent-child relationships and seller-specific attribute values.

```yaml
endpoint:
  method: GET
  path: "/listings/2021-08-01/items/{sellerId}"
  description: "Search seller's listings with filtering and pagination"

rate_limit:
  requests_per_second: 5
  burst: 5

query_parameters:
  required:
    marketplaceIds:
      type: "string"
  optional:
    includedData:
      type: "string (CSV)"
      default: "summaries"
    identifiers:
      type: "string (CSV)"
      max_values: 20
    identifiersType:
      type: "string"
      enum: ["ASIN", "EAN", "FNSKU", "GTIN", "ISBN", "JAN", "MINSAN", "SKU", "UPC"]
    variationParentSku:
      type: "string"
      description: "Filter children by parent SKU — useful for tree resolution"
    createdAfter:
      type: "string (ISO 8601)"
    lastUpdatedAfter:
      type: "string (ISO 8601)"
    withStatus:
      type: "string"
      enum: ["BUYABLE", "DISCOVERABLE"]
    sortBy:
      type: "string"
      enum: ["sku", "createdDate", "lastUpdatedDate"]
    pageSize:
      type: "integer"
      max: 20
    pageToken:
      type: "string"
```

#### 3.2.1 `includedData` — Current vs Required

| Dataset | Currently Requested | Should Request | Impact |
|---|---|---|---|
| `summaries` | Yes | Yes | SKU, ASIN, itemName, status, productType |
| **`attributes`** | **NO** | **YES** | **Seller's submitted attribute values — may differ from catalog. Useful for pricing, fulfillment, and seller-specific fields.** |
| **`relationships`** | **NO** | **YES** | **Parent-child SKU links and variation theme. Critical for building the variation tree from seller data.** |
| `issues` | No | Optional | Validation issues — useful for quality monitoring |
| `offers` | No | Optional | Pricing and condition data |
| `fulfillmentAvailability` | No | Optional | FBA/FBM inventory |
| `productTypes` | No | Yes | Product type per listing |

**Required `includedData` value:**
```
summaries,attributes,relationships,productTypes
```

#### 3.2.2 Relationship Data Structure (from Listings API)

```typescript
interface ListingsItemRelationships {
  relationships?: Array<{
    parentSkus?: string[];     // Parent SKU(s)
    childSkus?: string[];      // Child SKU(s) for parent items
    variationTheme?: {
      attributes: string[];    // ["color_name", "size_name"]
    };
    type: string;              // "VARIATION"
  }>;
}
```

**Key difference from Catalog API:** Listings API returns SKU-based relationships (seller-specific), while Catalog API returns ASIN-based (global). Both are needed:
- **Catalog API relationships:** ASIN-to-ASIN parent-child for cross-referencing
- **Listings API relationships:** SKU-to-SKU for direct PIM product.parent_id linking

---

### 3.3 Listings Items API — Get Single Item

**Purpose:** Fetch detailed data for a specific seller listing (used during submission monitoring and enrichment).

```yaml
endpoint:
  method: GET
  path: "/listings/2021-08-01/items/{sellerId}/{sku}"

rate_limit:
  requests_per_second: 5
  burst: 10

query_parameters:
  required:
    marketplaceIds: "string"
  optional:
    includedData: "string (CSV)"
    issueLocale: "string (default: en_US)"
```

#### 3.3.1 Current vs Required `includedData`

**Current:** `"summaries,attributes,offers,fulfillmentAvailability,images"`
**Required:** `"summaries,attributes,offers,fulfillmentAvailability,images,issues,relationships,productTypes"`

Missing `issues` means submission problems are invisible until explicit issue-checking calls. Missing `relationships` means variation context is lost when fetching individual items.

---

### 3.4 Product Type Definitions API — Get Definition

**Purpose:** Retrieve the JSON Schema for a product type. Already correctly implemented.

```yaml
endpoint:
  method: GET
  path: "/definitions/2020-09-01/productTypes/{productType}"

rate_limit:
  requests_per_second: 5
  burst: 10

query_parameters:
  required:
    marketplaceIds: "string"
  optional:
    sellerId: "string"
    productTypeVersion: "string (default: LATEST)"
    requirements: "string (LISTING | LISTING_PRODUCT_ONLY | LISTING_OFFER_ONLY)"
    requirementsEnforced: "string (ENFORCED | NOT_ENFORCED)"
    locale: "string"

caching:
  strategy: "Cache by checksum field (MD5)"
  ttl: "24 hours (current schema-sync implementation)"
  invalidation: "Re-fetch when checksum changes"
```

**No changes needed** for this endpoint.

---

## 4. Data Models

### 4.1 Enriched NormalizedListing (after fix)

```typescript
interface NormalizedListing {
  sku: string;
  externalId: string;                      // ASIN
  title: string;
  status: string;
  mainImage?: string;
  productType?: string;
  parentExternalId?: string;               // NOW populated from relationships
  parentSku?: string;                      // NEW: from Listings API relationships
  childSkus?: string[];                    // NEW: for parent items
  variationTheme?: string[];               // NOW populated from relationships
  classifications?: Array<{               // NEW: browse node hierarchy
    id: string;
    name: string;
    parentId?: string;
    parentName?: string;
  }>;
  dimensions?: {                           // NEW: item/package measurements
    item?: DimensionSet;
    package?: DimensionSet;
  };
  values: Record<string, unknown>;         // NOW populated with full attributes
  raw: Record<string, unknown>;            // Full API response for MappingEngine
}

interface DimensionSet {
  height?: { value: number; unit: string };
  length?: { value: number; unit: string };
  width?: { value: number; unit: string };
  weight?: { value: number; unit: string };
}
```

### 4.2 Amazon Attribute Value Format

Amazon wraps attribute values in a consistent format:

```typescript
// Standard text attribute
"item_name": [
  { "value": "Professional Baseball Bat", "marketplace_id": "A1VC38T7YXB528", "language_tag": "ja_JP" }
]

// Multi-value attribute (bullet points)
"bullet_point": [
  { "value": "Lightweight carbon fiber construction", "language_tag": "ja_JP" },
  { "value": "Professional grade 34-inch length", "language_tag": "ja_JP" },
  { "value": "Approved for official tournament use", "language_tag": "ja_JP" }
]

// Unit-based attribute
"item_package_weight": [
  { "value": 0.85, "unit": "kilograms" }
]

// No-language attribute (region-specific)
"country_of_origin": [
  { "value": "JP", "marketplace_id": "A1VC38T7YXB528" }
]
```

The existing `resolveAmazonValue()` in `mapping-engine.ts` correctly handles all four formats. No changes needed to the unwrapping logic.

### 4.3 Variation Tree Model

```
┌─────────────────────────────────┐
│  Parent Product (configurable)  │
│  ASIN: B0PARENT123              │
│  SKU: BAT-PARENT                │
│  variationTheme: [color, size]  │
├─────────────────────────────────┤
│  ┌───────────┐  ┌───────────┐  │
│  │ Child 1   │  │ Child 2   │  │
│  │ B0CHILD01 │  │ B0CHILD02 │  │
│  │ BAT-BLK-M │  │ BAT-RED-L │  │
│  │ color:blk │  │ color:red │  │
│  │ size:M    │  │ size:L    │  │
│  └───────────┘  └───────────┘  │
└─────────────────────────────────┘

PIM Mapping:
  products.product_type = "configurable" (parent)
  products.product_type = "simple" (children)
  products.parent_id = parent.id (children)
  products.family_variant_id → family_variant_axes [color_attr, size_attr]
```

---

## 5. Error Handling

### 5.1 SP-API Error Codes

| HTTP Status | Error Code | Retry Strategy | Current Handling | Required Handling |
|---|---|---|---|---|
| **400** | `InvalidInput` | Do not retry — fix request | Throws generic error | Log field-level details, surface to import result |
| **401** | `Unauthorized` | Refresh token, retry once | Throws generic error | Auto-refresh + single retry |
| **403** | `Forbidden` | Do not retry | Throws generic error | Check scope/permissions, surface to user |
| **404** | `NotFound` | Do not retry | Throws generic error | Log and skip item (non-fatal for batch) |
| **429** | `QuotaExceeded` | **Wait for `Retry-After` header** | **Crashes the import** | **Token bucket + exponential backoff** |
| **500** | `InternalFailure` | Retry with backoff (max 3) | Throws generic error | Retry with exponential backoff |
| **503** | `ServiceUnavailable` | Retry with backoff | Throws generic error | Retry with exponential backoff |

### 5.2 Required: Per-Item Error Isolation

During batch import, a single item failure must not abort the entire batch. Current implementation handles this correctly in `listings-import.service.ts` (per-item try-catch), but `batchGetCatalogItems` silently swallows entire chunk failures.

**Fix:** Log chunk failures and retry once before skipping:

```typescript
} catch (err) {
  this.logger.warn(`Catalog batch failed for ${chunk.length} ASINs, retrying: ${err.message}`);
  await delay(1000);
  try {
    // retry once
  } catch {
    this.logger.error(`Catalog batch permanently failed for ASINs: ${chunk.join(',')}`);
  }
}
```

---

## 6. Rate Limiting

### 6.1 Amazon SP-API Rate Limits

| Endpoint | Rate (req/s) | Burst | Max Items/Request |
|---|---|---|---|
| `searchCatalogItems` | 2 | 2 | 20 identifiers |
| `getCatalogItem` | 2 | 2 | 1 |
| `searchListingsItems` | 5 | 5 | 20 per page |
| `getListingsItem` | 5 | 10 | 1 |
| `putListingsItem` | 5 | 10 | 1 |
| `patchListingsItem` | 5 | 5 | 1 |
| `getDefinitionsProductType` | 5 | 10 | 1 |
| `searchDefinitionsProductTypes` | 5 | 10 | N/A |

### 6.2 Throughput Calculation for Import

For a seller with 500 products:

| Phase | API Calls | At Rate Limit | Duration |
|---|---|---|---|
| Listing pull (pages of 20) | 25 pages | 5 req/s | ~5s |
| Catalog enrichment (batches of 20) | 25 batches | 2 req/s | ~13s |
| Schema sync (unique product types, cached) | ~5-10 | 5 req/s | ~2s |
| **Total** | **~55-60 calls** | | **~20s** |

For 1000+ products with current 250ms delay: **4+ minutes** (N+1 child fetches make it worse).
With batched approach: **~40 seconds**.

### 6.3 Required: Token Bucket Rate Limiter

```typescript
interface RateLimiterConfig {
  endpoints: {
    catalog: { tokensPerSecond: 2; burstCapacity: 2 };
    listings: { tokensPerSecond: 5; burstCapacity: 5 };
    definitions: { tokensPerSecond: 5; burstCapacity: 10 };
  };
  backoff: {
    initialDelayMs: 500;
    maxDelayMs: 30_000;
    multiplier: 2;
    jitter: true;  // +/- 20% randomization
  };
  maxRetries: 3;
}
```

The rate limiter should:
1. Classify each SP-API path into an endpoint bucket
2. Consume a token before each request (await if empty)
3. On 429 response, read `x-amzn-RateLimit-Limit` header and adjust bucket fill rate
4. Apply exponential backoff with jitter on retries

---

## 7. Sequence Diagrams

### 7.1 Full Import Flow (with fixes)

```
sequenceDiagram
    participant UI as Client Portal
    participant API as ECH Server
    participant CBS as CatalogBrowseService
    participant AC as AmazonConnector
    participant RL as RateLimiter
    participant SP as Amazon SP-API
    participant LIS as ListingsImportService
    participant ME as MappingEngine
    participant DB as PostgreSQL

    UI->>API: POST /api/pm/channels/{id}/pull-listings
    API->>CBS: pullSellerListings(channelId)

    Note over CBS,SP: Phase 1: Pull Seller Listings (with relationships)

    loop Paginate (pageSize=20)
        CBS->>AC: searchListingsItems({includedData: "summaries,attributes,relationships,productTypes"})
        AC->>RL: acquire("listings")
        RL->>SP: GET /listings/2021-08-01/items/{sellerId}
        SP-->>AC: {items[], nextToken}
        AC-->>CBS: normalized items with parentSku + variationTheme
    end

    Note over CBS,SP: Phase 2: Catalog Enrichment (batched, with full attributes)

    CBS->>AC: batchGetCatalogItems(asins[])
    loop Chunks of 20 ASINs
        AC->>RL: acquire("catalog")
        RL->>SP: GET /catalog/2022-04-01/items?identifiers=...&includedData=summaries,attributes,identifiers,images,productTypes,relationships,classifications,dimensions
        SP-->>AC: {items[] with FULL attributes}
    end
    AC-->>CBS: Map<ASIN, enriched catalog data>

    CBS-->>CBS: Merge listings + catalog data into NormalizedListing[]
    CBS-->>API: {listings, totalCount}

    UI->>API: POST /api/pm/channels/{id}/import-listings
    API->>LIS: importSellerListings(channelId, items[])

    Note over LIS,DB: Phase 3: Map & Import to PIM

    LIS->>LIS: prefetchFamilies, prefetchSchemas, prefetchListings, prefetchProducts
    loop Each item
        LIS->>ME: apply(rawData, mappings)
        ME-->>LIS: {pimValues (NOW 20+ fields), channelValues}
        LIS->>DB: INSERT products (values = full pimValues)
        LIS->>DB: INSERT channel_listings
    end

    Note over LIS,DB: Phase 4: Link Parent-Child Tree

    LIS->>DB: Batch UPDATE products SET parent_id (using ASIN + SKU relationships)
    LIS->>DB: UPDATE parents SET product_type = 'configurable'
    LIS-->>API: {created, linked, skipped, failed, details}
```

### 7.2 Catalog Tree Resolution (batched — fixes N+1)

```
sequenceDiagram
    participant CBS as CatalogBrowseService
    participant AC as AmazonConnector
    participant SP as Amazon SP-API

    CBS->>AC: searchCatalogItems({ASIN, includedData: full})
    AC->>SP: GET /catalog/items?identifiers={ASIN}
    SP-->>AC: item with parentAsin, childAsins[50]

    alt Item is a child
        CBS->>AC: searchCatalogItems({parentAsin})
        AC->>SP: GET /catalog/items?identifiers={parentAsin}
        SP-->>AC: parent with childAsins[50]
    end

    Note over CBS,SP: Batch children (was: 50 individual calls → now: 3 batch calls)

    loop Chunks of 20 child ASINs
        CBS->>AC: searchCatalogItems({identifiers: chunk.join(","), identifiersType: "ASIN"})
        AC->>SP: GET /catalog/items?identifiers=ASIN1,ASIN2,...ASIN20&identifiersType=ASIN
        SP-->>AC: {items[]: up to 20 children}
    end

    CBS-->>CBS: Assemble tree {parent, children[], totalItems}
```

---

## 8. Implementation Changes Required

### 8.1 File-by-File Change Summary

| File | Change | Priority |
|---|---|---|
| `amazon.connector.ts` — `searchCatalogItems()` | Add `attributes,classifications,dimensions` to `includedData` | P1 |
| `amazon.connector.ts` — `batchGetCatalogItems()` | Add `attributes,classifications,dimensions` to `includedData`; add retry on failure | P1 |
| `amazon.connector.ts` — `searchListingsItems()` | Change `includedData` to `summaries,attributes,relationships,productTypes` | P1 |
| `amazon.connector.ts` — `normalizeListingItem()` | Extract `parentExternalId` from relationships data | P1 |
| `amazon.connector.ts` — `getListingsItem()` | Add `issues,relationships,productTypes` to `includedData` | P1 |
| `catalog-browse.service.ts` — `getCatalogTree()` | Replace per-child fetch loop with batched `searchCatalogItems` calls (chunks of 20) | P1 |
| `connector.interface.ts` — `NormalizedListing` | Add optional `parentSku`, `childSkus`, `variationTheme`, `classifications`, `dimensions` fields | P1 |
| `connector.interface.ts` — `CatalogSearchResult` | Add `attributes`, `classifications`, `dimensions` to item type | P1 |
| `amazon-auth.client.ts` | Add promise-based token refresh mutex | P2 |
| `amazon-auth.client.ts` | Add rate limiter integration to `spApiGet/Put/Patch` | P0 |
| `amazon.types.ts` | Remove unused `rateLimitMs` from `ChannelSettings` | P3 |

### 8.2 No Changes Needed

| Component | Reason |
|---|---|
| `mapping-engine.ts` | Already extracts nested paths and unwraps Amazon value format correctly |
| `amazon-default-mappings.ts` | Already defines the correct attribute paths — they just weren't getting data |
| `amazon-payload-builder.ts` | Outbound payload builder, unrelated to import |
| `amazon-schema-validator.ts` | Validation logic is correct |
| `listings-import.service.ts` | Import logic is correct — just receives richer `rawData` now |
| `value-normalizer.ts` | Normalization logic is correct |

---

## 9. Testing Scenarios

### 9.1 Data Completeness Tests

```yaml
test_data_completeness:
  - name: "Full attributes imported for simple product"
    setup: "Search for a known ASIN with rich product data"
    verify:
      - "pimValues contains item_name, brand, product_description, bullet_point"
      - "pimValues contains material, color, size, manufacturer"
      - "pimValues contains base_price, currency"
      - "pimValues contains product_weight, product_length, product_width, product_height"
      - "At least 15 of 20+ default mappings produce non-null values"

  - name: "Classifications extracted"
    setup: "Search for ASIN with browse node hierarchy"
    verify:
      - "NormalizedListing.classifications is non-empty"
      - "Classification has id, name, and parent chain"

  - name: "Dimensions extracted"
    setup: "Search for ASIN with dimensions data"
    verify:
      - "NormalizedListing.dimensions.item contains height/length/width/weight"
      - "Each dimension has numeric value and unit string"
```

### 9.2 Variation Tree Tests

```yaml
test_variation_tree:
  - name: "Parent-child tree resolved via Catalog API"
    setup: "Search for a child ASIN that has a parent"
    verify:
      - "parentExternalId is populated (not undefined)"
      - "variationTheme contains axis attribute names"
      - "getCatalogTree returns parent + all children"

  - name: "Batch children fetch (N+1 fix)"
    setup: "Search for parent with 30 children"
    verify:
      - "Only 2 catalog API calls made (ceil(30/20))"
      - "All 30 children returned"
      - "Total duration < 5 seconds"

  - name: "Parent-child linked in PIM after import"
    setup: "Import a parent + 3 children"
    verify:
      - "Parent product has product_type = 'configurable'"
      - "Children have parent_id pointing to parent product"
      - "Children share family_variant_id with correct axes"
```

### 9.3 Rate Limiting Tests

```yaml
test_rate_limiting:
  - name: "429 response triggers backoff"
    setup: "Mock SP-API to return 429 on 3rd request"
    verify:
      - "Request retried after exponential delay"
      - "x-amzn-RateLimit-Limit header read"
      - "Import eventually succeeds"

  - name: "Bulk import stays within rate limits"
    setup: "Import 200 products"
    verify:
      - "No 429 errors received"
      - "Catalog API calls spaced at >= 500ms"
      - "Listings API calls spaced at >= 200ms"
```

### 9.4 Error Resilience Tests

```yaml
test_error_resilience:
  - name: "Single batch failure doesn't abort import"
    setup: "Mock one catalog batch to fail, others succeed"
    verify:
      - "Failed batch logged as warning"
      - "Retry attempted once"
      - "Other batches processed successfully"
      - "Import result shows partial enrichment"

  - name: "Token refresh race condition"
    setup: "Expire token, trigger 5 concurrent requests"
    verify:
      - "Only 1 token refresh call made"
      - "All 5 requests succeed with refreshed token"
```

---

## 10. Migration Notes

### 10.1 Backward Compatibility

All changes are **additive** — existing data flows continue to work. The additional `includedData` parameters return extra fields that are safely ignored by code that doesn't consume them. The MappingEngine processes whatever is present in `rawData`.

### 10.2 Payload Size Impact

Adding `attributes` to Catalog API responses increases per-item payload from ~2-5 KB to ~10-30 KB depending on product complexity. For a batch of 20 items, this is ~200-600 KB per request — well within HTTP response limits.

### 10.3 Rollout Recommendation

1. **Phase 1 (this PR):** Add `attributes,classifications,dimensions` to `includedData` parameters. Add `relationships` to Listings search. Fix `normalizeListingItem` to extract `parentExternalId`. Batch child fetches in `getCatalogTree`.
2. **Phase 2 (follow-up):** Implement token bucket rate limiter. Add retry logic to batch catalog enrichment. Fix token refresh race condition.
3. **Phase 3 (future):** Subscribe to `LISTINGS_ITEM_STATUS_CHANGE` notifications. Consider Reports API for bulk reads (>1000 products). Add `VALIDATION_PREVIEW` mode for dry-run submissions.
