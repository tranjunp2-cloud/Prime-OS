# ADR 0003: Prime AI Phase 4-6 Safe Actions and Evals

Status: Accepted  
Date: 2026-05-04

## Scope

Phase 4-6 adds safe action scaffolding, human confirmation UX, audit-shaped events, and eval coverage. It still does not add autonomous writes, external LLM calls, or high-risk commands.

## Phase 4: Command Gateway Scaffold

The first command is `product.prepare_create_draft`.

- It prepares a medium-risk draft command.
- It opens a prefilled product form only after confirmation.
- It never saves, publishes, deletes, allocates inventory, or mutates order state.
- It includes idempotency and policy tags for future backend migration.

## Phase 5: HITL UX

Copilot draft actions now render as explicit confirm/cancel actions.

- Confirm requires a browser confirmation step.
- Confirm navigates to the prefilled form.
- Cancel records a cancelled local audit trace.
- This is a UI trace only, not the immutable business audit ledger.

## Phase 6: Eval Harness

`eval-matrix.ts` defines golden prompt cases across safety boundaries.

Required checks:

- expected domain
- expected intent
- required grounding policy tag
- no mutation for read/navigation/boundary answers
- draft-before-commit for write draft answers

## Next Gate Before Production Writes

Before real backend command execution:

1. Move command gateway to authenticated backend endpoint.
2. Add RBAC and tenant checks.
3. Persist immutable audit events server-side.
4. Add replay/idempotency tests.
5. Add red-team prompts for prompt injection and unauthorized mutation.
