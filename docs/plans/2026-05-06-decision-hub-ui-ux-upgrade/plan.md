---
title: "Decision Hub UI/UX Upgrade"
description: "Upgrade Intelligence Decision Hub into an evidence-first operator cockpit with contextual Prime AI actions."
status: completed
priority: P1
effort: 9h
branch: main
tags: [prime-os, intelligence, decision-hub, ui, ux, prime-ai]
created: 2026-05-06
---

# Decision Hub UI/UX Upgrade

## Goal
Make Intelligence → Decision Hub answer the operator question faster: what decision matters now, why, who owns it, what action is safe, and how outcome feedback closes the loop.

## Plan Basis
- User requested `lazyweb-design-improve` + `ck:plan`; plan only, no implementation.
- Lazyweb report: `.lazyweb/design-improve/decision-hub-2026-05-06/report.md`.
- Current screen: `/intelligence/decision-hub`, captured locally.
- Project context: Prime OS, Intelligence Area, Decision Hub Tower.

## Design Direction
- Style: compact enterprise decision cockpit, evidence-first, action-led.
- Default view: decision workbench + contextual explain/action panel.
- Preserve Prime OS Area → Tower → Floor language.
- Reuse existing React/Vite, shadcn/Radix/Tailwind/lucide patterns; no new UI kit.

## Domain Boundaries
- Intelligence owns signals, model explanation, decision queue, confidence, outcome learning.
- Demand, Customer, Ecom/COS, Finance receive handoffs; they do not own Decision Hub truth.
- Prime AI may explain, draft, and handoff; it must not silently execute irreversible actions.

## Dependency Graph
```txt
Phase 01 Decision Brief -> Phase 02 Workbench -> Phase 03 Prime AI Drawer -> Phase 04 QA/Responsive
Phase 01 and Phase 02 can overlap only after shared data contract fields are named.
```

## Phases
1. `phase-01-decision-brief-and-outcome-band.md` — status completed, 100%.
2. `phase-02-evidence-first-workbench.md` — status completed, 100%.
3. `phase-03-contextual-prime-ai-drawer.md` — status completed, 100%.
4. `phase-04-responsive-qa-and-a11y.md` — status completed, 100%.

## File Ownership Matrix
| Phase | Owns / modifies |
|---|---|
| 01 | `prime-os-phase-1/app/src/components/prime/PrimeOperatingSystem.tsx`, `prime-os-phase-1/app/src/pages/prime/PrimeTowerPage.tsx` Decision Hub section |
| 02 | `prime-os-phase-1/app/src/pages/prime/PrimeTowerPage.tsx` Decision queue/workbench components |
| 03 | Prime AI/readout components in Decision Hub section; shared AI drawer only if existing pattern supports it |
| 04 | Route/layout tests, visual smoke paths, responsive/a11y fixes limited to changed components |

## Validation Commands
- `cd prime-os-phase-1/app && npm run lint`
- `cd prime-os-phase-1/app && npm run test`
- `cd prime-os-phase-1/app && npm run build:dev`
- `cd prime-os-phase-1/app && npx playwright test tests/prime-route-shell.spec.ts tests/prime-tower-layout.spec.ts --workers=1`

## Success Criteria
- First viewport shows one accountable decision brief with owner, next action, evidence, confidence, and SLA/urgency.
- Decision queue becomes the primary workbench with evidence chips, risk, confidence, owner, and handoff action.
- Selecting a decision reveals a contextual Prime AI explain/action panel with guardrails and audit note.
- Outcome metrics show feedback quality, stale evidence, and business impact, not just activity counts.
- Mobile/tablet layout has no horizontal scroll and preserves action priority.

## Reports
- `.lazyweb/design-improve/decision-hub-2026-05-06/report.md`
- `.lazyweb/design-improve/decision-hub-2026-05-06/report.html`
- `reports/01-lazyweb-reference-summary.md`

## Unresolved Questions
- Optimize for single selected decision or bulk multi-select handoff?
- Should Prime AI drawer be always docked on desktop, or opened after row selection?

## Completion Notes
- Decision Hub now opens with an accountable decision brief, readiness, SLA, owner handoff, evidence chips, and primary action.
- Decision queue was promoted into an evidence-first workbench with selectable rows and responsive card fallback.
- Prime AI readout is now contextual to the selected decision and shows evidence, guardrails, draft action, and audit links.
- Loop, evidence, activation plays, and audit details moved behind tabs for progressive disclosure.
