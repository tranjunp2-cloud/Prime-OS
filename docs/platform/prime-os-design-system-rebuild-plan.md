---
title: "Prime OS Design System Rebuild Plan"
description: "Plan tiếng Việt để làm lại toàn bộ design system Prime OS theo hướng enterprise operating system, decision-first, accessible, board-ready."
status: pending
priority: P1
effort: 7 phases
branch: main
tags: [prime-os, design-system, ui-ux, enterprise-saas, accessibility]
created: 2026-04-25
---

# Prime OS Design System Rebuild Plan

## 0. Mục Tiêu

Mục tiêu của plan này là làm lại toàn bộ design system cho bản Prime OS `main` hiện tại trước khi cải thiện sâu các area như Intelligence và Demand.

Không implement trong bước này. File này là plan để khóa hướng thiết kế, nguyên tắc token, component, layout, navigation, chart/data UI, responsive và QA trước khi code.

Prime OS cần nhìn như:

```txt
Enterprise commerce operating system
```

Không phải:

```txt
Dashboard demo nhiều card
Marketing SaaS page
Dark UI ngầu nhưng khó đọc
Admin template generic
```

## 1. Skill Đã Dùng Và Kết Luận

### 1.1 `ck:plan`

Dùng để giữ đúng discipline:

- Plan trước, chưa implement.
- Viết file docs trước.
- Chia phase rõ.
- Có acceptance criteria và QA.
- Không đổi code khi chưa chốt hướng.

### 1.2 `ui-ux-pro-max`

Kết quả design-system recommendation chính:

- Pattern: `Enterprise Gateway`
- Style: `Dark Mode (OLED)`
- Typography recommendation ban đầu: `Plus Jakarta Sans`
- Color recommendation ban đầu: navy/grey enterprise, blue primary, warm CTA/accent, green positive indicators
- Sau khi tích hợp `violet-issue-DESIGN.md`, Prime OS chọn hướng app-shell thực tế hơn: `Inter + JetBrains Mono`, violet accent `#5E6AD2`, layered charcoal surfaces.
- Critical rules:
  - contrast tối thiểu 4.5:1
  - keyboard navigation
  - active nav state rõ
  - touch/click target tối thiểu 44px
  - semantic color tokens
  - không raw hex trong component
  - không emoji icon
  - motion 150-300ms
  - reduced-motion support
  - no horizontal overflow
  - charts phải có text fallback, không rely color-only

### 1.3 Điều Chỉnh Cho Prime OS

Skill gợi ý `Enterprise Gateway`, nhưng Prime OS không phải landing/product website. Prime OS là app vận hành.

Vì vậy hướng design system nên là:

```txt
Enterprise Operating Shell
```

Đặc tính:

- Dark-first, nhưng không quá tối kiểu gamer/cyber.
- Data-dense nhưng có hierarchy rõ.
- Decision-first: màn nào cũng có câu hỏi quyết định, evidence, risk, next action.
- Board-ready: BOD nhìn hiểu operating loop trong 10-20 giây.
- Operator-friendly: user làm việc lâu không mỏi mắt.
- Token-driven: mọi màu, spacing, radius, elevation, state dùng semantic token.

### 1.4 Tích Hợp `violet-issue-DESIGN.md`

File `violet-issue-DESIGN.md` là reference quan trọng cho design system mới. Không copy 1:1 vì Violet Issue được tối ưu cho issue tracking/project management, còn Prime OS là commerce operating system. Nhưng Prime OS nên lấy các nguyên tắc mạnh nhất:

- Violet accent có kỷ luật, dùng cho primary action, focus ring, selected state, active indicator.
- Dark layered surfaces thay vì nhiều shadow/glass.
- Compact information density cho operator làm việc lâu.
- Row-based lists/tables thay vì card farm.
- Keyboard-first workflow, command palette không chỉ là search mà là navigation/action layer.
- Monospace cho entity IDs, SKU, RFQ, order, launch IDs.
- Snappy interaction: hover/press nhanh, animation ngắn, không trang trí.
- Sidebar compact/expanded rõ ràng, active state dùng accent nhẹ.
- Chips/status dùng chiều cao thấp, radius nhỏ, text rõ.

Điều chỉnh cho Prime OS:

- Giữ violet làm **system accent chính**, không dùng violet làm background lớn.
- Vẫn dùng green/warning/red cho trạng thái business vì Prime OS cần guardrail, risk, recovery.
- Không áp dụng “không dùng warm colors” tuyệt đối; Prime OS vẫn cần amber/orange cho review/warning/action needed.
- Không áp dụng letter-spacing âm cho heading/body; Prime OS giữ chữ dễ đọc, không ép quá “developer tool”.
- Không hạ toàn bộ button xuống 28-32px vì Prime OS là web app có nhiều đối tượng user; dùng compact mode cho tables/toolbars, default vẫn 40-44px.

## 2. Audit Nhanh UI Hiện Tại

### 2.1 Điểm Tốt

- Đã có Tailwind CSS variables trong `app/src/index.css`.
- Có dark/light token cơ bản.
- Có `surface-*` classes như `surface-glass`, `surface-solid`, `surface-workspace`.
- Có shadcn-style components: Button, Card, Input, Badge, Table.
- Có visible focus state và skip link trong `AppLayout`.
- Có reduced-motion media query.
- Sidebar có icon + label trên desktop, icon-only có title/aria-label trên compact.
- Layout đang dùng Prime OS shell ổn, không cần đập đi.

### 2.2 Vấn Đề Chính

- Radius đang hơi lớn (`rounded-3xl`, `--radius: 0.875rem`) làm UI mềm quá, đôi khi giống SaaS demo hơn operating system.
- Card/surface dùng nhiều border, blur, shadow, glass; nếu lạm dụng sẽ giảm cảm giác enterprise control plane.
- Header/sidebar/content density chưa có scale rõ theo use case: overview, registry, detail, action drawer.
- Typography chưa được chuẩn hóa thành type roles rõ: display, page title, section title, body, label, metric, table.
- Màu semantic chưa đủ cho Prime OS domain: decision, guardrail, handoff, risk, warning, suppressed, blocked, eligible, active.
- Nhiều màn còn dựa vào card layout dày; thiếu operating rail/handoff rail để nối các tower.
- Chart/data UI chưa có chuẩn chung: khi dùng funnel, trend, bullet/progress, bảng, timeline, phải cùng một system.
- Mobile/responsive nên được xác định rõ hơn, dù bản này ưu tiên desktop board/demo.

## 3. Design Thesis Mới

### 3.1 Tên Hệ Thiết Kế

```txt
Prime OS Control System
```

### 3.2 Nguyên Tắc

1. Decision before decoration.
2. Evidence before chart.
3. Handoff before page count.
4. Guardrail before growth.
5. Dense, but readable.
6. Dark-first, but accessible.
7. Components must make operating state obvious.

### 3.3 Visual Personality

Prime OS nên có cảm giác:

- chuyên nghiệp
- chắc
- vận hành được
- có chiều sâu business
- hiện đại nhưng không flashy
- dùng lâu được
- phù hợp SME lẫn BOD enterprise demo

Không nên có cảm giác:

- futuristic quá mức
- gradient/glow nhiều
- dashboard template
- card farm
- fake AI dashboard
- marketing automation clone

## 4. Token Architecture Đề Xuất

### 4.1 Layer 1 — Primitive Tokens

Primitive tokens là màu/thang đo gốc, không dùng trực tiếp trong feature component nếu không cần.

Color primitive:

- `slate-950`, `slate-925`, `slate-900`, `slate-850`
- `slate-800`, `slate-700`, `slate-600`
- `violet-500: #5E6AD2` dùng làm Prime OS accent chính
- `violet-600: #4E5BBF` dùng cho hover/pressed
- `violet-400: #6E79D6` dùng cho secondary highlight
- `blue-500`, `blue-400`, `blue-300` dùng cho information/area support, không còn là primary mặc định
- `cyan-400`
- `green-500`, `emerald-400`
- `amber-500`, `orange-500`
- `red-500`
- `charcoal-900: #101014` app background theo Violet Issue reference
- `charcoal-800: #1B1B25` card/sidebar layer
- `charcoal-750: #1F1F2E` elevated panel/modal/dropdown layer
- `charcoal-700: #252536` tooltip/popover layer

Spacing primitive:

- `0`, `2`, `4`, `6`, `8`, `12`, `16`, `20`, `24`, `32`, `40`, `48`, `64`

Radius primitive:

- `radius-xs: 4px`
- `radius-sm: 6px`
- `radius-md: 8px`
- `radius-lg: 12px`
- `radius-xl: 16px` chỉ dùng modal/hero block, không dùng mọi card.

Motion primitive:

- `motion-fast: 120ms`
- `motion-base: 180ms`
- `motion-slow: 260ms`
- easing: `ease-out`, `ease-in-out`

### 4.2 Layer 2 — Semantic Tokens

Nên định nghĩa semantic tokens trong `index.css`:

Surfaces:

- `--surface-app`
- `--surface-sidebar`
- `--surface-header`
- `--surface-panel`
- `--surface-card`
- `--surface-card-hover`
- `--surface-table`
- `--surface-selected`
- `--surface-overlay`
- `--surface-danger-soft`
- `--surface-warning-soft`
- `--surface-success-soft`
- `--surface-info-soft`
- `--surface-command`
- `--surface-row-hover`
- `--surface-row-selected`

Text:

- `--text-primary`
- `--text-secondary`
- `--text-tertiary`
- `--text-disabled`
- `--text-inverse`
- `--text-metadata`
- `--text-identifier`

Borders:

- `--border-subtle`
- `--border-default`
- `--border-strong`
- `--border-active`
- `--border-danger`
- `--border-warning`
- `--border-success`

Operating status:

- `--status-active`
- `--status-ready`
- `--status-review`
- `--status-hold`
- `--status-blocked`
- `--status-paused`
- `--status-completed`
- `--status-suppressed`

Decision:

- `--decision-go`
- `--decision-review`
- `--decision-hold`
- `--decision-no-go`

Area accents:

- `--area-intelligence`
- `--area-demand`
- `--area-customer`
- `--area-ecom`
- `--area-finance`

Violet Issue tokens cần được map vào Prime OS semantic layer:

```txt
Primary / selected / focus: #5E6AD2
Primary hover: #4E5BBF
Secondary violet highlight: #6E79D6
App background: #101014
Card/sidebar: #1B1B25
Elevated surface: #1F1F2E
Tooltip/popover: #252536
Text primary: #F1F1F4
Text secondary: #8A8F98
Border: #2C2C3A
Success: #3DD68C
Warning: #F0C000
Error: #EB5757
```

### 4.3 Layer 3 — Component Tokens

Component tokens dùng cho reusable UI:

- `--button-height-sm`
- `--button-height-md`
- `--button-height-lg`
- `--button-height-compact`
- `--input-height-compact`
- `--chip-height`
- `--row-height-compact`
- `--row-height-default`
- `--card-padding-sm`
- `--card-padding-md`
- `--card-padding-lg`
- `--table-row-height`
- `--sidebar-width-compact`
- `--sidebar-width-expanded`
- `--header-height`
- `--rail-width`
- `--focus-ring`
- `--shadow-panel`
- `--shadow-popover`
- `--glow-focus`
- `--command-palette-width`

## 5. Typography System

### 5.1 Font

Đề xuất dùng:

```txt
Inter + JetBrains Mono
```

Lý do:

- `Inter` phù hợp dense enterprise app, table, registry, nav, command palette.
- `JetBrains Mono` dùng cho entity IDs: SKU, RFQ, order, launch decision, campaign, customer/account ID.
- Hướng này lấy trực tiếp từ `violet-issue-DESIGN.md`, phù hợp hơn với operating shell nhiều dữ liệu.
- `Plus Jakarta Sans` có thể giữ làm option cho marketing/demo deck, nhưng app shell nên ưu tiên Inter để scan nhanh.

Fallback:

```css
font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
```

### 5.2 Type Roles

Không để component tự chọn font-size tùy hứng. Nên có roles:

- `display`: 32/40, dùng rất ít cho overview hero/decision answer
- `page-title`: 24/32
- `section-title`: 18/26
- `card-title`: 15/22 hoặc 16/24
- `body`: 14/22
- `body-sm`: 13/20
- `entity-title`: 14/20, 500 weight cho row/list item title
- `label`: 12/16, uppercase hạn chế
- `metadata`: 12/16, 500 weight
- `shortcut`: 11/16, JetBrains Mono
- `identifier`: 12/16, JetBrains Mono
- `metric`: 28/32, tabular numbers
- `table`: 13/20
- `caption`: 11/16

Rule:

- Không dùng text nhỏ hơn 11px.
- Body chính không nhỏ hơn 14px desktop.
- Data table có thể 13px nhưng phải đủ line-height.
- Số liệu dùng `font-variant-numeric: tabular-nums`.
- Letter spacing không âm. Violet Issue dùng heading tracking âm, nhưng Prime OS không áp dụng vì readability và consistency.
- Entity IDs dùng monospace để phân biệt với title/description.

## 6. Color Direction

### 6.1 Dark-First Palette

Prime OS nên dùng dark-first như hiện tại, nhưng tinh chỉnh:

- Background chính theo Violet Issue: `#101014`, có thể gần hơn `#020617` ở khu vực app stage nếu cần chiều sâu.
- Sidebar/card layer: `#1B1B25`.
- Elevated/modal/dropdown layer: `#1F1F2E`.
- Tooltip/popover layer: `#252536`.
- Card/panel không quá trong suốt.
- Primary violet `#5E6AD2` dùng cho action/navigation/focus/selected.
- Green chỉ cho success/healthy/recovered.
- Amber/orange cho warning/review/action needed.
- Red cho blocked/destructive.
- Blue/cyan chỉ là information/support accent, không làm primary mặc định.

### 6.2 Không Dùng Màu Theo Cảm Tính

Mọi màu phải gắn semantic:

- Violet: primary action, selected state, focus ring, active indicator.
- Blue/Cyan: information, secondary signal, intelligence support.
- Green: good/active/recovered.
- Amber/Orange: review/warning/attention, dùng có kỷ luật.
- Red: blocked/failed/destructive.
- Gray/slate: neutral structure.

### 6.3 Violet Usage Rules

Violet là dấu hiệu hệ thống, không phải màu trang trí.

Do:

- dùng cho primary CTA
- dùng cho selected row/card
- dùng cho active nav item
- dùng cho focus ring
- dùng cho command palette highlight
- dùng glow rất nhẹ phía sau focused/selected element

Don't:

- không phủ violet làm background section lớn
- không dùng gradient violet dày
- không dùng nhiều glow decoration
- không dùng violet cho mọi chart/status
- không dùng violet để thay thế warning/error/success semantic colors

Glow rule:

```txt
focus/selected glow tối đa: rgba(94,106,210,0.15)
không dùng decorative glow lớn
```

### 6.4 Light Mode

Light mode vẫn cần tồn tại, nhưng không phải mặc định demo. Light mode phải:

- sạch
- high contrast
- không bị washed-out
- border rõ
- status colors vẫn đạt contrast

## 7. Layout System

### 7.1 App Shell

Giữ shell hiện tại:

```txt
Sidebar trái + Header search/session + Main workspace + Copilot/assistant wrapper
```

Nhưng cần chuẩn hóa:

- Header height: 56px.
- Sidebar expanded: 300-320px.
- Sidebar compact: 72-80px.
- Main content max-width theo page type:
  - overview: full width constrained inner grid
  - registry/table: full width
  - detail workspace: 2 hoặc 3 columns
  - action drawer/modal: max 960-1100px

### 7.2 Page Templates

Cần tạo 6 template chuẩn:

1. `Operating Overview Template`
   - decision hero
   - operating loop
   - guardrails
   - handoff queue
   - outcome preview

2. `Tower Workspace Template`
   - tower header
   - decision question
   - KPI strip tối giản
   - main board
   - right evidence/action panel

3. `Registry Template`
   - saved views
   - filters
   - table/list
   - detail preview drawer

4. `Detail Workspace Template`
   - object header
   - tabs
   - summary/evidence/risk/action
   - linked context

5. `Handoff Template`
   - from/to
   - payload
   - owner
   - SLA/state
   - next action

6. `Control/Guardrail Template`
   - rules
   - suppressed/blocked impact
   - collision/risk
   - recovery opportunity

## 8. Component System

### 8.1 Components Cần Chuẩn Hóa

Core:

- Button
- IconButton
- Card
- Panel
- Surface
- Badge/Chip
- StatusChip
- DecisionChip
- AreaBadge
- Table
- FilterBar
- Tabs
- Drawer
- Dialog
- Toast
- EmptyState
- ErrorState
- LoadingState/Skeleton

Prime-specific:

- `DecisionHeader`
- `OperatingLoop`
- `HandoffRail`
- `EvidenceStack`
- `GuardrailCard`
- `OutcomePreview`
- `EntityLink`
- `LinkedContextPreview`
- `OwnerSlaBadge`
- `ActionSetupPanel`
- `SuppressionBadge`
- `LifecycleChip`
- `SourceQualityBadge`

### 8.2 Button Rules

- Primary CTA: one per main screen area.
- Button height default 40-44px.
- Compact toolbar button có thể 32px, chỉ dùng trong dense tables/filter bars.
- Icon-only button must be 40-44px with aria-label/title.
- Destructive separated visually.
- Loading button disables and shows progress.
- No layout shift on hover/active.
- Primary button: violet background, white text, hover deep violet.
- Secondary button: transparent/surface, border visible, text primary.
- Ghost button: muted text, hover surface.

### 8.3 Card/Panel Rules

Card radius nên giảm:

- normal card: 8px
- panel/modal: 12px
- avoid `rounded-3xl` as default

Card chỉ dùng cho bounded objects:

- KPI card
- entity card
- decision card
- issue card
- modal/drawer

Không dùng card lồng card quá nhiều. Page section nên là layout band hoặc panel.

Violet Issue-inspired elevation:

- card/panel dùng layered background thay vì heavy shadow.
- no shadow on standard cards.
- modal/command palette có shadow rõ: `0 24px 48px rgba(0,0,0,0.4)`.
- selected object dùng violet 10% background + left border/active indicator.
- hover row dùng `#1F1F2E`, không làm layout shift.

### 8.4 Table Rules

Prime OS là operating product, table rất quan trọng.

Table cần:

- sticky header nếu dài
- row height ổn định
- compact row target 36px cho dense registry
- default row target 44px cho broader audience
- density modes: comfortable / compact
- sortable columns nếu là registry
- status chip rõ
- row click có detail
- keyboard focus
- empty state
- horizontal overflow xử lý có chủ đích, không vỡ layout
- entity identifiers dùng JetBrains Mono
- selected row dùng violet active indicator
- group headers dùng 11px/600 uppercase nhưng không quá rộng tracking

### 8.5 Chart/Data Viz Rules

Theo `ui-ux-pro-max`, chart nên dùng:

- Funnel chart/list cho traffic -> lead -> RFQ -> order -> repeat.
- Bullet/progress chart cho KPI vs target.
- Line chart cho trend over time.
- Timeline/list cho handoff/event sequence.

Rules:

- Chart luôn có text insight.
- Không rely color-only.
- Không quá 6 series.
- Có fallback table/list.
- Không chart-first nếu screen cần quyết định.

## 9. Navigation UX

### 9.1 Sidebar

Hiện sidebar có foundation tốt. Cần cải thiện:

- Area grouping rõ hơn.
- Active state theo Violet Issue: violet 10% background + text primary + indicator.
- Current route phải có aria-current.
- Compact sidebar phải vẫn hiểu được qua tooltip/title.
- Area icon style consistent.
- Không để nav quá sâu nếu user không cần.
- Sidebar expanded target 280-316px, compact 64-76px. Violet Issue 220/48 là reference cho compact density, nhưng Prime OS cần nhiều area hơn nên không ép quá hẹp.

### 9.2 Command Palette

Từ `violet-issue-DESIGN.md`, command palette nên là primary acceleration layer, không chỉ là search.

Target:

```txt
Cmd+K / Ctrl+K
Search entity, route, action, handoff
```

Command palette nên hỗ trợ:

- open route
- search SKU/order/customer/lead/RFQ/launch decision
- jump to tower
- trigger local prototype action
- show keyboard shortcut hints
- grouped results: entities, routes, actions, recent

Design:

- width khoảng 560-640px desktop
- elevated surface `#1F1F2E`
- 12px radius
- visible border
- selected row violet 10%
- keyboard navigation
- result row 36-44px
- shortcut hints dùng JetBrains Mono

Phase đầu có thể chỉ plan/visual shell, chưa cần full command engine.

### 9.3 Breadcrumb / Context Bar

Vì Prime OS có deep route, cần context bar:

```txt
Prime OS / Intelligence / Launch Decisions / Notebook refill bundle launch
```

Hoặc compact:

```txt
Launch Decisions -> Campaign Ops -> Lead Capture
```

Breadcrumb không chỉ để định vị, mà để kể operating flow.

### 9.4 Handoff Navigation

Mọi handoff CTA phải ghi rõ:

- đi đâu
- mang object nào
- trạng thái sau khi đi

Ví dụ:

```txt
Send approved launch to Campaigns
Payload: launch_001, SKU, segment, creator proof, stock guardrail
```

## 10. Accessibility Và Interaction

### 10.1 Must-Have

- Contrast body text >= 4.5:1.
- Secondary text >= 3:1, tốt nhất gần 4.5:1 với UI dày.
- Focus ring rõ trên mọi interactive element.
- Keyboard nav không trap.
- Skip link giữ nguyên.
- Icon-only controls có aria-label.
- Form input có label thật, không placeholder-only.
- Error có role/aria-live khi phù hợp.
- Toast không cướp focus.
- Reduced motion support giữ nguyên.

### 10.2 Interaction Timing

- Hover/press: 80-150ms cho controls nhỏ, 120-180ms cho standard controls.
- Drawer/dialog enter: 180-260ms.
- Page content fade: 150-200ms.
- Không animate width/height nếu gây layout shift.
- Không có decorative animation nếu không giúp hiểu state.
- Tooltips có thể instant hoặc 100ms fade-in nếu không gây nhiễu.
- Command palette row highlight phải phản hồi ngay bằng keyboard.

## 11. Area-Specific Visual Language

Không dùng mỗi area một theme riêng quá mạnh. Chỉ dùng accent nhẹ.

### 11.1 Intelligence

Accent: violet primary + cyan/blue support rất nhẹ.

Visual metaphor:

- decision
- signal
- confidence
- guardrail

Components:

- DecisionChip
- EvidenceStack
- SignalScore
- ForecastGuardrail

### 11.2 Demand

Accent: blue/amber.

Visual metaphor:

- activation
- source
- campaign
- response
- re-entry

Components:

- CampaignStateChip
- SourceQualityBadge
- LeadIntentScore
- RetargetingSuppressionBadge

### 11.3 Customer

Accent: green/teal.

Visual metaphor:

- relationship
- lifecycle
- follow-up
- trust
- retention

Components:

- LifecycleChip
- HealthChip
- FollowUpSlaBadge
- TimelineEvent

### 11.4 Ecom/COS

Accent: slate/blue/orange.

Visual metaphor:

- product truth
- inventory
- order
- fulfillment
- policy

Components:

- InventoryRiskBadge
- OrderStateChip
- FulfillmentStep
- PolicyGuardrail

### 11.5 Finance

Accent: green/amber.

Visual metaphor:

- readiness
- exposure
- repayment
- eligibility

Components:

- EligibilityScore
- CapitalReadinessCard
- SettlementHealth
- RiskBlocker

## 12. Migration Plan

### Phase 0 — Design System Audit Lock

Goal: chốt audit và scope.

Tasks:

- Inventory current tokens in `app/src/index.css`.
- Inventory base UI components in `app/src/components/ui`.
- Inventory layout components in `app/src/components/layout`.
- Inventory Prime-specific repeated patterns in `PrimeOverview.tsx` and `PrimeTowerPage.tsx`.
- Mark components to reuse vs refactor.

Output:

- `docs/prime-os-design-system-rebuild-plan.md` này.
- Follow-up file nếu cần: `docs/prime-os-design-token-map.md`.

Success:

- Không bắt đầu bằng sửa màu lung tung.
- Có danh sách rõ component/token cần chuẩn hóa.

### Phase 1 — Token Foundation

Goal: làm lại token architecture trước.

Tasks:

- Refactor CSS variables thành primitive/semantic/component structure.
- Keep current theme compatibility where possible.
- Add semantic tokens cho status, decision, guardrail, handoff, area accents.
- Integrate Violet Issue palette as Prime OS dark baseline.
- Map violet accent to primary/focus/selected/action.
- Add command palette, row selected, row hover, identifier text tokens.
- Reduce random surface opacity.
- Set consistent radius scale.
- Define typography variables/classes.

Files likely:

- `app/src/index.css`
- Tailwind config nếu project có hoặc bổ sung config nếu cần

Success:

- Component không cần raw color.
- Dark/light đều dùng semantic token.
- UI vẫn chạy không vỡ.

### Phase 2 — Core Components

Goal: chuẩn hóa component cơ bản.

Tasks:

- Refactor `Button`.
- Refactor `Card` thành card/panel/surface rõ.
- Add or standardize `StatusChip`, `DecisionChip`, `AreaBadge`.
- Standardize `Table` density, row, header.
- Add compact `EntityRow`/`RegistryRow` pattern inspired by Violet Issue.
- Add `IdentifierText` using JetBrains Mono.
- Add compact chips with 20-24px height.
- Standardize `Dialog/Drawer`.
- Standardize empty/error/loading states.

Files likely:

- `app/src/components/ui/button.tsx`
- `app/src/components/ui/card.tsx`
- `app/src/components/ui/table.tsx`
- new `app/src/components/prime/*` or `app/src/components/system/*`

Success:

- UI foundation nhìn nhất quán.
- Card không còn quá bo tròn/soft.
- Button/action hierarchy rõ.

### Phase 3 — App Shell & Navigation

Goal: Prime OS shell nhìn như operating system.

Tasks:

- Refine `AppSidebar`.
- Refine `AppLayout` header.
- Plan/add Command Palette shell if feasible.
- Add context/breadcrumb/handoff-aware top region if needed.
- Improve active states.
- Add tooltip/label behavior for compact nav.
- Ensure no horizontal overflow except intentional table scroll.

Files likely:

- `app/src/components/layout/AppLayout.tsx`
- `app/src/components/layout/AppSidebar.tsx`
- `app/src/lib/prime/prime-navigation.ts`

Success:

- Navigation rõ area/tower.
- User luôn biết đang ở đâu và object/action tiếp theo là gì.

### Phase 4 — Prime-Specific Operating Components

Goal: tạo component riêng cho thesis Prime OS.

Components:

- `OperatingLoop`
- `HandoffRail`
- `DecisionHeader`
- `EvidenceStack`
- `GuardrailCard`
- `OutcomePreview`
- `LinkedEntityStrip`
- `ActionSetupPanel`
- `OwnerSlaBadge`

Success:

- Mọi area dùng cùng language: decision, evidence, risk, action, handoff.
- Không phải mỗi page tự dựng layout riêng.

### Phase 5 — Page Template Migration

Goal: migrate các màn chính sang template chuẩn.

Priority pages:

1. `/overview`
2. `/intelligence/launch-decisions`
3. `/intelligence/trends`
4. `/intelligence/creators`
5. `/demand/campaign-ops`
6. `/demand/lead-response-capture`
7. `/demand/retargeting-outreach`
8. `/customer/crm-compact`
9. `/ecom/cos/product-master`

Success:

- Overview kể được operating loop.
- Intelligence/Demand không còn cảm giác khác app.
- Screens decision-first thay vì card-first.

### Phase 6 — Data Viz & Registry Polish

Goal: chuẩn hóa chart/table/timeline.

Tasks:

- Funnel/list pattern cho conversion.
- Bullet/progress pattern cho target.
- Timeline/handoff event pattern.
- Registry table template.
- Detail drawer/panel template.

Success:

- Data UI readable.
- Không chart trang trí.
- Có table/list fallback.

### Phase 7 — QA & Visual Regression

Goal: đảm bảo design rebuild không phá app.

QA matrix:

- desktop 1440
- laptop 1280
- tablet-ish 768
- mobile 375
- dark mode
- light mode
- reduced motion
- keyboard nav
- auth screen
- overview
- intelligence launch decisions
- demand campaign/lead/retargeting
- customer CRM
- ecom COS

Acceptance:

- No broken route.
- No horizontal overflow ngoài table intentional.
- Focus visible.
- Touch/click target >= 40-44px.
- Contrast đủ.
- No empty crash.
- No card nesting mess.
- Loading/error/empty states nhìn thống nhất.

## 13. Implementation Rules Khi Bắt Đầu Code

- Không sửa toàn bộ component một lần nếu không kiểm soát được blast radius.
- Token trước, component sau, page sau.
- Sau mỗi phase chạy browser QA.
- Không xóa shell hiện tại.
- Không đổi IA product khi đang làm design system, trừ khi route/nav cần polish nhẹ.
- Không hardcode màu trong feature page.
- Không tăng decorative glow/gradient. Violet glow chỉ dùng cho focus/selected, opacity thấp.
- Không dùng emoji icon.
- Không thêm landing page.
- Không biến Prime OS thành marketing website.
- Không copy Violet Issue tuyệt đối: Prime OS vẫn cần business status colors, larger default controls, and commerce-specific handoff components.

## 14. Acceptance Criteria Cho Design System Mới

Design system rebuild được xem là đạt khi:

- Có token foundation rõ trong CSS.
- Violet Issue palette được tích hợp có kỷ luật: accent/focus/selected, không phủ toàn UI.
- Có component hierarchy rõ: Button, Card, Panel, Table, Chip, Dialog, Drawer, Empty/Error/Loading.
- Có compact row/list pattern cho registry và operating queues.
- Có monospace identifier style cho SKU/RFQ/order/customer/launch IDs.
- Có command palette plan hoặc shell cho keyboard-first workflow.
- Có Prime-specific components cho decision/evidence/handoff/guardrail/outcome.
- Sidebar/header/main workspace nhìn thống nhất.
- Overview, Intelligence, Demand dùng cùng visual grammar.
- Dark mode đạt readability tốt.
- Light mode không vỡ.
- Các màn chính không overflow.
- User nhìn một màn hiểu ngay: decision là gì, risk là gì, next action là gì.
- BOD nhìn app thấy đây là commerce operating system, không phải dashboard template.

## 15. Câu Hỏi Còn Mở

- Anh muốn Prime OS full mặc định chỉ dark mode, hay dark-first nhưng vẫn support light mode?
- Anh muốn brand expression nghiêng về “enterprise Nhật/B2B conservative” hay “modern startup operating cockpit”?
- Khi rebuild component, anh muốn giữ rounded mềm hiện tại ở mức nhẹ, hay chuyển hẳn sang radius 6-8px cho cảm giác control-plane hơn?

## 16. Implementation Note — 2026-04-25

Đã áp dụng lát cắt đầu tiên của design rebuild vào bản full/main:

- Token foundation trong `app/src/index.css` đã chuyển sang Prime OS dark control-plane dựa trên Violet Issue: nền charcoal, accent violet, border mềm, row hover/selected, identifier font, semantic status token.
- Core component polish:
  - `Button`: radius nhỏ hơn, density gọn hơn, hover/focus rõ hơn.
  - `Card`: giảm radius về 8px để bớt cảm giác landing-page card.
  - `Input`: control surface thống nhất với header/search.
  - `Badge`: chip nhỏ, sắc hơn, phù hợp status/metadata.
  - `Table`: row/header density compact hơn, selected/hover dùng token chung.
  - `Dialog/Command`: surface command palette có title ẩn cho accessibility.
- App shell polish:
  - Sidebar dùng width/header token, active indicator rõ hơn, hover nhẹ hơn.
  - Header search giả được thay bằng command palette shell có thể mở bằng `Cmd/Ctrl + K`.
  - Command palette hiện cho phép jump nhanh tới các workspace chính và external COS.
- QA đã chạy:
  - `npm run build:dev` pass.
  - Browser QA pass tại `/overview`, `/intelligence/launch-decisions`, `/demand/campaign-ops`.
  - Không có console error.
  - Command palette mở được và search thấy `CRM Compact`.
  - Không có horizontal overflow ngoài vùng app chính.

Ghi chú kỹ thuật:

- Trước khi build, `node_modules` của bản main bị hỏng một phần ở `lucide-react` và `react-hook-form`; đã chạy `npm ci` trong `app/` để dựng lại dependency đúng theo lockfile.
- Lát cắt này là nền hệ thống và shell; các phase sau sẽ đi vào Prime-specific components: decision card, evidence panel, handoff strip, guardrail row, outcome preview.

## 17. Implementation Completion — 2026-04-25

Đã hoàn tất pass đầy đủ theo 7 phase của plan ở mức board-ready/prototype system:

### Phase 0 — Design System Audit Lock

Status: completed.

Artifacts:

- `docs/prime-os-design-token-map.md`
- Inventory token, UI component, layout component, Prime repeated pattern, reuse/refactor boundary.

### Phase 1 — Token Foundation

Status: completed.

Implemented:

- Violet Issue-inspired dark control-plane palette.
- Semantic status/decision/area/surface tokens.
- Sidebar/header/row/command palette component tokens.
- Identifier typography utilities.
- Compact row hover/selected utilities.

### Phase 2 — Core Components

Status: completed.

Implemented:

- Button, Card, Input, Badge, Table, Dialog, Command, Tabs.
- DataTable radius/density polish.
- EmptyState radius/system polish.
- SummaryMetricCard density/icon polish.

### Phase 3 — App Shell & Navigation

Status: completed.

Implemented:

- Sidebar active state and compact width tokens.
- Header command palette trigger.
- `PrimeCommandPalette`.
- Keyboard open with `Cmd/Ctrl + K`.
- Legacy COS detail route redirect fix also preserved shell navigation.

### Phase 4 — Prime-Specific Operating Components

Status: completed.

Implemented:

- `DecisionHeader`
- `OperatingLoop`
- `HandoffRail`
- `EvidenceStack`
- `GuardrailCard`
- `OutcomePreview`
- `LinkedEntityStrip`
- `ActionSetupPanel`
- `OwnerSlaBadge`
- `IdentifierText`
- `RegistryList`

File:

- `app/src/components/prime/PrimeOperatingSystem.tsx`

### Phase 5 — Page Template Migration

Status: completed for priority prototype routes.

Implemented:

- `/overview` now uses Prime operating language: decision, linked entities, loop, evidence, registry, guardrail, outcome.
- `PrimeTowerPage` now wraps shared Intelligence/Demand/Customer/Finance pages with the same operating template.
- Covered priority routes:
  - `/intelligence/launch-decisions`
  - `/intelligence/trends`
  - `/intelligence/creators`
  - `/demand/campaign-ops`
  - `/demand/lead-response-capture`
  - `/demand/retargeting-outreach`
  - `/customer/crm-compact`
- Ecom COS modules keep their domain UI but inherit standardized shell/table/card/system components.

### Phase 6 — Data Viz & Registry Polish

Status: completed for shared prototype patterns.

Implemented:

- Compact `RegistryList` for operating queues.
- DataTable density, radius, focus, and row polish.
- Evidence/outcome/guardrail patterns usable as table/list fallback.
- No new decorative chart dependency.

### Phase 7 — QA & Visual Regression

Status: completed for targeted design-system QA.

Verification:

- `npm run build:dev` pass.
- `npm run test -- App.legacy-routes.test.tsx` pass.
- Browser QA pass on desktop/laptop/tablet/mobile for priority routes.
- Command palette opens by click and `Ctrl/Meta + K`.
- No document-level horizontal overflow detected.
- No app console errors in targeted pass.

QA report:

- `.gstack/qa-reports/qa-report-prime-os-design-system-2026-04-25.md`

Remaining cleanup:

- Some deep legacy page-local sections still use `rounded-2xl/3xl` classes. They are no longer system blockers, but can be gradually cleaned when touching each feature page.
- Bundle size warning remains from existing app scale and should be addressed later with route-level code splitting.
