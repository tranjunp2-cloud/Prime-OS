import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getProducts, updateProduct, type Product } from '@/lib/product-store';
import { applyWarehouseStockChange, canEditWarehouseStock, initializeProductStockLocation, recordedQuantity } from '@/lib/warehouse-stock-view';
import type { StockAdjustmentTarget, StockLocation } from './WarehouseStockTable';

type Props = {
  target: Partial<StockAdjustmentTarget>;
  products: Product[];
  warehouses: StockLocation[];
  onClose: () => void;
  onSaved: () => void;
  lockProduct?: boolean;
  initializeLocation?: boolean;
};

export function AdjustWarehouseStockDialog({ target, products, warehouses, onClose, onSaved, lockProduct = false, initializeLocation = false }: Props) {
  const trigger = useRef(typeof document === 'undefined' ? null : document.activeElement);
  const [productId, setProductId] = useState(target.product?.id ?? '');
  const [warehouseId, setWarehouseId] = useState(target.warehouse?.id ?? '');
  const [sku, setSku] = useState(target.product?.has_variants ? target.sku ?? '' : target.product?.sku_code ?? '');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const product = products.find(item => item.id === productId);
  const variant = product?.skus.find(item => item.sku_code === sku);
  const before = recordedQuantity(product?.has_variants ? variant?.stock_by_location?.[warehouseId] : product?.inventory[warehouseId]);
  const after = quantity.trim() ? Number(quantity) : NaN;
  const validQuantity = Number.isSafeInteger(after) && after >= 0;
  const delta = before !== null && validQuantity ? after - before : null;
  const editable = canEditWarehouseStock(warehouseId);
  const canEnterCount = editable && (initializeLocation ? Boolean(product && !product.has_variants && before === null) : before !== null);
  const canSave = Boolean(product && canEnterCount && validQuantity && (initializeLocation || delta) && reason);
  const resetCount = () => { setQuantity(''); setReason(''); setError(''); };
  const save = () => {
    if (!canSave || !product || (!initializeLocation && (before === null || delta === null))) return;
    try {
      const fresh = getProducts().find(item => item.id === product.id);
      if (!fresh) throw new Error('This product no longer exists. Close this form and refresh the page.');
      const latest = recordedQuantity(fresh.has_variants ? fresh.skus.find(item => item.sku_code === sku)?.stock_by_location?.[warehouseId] : fresh.inventory[warehouseId]);
      if (fresh.has_variants !== product.has_variants || latest !== before) throw new Error('Stock changed while you were editing. Close this form and reopen it to review the latest quantity.');
      const next = initializeLocation
        ? initializeProductStockLocation(fresh, warehouseId, after)
        : applyWarehouseStockChange(fresh, { type: 'adjustment', sku, from: warehouseId, quantity: delta! });
      updateProduct(fresh.id, {
        id: fresh.id, inventory: next.inventory, skus: next.skus,
        inventory_adjustments: [{ id: crypto.randomUUID(), warehouseId, sku, before, after, reason, createdAt: new Date().toISOString() }, ...(fresh.inventory_adjustments ?? [])],
      });
      onSaved();
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not record the adjustment. Please try again.'); }
  };
  const selectClass = 'h-11 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm';
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md" onCloseAutoFocus={event => {
    if (trigger.current instanceof HTMLElement && trigger.current.isConnected) {
      event.preventDefault();
      trigger.current.focus({ preventScroll: true });
    }
  }}>
    <DialogHeader><DialogTitle>{initializeLocation ? 'Add stock location' : 'Adjust stock'}</DialogTitle><DialogDescription>{initializeLocation ? 'Choose where this product is stored and record its first stock count. Nothing is added until you save.' : 'Enter the new stock count. The change and reason will be saved in adjustment history.'}</DialogDescription></DialogHeader>
    <form className="space-y-4" onSubmit={event => { event.preventDefault(); save(); }}>
      <label className="grid gap-2 text-sm font-medium">Warehouse
        <select className={selectClass} value={warehouseId} onChange={event => { setWarehouseId(event.target.value); resetCount(); }}>
          <option value="">Select a warehouse</option>
          {warehouses.map(item => <option key={item.id} value={item.id} disabled={!canEditWarehouseStock(item.id)}>{item.name}{!canEditWarehouseStock(item.id) ? ' · Read only' : ''}</option>)}
        </select>
      </label>
      <label className="grid gap-2 text-sm font-medium">Product
        <select className={selectClass} value={productId} disabled={lockProduct} onChange={event => {
          const next = products.find(item => item.id === event.target.value);
          setProductId(event.target.value); setSku(next?.has_variants ? '' : next?.sku_code ?? ''); resetCount();
        }}>
          <option value="">Select a product</option>
          {products.map(item => <option key={item.id} value={item.id}>{item.name} · {item.sku_code}</option>)}
        </select>
      </label>
      {product?.has_variants && <label className="grid gap-2 text-sm font-medium">Variant SKU<select className={selectClass} value={sku} onChange={event => { setSku(event.target.value); resetCount(); }}><option value="">Select a variant</option>{product.skus.map(item => <option key={item.id} value={item.sku_code}>{item.variation_name} · {item.sku_code}</option>)}</select></label>}
      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Current stock</span><strong>{warehouseId && sku ? before ?? 'Not recorded' : '—'}</strong></div>
      {warehouseId && !editable ? <p role="alert" className="text-sm text-destructive">This warehouse is read only.</p> : initializeLocation && before !== null ? <p role="alert" className="text-sm text-destructive">Stock is already recorded here. Use Adjust stock instead.</p> : !initializeLocation && warehouseId && sku && before === null ? <p role="alert" className="text-sm text-destructive">No stock is recorded for this SKU at this warehouse yet.</p> : null}
      <label className="grid gap-2 text-sm font-medium" htmlFor="new-warehouse-stock">{initializeLocation ? 'Initial stock' : 'New stock'}<Input id="new-warehouse-stock" type="number" inputMode="numeric" min={0} step={1} value={quantity} disabled={!canEnterCount} aria-describedby="stock-change-preview" aria-invalid={Boolean(quantity && !validQuantity)} onChange={event => { setQuantity(event.target.value); setError(''); }} placeholder="Enter the counted quantity" className="h-11" /></label>
      <p id="stock-change-preview" aria-live="polite" className="text-sm text-muted-foreground">{quantity && !validQuantity ? 'Enter a whole number of 0 or more.' : initializeLocation ? validQuantity ? `Not recorded → ${after} units · Initial count` : 'Enter the actual count, including 0 if the location is empty.' : delta !== null ? `${before} → ${after} units · ${delta > 0 ? `Increase by ${delta}` : delta < 0 ? `Decrease by ${Math.abs(delta)}` : 'No change'}` : 'The increase or decrease is calculated for you.'}</p>
      <label className="grid gap-2 text-sm font-medium">Adjustment reason<select className={selectClass} value={reason} onChange={event => setReason(event.target.value)}><option value="">Select a reason</option>{['Physical stock count', 'Damaged stock', 'Lost stock', 'Inbound recount', 'Returned items'].map(value => <option key={value}>{value}</option>)}</select></label>
      <p className="text-xs leading-5 text-muted-foreground">Updates warehouse and Product Master stock. Marketplace quantities are unchanged.</p>
      {initializeLocation && <p className="text-xs leading-5 text-muted-foreground">FBA/FBS stock is read only and appears after a quantity is recorded by its provider.</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={!canSave}>{initializeLocation ? 'Save location & stock' : 'Record adjustment'}</Button></div>
    </form>
  </DialogContent></Dialog>;
}
