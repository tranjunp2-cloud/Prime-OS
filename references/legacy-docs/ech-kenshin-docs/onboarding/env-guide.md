# Environment Variables Guide

> Explanation of all environment variables. NEVER put real values in this file.

## Server (`apps/server/.env`)

### Core
| Variable | Description | Example |
|----------|-------------|---------|
| `BASE_URL` | Server base URL | `http://localhost:8000` |
| `API_BASE_URL` | API base URL (with prefix) | `http://localhost:8000/api` |
| `PORT` | Server port | `8000` |

### Database
| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgres://postgres:postgres@localhost:5432/ech` |
| `DB_POOL_MAX` | Max connection pool size | `20` |
| `DB_POOL_MIN` | Min connection pool size | `5` |
| `DB_POOL_IDLE_TIMEOUT` | Idle connection timeout (ms) | `30000` |
| `DB_POOL_CONNECTION_TIMEOUT` | Connection timeout (ms) | `10000` |

### Authentication
| Variable | Description | Example |
|----------|-------------|---------|
| `JWT_SECRET` | JWT signing secret (min 32 chars) | `<YOUR_JWT_SECRET>` |
| `JWT_EXPIRES_IN` | Access token expiry | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry | `7d` |
| `BETTER_AUTH_SECRET` | Better-Auth secret (min 32 chars) | `<YOUR_AUTH_SECRET>` |
| `BETTER_AUTH_PATH` | Auth endpoint path | `/api/auth` |

### Redis
| Variable | Description | Example |
|----------|-------------|---------|
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `REDIS_PASSWORD` | Redis password (empty for local) | `` |
| `REDIS_TTL_SEC` | Default cache TTL (seconds) | `3600` |

### API Settings
| Variable | Description | Example |
|----------|-------------|---------|
| `THROTTLER_TTL_SEC` | Rate limit window (seconds) | `60` |
| `THROTTLER_LIMIT` | Max requests per window | `10` |
| `APP_TIMEOUT` | Request timeout (ms) | `30000` |
| `DEPRECATION_SUNSET_IN` | Deprecated endpoint sunset period | `6` |

### Storage (S3/MinIO)
| Variable | Description | Example |
|----------|-------------|---------|
| `S3_ENDPOINT` | S3-compatible endpoint | `http://localhost:9000` |
| `S3_BUCKET` | Storage bucket name | `ech-media` |
| `S3_ACCESS_KEY` | S3 access key | `<YOUR_S3_KEY>` |
| `S3_SECRET_KEY` | S3 secret key | `<YOUR_S3_SECRET>` |
| `S3_REGION` | S3 region | `us-east-1` |
| `S3_FORCE_PATH_STYLE` | Force path-style URLs | `true` |

### CORS
| Variable | Description | Example |
|----------|-------------|---------|
| `ALLOWED_ORIGINS` | Comma-separated allowed origins | `http://localhost:3050,http://localhost:3000` |

### API Docs (Development Only)
| Variable | Description | Example |
|----------|-------------|---------|
| `SWAGGER_TEST_EMAIL` | Test login for Swagger UI | `admin@ech.com` |
| `SWAGGER_TEST_PASSWORD` | Test password for Swagger UI | `<TEST_PASSWORD>` |

## Client Portal (`apps/client-portal/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:8000` |
| `VITE_PORT` | Dev server port | `3050` |

## Database (`packages/database/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string (for migrations) | `postgres://postgres:postgres@localhost:5432/ech` |
