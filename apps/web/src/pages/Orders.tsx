import { workQueues, orderQueue, queueFilters, matchesQueueFilter, type OrderQueue } from '@/lib/order-work-queues';
import { ChannelLogo } from '@/components/channels/ChannelLogo';
import { HandlingTypeBadge } from '@/components/orders/HandlingTypeBadge';
import { printPackingSlips } from '@/lib/order-print';
import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
type SavedView = (typeof savedViewLabels)[number];
type ActiveQueue = SavedView | 'Allocation failed' | 'Ready for pickup' | 'Pickup overdue' | 'Sync errors' | null;

function StoreIdentity({ store }: { store: string }) {
  const normalized = store.toLowerCase().replace(/[^a-z0-9]/g, '');
  const key = ({ primepos: 'pos', tiktokshop: 'tiktok' } as Record<string, string>)[normalized] || normalized;
  return <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground"><ChannelLogo channel={{key, label: store}} size="sm" />{store}</span>;
}

function OrderStatus({ status }: { status: string }) {
  const tone = ['Draft', 'Cancelled'].includes(status) ? 'border-border bg-muted text-muted-foreground' : status === 'To Confirm' ? 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:text-indigo-300' : ['In Transit', 'Partially Shipped'].includes(status) ? 'border-sky-200 bg-sky-50 text-sky-700 dark:text-sky-300' : ['Completed', 'Delivered'].includes(status) ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:text-emerald-300' : 'border-amber-200 bg-amber-50 text-amber-700 dark:text-amber-300';
  return <span className={cn('inline-flex whitespace-nowrap rounded-md border px-2 py-1 text-xs font-semibold dark:border-current/30 dark:bg-transparent', tone)}>{status}</span>;
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
  const [sort, setSort] = useState('newest');
  const [hiddenColumns, setHiddenColumns] = useState<string[]>(['PROCESSING DEADLINE', 'ASSIGNEE']);
  const headers = ['ORDER', 'CUSTOMER', 'SALES CHANNEL', 'FULFILLMENT TYPE', 'STATUS', 'TOTAL / PAYMENT', 'FULFILLMENT', 'ASSIGNEE', 'PROCESSING DEADLINE'];
  const [bulkWarehouse, setBulkWarehouse] = useState('');
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkPending, setBulkPending] = useState(false);
  const warehouses = useMemo(() => [...new Set(records.map((o) => o.metadata.warehouse))], [records]);
  async function refresh() { setLoading(true); setLoadError(''); try { const result = await ordersApi.list(); setRecords(result.data); setHasLoaded(true); setCanWrite(result.canWrite); setCurrentUserName(result.currentUserName || ''); } catch (e) { setLoadError((e as Error).message); setCanWrite(false); } finally { setLoading(false); } }
  useEffect(() => { void refresh(); }, []);
  function updated(order: OrderRecord) { setRecords((items) => items.map((o) => o.id === order.id ? order : o)); }
  const statuses = statusDefinitions.map((s) => ({ ...s, count: orders.filter((o) => s.key === 'all' || orderQueue(o) === s.key).length }));

  const [params, setParams] = useSearchParams();
  const workflowParam = params.get('module') === 'cos' ? 'orderView' : 'view';
  const viewParam = params.get(workflowParam);
  const view: OrderView = viewParam === 'fulfillment' || viewParam === 'returns' ? viewParam : 'all';
  const [status, setStatus] = useState<StatusFilter>(params.get('status') === 'pending' ? 'pending' : 'all');
  const [subStatus,setSubStatus] = useState('all');
  const [heldOnly,setHeldOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [selectedStore, setSelectedStore] = useState('All Stores');
  const [channel, setChannel] = useState('all');
  const [activeView, setActiveView] = useState<ActiveQueue>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const routeParams = useParams();
  const detail = params.get('order') || routeParams.id || null;
  const setDetail = (id: string | null) => { const next = new URLSearchParams(params); if (id) next.set('order', id); else next.delete('order'); setParams(next, { replace: true }); };
  const [filtersOpen, setFiltersOpen] = useState(false);
  useEffect(() => {
    const statusParam = params.get('status');
    setStatus(statusParam && (statusParam === 'draft' || statusDefinitions.some((item) => item.key === statusParam)) ? statusParam as StatusFilter : 'all');
  }, [params]);
  const savedViews = useMemo(() => savedViewLabels.map((label) => ({
    label,
    count: orders.filter((order) => label === 'Assigned to me' ? Boolean(currentUserName) && order.assignee === currentUserName : label === 'SLA at risk' ? order.slaRisk : order.readyForPickup).length,
  })), [orders, currentUserName]);
  const attentionCount = records.filter((order) => getOrderAttentionReasons(order).length > 0).length;
  const filtered = useMemo(() => orders.filter((order) => {
    const matchesSearch = !search || `${order.orderKey} ${order.customer} ${order.phone} ${order.store} ${order.tracking}`.toLowerCase().includes(search.toLowerCase());
    const matchesPayment = (!attentionOnly || getOrderAttentionReasons(order).length > 0) && (paymentFilter === 'all' || order.payment === paymentFilter);
    const matchesStore = selectedStore === 'All Stores' || order.store === selectedStore;
    const matchesChannel = channel === 'all' || order.store === channel;
    const matchesStatus = (status === 'all' || orderQueue(order) === status) && matchesQueueFilter(order, subStatus) && (!heldOnly || order.hold?.active);
    const matchesWorkspaceView = view === 'all' || (view === 'fulfillment' ? ['acknowledged','allocated','fulfillment_in_progress','partially_shipped','shipped','delivered','closed'].includes(order.canonicalStatus) : order.returnRequests.length > 0);
    const matchesView = !activeView || (activeView === 'Assigned to me' ? Boolean(currentUserName) && order.assignee === currentUserName : activeView === 'SLA at risk' ? order.slaRisk : activeView === 'Sync errors' ? order.syncError : activeView === 'Ready for pickup' ? order.readyForPickup : activeView === 'Pickup overdue' ? order.pickupOverdue : order.reservation === 'Allocation failed');
    return matchesSearch && matchesPayment && matchesStore && matchesChannel && matchesStatus && matchesWorkspaceView && matchesView
      && (canonical === 'all' || order.canonicalStatus === canonical)
      && (warehouseFilter === 'all' || order.warehouse === warehouseFilter)
      && (carrierFilter === 'all' || order.carrier === carrierFilter)
      && (!tagFilter || order.tags.join(' ').toLowerCase().includes(tagFilter.toLowerCase()))
      && (!notesFilter || order.metadata.notes.toLowerCase().includes(notesFilter.toLowerCase()))
      && (!dateFrom || new Date(order.orderedAt) >= new Date(`${dateFrom}T00:00:00`))
      && (!dateTo || new Date(order.orderedAt) <= new Date(`${dateTo}T23:59:59.999`));
  }).sort((a, b) => sort === 'oldest' ? a.orderedAt.localeCompare(b.orderedAt) : b.orderedAt.localeCompare(a.orderedAt)), [orders, currentUserName, activeView, channel, search, selectedStore, attentionOnly, paymentFilter, subStatus, heldOnly, status, view, canonical, warehouseFilter, carrierFilter, tagFilter, notesFilter, dateFrom, dateTo, sort]);
  useEffect(() => { setPage(0); setSelected([]); }, [activeView, channel, search, selectedStore, attentionOnly, paymentFilter, subStatus, heldOnly, status, view, canonical, warehouseFilter, carrierFilter, tagFilter, notesFilter, dateFrom, dateTo]);
  const visible = filtered.slice(page * 20, (page + 1) * 20);
  const pageCopy = { title: 'All Orders', description: 'Monitor revenue, fulfillment, shipping, and returns from one operational workspace.', icon: ShoppingBag };
  const setWorkflowView = (nextView: OrderView) => {
    const next = new URLSearchParams(params);
    if (nextView === 'all') next.delete(workflowParam); else next.set(workflowParam, nextView);
    setActiveView(null);
    setParams(next, { replace: true });
  };
  const setLifecycleStatus = (nextStatus: StatusFilter) => {
    setStatus(nextStatus); setSubStatus('all'); setCanonical('all');
    const next = new URLSearchParams(params);
    if (nextStatus === 'all') next.delete('status'); else next.set('status', nextStatus);
    setParams(next, { replace: true });
  };
  const toggleOrder = (id: string) => setSelected((value) => value.includes(id) ? value.filter((item) => item !== id) : [...value, id]);

  return <div className="space-y-5 p-4 pb-28 md:p-6">
    <WorkspacePageHeader title={pageCopy.title} description={pageCopy.description} icon={pageCopy.icon} actions={<div className="flex gap-2"><Button variant="outline" aria-pressed={status === 'draft'} onClick={() => setLifecycleStatus('draft')}>Drafts ({records.filter(o=>o.canonicalStatus==='draft').length})</Button><Button variant="outline" onClick={() => void refresh()} disabled={loading}>Refresh</Button><Button variant="outline" disabled={!filtered.length} onClick={() => exportOrders(records.filter((o) => filtered.some((r) => r.id === o.id)))}><Download className="size-4" />Export</Button><Button disabled={!canWrite || loading} onClick={() => setCreateOpen(true)}>Create order</Button></div>} />

    {loading && <p role="status">Loading orders…</p>}
    {loadError && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/40 bg-amber-500/5 p-4"><div><p className="text-sm font-semibold">{hasLoaded ? 'Could not refresh orders. Showing the last loaded data.' : 'Orders could not be loaded.'}</p><p className="mt-1 text-sm text-muted-foreground">{loadError.includes('Unknown resource') ? 'The order service needs to be updated. Retry after the service is available.' : loadError}</p></div><Button variant="outline" disabled={loading} onClick={() => void refresh()}>Retry</Button></div>}
    {notice && <p role="status" className="rounded-lg border p-3 text-sm">{notice}</p>}

    <nav className="flex gap-1 overflow-x-auto border-b border-border" aria-label="Order lifecycle">
      {statuses.map((item) => <button key={item.key} type="button" onClick={() => setLifecycleStatus(item.key)} aria-current={status === item.key ? 'page' : undefined} className={cn('relative min-h-11 shrink-0 px-3 text-sm font-semibold transition-colors', status === item.key ? 'text-primary after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-primary' : 'text-muted-foreground hover:text-foreground')}>{item.label}<span className={cn('ml-1.5 text-xs tabular-nums', status === item.key ? 'text-primary/75' : 'text-muted-foreground')}>{hasLoaded ? item.count : '—'}</span></button>)}
    </nav>
    <div className="flex flex-wrap items-center gap-2"><Button variant={heldOnly ? 'secondary' : 'outline'} aria-pressed={heldOnly} onClick={()=>setHeldOnly(value=>!value)}>On hold ({records.filter(o=>o.hold?.active).length})</Button>{queueFilters[status] && <select aria-label="Work queue filter" className="h-9 rounded-md border bg-background px-2 text-sm" value={subStatus} onChange={e=>setSubStatus(e.target.value)}><option value="all">All in this queue</option>{queueFilters[status]!.map(filter=><option key={filter.key} value={filter.key}>{filter.label}</option>)}</select>}{status === 'completed' && <p className="text-xs text-muted-foreground">Delivery, order closure and settlement are tracked separately.</p>}</div>



    <div className="min-w-0 space-y-4">
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 xl:flex-row xl:flex-wrap xl:items-center">
          <div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by order ID, customer name, or phone number..." className="h-10 w-full pl-9" /></div>
          <div className="grid shrink-0 grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center">
            <select aria-label="Exact order status" className="h-10 rounded-md border bg-background px-2 text-sm" value={canonical} onChange={(e) => { setLifecycleStatus('all'); setCanonical(e.target.value); }}><option value="all">All order statuses</option>{Object.entries(orderLabels).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select>
            <select aria-label="Payment status" className="h-10 rounded-md border bg-background px-2 text-sm" value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}><option value="all">All payments</option>{['Unpaid','Paid','Refunded'].map((state) => <option key={state}>{state}</option>)}</select>
            <Select value={channel} onValueChange={setChannel}><SelectTrigger className="h-10 w-full md:w-[180px]" aria-label="Filter by sales channel"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All channels ({orders.length})</SelectItem>{[...new Set(orders.map((o) => o.store))].map((store) => <SelectItem key={store} value={store}>{store} ({orders.filter((o) => o.store === store).length})</SelectItem>)}</SelectContent></Select>
            <Select value={view !== 'all' ? `workflow:${view}` : activeView ? `saved:${activeView}` : 'all'} onValueChange={(value) => { if (value === 'all') { setWorkflowView('all'); return; } if (value.startsWith('workflow:')) { setWorkflowView(value.slice(9) as OrderView); return; } setWorkflowView('all'); setActiveView(value.slice(6) as ActiveQueue); }}><SelectTrigger className="h-10 w-full md:w-[210px]" aria-label="Select operational view"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All operational views</SelectItem><SelectItem value="workflow:fulfillment">Fulfillment & Shipping</SelectItem><SelectItem value="workflow:returns">Returns & Exchanges</SelectItem>{savedViews.map((savedView) => <SelectItem key={savedView.label} value={`saved:${savedView.label}`}>{savedView.label === 'SLA at risk' ? 'Processing deadline at risk' : savedView.label} ({savedView.count})</SelectItem>)}</SelectContent></Select>
            <button type="button" aria-pressed={attentionOnly} disabled={!hasLoaded} title="Orders with payment evidence to review, failures, overdue tasks or open exceptions" onClick={() => setAttentionOnly((value) => !value)} className={cn('inline-flex h-10 items-center justify-center whitespace-nowrap rounded-lg border px-3 text-sm font-semibold transition-colors', attentionOnly ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300' : 'border-border bg-background text-muted-foreground hover:bg-muted')}><AlertTriangle className="mr-1.5 size-4" />Needs attention ({hasLoaded ? attentionCount : '—'})</button>
            <Button variant="outline" onClick={() => setFiltersOpen((open) => !open)} aria-expanded={filtersOpen} className="h-10 whitespace-nowrap px-3"><Filter className="size-4" />More filters{selectedStore !== 'All Stores' ? <span className="ml-1 grid size-5 place-items-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">1</span> : null}</Button>
            <Popover><PopoverTrigger asChild><Button variant="outline" className="h-10">Columns</Button></PopoverTrigger><PopoverContent align="end" className="w-64"><p className="text-sm font-semibold">Visible columns</p><div className="mt-2 grid gap-1">{headers.map((h) => <label key={h} className="flex min-h-10 items-center gap-2"><Checkbox checked={!hiddenColumns.includes(h)} disabled={h === 'ORDER'} onCheckedChange={(checked) => setHiddenColumns((cols) => checked ? cols.filter((c) => c !== h) : [...cols, h])} />{h}</label>)}</div></PopoverContent></Popover>
          </div>
        </div>
        {filtersOpen && (<section aria-label="More order filters" className="rounded-lg border bg-card p-4"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold">More filters</h2><Button variant="ghost" size="sm" onClick={() => setFiltersOpen(false)}>Done</Button></div><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      
      <label className="grid gap-1 text-sm">Warehouse / Branch<select className="h-10 rounded-md border bg-background px-2" value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)}><option value="all">All warehouses</option>{warehouses.map((w) => <option key={w}>{w}</option>)}</select></label>
      <label className="grid gap-1 text-sm">Carrier<select className="h-10 rounded-md border bg-background px-2" value={carrierFilter} onChange={(e) => setCarrierFilter(e.target.value)}><option value="all">All carriers</option>{[...new Set(orders.map((o) => o.carrier))].map((w) => <option key={w}>{w}</option>)}</select></label>
      <label className="grid gap-1 text-sm">Sort<select className="h-10 rounded-md border bg-background px-2" value={sort} onChange={(e) => setSort(e.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label>
      <label className="grid gap-1 text-sm">From date<Input type="date" value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)} /></label><label className="grid gap-1 text-sm">To date<Input type="date" min={dateFrom || undefined} value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></label>
      <label className="grid gap-1 text-sm">CRM customer tags<Input value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} /></label><label className="grid gap-1 text-sm">Order notes / Tags<Input value={notesFilter} onChange={(e) => setNotesFilter(e.target.value)} /></label>
      <Button variant="outline" onClick={() => { setCanonical('all'); setWarehouseFilter('all'); setCarrierFilter('all'); setDateFrom(''); setDateTo(''); setTagFilter(''); setNotesFilter(''); }}>Reset detailed filters</Button>
    </div></section>)}
        {heldOnly || subStatus !== 'all' || paymentFilter !== 'all' || view !== 'all' || activeView || status !== 'all' || attentionOnly || selectedStore !== 'All Stores' || canonical !== 'all' || warehouseFilter !== 'all' || carrierFilter !== 'all' || dateFrom || dateTo || tagFilter || notesFilter || channel !== 'all' || search ? <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2"><span className="mr-1 text-xs font-semibold text-muted-foreground">Active filters</span>{view !== 'all' ? <button type="button" onClick={() => setWorkflowView('all')} className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-indigo-200 bg-background px-2.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50">Workflow: {view === 'fulfillment' ? 'Fulfillment & Shipping' : 'Returns & Exchanges'}<X className="size-3" /></button> : null}{activeView ? <button type="button" onClick={() => setActiveView(null)} className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-indigo-200 bg-background px-2.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50">{activeView}<X className="size-3" /></button> : null}{status !== 'all' ? <button type="button" onClick={() => setLifecycleStatus('all')} className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs font-semibold text-foreground hover:bg-slate-100">Status: {status === 'draft' ? 'Drafts' : statuses.find((item) => item.key === status)?.label}<X className="size-3" /></button> : null}{selectedStore !== 'All Stores' ? <button type="button" onClick={() => setSelectedStore('All Stores')} className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs font-semibold text-foreground hover:bg-slate-100">Store: {selectedStore}<X className="size-3" /></button> : null}{attentionOnly ? <button type="button" onClick={() => setAttentionOnly(false)} className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-amber-200 bg-background px-2.5 text-xs font-semibold text-amber-700 hover:bg-amber-50">Needs attention<X className="size-3" /></button> : null}<span className="ml-auto text-xs tabular-nums text-muted-foreground">{filtered.length} orders</span><button type="button" onClick={() => { setWorkflowView('all'); setActiveView(null); setLifecycleStatus('all'); setSelectedStore('All Stores'); setAttentionOnly(false); setPaymentFilter('all'); setHeldOnly(false); setSubStatus('all'); setChannel('all'); setSearch(''); setCanonical('all'); setWarehouseFilter('all'); setCarrierFilter('all'); setDateFrom(''); setDateTo(''); setTagFilter(''); setNotesFilter(''); }} className="min-h-8 text-xs font-semibold text-muted-foreground hover:text-foreground">Clear all</button></div> : null}
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="max-h-[65vh] overflow-auto">
            <table aria-label="Orders" className="w-full min-w-[1080px] text-left text-sm">
              <thead className="sticky top-0 z-10 border-b bg-card"><tr>
                <th scope="col" className="w-10 px-3 py-3"><Checkbox checked={selected.length === filtered.length && filtered.length > 0} onCheckedChange={() => setSelected(selected.length === filtered.length ? [] : filtered.map((item) => item.id))} aria-label="Select all orders" /></th>
                {headers.map((header) => <th scope="col" key={header} hidden={hiddenColumns.includes(header)} className={cn('whitespace-nowrap px-3 py-3 text-xs font-medium text-muted-foreground', header === 'TOTAL / PAYMENT' && 'text-right')}>{header === 'FULFILLMENT' ? 'FULFILLMENT / DELIVERY' : header === 'STATUS' ? 'ORDER STATUS' : header}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-border">{visible.map((order) => {
                const reasons = getOrderAttentionReasons(order);
                const overdue = /breached|overdue/i.test(order.sla);
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
                  <td hidden={hiddenColumns.includes('STATUS')} className="min-w-[165px] px-3 py-3"><OrderStatus status={order.status} />{order.canonicalStatus === 'partially_shipped' && <p className="mt-1 text-xs text-muted-foreground">Partially shipped</p>}{reasons.length > 0 && <p className="mt-1 max-w-52 text-xs leading-5 text-amber-700 dark:text-amber-300">{reasons.join(' · ')}</p>}{order.shipments.some(shipment=>shipment.deliveryOutcome==='failed') && <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">Failed delivery · Awaiting retry</p>}{order.returnRequests.length > 0 && <p className="mt-1 text-xs text-violet-700 dark:text-violet-300">Return · {order.returnRequests[order.returnRequests.length - 1].status}</p>}</td>
                  <td hidden={hiddenColumns.includes('TOTAL / PAYMENT')} className="min-w-[135px] px-3 py-3 text-right"><p className="whitespace-nowrap font-semibold leading-7 tabular-nums">{order.total}</p><p className={cn('text-xs', order.payment === 'Paid' ? 'text-emerald-700 dark:text-emerald-400' : order.payment === 'Refunded' ? 'text-violet-700 dark:text-violet-300' : 'text-muted-foreground')}>{order.payment}</p></td>
                  <td hidden={hiddenColumns.includes('FULFILLMENT')} className="min-w-[195px] max-w-64 px-3 py-3">
                    <p className="leading-7">{shipment ? shipment.carrier : order.warehouse}</p>
                    <p className="break-words text-xs text-muted-foreground">{shipment ? shipment.tracking : order.canonicalStatus === 'canceled' ? 'Fulfillment stopped' : order.reservation === 'Not reserved' ? (order.canonicalStatus === 'draft' ? 'Not submitted' : 'Awaiting stock allocation') : order.reservation}</p>
                    {order.shipments.length > 1 && <p className="mt-1 text-xs text-muted-foreground">+{order.shipments.length - 1} more shipment(s)</p>}
                  </td>
                  <td hidden={hiddenColumns.includes('ASSIGNEE')} className="px-3 py-4">{order.assignee}</td>
                  <td hidden={hiddenColumns.includes('PROCESSING DEADLINE')} className="px-3 py-4"><span className={cn('text-xs', overdue ? 'text-rose-700 dark:text-rose-300' : order.slaRisk ? 'text-amber-700 dark:text-amber-300' : 'text-muted-foreground')}>{order.sla === 'Not scheduled' ? '—' : order.sla}</span></td>
                </tr>;
              })}</tbody>
            </table>
          </div>{hasLoaded && !loading && !loadError && filtered.length === 0 ? <div className="grid min-h-48 place-items-center border-t border-border p-6 text-center"><div><Search className="mx-auto size-5 text-muted-foreground" /><p className="mt-2 text-sm font-semibold text-foreground">{records.length ? 'No matching orders' : 'No orders yet'}</p><p className="mt-1 text-xs text-muted-foreground">{records.length ? 'Adjust the active view, status, or search query.' : 'Create your first order to get started.'}</p></div></div> : null}</div>
    </div>

    {hasLoaded && <div className="flex items-center justify-between text-sm"><span>{filtered.length} orders · Page {page + 1} of {Math.max(1, Math.ceil(filtered.length / 20))}</span><div className="flex gap-2"><Button variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button><Button variant="outline" disabled={(page + 1) * 20 >= filtered.length} onClick={() => setPage(page + 1)}>Next</Button></div></div>}
    {selected.length > 0 && <div className="sticky bottom-4 z-40 flex flex-wrap items-center gap-2 rounded-xl border bg-background p-3 shadow-xl"><span className="mr-auto text-sm">{selected.length} orders selected</span><span title="Carrier-issued labels required"><Button disabled variant="outline">Print Shipping Labels</Button></span><Button variant="outline" disabled={records.some((o) => selected.includes(o.id) && !o.lines.length)} onClick={() => { try { printPackingSlips(records.filter((o) => selected.includes(o.id))); } catch(e) { setNotice((e as Error).message); } }}>Print Packing Slips</Button><Button variant="outline" disabled={!canWrite || records.some((o) => selected.includes(o.id) && (o.source === 'demo' || !['draft', 'created', 'acknowledged'].includes(o.canonicalStatus)))} onClick={() => setBulkOpen(true)}>Reassign Warehouse</Button><Button variant="outline" onClick={() => exportOrders(records.filter((o) => selected.includes(o.id)))}>Export Selected</Button></div>}
    {!createOpen && detail && records.find((o) => o.id === detail) && <OrderWorkspaceDetail key={detail} order={records.find((o) => o.id === detail)!} canWrite={canWrite} onClose={() => setDetail(null)} onUpdated={updated} onEditDraft={() => { setEditingDraft(records.find((o) => o.id === detail)); setCreateOpen(true); }} />}
    {createOpen && <ManualOrderDialog initialOrder={editingDraft} warehouses={warehouses} onClose={() => { setCreateOpen(false); setEditingDraft(undefined); }} onCreated={(order) => { setRecords((items) => [order, ...items.filter((o) => o.id !== order.id)]); setCreateOpen(false); setEditingDraft(undefined); setDetail(order.id); setNotice(`Order ${order.orderKey} saved.`); }} />}

    {bulkOpen && <Sheet open onOpenChange={(v) => !v && !bulkPending && setBulkOpen(false)}><SheetContent><SheetHeader><SheetTitle>Reassign preferred warehouse</SheetTitle><SheetDescription>Update warehouse preference. Inventory reservations are managed by fulfillment.</SheetDescription></SheetHeader><form className="mt-6 space-y-4" onSubmit={async (event) => { event.preventDefault(); setBulkPending(true); const failures: string[] = []; for (const order of records.filter((o) => selected.includes(o.id))) { try { const r = await ordersApi.command(order, { action: 'warehouse', warehouse: bulkWarehouse }); updated(r.data); } catch(e) { failures.push(`${order.orderKey}: ${(e as Error).message}`); } } setNotice(failures.length ? failures.join('; ') : 'Warehouse preferences updated.'); setBulkPending(false); setBulkOpen(false); }}><label className="grid gap-2">Warehouse<Input required value={bulkWarehouse} onChange={(e) => setBulkWarehouse(e.target.value)} /></label><Button disabled={bulkPending}>{bulkPending ? 'Updating…' : 'Apply to selected'}</Button></form></SheetContent></Sheet>}

  </div>;
}
