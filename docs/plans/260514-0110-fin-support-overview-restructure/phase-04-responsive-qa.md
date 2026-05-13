# Phase 04: Responsive QA

Status: completed

## Context

This is an enterprise SaaS finance surface. It needs to be clear at desktop widths, usable on narrower screens, and careful about finance wording.

## Requirements

- No horizontal scroll at 375, 768, 1024, and 1440 widths.
- One primary action per screen region.
- Keyboard and screen reader support for tabs, rows, dialogs, charts, and icon-only controls.
- Preserve conservative finance language.

## QA Plan

Run:

```bash
cd /Users/admin/Desktop/PrimeOS_LarkVer/prime-os-phase-1/app
npm run lint
npm run test
npm run build
```

Browser smoke:

- Open `http://localhost:5177/finance/fin-support?tab=overview`.
- Check first viewport hierarchy.
- Check grouped navigation active state for each tab value.
- Open a blocker detail.
- Open a route detail.
- Resize to 375, 768, 1024, and 1440.

## Accessibility Checks

- [x] All chart values have textual equivalents.
- [x] Icon-only buttons have `aria-label`.
- [x] Detail surface traps focus and returns focus on close.
- [x] Focus rings are visible.
- [x] Status is not conveyed by color alone.
- [x] Touch targets are at least 44px where feasible.

## Copy Checks

- [x] No “approved”, “guaranteed”, or “eligible” promise unless already present as bounded preview.
- [x] Use “review-ready”, “bank-ready package”, “indicative range”, and “route fit”.
- [x] Guardrail copy remains visible near score/package summary.
- [x] CTA labels are concrete: `Resolve blocker`, `Prepare package`, `View route`, `Open package`.

## Risks

- Large chart labels can overflow on mobile.
- Sticky headers can hide anchors if tab content jumps.
- Build may expose existing type issues in unused finance components; handle only blockers caused or surfaced by this work.
