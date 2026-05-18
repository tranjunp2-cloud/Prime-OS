# Service Layout

PrimeOS runs as three application services:

- `apps/web`
  PrimeOS web for the main operating experience.
  Local dev target: `http://127.0.0.1:5177`
- `apps/admin`
  Separate admin control room for CRUD across products, listings, warehouses, and policies.
  Local dev target: `http://127.0.0.1:5174`
- `apps/api`
  File-backed admin API used by the web and admin apps.
  Local dev target: `http://127.0.0.1:8180`

## Local Development

Run each service in its own terminal:

```bash
cd apps/api && npm install && npm run dev
cd apps/admin && npm install && npm run dev
cd apps/web && npm install && npm run dev:5177 -- --host 127.0.0.1
```

`apps/api` requires login for every `/api/*` route. Local dev enables demo credentials only through `npm run dev`:

- Admin: `admin@primeos.local` / `Admin@PrimeOS2026!`
- User: `user@primeos.local` / `User@PrimeOS2026!`

Do not expose those defaults on a public domain.

## VPS Staging Security Checklist

Before exposing a real domain:

1. Copy `.env.example` to `.env`.
2. Set a unique `PRIME_SESSION_SECRET` with at least 32 random characters.
3. Set non-default `PRIME_ADMIN_PASSWORD` and `PRIME_USER_PASSWORD`.
4. Set `PRIME_ALLOWED_ORIGINS` to the exact HTTPS frontend domains.
5. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` at build time. Production builds reject localhost/demo placeholders and Supabase service-role keys.
6. Keep `PRIME_ALLOW_DEMO_CREDENTIALS=false`.
7. Put TLS/HSTS on the outer reverse proxy.
8. Keep the API private on the Docker network; the web/admin containers proxy `/api` internally.
9. Never expose provider secrets, Supabase service-role keys, or private API keys through `VITE_*` frontend variables.

## Docker

From the repository root:

```bash
docker compose up --build
```

Docker refuses to start until the required staging env vars are set. The API is not published to the host by default; route public traffic through the web/admin containers.

Service ports:

- Web: `http://127.0.0.1:5173`
- Admin: `http://127.0.0.1:5174`
- API: private Docker service `api:8080` via the web/admin `/api` proxy
