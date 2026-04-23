# Data Flow & Request Lifecycle

> How requests flow through the system, event patterns, and background job processing.

## HTTP Request Lifecycle

```text
Client Request
  │
  ▼
Fastify Server (port 8000)
  │
  ├─ Global Prefix: /api
  ├─ Compression (fastify-compress)
  ├─ Helmet (security headers)
  ├─ CORS (configurable origins)
  │
  ▼
NestJS Pipeline
  │
  ├─ ThrottlerGuard (rate limiting)
  ├─ CorrelationIdInterceptor (X-Correlation-Id)
  ├─ TraceContextInterceptor (distributed tracing)
  ├─ TimeoutInterceptor (configurable timeout)
  ├─ RequestContextInterceptor (CLS context)
  │
  ├─ AuthGuard (Better-Auth JWT validation)
  ├─ OrgGuard (organization context from JWT)
  │
  ▼
Controller → Service → Drizzle ORM → PostgreSQL
  │
  ▼
Response
  ├─ LocationHeaderInterceptor (201 Created)
  ├─ LinkHeaderInterceptor (HATEOAS)
  ├─ DeprecationInterceptor (sunset headers)
  │
  ▼
Error Handling
  ├─ ProblemDetailsFilter (RFC 7807)
  ├─ ThrottlerExceptionFilter
  └─ AllExceptionFilter (fallback)
```

## API Documentation

- Swagger UI: `GET /docs`
- Swagger JSON: `GET /swagger`
- OpenAPI YAML: `GET /openapi.yaml`
- Scalar API Reference: available at configured endpoint

## Background Jobs (BullMQ)

Redis-backed job queues for async processing:

- **Stock Sync Worker** (`towers/inv/inventory/`) — synchronizes inventory levels across channels
- Job queues use Redis connection configured via `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`

## Event-Driven Patterns

- `@nestjs/event-emitter` for intra-process domain events
- Events flow between towers without direct module imports
- Pattern: Tower A emits event → Tower B listens and reacts

## Context Propagation

- `nestjs-cls` (Continuation-Local Storage) carries request context through async boundaries
- `RequestContextFacade` (`@shared-kernel/infrastructure/context`) wraps CLS with typed methods:
  - `getOrgId()` — organization ID (set by `OrgGuard` after membership verification)
  - `getUserId()` — authenticated user ID
  - `getCorrelationId()` — request correlation ID
  - `getTraceId()` — W3C Trace Context ID
- All tower services inject `RequestContextFacade` (NOT raw `ClsService`)
- `OrgGuard` verifies user membership in the `members` table before setting org context

## Logging

- Pino structured JSON logging via `nestjs-pino`
- Every log entry includes: correlation ID, timestamp, level, module context
- Request/response logging with configurable verbosity
