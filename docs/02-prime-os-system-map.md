# 02 - Prime OS System Map

## Area -> Tower -> Floor -> Screen

### Overview

- Overview
  - Screen: `/overview`
  - Source: New Prime OS wrapper
  - Purpose: BOD-ready proof that Demand creates opportunity, Customer retains context, Ecom executes, Intelligence learns, and COS is the control core.

### Demand Area

| Tower | Floors represented | Screen |
|---|---|---|
| Acquisition Tower | Channel mix, traffic source, product audience fit, landing intent | `/demand/acquisition` |
| Campaign Tower | Campaign plan, budget pacing, offer logic, conversion path | `/demand/campaign` |
| Content & Social Tower | Content calendar, social post queue, creative evidence, VOC reuse | `/demand/content-social` |
| Lead Capture Tower | Lead queue, qualification, RFQ trigger, CRM handoff | `/demand/lead-capture` |
| Retargeting Tower | Audience rules, suppression rules, offer guardrails, follow-up paths | `/demand/retargeting` |

### Customer Area

| Tower | Floors represented | Screen |
|---|---|---|
| CRM Compact Tower | Identity, profile, timeline, segmentation, lifecycle, notes, follow-up, communication history, loyalty lite, B2B account extension | `/customer/crm-compact` |
| Service Tower | Ticket queue, case detail, RMA, SLA, resolution | `/customer/service` |

Customer Area intentionally does not split into Customer Context, CRM Lite, Communication, Loyalty, or B2B towers. Those capabilities are consolidated inside CRM Compact.

### Ecom Area

| Tower | Floor | Screen |
|---|---|---|
| Commerce Surface Tower | Storefront control, RFQ, assisted commerce, pricing, checkout, conversion tracking | `/ecom/commerce-surface` |
| COS Tower | Product Master Floor | `/ecom/cos/product-master` |
| COS Tower | Product Master detail/create/edit | `/ecom/cos/product-master/:id`, `/ecom/cos/product-master/new` |
| COS Tower | Listings support | `/ecom/cos/listings` |
| COS Tower | Inventory Brain Floor | `/ecom/cos/inventory-brain` |
| COS Tower | Warehouse support | `/ecom/cos/warehouses` |
| COS Tower | OMS Orchestration Floor | `/ecom/cos/oms`, `/ecom/cos/oms/:id` |
| COS Tower | Fulfillment Control Floor | `/ecom/cos/fulfillment`, `/ecom/cos/fulfillment/jobs/:id` |
| COS Tower | Returns support | `/ecom/cos/returns`, `/ecom/cos/returns/:id` |
| COS Tower | Policy & Rule Floor | `/ecom/cos/policy-rule`, `/ecom/cos/policy-rule/sla`, `/ecom/cos/policy-rule/routing` |
| COS Tower | Event & Audit Floor | `/ecom/cos/event-audit` |

### Intelligence Area

| Tower | Floors represented | Screen |
|---|---|---|
| Analytics Tower | KPI model, funnel health, execution health, service health | `/intelligence/analytics` |
| Attribution Tower | Source attribution, lead attribution, order attribution, issue attribution | `/intelligence/attribution` |
| Forecasting & Optimization Tower | Demand forecast, ATS risk, replenishment suggestion, campaign throttle | `/intelligence/forecasting` |
| AI Operator Tower | Context reader, decision queue, recommendation, action log | `/intelligence/ai-operator` |
| Social Listening & VOC Tower | Listening queue, sentiment, root cause, campaign/product action | `/intelligence/voc` |
| Automation & Alerts Tower | Alert queue, routing, escalation, automation guardrail | `/intelligence/alerts` |

## Control core

COS Tower remains the strongest part of Phase 1:

- Product Master is the identity/pricing/media/SKU source.
- Inventory Brain is the ATS/warehouse source.
- OMS Orchestration is the order lifecycle source.
- Fulfillment Control is the job/shipment/tracking source.
- Policy & Rule is the SLA/routing guardrail source.
- Event & Audit is the lifecycle and decision trace source.
