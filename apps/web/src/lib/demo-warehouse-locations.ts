// Consolidate the shipped demo locations into the five Warehouse demo nodes.
// Unknown IDs are preserved: this is not a limit on user-created warehouses.
export const DEMO_WAREHOUSE_ALIASES: Record<string, string> = {
  wh_rakjp: 'wh_crjp',
  wh_crossborder_01: 'wh_crjp',
  wh_hcm_01: 'wh_3plvn',
  wh_hn_01: 'wh_3plvn',
  wh_d1_01: 'wh_rslsg',
};
export function normalizeDemoStockLocations(stock: Record<string, number>): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [id, quantity] of Object.entries(stock)) {
    const target = DEMO_WAREHOUSE_ALIASES[id] ?? id;
    result[target] = (result[target] ?? 0) + quantity;
  }
  return result;
}
