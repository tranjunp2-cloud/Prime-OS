# BE Refactor: Extract Shared Utilities & Split God Services

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the `apps/server` codebase to extract duplicated patterns into shared utilities (Phase 1), then decompose oversized services into focused, single-responsibility units (Phase 2).

**Architecture:** NestJS 11 modular monolith with Drizzle ORM. Services inject `DB_TOKEN` (Drizzle instance) and `ClsService` (async context for org/user/trace). Domain code lives in `towers/pm/` and `towers/inv/`. Shared infrastructure in `shared-kernel/infrastructure/`. Tests use Vitest + `@nestjs/testing` with `createDbMock()`, `createChainMock()`, `createClsMock()` from `towers/__test-utils__/`.

**Tech Stack:** NestJS 11, Fastify v5, Drizzle ORM, PostgreSQL, nestjs-cls, Zod v4, Vitest, BullMQ

**Branch:** `refactor/CR-081-review-refactor-be-architect` (already exists)

**Pre-requisites completed:** P0 security fixes (auth.middleware.ts, auth.guard.ts, org.guard.ts) are already done on this branch.

---

## File Structure Overview

### Phase 1: New shared utility files

```
apps/server/src/shared-kernel/infrastructure/
  utils/
    first-or-null.ts              # firstOrNull() query helper
    first-or-null.spec.ts         # Tests
    ensure-code-unique.ts         # Code uniqueness checker
    ensure-code-unique.spec.ts    # Tests
    pagination.ts                 # Cursor pagination helper
    pagination.spec.ts            # Tests
    replace-relation.ts           # Delete-then-insert transaction helper
    replace-relation.spec.ts      # Tests
    index.ts                      # Barrel export
  context/
    request-context.facade.ts     # CLS wrapper
    request-context.facade.spec.ts
    request-context.module.ts     # Global module
    index.ts                      # Barrel export
```

### Phase 2: Split service files

```
apps/server/src/towers/pm/
  listings/
    listings-import.service.ts         # Extracted from listings-marketplace (importSellerListings + batchLinkParentChildren)
    catalog-browse.service.ts          # Extracted from listings-marketplace (catalogSearch + getCatalogTree + pullSellerListings)
    listings-marketplace.service.ts    # Slimmed down (getMappings + updateMappings only)
  connectors/amazon/
    amazon-auth.client.ts              # Token refresh + spApiGet
    amazon.connector.ts                # Slimmed (delegates to auth client)
  gpc-seed/
    global-taxonomy-importer.ts        # Extracted importTaxonomy
    family-template-importer.ts        # Extracted importFamilyTemplate
    gpc-seed.service.ts                # Slimmed (delegates + getStatus)
  bootstrap/
    bootstrap.service.ts               # Decomposed apply() into sub-methods
  schema-sync/
    auto-mapping-generator.ts          # Extracted autoGenerateMappings
    schema-sync.service.ts             # Slimmed
  products/
    products-form.service.ts           # Decomposed getFamily() into sub-methods
```

---

## PHASE 1: EXTRACT SHARED UTILITIES

---

### Task 1: Create `firstOrNull()` query helper

**Files:**
- Create: `apps/server/src/shared-kernel/infrastructure/utils/first-or-null.ts`
- Create: `apps/server/src/shared-kernel/infrastructure/utils/first-or-null.spec.ts`

This utility replaces the `.then((r) => r[0])` pattern used ~95 times across the codebase. It extracts the first element from an array or returns `undefined`.

- [ ] **Step 1: Write the test file**

Create `apps/server/src/shared-kernel/infrastructure/utils/first-or-null.spec.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { firstOrNull } from "./first-or-null";

describe("firstOrNull", () => {
	it("should return the first element from a non-empty array", () => {
		expect(firstOrNull([{ id: "a" }, { id: "b" }])).toEqual({ id: "a" });
	});

	it("should return undefined for an empty array", () => {
		expect(firstOrNull([])).toBeUndefined();
	});

	it("should work as a callback for .then()", async () => {
		const result = await Promise.resolve([{ id: "x" }]).then(firstOrNull);
		expect(result).toEqual({ id: "x" });
	});

	it("should return undefined when promise resolves to empty array", async () => {
		const result = await Promise.resolve([]).then(firstOrNull);
		expect(result).toBeUndefined();
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @ech/server exec vitest run src/shared-kernel/infrastructure/utils/first-or-null.spec.ts`

Expected: FAIL — `Cannot find module './first-or-null'`

- [ ] **Step 3: Write the implementation**

Create `apps/server/src/shared-kernel/infrastructure/utils/first-or-null.ts`:

```typescript
export function firstOrNull<T>(rows: T[]): T | undefined {
	return rows[0];
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @ech/server exec vitest run src/shared-kernel/infrastructure/utils/first-or-null.spec.ts`

Expected: PASS — all 4 tests

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/shared-kernel/infrastructure/utils/first-or-null.ts apps/server/src/shared-kernel/infrastructure/utils/first-or-null.spec.ts
git commit -m "refactor(shared-kernel): add firstOrNull() query helper utility"
```

---

### Task 2: Create `RequestContextFacade`

**Files:**
- Create: `apps/server/src/shared-kernel/infrastructure/context/request-context.facade.ts`
- Create: `apps/server/src/shared-kernel/infrastructure/context/request-context.facade.spec.ts`
- Create: `apps/server/src/shared-kernel/infrastructure/context/request-context.module.ts`
- Create: `apps/server/src/shared-kernel/infrastructure/context/index.ts`
- Modify: `apps/server/src/app.module.ts` (add import)

This wraps `ClsService` into a typed facade. Currently `this.cls.get("organizationId")` appears 100+ times with raw string keys.

- [ ] **Step 1: Write the test file**

Create `apps/server/src/shared-kernel/infrastructure/context/request-context.facade.spec.ts`:

```typescript
import { Test } from "@nestjs/testing";
import { ClsService } from "nestjs-cls";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RequestContextFacade } from "./request-context.facade";

describe("RequestContextFacade", () => {
	let facade: RequestContextFacade;
	let mockCls: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn> };

	beforeEach(async () => {
		mockCls = {
			get: vi.fn(),
			set: vi.fn(),
		};

		const module = await Test.createTestingModule({
			providers: [
				RequestContextFacade,
				{ provide: ClsService, useValue: mockCls },
			],
		}).compile();

		facade = module.get(RequestContextFacade);
	});

	describe("getOrgId", () => {
		it("should return the organizationId from CLS", () => {
			mockCls.get.mockReturnValue("org_abc123");
			expect(facade.getOrgId()).toBe("org_abc123");
			expect(mockCls.get).toHaveBeenCalledWith("organizationId");
		});
	});

	describe("getUserId", () => {
		it("should return the userId from CLS", () => {
			mockCls.get.mockReturnValue("user_xyz");
			expect(facade.getUserId()).toBe("user_xyz");
			expect(mockCls.get).toHaveBeenCalledWith("userId");
		});
	});

	describe("getCorrelationId", () => {
		it("should return the correlationId from CLS", () => {
			mockCls.get.mockReturnValue("corr-123");
			expect(facade.getCorrelationId()).toBe("corr-123");
			expect(mockCls.get).toHaveBeenCalledWith("correlationId");
		});

		it("should return undefined when not set", () => {
			mockCls.get.mockReturnValue(undefined);
			expect(facade.getCorrelationId()).toBeUndefined();
		});
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @ech/server exec vitest run src/shared-kernel/infrastructure/context/request-context.facade.spec.ts`

Expected: FAIL — `Cannot find module './request-context.facade'`

- [ ] **Step 3: Write the implementation**

Create `apps/server/src/shared-kernel/infrastructure/context/request-context.facade.ts`:

```typescript
import { Injectable } from "@nestjs/common";
import { ClsService } from "nestjs-cls";

@Injectable()
export class RequestContextFacade {
	constructor(private readonly cls: ClsService) {}

	getOrgId(): string {
		return this.cls.get("organizationId");
	}

	getUserId(): string | undefined {
		return this.cls.get("userId");
	}

	getCorrelationId(): string | undefined {
		return this.cls.get("correlationId");
	}

	getTraceId(): string | undefined {
		return this.cls.get("traceId");
	}
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @ech/server exec vitest run src/shared-kernel/infrastructure/context/request-context.facade.spec.ts`

Expected: PASS — all 4 tests

- [ ] **Step 5: Create the module and barrel export**

Create `apps/server/src/shared-kernel/infrastructure/context/request-context.module.ts`:

```typescript
import { Global, Module } from "@nestjs/common";
import { RequestContextFacade } from "./request-context.facade";

@Global()
@Module({
	providers: [RequestContextFacade],
	exports: [RequestContextFacade],
})
export class RequestContextModule {}
```

Create `apps/server/src/shared-kernel/infrastructure/context/index.ts`:

```typescript
export { RequestContextFacade } from "./request-context.facade";
export { RequestContextModule } from "./request-context.module";
```

- [ ] **Step 6: Register in AppModule**

In `apps/server/src/app.module.ts`, add the import:

```typescript
// Add to imports at top of file:
import { RequestContextModule } from "@shared-kernel/infrastructure/context";

// Add to @Module.imports array, after ClsModule.forRoot(createClsConfig()):
RequestContextModule,
```

- [ ] **Step 7: Type-check**

Run: `pnpm --filter @ech/server exec tsc --noEmit`

Expected: No errors

- [ ] **Step 8: Commit**

```bash
git add apps/server/src/shared-kernel/infrastructure/context/ apps/server/src/app.module.ts
git commit -m "refactor(shared-kernel): add RequestContextFacade wrapping CLS access"
```

---

### Task 3: Create `ensureCodeUnique()` utility

**Files:**
- Create: `apps/server/src/shared-kernel/infrastructure/utils/ensure-code-unique.ts`
- Create: `apps/server/src/shared-kernel/infrastructure/utils/ensure-code-unique.spec.ts`

This pattern is duplicated in 9 services: media, families, attributes, categories, channels, classifications, extensible-enums, attribute-groups, warehouses. Each one does:
```typescript
const existing = await db.select({id}).from(table).where(and(eq(table.organizationId, orgId), eq(table.code, dto.code))).limit(1).then(r => r[0]);
if (existing) throw new ConflictException(`... with code '${dto.code}' already exists`);
```

- [ ] **Step 1: Write the test file**

Create `apps/server/src/shared-kernel/infrastructure/utils/ensure-code-unique.spec.ts`:

```typescript
import { ConflictException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createChainMock } from "../../../towers/__test-utils__/create-chain-mock";
import { ensureCodeUnique } from "./ensure-code-unique";

describe("ensureCodeUnique", () => {
	let mockDb: { select: ReturnType<typeof vi.fn> };

	beforeEach(() => {
		mockDb = {
			select: vi.fn(),
		};
	});

	it("should not throw when code does not exist", async () => {
		mockDb.select.mockReturnValue(createChainMock([]));

		await expect(
			ensureCodeUnique(mockDb as never, {
				table: { id: "id_col", organizationId: "org_col", code: "code_col" } as never,
				code: "new-code",
				orgId: "org-123",
				entityName: "Attribute",
			}),
		).resolves.not.toThrow();
	});

	it("should throw ConflictException when code already exists", async () => {
		mockDb.select.mockReturnValue(createChainMock([{ id: "existing-id" }]));

		await expect(
			ensureCodeUnique(mockDb as never, {
				table: { id: "id_col", organizationId: "org_col", code: "code_col" } as never,
				code: "existing-code",
				orgId: "org-123",
				entityName: "Attribute",
			}),
		).rejects.toThrow(ConflictException);
	});

	it("should include entity name and code in error message", async () => {
		mockDb.select.mockReturnValue(createChainMock([{ id: "existing-id" }]));

		await expect(
			ensureCodeUnique(mockDb as never, {
				table: { id: "id_col", organizationId: "org_col", code: "code_col" } as never,
				code: "dup-code",
				orgId: "org-123",
				entityName: "Family",
			}),
		).rejects.toThrow("Family with code 'dup-code' already exists");
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @ech/server exec vitest run src/shared-kernel/infrastructure/utils/ensure-code-unique.spec.ts`

Expected: FAIL — `Cannot find module './ensure-code-unique'`

- [ ] **Step 3: Write the implementation**

Create `apps/server/src/shared-kernel/infrastructure/utils/ensure-code-unique.ts`:

```typescript
import { ConflictException } from "@nestjs/common";
import type { SQL } from "drizzle-orm";
import { and, eq } from "drizzle-orm";
import type { DrizzleDb } from "../db/db.port";

interface EnsureCodeUniqueOptions {
	table: {
		id: unknown;
		organizationId: unknown;
		code: unknown;
		deletedAt?: unknown;
	};
	code: string;
	orgId: string;
	entityName: string;
	excludeId?: string;
}

export async function ensureCodeUnique(
	db: DrizzleDb,
	opts: EnsureCodeUniqueOptions,
): Promise<void> {
	const { table, code, orgId, entityName, excludeId } = opts;
	const conditions: SQL[] = [
		eq(table.organizationId as never, orgId),
		eq(table.code as never, code),
	];

	if (excludeId) {
		const { ne } = await import("drizzle-orm");
		conditions.push(ne(table.id as never, excludeId));
	}

	if (table.deletedAt) {
		const { isNull } = await import("drizzle-orm");
		conditions.push(isNull(table.deletedAt as never));
	}

	const existing = await db
		.select({ id: table.id as never })
		.from(table as never)
		.where(and(...conditions))
		.limit(1)
		.then((r: unknown[]) => r[0]);

	if (existing) {
		throw new ConflictException(
			`${entityName} with code '${code}' already exists`,
		);
	}
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @ech/server exec vitest run src/shared-kernel/infrastructure/utils/ensure-code-unique.spec.ts`

Expected: PASS — all 3 tests

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/shared-kernel/infrastructure/utils/ensure-code-unique.ts apps/server/src/shared-kernel/infrastructure/utils/ensure-code-unique.spec.ts
git commit -m "refactor(shared-kernel): add ensureCodeUnique() to deduplicate code checks across 9 services"
```

---

### Task 4: Create `PaginationHelper` for cursor-based pagination

**Files:**
- Create: `apps/server/src/shared-kernel/infrastructure/utils/pagination.ts`
- Create: `apps/server/src/shared-kernel/infrastructure/utils/pagination.spec.ts`

Cursor pagination is duplicated in warehouses, inventory (3x), attributes, products-crud, and listings-crud. The pattern: decode cursor → add `gt(id)` condition → query → encode next cursor → return `{data, meta: {total, cursor, hasMore}}`.

- [ ] **Step 1: Write the test file**

Create `apps/server/src/shared-kernel/infrastructure/utils/pagination.spec.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { buildCursorMeta, decodeCursor, encodeCursor } from "./pagination";

describe("pagination", () => {
	describe("encodeCursor / decodeCursor", () => {
		it("should round-trip a cursor", () => {
			const cursor = encodeCursor("some-uuid-123");
			const decoded = decodeCursor(cursor);
			expect(decoded).toEqual({ id: "some-uuid-123" });
		});

		it("should produce a base64 string", () => {
			const cursor = encodeCursor("abc");
			expect(() => atob(cursor)).not.toThrow();
		});
	});

	describe("buildCursorMeta", () => {
		it("should return hasMore=true and cursor when rows fill the limit", () => {
			const rows = [{ id: "a" }, { id: "b" }, { id: "c" }];
			const meta = buildCursorMeta(rows, 3, 100);
			expect(meta.hasMore).toBe(true);
			expect(meta.cursor).toBeTruthy();
			expect(meta.total).toBe(100);
		});

		it("should return hasMore=false and cursor=null when rows are under limit", () => {
			const rows = [{ id: "a" }, { id: "b" }];
			const meta = buildCursorMeta(rows, 3, 2);
			expect(meta.hasMore).toBe(false);
			expect(meta.cursor).toBeNull();
			expect(meta.total).toBe(2);
		});

		it("should return hasMore=false for empty rows", () => {
			const meta = buildCursorMeta([], 10, 0);
			expect(meta.hasMore).toBe(false);
			expect(meta.cursor).toBeNull();
			expect(meta.total).toBe(0);
		});
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @ech/server exec vitest run src/shared-kernel/infrastructure/utils/pagination.spec.ts`

Expected: FAIL — `Cannot find module './pagination'`

- [ ] **Step 3: Write the implementation**

Create `apps/server/src/shared-kernel/infrastructure/utils/pagination.ts`:

```typescript
export function encodeCursor(id: string): string {
	return btoa(JSON.stringify({ id }));
}

export function decodeCursor(cursor: string): { id: string } {
	return JSON.parse(atob(cursor));
}

export interface CursorMeta {
	total: number;
	cursor: string | null;
	hasMore: boolean;
}

export function buildCursorMeta<T extends { id: string }>(
	rows: T[],
	limit: number,
	total: number,
): CursorMeta {
	const hasMore = rows.length === limit;
	const lastItem = rows[rows.length - 1];
	return {
		total,
		cursor: hasMore && lastItem ? encodeCursor(lastItem.id) : null,
		hasMore,
	};
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @ech/server exec vitest run src/shared-kernel/infrastructure/utils/pagination.spec.ts`

Expected: PASS — all 5 tests

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/shared-kernel/infrastructure/utils/pagination.ts apps/server/src/shared-kernel/infrastructure/utils/pagination.spec.ts
git commit -m "refactor(shared-kernel): add cursor pagination helpers (encode/decode/buildMeta)"
```

---

### Task 5: Create `replaceRelation()` transaction helper

**Files:**
- Create: `apps/server/src/shared-kernel/infrastructure/utils/replace-relation.ts`
- Create: `apps/server/src/shared-kernel/infrastructure/utils/replace-relation.spec.ts`

The delete-then-insert transaction pattern is used in: families.updateAttributes, channels.updateLocales, channels.updateCurrencies, classifications.updateAttributes. All follow the same shape: delete where FK = parentId, then bulk insert new rows.

- [ ] **Step 1: Write the test file**

Create `apps/server/src/shared-kernel/infrastructure/utils/replace-relation.spec.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";
import { replaceRelation } from "./replace-relation";

describe("replaceRelation", () => {
	let mockTx: {
		delete: ReturnType<typeof vi.fn>;
		insert: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		mockTx = {
			delete: vi.fn().mockReturnValue({
				where: vi.fn().mockResolvedValue(undefined),
			}),
			insert: vi.fn().mockReturnValue({
				values: vi.fn().mockResolvedValue(undefined),
			}),
		};
	});

	it("should delete existing and insert new rows", async () => {
		const items = [{ parentId: "p1", childId: "c1" }];

		await replaceRelation(mockTx as never, {
			table: "mockTable" as never,
			fkColumn: "parentId_col" as never,
			fkValue: "p1",
			items,
		});

		expect(mockTx.delete).toHaveBeenCalled();
		expect(mockTx.insert).toHaveBeenCalled();
	});

	it("should only delete when items array is empty", async () => {
		await replaceRelation(mockTx as never, {
			table: "mockTable" as never,
			fkColumn: "parentId_col" as never,
			fkValue: "p1",
			items: [],
		});

		expect(mockTx.delete).toHaveBeenCalled();
		expect(mockTx.insert).not.toHaveBeenCalled();
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @ech/server exec vitest run src/shared-kernel/infrastructure/utils/replace-relation.spec.ts`

Expected: FAIL — `Cannot find module './replace-relation'`

- [ ] **Step 3: Write the implementation**

Create `apps/server/src/shared-kernel/infrastructure/utils/replace-relation.ts`:

```typescript
import { eq } from "drizzle-orm";

interface ReplaceRelationOptions<TItem> {
	table: unknown;
	fkColumn: unknown;
	fkValue: string;
	items: TItem[];
}

export async function replaceRelation<TItem>(
	tx: { delete: Function; insert: Function },
	opts: ReplaceRelationOptions<TItem>,
): Promise<void> {
	await tx.delete(opts.table).where(eq(opts.fkColumn as never, opts.fkValue));

	if (opts.items.length > 0) {
		await tx.insert(opts.table).values(opts.items as never);
	}
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @ech/server exec vitest run src/shared-kernel/infrastructure/utils/replace-relation.spec.ts`

Expected: PASS — all 2 tests

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/shared-kernel/infrastructure/utils/replace-relation.ts apps/server/src/shared-kernel/infrastructure/utils/replace-relation.spec.ts
git commit -m "refactor(shared-kernel): add replaceRelation() for delete-then-insert transaction pattern"
```

---

### Task 6: Create utils barrel export

**Files:**
- Create: `apps/server/src/shared-kernel/infrastructure/utils/index.ts`

- [ ] **Step 1: Create the barrel export**

Create `apps/server/src/shared-kernel/infrastructure/utils/index.ts`:

```typescript
export { ensureCodeUnique } from "./ensure-code-unique";
export { firstOrNull } from "./first-or-null";
export { buildCursorMeta, decodeCursor, encodeCursor } from "./pagination";
export type { CursorMeta } from "./pagination";
export { replaceRelation } from "./replace-relation";
```

- [ ] **Step 2: Type-check**

Run: `pnpm --filter @ech/server exec tsc --noEmit`

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/shared-kernel/infrastructure/utils/index.ts
git commit -m "refactor(shared-kernel): add barrel export for shared utilities"
```

---

### Task 7: Migrate one service to use shared utilities (warehouses — simplest)

**Files:**
- Modify: `apps/server/src/towers/inv/warehouses/warehouses.service.ts`
- Test: `apps/server/src/towers/inv/warehouses/warehouses.service.spec.ts`

This is the migration template. Warehouses is the simplest service using all patterns: `cls.get("organizationId")`, code uniqueness check, cursor pagination, `.then(r => r[0])`.

- [ ] **Step 1: Read the current warehouses service**

Read: `apps/server/src/towers/inv/warehouses/warehouses.service.ts`

Understand which lines use each pattern before modifying.

- [ ] **Step 2: Replace imports and constructor**

In `apps/server/src/towers/inv/warehouses/warehouses.service.ts`:

Replace `ClsService` import and constructor injection with `RequestContextFacade`:

```typescript
// REMOVE these:
import { ClsService } from "nestjs-cls";
// In constructor, REMOVE:
private readonly cls: ClsService,

// ADD these:
import { RequestContextFacade } from "@shared-kernel/infrastructure/context";
// In constructor, ADD:
private readonly ctx: RequestContextFacade,
```

Add utility imports:

```typescript
import {
	buildCursorMeta,
	decodeCursor,
	ensureCodeUnique,
	firstOrNull,
} from "@shared-kernel/infrastructure/utils";
```

- [ ] **Step 3: Replace `this.cls.get("organizationId")` with `this.ctx.getOrgId()`**

Find and replace ALL instances:
- `this.cls.get("organizationId")` → `this.ctx.getOrgId()`

- [ ] **Step 4: Replace `.then((r) => r[0])` with `.then(firstOrNull)`**

Find and replace ALL instances:
- `.then((r) => r[0])` → `.then(firstOrNull)`
- `.then((rows) => rows[0])` → `.then(firstOrNull)`

- [ ] **Step 5: Replace code uniqueness check with `ensureCodeUnique()`**

Find the code uniqueness block (roughly lines 84-99) and replace with:

```typescript
await ensureCodeUnique(this.db, {
	table: warehouses,
	code: dto.code,
	orgId,
	entityName: "Warehouse",
});
```

- [ ] **Step 6: Replace cursor pagination with `buildCursorMeta()`**

In the `findAll()` method, replace the manual hasMore/cursor/meta building with:

```typescript
// REMOVE:
const hasMore = rows.length === limit;
const lastItem = rows[rows.length - 1];
return {
	data: rows,
	meta: {
		total: totalResult?.count ?? 0,
		cursor: hasMore && lastItem ? encodeCursor(lastItem.id) : null,
		hasMore,
	},
};

// REPLACE WITH:
return {
	data: rows,
	meta: buildCursorMeta(rows, limit, totalResult?.count ?? 0),
};
```

Keep the `decodeCursor` usage in the conditions block as-is (it's already clean).

- [ ] **Step 7: Update the test file**

In `apps/server/src/towers/inv/warehouses/warehouses.service.spec.ts`:

Replace CLS mock with RequestContextFacade mock:

```typescript
// REMOVE:
import { ClsService } from "nestjs-cls";
{ provide: ClsService, useValue: mockCls },

// ADD:
import { RequestContextFacade } from "@shared-kernel/infrastructure/context";
{ provide: RequestContextFacade, useValue: { getOrgId: vi.fn().mockReturnValue(ORG_ID) } },
```

- [ ] **Step 8: Run tests**

Run: `pnpm --filter @ech/server exec vitest run src/towers/inv/warehouses/warehouses.service.spec.ts`

Expected: PASS

- [ ] **Step 9: Type-check the full project**

Run: `pnpm --filter @ech/server exec tsc --noEmit`

Expected: No errors

- [ ] **Step 10: Commit**

```bash
git add apps/server/src/towers/inv/warehouses/
git commit -m "refactor(warehouses): migrate to shared utilities (RequestContextFacade, firstOrNull, ensureCodeUnique, buildCursorMeta)"
```

---

### Task 8: Migrate remaining services to shared utilities

**Files to modify** (follow exact same pattern as Task 7 for each):

Apply the **same migration steps** from Task 7 to each service below. For each service:
1. Replace `ClsService` → `RequestContextFacade` (import + constructor + all `this.cls.get("organizationId")` → `this.ctx.getOrgId()`)
2. Replace `.then((r) => r[0])` → `.then(firstOrNull)` everywhere
3. Replace code uniqueness blocks → `ensureCodeUnique()` where applicable
4. Replace cursor pagination → `buildCursorMeta()` where applicable
5. Replace delete-then-insert transactions → `replaceRelation()` where applicable
6. Update corresponding `.spec.ts` files (swap ClsService mock → RequestContextFacade mock)
7. Run tests for each service after migration
8. Commit per service or per batch (2-3 services per commit is fine)

**Migration list (ordered from simplest to most complex):**

| # | Service File | Patterns to Replace | Test File |
|---|-------------|---------------------|-----------|
| 1 | `towers/pm/attribute-groups/attribute-groups.service.ts` | cls, firstOrNull, ensureCodeUnique | `attribute-groups.service.spec.ts` |
| 2 | `towers/pm/attributes/attributes.service.ts` | cls, firstOrNull, ensureCodeUnique, pagination | `attributes.service.spec.ts` |
| 3 | `towers/pm/categories/categories.service.ts` | cls, firstOrNull, ensureCodeUnique | `categories.service.spec.ts` |
| 4 | `towers/pm/channels/channels.service.ts` | cls, firstOrNull, ensureCodeUnique, replaceRelation | `channels.service.spec.ts` |
| 5 | `towers/pm/extensible-enums/extensible-enums.service.ts` | cls, firstOrNull, ensureCodeUnique | `extensible-enums.service.spec.ts` |
| 6 | `towers/pm/media/media.service.ts` | cls, firstOrNull | `media.service.spec.ts` |
| 7 | `towers/pm/families/families.service.ts` | cls, firstOrNull, ensureCodeUnique, replaceRelation | `families.service.spec.ts` |
| 8 | `towers/pm/classifications/classifications.service.ts` | cls, firstOrNull, ensureCodeUnique, replaceRelation | `classifications.service.spec.ts` |
| 9 | `towers/pm/products/products-crud.service.ts` | cls, firstOrNull, pagination | `products-crud.service.spec.ts` |
| 10 | `towers/pm/products/products-form.service.ts` | cls, firstOrNull | `products-form.service.spec.ts` |
| 11 | `towers/pm/products/products-relations.service.ts` | cls, firstOrNull | `products-relations.service.spec.ts` |
| 12 | `towers/pm/products/products.service.ts` | cls, firstOrNull | `products.service.spec.ts` |
| 13 | `towers/pm/products/product-matcher.service.ts` | cls, firstOrNull | (no spec — skip test update) |
| 14 | `towers/inv/inventory/inventory.service.ts` | cls, firstOrNull, pagination | `inventory.service.spec.ts` |
| 15 | `towers/pm/listings/listings-crud.service.ts` | cls, firstOrNull, pagination | `listings-crud.service.spec.ts` |
| 16 | `towers/pm/listings/listings-form.service.ts` | cls, firstOrNull | `listings-form.service.spec.ts` |
| 17 | `towers/pm/listings/listings-submission.service.ts` | cls, firstOrNull | `listings-submission.service.spec.ts` |
| 18 | `towers/pm/listings/listings-marketplace.service.ts` | cls, firstOrNull | `listings-marketplace.service.spec.ts` |
| 19 | `towers/pm/schema-sync/schema-sync.service.ts` | cls, firstOrNull | `schema-sync.service.spec.ts` |
| 20 | `towers/pm/bootstrap/bootstrap.service.ts` | cls, firstOrNull | `bootstrap.service.spec.ts` |
| 21 | `towers/pm/provisioning/provisioning.service.ts` | cls, firstOrNull | (check for spec) |
| 22 | `towers/pm/global-update/global-update.service.ts` | cls | (check for spec) |
| 23 | `towers/pm/gpc-seed/gpc-seed.service.ts` | firstOrNull | (check for spec) |

**After each batch of 3-5 services:**

Run: `pnpm --filter @ech/server exec tsc --noEmit && pnpm --filter @ech/server test`

Commit with message like: `refactor(pm): migrate attributes, categories, channels to shared utilities`

**Important notes for the implementer:**
- Some services don't use ALL patterns. Only replace what exists.
- `gpc-seed.service.ts` does NOT inject ClsService (it's a global seed service). Only replace `firstOrNull`.
- `products/product-matcher.service.ts` may not have a spec file. Skip test updates if no spec exists.
- For `replaceRelation()` migration: this only applies to services with the delete-then-insert pattern (families.updateAttributes, channels.updateLocales, channels.updateCurrencies, classifications.updateAttributes). The transaction wrapper (`this.db.transaction`) should remain — `replaceRelation` replaces only the inner delete+insert logic.
- Keep running `tsc --noEmit` after each batch to catch any type issues early.

---

## PHASE 2: SPLIT GOD SERVICES

---

### Task 9: Extract `AmazonAuthClient` from `AmazonConnector`

**Files:**
- Create: `apps/server/src/towers/pm/connectors/amazon/amazon-auth.client.ts`
- Modify: `apps/server/src/towers/pm/connectors/amazon/amazon.connector.ts`

The AmazonConnector (650 lines) has auth/token management (refreshAuth, spApiGet) mixed with business operations. Extract the HTTP + auth layer.

- [ ] **Step 1: Create `AmazonAuthClient`**

Create `apps/server/src/towers/pm/connectors/amazon/amazon-auth.client.ts`:

```typescript
import type { AmazonCredentials } from "./amazon.types";
import { AMAZON_REGIONS, LWA_TOKEN_URL } from "./amazon.types";

export class AmazonAuthClient {
	private accessToken: string | null = null;
	private tokenExpiresAt = 0;
	readonly baseUrl: string;

	constructor(private readonly creds: AmazonCredentials) {
		this.baseUrl = AMAZON_REGIONS[this.creds.region] ?? AMAZON_REGIONS.fe!;
	}

	async refreshAuth(): Promise<void> {
		if (this.accessToken && Date.now() < this.tokenExpiresAt) return;

		const body = new URLSearchParams({
			grant_type: "refresh_token",
			client_id: this.creds.clientId,
			client_secret: this.creds.clientSecret,
			refresh_token: this.creds.refreshToken,
		});

		const res = await fetch(LWA_TOKEN_URL, {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body,
		});

		if (!res.ok) {
			const text = await res.text();
			throw new Error(`LWA token refresh failed (${res.status}): ${text}`);
		}

		const data = (await res.json()) as {
			access_token: string;
			expires_in: number;
		};
		this.accessToken = data.access_token;
		this.tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
	}

	async spApiGet<T>(path: string, params?: URLSearchParams): Promise<T> {
		await this.refreshAuth();

		const url = new URL(path, this.baseUrl);
		if (params) url.search = params.toString();

		const res = await fetch(url.toString(), {
			headers: {
				"x-amz-access-token": this.accessToken!,
				"Content-Type": "application/json",
			},
		});

		if (!res.ok) {
			const text = await res.text();
			throw new Error(`SP-API GET ${path} failed (${res.status}): ${text}`);
		}

		return res.json() as Promise<T>;
	}

	async spApiPut<T>(path: string, body: unknown): Promise<T> {
		await this.refreshAuth();

		const url = new URL(path, this.baseUrl);
		const res = await fetch(url.toString(), {
			method: "PUT",
			headers: {
				"x-amz-access-token": this.accessToken!,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(body),
		});

		if (!res.ok) {
			const text = await res.text();
			throw new Error(`SP-API PUT ${path} failed (${res.status}): ${text}`);
		}

		return res.json() as Promise<T>;
	}

	async spApiPatch<T>(path: string, body: unknown): Promise<T> {
		await this.refreshAuth();

		const url = new URL(path, this.baseUrl);
		const res = await fetch(url.toString(), {
			method: "PATCH",
			headers: {
				"x-amz-access-token": this.accessToken!,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(body),
		});

		if (!res.ok) {
			const text = await res.text();
			throw new Error(`SP-API PATCH ${path} failed (${res.status}): ${text}`);
		}

		return res.json() as Promise<T>;
	}

	get sellerId(): string {
		return this.creds.sellerId;
	}

	get marketplaceId(): string {
		return this.creds.marketplaceId;
	}
}
```

- [ ] **Step 2: Check that `amazon.types.ts` exports `LWA_TOKEN_URL` and `AMAZON_REGIONS`**

Read `apps/server/src/towers/pm/connectors/amazon/amazon.types.ts` and verify these constants exist. If `LWA_TOKEN_URL` is defined inside `amazon.connector.ts` instead, move it to `amazon.types.ts`.

- [ ] **Step 3: Refactor `AmazonConnector` to use `AmazonAuthClient`**

In `apps/server/src/towers/pm/connectors/amazon/amazon.connector.ts`:

1. Remove the `refreshAuth()` and `spApiGet()` private methods (they're now in AmazonAuthClient)
2. Remove `private accessToken`, `private tokenExpiresAt`, `private readonly baseUrl` fields
3. Add `private readonly auth: AmazonAuthClient` field
4. In constructor, create `this.auth = new AmazonAuthClient(this.creds)`
5. Replace all `this.spApiGet(...)` → `this.auth.spApiGet(...)`
6. Replace all direct `fetch()` calls for PUT/PATCH with `this.auth.spApiPut(...)` / `this.auth.spApiPatch(...)`
7. Replace `this.baseUrl` → `this.auth.baseUrl`
8. Replace `this.creds.sellerId` → `this.auth.sellerId` (where used in URL paths)

- [ ] **Step 4: Run the connector tests**

Run: `pnpm --filter @ech/server exec vitest run src/towers/pm/connectors/`

Expected: PASS (or no tests exist for connectors — verify)

- [ ] **Step 5: Type-check**

Run: `pnpm --filter @ech/server exec tsc --noEmit`

Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/towers/pm/connectors/amazon/
git commit -m "refactor(connectors): extract AmazonAuthClient from AmazonConnector (auth + HTTP layer)"
```

---

### Task 10: Split `ListingsMarketplaceService` into 3 services

**Files:**
- Create: `apps/server/src/towers/pm/listings/listings-import.service.ts`
- Create: `apps/server/src/towers/pm/listings/catalog-browse.service.ts`
- Modify: `apps/server/src/towers/pm/listings/listings-marketplace.service.ts` (keep only mappings)
- Modify: `apps/server/src/towers/pm/listings/listings.service.ts` (update facade)
- Modify: `apps/server/src/towers/pm/listings/listings.module.ts` (register new services)
- Modify: `apps/server/src/towers/pm/listings/listings.controller.ts` (update if needed)

**Method distribution:**

| Current Method | New Service | Reason |
|---------------|-------------|--------|
| `importSellerListings()` | `ListingsImportService` | Import orchestration |
| `batchLinkParentChildren()` | `ListingsImportService` | Import helper |
| `prefetchFamilies/Listings/Products/Schemas()` | `ListingsImportService` | Import helpers |
| `resolveFamilyVariant()` | `ListingsImportService` | Import helper |
| `catalogSearch()` | `CatalogBrowseService` | Catalog browsing |
| `getCatalogTree()` | `CatalogBrowseService` | Catalog browsing |
| `pullSellerListings()` | `CatalogBrowseService` | Listing fetching |
| `getChannel()` | Both (duplicate as private helper) | Shared dependency |
| `getMappings()` | `ListingsMarketplaceService` | Keep in place |
| `updateMappings()` | `ListingsMarketplaceService` | Keep in place |

- [ ] **Step 1: Create `CatalogBrowseService`**

Create `apps/server/src/towers/pm/listings/catalog-browse.service.ts`:

Move these methods from `listings-marketplace.service.ts`:
- `getChannel()` (private helper — copy it)
- `catalogSearch()` (lines 228-248)
- `getCatalogTree()` (lines 250-341)
- `pullSellerListings()` (lines 343-372)

Constructor should inject: `DB_TOKEN`, `RequestContextFacade`, `ConnectorFactory`, `SchemaSyncService`

```typescript
import { Inject, Injectable } from "@nestjs/common";
import { RequestContextFacade } from "@shared-kernel/infrastructure/context";
import type { DrizzleDb } from "@shared-kernel/infrastructure/db/db.port";
import { DB_TOKEN } from "@shared-kernel/infrastructure/db/db.port";
import { ConnectorFactory } from "../connectors/connector.factory";
import { SchemaSyncService } from "../schema-sync/schema-sync.service";

@Injectable()
export class CatalogBrowseService {
	constructor(
		@Inject(DB_TOKEN) private readonly db: DrizzleDb,
		private readonly ctx: RequestContextFacade,
		private readonly connectorFactory: ConnectorFactory,
		private readonly schemaSyncService: SchemaSyncService,
	) {}

	// Paste getChannel(), catalogSearch(), getCatalogTree(), pullSellerListings() here
	// Replace this.cls.get("organizationId") with this.ctx.getOrgId()
}
```

- [ ] **Step 2: Create `ListingsImportService`**

Create `apps/server/src/towers/pm/listings/listings-import.service.ts`:

Move these methods from `listings-marketplace.service.ts`:
- `getChannel()` (private helper — copy it)
- `prefetchFamilies()` (lines 60-74)
- `prefetchListings()` (lines 76-94)
- `prefetchProducts()` (lines 96-110)
- `prefetchSchemas()` (lines 112-132)
- `resolveFamilyVariant()` (lines 134-226)
- `importSellerListings()` (lines 382-647)
- `batchLinkParentChildren()` (lines 649-743)

Constructor should inject: `DB_TOKEN`, `RequestContextFacade`, `ConnectorFactory`, `SchemaSyncService`

```typescript
import { Inject, Injectable, Logger } from "@nestjs/common";
import { RequestContextFacade } from "@shared-kernel/infrastructure/context";
import type { DrizzleDb } from "@shared-kernel/infrastructure/db/db.port";
import { DB_TOKEN } from "@shared-kernel/infrastructure/db/db.port";
import { ConnectorFactory } from "../connectors/connector.factory";
import { SchemaSyncService } from "../schema-sync/schema-sync.service";

@Injectable()
export class ListingsImportService {
	private readonly logger = new Logger(ListingsImportService.name);

	constructor(
		@Inject(DB_TOKEN) private readonly db: DrizzleDb,
		private readonly ctx: RequestContextFacade,
		private readonly connectorFactory: ConnectorFactory,
		private readonly schemaSyncService: SchemaSyncService,
	) {}

	// Paste all import-related methods here
	// Replace this.cls.get("organizationId") with this.ctx.getOrgId()
}
```

- [ ] **Step 3: Slim down `ListingsMarketplaceService`**

In `apps/server/src/towers/pm/listings/listings-marketplace.service.ts`:

1. Remove ALL methods except `getMappings()` and `updateMappings()`
2. Remove unused imports
3. Remove `ConnectorFactory` and `SchemaSyncService` from constructor (if no longer needed)
4. The service should be ~80 lines now

- [ ] **Step 4: Update the facade `ListingsService`**

In `apps/server/src/towers/pm/listings/listings.service.ts`:

```typescript
// Add new service injections to constructor:
constructor(
	private readonly crud: ListingsCrudService,
	private readonly form: ListingsFormService,
	private readonly submission: ListingsSubmissionService,
	private readonly marketplace: ListingsMarketplaceService,
	private readonly catalogBrowse: CatalogBrowseService,       // NEW
	private readonly listingsImport: ListingsImportService,      // NEW
)

// Update delegation methods:
// catalogSearch, getCatalogTree, pullSellerListings → delegate to this.catalogBrowse
// importSellerListings → delegate to this.listingsImport
// getMappings, updateMappings → keep delegating to this.marketplace
```

- [ ] **Step 5: Update the module**

In `apps/server/src/towers/pm/listings/listings.module.ts`, add to providers:

```typescript
providers: [
	ListingsService,
	ListingsCrudService,
	ListingsFormService,
	ListingsSubmissionService,
	ListingsMarketplaceService,
	CatalogBrowseService,         // NEW
	ListingsImportService,        // NEW
	ListingsSubmitWorker,
	ListingMonitorWorker,
],
```

- [ ] **Step 6: Run all listing tests**

Run: `pnpm --filter @ech/server exec vitest run src/towers/pm/listings/`

Expected: PASS

- [ ] **Step 7: Type-check**

Run: `pnpm --filter @ech/server exec tsc --noEmit`

Expected: No errors

- [ ] **Step 8: Commit**

```bash
git add apps/server/src/towers/pm/listings/
git commit -m "refactor(listings): split ListingsMarketplaceService into CatalogBrowseService + ListingsImportService"
```

---

### Task 11: Split `GpcSeedService` into 2 importers

**Files:**
- Create: `apps/server/src/towers/pm/gpc-seed/global-taxonomy-importer.ts`
- Create: `apps/server/src/towers/pm/gpc-seed/family-template-importer.ts`
- Modify: `apps/server/src/towers/pm/gpc-seed/gpc-seed.service.ts` (keep only facade + getStatus)
- Modify: `apps/server/src/towers/pm/gpc-seed/gpc-seed.module.ts` (register new services)

**Method distribution:**

| Current Method | New Service |
|---------------|-------------|
| `importTaxonomy()` (lines 59-253) | `GlobalTaxonomyImporter` |
| `importFamilyTemplate()` (lines 259-424) | `FamilyTemplateImporter` |
| `getStatus()` (lines 427-453) | Keep in `GpcSeedService` |

- [ ] **Step 1: Create `GlobalTaxonomyImporter`**

Create `apps/server/src/towers/pm/gpc-seed/global-taxonomy-importer.ts`:

```typescript
import { Inject, Injectable, Logger } from "@nestjs/common";
import type { DrizzleDb } from "@shared-kernel/infrastructure/db/db.port";
import { DB_TOKEN } from "@shared-kernel/infrastructure/db/db.port";

@Injectable()
export class GlobalTaxonomyImporter {
	private readonly logger = new Logger(GlobalTaxonomyImporter.name);

	constructor(@Inject(DB_TOKEN) private readonly db: DrizzleDb) {}

	// Move the entire importTaxonomy() method here
	// Keep all its internal logic unchanged
	async importTaxonomy(): Promise<{ families: number; classifications: number; attributes: number }> {
		// ... paste full method body from gpc-seed.service.ts lines 59-253
	}
}
```

- [ ] **Step 2: Create `FamilyTemplateImporter`**

Create `apps/server/src/towers/pm/gpc-seed/family-template-importer.ts`:

```typescript
import { Inject, Injectable, Logger } from "@nestjs/common";
import type { DrizzleDb } from "@shared-kernel/infrastructure/db/db.port";
import { DB_TOKEN } from "@shared-kernel/infrastructure/db/db.port";

@Injectable()
export class FamilyTemplateImporter {
	private readonly logger = new Logger(FamilyTemplateImporter.name);

	constructor(@Inject(DB_TOKEN) private readonly db: DrizzleDb) {}

	// Move the entire importFamilyTemplate() method here
	async importFamilyTemplate(templatePath?: string): Promise<{ families: number; attributes: number; groups: number }> {
		// ... paste full method body from gpc-seed.service.ts lines 259-424
	}
}
```

- [ ] **Step 3: Slim down `GpcSeedService` to facade**

In `apps/server/src/towers/pm/gpc-seed/gpc-seed.service.ts`, replace the file body:

```typescript
import { Injectable } from "@nestjs/common";
import { GlobalTaxonomyImporter } from "./global-taxonomy-importer";
import { FamilyTemplateImporter } from "./family-template-importer";

@Injectable()
export class GpcSeedService {
	constructor(
		private readonly taxonomyImporter: GlobalTaxonomyImporter,
		private readonly templateImporter: FamilyTemplateImporter,
		@Inject(DB_TOKEN) private readonly db: DrizzleDb,
	) {}

	async importTaxonomy() {
		return this.taxonomyImporter.importTaxonomy();
	}

	async importFamilyTemplate(templatePath?: string) {
		return this.templateImporter.importFamilyTemplate(templatePath);
	}

	// Keep getStatus() method as-is (it's short, queries DB directly)
	async getStatus() {
		// ... keep existing code (lines 427-453)
	}
}
```

- [ ] **Step 4: Update module**

In `apps/server/src/towers/pm/gpc-seed/gpc-seed.module.ts`, add new providers:

```typescript
providers: [GpcSeedService, GlobalTaxonomyImporter, FamilyTemplateImporter],
```

- [ ] **Step 5: Run tests and type-check**

Run: `pnpm --filter @ech/server exec vitest run src/towers/pm/gpc-seed/ && pnpm --filter @ech/server exec tsc --noEmit`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/towers/pm/gpc-seed/
git commit -m "refactor(gpc-seed): split into GlobalTaxonomyImporter + FamilyTemplateImporter"
```

---

### Task 12: Decompose `BootstrapService.apply()` into sub-methods

**Files:**
- Modify: `apps/server/src/towers/pm/bootstrap/bootstrap.service.ts`

The `apply()` method is 175 lines doing 4 logical sections. Decompose into named private methods without creating new files.

- [ ] **Step 1: Read the current file**

Read: `apps/server/src/towers/pm/bootstrap/bootstrap.service.ts`

Identify the 4 sections in `apply()` (lines 126-338):
1. Lines 163-200: Create/Reuse Family
2. Lines 202-234: Create AttributeGroups
3. Lines 236-290: Create Attributes + Enums
4. Lines 292-330: Link to Family + Create Mappings

- [ ] **Step 2: Extract `ensureFamily()` private method**

```typescript
private async ensureFamily(
	orgId: string,
	familyCode: string,
	familyLabel: string,
	summary: ApplySummary,
): Promise<string> {
	// Move lines 163-200 here
	// Return the familyId
}
```

- [ ] **Step 3: Extract `ensureAttributeGroups()` private method**

```typescript
private async ensureAttributeGroups(
	orgId: string,
	groups: ParsedGroup[],
	summary: ApplySummary,
): Promise<Map<string, string>> {
	// Move lines 202-234 here
	// Return Map<groupCode, groupId>
}
```

- [ ] **Step 4: Extract `ensureAttributes()` private method**

```typescript
private async ensureAttributes(
	orgId: string,
	attributes: ParsedAttribute[],
	groupMap: Map<string, string>,
	summary: ApplySummary,
): Promise<Map<string, string>> {
	// Move lines 236-290 here (includes enum creation)
	// Return Map<attrCode, attrId>
}
```

- [ ] **Step 5: Extract `createMappingsAndLinks()` private method**

```typescript
private async createMappingsAndLinks(
	orgId: string,
	channelId: string,
	mptId: string,
	familyId: string,
	attributes: ParsedAttribute[],
	attrMap: Map<string, string>,
	summary: ApplySummary,
): Promise<void> {
	// Move lines 292-330 here
}
```

- [ ] **Step 6: Rewrite `apply()` as orchestrator**

```typescript
async apply(channelId: string, dto: ApplyBootstrapDto) {
	const orgId = this.ctx.getOrgId();
	const channel = await this.ensureChannelExists(channelId, orgId);
	// ... validate MPT, re-parse schema (keep lines 126-161)

	const summary = { /* init counters */ };

	const familyId = await this.ensureFamily(orgId, familyCode, familyLabel, summary);
	const groupMap = await this.ensureAttributeGroups(orgId, groups, summary);
	const attrMap = await this.ensureAttributes(orgId, attributes, groupMap, summary);
	await this.createMappingsAndLinks(orgId, channelId, mptId, familyId, attributes, attrMap, summary);

	return summary;
}
```

- [ ] **Step 7: Run tests and type-check**

Run: `pnpm --filter @ech/server exec vitest run src/towers/pm/bootstrap/ && pnpm --filter @ech/server exec tsc --noEmit`

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add apps/server/src/towers/pm/bootstrap/bootstrap.service.ts
git commit -m "refactor(bootstrap): decompose apply() into ensureFamily, ensureAttributeGroups, ensureAttributes, createMappingsAndLinks"
```

---

### Task 13: Decompose `ProductsFormService.getFamily()` into sub-methods

**Files:**
- Modify: `apps/server/src/towers/pm/products/products-form.service.ts`

The `getFamily()` method is 157 lines with 5 logical sections. Decompose into named private methods.

- [ ] **Step 1: Read the current file**

Read: `apps/server/src/towers/pm/products/products-form.service.ts`

Identify the 5 sections in `getFamily()` (lines 24-180):
1. Lines 24-52: Fetch product + family
2. Lines 54-117: Fetch attributes with enum options
3. Lines 119-159: Group attributes by attribute group
4. Lines 161-179: Fetch family variants

- [ ] **Step 2: Extract `fetchFamilyAttributes()` private method**

```typescript
private async fetchFamilyAttributes(familyId: string): Promise<AttributeWithOptions[]> {
	// Move lines 54-117 here
	// Fetch family attributes, batch-load enum options, merge
	// Return array of attributes with their options
}
```

- [ ] **Step 3: Extract `groupAttributesByGroup()` private method**

```typescript
private async groupAttributesByGroup(
	familyId: string,
	attributes: AttributeWithOptions[],
): Promise<GroupedAttributes[]> {
	// Move lines 119-159 here
	// Fetch groups, build groupedAttrs map, handle ungrouped
	// Return array of groups with their attributes
}
```

- [ ] **Step 4: Extract `fetchFamilyVariants()` private method**

```typescript
private async fetchFamilyVariants(familyId: string): Promise<FamilyVariant[]> {
	// Move lines 161-179 here
	// Fetch variants with axes
}
```

- [ ] **Step 5: Rewrite `getFamily()` as orchestrator**

```typescript
async getFamily(productId: string) {
	const orgId = this.ctx.getOrgId();
	// ... fetch product, validate, get familyId (keep lines 24-52)

	const attributes = await this.fetchFamilyAttributes(familyId);
	const groups = await this.groupAttributesByGroup(familyId, attributes);
	const variants = await this.fetchFamilyVariants(familyId);

	return { family, groups, variants, productValues: product.values };
}
```

- [ ] **Step 6: Run tests and type-check**

Run: `pnpm --filter @ech/server exec vitest run src/towers/pm/products/products-form.service.spec.ts && pnpm --filter @ech/server exec tsc --noEmit`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/server/src/towers/pm/products/products-form.service.ts
git commit -m "refactor(products): decompose getFamily() into fetchFamilyAttributes, groupAttributesByGroup, fetchFamilyVariants"
```

---

### Task 14: Extract `AutoMappingGenerator` from `SchemaSyncService`

**Files:**
- Create: `apps/server/src/towers/pm/schema-sync/auto-mapping-generator.ts`
- Modify: `apps/server/src/towers/pm/schema-sync/schema-sync.service.ts`
- Modify: `apps/server/src/towers/pm/schema-sync/schema-sync.module.ts`

The `autoGenerateMappings()` method (75 lines) is a self-contained concern within SchemaSyncService.

- [ ] **Step 1: Create `AutoMappingGenerator`**

Create `apps/server/src/towers/pm/schema-sync/auto-mapping-generator.ts`:

```typescript
import { Inject, Injectable, Logger } from "@nestjs/common";
import type { DrizzleDb } from "@shared-kernel/infrastructure/db/db.port";
import { DB_TOKEN } from "@shared-kernel/infrastructure/db/db.port";

@Injectable()
export class AutoMappingGenerator {
	private readonly logger = new Logger(AutoMappingGenerator.name);

	constructor(@Inject(DB_TOKEN) private readonly db: DrizzleDb) {}

	// Move autoGenerateMappings() here from schema-sync.service.ts (lines 315-393)
	// Make it public
	async generate(
		orgId: string,
		channelId: string,
		schema: ProductTypeSchema,
	): Promise<{ created: number; skipped: number }> {
		// ... paste full method body
	}
}
```

- [ ] **Step 2: Update `SchemaSyncService`**

In `apps/server/src/towers/pm/schema-sync/schema-sync.service.ts`:

1. Remove `autoGenerateMappings()` private method
2. Inject `AutoMappingGenerator` in constructor
3. Replace `this.autoGenerateMappings(...)` calls with `this.mappingGenerator.generate(...)`

- [ ] **Step 3: Update module**

In `apps/server/src/towers/pm/schema-sync/schema-sync.module.ts`:

```typescript
providers: [SchemaSyncService, AutoMappingGenerator],
exports: [SchemaSyncService],
```

- [ ] **Step 4: Run tests and type-check**

Run: `pnpm --filter @ech/server exec vitest run src/towers/pm/schema-sync/ && pnpm --filter @ech/server exec tsc --noEmit`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/towers/pm/schema-sync/
git commit -m "refactor(schema-sync): extract AutoMappingGenerator from SchemaSyncService"
```

---

### Task 15: Final validation

**Files:** None (validation only)

- [ ] **Step 1: Run full test suite**

Run: `pnpm --filter @ech/server test`

Expected: All tests pass

- [ ] **Step 2: Run full type-check**

Run: `pnpm --filter @ech/server exec tsc --noEmit`

Expected: No errors

- [ ] **Step 3: Run lint**

Run: `pnpm --filter @ech/server exec biome check src/`

Expected: No errors (or only pre-existing ones)

- [ ] **Step 4: Verify line count reduction**

Run: `wc -l apps/server/src/towers/pm/listings/listings-marketplace.service.ts apps/server/src/towers/pm/connectors/amazon/amazon.connector.ts apps/server/src/towers/pm/gpc-seed/gpc-seed.service.ts`

Expected:
- `listings-marketplace.service.ts`: ~80 lines (was 803)
- `amazon.connector.ts`: ~550 lines (was 650, auth extracted)
- `gpc-seed.service.ts`: ~50 lines (was 454)

- [ ] **Step 5: Commit any remaining fixes**

```bash
git add -A
git commit -m "refactor(server): final cleanup after Phase 1+2 refactoring"
```
