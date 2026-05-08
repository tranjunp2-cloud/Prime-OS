# Phase 03 — Contextual Prime AI Drawer

## Context links
- Parent: `plan.md`
- Depends on: Phase 02 selected decision state
- References: Intercom AI dashboard, AgentTraceHQ, SealVera, AgentReceipt

## Overview
- Date: 2026-05-06
- Description: Replace static readout/floating ambiguity with contextual explain/action drawer.
- Priority: P1
- Implementation status: completed
- Review status: completed

## Key Insights
- Prime AI should be tied to selected decision, not global ornament.
- Auditability and safe-action boundaries must be visible.

## Requirements
- Add drawer/panel showing explanation, evidence chain, draft action, guardrails, audit note.
- Keep allowed actions explicit: explain, draft, request approval/handoff.
- Avoid silent execution or hidden state mutation.

## Architecture
- Reuse existing Dialog/Sheet/Card/Button primitives if present.
- Keep Prime AI content passed as props/mock data from Decision Hub model.
- Consider docking panel on desktop and collapsible sheet on mobile.

## Related code files
- `prime-os-phase-1/app/src/pages/prime/PrimeTowerPage.tsx`
- `prime-os-phase-1/app/src/components/prime/PrimeOperatingSystem.tsx`
- Existing Prime AI/copilot components if already imported in this route

## Implementation Steps
1. Inventory existing Prime AI/readout/floating button code.
2. Define selected decision drawer content model.
3. Implement desktop side panel + mobile sheet/accordion fallback.
4. Add guardrail labels and audit note.
5. Ensure no duplicate Prime AI CTAs compete.

## Todo list
- [x] Locate current Prime AI readout/button.
- [x] Build contextual panel.
- [x] Add safe-action labels.
- [x] Remove or demote floating CTA on this screen.

## Success Criteria
- Selecting a decision changes explain/action context.
- AI recommendation shows evidence and guardrails before action.
- Operator sees audit note before handoff.

## Risk Assessment
- Risk: user may perceive AI can execute. Mitigation: copy says draft/request/handoff only.

## Security Considerations
- No irreversible action buttons.
- Audit note visible for AI-generated drafts.

## Next steps
- Continue Phase 04 QA.
