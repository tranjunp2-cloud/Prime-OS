# Prime OS 3-Language Platform Plan

Ngày: 2026-04-29

Mục tiêu: biến Prime OS thành platform vận hành đầy đủ 3 ngôn ngữ, không chỉ dịch vài label rời rạc. Ba ngôn ngữ mặc định của plan này là:

- English: `en-US`
- Japanese: `ja-JP`
- Vietnamese: `vi-VN`

Lý do chọn bộ này: code hiện tại đã khai báo `SUPPORTED_LOCALES = ['en-US', 'ja-JP', 'vi-VN']`, nên plan sẽ mở rộng đúng foundation hiện có thay vì tạo hệ i18n mới.

## 1. Product Thesis

Prime OS đa ngôn ngữ phải cho SME / operator sử dụng cùng một hệ thống ở 3 thị trường mà không làm sai nghĩa vận hành.

Không được xem đa ngôn ngữ như:

- dịch UI literal từng câu
- thêm Google Translate style vào giao diện
- chỉ đổi sidebar/settings
- chỉ dịch COS mà bỏ Demand / Customer / Intelligence
- tạo 3 app riêng cho 3 ngôn ngữ

Phải xem đa ngôn ngữ như một lớp platform capability:

- mỗi area giữ đúng business meaning ở từng ngôn ngữ
- mỗi route có label, heading, empty state, action, status, issue, KPI, table column được dịch
- số, tiền, ngày, timezone, market/country name format đúng locale
- search, command palette, filter, saved view vẫn hoạt động theo ngôn ngữ
- mock data demo có thể hiển thị hợp lý ở từng language context
- QA có thể chứng minh không còn missing translation / broken layout vì text dài

## 2. Current State Audit

Đã có foundation:

- `app/src/lib/i18n/I18nContext.tsx`
- `app/src/lib/i18n/dictionaries.ts`
- `app/src/lib/i18n/ops-dictionaries.ts`
- `app/src/lib/i18n/format.ts`
- `SUPPORTED_LOCALES = ['en-US', 'ja-JP', 'vi-VN']`
- `formatLocalizedDate`, `formatLocalizedDateTime`, `formatLocalizedNumber`, `formatLocalizedMoney`
- `Settings` đã có language/appearance section.

Nhưng chưa đủ platform:

- Nhiều Prime OS pages còn hardcoded English trong component.
- `PrimeOverview`, `PrimeTowerPage`, Demand, Customer, Intelligence operating language chưa được externalize đầy đủ.
- Command/search strings còn hardcoded.
- Mock data business terms, statuses, issue labels, lifecycle labels chưa có localization map rõ.
- Chưa có i18n completeness test.
- Chưa có visual regression cho text expansion ở 3 locale.
- `t(key)` hiện fallback bằng chính key và chỉ `console.warn`, chưa có build/test gate để bắt missing translation.

## 3. Scope

### In Scope

1. Platform i18n architecture
2. Language switcher UX
3. Full route label translation
4. Full shell / sidebar / topbar / command palette translation
5. COS translation preservation and completion
6. Demand Area translation
7. Customer Area translation
8. Intelligence Area translation
9. Finance Area translation
10. Empty states, issue states, badges, statuses
11. Table columns, filters, saved views
12. Forms, dialogs, validation messages
13. Date/time/number/money formatting
14. Search result type labels and placeholder text
15. QA automation for missing keys and layout overflow

### Out of Scope for First Pass

- real machine translation workflow
- external translation management system
- per-user role-based language policy
- legal-grade translation review
- right-to-left language support
- separate deployments per language

## 4. Language UX Strategy

Language switcher must be visible but not noisy.

Recommended places:

- Settings: full language settings with description.
- Sidebar footer: compact language selector next to theme toggle.
- Auth screen: language selector before sign-in.
- Optional future: user profile menu.

Behavior:

- selected locale persists in `localStorage`.
- locale applies before first render where possible.
- no route reload required.
- active locale affects date/number/currency format immediately.
- unsupported locale falls back to `en-US`.

Labels:

- English: `English`
- Japanese: `日本語`
- Vietnamese: `Tiếng Việt`

## 5. Architecture

### 5.1 Locale Model

Keep current locale IDs:

```ts
export const SUPPORTED_LOCALES = ['en-US', 'ja-JP', 'vi-VN'] as const;
```

Add locale metadata:

```ts
export const LOCALE_META = {
  'en-US': { nativeName: 'English', shortLabel: 'EN', currency: 'USD' },
  'ja-JP': { nativeName: '日本語', shortLabel: 'JP', currency: 'JPY' },
  'vi-VN': { nativeName: 'Tiếng Việt', shortLabel: 'VI', currency: 'VND' },
};
```

Important: currency should not blindly follow locale if data belongs to JP commerce. Add helper options so business data can keep source currency while UI language changes.

### 5.2 Dictionary Structure

Move toward domain dictionaries:

```txt
i18n/
  dictionaries/
    shell.en-US.ts
    shell.ja-JP.ts
    shell.vi-VN.ts
    cos.en-US.ts
    cos.ja-JP.ts
    cos.vi-VN.ts
    demand.en-US.ts
    demand.ja-JP.ts
    demand.vi-VN.ts
    customer.en-US.ts
    customer.ja-JP.ts
    customer.vi-VN.ts
    intelligence.en-US.ts
    intelligence.ja-JP.ts
    intelligence.vi-VN.ts
    finance.en-US.ts
    finance.ja-JP.ts
    finance.vi-VN.ts
    common.en-US.ts
    common.ja-JP.ts
    common.vi-VN.ts
```

Then compose into one `Dictionary` per locale.

Reason: current `dictionaries.ts` is already large. Keeping everything in one file will become fragile once Prime OS is fully translated.

### 5.3 Type Safety

Required:

- TypeScript dictionary shape must be derived from `en-US`.
- `ja-JP` and `vi-VN` must satisfy the same shape.
- missing key should fail tests.
- extra key should be allowed only if explicitly documented.

Recommended pattern:

```ts
const enUS = { ... } as const;
type DictionaryShape = typeof enUS;
const jaJP: DictionaryShape = { ... };
const viVN: DictionaryShape = { ... };
```

### 5.4 Message Formatting

Current `formatMessage(template, values)` is enough for phase 1 but weak for pluralization.

Phase 1:

- keep `{count}` interpolation
- add tests for missing placeholders

Phase 2:

- add plural helper:

```ts
tPlural('orders.count', count)
```

Phase 3:

- consider ICU-style message format only if needed.

## 6. Content Taxonomy

All translation keys must belong to one of these groups.

### Common

- buttons: save, cancel, open, close, back, next, apply, reset
- states: active, paused, ready, blocked, draft, archived
- severity: low, medium, high, critical
- time: today, yesterday, overdue, due today
- empty state patterns

### Shell

- sidebar
- top search
- command palette
- session/account controls
- mobile navigation
- auth
- settings

### COS

- Product Master
- Listings
- Inventory Brain
- Warehouses
- OMS
- Fulfillment
- Returns
- SLA policies
- routing plans

### Demand

- Campaign Ops
- Content Creator Ops
- Lead Response Capture
- Retargeting Outreach
- offers, messages, CTA, destination, campaign states
- lead/RFQ statuses

### Customer

- CRM Compact
- Service
- customer lifecycle
- customer health
- follow-up and communication
- account context

### Intelligence

- Launch Decisions
- Creators Intelligence
- Trends / Customers Intelligence
- Campaigns Intelligence
- Analytics / Attribution / Forecasting
- AI Operator
- VOC
- Alerts

### Finance

- Finance Health
- Capital Offers
- Risk Trust
- Settlement / Repayment

## 7. Implementation Phases

## Phase 0: Audit & Key Inventory

Goal: biết chính xác text nào đã dịch, text nào hardcoded.

Tasks:

- scan all `src/**/*.{ts,tsx}` for string literals in JSX
- list every `t('...')` key currently used
- list every dictionary key currently defined
- identify unused keys
- identify missing keys per locale
- classify strings by domain: shell, COS, demand, customer, intelligence, finance, common

Output:

- `docs/i18n/00-i18n-audit.md`
- `docs/i18n/01-key-inventory.md`
- `docs/i18n/02-hardcoded-string-map.md`

Acceptance:

- no implementation before audit list exists
- every route has known translation status

## Phase 1: Foundation Hardening

Goal: i18n layer đủ chắc để scale.

Tasks:

- add `LOCALE_META`
- add `getLocaleMeta(locale)`
- add `isSupportedLocale(value)`
- make fallback explicit to `en-US`
- add typed dictionary shape
- split dictionaries by domain or create domain sections inside current file if split is too risky
- add `missingTranslation` test
- add `dictionaryParity` test
- add placeholder parity test

Acceptance:

- `en-US`, `ja-JP`, `vi-VN` have identical key shape
- missing translation fails test
- placeholders match across languages

## Phase 2: Shell & Navigation

Goal: user can navigate Prime OS in 3 languages.

Tasks:

- translate sidebar groups and route labels
- translate mobile navigation
- translate top search placeholder and command helper
- translate command palette headings/actions
- translate auth screen
- translate session/logout text
- add language selector to sidebar/footer or top profile area
- ensure language selector works on auth and app shell

Important screens:

- `/auth`
- `/overview`
- all shell navigation groups
- command palette
- settings

Acceptance:

- changing language updates sidebar, topbar, command palette, settings without reload
- no missing key warning on route navigation smoke test
- mobile sidebar still fits in `vi-VN` and `ja-JP`

## Phase 3: COS Completion

Goal: preserve COS as SME-ready operational backbone, fully localized.

Tasks:

- finish product master labels/actions/tables
- finish product detail/create/edit
- finish listings pages
- finish inventory/warehouse/movement/adjustment labels
- finish OMS/order detail
- finish fulfillment/job detail
- finish returns/detail
- finish SLA/routing labels
- localize badges from constants/type files
- localize empty states and error states

Acceptance:

- all COS priority routes pass 3-locale visual smoke
- no hardcoded visible English on COS routes except product/customer mock data names
- dates/numbers/money format via locale helper

## Phase 4: Demand Area Localization

Goal: Demand can be operated in 3 languages without losing business meaning.

Tasks:

- externalize `PrimeTowerPage` demand copy
- translate Campaign Ops
- translate Content Creator Ops
- translate Lead Response Capture
- translate Retargeting Outreach
- translate trigger, audience, journey, offer, control terms
- translate campaign/lead/RFQ status maps
- translate decision/handoff/outcome language

Acceptance:

- Demand routes have no hardcoded UI English
- business terms are consistent:
  - campaign
  - lead
  - RFQ
  - retargeting
  - re-entry
  - suppression
  - handoff

## Phase 5: Customer Area Localization

Goal: Customer Area feels compact and usable for SME in 3 languages.

Tasks:

- translate CRM Compact
- translate Service
- translate customer lifecycle states
- translate customer health states
- translate follow-up task types
- translate communication statuses
- translate account/buyer/commercial context labels
- translate service preview states without taking Service domain too far

Acceptance:

- customer detail, account detail, follow-up, communication, loyalty language is consistent
- no text overflow on long Vietnamese labels
- Japanese labels remain readable in table/card density

## Phase 6: Intelligence & Finance Localization

Goal: decision layer can explain recommendations in 3 languages.

Tasks:

- translate Prime Overview operating loop
- translate Launch Decisions
- translate Intelligence towers
- translate evidence/guardrail/outcome language
- translate Finance Health / Capital Offers / Risk Trust
- localize AI/operator recommendation labels
- keep technical model names unchanged where needed

Acceptance:

- BOD demo flow can be run in all 3 languages
- decision readiness cards remain concise
- no mistranslation of guardrail/risk terms

## Phase 7: Mock Data & Semantic Labels

Goal: data labels do not contradict translated UI.

Tasks:

- separate mock entity names from UI labels
- localize status/lifecycle/category labels via mapping, not by mutating mock data
- preserve canonical IDs across locales
- localize issue messages and suggested actions
- localize demo flow scripts

Rule:

- IDs, SKUs, order IDs, RFQ IDs, customer names, company names remain stable.
- UI interpretation labels are localized.

Acceptance:

- switching language does not alter IDs or break links
- mock data remains linked and canonical

## Phase 8: QA Automation

Goal: prevent regressions.

Tests to add:

- dictionary parity test
- placeholder parity test
- missing translation console test
- route smoke across 3 locales
- visual overflow smoke across 3 locales
- command/search language test
- auth/settings language persistence test
- mobile sidebar 3-locale test

Priority Playwright matrix:

```txt
Locales:
- en-US
- ja-JP
- vi-VN

Viewports:
- 390x844
- 768x1024
- 1440x1000

Routes:
- /auth
- /overview
- /demand/campaign-ops
- /demand/lead-response-capture
- /customer/crm-compact
- /intelligence/launch-decisions
- /ecom/cos/product-master
- /ecom/cos/oms
- /ecom/cos/fulfillment
- /settings
```

Acceptance:

- no document overflow
- no missing translation console warnings
- key flows remain clickable
- language persists after reload

## Phase 9: Documentation & Demo

Output docs:

- `docs/i18n/00-i18n-audit.md`
- `docs/i18n/01-key-inventory.md`
- `docs/i18n/02-hardcoded-string-map.md`
- `docs/i18n/03-locale-style-guide.md`
- `docs/i18n/04-translation-workflow.md`
- `docs/i18n/05-qa-checklist.md`
- `docs/i18n/06-demo-flow-3-languages.md`

Demo flows:

1. English operator flow
   - auth
   - overview
   - launch decisions
   - demand handoff
   - COS order readback

2. Japanese commerce flow
   - product master
   - OMS
   - fulfillment
   - inventory guardrail

3. Vietnamese SME owner flow
   - overview
   - campaign
   - lead response
   - CRM follow-up
   - retargeting outcome

## 8. Engineering Rules

Do:

- keep one app, not three apps
- use locale as presentation layer, not data truth
- keep canonical IDs stable
- localize UI labels via dictionary
- localize dynamic enum/status via mapping helpers
- add tests before large dictionary expansion
- keep English as source dictionary

Do not:

- duplicate routes per language in this phase
- mutate mock data per locale
- translate IDs/SKUs/order refs
- hardcode strings in JSX after Phase 2
- create ad hoc `if locale === ...` branches everywhere
- rely on browser auto-translate

## 9. Suggested File Changes

Likely files/modules:

```txt
app/src/lib/i18n/
  I18nContext.tsx
  dictionaries.ts
  format.ts
  locale-meta.ts
  dictionary-parity.test.ts
  placeholder-parity.test.ts

app/src/components/layout/
  AppLayout.tsx
  AppSidebar.tsx
  PrimeCommandPalette.tsx

app/src/components/system/
  LanguageSwitcher.tsx

app/src/pages/
  Auth.tsx
  Settings.tsx
  Products.tsx
  ProductDetail.tsx
  ProductCreatePage.tsx
  Listings.tsx
  Inventory.tsx
  Warehouses.tsx
  Orders.tsx
  OrderDetail.tsx
  Fulfillment.tsx
  FulfillmentJobDetail.tsx
  Returns.tsx
  ReturnDetail.tsx

app/src/pages/prime/
  PrimeOverview.tsx
  PrimeTowerPage.tsx
  CommerceSurfacePage.tsx
  CosPolicyRulePage.tsx
  CosEventAuditPage.tsx
```

## 10. Milestone Plan

### M1: Audit + Foundation

Duration: 1-2 working sessions

Deliverables:

- i18n audit docs
- typed dictionary shape
- locale metadata
- dictionary parity test
- placeholder parity test

### M2: Shell + Settings + Auth

Duration: 1 working session

Deliverables:

- language switcher
- translated shell/sidebar/topbar
- translated auth/settings
- persistence QA

### M3: COS Full Localization

Duration: 2-3 working sessions

Deliverables:

- full COS route translation
- enum/status mapping
- COS route QA matrix

### M4: Demand + Customer Localization

Duration: 2-3 working sessions

Deliverables:

- Demand route translation
- Customer route translation
- business term consistency check

### M5: Intelligence + Finance Localization

Duration: 1-2 working sessions

Deliverables:

- overview/launch/intelligence decision language
- finance route language
- BOD demo flow in 3 languages

### M6: Full QA + Polish

Duration: 1-2 working sessions

Deliverables:

- Playwright 3-locale route matrix
- no missing translation warnings
- no overflow on mobile/tablet/desktop
- final docs and demo script

## 11. Acceptance Criteria

Platform is considered done when:

1. User can switch between `en-US`, `ja-JP`, `vi-VN`.
2. Language persists after reload.
3. Auth, shell, sidebar, command palette, settings are localized.
4. COS is fully localized.
5. Demand Area is fully localized.
6. Customer Area is fully localized.
7. Intelligence Area is fully localized.
8. Finance Area is fully localized.
9. Dynamic statuses/enums use localization helpers.
10. Dates/numbers/money use locale-aware formatting.
11. No missing translation warning appears during route QA.
12. 3-locale Playwright matrix passes.
13. No route has document overflow caused by translated text.
14. Canonical IDs/mock data remain stable across locales.
15. Documentation explains translation workflow and style guide.

## 12. Open Questions

1. Có cần thêm Chinese Traditional (`zh-TW`) thay cho một trong ba ngôn ngữ không?
2. Vietnamese tone nên là SME-friendly tiếng Việt tự nhiên hay enterprise Vietnamese formal?
3. Japanese tone nên dùng B2B business Japanese formal hay SME operator Japanese đơn giản?
4. Currency display should follow data source currency or user locale by default?
5. Có cần URL locale prefix như `/vi/overview` trong phase sau không?

## 13. Recommended Next Step

Start with M1:

- create `docs/i18n`
- run hardcoded string audit
- create typed dictionary parity tests
- add locale metadata
- define translation style guide before translating large surfaces

This avoids a common failure mode: translating many strings first, then discovering inconsistent keys, duplicate business terms, and missing route coverage later.
