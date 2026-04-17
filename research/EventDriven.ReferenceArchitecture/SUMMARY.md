# EventDriven.ReferenceArchitecture

## Repo name
EventDriven.ReferenceArchitecture

Local path: `/Users/admin/Desktop/Prime OS/upstream/EventDriven.ReferenceArchitecture`

## Repo purpose
Reference architecture .NET cho Domain Driven Design, CQRS va Event Driven Architecture. Repo demo hai microservice `CustomerService` va `OrderService`, tach command/query controllers, dung domain commands/events/handlers, repository abstraction, integration event qua Dapr pub/sub va acceptance tests.

## Core concept
Repo dat domain aggregate lam trung tam:

- Command controller nhan DTO ghi, map sang domain entity/command.
- Command handler xu ly business rule, tao domain event, apply event de mutate state, persist qua repository.
- Query controller/query handler doc state rieng.
- Integration event publish qua event bus de sync cross-service, vi du customer address update lam order update theo.
- Dapr abstract pub/sub va state store.
- ETag/concurrency guard bao ve update conflict.

## What to reuse
- DDD tactical pattern cho COS aggregates: Product, Inventory, Order, Fulfillment, Policy.
- CQRS separation giua command surface va query/read surface.
- Domain event + integration event distinction.
- Command result/outcome pattern: accepted, invalid, not found, conflict.
- ETag/concurrency concept cho operator actions tren live control plane.
- Acceptance testing style theo business scenarios.
- Pub/sub abstraction cho cross-tower propagation.

## What NOT to reuse directly
- Khong copy service boundary Customer/Order 1:1 cho Prime OS. Prime OS can boundary theo Tower/Floor va bounded context rieng.
- Khong mac dinh shared database CQRS la target architecture. Repo tu nhan day la simple implementation.
- Khong lay Dapr lam mac dinh cho Prime OS khi chua co infrastructure ADR.
- Khong de generic EventDriven libraries quyet dinh domain model commerce.
- Khong dung Mongo repository pattern nay nhu chuan bat buoc.

## Relevant modules/files
- `ReadMe.md`: overview DDD, CQRS, EDA, Dapr, Customer/Order services.
- `DevelopmentGuide.md`: step-by-step tao commands, domain events, handlers, repositories, integration events.
- `reference-architecture/CustomerService/Controllers/CustomerCommandController.cs`: write endpoint pattern.
- `reference-architecture/CustomerService/Controllers/CustomerQueryController.cs`: read endpoint pattern.
- `reference-architecture/CustomerService/Domain/CustomerAggregate/*`: aggregate, commands, events, handlers, queries.
- `reference-architecture/CustomerService/Domain/CustomerAggregate/CommandHandlers/UpdateCustomerHandler.cs`: publish integration event khi address change.
- `reference-architecture/OrderService/Integration/EventHandlers/CustomerAddressUpdatedEventHandler.cs`: consume integration event va update dependent state.
- `reference-architecture/OrderService/Domain/OrderAggregate/*`: order command/event/query model.
- `reference-architecture/dapr/components/pubsub.yaml`: pub/sub component config.
- `test/EventDriven.ReferenceArchitecture.Specs/Features/*.feature`: BDD acceptance scenarios.

## Mapping to Prime OS
| Prime OS area/tower | Mapping |
| --- | --- |
| Ecom Area - COS Tower | Strong reference cho control core: Product Master, Inventory Brain, OMS Orchestration, Fulfillment Control, Policy & Rule, Event & Audit. |
| Customer Area | Reference cho Customer Context, CRM Lite va Service state, nhung can merge voi customer timeline. |
| Intelligence Area | Event stream co the cap data cho attribution, analytics, alerting. |
| Demand Area | Dung cho lead/campaign command/event lifecycle neu can event-driven handoff sang Customer/Ecom. |
| Control plane | Command handlers + concurrency + audit events la pattern nen hoc. |
| Decision layer | Decision layer nen goi command API co guardrail, khong mutate database truc tiep. |

## Risks / mismatch with our architecture
- Repo la reference nho, khong phai commerce orchestration system day du.
- Chua co saga/process manager cho multi-step order/fulfillment.
- Chua co inventory reservation, sellable stock, routing, idempotency key, outbox/inbox pattern ro rang.
- CQRS example van kha simple, read/write chua that su tach database.
- Dapr dependency can ADR rieng neu muon dua vao stack.
- Khong co AI operator, frontend copilot hay live context grounding.

## Evaluation scores
| Criteria | Score | Notes |
| --- | ---: | --- |
| Strategic fit with Prime OS | 4 | Rat hop lam backend architecture reference cho COS. |
| DDD fit | 5 | Repo tap trung DDD tactical patterns. |
| Workflow orchestration fit | 2 | Co event propagation, chua co durable workflow/saga. |
| Control plane fit | 4 | Command, event, concurrency, audit pattern phu hop. |
| AI operator fit | 1 | Khong co agent/operator layer. |
| Frontend copilot fit | 1 | Khong lien quan UI copilot. |
| Production readiness | 3 | Tot de hoc, nhung demo/reference, can hardening. |
| Complexity cost | 3 | .NET/Dapr/Mongo/Aspire co learning curve. |
| Reuse difficulty | 3 | Pattern de hoc, code reuse phu thuoc stack. |

## Recommended adoption style
reference only

## Suggested next action
Viet ADR cho COS command/event model: aggregate boundary, command naming, domain event vs integration event, outbox/inbox, idempotency, ETag/concurrency, audit log va read model strategy.
