# Connectors Code Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 7 code review findings in the shared-kernel connectors module: remove dead code, add connector caching, improve testability, validate settings, and clean up barrel exports.

**Architecture:** The connector system uses a self-registering factory pattern. Changes: (1) remove unused `ChannelSettings` interface, (2) add per-sellerId connector caching in `ConnectorFactory` to avoid duplicate OAuth token exchanges, (3) internalize registry into `ConnectorFactory` for testability, (4) add fail-fast validation in `AmazonConnector` constructor, (5) fix barrel export ordering.

**Tech Stack:** NestJS 11, TypeScript strict, Vitest, Biome (tabs, 120-char)

---

## File Structure

### Files to MODIFY

```
apps/server/src/shared-kernel/infrastructure/connectors/
├── connector.interface.ts          ← Remove ChannelSettings, keep DimensionSet + ConnectorCapabilities + IChannelConnector
├── connector.registry.ts           ← Add clearRegistry() for testing
├── connector.factory.ts            ← Add connector caching per (platform, sellerId) key
├── connectors.module.ts            ← (unchanged)
├── index.ts                        ← Remove ChannelSettings export, fix comment ordering
├── connectors.module.spec.ts       ← Update tests for new factory caching behavior
└── amazon/
    └── amazon.connector.ts         ← Add settings validation in constructor (fail-fast)
```

### Files to CREATE

```
apps/server/src/shared-kernel/infrastructure/connectors/connector.factory.spec.ts  ← New: test caching, cache invalidation, registry delegation
```

---

## Task 1: Remove dead `ChannelSettings` interface (P1-1 + P3-7)

**Files:**
- Modify: `apps/server/src/shared-kernel/infrastructure/connectors/connector.interface.ts`
- Modify: `apps/server/src/shared-kernel/infrastructure/connectors/index.ts`

`ChannelSettings` is defined in `connector.interface.ts:3-12` and re-exported in `index.ts:71`, but **no file in the codebase imports it**. The DB schema (`packages/database/src/schemas/pm/channels.schema.ts:5`) defines its own `ChannelSettings` with a different shape. All callers cast to `Record<string, unknown>`. This is dead code that creates confusion.

- [ ] **Step 1: Remove ChannelSettings from connector.interface.ts**

In `apps/server/src/shared-kernel/infrastructure/connectors/connector.interface.ts`, remove lines 1-12 (the `ChannelSettings` interface and its comment). The file becomes:

```typescript
// ─── Shared Dimension Type ───────────────────────────────────────────────────

export interface DimensionSet {
	height?: { value: number; unit: string };
	length?: { value: number; unit: string };
	width?: { value: number; unit: string };
	weight?: { value: number; unit: string };
}

// ─── Connector Capabilities ──────────────────────────────────────────────────

export interface ConnectorCapabilities {
	// PM tower capabilities
	canSearchCatalog: boolean;
	canPullListings: boolean;
	canCheckRestrictions: boolean;
	canSearchProductTypes: boolean;
	canSubmitListings: boolean;
	// INV tower capabilities
	canSyncInventory: boolean;
	// OMS tower capabilities
	canPullOrders: boolean;
	// FUL tower capabilities
	canTrackFulfillment: boolean;
}

// ─── Core Interface (required for ALL connectors) ────────────────────────────

export interface IChannelConnector {
	readonly platform: string;
	readonly capabilities: ConnectorCapabilities;

	validateCredentials(): Promise<boolean>;
}
```

- [ ] **Step 2: Remove ChannelSettings from barrel export and fix comment ordering**

In `apps/server/src/shared-kernel/infrastructure/connectors/index.ts`, rewrite to fix comment positions (Biome auto-sorted exports but left comments in wrong places) and remove `ChannelSettings`:

```typescript
// Trigger Amazon self-registration on module load
import "./amazon/amazon.connector";

// ─── Core ────────────────────────────────────────────────────────────────────
export { ConnectorFactory } from "./connector.factory";
export type {
	ConnectorCapabilities,
	DimensionSet,
	IChannelConnector,
} from "./connector.interface";
export {
	getConnectorClass,
	getSupportedPlatforms,
	registerConnector,
} from "./connector.registry";
export { ConnectorsModule } from "./connectors.module";

// ─── PM Capabilities ────────────────────────────────────────────────────────
export type {
	CatalogSearchQuery,
	CatalogSearchResult,
	CatalogTreeResult,
	ICatalogSearchable,
} from "./capabilities";
export { isCatalogSearchable } from "./capabilities";

export type {
	IListingPullable,
	ImportableItem,
	ImportResult,
	NormalizedListing,
	VariationForest,
	VariationTreeNode,
} from "./capabilities";
export { isListingPullable } from "./capabilities";

export type {
	IRestrictionCheckable,
	ListingsItemIssue,
	ListingsItemWithIssues,
	ListingsRestriction,
} from "./capabilities";
export { isRestrictionCheckable } from "./capabilities";

export type {
	IProductTypeSearchable,
	ProductTypeSchema,
} from "./capabilities";
export { isProductTypeSearchable } from "./capabilities";

export type {
	IListingSubmittable,
	ListingPayload,
	ListingSubmissionResult,
} from "./capabilities";
export { isListingSubmittable } from "./capabilities";

// ─── INV Capabilities ───────────────────────────────────────────────────────
export type {
	IInventorySyncable,
	InventorySummary,
	InventoryUpdate,
	InventoryUpdateResult,
} from "./capabilities";
export { isInventorySyncable } from "./capabilities";

// ─── OMS Capabilities ───────────────────────────────────────────────────────
export type {
	IOrderPullable,
	NormalizedOrder,
	NormalizedOrderItem,
} from "./capabilities";
export { isOrderPullable } from "./capabilities";

// ─── FUL Capabilities ───────────────────────────────────────────────────────
export type {
	FulfillmentOrder,
	IFulfillmentTrackable,
	ShipmentInfo,
} from "./capabilities";
export { isFulfillmentTrackable } from "./capabilities";

// ─── Amazon-specific exports ─────────────────────────────────────────────────
export type {
	AmazonBuildContext,
	AmazonCredentials,
	AttributeMapping,
	OfferValues,
} from "./amazon";
export {
	AMAZON_DEFAULT_MAPPINGS,
	AMAZON_SUMMARY_FALLBACKS,
	AmazonConnector,
	AmazonPayloadBuilder,
	AmazonSchemaValidator,
} from "./amazon";
```

- [ ] **Step 3: Run biome + tsc to verify**

Run: `cd /Users/minhpham/Workspase/ech-kenshin && npx biome check apps/server/src/shared-kernel/infrastructure/connectors/connector.interface.ts apps/server/src/shared-kernel/infrastructure/connectors/index.ts --write`
Run: `npx tsc --noEmit --project apps/server/tsconfig.app.json 2>&1 | grep "ChannelSettings"`
Expected: No output (no file references it)

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/shared-kernel/infrastructure/connectors/connector.interface.ts apps/server/src/shared-kernel/infrastructure/connectors/index.ts
git commit -m "fix(connectors): remove dead ChannelSettings interface and fix barrel export ordering"
```

---

## Task 2: Add fail-fast settings validation in AmazonConnector (P2-4)

**Files:**
- Modify: `apps/server/src/shared-kernel/infrastructure/connectors/amazon/amazon.connector.ts:56-59,681-692`
- Modify: `apps/server/src/shared-kernel/infrastructure/connectors/amazon/amazon.connector.spec.ts`

Currently `extractCredentials` silently defaults missing fields to `""`, leading to confusing SP-API errors at runtime. Add validation that throws immediately with a descriptive error.

- [ ] **Step 1: Write failing test for missing credentials**

Add to `apps/server/src/shared-kernel/infrastructure/connectors/amazon/amazon.connector.spec.ts`, in the top-level `describe("AmazonConnector")` block:

```typescript
describe("constructor validation", () => {
	it("throws if sellerId is missing", () => {
		expect(
			() =>
				new AmazonConnector({
					marketplaceId: "A1VC38T7YXB528",
					refreshToken: "rt",
					clientId: "cid",
					clientSecret: "cs",
					region: "fe",
				}),
		).toThrow("Amazon connector requires: sellerId");
	});

	it("throws if marketplaceId is missing", () => {
		expect(
			() =>
				new AmazonConnector({
					sellerId: "S1",
					refreshToken: "rt",
					clientId: "cid",
					clientSecret: "cs",
					region: "fe",
				}),
		).toThrow("Amazon connector requires: marketplaceId");
	});

	it("throws if refreshToken is missing", () => {
		expect(
			() =>
				new AmazonConnector({
					sellerId: "S1",
					marketplaceId: "A1VC38T7YXB528",
					clientId: "cid",
					clientSecret: "cs",
					region: "fe",
				}),
		).toThrow("Amazon connector requires: refreshToken");
	});

	it("throws if multiple fields are missing", () => {
		expect(() => new AmazonConnector({})).toThrow(
			"Amazon connector requires: sellerId, marketplaceId, refreshToken, clientId, clientSecret",
		);
	});

	it("accepts valid settings", () => {
		expect(
			() =>
				new AmazonConnector({
					sellerId: "S1",
					marketplaceId: "A1VC38T7YXB528",
					refreshToken: "rt",
					clientId: "cid",
					clientSecret: "cs",
				}),
		).not.toThrow();
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/minhpham/Workspase/ech-kenshin/apps/server && npx vitest run src/shared-kernel/infrastructure/connectors/amazon/amazon.connector.spec.ts -t "constructor validation" 2>&1 | tail -15`
Expected: FAIL — constructor doesn't throw yet

- [ ] **Step 3: Implement validation in extractCredentials**

In `apps/server/src/shared-kernel/infrastructure/connectors/amazon/amazon.connector.ts`, replace the `extractCredentials` method (around line 681-692):

**Before:**
```typescript
private extractCredentials(
	settings: Record<string, unknown>,
): AmazonCredentials {
	return {
		sellerId: (settings.sellerId as string) || "",
		marketplaceId: (settings.marketplaceId as string) || "",
		refreshToken: (settings.refreshToken as string) || "",
		clientId: (settings.clientId as string) || "",
		clientSecret: (settings.clientSecret as string) || "",
		region: (settings.region as "na" | "eu" | "fe") || "fe",
	};
}
```

**After:**
```typescript
private extractCredentials(
	settings: Record<string, unknown>,
): AmazonCredentials {
	const required = ["sellerId", "marketplaceId", "refreshToken", "clientId", "clientSecret"] as const;
	const missing = required.filter((k) => !settings[k] || typeof settings[k] !== "string");

	if (missing.length > 0) {
		throw new Error(`Amazon connector requires: ${missing.join(", ")}`);
	}

	return {
		sellerId: settings.sellerId as string,
		marketplaceId: settings.marketplaceId as string,
		refreshToken: settings.refreshToken as string,
		clientId: settings.clientId as string,
		clientSecret: settings.clientSecret as string,
		region: (settings.region as "na" | "eu" | "fe") || "fe",
	};
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/minhpham/Workspase/ech-kenshin/apps/server && npx vitest run src/shared-kernel/infrastructure/connectors/amazon/amazon.connector.spec.ts -t "constructor validation" 2>&1 | tail -15`
Expected: PASS — all 5 validation tests green

- [ ] **Step 5: Run ALL connector tests to ensure no regressions**

Run: `cd /Users/minhpham/Workspase/ech-kenshin/apps/server && npx vitest run src/shared-kernel/infrastructure/connectors/ 2>&1 | tail -15`
Expected: All 42+ tests pass (existing tests use valid settings in TEST_SETTINGS)

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/shared-kernel/infrastructure/connectors/amazon/amazon.connector.ts apps/server/src/shared-kernel/infrastructure/connectors/amazon/amazon.connector.spec.ts
git commit -m "fix(connectors): add fail-fast settings validation in AmazonConnector constructor"
```

---

## Task 3: Add `clearRegistry()` for testing (P2-3)

**Files:**
- Modify: `apps/server/src/shared-kernel/infrastructure/connectors/connector.registry.ts`
- Modify: `apps/server/src/shared-kernel/infrastructure/connectors/index.ts`

The global `Map` registry can't be reset between tests. Add a `clearRegistry()` function. We're NOT moving the registry into `ConnectorFactory` (too much disruption for self-registration pattern), but we're making it testable.

- [ ] **Step 1: Add clearRegistry to connector.registry.ts**

In `apps/server/src/shared-kernel/infrastructure/connectors/connector.registry.ts`, add after line 24:

```typescript
/** Reset registry — for testing only. */
export function clearRegistry(): void {
	registry.clear();
}
```

Full file becomes:

```typescript
import type { IChannelConnector } from "./connector.interface";

type ConnectorConstructor = new (
	settings: Record<string, unknown>,
) => IChannelConnector;

const registry = new Map<string, ConnectorConstructor>();

export function registerConnector(
	platform: string,
	ctor: ConnectorConstructor,
): void {
	registry.set(platform, ctor);
}

export function getConnectorClass(
	platform: string,
): ConnectorConstructor | undefined {
	return registry.get(platform);
}

export function getSupportedPlatforms(): string[] {
	return [...registry.keys()];
}

/** Reset registry — for testing only. */
export function clearRegistry(): void {
	registry.clear();
}
```

- [ ] **Step 2: Export clearRegistry from barrel**

In `apps/server/src/shared-kernel/infrastructure/connectors/index.ts`, update the registry export block:

**Before:**
```typescript
export {
	getConnectorClass,
	getSupportedPlatforms,
	registerConnector,
} from "./connector.registry";
```

**After:**
```typescript
export {
	clearRegistry,
	getConnectorClass,
	getSupportedPlatforms,
	registerConnector,
} from "./connector.registry";
```

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/shared-kernel/infrastructure/connectors/connector.registry.ts apps/server/src/shared-kernel/infrastructure/connectors/index.ts
git commit -m "fix(connectors): add clearRegistry() for test isolation"
```

---

## Task 4: Add connector caching in ConnectorFactory (P1-2)

**Files:**
- Modify: `apps/server/src/shared-kernel/infrastructure/connectors/connector.factory.ts`
- Create: `apps/server/src/shared-kernel/infrastructure/connectors/connector.factory.spec.ts`
- Modify: `apps/server/src/shared-kernel/infrastructure/connectors/connectors.module.spec.ts`

Every `connectorFactory.create()` call creates a new `AmazonConnector` → new `AmazonAuthClient` → new OAuth token exchange. Multiple calls in the same request waste time. Add a cache keyed by `(platform, sellerId)` with a configurable TTL.

- [ ] **Step 1: Write failing tests for connector caching**

Create `apps/server/src/shared-kernel/infrastructure/connectors/connector.factory.spec.ts`:

```typescript
import { BadRequestException } from "@nestjs/common";
import { beforeEach, describe, expect, it } from "vitest";
import type { IChannelConnector } from "./connector.interface";
import { clearRegistry, registerConnector } from "./connector.registry";
import { ConnectorFactory } from "./connector.factory";

const SETTINGS_A = {
	sellerId: "SELLER_A",
	marketplaceId: "MKT1",
	refreshToken: "rt",
	clientId: "cid",
	clientSecret: "cs",
	region: "fe",
};

const SETTINGS_B = {
	sellerId: "SELLER_B",
	marketplaceId: "MKT2",
	refreshToken: "rt2",
	clientId: "cid2",
	clientSecret: "cs2",
	region: "na",
};

class FakeConnector implements IChannelConnector {
	readonly platform = "fake";
	readonly capabilities = {
		canSearchCatalog: false,
		canPullListings: false,
		canCheckRestrictions: false,
		canSearchProductTypes: false,
		canSubmitListings: false,
		canSyncInventory: false,
		canPullOrders: false,
		canTrackFulfillment: false,
	};
	constructor(public readonly settings: Record<string, unknown>) {}
	async validateCredentials() {
		return true;
	}
}

describe("ConnectorFactory", () => {
	let factory: ConnectorFactory;

	beforeEach(() => {
		clearRegistry();
		registerConnector("fake", FakeConnector);
		factory = new ConnectorFactory();
	});

	it("returns the same instance for same platform + sellerId", () => {
		const a = factory.create("fake", SETTINGS_A);
		const b = factory.create("fake", SETTINGS_A);
		expect(a).toBe(b);
	});

	it("returns different instances for different sellerIds", () => {
		const a = factory.create("fake", SETTINGS_A);
		const b = factory.create("fake", SETTINGS_B);
		expect(a).not.toBe(b);
	});

	it("throws BadRequestException for unsupported platform", () => {
		expect(() => factory.create("shopee", SETTINGS_A)).toThrow(
			BadRequestException,
		);
	});

	it("evicts cache entry via evict()", () => {
		const a = factory.create("fake", SETTINGS_A);
		factory.evict("fake", "SELLER_A");
		const b = factory.create("fake", SETTINGS_A);
		expect(a).not.toBe(b);
	});

	it("clears all cached instances via clearCache()", () => {
		const a = factory.create("fake", SETTINGS_A);
		const b = factory.create("fake", SETTINGS_B);
		factory.clearCache();
		const a2 = factory.create("fake", SETTINGS_A);
		const b2 = factory.create("fake", SETTINGS_B);
		expect(a).not.toBe(a2);
		expect(b).not.toBe(b2);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/minhpham/Workspase/ech-kenshin/apps/server && npx vitest run src/shared-kernel/infrastructure/connectors/connector.factory.spec.ts 2>&1 | tail -15`
Expected: FAIL — `evict` and `clearCache` don't exist yet, and `create()` returns new instances

- [ ] **Step 3: Implement caching in ConnectorFactory**

Replace `apps/server/src/shared-kernel/infrastructure/connectors/connector.factory.ts`:

```typescript
import { BadRequestException, Injectable, OnModuleDestroy } from "@nestjs/common";
import type { IChannelConnector } from "./connector.interface";
import { getConnectorClass, getSupportedPlatforms } from "./connector.registry";

@Injectable()
export class ConnectorFactory implements OnModuleDestroy {
	private readonly cache = new Map<string, IChannelConnector>();

	create(
		platform: string,
		settings: Record<string, unknown>,
	): IChannelConnector {
		const ConnectorClass = getConnectorClass(platform);
		if (!ConnectorClass) {
			throw new BadRequestException(
				`Unsupported platform: '${platform}'. Supported: ${getSupportedPlatforms().join(", ")}`,
			);
		}

		const sellerId = (settings.sellerId as string) || "";
		const cacheKey = `${platform}:${sellerId}`;

		const cached = this.cache.get(cacheKey);
		if (cached) return cached;

		const connector = new ConnectorClass(settings);
		this.cache.set(cacheKey, connector);
		return connector;
	}

	/** Remove a specific connector from cache (e.g., after credential rotation). */
	evict(platform: string, sellerId: string): void {
		this.cache.delete(`${platform}:${sellerId}`);
	}

	/** Clear all cached connectors. */
	clearCache(): void {
		this.cache.clear();
	}

	onModuleDestroy(): void {
		this.cache.clear();
	}
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/minhpham/Workspase/ech-kenshin/apps/server && npx vitest run src/shared-kernel/infrastructure/connectors/connector.factory.spec.ts 2>&1 | tail -15`
Expected: All 5 tests pass

- [ ] **Step 5: Update existing module spec to account for caching**

In `apps/server/src/shared-kernel/infrastructure/connectors/connectors.module.spec.ts`, the test "should create Amazon connector" uses `new ConnectorFactory()` directly. This still works because caching doesn't change the contract — `create()` still returns a connector. No changes needed, but verify it passes.

Run: `cd /Users/minhpham/Workspase/ech-kenshin/apps/server && npx vitest run src/shared-kernel/infrastructure/connectors/connectors.module.spec.ts 2>&1 | tail -10`
Expected: Both tests pass

- [ ] **Step 6: Run ALL connector tests**

Run: `cd /Users/minhpham/Workspase/ech-kenshin/apps/server && npx vitest run src/shared-kernel/infrastructure/connectors/ 2>&1 | tail -15`
Expected: All tests pass (47+ now with new factory tests)

- [ ] **Step 7: Run full test suite**

Run: `cd /Users/minhpham/Workspase/ech-kenshin/apps/server && npx vitest run 2>&1 | tail -10`
Expected: All 420+ tests pass

- [ ] **Step 8: Commit**

```bash
git add apps/server/src/shared-kernel/infrastructure/connectors/connector.factory.ts apps/server/src/shared-kernel/infrastructure/connectors/connector.factory.spec.ts
git commit -m "feat(connectors): add connector caching per (platform, sellerId) in ConnectorFactory"
```

---

## Task 5: Final verification

- [ ] **Step 1: Run TypeScript check**

Run: `cd /Users/minhpham/Workspase/ech-kenshin && npx tsc --noEmit --project apps/server/tsconfig.app.json 2>&1 | head -20`
Expected: Zero connector-related errors

- [ ] **Step 2: Run Biome**

Run: `npx biome check apps/server/src/shared-kernel/infrastructure/connectors/ --write`
Expected: Clean or auto-fixed

- [ ] **Step 3: Run full test suite one final time**

Run: `cd /Users/minhpham/Workspase/ech-kenshin/apps/server && npx vitest run 2>&1 | tail -10`
Expected: All tests pass

- [ ] **Step 4: Commit if biome made changes**

```bash
git add -A apps/server/src/shared-kernel/infrastructure/connectors/
git commit -m "fix(connectors): biome formatting cleanup"
```

---

## Execution Order Summary

| Order | Task | Description | Risk |
|-------|------|-------------|------|
| 1 | Task 1 | Remove dead `ChannelSettings` + fix barrel ordering | Low — only removes unused code |
| 2 | Task 2 | AmazonConnector constructor validation | Low — additive, existing tests use valid settings |
| 3 | Task 3 | Add `clearRegistry()` | Low — additive, one-line function |
| 4 | Task 4 | Connector caching in factory | Medium — changes `create()` behavior (returns cached instances) |
| 5 | Task 5 | Final verification | Low — read-only checks |

## Decisions NOT Made (deferred)

- **Moving registry into ConnectorFactory class**: The self-registration pattern (`registerConnector("amazon", ...)` at module load) requires module-level access. Internalizing the registry would break this pattern and require all connectors to explicitly register in the module. Not worth the churn.
- **NestJS-managed connector lifecycle**: Connectors are not NestJS providers — they're plain class instances created by a factory. Making them request-scoped NestJS providers would require a major refactor of every consumer. The `OnModuleDestroy` hook in `ConnectorFactory` handles cleanup.
- **`getProductTypeDefinitions` relocation**: Moving this from `IListingSubmittable` to `IProductTypeSearchable` would change the API contract. Deferred to a separate PR.
