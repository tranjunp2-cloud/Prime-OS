# Phase 04: Quick Links And Progressive Detail

Status: completed

## Goal

Make the page a useful launchpad into suites, products, and functions while keeping dense details available only when needed.

## Quick Link Groups

Minimum groups:

- **Intelligence:** Operation Agent, KPI Dashboard, Signals Board, Launch Decisions.
- **Ecom/COS:** Products, Inventory Brain, Orders, Fulfillment.
- **Demand:** Campaigns, Calendar/Composer if available, Leads/RFQs or Demand queue route if available.
- **Finance:** Fin Support, funding readiness, blockers/review routes anchors if supported.
- **Customer:** CRM Compact, Service, Customer Profile where routes exist.
- **Settings/Admin:** Product Settings, Admin Setup only if useful and already routed.

## Progressive Detail

Move dense content behind interaction:

- Top priorities: list rows with one primary CTA and `Details`.
- Evidence/activity: lower section or dialog, not first viewport.
- Dependency node details: expand row or open dialog.
- Audit proof: keep visible only in audit/detail mode.

## CTA Rules

- Each suite card gets one primary action.
- Deep links are compact text buttons with icon + label.
- Avoid full sidebar duplication.
- Avoid equal visual weight for every link.

## Tasks

1. Add quick access hub from the derived view model.
2. Convert `PriorityMissionCard` content into compact list rows where possible.
3. Add detail dialog/drawer only for content currently occupying too much space.
4. Preserve existing `Prime AI` button behavior.
5. Verify all `Link` targets exist in `App.tsx` or existing redirects.

## Acceptance

- User can jump to each major suite from General Dashboard.
- Priority detail remains available but no longer dominates the first screen.
- Every quick link has clear label text and a minimum practical tap target.
- No link points to a dead route.
