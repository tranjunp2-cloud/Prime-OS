import { expect, it } from 'vitest';
import { normalizeDemoStockLocations } from './demo-warehouse-locations';
import { getProducts } from './product-store';
import { getWarehouses } from './warehouse-store';
it('consolidates demo stock without losing quantities and is safe to run again', () => {
  const original = { wh_crjp: 80, wh_rakjp: 15, custom: 3, wh_hcm_01: 4, wh_hn_01: 6 };
  const stock = normalizeDemoStockLocations(original);
  expect(stock).toEqual({ wh_crjp: 95, wh_3plvn: 10, custom: 3 });
  expect(normalizeDemoStockLocations(stock)).toEqual(stock);
  expect(Object.values(stock).reduce((a, b) => a + b, 0)).toBe(Object.values(original).reduce((a, b) => a + b, 0));
});
it('ships only five demo warehouse IDs in both master and variant inventory', () => {
  const ids = getWarehouses().map(w => w.id);
  expect(ids).toHaveLength(5);
  for (const product of getProducts()) {
    for (const id of Object.keys(product.inventory)) expect(ids).toContain(id);
    for (const sku of product.skus) for (const id of Object.keys(sku.stock_by_location ?? {})) expect(ids).toContain(id);
  }
});
