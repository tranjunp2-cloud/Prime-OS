import type { InventoryPosition } from './inventory-store';
import type { Product } from './product-store';
import { DEMO_WAREHOUSE_ALIASES } from './demo-warehouse-locations';
import { productWarehouseIds, recordedQuantity } from './warehouse-stock-view';

const locationId = (id: string) => DEMO_WAREHOUSE_ALIASES[id] ?? id;
const positive = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value > 0;

/** Physical stock and warehouse records establish membership, independently of shops/listings. */
export function warehouseProductPresence(product: Product, warehouseId: string, positions: InventoryPosition[], skuCode?: string) {
  const id = locationId(warehouseId);
  const skus = product.has_variants
    ? product.skus.filter(sku => !skuCode || sku.sku_code === skuCode).map(sku => ({ code: sku.sku_code, ids: [sku.id], inventory: sku.stock_by_location ?? {} }))
    : [{ code: product.sku_code, ids: product.skus.length ? product.skus.map(sku => sku.id) : [`${product.id}_default`, product.id, product.sku_code], inventory: product.inventory }];
  const records = positions.filter(position => position.product_id === product.id && locationId(position.warehouse_id) === id && skus.some(sku => sku.ids.includes(position.sku_id)));
  const transfers = (product.inventory_transfers ?? []).filter(transfer => transfer.status === 'in_transit' && positive(transfer.quantity) && skus.some(sku => sku.code === transfer.sku));
  const hasCount = skus.some(sku => Object.entries(sku.inventory).some(([key, value]) => locationId(key) === id && recordedQuantity(value) !== null));
  const incoming = records.some(record => positive(record.inbound) || positive(record.return_pending)) || transfers.some(transfer => locationId(transfer.toWarehouseId) === id);
  const outgoing = records.some(record => positive(record.outbound)) || transfers.some(transfer => locationId(transfer.fromWarehouseId) === id);
  const orderHolds = records.some(record => [record.reserved_unpaid, record.reserved_paid, record.allocated].some(positive));
  const otherHolds = records.some(record => [record.safety_stock, record.campaign_lock, record.unfulfillable].some(positive));
  return { related: hasCount || records.length > 0 || incoming || outgoing, hasCount, hasRecord: records.length > 0, incoming, outgoing, orderHolds, otherHolds };
}

export function warehouseProductLocations(product: Product, positions: InventoryPosition[]): string[] {
  const candidates = new Set([
    ...productWarehouseIds(product),
    ...positions.filter(position => position.product_id === product.id).map(position => position.warehouse_id),
    ...(product.inventory_transfers ?? []).filter(transfer => transfer.status === 'in_transit').flatMap(transfer => [transfer.fromWarehouseId, transfer.toWarehouseId]),
  ].map(locationId));
  return [...candidates].filter(id => warehouseProductPresence(product, id, positions).related);
}
