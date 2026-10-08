import { useRef } from 'react';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { availabilityReasons, type AvailabilitySummary } from '@/lib/warehouse-availability';
import type { StockValue } from '@/lib/warehouse-stock-view';
import type { StockLocation } from './WarehouseStockTable';
import { cn } from '@/lib/utils';

export function InventoryAmount({ value, highlight = false }: { value: StockValue; highlight?: boolean }) {
  return <span className={cn('inline-flex items-baseline gap-0.5 whitespace-nowrap text-right', highlight && value.quantity !== null && 'text-emerald-700 dark:text-emerald-400')}>
    <strong className="tabular-nums">{value.quantity?.toLocaleString() ?? '—'}</strong>
  </span>;
}

export function StockGuide({ iconOnly = false }: { iconOnly?: boolean }) {
  return <Popover><PopoverTrigger asChild><Button variant="ghost" size={iconOnly ? 'icon' : 'sm'} aria-label="Stock guide" title="Stock guide" className={cn('gap-1.5 text-xs', iconOnly && 'size-9 shrink-0')}><Info aria-hidden="true" className="size-4" />{!iconOnly && 'Stock guide'}</Button></PopoverTrigger>
    <PopoverContent align="end" className="w-80 space-y-3 text-sm">
      <p className="font-semibold">What can I sell now?</p>
      <dl className="space-y-2 text-xs leading-5">
        <div><dt className="font-semibold">In warehouse</dt><dd className="text-muted-foreground">The counted physical units, including stock held for existing orders.</dd></div>
        <div><dt className="font-semibold">Held for orders</dt><dd className="text-muted-foreground">Unpaid holds, paid orders and stock allocated for fulfillment. Each hold is counted once.</dd></div>
        <div><dt className="font-semibold">Other holds</dt><dd className="text-muted-foreground">Safety stock, campaign holds and damaged or quarantined stock.</dd></div>
        <div><dt className="font-semibold">Available to sell (ATP)</dt><dd className="text-muted-foreground">In warehouse − Held for orders − Other holds, with a minimum of 0. Calculated for each SKU at each warehouse, then added together. Incoming stock is excluded until received.</dd></div>
      </dl>
      <p className="border-t pt-2 text-xs leading-5 text-muted-foreground">Totals use recorded quantities. — = Data unavailable; 0 = confirmed zero. ATP excludes marketplace-managed stock. Opening stock records the first count; Receive stock adds arriving units; Adjust stock corrects the physical count. ATP updates automatically when holds are known.</p>
      <p className="text-xs leading-5 text-muted-foreground">Column totals include all filtered results, across every page. Expand a product to see its warehouses. Select a colored number for details; use Actions to adjust stock or manage holds. Listed on shows active listing channels across all shops. Shops using this warehouse matches each product’s listings to their configured stock source. Select a shop count to see connection and stock sync settings; published quantities are managed separately.</p>
    </PopoverContent>
  </Popover>;
}

export function AvailabilityMetrics({ summary }: { summary: AvailabilitySummary }) {
  return <dl className="grid grid-cols-2 gap-x-5 gap-y-2 sm:grid-cols-4" aria-label="Stock summary">
    {([['In warehouse', summary.onHand], ['For orders', summary.held], ['Other holds', summary.unavailable], ['Available (ATP)', summary.atp]] as const).map(([label, value]) => <div key={label} className="flex flex-col items-start gap-0.5"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="text-base [&>span]:text-left"><InventoryAmount value={value} highlight={label === 'Available (ATP)'} /></dd></div>)}
  </dl>;
}

export function AvailabilityCoverage({ summary }: { summary: AvailabilitySummary }) {
  const external = summary.items.filter(item => item.state === 'external');
  const externalUnits = external.reduce((sum, item) => sum + (item.onHand ?? 0), 0);
  const unresolved = summary.items.filter(item => item.state !== 'ready' && item.state !== 'external').length;
  return <p className="text-xs leading-5 text-muted-foreground">
    {!summary.tracked ? 'No recorded stock in this selection.' : <>
      {[summary.onHand, summary.held, summary.unavailable, summary.atp].some(value => value.incomplete) && 'Totals include recorded quantities only. '}
      {external.length > 0 && `${externalUnits.toLocaleString()} recorded units managed by marketplaces are excluded from ATP. `}
      {unresolved > 0 ? `ATP needs more data for ${unresolved} ${unresolved === 1 ? 'stock record' : 'stock records'}. Select an ATP value for details.` : external.length === 0 ? 'ATP is calculated after order holds and stock buffers.' : ''}
    </>}
  </p>;
}

export type StockBreakdownMode = 'atp' | 'orders' | 'holds';

export function StockBreakdown({ title, summary, warehouses, onClose, mode = 'atp', onManageHolds }: { title: string; summary: AvailabilitySummary; warehouses: StockLocation[]; onClose: () => void; mode?: StockBreakdownMode; onManageHolds?: () => void }) {
  const trigger = useRef(typeof document === 'undefined' ? null : document.activeElement);
  const heading = mode === 'orders' ? 'Held for orders' : mode === 'holds' ? 'Other holds' : 'Stock breakdown';
  const total = mode === 'orders' ? summary.held : summary.unavailable;
  return <Sheet open onOpenChange={open => { if (!open) onClose(); }}><SheetContent className="w-full overflow-y-auto sm:max-w-xl" onCloseAutoFocus={event => {
    if (trigger.current instanceof HTMLElement && trigger.current.isConnected) {
      event.preventDefault();
      trigger.current.focus({ preventScroll: true });
    }
  }}>
    <SheetHeader><SheetTitle>{heading}</SheetTitle><SheetDescription>{title}</SheetDescription></SheetHeader>
    <div className="mt-5 space-y-4">
      {mode === 'atp' ? <><AvailabilityMetrics summary={summary} /><AvailabilityCoverage summary={summary} />
        <p className="rounded-md bg-muted/50 p-3 text-xs leading-5">ATP is calculated for each SKU at each warehouse: In warehouse − Held for orders − Other holds, with a minimum of 0. Incoming stock is not ready to sell.</p></>
        : <><div className="flex items-center justify-between gap-4 rounded-md bg-muted/50 p-3"><span className="text-sm">{heading}</span><span className="text-lg"><InventoryAmount value={total} /></span></div>
          <p className="text-xs leading-5 text-muted-foreground">{mode === 'orders' ? 'Units held for existing orders, not the number of orders. The order source can differ from the shops currently using this warehouse. These quantities cannot be edited here.' : 'Safety stock, campaign reservations and damaged or quarantined units reduce the stock available to sell. The physical stock count stays unchanged.'}</p>
          {total.incomplete && <p className="text-xs text-muted-foreground">Total includes recorded quantities only. — means data is unavailable.</p>}
          {mode === 'holds' && onManageHolds && <Button variant="outline" size="sm" onClick={onManageHolds}>Manage holds</Button>}</>}
      {summary.items.length === 0 && <p className="text-sm text-muted-foreground">No stock positions are recorded for this selection.</p>}
      {summary.items.map((item, index) => <section key={`${item.warehouseId}:${item.sku}:${index}`} className="rounded-lg border p-4">
        <h3 className="text-sm font-semibold">{warehouses.find(warehouse => warehouse.id === item.warehouseId)?.name ?? item.warehouseId}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{item.variant ? `${item.variant} · ` : ''}{item.sku}</p>
        <dl className="mt-3 space-y-2 text-sm">
          {([
            ...(mode === 'atp' ? [['In warehouse', item.onHand]] as const : []),
            ...(item.state === 'ready' && mode !== 'holds' ? [['Unpaid order holds', item.unpaid], ['Paid order holds', item.paid], ['Allocated for fulfillment', item.allocated]] as const : []),
            ...(item.state === 'ready' && mode !== 'orders' ? [['Safety stock', item.safety], ['Campaign holds', item.campaign], ['Damaged / quarantine', item.damaged]] as const : []),
          ] as const).map(([label, value]) => <div key={label} className="flex justify-between gap-4"><dt className="text-muted-foreground">{label}</dt><dd className="tabular-nums">{value?.toLocaleString() ?? '—'}</dd></div>)}
          <div className="flex justify-between gap-4 border-t pt-2 font-semibold"><dt>{mode === 'atp' ? 'Available to sell (ATP)' : heading}</dt><dd className={cn('tabular-nums', mode === 'atp' && 'text-emerald-700 dark:text-emerald-400')}>{(mode === 'atp' ? item.atp : mode === 'orders' ? item.held : item.unavailable)?.toLocaleString() ?? '—'}</dd></div>
          {mode === 'atp' && item.state === 'ready' && <div className="flex justify-between gap-4 border-t pt-2 text-muted-foreground"><dt>Incoming · not included in ATP</dt><dd className="tabular-nums">{item.incoming?.toLocaleString() ?? '—'}</dd></div>}
        </dl>
        {mode === 'orders' && (item.held ?? 0) > 0 && <div className="mt-4 border-t pt-3">
          {item.orderSourcesVerified ? <><h4 className="text-xs font-semibold">Order references</h4><ul className="mt-2 max-h-72 space-y-2 overflow-y-auto">{item.orderHolds?.map(hold => <li key={hold.lineId} className="flex items-start justify-between gap-3 rounded-md bg-muted/30 p-2 text-xs">
            <div className="min-w-0"><p className="break-all font-medium">{hold.orderNumber}</p><p className="mt-1 break-words text-muted-foreground">{hold.source} · {hold.state === 'reserved_unpaid' ? 'Awaiting payment' : hold.state === 'allocated' ? 'In fulfillment' : 'Reserved'}</p></div>
            <span className="shrink-0 tabular-nums">{hold.quantity} {hold.quantity === 1 ? 'unit' : 'units'}</span>
          </li>)}</ul></> : <p className="text-xs leading-5 text-muted-foreground">Order references are unavailable for these {item.held} units. Existing holds are preserved; verify their source before releasing stock.</p>}
        </div>}
        {item.state !== 'ready' ? <p className="mt-3 text-xs leading-5 text-muted-foreground">{availabilityReasons[item.state]}</p> : <>
          {mode === 'atp' && item.onHand! < item.held! + item.unavailable! && <p className="mt-3 text-xs leading-5 text-destructive">Holds exceed the recorded count by {item.held! + item.unavailable! - item.onHand!} units. Review reservations and the physical count.</p>}
          <p className="mt-3 text-xs text-muted-foreground">Order holds / buffers updated: {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : 'Time unavailable'}</p>
        </>}
      </section>)}
      <p className="text-xs leading-5 text-muted-foreground">Based on the latest recorded stock counts and order holds. Quantities published to shops are managed separately.</p>
    </div>
  </SheetContent></Sheet>;
}
