# Prime OS Full UI QA & Improvement Plan

Ngay lap: 2026-04-29  
Pham vi: Prime OS full version tai `PrimeOS_main/prime-os-phase-1/app`  
Local target hien tai: `http://127.0.0.1:5192`

Tai lieu nay la plan QA toan bo UI he thong, ket hop:

- `_qa-full-reference`: ky luat QA theo thu tu, khong chay test truoc khi co docs/context/coverage matrix.
- `ui-ux-pro-max`: lens danh gia UI/UX theo accessibility, interaction, performance, responsive, navigation, typography, forms, charts/data.

## 0. Nguyen Tac Bat Buoc

Khong bat dau bang viec chay tests hang loat.

Thu tu bat buoc:

1. Doc docs va trich requirements.
2. Scan project va route tree.
3. Map requirement -> route/source -> test hien co/thieu.
4. Review test hien co.
5. Moi chay test cu de xac nhan baseline.
6. Tao test bo sung dua tren requirements.
7. Chay all test + browser QA + a11y + visual/responsive.
8. Fix theo risk/impact, khong fix lung tung.

Muc tieu khong phai chi "test pass". Muc tieu la Prime OS UI:

- Dung route, dung shell.
- Khong vang ve overview sai ngu canh.
- De doc, de thao tac, dung Genesis design system.
- Khong horizontal overflow tren mobile/desktop.
- Keyboard/focus/a11y dung muc san sang demo.
- Cac man business quan trong co state ro: loading, empty, error, detail, filter, action.

## 1. Context Da Scan

### Project Inventory

| Hang muc | So luong hien tai |
|---|---:|
| Source TS/TSX files | 278 |
| Test files | 13 |
| Page files | 25 |
| Component files | 167 |
| Docs markdown | 16 |

### Tech/Test Stack

| Hang muc | Gia tri |
|---|---|
| Frontend | React + TypeScript + Vite |
| UI primitives | Radix + Tailwind + shadcn-style components |
| Unit/component tests | Vitest + Testing Library |
| Browser/E2E | Playwright |
| Existing scripts | `npm run build:dev`, `npm run test`, `npm run test:ui`, `npm run lint` |

### Current UI Design Direction

Prime OS dang theo Genesis-inspired system:

- Light editorial operating shell.
- Background `#FAFAFA`, card `#FFFFFF`, primary `#6366F1`.
- Heading: General Sans.
- Body: DM Sans.
- Code/identifier: JetBrains Mono.
- Button/input radius 6px.
- Card radius 12px.
- Focus ring indigo 3px.

QA phai confirm nhung token nay duoc ap dung that su tren route chinh, khong chi tren mot vai component.

## 2. UI/UX Risk Model

Dua tren `ui-ux-pro-max`, Prime OS duoc xep loai:

- Product type: SaaS / operations dashboard / data-dense operating system.
- Primary risk: data density lam user lac huong.
- Secondary risk: route/detail click bi vang ve overview.
- Third risk: mobile/tablet overflow do table/card/action bar.
- Fourth risk: dark/light token lech nhau sau redesign.
- Fifth risk: accessibility bi thieu do icon-only nav, command palette, nested routes, sticky shell.

### Priority QA Categories

| Priority | Category | Prime OS-specific check |
|---:|---|---|
| P0 | Route integrity | Moi nav item/detail row/legacy route khong vang sai |
| P0 | Auth/session shell | Login, restore session, logout, protected route redirect |
| P0 | Navigation state | Sidebar active state dung voi nested route va redirect |
| P1 | Accessibility | Focus ring, keyboard nav, aria label, heading order, contrast |
| P1 | Responsive | 375/768/1024/1440, khong horizontal overflow, table scroll dung |
| P1 | Data table UX | Sort/filter/search/action row khong bi mat context |
| P1 | Forms & feedback | Product create/edit, dialogs, error/loading/success states |
| P2 | Visual consistency | Genesis tokens, radius, spacing, typography, one icon language |
| P2 | Performance | Build size, route load, no major CLS, command palette speed |
| P2 | Empty/error states | Meaningful empty, unavailable, not found, backend fail |

## 3. Route Coverage Plan

### Core Shell

| Route | Source | UI risk | Test need |
|---|---|---|---|
| `/auth` | `pages/Auth.tsx` | Form labels, login error, redirect after login | Component + browser |
| `/overview` | `pages/prime/PrimeOverview.tsx` | First impression, CTA routing, operating loop | Browser + visual |
| `/__ui-regression` | `pages/UIRegressionReview.tsx` | Internal QA route | Browser smoke |
| `*` fallback | `App.tsx` | Unknown route should land safely | Unit route test |

### Intelligence

| Route | Source | UI risk | Test need |
|---|---|---|---|
| `/intelligence/analytics` | `PrimeTowerPage` | Generic tower rendering | Browser smoke |
| `/intelligence/attribution` | `PrimeTowerPage` | Generic tower rendering | Browser smoke |
| `/intelligence/forecasting` | `PrimeTowerPage` | Generic tower rendering | Browser smoke |
| `/intelligence/ai-operator` | `PrimeTowerPage` | Copilot context expectation | Browser smoke |
| `/intelligence/voc` | `PrimeTowerPage` | Data cards/table readability | Browser smoke |
| `/intelligence/alerts` | `PrimeTowerPage` | Status/severity chips | Browser smoke |
| `/intelligence/creators` | `PrimeTowerPage` | Nav active group | Browser smoke |
| `/intelligence/trends` | `PrimeTowerPage` | Nav active group | Browser smoke |
| `/intelligence/launch-decisions` | `PrimeTowerPage` | BOD-critical decision view | Browser + visual + a11y |

### Demand

| Route | Source | UI risk | Test need |
|---|---|---|---|
| `/demand/campaign-ops` | `PrimeTowerPage` | BOD-critical demand action | Browser + visual |
| `/demand/content-creator-ops` | `PrimeTowerPage` | Content/action clarity | Browser smoke |
| `/demand/lead-response-capture` | `PrimeTowerPage` | Lead handoff clarity | Browser smoke |
| `/demand/retargeting-outreach` | `PrimeTowerPage` | Re-entry logic clarity | Browser smoke |
| `/demand/acquisition` | redirect | Legacy mapping | Unit route test |
| `/demand/campaign` | redirect | Legacy mapping | Unit route test |
| `/demand/content-social` | redirect | Legacy mapping | Unit route test |
| `/demand/lead-capture` | redirect | Legacy mapping | Unit route test |
| `/demand/retargeting` | redirect | Legacy mapping | Unit route test |

### Customer

| Route | Source | UI risk | Test need |
|---|---|---|---|
| `/customer/crm-compact` | `PrimeTowerPage` | CRM not too heavy, clear customer context | Browser + visual |
| `/customer/service` | `PrimeTowerPage` | Service preview not ownership confusion | Browser smoke |

### Finance

| Route | Source | UI risk | Test need |
|---|---|---|---|
| `/finance/health` | `PrimeTowerPage` | Status/financial risk clarity | Browser smoke |
| `/finance/capital-offers` | `PrimeTowerPage` | CTA hierarchy | Browser smoke |
| `/finance/risk-trust` | `PrimeTowerPage` | Risk badges/contrast | Browser smoke |
| Legacy finance redirects | `App.tsx` | Old paths stay in shell | Unit route test |

### Ecom / COS

| Route | Source | UI risk | Test need |
|---|---|---|---|
| `/ecom/commerce-surface` | `CommerceSurfacePage` | External/core COS relation clarity | Browser smoke |
| `/ecom/cos/product-master` | `Products` | Table, filters, row/detail behavior | Browser + regression |
| `/ecom/cos/product-master/new` | `ProductCreatePage` | Form UX, validation, save/cancel | Component + browser |
| `/ecom/cos/product-master/:id/edit` | `ProductCreatePage` | Edit route integrity | Browser regression |
| `/ecom/cos/product-master/:id` | `ProductDetail` | Detail tabs/actions | Browser regression |
| `/ecom/cos/listings` | `Listings` | Channel listing density | Browser smoke |
| `/ecom/cos/inventory-brain` | `Inventory` | Dense tables/charts | Browser + responsive |
| `/ecom/cos/warehouses` | `Warehouses` | Existing test present | Unit + browser |
| `/ecom/cos/oms` | `Orders` | Row click must stay in OMS | Browser regression |
| `/ecom/cos/oms/:id` | `OrderDetail` | Detail not found vs valid IDs | Browser regression |
| `/ecom/cos/fulfillment` | `Fulfillment` | Job row click must stay in fulfillment | Browser regression |
| `/ecom/cos/fulfillment/jobs/:id` | `FulfillmentJobDetail` | Workflow timeline readability | Browser regression |
| `/ecom/cos/returns` | `Returns` | Return status workflow | Browser smoke |
| `/ecom/cos/returns/:id` | `ReturnDetail` | Detail route and status stepper | Browser regression |
| `/ecom/cos/policy-rule` | `CosPolicyRulePage` | Wrapper clarity | Browser smoke |
| `/ecom/cos/policy-rule/sla` | `SlaPolicies` | Policy table/form UX | Browser smoke |
| `/ecom/cos/policy-rule/routing` | `RoutingPlans` | Config editor UX | Browser smoke |
| `/ecom/cos/event-audit` | `CosEventAuditPage` | Audit timeline/readability | Browser smoke |

## 4. Coverage Matrix Ban Dau

| Requirement group | Source area | Test hien co | Gap |
|---|---|---|---|
| Auth protected shell | `AuthContext`, `Auth`, `App` | Partial/no direct auth UI test | Can component + browser login tests |
| Legacy route redirects | `App.tsx`, `LegacyEntityRedirect` | `App.legacy-routes.test.tsx` | Need browser click regression for live IDs |
| Global shell/nav | `AppLayout`, `AppSidebar`, `PrimeCommandPalette` | No direct tests | Need keyboard command palette + active nav tests |
| Genesis design tokens | `index.css`, primitives | Browser QA report only | Need automated visual/token smoke |
| Prime overview/tower pages | `PrimeOverview`, `PrimeTowerPage`, `PrimeOperatingSystem` | No component tests | Need route smoke + visual/a11y |
| COS product master | `Products`, `ProductDetail`, product components | No focused UI regression beyond legacy | Need row/detail/form tests |
| OMS/Fulfillment | `Orders`, `Fulfillment`, detail pages | Contract/linkage tests partial | Need browser click/detail route tests |
| Inventory/Warehouses | inventory components, `Warehouses.test.tsx` | Partial | Need responsive/table overflow checks |
| Copilot drawer/chat | copilot components | Several component tests | Need a11y/focus trap/browser smoke |
| Common UI primitives | `button/card/input/table/dialog/tabs` | No visual contract tests | Need component snapshot/DOM style smoke |

## 5. Existing Test Review Plan

Danh sach test hien co:

- `App.legacy-routes.test.tsx`
- `GlobalCopilotChatThread.test.tsx`
- `GlobalCopilotWorkspace.test.tsx`
- `AlertsFeed.test.tsx`
- `ControlTowerKpiRow.test.tsx`
- `ThemeModeSwitcher.test.tsx`
- `use-global-copilot-engine.test.tsx`
- `contracts.smoke.test.ts`
- `fulfillment-linkage.test.ts`
- `context.test.ts`
- `copilot.prompt-matrix.test.ts`
- `knowledge.test.ts`
- `Warehouses.test.tsx`

Can review tung file theo 4 cau hoi:

1. Test co map vao requirement/doc nao khong?
2. Test co assert behavior user thay duoc khong, hay chi assert implementation?
3. Test co outdated sau Genesis redesign khong?
4. Test co bo sot regression route/UI critical khong?

Expected finding ban dau:

- Good: contract/copilot tests co domain logic.
- Good: legacy route test moi cover mot phan bug redirect.
- Weak: thieu route smoke cho gan toan bo Prime OS routes.
- Weak: thieu browser tests cho active sidebar, command palette, mobile overflow.
- Missing: thieu a11y automated check cho shell/primitives.
- Missing: thieu visual token check sau Genesis.

## 6. Test Execution Strategy

Chi chay sau khi da hoan thanh docs/context/matrix o tren.

### Stage A — Baseline Code Health

Commands:

```bash
cd "/Users/admin/Desktop/Prime OS/PrimeOS_main/prime-os-phase-1/app"
npm run lint
npm run build:dev
npm run test
```

Pass criteria:

- Lint pass hoac list ro warning/blocker.
- Build pass.
- Existing tests pass 100%.

### Stage B — Route Smoke Matrix

Tao Playwright/Vitest route smoke runner cho tat ca route non-param va legacy redirects.

Coverage:

- Protected route redirect when no session.
- Login/session restore with demo token.
- Every nav route loads a non-empty heading.
- Sidebar active state matches route group.
- No route unexpectedly lands on `/overview` unless route is fallback/intentional redirect.
- No console error.

### Stage C — Browser Interaction Regression

Critical flows:

1. Auth
   - invalid login shows error near form.
   - valid login navigates to `/overview`.
   - logout returns to `/auth`.

2. Command palette
   - `Cmd/Ctrl+K` opens palette.
   - search route label filters.
   - selecting route navigates correctly.
   - Escape closes palette.

3. COS product master
   - open product list.
   - click valid product row/detail link.
   - edit route stays under `/ecom/cos/product-master/:id/edit`.
   - legacy `/products/:id` redirects to COS detail, not overview.

4. OMS
   - click first order row.
   - detail path is `/ecom/cos/oms/:id`.
   - back/nav returns to OMS state.
   - legacy `/orders/:id` resolves to same module.

5. Fulfillment
   - click first job row.
   - detail path is `/ecom/cos/fulfillment/jobs/:id`.
   - legacy `/fulfillment/jobs/:id` resolves to same module.

6. Returns
   - list loads.
   - detail path stays under `/ecom/cos/returns/:id`.

### Stage D — Visual/Responsive QA

Viewports:

- 375 x 812
- 390 x 844
- 768 x 1024
- 1024 x 768
- 1440 x 1000

Routes:

- `/auth`
- `/overview`
- `/intelligence/launch-decisions`
- `/demand/campaign-ops`
- `/customer/crm-compact`
- `/ecom/cos/product-master`
- `/ecom/cos/inventory-brain`
- `/ecom/cos/oms`
- `/ecom/cos/fulfillment`
- `/ecom/cos/returns`

Checks:

- No horizontal document overflow.
- Sticky header does not cover content.
- Sidebar usable at desktop/tablet/mobile.
- Tables scroll inside table container, not whole app by accident.
- Primary CTA count per view is controlled.
- Buttons/input/card radius match Genesis.
- Text does not overlap or truncate critical labels.
- Dense KPI panels stay readable.

### Stage E — Accessibility QA

Use axe + keyboard walkthrough.

Checks:

- Contrast: body text >= 4.5:1, secondary >= 3:1.
- Focus visible on buttons, nav links, command items, table rows, dialogs.
- Skip link works.
- Dialog/command palette traps focus and closes on Escape.
- Icon-only buttons have labels.
- Form fields have visible labels.
- Heading hierarchy is not chaotic.
- Color is not the only indicator for status.

### Stage F — Genesis Token Contract

Automated browser style checks:

- Body background equals `rgb(250, 250, 250)`.
- Body font includes `DM Sans`.
- `h1/h2/h3` font includes `General Sans`.
- Button radius resolves to `6px`.
- Main card radius resolves to `12px`.
- Header height resolves to `56px`.
- Focus ring appears on keyboard focus.
- Static card shadow is none; hover card shadow only where interactive.

### Stage G — Performance/Load Smoke

Checks:

- Route first render under acceptable local threshold.
- No major CLS on auth/overview/tables.
- Build warning from large chunks is tracked.
- Data-heavy tables avoid page freeze.
- Command palette opens within ~100ms perceived.

## 7. Tests Can Tao Them

### Unit/Component

| File de tao/cap nhat | Purpose |
|---|---|
| `src/App.route-smoke.test.tsx` | Route redirect and protected route behavior |
| `src/components/layout/AppSidebar.test.tsx` | Active state and nested nav behavior |
| `src/components/layout/PrimeCommandPalette.test.tsx` | Keyboard open/search/select/escape |
| `src/components/ui/primitives.genesis.test.tsx` | Button/input/card/table contract DOM classes |
| `src/pages/prime/PrimeOverview.test.tsx` | Overview CTA links and linked preview cards |
| `src/pages/prime/PrimeTowerPage.test.tsx` | Generic tower rendering for tower IDs |
| `src/pages/Auth.test.tsx` | Form labels, error state, submit loading |

### Playwright

| File de tao | Purpose |
|---|---|
| `tests/ui/route-smoke.spec.ts` | All key routes load and do not land wrong |
| `tests/ui/genesis-visual-contract.spec.ts` | Design token and responsive checks |
| `tests/ui/cos-detail-regression.spec.ts` | Product/OMS/Fulfillment/Returns row-detail routes |
| `tests/ui/a11y-shell.spec.ts` | Axe + keyboard navigation on shell/auth/command palette |
| `tests/ui/mobile-overflow.spec.ts` | 375/390 viewport overflow and table scroll checks |

## 8. UI Improvement Backlog

Sau khi QA chay xong, fix theo thu tu nay.

### P0 — Must Fix Before Demo/Board

1. Any route that unexpectedly redirects to overview.
2. Any console error on core routes.
3. Any mobile horizontal overflow on `/overview`, `/ecom/cos/product-master`, `/ecom/cos/oms`, `/ecom/cos/fulfillment`.
4. Any auth/session state that blocks demo login.
5. Any table row/detail click that loses module context.

### P1 — Strong UI/UX Improvement

1. Add mobile navigation adaptation if compact sidebar is too cryptic.
2. Add breadcrumbs or context trail on COS detail pages.
3. Improve table empty/error/loading states with business-specific text.
4. Make command palette searchable by business aliases: product, order, campaign, CRM, launch decision.
5. Add visible helper states for read-only user permissions.
6. Confirm every important icon-only control has accessible label/title.

### P2 — Polish

1. Harmonize old COS pages that still visually feel pre-Genesis.
2. Reduce hardcoded spacing/radius classes that fight design tokens.
3. Add visual token stories/regression route for primitives.
4. Track bundle splitting for chart/radix chunks.
5. Expand dark mode parity only after light Genesis is stable.

## 9. Acceptance Criteria

UI QA duoc xem la pass khi:

- 100% core routes load.
- 100% intentional redirects land in expected target.
- 0 unintentional redirect to `/overview`.
- 0 console runtime error on route smoke.
- 0 horizontal overflow at 375px and 1440px on priority routes.
- Auth happy path and error path pass.
- Command palette keyboard flow pass.
- COS Product/OMS/Fulfillment/Returns detail regression pass.
- Axe has no critical/serious issue on auth/overview/top priority routes.
- Genesis token contract pass.
- Existing unit tests still pass.
- New browser tests are committed with QA report.

## 10. Proposed Execution Phases

### Phase 1 — QA Baseline & Matrix

Output:

- Complete requirement-route-test matrix.
- Review quality of 13 existing tests.
- Baseline result for lint/build/test.

No UI fixes yet unless baseline cannot run.

### Phase 2 — Route & Shell Regression Tests

Build:

- Route smoke test.
- Sidebar active state test.
- Command palette test.
- Auth form test.

Goal:

- Stop overview-bounce regressions permanently.

### Phase 3 — COS Critical Flow Browser Tests

Build:

- Product Master detail/edit regression.
- OMS detail regression.
- Fulfillment job detail regression.
- Returns detail regression.

Goal:

- Lock COS as stable operational backbone.

### Phase 4 — Responsive + A11y Test Harness

Build:

- Mobile overflow Playwright checks.
- Axe checks.
- Keyboard navigation checks.

Goal:

- Turn UI/UX quality into measurable gates.

### Phase 5 — UI Improvement Pass

Apply fixes from QA findings only.

Likely targets:

- Sidebar mobile discoverability.
- Table overflow and sticky header.
- Breadcrumb/detail context.
- Empty/error/loading states.
- Focus/aria labels.

### Phase 6 — Final Report

Output:

- QA full report.
- Screenshot set.
- Remaining risks.
- Pass/fail verdict.

## 11. Immediate Next Step

De bat dau execution dung skill:

1. Chay Phase 1 only:
   - docs/context matrix
   - existing test review
   - baseline lint/build/test

2. Sau Phase 1 moi quyet dinh:
   - generate tests nao truoc
   - UI fix nao co evidence ro

Khong nen nhay thang vao polish visual, vi hien tai risk lon nhat cua Prime OS khong phai mau sac nua, ma la route integrity + UI state coverage + responsive/a11y gates.

## 12. Execution Status - 2026-04-29

Phases completed:

- Phase 1: baseline and matrix completed.
- Phase 2: route and shell regression tests added.
- Phase 3: COS critical flow browser tests added; canonical route fixes applied.
- Phase 4: responsive, axe accessibility, keyboard, and Genesis token tests added.
- Phase 5: evidence-based UI fixes applied from Phase 4 failures.
- Phase 6: final QA report written.

Final verification:

- `npm run build:dev`: pass.
- `npm run test`: pass, 54/54.
- `npx playwright test tests/prime-route-shell.spec.ts tests/cos-critical-flows.spec.ts tests/ui-responsive-genesis.spec.ts tests/ui-a11y-shell.spec.ts`: pass, 91/91.

Reports:

- `prime-os-phase-1/app/.gstack/qa-reports/qa-report-phase-1-3-ui-2026-04-29.md`
- `prime-os-phase-1/app/.gstack/qa-reports/qa-report-final-ui-phase-1-6-2026-04-29.md`

Remaining risks:

- Full lint is still not green because of existing broad lint debt.
- Dependency audit reports 6 findings after the a11y dependency install and needs a separate audit/remediation pass.
- Bundle chunk warnings remain and should be handled as performance/code-splitting work.
- Fulfillment partner detail route ownership remains undecided.
