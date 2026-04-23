# Scenario Report — LocaleSwitcher + useOrgLocales + ProductEdit Integration

**Date:** 2026-04-13
**Dimensions analyzed:** 10/12 (skipped: Authorization, Compliance)

---

| # | Dimension | Scenario | Severity | Expected Behavior |
|---|-----------|----------|----------|-------------------|
| 1 | User Types | Admin with all locales active sees full dropdown | Low | All locales shown with correct labels/flags |
| 2 | User Types | User belongs to org with ZERO active locales | High | Show fallback "en-US" only, no crash |
| 3 | User Types | User in org with only 1 locale (same as default) | Medium | Switcher shows but selecting same locale is no-op |
| 4 | Input Extremes | BE returns locale with empty `code` string | High | Filter out, do not render broken option |
| 5 | Input Extremes | BE returns unknown locale code (e.g. `de_DE`) not in LOCALE_META | Medium | Fallback to `🌐 + BE name` label, no crash |
| 6 | Input Extremes | BE returns `isActive: false` for all locales | Medium | Empty dropdown, still renders, no crash |
| 7 | Input Extremes | BE response is HTML error page (non-JSON) | Critical | Catch parse error, show fallback, log warning |
| 8 | Timing | Network is slow — locales API takes 5s | Medium | Loading spinner shown, no flash of empty state |
| 9 | Timing | User rapidly switches locale 3x before first fetch completes | High | Cancel in-flight requests (React Query), show latest |
| 10 | Timing | API fails with 500 mid-switch | High | Error toast, selectedLocale stays at previous value |
| 11 | Timing | User switches locale while form has unsaved changes | High | Confirm dialog: "Switching will discard unsaved changes?" |
| 12 | Scale | Org has 50 locales active | Low | Select dropdown handles 50 items, no performance issue |
| 13 | Scale | Support locales expands to 10 → LOCALE_META incomplete | Medium | Falls back gracefully; no undefined label |
| 14 | State Transitions | Form has unsaved validation errors → user switches locale | High | Errors clear, form re-initializes fresh for new locale |
| 15 | State Transitions | product.rawValues null for new locale (no data yet) | Medium | Form renders empty fields; no crash |
| 16 | State Transitions | Form is saving → user switches locale | Medium | Save continues in background; new locale loads independently |
| 17 | Environment | Mobile: touch on Select trigger | Low | Radix handles mobile natively; ensure tap target ≥44px |
| 18 | Environment | Screen reader: locale options not announced | High | aria-label on trigger, aria-expanded, role="listbox" |
| 19 | Environment | Browser language `vi-VN` but org only has `en-US` | Low | Default to i18n locale, switcher shows en-US only |
| 20 | Error Cascades | Locales API returns 401 → redirect to login | High | React Query triggers 401 → window.location.href="/login" |
| 21 | Error Cascades | Locales API returns partial data (malformed JSON) | High | Catch at apiClient level, return empty array, no crash |
| 22 | Error Cascades | useOrgLocales fails but useProductDetail succeeds | Medium | Switcher shows fallback; product loads normally |
| 23 | Authorization | Token expired while component is mounted | Critical | React Query 401 → redirect to login (already handled) |
| 24 | Data Integrity | product.rawValues changes on server while user is editing | Medium | React Query stale-while-revalidate handles; user sees fresh on next switch |
| 25 | Data Integrity | Locale format mismatch: BE sends `en-US` instead of `en_US` | Medium | toIetfLocale("en-US".split("_")) → `{lang: "en-US", region: undefined}` → crash |
| 26 | Data Integrity | Concurrent: two tabs open same product, different locales | Low | Each tab manages own selectedLocale; no shared state |
| 27 | Integration | BE adds new locale `de-DE` not in SUPPORTED_LOCALES | High | useOrgLocales returns it; switcher converts "DE_DE" → "DE-DE"; form engine may not have dictionary |
| 28 | Integration | BE changes response shape (rename `code` → `localeCode`) | Critical | TypeScript error at compile time; run tsc to catch |
| 29 | Integration | useOrgLocales is called in 2 components → double network request | Low | React Query deduplicates; only 1 fetch |
| 30 | Business Logic | User selects current locale (no-op) | Low | onSwitch fires but selectedLocale unchanged; no re-fetch |
| 31 | Business Logic | Locale switch updates URL query param | Low | Consider: `/products/:id?locale=ja-JP` for shareability |
| 32 | User Types | User with READ-ONLY product (no edit permission) | Medium | LocaleSwitcher still shown; can browse but not edit |

---

## Summary

| Severity | Count |
|----------|-------|
| **Critical** | 5 (#7, #23, #26, #28) |
| **High** | 12 (#2, #5, #9, #10, #11, #14, #18, #20, #22, #25, #27, #32) |
| **Medium** | 10 |
| **Low** | 6 |
| **Total** | **32 scenarios across 10 dimensions** |