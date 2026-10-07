import { ChannelLogo } from '@/components/channels/ChannelLogo';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, AlertTriangle, Archive, Boxes, CheckCircle2, ChevronDown, CircleDot, Columns3, Copy, Download, ExternalLink, FileSpreadsheet, Info, Layers3, Link2, MoreHorizontal, PackageX, Pencil, Plus, RotateCcw, Search, Send, ShoppingBag, SlidersHorizontal, Store, Tags, Trash2, Unplug, Upload, Warehouse, X } from 'lucide-react';
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
import { addProduct, getProducts, updateProduct, type Product } from '@/lib/product-store';
import { ProductLifecycleMenuItems } from '@/components/products/ProductLifecycleActions';
import { MasterStatusHelp } from '@/components/products/MasterStatusHelp';
import { useProductLifecycleActions } from '@/hooks/use-product-lifecycle';
import { getWarehouses } from '@/lib/warehouse-store';
import { formatLocalizedMoney } from '@/lib/i18n/format';
import { useI18n } from '@/lib/i18n/I18nContext';
import { getProductImage } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { getSavedAmazonListing } from '@/lib/amazon-listing-store';
import { CreateProductDialog, type CreateProductDraftInput } from '@/components/products/CreateProductDialog';
import { ProductGettingStarted } from '@/components/products/ProductGettingStarted';
import { ConnectStoreWizardModal } from '@/components/channels/ConnectStoreWizardModal';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { createEmptyListingCatalog, type ListingIntakeCatalog } from '@/lib/listing-intake-catalog';
import { withFirstMasterDemoData } from '@/lib/catalog-import-sku-demo';
import { ProductListingIntake } from '@/components/products/ProductListingIntake';
import type { IntakeStage } from '@/components/products/ListingMasterReview';
import { ListingReviewBanner } from '@/components/products/ListingReviewBanner';
import { useProductChannelSetup } from '@/hooks/use-product-channel-setup';
import { pendingListingReviews, unfinishedListingReviews } from '@/lib/product-listing-intake';
import { legacyMappingIssues } from '@/lib/legacy-listing-review';
import { productIntroMode, type ProductOnboardingPreview } from '@/lib/product-onboarding';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getCatalogImportItems } from '@/lib/catalog-import-store';
import { getProductAttentionHref } from '@/lib/product-attention-navigation';
import { AdjustWarehouseStockDialog } from '@/components/inventory/AdjustWarehouseStockDialog';
import { ManageStockHoldsButton } from '@/components/inventory/ManageStockHoldsDialog';
import { StockNumber, type StockAdjustmentTarget } from '@/components/inventory/WarehouseStockTable';
import { canEditWarehouseStock, stockAt } from '@/lib/warehouse-stock-view';
import { getStoredMasterReadiness } from '@/lib/product-master-readiness';
import { isDraftMaster, isImportedMaster, isMasterReadyToPublish, matchesCatalogView, matchesTodoFilter, type CatalogView, type TodoFilter, type ProductSourceFilter, type DraftReadinessFilter } from '@/lib/product-catalog-views';
import { getChannelListingState, listingIndicatorLabel, type ListingIndicator, type CatalogChannelKey } from '@/lib/channel-listing-state';

type ChannelKey = CatalogChannelKey;
type VariantFilter = 'all' | 'with-variants' | 'single';
type StockFilter = 'all' | 'in-stock' | 'low-stock' | 'out-of-stock';
type WorkspaceMode = 'master' | 'listings';
type MasterStatusFilter = 'all' | Product['status'];
type MasterColumn = 'status' | 'base-price' | 'stock' | 'linked-listings' | 'updated';
type AttentionFilter = 'all' | 'stock' | 'sync' | 'incomplete';

function getProductQuality(product: Product) {
  return getStoredMasterReadiness(product);
}

function getProductDisplayName(name: string) {
  return name.replace(/^\[Test \d+\]\s*/, '').replace(/\s+— Imported$/, '');
}

function getProductDataIssue(product: Product) {
  if (product.status === 'archived') return null;
  const quality = getProductQuality(product);
  const count = Math.max(product.import_issues?.length ?? 0, 1);
  const dataIssues = (product.import_issues ?? []).filter(issue => !legacyMappingIssues(product).includes(issue));
  if (product.import_result === 'needs_review' && dataIssues.length) {
    return { label: `${dataIssues.length} data issues`, action: 'Fix data', detail: dataIssues.join(', ') };
  }
  if (product.import_result === 'incomplete') {
    return { label: `Incomplete · ${count} missing`, action: 'Fix data', detail: product.import_issues?.join(', ') || quality.missing.join(', ') };
  }
  if (!quality.ready) {
    return { label: `${quality.missing.length} data issue${quality.missing.length === 1 ? '' : 's'}`, action: 'Fix data', detail: `Missing: ${quality.missing.join(', ')}` };
  }
  return null;
}

const lowStockThreshold = 10;
const warehouseNames = Object.fromEntries(getWarehouses().map(warehouse => [warehouse.id, warehouse.name])) as Record<string, string>;

function getStockSummary(product: Product) {
  const available = Object.values(product.inventory ?? {}).reduce((total, quantity) => total + Number(quantity || 0), 0);
  const status: Exclude<StockFilter, 'all'> = available <= 0 ? 'out-of-stock' : available < lowStockThreshold ? 'low-stock' : 'in-stock';
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

const statusTone: Record<ListingIndicator, string> = {
  live: 'bg-emerald-500',
  draft: 'bg-slate-400',
  inactive: 'bg-slate-400',
  unconfirmed: 'bg-slate-400',
  pending: 'bg-amber-400',
  error: 'bg-rose-500',
  missing: 'bg-slate-300',
};

const statusLabel = listingIndicatorLabel;
const masterStatusConfig: Record<Product['status'], { label: string; dotTone: string }> = {
  published: { label: 'Active', dotTone: 'bg-emerald-500 dark:bg-emerald-400' },
  review: { label: 'Draft', dotTone: 'bg-slate-400' },
  draft: { label: 'Draft', dotTone: 'bg-slate-400' },
  archived: { label: 'Archived', dotTone: 'bg-slate-300 dark:bg-slate-500' },
};
function getChannelMatrix(product: Product): Record<ChannelKey, ListingIndicator> {
  const amazonListing = getSavedAmazonListing(product.id);
  return Object.fromEntries(channels.map(({ key }) => [key, getChannelListingState(product, key, amazonListing).indicator])) as Record<ChannelKey, ListingIndicator>;
}


function ChannelMark({ channel, status, price, onClick }: { channel: (typeof channels)[number]; status: ListingIndicator; price: string; onClick: () => void }) {
  return <Tooltip><TooltipTrigger asChild><button type="button" onClick={onClick} className="relative grid size-9 place-items-center rounded-md transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" aria-label={`${channel.label}: ${statusLabel[status]} (${price}). Open listing actions.`}><ChannelLogo channel={channel} muted={status === 'missing'} /><span className={cn('absolute right-0.5 top-0.5 size-2.5 rounded-full border-2 border-white', statusTone[status])} /></button></TooltipTrigger><TooltipContent side="top" className="text-xs">{channel.label}: {statusLabel[status]} ({price})</TooltipContent></Tooltip>;
}

function ChannelOverflow({ matrix, onClick }: { matrix: Record<ChannelKey, ListingIndicator>; onClick: () => void }) {
  return <Tooltip><TooltipTrigger asChild><button type="button" onClick={onClick} className="inline-flex h-8 items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-600 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" aria-label={`Show ${overflowChannels.length} more channel listings`}>+{overflowChannels.length} more</button></TooltipTrigger><TooltipContent side="top" align="start" className="w-60 p-2"><p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">All channel statuses</p><div className="space-y-0.5">{channels.map((channel) => <div key={channel.key} className="flex items-center gap-2 rounded-md px-2 py-1.5"><ChannelLogo channel={channel} size="sm" muted={matrix[channel.key] === 'missing'} /><span className="flex-1 text-xs font-medium text-slate-700">{channel.label}</span><span className={cn('size-2 rounded-full', statusTone[matrix[channel.key]])} /><span className="text-[10px] text-slate-500">{statusLabel[matrix[channel.key]]}</span></div>)}</div><p className="mt-1 border-t border-slate-100 px-2 pt-1.5 text-[10px] text-slate-400">Click to manage all channels</p></TooltipContent></Tooltip>;
}

function StockStatusCell({ product, matrix, inventorySyncKeys, onClick, onChannelIssue }: { product: Product; matrix: Record<ChannelKey, ListingIndicator>; inventorySyncKeys: string[]; onClick: () => void; onChannelIssue: (channel: ChannelKey, listingId: string) => void }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(closeTimer.current), []);
  const keepOpen = () => { clearTimeout(closeTimer.current); setOpen(true); };
  const closeAfterPointerLeaves = () => { closeTimer.current = setTimeout(() => setOpen(false), 180); };
  const { available, status } = getStockSummary(product);
  const stockNotSet = product.status === 'draft' && available === 0;
  const valueTone = status === 'out-of-stock' ? 'text-rose-700 dark:text-rose-300' : status === 'low-stock' ? 'text-amber-700 dark:text-amber-300' : 'text-foreground';
  const channelIssues = product.channels.flatMap((listing, listingIndex) => {
    const channelKey = listing.channel === 'website' ? 'primeweb' : listing.channel;
    const channel = channels.find((item) => item.key === channelKey);
    if (!channel) return [];
    const stock = getChannelStock(product, channel.key, matrix[channel.key], inventorySyncKeys.includes(`${product.id}:${channel.key}`));
    const hasStockIssue = stock.reported === 0 || (available >= lowStockThreshold && stock.reported !== null && stock.reported < lowStockThreshold);
    if (!hasStockIssue) return [];
    const matchingSources = product.import_sources?.filter((source) => source.channel === listing.channel) ?? [];
    const sameChannelIndex = product.channels.slice(0, listingIndex).filter((item) => item.channel === listing.channel).length;
    const store = listing.store_name ?? matchingSources[sameChannelIndex]?.store ?? matchingSources[0]?.store ?? `${channel.label} shop`;
    return [{ channel, stock, store, listing }];
  });
  const outOfStockShops = channelIssues.filter(({ stock }) => stock.reported === 0);
  const shopIssueLabel = outOfStockShops.length === channelIssues.length
    ? `${channelIssues.length} shop${channelIssues.length === 1 ? '' : 's'} out of stock`
    : `Stock ${outOfStockShops.length ? 'risk' : 'low'} at ${channelIssues.length} shop${channelIssues.length === 1 ? '' : 's'}`;

  return <div className="flex min-w-32 flex-col items-end">
    <button type="button" onClick={onClick} className="min-h-7 rounded text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`${product.name}: ${stockNotSet ? 'master stock not set' : `${available} master stock available`}. Manage master stock.`}>
      <span className={cn('block text-sm font-semibold tabular-nums', stockNotSet ? 'text-muted-foreground' : valueTone)}>{stockNotSet ? 'Not set' : available.toLocaleString()}</span>
    </button>
    {channelIssues.length > 0 ? <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild><button type="button" onMouseEnter={keepOpen} onMouseLeave={closeAfterPointerLeaves} onClick={event => { event.preventDefault(); keepOpen(); }} className={cn('inline-flex min-h-6 items-center gap-1 rounded text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', outOfStockShops.length ? 'text-rose-700 dark:text-rose-300' : 'text-amber-700 dark:text-amber-300')} aria-label={`${shopIssueLabel}. Show affected shops.`}><AlertTriangle aria-hidden="true" className="size-3 shrink-0" />{shopIssueLabel}</button></PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0" onMouseEnter={keepOpen} onMouseLeave={closeAfterPointerLeaves} onOpenAutoFocus={event => event.preventDefault()} onEscapeKeyDown={() => clearTimeout(closeTimer.current)}>
        <div className="border-b px-4 py-3"><p className="text-sm font-semibold">Shop stock needs attention</p><p className="mt-1 text-xs text-muted-foreground">Master stock: <strong className={valueTone}>{available}</strong>{status !== 'in-stock' ? ` · ${status === 'out-of-stock' ? 'Out of stock' : 'Low stock'}` : ''}</p></div>
        <div className="max-h-72 space-y-1 overflow-y-auto p-2">{channelIssues.map(({ channel, stock, store, listing }) => <button key={`${channel.key}-${listing.external_id}`} type="button" onClick={() => onChannelIssue(channel.key, listing.external_id ?? '')} className="flex min-h-14 w-full items-center gap-2 rounded-lg px-2 text-left hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ChannelLogo channel={channel} size="sm" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{store}</p><p className="text-[11px] text-muted-foreground">{channel.label}</p></div><div className="text-right"><p className={cn('text-xs font-semibold tabular-nums', stock.reported === 0 ? 'text-rose-700 dark:text-rose-300' : 'text-amber-700 dark:text-amber-300')}>{stock.reported} units</p><p className="text-[11px] text-muted-foreground">{stock.reported === 0 ? 'Out of stock' : 'Low stock'} · Manage →</p></div></button>)}</div>
      </PopoverContent>
    </Popover> : !stockNotSet && status !== 'in-stock' ? <button type="button" onClick={onClick} className={cn('min-h-6 rounded text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', valueTone)}>{status === 'out-of-stock' ? 'Out of stock' : 'Low stock'}</button> : null}
  </div>;
}

function ProductSources({ product }: { product: Product }) {
  const sources = product.import_sources ?? [];
  const legacySource = product.import_source?.trim();
  const isLegacyProvenance = Boolean(legacySource?.includes('·') && !/(linked|separated|mismatch|conflict)/i.test(legacySource));
  const sourceChannels = sources.length ? sources.map(source => source.channel) : product.channels.map(listing => listing.channel);
  const labels = [...new Set(sourceChannels.map(key => channels.find(item => item.key === (key === 'website' ? 'primeweb' : key))?.label ?? key))];
  if (!labels.length && isLegacyProvenance) labels.push(legacySource!.split('·')[0].trim());
  if (!labels.length) return null;
  const detail = `${sources.length || isLegacyProvenance ? 'Imported from' : 'Linked listings:'} ${labels.join(', ')}`;
  return <><span aria-hidden="true">·</span><Tooltip><TooltipTrigger asChild><span tabIndex={0} aria-label={detail} className="inline-flex min-w-0 items-center gap-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Link2 aria-hidden="true" className="size-3 shrink-0" /><span className="truncate">{labels.slice(0, 2).join(', ')}{labels.length > 2 ? ` (+${labels.length - 2})` : ''}</span></span></TooltipTrigger><TooltipContent>{detail}</TooltipContent></Tooltip></>;
}

function ListingCoverage({ product, matrix, inventorySyncKeys, onClick }: { product: Product; matrix: Record<ChannelKey, ListingIndicator>; inventorySyncKeys: string[]; onClick: () => void }) {
  const usedChannels = channels.filter((channel) => matrix[channel.key] !== 'missing');
  const visibleChannels = usedChannels.slice(0, 3);
  const overflow = usedChannels.slice(3);
  const getListingDetails = (channel: (typeof channels)[number]) => {
    const sourceChannel = channel.key === 'primeweb' ? 'website' : channel.key;
    const listing = product.channels.find(item => item.channel === sourceChannel);
    const source = product.import_sources?.find(item => item.channel === sourceChannel);
    const legacySourceParts = product.import_source?.split('·').map(part => part.trim());
    const legacyStore = legacySourceParts?.length === 2 && legacySourceParts[0].toLowerCase() === channel.label.toLowerCase() ? legacySourceParts[1] : null;
    const overrideKey = channel.key === 'primeweb' ? 'webstore' : channel.key;
    const override = product.channel_overrides?.[overrideKey as keyof NonNullable<Product['channel_overrides']>];
    const stock = getChannelStock(product, channel.key, matrix[channel.key], inventorySyncKeys.includes(`${product.id}:${channel.key}`));
    return {
      store: listing?.store_name ?? source?.store ?? legacyStore ?? `${channel.label} shop`,
      sku: listing?.shop_sku || override?.listing_sku || listing?.external_id || 'Not configured',
      stock: { ...stock, reported: listing?.reported_stock ?? stock.reported },
      state: getChannelListingState(product, channel.key, channel.key === 'amazon' ? getSavedAmazonListing(product.id) : null),
    };
  };
  const channelButton = (channel: (typeof channels)[number]) => {
    const details = getListingDetails(channel);
    const stockValue = details.stock.reported === null ? 'Not reported' : `${details.stock.reported} units`;
    return <Tooltip key={channel.key}><TooltipTrigger asChild><button type="button" onClick={onClick} className="relative grid size-9 shrink-0 cursor-pointer place-items-center rounded-full border-2 border-card bg-muted transition-colors hover:z-10 hover:bg-accent focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&>span:first-child]:rounded-full" aria-label={`${channel.label}, ${details.store}, SKU ${details.sku}, stock ${stockValue}, ${details.state.publicationLabel}, Master ${details.state.masterLabel}, ${details.state.updateLabel}. Open Channel Listings`}><ChannelLogo channel={channel} size="sm" /><span className={cn('absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-card', statusTone[matrix[channel.key]])} /></button></TooltipTrigger><TooltipContent side="top" align="start" className="w-72 p-3">
      <div className="flex items-center gap-2"><ChannelLogo channel={channel} size="sm" /><div className="min-w-0"><p className="truncate text-xs font-semibold text-foreground">{details.store}</p><p className="text-[10px] text-muted-foreground">{channel.label}</p></div></div>
      <dl className="mt-2 grid grid-cols-[88px_1fr] gap-x-2 gap-y-1 border-t border-border pt-2 text-[11px]">
        <dt className="text-muted-foreground">Shop SKU</dt><dd className="truncate font-mono font-medium text-foreground">{details.sku}</dd>
        <dt className="text-muted-foreground">Listing stock</dt><dd className="font-semibold tabular-nums text-foreground">{stockValue}</dd>
        <dt className="text-muted-foreground">Listing status</dt><dd className="font-medium text-foreground">{details.state.publicationLabel}</dd>
        <dt className="text-muted-foreground">Master status</dt><dd className="font-medium text-foreground">{details.state.masterLabel}</dd>
        <dt className="text-muted-foreground">Listing update</dt><dd className="text-foreground">{details.state.updateLabel}</dd>
      </dl>
      <p className="mt-2 border-t border-border pt-2 text-[11px] leading-relaxed text-muted-foreground">{details.state.explanation}</p>
      <p className="mt-2 text-[10px] text-muted-foreground">Click to manage this listing</p>
    </TooltipContent></Tooltip>;
  };

  if (usedChannels.length === 0) return <button type="button" onClick={onClick} className="min-h-9 rounded text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="No linked listings. Create a listing.">No listings</button>;

  return <div className="flex min-w-28 items-center -space-x-1" aria-label="Linked channel listings">{visibleChannels.map(channelButton)}{overflow.length ? <Tooltip><TooltipTrigger asChild><button type="button" onClick={onClick} className="relative grid size-9 shrink-0 place-items-center rounded-full border-2 border-card bg-muted text-xs font-medium text-muted-foreground hover:z-10 hover:bg-accent hover:text-foreground focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Show ${overflow.length} more channels`}>+{overflow.length}</button></TooltipTrigger><TooltipContent side="top" align="start" className="w-60 p-3"><p className="mb-2 text-xs font-semibold">More linked channels</p><div className="space-y-2">{overflow.map((channel) => <div key={channel.key} className="flex items-center gap-2"><ChannelLogo channel={channel} size="sm" /><span className="flex-1 text-xs">{channel.label}</span><span className={cn('size-2 rounded-full', statusTone[matrix[channel.key]])} /><span className="text-[11px] text-muted-foreground">{statusLabel[matrix[channel.key]]}</span></div>)}</div></TooltipContent></Tooltip> : null}</div>;
}

function getChannelStock(product: Product, channel: ChannelKey, status: ListingIndicator, syncEnabled = false) {
  const master = getStockSummary(product).available;
  const channelIndex = channels.findIndex((item) => item.key === channel);
  const channelQuantity = status === 'missing' ? 0 : Math.floor(master * (0.18 + channelIndex * 0.025));
  if (['missing', 'draft', 'inactive', 'unconfirmed'].includes(status)) return { master, allocated: 0, reported: null, difference: null, state: 'not-connected' } as const;
  if (!syncEnabled) return { master, allocated: 0, reported: channelQuantity, difference: null, state: 'independent' } as const;
  const allocated = channelQuantity;
  const reported = status === 'missing' ? null : status === 'pending' ? null : status === 'error' ? 0 : allocated;
  const difference = reported === null ? null : reported - allocated;
  return { master, allocated, reported, difference, state: status === 'missing' ? 'not-connected' : status === 'pending' ? 'processing' : difference === 0 ? 'synced' : 'mismatch' } as const;
}

function hasOperationalAttention(product: Product, matrix: Record<ChannelKey, ListingIndicator>, inventorySyncKeys: string[], type: Exclude<AttentionFilter, 'all'>) {
  // Archiving a Master does not stop its live listings. Preserve operational alerts,
  // but never demand Master completeness or import review on an archived record.
  const archived = product.status === 'archived';
  const hasListing = Object.values(matrix).some(status => status !== 'missing');
  if (archived && (!hasListing || type === 'incomplete')) return false;
  const masterStock = getStockSummary(product);
  const listingStockRisk = channels.some((channel) => {
    if (matrix[channel.key] === 'missing') return false;
    const stock = getChannelStock(product, channel.key, matrix[channel.key], inventorySyncKeys.includes(`${product.id}:${channel.key}`));
    return stock.reported !== null && stock.reported < lowStockThreshold;
  });
  // Match the list's "Not set" display for zero-stock drafts. Treat this as
  // setup work unless a linked listing has a selling risk of its own.
  const draftStockNotSet = isDraftMaster(product) && masterStock.available === 0;
  if (type === 'stock') return (!draftStockNotSet && masterStock.status !== 'in-stock') || listingStockRisk;
  if (type === 'sync') return Object.values(matrix).some(status => status === 'error' || status === 'pending');
  return !getProductQuality(product).ready || (product.import_result === 'needs_review' && (product.import_issues ?? []).some(issue => !legacyMappingIssues(product).includes(issue)));
}

function getOperationalIssue(product: Product, matrix: Record<ChannelKey, ListingIndicator>, inventorySyncKeys: string[]) {
  if (hasOperationalAttention(product, matrix, inventorySyncKeys, 'stock')) return { type: 'stock' as const, priority: 1 };
  if (hasOperationalAttention(product, matrix, inventorySyncKeys, 'sync')) return { type: 'sync' as const, priority: 2 };
  if (hasOperationalAttention(product, matrix, inventorySyncKeys, 'incomplete')) return { type: 'incomplete' as const, priority: 4 };
  return null;
}

function ChannelStockCell({ product, channel, status, syncEnabled, onClick }: { product: Product; channel: ChannelKey; status: ListingIndicator; syncEnabled: boolean; onClick: () => void }) {
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
  const [todoFilter, setTodoFilter] = useState<TodoFilter>('all');
  const [attentionFilter, setAttentionFilter] = useState<AttentionFilter>('all');
  const [channelFilter, setChannelFilter] = useState<'all' | ChannelKey>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [variantFilter, setVariantFilter] = useState<VariantFilter>('all');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [masterStatusFilter, setMasterStatusFilter] = useState<MasterStatusFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<ProductSourceFilter>('all');
  const [draftReadinessFilter, setDraftReadinessFilter] = useState<DraftReadinessFilter>('all');
  const [hiddenMasterColumns, setHiddenMasterColumns] = useState<MasterColumn[]>([]);
  const workspaceMode: WorkspaceMode = location.pathname.includes('/channel-listings') ? 'listings' : 'master';
  const showingDrafts = workspaceMode === 'master' && catalogView === 'todo' && todoFilter === 'drafts';
  const [listingChannel, setListingChannel] = useState<ChannelKey>(channels.some(({ key }) => key === initialChannel) ? initialChannel as ChannelKey : 'amazon');
  const [legendFilter, setLegendFilter] = useState<'all' | ListingIndicator>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [intakeOpen, setIntakeOpen] = useState(queryParams.get('review') === 'links');
  const [intakeStage, setIntakeStage] = useState<IntakeStage>('queue');
  const [intakeGuideActions, setIntakeGuideActions] = useState<HTMLDivElement | null>(null);
  const [intakeDirty, setIntakeDirty] = useState(false);
  const [discardIntake, setDiscardIntake] = useState(false);
  const [recentMasterIds, setRecentMasterIds] = useState<string[]>([]);
  const savedInIntake = useRef<'linked' | 'created' | null>(null);
  useEffect(() => {
    if (intakeOpen || !recentMasterIds.length) return;
    const timer = setTimeout(() => setRecentMasterIds([]), 60_000);
    return () => clearTimeout(timer);
  }, [intakeOpen, recentMasterIds]);
  const closeIntake = () => {
    setIntakeOpen(false);
    if (!savedInIntake.current || previewCatalog) return;
    clearCatalogFilters();
    setCatalogView(savedInIntake.current === 'created' ? 'active' : 'all');
    setHiddenMasterColumns(columns => columns.filter(column => column !== 'updated'));
    requestAnimationFrame(() => catalogSearchRef.current?.scrollIntoView?.({ block: 'center', behavior: 'instant' }));
  };
  const intakeReturnRef = useRef<HTMLElement | null>(null);
  const catalogSearchRef = useRef<HTMLInputElement | null>(null);
  const openIntake = () => {
    savedInIntake.current = null;
    intakeReturnRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSelectedIds([]);
    setIntakeStage('queue');
    setIntakeOpen(true);
  };
  const previewMode: ProductOnboardingPreview | undefined = workspaceMode !== 'master' ? undefined : queryParams.get('preview') === 'no-channels' ? 'no-channels' : queryParams.get('preview') === 'first-product' ? 'no-products' : undefined;
  const previewIntro = Boolean(previewMode);
  const previewCatalogRef = useRef<ListingIntakeCatalog | null>(null);
  if (previewMode === 'no-products' && !previewCatalogRef.current) previewCatalogRef.current = createEmptyListingCatalog(pendingListingReviews().map(withFirstMasterDemoData));
  const previewCatalog = previewMode === 'no-products' ? previewCatalogRef.current! : undefined;
  const [hasCreatedMaster, setHasCreatedMaster] = useState(() => {
    try { return localStorage.getItem('prime-product-intro-completed-v1') === '1'; }
    catch { return false; }
  });
  const [importOpen, setImportOpen] = useState(false);
  const [manualImportFileName, setManualImportFileName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [listingTarget, setListingTarget] = useState<{ product: Product; channel?: ChannelKey } | null>(null);
  const [stockTarget, setStockTarget] = useState<Product | null>(null);
  const [stockAdjustment, setStockAdjustment] = useState<Partial<StockAdjustmentTarget> | null>(null);
  const [channelStockTarget, setChannelStockTarget] = useState<{ product: Product; channel: ChannelKey; status: ListingIndicator } | null>(null);
  const lifecycle = useProductLifecycleActions((_action, id) => {
    setSelectedIds(current => current.filter(selected => selected !== id));
    setStockRevision(value => value + 1);
  });
  const [publishTarget, setPublishTarget] = useState<Product | null>(null);
  const [inventorySyncKeys, setInventorySyncKeys] = useState<string[]>([]);
  const [, setStockRevision] = useState(0);
  const [catalogSettingsRevision, setCatalogSettingsRevision] = useState(0);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, Partial<Record<ChannelKey, ListingIndicator>>>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [viewedMatchIds, setViewedMatchIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('viewed-product-match-ids') ?? '[]') as string[];
    } catch {
      return [];
    }
  });

  const markMatchAsViewed = (product: Product) => {
    if (product.import_result !== 'matched' || viewedMatchIds.includes(product.id)) return;
    const nextIds = [...viewedMatchIds, product.id];
    setViewedMatchIds(nextIds);
    localStorage.setItem('viewed-product-match-ids', JSON.stringify(nextIds));
  };

  const products = getProducts();
  const pendingListings = previewCatalog ? pendingListingReviews(previewCatalog.products(), previewCatalog.listings()) : pendingListingReviews(products);
  const unfinishedListings = previewCatalog ? unfinishedListingReviews(previewCatalog.products(), previewCatalog.listings()) : unfinishedListingReviews(products);
  const reviewListings = [...pendingListings, ...unfinishedListings];
  const introMode = productIntroMode(products.length, hasCreatedMaster, previewIntro);
  const showingIntro = introMode === 'intro';
  const showQueueBanner = introMode === 'catalog' && reviewListings.length > 0;
  const channelSetup = useProductChannelSetup(showingIntro && workspaceMode === 'master' && !previewIntro, queryParams.get('shop'));
  const selectedDemo = previewMode ?? (introMode === 'catalog' ? 'with-data' : channelSetup.snapshot.status === 'loaded' && channelSetup.snapshot.channels.length === 0 ? 'no-channels' : 'no-products');
  useEffect(() => {
    if (!products.length || hasCreatedMaster || previewIntro || workspaceMode !== 'master') return;
    setHasCreatedMaster(true);
    try { localStorage.setItem('prime-product-intro-completed-v1', '1'); } catch { /* Keep the in-session state. */ }
  }, [products.length, hasCreatedMaster, previewIntro, workspaceMode]);
  function selectProductDemo(mode: 'with-data' | ProductOnboardingPreview) {
    const params = new URLSearchParams(location.search);
    if (mode === 'with-data') params.delete('preview');
    else params.set('preview', mode === 'no-channels' ? 'no-channels' : 'first-product');
    params.delete('q');
    setIntakeOpen(false);
    setSelectedIds([]);
    setCatalogView('all');
    clearCatalogFilters();
    navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
  }
  const openProductDraft = (id: string) => navigate(`/products/${encodeURIComponent(id)}/edit?section=product-data`);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 120);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const refreshReadiness = () => setCatalogSettingsRevision(value => value + 1);
    window.addEventListener('focus', refreshReadiness);
    window.addEventListener('storage', refreshReadiness);
    return () => {
      window.removeEventListener('focus', refreshReadiness);
      window.removeEventListener('storage', refreshReadiness);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const query = params.get('q');
    const channel = params.get('channel');
    if (query !== null) setSearch(query);
    if (channel && channels.some(({ key }) => key === channel)) setListingChannel(channel as ChannelKey);
    setCatalogView('all');
    setTodoFilter('all');
    setAttentionFilter('all');
    setDraftReadinessFilter('all');
  }, [location.pathname, location.search]);

  const rows = useMemo(() => products
    .filter((product) => !hiddenIds.includes(product.id))
    .map(product => ({ product, matrix: { ...getChannelMatrix(product), ...statusOverrides[product.id] } }))
    .sort((a, b) => {
      if (catalogView !== 'todo') return new Date(b.product.updated_at).getTime() - new Date(a.product.updated_at).getTime()
        || Number(recentMasterIds.includes(b.product.id)) - Number(recentMasterIds.includes(a.product.id));
      const aIssue = getOperationalIssue(a.product, a.matrix, inventorySyncKeys);
      const bIssue = getOperationalIssue(b.product, b.matrix, inventorySyncKeys);
      if ((aIssue?.priority ?? 99) !== (bIssue?.priority ?? 99)) return (aIssue?.priority ?? 99) - (bIssue?.priority ?? 99);
      const importPriority = Number(Boolean(b.product.import_result)) - Number(Boolean(a.product.import_result));
      if (importPriority !== 0) return importPriority;
      return new Date(b.product.updated_at).getTime() - new Date(a.product.updated_at).getTime();
    }), [hiddenIds, inventorySyncKeys, products, statusOverrides, catalogView, catalogSettingsRevision, recentMasterIds]);
  const categories = useMemo(() => Array.from(new Set(products.map((product) => product.category).filter(Boolean))).sort(), [products]);
  const catalogCounts = useMemo(() => ({
    all: rows.length,
    // Union, not a sum: a draft with issues is one product in To do.
    todo: rows.filter(({ product, matrix }) => matchesCatalogView(product, 'todo', Boolean(getOperationalIssue(product, matrix, inventorySyncKeys)))).length,
    attention: rows.filter(({ product, matrix }) => Boolean(getOperationalIssue(product, matrix, inventorySyncKeys))).length,
    draft: rows.filter(({ product }) => isDraftMaster(product)).length,
    active: rows.filter(({ product }) => product.status === 'published').length,
    archived: rows.filter(({ product }) => product.status === 'archived').length,
  }), [inventorySyncKeys, rows]);
  const attentionCounts = useMemo(() => ({
    all: catalogCounts.attention,
    stock: rows.filter(({ product, matrix }) => hasOperationalAttention(product, matrix, inventorySyncKeys, 'stock')).length,
    sync: rows.filter(({ product, matrix }) => hasOperationalAttention(product, matrix, inventorySyncKeys, 'sync')).length,
    incomplete: rows.filter(({ product, matrix }) => hasOperationalAttention(product, matrix, inventorySyncKeys, 'incomplete')).length,
  }), [catalogCounts.attention, inventorySyncKeys, rows]);
  const filtered = useMemo(() => rows.filter(({ product, matrix }) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || `${product.name} ${product.sku_code} ${product.category} ${product.brand}`.toLowerCase().includes(query)
      || product.skus.some(sku => sku.sku_code.toLowerCase().includes(query));
    const matchesSync = syncFilter === 'all' || (syncFilter === 'missing-shopee' ? matrix.shopee === 'missing' || matrix.shopee === 'error' : syncFilter === 'errors' ? Object.values(matrix).includes('error') : Object.values(matrix).includes('pending'));
    const needsAttention = Boolean(getOperationalIssue(product, matrix, inventorySyncKeys));
    const matchesView = workspaceMode === 'listings' || (matchesCatalogView(product, catalogView, needsAttention)
      && (catalogView !== 'todo' || matchesTodoFilter(product, todoFilter, needsAttention))
      && (catalogView !== 'todo' || todoFilter !== 'issues' || attentionFilter === 'all' || hasOperationalAttention(product, matrix, inventorySyncKeys, attentionFilter)));
    const matchesSource = workspaceMode === 'listings' || sourceFilter === 'all' || isImportedMaster(product) === (sourceFilter === 'imported');
    const matchesDraftReadiness = !showingDrafts || draftReadinessFilter === 'all'
      || (draftReadinessFilter === 'ready' ? isMasterReadyToPublish(product) : !getProductQuality(product).ready);
    const matchesChannel = workspaceMode === 'listings' || channelFilter === 'all' || matrix[channelFilter] !== 'missing';
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    const variantCount = product.skus?.length ?? 0;
    const matchesVariants = variantFilter === 'all' || (variantFilter === 'with-variants' ? variantCount > 0 : variantCount === 0);
    const matchesStock = stockFilter === 'all' || getStockSummary(product).status === stockFilter;
    const matchesMasterStatus = workspaceMode === 'listings' || masterStatusFilter === 'all'
      || (masterStatusFilter === 'draft' ? isDraftMaster(product) : product.status === masterStatusFilter);
    const matchesLegend = legendFilter === 'all' || (workspaceMode === 'listings' ? matrix[listingChannel] === legendFilter : Object.values(matrix).includes(legendFilter));
    return matchesSearch && matchesSync && matchesView && matchesSource && matchesDraftReadiness && matchesChannel && matchesCategory && matchesVariants && matchesStock && matchesMasterStatus && matchesLegend;
  }), [attentionFilter, catalogView, todoFilter, showingDrafts, categoryFilter, channelFilter, inventorySyncKeys, legendFilter, listingChannel, masterStatusFilter, sourceFilter, draftReadinessFilter, rows, search, stockFilter, syncFilter, variantFilter, workspaceMode]);

  const selectedListingChannel = channels.find((channel) => channel.key === listingChannel) ?? channels[4];
  const masterHeaders = [
    { label: 'PRODUCT' },
    { label: 'MASTER STATUS', column: 'status' },
    { label: 'BASE PRICE', column: 'base-price' },
    { label: 'MASTER STOCK', column: 'stock' },
    { label: 'LINKED LISTINGS', column: 'linked-listings' },
    { label: 'UPDATED', column: 'updated' },
    { label: 'ACTIONS' },
  ].filter(({ column }) => !column || !hiddenMasterColumns.includes(column as MasterColumn)).map(({ label }) => label);

  const readiness = useMemo(() => channels.map((channel) => ({
    ...channel,
    published: rows.filter(({ matrix }) => matrix[channel.key] === 'live').length,
    total: rows.length,
  })), [rows]);
  function updateListingStatuses(product: Product, selectedChannels: ChannelKey[], nextStatus: ListingIndicator) {
    setStatusOverrides((current) => ({ ...current, [product.id]: { ...current[product.id], ...Object.fromEntries(selectedChannels.map((channel) => [channel, nextStatus])) } }));
    toast({ title: nextStatus === 'missing' ? 'Listings unpublished' : 'Publishing queued', description: `${product.name}: ${selectedChannels.length} channel${selectedChannels.length === 1 ? '' : 's'} updated.` });
    setListingTarget(null);
  }

  function clearCatalogFilters() {
    setSearch('');
    setTodoFilter('all');
    setSourceFilter('all');
    setDraftReadinessFilter('all');
    setAttentionFilter('all');
    setChannelFilter('all');
    setCategoryFilter('all');
    setSyncFilter('all');
    setVariantFilter('all');
    setStockFilter('all');
    setMasterStatusFilter('all');
    setLegendFilter('all');
  }

  function selectCatalogView(view: CatalogView) {
    setCatalogView(view);
    setTodoFilter('all');
    setMasterStatusFilter('all');
    setAttentionFilter('all');
    setDraftReadinessFilter('all');
    setSelectedIds([]);
  }

  function selectTodoFilter(filter: TodoFilter) {
    setTodoFilter(filter);
    setMasterStatusFilter('all');
    setAttentionFilter('all');
    setDraftReadinessFilter('all');
    setSelectedIds([]);
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

  function createProductDraft(input: CreateProductDraftInput) {
    if (getProducts().some(product => [product.sku_code, ...product.skus.map(sku => sku.sku_code)].some(sku => sku.trim().toUpperCase() === input.sku.trim().toUpperCase()))) throw new Error('This SKU already exists. Generate another SKU or open the existing product.');
    const now = new Date().toISOString();
    const id = `prod_${crypto.randomUUID().slice(0, 8)}`;
    addProduct({
      id,
      name: input.name,
      sku_code: input.sku,
      product_type: input.productType,
      gtin: '', mpn: '', model_number: '', brand: '', asin: '', manufacturer: '',
      category: input.category,
      categoryId: input.categoryId,
      condition: 'new',
      description: '',
      original_price: 0,
      retail_price: 0,
      price_currency: 'JPY',
      prod_length: 0, prod_height: 0, prod_width: 0, prod_weight: 0,
      pkg_length: 0, pkg_height: 0, pkg_width: 0, pkg_weight: 0,
      country_of_origin: '', hs_code: '', images: [],
      inventory: {},
      has_variants: input.productType === 'variant',
      channels: [],
      status: 'draft',
      created_at: now,
      updated_at: now,
      skus: [],
    }, { requirePersistence: true });
    setCreateOpen(false);
    toast({ title: 'Product Master draft created', description: `${input.name} · ${input.sku} is ready for enrichment.` });
    navigate(`/products/${id}/edit?section=product-data`);
  }

  function confirmPublishMaster() {
    if (!publishTarget) return;
    updateProduct(publishTarget.id, { id: publishTarget.id, status: 'published', import_result: publishTarget.import_result === 'needs_review' ? 'needs_review' : 'published' });
    setPublishTarget(null);
    setStockRevision((value) => value + 1);
    toast({ title: 'Product Master activated', description: 'The master is active. No channel listings were created or changed.' });
  }

  function processManualImport() {
    openIntake();
    setImportOpen(false);
    setManualImportFileName('');
    toast({ title: 'Review prototype import data', description: 'No products were created or linked. Confirm your choices in Listings to link.' });
  }

  return <div className="space-y-5 p-4 md:p-6">
    <WorkspacePageHeader
      title={workspaceMode === 'master' ? 'Product Master' : 'Channel Listings'}
      description={workspaceMode === 'master' ? 'Manage shared product data across your shops.' : `Manage ${selectedListingChannel.label} content, readiness and sync without changing Product Master.`}
      icon={workspaceMode === 'master' ? ShoppingBag : Layers3}
      titleAccessory={workspaceMode === 'master' ? <div className="flex flex-wrap items-center gap-2 sm:ml-3" role="group" aria-label="Product demo mode">
        <span className="text-xs font-medium text-muted-foreground">Demo</span>
        <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
          {([{ mode: 'with-data', label: 'With data', hint: 'Show your saved products. No data is changed.' }, { mode: 'no-products', label: 'No products', hint: 'Preview no Product Masters with shop listings to review. Saved data is kept.' }, { mode: 'no-channels', label: 'No channels', hint: 'Preview no Product Masters and no connected channels. Saved data and connections are kept.' }] as const).map(({ mode, label, hint }) => {
            const selected = selectedDemo === mode;
            return <Button key={mode} size="sm" variant="ghost" aria-pressed={selected} disabled={mode === 'with-data' && products.length === 0} title={hint} onClick={() => selectProductDemo(mode)} className={cn('h-8 border px-3 text-xs motion-reduce:transition-none', selected ? 'border-primary/50 bg-primary/10 text-foreground hover:bg-primary/15' : 'border-transparent text-muted-foreground hover:text-foreground')}>{label}</Button>;
          })}
        </div>
      </div> : undefined}
      actions={workspaceMode === 'master' && !showingIntro ? <div className="flex flex-wrap items-center justify-end gap-2"><Button variant="outline" className="h-11" onClick={() => setImportOpen(true)}><Upload className="size-4" />Import products</Button><Button className="h-11" onClick={() => setCreateOpen(true)}><Plus className="size-4" />Create Product Master</Button></div> : undefined}
    />

    {workspaceMode === 'master' && <>
      {showQueueBanner && <ListingReviewBanner listings={reviewListings} unfinishedCount={unfinishedListings.length} onReview={openIntake} />}
      {showingIntro && <ProductGettingStarted createdCount={previewCatalog?.products().length ?? 0} snapshot={channelSetup.snapshot} preview={previewMode} pendingCount={reviewListings.length} sourceChannels={channels.filter(channel => reviewListings.some(listing => listing.channel === channel.key))} onReview={openIntake} onImport={() => setImportOpen(true)} onCreate={() => setCreateOpen(true)} onRetry={channelSetup.retry} onShops={() => navigate('/sales-channels/connected-channels')} onConnect={() => setConnectOpen(true)} />}
      {introMode === 'empty' && <section aria-labelledby="empty-products-title" className="rounded-xl border border-border bg-card px-6 py-12 text-center"><h2 id="empty-products-title" className="text-base font-semibold">No Product Masters yet</h2><p className="mt-2 text-sm text-muted-foreground">Use Import products or Create Product Master above to add products.</p>{pendingListings.length > 0 && <Button variant="outline" className="mt-5" onClick={openIntake}>Review shop listings ({pendingListings.length})</Button>}</section>}

    </>}

    {workspaceMode === 'listings' ? <section aria-labelledby="channel-coverage-title">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2"><div><h2 id="channel-coverage-title" className="text-sm font-semibold text-foreground">Choose a channel workspace</h2><p className="mt-1 text-xs text-muted-foreground">Each channel has its own fields, validation rules and publishing lifecycle.</p></div>{workspaceMode === 'listings' ? <Badge variant="outline">Editing listings only · Master data protected</Badge> : null}</div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
      {readiness.map((channel) => {
        const percentage = channel.total ? Math.round((channel.published / channel.total) * 100) : 0;
        const selected = workspaceMode === 'listings' && listingChannel === channel.key;
        return <button type="button" key={channel.key} aria-pressed={selected} onClick={() => { setListingChannel(channel.key); setChannelFilter('all'); setLegendFilter('all'); setSelectedIds([]); }} className={cn('cursor-pointer rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', selected ? 'border-primary bg-primary/5 ring-2 ring-primary/10' : 'border-border')}>
          <div className="flex items-center gap-2"><ChannelLogo channel={channel} size="lg" /><div><h3 className="text-sm font-semibold text-foreground">{channel.label}</h3><p className="text-xs text-muted-foreground"><span className="font-semibold tabular-nums text-foreground">{channel.published}</span> / {channel.total} live</p></div>{selected ? <CheckCircle2 className="ml-auto size-4 text-primary" /> : null}</div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${percentage}%` }} /></div>
        </button>;
      })}
      </div>
    </section> : null}

    {workspaceMode === 'listings' ? <div className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center"><ChannelLogo channel={selectedListingChannel} size="lg" /><div className="min-w-0 flex-1"><h2 className="font-semibold text-foreground">{selectedListingChannel.label} Listings</h2><p className="mt-1 text-xs text-muted-foreground">Changes here apply only to {selectedListingChannel.label}. Open a listing to edit channel-specific content and run its readiness check.</p></div><Button variant="outline" onClick={() => navigate('/products/master-catalog')}><Boxes className="size-4" />Return to Product Master</Button></div> : null}

    {(workspaceMode !== 'master' || introMode === 'catalog') && <section className="overflow-hidden rounded-xl border border-border bg-card">
      {workspaceMode === 'master' ? <><nav className="flex gap-1 overflow-x-auto border-b border-border px-3" aria-label="Catalog status">
        {([['all', 'All'], ['todo', 'To do'], ['active', 'Active'], ['archived', 'Archived']] as Array<[CatalogView, string]>).map(([key, label]) => <button key={key} type="button" aria-pressed={catalogView === key} onClick={() => selectCatalogView(key)} className={cn('relative min-h-11 shrink-0 cursor-pointer px-3 text-sm font-semibold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring', catalogView === key ? 'text-primary after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-primary' : 'text-muted-foreground hover:text-foreground')}>{label}<span className={cn('ml-1.5 rounded-full px-1.5 py-0.5 text-xs tabular-nums', catalogView === key ? 'text-primary/80' : 'text-muted-foreground')}>{catalogCounts[key]}</span></button>)}
      </nav>{catalogView === 'todo' ? <div className="flex flex-wrap items-center gap-3 border-b border-border bg-muted/20 px-4 py-2">
        <div role="group" aria-label="To do filters" className="flex flex-wrap items-center gap-1">
          {([['all', 'All items', catalogCounts.todo], ['issues', 'With issues', catalogCounts.attention], ['drafts', 'Drafts', catalogCounts.draft]] as Array<[TodoFilter, string, number]>).map(([key, label, count]) => <button key={key} type="button" aria-pressed={todoFilter === key} onClick={() => selectTodoFilter(key)} className={cn('inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md border px-3 text-xs font-semibold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', todoFilter === key ? 'border-border bg-background text-foreground shadow-sm' : 'border-transparent text-muted-foreground hover:bg-background/60 hover:text-foreground')}>
            {label}<span className="tabular-nums text-muted-foreground">{count}</span>
          </button>)}
        </div>
        {todoFilter === 'issues' ? <select aria-label="Issue type" value={attentionFilter} onChange={event => { setAttentionFilter(event.target.value as AttentionFilter); setSelectedIds([]); }} className="h-10 max-w-full rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {([['all', 'All issue types'], ['stock', 'Stock risk'], ['sync', 'Sync issue'], ['incomplete', 'Missing data']] as Array<[AttentionFilter, string]>).map(([key, label]) => <option key={key} value={key}>{label} ({attentionCounts[key]})</option>)}
        </select> : null}
      </div> : null}</> : <div className="flex min-h-11 items-center gap-2 border-b border-border px-4"><ChannelLogo channel={selectedListingChannel} size="sm" /><span className="text-sm font-semibold text-foreground">{selectedListingChannel.label} listing queue</span><span className="ml-auto text-xs text-muted-foreground">{filtered.length} master products available</span></div>}
      <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
        <div className="relative min-w-0 basis-72 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input ref={catalogSearchRef} aria-label="Search products" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={workspaceMode === 'master' ? 'Search product, Master or variant SKU...' : `Search ${selectedListingChannel.label} listing or master SKU...`} className="h-10 pl-9 pr-9" />{search ? <button type="button" onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center text-slate-400 hover:text-slate-700"><X className="size-4" /></button> : null}</div>
        <div className="flex flex-wrap items-center gap-2">
          {workspaceMode === 'master' && (catalogView === 'all' || (catalogView === 'todo' && !showingDrafts)) ? <><label className="sr-only" htmlFor="master-status-filter">Product status</label><select id="master-status-filter" value={masterStatusFilter} onChange={(event) => setMasterStatusFilter(event.target.value as MasterStatusFilter)} className="h-10 min-w-0 rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><option value="all">All statuses</option><option value="published">Active</option><option value="draft">Draft</option><option value="archived">Archived</option></select></> : null}
          {showingDrafts ? <select aria-label="Draft readiness" value={draftReadinessFilter} onChange={event => setDraftReadinessFilter(event.target.value as DraftReadinessFilter)} className="h-10 min-w-0 rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><option value="all">All drafts</option><option value="ready">Ready to publish</option><option value="incomplete">Missing data</option></select> : null}
          {workspaceMode === 'master' ? <select aria-label="Product source" value={sourceFilter} onChange={event => setSourceFilter(event.target.value as ProductSourceFilter)} className="h-10 min-w-0 rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><option value="all">All sources</option><option value="imported">Imported</option><option value="manual">Manually created</option></select> : null}
          <label className="sr-only" htmlFor="category-filter">Category</label><select id="category-filter" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="h-10 min-w-0 rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><option value="all">All categories</option>{categories.map((category) => <option key={category}>{category}</option>)}</select>
          <label className="sr-only" htmlFor="stock-filter">Stock status</label><select id="stock-filter" value={stockFilter} onChange={(event) => setStockFilter(event.target.value as StockFilter)} className="h-10 min-w-0 rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><option value="all">All stock</option><option value="in-stock">In stock</option><option value="low-stock">Low stock</option><option value="out-of-stock">Out of stock</option></select>
          {workspaceMode === 'master' ? <Popover><PopoverTrigger asChild><Button variant="outline" className="h-10 border-slate-200"><Columns3 className="size-4" />Columns</Button></PopoverTrigger><PopoverContent align="end" className="w-72 p-0"><div className="flex items-center justify-between border-b px-4 py-3"><p className="text-sm font-semibold">Product columns</p><span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{7 - hiddenMasterColumns.length}/7 visible</span></div><div className="px-3 py-2"><p className="px-1 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Always visible</p>{['Product', 'Actions'].map((label) => <div key={label} className="flex min-h-9 items-center gap-2 rounded-md px-1 text-sm"><Checkbox checked disabled aria-label={`${label} column is always visible`} /><span>{label}</span></div>)}<p className="mt-2 px-1 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Optional</p>{([{ key: 'status', label: 'Status' }, { key: 'base-price', label: 'Base price' }, { key: 'stock', label: 'Master stock' }, { key: 'linked-listings', label: 'Linked listings' }, { key: 'updated', label: 'Updated at' }] as Array<{ key: MasterColumn; label: string }>).map((column) => <label key={column.key} className="flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-1 text-sm hover:bg-muted/60"><Checkbox checked={!hiddenMasterColumns.includes(column.key)} onCheckedChange={(checked) => setHiddenMasterColumns((current) => checked ? current.filter((key) => key !== column.key) : [...current, column.key])} /><span>{column.label}</span></label>)}</div><button type="button" onClick={() => setHiddenMasterColumns([])} className="flex min-h-10 w-full items-center gap-2 border-t px-4 text-xs font-semibold text-primary hover:bg-muted/50"><RotateCcw className="size-3.5" />Reset</button></PopoverContent></Popover> : null}
          <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" className="h-10 border-slate-200" aria-label="Choose products to export"><Download className="size-4" />Export<ChevronDown className="ml-1 size-3.5 text-slate-500" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-64"><DropdownMenuItem onClick={() => exportProducts('filtered')} className="min-h-12"><Download className="size-4" /><div><p className="font-medium">Export current view</p><p className="text-xs text-muted-foreground">{filtered.length} products matching your filters</p></div></DropdownMenuItem><DropdownMenuItem onClick={() => exportProducts('all')} className="min-h-12"><Boxes className="size-4" /><div><p className="font-medium">Export all products</p><p className="text-xs text-muted-foreground">Include products outside this view</p></div></DropdownMenuItem></DropdownMenuContent></DropdownMenu>
        </div>
      </div>
      {workspaceMode === 'listings' ? <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50/40 px-4 py-2"><span className="mr-1 text-xs font-semibold text-slate-500">{selectedListingChannel.label} status</span><button type="button" onClick={() => setLegendFilter('all')} className={cn('min-h-10 rounded-md border px-3 text-xs font-semibold', legendFilter === 'all' ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-transparent text-slate-600')}>All</button>{(['live', 'draft', 'pending', 'error', 'inactive', 'unconfirmed', 'missing'] as ListingIndicator[]).map((item) => <button key={item} type="button" onClick={() => setLegendFilter((current) => current === item ? 'all' : item)} className={cn('inline-flex min-h-10 items-center gap-1.5 rounded-md border px-3 text-xs font-semibold transition-colors', legendFilter === item ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-white')}><span className={cn('size-2 rounded-full', statusTone[item])} />{statusLabel[item]}</button>)}<span className="ml-auto text-xs tabular-nums text-slate-500">{filtered.length} listings</span></div> : <div className="flex min-h-10 items-center border-b border-slate-200 bg-slate-50/40 px-4 text-xs text-slate-500"><span><strong className="font-semibold text-slate-700">{filtered.length}</strong> master products</span></div>}
      {search || sourceFilter !== 'all' || (showingDrafts && draftReadinessFilter !== 'all') || masterStatusFilter !== 'all' || channelFilter !== 'all' || categoryFilter !== 'all' || stockFilter !== 'all' || syncFilter !== 'all' || variantFilter !== 'all' ? <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50/50 px-4 py-2 text-xs"><span className="font-semibold text-slate-500">Active filters</span>{sourceFilter !== 'all' ? <button type="button" aria-label="Remove source filter" onClick={() => setSourceFilter('all')} className="inline-flex min-h-8 items-center gap-1 rounded-md border border-border bg-background px-2 font-semibold text-foreground">{sourceFilter === 'imported' ? 'Imported' : 'Manually created'}<X className="size-3" /></button> : null}{showingDrafts && draftReadinessFilter !== 'all' ? <button type="button" aria-label="Remove readiness filter" onClick={() => setDraftReadinessFilter('all')} className="inline-flex min-h-8 items-center gap-1 rounded-md border border-border bg-background px-2 font-semibold text-foreground">{draftReadinessFilter === 'ready' ? 'Ready to publish' : 'Missing data'}<X className="size-3" /></button> : null}{masterStatusFilter !== 'all' ? <button type="button" onClick={() => setMasterStatusFilter('all')} className="inline-flex min-h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 font-semibold text-slate-700">{masterStatusConfig[masterStatusFilter].label}<X className="size-3" /></button> : null}{channelFilter !== 'all' ? <button type="button" onClick={() => setChannelFilter('all')} className="inline-flex min-h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 font-semibold text-slate-700">{channels.find((channel) => channel.key === channelFilter)?.label}<X className="size-3" /></button> : null}{categoryFilter !== 'all' ? <button type="button" onClick={() => setCategoryFilter('all')} className="inline-flex min-h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 font-semibold text-slate-700">{categoryFilter}<X className="size-3" /></button> : null}{stockFilter !== 'all' ? <button type="button" onClick={() => setStockFilter('all')} className="inline-flex min-h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 font-semibold text-slate-700">{stockFilter === 'in-stock' ? 'In stock' : stockFilter === 'low-stock' ? 'Low stock' : 'Out of stock'}<X className="size-3" /></button> : null}{syncFilter !== 'all' ? <button type="button" onClick={() => setSyncFilter('all')} className="inline-flex min-h-8 items-center gap-1 rounded-md border border-indigo-200 bg-white px-2 font-semibold text-indigo-700">{syncFilter === 'errors' ? 'Sync errors' : syncFilter === 'pending' ? 'Pending publication' : 'Shopee missing/error'}<X className="size-3" /></button> : null}{variantFilter !== 'all' ? <button type="button" onClick={() => setVariantFilter('all')} className="inline-flex min-h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 font-semibold text-slate-700">{variantFilter === 'with-variants' ? 'With variants' : 'Single products'}<X className="size-3" /></button> : null}<button type="button" onClick={clearCatalogFilters} className="ml-auto min-h-8 font-semibold text-indigo-700">Clear all</button></div> : null}

      <TooltipProvider delayDuration={150}><div className="overflow-x-auto"><table className={cn('w-full text-left', workspaceMode === 'master' ? 'min-w-[1160px]' : 'min-w-[1160px]')}><thead className="border-b border-slate-200 bg-slate-50/60"><tr><th className="sticky left-0 z-10 w-12 bg-slate-50 px-4 py-3"><Checkbox checked={filtered.length > 0 && filtered.every(({ product }) => selectedIds.includes(product.id))} onCheckedChange={() => setSelectedIds(filtered.every(({ product }) => selectedIds.includes(product.id)) ? selectedIds.filter((id) => !filtered.some(({ product }) => product.id === id)) : Array.from(new Set([...selectedIds, ...filtered.map(({ product }) => product.id)])))} aria-label="Select all visible products" /></th>{(workspaceMode === 'master' ? masterHeaders : ['PRODUCT SOURCE', `${selectedListingChannel.label.toUpperCase()} LISTING`, 'READINESS & SYNC', 'CHANNEL STOCK', 'CHANNEL PRICE', 'ACTION']).map((header) => <th key={header} className={cn('px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500', (header === 'ACTIONS' || header === 'ACTION' || header === 'MASTER STOCK') && 'text-right')}><span className={cn('inline-flex items-center gap-1', (header === 'ACTIONS' || header === 'ACTION' || header === 'MASTER STOCK') && 'w-full justify-end')}>{header}{header === 'MASTER STATUS' ? <MasterStatusHelp /> : null}{header === 'MASTER STOCK' || header === 'CHANNEL STOCK' ? <Tooltip><TooltipTrigger asChild><button type="button" className="grid size-6 place-items-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label={`How ${header.toLowerCase()} is calculated`}><Info className="size-3.5" /></button></TooltipTrigger><TooltipContent className="max-w-64 text-xs">{header === 'MASTER STOCK' ? 'Stock currently available across Prime OS warehouses.' : 'Managed independently by default. Prime OS publishes updates only after inventory sync is configured for this listing.'}</TooltipContent></Tooltip> : null}</span></th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">{isLoading ? Array.from({ length: 6 }).map((_, index) => <tr key={index}><td className="px-4 py-3"><Skeleton className="size-4" /></td><td className="px-4 py-3"><div className="flex items-center gap-3"><Skeleton className="size-10 rounded-lg" /><div className="space-y-2"><Skeleton className="h-4 w-44" /><Skeleton className="h-3 w-28" /></div></div></td><td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td><td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td><td className="px-4 py-3"><Skeleton className="h-9 w-28" /></td><td className="px-4 py-3"><Skeleton className="h-9 w-52" /></td><td className="px-4 py-3"><Skeleton className="ml-auto h-9 w-20" /></td></tr>) : filtered.map(({ product, matrix }) => {
          const imageMissingFromImport = product.import_result === 'incomplete' && product.import_issues?.includes('Product image is required');
          const image = imageMissingFromImport ? '' : product.images[0] || (product.asin ? getProductImage(product.id, product.asin) : '');
          const variantCount = product.skus.length;
          const dataIssue = getProductDataIssue(product);
          return <tr key={product.id} data-product-id={product.id} className={cn("group transition-colors hover:bg-slate-50/60", recentMasterIds.includes(product.id) && "bg-primary/5")}>
            <td className="sticky left-0 z-[1] bg-white px-4 py-3 group-hover:bg-slate-50"><Checkbox checked={selectedIds.includes(product.id)} onCheckedChange={() => toggleProduct(product.id)} aria-label={`Select ${product.name}`} /></td>
            <td className="px-4 py-3"><div className="flex items-center gap-3">
              <div className="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-muted"><PackageX className="size-4 text-muted-foreground" />{image ? <img src={image} alt="" className="absolute inset-0 size-full object-cover" onError={event => { event.currentTarget.style.display = 'none'; }} /> : null}</div>
              <div className="min-w-0 max-w-[420px]">
                <Link to={`/products/${product.id}/edit`} state={{ from: `${location.pathname}${location.search}` }} onClick={() => markMatchAsViewed(product)} aria-label={`Open Product Master details for ${product.name}`} className="line-clamp-2 rounded-sm text-sm font-semibold text-foreground transition-colors hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{getProductDisplayName(product.name)}</Link>
                <div className="mt-1 flex min-h-5 items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground">
                  <span title={product.sku_code} className="max-w-40 shrink-0 truncate font-mono">{product.sku_code}</span>
                  {workspaceMode === 'master' && product.has_variants ? <><span aria-hidden="true">·</span><Link to={`/products/${product.id}/edit?section=commerce`} state={{ from: `${location.pathname}${location.search}` }} aria-label={`Manage ${variantCount} ${variantCount === 1 ? 'variant' : 'variants'} for ${product.name}`} className="inline-flex min-h-6 shrink-0 items-center rounded-sm underline decoration-muted-foreground/50 underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{variantCount} {variantCount === 1 ? 'variant' : 'variants'}</Link></> : null}
                  <span aria-hidden="true">·</span><span title={`Category: ${product.category || 'Not set'}`} className="min-w-0 max-w-28 truncate">{product.category || 'No category'}</span>
                  <ProductSources product={product} />
                </div>
              </div>
            </div></td>
            {workspaceMode === 'master' ? <>
              {!hiddenMasterColumns.includes('status') ? <td className="px-4 py-3"><span className="inline-flex items-center gap-2 whitespace-nowrap text-sm text-foreground"><span aria-hidden="true" className={cn('size-1.5 shrink-0 rounded-full', masterStatusConfig[product.status].dotTone)} />{masterStatusConfig[product.status].label}</span>{dataIssue ? <Tooltip><TooltipTrigger asChild><span tabIndex={0} className="mt-1 flex w-fit items-center gap-1 whitespace-nowrap rounded text-xs text-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-amber-300"><AlertTriangle aria-hidden="true" className="size-3" />{dataIssue.label}</span></TooltipTrigger><TooltipContent className="max-w-72">{dataIssue.detail}{product.status === 'published' ? ' The active Master and existing live listings are unchanged.' : ''}</TooltipContent></Tooltip> : null}</td> : null}
              {!hiddenMasterColumns.includes('base-price') ? <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold tabular-nums text-slate-900">{product.status === 'draft' && product.retail_price === 0 ? <span className="font-medium text-slate-500">Not set</span> : formatLocalizedMoney(locale, product.retail_price, product.price_currency)}</td> : null}
              {!hiddenMasterColumns.includes('stock') ? <td className="px-4 py-3 text-right"><StockStatusCell product={product} matrix={matrix} inventorySyncKeys={inventorySyncKeys} onClick={() => setStockTarget(product)} onChannelIssue={(channel, listingId) => navigate(`/products/${product.id}/channels/${channel}?listing=${encodeURIComponent(listingId)}&section=inventory`)} /></td> : null}
              {!hiddenMasterColumns.includes('linked-listings') ? <td className="px-4 py-3"><ListingCoverage product={product} matrix={matrix} inventorySyncKeys={inventorySyncKeys} onClick={() => navigate(`/products/${product.id}?tab=channels`)} /></td> : null}
              {!hiddenMasterColumns.includes('updated') ? <td className="px-4 py-3"><time dateTime={product.updated_at} className="whitespace-nowrap text-xs tabular-nums text-foreground" title={new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeStyle: 'long' }).format(new Date(product.updated_at))}><span className="block">{new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(product.updated_at))}</span><span className="mt-1 block text-muted-foreground">{new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZoneName: 'short' }).format(new Date(product.updated_at))}</span></time>{recentMasterIds.includes(product.id) && <span className="mt-1 block text-xs text-primary">Just updated</span>}</td> : null}
              <td className="px-4 py-3"><div className="flex items-center justify-end gap-1">{dataIssue && new URLSearchParams(location.search).get('mode') !== 'viewer' ? <Button variant="outline" size="sm" className="h-8 whitespace-nowrap text-xs" aria-label={`${dataIssue.action} for ${product.name}`} onClick={() => navigate(getProductAttentionHref(product, getProductQuality(product).missing), { state: { from: `${location.pathname}${location.search}` } })}>{dataIssue.action}</Button> : null}<DropdownMenu><DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="size-10" aria-label={`More actions for ${product.name}`}><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-60"><DropdownMenuItem onClick={() => navigate(`/products/${product.id}/edit`)}><Pencil className="size-4" />Edit master product</DropdownMenuItem><DropdownMenuItem onClick={() => navigate(`/products/${product.id}/channel-listings/new`)}><Layers3 className="size-4" />Create channel listings</DropdownMenuItem><DropdownMenuItem onClick={() => toast({ title: 'Product duplicated', description: `${product.name} copied as a draft.` })}><Copy className="size-4" />Duplicate master product</DropdownMenuItem><DropdownMenuSeparator />{new URLSearchParams(location.search).get('mode') !== 'viewer' && <ProductLifecycleMenuItems product={product} onAction={lifecycle.requestAction} />}</DropdownMenuContent></DropdownMenu></div></td>
            </> : <>
              <td className="px-4 py-3"><div className="flex items-center gap-2"><ChannelLogo channel={selectedListingChannel} /><div><p className="text-sm font-semibold text-slate-900">{matrix[listingChannel] === 'missing' ? 'Listing not created' : `${selectedListingChannel.shortLabel}-${product.sku_code}`}</p><p className="mt-1 text-xs text-slate-500">{matrix[listingChannel] === 'missing' ? `Create from Product Master` : 'Channel-owned content and offer'}</p></div></div></td>
              <td className="px-4 py-3"><div className="flex items-center gap-2"><span className={cn('size-2.5 rounded-full', statusTone[matrix[listingChannel]])} /><span className="text-sm font-semibold text-slate-800">{statusLabel[matrix[listingChannel]]}</span></div><p className="mt-1 pl-[18px] text-xs text-slate-500">{matrix[listingChannel] === 'error' ? 'Action required before retry' : matrix[listingChannel] === 'pending' ? 'Waiting for channel processing' : matrix[listingChannel] === 'live' ? 'Live on the channel; Master sync is separate' : matrix[listingChannel] === 'draft' ? 'Saved locally — not sent' : matrix[listingChannel] === 'inactive' ? 'Not currently live on the channel' : matrix[listingChannel] === 'unconfirmed' ? 'Channel publication has not been confirmed' : 'Ready to configure'}</p></td>
              <td className="px-4 py-3"><ChannelStockCell product={product} channel={listingChannel} status={matrix[listingChannel]} syncEnabled={inventorySyncKeys.includes(`${product.id}:${listingChannel}`)} onClick={() => setChannelStockTarget({ product, channel: listingChannel, status: matrix[listingChannel] })} /></td>
              <td className="px-4 py-3"><p className="text-sm font-semibold tabular-nums text-slate-900">{formatLocalizedMoney(locale, product.retail_price, product.price_currency)}</p><p className="mt-1 text-xs text-slate-500">Inherited from master</p></td>
              <td className="px-4 py-3 text-right"><Button onClick={() => navigate(`/products/${product.id}/edit?section=distribution`)}>{matrix[listingChannel] === 'missing' ? <Plus className="size-4" /> : <Pencil className="size-4" />}{matrix[listingChannel] === 'missing' ? `Create ${selectedListingChannel.label} listing` : `Manage ${selectedListingChannel.label} listing`}</Button></td>
            </>}
          </tr>;
        })}</tbody>
      </table></div></TooltipProvider>

      {!isLoading && filtered.length === 0 ? <div className="grid min-h-56 place-items-center border-t border-slate-100 p-6 text-center"><div><AlertCircle className="mx-auto size-6 text-slate-400" /><p className="mt-3 text-sm font-semibold text-foreground">{products.length === 0 ? "No Product Masters yet" : "No products match this view"}</p><p className="mt-1 text-xs text-slate-500">{products.length === 0 ? "Use your existing shop listings or create a new product. Nothing is published automatically." : "Try a different catalog view, search term, or filter."}</p><Button variant="outline" size="sm" className="mt-4" onClick={products.length === 0 ? () => setCreateOpen(true) : clearCatalogFilters}><CircleDot className="size-3.5" />{products.length === 0 ? "Create your first product" : "Clear filters"}</Button>{products.length === 0 && <Button variant="ghost" className="mt-4 ml-2" onClick={() => openIntake()}>Use shop listings</Button>}</div></div> : null}
    </section>}

    {workspaceMode === 'master' && introMode === 'catalog' && !intakeOpen && selectedIds.length > 0 ? <div className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-3xl flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-2xl md:left-[17rem]"><span className="mr-auto px-2 text-sm font-semibold text-slate-800">{selectedProducts.length} selected</span><Button size="sm" onClick={() => runBulkAction('Validate Selected')}><CheckCircle2 className="size-4" />Validate</Button><Button size="sm" variant="outline" onClick={() => runBulkAction('Assign Category')}><Tags className="size-4" />Assign Category</Button><Button size="sm" variant="outline" onClick={() => navigate('/products/channel-listings')}><Layers3 className="size-4" />Create Listings</Button><Button size="sm" variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => runBulkAction('Archive')}><Archive className="size-4" />Archive</Button></div> : null}

    <Dialog open={Boolean(publishTarget)} onOpenChange={(open) => !open && setPublishTarget(null)}><DialogContent className="w-[calc(100vw-2rem)] max-w-xl overflow-hidden"><DialogHeader><DialogTitle>Activate Product Master?</DialogTitle><DialogDescription>Review the Product Master and what will change before publishing.</DialogDescription></DialogHeader>{publishTarget ? <div className="min-w-0 max-w-full space-y-3"><div className="flex min-w-0 flex-wrap items-center gap-3 rounded-xl border bg-muted/20 p-4"><div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg border bg-background">{publishTarget.images[0] ? <img src={publishTarget.images[0]} alt="" className="size-full object-cover" /> : <PackageX className="size-5 text-muted-foreground" />}</div><div className="min-w-0 flex-1 basis-52"><p className="truncate text-sm font-semibold">{publishTarget.name}</p><p className="mt-1 truncate font-mono text-xs text-muted-foreground">{publishTarget.sku_code}</p></div><div className="flex shrink-0 items-center gap-2 text-xs font-semibold"><Badge variant="outline">Ready</Badge><span className="text-muted-foreground">→</span><Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Active</Badge></div></div><div className="grid min-w-0 grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border md:grid-cols-4"><div className="min-w-0 bg-background p-3"><p className="truncate text-[11px] text-muted-foreground">Variants</p><p className="mt-1 text-sm font-semibold tabular-nums">{publishTarget.skus.length || 1}</p></div><div className="min-w-0 bg-background p-3"><p className="truncate text-[11px] text-muted-foreground">Base price</p><p className="mt-1 truncate text-sm font-semibold tabular-nums">{formatLocalizedMoney(locale, publishTarget.retail_price, publishTarget.price_currency)}</p></div><div className="min-w-0 bg-background p-3"><p className="truncate text-[11px] text-muted-foreground">Master ATS</p><p className="mt-1 text-sm font-semibold tabular-nums">{getStockSummary(publishTarget).available}</p></div><div className="min-w-0 bg-background p-3"><p className="truncate text-[11px] text-muted-foreground">Linked listings</p><p className="mt-1 text-sm font-semibold tabular-nums">{publishTarget.channels.length}</p></div></div><div className="flex min-w-0 gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4"><Info className="mt-0.5 size-5 shrink-0 text-sky-700" /><div className="min-w-0"><p className="text-sm font-semibold text-slate-900">Only the Product Master becomes active</p><p className="mt-1 text-xs leading-5 text-slate-600">Linked listings will not be changed. No new channel listings will be created or published.</p></div></div></div> : null}<DialogFooter className="gap-2"><Button variant="ghost" onClick={() => setPublishTarget(null)}>Cancel</Button><Button variant="outline" onClick={() => { if (!publishTarget) return; const productId = publishTarget.id; setPublishTarget(null); navigate(`/products/${productId}/edit`); }}><Pencil className="size-4" />Review &amp; edit</Button><Button onClick={confirmPublishMaster}><Send className="size-4" />Activate Master</Button></DialogFooter></DialogContent></Dialog>
    <Sheet open={intakeOpen} onOpenChange={open => { if (open) setIntakeOpen(true); else if (intakeDirty) setDiscardIntake(true); else closeIntake(); }}>
      <SheetContent className="flex w-full flex-col p-0 sm:max-w-[min(1120px,94vw)] motion-reduce:animate-none motion-reduce:transition-none" onCloseAutoFocus={event => {
        event.preventDefault();
        if (intakeReturnRef.current?.isConnected && intakeReturnRef.current !== document.body) intakeReturnRef.current.focus();
        else catalogSearchRef.current?.focus();
      }}>
        <SheetHeader className="shrink-0 border-b px-6 py-5 pr-14 text-left"><div role="group" aria-label="Listing review header" className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2"><div className="min-w-0 flex-1 basis-72 space-y-2"><SheetTitle>{{ queue: 'Review shop listings', group: 'Review selected listings', choose: 'Find a Product Master', compare: 'Compare product details', create: 'Create one Master', complete: 'Complete Product Master' }[intakeStage]}</SheetTitle><SheetDescription>{intakeStage === 'queue' ? ((previewCatalog?.products() ?? products).length ? 'Review imported shop listings and connect each to the right Product Master.' : 'Create Product Masters using data already imported from your shops.') : intakeStage === 'group' ? 'Choose whether these listings are separate products or the same product across shops.' : intakeStage === 'choose' ? 'Choose one Master for the selected listings. Review each listing before confirming.' : intakeStage === 'compare' ? 'Same product? Confirm the link. Otherwise, choose another Master or create a new one.' : intakeStage === 'create' ? 'Review the proposed Master data. Edit only what needs to change.' : 'Complete required details here, then confirm to activate. Nothing is published to shops.'}</SheetDescription></div>{intakeStage === 'queue' && <div ref={setIntakeGuideActions} className="shrink-0" />}</div></SheetHeader>
        <div className={intakeStage === 'queue' ? 'min-h-0 flex-1 overflow-y-auto p-4 sm:p-6' : 'min-h-0 flex-1 overflow-hidden'}>{intakeOpen && <ProductListingIntake catalog={previewCatalog} stayInQueue guideActionContainer={intakeGuideActions} onDirtyChange={setIntakeDirty} onStageChange={setIntakeStage} onChanged={(ids, created) => { savedInIntake.current = created ? 'created' : 'linked'; if (!previewCatalog) setRecentMasterIds(ids); setStockRevision(value => value + 1); }} onOpenMaster={() => closeIntake()} />}</div>
        {intakeStage === 'queue' && <div className="flex items-center justify-between gap-3 border-t px-6 py-4"><p className="text-sm text-muted-foreground" role="status">{unfinishedListings.length ? `${pendingListings.length} unlinked · ${unfinishedListings.length} linked review${unfinishedListings.length === 1 ? '' : 's'} unfinished` : pendingListings.length ? `${pendingListings.length} listing${pendingListings.length === 1 ? '' : 's'} left to review` : 'All listings reviewed'}</p><Button onClick={closeIntake}>Done</Button></div>}
      </SheetContent>
    </Sheet>
    <AlertDialog open={discardIntake} onOpenChange={setDiscardIntake}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Discard unsaved details?</AlertDialogTitle><AlertDialogDescription>Closing this review discards your unsaved edits. Existing Master data and listing links stay unchanged.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep editing</AlertDialogCancel><AlertDialogAction onClick={closeIntake}>Discard &amp; close</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    {lifecycle.dialog}
    <Dialog open={importOpen} onOpenChange={(open) => { setImportOpen(open); if (!open) setManualImportFileName(''); }}><DialogContent className="max-w-xl"><DialogHeader><DialogTitle>Manual product import</DialogTitle><DialogDescription>Prototype preview: choose a file to explore the sample review queue. File contents are not parsed or uploaded in this demo.</DialogDescription></DialogHeader><div className="space-y-4"><label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-primary/40 bg-primary/5 p-5 text-center transition-colors hover:border-primary hover:bg-primary/10 focus-within:ring-2 focus-within:ring-ring"><input type="file" accept=".csv,.xlsx,.xls,.json" className="sr-only" onChange={(event) => setManualImportFileName(event.target.files?.[0]?.name ?? '')} /><span className="grid size-10 place-items-center rounded-lg bg-background text-primary shadow-sm">{manualImportFileName ? <FileSpreadsheet className="size-5" /> : <Upload className="size-5" />}</span><p className="mt-3 text-sm font-semibold">{manualImportFileName || 'Choose an import file'}</p><p className="mt-1 text-xs text-muted-foreground">{manualImportFileName ? 'File selected locally · sample review data only' : 'CSV, XLSX, XLS or JSON · one listing per row'}</p></label>{!manualImportFileName ? <Button type="button" variant="ghost" size="sm" className="w-full" onClick={() => setManualImportFileName('product-listings-demo.xlsx')}><FileSpreadsheet className="size-4" />Use demo import file</Button> : null}<div className="rounded-xl border p-4"><p className="text-sm font-semibold">How PrimeOS will process the file</p><div className="mt-3 grid gap-3 sm:grid-cols-3">{[['1', 'Validate data', 'Check required fields and row format.'], ['2', 'Find matches', 'Suggest matches for your review.'], ['3', 'Return results', 'Choose a Master or create a draft.']].map(([step, title, detail]) => <div key={step} className="flex gap-2 sm:block"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">{step}</span><div><p className="mt-0.5 text-xs font-semibold sm:mt-2">{title}</p><p className="mt-1 text-[11px] leading-4 text-muted-foreground">{detail}</p></div></div>)}</div></div>{manualImportFileName ? <div className="grid grid-cols-2 gap-3"><div className="rounded-xl border bg-muted/30 p-4"><p className="text-2xl font-bold tabular-nums">{getCatalogImportItems().filter(item => item.resolution !== 'ignore' && item.status !== 'ignored').length}</p><p className="mt-1 text-xs text-muted-foreground">Sample listings</p></div><div className="rounded-xl border bg-muted/30 p-4"><p className="text-2xl font-bold tabular-nums">{new Set(getCatalogImportItems().filter(item => item.resolution !== 'ignore' && item.status !== 'ignored').map(item => item.storeName)).size}</p><p className="mt-1 text-xs text-muted-foreground">Sample stores</p></div></div> : null}<div className="flex gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sky-900 dark:border-sky-400/30 dark:bg-sky-400/10 dark:text-sky-100"><Info className="mt-0.5 size-5 shrink-0" /><div><p className="text-sm font-semibold">Master data is protected</p><p className="mt-1 text-xs leading-5 opacity-80">Review suggestions before linking or creating a Master. Shop content, prices and stock stay unchanged.</p></div></div></div><DialogFooter><Button variant="outline" onClick={() => { setImportOpen(false); setManualImportFileName(''); }}>Cancel</Button><Button disabled={!manualImportFileName} onClick={processManualImport}><Upload className="size-4" />Review sample listings</Button></DialogFooter></DialogContent></Dialog>
    {connectOpen && <ConnectStoreWizardModal open onOpenChange={setConnectOpen} onConnected={(channel) => {
      const params = new URLSearchParams(location.search);
      params.delete('preview');
      params.set('shop', channel.id);
      params.set('getting-started', '1');
      setIntakeOpen(false);
      channelSetup.retry();
      navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
    }} />}
    <CreateProductDialog open={createOpen} onOpenChange={setCreateOpen} existingSkus={products.flatMap(product => [product.sku_code, ...product.skus.map(sku => sku.sku_code)])} existingProducts={products} onOpenExisting={openProductDraft} onConfirm={createProductDraft} />
    <ProductStockDrawer product={stockTarget} onClose={() => setStockTarget(null)} onAdjustStock={(product, warehouseId) => setStockAdjustment({ product, warehouse: getWarehouses().find(warehouse => warehouse.id === warehouseId) })} />
    {stockAdjustment?.product && <AdjustWarehouseStockDialog target={stockAdjustment} products={[stockAdjustment.product]} warehouses={getWarehouses()} lockProduct onClose={() => setStockAdjustment(null)} onSaved={() => {
      setStockTarget(getProducts().find(product => product.id === stockAdjustment.product?.id) ?? null);
      setStockAdjustment(null);
      setStockRevision(value => value + 1);
      toast({ title: 'Stock adjustment recorded', description: 'Stock totals and adjustment history have been updated.' });
    }} />}
    <ChannelStockDrawer target={channelStockTarget} syncEnabled={channelStockTarget ? inventorySyncKeys.includes(`${channelStockTarget.product.id}:${channelStockTarget.channel}`) : false} onEnable={(productId, channel) => setInventorySyncKeys((current) => Array.from(new Set([...current, `${productId}:${channel}`])))} onClose={() => setChannelStockTarget(null)} />
    <ChannelPublishingDrawer target={listingTarget} matrix={listingTarget ? rows.find(({ product }) => product.id === listingTarget.product.id)?.matrix : undefined} onClose={() => setListingTarget(null)} onPublish={(selectedChannels) => listingTarget && updateListingStatuses(listingTarget.product, selectedChannels, 'pending')} onUnpublish={(selectedChannels) => listingTarget && updateListingStatuses(listingTarget.product, selectedChannels, 'missing')} />
  </div>;
}

function ChannelStockDrawer({ target, syncEnabled, onEnable, onClose }: { target: { product: Product; channel: ChannelKey; status: ListingIndicator } | null; syncEnabled: boolean; onEnable: (productId: string, channel: ChannelKey) => void; onClose: () => void }) {
  if (!target) return null;
  return <ChannelStockDrawerContent target={target} syncEnabled={syncEnabled} onEnable={onEnable} onClose={onClose} />;
}

function ChannelStockDrawerContent({ target, syncEnabled, onEnable, onClose }: { target: { product: Product; channel: ChannelKey; status: ListingIndicator }; syncEnabled: boolean; onEnable: (productId: string, channel: ChannelKey) => void; onClose: () => void }) {
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

function ProductStockDrawer({ product, onClose, onAdjustStock }: { product: Product | null; onClose: () => void; onAdjustStock: (product: Product, warehouseId?: string) => void }) {
  if (!product) return null;
  const available = Object.values(product.inventory ?? {}).reduce((total, quantity) => total + Number(quantity || 0), 0);
  const status = available <= 0 ? 'out' : available < lowStockThreshold ? 'low' : 'healthy';
  return <Sheet open onOpenChange={(open) => !open && onClose()}><SheetContent className="flex w-full flex-col overflow-hidden p-0 sm:max-w-2xl"><SheetHeader className="border-b border-slate-200 p-5 pr-12"><SheetTitle>Product Stock</SheetTitle><SheetDescription>{product.name} · {product.sku_code}</SheetDescription></SheetHeader><div className="flex-1 space-y-5 overflow-y-auto p-5 pb-24">
    <section className={cn('rounded-xl border p-4', status === 'out' ? 'border-rose-200 bg-rose-50' : status === 'low' ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50')}><div className="flex items-start gap-3">{status === 'out' ? <PackageX className="mt-0.5 size-5 text-rose-700" /> : status === 'low' ? <AlertTriangle className="mt-0.5 size-5 text-amber-700" /> : <CheckCircle2 className="mt-0.5 size-5 text-emerald-700" />}<div><p className="text-2xl font-bold tabular-nums text-slate-950">{available.toLocaleString()} available</p><p className="mt-1 text-sm text-slate-600">{status === 'out' ? 'No sellable stock remains in Prime OS warehouses.' : status === 'low' ? 'Master Stock is low. Channel quantities remain independent unless inventory sync is enabled.' : 'Master Stock is available for Prime OS orders and allocation.'}</p></div></div></section>
    <section className="overflow-hidden rounded-xl border border-slate-200"><div className="border-b border-slate-200 px-4 py-3"><div className="flex items-center gap-2"><Warehouse className="size-4 text-indigo-600" /><h3 className="text-sm font-semibold text-slate-900">Stock by warehouse</h3></div><p className="mt-1 text-xs text-slate-500">Warehouse balances roll up automatically into Master Stock. Channel quantities remain independent unless inventory sync is configured.</p></div><div className="divide-y divide-slate-100">{Object.entries(warehouseNames).map(([warehouseId, warehouseName]) => <div key={warehouseId} className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center"><span><span className="block text-sm font-semibold text-slate-900">{warehouseName}</span><span className="mt-1 block text-xs text-slate-500">Prime OS warehouse position</span></span><div className="flex flex-wrap items-center justify-end gap-2 text-sm"><StockNumber value={stockAt(product, warehouseId)} /><ManageStockHoldsButton product={product} warehouseId={warehouseId} />{canEditWarehouseStock(warehouseId) ? <Button type="button" variant="outline" size="sm" onClick={() => onAdjustStock(product, warehouseId)} aria-label={`Adjust stock at ${warehouseName}`}>Adjust stock</Button> : <span className="text-xs text-muted-foreground">Read only</span>}</div></div>)}</div></section>
    {product.skus.length > 1 ? <section className="rounded-xl border border-slate-200 p-4"><h3 className="text-sm font-semibold text-slate-900">Variant coverage</h3><p className="mt-1 text-xs text-slate-500">{product.skus.length} variants share this warehouse allocation. Variant identity remains managed in Product Details.</p><div className="mt-3 flex flex-wrap gap-2">{product.skus.map((sku) => <span key={sku.id} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700">{sku.variation_name || sku.sku_code}</span>)}</div></section> : null}
  </div><div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 border-t border-slate-200 bg-white/95 p-4 backdrop-blur"><p className="hidden text-xs text-slate-500 sm:block">Each adjustment is saved with its reason in history.</p><div className="ml-auto flex gap-2"><Button variant="outline" onClick={onClose}>Close</Button><Button onClick={() => onAdjustStock(product)}><Warehouse className="size-4" />Adjust stock</Button></div></div></SheetContent></Sheet>;
}

function CatalogFilterDrawer({ open, syncFilter, variantFilter, onClose, onApply }: { open: boolean; syncFilter: 'all' | 'missing-shopee' | 'errors' | 'pending'; variantFilter: VariantFilter; onClose: () => void; onApply: (sync: 'all' | 'missing-shopee' | 'errors' | 'pending', variants: VariantFilter) => void }) {
  const [draftSync, setDraftSync] = useState(syncFilter);
  const [draftVariants, setDraftVariants] = useState<VariantFilter>(variantFilter);
  useEffect(() => { if (open) { setDraftSync(syncFilter); setDraftVariants(variantFilter); } }, [open, syncFilter, variantFilter]);
  return <Sheet open={open} onOpenChange={(value) => !value && onClose()}><SheetContent className="w-full sm:max-w-md"><SheetHeader><SheetTitle>Advanced Catalog Filters</SheetTitle><SheetDescription>Narrow the master catalog by publishing health and product structure.</SheetDescription></SheetHeader><div className="mt-6 grid gap-5"><label className="grid gap-2 text-sm font-semibold text-slate-700">Channel Sync Status<select value={draftSync} onChange={(event) => setDraftSync(event.target.value as typeof draftSync)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium"><option value="all">All sync statuses</option><option value="missing-shopee">Missing / error on Shopee</option><option value="errors">Any channel sync error</option><option value="pending">Pending publication</option></select></label><label className="grid gap-2 text-sm font-semibold text-slate-700">Product Structure<select value={draftVariants} onChange={(event) => setDraftVariants(event.target.value as VariantFilter)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium"><option value="all">All product structures</option><option value="with-variants">With variants</option><option value="single">Single products</option></select></label><div className="flex gap-2 border-t border-slate-200 pt-4"><Button variant="outline" className="flex-1" onClick={() => { setDraftSync('all'); setDraftVariants('all'); }}>Reset</Button><Button className="flex-1" onClick={() => onApply(draftSync, draftVariants)}>Apply Filters</Button></div></div></SheetContent></Sheet>;
}

function ChannelPublishingDrawer({ target, matrix, onClose, onPublish, onUnpublish }: { target: { product: Product; channel?: ChannelKey } | null; matrix?: Record<ChannelKey, ListingIndicator>; onClose: () => void; onPublish: (channels: ChannelKey[]) => void; onUnpublish: (channels: ChannelKey[]) => void }) {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<ChannelKey[]>([]);
  useEffect(() => {
    if (!target) return;
    setSelected(target.channel ? [target.channel] : channels.filter((channel) => matrix?.[channel.key] !== 'live').map((channel) => channel.key));
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

      {selectedChannel && singleStatus === 'live' ? <section className="space-y-3 rounded-xl border border-slate-200 p-4"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-slate-900">Published listing</p><p className="mt-1 text-xs text-slate-500">External ID: {selectedChannel.shortLabel}-{target.product.sku_code}</p></div><span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700"><span className="size-2 rounded-full bg-emerald-500" />Live on channel</span></div><Button className="w-full" onClick={() => navigate(`/products/${target.product.id}/channels/${selectedChannel.key}`)}><Pencil className="size-4" />Manage {selectedChannel.label} Listing</Button><div className="grid grid-cols-2 gap-2"><Button variant="outline" asChild><a href={`https://${selectedChannel.key}.example/listing/${target.product.sku_code}`} target="_blank" rel="noreferrer"><ExternalLink className="size-4" />View live</a></Button><Button variant="outline" onClick={() => onPublish([selectedChannel.key])}><Send className="size-4" />Sync Now</Button></div><Button variant="outline" className="w-full border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => onUnpublish([selectedChannel.key])}><Unplug className="size-4" />Unpublish from {selectedChannel.label}</Button><p className="text-xs leading-5 text-slate-500">The master product and listings on other channels will remain available.</p></section> : <>
        <section><div className="mb-3"><h3 className="text-sm font-semibold text-slate-900">Channel readiness</h3><p className="mt-1 text-xs text-slate-500">Select channels, resolve required fields, then publish eligible listings.</p></div><div className="space-y-2">{channels.filter((channel) => !selectedChannel || channel.key === selectedChannel.key).map((channel) => {
          const issue = issueFor(channel.key);
          const status = matrix[channel.key];
          return <label key={channel.key} className={cn('flex min-h-16 items-center gap-3 rounded-xl border p-3 transition-colors', selected.includes(channel.key) ? 'border-indigo-200 bg-indigo-50/40' : 'border-slate-200 hover:bg-slate-50')}><Checkbox checked={selected.includes(channel.key)} onCheckedChange={() => toggle(channel.key)} /><span className="grid size-9 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600">{channel.shortLabel}</span><span className="min-w-0 flex-1"><span className="flex items-center gap-2 text-sm font-semibold text-slate-900">{channel.label}<span className={cn('size-2 rounded-full', statusTone[status])} /></span><span className={cn('mt-1 block text-xs', issue ? 'text-rose-600' : 'text-emerald-700')}>{issue ?? 'Ready to publish from master data'}</span></span><span className="text-[10px] font-semibold uppercase text-slate-400">{status}</span></label>;
        })}</div></section>
        <section className="rounded-xl border border-slate-200 p-4"><h3 className="text-sm font-semibold text-slate-900">Channel content</h3><div className="mt-3 grid gap-3"><label className="grid gap-1.5 text-xs font-semibold text-slate-500">Listing title<Input defaultValue={target.product.name} className="h-10 text-sm" /></label><div className="grid grid-cols-2 gap-3"><label className="grid gap-1.5 text-xs font-semibold text-slate-500">Channel price<Input defaultValue={target.product.retail_price} type="number" className="h-10 text-sm tabular-nums" /></label><label className="grid gap-1.5 text-xs font-semibold text-slate-500">Category mapping<select className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium"><option>Use master category</option><option>Map manually</option></select></label></div><p className="text-xs text-slate-500">These values inherit from the master product unless overridden.</p></div></section>
      </>}
    </div>
    {!(selectedChannel && singleStatus === 'live') ? <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 border-t border-slate-200 bg-white/95 p-4 backdrop-blur"><div className="mr-auto text-xs text-slate-500"><span className="font-semibold text-slate-800">{readySelected.length}</span> ready · {selected.length - readySelected.length} blocked</div><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={readySelected.length === 0} onClick={() => onPublish(readySelected)}><Send className="size-4" />Publish {readySelected.length} Ready</Button></div> : null}
  </SheetContent></Sheet>;
}
