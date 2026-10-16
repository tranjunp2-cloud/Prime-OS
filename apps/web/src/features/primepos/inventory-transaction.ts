import { getProducts, type Product as Master } from '@/lib/product-store';
import { applyWarehouseStockChange } from '@/lib/warehouse-stock-view';
import { commitStockOperation, countForSku, withStockPosition } from '@/lib/warehouse-stock-operations';
import type { PosState } from './store';

const JOURNAL_KEY = 'prime.pos-inventory-commit.v1';
type Journal = { id: string; before: Master[]; after: Master[] };
let recovering = false;

/** Browser-prototype recovery only. Production requires a server-side transaction. */
export function recoverInventoryCommit(posKey: string) {
  if (recovering) return;
  const raw = localStorage.getItem(JOURNAL_KEY);
  if (!raw) return;
  recovering = true;
  try {
    const journal: Journal = JSON.parse(raw);
    const saved: PosState | null = JSON.parse(localStorage.getItem(posKey) || 'null');
    commitStockOperation(saved?.inventoryCommitId === journal.id ? journal.after : journal.before);
    localStorage.removeItem(JOURNAL_KEY);
  } finally { recovering = false; }
}

export function commitPosWithInventory(previous: PosState, next: PosState, persist: () => void) {
  const changed = new Map<string, Master>();
  const before = new Map<string, Master>();
  for (const store of previous.stores) {
    for (const product of previous.products.filter(item => item.master)) {
      const key = `${store.id}:${product.id}`;
      const from = previous.stock[key], to = next.stock[key];
      if (from === to || to === undefined) continue;
      if (from === undefined || !store.warehouseId) throw new Error('Review warehouse stock before recording a stock movement.');
      const original = getProducts().find(item => item.id === product.master!.productId);
      if (!original) throw new Error('This Product Master is no longer available.');
      before.set(original.id, withStockPosition(before.get(original.id) ?? original, store.warehouseId, product.sku));
      const current = changed.get(original.id) ?? original;
      const updated = applyWarehouseStockChange(current, { type: 'adjustment', sku: product.sku, from: store.warehouseId, quantity: to - from });
      const sale = next.sales.find(sale => !previous.sales.some(old => old.id === sale.id));
      const audit = { id: crypto.randomUUID(), kind: 'adjustment' as const, warehouseId: store.warehouseId, sku: product.sku,
        before: countForSku(current, store.warehouseId, product.sku), after: countForSku(updated, store.warehouseId, product.sku)!,
        reason: sale ? `POS sale ${sale.number}` : 'POS return / receiving', createdAt: new Date().toISOString() };
      changed.set(original.id, withStockPosition({ ...updated, inventory_adjustments: [audit, ...(updated.inventory_adjustments ?? [])] }, store.warehouseId, product.sku));
    }
  }
  if (!changed.size) { persist(); return; }
  const journal: Journal = { id: crypto.randomUUID(), before: [...before.values()], after: [...changed.values()] };
  next.inventoryCommitId = journal.id;
  localStorage.setItem(JOURNAL_KEY, JSON.stringify(journal));
  try {
    commitStockOperation(journal.after);
    persist();
  } catch (error) {
    try { commitStockOperation(journal.before); localStorage.removeItem(JOURNAL_KEY); } catch { /* Recover before the next operation. */ }
    throw error;
  }
  try { localStorage.removeItem(JOURNAL_KEY); } catch { /* A committed journal is safe to replay. */ }
}
