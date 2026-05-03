# Phase 01 — Design System Foundation

## Context links
- Parent: `plan.md`
- Files: `prime-os-phase-1/app/src/index.css`, `prime-os-phase-1/app/tailwind.config.*`, `prime-os-phase-1/app/src/components/ui/*`

## Overview
Date: 2026-05-03
Priority: P1
Status: completed

## Key Insights
- Main app already tokenized; safest path is refine + document tokens.
- Admin drift should be handled after main tokens stabilize.

## Requirements
- Define canonical PrimeOS visual language: surfaces, area colors, statuses, typography, radius, elevation, motion.
- Keep light-first with robust dark tokens.
- Preserve existing component API.

## Architecture
- Token updates in CSS variables.
- Component defaults via `components/ui` variants only if required.
- Optional docs note for token usage.

## Related code files
- `prime-os-phase-1/app/src/index.css`
- `prime-os-phase-1/app/src/components/ui/button.tsx`
- `prime-os-phase-1/app/src/components/ui/card.tsx`
- `prime-os-phase-1/app/src/components/ui/badge.tsx`
- `prime-os-phase-1/app/src/components/ui/table.tsx`

## Implementation Steps
1. Audit current token usage with `rg`.
2. Normalize typography scale + mono/data usage.
3. Normalize radius/elevation/borders for ops dashboard.
4. Add motion/focus utility rules respecting `prefers-reduced-motion`.
5. Remove/avoid inconsistent one-off visual values only where touched.

## Todo list
- [x] Token audit
- [x] Typography + spacing rules
- [x] Focus/motion rules
- [x] Component primitive polish

## Success Criteria
- No broken class names.
- Existing pages render with same layout but cleaner hierarchy.
- Focus states visible.

## Risk Assessment
- Token changes can affect many pages; keep deltas small.

## Security Considerations
- No secrets/env changes.

## Next steps
Proceed to shell/nav only after token foundation builds.
