# temporal-ecommerce

## Repo name
temporal-ecommerce

Local path: `/Users/admin/Desktop/Prime OS/upstream/temporal-ecommerce`

## Repo purpose
Demo/tutorial e-commerce app bang Go dung Temporal de model shopping cart nhu long-lived workflow. Repo minh hoa workflow state, signals, queries, timers, activities, REST API wrapper, unit testing workflow va external side effects nhu Stripe/Mailgun.

## Core concept
Shopping cart duoc xem la workflow song dai:

- `POST /cart` start workflow moi.
- `GET /cart/{workflowID}` query workflow state.
- `PUT /cart/{workflowID}/add|remove|checkout` signal workflow.
- Workflow giu state gio hang, email, checkout status.
- Timer detect abandoned cart va chay email activity.
- Activities thuc hien side effects ben ngoai nhu charge va email.
- Temporal persist/replay workflow state va ho tro test time-dependent logic.

## What to reuse
- Long-lived workflow pattern cho cac process COS co state va time: cart, checkout, order orchestration, fulfillment exception, return/RMA, quote approval.
- Signal/query mental model: command vao process, query lay live process state.
- Timer pattern cho abandoned cart, no-reply follow-up, SLA breach, stock reservation timeout.
- Activity boundary cho side effects: payment, email, ERP/WMS/3PL calls.
- TestWorkflowEnvironment pattern cho workflow unit tests va time travel.
- REST facade tren workflow: HTTP POST tao process, GET query process, PUT/PATCH signal process.

## What NOT to reuse directly
- Khong model moi entity commerce nhu Temporal workflow. Product, inventory ledger, customer profile van can database/domain model rieng.
- Khong copy cart demo vao COS core. Demo don gian va chua co production concerns day du.
- Khong dung workflow state lam source of truth duy nhat cho product/inventory/order accounting.
- Khong goi external side effects trong workflow logic; chi qua activities.
- Khong adopt Temporal la mandatory platform khi chua co ADR ve infra, cost va ops.

## Relevant modules/files
- `README.md`: run guide, API examples, testing guide.
- `workflow.go`: `CartWorkflow`, signal channels, query handler, timer, checkout activity.
- `activities.go`: Stripe charge va Mailgun email side effects.
- `shared.go`: signal/channel/request types, product/cart state.
- `api/main.go`: REST endpoints wrapping Temporal client, query va signal patterns.
- `worker/main.go`: Temporal worker register workflow/activity.
- `workflow_test.go`: workflow testing with signals, queries, delayed callbacks.
- `content/part1.md`: long-lived workflow as cart state.
- `content/part2.md`: abandoned cart timer va activities.
- `content/part3.md`: workflow testing.
- `content/part4.md`: RESTful API on top of Temporal workflows.

## Mapping to Prime OS
| Prime OS area/tower | Mapping |
| --- | --- |
| Ecom Area - Commerce Surface Tower | Cart/checkout flow prototype pattern. |
| Ecom Area - COS Tower | OMS orchestration, reservation timeout, fulfillment workflow, return workflow. |
| Demand Area - Retargeting Trigger Tower | Abandoned cart, no-reply, win-back timers. |
| Customer Area - Service Tower | SLA timers, case escalation, return/RMA workflow. |
| Intelligence Area - Automation & Alerts Tower | Timed triggers va workflow state query feed into alerting. |
| Control plane | Durable process manager cho cross-system orchestration, khong phai domain aggregate store. |

## Risks / mismatch with our architecture
- Demo khong co DDD aggregate model, CQRS, event bus, auth, idempotency hay audit policy.
- Temporal workflow replay constraints yeu cau deterministic code, co learning cost cao.
- Long-lived workflow co the bi abuse neu dung thay cho relational/entity state.
- Checkout/payment example thieu real payment risk handling.
- Go implementation co the khac stack Prime OS neu team dung TypeScript/Python/.NET.
- Chua co AI operator hay frontend copilot pattern.

## Evaluation scores
| Criteria | Score | Notes |
| --- | ---: | --- |
| Strategic fit with Prime OS | 4 | Rat hop cho orchestration va process manager. |
| DDD fit | 2 | Workflow-centric, khong domain-rich. |
| Workflow orchestration fit | 5 | Repo minh hoa Temporal rat truc tiep. |
| Control plane fit | 4 | Tot cho process control, timers va side effects. |
| AI operator fit | 1 | Khong co AI agent. |
| Frontend copilot fit | 1 | UI demo co ban, khong phai copilot. |
| Production readiness | 2 | Tutorial/demo, can production design rieng. |
| Complexity cost | 4 | Temporal concepts va ops kha nang. |
| Reuse difficulty | 4 | Nen prototype co chon loc, khong copy. |

## Recommended adoption style
direct technical prototype

## Suggested next action
Lam prototype nho `COS Order Orchestration Workflow`: create order, reserve inventory, request fulfillment, wait shipment status, handle timeout, compensate reservation, expose query state cho AI Operator.
