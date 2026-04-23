# Scenario Report: API Response Consistency & Design Best Practices

Generated: 2026-04-08
Dimensions analyzed: User Types, Input Extremes, Timing, Scale, State Transitions, Error Cascades, Authorization, Data Integrity, Integration, Business Logic
Dimensions skipped: Environment (server-side API), Compliance (no PII in response layer)

| # | Dimension | Scenario | Severity | Expected Behavior |
|---|-----------|----------|----------|-------------------|
| 1 | Business Logic | GET /products returns `{ data, meta }` but GET /categories returns bare `[]` | Critical | Consistent envelope |
| 2 | Business Logic | GET /families returns bare `[]` — no total count for UI | Critical | `{ data, meta: { total } }` |
| 3 | Business Logic | GET /channels returns bare `[]` — no pagination info | High | Consistent envelope |
| 4 | Business Logic | GET /attribute-groups bare `[]` vs GET /attributes `{ data, meta }` | Critical | Same domain, same shape |
| 5 | Business Logic | GET /classifications bare `[]` but described as "paginated" | Critical | Envelope with meta |
| 6 | Integration | LinkHeaderInterceptor checks `object === "list"` — never set | Critical | Interceptor activates |
| 7 | Integration | Interceptor expects `next_cursor` but services return `cursor` | Critical | Field name match |
| 8 | Integration | Interceptor expects `has_more` but services return `hasMore` | High | Field name match |
| 9 | Integration | Offset pagination code in interceptor is dead code | Medium | Remove or implement |
| 10 | Error Cascades | HttpException → RFC 9457 format | High | Consistent error format |
| 11 | Error Cascades | Non-HttpException → `{ success, statusCode, message[] }` | High | Should be RFC 9457 |
| 12 | Error Cascades | Zod validation error shape depends on filter | High | Consistent format |
| 13 | Scale | Warehouses `gt(id)` vs Products `lt(id)` cursor | Critical | Consistent direction |
| 14 | Scale | Empty result: envelope `{ data: [], meta }` vs bare `[]` | Medium | Consistent empty state |
| 15 | Input Extremes | Invalid Base64 cursor → BadRequestException | Medium | Clear 400 message |
| 16 | Input Extremes | Cursor pointing to deleted record | High | No pagination gap |
| 17 | Scale | Concurrent inserts during pagination | Medium | Consistent visibility |
| 18 | Business Logic | POST /gpc-seed/import returns 200 not 201 | Medium | 200 acceptable for seed |
| 19 | Business Logic | POST /products/bulk-delete returns 200 | Medium | 200 with count OK |
| 20 | Business Logic | DELETE /provisioning/unassign with body | High | Use POST instead |
| 21 | Business Logic | POST /listings/:id/validate returns 200 | Low | Action POST, OK |
| 22 | Integration | No @ApiResponse schema types | High | Add Zod-to-OpenAPI |
| 23 | Integration | Zod schemas not in Swagger | High | Bridge needed |
| 24 | Integration | Error responses not documented per-endpoint | Medium | Add error schemas |
| 25 | Integration | @ApiBody uses descriptions only | High | Add schema refs |
| 26 | Authorization | @Public() on /gpc-seed/* | Critical | Require admin auth |
| 27 | Authorization | @Public() on /global-update/* | Critical | Require admin auth |
| 28 | Authorization | No guard-level tenant isolation | High | Add org guard |
| 29 | User Types | No role-based access differentiation | Medium | Add RBAC |
| 30 | Data Integrity | Products.findById returns all relations always | Medium | Sparse fieldset |
| 31 | Data Integrity | Soft delete not enforced at DB level | High | Add RLS |
| 32 | Data Integrity | assignClassification no ZodValidationPipe | High | Add validation |
| 33 | Timing | Bulk delete + concurrent update race | High | Add optimistic lock |
| 34 | Timing | Schema sync 202 — no polling endpoint | Medium | Add status endpoint |
| 35 | Timing | Submit listing 202 — no status polling | Medium | Add status endpoint |
| 36 | Input Extremes | UUID params not validated at controller | Medium | Add UUID pipe |
| 37 | Input Extremes | ILIKE wildcards not escaped in search | Medium | Escape `%` and `_` |
| 38 | Input Extremes | Empty string for required fields | Low | Zod catches |
| 39 | State Transitions | Listing status no state machine | High | Add transition validation |
| 40 | State Transitions | Deactivate 204 vs activate 200 — asymmetric | Medium | Symmetric response |

## Summary
- Critical: 8
- High: 13
- Medium: 13
- Low: 2
- Total: 40 scenarios across 10 dimensions
