import type { Product } from './product-store';

export const LOW_STOCK_THRESHOLD = 10;

/** Missing counts are unknown, not zero. Never distribute a parent total to SKUs. */
export function recordedStock(inventory: Record<string, unknown> = {}) {
  const locations = Object.entries(inventory).map(([id, value]) => ({
    id,
    quantity: typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null,
  }));
  const known = locations.filter(location => location.quantity !== null);
  const total = known.length ? known.reduce((sum, location) => sum + location.quantity!, 0) : null;
  const incomplete = known.length !== locations.length;
  return { locations, total, incomplete };
}

export function stockStatus(total: number | null, incomplete: boolean) {
  if (total === null || incomplete) return 'unrecorded';
  return total === 0 ? 'out-of-stock' : total < LOW_STOCK_THRESHOLD ? 'low-stock' : 'in-stock';
}

export function productListStock(product: Product) {
  const variants = product.has_variants ? product.skus.map(sku => {
    const stock = recordedStock(sku.stock_by_location);
    return { sku, ...stock, status: stockStatus(stock.total, stock.incomplete) };
  }) : [];
  const recordedVariants = variants.filter(variant => variant.total !== null);
  const stock = product.has_variants ? {
    total: recordedVariants.length ? recordedVariants.reduce((sum, variant) => sum + variant.total!, 0) : null,
    incomplete: recordedVariants.length !== variants.length || variants.some(variant => variant.incomplete),
  } : recordedStock(product.inventory);
  return {
    ...stock, variants, status: stockStatus(stock.total, stock.incomplete),
    outOfStockVariants: variants.filter(variant => variant.sku.status === 'active' && variant.status === 'out-of-stock').length,
    lowStockVariants: variants.filter(variant => variant.sku.status === 'active' && variant.status === 'low-stock').length,
    unrecordedVariants: variants.filter(variant => variant.status === 'unrecorded').length,
  };
}
