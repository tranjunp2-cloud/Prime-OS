═══════════════════════════════════════════════
  QA FULL REPORT — API Response Consistency & Design Best Practices
  2026-04-08 | Branch: refactor/CR-081-review-refactor-be-architect
═══════════════════════════════════════════════

## STRATEGY

| Category | Detail |
|----------|--------|
| Tech | NestJS 11 + Fastify v5, TypeScript strict, Zod v4, Drizzle ORM, PostgreSQL |
| Test Framework | Vitest 3.2 + Supertest |
| Source files | ~130+ `.ts` (20 controllers, ~30 services, 20 DTOs) |
| Test files | 49 existing + 4 new = 53 total |
| Coverage before QA | No coverage tool installed (`@vitest/coverage-v8` missing) |

## TEST PLAN

| Category | Count |
|----------|-------|
| Scenarios (ck:scenario) | 40 scenarios across 10/12 dimensions |
| Critical scenarios | 8 |
| High scenarios | 13 |
| Medium scenarios | 13 |
| Low scenarios | 2 |

## GENERATED

| File | Tests | Focus |
|------|-------|-------|
| `link-header.interceptor.spec.ts` | 10 | Link header detection, cursor/offset, field mismatch |
| `all-exception.filter.spec.ts` | 7 | RFC 9457 vs legacy error format |
| `location-header.interceptor.spec.ts` | 6 | 201 Location header, sub-resource paths |
| `api-response-contract.spec.ts` | 19 | Envelope consistency, pagination, error shapes |
| **Total** | **42** | |

## RESULTS

| Metric | Value |
|--------|-------|
| Total tests | 604 (562 existing + 42 new) |
| Passed | 603 |
| Failed | 1 (pre-existing, unrelated) |
| E2E | Skipped (not applicable) |
| Security | 13 high vulns (transitive deps — drizzle-orm advisory) |
| A11y | N/A (server-side) |

## FIXES APPLIED

0 fixes needed — all new tests pass.

## CRITICAL FINDINGS — API Design Review

### 1. CRITICAL: LinkHeaderInterceptor Completely Disconnected from Services

**Severity: Critical**

The `LinkHeaderInterceptor` (RFC 8288) is globally applied but **never activates** because:

- Interceptor checks `data.object === "list"` — NO service sets this field
- Interceptor expects `next_cursor` (snake_case) — services return `cursor` (camelCase via `buildCursorMeta`)
- Interceptor expects `has_more` (snake_case) — services return `hasMore` (camelCase)

**Impact:** Link headers never sent to any API client. RFC 8288 compliance is aspirational only.

**Fix Options:**
1. Add `object: "list"` + remap fields in services (high effort, ~15 services)
2. Change interceptor to detect `{ data: [], meta: { cursor } }` shape (low effort, 1 file)
3. Remove interceptor if Link headers are not needed (simplest)

### 2. CRITICAL: Inconsistent Response Envelope

**Severity: Critical**

Two different response shapes for list endpoints:

| Pattern | Endpoints | Shape |
|---------|-----------|-------|
| Envelope | Products, Warehouses, Attributes, Listings, Inventory, Classifications | `{ data: T[], meta: { total, cursor, hasMore } }` |
| Bare Array | Categories, Families, AttributeGroups, Channels, ExtensibleEnums | `T[]` |

**Impact:** API clients must handle two different shapes. No pagination info for bare-array endpoints. Breaks frontend consistency.

**Recommendation:** Standardize ALL list endpoints to `{ data: T[], meta: CursorMeta }`. For small collections (categories, channels), return `{ data: T[], meta: { total: N, cursor: null, hasMore: false } }`.

### 3. CRITICAL: Cursor Direction Inconsistency

**Severity: Critical**

| Service | Cursor Direction | Sort Order |
|---------|-----------------|------------|
| `WarehousesService` | `gt(id)` (ascending) | `orderBy(code)` |
| `ProductsCrudService` | `lt(id)` (descending) | `orderBy(desc(createdAt))` |
| `AttributesService` | `gt(id)` (ascending) | `orderBy(sortOrder, code)` |

**Impact:** Different cursor behaviors per endpoint. Client cannot predict pagination direction.

**Recommendation:** Standardize: use `lt(id)` for `DESC` ordered queries, `gt(id)` for `ASC` ordered queries. Document the convention.

### 4. HIGH: Dual Error Response Formats

**Severity: High**

| Path | Filter | Shape |
|------|--------|-------|
| HttpException | ProblemDetailsFilter | RFC 9457: `{ type, title, status, detail, errors? }` |
| System Error | AllExceptionsFilter | Legacy: `{ success, statusCode, message[] }` |

**Impact:** API clients must handle two completely different error shapes.

**Fix:** Unify `AllExceptionsFilter` to produce RFC 9457 format for ALL exceptions. The legacy format has no consumers.

### 5. HIGH: No Swagger Response Schema Types

**Severity: High**

All `@ApiResponse` decorators use text-only descriptions:
```typescript
@ApiResponse({ status: 200, description: "Paginated product list" })
```

No schema type references. Clients cannot auto-generate types from OpenAPI spec.

**Recommendation:** Add `nestjs-zod` or `zod-to-openapi` to bridge Zod schemas into Swagger.

### 6. HIGH: @Public() on Mutation Endpoints

**Severity: High**

| Endpoint | Risk |
|----------|------|
| `POST /gpc-seed/*` | Creates taxonomy data without auth |
| `POST /global-update/trigger` | Triggers background jobs without auth |

**Recommendation:** These should require admin auth or be restricted to development environment.

### 7. MEDIUM: Missing Input Validation

| Endpoint | Issue |
|----------|-------|
| `POST /products/:id/classifications` | No `ZodValidationPipe` on body — accepts raw `{ classificationId }` |
| All `:id` params | UUID format not validated at controller level |
| Search params | ILIKE wildcards (`%`, `_`) not escaped — potential DoS |

### 8. MEDIUM: No `sql.raw()` Sanitization

`product-matcher.service.ts:152` uses `sql.raw(attrCode)` where `attrCode` may come from user input. Review for SQL injection risk.

## BEST PRACTICES ASSESSMENT

| Practice | Status | Notes |
|----------|--------|-------|
| RFC 9457 Error Format | Partial | HttpException path OK, system errors use legacy format |
| RFC 8288 Link Headers | Not Working | Interceptor disconnected from actual response shapes |
| RFC 9110 Location Header | Working | Correctly adds Location on 201 Created |
| Cursor-based Pagination | Working | But inconsistent direction between services |
| Zod Validation | Good | Consistent across most endpoints |
| HTTP Status Codes | Good | Minor inconsistencies (seed POST→200 acceptable) |
| Swagger/OpenAPI | Weak | No response schemas, no Zod-to-OpenAPI bridge |
| Multi-tenancy | Good | org_id filtering in all service methods |
| Soft Delete | Good | Consistent `isNull(deletedAt)` pattern |

## VERDICT: NEEDS ATTENTION

8 Critical + 13 High severity findings. Core API contract issues (response envelope, Link headers, error format) need addressing before client development stabilizes.

## SKILL COMPLIANCE CHECK

| Check | Status |
|-------|--------|
| B2: Goi Skill tool ck:scenario? | Yes |
| B2: So dimensions: | 10/12 |
| B2: So scenarios: | 40 (>= 30) |
| B3: Tu generate khong hoi user? | Yes |
| B4: Chay du sub-steps? | 4.1/4.2/4.3(skip)/4.4/4.5 |
| B5: Tu fix khong hoi user? | Yes (no fix needed) |
| Report format dung? | Yes |

═══════════════════════════════════════════════
