# Connector Multi-Platform Extensibility — Architectural Design Spec

**Date:** 2026-04-06
**Branch:** `refactor/CR-081-review-refactor-be-architect`
**Status:** Implemented

---

## 1. Problem Statement

The PIM system's Connectors Module is tightly coupled to Amazon. Key gaps:

1. **No fallback routing** — platforms without public catalog search (Shopee, Lazada, TikTok) have no recovery path
2. **No system-level public search** — catalog search requires seller OAuth, even when public APIs exist
3. **Hardcoded data unwrapping** — `MappingEngine` assumes Amazon's `[{value, language_tag}]` format
4. **Amazon-specific conventions** leak into PM tower services (`amz_` prefixes, ASIN-based traversal)

### API Landscape

| Group | Auth Model | Platforms | Catalog Search |
|---|---|---|---|
| **Group 1: Public Catalog** | Developer App ID only | Rakuten Web Service | Yes (no seller needed) |
| **Group 2: Restricted Catalog** | Seller OAuth mandatory | Amazon SP-API (searchCatalogItems) | Yes (needs seller auth) |
| **Group 3: Seller-Only** | Seller OAuth/License Keys | Amazon SP-API (Listings), Rakuten RMS, Shopee, Lazada, TikTok | No public search |

---

## 2. Decisions from Brainstorming

| Decision | Choice | Rationale |
|---|---|---|
| Rakuten connector split | **Two classes**: `RakutenPublicConnector` (Group 1) + `RakutenConnector` (Group 3 RMS, future) | Different auth models, different data shapes, SRP |
| RakutenPublic ownership | **System-level singleton**, Admin configures, all sellers share | No per-seller registration needed for public API |
| Fallback routing | **CatalogResolutionStrategy** — new layer between service and connectors | Clean separation, testable rules, extensible |
| Fallback UX | **User selects source from dropdown**, default Rakuten. Lightweight metadata (`source` field) in response | User knows data origin, no silent redirect |
| Rakuten scope (MVP) | **Identification-only** — title, price, JAN, category, thumbnail. Architecture first, Rakuten stub initially | Rakuten API lacks structured data (no variations, no HD images, no dimensions) |
| Data mapping | **Hybrid** — connector unwraps for `NormalizedListing.values`, MappingEngine uses platform-aware unwrapper for `.raw` | SRP: connector owns its format, MappingEngine stays generic |
| Amazon catalog auth | **Keep seller OAuth** — 403 returns suggestion, no system-level Amazon | SP-API requires seller OAuth for catalog search, no workaround |
| Auth per platform | **Encapsulated in each connector** — no shared auth abstraction | Auth models too different (OAuth, HMAC, API key) for useful abstraction |
| RakutenRMS | **Deferred** — design interface + stub only, implement after RMS API research | Out of scope for this refactor |

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Create Product Dialog                               │    │
│  │  ┌───────────────────────────────────────────────┐  │    │
│  │  │ QUICK ADD FROM CATALOG                        │  │    │
│  │  │ [Search...] [Rakuten ▾]                       │  │    │
│  │  │              ├─ Rakuten (default, system)      │  │    │
│  │  │              ├─ Amazon JP (seller channel)     │  │    │
│  │  │              └─ Amazon US (seller channel)     │  │    │
│  │  └───────────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────────┬──────────────────────────────────┘
                           │ GET  /catalog/sources
                           │ POST /catalog/search
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    CatalogController (new)                    │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              CatalogResolutionStrategy (new)                  │
│                                                               │
│  resolveAndSearch(request)                                    │
│    source = "rakuten_public" → RakutenPublicConnector         │
│    source = channelId        → ConnectorFactory → connector   │
│    catch 403                 → { suggestFallback }            │
│                                                               │
│  getAvailableSources(orgId)                                   │
│    → system sources (Rakuten Public if configured)            │
│    → seller channels where canSearchCatalog = true            │
└───────────┬──────────────────────────┬──────────────────────┘
            │                          │
            ▼                          ▼
┌───────────────────┐    ┌──────────────────────────┐
│ RakutenPublic     │    │   ConnectorFactory       │
│ Connector         │    │     (existing)            │
│ (system singleton)│    │   → AmazonConnector      │
│ injected via      │    │   → (future connectors)  │
│ DI token          │    │                          │
└───────────────────┘    └──────────────────────────┘
```

---

## 4. RakutenPublicConnector — System-Level Singleton

### File Structure

```
connectors/rakuten-public/
├── rakuten-public.connector.ts        # ICatalogSearchable only
├── rakuten-public.client.ts           # HTTP client + 1 req/s rate limiter
├── rakuten-public.types.ts            # Rakuten API response types
├── rakuten-public.mappings.ts         # Rakuten → CatalogSearchItem mapping
├── rakuten-public-value-unwrapper.ts  # Passthrough (flat values)
└── index.ts
```

### Class Design

```typescript
class RakutenPublicConnector implements IChannelConnector, ICatalogSearchable {
  readonly platform = "rakuten_public";
  readonly capabilities = {
    canSearchCatalog: true,
    canPullListings: false,
    canCheckRestrictions: false,
    canSearchProductTypes: false,
    canSubmitListings: false,
    canSyncInventory: false,
    canPullOrders: false,
    canTrackFulfillment: false,
  };

  constructor(configService: ConfigService)
    // Reads RAKUTEN_APP_ID, RAKUTEN_ACCESS_KEY from env

  validateCredentials(): Promise<boolean>
    // Simple test request to Item Search API

  searchCatalogItems(query: CatalogSearchQuery): Promise<CatalogSearchResult>
    // identifierType "JAN"|"EAN"|"GTIN" → Product Search API
    // identifierType "keyword"          → Item Search API
    // Normalize → CatalogSearchItem format
}
```

### Injection (not registered in ConnectorRegistry)

```typescript
// connectors.module.ts
{
  provide: RAKUTEN_PUBLIC_CONNECTOR,
  useFactory: (config: ConfigService) => {
    const appId = config.get("RAKUTEN_APP_ID");
    if (!appId) return null;  // disabled if not configured
    return new RakutenPublicConnector(config);
  },
  inject: [ConfigService],
}
```

### Rakuten API Details

- **Item Search API**: `GET /IchibaItem/Search/20220601` — keyword search, 30 items/page, 100 pages max
- **Product Search API**: `GET /Product/Search/20250801` — JAN code lookup
- **Rate limit**: 1 req/s per App ID (hard limit, non-negotiable)
- **Data quality**: Title, price, JAN (via Product Search), genre, 128x128 thumbnails. No variations, no dimensions, no brand, no HD images.

---

## 5. CatalogResolutionStrategy

**Location:** `towers/pm/catalog/catalog-resolution.strategy.ts`

### Core Methods

```typescript
@Injectable()
class CatalogResolutionStrategy {
  constructor(
    @Inject(RAKUTEN_PUBLIC_CONNECTOR)
    private readonly rakutenPublic: RakutenPublicConnector | null,
    private readonly connectorFactory: ConnectorFactory,
    private readonly channelsRepo: ChannelsRepository,
  ) {}

  async getAvailableSources(organizationId: string): Promise<CatalogSource[]>
    // 1. System Rakuten (if configured) → { id: "rakuten_public", isDefault: true }
    // 2. Seller channels where canSearchCatalog = true

  async search(request: CatalogSearchRequest): Promise<CatalogSearchResponse>
    // Route 1: source = "rakuten_public" → RakutenPublicConnector
    // Route 2: source = channelId → ConnectorFactory → connector
    // Route 3: catch 403 → { error, suggestFallback: "rakuten_public" }
}
```

### Types

```typescript
interface CatalogSource {
  id: string;              // "rakuten_public" | channelId
  label: string;
  platform: string;
  icon: string;            // "rakuten" | "amazon" → FE maps to icon asset
  isDefault: boolean;
  isSystemLevel: boolean;
}

interface CatalogSearchRequest {
  source: string;
  query: CatalogSearchQuery;
  organizationId: string;
}

interface CatalogSearchResponse {
  source: string;
  platform: string;
  totalCount: number;
  items: CatalogSearchItem[];
  error?: string;
  message?: string;
  suggestFallback?: string | null;
}
```

### Dropdown Behavior Per Scenario

| Seller State | Dropdown Options |
|---|---|
| No channels | `[Rakuten]` (default, system) |
| Has Amazon JP | `[Rakuten]` (default) + `[Amazon JP]` |
| Has Amazon JP + US | `[Rakuten]` + `[Amazon JP]` + `[Amazon US]` |
| Has Shopee VN (no catalog) | `[Rakuten]` only (Shopee filtered out) |
| Has Rakuten RMS (no catalog) | `[Rakuten]` only (RMS filtered out) |
| Admin hasn't configured Rakuten | Seller channels only (no default) |

---

## 6. Unified CatalogSearchItem Format

All connectors MUST return this format. FE renders one component, zero platform branching.

```typescript
interface CatalogSearchItem {
  title: string;
  identifiers: ProductIdentifiers;
  externalUrl?: string;
  images: CatalogImage[];
  classifications: Classification[];
  variation: VariationInfo;
  attributes: Record<string, unknown>;
}

interface ProductIdentifiers {
  asin?: string;
  jan?: string;
  ean?: string;
  upc?: string;
  gtin?: string;
  platformItemCode?: string;
}

interface CatalogImage {
  link: string;
  width?: number;
  height?: number;
  variant?: string;   // "small" | "medium" | "large"
}

interface Classification {
  id: string;
  name: string;
  parentId?: string;
  parentName?: string;
}

interface VariationInfo {
  type: "parent" | "child" | "standalone";
  parentIdentifier?: string;
  childIdentifiers?: string[];
  theme?: string[];
  children?: CatalogSearchItem[];
}
```

### Contract Rule

> Connector MUST normalize to `CatalogSearchItem`. Missing data = `undefined` or `[]`. FE never receives raw platform data.

### Per-Platform Output

**Amazon** returns rich data: full variation tree, HD images, brand, dimensions, multiple identifiers.

**Rakuten Public** returns minimal data: title, price, JAN (via Product Search), 128x128 thumbnails, genre. `variation.type` always `"standalone"`.

---

## 7. Hybrid Data Mapping — ValueUnwrapperRegistry + PayloadBuilderRegistry

### Problem

Two data directions, both platform-specific:

```
IMPORT: Platform raw  →  unwrap  →  PIM values
EXPORT: PIM values    →  wrap    →  Platform payload
```

### Solution: Separate registries, same organizational pattern

#### ValueUnwrapperRegistry (Import)

```typescript
type UnwrapFn = (rawValue: unknown, attributeKey: string) => unknown;

registerUnwrapper("amazon", (rawValue, _key) => {
  // [{value: "Widget", language_tag: "en_US"}] → "Widget"
  if (Array.isArray(rawValue) && rawValue[0]?.value !== undefined) {
    return rawValue.length === 1 ? rawValue[0].value : rawValue.map(v => v.value);
  }
  return rawValue;
});

registerUnwrapper("rakuten_public", (rawValue, _key) => rawValue);  // passthrough
```

#### PayloadBuilderRegistry (Export)

```typescript
interface IPayloadBuilder {
  buildListingPayload(
    productType: string,
    pimValues: Record<string, unknown>,
    channelContext: ChannelContext,
  ): BuildResult;

  buildPatchPayload(
    productType: string,
    updates: Record<string, unknown>,
    channelContext: ChannelContext,
  ): PatchResult;
}

registerPayloadBuilder("amazon", AmazonPayloadBuilder);  // existing, just register
// future: registerPayloadBuilder("rakuten", RakutenPayloadBuilder);
```

#### MappingEngine Change (minimal)

```typescript
class MappingEngine {
  static apply(
    rawData: Record<string, unknown>,
    mappings: AttributeMapping[],
    platform?: string,              // NEW param, optional, default "amazon"
  ): MappingResult
}
```

### Hybrid Responsibility

| Data | Who unwraps | When |
|---|---|---|
| `NormalizedListing.values` | Connector | During pull/search (clean values for display) |
| `NormalizedListing.raw` | MappingEngine via UnwrapperRegistry | During import (raw → pimValues mapping) |

---

## 8. API Contract

### New Endpoints

```
GET  /catalog/sources       → CatalogSource[]
POST /catalog/search        → CatalogSearchResponse
```

### POST /catalog/search

```typescript
// Request
{
  source: "rakuten_public" | "<channelId>",
  identifierType: "keyword" | "JAN" | "EAN" | "ASIN" | "GTIN" | "UPC",
  identifier: "matcha powder"
}

// Success
{
  source: "rakuten_public",
  platform: "rakuten_public",
  totalCount: 30,
  items: [{ ...CatalogSearchItem }]
}

// Auth error (Amazon 403)
{
  source: "ch_abc123",
  platform: "amazon",
  totalCount: 0,
  items: [],
  error: "catalog_auth_required",
  message: "Seller account lacks catalog access",
  suggestFallback: "rakuten_public"
}
```

### Identifier Type Support Per Platform

| | keyword | JAN/EAN/GTIN | ASIN | UPC |
|---|---|---|---|---|
| rakuten_public | Item Search API | Product Search API | N/A (empty results) | N/A |
| amazon | SP-API keyword | SP-API identifiers | SP-API identifiers | SP-API identifiers |

Unsupported identifier type → return empty results (not error).

### Backward Compatibility

Old endpoint kept as thin wrapper during migration:

```
GET /channels/:channelId/catalog/search
  → internally: CatalogResolutionStrategy.search({ source: channelId })
```

---

## 9. File Structure & Changes

```
shared-kernel/infrastructure/connectors/
├── capabilities/
│   ├── catalog.capability.ts           # MODIFY — CatalogSearchResult uses CatalogSearchItem
│   └── ... (others unchanged)
├── registries/
│   ├── connector.registry.ts           # MOVE from root
│   ├── value-unwrapper.registry.ts     # NEW
│   └── payload-builder.registry.ts     # NEW
├── amazon/
│   ├── amazon.connector.ts             # MODIFY — return CatalogSearchItem format
│   ├── amazon-auth.client.ts           # unchanged
│   ├── amazon-value-unwrapper.ts       # NEW (extract from MappingEngine)
│   ├── amazon-payload-builder.ts       # MODIFY — register into PayloadBuilderRegistry
│   ├── amazon-schema-validator.ts      # unchanged
│   ├── amazon-default-mappings.ts      # unchanged
│   └── amazon.types.ts                 # unchanged
├── rakuten-public/
│   ├── rakuten-public.connector.ts     # NEW
│   ├── rakuten-public.client.ts        # NEW
│   ├── rakuten-public.types.ts         # NEW
│   ├── rakuten-public.mappings.ts      # NEW
│   ├── rakuten-public-value-unwrapper.ts  # NEW
│   └── index.ts
├── connector.interface.ts              # MODIFY — add new types
├── connector.factory.ts                # unchanged
├── connectors.module.ts                # MODIFY — add RakutenPublic provider
└── index.ts

towers/pm/
├── catalog/
│   ├── catalog.controller.ts           # NEW — GET /sources, POST /search endpoints
│   ├── catalog.module.ts               # NEW — imports ConnectorsModule, provides strategy
│   ├── catalog-resolution.strategy.ts  # NEW — routing logic lives here (not in listings/)
│   └── catalog-resolution.types.ts     # NEW — CatalogSource, Request, Response types
├── listings/
│   ├── catalog-browse.service.ts       # MODIFY — delegate to CatalogResolutionStrategy
│   ├── mapping-engine.ts              # MODIFY — add platform param
│   └── listings-import.service.ts      # MODIFY — platform-agnostic family naming
```

### Change Summary

| Type | Count |
|---|---|
| NEW files | 11 |
| MODIFY files | 6 |
| MOVE files | 1 |
| UNCHANGED | ~15 |

---

## 10. Migration Strategy

### Phase 1: Non-breaking additions

Add registries, RakutenPublicConnector, CatalogResolutionStrategy, new endpoints. Zero impact on existing flows.

### Phase 2: Wire up

- `CatalogBrowseService.catalogSearch()` delegates to `CatalogResolutionStrategy`
- `MappingEngine.apply()` gains optional `platform` param (default `"amazon"`)
- `ListingsImportService` family naming: `amz_{type}` → `{platform}_{type}`

### Phase 3: Deprecate

Old `GET /channels/:id/catalog/search` → deprecated, FE migrates to new endpoints, remove after full migration.

---

## 11. Out of Scope (Deferred)

| Item | Reason |
|---|---|
| RakutenRMS (seller connector) | Needs RMS API research first |
| Shopee/Lazada/TikTok connectors | No immediate need, architecture supports adding later |
| Amazon PA-API (public search) | Rakuten Public covers the fallback need |
| Rakuten itemCaption HTML parsing | Unreliable, low ROI |
| Genre tree full sync | 1 req/s rate limit makes bulk traversal impractical for MVP |

---

## 12. Rakuten Web Service API Reference

### Item Search API

- **Endpoint**: `GET https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20220601`
- **Auth**: `applicationId` + `accessKey` (query params)
- **Rate limit**: 1 req/s (hard, non-negotiable)
- **Pagination**: 30 items/page, 100 pages max (3,000 items total)
- **Key response fields**: `itemName`, `itemCode`, `itemPrice`, `itemCaption`, `mediumImageUrls[]`, `genreId`, `shopName`, `shopCode`
- **Limitations**: No JAN code, no variations, no brand, no dimensions, 128x128 images only

### Product Search API

- **Endpoint**: `GET https://openapi.rakuten.co.jp/ichibaproduct/api/Product/Search/20250801`
- **Auth**: Same `applicationId` + `accessKey`
- **Key param**: `productCode` (accepts JAN codes)
- **Key response fields**: `productId`, `productCode` (JAN), `productName`, `makerName`, `genreId`, `minPrice`, `maxPrice`
- **Limitations**: No images, no detailed attributes
