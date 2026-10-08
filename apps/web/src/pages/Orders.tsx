import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuRadioGroup, DropdownMenuRadioItem } from '@/components/ui/dropdown-menu';
import { OrderToolbar } from '@/components/orders/OrderToolbar';
import { batchBlocker, actionFilterLabels, matchesActionFilter, type ActionFilter, type BatchAction } from '@/lib/order-bulk';
import { OrderBatchDialog } from '@/components/orders/OrderBatchDialog';
import { orderNextAction, orderDeadline, deadlineLabel } from '@/lib/order-processing';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { OrderNavigation } from '@/components/orders/OrderNavigation';
import { OrderLifecycleBadge } from '@/components/orders/OrderLifecycleBadge';
import { workQueues, matchesOrderQueue, hasReturnHistory, getQueueFilters, matchesQueueFilter, type OrderQueue } from '@/lib/order-work-queues';
import { ChannelLogo } from '@/components/channels/ChannelLogo';
import { HandlingTypeBadge } from '@/components/orders/HandlingTypeBadge';
import { printPackingSlips } from '@/lib/order-print';
import { useEffect, useMemo, useState } from 'react';
import {
  Download,
  Info,
  Ellipsis,
  Search,
  ShoppingBag,
  X,
} from 'lucide-react';
import { useSearchParams, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { WorkspacePageHeader } from '@/components/system/WorkspacePageHeader';
import { cn } from '@/lib/utils';
import { ordersApi, orderRow, orderLabels, exportOrders, getOrderAttentionReasons, type OrderRecord } from '@/lib/orders-api';
import { ManualOrderDialog } from '@/components/orders/ManualOrderDialog';
import { OrderWorkspaceDetail } from '@/components/orders/OrderWorkspaceDetail';

type StatusFilter = OrderQueue;
const statusDefinitions = workQueues;
const savedViewLabels = ['Assigned to me', 'SLA at risk', 'Ready for pickup'] as const;
type ActiveQueue = (typeof savedViewLabels)[number] | 'Allocation failed' | 'Ready for pickup' | 'Pickup overdue' | 'Sync errors' | null;

function StoreIdentity({ store }: { store: string }) {
  const normalized = store.toLowerCase().replace(/[^a-z0-9]/g, '');
  const key = ({ primepos: 'pos', tiktokshop: 'tiktok' } as Record<string, string>)[normalized] || normalized;
  return <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground"><ChannelLogo channel={{key, label: store}} size="sm" />{store}</span>;
}

type OrderView = 'all' | 'fulfillment' | 'returns';

function OrderColumnHelp({column}: {column: 'FULFILLMENT TYPE' | 'STATUS'}) {
  const [open, setOpen] = useState(false);
  const fulfillment = column === 'FULFILLMENT TYPE';
  const definitions = fulfillment ? [
    ['Seller fulfilled', 'You or your warehouse pick, pack and hand over the parcel.'],
    ['Marketplace fulfilled', 'The marketplace warehouse prepares and hands over the parcel.'],
  ] : [
    ['Awaiting confirmation', 'Waiting for the order to be approved.'],
    ['Preparing', 'Items and shipping are being prepared.'],
    ['Ready to ship', 'Packed and waiting for carrier pickup.'],
    ['Shipping', 'The carrier has the parcel.'],
    ['Delivered', 'The parcel has reached the customer.'],
    ['Completed', 'Delivered and the order workflow is closed.'],
    ['Cancelled', 'The order has been cancelled.'],
  ];
  return <TooltipProvider delayDuration={150}><Tooltip open={open} onOpenChange={setOpen}>
    <TooltipTrigger asChild><button type="button" aria-label={`About ${fulfillment ? 'fulfillment type' : 'order status'}`} className="inline-flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={event => { event.preventDefault(); setOpen(true); }}><Info aria-hidden="true" className="size-3.5" /></button></TooltipTrigger>
    <TooltipContent side="bottom" align="start" className="max-h-[min(28rem,70dvh)] w-80 max-w-[calc(100vw-1.5rem)] space-y-3 overflow-y-auto whitespace-normal p-3 text-left text-xs font-normal leading-relaxed normal-case">
      <p className="font-semibold">{fulfillment ? 'Who prepares and packs the order' : 'Where the order is in its lifecycle'}</p>
      <dl className="space-y-2">{definitions.map(([term, meaning]) => <div key={term}><dt className="font-semibold">{term}</dt><dd className="text-muted-foreground">{meaning}</dd></div>)}</dl>
      <p className="border-t pt-2 text-muted-foreground">{fulfillment ? 'Using a marketplace carrier does not make an order marketplace fulfilled. It depends on who prepares the parcel.' : 'Payment warnings and return labels are shown separately from the main order status.'}</p>
    </TooltipContent>
  </Tooltip></TooltipProvider>;
}

export default function Orders() {
  const [records, setRecords] = useState<OrderRecord[]>([]);
  const orders = useMemo(() => records.map(orderRow), [records]);
  const [canWrite, setCanWrite] = useState(false);
  const [currentUserName, setCurrentUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [hasLoaded, setHasLoaded] = useState(false);
  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(null);
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer); }, []);
  const [settlementFilter, setSettlementFilter] = useState('all');
  const [notice, setNotice] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editingDraft, setEditingDraft] = useState<OrderRecord | undefined>();
  const [canonical, setCanonical] = useState('all');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('');
  const [notesFilter, setNotesFilter] = useState('');
  const [carrierFilter, setCarrierFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState('deadline');
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>(['ASSIGNEE']);
  const headers = ['ORDER', 'CUSTOMER', 'SALES CHANNEL', 'FULFILLMENT TYPE', 'STATUS', 'PROCESSING DEADLINE', 'TOTAL / PAYMENT', 'FULFILLMENT', 'ASSIGNEE'];
  const [batchOrders, setBatchOrders] = useState<OrderRecord[] | null>(null);
  const [batchAction, setBatchAction] = useState<BatchAction | undefined>();
  const [batchScope, setBatchScope] = useState<'selected' | 'filtered'>('selected');
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all');
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [detailQueue, setDetailQueue] = useState<string[]>([]);
  const [startProcessing, setStartProcessing] = useState(false);
  const [bulkWarehouse, setBulkWarehouse] = useState('');
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkPending, setBulkPending] = useState(false);
  const warehouses = useMemo(() => [...new Set(records.map((o) => o.metadata.warehouse))], [records]);
  async function refresh() { setLoading(true); setLoadError(''); try { const result = await ordersApi.list(); setRecords(result.data); setHasLoaded(true); setLastLoadedAt(new Date()); setCanWrite(result.canWrite); setCurrentUserName(result.currentUserName || ''); } catch (e) { setLoadError((e as Error).message); setCanWrite(false); } finally { setLoading(false); } }
  useEffect(() => { void refresh(); }, []);
  function updated(order: OrderRecord) { setRecords((items) => items.map((o) => o.id === order.id ? order : o)); }

  const [params, setParams] = useSearchParams();
  const workflowParam = params.get('module') === 'cos' ? 'orderView' : 'view';
  const viewParam = params.get(workflowParam);
  const view: OrderView = viewParam === 'fulfillment' || viewParam === 'returns' ? viewParam : 'all';
  const statusParam = params.get('status');
  const status: StatusFilter = statusParam === 'draft' || statusDefinitions.some(item => item.key === statusParam) ? statusParam as StatusFilter : 'all';
  const subStatus = getQueueFilters(status).some(item => item.key === params.get('orderStage')) ? params.get('orderStage')! : 'all';
  const setSubStatus = (value: string) => { const next = new URLSearchParams(params); if (value === 'all') next.delete('orderStage'); else next.set('orderStage', value); setParams(next, { replace: true }); };
  const [heldOnly,setHeldOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [channel, setChannel] = useState('all');
  const [activeView, setActiveView] = useState<ActiveQueue>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const routeParams = useParams();
  const detail = params.get('order') || routeParams.id || null;
  const setDetail = (id: string | null, process = false, keepQueue = false) => { setStartProcessing(process); if (id && !keepQueue) setDetailQueue([...new Set([...filtered.map(order => order.id), id])]); const next = new URLSearchParams(params); if (id) next.set('order', id); else next.delete('order'); setParams(next, { replace: true }); };
  const [filtersOpen, setFiltersOpen] = useState(false);
  // All counters and table rows start from the same shop/search/date/payment scope.
  const scopeOrders = useMemo(() => orders.filter(order => {
    const matchesSearch = !search || `${order.orderKey} ${order.customer} ${order.phone} ${order.store} ${order.marketplaceOrderId || ''} ${order.lines.map(line => `${line.sku} ${line.name}`).join(' ')} ${order.shipments.map(shipment => shipment.tracking).join(' ')}`.toLowerCase().includes(search.toLowerCase());
    const matchesWorkspaceView = view === 'all' || (view === 'fulfillment'
      ? ['acknowledged', 'allocated', 'fulfillment_in_progress', 'partially_shipped', 'shipped', 'delivered', 'closed'].includes(order.canonicalStatus)
      : hasReturnHistory(order));
    const matchesView = !activeView || (activeView === 'Assigned to me' ? Boolean(currentUserName) && order.assignee === currentUserName : activeView === 'SLA at risk' ? (order.slaRisk || (orderDeadline(order) !== null && orderDeadline(order)! <= now + 86400000)) : activeView === 'Sync errors' ? order.syncError : activeView === 'Ready for pickup' ? order.readyForPickup : activeView === 'Pickup overdue' ? order.pickupOverdue : order.reservation === 'Allocation failed');
    return matchesSearch && matchesWorkspaceView && matchesView
      && (paymentFilter === 'all' || order.paymentState === paymentFilter)
      && (channel === 'all' || order.store === channel)
      && (canonical === 'all' || order.canonicalStatus === canonical)
      && (settlementFilter === 'all' || order.operations?.settlement?.status === settlementFilter)
      && (warehouseFilter === 'all' || order.warehouse === warehouseFilter)
      && (carrierFilter === 'all' || order.carrier === carrierFilter)
      && (!tagFilter || order.tags.join(' ').toLowerCase().includes(tagFilter.toLowerCase()))
      && (!notesFilter || order.metadata.notes.toLowerCase().includes(notesFilter.toLowerCase()))
      && (!dateFrom || new Date(order.orderedAt) >= new Date(`${dateFrom}T00:00:00`))
      && (!dateTo || new Date(order.orderedAt) <= new Date(`${dateTo}T23:59:59.999`));
  }), [orders, search, view, activeView, currentUserName, paymentFilter, channel, canonical, settlementFilter, warehouseFilter, carrierFilter, tagFilter, notesFilter, dateFrom, dateTo, now]);
  const scoped = scopeOrders.filter(order => (!heldOnly || order.hold?.active) && matchesActionFilter(order, actionFilter, canWrite));
  const statuses = statusDefinitions.map(item => ({ ...item, count: scoped.filter(order => matchesOrderQueue(order, item.key)).length }));
  const draftCount = scoped.filter(order => order.canonicalStatus === 'draft').length;
  const stageOrders = scoped.filter(order => matchesOrderQueue(order, status));
  const subFilters = getQueueFilters(status).map(item => ({ ...item, count: stageOrders.filter(order => matchesQueueFilter(order, item.key)).length }));
  const filtered = stageOrders.filter(order => matchesQueueFilter(order, subStatus)).sort((a, b) => sort === 'deadline' ? ((orderDeadline(a) ?? Infinity) - (orderDeadline(b) ?? Infinity)) || a.orderedAt.localeCompare(b.orderedAt) : sort === 'oldest' ? a.orderedAt.localeCompare(b.orderedAt) : b.orderedAt.localeCompare(a.orderedAt));
  const currentScope = scopeOrders.filter(order => matchesOrderQueue(order, status) && matchesQueueFilter(order, subStatus));
  const holdCount = currentScope.filter(order => order.hold?.active).length;
  useEffect(() => { setPage(0); setSelected([]); }, [activeView, channel, search, paymentFilter, subStatus, heldOnly, status, view, canonical, settlementFilter, warehouseFilter, carrierFilter, tagFilter, notesFilter, dateFrom, dateTo, sort, actionFilter]);
  useEffect(() => { setPage(current => Math.min(current, Math.max(0, Math.ceil(filtered.length / 20) - 1))); }, [filtered.length]);
  const queue = (detailQueue.length ? detailQueue : filtered.map(order => order.id)).filter(id => records.some(order => order.id === id));
  const detailIndex = detail ? queue.indexOf(detail) : -1;
  const visible = filtered.slice(page * 20, (page + 1) * 20);
  const pageCopy = { title: 'Orders', description: 'Track and manage orders across your shops.', icon: ShoppingBag };
  const setWorkflowView = (nextView: OrderView) => {
    const next = new URLSearchParams(params);
    if (nextView === 'all') next.delete(workflowParam); else next.set(workflowParam, nextView);
    setActiveView(null);
    setParams(next, { replace: true });
  };
  const setLifecycleStatus = (nextStatus: StatusFilter) => {
    setCanonical('all');
    const next = new URLSearchParams(params);
    next.delete('orderStage');
    if (nextStatus === 'all') next.delete('status'); else next.set('status', nextStatus);
    setParams(next, { replace: true });
  };
  const toggleOrder = (id: string) => setSelected((value) => value.includes(id) ? value.filter((item) => item !== id) : [...value, id]);

  const setToolbarStatus = (value: string) => {
    setCanonical('all');
    const next = new URLSearchParams(params);
    next.delete('orderStage');
    if (value === 'preparing' || value === 'pickup') { next.set('status', 'ready'); next.set('orderStage', value); }
    else if (value === 'all') next.delete('status');
    else next.set('status', value);
    setParams(next, {replace: true});
  };
  const toolbarStatus = status === 'ready' && ['preparing', 'pickup'].includes(subStatus) ? subStatus : status;
  const selectedOrders = records.filter(order => selected.includes(order.id));
  const confirmCount = selectedOrders.filter(order => !batchBlocker(order, 'confirm', canWrite)).length;
  const printCount = selectedOrders.filter(order => !batchBlocker(order, 'print', canWrite)).length;
  const allPageSelected = visible.length > 0 && visible.every(order => selected.includes(order.id));
  const openBatch = (action?: BatchAction) => { setBatchScope('selected'); setBatchAction(action); setBatchOrders(selectedOrders); };
  const filteredBatchAction = actionFilter === 'confirm' || actionFilter === 'print' ? actionFilter : null;
  const openFilteredBatch = () => {
    if (!filteredBatchAction || loading || loadError || !filtered.length) return;
    const byId = new Map(records.map(order => [order.id, order]));
    setBatchScope('filtered');
    setBatchAction(filteredBatchAction);
    // Capture all matching pages now; later refreshes must not expand this batch.
    setBatchOrders(filtered.map(order => byId.get(order.id)!));
  };
  const resetDetailedFilters = () => { setPaymentFilter('all'); setHeldOnly(false); setCanonical('all'); setSettlementFilter('all'); setWarehouseFilter('all'); setCarrierFilter('all'); setDateFrom(''); setDateTo(''); setTagFilter(''); setNotesFilter(''); setActiveView(null); const next = new URLSearchParams(params); next.delete(workflowParam); setParams(next, { replace: true }); };
  const clearFilters = () => {
    setActionFilter('all'); setActiveView(null); setPaymentFilter('all'); setHeldOnly(false); setChannel('all'); setSearch(''); setCanonical('all'); setSettlementFilter('all'); setWarehouseFilter('all'); setCarrierFilter('all'); setDateFrom(''); setDateTo(''); setTagFilter(''); setNotesFilter('');
    const next = new URLSearchParams(params); next.delete(workflowParam); next.delete('orderStage'); setParams(next, { replace: true });
  };
  const filterChips = [
    search && { label: `Search: ${search}`, clear: () => setSearch('') },
    channel !== 'all' && { label: `Shop: ${channel}`, clear: () => setChannel('all') },
    actionFilter !== 'all' && { label: actionFilterLabels[actionFilter], clear: () => setActionFilter('all') },
    paymentFilter !== 'all' && { label: `Payment: ${paymentFilter}`, clear: () => setPaymentFilter('all') },
    heldOnly && { label: 'On hold', clear: () => setHeldOnly(false) },
    canonical !== 'all' && { label: `Status: ${orderLabels[canonical as keyof typeof orderLabels]}`, clear: () => setCanonical('all') },
    settlementFilter !== 'all' && { label: `Settlement: ${settlementFilter === 'settled' ? 'Received' : 'Estimated'}`, clear: () => setSettlementFilter('all') },
    warehouseFilter !== 'all' && { label: `Warehouse: ${warehouseFilter}`, clear: () => setWarehouseFilter('all') },
    carrierFilter !== 'all' && { label: `Carrier: ${carrierFilter}`, clear: () => setCarrierFilter('all') },
    dateFrom && { label: `From: ${dateFrom}`, clear: () => setDateFrom('') },
    dateTo && { label: `To: ${dateTo}`, clear: () => setDateTo('') },
    tagFilter && { label: `Tags: ${tagFilter}`, clear: () => setTagFilter('') },
    notesFilter && { label: `Notes: ${notesFilter}`, clear: () => setNotesFilter('') },
    activeView && { label: activeView === 'SLA at risk' ? 'Ship-by deadline at risk' : activeView, clear: () => setActiveView(null) },
    view !== 'all' && { label: view === 'returns' ? 'Return history' : 'Packing & shipping', clear: () => setWorkflowView('all') },
  ].filter((chip): chip is { label: string; clear: () => void } => Boolean(chip));
  const detailedCount = [canonical !== 'all', settlementFilter !== 'all', warehouseFilter !== 'all', carrierFilter !== 'all', Boolean(dateFrom), Boolean(dateTo), Boolean(tagFilter), Boolean(notesFilter), Boolean(activeView), view !== 'all', heldOnly].filter(Boolean).length;

  return <div className="min-w-0 space-y-4 p-4 pb-28 md:p-6">
    <WorkspacePageHeader title={pageCopy.title} description={pageCopy.description} icon={pageCopy.icon} className="[&>div:first-child]:pb-4" actions={<div className="flex flex-wrap items-center gap-2">
      {lastLoadedAt && <span className="mr-1 text-xs text-muted-foreground" title="Time this page last loaded orders, not the last marketplace sync">Updated {lastLoadedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>}
      <Button variant={status === 'draft' ? 'secondary' : 'outline'} aria-pressed={status === 'draft'} onClick={() => setLifecycleStatus('draft')}>Draft orders ({hasLoaded ? draftCount : '—'})</Button>
      <Button variant="outline" onClick={() => void refresh()} disabled={loading}>Refresh</Button>
      <Button disabled={!canWrite || loading} onClick={() => setCreateOpen(true)}>Create order</Button>
    </div>} />

    {loading && <p role="status">Loading orders…</p>}
    {loadError && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/40 bg-amber-500/5 p-4"><div><p className="text-sm font-semibold">{hasLoaded ? 'Could not refresh orders. Showing the last loaded data.' : 'Orders could not be loaded.'}</p><p className="mt-1 text-sm text-muted-foreground">{loadError.includes('Unknown resource') ? 'The order service needs to be updated. Retry after the service is available.' : loadError}</p></div><Button variant="outline" disabled={loading} onClick={() => void refresh()}>Retry</Button></div>}
    {notice && <p role="status" className="rounded-lg border p-3 text-sm">{notice}</p>}

    <OrderNavigation items={statuses} value={status} loaded={hasLoaded} onChange={setLifecycleStatus} />
    {status === 'draft' && <div className="flex flex-wrap items-center gap-2 text-sm"><strong>Draft orders</strong><span className="text-muted-foreground">Not submitted yet. Drafts are kept separate from All.</span><Button variant="ghost" size="sm" onClick={() => setLifecycleStatus('all')}>Back to all orders</Button></div>}
    <div role="group" aria-label="Order stage filters" className="flex flex-wrap items-center gap-2">
      {[{ key: 'all', label: 'All', count: stageOrders.length }, ...subFilters].map(item => <button key={item.key} type="button" aria-pressed={subStatus === item.key} onClick={() => setSubStatus(item.key)} className={cn('inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring', subStatus === item.key ? 'border-primary/30 bg-primary/10 font-medium text-primary' : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground')}>{item.label}{' '}<span className="text-xs tabular-nums">{hasLoaded ? item.count : '—'}</span></button>)}
    </div>
    {status === 'delivered' && <p className="text-xs text-muted-foreground">Delivered to the customer. Waiting for the order to be completed.</p>}
    {status === 'completed' && <p className="text-xs text-muted-foreground">Completed orders. Settlement is tracked separately in the payment details.</p>}

    <div className="min-w-0 space-y-3">
      <OrderToolbar search={search} onSearch={setSearch} open={filtersOpen} onOpenChange={setFiltersOpen} detailedCount={detailedCount}
        status={{label: 'Order status', active: toolbarStatus !== 'all', control: <select aria-label="Order status" className="h-11 max-w-full rounded-md border bg-background px-3 text-sm" value={toolbarStatus} onChange={event => setToolbarStatus(event.target.value)}><option value="all">All order statuses</option><option value="pending">Awaiting confirmation</option><option value="ready">To ship · All stages</option><option value="preparing">Preparing</option><option value="pickup">Ready to ship</option><option value="shipping">Shipping</option><option value="delivered">Delivered</option><option value="completed">Completed</option><option value="returns">Returns &amp; refunds</option><option value="cancelled">Cancelled</option><option value="draft">Draft orders</option></select>}}
        shop={{label: 'Shop', active: channel !== 'all', control: <select aria-label="Filter by shop" className="h-11 max-w-full rounded-md border bg-background px-3 text-sm" value={channel} onChange={event => setChannel(event.target.value)}><option value="all">All shops</option>{[...new Set(orders.map(order => order.store))].map(store => <option key={store}>{store}</option>)}</select>}}
        payment={{label: 'Payment', active: paymentFilter !== 'all', control: <select aria-label="Payment status" className="h-11 max-w-full rounded-md border bg-background px-3 text-sm" value={paymentFilter} onChange={event => setPaymentFilter(event.target.value)}><option value="all">All payments</option>{[...new Set(['Unpaid', 'Paid', 'Refunded', ...orders.map(order => order.paymentState)])].map(state => <option key={state}>{state}</option>)}</select>}}
        action={{label: 'Available actions', active: actionFilter !== 'all', control: <select aria-label="Available actions" className="h-11 max-w-full rounded-md border bg-background px-3 text-sm" value={actionFilter} onChange={event => setActionFilter(event.target.value as ActionFilter)}>{Object.entries(actionFilterLabels).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select>}}
        tools={<DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" className="size-11 shrink-0 p-0" aria-label="Order table tools" title="Table tools"><Ellipsis aria-hidden="true" className="size-4"/></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-60">
          <DropdownMenuItem className="min-h-10" onSelect={() => setColumnsOpen(true)}>Columns</DropdownMenuItem>
          <DropdownMenuItem className="min-h-10" disabled={!filtered.length} onSelect={() => exportOrders(records.filter(order => filtered.some(row => row.id === order.id)))}><Download aria-hidden="true" className="mr-2 size-4"/>Export orders</DropdownMenuItem>
          <DropdownMenuSeparator/><DropdownMenuLabel>Sort orders</DropdownMenuLabel><DropdownMenuRadioGroup value={sort} onValueChange={setSort}><DropdownMenuRadioItem className="min-h-10" value="deadline">Ship-by deadline first</DropdownMenuRadioItem><DropdownMenuRadioItem className="min-h-10" value="newest">Newest first</DropdownMenuRadioItem><DropdownMenuRadioItem className="min-h-10" value="oldest">Oldest first</DropdownMenuRadioItem></DropdownMenuRadioGroup>
        </DropdownMenuContent></DropdownMenu>}
        advancedFilters={<div className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="grid gap-1 text-sm">Warehouse / Branch<select className="h-10 rounded-md border bg-background px-2" value={warehouseFilter} onChange={event => setWarehouseFilter(event.target.value)}><option value="all">All warehouses</option>{warehouses.map(warehouse => <option key={warehouse}>{warehouse}</option>)}</select></label>
            <label className="grid gap-1 text-sm">Carrier<select className="h-10 rounded-md border bg-background px-2" value={carrierFilter} onChange={event => setCarrierFilter(event.target.value)}><option value="all">All carriers</option>{[...new Set(orders.map(order => order.carrier))].map(carrier => <option key={carrier}>{carrier}</option>)}</select></label>
            <label className="grid gap-1 text-sm">From date<Input type="date" value={dateFrom} max={dateTo || undefined} onChange={event => setDateFrom(event.target.value)} /></label>
            <label className="grid gap-1 text-sm">To date<Input type="date" min={dateFrom || undefined} value={dateTo} onChange={event => setDateTo(event.target.value)} /></label>
          </div>
          <div className="border-t pt-4"><p className="mb-3 text-sm font-medium">More conditions</p><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="grid gap-1 text-sm">Order view<select aria-label="Select operational view" className="h-10 rounded-md border bg-background px-2" value={view !== 'all' ? `workflow:${view}` : activeView ? `saved:${activeView}` : 'all'} onChange={event => { const value = event.target.value; if (value === 'all') { setWorkflowView('all'); return; } if (value.startsWith('workflow:')) { setWorkflowView(value.slice(9) as OrderView); return; } setWorkflowView('all'); setActiveView(value.slice(6) as ActiveQueue); }}><option value="all">All orders</option><option value="workflow:fulfillment">Packing & shipping</option><option value="workflow:returns">Return history</option>{savedViewLabels.map(label => <option key={label} value={`saved:${label}`}>{label === 'SLA at risk' ? 'Ship-by deadline at risk' : label}</option>)}</select></label>
            <label className="grid gap-1 text-sm">Detailed status<select aria-label="Exact order status" className="h-10 rounded-md border bg-background px-2" value={canonical} onChange={event => { setLifecycleStatus(event.target.value === 'draft' ? 'draft' : 'all'); setCanonical(event.target.value); }}><option value="all">All order statuses</option>{Object.entries(orderLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
            <label className="grid gap-1 text-sm">Settlement<select className="h-10 rounded-md border bg-background px-2" value={settlementFilter} onChange={event => setSettlementFilter(event.target.value)}><option value="all">All settlements</option><option value="estimated">Estimated</option><option value="settled">Received</option></select></label>
            <label className="grid gap-1 text-sm">Customer tags<Input value={tagFilter} onChange={event => setTagFilter(event.target.value)} /></label>
            <label className="grid gap-1 text-sm">Internal notes<Input value={notesFilter} onChange={event => setNotesFilter(event.target.value)} /></label>
            <label className="flex min-h-11 items-center gap-2 text-sm"><Checkbox checked={heldOnly} onCheckedChange={checked => setHeldOnly(checked === true)} />On hold only</label>
          </div></div>
          <Button variant="outline" onClick={resetDetailedFilters}>Reset detailed filters</Button>
        </div>}/>
      {(holdCount > 0 || heldOnly) && <div className="flex flex-wrap items-center gap-2" aria-label="Orders on hold">
        <Button size="sm" variant={heldOnly ? 'secondary' : 'outline'} aria-pressed={heldOnly} onClick={() => setHeldOnly(value => !value)}>On hold ({holdCount})</Button>
      </div>}
      {filterChips.length > 0 && <div className="flex flex-wrap items-center gap-2" aria-label="Active order filters">
        {filterChips.map(chip => <button key={chip.label} type="button" aria-label={`Remove ${chip.label} filter`} onClick={chip.clear} className="inline-flex min-h-9 max-w-full items-center gap-2 rounded-md border bg-muted/40 px-2.5 text-xs hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"><span className="truncate">{chip.label}</span><X aria-hidden="true" className="size-3 shrink-0" /></button>)}
        <Button size="sm" variant="ghost" onClick={clearFilters}>Clear filters</Button>
      </div>}
      {filteredBatchAction && hasLoaded && selected.length === 0 && <section aria-label="Process matching orders" className="flex flex-col gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0"><p className="text-sm font-medium" role="status">{filtered.length} orders ready to {filteredBatchAction === 'print' ? 'print' : 'confirm'}</p><p className="mt-0.5 text-xs text-muted-foreground">All matching orders across all pages. Review before processing.</p></div>
        <Button className="shrink-0" disabled={loading || !!loadError || !filtered.length} onClick={openFilteredBatch}>{filteredBatchAction === 'print' ? `Print all ${filtered.length} orders` : `Review & confirm ${filtered.length} orders`}</Button>
      </section>}
        {selected.length > 0 && <div className="flex flex-wrap items-center gap-2 text-sm" aria-label="Order selection"><span>{selected.length} orders selected.</span>{filtered.length > visible.length && selected.length < filtered.length && <Button size="sm" variant="link" onClick={() => setSelected(filtered.map(order => order.id))}>Select all {filtered.length} matching orders</Button>}<Button size="sm" variant="ghost" onClick={() => setSelected([])}>Clear selection</Button></div>}
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="max-h-[65vh] overflow-auto">
            <table aria-label="Orders" className="w-full min-w-[1080px] text-left text-sm">
              <thead className="sticky top-0 z-10 border-b bg-card"><tr>
                <th scope="col" className="w-10 px-3 py-3"><Checkbox checked={allPageSelected ? true : visible.some(order => selected.includes(order.id)) ? "indeterminate" : false} onCheckedChange={() => setSelected(ids => allPageSelected ? ids.filter(id => !visible.some(order => order.id === id)) : [...new Set([...ids, ...visible.map(order => order.id)])])} aria-label="Select orders on this page" /></th>
                {headers.map((header) => <th scope="col" key={header} hidden={hiddenColumns.includes(header)} className={cn('whitespace-nowrap px-3 py-3 text-xs font-medium text-muted-foreground', header === 'TOTAL / PAYMENT' && 'text-right')}><span className="inline-flex items-center gap-1">{header === 'FULFILLMENT' ? 'FULFILLMENT / DELIVERY' : header === 'STATUS' ? 'ORDER STATUS' : header === 'PROCESSING DEADLINE' ? 'SHIP BY' : header}{(header === 'FULFILLMENT TYPE' || header === 'STATUS') && <OrderColumnHelp column={header}/>}</span></th>)}<th scope="col" className="px-3 py-3 text-xs font-medium text-muted-foreground">NEXT ACTION</th>
              </tr></thead>
              <tbody className="divide-y divide-border">{visible.map((order) => {
                const reasons = getOrderAttentionReasons(order);
                const deadline = orderDeadline(order);
                const overdue = deadline !== null ? deadline < Date.now() : /breached|overdue/i.test(order.sla);
                const nextAction = orderNextAction(order);
                const shipment = order.shipments[0];
                return <tr key={order.id} onClick={() => setDetail(order.id)} className="cursor-pointer align-top transition-colors hover:bg-muted/50 focus-within:bg-muted/50">
                  <td className="px-3 py-4" onClick={(event) => event.stopPropagation()}><Checkbox checked={selected.includes(order.id)} onCheckedChange={() => toggleOrder(order.id)} aria-label={`Select ${order.id}`} /></td>
                  <td hidden={hiddenColumns.includes('ORDER')} className="min-w-[205px] px-3 py-3">
                    <button type="button" onClick={() => setDetail(order.id)} className="min-h-7 whitespace-nowrap font-semibold text-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:outline focus-visible:outline-primary">{order.orderKey}</button>
                    <p className="text-xs text-muted-foreground">{new Date(order.orderedAt).toLocaleString('en-GB', {day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}{order.source === 'demo' && <span className="ml-2">· Sample</span>}</p>
                  </td>
                  <td hidden={hiddenColumns.includes('CUSTOMER')} className="min-w-[170px] px-3 py-3"><p className="font-medium leading-7">{order.customer}</p><p className="text-xs text-muted-foreground">{order.phone || 'Phone not provided'}</p></td>
                  <td hidden={hiddenColumns.includes('SALES CHANNEL')} className="min-w-[120px] px-3 py-4"><StoreIdentity store={order.store} /></td>
                  <td hidden={hiddenColumns.includes('FULFILLMENT TYPE')} className="min-w-[155px] px-3 py-3"><HandlingTypeBadge order={order} /></td>
                  <td hidden={hiddenColumns.includes('STATUS')} className="min-w-[165px] px-3 py-3"><OrderLifecycleBadge status={order.status} />{order.canonicalStatus === 'partially_shipped' && <p className="mt-1 text-xs text-muted-foreground">Partially shipped</p>}{reasons.length > 0 && <p className="mt-1 max-w-52 text-xs leading-5 text-amber-700 dark:text-amber-300">{reasons.join(' · ')}</p>}{order.shipments.some(shipment=>shipment.deliveryOutcome==='failed') && <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">Failed delivery · Awaiting retry</p>}{order.returnRequests.length > 0 && <p className="mt-1 text-xs text-violet-700 dark:text-violet-300">Return · {order.returnRequests[order.returnRequests.length - 1].status}</p>}</td>
                  <td hidden={hiddenColumns.includes('PROCESSING DEADLINE')} className="min-w-[135px] px-3 py-4"><span className={cn('text-xs', overdue ? 'text-rose-700 dark:text-rose-300' : deadline !== null && deadline < Date.now() + 86400000 ? 'text-amber-700 dark:text-amber-300' : 'text-muted-foreground')}>{deadlineLabel(order)}</span></td>
                  <td hidden={hiddenColumns.includes('TOTAL / PAYMENT')} className="min-w-[135px] px-3 py-3 text-right"><p className="whitespace-nowrap font-semibold leading-7 tabular-nums">{order.total}</p><p className={cn('text-xs', order.paymentState === 'Paid' ? 'text-emerald-700 dark:text-emerald-400' : order.paymentState === 'Refunded' ? 'text-violet-700 dark:text-violet-300' : 'text-muted-foreground')}>{order.paymentState}</p></td>
                  <td hidden={hiddenColumns.includes('FULFILLMENT')} className="min-w-[195px] max-w-64 px-3 py-3">
                    <p className="leading-7">{shipment ? shipment.carrier : order.warehouse}</p>
                    <p className="break-words text-xs text-muted-foreground">{shipment ? shipment.tracking : order.canonicalStatus === 'canceled' ? 'Fulfillment stopped' : order.reservation === 'Not reserved' ? (order.canonicalStatus === 'draft' ? 'Not submitted' : order.source === 'manual' ? 'Not reserved · Check physical stock' : 'Awaiting stock allocation') : order.reservation}</p>
                    {order.shipments.length > 1 && <p className="mt-1 text-xs text-muted-foreground">+{order.shipments.length - 1} more shipment(s)</p>}
                  </td>
                  <td hidden={hiddenColumns.includes('ASSIGNEE')} className="px-3 py-4">{order.assignee}</td>
                  <td className="px-3 py-3" onClick={event => event.stopPropagation()}><Button size="sm" variant="outline" onClick={() => setDetail(order.id, Boolean(canWrite && nextAction && !nextAction.blocker))}>{canWrite && nextAction && !nextAction.blocker ? nextAction.label : nextAction?.blocker && order.source !== 'demo' ? 'Review issue' : 'View order'}</Button></td>
                </tr>;
              })}</tbody>
            </table>
          </div>{hasLoaded && !loading && !loadError && filtered.length === 0 ? <div className="grid min-h-48 place-items-center border-t border-border p-6 text-center"><div><Search className="mx-auto size-5 text-muted-foreground" /><p className="mt-2 text-sm font-semibold text-foreground">{records.length ? 'No matching orders' : 'No orders yet'}</p><p className="mt-1 text-xs text-muted-foreground">{records.length ? 'Adjust the active view, status, or search query.' : 'Create your first order to get started.'}</p></div></div> : null}</div>
    </div>

    {hasLoaded && <div className="flex items-center justify-between text-sm"><span>{filtered.length} orders · Page {page + 1} of {Math.max(1, Math.ceil(filtered.length / 20))}</span><div className="flex gap-2"><Button variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button><Button variant="outline" disabled={(page + 1) * 20 >= filtered.length} onClick={() => setPage(page + 1)}>Next</Button></div></div>}
    {selected.length > 0 && <div aria-label="Bulk order actions" className="sticky bottom-4 z-40 flex min-w-0 items-center gap-2 rounded-xl border bg-background p-3 shadow-xl">
      <span className="mr-auto hidden text-sm sm:block">{selected.length} orders selected</span>
      <Button aria-label={`Confirm orders (${confirmCount})`} className="min-w-0 flex-1 sm:flex-none" disabled={!confirmCount || loading} onClick={() => openBatch('confirm')}><span className="sm:hidden">Confirm ({confirmCount})</span><span className="hidden sm:inline">Confirm orders ({confirmCount})</span></Button>
      <Button aria-label={`Print packing slips (${printCount})`} className="min-w-0 flex-1 sm:flex-none" variant="outline" disabled={!printCount || loading} onClick={() => openBatch('print')}><span className="sm:hidden">Print ({printCount})</span><span className="hidden sm:inline">Print packing slips ({printCount})</span></Button>
      <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" className="shrink-0" aria-label="More bulk actions"><Ellipsis className="size-4" aria-hidden="true"/><span className="hidden sm:inline">More</span></Button></DropdownMenuTrigger><DropdownMenuContent align="end">
        <DropdownMenuItem disabled={loading || !selectedOrders.some(order => order.source === 'demo' || canWrite)} onSelect={() => openBatch()}>More processing</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setLabelsOpen(true)}>Shipping labels</DropdownMenuItem>
        {selectedOrders.some(order => ['partially_shipped', 'shipped', 'delivered', 'closed'].includes(order.canonicalStatus)) && <DropdownMenuItem disabled={selectedOrders.some(order => !order.lines.length || order.hold?.active || !['partially_shipped', 'shipped', 'delivered', 'closed'].includes(order.canonicalStatus))} onSelect={() => { try { printPackingSlips(selectedOrders); } catch(e) { setNotice((e as Error).message); } }}>Reprint packing slips</DropdownMenuItem>}
        <DropdownMenuItem disabled={!canWrite || selectedOrders.some(order => order.source === 'demo' || !['draft', 'created', 'acknowledged'].includes(order.canonicalStatus))} onSelect={() => setBulkOpen(true)}>Reassign warehouse</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => exportOrders(selectedOrders)}>Export selected</DropdownMenuItem>
      </DropdownMenuContent></DropdownMenu>
    </div>}

    {!createOpen && detail && records.find((o) => o.id === detail) && <OrderWorkspaceDetail key={detail} order={records.find((o) => o.id === detail)!} canWrite={canWrite} onClose={() => setDetail(null)} startProcessing={startProcessing} positionLabel={detailIndex >= 0 ? `Order ${detailIndex + 1} of ${queue.length}` : undefined} onPrevious={detailIndex > 0 ? () => setDetail(queue[detailIndex - 1], false, true) : undefined} onNext={detailIndex >= 0 && detailIndex < queue.length - 1 ? () => setDetail(queue[detailIndex + 1], false, true) : undefined} onUpdated={updated} onEditDraft={() => { setEditingDraft(records.find((o) => o.id === detail)); setCreateOpen(true); }} />}
    {createOpen && <ManualOrderDialog initialOrder={editingDraft} warehouses={warehouses} onClose={() => { setCreateOpen(false); setEditingDraft(undefined); }} onCreated={(order) => { setRecords((items) => [order, ...items.filter((o) => o.id !== order.id)]); setCreateOpen(false); setEditingDraft(undefined); setDetail(order.id); setNotice(`Order ${order.orderKey} saved.`); }} />}

    {batchOrders && <OrderBatchDialog orders={batchOrders} canWrite={canWrite} initialAction={batchAction} scope={batchScope} onClose={() => { setBatchOrders(null); setSelected([]); }} onUpdated={updated} />}
    {columnsOpen && <Sheet open onOpenChange={setColumnsOpen}><SheetContent><SheetHeader><SheetTitle>Visible columns</SheetTitle><SheetDescription>Choose the information shown in the orders table.</SheetDescription></SheetHeader><div className="mt-4 grid gap-1">{headers.map(header => <label key={header} className="flex min-h-11 items-center gap-2 text-sm"><Checkbox checked={!hiddenColumns.includes(header)} disabled={header === 'ORDER'} onCheckedChange={checked => setHiddenColumns(columns => checked ? columns.filter(column => column !== header) : [...columns, header])}/>{header === 'STATUS' ? 'ORDER STATUS' : header === 'PROCESSING DEADLINE' ? 'SHIP BY' : header === 'FULFILLMENT' ? 'FULFILLMENT / DELIVERY' : header}</label>)}</div><Button className="mt-4" variant="outline" onClick={() => setColumnsOpen(false)}>Done</Button></SheetContent></Sheet>}
    {labelsOpen && <Dialog open onOpenChange={setLabelsOpen}><DialogContent><DialogHeader><DialogTitle>Carrier shipping labels</DialogTitle><DialogDescription>Open the original carrier documents to print. Opening a label does not confirm it was printed or attached.</DialogDescription></DialogHeader><ul className="max-h-[60vh] divide-y overflow-auto">{records.filter(order => selected.includes(order.id)).map(order => <li key={order.id} className="py-3 text-sm"><p className="font-medium">{order.orderKey}</p>{order.shipments.some(shipment => shipment.labelUrl?.startsWith('https://')) ? order.shipments.filter(shipment => shipment.labelUrl?.startsWith('https://')).map((shipment, index) => <a key={index} className="mt-1 flex min-h-10 items-center text-primary underline" href={shipment.labelUrl} target="_blank" rel="noopener noreferrer">Open label · {shipment.tracking}</a>) : <p className="text-muted-foreground">No carrier label link. Add the shipment or use the original document supplied by your carrier.</p>}</li>)}</ul></DialogContent></Dialog>}
    {bulkOpen && <Sheet open onOpenChange={(v) => !v && !bulkPending && setBulkOpen(false)}><SheetContent><SheetHeader><SheetTitle>Reassign preferred warehouse</SheetTitle><SheetDescription>Update warehouse preference. Inventory reservations are managed by fulfillment.</SheetDescription></SheetHeader><form className="mt-6 space-y-4" onSubmit={async (event) => { event.preventDefault(); setBulkPending(true); const failures: string[] = []; for (const order of records.filter((o) => selected.includes(o.id))) { try { const r = await ordersApi.command(order, { action: 'warehouse', warehouse: bulkWarehouse }); updated(r.data); } catch(e) { failures.push(`${order.orderKey}: ${(e as Error).message}`); } } setNotice(failures.length ? failures.join('; ') : 'Warehouse preferences updated.'); setBulkPending(false); setBulkOpen(false); }}><label className="grid gap-2">Warehouse<Input required value={bulkWarehouse} onChange={(e) => setBulkWarehouse(e.target.value)} /></label><Button disabled={bulkPending}>{bulkPending ? 'Updating…' : 'Apply to selected'}</Button></form></SheetContent></Sheet>}

  </div>;
}
