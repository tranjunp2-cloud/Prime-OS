import { getProducts, type Product } from './product-store';
import { getInventoryPositions, updatePosition, type InventoryPosition } from './inventory-store';
import { getWarehouseById } from './warehouse-store';
import { canEditWarehouseStock } from './warehouse-stock-view';
import { availabilityAt, availabilityReasons } from './warehouse-availability';
import { canonicalWarehouseId, getStockHoldHistory, holdReasons, recordStockHoldChange, type HoldKind } from './stock-hold-history';

export function getHoldContext(product: Product, warehouseId: string, sku: string, positions: InventoryPosition[]) {
  if (!canEditWarehouseStock(warehouseId) || getWarehouseById(warehouseId)?.status !== 'active') throw new Error('Holds can only be managed in an active, editable warehouse.');
  const variant = product.has_variants ? product.skus.find(item => item.sku_code === sku) : undefined;
  if (product.has_variants && !variant) throw new Error('Choose a variant SKU.');
  const summary = availabilityAt(product, [warehouseId], positions, sku);
  const item = summary.items[0];
  if (!item || item.state !== 'ready') throw new Error(item ? availabilityReasons[item.state] : 'Stock details are not available.');
  const skuIds = variant ? [variant.id] : product.skus.length ? product.skus.map(item => item.id) : [`${product.id}_default`, product.id, product.sku_code];
  const matched = positions.filter(position => position.product_id === product.id && canonicalWarehouseId(position.warehouse_id) === warehouseId && skuIds.includes(position.sku_id));
  if (matched.length !== 1) throw new Error('This SKU has multiple stock records. Reconcile its inventory records before managing holds.');
  return { position: matched[0], item };
}

/** A menu action must lead to a usable hold or release form for this exact SKU. */
export function canManageWarehouseHolds(product: Product, warehouseId: string, sku: string, positions: InventoryPosition[]): boolean {
  try {
    const { item } = getHoldContext(product, warehouseId, sku, positions);
    return item.atp! > 0 || item.unavailable! > 0;
  } catch { return false; }
}

export function changeWarehouseHold(input: { productId: string; warehouseId: string; sku: string; kind: HoldKind; action: 'hold' | 'release'; quantity: number; note: string; expectedPosition: InventoryPosition }) {
  const product = getProducts().find(item => item.id === input.productId);
  if (!product) throw new Error('This product no longer exists. Close the form and refresh.');
  if (!Object.prototype.hasOwnProperty.call(holdReasons, input.kind) || !['hold', 'release'].includes(input.action)) throw new Error('Choose a hold reason and action.');
  if (!Number.isSafeInteger(input.quantity) || input.quantity <= 0) throw new Error('Enter a whole number greater than 0.');
  const { position, item } = getHoldContext(product, input.warehouseId, input.sku, getInventoryPositions());
  if (JSON.stringify(position) !== JSON.stringify(input.expectedPosition)) throw new Error('Stock changed while this form was open. Close it and reopen to review the latest balance.');
  const savedChanges = getStockHoldHistory().filter(change => change.productId === product.id && change.skuId === position.sku_id && change.warehouseId === input.warehouseId);
  for (const kind of Object.keys(holdReasons) as HoldKind[]) {
    const latest = savedChanges.find(change => change.kind === kind);
    if (latest && latest.after !== position[kind]) throw new Error('Holds changed in another tab. Reload this page to review the latest balance.');
  }
  const before = position[input.kind];
  if (input.action === 'hold' && input.quantity > item.atp!) throw new Error(`Only ${item.atp} units are available to hold.`);
  if (input.action === 'release' && input.quantity > before) throw new Error(`Only ${before} units are held for this reason.`);
  const after = before + (input.action === 'hold' ? input.quantity : -input.quantity);
  const createdAt = new Date().toISOString();
  const record = { id: crypto.randomUUID(), productId: product.id, warehouseId: input.warehouseId, skuId: position.sku_id, sku: input.sku, kind: input.kind, before, after, note: input.note.trim(), createdAt };
  recordStockHoldChange(record);
  updatePosition(position.id, { [input.kind]: after, updated_at: createdAt });
  return record;
}
