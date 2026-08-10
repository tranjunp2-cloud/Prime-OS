# PrimeOS

PrimeOS is organized as a small monorepo for the Phase 1 commerce operating system prototype.

## Repository Layout

- `apps/web/` - main React/Vite operator workspace.
- `apps/admin/` - admin control room for curated data operations.
- `apps/api/` - local file-backed Express API used by the web and admin apps.
- `packages/mock-data/` - linked mock-data contracts shared by the prototype.
- `docs/` - active product, migration, operations, and research documentation.
- `references/` - supporting prototypes, reports, screenshots, and archived legacy docs.

## Local Development

Run the API and web app in separate terminals:

```bash
cd apps/api
npm ci
npm run dev
```

```bash
cd apps/web
npm ci
npm run dev:5177 -- --host 127.0.0.1
```

- Web: `http://127.0.0.1:5177`
- API: `http://127.0.0.1:8180`
- Admin: `cd apps/admin && npm ci && npm run dev`

## Verification

```bash
cd apps/web
npm run lint
npm run test
npm run build

cd ../api
npm test
```

## CI/CD

Pushes to `main` run GitHub Actions and deploy production automatically after verification passes. See `docs/operations/ci-cd.md`.

## Product Scope

The staging-ready Phase 1 prototype is organized around CRM Area, Customer Area, Ecom Area, Intelligence Area, and COS Tower as the control core.
