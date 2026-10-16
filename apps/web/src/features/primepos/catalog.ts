import { getProducts } from '@/lib/product-store';
import { getInventoryPositions } from '@/lib/inventory-store';
import { availabilityAt } from '@/lib/warehouse-availability';
import { getWarehouses } from '@/lib/warehouse-store';
import { canEditWarehouseStock } from '@/lib/warehouse-stock-view';
import { quoteListingPrice, readPricing } from '@/lib/pricing-rules';
import type { Product, Store } from './store';

export type MasterSelection = { productId: string; skuId: string };
export type CatalogItem = Product & { master: MasterSelection; masterName: string; variant: string; currency: string; available: number | null; issue?: string };
export const masterPosId = (ref: MasterSelection) => `master:${ref.productId}:${ref.skuId}`;
export const posWarehouses = () => getWarehouses().filter(w => w.status === 'active' && canEditWarehouseStock(w.id));

export function masterCatalog(store: Store): CatalogItem[] {
  const registry = readPricing();
  const shopId = `pos-store:${store.id}`;
  const pricing = { ...registry, shops: [...registry.shops.filter(shop => shop.shopId !== shopId), { shopId, label: store.name, currency: store.currency || 'USD', ruleId: store.priceRuleId }] };
  return getProducts().flatMap(master => {
    const variants = master.has_variants ? master.skus : [{ id: 'single', sku_code: master.sku_code, variation_name: '', status: 'active', image_url: master.images[0], price: master.retail_price }];
    return variants.map(sku => {
      const ref = { productId: master.id, skuId: sku.id };
      const base = master.has_variants ? sku.price : master.retail_price;
      const quote = quoteListingPrice(base ?? NaN, master.price_currency, { pricing_shop_id: shopId, pricing_source: 'shop', channel_currency: store.currency || 'USD' }, pricing);
      const warehouse = posWarehouses().find(w => w.id === store.warehouseId);
      const availability = warehouse ? availabilityAt(master, [warehouse.id], getInventoryPositions(), sku.sku_code).items[0] : undefined;
      const issue = !master.name.trim() || !sku.sku_code.trim() ? 'Complete the product name and SKU in Product Master.'
        : master.status === 'archived' || sku.status === 'inactive' ? 'This Master or SKU is inactive.'
        : quote.error ? quote.error
        : !warehouse ? 'Choose an active stock location in POS settings.'
        : availability?.state !== 'ready' ? 'Stock availability needs review in Warehouses.' : undefined;
      return { id: masterPosId(ref), master: ref, masterName: master.name, variant: sku.variation_name,
        name: `${master.name}${master.has_variants ? ` · ${sku.variation_name || sku.sku_code}` : ''}`,
        sku: sku.sku_code, barcode: master.has_variants ? undefined : master.gtin || undefined,
        image: sku.image_url || master.images[0], category: master.category || 'Uncategorized',
        price: quote.amount ?? 0, currency: quote.currency, cost: master.original_price, kind: 'retail' as const, color: 'slate',
        available: availability?.state === 'ready' ? availability.atp : null, issue };
    });
  });
}

/** Resolve selected identities only. Never copy Master stock into the POS demo ledger. */
export function resolveStoreCatalog(store: Store): CatalogItem[] {
  const candidates = new Map(masterCatalog(store).map(item => [item.id, item]));
  return (store.masterSelections ?? []).map(ref => candidates.get(masterPosId(ref)) ?? {
    id: masterPosId(ref), master: ref, masterName: 'Product Master unavailable', variant: '', name: 'Product Master unavailable',
    sku: 'Unavailable', category: 'Unavailable', price: 0, currency: store.currency || 'USD', cost: 0, kind: 'retail', color: 'slate',
    available: null, issue: 'This Master or variant was removed. Review the selection.',
  });
}

export function masterSourcesKey() {
  return JSON.stringify([getProducts(), getInventoryPositions(), getWarehouses(), readPricing()]);
}
