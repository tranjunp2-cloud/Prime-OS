# Overview Style And Demand UX

Date: 2026-05-05
Scope: UI direction and comprehension plan. No implementation.

## Agent Note
- Tried `ui-designer` subagent, but provider credentials failed with `404 No active credentials`.
- This report was completed locally from code/docs.

## Current Style Reference
- `PrimeOverview.tsx` is the strongest "new style" source.
- It is not a marketing hero. It is an operating home:
  - top command bar: what needs attention, critical count, exposure, primary CTAs.
  - metric row: concise readiness cards with cause text.
  - main queue: actions sorted by severity and impact.
  - side radar/status: risk radar + area status map.
  - evidence/activity: proof and recent events.
- Visual language:
  - compact full-width sections
  - 8px card radius
  - restrained borders/shadows
  - dense labels, explicit owners/actions
  - status color used for meaning, not decoration

## Demand Comprehension Problems
- Demand Hub has useful loop pieces but less direct "what do I do first?" hierarchy than Overview.
- Demand detail pages start with product/action hero, then recommended action/action cards. It is operational, but still reads as four separate tools.
- User must infer the Demand loop:
  - source -> campaign/content -> lead/RFQ -> re-engage -> readback.
- Cross-tower guardrails are present, but not consistently elevated into top-level risk/status.
- "Campaign Ops", "Creator Ops" legacy copy can still feel internal/tool-like.

## Design Direction
- Aesthetic: compact operational control room, light-first, evidence-led.
- Purpose: functional decision support. Operator should know next Demand move in under 10 seconds.
- Differentiation anchor: "Demand Pipeline Board" visible on hub and reused as contextual strip on child pages.
- DFII:
  - Aesthetic Impact: 3
  - Context Fit: 5
  - Implementation Feasibility: 5
  - Performance Safety: 5
  - Consistency Risk: 2
  - Score: 16 raw, cap to 15. Excellent.

## Recommended UI Shape
- Demand Hub should mirror Overview:
  - Demand Command Bar: one-sentence answer, guardrail status, primary CTA.
  - Demand Health Row: Source quality, Campaign readiness, Response SLA, Re-engage safety, Outcome readback.
  - Priority Demand Queue: ranked actions across all Demand workspaces.
  - Demand Pipeline Board: Source, Campaign, Content, Lead/RFQ, Re-engage with counts + next owner.
  - Risk/Guardrail Rail: stock, service, finance/cooldown/suppression.
  - Evidence Stack: campaign/source/lead/order proof.
- Demand child pages should be easier:
  - keep route tabs
  - replace large gradient hero with compact command bar
  - put "Recommended now" first
  - convert action cards to queue/table rows on dense screens
  - keep setup dialog and local mock safety note
  - add persistent readback panel: what this action sends to CRM/COS/Intelligence

## Copy Rules
- Prefer operator questions:
  - "Which demand source should scale?"
  - "Which campaign can run safely?"
  - "Which lead/RFQ needs owner now?"
  - "Who can re-enter without spam?"
- Avoid internal labels in body copy:
  - use "Campaigns" over "Campaign Ops"
  - use "Content & Social" over "Creator Ops"
  - use "Leads & RFQs" over "Lead Capture"

## Accessibility / Responsive Risks
- Keep command bar height compact at 2048x768 and 375px mobile.
- Avoid 4-card action rows with long copy on mobile; use stacked queue rows.
- All action cards/buttons need clear accessible names.
- Dialog stays within `100dvh`, keeps focus trap, close path, visible safety copy.
- Status must include text labels, not color-only dots.

## Success Criteria
- `/demand/hub` answers: next Demand move, why, owner, guardrail.
- Each child route has one recommended action above fold.
- Legacy redirects and query focus still work.
- No horizontal scroll at 375px.
- Overview and Demand feel like same system without duplicating unrelated Overview content.
