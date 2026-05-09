# 06 - Route Ownership Matrix

## Matrix Fields

Every Sprint 1+ story touching a route must include:

`route`, `canonical_route`, `legacy_routes`, `Area`, `Tower`, `Floor`, `bounded_context_owner`, `business_goal`, `primary_operator`, `delivery_DRI`, `product_owner`, `domain_reviewer`, `UX_reviewer`, `QA_owner`, `risk_reviewer`, `data_mock_contract`, `source_of_truth`, `cross_area_source`, `cross_area_target`, `handoff_object`, `required_metadata`, `i18n_key_owner`, `supported_locales`, `states_required`, `desktop_QA`, `mobile_QA`, `keyboard_QA`, `a11y_QA`, `screenshot_baseline`, `automation_file`, `release_priority`, `go_no_go_status`.

For Ecom/COS, `bounded_context_owner` must be one of:

- Product Master
- OMS
- Inventory
- Fulfillment/Shipment
- Policy & Rule
- Event & Audit

## Route Ownership

| Route / pattern | Area | Tower/Floor | Delivery DRI | Domain reviewer | QA owner | Priority |
| --- | --- | --- | --- | --- | --- | --- |
| `/overview` | Overview | Operating Overview | FE | PM + Domain Architect | QA Expert | P0 |
| `/intelligence/decision-hub` | Intelligence | Decision Hub | AI Engineer + FE | Domain Architect | QA Expert | P0 |
| `/intelligence/signals` | Intelligence | Signals | AI Engineer + FE | Domain Architect | QA Expert | P1 |
| `/intelligence/launch-decisions` | Intelligence | Launch Decisions | AI Engineer + FE | PM + Domain Architect | QA Expert | P0 |
| `/demand/hub` | Demand | Demand Hub | FE | PM + BA | QA Expert | P1 |
| `/demand/sources` | Demand | Sources | FE | PM + BA | QA Expert | P1 |
| `/demand/campaigns` | Demand | Campaigns | FE | PM + BA | QA Expert | P1 |
| `/demand/content-social` | Demand | Content & Social | FE | PM + BA | QA Expert | P2 |
| `/demand/leads-rfqs` | Demand | Leads & RFQs | FE | PM + BA | QA Expert | P0 |
| `/demand/re-engage` | Demand | Re-engage | FE | PM + BA | QA Expert | P2 |
| `/customer/crm-compact?floor=overview` | Customer | Customer Profile / Overview | UX + FE | BA + Domain Architect | QA Expert | P0 |
| `/customer/crm-compact?floor=account` | Customer | Customer Profile / Account | UX + FE | BA + Domain Architect | QA Expert | P0 |
| `/customer/crm-compact?floor=contact` | Customer | Customer Profile / Contact alias into Account | UX + FE | BA + Domain Architect | QA Expert | P1 |
| `/customer/crm-compact?floor=tags` | Customer | Customer Profile / Tags alias into Account | UX + FE | BA + Domain Architect | QA Expert | P1 |
| `/customer/crm-compact?floor=identity` | Customer | Customer Profile / Identity | UX + FE | BA + Domain Architect | QA Expert | P1 |
| customer dialogs | Customer | create/edit account, contact, tag dialogs | UX + FE | BA + Domain Architect | QA Expert | P1 |
| `/customer/service` | Customer | Service | UX + FE | BA + Domain Architect | QA Expert | P1 |
| `/ecom/commerce-surface` | Ecom/COS | Commerce Surface | FE | Domain Architect | QA Expert | P1 |
| `/ecom/cos/product-master` | Ecom/COS | Product Master | FE | Product Master owner | QA Expert | P1 |
| `/ecom/cos/product-master/:id` | Ecom/COS | Product Master detail | FE | Product Master owner | QA Expert | P1 |
| `/ecom/cos/listings` | Ecom/COS | Product Master / Listings | FE | Product Master owner | QA Expert | P2 |
| `/ecom/cos/inventory-brain` | Ecom/COS | Inventory Brain | FE | Inventory owner | QA Expert | P1 |
| `/ecom/cos/warehouses` | Ecom/COS | Inventory support | FE | Inventory owner | QA Expert | P2 |
| `/ecom/cos/oms` | Ecom/COS | OMS | FE | OMS owner | QA Expert | P1 |
| `/ecom/cos/oms/:id` | Ecom/COS | OMS detail | FE | OMS owner | QA Expert | P0 |
| `/ecom/cos/fulfillment` | Ecom/COS | Fulfillment | FE | Fulfillment/Shipment owner | QA Expert | P1 |
| `/ecom/cos/fulfillment/jobs/:id` | Ecom/COS | Fulfillment job detail | FE | Fulfillment/Shipment owner | QA Expert | P1 |
| `/ecom/cos/returns` | Ecom/COS | Returns | FE | Fulfillment/Shipment owner | QA Expert | P1 |
| `/ecom/cos/returns/:id` | Ecom/COS | Return detail | FE | Fulfillment/Shipment owner | QA Expert | P0 |
| `/ecom/cos/policy-rule` | Ecom/COS | Policy & Rule | FE | Policy & Rule owner | QA Expert | P1 |
| `/ecom/cos/policy-rule/sla` | Ecom/COS | SLA | FE | Policy & Rule owner | QA Expert | P0 |
| `/ecom/cos/policy-rule/routing` | Ecom/COS | Routing | FE | Policy & Rule owner | QA Expert | P2 |
| `/ecom/cos/event-audit` | Ecom/COS | Event & Audit | FE | Domain Architect | QA Expert | P1 |
| `/finance/fin-support` | Finance | Fin Support | FE | PM + Risk Reviewer | QA Expert | P0 |
| `/finance/fin-support#funding-application-flow` | Finance | Funding application flow | FE | PM + Risk Reviewer | QA Expert | P1 |
| `/finance/fin-support#lenders` | Finance | Lenders | FE | PM + Risk Reviewer | QA Expert | P1 |
| `/finance/fin-support#documents` | Finance | Documents | FE | PM + Risk Reviewer | QA Expert | P0 |
| `/finance/fin-support#status` | Finance | Status | FE | PM + Risk Reviewer | QA Expert | P0 |
| `/finance/fin-support#blockers` | Finance | Blockers | FE | PM + Risk Reviewer | QA Expert | P0 |
| finance loan wizard steps | Finance | Loan wizard modal | FE | PM + Risk Reviewer | QA Expert | P1 |
| command palette | Shell | Command route overlay | FE | UX Architect | QA Expert | P0 |
| Prime AI global overlay | Intelligence/Shell | Assistant layer | AI Engineer + FE | AI Engineer + Domain Architect | QA Expert | P0 |
| Finance Prime AI overlay | Finance | Assistant sidecar | AI Engineer + FE | Risk Reviewer | QA Expert | P0 |
| `/overview?role=factory` | Ecom / COS + Finance | Cross-area factory role surface | PM + UX + FE | Domain Architect | QA Expert | P1 |
| `/overview?role=agency` | Demand + Intelligence | Cross-area agency role surface | PM + UX + FE | Domain Architect | QA Expert | P1 |
| `/finance/fin-support?role=bank` | Finance | Bank reviewer role surface | PM + UX + FE | Domain Architect + Risk Reviewer | QA Expert | P1 |
| `/demand/leads-rfqs?role=lead-provider` | Demand | Lead provider role surface | PM + UX + FE | Domain Architect | QA Expert | P2 |
| `/intelligence/signals?view=creators&role=creator-agency` | Intelligence | Creator/KOL agency role surface | PM + UX + FE | Domain Architect | QA Expert | P2 |
| `/intelligence/decision-hub?view=operator` | Intelligence | Operator view | AI Engineer + FE | Domain Architect | QA Expert | P1 |
| `/intelligence/decision-hub?view=alerts` | Intelligence | Alerts view | AI Engineer + FE | Domain Architect | QA Expert | P1 |
| `/intelligence/decision-hub?capability=analytics` | Intelligence | Analytics mode | AI Engineer + FE | Domain Architect | QA Expert | P1 |
| `/intelligence/signals?view=creators` | Intelligence | Creator signals | AI Engineer + FE | Domain Architect | QA Expert | P1 |
| `/intelligence/signals?view=customer-trends` | Intelligence | Customer trends | AI Engineer + FE | Domain Architect | QA Expert | P1 |
| `/intelligence/signals?capability=attribution` | Intelligence | Attribution | AI Engineer + FE | Domain Architect | QA Expert | P0 |
| `/intelligence/signals?capability=forecasting` | Intelligence | Forecasting | AI Engineer + FE | Domain Architect | QA Expert | P1 |
| `/intelligence/signals?capability=voc` | Intelligence | VOC | AI Engineer + FE | Domain Architect | QA Expert | P1 |

## Automation Mapping

| QA concern | Existing file |
| --- | --- |
| Prime shell route load and redirects | `prime-os-phase-1/app/tests/prime-route-shell.spec.ts` |
| COS critical flows | `prime-os-phase-1/app/tests/cos-critical-flows.spec.ts` |
| A11y smoke | `prime-os-phase-1/app/tests/ui-a11y-shell.spec.ts` |
| Responsive overflow | `prime-os-phase-1/app/tests/ui-responsive-genesis.spec.ts` |
| Visual state regression | `prime-os-phase-1/app/tests/ui-regression.spec.ts` |
| Dark mode regression | `prime-os-phase-1/app/tests/ui-darkmode-regression.spec.ts` |
| i18n dictionary parity | `prime-os-phase-1/app/src/lib/i18n/i18n-foundation.test.ts` |
| Prime navigation matching | `prime-os-phase-1/app/src/lib/prime/prime-navigation.test.ts` |
