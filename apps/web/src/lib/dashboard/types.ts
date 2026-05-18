/**
 * src/lib/dashboard/types.ts
 * Data Transfer Objects (DTOs) for the 4-Tower Control Tower Dashboard
 */

// ─── 1. Core Domain Types ───────────────────────────────────────────────────

export interface SalesMetrics {
    gmv: number;               // Gross Merchandise Value
    netRevenue: number;        // GMV minus discounts, returns, etc
    orders: number;
    aov: number;               // Average Order Value
    byChannel: { channel: string; sales: number }[];
    byCountry: { country: string; sales: number }[];
}

export interface ProductMetrics {
    totalProducts: number;     // Master products
    totalSkus: number;         // Master SKUs
    listedSkus: number;        // SKUs active on at least one channel
    unlistedSkus: number;      // SKUs with no active listings
    mappingCoveragePct: number;// Percentage of channel SKUs mapped to master SKUs
    contentCompletenessPct: number; // Percentage of master products with full descriptions/images
}

export interface InventoryMetrics {
    total: number;             // Total physical + virtual stock
    ats: number;               // Available To Sell
    reserved: number;          // Allocated to pending orders but not picked
    inbound: number;           // In transit from supplier
    replenishment: number;     // Suggested restock quantity based on velocity
    nodes: {
        nodeId: string;
        nodeName: string;
        ats: number;
        reserved: number;
        isVirtual: boolean;
        health: "ok" | "warning" | "critical";
    }[];
}

export interface OmsMetrics {
    ingestionRate: number;     // Orders/min or Orders/hour ingested
    routingSuccessPct: number; // % of orders successfully routed on first try
    allocationLatencyP50: number; // ms to allocate an order
    pendingOrders: number;     // Orders not yet shipped
    pipelineCounts: {          // The orchestration funnel
        created: number;
        validated: number;
        allocated: number;
        reserved: number;
        fulfillment: number;
        shipped: number;
        delivered: number;
    };
}

export interface FulfillmentMetrics {
    pickTimeP50: number;       // hours
    packTimeP50: number;       // hours
    shipSlaPct: number;        // % shipped within SLA bounds
    deliveryTimeAvg: number;   // days
    nodePerformance: {
        nodeId: string;
        nodeName: string;
        shipSlaPct: number;
        backlog: number;
    }[];
}

export interface ConnectorHealth {
    id: string;
    channel: string;
    status: "OK" | "DELAY" | "ERROR" | "DISCONNECTED";
    lastSyncAt: string | null;
    lagMinutes: number;
    errorRatePct: number;
    domains: {
        orders: { status: "OK" | "DELAY" | "ERROR", lagMinutes: number };
        inventory: { status: "OK" | "DELAY" | "ERROR", lagMinutes: number };
        listings: { status: "OK" | "DELAY" | "ERROR", lagMinutes: number };
        tracking: { status: "OK" | "DELAY" | "ERROR", lagMinutes: number };
    };
}

export interface IntegrationMetrics {
    connectors: ConnectorHealth[];
    syncMetrics: {
        activeConnectors: number;
        totalErrors24h: number;
        avgLagMinutes: number;
    };
}

export type AlertSeverity = "INFO" | "WARNING" | "CRITICAL";
export type TowerDomain = "PRODUCT" | "INVENTORY" | "OMS" | "FULFILLMENT" | "INTEGRATION";

export interface ControlTowerAlert {
    id: string;
    tower: TowerDomain;
    severity: AlertSeverity;
    title: string;
    detail: string;
    entityRef?: string;       // e.g. Order ID, SKU, Connector ID
    createdAt: string;
    actionLink: string;       // Drill-down link
}

// ─── 2. Aggregated DTO ──────────────────────────────────────────────────────

export interface DashboardDTO {
    sales: SalesMetrics;
    product: ProductMetrics;
    inventory: InventoryMetrics;
    oms: OmsMetrics;
    fulfillment: FulfillmentMetrics;
    integration: IntegrationMetrics;
    alerts: ControlTowerAlert[];
    lastRefreshedAt: string;
}
