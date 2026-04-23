# Developer Setup Guide

> From zero to running in 5 minutes.

## Prerequisites

- **Node.js** >= 18 (recommend 20)
- **pnpm** >= 9 (`corepack enable && corepack prepare pnpm@9 --activate`)
- **Docker** & Docker Compose (for PostgreSQL, Redis, MinIO)
- **Git** with configured user name/email

## Step 1: Clone & Install

```bash
git clone <repo-url> ech-kenshin
cd ech-kenshin
pnpm install
```

## Step 2: Start Infrastructure

```bash
docker compose up -d
```

This starts:
- **PostgreSQL 17** on port 5432 (user: `postgres`, password: `postgres`, db: `ech`)
- **Redis 7** on port 6379
- **MinIO** on port 9000 (console: 9001, user: `minioadmin`, password: `minioadmin`)

## Step 3: Configure Environment

```bash
# Copy example env files
cp apps/server/.env.example apps/server/.env
cp apps/client-portal/.env.example apps/client-portal/.env
# admin-portal uses hardcoded defaults — no .env needed for local dev
```

See `docs/onboarding/env-guide.md` for detailed env var explanations.

## Step 4: Setup Database

```bash
pnpm db:push      # Push schema to database (dev only)
pnpm db:seed      # Seed initial data (optional)
```

## Step 5: Run Development Server

```bash
pnpm dev           # Start all apps in parallel
```

- Server: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Client Portal: http://localhost:3050
- Admin Portal: http://localhost:5174
- MinIO Console: http://localhost:9001

## AI Tool Setup

See `.ai/setup.md` for instructions on configuring your AI coding tool (Claude Code, Cursor, Copilot, etc.).

## Useful Commands

```bash
pnpm dev                              # Start all apps
pnpm build                            # Build all packages
pnpm lint                             # Lint all packages
pnpm lint:fix                         # Lint and auto-fix
pnpm format                           # Format all packages
pnpm check-types                      # TypeScript type checking
pnpm --filter @ech/server test        # Run server tests
pnpm --filter @ech/server test:watch  # Watch mode
pnpm db:studio                        # Open Drizzle Studio
```

## Troubleshooting

- **Port conflict**: Check if ports 5432, 6379, 8000, 3050, 5174, 9000, 9001 are in use
- **Docker issues**: Run `docker compose down -v && docker compose up -d` to reset
- **pnpm install fails**: Delete `node_modules` and `pnpm-lock.yaml`, then `pnpm install`
- **DB push fails**: Ensure PostgreSQL is running: `docker compose ps`
