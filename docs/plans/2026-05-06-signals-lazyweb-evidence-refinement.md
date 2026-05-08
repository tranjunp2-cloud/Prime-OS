---
title: "Signals Lazyweb Evidence Refinement"
description: "Apply Lazyweb research and brainstorm patterns to refine Signals into a triage cockpit."
status: completed
priority: P1
effort: 3h
branch: main
tags: [prime-os, intelligence, signals, lazyweb, ui]
created: 2026-05-06
---

# Signals Lazyweb Evidence Refinement

## Goal
Refine Intelligence → Signals using Lazyweb research before further code changes.

## Inputs
- Research: `.lazyweb/design-research/signals-evidence-cockpit-2026-05-06/report.md`
- Brainstorm: `.lazyweb/design-brainstorm/signals-evidence-cockpit-2026-05-06/report.md`

## Implementation
1. Add triage lanes: Ready / Watch / Blocked / Learning.
2. Add quick filters for all/family/readiness.
3. Add ranked signal badges in workbench.
4. Add evidence receipt timeline in detail panel.
5. Keep conversion explicit; no automatic execution.

## Validation
- `npm run lint`
- `npm run test`
- `npm run build:dev`
- focused Playwright Signals route smoke

## Completion Notes
- Added Lazyweb-informed triage lanes and quick filters.
- Added ranked workbench rows and evidence receipt timeline.
- Validation passed: lint/test/build/Signals route smoke.
