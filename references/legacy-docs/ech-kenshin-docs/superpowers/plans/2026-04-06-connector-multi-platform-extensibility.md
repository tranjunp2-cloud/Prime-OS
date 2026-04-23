# Connector Multi-Platform Extensibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the connector architecture to support multi-platform catalog search with a system-level Rakuten fallback, platform-aware data mapping registries, and unified API contracts.

**Architecture:** New `CatalogResolutionStrategy` routes catalog search requests to either a system-level `RakutenPublicConnector` singleton or seller-specific channel connectors via `ConnectorFactory`. Two new registries (`ValueUnwrapperRegistry`, `PayloadBuilderRegistry`) decouple platform-specific data transformation from the generic `MappingEngine`. All catalog search responses use a unified `CatalogSearchItem` format.

**Tech Stack:** NestJS, TypeScript, Vitest, Drizzle ORM, Zod validation

**Spec:** `docs/superpowers/specs/2026-04-06-connector-multi-platform-extensibility-design.md`

---

## Task 1: Unified CatalogSearchItem types in catalog capability

**Files:**
- Modify: `apps/server/src/shared-kernel/infrastructure/connectors/capabilities/catalog.capability.ts`
- Modify: `apps/server/src/shared-kernel/infrastructure/connectors/capabilities/index.ts`
- Modify: `apps/server/src/shared-kernel/infrastructure/connectors/index.ts`

Add the new unified types alongside existing ones. The old `CatalogSearchResult` stays for backward compatibility until Amazon connector is migrated in Task 5.

- [ ] **Step 1: Add new unified types to catalog.capability.ts**

Append after the existing `CatalogTreeResult` interface (after line 47):

```typescript
// ── Unified Catalog Search Types (platform-agnostic) ──────────────────────

export interface ProductIdentifiers {
	asin?: string;
	jan?: string;
	ean?: string;
	upc?: string;
	gtin?: string;
	platformItemCode?: string;
}

export interface CatalogImage {
	link: string;
	width?: number;
	height?: number;
	variant?: string; // "small" | "medium" | "large"
}

export interface Classification {
	id: string;
	name: string;
	parentId?: string;
	parentName?: string;
}

export interface VariationInfo {
	type: "parent" | "child" | "standalone";
	parentIdentifier?: string;
	childIdentifiers?: string[];
	theme?: string[];
	children?: CatalogSearchItem[];
}

export interface CatalogSearchItem {
	title: string;
	identifiers: ProductIdentifiers;
	externalUrl?: string;
	images: CatalogImage[];
	classifications: Classification[];
	variation: VariationInfo;
	attributes: Record<string, unknown>;
}
```

- [ ] **Step 2: Export new types from capabilities/index.ts**

Add to the catalog exports block in `capabilities/index.ts` (after line 6):

```typescript
export type {
	CatalogImage,
	CatalogSearchItem,
	CatalogSearchQuery,
	CatalogSearchResult,
	CatalogTreeResult,
	Classification,
	ICatalogSearchable,
	ProductIdentifiers,
	VariationInfo,
} from "./catalog.capability";
export { isCatalogSearchable } from "./catalog.capability";
```

This replaces the existing 5-line block (lines 1-7).

- [ ] **Step 3: Export new types from connectors/index.ts**

Add the new type names to the existing type export block in `connectors/index.ts` (the block starting at line 22 `export type {`). Add `CatalogImage`, `CatalogSearchItem`, `Classification`, `ProductIdentifiers`, `VariationInfo` to the alphabetically-sorted list.

- [ ] **Step 4: Run TypeScript check**

Run: `cd apps/server && npx tsc --noEmit`
Expected: 0 errors. New types are additive, nothing references them yet.

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/shared-kernel/infrastructure/connectors/capabilities/catalog.capability.ts apps/server/src/shared-kernel/infrastructure/connectors/capabilities/index.ts apps/server/src/shared-kernel/infrastructure/connectors/index.ts
git commit -m "feat(connectors): add unified CatalogSearchItem types for multi-platform catalog search"
```

---

## Task 2: ValueUnwrapperRegistry + Amazon unwrapper extraction

**Files:**
- Create: `apps/server/src/shared-kernel/infrastructure/connectors/registries/value-unwrapper.registry.ts`
- Create: `apps/server/src/shared-kernel/infrastructure/connectors/amazon/amazon-value-unwrapper.ts`
- Create: `apps/server/src/shared-kernel/infrastructure/connectors/registries/value-unwrapper.registry.spec.ts`
- Modify: `apps/server/src/shared-kernel/infrastructure/connectors/index.ts`

- [ ] **Step 1: Write the failing test for ValueUnwrapperRegistry**

Create `apps/server/src/shared-kernel/infrastructure/connectors/registries/value-unwrapper.registry.spec.ts`:

```typescript
import { describe, expect, it, beforeEach } from "vitest";
import {
	registerUnwrapper,
	getUnwrapper,
	clearUnwrapperRegistry,
} from "./value-unwrapper.registry";

describe("ValueUnwrapperRegistry", () => {
	beforeEach(() => {
		clearUnwrapperRegistry();
	});

	it("returns passthrough unwrapper for unknown platform", () => {
		const unwrap = getUnwrapper("unknown_platform");
		expect(unwrap("hello", "key")).toBe("hello");
		expect(unwrap(42, "key")).toBe(42);
		expect(unwrap([1, 2], "key")).toEqual([1, 2]);
	});

	it("returns registered unwrapper for known platform", () => {
		registerUnwrapper("test_platform", (value) =>
			typeof value === "string" ? value.toUpperCase() : value,
		);
		const unwrap = getUnwrapper("test_platform");
		expect(unwrap("hello", "key")).toBe("HELLO");
	});

	it("overwrites previous registration for same platform", () => {
		registerUnwrapper("test", () => "first");
		registerUnwrapper("test", () => "second");
		const unwrap = getUnwrapper("test");
		expect(unwrap("anything", "key")).toBe("second");
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/server && npx vitest run src/shared-kernel/infrastructure/connectors/registries/value-unwrapper.registry.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create ValueUnwrapperRegistry**

Create `apps/server/src/shared-kernel/infrastructure/connectors/registries/value-unwrapper.registry.ts`:

```typescript
export type UnwrapFn = (rawValue: unknown, attributeKey: string) => unknown;

const registry = new Map<string, UnwrapFn>();

const passthroughUnwrapper: UnwrapFn = (value) => value;

export function registerUnwrapper(platform: string, fn: UnwrapFn): void {
	registry.set(platform, fn);
}

export function getUnwrapper(platform: string): UnwrapFn {
	return registry.get(platform) ?? passthroughUnwrapper;
}

/** Reset registry — for testing only. */
export function clearUnwrapperRegistry(): void {
	registry.clear();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/server && npx vitest run src/shared-kernel/infrastructure/connectors/registries/value-unwrapper.registry.spec.ts`
Expected: 3 tests PASS.

- [ ] **Step 5: Write test for Amazon unwrapper**

Add to the same spec file:

```typescript
describe("Amazon unwrapper", () => {
	beforeEach(async () => {
		clearUnwrapperRegistry();
		// Trigger self-registration
		await import("../amazon/amazon-value-unwrapper");
	});

	it("unwraps Amazon [{value, language_tag}] format", () => {
		const unwrap = getUnwrapper("amazon");
		expect(unwrap([{ value: "Widget", language_tag: "en_US" }], "item_name")).toBe("Widget");
	});

	it("unwraps Amazon unit value format", () => {
		const unwrap = getUnwrapper("amazon");
		expect(unwrap([{ value: 0.65, unit: "pounds" }], "weight")).toEqual({
			value: 0.65,
			unit: "pounds",
		});
	});

	it("passes through non-Amazon formats", () => {
		const unwrap = getUnwrapper("amazon");
		expect(unwrap("plain string", "key")).toBe("plain string");
		expect(unwrap(42, "key")).toBe(42);
	});

	it("handles empty array", () => {
		const unwrap = getUnwrapper("amazon");
		expect(unwrap([], "key")).toBeUndefined();
	});

	it("handles array of primitives", () => {
		const unwrap = getUnwrapper("amazon");
		expect(unwrap(["a", "b", "c"], "key")).toEqual(["a", "b", "c"]);
	});
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `cd apps/server && npx vitest run src/shared-kernel/infrastructure/connectors/registries/value-unwrapper.registry.spec.ts`
Expected: FAIL — amazon-value-unwrapper module not found.

- [ ] **Step 7: Create Amazon value unwrapper (extract from MappingEngine)**

Create `apps/server/src/shared-kernel/infrastructure/connectors/amazon/amazon-value-unwrapper.ts`:

```typescript
import { registerUnwrapper } from "../registries/value-unwrapper.registry";

/**
 * Amazon wraps most values as: [{ value: "actual_value", language_tag: "en_US" }]
 * This unwrapper extracts the actual value.
 *
 * Extracted from MappingEngine.resolveAmazonValue() to decouple
 * platform-specific unwrapping from the generic mapping engine.
 */
registerUnwrapper("amazon", (rawValue: unknown, _key: string): unknown => {
	if (Array.isArray(rawValue)) {
		if (rawValue.length === 0) return undefined;

		const first = rawValue[0];
		if (first && typeof first === "object" && "value" in first) {
			const obj = first as Record<string, unknown>;
			// Unit value: { value: 0.65, unit: "pounds" }
			if ("unit" in obj) {
				return { value: obj.value, unit: obj.unit };
			}
			return obj.value;
		}

		// Array of primitives
		if (typeof rawValue[0] === "string" || typeof rawValue[0] === "number") {
			return rawValue;
		}

		return rawValue;
	}

	return rawValue;
});
```

- [ ] **Step 8: Run test to verify it passes**

Run: `cd apps/server && npx vitest run src/shared-kernel/infrastructure/connectors/registries/value-unwrapper.registry.spec.ts`
Expected: 8 tests PASS.

- [ ] **Step 9: Export from connectors/index.ts**

Add to `apps/server/src/shared-kernel/infrastructure/connectors/index.ts`:

```typescript
// ─── Registries ─────────────────────────────────────────────────────────────
// Trigger Amazon unwrapper self-registration
import "./amazon/amazon-value-unwrapper";

export {
	clearUnwrapperRegistry,
	getUnwrapper,
	registerUnwrapper,
} from "./registries/value-unwrapper.registry";
export type { UnwrapFn } from "./registries/value-unwrapper.registry";
```

- [ ] **Step 10: Commit**

```bash
git add apps/server/src/shared-kernel/infrastructure/connectors/registries/ apps/server/src/shared-kernel/infrastructure/connectors/amazon/amazon-value-unwrapper.ts apps/server/src/shared-kernel/infrastructure/connectors/index.ts
git commit -m "feat(connectors): add ValueUnwrapperRegistry and extract Amazon unwrapper"
```

---

## Task 3: PayloadBuilderRegistry + Amazon registration

**Files:**
- Create: `apps/server/src/shared-kernel/infrastructure/connectors/registries/payload-builder.registry.ts`
- Create: `apps/server/src/shared-kernel/infrastructure/connectors/registries/payload-builder.registry.spec.ts`
- Modify: `apps/server/src/shared-kernel/infrastructure/connectors/amazon/amazon-payload-builder.ts`
- Modify: `apps/server/src/shared-kernel/infrastructure/connectors/index.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/server/src/shared-kernel/infrastructure/connectors/registries/payload-builder.registry.spec.ts`:

```typescript
import { describe, expect, it, beforeEach } from "vitest";
import {
	registerPayloadBuilder,
	getPayloadBuilder,
	clearPayloadBuilderRegistry,
} from "./payload-builder.registry";
import type { IPayloadBuilder } from "./payload-builder.registry";

describe("PayloadBuilderRegistry", () => {
	beforeEach(() => {
		clearPayloadBuilderRegistry();
	});

	it("returns undefined for unknown platform", () => {
		expect(getPayloadBuilder("unknown")).toBeUndefined();
	});

	it("returns registered builder for known platform", () => {
		const mockBuilder: IPayloadBuilder = {
			buildListingPayload: vi.fn(),
			buildPatchPayload: vi.fn(),
		};
		registerPayloadBuilder("test", mockBuilder);
		expect(getPayloadBuilder("test")).toBe(mockBuilder);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/server && npx vitest run src/shared-kernel/infrastructure/connectors/registries/payload-builder.registry.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create PayloadBuilderRegistry**

Create `apps/server/src/shared-kernel/infrastructure/connectors/registries/payload-builder.registry.ts`:

```typescript
export interface ChannelContext {
	marketplaceId: string;
	languageTag: string;
	sellerId: string;
}

export interface IPayloadBuilder {
	buildListingPayload(
		productType: string,
		pimValues: Record<string, unknown>,
		channelContext: ChannelContext,
	): { productType: string; requirements: string; attributes: Record<string, unknown> };

	buildPatchPayload(
		productType: string,
		updates: Record<string, unknown>,
		channelContext: ChannelContext,
	): { productType: string; patches: Array<{ op: string; path: string; value: unknown }> };
}

const registry = new Map<string, IPayloadBuilder>();

export function registerPayloadBuilder(
	platform: string,
	builder: IPayloadBuilder,
): void {
	registry.set(platform, builder);
}

export function getPayloadBuilder(
	platform: string,
): IPayloadBuilder | undefined {
	return registry.get(platform);
}

/** Reset registry — for testing only. */
export function clearPayloadBuilderRegistry(): void {
	registry.clear();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/server && npx vitest run src/shared-kernel/infrastructure/connectors/registries/payload-builder.registry.spec.ts`
Expected: 2 tests PASS.

- [ ] **Step 5: Register AmazonPayloadBuilder in the registry**

Append at the bottom of `apps/server/src/shared-kernel/infrastructure/connectors/amazon/amazon-payload-builder.ts` (after the class closing brace):

```typescript
import { registerPayloadBuilder } from "../registries/payload-builder.registry";
import type { ChannelContext } from "../registries/payload-builder.registry";

// Self-register Amazon payload builder
registerPayloadBuilder("amazon", {
	buildListingPayload(
		productType: string,
		pimValues: Record<string, unknown>,
		channelContext: ChannelContext,
	) {
		return AmazonPayloadBuilder.buildProductPayload(
			{
				marketplaceId: channelContext.marketplaceId,
				languageTag: "ja_JP", // TODO: derive from marketplace
				listingMode: "new_product",
				productType,
			},
			pimValues,
			{},
			[],
		);
	},
	buildPatchPayload(
		productType: string,
		updates: Record<string, unknown>,
		channelContext: ChannelContext,
	) {
		return AmazonPayloadBuilder.buildPatchPayload(
			productType,
			updates,
			channelContext.marketplaceId,
			"ja_JP",
		);
	},
});
```

Note: The import for `registerPayloadBuilder` goes at the top of the file with other imports. The self-registration block goes at the bottom.

- [ ] **Step 6: Export from connectors/index.ts**

Add to the Registries section in `connectors/index.ts`:

```typescript
export {
	clearPayloadBuilderRegistry,
	getPayloadBuilder,
	registerPayloadBuilder,
} from "./registries/payload-builder.registry";
export type {
	ChannelContext,
	IPayloadBuilder,
} from "./registries/payload-builder.registry";
```

- [ ] **Step 7: Run full test suite**

Run: `cd apps/server && npx vitest run`
Expected: All existing tests still pass. New tests pass.

- [ ] **Step 8: Commit**

```bash
git add apps/server/src/shared-kernel/infrastructure/connectors/registries/payload-builder.registry.ts apps/server/src/shared-kernel/infrastructure/connectors/registries/payload-builder.registry.spec.ts apps/server/src/shared-kernel/infrastructure/connectors/amazon/amazon-payload-builder.ts apps/server/src/shared-kernel/infrastructure/connectors/index.ts
git commit -m "feat(connectors): add PayloadBuilderRegistry and register AmazonPayloadBuilder"
```

---

## Task 4: MappingEngine platform-aware unwrapping

**Files:**
- Modify: `apps/server/src/towers/pm/listings/mapping-engine.ts`
- Modify: `apps/server/src/towers/pm/listings/mapping-engine.spec.ts`

- [ ] **Step 1: Write the failing test for platform parameter**

Add to `apps/server/src/towers/pm/listings/mapping-engine.spec.ts`:

```typescript
describe("platform-aware unwrapping", () => {
	it("defaults to Amazon unwrapping when platform is omitted", () => {
		const mappings: AttributeMapping[] = [
			{
				sourceAttributeCode: "product_name",
				targetAttributePath: "item_name",
				mappingType: "direct",
			},
		];
		const rawData = {
			item_name: [{ value: "Matcha Tea", language_tag: "en_US" }],
		};

		const result = MappingEngine.apply(rawData, mappings);
		expect(result.pimValues.product_name).toEqual({ default: "Matcha Tea" });
	});

	it("uses passthrough unwrapper for rakuten_public platform", () => {
		const mappings: AttributeMapping[] = [
			{
				sourceAttributeCode: "product_name",
				targetAttributePath: "itemName",
				mappingType: "direct",
			},
		];
		const rawData = {
			itemName: "Matcha Tea",
		};

		const result = MappingEngine.apply(rawData, mappings, "rakuten_public");
		expect(result.pimValues.product_name).toEqual({ default: "Matcha Tea" });
	});

	it("still unwraps Amazon format when platform is 'amazon'", () => {
		const mappings: AttributeMapping[] = [
			{
				sourceAttributeCode: "product_name",
				targetAttributePath: "item_name",
				mappingType: "direct",
			},
		];
		const rawData = {
			item_name: [{ value: "Matcha Tea", language_tag: "en_US" }],
		};

		const result = MappingEngine.apply(rawData, mappings, "amazon");
		expect(result.pimValues.product_name).toEqual({ default: "Matcha Tea" });
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/server && npx vitest run src/towers/pm/listings/mapping-engine.spec.ts`
Expected: FAIL — `MappingEngine.apply` doesn't accept 3rd argument (TypeScript error or wrong behavior for rakuten_public test).

- [ ] **Step 3: Modify MappingEngine.apply to accept platform parameter**

In `apps/server/src/towers/pm/listings/mapping-engine.ts`, make these changes:

Add import at top of file:

```typescript
import { getUnwrapper } from "@shared-kernel/infrastructure/connectors";
```

Change the `apply` method signature (line 30-33) from:

```typescript
static apply(
	rawData: Record<string, unknown>,
	mappings: AttributeMapping[],
): MappingResult {
```

To:

```typescript
static apply(
	rawData: Record<string, unknown>,
	mappings: AttributeMapping[],
	platform?: string,
): MappingResult {
```

Replace the line (line 56):

```typescript
const resolved = resolveAmazonValue(rawValue);
```

With:

```typescript
const unwrap = getUnwrapper(platform ?? "amazon");
const resolved = unwrap(rawValue, mapping.targetAttributePath);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/server && npx vitest run src/towers/pm/listings/mapping-engine.spec.ts`
Expected: All tests PASS (existing + new).

- [ ] **Step 5: Verify the old resolveAmazonValue function is now unused**

The `resolveAmazonValue` function (lines 117-141) in `mapping-engine.ts` is now replaced by the Amazon unwrapper in `amazon-value-unwrapper.ts`. Remove the function and its comment block (lines 113-141). The `extractValueFromPath` and `applyTransform` helpers stay.

- [ ] **Step 6: Run full test suite**

Run: `cd apps/server && npx vitest run`
Expected: All tests pass. No regressions — existing callers of `MappingEngine.apply(raw, mappings)` still work because `platform` defaults to `"amazon"`.

- [ ] **Step 7: Commit**

```bash
git add apps/server/src/towers/pm/listings/mapping-engine.ts apps/server/src/towers/pm/listings/mapping-engine.spec.ts
git commit -m "refactor(mapping): replace hardcoded Amazon unwrapping with platform-aware ValueUnwrapperRegistry"
```

---

## Task 5: Move ConnectorRegistry to registries/ directory

**Files:**
- Move: `apps/server/src/shared-kernel/infrastructure/connectors/connector.registry.ts` → `apps/server/src/shared-kernel/infrastructure/connectors/registries/connector.registry.ts`
- Modify: `apps/server/src/shared-kernel/infrastructure/connectors/connector.factory.ts` (update import)
- Modify: `apps/server/src/shared-kernel/infrastructure/connectors/amazon/amazon.connector.ts` (update import)
- Modify: `apps/server/src/shared-kernel/infrastructure/connectors/index.ts` (update re-export)

- [ ] **Step 1: Move the file**

```bash
mkdir -p apps/server/src/shared-kernel/infrastructure/connectors/registries
mv apps/server/src/shared-kernel/infrastructure/connectors/connector.registry.ts apps/server/src/shared-kernel/infrastructure/connectors/registries/connector.registry.ts
```

Note: The `registries/` directory may already exist from Task 2. The `mkdir -p` is safe in that case.

- [ ] **Step 2: Update import in connector.factory.ts**

In `apps/server/src/shared-kernel/infrastructure/connectors/connector.factory.ts`, change line 7:

```typescript
// FROM
import { getConnectorClass, getSupportedPlatforms } from "./connector.registry";
// TO
import { getConnectorClass, getSupportedPlatforms } from "./registries/connector.registry";
```

- [ ] **Step 3: Update import in amazon.connector.ts**

In `apps/server/src/shared-kernel/infrastructure/connectors/amazon/amazon.connector.ts`, change line 19:

```typescript
// FROM
import { registerConnector } from "../connector.registry";
// TO
import { registerConnector } from "../registries/connector.registry";
```

- [ ] **Step 4: Update re-export in connectors/index.ts**

Change the connector registry export (around line 71-76):

```typescript
// FROM
export {
	clearRegistry,
	getConnectorClass,
	getSupportedPlatforms,
	registerConnector,
} from "./connector.registry";
// TO
export {
	clearRegistry,
	getConnectorClass,
	getSupportedPlatforms,
	registerConnector,
} from "./registries/connector.registry";
```

- [ ] **Step 5: Run full test suite**

Run: `cd apps/server && npx vitest run`
Expected: All tests pass. This is a pure move with import updates — no logic changes.

- [ ] **Step 6: Commit**

```bash
git add -A apps/server/src/shared-kernel/infrastructure/connectors/
git commit -m "refactor(connectors): move ConnectorRegistry to registries/ directory"
```

---

## Task 6: RakutenPublicConnector — types, client, and connector

**Files:**
- Create: `apps/server/src/shared-kernel/infrastructure/connectors/rakuten-public/rakuten-public.types.ts`
- Create: `apps/server/src/shared-kernel/infrastructure/connectors/rakuten-public/rakuten-public.client.ts`
- Create: `apps/server/src/shared-kernel/infrastructure/connectors/rakuten-public/rakuten-public.connector.ts`
- Create: `apps/server/src/shared-kernel/infrastructure/connectors/rakuten-public/rakuten-public-value-unwrapper.ts`
- Create: `apps/server/src/shared-kernel/infrastructure/connectors/rakuten-public/index.ts`
- Create: `apps/server/src/shared-kernel/infrastructure/connectors/rakuten-public/rakuten-public.connector.spec.ts`
- Modify: `apps/server/src/shared-kernel/infrastructure/connectors/connectors.module.ts`
- Modify: `apps/server/src/shared-kernel/infrastructure/connectors/index.ts`

- [ ] **Step 1: Create Rakuten API response types**

Create `apps/server/src/shared-kernel/infrastructure/connectors/rakuten-public/rakuten-public.types.ts`:

```typescript
/** Rakuten Ichiba Item Search API response (formatVersion=2) */
export interface RakutenItemSearchResponse {
	count: number;
	page: number;
	first: number;
	last: number;
	hits: number;
	pageCount: number;
	Items: RakutenItem[];
}

export interface RakutenItem {
	itemName: string;
	catchcopy?: string;
	itemCode: string;
	itemPrice: number;
	itemCaption?: string;
	itemUrl: string;
	imageFlag: number;
	smallImageUrls: string[];
	mediumImageUrls: string[];
	availability: number;
	shopName: string;
	shopCode: string;
	shopUrl: string;
	genreId: string;
	reviewCount?: number;
	reviewAverage?: number;
	itemPriceMin1?: number;
	itemPriceMax1?: number;
}

/** Rakuten Product Search API response */
export interface RakutenProductSearchResponse {
	count: number;
	page: number;
	first: number;
	last: number;
	hits: number;
	pageCount: number;
	Products: RakutenProduct[];
}

export interface RakutenProduct {
	productId: string;
	productName: string;
	productCode?: string; // JAN code
	brandName?: string;
	makerCode?: string;
	makerName?: string;
	genreId: string;
	minPrice?: number;
	maxPrice?: number;
	averagePrice?: number;
	reviewCount?: number;
	reviewAverage?: number;
}
```

- [ ] **Step 2: Create RakutenPublicClient with rate limiter**

Create `apps/server/src/shared-kernel/infrastructure/connectors/rakuten-public/rakuten-public.client.ts`:

```typescript
import { Logger } from "@nestjs/common";

const BASE_URL = "https://openapi.rakuten.co.jp";
const MIN_REQUEST_INTERVAL_MS = 1000; // 1 req/s hard limit

export class RakutenPublicClient {
	private readonly logger = new Logger(RakutenPublicClient.name);
	private lastRequestAt = 0;

	constructor(
		private readonly applicationId: string,
		private readonly accessKey: string,
	) {}

	async itemSearch(params: Record<string, string>): Promise<unknown> {
		const url = new URL(
			`${BASE_URL}/ichibams/api/IchibaItem/Search/20220601`,
		);
		url.searchParams.set("applicationId", this.applicationId);
		url.searchParams.set("accessKey", this.accessKey);
		url.searchParams.set("formatVersion", "2");
		for (const [key, value] of Object.entries(params)) {
			url.searchParams.set(key, value);
		}
		return this.request(url);
	}

	async productSearch(params: Record<string, string>): Promise<unknown> {
		const url = new URL(
			`${BASE_URL}/ichibaproduct/api/Product/Search/20250801`,
		);
		url.searchParams.set("applicationId", this.applicationId);
		url.searchParams.set("accessKey", this.accessKey);
		url.searchParams.set("formatVersion", "2");
		for (const [key, value] of Object.entries(params)) {
			url.searchParams.set(key, value);
		}
		return this.request(url);
	}

	/** Simple health check — search with a known keyword */
	async healthCheck(): Promise<boolean> {
		try {
			await this.itemSearch({ keyword: "test", hits: "1" });
			return true;
		} catch {
			return false;
		}
	}

	private async request(url: URL): Promise<unknown> {
		await this.waitForRateLimit();

		const response = await fetch(url.toString());
		this.lastRequestAt = Date.now();

		if (!response.ok) {
			const text = await response.text().catch(() => "");
			throw new Error(
				`Rakuten API ${url.pathname} failed (${response.status}): ${text}`,
			);
		}

		return response.json();
	}

	private async waitForRateLimit(): Promise<void> {
		const elapsed = Date.now() - this.lastRequestAt;
		if (elapsed < MIN_REQUEST_INTERVAL_MS) {
			const waitMs = MIN_REQUEST_INTERVAL_MS - elapsed;
			this.logger.debug(`Rate limit: waiting ${waitMs}ms`);
			await new Promise((resolve) => setTimeout(resolve, waitMs));
		}
	}
}
```

- [ ] **Step 3: Create Rakuten value unwrapper (passthrough)**

Create `apps/server/src/shared-kernel/infrastructure/connectors/rakuten-public/rakuten-public-value-unwrapper.ts`:

```typescript
import { registerUnwrapper } from "../registries/value-unwrapper.registry";

// Rakuten returns flat values — no unwrapping needed
registerUnwrapper("rakuten_public", (rawValue: unknown) => rawValue);
```

- [ ] **Step 4: Write the failing test for RakutenPublicConnector**

Create `apps/server/src/shared-kernel/infrastructure/connectors/rakuten-public/rakuten-public.connector.spec.ts`:

```typescript
import { describe, expect, it, vi, beforeEach } from "vitest";
import { RakutenPublicConnector } from "./rakuten-public.connector";
import type { CatalogSearchQuery } from "../capabilities";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("RakutenPublicConnector", () => {
	let connector: RakutenPublicConnector;

	beforeEach(() => {
		vi.clearAllMocks();
		connector = RakutenPublicConnector.createFromConfig("test_app_id", "test_access_key");
	});

	it("has correct platform and capabilities", () => {
		expect(connector.platform).toBe("rakuten_public");
		expect(connector.capabilities.canSearchCatalog).toBe(true);
		expect(connector.capabilities.canPullListings).toBe(false);
		expect(connector.capabilities.canSubmitListings).toBe(false);
	});

	it("searches by keyword via Item Search API", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				count: 1,
				Items: [
					{
						itemName: "Matcha Tea",
						itemCode: "shop:12345",
						itemPrice: 3980,
						itemUrl: "https://item.rakuten.co.jp/shop/12345/",
						mediumImageUrls: ["https://img.rakuten.co.jp/128.jpg"],
						genreId: "551177",
						shopName: "Tea Shop",
						imageFlag: 1,
						smallImageUrls: [],
						availability: 1,
						shopCode: "shop",
						shopUrl: "",
					},
				],
			}),
		});

		const query: CatalogSearchQuery = {
			identifierType: "keyword",
			identifier: "matcha",
		};
		const result = await connector.searchCatalogItems(query);

		expect(result.items).toHaveLength(1);
		expect(result.items[0].title).toBe("Matcha Tea");
		expect(result.items[0].identifiers.platformItemCode).toBe("shop:12345");
		expect(result.items[0].variation.type).toBe("standalone");
		expect(result.items[0].images).toHaveLength(1);
		expect(result.items[0].attributes).toEqual(
			expect.objectContaining({ price: 3980 }),
		);
	});

	it("searches by JAN code via Product Search API", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				count: 1,
				Products: [
					{
						productId: "prod-001",
						productName: "Matcha Powder 100g",
						productCode: "4901234567890",
						makerName: "TeaCo",
						genreId: "551177",
						minPrice: 3500,
						maxPrice: 4200,
					},
				],
			}),
		});

		const query: CatalogSearchQuery = {
			identifierType: "JAN",
			identifier: "4901234567890",
		};
		const result = await connector.searchCatalogItems(query);

		expect(result.items).toHaveLength(1);
		expect(result.items[0].title).toBe("Matcha Powder 100g");
		expect(result.items[0].identifiers.jan).toBe("4901234567890");
		expect(result.items[0].variation.type).toBe("standalone");
		expect(result.items[0].attributes).toEqual(
			expect.objectContaining({ manufacturer: "TeaCo" }),
		);
	});

	it("returns empty items for unsupported identifier type", async () => {
		const query: CatalogSearchQuery = {
			identifierType: "ASIN",
			identifier: "B001234",
		};
		const result = await connector.searchCatalogItems(query);
		expect(result.items).toEqual([]);
	});
});
```

- [ ] **Step 5: Run test to verify it fails**

Run: `cd apps/server && npx vitest run src/shared-kernel/infrastructure/connectors/rakuten-public/rakuten-public.connector.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 6: Create RakutenPublicConnector**

Create `apps/server/src/shared-kernel/infrastructure/connectors/rakuten-public/rakuten-public.connector.ts`:

```typescript
import type {
	CatalogSearchItem,
	CatalogSearchQuery,
	CatalogSearchResult,
	ICatalogSearchable,
} from "../capabilities/catalog.capability";
import type { IChannelConnector } from "../connector.interface";
import { RakutenPublicClient } from "./rakuten-public.client";
import type {
	RakutenItem,
	RakutenItemSearchResponse,
	RakutenProduct,
	RakutenProductSearchResponse,
} from "./rakuten-public.types";

const JAN_IDENTIFIER_TYPES = new Set(["JAN", "EAN", "GTIN"]);

export class RakutenPublicConnector
	implements IChannelConnector, ICatalogSearchable
{
	readonly platform = "rakuten_public";
	readonly capabilities = {
		canSearchCatalog: true,
		canPullListings: false,
		canCheckRestrictions: false,
		canSearchProductTypes: false,
		canSubmitListings: false,
		canSyncInventory: false,
		canPullOrders: false,
		canTrackFulfillment: false,
	};

	private readonly client: RakutenPublicClient;

	private constructor(applicationId: string, accessKey: string) {
		this.client = new RakutenPublicClient(applicationId, accessKey);
	}

	static createFromConfig(
		applicationId: string,
		accessKey: string,
	): RakutenPublicConnector {
		return new RakutenPublicConnector(applicationId, accessKey);
	}

	async validateCredentials(): Promise<boolean> {
		return this.client.healthCheck();
	}

	async searchCatalogItems(
		query: CatalogSearchQuery,
	): Promise<CatalogSearchResult> {
		if (JAN_IDENTIFIER_TYPES.has(query.identifierType.toUpperCase())) {
			return this.searchByProductCode(query.identifier);
		}

		if (query.identifierType === "keyword") {
			return this.searchByKeyword(query.identifier);
		}

		// Unsupported identifier type — return empty results, not error
		return { items: [] };
	}

	private async searchByKeyword(
		keyword: string,
	): Promise<CatalogSearchResult> {
		const data = (await this.client.itemSearch({
			keyword,
			hits: "30",
			imageFlag: "1",
		})) as RakutenItemSearchResponse;

		return {
			items: (data.Items || []).map((item) => this.mapItem(item)),
		};
	}

	private async searchByProductCode(
		productCode: string,
	): Promise<CatalogSearchResult> {
		const data = (await this.client.productSearch({
			productCode,
		})) as RakutenProductSearchResponse;

		return {
			items: (data.Products || []).map((product) =>
				this.mapProduct(product),
			),
		};
	}

	private mapItem(item: RakutenItem): CatalogSearchItem {
		return {
			title: item.itemName,
			identifiers: {
				platformItemCode: item.itemCode,
			},
			externalUrl: item.itemUrl,
			images: (item.mediumImageUrls || []).map((url) => ({
				link: url,
				width: 128,
				height: 128,
				variant: "medium" as const,
			})),
			classifications: item.genreId
				? [{ id: item.genreId, name: item.genreId }]
				: [],
			variation: { type: "standalone" as const },
			attributes: {
				price: item.itemPrice,
				shopName: item.shopName,
				shopCode: item.shopCode,
				reviewCount: item.reviewCount,
				reviewAverage: item.reviewAverage,
			},
		};
	}

	private mapProduct(product: RakutenProduct): CatalogSearchItem {
		return {
			title: product.productName,
			identifiers: {
				jan: product.productCode,
				platformItemCode: product.productId,
			},
			images: [],
			classifications: product.genreId
				? [{ id: product.genreId, name: product.genreId }]
				: [],
			variation: { type: "standalone" as const },
			attributes: {
				manufacturer: product.makerName,
				minPrice: product.minPrice,
				maxPrice: product.maxPrice,
				averagePrice: product.averagePrice,
				brandName: product.brandName,
			},
		};
	}
}
```

- [ ] **Step 7: Create index.ts barrel export**

Create `apps/server/src/shared-kernel/infrastructure/connectors/rakuten-public/index.ts`:

```typescript
export { RakutenPublicConnector } from "./rakuten-public.connector";
export { RakutenPublicClient } from "./rakuten-public.client";
export type {
	RakutenItem,
	RakutenItemSearchResponse,
	RakutenProduct,
	RakutenProductSearchResponse,
} from "./rakuten-public.types";
```

- [ ] **Step 8: Run test to verify it passes**

Run: `cd apps/server && npx vitest run src/shared-kernel/infrastructure/connectors/rakuten-public/rakuten-public.connector.spec.ts`
Expected: 4 tests PASS.

- [ ] **Step 9: Register as system singleton in ConnectorsModule**

Modify `apps/server/src/shared-kernel/infrastructure/connectors/connectors.module.ts`:

```typescript
import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ConnectorFactory } from "./connector.factory";
import { RakutenPublicConnector } from "./rakuten-public/rakuten-public.connector";

export const RAKUTEN_PUBLIC_CONNECTOR = Symbol("RAKUTEN_PUBLIC_CONNECTOR");

@Global()
@Module({
	providers: [
		ConnectorFactory,
		{
			provide: RAKUTEN_PUBLIC_CONNECTOR,
			useFactory: (config: ConfigService) => {
				const appId = config.get<string>("RAKUTEN_APP_ID");
				const accessKey = config.get<string>("RAKUTEN_ACCESS_KEY");
				if (!appId || !accessKey) return null;
				return RakutenPublicConnector.createFromConfig(appId, accessKey);
			},
			inject: [ConfigService],
		},
	],
	exports: [ConnectorFactory, RAKUTEN_PUBLIC_CONNECTOR],
})
export class ConnectorsModule {}
```

- [ ] **Step 10: Export from connectors/index.ts**

Add to `apps/server/src/shared-kernel/infrastructure/connectors/index.ts`:

```typescript
// Trigger Rakuten Public unwrapper self-registration
import "./rakuten-public/rakuten-public-value-unwrapper";

export { RakutenPublicConnector } from "./rakuten-public";
export { RAKUTEN_PUBLIC_CONNECTOR } from "./connectors.module";
```

- [ ] **Step 11: Run full test suite**

Run: `cd apps/server && npx vitest run`
Expected: All tests pass.

- [ ] **Step 12: Commit**

```bash
git add apps/server/src/shared-kernel/infrastructure/connectors/rakuten-public/ apps/server/src/shared-kernel/infrastructure/connectors/connectors.module.ts apps/server/src/shared-kernel/infrastructure/connectors/index.ts
git commit -m "feat(connectors): add RakutenPublicConnector as system-level singleton for public catalog search"
```

---

## Task 7: CatalogResolutionStrategy + types

**Files:**
- Create: `apps/server/src/towers/pm/catalog/catalog-resolution.types.ts`
- Create: `apps/server/src/towers/pm/catalog/catalog-resolution.strategy.ts`
- Create: `apps/server/src/towers/pm/catalog/catalog-resolution.strategy.spec.ts`

- [ ] **Step 1: Create catalog resolution types**

Create `apps/server/src/towers/pm/catalog/catalog-resolution.types.ts`:

```typescript
import type { CatalogSearchItem, CatalogSearchQuery } from "@shared-kernel/infrastructure/connectors";

export interface CatalogSource {
	id: string;
	label: string;
	platform: string;
	icon: string;
	isDefault: boolean;
	isSystemLevel: boolean;
}

export interface CatalogSearchRequest {
	source: string;
	query: CatalogSearchQuery;
	organizationId: string;
}

export interface CatalogSearchResponse {
	source: string;
	platform: string;
	totalCount: number;
	items: CatalogSearchItem[];
	error?: string;
	message?: string;
	suggestFallback?: string | null;
}
```

- [ ] **Step 2: Write the failing test for CatalogResolutionStrategy**

Create `apps/server/src/towers/pm/catalog/catalog-resolution.strategy.spec.ts`:

```typescript
import { BadRequestException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import {
	ConnectorFactory,
	RAKUTEN_PUBLIC_CONNECTOR,
} from "@shared-kernel/infrastructure/connectors";
import { RequestContextFacade } from "@shared-kernel/infrastructure/context";
import { DB_TOKEN } from "@shared-kernel/infrastructure/db/db.port";
import {
	createDbMock,
	createRequestContextFacadeMock,
} from "../../__test-utils__";
import { CatalogResolutionStrategy } from "./catalog-resolution.strategy";

describe("CatalogResolutionStrategy", () => {
	let strategy: CatalogResolutionStrategy;
	let db: ReturnType<typeof createDbMock>;
	let ctx: ReturnType<typeof createRequestContextFacadeMock>;
	let mockConnectorFactory: { create: ReturnType<typeof vi.fn> };
	let mockRakutenPublic: {
		platform: string;
		capabilities: Record<string, boolean>;
		searchCatalogItems: ReturnType<typeof vi.fn>;
	} | null;

	const orgId = "org-123";

	beforeEach(async () => {
		db = createDbMock();
		ctx = createRequestContextFacadeMock();
		mockConnectorFactory = { create: vi.fn() };
		mockRakutenPublic = {
			platform: "rakuten_public",
			capabilities: { canSearchCatalog: true },
			searchCatalogItems: vi.fn().mockResolvedValue({
				items: [{ title: "Rakuten Item", identifiers: {}, images: [], classifications: [], variation: { type: "standalone" }, attributes: {} }],
			}),
		};

		const module = await Test.createTestingModule({
			providers: [
				CatalogResolutionStrategy,
				{ provide: DB_TOKEN, useValue: db },
				{ provide: RequestContextFacade, useValue: ctx },
				{ provide: ConnectorFactory, useValue: mockConnectorFactory },
				{ provide: RAKUTEN_PUBLIC_CONNECTOR, useValue: mockRakutenPublic },
			],
		}).compile();

		strategy = module.get(CatalogResolutionStrategy);
	});

	describe("getAvailableSources", () => {
		it("returns Rakuten Public as default when configured", async () => {
			db.select.mockReturnValue({
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockResolvedValue([]),
			});

			const sources = await strategy.getAvailableSources(orgId);
			expect(sources[0]).toEqual(
				expect.objectContaining({
					id: "rakuten_public",
					isDefault: true,
					isSystemLevel: true,
				}),
			);
		});

		it("includes seller channels with catalog search capability", async () => {
			db.select.mockReturnValue({
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockResolvedValue([
					{ id: "ch-1", name: "Amazon JP", platform: "amazon", settings: {} },
				]),
			});

			const mockConnector = {
				platform: "amazon",
				capabilities: { canSearchCatalog: true },
			};
			mockConnectorFactory.create.mockReturnValue(mockConnector);

			const sources = await strategy.getAvailableSources(orgId);
			expect(sources).toHaveLength(2);
			expect(sources[1]).toEqual(
				expect.objectContaining({
					id: "ch-1",
					label: "Amazon JP",
					platform: "amazon",
					isDefault: false,
				}),
			);
		});

		it("filters out channels without catalog search", async () => {
			db.select.mockReturnValue({
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockResolvedValue([
					{ id: "ch-1", name: "Shopee VN", platform: "shopee", settings: {} },
				]),
			});

			const mockConnector = {
				platform: "shopee",
				capabilities: { canSearchCatalog: false },
			};
			mockConnectorFactory.create.mockReturnValue(mockConnector);

			const sources = await strategy.getAvailableSources(orgId);
			expect(sources).toHaveLength(1); // Only Rakuten Public
		});
	});

	describe("search", () => {
		it("routes to RakutenPublic when source is rakuten_public", async () => {
			const result = await strategy.search({
				source: "rakuten_public",
				query: { identifierType: "keyword", identifier: "matcha" },
				organizationId: orgId,
			});

			expect(mockRakutenPublic!.searchCatalogItems).toHaveBeenCalled();
			expect(result.source).toBe("rakuten_public");
			expect(result.platform).toBe("rakuten_public");
			expect(result.items).toHaveLength(1);
		});

		it("routes to channel connector when source is channelId", async () => {
			db.select.mockReturnValue({
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				limit: vi.fn().mockResolvedValue([
					{ id: "ch-1", platform: "amazon", settings: {}, organizationId: orgId },
				]),
			});

			const mockConnector = {
				platform: "amazon",
				capabilities: { canSearchCatalog: true },
				searchCatalogItems: vi.fn().mockResolvedValue({
					items: [{ title: "Amazon Item" }],
				}),
			};
			mockConnectorFactory.create.mockReturnValue(mockConnector);

			const result = await strategy.search({
				source: "ch-1",
				query: { identifierType: "ASIN", identifier: "B001" },
				organizationId: orgId,
			});

			expect(mockConnector.searchCatalogItems).toHaveBeenCalled();
			expect(result.source).toBe("ch-1");
			expect(result.platform).toBe("amazon");
		});

		it("returns fallback suggestion on 403 auth error", async () => {
			db.select.mockReturnValue({
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				limit: vi.fn().mockResolvedValue([
					{ id: "ch-1", platform: "amazon", settings: {}, organizationId: orgId },
				]),
			});

			const mockConnector = {
				platform: "amazon",
				capabilities: { canSearchCatalog: true },
				searchCatalogItems: vi.fn().mockRejectedValue(new Error("SP-API GET /catalog failed (403): Forbidden")),
			};
			mockConnectorFactory.create.mockReturnValue(mockConnector);

			const result = await strategy.search({
				source: "ch-1",
				query: { identifierType: "keyword", identifier: "tea" },
				organizationId: orgId,
			});

			expect(result.error).toBe("catalog_auth_required");
			expect(result.suggestFallback).toBe("rakuten_public");
			expect(result.items).toEqual([]);
		});

		it("throws BadRequestException when Rakuten not configured", async () => {
			// Recreate with null Rakuten
			const module = await Test.createTestingModule({
				providers: [
					CatalogResolutionStrategy,
					{ provide: DB_TOKEN, useValue: db },
					{ provide: RequestContextFacade, useValue: ctx },
					{ provide: ConnectorFactory, useValue: mockConnectorFactory },
					{ provide: RAKUTEN_PUBLIC_CONNECTOR, useValue: null },
				],
			}).compile();
			const strategyNoRakuten = module.get(CatalogResolutionStrategy);

			await expect(
				strategyNoRakuten.search({
					source: "rakuten_public",
					query: { identifierType: "keyword", identifier: "tea" },
					organizationId: orgId,
				}),
			).rejects.toThrow(BadRequestException);
		});
	});
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd apps/server && npx vitest run src/towers/pm/catalog/catalog-resolution.strategy.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Create CatalogResolutionStrategy**

Create `apps/server/src/towers/pm/catalog/catalog-resolution.strategy.ts`:

```typescript
import { and, eq } from "@ech/database/orm";
import { channels } from "@ech/database/schemas";
import {
	BadRequestException,
	Inject,
	Injectable,
	Logger,
	NotFoundException,
} from "@nestjs/common";
import {
	ConnectorFactory,
	isCatalogSearchable,
	RAKUTEN_PUBLIC_CONNECTOR,
} from "@shared-kernel/infrastructure/connectors";
import type { RakutenPublicConnector } from "@shared-kernel/infrastructure/connectors";
import { RequestContextFacade } from "@shared-kernel/infrastructure/context";
import type { DrizzleDb } from "@shared-kernel/infrastructure/db/db.port";
import { DB_TOKEN } from "@shared-kernel/infrastructure/db/db.port";
import { firstOrNull } from "@shared-kernel/infrastructure/utils";
import type {
	CatalogSearchRequest,
	CatalogSearchResponse,
	CatalogSource,
} from "./catalog-resolution.types";

@Injectable()
export class CatalogResolutionStrategy {
	private readonly logger = new Logger(CatalogResolutionStrategy.name);

	constructor(
		@Inject(DB_TOKEN) private readonly db: DrizzleDb,
		private readonly ctx: RequestContextFacade,
		private readonly connectorFactory: ConnectorFactory,
		@Inject(RAKUTEN_PUBLIC_CONNECTOR)
		private readonly rakutenPublic: RakutenPublicConnector | null,
	) {}

	async getAvailableSources(
		organizationId: string,
	): Promise<CatalogSource[]> {
		const sources: CatalogSource[] = [];

		// 1. System-level Rakuten Public (always first if configured)
		if (this.rakutenPublic) {
			sources.push({
				id: "rakuten_public",
				label: "Rakuten",
				platform: "rakuten_public",
				icon: "rakuten",
				isDefault: true,
				isSystemLevel: true,
			});
		}

		// 2. Seller channels with catalog search capability
		const sellerChannels = await this.db
			.select()
			.from(channels)
			.where(eq(channels.organizationId, organizationId));

		for (const ch of sellerChannels) {
			try {
				const connector = this.connectorFactory.create(
					ch.platform,
					ch.settings as Record<string, unknown>,
				);
				if (isCatalogSearchable(connector)) {
					sources.push({
						id: ch.id,
						label: ch.name,
						platform: ch.platform,
						icon: ch.platform,
						isDefault: false,
						isSystemLevel: false,
					});
				}
			} catch {
				// Skip channels with invalid/unsupported platforms
			}
		}

		return sources;
	}

	async search(request: CatalogSearchRequest): Promise<CatalogSearchResponse> {
		const { source, query, organizationId } = request;

		// Route 1: System-level Rakuten Public
		if (source === "rakuten_public") {
			if (!this.rakutenPublic) {
				throw new BadRequestException(
					"Rakuten Public catalog search is not configured",
				);
			}
			const result = await this.rakutenPublic.searchCatalogItems(query);
			return {
				source: "rakuten_public",
				platform: "rakuten_public",
				totalCount: result.items.length,
				items: result.items,
			};
		}

		// Route 2: Seller channel connector
		const channel = await this.db
			.select()
			.from(channels)
			.where(
				and(
					eq(channels.id, source),
					eq(channels.organizationId, organizationId),
				),
			)
			.limit(1)
			.then(firstOrNull);

		if (!channel) {
			throw new NotFoundException(`Channel '${source}' not found`);
		}

		const connector = this.connectorFactory.create(
			channel.platform,
			channel.settings as Record<string, unknown>,
		);

		if (!isCatalogSearchable(connector)) {
			throw new BadRequestException(
				`Platform '${channel.platform}' does not support catalog search`,
			);
		}

		try {
			const result = await connector.searchCatalogItems(query);
			return {
				source: channel.id,
				platform: channel.platform,
				totalCount: result.items.length,
				items: result.items,
			};
		} catch (error) {
			// Route 3: Auth error → suggest Rakuten fallback
			if (this.isAuthError(error)) {
				this.logger.warn(
					`Catalog search auth error for channel ${channel.id}: ${(error as Error).message}`,
				);
				return {
					source: channel.id,
					platform: channel.platform,
					totalCount: 0,
					items: [],
					error: "catalog_auth_required",
					message: "Seller account lacks catalog access",
					suggestFallback: this.rakutenPublic ? "rakuten_public" : null,
				};
			}
			throw error;
		}
	}

	private isAuthError(error: unknown): boolean {
		if (!(error instanceof Error)) return false;
		return (
			error.message.includes("(403)") ||
			error.message.includes("Forbidden") ||
			error.message.includes("Unauthorized")
		);
	}
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd apps/server && npx vitest run src/towers/pm/catalog/catalog-resolution.strategy.spec.ts`
Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/towers/pm/catalog/
git commit -m "feat(catalog): add CatalogResolutionStrategy with Rakuten fallback routing"
```

---

## Task 8: CatalogController + CatalogModule + wire into PM

**Files:**
- Create: `apps/server/src/towers/pm/catalog/catalog.controller.ts`
- Create: `apps/server/src/towers/pm/catalog/catalog.module.ts`
- Create: `apps/server/src/towers/pm/catalog/dto/catalog.dto.ts`
- Modify: `apps/server/src/towers/pm/pm.module.ts`

- [ ] **Step 1: Create catalog search DTO with Zod validation**

Create `apps/server/src/towers/pm/catalog/dto/catalog.dto.ts`:

```typescript
import { z } from "zod";

export const catalogSearchBodySchema = z.object({
	source: z.string().min(1),
	identifierType: z.string().min(1),
	identifier: z.string().min(1),
});

export type CatalogSearchBodyDto = z.infer<typeof catalogSearchBodySchema>;
```

- [ ] **Step 2: Create CatalogController**

Create `apps/server/src/towers/pm/catalog/catalog.controller.ts`:

```typescript
import {
	Body,
	Controller,
	Get,
	HttpCode,
	HttpStatus,
	Post,
} from "@nestjs/common";
import {
	ApiBody,
	ApiOperation,
	ApiResponse,
	ApiTags,
} from "@nestjs/swagger";
import { RequestContextFacade } from "@shared-kernel/infrastructure/context";
import { ZodValidationPipe } from "@shared-kernel/infrastructure/pipes/zod-validation.pipe";
import { CatalogResolutionStrategy } from "./catalog-resolution.strategy";
import {
	type CatalogSearchBodyDto,
	catalogSearchBodySchema,
} from "./dto/catalog.dto";

@ApiTags("Catalog")
@Controller("catalog")
export class CatalogController {
	constructor(
		private readonly strategy: CatalogResolutionStrategy,
		private readonly ctx: RequestContextFacade,
	) {}

	@Get("sources")
	@ApiOperation({ summary: "Get available catalog search sources" })
	@ApiResponse({ status: 200, description: "List of catalog sources" })
	getSources() {
		return this.strategy.getAvailableSources(this.ctx.getOrgId());
	}

	@Post("search")
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: "Search catalog across platforms" })
	@ApiBody({ description: "Search source and query" })
	@ApiResponse({ status: 200, description: "Unified catalog search results" })
	search(
		@Body(new ZodValidationPipe(catalogSearchBodySchema))
		dto: CatalogSearchBodyDto,
	) {
		return this.strategy.search({
			source: dto.source,
			query: {
				identifierType: dto.identifierType,
				identifier: dto.identifier,
			},
			organizationId: this.ctx.getOrgId(),
		});
	}
}
```

- [ ] **Step 3: Create CatalogModule**

Create `apps/server/src/towers/pm/catalog/catalog.module.ts`:

```typescript
import { Module } from "@nestjs/common";
import { CatalogController } from "./catalog.controller";
import { CatalogResolutionStrategy } from "./catalog-resolution.strategy";

@Module({
	controllers: [CatalogController],
	providers: [CatalogResolutionStrategy],
	exports: [CatalogResolutionStrategy],
})
export class CatalogModule {}
```

- [ ] **Step 4: Register CatalogModule in PmModule**

In `apps/server/src/towers/pm/pm.module.ts`, add import and register:

```typescript
import { CatalogModule } from "./catalog/catalog.module";
```

Add `CatalogModule` to the `imports` array (after `CategoriesModule`).

- [ ] **Step 5: Run TypeScript check**

Run: `cd apps/server && npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 6: Run full test suite**

Run: `cd apps/server && npx vitest run`
Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add apps/server/src/towers/pm/catalog/ apps/server/src/towers/pm/pm.module.ts
git commit -m "feat(catalog): add CatalogController with GET /sources and POST /search endpoints"
```

---

## Task 9: Wire CatalogBrowseService to delegate via CatalogResolutionStrategy

**Files:**
- Modify: `apps/server/src/towers/pm/listings/catalog-browse.service.ts`
- Modify: `apps/server/src/towers/pm/listings/listings.module.ts`

This wires the old `catalogSearch()` method to use the new strategy internally, maintaining backward compatibility for the existing `POST /channels/:channelId/catalog-search` endpoint.

- [ ] **Step 1: Add CatalogResolutionStrategy dependency to CatalogBrowseService**

In `apps/server/src/towers/pm/listings/catalog-browse.service.ts`, add import:

```typescript
import { CatalogResolutionStrategy } from "../catalog/catalog-resolution.strategy";
```

Add to constructor:

```typescript
constructor(
	@Inject(DB_TOKEN) private readonly db: DrizzleDb,
	private readonly ctx: RequestContextFacade,
	private readonly connectorFactory: ConnectorFactory,
	private readonly catalogResolver: CatalogResolutionStrategy,
) {}
```

- [ ] **Step 2: Update catalogSearch to delegate to strategy**

Replace the `catalogSearch` method (lines 46-66) with:

```typescript
async catalogSearch(channelId: string, dto: CatalogSearchDto) {
	const result = await this.catalogResolver.search({
		source: channelId,
		query: {
			identifierType: dto.identifierType,
			identifier: dto.identifier,
			marketplaceId: dto.marketplaceId,
		},
		organizationId: this.ctx.getOrgId(),
	});
	// Return items only for backward compatibility with existing endpoint
	return { items: result.items };
}
```

- [ ] **Step 3: Update ListingsModule to import CatalogModule**

In `apps/server/src/towers/pm/listings/listings.module.ts`, add:

```typescript
import { CatalogModule } from "../catalog/catalog.module";
```

Add `CatalogModule` to the `imports` array of `@Module()`.

- [ ] **Step 4: Update CatalogBrowseService tests**

In `apps/server/src/towers/pm/listings/catalog-browse.service.spec.ts`, add mock for `CatalogResolutionStrategy` to the test module providers:

```typescript
import { CatalogResolutionStrategy } from "../catalog/catalog-resolution.strategy";

// In beforeEach:
const mockCatalogResolver = {
	search: vi.fn().mockResolvedValue({
		source: "ch-1",
		platform: "amazon",
		totalCount: 1,
		items: [{ asin: "B001" }],
	}),
};

// In TestingModule providers:
{ provide: CatalogResolutionStrategy, useValue: mockCatalogResolver },
```

- [ ] **Step 5: Run tests**

Run: `cd apps/server && npx vitest run src/towers/pm/listings/catalog-browse.service.spec.ts`
Expected: All tests PASS.

- [ ] **Step 6: Run full test suite**

Run: `cd apps/server && npx vitest run`
Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add apps/server/src/towers/pm/listings/catalog-browse.service.ts apps/server/src/towers/pm/listings/catalog-browse.service.spec.ts apps/server/src/towers/pm/listings/listings.module.ts
git commit -m "refactor(catalog): delegate CatalogBrowseService.catalogSearch to CatalogResolutionStrategy"
```

---

## Task 10: Platform-agnostic family naming in ListingsImportService

**Files:**
- Modify: `apps/server/src/towers/pm/listings/listings-import.service.ts`
- Modify: `apps/server/src/towers/pm/listings/listings-import.service.spec.ts`

- [ ] **Step 1: Find and replace amz_ prefix pattern**

In `apps/server/src/towers/pm/listings/listings-import.service.ts`, there are 3 occurrences to change:

Line 185 — variant code:
```typescript
// FROM
const variantCode = `amz_${variationTheme.sort().join("_")}`;
// TO
const variantCode = `${platform}_${variationTheme.sort().join("_")}`;
```

Line 293 — family code guess (pre-fetch phase):
```typescript
// FROM
const familyCodeGuess = `amz_${productTypeHint.toLowerCase()}`;
// TO
const familyCodeGuess = `${channel.platform}_${productTypeHint.toLowerCase()}`;
```

Line 426 — family code guess (processing phase):
```typescript
// FROM
const familyCodeGuess = `amz_${productTypeHint.toLowerCase()}`;
// TO
const familyCodeGuess = `${channel.platform}_${productTypeHint.toLowerCase()}`;
```

Note: `channel` and `platform` variables should already be available in scope (the channel is fetched early in the import method). Verify the variable name matches what's in scope. If the platform variable doesn't exist, extract it from `channel.platform` at the top of the method.

- [ ] **Step 2: Update related tests**

In `apps/server/src/towers/pm/listings/listings-import.service.spec.ts`, search for `amz_` in test assertions and update to use the expected platform from the test's channel mock. For tests using `platform: "amazon"`, the prefix is still `amazon_` — so the value changes from `amz_product` to `amazon_product`.

- [ ] **Step 3: Run tests**

Run: `cd apps/server && npx vitest run src/towers/pm/listings/listings-import.service.spec.ts`
Expected: All tests PASS.

- [ ] **Step 4: Run full test suite**

Run: `cd apps/server && npx vitest run`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/towers/pm/listings/listings-import.service.ts apps/server/src/towers/pm/listings/listings-import.service.spec.ts
git commit -m "refactor(import): replace hardcoded amz_ prefix with platform-agnostic {platform}_ pattern"
```

---

## Task 11: Final integration test + TypeScript check

**Files:**
- No new files — validation only

- [ ] **Step 1: Run TypeScript compilation check**

Run: `cd apps/server && npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 2: Run full test suite**

Run: `cd apps/server && npx vitest run`
Expected: All tests pass. Record the total count.

- [ ] **Step 3: Verify new exports are accessible**

Run: `cd apps/server && npx tsc --noEmit -p tsconfig.json 2>&1 | head -5`
Expected: No errors. This verifies all new types and exports resolve correctly through the barrel files.

- [ ] **Step 4: Commit any remaining changes**

If there are any uncommitted fixes from integration testing:

```bash
git add -A apps/server/src/
git commit -m "fix: resolve integration issues from connector multi-platform refactor"
```

- [ ] **Step 5: Final commit — update spec status**

Update the spec file header status:

In `docs/superpowers/specs/2026-04-06-connector-multi-platform-extensibility-design.md`, change:
```
**Status:** Approved (pending implementation plan)
```
To:
```
**Status:** Implemented
```

```bash
git add docs/
git commit -m "docs: mark connector multi-platform extensibility spec as implemented"
```

---

## Summary

| Task | What | Files | Est. |
|---|---|---|---|
| 1 | Unified CatalogSearchItem types | 3 modify | 3 min |
| 2 | ValueUnwrapperRegistry + Amazon unwrapper | 4 create, 1 modify | 5 min |
| 3 | PayloadBuilderRegistry + Amazon registration | 3 create, 2 modify | 5 min |
| 4 | MappingEngine platform-aware unwrapping | 2 modify | 3 min |
| 5 | Move ConnectorRegistry to registries/ | 1 move, 3 modify | 2 min |
| 6 | RakutenPublicConnector full implementation | 6 create, 2 modify | 10 min |
| 7 | CatalogResolutionStrategy | 3 create | 8 min |
| 8 | CatalogController + CatalogModule | 4 create, 1 modify | 5 min |
| 9 | Wire CatalogBrowseService delegation | 3 modify | 3 min |
| 10 | Platform-agnostic family naming | 2 modify | 3 min |
| 11 | Integration test + final verification | 0 | 3 min |

**Total: 11 tasks, ~50 min estimated execution time**
**New files: 17 | Modified files: 13 | Moved files: 1**
