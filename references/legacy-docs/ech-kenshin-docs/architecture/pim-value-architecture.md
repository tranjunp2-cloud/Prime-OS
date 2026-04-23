# PIM Value Architecture — Hybrid 2/3-Level JSONB

> Reference: [Plan](../../docs/plans/plan-pim-db-architecture-redesign/plan.md)

## Overview

ECH-Kenshin uses a **hybrid 2/3-level JSONB** model for storing product attribute values. The depth of nesting depends on the attribute's `isScopable` flag.

```
Non-scopable (2-level): products.values[attrCode][locale]
Scopable (3-level):     products.values[attrCode][channelCode][locale]
```

## Key Conventions

| Key | Meaning |
|-----|---------|
| `"_"` | Global/default (no locale, no channel) |
| `"en_US"`, `"ja_JP"` | Locale codes (underscore format) |
| `"amazon_us"`, `"shopee_sg"` | Channel codes (match `channels.code`) |

**Legacy keys** (deprecated, migrated on import):
- `"|"` → `"_"` (global)
- `"|en"` → `"en_US"` (locale)
- `"default"` → `"_"` (from Amazon import)

## Products.values Examples

```json
{
  "title":   { "_": "Default Title", "en_US": "English", "ja_JP": "日本語" },
  "weight":  { "_": 1.5 },
  "brand":   { "_": "Nike" },

  "price": {
    "_":          { "_": 29.99 },
    "amazon_us":  { "_": 29.99 },
    "amazon_jp":  { "_": 3500 },
    "shopee_sg":  { "_": 39.99 }
  },
  "description": {
    "_":          { "en_US": "Default desc", "ja_JP": "デフォルト説明" },
    "amazon_us":  { "en_US": "Amazon US optimized desc" },
    "amazon_jp":  { "ja_JP": "Amazon JP専用の説明" }
  }
}
```

## Value Resolution

### Non-scopable Attributes

```
resolveValue(attrCode, locale, fallbackLocales):
  1. values[attr][locale]       → exact locale match
  2. values[attr][fallback]     → fallback chain
  3. values[attr]["_"]          → global default
```

### Scopable Attributes

```
resolveValue(attrCode, channel, locale, fallbackLocales):
  1. values[attr][channel][locale]  → channel + exact locale
  2. values[attr][channel]["_"]     → channel + global
  3. values[attr]["_"][locale]      → default scope + exact locale
  4. values[attr]["_"][fallback]    → default scope + fallback
  5. values[attr]["_"]["_"]         → global default
```

### Variant Inheritance

For child products with `parentId`:
```
resolveVariant(child, parent, attrCode, ...):
  result = resolve(child.values, ...)
  if missing AND parentId → resolve(parent.values, ...)
```

## Channel Listings — Locale-Keyed channelValues

`channel_listings.channelValues` stores marketplace-specific field values with locale dimension:

```json
{
  "item_name":    { "_": "Default", "en_US": "US Title", "ja_JP": "日本語タイトル" },
  "bullet_point": { "en_US": ["Point 1"], "ja_JP": ["ポイント1"] },
  "fulfillment_channel": { "_": "DEFAULT" }
}
```

### Override Mechanism (Implicit)

```
resolveListingField(field, locale):
  1. channelValues[field][locale]           → exact locale override
  2. channelValues[field]["_"]              → global override
  3. mapping: find target=field → resolve PM attribute → channel override via mapping
  4. missing
```

If channelValues has a value for a field → it's an override.
If empty → mapping engine pulls from PM `products.values`.

## Completeness Scoring

Two types stored in `product_completeness` table:

### Master Completeness
- Checks PIM attributes required by `family_attributes` + `classification_attributes`
- Uses hybrid value resolution (non-scopable + scopable)
- Variant inheritance counts as "filled"

### Channel Completeness
- Checks marketplace fields from `marketplace_product_types.requiredFields`
- Resolution: channelValues → mapping → PM value (PM mapped = filled)
- A product is **ready to list** when: `master >= threshold AND channel = 100%`

### Refresh Strategy
- **Async via BullMQ** (`pm-completeness` queue)
- Triggered on: product save, listing save
- SLA: <5 seconds
- Scores cached in `product_completeness(product_id, channel_id, locale_code, type)`

## Locale Fallback Chains

Configurable per channel in `locale_fallback_chains` table:

| channel | locale | fallback | priority |
|---------|--------|----------|----------|
| amazon_jp | ja_JP | en_US | 1 |
| amazon_jp | ja_JP | _ | 2 |
| shopee_sg | en_SG | en_US | 1 |

## Data Flow

```
Amazon Import → MappingEngine.apply(rawData, mappings, platform, locale)
  ├── mapped fields → products.values (PIM attrs, locale-keyed)
  └── unmapped fields → channelValues (marketplace fields, locale-keyed)

Product Save → BullMQ: pm-completeness job
  → Compute master + channel completeness
  → Upsert product_completeness rows

Listing Export → For each required marketplace field:
  1. channelValues[field][locale] (seller override)
  2. mapping engine: PM attr → marketplace field (auto-fill)
```

## Related Files

| File | Purpose |
|------|---------|
| `packages/database/src/schemas/pm/products.schema.ts` | ProductValues type |
| `packages/database/src/schemas/pm/channel-listings.schema.ts` | channelValues type |
| `packages/database/src/schemas/pm/product-completeness.schema.ts` | Completeness table |
| `packages/database/src/schemas/pm/locale-fallback-chains.schema.ts` | Fallback table |
| `apps/server/src/towers/pm/shared/value-resolver.service.ts` | Resolution logic |
| `apps/server/src/towers/pm/completeness/completeness.worker.ts` | BullMQ worker |
| `apps/server/src/towers/pm/listings/mapping-engine.ts` | Import mapping |
| `apps/server/src/towers/pm/listings/value-normalizer.ts` | Key normalization |
| `apps/server/src/towers/pm/listings/listings-crud.service.ts` | `unwrapLocale()` |
