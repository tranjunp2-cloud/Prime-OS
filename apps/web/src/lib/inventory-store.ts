// Inventory Store — singleton in-memory for local mockup
// Replaces Supabase queries for inventory positions
// Phase 1.5: 5-state operational model per livecommerce research

export interface InventoryPosition {
  id: string;
  sku_id: string;
  product_id: string;
  warehouse_id: string;
  on_hand: number;
  reserved_unpaid: number;
  reserved_paid: number;
  allocated: number;
  inbound: number;
  outbound: number;
  unfulfillable: number;
  return_pending: number;
  safety_stock: number;
  campaign_lock: number;
  version: number;
  updated_at: string;
}

export interface ATPComponents {
  on_hand: number;
  reserved_unpaid: number;
  reserved_paid: number;
  allocated: number;
  safety_stock: number;
  campaign_lock: number;
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

export function getTotalATP(skuId: string): number {
  return _positions
    .filter(p => p.sku_id === skuId)
    .reduce((sum, p) => {
      const atp = (p.on_hand ?? 0)
        - (p.reserved_unpaid ?? 0)
        - (p.reserved_paid ?? 0)
        - (p.allocated ?? 0)
        - (p.safety_stock ?? 0)
        - (p.campaign_lock ?? 0);
      return sum + Math.max(0, atp);
    }, 0);
}

export function getLegacyTotalATS(skuId: string): number {
  return _positions
    .filter(p => p.sku_id === skuId)
    .reduce((sum, p) => {
      const reserved = (p.reserved_unpaid ?? 0) + (p.reserved_paid ?? 0) + (p.allocated ?? 0);
      const ats = (p.on_hand ?? 0) - reserved;
      return sum + Math.max(0, ats);
    }, 0);
}

export function getATPBySkuWarehouse(skuId: string, warehouseId: string): number {
  const pos = _positions.find(p => p.sku_id === skuId && p.warehouse_id === warehouseId);
  if (!pos) return 0;
  return Math.max(0, (pos.on_hand ?? 0)
    - (pos.reserved_unpaid ?? 0)
    - (pos.reserved_paid ?? 0)
    - (pos.allocated ?? 0)
    - (pos.safety_stock ?? 0)
    - (pos.campaign_lock ?? 0));
}

export function addInventoryPosition(p: InventoryPosition): void {
  _positions = [..._positions, p];
}

export function clearInventoryStore(): void {
  _positions = [];
}

export function updatePosition(id: string, updates: Partial<InventoryPosition>): void {
  _positions = _positions.map(p => p.id === id ? { ...p, ...updates, version: p.version + 1 } : p);
}

export function optimisticReserve(skuId: string, warehouseId: string, qty: number, expectedVersion: number): boolean {
  const index = _positions.findIndex(p => p.sku_id === skuId && p.warehouse_id === warehouseId);
  if (index === -1) return false;
  const pos = _positions[index];
  if (pos.version !== expectedVersion) return false;

  const atp = (pos.on_hand ?? 0)
    - (pos.reserved_unpaid ?? 0)
    - (pos.reserved_paid ?? 0)
    - (pos.allocated ?? 0)
    - (pos.safety_stock ?? 0)
    - (pos.campaign_lock ?? 0);

  if (atp < qty) return false;

  const updated = [..._positions];
  updated[index] = {
    ...pos,
    reserved_unpaid: (pos.reserved_unpaid ?? 0) + qty,
    version: pos.version + 1,
    updated_at: new Date().toISOString(),
  };
  _positions = updated;
  return true;
}

export function confirmReservation(skuId: string, warehouseId: string, qty: number): void {
  _positions = _positions.map(p =>
    p.sku_id === skuId && p.warehouse_id === warehouseId
      ? {
        ...p,
        reserved_unpaid: Math.max(0, (p.reserved_unpaid ?? 0) - qty),
        reserved_paid: (p.reserved_paid ?? 0) + qty,
        version: p.version + 1,
        updated_at: new Date().toISOString(),
      }
      : p
  );
}

export function releaseReservation(skuId: string, warehouseId: string, qty: number): void {
  _positions = _positions.map(p =>
    p.sku_id === skuId && p.warehouse_id === warehouseId
      ? {
        ...p,
        reserved_unpaid: Math.max(0, (p.reserved_unpaid ?? 0) - qty),
        version: p.version + 1,
        updated_at: new Date().toISOString(),
      }
      : p
  );
}

export function allocateStock(skuId: string, warehouseId: string, qty: number): void {
  _positions = _positions.map(p =>
    p.sku_id === skuId && p.warehouse_id === warehouseId
      ? {
        ...p,
        reserved_paid: Math.max(0, (p.reserved_paid ?? 0) - qty),
        allocated: (p.allocated ?? 0) + qty,
        version: p.version + 1,
        updated_at: new Date().toISOString(),
      }
      : p
  );
}

export function deductStock(skuId: string, warehouseId: string, qty: number): void {
  _positions = _positions.map(p =>
    p.sku_id === skuId && p.warehouse_id === warehouseId
      ? { ...p, on_hand: Math.max(0, (p.on_hand ?? 0) - qty), version: p.version + 1 }
      : p
  );
}
