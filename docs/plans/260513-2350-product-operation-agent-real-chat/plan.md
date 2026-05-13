---
title: "Operation Agent Real Chat"
description: "Turn the Command Center from a static command mockup into a session-local governed chat workspace with real transcript state, intent handling, and safe action handoff."
status: completed
priority: P0
effort: 8h
created: 2026-05-13
owner: "PrimeOS"
tags: [prime-os, intelligence, product-operation-agent, chat, command-center]
blockedBy: []
blocks: []
relatedPlans:
  - docs/plans/2026-05-06-intelligence-agent-workspace-rebuild
  - docs/plans/2026-05-13-product-operation-agent-command-center-chat
sourceResearch:
  - .lazyweb/design-research/ai-command-center-chat-2026-05-13/report.md
targetFiles:
  - prime-os-phase-1/app/src/pages/prime/PrimeProductOperationAgentPage.tsx
  - prime-os-phase-1/app/src/lib/prime/product-operation-agent-seed-data.ts
  - prime-os-phase-1/app/src/lib/prime/product-operation-agent-seed-data.test.ts
---

# Operation Agent Real Chat

## Overview

The current Command Center looks like a chat, but behaves like a mockup. It stores one `operatorPrompt`, one `activeCommandId`, and one derived response. Any free-form input is collapsed into a small command enum, so a prompt like `hello` still produces an approval-sweep answer. The user experience is not a real chat session because there is no transcript history, no per-message status, no clarification path, no safe action state, and no durable relation between chat actions and Queue/Audit state.

This plan turns the Command Center into a real session-local chat frame while keeping the current MVP safety boundary: the agent can prepare, route, summarize, and queue review work, but cannot silently mutate source suites.

## Scope Challenge

Build the smallest real chat that fixes the fake behavior:

- Real transcript: multiple operator and agent messages in order.
- Real prompt handling: greetings, unknown prompts, destructive asks, and known operating commands produce different responses.
- Real state transitions: sending creates a pending message, then an agent message; inline actions update chat action state and, where safe, Queue/Audit state.
- Real chat frame: scrollable message list, bottom composer, focus/keyboard behavior, and mobile-safe layout.
- No backend, no external LLM, no persistence beyond the current browser session for this phase.

Do not build a generic ChatGPT clone. The Operation Agent remains grounded in current operating cards, proposals, source routes, evidence, approval state, and audit trail.

## Current State

Relevant implementation:

- `CommandCenter` in `PrimeProductOperationAgentPage.tsx` keeps `activeCommandId`, `operatorPrompt`, and `composerValue`.
- `handleSubmitCommand()` calls `resolveOperatingCommandId(nextPrompt)`, then replaces the visible prompt/response.
- `resolveOperatingCommandId()` defaults every unrecognized prompt to `approval_sweep`.
- `buildOperatingCommandResponse()` returns useful governed content, but it is not wrapped in a real conversation model.
- Queue and Audit state already exist in the parent page and can be reused for safe action handoff.

## Product Decision

### Build

Create a session-local agent chat runtime inside Operation Agent:

```text
Operator prompt
  -> classify intent
  -> append operator message
  -> append pending agent message
  -> resolve deterministic response
  -> render governed response card inside transcript
  -> optional safe action updates Queue/Audit state
```

### Do Not Build

- No live LLM call.
- No backend streaming.
- No source-suite mutation.
- No global Prime AI rewrite.
- No persistence/memory layer unless explicitly added later.

## Architecture

### New Chat Types

Add types near the Operation Agent domain model or in a small page-local helper if scope stays local:

```ts
type OperatingChatIntent =
  | 'approval_sweep'
  | 'risk_packet'
  | 'blocked_work'
  | 'audit_summary'
  | 'greeting'
  | 'clarify'
  | 'unsafe_mutation';

type OperatingChatMessage = {
  id: string;
  role: 'operator' | 'agent' | 'system';
  content: string;
  createdAt: string;
  status: 'sent' | 'thinking' | 'ready' | 'blocked' | 'error';
  intent?: OperatingChatIntent;
  response?: OperatingCommandResponse;
  actionState?: 'none' | 'queued' | 'opened' | 'prepared' | 'blocked';
};
```

### Intent Handling

Replace the current “unknown means approval sweep” behavior:

| Input class | Expected result |
|---|---|
| Greeting: `hello`, `hi`, `xin chào` | Short agent welcome, suggested commands, no fake approval answer |
| Known command | Governed answer with evidence/action preview |
| Ambiguous command | Clarifying answer with command chips |
| Unsafe mutation: `approve all`, `execute`, `delete`, `update source` | Blocked safety answer, route to Queue/Audit |
| Empty submit | No new message; keep composer focused |

### Chat UI

The center should become the real primary frame:

- Header: agent name, status badge, safety boundary.
- Scrollable transcript with message groups and timestamps.
- Operator bubbles on the right, agent bubbles/cards on the left.
- Typing/thinking row before deterministic response resolves.
- Bottom composer always visible inside the chat card.
- Prompt chips become quick-send buttons that append messages, not just swap state.
- Action preview becomes tied to the selected/latest agent message.

### Safe Actions

Inline actions must call handlers, not only navigate:

- `Open source route`: link only.
- `Open in Kanban`: link only.
- `Prepare packet`: append an agent/system message that packet is prepared for review.
- `Queue approval`: update or create a proposal in Agent Queue, append audit trail, mark chat action as queued.
- `Open audit`: link only.

All action labels stay non-destructive. `Approve` remains only inside Agent Queue.

## Phases

| Phase | Status | Output |
|---|---|---|
| 01 | completed | Chat domain model, reducer, intent classifier, deterministic response adapter |
| 02 | completed | Real chat frame UI and responsive behavior |
| 03 | completed | Safe inline actions wired to Queue/Audit state |
| 04 | completed | Tests, smoke verification, and regression checklist |

## Dependencies

- Uses the current Operation Agent route and seed data already added in this branch.
- Related to `docs/plans/2026-05-06-intelligence-agent-workspace-rebuild`, but does not block it. This is a route-level refinement inside the broader Intelligence workspace direction.
- Related to `docs/plans/2026-05-13-product-operation-agent-command-center-chat`, but supersedes the mockup-like implementation detail with real chat behavior.

No cross-plan blocking relationship is required because this plan does not need unfinished output from another plan and does not prevent the broader Intelligence plan from continuing.

## Success Criteria

- Sending `hello` returns a welcome/clarify response, not an approval report.
- Sending multiple prompts creates multiple transcript turns without deleting prior turns.
- Known prompt chips append real chat messages and update the latest action preview.
- `Queue approval` changes Queue state and adds visible audit context without approving automatically.
- Destructive prompts are blocked with an explicit safety response.
- Command Center has no horizontal overflow at desktop or mobile widths.
- Tests cover classifier, reducer/action behavior, unknown prompts, unsafe prompts, and queue/audit handoff.

## Verification Commands

Run from `prime-os-phase-1/app`:

```bash
npm test -- src/lib/prime/product-operation-agent-seed-data.test.ts src/lib/prime/prime-navigation.test.ts src/lib/prime/prime-product-settings-nav.test.ts src/lib/i18n/i18n-foundation.test.ts
npm run build:dev
npm run lint
```

Add a small Playwright smoke script or spec for:

- `hello` response is not approval sweep.
- two submitted prompts remain visible.
- prompt chip appends a new message.
- `Queue approval` changes Queue/Audit state.
- mobile viewport has no horizontal overflow.

## Implementation Result

Completed on 2026-05-14.

- Command Center now keeps a real session-local transcript with operator, agent, and system/action messages.
- Greeting, unclear, and unsafe prompts no longer fall through to fake approval-sweep answers.
- Known operating prompts append new chat turns and produce governed response cards with evidence, policy checks, approval state, and safe actions.
- `Queue approval` updates Agent Queue and Audit state without approving automatically.
- Transcript persists when switching between Command Center, Queue, Kanban, and Audit.
- Terminal queue decisions block duplicate chat queue routing with a truthful system message.

Verified:

```bash
npm test -- src/lib/prime/product-operation-agent-seed-data.test.ts src/lib/prime/prime-navigation.test.ts src/lib/prime/prime-product-settings-nav.test.ts src/lib/i18n/i18n-foundation.test.ts
npm run build:dev
npm run lint
```

Browser smoke covered desktop transcript persistence, unsafe prompt blocking, queue/audit handoff, and mobile overflow.

## Cook Handoff

After approval, implement with:

```bash
/ck:cook /Users/admin/Desktop/PrimeOS_LarkVer/docs/plans/260513-2350-product-operation-agent-real-chat/plan.md --auto
```
