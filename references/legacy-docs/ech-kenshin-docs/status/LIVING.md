# Project Status — Living Document

> Updated by team when significant changes occur. AI: read this for current project state.
> Last updated: 2026-04-07

## Current Sprint

- Sprint goal: Multi-platform connector extensibility + catalog search
- Key deliverables: RakutenPublicConnector, CatalogResolutionStrategy, unified CatalogSearchItem, platform-aware mapping registries
- Branch: `refactor/CR-081-review-refactor-be-architect`

## Known Issues & Limitations

- ~~Amazon title extraction: title field not correctly parsed from SP-API response~~ (fixed: full `attributes` now requested)
- ~~Parent-child hierarchy: parent products not linking to child variants~~ (fixed: SKU-based relationship parsing from Listings API)
- Schema sync: marketplace product types not syncing attribute mappings correctly
- ~~Amazon listing pull hard-caps at 1000 items~~ (fixed: removed artificial cap, pagination runs to exhaustion)
- `patchListingsItem` may double-wrap attribute values (P2 deferred)

## Don't Touch Zones

> Modules currently being refactored or migrated. Do NOT modify without checking with the owner.

(none currently)

## In-Progress Migrations

- RLS migration: manual `org_id` filtering → PostgreSQL Row-Level Security (separate branch, not started)

## Recently Completed (Last 2 Sprints)

### Connector Multi-Platform Extensibility — 2026-04-06/07
- Branch: `refactor/CR-081-review-refactor-be-architect`
- Spec: `docs/superpowers/specs/2026-04-06-connector-multi-platform-extensibility-design.md`
- Plan: `docs/superpowers/plans/2026-04-06-connector-multi-platform-extensibility.md`

**All 11 tasks implemented + code review fixes applied:**
- Unified `CatalogSearchItem` types (platform-agnostic)
- `ValueUnwrapperRegistry` + `PayloadBuilderRegistry` with Amazon self-registration
- `ConnectorRegistry` moved to `registries/` directory
- `CatalogResolutionStrategy` routes search to RakutenPublicConnector (system singleton) or seller-channel connectors
- `CatalogController` with `GET /sources` and `POST /search` endpoints
- `CatalogBrowseService.catalogSearch` delegates to `CatalogResolutionStrategy`
- Platform-agnostic import prefix (`{platform}_` replaces hardcoded `amz_`)
- `RakutenPublicConnector` with rate-limited `RakutenPublicClient`
- Code review: removed stale type placeholder, static rate limiter, explicit module deps

**Validation:** 456 tests passing, 0 TS errors
- Status: ✅ Complete

### AI Workflow & Guidelines Documentation — 2026-04-06
- Created `docs/onboarding/WORKFLOW.md` (session lifecycle, mode selection, prompt patterns, token budget)
- Created `docs/onboarding/GUIDELINE.md` (golden rules, context management, token optimization, team sync protocol)
- Updated `docs/INDEX.md` with new onboarding references
- Status: Complete

### Amazon SP-API: Variation Tree & Listing Relationship Fix — 2026-04-05
- Branch: `refactor/CR-081-review-refactor-be-architect`
- Plan: `docs/superpowers/plans/2026-04-05-amazon-variation-tree-listing-fix.md`

**Root Cause Fix:**
- `normalizeListingItem` was parsing Catalog API format (`parentAsins[]`) but Listings API returns `parentSku`/`variationChildSkus[]` — relationship data was silently dropped
- Rewrote parser for correct Listings API format; Catalog API fields extracted during enrichment step

**Variation Tree:**
- Added `VariationForest` type with parent-child trees, standalone items, orphan detection
- O(n) in-memory `buildVariationTree` — zero extra API calls
- New `pullAllSellerListingsWithTree` method (additive, backward-compatible)

**Import Optimization:**
- SKU-based parent-child linking (1 DB query) with ASIN fallback (2 queries)
- Removed 1000-item pagination cap

**Validation:** 422 tests passing (9 new), 0 TS errors
- Status: Complete, pending code review

### Amazon SP-API: PIM Data Completeness + Rate Limiting — 2026-04-05
- Branch: `refactor/CR-081-review-refactor-be-architect`
- Spec: `docs/architecture/integration-spec-amazon-pim-import.md`
- Plan: `docs/superpowers/plans/2026-04-04-amazon-pim-data-completeness.md`

**Phase 1 — Data Completeness:**
- Catalog API now requests `attributes,classifications,dimensions` (was missing — MappingEngine gets 20+ fields instead of 4)
- Listings API now requests `relationships,productTypes` — `normalizeListingItem` extracts `parentExternalId` + `variationTheme`
- `getCatalogTree` batches child fetches (N+1 fix: 50 calls -> 3 for 50 children)
- `batchGetCatalogItems` retries once on chunk failure (was silent swallow)

**Phase 2 — Rate Limiting & Auth:**
- Token refresh mutex prevents concurrent refresh races
- Per-endpoint token-bucket rate limiter (catalog: 2/s, listings: 5/s)
- 429 + 5xx auto-retry with exponential backoff (max 3 retries)

**Validation:** 360 tests passing, 0 TS errors
- Status: Complete

### BE Refactor: Code Review + 4-Phase Refactoring — 2026-04-04
- Branch: `refactor/CR-081-review-refactor-be-architect`
- Plan: `docs/superpowers/plans/2026-04-04-server-code-review-refactor.md`

**Phase 1 — Critical Security Fixes:**
- Fixed rate limiting env var bug (THROTTLER_LIMIT)
- Added orgId filtering to listings-form product reads and family variant mutations
- Replaced raw SQL with `inArray()` in provisioning (SQL injection risk)
- Fixed completeness calculation logic bug
- Added Zod validation to 2 unvalidated endpoints (bulkDelete, unassign)

**Phase 2 — Performance:**
- Eliminated N+1 queries in GPC importers (batch-load into Maps)
- Added depth limit to category getTree()
- Batched child-linking UPDATEs in listings import + transaction wrapping

**Phase 3 — Conventions:**
- Injected ConfigService (replaced process.env), used firstOrNull, crypto.randomBytes
- Extracted inferErrorCode, added S3 rollback, added worker idempotency

**Phase 4 — Cleanup:**
- Removed dead code (empty tap(), unused TypedResponse), aligned RFC 9457, filename sanitization

**Validation:** 401 tests passing, 0 TS errors
- Status: ✅ Complete

### BE Refactor: Shared Utilities + Service Decomposition — 2026-04-03
- Branch: `refactor/CR-081-review-refactor-be-architect`
- Plan: `docs/superpowers/plans/2026-04-03-be-refactor-extract-utilities-split-services.md`

**P0 Security Fixes:**
- `auth.middleware.ts` — silent error swallowing → proper 500 response
- `auth.guard.ts` — unsafe type cast → runtime validation of session shape
- `org.guard.ts` — missing membership check → DB query against `members` table

**Phase 1 — Shared Utilities (5 new):**
- `RequestContextFacade` — typed CLS wrapper (`@Global()` module), replaces 100+ raw `cls.get()` calls
- `firstOrNull()` — query helper replacing ~95 `.then((r) => r[0])` occurrences
- `ensureCodeUnique()` — deduplicates code existence checks across 9 services
- `PaginationHelper` — cursor encode/decode/buildCursorMeta
- `replaceRelation()` — delete-then-insert transaction helper
- Location: `apps/server/src/shared-kernel/infrastructure/utils/` and `context/`
- All 23 tower services migrated from `ClsService` → `RequestContextFacade`

**Phase 2 — Service Decomposition (6 splits):**
- `ListingsMarketplaceService` (803→~80 lines) → `CatalogBrowseService` + `ListingsImportService`
- `AmazonConnector` (650→~550 lines) → extracted `AmazonAuthClient`
- `GpcSeedService` (454→~50 lines) → `GlobalTaxonomyImporter` + `FamilyTemplateImporter`
- `SchemaSyncService` → extracted `AutoMappingGenerator`
- `BootstrapService.apply()` → 4 named private methods
- `ProductsFormService.getFamily()` → 3 named private methods

**Validation:** 383 tests passing, 0 TS errors, 0 Biome lint errors
- Status: ✅ Complete


### Extensible Skill System (Phase 1) — 2026-04-03
- Spec: `docs/superpowers/specs/2026-04-03-extensible-skill-system-spec.md`
- Plan: `docs/superpowers/plans/2026-04-03-extensible-skill-system.md`
- Infrastructure: `skills-discover.sh`, `skills-install.sh`, `registry.json`
- Hybrid skills: `create-nestjs-module`, `create-react-page`
- Status: ✅ Complete

### Extensible Skill System (Phase 2) — 2026-04-03
- Spec: `docs/superpowers/specs/2026-04-03-extensible-skill-system-phase2-spec.md`
- Plan: `docs/superpowers/plans/2026-04-03-extensible-skill-system-phase2.md`
- bats-core tests: `docs/superpowers/tests/skills-discover.bats`, `skills-install.bats`
- Hybrid skills: `database-migration` added
- Status: ✅ Complete

- Admin portal: auth, taxonomy management, layout integration — 2026-03-28
- UI package: optimized as reusable headless UI library — 2026-03-25
