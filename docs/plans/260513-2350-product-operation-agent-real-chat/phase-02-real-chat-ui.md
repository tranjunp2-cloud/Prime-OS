# Phase 02 - Real Chat UI

## Context Links

- Plan: `docs/plans/260513-2350-product-operation-agent-real-chat/plan.md`
- Component: `prime-os-phase-1/app/src/pages/prime/PrimeProductOperationAgentPage.tsx`

## Overview

Turn the middle panel into an actual chat frame: scrollable transcript, persistent composer, message groups, status rows, and responsive behavior. The UI should stop looking like a static card demo.

## Requirements

- Transcript displays every operator and agent message in order.
- Composer sends real messages with Enter and supports Shift+Enter newline.
- Prompt chips call the same send path as typed prompts.
- The latest agent response drives the right-side action preview.
- The context rail remains compact and secondary.
- Mobile stacks transcript first, then composer, then action/context sections.

## Implementation Steps

1. Replace `activeCommandId`/`operatorPrompt` rendering with `messages` state.
2. Initialize conversation with a small system/agent welcome message and suggested commands.
3. Render message components by role:
   - operator bubble
   - agent text response
   - governed agent response card
   - safety/clarification card
4. Add a thinking state, even if deterministic response resolves after a short timeout or immediate state transition.
5. Add auto-scroll to latest message using a `ref`.
6. Move composer into the chat frame bottom, with clear focus and disabled send on empty input.
7. Ensure no static mock text remains tied to the last command only.

## Acceptance Checklist

- [ ] Two submitted prompts remain visible as four transcript messages.
- [ ] Prompt chips append messages instead of replacing the one visible prompt.
- [ ] Composer disables or no-ops on empty input.
- [ ] Latest agent message is announced with `aria-live="polite"`.
- [ ] Mobile layout has no horizontal overflow.

## Risks

- Too much nested card UI can make the chat feel like the old dashboard. Keep the transcript visually simple.
- Sticky composer can overlap content on small screens. Use padding-bottom and safe-area spacing.
