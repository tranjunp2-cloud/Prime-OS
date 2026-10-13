export function reserveDemoStock<T>(order: T, at: string): T;
export function settleDemoStock<T>(order: T, at: string, dispatch?: boolean): T;
export function hydrateDemoStock<T>(order: T, at?: string): T;
export function moveDemoStockWarehouse<T>(order: T, warehouse: string, at: string): T;
