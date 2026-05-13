# Phase 05: Responsive Validation

Status: completed

## Goal

Verify that the General Dashboard is clean, useful, and stable across routing, responsive breakpoints, keyboard navigation, and build health.

## Local Validation

Run from `prime-os-phase-1/app`:

```bash
npm run build:dev
npx eslint src/pages/prime/PrimeOverview.tsx src/lib/prime/prime-navigation.ts
npm run test -- src/lib/prime/prime-data.test.ts src/lib/prime/prime-navigation.test.ts src/App.legacy-routes.test.tsx
```

If a new helper is extracted, add its focused test and include it in the test command.

## Browser Smoke

Open:

```text
http://localhost:5177/overview
http://localhost:5177/dashboard
http://localhost:5177/
```

Check at widths:

- 375
- 768
- 1024
- 1440

## Assertions

- Page title reads `General Dashboard`.
- Sidebar active item reads `General Dashboard`.
- `/dashboard` redirects to `/overview`.
- Suite readiness chart renders non-empty.
- Status/risk distribution renders with visible labels.
- Dependency flow has readable stage labels and links.
- Quick links navigate into suite routes.
- `Prime AI` button does not cover bottom-right content.
- No horizontal overflow.
- Keyboard tab order is logical.
- Focus rings are visible.
- Reduced motion does not break interaction.

## Accessibility Checks

- Status is shown with text, not color alone.
- Chart containers have useful `aria-label`.
- Icon-only buttons have labels or tooltips.
- Dialog/detail panels can close with Escape.
- Vietnamese/Japanese labels do not overflow key containers.
