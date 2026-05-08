# Design Improvement: Prime OS Decision Hub

## TL;DR
Decision Hub already has strong operating-system density, but the hierarchy is too flat: every region competes for attention. Upgrade it into a decision cockpit: top action brief, evidence-backed queue, explain/action drawer, outcome loop, and safer Prime AI placement.

## Current State
![Current Design](references/current.png)
*Prime OS Intelligence Area → Decision Hub. The screen shows readiness, loop cards, evidence, registry, queue, readout, activation plays, and Prime AI access in one long dashboard.*

## Improvement Ideas

### 1. Make the above-fold area a decision brief ⭐
Replace the current wide hero + metrics strip with a compact operator brief: decision health, top blocker, next action, owner, SLA, confidence, and why-now evidence. Keep only one primary CTA above the fold.

**Inspired by:**
![AttackIQ command center](references/lazyweb-attackiq-command-center.png)
*AttackIQ — unified operations console with asset tables, scenario monitoring, automation, and analytics panels. [Lazyweb]*

**Why this works:** Command-center dashboards work when the first viewport answers “what changed, who owns it, what action is safe?” Prime OS has the data, but the current hero spreads it across many equal cards.

**Sketch:**
```txt
┌────────────────────────────────────────────────────────────────────┐
│ Decision Hub                         Ready 87%   SLA: 2h           │
│ Top decision: SKU CR-NTB-BLK-A5-A4 close to ATS 20                │
│ Evidence: Demand 207 ↑ | ATS 20 ↓ | customer proof 95 orders      │
│ Owner: AI Operator → COS review             [Open strongest action]│
└────────────────────────────────────────────────────────────────────┘
```

### 2. Convert the queue into an evidence-first decision workbench
Promote `Decision queue` from a table into the main work surface. Use rows/cards with rank, decision type, confidence, owner, next handoff, evidence chips, risk badge, and one action. Keep table density, but add row affordance and expandable evidence.

**Inspired by:**
![Fieldguide workflow table](references/lazyweb-fieldguide-workflow-table.png)
*Fieldguide — workflow/data table with IDs, amounts, statuses, tags, and sidebar navigation. [Lazyweb]*

**Why this works:** Prime OS is an operating system, not a reporting dashboard. Operators should scan decisions by urgency and evidence, not scroll past narrative modules before finding the queue.

**Sketch:**
```txt
┌ Decision Workbench ────────────────────────────────────────────────┐
│ #  Decision               Evidence           Risk  Owner  Action   │
│ 1  SKU close to ATS 20    Demand + ATS + VOC High  AI →COS Open    │
│ 2  RMA-4102 launch link   Customer + OMS     Med   AI      Review  │
│ 3  JP stationery push     Orders + proof     Low   Demand  Open    │
└────────────────────────────────────────────────────────────────────┘
```

### 3. Add an explain/action side panel instead of a static readout
Turn `Operator readout` + floating Prime AI into a right-side contextual drawer. Selecting a decision opens: explanation, evidence chain, proposed action, guardrails, reversible/irreversible flags, audit note, and “draft / request approval / handoff”.

**Inspired by:**
![Intercom AI agent dashboard](references/lazyweb-intercom-ai-agent-dashboard.png)
*Intercom — AI agent dashboard with setup cards, performance metrics, and chat-style AI response interface. [Lazyweb]*

**Why this works:** AI support should be contextual to the selected decision. A global floating button hides accountability; a drawer shows reasoning, limits, and next safe action.

**Sketch:**
```txt
┌ Queue ───────────────────────────────┐ ┌ Explain + Act ──────────┐
│ selected row highlighted             │ │ Why now                 │
│ evidence chips                       │ │ Evidence chain          │
│ owner + handoff                      │ │ Guardrails              │
└──────────────────────────────────────┘ │ Draft action            │
                                         │ [Send handoff] [Audit]  │
                                         └─────────────────────────┘
```

### 4. Rebuild metrics as outcome learning, not generic KPI cards
Move `Signals`, `Models`, `Actions`, `Decisions today`, `Signals joined`, and `AI drafts` into a compact outcome-learning band. Show deltas, confidence trend, stale-data warnings, and business impact. Keep `Outcome readback 286` prominent as loop closure.

**Inspired by:**
![Userlane analytics cards](references/lazyweb-userlane-analytics-cards.png)
*Userlane — modular analytics dashboard with performance metrics, progress bars, charts, and customer insight cards. [Lazyweb]*

**Why this works:** Operators need to know whether previous decisions worked. Current cards count activity; upgrade them to feedback signals that shape trust in the next recommendation.

**Sketch:**
```txt
┌ Outcome Learning ─────────────────────────────────────────────────┐
│ Closed loop 286 +12% │ Accuracy 87% ↑ │ Stale evidence 1 │ Lift +18%│
│ last 7d trend ▄▅▆█   │ model drift ok │ exceptions       │ proof    │
└───────────────────────────────────────────────────────────────────┘
```

### 5. Reduce visual noise by grouping loop/evidence/plays behind progressive disclosure
Keep the operating-loop concept, but collapse secondary sections into tabs or an accordion below the main workbench: `Loop`, `Evidence`, `Activation plays`, `Audit`. Default to the queue + explain drawer.

**Inspired by web research:** Current AI-agent audit/dashboard products emphasize searchable timelines, evidence chains, approval status, and compliance readiness rather than many simultaneous panels: AgentTraceHQ, SealVera, AgentReceipt, Zendesk AI agents dashboard.

**Why this works:** Decision Hub’s job is action, not documentation display. Progressive disclosure preserves auditability while reducing first-scan load.

## What's Working
- Strong domain model: signal → decision → handoff → outcome is clear and Prime OS-specific.
- Good bounded-context language: Demand, COS, Finance, Customer ownership appears in copy.
- Visual system is consistent with recent Overview/Demand refresh: cards, badges, low-noise surfaces.
- Decision data feels realistic enough to validate operator workflows.

## Risks / Constraints
- Do not move decision rules into UI; UI should render domain contracts from Intelligence services/mock contracts.
- Keep Prime AI bounded: explain, draft, handoff; no silent execution.
- Preserve Area → Tower → Floor navigation language.
- Avoid new UI library; reuse existing shadcn/Radix/Tailwind primitives.

## All References
- `references/current.png` — current Prime OS Decision Hub capture. [Local]
- `references/lazyweb-attackiq-command-center.png` — command center / operations visibility pattern. [Lazyweb]
- `references/lazyweb-fieldguide-workflow-table.png` — dense workflow table pattern. [Lazyweb]
- `references/lazyweb-intercom-ai-agent-dashboard.png` — AI assistant/action panel pattern. [Lazyweb]
- `references/lazyweb-userlane-analytics-cards.png` — modular analytics/progress card pattern. [Lazyweb]
- AgentTraceHQ — audit trail dashboard/search pattern: https://www.agenttracehq.com/ [Web]
- SealVera — AI decision evidence, approval status, monitoring pattern: https://sealvera.com/ [Web]
- AgentReceipt — human-readable action timeline/receipt pattern: https://www.agentreceipt.co/ [Web]
- Zendesk AI agents dashboard overview: https://support.zendesk.com/hc/en-us/articles/4408838386842-Overview-of-the-Zendesk-AI-agents-dashboard [Web]

## Unresolved Questions
- Should Decision Hub optimize for one selected decision at a time, or a multi-select bulk handoff workflow?
- Should Prime AI drawer be always docked on desktop, or opened only after selecting a queue row?
