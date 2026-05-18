/**
 * Amazon SP-API Client
 *
 * Selling Partner API v2024-06-01
 * OAuth2 + LWA (Login with Amazon) flow
 *
 * Docs: https://developer-docs.amazon.com/amazon-shipping/docs/
 *
 * Setup required:
 * 1. Register in Seller Central → Developer Central
 * 2. Create SP-API application → get LWA client_id + client_secret
 * 3. Configure OAuth: redirect URI, refresh token flow
 * 4. Store tokens securely (Supabase: org_settings table)
 *
 * Rate limits:
 * - Orders API: 1 request/second (configurable via MAX_RATE)
 * - Inventory API: 2 requests/second
 * - throttlingRetry: auto-retry with exponential backoff
 */

import { SpApiError } from './sp-api-error';

export interface SpApiConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  region: 'na' | 'eu' | 'fe'; // North America, Europe, Far East
  marketplaceId: string;
}

// ─── LWA Token Management ────────────────────────────────────────────────────

const LWA_TOKEN_URLS = {
  na: 'https://api.amazon.com/auth/o2/token',
  eu: 'https://api.amazon.com/auth/o2/token',
  fe: 'https://api.amazon.co.jp/auth/o2/token',
} as const;

interface LwaTokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
}

interface StoredTokens {
  accessToken: string;
  expiresAt: number; // epoch ms
  refreshToken: string;
}

const _tokenCache = new Map<string, StoredTokens>();

async function exchangeRefreshToken(
  config: SpApiConfig,
  refreshToken: string,
): Promise<LwaTokenResponse> {
  const resp = await fetch(LWA_TOKEN_URLS[config.region], {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new SpApiError(`LWA token exchange failed: ${resp.status} ${body}`, resp.status);
  }

  return resp.json() as Promise<LwaTokenResponse>;
}

async function getAccessToken(config: SpApiConfig): Promise<string> {
  const cacheKey = `${config.clientId}:${config.marketplaceId}`;

  const cached = _tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + 30_000) {
    return cached.accessToken;
  }

  const refreshToken = cached?.refreshToken ?? config.refreshToken;
  const lwa = await exchangeRefreshToken(config, refreshToken);

  _tokenCache.set(cacheKey, {
    accessToken: lwa.access_token,
    expiresAt: Date.now() + lwa.expires_in * 1000,
    refreshToken: lwa.refresh_token ?? refreshToken,
  });

  return lwa.access_token;
}

// ─── Rate Limiter ─────────────────────────────────────────────────────────────

const _rateLimiters = new Map<string, { lastRequest: number }>();

async function withRateLimit(
  region: 'na' | 'eu' | 'fe',
  ratePerSecond: number,
  fn: () => Promise<Response>,
): Promise<Response> {
  const key = region;
  const minInterval = 1000 / ratePerSecond;
  const now = Date.now();
  const last = _rateLimiters.get(key)?.lastRequest ?? 0;
  const wait = Math.max(0, last + minInterval - now);

  if (wait > 0) await sleep(wait);

  const result = await fn();
  _rateLimiters.set(key, { lastRequest: Date.now() });

  // Handle 429 with exponential backoff
  if (result.status === 429) {
    const retryAfter = parseInt(result.headers.get('Retry-After') ?? '1', 10);
    await sleep(retryAfter * 1000);
    return withRateLimit(region, ratePerSecond, fn);
  }

  return result;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Error Types ─────────────────────────────────────────────────────────────

export { SpApiError } from './sp-api-error';

// ─── API Client ───────────────────────────────────────────────────────────────

export class AmazonSpApiClient {
  private config: SpApiConfig;

  constructor(config: SpApiConfig) {
    this.config = config;
  }

  private get baseUrl(): string {
    const endpoints: Record<string, string> = {
      na: 'https://sellingpartnerapi-na.amazon.com',
      eu: 'https://sellingpartnerapi-eu.amazon.com',
      fe: 'https://sellingpartnerapi-fe.amazon.com',
    };
    return endpoints[this.config.region];
  }

  private async request<T>(
    path: string,
    opts: RequestInit & { ratePerSecond?: number } = {},
  ): Promise<T> {
    const { ratePerSecond = 1, ...fetchOpts } = opts;
    const accessToken = await getAccessToken(this.config);

    const resp = await withRateLimit(this.config.region, ratePerSecond ?? 1, () =>
      fetch(`${this.baseUrl}${path}`, {
        ...fetchOpts,
        headers: {
          'x-amz-access-token': accessToken,
          'Content-Type': 'application/json',
          ...fetchOpts.headers,
        },
      }),
    );

    if (!resp.ok) {
      let errorBody: { code?: string; message?: string; details?: unknown } = {};
      try { errorBody = await resp.json(); } catch { /* ignore */ }

      throw new SpApiError(
        errorBody.message ?? `SP-API error ${resp.status}`,
        resp.status,
        errorBody.code,
        errorBody.details ?? errorBody,
      );
    }

    if (resp.status === 204) return {} as T;
    return resp.json() as Promise<T>;
  }

  // ─── Orders API ─────────────────────────────────────────────────────────────

  /**
   * Get orders from the last N days.
   * @param daysBack default 7 days
   */
  async getOrders(daysBack = 7): Promise<SpApiOrdersResponse> {
    const createdAfter = new Date(Date.now() - daysBack * 86_400_000).toISOString();

    return this.request<SpApiOrdersResponse>(
      `/orders/v0/orders?MarketplaceIds=${this.config.marketplaceId}&CreatedAfter=${createdAfter}&OrderStatuses=Pending,Unshipped,PartiallyShipped,Shipped`,
      { ratePerSecond: 1 },
    );
  }

  async getOrder(orderId: string): Promise<SpApiOrder> {
    const data = await this.request<SpApiOrdersResponse>(
      `/orders/v0/orders/${orderId}?MarketplaceIds=${this.config.marketplaceId}`,
      { ratePerSecond: 1 },
    );
    if (!data.payload?.[0]) throw new SpApiError(`Order ${orderId} not found`, 404);
    return data.payload[0];
  }

  // ─── Catalog API ───────────────────────────────────────────────────────────

  async getCatalogItem(sku: string): Promise<SpApiCatalogItem | null> {
    try {
      const data = await this.request<SpApiCatalogResponse>(
        `/catalog/2022-04-01/items?marketplaceIds=${this.config.marketplaceId}&keywords=${encodeURIComponent(sku)}`,
        { ratePerSecond: 2 },
      );
      return data.items?.[0] ?? null;
    } catch (e) {
      if (e instanceof SpApiError && e.statusCode === 404) return null;
      throw e;
    }
  }

  // ─── FBA Inventory API ──────────────────────────────────────────────────────

  /**
   * Get inventory summaries for FBA warehouses.
   * Returns aggregated inventory data by SKU/FNSKU.
   */
  async getInventorySummaries(args: {
    startDateTime?: string;
    sellerSku?: string;
    fulfillmentCenterId?: string;
  } = {}): Promise<SpApiInventoryResponse> {
    const params = new URLSearchParams({
      marketplaceIds: this.config.marketplaceId,
      startDateTime: args.startDateTime ?? new Date(Date.now() - 7 * 86_400_000).toISOString(),
    });
    if (args.sellerSku) params.set('sellerSku', args.sellerSku);
    if (args.fulfillmentCenterId) params.set('fulfillmentCenterId', args.fulfillmentCenterId);

    return this.request<SpApiInventoryResponse>(
      `/fba/inventory/v1/summaries?${params}`,
      { ratePerSecond: 2 },
    );
  }

  // ─── Fulfillment Inbound API ────────────────────────────────────────────────

  /**
   * Create an inbound shipment to FBA.
   * This is the first step in the FBA flow: create → ship → receive → closed.
   */
  async createInboundShipment(args: {
    inboundShipmentPlanRequestItems: InboundShipmentItem[];
    shipToCountryCode: string;
    inboundShipmentPlanRequestId: string;
    fulfillmentCenterId: string;
    labelPrepPreference: 'SELLER_LABEL' | 'AMAZON_LABEL_ONLY' | 'NO_LABEL';
    areCasesRequired: boolean;
  }): Promise<InboundShipmentResponse> {
    return this.request<InboundShipmentResponse>(
      '/fba/inbound/v0/shipments',
      {
        method: 'POST',
        body: JSON.stringify({
          inboundShipmentPlanRequestItems: args.inboundShipmentPlanRequestItems,
          shipToCountryCode: args.shipToCountryCode,
          inboundShipmentPlanRequestId: args.inboundShipmentPlanRequestId,
          fulfillmentCenterId: args.fulfillmentCenterId,
          labelPrepPreference: args.labelPrepPreference,
          areCasesRequired: args.areCasesRequired,
        }),
        ratePerSecond: 1,
      },
    );
  }

  /**
   * Get inbound shipment status and items.
   */
  async getInboundShipment(shipmentId: string): Promise<InboundShipmentDetail> {
    return this.request<InboundShipmentDetail>(
      `/fba/inbound/v0/shipments/${shipmentId}`,
      { ratePerSecond: 1 },
    );
  }

  /**
   * Confirm an inbound shipment (tell Amazon it's on its way).
   */
  async confirmInboundShipment(shipmentId: string, body: {
    shipmentId: string;
    shipmentStatus: 'WORKING' | 'SHIPPING' | 'RECEIVING' | 'CLOSED' | 'CANCELLED';
  }): Promise<void> {
    return this.request<void>(
      `/fba/inbound/v0/shipments/${shipmentId}/items`,
      {
        method: 'PUT',
        body: JSON.stringify(body),
        ratePerSecond: 1,
      },
    );
  }

  // ─── Token refresh helper ──────────────────────────────────────────────────

  /** Clear cached token — call when user disconnects Amazon account */
  clearTokenCache(): void {
    const key = `${this.config.clientId}:${this.config.marketplaceId}`;
    _tokenCache.delete(key);
  }
}

// ─── Type Definitions ────────────────────────────────────────────────────────

// Orders API types
export interface SpApiOrdersResponse {
  payload?: SpApiOrder[];
  errors?: { code: string; message: string }[];
}

export interface SpApiOrder {
  AmazonOrderId: string;
  SellerOrderId?: string;
  PurchaseDate: string;
  LastUpdateDate: string;
  OrderStatus: 'Pending' | 'Unshipped' | 'PartiallyShipped' | 'Shipped' | 'InvoiceUnconfirmed' | 'Cancelled';
  FulfillmentChannel: 'AFN' | 'MFN'; // AFN = FBA, MFN = Merchant Fulfilled Network
  SalesChannel?: string;
  OrderTotal?: { CurrencyCode: string; Amount: string };
  ShippingAddress?: {
    Name: string;
    AddressLine1?: string;
    City?: string;
    Country?: string;
    PostalCode?: string;
  };
  NumberOfItemsUnshipped?: number;
  // FBA-specific
  FulfillmentInstruction?: { FulfillmentNetworkCode?: string };
}

export interface SpApiOrderItem {
  OrderItemId: string;
  ASIN: string;
  SellerSKU: string;
  Title: string;
  QuantityOrdered: number;
  QuantityShipped: number;
  ItemPrice?: { CurrencyCode: string; Amount: string };
}

// Catalog API types
export interface SpApiCatalogResponse {
  items?: SpApiCatalogItem[];
  errors?: { code: string; message: string }[];
}

export interface SpApiCatalogItem {
  asin: string;
  sku?: string;
  attributes?: Record<string, { value: string; label?: string }[]>;
  summaries?: {
    marketplaceId: string;
    itemClassification: string;
    productType: string;
  }[];
}

// FBA Inventory types
export interface SpApiInventoryResponse {
  payload?: {
    inventorySummaries?: InventorySummary[];
    nextToken?: string;
  };
  errors?: { code: string; message: string }[];
}

export interface InventorySummary {
  sku: string;
  fnsku: string;
  asin: string;
  condition: string;
  quantity?: number;
  inventoryDetails?: {
    totalQuantity: number;
    fulfillableQuantity: number;
    inboundWorkingQuantity: number;
    inboundShippedQuantity: number;
    inboundReceivingQuantity: number;
    reservedQuantity?: number;
  };
  lastUpdatedTime: string;
}

// FBA Inbound Shipment types
export interface InboundShipmentItem {
  sku: string;
  quantity: number;
  condition: 'NewItem' | 'NewShelfPull' | 'NewWithWarranty' | 'UsedLikeNew' | 'UsedVeryGood' | 'UsedGood' | 'UsedAcceptable' | 'UsedPoor' | 'Refurbished' | 'OpenListing';
}

export interface InboundShipmentResponse {
  payload?: {
    shipmentId: string;
    inboundShipmentPlan: {
      shipmentId: string;
      status: string;
      items: { sku: string; quantity: number }[];
    };
  };
}

export interface InboundShipmentDetail {
  shipmentId: string;
  shipmentStatus: 'WORKING' | 'SHIPPING' | 'RECEIVING' | 'CLOSED' | 'CANCELLED' | 'DELETED';
  fulfillmentCenterId: string;
  labelPrepType: 'SELLER_LABEL' | 'AMAZON_LABEL_ONLY' | 'NO_LABEL';
  areCasesRequired: boolean;
  shipmentItems?: {
    sku: string;
    quantity: number;
    quantityInCase?: number;
    shipmentStatus: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

// ─── Factory function ────────────────────────────────────────────────────────

/**
 * Create a SP-API client from org settings stored in Supabase.
 *
 * In production, load from:
 *   SELECT config FROM org_settings WHERE org_id = <org_id> AND provider = 'amazon_spapi'
 */
export function createSpApiClient(config: SpApiConfig): AmazonSpApiClient {
  return new AmazonSpApiClient(config);
}

/**
 * Map SP-API order to ECH fulfillment job.
 * Used when syncing Amazon orders into the ECH fulfillment pipeline.
 */
export function mapSpApiOrderToEchJob(order: SpApiOrder): {
  order_id: string;
  flow_type: 'fba';
  fulfillment_type: string;
  fba_shipment_id: string | null;
  fulfillment_center_id: string | null;
  inbound_shipment_status: FbaInboundStatus | null;
} {
  return {
    order_id: order.AmazonOrderId,
    flow_type: 'fba',
    fulfillment_type: order.FulfillmentChannel === 'AFN' ? 'fba' : 'seller_fulfilled',
    fba_shipment_id: null,
    fulfillment_center_id: order.FulfillmentInstruction?.FulfillmentNetworkCode ?? null,
    inbound_shipment_status: null,
  };
}

// Import FbaInboundStatus type reference (used in function signature above)
// This is re-exported from fulfillment-types.ts in the main module
import type { FbaInboundStatus } from './fulfillment-types';
