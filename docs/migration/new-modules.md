# New Modules

## Prime OS shell and screens

- `src/pages/prime/PrimeOverview.tsx`
- `src/pages/prime/PrimeTowerPage.tsx`
- `src/pages/prime/CommerceSurfacePage.tsx`
- `src/pages/prime/CosPolicyRulePage.tsx`
- `src/pages/prime/CosEventAuditPage.tsx`

## Prime OS data adapter

- `src/lib/prime/prime-data.ts`

## Documentation

- `docs/00-cos-audit.md`
- `docs/01-reuse-plan.md`
- `docs/02-prime-os-system-map.md`
- `docs/03-screen-map.md`
- `docs/04-mock-data-linkage.md`
- `docs/05-demo-flows.md`
- `docs/06-bod-walkthrough.md`

## Mock-data package

- `packages/mock-data/prime-linked-data.json`

## Build artifacts

- `app/node_modules` created by `npm ci`.
- `app/dist` created by `npm run build`.

These artifacts are local verification outputs, not upstream COS source changes.
