# Scenario Report: FE Catalog Search & Product Creation Refactor

Generated: 2026-04-08
Skill: ck:scenario (12-dimension decomposition)
Dimensions analyzed: 11/12 (Compliance skipped — FE-only scope)

| # | Dimension | Scenario | Severity | Expected Behavior |
|---|-----------|----------|----------|-------------------|
| 1 | User Types | Admin with no channels configured searches catalog | High | Empty source dropdown with "No sources available" message |
| 2 | User Types | New user opens ProductCreateModal before families load | Medium | Family dropdown shows loading state |
| 3 | User Types | Read-only channel user tries catalog search | Medium | Search works; enrich POST fails gracefully |
| 4 | User Types | Multi-tenant user switches org mid-search | High | Sources/results invalidate; no stale org data |
| 5 | Input Extremes | Empty string submitted to catalog search | Critical | Search NOT fired; button disabled |
| 6 | Input Extremes | "B0" (2 chars) triggers ASIN detection | High | identifierType=ASIN; BE validates |
| 7 | Input Extremes | Unicode "matcha tea" keyword | Medium | Pass through correctly; no encoding corruption |
| 8 | Input Extremes | 500+ char input pasted | Low | API returns 400; error shown gracefully |
| 9 | Input Extremes | SQL injection `'; DROP TABLE--` | Critical | POST body (not URL param); no injection vector |
| 10 | Input Extremes | XSS `<script>alert(1)</script>` in results | Critical | React auto-escapes; no dangerouslySetInnerHTML |
| 11 | Timing | Rapid typing — debounce batches to single call | Critical | ONE API call after 500ms idle |
| 12 | Timing | Second search after first completes | High | Both auto-fire after debounce -- BUG FOUND & FIXED |
| 13 | Timing | Source change while search in-flight | High | Previous search cancelled or results discarded |
| 14 | Timing | Network latency >5s | Medium | Loading indicator; UI not frozen |
| 15 | Timing | Click "Select" while another search loading | Medium | Selection works immediately |
| 16 | Scale | 0 results | Medium | "No results found" message |
| 17 | Scale | 50+ results (max page) | Medium | Scrollable container (max-h-60) |
| 18 | Scale | Parent with 100+ children | High | Truncation or "show more" needed |
| 19 | Scale | 0 sources from API | High | Source selector empty; search disabled |
| 20 | State Transitions | Modal open→search→select→close | Medium | Full reset on close |
| 21 | State Transitions | Select catalog item then clear | Medium | SKU clears; selectedItem null |
| 22 | State Transitions | ChannelImport Search→Select→back | Medium | Results preserved; selections cleared |
| 23 | State Transitions | Network drops mid-save | High | Error toast; form preserved |
| 24 | State Transitions | Sources load AFTER mount | Critical | sourceId syncs -- BUG FOUND & FIXED |
| 25 | Environment | Mobile (<640px) | Medium | Grid collapses to single column |
| 26 | Environment | Japanese locale — long titles | Low | line-clamp-2 handles overflow |
| 27 | Environment | Slow 3G — sources take 3s | Medium | Loading state until loaded |
| 28 | Error Cascades | GET /catalog/sources returns 500 | High | Error state shown |
| 29 | Error Cascades | POST /catalog/search returns 500 | High | Error message + retry |
| 30 | Error Cascades | 401 session expired | Critical | Redirect to /login |
| 31 | Error Cascades | Enrich fails after product created | Medium | Product created; toast warns |
| 32 | Error Cascades | Eligibility check fails | Medium | eligible=null; no crash |
| 33 | Authorization | Session expired during ChannelImport | High | 401 redirect; user loses progress |
| 34 | Authorization | No org_id on catalog search | Critical | BE rejects 403; FE handles |
| 35 | Data Integrity | Import from deleted amazon-catalog-mock | Critical | Build fails -- BUG FOUND & FIXED |
| 36 | Data Integrity | Duplicate SKU creation | High | 409 with inline error |
| 37 | Data Integrity | Empty sourceId sent to search | Critical | BUG FOUND & FIXED (stale sourceId) |
| 38 | Data Integrity | Wrong enrich sourceId (classification vs catalog source) | High | Needs manual verification |
| 39 | Integration | ChannelImport uses deprecated endpoint | Critical | BUG FOUND & FIXED |
| 40 | Integration | BE response shape changes | High | Types must match |
| 41 | Integration | Amazon SP-API outage | Medium | 504 surfaced to user |
| 42 | Integration | suggestFallback non-null | Medium | Currently unused by FE |
| 43 | Business Logic | "B0BYZ1Z71J" detected as ASIN | Medium | Correct |
| 44 | Business Logic | "4901234567001" detected as GTIN | Medium | Correct |
| 45 | Business Logic | "12345" (5 digits) → KEYWORD | Medium | Correct fallback |
| 46 | Business Logic | Variation parent → configurable product | High | hasVariations should auto-set |
| 47 | Business Logic | Product create without family | Medium | Valid basic product |

## Summary
- Critical: 9 (4 bugs found & fixed)
- High: 12
- Medium: 18
- Low: 2
- Total: 47 scenarios across 11 dimensions
