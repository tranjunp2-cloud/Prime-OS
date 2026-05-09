# 05 - Mock/API Contract Inventory

## Rule

Mock data is allowed for V1 demo, but every new mock source must have:

- `sourceOfTruthOwner`
- `readModelOwner`
- `linkedEntityType`
- `linkedEntityId`
- future API replacement shape
- route(s) that consume it

Existing backbone remains `prime-os-phase-1/app/src/lib/prime/prime-data.ts`, which reads COS stores and generates Prime read models.

## Contract Inventory

| Contract | Owner | Read model owner | Current source | Future API shape | Routes |
| --- | --- | --- | --- | --- | --- |
| `PrimeHandoff` | Source domain named per handoff | Target domain | New shared contract, derived from `prime-data.ts` and Intelligence workspace evidence | `GET /api/prime/handoffs`, `POST /api/prime/handoffs/:id/action` | Overview, Decision Hub, Leads/RFQs, Customer Profile, OMS, Fin Support |
| `PrimeActionMetadata` | Source domain named per action | UI shell / Area page | Local card metadata currently split across pages | `GET /api/prime/actions?area=&priority=` | Overview, Area/Tower cards |
| `CustomerTimelineEvent` | Customer | Customer Profile | `customer-profile-floor.ts`, OMS orders, returns, tickets | `GET /api/customers/:id/timeline` | `/customer/crm-compact?floor=overview` |
| `CustomerLifecycleStage` | Customer | Customer Profile | `PrimeCustomer.lifecycle`, profile floor owner data | `GET /api/customers/:id/lifecycle` | Customer Profile |
| `CustomerFollowUp` | Customer | Customer Profile / Demand | profile owner + next action; future lead/RFQ linkage | `GET /api/customers/:id/follow-ups`, `POST /api/follow-ups` | Customer Profile, Leads/RFQs |
| `CustomerRFQQuoteLink` | Demand owns lead/RFQ; Customer reads continuity | Customer Profile | `PrimeLead`, `PrimeRfq`, OMS order links | `GET /api/customers/:id/rfq-quote-links` | Leads/RFQs, Customer Profile, Commerce Surface |
| `CustomerServiceCase` | Customer Service | Customer Profile | `PrimeTicket`, Returns/RMA, OMS order | `GET /api/customers/:id/service-cases` | `/customer/service`, Customer Profile |
| `FinancialTrustProfile` | Finance | Fin Support | finance control plane + COS/Customer evidence | `GET /api/finance/trust-profile?merchantId=` | `/finance/fin-support` |
| `CommerceEvidencePack` | Finance | Fin Support / Bank role view | orders, settlements, invoices, logistics/export, marketplace health | `GET /api/finance/evidence-pack/:id` | Fin Support documents/status |
| `BankReviewSummary` | Finance + Risk Reviewer | Bank reviewer role view | finance status, blockers, documents | `GET /api/finance/bank-review/:profileId` | Fin Support, Phase 4 bank role |
| `RecommendationEvidence` | Intelligence | Decision Hub / Signals | `intelligence-workspace.ts`, forecasts, VOC, alerts | `GET /api/intelligence/recommendations/:id/evidence` | Decision Hub, Signals |
| `RecommendationFeedback` | Intelligence | Intelligence readback | new read model, can start session/mock | `POST /api/intelligence/recommendations/:id/feedback` | Decision Hub, Launch Decisions |
| `ActionOutcome` | Owning execution Area | Intelligence readback | future action/event projection | `GET /api/intelligence/outcomes?linkedEntityId=` | Launch Decisions, Decision Hub |
| `PrimeRole` | Product / Domain | Role mode UI | new demo contract | `GET /api/roles` | Phase 4 role surfaces |
| `RoleCapability` | Product / Domain / Security | Role mode UI | new demo contract | `GET /api/roles/:id/capabilities` | Phase 4 role surfaces |
| `PartnerWorkspaceSummary` | Product / Domain | Role mode UI | new demo contract | `GET /api/partner-workspaces/:role` | Phase 4 role surfaces |
| `PartnerHandoff` | Source domain named per handoff | Role mode UI | `PrimeHandoff` filtered by role | `GET /api/roles/:role/handoffs` | Phase 4 role surfaces |

## Ecom/COS Contract Guardrails

| Context | Required linked entity | API replacement expectation |
| --- | --- | --- |
| Product Master | `product`, `sku`, `listing` | product/catalog API owns identity, price, media, listing state |
| Inventory | `sku`, `reservation`, `warehouse` | inventory API owns stock bucket, ATS, reservation, reconciliation |
| OMS | `order`, `order_event` | OMS API owns order orchestration, state, SLA/routing, order audit |
| Fulfillment/Shipment | `shipment`, `return`, `ticket` | fulfillment/shipment API owns pick/pack/ship/tracking/return execution |
| Policy & Rule | `policy`, `routing_plan`, `sla` | policy API owns guardrail definitions; OMS/Fulfillment apply them |
| Event & Audit | `audit_id`, `domain_event` | audit API reads source events; it does not mutate source truth |

## Do Not Create

- Dashboard-only mock data with no product, SKU, customer, campaign, order, alert, or evidence reference.
- Customer records without lead, order, service, or timeline evidence.
- AI messages without linked entity, evidence, confidence, and approval boundary.
- Finance readiness values that cannot map back to commerce evidence.
- Role mode data that implies production RBAC or external partner portal access.
