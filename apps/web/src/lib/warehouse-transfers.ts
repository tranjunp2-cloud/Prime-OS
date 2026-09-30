import { getProducts, updateProduct, type StockTransferRecord } from './product-store';
import { getWarehouseById } from './warehouse-store';
import { applyWarehouseStockChange, recordedQuantity } from './warehouse-stock-view';
import { syncRecordedInventoryCounts } from './warehouse-availability';

export type StockTransferInput = {
  productId: string;
  sku: string;
  from: string;
  to: string;
  quantity: number;
  expectedFrom: number | null;
  expectedTo: number | null;
};

export function recordWarehouseTransfer(input: StockTransferInput): StockTransferRecord {
  const product = getProducts().find(item => item.id === input.productId);
  if (!product) throw new Error('This product no longer exists. Close the form and refresh.');
  if ([input.from, input.to].some(id => getWarehouseById(id)?.status !== 'active')) throw new Error('Choose active warehouses for this transfer.');
  const variant = product.has_variants ? product.skus.find(item => item.sku_code === input.sku) : undefined;
  if (product.has_variants ? !variant : input.sku !== product.sku_code) throw new Error('Choose a valid product or variant SKU.');
  const inventory = variant ? variant.stock_by_location : product.inventory;
  const fromBefore = recordedQuantity(inventory?.[input.from]);
  const toBefore = recordedQuantity(inventory?.[input.to]);
  if (fromBefore !== input.expectedFrom || toBefore !== input.expectedTo) throw new Error('Stock changed while this form was open. Close it and reopen to review the latest count.');
  const next = applyWarehouseStockChange(product, { type: 'transfer', ...input });
  const record: StockTransferRecord = {
    id: crypto.randomUUID(), sku: input.sku, fromWarehouseId: input.from, toWarehouseId: input.to,
    quantity: input.quantity, fromBefore: fromBefore!, fromAfter: fromBefore! - input.quantity,
    toBefore, toAfter: (toBefore ?? 0) + input.quantity, createdAt: new Date().toISOString(),
  };
  updateProduct(product.id, {
    id: product.id, inventory: next.inventory, skus: next.skus,
    inventory_transfers: [record, ...(product.inventory_transfers ?? [])],
  }, { requirePersistence: true });
  syncRecordedInventoryCounts(product, next, [input.from, input.to], input.sku);
  return record;
}
