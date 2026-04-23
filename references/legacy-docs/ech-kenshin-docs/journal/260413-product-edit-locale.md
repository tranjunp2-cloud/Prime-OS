# 260413 — Locale Switcher cho ProductEdit

## Tóm tắt

Thêm locale switcher vào trang ProductEdit để người dùng chuyển đổi giữa các locale đang active và chỉnh sửa dữ liệu sản phẩm theo từng ngôn ngữ. BE + data model đã hỗ trợ multi-locale từ trước — chỉ còn thiếu UI phía FE.

## Thay đổi

**File mới:**

- `lib/api/services/locales.ts` — API service cho `GET /pm/locales`, interface `OrgLocaleResponse` có typing đầy đủ.
- `hooks/api/use-locales.ts` — Hook `useOrgLocales()` với React Query, filter `isActive=true`, chuyển đổi `code` (BE `en_US`) ↔ `ietfCode` (IETF `en-US`) tập trung tại đây. Export `LOCALE_META` map cho label + flag.
- `components/product/locale-switcher.tsx` — Dropdown shadcn Select nhỏ gọn, hiển thị flag emoji + language label, loading spinner khi đang fetch.

**File sửa:**

- `pages/ProductEdit.tsx` — Thêm state `selectedLocale` (init từ `useI18n().locale`), đổi `useProductDetail(id, selectedLocale)` để reactive khi chuyển locale. `useEffect` reset `valuesInitialized = false` khi locale thay để form re-init với giá trị locale mới. Đặt `LocaleSwitcher` ở header bên phải, giữa các nút action.
- `lib/i18n/dictionaries.ts` — Thêm i18n label `localeSwitcher` + `localeSwitcherAria` cho en-US / ja-JP / vi-VN.

## Thiết kế

- Locale switch trigger full re-fetch `useProductDetail` — React Query cache giúp tránh fetch trùng lặp không cần thiết.
- Reset form state trên locale switch ngăn giá trị cũ từ locale trước persist sang form.
- Chuyển đổi format `en_US` ↔ `en-US` tập trung trong `use-locales.ts`, không rải khắp codebase.
- `LOCALE_META` fallback về `🌐 + name` cho locale không nhận diện được.

## Metrics

- 4 phase hoàn tất: locales hook → switcher component → ProductEdit integration → i18n labels.
- 0 TypeScript error.
- Tất cả phase plan đã update `status: completed`.
