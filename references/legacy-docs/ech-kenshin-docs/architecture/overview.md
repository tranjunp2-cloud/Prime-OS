# System Architecture Overview

> ECH-Kenshin system architecture, tech stack, and deployment topology.

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Backend Runtime | Node.js 20 + NestJS 11 | Fastify v5 adapter, SWC compiler |
| Frontend | React 18 + React Router v6 | Vite dev server, TanStack Query v5 |
| Database | PostgreSQL 17 | Drizzle ORM, RLS for multi-tenancy |
| Cache/Queue | Redis 7 | BullMQ for background jobs |
| Object Storage | MinIO (S3-compatible) | Product media, documents |
| Auth | Better-Auth | Organization plugin, JWT tokens |
| Validation | Zod v4 | Runtime schema validation |
| Logging | Pino | Structured JSON logging |
| CI/CD | GitHub Actions | Docker multi-stage builds |
| Hosting | DigitalOcean + Cloudflare | Dokploy for container orchestration |

## Monorepo Layout

```text
ech-kenshin/
├── apps/
│   ├── server/           NestJS 11 backend (Fastify v5, port 8000)
│   ├── client-portal/    React SPA — primary user interface (port 3050)
│   └── admin-portal/     React SPA — taxonomy & org management (port 5174)
├── packages/
│   ├── database/         Drizzle ORM schemas (source of truth)
│   ├── core/             Shared utilities (@ech/core)
│   ├── ui/               Headless UI components — shadcn-based (@ech/ui)
│   ├── form-engine/      Dynamic form generation (@ech/form-engine)
│   ├── amazon-wizard/    Amazon listing wizard (@ech/amazon-wizard)
│   ├── biome-config/     Shared Biome presets
│   └── typescript-config/ Shared tsconfig presets
```

Orchestrated by **pnpm workspaces** + **Turborepo** (topological builds).

## Domain Towers (Modular Monolith)

The backend is organized into isolated domain modules ("Towers"). Each tower owns its routes, services, and database schemas.

| Tower | Path | Scope |
|-------|------|-------|
| **PM** (Product Master) | `apps/server/src/towers/pm/` | Catalog, EAV attributes, variants, families, classifications, channel mappings, media, listings |
| **INV** (Inventory) | `apps/server/src/towers/inv/` | Multi-warehouse stock, optimistic locking, append-only ledger, stock sync |
| **OMS** (Order Management) | `packages/database/src/schemas/oms/` | Order ingestion, order items, status history (schema defined, tower implementation pending) |
| **FUL** (Fulfillment) | `packages/database/src/schemas/ful/` | Shipments, shipment items, fulfillment rules (schema defined, tower implementation pending) |

### PM Tower Submodules (17):

attribute-groups, attributes, bootstrap, catalog, categories, channels, classifications, connectors, extensible-enums, families, global-update, gpc-seed, listings, media, products, provisioning, schema-sync

Key split services within submodules:
- **listings**: `ListingsCrudService`, `ListingsFormService`, `ListingsSubmissionService`, `ListingsMarketplaceService` (mappings), `CatalogBrowseService` (search/tree), `ListingsImportService` (import orchestration)
- **catalog**: `CatalogController` (API) + `CatalogResolutionStrategy` (routes search to system or channel connectors)
- **connectors/amazon**: `AmazonConnector` (business ops) + `AmazonAuthClient` (auth/HTTP layer)
- **connectors/rakuten-public**: `RakutenPublicConnector` (system-level singleton) + `RakutenPublicClient` (rate-limited HTTP)
- **connectors/registries**: `ConnectorRegistry`, `ValueUnwrapperRegistry`, `PayloadBuilderRegistry`
- **gpc-seed**: `GlobalTaxonomyImporter` + `FamilyTemplateImporter`
- **schema-sync**: `SchemaSyncService` + `AutoMappingGenerator`

### INV Tower Submodules (2):

inventory (stock management + sync worker), warehouses

### Shared Kernel (`apps/server/src/shared-kernel/infrastructure/`)

Cross-cutting infrastructure available globally:
- **context/**: `RequestContextFacade` — typed wrapper for CLS access (`getOrgId()`, `getUserId()`, etc.)
- **utils/**: `firstOrNull`, `ensureCodeUnique`, `buildCursorMeta`, `encodeCursor/decodeCursor`, `replaceRelation`
- **auth/**: `AuthGuard`, `OrgGuard` (with membership verification), `BetterAuthMiddleware`
- **db/**: `DrizzleModule`, `DB_TOKEN`
- **pipes/**: `ZodValidationPipe`

## Database Architecture

- **48 tables** across 5 schema domains (auth: 10, pm: 27, oms: 3, inv: 5, ful: 3)
- All domain tables scoped by `organizationId` for multi-tenancy
- Auth tables use **TypeID** (`varchar(36)`), domain tables use **UUID v4**
- Soft deletes with `deletedAt` column + partial unique indexes
- JSONB columns for flexible data (product values, addresses, settings)
- Inventory uses optimistic locking (`version` column) + append-only ledger

## Deployment Topology

```text
┌─────────────────────────────────────────┐
│            GitHub Actions CI/CD          │
│  (Docker multi-stage build + push)       │
└────────────┬───────────────┬────────────┘
             │               │
     ┌───────▼──────┐  ┌────▼──────────┐
     │  DigitalOcean │  │  Cloudflare   │
     │  (Dokploy)    │  │  Pages        │
     │               │  │               │
     │  ech-server   │  │ client-portal │
     │  PostgreSQL   │  │ (static SPA)  │
     │  Redis        │  │               │
     │  MinIO        │  │               │
     └──────────────┘  └───────────────┘
```

Local development uses Docker Compose for PostgreSQL 17, Redis 7, and MinIO.
