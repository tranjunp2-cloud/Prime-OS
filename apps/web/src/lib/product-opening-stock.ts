import type { Product } from './product-store';
import { getWarehouseById } from './warehouse-store';
import { canEditWarehouseStock } from './warehouse-stock-view';
import { withStockPosition } from './warehouse-stock-operations';
import { singleSkuForConversion } from './product-variant-plan';

/** Stage counts and audit snapshots in the SAME durable product write. Never overwrite saved SKU stock. */
export function prepareProductOpeningStock(product: Product, previous?: Product | null): Product {
  let next: Product = { ...product, warehouse_positions: previous?.warehouse_positions ?? [], inventory_adjustments: previous?.inventory_adjustments ?? [] };
  const oldIds = new Set(previous?.skus.map(sku => sku.id) ?? []);
  if (previous && !previous.has_variants) oldIds.add(singleSkuForConversion(previous).id!);
  const newCounts = product.has_variants
    ? product.skus.filter(sku => sku.status === 'active' && !oldIds.has(sku.id)).map(sku => ({ sku: sku.sku_code, locations: sku.stock_by_location ?? {} }))
    : !previous ? [{ sku: product.sku_code, locations: product.inventory }] : [];
  for (const item of newCounts) for (const [warehouseId, quantity] of Object.entries(item.locations)) {
    if (!canEditWarehouseStock(warehouseId) || getWarehouseById(warehouseId)?.status !== 'active') throw new Error('Choose an active, editable warehouse for each opening count.');
    if (!Number.isSafeInteger(quantity) || quantity < 0) throw new Error('Opening stock must be a whole count of 0 or more.');
    next = withStockPosition({ ...next, inventory_adjustments: [{ id: crypto.randomUUID(), warehouseId, sku: item.sku, before: null, after: quantity, reason: 'Opening stock', createdAt: new Date().toISOString(), kind: 'opening' }, ...(next.inventory_adjustments ?? [])] }, warehouseId, item.sku, true);
  }
  return next;
}
