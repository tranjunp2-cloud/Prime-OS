# Phase 04 — Demand Handoff Preview

## Context Links

- Parent plan: `docs/plans/2026-05-06-intelligence-agent-workspace-rebuild/plan.md`
- Depends on: Phase 01-03

## Overview

- Date: 2026-05-06
- Priority: P1
- Status: pending
- Review status: not reviewed

Create reviewed Demand handoff preview.

## Key Insights

- Demand needs payload, not report text.
- Operator must preview before send.

## Requirements

- Handoff payload panel.
- Demand target selector.
- Editable fields if feasible.
- Approve/send/suppress/request-more-data actions.

## Architecture

- Intelligence prepares handoff.
- Demand executes after acceptance.
- Use local state or URL query first.

## Related Code Files

- `prime-os-phase-1/app/src/pages/prime/PrimeTowerPage.tsx`
- `prime-os-phase-1/app/src/App.tsx`

## Implementation Steps

1. Add handoff payload preview.
2. Add Demand target route.
3. Add primary send action.
4. Add suppress/request-more-data actions.
5. Store sent state locally/mock.

## Todo List

- [ ] Payload preview.
- [ ] Target workspace selection.
- [ ] Send action.
- [ ] Status update.
- [ ] Audit note.

## Success Criteria

- Operator can see objective, audience, channel, CTA, owner, guardrails.
- Handoff status changes after send.
- No Demand mutation happens invisibly.

## Risk Assessment

- Risk: payload too generic.
- Mitigation: strict schema.

## Security Considerations

- No external campaign send.
- Human approval required.

## Next Steps

Phase 5 Demand receive experience.
