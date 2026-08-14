import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Box,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  Clock3,
  Download,
  Filter,
  MessageSquare,
  PackageCheck,
  Printer,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Store,
  Truck,
  UserRound,
  UsersRound,
  Warehouse,
  X,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { WorkspacePageHeader } from '@/components/system/WorkspacePageHeader';
import type { ChannelSource } from '@/components/shared/ChannelSourceFilter';
import { cn } from '@/lib/utils';

type StatusFilter = 'all' | 'pending' | 'ready' | 'shipping' | 'completed' | 'closed';

const statuses: Array<{ key: StatusFilter; label: string; count: number }> = [
  { key: 'all', label: 'All', count: 1280 },
  { key: 'pending', label: 'Needs Confirmation', count: 124 },
  { key: 'ready', label: 'Ready to Pack & Ship', count: 45 },
  { key: 'shipping', label: 'Shipping', count: 326 },
  { key: 'completed', label: 'Completed', count: 714 },
  { key: 'closed', label: 'Cancelled / Returned', count: 71 },
];

const orders = [
  { id: 'PRM-240812-1048', date: 'Aug 12 · 10:48', customer: 'Nguyen Minh Anh', tags: ['VIP'], store: 'PrimeWeb', owner: 'Online Store', warehouse: 'HCM Central Warehouse', total: '₫1,284,000', payment: 'Paid', status: 'Pending Confirmation', sla: '12m remaining', slaRisk: true, assignee: 'Linh Nguyen', reservation: 'Reserved', carrier: 'GHN', tracking: 'GHN-8821048', needsPaymentVerification: false, syncError: false, readyForPickup: false, pickupOverdue: false },
  { id: 'POS-240812-0931', date: 'Aug 12 · 09:31', customer: 'Tran Quoc Huy', tags: [], store: 'PrimePOS', owner: 'Cashier: Mai Linh', warehouse: 'District 1 Branch', total: '₫688,000', payment: 'Paid', status: 'Completed', sla: 'On time', slaRisk: false, assignee: 'Mai Linh', reservation: 'Released', carrier: 'Store pickup', tracking: '—', needsPaymentVerification: false, syncError: false, readyForPickup: false, pickupOverdue: false },
  { id: 'SHP-240812-0816', date: 'Aug 12 · 08:16', customer: 'Le Hoang Yen', tags: ['High Return Risk'], store: 'Shopee', owner: 'Shopee Flagship', warehouse: 'Binh Duong Warehouse', total: '₫942,000', payment: 'Unpaid', status: 'Pending Confirmation', sla: 'Breached by 34m', slaRisk: true, assignee: 'Unassigned', reservation: 'Allocation failed', carrier: 'GHTK', tracking: 'Pending', needsPaymentVerification: true, syncError: false, readyForPickup: false, pickupOverdue: false },
  { id: 'CRM-240811-1742', date: 'Aug 11 · 17:42', customer: 'An Phat Company', tags: ['B2B'], store: 'PrimeCRM', owner: 'Sales Rep: Hoang Nam', warehouse: 'HCM Central Warehouse', total: '₫8,460,000', payment: 'Paid', status: 'Awaiting Shipment', sla: 'Pickup overdue by 22m', slaRisk: false, assignee: 'Hoang Nam', reservation: 'Reserved', carrier: 'ViettelPost', tracking: 'VTP-617420', needsPaymentVerification: false, syncError: false, readyForPickup: true, pickupOverdue: true },
  { id: 'TTK-240811-1620', date: 'Aug 11 · 16:20', customer: 'Pham Ngoc Ha', tags: [], store: 'TikTok Shop', owner: 'TikTok Official', warehouse: 'Hanoi Warehouse', total: '₫1,120,000', payment: 'Paid', status: 'In Transit', sla: 'On time', slaRisk: false, assignee: 'Thu Tran', reservation: 'Dispatched', carrier: 'GHN', tracking: 'GHN-811620', needsPaymentVerification: false, syncError: true, readyForPickup: false, pickupOverdue: false },
  { id: 'LZD-240811-1515', date: 'Aug 11 · 15:15', customer: 'Doan Thu Trang', tags: ['VIP'], store: 'Lazada', owner: 'Lazada Flagship', warehouse: 'HCM Central Warehouse', total: '₫2,340,000', payment: 'Refunded', status: 'Returned', sla: 'Return received', slaRisk: false, assignee: 'Linh Nguyen', reservation: 'Released', carrier: 'LEX', tracking: 'LZD-RETURN-1515', needsPaymentVerification: false, syncError: false, readyForPickup: false, pickupOverdue: false },
  { id: 'PRM-240811-1442', date: 'Aug 11 · 14:42', customer: 'Vo Gia Bao', tags: [], store: 'PrimeWeb', owner: 'Online Store', warehouse: 'Hanoi Warehouse', total: '₫756,000', payment: 'Paid', status: 'Awaiting Shipment', sla: '24m remaining', slaRisk: true, assignee: 'Linh Nguyen', reservation: 'Allocation failed', carrier: 'GHN', tracking: 'Pending', needsPaymentVerification: false, syncError: false, readyForPickup: false, pickupOverdue: false },
  { id: 'SHP-240811-1328', date: 'Aug 11 · 13:28', customer: 'Pham Bao Chau', tags: ['B2B'], store: 'Shopee', owner: 'Shopee Flagship', warehouse: 'Binh Duong Warehouse', total: '₫3,180,000', payment: 'Unpaid', status: 'Pending Confirmation', sla: '42m remaining', slaRisk: false, assignee: 'Finance Team', reservation: 'Allocation failed', carrier: 'SPX Express', tracking: 'Pending', needsPaymentVerification: true, syncError: true, readyForPickup: false, pickupOverdue: false },
];

const productImages = ['/images/products/B0G432Z31H/1.jpg', '/images/products/B0FH1K4CMN/1.jpg', '/images/products/B0FQHTSM8B/1.jpg', '/images/products/B0G5Y7YCDD/1.jpg'];

const savedViewLabels = ['Assigned to me', 'SLA at risk', 'Ready for pickup'] as const;
type SavedView = (typeof savedViewLabels)[number];
type ActiveQueue = SavedView | 'Allocation failed' | 'Ready for pickup' | 'Pickup overdue' | 'Sync errors' | null;

const statusValues: Record<Exclude<StatusFilter, 'all'>, string[]> = {
  pending: ['Pending Confirmation'],
  ready: ['Awaiting Shipment'],
  shipping: ['In Transit'],
  completed: ['Completed'],
  closed: ['Cancelled', 'Returned'],
};

function StoreIdentity({ store, owner }: { store: string; owner: string }) {
  const Icon = store === 'PrimePOS' ? Store : store === 'PrimeCRM' ? UsersRound : store === 'PrimeWeb' ? ShoppingBag : Box;
  return <div><span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700"><Icon className="size-4 text-slate-400" />{store}</span><div className="mt-1 text-xs text-slate-500">{owner}</div></div>;
}

function OrderStatus({ status }: { status: string }) {
  const tone = status === 'Pending Confirmation' ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : status === 'In Transit' ? 'border-sky-200 bg-sky-50 text-sky-700' : status === 'Completed' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700';
  const label = status === 'Pending Confirmation' ? 'Needs Confirmation' : status === 'Awaiting Shipment' ? 'Ready to Pack' : status === 'In Transit' ? 'Shipping' : status;
  return <span className={cn('inline-flex whitespace-nowrap rounded-md border px-2 py-1 text-xs font-semibold dark:border-current/30 dark:bg-transparent', tone)}>{label}</span>;
}

type OrderView = 'all' | 'fulfillment' | 'returns';

function orderChannel(store: string): ChannelSource | 'other' {
  if (store === 'PrimeWeb') return 'primeweb';
  if (store === 'PrimePOS') return 'pos';
  if (store === 'Shopee') return 'shopee';
  if (store === 'PrimeCRM') return 'social';
  return 'other';
}

export default function Orders() {
  const [params, setParams] = useSearchParams();
  const viewParam = params.get('view');
  const view: OrderView = viewParam === 'fulfillment' || viewParam === 'returns' ? viewParam : 'all';
  const [status, setStatus] = useState<StatusFilter>(params.get('status') === 'pending' ? 'pending' : 'all');
  const [search, setSearch] = useState('');
  const [unpaidOnly, setUnpaidOnly] = useState(false);
  const [selectedStore, setSelectedStore] = useState('All Stores');
  const [channel, setChannel] = useState<ChannelSource>('all');
  const [activeView, setActiveView] = useState<ActiveQueue>(null);
  const [urgentExpanded, setUrgentExpanded] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [detail, setDetail] = useState<(typeof orders)[number] | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  useEffect(() => {
    const statusParam = params.get('status');
    if (statusParam && statuses.some((item) => item.key === statusParam)) setStatus(statusParam as StatusFilter);
  }, [params]);
  const savedViews = useMemo(() => savedViewLabels.map((label) => ({
    label,
    count: orders.filter((order) => label === 'Assigned to me' ? order.assignee === 'Linh Nguyen' : label === 'SLA at risk' ? order.slaRisk : order.readyForPickup).length,
  })), []);
  const urgentActions = useMemo(() => [
    { priority: 'High', title: `${orders.filter((order) => order.needsPaymentVerification).length} payments need verification`, detail: 'Bank transfer evidence is pending review.', action: 'Confirm payment', view: null },
    { priority: 'High', title: `${orders.filter((order) => order.reservation === 'Allocation failed').length} stock allocation failures`, detail: 'Assigned warehouses cannot fulfill these orders.', action: 'Change warehouse', view: 'Allocation failed' as ActiveQueue },
    { priority: 'High', title: `${orders.filter((order) => order.pickupOverdue).length} carrier pickup overdue`, detail: 'Packed orders missed the carrier pickup deadline.', action: 'Review pickups', view: 'Pickup overdue' as ActiveQueue },
    { priority: 'Medium', title: `${orders.filter((order) => order.syncError).length} channel sync retries`, detail: 'Marketplace acknowledgements are delayed.', action: 'Retry sync', view: 'Sync errors' as ActiveQueue },
  ], []);
  const filtered = useMemo(() => orders.filter((order) => {
    const matchesSearch = !search || `${order.id} ${order.customer} ${order.store}`.toLowerCase().includes(search.toLowerCase());
    const matchesPayment = !unpaidOnly || order.payment === 'Unpaid';
    const matchesStore = selectedStore === 'All Stores' || order.store === selectedStore;
    const matchesChannel = channel === 'all' || orderChannel(order.store) === channel;
    const matchesStatus = status === 'all' || statusValues[status].includes(order.status);
    const matchesWorkspaceView = view === 'all' || (view === 'fulfillment' ? ['Awaiting Shipment', 'In Transit', 'Completed'].includes(order.status) : ['Returned', 'Cancelled'].includes(order.status));
    const matchesView = !activeView || (activeView === 'Assigned to me' ? order.assignee === 'Linh Nguyen' : activeView === 'SLA at risk' ? order.slaRisk : activeView === 'Sync errors' ? order.syncError : activeView === 'Ready for pickup' ? order.readyForPickup : activeView === 'Pickup overdue' ? order.pickupOverdue : order.reservation === 'Allocation failed');
    return matchesSearch && matchesPayment && matchesStore && matchesChannel && matchesStatus && matchesWorkspaceView && matchesView;
  }), [activeView, channel, search, selectedStore, unpaidOnly, status, view]);
  const channelCounts = useMemo(() => ({
    all: orders.length,
    primeweb: orders.filter((order) => orderChannel(order.store) === 'primeweb').length,
    pos: orders.filter((order) => orderChannel(order.store) === 'pos').length,
    shopee: orders.filter((order) => orderChannel(order.store) === 'shopee').length,
    social: orders.filter((order) => orderChannel(order.store) === 'social').length,
  }), []);
  const pageCopy = { title: 'All Orders', description: 'Monitor revenue, fulfillment, shipping, and returns from one operational workspace.', icon: ShoppingBag };
  const setWorkflowView = (nextView: OrderView) => {
    const next = new URLSearchParams(params);
    if (nextView === 'all') next.delete('view'); else next.set('view', nextView);
    setActiveView(null);
    setParams(next, { replace: true });
  };
  const setLifecycleStatus = (nextStatus: StatusFilter) => {
    setStatus(nextStatus);
    const next = new URLSearchParams(params);
    if (nextStatus === 'all') next.delete('status'); else next.set('status', nextStatus);
    setParams(next, { replace: true });
  };
  const activateView = (view: ActiveQueue) => setActiveView(view);
  const runUrgentAction = (action: string, view: ActiveQueue) => {
    if (action === 'Confirm payment') { setActiveView(null); setUnpaidOnly(true); setStatus('all'); return; }
    activateView(view);
  };
  const toggleOrder = (id: string) => setSelected((value) => value.includes(id) ? value.filter((item) => item !== id) : [...value, id]);

  return <div className="space-y-5 p-4 pb-28 md:p-6">
    <WorkspacePageHeader title={pageCopy.title} description={pageCopy.description} icon={pageCopy.icon} actions={<Button variant="outline"><Download className="size-4" />Export</Button>} />

    {view === 'all' ? <section className="overflow-hidden rounded-xl border border-rose-200 bg-rose-50/60 dark:border-rose-900/60 dark:bg-rose-950/20" aria-label="Urgent actions">
      <button type="button" onClick={() => setUrgentExpanded((value) => !value)} className="flex min-h-12 w-full items-center gap-3 px-4 text-left transition hover:bg-rose-100/50 dark:hover:bg-rose-950/30" aria-expanded={urgentExpanded}><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"><AlertTriangle className="size-4" /></span><span className="min-w-0 flex-1"><span className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">Urgent action needed</span><span className="ml-2 text-sm font-medium text-foreground">{urgentActions.length} issues require attention</span></span><span className="text-xs font-semibold text-muted-foreground">{urgentExpanded ? 'Collapse' : 'Expand'}</span>{urgentExpanded ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}</button>
      {urgentExpanded ? <div className="grid gap-3 border-t border-rose-200 p-3 dark:border-rose-900/60 md:grid-cols-2 xl:grid-cols-4">{urgentActions.map((item) => <article key={item.title} className="flex min-h-28 flex-col rounded-lg border border-border bg-card p-3 shadow-sm"><h3 className="text-sm font-semibold text-foreground">{item.title.replace('payments need verification', 'orders need payment confirmation').replace('stock allocation failures', 'orders have insufficient warehouse stock').replace('carrier pickup overdue', 'carrier pickup is overdue').replace('channel sync retries', 'orders need channel sync retry')}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{item.detail.replace('Bank transfer evidence is pending review.', 'Review the bank transfer proof before confirming these orders.').replace('Assigned warehouses cannot fulfill these orders.', 'Move these orders to a warehouse with available stock.').replace('Marketplace acknowledgements are delayed.', 'Retry marketplace synchronization for affected orders.')}</p><button type="button" onClick={() => runUrgentAction(item.action, item.view)} className="mt-auto min-h-9 self-start text-xs font-semibold text-primary hover:underline">{item.action === 'Confirm payment' ? 'Review orders' : item.action === 'Change warehouse' ? 'Change warehouse' : item.action === 'Review pickups' ? 'Review pickups' : 'Retry sync'} →</button></article>)}</div> : null}
    </section> : null}

    <nav className="flex gap-1 overflow-x-auto border-b border-slate-200" aria-label="Order lifecycle">
      {statuses.map((item) => <button key={item.key} type="button" onClick={() => setLifecycleStatus(item.key)} className={cn('relative min-h-11 shrink-0 px-3 text-sm font-semibold transition-colors', status === item.key ? 'text-indigo-700 after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-indigo-600' : 'text-slate-500 hover:text-slate-900')}>{item.label}<span className={cn('ml-1.5 text-xs tabular-nums', status === item.key ? 'text-indigo-500' : 'text-slate-400')}>{item.count}</span></button>)}
    </nav>

    <div className="min-w-0 space-y-4">
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 md:flex-row md:items-center">
          <div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by order ID, customer name, or phone number..." className="h-10 w-full pl-9" /></div>
          <div className="grid shrink-0 grid-cols-2 gap-2 md:flex md:items-center">
            <Select value={channel} onValueChange={(value) => setChannel(value as ChannelSource)}><SelectTrigger className="h-10 w-full md:w-[180px]" aria-label="Filter by sales channel"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All channels ({channelCounts.all})</SelectItem><SelectItem value="primeweb">PrimeWeb ({channelCounts.primeweb})</SelectItem><SelectItem value="pos">PrimePOS ({channelCounts.pos})</SelectItem><SelectItem value="shopee">Shopee ({channelCounts.shopee})</SelectItem><SelectItem value="social">Social Chat ({channelCounts.social})</SelectItem></SelectContent></Select>
            <Select value={view !== 'all' ? `workflow:${view}` : activeView ? `saved:${activeView}` : 'all'} onValueChange={(value) => { if (value === 'all') { setWorkflowView('all'); return; } if (value.startsWith('workflow:')) { setWorkflowView(value.slice(9) as OrderView); return; } setWorkflowView('all'); setActiveView(value.slice(6) as ActiveQueue); }}><SelectTrigger className="h-10 w-full md:w-[210px]" aria-label="Select operational view"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All operational views</SelectItem><SelectItem value="workflow:fulfillment">Fulfillment & Shipping</SelectItem><SelectItem value="workflow:returns">Returns & Exchanges</SelectItem>{savedViews.map((savedView) => <SelectItem key={savedView.label} value={`saved:${savedView.label}`}>{savedView.label === 'SLA at risk' ? 'Processing deadline at risk' : savedView.label} ({savedView.count})</SelectItem>)}</SelectContent></Select>
            <button type="button" onClick={() => setUnpaidOnly((value) => !value)} className={cn('inline-flex h-10 items-center justify-center whitespace-nowrap rounded-lg border px-3 text-sm font-semibold transition-colors', unpaidOnly ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300' : 'border-border bg-background text-muted-foreground hover:bg-muted')}><AlertTriangle className="mr-1.5 size-4" />Payment review</button>
            <Button variant="outline" onClick={() => setFiltersOpen(true)} className="h-10 whitespace-nowrap px-3"><Filter className="size-4" />More filters{selectedStore !== 'All Stores' ? <span className="ml-1 grid size-5 place-items-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">1</span> : null}</Button>
          </div>
        </div>
        {view !== 'all' || activeView || status !== 'all' || unpaidOnly || selectedStore !== 'All Stores' ? <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2"><span className="mr-1 text-xs font-semibold text-slate-500">Active filters</span>{view !== 'all' ? <button type="button" onClick={() => setWorkflowView('all')} className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-indigo-200 bg-white px-2.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50">Workflow: {view === 'fulfillment' ? 'Fulfillment & Shipping' : 'Returns & Exchanges'}<X className="size-3" /></button> : null}{activeView ? <button type="button" onClick={() => setActiveView(null)} className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-indigo-200 bg-white px-2.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50">{activeView}<X className="size-3" /></button> : null}{status !== 'all' ? <button type="button" onClick={() => setLifecycleStatus('all')} className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100">Status: {statuses.find((item) => item.key === status)?.label}<X className="size-3" /></button> : null}{selectedStore !== 'All Stores' ? <button type="button" onClick={() => setSelectedStore('All Stores')} className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100">Store: {selectedStore}<X className="size-3" /></button> : null}{unpaidOnly ? <button type="button" onClick={() => setUnpaidOnly(false)} className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-amber-200 bg-white px-2.5 text-xs font-semibold text-amber-700 hover:bg-amber-50">Unpaid<X className="size-3" /></button> : null}<span className="ml-auto text-xs tabular-nums text-slate-500">{filtered.length} demo orders</span><button type="button" onClick={() => { setWorkflowView('all'); setActiveView(null); setLifecycleStatus('all'); setSelectedStore('All Stores'); setUnpaidOnly(false); }} className="min-h-8 text-xs font-semibold text-slate-600 hover:text-slate-900">Clear all</button></div> : null}
        <div className="overflow-hidden rounded-xl border border-border bg-card"><div className="overflow-x-auto"><table className="w-full min-w-[1280px] text-left"><thead className="border-b border-border bg-muted/40"><tr><th className="w-12 px-4 py-3"><Checkbox checked={selected.length === filtered.length && filtered.length > 0} onCheckedChange={() => setSelected(selected.length === filtered.length ? [] : filtered.map((item) => item.id))} aria-label="Select all orders" /></th>{['ORDER', 'CUSTOMER', 'SALES CHANNEL', 'FULFILLMENT', 'PROCESSING DEADLINE', 'TOTAL / PAYMENT', 'STATUS'].map((header) => <th key={header} className={cn('whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground', header === 'TOTAL / PAYMENT' && 'text-right')}>{header}</th>)}</tr></thead><tbody className="divide-y divide-border">{filtered.map((order, orderIndex) => { const overdue = order.sla.includes('Breached') || order.sla.includes('overdue'); const deadline = order.sla.includes('Breached by') ? `${order.sla.replace('Breached by ', '').replace('m', ' min')} overdue` : order.sla.includes('Pickup overdue by') ? `${order.sla.replace('Pickup overdue by ', '').replace('m', ' min')} overdue` : order.sla.includes('remaining') ? `Due in ${order.sla.replace(' remaining', '').replace('m', ' min')}` : order.sla; const stockError = order.reservation === 'Allocation failed'; return <tr key={order.id} onClick={() => setDetail(order)} className={cn('cursor-pointer transition-colors hover:bg-muted/50', overdue && 'bg-rose-50/40 dark:bg-rose-950/10')}><td className="px-4 py-3" onClick={(event) => event.stopPropagation()}><Checkbox checked={selected.includes(order.id)} onCheckedChange={() => toggleOrder(order.id)} aria-label={`Select ${order.id}`} /></td><td className="min-w-[250px] px-4 py-3"><div className="flex items-center gap-3"><div className="flex shrink-0 -space-x-1.5">{[productImages[orderIndex % productImages.length], productImages[(orderIndex + 1) % productImages.length]].map((image, imageIndex) => <img key={image} src={image} alt="" className="size-9 rounded-md border border-border object-cover" style={{ zIndex: 2 - imageIndex }} />)}</div><div className="min-w-0"><button type="button" onClick={() => setDetail(order)} className="whitespace-nowrap font-semibold text-foreground hover:text-primary">{order.id}</button><div className="mt-1 whitespace-nowrap text-xs text-muted-foreground">{order.date}</div></div></div></td><td className="min-w-[190px] px-4 py-3"><div className="flex items-center gap-2 whitespace-nowrap font-medium text-foreground">{order.customer}{order.tags[0] ? <span title={order.tags[0]} className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">{order.tags[0]}</span> : null}</div><span title={`Assigned to ${order.assignee}`} className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground"><UserRound className="size-3" />Order owner</span></td><td className="min-w-[170px] whitespace-nowrap px-4 py-3"><StoreIdentity store={order.store} owner={order.owner} />{order.syncError ? <button type="button" onClick={(event) => { event.stopPropagation(); activateView('Sync errors'); }} className="mt-1 flex items-center gap-1 text-xs font-semibold text-rose-600 hover:underline"><AlertTriangle className="size-3" />Channel sync failed · Retry</button> : null}</td><td className="min-w-[220px] px-4 py-3"><span className="inline-flex whitespace-nowrap text-sm font-medium text-foreground">{order.warehouse}</span><div className={cn('mt-1 flex items-center gap-1.5 whitespace-nowrap text-xs font-medium', stockError ? 'text-rose-600' : order.reservation === 'Released' || order.reservation === 'Dispatched' ? 'text-sky-600' : 'text-emerald-600')}><span className="size-1.5 rounded-full bg-current" />{stockError ? 'Insufficient stock' : order.reservation === 'Reserved' ? 'Stock reserved' : order.reservation === 'Released' ? 'Released from warehouse' : 'Dispatched'}</div>{stockError ? <button type="button" onClick={(event) => { event.stopPropagation(); activateView('Allocation failed'); }} className="mt-1 text-xs font-semibold text-primary hover:underline">Change warehouse</button> : null}</td><td className="min-w-[165px] px-4 py-3"><span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1 text-xs font-semibold', overdue ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' : order.slaRisk ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-400')}><Clock3 className="size-3.5" />{deadline}</span></td><td className="min-w-[145px] px-4 py-3 text-right"><div className="whitespace-nowrap font-semibold tabular-nums text-foreground">{order.total}</div><span className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><span className={cn('size-1.5 rounded-full', order.payment === 'Paid' ? 'bg-emerald-500' : order.payment === 'Unpaid' ? 'bg-amber-400' : 'bg-slate-400')} />{order.payment}</span></td><td className="min-w-[150px] px-4 py-3"><OrderStatus status={order.status} /></td></tr>})}</tbody></table></div>{filtered.length === 0 ? <div className="grid min-h-48 place-items-center border-t border-border p-6 text-center"><div><Search className="mx-auto size-5 text-muted-foreground" /><p className="mt-2 text-sm font-semibold text-foreground">No matching orders</p><p className="mt-1 text-xs text-muted-foreground">Adjust the active view, status, or search query.</p></div></div> : null}</div>
    </div>

    {selected.length > 0 ? <div className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-4xl flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-2xl md:left-[17rem]"><span className="mr-auto px-2 text-sm font-semibold text-slate-800">{selected.length} orders selected</span><Button size="sm"><Printer className="size-4" />Print Shipping Labels</Button><Button size="sm" variant="outline"><PackageCheck className="size-4" />Print Packing Slips</Button><Button size="sm" variant="outline"><Warehouse className="size-4" />Reassign Warehouse</Button><Button size="sm" variant="outline"><Download className="size-4" />Export Selected</Button></div> : null}

    <OrderDetailDrawer order={detail} onClose={() => setDetail(null)} />
    <FilterDrawer open={filtersOpen} store={selectedStore} status={status} onClose={() => setFiltersOpen(false)} onApply={(nextStore, nextStatus) => { setSelectedStore(nextStore); setStatus(nextStatus); setFiltersOpen(false); }} />
  </div>;
}

function OrderDetailDrawer({ order, onClose }: { order: (typeof orders)[number] | null; onClose: () => void }) {
  const [warehouse, setWarehouse] = useState('HCM Central Warehouse');
  const timeline = [
    { label: 'Order created', meta: `${order?.date} · ${order?.store}`, done: true },
    { label: 'Payment confirmed', meta: order?.payment === 'Paid' ? 'Verified automatically' : 'Waiting for finance review', done: order?.payment === 'Paid' },
    { label: 'Inventory reserved', meta: order?.reservation ?? '', done: order?.reservation !== 'Allocation failed' },
    { label: 'Carrier pickup', meta: order?.status === 'In Transit' || order?.status === 'Completed' ? order.carrier : 'Not started', done: order?.status === 'In Transit' || order?.status === 'Completed' },
  ];

  return <Sheet open={Boolean(order)} onOpenChange={(open) => !open && onClose()}><SheetContent className="flex w-full flex-col overflow-hidden p-0 sm:max-w-2xl">
    <SheetHeader className="shrink-0 border-b border-slate-200 p-5"><div className="flex items-center gap-3"><div><SheetTitle>{order?.id}</SheetTitle><SheetDescription>{order?.customer} · {order?.store}</SheetDescription></div>{order ? <span className={cn('ml-auto mr-7 inline-flex items-center gap-1.5 text-xs font-semibold', order.slaRisk ? 'text-rose-600' : 'text-emerald-600')}><Clock3 className="size-3.5" />{order.sla}</span> : null}</div></SheetHeader>
    {order ? <div className="grid flex-1 gap-4 overflow-y-auto p-5 pb-24">
      <section className="rounded-xl border border-slate-200"><div className="border-b border-slate-100 px-4 py-3"><h3 className="font-semibold">Purchased Items</h3></div><div className="divide-y divide-slate-100">{[{ image: productImages[0], title: 'HydraGlow Essence 30ml', sku: 'HG-ESSENCE · 30ml', qty: 1, price: '₫684,000' }, { image: productImages[1], title: 'Daily Barrier Cream', sku: 'DBC-50 · 50ml', qty: 1, price: '₫600,000' }].map((item) => <div key={item.sku} className="flex items-center gap-3 p-4"><img src={item.image} alt="" className="size-12 rounded-lg border border-slate-200 object-cover" /><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-slate-800">{item.title}</div><div className="mt-1 text-xs font-medium text-slate-500">{item.sku}</div></div><div className="text-right"><div className="text-xs font-medium text-slate-500">Qty {item.qty}</div><div className="mt-1 text-sm font-semibold tabular-nums text-slate-900">{item.price}</div></div></div>)}</div></section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-slate-200 p-4"><div className="flex items-center gap-2"><UserRound className="size-4 text-primary" /><h3 className="font-semibold">Ownership & CRM</h3></div><label className="mt-3 grid gap-1.5 text-xs font-semibold text-slate-500">Assigned to<select defaultValue={order.assignee} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800"><option>{order.assignee}</option><option>Operations Team</option><option>Finance Team</option><option>Customer Support</option></select></label><div className="mt-3 flex flex-wrap gap-2">{(order.tags.length ? order.tags : ['Standard']).map((tag) => <span key={tag} className="rounded-md bg-rose-50/60 px-2 py-1 text-xs font-semibold text-rose-600">{tag}</span>)}</div><div className="mt-3 grid gap-2"><Button size="sm" variant="outline"><MessageSquare className="size-4" />Send Zalo/SMS</Button><Button size="sm" variant="outline"><SlidersHorizontal className="size-4" />Create CRM Ticket</Button></div></section>
        <section className="rounded-xl border border-slate-200 p-4"><div className="flex items-center gap-2"><Warehouse className="size-4 text-primary" /><h3 className="font-semibold">Inventory Allocation</h3></div><p className={cn('mt-2 text-xs font-semibold', order.reservation === 'Allocation failed' ? 'text-rose-600' : 'text-emerald-600')}>{order.reservation}</p><label className="mt-3 grid gap-1.5 text-xs font-semibold text-slate-500">Assigned Warehouse<select value={warehouse} onChange={(event) => setWarehouse(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800"><option>HCM Central Warehouse</option><option>Binh Duong Warehouse</option><option>Hanoi Warehouse</option><option>District 1 Branch</option></select></label><Button size="sm" className="mt-3 w-full">Reroute Inventory</Button></section>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-slate-200 p-4"><div className="flex items-center gap-2"><Truck className="size-4 text-primary" /><h3 className="font-semibold">Fulfillment</h3></div><dl className="mt-3 grid gap-2 text-sm"><div className="flex justify-between"><dt className="text-slate-500">Carrier</dt><dd className="font-medium text-slate-800">{order.carrier}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Tracking</dt><dd className="font-medium text-slate-800">{order.tracking}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Pickup deadline</dt><dd className={cn('font-medium', order.slaRisk ? 'text-rose-600' : 'text-slate-800')}>{order.sla}</dd></div></dl></section>
        <section className="rounded-xl border border-slate-200 p-4"><div className="flex items-center gap-2"><Clock3 className="size-4 text-primary" /><h3 className="font-semibold">Order Timeline</h3></div><ol className="mt-3 space-y-3">{timeline.map((event) => <li key={event.label} className="flex gap-2.5"><span className={cn('mt-1.5 size-2 shrink-0 rounded-full ring-4', event.done ? 'bg-indigo-500 ring-indigo-50' : 'bg-slate-300 ring-slate-100')} /><div><p className="text-xs font-semibold text-slate-800">{event.label}</p><p className="mt-0.5 text-xs text-slate-500">{event.meta}</p></div></li>)}</ol></section>
      </div>

      <section className="rounded-xl border border-slate-200 p-4"><div className="flex items-center gap-2"><CircleDollarSign className="size-4 text-primary" /><h3 className="font-semibold">Net Revenue Calculation</h3></div><div className="mt-3 grid gap-2 text-sm">{[['Gross Price', order.total], ['Discounts', '- ₫84,000'], ['Platform Fees', '- ₫72,000'], ['Shipping Cost', '- ₫31,400']].map(([label, value]) => <div key={label} className="flex justify-between text-slate-500"><span>{label}</span><span className="font-medium tabular-nums text-slate-800">{value}</span></div>)}<div className="mt-1 flex justify-between border-t border-slate-200 pt-3 font-semibold text-slate-900"><span>Net Receivable</span><span className="tabular-nums">₫1,096,600</span></div></div></section>
    </div> : null}
    <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 border-t border-slate-200 bg-white/95 p-4 backdrop-blur"><Button variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50">Cancel Order</Button><div className="ml-auto flex gap-2"><Button variant="outline"><Printer className="size-4" />Print Label</Button><Button>Confirm Order</Button></div></div>
  </SheetContent></Sheet>;
}

function FilterDrawer({ open, store, status, onClose, onApply }: { open: boolean; store: string; status: StatusFilter; onClose: () => void; onApply: (store: string, status: StatusFilter) => void }) {
  const [draftStore, setDraftStore] = useState(store);
  const [draftStatus, setDraftStatus] = useState<StatusFilter>(status);
  useEffect(() => { if (open) { setDraftStore(store); setDraftStatus(status); } }, [open, status, store]);
  const stores = ['All Stores', ...Array.from(new Set(orders.map((order) => order.store)))];

  return <Sheet open={open} onOpenChange={(value) => !value && onClose()}><SheetContent className="w-full sm:max-w-md"><SheetHeader><SheetTitle>Advanced Filters</SheetTitle><SheetDescription>Filter orders by channel, lifecycle status, warehouse, and CRM context.</SheetDescription></SheetHeader><div className="mt-6 grid gap-5">
    <div className="grid grid-cols-2 gap-3">
      <label className="grid gap-2 text-sm font-semibold text-slate-700">Store / Channel<select value={draftStore} onChange={(event) => setDraftStore(event.target.value)} className="h-10 min-w-0 rounded-lg border border-slate-200 bg-white px-3 font-medium">{stores.map((option) => <option key={option}>{option}</option>)}</select></label>
      <label className="grid gap-2 text-sm font-semibold text-slate-700">Order Status<select value={draftStatus} onChange={(event) => setDraftStatus(event.target.value as StatusFilter)} className="h-10 min-w-0 rounded-lg border border-slate-200 bg-white px-3 font-medium">{statuses.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}</select></label>
    </div>
    {[['Warehouse / Branch', ['All Warehouses', 'HCM Central Warehouse', 'Binh Duong Warehouse', 'Hanoi Warehouse']], ['CRM Customer Tags', ['All Tags', 'VIP', 'High Return Risk', 'B2B']], ['Order Notes / Tags', ['All Notes', 'Urgent Delivery', 'Gift Order', 'Confirmation Call Required']]].map(([label, options]) => <label key={label as string} className="grid gap-2 text-sm font-semibold text-slate-700">{label as string}<select className="h-10 rounded-lg border border-slate-200 bg-white px-3 font-medium">{(options as string[]).map((option) => <option key={option}>{option}</option>)}</select></label>)}
    <div className="flex gap-2 border-t border-slate-200 pt-4"><Button variant="outline" className="flex-1" onClick={() => { setDraftStore('All Stores'); setDraftStatus('all'); }}>Reset</Button><Button className="flex-1" onClick={() => onApply(draftStore, draftStatus)}>Apply Filters</Button></div>
  </div></SheetContent></Sheet>;
}
