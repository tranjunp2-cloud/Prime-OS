# ck:scenario — Amazon Listing Wizard Form

**Feature:** Amazon Listing Schema Mapping (6-phase implementation)  
**Dimensions analyzed:** 10/12 (skipped: 11 Compliance, 12 Business Logic)  
**Total scenarios:** 34 | **Severity breakdown:** Critical 2, High 19, Medium 11, Low 2

---

## Dimensions Analyzed

1. **User Types** — admin/expired-session, guest/unauthenticated, readonly-permission user
2. **Input Extremes** — unicode (Japanese/Arabic/Emoji), maxUtf8ByteLength exceeded, SQL/HTML injection, empty required array, malformed date, invalid URI
3. **Timing** — rapid Next click, browser back/forward nav, schema reload mid-edit, race condition (two tabs)
4. **Scale** — 722 fields performance, 500+ enum items, 5-level deep nesting state, zero channelValues
5. **State Transitions** — step nav loses fields, back-after-changes, browser refresh, submit fails
6. **Environment** — mobile viewport, Japanese locale date, screen reader/a11y
7. **Error Cascades** — AJV throws, context missing, schemaOutput.fieldMetadata undefined
8. **Authorization** — BE validates regardless of FE, listing locked by another user
9. **Data Integrity** — deprecated enum selected, SELECTOR fields manually edited, OFFER_ONLY in new_product
10. **Integration** — schema version changes, BE getDynamicForm timeout, condition rules ref unknown fields, anyOf 10+ branches

---

## Critical Scenarios

| # | Scenario | Expected Behavior |
|---|----------|-------------------|
| C1 | `schemaOutput.fieldMetadata` is undefined at runtime | `loadAmazonSchema` always initializes Map; safe default prevents crash |
| C2 | User bypasses FE and POSTs directly to submit API | BE validates all required fields regardless |

---

## High Scenarios

| # | Scenario |
|---|----------|
| H1 | Unicode (Japanese/Arabic) in text fields — correctly stored and rendered |
| H2 | String exceeds `maxUtf8ByteLength` — AJV rejects with clear error |
| H3 | Empty required array field (minItems=1) — hard error blocks Next |
| H4 | Malformed date string — date input provides ISO; invalid rejected |
| H5 | Rapid Next click before validation — debounce/block duplicate |
| H6 | Browser back/forward — react-hook-form preserves state |
| H7 | Schema reloads mid-edit (product type change) — confirm before reload |
| H8 | Race: two tabs editing same listing — last-write-wins or conflict detection |
| H9 | 722 fields — only visible step mounts; virtualization for large lists |
| H10 | 500+ enum — virtualized list renders ~20 items in DOM |
| H11 | Deep nesting 5 levels — functional setState prevents stale closures |
| H12 | Wizard step nav loses fields not on current step — allDataRef preserves |
| H13 | Submit fails (network error) — retry with form state preserved |
| H14 | AJV validator throws (malformed schema) — graceful error boundary |
| H15 | Context provider missing — safe defaults prevent crash |
| H16 | BE getDynamicForm returns 722 fields but FE times out — pagination |
| H17 | Admin with expired session continues editing — refresh or re-auth |
| H18 | Guest accesses wizard URL — redirect to login |
| H19 | BE validates all required fields regardless of FE state |
