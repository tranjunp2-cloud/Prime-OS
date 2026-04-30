# 00 - I18n Audit

Date: 2026-04-30

Scope: Prime OS main prototype at `prime-os-phase-1/app`.

## Current Foundation

The app already has a working three-locale foundation:

- `en-US`
- `ja-JP`
- `vi-VN`

Core files:

- `app/src/lib/i18n/I18nContext.tsx`
- `app/src/lib/i18n/dictionaries.ts`
- `app/src/lib/i18n/shell-dictionaries.ts`
- `app/src/lib/i18n/ops-dictionaries.ts`
- `app/src/lib/i18n/format.ts`
- `app/src/components/common/LanguageToggle.tsx`

Settings and the sidebar already expose language switching. The app persists the selected locale in `localStorage` using `ech.locale`.

## Audit Snapshot

Source scan on `app/src/**/*.{ts,tsx}`:

- Files scanned: 278
- Unique `t('...')` keys used in source: 534
- Hardcoded JSX/string candidates: 548
- Inline `locale === ...` branch candidates: 156

The current dictionary objects for `en-US`, `ja-JP`, and `vi-VN` have matching key shape after the foundation test pass.

## Main Risk Areas

Highest hardcoded-string concentration:

| Area | Candidate count |
|---|---:|
| `app/src/pages/prime` | 367 |
| `app/src/components/listings` | 35 |
| `app/src/components/products` | 25 |
| `app/src/components/fulfillment` | 20 |
| `app/src/components/inventory` | 18 |
| `app/src/components/oms` | 13 |
| `app/src/components/layout` | 12 |

`app/src/pages/prime` is the largest blocker for Prime OS platform-wide localization. It includes Overview, Tower, Commerce Surface, Policy/Rule, and Event/Audit operating language.

## Foundation Gaps Found

- Locale metadata was not centralized.
- Unsupported stored locale values were ignored implicitly instead of using a clear guard.
- `t(key)` returned the key when missing instead of falling back to `en-US` first.
- There was no focused test for locale metadata, dictionary key parity, blank translations, or placeholder safety.
- Several components still build localized copy with inline `locale === ...` objects.

## M1 Foundation Changes

- Added `DEFAULT_LOCALE`.
- Added `LOCALE_META`.
- Added `isSupportedLocale(value)`.
- Added `getLocaleMeta(locale)`.
- Made stored locale reads use the supported-locale guard.
- Made missing translation fallback explicit to `en-US`.
- Added `src/lib/i18n/i18n-foundation.test.ts`.

## M2 Shell/Auth Start

- Added domain dictionaries for shell, auth, and Prime navigation labels.
- Localized the global search input, search result labels, empty state, session text, logout state, command palette headings/actions, sidebar labels, mobile tab count, brand descriptor, and auth screen copy.
- Added a language toggle on the auth screen before sign-in.
- Extended the foundation test to verify shell/auth dictionary parity and Prime navigation label coverage.

## Next Audit Tasks

- Move remaining inline locale copy from COS pages into dictionaries.
- Start Prime page localization with `app/src/pages/prime/PrimeOverview.tsx` and `app/src/pages/prime/PrimeTowerPage.tsx`.
- Continue Demand/Customer/Intelligence only after the Prime shell and visible operating language are stable.
