import { deleteProduct, getProductById, getProducts, updateProduct, type Product } from './product-store';
import { getAllOrderItems } from './order-store';
import { getInventoryPositions } from './inventory-store';
import { getStockHoldHistory } from './stock-hold-history';
import { getCatalogImportItems } from './catalog-import-store';

export type ProductLifecycleAction = 'archive' | 'restore' | 'delete';

/** Both list and detail use the same guards; confirmation rechecks live data. */
export function productDeletionBlockers(product: Product): string[] {
  const reasons: string[] = [];
  if (!['draft', 'archived'].includes(product.status)) reasons.push('Archive this product before deleting it.');
  if (product.channels.length || Object.values(product.channel_overrides ?? {}).some(listing => listing?.enabled)
    || getCatalogImportItems().some(item => item.resolvedProductId === product.id && ['link', 'create'].includes(item.resolution))) {
    reasons.push('This product has linked or configured listings. Keep it archived to preserve those links.');
  }
  const positions = getInventoryPositions().filter(position => position.product_id === product.id);
  const balances = [...Object.values(product.inventory), ...product.skus.flatMap(sku => Object.keys(sku.stock_by_location ?? {}).length ? Object.values(sku.stock_by_location!) : [sku.stock]),
    ...positions.flatMap(position => [position.on_hand, position.reserved_unpaid, position.reserved_paid, position.allocated,
      position.inbound, position.outbound, position.unfulfillable, position.return_pending, position.safety_stock, position.campaign_lock])];
  if (balances.some(value => value != null && (!Number.isFinite(Number(value)) || Number(value) !== 0))) {
    reasons.push('Stock or reserved quantities remain. Review inventory before deleting.');
  }
  const codes = new Set([product.sku_code, ...product.skus.map(sku => sku.sku_code)].map(code => code.trim().toLowerCase()).filter(Boolean));
  if (getAllOrderItems().some(item => codes.has(item.sku.trim().toLowerCase()))) {
    reasons.push('This product is referenced by orders. Keep it archived to preserve order history.');
  }
  try {
    if (product.inventory_adjustments?.length || product.inventory_transfers?.length || getStockHoldHistory().some(item => item.productId === product.id)) {
      reasons.push('This product has inventory history. Keep it archived to preserve stock records.');
    }
  } catch { reasons.push('Inventory history could not be checked. Reload before trying again.'); }
  if (getProducts().some(other => other.id !== product.id && other.associations?.some(link => link.productId === product.id))) {
    reasons.push('Other products reference this product. Remove those associations before deleting.');
  }
  return reasons;
}

export function performProductLifecycleAction(id: string, action: ProductLifecycleAction): void {
  const product = getProductById(id);
  if (!product) throw new Error('This product no longer exists. Return to the product list.');
  if (action === 'delete') {
    const reasons = productDeletionBlockers(product);
    if (reasons.length) throw new Error(reasons.join(' '));
    deleteProduct(id, { requirePersistence: true });
  } else {
    if (action === 'restore' && product.status !== 'archived') throw new Error('This product is no longer archived. Reload to see its current status.');
    updateProduct(id, { id, status: action === 'restore' ? 'draft' : 'archived',
      ...(action === 'restore' ? { import_activation_paused: true } : {}), record_version: (product.record_version ?? 1) + 1 }, { requirePersistence: true });
  }
}
