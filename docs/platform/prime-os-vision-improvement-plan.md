---
title: "Prime OS Vision Improvement Plan"
description: "Plan cải thiện bản Prime OS main hiện tại để khớp hơn với vision operating system trong General-ideal-v1.0."
status: pending
priority: P1
effort: 6-8 implementation phases
branch: main
tags: [prime-os, vision, intelligence, demand, operating-loop]
created: 2026-04-25
---

# Prime OS Vision Improvement Plan

## 0. Mục Tiêu Của Plan

Mục tiêu không phải đập bỏ bản hiện tại. Bản `main` đang đúng hướng: đã có Prime OS shell, đã có loop giữa Intelligence, Demand, Customer, Ecom/COS, đã có auth/backend control plane local, đã có các màn như `Launch Decisions`, `Campaign Ops`, `Lead & Response Capture`, `Retargeting & Outreach`.

Vấn đề chính: bản hiện tại vẫn còn cảm giác là một prototype nén nhiều ý tưởng vào vài màn. Theo vision trong `General-ideal-v1.0.docx`, Prime OS phải được cảm nhận như một operating system thống nhất cho commerce ecosystem, nơi dữ liệu, quyết định, action và handoff đi thành vòng khép kín.

Plan này dùng để nâng bản hiện tại từ:

```txt
Board-ready prototype có nhiều màn đúng hướng
```

thành:

```txt
Prime OS operating loop rõ ràng: Intelligence phát hiện -> Demand kích hoạt -> Customer giữ context -> Ecom/COS thực thi -> Intelligence học lại
```

## 1. Kết Luận Audit Nhanh

### 1.1 Điểm Đang Khớp Vision

- Prime OS không còn là dashboard đơn thuần. App đã có shell theo area và tower.
- Intelligence hiện đã làm tốt vai trò decision cockpit: creator fit, trend heat, SKU guardrail, launch approval.
- Demand đã có các action prototype thực tế: tạo message draft, queue ad set, tạo content brief, draft RFQ reply, assign owner, sync CRM, tạo retargeting sequence.
- COS/Ecom được dùng như guardrail cho launch và demand: SKU, ATS, order, fulfillment, stock task.
- CRM Compact và Service đã xuất hiện như điểm nhận context sau demand hoặc service event.
- Backend control plane đã có resource như `intelligenceCreators`, `intelligenceCustomers`, `launchDecisions`, `campaignOps`, `leadResponseCapture`, `retargetingOutreach`, `crmCompact`, `serviceDesk`.

### 1.2 Điểm Chưa Khớp Vision

- Intelligence trong nav đang bị nén thành `Creators`, `Trends`, `Launch Decisions`, trong khi vision có 6 tower: Analytics, Attribution, Forecasting & Optimization, AI Operator, Social Listening & VOC, Automation & Alerts.
- Demand chưa có `Acquisition Tower` rõ ràng. Hiện Acquisition bị redirect/gộp vào `Campaign Ops`.
- `Content & Social Tower` đang lệch thành `Content & Creator Ops`, phù hợp KOL/creator nhưng thiếu content library, social publishing, landing/CTA bridge.
- `Lead Capture` và `Retargeting` hiện là workspace action, chưa đủ canonical registry/detail model.
- Handoff giữa tower có link nhưng chưa đủ trạng thái vận hành: chưa thấy rõ ai nhận, object nào được tạo, state sau handoff là gì.
- Mock data vừa có backend control plane vừa có frontend-derived `getPrimeSnapshot()`. Cần canonical map rõ hơn để tránh cảm giác data được dựng rời.
- Overview chưa kể câu chuyện operating loop đủ mạnh. Nó có evidence, nhưng chưa làm BOD thấy toàn hệ thống đóng vòng như vision.

## 2. Product Direction Cần Giữ

### 2.1 Prime OS Là Gì

Prime OS là hệ điều hành cho commerce ecosystem, kết nối demand, customer, e-commerce operations và intelligence trong một hệ thống thống nhất.

Nó không nên được trình bày như:

- Một dashboard KPI.
- Một CRM.
- Một OMS.
- Một marketing automation tool.
- Một AI layer đứng ngoài dữ liệu vận hành.

### 2.2 Operating Thesis Cần Thể Hiện Trên UI

Mỗi màn phải trả lời:

- Screen này giúp user ra quyết định gì?
- Dữ liệu đầu vào đến từ area/tower nào?
- Action tiếp theo thuộc tower nào?
- Handoff tạo hoặc cập nhật object nào?
- Có guardrail nào từ COS, CRM, service hoặc finance không?
- Kết quả quay lại Intelligence như thế nào?

## 3. Target Operating Loop

Flow chuẩn cần được làm rõ trong sản phẩm:

```txt
1. Intelligence đọc tín hiệu thị trường, creator, customer trend, campaign, order, inventory, service
2. Intelligence tạo launch decision: Go / Review / Hold / No-go
3. Demand nhận launch route để triển khai campaign, content, acquisition, lead capture, retargeting
4. Customer nhận lead/customer context, follow-up, communication, service memory, retention
5. Ecom/COS thực thi product, inventory, order, fulfillment, policy, audit
6. Intelligence đọc lại outcome để tối ưu vòng tiếp theo
```

Target user flow board-ready:

```txt
Open Overview
-> thấy Prime Operating Loop
-> vào Intelligence / Launch Decisions
-> chọn một launch route
-> xem evidence + guardrail
-> send sang Demand / Campaign Ops
-> tạo campaign/action cụ thể
-> lead/RFQ vào Lead Capture
-> sync CRM
-> nếu chưa mua thì Retargeting
-> nếu mua thì COS/OMS/Fulfillment
-> outcome quay lại Intelligence
```

## 4. Cải Thiện IA Và Navigation

### 4.1 Giữ Shell Hiện Tại, Nhưng Làm Rõ Layer

Không cần rewrite shell. Cần chỉnh IA để người dùng thấy Prime OS là hệ thống có lớp:

- `Overview`: command center cho operating loop.
- `Intelligence`: phân tích, giải thích, forecast, quyết định, cảnh báo.
- `Demand`: kéo demand, chạy campaign, tạo content, bắt lead/RFQ, re-engage.
- `Customer`: CRM Compact + Service.
- `Ecom`: Commerce Surface + COS Ops.
- `Finance`: giữ nếu vẫn nằm trong phase full, nhưng không để finance lấn câu chuyện chính.

### 4.2 Intelligence IA Đề Xuất

User-facing nav có thể giữ gọn, nhưng workspace bên trong phải hiện đủ 6 capability:

- `Overview` hoặc `Decision Hub`
- `Analytics`
- `Attribution`
- `Forecasting`
- `AI Operator`
- `VOC`
- `Alerts`
- `Launch Decisions`

Không nhất thiết show toàn bộ như tower cấp 1 trong sidebar nếu sợ rối. Có thể dùng `Intelligence` nav group với 3 entry chính:

- `Decision Hub`
- `Signals`
- `Launch Decisions`

Và trong page có tabs/card cho 6 capability. Nhưng route vẫn nên giữ:

- `/intelligence/analytics`
- `/intelligence/attribution`
- `/intelligence/forecasting`
- `/intelligence/ai-operator`
- `/intelligence/voc`
- `/intelligence/alerts`
- `/intelligence/launch-decisions`

### 4.3 Demand IA Đề Xuất

Demand nên quay về đúng 5 tower vision:

- `Acquisition`
- `Campaigns`
- `Content & Social`
- `Lead Capture`
- `Retargeting`

Mapping với hiện tại:

- `Campaign Ops` -> thành `Campaigns`
- `Content & Creator Ops` -> mở rộng thành `Content & Social`, creator là một lane bên trong
- `Lead & Response Capture` -> thành `Lead Capture`
- `Retargeting & Outreach` -> thành `Retargeting`
- thêm `Acquisition` thật, không redirect vào Campaign nữa

## 5. Canonical Data Direction

### 5.1 Vấn Đề Hiện Tại

Hiện có hai lớp data:

- Backend control plane: `backend/src/seed.js`, `backend/data/admin-db.json`
- Frontend-derived snapshot: `app/src/lib/prime/prime-data.ts`

Cách này demo nhanh tốt, nhưng để khớp vision thì cần canonical relationship rõ hơn.

### 5.2 Entity Backbone Cần Chuẩn Hóa

Tạo hoặc document một entity map chung:

- `sourceId`
- `campaignId`
- `contentAssetId`
- `landingId`
- `ctaId`
- `leadId`
- `rfqId`
- `quoteId`
- `customerId`
- `accountId`
- `retargetingProgramId`
- `productId`
- `skuId`
- `orderId`
- `fulfillmentId`
- `serviceCaseId`
- `alertId`
- `launchDecisionId`

Rule: một object chính chỉ có một canonical truth. Các tower khác chỉ preview hoặc handoff, không định nghĩa lại truth.

### 5.3 Linked Object Contract

Mỗi handoff nên tạo được một object rõ:

```txt
Launch Decision -> Campaign Plan
Campaign -> Content Brief / Acquisition Source / Lead Flow
Lead Flow -> Lead / RFQ / CRM Customer
Retargeting Program -> Candidate / Journey / Suppression
Customer -> Order / Service / Retention Signal
Order/Fulfillment -> Outcome Signal
Outcome Signal -> Intelligence Learning
```

## 6. Screen-Level Improvements

### 6.1 Overview

Hiện trạng: đã có summary và evidence, nhưng chưa đủ mạnh về operating loop.

Cần thêm:

- Prime Operating Loop visual: `Intelligence -> Demand -> Customer -> Ecom/COS -> Intelligence`
- Active handoff rail: object nào đang đi từ tower này sang tower kia.
- Decision queue: 3 việc nên làm hôm nay.
- Guardrail summary: stock risk, service risk, CRM follow-up risk, campaign risk.
- Outcome preview: lead/RFQ/order/repeat/service impact quay lại Intelligence.

### 6.2 Intelligence / Launch Decisions

Hiện trạng: đây là màn mạnh nhất, giữ lại.

Cần cải thiện:

- Tách evidence thành 4 nhóm rõ: Market signal, Customer signal, Creator/content proof, COS guardrail.
- Show decision state rõ hơn: `Go`, `Review`, `Hold`, `No-go`.
- Mỗi launch decision phải có handoff payload:
  - product/SKU
  - target segment
  - creator/content proof
  - offer/message hypothesis
  - campaign channel
  - stock guardrail
  - owner
  - next action
- Add “Why not launch?” for blocked/hold candidates.

### 6.3 Intelligence / Analytics

Hiện trạng: route có, nhưng chưa phải analytics tower đầy đủ.

Cần cải thiện:

- Funnel health: traffic -> lead -> RFQ -> order -> repeat.
- Sales/order/inventory/customer summary.
- Segment/cohort read view.
- Ops performance: SLA, fulfillment, service, stock exceptions.
- Không biến thành chart page; analytics phải trả lời “điểm nghẽn nằm ở đâu?”.

### 6.4 Intelligence / Attribution

Cần làm rõ:

- Source/campaign/creator/content nào tạo lead/RFQ/order.
- First touch / last touch / assisted preview.
- Revenue attribution theo channel.
- Vanity metric warning: traffic nhiều nhưng không tạo RFQ/order.
- Handoff sang Launch Decisions khi source có business proof.

### 6.5 Intelligence / Forecasting

Cần làm rõ:

- Demand forecast theo SKU/campaign.
- ATS/stockout risk.
- Campaign throttle recommendation.
- Replenishment suggestion.
- What-if nhẹ: nếu tăng budget/traffic thì stock có chịu nổi không.

### 6.6 Intelligence / VOC

Cần làm rõ:

- Social/review/comment/service feedback ingestion preview.
- Topic/sentiment/pain point.
- VOC impact: ảnh hưởng product, campaign, service hay CRM.
- Action feed: gửi insight sang Campaign, Content, Service hoặc Product.

### 6.7 Intelligence / AI Operator

Cần làm rõ:

- AI không phải chatbot đứng riêng.
- AI đọc context đang mở.
- AI giải thích issue/decision.
- AI đề xuất next best action.
- AI chỉ draft action, cần confirmation khi action có rủi ro.

### 6.8 Intelligence / Alerts

Cần làm rõ:

- Alert condition.
- Severity.
- Owner.
- Source tower.
- Impact.
- Required action.
- Acknowledged/resolved state.
- Không làm notification center generic.

### 6.9 Demand / Acquisition

Hiện thiếu.

Cần build:

- Source registry: KOL, affiliate, social, ads, organic, marketplace, referral.
- Tracking: UTM/referrer/campaign tag.
- Source quality: traffic, lead rate, RFQ rate, order proof.
- Budget/spend guardrail.
- Handoff sang Campaign hoặc Attribution.

### 6.10 Demand / Campaigns

Hiện có `Campaign Ops`, nên cải thiện thay vì rewrite.

Cần bổ sung:

- Campaign registry.
- Campaign detail.
- Objective, market, segment, product set, offer, owner, budget, duration.
- Execution state: draft, ready, active, paused, completed.
- Result rollup: lead/RFQ/order/revenue.
- Link ngược Launch Decision.

### 6.11 Demand / Content & Social

Hiện nghiêng creator. Cần mở rộng:

- Asset library.
- Content calendar.
- Social post plan.
- Landing/CTA/product link.
- Creator brief là một lane, không phải toàn bộ tower.
- Engagement signal: view/save/click/comment/reply.
- Handoff sang Campaign, Lead Capture, Attribution.

### 6.12 Demand / Lead Capture

Hiện có action như draft RFQ/assign owner/sync CRM.

Cần canonical hơn:

- Lead flow registry.
- Lead/inquiry/RFQ/sample queue.
- Lead detail.
- Qualification.
- Routing.
- SLA.
- CRM handoff.
- RFQ/quote/order preview.

### 6.13 Demand / Retargeting

Hiện là Outreach/action. Cần quay về Retargeting Trigger Tower đúng vision:

- Program registry.
- Trigger rules: abandoned, no reply, reorder window, dormant, win-back.
- Audience re-entry candidates.
- Journey/cadence.
- Offer/message/CTA/destination binding.
- Suppression/cooldown/fatigue.
- Outcome read view.

## 7. UX Improvements

### 7.1 Principle

Prime OS cần decision-first, không chart-first.

Mỗi screen nên có layout chuẩn:

```txt
Header: screen purpose + decision question
Top strip: current state / KPI only if useful
Main workspace: object list or selected decision
Right/Bottom panel: evidence, risk, next action
Handoff rail: send to next tower, with payload preview
```

### 7.2 Handoff Rail

Cần thêm một component dùng chung:

```txt
From: Intelligence / Launch Decisions
Object: launch_001
Payload: SKU, segment, creator, offer, guardrail
To: Demand / Campaigns
State: Ready for campaign setup
Owner: Growth lead
Next SLA: today
```

Component này là chìa khóa để Prime OS không giống các màn rời.

### 7.3 Decision Language

Tránh label mơ hồ kiểu:

- “Signals”
- “Insights”
- “Performance”

Ưu tiên label kiểu:

- “Launch now”
- “Review before spend”
- “Throttle campaign”
- “Reply to RFQ”
- “Sync to CRM”
- “Suppress buyer”
- “Create stock task”

## 8. Implementation Phases

### Phase 0 — Documentation & Alignment

Goal: khóa vision cải thiện trước khi code.

Deliverables:

- File plan này.
- Screen map hiện tại vs target.
- Entity/handoff map.
- Route delta map.

Success:

- Anh nhìn vào docs và thấy rõ không phải rewrite mù.
- Mọi cải thiện đều nối với vision Prime OS.

### Phase 1 — Operating Loop Overview

Goal: biến Overview thành màn giải thích Prime OS rõ nhất.

Work:

- Add operating loop visual.
- Add active handoff rail.
- Add decision queue.
- Add cross-area guardrails.
- Add outcome learning preview.

Success:

- Mở `/overview` là hiểu Prime OS hoạt động như operating system.

### Phase 2 — Intelligence Capability Clarification

Goal: giữ `Creators`, `Trends`, `Launch Decisions` nhưng làm 6 capability Intelligence hiện rõ.

Work:

- Refresh nav/tabs.
- Improve Analytics, Attribution, Forecasting, VOC, AI Operator, Alerts pages.
- Add evidence grouping and decision states.
- Add launch decision handoff payload.

Success:

- Intelligence không còn giống trend/creator dashboard.
- User thấy rõ “điều gì nên làm tiếp và vì sao”.

### Phase 3 — Demand IA Rebuild Without Losing Existing Work

Goal: đưa Demand về 5 tower đúng vision.

Work:

- Add Acquisition.
- Rename/reshape Campaign Ops -> Campaigns.
- Expand Content & Creator Ops -> Content & Social.
- Strengthen Lead Capture.
- Strengthen Retargeting.

Success:

- Demand trả lời được: nguồn nào, campaign nào, content nào, lead/RFQ nào, re-entry nào.

### Phase 4 — Canonical Data & Handoff Model

Goal: giảm cảm giác data giả/rời.

Work:

- Create entity map.
- Add linked IDs across backend seed and frontend snapshot.
- Create shared handoff objects.
- Standardize status/state labels.

Success:

- Có thể trace một story từ `launchDecisionId` sang campaign, lead, CRM, order, outcome.

### Phase 5 — Retargeting & Lead Capture Deepening

Goal: làm hai phần này operational hơn.

Work:

- Lead registry + lead detail + RFQ preview.
- Retargeting program registry + trigger/candidate/journey/control/results.
- Suppression and SLA guardrails.

Success:

- Lead Capture không chỉ là action list.
- Retargeting không còn giống outreach generic.

### Phase 6 — QA, Demo Flow, Board Polish

Goal: hoàn thiện để demo BOD.

Work:

- Browser verification.
- Regression routes.
- Empty/broken state.
- Demo flow docs.
- Polish copy and layout.

Required demo flows:

1. Intelligence discovers opportunity -> Launch Decision -> Campaign.
2. Campaign produces lead/RFQ -> Lead Capture -> CRM.
3. Dormant/reorder signal -> Retargeting -> CRM/order loop.
4. VOC/service issue -> Intelligence alert -> Demand/Service action.
5. Stock risk -> Forecasting -> Campaign throttle/COS task.

Success:

- Demo không cần giải thích nhiều. UI tự kể được operating loop.

## 9. Route Delta Đề Xuất

Giữ route hiện tại để tránh break:

- `/intelligence/creators`
- `/intelligence/trends`
- `/intelligence/launch-decisions`
- `/demand/campaign-ops`
- `/demand/content-creator-ops`
- `/demand/lead-response-capture`
- `/demand/retargeting-outreach`

Thêm hoặc chuẩn hóa route mới:

- `/demand/acquisition`
- `/demand/campaigns`
- `/demand/content-social`
- `/demand/lead-capture`
- `/demand/retargeting`

Redirect compatibility:

- `/demand/campaign-ops` -> `/demand/campaigns` hoặc giữ alias.
- `/demand/content-creator-ops` -> `/demand/content-social` hoặc giữ alias.
- `/demand/lead-response-capture` -> `/demand/lead-capture` hoặc giữ alias.
- `/demand/retargeting-outreach` -> `/demand/retargeting` hoặc giữ alias.

## 10. Acceptance Criteria

Plan được xem là triển khai tốt khi:

- Overview thể hiện rõ Prime OS operating loop.
- Intelligence có đủ 6 capability theo vision, dù UI có thể gom gọn.
- Demand có đủ 5 tower theo vision.
- Acquisition không còn bị redirect/gộp vào Campaign.
- Content & Social không chỉ là creator/KOL.
- Lead Capture có queue/detail/routing/handoff rõ.
- Retargeting có program/trigger/audience/journey/control/result rõ.
- Handoff giữa tower có payload và state.
- Mock data có canonical ID map.
- Demo flow end-to-end trace được từ Intelligence tới Demand tới Customer/Ecom rồi quay lại Intelligence.
- UI không biến thành chart dashboard.
- UI không biến thành marketing automation suite.
- UI không biến thành CRM/OMS clone.

## 11. Rủi Ro

- Scope phình nếu cố build đủ mọi tower quá sâu trong một lần.
- Intelligence dễ bị hiểu thành AI dashboard nếu không gắn action/handoff.
- Demand dễ bị hiểu thành marketing automation nếu retargeting/campaign không gắn CRM/COS guardrail.
- Data dễ bị “giả” nếu frontend-derived snapshot không được reconcile với backend seed.
- Nav có thể rối nếu show toàn bộ floor/tower cùng lúc.

## 12. Nguyên Tắc Thực Thi

- Audit trước, build sau.
- Không rebuild thứ đã có nếu có thể reshape.
- Ưu tiên operating loop hơn page count.
- Ưu tiên canonical object hơn KPI.
- Mỗi screen phải có decision, evidence, risk, next action, handoff.
- Browser QA bắt buộc sau mỗi phase UI.
- Route quan trọng phải có regression.
- Không làm backend production thật trong phase này.

## 13. Câu Hỏi Còn Mở

- Anh muốn bản full giữ `Finance Area` như một area chính trong story demo, hay để Finance là optional/support layer?
- Anh muốn sidebar show đủ tower theo vision, hay giữ sidebar gọn và show capability bên trong từng workspace?
- Anh muốn ưu tiên cải thiện bản full này trước, hay sau khi plan này xong quay lại SME edition để reuse design/system logic?
