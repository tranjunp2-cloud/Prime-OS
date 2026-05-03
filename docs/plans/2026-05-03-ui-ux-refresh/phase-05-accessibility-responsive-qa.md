# Phase 05 — Accessibility Responsive QA

## Context links
- Parent: `plan.md`

## Overview
Date: 2026-05-03
Priority: P1
Status: completed

## Key Insights
- UI refresh is only successful if keyboard/mobile/build all pass.

## Requirements
- WCAG-oriented checks: contrast, focus, labels, keyboard paths.
- Responsive checks: 375, 768, 1024, 1440 widths.
- Reduced-motion compatibility.
- Build/test verification.

## Architecture
- Use existing Vitest/Playwright if available.
- Add tests only where adjacent patterns exist and risk is high.

## Related code files
- `prime-os-phase-1/app/package.json`
- `prime-os-phase-1/app/playwright.config.*`
- `prime-os-phase-1/app/src/**/*.test.*`
- `prime-os-phase-1/admin-web/package.json`

## Implementation Steps
1. Run targeted lint/build/test after each major area.
2. Browser smoke main/admin.
3. Keyboard nav smoke: sidebar, command, dialogs, forms.
4. Mobile width smoke: no horizontal scroll, usable nav/tables.
5. Record remaining non-blockers.

## Todo list
- [x] Main build/test
- [x] Admin build
- [x] Browser smoke
- [x] A11y checklist
- [x] Final report

## Success Criteria
- `npm run build:dev` passes in main app.
- Admin `npm run build` passes.
- No critical a11y/responsive regressions found.

## Risk Assessment
- Existing tests may be unrelated/flaky; do not fix unrelated failures.

## Security Considerations
- Validate auth screens still require login.

## Next steps
Ask user before commit/push.
