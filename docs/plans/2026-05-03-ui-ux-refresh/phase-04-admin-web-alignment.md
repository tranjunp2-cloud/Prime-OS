# Phase 04 — Admin Web Alignment

## Context links
- Parent: `plan.md`

## Overview
Date: 2026-05-03
Priority: P2
Status: completed

## Key Insights
- Admin app is standalone CSS, likely visually divergent from main app.
- It should feel like a control room, not a separate product.

## Requirements
- Align colors, typography, radius, cards, sidebar, tables, forms with PrimeOS tokens.
- Preserve auth/API flows.
- Improve CRUD usability: clear labels, inline errors, loading states, destructive confirmations.

## Architecture
- Update `admin-web/src/index.css` and surgical JSX class/structure changes in `App.tsx`.
- No shared-package extraction unless necessary.

## Related code files
- `prime-os-phase-1/admin-web/src/App.tsx`
- `prime-os-phase-1/admin-web/src/index.css`

## Implementation Steps
1. Map admin screens/states.
2. Port canonical tokens visually into admin CSS.
3. Polish login, sidebar, toolbar, forms, data lists.
4. Verify backend login/API still works.

## Todo list
- [x] Admin state inventory
- [x] Token alignment
- [x] Form/table polish
- [x] Auth smoke

## Success Criteria
- Admin/main feel same family.
- Login and CRUD still work.
- Form labels/errors clear.

## Risk Assessment
- Plain CSS can create wide side effects; change selectors carefully.

## Security Considerations
- Do not weaken login/session behavior.

## Next steps
Full QA pass.
