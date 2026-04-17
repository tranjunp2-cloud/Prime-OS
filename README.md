# PrimeOS

Prime OS Phase 1 workspace.

This repository contains the COS-first Prime OS prototype and internal research notes:

- `prime-os-phase-1/` - board-ready prototype that wraps the existing COS mock as the Ecom/COS control core.
- `research/` - repository analysis and architecture extraction notes.
- `docs/` - local product/architecture working notes.

## Phase 1 Prototype

```bash
cd prime-os-phase-1/app
npm ci
npm run dev
```

The prototype is designed around:

- Demand Area
- Customer Area
- Ecom Area
- Intelligence Area
- COS Tower as the control core

Build verification:

```bash
cd prime-os-phase-1/app
npm run build
```
