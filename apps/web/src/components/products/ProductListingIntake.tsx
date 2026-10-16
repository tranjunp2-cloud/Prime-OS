import { useDeferredValue, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { listingSyncReadiness } from '@/lib/listing-sync-readiness';
import { CheckCircle2, Link2, Package, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ListingReviewHelp } from './ListingReviewHelp';
import { ListingReviewResult, type ListingReviewReceipt } from './ListingReviewResult';
import { ChannelLogo } from '@/components/channels/ChannelLogo';
import { savedListingCatalog, type ListingIntakeCatalog } from '@/lib/listing-intake-catalog';
import { getListingSuggestion, pendingListingReviews, unfinishedListingReviews } from '@/lib/product-listing-intake';
import type { CatalogImportItem } from '@/lib/catalog-import-store';
import { useToast } from '@/hooks/use-toast';
import { ListingMasterReview, type IntakeStage } from './ListingMasterReview';
import { ListingReviewGuide } from './ListingReviewGuide';

export function ProductListingIntake({ catalog = savedListingCatalog, onChanged, onOpenMaster, stayInQueue = false, onStageChange, onDirtyChange, guideActionContainer, footerActionContainer, onCloseQueue }: { catalog?: ListingIntakeCatalog; onChanged: (productIds: string[], created?: boolean) => void; onOpenMaster: (id: string) => void; stayInQueue?: boolean; onStageChange?: (stage: IntakeStage) => void; onDirtyChange?: (dirty: boolean) => void; guideActionContainer?: HTMLElement | null; footerActionContainer?: HTMLElement | null; onCloseQueue?: () => void }) {
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const search = useDeferredValue(query).trim().toLowerCase();
  const [selected, setSelected] = useState<string[]>([]);
  const [mode, setMode] = useState<'existing' | 'new' | null>(null);
  const [reviewIds, setReviewIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<'all' | 'quick' | 'check' | 'unmatched'>('all');
  const queueRef = useRef<HTMLElement>(null);
  const queueFooterRef = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
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
  // Group only the current view, by Master identity (never by its name or SKU).
  // Unmatched listings stay independent; hidden listings must not enter a group review.
  const visibleGroups = new Map<string, CatalogImportItem[]>();
  visible.forEach(item => {
    const master = suggestions.get(item.id)?.product;
    const key = master ? `master:${master.id}` : `listing:${item.id}`;
    const group = visibleGroups.get(key);
    if (group) group.push(item);
    else visibleGroups.set(key, [item]);
  });
  const reviewing = resume ?? items.filter(item => reviewIds.includes(item.id));
  const selectedItems = items.filter(item => selected.includes(item.id));
  const hiddenSelected = selectedItems.filter(item => !visible.some(row => row.id === item.id)).length;
  const visibleSelected = visible.filter(item => selected.includes(item.id)).length;
  const queueButtons = () => [...Array.from(queueRef.current?.querySelectorAll('button') ?? []), ...Array.from(queueFooterRef.current?.querySelectorAll('button') ?? [])];
  const pick = (nextMode: 'existing' | 'new', ids = selectedItems.map(item => item.id)) => {
    const active = document.activeElement;
    const label = active?.textContent || '';
    returnAction.current = { label, index: queueButtons().filter(button => button.textContent === label).indexOf(active as HTMLButtonElement) };
    setReviewIds(ids); setResume(null); setMode(nextMode);
  };
  const backToQueue = () => {
    setMode(null); setResume(null); setReviewIds([]); onStageChange?.('queue');
    requestAnimationFrame(() => {
      const action = returnAction.current;
      const buttons = queueButtons();
      const previous = action && buttons.filter(button => button.textContent === action.label)[action.index];
      (previous && !previous.disabled ? previous : queueRef.current?.querySelector('input'))?.focus();
    });
  };
  const resumeReview = (listings: CatalogImportItem[]) => {
    setResume(listings); setReviewIds(listings.map(item => item.id)); setMode('existing');
  };
  if (mode) return <ListingMasterReview catalog={catalog} key={`${mode}:${reviewIds.join('|')}`} listings={reviewing} initialMode={mode} remainingCount={items.length} onBack={backToQueue} onStageChange={onStageChange} onDirtyChange={onDirtyChange} onSaved={(result, created) => {
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
    setReceipt(nextReceipt); setSelected(current => current.filter(id => !savedIds.includes(id)));
    onChanged([result.productId], created);
    toast({ title: result.deferred ? 'Linked · Review unfinished' : `${reviewing.length} listing${reviewing.length === 1 ? '' : 's'} linked`, description: result.reviewSaved ? `${nextReceipt.masterState} Nothing published; sync was not turned on.` : 'Links saved, but review history could not be saved. Do not link again.' });
    backToQueue();
  }} />;
  const resumeReceipt = receipt?.deferred ? unfinished.filter(item => receipt.pairs.some(pair => pair.masterId === item.existingLinkReview?.productId && pair.channel === item.channel && pair.shop === item.storeName && pair.listingId === item.listingId)) : [];
  const queueFooter = (selectedItems.length > 0 || onCloseQueue) && <div ref={queueFooterRef} role="group" aria-label="Listing review footer" className="shrink-0 border-t bg-background p-4 sm:px-6">
    {selectedItems.length > 0 ? <div className="space-y-2" role="group" aria-label="Selected listing actions">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="mr-auto flex min-w-0 flex-wrap items-center gap-2"><span className="text-sm font-semibold" role="status">{selectedItems.length} selected</span>{hiddenSelected > 0 && <span className="text-xs text-muted-foreground">{hiddenSelected} outside this view</span>}<Button variant="ghost" className="h-11 px-2 text-xs text-muted-foreground" onClick={() => {
          setSelected([]);
          requestAnimationFrame(() => (closeButton.current ?? queueRef.current?.querySelector<HTMLElement>('[role="checkbox"]'))?.focus());
        }}>Clear selection</Button></div>
        <div className="grid w-full gap-2 sm:ml-auto sm:flex sm:w-auto sm:flex-wrap">
          <Button variant={hasMasters ? 'outline' : 'default'} className="h-11 w-full whitespace-normal sm:w-auto" onClick={() => pick('new')}><Plus className="size-4 shrink-0" aria-hidden="true" />Create one Master</Button>
          {hasMasters && <Button className="h-11 w-full whitespace-normal sm:w-auto" onClick={() => pick('existing')}><Link2 className="size-4 shrink-0" aria-hidden="true" />Link to one Master</Button>}
        </div>
      </div>
      <p className="text-xs leading-5 text-muted-foreground">{selectedItems.length > 1 ? `All ${selectedItems.length} selected listings will use one Master. Select only listings of the same product.` : hasMasters ? 'Link this listing to an existing Master, or create a new one.' : 'Create a Master using this listing’s data.'} Review before saving.</p>
    </div> : <div className="flex items-center justify-between gap-3">
      <p className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground" role="status">
        {!items.length && !unfinished.length && <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />}
        <span>{unfinished.length ? `${items.length} unlinked · ${unfinished.length} linked review${unfinished.length === 1 ? '' : 's'} unfinished` : items.length ? `${items.length} listing${items.length === 1 ? '' : 's'} left to review` : 'All listings reviewed'}</span>
      </p>
      <Button ref={closeButton} variant="outline" className="h-11 shrink-0" onClick={onCloseQueue}>Close</Button>
    </div>}
  </div>;
  return <><div className="space-y-3">
    {hasMasters && <ListingReviewGuide hasListings={items.length > 0} actionContainer={guideActionContainer} />}
    {receipt && <ListingReviewResult receipt={receipt} onOpenMaster={catalog.preview ? undefined : onOpenMaster} onContinue={resumeReceipt.length && new Set(resumeReceipt.map(item => item.existingLinkReview?.productId)).size === 1 ? () => resumeReview(resumeReceipt) : undefined} />}
    {!hasMasters && <div className="rounded-lg border bg-primary/5 p-4"><h2 className="text-sm font-semibold">Create your first Product Masters</h2><p className="mt-1 text-sm text-muted-foreground">Use data already imported from your shops. Open a listing to review it, or select listings of the same product to create one Master.</p></div>}
    {unfinished.length > 0 && <section aria-label="Linked listings to finish" className="overflow-hidden rounded-xl border bg-card"><div className="border-b p-4"><h2 className="text-sm font-semibold">Linked · {unfinished.length} review{unfinished.length === 1 ? '' : 's'} unfinished</h2><p className="mt-1 text-xs text-muted-foreground">Continue where you left off. Unconfirmed SKU mappings cannot be used for price or stock sync.</p></div><ul className="max-h-56 divide-y overflow-y-auto">{unfinished.map(item => <li key={item.id} className="flex flex-wrap items-center gap-3 p-4"><ChannelLogo channel={{ key: item.channel }} /><div className="min-w-0 flex-1"><p className="text-sm font-medium">{item.title}</p><p className="mt-1 text-xs text-muted-foreground">{item.storeName} · {products.find(product => product.id === item.existingLinkReview?.productId)?.name}</p><p className="mt-1 text-xs text-amber-700 dark:text-amber-300">{item.existingLinkReview?.issues.join(' · ')}</p></div><Button variant="outline" className="h-11" onClick={() => { resumeReview([item]); }}>Continue review</Button></li>)}</ul></section>}
    <section ref={queueRef} className="overflow-hidden rounded-xl border bg-card" aria-label="Listings waiting for confirmation">

    <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4"><div><h2 className="text-sm font-semibold">{items.length} listing{items.length === 1 ? '' : 's'} to review</h2>{!stayInQueue && <p className="mt-1 text-xs leading-5 text-muted-foreground">Choose a Master for each listing, or select listings for the same product to group them.</p>}</div><Input aria-label="Search shop listings" placeholder="Search listing, SKU, shop…" value={query} onChange={event => setQuery(event.target.value)} className="w-full sm:max-w-80" /></div>
    {hasMasters && <div role="group" aria-label="Listing review filters" className="flex flex-wrap items-center gap-x-1 border-b px-3">{([{ id: 'all', label: 'All' }, { id: 'quick', label: 'Quick review' }, { id: 'check', label: 'Needs review' }, { id: 'unmatched', label: 'No suggestion' }] as const).map(tab => <button key={tab.id} type="button" aria-pressed={filter === tab.id} onClick={() => setFilter(tab.id)} className={`inline-flex min-h-11 items-center gap-2 border-b-2 px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${filter === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>{tab.label}<span className="tabular-nums text-muted-foreground">{tab.id === 'all' ? items.length : items.filter(item => category(item) === tab.id).length}</span></button>)}<ListingReviewHelp label="Review filters">Quick review contains suggestions that need fewer checks. Review and confirm them in the table. Needs review requires a closer product or SKU check. No suggestion means you can choose an existing Master or create a new one. Suggestions are never saved links.</ListingReviewHelp></div>}
    <div className="overflow-x-auto">
      <table aria-label="Shop listings and suggested Masters" className="w-full min-w-[720px] table-fixed text-left text-sm">
        <colgroup><col className="w-12" /><col className="w-[40%]" /><col className="w-[24%]" /><col /></colgroup>
        <thead className="border-b bg-muted/20 text-xs text-muted-foreground"><tr>
          <th scope="col" className="p-4"><Checkbox aria-label="Select visible shop listings" checked={visibleSelected > 0 && visibleSelected < visible.length ? 'indeterminate' : visible.length > 0 && visibleSelected === visible.length} onCheckedChange={checked => setSelected(current => checked ? [...new Set([...current, ...visible.map(item => item.id)])] : current.filter(id => !visible.some(item => item.id === id)))} /></th>
          <th scope="col" className="p-3">Listing</th>
          <th scope="col" className="p-3">Shop</th>
          <th scope="col" className="p-3">{hasMasters ? 'Product Master' : <span className="sr-only">Actions</span>}</th>
        </tr></thead>
        {Array.from(visibleGroups, ([key, group]) => {
          const suggestion = suggestions.get(group[0].id)?.product;
          const shared = group.length > 1;
          return <tbody key={key} className="border-b last:border-b-0">
            {group.map((item, index) => {
              const match = suggestions.get(item.id)!;
              const reason = shared ? match.reason?.replace(' — review individually', '').replace('Check this suggestion individually', 'Check this suggestion') : match.reason;
              return <tr key={item.id} className={index > 0 ? 'border-t' : undefined}>
                <td className={`p-4 ${selected.includes(item.id) ? 'bg-primary/[0.04]' : ''}`}>
                  <Checkbox aria-label={`Select listing ${item.channelSku} from ${item.storeName}`} checked={selected.includes(item.id)} onCheckedChange={checked => setSelected(current => checked ? [...new Set([...current, item.id])] : current.filter(id => id !== item.id))} />
                </td>
                <td className={`p-3 ${selected.includes(item.id) ? 'bg-primary/[0.04]' : ''}`}>
                  <div className="flex items-start gap-3">
                    <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-md border bg-muted">
                      <Package className="col-start-1 row-start-1 size-4 text-muted-foreground" aria-hidden="true" />
                      {(item.image || item.images?.[0]) && <img src={item.image || item.images?.[0]} alt="" className="col-start-1 row-start-1 size-full object-cover" onError={event => { event.currentTarget.style.display = 'none'; }} />}
                    </div>
                    <div className="min-w-0 break-words">
                      <p className="font-medium">{item.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.channelSku} · {item.variants === 0 ? 'SKU structure not recorded' : `${item.variants} SKU${item.variants === 1 ? '' : 's'}`}</p>
                      {reason && suggestion && <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">{reason}</p>}
                      {match.eligible && <p className="mt-1 text-xs text-muted-foreground">SKU &amp; brand match · Confirm required</p>}
                    </div>
                  </div>
                </td>
                <td className={`p-3 ${selected.includes(item.id) ? 'bg-primary/[0.04]' : ''}`}>
                  <div className="flex items-center gap-2"><ChannelLogo channel={{ key: item.channel }} /><span className="min-w-0 break-words"><span className="block font-medium">{item.storeName}</span><span className="text-xs capitalize text-muted-foreground">{item.channel}</span></span></div>
                </td>
                {index === 0 && <td rowSpan={group.length} className={`break-words border-l p-4 align-middle ${shared ? 'bg-primary/[0.04]' : ''}`}>
                  {shared && <p className="mb-2 text-xs font-medium text-muted-foreground">Suggested for {group.length} listings</p>}
                  {hasMasters && <>
                    <p className="font-medium">{suggestion?.name || 'No suggestion yet'}</p>
                    {suggestion && <p className="mt-1 text-xs text-muted-foreground">{suggestion.sku_code} · Not confirmed</p>}
                  </>}
                  <Button variant="outline" className={`min-h-11 h-auto max-w-full whitespace-normal text-left ${hasMasters ? 'mt-3' : ''}`} disabled={selectedItems.length > 0} title={selectedItems.length ? 'Use the selected listing actions below, or clear selection to review this suggestion.' : undefined} onClick={() => {
                    pick(hasMasters ? 'existing' : 'new', group.map(listing => listing.id));
                  }}>{hasMasters ? suggestion ? shared ? `Review ${group.length} listings` : 'Review suggestion' : 'Choose Master' : 'Create Master'}</Button>
                </td>}
              </tr>;
            })}
          </tbody>;
        })}
      </table>
    </div>
    {!visible.length && <div className="p-8 text-center"><p className="font-medium">{items.length ? 'No listings match your search' : 'No listings waiting for confirmation'}</p><p className="mt-2 text-sm text-muted-foreground">{items.length ? 'Try another name, SKU, shop or review filter.' : 'Existing confirmed links stay in Product Masters. New imported listings will appear here when available.'}</p>{items.length > 0 && <Button variant="ghost" onClick={() => { setQuery(''); setFilter('all'); }}>Clear search</Button>}</div>}
    </section>
  </div>{queueFooter && (footerActionContainer ? createPortal(queueFooter, footerActionContainer) : queueFooter)}</>;
}
