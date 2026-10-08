import type { Product } from './product-store';
import type { InventoryPosition } from './inventory-store';
import { availabilityAt } from './warehouse-availability';
import { warehouseProductLocations, warehouseProductPresence } from './warehouse-product-scope';
import { canEditWarehouseStock, recordedQuantity } from './warehouse-stock-view';
import { getWarehouses } from './warehouse-store';

/** Warehouse membership comes from this SKU's records, never from the warehouse registry or a shop link. */
export function variantInventoryView(product: Product | null | undefined, skuId: string | undefined, positions: InventoryPosition[]) {
  const sku = product?.has_variants ? product.skus.find(item => item.id === skuId) : undefined;
  const warehouses = getWarehouses();
  const locations = product && sku ? warehouseProductLocations(product, positions)
    .filter(id => warehouseProductPresence(product, id, positions, sku.sku_code).related)
    .map(id => {
      const warehouse = warehouses.find(item => item.id === id);
      const balance = availabilityAt(product, [id], positions, sku.sku_code).items[0];
      return { id, label: warehouse?.name ?? 'Unknown stock location', code: warehouse?.code ?? id,
        external: Boolean(warehouse?.is_virtual || ['fba', 'fbs'].includes(warehouse?.type ?? '')),
        writable: warehouse?.status === 'active' && canEditWarehouseStock(id),
        balance, presence: warehouseProductPresence(product, id, positions, sku.sku_code) };
    }) : [];
  const recorded = locations.filter(location => location.balance?.onHand !== null && location.balance?.onHand !== undefined);
  return {
    sku, locations, recordedCount: recorded.length,
    total: recorded.length ? recorded.reduce((sum, location) => sum + location.balance.onHand!, 0) : null,
    incomplete: recorded.length < locations.length,
    availableLocations: sku ? warehouses.filter(warehouse => warehouse.status === 'active' && canEditWarehouseStock(warehouse.id)
      && recordedQuantity(sku.stock_by_location?.[warehouse.id]) === null) : [],
  };
}
export type VariantInventoryView = ReturnType<typeof variantInventoryView>;
