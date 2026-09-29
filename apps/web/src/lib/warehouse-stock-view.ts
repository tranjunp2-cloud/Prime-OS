import type { Product } from './product-store';
import { getWarehouseById } from './warehouse-store';

export type StockValue = { quantity: number | null; incomplete: boolean };
export function recordedQuantity(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
export function productWarehouseIds(product: Product): string[] {
  return [...new Set([...Object.keys(product.inventory ?? {}), ...product.skus.flatMap(sku => Object.keys(sku.stock_by_location ?? {}))])];
}
export function stockAt(product: Product, warehouseId: string): StockValue {
  if (!product.has_variants) return { quantity: recordedQuantity(product.inventory?.[warehouseId]), incomplete: false };
  const values = product.skus.map(sku => recordedQuantity(sku.stock_by_location?.[warehouseId]));
  const recorded = values.filter((value): value is number => value !== null);
  return { quantity: recorded.length ? recorded.reduce((sum, value) => sum + value, 0) : null, incomplete: recorded.length > 0 && recorded.length < values.length };
}
export function sumStock(values: StockValue[]): StockValue {
  const recorded = values.filter(value => value.quantity !== null);
  return { quantity: recorded.length ? recorded.reduce((sum, value) => sum + value.quantity!, 0) : null, incomplete: recorded.some(value => value.incomplete) };
}
export function canEditWarehouseStock(id: string): boolean {
  const warehouse = getWarehouseById(id);
  return Boolean(warehouse && !warehouse.is_virtual && ['internal', '3pl'].includes(warehouse.type));
}
export const channelNames: Record<string, string> = { shopee: 'Shopee', lazada: 'Lazada', amazon: 'Amazon', tiktok: 'TikTok Shop', rakuten: 'Rakuten', website: 'Website', pos: 'POS', social: 'Social' };
export const activeChannels = (product: Product) => [...new Set(product.channels.filter(channel => channel.status === 'active').map(channel => channel.channel))];

export type WarehouseStockChange = { type: 'transfer' | 'adjustment'; sku: string; from: string; to?: string; quantity: number };
export function applyWarehouseStockChange(product: Product, change: WarehouseStockChange): Product {
  if (!canEditWarehouseStock(change.from) || (change.type === 'transfer' && (!change.to || !canEditWarehouseStock(change.to)))) throw new Error('External or unidentified warehouse stock is read only.');
  if (!Number.isSafeInteger(change.quantity) || change.quantity === 0) throw new Error('Enter a non-zero whole quantity.');
  const variant = product.has_variants ? product.skus.find(sku => sku.sku_code === change.sku) : undefined;
  if (product.has_variants && !variant) throw new Error('Choose a variant SKU to change stock.');
  const inventory = { ...(variant ? variant.stock_by_location : product.inventory) };
  const before = recordedQuantity(inventory[change.from]);
  if (before === null) throw new Error('Stock is not recorded at the selected warehouse.');
  if (change.type === 'transfer') {
    if (change.quantity <= 0 || change.quantity > before || change.from === change.to) throw new Error('Choose different warehouses and a quantity within the recorded stock.');
    inventory[change.from] = before - change.quantity;
    inventory[change.to!] = (recordedQuantity(inventory[change.to!]) ?? 0) + change.quantity;
  } else {
    if (before + change.quantity < 0) throw new Error('This adjustment would make stock negative.');
    inventory[change.from] = before + change.quantity;
  }
  if (!variant) return { ...product, inventory };
  const skus = product.skus.map(sku => sku.id === variant.id ? { ...sku, stock_by_location: inventory } : sku);
  const next = { ...product, skus, inventory: { ...product.inventory } };
  for (const id of [change.from, ...(change.to ? [change.to] : [])]) {
    const stock = stockAt(next, id);
    if (stock.quantity !== null) next.inventory[id] = stock.quantity;
  }
  return next;
}
