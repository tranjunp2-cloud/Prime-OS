import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, CircleDot, Copy, DollarSign, Download, ExternalLink, Info, MoreHorizontal, PackageX, Pencil, Plus, Search, Send, ShoppingBag, SlidersHorizontal, Store, Trash2, Unplug, Warehouse, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { WorkspacePageHeader } from '@/components/system/WorkspacePageHeader';
import { useToast } from '@/hooks/use-toast';
import { getProducts, updateProduct, type Product } from '@/lib/product-store';
import { getWarehouses } from '@/lib/warehouse-store';
import { formatLocalizedMoney } from '@/lib/i18n/format';
import { useI18n } from '@/lib/i18n/I18nContext';
import { getProductImage } from '@/lib/constants';
import { cn } from '@/lib/utils';

type SyncStatus = 'synced' | 'pending' | 'error' | 'missing';
type ChannelKey = 'primeweb' | 'pos' | 'shopee' | 'lazada' | 'amazon' | 'rakuten';
type CatalogView = 'all' | 'active' | 'unlisted' | 'other';
type VariantFilter = 'all' | 'with-variants' | 'single';
type StockFilter = 'all' | 'in-stock' | 'low-stock' | 'out-of-stock';

const lowStockThreshold = 20;
const warehouseNames = Object.fromEntries(getWarehouses().map(warehouse => [warehouse.id, warehouse.name])) as Record<string, string>;

function getStockSummary(product: Product) {
  const available = Object.values(product.inventory ?? {}).reduce((total, quantity) => total + Number(quantity || 0), 0);
  const status: Exclude<StockFilter, 'all'> = available <= 0 ? 'out-of-stock' : available <= lowStockThreshold ? 'low-stock' : 'in-stock';
  return { available, status };
}

const channels: Array<{ key: ChannelKey; label: string; shortLabel: string; icon: typeof Store }> = [
  { key: 'primeweb', label: 'PrimeWeb', shortLabel: 'PW', icon: ShoppingBag },
  { key: 'pos', label: 'PrimePOS', shortLabel: 'POS', icon: Store },
  { key: 'shopee', label: 'Shopee', shortLabel: 'S', icon: ShoppingBag },
  { key: 'lazada', label: 'Lazada', shortLabel: 'L', icon: ShoppingBag },
  { key: 'amazon', label: 'Amazon', shortLabel: 'A', icon: ShoppingBag },
  { key: 'rakuten', label: 'Rakuten', shortLabel: 'R', icon: ShoppingBag },
];
const pinnedChannelKeys: ChannelKey[] = ['primeweb', 'pos', 'shopee'];
const pinnedChannels = channels.filter((channel) => pinnedChannelKeys.includes(channel.key));
const overflowChannels = channels.filter((channel) => !pinnedChannelKeys.includes(channel.key));

const statusTone: Record<SyncStatus, string> = {
  synced: 'bg-emerald-500',
  pending: 'bg-amber-400',
  error: 'bg-rose-500',
  missing: 'bg-slate-300',
};

const statusLabel: Record<SyncStatus, string> = { synced: 'Synced', pending: 'Pending', error: 'Error', missing: 'Not published' };
function getChannelMatrix(index: number): Record<ChannelKey, SyncStatus> {
  const patterns: Array<Record<ChannelKey, SyncStatus>> = [
    { primeweb: 'synced', pos: 'synced', shopee: 'synced', lazada: 'synced', amazon: 'pending', rakuten: 'missing' },
    { primeweb: 'synced', pos: 'synced', shopee: 'error', lazada: 'pending', amazon: 'synced', rakuten: 'pending' },
    { primeweb: 'synced', pos: 'pending', shopee: 'synced', lazada: 'error', amazon: 'missing', rakuten: 'synced' },
    { primeweb: 'synced', pos: 'synced', shopee: 'pending', lazada: 'synced', amazon: 'error', rakuten: 'missing' },
  ];
  return patterns[index % patterns.length];
}

function ChannelLogo({ channel, size = 'md', muted = false }: { channel: (typeof channels)[number]; size?: 'sm' | 'md' | 'lg'; muted?: boolean }) {
  const logo = (() => {
    switch (channel.key) {
      case 'primeweb':
        return <svg viewBox="0 0 48 48" className="size-full"><rect width="48" height="48" rx="12" fill="#EEF2FF" /><circle cx="24" cy="24" r="14" fill="none" stroke="#4F46E5" strokeWidth="3" /><path d="M10 24h28M24 10c5 5 7 9 7 14s-2 9-7 14c-5-5-7-9-7-14s2-9 7-14Z" fill="none" stroke="#4F46E5" strokeWidth="2.5" /></svg>;
      case 'pos':
        return <svg viewBox="0 0 48 48" className="size-full"><rect width="48" height="48" rx="12" fill="#ECFEFF" /><path d="M12 20h24l-2.5-8h-19L12 20Z" fill="#0891B2" /><path d="M14 22v13h20V22M19 35v-8h10v8" fill="none" stroke="#0891B2" strokeWidth="3" strokeLinejoin="round" /></svg>;
      case 'shopee':
        return <svg viewBox="0 0 48 48" className="size-full"><path d="M10 16h28l-2 27H12l-2-27Z" fill="#EE4D2D" /><path d="M17 17v-4a7 7 0 0 1 14 0v4" fill="none" stroke="#EE4D2D" strokeWidth="3" /><path d="M29.5 23.5c-1.4-1.1-3-1.7-5.2-1.7-3 0-5 1.5-5 3.8 0 5.5 10.2 2.1 10.2 7.4 0 2.3-2.1 4-5.4 4-2.2 0-4.1-.7-5.6-2" fill="none" stroke="white" strokeWidth="2.6" strokeLinecap="round" /></svg>;
      case 'lazada':
        return <svg viewBox="0 0 48 48" className="size-full"><defs><linearGradient id="lazada-gradient" x1="8" y1="8" x2="40" y2="40"><stop stopColor="#F97316" /><stop offset=".5" stopColor="#EC4899" /><stop offset="1" stopColor="#4F46E5" /></linearGradient></defs><path d="M24 5 42 15v18L24 43 6 33V15L24 5Z" fill="url(#lazada-gradient)" /><path d="M15 19.5c0-4.6 5.7-6.5 9-2.8 3.3-3.7 9-1.8 9 2.8 0 5-5.4 8.7-9 11.8-3.6-3.1-9-6.8-9-11.8Z" fill="white" /></svg>;
      case 'amazon':
        return <svg viewBox="0 0 48 48" className="size-full"><rect width="48" height="48" rx="12" fill="#111827" /><path d="M27.7 27.1c-2 1.5-3.8 2.3-5.8 2.3-2.7 0-4.5-1.7-4.5-4.3 0-2 .9-3.5 2.6-4.4 1.5-.8 3.7-1.2 7.5-1.6v-1c0-2-1-2.8-3.1-2.8-1.8 0-3.1.7-3.6 2.2l-2.7-.3c.5-2.7 2.7-4.3 6.6-4.3 2.2 0 4 .6 4.9 1.7.7.8.9 1.8.9 3.6v6.4c0 1.4.2 1.7 1.2 1.7h.5v2.4c-.6.2-1.1.2-1.7.2-1.6 0-2.4-.5-2.8-1.8Zm-.2-5.8c-4.9.4-7 1.4-7 3.7 0 1.3.9 2.1 2.4 2.1 1.6 0 3.3-.7 4.6-2v-3.8Z" fill="white" /><path d="M13 34c7.5 4.3 15.7 4.7 23.5.6" fill="none" stroke="#FF9900" strokeWidth="2.6" strokeLinecap="round" /></svg>;
      case 'rakuten':
        return <svg viewBox="0 0 48 48" className="size-full"><rect width="48" height="48" rx="12" fill="#FFF1F2" /><path d="M15 10h10.5c7 0 10.5 3.2 10.5 8.3 0 3.8-2.1 6.5-6.1 7.6L37 36h-7.4l-6.1-9.1h-2.2V36H15V10Zm6.3 5.2v6.5h3.8c3 0 4.5-1.1 4.5-3.3 0-2.1-1.5-3.2-4.5-3.2h-3.8Z" fill="#BF0000" /><path d="M11 40h27" stroke="#BF0000" strokeWidth="3" /></svg>;
    }
  })();
  return <span className={cn('inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-white', size === 'sm' ? 'size-6' : size === 'lg' ? 'size-9' : 'size-7', muted && 'grayscale opacity-35')} aria-hidden="true">{logo}</span>;
}

function ChannelMark({ channel, status, price, onClick }: { channel: (typeof channels)[number]; status: SyncStatus; price: string; onClick: () => void }) {
  return <Tooltip><TooltipTrigger asChild><button type="button" onClick={onClick} className="relative grid size-9 place-items-center rounded-md transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" aria-label={`${channel.label}: ${statusLabel[status]} (${price}). Open listing actions.`}><ChannelLogo channel={channel} muted={status === 'missing'} /><span className={cn('absolute right-0.5 top-0.5 size-2.5 rounded-full border-2 border-white', statusTone[status])} /></button></TooltipTrigger><TooltipContent side="top" className="text-xs">{channel.label}: {statusLabel[status]} ({price})</TooltipContent></Tooltip>;
}

function ChannelOverflow({ matrix, onClick }: { matrix: Record<ChannelKey, SyncStatus>; onClick: () => void }) {
  return <Tooltip><TooltipTrigger asChild><button type="button" onClick={onClick} className="inline-flex h-8 items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-600 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" aria-label={`Show ${overflowChannels.length} more channel listings`}>+{overflowChannels.length} more</button></TooltipTrigger><TooltipContent side="top" align="start" className="w-60 p-2"><p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">All channel statuses</p><div className="space-y-0.5">{channels.map((channel) => <div key={channel.key} className="flex items-center gap-2 rounded-md px-2 py-1.5"><ChannelLogo channel={channel} size="sm" muted={matrix[channel.key] === 'missing'} /><span className="flex-1 text-xs font-medium text-slate-700">{channel.label}</span><span className={cn('size-2 rounded-full', statusTone[matrix[channel.key]])} /><span className="text-[10px] text-slate-500">{statusLabel[matrix[channel.key]]}</span></div>)}</div><p className="mt-1 border-t border-slate-100 px-2 pt-1.5 text-[10px] text-slate-400">Click to manage all channels</p></TooltipContent></Tooltip>;
}

function StockStatusCell({ product, onClick }: { product: Product; onClick: () => void }) {
  const { available, status } = getStockSummary(product);
  const config = status === 'out-of-stock'
    ? { label: 'Out of stock', icon: PackageX, tone: 'border-rose-200 bg-rose-50 text-rose-700', value: 'text-rose-700' }
    : status === 'low-stock'
      ? { label: 'Low stock', icon: AlertTriangle, tone: 'border-amber-200 bg-amber-50 text-amber-700', value: 'text-amber-700' }
      : { label: 'In stock', icon: CheckCircle2, tone: 'border-emerald-200 bg-emerald-50 text-emerald-700', value: 'text-slate-900' };
  const Icon = config.icon;
  return <button type="button" onClick={onClick} className="group/stock min-h-11 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" aria-label={`${product.name}: ${available} available, ${config.label}. Manage stock.`}><span className={cn('block text-sm font-bold tabular-nums', config.value)}>{available.toLocaleString()} available</span><span className={cn('mt-1 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold', config.tone)}><Icon className="size-3" />{config.label}</span></button>;
}

export default function Products() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { locale } = useI18n();
  const [search, setSearch] = useState('');
  const [syncFilter, setSyncFilter] = useState<'all' | 'missing-shopee' | 'errors' | 'pending'>('all');
  const [catalogView, setCatalogView] = useState<CatalogView>('all');
  const [channelFilter, setChannelFilter] = useState<'all' | ChannelKey>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [variantFilter, setVariantFilter] = useState<VariantFilter>('all');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [legendFilter, setLegendFilter] = useState<'all' | SyncStatus>('all');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [listingTarget, setListingTarget] = useState<{ product: Product; channel?: ChannelKey } | null>(null);
  const [stockTarget, setStockTarget] = useState<Product | null>(null);
  const [, setStockRevision] = useState(0);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, Partial<Record<ChannelKey, SyncStatus>>>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const products = getProducts();

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 120);
    return () => clearTimeout(timer);
  }, []);

  const rows = useMemo(() => products.filter((product) => !hiddenIds.includes(product.id)).map((product, index) => ({ product, matrix: { ...getChannelMatrix(index), ...statusOverrides[product.id] } })), [hiddenIds, products, statusOverrides]);
  const categories = useMemo(() => Array.from(new Set(products.map((product) => product.category).filter(Boolean))).sort(), [products]);
  const isActive = (product: Product, matrix: Record<ChannelKey, SyncStatus>) => product.status === 'published' && Object.values(matrix).some((value) => value === 'synced');
  const isUnlisted = (product: Product, matrix: Record<ChannelKey, SyncStatus>) => product.status === 'draft' || product.status === 'archived' || Object.values(matrix).every((value) => value === 'missing');
  const catalogCounts = useMemo(() => ({
    all: rows.length,
    active: rows.filter(({ product, matrix }) => isActive(product, matrix)).length,
    unlisted: rows.filter(({ product, matrix }) => isUnlisted(product, matrix)).length,
    other: rows.filter(({ product, matrix }) => !isActive(product, matrix) && !isUnlisted(product, matrix)).length,
  }), [rows]);
  const filtered = useMemo(() => rows.filter(({ product, matrix }) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || `${product.name} ${product.sku_code} ${product.category} ${product.brand}`.toLowerCase().includes(query);
    const matchesSync = syncFilter === 'all' || (syncFilter === 'missing-shopee' ? matrix.shopee === 'missing' || matrix.shopee === 'error' : syncFilter === 'errors' ? Object.values(matrix).includes('error') : Object.values(matrix).includes('pending'));
    const matchesView = catalogView === 'all' || (catalogView === 'active' ? isActive(product, matrix) : catalogView === 'unlisted' ? isUnlisted(product, matrix) : !isActive(product, matrix) && !isUnlisted(product, matrix));
    const matchesChannel = channelFilter === 'all' || matrix[channelFilter] !== 'missing';
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    const variantCount = product.skus?.length ?? 0;
    const matchesVariants = variantFilter === 'all' || (variantFilter === 'with-variants' ? variantCount > 0 : variantCount === 0);
    const matchesStock = stockFilter === 'all' || getStockSummary(product).status === stockFilter;
    const matchesLegend = legendFilter === 'all' || Object.values(matrix).includes(legendFilter);
    return matchesSearch && matchesSync && matchesView && matchesChannel && matchesCategory && matchesVariants && matchesStock && matchesLegend;
  }), [catalogView, categoryFilter, channelFilter, legendFilter, rows, search, stockFilter, syncFilter, variantFilter]);

  const readiness = useMemo(() => channels.map((channel) => ({
    ...channel,
    published: rows.filter(({ matrix }) => matrix[channel.key] === 'synced').length,
    total: rows.length,
  })), [rows]);

  function updateListingStatuses(product: Product, selectedChannels: ChannelKey[], nextStatus: SyncStatus) {
    setStatusOverrides((current) => ({ ...current, [product.id]: { ...current[product.id], ...Object.fromEntries(selectedChannels.map((channel) => [channel, nextStatus])) } }));
    toast({ title: nextStatus === 'missing' ? 'Listings unpublished' : 'Publishing queued', description: `${product.name}: ${selectedChannels.length} channel${selectedChannels.length === 1 ? '' : 's'} updated.` });
    setListingTarget(null);
  }

  function clearCatalogFilters() {
    setSearch('');
    setChannelFilter('all');
    setCategoryFilter('all');
    setSyncFilter('all');
    setVariantFilter('all');
    setStockFilter('all');
    setLegendFilter('all');
  }

  const toggleProduct = (id: string) => setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const selectedProducts = rows.filter(({ product }) => selectedIds.includes(product.id));
  const runBulkAction = (action: string) => {
    if (action === 'Delete') { setHiddenIds((current) => [...current, ...selectedIds]); setSelectedIds([]); }
    toast({ title: action, description: `${selectedIds.length} master product${selectedIds.length === 1 ? '' : 's'} selected.` });
  };

  function exportProducts(scope: 'filtered' | 'all') {
    const exportRows = scope === 'filtered' ? filtered : rows;
    const header = ['Product', 'Master SKU', 'Category', 'Base Price', 'Variants', ...channels.map((channel) => channel.label)];
    const values = exportRows.map(({ product, matrix }) => [product.name, product.sku_code, product.category, product.retail_price, product.skus?.length ?? 0, ...channels.map((channel) => matrix[channel.key])]);
    const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const csv = [header, ...values].map((row) => row.map(escape).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `master-catalog-${scope}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Catalog exported', description: `${exportRows.length} products exported to CSV.` });
  }

  return <div className="space-y-5 p-4 md:p-6">
    <WorkspacePageHeader title="Product Master" description="Manage product master data once and publish consistently across every sales channel." icon={ShoppingBag} actions={<Button onClick={() => navigate('/products/new')}><Plus className="size-4" />Add Master Product</Button>} />

    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6" aria-label="Channel readiness">
      {readiness.map((channel) => {
        const percentage = channel.total ? Math.round((channel.published / channel.total) * 100) : 0;
        const selected = channelFilter === channel.key;
        return <button type="button" key={channel.key} aria-pressed={selected} onClick={() => { setChannelFilter(selected ? 'all' : channel.key); setLegendFilter('all'); }} className={cn('rounded-xl border bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500', selected ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-slate-200')}>
          <div className="flex items-center gap-2"><ChannelLogo channel={channel} size="lg" /><div><h2 className="text-sm font-semibold text-slate-900">{channel.label}</h2><p className="text-xs text-slate-500"><span className="font-semibold tabular-nums text-slate-700">{channel.published}</span> / {channel.total} published</p></div></div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${percentage}%` }} /></div>
        </button>;
      })}
    </section>

    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 px-3" aria-label="Catalog status">
        {([['all', 'All'], ['active', 'Active'], ['unlisted', 'Unlisted'], ['other', 'Other']] as Array<[CatalogView, string]>).map(([key, label]) => <button key={key} type="button" onClick={() => setCatalogView(key)} className={cn('relative min-h-11 shrink-0 px-3 text-sm font-semibold transition-colors', catalogView === key ? 'text-primary after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-primary' : 'text-slate-500 hover:text-slate-900')}>{label}<span className={cn('ml-1.5 text-xs tabular-nums', catalogView === key ? 'text-primary/75' : 'text-slate-400')}>{catalogCounts[key]}</span></button>)}
      </nav>
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 xl:flex-row xl:items-center">
        <div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by title, master SKU, or category..." className="h-10 pl-9 pr-9" />{search ? <button type="button" onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center text-slate-400 hover:text-slate-700"><X className="size-4" /></button> : null}</div>
        <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-5 xl:flex">
          <label className="sr-only" htmlFor="channel-filter">Store / channel</label><select id="channel-filter" value={channelFilter} onChange={(event) => setChannelFilter(event.target.value as 'all' | ChannelKey)} className="h-10 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700"><option value="all">All stores ({channels.length}/{channels.length})</option>{channels.map((channel) => <option key={channel.key} value={channel.key}>{channel.label}</option>)}</select>
          <label className="sr-only" htmlFor="category-filter">Category</label><select id="category-filter" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="h-10 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700"><option value="all">All categories</option>{categories.map((category) => <option key={category}>{category}</option>)}</select>
          <label className="sr-only" htmlFor="stock-filter">Stock status</label><select id="stock-filter" value={stockFilter} onChange={(event) => setStockFilter(event.target.value as StockFilter)} className="h-10 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700"><option value="all">All stock</option><option value="in-stock">In stock</option><option value="low-stock">Low stock</option><option value="out-of-stock">Out of stock</option></select>
          <Button variant="outline" className="h-10 border-slate-200" onClick={() => setAdvancedOpen(true)} aria-label="Open advanced filters"><SlidersHorizontal className="size-4" />Filters{syncFilter !== 'all' || variantFilter !== 'all' ? <span className="grid size-5 place-items-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700">{Number(syncFilter !== 'all') + Number(variantFilter !== 'all')}</span> : null}</Button>
          <div className="flex"><Button variant="outline" className="h-10 rounded-r-none border-slate-200" onClick={() => exportProducts('filtered')}><Download className="size-4" />Export</Button><label className="sr-only" htmlFor="export-scope">Export scope</label><select id="export-scope" defaultValue="filtered" onChange={(event) => { const scope = event.target.value as 'filtered' | 'all'; if (scope === 'all') exportProducts('all'); event.target.value = 'filtered'; }} className="h-10 w-10 rounded-r-lg border border-l-0 border-slate-200 bg-white px-1 text-sm text-slate-600"><option value="filtered">▾</option><option value="all">All</option></select></div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50/40 px-4 py-2"><span className="mr-1 text-xs font-semibold text-slate-500">Channel status</span>{(['synced', 'pending', 'error', 'missing'] as SyncStatus[]).map((item) => <button key={item} type="button" onClick={() => setLegendFilter((current) => current === item ? 'all' : item)} className={cn('inline-flex min-h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold transition-colors', legendFilter === item ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-white')}><span className={cn('size-2 rounded-full', statusTone[item])} />{statusLabel[item]}</button>)}<span className="ml-auto text-xs tabular-nums text-slate-500">{filtered.length} products</span></div>
      {search || channelFilter !== 'all' || categoryFilter !== 'all' || stockFilter !== 'all' || syncFilter !== 'all' || variantFilter !== 'all' ? <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50/50 px-4 py-2 text-xs"><span className="font-semibold text-slate-500">Active filters</span>{channelFilter !== 'all' ? <button type="button" onClick={() => setChannelFilter('all')} className="inline-flex min-h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 font-semibold text-slate-700">{channels.find((channel) => channel.key === channelFilter)?.label}<X className="size-3" /></button> : null}{categoryFilter !== 'all' ? <button type="button" onClick={() => setCategoryFilter('all')} className="inline-flex min-h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 font-semibold text-slate-700">{categoryFilter}<X className="size-3" /></button> : null}{stockFilter !== 'all' ? <button type="button" onClick={() => setStockFilter('all')} className="inline-flex min-h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 font-semibold text-slate-700">{stockFilter === 'in-stock' ? 'In stock' : stockFilter === 'low-stock' ? 'Low stock' : 'Out of stock'}<X className="size-3" /></button> : null}{syncFilter !== 'all' ? <button type="button" onClick={() => setSyncFilter('all')} className="inline-flex min-h-8 items-center gap-1 rounded-md border border-indigo-200 bg-white px-2 font-semibold text-indigo-700">{syncFilter === 'errors' ? 'Sync errors' : syncFilter === 'pending' ? 'Pending publication' : 'Shopee missing/error'}<X className="size-3" /></button> : null}{variantFilter !== 'all' ? <button type="button" onClick={() => setVariantFilter('all')} className="inline-flex min-h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 font-semibold text-slate-700">{variantFilter === 'with-variants' ? 'With variants' : 'Single products'}<X className="size-3" /></button> : null}<button type="button" onClick={clearCatalogFilters} className="ml-auto min-h-8 font-semibold text-indigo-700">Clear all</button></div> : null}

      <TooltipProvider delayDuration={150}><div className="overflow-x-auto"><table className="w-full min-w-[1240px] text-left"><thead className="border-b border-slate-200 bg-slate-50/60"><tr><th className="w-12 px-4 py-3"><Checkbox checked={filtered.length > 0 && filtered.every(({ product }) => selectedIds.includes(product.id))} onCheckedChange={() => setSelectedIds(filtered.every(({ product }) => selectedIds.includes(product.id)) ? selectedIds.filter((id) => !filtered.some(({ product }) => product.id === id)) : Array.from(new Set([...selectedIds, ...filtered.map(({ product }) => product.id)])))} aria-label="Select all visible products" /></th>{['PRODUCT', 'MASTER SKU & BASE PRICE', 'VARIANTS', 'AVAILABLE STOCK', 'CHANNEL MATRIX STATUS', 'ACTIONS'].map((header) => <th key={header} className={cn('px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500', header === 'ACTIONS' && 'text-right')}><span className={cn('inline-flex items-center gap-1', header === 'ACTIONS' && 'w-full justify-end')}>{header}{header === 'AVAILABLE STOCK' ? <Tooltip><TooltipTrigger asChild><button type="button" className="grid size-6 place-items-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="How available stock is calculated"><Info className="size-3.5" /></button></TooltipTrigger><TooltipContent className="max-w-64 text-xs">Available stock is the sellable quantity across all warehouse locations. Open a product to update its allocation.</TooltipContent></Tooltip> : null}</span></th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">{isLoading ? Array.from({ length: 6 }).map((_, index) => <tr key={index}><td className="px-4 py-3"><Skeleton className="size-4" /></td><td className="px-4 py-3"><div className="flex items-center gap-3"><Skeleton className="size-10 rounded-lg" /><div className="space-y-2"><Skeleton className="h-4 w-44" /><Skeleton className="h-3 w-28" /></div></div></td><td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td><td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td><td className="px-4 py-3"><Skeleton className="h-9 w-28" /></td><td className="px-4 py-3"><Skeleton className="h-9 w-52" /></td><td className="px-4 py-3"><Skeleton className="ml-auto h-9 w-20" /></td></tr>) : filtered.map(({ product, matrix }) => {
          const image = getProductImage(product.id, product.asin);
          const variants = product.skus?.length ?? 0;
          return <tr key={product.id} className="group transition-colors hover:bg-slate-50/60">
            <td className="px-4 py-3"><Checkbox checked={selectedIds.includes(product.id)} onCheckedChange={() => toggleProduct(product.id)} aria-label={`Select ${product.name}`} /></td>
            <td className="px-4 py-3"><div className="flex items-center gap-3"><img src={image} alt="" className="size-10 shrink-0 rounded-lg border border-slate-200 object-cover" onError={(event) => { (event.currentTarget as HTMLImageElement).src = `https://picsum.photos/seed/${product.id}/80/80`; }} /><div className="min-w-0"><Link to={`/products/${product.id}`} className="block max-w-[280px] truncate text-sm font-semibold text-slate-900 hover:text-indigo-700">{product.name}</Link><p className="mt-0.5 max-w-[300px] truncate text-xs text-slate-500">{product.brand || 'Unbranded'} · {product.category || 'Uncategorized'}</p></div></div></td>
            <td className="px-4 py-3"><div className="font-mono text-xs font-semibold text-slate-700">{product.sku_code}</div><div className="mt-1 text-sm font-semibold tabular-nums text-slate-900">{formatLocalizedMoney(locale, product.retail_price, product.price_currency)}</div></td>
            <td className="px-4 py-3"><span className="text-sm font-medium tabular-nums text-slate-700">{variants === 0 ? 'Single Product' : `${variants} ${variants === 1 ? 'Option' : 'Options'}`}</span></td>
            <td className="px-4 py-3"><StockStatusCell product={product} onClick={() => setStockTarget(product)} /></td>
            <td className="px-4 py-3"><div className="flex items-center gap-1.5">{pinnedChannels.map((channel) => <ChannelMark key={channel.key} channel={channel} status={matrix[channel.key]} price={formatLocalizedMoney(locale, product.retail_price, product.price_currency)} onClick={() => setListingTarget({ product, channel: channel.key })} />)}<ChannelOverflow matrix={matrix} onClick={() => setListingTarget({ product })} /></div></td>
            <td className="px-4 py-3"><div className="flex justify-end gap-1"><Tooltip><TooltipTrigger asChild><Button size="icon" variant="ghost" className="size-9 text-indigo-700" onClick={() => navigate(`/products/${product.id}/edit`)} aria-label={`Edit ${product.name}`}><Pencil className="size-4" /></Button></TooltipTrigger><TooltipContent>Edit product</TooltipContent></Tooltip><DropdownMenu><DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="size-9" aria-label={`More actions for ${product.name}`}><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-48"><DropdownMenuItem onClick={() => setListingTarget({ product })}><Send className="size-4" />Push to Channels</DropdownMenuItem><DropdownMenuItem onClick={() => toast({ title: 'Product duplicated', description: `${product.name} copied as a draft.` })}><Copy className="size-4" />Duplicate</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem className="text-rose-600 focus:text-rose-700" onClick={() => updateListingStatuses(product, channels.filter((channel) => matrix[channel.key] === 'synced').map((channel) => channel.key), 'missing')}><Unplug className="size-4" />Unlist</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></td>
          </tr>;
        })}</tbody>
      </table></div></TooltipProvider>

      {!isLoading && filtered.length === 0 ? <div className="grid min-h-56 place-items-center border-t border-slate-100 p-6 text-center"><div><AlertCircle className="mx-auto size-6 text-slate-400" /><p className="mt-3 text-sm font-semibold text-slate-900">No products match this view</p><p className="mt-1 text-xs text-slate-500">Try a different catalog view, search term, or filter.</p><Button variant="outline" size="sm" className="mt-4" onClick={clearCatalogFilters}><CircleDot className="size-3.5" />Clear filters</Button></div></div> : null}
    </section>

    {selectedIds.length > 0 ? <div className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-3xl flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-2xl md:left-[17rem]"><span className="mr-auto px-2 text-sm font-semibold text-slate-800">{selectedProducts.length} selected</span><Button size="sm" onClick={() => runBulkAction('Push Selected to Channels')}><Send className="size-4" />Push Selected to Channels</Button><Button size="sm" variant="outline" onClick={() => runBulkAction('Batch Price Update')}><DollarSign className="size-4" />Batch Price Update</Button><Button size="sm" variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => runBulkAction('Delete')}><Trash2 className="size-4" />Delete</Button></div> : null}

    <CatalogFilterDrawer open={advancedOpen} syncFilter={syncFilter} variantFilter={variantFilter} onClose={() => setAdvancedOpen(false)} onApply={(nextSync, nextVariant) => { setSyncFilter(nextSync); setVariantFilter(nextVariant); setAdvancedOpen(false); }} />
    <ProductStockDrawer product={stockTarget} onClose={() => setStockTarget(null)} onSave={(product, inventory) => { updateProduct(product.id, { id: product.id, inventory }); setStockRevision((value) => value + 1); setStockTarget(null); toast({ title: 'Stock updated', description: `${product.name} now has ${Object.values(inventory).reduce((total, quantity) => total + quantity, 0).toLocaleString()} available units.` }); }} />
    <ChannelPublishingDrawer target={listingTarget} matrix={listingTarget ? rows.find(({ product }) => product.id === listingTarget.product.id)?.matrix : undefined} onClose={() => setListingTarget(null)} onPublish={(selectedChannels) => listingTarget && updateListingStatuses(listingTarget.product, selectedChannels, 'pending')} onUnpublish={(selectedChannels) => listingTarget && updateListingStatuses(listingTarget.product, selectedChannels, 'missing')} />
  </div>;
}

function ProductStockDrawer({ product, onClose, onSave }: { product: Product | null; onClose: () => void; onSave: (product: Product, inventory: Record<string, number>) => void }) {
  const [draft, setDraft] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!product) return;
    setDraft(Object.fromEntries(Object.keys(warehouseNames).map((warehouseId) => [warehouseId, Number(product.inventory?.[warehouseId] ?? 0)])));
  }, [product]);
  if (!product) return null;
  const available = Object.values(draft).reduce((total, quantity) => total + Number(quantity || 0), 0);
  const status = available <= 0 ? 'out' : available <= lowStockThreshold ? 'low' : 'healthy';
  return <Sheet open onOpenChange={(open) => !open && onClose()}><SheetContent className="flex w-full flex-col overflow-hidden p-0 sm:max-w-2xl"><SheetHeader className="border-b border-slate-200 p-5 pr-12"><SheetTitle>Product Stock</SheetTitle><SheetDescription>{product.name} · {product.sku_code}</SheetDescription></SheetHeader><div className="flex-1 space-y-5 overflow-y-auto p-5 pb-24">
    <section className={cn('rounded-xl border p-4', status === 'out' ? 'border-rose-200 bg-rose-50' : status === 'low' ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50')}><div className="flex items-start gap-3">{status === 'out' ? <PackageX className="mt-0.5 size-5 text-rose-700" /> : status === 'low' ? <AlertTriangle className="mt-0.5 size-5 text-amber-700" /> : <CheckCircle2 className="mt-0.5 size-5 text-emerald-700" />}<div><p className="text-2xl font-bold tabular-nums text-slate-950">{available.toLocaleString()} available</p><p className="mt-1 text-sm text-slate-600">{status === 'out' ? 'Out of stock. Connected channels should receive a sellable quantity of zero.' : status === 'low' ? `Low stock warning. Replenish before available quantity reaches zero.` : 'Stock is available for new orders across connected channels.'}</p></div></div></section>
    <section className="overflow-hidden rounded-xl border border-slate-200"><div className="border-b border-slate-200 px-4 py-3"><div className="flex items-center gap-2"><Warehouse className="size-4 text-indigo-600" /><h3 className="text-sm font-semibold text-slate-900">Stock by warehouse</h3></div><p className="mt-1 text-xs text-slate-500">Update the sellable quantity without leaving the product catalog.</p></div><div className="divide-y divide-slate-100">{Object.entries(warehouseNames).map(([warehouseId, warehouseName]) => <label key={warehouseId} className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_150px] sm:items-center"><span><span className="block text-sm font-semibold text-slate-900">{warehouseName}</span><span className="mt-1 block text-xs text-slate-500">Physical stock allocation</span></span><span><span className="sr-only">Available units at {warehouseName}</span><Input type="number" min="0" value={draft[warehouseId] ?? 0} onChange={(event) => setDraft((current) => ({ ...current, [warehouseId]: Math.max(0, Number(event.target.value || 0)) }))} className="h-10 text-right font-semibold tabular-nums" /></span></label>)}</div></section>
    {product.skus.length > 1 ? <section className="rounded-xl border border-slate-200 p-4"><h3 className="text-sm font-semibold text-slate-900">Variant coverage</h3><p className="mt-1 text-xs text-slate-500">{product.skus.length} variants share this warehouse allocation. Variant identity remains managed in Product Details.</p><div className="mt-3 flex flex-wrap gap-2">{product.skus.map((sku) => <span key={sku.id} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700">{sku.variation_name || sku.sku_code}</span>)}</div></section> : null}
  </div><div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 border-t border-slate-200 bg-white/95 p-4 backdrop-blur"><p className="hidden text-xs text-slate-500 sm:block">Stock changes are saved to the product inventory record.</p><div className="ml-auto flex gap-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => onSave(product, draft)}>Save Stock</Button></div></div></SheetContent></Sheet>;
}

function CatalogFilterDrawer({ open, syncFilter, variantFilter, onClose, onApply }: { open: boolean; syncFilter: 'all' | 'missing-shopee' | 'errors' | 'pending'; variantFilter: VariantFilter; onClose: () => void; onApply: (sync: 'all' | 'missing-shopee' | 'errors' | 'pending', variants: VariantFilter) => void }) {
  const [draftSync, setDraftSync] = useState(syncFilter);
  const [draftVariants, setDraftVariants] = useState<VariantFilter>(variantFilter);
  useEffect(() => { if (open) { setDraftSync(syncFilter); setDraftVariants(variantFilter); } }, [open, syncFilter, variantFilter]);
  return <Sheet open={open} onOpenChange={(value) => !value && onClose()}><SheetContent className="w-full sm:max-w-md"><SheetHeader><SheetTitle>Advanced Catalog Filters</SheetTitle><SheetDescription>Narrow the master catalog by publishing health and product structure.</SheetDescription></SheetHeader><div className="mt-6 grid gap-5"><label className="grid gap-2 text-sm font-semibold text-slate-700">Channel Sync Status<select value={draftSync} onChange={(event) => setDraftSync(event.target.value as typeof draftSync)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium"><option value="all">All sync statuses</option><option value="missing-shopee">Missing / error on Shopee</option><option value="errors">Any channel sync error</option><option value="pending">Pending publication</option></select></label><label className="grid gap-2 text-sm font-semibold text-slate-700">Product Structure<select value={draftVariants} onChange={(event) => setDraftVariants(event.target.value as VariantFilter)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium"><option value="all">All product structures</option><option value="with-variants">With variants</option><option value="single">Single products</option></select></label><div className="flex gap-2 border-t border-slate-200 pt-4"><Button variant="outline" className="flex-1" onClick={() => { setDraftSync('all'); setDraftVariants('all'); }}>Reset</Button><Button className="flex-1" onClick={() => onApply(draftSync, draftVariants)}>Apply Filters</Button></div></div></SheetContent></Sheet>;
}

function ChannelPublishingDrawer({ target, matrix, onClose, onPublish, onUnpublish }: { target: { product: Product; channel?: ChannelKey } | null; matrix?: Record<ChannelKey, SyncStatus>; onClose: () => void; onPublish: (channels: ChannelKey[]) => void; onUnpublish: (channels: ChannelKey[]) => void }) {
  const [selected, setSelected] = useState<ChannelKey[]>([]);
  useEffect(() => {
    if (!target) return;
    setSelected(target.channel ? [target.channel] : channels.filter((channel) => matrix?.[channel.key] !== 'synced').map((channel) => channel.key));
  }, [matrix, target]);

  if (!target || !matrix) return <Sheet open={false}><SheetContent /></Sheet>;
  const selectedChannel = target.channel ? channels.find((channel) => channel.key === target.channel) : null;
  const singleStatus = selectedChannel ? matrix[selectedChannel.key] : null;
  const issueFor = (channel: ChannelKey) => channel === 'amazon' ? 'GTIN is required' : channel === 'rakuten' ? 'Japanese description is required' : channel === 'lazada' ? 'Map a Lazada category' : null;
  const readySelected = selected.filter((channel) => !issueFor(channel));
  const toggle = (channel: ChannelKey) => setSelected((current) => current.includes(channel) ? current.filter((item) => item !== channel) : [...current, channel]);

  return <Sheet open onOpenChange={(open) => !open && onClose()}><SheetContent className="flex w-full flex-col overflow-hidden p-0 sm:max-w-xl">
    <SheetHeader className="border-b border-slate-200 p-5"><SheetTitle>{selectedChannel ? `${selectedChannel.label} Listing` : 'Publish to Channels'}</SheetTitle><SheetDescription>{target.product.name} · {target.product.sku_code}</SheetDescription></SheetHeader>
    <div className="flex-1 space-y-5 overflow-y-auto p-5 pb-28">
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"><img src={getProductImage(target.product.id, target.product.asin)} alt="" className="size-12 rounded-lg border border-slate-200 object-cover" /><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{target.product.name}</p><p className="mt-1 text-xs text-slate-500">Master data is the default source for channel content.</p></div></div>

      {selectedChannel && singleStatus === 'synced' ? <section className="space-y-3 rounded-xl border border-slate-200 p-4"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-slate-900">Published listing</p><p className="mt-1 text-xs text-slate-500">External ID: {selectedChannel.shortLabel}-{target.product.sku_code}</p></div><span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700"><span className="size-2 rounded-full bg-emerald-500" />Synced</span></div><div className="grid grid-cols-2 gap-2"><Button variant="outline"><ExternalLink className="size-4" />View Listing</Button><Button variant="outline" onClick={() => onPublish([selectedChannel.key])}><Send className="size-4" />Sync Now</Button></div><Button variant="outline" className="w-full border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => onUnpublish([selectedChannel.key])}><Unplug className="size-4" />Unpublish from {selectedChannel.label}</Button><p className="text-xs leading-5 text-slate-500">The master product and listings on other channels will remain available.</p></section> : <>
        <section><div className="mb-3"><h3 className="text-sm font-semibold text-slate-900">Channel readiness</h3><p className="mt-1 text-xs text-slate-500">Select channels, resolve required fields, then publish eligible listings.</p></div><div className="space-y-2">{channels.filter((channel) => !selectedChannel || channel.key === selectedChannel.key).map((channel) => {
          const issue = issueFor(channel.key);
          const status = matrix[channel.key];
          return <label key={channel.key} className={cn('flex min-h-16 items-center gap-3 rounded-xl border p-3 transition-colors', selected.includes(channel.key) ? 'border-indigo-200 bg-indigo-50/40' : 'border-slate-200 hover:bg-slate-50')}><Checkbox checked={selected.includes(channel.key)} onCheckedChange={() => toggle(channel.key)} /><span className="grid size-9 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600">{channel.shortLabel}</span><span className="min-w-0 flex-1"><span className="flex items-center gap-2 text-sm font-semibold text-slate-900">{channel.label}<span className={cn('size-2 rounded-full', statusTone[status])} /></span><span className={cn('mt-1 block text-xs', issue ? 'text-rose-600' : 'text-emerald-700')}>{issue ?? 'Ready to publish from master data'}</span></span><span className="text-[10px] font-semibold uppercase text-slate-400">{status}</span></label>;
        })}</div></section>
        <section className="rounded-xl border border-slate-200 p-4"><h3 className="text-sm font-semibold text-slate-900">Channel content</h3><div className="mt-3 grid gap-3"><label className="grid gap-1.5 text-xs font-semibold text-slate-500">Listing title<Input defaultValue={target.product.name} className="h-10 text-sm" /></label><div className="grid grid-cols-2 gap-3"><label className="grid gap-1.5 text-xs font-semibold text-slate-500">Channel price<Input defaultValue={target.product.retail_price} type="number" className="h-10 text-sm tabular-nums" /></label><label className="grid gap-1.5 text-xs font-semibold text-slate-500">Category mapping<select className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium"><option>Use master category</option><option>Map manually</option></select></label></div><p className="text-xs text-slate-500">These values inherit from the master product unless overridden.</p></div></section>
      </>}
    </div>
    {!(selectedChannel && singleStatus === 'synced') ? <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 border-t border-slate-200 bg-white/95 p-4 backdrop-blur"><div className="mr-auto text-xs text-slate-500"><span className="font-semibold text-slate-800">{readySelected.length}</span> ready · {selected.length - readySelected.length} blocked</div><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={readySelected.length === 0} onClick={() => onPublish(readySelected)}><Send className="size-4" />Publish {readySelected.length} Ready</Button></div> : null}
  </SheetContent></Sheet>;
}
