# 04 - Sprint Backlog P0 / P1 / P2

## P0

### S0-P0-1 - Lock Official V1 Proof Scenario

Area/Tower/Floor: Cross-Area / V1 Proof / Closed Loop

Owner: Product Manager
Reviewer: Business Analyst + Domain Architect + QA Expert
Tie-breaker: Product Manager

Business goal: Align all sprint work to one provable V1 ecosystem story.

Acceptance:

- Scenario includes Intelligence -> Demand -> Customer -> Ecom/COS -> Finance -> Intelligence.
- Each step names route, operator action, owner, evidence, business impact, and next action.
- Scenario identifies demo-critical routes and V1.1 carryover routes.
- PM signs the scenario before Sprint 1 planning.
- Any feature not strengthening the scenario is marked P1/P2 or V1.1.

Report gap: closed loop not fully proven; product can be perceived as disconnected dashboard/admin SaaS.

### S0-P0-2 - Create Area / Tower / Floor Map

Area/Tower/Floor: Cross-Area / Domain Architecture / Navigation Contract

Owner: Domain Architect
Reviewer: Product Manager + UX Architect
Tie-breaker: Domain Architect

Acceptance:

- All V1 proof routes are mapped to Area/Tower/Floor.
- Current app routes are canonical; older route docs are marked legacy/alias.
- Ecom/COS bounded contexts are explicitly assigned.
- No Floor owns data that belongs to another Area or bounded context.
- Breadcrumb standard is defined for current demo routes.

Report gap: `Area -> Tower -> Floor` not enforced strongly enough across docs/routes.

### S0-P0-3 - Define Cross-Area Handoff Contract

Area/Tower/Floor: Cross-Area / Operating Contract / Handoff Object

Owner: Domain Architect + Business Analyst
Reviewer: Frontend Engineer + QA Expert
Tie-breaker: Domain Architect

Acceptance:

- Contract includes source Area, target Area, owner, next action, status, evidence, business impact, audit id.
- Contract supports Intelligence -> Demand, Demand -> Customer, Customer -> Ecom/COS, Ecom/COS -> Finance, Finance -> Intelligence.
- Contract includes `sourceOfTruthOwner`, `readModelOwner`, `linkedEntityType`, and `linkedEntityId`.
- Contract is usable by cards, timelines, details, and Intelligence recommendations.
- Mock/API shape is replaceable by real backend contract.

Report gap: no shared handoff object; UI could duplicate metadata.

### S0-P0-4 - Build V1 Demo Route Checklist

Area/Tower/Floor: Cross-Area / QA Evidence / Route Inventory

Owner: QA Expert
Reviewer: Product Manager + Frontend Engineer
Tie-breaker: QA Expert

Acceptance:

- Checklist covers official scenario routes and current trust-breaking routes.
- Each route has owner, screenshot requirement, locale target, mobile target, and QA path.
- Empty/loading/error/permission states are listed where relevant.
- Current 66-route corpus is classified into proof path, regression path, or V1.1 evidence.

Report gap: screenshot QA exists, but not yet tied to official proof story.

## P1

### S0-P1-1 - PRD Gap Mapping By Phase

Area/Tower/Floor: Cross-Area / Product Planning / Alignment Backlog

Owner: Business Analyst
Reviewer: Product Manager
Tie-breaker: Product Manager

Acceptance:

- Every phase story maps to at least one report gap.
- P0/P1/P2 priority reflects demo impact, implementation risk, and dependency order.
- P1 carryover rules are documented.
- V1.1 deferrals include reason and owner.

Report gap: team could close UI debt without closing PRD alignment.

### S0-P1-2 - Mock/API Contract Inventory

Area/Tower/Floor: Cross-Area / Data Contract / Mock/API Inventory

Owner: Data/Mock Contract Engineer
Reviewer: Domain Architect + Frontend Engineer
Tie-breaker: Domain Architect

Acceptance:

- Inventory covers Customer timeline, handoff object, Finance trust profile, Commerce evidence pack, Intelligence recommendation evidence.
- Each mock source has intended real API replacement shape.
- Ecom/COS mock data respects Product Master, OMS, Inventory, Fulfillment/Shipment ownership.
- No new mock source is approved without owner and replacement path.

Report gap: mock data duplication and hardcoded UI business rules.

### S0-P1-3 - Translation Key Ownership List

Area/Tower/Floor: Cross-Area / Localization / EN-VI-JA QA

Owner: QA Expert + UX Architect
Reviewer: Product Manager
Tie-breaker: QA Expert

Acceptance:

- Primary UI labels for official demo routes have EN/VI/JA ownership.
- Finance and risk-sensitive copy are flagged for Risk Reviewer.
- Command palette and Prime AI overlays are included.
- Missing or mixed-language labels are logged by route and priority.

Report gap: VI corpus still contains English first-fold copy; 3-locale SaaS readiness not proven.

## P2

### S0-P2-1 - Role Surface Scope Notes

Area/Tower/Floor: Cross-Area / Ecosystem / Role Mode Discovery

Owner: Product Manager + Business Analyst
Reviewer: Domain Architect + UX Architect
Tie-breaker: Product Manager

Acceptance:

- Factory owner, agency operator, bank reviewer, lead provider, and KOL/KOC agency jobs are summarized.
- Each role has view/action boundary language.
- Reduced scope fallback is defined: factory owner + bank reviewer + one delegated operator view.
- Auth/RBAC, external login, and full portals are explicitly deferred to V1.1.

Report gap: multi-sided ecosystem not visible.

### S0-P2-2 - Release Evidence Template

Area/Tower/Floor: Cross-Area / Release Evidence / Review Pack

Owner: QA Expert + Product Manager
Reviewer: Domain Architect
Tie-breaker: QA Expert

Acceptance:

- Template includes before/after screenshots, route list, PRD gap closure, open defects, V1.1 carryover.
- PM and QA signoff fields are included.
- Finance/risk wording review status is included.
- Template can be reused at each phase gate.

Report gap: release evidence could be inconsistent across phases.

## Phase Traceability

| Phase | Sprint | Report gap | Sprint 0 output |
| --- | ---: | --- | --- |
| Phase 0 | 0 | No locked V1 proof story; risk of random UI fixes | This artifact set |
| Phase 1 | 1 | Empty/detail pages, mixed locale, weak breadcrumbs | P0 route checklist and ownership |
| Phase 2 | 2-3 | Customer Area underbuilt | Customer contracts and backlog stories |
| Phase 3 | 4 | Finance too narrow around loan wizard | Finance trust profile and evidence contracts |
| Phase 4 | 5 | Ecosystem roles not visible | Role surface scope notes |
| Phase 5 | 6 | Intelligence views too similar; weak evidence/feedback | Recommendation/evidence/readback contract |
| Phase 6 | 7-8 | Need release proof and QA pack | Route checklist and release evidence template |
