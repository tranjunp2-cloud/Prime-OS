# Phase 05 — Demand Receive Experience

## Context Links

- Parent plan: `docs/plans/2026-05-06-intelligence-agent-workspace-rebuild/plan.md`
- Depends on: Phase 04

## Overview

- Date: 2026-05-06
- Priority: P2
- Status: partial
- Review status: not reviewed

Let Demand receive and display Intelligence context.

## Key Insights

- Demand must not receive vague insight.
- Demand operator needs context banner and prefilled setup.

## Requirements

- Handoff context banner.
- Pre-filled campaign/action setup.
- Accept/reject local state.
- Link back to Intelligence package.

## Architecture

- Demand owns acceptance and execution state.
- Intelligence package ID remains traceable.

## Related Code Files

- `prime-os-phase-1/app/src/pages/prime/PrimeTowerPage.tsx`
- `prime-os-phase-1/app/src/App.tsx`

## Implementation Steps

1. Read query/local handoff context.
2. Show Intelligence handoff banner.
3. Preselect recommended Demand action.
4. Add accept/reject controls.
5. Link back to package.

## Todo List

- [ ] Context banner.
- [ ] Prefill action.
- [ ] Accept/reject controls.
- [ ] Trace link.

## Success Criteria

- Demand can see where recommendation came from.
- Demand can accept/reject explicitly.
- Campaign/action setup is faster.

## Risk Assessment

- Risk: Demand page overloaded.
- Mitigation: compact banner + collapsible details.

## Security Considerations

- Demand still owns execution approval.

## Next Steps

Phase 6 readback loop.
