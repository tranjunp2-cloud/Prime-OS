# Prime OS V1.0 SaaS Alignment Report

Ngay lap: 2026-05-08  
Pham vi: doi chieu UI screenshot corpus voi tai lieu `Prime OS V1.0 (1).pdf`  
Ket qua: Product dang dung huong cho Phase 1 operator console, chua du de goi la full Prime OS V1 ecosystem.

## 1. Executive Verdict

Neu danh gia theo muc tieu `Phase 1 internal operator SaaS`, Prime OS hien tai dat khoang `70-75%` so voi tai lieu V1.0.

Neu danh gia theo muc tieu `full Prime OS V1.0 commerce ecosystem`, hien tai chi dat khoang `50-60%`.

Ly do:

- 5 Area chinh da co: Demand, Customer, Ecom/COS, Intelligence, Finance.
- Closed-loop story da co trong IA: Intelligence -> Demand -> Customer -> Ecom/COS -> Finance -> Intelligence.
- Ecom/COS la phan dung PRD nhat: product truth, inventory, OMS, fulfillment, returns, policy, audit.
- Intelligence va Finance dung huong: decision support, signals, launch decisions, funding readiness, lender matching.
- Customer con hep so voi PRD: thieu timeline/lifecycle/retention/RFQ/quote continuity manh.
- Multi-sided ecosystem chua hien ro: bank portal, agency workspace, lead provider, KOL/KOC partner surface chua co.
- Van con mot so page/detail empty hoac demo-like: SLA policy, order detail, return detail.
- Corpus `vi-VN` van con nhieu UI English, lam yeu cam giac unified OS.

## 2. Evidence Sources

| Source | Path |
| --- | --- |
| PRD PDF | [Prime OS V1.0 (1).pdf](</Users/admin/Desktop/Prime OS V1.0 (1).pdf>) |
| Extracted PRD text | [prime-os-v1-text-clean.txt](</Users/admin/Desktop/Prime OS/PrimeOS_main/research/prime-os-v1-pdf-extract/prime-os-v1-text-clean.txt>) |
| Screenshot manifest | [manifest.json](</Users/admin/Desktop/Prime OS/PrimeOS_main/research/screenshots/20260508-073532-primeos-pages-popups-vi/manifest.json>) |
| Screenshot index | [index.html](</Users/admin/Desktop/Prime OS/PrimeOS_main/research/screenshots/20260508-073532-primeos-pages-popups-vi/index.html>) |
| Screenshot folder | [20260508-073532-primeos-pages-popups-vi](</Users/admin/Desktop/Prime OS/PrimeOS_main/research/screenshots/20260508-073532-primeos-pages-popups-vi>) |

Screenshot corpus:

- Locale: `vi-VN`
- Viewport: `1440x1200`
- Total screenshots: `66`
- Split: page `3`, Demand `6`, Finance `6`, Customer `6`, Ecom `13`, Intelligence `11`, Ecom detail `5`, Popup `16`

Contact sheets:

![Overview contact sheet](</Users/admin/Desktop/Prime OS/PrimeOS_main/research/screenshots/20260508-073532-primeos-pages-popups-vi/contact-sheet-page.jpg>)

![Demand contact sheet](</Users/admin/Desktop/Prime OS/PrimeOS_main/research/screenshots/20260508-073532-primeos-pages-popups-vi/contact-sheet-demand.jpg>)

![Customer contact sheet](</Users/admin/Desktop/Prime OS/PrimeOS_main/research/screenshots/20260508-073532-primeos-pages-popups-vi/contact-sheet-customer.jpg>)

![Ecom contact sheet](</Users/admin/Desktop/Prime OS/PrimeOS_main/research/screenshots/20260508-073532-primeos-pages-popups-vi/contact-sheet-ecom.jpg>)

![Finance contact sheet](</Users/admin/Desktop/Prime OS/PrimeOS_main/research/screenshots/20260508-073532-primeos-pages-popups-vi/contact-sheet-finance.jpg>)

![Intelligence contact sheet](</Users/admin/Desktop/Prime OS/PrimeOS_main/research/screenshots/20260508-073532-primeos-pages-popups-vi/contact-sheet-intelligence.jpg>)

![Popup contact sheet](</Users/admin/Desktop/Prime OS/PrimeOS_main/research/screenshots/20260508-073532-primeos-pages-popups-vi/contact-sheet-popup.jpg>)

## 3. PRD Requirement Model

Tai lieu V1.0 dinh nghia Prime OS nhu sau:

1. `Prime OS = commerce operating system`, khong phai tap hop dashboard roi rac.
2. Architecture can theo `Area -> Tower -> Floor`.
3. 5 Area cot loi:
   - Demand: tao demand, traffic, lead, inquiry, RFQ, re-engagement.
   - Customer: giu customer context, identity, timeline, follow-up, service, loyalty, RFQ/quote continuity.
   - Ecom/COS: thuc thi commerce operation qua product truth, inventory reality, OMS, fulfillment, policy, audit.
   - Intelligence: hieu what/why/next, explain, predict, recommend, improve.
   - Finance: bien commerce performance thanh financial profile, funding readiness, banking access, capital opportunity.
4. Closed loop:
   - Intelligence provides direction.
   - Demand creates demand.
   - Customer preserves context.
   - Ecom executes transactions.
   - Finance expands financial capability.
   - Feedback flows back into Intelligence.
5. Multi-sided ecosystem:
   - Japanese factory / seller.
   - Agency / middleman operator.
   - Bank / financial institution.
   - Lead provider.
   - KOL/KOC agency.

## 4. Coverage Matrix By Area

| Area | PRD intent | Screenshot evidence | Alignment | Verdict |
| --- | --- | --- | --- | --- |
| Overview / OS shell | Unified command layer, closed-loop operating home | `/overview`, command palette, Prime AI global | Medium-high | Dung huong, nhung van lap lai critical narrative va con English |
| Demand | Generate growth input, campaigns, sources, content, leads/RFQ, re-engage | `/demand/hub`, `/sources`, `/campaigns`, `/content-social`, `/leads-rfqs`, `/re-engage` | High | Route coverage tot, visual system ro, can them attribution-to-order proof |
| Customer | Identity, profile, timeline, follow-up, lifecycle, loyalty, B2B buyer context, RFQ/quote continuity | `/customer/crm-compact`, `/customer/service`, account/contact/tags dialogs | Medium | CRM compact co nen tang, nhung Customer Area chua du sau so voi PRD |
| Ecom/COS | Commerce execution core: product, inventory, order, fulfillment, return, policy, audit | Product Master, Listings, Inventory Brain, Warehouse, OMS, Fulfillment, Returns, Policy, Event Audit | High | Area manh nhat; can hoan thien empty/detail pages |
| Intelligence | Decision support, signals, analytics, attribution, forecasting, VOC, launch decisions | Decision Hub, Signals variants, Launch Decisions, creator shortlist | Medium-high | Dung tinh than decision layer; mot so view con duplicate, phan biet capability chua ro |
| Finance | Financial enablement, cashflow, settlement, receivables, banking partner, credit readiness, funding access | Fin Support, lenders, documents, application flow, status, blockers, loan wizard | Medium-high | Funding access rat dung huong; broader finance profile/cashflow/receivables chua ro |

## 5. Screen Evidence Matrix

| Requirement | Evidence | Assessment |
| --- | --- | --- |
| Area navigation | [001 overview](</Users/admin/Desktop/Prime OS/PrimeOS_main/research/screenshots/20260508-073532-primeos-pages-popups-vi/001-page-overview.png>) | Co OS shell + nav trai. Good base. |
| Demand growth input | [004 demand hub](</Users/admin/Desktop/Prime OS/PrimeOS_main/research/screenshots/20260508-073532-primeos-pages-popups-vi/004-demand-demand-hub.png>), [008 leads/rfqs](</Users/admin/Desktop/Prime OS/PrimeOS_main/research/screenshots/20260508-073532-primeos-pages-popups-vi/008-demand-leads-rfqs.png>) | Cover dung channel/campaign/lead/RFQ. |
| Customer context | [016 customer overview](</Users/admin/Desktop/Prime OS/PrimeOS_main/research/screenshots/20260508-073532-primeos-pages-popups-vi/016-customer-customer-profile-overview.png>), [021 service](</Users/admin/Desktop/Prime OS/PrimeOS_main/research/screenshots/20260508-073532-primeos-pages-popups-vi/021-customer-customer-service.png>) | Co profile/service, nhung timeline/lifecycle/retention chua manh. |
| Product truth | [023 product master](</Users/admin/Desktop/Prime OS/PrimeOS_main/research/screenshots/20260508-073532-primeos-pages-popups-vi/023-ecom-product-master.png>), [046 product detail](</Users/admin/Desktop/Prime OS/PrimeOS_main/research/screenshots/20260508-073532-primeos-pages-popups-vi/046-ecom-detail-product-detail.png>) | Good. Product/SKU truth visible. |
| Inventory reality | [026 inventory brain](</Users/admin/Desktop/Prime OS/PrimeOS_main/research/screenshots/20260508-073532-primeos-pages-popups-vi/026-ecom-inventory-brain.png>) | Good. Need show stock ledger/reservation eventually. |
| Order orchestration | [028 OMS](</Users/admin/Desktop/Prime OS/PrimeOS_main/research/screenshots/20260508-073532-primeos-pages-popups-vi/028-ecom-oms.png>), [048 order detail](</Users/admin/Desktop/Prime OS/PrimeOS_main/research/screenshots/20260508-073532-primeos-pages-popups-vi/048-ecom-detail-order-detail.png>) | List good, detail weak/empty. |
| Fulfillment control | [029 fulfillment](</Users/admin/Desktop/Prime OS/PrimeOS_main/research/screenshots/20260508-073532-primeos-pages-popups-vi/029-ecom-fulfillment.png>), [049 fulfillment job detail](</Users/admin/Desktop/Prime OS/PrimeOS_main/research/screenshots/20260508-073532-primeos-pages-popups-vi/049-ecom-detail-fulfillment-job-detail.png>) | Good Phase 1 evidence. |
| Policy/rule | [031 policy rule](</Users/admin/Desktop/Prime OS/PrimeOS_main/research/screenshots/20260508-073532-primeos-pages-popups-vi/031-ecom-policy-rule.png>), [032 policy SLA](</Users/admin/Desktop/Prime OS/PrimeOS_main/research/screenshots/20260508-073532-primeos-pages-popups-vi/032-ecom-policy-sla.png>) | Concept good, SLA empty weakens policy-driven claim. |
| Event/audit | [034 event audit](</Users/admin/Desktop/Prime OS/PrimeOS_main/research/screenshots/20260508-073532-primeos-pages-popups-vi/034-ecom-event-audit.png>) | Strong fit with auditability. |
| Intelligence decision support | [035 decision hub](</Users/admin/Desktop/Prime OS/PrimeOS_main/research/screenshots/20260508-073532-primeos-pages-popups-vi/035-intelligence-decision-hub.png>), [045 launch decisions](</Users/admin/Desktop/Prime OS/PrimeOS_main/research/screenshots/20260508-073532-primeos-pages-popups-vi/045-intelligence-launch-decisions.png>) | Strong concept; view variants need stronger differentiation. |
| Finance funding access | [010 Fin Support top](</Users/admin/Desktop/Prime OS/PrimeOS_main/research/screenshots/20260508-073532-primeos-pages-popups-vi/010-finance-fin-support-top.png>), [012 lenders](</Users/admin/Desktop/Prime OS/PrimeOS_main/research/screenshots/20260508-073532-primeos-pages-popups-vi/012-finance-fin-support-lenders.png>) | Very aligned with embedded funding direction. |
| Finance docs/status | [013 documents](</Users/admin/Desktop/Prime OS/PrimeOS_main/research/screenshots/20260508-073532-primeos-pages-popups-vi/013-finance-fin-support-documents.png>), [014 status](</Users/admin/Desktop/Prime OS/PrimeOS_main/research/screenshots/20260508-073532-primeos-pages-popups-vi/014-finance-fin-support-status.png>) | Good workflow proof. Needs broader settlement/cashflow surfaces. |
| Prime AI support | [052 Prime AI global](</Users/admin/Desktop/Prime OS/PrimeOS_main/research/screenshots/20260508-073532-primeos-pages-popups-vi/052-popup-prime-ai-global.png>), [060 finance Prime AI](</Users/admin/Desktop/Prime OS/PrimeOS_main/research/screenshots/20260508-073532-primeos-pages-popups-vi/060-popup-finance-ask-prime-ai.png>) | Good assistant layer. Watch overlay overload. |

## 6. What Is Built Correctly

### 6.1 Macro Architecture

5 Area trong PRD da duoc phan anh trong UI/nav/routes. Day la thanh cong lon nhat cua ban hien tai. Product khong con la dashboard don le; no co dang mot operating shell.

### 6.2 Ecom/COS

Ecom/COS dang gan PRD nhat:

- Product Master owns product/SKU/listing truth.
- Inventory Brain handles stock reality and operational signals.
- OMS owns order orchestration.
- Fulfillment owns pick/pack/ship/job execution.
- Returns exists as operational floor.
- Policy & Rule exists.
- Event & Audit exists.

Day la backbone dung cho Prime OS. Nen uu tien bien Ecom/COS thanh source-of-truth that su, khong chi UI mock.

### 6.3 Finance Direction

Fin Support dung voi huong moi:

- Funding readiness.
- Eligible range.
- Matched banks/lenders.
- Risk blockers.
- Document center.
- Application status.
- Loan wizard.
- Prime AI assistant.

No khong doc nhu accounting dashboard. No doc nhu embedded finance gateway. Day la quyet dinh product dung.

### 6.4 Intelligence Direction

Decision Hub / Signals / Launch Decisions da gan voi PRD:

- Explain what is happening.
- Recommend next actions.
- Connect signals across Area.
- Support launch/campaign/product decisions.

Phan nay can bot duplicate view, nhung direction dung.

## 7. Major Gaps

### P0 - Customer Area Underbuilt

PRD yeu cau Customer Area phai giu customer context usable across growth, commerce, service operations. Screenshot hien tai moi manh o account/profile/contact/tag/identity.

Thieu hoac chua ro:

- Unified customer timeline.
- Lifecycle tracking.
- Follow-up ownership.
- Loyalty / repeat purchase / retention.
- B2B buyer context.
- RFQ history.
- Quote continuity.
- Service case lifecycle.

Tac dong:

- Closed loop bi gay tai Customer.
- Demand -> Customer -> Ecom handoff chua du thuyet phuc.
- CRM compact de bi hieu nhu CRUD account UI, khong phai Customer Area.

### P0 - Multi-Sided Ecosystem Not Visible

PRD co user story cho:

- Japanese factory / seller.
- Agency / middleman.
- Bank / financial partner.
- Lead provider.
- KOL/KOC agency.

Screenshot hien tai gan nhu la internal merchant/operator console. Chua co ro:

- Bank partner portal.
- Agency workspace.
- Lead provider ingestion/status.
- KOL/KOC agency attribution workspace.
- Role-based operating modes.

Tac dong:

- Neu demo voi stakeholder theo PRD, product co the bi danh gia la admin SaaS noi bo, chua phai ecosystem OS.

### P1 - Finance Breadth Still Narrow

Fin Support rat dung ve funding access, nhung PRD Finance Area rong hon:

- Usable financial profile from commerce activity.
- Cashflow visibility.
- Settlement consistency.
- Receivables.
- Banking partner connectivity.
- Credit readiness.
- Documents, terms, eligibility signals.

Hien tai Finance moi chung minh tot `capital support workflow`. Can bo sung `financial trust profile` va `commerce-to-finance evidence`.

### P1 - Policy/SLA And Detail Pages Not Complete

Evidence:

- [032 policy SLA](</Users/admin/Desktop/Prime OS/PrimeOS_main/research/screenshots/20260508-073532-primeos-pages-popups-vi/032-ecom-policy-sla.png>) empty state.
- [048 order detail](</Users/admin/Desktop/Prime OS/PrimeOS_main/research/screenshots/20260508-073532-primeos-pages-popups-vi/048-ecom-detail-order-detail.png>) empty/error-looking.
- [050 return detail](</Users/admin/Desktop/Prime OS/PrimeOS_main/research/screenshots/20260508-073532-primeos-pages-popups-vi/050-ecom-detail-return-detail.png>) empty/error-looking.

Tac dong:

- Lam yeu claim `single reliable policy-driven operating system`.
- Ecom/COS list pages tot, nhung drill-down chua du production-grade.

### P1 - Locale Incomplete

Corpus la `vi-VN`, nhung nhieu page/popup con English:

- Overview: `TODAY'S MISSION`, `Operating Home`, `Check inventory`.
- Finance: `Unlock financing...`, `Funding Application Flow`.
- Command palette: English header/footer.
- Loan wizard: mostly English.

Tac dong:

- Pha cam giac unified OS.
- Khong dat QA ngon ngu cho 3-locale SaaS.
- Anh huong trust, nhat la Finance/Customer.

### P2 - Intelligence Views Too Similar

Cac view:

- `/intelligence/decision-hub`
- `?view=operator`
- `?view=alerts`
- `?capability=analytics`
- `/intelligence/signals` variants

Nhieu screenshot doc gan nhu cung layout/content. PRD noi Intelligence khong phai 6 technical tools roi rac; day la capability products. Vi vay moi view can co job-to-be-done rieng.

## 8. UX/Product Risks

| Risk | Severity | Detail |
| --- | --- | --- |
| Product perceived as admin dashboard | High | Neu Customer/Finance/partner surfaces chua mo rong, Prime OS se doc nhu ERP-lite/operator BI. |
| Closed loop not fully proven | High | Demand -> Customer -> Ecom -> Finance -> Intelligence can visible handoff + trace evidence, khong chi nav. |
| Customer layer weakens entire OS | High | Customer la context bridge; neu no chi la profile table thi ecosystem story bi gay. |
| Finance over-focused on one workflow | Medium | Fin Support good, nhung Finance Area con can financial profile/cashflow/settlement/receivables. |
| Overlay overload | Medium | Finance wizard + Prime AI sidecar + background page co the lam tang cognitive load. |
| Translation inconsistency | Medium | Mixed English/Vietnamese/Japanese gay cam giac chua hoan thien. |
| Empty detail pages break trust | Medium | Drill-down rong lam user nghi mock data/UI chua production-ready. |

## 9. Recommended Roadmap

### Phase 1 - Make Current MVP Defensible

Muc tieu: dam bao day la Prime OS Phase 1 operator console co the demo.

1. Fix empty/detail pages:
   - SLA policy.
   - Order detail.
   - Return detail.
2. Clean locale for all current screenshot routes:
   - VI.
   - JA.
   - EN.
3. Standardize Area -> Tower -> Floor breadcrumbs.
4. Reduce duplicate critical narratives in Overview/Intelligence.
5. Add visible cross-area handoff labels:
   - Source area.
   - Target area.
   - Owner.
   - Next action.
   - Business impact.

### Phase 2 - Strengthen Customer Area

Muc tieu: bien Customer thanh relationship/context layer, khong phai CRM compact table.

Add:

- Customer timeline.
- RFQ/inquiry/order/service unified history.
- Follow-up queue.
- Lifecycle stage automation.
- Retention / repeat purchase signals.
- Quote continuity.
- Service case ownership and SLA.

### Phase 3 - Broaden Finance Beyond Fin Support

Muc tieu: Finance = financial enablement layer.

Keep Fin Support as main gateway, but add:

- Financial trust profile.
- Settlement consistency panel.
- Receivables aging / expected payout.
- Cashflow pressure signals.
- Commerce evidence pack.
- Bank-facing risk/evidence summary.

Khong tao ERP accounting dashboard. Tat ca nen noi voi commerce evidence va funding readiness.

### Phase 4 - Prove Multi-Sided Ecosystem

Muc tieu: Prime OS khong chi cho merchant/operator noi bo.

Add role/workspace concepts:

- Factory owner view.
- Agency operator view.
- Bank partner review view.
- Lead provider performance view.
- KOL/KOC agency attribution view.

Khong can build full portal ngay. Co the bat dau bang route/demo mode:

- `role=factory`
- `role=agency`
- `role=bank`
- `role=lead-provider`
- `role=creator-agency`

### Phase 5 - Harden Intelligence As Learning Loop

Muc tieu: Intelligence khong chi la summary cards.

Add:

- Signal lineage.
- Why this recommendation.
- Evidence source.
- Confidence / uncertainty.
- Feedback accepted/rejected.
- Action outcome loop back into model.

## 10. Acceptance Criteria For "Built Correctly"

Prime OS co the duoc coi la dung V1.0 hon khi dat cac dieu kien sau:

- 5 Area deu co page chinh, floor logic, va source-of-truth boundary ro.
- Moi Area co at least 1 cross-area handoff visible.
- Customer co timeline + RFQ/quote/order/service continuity.
- Finance co funding support + financial trust profile + settlement/receivables evidence.
- Ecom/COS detail pages khong empty, co state, owner, next action, audit.
- Intelligence moi recommendation deu co why/evidence/source/target action.
- Partner roles duoc the hien it nhat bang demo workspace hoac role mode.
- VI/JA/EN khong con mixed-language trong primary UI.
- Command palette/Prime AI khong thay the core workflow; chi accelerate/investigate/assist.
- UI the hien `Area -> Tower -> Floor` nhat quan.

## 11. Final Assessment

Prime OS hien tai da co dung skeleton cua V1.0:

- IA dung.
- Route coverage tot.
- Ecom/COS manh.
- Finance redesign dung chien luoc.
- Intelligence co vai tro decision support.

Nhung de khop full PRD, can them 4 khoi:

1. Customer relationship depth.
2. Finance financial profile/cashflow/settlement breadth.
3. Multi-sided partner/agency/bank surfaces.
4. Production-grade detail/policy/localization completeness.

Ket luan ngan:

`Dung huong, dung skeleton, dung Phase 1. Chua du full Prime OS V1 ecosystem.`

## 12. Appendix - Screenshot Type Inventory

| Type | Count | Main routes |
| --- | ---: | --- |
| Page | 3 | `/overview`, `/account`, `/__ui-regression` |
| Demand | 6 | `/demand/hub`, `/demand/sources`, `/demand/campaigns`, `/demand/content-social`, `/demand/leads-rfqs`, `/demand/re-engage` |
| Finance | 6 | `/finance/fin-support` sections |
| Customer | 6 | `/customer/crm-compact`, `/customer/service` |
| Ecom | 13 | `/ecom/commerce-surface`, `/ecom/cos/*` |
| Intelligence | 11 | `/intelligence/decision-hub`, `/intelligence/signals`, `/intelligence/launch-decisions` |
| Ecom detail | 5 | product/order/fulfillment/return detail |
| Popup | 16 | command palette, Prime AI, finance wizard, customer dialogs, creator shortlist |

Full list is available in [manifest.json](</Users/admin/Desktop/Prime OS/PrimeOS_main/research/screenshots/20260508-073532-primeos-pages-popups-vi/manifest.json>).
