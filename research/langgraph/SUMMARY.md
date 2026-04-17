# langgraph

## Repo name
langgraph

Local path: `/Users/admin/Desktop/Prime OS/upstream/langgraph`

## Repo purpose
Low-level orchestration framework cho stateful agents va long-running AI workflows. Repo cung cap graph execution, state graph, checkpoint persistence, thread/checkpoint model, human-in-the-loop interrupts, prebuilt ToolNode va SDK/CLI ecosystem.

## Core concept
LangGraph model agent/workflow nhu graph co state:

- `StateGraph` khai bao nodes, edges, branching va compile thanh executable graph.
- Pregel-inspired execution engine chay graph theo supersteps.
- Checkpointer persist snapshot state theo `thread_id` va `checkpoint_id`.
- Threads giup multi-session, multi-tenant agent state.
- Interrupts/human-in-the-loop cho phe duyet hoac sua state giua run.
- ToolNode execute tool calls va inject state/store/runtime vao tools.
- Security concern quan trong: checkpoint serialization/deserialization, tool trust boundary, storage retention.

## What to reuse
- Pattern AI Operator graph: retrieve live context, analyze, propose action, ask confirmation, dispatch command, audit.
- Checkpoint/thread concept cho operator sessions va investigation trail.
- Human-in-the-loop interrupt model cho action co risk: cancel order, override inventory, refund, price change.
- ToolNode-style tool boundary: AI khong mutate system truc tiep, chi goi tools duoc khai bao va guard.
- StateGraph pattern cho multi-step reasoning co branching.
- Threat model ideas cho agent runtime: checkpoint PII, tool injection, state leakage, deserialization risk.

## What NOT to reuse directly
- Khong dung LangGraph de model core commerce workflow thay cho COS domain/control plane.
- Khong cho graph state la source of truth cho orders, inventory, customer hay campaign.
- Khong expose broad tools cho AI operator neu chua co permission, confirmation va audit.
- Khong mac dinh LangSmith/LangGraph Server la production dependency neu chua co ADR.
- Khong copy prebuilt agent patterns khi chua map vao Prime OS entities va policies.

## Relevant modules/files
- `README.md`: durable execution, human-in-the-loop, memory, stateful agents.
- `libs/langgraph/README.md`: StateGraph quickstart va core benefits.
- `libs/langgraph/langgraph/graph/state.py`: StateGraph implementation.
- `libs/langgraph/langgraph/pregel/*`: Pregel execution engine.
- `libs/langgraph/langgraph/types.py`: Command, interrupt, runtime-oriented types.
- `libs/prebuilt/README.md`: ToolNode va human interrupt schemas.
- `libs/prebuilt/langgraph/prebuilt/tool_node.py`: tool execution pattern.
- `libs/checkpoint/README.md`: checkpoint, thread, serde, pending writes.
- `libs/checkpoint-postgres/README.md`, `libs/checkpoint-sqlite/README.md`: persistence backends.
- `.github/THREAT_MODEL.md`: trust boundaries, data classification, checkpoint/tool risks.

## Mapping to Prime OS
| Prime OS area/tower | Mapping |
| --- | --- |
| Intelligence Area - AI Operator Tower | Strongest fit: stateful operator, explain, recommend, draft action, confirmation, tool dispatch. |
| Intelligence Area - Automation & Alerts Tower | Alert investigation graph, anomaly triage, guided remediation. |
| Demand Area | Campaign optimization assistant, lead quality investigation, content suggestion flow. |
| Customer Area | Support copilot reasoning over customer context, service history va suggested reply. |
| Ecom Area - COS Tower | Operator layer only: explain order/inventory state and propose command; core state remains in COS. |
| Decision layer | Excellent reference for decision workflow, memory, checkpoint and HITL, not for transaction authority. |

## Risks / mismatch with our architecture
- Agent graph complexity can leak into core system if boundaries unclear.
- Checkpoint may store sensitive customer/order data; retention, encryption, redaction can co ADR.
- Tool execution needs strict allowlist, schema validation, authorization and audit.
- LangGraph is Python-first in this repo; Prime OS may need TypeScript/Go/.NET bridge.
- Production deployment story may involve closed-source/server ecosystem or extra platform decisions.
- Human-in-the-loop UX must be designed with CopilotKit or Prime OS UI, not assumed.

## Evaluation scores
| Criteria | Score | Notes |
| --- | ---: | --- |
| Strategic fit with Prime OS | 4 | Rat tot cho AI operator va decision layer. |
| DDD fit | 2 | Khong phai domain modeling framework. |
| Workflow orchestration fit | 4 | Tot cho agent workflows, khong thay Temporal/COS workflow. |
| Control plane fit | 2 | Nen o decision layer, khong core control plane. |
| AI operator fit | 5 | Phu hop nhat trong 5 repo cho stateful AI operator. |
| Frontend copilot fit | 2 | Can UI integration khac. |
| Production readiness | 4 | Mature ecosystem, nhung can security/ops ADR. |
| Complexity cost | 4 | Agent runtime, checkpoint, security va eval cost cao. |
| Reuse difficulty | 3 | Pattern de ap dung, integration can careful design. |

## Recommended adoption style
direct technical prototype

## Suggested next action
Lam prototype `Prime OS AI Operator Graph`: input la order/inventory/customer live context snapshot, output la explanation, recommended command, required approval, and audit note. Prototype khong duoc mutate core system truc tiep.
