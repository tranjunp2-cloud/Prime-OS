import type { ChannelListing, Product } from './product-store';

export type SalesPeriodDays = 7 | 30 | 90;
export const SALES_CHANNEL_LABELS: Record<ChannelListing['channel'], string> = {
  amazon: 'Amazon', shopee: 'Shopee', lazada: 'Lazada', rakuten: 'Rakuten',
  website: 'PrimeWeb', pos: 'PrimePOS', tiktok: 'TikTok Shop', social: 'Social',
};
const DAY = 86_400_000;

/** An analytics adapter must supply stable shop IDs and complete half-open coverage windows. */
export interface SalesShop {
  id: string;
  name: string;
  channel: ChannelListing['channel'];
  coveredFrom: string | null;
  coveredUntil: string | null;
  updatedAt: string | null;
}
/** Product ownership is captured at sale time, never inferred from a name or current SKU mapping. */
export interface ProductSalesLine {
  id: string;
  orderId: string;
  productId: string;
  shopId: string;
  listingId: string;
  sku: string;
  quantity: number;
  completedAt: string;
  status: 'completed' | 'pending' | 'cancelled';
}
export interface ProductSalesData {
  demo: boolean;
  shops: SalesShop[];
  lines: ProductSalesLine[];
}

export function salesWindow(days: SalesPeriodDays, now: Date) {
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return { start: end - days * DAY, end, previousStart: end - days * DAY * 2 };
}

export function salesChange(current: number, previous: number, comparable: boolean): number | null {
  return comparable && previous > 0 ? (current - previous) / previous * 100 : null;
}

export function summarizeProductSales(productId: string, data: ProductSalesData, days: SalesPeriodDays, now: Date) {
  const window = salesWindow(days, now);
  const shops = [...new Map(data.shops.map(shop => [shop.id, shop])).values()];
  const seen = new Set<string>();
  const validLines = data.lines.filter(line => {
    const key = JSON.stringify([line.shopId, line.orderId, line.id]);
    if (line.productId !== productId || line.status !== 'completed' || !Number.isInteger(line.quantity)
      || line.quantity <= 0 || !Number.isFinite(Date.parse(line.completedAt)) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const rows = shops.map(shop => {
    const from = shop.coveredFrom ? Date.parse(shop.coveredFrom) : NaN;
    const until = shop.coveredUntil ? Date.parse(shop.coveredUntil) : NaN;
    const complete = from <= window.start && until >= window.end;
    const partial = !complete && from < window.end && until > window.start;
    const coverage = complete ? 'complete' as const : partial ? 'partial' as const : 'unavailable' as const;
    const lines = validLines.filter(line => line.shopId === shop.id && Date.parse(line.completedAt) >= Math.max(window.start, from)
      && Date.parse(line.completedAt) < Math.min(window.end, until));
    const previousLines = validLines.filter(line => line.shopId === shop.id
      && Date.parse(line.completedAt) >= window.previousStart && Date.parse(line.completedAt) < window.start);
    const units = lines.reduce((sum, line) => sum + line.quantity, 0);
    const previousUnits = previousLines.reduce((sum, line) => sum + line.quantity, 0);
    return { ...shop, coverage, lines, units, previousUnits,
      orders: new Set(lines.map(line => line.orderId)).size,
      change: salesChange(units, previousUnits, complete && from <= window.previousStart),
    };
  }).sort((a, b) => {
    const priority = { complete: 0, partial: 1, unavailable: 2 };
    return priority[a.coverage] - priority[b.coverage] || b.units - a.units || a.name.localeCompare(b.name);
  });
  // Only fully covered shops participate in totals, shares and ranking; partial shops stay visible.
  const ranked = rows.filter(row => row.coverage === 'complete');
  const units = ranked.reduce((sum, row) => sum + row.units, 0);
  const orders = ranked.reduce((sum, row) => sum + row.orders, 0);
  const leaders = units > 0 ? ranked.filter(row => row.units === ranked[0].units) : [];
  const previousUnits = ranked.reduce((sum, row) => sum + row.previousUnits, 0);
  const timestamps = ranked.map(row => row.updatedAt && Date.parse(row.updatedAt)).filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return { window, rows, units, orders, leaders, completeShops: ranked.length,
    change: salesChange(units, previousUnits, ranked.length > 0 && ranked.every(row => row.coveredFrom && Date.parse(row.coveredFrom) <= window.previousStart)),
    updatedAt: timestamps.length === ranked.length && timestamps.length ? new Date(Math.min(...timestamps)).toISOString() : null,
  };
}

/** Legacy listing names are used ONLY for display/demo grouping, never to attribute real orders. */
export function salesShopsForProduct(product: Pick<Product, 'channels'> | undefined): SalesShop[] {
  const shops = new Map<string, SalesShop>();
  product?.channels.forEach((listing, index) => {
    const name = listing.store_name?.trim();
    // Do not merge unnamed shops merely because they share a channel.
    const id = JSON.stringify([listing.channel, name || listing.external_id || `unknown-${index}`]);
    if (!shops.has(id)) shops.set(id, {
      id, name: name || `${SALES_CHANNEL_LABELS[listing.channel]} · Shop not recorded`, channel: listing.channel,
      coveredFrom: null, coveredUntil: null, updatedAt: null,
    });
  });
  return [...shops.values()];
}

/** Read-only examples, isolated from OMS, product persistence, stock and activity history. */
export function demoProductSales(product: Pick<Product, 'id' | 'sku_code' | 'channels'>, now: Date): ProductSalesData {
  const { end } = salesWindow(90, now);
  const shops = salesShopsForProduct(product).map(shop => ({ ...shop, id: `demo:${shop.id}`,
    name: shop.name.includes('Shop not recorded') ? `Demo ${SALES_CHANNEL_LABELS[shop.channel]} shop` : shop.name,
    coveredFrom: new Date(end - 180 * DAY).toISOString(), coveredUntil: new Date(end).toISOString(), updatedAt: new Date(end).toISOString(),
  }));
  const lines: ProductSalesLine[] = [];
  shops.forEach((shop, shopIndex) => {
    for (let day = 1; day <= 180; day += 1) {
      const count = Math.max(1, 3 - shopIndex);
      if ((day + shopIndex) % (5 + shopIndex) === 0) continue;
      for (let order = 0; order < count; order += 1) {
        const orderId = `DEMO-${shopIndex + 1}-${String(day).padStart(3, '0')}-${order + 1}`;
        lines.push({ id: `${orderId}-line`, orderId, productId: product.id, shopId: shop.id,
          listingId: `demo-listing-${shopIndex}`, sku: product.sku_code,
          quantity: day <= 30 ? 1 + (day + order + shopIndex) % (3 - shopIndex % 3) : 1 + (day + order + shopIndex) % 2,
          completedAt: new Date(end - day * DAY + (9 + order) * 3_600_000).toISOString(), status: 'completed',
        });
      }
    }
  });
  return { demo: true, shops, lines };
}
