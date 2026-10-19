// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { getCatalogImportItems } from './catalog-import-store';
import { demoConnectedChannels } from './channel-integrations-demo';
import { assignableMasterWarehouses, listingShopWarehouseIds, withMasterWarehouses } from './listing-master-warehouses';
import { getProducts } from './product-store';

const listing = (id: string) => getCatalogImportItems({ requireConfirmation: true }).find(item => item.id === id)!;

describe('Stock warehouses for a new Master', () => {
  it('offers only active, physical warehouses whose stock the merchant manages', () => {
    expect(assignableMasterWarehouses().map(warehouse => warehouse.id).sort()).toEqual(['wh_3plvn', 'wh_crjp', 'wh_rslsg']);
  });
  it('defaults to the warehouses where the listings’ shops fulfil orders', () => {
    // Shopee and Lazada ship from the Vietnam 3PL; Amazon US from the cross-border Japan HQ.
    expect(listingShopWarehouseIds([listing('imp-026'), listing('imp-007')], demoConnectedChannels)).toEqual(['wh_3plvn']);
    expect(listingShopWarehouseIds([listing('imp-026'), listing('imp-008')], demoConnectedChannels)).toEqual(['wh_3plvn', 'wh_crjp']);
  });
  it('suggests nothing for a shop without a warehouse or an unknown shop', () => {
    const tiktok = { ...listing('imp-026'), channel: 'tiktok' as const, storeName: 'Prime Live Store' };
    expect(listingShopWarehouseIds([tiktok, { ...listing('imp-026'), storeName: 'Unknown shop' }], demoConnectedChannels)).toEqual([]);
  });
  it('assigns an opening count of 0 to the product and every active variant SKU', () => {
    const variant = getProducts().find(product => product.has_variants && product.skus.length > 1)!;
    const assigned = withMasterWarehouses(variant, ['wh_crjp', 'wh_crjp', 'wh_3plvn']);
    expect(assigned.inventory).toEqual({ wh_crjp: 0, wh_3plvn: 0 });
    for (const sku of assigned.skus.filter(sku => sku.status === 'active')) expect(sku.stock_by_location).toEqual({ wh_crjp: 0, wh_3plvn: 0 });
  });
});
