import { useDeferredValue, useRef, useState } from 'react';
import { Link2, Package, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ChannelLogo } from '@/components/channels/ChannelLogo';
import { getProducts } from '@/lib/product-store';
import { getListingSuggestion, snapshotListingMatch, pendingListingReviews } from '@/lib/product-listing-intake';
import { useToast } from '@/hooks/use-toast';
import { SuggestedListingLinksDialog, type SuggestedLinkPreview } from './SuggestedListingLinksDialog';
import { ListingMasterReview, type IntakeStage } from './ListingMasterReview';
import { ListingReviewGuide } from './ListingReviewGuide';

export function ProductListingIntake({ onChanged, onOpenMaster, stayInQueue = false, onStageChange, onDirtyChange, guideActionContainer }: { onChanged: (productIds: string[], created?: boolean) => void; onOpenMaster: (id: string) => void; stayInQueue?: boolean; onStageChange?: (stage: IntakeStage) => void; onDirtyChange?: (dirty: boolean) => void; guideActionContainer?: HTMLElement | null }) {
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [batchPairs, setBatchPairs] = useState<SuggestedLinkPreview[] | null>(null);
  const search = useDeferredValue(query).trim().toLowerCase();
  const [selected, setSelected] = useState<string[]>([]);
  const [mode, setMode] = useState<'existing' | 'new' | null>(null);
  const queueRef = useRef<HTMLElement>(null);
  const returnAction = useRef<{ label: string; index: number } | null>(null);
  const [createdMasterId, setCreatedMasterId] = useState<string | null>(null);
  const [lastCreated, setLastCreated] = useState(false);
  const products = getProducts();
  const items = pendingListingReviews(products);
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
    setSelected(ids); setMode(nextMode);
  };
  const backToQueue = () => {
    setMode(null); onStageChange?.('queue');
    requestAnimationFrame(() => {
      const action = returnAction.current;
      const buttons = Array.from(queueRef.current?.querySelectorAll('button') ?? []);
      const previous = action && buttons.filter(button => button.textContent === action.label)[action.index];
      (previous || queueRef.current?.querySelector('input'))?.focus();
    });
  };
  if (mode) return <ListingMasterReview key={`${mode}:${selected.join('|')}`} listings={selectedItems} initialMode={mode} remainingCount={items.length} onBack={backToQueue} onStageChange={onStageChange} onDirtyChange={onDirtyChange} onSaved={(result, created) => {
      const product = getProducts().find(item => item.id === result.productId);
      backToQueue(); setSelected([]); onChanged([result.productId], created); setLastCreated(created);
      toast({ title: created ? `Active Master created: ${product?.name || 'Product Master'}` : `Listing linked: ${product?.name || 'Product Master'}`, description: result.reviewSaved ? created ? 'New Master is Active. Nothing was published to shops; stock and sync are unchanged.' : 'Link confirmed. Master status, details and images are unchanged.' : 'The link was saved, but review history could not be saved. Shop data was not changed.' });
      if (stayInQueue) setCreatedMasterId(result.productId);
      else onOpenMaster(result.productId);
  }} />;
  return <div className="space-y-3">
    <ListingReviewGuide hasListings={items.length > 0} actionContainer={guideActionContainer} />
    <section ref={queueRef} className="overflow-hidden rounded-xl border bg-card" aria-label="Listings waiting for confirmation">
    {createdMasterId && <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-primary/5 px-4 py-3"><p className="text-sm" role="status">{lastCreated ? 'New Master created and Active.' : 'Listing linked. Master status and details are unchanged.'} You can keep reviewing listings.</p><Button variant="ghost" size="sm" onClick={() => onOpenMaster(createdMasterId)}>View updated Master</Button></div>}
    <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4"><div><h2 className="text-sm font-semibold">{items.length} listing{items.length === 1 ? '' : 's'} to review</h2>{!stayInQueue && <p className="mt-1 text-xs leading-5 text-muted-foreground">Choose a Master for each listing, or select listings for the same product to group them.</p>}</div><Input aria-label="Search shop listings" placeholder="Search listing, SKU, shop…" value={query} onChange={event => { setQuery(event.target.value); setSelected([]); }} className="w-full sm:max-w-80" /></div>
    {selectedItems.length > 0 && <div className="flex flex-wrap items-center gap-2 border-b bg-muted/30 p-3" role="group" aria-label="Selected listing actions">
      <span className="mr-auto text-sm">{selectedItems.length} selected</span>
      <Button variant="outline" onClick={() => pick('existing')}><Link2 className="size-4" />Link to one Master</Button>
      <Button variant="outline" onClick={() => pick('new')}><Plus className="size-4" />Create one Master</Button>
      {eligibleSelected.length === selectedItems.length && <Button onClick={previewSuggestedLinks}>Review suggested links ({eligibleSelected.length})</Button>}
      <Button variant="ghost" onClick={() => setSelected([])}>Clear selection</Button>
    </div>}
    <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead className="border-b bg-muted/20 text-xs text-muted-foreground"><tr><th className="w-12 p-4"><Checkbox aria-label="Select visible shop listings" checked={visible.length > 0 && visible.every(item => selected.includes(item.id))} onCheckedChange={checked => setSelected(current => checked ? [...new Set([...current, ...visible.map(item => item.id)])] : current.filter(id => !visible.some(item => item.id === id)))} /></th><th className="p-3">Listing</th><th className="p-3">Shop</th><th className="p-3">Product Master</th><th className="p-3"><span className="sr-only">Actions</span></th></tr></thead><tbody className="divide-y">{visible.map(item => {
      const match = suggestions.get(item.id)!;
      const suggestion = match.product;
      return <tr key={item.id} className="hover:bg-muted/30"><td className="p-4"><Checkbox aria-label={`Select listing ${item.channelSku} from ${item.storeName}`} checked={selected.includes(item.id)} onCheckedChange={checked => setSelected(current => checked ? [...new Set([...current, item.id])] : current.filter(id => id !== item.id))} /></td><td className="p-3"><div className="flex items-center gap-3"><div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-md border bg-muted"><Package className="col-start-1 row-start-1 size-4 text-muted-foreground" />{item.image && <img src={item.image} alt="" className="col-start-1 row-start-1 size-full object-cover" onError={event => { event.currentTarget.style.display = 'none'; }} />}</div><div className="max-w-72"><p className="font-medium">{item.title}</p><p className="mt-1 text-xs text-muted-foreground">{item.channelSku} · {item.variants === 0 ? 'SKU structure not recorded' : `${item.variants} SKU${item.variants === 1 ? '' : 's'}`}</p></div></div></td><td className="p-3"><div className="flex items-center gap-2"><ChannelLogo channel={{ key: item.channel }} /><span><span className="block capitalize">{item.channel}</span><span className="text-xs text-muted-foreground">{item.storeName}</span></span></div></td><td className="p-3"><p className="max-w-56 text-xs">{suggestion?.name || 'No suggestion yet'}</p>{suggestion && <p className="mt-1 text-xs text-muted-foreground">{suggestion.sku_code} · {item.existingLinkReview ? 'Current link' : 'Not confirmed'}</p>}{match.reason && suggestion && <p className="mt-1 max-w-56 text-xs text-amber-700 dark:text-amber-300">{match.reason}</p>}{match.eligible && <p className="mt-1 text-xs text-muted-foreground">SKU &amp; brand match · Confirm required</p>}</td><td className="p-3 text-right"><Button variant="outline" onClick={() => pick('existing', [item.id])}>{item.existingLinkReview ? 'Review current link' : suggestion ? 'Review suggestion' : 'Choose Master'}</Button></td></tr>;
    })}</tbody></table></div>
    {!visible.length && <div className="p-8 text-center"><p className="font-medium">{items.length ? 'No listings match your search' : 'No listings waiting for confirmation'}</p><p className="mt-2 text-sm text-muted-foreground">{items.length ? 'Try another name, SKU or shop.' : 'Existing confirmed links stay in Product Masters. New imported listings will appear here when available.'}</p>{items.length > 0 && <Button variant="ghost" onClick={() => setQuery('')}>Clear search</Button>}</div>}
    {batchPairs && <SuggestedListingLinksDialog pairs={batchPairs} onClose={() => setBatchPairs(null)} onSaved={result => {
      setBatchPairs(null); setSelected([]); onChanged(result.productIds, false); setLastCreated(false); setCreatedMasterId(result.productIds[0] ?? null);
      toast({ title: `${result.linkedCount} listing${result.linkedCount === 1 ? '' : 's'} linked to ${result.masterCount} Master${result.masterCount === 1 ? '' : 's'}`, description: result.reviewSaved ? 'Each listing was linked to its reviewed Master. Master status, details and images are unchanged.' : 'Links were saved, but review history could not be saved. Master status and shop data are unchanged.' });
    }} />}
    </section>
  </div>;
}
