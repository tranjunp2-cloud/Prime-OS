---
title: "Intelligence Agent Workspace Rebuild"
description: "Rebuild Prime OS Intelligence from dashboard-first pages into a compact agent workspace that produces reviewed Demand handoff packages."
status: in_progress
priority: P1
effort: 24h
branch: main
tags: [prime-os, intelligence, agent-workspace, demand-handoff, ux]
created: 2026-05-06
---

# Intelligence Agent Workspace Rebuild Plan

## 1. Executive Summary

Prime OS Intelligence Area should not be rebuilt as another analytics/dashboard surface. Based on the Prime OS V1.0 document and prior research reports, Intelligence is the decision-support layer: it helps operators understand what is happening, explain why it is happening, predict what may happen next, and act more intelligently across Demand, Customer, Ecom/COS, and Finance.

The current dashboard mental model is weak because it mainly shows information. The stronger model is a compact mini workspace where agents do work, report findings, expose evidence, prepare structured Decision Packages, and hand those packages to Demand for execution.

The rebuild should center on this loop:

```text
Signal Intake → Agent Investigation → Evidence Report → Decision Package → Operator Review → Demand Handoff → Outcome Readback → Intelligence Learning
```

The goal is not to make Intelligence execute Demand actions. Intelligence prepares high-quality decisions. Demand owns growth execution.

## 2. Project Context

### Project

- Product: Prime OS
- Area: Intelligence
- Adjacent Area: Demand
- Current routes involved:
  - `/intelligence/decision-hub`
  - `/intelligence/signals`
  - `/intelligence/launch-decisions`
  - `/demand/campaigns`
  - `/demand/sources`
  - `/demand/leads-rfqs`

### Business Goal

Help sellers, agency operators, and internal operators move from raw signals into executable Demand actions faster, with traceable evidence and clear ownership.

### Stakeholders

- Seller / factory operator: needs clear growth direction.
- Agency operator: needs reportable, explainable next moves.
- Campaign operator: needs Demand-ready payloads.
- Ecom/COS operator: needs guardrails visible before demand scales.
- Finance partner later: benefits from traceable business evidence.

## 3. Source Insights

### PDF-Derived Product Thesis

From Prime OS V1.0:

- Prime OS connects Demand, Customer, Ecom, Finance, and Intelligence into one closed loop.
- Demand Area creates growth input: channels, campaigns, content/social, leads, RFQs, re-engagement.
- Intelligence Area is the decision-support layer.
- Intelligence should not be framed as isolated technical tools.
- Intelligence should help Prime OS learn from business operations and improve them.
- User story starts from Intelligence to understand market demand, buyer persona, product opportunity, and message effectiveness, then uses Demand to run KOL, affiliate, social, and campaign acquisition.

### Prior Agent Reports

Research analyst conclusion:

- Dashboard framing likely weak.
- Better concept: Intelligence Mini Workspace.
- Intelligence owns insight, diagnosis, recommendation, prediction, scoring, and decision packet.
- Demand owns campaign plan, channel ops, content execution, lead/RFQ capture, acquisition state.

UX researcher conclusion:

- Wrong mental model: dashboard implies KPI monitoring; user needs agent workroom.
- Weak task flow: Signals/analytics/forecasting/VOC feel like panels, not decision flow.
- Low trust: agent output needs proof chain.
- Handoff ambiguity: Demand needs actionable payload, not report text.

### Lazyweb Pattern References

Lazyweb references used as design inspiration:

- Glean Agent Library / Agent Orchestration: agent discovery, multi-agent coordination, routing work to expert agents.
- Slack Work Orchestration: conversational + workflow automation, cross-app agent coordination.
- Rippling workflow builder: modular workflow blocks, clear action path.
- Asana workflow automation: status, ownership, rules, templates, execution pipeline.
- Intercom AI agent setup: onboarding cards + AI work state + performance proof.

Extracted product patterns:

- Prefer task/work queues over static dashboards.
- Show agent state clearly: running, needs review, ready, blocked.
- Pair every AI output with evidence, confidence, and next action.
- Keep handoff visible and explicit.
- Use compact rows and side panels for dense operator work.

## 4. Core Product Decision

### Do Not Build

Do not build Intelligence as a KPI dashboard with many cards and charts.

Problems:

- Operators still need to interpret what to do.
- Dashboards answer “what exists”, not “what should happen next”.
- Agents become hidden behind charts.
- Demand receives weak, unstructured insight.
- Feedback loop becomes unclear.

### Build Instead

Build Intelligence as a Compact Agent Workspace.

Workspace responsibilities:

- Ingest signals.
- Let agents investigate.
- Produce reports.
- Structure recommendations.
- Ask operator to approve/clarify.
- Send Demand-ready packages.
- Read back outcomes.

## 5. Domain Boundaries

### Intelligence Owns

- Signal normalization.
- Agent run orchestration.
- Evidence gathering.
- Finding synthesis.
- Confidence scoring.
- Opportunity/risk ranking.
- Decision Package creation.
- Handoff recommendation.
- Learning from Demand outcomes.

### Demand Owns

- Campaign execution.
- Content/social/KOL operations.
- Lead/RFQ capture.
- Retargeting/re-engagement.
- Campaign state.
- Channel budget.
- Owner assignment for acquisition work.

### Ecom/COS Owns

- Product truth.
- Inventory truth.
- Order state.
- Fulfillment state.
- Stock guardrails.
- SLA and operational constraints.

### Customer Owns

- Buyer profile.
- Lifecycle.
- Follow-up history.
- CRM memory.
- Support/service context.

### Boundary Rule

Intelligence may prepare and recommend. It must not silently mutate Demand campaigns or execute external actions. Any write to Demand must go through an explicit reviewed handoff or command gateway.

## 6. Target UX Mental Model

### Old Mental Model

```text
User opens dashboard → reads charts → interprets → decides manually → goes to Demand
```

### New Mental Model

```text
User opens workspace → sees agent work queue → reviews decision package → checks evidence → approves handoff → Demand receives executable payload
```

### UX Promise

The operator should answer in less than 30 seconds:

- What did agents find?
- Why should I trust it?
- What should Demand do next?
- Who owns it?
- What could block it?
- Has Demand accepted it?

## 7. Proposed Information Architecture

### Primary Intelligence Navigation

Recommended main tabs:

1. `Workspace`
   - Default page.
   - Agent runs + Decision Queue + evidence detail + handoff actions.

2. `Signals`
   - Signal intake registry.
   - Source freshness, entity links, strength, guardrails.

3. `Decision Packages`
   - Demand-ready package queue.
   - Review, sent, accepted, rejected, learned states.

4. `Readback`
   - Demand outcomes returned to Intelligence.
   - Campaign created, leads/RFQs/orders, rejection reason, learning.

### Secondary / Lens Tabs

These should be filters/lenses, not primary dashboard destinations:

- Creators
- Customers
- VOC
- Attribution
- Forecasting
- Alerts
- AI Operator

They can appear as agent lenses inside Workspace.

## 8. Workspace Layout

### Desktop Layout

```text
┌────────────────────────────────────────────────────────────────────┐
│ Compact Header: Ready packages | Running agents | Blocked | Learned │
├───────────────┬───────────────────────────────────────┬────────────┤
│ Left Rail     │ Center Queue                          │ Right Panel │
│ Agent Runs    │ Decision / Result Rows                │ Evidence    │
│ - Running     │ - finding                             │ - sources   │
│ - Review      │ - confidence                          │ - why       │
│ - Ready       │ - impact                              │ - risks     │
│ - Blocked     │ - next tower                          │ - payload   │
├───────────────┴───────────────────────────────────────┴────────────┤
│ Sticky Action Rail: Approve | Ask Agent | Send to Demand | Suppress │
└────────────────────────────────────────────────────────────────────┘
```

### Mobile / Narrow Layout

- Header summary remains compact.
- Agent runs become horizontal status chips.
- Decision Queue becomes stacked cards.
- Evidence Panel becomes drawer/sheet.
- Action Rail becomes sticky bottom bar.

## 9. Agent Workflow

### Step 1 — Signal Intake

Input sources:

- Social stream.
- Creator signal.
- VOC/customer feedback.
- Campaign performance.
- Product/SKU context.
- Inventory forecast.
- Orders and revenue readback.
- Finance/risk signals.

Output object: `SignalCard`.

Required fields:

```ts
type SignalCard = {
  id: string;
  title: string;
  source: string;
  sourceType: 'market' | 'creator' | 'voc' | 'campaign' | 'customer' | 'cos' | 'finance';
  linkedEntityType: 'sku' | 'campaign' | 'customer' | 'rfq' | 'creator' | 'order' | 'segment';
  linkedEntityId: string;
  summary: string;
  strength: number;
  freshness: string;
  riskLevel: 'low' | 'medium' | 'high';
  receivedAt: string;
};
```

### Step 2 — Agent Investigation

Agent lanes for MVP:

1. `Market Scout`
   - Finds opportunity signals.
   - Compares demand patterns.
   - Produces opportunity thesis.

2. `Persona Analyst`
   - Identifies buyer segment.
   - Explains buyer motivation.
   - Links to Customer/Demand context.

3. `Message Strategist`
   - Suggests message angle.
   - Drafts campaign brief seed.
   - Identifies offer/CTA.

4. `Launch Risk Analyst`
   - Checks COS/inventory/finance/customer guardrails.
   - Blocks or warns before Demand handoff.

### Step 3 — Evidence Report

Every report must answer:

- What happened?
- Why does it matter?
- Why should operator trust it?
- What should Demand do?
- What could go wrong?

Output object: `AgentEvidenceReport`.

```ts
type AgentEvidenceReport = {
  id: string;
  agentId: string;
  agentName: string;
  finding: string;
  hypothesis: string;
  confidence: number;
  evidence: Array<{
    label: string;
    source: string;
    freshness: string;
    value: string;
    linkedEntityId?: string;
  }>;
  rejectedAlternatives: Array<{
    option: string;
    reason: string;
  }>;
  risks: Array<{
    label: string;
    severity: 'low' | 'medium' | 'high';
    mitigation: string;
  }>;
  createdAt: string;
};
```

### Step 4 — Decision Package

Decision Package is the key product object.

```ts
type DecisionPackage = {
  id: string;
  title: string;
  status: 'draft' | 'review_needed' | 'ready_for_demand' | 'sent' | 'accepted' | 'rejected' | 'outcome_learned';
  finding: string;
  recommendedDemandAction: 'campaign' | 'content' | 'creator' | 'lead_response' | 'retargeting' | 'suppress' | 'request_more_data';
  confidence: number;
  expectedImpact: {
    label: string;
    value: string;
    rationale: string;
  };
  handoffPayload: {
    objective: string;
    audience: string;
    productRoute?: string;
    offer?: string;
    messageAngle?: string;
    channel?: string;
    cta?: string;
    ownerRecommendation: string;
    guardrails: string[];
  };
  evidenceReportIds: string[];
  linkedSignals: string[];
  linkedEntities: Array<{
    type: string;
    id: string;
    label: string;
  }>;
  riskSummary: string;
  nextOwner: 'Demand' | 'Customer' | 'Ecom/COS' | 'Finance';
  createdAt: string;
  updatedAt: string;
};
```

### Step 5 — Operator Review

Operator actions:

- `Approve handoff`
- `Send to Demand`
- `Ask agent to explain`
- `Request more data`
- `Suppress`
- `Reject`

Review requirements:

- Operator sees evidence before send.
- Operator sees guardrails before send.
- Operator sees generated Demand payload before send.
- Operator can edit message/objective/channel/owner before send.

### Step 6 — Demand Handoff

Demand receives a structured payload, not a paragraph.

Target Demand destinations:

- `/demand/campaigns`
- `/demand/content-social`
- `/demand/leads-rfqs`
- `/demand/re-engage`

Demand handoff object:

```ts
type DemandHandoff = {
  id: string;
  decisionPackageId: string;
  targetWorkspace: 'campaigns' | 'content_social' | 'leads_rfqs' | 're_engage';
  status: 'sent' | 'accepted' | 'rejected' | 'in_progress' | 'completed';
  payload: DecisionPackage['handoffPayload'];
  sentBy: string;
  acceptedBy?: string;
  rejectionReason?: string;
  createdDemandEntityId?: string;
  createdAt: string;
};
```

### Step 7 — Outcome Readback

Demand returns outcome to Intelligence.

```ts
type IntelligenceReadback = {
  id: string;
  decisionPackageId: string;
  demandHandoffId: string;
  outcomeType: 'campaign_created' | 'lead_created' | 'rfq_created' | 'order_created' | 'rejected' | 'paused';
  metrics: {
    leads?: number;
    rfqs?: number;
    orders?: number;
    revenue?: number;
    roas?: number;
  };
  learning: string;
  createdAt: string;
};
```

## 10. Visual Design Principles

### Principle 1 — Operator-First

The page should feel like a workbench, not a report.

Use:

- Work queues.
- Status chips.
- Action rail.
- Evidence drawer.
- Compact rows.

Avoid:

- Large decorative charts.
- Generic KPI wall.
- Multiple equally important CTAs.
- Long report cards without action.

### Principle 2 — Agent Work Is Visible

Agent output should not feel magical.

Show:

- Agent name.
- Current state.
- Evidence count.
- Confidence.
- Source freshness.
- Rejected alternatives.
- Last run time.

### Principle 3 — Evidence Before Action

Before sending to Demand, operator must see:

- Source.
- Freshness.
- Confidence.
- Risk.
- Guardrail.
- Linked entity.

### Principle 4 — Handoff Is A Product Object

Handoff should not be a loose navigation link.

It must be:

- Structured.
- Previewable.
- Editable.
- Audited.
- Traceable.

### Principle 5 — Readback Closes The Loop

If Demand accepts/rejects/executes, Intelligence should show it.

This prevents Intelligence from becoming a one-way recommendation engine.

## 11. MVP Scope

### MVP Route

Start with:

```text
/intelligence/decision-hub
```

Rebuild this route as:

```text
Intelligence Agent Workspace
```

### MVP User Story

As an agency operator, I want agents to find the strongest market/product/message opportunity, explain the evidence, and create a Demand-ready campaign package, so that I can send it to Demand without translating insight manually.

### MVP Agent Lanes

- Market Scout
- Persona Analyst
- Message Strategist
- Launch Risk Analyst

### MVP Output

One `DecisionPackage` type that can hand off to `/demand/campaigns`.

### MVP UI Sections

1. Compact header.
2. Agent run rail.
3. Decision Queue.
4. Evidence drawer.
5. Handoff preview.
6. Sticky action rail.
7. Readback strip.

### MVP Non-Goals

- No real external agent execution yet.
- No backend mutation yet unless existing local mock supports it.
- No direct campaign creation from Intelligence.
- No full analytics rebuild.
- No Finance readback in first pass.

## 12. Implementation Phases

### Phase 1 — Product Contracts

Status: completed

File: `phase-01-product-contracts.md`

Goal:

Define `SignalCard`, `AgentEvidenceReport`, `DecisionPackage`, `DemandHandoff`, and `IntelligenceReadback` contracts.

Deliverables:

- Type definitions.
- Mock data mapping.
- Status enums.
- Boundary notes.

### Phase 2 — Workspace Shell

Status: completed

File: `phase-02-workspace-shell.md`

Goal:

Redesign `/intelligence/decision-hub` into compact agent workspace.

Deliverables:

- Header summary.
- Left agent rail.
- Center decision queue.
- Right evidence drawer.
- Sticky action rail.

### Phase 3 — Agent Result Reporting

File: `phase-03-agent-result-reporting.md`

Goal:

Render agent evidence and confidence clearly.

Deliverables:

- Agent run cards.
- Evidence report detail.
- Rejected alternatives.
- Risk/guardrail section.

### Phase 4 — Demand Handoff Preview

File: `phase-04-demand-handoff-preview.md`

Goal:

Create Demand-ready payload preview and actions.

Deliverables:

- Handoff payload panel.
- Send-to-Demand CTA.
- Edit/approve/suppress flows.
- Route/query payload strategy.

### Phase 5 — Demand Receive Experience

Status: partial

File: `phase-05-demand-receive-experience.md`

Goal:

Make `/demand/campaigns` receive and display Intelligence context.

Deliverables:

- URL context handling.
- Handoff banner.
- Pre-filled recommended action.
- Acceptance/rejection state mock.

### Phase 6 — Readback Loop

Status: completed

File: `phase-06-readback-loop.md`

Goal:

Show Demand outcome returning to Intelligence.

Deliverables:

- Readback strip.
- Outcome state.
- Learning summary.
- Link back to Demand entity.

### Phase 7 — Validation

File: `phase-07-validation.md`

Goal:

Validate user flow, responsive behavior, accessibility, and route stability.

Deliverables:

- Route smoke tests.
- Browser QA checklist.
- Keyboard/focus checks.
- Usability scenarios.

## 13. Success Criteria

### Product Success

- Operator can understand top agent recommendation in under 30 seconds.
- Operator can inspect evidence in one click.
- Operator can send a Demand-ready package without rewriting report text.
- Demand can see where the package came from.
- Intelligence can show accepted/rejected/readback status.

### Business Success

- Insight-to-Demand handoff time below 10 minutes.
- 80%+ of reviewed packages accepted by Demand.
- Every Demand campaign can trace back to an Intelligence finding.
- Operator reports higher confidence in AI recommendations.

### Technical Success

- No duplicated Demand business rules in Intelligence UI.
- All mock data remains replaceable by API contracts.
- Components stay reusable across Intelligence pages.
- Route smoke tests pass.
- Build passes.

## 14. Risks

### Risk 1 — Workspace Becomes Another Dashboard

Mitigation:

- Every row must have next action, owner, confidence, evidence, and handoff state.

### Risk 2 — Agent Output Lacks Trust

Mitigation:

- Evidence drawer required.
- Confidence and freshness visible.
- Rejected alternatives shown.

### Risk 3 — Domain Boundary Drift

Mitigation:

- Intelligence prepares handoff only.
- Demand owns execution.
- No silent mutation.

### Risk 4 — Payload Too Abstract For Demand

Mitigation:

- Define `DecisionPackage.handoffPayload` strictly.
- Include objective, audience, message, channel, CTA, owner, guardrails.

### Risk 5 — Too Much UI Complexity

Mitigation:

- Start compact.
- Use rows + drawer.
- Avoid separate dashboard pages for every lens.

## 15. Validation Scenarios

1. Find best launch opportunity.
2. Explain confidence behind recommendation.
3. Spot blocker before Demand handoff.
4. Send approved package to Demand.
5. Demand accepts and creates campaign setup.
6. Demand rejects package with reason.
7. Intelligence receives outcome readback.
8. Narrow viewport still supports queue/detail/action flow.
9. Keyboard user can move through tabs, rows, drawer, and action rail.
10. Stale signal is blocked or marked review-needed.

## 16. Open Questions

1. Should `AI Operator` remain a separate route or become embedded in Workspace?
2. Should `Launch Decisions` become `Decision Packages`?
3. Should Demand handoff be URL/query-state first, or local mock store first?
4. Which first Demand target matters most: Campaigns, Content/Social, or Leads/RFQs?
5. Should rejected packages train agent recommendations immediately, or only appear as readback notes?
6. What is the minimum confidence threshold for `Ready for Demand`?
7. Who is the default human owner for Intelligence review?

## 17. Recommended Next Step

Proceed with Phase 1 and Phase 2 only first.

Recommended first build sprint:

```text
Phase 1: Product contracts + mock DecisionPackage data
Phase 2: Rebuild /intelligence/decision-hub as compact workspace shell
```

Stop after Phase 2 for review before connecting Demand handoff.
