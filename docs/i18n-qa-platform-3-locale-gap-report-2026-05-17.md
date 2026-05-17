# Platform 3-Locale QA Gap Report — PrimeOS

Date: 2026-05-17
Scope: `prime-os-phase-1/app` runtime UI static audit for EN / JA / VI readiness.
Mode: audit only — no source fixes, no generated tests.

## Verdict

**NOT READY for complete 3-language QA sign-off.** The i18n foundation exists and shell/auth/navigation are partly localized, but many product pages, product sub-pages, dialogs, drawers, detail popups, and operating copy still contain hardcoded strings outside dictionaries.

Cook goal: move marked copy into typed dictionaries with parity for `en-US`, `ja-JP`, and `vi-VN`; preserve canonical IDs/SKUs/routes/provider names.

## Mandatory QA Steps Completed

| Step | Result | Evidence |
|---|---|---|
| 0. Docs context | Completed | Read `README.md`, `prime-os-phase-1/README.md`, `prime-os-phase-1/docs/i18n/00-i18n-audit.md`, `02-hardcoded-string-map.md`. |
| 1. Project scan | Completed | 338 TS/TSX source files, 47 test files, 32 page files, 10 Prime page files, ~103 route declarations. Runtime UI scan excluded `*.test/spec.*`. |
| 2. Requirement ↔ source ↔ test map | Completed for i18n audit scope | Existing foundation test: `src/lib/i18n/i18n-foundation.test.ts`; no page-level full translation tests found. |
| 3. Existing test quality review | Completed | Dictionary parity test exists; route/page visual text coverage missing. |
| 4. Existing tests | Skipped by audit scope | User asked for marking gaps for later cook, not test generation/fix. |
| 5. Generate tests | Skipped | Audit/report only. |
| 6. Full rerun | Skipped | Audit/report only. |

## Requirements Extracted

- App must support three locales: `en-US`, `ja-JP`, `vi-VN`.
- Dictionary key shape must match across all three locales.
- Empty translation strings are forbidden.
- Unsupported stored locale values must fall back safely.
- Shell/auth/navigation already started; remaining product surfaces must move route-by-route.
- Do not translate canonical route paths, IDs, SKUs, order codes, provider names, warehouse codes, or mock entity names unless they are user-facing labels.

## Scan Summary

| Metric | Count |
|---|---:|
| Runtime UI files scanned in `src/pages` + non-UI `src/components` | 145 |
| Runtime UI files with hardcoded visible-string candidates | 75 |
| Total visible-string candidates | 2387 |
| Candidate files containing Dialog/Sheet/Popover/Drawer/Tooltip/Toast patterns | 34 |

## Area Coverage Matrix

| Area | Candidate strings | Files | Popup/dialog files | Priority note |
|---|---:|---:|---:|---|
| Demand + Customer + tower shared pages | 1003 | 1 | 1 | P0 present |
| Finance / Fin Support + wizard dialogs | 300 | 1 | 1 | P0 present |
| Branding Agent | 213 | 1 | 1 | P0 present |
| Shared / uncategorized | 162 | 19 | 7 | P1 present |
| Demand / MDEC | 113 | 1 | 1 | P0 present |
| Customer Profile Floor | 112 | 1 | 1 | P0 present |
| Account Center | 78 | 1 | 1 | P1 present |
| Fulfillment / Returns | 65 | 7 | 5 | P2/P3 |
| General Dashboard / Overview | 59 | 1 | 1 | P1 present |
| Products / Product Master dialogs | 58 | 10 | 4 | P2/P3 |
| Intelligence / Product Operation Agent | 45 | 1 | 1 | P1 present |
| Inventory / Warehouses | 31 | 11 | 5 | P2/P3 |
| Listings | 30 | 8 | 0 | P2/P3 |
| Intelligence / Consulting Agent | 26 | 1 | 1 | P2/P3 |
| Commerce Surface | 20 | 1 | 0 | P2/P3 |
| Orders / OMS | 19 | 2 | 1 | P2/P3 |
| Dashboard variant | 16 | 3 | 1 | P2/P3 |
| App shell / workspace | 14 | 3 | 2 | P2/P3 |
| COS Policy / Rule | 13 | 1 | 0 | P2/P3 |
| COS Event / Audit | 10 | 1 | 0 | P2/P3 |

## P0 / P1 Cook Targets

| Priority | Area | File | Candidates | Popup? | Current i18n usage | Sample untranslated strings |
|---|---|---|---:|---|---|---|
| P0 | Demand + Customer + tower shared pages | `src/pages/prime/PrimeTowerPage.tsx` | 1003 | Yes | Partial | 858: Big Data ingestion lane<br>866: Events / day<br>897: ML / DL insight models<br>927: Recommended activation plays<br>952: Needs review |
| P0 | Finance / Fin Support + wizard dialogs | `src/pages/prime/PrimeFinSupportPage.tsx` | 300 | Yes | No | 179: Review Routes<br>191: Readiness answer and next action<br>192: Evidence and documents<br>193: Review routes and applications<br>194: Traceability history |
| P0 | Branding Agent | `src/pages/prime/PrimeBrandAiPage.tsx` | 213 | Yes | Partial | 126: Foundation brief<br>126: Launch copy<br>136: Brand story<br>136: Color direction<br>146: Question draft |
| P0 | Demand / MDEC | `src/pages/prime/PrimeMdecPage.tsx` | 113 | Yes | No | 112: Pending review<br>112: awaiting reviewer<br>113: High severity<br>113: open escalations<br>114: Unread engagement |
| P0 | Customer Profile Floor | `src/components/prime/customer-profile/CustomerProfileFloor.tsx` | 112 | Yes | No | 83: At risk<br>89: Marketplace buyer<br>118: Decision maker<br>159: Floor health, next actions, and profile readiness.<br>160: Account Profile |
| P1 | Account Center | `src/pages/Account.tsx` | 78 | Yes | No | 193: (response: Response, backendBase: string): Promise<br>209: Account request failed.<br>282: Unable to load account center.<br>322: Đã cập nhật hồ sơ<br>322: Tên hiển thị đã được lưu trong Account Center. |
| P1 | General Dashboard / Overview | `src/pages/prime/PrimeOverview.tsx` | 59 | Yes | No | 202: More information<br>276: Check inventory<br>284: Clear customer issue blocking trust loop<br>292: Open service<br>308: Review decision |
| P1 | Shared / uncategorized | `src/components/global-copilot/domain-router.ts` | 51 | No | No | 10: tồn kho<br>10: low stock<br>10: hết hàng<br>12: chuyển kho<br>12: xuất kho |
| P1 | Intelligence / Product Operation Agent | `src/pages/prime/PrimeProductOperationAgentPage.tsx` | 45 | Yes | No | 50: Command Center<br>51: Operating Kanban<br>52: Agent Queue<br>79: More information<br>113: Operation Agent |
| P1 | Shared / uncategorized | `src/pages/UIRegressionReview.tsx` | 37 | No | No | 228: row.priority ?<br>256: Preparing UI regression fixtures<br>257: Bootstrapping deterministic demo data for review mode.<br>265: UI Regression Review<br>266: Deterministic tower previews and state fixtures for smoke QA, visual baselines, and review handoff. |

## Popup / Dialog / Drawer Hotspots

These files likely include visible modal, popover, drawer, tooltip, command palette, toast, or detail-dialog copy that must be checked in all three locales.

| Area | File | Candidates | Sample popup-related strings |
|---|---|---:|---|
| Demand + Customer + tower shared pages | `src/pages/prime/PrimeTowerPage.tsx` | 1003 | 858: Big Data ingestion lane<br>866: Events / day<br>897: ML / DL insight models<br>927: Recommended activation plays |
| Finance / Fin Support + wizard dialogs | `src/pages/prime/PrimeFinSupportPage.tsx` | 300 | 179: Review Routes<br>191: Readiness answer and next action<br>192: Evidence and documents<br>193: Review routes and applications |
| Branding Agent | `src/pages/prime/PrimeBrandAiPage.tsx` | 213 | 126: Foundation brief<br>126: Launch copy<br>136: Brand story<br>136: Color direction |
| Demand / MDEC | `src/pages/prime/PrimeMdecPage.tsx` | 113 | 112: Pending review<br>112: awaiting reviewer<br>113: High severity<br>113: open escalations |
| Customer Profile Floor | `src/components/prime/customer-profile/CustomerProfileFloor.tsx` | 112 | 83: At risk<br>89: Marketplace buyer<br>118: Decision maker<br>159: Floor health, next actions, and profile readiness. |
| Account Center | `src/pages/Account.tsx` | 78 | 193: (response: Response, backendBase: string): Promise<br>209: Account request failed.<br>282: Unable to load account center.<br>322: Đã cập nhật hồ sơ |
| General Dashboard / Overview | `src/pages/prime/PrimeOverview.tsx` | 59 | 202: More information<br>276: Check inventory<br>284: Clear customer issue blocking trust loop<br>292: Open service |
| Intelligence / Product Operation Agent | `src/pages/prime/PrimeProductOperationAgentPage.tsx` | 45 | 50: Command Center<br>51: Operating Kanban<br>52: Agent Queue<br>79: More information |
| Intelligence / Consulting Agent | `src/pages/prime/PrimeConsultingAgentPage.tsx` | 26 | 27: KPI Dashboard<br>28: Signals Board<br>29: Launch Decisions<br>33: Track active consulting metrics. |
| Fulfillment / Returns | `src/components/fulfillment/FbaShipmentPanel.tsx` | 24 | 48: TYO22 — Tokyo<br>49: TPR2 — Tokyo<br>50: FSZ1 — Fujisawa<br>51: KIX1 — Osaka |
| Shared / uncategorized | `src/components/prime/IntelligenceDragBoard.tsx` | 23 | 41: More information<br>140: Intelligence Area board<br>143: Intelligence projection<br>145: Signal → decision board |
| Orders / OMS | `src/components/oms/RoutingConfigEditor.tsx` | 18 | 317: Rule Name<br>321: e.g. Heavy Items → FBA<br>336: Target Warehouse<br>342: — Select warehouse — |
| Dashboard variant | `src/components/dashboard/PerformanceCharts.tsx` | 12 | 64: Performance Breakdown<br>83: Performance Breakdown<br>88: By Channel<br>89: By Warehouse |
| Fulfillment / Returns | `src/components/fulfillment/ExceptionDialog.tsx` | 10 | 18: Short Pick<br>20: Delivery Failed<br>67: Flag Exception<br>71: Describe what happened... |
| Products / Product Master dialogs | `src/components/products/CreateProductDialog.tsx` | 10 | 33: Food & Beverages<br>34: Home & Living<br>203: Create new product<br>222: Select product family |
| Products / Product Master dialogs | `src/pages/ProductCreatePage.tsx` | 8 | 70: CR-JP (Japan)<br>71: RSL-SG (Singapore)<br>72: FBS-MY (Malaysia)<br>73: 3PL-VN (Vietnam) |
| Fulfillment / Returns | `src/components/fulfillment/DispositionDialog.tsx` | 8 | 18: Return to available inventory<br>19: Send for repair/refurbishment<br>20: Sell at reduced price<br>21: Cannot be resold |
| Fulfillment / Returns | `src/components/fulfillment/QCDialog.tsx` | 7 | 18: A — Like New<br>19: B — Good<br>20: C — Fair<br>21: D — Poor |
| Inventory / Warehouses | `src/components/inventory/WarehouseSelector.tsx` | 7 | 57: Return Center<br>76: Select warehouse<br>159: Search warehouses...<br>161: No warehouse found. |
| App shell / workspace | `src/components/layout/AppLayout.tsx` | 7 | 106: Layer 1<br>139: Layer 2<br>177: Product functions<br>178: Layer 3 |
| Shared / uncategorized | `src/components/copilot/GlobalCopilotActions.tsx` | 6 | 38: Copy failed<br>39: Không thể copy nội dung. Bạn thử lại giúp mình nhé.<br>53: Draft confirmed<br>54: Opening prefilled form. No data has been saved yet. |
| Inventory / Warehouses | `src/components/inventory/ATSHealthDonut.tsx` | 6 | 15: Low Stock<br>16: Out of Stock<br>60: ATS Health Distribution<br>101: Low Stock |
| App shell / workspace | `src/components/layout/PrimeCommandPalette.tsx` | 6 | 76: Prime OS global search<br>77: Navigate workspaces, towers, floors, and operator actions.<br>110: Search product, SKU, order, lead, customer<br>115: Review next launch decision package |
| Fulfillment / Returns | `src/components/fulfillment/CreateShipmentDialog.tsx` | 5 | 17: Japan Post<br>31: Create Shipment<br>42: 出荷を作成<br>53: Tạo lệnh giao hàng |
| Inventory / Warehouses | `src/pages/Warehouses.tsx` | 4 | 341: e.g. CR-JP<br>392: FBA (Fulfillment by Amazon)<br>393: FBS (Fulfillment by Shopee)<br>428: pick_pack, cold_storage, cross_border |
| Shared / uncategorized | `src/components/workspace/WorkspaceTabBar.tsx` | 3 | 54: Open product tabs<br>122: Open tabs menu<br>146: Open another product tab |
| Products / Product Master dialogs | `src/pages/Products.tsx` | 2 | 206: Clear search<br>225: Product gallery |
| Products / Product Master dialogs | `src/components/products/SelectVariantsDialog.tsx` | 2 | 65: Select Variants<br>115: Select all |
| Shared / uncategorized | `src/pages/Auth.tsx` | 1 | 160: seller@company.com |
| Shared / uncategorized | `src/pages/SlaPolicies.tsx` | 1 | 120: ; priority?: Record |
| Shared / uncategorized | `src/components/copilot/GlobalCopilotDrawer.tsx` | 1 | 37: Prime AI |
| Shared / uncategorized | `src/components/copilot/GlobalCopilotFAB.tsx` | 1 | 11: Prime AI |
| Inventory / Warehouses | `src/components/inventory/ATSBucketChart.tsx` | 1 | 71: ATS Breakdown by SKU |
| Inventory / Warehouses | `src/components/inventory/MovementsTable.tsx` | 1 | 311: View batch |

## Product/Page Route Notes

| Product / route group | Status | Files to cook first | Notes |
|---|---|---|---|
| General Dashboard / `/overview` | Partial, still hardcoded | `PrimeOverview.tsx` | Recent taste upgrade added/kept English operational copy. Needs overview dictionary. |
| Demand hub/sources/campaigns/content/leads/re-engage | Weak to partial | `PrimeTowerPage.tsx`, `PrimeMdecPage.tsx` | Shared tower file contains the largest candidate count and many views. |
| Customer / CRM compact / service | Weak to partial | `PrimeTowerPage.tsx`, `CustomerProfileFloor.tsx` | Customer profile floor and service tower text need dictionaries. |
| Finance / Fin Support | Weak | `PrimeFinSupportPage.tsx` | Includes overview cockpit, detail dialog, wizard, blockers, lender route copy. |
| Intelligence / Operation Agent | Weak | `PrimeProductOperationAgentPage.tsx`, `PrimeConsultingAgentPage.tsx` | Command center, kanban, queues, chat/dialogue copy are hardcoded. |
| Branding Agent | Partial but large | `PrimeBrandAiPage.tsx` | Uses some i18n patterns but has many hardcoded brief/workspace labels. |
| Products / Product Master | Partial | `components/products/*`, `ProductCreatePage.tsx` | Dialogs and forms contain visible labels/placeholders. |
| Listings | Partial | `components/listings/groups/*` | Safety, identity, shipping, offer groups contain untranslated form labels/help. |
| Inventory / Warehouses | Partial | `WarehouseSelector.tsx`, inventory components/pages | Selectors and table controls still have English labels/placeholders. |
| OMS / Orders | Partial | `RoutingConfigEditor.tsx`, orders components | Rule editor + order filters/status UI need key extraction. |
| Fulfillment / Returns | Partial | `ExceptionDialog.tsx`, `DispositionDialog.tsx`, `QCDialog.tsx`, `Fba*` | Return/exception modal copy should be dictionary-backed. |
| Account Center | Weak | `Account.tsx` | Backend/account error states and action labels remain hardcoded. |

## Full Runtime Candidate Appendix

| Priority | Area | File | Candidates | Popup? | Samples |
|---|---|---|---:|---|---|
| P0 | Demand + Customer + tower shared pages | `src/pages/prime/PrimeTowerPage.tsx` | 1003 | Yes | 858: Big Data ingestion lane<br>866: Events / day<br>897: ML / DL insight models<br>927: Recommended activation plays<br>952: Needs review<br>953: Ready for Demand |
| P0 | Finance / Fin Support + wizard dialogs | `src/pages/prime/PrimeFinSupportPage.tsx` | 300 | Yes | 179: Review Routes<br>191: Readiness answer and next action<br>192: Evidence and documents<br>193: Review routes and applications<br>194: Traceability history<br>206: Readiness score |
| P0 | Branding Agent | `src/pages/prime/PrimeBrandAiPage.tsx` | 213 | Yes | 126: Foundation brief<br>126: Launch copy<br>136: Brand story<br>136: Color direction<br>146: Question draft<br>155: Brand Library |
| P0 | Demand / MDEC | `src/pages/prime/PrimeMdecPage.tsx` | 113 | Yes | 112: Pending review<br>112: awaiting reviewer<br>113: High severity<br>113: open escalations<br>114: Unread engagement<br>114: across all channels |
| P0 | Customer Profile Floor | `src/components/prime/customer-profile/CustomerProfileFloor.tsx` | 112 | Yes | 83: At risk<br>89: Marketplace buyer<br>118: Decision maker<br>159: Floor health, next actions, and profile readiness.<br>160: Account Profile<br>160: Account list, profile edit, ownership, lifecycle, contacts, and tags. |
| P1 | Account Center | `src/pages/Account.tsx` | 78 | Yes | 193: (response: Response, backendBase: string): Promise<br>209: Account request failed.<br>282: Unable to load account center.<br>322: Đã cập nhật hồ sơ<br>322: Tên hiển thị đã được lưu trong Account Center.<br>325: Không thể lưu hồ sơ |
| P1 | General Dashboard / Overview | `src/pages/prime/PrimeOverview.tsx` | 59 | Yes | 202: More information<br>276: Check inventory<br>284: Clear customer issue blocking trust loop<br>292: Open service<br>308: Review decision<br>316: Run next demand play against reachable audience |
| P1 | Shared / uncategorized | `src/components/global-copilot/domain-router.ts` | 51 | No | 10: tồn kho<br>10: low stock<br>10: hết hàng<br>12: chuyển kho<br>12: xuất kho<br>14: in stock |
| P1 | Intelligence / Product Operation Agent | `src/pages/prime/PrimeProductOperationAgentPage.tsx` | 45 | Yes | 50: Command Center<br>51: Operating Kanban<br>52: Agent Queue<br>79: More information<br>113: Operation Agent<br>160: Recommended action |
| P1 | Shared / uncategorized | `src/pages/UIRegressionReview.tsx` | 37 | No | 228: row.priority ?<br>256: Preparing UI regression fixtures<br>257: Bootstrapping deterministic demo data for review mode.<br>265: UI Regression Review<br>266: Deterministic tower previews and state fixtures for smoke QA, visual baselines, and review handoff.<br>270: Product Master |
| P2 | Intelligence / Consulting Agent | `src/pages/prime/PrimeConsultingAgentPage.tsx` | 26 | Yes | 27: KPI Dashboard<br>28: Signals Board<br>29: Launch Decisions<br>33: Track active consulting metrics.<br>34: Needs Review<br>34: Operator or source owner check. |
| P2 | Fulfillment / Returns | `src/components/fulfillment/FbaShipmentPanel.tsx` | 24 | Yes | 48: TYO22 — Tokyo<br>49: TPR2 — Tokyo<br>50: FSZ1 — Fujisawa<br>51: KIX1 — Osaka<br>52: ITM1 — Osaka Itm<br>53: NRT1 — Narita |
| P2 | Shared / uncategorized | `src/components/prime/IntelligenceDragBoard.tsx` | 23 | Yes | 41: More information<br>140: Intelligence Area board<br>143: Intelligence projection<br>145: Signal → decision board<br>146: Drag cards across Intelligence lanes to update triage state only. Source truth remains owned by Demand, Customer, Ecom / COS, and Finance.<br>146: Signal decision board info |
| P2 | Commerce Surface | `src/pages/prime/CommerceSurfacePage.tsx` | 20 | No | 32: Commerce Surface Tower<br>33: Lightweight storefront, RFQ, assisted commerce, pricing, checkout, and conversion tracking layer that feeds the COS execution core.<br>36: Open OMS handoff<br>43: Storefront signals<br>44: RFQ pipeline<br>45: Converted orders |
| P2 | Orders / OMS | `src/components/oms/RoutingConfigEditor.tsx` | 18 | Yes | 317: Rule Name<br>321: e.g. Heavy Items → FBA<br>336: Target Warehouse<br>342: — Select warehouse —<br>353: Max Weight (g)<br>356: e.g. 2000 |
| P2 | Shared / uncategorized | `src/components/global-copilot/response-templates.ts` | 17 | No | 28: Mở Products<br>29: Mở Orders<br>30: Mở Inventory Copilot<br>65: Inventory Copilot<br>107: Mở Products<br>108: Tạo Product mới |
| P2 | Products / Product Master dialogs | `src/components/products/ProductMasterForm.tsx` | 15 | No | 61: void \| Promise<br>208: Data imported from Amazon catalog<br>223: Bundle / Set<br>225: Variant Product<br>227: Single Product<br>256: Core product details and identifiers |
| P2 | COS Policy / Rule | `src/pages/prime/CosPolicyRulePage.tsx` | 13 | No | 44: COS Policy & Rule Floor<br>45: Wrapper floor for rules already present in COS. SLA and routing screens are reused; Prime OS adds cross-area guardrails that read demand, inventory, service, and forecast context.<br>49: SLA policies<br>52: Routing plans<br>60: Orders governed<br>61: Fulfillment jobs |
| P2 | Dashboard variant | `src/components/dashboard/PerformanceCharts.tsx` | 12 | Yes | 64: Performance Breakdown<br>83: Performance Breakdown<br>88: By Channel<br>89: By Warehouse<br>95: Orders by Status<br>97: No order data available |
| P2 | Listings | `src/components/listings/groups/SafetyComplianceGroup.tsx` | 12 | No | 30: Consumer Product Safety Improvement Act warning if applicable<br>31: California Proposition 65 warning if applicable<br>32: FDA compliance statement for food products<br>35: Halal certificate number if applicable<br>36: Indonesian FDA registration number<br>39: Japanese Industrial Standards compliance |
| P2 | COS Event / Audit | `src/pages/prime/CosEventAuditPage.tsx` | 10 | No | 25: COS Event & Audit Floor<br>26: Audit wrapper over reused OMS events, fulfillment tracking, service cases, alerts, and AI Operator recommendations. This keeps Prime OS decisions grounded in live system context.<br>29: Review operator queue<br>36: OMS events<br>37: Tracking events<br>38: Service cases |
| P2 | Fulfillment / Returns | `src/components/fulfillment/ExceptionDialog.tsx` | 10 | Yes | 18: Short Pick<br>20: Delivery Failed<br>67: Flag Exception<br>71: Describe what happened...<br>77: 例外を登録<br>81: 発生内容を入力してください... |
| P2 | Fulfillment / Returns | `src/components/fulfillment/FbaInventorySync.tsx` | 10 | No | 54: Never synced<br>115: FBA Inventory Sync<br>145: Amazon SP-API not configured<br>166: PrimeOS Local ATS<br>172: FBA Fulfillable<br>178: Combined ATS |
| P2 | Products / Product Master dialogs | `src/components/products/CreateProductDialog.tsx` | 10 | Yes | 33: Food & Beverages<br>34: Home & Living<br>203: Create new product<br>222: Select product family<br>241: e.g. SKU-0001<br>272: QUICK ADD FROM AMAZON CATALOG |
| P3 | Products / Product Master dialogs | `src/components/listings/groups/ProductIdentityGroup.tsx` | 9 | No | 52: Product Name<br>57: Enter product name<br>73: Brand name<br>84: Product Type<br>89: e.g., Instant Noodles, Green Tea, Chocolate Snack<br>109: 14-digit GTIN |
| P3 | Products / Product Master dialogs | `src/pages/ProductCreatePage.tsx` | 8 | Yes | 70: CR-JP (Japan)<br>71: RSL-SG (Singapore)<br>72: FBS-MY (Malaysia)<br>73: 3PL-VN (Vietnam)<br>74: FBA-JP (Amazon Japan)<br>81: Food & Beverages |
| P3 | Fulfillment / Returns | `src/components/fulfillment/DispositionDialog.tsx` | 8 | Yes | 18: Return to available inventory<br>19: Send for repair/refurbishment<br>20: Sell at reduced price<br>21: Cannot be resold<br>22: Dispose of the item<br>41: Disposition * |
| P3 | Fulfillment / Returns | `src/components/fulfillment/QCDialog.tsx` | 7 | Yes | 18: A — Like New<br>19: B — Good<br>20: C — Fair<br>21: D — Poor<br>63: QC Result *<br>90: Notes (optional) |
| P3 | Inventory / Warehouses | `src/components/inventory/WarehouseSelector.tsx` | 7 | Yes | 57: Return Center<br>76: Select warehouse<br>159: Search warehouses...<br>161: No warehouse found.<br>298: Search warehouses...<br>300: No warehouse found. |
| P3 | App shell / workspace | `src/components/layout/AppLayout.tsx` | 7 | Yes | 106: Layer 1<br>139: Layer 2<br>177: Product functions<br>178: Layer 3<br>326: product settings<br>326: tower catalog |
| P3 | Shared / uncategorized | `src/components/copilot/GlobalCopilotActions.tsx` | 6 | Yes | 38: Copy failed<br>39: Không thể copy nội dung. Bạn thử lại giúp mình nhé.<br>53: Draft confirmed<br>54: Opening prefilled form. No data has been saved yet.<br>63: Draft cancelled<br>64: Copilot suggestion cancelled for this session. |
| P3 | Inventory / Warehouses | `src/components/inventory/ATSHealthDonut.tsx` | 6 | Yes | 15: Low Stock<br>16: Out of Stock<br>60: ATS Health Distribution<br>101: Low Stock<br>102: Out of Stock<br>118: Total SKUs |
| P3 | App shell / workspace | `src/components/layout/PrimeCommandPalette.tsx` | 6 | Yes | 76: Prime OS global search<br>77: Navigate workspaces, towers, floors, and operator actions.<br>110: Search product, SKU, order, lead, customer<br>115: Review next launch decision package<br>121: ↑↓ select · Enter open · Esc close<br>122: Results stay inside Prime OS ownership boundaries |
| P3 | Fulfillment / Returns | `src/components/fulfillment/CreateShipmentDialog.tsx` | 5 | Yes | 17: Japan Post<br>31: Create Shipment<br>42: 出荷を作成<br>53: Tạo lệnh giao hàng<br>64: Create Shipment |
| P3 | Inventory / Warehouses | `src/components/inventory/ReservationLedger.tsx` | 5 | No | 60: All statuses<br>72: Search SKU, order, warehouse...<br>90: No reservations found<br>167: Mark as consumed<br>178: Release reservation |
| P3 | Listings | `src/components/listings/groups/MediaGroup.tsx` | 5 | No | 90: Main image URL<br>118: Additional Images<br>123: Image URL<br>151: Set as main image<br>181: Video URL (YouTube, Vimeo, etc.) |
| P3 | Listings | `src/components/listings/groups/VariationRelationshipsGroup.tsx` | 5 | No | 47: Variation Theme<br>52: e.g., Size, Flavor, Color, Size-Flavor<br>69: Parent ASIN (if exists)<br>80: SKU Attribute Mapping<br>134: No variants selected. Go back to select variants. |
| P3 | Inventory / Warehouses | `src/pages/Warehouses.tsx` | 4 | Yes | 341: e.g. CR-JP<br>392: FBA (Fulfillment by Amazon)<br>393: FBS (Fulfillment by Shopee)<br>428: pick_pack, cold_storage, cross_border |
| P3 | Shared / uncategorized | `src/components/copilot/GlobalCopilotChatThread.tsx` | 4 | No | 20: Cần làm rõ<br>26: Draft an toàn<br>32: Điều hướng<br>256: Bắt đầu hỏi để dùng PrimeOS Assistant |
| P3 | Products / Product Master dialogs | `src/components/products/ChannelListingPanel.tsx` | 4 | No | 174: Marketplace Channels<br>178: マーケットプレイス連携<br>182: Kênh bán hàng<br>186: Marketplace Channels |
| P3 | Products / Product Master dialogs | `src/components/products/VariationThemeBuilder.tsx` | 4 | No | 166: Quick presets...<br>185: Group name (e.g., Color, Size)<br>223: Add value...<br>303: (replaces existing) |
| P3 | Shared / uncategorized | `src/components/copilot/GlobalCopilotComposer.tsx` | 3 | No | 47: Hỏi Prime AI...<br>51: Prime AI message<br>58: Send message to Prime AI |
| P3 | Dashboard variant | `src/components/dashboard/DashboardSkeleton.tsx` | 3 | No | 24: Orchestration Pipeline<br>39: Priority Alerts<br>63: Fulfillment Node Performance |
| P3 | Listings | `src/components/listings/groups/OfferGroup.tsx` | 3 | No | 79: No variants selected. Go back to select variants.<br>199: (Merchant)<br>204: (Amazon) |
| P3 | Products / Product Master dialogs | `src/components/listings/groups/ProductDetailsGroup.tsx` | 3 | No | 72: Bullet Points (5 max)<br>135: e.g., NIS-CUP-001<br>144: e.g., Classic, Premium, Limited Edition |
| P3 | Shared / uncategorized | `src/components/prime/PartnerWorkspacePanel.tsx` | 3 | No | 13: Role workspace<br>33: View / action boundary<br>50: Partner handoffs |
| P3 | Shared / uncategorized | `src/components/system/semantic-helpers.ts` | 3 | No | 225: Cần xử lý ngay để tránh ảnh hưởng SLA hoặc đồng bộ dữ liệu.<br>234: Cần theo dõi sớm để tránh leo thang thành critical.<br>243: Thông tin vận hành cần review nhưng chưa chặn flow hiện tại. |
| P3 | Shared / uncategorized | `src/components/workspace/WorkspaceTabBar.tsx` | 3 | Yes | 54: Open product tabs<br>122: Open tabs menu<br>146: Open another product tab |
| P3 | Products / Product Master dialogs | `src/pages/Products.tsx` | 2 | Yes | 206: Clear search<br>225: Product gallery |
| P3 | Shared / uncategorized | `src/components/copilot/GlobalCopilotSurface.tsx` | 2 | No | 71: Clear Prime AI conversation<br>72: Clear Prime AI conversation |
| P3 | Inventory / Warehouses | `src/components/inventory/AdjustmentTypeBadge.tsx` | 2 | No | 7: Cycle Count<br>8: Return Restock |
| P3 | Inventory / Warehouses | `src/components/inventory/MovementTypeBadge.tsx` | 2 | No | 11: Transfer In<br>12: Transfer Out |
| P3 | Listings | `src/components/listings/groups/VariantSelectionStep.tsx` | 2 | No | 72: Select all<br>114: 0 && variant.inventory |
| P3 | Products / Product Master dialogs | `src/components/products/SelectVariantsDialog.tsx` | 2 | Yes | 65: Select Variants<br>115: Select all |
| P3 | Shared / uncategorized | `src/components/system/DataTable.tsx` | 2 | No | 61: No records found<br>62: There is no data to display right now. |
| P3 | Shared / uncategorized | `src/components/system/PageDataState.tsx` | 2 | No | 49: No data yet<br>66: Something went wrong |
| P3 | Shared / uncategorized | `src/pages/Auth.tsx` | 1 | Yes | 160: seller@company.com |
| P3 | Inventory / Warehouses | `src/pages/Inventory.tsx` | 1 | No | 331: On hand |
| P3 | Products / Product Master dialogs | `src/pages/ProductDetail.tsx` | 1 | No | 351: HS Code |
| P3 | Shared / uncategorized | `src/pages/Settings.tsx` | 1 | No | 85: Asia Pacific (Tokyo) |
| P3 | Shared / uncategorized | `src/pages/SlaPolicies.tsx` | 1 | Yes | 120: ; priority?: Record |
| P3 | Shared / uncategorized | `src/components/copilot/GlobalCopilotDrawer.tsx` | 1 | Yes | 37: Prime AI |
| P3 | Shared / uncategorized | `src/components/copilot/GlobalCopilotFAB.tsx` | 1 | Yes | 11: Prime AI |
| P3 | Dashboard variant | `src/components/dashboard/KPICard.tsx` | 1 | No | 102: vs prev period |
| P3 | Fulfillment / Returns | `src/components/fulfillment/FlowTypeBadge.tsx` | 1 | No | 5: CR Direct |
| P3 | Inventory / Warehouses | `src/components/inventory/ATSBucketChart.tsx` | 1 | Yes | 71: ATS Breakdown by SKU |
| P3 | Inventory / Warehouses | `src/components/inventory/FulfillmentModeBadge.tsx` | 1 | No | 4: CR Direct |
| P3 | Inventory / Warehouses | `src/components/inventory/InventoryStatusBadge.tsx` | 1 | No | 30: flex items-center gap-1 |
| P3 | Inventory / Warehouses | `src/components/inventory/MovementsTable.tsx` | 1 | Yes | 311: View batch |
| P3 | App shell / workspace | `src/components/layout/AppSidebar.tsx` | 1 | No | 393: Prime OS |
| P3 | Listings | `src/components/listings/AISuggestionPanel.tsx` | 1 | No | 144: Suggested value: |
| P3 | Listings | `src/components/listings/ListingPreview.tsx` | 1 | No | 87: (123 reviews) |
| P3 | Listings | `src/components/listings/groups/ShippingGroup.tsx` | 1 | No | 69: No variants selected. Go back to select variants. |
| P3 | Orders / OMS | `src/components/orders/OrderStatusTabs.tsx` | 1 | No | 14: Ready to Ship |
| P3 | Shared / uncategorized | `src/components/shared/SeedDemoDataButton.tsx` | 1 | No | 19: Add Demo Data |

## Recommended Cook Order

1. Create typed domain dictionaries for Prime product surfaces: `overview`, `financeSupport`, `tower`, `mdec`, `operationAgent`, `brandAi`.
2. Cook P0 files first: `PrimeTowerPage.tsx`, `PrimeFinSupportPage.tsx`, `PrimeBrandAiPage.tsx`, `PrimeMdecPage.tsx`, `CustomerProfileFloor.tsx`.
3. Cook P1 files next: `Account.tsx`, `PrimeOverview.tsx`, `PrimeProductOperationAgentPage.tsx`, then remaining P1 shared/router copy.
4. Then cook product-operation component groups: products, listings, inventory, OMS, fulfillment/returns.
5. Add/extend tests: dictionary key parity, no blank strings, placeholder parity, route smoke with locale switch, and modal smoke for top dialogs.
6. Add static lint/check script to fail on new hardcoded visible strings in `src/pages/prime` after migration.

## Definition of Done for Cook

- Each marked user-facing string has EN/JA/VI dictionary entries.
- Locale switch changes visible copy on every audited route and popup.
- Canonical IDs/SKUs/routes/provider names remain stable.
- Existing `i18n-foundation.test.ts` passes with expanded dictionaries.
- New route-level i18n smoke covers at least: `/overview`, `/finance/fin-support`, `/demand/campaigns`, `/intelligence/product-operation-agent?view=command`, `/products`, `/orders`, `/fulfillment`.

## Caveats

- Static scan over-counts some internal strings, fixtures, codes, and product names. Cook should triage before translating.
- Static scan under-counts text assembled by variables, data factories, and runtime API/mock data.
- This report is designed as a cook checklist, not final localization QA sign-off.

## Cook Progress — 2026-05-17 Batch 1

Implemented now:
- Added an inline typed overview locale map inside `PrimeOverview.tsx` for high-visibility `/overview` chrome, KPI labels, quick links, mode switch, priority queue labels, and tooltip copy.
- Wired `/overview` to `useI18n()` so `en-US`, `ja-JP`, and `vi-VN` visibly change without altering route/data contracts.
- Added missing shell navigation labels for Campaigns subpages: `campaigns-overview`, `campaigns-pipeline`, `campaigns-planner`, `campaigns-readiness`, `campaigns-execution-queue`, `campaigns-results` across all three locales.

Validation:
- `npm run build:dev` passed.
- `npm run test -- src/lib/i18n/i18n-foundation.test.ts` passed: 6/6.
- Browser locale smoke via `localStorage ech.locale` passed for `/overview`:
  - `en-US`: finds `General Dashboard`
  - `ja-JP`: finds `総合ダッシュボード`
  - `vi-VN`: finds `Bảng điều khiển tổng quan`
- Static runtime i18n scan improved `/overview` from 59 candidates to 18 candidates.

Remaining `/overview` candidates after Batch 1:
- Some dynamic action titles/reasons and evidence text remain hardcoded because they combine live mock data with operating explanations.
- Next cook pass should extract the remaining 18 `/overview` candidates only if desired, or move to P0 files first.

Recommended next cook batch:
1. `PrimeFinSupportPage.tsx` — finance overview, funding wizard, lender/detail dialogs.
2. `PrimeMdecPage.tsx` — demand MDEC tabs and modal/action copy.
3. `CustomerProfileFloor.tsx` — customer floor and popup copy.
4. `PrimeBrandAiPage.tsx` — brand workspace labels and creation flow.
5. `PrimeTowerPage.tsx` — very large; split by tower/tab rather than one commit.

## Cook Progress — P0 continuation 2026-05-17 22:51

### Files advanced
- `PrimeMdecPage.tsx`: wired `useI18n()` for shell nav labels, KPI strip, header search/date/actions, hero title/subtitle, log labels across `en-US`, `ja-JP`, `vi-VN`.
- `CustomerProfileFloor.tsx`: added 3-locale copy map for sub-floor nav, overview metrics, account list filters/table/mobile labels, empty states, identity matching shell.
- `PrimeBrandAiPage.tsx`: added 3-locale UI copy for Branding Agent shell, dashboard hero CTA, My Assets header/metrics/filter/search/empty/dialog action labels.

### Validation
- `npm run test -- src/lib/i18n/i18n-foundation.test.ts` → passed, 6/6.
- `git diff --check` on touched P0 files → passed.
- `npm run build:dev` passed after MDEC and Customer Profile batches; later build runner returned no active node/vite process after transform, so full final build should be re-run after PrimeTower split.

### Remaining P0
- `PrimeTowerPage.tsx` remains the large split target (`12385` LOC). Recommended next pass: extract runtime intelligence/finance/demand-source sections into dedicated modules before doing deeper string localization.

## Cook Progress — P0 PrimeTower split pass 2026-05-17 22:53

### Files advanced
- `PrimeTowerPage.tsx`: started split by extracting shared tower constants and `TowerJob` type out of the 12k-line monolith.
- `PrimeTowerPage.constants.ts`: new dedicated constants module for demand/intelligence/finance tower IDs and Demand handoff hrefs.

### Validation
- `git diff --check` on P0 touched files → passed.
- `npm run test -- src/lib/i18n/i18n-foundation.test.ts` → passed, 6/6.
- `npx vite build --mode development --minify false` → passed.

### Remaining PrimeTower work
- Continue extracting larger sections in safe slices: `Intelligence runtime panels`, `Finance runtime panels`, `Marketplace source workspace`, `Source function workspace`.

## Cook Progress — P0 PrimeTower split pass 2 2026-05-17 23:04

### Files advanced
- `PrimeTowerPage.tsx`: removed large Intelligence and Finance runtime blocks from the main tower monolith; main page now imports dedicated runtime panels.
- `PrimeTowerPage.intelligence-runtime.tsx`: new extracted module for Intelligence creator/customer/launch runtime panels plus shared status/tower job helpers required by the main page.
- `PrimeTowerPage.finance-runtime.tsx`: new extracted module for Finance readiness/offers/risk/settlement runtime panels.
- `PrimeTowerPage.constants.ts`: remains shared constants/types boundary for tower groups and demand hrefs.

### Validation
- `npx vite build --mode development --minify false` → passed after Intelligence split and after Finance split.
- `git diff --check` on Tower split files → passed.
- `npm run test -- src/lib/i18n/i18n-foundation.test.ts` → passed, 6/6.

### Remaining PrimeTower split work
- Marketplace source workspace extraction.
- Source function workspace extraction.
- Then deeper Tower string localization once modules are smaller.

## Cook Progress — P0 PrimeTower split pass 3 2026-05-17 23:09

### Files advanced
- `PrimeTowerPage.tsx`: removed Marketplace source workspace and Source function workspace blocks from the main tower page.
- `PrimeTowerPage.marketplace-workspace.tsx`: new extracted module for Marketplace route map, KPI strip, overview/accounts/signals/SKU/inquiry/attribution/quality/data-health/detail views, plus shared source visual helpers.
- `PrimeTowerPage.source-function-workspace.tsx`: new extracted module for Source Function route helpers, route map, KPI/funnel/quality views, connection/signal/SKU/intake/attribution/data-health/detail views.

### Validation
- `git diff --check` on Tower split files → passed.
- `npm run test -- src/lib/i18n/i18n-foundation.test.ts` → passed, 6/6.
- `npm run build:dev` → passed.

### PrimeTower split status
- Main `PrimeTowerPage.tsx` reduced from `12385` LOC to `7722` LOC.
- Extracted modules now isolate Intelligence runtime, Finance runtime, Marketplace workspace, Source Function workspace, and constants.
- Remaining i18n work is now smaller and should be done module-by-module rather than in the former monolith.
