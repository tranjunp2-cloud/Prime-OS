# Product Creation Flow — From Catalog Import

## Overview

The "New Product" modal allows users to create a PIM product in two ways:

1. **Manual** — User enters SKU, selects classification, clicks Create
2. **From Catalog** — User searches a marketplace catalog (Amazon, Rakuten, etc.), selects an item, and the product is created with data pre-filled from the marketplace

Both flows go through the same `ProductCreateModal` component.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     ProductCreateModal (FE)                     │
│                                                                 │
│  ┌──────────────┐  ┌────────────────────────────────────────┐   │
│  │  Form Fields  │  │      CatalogSearchInline               │   │
│  │  - SKU        │  │  source selector + identifier input    │   │
│  │  - Class.     │  │  debounced search → result cards       │   │
│  │  - Variation  │  │  VariationGroupCard (expand children)  │   │
│  └──────────────┘  └────────────────────────────────────────┘   │
│                                                                 │
│  [Create] ─→ Step 1: POST /products                            │
│              Step 2: POST /products/:id/enrich (if catalog)     │
└─────────────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
┌─────────────────┐      ┌──────────────────────────────┐
│ ProductsService │      │  CatalogResolutionStrategy   │
│ (create + enrich│      │  (search + cache + slim map) │
└─────────────────┘      └──────────────────────────────┘
                                    │
                         ┌──────────┴───────────┐
                         ▼                      ▼
                  ┌─────────────┐      ┌──────────────────┐
                  │   Rakuten   │      │ Amazon Connector  │
                  │   Public    │      │ (per seller ch.)  │
                  └─────────────┘      └──────────────────┘
```

---

## Step-by-step Flow

### 1. User Opens Modal

- `ProductCreateModal` renders with form fields: Classification (required), SKU (required), Variation checkbox
- `CatalogSearchInline` is rendered below the form for optional catalog search

### 2. Catalog Search (optional)

**FE Components:**

| Component | File | Role |
|-----------|------|------|
| `CatalogSearchInline` | `src/components/product/catalog-search-inline.tsx` | Source selector, identifier input, debounced search, result cards |
| `VariationGroupCard` | `src/components/product/variation-group-card.tsx` | Collapsible parent with lazy-loaded children |

**FE Hooks:**

| Hook | File | Purpose |
|------|------|---------|
| `useCatalogSearch` | `src/hooks/api/use-catalog.ts` | Fires `POST /catalog/search` |
| `useCatalogExpand` | `src/hooks/api/use-catalog.ts` | Same endpoint with `expandTree` param for children |
| `useCatalogSources` | `src/hooks/api/use-catalog.ts` | Loads available catalog sources |

**Search Flow:**

```
User types identifier
  → 500ms debounce
  → POST /catalog/search { source, identifierType, identifier }
  → BE: CatalogResolutionStrategy.search()
       → routes to correct connector (Rakuten Public / Amazon / etc.)
       → connector fetches FULL data from marketplace API
       → CatalogCacheService.setMany() — caches full items (15min TTL)
       → mapToSlim() — strips to essential UI fields (~96% payload reduction)
  → FE receives CatalogItemSlim[] → renders result cards
```

**Identifier Auto-detection:**

| Pattern | Detected Type |
|---------|--------------|
| Starts with `B0` | ASIN |
| 8-14 digits | GTIN / EAN / JAN / UPC |
| Other | KEYWORD |

**When user selects an item:**

```typescript
// CatalogSearchInline calls:
onSelect(item: CatalogItem, sourceId: string)

// ProductCreateModal stores:
selectedItem = item        // CatalogItem with externalId, title, thumbnail, etc.
selectedSourceId = sourceId // channel UUID or "rakuten_public"
sku = item.externalId      // auto-filled if SKU is empty
```

### 3. User Clicks "Create"

**Validation:**

```typescript
{
  sku: required, non-empty
  classificationId (familyId state): required
}
```

**Step 1 — Create Product:**

```
FE: useCreateProduct.mutateAsync({
  sku: "B0GR1493ZV",
  classificationId: "uuid-of-classification",
  productType: "simple" | "configurable"   // based on variation checkbox
})

BE: POST /products
  → ProductsCrudService.create()
  → SKU uniqueness check
  → Classification access check
  → Family derivation from classification
  → INSERT products + productClassifications
  → Returns { id, sku, ... }
```

**Step 2 — Enrich from Catalog (if item was selected):**

```
FE: useEnrichProduct.mutateAsync({
  id: productId,
  data: {
    source: "00e6b87a-...",    // or "rakuten_public"
    externalId: "B0GR1493ZV",
    sku: "B0GR1493ZV"
    // NOTE: No channelValues sent — BE reads from CatalogCache
  }
})

BE: POST /products/:id/enrich
  → ProductsService.enrichProduct()
  → CatalogCacheService.get(orgId, source, externalId)
       HIT → use cached full marketplace data
       MISS → proceed with empty channelValues (no enrichment)
  → Resolve channel (if source is UUID, not "rakuten_public")
  → MappingEngine.apply() transforms marketplace data → PIM attributes
  → normalizePimValues() ensures { attrCode: { scope: value } } structure
  → Selective merge (fill-empty strategy):
       - Empty attribute → fill completely
       - Existing attribute → only fill missing scope/locale keys
  → Transaction:
       - UPDATE products.values with merged values
       - INSERT channelListings (only if real channel resolved)
  → Returns { productId, enriched[], skipped[], listingId }
```

**Step 3 — Navigate:**

```
toast.success("Product created")
navigate(`/products/${productId}`)
```

---

## CatalogCache — Avoiding Double Fetch

The key optimization: marketplace data is fetched once during catalog search and reused during product enrichment.

```
                    Search                          Import/Enrich
                    ──────                          ─────────────
Marketplace API ──→ Full data ──→ CatalogCache ──→ Full data (from cache)
                         │                              │
                         ▼                              ▼
                    mapToSlim()                   MappingEngine.apply()
                         │                              │
                         ▼                              ▼
                    FE UI render                  PIM product.values
```

**Cache details:**

| Property | Value |
|----------|-------|
| Storage | In-memory `Map<string, CacheEntry>` |
| Key format | `{orgId}:{source}:{externalId}` |
| TTL | 15 minutes |
| Max entries | 2,000 |
| Eviction | Expired entries pruned on set() when full |

**File:** `apps/server/src/towers/pm/catalog/catalog-cache.service.ts`

---

## Enrich DTO Schema

```typescript
// apps/server/src/towers/pm/products/dto/product.dto.ts
enrichProductSchema = z.object({
  source:       z.string().min(1).optional(),      // catalog source: channelId or "rakuten_public"
  channelId:    z.string().uuid().optional(),       // explicit channel for listing creation
  externalId:   z.string().min(1),                  // marketplace item ID (ASIN, etc.)
  sku:          z.string().min(1),                  // product SKU
  values:       z.record(...).optional().default({}), // PIM values (empty = auto-map from cache)
  channelValues: z.record(...).optional(),          // raw channel data (empty = read from cache)
}).refine(d => d.channelId || d.source)             // at least one required
```

**Backward compatible:** Existing callers sending `channelId` continue to work. New catalog import flow sends `source` instead.

---

## Enrichment Merge Strategy

The `enrichProduct` method uses a **fill-empty** strategy — it never overwrites existing data:

```
Current product values:     { color: { default: "red" } }
Incoming from marketplace:  { color: { default: "blue", en_US: "blue" }, brand: { default: "Apple" } }
                                       ↑ skip (exists)   ↑ fill (new)    ↑ fill (new attribute)

Result:                     { color: { default: "red", en_US: "blue" }, brand: { default: "Apple" } }
```

**Tracking:**
- `enriched[]` — attribute paths that were filled
- `skipped[]` — paths not filled because value already existed

---

## Source Resolution

When `source` is provided in the enrich call:

| Source value | Channel resolved? | Listing created? | Platform detection |
|-------------|-------------------|------------------|--------------------|
| UUID matching a channel | Yes | Yes (channelListings INSERT) | From channel.platform |
| `"rakuten_public"` | No | No (skip) | Defaults to "amazon" fallback |

---

## File Reference

### Frontend

| File | Purpose |
|------|---------|
| `src/components/product/product-create-modal.tsx` | Modal UI, form state, create + enrich orchestration |
| `src/components/product/catalog-search-inline.tsx` | Catalog search sub-component with debounce |
| `src/components/product/variation-group-card.tsx` | Collapsible parent/child variation display |
| `src/hooks/api/use-products.ts` | `useCreateProduct`, `useEnrichProduct` hooks |
| `src/hooks/api/use-catalog.ts` | `useCatalogSearch`, `useCatalogExpand`, `useCatalogSources` hooks |
| `src/hooks/use-variation-tree.ts` | Groups search results into parent/child/standalone |
| `src/lib/api/services/products.ts` | HTTP calls: `create`, `enrichProduct` |
| `src/lib/api/services/catalog.ts` | HTTP call: `search` (unified catalog endpoint) |
| `src/lib/api/types/catalog-types.ts` | `CatalogItem`, `VariationInfo`, `IncludeDataGroup` types |

### Backend

| File | Purpose |
|------|---------|
| `towers/pm/products/products.controller.ts` | `POST /products`, `POST /products/:id/enrich` |
| `towers/pm/products/products.service.ts` | `create()`, `enrichProduct()` with cache + mapping |
| `towers/pm/products/products-crud.service.ts` | SKU check, classification verify, DB insert |
| `towers/pm/products/dto/product.dto.ts` | `createProductSchema`, `enrichProductSchema` |
| `towers/pm/catalog/catalog.controller.ts` | `POST /catalog/search` |
| `towers/pm/catalog/catalog-resolution.strategy.ts` | Routes to connectors, caches results, maps to slim |
| `towers/pm/catalog/catalog-cache.service.ts` | In-memory cache for full marketplace data |
| `shared-kernel/infrastructure/connectors/capabilities/catalog.capability.ts` | `mapToSlim()`, `CatalogItemSlim`, `IncludeDataGroup` |
| `towers/pm/listings/mapping-engine.ts` | Transforms marketplace fields → PIM attributes |
| `towers/pm/listings/value-normalizer.ts` | Normalizes values to `{ attrCode: { scope: value } }` |

---

## Error Handling

| Scenario | FE behavior | BE behavior |
|----------|-------------|-------------|
| SKU already exists | Shows inline error "This SKU already exists" | `ConflictException` (409) |
| Classification missing | Shows inline error "Classification is required" | `BadRequestException` (400) |
| Enrich fails | Silent catch — product still created | Logs error, returns partial result |
| Cache miss on enrich | No enrichment applied | Proceeds with empty `channelValues` |
| Catalog search fails | Shows error message in search area | Returns error in response |
| Channel auth error (403) | Shows fallback suggestion | Returns `{ error: "catalog_auth_required", suggestFallback: "rakuten_public" }` |

---

## Sequence Diagram

```
User          Modal(FE)         CatalogSearch(FE)       BE /catalog/search       BE /products
 │               │                    │                        │                      │
 │──open modal──▶│                    │                        │                      │
 │               │                    │                        │                      │
 │               │  type "B0GR14..."  │                        │                      │
 │               │───────────────────▶│                        │                      │
 │               │                    │──500ms debounce───────▶│                      │
 │               │                    │                        │──fetch from SP-API──▶│
 │               │                    │                        │◀──full items─────────│
 │               │                    │                        │──cache.setMany()     │
 │               │                    │                        │──mapToSlim()         │
 │               │                    │◀──slim items───────────│                      │
 │               │◀──render cards─────│                        │                      │
 │               │                    │                        │                      │
 │──click Select─▶──store item+src───│                        │                      │
 │──click Create─▶│                   │                        │                      │
 │               │─────────────────POST /products─────────────────────────────────────▶│
 │               │◀────────────────{ id: "prod-123" }─────────────────────────────────│
 │               │─────────────────POST /products/prod-123/enrich─────────────────────▶│
 │               │                                                    cache.get()──────│
 │               │                                                    MappingEngine────│
 │               │                                                    merge values─────│
 │               │                                                    create listing───│
 │               │◀────────────────{ enriched, skipped, listingId }───────────────────│
 │               │                    │                        │                      │
 │◀──navigate───│                    │                        │                      │
 │  /products/prod-123               │                        │                      │
```
