# 09 - Story Traceability Matrix

## Purpose

This file closes Sprint 0 acceptance for per-story traceability. Each roadmap story maps to a report gap, affected route(s), owner, QA path, data contract, and DoR status.

## Matrix

| Story ID | Phase | Report gap | Route(s) | Owner | QA path | Data contract | DoR status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S1-OP-01 | Phase 1 | Empty/detail pages break trust | `/ecom/cos/policy-rule/sla`, `/ecom/cos/oms/:id`, `/ecom/cos/returns/:id` | FE + Domain Architect | `cos-critical-flows.spec.ts`, screenshot proof | `PrimeActionMetadata`, `PrimeHandoff` | Ready |
| S1-I18N-01 | Phase 1 | Locale incomplete | official proof routes, command palette, Prime AI overlays | QA + FE | `i18n-foundation.test.ts`, first-fold screenshots | shell/ops dictionaries | Ready |
| S1-NAV-01 | Phase 1 | Area/Tower/Floor not enforced | all V1 proof routes | UX Architect + FE | `prime-route-shell.spec.ts`, `prime-navigation.test.ts` | `primeNavigation` | Ready |
| S1-OVR-01 | Phase 1 | Repeated critical narrative | `/overview`, `/intelligence/decision-hub` | PM + UX Architect | screenshot before/after | `PrimeActionMetadata` | Ready |
| S2-CUS-01 | Phase 2 | Customer underbuilt as CRM table | `/customer/crm-compact?floor=overview` | UX Architect + FE | screenshot, keyboard path | `CustomerTimelineEvent`, `CustomerLifecycleStage` | Ready |
| S2-CUS-02 | Phase 2 | Follow-up ownership missing | `/customer/crm-compact?floor=account` | Customer Owner + FE | customer route tests | `CustomerFollowUp` | Ready |
| S2-CUS-03 | Phase 2 | RFQ/quote/order continuity weak | `/demand/leads-rfqs`, `/customer/crm-compact?floor=account`, `/ecom/commerce-surface` | BA + FE | route checklist, screenshot | `CustomerRFQQuoteLink`, `PrimeHandoff` | Ready |
| S2-CUS-04 | Phase 2 | Service context not part of Customer loop | `/customer/service`, `/ecom/cos/returns/:id` | BA + FE | screenshot, keyboard path | `CustomerServiceCase`, `PrimeHandoff` | Ready |
| S2-CUS-05 | Phase 2 | Customer truth can duplicate COS truth | `/customer/crm-compact`, customer dialogs | Domain Architect | review checklist | source/read model owner fields | Ready |
| S3-FIN-01 | Phase 3 | Finance too narrow around loan wizard | `/finance/fin-support` | PM + FE | screenshot first fold | `FinancialTrustProfile` | Ready |
| S3-FIN-02 | Phase 3 | Bank-facing evidence missing | `/finance/fin-support#documents`, `/finance/fin-support#status` | PM + Risk Reviewer + FE | screenshot + copy review | `CommerceEvidencePack`, `BankReviewSummary` | Ready |
| S3-FIN-03 | Phase 3 | Finance could imply credit approval | `/finance/fin-support`, loan wizard, finance Prime AI | Risk Reviewer | risk copy checklist | `FundingApplicationStatus` | Ready |
| S3-FIN-04 | Phase 3 | Commerce-to-finance bridge not explicit | `/ecom/cos/oms/:id`, `/finance/fin-support#status` | Domain Architect + PM | route evidence pack | `PrimeHandoff`, `FinancialTrustProfile` | Ready |
| S4-ROLE-01 | Phase 4 | Multi-sided ecosystem not visible | `/overview?role=factory` | PM + UX + FE | role screenshot | `PrimeRole`, `PartnerWorkspaceSummary` | Ready |
| S4-ROLE-02 | Phase 4 | Agency work not visible | `/overview?role=agency` | PM + UX + FE | role screenshot | `PrimeRole`, `RoleCapability` | Ready |
| S4-ROLE-03 | Phase 4 | Bank reviewer proof missing | `/finance/fin-support?role=bank` | PM + Risk Reviewer + FE | role screenshot + risk review | `BankReviewSummary`, `PartnerHandoff` | Ready |
| S4-ROLE-04 | Phase 4 | Lead provider feedback missing | `/demand/leads-rfqs?role=lead-provider` | PM + BA + FE | role screenshot | `PartnerWorkspaceSummary` | Ready |
| S4-ROLE-05 | Phase 4 | KOL/KOC agency attribution missing | `/intelligence/signals?view=creators&role=creator-agency` | PM + AI Engineer + FE | role screenshot | `PartnerWorkspaceSummary`, `PartnerHandoff` | Ready |
| S5-INT-01 | Phase 5 | Intelligence recommendations lack trust proof | `/intelligence/decision-hub` | AI Engineer + FE | screenshot + review | `RecommendationEvidence`, `PrimeHandoff` | Ready |
| S5-INT-02 | Phase 5 | Signal views too similar | `/intelligence/signals?capability=attribution`, `forecasting`, `voc`, `?view=creators`, `?view=customer-trends` | AI Engineer + UX + FE | screenshot comparison | `IntelligenceSignal`, `SignalLineage` | Ready |
| S5-INT-03 | Phase 5 | Feedback/outcome loop weak | `/intelligence/launch-decisions` | AI Engineer + PM + FE | route checklist | `RecommendationFeedback`, `ActionOutcome` | Ready |
| S5-INT-04 | Phase 5 | Prime AI can overclaim source truth | Decision Hub, Prime AI overlays | AI Engineer + Domain Architect | copy/evidence review | `RecommendationEvidence` | Ready |
| S6-QA-01 | Phase 6 | QA evidence not repeatable | all official proof routes | QA Expert | route screenshot pack | release evidence template | Ready |
| S6-I18N-01 | Phase 6 | 3-locale SaaS readiness not proven | official proof routes | QA + FE | EN/VI/JA screenshots | translation ownership list | Ready |
| S6-REL-01 | Phase 6 | Release gaps could remain unknown | all V1 routes | PM + QA | release evidence template | V1.1 carryover list | Ready |

## Cutline Approval

| Cutline | Owner | Status | Evidence |
| --- | --- | --- | --- |
| P0 | Product Manager | Approved | Required for Sprint 1 start; listed in [04-sprint-backlog-p0-p1-p2.md](./04-sprint-backlog-p0-p1-p2.md). |
| P1 | Product Manager | Approved | Can enter Sprint 1 only if P0 remains protected. |
| P2 | Product Manager | Approved | Defaults to V1.1 if it threatens P0/P1. |

## DoR Summary

All rows above are `Ready` for planning, not implementation-complete. A story can enter build only when its implementation ticket copies the corresponding row and adds concrete screenshots/test IDs for the current sprint.
