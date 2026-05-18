# ADR 0002: Prime AI Phase 1-3 Implementation

Status: Accepted  
Date: 2026-05-04

## Scope

This implements the Phase 1-3 foundation without adding external LLM calls, autonomous tools, or mutating commands.

## Phase 1: Response Contract

Prime AI responses now carry grounding metadata alongside existing `domain`, `intent`, `actions`, `citations`, `entityRef`, and `debug` fields.

Grounding includes:

- sources: route context, local store, session memory, knowledge base, or draft prefill
- citations: human-readable provenance
- retrievedAt: runtime timestamp
- freshness: live session, static knowledge, seed snapshot, or unknown
- confidence: high, medium, or low
- policyTags: read-only/default mutation safety labels

## Phase 2: Read-only Context Gateway

`context-gateway.ts` is the read-only boundary for converting route context into snapshots and grounding responses.

Rules:

- no mutation
- no auth bypass
- no direct command execution
- no claim that UI traces are business audit
- all generated metadata must be safe for operator display and tests

## Phase 3: Composer Seam

`response-composer.ts` introduces a composer interface. The current implementation remains deterministic and structured.

Future LLM composer must preserve this contract:

- input: grounded context + selected response candidate
- output: text only, never commands
- commands/actions must still come from allowlisted planner/gateway logic
- unsupported or weakly grounded answers must clarify/refuse

## Files

- `app/src/components/copilot/types.ts`
- `app/src/lib/copilot/context-gateway.ts`
- `app/src/lib/copilot/response-composer.ts`
- `app/src/lib/copilot/context.ts`
- `app/src/hooks/use-global-copilot-engine.ts`
- `app/src/lib/copilot/*.test.ts`

## Validation

- Focused copilot tests: 30 passing
- Development build: passing
- Existing Vite chunk-size warning remains unrelated
