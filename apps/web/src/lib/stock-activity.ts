import type { Product } from './product-store';
import { canonicalWarehouseId, holdReasons, type StockHoldChange } from './stock-hold-history';

export type StockActivityType = 'adjustment' | 'transfer' | 'hold' | 'release';
export const activityLabels: Record<StockActivityType, string> = {
  adjustment: 'Adjustment', transfer: 'Transfer', hold: 'Hold added', release: 'Hold released',
};
export type StockActivity = {
  id: string;
  key: string;
  type: StockActivityType;
  productId: string;
  productName: string;
  sku: string;
  createdAt: string;
  warehouseIds: string[];
  warehouseNames: string[];
  quantity: number;
  before: number | null;
  after: number;
  reason: string;
  note?: string;
  destinationBefore?: number | null;
  destinationAfter?: number;
};
export type ActivityFilters = { search: string; type: StockActivityType | 'all'; warehouseId: string; period: '30' | '7' | 'today' | 'all' | 'custom'; from: string; to: string };
export const defaultActivityFilters: ActivityFilters = { search: '', type: 'all', warehouseId: '', period: '30', from: '', to: '' };
export const ACTIVITY_PAGE_SIZE = 25;

function periodBounds(filters: ActivityFilters, now: Date) {
  let from = -Infinity;
  let to = Infinity;
  if (filters.period === 'custom') {
    if (filters.from) from = new Date(`${filters.from}T00:00:00`).getTime();
    if (filters.to) to = new Date(`${filters.to}T23:59:59.999`).getTime();
  } else if (filters.period !== 'all') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (filters.period === 'today' ? 0 : Number(filters.period) - 1));
    from = start.getTime();
    to = now.getTime();
  }
  return { from, to, invalid: Number.isNaN(from) || Number.isNaN(to) || from > to };
}

/** Local prototype adapter. Keep filtering and paging out of the view so an API can replace this source. */
export function createStockActivitySource(products: Product[], holds: StockHoldChange[], warehouses: { id: string; name: string }[]) {
  const names = new Map(warehouses.map(item => [item.id, item.name]));
  const byProduct = new Map(products.map(item => [item.id, item]));
  const events: StockActivity[] = [];
  const location = (id: string) => names.get(canonicalWarehouseId(id)) ?? id;
  for (const product of products) {
    const common = { productId: product.id, productName: product.name };
    for (const item of product.inventory_adjustments ?? []) {
      events.push({ ...common, ...item, key: `adjustment:${item.id}`, type: 'adjustment', quantity: item.before === null ? item.after : item.after - item.before,
        warehouseIds: [canonicalWarehouseId(item.warehouseId)], warehouseNames: [location(item.warehouseId)] });
    }
    for (const item of product.inventory_transfers ?? []) {
      events.push({ ...common, id: item.id, key: `transfer:${item.id}`, type: 'transfer', sku: item.sku, createdAt: item.createdAt,
        warehouseIds: [canonicalWarehouseId(item.fromWarehouseId), canonicalWarehouseId(item.toWarehouseId)], warehouseNames: [location(item.fromWarehouseId), location(item.toWarehouseId)],
        quantity: item.quantity, before: item.fromBefore, after: item.fromAfter, destinationBefore: item.toBefore, destinationAfter: item.toAfter,
        reason: 'Moved between warehouses',
      });
    }
  }
  for (const item of holds) {
    const type = item.after >= item.before ? 'hold' : 'release';
    events.push({ ...item, key: `${type}:${item.id}`, type, productName: byProduct.get(item.productId)?.name ?? item.sku,
      warehouseIds: [canonicalWarehouseId(item.warehouseId)], warehouseNames: [location(item.warehouseId)], quantity: Math.abs(item.after - item.before), reason: holdReasons[item.kind] });
  }
  // Build once per source change; typing or moving between pages reuses the index.
  const index = events.map(item => ({ item, timestamp: new Date(item.createdAt).getTime(), search: `${item.id} ${item.productName} ${item.sku} ${item.reason} ${item.warehouseNames.join(' ')}`.toLocaleLowerCase() }))
    .sort((a, b) => (b.timestamp - a.timestamp) || b.item.key.localeCompare(a.item.key));
  const warehouseOptions = new Map(warehouses.map(item => [item.id, item.name]));
  events.forEach(item => item.warehouseIds.forEach((id, i) => warehouseOptions.set(id, item.warehouseNames[i])));
  return {
    warehouseOptions: [...warehouseOptions].map(([id, name]) => ({ id, name })),
    query(filters: ActivityFilters, requestedPage: number, focusId?: string | null, now = new Date()) {
      const bounds = periodBounds(filters, now);
      const terms = filters.search.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
      const matches = bounds.invalid ? [] : index.filter(({ item, timestamp, search }) =>
        (filters.type === 'all' || item.type === filters.type)
        && (!filters.warehouseId || item.warehouseIds.includes(filters.warehouseId))
        && timestamp >= bounds.from && timestamp <= bounds.to
        && terms.every(term => search.includes(term)));
      const pages = Math.max(1, Math.ceil(matches.length / ACTIVITY_PAGE_SIZE));
      const focusIndex = focusId ? matches.findIndex(({ item }) => item.id === focusId) : -1;
      const page = focusIndex >= 0 ? Math.floor(focusIndex / ACTIVITY_PAGE_SIZE) + 1 : Math.max(1, Math.min(pages, requestedPage));
      const start = (page - 1) * ACTIVITY_PAGE_SIZE;
      return { items: matches.slice(start, start + ACTIVITY_PAGE_SIZE).map(({ item }) => item), total: matches.length, allTotal: events.length,
        pages, page, start, invalidDateRange: bounds.invalid, focusHidden: Boolean(focusId && focusIndex < 0) };
    },
  };
}
