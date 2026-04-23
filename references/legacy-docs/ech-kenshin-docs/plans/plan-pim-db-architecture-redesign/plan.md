---
title: "PIM Database Architecture Redesign"
description: "Validated architecture: hybrid 2/3-level JSONB, locale-aware channelValues, completeness scoring, locale fallback"
status: validated
priority: P1
effort: 14h
branch: refactor/CR-081-review-refactor-be-architect
tags: [database, pim, architecture, postgresql, drizzle]
created: 2026-04-07
validated: 2026-04-08
---

# PIM Database Architecture Redesign — Validated Plan

## 1. Executive Summary

ECH-Kenshin's PM tower cần cải thiện 4 trụ cột: **value key convention**, **locale support cho channelValues**, **completeness scoring**, và **locale fallback chains**. Sau 2 vòng validation, kiến trúc được đơn giản hóa đáng kể so với plan gốc — giữ nguyên cơ chế mapping + implicit override hiện tại, chỉ nâng cấp cấu trúc dữ liệu.

### Core Principle

```
Product Master (SSOT) ──mapping──→ Channel Listing (per-marketplace)
                                    ↑
                              seller override (implicit: có value = override)
```

---

## 2. Validated Architecture

### 2.1 `products.values` — Hybrid 2/3-Level JSONB

**Rule:** `isScopable = false` → 2-level (attr → locale). `isScopable = true` → 3-level (attr → channel → locale).

```typescript
// Type definition
type ProductValues = Record<string, 
  // Non-scopable: Record<locale, value>
  // Scopable: Record<channelCode | "_", Record<locale, value>>
  Record<string, unknown> | Record<string, Record<string, unknown>>
>;
```

**Example:**
```json
{
  "title":   { "_": "Default Title", "en_US": "English", "ja_JP": "日本語" },
  "weight":  { "_": 1.5 },
  "brand":   { "_": "Nike" },
  "gtin":    { "_": "4901234567890" },

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
  },
  "sale_price": {
    "_":          { "_": null },
    "amazon_us":  { "_": 24.99 }
  }
}
```

**Key conventions:**
- `"_"` = global/default (replaces current `"|"` and `"default"`)
- Locale codes: `en_US`, `ja_JP`, `vi_VN` (underscore format, keep current)
- Channel codes: match `channels.code` (e.g., `amazon_us`, `shopee_sg`)

**Resolution logic:**
```
resolveValue(product, attrCode, channelCode, localeCode, attr.isScopable):
  if isScopable:
    1. values[attr][channel][locale]    → found? return
    2. values[attr][channel]["_"]       → found? return
    3. values[attr]["_"][locale]         → found? return (default scope)
    4. fallback chain for locale
    5. values[attr]["_"]["_"]           → return (global default)
  else:
    1. values[attr][locale]             → found? return
    2. fallback chain for locale
    3. values[attr]["_"]                → return (global default)
```

### 2.2 `channel_listings.channelValues` — Add Locale Dimension

**Before (flat):**
```json
{ "item_name": "Amazon Title", "bullet_point": ["P1", "P2"] }
```

**After (locale-aware):**
```json
{
  "item_name":    { "_": "Default", "en_US": "US Title", "ja_JP": "日本語タイトル" },
  "bullet_point": { "en_US": ["Point 1"], "ja_JP": ["ポイント1"] },
  "fulfillment_channel": { "_": "DEFAULT" },
  "condition_type": { "_": "new_new" }
}
```

**Type:** `Record<string, Record<localeCode | "_", unknown>>`

**Override mechanism (unchanged logic, new structure):**
```
resolveListingField(product, listing, fieldName, locale, mappings):
  1. channelValues[field][locale] ?? channelValues[field]["_"]
     → if found, return (source: "channel_override")
  2. Find mapping where targetAttributePath = field
     → resolveValue(product, mapping.sourceAttributeCode, channel, locale, attr.isScopable)
     → if found, return (source: "mapped")
  3. Return null (source: "missing")
```

### 2.3 New Table: `product_completeness`

**2 types:** `master` (PIM attributes) + `channel` (marketplace fields)

```sql
CREATE TABLE product_completeness (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id VARCHAR(30) NOT NULL,
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  channel_id      UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  locale_code     VARCHAR(10) NOT NULL,
  type            VARCHAR(10) NOT NULL CHECK (type IN ('master', 'channel')),
  required_count  INTEGER NOT NULL,
  filled_count    INTEGER NOT NULL,
  score           INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  missing_attrs   JSONB,  -- string[] of attr codes (master) or field names (channel)
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, channel_id, locale_code, type)
);

CREATE INDEX pc_org_channel_score ON product_completeness (organization_id, channel_id, score);
CREATE INDEX pc_product ON product_completeness (product_id);
```

**Master completeness** per (product, channel, locale):
```
1. required = family_attributes(isRequired) + classification_attributes(isRequired, channel)
2. For each attr:
   - resolveValue(product, attr.code, channel, locale, attr.isScopable)
   - If variant child: check child → then parent (inheritance = filled)
   - If null → MISSING
3. score = filled / total * 100
```

**Channel completeness** per (product, channel, locale):
```
1. required = marketplace_product_types.requiredFields for this listing's product type
2. For each field:
   a. channelValues[field][locale] ?? channelValues[field]["_"]
   b. If empty: find mapping → resolveValue from PM (PM mapped = filled)
   c. If still empty → MISSING
3. score = filled / total * 100
```

**Ready to list?** = `master score >= threshold AND channel score = 100%`

**Refresh:** Async BullMQ job, fired on product save or listing save. SLA <5s.

### 2.4 New Table: `locale_fallback_chains`

```sql
CREATE TABLE locale_fallback_chains (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id VARCHAR(30) NOT NULL,
  channel_id      UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  locale_code     VARCHAR(10) NOT NULL,
  fallback_locale VARCHAR(10) NOT NULL,
  priority        INTEGER NOT NULL DEFAULT 0,
  UNIQUE (channel_id, locale_code, fallback_locale)
);
```

**Example:**
| channel (amazon_jp) | locale | fallback | priority |
|---------------------|--------|----------|----------|
| amazon_jp | ja_JP | en_US | 1 |
| amazon_jp | ja_JP | _ | 2 |
| shopee_sg | en_SG | en_US | 1 |

### 2.5 Tables NOT Added (removed from original plan)

| Originally proposed | Why removed |
|---------------------|------------|
| `product_channel_overrides` | channelValues đã là implicit override |
| `product_localized_values` | Giữ JSONB, không tách bảng |

---

## 3. Code Changes Required

### 3.1 Schema Changes (packages/database)

| File | Change |
|------|--------|
| `products.schema.ts` | Update `ProductValues` type to hybrid 2/3-level |
| `channel-listings.schema.ts` | Update `channelValues` type to `Record<string, Record<string, unknown>>` |
| New: `product-completeness.schema.ts` | New table |
| New: `locale-fallback-chains.schema.ts` | New table |
| `relations.ts` | Add relations for new tables |
| `schemas/pm/index.ts` | Export new schemas |

### 3.2 Service Changes (apps/server)

| File | Change | Criticality |
|------|--------|-------------|
| `listings-crud.service.ts` | `unwrapLocale()` — support `"_"` key, locale-aware resolution | HIGH |
| `listings-form.service.ts` | `getFormFields()` — locale-aware channelValues lookup | HIGH |
| `listings-form.service.ts` | `validateListing()` — locale-aware merged payload | HIGH |
| `listings-form.service.ts` | `saveValues()` — write locale-keyed channelValues | HIGH |
| `mapping-engine.ts` | Accept `locale` param, write to correct locale key instead of `"default"` | HIGH |
| `products-form.service.ts` | `calculateCompleteness()` — replace with async BullMQ dispatch | MEDIUM |
| `products-form.service.ts` | `updateValues()` — write new key format | HIGH |
| `value-normalizer.ts` | Migrate `"|"` → `"_"`, `"|en"` → `"en_US"` | MEDIUM |

### 3.3 New Services

| Service | Purpose |
|---------|---------|
| `completeness.worker.ts` | BullMQ worker: recompute completeness on product/listing save |
| `value-resolver.service.ts` | Centralized resolution logic (hybrid 2/3-level + fallback chain) |

---

## 4. Migration Strategy

### Phase 1: Schema + New Tables (zero downtime)
1. Create `product_completeness` and `locale_fallback_chains` tables
2. Add `values_v2` JSONB column on `products` alongside `values`
3. Add `channel_values_v2` JSONB column on `channel_listings`

### Phase 2: Data Transformation
```sql
-- Transform products.values: "|" → "_", "|en" → "en_US"
-- Non-scopable: { "title": { "|": "v", "|en": "v2" } }
--            → { "title": { "_": "v", "en_US": "v2" } }
-- Scopable: same + add channel keys from existing listing data

-- Transform channelValues: flat → locale-keyed
-- { "item_name": "v" } → { "item_name": { "_": "v" } }
```

### Phase 3: Dual-Write + Switchover
1. App writes to both old and new columns
2. Read from new columns
3. Verify 1 week in staging
4. Rename columns, drop old

### Phase 4: Completeness Worker
1. Deploy BullMQ completeness worker
2. Backfill completeness for all existing products
3. Remove sync `calculateCompleteness()` from products-form.service

---

## 5. Validation Summary

**Validated:** 2026-04-08
**Questions asked:** 8 across 3 rounds

### Round 1 — Architecture Choice
- **Hybrid A+B** → simplified to no new override table

### Round 2 — Scope Simplification
- Override at **marketplace field level** (keep current channelValues pattern)
- JSONB **2-level** for non-scopable, **giữ JSONB** (no separate table)
- Completeness: **2 scores** (master + channel), **async BullMQ**, **PM mapped = filled**
- Variant: **inheritance = filled**
- History: **YAGNI** — not needed now

### Round 3 — Scopable Gap (Critical Finding)
- `isScopable` attributes (price, description, etc.) need **per-channel values at PM level**
- Decision: **Hybrid 2/3-level JSONB** — scopable attrs get channel dimension, non-scopable stay 2-level
- This enables PIM dashboard to show per-channel pricing/descriptions without querying listings

### Architecture Review Findings
| Finding | Status |
|---------|--------|
| isScopable gap with 2-level JSONB | **Fixed** — hybrid 2/3-level |
| MappingEngine not locale-aware | **Flagged** — needs locale param |
| `unwrapLocale()` hardcodes "default" | **Flagged** — needs update |
| `calculateCompleteness()` locale-unaware | **Flagged** — replaced by async worker |
| channelValues flat (no locale) | **Addressed** — add locale dimension |
| Family/variant model | **OK** — no changes needed |
| channel_attribute_mappings | **OK** — no changes needed |
| Classification system | **OK** — no changes needed |

### Remaining Questions (non-blocking)
1. **JSONB size** — benchmark hybrid 2/3-level with realistic data (100 attrs × 5 channels × 5 locales)
2. **RLS on new tables** — separate migration, same pattern as `001-data-integrity.sql`
3. **Bulk import** — MappingEngine locale-aware import needs testing with Amazon SP-API batch data

---

## 6. Critical Files

| File | Relevance |
|------|-----------|
| `packages/database/src/schemas/pm/products.schema.ts` | `values` JSONB type change |
| `packages/database/src/schemas/pm/channel-listings.schema.ts` | `channelValues` locale dimension |
| `packages/database/src/schemas/pm/attributes.schema.ts` | `isScopable` flag drives resolution |
| `apps/server/src/towers/pm/listings/mapping-engine.ts` | Needs locale param |
| `apps/server/src/towers/pm/listings/listings-form.service.ts` | Channel override resolution |
| `apps/server/src/towers/pm/listings/listings-crud.service.ts` | `unwrapLocale()` update |
| `apps/server/src/towers/pm/products/products-form.service.ts` | `calculateCompleteness()` → async |
| `apps/server/src/towers/pm/listings/value-normalizer.ts` | Key migration `"|"` → `"_"` |
| `apps/server/src/towers/pm/gpc-seed/data/general-product-family.json` | Seed data with isScopable flags |
