# PrimeOS

PrimeOS repository, cleaned so `prime-os-phase-1/` is the clear primary codebase for staging.

## Repository Layout

- `prime-os-phase-1/app/` - main React/Vite application and the only runnable web app in this repository
- `prime-os-phase-1/mock-data/` - linked mock-data contracts used by the Phase 1 shell
- `docs/` - active PrimeOS Phase 1 documentation and migration notes
- `research/` - research notes that informed the system map and wrapper strategy
- `references/` - supporting prototypes, reports, screenshots, and archived legacy docs

## Run Local PrimeOS

Always run both services for local PrimeOS work. The frontend alone is not a complete local build because Account Center and other pages call the backend.

```bash
# Terminal 1: backend API
cd prime-os-phase-1/backend
npm ci
npm run dev

# Terminal 2: frontend app
cd prime-os-phase-1/app
npm ci
npm run dev:5177 -- --host 127.0.0.1
```

- Frontend: `http://127.0.0.1:5177`
- Backend: `http://127.0.0.1:8180`

## Primary Product Scope

The staging-ready Phase 1 prototype is organized around:

- Demand Area
- Customer Area
- Ecom Area
- Intelligence Area
- COS Tower as the control core

## Verification

```bash
cd prime-os-phase-1/app
npm run lint
npm run test
npm run build
```

## Notes

- `prime-os-phase-1/app/` is the deployment path that matters for staging.
- Legacy non-PrimeOS docs were moved to `references/legacy-docs/`.
- Old HTML demos and mockups were moved to `references/prototypes-suite/` to keep the root clean without losing context.
