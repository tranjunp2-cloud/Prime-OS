# CI/CD

PrimeOS deploys from GitHub Actions.

## Flow

- Pull requests to `main`: install dependencies, run API tests, web smoke tests, web build, admin build, and Docker Compose validation.
- Pushes to `main`: run the same verification, then deploy to the production VPS.
- Manual redeploy: run the `PrimeOS CI/CD` workflow with `workflow_dispatch`.

## Production Target

- Web: `https://primeos.btyvietnam.com`
- Admin: `https://admin.primeos.btyvietnam.com`
- API: `https://backend.btyvietnam.com`
- Server path: `/opt/primeos/PrimeOS`

The deploy job syncs the repository to the server, writes `.env` from GitHub Secrets, writes a production `docker-compose.override.yml`, and runs:

```bash
docker compose --env-file .env up -d --build --remove-orphans
```

## Required GitHub Secrets

- `DEPLOY_HOST`
- `DEPLOY_PORT`
- `DEPLOY_USER`
- `DEPLOY_PATH`
- `DEPLOY_SSH_KEY`
- `PRIME_ALLOWED_ORIGINS`
- `PRIME_SESSION_SECRET`
- `PRIME_ADMIN_EMAIL`
- `PRIME_ADMIN_PASSWORD`
- `PRIME_USER_EMAIL`
- `PRIME_USER_PASSWORD`
- `PRIME_ALLOW_DEMO_CREDENTIALS`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_PRIME_ADMIN_API_BASE`
