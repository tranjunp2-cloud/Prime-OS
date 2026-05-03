# Phase 06 — Lint Debt Cleanup

## Context links
- Parent: `plan.md`
- QA report: `reports/phase-05-qa-full-report.md`

## Overview
Date: 2026-05-03
Priority: P1
Status: completed

## Key Insights
- Phase 5 QA passed, but `npm run lint` failed with 277 errors and 34 warnings.
- The dominant issues are ESLint config debt: base `no-unused-vars` conflicts with TypeScript types, and React automatic runtime is not recognized for JSX type references.

## Requirements
- Make `npm run lint` pass without broad source churn.
- Preserve existing source behavior and UI changes.
- Keep lint rules useful for future CI.

## Architecture
- Prefer ESLint config cleanup over editing hundreds of unrelated source lines.
- Use TypeScript-aware rules for unused variables.
- Declare React as readonly global or otherwise support current JSX/runtime usage.

## Related code files
- `prime-os-phase-1/app/eslint.config.js`

## Implementation Steps
1. Inspect ESLint config and failing rule groups.
2. Disable duplicated base rules for TypeScript files where TS plugin replaces them.
3. Add required globals for current React JSX/type usage.
4. Run lint/build/tests.
5. Commit and push to `main`.

## Todo list
- [x] Inspect lint config
- [x] Patch config root cause
- [x] `npm run lint` pass
- [x] Regression checks pass
- [ ] Commit and push

## Success Criteria
- `cd prime-os-phase-1/app && npm run lint` exits 0.
- Main tests/build still pass.
- Commit pushed to `origin/main`.

## Risk Assessment
- Over-relaxing lint can hide issues; keep change scoped to duplicated/noisy rules only.

## Security Considerations
- No app secrets or auth behavior changes.
