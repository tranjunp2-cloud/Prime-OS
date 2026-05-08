# Phase 02 — Workspace Shell

## Context Links

- Parent plan: `docs/plans/2026-05-06-intelligence-agent-workspace-rebuild/plan.md`
- Depends on: Phase 01 contracts

## Overview

- Date: 2026-05-06
- Priority: P1
- Status: completed
- Review status: not reviewed

Rebuild `/intelligence/decision-hub` into compact agent workspace.

## Key Insights

- Dashboard charts are secondary.
- Decision Queue is primary.
- Evidence and handoff must be always close.

## Requirements

- Compact header.
- Agent run rail.
- Decision Queue.
- Evidence detail panel.
- Sticky action rail.
- Responsive behavior.

## Architecture

- Keep shell in existing PrimeTowerPage initially.
- Extract components only if complexity grows.
- Reuse current Card, Badge, Button, Table primitives.

## Related Code Files

- `prime-os-phase-1/app/src/pages/prime/PrimeTowerPage.tsx`
- `prime-os-phase-1/app/src/components/ui/table.tsx`
- `prime-os-phase-1/app/src/components/system/SummaryMetricCard.tsx`

## Implementation Steps

1. Replace Decision Hub dashboard hero with compact workspace header.
2. Add agent status rail.
3. Add center Decision Queue rows.
4. Add right detail panel driven by selected package.
5. Add action rail.
6. Ensure mobile drawer fallback.

## Todo List

- [ ] Header stats: running, ready, blocked, learned.
- [ ] Agent run rail.
- [ ] Decision Package queue.
- [ ] Evidence panel.
- [ ] Sticky action rail.
- [ ] Mobile layout.

## Success Criteria

- Operator sees agent result queue above fold.
- Selected row controls evidence and handoff preview.
- Page no longer feels like KPI dashboard.

## Risk Assessment

- Risk: too dense.
- Mitigation: compact rows + detail drawer, not all info inline.

## Security Considerations

- Buttons are local/review actions only.
- No silent Demand write.

## Next Steps

Phase 3 agent result reporting.
