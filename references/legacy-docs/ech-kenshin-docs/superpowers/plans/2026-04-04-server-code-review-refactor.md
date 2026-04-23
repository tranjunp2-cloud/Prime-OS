# Server Code Review Refactoring Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all critical security, data integrity, performance, and convention issues identified in the comprehensive `apps/server` code review.

**Architecture:** Four-phase approach — security/data-integrity first, then performance/safety, then convention/architecture cleanup, then polish. Each phase produces independently shippable, testable commits. Phases can be merged separately.

**Tech Stack:** NestJS 11, Drizzle ORM, Zod v4, Pino, BullMQ, Vitest

---

## File Map

### Phase 1 — Critical Fixes (Security + Data Integrity)
| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `apps/server/src/presentation/filters/throttler-exception.filter.ts:24` | Fix env var typo |
| Modify | `apps/server/src/towers/pm/listings/listings-form.service.ts:65-70, 234-239` | Add orgId to product reads |
| Modify | `apps/server/src/towers/pm/families/families.service.ts:243-278` | Add orgId to variant mutations |
| Modify | `apps/server/src/towers/pm/provisioning/provisioning.service.ts:106, 148` | Replace raw SQL with `inArray()` |
| Modify | `apps/server/src/towers/pm/products/products-form.service.ts:284-291` | Fix completeness calculation |
| Modify | `apps/server/src/towers/pm/products/products.controller.ts:188` | Add Zod validation to bulkDelete |
| Modify | `apps/server/src/towers/pm/provisioning/provisioning.controller.ts:62` | Add Zod validation to unassign |
| Create | `apps/server/src/towers/pm/products/dto/bulk-delete.dto.ts` | Zod schema for bulk delete |
| Create | `apps/server/src/towers/pm/provisioning/dto/unassign.dto.ts` | Zod schema for unassign |

### Phase 2 — High Priority (Performance + Safety)
| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `apps/server/src/shared-kernel/infrastructure/db/db.module.ts:23-37` | Replace console.log with Pino |
| Modify | `apps/server/src/shared-kernel/infrastructure/utils/pagination.ts:5-7` | Add error handling to decodeCursor |
| Modify | `apps/server/src/main.ts:94` | Configure Helmet security headers |
| Modify | `apps/server/src/towers/pm/gpc-seed/global-taxonomy-importer.ts:86-245` | Batch-load existing records |
| Modify | `apps/server/src/towers/pm/gpc-seed/family-template-importer.ts:75-182` | Batch-load existing records |
| Modify | `apps/server/src/towers/pm/categories/categories.service.ts:141-189` | Add depth limit to getTree |
| Modify | `apps/server/src/towers/pm/listings/listings-import.service.ts:576-586` | Batch child-linking updates |
| Modify | `apps/server/src/towers/pm/listings/listings-import.service.ts:352-490` | Wrap import loop in transaction |

### Phase 3 — Medium (Conventions + Architecture)
| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `apps/server/src/shared-kernel/infrastructure/auth/org.guard.ts:50` | Use `firstOrNull` |
| Modify | `apps/server/src/shared-kernel/infrastructure/utils/trace-context.util.ts:60, 102-116` | Hoist regex, use crypto |
| Modify | `apps/server/src/presentation/filters/throttler-exception.filter.ts:23-24` | Inject ConfigService |
| Modify | `apps/server/src/presentation/filters/problem-details.filter.ts` | Extract inferErrorCode to util |
| Modify | `apps/server/src/towers/pm/media/media.service.ts:38-83` | Add S3 rollback on DB failure |
| Modify | `apps/server/src/towers/pm/global-update/global-update.worker.ts:15-56` | Add idempotency check |

### Phase 4 — Low (Cleanup + Polish)
| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `apps/server/src/presentation/interceptors/correlation-id.interceptor.ts` | Remove empty tap() |
| Modify | `apps/server/src/presentation/interceptors/request-context.interceptor.ts` | Remove empty tap() |
| Modify | `apps/server/src/presentation/interceptors/trace-context.interceptor.ts` | Remove empty tap() |
| Modify | `apps/server/src/shared-kernel/infrastructure/pipes/zod-validation.pipe.ts:21-25` | Align with RFC 9457 format |
| Delete | `apps/server/src/shared-kernel/infrastructure/types/validation-error.type.ts` | Remove if `TypedResponse` unused |
| Modify | `apps/server/src/towers/pm/media/dto/media.dto.ts` | Add filename sanitization |

---

## Phase 1: Critical Fixes (Security + Data Integrity)

### Task 1.1: Fix Rate Limiting Environment Variable Bug

**Files:**
- Modify: `apps/server/src/presentation/filters/throttler-exception.filter.ts:24`

- [ ] **Step 1: Write a failing test**

Create a test that verifies the filter reads `THROTTLER_LIMIT` (not `THROTTLER_TTL_SEC`) for the limit value. The test should set `THROTTLER_LIMIT=25` and assert the `Retry-After` response reflects the correct limit.

Test file: `apps/server/src/presentation/filters/throttler-exception.filter.spec.ts`

- [ ] **Step 2: Run test — expect FAIL**

```bash
pnpm --filter @ech/server exec vitest run src/presentation/filters/throttler-exception.filter.spec.ts
```

Expected: FAIL because current code reads `THROTTLER_TTL_SEC` for limit.

- [ ] **Step 3: Fix the bug**

In `throttler-exception.filter.ts` line 24, change:
```typescript
// FROM:
const limit = Number(process.env.THROTTLER_TTL_SEC || 10);
// TO:
const limit = Number(process.env.THROTTLER_LIMIT || 10);
```

- [ ] **Step 4: Run test — expect PASS**

```bash
pnpm --filter @ech/server exec vitest run src/presentation/filters/throttler-exception.filter.spec.ts
```

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/presentation/filters/throttler-exception.filter.ts apps/server/src/presentation/filters/throttler-exception.filter.spec.ts
git commit -m "fix(server): use THROTTLER_LIMIT env var for rate limit value"
```

---

### Task 1.2: Add organizationId Filtering to Product Reads in Listings

**Files:**
- Modify: `apps/server/src/towers/pm/listings/listings-form.service.ts:65-70, 234-239`
- Test: `apps/server/src/towers/pm/listings/listings-form.service.spec.ts`

- [ ] **Step 1: Write failing tests**

Add two tests: one for `getDynamicForm()` and one for `validate()` — each should assert that the product query includes `eq(products.organizationId, orgId)` in the WHERE clause. Use the existing DB mock pattern from `__test-utils__/create-db-mock.ts`.

- [ ] **Step 2: Run tests — expect FAIL**

```bash
pnpm --filter @ech/server exec vitest run src/towers/pm/listings/listings-form.service.spec.ts
```

- [ ] **Step 3: Fix the queries**

At line 68, change:
```typescript
// FROM:
.where(eq(products.id, listing.productId))
// TO:
.where(and(eq(products.id, listing.productId), eq(products.organizationId, orgId)))
```

Same change at line 237. Ensure `orgId` is obtained from `this.ctx.getOrgId()` at the start of each method. Import `and` from drizzle-orm if not already imported.

- [ ] **Step 4: Run tests — expect PASS**

```bash
pnpm --filter @ech/server exec vitest run src/towers/pm/listings/listings-form.service.spec.ts
```

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/towers/pm/listings/listings-form.service.ts apps/server/src/towers/pm/listings/listings-form.service.spec.ts
git commit -m "fix(listings): add organizationId filter to product reads in form service"
```

---

### Task 1.3: Add organizationId Filtering to Family Variant Mutations

**Files:**
- Modify: `apps/server/src/towers/pm/families/families.service.ts:243-278`
- Test: `apps/server/src/towers/pm/families/families.service.spec.ts`

- [ ] **Step 1: Write failing tests**

Add tests for `updateVariant()` and `deleteVariant()` that verify orgId is used in the WHERE clause. Test that a variant belonging to a different org is NOT updated/deleted.

- [ ] **Step 2: Run tests — expect FAIL**

```bash
pnpm --filter @ech/server exec vitest run src/towers/pm/families/families.service.spec.ts
```

- [ ] **Step 3: Fix updateVariant()**

At line 247, the WHERE clause must join through `familyVariants → families → organizationId`:
```typescript
// Add org check: join familyVariants to families, verify families.organizationId = orgId
// OR: subquery to verify the variant belongs to a family owned by the current org
```

Get `orgId` from `this.ctx.getOrgId()`. Add a preliminary ownership check before the update. Throw `NotFoundException` if variant doesn't belong to org.

- [ ] **Step 4: Fix deleteVariant()**

Same pattern as updateVariant — verify ownership before deletion at line 272.

- [ ] **Step 5: Run tests — expect PASS**

```bash
pnpm --filter @ech/server exec vitest run src/towers/pm/families/families.service.spec.ts
```

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/towers/pm/families/families.service.ts apps/server/src/towers/pm/families/families.service.spec.ts
git commit -m "fix(families): enforce org isolation on variant update and delete"
```

---

### Task 1.4: Replace Raw SQL with inArray() in Provisioning

**Files:**
- Modify: `apps/server/src/towers/pm/provisioning/provisioning.service.ts:106, 148`
- Test: `apps/server/src/towers/pm/provisioning/provisioning.service.spec.ts` (create if missing)

- [ ] **Step 1: Write a failing test**

Test that `assign()` and `unassign()` work correctly with array inputs. Mock the DB and verify the correct Drizzle operators are called (no raw SQL template literals).

- [ ] **Step 2: Run test — expect FAIL**

```bash
pnpm --filter @ech/server exec vitest run src/towers/pm/provisioning/provisioning.service.spec.ts
```

- [ ] **Step 3: Replace raw SQL**

At line 106-107, change:
```typescript
// FROM:
sql`${classifications.familyId} IN ${dto.familyIds}`
// TO:
inArray(classifications.familyId, dto.familyIds)
```

At line 148, change:
```typescript
// FROM:
sql`${organizationClassifications.classificationId} IN ${classificationIds}`
// TO:
inArray(organizationClassifications.classificationId, classificationIds)
```

Import `inArray` from `drizzle-orm`.

- [ ] **Step 4: Run test — expect PASS**

```bash
pnpm --filter @ech/server exec vitest run src/towers/pm/provisioning/provisioning.service.spec.ts
```

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/towers/pm/provisioning/provisioning.service.ts apps/server/src/towers/pm/provisioning/provisioning.service.spec.ts
git commit -m "fix(provisioning): replace raw SQL with inArray() for safe array queries"
```

---

### Task 1.5: Fix Completeness Calculation Bug

**Files:**
- Modify: `apps/server/src/towers/pm/products/products-form.service.ts:284-291`
- Test: `apps/server/src/towers/pm/products/products-form.service.spec.ts`

- [ ] **Step 1: Write a failing test**

Test that completeness is calculated per-attribute, not globally. Given `allRequired = ["attr_1", "attr_2"]` and `productValues = { attr_1: { en: "value" } }`, expected completeness should be 50% (1/2), not 100%.

- [ ] **Step 2: Run test — expect FAIL**

```bash
pnpm --filter @ech/server exec vitest run src/towers/pm/products/products-form.service.spec.ts
```

Current bug: returns 100% because the loop ignores `_attrId` and checks all values generically.

- [ ] **Step 3: Fix the calculation**

At lines 284-291, change:
```typescript
// FROM:
for (const _attrId of allRequired) {
    const hasValue = Object.keys(productValues).some((key) => {
        const val = productValues[key];
        return val && Object.keys(val).length > 0;
    });
    if (hasValue) filled++;
}

// TO:
for (const attrId of allRequired) {
    const val = productValues[attrId];
    if (val && typeof val === "object" && Object.keys(val).length > 0) {
        filled++;
    }
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
pnpm --filter @ech/server exec vitest run src/towers/pm/products/products-form.service.spec.ts
```

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/towers/pm/products/products-form.service.ts apps/server/src/towers/pm/products/products-form.service.spec.ts
git commit -m "fix(products): use per-attribute check in completeness calculation"
```

---

### Task 1.6: Add Zod Validation to Unvalidated Endpoints

**Files:**
- Create: `apps/server/src/towers/pm/products/dto/bulk-delete.dto.ts`
- Create: `apps/server/src/towers/pm/provisioning/dto/unassign.dto.ts`
- Modify: `apps/server/src/towers/pm/products/products.controller.ts:188`
- Modify: `apps/server/src/towers/pm/provisioning/provisioning.controller.ts:62`

- [ ] **Step 1: Create bulk-delete DTO**

Create `bulk-delete.dto.ts` with a Zod schema that validates `ids` as a non-empty array of UUID strings.

```typescript
import { z } from "zod/v4";

export const bulkDeleteSchema = z.object({
    ids: z.array(z.uuid()).min(1, "At least one ID is required"),
});

export type BulkDeleteDto = z.infer<typeof bulkDeleteSchema>;
```

- [ ] **Step 2: Create unassign DTO**

Create `unassign.dto.ts` with a Zod schema that validates `classificationIds` as a non-empty array of UUID strings.

```typescript
import { z } from "zod/v4";

export const unassignClassificationsSchema = z.object({
    classificationIds: z.array(z.uuid()).min(1, "At least one classification ID is required"),
});

export type UnassignClassificationsDto = z.infer<typeof unassignClassificationsSchema>;
```

- [ ] **Step 3: Wire DTOs into controllers**

In `products.controller.ts:188`, change `@Body() dto: { ids: string[] }` to `@Body(new ZodValidationPipe(bulkDeleteSchema)) dto: BulkDeleteDto`.

In `provisioning.controller.ts:62`, change `@Body() dto: { classificationIds: string[] }` to `@Body(new ZodValidationPipe(unassignClassificationsSchema)) dto: UnassignClassificationsDto`.

- [ ] **Step 4: Run existing tests**

```bash
pnpm --filter @ech/server test
```

Verify no regressions.

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/towers/pm/products/dto/bulk-delete.dto.ts apps/server/src/towers/pm/provisioning/dto/unassign.dto.ts apps/server/src/towers/pm/products/products.controller.ts apps/server/src/towers/pm/provisioning/provisioning.controller.ts
git commit -m "fix(server): add Zod validation to bulkDelete and unassign endpoints"
```

---

## Phase 2: High Priority (Performance + Safety)

### Task 2.1: Replace console.log with Pino in DrizzleModule

**Files:**
- Modify: `apps/server/src/shared-kernel/infrastructure/db/db.module.ts:23-37`

- [ ] **Step 1: Inject Logger into DrizzleModule**

Add `private readonly logger = new Logger(DrizzleModule.name)` (NestJS Logger wraps Pino). Replace all `console.log(...)` with `this.logger.log(...)` and `console.error(...)` with `this.logger.error(...)`. Remove emoji from log messages (structured logging, not human-readable).

- [ ] **Step 2: Run tests**

```bash
pnpm --filter @ech/server test
```

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/shared-kernel/infrastructure/db/db.module.ts
git commit -m "fix(server): replace console.log with NestJS Logger in DrizzleModule"
```

---

### Task 2.2: Add Error Handling to decodeCursor

**Files:**
- Modify: `apps/server/src/shared-kernel/infrastructure/utils/pagination.ts:5-7`
- Test: `apps/server/src/shared-kernel/infrastructure/utils/pagination.spec.ts`

- [ ] **Step 1: Write failing tests**

Add tests for `decodeCursor` with: invalid base64, invalid JSON, missing `id` field, valid cursor. First three should throw `BadRequestException`.

- [ ] **Step 2: Run test — expect FAIL**

```bash
pnpm --filter @ech/server exec vitest run src/shared-kernel/infrastructure/utils/pagination.spec.ts
```

- [ ] **Step 3: Wrap decodeCursor in try-catch**

```typescript
export function decodeCursor(cursor: string): { id: string } {
    try {
        const decoded = JSON.parse(atob(cursor));
        if (!decoded?.id || typeof decoded.id !== "string") {
            throw new BadRequestException("Invalid cursor: missing id");
        }
        return decoded;
    } catch {
        throw new BadRequestException("Invalid cursor format");
    }
}
```

Import `BadRequestException` from `@nestjs/common`.

- [ ] **Step 4: Run test — expect PASS**

```bash
pnpm --filter @ech/server exec vitest run src/shared-kernel/infrastructure/utils/pagination.spec.ts
```

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/shared-kernel/infrastructure/utils/pagination.ts apps/server/src/shared-kernel/infrastructure/utils/pagination.spec.ts
git commit -m "fix(server): add error handling to decodeCursor for malformed cursors"
```

---

### Task 2.3: Configure Helmet Security Headers

**Files:**
- Modify: `apps/server/src/main.ts:94`

- [ ] **Step 1: Add Helmet configuration**

Replace bare `app.register(helmet)` with configured version including CSP, HSTS, and referrer policy. Disable CSP in development (Swagger UI needs inline scripts).

- [ ] **Step 2: Verify server starts**

```bash
pnpm --filter @ech/server dev
```

Confirm no startup errors and Swagger UI still works at `/docs`.

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/main.ts
git commit -m "fix(server): configure Helmet with CSP, HSTS, and referrer policy"
```

---

### Task 2.4: Batch-Load Existing Records in GPC Importers

**Files:**
- Modify: `apps/server/src/towers/pm/gpc-seed/global-taxonomy-importer.ts:86-245`
- Modify: `apps/server/src/towers/pm/gpc-seed/family-template-importer.ts:75-182`

- [ ] **Step 1: Refactor global-taxonomy-importer.ts**

Before the attribute-groups loop (line 86), batch-load all existing global attribute groups and attributes into Maps:
```typescript
const existingGroups = await this.db.select({ id, code }).from(attributeGroups)
    .where(isNull(attributeGroups.organizationId));
const groupCodeMap = new Map(existingGroups.map(g => [g.code, g.id]));
```

Then in the loop, replace `await this.db.select...` with `groupCodeMap.get(group.code)`.

Same for attributes loop (line 119) and link loops (lines 184, 231) — batch-insert with `onConflictDoNothing` using array values instead of per-item inserts.

- [ ] **Step 2: Refactor family-template-importer.ts**

Same pattern: batch-load existing groups/attributes into Maps before loops. Replace per-item DB calls with Map lookups. Batch-insert links.

- [ ] **Step 3: Run existing tests**

```bash
pnpm --filter @ech/server test
```

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/towers/pm/gpc-seed/global-taxonomy-importer.ts apps/server/src/towers/pm/gpc-seed/family-template-importer.ts
git commit -m "perf(gpc-seed): batch-load existing records to eliminate N+1 queries in importers"
```

---

### Task 2.5: Add Depth Limit to Category getTree

**Files:**
- Modify: `apps/server/src/towers/pm/categories/categories.service.ts:141-189`
- Modify: `apps/server/src/towers/pm/categories/dto/category.dto.ts` (add `maxDepth` to query DTO)
- Test: `apps/server/src/towers/pm/categories/categories.service.spec.ts`

- [ ] **Step 1: Add `maxDepth` parameter to TreeCategoryQueryDto**

Add optional `maxDepth` field (default 10, max 20) to the query DTO.

- [ ] **Step 2: Write a failing test**

Test that `getTree({ maxDepth: 2 })` only returns 2 levels of nesting.

- [ ] **Step 3: Implement depth limiting**

In the tree-building loop, track each node's depth. Skip children beyond `maxDepth`.

- [ ] **Step 4: Run tests — expect PASS**

```bash
pnpm --filter @ech/server exec vitest run src/towers/pm/categories/categories.service.spec.ts
```

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/towers/pm/categories/
git commit -m "perf(categories): add maxDepth limit to getTree to prevent unbounded memory usage"
```

---

### Task 2.6: Batch Child-Linking and Add Transaction to Import

**Files:**
- Modify: `apps/server/src/towers/pm/listings/listings-import.service.ts:352-490, 576-586`
- Test: `apps/server/src/towers/pm/listings/listings-import.service.spec.ts`

- [ ] **Step 1: Replace loop UPDATE with batch**

At lines 576-586, replace the for-loop of individual UPDATEs with a single SQL CASE statement or use Drizzle's batch capabilities. Group updates by shared `(familyId, familyVariantId)` pairs.

- [ ] **Step 2: Wrap Phase B import loop in transaction**

At lines 352-490, wrap the entire items loop in `this.db.transaction(async (tx) => { ... })`. Use `tx` instead of `this.db` for all queries inside. On error, individual item failures are logged but transaction continues (current behavior preserved, but now atomic per-batch).

- [ ] **Step 3: Run tests**

```bash
pnpm --filter @ech/server exec vitest run src/towers/pm/listings/listings-import.service.spec.ts
```

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/towers/pm/listings/listings-import.service.ts apps/server/src/towers/pm/listings/listings-import.service.spec.ts
git commit -m "perf(listings): batch child-linking updates and wrap import in transaction"
```

---

## Phase 3: Medium (Conventions + Architecture)

### Task 3.1: Use firstOrNull in OrgGuard

**Files:**
- Modify: `apps/server/src/shared-kernel/infrastructure/auth/org.guard.ts:50`

- [ ] **Step 1: Replace `.then((r) => r[0])` with `.then(firstOrNull)`**

Import `firstOrNull` from `@shared-kernel/infrastructure/utils`. Change line 50.

- [ ] **Step 2: Run tests**

```bash
pnpm --filter @ech/server test
```

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/shared-kernel/infrastructure/auth/org.guard.ts
git commit -m "refactor(auth): use firstOrNull helper in OrgGuard"
```

---

### Task 3.2: Optimize Trace Context Utilities

**Files:**
- Modify: `apps/server/src/shared-kernel/infrastructure/utils/trace-context.util.ts:60, 102-116`

- [ ] **Step 1: Hoist regex to module scope**

Move `const hexRegex = /^[0-9a-f]+$/i;` from inside `parseTraceparent()` to module-level constant.

- [ ] **Step 2: Replace Math.random with crypto.randomBytes**

Replace `generateSpanId()` and `generateTraceId()` implementations:
```typescript
import { randomBytes } from "node:crypto";

export function generateSpanId(): string {
    return randomBytes(8).toString("hex");
}

export function generateTraceId(): string {
    return randomBytes(16).toString("hex");
}
```

- [ ] **Step 3: Run tests**

```bash
pnpm --filter @ech/server test
```

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/shared-kernel/infrastructure/utils/trace-context.util.ts
git commit -m "refactor(server): hoist regex and use crypto.randomBytes in trace utils"
```

---

### Task 3.3: Inject ConfigService in Throttler Filter

**Files:**
- Modify: `apps/server/src/presentation/filters/throttler-exception.filter.ts:23-24`

- [ ] **Step 1: Replace process.env with ConfigService injection**

Inject `ConfigService` in the constructor. Replace:
```typescript
const ttl = Number(process.env.THROTTLER_TTL_SEC || 60);
const limit = Number(process.env.THROTTLER_LIMIT || 10);
```
with:
```typescript
const ttl = this.config.get<number>("THROTTLER_TTL_SEC");
const limit = this.config.get<number>("THROTTLER_LIMIT");
```

- [ ] **Step 2: Run tests**

```bash
pnpm --filter @ech/server test
```

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/presentation/filters/throttler-exception.filter.ts
git commit -m "refactor(server): inject ConfigService in ThrottlerExceptionFilter"
```

---

### Task 3.4: Extract Error Code Inference from ProblemDetailsFilter

**Files:**
- Create: `apps/server/src/presentation/filters/error-code-inferrer.ts`
- Modify: `apps/server/src/presentation/filters/problem-details.filter.ts`

- [ ] **Step 1: Extract inferErrorCode**

Move the `inferErrorCode()` private method (lines 238-270) to a standalone pure function in `error-code-inferrer.ts`. Hoist string patterns to module-level constants.

- [ ] **Step 2: Update ProblemDetailsFilter to import and use the extracted function**

Replace `this.inferErrorCode(message)` calls with `inferErrorCode(message)` import.

- [ ] **Step 3: Run tests**

```bash
pnpm --filter @ech/server test
```

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/presentation/filters/error-code-inferrer.ts apps/server/src/presentation/filters/problem-details.filter.ts
git commit -m "refactor(server): extract inferErrorCode from ProblemDetailsFilter"
```

---

### Task 3.5: Add S3 Rollback on DB Failure in Media Service

**Files:**
- Modify: `apps/server/src/towers/pm/media/media.service.ts:58-83`
- Test: `apps/server/src/towers/pm/media/media.service.spec.ts`

- [ ] **Step 1: Write a failing test**

Test that when DB insert throws after S3 upload succeeds, a `DeleteObjectCommand` is sent to S3 to clean up the orphaned object.

- [ ] **Step 2: Run test — expect FAIL**

```bash
pnpm --filter @ech/server exec vitest run src/towers/pm/media/media.service.spec.ts
```

- [ ] **Step 3: Add try-catch around DB insert with S3 cleanup**

After S3 upload (line 65), wrap the DB insert in try-catch. On failure, call `this.s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: storagePath }))` before re-throwing.

- [ ] **Step 4: Run test — expect PASS**

```bash
pnpm --filter @ech/server exec vitest run src/towers/pm/media/media.service.spec.ts
```

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/towers/pm/media/media.service.ts apps/server/src/towers/pm/media/media.service.spec.ts
git commit -m "fix(media): rollback S3 upload on DB insert failure"
```

---

### Task 3.6: Add Idempotency Check to GlobalUpdateWorker

**Files:**
- Modify: `apps/server/src/towers/pm/global-update/global-update.worker.ts:15-56`

- [ ] **Step 1: Add job deduplication**

At the start of `process()`, check if `job.id` has already been processed by querying `job.attemptsMade`. If `attemptsMade > 0`, log and check if the operation was already applied (query the state). For `broadcastMarketplaceProductType` and `broadcastClassificationAttributes`, make the operations themselves idempotent (upsert, not insert).

- [ ] **Step 2: Run tests**

```bash
pnpm --filter @ech/server test
```

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/towers/pm/global-update/global-update.worker.ts
git commit -m "fix(global-update): add idempotency handling for worker retries"
```

---

## Phase 4: Low (Cleanup + Polish)

### Task 4.1: Remove Empty tap() Operators from Interceptors

**Files:**
- Modify: `apps/server/src/presentation/interceptors/correlation-id.interceptor.ts`
- Modify: `apps/server/src/presentation/interceptors/request-context.interceptor.ts`
- Modify: `apps/server/src/presentation/interceptors/trace-context.interceptor.ts`

- [ ] **Step 1: Replace `return next.handle().pipe(tap(() => { }))` with `return next.handle()`**

In each file, find the empty `tap()` and remove it along with the `pipe()` call.

- [ ] **Step 2: Run tests**

```bash
pnpm --filter @ech/server test
```

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/presentation/interceptors/
git commit -m "refactor(server): remove empty tap() operators from interceptors"
```

---

### Task 4.2: Align ZodValidationPipe Error Format with RFC 9457

**Files:**
- Modify: `apps/server/src/shared-kernel/infrastructure/pipes/zod-validation.pipe.ts:21-25`

- [ ] **Step 1: Update error response format**

Change the `BadRequestException` payload to match RFC 9457 ProblemDetails:
```typescript
// FROM:
throw new BadRequestException({
    message: errors,
    error: "Validation Failed",
    statusCode: 400,
});

// TO:
throw new BadRequestException({
    type: "https://httpstatuses.io/400",
    title: "Validation Failed",
    status: 400,
    errors,
});
```

- [ ] **Step 2: Run tests**

```bash
pnpm --filter @ech/server test
```

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/shared-kernel/infrastructure/pipes/zod-validation.pipe.ts
git commit -m "refactor(server): align ZodValidationPipe errors with RFC 9457 format"
```

---

### Task 4.3: Add Filename Sanitization to Media DTO

**Files:**
- Modify: `apps/server/src/towers/pm/media/dto/media.dto.ts`

- [ ] **Step 1: Add regex validation**

Add a regex refinement to the `filename` field that rejects path traversal characters (`../`, `..\\`, `/`, `\`):

```typescript
filename: z.string().max(255).regex(
    /^[^/\\]+$/,
    "Filename must not contain path separators"
),
```

- [ ] **Step 2: Run tests**

```bash
pnpm --filter @ech/server test
```

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/towers/pm/media/dto/media.dto.ts
git commit -m "fix(media): sanitize filename in DTO to prevent path traversal"
```

---

### Task 4.4: Remove Unused TypedResponse Export

**Files:**
- Verify/Delete: `apps/server/src/shared-kernel/infrastructure/types/validation-error.type.ts`

- [ ] **Step 1: Search for TypedResponse usage**

```bash
grep -r "TypedResponse" apps/server/src/
```

If zero results (excluding the definition), delete the file. If used, keep it.

- [ ] **Step 2: Commit (if deleted)**

```bash
git add apps/server/src/shared-kernel/infrastructure/types/validation-error.type.ts
git commit -m "refactor(server): remove unused TypedResponse type"
```

---

## Execution Order & Dependencies

```
Phase 1 (CRITICAL) — all tasks independent, can run in parallel
  ├── Task 1.1 (throttler bug)
  ├── Task 1.2 (orgId in listings)
  ├── Task 1.3 (orgId in families)
  ├── Task 1.4 (SQL injection)
  ├── Task 1.5 (completeness bug)
  └── Task 1.6 (Zod validation)

Phase 2 (HIGH) — Tasks 2.1-2.3 independent; 2.4-2.6 independent
  ├── Task 2.1 (console.log)
  ├── Task 2.2 (decodeCursor)
  ├── Task 2.3 (Helmet)
  ├── Task 2.4 (N+1 importers)
  ├── Task 2.5 (category depth)
  └── Task 2.6 (import batch+tx)

Phase 3 (MEDIUM) — Task 3.3 depends on 1.1; rest independent
  ├── Task 3.1 (firstOrNull)
  ├── Task 3.2 (trace utils)
  ├── Task 3.3 (ConfigService) ← after 1.1
  ├── Task 3.4 (extract inferErrorCode)
  ├── Task 3.5 (S3 rollback)
  └── Task 3.6 (worker idempotency)

Phase 4 (LOW) — all independent
  ├── Task 4.1 (empty tap)
  ├── Task 4.2 (RFC 9457)
  ├── Task 4.3 (filename sanitize)
  └── Task 4.4 (dead code)
```

## Verification

After each phase, run the full test suite:
```bash
pnpm --filter @ech/server test
pnpm --filter @ech/server check-types
pnpm lint
```
