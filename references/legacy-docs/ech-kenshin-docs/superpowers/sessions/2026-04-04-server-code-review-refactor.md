## Session: 2026-04-04 — Server Code Review Refactor

**Goal:** Comprehensive code review + 4-phase refactoring of `apps/server` — fixing security vulnerabilities, performance bottlenecks, convention violations, and dead code.

**Branch:** `refactor/CR-081-review-refactor-be-architect`
**Commits:** 32 (071bc31..068f162)

**What was done:**

Phase 1 — Critical Fixes (Security + Data Integrity):
- Fixed rate limiting bug (`THROTTLER_TTL_SEC` used for both TTL and limit → now correctly uses `THROTTLER_LIMIT`)
- Added organizationId filtering to product reads in listings-form service (cross-tenant data leak)
- Added org isolation to family variant mutations (updateVariant/deleteVariant wrapped in transactions with ownership check)
- Replaced raw SQL template literals with `inArray()` in provisioning service (SQL injection risk)
- Fixed completeness calculation bug (loop variable `_attrId` was ignored — all attrs counted as filled if any had value)
- Added Zod validation to `bulkDelete` and `unassign` endpoints (previously unvalidated)

Phase 2 — High Priority (Performance + Safety):
- Replaced `console.log`/`console.error` with NestJS Logger in DrizzleModule
- Added error handling to `decodeCursor` for malformed base64/JSON
- Batch-loaded existing records in GPC importers (eliminated N+1 queries — individual queries per group/attribute/link → single batch load into Map)
- Added `depth` limit (default 10, max 20) to category `getTree()` to prevent unbounded memory usage
- Batched child-linking UPDATEs in listings import using SQL CASE statements + wrapped import loop in transaction

Phase 3 — Medium (Conventions + Architecture):
- Used `firstOrNull` helper in OrgGuard (was using raw `[0]`)
- Optimized trace-context utils: hoisted regex to module scope, replaced `Math.random` with `crypto.randomBytes`
- Injected `ConfigService` in ThrottlerExceptionFilter (was using `process.env` directly)
- Extracted `inferErrorCode` from ProblemDetailsFilter into standalone utility
- Added S3 rollback on DB insert failure in media upload (with cleanup error handling)
- Added idempotency check to GlobalUpdateWorker (checks if update already applied before re-executing)

Phase 4 — Low (Cleanup + Polish):
- Removed empty `tap()` operators from 3 interceptors
- Aligned ZodValidationPipe error format with RFC 9457 ProblemDetails
- Added filename sanitization regex to media DTO (path traversal prevention)
- Removed unused `TypedResponse` type, moved `ValidationErrorItem` inline

Post-Review Fixes:
- Fixed `ValidationErrorItem` import broken by file deletion
- Added try-catch around S3 cleanup in media service
- Restored `depth` parameter name (was renamed to `maxDepth` — breaking API change)
- Replaced raw SQL `IS NOT NULL` with `isNotNull()` in global-update service
- Removed redundant `[DrizzleModule]` prefix from log messages
- Fixed stale test expectations that assumed old buggy completeness behavior
- Fixed `sql.inList` runtime error → replaced with `sql.join()` pattern

**Decisions made:**
- Kept backward-compatible `depth` query param name instead of `maxDepth` to avoid breaking frontend
- Import transaction wrapping uses all-or-nothing semantics (single transaction for entire batch)
- S3 rollback on DB failure logs cleanup errors but doesn't suppress the original error
- Worker idempotency uses version+checksum comparison rather than separate processed-jobs table

**Key prompts that worked well:**
- `/review-and-refactor` → comprehensive code review with parallel Explore agents across 4 areas
- `/superpowers:writing-plans` → structured 4-phase plan with file map and dependency graph
- `/superpowers:requesting-code-review` → dispatched code-reviewer agent that caught C1 (broken import) and I3 (breaking API change)
- `/superpowers:systematic-debugging` → traced `sql.inList` runtime error to root cause in 2 minutes
- `/superpowers:verification-before-completion` → final gate ensuring 401/401 tests + 0 type errors

**Next steps:**
- Consider moving GPC import to async BullMQ worker (currently synchronous HTTP — timeout risk with large taxonomies)
- RLS migration still pending (separate branch)
- Amazon import bugs (title extraction, parent-child hierarchy, schema sync) still unresolved
