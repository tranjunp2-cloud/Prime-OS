import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CircleHelp, ExternalLink, Info, Package, Plus, Search, TriangleAlert, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ChannelLogo } from '@/components/channels/ChannelLogo';
import type { CatalogImportItem } from '@/lib/catalog-import-store';
import { getProducts, type Product } from '@/lib/product-store';
import { confirmListingIntake, intakeSku, snapshotListingMatch, snapshotListingSource, suggestedListingBrandId } from '@/lib/product-listing-intake';
import { evidenceSummary, groupEvidenceSummary, listingMatchEvidence, packTitleHint, rankMasterCandidates, safeListingUrl, suggestedMasterForReview, type EvidenceState } from '@/lib/listing-match-evidence';
import { ListingMasterDraftFields, type ListingMasterDraftValues } from './ListingMasterDraftFields';
import { SelectedListingsOverview } from './SelectedListingsOverview';

import { ListingMasterCompletion } from './ListingMasterCompletion';
import { ListingSkuMappings } from './ListingSkuMappings';
import { assertMasterComplete, completionFields, newListingMasterPreview, prepareMasterCompletion, variantMappingError, type VariantMappings } from '@/lib/listing-master-completion';

export type IntakeStage = 'queue' | 'choose' | 'compare' | 'create' | 'complete';
type Props = {
  listings: CatalogImportItem[];
  initialMode: 'existing' | 'new';
  onBack: () => void;
  remainingCount?: number;
  onStageChange?: (stage: IntakeStage) => void;
  onDirtyChange?: (dirty: boolean) => void;
  onSaved: (result: ReturnType<typeof confirmListingIntake>, created: boolean) => void;
};

function Photo({ src, name, onZoom, small = false }: { src?: string; name: string; onZoom?: (src: string, name: string) => void; small?: boolean }) {
  const [failedSrc, setFailedSrc] = useState<string>();
  const visible = src && failedSrc !== src;
  const content = visible ? <img src={src} alt={name} className="size-full object-contain" onError={() => setFailedSrc(src)} /> : <span className="flex flex-col items-center gap-1 text-muted-foreground"><Package className="size-5" />{!small && <span className="text-[10px]">No image</span>}</span>;
  const style = `${small ? 'size-14' : 'size-20'} relative grid shrink-0 place-items-center overflow-hidden rounded-lg border bg-muted/30`;
  return visible && onZoom ? <button type="button" aria-label={`Enlarge image of ${name}`} className={`${style} group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`} onClick={() => onZoom(src, name)}>{content}<ZoomIn className="absolute bottom-1 right-1 size-4 rounded bg-background text-foreground" /></button> : <div className={style}>{content}</div>;
}

const evidenceStyles: Record<EvidenceState, { label: string; className: string; Icon: typeof Check }> = {
  match: { label: 'Matches', className: 'text-emerald-700 dark:text-emerald-300', Icon: Check },
  different: { label: 'Differs', className: 'text-amber-700 dark:text-amber-300', Icon: TriangleAlert },
  missing: { label: 'Missing data', className: 'text-muted-foreground', Icon: CircleHelp },
  check: { label: 'SKU review needed', className: 'text-amber-700 dark:text-amber-300', Icon: TriangleAlert },
};

export function ListingMasterReview({ listings, initialMode, onBack, remainingCount, onStageChange, onDirtyChange, onSaved }: Props) {
  // Keep reviewed values stable while the seller is comparing. Saving checks a fresh snapshot.
  const [sources] = useState(() => structuredClone(listings));
  const [mode, setMode] = useState(initialMode);
  // Only initialize once: choosing another Master must not reapply the suggestion.
  const [master, setMaster] = useState<Product | null>(() => initialMode === 'existing'
    ? structuredClone(suggestedMasterForReview(sources, getProducts())) : null);
  const [query, setQuery] = useState('');
  const [sourceIndex, setSourceIndex] = useState(0);
  const [reviewedIds, setReviewedIds] = useState<string[]>([]);
  const [sourceId, setSourceId] = useState(sources[0]?.id || '');
  const [draft, setDraft] = useState<ListingMasterDraftValues>(() => ({
    name: sources[0]?.title || '', sku: intakeSku(), productType: sources[0]?.variants > 1 ? 'variant' : 'single',
    categoryId: '', brandId: sources[0] ? suggestedListingBrandId(sources[0]) : '', copySourcePrice: false,
  }));
  const [acknowledged, setAcknowledged] = useState(false);
  const [verifiedSingles, setVerifiedSingles] = useState<string[]>([]);
  const [verifiedStructure, setVerifiedStructure] = useState(false);
  const [error, setError] = useState('');
  const [completion, setCompletion] = useState<Product | null>(null);
  const [completing, setCompleting] = useState(false);
  const [mediaReady, setMediaReady] = useState(false);
  const [mappings, setMappings] = useState<VariantMappings>({});
  const [dirty, setDirty] = useState(false);
  const [discardBack, setDiscardBack] = useState(false);
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => () => { onDirtyChange?.(false); }, [onDirtyChange]);
  const [zoom, setZoom] = useState<{ src: string; name: string } | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const masterSearch = useRef<HTMLInputElement>(null);
  const scrollArea = useRef<HTMLDivElement>(null);
  const saveLock = useRef(false);
  const stage: IntakeStage = completing ? 'complete' : mode === 'new' ? 'create' : master ? 'compare' : 'choose';
  const isSuggestedMaster = Boolean(master && sources.every(item => item.suggestedProductId === master.id));
  useEffect(() => {
    onStageChange?.(stage);
    if (stage === 'choose') masterSearch.current?.focus();
    else heading.current?.focus();
    if (scrollArea.current) scrollArea.current.scrollTop = 0;
  }, [stage, onStageChange]);
  const current = sources[sourceIndex];
  const candidates = rankMasterCandidates(sources, getProducts(), query);
  const compareRows = master && current ? listingMatchEvidence(current, master) : [];
  const differences = compareRows.filter(row => row.state === 'different');
  const missing = compareRows.filter(row => row.state === 'missing');
  const matches = compareRows.filter(row => row.state === 'match');
  const blocked = Boolean(master && [current].some(item => (item.variants === 0 && !verifiedSingles.includes(item.id))
    || (item.variants > 1 && !master.has_variants && master.product_type !== 'variant')));
  const unknownStructure = sources.some(item => item.variants === 0);
  const existingLinks = sources.filter(item => item.existingLinkReview);
  const newBlocked = sources.length > 1 && (sources.some(item => item.variants > 1) || (mode === 'new' && draft.productType === 'variant'));
  const reviewedCount = reviewedIds.length;
  const mappingError = master ? variantMappingError([current], master, mappings, verifiedSingles) : '';
  const canSave = mode === 'new' ? (sources.length === 1 || acknowledged) && (!unknownStructure || verifiedStructure) && draft.name.trim().length >= 3 && Boolean(draft.sku.trim()) && !newBlocked : Boolean(master) && !blocked && !mappingError;
  let completionError = '';
  if (completion) {
    try { assertMasterComplete(completion, sources); }
    catch (reason) { completionError = reason instanceof Error ? reason.message : 'Complete required details.'; }
    completionError ||= variantMappingError(sources, completion, mappings, mode === 'new' && verifiedStructure ? sources.map(item => item.id) : verifiedSingles);
  }
  const title = stage === 'complete' ? 'Complete Product Master' : stage === 'create' ? 'Create one Master' : stage === 'compare' ? 'Compare product details' : 'Find a Product Master';
  const openImage = (src: string, imageName: string) => setZoom({ src, name: imageName });
  const resetReview = () => { setCompletion(null); setCompleting(false); setMediaReady(false); setMappings({}); setReviewedIds([]); setVerifiedSingles([]); setVerifiedStructure(false); setError(''); };
  const chooseAnother = () => { setMode('existing'); setMaster(null); resetReview(); setAcknowledged(false); };
  const useExistingMaster = () => {
    // Return to the finder, not the queue or the previous suggested comparison.
    // Keep the source listings and unsaved draft fields in this review session.
    setQuery(''); chooseAnother();
  };
  const createNewMaster = () => {
    setMode('new'); setMaster(null); resetReview(); setAcknowledged(false);
    setSourceIndex(Math.max(0, sources.findIndex(item => item.id === sourceId)));
  };
  const changeDraftSource = (id: string) => {
    const index = sources.findIndex(item => item.id === id);
    if (index < 0) return;
    const source = sources[index];
    setSourceId(id); setSourceIndex(index); setAcknowledged(false); setVerifiedStructure(false); setError(''); setCompletion(null);
    setDraft(previous => ({ ...previous, name: source.title, productType: source.variants > 1 ? 'variant' : 'single', brandId: suggestedListingBrandId(source), copySourcePrice: false }));
  };
  const compare = (product: Product) => { setMaster(structuredClone(product)); resetReview(); setSourceIndex(0); };
  const changeSource = (index: number) => {
    setSourceIndex(index); setError('');
    if (scrollArea.current) scrollArea.current.scrollTop = 0;
    heading.current?.focus();
  };
  const save = () => {
    if (!canSave || saveLock.current) return;
    if (mode === 'existing') {
      const accepted = [...new Set([...reviewedIds, current.id])];
      setReviewedIds(accepted);
      if (accepted.length < sources.length) {
        changeSource(sources.findIndex(item => !accepted.includes(item.id)));
        return;
      }
    }
    if (!completing && mode === 'new') {
      setCompletion(previous => previous ?? prepareMasterCompletion(newListingMasterPreview(sources.find(item => item.id === sourceId)!, draft), sources));
      setCompleting(true); setError(''); setMediaReady(false);
      return;
    }
    if (mode === 'new' && (!completion || completionError || !mediaReady)) return;
    saveLock.current = true;
    try {
      const result = confirmListingIntake(sources.map(item => item.id), mode === 'new' ? { ...draft, completion: completionFields(completion!), variantMappings: mappings, sourceId, verifiedSourceStructure: verifiedStructure, reviewedSources: sources.map(snapshotListingSource) } : { productId: master!.id, variantMappings: mappings, verifiedSingleListingIds: verifiedSingles, reviewed: sources.map(item => snapshotListingMatch(item, master!)) });
      setDirty(false); onDirtyChange?.(false);
      onSaved(result, mode === 'new');
    } catch (reason) {
      saveLock.current = false;
      setError(reason instanceof Error ? reason.message : 'Could not save. Try again.');
    }
  };
  const sourceCard = (item: CatalogImportItem) => {
    const href = safeListingUrl(item.listingUrl);
    if (stage !== 'compare') return <div className="flex min-w-0 items-center gap-3">
      <Photo src={item.image || item.images?.[0]} name={item.title} onZoom={openImage} small />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
          <p className="min-w-0 break-words text-sm font-semibold leading-5">{item.title}</p>
          <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground"><ChannelLogo channel={{ key: item.channel }} /><span className="break-words"><span className="capitalize">{item.channel}</span> · {item.storeName}</span></div>
        </div>
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span>Source listing</span><span aria-hidden="true">·</span><span className="min-w-0 break-all font-mono">{item.channelSku}</span><span aria-hidden="true">·</span><span className="min-w-0 break-words">{item.brand || 'Brand not provided'} · {item.variants === 0 ? 'SKU structure not recorded' : item.variants === 1 ? 'Single product' : `${item.variants} SKUs`}</span>
          {href && <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-8 items-center gap-1 underline underline-offset-4">Open source listing <ExternalLink className="size-3" /></a>}
        </div>
      </div>
    </div>;
    return <div className="flex min-w-0 items-start gap-4">
      <Photo src={item.image || item.images?.[0]} name={item.title} onZoom={openImage} small={stage === 'compare'} />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><ChannelLogo channel={{ key: item.channel }} /><span className="capitalize">{item.channel}</span><span>· {item.storeName}</span></div>
        <p className="break-words text-sm font-semibold leading-5">{item.title}</p>
        <p className="break-words font-mono text-xs text-muted-foreground">{item.channelSku}</p>
        <p className="text-xs text-muted-foreground">{item.brand || 'Brand not provided'} · {item.variants === 0 ? 'SKU structure not recorded' : item.variants === 1 ? 'Single product' : `${item.variants} SKUs`}</p>
        {href && <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-8 items-center gap-1 text-xs underline underline-offset-4">Open source listing <ExternalLink className="size-3" /></a>}
      </div>
    </div>;
  };

  return <section aria-label={title} className="flex h-full min-h-0 flex-col">
    <h2 ref={heading} tabIndex={-1} className="sr-only">{title}</h2>
    <div ref={scrollArea} className={`min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 ${stage === 'choose' ? 'space-y-4' : 'space-y-6'}`}>
      <Button variant="ghost" className="-ml-3 h-11" onClick={() => dirty ? setDiscardBack(true) : onBack()}><ArrowLeft className="size-4" />Back to listings</Button>
      {stage !== 'complete' && existingLinks.length > 0 && <div className="space-y-1 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs leading-5" role="note"><p className="font-medium">Review an existing link</p><p>{[...new Set(existingLinks.flatMap(item => item.existingLinkReview!.issues))].join(' · ')}</p><p className="text-muted-foreground">The current link is unchanged until you confirm. Choosing another Master or creating a new Master moves only the selected links; Master stock is not transferred.</p></div>}

      {sources.length > 1 && (stage === 'choose' || stage === 'compare') && <SelectedListingsOverview listings={sources} activeIndex={stage === 'compare' ? sourceIndex : undefined} reviewedIds={reviewedIds} onView={stage === 'compare' ? changeSource : undefined} />}

      {current && stage !== 'complete' && !(stage === 'choose' && sources.length > 1) && <div className={master && mode === 'existing' ? 'grid gap-5 sm:grid-cols-2' : ''}>
        <div role="group" aria-label="Source listing" className={`min-w-0 rounded-xl border bg-muted/20 ${stage !== 'compare' ? 'p-3' : 'p-4'}`}>{stage === 'compare' && <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Source listing</p>}{sourceCard(current)}</div>
        {master && mode === 'existing' && <div className="min-w-0 rounded-xl border border-primary/40 bg-primary/5 p-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs"><p className="font-medium uppercase tracking-wide text-muted-foreground">{current.existingLinkReview?.productId === master.id ? 'Current Product Master' : isSuggestedMaster ? 'Suggested Product Master' : 'Selected Product Master'}</p><span className="text-muted-foreground">{current.existingLinkReview?.productId === master.id ? 'Existing link · review required' : 'Not confirmed'}</span></div><div className="flex items-start gap-4"><Photo src={master.images[0]} name={master.name} onZoom={openImage} small /><div className="min-w-0 space-y-1.5"><p className="break-words text-sm font-semibold leading-5">{master.name}</p><p className="break-words font-mono text-xs text-muted-foreground">{master.sku_code}</p><p className="text-xs text-muted-foreground">{master.brand || 'Brand not provided'}</p><p className="text-xs text-muted-foreground">{master.category || 'No category'} · Master {master.status === 'published' ? 'Active' : 'Draft'}</p></div></div></div>}
      </div>}

      {stage === 'choose' && <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end" role="group" aria-label="Find or create a Master">
          <div className="min-w-0 flex-1 space-y-2">
            <Label htmlFor="compare-master-search">Find a Product Master</Label>
            <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input ref={masterSearch} id="compare-master-search" aria-label="Search by product name, SKU or brand" className="h-11 pl-9" placeholder="Name, SKU or brand…" value={query} onChange={event => setQuery(event.target.value)} /></div>
          </div>
          <Button variant="outline" className="h-11 shrink-0" onClick={createNewMaster}><Plus className="size-4" />Create new Master</Button>
        </div>
        <div className="space-y-2" aria-label="Master candidates">
          {candidates.map(product => {
            const summary = evidenceSummary(current, product);
            const group = sources.length > 1 ? groupEvidenceSummary(sources, product) : null;
            return <button key={product.id} type="button" aria-label={`Compare with ${product.name}`} className="flex w-full items-center gap-4 rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/60 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => compare(product)}>
              <Photo src={product.images[0]} name={product.name} small />
              <span className="min-w-0 flex-1"><span className="block text-sm font-semibold leading-5">{product.name}</span><span className="mt-1 block break-words text-xs text-muted-foreground">{product.sku_code} · {product.brand || 'Brand not provided'} · {product.has_variants || product.product_type === 'variant' ? `${product.skus.length} variant SKUs` : 'Single product'}</span><span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                {group ? <>
                  {group.skuMatches > 0 && <span className="text-emerald-700 dark:text-emerald-300">SKU matches {group.skuMatches}/{sources.length} listings</span>}
                  {group.withDifferences > 0 && <span className="text-amber-700 dark:text-amber-300">Differences in {group.withDifferences}/{sources.length} listings</span>}
                  {group.withVariants > 0 ? <span className="text-amber-700 dark:text-amber-300">SKU review for {group.withVariants}/{sources.length} listings</span> : <span className="text-muted-foreground">{group.withMissingData ? `Missing data in ${group.withMissingData}/${sources.length} listings` : 'Review each listing before linking'}</span>}
                </> : <>
                  {summary.matches.length > 0 && <span className="text-emerald-700 dark:text-emerald-300">{summary.matches.map(row => row.label).join(' & ')} match</span>}
                  {summary.differences.length > 0 && <span className="text-amber-700 dark:text-amber-300">{summary.differences.map(row => row.label).join(', ')} {summary.differences.length === 1 ? 'differs' : 'differ'}</span>}
                  {summary.variants ? <span className="text-amber-700 dark:text-amber-300">Variant-SKU review required</span> : <span className="text-muted-foreground">{summary.missing.length ? `${summary.missing.length} identity fields missing` : 'Review all details before linking'}</span>}
                </>}
              </span></span><span className="flex shrink-0 items-center gap-1 text-xs"><span className="hidden sm:inline">Compare</span><ArrowRight className="size-4" /></span>
            </button>;
          })}
          {!candidates.length && <div className="rounded-xl border border-dashed p-8 text-center"><p className="text-sm font-medium">No Master found</p><p className="mt-2 text-sm text-muted-foreground">Try a different name or SKU, or create a new Master.</p><Button variant="ghost" onClick={() => setQuery('')}>Clear search</Button></div>}
        </div>
      </div>}

      {stage === 'compare' && master && <>
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Check before linking</h3>
          {current.variants === 0 && <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm leading-6"><Checkbox className="mt-1 shrink-0" checked={verifiedSingles.includes(current.id)} onCheckedChange={checked => { setVerifiedSingles(ids => checked === true ? [...ids, current.id] : ids.filter(id => id !== current.id)); setReviewedIds([]); }} /><span>Source structure is not recorded. I checked the shop listing: its product, pack quantity and SKU structure match this Master. I will map any variant SKUs below.</span></label>}
          {differences.length > 0 && <div className="space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4" role="group" aria-label="Differences to check">
            {differences.map(row => <div key={row.key} className="flex items-start gap-2.5 text-sm"><TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-300" /><div className="min-w-0"><p className="font-medium text-amber-700 dark:text-amber-300">{row.label} differs</p><p className="mt-1 break-words text-muted-foreground">Listing: <span className="text-foreground">{row.listing}</span><span className="mx-2">·</span>Master: <span className="text-foreground">{row.master}</span></p>{row.note && <p className="mt-1 text-xs text-muted-foreground">{row.note}</p>}</div></div>)}
          </div>}
          <div className="space-y-2 text-xs leading-5">
            {matches.length > 0 && <p className="flex items-start gap-2 text-emerald-700 dark:text-emerald-300"><Check className="mt-0.5 size-4 shrink-0" /><span>Matches: {matches.map(row => row.label).join(', ')}.</span></p>}
            {missing.length > 0 && <p className="flex items-start gap-2 text-muted-foreground"><CircleHelp className="mt-0.5 size-4 shrink-0" /><span>{missing.length} fields unverified: {missing.map(row => row.label).join(', ')}. Check the source before linking; missing data is not a match.</span></p>}
          </div>
          <details key={`${current.id}:${master.id}`} className="group/details border-t pt-1">
            <summary className="cursor-pointer py-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">View all {compareRows.length} comparison fields</summary>
          <div role="table" aria-label="Product identity comparison" className="overflow-hidden rounded-xl border">
            <div role="row" className="hidden grid-cols-[1fr_1.25fr_1.25fr_1fr] gap-4 border-b bg-muted/40 px-4 py-3 text-xs font-medium text-muted-foreground sm:grid"><span role="columnheader">Field</span><span role="columnheader">Source listing</span><span role="columnheader">Product Master</span><span role="columnheader">Result</span></div>
            {compareRows.map(row => {
              const state = evidenceStyles[row.state];
              return <div key={row.key} role="row" className="grid grid-cols-2 gap-3 border-b px-4 py-3 text-sm last:border-0 sm:grid-cols-[1fr_1.25fr_1.25fr_1fr] sm:gap-4">
                <span role="rowheader" className="col-span-2 text-xs font-medium sm:col-span-1">{row.label}</span>
                <span role="cell" className="min-w-0 break-words"><span className="mb-1 block text-[10px] text-muted-foreground sm:hidden">Source listing</span><span className={!row.listing ? 'text-muted-foreground' : ''}>{row.listing || 'Not provided'}</span>{row.key === 'pack' && !row.listing && packTitleHint(current.title) && <span className="mt-1 block text-xs text-muted-foreground">{packTitleHint(current.title)}</span>}</span>
                <span role="cell" className="min-w-0 break-words"><span className="mb-1 block text-[10px] text-muted-foreground sm:hidden">Product Master</span><span className={!row.master ? 'text-muted-foreground' : ''}>{row.master || 'Not recorded'}</span>{row.key === 'pack' && !row.master && packTitleHint(master.name) && <span className="mt-1 block text-xs text-muted-foreground">{packTitleHint(master.name)}</span>}</span>
                <span role="cell" className="col-span-2 text-xs sm:col-span-1"><span className={`flex items-start gap-1.5 ${state.className}`}><state.Icon className="mt-0.5 size-3.5 shrink-0" />{state.label}</span>{row.note && <span className="mt-1.5 block leading-5 text-muted-foreground">{row.note}</span>}</span>
              </div>;
            })}
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-4 rounded-lg bg-muted/20 p-4 text-xs"><div><dt className="font-medium">Source category &amp; price</dt><dd className="mt-2 text-muted-foreground">{current.channelCategory || 'No category'}<br />{Number.isFinite(current.price) ? `${current.price.toLocaleString()} ${current.currency}` : 'Price not recorded'}</dd></div><div><dt className="font-medium">Master category &amp; price</dt><dd className="mt-2 text-muted-foreground">{master.category || 'No category'}<br />{master.retail_price.toLocaleString()} {master.price_currency}</dd></div></dl><p className="mt-2 text-xs text-muted-foreground">Price, stock and marketplace categories can differ; they do not establish product identity.</p>
          </details>
        </div>
        {blocked && <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4"><p className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-300"><TriangleAlert className="size-4" />{unknownStructure ? 'Verify source structure before linking' : 'Variant-SKU matching is required'}</p><p className="mt-2 text-sm leading-6 text-muted-foreground">Source SKU data is incomplete. Verify a single-SKU listing above, or create a separate Master to prepare its variants.</p>{newBlocked && <p className="mt-2 text-xs text-muted-foreground">Back to listings → select one variant listing at a time to create a Master.</p>}</div>}
      </>}

      {stage === 'compare' && master && (master.has_variants || master.product_type === 'variant') && <ListingSkuMappings product={master} sources={[current]} mappings={mappings} onChange={value => { setMappings(value); setDirty(true); setError(''); }} />}
      {stage === 'compare' && !blocked && mappingError && <p role="status" className="text-sm text-amber-700 dark:text-amber-300">{mappingError}</p>}
      {stage === 'complete' && completion && <ListingMasterCompletion product={completion} sources={sources} onChange={product => { setCompletion(product); setDirty(true); setError(''); }} mappings={mappings} onMappingsChange={value => { setMappings(value); setDirty(true); }} onMediaReady={setMediaReady} />}
      {stage === 'create' && <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-sm font-semibold">Create an active Product Master</h3><Button variant="outline" className="h-11" onClick={useExistingMaster}><ArrowLeft className="size-4" aria-hidden="true" />Use existing Master</Button></div>
        {sources.length > 1 && <div className="space-y-2"><Label htmlFor="intake-source">Use product data from</Label><select id="intake-source" className="h-11 w-full rounded-md border bg-background px-3 text-sm" value={sourceId} onChange={event => changeDraftSource(event.target.value)}>{sources.map(item => <option key={item.id} value={item.id}>{item.channel} · {item.storeName} · {item.channelSku}</option>)}</select></div>}
        {current && <ListingMasterDraftFields source={current} groupSize={sources.length} value={draft} onChange={value => { setDraft(value); setDirty(true); setCompletion(null); setAcknowledged(false); setVerifiedStructure(false); setError(''); }} />}
        {unknownStructure && <label className="flex cursor-pointer items-start gap-3 text-sm leading-6"><Checkbox className="mt-1 shrink-0" checked={verifiedStructure} onCheckedChange={checked => setVerifiedStructure(checked === true)} />Source structure is not recorded. I checked the shop listing(s) and selected the correct product structure above.</label>}
        {sources.length > 1 && <div className="space-y-2"><h3 className="text-sm font-semibold">Listings to group into this Master</h3>{sources.map(item => <p key={item.id} className="border-b py-2 text-sm last:border-0">{item.title}<span className="mt-1 block text-xs text-muted-foreground">{item.storeName} · {item.channelSku} · {item.brand || 'Brand not provided'}</span></p>)}</div>}
        {newBlocked ? <p role="alert" className="text-sm text-amber-700 dark:text-amber-300">Import variant listings separately first. Go back and select one source listing to prepare its SKU details.</p> : sources.length > 1 && <label className="flex cursor-pointer items-start gap-3 text-sm leading-6"><Checkbox checked={acknowledged} onCheckedChange={checked => setAcknowledged(checked === true)} className="mt-1 shrink-0" />I checked that the selected listings represent this product, including model and pack size.</label>}
      </div>}
    </div>
    <div role="group" aria-label="Review actions" className="max-h-[55dvh] shrink-0 space-y-3 overflow-y-auto border-t bg-background px-4 py-4 sm:px-6">
      {stage === 'complete' && (completionError || !mediaReady) && <p className="text-xs leading-5 text-amber-700 dark:text-amber-300" role="status">{completionError || 'Wait for images to load, or replace any unavailable images.'}</p>}
      {error && <p role="alert" className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs leading-5 text-muted-foreground"><p className="flex items-start gap-2"><Info className="mt-0.5 size-3.5 shrink-0" />{mode === 'new' ? 'New Masters become Active after required details are complete. Nothing is published to shops.' : 'Link only. Master status, details and images stay unchanged. Nothing is published; stock and sync are unchanged.'}</p><span role="status">{stage === 'compare' && sources.length > 1 ? `${reviewedCount} of ${sources.length} listings reviewed` : remainingCount !== undefined ? `${remainingCount} listing${remainingCount === 1 ? '' : 's'} left to review` : `${sources.length} listing${sources.length === 1 ? '' : 's'} selected`}</span></div>
      {stage !== 'choose' && <div className="flex flex-wrap justify-end gap-2">
        {stage === 'compare' && <><Button variant="outline" className="h-11" onClick={chooseAnother}>Choose another Master</Button><Button variant="outline" className="h-11" disabled={newBlocked} onClick={createNewMaster}><Plus className="size-4" />Create new Master</Button></>}
        {stage === 'complete' && <Button variant="outline" className="h-11" onClick={() => { setCompleting(false); setError(''); }}>Back to review</Button>}
        <Button className="h-11" disabled={stage === 'complete' ? !completion || Boolean(completionError) || !mediaReady : !canSave} onClick={save}>{stage === 'complete' ? 'Create & activate Master' : stage === 'create' ? 'Continue to details' : sources.some(item => item.id !== current.id && !reviewedIds.includes(item.id)) ? 'Review next listing' : 'Link to this Master'}<ArrowRight className="size-4" /></Button>
      </div>}
    </div>
    <Dialog open={Boolean(zoom)} onOpenChange={open => { if (!open) setZoom(null); }}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Product image</DialogTitle><DialogDescription>{zoom?.name}</DialogDescription></DialogHeader>{zoom && <img src={zoom.src} alt={zoom.name} className="max-h-[65vh] w-full object-contain" />}</DialogContent></Dialog>
    <AlertDialog open={discardBack} onOpenChange={setDiscardBack}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Discard unsaved details?</AlertDialogTitle><AlertDialogDescription>Your Master and listing links have not changed. Go back without saving these edits?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep editing</AlertDialogCancel><AlertDialogAction onClick={onBack}>Discard &amp; go back</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </section>;
}
