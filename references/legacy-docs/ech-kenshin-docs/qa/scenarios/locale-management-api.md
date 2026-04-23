# ck:scenario — Locale Management API

**Date:** 2026-04-08  
**Scope:** Locale management API (Phase 01–03 locale architecture)

## Dimensions Analyzed
- **Analyzed (7):** 1-User Types, 2-Input Extremes, 3-Timing, 4-Scale, 5-State Transitions, 7-Error Cascades, 8-Authorization, 9-Data Integrity
- **Skipped (5):** 6-Environment (not applicable), 10-Integration (no webhooks), 11-Compliance (no PII), 12-Business Logic (no pricing)

## Scenarios

| # | Dimension | Scenario | Severity | Expected Behavior |
|---|-----------|----------|----------|-----------------|
| 1 | User Types | Unauthenticated user calls `/api/locales` | Critical | Returns 401 Unauthorized |
| 2 | Input Extremes | POST with invalid code `xx_xx` (lowercase) | High | Zod rejects, returns 400 |
| 3 | Input Extremes | POST activate when already active | High | Idempotent, returns 200 |
| 4 | Input Extremes | PATCH with `decimalMark: "..."` (3 chars) | High | Zod rejects 400 |
| 5 | Input Extremes | PATCH locale not in org | Medium | Returns 404 |
| 6 | Input Extremes | Activate locale not in catalog (e.g. `zz_ZZ`) | High | Returns 404 "not found in system catalog" |
| 7 | Timing | Two concurrent activate for same org+locale | Medium | Last-write-wins, safe |
| 8 | Timing | Concurrent deactivate + activate | Medium | Order-dependent but consistent |
| 9 | Scale | Org with 0 active locales — GET /locales | Medium | Returns [] |
| 10 | Scale | Org with 45 locales all active | Low | Returns all 45 |
| 11 | State Transitions | activate → deactivate → activate cycle | High | isActive toggles correctly |
| 12 | State Transitions | updateOverrides on inactive locale | Medium | Should upsert or reject |
| 13 | State Transitions | deactivate then GET /locales | High | Deactivated still returned with isActive: false |
| 14 | Error Cascades | FK constraint violation on activate | Critical | Returns 500, needs graceful handling |
| 15 | Error Cascades | DB timeout during activate | Medium | Returns 500, client retries |
| 16 | Authorization | Org A activates locale with Org B session | Critical | RLS enforces isolation |
| 17 | Authorization | GET /locale-catalog with vs without auth | Low | Public, works always |
| 18 | Data Integrity | categories.labels JSONB keys mismatch org locales | 🔴 Critical | Frontend receives `{en}` instead of `{en_US}` |
| 19 | Data Integrity | locale_fallback_chains contains `"_"` after seed | 🔴 Critical | FK gap — violates Phase 02 decision |
| 20 | Data Integrity | channel_locales.organization_id NULL | High | Migration backfill should fix |
| 21 | Data Integrity | updateLocales with locale not in org | High | validateLocaleKeys rejects |
| 22 | Data Integrity | Locale deactivated but in product_completeness | Medium | Orphan possible, FK cascade |
| 23 | Data Integrity | updateOverrides locale not in org | Medium | Should 404, currently upserts |
| 24 | Authorization | GET /locales without org context (RLS unset) | Critical | Returns empty array silently |
| 25 | Data Integrity | locale_catalog seeded twice | Low | ON CONFLICT DO NOTHING — idempotent |
| 26 | Data Integrity | org_locales row deleted manually | Medium | Orphan FK in channel_locales |
| 27 | Input Extremes | firstDayOfWeek = 7 (outside 0–6) | High | Zod rejects |
| 28 | Input Extremes | PATCH with empty body {} | Low | No-op, returns current state |
| 29 | Timing | deactivate + updateOverrides simultaneously | Low | Order-dependent but consistent |
| 30 | State Transitions | createChannel with defaultLocale not in org | Medium | No validation today |

## Summary
- 🔴 **Critical: 4** (1, 14, 16, 18, 19, 24)
- **High: 10** (2, 3, 4, 6, 11, 13, 20, 21, 27, 30)
- **Medium: 9** (5, 7, 8, 9, 12, 15, 22, 23, 26, 29)
- **Low: 7** (10, 17, 25, 28)
- **Total: 30 scenarios across 7 dimensions**
