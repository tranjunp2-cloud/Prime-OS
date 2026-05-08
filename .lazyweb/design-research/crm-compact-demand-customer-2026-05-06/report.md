# Design Research: CRM Compact cho Demand -> Customer

## TL;DR
CRM Compact khong nen copy template CRM sales pipeline chung. Mau phu hop nhat cho Prime OS la **account action workspace**: danh sach customer can xu ly, panel 360 cua record dang chon, ly do diem fit/risk, next action co owner, va duong handoff Demand -> Customer -> Intelligence ro rang.

## Current State
![Current State](references/current-state.png)
*Prime OS Customer Area -> CRM Compact, route duoc demand/customer context nap vao mot workbench compact.*

## Project Context
- **Project context:** Prime OS, Customer Area, CRM Compact Tower; lien quan Demand vi lead/RFQ/retargeting/campaign response dua customer memory vao day.
- **Business goal:** bien demand signal va buyer memory thanh follow-up/retention/replenishment action co owner, khong tao CRM source of truth thu hai.
- **Operator:** commerce growth/customer operator, owner CRM Compact, Demand owner, Service owner, Intelligence reviewer.
- **Boundary:** Customer Area giu customer memory; Demand tao opportunity; OMS/Inventory/Fulfillment giu execution truth; Intelligence doc lai outcome va signal.

## Recommendations / Next Steps
1. **Chuyen "Compare customer records" thanh Account Action Queue** - dung table dense, co filter lanes `Needs follow-up`, `B2B replenishment`, `Service watch`, `Demand handoff ready`; moi row phai co owner, reason, fit/risk, revenue, source signal.

```
+--------------------------------------------------------------------------------+
| Account Action Queue     [Needs follow-up] [B2B] [Service watch] [Demand ready] |
+---------------------+---------+-----------+----------+-----------+--------------+
| Customer            | Owner   | Fit/Risk  | Why now  | Source    | Next action  |
| Emma / Kansai       | Hana    | 96 / Low  | reorder  | campaign  | Follow-up -> |
+---------------------+---------+-----------+----------+-----------+--------------+
```

2. **Dung list-detail-action thay vi hero card lon** - khi chon Emma, ben phai mo Customer 360 compact: memory, timeline, product route, channel, service watch, notes, allowed next actions. Table la navigation; detail panel la noi ra quyet dinh.

```
+---------------------------+-----------------------------------------------+
| Prioritized records       | Emma Thompson                                  |
| > Emma  96  reorder       | Memory: Kansai Office Supply / 29 orders      |
|   Wei   92  marketplace   | Timeline: campaign -> order -> service note   |
|   Lisa  88  retention     | Product route: CR-NTB-BLK-A5-A4               |
|                           | [Draft follow-up] [Send to Trends] [Assign]   |
+---------------------------+-----------------------------------------------+
```

3. **Giai thich diem `Customer fit 96%` bang reason codes** - tach score thanh `Fit`, `Revenue`, `Recency`, `Service risk`, `Demand signal`; diem tong hop chi co gia tri khi operator thay duoc vi sao va can lam gi.

```
+------------------+------------------+------------------+------------------+
| Fit 96 Ready     | Revenue ¥434k    | Recency 14d      | Risk Low         |
| Why: reorder     | Why: B2B repeat  | Why: active      | Why: no SLA hit  |
+------------------+------------------+------------------+------------------+
```

4. **Lam Demand handoff visible o tung record** - moi record can co `Source`, `Decision owner`, `Next tower`, `Audit trail`. CRM Compact khong nen noi chung chung "feeds Trends Intelligence"; no can noi record nao, signal nao, payload nao se duoc gui.

```
+-------------------------------------------------------------+
| Handoff trail                                               |
| Demand Campaign -> Lead/RFQ -> CRM Compact -> Trends Intel  |
| Payload: buyer memory + product route + service note        |
| Owner: Hana Lee     Status: ready for review                |
+-------------------------------------------------------------+
```

5. **Prime AI nen la command drawer co guardrail, khong phai floating CTA duy nhat** - action de xuat can hien `draft`, `required checks`, `owner approval`, `expected outcome`, `rollback/handoff result`.

```
+-----------------------------------------+
| Prime AI recommendation                  |
| Draft: Send replenishment offer          |
| Checks: inventory clear, service clear   |
| Owner approval: Hana Lee                 |
| [Create follow-up] [Assign] [Dismiss]    |
+-----------------------------------------+
```

## Key Examples
![Clay relationship timeline](references/clay-relationship-timeline.png)
*Clay - unified contacts, relationship timeline, reminders, follow-up memory, searchable interaction history. [Lazyweb]*

![Folk agency CRM](references/folk-agency-crm.png)
*Folk - agency CRM preview with pipeline, activity feed, contact panels; useful for compact relationship workflow. [Lazyweb]*

![Pendo churn prediction](references/pendo-churn-prediction.png)
*Pendo - churn prediction flow shows prioritized insights, definitions, analytics, and quick deeper-analysis actions. [Lazyweb]*

![Userpilot expansion revenue](references/userpilot-expansion-revenue.png)
*Userpilot - expansion revenue dashboard identifies customers ready for upgrade/action using data-backed readiness. [Lazyweb]*

![Common Room actions pipelines](references/common-room-actions-pipelines.png)
*Common Room - action pipelines with CRM/sheet integrations; good model for explicit handoff routes. [Lazyweb]*

![Keyplay Salesforce ICP](references/keyplay-salesforce-icp.png)
*Keyplay - ICP/account signals surfaced inside Salesforce; useful pattern for keeping Demand/account intelligence close to CRM. [Lazyweb]*

![Any.do sales CRM](references/anydo-sales-crm.png)
*Any.do - classic CRM customer pipeline/table; good for density, but Prime OS should add ownership, impact, and cross-area handoff. [Lazyweb]*

![HubSpot CRM](references/web-hubspot-crm.png)
*HubSpot CRM product page captured live; reinforces contacts, deals, tasks, and unified CRM workspace expectations. [Web]*

![Salesforce CRM](references/web-salesforce-crm.png)
*Salesforce CRM page captured live; useful benchmark for Customer 360 positioning, but too broad for Prime OS compact scope. [Web]*

![Gainsight customer success](references/web-gainsight-cs.png)
*Gainsight Customer Success page captured live; relevant for health, retention, and customer success operating patterns. [Web]*

## Patterns
- **Queue first, profile second, action third.** Strong CRM/CS patterns start with what needs attention, then explain the account, then offer the next action.
- **Scores need reason codes.** Fit/health/risk should reveal source facts, not just a percent.
- **Timeline is operating memory.** Good CRM screens show interaction history, reminders, product/service context, and follow-up state in one place.
- **Owner and SLA are first-class.** The record should show who owns next move, by when, and what tower receives/returns outcome.
- **CRM integrates, it does not absorb everything.** Product truth stays Product Master, order state stays OMS, service execution stays Service/Fulfillment, CRM stores relationship memory and next action.

## Anti-Patterns
- Generic sales pipeline columns only: lead/deal stages do not explain Prime OS customer memory.
- Card farm above a flat table: looks polished but slows operator decision-making.
- AI CTA without audit: "Prime AI" must show why, source, allowed action, and owner approval.
- Hidden Demand source: record should reveal which campaign, lead, RFQ, retargeting rule, or trend created the follow-up.
- Score theater: `96%` without reason, freshness, or risk becomes decorative.

## Unique Angles for Prime OS
- **Customer memory as a routing object:** not a CRM profile page; it is a compact payload that can move to Demand, Service, OMS, or Trends Intelligence.
- **Commerce-native CRM:** show product route, channel, order count, revenue, replenishment timing, service watch, and campaign source together.
- **Decision readiness, not CRM completeness:** Prime OS should optimize for "can the operator make the next accountable move now?"

## Suggested Screen Shape
```
+----------------------------------------------------------------------------------+
| CRM Compact                                             Decision readiness 84%     |
| Customer memory -> follow-up -> owner -> outcome                                  |
+----------------------------------------------------------------------------------+
| Lanes: [Needs follow-up] [B2B replenishment] [Service watch] [Demand handoff]      |
+------------------------------------------+---------------------------------------+
| Account Action Queue                     | Selected Customer 360                 |
| Emma Thompson   96  reorder   Hana ->    | Buyer memory / timeline / product     |
| Wei Chen        92  marketplace Ito ->   | route / service watch / demand source |
| Lisa Nguyen     88  retention  Mika ->   |                                       |
| Sakura Yamamoto 84  B2B        Ken  ->   | Prime AI recommended action           |
+------------------------------------------+---------------------------------------+
| Handoff trail: Campaign -> CRM Compact -> Trends Intelligence -> Demand outcome   |
+----------------------------------------------------------------------------------+
```

## Sources
- Lazyweb database searches on 2026-05-06: Clay, Folk, Pendo, Userpilot, Common Room, Keyplay, Any.do CRM/dashboard references.
- Web captures on 2026-05-06:
  - https://www.hubspot.com/products/crm
  - https://www.salesforce.com/crm/
  - https://www.gainsight.com/customer-success/
- Current Prime OS route captured locally: `http://127.0.0.1:5188/customer/crm-compact`.
