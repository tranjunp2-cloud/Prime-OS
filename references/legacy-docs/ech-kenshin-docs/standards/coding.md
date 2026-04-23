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
