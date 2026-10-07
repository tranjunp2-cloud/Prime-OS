import { useDeferredValue, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Link2, Package, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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
  const [grouping, setGrouping] = useState(false);
  const [groupChoice, setGroupChoice] = useState<'separate' | 'same'>('separate');
  const [remaining, setRemaining] = useState<string[]>([]);
  const queueRef = useRef<HTMLElement>(null);
  const returnAction = useRef<{ label: string; index: number } | null>(null);
  const [createdMasterId, setCreatedMasterId] = useState<string | null>(null);
  const [lastCreated, setLastCreated] = useState(false);
  const [lastMessage, setLastMessage] = useState('');
  const [resume, setResume] = useState<CatalogImportItem | null>(null);
  const products = catalog.products();
  const hasMasters = products.some(product => product.status !== 'archived');
  const items = pendingListingReviews(products, catalog.listings());
  const unfinished = unfinishedListingReviews(products, catalog.listings());
  const suggestions = new Map(items.map(item => [item.id, getListingSuggestion(item, products)]));
  const visible = items.filter(item => `${item.title} ${item.channelSku} ${item.channel} ${item.storeName}`.toLowerCase().includes(search));
  const selectedItems = items.filter(item => selected.includes(item.id));
  const eligibleSelected = selectedItems.filter(item => suggestions.get(item.id)?.eligible);
  const previewSuggestedLinks = () => {
    if (!selectedItems.length || eligibleSelected.length !== selectedItems.length) return;
    setBatchPairs(selectedItems.map(listing => {
      const master = suggestions.get(listing.id)!.product!;
      return structuredClone({ listing, master, review: snapshotListingMatch(listing, master) });
    }));
  };
  const pick = (nextMode: 'existing' | 'new', ids = selected) => {
    const active = document.activeElement;
    const label = active?.textContent || '';
    returnAction.current = { label, index: Array.from(queueRef.current?.querySelectorAll('button') ?? []).filter(button => button.textContent === label).indexOf(active as HTMLButtonElement) };
    setSelected(ids); setResume(null); setMode(nextMode); setGrouping(false);
  };
  const backToQueue = () => {
    setMode(null); setResume(null); setGrouping(false); setRemaining([]); onStageChange?.('queue');
    requestAnimationFrame(() => {
      const action = returnAction.current;
      const buttons = Array.from(queueRef.current?.querySelectorAll('button') ?? []);
      const previous = action && buttons.filter(button => button.textContent === action.label)[action.index];
      (previous || queueRef.current?.querySelector('input'))?.focus();
    });
  };
  if (grouping) return <section className="flex h-full min-h-0 flex-col" aria-label="Review selected listings">
    <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
      <Button variant="ghost" onClick={backToQueue}><ArrowLeft className="size-4" />Back to listings</Button>
      <div><h2 className="text-lg font-semibold">How should these {selectedItems.length} listings be handled?</h2><p className="mt-2 text-sm text-muted-foreground">Selecting several listings does not automatically group them into one product.</p></div>
      <fieldset className="grid gap-3 sm:grid-cols-2"><legend className="sr-only">Listing grouping</legend>
        {([{ value: 'separate', title: 'Review separately', detail: 'Review each listing in turn. Create or choose its own Master.' }, { value: 'same', title: 'Same product, one Master', detail: 'Only for the same product sold across shops. Review the source data and match each SKU.' }] as const).map(option => <label key={option.value} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${groupChoice === option.value ? 'border-primary bg-primary/5' : 'bg-card'}`}><input type="radio" name="listing-grouping" className="mt-1 accent-primary" value={option.value} checked={groupChoice === option.value} onChange={() => setGroupChoice(option.value)} /><span><span className="block text-sm font-semibold">{option.title}</span><span className="mt-2 block text-sm leading-6 text-muted-foreground">{option.detail}</span></span></label>)}
      </fieldset>
      <ul className="divide-y rounded-xl border" aria-label="Selected listings">{selectedItems.map(item => <li key={item.id} className="flex gap-3 p-4"><ChannelLogo channel={{ key: item.channel }} /><div><p className="text-sm font-medium">{item.title}</p><p className="mt-1 text-xs text-muted-foreground">{item.storeName} · {item.channelSku} · {item.variants ? `${item.variants} SKU${item.variants === 1 ? '' : 's'}` : 'SKU structure not recorded'}</p></div></li>)}</ul>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4 sm:px-6"><p className="text-xs text-muted-foreground">Nothing is saved until you confirm each review.</p><Button onClick={() => {
      if (groupChoice === 'separate') { setRemaining(selected.slice(1)); pick(suggestions.get(selected[0])?.product ? 'existing' : 'new', [selected[0]]); }
      else { setRemaining([]); pick(hasMasters ? 'existing' : 'new'); }
    }}>{groupChoice === 'separate' ? 'Review first listing' : 'Review one product'}<ArrowRight className="size-4" /></Button></div>
  </section>;
  if (mode) return <ListingMasterReview catalog={catalog} key={`${mode}:${resume?.id ?? selected.join('|')}`} listings={resume ? [resume] : selectedItems} initialMode={mode} remainingCount={items.length} onBack={backToQueue} onStageChange={onStageChange} onDirtyChange={onDirtyChange} onSaved={(result, created) => {
      const product = catalog.products().find(item => item.id === result.productId);
      onChanged([result.productId], created); setLastCreated(created);
      const message = result.deferred ? `${created ? 'Draft Master created. ' : ''}Linked · review unfinished. Use Continue review to finish; sync was not turned on.` : result.masterUpdated ? 'Reviewed Master changes and links saved. Nothing was published; sync was not turned on.' : created ? 'New Master created and Active. Nothing was published to shops; sync stays off.' : 'Listing linked. Master status and details are unchanged.';
      setLastMessage(message);
      toast({ title: result.deferred ? 'Progress saved' : created ? `Active Master created: ${product?.name || 'Product Master'}` : `Listing linked: ${product?.name || 'Product Master'}`, description: result.reviewSaved ? message : 'The link was saved, but review history could not be saved. Shop data was not changed.' });
      setCreatedMasterId(result.productId);
      const next = pendingListingReviews(catalog.products(), catalog.listings()).filter(item => remaining.includes(item.id));
      if (next.length) {
        setRemaining(next.slice(1).map(item => item.id)); setSelected([next[0].id]);
        setMode(getListingSuggestion(next[0], catalog.products()).product ? 'existing' : 'new');
      } else {
        backToQueue(); setSelected([]);
      }
  }} />;
  return <div className="space-y-3">
    {hasMasters && <ListingReviewGuide hasListings={items.length > 0} actionContainer={guideActionContainer} />}
    {!hasMasters && <div className="rounded-lg border bg-primary/5 p-4"><h2 className="text-sm font-semibold">Create your first Product Masters</h2><p className="mt-1 text-sm text-muted-foreground">Use data already imported from your shops. Review listings separately, or group the same product across shops.</p></div>}
    {unfinished.length > 0 && <section aria-label="Linked listings to finish" className="overflow-hidden rounded-xl border bg-card"><div className="border-b p-4"><h2 className="text-sm font-semibold">Linked · {unfinished.length} review{unfinished.length === 1 ? '' : 's'} unfinished</h2><p className="mt-1 text-xs text-muted-foreground">Continue where you left off. Unconfirmed SKU mappings cannot be used for price or stock sync.</p></div><ul className="divide-y">{unfinished.map(item => <li key={item.id} className="flex flex-wrap items-center gap-3 p-4"><ChannelLogo channel={{ key: item.channel }} /><div className="min-w-0 flex-1"><p className="text-sm font-medium">{item.title}</p><p className="mt-1 text-xs text-muted-foreground">{item.storeName} · {products.find(product => product.id === item.existingLinkReview?.productId)?.name}</p><p className="mt-1 text-xs text-amber-700 dark:text-amber-300">{item.existingLinkReview?.issues.join(' · ')}</p></div><Button variant="outline" className="h-11" onClick={() => { setResume(item); setMode('existing'); setRemaining([]); }}>Continue review</Button></li>)}</ul></section>}
    <section ref={queueRef} className="overflow-hidden rounded-xl border bg-card" aria-label="Listings waiting for confirmation">
    {createdMasterId && <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-primary/5 px-4 py-3"><p className="text-sm" role="status">{lastMessage || (lastCreated ? 'New Master created and Active.' : 'Listing linked. Master status and details are unchanged.')} You can keep reviewing listings.</p>{!catalog.preview && <Button variant="ghost" size="sm" onClick={() => onOpenMaster(createdMasterId)}>View updated Master</Button>}</div>}
    <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4"><div><h2 className="text-sm font-semibold">{items.length} listing{items.length === 1 ? '' : 's'} to review</h2>{!stayInQueue && <p className="mt-1 text-xs leading-5 text-muted-foreground">Choose a Master for each listing, or select listings for the same product to group them.</p>}</div><Input aria-label="Search shop listings" placeholder="Search listing, SKU, shop…" value={query} onChange={event => { setQuery(event.target.value); setSelected([]); }} className="w-full sm:max-w-80" /></div>
    {selectedItems.length > 0 && <div className="flex flex-wrap items-center gap-2 border-b bg-muted/30 p-3" role="group" aria-label="Selected listing actions">
      <span className="mr-auto text-sm">{selectedItems.length} selected</span>
      {hasMasters ? <>
        <Button variant="outline" onClick={() => pick('existing')}><Link2 className="size-4" />Link to one Master</Button>
        <Button variant="outline" onClick={() => pick('new')}><Plus className="size-4" />Create one Master</Button>
      </> : <Button onClick={() => {
        if (selectedItems.length === 1) pick(suggestions.get(selected[0])?.product ? 'existing' : 'new');
        else { setGroupChoice('separate'); setGrouping(true); onStageChange?.('group'); }
      }}>Review selected listings<ArrowRight className="size-4" /></Button>}
      {hasMasters && eligibleSelected.length === selectedItems.length && <Button onClick={previewSuggestedLinks}>Review suggested links ({eligibleSelected.length})</Button>}
      <Button variant="ghost" onClick={() => setSelected([])}>Clear selection</Button>
    </div>}
    <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead className="border-b bg-muted/20 text-xs text-muted-foreground"><tr><th className="w-12 p-4"><Checkbox aria-label="Select visible shop listings" checked={visible.length > 0 && visible.every(item => selected.includes(item.id))} onCheckedChange={checked => setSelected(current => checked ? [...new Set([...current, ...visible.map(item => item.id)])] : current.filter(id => !visible.some(item => item.id === id)))} /></th><th className="p-3">Listing</th><th className="p-3">Shop</th>{hasMasters && <th className="p-3">Product Master</th>}<th className="p-3"><span className="sr-only">Actions</span></th></tr></thead><tbody className="divide-y">{visible.map(item => {
      const match = suggestions.get(item.id)!;
      const suggestion = match.product;
      return <tr key={item.id} className="hover:bg-muted/30"><td className="p-4"><Checkbox aria-label={`Select listing ${item.channelSku} from ${item.storeName}`} checked={selected.includes(item.id)} onCheckedChange={checked => setSelected(current => checked ? [...new Set([...current, item.id])] : current.filter(id => id !== item.id))} /></td><td className="p-3"><div className="flex items-center gap-3"><div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-md border bg-muted"><Package className="col-start-1 row-start-1 size-4 text-muted-foreground" />{item.image && <img src={item.image} alt="" className="col-start-1 row-start-1 size-full object-cover" onError={event => { event.currentTarget.style.display = 'none'; }} />}</div><div className="max-w-72"><p className="font-medium">{item.title}</p><p className="mt-1 text-xs text-muted-foreground">{item.channelSku} · {item.variants === 0 ? 'SKU structure not recorded' : `${item.variants} SKU${item.variants === 1 ? '' : 's'}`}</p></div></div></td><td className="p-3"><div className="flex items-center gap-2"><ChannelLogo channel={{ key: item.channel }} /><span><span className="block font-medium">{item.storeName}</span><span className="text-xs capitalize text-muted-foreground">{item.channel}</span></span></div></td>{hasMasters && <td className="p-3"><p className="max-w-56 text-xs">{suggestion?.name || 'No suggestion yet'}</p>{suggestion && <p className="mt-1 text-xs text-muted-foreground">{suggestion.sku_code} · Not confirmed</p>}{match.reason && suggestion && <p className="mt-1 max-w-56 text-xs text-amber-700 dark:text-amber-300">{match.reason}</p>}{match.eligible && <p className="mt-1 text-xs text-muted-foreground">SKU &amp; brand match · Confirm required</p>}</td>}<td className="p-3 text-right"><Button variant="outline" onClick={() => pick(hasMasters ? 'existing' : 'new', [item.id])}>{hasMasters ? suggestion ? 'Review suggestion' : 'Choose Master' : 'Create Master'}</Button></td></tr>;
    })}</tbody></table></div>
    {!visible.length && <div className="p-8 text-center"><p className="font-medium">{items.length ? 'No listings match your search' : 'No listings waiting for confirmation'}</p><p className="mt-2 text-sm text-muted-foreground">{items.length ? 'Try another name, SKU or shop.' : 'Existing confirmed links stay in Product Masters. New imported listings will appear here when available.'}</p>{items.length > 0 && <Button variant="ghost" onClick={() => setQuery('')}>Clear search</Button>}</div>}
    {batchPairs && <SuggestedListingLinksDialog catalog={catalog} pairs={batchPairs} onClose={() => setBatchPairs(null)} onSaved={result => {
      setBatchPairs(null); setSelected([]); onChanged(result.productIds, false); setLastCreated(false); setLastMessage(''); setCreatedMasterId(result.productIds[0] ?? null);
      toast({ title: `${result.linkedCount} listing${result.linkedCount === 1 ? '' : 's'} linked to ${result.masterCount} Master${result.masterCount === 1 ? '' : 's'}`, description: result.reviewSaved ? 'Each listing was linked to its reviewed Master. Master status, details and images are unchanged.' : 'Links were saved, but review history could not be saved. Master status and shop data are unchanged.' });
    }} />}
    </section>
  </div>;
}
