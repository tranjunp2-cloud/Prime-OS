---
title: "Campaigns Workspace Restructure"
description: "Rebuild Demand Center Campaigns into a clear six-tab operating workspace: Overview, Pipeline, Planner, Readiness, Execution Queue, and Results."
status: completed
priority: P1
effort: 22h
created: 2026-05-14
completed: 2026-05-14
owner: "PrimeOS"
tags: [prime-os, demand, campaigns, campaign-ops, ui-ux, product-plan]
blockedBy: []
blocks: []
relatedPlans:
  - docs/plans/260514-1156-demand-dashboard-redesign
  - docs/plans/260514-1114-demand-sources-product-plan
targetRoute: "/demand/campaigns"
legacyRoutes:
  - "/demand/campaign-ops"
  - "/demand/campaign"
targetFiles:
  - prime-os-phase-1/app/src/pages/prime/PrimeTowerPage.tsx
  - prime-os-phase-1/app/src/lib/prime/prime-data.ts
  - prime-os-phase-1/app/src/lib/prime/prime-navigation.ts
  - prime-os-phase-1/app/src/App.tsx
  - prime-os-phase-1/app/src/components/prime/PrimeOperatingSystem.tsx
---

# Campaigns Workspace Restructure

## Overview

The current Campaigns surface at `/demand/campaigns` already contains useful campaign execution primitives: a command bar, recommended action, demand actions, setup dialog, readiness-style phase contracts, local execution queue, and proof/readback. The problem is that these blocks are mixed into one long operating page, so users cannot quickly distinguish campaign lifecycle, planning, launch safety, execution queue, and results.

Restructure Campaigns into six first-class tabs:

```text
Campaigns
├─ Overview
├─ Pipeline
├─ Planner
├─ Readiness
├─ Execution Queue
└─ Results
```

Keep `/demand/campaigns` as the canonical route and use `?tab=overview|pipeline|planner|readiness|execution-queue|results` for tab state. Preserve the existing legacy redirects from `/demand/campaign-ops` and `/demand/campaign`.

## Completion Summary

Implemented the Campaigns workspace restructure:

- Added `campaign-workspace.ts` read model with six tabs, lifecycle stages, objectives, readiness checks, execution queue rows, and results readback.
- Rebuilt `/demand/campaigns` first viewport around the Campaigns workspace instead of the generic tower chrome.
- Added route-driven workspace tabs: Overview, Pipeline, Planner, Readiness, Execution Queue, Results.
- Kept Demand sibling tabs visible for cross-function navigation.
- Preserved local-only action setup behavior and safety language.
- Added unit coverage for the campaign workspace read model.
- Updated Campaigns route shell smoke test and fixed the Playwright session helper to seed the auth token expected by the current auth restore flow.
- Verified with targeted unit tests, Playwright route smoke, and `npm run build:dev`.

## Product Boundary

Campaigns is a Demand Center operating workspace. It helps the operator plan campaigns, check readiness, queue local actions, and read outcomes back into PrimeOS.

It is not:

- A paid ads manager.
- A CRM source of truth.
- A COS inventory editor.
- A finance approval surface.
- A final attribution engine.

Campaigns may create local drafts, tasks, queue items, and handoff payloads. It must not send external messages, publish ads, mutate stock, approve budget, or overwrite CRM/customer truth.

## First-Screen Goal

When a user opens Campaigns, they should immediately understand:

| Question | Primary Tab |
|---|---|
| Which campaign needs attention now? | Overview |
| Which campaigns are running, queued, blocked, or done? | Pipeline |
| How do I define a new campaign route? | Planner |
| Is this campaign safe to run or scale? | Readiness |
| Which actions are ready, queued, executing, or blocked? | Execution Queue |
| What results came from campaign work? | Results |

## Current Codebase Findings

| Area | Current State | Plan Impact |
|---|---|---|
| Route | `prime-os-phase-1/app/src/App.tsx` maps `/demand/campaigns` to `<PrimeTowerPage towerId="campaign-ops" />`. | Keep route; add `tab` query parsing inside the campaign branch. |
| Navigation | `prime-navigation.ts` labels tower `Campaigns`, href `/demand/campaigns`, legacy match paths `/demand/campaign-ops`, `/demand/campaign`. | Keep IA label and add optional child/deep links only if needed later. |
| Main UI | `PrimeTowerPage.tsx` contains `DemandExecutionPanel` for `campaign-ops`, `content-creator-ops`, `lead-response-capture`, `retargeting-outreach`. | Avoid breaking sibling Demand pages; isolate campaign-specific tab rendering behind `towerId === 'campaign-ops'`. |
| Data | `PrimeCampaign` has `id`, `name`, `channel`, `status`, `productId`, `skuId`, `skuCode`, `traffic`, `leads`, `rfqs`, `orders`, `spend`, `revenue`, `targetSegment`. | Use this as MVP data source; derive stages/readiness/actions/results locally. |
| Existing actions | `campaignActions` include buyer message, paid ad set, SEO content brief, stock top-up task. | Move into Execution Queue and Planner/Readiness references. |
| Existing safety | Dialog copy says actions create local mock drafts/tasks only. | Preserve and strengthen in Execution Queue. |
| Existing blocks | `Recommended now`, `Demand actions`, `Phase contract`, `Local execution queue`, `Proof & readback`. | Split across the six tabs instead of rendering all at once. |

### Agent Research Notes

Pauli's product analysis:

- Keep Campaigns as an operating workspace, not an ad manager, budget optimizer, CRM, COS editor, or final attribution system.
- MVP should prioritize six tabs, local read models, current `PrimeCampaign` data, and local action queue behavior.
- Campaign actions should create drafts/tasks/handoffs only.
- Readiness and Results need explicit labels so users do not confuse them with final approval or attribution truth.

Plato's codebase scout:

- `/demand/campaigns` is already the canonical route; `/demand/campaign-ops` and `/demand/campaign` are legacy redirects.
- Campaigns is currently one mode inside `DemandExecutionPanel`, alongside Content & Social, Leads & RFQs, and Re-engage.
- `PrimeCampaign` is built in `prime-data.ts` from products, orders, and inventory, not from backend `campaignOps` seed/admin CRUD.
- The safest refactor is to add a Campaigns-specific read model and tab views instead of adding more conditional JSX into the shared Demand execution panel.
- Existing Playwright and unit test targets should be updated for route shell, legacy redirects, navigation, and campaign read-model stability.

## Information Architecture

### Tab 1: Overview

Role: campaign operating summary.

Show:

- Campaign summary.
- Decision readiness.
- Active blockers.
- Recommended next action.
- Top campaign.
- Outcome preview.

Cards:

| Card | Content |
|---|---|
| Active Campaigns | Count active/running campaigns. |
| Queued Actions | Count local actions waiting for review/execution. |
| Decision Readiness | Percent ready to decide or launch. |
| Guardrail Alerts | Stock, SLA, finance, customer suppression warnings. |
| Outcome Preview | Leads, RFQs, orders, revenue expected/current. |

Copy:

> Campaigns Overview gives the team a clear operating view of active campaigns, launch readiness, blockers, recommended actions, and expected demand outcomes.

### Tab 2: Pipeline

Role: lifecycle management.

Replace the current scattered "Operating Registry" style with a single campaign lifecycle view.

Stages:

```text
Idea -> Draft -> Ready -> Queued -> Running -> Paused -> Completed
```

MVP UI: dense enterprise table with optional stage chips. A Kanban can come later if volume increases.

Columns:

| Campaign | Stage | Owner | SKU | Channel | Readiness | Next Action |
|---|---|---|---|---|---|---|
| Repeat Buyer Push | Queued | CRM Ops | Black Notebook | LINE + Email | 90% | Review setup |
| TikTok Creator Test | Draft | Content Team | Craft Paper | TikTok | 65% | Add asset |
| Rakuten SEO Push | Running | EC Team | Stationery Set | Rakuten | 82% | Monitor |

Copy:

> Pipeline tracks each campaign from idea to execution, showing ownership, current stage, readiness, and the next required action.

### Tab 3: Planner

Role: create/configure campaign route.

Fields:

- Campaign name.
- Objective.
- Target SKU.
- Target audience.
- Message / offer.
- Channel.
- Owner.
- Timeline.
- Expected outcome.

Objectives:

| Objective | Meaning |
|---|---|
| Generate Leads | Create new demand leads. |
| Capture RFQs | Convert demand into RFQ requests. |
| Re-engage Buyers | Activate prior buyers. |
| Launch SKU | Launch or relaunch a product/SKU. |
| Clear Inventory | Move inventory safely. |
| Test Demand | Validate market demand. |
| Improve Marketplace Traffic | Increase marketplace discovery. |

Copy:

> Planner helps the operator define the campaign objective, target SKU, audience, message, channel, owner, and expected outcome before execution.

MVP behavior: form-like read-only/draft surface using current demo data. It may create local draft state only; no backend mutation required in first pass.

### Tab 4: Readiness

Role: campaign safety gate.

This is critical for PrimeOS. Campaigns should not push marketing without checking stock, SLA, finance, customer suppression, content approval, and ownership.

Checklist:

- Audience ready.
- Message approved.
- Asset ready.
- SKU mapped.
- Stock / ATS safe.
- SLA safe.
- Budget approved.
- Owner assigned.
- Channel connected.
- Customer suppression checked.

Statuses:

- Ready.
- Ready with warning.
- Blocked.
- Needs review.

Table:

| Area | Status | Blocker | Owner |
|---|---|---|---|
| Audience | Ready | None | CRM Ops |
| Content | Warning | CTA not approved | Content Team |
| Inventory | Blocked | ATS below threshold | Ecom Ops |
| Channel | Ready | None | Demand Team |

Copy:

> Readiness checks whether a campaign can safely run by validating audience, content, SKU, inventory, SLA, budget, owner, channel, and guardrail conditions.

### Tab 5: Execution Queue

Role: manage demand actions to be executed.

Combine current `Demand actions` and `Local execution queue`.

Action types:

- Send campaign message.
- Create ad set.
- Create SEO task.
- Assign creator brief.
- Create RFQ follow-up.
- Create CRM task.
- Create stock top-up task.
- Create marketplace campaign.

States:

- Recommended.
- Reviewed.
- Queued.
- Executing.
- Done.
- Failed.
- Cancelled.

Table:

| Action | Campaign | Channel | Owner | Status | Guardrail |
|---|---|---|---|---|---|
| Send repeat buyer message | Repeat Buyer Push | LINE + Email | CRM Ops | Ready | Safe |
| Create SEO task | Rakuten SEO Push | Rakuten | Content Team | Queued | Safe |
| Create stock top-up task | Inventory Support | Internal | Ecom Ops | Blocked | ATS risk |

Copy:

> Execution Queue converts campaign decisions into clear operating actions such as sending messages, creating SEO tasks, assigning creator work, creating CRM tasks, or triggering stock-related actions.

Safety copy must remain visible near action controls:

> Local queue only. PrimeOS creates drafts and tasks for review; it does not send messages, publish ads, or mutate inventory externally.

### Tab 6: Results

Role: campaign proof and readback.

Combine:

- Proof & Feedback.
- Outcome Preview.
- Leads & RFQs result.
- Orders / revenue readback.

Metrics:

| Metric | Meaning |
|---|---|
| Reach | Traffic, views, audience reach. |
| Engagement | Click, reply, comment, view. |
| Leads | Leads generated. |
| RFQs | RFQs generated. |
| Orders | Related orders. |
| Revenue | Related revenue. |
| ROAS | Spend efficiency. |
| Source Quality | Quality of originating demand source. |
| SKU Signal | Which SKU has strong demand. |

Flow:

```text
Campaign -> Action -> Buyer response -> Lead / RFQ -> Order -> Revenue readback -> Next recommendation
```

Table:

| Campaign | Leads | RFQs | Orders | Revenue | Status |
|---|---:|---:|---:|---:|---|
| Repeat Buyer Push | 48 | 6 | 12 | ¥425,246 | Good |
| TikTok Creator Test | 82 | 9 | 5 | ¥210,000 | Learning |
| Rakuten SEO Push | 28 | 4 | 16 | ¥630,000 | Strong |

Copy:

> Results shows campaign proof, including reach, engagement, leads, RFQs, orders, revenue, and feedback signals for the next campaign decision.

## Mapping From Existing Screen

| Current Block | New Location |
|---|---|
| Decision readiness | Overview / Readiness |
| Campaigns / Orders / Guardrail cards | Overview |
| Operating loop | Overview |
| Evidence stack | Readiness |
| Operating registry | Pipeline |
| Outcome preview | Overview / Results |
| Campaign command bar | Planner |
| Which campaign can run safely now? | Readiness |
| Phase contract | Readiness |
| Recommended now | Overview / Planner / Execution Queue |
| Demand actions | Execution Queue |
| Local execution queue | Execution Queue |
| Proof & feedback | Results |

## Proposed View Model

Add a pure derived model before refactoring the UI. This keeps `PrimeTowerPage.tsx` from accumulating more ad hoc campaign logic.

Recommended file:

```text
prime-os-phase-1/app/src/lib/prime/campaign-workspace.ts
```

Types:

```ts
export type CampaignWorkspaceTab =
  | 'overview'
  | 'pipeline'
  | 'planner'
  | 'readiness'
  | 'execution-queue'
  | 'results';

export type CampaignStage =
  | 'idea'
  | 'draft'
  | 'ready'
  | 'queued'
  | 'running'
  | 'paused'
  | 'completed';

export type CampaignObjective =
  | 'generate-leads'
  | 'capture-rfqs'
  | 're-engage-buyers'
  | 'launch-sku'
  | 'clear-inventory'
  | 'test-demand'
  | 'improve-marketplace-traffic';

export type CampaignReadinessStatus =
  | 'ready'
  | 'warning'
  | 'blocked'
  | 'needs-review';

export type CampaignExecutionStatus =
  | 'recommended'
  | 'reviewed'
  | 'queued'
  | 'executing'
  | 'done'
  | 'failed'
  | 'cancelled';

export interface CampaignWorkspaceSnapshot {
  summary: CampaignSummary;
  campaigns: CampaignPipelineItem[];
  plannerDrafts: CampaignPlannerDraft[];
  readinessChecks: CampaignReadinessCheck[];
  executionActions: CampaignExecutionAction[];
  results: CampaignResultReadback[];
  selectedCampaignId: string | null;
}
```

Derivations:

- Map `PrimeCampaign.status === 'active'` to `running` unless readiness/action state says queued.
- Map `PrimeCampaign.status === 'testing'` to `draft` or `ready`.
- Map `PrimeCampaign.status === 'paused'` to `paused`.
- Compute `roas = revenue / spend`.
- Compute `leadRate = leads / traffic`.
- Compute `rfqRate = rfqs / leads`.
- Compute `orderRate = orders / leads`.
- Compute readiness from available stock forecast, content readiness, owner/channel presence, and customer suppression demo rules.

## Implementation Phases

### Phase 1: Campaign Workspace Contract

Files:

- `prime-os-phase-1/app/src/lib/prime/campaign-workspace.ts`
- Optional test file under existing test pattern if present.

Tasks:

- Define tabs, stages, objectives, readiness statuses, execution statuses.
- Build `buildCampaignWorkspace(snapshot, options)` as a pure helper.
- Derive overview KPIs from `snapshot.campaigns`, `snapshot.leads`, `snapshot.rfqs`, forecasts, and existing campaign action seed.
- Derive stage/readiness/action/result rows.
- Export constants for tab labels, short descriptions, and safety copy.

Acceptance:

- Given `getPrimeSnapshot()`, helper returns stable data for all six tabs.
- No React state inside the model helper.
- No external mutation or API calls.

### Phase 2: Route and Tab Shell

Files:

- `prime-os-phase-1/app/src/pages/prime/PrimeTowerPage.tsx`
- `prime-os-phase-1/app/src/App.tsx`
- `prime-os-phase-1/app/src/lib/prime/prime-navigation.ts`

Tasks:

- Parse `?tab=` inside the `campaign-ops` branch.
- Keep `/demand/campaigns` canonical.
- Preserve `/demand/campaign-ops` and `/demand/campaign` redirects.
- Add a compact tab rail: `Overview | Pipeline | Planner | Readiness | Execution Queue | Results`.
- Keep existing Demand route tabs if still needed, but avoid two competing nav layers.
- Make selected campaign query `?campaign=<id>` work across relevant tabs.

Acceptance:

- Opening `/demand/campaigns` defaults to Overview.
- Opening `/demand/campaigns?tab=readiness` opens Readiness.
- Invalid tabs fall back to Overview.
- Sibling Demand pages still render unchanged.

### Phase 3: Overview and Pipeline

Files:

- `PrimeTowerPage.tsx` initially, optionally extract to `pages/prime/campaigns/`.

Tasks:

- Move hero metric cards into Campaigns Overview.
- Add one recommended campaign/action block with clear primary CTA.
- Add outcome preview card with leads, RFQs, orders, revenue.
- Add active blockers with owner and next action.
- Build Pipeline table with stages, owner, SKU, channel, readiness, next action.
- Use icons and status chips, but keep copy lean.

Acceptance:

- Overview answers "what should I do next?" in the first viewport.
- Pipeline shows every campaign row with lifecycle stage and next action.
- Dense cards are reduced; no repeated border-heavy blocks.

### Phase 4: Planner and Readiness

Files:

- `PrimeTowerPage.tsx` or extracted `CampaignPlannerView.tsx`, `CampaignReadinessView.tsx`.

Tasks:

- Convert current command/setup ideas into Planner fields.
- Provide objective chips for the seven objectives.
- Render campaign route summary: SKU, audience, offer, channel, owner, timeline, expected outcome.
- Move phase contract/evidence/guardrail checks into Readiness.
- Add readiness table with status, blocker, owner, and recommended fix.
- Preserve source-of-truth boundary copy.

Acceptance:

- Planner shows the full campaign definition without implying real campaign creation.
- Readiness clearly marks Ready, Warning, Blocked, Needs review.
- Stock/ATS, SLA, finance, customer suppression, content approval, and owner/channel checks are visible.

### Phase 5: Execution Queue and Results

Files:

- `PrimeTowerPage.tsx` or extracted `CampaignExecutionQueueView.tsx`, `CampaignResultsView.tsx`.

Tasks:

- Move `campaignActions` and `executionLog` into Execution Queue tab.
- Keep setup dialog behavior for action details.
- Add status filters or chips for Recommended, Reviewed, Queued, Executing, Done, Failed, Cancelled.
- Move `Proof & readback` into Results.
- Add results table and simple infographic flow.
- Show ROAS, leads, RFQs, orders, revenue, source quality, and SKU signal.

Acceptance:

- Execution Queue is the only place where action buttons appear.
- Results does not include action mutation buttons.
- Safety note is visible before queueing anything.

### Phase 6: QA, Responsiveness, and Regression

Tasks:

- Run typecheck/build according to existing package scripts.
- Smoke `/demand/campaigns` with every tab query.
- Verify `/demand/campaign-ops` redirects.
- Verify the setup dialog still queues local state only.
- Check responsive layout at desktop and narrow widths.
- Ensure keyboard access for tabs, dialogs, and action buttons.
- Update or add route shell coverage for six Campaigns tabs.
- Keep Demand dashboard and navigation tests stable.

Acceptance:

- Build passes.
- No TypeScript regressions.
- No sibling Demand tower regression.
- First viewport is readable without horizontal overflow.

Suggested test targets:

| Test Area | File |
|---|---|
| Navigation route expectations | `prime-os-phase-1/app/src/lib/prime/prime-navigation.test.ts` |
| Demand dashboard campaign summary | `prime-os-phase-1/app/src/lib/prime/demand-dashboard.test.ts` |
| Prime campaign data links | `prime-os-phase-1/app/src/lib/prime/prime-data.test.ts` |
| Route shell and legacy redirects | `prime-os-phase-1/app/tests/prime-route-shell.spec.ts` |
| Tower layout smoke | `prime-os-phase-1/app/tests/prime-tower-layout.spec.ts` |

## UI / UX Principles

- Put the operator's next action above diagnostics.
- Use tabs for workflow stages, not for hiding unrelated clutter.
- Prefer tables/lists for campaign operations; use cards for summary and selected details.
- Use charts only in Overview and Results where they answer a decision question.
- Keep `Readiness` evidence compact with hover `(i)` tooltips where supporting explanation is needed.
- Make all safety boundaries explicit near action controls.
- Keep enterprise SaaS tone: compact, quiet, scannable, status-driven.

## Chart and Infographic Opportunities

| Location | Visualization | Purpose |
|---|---|---|
| Overview | Readiness progress bar or small bar chart | Show decision readiness at a glance. |
| Overview | Outcome preview mini-bars | Compare leads, RFQs, orders, revenue. |
| Pipeline | Stage distribution strip | Show bottlenecks across Idea/Draft/Ready/Queued/Running. |
| Readiness | Checklist status matrix | Show blocked vs warning vs ready areas. |
| Execution Queue | Status distribution chips | Show action workload by state. |
| Results | Campaign outcome bar chart | Compare leads/RFQs/orders/revenue by campaign. |
| Results | Campaign -> Action -> Response -> Revenue flow | Explain readback path. |

Use existing chart tooling if available. Do not add a new chart library for this restructure.

## Cross-Module Links

| Campaign Need | Link Target |
|---|---|
| Source quality and attribution | `/demand/sources` |
| Content or creator asset readiness | `/demand/content-social` |
| Lead/RFQ handoff | `/demand/leads-rfqs` |
| Buyer re-engagement | `/demand/re-engage` |
| Inventory/ATS risk | Ecom/COS product or inventory route if available |
| Budget/funding concern | `/finance/fin-support` |
| Intelligence source package | Intelligence handoff route if provided by query |

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Campaigns becomes a fake ad manager. | Keep action states local and show safety copy near buttons. |
| Readiness looks like final approval. | Label it as campaign run-safety preview; source systems own final truth. |
| Results looks like final attribution. | Say readback, not attribution truth; link to Intelligence/Attribution. |
| `PrimeTowerPage.tsx` grows too large. | Extract campaign workspace model first; extract views if phase 3 creates too much complexity. |
| Sibling Demand pages regress because they share `DemandExecutionPanel`. | Gate new tab shell behind `towerId === 'campaign-ops'`; keep other tower branches intact. |
| User cannot tell primary action. | Overview has one recommended action, one primary CTA, and short reason. |

## Acceptance Criteria

- `/demand/campaigns` shows six tabs: Overview, Pipeline, Planner, Readiness, Execution Queue, Results.
- Overview identifies one recommended campaign/action with reason, owner, SKU/product, and guardrail.
- Pipeline shows every campaign in a lifecycle stage with owner, SKU, channel, readiness, and next action.
- Planner exposes objective, audience, offer/message, SKU/product, channel, owner, timeline, and expected outcome.
- Readiness shows campaign checks with status, blocker, owner, and recommended fix.
- Execution Queue lists draft/queued/assigned actions and preserves local-only behavior.
- Results shows reach/traffic, engagement if available, leads, RFQs, orders, revenue, spend, ROAS, source quality, and SKU signal.
- `?campaign=<id>` focuses the selected campaign across relevant tabs.
- Legacy routes still work.
- Empty states exist for no campaigns, no selected campaign, no queued actions, and no results.
- Sibling routes `/demand/content-social`, `/demand/leads-rfqs`, and `/demand/re-engage` remain stable.

## Suggested Cook Command

```bash
/ck:cook /Users/admin/Desktop/PrimeOS_LarkVer/docs/plans/260514-1529-campaigns-workspace-restructure/plan.md
```
