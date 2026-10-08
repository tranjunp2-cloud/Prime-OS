import { useRef, useState, useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { Product } from '@/lib/product-store';
import { getWarehouses } from '@/lib/warehouse-store';
import { canEditWarehouseStock } from '@/lib/warehouse-stock-view';
import { getInventoryPositions, subscribeInventory } from '@/lib/inventory-store';
import { availabilityAt } from '@/lib/warehouse-availability';
import { countForSku } from '@/lib/warehouse-stock-operations';
import { recordWarehouseTransfer } from '@/lib/warehouse-transfers';
import type { StockAdjustmentTarget } from './WarehouseStockTable';

export function TransferStockDrawer({ products, target, onClose, onSaved }: { products: Product[]; target?: Partial<StockAdjustmentTarget>; onClose: () => void; onSaved: (id: string, inTransit: boolean) => void }) {
  const warehouses = getWarehouses().filter(item => item.status === 'active' && canEditWarehouseStock(item.id));
  const [from, setFrom] = useState(warehouses.find(item => item.id === target?.warehouse?.id)?.id ?? warehouses[0]?.id ?? '');
  const [to, setTo] = useState('');
  const [selection, setSelection] = useState(target?.product ? `${target.product.id}::${target.sku ?? (target.product.has_variants ? '' : target.product.sku_code)}` : '');
  const [productId, sku = ''] = selection.split('::');
  const [quantity, setQuantity] = useState('');
  const [mode, setMode] = useState<'in_transit' | 'received'>('in_transit');
  const [error, setError] = useState('');
  const saving = useRef(false);
  const positions = useSyncExternalStore(subscribeInventory, getInventoryPositions, getInventoryPositions);
  const product = products.find(item => item.id === productId && (item.has_variants ? item.skus.some(variant => variant.sku_code === sku) : item.sku_code === sku));
  const stock = product ? availabilityAt(product, [from], positions, sku) : null;
  const available = stock?.atp.incomplete ? null : stock?.atp.quantity;
  const dest = product && to ? countForSku(product, to, sku) : null;
  const qty = Number(quantity);
  const valid = Boolean(product && to && from !== to && Number.isSafeInteger(qty) && qty > 0 && available != null && qty <= available && (mode === 'in_transit' || dest !== null));
  const control = 'h-11 w-full rounded-md border border-input bg-background px-3 text-sm';
  return <Sheet open onOpenChange={open => !open && onClose()}><SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
    <SheetHeader className="border-b p-5"><SheetTitle>Create Stock Transfer</SheetTitle><SheetDescription>Move available stock between warehouses. Order holds and other holds stay protected.</SheetDescription></SheetHeader>
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={event => {
      event.preventDefault(); if (!valid || !product || saving.current) return; saving.current = true;
      try { const record = recordWarehouseTransfer({ productId: product.id, from, to, sku, quantity: qty, expectedFrom: countForSku(product, from, sku), expectedTo: dest, mode }); onSaved(record.id, mode === 'in_transit'); }
      catch (failure) { saving.current = false; setError(failure instanceof Error ? failure.message : 'Could not save the transfer.'); }
    }}>
      <div className="flex-1 space-y-4 overflow-auto p-5">
        <div className="grid grid-cols-2 gap-3"><label className="grid gap-2 text-sm">Source Warehouse<select aria-label="Source Warehouse" className={control} value={from} onChange={event => { setFrom(event.target.value); if (to === event.target.value) setTo(''); setError(''); }}>{warehouses.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="grid gap-2 text-sm">Destination Warehouse<select aria-label="Destination Warehouse" className={control} value={to} onChange={event => { setTo(event.target.value); setError(''); }}><option value="">Select destination</option>{warehouses.filter(item => item.id !== from).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>
        <label className="grid gap-2 text-sm">Product or SKU<select aria-label="Product or SKU" className={control} value={selection} onChange={event => { setSelection(event.target.value); setQuantity(''); setError(''); }}><option value="">Select product or variant</option>{products.flatMap(item => item.has_variants ? item.skus.map(variant => <option key={`${item.id}:${variant.id}`} value={`${item.id}::${variant.sku_code}`}>{item.name} · {variant.variation_name} · {variant.sku_code}</option>) : [<option key={item.id} value={`${item.id}::${item.sku_code}`}>{item.name} · {item.sku_code}</option>])}</select></label>
        {product && <div className="rounded-lg bg-muted/50 p-3 text-sm"><p className="flex justify-between"><span>Available to transfer</span><strong>{available ?? 'Not set up'}</strong></p><p className="mt-2 text-xs text-muted-foreground">{stock?.held.quantity ?? '—'} held for orders · {stock?.unavailable.quantity ?? '—'} other holds</p>{available == null && <p className="mt-2 text-xs">Set up availability for this SKU at the source before transferring.</p>}</div>}
        <label className="grid gap-2 text-sm">Transfer Quantity<Input aria-label="Transfer Quantity" type="number" min={1} max={available ?? undefined} step={1} value={quantity} onChange={event => { setQuantity(event.target.value); setError(''); }} /></label>
        {quantity && (!Number.isSafeInteger(qty) || qty <= 0 || (available != null && qty > available)) && <p role="alert" className="text-sm text-destructive">Enter a whole quantity from 1 to {available ?? 0}.</p>}
        <fieldset className="space-y-2"><legend className="mb-2 text-sm font-medium">When is the stock received?</legend><label className="flex gap-2 rounded-lg border p-3 text-sm"><input type="radio" name="transfer-mode" checked={mode === 'in_transit'} onChange={() => setMode('in_transit')} /><span>Receive later<span className="mt-1 block text-xs text-muted-foreground">Remove from the source now. Add to the destination when receipt is confirmed.</span></span></label><label className="flex gap-2 rounded-lg border p-3 text-sm"><input type="radio" name="transfer-mode" checked={mode === 'received'} onChange={() => setMode('received')} /><span>Already received<span className="mt-1 block text-xs text-muted-foreground">Record a completed movement. Update both counts now.</span></span></label></fieldset>
        {product && to && dest === null && <p className="rounded-lg bg-muted p-3 text-xs leading-5">The destination has no recorded count. Record its current stock, including 0 if empty, before confirming receipt.</p>}
        {valid && <p aria-live="polite" className="text-sm">Source: {stock?.onHand.quantity} → {stock!.onHand.quantity! - qty}. {mode === 'in_transit' ? `${qty} units will be in transit.` : `Destination: ${dest} → ${dest! + qty}.`}</p>}
        <p className="text-xs text-muted-foreground">Marketplace quantities are unchanged by this action.</p>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </div>
      <footer className="flex justify-end gap-2 border-t bg-background p-4"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button disabled={!valid}>{mode === 'in_transit' ? 'Start transfer' : 'Record completed transfer'}</Button></footer>
    </form>
  </SheetContent></Sheet>;
}
