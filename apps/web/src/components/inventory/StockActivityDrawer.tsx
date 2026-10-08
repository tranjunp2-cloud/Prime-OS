import { Fragment, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ChevronDown, ChevronRight, HelpCircle, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Product } from '@/lib/product-store';
import { countForSku } from '@/lib/warehouse-stock-operations';
import { getInventoryPositions, subscribeInventory } from '@/lib/inventory-store';
import { getStockHoldHistory } from '@/lib/stock-hold-history';
import { activityLabels, createStockActivitySource, defaultActivityFilters, type ActivityFilters, type StockActivity } from '@/lib/stock-activity';
import type { StockLocation } from './WarehouseStockTable';
import { cn } from '@/lib/utils';

export type StockActivityAction = 'receipt' | 'transfer' | 'adjustment' | 'holds';
const number = (value: number | null | undefined) => value === null || value === undefined ? 'Not recorded' : value.toLocaleString();
const selectClass = 'h-10 min-w-0 rounded-md border border-input bg-background px-2.5 text-sm';

export function StockActivityDrawer({ open, onOpenChange, products, warehouses, onNewAction, recentId, onReceive, onPrepareDestination }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  warehouses: StockLocation[];
  onNewAction: (action: StockActivityAction) => void;
  recentId?: string | null;
  onReceive?: (productId: string, recordId: string) => void;
  onPrepareDestination?: (productId: string, warehouseId: string, sku: string) => void;
}) {
  const [filters, setFilters] = useState<ActivityFilters>(defaultActivityFilters);
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [receiptError, setReceiptError] = useState('');
  const [receiving, setReceiving] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);
  const body = useRef<HTMLDivElement>(null);
  const newAction = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<Element | null>(null);
  const openingForm = useRef(false);
  const positions = useSyncExternalStore(subscribeInventory, getInventoryPositions, getInventoryPositions);
  const { source, historyError } = useMemo(() => {
    try { return { source: createStockActivitySource(products, getStockHoldHistory(), warehouses), historyError: false }; }
    catch { return { source: createStockActivitySource(products, [], warehouses), historyError: true }; }
    // These snapshots intentionally refresh the separate localStorage history on holds and reopening.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, warehouses, positions, open]);
  useEffect(() => { if (recentId) { setFocusId(recentId); setPage(1); setExpanded(null); } }, [recentId]);
  const result = source.query(filters, page, focusId);
  useEffect(() => { if (body.current) body.current.scrollTop = 0; }, [result.page, filters, open]);
  const changeFilters = (patch: Partial<ActivityFilters>) => { setFilters(current => ({ ...current, ...patch })); setPage(1); setExpanded(null); setFocusId(null); };
  const clearFilters = () => changeFilters({ ...defaultActivityFilters, period: 'all' });
  const create = (action: StockActivityAction) => {
    openingForm.current = true;
    newAction.current?.focus();
    onNewAction(action);
  };
  return <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl" onOpenAutoFocus={() => {
      openingForm.current = false;
      const active = document.activeElement;
      if (active && !active.closest('[role="dialog"]')) returnFocus.current = active;
    }} onCloseAutoFocus={event => {
      if (openingForm.current) event.preventDefault();
      else if (returnFocus.current instanceof HTMLElement && returnFocus.current.isConnected) { event.preventDefault(); returnFocus.current.focus(); }
    }}>
      <div className="shrink-0 border-b px-4 pb-4 pt-5 sm:px-5">
        <div className="flex items-start justify-between gap-3 pr-7">
          <SheetHeader className="min-w-0 text-left"><SheetTitle className="text-base sm:text-xl">Stock activity</SheetTitle><SheetDescription className="sr-only sm:not-sr-only">Opening stock, receipts, adjustments, transfers and holds.</SheetDescription></SheetHeader>
          <div className="flex shrink-0 items-center gap-1">
            <Popover><PopoverTrigger asChild><Button variant="ghost" size="icon" className="size-8 sm:size-10" aria-label="About stock activity"><HelpCircle className="size-4" /></Button></PopoverTrigger><PopoverContent align="end" className="space-y-2 text-xs leading-5">
              <p>Opening stock records the first count. Receive stock adds arriving units. Adjust stock corrects the count after checking the actual quantity. Each operation is recorded separately.</p>
              <p>Manage holds changes availability without changing physical stock.</p>
              <p>In-transit stock leaves the source first. Confirm receipt to add it at the destination. Already received transfers update both counts immediately.</p>
              <p className="text-muted-foreground">History is saved on this device. Marketplace quantities are managed separately. Select a row to see its full reference and details.</p>
            </PopoverContent></Popover>
            <DropdownMenu modal={false}><DropdownMenuTrigger asChild><Button ref={newAction} className="h-10 gap-1.5 px-2 text-xs sm:px-3 sm:text-sm"><Plus className="size-4" />New action<ChevronDown className="size-3.5" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" onCloseAutoFocus={event => { if (openingForm.current) event.preventDefault(); }}>
              <DropdownMenuItem onSelect={() => create('receipt')}>Receive stock</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => create('transfer')}>Transfer stock</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => create('adjustment')}>Adjust stock</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => create('holds')}>Manage holds</DropdownMenuItem>
            </DropdownMenuContent></DropdownMenu>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-[minmax(160px,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div className="relative col-span-2 sm:col-span-1"><Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" /><Input className="h-10 pl-9" aria-label="Search stock activity" placeholder="Product, SKU or reference…" value={filters.search} onChange={event => changeFilters({ search: event.target.value })} /></div>
          <select aria-label="Activity type" className={selectClass} value={filters.type} onChange={event => changeFilters({ type: event.target.value as ActivityFilters['type'] })}><option value="all">All activities</option><option value="opening">Opening stock</option><option value="receipt">Stock received</option><option value="adjustment">Adjustments</option><option value="transfer">Transfers</option><option value="hold">Holds added</option><option value="release">Holds released</option><option value="availability">Availability setup</option></select>
          <select aria-label="Activity warehouse" className={selectClass} value={filters.warehouseId} onChange={event => changeFilters({ warehouseId: event.target.value })}><option value="">All warehouses</option>{source.warehouseOptions.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <select aria-label="Activity period" className={cn(selectClass, 'col-span-2 sm:col-span-1')} value={filters.period} onChange={event => changeFilters({ period: event.target.value as ActivityFilters['period'] })}><option value="30">Last 30 days</option><option value="7">Last 7 days</option><option value="today">Today</option><option value="all">All time</option><option value="custom">Custom dates</option></select>
        </div>
        {filters.period === 'custom' && <div className="mt-2 grid grid-cols-2 gap-2"><label className="text-xs text-muted-foreground">From<Input className="mt-1 h-10" type="date" value={filters.from} onChange={event => changeFilters({ from: event.target.value })} /></label><label className="text-xs text-muted-foreground">To<Input className="mt-1 h-10" type="date" value={filters.to} onChange={event => changeFilters({ to: event.target.value })} /></label></div>}
        {result.invalidDateRange && <p role="alert" className="mt-2 text-xs text-destructive">Choose an end date on or after the start date.</p>}
        {historyError && <p role="status" className="mt-2 text-xs text-muted-foreground">Hold history could not be read. Other available activity is shown.</p>}
        {focusId && <div role="status" className="mt-3 flex items-center justify-between gap-2 text-xs"><span>{result.focusHidden ? 'Saved. The new activity is outside these filters.' : 'Saved. The new activity is highlighted below.'}</span>{result.focusHidden && <Button size="sm" variant="outline" onClick={() => { setFilters({ ...defaultActivityFilters, period: 'all' }); setPage(1); setExpanded(null); }}>Show new activity</Button>}</div>}
      </div>
      <div ref={body} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <table aria-label="Stock activity history" className="w-full table-fixed text-left text-sm">
          <colgroup><col className="hidden w-[96px] sm:table-column" /><col /><col className="hidden w-[24%] sm:table-column" /><col className="w-[116px] sm:w-[132px]" /><col className="w-10" /></colgroup>
          <thead className="sticky top-0 z-10 bg-background text-xs text-muted-foreground"><tr>
            <th className="hidden px-4 py-3 font-medium sm:table-cell" scope="col">Time</th><th className="px-4 py-3 font-medium" scope="col">Activity / Product</th><th className="hidden px-3 py-3 font-medium sm:table-cell" scope="col">Warehouse</th><th className="px-3 py-3 text-right font-medium" scope="col">Change</th><th scope="col"><span className="sr-only">Details</span></th>
          </tr></thead>
          <tbody>{result.items.map(item => {
            const isOpen = expanded === item.key;
            const product = products.find(product => product.id === item.productId);
            const destinationMissing = item.transferStatus === 'in_transit' && product && countForSku(product, item.warehouseIds[1], item.sku) === null;
            const toggle = () => setExpanded(isOpen ? null : item.key);
            const date = new Date(item.createdAt);
            return <Fragment key={item.key}><tr className={cn('cursor-pointer border-t hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring', item.id === recentId && 'bg-primary/5')} aria-expanded={isOpen} tabIndex={0} onClick={toggle} onKeyDown={event => { if (event.target === event.currentTarget && ['Enter', ' '].includes(event.key)) { event.preventDefault(); toggle(); } }}>
              <td className="hidden px-4 py-2.5 align-top text-xs tabular-nums sm:table-cell"><time dateTime={item.createdAt} title={date.toLocaleString()}>{date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}<span className="mt-1 block text-muted-foreground">{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></time></td>
              <td className="min-w-0 px-4 py-2.5"><p className="truncate font-medium" title={item.productName}>{item.productName}</p><div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><span className="shrink-0">{item.transferStatus === 'in_transit' ? 'In transit' : activityLabels[item.type]}</span><span aria-hidden="true">·</span><span className="truncate" title={item.sku}>{item.sku}</span>{item.id === recentId && <span className="shrink-0 rounded bg-primary/10 px-1.5 text-[11px] text-primary">New</span>}</div><p className="mt-1 break-words text-xs text-muted-foreground sm:hidden">{date.toLocaleDateString()} · {item.warehouseNames.join(' → ')}</p></td>
              <td className="hidden px-3 py-2.5 align-top text-xs leading-5 sm:table-cell">{item.warehouseNames[0]}{item.type === 'transfer' && <span className="block text-muted-foreground">→ {item.warehouseNames[1]}</span>}</td>
              <td className="px-3 py-2.5 text-right align-top"><ActivityChange item={item} /></td>
              <td className="py-2 pr-2"><Button variant="ghost" size="icon" className="size-8" aria-label={`${isOpen ? 'Hide' : 'View'} activity ${item.id}`} aria-expanded={isOpen} onClick={event => { event.stopPropagation(); toggle(); }}>{isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}</Button></td>
            </tr>{isOpen && <tr className="border-t bg-muted/20"><td colSpan={5} className="px-4 py-4 sm:px-5"><ActivityDetails item={item} />{item.transferStatus === 'in_transit' && onReceive && <div className="mt-4 space-y-2"><p className="text-xs text-muted-foreground">Confirm only after all {item.quantity} units have arrived. The destination count will increase by {item.quantity}.</p>{destinationMissing && onPrepareDestination && <Button variant="outline" size="sm" onClick={() => onPrepareDestination(item.productId, item.warehouseIds[1], item.sku)}>Record destination stock</Button>}<Button className="ml-2" size="sm" disabled={receiving} onClick={() => { setReceiving(true); setReceiptError(''); try { onReceive(item.productId, item.id); } catch (failure) { setReceiptError(failure instanceof Error ? failure.message : 'Receipt was not saved.'); } finally { setReceiving(false); } }}>Confirm receipt</Button>{receiptError && <p role="alert" className="text-sm text-destructive">{receiptError}</p>}</div>}</td></tr>}</Fragment>;
          })}</tbody>
        </table>
        {!result.items.length && <div className="px-5 py-16 text-center"><p className="font-medium">{result.allTotal ? 'No activity matches these filters' : 'No stock activity yet'}</p><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{result.allTotal ? 'Try a different product, warehouse or date range.' : 'Use New action to record a transfer, adjustment or hold. Saved activity will appear here.'}</p>{result.allTotal > 0 && <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>Clear filters</Button>}</div>}
      </div>
      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t bg-background px-4 py-3 text-xs text-muted-foreground sm:px-5"><span role="status" aria-label="Activity results">{result.total ? `${result.start + 1}–${Math.min(result.start + 25, result.total)} of ${result.total.toLocaleString()}` : '0 results'} · 25 per page</span><div className="flex items-center gap-2"><Button variant="ghost" size="sm" onClick={clearFilters}>Reset filters</Button><Button variant="outline" size="sm" disabled={result.page === 1} onClick={() => { setPage(result.page - 1); setFocusId(null); setExpanded(null); }}>Previous</Button><span className="tabular-nums">{result.page} / {result.pages}</span><Button variant="outline" size="sm" disabled={result.page === result.pages} onClick={() => { setPage(result.page + 1); setFocusId(null); setExpanded(null); }}>Next</Button></div></footer>
    </SheetContent>
  </Sheet>;
}

function ActivityChange({ item }: { item: StockActivity }) {
  if (item.type === 'opening' || item.type === 'receipt' || item.type === 'adjustment' || item.type === 'availability') return <><strong className="tabular-nums">{item.type === 'opening' ? 'Opening count' : item.type === 'availability' ? 'Stock unchanged' : `${item.quantity > 0 ? '+' : ''}${number(item.quantity)}`}</strong><p className="mt-1 text-xs tabular-nums text-muted-foreground">{number(item.before)} → {number(item.after)}</p></>;
  return <><strong className="tabular-nums">{number(item.quantity)}</strong><p className="mt-1 text-xs text-muted-foreground">{item.type === 'transfer' ? item.transferStatus === 'in_transit' ? 'units in transit' : 'units received' : item.type === 'hold' ? 'units held' : 'units released'}</p></>;
}

function ActivityDetails({ item }: { item: StockActivity }) {
  const detailClass = 'mt-1 break-words text-foreground';
  return <div aria-label={`Details for activity ${item.id}`}>
    <dl className="grid gap-x-6 gap-y-4 text-xs text-muted-foreground sm:grid-cols-2">
      <div><dt>Reference</dt><dd className={cn(detailClass, 'select-all font-mono')}>{item.id}</dd></div>
      <div><dt>Recorded</dt><dd className={detailClass}>{new Date(item.createdAt).toLocaleString()} · {item.type === 'transfer' ? item.transferStatus === 'in_transit' ? 'In transit' : 'Completed' : 'Recorded'}</dd></div>
      <div><dt>Product / SKU</dt><dd className={detailClass}>{item.productName} · {item.sku}</dd></div>
      <div><dt>Reason</dt><dd className={detailClass}>{item.reason || 'Not recorded'}</dd></div>
      <div><dt>{item.type === 'hold' || item.type === 'release' ? item.reason : `Stock · ${item.warehouseNames[0]}`}</dt><dd className={cn(detailClass, 'tabular-nums')}>{number(item.before)} → {number(item.after)}</dd></div>
      {item.type === 'transfer' && <div><dt>Stock · {item.warehouseNames[1]}</dt><dd className={cn(detailClass, 'tabular-nums')}>{item.transferStatus === 'in_transit' ? 'Unchanged · awaiting receipt' : `${number(item.destinationBefore)} → ${number(item.destinationAfter)}`}</dd></div>}
      {item.receivedAt && <div><dt>Received</dt><dd className={detailClass}>{new Date(item.receivedAt).toLocaleString()}</dd></div>}
      {item.note && <div className="sm:col-span-2"><dt>Note</dt><dd className={detailClass}>{item.note}</dd></div>}
    </dl>
    {(item.type === 'hold' || item.type === 'release') && <p className="mt-4 text-xs text-muted-foreground">Only this hold reason changed. Physical stock stayed the same.</p>}
  </div>;
}
