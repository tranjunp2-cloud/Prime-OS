import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, Check, CheckCircle2, ChevronDown, ChevronRight, CircleAlert, Link2, PackagePlus, Search, Store, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { WorkspacePageHeader } from '@/components/system/WorkspacePageHeader';
import { getCatalogImportItems, saveCatalogImportItems, type CatalogImportItem, type ImportMatchStatus, type ImportResolution } from '@/lib/catalog-import-store';
import { addProduct, getProducts, updateProduct, type ChannelListing, type Product } from '@/lib/product-store';
import { cn } from '@/lib/utils';
import { getActiveCatalogCategories, type CatalogCategory } from '@/lib/product-catalog-settings-store';

type ReviewTab = 'mapping' | 'unresolved' | 'excluded';
const tabs: Array<{ key: ReviewTab; label: string }> = [{ key: 'mapping', label: 'Mapping review' }, { key: 'unresolved', label: 'Unresolved' }, { key: 'excluded', label: 'Excluded' }];
const queuePriority: Record<ImportMatchStatus, number> = { suggested: 0, conflict: 1, unmatched: 2, matched: 3, ignored: 4 };
const tabCountTone: Record<ReviewTab, string> = { mapping: 'bg-indigo-500 text-white', unresolved: 'bg-amber-500 text-white', excluded: 'bg-slate-400 text-white' };
const statusCopy: Record<ImportMatchStatus, { label: string; className: string }> = {
  matched: { label: 'Exact match', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  suggested: { label: 'Review suggested match', className: 'border-amber-200 bg-amber-50 text-amber-700' },
  unmatched: { label: 'No Product Master', className: 'border-slate-200 bg-slate-50 text-slate-700' },
  conflict: { label: 'Conflict', className: 'border-rose-200 bg-rose-50 text-rose-700' },
  ignored: { label: 'Ignored', className: 'border-slate-200 bg-slate-50 text-slate-500' },
};
const channelMap: Record<CatalogImportItem['channel'], ChannelListing['channel']> = { shopee: 'shopee', amazon: 'amazon', lazada: 'lazada' };
const safeSuggestionThreshold = 85;

function syncCatalogListingToProduct(item: CatalogImportItem, productId: string) {
  const product = getProducts().find(candidate => candidate.id === productId);
  if (!product) return false;
  const syncedAt = new Date().toISOString();
  const listing: ChannelListing = { channel: channelMap[item.channel], external_id: item.listingId, status: 'active', listing_url: null, last_synced_at: syncedAt };
  const existingOverride = product.channel_overrides?.[item.channel];
  updateProduct(product.id, {
    id: product.id,
    name: product.name || item.title,
    category: product.category || item.channelCategory.split('>').at(-1)?.trim() || '',
    retail_price: product.retail_price || item.price,
    price_currency: product.price_currency || item.currency,
    images: product.images.length || !item.image ? product.images : [item.image],
    channels: [...product.channels.filter(current => current.channel !== listing.channel), listing],
    channel_overrides: {
      ...product.channel_overrides,
      [item.channel]: {
        enabled: true,
        title: existingOverride?.title || item.title,
        description: existingOverride?.description || '',
        price_markup: existingOverride?.price_markup ?? 0,
        listing_sku: existingOverride?.listing_sku || item.channelSku,
        category: existingOverride?.category || item.channelCategory,
        stock_quantity: existingOverride?.stock_quantity || String(item.channelStock),
        variant_scope: existingOverride?.variant_scope || 'all',
        listing_mode: existingOverride?.listing_mode || 'master',
        sync_policy: existingOverride?.sync_policy || 'automatic',
        safety_buffer: existingOverride?.safety_buffer || '0',
        allocation_cap: existingOverride?.allocation_cap || String(item.channelStock),
        media_scope: existingOverride?.media_scope || 'all',
      },
    },
  });
  return true;
}

export default function CatalogImportReview() {
  const navigate = useNavigate();
  const [items, setItems] = useState(getCatalogImportItems);
  const [tab, setTab] = useState<ReviewTab>('mapping');
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeItem, setActiveItem] = useState<CatalogImportItem | null>(null);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [bulkProductId, setBulkProductId] = useState('');
  const [pendingBulkAction, setPendingBulkAction] = useState<'create' | 'ignore' | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [activeGroup, setActiveGroup] = useState<ProposedGroup | null>(null);
  const products = getProducts();
  const mappingItems = useMemo(() => items.filter(item => item.resolution === 'create' || ((item.status === 'matched' || item.status === 'suggested') && item.resolution !== 'ignore')), [items]);
  const unresolvedItems = useMemo(() => items.filter(item => (item.status === 'conflict' || item.status === 'unmatched') && item.resolution !== 'ignore' && item.resolution !== 'create'), [items]);
  const excludedItems = useMemo(() => items.filter(item => item.resolution === 'ignore' || item.status === 'ignored'), [items]);
  const counts = useMemo(() => ({ mapping: mappingItems.length, unresolved: unresolvedItems.length, excluded: excludedItems.length }), [excludedItems.length, mappingItems.length, unresolvedItems.length]);
  const visible = useMemo(() => items
    .filter(item => ((tab === 'mapping' ? item.resolution === 'create' || ((item.status === 'matched' || item.status === 'suggested') && item.resolution !== 'ignore') : tab === 'unresolved' ? (item.status === 'conflict' || item.status === 'unmatched') && item.resolution !== 'ignore' && item.resolution !== 'create' : item.resolution === 'ignore' || item.status === 'ignored')) && `${item.title} ${item.channelSku} ${item.listingId}`.toLowerCase().includes(deferredQuery.trim().toLowerCase()))
    .sort((a, b) => {
      const aResolved = a.resolution === 'later' ? 0 : 1;
      const bResolved = b.resolution === 'later' ? 0 : 1;
      return aResolved - bResolved || queuePriority[a.status] - queuePriority[b.status] || a.confidence - b.confidence;
    }), [deferredQuery, items, tab]);
  const updateItems = (next: CatalogImportItem[]) => { setItems(next); saveCatalogImportItems(next); };
  useEffect(() => {
    const autoSynced = items.filter(item => item.resolution === 'link' && item.confirmed && item.resolvedProductId);
    autoSynced.forEach(item => syncCatalogListingToProduct(item, item.resolvedProductId!));
    if (autoSynced.length) setItems(current => [...current]);
    // Hydrate normalized auto-sync mappings once when entering the review workspace.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const resolveItem = (id: string, resolution: ImportResolution, productId?: string) => {
    const source = items.find(item => item.id === id);
    if (resolution === 'link' && productId && source) syncCatalogListingToProduct(source, productId);
    const next = items.map(item => item.id === id ? { ...item, resolution, resolvedProductId: productId, confirmed: resolution === 'link', status: resolution === 'ignore' ? 'ignored' as const : item.status === 'ignored' ? 'unmatched' as const : item.status } : item);
    updateItems(next); setActiveItem(current => current?.id === id ? next.find(item => item.id === id) ?? null : current);
  };
  const bulkResolve = (resolution: ImportResolution) => {
    let updated = 0;
    if (resolution === 'link') items
      .filter(item => selectedIds.includes(item.id) && item.suggestedProductId)
      .forEach(item => syncCatalogListingToProduct(item, item.suggestedProductId!));
    updateItems(items.map(item => {
      if (!selectedIds.includes(item.id) || (resolution === 'link' && !item.suggestedProductId)) return item;
      updated += 1;
      return { ...item, resolution, resolvedProductId: resolution === 'link' ? item.suggestedProductId : undefined, confirmed: resolution === 'link', status: resolution === 'ignore' ? 'ignored' : item.status };
    }));
    toast.success(`${updated} listings updated${updated < selectedIds.length ? ` · ${selectedIds.length - updated} had no suggested match` : ''}`); setSelectedIds([]);
  };
  const selectedItems = items.filter(item => selectedIds.includes(item.id));
  const acceptableMatches = selectedItems.filter(item => Boolean(item.suggestedProductId)).length;
  const syncedMappings = mappingItems.filter(item => item.resolution === 'link').length;
  const reviewMappings = mappingItems.length - syncedMappings;
  const proposedGroups = useMemo(() => {
    const groups = new Map<string, ProposedGroup>();
    visible.forEach(item => {
      const productId = item.resolvedProductId || item.suggestedProductId;
      const id = productId ? `master:${productId}` : `draft:${item.id}`;
      const current = groups.get(id) || { id, product: products.find(product => product.id === productId), items: [], decision: item.resolution };
      current.items.push(item); groups.set(id, current);
    });
    return Array.from(groups.values()).sort((a, b) => Number(a.items.every(item => item.confirmed)) - Number(b.items.every(item => item.confirmed)) || Math.min(...b.items.map(item => item.confidence)) - Math.min(...a.items.map(item => item.confidence)));
  }, [products, visible]);
  const setActiveGroupId = (id: string | null) => setActiveGroup(id ? proposedGroups.find(group => group.id === id) || null : null);
  function acceptSuggestedGroup(productId: string) {
    const group = items.filter(item => item.status === 'suggested' && item.resolution === 'later' && item.suggestedProductId === productId);
    group.forEach(item => syncCatalogListingToProduct(item, productId));
    updateItems(items.map(item => group.some(candidate => candidate.id === item.id) ? { ...item, resolution: 'link', resolvedProductId: productId, confirmed: true } : item));
    toast.success(`${group.length} listings synced to the same Product Master`);
    setActiveItem(null);
  }

  function assignSelectedToMaster() {
    if (!bulkProductId) return;
    items.filter(item => selectedIds.includes(item.id)).forEach(item => syncCatalogListingToProduct(item, bulkProductId));
    updateItems(items.map(item => selectedIds.includes(item.id) ? { ...item, resolution: 'link', resolvedProductId: bulkProductId, confirmed: true } : item));
    toast.success(`${selectedIds.length} listings assigned to one Product Master`);
    setSelectedIds([]); setBulkAssignOpen(false); setBulkProductId('');
  }

  function assignGroupToMaster(groupItems: CatalogImportItem[], productId: string, canonicalCategory?: string) {
    const ids = new Set(groupItems.map(item => item.id));
    const product = getProducts().find(candidate => candidate.id === productId);
    if (product && canonicalCategory && product.category !== canonicalCategory) updateProduct(productId, { id: productId, category: canonicalCategory });
    groupItems.forEach(item => syncCatalogListingToProduct(item, productId));
    updateItems(items.map(item => ids.has(item.id) ? { ...item, resolution: 'link', resolvedProductId: productId, confirmed: true } : item));
    toast.success(`${groupItems.length} listings synced to Product Master`);
    setActiveGroup(null);
  }

  function reviewGroupItemSeparately(item: CatalogImportItem) {
    updateItems(items.map(current => current.id === item.id ? { ...current, status: 'unmatched' as const, resolution: 'later' as const, suggestedProductId: undefined, resolvedProductId: undefined } : current));
    setActiveGroup(null);
    setActiveItem({ ...item, status: 'unmatched', resolution: 'later', suggestedProductId: undefined, resolvedProductId: undefined });
  }

  function createProductMasterDraft(item: CatalogImportItem) {
    const id = `prod_import_${item.id}`;
    if (!getProducts().some(product => product.id === id)) {
      const now = new Date().toISOString();
      addProduct({ id, name: item.title, sku_code: item.channelSku, product_type: item.variants > 1 ? 'variant' : 'single', gtin: '', mpn: '', model_number: '', brand: '', asin: item.channel === 'amazon' ? item.listingId : '', manufacturer: '', category: '', condition: 'new', description: '', original_price: 0, retail_price: item.price, price_currency: item.currency, prod_length: 0, prod_height: 0, prod_width: 0, prod_weight: 0, pkg_length: 0, pkg_height: 0, pkg_width: 0, pkg_weight: 0, country_of_origin: '', hs_code: '', images: item.image ? [item.image] : [], inventory: {}, has_variants: item.variants > 1, channels: [], status: 'draft', created_at: now, updated_at: now, skus: [] });
    }
    resolveItem(item.id, 'create', id);
    toast.success('Product Master draft created successfully', { description: `${item.title} · ${item.channelSku}`, action: { label: 'View draft', onClick: () => navigate(`/products/${id}/edit`) } });
    return id;
  }

  function createSelectedDrafts() {
    const selected = items.filter(item => selectedIds.includes(item.id));
    const now = new Date().toISOString();
    selected.forEach(item => {
      const id = `prod_import_${item.id}`;
      if (getProducts().some(product => product.id === id)) return;
      addProduct({ id, name: item.title, sku_code: item.channelSku, product_type: item.variants > 1 ? 'variant' : 'single', gtin: '', mpn: '', model_number: '', brand: '', asin: item.channel === 'amazon' ? item.listingId : '', manufacturer: '', category: '', condition: 'new', description: '', original_price: 0, retail_price: item.price, price_currency: item.currency, prod_length: 0, prod_height: 0, prod_width: 0, prod_weight: 0, pkg_length: 0, pkg_height: 0, pkg_width: 0, pkg_weight: 0, country_of_origin: '', hs_code: '', images: item.image ? [item.image] : [], inventory: {}, has_variants: item.variants > 1, channels: [], status: 'draft', created_at: now, updated_at: now, skus: [] });
    });
    updateItems(items.map(item => selectedIds.includes(item.id) ? { ...item, resolution: 'create', resolvedProductId: `prod_import_${item.id}`, confirmed: true } : item));
    toast.success(`${selected.length} Product Master drafts created`);
    setSelectedIds([]);
  }

  function completeDraftAndLink(item: CatalogImportItem, draftId: string, name: string, sku: string) {
    const draft = getProducts().find(product => product.id === draftId);
    if (draft) {
      updateProduct(draftId, { id: draftId, name, sku_code: sku });
      syncCatalogListingToProduct(item, draftId);
    }
    const next = items.map(current => current.id === item.id ? { ...current, status: 'matched' as const, confidence: 100, resolution: 'link' as const, suggestedProductId: draftId, resolvedProductId: draftId, confirmed: true } : current);
    updateItems(next);
    setActiveItem(null);
    toast.success('Draft saved and listing linked');
    setTab('mapping');
  }

  return <div className="min-h-full bg-background p-4 md:p-6"><div className="mx-auto max-w-[1600px] space-y-5">
    <WorkspacePageHeader title="Catalog Import Review" description="Safe mappings sync automatically. Review only low-confidence or unresolved listings." icon={Link2} actions={<div className="flex flex-wrap items-center justify-end gap-3"><span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600"><CheckCircle2 className="size-4" />Auto-sync on · synced just now</span><Button variant="outline" onClick={() => navigate('/sales-channels/connected-channels')}><ArrowLeft className="size-4" />Connected Channels</Button></div>} />
    <section className="grid gap-3 sm:grid-cols-3" aria-label="Import summary"><Summary label="Imported listings" value={items.length} detail="Across 3 connected stores" /><Summary label="Mappings found" value={mappingItems.length} detail="Grouped by existing Product Master" tone="emerald" /><Summary label="Unresolved" value={unresolvedItems.length} detail={unresolvedItems.length ? 'Conflicts or no Master candidate' : 'No unresolved listings'} tone="amber" /></section>
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 xl:flex-row xl:items-center"><div className="scrollbar-none flex gap-1 overflow-x-auto">{tabs.map(item => <button key={item.key} type="button" onClick={() => { setTab(item.key); setSelectedIds([]); }} className={cn('flex min-h-10 shrink-0 items-center rounded-lg px-3 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary', tab === item.key && 'bg-primary/10 text-primary')} aria-pressed={tab === item.key}>{item.label}<span className={cn('ml-1.5 inline-flex min-w-5 justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums', tabCountTone[item.key])}>{counts[item.key]}</span></button>)}</div><div className="relative xl:ml-auto xl:w-80"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search listing, SKU or ID..." className="pl-9" /></div></div>
      {tab === 'mapping' ? <div className="space-y-3 p-4"><p className="px-1 text-xs leading-5 text-slate-500"><span className="font-semibold text-slate-700">{mappingItems.length} mappings found</span><span aria-hidden="true"> · </span>{syncedMappings} synced automatically<span aria-hidden="true"> · </span>{reviewMappings} require review.</p>{proposedGroups.map(group => { const confidenceValues = group.items.map(item => item.confidence).filter(Boolean); const confidence = confidenceValues.length ? Math.min(...confidenceValues) : 0; const expanded = expandedGroups.includes(group.id); const synced = group.items.every(item => item.resolution === 'link'); const requiresReview = !synced; return <section key={group.id} className="overflow-hidden rounded-xl border border-slate-200"><div className="flex flex-col gap-4 p-4 xl:flex-row xl:items-center"><button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => setExpandedGroups(current => current.includes(group.id) ? current.filter(id => id !== group.id) : [...current, group.id])}><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-indigo-50 text-indigo-600">{group.decision === 'create' ? <PackagePlus className="size-4" /> : <Link2 className="size-4" />}</span><div className="min-w-0"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{group.decision === 'create' ? 'New Product Master draft' : 'Existing Product Master'}</p><p className="truncate text-sm font-semibold text-slate-900">{group.product?.name || group.items[0].title}</p><p className="mt-1 text-xs text-slate-500">{group.product?.sku_code || group.items[0].channelSku} · {group.items.length} listing{group.items.length === 1 ? '' : 's'} · {new Set(group.items.map(item => item.channel)).size} channel{new Set(group.items.map(item => item.channel)).size === 1 ? '' : 's'}</p></div><ChevronDown className={cn('ml-auto size-4 shrink-0 text-slate-400 transition-transform', expanded && 'rotate-180')} /></button><div className="grid w-full shrink-0 grid-cols-1 items-center gap-2 sm:grid-cols-3 xl:ml-auto xl:w-auto xl:grid-cols-[168px_144px_124px]"><MappingSignal confidence={confidence} decision={group.decision} /><MappingWorkflowStatus synced={synced} decision={group.decision} /><Button size="sm" variant="outline" className="h-9 w-full" onClick={() => setActiveGroupId(group.id)}>{requiresReview ? "Review group" : "Review details"}</Button></div></div>{expanded ? <div className="divide-y border-t bg-slate-50/50">{group.items.map(item => <div key={item.id} className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_160px_130px_auto] sm:items-center"><div><p className="text-sm font-medium text-slate-900">{item.title}</p><p className="mt-1 text-xs capitalize text-slate-500">{item.channel} · {item.storeName}</p></div><span className="font-mono text-xs text-slate-600">{item.channelSku}</span><span className="text-xs font-semibold text-slate-600">{item.confidence ? `${item.confidence}% mapping` : 'Draft prepared'}</span><Button size="sm" variant="ghost" onClick={() => setActiveItem(item)}>Review<ChevronRight className="size-4" /></Button></div>)}</div> : null}</section>; })}{!proposedGroups.length ? <EmptyState copy="No mappings match your search." /> : null}</div> : <div className="overflow-x-auto"><table className="w-full min-w-[1040px] text-left"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="w-12 px-4 py-3"><Checkbox checked={visible.length > 0 && visible.every(item => selectedIds.includes(item.id))} onCheckedChange={checked => setSelectedIds(checked === true ? visible.map(item => item.id) : [])} aria-label="Select all visible listings" /></th><th className="px-3 py-3">Channel listing</th><th className="px-4 py-3">Existing Master suggested</th><th className="px-4 py-3">Mapping confidence</th><th className="px-4 py-3">Issue</th><th className="px-4 py-3">Decision</th><th className="px-4 py-3" /></tr></thead><tbody className="divide-y divide-slate-100">{visible.map(item => { const product = products.find(candidate => candidate.id === (item.resolvedProductId || item.suggestedProductId)); return <tr key={item.id} className={cn('hover:bg-slate-50/70', selectedIds.includes(item.id) && 'bg-indigo-50/40')}><td className="px-4 py-3"><Checkbox checked={selectedIds.includes(item.id)} onCheckedChange={checked => setSelectedIds(current => checked === true ? Array.from(new Set([...current, item.id])) : current.filter(id => id !== item.id))} aria-label={`Select ${item.title}`} /></td><td className="px-3 py-3"><div className="flex items-center gap-3"><span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg border bg-slate-50">{item.image ? <img src={item.image} alt="" className="size-full object-cover" /> : <Store className="size-4 text-slate-400" />}</span><div className="min-w-0"><p className="max-w-xs truncate text-sm font-semibold text-slate-900">{item.title}</p><p className="mt-1 text-xs capitalize text-slate-500">{item.channel} · {item.channelSku} · {item.variants} variant{item.variants === 1 ? '' : 's'}</p></div></div></td><td className="px-4 py-3">{product ? <div><p className="max-w-[230px] truncate text-sm font-semibold text-slate-900">{product.name}</p><p className="mt-1 font-mono text-xs text-slate-500">{product.sku_code}</p></div> : <span className="text-sm text-slate-400">Not assigned</span>}</td><td className="px-4 py-3"><p className="text-sm font-semibold tabular-nums">{item.confidence ? `${item.confidence}%` : '—'}</p><p className="mt-1 text-xs text-slate-500">{item.confidence >= safeSuggestionThreshold ? 'High confidence' : item.confidence ? 'Manual review' : 'No candidate'}</p></td><td className="px-4 py-3"><Badge variant="outline" className={statusCopy[item.status].className}>{item.status === 'conflict' ? <AlertTriangle className="mr-1 size-3" /> : null}{statusCopy[item.status].label}</Badge></td><td className="px-4 py-3"><DecisionBadge resolution={item.resolution} /></td><td className="px-4 py-3"><Button size="sm" variant="ghost" onClick={() => setActiveItem(item)}>{tab === 'excluded' ? 'View' : 'Resolve'}<ChevronRight className="size-4" /></Button></td></tr>; })}</tbody></table>{!visible.length ? <EmptyState copy={tab === 'excluded' ? 'No listings have been excluded.' : 'No exceptions need review.'} /> : null}</div>}
    </section>
  </div>
  {selectedIds.length ? <div className="fixed inset-x-4 bottom-5 z-40 mx-auto flex max-w-5xl flex-wrap items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 p-3 text-white shadow-2xl"><div className="mr-auto px-2"><p className="text-sm font-semibold">{selectedIds.length} listings selected</p><p className="text-[11px] text-slate-400">Choose one decision for the selected listings</p></div><Button size="sm" variant="ghost" disabled={!acceptableMatches} title={acceptableMatches ? 'Accept each system-suggested Product Master' : 'No selected listing has a suggested match'} className="text-white hover:bg-slate-800 hover:text-white disabled:text-slate-500" onClick={() => bulkResolve('link')}><Link2 className="size-4" />Accept suggestions ({acceptableMatches})</Button><Button size="sm" variant="ghost" title="Choose one Product Master for the selected listings" className="text-white hover:bg-slate-800 hover:text-white" onClick={() => setBulkAssignOpen(true)}><Search className="size-4" />Assign master</Button><Button size="sm" variant="ghost" title="Prepare a separate Product Master draft for each listing" className="text-white hover:bg-slate-800 hover:text-white" onClick={() => setPendingBulkAction('create')}><PackagePlus className="size-4" />Create drafts</Button><Button size="sm" variant="ghost" title="Remove selected listings from the active review queue" className="text-white hover:bg-slate-800 hover:text-white" onClick={() => setPendingBulkAction('ignore')}>Ignore</Button><Button size="icon" variant="ghost" className="text-white" title="Clear selection without changing listings" onClick={() => setSelectedIds([])} aria-label="Clear selection"><X className="size-4" /></Button></div> : null}
  <ReviewSheet key={activeItem?.id ?? 'closed'} item={activeItem} products={products} relatedSuggestionCount={activeItem?.suggestedProductId ? items.filter(item => item.status === 'suggested' && item.resolution === 'later' && item.suggestedProductId === activeItem.suggestedProductId).length : 0} onClose={() => setActiveItem(null)} onResolve={resolveItem} onResolveSuggestedGroup={acceptSuggestedGroup} onCreateDraft={createProductMasterDraft} onCompleteDraft={completeDraftAndLink} onOpenDraft={id => navigate(`/products/${id}/edit`)} />
  <GroupReviewSheet group={activeGroup || undefined} products={products} categories={getActiveCatalogCategories()} onClose={() => setActiveGroup(null)} onAssign={assignGroupToMaster} onReviewSeparately={reviewGroupItemSeparately} />
  <Dialog open={bulkAssignOpen} onOpenChange={setBulkAssignOpen}><DialogContent><DialogHeader><DialogTitle>Assign {selectedIds.length} listings</DialogTitle><DialogDescription>Link every selected channel listing to the same Product Master. Use this only when the listings represent the same product.</DialogDescription></DialogHeader><div className="space-y-2"><label className="text-sm font-semibold">Product Master</label><Select value={bulkProductId} onValueChange={setBulkProductId}><SelectTrigger><SelectValue placeholder="Search or select Product Master" /></SelectTrigger><SelectContent>{products.map(product => <SelectItem key={product.id} value={product.id}>{product.name} · {product.sku_code}</SelectItem>)}</SelectContent></Select><p className="text-xs text-muted-foreground">Channel content remains channel-owned; this action only creates the relationship.</p></div><DialogFooter><Button variant="outline" onClick={() => setBulkAssignOpen(false)}>Cancel</Button><Button disabled={!bulkProductId} onClick={assignSelectedToMaster}>Assign Product Master</Button></DialogFooter></DialogContent></Dialog>
  <Dialog open={Boolean(pendingBulkAction)} onOpenChange={open => !open && setPendingBulkAction(null)}><DialogContent><DialogHeader><DialogTitle>{pendingBulkAction === 'create' ? `Create ${selectedIds.length} Product Master drafts?` : `Ignore ${selectedIds.length} listings?`}</DialogTitle><DialogDescription>{pendingBulkAction === 'create' ? 'Prime OS will create one separate Product Master draft for each selected listing immediately.' : 'Ignored listings move out of the active review queue. You can find and restore them from the Ignored tab.'}</DialogDescription></DialogHeader>{pendingBulkAction === 'create' ? <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><AlertTriangle className="mt-0.5 size-4 shrink-0" /><p>Listings that already match an existing Product Master may create duplicates. Review the selection before continuing.</p></div> : null}<DialogFooter><Button variant="outline" onClick={() => setPendingBulkAction(null)}>Cancel</Button><Button variant={pendingBulkAction === 'ignore' ? 'destructive' : 'default'} onClick={() => { if (pendingBulkAction === 'create') createSelectedDrafts(); else if (pendingBulkAction === 'ignore') bulkResolve('ignore'); setPendingBulkAction(null); }}>{pendingBulkAction === 'create' ? 'Create drafts' : 'Ignore listings'}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}

type ProposedGroup = { id: string; product?: Product; items: CatalogImportItem[]; decision: ImportResolution };

function suggestCanonicalCategory(items: CatalogImportItem[], categories: CatalogCategory[]) {
  const channelText = items.map(item => item.channelCategory.toLowerCase()).join(' ');
  const scored = categories.filter(category => category.status === 'Active').map(category => {
    const words = category.name.toLowerCase().split(/[^a-z0-9]+/).filter(word => word.length > 2);
    return { category, score: words.reduce((score, word) => score + (channelText.includes(word) ? 1 : 0), 0) };
  }).sort((a, b) => b.score - a.score || b.category.name.length - a.category.name.length);
  return scored[0]?.score ? scored[0].category.name : '';
}

function GroupReviewSheet({ group, products, categories, onClose, onAssign, onReviewSeparately }: { group?: ProposedGroup; products: Product[]; categories: CatalogCategory[]; onClose: () => void; onAssign: (items: CatalogImportItem[], productId: string, canonicalCategory?: string) => void; onReviewSeparately: (item: CatalogImportItem) => void }) {
  const [showPicker, setShowPicker] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const suggestedCategory = useMemo(() => suggestCanonicalCategory(group?.items ?? [], categories), [categories, group?.items]);
  const [selectedCategory, setSelectedCategory] = useState('');
  useEffect(() => { setSelectedCategory(group?.product?.category || suggestedCategory); }, [group?.id, group?.product?.category, suggestedCategory]);
  const confidenceValues = group?.items.map(item => item.confidence).filter(Boolean) || [];
  const groupConfidence = confidenceValues.length ? Math.min(...confidenceValues) : 0;
  const channelCount = new Set(group?.items.map(item => item.channel)).size;
  const synced = group?.items.every(item => item.resolution === 'link') ?? false;
  return <Sheet open={Boolean(group)} onOpenChange={open => !open && onClose()}><SheetContent className="flex w-full flex-col overflow-y-auto sm:max-w-4xl">{group ? <><SheetHeader><div className="flex items-center gap-2 pr-8"><SheetTitle>{synced ? 'Mapping details' : 'Review proposed mapping group'}</SheetTitle>{synced ? <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700"><CheckCircle2 className="size-4" />Synced</span> : <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700"><CircleAlert className="size-4" />Review required</span>}</div><SheetDescription>{synced ? `${group.items.length} listings are connected to this Product Master.` : `${group.items.length} listings from ${channelCount} channel${channelCount === 1 ? '' : 's'} need your approval before syncing.`}</SheetDescription></SheetHeader>
    <div className="mt-6 space-y-5"><section className="grid gap-4 rounded-xl border bg-slate-50/60 p-4 sm:grid-cols-[1fr_auto_auto]"><div><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{group.decision === 'create' ? 'New Product Master draft' : 'Existing Product Master'}</p><p className="mt-1 text-base font-semibold text-slate-900">{group.product?.name || group.items[0].title}</p><p className="mt-1 font-mono text-xs text-slate-500">{group.product?.sku_code || group.items[0].channelSku}</p></div><div><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Channels</p><p className="mt-1 text-sm font-semibold capitalize">{Array.from(new Set(group.items.map(item => item.channel))).join(', ')}</p></div><div><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Group confidence</p><p className={cn('mt-1 text-lg font-bold', groupConfidence >= safeSuggestionThreshold ? 'text-emerald-700' : 'text-amber-700')}>{groupConfidence ? `${groupConfidence}%` : 'Prepared'}</p><p className="text-[11px] text-slate-500">Uses the lowest listing score</p></div></section>
    <section className="space-y-4 rounded-xl border border-indigo-200 bg-indigo-50/40 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-sm font-semibold text-slate-900">PrimeOS canonical category</h3><p className="mt-1 text-xs leading-5 text-slate-500">This single category controls Product Master attributes. Channel categories remain attached to their listings.</p></div><Badge variant="outline" className="border-indigo-200 bg-white text-indigo-700">{suggestedCategory ? '86% category confidence' : 'Manual selection'}</Badge></div>{group.product?.category && suggestedCategory && group.product.category !== suggestedCategory ? <div className="grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => setSelectedCategory(group.product?.category ?? '')} className={cn('rounded-lg border bg-white p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary', selectedCategory === group.product.category && 'border-primary ring-1 ring-primary')}><span className="block text-xs text-slate-500">Keep current master category</span><strong className="mt-1 block text-sm">{group.product.category}</strong></button><button type="button" onClick={() => setSelectedCategory(suggestedCategory)} className={cn('rounded-lg border bg-white p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary', selectedCategory === suggestedCategory && 'border-primary ring-1 ring-primary')}><span className="block text-xs text-slate-500">Use suggested category</span><strong className="mt-1 block text-sm">{suggestedCategory}</strong></button></div> : null}<Select value={selectedCategory} onValueChange={setSelectedCategory}><SelectTrigger aria-label="PrimeOS canonical category"><SelectValue placeholder="Select a PrimeOS category" /></SelectTrigger><SelectContent>{Array.from(new Set([group.product?.category, ...categories.filter(category => category.status === 'Active').map(category => category.name)].filter(Boolean) as string[])).sort().map(category => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent></Select><div className="flex flex-wrap gap-2 text-[11px] text-slate-500">{Array.from(new Set(group.items.map(item => item.channelCategory))).map(category => <span key={category} className="rounded-full border bg-white px-2.5 py-1">{category}</span>)}<ChevronRight className="size-4" /><span className="rounded-full bg-indigo-100 px-2.5 py-1 font-semibold text-indigo-700">{selectedCategory || 'Select canonical category'}</span></div></section>
    <section className="overflow-hidden rounded-xl border"><div className="border-b px-4 py-3"><h3 className="text-sm font-semibold">Channel comparison</h3><p className="mt-1 text-xs text-slate-500">Review only the relationship and differences. Channel-owned content remains editable after import.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Channel listing</th><th className="px-4 py-3">Channel SKU</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Variants</th><th className="px-4 py-3">Confidence</th><th className="px-4 py-3" /></tr></thead><tbody className="divide-y">{group.items.map(item => { const needsAttention = item.confidence > 0 && item.confidence < safeSuggestionThreshold; return <tr key={item.id}><td className="px-4 py-3"><p className="max-w-[260px] truncate text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs capitalize text-slate-500">{item.channel} · {item.storeName}</p></td><td className="px-4 py-3 font-mono text-xs">{item.channelSku}</td><td className="px-4 py-3"><p className="max-w-[180px] truncate text-xs" title={item.channelCategory}>{item.channelCategory}</p>{selectedCategory && item.channelCategory !== selectedCategory ? <span className="mt-1 inline-block text-[11px] font-semibold text-amber-700">Mapped to canonical</span> : null}</td><td className="px-4 py-3 text-sm tabular-nums">{item.variants}</td><td className="px-4 py-3"><strong className={needsAttention ? 'text-amber-700' : 'text-emerald-700'}>{item.confidence ? `${item.confidence}%` : '—'}</strong><p className="mt-1 text-[11px] text-slate-500">{needsAttention ? 'Review' : 'Ready'}</p></td><td className="px-4 py-3"><Button size="sm" variant="ghost" onClick={() => onReviewSeparately(item)}>Review separately</Button></td></tr>; })}</tbody></table></div></section>
    {showPicker ? <section className="space-y-3 rounded-xl border border-indigo-200 bg-indigo-50/50 p-4"><div><h3 className="text-sm font-semibold">Choose another Product Master</h3><p className="mt-1 text-xs text-slate-500">The new target will apply to every listing remaining in this group.</p></div><Select value={selectedProductId} onValueChange={setSelectedProductId}><SelectTrigger><SelectValue placeholder="Search or select Product Master" /></SelectTrigger><SelectContent>{products.map(product => <SelectItem key={product.id} value={product.id}>{product.name} · {product.sku_code}</SelectItem>)}</SelectContent></Select><div className="flex gap-2"><Button disabled={!selectedProductId || !selectedCategory} onClick={() => onAssign(group.items, selectedProductId, selectedCategory)}>Apply to group</Button><Button variant="ghost" onClick={() => setShowPicker(false)}>Cancel</Button></div></section> : null}
    <div className="flex flex-wrap justify-end gap-2 border-t pt-4"><Button className="h-10" variant="outline" onClick={() => setShowPicker(true)}>Choose another master</Button>{synced ? <Button className="h-10" variant="outline" onClick={onClose}>Close</Button> : <Button className="h-10" disabled={!selectedCategory} onClick={() => group.product ? onAssign(group.items, group.product.id, selectedCategory) : onClose()}><Check className="size-4" />Approve &amp; sync {group.items.length}</Button>}</div></div>
  </> : null}</SheetContent></Sheet>;
}

function ReviewSheet({ item, products, relatedSuggestionCount, onClose, onResolve, onResolveSuggestedGroup, onCreateDraft, onCompleteDraft, onOpenDraft }: { item: CatalogImportItem | null; products: Product[]; relatedSuggestionCount: number; onClose: () => void; onResolve: (id: string, decision: ImportResolution, productId?: string) => void; onResolveSuggestedGroup: (productId: string) => void; onCreateDraft: (item: CatalogImportItem) => string; onCompleteDraft: (item: CatalogImportItem, draftId: string, name: string, sku: string) => void; onOpenDraft: (id: string) => void }) {
  const [selectedProduct, setSelectedProduct] = useState('');
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [createdDraftId, setCreatedDraftId] = useState(item?.resolution === 'create' ? item.resolvedProductId || '' : '');
  const [draftName, setDraftName] = useState(item?.title || '');
  const [draftSku, setDraftSku] = useState(item?.channelSku || '');
  const targetId = selectedProduct || item?.resolvedProductId || item?.suggestedProductId || '';
  const target = products.find(product => product.id === targetId);
  const itemSynced = item?.resolution === 'link';
  const channelRows = item ? [['Title', item.title], ['Channel SKU', item.channelSku], ['Category', item.channelCategory], ['Stock', String(item.channelStock)], ['Price', `${item.price} ${item.currency}`]] : [];
  const masterRows = target ? [['Title', target.name], ['Master SKU', target.sku_code], ['Category', target.category || 'Missing'], ['Master stock', String(Object.values(target.inventory).reduce((sum, value) => sum + value, 0))], ['Base price', `${target.retail_price} ${target.price_currency}`]] : [];
  const finish = (decision: ImportResolution, productId?: string) => { if (!item) return; onResolve(item.id, decision, productId); onClose(); };
  const picker = <div className="space-y-2 rounded-xl border bg-muted/10 p-4"><label className="text-sm font-semibold">Choose another Product Master</label><Select value={selectedProduct} onValueChange={setSelectedProduct}><SelectTrigger><SelectValue placeholder="Search or select Product Master" /></SelectTrigger><SelectContent>{products.map(product => <SelectItem key={product.id} value={product.id}>{product.name} · {product.sku_code}</SelectItem>)}</SelectContent></Select><Button className="w-full" disabled={!selectedProduct} onClick={() => finish('link', selectedProduct)}><Link2 className="size-4" />Link selected Product Master</Button></div>;
  return <Sheet open={Boolean(item)} onOpenChange={open => !open && onClose()}><SheetContent className="flex w-full flex-col overflow-y-auto sm:max-w-2xl">{item ? <><SheetHeader><div className="flex items-center gap-2"><SheetTitle>{itemSynced ? 'Mapping details' : item.status === 'matched' ? 'Confirm exact match' : item.status === 'suggested' ? 'Review suggested match' : item.status === 'unmatched' ? 'Resolve unmatched listing' : item.status === 'conflict' ? 'Resolve listing conflict' : 'Ignored listing'}</SheetTitle><Badge variant="outline" className={cn('ml-auto mr-6', statusCopy[item.status].className)}>{statusCopy[item.status].label}</Badge></div><SheetDescription>{item.storeName} · <span className="capitalize">{item.channel}</span> · {item.listingId}</SheetDescription></SheetHeader>
    {item.status === 'ignored' ? <div className="mt-6 space-y-5"><CompareCard title="Channel listing" rows={channelRows} /><div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700"><p className="font-semibold">This listing is excluded from the current import.</p><p className="mt-1 text-xs leading-5 text-slate-500">Restore it only if you want to link it or create a Product Master later.</p></div><Button onClick={() => finish('later')}><ArrowLeft className="size-4" />Restore to review queue</Button></div> : null}
    {item.status === 'matched' ? <div className="mt-6 space-y-5"><div className="grid gap-4 sm:grid-cols-2"><CompareCard title="Channel listing" rows={channelRows} /><CompareCard title="Exact Product Master match" rows={masterRows} /></div><MatchConfidenceDetails item={item} /><div className="flex gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 className="mt-0.5 size-4 shrink-0" /><p>{itemSynced ? `This listing is synced to the Product Master with ${item.confidence}% confidence.` : `SKU and product identifiers match with ${item.confidence}% confidence. Confirm the relationship or choose a different master.`}</p></div>{showProductPicker ? picker : itemSynced ? <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={onClose}>Close</Button><Button variant="ghost" onClick={() => setShowProductPicker(true)}>Change Product Master</Button></div> : <div className="flex flex-wrap gap-2"><Button onClick={() => finish('link', targetId)}><Check className="size-4" />Approve &amp; sync</Button><Button variant="outline" onClick={() => setShowProductPicker(true)}>Choose different master</Button><Button variant="ghost" onClick={() => finish('ignore')}>Ignore listing</Button></div>}</div> : null}
    {item.status === 'suggested' ? <div className="mt-6 space-y-5"><div className="grid gap-4 sm:grid-cols-2"><CompareCard title="Channel listing" rows={channelRows} /><CompareCard title="Existing Product Master suggested" rows={masterRows} /></div><MatchConfidenceDetails item={item} /><div className={cn("flex gap-3 rounded-lg border p-3 text-sm", itemSynced ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800")}>{itemSynced ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0" />}<div><p>{itemSynced ? `This listing was synced automatically at ${item.confidence}% confidence.` : `This is a ${item.confidence}% confidence suggestion. Review differences before accepting it.`}</p>{relatedSuggestionCount > 1 ? <p className="mt-1 text-xs font-semibold">{relatedSuggestionCount} imported listings share this Product Master suggestion.</p> : null}</div></div>{showProductPicker ? picker : itemSynced ? <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={onClose}>Close</Button><Button variant="ghost" onClick={() => setShowProductPicker(true)}>Change Product Master</Button></div> : <div className="grid gap-2 sm:grid-cols-2"><Button onClick={() => relatedSuggestionCount > 1 && targetId ? onResolveSuggestedGroup(targetId) : finish('link', targetId)}><Link2 className="size-4" />{relatedSuggestionCount > 1 ? `Accept all ${relatedSuggestionCount} for this master` : 'Accept suggested match'}</Button><Button variant="outline" onClick={() => setShowProductPicker(true)}>Choose another master</Button><Button variant="outline" onClick={() => finish('create')}><PackagePlus className="size-4" />Create separate draft</Button><Button variant="ghost" onClick={() => finish('later')}>Keep for later</Button></div>}</div> : null}
    {item.status === 'unmatched' ? createdDraftId ? <div className="mt-6 space-y-5"><div className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-700" /><div><p className="text-sm font-semibold text-emerald-900">Product Master draft created</p><p className="mt-1 text-xs text-emerald-700">Draft ID: {createdDraftId}. Complete the minimum information below, or finish it later in Product Master.</p></div></div><section className="space-y-4 rounded-xl border p-4"><div><h3 className="text-sm font-semibold">Complete Product Master draft</h3><p className="mt-1 text-xs text-slate-500">Information from {item.channel} has been prefilled. Channel stock remains channel-owned.</p></div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><label className="text-sm font-medium">Product name *</label><Input value={draftName} onChange={event => setDraftName(event.target.value)} /></div><div className="space-y-2"><label className="text-sm font-medium">Master SKU *</label><Input value={draftSku} onChange={event => setDraftSku(event.target.value)} /><p className="text-xs text-slate-500">Proposed from Channel SKU.</p></div></div><div className="grid gap-3 sm:grid-cols-3"><DraftFieldStatus label="Product structure" value={item.variants > 1 ? `Variants · ${item.variants}` : 'Single product'} ready /><DraftFieldStatus label="Internal category" value="Not selected" /><DraftFieldStatus label="Brand" value="Not identified" /></div></section><div className="flex flex-wrap gap-2"><Button disabled={!draftName.trim() || !draftSku.trim()} onClick={() => onCompleteDraft(item, createdDraftId, draftName.trim(), draftSku.trim())}><Link2 className="size-4" />Save &amp; link listing</Button><Button variant="outline" onClick={() => onOpenDraft(createdDraftId)}>Open full product editor</Button><Button variant="ghost" onClick={onClose}>Finish later</Button></div></div> : <div className="mt-6 space-y-5"><CompareCard title="Channel listing" rows={channelRows} /><div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><CircleAlert className="mt-0.5 size-4 shrink-0" /><div><p className="font-semibold">No Product Master match was found.</p><p className="mt-1 text-xs">Create a draft from this listing, or search for an existing master manually.</p></div></div>{showProductPicker ? picker : <div className="grid gap-2 sm:grid-cols-2"><Button onClick={() => setCreatedDraftId(onCreateDraft(item))}><PackagePlus className="size-4" />Create Product Master draft</Button><Button variant="outline" onClick={() => setShowProductPicker(true)}>Find existing master</Button><Button variant="ghost" onClick={() => finish('later')}>Keep for later</Button><Button variant="ghost" onClick={() => finish('ignore')}>Ignore listing</Button></div>}</div> : null}
    {item.status === 'conflict' ? <div className="mt-6 space-y-5"><div className="grid gap-4 sm:grid-cols-2"><CompareCard title="Channel listing" rows={channelRows} /><CompareCard title="Potential Product Master" rows={masterRows} /></div><ConflictResolutionGuide item={item} target={target} />{showProductPicker ? picker : <div className="grid gap-2 sm:grid-cols-2"><Button onClick={() => setShowProductPicker(true)}>Start: select correct master</Button><Button variant="outline" onClick={() => finish('create')}><PackagePlus className="size-4" />Create separate draft</Button><Button variant="ghost" onClick={() => finish('later')}>Keep for later</Button><Button variant="ghost" onClick={() => finish('ignore')}>Ignore listing</Button></div>}</div> : null}
  </> : null}</SheetContent></Sheet>;
}

function CompareCard({ title, rows }: { title: string; rows: string[][] }) { return <section className="rounded-xl border"><h3 className="border-b bg-slate-50 px-4 py-3 text-sm font-semibold">{title}</h3><dl className="divide-y divide-slate-100">{rows.map(([label, value]) => <div key={label} className="px-4 py-3"><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 text-sm font-medium text-slate-900">{value}</dd></div>)}</dl></section>; }
function MatchConfidenceDetails({ item }: { item: CatalogImportItem }) {
  const base = item.status === 'matched' ? 100 : item.confidence;
  const signals = [['Identifiers', Math.min(100, base + 8)], ['SKU', Math.min(100, base + 5)], ['Variant structure', Math.max(0, base - 4)], ['Brand & category', Math.max(0, base - 8)], ['Product title', Math.max(0, base - 2)]] as const;
  return <details className="group rounded-xl border bg-slate-50/60"><summary className="flex cursor-pointer list-none items-center gap-3 p-4"><span className="text-sm font-semibold">Mapping confidence</span><Badge variant="outline" className={base >= 85 ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}>{base}%</Badge><span className="ml-auto text-xs text-slate-500">View signal breakdown</span><ChevronDown className="size-4 text-slate-400 transition-transform group-open:rotate-180" /></summary><div className="grid gap-3 border-t p-4 sm:grid-cols-5">{signals.map(([label, value]) => <div key={label}><div className="mb-1 flex justify-between gap-2 text-[11px]"><span className="text-slate-500">{label}</span><strong>{value}%</strong></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-200"><div className={cn('h-full rounded-full', value >= 85 ? 'bg-emerald-500' : 'bg-amber-500')} style={{ width: `${value}%` }} /></div></div>)}</div><p className="border-t px-4 py-3 text-xs text-slate-500">This score estimates whether two records represent the same product. It does not measure whether the product data is complete.</p></details>;
}
function MappingSignal({ confidence, decision }: { confidence: number; decision: ImportResolution }) {
  const exact = confidence === 100;
  const safe = confidence >= safeSuggestionThreshold;
  const label = decision === 'create' ? 'Draft prepared' : exact ? 'Exact match' : safe ? 'High confidence' : 'Suggested match';
  const tone = decision === 'create' ? 'bg-violet-500' : exact ? 'bg-emerald-500' : safe ? 'bg-indigo-500' : 'bg-amber-500';
  return <div className="flex h-9 min-w-0 items-center gap-2 px-1" aria-label={confidence ? `${label}, ${confidence}% confidence` : label}><span className={cn('size-2 shrink-0 rounded-full', tone)} /><div className="min-w-0"><p className="truncate text-xs font-semibold text-slate-800">{label}</p><p className="truncate text-[11px] text-slate-500">{confidence ? `${confidence}% confidence` : 'Product Master draft'}</p></div></div>;
}
function MappingWorkflowStatus({ synced, decision }: { synced: boolean; decision: ImportResolution }) {
  const label = synced ? 'Synced' : decision === 'create' ? 'Needs completion' : 'Review required';
  const tone = synced ? 'text-emerald-700' : 'text-amber-700';
  return <div className={cn('flex h-9 min-w-0 items-center gap-2 px-1', tone)}><span className="grid size-5 shrink-0 place-items-center">{synced ? <CheckCircle2 className="size-4" /> : <CircleAlert className="size-4" />}</span><span className="truncate text-xs font-semibold">{label}</span></div>;
}
function EmptyState({ copy }: { copy: string }) { return <div className="grid min-h-36 place-items-center p-6 text-center"><div><CheckCircle2 className="mx-auto size-6 text-slate-300" /><p className="mt-2 text-sm text-slate-500">{copy}</p></div></div>; }
function DraftFieldStatus({ label, value, ready = false }: { label: string; value: string; ready?: boolean }) { return <div className={cn('rounded-lg border p-3', ready ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50')}><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className={cn('mt-1 text-sm font-semibold', ready ? 'text-emerald-800' : 'text-amber-800')}>{value}</p></div>; }
function ConflictResolutionGuide({ item, target }: { item: CatalogImportItem; target?: Product }) {
  const masterIdentifier = target?.asin || target?.gtin || 'Missing';
  const masterVariants = target ? Math.max(target.skus.length, target.has_variants ? 1 : 0) : 0;
  const differences = [
    { field: 'SKU', channel: item.channelSku, master: target?.sku_code || 'Missing', same: item.channelSku === target?.sku_code },
    { field: 'Identifier', channel: item.listingId, master: masterIdentifier, same: item.listingId === masterIdentifier },
    { field: 'Category', channel: item.channelCategory, master: target?.category || 'Missing', same: item.channelCategory === target?.category },
    { field: 'Variants', channel: String(item.variants), master: String(masterVariants), same: item.variants === masterVariants },
  ];
  return <section className="overflow-hidden rounded-xl border border-rose-200" aria-labelledby="conflict-guide-title"><div className="flex gap-3 bg-rose-50 p-4 text-rose-900"><CircleAlert className="mt-0.5 size-4 shrink-0" /><div><h3 id="conflict-guide-title" className="text-sm font-semibold">Why this needs review</h3><p className="mt-1 text-xs leading-5 text-rose-700">The SKU matches, but {differences.filter(row => !row.same).map(row => row.field.toLowerCase()).join(', ')} do not. SKU alone is not enough to link safely.</p></div></div><div className="grid grid-cols-[90px_1fr_1fr_72px] gap-x-3 border-t bg-white px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500"><span>Field</span><span>Channel</span><span>Master</span><span>Result</span></div>{differences.map(row => <div key={row.field} className="grid grid-cols-[90px_1fr_1fr_72px] gap-x-3 border-t px-4 py-2.5 text-xs"><strong>{row.field}</strong><span className="truncate" title={row.channel}>{row.channel}</span><span className="truncate" title={row.master}>{row.master}</span><span className={row.same ? 'font-semibold text-emerald-700' : 'font-semibold text-rose-700'}>{row.same ? 'Same' : 'Different'}</span></div>)}<div className="border-t bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">How to resolve</p><ol className="mt-3 space-y-3">{[['1', 'Verify the item', 'Check identifier, category and variant structure—not only the SKU.'], ['2', 'Choose the relationship', 'Select the correct existing master, or create a separate draft if this is a different product.'], ['3', 'Approve the mapping', 'Once approved, Prime OS syncs the relationship immediately.']].map(([number, title, detail]) => <li key={number} className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-slate-900 text-[11px] font-bold text-white">{number}</span><div><p className="text-sm font-semibold text-slate-900">{title}</p><p className="mt-0.5 text-xs leading-5 text-slate-500">{detail}</p></div></li>)}</ol></div></section>;
}
function Summary({ label, value, detail, tone = 'slate' }: { label: string; value: number; detail: string; tone?: 'slate' | 'emerald' | 'amber' }) { return <div className="rounded-xl border bg-white p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className={cn('mt-2 text-2xl font-bold tabular-nums', tone === 'emerald' ? 'text-emerald-700' : tone === 'amber' ? 'text-amber-700' : 'text-slate-900')}>{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></div>; }
function DecisionBadge({ resolution }: { resolution: ImportResolution }) {
  const config = {
    link: { label: 'Synced', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
    create: { label: 'Draft created', className: 'border-violet-200 bg-violet-50 text-violet-700' },
    later: { label: 'No decision', className: 'border-amber-200 bg-amber-50 text-amber-700' },
    ignore: { label: 'Will ignore', className: 'border-slate-200 bg-slate-50 text-slate-500' },
  }[resolution];
  return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
}
