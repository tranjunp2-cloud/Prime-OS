# Repo to Prime OS Mapping

## Mapping matrix
| Repo | Area | Tower | Floor / usable pattern |
| --- | --- | --- | --- |
| `antigravity-awesome-skills` | Intelligence | AI Operator Tower | Operator Skill Registry, tool instructions, confirmation recipes, skill quality bar |
| `antigravity-awesome-skills` | Demand | Campaign / Content / Lead Capture | Campaign playbooks, content review skills, lead qualification playbooks |
| `antigravity-awesome-skills` | Customer | CRM Compact / Service | Support reply, escalation, retention and B2B account review skills |
| `EventDriven.ReferenceArchitecture` | Ecom | COS Tower | Command handlers, domain events, integration events, ETag concurrency, query handlers |
| `EventDriven.ReferenceArchitecture` | Customer | Customer Context / Service | Customer aggregate, event propagation, acceptance tests |
| `EventDriven.ReferenceArchitecture` | Intelligence | Analytics / Automation | Event stream as input to read models and alerts |
| `temporal-ecommerce` | Ecom | COS Tower | Durable workflow for cart/order/fulfillment, signal/query, activity side effects |
| `temporal-ecommerce` | Demand | Retargeting Trigger Tower | Abandoned cart timer, follow-up timers |
| `temporal-ecommerce` | Customer | Service Tower | SLA timer, RMA/return workflow, escalation process |
| `langgraph` | Intelligence | AI Operator Tower | Stateful decision graph, checkpoint, HITL, tool boundary |
| `langgraph` | Intelligence | Automation & Alerts Tower | Alert triage graph, root-cause investigation, suggested action |
| `langgraph` | Demand / Customer / Ecom | Area copilots | Read live context, explain state, propose next best action |
| `copilotkit` | Intelligence | AI Operator Tower | In-app copilot UI, AG-UI events, shared state, frontend tools |
| `copilotkit` | Customer | Communication / Service | Draft reply UI, approval UI, timeline assistant |
| `copilotkit` | Ecom | COS operating workspace | Operator action panel beside order/inventory/fulfillment screens |

## Demand Area
What we can use:

- From `antigravity-awesome-skills`: campaign planning, content, SEO/social, lead qualification, retargeting playbooks as skill templates.
- From `temporal-ecommerce`: abandoned cart/no-reply timer pattern for Retargeting Trigger Tower.
- From `langgraph`: campaign insight graph that reads attribution, persona, VOC and proposes message/segment/action.
- From `copilotkit`: campaign copilot UI that can draft content, preview action, ask approval and trigger backend command.
- From `EventDriven.ReferenceArchitecture`: command/event pattern for lead lifecycle and campaign state changes.

Boundary:

- Demand campaign spend, publish, lead routing and retargeting mutations must go through Prime OS command APIs.
- AI may recommend and draft; it must not directly run paid spend or customer messaging without policy approval.

## Customer Area
What we can use:

- From `EventDriven.ReferenceArchitecture`: Customer aggregate, command/query split, update event propagation, ETag conflict model.
- From `antigravity-awesome-skills`: support, retention, communication, B2B account review skill playbooks.
- From `langgraph`: support/copilot reasoning over customer timeline, service state and account context.
- From `copilotkit`: in-app support copilot, human approval for replies/refunds/escalations.
- From `temporal-ecommerce`: SLA and long-running service case workflows.

Boundary:

- Customer timeline and service state stay in Prime OS data model.
- Agent memory/checkpoint can store reasoning trace, but not become customer source of truth.

## Ecom Area
What we can use:

- From `EventDriven.ReferenceArchitecture`: core DDD/CQRS/event patterns for Product, Inventory, Order and Fulfillment contexts.
- From `temporal-ecommerce`: workflow orchestration for checkout, order routing, fulfillment request, timeout and compensation.
- From `langgraph`: explanation and decision-assist graph for COS exceptions.
- From `copilotkit`: operator UI for explain/propose/confirm actions inside COS workspace.
- From `antigravity-awesome-skills`: operator playbooks for catalog hygiene, inventory exception, order exception and fulfillment recovery.

Boundary:

- COS Tower owns transaction state, inventory truth, order truth and audit log.
- Workflow engine coordinates process; it does not replace product/inventory/order aggregates.
- AI operator can call command gateway only after permission, validation and confirmation.

## Intelligence Area
What we can use:

- From `langgraph`: primary AI Operator decision workflow, checkpoint and HITL model.
- From `copilotkit`: user-facing AG-UI event stream and action UI.
- From `antigravity-awesome-skills`: skill registry and workflow recipes.
- From `EventDriven.ReferenceArchitecture`: event stream source for analytics/read models.
- From `temporal-ecommerce`: time and workflow events as signals for alerts/automation.

Boundary:

- Intelligence Area explains, predicts, recommends and drafts.
- Mutating action belongs to backend command gateway.
- Every AI-assisted action needs input context snapshot, decision trace, approval state and audit record.

## COS Tower
COS can use the repos as follows:

| COS Floor | Repo input | How to use |
| --- | --- | --- |
| Product Master Floor | `EventDriven.ReferenceArchitecture`, `antigravity-awesome-skills` | DDD aggregate + catalog governance playbooks |
| Inventory Brain Floor | `EventDriven.ReferenceArchitecture`, `temporal-ecommerce`, `langgraph` | Command/event model + reservation workflow + AI exception explanation |
| OMS Orchestration Floor | `EventDriven.ReferenceArchitecture`, `temporal-ecommerce` | Order aggregate + durable process orchestration |
| Fulfillment Control Floor | `temporal-ecommerce`, `EventDriven.ReferenceArchitecture` | Workflow activities for 3PL/WMS calls + integration events |
| Policy & Rule Floor | `EventDriven.ReferenceArchitecture`, `langgraph` | Backend policy command validation + AI-readable rule explanation |
| Event & Audit Floor | `EventDriven.ReferenceArchitecture`, `langgraph`, `copilotkit` | Domain/integration events + AI decision trace + UI action stream |

## Suggested COS control flow
1. User or system creates a command through Commerce Surface or operator UI.
2. COS command gateway validates auth, schema, idempotency and policy.
3. Domain aggregate processes command and emits domain event.
4. Event is persisted in audit/outbox and projected to read models.
5. Durable workflow coordinates multi-step processes when needed.
6. Intelligence layer reads live state and events to explain/recommend.
7. Copilot UI displays recommendation and asks for confirmation.
8. Confirmed AI action returns to step 1 as a normal command.
