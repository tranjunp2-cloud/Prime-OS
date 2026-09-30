import { useRef, useState, useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getProducts, type Product } from '@/lib/product-store';
import { getWarehouses } from '@/lib/warehouse-store';
import { canEditWarehouseStock, type StockValue } from '@/lib/warehouse-stock-view';
import { getInventoryPositions, subscribeInventory } from '@/lib/inventory-store';
import { getStockHoldHistory, holdReasons, type HoldKind } from '@/lib/stock-hold-history';
import { canManageWarehouseHolds, changeWarehouseHold, getHoldContext } from '@/lib/warehouse-holds';
import { useToast } from '@/hooks/use-toast';
import { InventoryAmount } from './StockAvailability';

type Target = { product: Product; warehouseId?: string; sku?: string };
const selectClass = 'h-11 w-full rounded-md border border-input bg-background px-3 text-sm';
const productSkus = (product: Product, sku?: string) => product.has_variants ? product.skus.filter(item => !sku || item.sku_code === sku).map(item => item.sku_code) : [product.sku_code];

export function ManageStockHoldsButton({ product, warehouseId, sku, value }: Target & { value?: StockValue }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const positions = useSyncExternalStore(subscribeInventory, getInventoryPositions, getInventoryPositions);
  const canManage = getWarehouses().some(warehouse => (!warehouseId || warehouse.id === warehouseId)
    && productSkus(product, sku).some(code => canManageWarehouseHolds(product, warehouse.id, code, positions)));
  if (!canManage) return value ? <InventoryAmount value={value} /> : null;
  return <>
    <Button type="button" variant={value ? 'ghost' : 'outline'} size="sm" aria-haspopup="dialog"
      aria-label={`Manage holds for ${sku ?? product.name}${warehouseId ? ` at ${getWarehouses().find(item => item.id === warehouseId)?.name ?? warehouseId}` : ''}`}
      title="Manage holds" className={value ? 'min-h-9 min-w-9 px-1 underline decoration-dotted underline-offset-4' : 'min-h-9'}
      onClick={event => { event.stopPropagation(); setOpen(true); }}>
      {value ? <InventoryAmount value={value} /> : 'Manage holds'}
    </Button>
    {open && <ManageStockHoldsDialog product={getProducts().find(item => item.id === product.id) ?? product} warehouseId={warehouseId} sku={sku}
      onClose={() => setOpen(false)} onSaved={() => { setOpen(false); toast({ title: 'Holds updated', description: 'Other holds and available stock have been recalculated.' }); }} />}
  </>;
}

export function StockHoldHistory({ productId, warehouseId, sku }: { productId?: string; warehouseId?: string; sku?: string }) {
  useSyncExternalStore(subscribeInventory, getInventoryPositions, getInventoryPositions);
  let history;
  try { history = getStockHoldHistory().filter(item => (!productId || item.productId === productId) && (!warehouseId || item.warehouseId === warehouseId) && (!sku || item.sku === sku)); }
  catch { return <p className="text-xs text-muted-foreground">Saved hold history is currently unavailable.</p>; }
  return <details className="rounded-md border p-3">
    <summary className="cursor-pointer text-sm font-medium">Hold history ({history.length})</summary>
    <div className="mt-3 max-h-56 space-y-3 overflow-y-auto">
      {!history.length && <p className="text-xs text-muted-foreground">No hold changes yet.</p>}
      {history.map(item => <div key={item.id} className="border-b pb-3 text-xs last:border-0 last:pb-0">
        <div className="flex justify-between gap-3"><span className="font-medium">{holdReasons[item.kind]}</span><span className="shrink-0 tabular-nums">{item.before} → {item.after}</span></div>
        <p className="mt-1 text-muted-foreground">{item.sku} · {getWarehouses().find(warehouse => warehouse.id === item.warehouseId)?.name ?? item.warehouseId}</p>
        {item.note && <p className="mt-1 break-words">{item.note}</p>}
        <p className="mt-1 text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</p>
      </div>)}
    </div>
  </details>;
}

export function ManageStockHoldsDialog({ product: initialProduct, products = getProducts(), warehouseId: initialWarehouseId, sku: initialSku, onClose, onSaved }: {
  product?: Product; products?: Product[]; warehouseId?: string; sku?: string; onClose: () => void; onSaved: (recordId: string) => void;
}) {
  const trigger = useRef(typeof document === 'undefined' ? null : document.activeElement);
  const [productId, setProductId] = useState(initialProduct?.id ?? '');
  const product = initialProduct ?? products.find(item => item.id === productId);
  const [warehouseId, setWarehouseId] = useState(initialWarehouseId ?? '');
  const [variantSku, setVariantSku] = useState(initialProduct?.has_variants ? initialSku ?? '' : '');
  const sku = product?.has_variants ? variantSku : product?.sku_code ?? '';
  const positions = useSyncExternalStore(subscribeInventory, getInventoryPositions, getInventoryPositions);
  const warehouses = getWarehouses().filter(warehouse => warehouse.status === 'active' && canEditWarehouseStock(warehouse.id));
  const availableIn = (item: Product, id: string) => productSkus(item).some(code => canManageWarehouseHolds(item, id, code, positions));
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}><DialogContent className="max-h-[90vh] gap-3 overflow-y-auto p-5 sm:max-w-md" onClick={event => event.stopPropagation()} onCloseAutoFocus={event => {
    if (trigger.current instanceof HTMLElement && trigger.current.isConnected) { event.preventDefault(); trigger.current.focus({ preventScroll: true }); }
  }}>
    <DialogHeader><DialogTitle>Manage holds</DialogTitle><DialogDescription>{initialProduct?.name ?? 'Choose a product and warehouse to hold or release stock.'}</DialogDescription></DialogHeader>
    {!initialProduct && <label className="grid gap-1.5 text-sm font-medium">Product<select className={selectClass} value={productId} onChange={event => { setProductId(event.target.value); setVariantSku(''); setWarehouseId(''); }}><option value="">Select a product</option>{products.map(item => {
      const eligible = warehouses.some(warehouse => availableIn(item, warehouse.id));
      return <option key={item.id} value={item.id} disabled={!eligible}>{item.name} · {item.sku_code}{!eligible ? ' · No stock to hold or release' : ''}</option>;
    })}</select></label>}
    <div className={product?.has_variants ? 'grid gap-3 sm:grid-cols-2' : ''}>
      <label className="grid gap-1.5 text-sm font-medium">Warehouse<select className={selectClass} value={warehouseId} disabled={!product} onChange={event => {
        setWarehouseId(event.target.value);
        if (product?.has_variants && !canManageWarehouseHolds(product, event.target.value, variantSku, positions)) setVariantSku('');
      }}><option value="">Select a warehouse</option>{warehouses.map(warehouse => {
        const eligible = product && availableIn(product, warehouse.id);
        return <option key={warehouse.id} value={warehouse.id} disabled={!eligible}>{warehouse.name}{!eligible ? ' · Unavailable' : ''}</option>;
      })}</select></label>
      {product?.has_variants && <label className="grid gap-1.5 text-sm font-medium">Variant SKU<select className={selectClass} value={variantSku} disabled={!warehouseId} onChange={event => setVariantSku(event.target.value)}><option value="">Select a variant</option>{product.skus.map(variant => {
        const eligible = canManageWarehouseHolds(product, warehouseId, variant.sku_code, positions);
        return <option key={variant.id} value={variant.sku_code} disabled={!eligible}>{variant.variation_name} · {variant.sku_code}{!eligible ? ' · Unavailable' : ''}</option>;
      })}</select></label>}
    </div>
    {product && warehouseId && sku ? <HoldEditor key={`${product.id}:${warehouseId}:${sku}`} product={product} warehouseId={warehouseId} sku={sku} onClose={onClose} onSaved={onSaved} />
      : <><p className="text-sm text-muted-foreground">Choose {product ? '' : 'a product, '}a warehouse{product?.has_variants ? ' and variant' : ''} to view available stock.</p><div className="flex justify-end"><Button variant="outline" onClick={onClose}>Cancel</Button></div></>}
    {product && <StockHoldHistory productId={product.id} warehouseId={warehouseId} sku={sku} />}
  </DialogContent></Dialog>;
}

function HoldEditor({ product, warehouseId, sku, onClose, onSaved }: { product: Product; warehouseId: string; sku: string; onClose: () => void; onSaved: (recordId: string) => void }) {
  const positions = useSyncExternalStore(subscribeInventory, getInventoryPositions, getInventoryPositions);
  let context: ReturnType<typeof getHoldContext> | undefined;
  let contextError = '';
  try { context = getHoldContext(product, warehouseId, sku, positions); } catch (error) { contextError = error instanceof Error ? error.message : 'Stock details are unavailable.'; }
  const [snapshot] = useState(context?.position);
  const firstHeldKind = (Object.keys(holdReasons) as HoldKind[]).find(kind => (context?.position[kind] ?? 0) > 0) ?? 'safety_stock';
  const [action, setAction] = useState<'hold' | 'release'>(context?.item.atp === 0 ? 'release' : 'hold');
  const [kind, setKind] = useState<HoldKind>(context?.item.atp === 0 ? firstHeldKind : 'safety_stock');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [saveError, setSaveError] = useState('');
  const saving = useRef(false);
  const stale = context && JSON.stringify(snapshot) !== JSON.stringify(context.position);
  const error = contextError || (stale ? 'Stock changed while this form was open. Close it and reopen to review the latest balance.' : '') || saveError;
  const current = context?.position[kind] ?? 0;
  const amount = quantity.trim() ? Number(quantity) : NaN;
  const maximum = context ? action === 'hold' ? context.item.atp! : current : 0;
  const valid = Number.isSafeInteger(amount) && amount > 0 && amount <= maximum;
  const quantityError = quantity && !valid ? !Number.isSafeInteger(amount) || amount <= 0 ? 'Enter a whole number greater than 0.' : `Only ${maximum} units can be ${action === 'hold' ? 'held' : 'released'}.` : '';
  const delta = valid ? action === 'hold' ? amount : -amount : 0;
  const otherAfter = context ? context.item.unavailable! + delta : null;
  const atpAfter = context ? Math.max(0, context.item.onHand! - context.item.held! - otherAfter!) : null;
  const submit = () => {
    if (!valid || !snapshot || error || saving.current) return;
    saving.current = true;
    try { const record = changeWarehouseHold({ productId: product.id, warehouseId, sku, kind, action, quantity: amount, note, expectedPosition: snapshot }); onSaved(record.id); }
    catch (failure) { setSaveError(failure instanceof Error ? failure.message : 'Could not save this hold.'); saving.current = false; }
  };
  return <form className="space-y-3" onSubmit={event => { event.preventDefault(); event.stopPropagation(); submit(); }}>
    {context && <p className="text-xs text-muted-foreground">Stock: {context.item.onHand} · For orders: {context.item.held} · Available: {context.item.atp}</p>}
    <fieldset className="grid grid-cols-2 gap-2"><legend className="sr-only">Action</legend>{([['hold', 'Hold stock'], ['release', 'Release stock']] as const).map(([value, label]) => {
      const disabled = !context || (value === 'hold' ? context.item.atp! <= 0 : context.item.unavailable! <= 0);
      return <label key={value} className={`flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm ${disabled ? 'cursor-not-allowed text-muted-foreground' : 'cursor-pointer'} ${action === value ? 'border-primary bg-primary/10' : ''}`}><input type="radio" name="hold-action" value={value} disabled={disabled} checked={action === value} onChange={() => { setAction(value); if (value === 'release' && !context?.position[kind]) setKind(firstHeldKind); setQuantity(''); setSaveError(''); }} />{label}</label>;
    })}</fieldset>
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
      <label className="grid gap-1.5 text-sm font-medium">Reason<select className={selectClass} value={kind} onChange={event => { setKind(event.target.value as HoldKind); setQuantity(''); setSaveError(''); }}>{Object.entries(holdReasons).map(([value, label]) => <option key={value} value={value} disabled={action === 'release' && !(context?.position[value as HoldKind] ?? 0)}>{label}</option>)}</select></label>
      <label className="grid gap-1.5 text-sm font-medium">Quantity to {action === 'hold' ? 'hold' : 'release'}<Input className="h-11" type="number" min="1" max={maximum} step="1" value={quantity} disabled={!context || Boolean(stale)} aria-invalid={Boolean(quantityError)} aria-describedby={quantityError ? 'hold-quantity-error' : undefined} onChange={event => { setQuantity(event.target.value); setSaveError(''); }} /></label>
    </div>
    {context && <p className="text-xs text-muted-foreground">Currently held for this reason: {current}</p>}
    {quantityError && <p id="hold-quantity-error" role="alert" className="text-sm text-destructive">{quantityError}</p>}
    <details><summary className="cursor-pointer text-xs text-muted-foreground">Add a note (optional)</summary><label className="mt-2 grid gap-1.5 text-sm font-medium"><span className="sr-only">Note (optional)</span><Input value={note} maxLength={300} placeholder="e.g. Reserved for the October campaign" onChange={event => setNote(event.target.value)} /></label></details>
    {context && <dl aria-label="Hold preview" aria-live="polite" className="grid grid-cols-2 gap-3 rounded-md bg-muted/40 p-3 text-sm">
      <div><dt className="text-xs text-muted-foreground">Other holds</dt><dd className="mt-1 font-semibold tabular-nums">{context.item.unavailable} → {otherAfter}</dd></div>
      <div><dt className="text-xs text-muted-foreground">Available (ATP)</dt><dd className="mt-1 font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">{context.item.atp} → {atpAfter}</dd></div>
    </dl>}
    <p className="text-xs text-muted-foreground">Physical stock stays the same. Changes are saved on this device.</p>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={!valid || Boolean(error) || !snapshot}>{action === 'hold' ? 'Save hold' : 'Release stock'}</Button></div>
  </form>;
}
