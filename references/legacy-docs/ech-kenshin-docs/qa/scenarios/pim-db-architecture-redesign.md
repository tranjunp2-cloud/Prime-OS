# Scenario Report: PIM Database Architecture Redesign

Generated: 2026-04-08
Skill: ck:scenario (12-dimension decomposition)

## Dimensions

- Analyzed: User Types, Input Extremes, Timing, Scale, State Transitions, Error Cascades, Authorization, Data Integrity, Integration, Business Logic
- Skipped: Environment (backend-only), Compliance (no PII changes)

## Scenarios

| # | Dimension | Scenario | Severity | Expected Behavior |
|---|-----------|----------|----------|-------------------|
| 1 | Input Extremes | `values` with `"_"` key set to `null` | Critical | `isFilled()` returns false, completeness counts as missing |
| 2 | Input Extremes | Empty string `""` for locale key | High | Normalize or reject |
| 3 | Input Extremes | Scopable attr with 4+ nesting levels | High | Only process 2 or 3 levels |
| 4 | Input Extremes | `channelValues` with array value (bullet_points) | Critical | `normalizeChannelValues` wraps array in `{ "_": [...] }` |
| 5 | Input Extremes | `normalizeKey` receives `"\|en_US"` | Medium | Maps to `"en_US"` via passthrough |
| 6 | Input Extremes | Product `values` is `null` instead of `{}` | High | Cast to `{}` before processing |
| 7 | Input Extremes | Attr code with dots (`"item.name"`) in `extractValueFromPath` | Critical | Misinterprets as nested path |
| 8 | Input Extremes | Unicode locale code like `"日本"` | Medium | Not matched by LOCALE_PATTERN |
| 9 | Input Extremes | `channelValues` with numeric keys | Medium | Wrapped in `{ "_": value }` |
| 10 | Timing | Two BullMQ jobs for same productId concurrently | Critical | Race condition: last write wins |
| 11 | Timing | Worker fires during product values update | High | Reads partially-updated values |
| 12 | Timing | `getFallbackLocales` slow under load | Medium | Job retries; must be idempotent |
| 13 | Timing | Product deleted between enqueue and processing | High | Worker returns early (handled) |
| 14 | Scale | 200+ attrs x 10 channels x 5 locales | High | N+1 query performance degradation |
| 15 | Scale | Product with 0 listings | Medium | Worker returns silently |
| 16 | Scale | 50+ channels per product | High | Potential BullMQ timeout |
| 17 | Scale | Empty fallbackLocales array | Low | Falls through to `"_"` correctly |
| 18 | State Transitions | Legacy `"\|"` and `"default"` keys never migrated | Critical | ValueResolver only checks `"_"` — values appear missing |
| 19 | State Transitions | Product with mixed old/new format after partial update | High | JSONB merge must not leave stale keys |
| 20 | State Transitions | Variant child created before parent has values | Medium | Both return "missing" |
| 21 | State Transitions | Channel removed while completeness job in flight | Medium | Worker skips missing channel |
| 22 | State Transitions | Family changed — required attrs shift | High | Stale completeness rows remain |
| 23 | Error Cascades | DB connection drops mid-upsert | Critical | Partial completeness rows — inconsistent |
| 24 | Error Cascades | Unknown platform in `getUnwrapper()` | High | MappingEngine needs graceful handling |
| 25 | Error Cascades | Invalid unitConversion rules (missing factor) | Medium | NaN multiplication risk |
| 26 | Error Cascades | Missing marketplaceProductType for listing | Medium | Channel completeness silently skipped |
| 27 | Authorization | Cross-tenant completeness job | Critical | Validated via query with organizationId |
| 28 | Authorization | Missing `x-organization-id` header | High | Should return 401/403 |
| 29 | Authorization | Cross-tenant product access | Critical | RLS must block |
| 30 | Data Integrity | Unique constraint lacks organizationId | Critical | Cross-tenant collision possible |
| 31 | Data Integrity | Double-normalized channelValues | High | Detected and passed through |
| 32 | Data Integrity | JSONB shallow merge overwrites entire scope | High | Must deep-merge at attribute level |
| 33 | Data Integrity | Circular fallback chain en_US→ja_JP→en_US | Critical | Infinite loop; need cycle detection |
| 34 | Data Integrity | Orphaned completeness rows after hard-delete | Medium | Needs cascade/cleanup |
| 35 | Data Integrity | Score rounding precision loss | Low | Acceptable for UI |
| 36 | Integration | Amazon SP-API unexpected format | High | unwrap() must handle gracefully |
| 37 | Integration | Amazon rate limit during catalog-tree | High | Import should be atomic or indicate partial |
| 38 | Integration | Missing targetAttributePath in raw data | Medium | extractValueFromPath returns undefined |
| 39 | Integration | Mapping deleted between import and completeness | Medium | Field counted as unfilled |
| 40 | Business Logic | Scopable attr with only `"_"` scope | High | resolveScopable falls through correctly |
| 41 | Business Logic | `isFilled([])` — empty array | Critical | Returns false (verified) |
| 42 | Business Logic | `isFilled(0)` — zero numeric | Critical | Returns true (verified) |
| 43 | Business Logic | `isFilled(false)` — boolean false | High | Returns true (verified) |
| 44 | Business Logic | Completeness 100% when requiredCount=0 | Medium | Returns 100; documented behavior |
| 45 | Business Logic | Variant inherits from parent with different channels | High | May resolve wrong channel scope |
| 46 | Business Logic | resolveChannelValue source label inconsistency | Medium | "channel_override" for both exact and global |
| 47 | Business Logic | Unmapped short locale (e.g., `"\|ar"`) | Low | Falls through unmapped |

## Summary

- Critical: 10
- High: 15
- Medium: 14
- Low: 3
- **Total: 42 scenarios across 10 dimensions**
