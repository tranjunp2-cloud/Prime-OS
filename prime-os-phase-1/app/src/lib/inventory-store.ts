// Inventory Store — singleton in-memory for local mockup
// Replaces Supabase queries for inventory positions

export interface InventoryPosition {
  id: string;
  sku_id: string;
  product_id: string;
  warehouse_id: string;
  on_hand: number;
  reserved: number;
  inbound: number;
  outbound: number;
  unfulfillable: number;
  returns: number;
  updated_at: string;
}

let _positions: InventoryPosition[] = [];

export function getInventoryPositions(): InventoryPosition[] {
  return _positions;
}

export function getPositionBySku(skuId: string): InventoryPosition[] {
  return _positions.filter(p => p.sku_id === skuId);
}

export function getPositionByWarehouse(warehouseId: string): InventoryPosition[] {
  return _positions.filter(p => p.warehouse_id === warehouseId);
}

export function getTotalATS(skuId: string): number {
  return _positions
    .filter(p => p.sku_id === skuId)
    .reduce((sum, p) => {
      const ats = (p.on_hand ?? 0) - (p.reserved ?? 0);
      return sum + Math.max(0, ats);
    }, 0);
}

export function addInventoryPosition(p: InventoryPosition): void {
  _positions = [..._positions, p];
}

export function clearInventoryStore(): void {
  _positions = [];
}

export function updatePosition(id: string, updates: Partial<InventoryPosition>): void {
  _positions = _positions.map(p => p.id === id ? { ...p, ...updates } : p);
}

export function deductStock(skuId: string, warehouseId: string, qty: number): void {
  _positions = _positions.map(p =>
    p.sku_id === skuId && p.warehouse_id === warehouseId
      ? { ...p, on_hand: Math.max(0, (p.on_hand ?? 0) - qty) }
      : p
  );
}
