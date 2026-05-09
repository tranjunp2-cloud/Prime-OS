# 01 - Area / Tower / Floor Map

## Rule

Current application routes are canonical for Sprint 0. Older docs that name `/demand/acquisition`, `/demand/campaign`, `/intelligence/forecasting`, or similar legacy paths are treated as aliases or redirects unless the app route matches them directly.

Source priority:

1. `prime-os-phase-1/app/src/App.tsx`
2. `prime-os-phase-1/app/src/lib/prime/prime-navigation.ts`
3. `research/screenshots/20260508-073532-primeos-pages-popups-vi/manifest.json`
4. Existing docs under `docs/`

## Canonical IA

| Area | Tower | Floor / Route anchor | Source-of-truth note |
| --- | --- | --- | --- |
| Overview | Operating Overview | `/overview` | Not a business Area; summarizes closed-loop work. |
| Intelligence | Decision Hub | `/intelligence/decision-hub`, `?view=operator`, `?view=alerts`, `?capability=analytics` | Owns evidence, confidence, recommendation, and outcome readback. |
| Intelligence | Signals | `/intelligence/signals`, `?view=creators`, `?view=customer-trends`, `?capability=attribution`, `?capability=forecasting`, `?capability=voc` | Owns signal registry/read model, not source transactional truth. |
| Intelligence | Launch Decisions | `/intelligence/launch-decisions` | Owns launch package and decision thesis. |
| Demand | Demand Hub | `/demand/hub` | Owns operating summary for demand work. |
| Demand | Sources | `/demand/sources` | Owns channel/source acquisition read model. |
| Demand | Campaigns | `/demand/campaigns` | Owns campaign intent, budget, asset readiness, owner timeline. |
| Demand | Content & Social | `/demand/content-social` | Owns creator/content execution planning. |
| Demand | Leads & RFQs | `/demand/leads-rfqs` | Owns lead/RFQ capture and CRM handoff. |
| Demand | Re-engage | `/demand/re-engage` | Owns retargeting audiences, outreach, suppression rules. |
| Customer | Customer Profile | `/customer/crm-compact?floor=overview`, `account`, `contact`, `tags`, `identity` | Owns customer identity, lifecycle, account/contact/tags, timeline composition. |
| Customer | Service | `/customer/service` | Owns service case context and customer trust recovery. |
| Ecom/COS | Commerce Surface | `/ecom/commerce-surface` | Presents assisted commerce/RFQ; hands execution to COS. |
| Ecom/COS | Product Master | `/ecom/cos/product-master`, `/new`, `/:id`, `/:id/edit`, `/listings` | Owns product, SKU, listing, price/media truth. |
| Ecom/COS | Inventory Brain | `/ecom/cos/inventory-brain`, `/warehouses` | Owns stock buckets, ATS, reservations, reconciliation, replenishment signals. |
| Ecom/COS | OMS | `/ecom/cos/oms`, `/:id` | Owns order orchestration, SLA/routing application, order state. Semantic id: `orderId`. |
| Ecom/COS | Fulfillment / Shipment | `/ecom/cos/fulfillment`, `/fulfillment/jobs/:id`, `/returns`, `/returns/:id` | Owns pick/pack/ship/carrier/tracking/return execution. Semantic id: `returnId` for return details. |
| Ecom/COS | Policy & Rule | `/ecom/cos/policy-rule`, `/sla`, `/routing` | Owns SLA/routing guardrail definitions. |
| Ecom/COS | Event & Audit | `/ecom/cos/event-audit` | Read-only trace over events, recommendations, service, and audit. |
| Finance | Fin Support | `/finance/fin-support`, `#funding-application-flow`, `#lenders`, `#documents`, `#status`, `#blockers` | Owns funding readiness view, evidence pack, bank summary, application/document status. |
| Platform Admin | Account | `/account` | Internal admin; not part of V1 proof scenario. |

## Legacy / Alias Routes

| Legacy route | Canonical route | Owner |
| --- | --- | --- |
| `/dashboard` | `/overview` | Platform shell |
| `/products` | `/ecom/cos/product-master` | Product Master |
| `/inventory` | `/ecom/cos/inventory-brain` | Inventory |
| `/orders` | `/ecom/cos/oms` | OMS |
| `/fulfillment` | `/ecom/cos/fulfillment` | Fulfillment/Shipment |
| `/returns` | `/ecom/cos/returns` | Fulfillment/Shipment |
| `/sla-policies` | `/ecom/cos/policy-rule/sla` | Policy & Rule |
| `/routing-plans` | `/ecom/cos/policy-rule/routing` | Policy & Rule |
| `/demand/acquisition` | `/demand/sources` | Demand |
| `/demand/campaign` | `/demand/campaigns` | Demand |
| `/demand/lead-capture` | `/demand/leads-rfqs` | Demand |
| `/demand/retargeting` | `/demand/re-engage` | Demand |
| `/intelligence/analytics` | `/intelligence/decision-hub?capability=analytics` | Intelligence |
| `/intelligence/ai-operator` | `/intelligence/decision-hub?view=operator` | Intelligence |
| `/intelligence/alerts` | `/intelligence/decision-hub?view=alerts` | Intelligence |
| `/intelligence/attribution` | `/intelligence/signals?capability=attribution` | Intelligence |
| `/intelligence/forecasting` | `/intelligence/signals?capability=forecasting` | Intelligence |
| `/intelligence/voc` | `/intelligence/signals?capability=voc` | Intelligence |

## Bounded Context Ownership

| Context | Owns | May read | Must not own |
| --- | --- | --- | --- |
| Intelligence | signal lineage, confidence, recommendations, outcome readback | Demand, Customer, COS, Finance evidence | product/order/inventory/finance truth |
| Demand | campaign intent, source/channel plan, lead/RFQ capture, retargeting action | SKU/listing/ATS/order/customer signal summaries | customer identity, order state, ATS, funding status |
| Customer | account identity, contacts, lifecycle, follow-up, service timeline read model | Demand leads, OMS orders, returns, finance signals | order lifecycle, inventory buckets, campaign rules |
| Commerce Surface | assisted commerce/RFQ presentation | Product Master, Inventory, OMS | execution state after handoff |
| Product Master | product, SKU, listing identity, price/media truth | inventory/listing usage | ATS, order state, fulfillment execution |
| OMS | order orchestration, order state, SLA/routing decision, lifecycle events | product, inventory availability, fulfillment status | physical stock buckets, pick/pack/ship execution |
| Inventory | stock buckets, ATS, reservations, reconciliation, replenishment signals | product/SKU and OMS reservation demand | order lifecycle, shipment status |
| Fulfillment / Shipment | pick, pack, ship, carrier, tracking, delivery, return execution | OMS order, inventory reservation, customer service case | product/SKU truth, OMS lifecycle authority |
| Finance | funding readiness, evidence pack, bank review summary, application status | commerce evidence from COS/Customer/Demand | lender underwriting, accounting ERP, credit approval |
| Event & Audit | trace view over domain events | all linked event sources | source event mutation |

## Guardrail

Every story after Sprint 0 must name:

- `sourceOfTruthOwner`
- `readModelOwner`
- `linkedEntityType`
- `linkedEntityId`
- `canonicalRoute`
- `legacyRoutes` if applicable
