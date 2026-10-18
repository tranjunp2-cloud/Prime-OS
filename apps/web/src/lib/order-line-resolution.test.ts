// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { listPrototypeOrders } from './order-prototype-data';
import { getOrderAttention, type OrderRecord } from './orders-api';
import { prototypePreparation } from './order-preparation';
import { orderCatalogContext, orderLineReviewListing, orderMappingIssues, resolveOrderLine, type OrderCatalogContext } from './order-line-resolution';
import { getProducts, type Product } from './product-store';
import { demoConnectedChannels } from './channel-integrations-demo';
import { confirmListingIntake } from './product-listing-intake';
import { createEmptyListingCatalog } from './listing-intake-catalog';

afterEach(() => window.localStorage.clear());
const demo = (key: string) => listPrototypeOrders().find(order => order.id === `DEMO-${key}`)!;
const withProduct = (context: OrderCatalogContext, id: string, patch: (product: Product) => Product): OrderCatalogContext =>
  ({ ...context, products: context.products.map(product => product.id === id ? patch(structuredClone(product)) : product) });

describe('Order line resolution: listing → Master SKU → warehouse → stock', () => {
  it('holds the whole order when one listing is not linked, and blocks preparation', () => {
    const order = demo('MAP-UNLINKED');
    const [art, palette] = order.lines.map(line => resolveOrderLine(order, line));
    expect(art).toMatchObject({ status: 'ready', warehouseId: 'wh_3plvn' });
    expect(palette).toMatchObject({ status: 'blocked', gap: 'mapping', reason: expect.stringContaining('SHP-CER-PAL-12') });
    expect(orderMappingIssues(order)).toHaveLength(1);
    expect(getOrderAttention(order)).toContainEqual(expect.objectContaining({ code: 'product-mapping', reason: 'Needs product mapping' }));
    expect(prototypePreparation(order)?.blocker).toBe('Map every order line to a Master SKU with stock first.');
    expect(orderLineReviewListing(order, order.lines[1])).toMatchObject({ listingId: 'SHP-9012326', storeName: 'Prime Beauty Official' });
  });
  it('reports missing stock at the shop warehouse separately from mapping', () => {
    const order = demo('MAP-STOCK');
    expect(resolveOrderLine(order, order.lines[0])).toMatchObject({ status: 'blocked', gap: 'stock', warehouseId: 'wh_3plvn' });
  });
  it('accepts a Draft Master once its SKU, warehouse and stock are in place', () => {
    const order = demo('MAP-UNLINKED');
    const owner = (resolveOrderLine(order, order.lines[0]) as { product: Product }).product;
    const context = withProduct(orderCatalogContext(), owner.id, product => ({ ...product, status: 'draft' }));
    expect(resolveOrderLine(order, order.lines[0], context)).toMatchObject({ status: 'ready' });
  });
  it('reports a shop without a warehouse and a listing whose SKU mapping is pending', () => {
    const order = demo('MAP-UNLINKED');
    const context = orderCatalogContext();
    const noWarehouse = { ...context, shops: demoConnectedChannels.map(shop => shop.platform === 'shopee' ? { ...shop, warehouse: null } : shop) };
    expect(resolveOrderLine(order, order.lines[0], noWarehouse)).toMatchObject({ status: 'blocked', gap: 'warehouse' });
    const owner = (resolveOrderLine(order, order.lines[0]) as { product: Product }).product;
    const pending = withProduct(context, owner.id, product => ({ ...product, channels: product.channels.map(listing => listing.external_id === 'SHP-TEST2-MYTH'
      ? { ...listing, review_pending: { issues: ['Verify imported SKU details'], sku_mapping_pending: true, saved_at: '' } } : listing) }));
    expect(resolveOrderLine(order, order.lines[0], pending)).toMatchObject({ status: 'blocked', gap: 'mapping', reason: expect.stringContaining('Confirm the SKU mapping') });
  });
  it('maps variant lines by shop SKU only', () => {
    const order = demo('MAP-UNLINKED');
    const owner = (resolveOrderLine(order, order.lines[0]) as { product: Product }).product;
    const skus = ['A', 'B'].map(code => ({ id: `variant-${code}`, sku_code: `MASTER-${code}`, variation_name: code, status: 'active' as const, weight_g: 0, units_per_carton: 1, stock_by_location: { wh_3plvn: 9 } }));
    const context = withProduct(orderCatalogContext(), owner.id, product => ({ ...product, has_variants: true, product_type: 'variant', skus,
      channels: product.channels.map(listing => listing.external_id === 'SHP-TEST2-MYTH' ? { ...listing, variant_mappings: [{ shop_sku: 'SHP-TEST2-MYTH-10', master_sku_id: 'variant-B' }] } : listing) }));
    expect(resolveOrderLine(order, order.lines[0], context)).toMatchObject({ status: 'ready', skuId: 'variant-B', available: 9 });
    const other = { ...order.lines[0], shopSku: 'UNMAPPED' };
    expect(resolveOrderLine(order, other, context)).toMatchObject({ status: 'blocked', gap: 'mapping', reason: expect.stringContaining('UNMAPPED') });
  });
  it('releases the order once the listing is linked to a Master with stock', () => {
    const order = demo('MAP-UNLINKED');
    const context = orderCatalogContext();
    const listing = orderLineReviewListing(order, order.lines[1], context)!;
    const catalog = createEmptyListingCatalog([listing]);
    const master = structuredClone((resolveOrderLine(order, order.lines[0], context) as { product: Product }).product);
    catalog.add({ ...master, id: 'order-palette-master', sku_code: 'ORDER-PALETTE', channels: [], skus: [], inventory: { wh_3plvn: 10 } });
    confirmListingIntake([listing.id], { productId: 'order-palette-master' }, catalog);
    const linked = { ...context, products: [...context.products, ...catalog.products()] };
    expect(orderMappingIssues(order, linked)).toEqual([]);
  });
  it('leaves orders without shop listing identity unchanged', () => {
    const unchecked = listPrototypeOrders().filter(order => !order.lines.some(line => line.listingId));
    expect(unchecked.length).toBeGreaterThan(40);
    expect(unchecked.filter((order: OrderRecord) => orderMappingIssues(order).length)).toEqual([]);
    expect(getProducts().length).toBeGreaterThan(0);
  });
});
