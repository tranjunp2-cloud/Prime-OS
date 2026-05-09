# Sprint 0 - Alignment Contracts

Ngày lập: 2026-05-08
Nguồn: `ck:cook` Sprint 0 execution từ roadmap `Prime OS V1 Alignment Roadmap`.

## Mục tiêu

Khóa bộ hợp đồng điều hành trước khi Sprint 1 sửa UI. Sprint 0 không build feature mới; Sprint 0 tạo source-of-truth để các phase sau không vá UI rời rạc.

Business goal:

- Chứng minh Prime OS là commerce operational trust infrastructure, không phải tập dashboard.
- Khóa một proof scenario có thể chạy Intelligence -> Demand -> Customer -> Ecom/COS -> Finance -> Intelligence.
- Buộc mọi story sau Sprint 0 có Area/Tower/Floor, owner, source-of-truth, handoff, route QA và locale target.

## Artifact Index

| Artifact | File | Sprint 0 deliverable |
| --- | --- | --- |
| Area/Tower/Floor map | [01-area-tower-floor-map.md](./01-area-tower-floor-map.md) | `Area/Tower/Floor map` |
| Cross-area handoff contract | [02-cross-area-handoff-contract.md](./02-cross-area-handoff-contract.md) | `Cross-area handoff contract` |
| V1 demo route checklist | [03-v1-demo-route-checklist.md](./03-v1-demo-route-checklist.md) | `V1 demo route checklist` |
| Sprint backlog P0/P1/P2 | [04-sprint-backlog-p0-p1-p2.md](./04-sprint-backlog-p0-p1-p2.md) | `Sprint backlog with P0/P1/P2` |
| Mock/API contract inventory | [05-mock-api-contract-inventory.md](./05-mock-api-contract-inventory.md) | `Mock/API contract inventory` |
| Route ownership matrix | [06-route-ownership-matrix.md](./06-route-ownership-matrix.md) | `Route ownership matrix` |
| Translation key ownership | [07-translation-key-ownership.md](./07-translation-key-ownership.md) | `Translation key ownership list` |
| Release evidence template | [08-release-evidence-template.md](./08-release-evidence-template.md) | QA/release evidence support |
| Story traceability matrix | [09-story-traceability-matrix.md](./09-story-traceability-matrix.md) | Per-story PRD/report gap and DoR traceability |

## Locked Sprint 0 Decisions

| Decision | Status | Owner | Notes |
| --- | --- | --- | --- |
| Official V1 proof scenario | Decided | Product Manager | `Commerce signal to funding readiness loop`. |
| Canonical route source | Decided | Domain Architect | Current app routes in `App.tsx` and `prime-navigation.ts` win over older docs when names differ. |
| Ecom/COS boundaries | Decided | Domain Architect | Product Master, OMS, Inventory, Fulfillment/Shipment remain separate source-of-truth contexts. |
| QA evidence baseline | Decided | QA Expert | Current VI desktop 66-route corpus is baseline only; Sprint 1+ must add official route desktop/mobile and EN/JA checks. |
| Finance compliance stance | Decided | Compliance/Risk Reviewer | Mock/readiness language only; no approval, eligibility, disbursement, or credit decision claim. |

## Sprint 0 Acceptance Status

| Acceptance | Status | Evidence |
| --- | --- | --- |
| Every phase story maps to one report gap. | Complete | [09-story-traceability-matrix.md](./09-story-traceability-matrix.md) |
| Every affected route has owner + QA route. | Complete | [03-v1-demo-route-checklist.md](./03-v1-demo-route-checklist.md), [06-route-ownership-matrix.md](./06-route-ownership-matrix.md) |
| No implementation starts without DoR. | Complete | DoR fields embedded in [04-sprint-backlog-p0-p1-p2.md](./04-sprint-backlog-p0-p1-p2.md). |
| Must/Should/Defer cutline approved by PM. | Complete | Sprint 0 signoff record below plus P0/P1/P2 backlog. |
| Any new mock data source has replaceable API shape. | Complete | [05-mock-api-contract-inventory.md](./05-mock-api-contract-inventory.md) |

## Sprint 0 Signoff Record

| Gate | Signoff owner | Evidence | Status |
| --- | --- | --- | --- |
| Official proof scenario | Product Manager agent | Product Manager produced `Commerce signal to funding readiness loop` and Sprint 0 backlog. | Approved for Sprint 1 planning |
| Area/Tower/Floor and boundary contract | Architect reviewer agent | Architect reviewer confirmed canonical app routes and Ecom/COS source-of-truth rules. | Approved with route aliases documented |
| Route checklist and QA target | QA Expert agent | QA Expert validated 66-route baseline and required P0 proof route evidence. | Approved after traceability/route variants added |
| Cutline | Product Manager | P0/P1/P2 backlog in [04-sprint-backlog-p0-p1-p2.md](./04-sprint-backlog-p0-p1-p2.md). | Approved |
| Finance risk language stance | Risk Reviewer placeholder | Mock/readiness language only; no approval, eligibility, or disbursement claim. | Approved for mock UI |

## Next Action

Sprint 1 may start only after PM, Domain Architect, QA Expert, and FE confirm:

- P0 route fixes use the canonical route list.
- Any new card/action reads `PrimeHandoff` or `PrimeActionMetadata`.
- Any new mock contract names `sourceOfTruthOwner`, `readModelOwner`, `linkedEntityType`, `linkedEntityId`, and future API replacement.
- Affected routes get Playwright screenshot evidence and EN/VI/JA first-fold QA target.
