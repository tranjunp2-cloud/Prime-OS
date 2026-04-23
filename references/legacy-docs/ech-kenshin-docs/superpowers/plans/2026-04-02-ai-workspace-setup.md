# AI Workspace Setup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a shared, secure, token-efficient AI workspace for the ECH-Kenshin monorepo that works across Claude Code, Cursor, Copilot, and other AI tools.

**Architecture:** Index-based documentation structure with `AGENTS.md` as universal entry point, `docs/INDEX.md` as master index, `.ai/` for shared AI skills/agents/rules, and `.claude/commands/` for Claude Code-specific slash commands. Security rules centralized in `.ai/rules/security.md` as canonical source.

**Tech Stack:** Markdown files, git, pnpm monorepo (NestJS + React + Drizzle ORM)

---

## File Structure

### New directories:
- `.ai/` — shared AI workspace (agents, skills, rules)
- `.ai/agents/` — agent persona definitions
- `.ai/skills/` — reusable workflow guides
- `.ai/rules/` — domain-specific rules
- `.claude/commands/` — Claude Code custom slash commands
- `docs/architecture/` — system architecture docs
- `docs/architecture/adr/` — architecture decision records
- `docs/product/` — product specs
- `docs/product/domains/` — domain tower specs
- `docs/standards/` — coding and security standards
- `docs/onboarding/` — setup and env guides
- `docs/status/` — living project status

### New files (43):
- `CLAUDE.md` — Claude Code config (references AGENTS.md)
- `.cursorrules` — Cursor native config
- `.github/copilot-instructions.md` — Copilot native config
- `docs/INDEX.md` — master documentation index
- `docs/architecture/overview.md` — system architecture
- `docs/architecture/data-flow.md` — request lifecycle and event patterns
- `docs/architecture/adr/001-modular-monolith.md` — ADR
- `docs/product/prd-overview.md` — product vision
- `docs/product/domains/pm-product-master.md` — PM tower spec
- `docs/product/domains/inv-inventory.md` — INV tower spec
- `docs/product/domains/oms-order.md` — OMS tower spec
- `docs/product/domains/ful-fulfillment.md` — FUL tower spec
- `docs/standards/coding.md` — coding conventions
- `docs/standards/security.md` — human-readable security standards
- `docs/standards/api.md` — API reference (Scalar pointer)
- `docs/onboarding/setup.md` — developer setup guide
- `docs/onboarding/env-guide.md` — env vars walkthrough
- `docs/status/LIVING.md` — living project status
- `.ai/setup.md` — AI tool setup guide
- `.ai/agents/senior-frontend.md` — FE architect persona
- `.ai/agents/senior-backend.md` — BE architect persona
- `.ai/agents/security-auditor.md` — security reviewer persona
- `.ai/agents/database-expert.md` — DB specialist persona
- `.ai/skills/_index.md` — skills registry
- `.ai/skills/create-nestjs-module.md` — NestJS module workflow
- `.ai/skills/create-react-page.md` — React page workflow
- `.ai/skills/api-endpoint-checklist.md` — endpoint checklist
- `.ai/skills/pr-review-guide.md` — PR review workflow
- `.ai/rules/security.md` — CANONICAL security rules
- `.ai/rules/frontend.md` — frontend conventions
- `.ai/rules/backend.md` — backend conventions
- `.ai/rules/database.md` — database conventions
- `.claude/commands/create-endpoint.md` — slash command
- `.claude/commands/create-module.md` — slash command
- `.claude/commands/review.md` — slash command
- `apps/admin-portal/README.md` — module README
- `packages/database/README.md` — module README
- `packages/core/README.md` — module README
- `packages/ui/README.md` — module README
- `packages/form-engine/README.md` — module README
- `packages/amazon-wizard/README.md` — module README
- `packages/biome-config/README.md` — module README
- `packages/typescript-config/README.md` — module README

### Overwrite files (2):
- `apps/server/README.md` — replace NestJS boilerplate with project-specific README
- `apps/client-portal/README.md` — populate empty file

### Modify files (3):
- `.gitignore` — selective `.claude/` ignore
- `AGENTS.md` — add Quick Navigation, Security Rules, AI Workflow Rules
- `README.md` — fix package list, point to docs/

---

## Task 1: Foundation — .gitignore + Directory Structure

**Files:**
- Modify: `.gitignore`
- Create: all directories listed above

- [ ] **Step 1: Update `.gitignore` to selective `.claude/` ignore**

Replace the current Agent workspace section in `.gitignore`:

```gitignore
# Agent workspace
.agents
.agent
.claude
.factory
.opencode
.github/skills/
.github/prompts/
repomix-output.xml
```

With:

```gitignore
# Claude Code — track shared config, ignore personal
.claude/*
!.claude/settings.json
!.claude/commands/
!.claude/commands/**

# Shared AI workspace — TRACKED (do NOT ignore .ai/)

# Personal AI workspaces — IGNORED
.agents
.agent
.factory
.opencode
.github/skills/
.github/prompts/
repomix-output.xml
```

- [ ] **Step 2: Create all directory structure**

Run:
```bash
mkdir -p .ai/agents .ai/skills .ai/rules .claude/commands docs/architecture/adr docs/product/domains docs/standards docs/onboarding docs/status
```

- [ ] **Step 3: Verify directories created**

Run:
```bash
find .ai .claude/commands docs/architecture docs/product docs/standards docs/onboarding docs/status -type d | sort
```

Expected output:
```
.ai
.ai/agents
.ai/rules
.ai/skills
.claude/commands
docs/architecture
docs/architecture/adr
docs/onboarding
docs/product
docs/product/domains
docs/standards
docs/status
```

- [ ] **Step 4: Commit foundation**

```bash
git add .gitignore
git commit -m "chore(workspace): update gitignore for shared AI workspace config"
```

Note: Empty directories won't be tracked by git. They'll be committed when files are added in subsequent tasks.

---

## Task 2: Core Config Files — CLAUDE.md, .cursorrules, copilot-instructions.md

**Files:**
- Create: `CLAUDE.md`
- Create: `.cursorrules`
- Create: `.github/copilot-instructions.md`

- [ ] **Step 1: Create `CLAUDE.md`**

```markdown
# CLAUDE.md

Read `AGENTS.md` for project rules and context. This file contains Claude Code-specific configuration only.

## Claude Code Settings

- Use `.claude/commands/` for project-specific slash commands
- Memory is personal — stored in `.claude/memory/`, gitignored
- When loading agent personas, read from `.ai/agents/<persona>.md`

## Workflow

- Before starting work: read `AGENTS.md` → `docs/INDEX.md` if needed
- Use `/create-endpoint`, `/create-module`, `/review` commands when applicable
- Follow security rules in `AGENTS.md` — never save secrets to any file
- After completing major tasks: update `docs/status/LIVING.md` if significant changes occurred (with user confirmation)
```

- [ ] **Step 2: Create `.cursorrules`**

```markdown
# Cursor Rules — ECH-Kenshin

Read `AGENTS.md` for full project rules, architecture, and conventions.

## Quick References

- Project docs index: `docs/INDEX.md`
- Security rules: `.ai/rules/security.md`
- Frontend rules: `.ai/rules/frontend.md`
- Backend rules: `.ai/rules/backend.md`
- Database rules: `.ai/rules/database.md`
- Agent personas: `.ai/agents/`
- Shared skills: `.ai/skills/_index.md`

## Key Rules

- TypeScript strict mode — no `any`
- Biome for linting/formatting (tabs, 120-char width)
- Commit format: `<type>(<scope>)[task:<ticket>]: <subject>`
- No secrets in any file — use env vars with `<PLACEHOLDER>` in examples
- Multi-tenant: always scope queries by `organizationId`
```

- [ ] **Step 3: Create `.github/copilot-instructions.md`**

```markdown
# GitHub Copilot Instructions — ECH-Kenshin

Read `AGENTS.md` for full project rules, architecture, and conventions.

## Project Context

ECH-Kenshin is a multi-tenant SaaS platform (PIM + OmniChannel Commerce) built as a modular monolith. NestJS backend on Fastify, React frontends, PostgreSQL with Drizzle ORM.

## Quick References

- Project docs index: `docs/INDEX.md`
- Security rules: `.ai/rules/security.md`
- Frontend rules: `.ai/rules/frontend.md`
- Backend rules: `.ai/rules/backend.md`
- Database rules: `.ai/rules/database.md`

## Key Rules

- TypeScript strict mode — no `any`
- Biome for linting/formatting (tabs, 120-char width)
- Commit format: `<type>(<scope>)[task:<ticket>]: <subject>`
- No secrets in any file — use env vars
- Multi-tenant: always scope queries by `organizationId`
- Validation with Zod v4
- Logging with Pino (structured JSON)
```

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md .cursorrules .github/copilot-instructions.md
git commit -m "chore(workspace): add AI tool config files (Claude, Cursor, Copilot)"
```

---

## Task 3: Enhance AGENTS.md

**Files:**
- Modify: `AGENTS.md`

- [ ] **Step 1: Add Quick Navigation section after Project Overview**

Insert after the `## Project Overview` paragraph (after line 7):

```markdown
## Quick Navigation

> Read this file first every session. For deeper context, follow links below.

- Full docs index: `docs/INDEX.md`
- Agent personas: `.ai/agents/`
- Shared skills/workflows: `.ai/skills/_index.md`
- Domain-specific rules: `.ai/rules/`
- Living status (sprint, known issues): `docs/status/LIVING.md`
```

- [ ] **Step 2: Update Monorepo Structure**

Replace the current Monorepo Structure section with:

```markdown
## Monorepo Structure

- **pnpm workspaces** + **Turborepo** for orchestration
- `apps/server` — NestJS 11 backend on Fastify v5 (compiled with SWC)
- `apps/client-portal` — React 18 + React Router v6 + TanStack Query (primary UI)
- `apps/admin-portal` — React 18 + React Router v6 (taxonomy management)
- `packages/database` — Drizzle ORM schemas (source of truth for all DB tables)
- `packages/core` — Shared utilities and types (exports `@ech/core` and `@ech/core/utils`)
- `packages/ui` — Headless UI component library (shadcn-based, exports `@ech/ui`)
- `packages/form-engine` — Dynamic form generation and validation engine (`@ech/form-engine`)
- `packages/amazon-wizard` — Multi-step Amazon listing wizard (`@ech/amazon-wizard`)
- `packages/biome-config` — Shared Biome lint/format presets
- `packages/typescript-config` — Shared tsconfig presets
```

- [ ] **Step 3: Fix commit format**

Replace `[bmad:<ticket>]` with `[task:<ticket>]` in the Code Style & Conventions section:

```markdown
- **Commit format**: `<type>(<scope>)[task:<ticket>]: <subject>`
  - Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `revert`, `wip`
  - Example: `feat(catalog)[task:CR-042]: add attribute family bulk import`
```

- [ ] **Step 4: Add Security Rules section before Key Dependencies**

```markdown
## Security Rules

> Canonical source: `.ai/rules/security.md` — read it for detailed rules and examples.

- NEVER save secrets, API keys, tokens, or passwords in any `.md`, `.json`, or source file
- NEVER hardcode credentials — always use environment variables
- Before commit: review diff, ensure no sensitive data is included
- `.env` files are NEVER committed (gitignored)
- In docs/examples: use placeholders like `<YOUR_API_KEY>`, `sk_test_xxx`
- Session isolation: do not reference information from other organizations/tenants
- Personal AI memory (`.claude/memory/`) is gitignored — never commit personal context
```

- [ ] **Step 5: Add AI Workflow Rules section after Security Rules**

```markdown
## AI Workflow Rules

1. Read `AGENTS.md` first every session
2. For deeper context → read `docs/INDEX.md` → follow relevant links only
3. For specific tasks → check `.ai/skills/_index.md` for existing workflows
4. For specialized expertise → load agent persona from `.ai/agents/`
5. After completing major tasks → update `docs/status/LIVING.md` if significant changes (with user confirmation)
6. Do NOT modify documentation files without user confirmation
7. Do NOT add secrets or sensitive data to any file
```

- [ ] **Step 6: Verify AGENTS.md stays under 200 lines**

Run:
```bash
wc -l AGENTS.md
```

Expected: under 200 lines. If over, move detailed content to linked files.

- [ ] **Step 7: Commit**

```bash
git add AGENTS.md
git commit -m "docs(agents): enhance AGENTS.md with navigation, security rules, AI workflow"
```

---

## Task 4: docs/INDEX.md + docs/status/LIVING.md

**Files:**
- Create: `docs/INDEX.md`
- Create: `docs/status/LIVING.md`

- [ ] **Step 1: Create `docs/INDEX.md`**

```markdown
# ECH-Kenshin Documentation Index

> AI: Read this file to find relevant docs. Only read linked files when you need deeper context for your current task.

## Architecture

- [System Overview](architecture/overview.md) — Tech stack, deployment topology, module boundaries
- [Data Flow](architecture/data-flow.md) — Request lifecycle, event-driven patterns, BullMQ jobs
- [ADR: Modular Monolith](architecture/adr/001-modular-monolith.md) — Why single-process over microservices

## Product

- [PRD Overview](product/prd-overview.md) — Product vision, target market (Japan), key capabilities
- [PM: Product Master](product/domains/pm-product-master.md) — Catalog, EAV attributes, variants, channel mapping
- [INV: Inventory](product/domains/inv-inventory.md) — Multi-warehouse, optimistic lock, append-only ledger
- [OMS: Orders](product/domains/oms-order.md) — Amazon SQS ingestion, status routing
- [FUL: Fulfillment](product/domains/ful-fulfillment.md) — FBA/FBM dispatch, shipment tracking

## Standards

- [Coding Standards](standards/coding.md) — Naming, patterns, error handling conventions
- [Security Standards](standards/security.md) — Secrets management, commit rules, session isolation
- [API Reference](standards/api.md) — Scalar docs link, endpoint conventions

## Onboarding

- [Setup Guide](onboarding/setup.md) — Clone, install, run in 5 minutes
- [Environment Variables](onboarding/env-guide.md) — .env.example walkthrough (no real values)

## Status

- [Living Document](status/LIVING.md) — Current sprint, known issues, don't-touch zones
- [Task Tracking](../TASK.md) — Current active tasks

## Process

- [Contributing Guide](CONTRIBUTE.md) — Gitflow, PR process, code review tiers
```

- [ ] **Step 2: Create `docs/status/LIVING.md`**

```markdown
# Project Status — Living Document

> Updated by team when significant changes occur. AI: read this for current project state.
> Last updated: 2026-04-02

## Current Sprint

- Sprint goal: Amazon SP-API product data import pipeline
- Key deliverables: Product listing import, parent-child hierarchy, schema sync
- Branch: `feat/CR-081-product-data-amazon`

## Known Issues & Limitations

- Amazon title extraction: title field not correctly parsed from SP-API response
- Parent-child hierarchy: parent products not linking to child variants
- Schema sync: marketplace product types not syncing attribute mappings correctly

## Don't Touch Zones

> Modules currently being refactored or migrated. Do NOT modify without checking with the owner.

(none currently)

## In-Progress Migrations

- RLS migration: manual `org_id` filtering → PostgreSQL Row-Level Security (separate branch, not started)

## Recently Completed (Last 2 Sprints)

- Admin portal: auth, taxonomy management, layout integration — 2026-03-28
- UI package: optimized as reusable headless UI library — 2026-03-25
```

- [ ] **Step 3: Commit**

```bash
git add docs/INDEX.md docs/status/LIVING.md
git commit -m "docs(workspace): add master index and living status document"
```

---

## Task 5: Architecture Docs

**Files:**
- Create: `docs/architecture/overview.md`
- Create: `docs/architecture/data-flow.md`
- Create: `docs/architecture/adr/001-modular-monolith.md`

- [ ] **Step 1: Create `docs/architecture/overview.md`**

```markdown
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

attributes, attribute-groups, bootstrap, categories, channels, classifications, extensible-enums, families, global-update, gpc-seed, listings (largest — 23 subdirs), media, products, provisioning, schema-sync

### INV Tower Submodules (2):

inventory (stock management + sync worker), warehouses

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
```

- [ ] **Step 2: Create `docs/architecture/data-flow.md`**

```markdown
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
- Correlation ID injected at request entry, propagated to all logs and downstream calls
- Organization context (from JWT) available via CLS throughout the request lifecycle

## Logging

- Pino structured JSON logging via `nestjs-pino`
- Every log entry includes: correlation ID, timestamp, level, module context
- Request/response logging with configurable verbosity
```

- [ ] **Step 3: Create `docs/architecture/adr/001-modular-monolith.md`**

```markdown
# ADR-001: Modular Monolith over Microservices

> Status: Accepted | Date: 2025-03

## Context

ECH-Kenshin needs to handle multiple business domains (Product Management, Inventory, Orders, Fulfillment) with deep integrations between them (e.g., listing a product requires PM data + INV stock + channel config).

## Decision

Use a **Modular Monolith** architecture: a single NestJS process with isolated domain modules ("Towers") that communicate via events and shared infrastructure.

## Rationale

1. **Team size**: With a small-to-medium team, microservices overhead (service mesh, distributed tracing, deployment orchestration) is not justified
2. **Deep integration**: PM, INV, OMS, FUL domains share data heavily — network boundaries would add latency and complexity
3. **Deployment simplicity**: One Docker image, one deploy pipeline, one database
4. **Future migration path**: Tower boundaries are designed to be extractable into services if needed — each tower owns its routes, services, and schemas

## Consequences

- All towers share one PostgreSQL database (isolated by schema namespace)
- Inter-tower communication is via in-process events, not HTTP/gRPC
- A bug in one tower can crash the entire process (mitigated by error boundaries and health checks)
- Scaling is vertical (bigger machine) not horizontal per-domain (mitigated by BullMQ offloading heavy work)
```

- [ ] **Step 4: Commit**

```bash
git add docs/architecture/
git commit -m "docs(architecture): add system overview, data flow, and ADR-001"
```

---

## Task 6: Product Docs

**Files:**
- Create: `docs/product/prd-overview.md`
- Create: `docs/product/domains/pm-product-master.md`
- Create: `docs/product/domains/inv-inventory.md`
- Create: `docs/product/domains/oms-order.md`
- Create: `docs/product/domains/ful-fulfillment.md`

- [ ] **Step 1: Create `docs/product/prd-overview.md`**

```markdown
# Product Requirements — Overview

> Product vision, target market, and key capabilities of ECH-Kenshin.

## Vision

ECH-Kenshin is a multi-tenant SaaS platform combining **Product Information Management (PIM)** with **OmniChannel Commerce** capabilities, targeting the Japanese market with deep Amazon SP-API integration.

## Target Market

- Japanese e-commerce sellers managing products across multiple marketplaces
- Primary channel: Amazon Japan (SP-API)
- Future channels: Rakuten, Yahoo Shopping, Shopify Japan

## Core Capabilities

### 1. Product Information Management (PIM)

- Centralized product catalog with EAV (Entity-Attribute-Value) model
- Attribute families and classification hierarchies
- Variant management (size, color, material axes)
- Rich media management (images, documents)
- Channel-specific attribute mappings

### 2. Multi-Channel Listings

- Amazon listing import via SP-API
- Schema-driven listing wizard (marketplace-specific product types)
- Parent-child product hierarchy support
- Channel provisioning and bootstrapping

### 3. Inventory Management

- Multi-warehouse stock tracking
- Optimistic locking for concurrent updates
- Append-only inventory ledger for audit trail
- Channel stock rules (allocation per marketplace)
- Background stock sync workers

### 4. Order Management (Planned)

- Amazon SQS order ingestion
- Order status routing and history tracking
- Multi-fulfillment support

### 5. Fulfillment (Planned)

- FBA (Fulfilled by Amazon) / FBM (Fulfilled by Merchant) dispatch
- Shipment tracking
- Fulfillment rule engine

## Multi-Tenancy

Every organization gets isolated data via PostgreSQL Row-Level Security (RLS). Organization context flows through JWT tokens → NestJS guards → Drizzle query scoping.

## Key Integrations

- **Amazon SP-API**: Product data, listings, orders, fulfillment
- **Better-Auth**: Authentication and organization management
- **MinIO/S3**: Media storage
- **Redis/BullMQ**: Background job processing
```

- [ ] **Step 2: Create `docs/product/domains/pm-product-master.md`**

```markdown
# PM — Product Master Tower

> Catalog management, EAV attributes, variants, families, classifications, and channel mapping.

## Scope

The PM tower handles everything related to product data: creating and organizing products, defining attribute schemas, managing product families and classifications, and mapping products to marketplace channels.

## Database Tables (27)

### Taxonomy
- `attributes` — product attributes (name, type, validation rules)
- `attribute_groups` — logical groupings of attributes
- `families` — product families (define which attributes a product has)
- `family_attributes` — family-to-attribute associations
- `family_variants` — variant definitions within a family
- `family_variant_axes` — variant dimension axes (size, color, etc.)
- `extensible_enums` — custom enumeration values
- `association_types` — product association types

### Products
- `products` — product records (SKU-based, supports parent/child variants)
- `product_categories` — product-to-category associations
- `product_classifications` — product-to-classification associations
- `product_media` — product-to-media associations

### Classifications & Categories
- `classifications` — classification hierarchies
- `classification_attributes` — classification-to-attribute mappings
- `organization_classifications` — org-specific classification overrides
- `categories` — product categories (tree structure)

### Media
- `media_files` — uploaded media records
- `media_folders` — folder structure for media organization

### Channel & Marketplace
- `channels` — marketplace platform definitions
- `channel_listings` — product listings per channel
- `channel_locales` — locale config per channel
- `channel_currencies` — currency config per channel
- `channel_attribute_mappings` — channel-specific attribute mappings
- `channel_stock_rules` — stock allocation rules per channel
- `marketplace_product_types` — marketplace product type schemas
- `imported_listings` — imported seller listings from marketplaces
- `listing_submissions` — listing submission tracking

## Server Submodules (17)

Path: `apps/server/src/towers/pm/`

`attributes`, `attribute-groups`, `bootstrap`, `categories`, `channels`, `classifications`, `extensible-enums`, `families`, `global-update`, `gpc-seed`, `listings` (largest — Amazon listing management), `media`, `products`, `provisioning`, `schema-sync`

## Key Patterns

- **EAV Model**: Products store dynamic attributes as JSONB `values` column rather than fixed columns
- **Family-Attribute System**: Families define which attributes a product can have; variant axes define which attributes create variants
- **Channel Mapping**: Each marketplace has its own product type schema; attribute mappings translate PIM attributes to marketplace-specific fields
- **Soft Deletes**: All tables use `deletedAt` with partial unique indexes
```

- [ ] **Step 3: Create `docs/product/domains/inv-inventory.md`**

```markdown
# INV — Inventory Tower

> Multi-warehouse stock management, optimistic locking, and append-only ledger.

## Scope

The INV tower manages physical stock across multiple warehouses, tracks every stock movement in an immutable ledger, and syncs stock levels to marketplace channels.

## Database Tables (5)

- `warehouses` — warehouse records (address and settings as JSONB)
- `inventory_items` — stock levels per product per warehouse (quantity, reserved, `version` for optimistic lock)
- `inventory_ledger` — append-only transaction log (every stock change recorded immutably)
- `channel_stock_rules` — stock allocation rules per channel (shared with PM)
- `stock_sync_queue` — queue for background stock synchronization jobs

## Server Submodules (2)

Path: `apps/server/src/towers/inv/`

- `inventory/` — stock level CRUD, stock adjustment, sync worker
- `warehouses/` — warehouse management

## Key Patterns

- **Optimistic Locking**: `inventory_items.version` column prevents concurrent update conflicts. Read version → update with WHERE version = N → increment version
- **Append-Only Ledger**: `inventory_ledger` is insert-only. Stock balance derived from SUM of ledger entries. Provides full audit trail.
- **Stock Sync Worker**: BullMQ background job that reconciles stock levels with marketplace channels based on `channel_stock_rules`
```

- [ ] **Step 4: Create `docs/product/domains/oms-order.md`**

```markdown
# OMS — Order Management Tower

> Order ingestion, status routing, and history tracking.

## Scope

The OMS tower handles receiving orders from marketplace channels, tracking order status through its lifecycle, and maintaining audit history. Currently schema-defined with tower implementation pending.

## Database Tables (3)

- `orders` — order records (shipping address as JSONB, status, marketplace reference)
- `order_items` — order line items (product, quantity, price)
- `order_status_history` — status change audit trail (timestamps, previous/new status)

## Planned Features

- Amazon SQS order ingestion pipeline
- Status routing engine (new → processing → shipped → delivered)
- Multi-fulfillment order splitting
- Order exception handling

## Implementation Status

Schema defined in `packages/database/src/schemas/oms/`. Server tower implementation not yet started.
```

- [ ] **Step 5: Create `docs/product/domains/ful-fulfillment.md`**

```markdown
# FUL — Fulfillment Tower

> FBA/FBM dispatch, shipment tracking, and fulfillment rules.

## Scope

The FUL tower manages the fulfillment lifecycle: dispatching orders to fulfillment providers (FBA or FBM), tracking shipments, and applying fulfillment rules. Currently schema-defined with tower implementation pending.

## Database Tables (3)

- `shipments` — shipment records (carrier, tracking, status)
- `shipment_items` — line items within a shipment
- `fulfillment_rules` — rules engine for fulfillment routing (which orders go to FBA vs FBM)

## Planned Features

- FBA (Fulfilled by Amazon) integration via SP-API Feeds
- FBM (Fulfilled by Merchant) dispatch workflows
- Shipment tracking with carrier integration
- Fulfillment rule engine (route by product type, warehouse proximity, stock level)

## Implementation Status

Schema defined in `packages/database/src/schemas/ful/`. Server tower implementation not yet started.
```

- [ ] **Step 6: Commit**

```bash
git add docs/product/
git commit -m "docs(product): add PRD overview and domain tower specifications"
```

---

## Task 7: Standards Docs

**Files:**
- Create: `docs/standards/coding.md`
- Create: `docs/standards/security.md`
- Create: `docs/standards/api.md`

- [ ] **Step 1: Create `docs/standards/coding.md`**

```markdown
# Coding Standards

> Naming conventions, architecture patterns, and error handling for ECH-Kenshin.

## Language & Tooling

- **TypeScript** strict mode — `no any`, `strictNullChecks`, `noUncheckedIndexedAccess`
- **Biome** for linting and formatting: tabs, 120-char line width
- **Zod v4** for runtime validation (DTOs, env vars, API inputs)
- **Pino** for structured JSON logging

## Naming Conventions

### Files & Directories
- Kebab-case for all files: `product-listing.service.ts`, `create-order.dto.ts`
- NestJS pattern: `<name>.<type>.ts` — e.g., `products.controller.ts`, `products.service.ts`, `products.module.ts`
- Test files: `<name>.spec.ts` (unit), `<name>.e2e-spec.ts` (e2e)

### Code
- PascalCase: classes, interfaces, types, enums — `ProductService`, `CreateProductDto`
- camelCase: variables, functions, methods — `findByOrganization`, `isActive`
- UPPER_SNAKE_CASE: constants, env vars — `MAX_RETRY_COUNT`, `DATABASE_URL`
- Drizzle table names: snake_case — `product_categories`, `inventory_items`

### Commit Messages
- Format: `<type>(<scope>)[task:<ticket>]: <subject>`
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `revert`, `wip`
- Example: `feat(catalog)[task:CR-042]: add attribute family bulk import`
- Validated by commitlint (Husky pre-commit hook)

## Architecture Patterns

### Backend (NestJS)
- **Tower pattern**: Domain modules in `apps/server/src/towers/<domain>/`
- Each submodule has: `module.ts`, `controller.ts`, `service.ts`, optional `dto/`, `types/`
- Dependency injection via NestJS providers
- DTOs validated with Zod schemas (not class-validator)
- Path aliases: `@presentation/*`, `@shared-kernel/*`, `@towers/*`

### Frontend (React)
- **TanStack Query** for server state — no Redux/Zustand in main apps
- Custom hooks for data fetching in `hooks/` directories
- React Context for auth state only
- Pages in `pages/` directory, components in `components/`
- Forms use `react-hook-form` + `@hookform/resolvers` + Zod

### Database (Drizzle ORM)
- Schema files in `packages/database/src/schemas/<domain>/`
- `domainId()` helper for UUID primary keys
- Soft deletes: `deletedAt` column + `where(notDeleted)` filter
- JSONB for flexible data (product values, addresses, settings)
- Multi-tenant scoping: `organizationId` on all domain tables

## Error Handling

- Backend: RFC 7807 Problem Details format via `ProblemDetailsFilter`
- All exceptions caught by `AllExceptionFilter` as fallback
- Rate limiting errors via `ThrottlerExceptionFilter`
- Frontend: TanStack Query error boundaries + toast notifications (sonner)

## Testing

- **Vitest** for all tests (unit + e2e)
- **Supertest** for HTTP integration tests
- Test files co-located with source or in `test/` directories
- Run: `pnpm --filter @ech/server test` (all), `test:watch` (dev), `test:e2e` (e2e)
```

- [ ] **Step 2: Create `docs/standards/security.md`**

```markdown
# Security Standards

> Human-readable security standards for ECH-Kenshin. For AI-enforceable rules, see `.ai/rules/security.md` (canonical source).

## Secrets Management

- **NEVER** commit secrets, API keys, tokens, or passwords to the repository
- All secrets stored as environment variables, loaded via `.env` files (gitignored)
- Documentation examples use placeholders: `<YOUR_API_KEY>`, `sk_test_xxx`, `your-secret-here`
- `.env.example` files contain descriptions and placeholder values only

## Multi-Tenancy Security

- All domain tables include `organizationId` column
- PostgreSQL Row-Level Security (RLS) enforces tenant isolation at the database level
- NestJS `OrgGuard` validates organization context from JWT on every request
- Drizzle queries MUST include `organizationId` filter (enforced by RLS in production)

## Authentication & Authorization

- Better-Auth handles user authentication (session-based + JWT)
- Organization membership validated via `OrgGuard`
- JWT tokens carry organization context — do not trust client-supplied org IDs

## API Security

- CORS: configured allowlist via `ALLOWED_ORIGINS` env var
- Rate limiting: `ThrottlerGuard` with configurable TTL and limits
- Helmet: security headers (X-Frame-Options, CSP, etc.)
- Input validation: Zod schemas on all API endpoints (fail-fast)
- No direct database access from controllers — always through services

## AI Tool Security

- See `.ai/rules/security.md` for the canonical, AI-enforceable security rules
- AI sessions must not leak data between organizations/tenants
- Personal AI memory (`.claude/memory/`) is gitignored
- AI must confirm with user before committing changes
- AI must review diffs for sensitive data before any commit
```

- [ ] **Step 3: Create `docs/standards/api.md`**

```markdown
# API Reference

> ECH-Kenshin API documentation is auto-generated. This page provides access links and conventions.

## Live API Documentation

- **Swagger UI**: `<BASE_URL>/docs`
- **Swagger JSON**: `<BASE_URL>/swagger`
- **OpenAPI YAML**: `<BASE_URL>/openapi.yaml`
- **Scalar API Reference**: available via Swagger UI

Local development: `http://localhost:8000/docs`

## API Conventions

- Global prefix: `/api`
- Health check: `GET /health`
- Versioning: not currently implemented (planned for v2)
- Error format: RFC 7807 Problem Details
- Pagination: offset-based with `?page=1&limit=20`
- Dates: ISO 8601 format
- IDs: UUID v4 for domain entities, TypeID for auth entities

## Authentication

- `POST /api/auth/sign-in` — sign in with email/password
- `POST /api/auth/sign-up` — register new user
- Bearer token in `Authorization` header for protected endpoints
- Organization context derived from JWT claims
```

- [ ] **Step 4: Commit**

```bash
git add docs/standards/
git commit -m "docs(standards): add coding, security, and API reference standards"
```

---

## Task 8: Onboarding Docs

**Files:**
- Create: `docs/onboarding/setup.md`
- Create: `docs/onboarding/env-guide.md`

- [ ] **Step 1: Create `docs/onboarding/setup.md`**

```markdown
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
```

- [ ] **Step 2: Create `docs/onboarding/env-guide.md`**

```markdown
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
```

- [ ] **Step 3: Commit**

```bash
git add docs/onboarding/
git commit -m "docs(onboarding): add setup guide and environment variables reference"
```

---

## Task 9: AI Rules (`.ai/rules/`)

**Files:**
- Create: `.ai/rules/security.md`
- Create: `.ai/rules/frontend.md`
- Create: `.ai/rules/backend.md`
- Create: `.ai/rules/database.md`

- [ ] **Step 1: Create `.ai/rules/security.md`** (CANONICAL source)

```markdown
# Security Rules (Canonical Source)

> This is the single source of truth for security rules. AGENTS.md and docs/standards/security.md reference this file.

## Secrets & Credentials

- NEVER write secrets, API keys, tokens, passwords, or connection strings into any file that is git-tracked
- NEVER hardcode credentials in source code — use environment variables
- In documentation examples, use placeholders: `<YOUR_API_KEY>`, `sk_test_xxx`, `your-secret-here`
- If you accidentally see a secret in code, flag it to the user immediately

### Violations (examples):
```typescript
// BAD — hardcoded secret
const apiKey = "sk_live_abc123def456";

// GOOD — environment variable
const apiKey = process.env.API_KEY;
```

```markdown
<!-- BAD — real key in docs -->
Set your API key: `sk_live_abc123def456`

<!-- GOOD — placeholder in docs -->
Set your API key: `<YOUR_API_KEY>`
```

## Commit Safety

- Before every commit: review the diff for sensitive data (keys, passwords, tokens, internal URLs)
- AI must confirm with the user before committing any changes
- If a secret is found in a diff, abort the commit and remove the secret first
- `.env` files are gitignored — NEVER commit them, NEVER `git add -f` them

## Multi-Tenancy & Session Isolation

- All database queries MUST include `organizationId` scoping
- NEVER reference data from a different organization in the same session
- Do not store organization-specific data in shared/global docs
- When testing, use test organization data only

## Personal Data

- `.claude/memory/` is gitignored — personal AI memory stays local
- Do not write user-specific preferences into shared config files
- Do not log personally identifiable information (PII)

## File Permissions

- Files in `.env*` pattern: NEVER committed
- Files in `.claude/memory/`: NEVER committed
- Files in `.ai/`, `docs/`, `AGENTS.md`, `CLAUDE.md`: safe to commit (but never with secrets)
```

- [ ] **Step 2: Create `.ai/rules/frontend.md`**

```markdown
# Frontend Rules

> React, React Router, Tailwind CSS, and component conventions for ECH-Kenshin frontends.

## Tech Stack

- React 18 + React Router v6
- TanStack Query v5 for server state
- TanStack Table v8 for data tables
- react-hook-form + Zod for form validation
- Tailwind CSS for styling
- @ech/ui for shared components (shadcn-based)
- @ech/form-engine for dynamic forms
- lucide-react for icons
- sonner for toast notifications

## Component Patterns

- Functional components only — no class components
- Use `@ech/ui` components (Button, Input, Card, Dialog, etc.) instead of raw HTML
- Custom hooks for data fetching: `useProducts()`, `useChannels()`, etc.
- Co-locate hooks with their page/component when single-use
- Shared hooks go in `src/hooks/`

## State Management

- **Server state**: TanStack Query (queries + mutations) — NEVER store server data in local state
- **Auth state**: React Context (`AuthContext`) — provided at app root
- **Form state**: react-hook-form — NEVER use useState for form fields
- **UI state**: useState/useReducer — only for local UI concerns (modals, tabs, toggles)
- **No Redux, no Zustand** in main apps (amazon-wizard uses Zustand for wizard-specific state)

## Routing

- File-based routing convention in `src/pages/`
- Protected routes wrapped with auth guard
- Lazy loading for large page components
- URL params for entity IDs: `/products/:id`, `/channels/:id`

## Styling

- Tailwind CSS utility classes — no CSS modules, no styled-components
- Use `@ech/ui` design tokens and components for consistency
- Responsive design: mobile-first with Tailwind breakpoints
- Class merging via `cx()` utility from @ech/ui

## Data Fetching

- All API calls through TanStack Query hooks
- Query keys follow convention: `['entity', params]` — e.g., `['products', { orgId, page }]`
- Mutations invalidate related queries on success
- Error handling via query error boundaries + sonner toasts

## Forms

- react-hook-form for all forms
- Zod schemas for validation (shared with backend when possible)
- @ech/form-engine for attribute-driven dynamic forms
- Field-level validation with immediate feedback
```

- [ ] **Step 3: Create `.ai/rules/backend.md`**

```markdown
# Backend Rules

> NestJS, Fastify, Drizzle ORM conventions for the ECH-Kenshin server.

## Tech Stack

- NestJS 11 on Fastify v5 (NOT Express)
- Drizzle ORM (NOT TypeORM, NOT Prisma)
- Zod v4 for validation (NOT class-validator)
- Pino for logging (NOT console.log, NOT winston)
- BullMQ for background jobs
- Better-Auth for authentication
- nestjs-cls for request context propagation

## Module Pattern (Tower Architecture)

Each domain module lives in `apps/server/src/towers/<domain>/<submodule>/`:

```
towers/pm/products/
├── products.module.ts      # NestJS module definition
├── products.controller.ts  # HTTP endpoints
├── products.service.ts     # Business logic
├── dto/                    # Zod-validated DTOs
│   ├── create-product.dto.ts
│   └── update-product.dto.ts
└── types/                  # TypeScript types
```

- Controllers handle HTTP only — no business logic
- Services contain business logic — inject DrizzleDb for data access
- DTOs validated with Zod schemas, transformed via NestJS pipes
- One module per business concept (products, channels, families, etc.)

## Path Aliases

- `@presentation/*` — HTTP layer (config, filters, interceptors)
- `@shared-kernel/*` — Cross-cutting infrastructure (auth, db, DTOs, utils)
- `@towers/*` — Domain tower modules

## Database Access

- Inject `DrizzleDb` token in services — NEVER import database client directly
- All queries MUST filter by `organizationId` for tenant isolation
- Use Drizzle query builder — NEVER raw SQL unless absolutely necessary
- Soft deletes: filter with `where(notDeleted)` on all queries
- Transactions: use `db.transaction()` for multi-table operations

## Validation

- All input validated with Zod schemas at the controller level
- Environment variables validated via `env.schema.ts` at startup
- Fail-fast: reject invalid input early, don't sanitize silently

## Error Handling

- Throw NestJS HTTP exceptions (`NotFoundException`, `BadRequestException`, etc.)
- `ProblemDetailsFilter` converts exceptions to RFC 7807 format
- Do NOT catch exceptions in controllers — let filters handle them
- Log errors with Pino context (correlation ID, module name)

## Testing

- Vitest for all tests
- Supertest for HTTP integration tests
- Test files: `*.spec.ts` (unit), `*.e2e-spec.ts` (e2e)
- Run: `pnpm --filter @ech/server test`
```

- [ ] **Step 4: Create `.ai/rules/database.md`**

```markdown
# Database Rules

> PostgreSQL, Drizzle ORM, migration, and schema conventions.

## Tech Stack

- PostgreSQL 17
- Drizzle ORM (schema definitions in `packages/database/src/schemas/`)
- Drizzle Kit for migrations

## Schema Organization

```
packages/database/src/schemas/
├── auth/     # Authentication tables (10 tables, managed by Better-Auth)
├── pm/       # Product Master tables (27 tables)
├── oms/      # Order Management tables (3 tables)
├── inv/      # Inventory tables (5 tables)
└── ful/      # Fulfillment tables (3 tables)
```

## Naming Conventions

- Table names: `snake_case`, plural — `products`, `inventory_items`, `order_status_history`
- Column names: `camelCase` in Drizzle schema, `snake_case` in SQL — Drizzle handles mapping
- Primary keys: `id` using `domainId()` helper (UUID v4)
- Foreign keys: `<entity>Id` — e.g., `organizationId`, `productId`, `warehouseId`
- Timestamps: `createdAt`, `updatedAt` on all tables
- Soft delete: `deletedAt` (nullable timestamp)

## Multi-Tenancy

- ALL domain tables MUST have `organizationId` column
- PostgreSQL Row-Level Security (RLS) enforces isolation at the DB level
- Drizzle queries MUST include `organizationId` in WHERE clauses
- Auth tables use `organizationId` via Better-Auth organization plugin

## ID Strategy

- **Auth entities**: TypeID format (`org_01h...`, `user_01h...`) — `varchar(36)`
- **Domain entities**: Standard UUID v4 via `domainId()` helper
- NEVER use auto-increment integers for IDs

## Schema Patterns

- `domainId()` — UUID primary key helper
- `softDelete()` — adds `deletedAt` column
- `timestamps()` — adds `createdAt` + `updatedAt`
- `notDeleted` — reusable WHERE condition for soft delete filtering
- JSONB columns for flexible data: `values`, `additional`, `settings`, `address`

## Migrations

- Generate: `pnpm db:generate` (creates SQL migration from schema diff)
- Apply: `pnpm db:migrate` (runs pending migrations)
- Dev only: `pnpm db:push` (pushes schema directly, no migration file)
- Studio: `pnpm db:studio` (GUI for browsing data)
- NEVER manually edit generated migration files
- NEVER use `db:push` in production — always use `db:migrate`

## Indexing

- Unique indexes: use partial indexes with `WHERE deleted_at IS NULL` for soft-deleted tables
- Composite indexes on frequently queried combinations (e.g., `organizationId + sku`)
- JSONB columns: use GIN indexes for frequently searched JSONB fields

## Inventory-Specific Patterns

- `inventory_items.version` — optimistic locking column, increment on every update
- `inventory_ledger` — append-only, NEVER update or delete rows
- Stock balance = SUM of ledger entries (not a stored value)
```

- [ ] **Step 5: Commit**

```bash
git add .ai/rules/
git commit -m "docs(ai): add canonical security, frontend, backend, and database rules"
```

---

## Task 10: AI Agent Personas (`.ai/agents/`)

**Files:**
- Create: `.ai/agents/senior-frontend.md`
- Create: `.ai/agents/senior-backend.md`
- Create: `.ai/agents/security-auditor.md`
- Create: `.ai/agents/database-expert.md`

- [ ] **Step 1: Create `.ai/agents/senior-frontend.md`**

```markdown
# Senior Frontend Architect

## Identity

You are a Senior Frontend & UX Engineer specializing in modern SaaS platforms, working on the ECH-Kenshin PIM + OmniChannel Commerce platform.

## Expertise

- React 18, React Router v6, TanStack Query v5, TanStack Table v8
- Tailwind CSS, headless UI patterns, shadcn component architecture
- react-hook-form + Zod for type-safe form validation
- Dynamic form engines (attribute-driven forms for PIM)
- Multi-step wizards (Amazon listing wizard with Zustand state)
- Data visualization (Highcharts, Recharts)
- Drag-and-drop interfaces (@dnd-kit)
- Internationalization (i18n for Japanese market)
- Responsive design, accessibility (WCAG 2.1)

## Context

- Client Portal: `apps/client-portal/` — primary user interface (React + Vite, port 3050)
- Admin Portal: `apps/admin-portal/` — taxonomy and org management (React + Vite, port 5174)
- UI Library: `packages/ui/` — 50+ shadcn-based components (`@ech/ui`)
- Form Engine: `packages/form-engine/` — dynamic form generation (`@ech/form-engine`)
- Amazon Wizard: `packages/amazon-wizard/` — multi-step listing wizard (`@ech/amazon-wizard`)

## Rules

- Follow `.ai/rules/frontend.md` for all frontend conventions
- Use `@ech/ui` components — do not create duplicate UI primitives
- Server state via TanStack Query only — no Redux, no local state for API data
- Forms via react-hook-form + Zod — no uncontrolled forms
- Tailwind only — no CSS modules, no styled-components
- Test with Vitest — component tests for complex interactions

## When to Use

- Building new pages or features in client-portal or admin-portal
- Creating or modifying shared UI components in packages/ui
- Working with form-engine or amazon-wizard
- UI/UX design decisions, component architecture
- Performance optimization (re-renders, lazy loading, code splitting)
```

- [ ] **Step 2: Create `.ai/agents/senior-backend.md`**

```markdown
# Senior Backend Architect

## Identity

You are a Senior Backend Engineer & Software Architect specializing in NestJS modular monoliths, working on the ECH-Kenshin PIM + OmniChannel Commerce platform.

## Expertise

- NestJS 11 on Fastify v5 (NOT Express)
- Drizzle ORM with PostgreSQL (NOT TypeORM, NOT Prisma)
- Domain-Driven Design, modular monolith architecture
- BullMQ background job processing
- Better-Auth authentication with organization multi-tenancy
- Zod v4 runtime validation
- REST API design (RFC 7807 Problem Details)
- Event-driven architecture (@nestjs/event-emitter)
- Request context propagation (nestjs-cls)
- Structured logging (Pino)
- Docker multi-stage builds

## Context

- Server: `apps/server/` — NestJS 11 backend (Fastify v5, port 8000)
- Database: `packages/database/` — Drizzle ORM schemas
- Domain Towers: `apps/server/src/towers/` — PM (17 submodules), INV (2 submodules)
- Shared Kernel: `apps/server/src/shared-kernel/` — auth, db, DTOs, utils
- Presentation: `apps/server/src/presentation/` — config, filters, interceptors

## Rules

- Follow `.ai/rules/backend.md` for all backend conventions
- Tower architecture: each domain module in `towers/<domain>/<submodule>/`
- Controllers handle HTTP only — business logic in services
- Inject `DrizzleDb` for database access — never import client directly
- All queries scoped by `organizationId`
- Validate with Zod, not class-validator
- Log with Pino, not console.log
- Test with Vitest + Supertest

## When to Use

- Creating new domain modules or API endpoints
- Designing inter-tower communication patterns
- Database query optimization, transaction design
- Background job implementation (BullMQ)
- Authentication and authorization patterns
- API design decisions
```

- [ ] **Step 3: Create `.ai/agents/security-auditor.md`**

```markdown
# Security Auditor

## Identity

You are a Security Engineer specializing in multi-tenant SaaS platforms, reviewing the ECH-Kenshin codebase for vulnerabilities and compliance.

## Expertise

- OWASP Top 10 vulnerability detection
- PostgreSQL Row-Level Security (RLS) for multi-tenancy
- JWT security, session management
- Secrets management and credential hygiene
- API security (CORS, rate limiting, input validation)
- SQL injection, XSS, CSRF prevention
- Supply chain security (dependency auditing)

## Context

- Multi-tenant architecture: `organizationId` on all domain tables
- Auth: Better-Auth with JWT + organization plugin
- Guards: `AuthGuard` (authentication), `OrgGuard` (org context validation)
- RLS: PostgreSQL RLS policies for tenant isolation (migration in progress)
- Rate limiting: NestJS ThrottlerGuard
- Input validation: Zod v4 on all endpoints

## Rules

- Follow `.ai/rules/security.md` (canonical source) for all security rules
- Every database query MUST be scoped by `organizationId`
- No secrets in any git-tracked file
- No raw SQL without parameterized queries
- All user input validated with Zod before processing
- JWT tokens must not be logged or stored in client-side storage (use httpOnly cookies)
- Flag any OWASP Top 10 violations immediately

## When to Use

- Reviewing code for security vulnerabilities
- Auditing multi-tenancy isolation (RLS, query scoping)
- Checking for credential leaks in code or docs
- Designing authentication/authorization flows
- Dependency security auditing
```

- [ ] **Step 4: Create `.ai/agents/database-expert.md`**

```markdown
# Database Expert

## Identity

You are a Database Engineer & PostgreSQL specialist working on the ECH-Kenshin multi-tenant SaaS platform.

## Expertise

- PostgreSQL 17 advanced features (RLS, partitioning, JSONB, GIN indexes)
- Drizzle ORM schema design and query optimization
- Multi-tenant database architecture
- Migration strategy and zero-downtime deployments
- Optimistic locking, append-only ledger patterns
- Connection pooling and performance tuning
- Index design and query plan analysis

## Context

- Schema source: `packages/database/src/schemas/` (5 domains, 48 tables)
- Auth: 10 tables (Better-Auth managed)
- PM: 27 tables (catalog, attributes, families, channels, listings, media)
- INV: 5 tables (warehouses, inventory items, ledger, stock sync)
- OMS: 3 tables (orders, items, status history)
- FUL: 3 tables (shipments, items, rules)
- ID strategy: TypeID for auth, UUID v4 for domain
- Multi-tenancy: `organizationId` on all domain tables + RLS
- Drizzle config: `packages/database/drizzle.config.ts`

## Rules

- Follow `.ai/rules/database.md` for all database conventions
- ALL domain tables MUST have `organizationId` column
- Use `domainId()` helper for UUID primary keys
- Soft deletes with `deletedAt` + partial unique indexes
- JSONB for flexible data — define TypeScript types for JSONB shapes
- Never `db:push` in production — always use migrations
- Never manually edit generated migration SQL
- Inventory ledger is append-only — NEVER update or delete rows

## When to Use

- Designing new database schemas or modifying existing ones
- Writing complex Drizzle queries (joins, aggregations, CTEs)
- Performance optimization (indexes, query plans, connection pooling)
- Migration design and execution strategy
- RLS policy design for multi-tenancy
- Data modeling decisions (normalization vs JSONB)
```

- [ ] **Step 5: Commit**

```bash
git add .ai/agents/
git commit -m "docs(ai): add agent personas (frontend, backend, security, database)"
```

---

## Task 11: AI Skills (`.ai/skills/`)

**Files:**
- Create: `.ai/skills/_index.md`
- Create: `.ai/skills/create-nestjs-module.md`
- Create: `.ai/skills/create-react-page.md`
- Create: `.ai/skills/api-endpoint-checklist.md`
- Create: `.ai/skills/pr-review-guide.md`

- [ ] **Step 1: Create `.ai/skills/_index.md`**

```markdown
# Shared Skills Registry

> AI: Check this index when starting a task. If a matching skill exists, follow it.

| Skill | When to Use | File |
|-------|-------------|------|
| Create NestJS Module | Creating a new domain submodule in the server | `create-nestjs-module.md` |
| Create React Page | Adding a new page/route to client-portal or admin-portal | `create-react-page.md` |
| API Endpoint Checklist | Creating or reviewing an API endpoint | `api-endpoint-checklist.md` |
| PR Review Guide | Reviewing a pull request | `pr-review-guide.md` |
```

- [ ] **Step 2: Create `.ai/skills/create-nestjs-module.md`**

```markdown
# Skill: Create NestJS Domain Module

> Step-by-step guide for creating a new submodule within a domain tower.

## When to Use

When adding a new business concept to the server (e.g., new entity, new feature within a tower).

## Steps

### 1. Create the folder structure

```
apps/server/src/towers/<domain>/<module-name>/
├── <module-name>.module.ts
├── <module-name>.controller.ts
├── <module-name>.service.ts
├── dto/
│   ├── create-<entity>.dto.ts
│   └── update-<entity>.dto.ts
└── <module-name>.spec.ts
```

### 2. Define the Drizzle schema

Create `packages/database/src/schemas/<domain>/<table-name>.ts`:

- Use `domainId()` for primary key
- Add `organizationId` column (required for multi-tenancy)
- Add `createdAt`, `updatedAt` timestamps
- Add `deletedAt` for soft deletes if applicable
- Export the table and its inferred types

### 3. Create DTOs with Zod

In `dto/create-<entity>.dto.ts`:

- Define Zod schema for input validation
- Export both the schema and the inferred TypeScript type
- Include only fields the client sends (no id, no timestamps)

### 4. Implement the service

In `<module-name>.service.ts`:

- Inject `DrizzleDb` via `@Inject('DrizzleDb')`
- All queries MUST filter by `organizationId`
- Use soft delete filter: `where(notDeleted)`
- Wrap multi-table operations in transactions

### 5. Implement the controller

In `<module-name>.controller.ts`:

- Use NestJS decorators: `@Controller()`, `@Get()`, `@Post()`, etc.
- Apply `@UseGuards(AuthGuard, OrgGuard)` if not globally applied
- Validate input with Zod pipe
- Return appropriate HTTP status codes (201 for create, 204 for delete)

### 6. Register the module

In `<module-name>.module.ts`:

- Import `DrizzleModule` from shared-kernel
- Register controller and service as providers
- Export service if other modules need it

Add the module to the parent tower module's imports.

### 7. Write tests

In `<module-name>.spec.ts`:

- Unit test service methods with mocked DrizzleDb
- Integration test controller endpoints with Supertest
- Test: happy path, validation errors, not found, org isolation

### 8. Generate migration

```bash
pnpm db:generate
```

Review the generated SQL migration file before applying.
```

- [ ] **Step 3: Create `.ai/skills/create-react-page.md`**

```markdown
# Skill: Create React Page

> Step-by-step guide for adding a new page/route to client-portal or admin-portal.

## When to Use

When adding a new page or feature screen to either frontend application.

## Steps

### 1. Create the page component

Create `apps/<app>/src/pages/<section>/<page-name>.tsx`:

```tsx
export default function PageName() {
  return (
    <div>
      <h1>Page Title</h1>
      {/* Page content */}
    </div>
  );
}
```

### 2. Add the route

In `apps/<app>/src/App.tsx`, add the route inside the protected routes:

```tsx
<Route path="/<section>/<page>" element={<PageName />} />
```

Use lazy loading for large pages:
```tsx
const PageName = lazy(() => import("./pages/<section>/<page-name>"));
```

### 3. Create data fetching hooks

In `apps/<app>/src/hooks/use-<entity>.ts`:

```tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useEntities(params) {
  return useQuery({
    queryKey: ["entities", params],
    queryFn: () => api.get("/api/entities", { params }),
  });
}

export function useCreateEntity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post("/api/entities", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["entities"] }),
  });
}
```

### 4. Add form validation (if applicable)

Create Zod schema for form validation:

```tsx
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const schema = z.object({
  name: z.string().min(1, "Required"),
  // ...fields
});

const form = useForm({ resolver: zodResolver(schema) });
```

### 5. Use @ech/ui components

- Layout: use `AppLayout` from `@ech/ui`
- Data display: use `DataTable` from `@ech/ui`
- Forms: use `Form`, `Input`, `Select`, `Button` from `@ech/ui`
- Feedback: use `sonner` for toast notifications

### 6. Add navigation

Update the sidebar/navigation component to include a link to the new page.

### 7. Test

- Verify the route renders correctly
- Test data fetching (loading, error, success states)
- Test form validation (if applicable)
- Test responsive layout
```

- [ ] **Step 4: Create `.ai/skills/api-endpoint-checklist.md`**

```markdown
# Skill: API Endpoint Checklist

> Checklist for creating or reviewing API endpoints. Verify each item.

## Creating a New Endpoint

- [ ] **Route**: Follows RESTful conventions (`GET /api/entities`, `POST /api/entities`, `GET /api/entities/:id`)
- [ ] **Controller**: HTTP handling only — no business logic
- [ ] **DTO**: Input validated with Zod schema
- [ ] **Service**: Business logic with `organizationId` scoping
- [ ] **Auth**: `AuthGuard` + `OrgGuard` applied (global or per-route)
- [ ] **Response**: Correct HTTP status codes (200, 201, 204, 400, 404, 409)
- [ ] **Error format**: RFC 7807 Problem Details (handled by global filter)
- [ ] **Soft delete**: Queries filter `deletedAt IS NULL`
- [ ] **Pagination**: List endpoints support `?page=1&limit=20`
- [ ] **Test**: Unit test for service, integration test for controller

## Security Checklist

- [ ] No secrets or credentials in code
- [ ] `organizationId` scoping on all queries
- [ ] Input validated — no unvalidated user input reaches the database
- [ ] No raw SQL — use Drizzle query builder (or parameterized queries if raw SQL is necessary)
- [ ] Rate limiting applied (global ThrottlerGuard)
- [ ] CORS configured for allowed origins only

## Performance Checklist

- [ ] No N+1 queries — use joins or batch loading
- [ ] Database indexes exist for frequent query patterns
- [ ] Large responses paginated
- [ ] Heavy operations offloaded to BullMQ jobs
```

- [ ] **Step 5: Create `.ai/skills/pr-review-guide.md`**

```markdown
# Skill: Pull Request Review Guide

> Structured checklist for reviewing pull requests on ECH-Kenshin.

## Tier 1: Peer Review (Developer)

Focus: readability, logic, correctness.

### Code Quality
- [ ] Variable and function names are clear and descriptive
- [ ] No hardcoded values — use constants or env vars
- [ ] No commented-out code (delete it, git has history)
- [ ] No `console.log` — use Pino logger
- [ ] No `any` types — TypeScript strict mode
- [ ] Biome lint passes (should be caught by pre-commit hook)

### Business Logic
- [ ] Code satisfies the task acceptance criteria
- [ ] Edge cases handled (null, empty array, missing fields)
- [ ] Error messages are helpful and user-facing

### Frontend (if applicable)
- [ ] Uses `@ech/ui` components — no duplicate UI primitives
- [ ] Responsive design works at mobile/tablet/desktop breakpoints
- [ ] Server state via TanStack Query — not local state
- [ ] Forms use react-hook-form + Zod

### Tests
- [ ] New code has tests
- [ ] Tests cover happy path and error cases
- [ ] Tests actually assert behavior (not just "doesn't throw")

## Tier 2: Tech Lead / SA Review

Focus: architecture, performance, security.

### Architecture
- [ ] Follows tower/module structure — no cross-tower imports
- [ ] New modules registered in parent module
- [ ] Drizzle schema follows naming conventions
- [ ] DTOs validated with Zod (not class-validator)

### Performance
- [ ] No N+1 queries
- [ ] Database indexes for new query patterns
- [ ] Large lists paginated
- [ ] Heavy work offloaded to BullMQ

### Security (Critical)
- [ ] `organizationId` scoping on ALL queries
- [ ] No secrets in code or docs
- [ ] Input validated before database access
- [ ] No raw SQL without parameterization
- [ ] CORS and rate limiting intact

### Multi-Tenancy
- [ ] New tables have `organizationId` column
- [ ] RLS policies considered for new tables
- [ ] No cross-tenant data leakage possible
```

- [ ] **Step 6: Commit**

```bash
git add .ai/skills/
git commit -m "docs(ai): add shared skills (NestJS module, React page, endpoint checklist, PR review)"
```

---

## Task 12: AI Setup Guide + `.claude/commands/`

**Files:**
- Create: `.ai/setup.md`
- Create: `.claude/commands/create-endpoint.md`
- Create: `.claude/commands/create-module.md`
- Create: `.claude/commands/review.md`

- [ ] **Step 1: Create `.ai/setup.md`**

```markdown
# AI Tool Setup Guide

> Configure your AI coding tool for the ECH-Kenshin project. Pull the repo and follow the section for your tool.

## Claude Code (CLI)

### Required Setup
1. Install Claude Code: follow [official docs](https://docs.anthropic.com/en/docs/claude-code)
2. Project config auto-loads from:
   - `CLAUDE.md` — Claude Code-specific settings
   - `AGENTS.md` — shared project rules (read first every session)
   - `.claude/settings.json` — project-level settings (git-tracked)
   - `.claude/commands/` — custom slash commands (git-tracked)

### Recommended Plugins
- **superpowers** — enhanced planning, brainstorming, TDD workflows
- **agent-browser** — headless browser for QA testing

Install: Claude Code plugin manager (see Claude Code docs for instructions).

### Custom Slash Commands
Available after install (from `.claude/commands/`):
- `/create-endpoint` — scaffold a new API endpoint
- `/create-module` — scaffold a new NestJS domain module
- `/review` — run code review checklist

### Agent Personas
Load specialized personas for focused work:
- "Read `.ai/agents/senior-frontend.md` and act as that role"
- "Read `.ai/agents/senior-backend.md` and act as that role"
- "Read `.ai/agents/security-auditor.md` and audit this code"
- "Read `.ai/agents/database-expert.md` and review this schema"

## Cursor

### Setup
1. Cursor automatically reads `.cursorrules` from the project root
2. Rules reference `AGENTS.md` and `.ai/rules/` for project conventions
3. Use `@files` to reference agent personas: `@.ai/agents/senior-frontend.md`

### Using Rules
- `.ai/rules/frontend.md` — add to Cursor rules for frontend work
- `.ai/rules/backend.md` — add to Cursor rules for backend work
- `.ai/rules/database.md` — add to Cursor rules for schema work
- `.ai/rules/security.md` — always active for security awareness

## GitHub Copilot

### Setup
1. Copilot reads `.github/copilot-instructions.md` automatically
2. Instructions reference `AGENTS.md` and `.ai/rules/`
3. For deeper context, manually reference docs in chat

### Custom Instructions
For specific tasks, paste the relevant `.ai/rules/<domain>.md` content into Copilot chat context.

## Zed AI

### Setup
1. Zed reads `.zed/settings.json` for editor config (already present)
2. Reference `AGENTS.md` at the start of each AI session
3. Paste relevant `.ai/rules/` content for domain-specific work

## General (Any AI Tool)

1. Start every session by reading `AGENTS.md`
2. For deeper context, follow links to `docs/INDEX.md`
3. Check `.ai/skills/_index.md` for task-specific workflows
4. Load agent personas from `.ai/agents/` when you need specialized expertise
5. Follow `.ai/rules/security.md` at all times
```

- [ ] **Step 2: Create `.claude/commands/create-endpoint.md`**

```markdown
Create a new API endpoint following ECH-Kenshin conventions.

Read `.ai/skills/api-endpoint-checklist.md` for the full checklist, and `.ai/skills/create-nestjs-module.md` if creating a new module.

Ask me:
1. Which domain tower? (PM, INV, OMS, FUL)
2. Which existing submodule, or is this a new submodule?
3. HTTP method and route path?
4. What data does it accept and return?

Then:
- Create the controller method with proper decorators
- Create the Zod DTO for input validation
- Add the service method with organizationId scoping
- Write a test for the endpoint
- Follow `.ai/rules/backend.md` conventions
```

- [ ] **Step 3: Create `.claude/commands/create-module.md`**

```markdown
Create a new NestJS domain module following ECH-Kenshin conventions.

Read `.ai/skills/create-nestjs-module.md` for the step-by-step guide.

Ask me:
1. Which domain tower? (PM, INV, OMS, FUL)
2. What is the module name and its business purpose?
3. What database tables does it need?

Then follow all 8 steps in the create-nestjs-module skill:
1. Create folder structure
2. Define Drizzle schema
3. Create Zod DTOs
4. Implement service
5. Implement controller
6. Register module
7. Write tests
8. Generate migration

Follow `.ai/rules/backend.md` and `.ai/rules/database.md` conventions.
```

- [ ] **Step 4: Create `.claude/commands/review.md`**

```markdown
Review the current changes against ECH-Kenshin coding standards.

Read `.ai/skills/pr-review-guide.md` for the full checklist.

Run through both review tiers:

**Tier 1 (Peer Review):**
- Code quality: naming, no hardcoded values, no console.log, no `any`
- Business logic: acceptance criteria, edge cases
- Frontend: @ech/ui components, TanStack Query, react-hook-form
- Tests: coverage, assertions

**Tier 2 (Architecture):**
- Tower/module structure compliance
- Drizzle schema conventions
- Performance: N+1 queries, indexes, pagination
- Security: organizationId scoping, input validation, no secrets

Check the git diff and report findings with severity (Critical / Warning / Suggestion).
```

- [ ] **Step 5: Commit**

```bash
git add .ai/setup.md .claude/commands/
git commit -m "docs(ai): add AI tool setup guide and Claude Code slash commands"
```

---

## Task 13: Module READMEs

**Files:**
- Overwrite: `apps/server/README.md`
- Overwrite: `apps/client-portal/README.md`
- Create: `apps/admin-portal/README.md`
- Create: `packages/database/README.md`
- Create: `packages/core/README.md`
- Create: `packages/ui/README.md`
- Create: `packages/form-engine/README.md`
- Create: `packages/amazon-wizard/README.md`
- Create: `packages/biome-config/README.md`
- Create: `packages/typescript-config/README.md`

- [ ] **Step 1: Create `apps/server/README.md`** (overwrite existing)

```markdown
# @ech/server

> NestJS 11 backend on Fastify v5 — API server for ECH-Kenshin platform.

## Scope

HTTP API, authentication, background jobs, and domain business logic. Organized as a modular monolith with domain towers (PM, INV).

## Quick Start

```bash
# From monorepo root
pnpm --filter @ech/server dev          # Start dev server (port 8000)
pnpm --filter @ech/server test         # Run all tests
pnpm --filter @ech/server test:watch   # Watch mode
pnpm --filter @ech/server test:e2e     # E2E tests
```

Requires: PostgreSQL, Redis, MinIO running (see `docker compose up -d`).

## Environment Variables

See `docs/onboarding/env-guide.md` for full list. Key vars:
- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_HOST` / `REDIS_PORT` — Redis for cache and BullMQ
- `JWT_SECRET` / `BETTER_AUTH_SECRET` — auth secrets (min 32 chars)
- `S3_ENDPOINT` / `S3_BUCKET` — MinIO/S3 for media storage

## Key Patterns

- **Tower architecture**: `src/towers/pm/` (17 submodules), `src/towers/inv/` (2 submodules)
- **Presentation layer**: `src/presentation/` — config, filters, interceptors, logger
- **Shared kernel**: `src/shared-kernel/` — auth guards, Drizzle provider, DTOs, utils
- **Path aliases**: `@presentation/*`, `@shared-kernel/*`, `@towers/*`
- API docs: `http://localhost:8000/docs` (Swagger/Scalar)

## Dependencies

- `@ech/database` — Drizzle ORM schemas
- `@ech/core` — shared utilities
- `@nestjs/bullmq` — background jobs
- `better-auth` — authentication
- `nestjs-cls` — request context
- `nestjs-pino` — structured logging
```

- [ ] **Step 2: Create `apps/client-portal/README.md`** (overwrite existing empty)

```markdown
# @ech/client-portal

> React 18 SPA — primary user interface for ECH-Kenshin platform.

## Scope

Product management, inventory, orders, fulfillment, channel management, and PIM taxonomy. The main interface used by sellers and operators.

## Quick Start

```bash
# From monorepo root
pnpm --filter @ech/client-portal dev   # Start dev server (port 3050)
```

Requires: server running at `http://localhost:8000`.

## Environment Variables

- `VITE_API_URL` — backend API URL (default: `http://localhost:8000`)
- `VITE_PORT` — dev server port (default: `3050`)

## Key Patterns

- **Routing**: React Router v6 with protected routes (auth guard)
- **Data fetching**: TanStack Query v5 — all API state via queries/mutations
- **Forms**: react-hook-form + Zod validation
- **Components**: `@ech/ui` (shadcn-based), `@ech/form-engine` (dynamic forms)
- **State**: React Context (auth only), TanStack Query (server state)
- **Styling**: Tailwind CSS

## Key Routes

`/dashboard`, `/products`, `/orders`, `/fulfillment`, `/inventory`, `/channels`, `/pim` (attributes, families, categories, classifications, media)

## Dependencies

- `@ech/ui` — shared UI components
- `@ech/form-engine` — dynamic form engine
- `@ech/amazon-wizard` — Amazon listing wizard
- `@ech/core` — shared utilities
- `@tanstack/react-query` — data fetching
- `react-router` — routing
- `highcharts` — data visualization
```

- [ ] **Step 3: Create `apps/admin-portal/README.md`**

```markdown
# @ech/admin-portal

> React 18 SPA — admin dashboard for taxonomy and organization management.

## Scope

Taxonomy management (families, attributes, attribute groups, classifications, categories) and organization administration. Used by platform admins and tech leads.

## Quick Start

```bash
# From monorepo root
pnpm --filter @ech/admin-portal dev    # Start dev server (port 5174)
```

Requires: server running at `http://localhost:8000`.

## Environment Variables

- `VITE_API_URL` — backend API URL (default: `http://localhost:8000`)

## Key Patterns

- **Routing**: React Router v6 with auth guard
- **Data fetching**: TanStack Query v5
- **Tables**: TanStack Table v8 for data display
- **Components**: `@ech/ui` (shared component library)
- **Notifications**: sonner for toasts

## Key Routes

`/taxonomy/families`, `/taxonomy/attributes`, `/taxonomy/attribute-groups`, `/taxonomy/classifications`, `/taxonomy/categories`, `/organizations`

## Dependencies

- `@ech/ui` — shared UI components
- `@ech/core` — shared utilities
- `@tanstack/react-query` — data fetching
- `@tanstack/react-table` — data tables
```

- [ ] **Step 4: Create `packages/database/README.md`**

```markdown
# @ech/database

> Drizzle ORM schemas — single source of truth for all database tables.

## Scope

PostgreSQL schema definitions, database client, type exports. All table schemas for auth, PM, INV, OMS, and FUL domains.

## Quick Start

```bash
# From monorepo root
pnpm db:generate    # Generate migration from schema changes
pnpm db:migrate     # Apply pending migrations
pnpm db:push        # Push schema directly (dev only!)
pnpm db:studio      # Open Drizzle Studio GUI
```

## Schema Domains

| Domain | Tables | Path |
|--------|--------|------|
| auth | 10 | `src/schemas/auth/` |
| pm | 27 | `src/schemas/pm/` |
| inv | 5 | `src/schemas/inv/` |
| oms | 3 | `src/schemas/oms/` |
| ful | 3 | `src/schemas/ful/` |

## Key Patterns

- `domainId()` — UUID v4 primary key helper
- `organizationId` — required on all domain tables (multi-tenancy)
- Soft deletes: `deletedAt` column + `notDeleted` filter
- JSONB columns for flexible data (`values`, `settings`, `address`)
- TypeID for auth entities, UUID v4 for domain entities

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string

## Dependencies

- `drizzle-orm` — ORM
- `drizzle-kit` — migration tooling
- `postgres` — PostgreSQL driver
```

- [ ] **Step 5: Create `packages/core/README.md`**

```markdown
# @ech/core

> Shared utilities and types used across the ECH-Kenshin monorepo.

## Scope

Cross-cutting utilities (pagination, common types) shared by server and frontend packages. Does NOT contain business logic.

## Usage

```typescript
import { ... } from "@ech/core";
import { ... } from "@ech/core/utils";
```

## Key Exports

- Pagination utilities
- Common TypeScript types
- Shared utility functions

## Dependencies

No external dependencies — pure TypeScript utilities.
```

- [ ] **Step 6: Create `packages/ui/README.md`**

```markdown
# @ech/ui

> Headless UI component library — shadcn-based, shared across frontends.

## Scope

50+ reusable React components (buttons, inputs, dialogs, tables, charts, layout), hooks, and utilities. Used by both client-portal and admin-portal.

## Usage

```typescript
import { Button, Input, Card, Dialog } from "@ech/ui";
import { DataTable } from "@ech/ui/components/data-table";
import { AppLayout } from "@ech/ui/components/layout";
```

## Component Categories

- **Partials** (50+): accordion, alert, avatar, badge, button, calendar, card, checkbox, command, dialog, dropdown-menu, form, input, label, pagination, popover, select, table, tabs, tooltip, and more
- **Layout**: AppLayout, sidebar, navigation
- **Data Table**: sortable, filterable tables with TanStack Table
- **Charts**: Recharts-based chart components
- **Shared**: common patterns (loading states, error boundaries)

## Key Patterns

- Tailwind CSS for styling — no CSS modules
- Class merging via `cx()` utility
- Headless patterns — minimal styling, maximum flexibility
- Accessible (ARIA attributes, keyboard navigation)

## Dependencies

- `react` — peer dependency
- `tailwindcss` — styling
- `class-variance-authority` — variant styles
- `lucide-react` — icons
- `recharts` — charts
```

- [ ] **Step 7: Create `packages/form-engine/README.md`**

```markdown
# @ech/form-engine

> Dynamic form generation and validation engine for attribute-driven forms.

## Scope

Generates forms dynamically based on product attribute definitions (EAV model). Used in client-portal for product editing and channel listing forms.

## Usage

```typescript
import { useFormEngine, validateForm, FieldRegistry } from "@ech/form-engine";
```

## Key Exports

- `useFormEngine` — React hook for managing dynamic form state
- `FieldRegistry` — registry of field type renderers
- `validateField` / `validateForm` — field and form validation
- `flattenAttributes` — flatten nested attribute structures
- `types` — TypeScript type definitions

## Key Patterns

- Attribute-driven: form fields generated from attribute schemas (not hardcoded)
- Field registry pattern: register custom renderers per field type
- Validation: field-level + form-level validation with custom rules

## Dependencies

- `react` — peer dependency
- `@ech/core` — shared types
```

- [ ] **Step 8: Create `packages/amazon-wizard/README.md`**

```markdown
# @ech/amazon-wizard

> Multi-step wizard for Amazon product listing via SP-API.

## Scope

Schema-driven wizard that guides sellers through creating Amazon product listings. Handles product type selection, attribute mapping, variation setup, and submission.

## Usage

```typescript
import { WizardShell, loadAmazonSchema } from "@ech/amazon-wizard";
import { buildParentPayload, buildChildPayload } from "@ech/amazon-wizard";
```

## Key Exports

- `WizardShell` — main wizard component (multi-step UI)
- `loadAmazonSchema` — load Amazon product type schemas
- `buildParentPayload` / `buildChildPayload` — build SP-API request payloads
- `buildCurlCommand` — generate cURL for debugging
- `useWizardNavigation` / `useSchema` / `useVariationStore` — hooks

## Architecture

- `wizard/` — wizard shell and step components
- `schema/` — Amazon schema loading and type definitions
- `request/` — SP-API request builders
- `renderers/` — 21 field type renderers (text, select, number, etc.)
- `hooks/` — navigation, schema, variation hooks
- `variation/` — parent-child variation handling
- `store/` — Zustand state management (wizard-specific)

## Dependencies

- `react` — peer dependency
- `zustand` — wizard state management
- `@ech/ui` — UI components
```

- [ ] **Step 9: Create `packages/biome-config/README.md`**

```markdown
# @ech/biome-config

> Shared Biome lint and format configuration for the ECH-Kenshin monorepo.

## Scope

Centralized Biome configuration that all packages extend. Ensures consistent code style across the project.

## Usage

In a package's `biome.json`:
```json
{
  "extends": ["@ech/biome-config"]
}
```

## Key Settings

- Indentation: tabs
- Line width: 120 characters
- TypeScript strict mode enforced
- Import organization on save
```

- [ ] **Step 10: Create `packages/typescript-config/README.md`**

```markdown
# @ech/typescript-config

> Shared TypeScript configuration presets for the ECH-Kenshin monorepo.

## Scope

Base `tsconfig.json` presets that all packages extend. Ensures consistent TypeScript compiler settings.

## Usage

In a package's `tsconfig.json`:
```json
{
  "extends": "@ech/typescript-config/base.json"
}
```

## Key Settings

- Strict mode enabled
- ES2022 target
- Module resolution: bundler
- Path aliases configured per-package
```

- [ ] **Step 11: Commit**

```bash
git add apps/server/README.md apps/client-portal/README.md apps/admin-portal/README.md packages/*/README.md
git commit -m "docs(modules): add project-specific READMEs for all apps and packages"
```

---

## Task 14: Update README.md

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update Monorepo Structure**

Replace the current Monorepo Structure section in `README.md` to match actual packages:

```markdown
## Monorepo Structure

- **pnpm workspaces** + **Turborepo** for orchestration
- `apps/server` — NestJS 11 backend on Fastify v5 (compiled with SWC)
- `apps/client-portal` — React 18 + React Router v6 (primary UI, port 3050)
- `apps/admin-portal` — React 18 + React Router v6 (admin dashboard, port 5174)
- `packages/database` — Drizzle ORM schemas (source of truth for all DB tables)
- `packages/core` — Shared utilities and types (exports `@ech/core` and `@ech/core/utils`)
- `packages/ui` — Headless UI component library — shadcn-based (`@ech/ui`)
- `packages/form-engine` — Dynamic form generation and validation engine (`@ech/form-engine`)
- `packages/amazon-wizard` — Multi-step Amazon listing wizard (`@ech/amazon-wizard`)
- `packages/biome-config` — Shared Biome lint/format presets
- `packages/typescript-config` — Shared tsconfig presets
```

- [ ] **Step 2: Fill in empty Architecture sections**

Replace the empty sections with pointers to docs:

```markdown
## Architecture

### Server (`apps/server`)

See `docs/architecture/overview.md` for full system architecture and `docs/architecture/data-flow.md` for request lifecycle.

NestJS app with domain tower architecture. Path aliases: `@presentation/*` (HTTP layer), `@shared-kernel/*` (infrastructure), `@towers/*` (domain modules). Global prefix `/api`. API docs at `/docs`.

### Domain Towers (Modular Monolith)

See `docs/product/domains/` for detailed tower specifications.

- **PM** (Product Master) — Catalog, EAV attributes, variants, families, channel mapping (17 submodules)
- **INV** (Inventory) — Multi-warehouse stock, optimistic locking, append-only ledger (2 submodules)
- **OMS** (Order Management) — Order ingestion, status routing (schema defined, implementation pending)
- **FUL** (Fulfillment) — FBA/FBM dispatch, shipment tracking (schema defined, implementation pending)

### Database (`packages/database`)

See `docs/architecture/overview.md` for database architecture details.

PostgreSQL 17 with Drizzle ORM. 48 tables across 5 domains. Multi-tenancy via `organizationId` + RLS. TypeID for auth entities, UUID v4 for domain entities.
```

- [ ] **Step 3: Fix commit format**

Replace `[task:<ticket>]` with consistent format and remove `packages/auth` reference if present.

- [ ] **Step 4: Add documentation pointer**

Add at the end of README.md before Key Dependencies:

```markdown
## Documentation

- **Full docs index**: `docs/INDEX.md`
- **Architecture**: `docs/architecture/`
- **Product specs**: `docs/product/`
- **Coding standards**: `docs/standards/`
- **Setup guide**: `docs/onboarding/setup.md`
- **Contributing**: `docs/CONTRIBUTE.md`
- **AI tool setup**: `.ai/setup.md`
```

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs(readme): update monorepo structure, architecture sections, add docs pointers"
```

---

## Task 15: Final Verification

- [ ] **Step 1: Verify all files exist**

Run:
```bash
echo "=== Core Config ===" && ls -la CLAUDE.md .cursorrules .github/copilot-instructions.md && echo "=== Docs ===" && find docs -name "*.md" | sort && echo "=== AI Workspace ===" && find .ai -name "*.md" | sort && echo "=== Claude Commands ===" && find .claude/commands -name "*.md" | sort && echo "=== Module READMEs ===" && find apps packages -name "README.md" | sort
```

Expected: 48 files total (43 new + 2 overwritten + 3 modified).

- [ ] **Step 2: Verify .gitignore works**

Run:
```bash
git status
```

Verify:
- `.ai/` files show as trackable (not ignored)
- `.claude/commands/` files show as trackable
- `.claude/memory/` does NOT show (ignored)

- [ ] **Step 3: Verify AGENTS.md line count**

Run:
```bash
wc -l AGENTS.md
```

Expected: under 200 lines.

- [ ] **Step 4: Verify no secrets in any file**

Run:
```bash
grep -r "sk_live\|sk_test_[a-zA-Z0-9]\{20\}\|password1234\|minioadmin" docs/ .ai/ CLAUDE.md .cursorrules .github/copilot-instructions.md || echo "No secrets found"
```

Expected: "No secrets found"

- [ ] **Step 5: Final commit if needed**

If any fixes were required, commit them:
```bash
git add -A
git commit -m "chore(workspace): final verification and fixes for AI workspace setup"
```
