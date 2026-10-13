# PRIME OS — Bóc tách Design System hiện tại

**Ngày audit:** 09/10/2026  
**Nhánh:** `feat/global-system-structure`  
**Snapshot code:** `0bc504a`  
**Mục đích:** tài liệu đối chiếu implementation cho Dev và Design; mô tả trạng thái đang có, tách riêng đề xuất chuẩn hóa.

## Phạm vi và phương pháp

- Rà cấu trúc monorepo `apps/web`, `apps/admin`, `apps/api`, `packages`; tập trung kiểm kê UI tại 548 file source không phải test trong `apps/web/src` và `apps/admin/src` (TS, TSX, JS, JSX, CSS). API và package nghiệp vụ không phải thư viện UI.
- Đọc cấu hình Tailwind, CSS toàn cục, CSS Modules, theme workspace, primitives, system patterns và component nghiệp vụ. Dùng TypeScript AST lấy export, props khai báo, CVA variants; dùng PostCSS đọc declarations; dùng Tailwind `resolveConfig` xác nhận scale kế thừa.
- Inventory ghi nhận **51 file TSX trong `components/ui`**, cùng system patterns, app shell và component domain/feature trong phụ lục. Số module/export không đồng nghĩa số component thực sự tái sử dụng: có compound parts, aliases, provider và component chỉ dành cho một workflow.
- `references/prototypes-suite` là tư liệu prototype; test, docs, asset ảnh/SVG tĩnh, output build và dependency bên ngoài không được gộp vào thống kê UI runtime. Font nhúng trong asset hoặc màu cấu hình do người dùng nhập không thuộc inventory tĩnh này.
- Tần suất class là số lần khai báo trong string/template source, **không phải số lần render**, mức độ phủ route hay số người dùng bị ảnh hưởng. Quét tĩnh không chứng minh component còn được sử dụng và không thay thế kiểm tra UI từng trạng thái.
- Chưa chạy visual regression, đo contrast hoặc kiểm tra mọi viewport. Những rủi ro runtime được ghi là cần xác minh; không kết luận toàn bộ UI đạt accessibility.

Đường dẫn source trong bộ tài liệu trỏ tới commit cố định trên GitHub để team có thể đối chiếu; các liên kết phụ lục dùng đường dẫn tương đối, nên giữ bốn file Markdown cùng thư mục.

### Bộ tài liệu

- [Phụ lục A — Toàn bộ token declarations, resolved Tailwind scale và CSS kích thước/hiệu ứng](01-token-reference.md)
- [Phụ lục B — Component exports, file path, props API và CVA variants](02-component-inventory.md)
- [Phụ lục C — Toàn bộ arbitrary values, literal colors và palette classes kèm vị trí](03-style-exceptions.md)

## 1. Design Tokens hiện tại

### 1.1 Kiến trúc token và thứ tự áp dụng

Web dùng React 18, Tailwind 3, shadcn style `new-york`, Radix primitives, `class-variance-authority`, `clsx`/`tailwind-merge` và Lucide. Đây là hệ thống đã tùy biến trên nền primitives, chưa phải package Design System dùng chung giữa các ứng dụng.

| Lớp | Nguồn | Vai trò |
| --- | --- | --- |
| Token gốc web | `apps/web/src/index.css`, `:root` / `.dark` | HSL color channels, surface/status/chart, radius, motion, focus, layout |
| Tailwind adapter | `apps/web/tailwind.config.js` | Ánh xạ một phần tokens thành utilities; typography và radius |
| Workspace | `.workspace-theme-main`, `.workspace-theme-pos`, `.workspace-theme-primeweb` | Override primary/ring và palette từng workspace |
| PrimeWeb bổ sung | `features/primeweb/primeweb.css` | Token HSL lẫn full CSS color, dashboard/editor, CSS component riêng |
| CSS component | `components/products/*.module.css`, `pages/seller-onboarding.css`, `components/orders/order-navigation.css` | Layout và chi tiết riêng từng tính năng |
| Admin | `apps/admin/src/index.css` | Hệ token hex/rgba và component CSS độc lập; không dùng primitives web |

`AppLayout` chọn Main cho route thông thường, POS cho `/pos`, PrimeWeb cho `/builder`. Vì vậy `--primary` trong `:root` **không phải màu primary cuối cùng của mọi màn hình**. `.app-sidebar-light` cũng ghi đè nhóm token sidebar. PrimeWeb có selector lặp `.workspace-theme-primeweb.workspace-theme-primeweb` và override không nằm trong Tailwind layer, cần đọc toàn bộ cascade thay vì lấy riêng bảng root.

### 1.2 Màu sắc — token gốc light/dark

Giá trị dưới đây là **HSL channels**, ví dụ `244 100% 50%` phải dùng `hsl(var(--primary))`. Dấu “kế thừa” nghĩa là `.dark` không khai báo lại. Đây là bảng root, chưa áp dụng workspace/sidebar override.

| Token | Light | Dark |
| --- | --- | --- |
| `--background` | `0 0% 98%` | `240 11% 7%` |
| `--foreground` | `0 0% 4%` | `240 12% 95%` |
| `--card` | `0 0% 100%` | `240 16% 13%` |
| `--card-foreground` | `0 0% 4%` | `240 12% 95%` |
| `--popover` | `0 0% 100%` | `240 20% 15%` |
| `--popover-foreground` | `0 0% 4%` | `240 12% 95%` |
| `--primary` | `244 100% 50%` | `244 100% 60%` |
| `--primary-foreground` | `0 0% 100%` | `0 0% 100%` |
| `--primary-hover` | `244 100% 40%` | `244 100% 66%` |
| `--primary-soft` | `244 100% 97%` | `244 55% 19%` |
| `--brand-secondary` | `25 100% 50%` | `25 100% 58%` |
| `--secondary` | `0 0% 96%` | `240 16% 13%` |
| `--secondary-foreground` | `0 0% 10%` | `240 12% 95%` |
| `--muted` | `0 0% 96%` | `240 20% 15%` |
| `--muted-foreground` | `0 0% 36%` | `219 7% 65%` |
| `--accent` | `240 12% 96%` | `240 19% 18%` |
| `--accent-foreground` | `0 0% 10%` | `240 12% 95%` |
| `--destructive` | `0 84% 60%` | `0 79% 63%` |
| `--destructive-foreground` | `0 0% 100%` | `0 0% 100%` |
| `--success` | `160 84% 39%` | `148 65% 54%` |
| `--success-foreground` | `0 0% 100%` | `240 11% 7%` |
| `--warning` | `38 92% 50%` | `48 100% 47%` |
| `--warning-foreground` | `0 0% 12%` | `240 11% 7%` |
| `--amazon` | `35 100% 50%` | `35 100% 50%` |
| `--shopee` | `17 100% 55%` | `17 100% 55%` |
| `--rakuten` | `350 75% 50%` | `350 75% 50%` |
| `--border` | `240 12% 92%` | `240 14% 20%` |
| `--input` | `240 12% 92%` | `240 14% 20%` |
| `--ring` | `244 100% 50%` | `244 100% 66%` |
| `--ring-accent` | `25 100% 50%` | `25 100% 58%` |
| `--surface-stage` | `0 0% 98%` | `240 11% 7%` |
| `--surface-sidebar` | `0 0% 100%` | `240 16% 13%` |
| `--surface-toolbar` | `0 0% 100%` | `240 17% 12%` |
| `--surface-workspace` | `0 0% 100%` | `240 11% 7%` |
| `--surface-data` | `0 0% 100%` | `240 16% 13%` |
| `--surface-map` | `240 12% 96%` | `220 58% 8%` |
| `--surface-control` | `0 0% 100%` | `240 20% 15%` |
| `--surface-overlay` | `0 0% 100%` | `240 20% 15%` |
| `--surface-command` | `0 0% 100%` | `240 20% 15%` |
| `--surface-selected` | `244 100% 97%` | `244 55% 18%` |
| `--surface-row-hover` | `240 12% 96%` | `240 20% 15%` |
| `--surface-row-selected` | `244 100% 97%` | `244 55% 15%` |
| `--surface-hover` | `240 12% 96%` | `240 20% 15%` |
| `--surface-glass` | `0 0% 100%` | `240 18% 14%` |
| `--surface-highlight` | `0 0% 100%` | `0 0% 100%` |
| `--overlay-scrim` | `223 40% 8%` | `240 35% 5%` |
| `--border-divider` | `240 12% 92%` | `240 14% 20%` |
| `--border-highlight` | `0 0% 100%` | `0 0% 100%` |
| `--border-active` | `244 100% 50%` | `244 100% 66%` |
| `--sidebar-background` | `240 10% 6%` | `240 10% 6%` |
| `--sidebar-foreground` | `240 12% 94%` | `240 12% 94%` |
| `--sidebar-primary` | `244 100% 64%` | `244 100% 60%` |
| `--sidebar-primary-foreground` | `0 0% 100%` | `0 0% 100%` |
| `--sidebar-accent` | `240 8% 13%` | `240 8% 13%` |
| `--sidebar-accent-foreground` | `240 12% 96%` | `240 12% 95%` |
| `--sidebar-border` | `240 8% 17%` | `240 8% 17%` |
| `--sidebar-ring` | `244 100% 64%` | `244 100% 66%` |
| `--chart-1` | `244 100% 50%` | `244 100% 66%` |
| `--chart-2` | `160 84% 39%` | `148 65% 54%` |
| `--chart-3` | `38 92% 50%` | `48 100% 47%` |
| `--chart-4` | `17 100% 55%` | `17 100% 55%` |
| `--chart-5` | `350 75% 50%` | `0 79% 63%` |
| `--map-background` | `216 57% 10%` | `219 63% 6%` |
| `--map-land` | `214 43% 24%` | `213 61% 13%` |
| `--map-border` | `211 34% 48%` | `209 48% 23%` |
| `--map-focused` | `239 76% 67%` | `243 75% 59%` |
| `--map-hover` | `209 55% 38%` | `212 56% 27%` |
| `--text-primary` | `0 0% 4%` | `240 12% 95%` |
| `--text-secondary` | `0 0% 36%` | `219 7% 65%` |
| `--text-tertiary` | `0 0% 61%` | `219 6% 53%` |
| `--text-disabled` | `0 0% 68%` | `219 6% 42%` |
| `--text-metadata` | `0 0% 36%` | `219 7% 57%` |
| `--text-identifier` | `0 0% 34%` | `219 7% 67%` |
| `--decision-go` | `160 84% 39%` | `148 65% 54%` |
| `--decision-review` | `38 92% 50%` | `48 100% 47%` |
| `--decision-hold` | `33 95% 52%` | `32 94% 60%` |
| `--decision-no-go` | `0 84% 60%` | `0 79% 63%` |
| `--status-active` | `160 84% 39%` | `148 65% 54%` |
| `--status-ready` | `239 84% 67%` | `236 57% 60%` |
| `--status-review` | `38 92% 50%` | `48 100% 47%` |
| `--status-hold` | `33 95% 52%` | `32 94% 60%` |
| `--status-blocked` | `0 84% 60%` | `0 79% 63%` |
| `--status-paused` | `0 0% 42%` | `219 7% 57%` |
| `--status-completed` | `160 84% 39%` | `148 65% 54%` |
| `--status-suppressed` | `0 0% 42%` | `219 7% 57%` |
| `--area-intelligence` | `243 75% 59%` | `236 57% 60%` |
| `--area-crm` | `38 92% 50%` | `48 100% 47%` |
| `--area-customer` | `160 84% 39%` | `148 65% 54%` |
| `--area-ecom` | `209 85% 52%` | `200 84% 60%` |
| `--area-finance` | `158 64% 39%` | `158 64% 52%` |

#### Workspace, sidebar và admin

| Scope | Primary light | Primary dark | Lưu ý |
| --- | --- | --- | --- |
| Root web | `244 100% 50%` | `244 100% 60%` | Giá trị fallback |
| Main | `244 82% 59%` | `244 100% 66%` | Ghi đè primary, hover, soft, ring, border-active |
| POS | `32 95% 44%` | `32 95% 58%` | Cam theo workspace |
| PrimeWeb trong index.css | `158 84% 34%` | `158 64% 48%` | Bị stylesheet PrimeWeb bổ sung override |
| PrimeWeb sau stylesheet feature | `--p-teal-600 = 180.28 100% 41.57%` | `--p-teal-400 = 172.46 66.01% 50.39%` | Primary foreground chuyển sang slate đậm; không phải trắng |
| Admin | `#5b5fe9` | `#7b7ff0` | Full CSS color, dùng `var(--primary)` trực tiếp |

Sidebar root là tối ngay cả khi web light; `.app-sidebar-light` đổi sang trắng khi light và quay về tối khi dark. Không dùng root sidebar palette để duyệt thiết kế sidebar mà bỏ qua class này.

**Các nhóm đã tồn tại nhưng chưa được đưa đầy đủ vào Tailwind colors:** `success`, `warning`, marketplace, `surface-*`, `text-*`, `status-*`, `decision-*`, `chart-*`, `map-*`, `area-*`. Một số có custom CSS utility như `.text-warning`, `.bg-success`, `.surface-solid`; các nhóm khác được tham chiếu bằng CSS hoặc arbitrary values.

**Semantic status còn có hai nguồn:** token CSS `--status-*` / `--decision-*` và bảng `TONE_CLASS_NAMES` trong `components/system/semantic-helpers.ts` sử dụng palette Tailwind trực tiếp. Mapping nghiệp vụ đã tập trung một phần, nhưng thay đổi token status chưa chắc đổi được mọi badge.

#### Màu literal ngoài token

Hex ở nơi định nghĩa token là hợp lệ. Debt cần xét là literal nằm trong JSX, inline style, chart config, CSS declaration dùng trực tiếp. Các ví dụ đã thấy:


| Giá trị / nhóm | Nguồn tiêu biểu | Phân loại |
| --- | --- | --- |
| `bg-[#635bff]`, `bg-[#9aa5bd]`, `bg-[#98a2b3]` | [apps/web/src/pages/prime/PrimeGrowthOSPage.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/pages/prime/PrimeGrowthOSPage.tsx) | Màu UI cục bộ; nên mapping semantic hoặc chart token |
| `#635bff`, `#38bdf8`, `#818cf8` | [apps/web/src/pages/prime/PrimeClientReportsPage.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/pages/prime/PrimeClientReportsPage.tsx) | Palette chart riêng; cần chart series contract |
| `#3b82f6` | [apps/web/src/components/inventory/ATSBucketChart.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/inventory/ATSBucketChart.tsx) | Màu chart trực tiếp |
| `#EE4D2D`, `#BF0000`, `#FF9900` | [apps/web/src/components/channels/ChannelLogo.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/channels/ChannelLogo.tsx) | Brand identity; không thay tất cả thành primary, nên gom registry |
| `#FFFFFF`, các màu brand | [apps/web/src/components/system/ChannelBrand.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/system/ChannelBrand.tsx) | Hệ brand thứ hai cần đối chiếu với ChannelLogo |
| `rgba(255,255,255,0.04)`, `rgba(99,102,241,0.15)` | Phụ lục C — shadow arbitrary | Hiệu ứng literal thay vì shadow token |
| `#fff`, `rgba(93,116,246,...)`, `#7a57d6`, `#63748f` | [apps/admin/src/index.css](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/admin/src/index.css) | Màu CSS trực tiếp song song với token admin |

Danh sách literal đầy đủ và từng vị trí ở Phụ lục C. Màu tên như `white`, `transparent`, `currentColor` và palette `bg-slate-*` không phải hex/rgb, nhưng vẫn cần phân biệt fixed color với semantic color. Chart wrapper còn có selector khớp `stroke='#ccc'`; đây là nhận diện markup Recharts, không nên coi là màu palette mới cần thay hàng loạt.

### 1.3 Typography

| Vai trò | Family / nguồn | Ghi nhận |
| --- | --- | --- |
| Body web | DM Sans → system sans | Google Fonts, weights 400/500/600/700 |
| Heading web | General Sans → DM Sans → system | Fontshare, weights 500/600/700; áp dụng `h1`, `h2`, `h3`, `.font-display` |
| Code / identifier | JetBrains Mono → system monospace | Google Fonts, weights 400/500/600; `font-mono`, `.font-identifier` |
| PrimeWeb container | Inter → system sans | Override family tại workspace; heading vẫn chịu rule family toàn cục nếu không override riêng |
| Admin | DM Sans → Inter → system sans | Có khai báo family trong CSS; không thấy import font trong entry HTML/CSS admin, nên font thực tế phụ thuộc khả năng tải/cài sẵn |

Khai báo `font-family` không chứng minh font đã tải thành công. Không có kiểm tra network font trong audit này.

**Type scale khai báo riêng trong Tailwind:**

| Utility | Font size | Line-height mặc định | Vai trò đang thấy |
| --- | --- | --- | --- |
| `text-xs` | 12px | 16px | Metadata, badge, helper, table phụ |
| `text-sm` | 14px | 20px | Body ứng dụng, controls |
| `text-base` | 16px | 24px | Body lớn / tiêu đề nhỏ |
| `text-lg` | 18px | 28px | Section heading |
| `text-xl` | 20px | 28px | Dialog / sheet heading |
| `text-2xl` | 24px | 32px | Page title / KPI |
| `text-3xl` | 30px | 36px | Page title responsive |
| `text-4xl` | 36px | 40px | KPI / hero |

`text-5xl`, `text-6xl` vẫn được sử dụng và kế thừa default Tailwind: 48px/1 và 60px/1 khi root 16px. Không có bộ semantic typography như `body-sm`, `label`, `caption`, `page-title`; phần lớn chọn utility trực tiếp.


| Utility typography | Số lần khai báo tĩnh |
| --- | --- |
| text-xs | 2420 |
| text-sm | 2164 |
| text-base | 192 |
| text-2xl | 115 |
| text-lg | 81 |
| text-xl | 73 |
| text-3xl | 31 |
| text-4xl | 10 |
| text-5xl | 3 |
| text-6xl | 1 |

**Weights thực sự xuất hiện:** `font-normal` 400, `font-medium` 500, `font-semibold` 600, `font-bold` 700, `font-black` 900. Admin có `font-weight: 800` cho `.metric-value`. Weight 800/900 nằm ngoài các weight web đang yêu cầu tải; cần kiểm tra synthetic bold/fallback nếu giữ lại.

**Line-height override phổ biến:** `leading-5` = 20px, `leading-6` = 24px, `leading-4` = 16px, `leading-7` = 28px; `leading-none` = 1, `tight` = 1.25, `snug` = 1.375, `relaxed` = 1.625. Chúng ghi đè line-height đi kèm font-size.

**Nhánh typography riêng:** seller onboarding dùng 10/11/12/13/14/19/26/28/32px và `clamp(26px, 2.6vw, 34px)`; PrimeWeb dùng body 14px, control 13px, h1 27px (mobile 23px); admin dùng nhiều rem lẻ và heading `clamp(2rem, 3.4vw, 3rem)`. Chưa có semantic scale chung bao phủ những nhánh này.

### 1.4 Spacing và Layout scale

Không có override `theme.spacing`; web kế thừa Tailwind scale. Quy đổi dưới đây giả định root 16px:

| Scale | px | Scale | px | Scale | px |
| --- | --- | --- | --- | --- | --- |
| 0.5 | 2 | 1 | 4 | 1.5 | 6 |
| 2 | 8 | 2.5 | 10 | 3 | 12 |
| 3.5 | 14 | 4 | 16 | 5 | 20 |
| 6 | 24 | 8 | 32 | 9 | 36 |
| 10 | 40 | 11 | 44 | 12 | 48 |
| 14 | 56 | 16 | 64 | 20 | 80 |

Scale là utility gốc, chưa có aliases theo ngữ nghĩa như `space-field`, `space-section`, `page-gutter`.


| Spacing phổ biến | Số lần khai báo tĩnh |
| --- | --- |
| gap-2 | 1397 |
| gap-3 | 1037 |
| mt-1 | 957 |
| p-3 | 577 |
| p-4 | 552 |
| mt-2 | 497 |
| px-4 | 444 |
| px-3 | 419 |
| gap-4 | 412 |
| py-3 | 398 |
| mt-3 | 367 |
| gap-1 | 274 |

**Layout tokens root web:**

| Token | Giá trị | Quy đổi |
| --- | --- | --- |
| `--header-height` | 4rem | 64px |
| `--sidebar-width-compact` | 4.75rem | 76px |
| `--sidebar-width-expanded` | 14.25rem | 228px |
| `--row-height-compact` | 2.25rem | 36px |
| `--row-height-default` | 2.75rem | 44px |
| `--command-palette-width` | 40rem | 640px |

App shell dùng token header/sidebar. `components/ui/sidebar.tsx` còn có hệ riêng: desktop 16rem, mobile 18rem, icon 3rem. Đây là hai contract sidebar tồn tại trong source; chưa kết luận cả hai đang hiển thị ở các route.

**Container và panel:** không thấy cấu hình `theme.container` riêng. Thường dùng `w-full`, `max-w-*`, grid và overflow tùy màn hình. `max-w-3xl` = 768px, `2xl` = 672px, `md` = 448px, `4xl` = 896px, `5xl` = 1024px, `6xl` = 1152px; Dialog mặc định `max-w-lg` = 512px. `max-w-[1600px]` xuất hiện 9 lần trong source. PrimeWeb `.pw-page` có max-width 1440px. Không có một token content width chung cho toàn bộ ứng dụng.

**Breakpoints:**

| Hệ | Giá trị | Cách dùng |
| --- | --- | --- |
| Tailwind web | sm 640, md 768, lg 1024, xl 1280, 2xl 1536px | min-width, mobile-first |
| Admin CSS | 1440, 1080, 720px | max-width |
| Seller onboarding | 900, 700px | max-width |
| PrimeWeb CSS | 1400, 1150, 767, 600px; thêm min-width 1500px | Editor/feature riêng |

Breakpoint đặc thù editor có thể hợp lý; cần đặt tên, lý do và test matrix thay vì buộc mọi màn hình dùng cùng một breakpoint.

### 1.5 Shadows, Border Radius, Transitions

**Radius web:** `--radius = 0.5rem` (8px). Tailwind `sm = radius - 4px` → 4px, `md = radius - 2px` → 6px, `lg = radius` → 8px, `xl = radius + 4px` → 12px. CSS còn khai báo `--radius-sm/md/lg/xl` lần lượt 4/6/8/12px; giá trị trùng nhưng chưa cùng một cách dẫn xuất. `rounded` kế thừa 4px, `rounded-2xl` 16px, `rounded-full` 9999px.

`rounded-lg` được khai báo 1.444 lần; `rounded-full` 441; `rounded-md` 425; `rounded-xl` 269. Admin khai báo `--radius: 10px` nhưng nhiều component dùng trực tiếp 8px/10px/999px. Product CSS Modules còn có radius 14px/28px; onboarding card 16px. Đây là variation cần quyết định, chưa phải lỗi ở mọi trường hợp.

**Semantic shadows:**

| Token | Light | Dark |
| --- | --- | --- |
| `--shadow-surface` | `0 1px 2px hsl(var(--overlay-scrim) / .06)` | cùng offset/blur, alpha .16 |
| `--shadow-panel` | `0 12px 34px ... / .10` | `0 16px 44px ... / .24` |
| `--shadow-command` | `0 18px 48px ... / .12` | cùng offset/blur, alpha .28 |

Có `.surface-shadow`, `.panel-shadow` và surface classes dùng token. Song song đó `shadow-sm` (229 khai báo), `shadow-md/lg/xl/2xl`, `shadow-inner` vẫn dùng default Tailwind. Ví dụ `shadow-sm = 0 1px 2px 0 rgb(0 0 0 / .05)`; không tự đổi theo `--shadow-surface`. Bảng giá trị đầy đủ ở Phụ lục A.

**Motion:** `--motion-fast = 150ms`, `--motion-standard = 200ms`, `--motion-slow = 300ms`, `--motion-ease = cubic-bezier(.2,0,0,1)`. Có `.prime-transition`, `.prime-transition-fast` và rule button toàn cục. Accordion 200ms ease-out. Dialog 200ms; Sheet mở 500ms, đóng 300ms; CSS Modules có 180ms; PrimeWeb dùng `.15s`. Chưa có một bộ motion roles được mọi primitive dùng chung.

**Focus:** root `--focus-ring-size = 3px`, offset 2px, alpha ring .28 light / .34 dark. Rule `:focus-visible` toàn cục dùng box-shadow; Input tự dùng ring-1, Button/textarea ring-2; PrimeWeb có outline 2px riêng. Cần đối chiếu cascade để chuẩn hóa hình thức focus, không kết luận focus biến mất nếu chưa kiểm tra runtime.

Có `prefers-reduced-motion` trong web/admin và override feature; đây là nền tảng tốt. Các animation Framer Motion/JS vẫn cần xác minh riêng, vì CSS media query không đảm bảo dừng animation do JavaScript điều khiển.

## 2. Inventory Component UI

### 2.1 Cách đọc API

Bảng dưới là contract chính để chọn component. Phụ lục B liệt kê từng file, từng exported part, props TypeScript khai báo và CVA config nguyên bản. “Props Radix” nghĩa là component kế thừa type của primitive, không tự khai báo lại tất cả event/native props. Không giả định mọi component đều có `variant`, `size` hay `asChild`.

**Button có variant tên `default`, không có variant tên `primary`.** Card/Input không có CVA variants; tùy biến hiện chủ yếu qua `className`.

### 2.2 Toàn bộ 51 module UI primitives


| Module | File | Props API chính | Variants / lưu ý |
| --- | --- | --- | --- |
| accordion | [apps/web/src/components/ui/accordion.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/accordion.tsx) | Radix single/multiple, value/onValueChange, collapsible | Item/Trigger/Content; animation 200ms |
| alert-dialog | [apps/web/src/components/ui/alert-dialog.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/alert-dialog.tsx) | Radix AlertDialog; action/cancel dùng button styles | Confirmation dialog |
| alert | [apps/web/src/components/ui/alert.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/alert.tsx) | HTML div + variant; Title, Description | default/destructive |
| aspect-ratio | [apps/web/src/components/ui/aspect-ratio.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/aspect-ratio.tsx) | Radix AspectRatio alias, ratio | Không có visual variant |
| avatar | [apps/web/src/components/ui/avatar.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/avatar.tsx) | Radix Avatar/Image/Fallback props + ref | Image fallback |
| badge | [apps/web/src/components/ui/badge.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/badge.tsx) | HTML div + `variant`, `className` | default/secondary/destructive/warning/outline |
| breadcrumb | [apps/web/src/components/ui/breadcrumb.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/breadcrumb.tsx) | HTML nav/list/link; BreadcrumbLink asChild; separator children | Compound breadcrumb parts |
| button | [apps/web/src/components/ui/button.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/button.tsx) | Native button + `asChild`, `variant`, `size`, ref | variant: default/destructive/outline/secondary/ghost/link; size: default/sm/lg/icon |
| calendar | [apps/web/src/components/ui/calendar.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/calendar.tsx) | DayPicker ComponentProps, classNames, showOutsideDays | Calendar; buttonVariants navigation |
| card | [apps/web/src/components/ui/card.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/card.tsx) | HTML attrs + refs; Card/Header/Footer/Title/Description/Content | Không có variant; nền card, radius-lg, shadow-sm |
| carousel | [apps/web/src/components/ui/carousel.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/carousel.tsx) | Embla opts/plugins/orientation/setApi + HTML props | horizontal/vertical; content/item/previous/next |
| chart | [apps/web/src/components/ui/chart.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/chart.tsx) | ChartContainer config + Recharts ResponsiveContainer; tooltip/legend props | Color config hoặc theme config; indicators dot/line/dashed |
| checkbox | [apps/web/src/components/ui/checkbox.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/checkbox.tsx) | Radix checked/defaultChecked/onCheckedChange/disabled + ref | State checked/unchecked/indeterminate |
| collapsible | [apps/web/src/components/ui/collapsible.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/collapsible.tsx) | Radix Root/Trigger/Content aliases | open/defaultOpen/onOpenChange |
| command | [apps/web/src/components/ui/command.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/command.tsx) | cmdk primitive props; CommandDialog dùng DialogProps | Input/List/Empty/Group/Separator/Item/Shortcut |
| context-menu | [apps/web/src/components/ui/context-menu.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/context-menu.tsx) | Radix context-menu props + inset ở một số part | Menu chuột phải; checkbox/radio/sub-menu |
| demo | [apps/web/src/components/ui/demo.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/demo.tsx) | Component minh họa trong source; props xem phụ lục | Không mặc định coi là primitive production |
| dialog | [apps/web/src/components/ui/dialog.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/dialog.tsx) | Radix Root/Trigger/Close; Content thêm `overlayClassName` | Không có size variant; max-w-lg mặc định |
| drawer | [apps/web/src/components/ui/drawer.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/drawer.tsx) | Vaul Root props, `shouldScaleBackground`; compound parts | Bottom drawer; không đồng nghĩa Sheet |
| dropdown-menu | [apps/web/src/components/ui/dropdown-menu.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/dropdown-menu.tsx) | Radix menu props; Item/Label/SubTrigger hỗ trợ inset | Item, checkbox, radio, sub-menu, separator, shortcut |
| form-field | [apps/web/src/components/ui/form-field.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/form-field.tsx) | `label`, `htmlFor?`, `required?`, `error?`, `helper?`, `children`, `className?` | Wrapper label/feedback; trùng tên FormField của form.tsx |
| form | [apps/web/src/components/ui/form.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/form.tsx) | React Hook Form Provider/Controller; FormField dùng `name/control/render` | FormItem/Label/Control/Description/Message; form context |
| hover-card | [apps/web/src/components/ui/hover-card.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/hover-card.tsx) | Radix Root/Trigger/Content, delay/align/sideOffset | Hover content |
| input-otp | [apps/web/src/components/ui/input-otp.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/input-otp.tsx) | input-otp props; Slot index + HTML props | OTP input/group/slot/separator |
| input | [apps/web/src/components/ui/input.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/input.tsx) | Native input + ref, `className` | Không có variant; h-9 = 36px |
| label | [apps/web/src/components/ui/label.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/label.tsx) | Radix Label props + ref, CVA base | Không có lựa chọn variant riêng |
| menubar | [apps/web/src/components/ui/menubar.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/menubar.tsx) | Radix Menubar props + inset ở một số part | Menu bar; checkbox/radio/sub-menu |
| navigation-menu | [apps/web/src/components/ui/navigation-menu.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/navigation-menu.tsx) | Radix NavigationMenu props; viewport parts | Trigger style helper; không business variant |
| pagination | [apps/web/src/components/ui/pagination.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/pagination.tsx) | HTML nav/ul/li; PaginationLink isActive/size | Tái dùng buttonVariants, previous/next/ellipsis |
| popover | [apps/web/src/components/ui/popover.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/popover.tsx) | Radix Root/Trigger/Content props, align/sideOffset | Content căn giữa mặc định |
| progress | [apps/web/src/components/ui/progress.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/progress.tsx) | Radix Progress props, value | Transform indicator theo value |
| radio-group | [apps/web/src/components/ui/radio-group.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/radio-group.tsx) | Radix RadioGroup/Item value/onValueChange | Radio group/item |
| resizable | [apps/web/src/components/ui/resizable.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/resizable.tsx) | react-resizable-panels props; Handle thêm withHandle | PanelGroup/Panel/Handle |
| scroll-area | [apps/web/src/components/ui/scroll-area.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/scroll-area.tsx) | Radix ScrollArea props; ScrollBar orientation | vertical/horizontal scrollbar |
| select | [apps/web/src/components/ui/select.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/select.tsx) | Radix Select: value/defaultValue/onValueChange, disabled; compound parts | Trigger h-9; Content position item-aligned/popper |
| separator | [apps/web/src/components/ui/separator.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/separator.tsx) | Radix orientation/decorative props | horizontal/vertical |
| sheet | [apps/web/src/components/ui/sheet.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/sheet.tsx) | Radix Dialog; SheetContent thêm `side` | top/bottom/left/right; default right |
| sidebar | [apps/web/src/components/ui/sidebar.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/sidebar.tsx) | Provider controlled/uncontrolled open; Sidebar side/variant/collapsible | left/right; sidebar/floating/inset; offcanvas/icon/none; menu button variants riêng |
| skeleton | [apps/web/src/components/ui/skeleton.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/skeleton.tsx) | HTML div attrs | animate-pulse, bg-muted |
| slider | [apps/web/src/components/ui/slider.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/slider.tsx) | Radix value/defaultValue/onValueChange, min/max/step | Range track/thumb |
| sonner | [apps/web/src/components/ui/sonner.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/sonner.tsx) | ComponentProps của Sonner, tích hợp resolvedTheme; export toast | Hệ toast đang mount trong App.tsx |
| switch | [apps/web/src/components/ui/switch.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/switch.tsx) | Radix checked/defaultChecked/onCheckedChange/disabled + ref | State checked/unchecked |
| table | [apps/web/src/components/ui/table.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/table.tsx) | HTML table parts + context variant, wrapperClassName ở Table | index / embedded / compact; default index |
| tabs | [apps/web/src/components/ui/tabs.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/tabs.tsx) | Radix value/defaultValue/onValueChange, orientation | Tabs/List/Trigger/Content |
| textarea | [apps/web/src/components/ui/textarea.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/textarea.tsx) | Native textarea + ref | min-height 80px, không CVA |
| theme-switch | [apps/web/src/components/ui/theme-switch.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/theme-switch.tsx) | HTML div attrs, đọc ThemeProvider; default export | Switch light/dark |
| toast | [apps/web/src/components/ui/toast.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/toast.tsx) | Radix toast compound parts + variant | default/destructive; API use-toast riêng |
| toaster | [apps/web/src/components/ui/toaster.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/toaster.tsx) | Không props; đọc useToast rồi render Toast | Renderer của hệ toast Radix |
| toggle-group | [apps/web/src/components/ui/toggle-group.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/toggle-group.tsx) | Radix single/multiple; ToggleGroup và Item dùng variant/size | default/outline; default/sm/lg |
| toggle | [apps/web/src/components/ui/toggle.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/toggle.tsx) | Radix pressed/onPressedChange + variant/size | variant default/outline; size default/sm/lg |
| tooltip | [apps/web/src/components/ui/tooltip.tsx](https://github.com/primeproduction/prime-os/blob/0bc504a58e9c9781c54b2c18b975c594767cf25c/apps/web/src/components/ui/tooltip.tsx) | Radix Provider/Root/Trigger/Content, side/align/sideOffset | Content mặc định sideOffset 4 |

Ngoài 51 file TSX có `ui/use-toast.ts` là hook/API, không phải component. Inventory gồm code được scaffold hoặc chưa xác minh có consumer; không đồng nghĩa toàn bộ module đều đang được import vào app.

### 2.3 System patterns, app shell và domain components

**System layer đã có:** ActionToolbar, AlertSeverityBadge, ChannelBadge, ChannelMark, ChannelWordmark, ConfirmDialog, DataTable, DetailInfoCard, EmptyState, FiltersBar, PageDataState, PageHeader, PriorityBadge, SkuBadge, SlaIndicator, StatusBadge, SummaryMetricCard, SystemPageHeader, ThemeModeSwitcher, UserFeedbackWidget, WorkspacePageHeader, GlassPanel, SolidPanel, ToolbarSurface, WorkspacePane.

| Pattern | Props chính | Vai trò / variants |
| --- | --- | --- |
| SystemPageHeader | title, description, icon, metadata, status, primaryAction, secondaryActions, navigation, variant, className | workspace / collection / detail |
| PageHeader | title, description, actions, className | Wrapper SystemPageHeader collection; thêm page padding |
| WorkspacePageHeader | title, description, icon, titleAccessory, actions, className | Wrapper SystemPageHeader workspace |
| DataTable<T> | columns, data, keyExtractor, isLoading, emptyState, onRowClick, rowHref, rowState, rowLabel, totalCount, variant, classes | Shared table workflow; keyboard row action; không tự hàm ý có sorting/filtering/pagination |
| StatusBadge | status, domain?, fallbackLabel?, className? | Mapping theo domain; fallback secondary khi không có domain |
| ConfirmDialog | open, onOpenChange, title, description, onConfirm, confirmText, confirmingText, cancelText, variant, isConfirming | Shared confirm workflow |
| FiltersBar | search, primaryFilters, secondaryFilters, resultCount, clearAll, actions, children, className | Compose filter layout |
| PageDataState<T> | data, isLoading, error, refetch, isEmpty, skeleton, emptyTitle, emptyDescription, emptyIcon, mode, children | Loading/error/empty/content |
| EmptyState | title, description, icon, action, className, variant | empty / filtered / unavailable / error |
| SummaryMetricCard | label, value, meta, metaTooltip, status, icon, tone, loading, className, valueClassName | Metric pattern |
| PanelSurfaces | Native div props | GlassPanel / SolidPanel / ToolbarSurface / WorkspacePane |

**App shell:** AppLayout, AppHeader, AppSidebar, ContextSelector, WorkspaceSwitcher, PrimeCommandPalette, SidebarUserFooter, DemoModeTabs; workspace tabs có TabContentHost và WorkspaceTabBar. Đây là shared application shell, không nên nhập vào generic primitive package cùng Button/Input.

**Domain layers được inventory đầy đủ trong Phụ lục B:** channels, conversation-channels, copilot, dashboard, fulfillment, inventory, listings và các group editor, live-commerce, OMS, onboarding, orders, prime/customer-profile, products, workspace; cùng các UI trong `features`, bao gồm PrimeWeb. Props nghiệp vụ (Product, CatalogImportItem, VariantMappings, Order...) giữ type nguồn trong inventory.

Các dialog/drawer nghiệp vụ có thể tái sử dụng trong domain nhưng không phải generic modal. Đừng gom CreateShipmentDialog, ListingMasterReview và OrderProcessingDialog thành một component chỉ vì có cùng khung Dialog.

### 2.4 Trùng lặp và mức độ cần hợp nhất

| Nhóm | Chứng cứ | Đánh giá / hướng xử lý |
| --- | --- | --- |
| Hai FormField | `ui/form.tsx` và `ui/form-field.tsx` | Trùng tên, khác contract. Một bên Controller context, một bên wrapper label/error. Đổi tên wrapper thành FieldLayout hoặc chuẩn hóa cách compose |
| Form feedback | form-field tự clone id, render helper/error; form.tsx quản lý aria qua context | Wrapper đơn giản chưa tự nối aria-describedby/aria-invalid. Cần bổ sung contract accessibility, không chỉ đổi style |
| Button/Input ở web, admin, PrimeWeb, onboarding | ui/button/input; admin `.button/.input`; PrimeWeb `.pw-button`; seller `.seller-input` | Cùng chức năng nhưng height, radius, typography, state khác; chọn shared density/size contract rồi adapter theo app |
| Header wrappers | PageHeader, WorkspacePageHeader → SystemPageHeader | Đã dùng chung nền; **không phải duplicate cần xóa**. Làm rõ role và props naming |
| Status badge domain | OrderStatusBadge, JobStatusBadge và nhiều badge trong inventory/fulfillment | Một số đã gọi getStatusMeta, là wrapper domain hợp lý. Chuẩn hóa semantic mapping thay vì xóa wrappers |
| Brand rendering | channels/ChannelLogo và system/ChannelBrand, ChannelBadge | Chồng chéo registry/màu/logo; hợp nhất dữ liệu thương hiệu, giữ mark/wordmark/badge riêng |
| Toast | toast/toaster/use-toast và sonner | Hai API tồn tại; App hiện mount Sonner. Cần tìm consumer trước khi xóa legacy |
| Sidebar | layout/AppSidebar và ui/sidebar | Hai bộ kích thước/API; app shell đang dùng AppSidebar. Đánh giá consumers của generic Sidebar trước migration |
| Card/surface | ui/Card, PanelSurfaces, SummaryMetricCard, dashboard/KPICard, admin surface-card | Khác lớp abstraction; có thể dùng chung elevation/padding tokens, không gộp tất cả thành một mega component |
| Reservation ledger | ReservationLedger và ReservationLedger5State | Có 2 implementation, Inventory render 5State; bản cũ vẫn được import. Cần đối chiếu logic/data trước deprecate |
| Theme control | ui/theme-switch, system/ThemeModeSwitcher | Hai giao diện chọn theme; cần quy định nơi dùng compact switch và control nhiều chế độ |
| Table nghiệp vụ | ui/Table, system/DataTable và native tables/CSS modules | Hai tầng primitive/pattern hợp lý; debt nằm ở header/cell/density tùy biến không theo cùng contract |

## 3. Điểm vênh cần dọn dẹp

### 3.1 Arbitrary values — thống kê và phân loại

Sau khi loại các arbitrary state/selector variants như `data-[state=open]:animate-in`, quét tĩnh ghi nhận **572 class arbitrary value khác nhau, 1.483 lần khai báo**. Con số này gồm cả class hợp lệ dùng token và geometry đặc thù, không phải 1.483 lỗi.


| Nhóm | Class duy nhất | Lần khai báo |
| --- | --- | --- |
| Layout / kích thước / vị trí | 498 | 755 |
| Typography tùy biến | 21 | 635 |
| Hiệu ứng / hình dạng tùy biến | 18 | 24 |
| Tham chiếu token / biến runtime | 32 | 66 |
| Màu / shadow literal | 3 | 3 |

| Ví dụ thực tế | Nguồn | Nhận định |
| --- | --- | --- |
| `text-[11px]` (223), `text-[10px]` (186) | Nhiều components/pages; full list ở Phụ lục C | Có hệ caption nhỏ đang dùng nhưng không nằm trong named type scale |
| `text-[15px]` | Auth.tsx:96,147; thêm md variant ở PrimeProductOperationAgentPage.tsx:356 | Ngoại lệ size 15px cần quyết định giữ hay chuẩn hóa |
| `tracking-[0.14em]` (93), `tracking-[0.16em]` (34), `tracking-[0.12em]` (28) | Nhiều labels/eyebrows | Nên có token letter-spacing theo role |
| `text-[9px]`, `text-[13px]` | ContextSelector.tsx, WorkspaceSwitcher.tsx | Toolbar có scale riêng; cần kiểm tra khả năng đọc |
| `bg-[#635bff]`, `bg-[#9aa5bd]`, `bg-[#98a2b3]` | PrimeGrowthOSPage.tsx:925,926,1809 | Hardcode trực tiếp, đưa vào semantic/chart palette |
| `rounded-[1.15rem]`, `rounded-[1.1rem]`, `rounded-[14px]` | TrackingTimeline, ChannelListingPanel, PrimeGrowthOSPage | Radius lệch scale; tránh tạo token mới cho từng giá trị nếu không có role |
| `w-[310px]` | WorkspaceSwitcher.tsx | Width menu một nơi; cân nhắc width role |
| `min-w-[760px]` | ReservationLedger.tsx | Có thể hợp lý để giữ bảng và scroll; không xóa chỉ vì arbitrary |
| `w-[calc(100%-2rem)]`, `left-[50%]`, translate 50% | ui/dialog.tsx | Geometry của primitive; không coi là style debt mặc định |
| `h-[var(--header-height)]`, `w-[var(--sidebar-width-compact)]` | AppHeader, AppSidebar | Đang tuân thủ token; chỉ thiếu named utility nếu team muốn |
| `h-[var(--radix-select-trigger-height)]` | ui/select.tsx | Runtime geometry của Radix; nên giữ |
| Sonner width `calc(100vw-104px)`, margin 76px, width 356px | ui/sonner.tsx | Toast bị gắn với kích thước shell; nên dẫn xuất từ layout token |

Phụ lục C liệt kê toàn bộ class và vị trí, không chỉ các ví dụ trên. Nó còn tách palette Tailwind trực tiếp (`bg-slate-*`, `text-amber-*`, v.v.) vì chúng hợp lệ theo Tailwind nhưng không tự đi theo semantic theme.

### 3.2 Các vấn đề ưu tiên

| ID | Ưu tiên | Phát hiện / chứng cứ | Tác động | Đề xuất |
| --- | --- | --- | --- | --- |
| DS-01 | P1 | Badge warning dùng `border-warning/25 bg-warning/10`, nhưng Tailwind config không có warning color | Không sinh border/background opacity utilities; variant warning không đủ style dự kiến | Map warning/success (+ foreground) vào colors; kiểm tra CSS output |
| DS-02 | P1 | PrimeWeb đặt `--accent: var(--brand-primary)` với brand-primary hex; adapter chung dùng `hsl(var(--accent))` | Khi utility bg-accent/hover:bg-accent nằm trong scope đó, màu resolve thành hsl(hex), sai contract CSS | Namespace legacy full-color tokens (`--pw-legacy-accent`), giữ semantic accent là HSL channels |
| DS-03 | P1 | Theme workspace nằm trên AppLayout; Dialog/Popover/Select/Menu portal mặc định ra ngoài wrapper | Rủi ro overlay lấy root palette thay vì workspace; chưa verify mọi route | Truyền theme scope vào portal container/content. PrimeWeb Modal đã thêm workspace class lên Content; dùng làm điểm đối chiếu |
| DS-04 | P2 | Button/Input 36px; Toggle default 40px; override h-11=44px; admin 42px; onboarding 48px | Density/touch target không nhất quán | Quy định compact/default/comfortable và size role; không ép mọi bảng desktop thành 48px |
| DS-05 | P2 | Semantic helpers dùng emerald/amber/rose trong khi CSS có status/decision tokens riêng | Theme override không phủ hết status UI | Một bảng tone semantic + domain mapping; light/dark foreground/bg/border rõ ràng |
| DS-06 | P2 | Global CSS `.dark .bg-white`, `.dark .bg-slate-*`, `.dark .text-slate-*` | Utility cố định có ý nghĩa khác theo global patch; dễ tác động vùng brand/preview | Migrate consumers về semantic classes, gỡ compatibility patch theo vùng đã QA |
| DS-07 | P2 | Hai FormField, nhiều primitive/form control CSS riêng | API và error/help/focus khác nhau | Chốt contract Field/Label/Control/Description/Error + aria linking |
| DS-08 | P2 | Main/Admin/PrimeWeb family, type scale và token format khác | Không thể dùng chung theme object một cách an toàn | Shared token schema/build artifacts, adapter theo app; giữ exception có chủ đích |
| DS-09 | P2 | Radius và shadows semantic song song với giá trị độc lập | Thay theme không đổi đồng bộ elevation/shape | Tạo elevation role; radius dẫn xuất từ một nguồn |
| DS-10 | P3 | Tracking/caption/motion values lặp ở nhiều nơi | Tốn công chỉnh đồng loạt, khó đối chiếu Figma | Bổ sung text roles, motion roles; ưu tiên những giá trị lặp nhiều |
| DS-11 | P3 | Card/table/empty-state layouts tự dựng trong domain | Độ lệch về padding, empty state, action placement | Migrate dần qua system patterns; tránh gộp logic nghiệp vụ khác nhau |

P1 ở đây là ưu tiên sửa contract/rendering đã thấy trong source, không phải đánh giá mức độ sự cố production.

**Kiểm chứng DS-01:** đã chạy Tailwind/PostCSS với config thực tế và các candidate `bg-warning/10 border-warning/25 text-warning bg-primary/10`. Chỉ có utility màu `bg-primary/10` được sinh. `.text-warning` tồn tại riêng trong `index.css`, nhưng không có rule tương ứng cho hai class opacity warning. Kết luận giới hạn ở khả năng sinh CSS; chưa có screenshot so sánh variant warning.

**DS-02 còn có cùng kiểu xung đột ở `--text-primary` / `--text-secondary`:** root web là HSL channels, PrimeWeb ghi đè thành hex. Chỉ những consumer bọc chúng trong `hsl(...)` mới bị tác động; cần kiểm tra từng consumer trước sửa.

### 3.3 Những gì không nên “dọn” tự động

- Không thay màu logo marketplace bằng màu primary chung; hãy centralize brand registry và giữ màu nhận diện.
- Không xóa state variants, selectors Radix, CSS variables geometry hoặc calc() dùng cho responsive positioning.
- Không xóa wrappers PageHeader/WorkspacePageHeader hay status domain chỉ vì chúng mỏng; chúng đang mã hóa semantic role.
- Không xem mọi khác biệt PrimeWeb/editor/onboarding là lỗi: team có thể giữ density/layout riêng nếu có contract và lý do.
- Không xóa component chỉ vì inventory không tìm thấy một kiểu import. Cần kiểm tra barrel exports, dynamic import, route và usage trước khi deprecate.

### 3.4 Backlog đề xuất để Dev và Design đối chiếu

1. **Chốt contract token:** HSL channels cho web semantic; full-color legacy phải namespaced. Sửa warning opacity mapping và kiểm tra theme scope của portal.
2. **Chốt bảng roles:** text, control sizes, status colors, elevation, radius, page/container widths; ghi rõ exception cho editor và bảng dày dữ liệu.
3. **Củng cố system patterns:** Field wrapper, Button/Input density, Table/DataTable, badge mapping, ConfirmDialog, header, toast và brand registry.
4. **Migrate theo domain:** shell → products/orders/inventory → các màn prime → PrimeWeb/admin; giữ logic business nguyên vẹn.
5. **Thêm kiểm tra phù hợp:** static rule cho hex ngoài registry/token, cảnh báo arbitrary font/radius lặp; gallery các states light/dark/workspace; visual regression cho primitive và workflow quan trọng. Không cấm blanket mọi arbitrary value.

**Điều kiện nghiệm thu đề xuất:** token được map và sinh CSS đúng; component có props/variants/defaults rõ; named exceptions được ghi lại; kiểm tra keyboard/focus, loading/disabled/error, light/dark và responsive ở viewport đại diện. Đây là tiêu chí cho đợt cleanup tiếp theo, chưa phải kết quả đã đạt của snapshot này.

## 4. Kết quả và giới hạn bàn giao

Đã tạo tài liệu inventory và phân tích; không thay đổi implementation UI, không commit/push tài liệu tự động. Tất cả nhận định hiện trạng dựa trên source tại snapshot đã ghi. Các props trong phụ lục là khai báo TypeScript của codebase, không phải API đề xuất mới. Danh sách class được trích tĩnh; cần review theo context trước khi chuyển thành ticket refactor.
