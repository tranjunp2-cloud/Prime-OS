// Warehouse store — singleton in-memory for local mockup
// Replaces Supabase queries for warehouses

export type WarehouseType = 'internal' | 'fba' | 'fbs' | '3pl' | 'virtual';
export type WarehouseStatus = 'active' | 'inactive' | 'syncing';

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  country: string;
  address: string | null;
  type: WarehouseType;
  is_virtual: boolean;
  capabilities: string[];
  status: WarehouseStatus;
  created_at: string;
  updated_at: string;
  manager?: string;
  phone?: string;
}

const SEED_WAREHOUSES: Warehouse[] = [
  {
    id: 'wh_crjp',
    code: 'CR-JP',
    name: 'CyberRecord Japan HQ',
    country: 'JP',
    address: 'Shibuya, Tokyo, Japan',
    type: 'internal',
    is_virtual: false,
    capabilities: ['pick_pack', 'cold_storage', 'fragile_handling'],
    status: 'active',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'wh_rslsg',
    code: 'RSL-SG',
    name: 'Reseller Singapore',
    country: 'SG',
    address: 'Ang Mo Kio, Singapore',
    type: 'internal',
    is_virtual: false,
    capabilities: ['pick_pack', 'oversized'],
    status: 'active',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'wh_fbsmy',
    code: 'FBS-MY',
    name: 'Fulfillment By Shopee Malaysia',
    country: 'MY',
    address: 'Kuala Lumpur, Malaysia',
    type: 'fbs',
    is_virtual: false,
    capabilities: ['pick_pack', 'same_day'],
    status: 'active',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'wh_3plvn',
    code: '3PL-VN',
    name: 'Vietnam 3PL Partner',
    country: 'VN',
    address: 'Ho Chi Minh City, Vietnam',
    type: '3pl',
    is_virtual: false,
    capabilities: ['pick_pack'],
    status: 'active',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'wh_fbajp',
    code: 'FBA-JP',
    name: 'Fulfillment By Amazon Japan',
    country: 'JP',
    address: null,
    type: 'fba',
    is_virtual: false,
    capabilities: ['prime', 'cross_border'],
    status: 'active',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
];

let _warehouses: Warehouse[] = [...SEED_WAREHOUSES];
export const WAREHOUSE_STORAGE_KEY = 'primeos-managed-warehouses-v1';

function savedWarehouses(): Warehouse[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(WAREHOUSE_STORAGE_KEY);
  if (!raw) return [];
  const saved: unknown = JSON.parse(raw);
  if (!Array.isArray(saved) || saved.some(w => !w || typeof w.id !== 'string' || typeof w.name !== 'string' || typeof w.code !== 'string')) throw new Error('Saved warehouses could not be read. Please reload before making changes.');
  return saved;
}

/** Demo reseeding must never remove a warehouse the seller created. */
export function restoreSavedWarehouses(): void {
  const saved = savedWarehouses();
  _warehouses = [..._warehouses.filter(w => !saved.some(item => item.id === w.id)), ...saved];
}
try { restoreSavedWarehouses(); } catch { /* Mutations surface storage failures without overwriting unreadable data. */ }

export function createManagedWarehouse(input: { name: string; code: string; address: string; country: string; manager?: string; phone?: string }): Warehouse {
  const saved = savedWarehouses();
  const name = input.name.trim();
  const code = input.code.trim().toUpperCase();
  if (!name || !code || !input.address.trim() || !/^[A-Z]{2}$/.test(input.country)) throw new Error('Enter a name, code, country and address.');
  if ([..._warehouses, ...saved].some(w => w.code.toUpperCase() === code)) throw new Error('This warehouse code is already in use. Choose another code.');
  const now = new Date().toISOString();
  const warehouse: Warehouse = { ...input, name, code, address: input.address.trim(), manager: input.manager?.trim(), phone: input.phone?.trim(), id: genWarehouseId(), type: 'internal', is_virtual: false, status: 'active', capabilities: ['pick_pack'], created_at: now, updated_at: now };
  if (typeof window !== 'undefined') window.localStorage.setItem(WAREHOUSE_STORAGE_KEY, JSON.stringify([...saved, warehouse]));
  _warehouses = [..._warehouses, warehouse];
  return warehouse;
}

export function getWarehouses(): Warehouse[] {
  return _warehouses;
}

export function getWarehouseById(id: string): Warehouse | undefined {
  return _warehouses.find(w => w.id === id);
}

export function addWarehouse(w: Omit<Warehouse, 'id' | 'created_at' | 'updated_at'> & { id?: string }): Warehouse {
  const now = new Date().toISOString();
  const newWarehouse: Warehouse = {
    ...w,
    id: w.id ?? `wh_${Date.now()}`,
    created_at: now,
    updated_at: now,
  };
  _warehouses = [..._warehouses, newWarehouse];
  return newWarehouse;
}

export function clearWarehouseStore(): void {
  _warehouses = [];
}

export function updateWarehouse(id: string, updates: Partial<Warehouse>): void {
  _warehouses = _warehouses.map(w =>
    w.id === id ? { ...w, ...updates, updated_at: new Date().toISOString() } : w
  );
}

export function deleteWarehouse(id: string): void {
  _warehouses = _warehouses.filter(w => w.id !== id);
}

export function genWarehouseId(): string {
  return `wh_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
