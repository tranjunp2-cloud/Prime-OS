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
  Filter,
  Search,
  ShoppingBag,
  X,
} from 'lucide-react';
import { useSearchParams, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
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
  const [hiddenColumns, setHiddenColumns] = useState<string[]>(['ASSIGNEE']);
  const headers = ['ORDER', 'CUSTOMER', 'SALES CHANNEL', 'FULFILLMENT TYPE', 'STATUS', 'PROCESSING DEADLINE', 'TOTAL / PAYMENT', 'FULFILLMENT', 'ASSIGNEE'];
  const [batchOrders, setBatchOrders] = useState<OrderRecord[] | null>(null);
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
  const scoped = scopeOrders.filter(order => !heldOnly || order.hold?.active);
  const statuses = statusDefinitions.map(item => ({ ...item, count: scoped.filter(order => matchesOrderQueue(order, item.key)).length }));
  const draftCount = scoped.filter(order => order.canonicalStatus === 'draft').length;
  const stageOrders = scoped.filter(order => matchesOrderQueue(order, status));
  const subFilters = getQueueFilters(status).map(item => ({ ...item, count: stageOrders.filter(order => matchesQueueFilter(order, item.key)).length }));
  const filtered = stageOrders.filter(order => matchesQueueFilter(order, subStatus)).sort((a, b) => sort === 'deadline' ? ((orderDeadline(a) ?? Infinity) - (orderDeadline(b) ?? Infinity)) || a.orderedAt.localeCompare(b.orderedAt) : sort === 'oldest' ? a.orderedAt.localeCompare(b.orderedAt) : b.orderedAt.localeCompare(a.orderedAt));
  const currentScope = scopeOrders.filter(order => matchesOrderQueue(order, status) && matchesQueueFilter(order, subStatus));
  const holdCount = currentScope.filter(order => order.hold?.active).length;
  useEffect(() => { setPage(0); setSelected([]); }, [activeView, channel, search, paymentFilter, subStatus, heldOnly, status, view, canonical, settlementFilter, warehouseFilter, carrierFilter, tagFilter, notesFilter, dateFrom, dateTo, sort]);
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

  const resetDetailedFilters = () => { setHeldOnly(false); setCanonical('all'); setSettlementFilter('all'); setWarehouseFilter('all'); setCarrierFilter('all'); setDateFrom(''); setDateTo(''); setTagFilter(''); setNotesFilter(''); setActiveView(null); const next = new URLSearchParams(params); next.delete(workflowParam); setParams(next, { replace: true }); };
  const clearFilters = () => {
    setActiveView(null); setPaymentFilter('all'); setHeldOnly(false); setChannel('all'); setSearch(''); setCanonical('all'); setSettlementFilter('all'); setWarehouseFilter('all'); setCarrierFilter('all'); setDateFrom(''); setDateTo(''); setTagFilter(''); setNotesFilter('');
    const next = new URLSearchParams(params); next.delete(workflowParam); next.delete('orderStage'); setParams(next, { replace: true });
  };
  const filterChips = [
    search && { label: `Search: ${search}`, clear: () => setSearch('') },
    channel !== 'all' && { label: `Shop: ${channel}`, clear: () => setChannel('all') },
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
      <Button variant={status === 'draft' ? 'secondary' : 'outline'} aria-pressed={status === 'draft'} onClick={() => setLifecycleStatus('draft')}>Drafts ({hasLoaded ? draftCount : '—'})</Button>
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
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3" aria-label="Order tools">
        <div className="relative min-w-48 flex-1 basis-full sm:basis-0"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" /><Input aria-label="Search orders" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search order, customer or tracking…" className="h-10 pl-9" /></div>
        <select aria-label="Filter by shop" className="h-10 max-w-full rounded-md border bg-background px-3 text-sm" value={channel} onChange={event => setChannel(event.target.value)}><option value="all">All shops</option>{[...new Set(orders.map(order => order.store))].map(store => <option key={store}>{store}</option>)}</select>
        <select aria-label="Payment status" className="h-10 max-w-full rounded-md border bg-background px-3 text-sm" value={paymentFilter} onChange={event => setPaymentFilter(event.target.value)}><option value="all">All payments</option>{[...new Set(['Unpaid', 'Paid', 'Refunded', ...orders.map(order => order.paymentState)])].map(state => <option key={state}>{state}</option>)}</select>
        <Button variant="outline" onClick={() => setFiltersOpen(open => !open)} aria-expanded={filtersOpen} className="h-10"><Filter className="size-4" />Filters{detailedCount > 0 && <span className="text-xs tabular-nums">({detailedCount})</span>}</Button>
        <Popover><PopoverTrigger asChild><Button variant="outline" className="h-10">Columns</Button></PopoverTrigger><PopoverContent align="end" className="w-64"><p className="text-sm font-semibold">Visible columns</p><div className="mt-2 grid gap-1">{headers.map(header => <label key={header} className="flex min-h-10 items-center gap-2"><Checkbox checked={!hiddenColumns.includes(header)} disabled={header === 'ORDER'} onCheckedChange={checked => setHiddenColumns(columns => checked ? columns.filter(column => column !== header) : [...columns, header])} />{header}</label>)}</div></PopoverContent></Popover>
        <Button variant="outline" className="h-10" disabled={!filtered.length} onClick={() => exportOrders(records.filter(order => filtered.some(row => row.id === order.id)))}><Download className="size-4" />Export</Button>
      </div>
      {(holdCount > 0 || heldOnly) && <div className="flex flex-wrap items-center gap-2" aria-label="Orders on hold">
        <Button size="sm" variant={heldOnly ? 'secondary' : 'outline'} aria-pressed={heldOnly} onClick={() => setHeldOnly(value => !value)}>On hold ({holdCount})</Button>
      </div>}
      {filtersOpen && <section aria-label="More order filters" className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Filters</h2><Button variant="ghost" size="sm" onClick={() => setFiltersOpen(false)}>Done</Button></div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="grid gap-1 text-sm">Detailed status<select aria-label="Exact order status" className="h-10 rounded-md border bg-background px-2" value={canonical} onChange={event => { setLifecycleStatus(event.target.value === 'draft' ? 'draft' : 'all'); setCanonical(event.target.value); }}><option value="all">All order statuses</option>{Object.entries(orderLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label className="grid gap-1 text-sm">Order view<select aria-label="Select operational view" className="h-10 rounded-md border bg-background px-2" value={view !== 'all' ? `workflow:${view}` : activeView ? `saved:${activeView}` : 'all'} onChange={event => { const value = event.target.value; if (value === 'all') { setWorkflowView('all'); return; } if (value.startsWith('workflow:')) { setWorkflowView(value.slice(9) as OrderView); return; } setWorkflowView('all'); setActiveView(value.slice(6) as ActiveQueue); }}><option value="all">All orders</option><option value="workflow:fulfillment">Packing & shipping</option><option value="workflow:returns">Return history</option>{savedViewLabels.map(label => <option key={label} value={`saved:${label}`}>{label === 'SLA at risk' ? 'Ship-by deadline at risk' : label}</option>)}</select></label>
          <label className="grid gap-1 text-sm">Warehouse / Branch<select className="h-10 rounded-md border bg-background px-2" value={warehouseFilter} onChange={event => setWarehouseFilter(event.target.value)}><option value="all">All warehouses</option>{warehouses.map(warehouse => <option key={warehouse}>{warehouse}</option>)}</select></label>
          <label className="grid gap-1 text-sm">Carrier<select className="h-10 rounded-md border bg-background px-2" value={carrierFilter} onChange={event => setCarrierFilter(event.target.value)}><option value="all">All carriers</option>{[...new Set(orders.map(order => order.carrier))].map(carrier => <option key={carrier}>{carrier}</option>)}</select></label>
          <label className="grid gap-1 text-sm">Settlement<select className="h-10 rounded-md border bg-background px-2" value={settlementFilter} onChange={event => setSettlementFilter(event.target.value)}><option value="all">All settlements</option><option value="estimated">Estimated</option><option value="settled">Received</option></select></label>
          <label className="grid gap-1 text-sm">Sort<select className="h-10 rounded-md border bg-background px-2" value={sort} onChange={event => setSort(event.target.value)}><option value="deadline">Ship-by deadline first</option><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label>
          <label className="grid gap-1 text-sm">From date<Input type="date" value={dateFrom} max={dateTo || undefined} onChange={event => setDateFrom(event.target.value)} /></label>
          <label className="grid gap-1 text-sm">To date<Input type="date" min={dateFrom || undefined} value={dateTo} onChange={event => setDateTo(event.target.value)} /></label>
          <label className="grid gap-1 text-sm">Customer tags<Input value={tagFilter} onChange={event => setTagFilter(event.target.value)} /></label>
          <label className="grid gap-1 text-sm">Internal notes<Input value={notesFilter} onChange={event => setNotesFilter(event.target.value)} /></label>
          <label className="flex min-h-11 items-center gap-2 text-sm"><Checkbox checked={heldOnly} onCheckedChange={checked => setHeldOnly(checked === true)} />On hold only</label>
          <Button variant="outline" onClick={resetDetailedFilters}>Reset detailed filters</Button>
        </div>
      </section>}
      {filterChips.length > 0 && <div className="flex flex-wrap items-center gap-2" aria-label="Active order filters">
        {filterChips.map(chip => <button key={chip.label} type="button" aria-label={`Remove ${chip.label} filter`} onClick={chip.clear} className="inline-flex min-h-9 max-w-full items-center gap-2 rounded-md border bg-muted/40 px-2.5 text-xs hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"><span className="truncate">{chip.label}</span><X aria-hidden="true" className="size-3 shrink-0" /></button>)}
        <Button size="sm" variant="ghost" onClick={clearFilters}>Clear filters</Button>
      </div>}
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="max-h-[65vh] overflow-auto">
            <table aria-label="Orders" className="w-full min-w-[1080px] text-left text-sm">
              <thead className="sticky top-0 z-10 border-b bg-card"><tr>
                <th scope="col" className="w-10 px-3 py-3"><Checkbox checked={selected.length === filtered.length && filtered.length > 0} onCheckedChange={() => setSelected(selected.length === filtered.length ? [] : filtered.map((item) => item.id))} aria-label="Select all orders" /></th>
                {headers.map((header) => <th scope="col" key={header} hidden={hiddenColumns.includes(header)} className={cn('whitespace-nowrap px-3 py-3 text-xs font-medium text-muted-foreground', header === 'TOTAL / PAYMENT' && 'text-right')}>{header === 'FULFILLMENT' ? 'FULFILLMENT / DELIVERY' : header === 'STATUS' ? 'ORDER STATUS' : header === 'PROCESSING DEADLINE' ? 'SHIP BY' : header}</th>)}<th scope="col" className="px-3 py-3 text-xs font-medium text-muted-foreground">NEXT ACTION</th>
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
    {selected.length > 0 && <div className="sticky bottom-4 z-40 flex flex-wrap items-center gap-2 rounded-xl border bg-background p-3 shadow-xl"><span className="mr-auto text-sm">{selected.length} orders selected</span><Button disabled={!canWrite} onClick={() => setBatchOrders(records.filter(order => selected.includes(order.id)))}>Process selected</Button><Button variant="outline" onClick={() => setLabelsOpen(true)}>Shipping labels</Button><Button variant="outline" disabled={records.some((o) => selected.includes(o.id) && !o.lines.length)} onClick={() => { try { printPackingSlips(records.filter((o) => selected.includes(o.id))); } catch(e) { setNotice((e as Error).message); } }}>Print Packing Slips</Button><Button variant="outline" disabled={!canWrite || records.some((o) => selected.includes(o.id) && (o.source === 'demo' || !['draft', 'created', 'acknowledged'].includes(o.canonicalStatus)))} onClick={() => setBulkOpen(true)}>Reassign Warehouse</Button><Button variant="outline" onClick={() => exportOrders(records.filter((o) => selected.includes(o.id)))}>Export Selected</Button></div>}
    {!createOpen && detail && records.find((o) => o.id === detail) && <OrderWorkspaceDetail key={detail} order={records.find((o) => o.id === detail)!} canWrite={canWrite} onClose={() => setDetail(null)} startProcessing={startProcessing} positionLabel={detailIndex >= 0 ? `Order ${detailIndex + 1} of ${queue.length}` : undefined} onPrevious={detailIndex > 0 ? () => setDetail(queue[detailIndex - 1], false, true) : undefined} onNext={detailIndex >= 0 && detailIndex < queue.length - 1 ? () => setDetail(queue[detailIndex + 1], false, true) : undefined} onUpdated={updated} onEditDraft={() => { setEditingDraft(records.find((o) => o.id === detail)); setCreateOpen(true); }} />}
    {createOpen && <ManualOrderDialog initialOrder={editingDraft} warehouses={warehouses} onClose={() => { setCreateOpen(false); setEditingDraft(undefined); }} onCreated={(order) => { setRecords((items) => [order, ...items.filter((o) => o.id !== order.id)]); setCreateOpen(false); setEditingDraft(undefined); setDetail(order.id); setNotice(`Order ${order.orderKey} saved.`); }} />}

    {batchOrders && <OrderBatchDialog orders={batchOrders} onClose={() => setBatchOrders(null)} onUpdated={updated} />}
    {labelsOpen && <Dialog open onOpenChange={setLabelsOpen}><DialogContent><DialogHeader><DialogTitle>Carrier shipping labels</DialogTitle><DialogDescription>Open the original carrier documents to print. Opening a label does not confirm it was printed or attached.</DialogDescription></DialogHeader><ul className="max-h-[60vh] divide-y overflow-auto">{records.filter(order => selected.includes(order.id)).map(order => <li key={order.id} className="py-3 text-sm"><p className="font-medium">{order.orderKey}</p>{order.shipments.some(shipment => shipment.labelUrl?.startsWith('https://')) ? order.shipments.filter(shipment => shipment.labelUrl?.startsWith('https://')).map((shipment, index) => <a key={index} className="mt-1 flex min-h-10 items-center text-primary underline" href={shipment.labelUrl} target="_blank" rel="noopener noreferrer">Open label · {shipment.tracking}</a>) : <p className="text-muted-foreground">No carrier label link. Add the shipment or use the original document supplied by your carrier.</p>}</li>)}</ul></DialogContent></Dialog>}
    {bulkOpen && <Sheet open onOpenChange={(v) => !v && !bulkPending && setBulkOpen(false)}><SheetContent><SheetHeader><SheetTitle>Reassign preferred warehouse</SheetTitle><SheetDescription>Update warehouse preference. Inventory reservations are managed by fulfillment.</SheetDescription></SheetHeader><form className="mt-6 space-y-4" onSubmit={async (event) => { event.preventDefault(); setBulkPending(true); const failures: string[] = []; for (const order of records.filter((o) => selected.includes(o.id))) { try { const r = await ordersApi.command(order, { action: 'warehouse', warehouse: bulkWarehouse }); updated(r.data); } catch(e) { failures.push(`${order.orderKey}: ${(e as Error).message}`); } } setNotice(failures.length ? failures.join('; ') : 'Warehouse preferences updated.'); setBulkPending(false); setBulkOpen(false); }}><label className="grid gap-2">Warehouse<Input required value={bulkWarehouse} onChange={(e) => setBulkWarehouse(e.target.value)} /></label><Button disabled={bulkPending}>{bulkPending ? 'Updating…' : 'Apply to selected'}</Button></form></SheetContent></Sheet>}

  </div>;
}
