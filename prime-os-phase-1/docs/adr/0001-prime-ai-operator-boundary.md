# ADR 0001: Prime AI Operator Boundary

Status: Accepted for Phase 0/1  
Date: 2026-05-04

## Context

Prime AI currently runs as an in-app copilot beside operator surfaces. Phase 0/1 keeps the existing deterministic engine, then hardens contracts before adding LLM runtime or mutating tools.

Prime AI must support operator decisions without becoming the system of record. Commerce, inventory, order, fulfillment, return, customer, and demand state remain owned by their bounded contexts.

## Decision

Prime AI uses four explicit boundaries:

1. UI surface: chat, quick prompts, citations, previews, confirmations, and tool progress.
2. Context gateway: allowlisted read APIs returning scoped snapshots with source, freshness, and citations.
3. AI runtime: intent routing, grounding, response composition, confidence, and safe fallback.
4. Command gateway: schema-validated, permission-checked, confirmed, idempotent, audited mutations.

Phase 1 implements the shared response metadata contract in the current frontend rule engine. It does not add autonomous writes.

## Trust Boundary

- Frontend tools are read-only by default: navigate, open module, copy, preview.
- Draft generation may prefill forms but must not save silently.
- Mutating actions must call backend command endpoints with auth, RBAC, confirmation, idempotency key, and audit record.
- UI/agent events are interaction traces, not immutable business audit.
- Skills/instructions are not permissions.

## Memory Policy

- Phase 1 memory is session-local and minimal: last domain, last intent, last entity reference.
- No long-term memory or checkpoint persistence in Phase 1.
- Future checkpoints must define retention, redaction, encryption, tenant scope, and deletion behavior before implementation.

## Approval Policy

| Risk | Examples | Required UX |
| --- | --- | --- |
| Low | Navigate, copy, read summary | Inline action allowed |
| Medium | Draft product/listing/routing change | Preview diff + explicit confirm |
| High | Order mutation, inventory allocation, publish, delete | Confirm + permission check + audit + escalation path |

## Audit Policy

Every future command gateway call must emit an audit event with:

- actor, tenant, role, plan
- command name, target entity, request payload hash
- policy decision, confirmation timestamp, idempotency key
- result, error, rollback/compensation reference when available
- linked UI trace/run id

## Phase 1 Contract

Every Prime AI assistant response should expose:

- `domain`, `intent`, `actions`, `entityRef`
- `citations` for human-readable provenance
- `grounding` metadata: source, freshness, retrievedAt, confidence, policy tags
- `debug` metadata for tests and operator diagnostics

## Consequences

- The deterministic copilot remains testable while becoming compatible with future LLM/runtime work.
- Grounding quality can be measured before adding model complexity.
- Mutating tools remain blocked until command gateway and audit exist.

## Non-goals

- No LLM provider integration in Phase 1.
- No CopilotKit/AG-UI runtime adoption in Phase 1.
- No autonomous command execution in Phase 1.
