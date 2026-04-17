# Prime OS Research Overview

## Scope
Da clone va doc 5 repo vao `/Users/admin/Desktop/Prime OS/upstream`. Cac repo nay chi la learning/reference/prototype sources. Khong repo nao duoc xem la framework chinh thuc cua Prime OS.

## Executive summary
| Repo | Best use | Main Prime OS value | Adoption style |
| --- | --- | --- | --- |
| `antigravity-awesome-skills` | Product strategy, operator playbooks, skill governance | Cach dong goi tri thuc tac vu thanh skill library cho AI Operator | Pattern extraction |
| `EventDriven.ReferenceArchitecture` | Architecture reference | DDD/CQRS/EDA pattern cho COS command/event control plane | Reference only |
| `temporal-ecommerce` | Workflow prototype | Durable process orchestration, timers, signals, activities cho order/cart/service flows | Direct technical prototype |
| `langgraph` | AI operator prototype | Stateful AI decision graph, checkpoint, HITL, tool boundary | Direct technical prototype |
| `copilotkit` | UI copilot prototype | In-app copilot UI, AG-UI event protocol, shared state, frontend tools, HIL | Direct technical prototype |

## Which repo serves which Prime OS layer
| Prime OS concern | Primary repo | Secondary repo |
| --- | --- | --- |
| Product strategy / skill library | `antigravity-awesome-skills` | `copilotkit` |
| DDD / bounded context / CQRS | `EventDriven.ReferenceArchitecture` | `temporal-ecommerce` only for process facade ideas |
| Event-driven architecture | `EventDriven.ReferenceArchitecture` | `temporal-ecommerce` for workflow-event interaction |
| Workflow orchestration | `temporal-ecommerce` | `langgraph` for agent workflow only |
| Control plane | `EventDriven.ReferenceArchitecture` | `temporal-ecommerce` for long-running process manager |
| Decision layer | `langgraph` | `antigravity-awesome-skills` for decision recipes |
| AI operator on live context | `langgraph` | `copilotkit`, `antigravity-awesome-skills` |
| In-app copilot | `copilotkit` | `langgraph` |
| Operator workflow docs | `antigravity-awesome-skills` | `EventDriven.ReferenceArchitecture` BDD tests |

## Repo to Tower mapping
| Repo | Best-fit Tower(s) |
| --- | --- |
| `antigravity-awesome-skills` | AI Operator Tower, Automation & Alerts Tower, all Tower operator playbooks |
| `EventDriven.ReferenceArchitecture` | COS Tower, Customer Context Tower, Service Tower, Event & Audit Floor |
| `temporal-ecommerce` | COS Tower, Retargeting Trigger Tower, Service Tower, Automation & Alerts Tower |
| `langgraph` | AI Operator Tower, Automation & Alerts Tower, Analytics/Attribution investigation workflows |
| `copilotkit` | AI Operator Tower UI, Communication Tower assisted UI, COS operating workspace copilot |

## Recommended mental model
Prime OS nen chia ro 4 lop:

1. Commerce domain/control plane: DDD, CQRS, event model, authorization, audit. Hoc tu `EventDriven.ReferenceArchitecture`.
2. Durable business process orchestration: order, fulfillment, return, quote, SLA, retargeting timers. Prototype tu `temporal-ecommerce`.
3. AI decision/operator layer: stateful investigation, recommendation, tool-call guardrail, HITL. Prototype tu `langgraph`.
4. In-app operator interface: AG-UI stream, chat/action panel, generative UI, approvals. Prototype tu `copilotkit`.

`antigravity-awesome-skills` nam ngang lop 3 va 4: no giup dong goi tri thuc thao tac va governance, khong phai runtime.

## What each repo is NOT
- `antigravity-awesome-skills` is not a commerce architecture.
- `EventDriven.ReferenceArchitecture` is not a full COS.
- `temporal-ecommerce` is not a domain model or inventory truth.
- `langgraph` is not the business control plane.
- `copilotkit` is not the domain event bus or transaction layer.

## Final expectation grouping
### Use for learning
- `antigravity-awesome-skills`: skill anatomy, workflow metadata, catalog governance.
- `EventDriven.ReferenceArchitecture`: DDD, CQRS, domain/integration events.
- `langgraph`: stateful AI agent, checkpoint, HITL, threat model.
- `copilotkit`: AG-UI, frontend tools, HIL UI, shared state.
- `temporal-ecommerce`: Temporal concepts, signals, queries, timers, activities.

### Use for prototyping
- `temporal-ecommerce`: COS process manager prototype.
- `langgraph`: AI Operator decision graph prototype.
- `copilotkit`: In-app Operator Panel prototype.

### Use for architecture reference
- `EventDriven.ReferenceArchitecture`: primary backend architecture reference.
- `temporal-ecommerce`: process orchestration reference.
- `langgraph`: AI decision workflow reference.
- `copilotkit`: UI-agent interaction reference.

### Do not pull too deep into core system
- `antigravity-awesome-skills`: too broad, instruction catalog only.
- `copilotkit`: keep out of core domain/control plane.
- `langgraph`: keep out of transaction state and inventory/order truth.
- `temporal-ecommerce`: do not make every entity a workflow.
- `EventDriven.ReferenceArchitecture`: do not copy service boundaries or Dapr/Mongo choices blindly.
