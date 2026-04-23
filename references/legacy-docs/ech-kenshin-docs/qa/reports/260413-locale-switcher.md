# QA Full Report — locale-switcher

**Date:** 2026-04-13
**Branch:** `refactor/CR-081-mapping-data-engine-v1`
**Scope:** LocaleSwitcher component + useOrgLocales hook + ProductEdit integration

---

## Bug Found & Fixed

**Runtime crash:** `Uncaught TypeError: Cannot read properties of undefined (reading 'productForm')` at `locale-switcher.tsx:44`.

**Root cause:** `LocaleSwitcher` called `useI18n()` and accessed `dict.productForm.localeSwitcherAria` — but the existing `I18nContextType` never exported `dict`. The hook only exposed `{ locale, setLocale, t }`. `dict` was `undefined`.

**Fix applied:**
- Added `dict: Dictionary` to `I18nContextType` interface in `I18nContext.tsx`
- Provider now passes `dict: dictionaries[locale]` — never undefined (always resolves)
- `LocaleSwitcher` uses `dict.productForm.localeSwitcherAria` instead of `t()` utility

**Secondary bug also fixed:**
- `toUnderscore("en-US")` called `.toUpperCase()` on the whole string → `"EN_US"` instead of `"en_US"`. Locale codes are case-sensitive. Removed `.toUpperCase()`.
- `toIetfLocale()` used destructuring without null guards → if BE sends malformed code, would return `undefined`. Added safe fallback.

---

## Test Files

| File | Tests | Status |
|------|-------|--------|
| `locale-switcher.test.tsx` (new) | 5 | ✅ |
| `use-locales.test.ts` (new) | 6 | ✅ |
| `use-catalog.test.tsx` | 6 | ✅ |
| `catalog-search-inline.test.tsx` | 13 | ✅ |
| `ChannelImport.test.tsx` | 14 | ✅ |
| `use-variation-tree.test.ts` | 8 | ✅ |
| `product.adapter.test.ts` | 19 | ✅ |
| `pim-values.test.ts` | 17 | ✅ |
| `warehouse.adapter.test.ts` | 6 | ✅ |
| `product-images.test.ts` | 5 | ✅ |
| `return-detail-utils.test.ts` | 7 | ✅ |
| `example.test.ts` | 1 | ✅ |

---

## Scenario Coverage (ck:scenario — 32 scenarios across 10 dimensions)

See `docs/qa/scenarios/locale-switcher.md` for full scenario table.

Key scenarios covered by tests:
- ✅ `useOrgLocales` filters `isActive: false` locales
- ✅ `toIetfLocale` converts `en_US` → `en-US`
- ✅ `toIetfLocale` handles empty/malformed input safely
- ✅ Empty locale list renders without crashing
- ✅ Loading state shown while fetching
- ✅ onSwitch called with IETF code on option click

---

## Test Infrastructure Fixes

Two jsdom gaps fixed in `src/test/setup.tsx`:

1. **hasPointerCapture** — Radix Select calls `element.hasPointerCapture()` on keyboard events; jsdom throws. Polyfilled to `() => false`.

2. **scrollIntoView** — Radix virtual list calls `item.scrollIntoView()`; jsdom element doesn't have this method. Polyfilled to no-op.

3. **Unhandled rejection trap** — `scrollIntoView` errors were propagating as unhandled rejections, crashing the test suite. Suppressed for known Radix error patterns.

---

## Files Changed

| File | Change |
|------|--------|
| `lib/i18n/I18nContext.tsx` | Added `dict: Dictionary` to context interface + provider value |
| `lib/i18n/dictionaries.ts` | Added `localeSwitcher`, `localeSwitcherAria` to 3 locale dicts |
| `hooks/api/use-locales.ts` | Safe `toIetfLocale` with null guards |
| `components/product/locale-switcher.tsx` | Removed `.toUpperCase()`, use `dict` from context |
| `pages/ProductEdit.tsx` | State + integration changes (Phase 03) |
| `lib/api/services/locales.ts` | New API service |
| `hooks/api/use-locales.ts` | New hook |
| `test/setup.tsx` | Added jsdom polyfills for Radix |
| `locale-switcher.test.tsx` | New test file (5 tests) |
| `use-locales.test.ts` | New test file (6 tests) |

---

## Verification

- **TypeScript:** ✅ 0 errors
- **Tests:** ✅ 107 passed (0 failed)
- **Pre-existing tests:** ✅ No regressions
