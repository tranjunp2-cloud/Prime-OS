# Amazon SP-API PIM Data Completeness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the Amazon SP-API integration so that product imports extract full structured attributes, complete parent-child variation trees, browse-node classifications, and package dimensions — instead of only 4 summary-level fields.

**Architecture:** Three surgical changes: (1) expand `includedData` query parameters on Catalog and Listings API calls, (2) extract parent-child relationships in `normalizeListingItem`, (3) batch child-ASIN fetches in `getCatalogTree` to fix the N+1 problem. No new files needed — all changes modify existing connector and interface code.

**Tech Stack:** NestJS 11, TypeScript strict, Vitest, Amazon SP-API v2022-04-01 (Catalog) + v2021-08-01 (Listings)

**Spec:** `docs/architecture/integration-spec-amazon-pim-import.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `apps/server/src/towers/pm/connectors/connector.interface.ts` | Modify | Add optional fields to `NormalizedListing` and `CatalogSearchResult` types |
| `apps/server/src/towers/pm/connectors/amazon/amazon.connector.ts` | Modify | Expand `includedData` params, extract relationships in normalization, batch children |
| `apps/server/src/towers/pm/listings/catalog-browse.service.ts` | Modify | Replace per-child fetch loop with batched calls in `getCatalogTree` |
| `apps/server/src/towers/pm/connectors/amazon/amazon.connector.spec.ts` | Create | Unit tests for connector methods (pure logic, mocked auth client) |
| `apps/server/src/towers/pm/listings/catalog-browse.service.spec.ts` | Modify | Add test for batched `getCatalogTree` |

---

### Task 1: Expand `NormalizedListing` and `CatalogSearchResult` interfaces

**Files:**
- Modify: `apps/server/src/towers/pm/connectors/connector.interface.ts:91-103` (NormalizedListing)
- Modify: `apps/server/src/towers/pm/connectors/connector.interface.ts:24-34` (CatalogSearchResult)

- [ ] **Step 1: Add optional fields to `NormalizedListing`**

In `connector.interface.ts`, find the `NormalizedListing` interface and add the new optional fields:

```typescript
export interface NormalizedListing {
	sku: string;
	externalId: string; // ASIN for Amazon, itemId for Shopee, etc.
	title: string;
	status: string;
	mainImage?: string;
	productType?: string;
	parentExternalId?: string; // generic parent reference
	variationTheme?: string[]; // NEW: axis attribute names (e.g., ["color", "size"])
	classifications?: Array<{  // NEW: browse node hierarchy
		id: string;
		name: string;
		parentId?: string;
		parentName?: string;
	}>;
	dimensions?: {             // NEW: item/package measurements
		item?: DimensionSet;
		package?: DimensionSet;
	};
	values: Record<string, unknown>;
	raw: Record<string, unknown>;
}
```

- [ ] **Step 2: Add `DimensionSet` type above `NormalizedListing`**

Add this type just before the `NormalizedListing` interface:

```typescript
export interface DimensionSet {
	height?: { value: number; unit: string };
	length?: { value: number; unit: string };
	width?: { value: number; unit: string };
	weight?: { value: number; unit: string };
}
```

- [ ] **Step 3: Add `attributes` and `classifications` to `CatalogSearchResult` item type**

Find the `CatalogSearchResult` interface and expand the item type:

```typescript
export interface CatalogSearchResult {
	items: Array<{
		asin?: string;
		title: string;
		identifiers: Record<string, string>;
		images?: Array<{ link: string; height?: number; width?: number }>;
		productTypes?: string[];
		parentAsin?: string | null;
		childAsins?: string[];
		variationTheme?: string[];
		attributes?: Record<string, unknown>;       // NEW: full structured attributes
		classifications?: Array<{                    // NEW: browse node hierarchy
			id: string;
			name: string;
			parentId?: string;
			parentName?: string;
		}>;
		dimensions?: {                               // NEW: item/package measurements
			item?: DimensionSet;
			package?: DimensionSet;
		};
	}>;
}
```

- [ ] **Step 4: Verify types compile**

Run: `pnpm --filter @ech/server exec tsc --noEmit --pretty 2>&1 | head -30`
Expected: No new errors (existing errors may be present but none from our changes)

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/towers/pm/connectors/connector.interface.ts
git commit -m "feat(pm): expand NormalizedListing and CatalogSearchResult with attributes, classifications, dimensions"
```

---

### Task 2: Expand `includedData` on Catalog API calls

**Files:**
- Modify: `apps/server/src/towers/pm/connectors/amazon/amazon.connector.ts:183-186` (searchCatalogItems)
- Modify: `apps/server/src/towers/pm/connectors/amazon/amazon.connector.ts:290-296` (batchGetCatalogItems)
- Test: `apps/server/src/towers/pm/connectors/amazon/amazon.connector.spec.ts` (new file)

- [ ] **Step 1: Write the failing test for `searchCatalogItems` includedData**

Create `apps/server/src/towers/pm/connectors/amazon/amazon.connector.spec.ts`:

```typescript
import { describe, expect, it, vi, beforeEach } from "vitest";
import { AmazonConnector } from "./amazon.connector";

// Mock fetch globally for SP-API calls
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const TEST_SETTINGS = {
	sellerId: "SELLER1",
	marketplaceId: "A1VC38T7YXB528",
	refreshToken: "rt-123",
	clientId: "client-123",
	clientSecret: "secret-123",
	region: "fe",
};

function mockLwaTokenResponse() {
	mockFetch.mockResolvedValueOnce({
		ok: true,
		json: async () => ({ access_token: "tok-123", expires_in: 3600 }),
	});
}

describe("AmazonConnector", () => {
	let connector: AmazonConnector;

	beforeEach(() => {
		vi.clearAllMocks();
		connector = new AmazonConnector(TEST_SETTINGS);
	});

	describe("searchCatalogItems", () => {
		it("requests full includedData with attributes, classifications, dimensions", async () => {
			mockLwaTokenResponse();
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ items: [] }),
			});

			await connector.searchCatalogItems({
				identifierType: "ASIN",
				identifier: "B001TEST",
			});

			const catalogCall = mockFetch.mock.calls[1];
			const url = catalogCall[0] as string;
			expect(url).toContain("includedData=");
			expect(url).toContain("attributes");
			expect(url).toContain("classifications");
			expect(url).toContain("dimensions");
			expect(url).toContain("summaries");
			expect(url).toContain("identifiers");
			expect(url).toContain("images");
			expect(url).toContain("productTypes");
			expect(url).toContain("relationships");
		});
	});

	describe("batchGetCatalogItems", () => {
		it("requests full includedData with attributes, classifications, dimensions", async () => {
			mockLwaTokenResponse();
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ items: [{ asin: "B001" }] }),
			});

			await connector.batchGetCatalogItems(["B001"]);

			const catalogCall = mockFetch.mock.calls[1];
			const url = catalogCall[0] as string;
			expect(url).toContain("attributes");
			expect(url).toContain("classifications");
			expect(url).toContain("dimensions");
		});
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ech/server exec vitest run src/towers/pm/connectors/amazon/amazon.connector.spec.ts --reporter=verbose 2>&1 | tail -20`
Expected: FAIL — `attributes`, `classifications`, `dimensions` not found in URL

- [ ] **Step 3: Update `searchCatalogItems` includedData**

In `amazon.connector.ts`, find the `searchCatalogItems` method and change the `includedData` parameter:

```typescript
		// Old:
		// includedData: "summaries,identifiers,images,productTypes,relationships",
		// New:
		includedData: "summaries,attributes,identifiers,images,productTypes,relationships,classifications,dimensions",
```

- [ ] **Step 4: Update `batchGetCatalogItems` includedData**

In `amazon.connector.ts`, find the `batchGetCatalogItems` method and change the `includedData` parameter:

```typescript
		// Old:
		// includedData: "summaries,identifiers,images,productTypes,relationships",
		// New:
		includedData: "summaries,attributes,identifiers,images,productTypes,relationships,classifications,dimensions",
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @ech/server exec vitest run src/towers/pm/connectors/amazon/amazon.connector.spec.ts --reporter=verbose 2>&1 | tail -20`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/towers/pm/connectors/amazon/amazon.connector.ts apps/server/src/towers/pm/connectors/amazon/amazon.connector.spec.ts
git commit -m "feat(pm): add attributes, classifications, dimensions to Catalog API includedData"
```

---

### Task 3: Extract `classifications` and `dimensions` from Catalog API responses

**Files:**
- Modify: `apps/server/src/towers/pm/connectors/amazon/amazon.connector.ts:217-247` (searchCatalogItems return mapping)
- Modify: `apps/server/src/towers/pm/connectors/amazon/amazon.connector.ts:328-357` (batchGetCatalogItems return mapping)
- Test: `apps/server/src/towers/pm/connectors/amazon/amazon.connector.spec.ts`

- [ ] **Step 1: Write the failing test for classifications and dimensions extraction**

Add to `amazon.connector.spec.ts` inside the `searchCatalogItems` describe block:

```typescript
		it("extracts classifications and dimensions from response", async () => {
			mockLwaTokenResponse();
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					items: [
						{
							asin: "B001",
							summaries: [{ itemName: "Test Product" }],
							identifiers: [],
							images: [],
							productTypes: [{ productType: "SPORT_BAT" }],
							relationships: [],
							classifications: [
								{
									marketplaceId: "A1VC38T7YXB528",
									classifications: [
										{
											classificationId: "12345",
											displayName: "Sports Equipment",
											parent: {
												classificationId: "100",
												displayName: "Sports & Outdoors",
											},
										},
									],
								},
							],
							dimensions: [
								{
									marketplaceId: "A1VC38T7YXB528",
									item: {
										height: { value: 10, unit: "centimeters" },
										length: { value: 86, unit: "centimeters" },
										weight: { value: 0.85, unit: "kilograms" },
										width: { value: 7, unit: "centimeters" },
									},
									package: {
										height: { value: 12, unit: "centimeters" },
										length: { value: 90, unit: "centimeters" },
										weight: { value: 1.2, unit: "kilograms" },
										width: { value: 10, unit: "centimeters" },
									},
								},
							],
							attributes: {
								item_name: [{ value: "Test Product", language_tag: "ja_JP" }],
								product_description: [{ value: "A great bat", language_tag: "ja_JP" }],
							},
						},
					],
				}),
			});

			const result = await connector.searchCatalogItems({
				identifierType: "ASIN",
				identifier: "B001",
			});

			const item = result.items[0];
			expect(item.classifications).toEqual([
				{
					id: "12345",
					name: "Sports Equipment",
					parentId: "100",
					parentName: "Sports & Outdoors",
				},
			]);
			expect(item.dimensions?.item?.height).toEqual({ value: 10, unit: "centimeters" });
			expect(item.dimensions?.package?.weight).toEqual({ value: 1.2, unit: "kilograms" });
			expect(item.attributes).toBeDefined();
			expect(item.attributes?.item_name).toEqual([{ value: "Test Product", language_tag: "ja_JP" }]);
		});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ech/server exec vitest run src/towers/pm/connectors/amazon/amazon.connector.spec.ts --reporter=verbose 2>&1 | tail -20`
Expected: FAIL — `classifications`, `dimensions`, `attributes` not present in return value

- [ ] **Step 3: Update `searchCatalogItems` return mapping**

In `amazon.connector.ts`, find the `searchCatalogItems` method's `return` block. The response type already includes the raw data — we need to add parsing for the new fields. Update the `data` type parameter in `spApiGet` to include the new fields, and update the `return` mapping.

Add `classifications` and `dimensions` to the generic type parameter of `spApiGet`:

```typescript
				classifications?: Array<{
					marketplaceId?: string;
					classifications?: Array<{
						classificationId: string;
						displayName: string;
						parent?: { classificationId: string; displayName: string };
					}>;
				}>;
				dimensions?: Array<{
					marketplaceId?: string;
					item?: Record<string, { value: number; unit: string }>;
					package?: Record<string, { value: number; unit: string }>;
				}>;
				attributes?: Record<string, unknown>;
```

Then in the `.map()` callback, add the extraction after `variationTheme`:

```typescript
					const classifications =
						item.classifications
							?.flatMap((c) => c.classifications ?? [])
							.map((c) => ({
								id: c.classificationId,
								name: c.displayName,
								parentId: c.parent?.classificationId,
								parentName: c.parent?.displayName,
							})) ?? [];

					const dims = item.dimensions?.[0];
					const dimensions = dims
						? { item: dims.item, package: dims.package }
						: undefined;

					return {
						asin: item.asin,
						title: item.summaries?.[0]?.itemName || "",
						identifiers: Object.fromEntries(
							(item.identifiers ?? [])
								.flatMap((g) => g.identifiers)
								.map((id) => [id.identifierType, id.identifier]),
						),
						images: item.images?.flatMap((g) => g.images) ?? [],
						productTypes: (item.productTypes ?? []).map((pt) => pt.productType),
						parentAsin,
						childAsins,
						variationTheme,
						attributes: item.attributes,
						classifications,
						dimensions,
					};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @ech/server exec vitest run src/towers/pm/connectors/amazon/amazon.connector.spec.ts --reporter=verbose 2>&1 | tail -20`
Expected: PASS

- [ ] **Step 5: Update `batchGetCatalogItems` to also return new fields**

In `batchGetCatalogItems`, update the generic type for `spApiGet` to include `classifications`, `dimensions`, `attributes` (same types as above). Then update the `result.set()` call to include:

```typescript
						result.set(item.asin, {
							title: item.summaries?.[0]?.itemName || "",
							mainImage: item.images?.[0]?.images?.[0]?.link ?? null,
							brand: summary.brand,
							color: summary.color,
							size: summary.size,
							productType: item.productTypes?.[0]?.productType,
							images: item.images
								?.flatMap((g) => g.images)
								.map((i) => ({ link: i.link })),
							variationTheme,
							raw: item,
						});
```

Note: `batchGetCatalogItems` stores the full `item` as `raw`. Since `item` now includes `attributes`, `classifications`, and `dimensions`, the MappingEngine will automatically pick them up from `raw`. No additional extraction needed here — the raw data flows through to `listings-import.service.ts`.

- [ ] **Step 6: Verify types compile**

Run: `pnpm --filter @ech/server exec tsc --noEmit --pretty 2>&1 | head -30`
Expected: No new type errors

- [ ] **Step 7: Commit**

```bash
git add apps/server/src/towers/pm/connectors/amazon/amazon.connector.ts apps/server/src/towers/pm/connectors/amazon/amazon.connector.spec.ts
git commit -m "feat(pm): extract classifications, dimensions, attributes from Catalog API responses"
```

---

### Task 4: Expand `includedData` on Listings API calls and extract relationships

**Files:**
- Modify: `apps/server/src/towers/pm/connectors/amazon/amazon.connector.ts:367-386` (searchListingsItems)
- Modify: `apps/server/src/towers/pm/connectors/amazon/amazon.connector.ts:429-452` (normalizeListingItem)
- Modify: `apps/server/src/towers/pm/connectors/amazon/amazon.connector.ts:166-176` (getListingsItem)
- Test: `apps/server/src/towers/pm/connectors/amazon/amazon.connector.spec.ts`

- [ ] **Step 1: Write the failing test for `searchListingsItems` includedData**

Add to `amazon.connector.spec.ts`:

```typescript
	describe("searchListingsItems", () => {
		it("requests summaries, attributes, relationships, productTypes in includedData", async () => {
			mockLwaTokenResponse();
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ items: [], nextToken: undefined }),
			});

			await connector.searchListingsItems({});

			const listingsCall = mockFetch.mock.calls[1];
			const url = listingsCall[0] as string;
			expect(url).toContain("summaries");
			expect(url).toContain("attributes");
			expect(url).toContain("relationships");
			expect(url).toContain("productTypes");
		});
	});
```

- [ ] **Step 2: Write the failing test for `normalizeListingItem` parent extraction**

Add to `amazon.connector.spec.ts`:

```typescript
	describe("pullAllSellerListings", () => {
		it("extracts parentExternalId and variationTheme from listing relationships", async () => {
			// Token for searchListingsItems
			mockLwaTokenResponse();
			// searchListingsItems response (page 1 with no nextToken)
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					items: [
						{
							sku: "BAT-RED-M",
							summaries: [
								{
									asin: "B00CHILD01",
									itemName: "Red Bat Medium",
									status: ["Active"],
									productType: "SPORT_BAT",
								},
							],
							relationships: [
								{
									marketplaceId: "A1VC38T7YXB528",
									relationships: [
										{
											parentAsins: ["B00PARENT1"],
											type: "VARIATION",
											variationTheme: {
												attributes: ["color", "size"],
												theme: "COLOR_NAME/SIZE_NAME",
											},
										},
									],
								},
							],
						},
					],
					nextToken: undefined,
				}),
			});
			// batchGetCatalogItems — token + catalog response
			mockLwaTokenResponse();
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ items: [] }),
			});

			const result = await connector.pullAllSellerListings();

			expect(result).toHaveLength(1);
			expect(result[0].parentExternalId).toBe("B00PARENT1");
			expect(result[0].variationTheme).toEqual(["color", "size"]);
		});
	});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm --filter @ech/server exec vitest run src/towers/pm/connectors/amazon/amazon.connector.spec.ts --reporter=verbose 2>&1 | tail -30`
Expected: FAIL — `searchListingsItems` doesn't include `attributes,relationships,productTypes`; `parentExternalId` is `undefined`

- [ ] **Step 4: Update `searchListingsItems` includedData**

In `amazon.connector.ts`, find the `searchListingsItems` method and change:

```typescript
		// Old:
		// includedData: "summaries",
		// New:
		includedData: "summaries,attributes,relationships,productTypes",
```

- [ ] **Step 5: Update `normalizeListingItem` to extract relationships**

In `amazon.connector.ts`, replace the `normalizeListingItem` method:

```typescript
	private normalizeListingItem(
		raw: Record<string, unknown>,
	): NormalizedListing {
		const summaries = (raw.summaries as Array<Record<string, unknown>>) ?? [];
		const summary = summaries[0] ?? {};
		const sku = (raw.sku as string) ?? "";
		const asin = (summary.asin as string) ?? "";
		const title = (summary.itemName as string) ?? "";
		const status = Array.isArray(summary.status)
			? ((summary.status[0] as string) ?? "")
			: ((summary.status as string) ?? "");
		const productType = (summary.productType as string) ?? undefined;

		// Extract relationships for parent-child linking
		const relationshipsGroups = (raw.relationships as Array<{
			marketplaceId?: string;
			relationships?: Array<{
				parentAsins?: string[];
				childAsins?: string[];
				variationTheme?: { attributes?: string[]; theme?: string };
				type?: string;
			}>;
		}>) ?? [];
		const rels = relationshipsGroups.flatMap((g) => g.relationships ?? []);
		const parentExternalId =
			rels.find((r) => r.parentAsins?.length)?.parentAsins?.[0] ?? undefined;
		const variationThemeRel = rels.find(
			(r) => r.variationTheme?.attributes?.length,
		);
		const variationTheme =
			variationThemeRel?.variationTheme?.attributes ?? undefined;

		return {
			sku,
			externalId: asin,
			title,
			status,
			productType,
			parentExternalId,
			variationTheme,
			values: {},
			raw,
		};
	}
```

- [ ] **Step 6: Update `getListingsItem` includedData**

In `amazon.connector.ts`, find the `getListingsItem` method and change:

```typescript
		// Old:
		// includedData: "summaries,attributes,offers,fulfillmentAvailability,images",
		// New:
		includedData: "summaries,attributes,offers,fulfillmentAvailability,images,issues,relationships,productTypes",
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `pnpm --filter @ech/server exec vitest run src/towers/pm/connectors/amazon/amazon.connector.spec.ts --reporter=verbose 2>&1 | tail -30`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add apps/server/src/towers/pm/connectors/amazon/amazon.connector.ts apps/server/src/towers/pm/connectors/amazon/amazon.connector.spec.ts
git commit -m "feat(pm): expand Listings API includedData, extract parent-child relationships in normalizeListingItem"
```

---

### Task 5: Batch child-ASIN fetches in `getCatalogTree` (fix N+1)

**Files:**
- Modify: `apps/server/src/towers/pm/listings/catalog-browse.service.ts:68-159` (getCatalogTree)
- Test: `apps/server/src/towers/pm/listings/catalog-browse.service.spec.ts`

- [ ] **Step 1: Write the failing test for batched `getCatalogTree`**

Add to `catalog-browse.service.spec.ts` inside the main describe block:

```typescript
	describe("getCatalogTree", () => {
		it("batches child ASINs instead of fetching one-by-one", async () => {
			db.select.mockReturnValue({
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				then: vi.fn((cb: Function) => cb([baseChannel])),
			} as unknown as ReturnType<typeof db.select>);

			const childAsins = Array.from({ length: 25 }, (_, i) => `B00CHILD${String(i).padStart(2, "0")}`);

			const searchCatalogItemsFn = vi.fn();
			// First call: look up the initial ASIN — it's a parent with 25 children
			searchCatalogItemsFn.mockResolvedValueOnce({
				items: [
					{
						asin: "B00PARENT",
						title: "Parent Product",
						identifiers: {},
						images: [],
						productTypes: ["SPORT_BAT"],
						parentAsin: null,
						childAsins,
						variationTheme: ["color", "size"],
					},
				],
			});
			// Second call: batch of 20 children
			searchCatalogItemsFn.mockResolvedValueOnce({
				items: childAsins.slice(0, 20).map((asin) => ({
					asin,
					title: `Child ${asin}`,
					identifiers: {},
					images: [],
					productTypes: ["SPORT_BAT"],
					parentAsin: "B00PARENT",
					childAsins: [],
				})),
			});
			// Third call: batch of 5 remaining children
			searchCatalogItemsFn.mockResolvedValueOnce({
				items: childAsins.slice(20).map((asin) => ({
					asin,
					title: `Child ${asin}`,
					identifiers: {},
					images: [],
					productTypes: ["SPORT_BAT"],
					parentAsin: "B00PARENT",
					childAsins: [],
				})),
			});

			mockConnectorFactory.create.mockReturnValue({
				platform: "amazon",
				capabilities: { canSearchCatalog: true },
				searchCatalogItems: searchCatalogItemsFn,
			});

			const result = await service.getCatalogTree("ch-1", "B00PARENT");

			// 1 initial + 2 batches = 3 total calls (NOT 1 + 25 = 26)
			expect(searchCatalogItemsFn).toHaveBeenCalledTimes(3);
			expect(result.children).toHaveLength(25);
			expect(result.totalItems).toBe(26); // 1 parent + 25 children
			expect(result.parent?.asin).toBe("B00PARENT");
		});
	});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ech/server exec vitest run src/towers/pm/listings/catalog-browse.service.spec.ts --reporter=verbose 2>&1 | tail -30`
Expected: FAIL — current implementation makes 26 calls (1 + 25 individual)

- [ ] **Step 3: Replace per-child loop with batched fetch in `getCatalogTree`**

In `catalog-browse.service.ts`, replace the `getCatalogTree` method from the child-fetching section onward. Replace everything from line ~116 (`this.logger.debug(\`getCatalogTree: will fetch...`) to the end of the method:

```typescript
		this.logger.debug(
			`getCatalogTree: will fetch ${childAsins.length} children in batches of 20`,
		);

		// Batch children in chunks of 20 (Catalog API max per request)
		const children: Array<(typeof initial.items)[0] & { parentAsin: string }> =
			[];
		const BATCH_SIZE = 20;
		for (let i = 0; i < childAsins.length; i += BATCH_SIZE) {
			const chunk = childAsins.slice(i, i + BATCH_SIZE);
			try {
				const batchResult = await connector.searchCatalogItems({
					identifierType: "ASIN",
					identifier: chunk.join(","),
				});
				for (const child of batchResult.items) {
					if (child.asin) {
						children.push({
							...child,
							parentAsin: parentItem.asin!,
						});
					}
				}
			} catch (err) {
				this.logger.warn(
					`getCatalogTree: failed to fetch child batch (${chunk.length} ASINs): ${(err as Error).message}`,
				);
			}
		}

		return {
			parent: {
				asin: parentItem.asin,
				title: parentItem.title,
				images: parentItem.images,
				productTypes: parentItem.productTypes,
				identifiers: parentItem.identifiers,
			},
			children: children.map((c) => ({
				asin: c.asin,
				title: c.title,
				images: c.images,
				productTypes: c.productTypes,
				identifiers: c.identifiers,
				parentAsin: c.parentAsin,
			})),
			totalItems: 1 + children.length,
		};
```

Also remove the now-unused `delay` helper from the top of the method. The `delay` on line 83-84 and the `await delay(250)` on line 101 (before parent fetch) can also be removed — the rate limiter (Phase 2) will handle throttling.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @ech/server exec vitest run src/towers/pm/listings/catalog-browse.service.spec.ts --reporter=verbose 2>&1 | tail -30`
Expected: PASS

- [ ] **Step 5: Run all existing tests to ensure no regressions**

Run: `pnpm --filter @ech/server exec vitest run src/towers/pm/ --reporter=verbose 2>&1 | tail -40`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/towers/pm/listings/catalog-browse.service.ts apps/server/src/towers/pm/listings/catalog-browse.service.spec.ts
git commit -m "perf(pm): batch child-ASIN fetches in getCatalogTree, fix N+1 API calls"
```

---

### Task 6: Add retry logic to `batchGetCatalogItems` silent failure

**Files:**
- Modify: `apps/server/src/towers/pm/connectors/amazon/amazon.connector.ts:353-357` (catch block in batchGetCatalogItems)
- Test: `apps/server/src/towers/pm/connectors/amazon/amazon.connector.spec.ts`

- [ ] **Step 1: Write the failing test for retry behavior**

Add to `amazon.connector.spec.ts` inside the `batchGetCatalogItems` describe block:

```typescript
		it("retries once on batch failure before skipping", async () => {
			// Token
			mockLwaTokenResponse();
			// First attempt — fails
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 429,
				text: async () => "Rate limit exceeded",
			});
			// Retry — succeeds
			mockLwaTokenResponse();
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					items: [
						{
							asin: "B001",
							summaries: [{ itemName: "Product 1" }],
							images: [],
							productTypes: [],
							relationships: [],
						},
					],
				}),
			});

			const result = await connector.batchGetCatalogItems(["B001"]);

			expect(result.size).toBe(1);
			expect(result.get("B001")?.title).toBe("Product 1");
		});

		it("skips batch if retry also fails", async () => {
			// Token
			mockLwaTokenResponse();
			// First attempt — fails
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 500,
				text: async () => "Internal error",
			});
			// Retry token
			mockLwaTokenResponse();
			// Retry — also fails
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 500,
				text: async () => "Internal error again",
			});

			const result = await connector.batchGetCatalogItems(["B001"]);

			// Should not throw, just return empty
			expect(result.size).toBe(0);
		});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ech/server exec vitest run src/towers/pm/connectors/amazon/amazon.connector.spec.ts --reporter=verbose 2>&1 | tail -30`
Expected: FAIL — first test fails because current code swallows error without retry

- [ ] **Step 3: Replace the silent catch block with retry logic**

In `amazon.connector.ts`, find the `catch` block in `batchGetCatalogItems` (the one with the comment `// Non-critical: listings still work without enrichment`). Replace the entire try-catch wrapping each chunk:

```typescript
			try {
				await this.fetchCatalogChunk(chunk, result);
			} catch {
				// Retry once after 1 second
				try {
					await new Promise((resolve) => setTimeout(resolve, 1_000));
					await this.fetchCatalogChunk(chunk, result);
				} catch {
					// Non-critical: listings still work without enrichment
				}
			}
```

Then extract the inner logic into a private method:

```typescript
	private async fetchCatalogChunk(
		chunk: string[],
		result: Map<string, {
			title: string;
			mainImage: string | null;
			brand?: string;
			color?: string;
			size?: string;
			productType?: string;
			images?: Array<{ link: string }>;
			variationTheme?: string[];
			raw: Record<string, unknown>;
		}>,
	): Promise<void> {
		const params = new URLSearchParams({
			marketplaceIds: this.auth.marketplaceId,
			includedData:
				"summaries,attributes,identifiers,images,productTypes,relationships,classifications,dimensions",
			identifiersType: "ASIN",
			identifiers: chunk.join(","),
		});
		const data = await this.auth.spApiGet<{
			items: Array<{
				asin: string;
				summaries?: Array<{
					itemName?: string;
					brand?: string;
					color?: string;
					size?: string;
				}>;
				identifiers?: Array<{
					identifiers: Array<{
						identifierType: string;
						identifier: string;
					}>;
				}>;
				images?: Array<{
					images: Array<{ link: string; height?: number; width?: number }>;
				}>;
				productTypes?: Array<{ productType: string }>;
				relationships?: Array<{
					relationships?: Array<{
						childAsins?: string[];
						parentAsins?: string[];
						variationTheme?: { attributes?: string[] };
						type?: string;
					}>;
				}>;
			}>;
		}>("/catalog/2022-04-01/items", params);
		for (const item of data.items) {
			if (!item.asin) continue;
			const summary = item.summaries?.[0] ?? {};
			const rels =
				item.relationships?.flatMap((r) => r.relationships ?? []) ?? [];
			const variationThemeRel = rels.find(
				(r) => r.variationTheme?.attributes?.length,
			);
			const variationTheme =
				variationThemeRel?.variationTheme?.attributes ?? undefined;
			result.set(item.asin, {
				title: item.summaries?.[0]?.itemName || "",
				mainImage: item.images?.[0]?.images?.[0]?.link ?? null,
				brand: summary.brand,
				color: summary.color,
				size: summary.size,
				productType: item.productTypes?.[0]?.productType,
				images: item.images
					?.flatMap((g) => g.images)
					.map((i) => ({ link: i.link })),
				variationTheme,
				raw: item,
			});
		}
	}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @ech/server exec vitest run src/towers/pm/connectors/amazon/amazon.connector.spec.ts --reporter=verbose 2>&1 | tail -30`
Expected: PASS

- [ ] **Step 5: Run all PM tower tests**

Run: `pnpm --filter @ech/server exec vitest run src/towers/pm/ --reporter=verbose 2>&1 | tail -40`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/towers/pm/connectors/amazon/amazon.connector.ts apps/server/src/towers/pm/connectors/amazon/amazon.connector.spec.ts
git commit -m "fix(pm): add single retry to batchGetCatalogItems on chunk failure"
```

---

### Task 7: Clean up dead code and verify full test suite

**Files:**
- Modify: `apps/server/src/towers/pm/connectors/connector.interface.ts:1-13` (remove `rateLimitMs`)

- [ ] **Step 1: Remove unused `rateLimitMs` from `ChannelSettings`**

In `connector.interface.ts`, remove the `rateLimitMs?: number;` line from the `ChannelSettings` interface:

```typescript
export interface ChannelSettings {
	sellerId?: string;
	marketplaceId?: string;
	credentials?: {
		refreshToken: string;
		clientId: string;
		clientSecret: string;
	};
	[key: string]: unknown;
}
```

- [ ] **Step 2: Verify no code references `rateLimitMs`**

Run: `grep -r "rateLimitMs" apps/server/src/`
Expected: No results (confirming it was unused)

- [ ] **Step 3: Run full PM tower test suite**

Run: `pnpm --filter @ech/server exec vitest run src/towers/pm/ --reporter=verbose 2>&1 | tail -40`
Expected: All tests pass

- [ ] **Step 4: Run type check**

Run: `pnpm --filter @ech/server exec tsc --noEmit --pretty 2>&1 | head -30`
Expected: No new errors

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/towers/pm/connectors/connector.interface.ts
git commit -m "chore(pm): remove unused rateLimitMs from ChannelSettings"
```

---

## Post-Implementation Verification

After all tasks are complete, verify the end-to-end data flow:

1. **Type check:** `pnpm --filter @ech/server exec tsc --noEmit`
2. **All PM tests:** `pnpm --filter @ech/server exec vitest run src/towers/pm/`
3. **Lint:** `pnpm --filter @ech/server lint`
4. **Manual spot check:** Search for a known ASIN via the catalog search endpoint and verify the response now includes `attributes`, `classifications`, and `dimensions` fields.

## What This Does NOT Cover (Phase 2+)

- Token bucket rate limiter (P0 — separate PR)
- Token refresh race condition mutex (P2 — separate PR)
- Notifications API subscription for event-driven sync (Phase 3)
- Reports API for bulk reads >1000 products (Phase 3)
- `VALIDATION_PREVIEW` mode for dry-run submissions (Phase 3)
