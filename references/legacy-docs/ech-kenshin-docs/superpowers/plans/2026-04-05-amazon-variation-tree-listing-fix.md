# Amazon SP-API Variation Tree & Listing Relationship Fix

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the relationship parsing mismatch in `searchListingsItems`, build an in-memory variation tree, remove the self-imposed 1000-item cap, and wire SKU-based parent-child linking into the import service.

**Architecture:** The Listings API returns SKU-based relationships (`parentSku`, `variationChildSkus`) but our connector currently parses the Catalog API format (`parentAsins[]`, `childAsins[]`). We fix the parser to handle the Listings API format, build an in-memory `VariationForest` from the flat listing pull, remove the artificial 1000-item pagination cap, and update the import service to use SKU-based tree linking instead of the current ASIN-based 3-query chain.

**Tech Stack:** TypeScript, NestJS, Vitest, Drizzle ORM, Amazon SP-API Listings Items v2021-08-01

**API Reference (from official spec):**
- `searchListingsItems` returns `Relationship { parentSku?: string; variationChildSkus?: string[]; packageChildSkus?: string[] }`
- `includedData` valid values: `summaries`, `attributes`, `issues`, `offers`, `fulfillmentAvailability`, `procurement`, `relationships`, `productTypes`
- `pageSize` max: 20, default: 10
- Response: `{ numberOfResults: number; pagination: { nextToken?: string; previousToken?: string }; items: Item[] }`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `apps/server/src/towers/pm/connectors/connector.interface.ts` | Modify | Add `parentSku`, `childSkus`, `childExternalIds`, `variationType` to `NormalizedListing`; add `VariationTreeNode`, `VariationForest` types |
| `apps/server/src/towers/pm/connectors/amazon/amazon.connector.ts` | Modify | Fix `normalizeListingItem` to parse Listings API relationship format; add `buildVariationTree()`; remove 1000-item cap; add `pullAllSellerListingsWithTree()` |
| `apps/server/src/towers/pm/connectors/amazon/amazon.connector.spec.ts` | Modify | Fix existing relationship test; add tests for SKU-based parsing, tree building, pagination |
| `apps/server/src/towers/pm/listings/catalog-browse.service.ts` | Modify | Pass tree data through `pullSellerListings` response |
| `apps/server/src/towers/pm/listings/listings-import.service.ts` | Modify | Use SKU-based tree in `batchLinkParentChildren` instead of ASIN-based lookup chain |
| `apps/server/src/towers/pm/listings/dto/listing.dto.ts` | Modify | Add `parentSku` to `importListingsSchema` |

---

### Task 1: Extend `NormalizedListing` and Add Tree Types

**Files:**
- Modify: `apps/server/src/towers/pm/connectors/connector.interface.ts:110-131`

- [ ] **Step 1: Add new fields to `NormalizedListing` interface**

In `connector.interface.ts`, add SKU-based relationship fields and variation type after the existing `variationTheme` field:

```typescript
export interface NormalizedListing {
	sku: string;
	externalId: string; // ASIN for Amazon, itemId for Shopee, etc.
	title: string;
	status: string;
	mainImage?: string;
	productType?: string;
	parentExternalId?: string; // generic parent reference (ASIN from Catalog API)
	parentSku?: string; // parent SKU (from Listings API relationships)
	childSkus?: string[]; // child SKUs (from Listings API relationships)
	childExternalIds?: string[]; // child ASINs (from Catalog API)
	variationType?: "parent" | "child" | "standalone";
	variationTheme?: string[];
	classifications?: Array<{
		id: string;
		name: string;
		parentId?: string;
		parentName?: string;
	}>;
	dimensions?: {
		item?: DimensionSet;
		package?: DimensionSet;
	};
	values: Record<string, unknown>;
	raw: Record<string, unknown>;
}
```

- [ ] **Step 2: Add `VariationTreeNode` and `VariationForest` types**

Add after the `NormalizedListing` interface (before `CatalogTreeResult`):

```typescript
export interface VariationTreeNode {
	parent: NormalizedListing;
	children: NormalizedListing[];
	variationTheme?: string[];
}

export interface VariationForest {
	trees: Map<string, VariationTreeNode>; // keyed by parent SKU
	standalone: NormalizedListing[];
	orphanChildren: NormalizedListing[]; // children whose parent SKU was not in the pull
}
```

- [ ] **Step 3: Add optional `pullAllSellerListingsWithTree` to `IListingPullable`**

In the `IListingPullable` interface, add:

```typescript
export interface IListingPullable {
	pullAllSellerListings(status?: string): Promise<NormalizedListing[]>;
	pullAllSellerListingsWithTree?(options?: {
		withStatus?: string;
		maxItems?: number;
	}): Promise<{ listings: NormalizedListing[]; forest: VariationForest }>;
	importSellerListings?(items: ImportableItem[]): Promise<ImportResult>;
}
```

- [ ] **Step 4: Verify types compile**

Run: `pnpm --filter @ech/server exec tsc --noEmit 2>&1 | head -30`
Expected: Type errors in `amazon.connector.ts` (missing new fields) — this is expected, we fix them in Task 3.

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/towers/pm/connectors/connector.interface.ts
git commit -m "feat(pm): extend NormalizedListing with SKU-based relationships and VariationForest types"
```

---

### Task 2: Write Failing Tests for Listings API Relationship Parsing

**Files:**
- Modify: `apps/server/src/towers/pm/connectors/amazon/amazon.connector.spec.ts`

- [ ] **Step 1: Fix existing relationship test to use Listings API format**

The existing test at line 240-288 uses the Catalog API format (`parentAsins`, `variationTheme.attributes`). The Listings API actually returns `parentSku` and `variationChildSkus` — a flat structure, not nested.

Replace the `pullAllSellerListings` describe block:

```typescript
describe("pullAllSellerListings", () => {
	it("extracts parentSku and variationType=child from Listings API relationships", async () => {
		mockLwaTokenResponse();
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				numberOfResults: 1,
				pagination: {},
				items: [
					{
						sku: "BAT-RED-M",
						summaries: [
							{
								marketplaceId: "A1VC38T7YXB528",
								asin: "B00CHILD01",
								itemName: "Red Bat Medium",
								status: ["BUYABLE"],
								productType: "SPORT_BAT",
							},
						],
						relationships: [
							{
								parentSku: "BAT-PARENT",
							},
						],
						productTypes: [{ productType: "SPORT_BAT" }],
					},
				],
			}),
		});
		// batchGetCatalogItems enrichment call
		mockLwaTokenResponse();
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ items: [] }),
		});

		const result = await connector.pullAllSellerListings();

		expect(result).toHaveLength(1);
		expect(result[0].parentSku).toBe("BAT-PARENT");
		expect(result[0].variationType).toBe("child");
	});

	it("extracts childSkus and variationType=parent from Listings API relationships", async () => {
		mockLwaTokenResponse();
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				numberOfResults: 1,
				pagination: {},
				items: [
					{
						sku: "BAT-PARENT",
						summaries: [
							{
								marketplaceId: "A1VC38T7YXB528",
								asin: "B00PARENT1",
								itemName: "Bat Parent",
								status: ["BUYABLE"],
								productType: "SPORT_BAT",
							},
						],
						relationships: [
							{
								variationChildSkus: ["BAT-RED-M", "BAT-RED-L", "BAT-BLUE-M"],
							},
						],
						productTypes: [{ productType: "SPORT_BAT" }],
					},
				],
			}),
		});
		// batchGetCatalogItems enrichment call
		mockLwaTokenResponse();
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ items: [] }),
		});

		const result = await connector.pullAllSellerListings();

		expect(result).toHaveLength(1);
		expect(result[0].childSkus).toEqual(["BAT-RED-M", "BAT-RED-L", "BAT-BLUE-M"]);
		expect(result[0].variationType).toBe("parent");
	});

	it("sets variationType=standalone when no relationships", async () => {
		mockLwaTokenResponse();
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				numberOfResults: 1,
				pagination: {},
				items: [
					{
						sku: "STANDALONE-1",
						summaries: [
							{
								marketplaceId: "A1VC38T7YXB528",
								asin: "B00ALONE01",
								itemName: "Standalone Product",
								status: ["BUYABLE"],
								productType: "SHIRT",
							},
						],
						relationships: [],
						productTypes: [{ productType: "SHIRT" }],
					},
				],
			}),
		});
		// batchGetCatalogItems enrichment call
		mockLwaTokenResponse();
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ items: [] }),
		});

		const result = await connector.pullAllSellerListings();

		expect(result).toHaveLength(1);
		expect(result[0].variationType).toBe("standalone");
		expect(result[0].parentSku).toBeUndefined();
		expect(result[0].childSkus).toBeUndefined();
	});

	it("still extracts parentExternalId from Catalog API enrichment (backward compat)", async () => {
		mockLwaTokenResponse();
		// Listings API: child item with parentSku
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				numberOfResults: 1,
				pagination: {},
				items: [
					{
						sku: "BAT-RED-M",
						summaries: [
							{
								marketplaceId: "A1VC38T7YXB528",
								asin: "B00CHILD01",
								itemName: "Red Bat Medium",
								status: ["BUYABLE"],
								productType: "SPORT_BAT",
							},
						],
						relationships: [{ parentSku: "BAT-PARENT" }],
						productTypes: [{ productType: "SPORT_BAT" }],
					},
				],
			}),
		});
		// batchGetCatalogItems enrichment — returns catalog data with parentAsins
		mockLwaTokenResponse();
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				items: [
					{
						asin: "B00CHILD01",
						summaries: [{ itemName: "Red Bat Medium" }],
						images: [],
						productTypes: [{ productType: "SPORT_BAT" }],
						relationships: [
							{
								marketplaceId: "A1VC38T7YXB528",
								relationships: [
									{
										parentAsins: ["B00PARENT1"],
										type: "VARIATION",
										variationTheme: { attributes: ["color", "size"] },
									},
								],
							},
						],
					},
				],
			}),
		});

		const result = await connector.pullAllSellerListings();

		expect(result).toHaveLength(1);
		// SKU-based from Listings API
		expect(result[0].parentSku).toBe("BAT-PARENT");
		// ASIN-based from Catalog API enrichment
		expect(result[0].parentExternalId).toBe("B00PARENT1");
		expect(result[0].variationTheme).toEqual(["color", "size"]);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @ech/server exec vitest run apps/server/src/towers/pm/connectors/amazon/amazon.connector.spec.ts --reporter=verbose 2>&1 | tail -30`
Expected: FAIL — `parentSku`, `childSkus`, `variationType` are not yet extracted.

- [ ] **Step 3: Commit failing tests**

```bash
git add apps/server/src/towers/pm/connectors/amazon/amazon.connector.spec.ts
git commit -m "test(pm): add failing tests for Listings API SKU-based relationship parsing"
```

---

### Task 3: Fix `normalizeListingItem` to Parse Listings API Format

**Files:**
- Modify: `apps/server/src/towers/pm/connectors/amazon/amazon.connector.ts:488-532`

- [ ] **Step 1: Rewrite `normalizeListingItem` to handle both API formats**

Replace the `normalizeListingItem` method (lines 488-532):

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

	// Parse Listings API relationship format: flat array of { parentSku, variationChildSkus, packageChildSkus }
	const relationships =
		(raw.relationships as Array<{
			parentSku?: string;
			variationChildSkus?: string[];
			packageChildSkus?: string[];
		}>) ?? [];

	let parentSku: string | undefined;
	let childSkus: string[] | undefined;

	for (const rel of relationships) {
		if (rel.parentSku) {
			parentSku = rel.parentSku;
		}
		if (rel.variationChildSkus?.length) {
			childSkus = [...(childSkus ?? []), ...rel.variationChildSkus];
		}
	}

	// Determine variation type
	let variationType: "parent" | "child" | "standalone";
	if (childSkus?.length) {
		variationType = "parent";
	} else if (parentSku) {
		variationType = "child";
	} else {
		variationType = "standalone";
	}

	return {
		sku,
		externalId: asin,
		title,
		status,
		productType,
		parentSku,
		childSkus,
		variationType,
		values: {},
		raw,
	};
}
```

Note: `parentExternalId` and `variationTheme` are no longer extracted here — they come from the Catalog API enrichment step in `pullAllSellerListings`. This correctly separates concerns: Listings API data is SKU-based, Catalog API data is ASIN-based.

- [ ] **Step 2: Update `pullAllSellerListings` to extract Catalog API fields during enrichment**

In `pullAllSellerListings` (around lines 465-483), after the catalog enrichment merge, extract `parentExternalId`, `childExternalIds`, and `variationTheme` from the catalog data:

```typescript
async pullAllSellerListings(
	withStatus?: string,
): Promise<NormalizedListing[]> {
	const allItems: Array<Record<string, unknown>> = [];
	let pageToken: string | undefined;

	do {
		const page = await this.searchListingsItems({
			pageSize: 20,
			pageToken,
			withStatus,
		});
		allItems.push(...page.items);
		pageToken = page.nextToken;
	} while (pageToken);

	const listings = allItems.map((item) => this.normalizeListingItem(item));

	// Enrich with titles + images from Catalog API (Listings API doesn't return images)
	const asins = [
		...new Set(listings.map((l) => l.externalId).filter(Boolean)),
	];
	const catalogMap = await this.batchGetCatalogItems(asins);
	for (const listing of listings) {
		const catalog = catalogMap.get(listing.externalId);
		if (catalog) {
			if (!listing.title && catalog.title) listing.title = catalog.title;
			listing.mainImage = catalog.mainImage ?? undefined;

			// Extract ASIN-based relationships from Catalog API
			if (catalog.variationTheme) {
				listing.variationTheme = catalog.variationTheme;
			}
			const catalogRaw = catalog.raw as Record<string, unknown>;
			const catalogRels =
				(catalogRaw.relationships as Array<{
					relationships?: Array<{
						parentAsins?: string[];
						childAsins?: string[];
					}>;
				}>) ?? [];
			const flatRels = catalogRels.flatMap((g) => g.relationships ?? []);
			const parentAsin =
				flatRels.find((r) => r.parentAsins?.length)?.parentAsins?.[0];
			if (parentAsin) listing.parentExternalId = parentAsin;
			const childAsins = flatRels.flatMap((r) => r.childAsins ?? []);
			if (childAsins.length > 0) listing.childExternalIds = childAsins;

			// Merge catalog data into raw for MappingEngine to extract
			listing.raw = {
				...listing.raw,
				...catalogRaw,
				// Preserve original listing summaries + relationships
				summaries: listing.raw.summaries,
				relationships: listing.raw.relationships,
			};
		}
	}

	return listings;
}
```

Key changes from old code:
1. Removed `allItems.length < 1000` — pagination runs to exhaustion
2. Catalog enrichment now explicitly extracts `parentExternalId`, `childExternalIds`, `variationTheme`
3. Raw merge preserves listing `relationships` (not overwritten by catalog relationships)

- [ ] **Step 3: Run tests**

Run: `pnpm --filter @ech/server exec vitest run apps/server/src/towers/pm/connectors/amazon/amazon.connector.spec.ts --reporter=verbose 2>&1 | tail -40`
Expected: All 4 new tests PASS. Existing tests may need minor adjustments if they relied on the old relationship format.

- [ ] **Step 4: Fix any failing existing tests**

If the `searchCatalogItems` or `batchGetCatalogItems` tests fail, they should be unaffected since those use the Catalog API format directly. If any test fails, investigate and fix.

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/towers/pm/connectors/amazon/amazon.connector.ts
git commit -m "fix(pm): parse Listings API SKU-based relationships instead of Catalog API ASIN format"
```

---

### Task 4: Write Tests and Implement `buildVariationTree`

**Files:**
- Modify: `apps/server/src/towers/pm/connectors/amazon/amazon.connector.spec.ts`
- Modify: `apps/server/src/towers/pm/connectors/amazon/amazon.connector.ts`

- [ ] **Step 1: Add tests for `buildVariationTree` via `pullAllSellerListingsWithTree`**

Add a new describe block in the spec file:

```typescript
describe("pullAllSellerListingsWithTree", () => {
	it("builds a VariationForest with parent-child trees", async () => {
		mockLwaTokenResponse();
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				numberOfResults: 3,
				pagination: {},
				items: [
					{
						sku: "BAT-PARENT",
						summaries: [{ asin: "B00PARENT1", itemName: "Bat", status: ["BUYABLE"], productType: "SPORT_BAT" }],
						relationships: [{ variationChildSkus: ["BAT-RED-M", "BAT-BLUE-M"] }],
						productTypes: [{ productType: "SPORT_BAT" }],
					},
					{
						sku: "BAT-RED-M",
						summaries: [{ asin: "B00CHILD01", itemName: "Bat Red M", status: ["BUYABLE"], productType: "SPORT_BAT" }],
						relationships: [{ parentSku: "BAT-PARENT" }],
						productTypes: [{ productType: "SPORT_BAT" }],
					},
					{
						sku: "BAT-BLUE-M",
						summaries: [{ asin: "B00CHILD02", itemName: "Bat Blue M", status: ["BUYABLE"], productType: "SPORT_BAT" }],
						relationships: [{ parentSku: "BAT-PARENT" }],
						productTypes: [{ productType: "SPORT_BAT" }],
					},
				],
			}),
		});
		// batchGetCatalogItems
		mockLwaTokenResponse();
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ items: [] }),
		});

		const { listings, forest } = await connector.pullAllSellerListingsWithTree();

		expect(listings).toHaveLength(3);
		expect(forest.trees.size).toBe(1);
		expect(forest.standalone).toHaveLength(0);
		expect(forest.orphanChildren).toHaveLength(0);

		const tree = forest.trees.get("BAT-PARENT");
		expect(tree).toBeDefined();
		expect(tree!.parent.sku).toBe("BAT-PARENT");
		expect(tree!.children).toHaveLength(2);
		expect(tree!.children.map((c) => c.sku).sort()).toEqual(["BAT-BLUE-M", "BAT-RED-M"]);
	});

	it("identifies orphan children whose parent was not in the pull", async () => {
		mockLwaTokenResponse();
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				numberOfResults: 1,
				pagination: {},
				items: [
					{
						sku: "ORPHAN-CHILD-1",
						summaries: [{ asin: "B00ORPHAN1", itemName: "Orphan", status: ["BUYABLE"], productType: "SHIRT" }],
						relationships: [{ parentSku: "MISSING-PARENT" }],
						productTypes: [{ productType: "SHIRT" }],
					},
				],
			}),
		});
		// batchGetCatalogItems
		mockLwaTokenResponse();
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ items: [] }),
		});

		const { forest } = await connector.pullAllSellerListingsWithTree();

		expect(forest.trees.size).toBe(0);
		expect(forest.orphanChildren).toHaveLength(1);
		expect(forest.orphanChildren[0].sku).toBe("ORPHAN-CHILD-1");
	});

	it("classifies items with no relationships as standalone", async () => {
		mockLwaTokenResponse();
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				numberOfResults: 2,
				pagination: {},
				items: [
					{
						sku: "SIMPLE-1",
						summaries: [{ asin: "B00SIMPLE1", itemName: "Simple 1", status: ["BUYABLE"], productType: "SHIRT" }],
						relationships: [],
						productTypes: [{ productType: "SHIRT" }],
					},
					{
						sku: "SIMPLE-2",
						summaries: [{ asin: "B00SIMPLE2", itemName: "Simple 2", status: ["BUYABLE"], productType: "SHIRT" }],
						relationships: [],
						productTypes: [{ productType: "SHIRT" }],
					},
				],
			}),
		});
		// batchGetCatalogItems
		mockLwaTokenResponse();
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ items: [] }),
		});

		const { forest } = await connector.pullAllSellerListingsWithTree();

		expect(forest.trees.size).toBe(0);
		expect(forest.standalone).toHaveLength(2);
		expect(forest.orphanChildren).toHaveLength(0);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @ech/server exec vitest run apps/server/src/towers/pm/connectors/amazon/amazon.connector.spec.ts --reporter=verbose 2>&1 | tail -30`
Expected: FAIL — `pullAllSellerListingsWithTree` does not exist yet.

- [ ] **Step 3: Implement `buildVariationTree` and `pullAllSellerListingsWithTree`**

Add to `AmazonConnector` class in `amazon.connector.ts`:

```typescript
async pullAllSellerListingsWithTree(options?: {
	withStatus?: string;
	maxItems?: number;
}): Promise<{
	listings: NormalizedListing[];
	forest: VariationForest;
}> {
	const listings = await this.pullAllSellerListings(options?.withStatus);
	const forest = this.buildVariationTree(listings);
	return { listings, forest };
}

private buildVariationTree(
	listings: NormalizedListing[],
): VariationForest {
	const bySku = new Map<string, NormalizedListing>();
	for (const listing of listings) {
		bySku.set(listing.sku, listing);
	}

	const trees = new Map<string, VariationTreeNode>();
	const standalone: NormalizedListing[] = [];
	const orphanChildren: NormalizedListing[] = [];
	const assignedChildren = new Set<string>();

	// First pass: identify parents and build tree nodes
	for (const listing of listings) {
		if (listing.variationType === "parent") {
			trees.set(listing.sku, {
				parent: listing,
				children: [],
				variationTheme: listing.variationTheme,
			});
		}
	}

	// Second pass: assign children to their parents
	for (const listing of listings) {
		if (listing.variationType === "child" && listing.parentSku) {
			const tree = trees.get(listing.parentSku);
			if (tree) {
				tree.children.push(listing);
				assignedChildren.add(listing.sku);
			} else {
				orphanChildren.push(listing);
				assignedChildren.add(listing.sku);
			}
		}
	}

	// Third pass: standalone items (not parent, not child)
	for (const listing of listings) {
		if (listing.variationType === "standalone") {
			standalone.push(listing);
		}
	}

	return { trees, standalone, orphanChildren };
}
```

Add the import for `VariationForest` and `VariationTreeNode` at the top of `amazon.connector.ts`:

```typescript
import type {
	// ... existing imports ...
	VariationForest,
	VariationTreeNode,
} from "../connector.interface";
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @ech/server exec vitest run apps/server/src/towers/pm/connectors/amazon/amazon.connector.spec.ts --reporter=verbose 2>&1 | tail -40`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/towers/pm/connectors/amazon/amazon.connector.ts apps/server/src/towers/pm/connectors/amazon/amazon.connector.spec.ts
git commit -m "feat(pm): add buildVariationTree and pullAllSellerListingsWithTree for SKU-based variation forest"
```

---

### Task 5: Write Tests and Remove 1000-Item Cap

**Files:**
- Modify: `apps/server/src/towers/pm/connectors/amazon/amazon.connector.spec.ts`
- Modify: `apps/server/src/towers/pm/connectors/amazon/amazon.connector.ts`

- [ ] **Step 1: Add pagination test**

Add to the `searchListingsItems` describe block:

```typescript
it("paginates until nextToken is exhausted without artificial cap", async () => {
	mockLwaTokenResponse();
	// Page 1: returns 20 items + nextToken
	mockFetch.mockResolvedValueOnce({
		ok: true,
		json: async () => ({
			numberOfResults: 40,
			pagination: { nextToken: "page2token" },
			items: Array.from({ length: 20 }, (_, i) => ({
				sku: `SKU-${i}`,
				summaries: [{ asin: `B00${i}`, itemName: `Item ${i}`, status: ["BUYABLE"], productType: "SHIRT" }],
				relationships: [],
				productTypes: [{ productType: "SHIRT" }],
			})),
		}),
	});
	// Page 2: returns 20 items, no nextToken
	mockFetch.mockResolvedValueOnce({
		ok: true,
		json: async () => ({
			numberOfResults: 40,
			pagination: {},
			items: Array.from({ length: 20 }, (_, i) => ({
				sku: `SKU-${i + 20}`,
				summaries: [{ asin: `B00${i + 20}`, itemName: `Item ${i + 20}`, status: ["BUYABLE"], productType: "SHIRT" }],
				relationships: [],
				productTypes: [{ productType: "SHIRT" }],
			})),
		}),
	});

	const result = await connector.searchListingsItems({ pageSize: 20 });
	// First call returns page 1
	expect(result.items).toHaveLength(20);
	expect(result.nextToken).toBe("page2token");
});

it("pullAllSellerListings fetches all pages without 1000-item cap", async () => {
	mockLwaTokenResponse();
	// Page 1
	mockFetch.mockResolvedValueOnce({
		ok: true,
		json: async () => ({
			numberOfResults: 30,
			pagination: { nextToken: "page2" },
			items: Array.from({ length: 20 }, (_, i) => ({
				sku: `SKU-${i}`,
				summaries: [{ asin: `B00${i}`, itemName: `P${i}`, status: ["BUYABLE"], productType: "SHIRT" }],
				relationships: [],
			})),
		}),
	});
	// Page 2 (no new LWA token needed — cached)
	mockFetch.mockResolvedValueOnce({
		ok: true,
		json: async () => ({
			numberOfResults: 30,
			pagination: {},
			items: Array.from({ length: 10 }, (_, i) => ({
				sku: `SKU-${i + 20}`,
				summaries: [{ asin: `B00${i + 20}`, itemName: `P${i + 20}`, status: ["BUYABLE"], productType: "SHIRT" }],
				relationships: [],
			})),
		}),
	});
	// batchGetCatalogItems (2 chunks: 20 + 10 ASINs)
	mockLwaTokenResponse();
	mockFetch.mockResolvedValueOnce({
		ok: true,
		json: async () => ({ items: [] }),
	});
	mockFetch.mockResolvedValueOnce({
		ok: true,
		json: async () => ({ items: [] }),
	});

	const result = await connector.pullAllSellerListings();

	expect(result).toHaveLength(30);
});
```

- [ ] **Step 2: Run tests to verify the pagination cap test behavior**

Run: `pnpm --filter @ech/server exec vitest run apps/server/src/towers/pm/connectors/amazon/amazon.connector.spec.ts --reporter=verbose 2>&1 | tail -30`
Expected: The `pullAllSellerListings fetches all pages without 1000-item cap` test should already PASS since we removed the cap in Task 3. If it fails, investigate mock setup.

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/towers/pm/connectors/amazon/amazon.connector.spec.ts
git commit -m "test(pm): add pagination tests verifying no artificial 1000-item cap"
```

---

### Task 6: Update Pull Flow to Pass Tree Data Through

**Files:**
- Modify: `apps/server/src/towers/pm/listings/catalog-browse.service.ts:160-189`
- Modify: `apps/server/src/towers/pm/listings/dto/listing.dto.ts`

- [ ] **Step 1: Update `pullSellerListings` to include `parentSku` in response**

In `catalog-browse.service.ts`, update the `pullSellerListings` method:

```typescript
async pullSellerListings(channelId: string, withStatus?: string) {
	const orgId = this.ctx.getOrgId();
	const channel = await this.getChannel(channelId, orgId);

	const connector = this.connectorFactory.create(
		channel.platform,
		channel.settings as Record<string, unknown>,
	);

	if (!isListingPullable(connector)) {
		throw new BadRequestException(
			`Platform '${channel.platform}' does not support pulling seller listings`,
		);
	}

	const items = await connector.pullAllSellerListings(withStatus);

	// Connector already returns NormalizedListing with title + mainImage
	// enriched via Catalog API batch lookup
	const normalized = items.map((item) => ({
		sku: item.sku,
		asin: item.externalId,
		title: item.title,
		status: item.status,
		mainImage: item.mainImage ?? null,
		parentSku: item.parentSku ?? null,
		parentAsin: item.parentExternalId ?? null,
		variationType: item.variationType ?? "standalone",
		variationTheme: item.variationTheme ?? null,
		_raw: item.raw,
	}));

	return { listings: normalized, totalCount: normalized.length };
}
```

- [ ] **Step 2: Add `parentSku` to `importListingsSchema`**

In `dto/listing.dto.ts`, update the import schema items:

```typescript
export const importListingsSchema = z.object({
	items: z
		.array(
			z
				.object({
					sku: z.string().min(1),
					asin: z.string().optional(),
					title: z.string().optional(),
					productType: z.string().optional(),
					parentAsin: z.string().optional(),
					parentSku: z.string().optional(),
				})
				.passthrough(),
		)
		.min(1)
		.max(500),
});
```

- [ ] **Step 3: Verify types compile**

Run: `pnpm --filter @ech/server exec tsc --noEmit 2>&1 | head -20`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/towers/pm/listings/catalog-browse.service.ts apps/server/src/towers/pm/listings/dto/listing.dto.ts
git commit -m "feat(pm): pass parentSku and variationType through pull listings flow"
```

---

### Task 7: Update Import Service to Use SKU-Based Tree Linking

**Files:**
- Modify: `apps/server/src/towers/pm/listings/listings-import.service.ts:264-336, 500-621`

- [ ] **Step 1: Update Phase A to collect `parentSku` alongside `parentAsin`**

In `importSellerListings`, update the Phase A collection loop (around lines 264-299):

Replace the `parentAsinSet` collection with dual-key collection:

```typescript
// Phase A: Pre-fetch all needed data in bulk
const parentAsinSet = new Set<string>();
const parentSkuSet = new Set<string>();
const uniqueFamilyCodes: string[] = [];
const uniqueProductTypes: string[] = [];
const allSkus: string[] = [];
const seenFamilyCodes = new Set<string>();
const seenProductTypes = new Set<string>();

for (const item of items) {
	const raw = (item._raw ?? {}) as Record<string, unknown>;
	const pa =
		(raw.parentAsin as string) || (item.parentAsin as string) || "";
	if (pa) parentAsinSet.add(pa);

	const ps = (item.parentSku as string) || "";
	if (ps) parentSkuSet.add(ps);

	const sku = item.sku as string;
	if (sku) allSkus.push(sku);

	const summaries =
		(raw.summaries as Array<Record<string, unknown>>)?.[0] ?? {};
	const productTypeHint =
		(summaries.productType as string) ||
		((raw.productTypes as string[]) ?? [])[0] ||
		"";

	if (productTypeHint) {
		const familyCodeGuess = `amz_${productTypeHint.toLowerCase()}`;
		if (!seenFamilyCodes.has(familyCodeGuess)) {
			seenFamilyCodes.add(familyCodeGuess);
			uniqueFamilyCodes.push(familyCodeGuess);
		}
		if (!seenProductTypes.has(productTypeHint)) {
			seenProductTypes.add(productTypeHint);
			uniqueProductTypes.push(productTypeHint);
		}
	}
}
```

- [ ] **Step 2: Update Phase B configurable detection to use parentSkuSet**

In the Phase B item loop (around lines 439-444), update configurable detection:

```typescript
const isConfigurable = parentAsinSet.has(asin) || parentSkuSet.has(sku);
const itemParentSku = (item.parentSku as string) || "";
const familyVariantId = isConfigurable
	? (asinToFamilyVariantId.get(asin) ?? null)
	: itemParentAsin
		? (asinToFamilyVariantId.get(itemParentAsin) ?? null)
		: itemParentSku
			? (asinToFamilyVariantId.get(itemParentSku) ?? null)
			: null;
```

- [ ] **Step 3: Rewrite `batchLinkParentChildren` to use SKU-based linking first**

Replace the entire `batchLinkParentChildren` method (lines 500-621):

```typescript
private async batchLinkParentChildren(
	orgId: string,
	items: Array<Record<string, unknown>>,
	details: Array<{ sku: string; action: string; productId?: string }>,
) {
	const detailBySku = new Map(details.map((d) => [d.sku, d]));
	const itemBySku = new Map(items.map((i) => [i.sku as string, i]));

	// Collect child → parent mappings (prefer SKU-based, fall back to ASIN-based)
	const childProductToParentSku = new Map<string, string>();
	const childProductToParentAsin = new Map<string, string>();

	for (const detail of details) {
		if (!detail.productId) continue;
		const item = itemBySku.get(detail.sku);
		if (!item) continue;

		const parentSku = (item.parentSku as string) || "";
		if (parentSku) {
			childProductToParentSku.set(detail.productId, parentSku);
			continue;
		}

		const raw = (item._raw ?? {}) as Record<string, unknown>;
		const parentAsin =
			(raw.parentAsin as string) || (item.parentAsin as string) || "";
		if (parentAsin) {
			childProductToParentAsin.set(detail.productId, parentAsin);
		}
	}

	// Strategy 1: SKU-based linking (direct — parent product found by SKU in same batch)
	const childrenToUpdate: Array<{
		childId: string;
		parentProductId: string;
		familyId: string | null;
		familyVariantId: string | null;
	}> = [];
	const parentProductIds = new Set<string>();
	const unresolvedByAsin = new Map<string, string>(); // childProductId → parentAsin

	if (childProductToParentSku.size > 0) {
		const parentSkus = [...new Set(childProductToParentSku.values())];
		const parentProducts = await this.db
			.select({
				id: products.id,
				sku: products.sku,
				familyId: products.familyId,
				familyVariantId: products.familyVariantId,
			})
			.from(products)
			.where(
				and(
					eq(products.organizationId, orgId),
					inArray(products.sku, parentSkus),
					isNull(products.deletedAt),
				),
			);

		const parentSkuToProduct = new Map(
			parentProducts.map((p) => [p.sku, p]),
		);

		for (const [childProductId, parentSku] of childProductToParentSku) {
			const parent = parentSkuToProduct.get(parentSku);
			if (parent) {
				childrenToUpdate.push({
					childId: childProductId,
					parentProductId: parent.id,
					familyId: parent.familyId,
					familyVariantId: parent.familyVariantId,
				});
				parentProductIds.add(parent.id);
			}
		}
	}

	// Strategy 2: ASIN-based linking (fallback — lookup via channelListings.externalId)
	if (childProductToParentAsin.size > 0) {
		const parentAsins = [...new Set(childProductToParentAsin.values())];
		const parentListingRows = await this.db
			.select({
				externalId: channelListings.externalId,
				productId: channelListings.productId,
			})
			.from(channelListings)
			.where(
				and(
					eq(channelListings.organizationId, orgId),
					inArray(channelListings.externalId, parentAsins),
				),
			);

		const parentAsinToProductId = new Map(
			parentListingRows.map((r) => [r.externalId, r.productId]),
		);

		const asinParentProductIds = [
			...new Set([...parentAsinToProductId.values()]),
		];
		const parentProducts = await this.db
			.select({
				id: products.id,
				familyId: products.familyId,
				familyVariantId: products.familyVariantId,
			})
			.from(products)
			.where(inArray(products.id, asinParentProductIds));

		const parentIdToFamily = new Map(
			parentProducts.map((p) => [
				p.id,
				{ familyId: p.familyId, familyVariantId: p.familyVariantId },
			]),
		);

		for (const [childProductId, parentAsin] of childProductToParentAsin) {
			const parentProductId = parentAsinToProductId.get(parentAsin);
			if (parentProductId) {
				const parentFamily = parentIdToFamily.get(parentProductId);
				childrenToUpdate.push({
					childId: childProductId,
					parentProductId,
					familyId: parentFamily?.familyId ?? null,
					familyVariantId: parentFamily?.familyVariantId ?? null,
				});
				parentProductIds.add(parentProductId);
			}
		}
	}

	if (childrenToUpdate.length === 0) return;

	// Batch UPDATE all children
	const childIds = childrenToUpdate.map((c) => c.childId);
	await this.db.execute(sql`
		UPDATE products
		SET
			parent_id = CASE id
				${sql.join(
					childrenToUpdate.map(
						(c) => sql`WHEN ${c.childId} THEN ${c.parentProductId}`,
					),
					sql` `,
				)}
				ELSE parent_id
			END,
			family_id = CASE id
				${sql.join(
					childrenToUpdate.map(
						(c) => sql`WHEN ${c.childId} THEN ${c.familyId}`,
					),
					sql` `,
				)}
				ELSE family_id
			END,
			family_variant_id = CASE id
				${sql.join(
					childrenToUpdate.map(
						(c) => sql`WHEN ${c.childId} THEN ${c.familyVariantId}`,
					),
					sql` `,
				)}
				ELSE family_variant_id
			END
		WHERE id IN (${sql.join(
			childIds.map((id) => sql`${id}`),
			sql`, `,
		)})
	`);

	// Mark parents as configurable
	const allParentIds = [...parentProductIds];
	if (allParentIds.length > 0) {
		await this.db
			.update(products)
			.set({ productType: "configurable" })
			.where(inArray(products.id, allParentIds));
	}
}
```

Key improvements:
1. SKU-based linking is tried first (1 DB query: `SELECT products WHERE sku IN parentSkus`)
2. ASIN-based linking is fallback only for items without `parentSku` (2 DB queries, same as before)
3. Both strategies feed into the same `childrenToUpdate` array for a single batch UPDATE

- [ ] **Step 4: Run all tests**

Run: `pnpm --filter @ech/server test 2>&1 | tail -20`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/towers/pm/listings/listings-import.service.ts
git commit -m "feat(pm): use SKU-based parent-child linking in import with ASIN fallback"
```

---

### Task 8: Run Full Test Suite and Verify

**Files:** None (verification only)

- [ ] **Step 1: Run full server test suite**

Run: `pnpm --filter @ech/server test 2>&1 | tail -40`
Expected: All tests PASS.

- [ ] **Step 2: Run type check**

Run: `pnpm --filter @ech/server exec tsc --noEmit 2>&1 | head -20`
Expected: No type errors.

- [ ] **Step 3: Run lint**

Run: `pnpm lint 2>&1 | tail -20`
Expected: No lint errors (Biome auto-fix via pre-commit will handle formatting).

- [ ] **Step 4: Final commit if any fixups needed**

Only if Steps 1-3 revealed issues that needed fixing.
