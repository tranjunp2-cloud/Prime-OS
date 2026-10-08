import { useRef, useState, useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getProducts, type Product } from '@/lib/product-store';
import { canEditWarehouseStock, recordedQuantity } from '@/lib/warehouse-stock-view';
import type { StockAdjustmentTarget, StockLocation } from './WarehouseStockTable';
import { getInventoryPositions, subscribeInventory } from '@/lib/inventory-store';
import { availabilityAt } from '@/lib/warehouse-availability';
import { getWarehouseById } from '@/lib/warehouse-store';
import { adjustmentReasons, receiptReasons, recordWarehouseCounts, skuPositions, type StockCountKind } from '@/lib/warehouse-stock-operations';

type Props = {
  target: Partial<StockAdjustmentTarget>;
  products: Product[];
  warehouses: StockLocation[];
  onClose: () => void;
  onSaved: (recordId: string) => void;
  lockProduct?: boolean;
  lockSku?: boolean;
  initializeLocation?: boolean;
};

export function AdjustWarehouseStockDialog({ target, products, warehouses, onClose, onSaved, lockProduct = false, lockSku = false, initializeLocation: initialMode = false }: Props) {
  const trigger = useRef(typeof document === 'undefined' ? null : document.activeElement);
  const [mode, setMode] = useState<StockCountKind>(initialMode ? 'opening' : target.mode === 'receive' ? 'receipt' : target.mode === 'availability' ? 'availability' : 'adjustment');
  const initializeLocation = mode === 'opening';
  const saving = useRef(false);
  const [productId, setProductId] = useState(target.product?.id ?? '');
  const [warehouseId, setWarehouseId] = useState(target.warehouse?.id ?? '');
  const [sku, setSku] = useState(target.product?.has_variants ? target.sku ?? '' : target.product?.sku_code ?? '');
  const receipt = mode === 'receipt';
  const setup = mode === 'availability';
  const [quantity, setQuantity] = useState(setup && target.product && target.warehouse ? String(recordedQuantity(target.product.has_variants ? target.product.skus.find(item => item.sku_code === target.sku)?.stock_by_location?.[target.warehouse.id] : target.product.inventory[target.warehouse.id]) ?? '') : '');
  const [reason, setReason] = useState(receipt ? 'Goods received' : '');
  const savedReason = initializeLocation ? 'Opening stock' : setup ? 'Availability setup' : reason;
  const [error, setError] = useState('');
  const [confirmNoHolds, setConfirmNoHolds] = useState(false);
  const product = products.find(item => item.id === productId);
  const positions = useSyncExternalStore(subscribeInventory, getInventoryPositions, getInventoryPositions);
  const balance = product && warehouseId && sku ? availabilityAt(product, [warehouseId], positions, sku) : null;
  const variant = product?.skus.find(item => item.sku_code === sku);
  const before = recordedQuantity(product?.has_variants ? variant?.stock_by_location?.[warehouseId] : product?.inventory[warehouseId]);
  const after = quantity.trim() ? Number(quantity) + (receipt ? before ?? 0 : 0) : NaN;
  const validQuantity = Number.isSafeInteger(after) && after >= 0 && (!receipt || Number(quantity) > 0);
  const delta = before !== null && validQuantity ? after - before : null;
  const editable = canEditWarehouseStock(warehouseId) && getWarehouseById(warehouseId)?.status === 'active';
  const hasSku = Boolean(product && (!product.has_variants || variant));
  const canEnterCount = editable && hasSku && (initializeLocation ? before === null : before !== null);
  const canSave = Boolean(product && canEnterCount && validQuantity && (initializeLocation || delta || (setup && confirmNoHolds)) && savedReason);
  const resetCount = () => { setQuantity(''); setReason(receipt ? 'Goods received' : ''); setError(''); setConfirmNoHolds(false); };
  const switchMode = (next: StockCountKind) => { setMode(next); resetCount(); setReason(next === 'receipt' ? 'Goods received' : ''); };
  const save = () => {
    if (!canSave || !product || saving.current || (!initializeLocation && (before === null || delta === null))) return;
    saving.current = true;
    try {
      const fresh = getProducts().find(item => item.id === product.id);
      if (!fresh) throw new Error('This product no longer exists. Close this form and refresh the page.');
      const latest = recordedQuantity(fresh.has_variants ? fresh.skus.find(item => item.sku_code === sku)?.stock_by_location?.[warehouseId] : fresh.inventory[warehouseId]);
      if (fresh.has_variants !== product.has_variants || latest !== before) throw new Error('Stock changed while you were editing. Close this form and reopen it to review the latest quantity.');
      const [recordId] = recordWarehouseCounts([{ productId: fresh.id, warehouseId, sku, quantity: after, expected: before, kind: mode, reason: savedReason, confirmNoHolds }]);
      onSaved(recordId);
    } catch (failure) { saving.current = false; setError(failure instanceof Error ? failure.message : 'Could not record the adjustment. Please try again.'); }
  };
  const selectClass = 'h-11 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm';
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md" onCloseAutoFocus={event => {
    if (trigger.current instanceof HTMLElement && trigger.current.isConnected) {
      event.preventDefault();
      trigger.current.focus({ preventScroll: true });
    }
  }}>
    <DialogHeader><DialogTitle>{setup ? 'Set up availability' : receipt ? 'Receive stock' : initializeLocation ? 'Record opening stock' : 'Adjust stock'}</DialogTitle><DialogDescription>{setup ? 'Confirm a verified opening balance. Existing reservations must be reconciled before you use this action.' : receipt ? 'Enter only the units just received. This quantity is added to the current stock.' : initializeLocation ? 'Choose an existing Product Master SKU and record the stock already in this warehouse.' : 'Enter the actual quantity counted in this warehouse. This replaces the recorded count; it is not an incoming delivery.'}</DialogDescription></DialogHeader>
    <form className="space-y-4" onSubmit={event => { event.preventDefault(); save(); }}>
      <label className="grid gap-2 text-sm font-medium">Warehouse
        <select className={selectClass} disabled={setup} value={warehouseId} onChange={event => { setWarehouseId(event.target.value); resetCount(); }}>
          <option value="">Select a warehouse</option>
          {warehouses.map(item => {
            const writable = canEditWarehouseStock(item.id) && getWarehouseById(item.id)?.status === 'active';
            return <option key={item.id} value={item.id} disabled={!writable}>{item.name}{!writable ? ' · Read only' : ''}</option>;
          })}
        </select>
      </label>
      <label className="grid gap-2 text-sm font-medium">Product
        <select className={selectClass} value={productId} disabled={lockProduct || setup} onChange={event => {
          const next = products.find(item => item.id === event.target.value);
          setProductId(event.target.value); setSku(next?.has_variants ? '' : next?.sku_code ?? ''); resetCount();
        }}>
          <option value="">Select a product</option>
          {products.map(item => <option key={item.id} value={item.id}>{item.name} · {item.sku_code}</option>)}
        </select>
      </label>
      {product?.has_variants && <label className="grid gap-2 text-sm font-medium">Variant SKU<select className={selectClass} disabled={setup || lockSku} value={sku} onChange={event => { setSku(event.target.value); resetCount(); }}><option value="">Select a variant</option>{product.skus.map(item => {
        const recorded = recordedQuantity(item.stock_by_location?.[warehouseId]) !== null;
        return <option key={item.id} value={item.sku_code} disabled={initializeLocation && Boolean(warehouseId) && recorded}>{item.variation_name} · {item.sku_code}{warehouseId ? recorded ? ' · Stock recorded' : ' · Not recorded' : ''}</option>;
      })}</select></label>}
      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Current stock</span><strong>{warehouseId && sku ? before ?? 'Not recorded' : '—'}</strong></div>
      {warehouseId && !editable ? <p role="alert" className="text-sm text-destructive">This warehouse is read only.</p> : initializeLocation && before !== null ? <div><p role="alert" className="text-sm text-muted-foreground">Stock is already recorded here.</p><div className="flex gap-3"><Button type="button" variant="link" className="h-auto px-0" onClick={() => switchMode('receipt')}>Receive stock</Button><Button type="button" variant="link" className="h-auto px-0" onClick={() => switchMode('adjustment')}>Adjust stock</Button></div></div> : !initializeLocation && warehouseId && hasSku && before === null ? <div><p role="alert" className="text-sm text-muted-foreground">No stock is recorded for this SKU at this warehouse yet. Record a verified opening count first.</p><Button type="button" variant="link" className="h-auto px-0" onClick={() => switchMode('opening')}>Record opening stock</Button></div> : null}
      <label className="grid gap-2 text-sm font-medium" htmlFor="new-warehouse-stock">{receipt ? 'Quantity received' : initializeLocation ? 'Opening stock' : setup ? 'Recorded stock' : 'Actual stock count'}<Input id="new-warehouse-stock" type="number" inputMode="numeric" min={receipt ? 1 : 0} step={1} value={quantity} disabled={!canEnterCount || setup} aria-describedby="stock-change-preview" aria-invalid={Boolean(quantity && !validQuantity)} onChange={event => { setQuantity(event.target.value); setError(''); }} placeholder={receipt ? 'Units just received' : 'Enter the counted quantity'} className="h-11" /></label>
      <p id="stock-change-preview" aria-live="polite" className="text-sm text-muted-foreground">{quantity && !validQuantity ? receipt ? 'Enter a whole number greater than 0.' : 'Enter a whole number of 0 or more.' : initializeLocation ? validQuantity ? `Not recorded → ${after} units · Opening count` : 'Enter the actual count, including 0 if the location is empty.' : delta !== null ? receipt ? `${before} + ${quantity} received = ${after} units` : `${before} → ${after} units · ${delta > 0 ? `Increase by ${delta}` : delta < 0 ? `Decrease by ${Math.abs(delta)}` : 'No change'}` : receipt ? 'Received units will be added to current stock.' : 'The increase or decrease is calculated for you.'}</p>
      {!initializeLocation && balance?.atp.quantity !== null && balance?.atp.quantity !== undefined && !balance.atp.incomplete && <div className="rounded-md bg-muted/50 p-3 text-xs leading-5" aria-live="polite">
        <p>Held for orders: {balance.held.quantity} · Other holds: {balance.unavailable.quantity}</p>
        <p className="font-semibold">Available to sell (ATP): {balance.atp.quantity}{validQuantity ? ` → ${Math.max(0, after - balance.held.quantity! - balance.unavailable.quantity!)}` : ''}</p>
        {validQuantity && after < balance.held.quantity! + balance.unavailable.quantity! && <p className="mt-1 text-destructive">The new count is below existing holds. ATP will be 0; review the affected orders and holds.</p>}
      </div>}
      {!initializeLocation && !setup && <label className="grid gap-2 text-sm font-medium">{receipt ? 'Receipt type' : 'Adjustment reason'}<select className={selectClass} value={reason} onChange={event => setReason(event.target.value)}>{!receipt && <option value="">Select a reason</option>}{(receipt ? receiptReasons : adjustmentReasons).map(value => <option key={value}>{value}</option>)}</select></label>}
      <p className="text-xs leading-5 text-muted-foreground">Updates warehouse and Product Master stock. Marketplace quantities are unchanged.</p>
      {product && warehouseId && sku && !skuPositions(product, warehouseId, sku).length && <label className="flex items-start gap-2 rounded-md border p-3 text-xs leading-5"><input type="checkbox" className="mt-1" checked={confirmNoHolds} onChange={event => setConfirmNoHolds(event.target.checked)} /><span>I have verified there are no existing order holds or other holds for this SKU here. Set up available stock from this count.</span></label>}
      {initializeLocation && <p className="text-xs leading-5 text-muted-foreground">FBA/FBS stock is read only and appears after a quantity is recorded by its provider.</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={!canSave}>{setup ? 'Confirm availability' : receipt ? 'Receive stock' : initializeLocation ? 'Save opening stock' : 'Record adjustment'}</Button></div>
    </form>
  </DialogContent></Dialog>;
}
