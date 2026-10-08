import { getProducts, commitWarehouseProducts, type Product } from './product-store';
import { addInventoryPosition, getInventoryPositions, updatePosition, type InventoryPosition } from './inventory-store';
import { canonicalWarehouseId } from './stock-hold-history';
import { initializeProductStockLocation, applyWarehouseStockChange, recordedQuantity, canEditWarehouseStock } from './warehouse-stock-view';
import { getWarehouseById } from './warehouse-store';

export function skuPositions(product: Product, warehouseId: string, sku: string): InventoryPosition[] {
  const ids = product.has_variants ? product.skus.filter(item => item.sku_code === sku).map(item => item.id)
    : product.skus.length ? product.skus.map(item => item.id) : [`${product.id}_default`, product.id, product.sku_code];
  return getInventoryPositions().filter(item => item.product_id === product.id && canonicalWarehouseId(item.warehouse_id) === warehouseId && ids.includes(item.sku_id));
}

export function countForSku(product: Product, warehouseId: string, sku: string): number | null {
  return recordedQuantity(product.has_variants ? product.skus.find(item => item.sku_code === sku)?.stock_by_location?.[warehouseId] : product.inventory[warehouseId]);
}

/** Prepare a snapshot without exposing any balance before durable commit succeeds. */
export function withStockPosition(product: Product, warehouseId: string, sku: string, confirmNoHolds = false): Product {
  const records = skuPositions(product, warehouseId, sku);
  const count = countForSku(product, warehouseId, sku);
  if (records.length > 1) throw new Error('This SKU has multiple inventory records. Reconcile them before changing stock.');
  if (count === null || (!records.length && !confirmNoHolds)) return product;
  if (!records.length && !product.has_variants && product.skus.length > 1) throw new Error('This product has multiple inventory SKUs. Review its variants before setting up availability.');
  const position: InventoryPosition = records.length ? { ...records[0], on_hand: count, updated_at: new Date().toISOString(), version: records[0].version + 1 } : {
    id: crypto.randomUUID(), product_id: product.id, sku_id: product.has_variants ? product.skus.find(item => item.sku_code === sku)!.id : product.skus[0]?.id ?? `${product.id}_default`,
    warehouse_id: warehouseId, on_hand: count, reserved_unpaid: 0, reserved_paid: 0, allocated: 0, safety_stock: 0, campaign_lock: 0,
    unfulfillable: 0, inbound: 0, outbound: 0, return_pending: 0, version: 1, updated_at: new Date().toISOString(),
  };
  return { ...product, warehouse_positions: [...(product.warehouse_positions ?? []).filter(item => !(canonicalWarehouseId(item.warehouse_id) === warehouseId && item.sku_id === position.sku_id)), position] };
}

export function commitStockOperation(products: Product[]): void {
  const changedSnapshots = products.flatMap(product => (product.warehouse_positions ?? []).filter(snapshot =>
    !getProducts().find(current => current.id === product.id)?.warehouse_positions?.includes(snapshot)));
  commitWarehouseProducts(products);
  for (const snapshot of changedSnapshots) {
    if (getInventoryPositions().some(item => item.id === snapshot.id)) updatePosition(snapshot.id, snapshot);
    else addInventoryPosition(snapshot);
  }
}

export type StockCountKind = NonNullable<NonNullable<Product['inventory_adjustments']>[number]['kind']>;
export const adjustmentReasons = ['Physical stock count', 'Damaged stock', 'Lost stock', 'Inbound recount'] as const;
export const receiptReasons = ['Goods received', 'Returned items'] as const;
export type CountInput = { productId: string; warehouseId: string; sku: string; quantity: number; expected: number | null; reason: string; confirmNoHolds?: boolean; kind?: StockCountKind };
export function recordWarehouseCounts(inputs: CountInput[]): string[] {
  if (!inputs.length) throw new Error('Enter at least one stock count.');
  const seen = new Set<string>();
  const changed = new Map<string, Product>();
  const ids: string[] = [];
  for (const input of inputs) {
    const key = `${input.productId}:${input.warehouseId}:${input.sku}`;
    if (seen.has(key)) throw new Error('The same SKU appears more than once.');
    seen.add(key);
    if (!canEditWarehouseStock(input.warehouseId) || getWarehouseById(input.warehouseId)?.status !== 'active') throw new Error('Choose an active, editable warehouse.');
    if (!Number.isSafeInteger(input.quantity) || input.quantity < 0 || !input.reason.trim()) throw new Error('Enter a whole count of 0 or more and a reason.');
    const current = changed.get(input.productId) ?? getProducts().find(item => item.id === input.productId);
    if (!current) throw new Error('This product no longer exists.');
    if (current.has_variants ? !current.skus.some(item => item.sku_code === input.sku) : current.sku_code !== input.sku) throw new Error('Choose a valid SKU.');
    const before = countForSku(current, input.warehouseId, input.sku);
    if (before !== input.expected) throw new Error('Stock changed. Reopen the form and review the latest counts.');
    const kind = input.kind ?? (before === null ? 'opening' : 'adjustment');
    if (kind === 'opening' ? before !== null : before === null) throw new Error(kind === 'opening' ? 'Opening stock is already recorded. Use Receive stock or Adjust stock.' : 'Record opening stock before receiving or adjusting this SKU.');
    if (kind === 'receipt' && (input.quantity <= before! || !receiptReasons.some(reason => reason === input.reason))) throw new Error('Enter a positive received quantity and a receipt type.');
    if (kind === 'adjustment' && (!adjustmentReasons.some(reason => reason === input.reason) || input.quantity === before)) throw new Error('Choose an adjustment reason and enter a changed physical count. Use Receive stock for incoming goods.');
    if (kind === 'availability' && (input.quantity !== before || !input.confirmNoHolds)) throw new Error('Availability setup must preserve the count and confirm existing holds.');
    const reason = kind === 'opening' ? 'Opening stock' : kind === 'availability' ? 'Availability setup' : input.reason;
    const next = before === null ? initializeProductStockLocation(current, input.warehouseId, input.quantity, input.sku)
      : before === input.quantity ? current : applyWarehouseStockChange(current, { type: 'adjustment', sku: input.sku, from: input.warehouseId, quantity: input.quantity - before });
    const id = crypto.randomUUID();
    ids.push(id);
    changed.set(current.id, withStockPosition({ ...next, inventory_adjustments: [{ id, kind, sku: input.sku, warehouseId: input.warehouseId, before, after: input.quantity, reason, createdAt: new Date().toISOString() }, ...(next.inventory_adjustments ?? [])] }, input.warehouseId, input.sku, input.confirmNoHolds));
  }
  commitStockOperation([...changed.values()]);
  return ids;
}
