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
