import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  CircleAlert,
  Clock3,
  DollarSign,
  Download,
  Link2,
  ListRestart,
  Package,
  Plus,
  RadioTower,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  Store,
  Unplug,
  Warehouse,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WorkspacePageHeader } from '@/components/system/WorkspacePageHeader';
import { cn } from '@/lib/utils';

type ChannelType = 'E-Commerce/Web' | 'Marketplace' | 'Retail POS';
type ConnectionStatus = 'Connected' | 'Expired' | 'Sync Error';
type DirectoryFilter = 'All' | ChannelType;
type DrawerTab = 'connection' | 'warehouse' | 'rules' | 'logs';

type StoreChannel = {
  id: string;
  name: string;
  account: string;
  avatar: string;
  avatarClass: string;
  type: ChannelType;
  status: ConnectionStatus;
  listings: number;
  warehouse: string | null;
  priceSync: boolean;
  inventorySync: boolean;
  orderSync: boolean;
  token: string;
  lastSync: string;
  errors: number;
};

const initialChannels: StoreChannel[] = [
  { id: 'primeweb', name: 'PrimeWeb', account: 'primebeauty.vn', avatar: 'PW', avatarClass: 'bg-indigo-600 text-white', type: 'E-Commerce/Web', status: 'Connected', listings: 1240, warehouse: 'HCM Central', priceSync: true, inventorySync: true, orderSync: true, token: 'Managed internally', lastSync: '1 minute ago', errors: 0 },
  { id: 'shopee', name: 'Shopee', account: 'Prime Beauty Official', avatar: 'S', avatarClass: 'bg-orange-500 text-white', type: 'Marketplace', status: 'Connected', listings: 1186, warehouse: 'HCM Central', priceSync: true, inventorySync: true, orderSync: true, token: 'Valid for 47 days', lastSync: '2 minutes ago', errors: 0 },
  { id: 'lazada', name: 'Lazada', account: 'Prime Flagship Store', avatar: 'L', avatarClass: 'bg-violet-600 text-white', type: 'Marketplace', status: 'Expired', listings: 972, warehouse: 'Hanoi Hub', priceSync: false, inventorySync: false, orderSync: false, token: 'Expired 18 minutes ago', lastSync: '18 minutes ago', errors: 3 },
  { id: 'amazon', name: 'Amazon', account: 'Prime Beauty US', avatar: 'a', avatarClass: 'bg-slate-900 text-white', type: 'Marketplace', status: 'Sync Error', listings: 684, warehouse: 'Cross-border DC', priceSync: true, inventorySync: false, orderSync: true, token: 'Valid for 62 days', lastSync: '7 minutes ago', errors: 5 },
  { id: 'rakuten', name: 'Rakuten', account: 'Prime Beauty JP', avatar: 'R', avatarClass: 'bg-rose-600 text-white', type: 'Marketplace', status: 'Connected', listings: 416, warehouse: 'Cross-border DC', priceSync: true, inventorySync: true, orderSync: true, token: 'Valid for 74 days', lastSync: '4 minutes ago', errors: 0 },
  { id: 'pos-d1', name: 'PrimePOS', account: 'District 1 Flagship', avatar: 'POS', avatarClass: 'bg-emerald-600 text-white', type: 'Retail POS', status: 'Connected', listings: 1240, warehouse: 'D1 Flagship Store', priceSync: true, inventorySync: true, orderSync: true, token: 'Managed internally', lastSync: 'Real-time', errors: 0 },
  { id: 'tiktok', name: 'TikTok Shop', account: 'Prime Live Store', avatar: 'TT', avatarClass: 'bg-slate-950 text-white', type: 'Marketplace', status: 'Sync Error', listings: 803, warehouse: null, priceSync: true, inventorySync: false, orderSync: true, token: 'Valid for 29 days', lastSync: '11 minutes ago', errors: 4 },
];

const warehouses = ['HCM Central', 'Hanoi Hub', 'Cross-border DC', 'D1 Flagship Store'];

const syncLogs = [
  { id: 'LOG-2048', time: '10:32:18', operation: 'Inventory update', item: 'SKU-HGE-30', error: 'Warehouse mapping missing', status: 'Failed' },
  { id: 'LOG-2047', time: '10:29:04', operation: 'Price update', item: 'SKU-DBC-50', error: 'Marketplace price rule rejected', status: 'Failed' },
  { id: 'LOG-2046', time: '10:21:42', operation: 'Order import', item: 'ORD-91823', error: 'Completed after retry', status: 'Resolved' },
];

const filterTabs: DirectoryFilter[] = ['All', 'E-Commerce/Web', 'Marketplace', 'Retail POS'];

const statusStyles: Record<ConnectionStatus, string> = {
  Connected: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Expired: 'border-rose-200 bg-rose-50 text-rose-700',
  'Sync Error': 'border-amber-200 bg-amber-50 text-amber-700',
};

const statusIcons: Record<ConnectionStatus, LucideIcon> = {
  Connected: CheckCircle2,
  Expired: XCircle,
  'Sync Error': AlertTriangle,
};

function KpiCard({ label, value, detail, icon: Icon, tone = 'indigo', active, onClick }: { label: string; value: string; detail: string; icon: LucideIcon; tone?: 'indigo' | 'emerald' | 'amber' | 'rose'; active?: boolean; onClick?: () => void }) {
  const tones = { indigo: 'bg-indigo-50 text-indigo-700', emerald: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-700', rose: 'bg-rose-50 text-rose-700' };
  const content = <><div className="flex items-start justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p><span className={cn('grid size-8 place-items-center rounded-lg', tones[tone])}><Icon className="size-4" /></span></div><p className="mt-3 text-2xl font-bold tabular-nums text-slate-950">{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></>;
  return onClick ? <button type="button" onClick={onClick} className={cn('rounded-xl border bg-white p-4 text-left transition hover:border-indigo-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2', active ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-200')} aria-pressed={active}>{content}</button> : <article className="rounded-xl border border-slate-200 bg-white p-4">{content}</article>;
}

function BrandLogo({ id, name }: { id: string; name: string }) {
  const common = 'size-7';
  if (id === 'shopee') return <svg viewBox="0 0 32 32" className={common} role="img" aria-label={`${name} logo`}><rect width="32" height="32" rx="8" fill="#EE4D2D"/><path d="M10 12h12l1 12H9l1-12Z" fill="white"/><path d="M12.5 12c0-5 7-5 7 0" fill="none" stroke="white" strokeWidth="2"/><path d="M18.6 15.5c-1.6-.8-4.7-.7-4.7 1 0 2.2 5.1.7 5.1 3 0 1.8-3.3 2-5.4 1" fill="none" stroke="#EE4D2D" strokeWidth="1.5" strokeLinecap="round"/></svg>;
  if (id === 'tiktok') return <svg viewBox="0 0 32 32" className={common} role="img" aria-label={`${name} logo`}><rect width="32" height="32" rx="8" fill="#101014"/><path d="M17 8v10.2a4.2 4.2 0 1 1-3-4V17a1.8 1.8 0 1 0 1 1.6V8h2Zm0 0c.5 3 2.1 4.6 5 5v2.6c-2.1-.2-3.7-1-5-2.1" fill="none" stroke="#25F4EE" strokeWidth="2.1"/><path d="M18.2 8.5c.4 2.5 1.8 3.8 4 4.2" fill="none" stroke="#FE2C55" strokeWidth="2.1"/></svg>;
  if (id === 'lazada') return <svg viewBox="0 0 32 32" className={common} role="img" aria-label={`${name} logo`}><defs><linearGradient id="lz" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#F36"/><stop offset="1" stopColor="#6C2CFF"/></linearGradient></defs><rect width="32" height="32" rx="8" fill="#fff0f5"/><path d="m16 7 10 5.5v9L16 27 6 21.5v-9L16 7Z" fill="url(#lz)"/><path d="m10 13 6 3.5 6-3.5" fill="none" stroke="white" strokeWidth="2"/></svg>;
  if (id === 'amazon') return <svg viewBox="0 0 32 32" className={common} role="img" aria-label={`${name} logo`}><rect width="32" height="32" rx="8" fill="#111827"/><path d="M10 19c3.5 2.6 8.5 3 12.5.5" fill="none" stroke="#FF9900" strokeWidth="2" strokeLinecap="round"/><path d="m21 18 2.5 1.1-1.2 2" fill="none" stroke="#FF9900" strokeWidth="1.5" strokeLinecap="round"/><path d="M14 17v-3c0-2 5-2 5 0v4m-5-2c0 2 5 2 5-.5" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>;
  if (id === 'rakuten') return <svg viewBox="0 0 32 32" className={common} role="img" aria-label={`${name} logo`}><rect width="32" height="32" rx="8" fill="#BF0000"/><path d="M10 9h7c5 0 5 7 0 7h-4v7h-3V9Zm3 3v2h4c1.7 0 1.7-2 0-2h-4Zm4 4 6 7h-4l-5-7h3Z" fill="white"/></svg>;
  if (id === 'primeweb') return <svg viewBox="0 0 32 32" className={common} role="img" aria-label={`${name} logo`}><rect width="32" height="32" rx="8" fill="#4F46E5"/><circle cx="16" cy="16" r="8" fill="none" stroke="white" strokeWidth="1.8"/><path d="M8 16h16M16 8c3 3 3 13 0 16M16 8c-3 3-3 13 0 16" fill="none" stroke="white" strokeWidth="1.5"/></svg>;
  return <svg viewBox="0 0 32 32" className={common} role="img" aria-label={`${name} logo`}><rect width="32" height="32" rx="8" fill="#059669"/><path d="M8 11h16v10H8z" fill="none" stroke="white" strokeWidth="2"/><path d="M11 21v3m10-3v3M12 15h8" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>;
}

function SyncServices({ channel }: { channel: StoreChannel }) {
  const services = [
    { key: 'priceSync' as const, label: 'Price', icon: DollarSign },
    { key: 'inventorySync' as const, label: 'Stock', icon: Package },
    { key: 'orderSync' as const, label: 'Orders', icon: ShoppingCart },
  ];
  return <div className="flex flex-wrap gap-1.5">{services.map((service) => {
    const enabled = channel[service.key];
    const failing = !enabled && channel.status !== 'Connected';
    if (!enabled && !failing) return null;
    const Icon = service.icon;
    return <span key={service.key} className={cn('inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold', failing ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-slate-50 text-slate-600')} title={failing ? `${service.label} sync is failing` : `${service.label} sync is active`}>{failing ? <AlertTriangle className="size-3" /> : <Icon className="size-3" />}{service.label}</span>;
  })}</div>;
}

export function ConnectedChannelsPage() {
  const [channels, setChannels] = useState(initialChannels);
  const [filter, setFilter] = useState<DirectoryFilter>('All');
  const [query, setQuery] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [selectedChannel, setSelectedChannel] = useState<StoreChannel | null>(null);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('connection');
  const [priceMarkup, setPriceMarkup] = useState('0');
  const [showErrorStores, setShowErrorStores] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const pendingErrors = channels.reduce((total, channel) => total + channel.errors, 0);
  const healthyCount = channels.filter((channel) => channel.status === 'Connected').length;
  const publishedListings = channels.reduce((total, channel) => total + channel.listings, 0);
  const visibleChannels = useMemo(() => channels.filter((channel) => {
    const matchesType = filter === 'All' || channel.type === filter;
    const matchesWarehouse = warehouseFilter === 'all' || (warehouseFilter === 'unmapped' ? !channel.warehouse : channel.warehouse === warehouseFilter);
    const text = `${channel.name} ${channel.account} ${channel.type} ${channel.status}`.toLowerCase();
    const matchesErrorFilter = !showErrorStores || channel.status === 'Sync Error' || channel.status === 'Expired';
    return matchesType && matchesWarehouse && matchesErrorFilter && text.includes(query.trim().toLowerCase());
  }), [channels, filter, query, warehouseFilter, showErrorStores]);

  const allVisibleSelected = visibleChannels.length > 0 && visibleChannels.every((channel) => selectedIds.includes(channel.id));
  const toggleAllVisible = (checked: boolean) => setSelectedIds((current) => checked ? Array.from(new Set([...current, ...visibleChannels.map((channel) => channel.id)])) : current.filter((id) => !visibleChannels.some((channel) => channel.id === id)));

  const openDrawer = (channel: StoreChannel, tab: DrawerTab = 'connection') => {
    setSelectedChannel(channel);
    setDrawerTab(tab);
  };

  const updateChannel = (id: string, patch: Partial<StoreChannel>) => {
    setChannels((current) => current.map((channel) => channel.id === id ? { ...channel, ...patch } : channel));
    setSelectedChannel((current) => current?.id === id ? { ...current, ...patch } : current);
  };

  const reconnect = () => {
    if (!selectedChannel) return;
    updateChannel(selectedChannel.id, { status: 'Connected', token: 'Valid for 90 days', lastSync: 'Just now' });
    toast.success(`${selectedChannel.name} reconnected`);
  };

  return (
    <div className="min-h-full bg-slate-50/60 p-4 md:p-6">
      <div className="mx-auto max-w-[1600px] space-y-5">
        <WorkspacePageHeader title="Connected Channels" description="Manage every connected storefront, marketplace store, and retail location from one directory." icon={Store} actions={<Button type="button" onClick={() => toast.info('Connect Store setup opened')}><Plus className="size-4" />Connect Store</Button>} />

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Channel summary">
          <KpiCard label="Connected Stores" value={String(channels.length)} detail={`${healthyCount} healthy connections`} icon={Store} />
          <KpiCard label="Published Listings" value={publishedListings.toLocaleString('en-US')} detail="Across all connected stores" icon={Boxes} tone="emerald" />
          <KpiCard label="System Sync Health" value={`${Math.round((healthyCount / channels.length) * 100)}%`} detail={`${healthyCount} of ${channels.length} stores healthy`} icon={ShieldCheck} tone={healthyCount === channels.length ? 'emerald' : 'amber'} />
          <KpiCard label="Pending Sync Errors" value={String(pendingErrors)} detail={showErrorStores ? 'Filtering stores requiring review' : 'Click to review affected stores'} icon={CircleAlert} tone={pendingErrors ? 'rose' : 'emerald'} active={showErrorStores} onClick={() => setShowErrorStores((value) => !value)} />
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 p-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
              <div className="scrollbar-none flex min-w-0 gap-1 overflow-x-auto">
                {filterTabs.map((tab) => <button key={tab} type="button" onClick={() => setFilter(tab)} className={cn('min-h-10 shrink-0 rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500', filter === tab ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900')} aria-pressed={filter === tab}>{tab}</button>)}
              </div>
              <div className="relative min-w-0 flex-1 xl:ml-auto xl:max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search stores or channels..." className="h-10 pl-9" aria-label="Search connected channels" /></div>
              <Select value={warehouseFilter} onValueChange={setWarehouseFilter}><SelectTrigger className="h-10 w-full xl:w-[220px]" aria-label="Filter by warehouse mapping"><SelectValue placeholder="Warehouse mapping" /></SelectTrigger><SelectContent><SelectItem value="all">All warehouse mappings</SelectItem><SelectItem value="unmapped">Unmapped only</SelectItem>{warehouses.map((warehouse) => <SelectItem key={warehouse} value={warehouse}>{warehouse}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left">
              <thead className="bg-slate-50/70 text-xs font-semibold uppercase tracking-wider text-slate-500"><tr><th className="w-10 px-4 py-3"><Checkbox checked={allVisibleSelected} onCheckedChange={(checked) => toggleAllVisible(checked === true)} aria-label="Select all visible stores" /></th><th className="px-3 py-3">Channel</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Connection</th><th className="px-4 py-3 text-right">Listings</th><th className="px-4 py-3">Physical Warehouse</th><th className="px-4 py-3">Active Sync Services</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {visibleChannels.map((channel) => {
                  const StatusIcon = statusIcons[channel.status];
                  const rowSelected = selectedIds.includes(channel.id);
                  return <tr key={channel.id} className={cn('hover:bg-slate-50/70', rowSelected && 'bg-indigo-50/40')}><td className="px-4 py-3"><Checkbox checked={rowSelected} onCheckedChange={(checked) => setSelectedIds((current) => checked === true ? [...current, channel.id] : current.filter((id) => id !== channel.id))} aria-label={`Select ${channel.name}`} /></td><td className="px-3 py-3"><div className="flex items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white"><BrandLogo id={channel.id} name={channel.name} /></span><div><p className="text-sm font-semibold text-slate-900">{channel.name}</p><p className="mt-0.5 text-xs text-slate-500">{channel.account}</p></div></div></td><td className="px-4 py-3"><span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600">{channel.type}</span></td><td className="px-4 py-3"><span className={cn('inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold', statusStyles[channel.status])}><StatusIcon className="size-3.5" />{channel.status}</span><p className="mt-1 text-xs text-slate-400">{channel.lastSync}</p></td><td className="px-4 py-3 text-right text-sm font-semibold tabular-nums text-slate-900">{channel.listings.toLocaleString('en-US')}</td><td className="px-4 py-3">{channel.warehouse ? <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700"><Warehouse className="size-4 text-slate-400" />{channel.warehouse}</span> : <Select value="" onValueChange={(value) => { updateChannel(channel.id, { warehouse: value }); toast.success(`${channel.name} mapped to ${value}`); }}><SelectTrigger className="h-9 w-[180px] border-amber-300 bg-amber-50 text-xs text-amber-800" aria-label={`Map warehouse for ${channel.name}`}><SelectValue placeholder="Map warehouse..." /></SelectTrigger><SelectContent>{warehouses.map((warehouse) => <SelectItem key={warehouse} value={warehouse}>{warehouse}</SelectItem>)}</SelectContent></Select>}</td><td className="px-4 py-3"><SyncServices channel={channel} /></td><td className="px-4 py-3"><div className="flex justify-end gap-2">{channel.status === 'Expired' ? <Button size="sm" onClick={() => openDrawer(channel, 'connection')}><RefreshCw className="size-4" />Reconnect</Button> : channel.status === 'Sync Error' ? <Button size="sm" variant="outline" className="border-amber-200 text-amber-700 hover:bg-amber-50" onClick={() => openDrawer(channel, 'logs')}><AlertTriangle className="size-4" />Fix Errors</Button> : <Button size="sm" variant="outline" onClick={() => openDrawer(channel)}><Settings2 className="size-4" />Configure</Button>}</div></td></tr>;
                })}
              </tbody>
            </table>
          </div>
          {!visibleChannels.length ? <div className="border-t border-slate-200 px-6 py-14 text-center"><p className="font-semibold text-slate-900">No matching channels</p><p className="mt-1 text-sm text-slate-500">Clear the search or choose another channel type.</p></div> : null}
        </section>
      </div>

      <Sheet open={Boolean(selectedChannel)} onOpenChange={(open) => { if (!open) setSelectedChannel(null); }}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-[600px]">
          {selectedChannel ? <>
            <SheetHeader className="border-b border-slate-200 px-6 py-5 pr-14"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-lg border border-slate-200 bg-white"><BrandLogo id={selectedChannel.id} name={selectedChannel.name} /></span><div><SheetTitle>{selectedChannel.name} configuration</SheetTitle><SheetDescription>{selectedChannel.account} · {selectedChannel.type}</SheetDescription></div></div></SheetHeader>
            <Tabs value={drawerTab} onValueChange={(value) => setDrawerTab(value as DrawerTab)} className="flex min-h-0 flex-1 flex-col">
              <TabsList className="h-auto w-full justify-start gap-0 overflow-x-auto rounded-none border-b border-slate-200 bg-white px-4 py-0">
                {[['connection', 'Connection & Auth'], ['warehouse', 'Warehouse Mapping'], ['rules', 'Sync Rules'], ['logs', 'Logs & Retry']].map(([value, label]) => <TabsTrigger key={value} value={value} className="min-h-11 rounded-none border-b-2 border-transparent px-3 text-xs data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-700 data-[state=active]:shadow-none">{label}</TabsTrigger>)}
              </TabsList>
              <div className="min-h-0 flex-1 overflow-y-auto p-6">
                <TabsContent value="connection" className="mt-0 space-y-5"><section className="rounded-xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-slate-900">Authorization token</p><p className="mt-1 text-xs text-slate-500">{selectedChannel.token}</p></div><span className={cn('rounded-md border px-2 py-1 text-xs font-semibold', statusStyles[selectedChannel.status])}>{selectedChannel.status}</span></div><div className="mt-4 border-t border-slate-100 pt-4 text-xs text-slate-500">Last successful sync: {selectedChannel.lastSync}</div></section><Button type="button" onClick={reconnect}><RefreshCw className="size-4" />Reconnect account</Button><div className="border-t border-slate-200 pt-5"><p className="text-sm font-semibold text-slate-900">Disconnect channel</p><p className="mt-1 text-xs leading-5 text-slate-500">Stops new order, inventory, and price synchronization. Existing Prime OS data is retained.</p><Button type="button" variant="outline" className="mt-3 border-rose-200 text-rose-700 hover:bg-rose-50"><Unplug className="size-4" />Disconnect</Button></div></TabsContent>
                <TabsContent value="warehouse" className="mt-0 space-y-5"><div><label className="text-sm font-semibold text-slate-900" htmlFor="channel-warehouse">Physical fulfillment warehouse</label><p className="mb-3 mt-1 text-xs leading-5 text-slate-500">Route imported orders and shared inventory to this Prime OS warehouse.</p><Select value={selectedChannel.warehouse ?? ''} onValueChange={(value) => updateChannel(selectedChannel.id, { warehouse: value })}><SelectTrigger id="channel-warehouse"><SelectValue placeholder="Select physical warehouse" /></SelectTrigger><SelectContent>{warehouses.map((warehouse) => <SelectItem key={warehouse} value={warehouse}>{warehouse}</SelectItem>)}</SelectContent></Select></div><div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4"><div className="flex gap-3"><Warehouse className="mt-0.5 size-4 shrink-0 text-indigo-700" /><div><p className="text-sm font-semibold text-indigo-950">Mapping affects ATP and dispatch</p><p className="mt-1 text-xs leading-5 text-indigo-800">Inventory updates use this warehouse as the stock source. New orders are allocated here unless routing rules override it.</p></div></div></div></TabsContent>
                <TabsContent value="rules" className="mt-0 space-y-6"><div><label htmlFor="price-markup" className="text-sm font-semibold text-slate-900">Channel price markup</label><div className="relative mt-2"><Input id="price-markup" type="number" value={priceMarkup} onChange={(event) => setPriceMarkup(event.target.value)} className="pr-10" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">%</span></div><p className="mt-2 text-xs text-slate-500">Applied to the Master Catalog base price before channel-specific rounding.</p></div>{[['priceSync', 'Automatic price sync', 'Push approved catalog price changes to this channel.'], ['inventorySync', 'Automatic inventory sync', 'Publish available-to-promise stock from the mapped warehouse.'], ['orderSync', 'Automatic order import', 'Import new channel orders into Order Management.']].map(([field, title, detail]) => <div key={field} className="flex items-start justify-between gap-4 border-t border-slate-200 pt-5"><div><p className="text-sm font-semibold text-slate-900">{title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p></div><Switch checked={selectedChannel[field as 'priceSync' | 'inventorySync' | 'orderSync']} onCheckedChange={(checked) => updateChannel(selectedChannel.id, { [field]: checked })} aria-label={title} /></div>)}<Button type="button" onClick={() => toast.success('Sync rules saved')}>Save sync rules</Button></TabsContent>
                <TabsContent value="logs" className="mt-0 space-y-4"><div className="flex items-center justify-between gap-4"><div><h3 className="text-sm font-semibold text-slate-900">Recent API activity</h3><p className="mt-1 text-xs text-slate-500">Retry failed operations after fixing their source issue.</p></div><Button type="button" size="sm" variant="outline" onClick={() => toast.success('All eligible sync operations queued')}><ListRestart className="size-4" />Retry all</Button></div><div className="overflow-hidden rounded-xl border border-slate-200"><div className="divide-y divide-slate-100">{syncLogs.map((log) => <div key={log.id} className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-slate-900">{log.operation} · {log.item}</p><p className="mt-1 text-xs text-slate-500">{log.id} · {log.time}</p></div><span className={cn('text-xs font-semibold', log.status === 'Failed' ? 'text-rose-700' : 'text-emerald-700')}>{log.status}</span></div><p className="mt-2 text-xs leading-5 text-slate-600">{log.error}</p>{log.status === 'Failed' ? <Button type="button" size="sm" variant="outline" className="mt-3" onClick={() => toast.success(`${log.id} queued for retry`)}><RefreshCw className="size-4" />Retry Sync</Button> : null}</div>)}</div></div></TabsContent>
              </div>
            </Tabs>
          </> : null}
        </SheetContent>
      </Sheet>
      {selectedIds.length ? <div className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-slate-200 bg-slate-950 px-3 py-2 text-white shadow-2xl"><span className="px-2 text-xs font-semibold tabular-nums">{selectedIds.length} selected</span><span className="h-6 w-px bg-slate-700" /><Button type="button" size="sm" variant="ghost" className="text-white hover:bg-slate-800 hover:text-white" onClick={() => toast.success(`${selectedIds.length} stores queued for re-sync`)}><RefreshCw className="size-4" />Bulk Re-sync</Button><Button type="button" size="sm" variant="ghost" className="text-white hover:bg-slate-800 hover:text-white" onClick={() => toast.success(`${selectedIds.length} stores queued for reconnect`)}><Link2 className="size-4" />Bulk Reconnect</Button><Button type="button" size="sm" variant="ghost" className="text-white hover:bg-slate-800 hover:text-white" onClick={() => toast.success('Store logs export prepared')}><Download className="size-4" />Export Store Logs</Button><button type="button" className="grid size-8 place-items-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-white" onClick={() => setSelectedIds([])} aria-label="Clear store selection"><XCircle className="size-4" /></button></div> : null}
    </div>
  );
}

const liveSessions = [
  { name: '8.8 Beauty Mega Live', channel: 'TikTok Shop', host: 'Linh Nguyen', allocated: 800, reserved: 612, orders: 284, status: 'Live now' },
  { name: 'Shopee Payday Showcase', channel: 'Shopee Live', host: 'Mai Anh', allocated: 540, reserved: 318, orders: 126, status: 'Starts in 1h' },
  { name: 'PrimeWeb Product Drop', channel: 'PrimeWeb', host: 'Brand Team', allocated: 320, reserved: 0, orders: 0, status: 'Scheduled' },
];

export function LiveCommercePage() {
  return <div className="min-h-full bg-slate-50/60 p-4 md:p-6"><div className="mx-auto max-w-[1600px] space-y-5"><WorkspacePageHeader title="Live Commerce" description="Plan livestream sessions, reserve sellable stock, and monitor real-time order capture." icon={RadioTower} actions={<Button><RadioTower className="size-4" />Create Live Session</Button>} /><section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><KpiCard label="Active Sessions" value="1" detail="2 sessions scheduled today" icon={RadioTower} tone="rose" /><KpiCard label="Allocated Stock" value="1,660" detail="Across active and scheduled sessions" icon={Boxes} /><KpiCard label="Reserved / Sold" value="930" detail="56% of allocated live stock" icon={Clock3} tone="amber" /><KpiCard label="Live Orders" value="410" detail="$48,620 attributed revenue" icon={Store} tone="emerald" /></section><section className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold text-slate-900">Session operations</h2><p className="mt-1 text-xs text-slate-500">Stock reservation, host ownership, and live order capture by session.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[900px]"><thead className="bg-slate-50/70 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Session</th><th className="px-4 py-3">Channel / Host</th><th className="px-4 py-3 text-right">Allocated</th><th className="px-4 py-3 text-right">Reserved</th><th className="px-4 py-3 text-right">Orders</th><th className="px-5 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{liveSessions.map((session) => <tr key={session.name} className="hover:bg-slate-50/70"><td className="px-5 py-4 text-sm font-semibold text-slate-900">{session.name}</td><td className="px-4 py-4"><p className="text-sm font-medium text-slate-700">{session.channel}</p><p className="mt-0.5 text-xs text-slate-500">Host: {session.host}</p></td><td className="px-4 py-4 text-right text-sm font-semibold tabular-nums">{session.allocated}</td><td className="px-4 py-4 text-right text-sm font-semibold tabular-nums">{session.reserved}</td><td className="px-4 py-4 text-right text-sm font-semibold tabular-nums">{session.orders}</td><td className="px-5 py-4"><span className={cn('rounded-md border px-2 py-1 text-xs font-semibold', session.status === 'Live now' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-slate-200 bg-slate-50 text-slate-600')}>{session.status}</span></td></tr>)}</tbody></table></div></section></div></div>;
}
