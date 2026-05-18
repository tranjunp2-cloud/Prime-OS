/**
 * src/lib/dashboard/seedControlTower.ts
 * Generates deterministic mock data for the 4-Tower Dashboard DTO
 */
import type { DashboardDTO, ConnectorHealth, ControlTowerAlert } from "./types";

// Seeded PRNG for deterministic demo data
function sfc32(a: number, b: number, c: number, d: number) {
    return function () {
        a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
        let t = (a + b) | 0;
        a = b ^ b >>> 9;
        b = c + (c << 3) | 0;
        c = (c << 21 | c >>> 11);
        d = d + 1 | 0;
        t = t + d | 0;
        c = c + t | 0;
        return (t >>> 0) / 4294967296;
    }
}

// Start with a fixed seed for Dashboard consistency
const getRand = sfc32(2026, 3, 6, 9);
function rInt(min: number, max: number) { return Math.floor(getRand() * (max - min + 1)) + min; }

export function generateControlTowerData(): DashboardDTO {
    const now = new Date();

    // Connectors
    const amazon: ConnectorHealth = {
        id: "conn-amz-jp",
        channel: "Amazon JP",
        status: "OK",
        lastSyncAt: new Date(now.getTime() - 2 * 60000).toISOString(),
        lagMinutes: 2,
        errorRatePct: 0.1,
        domains: {
            orders: { status: "OK", lagMinutes: 2 },
            inventory: { status: "OK", lagMinutes: 5 },
            listings: { status: "OK", lagMinutes: 15 },
            tracking: { status: "OK", lagMinutes: 3 }
        }
    };

    const shopee: ConnectorHealth = {
        id: "conn-shp-vt",
        channel: "Shopee VN",
        status: "DELAY",
        lastSyncAt: new Date(now.getTime() - 45 * 60000).toISOString(),
        lagMinutes: 45,
        errorRatePct: 2.4,
        domains: {
            orders: { status: "OK", lagMinutes: 10 },
            inventory: { status: "DELAY", lagMinutes: 45 },
            listings: { status: "OK", lagMinutes: 10 },
            tracking: { status: "OK", lagMinutes: 5 }
        }
    };

    const rakuten: ConnectorHealth = {
        id: "conn-rak-jp",
        channel: "Rakuten JP",
        status: "OK",
        lastSyncAt: new Date(now.getTime() - 5 * 60000).toISOString(),
        lagMinutes: 5,
        errorRatePct: 0.5,
        domains: {
            orders: { status: "OK", lagMinutes: 5 },
            inventory: { status: "OK", lagMinutes: 5 },
            listings: { status: "OK", lagMinutes: 30 },
            tracking: { status: "OK", lagMinutes: 5 }
        }
    };

    const lazada: ConnectorHealth = {
        id: "conn-laz-th",
        channel: "Lazada TH",
        status: "ERROR",
        lastSyncAt: new Date(now.getTime() - 180 * 60000).toISOString(),
        lagMinutes: 180,
        errorRatePct: 15.2,
        domains: {
            orders: { status: "ERROR", lagMinutes: 180 },
            inventory: { status: "ERROR", lagMinutes: 180 },
            listings: { status: "DELAY", lagMinutes: 240 },
            tracking: { status: "ERROR", lagMinutes: 180 }
        }
    };

    // Alerts
    const alerts: ControlTowerAlert[] = [
        {
            id: "al-1",
            tower: "INTEGRATION",
            severity: "CRITICAL",
            title: "Lazada TH Auth Token Expired",
            detail: "Connector failed to refresh OAuth token. All domains blocked for 3 hours.",
            entityRef: "conn-laz-th",
            createdAt: new Date(now.getTime() - 175 * 60000).toISOString(),
            actionLink: "/settings"
        },
        {
            id: "al-2",
            tower: "INVENTORY",
            severity: "CRITICAL",
            title: "Over-selling Risk",
            detail: "Shopee VN inventory sync lagging behind fast-moving SKUs during flash sale.",
            entityRef: "conn-shp-vt",
            createdAt: new Date(now.getTime() - 40 * 60000).toISOString(),
            actionLink: "/inventory"
        },
        {
            id: "al-3",
            tower: "FULFILLMENT",
            severity: "WARNING",
            title: "Tokyo 3PL SLA Risk",
            detail: "72 orders pending pack > 24h. Approaching ship deadline.",
            entityRef: "WH-TYO-01",
            createdAt: new Date(now.getTime() - 120 * 60000).toISOString(),
            actionLink: "/fulfillment"
        },
        {
            id: "al-4",
            tower: "OMS",
            severity: "WARNING",
            title: "Allocation Blocked",
            detail: "4 orders failed allocation due to missing node routing rules for KR region.",
            createdAt: new Date(now.getTime() - 30 * 60000).toISOString(),
            actionLink: "/orders?status=pending"
        },
        {
            id: "al-5",
            tower: "PRODUCT",
            severity: "INFO",
            title: "New Channel Listings Found",
            detail: "14 unmapped listings discovered on Rakuten JP. Review required.",
            createdAt: new Date(now.getTime() - 300 * 60000).toISOString(),
            actionLink: "/listings"
        }
    ];

    return {
        sales: {
            gmv: 1450200,
            netRevenue: 1374047,
            orders: 221,
            aov: 6217.41,
            byChannel: [
                { channel: "Amazon JP", sales: 850000 },
                { channel: "Rakuten JP", sales: 420000 },
                { channel: "Shopee VN", sales: 104047 }
            ],
            byCountry: [
                { country: "JP", sales: 1270000 },
                { country: "VN", sales: 104047 }
            ]
        },
        product: {
            totalProducts: 1450,
            totalSkus: 4200,
            listedSkus: 3804,
            unlistedSkus: 396,
            mappingCoveragePct: 98.2,
            contentCompletenessPct: 85.0
        },
        inventory: {
            total: 215430,
            ats: 189020,
            reserved: 4210,
            inbound: 22200,
            replenishment: 5040,
            nodes: [
                { nodeId: "WH-AMZ-JP", nodeName: "Amazon FBA (JP)", ats: 85000, reserved: 1200, isVirtual: true, health: "ok" },
                { nodeId: "WH-TYO-01", nodeName: "Tokyo Direct 3PL", ats: 62000, reserved: 2100, isVirtual: false, health: "warning" },
                { nodeId: "WH-SGN-01", nodeName: "HCMC Dist Center", ats: 42020, reserved: 910, isVirtual: false, health: "ok" }
            ]
        },
        oms: {
            ingestionRate: 14.5, // orders/hour Avg
            routingSuccessPct: 99.1,
            allocationLatencyP50: 120, // ms
            pendingOrders: 105,
            pipelineCounts: {
                created: 250,
                validated: 246,
                allocated: 242,
                reserved: 238,
                fulfillment: 220,
                shipped: 154,
                delivered: 102
            }
        },
        fulfillment: {
            pickTimeP50: 2.1, // hours
            packTimeP50: 1.8, // hours
            shipSlaPct: 96.4,
            deliveryTimeAvg: 2.4, // days
            nodePerformance: [
                { nodeId: "WH-TYO-01", nodeName: "Tokyo Direct 3PL", shipSlaPct: 92.1, backlog: 72 }, // Ties to alert
                { nodeId: "WH-SGN-01", nodeName: "HCMC Dist Center", shipSlaPct: 98.5, backlog: 14 }
            ]
        },
        integration: {
            connectors: [amazon, rakuten, shopee, lazada],
            syncMetrics: {
                activeConnectors: 4,
                totalErrors24h: 312,
                avgLagMinutes: 58
            }
        },
        alerts,
        lastRefreshedAt: new Date().toISOString()
    };
}
