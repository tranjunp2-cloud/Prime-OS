import { getProducts, type StockTransferRecord } from './product-store';
import { getWarehouseById } from './warehouse-store';
import { applyWarehouseStockChange, recordedQuantity } from './warehouse-stock-view';
import { availabilityAt } from './warehouse-availability';
import { getInventoryPositions } from './inventory-store';
import { commitStockOperation, countForSku, withStockPosition } from './warehouse-stock-operations';
import { canEditWarehouseStock } from './warehouse-stock-view';

export type StockTransferInput = {
  productId: string;
  sku: string;
  from: string;
  to: string;
  quantity: number;
  expectedFrom: number | null;
  expectedTo: number | null;
  mode?: 'in_transit' | 'received';
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
  if (!canEditWarehouseStock(input.from) || !canEditWarehouseStock(input.to)) throw new Error('External warehouse stock is read only.');
  if (input.mode !== 'in_transit' && toBefore === null) throw new Error('Record the current stock at the destination first, including 0 if it is empty.');
  const stock = availabilityAt(product, [input.from], getInventoryPositions(), input.sku);
  if (stock.atp.quantity === null || stock.atp.incomplete) throw new Error('Set up available stock at the source warehouse before transferring.');
  if (input.quantity > stock.atp.quantity) throw new Error(`Only ${stock.atp.quantity} units are available. Stock held for orders or other reasons cannot be transferred.`);
  const moved = applyWarehouseStockChange(product, { type: 'transfer', ...input });
  const inTransit = input.mode === 'in_transit';
  let next = inTransit ? applyWarehouseStockChange(product, { type: 'adjustment', from: input.from, sku: input.sku, quantity: -input.quantity }) : moved;
  const record: StockTransferRecord = {
    id: crypto.randomUUID(), sku: input.sku, fromWarehouseId: input.from, toWarehouseId: input.to,
    quantity: input.quantity, fromBefore: fromBefore!, fromAfter: fromBefore! - input.quantity,
    toBefore, toAfter: inTransit ? (toBefore ?? 0) : (toBefore ?? 0) + input.quantity, createdAt: new Date().toISOString(), status: inTransit ? 'in_transit' : 'received',
  };
  next = withStockPosition(next, input.from, input.sku);
  if (!inTransit) next = withStockPosition(next, input.to, input.sku);
  commitStockOperation([{ ...next, inventory_transfers: [record, ...(product.inventory_transfers ?? [])] }]);
  return record;
}

export function receiveWarehouseTransfer(productId: string, recordId: string): StockTransferRecord {
  const product = getProducts().find(item => item.id === productId);
  const record = product?.inventory_transfers?.find(item => item.id === recordId);
  if (!product || !record || record.status !== 'in_transit') throw new Error('This transfer has already been received or is no longer available.');
  const warehouse = getWarehouseById(record.toWarehouseId);
  if (!warehouse || warehouse.status !== 'active' || !canEditWarehouseStock(warehouse.id)) throw new Error('The destination must be active and editable.');
  const before = countForSku(product, warehouse.id, record.sku);
  if (before === null) throw new Error('Record the current stock at the destination first, including 0 if it is empty. Then confirm receipt.');
  const after = before + record.quantity;
  const next = withStockPosition(applyWarehouseStockChange(product, { type: 'adjustment', from: warehouse.id, sku: record.sku, quantity: record.quantity }), warehouse.id, record.sku);
  const received: StockTransferRecord = { ...record, status: 'received', toBefore: before, toAfter: after, receivedAt: new Date().toISOString() };
  commitStockOperation([{ ...next, inventory_transfers: product.inventory_transfers!.map(item => item.id === record.id ? received : item) }]);
  return received;
}
