# Prime OS Demand Area Restructure Plan

Ngay lap: 2026-04-30  
Nhanh: `main`  
Pham vi de xuat: `PrimeOS_main/prime-os-phase-1/app`  
Tai lieu dau vao: `/Users/admin/Desktop/Prime OS V1.0 (1).pdf`, `prime-os-vision-improvement-plan.md`, app code hien tai

## 0. Muc Tieu

Tai cau truc `Demand Area` theo dung vision Prime OS V1.0:

```txt
Demand Area creates the right growth input: sources, campaigns, content, leads/RFQs, and safe re-engagement.
```

Khong build Demand nhu:

- marketing automation suite
- ad dashboard
- campaign calendar don le
- content/KOL ops rieng le
- CRM sequence tool
- chart page dem traffic/leads

Phai build thanh:

```txt
Growth-input operating area
```

Noi operator tra loi duoc:

1. Nen tao demand tu nguon nao?
2. Nen chay campaign nao, voi objective va guardrail nao?
3. Content/social/creator proof nao dang can de convert?
4. Lead/RFQ nao can xu ly ngay?
5. Ai nen duoc re-engage va ai phai suppress?
6. Demand action co tao ra lead/RFQ/order that va quay lai Intelligence khong?

## 1. Skill Research Summary

### 1.1 Skills dung cho plan nay

| Skill | Vai tro |
|---|---|
| `ck:plan` | Tao plan, chia phase, khong implement truoc khi lock huong |
| `ckm:marketing-research` | Xac dinh Demand theo market/source/customer intent, khong theo dashboard vanity metric |
| `ckm:marketing-planning` | Chuyen insight thanh campaign/source/content/lead/re-engage plan co objective |
| `ckm:analytics` | Dinh nghia KPI, funnel, attribution-lite, outcome readback |
| `ckm:campaign` | Sau nay dung cho campaign object, budget, channel, status, launch checklist |
| `ckm:content-marketing` | Sau nay dung cho content/social calendar va asset/content bridge |
| `ckm:social` | Sau nay dung cho social stream, creator proof, publishing preview |
| `ckm:form-cro` | Sau nay dung cho lead/RFQ capture, form quality, conversion friction |
| `ckm:funnel` | Sau nay dung cho source -> campaign -> lead/RFQ -> CRM/COS funnel |
| `ui-ux-pro-max` | Thiet ke Demand thanh workspace van hanh, khong phai card farm |
| `qa` / `_qa-full-reference` | Browser QA, route integrity, visual regression |

### 1.2 Nguyen tac rut ra tu skill

- Marketing planning phai co research/market context truoc.
- KPI phai gan voi decision va action, khong chi dem so.
- Campaign phai co objective, audience, offer, channel, owner, guardrail, outcome.
- Lead/RFQ capture phai giam friction va co next owner/action ro.
- Retargeting phai co suppression/cooldown de tranh spam.

## 2. Vision Input Tu Prime OS V1.0

PDF dinh nghia Demand Area la market-facing growth layer:

- tao dung demand
- hut dung traffic
- bien market interest thanh lead, inquiry, RFQ, sample request
- re-activate nguoi da co intent nhung chua convert
- la growth input dau vao cho Prime OS ecosystem

Demand khong dung rieng. No nam trong closed loop:

```txt
Intelligence provides direction
-> Demand creates demand
-> Customer preserves context
-> Ecom executes transactions
-> Finance protects/expands capability
-> feedback flows back into Intelligence
```

Nghia la moi Demand screen phai co:

- source/trigger
- objective
- target audience
- offer/message/CTA
- guardrail tu COS/CRM/Service/Finance
- next action/owner
- outcome readback ve lead/RFQ/order/customer

## 3. Current State Audit

### 3.1 Hien tai dang co trong app

Routes Demand hien tai:

| Current route | Current meaning |
|---|---|
| `/demand/campaign-ops` | Live campaign/action setup |
| `/demand/content-creator-ops` | Creator/content actions |
| `/demand/lead-response-capture` | Lead/RFQ response actions |
| `/demand/retargeting-outreach` | Retargeting/outreach actions |

Compatibility route hien tai dang redirect:

| Route | Current behavior |
|---|---|
| `/demand/acquisition` | redirect vao Campaign Ops |
| `/demand/campaign` | redirect vao Campaign Ops |
| `/demand/content-social` | redirect vao Content & Creator Ops |
| `/demand/lead-capture` | redirect vao Lead & Response Capture |
| `/demand/retargeting` | redirect vao Retargeting & Outreach |

Data/frontend hien co:

- `campaigns`
- `leads`
- `rfqs`
- `socialStreams`
- `activationPlays`
- `forecasts`
- `products`
- `customers`
- `orders`
- handoff/action popup trong `DemandExecutionPanel`

### 3.2 Diem manh

- Demand da co action thuc te: create draft, queue ad set, create brief, assign owner, sync CRM, enable suppression.
- Co lien ket voi Intelligence route, product/SKU, forecast guardrail, lead/RFQ, CRM/COS.
- Lead/RFQ va retargeting da co action co nghia, khong chi la dashboard.
- UI da co concept “local setup, nothing sent externally”, dung voi prototype.

### 3.3 Van de

- `Acquisition Tower` bi mat nghia vi redirect vao `Campaign Ops`.
- `Content & Creator Ops` qua nghieng creator/KOL, chua bao du `Content & Social`.
- `Campaign Ops` dang gom qua nhieu viec: acquisition, campaign, message, ad, SEO, stock task.
- `Lead & Response Capture` la action panel, chua co canonical lead/RFQ queue/detail model ro.
- `Retargeting & Outreach` co action tot nhung can program/trigger/audience/control/result model ro hon.
- Sidebar labels dang la ten noi bo, chua than thien voi operator/SME.
- Demand chua co landing/hub giai thich “growth input loop” nhu Intelligence Decision Hub.
- Data la snapshot/action-derived, chua co canonical Demand object map.

## 4. Product Thesis Moi Cho Demand

### 4.1 One-liner

```txt
Demand is the Prime OS growth-input room: it turns Intelligence direction into sourced demand, campaigns, content, leads/RFQs, and controlled re-engagement.
```

### 4.2 User-facing promise

User khong vao Demand de “lam marketing automation”. User vao Demand de:

1. Mo nguon demand dang co co hoi.
2. Chon campaign hoac content move can chay.
3. Bien response thanh lead/RFQ co owner.
4. Re-engage buyer co intent nhung khong spam.
5. Doc ket qua ve lead/RFQ/order va day lai Intelligence.

### 4.3 Boundary

Demand so huu:

- demand source registry va source quality preview
- campaign plan/execution readiness
- content/social/creator proof planning
- landing/CTA/form/RFQ capture preview
- lead/RFQ intake/routing/handoff
- re-engage program/trigger/audience/control preview
- Demand outcome readback

Demand khong so huu:

- customer master truth: Customer/CRM
- order/quote/inventory truth: COS/Ecom
- final attribution truth: Intelligence/Attribution
- finance exposure truth: Finance
- actual ad/email/SMS send engine
- service ticket truth: Service

## 5. IA De Xuat: 5 Workspace Gon, Giu Dung Vision

Khac voi Intelligence, Demand theo PDF nen giu du 5 capability product. Tuy nhien user-facing label phai gon va de hieu hon ten noi bo hien tai.

### 5.1 Sidebar Demand moi

```txt
Demand
  Demand Hub
  Sources
  Campaigns
  Content & Social
  Leads & RFQs
  Re-engage
```

Neu can rut gon hon cho sidebar sau nay, co the an `Sources` vao Demand Hub, nhung Phase 1 nen giu `Sources` rieng vi Acquisition dang bi thieu ro nhat.

### 5.2 Route mapping moi

| User-facing route | Purpose | Capability |
|---|---|---|
| `/demand` hoac `/demand/hub` | Demand command page: today opportunities, blockers, next moves | Cross-Demand operating hub |
| `/demand/sources` | Source quality, traffic intent, acquisition origin, campaign/source proof | Acquisition |
| `/demand/campaigns` | Campaign registry, launch readiness, objective, budget/channel, guardrails | Campaign |
| `/demand/content-social` | Content/social/creator proof, asset/CTA/landing bridge | Content & Social |
| `/demand/leads-rfqs` | Lead/inquiry/RFQ queue, qualification, owner, SLA, handoff | Lead Capture |
| `/demand/re-engage` | Retargeting/re-entry programs, suppression, cooldown, results | Retargeting |

### 5.3 Backward compatibility

| Old/current route | New behavior |
|---|---|
| `/demand/campaign-ops` | alias/redirect to `/demand/campaigns` |
| `/demand/content-creator-ops` | alias/redirect to `/demand/content-social?view=creator-proof` |
| `/demand/lead-response-capture` | alias/redirect to `/demand/leads-rfqs` |
| `/demand/retargeting-outreach` | alias/redirect to `/demand/re-engage` |
| `/demand/acquisition` | redirect to `/demand/sources` |
| `/demand/campaign` | redirect to `/demand/campaigns` |
| `/demand/lead-capture` | redirect to `/demand/leads-rfqs` |
| `/demand/retargeting` | redirect to `/demand/re-engage` |

## 6. Canonical Objects De Xuat

Demand can co object layer rieng de tranh dashboard data roi rac:

| Object | Meaning | Links out |
|---|---|---|
| `DemandSignal` | Tin hieu tu Intelligence/source/customer/COS tao nhu cau hanh dong | Intelligence, COS, CRM |
| `DemandSource` | Acquisition/source origin va quality | Campaign, Lead/RFQ, Intelligence |
| `CampaignPlan` | Campaign canonical truth: objective, audience, offer, channel, owner, status | Source, Content, Lead/RFQ, COS |
| `ContentProofAsset` | Content/social/creator proof asset, CTA, landing binding | Campaign, Source, Lead Capture |
| `LandingCtaBinding` | CTA/form/RFQ destination va capture promise | Campaign, Lead/RFQ |
| `LeadRfqCandidate` | Lead/inquiry/RFQ intake object co score, owner, SLA | CRM, COS/RFQ |
| `ReengageProgram` | Retargeting canonical truth: trigger, audience, journey, control, result | CRM, Campaign, COS |
| `DemandHandoff` | Action payload gui sang CRM/COS/Service/Finance | Target tower |
| `DemandOutcomeReadback` | Outcome cua campaign/source/re-engage: lead, RFQ, order, repeat, suppress | Intelligence |

## 7. Screen Spec

### 7.1 Demand Hub

Muc dich: noi operator thay Demand hom nay nen lam gi.

Bat buoc co:

- top demand opportunities tu Intelligence
- KPI strip: active campaigns, source quality, leads/RFQs waiting, re-engage eligible, blocked by guardrail
- next best moves: launch campaign, fix content, respond RFQ, suppress risky re-engage
- blockers: low stock, missing CTA, owner missing, service-sensitive buyer
- outcome readback: leads, RFQs, orders, repeat, suppressed

Decision screen nay giup user tra loi:

```txt
Hom nay Demand nen mo nguon nao, chay gi, va xu ly response nao truoc?
```

### 7.2 Sources

Muc dich: lam ro Acquisition ma khong bien thanh traffic analytics.

Bat buoc co:

- source registry: channel/source/campaign origin/market
- source quality: traffic, intent, lead rate, RFQ rate, cost preview
- source-to-campaign mapping
- source-to-customer/RFQ preview
- weak source warnings
- recommended next action: scale, test, fix landing, pause, handoff to content

Khong lam:

- raw web analytics suite
- full attribution model

### 7.3 Campaigns

Muc dich: campaign la planned demand push co objective va guardrail.

Bat buoc co:

- campaign registry
- objective: RFQ generation, sample request, reorder push, launch support, creator proof activation
- audience, offer, message, CTA
- channel plan: paid/social/content/marketplace/owned
- readiness checklist
- COS/stock guardrail
- owner/timeline/status
- handoff to Leads & RFQs / Content & Social / Re-engage

Khong lam:

- ad manager clone
- budget optimizer that pretends production control

### 7.4 Content & Social

Muc dich: content/social/creator proof la demand asset, khong phai creator ops app rieng.

Bat buoc co:

- content calendar preview
- content asset library preview
- creator proof lane
- social stream / VOC hook
- CTA/landing/form binding
- campaign reuse mapping
- asset readiness: missing copy, missing image, missing destination, no approved CTA

Khong lam:

- social publishing platform production
- KOL CRM full suite

### 7.5 Leads & RFQs

Muc dich: bien response thanh commercial intent co owner.

Bat buoc co:

- lead/inquiry/RFQ queue
- status: new, qualified, waiting info, RFQ drafted, handed to CRM, converted
- score/reason
- source/campaign/content origin
- owner/SLA
- reply/follow-up preview
- CRM handoff payload
- COS/RFQ/order preview

Khong lam:

- CRM master truth
- quote/order editor

### 7.6 Re-engage

Muc dich: dua buyer co intent quay lai demand loop co guardrail.

Bat buoc co:

- program registry: abandoned RFQ, quote follow-up, sample follow-up, reorder reminder, dormant win-back
- trigger rules
- eligible/suppressed/enrolled audience
- journey preview
- offer/message/CTA/destination binding
- suppression/cooldown/fatigue controls
- result readback: re-engaged, recovered RFQ, repeat order, suppressed by control

Khong lam:

- marketing automation clone
- send engine
- CRM sequence tool

## 8. Data/KPI Logic

### 8.1 KPI can hien thi

| KPI | Source | Dung de quyet dinh |
|---|---|---|
| Source quality score | `DemandSource` + outcome readback | scale/fix/pause source |
| Campaign readiness | `CampaignPlan` + content/COS guardrails | launch/hold/review |
| Lead/RFQ SLA risk | `LeadRfqCandidate` | assign owner/respond now |
| Content readiness | `ContentProofAsset` + `LandingCtaBinding` | approve/fix/reuse |
| Re-engage safety | `ReengageProgram` + suppression | activate/hold |
| Outcome contribution | `DemandOutcomeReadback` | feed Intelligence learning |

### 8.2 Formula mock don gian

```txt
sourceQuality =
  intentRate * 0.35
  + leadRate * 0.25
  + rfqRate * 0.25
  - costRisk * 0.15

campaignReadiness =
  objectiveReady
  + audienceReady
  + offerReady
  + contentReady
  + ctaReady
  + cosGuardrailReady

leadPriority =
  leadScore
  + rfqIntentWeight
  + repeatBuyerWeight
  - staleResponsePenalty

reengageSafety =
  suppressionConfigured
  + cooldownConfigured
  + fatigueLow
  + noOpenServiceIssue
```

## 9. Cross-Area Handoff

Demand phai doc va ghi dung boundary:

| From/To | Handoff |
|---|---|
| Intelligence -> Demand | launch route, signal, evidence, forecast guardrail |
| Demand -> CRM | customer context, lead/RFQ origin, follow-up owner/SLA |
| Demand -> COS/Ecom | SKU/order/RFQ/stock guardrail preview, no order truth mutation |
| Demand -> Service | service-sensitive suppression preview |
| Demand -> Finance | margin/budget/risk preview, no finance ledger truth |
| Demand -> Intelligence | outcome readback: source/campaign/lead/re-engage results |

## 10. Build Phases

### Phase 0 - Audit va Data Contract

- Audit Demand routes/data/components hien co.
- Lap migration map tu 4 tower cu sang 5 workspace moi.
- Tao canonical data contract cho `DemandSignal`, `DemandSource`, `CampaignPlan`, `ContentProofAsset`, `LeadRfqCandidate`, `ReengageProgram`, `DemandOutcomeReadback`.
- Output: update docs + no code UI lon.

### Phase 1 - Route Shell va Navigation

- Them `/demand` hoac `/demand/hub`.
- Them route moi: `/demand/sources`, `/demand/campaigns`, `/demand/content-social`, `/demand/leads-rfqs`, `/demand/re-engage`.
- Giu alias/redirect routes cu.
- Sidebar doi label than thien hon.
- Regression: all old and new Demand routes load.

### Phase 2 - Demand Hub

- Build Demand Hub theo operating loop.
- Hien top opportunity, blocker, next move, outcome readback.
- Link sang Intelligence, Campaigns, Leads & RFQs, Re-engage.
- Browser QA desktop/mobile.

### Phase 3 - Sources

- Tach Acquisition ra khoi Campaign Ops.
- Build source registry + source quality + source-to-campaign/lead mapping.
- Them action: scale/test/fix/pause.
- Khong build raw analytics.

### Phase 4 - Campaigns

- Doi `Campaign Ops` thanh `Campaigns`.
- Build campaign registry/detail/readiness/action setup.
- Giu lai action popup hien co nhung gan vao canonical campaign object.
- Add COS guardrail va content readiness ro hon.

### Phase 5 - Content & Social

- Doi `Content & Creator Ops` thanh `Content & Social`.
- Giu creator proof nhu mot lane, khong lam app creator rieng.
- Them content/social/asset/CTA/landing binding.
- Link content asset vao Campaign va Lead/RFQ capture.

### Phase 6 - Leads & RFQs

- Doi `Lead & Response Capture` thanh `Leads & RFQs`.
- Build queue/detail/routing/SLA/CRM handoff.
- RFQ preview link sang COS/Ecom, customer preview link sang CRM.
- Regression: queue -> detail -> handoff.

### Phase 7 - Re-engage

- Doi `Retargeting & Outreach` thanh `Re-engage`.
- Build program/trigger/audience/journey/offer/control/result view.
- Suppression/cooldown/fatigue phai hien ro.
- Regression: program detail, control route, result route.

### Phase 8 - Outcome Readback va QA

- Ket noi outcome readback ve Overview/Intelligence.
- Browser QA full Demand routes.
- Visual QA dark/light mode.
- Check no overflow, no blank, no broken legacy route.

## 11. Demo Flows

### Flow 1 - Intelligence to Campaign to RFQ

1. Mo `/intelligence/launch-decisions`.
2. Chon launch route co evidence va guardrail.
3. Handoff sang `/demand/campaigns`.
4. Xem campaign readiness, content/CTA, COS guardrail.
5. Sang `/demand/leads-rfqs` thay RFQ/lead duoc tao va co owner.
6. Handoff sang CRM/COS preview.

### Flow 2 - Source Quality to Content Fix

1. Mo `/demand/sources`.
2. Thay source co traffic nhung RFQ rate thap.
3. Drill vao source.
4. Handoff sang `/demand/content-social`.
5. Fix missing CTA/landing/content proof.
6. Readback source quality improved preview.

### Flow 3 - Re-engage Without Spam

1. Mo `/demand/re-engage`.
2. Chon reorder/dormant program.
3. Xem eligible audience.
4. Xem suppression/cooldown/fatigue.
5. Activate local preview.
6. Outcome readback: recovered RFQ/repeat order/suppressed by control.

### Flow 4 - Lead/RFQ to Customer Memory

1. Mo `/demand/leads-rfqs`.
2. Chon RFQ high intent.
3. Xem source/campaign/content origin.
4. Draft reply + assign owner.
5. Sync CRM handoff.
6. Customer detail doc lai Demand origin.

## 12. Acceptance Criteria

Plan/build duoc xem la dung khi:

- Demand co `Demand Hub` thay vi chi 4 action page roi rac.
- Acquisition khong con bi redirect/gop vao Campaign.
- Campaigns la campaign plan/execution workspace co objective/readiness/guardrail.
- Content & Social khong con chi la creator/KOL.
- Leads & RFQs co queue/detail/owner/SLA/handoff.
- Re-engage co program/trigger/audience/journey/offer/control/result.
- Moi screen co decision, evidence, guardrail, next action, handoff.
- Mock data linked: source -> campaign -> content/CTA -> lead/RFQ -> CRM/COS -> outcome.
- Routes cu khong bi vo.
- UI khong thanh marketing automation clone.
- UI khong lan sang CRM/COS/Finance truth.
- Browser QA pass tren desktop/mobile, light/dark.

## 13. Rui Ro Va Cach Kiem Soat

| Risk | Kiem soat |
|---|---|
| Scope phinh thanh marketing suite | Moi workspace chi lam operating preview/action setup |
| Acquisition bi bien thanh analytics | Chi show source quality + next action, khong raw traffic BI |
| Retargeting thanh spam tool | Suppression/cooldown/fatigue bat buoc hien tren UI |
| Lead/RFQ lan sang CRM/COS | Demand chi capture/routing/handoff, khong own customer/order truth |
| Route migration lam vo demo cu | Giu alias/redirect va regression route test |
| UI lai bi card farm | Moi screen co primary decision va action lane, chart chi la secondary |

## 14. Nguyen Tac Thuc Thi Sau Plan

- Build theo phase, khong rewrite Demand mot lan.
- Reuse `DemandExecutionPanel` action logic hien co, nhung boc vao IA/canonical object moi.
- Doi label truoc, sau do tach data contract.
- Browser verification sau moi phase co route/UI.
- Route quan trong phai co regression.
- Khong tao backend production send/ad engine.
- Khong mutate order/customer truth trong Demand.

