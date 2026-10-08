import { useDeferredValue, useRef, useState } from 'react';
import { listingSyncReadiness } from '@/lib/listing-sync-readiness';
import { ArrowRight, ChevronDown, Link2, Package, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ListingReviewHelp } from './ListingReviewHelp';
import { ListingReviewResult, type ListingReviewReceipt } from './ListingReviewResult';
import { ChannelLogo } from '@/components/channels/ChannelLogo';
import { savedListingCatalog, type ListingIntakeCatalog } from '@/lib/listing-intake-catalog';
import { getListingSuggestion, snapshotListingMatch, pendingListingReviews, unfinishedListingReviews } from '@/lib/product-listing-intake';
import type { CatalogImportItem } from '@/lib/catalog-import-store';
import { useToast } from '@/hooks/use-toast';
import { SuggestedListingLinksDialog, type SuggestedLinkPreview } from './SuggestedListingLinksDialog';
import { ListingMasterReview, type IntakeStage } from './ListingMasterReview';
import { ListingReviewGuide } from './ListingReviewGuide';

export function ProductListingIntake({ catalog = savedListingCatalog, onChanged, onOpenMaster, stayInQueue = false, onStageChange, onDirtyChange, guideActionContainer }: { catalog?: ListingIntakeCatalog; onChanged: (productIds: string[], created?: boolean) => void; onOpenMaster: (id: string) => void; stayInQueue?: boolean; onStageChange?: (stage: IntakeStage) => void; onDirtyChange?: (dirty: boolean) => void; guideActionContainer?: HTMLElement | null }) {
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [batchPairs, setBatchPairs] = useState<SuggestedLinkPreview[] | null>(null);
  const search = useDeferredValue(query).trim().toLowerCase();
  const [selected, setSelected] = useState<string[]>([]);
  const [mode, setMode] = useState<'existing' | 'new' | null>(null);
  const [reviewIds, setReviewIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<'all' | 'quick' | 'check' | 'unmatched'>('all');
  const [progress, setProgress] = useState<{ index: number; total: number } | null>(null);
  const [remaining, setRemaining] = useState<string[]>([]);
  const separateCreation = useRef(false);
  const queueRef = useRef<HTMLElement>(null);
  const returnAction = useRef<{ label: string; index: number } | null>(null);
  const [receipt, setReceipt] = useState<ListingReviewReceipt | null>(null);
  const [resume, setResume] = useState<CatalogImportItem[] | null>(null);
  const products = catalog.products();
  const hasMasters = products.some(product => product.status !== 'archived');
  const items = pendingListingReviews(products, catalog.listings());
  const unfinished = unfinishedListingReviews(products, catalog.listings());
  const suggestions = new Map(items.map(item => [item.id, getListingSuggestion(item, products)]));
  const category = (item: CatalogImportItem) => !suggestions.get(item.id)?.product ? 'unmatched' : suggestions.get(item.id)?.eligible ? 'quick' : 'check';
  const visible = items.filter(item => (filter === 'all' || category(item) === filter) && `${item.title} ${item.channelSku} ${item.channel} ${item.storeName}`.toLowerCase().includes(search));
  const reviewing = resume ?? items.filter(item => reviewIds.includes(item.id));
  const selectedItems = items.filter(item => selected.includes(item.id));
  const eligibleSelected = selectedItems.filter(item => suggestions.get(item.id)?.eligible);
  const hiddenSelected = selectedItems.filter(item => !visible.some(row => row.id === item.id)).length;
  const visibleSelected = visible.filter(item => selected.includes(item.id)).length;
  const previewSuggestedLinks = () => {
    if (!eligibleSelected.length) return;
    setBatchPairs(eligibleSelected.map(listing => {
      const master = suggestions.get(listing.id)!.product!;
      return structuredClone({ listing, master, review: snapshotListingMatch(listing, master) });
    }));
  };
  const pick = (nextMode: 'existing' | 'new', ids = selectedItems.map(item => item.id)) => {
    const active = document.activeElement;
    const label = active?.textContent || '';
    returnAction.current = { label, index: Array.from(queueRef.current?.querySelectorAll('button') ?? []).filter(button => button.textContent === label).indexOf(active as HTMLButtonElement) };
    setReviewIds(ids); setResume(null); setMode(nextMode);
  };
  const backToQueue = () => {
    setMode(null); setResume(null); setReviewIds([]); setRemaining([]); setProgress(null); onStageChange?.('queue');
    requestAnimationFrame(() => {
      const action = returnAction.current;
      const buttons = Array.from(queueRef.current?.querySelectorAll('button') ?? []);
      const previous = action && buttons.filter(button => button.textContent === action.label)[action.index];
      (previous && !previous.disabled ? previous : queueRef.current?.querySelector('input'))?.focus();
    });
  };
  const startSeparateReview = () => {
    if (!selectedItems.length) return;
    separateCreation.current = !hasMasters;
    setReceipt(null);
    setProgress(selectedItems.length > 1 ? { index: 1, total: selectedItems.length } : null);
    setRemaining(selectedItems.slice(1).map(item => item.id));
    pick(hasMasters ? 'existing' : 'new', [selectedItems[0].id]);
  };
  const nextReview = () => {
    const pending = pendingListingReviews(catalog.products(), catalog.listings());
    const next = remaining.map(id => pending.find(item => item.id === id)).filter((item): item is CatalogImportItem => Boolean(item));
    if (!next.length) { backToQueue(); return; }
    setRemaining(next.slice(1).map(item => item.id)); setReviewIds([next[0].id]); setResume(null);
    setProgress(previous => previous ? { ...previous, index: previous.index + 1 } : null);
    setMode(separateCreation.current ? 'new' : 'existing');
  };
  const resumeReview = (listings: CatalogImportItem[]) => {
    setResume(listings); setReviewIds(listings.map(item => item.id)); setMode('existing'); setRemaining([]); setProgress(null);
  };
  if (mode) return <ListingMasterReview catalog={catalog} key={`${mode}:${reviewIds.join('|')}`} listings={reviewing} initialMode={mode} remainingCount={items.length} batchProgress={progress ?? undefined} onSkip={progress ? nextReview : undefined} onBack={backToQueue} onStageChange={onStageChange} onDirtyChange={onDirtyChange} onSaved={(result, created) => {
    const product = catalog.products().find(item => item.id === result.productId)!;
    const savedIds = reviewing.map(item => item.id);
    const nextReceipt: ListingReviewReceipt = {
      pairs: reviewing.map(item => {
        const link = product.channels.find(link => link.channel === item.channel && link.external_id === item.listingId && link.store_name === item.storeName);
        return { channel: item.channel, listingId: item.listingId, listing: item.title, shop: item.storeName, masterId: product.id, master: product.name,
          readiness: link ? listingSyncReadiness(product, link, catalog.listings()) : undefined };
      }),
      deferred: result.deferred, reviewSaved: result.reviewSaved,
      masterState: created ? `New Master ${product.status === 'published' ? 'Active' : 'Draft'}.` : result.masterUpdated ? `Master changes saved; status ${product.status === 'published' ? 'Active' : 'Draft'}.` : `Master status and details unchanged (${product.status === 'published' ? 'Active' : 'Draft'}).`,
    };
    setReceipt(previous => progress && previous ? { ...nextReceipt, pairs: [...previous.pairs, ...nextReceipt.pairs], deferred: previous.deferred || nextReceipt.deferred, reviewSaved: previous.reviewSaved && nextReceipt.reviewSaved, masterState: 'Your reviewed links have been saved separately.' } : nextReceipt); setSelected(current => current.filter(id => !savedIds.includes(id)));
    onChanged([result.productId], created);
    toast({ title: result.deferred ? 'Linked · Review unfinished' : `${reviewing.length} listing${reviewing.length === 1 ? '' : 's'} linked`, description: result.reviewSaved ? `${nextReceipt.masterState} Nothing published; sync was not turned on.` : 'Links saved, but review history could not be saved. Do not link again.' });
    nextReview();
  }} />;
  const resumeReceipt = receipt?.deferred ? unfinished.filter(item => receipt.pairs.some(pair => pair.masterId === item.existingLinkReview?.productId && pair.channel === item.channel && pair.shop === item.storeName && pair.listingId === item.listingId)) : [];
  return <div className="space-y-3">
    {hasMasters && <ListingReviewGuide hasListings={items.length > 0} actionContainer={guideActionContainer} />}
    {receipt && <ListingReviewResult receipt={receipt} onOpenMaster={catalog.preview ? undefined : onOpenMaster} onContinue={resumeReceipt.length && new Set(resumeReceipt.map(item => item.existingLinkReview?.productId)).size === 1 ? () => resumeReview(resumeReceipt) : undefined} />}
    {!hasMasters && <div className="rounded-lg border bg-primary/5 p-4"><h2 className="text-sm font-semibold">Create your first Product Masters</h2><p className="mt-1 text-sm text-muted-foreground">Use data already imported from your shops. Review listings separately, or group the same product across shops.</p></div>}
    {unfinished.length > 0 && <section aria-label="Linked listings to finish" className="overflow-hidden rounded-xl border bg-card"><div className="border-b p-4"><h2 className="text-sm font-semibold">Linked · {unfinished.length} review{unfinished.length === 1 ? '' : 's'} unfinished</h2><p className="mt-1 text-xs text-muted-foreground">Continue where you left off. Unconfirmed SKU mappings cannot be used for price or stock sync.</p></div><ul className="max-h-56 divide-y overflow-y-auto">{unfinished.map(item => <li key={item.id} className="flex flex-wrap items-center gap-3 p-4"><ChannelLogo channel={{ key: item.channel }} /><div className="min-w-0 flex-1"><p className="text-sm font-medium">{item.title}</p><p className="mt-1 text-xs text-muted-foreground">{item.storeName} · {products.find(product => product.id === item.existingLinkReview?.productId)?.name}</p><p className="mt-1 text-xs text-amber-700 dark:text-amber-300">{item.existingLinkReview?.issues.join(' · ')}</p></div><Button variant="outline" className="h-11" onClick={() => { resumeReview([item]); }}>Continue review</Button></li>)}</ul></section>}
    <section ref={queueRef} className="overflow-hidden rounded-xl border bg-card" aria-label="Listings waiting for confirmation">

    <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4"><div><h2 className="text-sm font-semibold">{items.length} listing{items.length === 1 ? '' : 's'} to review</h2>{!stayInQueue && <p className="mt-1 text-xs leading-5 text-muted-foreground">Choose a Master for each listing, or select listings for the same product to group them.</p>}</div><Input aria-label="Search shop listings" placeholder="Search listing, SKU, shop…" value={query} onChange={event => setQuery(event.target.value)} className="w-full sm:max-w-80" /></div>
    {hasMasters && <div role="group" aria-label="Listing review filters" className="flex flex-wrap items-center gap-x-1 border-b px-3">{([{ id: 'all', label: 'All' }, { id: 'quick', label: 'Quick review' }, { id: 'check', label: 'Needs review' }, { id: 'unmatched', label: 'No suggestion' }] as const).map(tab => <button key={tab.id} type="button" aria-pressed={filter === tab.id} onClick={() => setFilter(tab.id)} className={`inline-flex min-h-11 items-center gap-2 border-b-2 px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${filter === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>{tab.label}<span className="tabular-nums text-muted-foreground">{tab.id === 'all' ? items.length : items.filter(item => category(item) === tab.id).length}</span></button>)}<ListingReviewHelp label="Review filters">Quick review contains suggestions eligible for a shared confirmation. Needs review requires a closer product or SKU check. No suggestion means you can choose an existing Master or create a new one. Suggestions are never saved links.</ListingReviewHelp></div>}
    {selectedItems.length > 0 && <div className="space-y-2 border-b bg-primary/[0.04] p-3" role="group" aria-label="Selected listing actions">
      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-auto flex flex-wrap items-center gap-2"><span className="text-sm font-semibold">{selectedItems.length} selected</span>{hiddenSelected > 0 && <span className="text-xs text-muted-foreground">{hiddenSelected} outside this view</span>}<Button variant="ghost" className="h-11 px-2 text-xs text-muted-foreground" onClick={() => setSelected([])}>Clear selection</Button></div>
        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" className="h-11">Group as one product<ChevronDown className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>All {selectedItems.length} listings → one Master</DropdownMenuLabel><DropdownMenuSeparator />{hasMasters && <DropdownMenuItem onSelect={() => { setRemaining([]); setProgress(null); pick('existing'); }}><Link2 className="mr-2 size-4" />Link to one Master</DropdownMenuItem>}<DropdownMenuItem onSelect={() => { setRemaining([]); setProgress(null); pick('new'); }}><Plus className="mr-2 size-4" />Create one Master</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
        <Button className="h-11" onClick={eligibleSelected.length === selectedItems.length ? previewSuggestedLinks : startSeparateReview}>{eligibleSelected.length === selectedItems.length ? `Review suggested links (${eligibleSelected.length})` : 'Review selected listings'}<ArrowRight className="size-4" /></Button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs leading-5 text-muted-foreground"><p>Review each listing with its own Master. Group only listings of the same product.</p>{eligibleSelected.length > 0 && eligibleSelected.length < selectedItems.length && <Button variant="link" className="h-8 px-0 text-xs" onClick={previewSuggestedLinks}>Quick review {eligibleSelected.length} suggestions first</Button>}</div>
    </div>}
    <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead className="border-b bg-muted/20 text-xs text-muted-foreground"><tr><th className="w-12 p-4"><Checkbox aria-label="Select visible shop listings" checked={visibleSelected > 0 && visibleSelected < visible.length ? 'indeterminate' : visible.length > 0 && visibleSelected === visible.length} onCheckedChange={checked => setSelected(current => checked ? [...new Set([...current, ...visible.map(item => item.id)])] : current.filter(id => !visible.some(item => item.id === id)))} /></th><th className="p-3">Listing</th><th className="p-3">Shop</th>{hasMasters && <th className="p-3">Product Master</th>}<th className="p-3"><span className="sr-only">Actions</span></th></tr></thead><tbody className="divide-y">{visible.map(item => {
      const match = suggestions.get(item.id)!;
      const suggestion = match.product;
      return <tr key={item.id} className={selected.includes(item.id) ? "bg-primary/[0.04]" : "hover:bg-muted/30"}><td className="p-4"><Checkbox aria-label={`Select listing ${item.channelSku} from ${item.storeName}`} checked={selected.includes(item.id)} onCheckedChange={checked => setSelected(current => checked ? [...new Set([...current, item.id])] : current.filter(id => id !== item.id))} /></td><td className="p-3"><div className="flex items-center gap-3"><div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-md border bg-muted"><Package className="col-start-1 row-start-1 size-4 text-muted-foreground" />{(item.image || item.images?.[0]) && <img src={item.image || item.images?.[0]} alt="" className="col-start-1 row-start-1 size-full object-cover" onError={event => { event.currentTarget.style.display = 'none'; }} />}</div><div className="max-w-72"><p className="font-medium">{item.title}</p><p className="mt-1 text-xs text-muted-foreground">{item.channelSku} · {item.variants === 0 ? 'SKU structure not recorded' : `${item.variants} SKU${item.variants === 1 ? '' : 's'}`}</p></div></div></td><td className="p-3"><div className="flex items-center gap-2"><ChannelLogo channel={{ key: item.channel }} /><span><span className="block font-medium">{item.storeName}</span><span className="text-xs capitalize text-muted-foreground">{item.channel}</span></span></div></td>{hasMasters && <td className="p-3"><p className="max-w-56 text-xs">{suggestion?.name || 'No suggestion yet'}</p>{suggestion && <p className="mt-1 text-xs text-muted-foreground">{suggestion.sku_code} · Not confirmed</p>}{match.reason && suggestion && <p className="mt-1 max-w-56 text-xs text-amber-700 dark:text-amber-300">{match.reason}</p>}{match.eligible && <p className="mt-1 text-xs text-muted-foreground">SKU &amp; brand match · Confirm required</p>}</td>}<td className="p-3 text-right"><Button variant="outline" className="h-11" disabled={selectedItems.length > 0} title={selectedItems.length ? "Use Review selected listings, or clear selection to review one row." : undefined} onClick={() => pick(hasMasters ? 'existing' : 'new', [item.id])}>{hasMasters ? suggestion ? 'Review suggestion' : 'Choose Master' : 'Create Master'}</Button></td></tr>;
    })}</tbody></table></div>
    {!visible.length && <div className="p-8 text-center"><p className="font-medium">{items.length ? 'No listings match your search' : 'No listings waiting for confirmation'}</p><p className="mt-2 text-sm text-muted-foreground">{items.length ? 'Try another name, SKU, shop or review filter.' : 'Existing confirmed links stay in Product Masters. New imported listings will appear here when available.'}</p>{items.length > 0 && <Button variant="ghost" onClick={() => { setQuery(''); setFilter('all'); }}>Clear search</Button>}</div>}
    {batchPairs && <SuggestedListingLinksDialog catalog={catalog} pairs={batchPairs} onClose={() => setBatchPairs(null)} onSaved={result => {
      setReceipt({ pairs: batchPairs.map(pair => ({ channel: pair.listing.channel, listingId: pair.listing.listingId, listing: pair.listing.title, shop: pair.listing.storeName, master: pair.master.name, masterId: pair.master.id })), deferred: false, reviewSaved: result.reviewSaved, masterState: 'Master status, details and images unchanged.' });
      const saved = batchPairs.map(pair => pair.listing.id);
      setSelected(current => current.filter(id => !saved.includes(id))); setBatchPairs(null); onChanged(result.productIds, false);
      toast({ title: `${result.linkedCount} listings linked to ${result.masterCount} Masters`, description: result.reviewSaved ? 'Reviewed links saved. Nothing published; sync was not turned on.' : 'Links saved, but review history could not be saved. Do not link again.' });
    }} />}
    </section>
  </div>;
}
