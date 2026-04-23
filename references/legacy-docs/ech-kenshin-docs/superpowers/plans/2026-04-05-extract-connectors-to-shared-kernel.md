# Extract Connectors to Shared-Kernel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the connector infrastructure from `towers/pm/connectors/` to `shared-kernel/infrastructure/connectors/` so all towers (PM, INV, OMS, FUL) can share a single marketplace connector system without depending on the PM tower.

**Architecture:** The connector system uses a self-registering factory pattern with capability-based interfaces. Currently all interfaces (core + capabilities) are PM-centric. This refactor: (1) moves the infrastructure to shared-kernel, (2) slims `IChannelConnector` to only generic methods, (3) keeps PM-specific methods in optional capability interfaces, (4) adds stub capability interfaces for INV/OMS/FUL towers, (5) breaks the `AttributeMapping` cross-dependency between connectors and listings.

**Tech Stack:** NestJS 11, TypeScript strict, Vitest, Drizzle ORM, pnpm monorepo

---

## File Structure

### Files to CREATE (new location)

```
apps/server/src/shared-kernel/infrastructure/connectors/
├── connector.interface.ts          ← Base IChannelConnector (slim) + ChannelSettings + ConnectorCapabilities
├── connector.registry.ts           ← registerConnector / getConnectorClass / getSupportedPlatforms (unchanged logic)
├── connector.factory.ts            ← ConnectorFactory Injectable (unchanged logic)
├── connectors.module.ts            ← @Global() NestJS module exporting ConnectorFactory
├── index.ts                        ← Barrel export
│
├── capabilities/
│   ├── catalog.capability.ts       ← ICatalogSearchable + CatalogSearchQuery/Result/TreeResult + type guard
│   ├── listing.capability.ts       ← IListingPullable + NormalizedListing/VariationForest/ImportResult + type guard
│   ├── restriction.capability.ts   ← IRestrictionCheckable + ListingsRestriction/ItemIssue + type guard
│   ├── product-type.capability.ts  ← IProductTypeSearchable + ProductTypeSchema + type guard
│   ├── listing-submission.capability.ts ← IListingSubmittable + ListingPayload/SubmissionResult (extracted from IChannelConnector)
│   ├── inventory.capability.ts     ← IInventorySyncable + stub types (for INV tower future use)
│   ├── order.capability.ts         ← IOrderPullable + stub types (for OMS tower future use)
│   ├── fulfillment.capability.ts   ← IFulfillmentTrackable + stub types (for FUL tower future use)
│   └── index.ts                    ← Barrel export for all capabilities
│
└── amazon/
    ├── amazon.connector.ts         ← AmazonConnector (moved, updated imports)
    ├── amazon-auth.client.ts       ← AmazonAuthClient (moved unchanged)
    ├── amazon-payload-builder.ts   ← AmazonPayloadBuilder (moved, fix AttributeMapping dependency)
    ├── amazon-schema-validator.ts  ← AmazonSchemaValidator (moved unchanged)
    ├── amazon-default-mappings.ts  ← Default mappings (moved, fix AttributeMapping dependency)
    ├── amazon.types.ts             ← AmazonCredentials, AMAZON_REGIONS (moved unchanged)
    ├── amazon.connector.spec.ts    ← Tests (moved, updated imports)
    ├── amazon-auth.client.spec.ts  ← Tests (moved unchanged)
    ├── amazon-payload-builder.spec.ts ← Tests (moved, updated imports)
    ├── amazon-schema-validator.spec.ts ← Tests (moved unchanged)
    └── index.ts                    ← Barrel export
```

### Files to DELETE (old location)

```
apps/server/src/towers/pm/connectors/   ← entire directory removed
```

### Files to MODIFY (update imports)

```
apps/server/src/towers/pm/channels/channels.module.ts
apps/server/src/towers/pm/channels/channels.service.ts
apps/server/src/towers/pm/channels/channels.service.spec.ts
apps/server/src/towers/pm/schema-sync/schema-sync.module.ts
apps/server/src/towers/pm/schema-sync/schema-sync.service.ts
apps/server/src/towers/pm/schema-sync/schema-sync.service.spec.ts
apps/server/src/towers/pm/schema-sync/schema-sync.worker.ts
apps/server/src/towers/pm/schema-sync/auto-mapping-generator.ts
apps/server/src/towers/pm/listings/listings.module.ts
apps/server/src/towers/pm/listings/catalog-browse.service.ts
apps/server/src/towers/pm/listings/catalog-browse.service.spec.ts
apps/server/src/towers/pm/listings/listings-submission.service.ts
apps/server/src/towers/pm/listings/listings-submission.service.spec.ts
apps/server/src/towers/pm/listings/listings-submit.worker.ts
apps/server/src/towers/pm/listings/listing-monitor.worker.ts
apps/server/src/towers/pm/listings/listings-form.service.spec.ts
apps/server/src/towers/pm/listings/mapping-preset-resolver.ts
apps/server/src/app.module.ts
```

---

## Task 1: Create base connector interfaces in shared-kernel

**Files:**
- Create: `apps/server/src/shared-kernel/infrastructure/connectors/connector.interface.ts`

This is the slim base interface. Only `validateCredentials()` and `platform` are required. Listing submission methods are extracted to a separate capability.

- [ ] **Step 1: Create the base interface file**

```typescript
// apps/server/src/shared-kernel/infrastructure/connectors/connector.interface.ts

// ─── Channel Settings ─────────────────────────────────────────────────────────

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

- [ ] **Step 2: Verify the file compiles**

Run: `cd /Users/minhpham/Workspase/ech-kenshin && npx tsc --noEmit --project apps/server/tsconfig.app.json 2>&1 | head -20`
Expected: No errors from this new file (other files may have errors since refactor is incomplete)

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/shared-kernel/infrastructure/connectors/connector.interface.ts
git commit -m "refactor(connectors): create slim IChannelConnector base in shared-kernel"
```

---

## Task 2: Create capability interfaces for PM tower

**Files:**
- Create: `apps/server/src/shared-kernel/infrastructure/connectors/capabilities/catalog.capability.ts`
- Create: `apps/server/src/shared-kernel/infrastructure/connectors/capabilities/listing.capability.ts`
- Create: `apps/server/src/shared-kernel/infrastructure/connectors/capabilities/restriction.capability.ts`
- Create: `apps/server/src/shared-kernel/infrastructure/connectors/capabilities/product-type.capability.ts`
- Create: `apps/server/src/shared-kernel/infrastructure/connectors/capabilities/listing-submission.capability.ts`
- Create: `apps/server/src/shared-kernel/infrastructure/connectors/capabilities/index.ts`

These extract all PM-specific methods and types from the old monolithic `connector.interface.ts` into focused capability files.

- [ ] **Step 1: Create catalog capability**

```typescript
// apps/server/src/shared-kernel/infrastructure/connectors/capabilities/catalog.capability.ts

import type { DimensionSet, IChannelConnector } from "../connector.interface";

export interface CatalogSearchQuery {
	identifierType: string;
	identifier: string;
	marketplaceId?: string;
}

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
		attributes?: Record<string, unknown>;
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
	}>;
}

export interface CatalogTreeResult {
	parent: {
		externalId: string;
		title: string;
		images?: Array<{ link: string }>;
		productTypes?: string[];
	};
	children: Array<{
		externalId: string;
		title: string;
		parentExternalId: string;
		images?: Array<{ link: string }>;
	}>;
	totalItems: number;
}

export interface ICatalogSearchable {
	searchCatalogItems(query: CatalogSearchQuery): Promise<CatalogSearchResult>;
	getCatalogTree?(identifier: string): Promise<CatalogTreeResult>;
}

export function isCatalogSearchable(
	c: IChannelConnector,
): c is IChannelConnector & ICatalogSearchable {
	return c.capabilities.canSearchCatalog;
}
```

- [ ] **Step 2: Create listing capability**

```typescript
// apps/server/src/shared-kernel/infrastructure/connectors/capabilities/listing.capability.ts

import type { DimensionSet, IChannelConnector } from "../connector.interface";

export interface NormalizedListing {
	sku: string;
	externalId: string;
	title: string;
	status: string;
	mainImage?: string;
	productType?: string;
	parentExternalId?: string;
	parentSku?: string;
	childSkus?: string[];
	childExternalIds?: string[];
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

export interface VariationTreeNode {
	parent: NormalizedListing;
	children: NormalizedListing[];
	variationTheme?: string[];
}

export interface VariationForest {
	trees: Map<string, VariationTreeNode>;
	standalone: NormalizedListing[];
	orphanChildren: NormalizedListing[];
}

export interface ImportableItem {
	sku: string;
	externalId?: string;
	title?: string;
	productType?: string;
	parentExternalId?: string;
	[key: string]: unknown;
}

export interface ImportResult {
	created: number;
	linked: number;
	skipped: number;
	failed: number;
	details: Array<{
		sku: string;
		action: string;
		productId?: string;
		error?: string;
	}>;
}

export interface IListingPullable {
	pullAllSellerListings(status?: string): Promise<NormalizedListing[]>;
	pullAllSellerListingsWithTree?(options?: {
		withStatus?: string;
	}): Promise<{ listings: NormalizedListing[]; forest: VariationForest }>;
	importSellerListings?(items: ImportableItem[]): Promise<ImportResult>;
}

export function isListingPullable(
	c: IChannelConnector,
): c is IChannelConnector & IListingPullable {
	return c.capabilities.canPullListings;
}
```

- [ ] **Step 3: Create restriction capability**

```typescript
// apps/server/src/shared-kernel/infrastructure/connectors/capabilities/restriction.capability.ts

import type { IChannelConnector } from "../connector.interface";

export interface ListingsRestriction {
	marketplaceId: string;
	conditionType: string;
	reasons: Array<{
		reasonCode: string;
		message: string;
		links?: Array<{ resource: string; verb: string; title: string }>;
	}>;
}

export interface ListingsItemIssue {
	code: string;
	message: string;
	severity: "ERROR" | "WARNING";
	attributeNames?: string[];
	categories?: string[];
	enforcements?: {
		actions: Array<{ action: string }>;
		exemption?: { status: string; expiryDate?: string };
	};
}

export interface ListingsItemWithIssues {
	sku: string;
	summaries?: Array<{
		marketplaceId: string;
		asin: string;
		status: string[];
		itemName?: string;
	}>;
	issues?: ListingsItemIssue[];
}

export interface IRestrictionCheckable {
	getListingsRestrictions(
		identifier: string,
		conditionType?: string,
	): Promise<{ restrictions: ListingsRestriction[] }>;
	getListingsItemWithIssues?(sku: string): Promise<ListingsItemWithIssues>;
}

export function isRestrictionCheckable(
	c: IChannelConnector,
): c is IChannelConnector & IRestrictionCheckable {
	return c.capabilities.canCheckRestrictions;
}
```

- [ ] **Step 4: Create product-type capability**

```typescript
// apps/server/src/shared-kernel/infrastructure/connectors/capabilities/product-type.capability.ts

import type { IChannelConnector } from "../connector.interface";

export interface ProductTypeSchema {
	productType: string;
	schema: Record<string, unknown>;
	attributes: string[];
	version?: string;
	checksum?: string;
	schemaUrl?: string;
	propertyGroups?: Record<string, unknown>;
}

export interface IProductTypeSearchable {
	searchProductTypes(
		keywords?: string,
	): Promise<Array<{ name: string; displayName: string }>>;
	searchListingsItems?(options?: {
		pageSize?: number;
		pageToken?: string;
		withStatus?: string;
	}): Promise<{ items: Array<Record<string, unknown>>; nextToken?: string }>;
}

export function isProductTypeSearchable(
	c: IChannelConnector,
): c is IChannelConnector & IProductTypeSearchable {
	return c.capabilities.canSearchProductTypes;
}
```

- [ ] **Step 5: Create listing-submission capability (extracted from IChannelConnector)**

```typescript
// apps/server/src/shared-kernel/infrastructure/connectors/capabilities/listing-submission.capability.ts

import type { IChannelConnector } from "../connector.interface";

export interface ListingPayload {
	productType: string;
	requirements: string;
	attributes: Record<string, unknown>;
}

export interface ListingSubmissionResult {
	submissionId: string;
	status: string;
	issues?: Array<{ code: string; message: string }>;
}

export interface ProductTypeSchema {
	productType: string;
	schema: Record<string, unknown>;
	attributes: string[];
	version?: string;
	checksum?: string;
	schemaUrl?: string;
	propertyGroups?: Record<string, unknown>;
}

export interface IListingSubmittable {
	getProductTypeDefinitions(
		productType: string,
		requirementsMode?: string,
	): Promise<ProductTypeSchema>;
	putListingsItem(
		sku: string,
		payload: ListingPayload,
	): Promise<ListingSubmissionResult>;
	patchListingsItem(
		sku: string,
		payload: Partial<ListingPayload>,
	): Promise<ListingSubmissionResult>;
	getListingsItem(sku: string): Promise<Record<string, unknown>>;
}

export function isListingSubmittable(
	c: IChannelConnector,
): c is IChannelConnector & IListingSubmittable {
	return c.capabilities.canSubmitListings;
}
```

**Wait — `ProductTypeSchema` is duplicated between `product-type.capability.ts` and `listing-submission.capability.ts`.** It should only live in `product-type.capability.ts` and be re-exported. Let me fix:

Remove the `ProductTypeSchema` interface from `listing-submission.capability.ts` and import it instead:

```typescript
// apps/server/src/shared-kernel/infrastructure/connectors/capabilities/listing-submission.capability.ts

import type { IChannelConnector } from "../connector.interface";
import type { ProductTypeSchema } from "./product-type.capability";

export interface ListingPayload {
	productType: string;
	requirements: string;
	attributes: Record<string, unknown>;
}

export interface ListingSubmissionResult {
	submissionId: string;
	status: string;
	issues?: Array<{ code: string; message: string }>;
}

export interface IListingSubmittable {
	getProductTypeDefinitions(
		productType: string,
		requirementsMode?: string,
	): Promise<ProductTypeSchema>;
	putListingsItem(
		sku: string,
		payload: ListingPayload,
	): Promise<ListingSubmissionResult>;
	patchListingsItem(
		sku: string,
		payload: Partial<ListingPayload>,
	): Promise<ListingSubmissionResult>;
	getListingsItem(sku: string): Promise<Record<string, unknown>>;
}

export function isListingSubmittable(
	c: IChannelConnector,
): c is IChannelConnector & IListingSubmittable {
	return c.capabilities.canSubmitListings;
}
```

- [ ] **Step 6: Create capabilities barrel export**

```typescript
// apps/server/src/shared-kernel/infrastructure/connectors/capabilities/index.ts

export type {
	CatalogSearchQuery,
	CatalogSearchResult,
	CatalogTreeResult,
	ICatalogSearchable,
} from "./catalog.capability";
export { isCatalogSearchable } from "./catalog.capability";

export type {
	IListingPullable,
	ImportableItem,
	ImportResult,
	NormalizedListing,
	VariationForest,
	VariationTreeNode,
} from "./listing.capability";
export { isListingPullable } from "./listing.capability";

export type {
	IRestrictionCheckable,
	ListingsItemIssue,
	ListingsItemWithIssues,
	ListingsRestriction,
} from "./restriction.capability";
export { isRestrictionCheckable } from "./restriction.capability";

export type {
	IProductTypeSearchable,
	ProductTypeSchema,
} from "./product-type.capability";
export { isProductTypeSearchable } from "./product-type.capability";

export type {
	IListingSubmittable,
	ListingPayload,
	ListingSubmissionResult,
} from "./listing-submission.capability";
export { isListingSubmittable } from "./listing-submission.capability";
```

- [ ] **Step 7: Commit**

```bash
git add apps/server/src/shared-kernel/infrastructure/connectors/capabilities/
git commit -m "refactor(connectors): create PM capability interfaces in shared-kernel"
```

---

## Task 3: Create stub capability interfaces for INV/OMS/FUL towers

**Files:**
- Create: `apps/server/src/shared-kernel/infrastructure/connectors/capabilities/inventory.capability.ts`
- Create: `apps/server/src/shared-kernel/infrastructure/connectors/capabilities/order.capability.ts`
- Create: `apps/server/src/shared-kernel/infrastructure/connectors/capabilities/fulfillment.capability.ts`
- Modify: `apps/server/src/shared-kernel/infrastructure/connectors/capabilities/index.ts`

These are stub interfaces — types and methods are defined but not yet implemented in any connector. They serve as contracts for future tower development.

- [ ] **Step 1: Create inventory capability (for INV tower)**

```typescript
// apps/server/src/shared-kernel/infrastructure/connectors/capabilities/inventory.capability.ts

import type { IChannelConnector } from "../connector.interface";

export interface InventorySummary {
	sku: string;
	fnSku?: string;
	asin?: string;
	condition?: string;
	totalQuantity: number;
	fulfillableQuantity: number;
	inboundQuantity: number;
	reservedQuantity: number;
	unfulfillableQuantity: number;
	lastUpdatedAt?: string;
}

export interface InventoryUpdate {
	sku: string;
	quantity: number;
	fulfillmentChannel?: string;
}

export interface InventoryUpdateResult {
	sku: string;
	status: "SUCCESS" | "FAILED";
	error?: string;
}

export interface IInventorySyncable {
	getInventorySummaries(options?: {
		skus?: string[];
		nextToken?: string;
	}): Promise<{ summaries: InventorySummary[]; nextToken?: string }>;

	updateInventory(
		updates: InventoryUpdate[],
	): Promise<InventoryUpdateResult[]>;
}

export function isInventorySyncable(
	c: IChannelConnector,
): c is IChannelConnector & IInventorySyncable {
	return c.capabilities.canSyncInventory;
}
```

- [ ] **Step 2: Create order capability (for OMS tower)**

```typescript
// apps/server/src/shared-kernel/infrastructure/connectors/capabilities/order.capability.ts

import type { IChannelConnector } from "../connector.interface";

export interface NormalizedOrder {
	orderId: string;
	externalOrderId: string;
	status: string;
	purchaseDate: string;
	lastUpdateDate: string;
	buyerEmail?: string;
	shippingAddress?: {
		name?: string;
		addressLine1?: string;
		addressLine2?: string;
		city?: string;
		stateOrRegion?: string;
		postalCode?: string;
		countryCode?: string;
	};
	orderTotal?: { amount: number; currency: string };
	items: NormalizedOrderItem[];
	fulfillmentChannel?: string;
	raw: Record<string, unknown>;
}

export interface NormalizedOrderItem {
	orderItemId: string;
	sku: string;
	externalId?: string;
	title: string;
	quantity: number;
	unitPrice?: { amount: number; currency: string };
	status?: string;
}

export interface IOrderPullable {
	getOrders(options?: {
		createdAfter?: string;
		createdBefore?: string;
		statuses?: string[];
		nextToken?: string;
	}): Promise<{ orders: NormalizedOrder[]; nextToken?: string }>;

	getOrderItems(
		orderId: string,
	): Promise<NormalizedOrderItem[]>;
}

export function isOrderPullable(
	c: IChannelConnector,
): c is IChannelConnector & IOrderPullable {
	return c.capabilities.canPullOrders;
}
```

- [ ] **Step 3: Create fulfillment capability (for FUL tower)**

```typescript
// apps/server/src/shared-kernel/infrastructure/connectors/capabilities/fulfillment.capability.ts

import type { IChannelConnector } from "../connector.interface";

export interface FulfillmentOrder {
	fulfillmentOrderId: string;
	status: string;
	statusUpdatedAt?: string;
	items: Array<{
		sku: string;
		quantity: number;
		fulfillableQuantity?: number;
	}>;
	shippingAddress: {
		name: string;
		addressLine1: string;
		city: string;
		stateOrRegion?: string;
		postalCode: string;
		countryCode: string;
	};
	raw: Record<string, unknown>;
}

export interface ShipmentInfo {
	shipmentId: string;
	status: string;
	trackingNumber?: string;
	carrier?: string;
	estimatedArrival?: string;
}

export interface IFulfillmentTrackable {
	createFulfillmentOrder(order: {
		orderId: string;
		items: Array<{ sku: string; quantity: number }>;
		shippingAddress: FulfillmentOrder["shippingAddress"];
		shippingSpeed?: string;
	}): Promise<{ fulfillmentOrderId: string; status: string }>;

	getFulfillmentOrder(
		fulfillmentOrderId: string,
	): Promise<FulfillmentOrder>;

	getShipmentInfo(
		fulfillmentOrderId: string,
	): Promise<ShipmentInfo[]>;
}

export function isFulfillmentTrackable(
	c: IChannelConnector,
): c is IChannelConnector & IFulfillmentTrackable {
	return c.capabilities.canTrackFulfillment;
}
```

- [ ] **Step 4: Update capabilities barrel to include new stubs**

Add to the end of `apps/server/src/shared-kernel/infrastructure/connectors/capabilities/index.ts`:

```typescript
// ─── INV tower capabilities ──────────────────────────────────────────────────

export type {
	IInventorySyncable,
	InventorySummary,
	InventoryUpdate,
	InventoryUpdateResult,
} from "./inventory.capability";
export { isInventorySyncable } from "./inventory.capability";

// ─── OMS tower capabilities ──────────────────────────────────────────────────

export type {
	IOrderPullable,
	NormalizedOrder,
	NormalizedOrderItem,
} from "./order.capability";
export { isOrderPullable } from "./order.capability";

// ─── FUL tower capabilities ──────────────────────────────────────────────────

export type {
	FulfillmentOrder,
	IFulfillmentTrackable,
	ShipmentInfo,
} from "./fulfillment.capability";
export { isFulfillmentTrackable } from "./fulfillment.capability";
```

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/shared-kernel/infrastructure/connectors/capabilities/
git commit -m "refactor(connectors): add stub capability interfaces for INV, OMS, FUL towers"
```

---

## Task 4: Move connector registry, factory, and module to shared-kernel

**Files:**
- Create: `apps/server/src/shared-kernel/infrastructure/connectors/connector.registry.ts`
- Create: `apps/server/src/shared-kernel/infrastructure/connectors/connector.factory.ts`
- Create: `apps/server/src/shared-kernel/infrastructure/connectors/connectors.module.ts`

- [ ] **Step 1: Create connector registry (unchanged logic)**

```typescript
// apps/server/src/shared-kernel/infrastructure/connectors/connector.registry.ts

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
```

- [ ] **Step 2: Create connector factory (unchanged logic)**

```typescript
// apps/server/src/shared-kernel/infrastructure/connectors/connector.factory.ts

import { BadRequestException, Injectable } from "@nestjs/common";
import type { IChannelConnector } from "./connector.interface";
import { getConnectorClass, getSupportedPlatforms } from "./connector.registry";

@Injectable()
export class ConnectorFactory {
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
		return new ConnectorClass(settings);
	}
}
```

- [ ] **Step 3: Create connectors module (now @Global)**

```typescript
// apps/server/src/shared-kernel/infrastructure/connectors/connectors.module.ts

import { Global, Module } from "@nestjs/common";
import { ConnectorFactory } from "./connector.factory";

@Global()
@Module({
	providers: [ConnectorFactory],
	exports: [ConnectorFactory],
})
export class ConnectorsModule {}
```

**Note:** Making this `@Global()` follows the shared-kernel convention (same as `DrizzleModule`, `BetterAuthModule`, `RequestContextModule`). This means towers don't need to explicitly import `ConnectorsModule` — `ConnectorFactory` is available everywhere.

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/shared-kernel/infrastructure/connectors/connector.registry.ts
git add apps/server/src/shared-kernel/infrastructure/connectors/connector.factory.ts
git add apps/server/src/shared-kernel/infrastructure/connectors/connectors.module.ts
git commit -m "refactor(connectors): move registry, factory, module to shared-kernel"
```

---

## Task 5: Move Amazon connector to shared-kernel

**Files:**
- Create: `apps/server/src/shared-kernel/infrastructure/connectors/amazon/amazon.types.ts`
- Create: `apps/server/src/shared-kernel/infrastructure/connectors/amazon/amazon-auth.client.ts`
- Create: `apps/server/src/shared-kernel/infrastructure/connectors/amazon/amazon-schema-validator.ts`
- Create: `apps/server/src/shared-kernel/infrastructure/connectors/amazon/amazon-payload-builder.ts`
- Create: `apps/server/src/shared-kernel/infrastructure/connectors/amazon/amazon-default-mappings.ts`
- Create: `apps/server/src/shared-kernel/infrastructure/connectors/amazon/amazon.connector.ts`
- Create: `apps/server/src/shared-kernel/infrastructure/connectors/amazon/index.ts`

- [ ] **Step 1: Copy amazon.types.ts (unchanged)**

```typescript
// apps/server/src/shared-kernel/infrastructure/connectors/amazon/amazon.types.ts

export const LWA_TOKEN_URL = "https://api.amazon.com/auth/o2/token";

export const AMAZON_REGIONS: Record<string, string> = {
	na: "https://sellingpartnerapi-na.amazon.com",
	eu: "https://sellingpartnerapi-eu.amazon.com",
	fe: "https://sellingpartnerapi-fe.amazon.com",
};

export interface AmazonCredentials {
	sellerId: string;
	marketplaceId: string;
	refreshToken: string;
	clientId: string;
	clientSecret: string;
	region: "na" | "eu" | "fe";
}
```

- [ ] **Step 2: Copy amazon-auth.client.ts (unchanged — only internal imports)**

Copy the file verbatim from `towers/pm/connectors/amazon/amazon-auth.client.ts`. The only import is `./amazon.types` which stays co-located.

```bash
cp apps/server/src/towers/pm/connectors/amazon/amazon-auth.client.ts \
   apps/server/src/shared-kernel/infrastructure/connectors/amazon/amazon-auth.client.ts
```

- [ ] **Step 3: Copy amazon-schema-validator.ts (unchanged — no cross-module imports)**

```bash
cp apps/server/src/towers/pm/connectors/amazon/amazon-schema-validator.ts \
   apps/server/src/shared-kernel/infrastructure/connectors/amazon/amazon-schema-validator.ts
```

- [ ] **Step 4: Move amazon-payload-builder.ts (fix cross-module import)**

The original imports `AttributeMapping` from `../../listings/mapping-engine`. This creates an upward dependency on PM tower. Fix by inlining the interface (it's just 5 fields):

```typescript
// apps/server/src/shared-kernel/infrastructure/connectors/amazon/amazon-payload-builder.ts

/**
 * AmazonPayloadBuilder — transforms ECH product values into Amazon SP-API JSON format.
 */

import type { ListingPayload } from "../capabilities/listing-submission.capability";

/** Minimal mapping type — avoids dependency on PM tower's MappingEngine */
export interface AttributeMapping {
	sourceAttributeCode: string;
	targetAttributePath: string;
	mappingType: "direct" | "transform" | "static" | "computed";
	transformRules?: Record<string, unknown>;
}

export interface AmazonBuildContext {
	marketplaceId: string;
	languageTag: string;
	listingMode: "new_product" | "existing_asin";
	productType: string;
	asin?: string;
	conditionType?: string;
}

export interface OfferValues {
	price: number;
	currency: string;
	quantity: number;
	shippingGroup?: string;
}

export interface BuildResult extends ListingPayload {
	productType: string;
	requirements: string;
	attributes: Record<string, unknown>;
}

/** Attributes that Amazon does NOT require a language_tag on */
const NO_LANGUAGE_TAG_ATTRS = new Set([
	"country_of_origin",
	"condition_type",
	"merchant_suggested_asin",
	"fulfillment_availability",
	"purchasable_offer",
	"merchant_shipping_group",
]);

export class AmazonPayloadBuilder {
	static buildOfferPayload(
		context: AmazonBuildContext,
		values: OfferValues,
	): BuildResult {
		const { marketplaceId, asin, conditionType = "new_new" } = context;
		const { price, currency, quantity, shippingGroup } = values;

		const attributes: Record<string, unknown> = {
			merchant_suggested_asin: [{ value: asin, marketplace_id: marketplaceId }],
			condition_type: [{ value: conditionType, marketplace_id: marketplaceId }],
			fulfillment_availability: [
				{
					fulfillment_channel_code: "DEFAULT",
					quantity,
					marketplace_id: marketplaceId,
				},
			],
			purchasable_offer: [
				{
					currency,
					marketplace_id: marketplaceId,
					our_price: [{ schedule: [{ value_with_tax: price }] }],
				},
			],
		};

		if (shippingGroup) {
			attributes.merchant_shipping_group = [
				{ value: shippingGroup, marketplace_id: marketplaceId },
			];
		}

		return {
			productType: context.productType,
			requirements: "LISTING_OFFER_ONLY",
			attributes,
		};
	}

	static buildProductPayload(
		context: AmazonBuildContext,
		productValues: Record<string, unknown>,
		channelValues: Record<string, unknown>,
		mappings: AttributeMapping[],
	): BuildResult {
		const { marketplaceId, languageTag } = context;
		const mappedKeys = new Set(mappings.map((m) => m.sourceAttributeCode));
		const merged = { ...productValues, ...channelValues };

		const attributes: Record<string, unknown> = {};

		for (const [key, value] of Object.entries(merged)) {
			if (value === undefined || value === null) continue;
			if (!mappedKeys.has(key) && Array.isArray(value)) {
				attributes[key] = value;
			} else {
				attributes[key] = AmazonPayloadBuilder.wrapValue(
					value,
					marketplaceId,
					languageTag,
					key,
				);
			}
		}

		return {
			productType: context.productType,
			requirements: "LISTING",
			attributes,
		};
	}

	static wrapValue(
		value: unknown,
		marketplaceId: string,
		languageTag: string,
		attributeKey?: string,
	): unknown[] {
		if (Array.isArray(value)) return value;

		const withoutLanguage = attributeKey
			? NO_LANGUAGE_TAG_ATTRS.has(attributeKey)
			: false;

		if (withoutLanguage) {
			return [{ value, marketplace_id: marketplaceId }];
		}

		return [
			{ value, marketplace_id: marketplaceId, language_tag: languageTag },
		];
	}

	static buildPatchPayload(
		productType: string,
		updates: Record<string, unknown>,
		marketplaceId: string,
		languageTag: string,
	): {
		productType: string;
		patches: Array<{ op: string; path: string; value: unknown }>;
	} {
		const patches = Object.entries(updates)
			.filter(([, v]) => v !== undefined && v !== null)
			.map(([key, value]) => ({
				op: "replace",
				path: `/attributes/${key}`,
				value: AmazonPayloadBuilder.wrapValue(
					value,
					marketplaceId,
					languageTag,
					key,
				),
			}));

		return { productType, patches };
	}
}
```

- [ ] **Step 5: Move amazon-default-mappings.ts (fix cross-module import)**

Use the `AttributeMapping` type from the payload builder instead of the PM tower's mapping-engine:

```typescript
// apps/server/src/shared-kernel/infrastructure/connectors/amazon/amazon-default-mappings.ts

import type { AttributeMapping } from "./amazon-payload-builder";

/**
 * Default Amazon → PIM attribute mappings.
 * Used when no custom channel_attribute_mappings exist in DB.
 */
export const AMAZON_DEFAULT_MAPPINGS: AttributeMapping[] = [
	// Product Identity
	{ sourceAttributeCode: "item_name", targetAttributePath: "item_name", mappingType: "direct" },
	{ sourceAttributeCode: "brand", targetAttributePath: "brand", mappingType: "direct" },
	{ sourceAttributeCode: "asin", targetAttributePath: "summaries.0.asin", mappingType: "direct" },
	{ sourceAttributeCode: "gtin", targetAttributePath: "externally_assigned_product_identifier", mappingType: "direct" },
	{ sourceAttributeCode: "manufacturer", targetAttributePath: "manufacturer", mappingType: "direct" },
	{ sourceAttributeCode: "model_number", targetAttributePath: "model_number", mappingType: "direct" },
	// Product Detail
	{ sourceAttributeCode: "description", targetAttributePath: "product_description", mappingType: "direct" },
	{ sourceAttributeCode: "bullet_point", targetAttributePath: "bullet_point", mappingType: "direct" },
	{ sourceAttributeCode: "category", targetAttributePath: "summaries.0.productType", mappingType: "direct" },
	{ sourceAttributeCode: "condition", targetAttributePath: "condition_type", mappingType: "direct" },
	{ sourceAttributeCode: "color", targetAttributePath: "color", mappingType: "direct" },
	{ sourceAttributeCode: "size", targetAttributePath: "size", mappingType: "direct" },
	{ sourceAttributeCode: "material", targetAttributePath: "material", mappingType: "direct" },
	{ sourceAttributeCode: "number_of_items", targetAttributePath: "number_of_items", mappingType: "direct" },
	{ sourceAttributeCode: "country_of_origin", targetAttributePath: "country_of_origin", mappingType: "direct" },
	// Pricing
	{ sourceAttributeCode: "base_price", targetAttributePath: "purchasable_offer.0.our_price.0.schedule.0.value_with_tax", mappingType: "direct" },
	{ sourceAttributeCode: "currency", targetAttributePath: "purchasable_offer.0.our_price.0.schedule.0.currency", mappingType: "direct" },
	// Media
	{ sourceAttributeCode: "main_image", targetAttributePath: "main_product_image_locator", mappingType: "direct" },
	// Dimensions
	{ sourceAttributeCode: "product_weight", targetAttributePath: "item_package_weight", mappingType: "direct" },
	{ sourceAttributeCode: "product_length", targetAttributePath: "item_package_dimensions.length", mappingType: "direct" },
	{ sourceAttributeCode: "product_width", targetAttributePath: "item_package_dimensions.width", mappingType: "direct" },
	{ sourceAttributeCode: "product_height", targetAttributePath: "item_package_dimensions.height", mappingType: "direct" },
];

export const AMAZON_SUMMARY_FALLBACKS: AttributeMapping[] = [
	{ sourceAttributeCode: "item_name", targetAttributePath: "summaries.0.itemName", mappingType: "direct" },
	{ sourceAttributeCode: "brand", targetAttributePath: "summaries.0.brand", mappingType: "direct" },
	{ sourceAttributeCode: "color", targetAttributePath: "summaries.0.color", mappingType: "direct" },
	{ sourceAttributeCode: "size", targetAttributePath: "summaries.0.size", mappingType: "direct" },
];
```

- [ ] **Step 6: Move amazon.connector.ts (update imports to use capabilities)**

The connector now implements the new capability interfaces instead of the old monolithic ones. Key changes:
- Imports come from `../connector.interface`, `../capabilities/*`, and `../connector.registry`
- Implements `IListingSubmittable` (new) instead of having those methods on `IChannelConnector`
- Adds `canSubmitListings: true` and `canSyncInventory: false, canPullOrders: false, canTrackFulfillment: false` to capabilities

```typescript
// apps/server/src/shared-kernel/infrastructure/connectors/amazon/amazon.connector.ts

import type {
	CatalogSearchQuery,
	CatalogSearchResult,
	ICatalogSearchable,
	IListingPullable,
	IProductTypeSearchable,
	IRestrictionCheckable,
	ListingPayload,
	ListingSubmissionResult,
	ListingsItemIssue,
	ListingsItemWithIssues,
	ListingsRestriction,
	NormalizedListing,
	ProductTypeSchema,
	VariationForest,
	VariationTreeNode,
	IListingSubmittable,
} from "../capabilities";
import type { IChannelConnector } from "../connector.interface";
import { registerConnector } from "../connector.registry";
import { AmazonAuthClient } from "./amazon-auth.client";
import type { AmazonCredentials } from "./amazon.types";

// ... (rest of the class is identical to the current implementation)
// The ONLY changes are:
// 1. Import paths (from "../capabilities" and "../connector.interface" instead of "../connector.interface" monolith)
// 2. `implements` clause adds `IListingSubmittable`
// 3. `capabilities` object adds: canSubmitListings: true, canSyncInventory: false, canPullOrders: false, canTrackFulfillment: false

export class AmazonConnector
	implements
		IChannelConnector,
		IListingSubmittable,
		ICatalogSearchable,
		IListingPullable,
		IRestrictionCheckable,
		IProductTypeSearchable
{
	readonly platform = "amazon";
	readonly capabilities = {
		canSearchCatalog: true,
		canPullListings: true,
		canCheckRestrictions: true,
		canSearchProductTypes: true,
		canSubmitListings: true,
		canSyncInventory: false,
		canPullOrders: false,
		canTrackFulfillment: false,
	};

	// ... rest of the class body is IDENTICAL to the current implementation
	// Copy verbatim from towers/pm/connectors/amazon/amazon.connector.ts lines 48-691
}

// Self-register
registerConnector("amazon", AmazonConnector);
```

**Important:** Copy the entire class body (constructor, all methods, all private helpers) from the existing `towers/pm/connectors/amazon/amazon.connector.ts`. The only changes are the import paths and the capabilities object.

- [ ] **Step 7: Create amazon barrel export**

```typescript
// apps/server/src/shared-kernel/infrastructure/connectors/amazon/index.ts

export { AmazonConnector } from "./amazon.connector";
export type { AmazonCredentials } from "./amazon.types";
export { AMAZON_REGIONS } from "./amazon.types";
export type {
	AmazonBuildContext,
	AttributeMapping,
	BuildResult,
	OfferValues,
} from "./amazon-payload-builder";
export { AmazonPayloadBuilder } from "./amazon-payload-builder";
export type {
	SchemaConstants,
	ValidationError,
	ValidationResult,
} from "./amazon-schema-validator";
export { AmazonSchemaValidator } from "./amazon-schema-validator";
export {
	AMAZON_DEFAULT_MAPPINGS,
	AMAZON_SUMMARY_FALLBACKS,
} from "./amazon-default-mappings";
```

- [ ] **Step 8: Commit**

```bash
git add apps/server/src/shared-kernel/infrastructure/connectors/amazon/
git commit -m "refactor(connectors): move Amazon connector to shared-kernel with updated imports"
```

---

## Task 6: Create connectors barrel export and wire into app module

**Files:**
- Create: `apps/server/src/shared-kernel/infrastructure/connectors/index.ts`
- Modify: `apps/server/src/app.module.ts`

- [ ] **Step 1: Create connectors barrel export**

```typescript
// apps/server/src/shared-kernel/infrastructure/connectors/index.ts

// Trigger Amazon self-registration on module load
import "./amazon/amazon.connector";

// ─── Core ────────────────────────────────────────────────────────────────────
export { ConnectorFactory } from "./connector.factory";
export type {
	ChannelSettings,
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

// ─── Capabilities (all towers) ──────────────────────────────────────────────
export {
	isCatalogSearchable,
	isFulfillmentTrackable,
	isInventorySyncable,
	isListingPullable,
	isListingSubmittable,
	isOrderPullable,
	isProductTypeSearchable,
	isRestrictionCheckable,
} from "./capabilities";
export type {
	// PM - Catalog
	CatalogSearchQuery,
	CatalogSearchResult,
	CatalogTreeResult,
	ICatalogSearchable,
	// PM - Listing pull
	IListingPullable,
	ImportableItem,
	ImportResult,
	NormalizedListing,
	VariationForest,
	VariationTreeNode,
	// PM - Restriction
	IRestrictionCheckable,
	ListingsItemIssue,
	ListingsItemWithIssues,
	ListingsRestriction,
	// PM - Product type
	IProductTypeSearchable,
	ProductTypeSchema,
	// PM - Listing submission
	IListingSubmittable,
	ListingPayload,
	ListingSubmissionResult,
	// INV - Inventory
	IInventorySyncable,
	InventorySummary,
	InventoryUpdate,
	InventoryUpdateResult,
	// OMS - Orders
	IOrderPullable,
	NormalizedOrder,
	NormalizedOrderItem,
	// FUL - Fulfillment
	FulfillmentOrder,
	IFulfillmentTrackable,
	ShipmentInfo,
} from "./capabilities";

// ─── Amazon-specific exports ─────────────────────────────────────────────────
export { AmazonConnector } from "./amazon";
export type { AmazonBuildContext, AmazonCredentials, OfferValues } from "./amazon";
export { AmazonPayloadBuilder, AmazonSchemaValidator } from "./amazon";
export { AMAZON_DEFAULT_MAPPINGS, AMAZON_SUMMARY_FALLBACKS } from "./amazon";
export type { AttributeMapping } from "./amazon";
```

- [ ] **Step 2: Add ConnectorsModule to app.module.ts**

In `apps/server/src/app.module.ts`, add the import:

```typescript
import { ConnectorsModule } from "@shared-kernel/infrastructure/connectors";
```

And add `ConnectorsModule` to the `imports` array (before `PmModule`):

```typescript
imports: [
	// ... existing imports ...
	ConnectorsModule,  // <── add this BEFORE PmModule
	PmModule,
	InvModule,
]
```

Since `ConnectorsModule` is `@Global()`, all towers automatically get access to `ConnectorFactory`.

- [ ] **Step 3: Verify the new module compiles**

Run: `cd /Users/minhpham/Workspase/ech-kenshin && npx tsc --noEmit --project apps/server/tsconfig.app.json 2>&1 | head -30`
Expected: Errors only from old import paths in PM tower (which we'll fix in next tasks)

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/shared-kernel/infrastructure/connectors/index.ts
git add apps/server/src/app.module.ts
git commit -m "refactor(connectors): create barrel export and register ConnectorsModule in app.module"
```

---

## Task 7: Update all PM tower imports to use shared-kernel

**Files:**
- Modify: `apps/server/src/towers/pm/channels/channels.module.ts`
- Modify: `apps/server/src/towers/pm/channels/channels.service.ts`
- Modify: `apps/server/src/towers/pm/channels/channels.service.spec.ts`
- Modify: `apps/server/src/towers/pm/schema-sync/schema-sync.module.ts`
- Modify: `apps/server/src/towers/pm/schema-sync/schema-sync.service.ts`
- Modify: `apps/server/src/towers/pm/schema-sync/schema-sync.service.spec.ts`
- Modify: `apps/server/src/towers/pm/schema-sync/schema-sync.worker.ts`
- Modify: `apps/server/src/towers/pm/schema-sync/auto-mapping-generator.ts`
- Modify: `apps/server/src/towers/pm/listings/listings.module.ts`
- Modify: `apps/server/src/towers/pm/listings/catalog-browse.service.ts`
- Modify: `apps/server/src/towers/pm/listings/catalog-browse.service.spec.ts`
- Modify: `apps/server/src/towers/pm/listings/listings-submission.service.ts`
- Modify: `apps/server/src/towers/pm/listings/listings-submission.service.spec.ts`
- Modify: `apps/server/src/towers/pm/listings/listings-submit.worker.ts`
- Modify: `apps/server/src/towers/pm/listings/listing-monitor.worker.ts`
- Modify: `apps/server/src/towers/pm/listings/listings-form.service.spec.ts`
- Modify: `apps/server/src/towers/pm/listings/mapping-preset-resolver.ts`

This is a mechanical find-and-replace across all files. The mapping for each import path:

| Old import path | New import path |
|---|---|
| `from "../connectors"` | `from "@shared-kernel/infrastructure/connectors"` |
| `from "../connectors/connector.interface"` | `from "@shared-kernel/infrastructure/connectors"` |
| `from "../connectors/amazon/amazon-default-mappings"` | `from "@shared-kernel/infrastructure/connectors"` |

- [ ] **Step 1: Update channels module**

In `apps/server/src/towers/pm/channels/channels.module.ts`:

**Before:**
```typescript
import { ConnectorFactory } from "../connectors";
```
**After:**
```typescript
import { ConnectorFactory } from "@shared-kernel/infrastructure/connectors";
```

Also remove `ConnectorFactory` from `providers` array since it's now globally available via `ConnectorsModule`. The module becomes:

```typescript
import { Module } from "@nestjs/common";
import { ChannelsController } from "./channels.controller";
import { ChannelsService } from "./channels.service";

@Module({
	controllers: [ChannelsController],
	providers: [ChannelsService],
	exports: [ChannelsService],
})
export class ChannelsModule {}
```

**Wait** — `ConnectorFactory` was listed as a direct provider in channels.module.ts (not via ConnectorsModule import). Since ConnectorsModule is now `@Global()`, we can simply remove `ConnectorFactory` from providers. The service already `@Inject()`s it.

- [ ] **Step 2: Update channels service**

In `apps/server/src/towers/pm/channels/channels.service.ts`:

**Before:**
```typescript
import { ConnectorFactory } from "../connectors";
```
**After:**
```typescript
import { ConnectorFactory } from "@shared-kernel/infrastructure/connectors";
```

- [ ] **Step 3: Update channels service spec**

In `apps/server/src/towers/pm/channels/channels.service.spec.ts`:

**Before:**
```typescript
import { ConnectorFactory } from "../connectors";
```
**After:**
```typescript
import { ConnectorFactory } from "@shared-kernel/infrastructure/connectors";
```

- [ ] **Step 4: Update schema-sync module**

In `apps/server/src/towers/pm/schema-sync/schema-sync.module.ts`:

**Before:**
```typescript
import { ConnectorsModule } from "../connectors";
// ...
imports: [ConnectorsModule],
```
**After:**
Remove the `ConnectorsModule` import entirely — it's global now. The module becomes:

```typescript
import { Module } from "@nestjs/common";
import { AutoMappingGenerator } from "./auto-mapping-generator";
import { SchemaSyncController } from "./schema-sync.controller";
import { SchemaSyncService } from "./schema-sync.service";

@Module({
	controllers: [SchemaSyncController],
	providers: [SchemaSyncService, AutoMappingGenerator],
	exports: [SchemaSyncService],
})
export class SchemaSyncModule {}
```

- [ ] **Step 5: Update schema-sync service**

In `apps/server/src/towers/pm/schema-sync/schema-sync.service.ts`:

**Before:**
```typescript
import { ConnectorFactory, isProductTypeSearchable } from "../connectors";
import type { ProductTypeSchema } from "../connectors/connector.interface";
```
**After:**
```typescript
import { ConnectorFactory, isProductTypeSearchable } from "@shared-kernel/infrastructure/connectors";
import type { ProductTypeSchema } from "@shared-kernel/infrastructure/connectors";
```

- [ ] **Step 6: Update schema-sync service spec**

In `apps/server/src/towers/pm/schema-sync/schema-sync.service.spec.ts`:

**Before:**
```typescript
import { ConnectorFactory } from "../connectors";
```
**After:**
```typescript
import { ConnectorFactory } from "@shared-kernel/infrastructure/connectors";
```

- [ ] **Step 7: Update schema-sync worker**

In `apps/server/src/towers/pm/schema-sync/schema-sync.worker.ts`:

**Before:**
```typescript
import { ConnectorFactory } from "../connectors";
```
**After:**
```typescript
import { ConnectorFactory } from "@shared-kernel/infrastructure/connectors";
```

- [ ] **Step 8: Update auto-mapping-generator**

In `apps/server/src/towers/pm/schema-sync/auto-mapping-generator.ts`:

**Before:**
```typescript
import type { ProductTypeSchema } from "../connectors/connector.interface";
```
**After:**
```typescript
import type { ProductTypeSchema } from "@shared-kernel/infrastructure/connectors";
```

- [ ] **Step 9: Update listings module**

In `apps/server/src/towers/pm/listings/listings.module.ts`:

**Before:**
```typescript
import { ConnectorsModule } from "../connectors";
// ...
imports: [
	BullModule.registerQueue({ name: "pm-listing-submit" }),
	BullModule.registerQueue({ name: "pm-listing-monitor" }),
	SchemaSyncModule,
	ConnectorsModule,
],
```
**After:**
Remove `ConnectorsModule` import — it's global:

```typescript
import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { SchemaSyncModule } from "../schema-sync/schema-sync.module";
import { CatalogBrowseService } from "./catalog-browse.service";
import { ListingMonitorWorker } from "./listing-monitor.worker";
import { ListingsController } from "./listings.controller";
import { ListingsService } from "./listings.service";
import { ListingsCrudService } from "./listings-crud.service";
import { ListingsFormService } from "./listings-form.service";
import { ListingsImportService } from "./listings-import.service";
import { ListingsMarketplaceService } from "./listings-marketplace.service";
import { ListingsSubmissionService } from "./listings-submission.service";
import { ListingsSubmitWorker } from "./listings-submit.worker";

@Module({
	imports: [
		BullModule.registerQueue({ name: "pm-listing-submit" }),
		BullModule.registerQueue({ name: "pm-listing-monitor" }),
		SchemaSyncModule,
	],
	controllers: [ListingsController],
	providers: [
		ListingsService,
		ListingsCrudService,
		ListingsFormService,
		ListingsSubmissionService,
		ListingsMarketplaceService,
		CatalogBrowseService,
		ListingsImportService,
		ListingsSubmitWorker,
		ListingMonitorWorker,
	],
	exports: [ListingsService],
})
export class ListingsModule {}
```

- [ ] **Step 10: Update catalog-browse service**

In `apps/server/src/towers/pm/listings/catalog-browse.service.ts`:

**Before:**
```typescript
import {
	ConnectorFactory,
	isCatalogSearchable,
	isListingPullable,
} from "../connectors";
```
**After:**
```typescript
import {
	ConnectorFactory,
	isCatalogSearchable,
	isListingPullable,
} from "@shared-kernel/infrastructure/connectors";
```

- [ ] **Step 11: Update catalog-browse service spec**

In `apps/server/src/towers/pm/listings/catalog-browse.service.spec.ts`:

**Before:**
```typescript
import { ConnectorFactory } from "../connectors";
```
**After:**
```typescript
import { ConnectorFactory } from "@shared-kernel/infrastructure/connectors";
```

- [ ] **Step 12: Update listings-submission service**

In `apps/server/src/towers/pm/listings/listings-submission.service.ts`:

**Before:**
```typescript
import { ConnectorFactory, isRestrictionCheckable } from "../connectors";
```
**After:**
```typescript
import { ConnectorFactory, isRestrictionCheckable } from "@shared-kernel/infrastructure/connectors";
```

- [ ] **Step 13: Update listings-submission service spec**

In `apps/server/src/towers/pm/listings/listings-submission.service.spec.ts`:

**Before:**
```typescript
import { ConnectorFactory } from "../connectors";
```
**After:**
```typescript
import { ConnectorFactory } from "@shared-kernel/infrastructure/connectors";
```

- [ ] **Step 14: Update listings-submit worker**

In `apps/server/src/towers/pm/listings/listings-submit.worker.ts`:

**Before:**
```typescript
import type { ListingPayload } from "../connectors";
import { ConnectorFactory } from "../connectors";
```
**After:**
```typescript
import { ConnectorFactory } from "@shared-kernel/infrastructure/connectors";
import type { ListingPayload } from "@shared-kernel/infrastructure/connectors";
```

- [ ] **Step 15: Update listing-monitor worker**

In `apps/server/src/towers/pm/listings/listing-monitor.worker.ts`:

**Before:**
```typescript
import { ConnectorFactory } from "../connectors";
import type { ListingsItemIssue } from "../connectors/connector.interface";
```
**After:**
```typescript
import { ConnectorFactory } from "@shared-kernel/infrastructure/connectors";
import type { ListingsItemIssue } from "@shared-kernel/infrastructure/connectors";
```

- [ ] **Step 16: Update listings-form service spec**

In `apps/server/src/towers/pm/listings/listings-form.service.spec.ts`:

**Before:**
```typescript
import { ConnectorFactory } from "../connectors";
```
**After:**
```typescript
import { ConnectorFactory } from "@shared-kernel/infrastructure/connectors";
```

- [ ] **Step 17: Update mapping-preset-resolver**

In `apps/server/src/towers/pm/listings/mapping-preset-resolver.ts`:

**Before:**
```typescript
import {
	AMAZON_DEFAULT_MAPPINGS,
	AMAZON_SUMMARY_FALLBACKS,
} from "../connectors/amazon/amazon-default-mappings";
```
**After:**
```typescript
import {
	AMAZON_DEFAULT_MAPPINGS,
	AMAZON_SUMMARY_FALLBACKS,
} from "@shared-kernel/infrastructure/connectors";
```

Also update the `AttributeMapping` import in this file. Currently it imports from `./mapping-engine`. This is still correct — the PM tower's `MappingEngine` defines its own `AttributeMapping`. But the amazon-default-mappings now also export `AttributeMapping`. These are structurally identical, so no runtime issue.

- [ ] **Step 18: Commit**

```bash
git add apps/server/src/towers/pm/channels/
git add apps/server/src/towers/pm/schema-sync/
git add apps/server/src/towers/pm/listings/
git commit -m "refactor(connectors): update all PM tower imports to use @shared-kernel/infrastructure/connectors"
```

---

## Task 8: Delete old connectors directory from PM tower

**Files:**
- Delete: `apps/server/src/towers/pm/connectors/` (entire directory)

- [ ] **Step 1: Verify no remaining references to old path**

Run: `cd /Users/minhpham/Workspase/ech-kenshin && grep -r "from.*\.\./connectors" apps/server/src/towers/pm/ --include="*.ts" | grep -v node_modules`
Expected: No output (all imports updated)

Run: `cd /Users/minhpham/Workspase/ech-kenshin && grep -r "towers/pm/connectors" apps/server/src/ --include="*.ts" | grep -v node_modules`
Expected: No output

- [ ] **Step 2: Delete the old directory**

```bash
rm -rf apps/server/src/towers/pm/connectors/
```

- [ ] **Step 3: Commit**

```bash
git add -A apps/server/src/towers/pm/connectors/
git commit -m "refactor(connectors): remove old connectors directory from PM tower"
```

---

## Task 9: Move test files and verify all tests pass

**Files:**
- Create: `apps/server/src/shared-kernel/infrastructure/connectors/connectors.module.spec.ts`
- Create: `apps/server/src/shared-kernel/infrastructure/connectors/amazon/amazon.connector.spec.ts`
- Create: `apps/server/src/shared-kernel/infrastructure/connectors/amazon/amazon-auth.client.spec.ts`
- Create: `apps/server/src/shared-kernel/infrastructure/connectors/amazon/amazon-payload-builder.spec.ts`
- Create: `apps/server/src/shared-kernel/infrastructure/connectors/amazon/amazon-schema-validator.spec.ts`

- [ ] **Step 1: Copy test files to new location**

```bash
cp apps/server/src/towers/pm/connectors/connectors.module.spec.ts \
   apps/server/src/shared-kernel/infrastructure/connectors/connectors.module.spec.ts

cp apps/server/src/towers/pm/connectors/amazon/amazon.connector.spec.ts \
   apps/server/src/shared-kernel/infrastructure/connectors/amazon/amazon.connector.spec.ts

cp apps/server/src/towers/pm/connectors/amazon/amazon-auth.client.spec.ts \
   apps/server/src/shared-kernel/infrastructure/connectors/amazon/amazon-auth.client.spec.ts

cp apps/server/src/towers/pm/connectors/amazon/amazon-payload-builder.spec.ts \
   apps/server/src/shared-kernel/infrastructure/connectors/amazon/amazon-payload-builder.spec.ts

cp apps/server/src/towers/pm/connectors/amazon/amazon-schema-validator.spec.ts \
   apps/server/src/shared-kernel/infrastructure/connectors/amazon/amazon-schema-validator.spec.ts
```

**Note:** The old files were already deleted in Task 8. These copies should be made BEFORE Task 8, or use `git show HEAD~1:path` to recover. Alternative: do Task 9 before Task 8.

**Better approach: Reorder — do Task 9 BEFORE Task 8. Copy test files while old ones still exist.**

- [ ] **Step 2: Update connectors.module.spec.ts imports**

In `apps/server/src/shared-kernel/infrastructure/connectors/connectors.module.spec.ts`:

**Before:**
```typescript
import { ConnectorFactory } from "./connector.factory";
import { ConnectorsModule } from "./connectors.module";
import "./amazon/amazon.connector";
```

These relative imports are STILL CORRECT in the new location (they're relative to the spec file). No changes needed.

- [ ] **Step 3: Update amazon.connector.spec.ts imports**

Check if the spec file imports from `../connector.interface`. If so, these relative imports are still correct since the directory structure is preserved. No changes needed.

- [ ] **Step 4: Update amazon-payload-builder.spec.ts imports**

If the spec imports `AmazonBuildContext` or `OfferValues` from `./amazon-payload-builder`, these relative imports are still correct. But check if it imports `ListingPayload` from `../connector.interface` — if so, update to `../capabilities/listing-submission.capability`.

Check the file and update any import that referenced the old `../connector.interface` to the new capability path.

- [ ] **Step 5: Run all connector tests**

Run: `cd /Users/minhpham/Workspase/ech-kenshin && npx vitest run --project apps/server src/shared-kernel/infrastructure/connectors/ 2>&1`
Expected: All tests pass

- [ ] **Step 6: Run the full test suite**

Run: `cd /Users/minhpham/Workspase/ech-kenshin && npx vitest run --project apps/server 2>&1`
Expected: All tests pass (including PM tower tests that use updated import paths)

- [ ] **Step 7: Commit**

```bash
git add apps/server/src/shared-kernel/infrastructure/connectors/**/*.spec.ts
git commit -m "test(connectors): move test files to shared-kernel and verify all pass"
```

---

## Task 10: TypeScript compilation check and final verification

- [ ] **Step 1: Run full TypeScript check**

Run: `cd /Users/minhpham/Workspase/ech-kenshin && npx tsc --noEmit --project apps/server/tsconfig.app.json 2>&1`
Expected: Zero errors

- [ ] **Step 2: Run Biome lint check**

Run: `cd /Users/minhpham/Workspase/ech-kenshin && npx biome check apps/server/src/shared-kernel/infrastructure/connectors/ 2>&1`
Expected: No errors (warnings are acceptable)

- [ ] **Step 3: Verify no circular imports**

Run: `cd /Users/minhpham/Workspase/ech-kenshin && grep -r "towers/pm" apps/server/src/shared-kernel/ --include="*.ts"`
Expected: No output — shared-kernel must NOT import from any tower

- [ ] **Step 4: Run full test suite one more time**

Run: `cd /Users/minhpham/Workspase/ech-kenshin && npx vitest run --project apps/server 2>&1`
Expected: All tests pass

- [ ] **Step 5: Final commit if any lint fixes were needed**

```bash
git add -A
git commit -m "refactor(connectors): final cleanup — lint fixes and compilation verification"
```

---

## Execution Order Summary

| Order | Task | Description | Risk |
|-------|------|-------------|------|
| 1 | Task 1 | Create base `IChannelConnector` in shared-kernel | Low — additive |
| 2 | Task 2 | Create PM capability interfaces | Low — additive |
| 3 | Task 3 | Create INV/OMS/FUL stub capabilities | Low — additive |
| 4 | Task 4 | Move registry, factory, module | Low — additive |
| 5 | Task 5 | Move Amazon connector | Medium — must fix `AttributeMapping` dependency |
| 6 | Task 6 | Create barrel export + wire app.module | Low — additive |
| 7 | Task 9 | Copy test files (do BEFORE deleting old dir) | Low |
| 8 | Task 7 | Update all PM tower imports | Medium — 17 files, mechanical but error-prone |
| 9 | Task 8 | Delete old connectors directory | Medium — point of no return |
| 10 | Task 10 | Final verification | Low — read-only checks |

**Total estimated files created:** ~20
**Total estimated files modified:** ~18
**Total estimated files deleted:** ~12 (old connectors directory)

---

## Key Design Decisions

1. **`@Global()` module:** ConnectorsModule is marked `@Global()` so towers don't need explicit imports — follows the pattern of `DrizzleModule`, `BetterAuthModule`, `RequestContextModule`.

2. **`AttributeMapping` duplication:** The connector's `AttributeMapping` type is now defined in `amazon-payload-builder.ts` instead of importing from PM's `mapping-engine.ts`. Both are structurally identical (`{sourceAttributeCode, targetAttributePath, mappingType, transformRules}`). The PM tower's `MappingEngine` keeps its own definition. This avoids circular dependency.

3. **`IListingSubmittable` extracted:** The methods `putListingsItem`, `patchListingsItem`, `getListingsItem`, `getProductTypeDefinitions` were in the mandatory `IChannelConnector`. They're now in an optional `IListingSubmittable` capability, since an inventory-only connector shouldn't need to implement listing submission.

4. **Stub interfaces for INV/OMS/FUL:** These are real interfaces with realistic type definitions based on Amazon SP-API contracts (FBA Inventory, Orders, Fulfillment Outbound APIs). They're not implemented yet but provide contracts for future work.

5. **Capability booleans extended:** `ConnectorCapabilities` now includes `canSubmitListings`, `canSyncInventory`, `canPullOrders`, `canTrackFulfillment`. Each connector declares what it supports.
