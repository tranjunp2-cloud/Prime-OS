---
title: "Demand UI Overview-Style Refresh"
description: "Make PrimeOS Demand easier to understand by aligning it with the new Operating Home command-bar style."
status: completed
priority: P2
effort: 7h
branch: main
tags: [prime-os, demand, ui, ux, overview-style]
created: 2026-05-05
---

# Demand UI Overview-Style Refresh

## Goal
Rework Demand screens so an operator understands the growth-input loop fast: what source/campaign/content/lead/re-engage move matters now, why, owner, guardrail, and outcome readback.

## Plan Basis
- `ck:plan` requested; plan-only, no implementation yet.
- Subagents attempted but provider credentials failed. Local scout/research reports created instead.
- Reference style: `PrimeOverview.tsx` compact operating home.

## Design Direction
- Style: compact operational control room, light-first, evidence-led.
- Anchor: visible Demand Pipeline Board.
- Reuse current shadcn/Radix/Tailwind/lucide patterns; no new UI library.

## Dependency Graph
```txt
Phase 01 Demand Hub -> Phase 03 Tests/QA
Phase 02 Demand Child Pages -> Phase 03 Tests/QA
Phase 01 and Phase 02 can run in parallel if file ownership is split first.
```

## Execution Strategy
- Preferred single-worker path: Phase 01, Phase 02, Phase 03.
- Parallel path: split Phase 01 hub extraction/implementation from Phase 02 child-page panel work, then run Phase 03 after both merge.

## Phases
1. `phase-01-demand-hub-command-room.md` — status completed, 100%, group A.
2. `phase-02-demand-child-pages-overview-style.md` — status completed, 100%, group A.
3. `phase-03-demand-qa-and-copy-alignment.md` — status completed, 100%, group B.

## File Ownership Matrix
| Phase | Owns / modifies |
|---|---|
| 01 | `prime-os-phase-1/app/src/pages/prime/PrimeTowerPage.tsx` only, `PrimeDemandHubPage` section |
| 02 | `prime-os-phase-1/app/src/pages/prime/PrimeTowerPage.tsx` only, `DemandExecutionPanel` section |
| 03 | `prime-os-phase-1/app/tests/prime-route-shell.spec.ts`, `prime-os-phase-1/app/tests/prime-tower-layout.spec.ts`, optional `ui-*` specs |

## Validation Commands
- `cd prime-os-phase-1/app && npm run test -- --runInBand`
- `cd prime-os-phase-1/app && npm run build:dev`
- `cd prime-os-phase-1/app && npx playwright test tests/prime-route-shell.spec.ts tests/prime-tower-layout.spec.ts`

## Success Criteria
- `/demand/hub` shows a clear command bar, ranked demand queue, pipeline board, guardrail rail, evidence stack.
- `/demand/campaigns`, `/demand/content-social`, `/demand/leads-rfqs`, `/demand/re-engage` show recommended action above fold.
- Legacy Demand redirects + query focus still pass.
- No mobile horizontal scroll at 375px.
- Overview and Demand feel like same operating system style.

## Reports
- `research/01-overview-style-and-demand-ux.md`
- `scout/01-demand-code-map.md`

## Completion Notes
- Demand Hub now uses an Overview-style command bar, priority queue, pipeline, guardrail rail, evidence stack, and outcome readback.
- Demand child pages now show compact command bars, route product context, action queue rows, and proof/readback context.
- Auth test helper and token restore were aligned so protected route QA can survive full reloads.
- Validation passed: `npm run build:dev -- --mode development`, `npm run test`, `npx playwright test tests/prime-route-shell.spec.ts tests/prime-tower-layout.spec.ts --workers=1`.

## Unresolved Questions
- None blocking.
