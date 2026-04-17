# Adoption Rules for Prime OS

## Core rule
Prime OS la kien truc rieng cua chung ta. 5 repo nay chi la source de hoc, prototype hoac tham chieu. Khong repo nao duoc gan nhan "framework chinh thuc cua Prime OS" neu chua co ADR duoc phe duyet.

## Boundary between learning pattern and copying implementation
| Allowed | Not allowed |
| --- | --- |
| Hoc vocabulary, pattern, trade-off va test strategy | Copy service boundary/domain model 1:1 |
| Tao spike/prototype trong sandbox | Dua thang vao core production flow |
| Trich xuat diagrams, sequence, guardrail ideas | Bien repo thanh dependency mac dinh khi chua co ADR |
| Map concept vao Area - Tower - Floor | Doi taxonomy Prime OS theo repo external |
| Dung code sample de hieu behavior | Copy code co license/security/stack mismatch |

## Source classification
| Repo | Classification | Rule |
| --- | --- | --- |
| `antigravity-awesome-skills` | Source of ideas | Chi lay skill registry, bundle, workflow, governance pattern. Curate lai cho commerce. |
| `EventDriven.ReferenceArchitecture` | Source of reference architecture | Dung de viet ADR DDD/CQRS/EDA cho COS. Khong copy Dapr/Mongo/shared DB choice mac dinh. |
| `temporal-ecommerce` | Source of prototype only | Dung de spike durable workflow cho COS/retargeting/service. Khong bien workflow thanh entity store. |
| `langgraph` | Source of AI operator pattern + prototype | Dung cho decision graph, checkpoint, HITL. Khong cho agent graph own transaction state. |
| `copilotkit` | Source of UI copilot prototype | Dung de prototype in-app operator UI. Khong cho frontend tool bypass backend policy. |

## Team rules by concern
### DDD and control plane
- Source of truth: Prime OS bounded contexts and Area - Tower - Floor architecture.
- Required before implementation: ADR for aggregate boundary, command naming, event naming, idempotency, concurrency and audit.
- Useful repo: `EventDriven.ReferenceArchitecture`.
- Disallowed: adopting Customer/Order service split as-is.

### Workflow orchestration
- Use workflow engine only for long-running, multi-step, time-dependent or compensating processes.
- Do not use workflow engine for simple CRUD or canonical entity storage.
- Workflow can hold process state; aggregate/data store holds business truth.
- Useful repo: `temporal-ecommerce`.
- Required ADR: Temporal vs alternative workflow engine, retry/timeout/compensation, activity idempotency, workflow versioning.

### AI operator
- AI operator must read live context through controlled retrieval APIs.
- AI operator can propose/draft, but mutating actions must call command gateway.
- Tool access must be allowlisted, schema-validated, permission-checked and audited.
- Checkpoints may contain sensitive data, so retention/redaction/encryption must be designed.
- Useful repo: `langgraph`, `antigravity-awesome-skills`.
- Required ADR: tool trust boundary, memory/checkpoint policy, approval policy.

### In-app copilot
- Copilot UI is an operator surface, not the system of record.
- AG-UI or similar event stream is acceptable for UI-agent interaction only.
- Frontend tools should be read-only by default.
- Mutating tools must call backend endpoints with auth, policy, confirmation and audit.
- Useful repo: `copilotkit`.
- Required ADR: UI event protocol, thread/session model, audit rendering, action confirmation UX.

### Skill library
- Prime OS internal skills must be Tower/Floor-scoped.
- Each skill must name required live context and allowed actions.
- Each skill must include "not allowed" section.
- Each skill must specify audit output and escalation path.
- Useful repo: `antigravity-awesome-skills`.

## Adoption gates
Before moving any pattern from research to product:

1. Write a one-page ADR.
2. Map to Area - Tower - Floor.
3. Identify source of truth and owner Tower.
4. Define read/write boundary.
5. Define auth, permission and audit.
6. Define test strategy.
7. Define rollback or exit strategy.
8. Run a prototype on non-production data.

## Recommended adoption order
1. Use `EventDriven.ReferenceArchitecture` to define COS command/event/control plane conventions.
2. Use `temporal-ecommerce` to prototype one order/fulfillment workflow.
3. Use `langgraph` to prototype read-only AI Operator on live context snapshots.
4. Use `copilotkit` to put the operator into a real UI panel with HITL.
5. Use `antigravity-awesome-skills` to formalize operator skills after the first workflows are understood.

## Anti-patterns to reject
- "AI first, domain later": Prime OS needs domain/control plane first.
- "Workflow engine as database": durable workflow is process state, not product/order/inventory truth.
- "Chat as UI": copilot must sit beside real operator surfaces.
- "Skill as permission": instructions do not enforce authorization.
- "Event stream as audit": UI/agent events are not the same as immutable business audit.
- "Reference repo as blueprint": every external repo must be translated through Prime OS architecture.
