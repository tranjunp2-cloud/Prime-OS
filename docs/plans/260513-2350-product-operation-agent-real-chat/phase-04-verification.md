# Phase 04 - Verification

## Context Links

- Plan: `docs/plans/260513-2350-product-operation-agent-real-chat/plan.md`
- Tests: `prime-os-phase-1/app/src/lib/prime/product-operation-agent-seed-data.test.ts`

## Overview

Lock the real chat behavior with focused unit tests and a browser smoke. The critical regression is that free-form chat must not collapse back into a fake single approval response.

## Unit Tests

Add or extend tests for:

- `resolveOperatingChatIntent('hello') === 'greeting'`
- unknown prompt returns clarify response
- unsafe mutation returns blocked response
- known prompts still return governed responses with evidence and safe actions
- queue action helper is idempotent
- queue action does not approve or execute

## Browser Smoke

Run against `http://127.0.0.1:5177/intelligence/product-operation-agent?view=command`:

1. Submit `hello`.
2. Assert response says welcome/what can I help with and does not include `4 approvals need operator attention`.
3. Submit `Prepare inventory risk packet`.
4. Assert both prompts remain visible.
5. Click `Queue approval`.
6. Navigate to Queue and assert relevant proposal is still `Needs approval`.
7. Navigate to Audit and assert chat queue/prepared event appears.
8. Test mobile viewport for no horizontal overflow.

## Commands

```bash
cd /Users/admin/Desktop/PrimeOS_LarkVer/prime-os-phase-1/app
npm test -- src/lib/prime/product-operation-agent-seed-data.test.ts src/lib/prime/prime-navigation.test.ts src/lib/prime/prime-product-settings-nav.test.ts src/lib/i18n/i18n-foundation.test.ts
npm run build:dev
npm run lint
```

## Acceptance Checklist

- [ ] Unit tests pass.
- [ ] Build passes.
- [ ] Lint has no new errors.
- [ ] Browser smoke passes desktop and mobile.
- [ ] Existing Kanban, Queue, and Audit views still work.

## Residual Risk

This remains a deterministic local agent. It will feel like a real chat interface because the session and actions are real, but it is not an LLM-backed assistant until a backend AI adapter is planned and implemented separately.
