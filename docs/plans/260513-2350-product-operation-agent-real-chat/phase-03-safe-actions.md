# Phase 03 - Safe Actions

## Context Links

- Plan: `docs/plans/260513-2350-product-operation-agent-real-chat/plan.md`
- Queue handler: `PrimeProductOperationAgentPage.tsx`
- Audit view: `PrimeProductOperationAgentPage.tsx`

## Overview

Make chat actions real without violating the operator boundary. The agent can prepare and queue work, but approval/execution remains in Agent Queue.

## Requirements

- Inline actions call explicit handlers.
- Queue approval updates or creates a proposal and writes audit context.
- Prepare packet appends a chat/system confirmation and marks the action prepared.
- Open route/Open Kanban/Open Audit remain navigation-only.
- Unsafe actions never mutate state.

## Implementation Steps

1. Lift action handlers to `PrimeProductOperationAgentPage` so `CommandCenter` can update `cards` and `proposals`.
2. Add `handleQueueApprovalFromChat(response)`:
   - find focus proposal by `focusProposalId`
   - if existing and non-terminal, leave status as `needs_approval`
   - if missing, create a proposal draft from the focus card
   - prepend audit trail entry to the focus card
   - append chat confirmation
3. Add `handlePreparePacketFromChat(response)`:
   - append a prepared packet message
   - mark action state as `prepared`
   - do not mutate source route or approval state
4. Disable duplicate action clicks on the same message after success.
5. Keep final approval/rejection/execution only in `AgentQueue`.

## Acceptance Checklist

- [ ] `Queue approval` creates or confirms queue state.
- [ ] `Queue approval` does not set card approval to `approved`.
- [ ] Audit stream shows the chat queue event.
- [ ] Duplicate queue clicks do not create duplicate proposals/events.
- [ ] Unsafe prompt action buttons do not mutate anything.

## Risks

- Proposal ID generation can collide if based on title only. Use a deterministic `chat-${cardId}` proposal ID.
- Queue state and audit state can diverge if handler updates only proposals. Always update the linked card audit trail too.
