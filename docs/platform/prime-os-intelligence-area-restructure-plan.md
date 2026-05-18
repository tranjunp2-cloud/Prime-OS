# Prime OS Intelligence Area Restructure Plan

Ngay lap: 2026-04-30  
Nhanh: `main`  
Pham vi: `PrimeOS_main/prime-os-phase-1/app`  
Tai lieu dau vao: `/Users/admin/Desktop/Prime OS V1.0 (1).pdf`, docs hien co trong `docs/`, `prime-os-phase-1/docs/`, `research/`

## 0. Muc Tieu

Tai cau truc `Intelligence Area` thanh mot module tinh gon, dung vision Prime OS V1.0:

```txt
Intelligence understands what is happening -> explains why -> predicts what may happen next -> helps the operator act smarter across Demand, Customer, Ecom/COS, and Finance.
```

Khong build Intelligence nhu:

- dashboard KPI tong hop
- BI/chart page
- AI chatbot dung rieng
- social listening tool rieng
- attribution report rieng
- notification center generic
- 6 technical tools nam canh nhau nhung khong tao decision

Phai build thanh:

```txt
Decision-support operating area
```

Noi user nhin thay:

1. Tin hieu nao dang quan trong?
2. Tai sao no quan trong?
3. Nen launch / hold / fix / follow-up cai gi?
4. Guardrail tu COS/CRM/Service/Finance co chan action khong?
5. Action nen duoc handoff sang tower nao?
6. Outcome co quay lai Intelligence de hoc tiep khong?

## 1. Skill Research Summary

### 1.1 Skills dang co san nen dung

| Skill | Vai tro trong plan Intelligence |
|---|---|
| `ck:plan` | Tao plan, chia phase, khong implement truoc khi co huong |
| `ck:find-skills` | Tim skill ecosystem phu hop AI/product analytics/operator workflow |
| `ckm:marketing-research` | Nghien cuu market signal, persona, campaign/source context |
| `ckm:analytics` | Dinh nghia KPI, funnel, attribution, outcome readback |
| `ckm:marketing-planning` | Chuyen insight thanh campaign/action plan |
| `ckm:competitor` | Sau nay dung cho market/competitor signal lane |
| `ui-ux-pro-max` | Thiet ke Intelligence nhu operating workspace, khong phai dashboard card farm |
| `ck:scenario` | Sinh edge case: missing signal, conflicting evidence, blocked launch, stale data |
| `qa` / `_qa-full-reference` | Browser QA, route integrity, visual/a11y regression |

### 1.2 Skills tim thay qua `npx skills find`

| Skill tim thay | Gia tri | Co nen cai ngay? |
|---|---|---|
| `refoundai/lenny-skills@ai-product-strategy` | Product strategy cho AI/product decision layer | Chua can cai, nhung nen tham khao neu tiep tuc refine AI Operator |
| `absolutelyskilled/absolutelyskilled@product-analytics` | Product analytics, metric thinking | Chua can cai, vi local `ckm:analytics` du dung cho plan |
| `ruvnet/ruflo@agent-workflow` | Agent workflow pattern | Chua can cai, vi repo `langgraph` da co research local |
| `kostja94/marketing-skills@ai-traffic-tracking` | Tracking AI/traffic/source signal | Can nhac khi build Acquisition/Attribution sau |
| `skills.volces.com@competitor-intelligence-monitor` | Competitor intelligence monitor | Can nhac cho future market signal lane |
| `marketing-strategy-pmm` variants | PMM / GTM framing | Khong can cai ngay |

Ket luan: khong can cai skill moi de lap plan nay. Bo skill local hien co + research docs `langgraph`, `copilotkit`, `antigravity-awesome-skills` da du.

## 2. Vision Input Tu Prime OS V1.0

PDF xac dinh Prime OS la operating system cho commerce ecosystem, ket noi Demand, Customer, Ecom operations, Finance va Intelligence trong mot loop thong nhat.

### 2.1 Definition Can Giu

`Intelligence Area` la decision-support layer giup business:

- understand what is happening
- explain why it is happening
- predict what may happen next
- act more intelligently across Demand, Customer, Commerce, Finance

### 2.2 Diem Quan Trong Nhat

PDF noi ro:

```txt
Intelligence Area should not be framed as six separate technical tools.
```

Nghia la UI khong nen show Intelligence nhu mot menu dai:

```txt
Analytics / Attribution / Forecasting / AI Operator / VOC / Alerts
```

roi moi page la mot dashboard nho. Cach dung hon:

```txt
Show one Intelligence operating experience,
with compact workspaces that combine the six capabilities behind user decisions.
```

### 2.3 Closed Loop Can The Hien

Prime OS loop:

```txt
Intelligence provides direction
-> Demand creates demand
-> Customer preserves context
-> Ecom executes transactions
-> Finance expands financial capability
-> feedback flows back into Intelligence
```

Vay Intelligence khong ket thuc o "report". Moi Intelligence screen phai co:

- linked signal
- explanation
- predicted impact
- guardrail
- recommended action
- handoff target
- outcome readback

## 3. Current State Audit

### 3.1 Hien Tai Dang Co

Current app da co route/capability:

- `/intelligence/creators`
- `/intelligence/trends`
- `/intelligence/launch-decisions`
- hidden/redirected capability route trong code:
  - `/intelligence/analytics`
  - `/intelligence/attribution`
  - `/intelligence/forecasting`
  - `/intelligence/ai-operator`
  - `/intelligence/voc`
  - `/intelligence/alerts`

Backend control plane hien co:

- `intelligenceCreators`
- `intelligenceCustomers`
- `launchDecisions`

Frontend snapshot hien co:

- `getPrimeSnapshot()`
- social streams
- VOC insights
- insight models
- activation plays
- forecasts
- recommendations
- alerts
- linked COS/customer/demand context

### 3.2 Diem Manh

- `Launch Decisions` la man hinh gan vision nhat: co decision, evidence, confidence, blocker, handoff.
- `Creators` va `Trends` co gia tri vi gan voi product/customer activation.
- Intelligence da doc duoc COS guardrail: SKU, ATS, order, forecast.
- AI Operator route da co concept: context reader, decision queue, recommendation, action log.
- Research docs da co boundary dung:
  - LangGraph cho stateful decision workflow, khong lam transaction truth.
  - CopilotKit cho in-app operator UI, khong lam event bus.
  - Skill registry cho playbook/operator recipe, khong lam workflow engine.

### 3.3 Van De

- Sidebar dang nho gon nhung sai nghia: `Creators`, `Trends`, `Launch Decisions` lam user tuong Intelligence chi la creator/trend tool.
- 6 capability goc bi an trong match paths, nen architecture khong ro.
- Analytics/Attribution/Forecasting/VOC/Alerts hien co nhung cam giac la panel bo sung, chua tao mot flow decision.
- AI Operator chua duoc dat lam "operating assistant" gan voi action/approval/audit.
- Data co 2 lop: backend control plane va frontend snapshot. Can relationship map ro hon.
- Chua co Intelligence object canonical du cho compact operating module.

## 4. Product Thesis Moi Cho Intelligence

### 4.1 One-Liner

```txt
Intelligence is the Prime OS decision room: it turns market, customer, demand, COS, service, and finance signals into clear launch, fix, follow-up, and guardrail decisions.
```

### 4.2 User-Facing Promise

User khong vao Intelligence de xem chart. User vao Intelligence de tra loi:

1. Hom nay nen tap trung vao co hoi nao?
2. Co hoi do den tu tin hieu nao?
3. Co bang chung du de hanh dong khong?
4. Neu hanh dong thi di sang Demand, Customer, Ecom hay Finance?
5. Co blocker nao can xu ly truoc khong?
6. Ket qua tu lan truoc dang day minh dieu gi?

### 4.3 Capability Behind The Scenes

Sau UI tinh gon van giu 6 capability:

- Analytics: operating health, funnel, bottleneck.
- Attribution: source/campaign/creator/content -> lead/RFQ/order proof.
- Forecasting: expected demand vs ATS/stock/fulfillment risk.
- AI Operator: explain, recommend, draft action, ask confirmation, audit.
- VOC: customer/social/service feedback -> product/campaign/service action.
- Alerts: cross-area risk/opportunity routed to owner.

Nhung khong bat user phai nghi bang 6 tool. User chi can nghi bang 3 workspace.

## 5. IA De Xuat: 3 Workspace Tinh Gon

### 5.1 Sidebar Intelligence Moi

User-facing nav nen la:

```txt
Intelligence
  Decision Hub
  Signals
  Launch Decisions
```

Optional neu can giu AI ro hon:

```txt
Intelligence
  Decision Hub
  Signals
  Launch Decisions
  Operator
```

Khuyen nghi Phase 1 dung 3 entry de gon.

### 5.2 Route Mapping

| User-facing route | Purpose | Capability gop lai |
|---|---|---|
| `/intelligence` hoac `/intelligence/decision-hub` | Trang dau cua Intelligence, noi user thay 3 viec can lam hom nay | Analytics, Forecasting, Alerts, AI Operator |
| `/intelligence/signals` | Signal workbench: market/customer/creator/VOC/source/funnel signals | Analytics, Attribution, VOC, Forecasting |
| `/intelligence/launch-decisions` | Go / Review / Hold / No-go decisions with evidence and handoff | Forecasting, Attribution, VOC, AI Operator, Alerts |

Routes cu van nen giu redirect/backward compatibility:

| Old route | Redirect / render |
|---|---|
| `/intelligence/creators` | `/intelligence/signals?view=creators` |
| `/intelligence/trends` | `/intelligence/signals?view=customer-trends` |
| `/intelligence/analytics` | `/intelligence/decision-hub?capability=analytics` |
| `/intelligence/attribution` | `/intelligence/signals?capability=attribution` |
| `/intelligence/forecasting` | `/intelligence/signals?capability=forecasting` |
| `/intelligence/voc` | `/intelligence/signals?capability=voc` |
| `/intelligence/alerts` | `/intelligence/decision-hub?view=alerts` |
| `/intelligence/ai-operator` | `/intelligence/decision-hub?view=operator` |

## 6. Screen Spec

### 6.1 Decision Hub

Decision Hub la Intelligence landing. No khong phai KPI dashboard.

Business question:

```txt
What should I pay attention to today, and where should I act?
```

Required sections:

1. Decision Queue
   - top 5 recommended decisions
   - type: launch, fix, follow-up, suppress, investigate
   - confidence
   - owner
   - due/urgency
   - next tower

2. Operating Health Strip
   - Demand health
   - Customer health
   - COS readiness
   - Finance readiness
   - Service risk

3. Cross-Area Alerts
   - stock risk
   - service issue affecting campaign
   - source with low-quality leads
   - dormant customer opportunity
   - finance/capital blocker

4. Outcome Learning
   - what happened after last campaign/launch
   - leads/RFQs/orders/repeat/service impact
   - what Intelligence changed because of the outcome

5. AI Operator Compact Panel
   - explain selected decision
   - draft handoff
   - list required approvals
   - show audit note preview

Do not:

- chart-first layout
- generic KPI dashboard
- long AI chat as main content

### 6.2 Signals

Signals la workbench de xem bang chung truoc khi ra decision.

Business question:

```txt
Which signals are real enough to become action?
```

Signal families:

- Market demand
- Customer trend
- Creator/content proof
- Source/attribution proof
- VOC/service feedback
- COS readiness/forecast
- Finance readiness

Required sections:

1. Signal Registry
   - signalId
   - signal family
   - source
   - linked entity
   - strength
   - freshness
   - confidence
   - recommended decision

2. Signal Detail
   - why it matters
   - linked product/SKU
   - linked campaign/source/content/creator
   - linked customer/account/RFQ/order
   - linked VOC/service/return
   - linked forecast/ATS

3. Evidence Stack
   - attribution proof
   - customer proof
   - COS proof
   - risk/blocker proof

4. Convert To Decision
   - create launch decision
   - send to Demand
   - send to Customer follow-up
   - send to Ecom/COS fix
   - suppress/no action

Do not:

- raw social listening dashboard
- creator database clone
- attribution report only

### 6.3 Launch Decisions

Launch Decisions la decision workspace chinh.

Business question:

```txt
Should we launch, review, hold, or no-go this opportunity?
```

Decision states:

- `Go`
- `Review`
- `Hold`
- `No-go`

Decision package fields:

- decisionId
- decisionName
- target product/SKU
- market
- segment/persona
- creator/content proof
- source/campaign proof
- offer/message hypothesis
- forecast/ATS guardrail
- finance/service risk
- confidence
- owner
- blocker
- handoff target
- expected outcome
- audit note

Required sections:

1. Decision Board
   - Go / Review / Hold / No-go lanes

2. Decision Detail
   - thesis
   - strongest evidence
   - weakest signal
   - blocker
   - next action

3. Guardrail Panel
   - stock
   - fulfillment
   - service
   - finance
   - CRM follow-up

4. Handoff Builder
   - Demand Campaign
   - Lead Capture
   - Retargeting
   - Customer follow-up
   - COS fix
   - Finance review

5. Outcome Preview
   - expected leads
   - expected RFQs
   - expected orders
   - risk-adjusted confidence
   - learning target

## 7. Canonical Data Model De Xuat

Khong can backend production that trong phase nay, nhung mock data can co canonical objects ro.

### 7.1 Intelligence Canonical Objects

```txt
IntelligenceSignal
DecisionPackage
DecisionEvidence
DecisionGuardrail
DecisionHandoff
DecisionOutcomeReadback
OperatorRecommendation
AlertCase
```

### 7.2 Object Fields Toi Thieu

#### IntelligenceSignal

- `id`
- `family`
- `source`
- `sourceEntityId`
- `linkedProductId`
- `linkedSkuId`
- `linkedCampaignId`
- `linkedCustomerId`
- `linkedOrderId`
- `linkedServiceCaseId`
- `strengthScore`
- `freshnessAt`
- `confidence`
- `recommendedDecisionId`

#### DecisionPackage

- `id`
- `name`
- `state`
- `decisionType`
- `targetMarket`
- `targetSegment`
- `productId`
- `skuId`
- `owner`
- `confidence`
- `thesis`
- `blocker`
- `nextAction`
- `handoffTarget`
- `expectedOutcome`

#### DecisionEvidence

- `id`
- `decisionId`
- `evidenceType`
- `linkedEntityType`
- `linkedEntityId`
- `summary`
- `score`
- `supportsDecision`

#### DecisionGuardrail

- `id`
- `decisionId`
- `guardrailType`
- `state`
- `message`
- `linkedEntityId`
- `requiredFix`

#### DecisionHandoff

- `id`
- `decisionId`
- `targetArea`
- `targetTower`
- `targetRoute`
- `payloadSummary`
- `status`
- `owner`
- `createdAt`

#### DecisionOutcomeReadback

- `id`
- `decisionId`
- `period`
- `leads`
- `rfqs`
- `orders`
- `repeatCustomers`
- `serviceIssues`
- `revenuePreview`
- `learningNote`

## 8. Cross-Area Boundaries

### Intelligence Owns

- signal interpretation
- decision package
- recommendation
- alert case
- evidence/guardrail read view
- outcome learning note

### Intelligence Does Not Own

- campaign execution truth
- customer master truth
- order/inventory/fulfillment truth
- finance eligibility truth
- real send engine
- real paid ad spend
- real ML model training pipeline

### Mutation Rule

AI Operator / Intelligence can only:

- explain
- recommend
- draft
- prepare handoff
- request confirmation
- write audit note / decision state in mock

Actual domain action belongs to target tower:

- Campaign -> Demand
- Follow-up -> Customer
- Stock/order/fulfillment fix -> Ecom/COS
- Finance review -> Finance

## 9. UX Direction

### 9.1 UI Tone

- compact
- operator-first
- less hero, more workbench
- row/list/table over large cards
- evidence grouped by decision
- one primary action per workspace section
- badges for states, not decoration

### 9.2 Page Hierarchy

Every Intelligence page should use:

```txt
Header: "What decision is this page helping?"
Decision/Signal queue
Selected detail panel
Evidence/guardrail strip
Handoff/action panel
Outcome readback
```

### 9.3 Copy Rules

Use business language, not technical tool names:

- Use `Signals` instead of `Analytics + VOC + Attribution`.
- Use `Decision Hub` instead of `AI Operator Dashboard`.
- Use `Launch Decisions` instead of `Campaign Intelligence`.
- Use `Guardrail` instead of `Model constraint`.
- Use `Handoff` instead of `integration`.

## 10. Implementation Phases

### Phase 0 - Audit & Alignment

Output:

- Update this plan if PDF vision changes.
- Create route inventory for Intelligence.
- Create entity map for current control plane and snapshot data.
- Decide final nav labels: 3 entries or 4 entries.

Acceptance:

- No UI implementation before current/target mapping is documented.

### Phase 1 - Data Contract

Tasks:

- Add mock-data or TS adapter for:
  - `IntelligenceSignal`
  - `DecisionPackage`
  - `DecisionEvidence`
  - `DecisionGuardrail`
  - `DecisionHandoff`
  - `DecisionOutcomeReadback`
- Reconcile with existing:
  - `intelligenceCreators`
  - `intelligenceCustomers`
  - `launchDecisions`
  - `getPrimeSnapshot()`
- Keep COS/order/customer/campaign IDs linked.

Acceptance:

- No detached Intelligence records.
- Every decision has at least one signal, one evidence item, one guardrail, one handoff target.

### Phase 2 - IA & Routes

Tasks:

- Add route:
  - `/intelligence`
  - `/intelligence/decision-hub`
  - `/intelligence/signals`
  - `/intelligence/launch-decisions`
- Keep old routes as redirects or parameterized views.
- Update sidebar labels.
- Update command palette/search labels.

Acceptance:

- User can understand Intelligence from nav in under 5 seconds.
- Old links do not break.

### Phase 3 - Decision Hub

Tasks:

- Build compact Intelligence landing.
- Show decision queue, operating health, alerts, outcome learning, AI operator compact panel.
- Link every row to decision/signal detail.

Acceptance:

- Page answers: "what should I do today?"
- No chart-only sections.

### Phase 4 - Signals Workbench

Tasks:

- Build signal registry and selected signal detail.
- Add filters:
  - family
  - market
  - strength
  - freshness
  - linked area
  - recommended decision
- Add evidence stack and convert-to-decision action preview.

Acceptance:

- Page answers: "which signal is real enough to act on?"

### Phase 5 - Launch Decisions Upgrade

Tasks:

- Convert existing launch decisions into Go / Review / Hold / No-go board.
- Add decision package detail.
- Add guardrail panel.
- Add handoff builder.
- Add outcome preview.

Acceptance:

- Page answers: "launch, review, hold, or no-go?"
- Every handoff says target tower, owner, payload, status.

### Phase 6 - AI Operator & Alerts Integration

Tasks:

- Keep AI Operator as embedded operating layer, not separate chatbot-first page.
- Add recommendation cards:
  - explain
  - draft action
  - required confirmation
  - audit note
- Alert queue routes into Decision Hub and target tower.

Acceptance:

- AI never appears as source of truth.
- Every risky action has confirmation/audit placeholder.

### Phase 7 - QA & Regression

Tests:

- route load for all new and legacy Intelligence routes
- sidebar active state
- command palette labels
- signal detail opens
- launch decision state lanes render
- handoff links do not route to overview by accident
- dark/light readability
- no horizontal overflow desktop/tablet/mobile
- empty state when no signals
- error state when backend control plane unavailable

Acceptance:

- Playwright route smoke passes.
- Unit tests pass.
- Browser QA screenshots attached to report.

## 11. Demo Flow Sau Tai Cau Truc

### Flow 1 - Market Signal To Launch Decision

1. Open `/intelligence/decision-hub`
2. Select top opportunity
3. Open linked signal
4. See market/customer/COS evidence
5. Convert to Launch Decision
6. Mark `Review` or `Go`
7. Handoff to Demand Campaigns

Proof:

```txt
Intelligence starts action with evidence, not chart.
```

### Flow 2 - Campaign Attribution To Better Decision

1. Open `/intelligence/signals?capability=attribution`
2. Select creator/source signal
3. See lead/RFQ/order proof
4. See weak source warning
5. Send recommendation to Launch Decisions or Demand

Proof:

```txt
Prime OS measures real commercial outcome, not only engagement.
```

### Flow 3 - Forecast Guardrail Blocks Bad Launch

1. Open Launch Decisions
2. Select a high-confidence decision with stock risk
3. Guardrail panel shows ATS/fulfillment issue
4. State becomes `Hold`
5. Handoff goes to COS Inventory/Fulfillment fix

Proof:

```txt
Intelligence grows demand with guardrails, not blind pushing.
```

### Flow 4 - Outcome Readback

1. Open Decision Hub
2. Open completed decision
3. See leads/RFQs/orders/service issues/revenue preview
4. See learning note
5. New signal appears for next loop

Proof:

```txt
Prime OS closes the loop and improves from outcome.
```

## 12. Acceptance Criteria

Plan/build is considered correct when:

1. Intelligence no longer feels like six separate technical tools.
2. User-facing IA is compact: Decision Hub, Signals, Launch Decisions.
3. Six capabilities remain represented behind the scenes.
4. Launch Decisions is the canonical decision workspace.
5. Signals are linked to Product/SKU/Campaign/Customer/Order/Service/Finance where applicable.
6. Every decision has evidence, guardrail, handoff, and outcome readback.
7. AI Operator is embedded as explain/recommend/draft/confirm/audit, not standalone magic chat.
8. Old Intelligence routes continue to work through redirect or parameterized views.
9. No Intelligence screen becomes chart-first.
10. No Intelligence feature owns COS, Customer, Demand, or Finance truth.

## 13. Open Questions

1. Sidebar should show 3 entries or 4 entries?
   - Recommended: 3 entries for SME/board clarity.
   - Alternative: add `Operator` as fourth entry if AI needs visibility.

2. Should `/intelligence` redirect to `/intelligence/decision-hub` or render directly?
   - Recommended: render directly and keep `/intelligence/decision-hub` as alias.

3. Should Finance guardrails be visible now or later?
   - Recommended: visible as read-only preview now, deeper finance logic later.

4. Should Intelligence data live as JSON mock files or derived TS adapter?
   - Recommended: start with TS adapter over current snapshot/control-plane, then add JSON docs if needed for board review.
