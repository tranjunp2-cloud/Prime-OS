# Phase 01 - Chat Runtime

## Context Links

- Plan: `docs/plans/260513-2350-product-operation-agent-real-chat/plan.md`
- Source: `prime-os-phase-1/app/src/pages/prime/PrimeProductOperationAgentPage.tsx`
- Domain data: `prime-os-phase-1/app/src/lib/prime/product-operation-agent-seed-data.ts`

## Overview

Replace single-response state with a real session-local conversation model. Keep deterministic logic, but stop treating every unknown prompt as an operating command.

## Requirements

- Add `OperatingChatIntent`, `OperatingChatMessage`, and action-state types.
- Add a classifier that distinguishes known commands, greetings, ambiguous prompts, empty prompts, and unsafe mutation prompts.
- Add reducer/helpers for appending operator messages, pending agent messages, resolving responses, and updating message action state.
- Preserve current `OperatingCommandResponse` for governed answers.
- Add response shapes for greeting, clarify, and unsafe mutation.

## Implementation Steps

1. Refactor `resolveOperatingCommandId()` into a safer classifier or add a wrapper such as `resolveOperatingChatIntent(input)`.
2. Make unknown/ambiguous inputs return `clarify`, not `approval_sweep`.
3. Add blocked unsafe mutation detection for verbs like `approve all`, `execute`, `delete`, `apply`, `update source`, and `auto approve`.
4. Add chat message creation helpers with stable IDs suitable for tests.
5. Keep all helpers pure where possible so tests can validate them without rendering React.

## Acceptance Checklist

- [ ] `hello` maps to `greeting`.
- [ ] Empty input does not create a message.
- [ ] Unknown input maps to `clarify`.
- [ ] Unsafe mutation maps to `unsafe_mutation`.
- [ ] Known commands still map to governed command responses.
- [ ] Existing seed-data tests still pass.

## Risks

- If classifier is too broad, valid operating prompts may be blocked. Keep unsafe detection explicit and narrow.
- If IDs use only `Date.now()`, tests become flaky. Use injectable ID/time helpers or deterministic fallbacks in unit tests.
