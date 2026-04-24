# Prime OS Service Layout

`prime-os-phase-1` now runs as three separate services:

- `app`
  PrimeOS web for the main operating experience.
  Local dev target: `http://127.0.0.1:5173`
- `admin-web`
  Separate admin control room for CRUD across products, listings, warehouses, and policies.
  Local dev target: `http://127.0.0.1:5174`
- `backend`
  File-backed admin API used by `admin-web`.
  Local dev target: `http://127.0.0.1:8180`

## Local development

Run each service in its own terminal:

```bash
cd prime-os-phase-1/backend && npm install && npm run dev
cd prime-os-phase-1/admin-web && npm install && npm run dev
cd prime-os-phase-1/app && npm install && npm run dev
```

`backend` dev mode enables `PRIME_DEMO_ADMIN_ENABLED=true` so the local admin web can exercise CRUD flows. Production `npm start` keeps header-selected admin privileges disabled unless that demo flag is set explicitly.

## Docker

From `prime-os-phase-1`:

```bash
docker compose up --build
```

Service ports:

- Prime web: `http://127.0.0.1:5173`
- Admin web: `http://127.0.0.1:5174`
- Backend: `http://127.0.0.1:8180/health`
