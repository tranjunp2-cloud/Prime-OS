# Prime OS V1 Alignment Roadmap - Sprint Plan

Ngày lập: 2026-05-08
Nguồn: [Prime OS V1.0 SaaS Alignment Report](../../../research/reports/20260508-primeos-v1-saas-alignment-report.md)
Phạm vi: biến Prime OS Phase 1 từ `operator console đúng hướng` thành `V1 ecosystem proof-ready SaaS`.

## 1. Product Goal

Business goal:

- Chứng minh Prime OS là commerce operational trust infrastructure, không phải dashboard/admin tool.
- Khép kín loop: Intelligence -> Demand -> Customer -> Ecom/COS -> Finance -> Intelligence.
- Nâng alignment từ `50-60% full V1` lên `80%+ V1 demo-ready`.

Primary operator:

- Merchant/operator dùng hằng ngày để điều hành commerce.
- Factory owner/agency/bank/lead/KOL partner cần được nhìn thấy như ecosystem roles, chưa cần full portal.

Stakeholder hierarchy:

| Priority | Stakeholder | V1 outcome proof |
| --- | --- | --- |
| P0 | Merchant/operator | Can decide next action from one closed-loop operating story. |
| P0 | PM/demo reviewer | Can verify Prime OS is infrastructure, not disconnected dashboards. |
| P1 | Factory owner / agency operator | Can see delegated outcome, risk, owner, and next action. |
| P1 | Bank reviewer | Can see commerce evidence behind funding readiness. |
| P2 | Lead provider / KOL/KOC agency | Can see contribution and feedback, not full partner operations. |

Success metrics:

Outcome metrics:

- Closed-loop demo: 1 scenario runs Intelligence -> Demand -> Customer -> Ecom/COS -> Finance -> Intelligence with no narrative gap.
- Operator decision clarity: each demo route answers `what happened`, `what next`, `who owns it`, `what evidence`, `business impact`.
- Trust readiness: Finance metrics map to commerce evidence; no finance metric depends on accounting-only logic.
- Ecosystem proof: P1 partner roles can understand their view/action boundary without full portal/RBAC.
- AI trust: every recommendation cites source, confidence, target action, and human approval boundary.

Quality metrics:

- No empty-looking page in official V1 demo path.
- VI/JA/EN primary UI has no mixed-language first-fold labels.
- Current screenshot corpus recaptures with zero route failure.
- Release evidence includes before/after screenshots, PRD gap mapping, and carryover V1.1 list.

Scope tiers:

| Tier | Must have for V1 demo | Should have for V1.0 | Defer to V1.1 |
| --- | --- | --- | --- |
| Customer | Timeline, lifecycle, RFQ/order/service continuity | Retention signals, follow-up automation | Full marketing automation |
| Finance | Trust profile, evidence pack, funding status | Bank-review summary, reusable docs | Real lender API / underwriting |
| Ecosystem | Role demo surfaces for 5 PRD actors | Permission-aware filtered workspace | Full external partner portals |
| Intelligence | Evidence, confidence, signal lineage | Feedback/outcome loop | Automated optimization engine |
| Ecom/COS | No empty detail routes, audit visible | Policy/SLA depth | Full rule engine |

V1 proof scenario before Sprint 1:

- Before Sprint 1 starts, PM locks one official proof scenario.
- Scenario must include:
  - trigger signal from Intelligence
  - Demand input or lead/RFQ
  - Customer context/timeline
  - Ecom/COS execution state
  - Finance readiness/evidence consequence
  - Intelligence outcome feedback
- Sprint work is prioritized by whether it strengthens this scenario.
- Routes outside this scenario can remain lower fidelity if they do not break V1 review.

Non-goals for this roadmap:

- No real banking integration.
- No production credit decisioning.
- No full partner portal buildout.
- No backend architecture rewrite unless needed to support typed mock/API contracts.
- No ERP accounting scope.

## 2. Sprint Operating Model

Cadence:

- Sprint length: 2 tuần.
- Release checkpoint: cuối mỗi 2 sprint.
- Sprint 0 có thể 3-5 ngày nếu chỉ làm planning/design contracts.
- QA hardening starts in Sprint 1, not only Sprint 7.

Execution controls:

- Sprint goal has one DRI: Product Manager.
- Each story has one delivery DRI: FE/UX/Domain/QA tùy story type.
- Tie-breaker:
  - scope/priority: Product Manager.
  - Area/Tower/Floor boundary: Domain Architect.
  - UI flow/IA: UX Architect.
  - release evidence: QA Expert.
  - risk/compliance copy: Compliance/Risk Reviewer.
- No story enters sprint without owner, acceptance, route, data/mock source, QA path.
- No new scope enters active sprint unless PM removes equal or larger scope.

Standard ceremonies:

- Backlog refinement: trước sprint planning 1-2 ngày, only DoR stories can be committed.
- Sprint planning: lock sprint goal, capacity, DRI, P0/P1/P2 cutline.
- Daily async: blocked age, review age, dependency owner, next escalation.
- Mid-sprint UX/QA review: ngày 4-5, review working routes not static notes.
- Sprint review: demo theo scenario, không demo từng card rời rạc.
- Retro: what slowed flow, what to remove/standardize next sprint.

Definition of Ready:

- User story có business goal, Area/Tower/Floor, owner, acceptance criteria.
- DRI + reviewer + tie-breaker named.
- Data/mock contract rõ, không hardcode business rules trong component nếu có thể đưa vào data layer.
- Copy/i18n key planned cho EN/VI/JA.
- UX state có empty/loading/error/success/permission.
- QA scenario có desktop/mobile + keyboard path.
- Cross-area handoff nếu có phải ghi source, target, next action, audit/evidence.
- Ecom/COS story states bounded context owner: Product Master, OMS, Inventory, Fulfillment/Shipment.

Definition of Done:

- Code merged local branch/main theo workflow team.
- Lint/typecheck/test/build pass, hoặc exception documented.
- 3-locale primary UI checked.
- Playwright screenshot cho affected routes.
- No horizontal overflow mobile.
- No empty production-looking detail pages.
- Accessibility basics: label, focus, contrast, keyboard.
- Review SLA met or exception documented.
- Report/changelog updated nếu thay đổi IA/domain.

Capacity and WIP rules:

- Plan max `2 core epics` per sprint.
- Reserve `20%` capacity for QA/i18n/regression.
- Reserve `10%` capacity for bugfix/unknowns.
- Count interruption load before sprint commitment.
- Active WIP max:
  - FE build: 2 stories per engineer.
  - UX review: 3 items.
  - QA verification: 4 items.
  - Domain review: 3 items.
- Discovery/design for next sprint runs one sprint ahead.
- Any story touching 3+ Areas needs Domain Architect review before build.
- Any Finance copy implying eligibility/approval needs Risk Reviewer signoff.

Blocker and review SLA:

- Blocked > 1 working day: Scrum Master assigns unblock owner and escalation path.
- Blocked > 2 working days: PM decides cut/split/swap.
- PR/review waiting > 1 working day: reviewer must approve, request changes, or delegate.
- QA failed > 1 working day: FE DRI must respond with fix plan or scope tradeoff.
- Dependency unanswered > 2 working days: escalate to PM + Domain Architect.
- P0 defect: stop related new work until owner/date/fix path is clear.

Carryover policy:

- Carryover is not automatic.
- Carryover story must be re-estimated with remaining work, blocker reason, new owner/date.
- If carryover repeats twice, split scope or move to V1.1.
- P0 carryover blocks phase advance.
- P1 carryover allowed only with explicit release impact.
- P2 carryover defaults to V1.1 backlog.

Delivery lanes:

| Lane | Runs when | Owner | Output |
| --- | --- | --- | --- |
| Discovery | 1 sprint ahead | PM + BA + UX | story map, data needs, copy risk |
| Design | 0.5-1 sprint ahead | UX + UI | wireframe/state inventory |
| Domain contract | before build | Domain Architect + BA | source-of-truth, handoff, bounded context |
| Build | current sprint | FE | route/component/data changes |
| Review | continuous | FE + UX + Domain | approved implementation, boundary check |
| QA/i18n | current sprint continuous | QA | tests, screenshots, missing translation report |
| Release evidence | sprint end | PM + QA + Domain | demo acceptance / carryover decision |

## 3. Agent / Role Map

| Role/Agent | Ownership | Active phases |
| --- | --- | --- |
| Product Manager | Scope, priority, sprint goal, acceptance | All |
| Business Analyst | PRD mapping, user stories, workflow rules | Phase 0-4 |
| Domain Architect | Area/Tower/Floor boundaries, source-of-truth, event/handoff model | Phase 0-5 |
| UX Architect | IA, hierarchy, cross-area flow, role workspaces | Phase 1-5 |
| UI Designer | Visual system, responsive behavior, empty states | Phase 1-6 |
| Frontend Engineer | React/Vite/Tailwind implementation | Phase 1-6 |
| Data/Mock Contract Engineer | Mock data, typed contracts, replaceable API shape | Phase 0-5 |
| AI Engineer | Prime AI touchpoints, evidence, confidence, tool boundaries | Phase 4-5 |
| QA Expert | Regression, i18n scan, screenshot QA, acceptance verification | All |
| Scrum Master | Sprint cadence, blocker removal, DoR/DoD discipline | All |
| Compliance/Risk Reviewer | Finance, bank-facing evidence, audit, document handling | Phase 3-4 |

RACI rule:

- PM owns priority.
- Domain Architect owns business boundary.
- UX owns flow clarity.
- FE owns implementation quality.
- QA owns release evidence.
- No phase ships without PM + QA signoff.

Decision ownership hierarchy:

- Business thesis and release cutline: Product Manager.
- Area/Tower/Floor and source-of-truth boundary: Domain Architect.
- Stakeholder workflow and demo story: PM + Business Analyst.
- Flow hierarchy and role visibility: UX Architect.
- Finance/risk wording: Compliance/Risk Reviewer.
- Release evidence and go/no-go: QA Expert.
- Technical feasibility and implementation sequencing: Frontend Engineer + Data/Mock Contract Engineer.

Tie-break rule:

- If a feature improves module depth but weakens closed-loop proof, defer it.
- If a role surface requires real permission/auth work, reduce it to demo boundary copy.
- If Intelligence cannot cite evidence, it cannot be part of the V1 proof claim.

Delivery DRI rule:

- One story = one delivery DRI.
- DRI owns daily status, blocker escalation, review follow-up, QA response.
- Reviewer owns feedback within SLA, not delivery.
- Tie-breaker decision must be written in story comment/changelog when it changes scope or domain boundary.

## 4. Phase Overview

| Phase | Sprint | Goal | Main gap closed |
| --- | --- | --- | --- |
| 0 | Sprint 0 | Alignment contracts | Avoid random UI fixes |
| 1 | Sprint 1 | MVP defensible | Empty pages, i18n, breadcrumbs |
| 2 | Sprint 2-3 | Customer depth | Customer is context layer, not table |
| 3 | Sprint 4 | Finance breadth | Funding + financial trust profile |
| 4 | Sprint 5 | Ecosystem roles | Factory/agency/bank/lead/KOL surfaces |
| 5 | Sprint 6 | Intelligence learning loop | Recommendation evidence/outcome |
| 6 | Sprint 7-8 | Hardening/release | Full QA, screenshot audit, polish |

Phase gate rule:

- A phase does not advance if its P0 acceptance fails.
- P1 can carry forward only with explicit owner/date.
- P2 defaults to V1.1 backlog if it threatens sprint goal.

QA pull-forward rule:

- Every sprint ships its own QA evidence; Phase 6 is consolidation, not first hardening pass.
- Each phase must update screenshot route list, i18n findings, mobile findings, and open defects.
- New route/detail page cannot wait for Sprint 7 to receive empty/error/mobile/a11y checks.
- Sprint 7 only closes residual regression and evidence gaps.

## 5. Phase 0 - Alignment Contracts

Sprint: `Sprint 0`
Duration: 3-5 ngày
Goal: lock product contracts before UI build.

Business outcome:

- Team có một source-of-truth cho V1 alignment.
- Mỗi phase có user stories, boundaries, acceptance.

Scope:

- Create canonical Area -> Tower -> Floor map.
- Define cross-area handoff object.
- Define common card/action metadata:
  - owner
  - next action
  - source area
  - target area
  - evidence
  - business impact
  - status
  - audit id
- Define locale QA target for EN/VI/JA.
- Define demo routes for V1 proof.

Key stories:

- As PM, I want a V1 alignment backlog so each sprint closes a PRD gap, not just UI debt.
- As Domain Architect, I want source-of-truth boundaries per Area so UI does not duplicate rules.
- As QA, I want screenshot route inventory so regression proof is repeatable.

Deliverables:

- `Area/Tower/Floor map`: [01-area-tower-floor-map.md](./sprint-0/01-area-tower-floor-map.md).
- `Cross-area handoff contract`: [02-cross-area-handoff-contract.md](./sprint-0/02-cross-area-handoff-contract.md).
- `V1 demo route checklist`: [03-v1-demo-route-checklist.md](./sprint-0/03-v1-demo-route-checklist.md).
- `Sprint backlog with P0/P1/P2`: [04-sprint-backlog-p0-p1-p2.md](./sprint-0/04-sprint-backlog-p0-p1-p2.md).
- `Mock/API contract inventory`: [05-mock-api-contract-inventory.md](./sprint-0/05-mock-api-contract-inventory.md).
- `Route ownership matrix`: [06-route-ownership-matrix.md](./sprint-0/06-route-ownership-matrix.md).
- `Translation key ownership list`: [07-translation-key-ownership.md](./sprint-0/07-translation-key-ownership.md).
- `Release evidence template`: [08-release-evidence-template.md](./sprint-0/08-release-evidence-template.md).
- `Story traceability matrix`: [09-story-traceability-matrix.md](./sprint-0/09-story-traceability-matrix.md).

Owners:

- Lead: Product Manager.
- Support: Business Analyst, Domain Architect, QA Expert.

Acceptance:

- Every phase story maps to one report gap.
- Every affected route has owner + QA route.
- No implementation starts without DoR.
- Must/Should/Defer cutline approved by PM.
- Any new mock data source has replaceable API shape.

Sprint 0 execution status:

- Status: `Complete`.
- Artifact index: [sprint-0/README.md](./sprint-0/README.md).
- Official proof scenario: `Commerce signal to funding readiness loop`.
- Canonical route source: current app routes in `App.tsx` and `prime-navigation.ts`; older docs are aliases when names differ.
- Sprint 1 gate: any new UI/card/action must use the Sprint 0 handoff, route ownership, mock/API, and i18n ownership contracts.

Risks:

- If skipped, team will patch UI symptoms but not close PRD alignment.

## 6. Phase 1 - Make Current MVP Defensible

Sprint: `Sprint 1`
Goal: remove trust-breaking gaps from current demo.

Business outcome:

- Prime OS can be demoed as credible Phase 1 operator console.

Scope:

- Fix empty/detail pages:
  - `/ecom/cos/policy-rule/sla`
  - `/ecom/cos/oms/:id`
  - `/ecom/cos/returns/:id`
- Clean primary mixed-language UI in current screenshot routes.
- Standardize Area -> Tower -> Floor breadcrumb.
- Reduce Overview/Intelligence duplicate critical narrative.
- Add visible source/target/owner/impact to cross-area handoff cards.

Out of scope:

- No new major Customer/Finance features yet.
- No partner role pages yet.
- No Prime AI behavior expansion beyond copy/placement cleanup.

Key stories:

- As an operator, I can open order/return/SLA detail and see state, owner, next action, audit trail.
- As a Vietnamese/Japanese/English user, I see one coherent language in primary UI.
- As an operator, I understand where I am in Area -> Tower -> Floor from any key screen.
- As a manager, I can identify the top action without repeated red critical signals.

Affected routes:

- `/overview`
- `/ecom/cos/policy-rule/sla`
- `/ecom/cos/oms/:id`
- `/ecom/cos/returns/:id`
- `/intelligence/decision-hub`
- `/finance/fin-support`
- command palette / Prime AI overlays

Owners:

- Lead: Frontend Engineer.
- Product: Product Manager.
- UX: UX Architect + UI Designer.
- QA: QA Expert.
- Domain: Domain Architect for breadcrumbs/handoff metadata.

QA gates:

- Existing tests pass.
- Screenshot before/after for affected routes.
- i18n scan for primary UI.
- Mobile no overflow.
- Empty-state audit passes.
- Ecom/COS bounded-context validation passes:
  - Product Master owns SKU/listing truth.
  - OMS owns order state, routing, SLA.
  - Inventory owns ATS/reservation/stock bucket signals.
  - Fulfillment/Shipment owns pick/pack/ship/tracking/return execution.
  - No route duplicates source-of-truth across these contexts.

Acceptance:

- No empty-looking demo route in V1 path.
- Red critical signals <= 2 per first fold where possible.
- Breadcrumb pattern consistent.
- VI/JA/EN primary labels localized.
- Current 66-route screenshot corpus can be recaptured with zero route failures.
- Demo route has clear owner/next action/evidence where relevant.

## 7. Phase 2 - Strengthen Customer Area

Sprint: `Sprint 2-3`
Goal: Customer becomes relationship/context layer.

Business outcome:

- Customer Area preserves context between Demand, Ecom/COS, Service, Finance.
- Product no longer reads like CRM table only.

Scope Sprint 2:

- Add Customer Timeline floor.
- Show unified history:
  - lead/RFQ
  - inquiry
  - order
  - service case
  - return/refund
  - finance signal
- Add follow-up queue.
- Add lifecycle stage with owner and next action.

Sprint 2 cutline:

- Must: Timeline + follow-up queue + lifecycle owner.
- Should: event filters.
- Defer: advanced retention automation.

Scope Sprint 3:

- Add RFQ/quote continuity preview.
- Add retention/repeat purchase signals.
- Add service ownership/SLA panel.
- Add cross-area handoff:
  - Demand lead -> Customer account
  - Customer account -> Ecom order
  - Service issue -> Intelligence signal

Sprint 3 cutline:

- Must: RFQ/quote/order/service continuity visible.
- Should: retention/repeat purchase signal card.
- Defer: full quote editor or service automation engine.

Key stories:

- As sales/operator, I see one timeline for account activity before making next contact.
- As service operator, I know current case owner, SLA, pending action.
- As agency operator, I can explain buyer context and quote continuity to factory owner.
- As Intelligence, I can read Customer outcomes as feedback signals.

Affected routes:

- `/customer/crm-compact?floor=overview`
- `/customer/crm-compact?floor=account`
- `/customer/crm-compact?floor=contact`
- `/customer/crm-compact?floor=tags`
- `/customer/service`
- customer dialogs

Owners:

- Lead: UX Architect for information architecture.
- FE: Frontend Engineer.
- Domain: Business Analyst + Domain Architect.
- QA: QA Expert.

Data contracts:

- `CustomerTimelineEvent`.
- `CustomerLifecycleStage`.
- `CustomerFollowUp`.
- `CustomerRFQQuoteLink`.
- `CustomerServiceCase`.

QA gates:

- Timeline event order stable.
- Empty timeline useful.
- Search/filter does not break.
- Create/edit account dialogs preserve tag/contact behavior.
- Keyboard path for account edit + add contact.

Acceptance:

- Customer default view answers: who is this customer, what happened, what next, who owns it, why it matters.
- At least 3 cross-area timeline event types visible.
- Service page no longer reads as preview-only.
- Customer no longer depends on table view as primary mental model.
- No duplicate customer truth between profile, service, and dialogs.

Risks:

- Overloading CRM page. Mitigation: progressive disclosure + tabs/floors.
- Mock data duplication. Mitigation: typed shared mock contract.

Phase 2 execution status:

- Status: `P0/Must implemented; Should items partially implemented or carried forward`
- Evidence: [phase-2/README.md](./phase-2/README.md)
- Implemented route proof:
  - `/customer/crm-compact?floor=overview` now starts from relationship context, lifecycle owner, next action, unified timeline, follow-up queue, and continuity preview.
  - `/customer/crm-compact?floor=account` keeps account/contact/tag editing while the profile dialog shows typed timeline, follow-up, RFQ/quote/order, and service/SLA context.
  - `/customer/service` now shows service case owner, SLA state, pending action, related customer/order context, and Service -> Intelligence handoff.
- Implemented contracts:
  - `CustomerTimelineEvent`
  - `CustomerLifecycleStage`
  - `CustomerFollowUp`
  - `CustomerRFQQuoteLink`
  - `CustomerServiceCase`
- Boundary locked: Customer composes relationship read models but does not own Demand RFQ truth, OMS order lifecycle, return execution, Finance eligibility, or Intelligence signal truth.
- Validation:
  - `npm run test -- src/lib/prime/customer-profile-floor.test.ts src/lib/prime/prime-navigation.test.ts`
  - `npm run lint`
  - `npm run build:dev`
  - `npm run test:ui -- tests/prime-route-shell.spec.ts --grep "Customer Profile|customer|Service"`

## 8. Phase 3 - Broaden Finance Beyond Fin Support

Sprint: `Sprint 4`
Goal: Finance = financial enablement layer, not only loan wizard.

Business outcome:

- Merchant sees why operations create financial trust.
- Bank partner can understand evidence behind readiness.

Scope:

- Keep `/finance/fin-support` as gateway.
- Add `Financial Trust Profile` section:
  - commerce activity score
  - settlement consistency
  - receivables/payout snapshot
  - refund ratio
  - inventory stability
  - repeat customer signal
- Add `Commerce Evidence Pack`:
  - orders
  - settlements
  - invoices
  - logistics/export records
  - marketplace health
- Add bank-facing summary preview.
- Reduce wizard + Prime AI overlay load:
  - primary workflow first
  - AI as sidecar/collapsed assistant

Sprint cutline:

- Must: Financial Trust Profile + Evidence Pack + bank summary preview.
- Should: receivables/payout snapshot.
- Defer: real lender API, real document verification, real credit scoring.

Key stories:

- As merchant, I understand funding readiness from my operations, not accounting KPIs.
- As bank reviewer, I see evidence and blockers in one summary.
- As operator, I upload once and reuse documents across lenders.
- As Prime AI, I explain blockers without replacing the application flow.

Affected routes:

- `/finance/fin-support`
- `#funding-application-flow`
- `#lenders`
- `#documents`
- `#status`
- loan wizard steps
- finance Prime AI popup

Owners:

- Lead: Product Manager + Compliance/Risk Reviewer.
- Domain: Domain Architect.
- UX: UX Architect.
- FE: Frontend Engineer.
- QA: QA Expert.

Data contracts:

- `FinancialTrustProfile`.
- `SettlementSignal`.
- `ReceivableSnapshot`.
- `CommerceEvidencePack`.
- `BankReviewSummary`.
- `FundingApplicationStatus`.

QA gates:

- Document statuses clear: missing/uploaded/verified/rejected/reusable.
- AI panel not blocking wizard completion.
- Finance UI does not look like accounting dashboard.
- i18n check high priority for loan/funding copy.

Acceptance:

- Fin Support first fold shows readiness + range + blockers + primary CTA.
- Financial profile proves commerce-to-finance bridge.
- Bank-facing evidence summary visible.
- Copy does not imply guaranteed approval/disbursement.
- Every finance metric maps back to commerce evidence, not accounting-only KPI.

Risks:

- Accidentally becoming ERP finance. Mitigation: every metric ties to funding readiness/evidence.
- Compliance ambiguity. Mitigation: disclaimers + no real credit decision claims in mock.

Phase 3 execution status:

- Status: `P0/Must implemented; Should receivables/payout snapshot implemented as readiness evidence`
- Evidence: [phase-3/README.md](./phase-3/README.md)
- Implemented route proof:
  - `/finance/fin-support` now starts from a funding review package, not a loan approval story.
  - Financial Trust Profile shows commerce activity score, settlement consistency, receivables/payout snapshot, refund ratio, inventory stability, and repeat customer signal.
  - Commerce Evidence Pack maps orders, settlements, invoices/RFQ receivables, logistics/export records, and marketplace health to source owners.
  - Bank-review summary preview shows readiness, indicative range, evidence coverage, document state, blocker, next action, and no-approval guardrail.
- Implemented contracts:
  - `FinancialTrustProfile`
  - `SettlementSignal`
  - `ReceivableSnapshot`
  - `CommerceEvidencePack`
  - `BankReviewSummary`
  - `FundingApplicationStatus`
- Boundary locked: Finance composes readiness/evidence for review but does not own OMS order truth, Demand RFQ truth, Customer repeat behavior, Inventory risk, Fulfillment/Shipment proof, lender underwriting, credit decision, contract, or disbursement.
- Validation:
  - `npm run test -- src/lib/prime/finance-trust-profile.test.ts`
  - `npm run test:ui -- tests/prime-route-shell.spec.ts --grep "Finance trust profile"`
  - `npm run lint`
  - `npm run build:dev`

## 9. Phase 4 - Prove Multi-Sided Ecosystem

Sprint: `Sprint 5`
Goal: show Prime OS is ecosystem OS, not internal merchant admin only.

Business outcome:

- Stakeholders can see how factory, agency, bank, lead provider, KOL/KOC agency fit.

Scope:

- Add role/workspace mode concept, initially demo-level:
  - factory owner
  - agency operator
  - bank reviewer
  - lead provider
  - creator/KOL agency
- Add role-specific landing panels or filtered views.
- Add permission/visibility copy:
  - what this role can view
  - what this role can act on
  - what requires approval
- Add partner handoff cards.

Sprint cutline:

- Must: 5 lightweight role surfaces proving PRD actors.
- Should: role-specific allowed action labels.
- Defer: auth/RBAC implementation, external login, full partner portals.

Scope reduction rule if capacity is tight:

- Keep bank reviewer and factory owner surfaces first because they prove finance trust + ecosystem value.
- Keep agency operator only if Customer/Ecom continuity is already visible.
- Reduce lead provider and KOL/KOC agency to contribution cards inside Demand/Intelligence.
- Do not create 5 weak role pages if 2-3 strong role surfaces prove the closed-loop thesis better.

Reduced Phase 4 acceptance:

- Minimum: factory owner + bank reviewer + one agency/delegated operator view.
- Each retained role must show job, evidence, next action, boundary.
- Deferred roles are listed in V1.1 with reason and owner.

Key stories:

- As factory owner, I see sales output, operational risk, finance readiness.
- As agency operator, I see delegated tasks and reportable outcomes.
- As bank partner, I see eligible business profiles and evidence.
- As lead provider, I see lead quality and conversion feedback.
- As KOL/KOC agency, I see creator traffic tied to leads/orders.

Affected routes:

- `/overview?role=factory`
- `/overview?role=agency`
- `/finance/fin-support?role=bank`
- `/demand/leads-rfqs?role=lead-provider`
- `/intelligence/signals?view=creators&role=creator-agency`

Owners:

- Lead: Product Manager.
- Domain: Business Analyst + Domain Architect.
- UX: UX Architect.
- FE: Frontend Engineer.
- QA: QA Expert.
- Security/Risk: permission language review.

Data contracts:

- `PrimeRole`.
- `RoleCapability`.
- `PartnerWorkspaceSummary`.
- `PartnerHandoff`.

QA gates:

- Role mode does not expose irrelevant primary actions.
- Role-specific labels localized.
- No fake permission claims beyond mock/demo.

Acceptance:

- At least 5 PRD user stories have visible product surface.
- Each role has top job, evidence, next action.
- Demo can explain Prime OS as ecosystem layer.
- Each role surface states view/action boundary.
- Bank and partner roles are clearly review/assist surfaces, not full operational ownership.

Risks:

- Too much scope. Mitigation: role-aware demo views first, not full portals.

Phase 4 execution status:

- Status: `P0/Must implemented with 5 lightweight role surfaces`
- Evidence: [phase-4/README.md](./phase-4/README.md)
- Implemented route proof:
  - `/overview?role=factory` shows factory owner job, evidence, next action, and source-truth boundary.
  - `/overview?role=agency` shows delegated agency operator queue boundary and reportable handoffs.
  - `/finance/fin-support?role=bank` shows bank reviewer evidence-preview boundary without credit-decision claims.
  - `/demand/leads-rfqs?role=lead-provider` shows lead-provider contribution feedback without private record access.
  - `/intelligence/signals?view=creators&role=creator-agency` shows creator/KOL agency proof surface without SKU/order/finance control.
- Implemented contracts:
  - `PrimeRole`
  - `RoleCapability`
  - `PartnerWorkspaceSummary`
  - `PartnerHandoff`
- Boundary locked: role mode is demo read/assist composition, not RBAC, external login, partner portal, or production write permission.
- Validation:
  - `npm run test -- src/lib/prime/finance-trust-profile.test.ts src/lib/prime/customer-profile-floor.test.ts src/lib/prime/prime-navigation.test.ts`
  - `npm run test:ui -- tests/prime-route-shell.spec.ts --grep "Phase 4 partner workspaces"`
  - `npm run lint`
  - `npm run build:dev`

## 10. Phase 5 - Harden Intelligence As Learning Loop

Sprint: `Sprint 6`
Goal: Intelligence becomes learning loop, not repeated dashboard.

Business outcome:

- Users trust recommendations because source, confidence, and outcome are visible.

Scope:

- Differentiate Decision Hub modes:
  - Command: what to do now.
  - Investigate: why/evidence/dependencies.
  - Audit: timeline/source/proof.
- Differentiate Signals capabilities:
  - creators
  - customer trends
  - attribution
  - forecasting
  - VOC
- Add signal lineage and evidence source.
- Add recommendation feedback:
  - accepted
  - ignored
  - rejected
  - outcome observed
- Add action outcome loop into Overview/Area pages.

Sprint cutline:

- Must: evidence/source/confidence on recommendations used in the proof scenario.
- Must: at least 1 closed-loop outcome feeds back into Intelligence.
- Should: feedback states for accepted/ignored/rejected.
- Should: Decision Hub mode differentiation only where it helps the proof scenario.
- Defer: full Signals capability split, real ML learning, automated action optimization.

Key stories:

- As operator, I know why Prime OS recommends an action.
- As PM/manager, I can audit source and confidence.
- As system, accepted/rejected outcomes become future signals.

Affected routes:

- `/intelligence/decision-hub`
- `/intelligence/decision-hub?view=operator`
- `/intelligence/decision-hub?view=alerts`
- `/intelligence/decision-hub?capability=analytics`
- `/intelligence/signals`
- `/intelligence/signals?view=creators`
- `/intelligence/signals?view=customer-trends`
- `/intelligence/signals?capability=attribution`
- `/intelligence/signals?capability=forecasting`
- `/intelligence/signals?capability=voc`
- `/intelligence/launch-decisions`

Owners:

- Lead: AI Engineer + UX Architect.
- Product: Product Manager.
- Domain: Domain Architect.
- FE: Frontend Engineer.
- QA: QA Expert.

Data contracts:

- `IntelligenceSignal`.
- `SignalLineage`.
- `RecommendationEvidence`.
- `RecommendationFeedback`.
- `ActionOutcome`.

QA gates:

- Each view has unique job-to-be-done.
- No duplicate content-only variants.
- Evidence/source visible.
- Feedback state persists in mock/session if supported.

Acceptance:

- Every proof-scenario recommendation has why, source, confidence, target action.
- At least 1 action outcome feeds back into Intelligence in the release demo.
- Prime AI cannot appear as source of truth; it must cite system evidence.
- Decision Hub and Signals have distinct jobs where included in V1 proof.
- Any Intelligence surface outside the proof scenario can be tagged V1.1 if not release-critical.

Risks:

- AI trust inflation. Mitigation: confidence + evidence + human approval language.

Phase 5 execution status:

- Status: `P0/Must implemented with evidence, lineage, feedback, and outcome readback`
- Evidence: [phase-5/README.md](./phase-5/README.md)
- Implemented route proof:
  - `/intelligence/decision-hub` shows recommendation evidence, source owner, confidence reason, guardrails, rejected alternatives, feedback, and outcome readback.
  - `/intelligence/signals` shows signal lineage from source to linked entity to decision route.
  - `/intelligence/launch-decisions` shows outcome feedback with Demand execution ownership, OMS order truth, and Intelligence readback.
- Implemented contracts:
  - `IntelligenceSignal`
  - `SignalLineage`
  - `RecommendationEvidence`
  - `RecommendationFeedback`
  - `ActionOutcome`
- Boundary locked: Intelligence reads and recommends; Demand/COS/Customer/Finance own execution/source truth; Prime AI/model output is explanation/generation metadata only.
- Validation:
  - `npm run test -- src/lib/prime/intelligence-workspace.test.ts`
  - `npm run test:ui -- tests/prime-route-shell.spec.ts --grep "Phase 5 Intelligence"`
  - `npm run lint`
  - `npm run build:dev`

## 11. Phase 6 - Release Hardening And QA

Sprint: `Sprint 7-8`
Goal: ship V1 alignment demo-ready release.

Business outcome:

- Prime OS can be reviewed against PRD with evidence, screenshots, and repeatable QA.

Scope Sprint 7:

- Full route screenshot recapture.
- Full i18n scan for EN/VI/JA.
- Responsive pass desktop/tablet/mobile.
- A11y pass on primary workflows.
- Fix priority regressions.

Sprint 7 cutline:

- Must: route screenshot pack + i18n + responsive + no fatal console errors.
- Should: a11y checklist.
- Defer: cosmetic polish not affecting comprehension/trust.

Scope Sprint 8:

- End-to-end demo story:
  - Intelligence detects opportunity/risk.
  - Demand creates input.
  - Customer preserves context.
  - Ecom executes.
  - Finance unlocks capital readiness.
  - Intelligence reads outcome.
- Final report update.
- Release notes.
- Backlog for V1.1.

Sprint 8 cutline:

- Must: end-to-end demo story + updated report + release evidence.
- Should: stakeholder-ready walkthrough notes.
- Defer: non-critical UI polish.

Owners:

- Lead: QA Expert + Scrum Master.
- Product: Product Manager.
- FE: Frontend Engineer.
- UX: UI Designer.
- Domain: Domain Architect.

QA gates:

- `npm test` / available test suite.
- `npm run build`.
- Playwright screenshot route pack.
- i18n missing-key scan.
- Visual review of all contact sheets.

Execution status (2026-05-09):

- Completed Phase 6 release hardening evidence in `phase-6/README.md`.
- Expanded a11y and responsive QA to official proof routes plus OMS/Return detail journeys.
- Fixed overview operator mode a11y semantics and destructive contrast on OMS detail.
- Updated dark-mode regression to current shell/search/account behavior.
- Corrected route ownership matrix: partner role surfaces are hosted by owning Areas, not a new Ecosystem Area.
- Validation passed: unit 93/93, route shell 58/58, a11y 18/18, responsive 70/70, visual/dark 5/5, lint 0 errors, dev build, production build with dummy Supabase env.
- Keyboard navigation smoke test.
- No console fatal errors on core routes.

Acceptance:

- Screenshot corpus updated.
- Alignment report updated with before/after.
- Remaining gaps classified V1.1, not unknown.
- PM signs demo script.
- QA signs release evidence.
- Release can be explained in one closed-loop narrative, not separate module demos.

## 12. Sprint Backlog Summary

| Sprint | Sprint goal | Primary owner | Output | Go/no-go |
| --- | --- | --- | --- | --- |
| 0 | Contracts and backlog | PM + Domain Architect | Area map, handoff contract, route checklist | backlog DoR >= 80% |
| 1 | MVP defensible | FE + QA | Empty pages fixed, i18n priority cleanup, breadcrumb standard | 66-route smoke no fatal failure |
| 2 | Customer timeline | UX + FE | Timeline, follow-up, lifecycle shell | Customer answers who/what/next/owner |
| 3 | Customer continuity | Domain + FE | RFQ/quote/service/retention continuity | 3+ cross-area customer events |
| 4 | Finance trust profile | PM + Risk + FE | Trust profile, evidence pack, bank summary | every metric has commerce evidence |
| 5 | Ecosystem role proof | PM + UX + FE | 5 role demo surfaces | 5 PRD actors visible |
| 6 | Intelligence learning loop | AI + UX + FE | Signal lineage, evidence, feedback | recommendation has why/source/confidence |
| 7 | QA hardening | QA + FE | Full screenshot/i18n/responsive/a11y pass | no P0/P1 regression open |
| 7 status | QA hardening completed 2026-05-09 | QA + FE | Phase 7 release screenshot pack, manifest, no-fatal-console gate | 36 screenshots captured; no P0/P1 open |
| 8 | Release proof | PM + QA | Demo story, updated report, V1.1 backlog | PM + QA signoff |
| 8 status | Release proof completed 2026-05-09 | PM + QA | Phase 8 release proof, signoff matrix, V1.1 backlog | ready for PM/QA signoff |

Flow metrics:

| Metric | Target | Owner | Review cadence |
| --- | --- | --- | --- |
| DoR coverage | >= 80% before planning | PM + BA | each planning |
| Sprint carryover | <= 20% committed work | Scrum Master | each review |
| Blocked age | no P0/P1 > 2 working days | Scrum Master | daily async |
| Review age | no review > 1 working day | FE Lead/UX/Domain | daily async |
| QA fail response | <= 1 working day | FE DRI | daily async |
| Cycle time | trend down or stable | Scrum Master | retro |
| Screenshot route failures | 0 on V1 path | QA Expert | each sprint |
| Ecom/COS boundary defects | 0 P0/P1 | Domain Architect | each phase gate |

## 13. Dependency Map

Hard dependencies:

- Phase 0 before all.
- Phase 1 before final screenshots.
- Customer timeline before role-based agency/factory story.
- Finance trust profile before bank reviewer story.
- Intelligence evidence before closed-loop release demo.

Parallelizable work:

- i18n cleanup can run with empty-page fixes.
- Customer timeline design can start during Phase 1.
- Finance data contract can start during Customer Phase.
- Ecosystem role research can start during Finance Phase.
- QA route script can evolve every sprint.

Blocked-by risks:

- Unclear mock data ownership.
- Route-level duplication.
- Translation dictionary sprawl.
- No typed handoff contract.
- Partner role scope expanding into full portal too early.

Dependency escalation:

- Dependency must name provider, consumer, needed output, due date, fallback.
- If due date slips by 1 working day, Scrum Master escalates to provider DRI.
- If due date slips by 2 working days, PM chooses cut/split/mock/fallback.
- Cross-Area dependency needs Domain Architect signoff before workaround.
- Ecom/COS workaround cannot move OMS/Inventory/Fulfillment/Product Master rules into UI-only logic.

Critical path:

1. Phase 0 contracts.
2. Phase 1 demo trust cleanup.
3. Customer continuity.
4. Finance trust profile.
5. Role proof.
6. Intelligence evidence loop.
7. QA/release evidence.

If any critical-path item slips:

- Do not add new role surfaces.
- Defer P2 visual polish.
- Keep release narrative anchored on completed closed-loop proof.

## 14. Standard Story Template

Use this for every story:

```md
As a [role],
I want [capability],
so that [business outcome].

Area/Tower/Floor:
Source of truth:
Inputs:
Outputs:
Cross-area handoff:
DRI:
Reviewer:
Tie-breaker:
Dependency:
Blocked SLA:
Review SLA:
Carryover rule:
Ecom/COS bounded context:
- Product Master / OMS / Inventory / Fulfillment-Shipment / N/A
Primary route:
States:
- empty
- loading
- ready
- error
- permission/disabled

Acceptance:
- ...

QA:
- desktop
- mobile
- keyboard
- i18n EN/VI/JA
- screenshot
```

## 15. Release Decision

Ship V1 alignment demo only when:

- One official closed-loop proof scenario is complete.
- Phase 1 removes trust-breaking demo gaps.
- Customer shows context continuity for the proof scenario.
- Finance shows commerce-backed trust/readiness for the proof scenario.
- Ecosystem role proof supports the scenario without pretending full portal/RBAC exists.
- Intelligence cites evidence/confidence and reads at least one outcome back.
- Phase 6 QA corpus passes for official demo routes.
- No P0/P1 blocker older than SLA.
- Carryover is classified by release impact.
- Flow metrics reviewed for last 2 sprints.
- Ecom/COS routes pass bounded-context validation.

If schedule is tight:

- Must ship: Phase 1 + proof-scenario Customer continuity + Finance trust profile + Intelligence evidence/outcome.
- Should ship: reduced Phase 4 role proof for factory owner + bank reviewer + agency/delegated operator.
- Can defer: remaining role surfaces, full partner portals, real lender API, real underwriting, advanced automation, full Signals split.

Minimum viable release cutline:

- `Release A - Defensible Operator OS`: Phase 1 + Customer context for current operator demo.
- `Release B - Closed-Loop V1 Demo`: Release A + Finance trust profile + Intelligence evidence/outcome + reduced role proof.
- `Release C - V1 Review Ready`: Release B + full Phase 4/5 scope + updated report and screenshot pack.

## 16. Decision Log

| Decision | Owner | Needed by | Default recommendation | Status |
| --- | --- | --- | --- | --- |
| Official V1 proof scenario | PM | Before Sprint 1 planning | `Commerce signal to funding readiness loop` locked in Sprint 0 artifacts. | Decided |
| Role mode implementation | PM + Domain Architect | Phase 4 discovery | URL query/demo mode first; defer profile permission model. | Open |
| Customer Timeline placement | PM + UX Architect | Sprint 2 planning | Make Timeline the default Customer overview floor. | Open |
| Finance Trust Profile placement | PM + Risk Reviewer | Sprint 4 planning | Keep inside Fin Support for V1; consider sibling section in V1.1. | Open |
| Official PRD screenshot evidence | PM + QA Expert | Sprint 0 close | Use proof-route evidence list in [03-v1-demo-route-checklist.md](./sprint-0/03-v1-demo-route-checklist.md). | Decided |
| Japanese bank/SME compliance wording | Risk Reviewer | Sprint 4 planning | Use mock/readiness language only; no approval, eligibility, or disbursement claim. | Decided |

Decision log rule:

- No open question can remain as a release blocker.
- Each open question must become `decided`, `deferred to V1.1`, or `blocked with owner/date`.
- Any decision changing release cutline must update Sprint Backlog Summary and Release Decision.
