import { getInventoryPositions, updatePosition, type InventoryPosition } from './inventory-store';
import type { Product } from './product-store';
import { DEMO_WAREHOUSE_ALIASES } from './demo-warehouse-locations';
import { getWarehouseById } from './warehouse-store';
import { recordedQuantity, type StockValue } from './warehouse-stock-view';

export type AvailabilityState = 'ready' | 'missing' | 'invalid' | 'mismatch' | 'external' | 'unrecorded';
export type AvailabilityItem = {
  warehouseId: string;
  sku: string;
  variant?: string;
  onHand: number | null;
  unpaid: number | null;
  paid: number | null;
  allocated: number | null;
  safety: number | null;
  campaign: number | null;
  damaged: number | null;
  incoming: number | null;
  held: number | null;
  unavailable: number | null;
  atp: number | null;
  state: AvailabilityState;
  updatedAt: string | null;
};
export type AvailabilitySummary = {
  onHand: StockValue;
  held: StockValue;
  unavailable: StockValue;
  atp: StockValue;
  items: AvailabilityItem[];
  covered: number;
  tracked: number;
};
export const availabilityReasons: Record<AvailabilityState, string> = {
  ready: 'Available to sell after order holds, buffers and unsellable stock.',
  missing: 'Order holds and stock buffers have not been recorded for this SKU and warehouse. ATP is not calculated.',
  mismatch: 'The product count and inventory record do not match. Reconcile the physical count before using ATP.',
  invalid: 'The inventory record is incomplete or duplicated. Resolve the record before using ATP.',
  external: 'The marketplace manages this stock. Prime OS does not calculate ATP or allocate these units to other shops.',
  unrecorded: 'No on-hand count has been recorded for this SKU and warehouse.',
};
const normalizeWarehouse = (id: string) => DEMO_WAREHOUSE_ALIASES[id] ?? id;
const validCount = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

/** Product warehouse counts are the on-hand source; inventory positions supply order holds and buffers.
 * Do not combine these counters with the reservation ledger: it represents the same holds. */
export function availabilityAt(product: Product, warehouseIds: string[], positions: InventoryPosition[], skuCode?: string): AvailabilitySummary {
  const skus = product.has_variants
    ? product.skus.filter(sku => !skuCode || sku.sku_code === skuCode).map(sku => ({ code: sku.sku_code, name: sku.variation_name, ids: [sku.id], inventory: sku.stock_by_location ?? {} }))
    : [{ code: product.sku_code, name: '', ids: product.skus.length ? product.skus.map(sku => sku.id) : [`${product.id}_default`, product.id, product.sku_code], inventory: product.inventory }];
  const items: AvailabilityItem[] = [];
  for (const warehouseId of warehouseIds) {
    const assigned = skus.some(sku => recordedQuantity(sku.inventory[warehouseId]) !== null || positions.some(position => position.product_id === product.id && normalizeWarehouse(position.warehouse_id) === warehouseId && sku.ids.includes(position.sku_id)));
    if (warehouseIds.length > 1 && !assigned) continue;
    for (const sku of skus) {
      const matched = positions.filter(position => position.product_id === product.id && normalizeWarehouse(position.warehouse_id) === warehouseId && sku.ids.includes(position.sku_id));
      const onHand = recordedQuantity(sku.inventory[warehouseId]);
      const item: AvailabilityItem = { warehouseId, sku: sku.code, variant: sku.name, onHand, unpaid: null, paid: null, allocated: null, safety: null, campaign: null, damaged: null, incoming: null, held: null, unavailable: null, atp: null, state: 'missing', updatedAt: null };
      const warehouse = getWarehouseById(warehouseId);
      if (warehouse?.is_virtual || ['fba', 'fbs'].includes(warehouse?.type ?? '')) item.state = 'external';
      else if (onHand === null) item.state = 'unrecorded';
      else if (matched.length) {
        const keys = matched.map(position => `${position.sku_id}:${position.warehouse_id}`);
        const fields = ['on_hand', 'reserved_unpaid', 'reserved_paid', 'allocated', 'safety_stock', 'campaign_lock', 'unfulfillable', 'inbound'] as const;
        const complete = new Set(keys).size === keys.length && matched.every(position => fields.every(key => validCount(position[key])))
          && (!product.has_variants && product.skus.length > 0 ? sku.ids.every(id => matched.some(position => position.sku_id === id)) : true);
        if (!complete || !validCount(onHand)) item.state = 'invalid';
        else if (matched.reduce((total, position) => total + position.on_hand, 0) !== onHand) item.state = 'mismatch';
        else {
          const sum = (field: typeof fields[number]) => matched.reduce((total, position) => total + position[field], 0);
          Object.assign(item, { unpaid: sum('reserved_unpaid'), paid: sum('reserved_paid'), allocated: sum('allocated'), safety: sum('safety_stock'), campaign: sum('campaign_lock'), damaged: sum('unfulfillable'), incoming: sum('inbound'), state: 'ready' });
          item.held = item.unpaid! + item.paid! + item.allocated!;
          item.unavailable = item.safety! + item.campaign! + item.damaged!;
          item.atp = Math.max(0, onHand - item.held - item.unavailable);
          const times = matched.map(position => position.updated_at).filter(value => Number.isFinite(Date.parse(value))).sort();
          item.updatedAt = times.length === matched.length ? times[0] : null;
        }
      }
      items.push(item);
    }
  }
  return summarizeAvailability(items);
}

export function summarizeAvailability(items: AvailabilityItem[]): AvailabilitySummary {
  const sum = (field: 'onHand' | 'held' | 'unavailable' | 'atp'): StockValue => {
    const recorded = items.filter(item => item[field] !== null);
    return { quantity: recorded.length ? recorded.reduce((total, item) => total + item[field]!, 0) : null, incomplete: recorded.length > 0 && recorded.length < items.length };
  };
  return { onHand: sum('onHand'), held: sum('held'), unavailable: sum('unavailable'), atp: sum('atp'), items, covered: items.filter(item => item.state === 'ready').length, tracked: items.length };
}

export function warehouseAvailability(products: Product[], warehouseIds: string[], positions: InventoryPosition[]): AvailabilitySummary {
  return summarizeAvailability(products.flatMap(product => {
    const summary = availabilityAt(product, warehouseIds, positions);
    return summary.onHand.quantity === null ? [] : summary.items;
  }));
}

/** Keep an existing, unambiguous position in step with an explicitly saved physical count.
 * Missing positions are left missing: a stock count cannot supply unknown order holds. */
export function syncRecordedInventoryCounts(product: Product, next: Product, warehouseIds: string[], skuCode: string): void {
  const sku = product.has_variants ? product.skus.find(item => item.sku_code === skuCode) : undefined;
  if (product.has_variants && !sku) return;
  const ids = sku ? [sku.id] : product.skus.length ? product.skus.map(item => item.id) : [`${product.id}_default`, product.id, product.sku_code];
  const inventory = sku ? next.skus.find(item => item.id === sku.id)?.stock_by_location : next.inventory;
  for (const warehouseId of warehouseIds) {
    const records = getInventoryPositions().filter(position => position.product_id === product.id && normalizeWarehouse(position.warehouse_id) === warehouseId && ids.includes(position.sku_id));
    const quantity = inventory?.[warehouseId];
    if (records.length === 1 && validCount(quantity)) updatePosition(records[0].id, { on_hand: quantity });
  }
}
