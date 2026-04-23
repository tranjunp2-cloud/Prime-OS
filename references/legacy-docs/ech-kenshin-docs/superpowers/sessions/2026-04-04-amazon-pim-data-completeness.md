## Session: 2026-04-04 — Amazon PIM Data Completeness

**Goal:** Fix the Amazon SP-API integration so PIM imports extract full product attributes, parent-child variation trees, and add rate limiting + retry resilience.
**Branch:** `refactor/CR-081-review-refactor-be-architect`
**Commits:** 8 (`a2aad20..f5d920b`)

**What was done:**
- Code review of entire Amazon connector (15 findings: 2 P0, 5 P1, 4 P2, 4 P3)
- Researched Amazon SP-API docs + Postman collection to identify optimal `includedData` params
- Wrote integration specification (`docs/architecture/integration-spec-amazon-pim-import.md`)
- Phase 1 — Data completeness (7 commits):
  - Expanded Catalog API `includedData` from 5 to 8 data types (added `attributes`, `classifications`, `dimensions`)
  - Expanded Listings API `searchListingsItems` from `summaries` only to `summaries,attributes,relationships,productTypes`
  - Fixed `normalizeListingItem` to extract `parentExternalId` and `variationTheme` from relationships (was hardcoded `undefined`)
  - Batched child-ASIN fetches in `getCatalogTree` — chunks of 20 (was N+1, 50 calls -> 3)
  - Added single retry to `batchGetCatalogItems` on chunk failure (was silent swallow)
  - Removed dead `rateLimitMs` field from `ChannelSettings`
- Phase 2 — Rate limiting + auth resilience:
  - Added promise-based mutex to `refreshAuth()` (prevents concurrent token refresh races)
  - Added per-endpoint token-bucket rate limiter (catalog: 2/s, listings: 5/s, definitions: 5/s)
  - Unified `spApiGet/Put/Patch` into single `spApiRequest` with 429 + 5xx retry (max 3, exponential backoff with jitter)
  - Reads `x-amzn-RateLimit-Limit` header on 429 to dynamically adjust bucket rate
- Test coverage: 360/360 PM tower tests pass (added 14 new tests across 3 spec files)

**Decisions made:**
- Chose token-bucket over leaky-bucket for rate limiting — simpler, matches Amazon's burst model
- Put rate limiter inside `AmazonAuthClient` (not middleware) because connector is instantiated per-channel, so limits are naturally per-seller-app
- Kept `batchGetCatalogItems` retry at 1 attempt (not 3) because it's non-critical enrichment — full retry is in the auth client layer
- Did NOT add `salesRanks` or `vendorDetails` to `includedData` — not needed for PIM core

**Key prompts that worked well:**
- `/code-review-expert` with specific scope + primary goal produced structured review with severity levels
- `/integration-spec` after code review created a spec that directly informed the implementation plan
- Subagent-driven development (fresh agent per task) kept context clean and execution fast
- Combining tightly coupled tasks (2+3) into single agent dispatch avoided inter-task coordination issues

**Next steps:**
- Phase 3 (future PR): Subscribe to `LISTINGS_ITEM_STATUS_CHANGE` notifications for event-driven sync
- Phase 3: Use Reports API (`GET_MERCHANT_LISTINGS_ALL_DATA`) for bulk reads >1000 products
- Phase 3: Add `VALIDATION_PREVIEW` mode for dry-run submissions
- Remove 1000-item hard cap in `pullAllSellerListings` (P1 finding #5 — deferred)
- Fix `patchListingsItem` double-wrap issue (P2 finding #11 — deferred)
