# 03 - Screen Map

## Screen inventory

| Screen | Path | Source |
|---|---|---|
| Prime OS Overview | `/overview` | New for Prime OS |
| Acquisition Tower | `/demand/acquisition` | New for Prime OS |
| Campaign Tower | `/demand/campaign` | New for Prime OS |
| Content & Social Tower | `/demand/content-social` | New for Prime OS |
| Lead Capture Tower | `/demand/lead-capture` | New for Prime OS |
| Retargeting Tower | `/demand/retargeting` | New for Prime OS |
| CRM Compact Tower | `/customer/crm-compact` | New for Prime OS, derived from COS orders/returns |
| Service Tower | `/customer/service` | New for Prime OS, linked to COS returns/OMS |
| Commerce Surface Tower | `/ecom/commerce-surface` | New for Prime OS |
| Product Master list | `/ecom/cos/product-master` | Reused from COS |
| Product Master detail | `/ecom/cos/product-master/:id` | Reused from COS |
| Product Master create/edit | `/ecom/cos/product-master/new`, `/ecom/cos/product-master/:id/edit` | Reused from COS |
| Listings | `/ecom/cos/listings` | Reused from COS |
| Inventory Brain | `/ecom/cos/inventory-brain` | Reused from COS |
| Warehouses | `/ecom/cos/warehouses` | Reused from COS |
| OMS | `/ecom/cos/oms` | Reused from COS |
| OMS detail | `/ecom/cos/oms/:id` | Reused from COS |
| Fulfillment | `/ecom/cos/fulfillment` | Reused from COS |
| Fulfillment job detail | `/ecom/cos/fulfillment/jobs/:id` | Reused from COS |
| Returns | `/ecom/cos/returns` | Reused from COS |
| Return detail | `/ecom/cos/returns/:id` | Reused from COS |
| Policy & Rule landing | `/ecom/cos/policy-rule` | New wrapper around COS |
| SLA policies | `/ecom/cos/policy-rule/sla` | Reused from COS |
| Routing plans | `/ecom/cos/policy-rule/routing` | Reused from COS |
| Event & Audit landing | `/ecom/cos/event-audit` | New wrapper around COS events |
| Analytics Tower | `/intelligence/analytics` | New for Prime OS |
| Attribution Tower | `/intelligence/attribution` | New for Prime OS |
| Forecasting & Optimization Tower | `/intelligence/forecasting` | New for Prime OS |
| AI Operator Tower | `/intelligence/ai-operator` | New for Prime OS, uses existing copilot shell context |
| Social Listening & VOC Tower | `/intelligence/voc` | New for Prime OS |
| Automation & Alerts Tower | `/intelligence/alerts` | New for Prime OS |
| UI regression | `/__ui-regression` | Reused internal COS QA route |

## Old route redirects

Legacy paths are redirected so existing muscle memory still lands inside the new Prime shell:

- `/dashboard` -> `/overview`
- `/products` -> `/ecom/cos/product-master`
- `/inventory` -> `/ecom/cos/inventory-brain`
- `/orders` -> `/ecom/cos/oms`
- `/fulfillment` -> `/ecom/cos/fulfillment`
- `/returns` -> `/ecom/cos/returns`
- `/sla-policies` -> `/ecom/cos/policy-rule/sla`
- `/routing-plans` -> `/ecom/cos/policy-rule/routing`

## Screen source rule

- Reused from COS means the original page component is mounted unchanged under the new Prime route.
- Adapted from COS means a wrapper page surrounds existing COS screens or stores.
- New for Prime OS means the screen did not exist in COS and was added only to complete Phase 1 visualization.
