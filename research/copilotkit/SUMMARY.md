# copilotkit

## Repo name
copilotkit

Local path: `/Users/admin/Desktop/Prime OS/upstream/copilotkit`

## Repo purpose
SDK/runtime de build agent-native applications voi chat UI, generative UI, shared state, frontend tools, human-in-the-loop va AG-UI event protocol. Repo cung cap React/Angular/core packages, runtime server, AgentRunner abstraction, SQLite runner va nhieu examples tich hop LangGraph/CrewAI/Mastra/custom agents.

## Core concept
CopilotKit noi UI, runtime va agent bang event stream:

- Frontend hooks register tools/context/shared state.
- Runtime server expose endpoints `/info`, `/agent/:id/run`, `/connect`, `/stop`.
- AgentRunner quan ly run, thread, streaming, lifecycle.
- AG-UI la protocol event-based cho text, tool calls, state snapshot/delta, run lifecycle.
- UI co the render tool calls, generative UI va human approval.
- Shared state cho app va agent cung doc/ghi trong interaction loop.

## What to reuse
- In-app copilot architecture: app UI -> runtime -> agent -> SSE/AG-UI events -> UI.
- AG-UI event vocabulary cho Prime OS operator UI: run started, text stream, tool call, tool result, state snapshot/delta.
- Frontend tool registration pattern cho actions nhu "draft reply", "open order", "create follow-up task", "simulate routing".
- Human-in-the-loop UI pattern cho risky commands.
- Runtime/AgentRunner abstraction cho agent lifecycle, stop/connect/thread persistence.
- Examples integrating LangGraph with UI, useful for AI Operator prototype.

## What NOT to reuse directly
- Khong de CopilotKit decide Prime OS UI information architecture.
- Khong expose real COS mutating tools qua frontend without backend policy checks.
- Khong treat AG-UI as domain event bus. No la UI-agent interaction protocol, khong phai commerce event backbone.
- Khong import prebuilt chat UI as final enterprise UX neu chua design theo operator workflows.
- Khong dung SQLite runner cho production core decision history neu chua co data governance.

## Relevant modules/files
- `README.md`: agent-native apps, generative UI, shared state, human-in-the-loop.
- `dev-docs/architecture/ARCHITECTURE.md`: 3-layer model, AG-UI event flow, package map.
- `dev-docs/architecture/setup-runtime.md`: CopilotRuntime, AgentRunner, Express/Hono routes, runner options.
- `dev-docs/architecture/setup-react.md`: React provider, `useFrontendTool`, `useAgentContext`, HIL patterns.
- `dev-docs/architecture/plugin-points.md`: extension points, middleware, tools, runner, HIL.
- `dev-docs/architecture/multi-agent.md`: multi-agent routing and agent-specific tools.
- `packages/react-core/README.md`: hooks, shared state, CoAgent, action rendering.
- `packages/runtime/src/index.ts`: runtime exports.
- `packages/sqlite-runner/src/sqlite-runner.ts`: persistent AgentRunner implementation.
- `examples/integrations/langgraph-*`: LangGraph integration examples.
- `examples/showcases/*`: generative UI and domain UI demos.

## Mapping to Prime OS
| Prime OS area/tower | Mapping |
| --- | --- |
| Intelligence Area - AI Operator Tower | UI shell cho in-app operator: chat, stateful context, tool call UI, approval flows. |
| Intelligence Area - Automation & Alerts Tower | Alert investigation UI va guided remediation panel. |
| Demand Area | Campaign/copilot UI: generate content, inspect attribution, launch follow-up with confirmation. |
| Customer Area | Support copilot: draft reply, summarize timeline, propose retention action. |
| Ecom Area - COS Tower | Operator assistant beside COS workspace: explain order/inventory state, propose safe command. |
| Frontend copilot layer | Strongest fit trong 5 repo cho UI copilot and AG-UI interaction protocol. |

## Risks / mismatch with our architecture
- CopilotKit la UI/agent interaction layer, khong giai quyet DDD, orchestration hay transaction consistency.
- Frontend tool execution can thanh security risk neu cho phep mutating action client-side.
- Shared state can bi confusion voi source-of-truth system state.
- AG-UI event stream khong thay the audit/event log cua COS.
- Product UX cua Prime OS can domain-specific operator surfaces, khong chi chat.
- Runtime/runner choices can tao lock-in neu prototype di qua sau.

## Evaluation scores
| Criteria | Score | Notes |
| --- | ---: | --- |
| Strategic fit with Prime OS | 4 | Tot cho in-app copilot va HITL operator UI. |
| DDD fit | 1 | Khong lien quan domain model. |
| Workflow orchestration fit | 3 | Agent interaction workflow, not business orchestration. |
| Control plane fit | 2 | Chi nen goi control plane qua backend tools. |
| AI operator fit | 4 | Tot khi ket hop LangGraph/live context. |
| Frontend copilot fit | 5 | Repo phu hop nhat cho UI copilot. |
| Production readiness | 4 | Monorepo active, nhieu packages, can hardening. |
| Complexity cost | 4 | AG-UI/runtime/hooks/examples kha nhieu, can narrow. |
| Reuse difficulty | 3 | Prototype nhanh, production integration can policy/UX design. |

## Recommended adoption style
direct technical prototype

## Suggested next action
Lam prototype `Prime OS In-App Operator Panel`: CopilotKit UI + LangGraph operator graph + backend tool gateway read-only, sau do them mot action mutating co approval va audit stub.
