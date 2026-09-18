import { ChannelLogo } from '@/components/channels/ChannelLogo';
import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, AlertTriangle, Archive, Boxes, CheckCircle2, CircleDot, Copy, Download, ExternalLink, FileWarning, Info, Layers3, MoreHorizontal, PackageX, Pencil, Plus, Search, Send, ShoppingBag, SlidersHorizontal, Store, Tags, Trash2, Unplug, Warehouse, X } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { WorkspacePageHeader } from '@/components/system/WorkspacePageHeader';
import { useToast } from '@/hooks/use-toast';
import { addProduct, getProducts, updateProduct, type Product, type ProductType } from '@/lib/product-store';
import { getWarehouses } from '@/lib/warehouse-store';
import { formatLocalizedMoney } from '@/lib/i18n/format';
import { useI18n } from '@/lib/i18n/I18nContext';
import { getProductImage } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { getSavedAmazonListing } from '@/lib/amazon-listing-store';
import { CreateProductDialog } from '@/components/products/CreateProductDialog';

type SyncStatus = 'synced' | 'pending' | 'error' | 'missing';
type ChannelKey = 'primeweb' | 'pos' | 'shopee' | 'lazada' | 'amazon' | 'rakuten';
type CatalogView = 'all' | Product['status'];
type VariantFilter = 'all' | 'with-variants' | 'single';
type StockFilter = 'all' | 'in-stock' | 'low-stock' | 'out-of-stock';
type WorkspaceMode = 'master' | 'listings';

function getProductQuality(product: Product) {
  const checks = [
    { label: 'Product name', complete: Boolean(product.name.trim()) },
    { label: 'Master SKU', complete: Boolean(product.sku_code.trim()) },
    { label: 'Brand', complete: Boolean(product.brand.trim()) },
    { label: 'Category', complete: Boolean(product.category.trim()) },
    { label: 'Description', complete: Boolean(product.description.trim()) },
    { label: 'GTIN', complete: Boolean(product.gtin.trim()) },
    { label: 'Product image', complete: product.images.length > 0 },
  ];
  const missing = checks.filter((check) => !check.complete).map((check) => check.label);
  return { missing, score: Math.round(((checks.length - missing.length) / checks.length) * 100), ready: missing.length === 0 };
}

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
function getChannelMatrix(index: number, productId?: string): Record<ChannelKey, SyncStatus> {
  const patterns: Array<Record<ChannelKey, SyncStatus>> = [
    { primeweb: 'synced', pos: 'synced', shopee: 'synced', lazada: 'synced', amazon: 'pending', rakuten: 'missing' },
    { primeweb: 'synced', pos: 'synced', shopee: 'error', lazada: 'error', amazon: 'error', rakuten: 'pending' },
    { primeweb: 'synced', pos: 'pending', shopee: 'synced', lazada: 'error', amazon: 'missing', rakuten: 'synced' },
    { primeweb: 'synced', pos: 'synced', shopee: 'pending', lazada: 'synced', amazon: 'error', rakuten: 'missing' },
  ];
  const matrix = patterns[index % patterns.length];
  const amazonListing = productId ? getSavedAmazonListing(productId) : null;
  if (!amazonListing) return matrix;
  return {
    ...matrix,
    amazon: amazonListing.status === 'synced' ? 'synced' : amazonListing.status === 'error' ? 'error' : amazonListing.status === 'draft' ? matrix.amazon : 'pending',
  };
}


function ChannelMark({ channel, status, price, onClick }: { channel: (typeof channels)[number]; status: SyncStatus; price: string; onClick: () => void }) {
  return <Tooltip><TooltipTrigger asChild><button type="button" onClick={onClick} className="relative grid size-9 place-items-center rounded-md transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" aria-label={`${channel.label}: ${statusLabel[status]} (${price}). Open listing actions.`}><ChannelLogo channel={channel} muted={status === 'missing'} /><span className={cn('absolute right-0.5 top-0.5 size-2.5 rounded-full border-2 border-white', statusTone[status])} /></button></TooltipTrigger><TooltipContent side="top" className="text-xs">{channel.label}: {statusLabel[status]} ({price})</TooltipContent></Tooltip>;
}

function ChannelOverflow({ matrix, onClick }: { matrix: Record<ChannelKey, SyncStatus>; onClick: () => void }) {
  return <Tooltip><TooltipTrigger asChild><button type="button" onClick={onClick} className="inline-flex h-8 items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-600 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" aria-label={`Show ${overflowChannels.length} more channel listings`}>+{overflowChannels.length} more</button></TooltipTrigger><TooltipContent side="top" align="start" className="w-60 p-2"><p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">All channel statuses</p><div className="space-y-0.5">{channels.map((channel) => <div key={channel.key} className="flex items-center gap-2 rounded-md px-2 py-1.5"><ChannelLogo channel={channel} size="sm" muted={matrix[channel.key] === 'missing'} /><span className="flex-1 text-xs font-medium text-slate-700">{channel.label}</span><span className={cn('size-2 rounded-full', statusTone[matrix[channel.key]])} /><span className="text-[10px] text-slate-500">{statusLabel[matrix[channel.key]]}</span></div>)}</div><p className="mt-1 border-t border-slate-100 px-2 pt-1.5 text-[10px] text-slate-400">Click to manage all channels</p></TooltipContent></Tooltip>;
}

function StockStatusCell({ product, matrix, inventorySyncKeys, onClick, onChannelIssue }: { product: Product; matrix: Record<ChannelKey, SyncStatus>; inventorySyncKeys: string[]; onClick: () => void; onChannelIssue: (channel: ChannelKey) => void }) {
  const { available, status } = getStockSummary(product);
  const config = status === 'out-of-stock'
    ? { label: 'Out of stock', icon: PackageX, tone: 'border-rose-200 bg-rose-50 text-rose-700', value: 'text-rose-700' }
    : status === 'low-stock'
      ? { label: 'Low stock', icon: AlertTriangle, tone: 'border-amber-200 bg-amber-50 text-amber-700', value: 'text-amber-700' }
      : { label: 'In stock', icon: CheckCircle2, tone: 'border-emerald-200 bg-emerald-50 text-emerald-700', value: 'text-slate-900' };
  const Icon = config.icon;
  const channelIssues = channels.flatMap((channel) => {
    const stock = getChannelStock(product, channel.key, matrix[channel.key], inventorySyncKeys.includes(`${product.id}:${channel.key}`));
    return stock.state === 'mismatch' ? [{ channel, stock }] : [];
  });
  const outOfStockChannels = channelIssues.filter(({ stock }) => stock.reported === 0);
  const primaryIssue = outOfStockChannels[0] ?? channelIssues[0];
  const issueTone = outOfStockChannels.length ? 'text-rose-700 hover:bg-rose-50' : 'text-amber-700 hover:bg-amber-50';
  const issueLabel = channelIssues.length === 1
    ? `${primaryIssue.channel.label} ${primaryIssue.stock.reported === 0 ? 'out of stock' : 'stock mismatch'}`
    : `${channelIssues.length} channel stock issues`;

  return <div className="min-w-40">
    <button type="button" onClick={onClick} className="group/stock min-h-11 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" aria-label={`${product.name}: ${available} Master ATS, ${config.label}. Manage master stock.`}><span className={cn('block text-sm font-bold tabular-nums', config.value)}>{available.toLocaleString()} Master ATS</span><span className={cn('mt-1 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold', config.tone)}><Icon className="size-3" />Master {config.label.toLowerCase()}</span></button>
    {channelIssues.length ? <Tooltip><TooltipTrigger asChild><button type="button" onClick={() => onChannelIssue(primaryIssue.channel.key)} className={cn('mt-1 flex min-h-8 max-w-48 items-center gap-1 rounded-md px-1.5 text-left text-[11px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500', issueTone)} aria-label={`${issueLabel}. Review channel stock.`}><AlertTriangle className="size-3.5 shrink-0" /><span className="truncate">{issueLabel}</span></button></TooltipTrigger><TooltipContent side="top" align="start" className="w-72 p-3"><p className="font-semibold text-slate-900">Channel stock differs from Master</p><p className="mt-1 text-xs leading-5 text-slate-500">Master stock is still available, but these channels report a lower quantity than Prime OS allocated.</p><div className="mt-2 space-y-1.5 border-t border-slate-100 pt-2">{channelIssues.map(({ channel, stock }) => <div key={channel.key} className="flex items-center gap-2"><ChannelLogo channel={channel} size="sm" /><span className="flex-1 text-xs font-medium text-slate-700">{channel.label}</span><span className={cn('text-xs font-semibold tabular-nums', stock.reported === 0 ? 'text-rose-700' : 'text-amber-700')}>{stock.allocated} allocated · {stock.reported} reported</span></div>)}</div><p className="mt-2 border-t border-slate-100 pt-2 text-[10px] text-slate-400">Click to review the first affected channel in Channel Listings.</p></TooltipContent></Tooltip> : null}
  </div>;
}

function SummaryCard({ icon: Icon, label, value, detail, tone }: { icon: typeof Boxes; label: string; value: number; detail: string; tone: 'default' | 'success' | 'warning' | 'info' }) {
  const styles = tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : tone === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-700' : tone === 'info' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-border bg-muted/40 text-foreground';
  return <div className="rounded-xl border border-border bg-card p-4"><div className="flex items-start gap-3"><span className={cn('grid size-10 shrink-0 place-items-center rounded-lg border', styles)}><Icon className="size-5" /></span><div><p className="text-2xl font-bold tabular-nums text-foreground">{value}</p><p className="mt-0.5 text-sm font-semibold text-foreground">{label}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div></div></div>;
}

function DataIssueBadge({ product, onClick }: { product: Product; onClick: () => void }) {
  const quality = getProductQuality(product);
  if (quality.ready) return null;
  return <Tooltip><TooltipTrigger asChild><button type="button" onClick={onClick} className="mt-1 inline-flex min-h-7 cursor-pointer items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 text-[11px] font-semibold text-amber-800 transition-colors hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><AlertTriangle className="size-3" />{quality.missing.length} data {quality.missing.length === 1 ? 'issue' : 'issues'}</button></TooltipTrigger><TooltipContent side="top" align="start" className="max-w-64"><p className="font-semibold">Complete this master product</p><p className="mt-1 text-xs opacity-80">Missing: {quality.missing.join(', ')}</p><p className="mt-1 text-xs opacity-70">Click to edit the required data.</p></TooltipContent></Tooltip>;
}

function ListingCoverage({ matrix, onClick }: { matrix: Record<ChannelKey, SyncStatus>; onClick: () => void }) {
  const usedChannels = channels.filter((channel) => matrix[channel.key] !== 'missing');
  const visibleChannels = usedChannels.slice(0, 3);
  const overflow = usedChannels.slice(3);
  const issues = usedChannels.filter((channel) => matrix[channel.key] === 'error').length;
  const processing = usedChannels.filter((channel) => matrix[channel.key] === 'pending').length;
  const channelButton = (channel: (typeof channels)[number]) => <Tooltip key={channel.key}><TooltipTrigger asChild><button type="button" onClick={onClick} className="relative grid size-10 shrink-0 cursor-pointer place-items-center rounded-lg border border-slate-200 bg-white transition-colors hover:border-indigo-300 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`${channel.label}: ${statusLabel[matrix[channel.key]]}. Open Channel Listings`}><ChannelLogo channel={channel} /><span className={cn('absolute -right-0.5 -top-0.5 size-3 rounded-full border-2 border-white', statusTone[matrix[channel.key]])} /></button></TooltipTrigger><TooltipContent side="top"><p className="font-semibold">{channel.label}</p><p className="text-xs opacity-80">{statusLabel[matrix[channel.key]]} · Open Channel Listings</p></TooltipContent></Tooltip>;

  if (usedChannels.length === 0) return <button type="button" onClick={onClick} className="min-h-11 cursor-pointer rounded-lg text-left text-xs font-semibold text-slate-500 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">No channels yet<br /><span className="font-normal">Create a listing</span></button>;

  return <div className="min-w-44"><div className="flex items-center gap-1.5">{visibleChannels.map(channelButton)}{overflow.length ? <Tooltip><TooltipTrigger asChild><button type="button" onClick={onClick} className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Show ${overflow.length} more channels`}>+{overflow.length}</button></TooltipTrigger><TooltipContent side="top" align="start" className="w-60 p-2"><p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">More channels using this master</p><div className="space-y-0.5">{overflow.map((channel) => <div key={channel.key} className="flex items-center gap-2 rounded-md px-2 py-1.5"><ChannelLogo channel={channel} size="sm" /><span className="flex-1 text-xs font-medium text-slate-700">{channel.label}</span><span className={cn('size-2 rounded-full', statusTone[matrix[channel.key]])} /><span className="text-[10px] text-slate-500">{statusLabel[matrix[channel.key]]}</span></div>)}</div><p className="mt-1 border-t border-slate-100 px-2 pt-1.5 text-[10px] text-slate-400">Click to manage all channel listings</p></TooltipContent></Tooltip> : null}</div><button type="button" onClick={onClick} className="mt-1.5 cursor-pointer rounded text-left text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="font-semibold tabular-nums text-slate-700">{usedChannels.length} of {channels.length} channels</span>{issues ? <span className="ml-2 text-rose-700">{issues} need attention</span> : processing ? <span className="ml-2 text-amber-700">{processing} processing</span> : <span className="ml-2 text-emerald-700">All healthy</span>}</button></div>;
}

function getChannelStock(product: Product, channel: ChannelKey, status: SyncStatus, syncEnabled = false) {
  const master = getStockSummary(product).available;
  const channelIndex = channels.findIndex((item) => item.key === channel);
  const channelQuantity = status === 'missing' ? 0 : Math.floor(master * (0.18 + channelIndex * 0.025));
  if (status === 'missing') return { master, allocated: 0, reported: null, difference: null, state: 'not-connected' } as const;
  if (!syncEnabled) return { master, allocated: 0, reported: channelQuantity, difference: null, state: 'independent' } as const;
  const allocated = channelQuantity;
  const reported = status === 'missing' ? null : status === 'pending' ? null : status === 'error' ? 0 : allocated;
  const difference = reported === null ? null : reported - allocated;
  return { master, allocated, reported, difference, state: status === 'missing' ? 'not-connected' : status === 'pending' ? 'processing' : difference === 0 ? 'synced' : 'mismatch' } as const;
}

function ChannelStockCell({ product, channel, status, syncEnabled, onClick }: { product: Product; channel: ChannelKey; status: SyncStatus; syncEnabled: boolean; onClick: () => void }) {
  const stock = getChannelStock(product, channel, status, syncEnabled);
  if (stock.state === 'independent') return <button type="button" onClick={onClick} className="min-h-11 cursor-pointer rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><p className="text-sm font-semibold text-slate-700">Managed independently</p><p className="mt-1 text-xs font-medium text-indigo-600">Configure inventory sync</p></button>;
  if (stock.state === 'not-connected') return <button type="button" onClick={onClick} className="min-h-11 cursor-pointer rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><p className="text-sm font-semibold text-slate-500">Not allocated</p><p className="mt-1 text-xs text-indigo-600">Review inventory setup</p></button>;
  return <button type="button" onClick={onClick} className="min-h-11 cursor-pointer rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><div className="flex items-baseline gap-2"><span className="text-sm font-semibold tabular-nums text-slate-900">{stock.allocated} allocated</span><span className="text-xs tabular-nums text-slate-500">{stock.reported === null ? '— reported' : `${stock.reported} reported`}</span></div><p className={cn('mt-1 text-xs font-medium', stock.state === 'mismatch' ? 'text-rose-700' : stock.state === 'processing' ? 'text-amber-700' : 'text-emerald-700')}>{stock.state === 'mismatch' ? `${stock.difference} mismatch` : stock.state === 'processing' ? 'Sync processing' : 'Stock synced'}</p></button>;
}

export default function Products() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { locale } = useI18n();
  const queryParams = new URLSearchParams(location.search);
  const initialChannel = queryParams.get('channel');
  const [search, setSearch] = useState(queryParams.get('q') ?? '');
  const [syncFilter, setSyncFilter] = useState<'all' | 'missing-shopee' | 'errors' | 'pending'>('all');
  const [catalogView, setCatalogView] = useState<CatalogView>('all');
  const [channelFilter, setChannelFilter] = useState<'all' | ChannelKey>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [variantFilter, setVariantFilter] = useState<VariantFilter>('all');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const workspaceMode: WorkspaceMode = location.pathname.includes('/channel-listings') ? 'listings' : 'master';
  const [listingChannel, setListingChannel] = useState<ChannelKey>(channels.some(({ key }) => key === initialChannel) ? initialChannel as ChannelKey : 'amazon');
  const [legendFilter, setLegendFilter] = useState<'all' | SyncStatus>('all');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [listingTarget, setListingTarget] = useState<{ product: Product; channel?: ChannelKey } | null>(null);
  const [stockTarget, setStockTarget] = useState<Product | null>(null);
  const [channelStockTarget, setChannelStockTarget] = useState<{ product: Product; channel: ChannelKey; status: SyncStatus } | null>(null);
  const [inventorySyncKeys, setInventorySyncKeys] = useState<string[]>([]);
  const [, setStockRevision] = useState(0);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, Partial<Record<ChannelKey, SyncStatus>>>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const products = getProducts();

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 120);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const query = params.get('q');
    const channel = params.get('channel');
    if (query !== null) setSearch(query);
    if (channel && channels.some(({ key }) => key === channel)) setListingChannel(channel as ChannelKey);
  }, [location.search]);

  const rows = useMemo(() => products.filter((product) => !hiddenIds.includes(product.id)).map((product, index) => ({ product, matrix: { ...getChannelMatrix(index, product.id), ...statusOverrides[product.id] } })), [hiddenIds, products, statusOverrides]);
  const categories = useMemo(() => Array.from(new Set(products.map((product) => product.category).filter(Boolean))).sort(), [products]);
  const catalogCounts = useMemo(() => ({
    all: rows.length,
    draft: rows.filter(({ product }) => product.status === 'draft').length,
    review: rows.filter(({ product }) => product.status === 'review').length,
    published: rows.filter(({ product }) => product.status === 'published').length,
    archived: rows.filter(({ product }) => product.status === 'archived').length,
  }), [rows]);
  const filtered = useMemo(() => rows.filter(({ product, matrix }) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || `${product.name} ${product.sku_code} ${product.category} ${product.brand}`.toLowerCase().includes(query);
    const matchesSync = syncFilter === 'all' || (syncFilter === 'missing-shopee' ? matrix.shopee === 'missing' || matrix.shopee === 'error' : syncFilter === 'errors' ? Object.values(matrix).includes('error') : Object.values(matrix).includes('pending'));
    const matchesView = workspaceMode === 'listings' || catalogView === 'all' || product.status === catalogView;
    const matchesChannel = workspaceMode === 'listings' || channelFilter === 'all' || matrix[channelFilter] !== 'missing';
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    const variantCount = product.skus?.length ?? 0;
    const matchesVariants = variantFilter === 'all' || (variantFilter === 'with-variants' ? variantCount > 0 : variantCount === 0);
    const matchesStock = stockFilter === 'all' || getStockSummary(product).status === stockFilter;
    const matchesLegend = legendFilter === 'all' || (workspaceMode === 'listings' ? matrix[listingChannel] === legendFilter : Object.values(matrix).includes(legendFilter));
    return matchesSearch && matchesSync && matchesView && matchesChannel && matchesCategory && matchesVariants && matchesStock && matchesLegend;
  }), [catalogView, categoryFilter, channelFilter, legendFilter, listingChannel, rows, search, stockFilter, syncFilter, variantFilter, workspaceMode]);

  const selectedListingChannel = channels.find((channel) => channel.key === listingChannel) ?? channels[4];

  const readiness = useMemo(() => channels.map((channel) => ({
    ...channel,
    published: rows.filter(({ matrix }) => matrix[channel.key] === 'synced').length,
    total: rows.length,
  })), [rows]);
  const qualitySummary = useMemo(() => ({
    ready: rows.filter(({ product }) => getProductQuality(product).ready).length,
    incomplete: rows.filter(({ product }) => !getProductQuality(product).ready).length,
    review: rows.filter(({ product }) => product.status === 'review').length,
  }), [rows]);

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
    if (action === 'Archive') {
      selectedProducts.forEach(({ product }) => updateProduct(product.id, { id: product.id, status: 'archived' }));
      setStockRevision((value) => value + 1);
      setSelectedIds([]);
    }
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

  function createProductDraft(input: { sku: string; name: string; productType: ProductType }) {
    const now = new Date().toISOString();
    const id = `prod_${crypto.randomUUID().slice(0, 8)}`;
    addProduct({
      id,
      name: input.name,
      sku_code: input.sku,
      product_type: input.productType,
      gtin: '', mpn: '', model_number: '', brand: '', asin: '', manufacturer: '',
      category: '',
      condition: 'new',
      description: '',
      original_price: 0,
      retail_price: 0,
      price_currency: 'JPY',
      prod_length: 0, prod_height: 0, prod_width: 0, prod_weight: 0,
      pkg_length: 0, pkg_height: 0, pkg_width: 0, pkg_weight: 0,
      country_of_origin: '', hs_code: '', images: [],
      inventory: Object.fromEntries(Object.keys(warehouseNames).map((warehouseId) => [warehouseId, 0])),
      has_variants: input.productType === 'variant',
      channels: [],
      status: 'draft',
      created_at: now,
      updated_at: now,
      skus: [],
    });
    setCreateOpen(false);
    toast({ title: 'Product Master draft created', description: `${input.name} · ${input.sku} is ready for enrichment.` });
    navigate(`/products/${id}/edit`);
  }

  return <div className="space-y-5 p-4 md:p-6">
    <WorkspacePageHeader
      title={workspaceMode === 'master' ? 'Product Master' : 'Channel Listings'}
      description={workspaceMode === 'master' ? 'Manage shared product data and each channel listing from one Product Master workspace.' : `Manage ${selectedListingChannel.label} content, readiness and sync without changing Product Master.`}
      icon={workspaceMode === 'master' ? ShoppingBag : Layers3}
      actions={workspaceMode === 'master' ? <div className="flex flex-wrap items-center justify-end gap-2"><Button variant="outline" onClick={() => navigate('/products/catalog-imports')}><Download className="size-4" />Import from channel</Button><Button onClick={() => setCreateOpen(true)}><Plus className="size-4" />Create Product Master</Button></div> : undefined}
    />

    {workspaceMode === 'master' ? <section aria-labelledby="catalog-health-title">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2"><div><h2 id="catalog-health-title" className="text-sm font-semibold text-foreground">Catalog health</h2><p className="mt-1 text-xs text-muted-foreground">Completeness of the shared product data used by every sales channel.</p></div><Badge variant="outline"><Layers3 className="mr-1 size-3.5" />Channel listings managed per product</Badge></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={Boxes} label="Total products" value={rows.length} detail="Shared source records" tone="default" />
        <SummaryCard icon={CheckCircle2} label="Ready for listings" value={qualitySummary.ready} detail="Required master data complete" tone="success" />
        <SummaryCard icon={FileWarning} label="Incomplete" value={qualitySummary.incomplete} detail="Missing required product data" tone="warning" />
        <SummaryCard icon={Tags} label="Awaiting review" value={qualitySummary.review} detail="Needs approval before activation" tone="info" />
      </div>
    </section> : <section aria-labelledby="channel-coverage-title">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2"><div><h2 id="channel-coverage-title" className="text-sm font-semibold text-foreground">{workspaceMode === 'master' ? 'Listing coverage by channel' : 'Choose a channel workspace'}</h2><p className="mt-1 text-xs text-muted-foreground">{workspaceMode === 'master' ? 'Select a channel to open its listing workspace. Master data remains shared.' : 'Each channel has its own fields, validation rules and publishing lifecycle.'}</p></div>{workspaceMode === 'listings' ? <Badge variant="outline">Editing listings only · Master data protected</Badge> : null}</div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
      {readiness.map((channel) => {
        const percentage = channel.total ? Math.round((channel.published / channel.total) * 100) : 0;
        const selected = workspaceMode === 'listings' && listingChannel === channel.key;
        return <button type="button" key={channel.key} aria-pressed={selected} onClick={() => { setListingChannel(channel.key); setChannelFilter('all'); setLegendFilter('all'); setSelectedIds([]); }} className={cn('cursor-pointer rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', selected ? 'border-primary bg-primary/5 ring-2 ring-primary/10' : 'border-border')}>
          <div className="flex items-center gap-2"><ChannelLogo channel={channel} size="lg" /><div><h3 className="text-sm font-semibold text-foreground">{channel.label}</h3><p className="text-xs text-muted-foreground"><span className="font-semibold tabular-nums text-foreground">{channel.published}</span> / {channel.total} synced</p></div>{selected ? <CheckCircle2 className="ml-auto size-4 text-primary" /> : null}</div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${percentage}%` }} /></div>
        </button>;
      })}
      </div>
    </section>}

    {workspaceMode === 'listings' ? <div className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center"><ChannelLogo channel={selectedListingChannel} size="lg" /><div className="min-w-0 flex-1"><h2 className="font-semibold text-foreground">{selectedListingChannel.label} Listings</h2><p className="mt-1 text-xs text-muted-foreground">Changes here apply only to {selectedListingChannel.label}. Open a listing to edit channel-specific content and run its readiness check.</p></div><Button variant="outline" onClick={() => navigate('/products/master-catalog')}><Boxes className="size-4" />Return to Product Master</Button></div> : null}

    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      {workspaceMode === 'master' ? <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 px-3" aria-label="Catalog status">
        {([['all', 'All'], ['draft', 'Draft'], ['review', 'Review'], ['published', 'Active'], ['archived', 'Archived']] as Array<[CatalogView, string]>).map(([key, label]) => <button key={key} type="button" onClick={() => setCatalogView(key)} className={cn('relative min-h-11 shrink-0 px-3 text-sm font-semibold transition-colors', catalogView === key ? 'text-primary after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-primary' : 'text-slate-500 hover:text-slate-900')}>{label}<span className={cn('ml-1.5 text-xs tabular-nums', catalogView === key ? 'text-primary/75' : 'text-slate-400')}>{catalogCounts[key]}</span></button>)}
      </nav> : <div className="flex min-h-11 items-center gap-2 border-b border-border px-4"><ChannelLogo channel={selectedListingChannel} size="sm" /><span className="text-sm font-semibold text-foreground">{selectedListingChannel.label} listing queue</span><span className="ml-auto text-xs text-muted-foreground">{filtered.length} master products available</span></div>}
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 xl:flex-row xl:items-center">
        <div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={workspaceMode === 'master' ? 'Search master product, SKU, or category...' : `Search ${selectedListingChannel.label} listing or master SKU...`} className="h-10 pl-9 pr-9" />{search ? <button type="button" onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center text-slate-400 hover:text-slate-700"><X className="size-4" /></button> : null}</div>
        <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-5 xl:flex">
          <label className="sr-only" htmlFor="category-filter">Category</label><select id="category-filter" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="h-10 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700"><option value="all">All categories</option>{categories.map((category) => <option key={category}>{category}</option>)}</select>
          <label className="sr-only" htmlFor="stock-filter">Stock status</label><select id="stock-filter" value={stockFilter} onChange={(event) => setStockFilter(event.target.value as StockFilter)} className="h-10 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700"><option value="all">All stock</option><option value="in-stock">In stock</option><option value="low-stock">Low stock</option><option value="out-of-stock">Out of stock</option></select>
          <Button variant="outline" className="h-10 border-slate-200" onClick={() => setAdvancedOpen(true)} aria-label="Open advanced filters"><SlidersHorizontal className="size-4" />Filters{syncFilter !== 'all' || variantFilter !== 'all' ? <span className="grid size-5 place-items-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700">{Number(syncFilter !== 'all') + Number(variantFilter !== 'all')}</span> : null}</Button>
          <div className="flex"><Button variant="outline" className="h-10 rounded-r-none border-slate-200" onClick={() => exportProducts('filtered')}><Download className="size-4" />Export</Button><label className="sr-only" htmlFor="export-scope">Export scope</label><select id="export-scope" defaultValue="filtered" onChange={(event) => { const scope = event.target.value as 'filtered' | 'all'; if (scope === 'all') exportProducts('all'); event.target.value = 'filtered'; }} className="h-10 w-10 rounded-r-lg border border-l-0 border-slate-200 bg-white px-1 text-sm text-slate-600"><option value="filtered">▾</option><option value="all">All</option></select></div>
        </div>
      </div>
      {workspaceMode === 'listings' ? <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50/40 px-4 py-2"><span className="mr-1 text-xs font-semibold text-slate-500">{selectedListingChannel.label} status</span><button type="button" onClick={() => setLegendFilter('all')} className={cn('min-h-10 rounded-md border px-3 text-xs font-semibold', legendFilter === 'all' ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-transparent text-slate-600')}>All</button>{(['synced', 'pending', 'error', 'missing'] as SyncStatus[]).map((item) => <button key={item} type="button" onClick={() => setLegendFilter((current) => current === item ? 'all' : item)} className={cn('inline-flex min-h-10 items-center gap-1.5 rounded-md border px-3 text-xs font-semibold transition-colors', legendFilter === item ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-white')}><span className={cn('size-2 rounded-full', statusTone[item])} />{statusLabel[item]}</button>)}<span className="ml-auto text-xs tabular-nums text-slate-500">{filtered.length} listings</span></div> : <div className="flex min-h-10 items-center border-b border-slate-200 bg-slate-50/40 px-4 text-xs text-slate-500"><span><strong className="font-semibold text-slate-700">{filtered.length}</strong> master products</span><span className="ml-auto">Open a product to manage its channel listings</span></div>}
      {search || channelFilter !== 'all' || categoryFilter !== 'all' || stockFilter !== 'all' || syncFilter !== 'all' || variantFilter !== 'all' ? <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50/50 px-4 py-2 text-xs"><span className="font-semibold text-slate-500">Active filters</span>{channelFilter !== 'all' ? <button type="button" onClick={() => setChannelFilter('all')} className="inline-flex min-h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 font-semibold text-slate-700">{channels.find((channel) => channel.key === channelFilter)?.label}<X className="size-3" /></button> : null}{categoryFilter !== 'all' ? <button type="button" onClick={() => setCategoryFilter('all')} className="inline-flex min-h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 font-semibold text-slate-700">{categoryFilter}<X className="size-3" /></button> : null}{stockFilter !== 'all' ? <button type="button" onClick={() => setStockFilter('all')} className="inline-flex min-h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 font-semibold text-slate-700">{stockFilter === 'in-stock' ? 'In stock' : stockFilter === 'low-stock' ? 'Low stock' : 'Out of stock'}<X className="size-3" /></button> : null}{syncFilter !== 'all' ? <button type="button" onClick={() => setSyncFilter('all')} className="inline-flex min-h-8 items-center gap-1 rounded-md border border-indigo-200 bg-white px-2 font-semibold text-indigo-700">{syncFilter === 'errors' ? 'Sync errors' : syncFilter === 'pending' ? 'Pending publication' : 'Shopee missing/error'}<X className="size-3" /></button> : null}{variantFilter !== 'all' ? <button type="button" onClick={() => setVariantFilter('all')} className="inline-flex min-h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 font-semibold text-slate-700">{variantFilter === 'with-variants' ? 'With variants' : 'Single products'}<X className="size-3" /></button> : null}<button type="button" onClick={clearCatalogFilters} className="ml-auto min-h-8 font-semibold text-indigo-700">Clear all</button></div> : null}

      <TooltipProvider delayDuration={150}><div className="overflow-x-auto"><table className={cn('w-full text-left', workspaceMode === 'master' ? 'min-w-[1280px]' : 'min-w-[1160px]')}><thead className="border-b border-slate-200 bg-slate-50/60"><tr><th className="sticky left-0 z-10 w-12 bg-slate-50 px-4 py-3"><Checkbox checked={filtered.length > 0 && filtered.every(({ product }) => selectedIds.includes(product.id))} onCheckedChange={() => setSelectedIds(filtered.every(({ product }) => selectedIds.includes(product.id)) ? selectedIds.filter((id) => !filtered.some(({ product }) => product.id === id)) : Array.from(new Set([...selectedIds, ...filtered.map(({ product }) => product.id)])))} aria-label="Select all visible products" /></th>{(workspaceMode === 'master' ? ['PRODUCT', 'MASTER SKU', 'VARIANTS', 'BASE PRICE', 'MASTER STOCK', 'CHANNEL USAGE', 'UPDATED', 'ACTIONS'] : ['PRODUCT SOURCE', `${selectedListingChannel.label.toUpperCase()} LISTING`, 'READINESS & SYNC', 'CHANNEL STOCK', 'CHANNEL PRICE', 'ACTION']).map((header) => <th key={header} className={cn('px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500', (header === 'ACTIONS' || header === 'ACTION') && 'text-right')}><span className={cn('inline-flex items-center gap-1', (header === 'ACTIONS' || header === 'ACTION') && 'w-full justify-end')}>{header}{header === 'MASTER STOCK' || header === 'CHANNEL STOCK' ? <Tooltip><TooltipTrigger asChild><button type="button" className="grid size-6 place-items-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label={`How ${header.toLowerCase()} is calculated`}><Info className="size-3.5" /></button></TooltipTrigger><TooltipContent className="max-w-64 text-xs">{header === 'MASTER STOCK' ? 'Calculated automatically from stock held across Prime OS warehouses.' : 'Managed independently by default. Prime OS publishes updates only after inventory sync is configured for this listing.'}</TooltipContent></Tooltip> : null}</span></th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">{isLoading ? Array.from({ length: 6 }).map((_, index) => <tr key={index}><td className="px-4 py-3"><Skeleton className="size-4" /></td><td className="px-4 py-3"><div className="flex items-center gap-3"><Skeleton className="size-10 rounded-lg" /><div className="space-y-2"><Skeleton className="h-4 w-44" /><Skeleton className="h-3 w-28" /></div></div></td><td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td><td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td><td className="px-4 py-3"><Skeleton className="h-9 w-28" /></td><td className="px-4 py-3"><Skeleton className="h-9 w-52" /></td><td className="px-4 py-3"><Skeleton className="ml-auto h-9 w-20" /></td></tr>) : filtered.map(({ product, matrix }) => {
          const image = getProductImage(product.id, product.asin);
          const variants = product.skus?.length ?? 0;
          return <tr key={product.id} className="group transition-colors hover:bg-slate-50/60">
            <td className="sticky left-0 z-[1] bg-white px-4 py-3 group-hover:bg-slate-50"><Checkbox checked={selectedIds.includes(product.id)} onCheckedChange={() => toggleProduct(product.id)} aria-label={`Select ${product.name}`} /></td>
            <td className="px-4 py-3"><div className="flex items-start gap-3"><img src={image} alt="" className="size-10 shrink-0 rounded-lg border border-slate-200 object-cover" onError={(event) => { (event.currentTarget as HTMLImageElement).src = `https://picsum.photos/seed/${product.id}/80/80`; }} /><div className="min-w-0"><div className="flex max-w-[310px] items-center gap-2"><Link to={`/products/${product.id}`} className="block min-w-0 truncate text-sm font-semibold text-slate-900 hover:text-indigo-700">{product.name}</Link>{product.id.startsWith('prod_import_') ? <Badge variant="outline" className="shrink-0 border-sky-200 bg-sky-50 text-[10px] text-sky-700">Imported</Badge> : null}</div><p className="mt-0.5 max-w-[280px] truncate text-xs text-slate-500">{product.brand || 'Unbranded'} · {product.category || 'Uncategorized'}</p>{product.id.startsWith('prod_import_') ? <p className="mt-1 text-[11px] font-medium text-sky-700">Created from channel listing · Complete master data</p> : null}{workspaceMode === 'master' ? <DataIssueBadge product={product} onClick={() => navigate(`/products/${product.id}/edit`)} /> : null}</div></div></td>
            {workspaceMode === 'master' ? <>
              <td className="px-4 py-3"><div className="font-mono text-xs font-semibold text-slate-700">{product.sku_code}</div><Badge variant="outline" className="mt-1 capitalize">{product.status === 'published' ? 'Active' : product.status}</Badge></td>
              <td className="px-4 py-3"><span className="text-sm font-medium tabular-nums text-slate-700">{variants === 0 ? 'Single Product' : `${variants} ${variants === 1 ? 'Option' : 'Options'}`}</span></td>
              <td className="px-4 py-3 text-sm font-semibold tabular-nums text-slate-900">{formatLocalizedMoney(locale, product.retail_price, product.price_currency)}</td>
              <td className="px-4 py-3"><StockStatusCell product={product} matrix={matrix} inventorySyncKeys={inventorySyncKeys} onClick={() => setStockTarget(product)} onChannelIssue={(channel) => navigate(`/products/${product.id}/channels/${channel}`)} /></td>
              <td className="px-4 py-3"><ListingCoverage matrix={matrix} onClick={() => navigate(`/products/${product.id}?tab=channels`)} /></td>
              <td className="px-4 py-3"><p className="text-sm font-medium text-slate-700">{new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(product.updated_at))}</p><p className="mt-1 text-xs text-slate-500">Product record</p></td>
              <td className="px-4 py-3"><div className="flex justify-end gap-2">{product.id.startsWith('prod_import_') && !getProductQuality(product).ready ? <Button size="sm" variant="outline" onClick={() => window.location.assign(`/products/${product.id}/edit`)}><Pencil className="size-4" />Complete master</Button> : null}<DropdownMenu><DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="size-10" aria-label={`More actions for ${product.name}`}><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-56"><DropdownMenuItem onClick={() => product.id.startsWith('prod_import_') ? window.location.assign(`/products/${product.id}/edit`) : navigate(`/products/${product.id}/edit`)}><Pencil className="size-4" />{product.id.startsWith('prod_import_') && !getProductQuality(product).ready ? 'Complete Product Master' : 'Edit master product'}</DropdownMenuItem><DropdownMenuItem onClick={() => navigate(`/products/${product.id}/channel-listings/new`)}><Layers3 className="size-4" />Create channel listings</DropdownMenuItem><DropdownMenuItem onClick={() => toast({ title: 'Product duplicated', description: `${product.name} copied as a draft.` })}><Copy className="size-4" />Duplicate master product</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem className="text-rose-600 focus:text-rose-700" onClick={() => { updateProduct(product.id, { id: product.id, status: 'archived' }); setStockRevision((value) => value + 1); toast({ title: 'Product archived', description: `${product.name} was moved out of the active catalog.` }); }}><Archive className="size-4" />Archive master product</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></td>
            </> : <>
              <td className="px-4 py-3"><div className="flex items-center gap-2"><ChannelLogo channel={selectedListingChannel} /><div><p className="text-sm font-semibold text-slate-900">{matrix[listingChannel] === 'missing' ? 'Listing not created' : `${selectedListingChannel.shortLabel}-${product.sku_code}`}</p><p className="mt-1 text-xs text-slate-500">{matrix[listingChannel] === 'missing' ? `Create from Product Master` : 'Channel-owned content and offer'}</p></div></div></td>
              <td className="px-4 py-3"><div className="flex items-center gap-2"><span className={cn('size-2.5 rounded-full', statusTone[matrix[listingChannel]])} /><span className="text-sm font-semibold text-slate-800">{statusLabel[matrix[listingChannel]]}</span></div><p className="mt-1 pl-[18px] text-xs text-slate-500">{matrix[listingChannel] === 'error' ? 'Action required before retry' : matrix[listingChannel] === 'pending' ? 'Waiting for channel processing' : matrix[listingChannel] === 'synced' ? 'Channel data is current' : 'Ready to configure'}</p></td>
              <td className="px-4 py-3"><ChannelStockCell product={product} channel={listingChannel} status={matrix[listingChannel]} syncEnabled={inventorySyncKeys.includes(`${product.id}:${listingChannel}`)} onClick={() => setChannelStockTarget({ product, channel: listingChannel, status: matrix[listingChannel] })} /></td>
              <td className="px-4 py-3"><p className="text-sm font-semibold tabular-nums text-slate-900">{formatLocalizedMoney(locale, product.retail_price, product.price_currency)}</p><p className="mt-1 text-xs text-slate-500">Inherited from master</p></td>
              <td className="px-4 py-3 text-right"><Button onClick={() => navigate(`/products/${product.id}/edit?section=distribution`)}>{matrix[listingChannel] === 'missing' ? <Plus className="size-4" /> : <Pencil className="size-4" />}{matrix[listingChannel] === 'missing' ? `Create ${selectedListingChannel.label} listing` : `Manage ${selectedListingChannel.label} listing`}</Button></td>
            </>}
          </tr>;
        })}</tbody>
      </table></div></TooltipProvider>

      {!isLoading && filtered.length === 0 ? <div className="grid min-h-56 place-items-center border-t border-slate-100 p-6 text-center"><div><AlertCircle className="mx-auto size-6 text-slate-400" /><p className="mt-3 text-sm font-semibold text-slate-900">No products match this view</p><p className="mt-1 text-xs text-slate-500">Try a different catalog view, search term, or filter.</p><Button variant="outline" size="sm" className="mt-4" onClick={clearCatalogFilters}><CircleDot className="size-3.5" />Clear filters</Button></div></div> : null}
    </section>

    {workspaceMode === 'master' && selectedIds.length > 0 ? <div className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-3xl flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-2xl md:left-[17rem]"><span className="mr-auto px-2 text-sm font-semibold text-slate-800">{selectedProducts.length} selected</span><Button size="sm" onClick={() => runBulkAction('Validate Selected')}><CheckCircle2 className="size-4" />Validate</Button><Button size="sm" variant="outline" onClick={() => runBulkAction('Assign Category')}><Tags className="size-4" />Assign Category</Button><Button size="sm" variant="outline" onClick={() => navigate('/products/channel-listings')}><Layers3 className="size-4" />Create Listings</Button><Button size="sm" variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => runBulkAction('Archive')}><Archive className="size-4" />Archive</Button></div> : null}

    <CreateProductDialog open={createOpen} onOpenChange={setCreateOpen} existingSkus={products.map((product) => product.sku_code)} onConfirm={createProductDraft} />
    <CatalogFilterDrawer open={advancedOpen} syncFilter={syncFilter} variantFilter={variantFilter} onClose={() => setAdvancedOpen(false)} onApply={(nextSync, nextVariant) => { setSyncFilter(nextSync); setVariantFilter(nextVariant); setAdvancedOpen(false); }} />
    <ProductStockDrawer product={stockTarget} onClose={() => setStockTarget(null)} onManageInWarehouse={(product) => { setStockTarget(null); navigate(`/warehouse/stock?sku=${encodeURIComponent(product.sku_code)}`); }} />
    <ChannelStockDrawer target={channelStockTarget} syncEnabled={channelStockTarget ? inventorySyncKeys.includes(`${channelStockTarget.product.id}:${channelStockTarget.channel}`) : false} onEnable={(productId, channel) => setInventorySyncKeys((current) => Array.from(new Set([...current, `${productId}:${channel}`])))} onClose={() => setChannelStockTarget(null)} />
    <ChannelPublishingDrawer target={listingTarget} matrix={listingTarget ? rows.find(({ product }) => product.id === listingTarget.product.id)?.matrix : undefined} onClose={() => setListingTarget(null)} onPublish={(selectedChannels) => listingTarget && updateListingStatuses(listingTarget.product, selectedChannels, 'pending')} onUnpublish={(selectedChannels) => listingTarget && updateListingStatuses(listingTarget.product, selectedChannels, 'missing')} />
  </div>;
}

function ChannelStockDrawer({ target, syncEnabled, onEnable, onClose }: { target: { product: Product; channel: ChannelKey; status: SyncStatus } | null; syncEnabled: boolean; onEnable: (productId: string, channel: ChannelKey) => void; onClose: () => void }) {
  if (!target) return null;
  return <ChannelStockDrawerContent target={target} syncEnabled={syncEnabled} onEnable={onEnable} onClose={onClose} />;
}

function ChannelStockDrawerContent({ target, syncEnabled, onEnable, onClose }: { target: { product: Product; channel: ChannelKey; status: SyncStatus }; syncEnabled: boolean; onEnable: (productId: string, channel: ChannelKey) => void; onClose: () => void }) {
  const { toast } = useToast();
  const [setupOpen, setSetupOpen] = useState(false);
  const [strategy, setStrategy] = useState<'shared' | 'fixed' | 'percentage' | 'none'>('fixed');
  const [source, setSource] = useState('all');
  const channel = channels.find((item) => item.key === target.channel) ?? channels[0];
  const stock = getChannelStock(target.product, target.channel, target.status, syncEnabled);
  const [allocation, setAllocation] = useState(String(stock.allocated || Math.min(10, stock.master)));
  const [safetyStock, setSafetyStock] = useState('5');
  const allocatable = Math.max(0, stock.master - Number(safetyStock || 0));
  const requested = strategy === 'shared' ? allocatable : strategy === 'percentage' ? Math.floor(allocatable * Number(allocation || 0) / 100) : strategy === 'none' ? 0 : Number(allocation || 0);
  const blockingError = target.status === 'missing' ? `Create the ${channel.label} listing before enabling inventory sync.` : source === '' ? 'Select an inventory source.' : Number(safetyStock) < 0 ? 'Safety stock cannot be negative.' : requested > allocatable ? `Allocation exceeds available Master ATS by ${requested - allocatable} units.` : null;
  const reportedWarning = stock.reported !== null && requested !== stock.reported ? `${channel.label} currently reports ${stock.reported}. Enabling sync will update it to ${requested}.` : null;
  const statusText = stock.state === 'independent' ? 'Channel stock is independent' : stock.state === 'mismatch' ? 'Mismatch detected' : stock.state === 'processing' ? 'Sync processing' : stock.state === 'synced' ? 'Stock synced' : 'Listing not connected';
  return <Sheet open onOpenChange={(open) => !open && onClose()}><SheetContent className="w-full overflow-y-auto sm:max-w-xl"><SheetHeader><SheetTitle>{channel.label} Stock</SheetTitle><SheetDescription>{target.product.name} · Prototype comparison</SheetDescription></SheetHeader><div className="mt-6 space-y-5">
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs leading-5 text-blue-800"><strong>Prototype data:</strong> channel-reported quantities and sync times on this screen are simulated until the channel inventory API is connected.</div>
    <section className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-slate-200 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Prime OS allocation</p><p className="mt-2 text-3xl font-bold tabular-nums text-slate-950">{stock.allocated}</p><p className="mt-1 text-xs text-slate-500">Of {stock.master} Master ATS</p></div><div className="rounded-xl border border-slate-200 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{channel.label} reported</p><p className="mt-2 text-3xl font-bold tabular-nums text-slate-950">{stock.reported ?? '—'}</p><p className="mt-1 text-xs text-slate-500">Latest channel confirmation</p></div></section>
    <section className={cn('rounded-xl border p-4', stock.state === 'independent' ? 'border-slate-200 bg-slate-50' : stock.state === 'mismatch' ? 'border-rose-200 bg-rose-50' : stock.state === 'processing' ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50')}><div className="flex items-start gap-3">{stock.state === 'independent' ? <Unplug className="mt-0.5 size-5 text-slate-600" /> : stock.state === 'mismatch' ? <AlertCircle className="mt-0.5 size-5 text-rose-700" /> : stock.state === 'processing' ? <AlertTriangle className="mt-0.5 size-5 text-amber-700" /> : <CheckCircle2 className="mt-0.5 size-5 text-emerald-700" />}<div><p className="font-semibold text-slate-900">{statusText}</p><p className="mt-1 text-sm text-slate-600">{stock.state === 'independent' ? `Warehouse changes update Master Stock only. ${channel.label} stock remains unchanged until you enable inventory sync.` : stock.state === 'mismatch' ? `${channel.label} differs from the Prime OS allocation by ${Math.abs(stock.difference ?? 0)} units.` : stock.state === 'processing' ? 'Prime OS is waiting for the channel to confirm the latest quantity.' : 'The channel-reported quantity matches the current allocation.'}</p></div></div></section>
    <dl className="divide-y rounded-xl border border-slate-200 px-4"><div className="flex justify-between gap-4 py-3 text-sm"><dt className="text-slate-500">Inventory sync</dt><dd className={cn('font-semibold', syncEnabled ? 'text-emerald-700' : 'text-slate-700')}>{syncEnabled ? 'Enabled' : 'Not configured'}</dd></div><div className="flex justify-between gap-4 py-3 text-sm"><dt className="text-slate-500">Last channel report</dt><dd className="font-semibold text-slate-900">4 minutes ago · simulated</dd></div><div className="flex justify-between gap-4 py-3 text-sm"><dt className="text-slate-500">Stock ownership</dt><dd className="font-semibold text-slate-900">{syncEnabled ? 'Prime OS sync policy' : `${channel.label} managed`}</dd></div></dl>
    {!setupOpen ? <div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose}>Close</Button><Button onClick={() => setSetupOpen(true)}><SlidersHorizontal className="size-4" />Configure Inventory Sync</Button></div> : <section className="space-y-4 rounded-xl border border-indigo-200 bg-indigo-50/30 p-4"><div><h3 className="font-semibold text-slate-900">Inventory Sync Setup</h3><p className="mt-1 text-xs text-slate-500">Configure what Prime OS will publish to {channel.label}. Validation runs before sync is enabled.</p></div>
      <label className="grid gap-1.5 text-sm font-semibold text-slate-700">Inventory source<select value={source} onChange={(event) => setSource(event.target.value)} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium"><option value="">Select source</option><option value="all">All mapped warehouses</option>{Object.entries(warehouseNames).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
      <fieldset><legend className="text-sm font-semibold text-slate-700">Allocation strategy</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{([['shared', 'Shared pool'], ['fixed', 'Fixed quantity'], ['percentage', 'Percentage'], ['none', 'Do not sync']] as const).map(([value, label]) => <label key={value} className={cn('flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border bg-white px-3 text-sm font-medium', strategy === value ? 'border-indigo-400 ring-1 ring-indigo-200' : 'border-slate-200')}><input type="radio" name="allocation-strategy" value={value} checked={strategy === value} onChange={() => setStrategy(value)} />{label}</label>)}</div></fieldset>
      <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1.5 text-sm font-semibold text-slate-700">Safety stock<Input type="number" min="0" value={safetyStock} onChange={(event) => setSafetyStock(event.target.value)} /></label>{strategy === 'fixed' || strategy === 'percentage' ? <label className="grid gap-1.5 text-sm font-semibold text-slate-700">{strategy === 'fixed' ? 'Channel quantity' : 'Allocation percentage'}<Input type="number" min="0" max={strategy === 'percentage' ? 100 : undefined} value={allocation} onChange={(event) => setAllocation(event.target.value)} /></label> : null}</div>
      <div className="rounded-lg border border-slate-200 bg-white p-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Preview</p><div className="mt-2 flex items-center justify-between gap-3"><span className="text-sm text-slate-600">Master ATS after safety stock</span><strong className="tabular-nums">{allocatable}</strong></div><div className="mt-2 flex items-center justify-between gap-3"><span className="text-sm text-slate-600">Will publish to {channel.label}</span><strong className="tabular-nums">{requested}</strong></div></div>
      {blockingError ? <div role="alert" className="flex gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><AlertCircle className="mt-0.5 size-4 shrink-0" />{blockingError}</div> : reportedWarning ? <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><AlertTriangle className="mt-0.5 size-4 shrink-0" />{reportedWarning}</div> : <div className="flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 className="mt-0.5 size-4 shrink-0" />Inventory setup is ready.</div>}
      <div className="flex justify-end gap-2 border-t border-indigo-100 pt-4"><Button variant="outline" onClick={() => setSetupOpen(false)}>Back</Button><Button disabled={Boolean(blockingError)} onClick={() => { onEnable(target.product.id, target.channel); toast({ title: 'Inventory sync enabled', description: `${channel.label} will now receive inventory updates using this policy.` }); setSetupOpen(false); }}><Send className="size-4" />Enable Inventory Sync</Button></div>
    </section>}
  </div></SheetContent></Sheet>;
}

function ProductStockDrawer({ product, onClose, onManageInWarehouse }: { product: Product | null; onClose: () => void; onManageInWarehouse: (product: Product) => void }) {
  if (!product) return null;
  const available = Object.values(product.inventory ?? {}).reduce((total, quantity) => total + Number(quantity || 0), 0);
  const status = available <= 0 ? 'out' : available <= lowStockThreshold ? 'low' : 'healthy';
  return <Sheet open onOpenChange={(open) => !open && onClose()}><SheetContent className="flex w-full flex-col overflow-hidden p-0 sm:max-w-2xl"><SheetHeader className="border-b border-slate-200 p-5 pr-12"><SheetTitle>Product Stock</SheetTitle><SheetDescription>{product.name} · {product.sku_code}</SheetDescription></SheetHeader><div className="flex-1 space-y-5 overflow-y-auto p-5 pb-24">
    <section className={cn('rounded-xl border p-4', status === 'out' ? 'border-rose-200 bg-rose-50' : status === 'low' ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50')}><div className="flex items-start gap-3">{status === 'out' ? <PackageX className="mt-0.5 size-5 text-rose-700" /> : status === 'low' ? <AlertTriangle className="mt-0.5 size-5 text-amber-700" /> : <CheckCircle2 className="mt-0.5 size-5 text-emerald-700" />}<div><p className="text-2xl font-bold tabular-nums text-slate-950">{available.toLocaleString()} available</p><p className="mt-1 text-sm text-slate-600">{status === 'out' ? 'No sellable stock remains in Prime OS warehouses.' : status === 'low' ? 'Master Stock is low. Channel quantities remain independent unless inventory sync is enabled.' : 'Master Stock is available for Prime OS orders and allocation.'}</p></div></div></section>
    <section className="overflow-hidden rounded-xl border border-slate-200"><div className="border-b border-slate-200 px-4 py-3"><div className="flex items-center gap-2"><Warehouse className="size-4 text-indigo-600" /><h3 className="text-sm font-semibold text-slate-900">Stock by warehouse</h3></div><p className="mt-1 text-xs text-slate-500">Warehouse balances roll up automatically into Master Stock. Channel quantities remain independent unless inventory sync is configured.</p></div><div className="divide-y divide-slate-100">{Object.entries(warehouseNames).map(([warehouseId, warehouseName]) => <div key={warehouseId} className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_150px] sm:items-center"><span><span className="block text-sm font-semibold text-slate-900">{warehouseName}</span><span className="mt-1 block text-xs text-slate-500">Prime OS warehouse position</span></span><span className="text-right text-sm font-bold tabular-nums text-slate-900">{Number(product.inventory?.[warehouseId] ?? 0).toLocaleString()} units</span></div>)}</div></section>
    {product.skus.length > 1 ? <section className="rounded-xl border border-slate-200 p-4"><h3 className="text-sm font-semibold text-slate-900">Variant coverage</h3><p className="mt-1 text-xs text-slate-500">{product.skus.length} variants share this warehouse allocation. Variant identity remains managed in Product Details.</p><div className="mt-3 flex flex-wrap gap-2">{product.skus.map((sku) => <span key={sku.id} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700">{sku.variation_name || sku.sku_code}</span>)}</div></section> : null}
  </div><div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 border-t border-slate-200 bg-white/95 p-4 backdrop-blur"><p className="hidden text-xs text-slate-500 sm:block">Inventory changes are controlled and audited in Warehouse.</p><div className="ml-auto flex gap-2"><Button variant="outline" onClick={onClose}>Close</Button><Button onClick={() => onManageInWarehouse(product)}><Warehouse className="size-4" />Manage in Warehouse</Button></div></div></SheetContent></Sheet>;
}

function CatalogFilterDrawer({ open, syncFilter, variantFilter, onClose, onApply }: { open: boolean; syncFilter: 'all' | 'missing-shopee' | 'errors' | 'pending'; variantFilter: VariantFilter; onClose: () => void; onApply: (sync: 'all' | 'missing-shopee' | 'errors' | 'pending', variants: VariantFilter) => void }) {
  const [draftSync, setDraftSync] = useState(syncFilter);
  const [draftVariants, setDraftVariants] = useState<VariantFilter>(variantFilter);
  useEffect(() => { if (open) { setDraftSync(syncFilter); setDraftVariants(variantFilter); } }, [open, syncFilter, variantFilter]);
  return <Sheet open={open} onOpenChange={(value) => !value && onClose()}><SheetContent className="w-full sm:max-w-md"><SheetHeader><SheetTitle>Advanced Catalog Filters</SheetTitle><SheetDescription>Narrow the master catalog by publishing health and product structure.</SheetDescription></SheetHeader><div className="mt-6 grid gap-5"><label className="grid gap-2 text-sm font-semibold text-slate-700">Channel Sync Status<select value={draftSync} onChange={(event) => setDraftSync(event.target.value as typeof draftSync)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium"><option value="all">All sync statuses</option><option value="missing-shopee">Missing / error on Shopee</option><option value="errors">Any channel sync error</option><option value="pending">Pending publication</option></select></label><label className="grid gap-2 text-sm font-semibold text-slate-700">Product Structure<select value={draftVariants} onChange={(event) => setDraftVariants(event.target.value as VariantFilter)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium"><option value="all">All product structures</option><option value="with-variants">With variants</option><option value="single">Single products</option></select></label><div className="flex gap-2 border-t border-slate-200 pt-4"><Button variant="outline" className="flex-1" onClick={() => { setDraftSync('all'); setDraftVariants('all'); }}>Reset</Button><Button className="flex-1" onClick={() => onApply(draftSync, draftVariants)}>Apply Filters</Button></div></div></SheetContent></Sheet>;
}

function ChannelPublishingDrawer({ target, matrix, onClose, onPublish, onUnpublish }: { target: { product: Product; channel?: ChannelKey } | null; matrix?: Record<ChannelKey, SyncStatus>; onClose: () => void; onPublish: (channels: ChannelKey[]) => void; onUnpublish: (channels: ChannelKey[]) => void }) {
  const navigate = useNavigate();
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

      {selectedChannel && singleStatus === 'synced' ? <section className="space-y-3 rounded-xl border border-slate-200 p-4"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-slate-900">Published listing</p><p className="mt-1 text-xs text-slate-500">External ID: {selectedChannel.shortLabel}-{target.product.sku_code}</p></div><span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700"><span className="size-2 rounded-full bg-emerald-500" />Synced</span></div><Button className="w-full" onClick={() => navigate(`/products/${target.product.id}/channels/${selectedChannel.key}`)}><Pencil className="size-4" />Manage {selectedChannel.label} Listing</Button><div className="grid grid-cols-2 gap-2"><Button variant="outline" asChild><a href={`https://${selectedChannel.key}.example/listing/${target.product.sku_code}`} target="_blank" rel="noreferrer"><ExternalLink className="size-4" />View live</a></Button><Button variant="outline" onClick={() => onPublish([selectedChannel.key])}><Send className="size-4" />Sync Now</Button></div><Button variant="outline" className="w-full border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => onUnpublish([selectedChannel.key])}><Unplug className="size-4" />Unpublish from {selectedChannel.label}</Button><p className="text-xs leading-5 text-slate-500">The master product and listings on other channels will remain available.</p></section> : <>
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
