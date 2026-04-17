# Gap Analysis

## What the 5 repos do not solve
The repos cover strong patterns for skills, DDD/CQRS/EDA, workflow orchestration, AI operator graphs and in-app copilot UI. They do not yet solve the actual Prime OS/COS architecture.

## Major gaps
| Gap | Why it matters | Repo coverage | Team action |
| --- | --- | --- | --- |
| Prime OS bounded contexts | Area - Tower - Floor must translate into actual bounded contexts and ownership | Partial in EventDriven only | Design domain map and context map |
| COS canonical data model | Product, inventory, order, fulfillment, pricing, policy need precise entities | Not covered | Create COS domain model ADRs |
| Inventory truth and reservation | Sellable inventory, ATP, reservation, allocation, stock ledger are core | Not covered | Dedicated Inventory Brain design |
| Order orchestration beyond cart | Split shipments, cancellations, partial fulfillment, returns, exceptions | Temporal demo is too simple | Build order lifecycle model and workflow |
| Multi-channel commerce surface | Web, EC, POS, RFQ, assisted sales, marketplace connectors | Not covered | Design Commerce Surface contracts |
| Attribution data model | Visit -> lead -> inquiry -> order linkage with identity resolution | Not covered | Design attribution identity and event model |
| Customer timeline | Unified timeline across lead, order, service, loyalty, B2B | Partial CustomerService only | Design customer context schema |
| B2B RFQ/quote | Quote revisions, terms, buyer roles, approval, negotiation | Not covered | Dedicated B2B Account/RFQ ADR |
| Rule/policy engine | Pricing, routing, fulfillment, return, authorization policies | Not covered | Decide rule representation and execution |
| AI live context retrieval | How operator safely reads exact current state | LangGraph pattern only | Design context retrieval gateway |
| AI action permission | What AI can suggest, draft, execute and with which approval | LangGraph/CopilotKit partial | Define tool/action policy matrix |
| Audit model | Business audit vs AI decision trace vs UI event stream | Partial EventDriven/LangGraph | Design unified audit/event taxonomy |
| Data governance | PII, retention, encryption, tenant isolation, redaction | LangGraph threat model only | Security/privacy ADRs |
| Observability | Metrics, traces, workflow visibility, operator quality metrics | Partial | Design observability baseline |
| Production ops | Deployment, scaling, disaster recovery, migration, versioning | Not covered sufficiently | Platform ADRs |

## Parts team must design itself
### Prime OS product architecture
- Final Area - Tower - Floor boundaries.
- Which Tower can be standalone product vs shared platform capability.
- Naming conventions for Area/Tower/Floor/entities/actions.
- Operator UX per Tower.

### COS domain architecture
- Product Master: SKU/product/variant/attribute/catalog truth.
- Inventory Brain: stock ledger, sellable calculation, reservation, allocation, replenishment signals.
- OMS Orchestration: order lifecycle, state machine, command set, exception model.
- Fulfillment Control: node routing, shipment request, carrier/3PL integration, status feedback.
- Policy & Rule: pricing, routing, cancellation, return, SLA, approval rules.
- Event & Audit: immutable business events, integration events, AI decision trace.

### Intelligence architecture
- Live context retrieval APIs.
- Feature store or semantic context index, if needed.
- AI Operator state, memory, checkpoint and retention.
- Recommendation confidence and fallback.
- Human approval policy.
- Evaluation of AI suggestions.

### Copilot UX
- Where the operator appears in COS screens.
- What the operator can see per role.
- Which actions are read-only, draft-only, approval-required or forbidden.
- How generated UI should render business objects without hiding source-of-truth screens.

## ADRs needed
| ADR | Priority | Trigger |
| --- | --- | --- |
| ADR-COS-001 Bounded contexts and aggregate ownership | P0 | Before backend core implementation |
| ADR-COS-002 Command/event naming and audit taxonomy | P0 | Before command gateway |
| ADR-COS-003 Inventory Brain truth model | P0 | Before inventory/order integration |
| ADR-COS-004 Order lifecycle and orchestration | P0 | Before OMS workflow |
| ADR-COS-005 Workflow engine choice | P1 | Before Temporal or alternative adoption |
| ADR-COS-006 Event bus/outbox/inbox/idempotency | P0 | Before async integration |
| ADR-COS-007 Rule/policy engine | P1 | Before pricing/routing automation |
| ADR-AI-001 AI Operator tool boundary | P0 | Before any mutating AI action |
| ADR-AI-002 Live context retrieval and grounding | P0 | Before AI operator prototype touches live data |
| ADR-AI-003 AI checkpoint/memory retention | P1 | Before persisted AI sessions |
| ADR-UX-001 In-app copilot interaction model | P1 | Before CopilotKit production use |
| ADR-SEC-001 Tenant, PII, audit and approval policy | P0 | Before production data |

## Gaps by repo
### antigravity-awesome-skills
Missing: domain model, live context, execution runtime, permissions, audit, commerce workflows.

Team must add: Prime OS skill schema with live context, allowed tools, required approvals and audit output.

### EventDriven.ReferenceArchitecture
Missing: full commerce model, saga/process orchestration, inventory reservation, real outbox/inbox, AI layer, UI copilot.

Team must add: COS-specific bounded contexts and production-grade eventing.

### temporal-ecommerce
Missing: DDD domain model, production order/inventory complexity, security, idempotent activity design, event backbone, AI/UI.

Team must add: workflow boundaries and compensation rules for real COS processes.

### langgraph
Missing: commerce source of truth, transaction control plane, UI layer, enterprise permissions, production data governance defaults.

Team must add: tool gateway, live context retrieval, approval/audit policy and evals.

### copilotkit
Missing: domain/control plane, business workflow engine, backend policy, source-of-truth data model, audit taxonomy.

Team must add: Prime OS-specific operator UX and secure backend action bridge.

## Recommended next design package
Create a `Prime OS Architecture Pack v0.1` with:

1. Area - Tower - Floor canonical map.
2. COS bounded context map.
3. Command/event/audit naming convention.
4. One end-to-end order orchestration sequence.
5. AI Operator read-only context flow.
6. In-app copilot approval flow.
7. ADR backlog with owners and decision dates.
