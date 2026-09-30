import type { InventoryPosition } from './inventory-store';
import { DEMO_WAREHOUSE_ALIASES } from './demo-warehouse-locations';

export const holdReasons = {
  safety_stock: 'Safety stock',
  campaign_lock: 'Reserved for a campaign',
  unfulfillable: 'Damaged / quarantine',
} as const;
export type HoldKind = keyof typeof holdReasons;
export type StockHoldChange = {
  id: string;
  productId: string;
  skuId: string;
  sku: string;
  warehouseId: string;
  kind: HoldKind;
  before: number;
  after: number;
  note: string;
  createdAt: string;
};
export const STOCK_HOLD_STORAGE_KEY = 'primeos-stock-hold-history-v1';
let memoryHistory: StockHoldChange[] = [];
export const canonicalWarehouseId = (id: string) => DEMO_WAREHOUSE_ALIASES[id] ?? id;

export function getStockHoldHistory(): StockHoldChange[] {
  if (typeof window === 'undefined') return memoryHistory;
  const raw = window.localStorage.getItem(STOCK_HOLD_STORAGE_KEY);
  if (!raw) return [];
  const records: unknown = JSON.parse(raw);
  if (!Array.isArray(records)) throw new Error('Saved hold history could not be read. No changes were made.');
  return records.filter((record): record is StockHoldChange => record && typeof record.id === 'string'
    && typeof record.productId === 'string' && typeof record.skuId === 'string' && typeof record.sku === 'string'
    && typeof record.warehouseId === 'string' && Object.prototype.hasOwnProperty.call(holdReasons, record.kind)
    && Number.isSafeInteger(record.before) && record.before >= 0 && Number.isSafeInteger(record.after) && record.after >= 0
    && typeof record.note === 'string' && typeof record.createdAt === 'string');
}

export function recordStockHoldChange(change: StockHoldChange): void {
  const history = [change, ...getStockHoldHistory()];
  // Persist before changing the live balance so a storage failure cannot leave an unaudited hold.
  if (typeof window !== 'undefined') window.localStorage.setItem(STOCK_HOLD_STORAGE_KEY, JSON.stringify(history));
  else memoryHistory = history;
}

export function restoreStockHolds(position: InventoryPosition): InventoryPosition {
  let history: StockHoldChange[];
  try { history = getStockHoldHistory(); } catch { return position; }
  const changes = history.filter(change => change.productId === position.product_id && change.skuId === position.sku_id
    && change.warehouseId === canonicalWarehouseId(position.warehouse_id));
  if (!changes.length) return position;
  const restored = { ...position, version: position.version + changes.length };
  for (const kind of Object.keys(holdReasons) as HoldKind[]) {
    const latest = changes.find(change => change.kind === kind);
    if (latest) restored[kind] = latest.after;
  }
  restored.updated_at = changes[0].createdAt;
  return restored;
}
