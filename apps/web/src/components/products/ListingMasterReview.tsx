import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CircleHelp, ExternalLink, Info, Layers3, Package, Plus, Search, TriangleAlert, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ChannelLogo } from '@/components/channels/ChannelLogo';
import type { CatalogImportItem } from '@/lib/catalog-import-store';
import type { Product } from '@/lib/product-store';
import { savedListingCatalog, type ListingIntakeCatalog } from '@/lib/listing-intake-catalog';
import { canCopyListingPrice, confirmListingIntake, intakeSku, pendingMappingReviews, snapshotListingMatch, snapshotListingSource, suggestedListingBrandId } from '@/lib/product-listing-intake';
import { resolveSourceSkuMappings, sourceSkuDataError } from '@/lib/listing-sku-mapping';
import { pendingReviewFor, prepareReviewVariants, resolvedReviewMappings } from '@/lib/listing-review-progress';
import { evidenceSummary, groupEvidenceSummary, listingMatchEvidence, packTitleHint, rankMasterCandidates, safeListingUrl, suggestedMasterForReview, type EvidenceState } from '@/lib/listing-match-evidence';
import { SelectedListingsOverview } from './SelectedListingsOverview';
import { ListingMappingContext } from './ListingMappingContext';

import { ListingMasterCompletion } from './ListingMasterCompletion';
import { ListingSkuMappings } from './ListingSkuMappings';
import { ListingReviewHelp } from './ListingReviewHelp';
import { assertMasterComplete, completionFields, completionReadiness, newListingMasterPreview, prepareMasterCompletion, reviewMasterSignature, variantMappingError, type VariantMappings } from '@/lib/listing-master-completion';

export type IntakeStage = 'queue' | 'group' | 'choose' | 'compare' | 'create' | 'complete';
type Props = {
  catalog?: ListingIntakeCatalog;
  listings: CatalogImportItem[];
  initialMode: 'existing' | 'new';
  onBack: () => void;
  backLabel?: string;
  remainingCount?: number;
  onStageChange?: (stage: IntakeStage) => void;
  onDirtyChange?: (dirty: boolean) => void;
  onSaved: (result: ReturnType<typeof confirmListingIntake>, created: boolean) => void;
};

function creationPreview(source: CatalogImportItem, products: Product[], previous?: Product, forceVariants = false) {
  return prepareMasterCompletion(newListingMasterPreview(source, {
    name: source.title, sku: previous?.sku_code ?? intakeSku(products),
    productType: forceVariants || source.variants > 1 ? 'variant' : 'single',
    categoryId: previous?.categoryId, brandId: suggestedListingBrandId(source),
    copySourcePrice: canCopyListingPrice(source),
  }), [source]);
}

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

export function ListingMasterReview({ catalog = savedListingCatalog, listings, initialMode, onBack, backLabel = 'Back to listings', remainingCount, onStageChange, onDirtyChange, onSaved }: Props) {
  // Keep reviewed values stable while the seller is comparing. Saving checks a fresh snapshot.
  const [sources, setSources] = useState(() => structuredClone(listings));
  const [mode, setMode] = useState(initialMode);
  // Only initialize once: choosing another Master must not reapply the suggestion.
  const [master, setMaster] = useState<Product | null>(() => initialMode === 'existing'
    ? structuredClone(suggestedMasterForReview(sources, catalog.products())) : null);
  const pending = master && sources.map(source => pendingReviewFor(source, master)).find(Boolean);
  const savedDraftCurrent = Boolean(pending?.master_draft && master && pending.master_signature === reviewMasterSignature(master));
  const [query, setQuery] = useState('');
  const [sourceIndex, setSourceIndex] = useState(0);
  const [reviewedIds, setReviewedIds] = useState<string[]>([]);
  const [sourceId, setSourceId] = useState(sources[0]?.id || '');
  // Keep the creation proposal separate so visiting the existing-Master finder never discards it.
  const [newProduct, setNewProduct] = useState(() => creationPreview(sources[0], catalog.products(), undefined, sources.some(source => source.variants > 1)));
  const [creationDirty, setCreationDirty] = useState(false);
  const [replacementSourceId, setReplacementSourceId] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [verifiedSingles, setVerifiedSingles] = useState<string[]>(() => master ? sources.filter(source => pendingReviewFor(source, master)?.verified_single).map(source => source.id) : []);
  const [verifiedStructure, setVerifiedStructure] = useState(false);
  const [error, setError] = useState('');
  const [reloadNotice, setReloadNotice] = useState('');
  const [completion, setCompletion] = useState<Product | null>(() => master && pending
    ? savedDraftCurrent ? { ...structuredClone(master), ...structuredClone(pending.master_draft) }
      : master.status === 'draft' ? prepareReviewVariants(master, sources) : null : null);
  const [completing, setCompleting] = useState(Boolean(completion));
  const [mediaReady, setMediaReady] = useState(false);
  const [existingMappings, setExistingMappings] = useState<VariantMappings>(() => master ? Object.fromEntries(sources.flatMap(source => {
    const progress = pendingReviewFor(source, master);
    return progress?.draft_mappings ? [[source.id, structuredClone(progress.draft_mappings)]] : [];
  })) : {});
  const [creationMappings, setCreationMappings] = useState<VariantMappings>({});
  const mappings = mode === 'new' ? creationMappings : existingMappings;
  const setMappings = mode === 'new' ? setCreationMappings : setExistingMappings;
  const [dirty, setDirty] = useState(false);
  const [groupEditing, setGroupEditing] = useState(false);
  const [groupDirty, setGroupDirty] = useState(false);
  const [discardBack, setDiscardBack] = useState(false);
  const [deferOpen, setDeferOpen] = useState(false);
  useEffect(() => { onDirtyChange?.(dirty || groupDirty); }, [dirty, groupDirty, onDirtyChange]);
  useEffect(() => () => { onDirtyChange?.(false); }, [onDirtyChange]);
  const [zoom, setZoom] = useState<{ src: string; name: string } | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const masterSearch = useRef<HTMLInputElement>(null);
  const scrollArea = useRef<HTMLDivElement>(null);
  const saveLock = useRef(false);
  const stage: IntakeStage = mode === 'new' ? 'create' : completing ? 'complete' : master ? 'compare' : 'choose';
  const editingDetails = stage === 'create' || stage === 'complete';
  const groupedComparison = stage === 'compare' && sources.length > 1;
  const reviewProduct = mode === 'new' ? newProduct : completion;
  const draft = { name: newProduct.name, sku: newProduct.sku_code, productType: newProduct.product_type, categoryId: newProduct.categoryId, brandId: newProduct.brandId, copySourcePrice: false };
  const isSuggestedMaster = Boolean(master && suggestedMasterForReview(sources, catalog.products())?.id === master.id);
  useEffect(() => {
    onStageChange?.(stage);
    if (stage === 'choose') masterSearch.current?.focus();
    else heading.current?.focus();
    if (scrollArea.current) scrollArea.current.scrollTop = 0;
  }, [stage, onStageChange]);
  const current = sources[sourceIndex];
  const candidates = rankMasterCandidates(sources, catalog.products(), query);
  const compareRows = master && current ? listingMatchEvidence(current, master) : [];
  const differences = compareRows.filter(row => row.state === 'different');
  const missing = compareRows.filter(row => row.state === 'missing');
  const matches = compareRows.filter(row => row.state === 'match');
  const blocked = Boolean(master && [current].some(item => (item.variants === 0 && !verifiedSingles.includes(item.id))
    || (item.variants > 1 && !master.has_variants && master.product_type !== 'variant')));
  const unknownStructure = sources.some(item => item.variants === 0);
  const existingLinks = sources.filter(item => item.existingLinkReview);
  const alreadyLinkedHere = existingLinks.length === sources.length && existingLinks.every(item => item.existingLinkReview?.productId === master?.id);
  const deferLabel = mode === 'new' ? 'Save draft & link' : alreadyLinkedHere ? 'Save progress' : groupedComparison ? 'Link all & finish later' : 'Link now, finish later';
  const completeLabel = mode === 'new' ? 'Create, activate & link' : master?.status === 'published'
    ? alreadyLinkedHere ? 'Save Master changes' : 'Save Master changes & link'
    : alreadyLinkedHere ? 'Save & activate Master' : 'Save, activate & link';
  const confirmLabel = groupedComparison
    ? existingLinks.length ? alreadyLinkedHere ? `Confirm all ${sources.length} links` : `Confirm Master for all ${sources.length} listings` : `Link all ${sources.length} listings`
    : existingLinks.length ? existingLinks.every(item => item.existingLinkReview?.productId === master?.id) ? 'Confirm mapping' : 'Move to this Master' : 'Link to this Master';
  const reviewedCount = reviewedIds.length;
  const resolvedMappings = mode === 'existing' && master
    ? Object.fromEntries(sources.map(source => [source.id, resolveSourceSkuMappings(source, master, mappings[source.id])])) : mappings;
  const mappingError = master ? variantMappingError([current], master, resolvedMappings, verifiedSingles) : '';
  const canSave = mode === 'new' ? (sources.length === 1 || acknowledged) && (!unknownStructure || verifiedStructure) && draft.name.trim().length >= 3 && Boolean(draft.sku.trim()) : Boolean(master) && !blocked && !mappingError;
  const canDefer = mode === 'new' ? draft.name.trim().length >= 3 && Boolean(draft.sku.trim()) : Boolean(master);
  let completionError = '';
  if (editingDetails && reviewProduct) {
    try { assertMasterComplete(reviewProduct, sources, catalog.products()); }
    catch (reason) { completionError = reason instanceof Error ? reason.message : 'Complete required details.'; }
    completionError ||= variantMappingError(sources, reviewProduct, Object.fromEntries(sources.map(source => [source.id, resolveSourceSkuMappings(source, reviewProduct, mappings[source.id])])), mode === 'new' && verifiedStructure ? sources.map(item => item.id) : verifiedSingles);
  }
  const confirmationError = mode === 'new' && sources.length > 1 && !acknowledged ? 'Confirm that all selected listings represent the same product before activating.'
    : mode === 'new' && unknownStructure && !verifiedStructure ? 'Check the source SKU structure and confirm the product type before activating.'
    : mode === 'existing' && editingDetails && sources.length > 1 && !acknowledged ? 'Confirm that you reviewed all selected listings before saving.' : '';
  const title = stage === 'complete' ? 'Complete Product Master' : stage === 'create' ? 'Create one Master' : stage === 'compare' ? 'Compare product details' : 'Find a Product Master';
  const openImage = (src: string, imageName: string) => setZoom({ src, name: imageName });
  const resetReview = () => { setCompletion(null); setCompleting(false); setMediaReady(false); setExistingMappings({}); setReviewedIds([]); setVerifiedSingles([]); setVerifiedStructure(false); setError(''); setReloadNotice(''); };
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
    setSourceId(id); setSourceIndex(index); setAcknowledged(false); setVerifiedStructure(false); setError('');
    setMappings({}); setMediaReady(false); setReplacementSourceId('');
    setNewProduct(previous => creationPreview(source, catalog.products(), previous, sources.some(item => item.variants > 1)));
    setCreationDirty(false); setDirty(true);
  };
  const updateNewProduct = (product: Product) => {
    if (product.has_variants !== newProduct.has_variants) { setVerifiedStructure(false); setAcknowledged(false); }
    setNewProduct(product); setCreationDirty(true); setDirty(true); setError('');
  };
  const compare = (product: Product) => { setMaster(structuredClone(product)); resetReview(); setSourceIndex(0); };
  const completeHere = () => {
    if (!master) return;
    setCompletion(previous => previous ?? prepareReviewVariants(master, sources));
    setCompleting(true); setMediaReady(false); setError('');
  };
  const changeSource = (index: number) => {
    setSourceIndex(index); setError(''); setReloadNotice('');
    if (scrollArea.current) scrollArea.current.scrollTop = 0;
    heading.current?.focus();
  };
  const reloadSource = (id: string) => {
    const previous = sources.find(source => source.id === id);
    const latest = (previous?.existingLinkReview ? pendingMappingReviews(catalog.products(), catalog.listings()) : catalog.listings())
      .find(source => source.id === id && source.channel === previous?.channel && source.listingId === previous.listingId && source.storeName === previous.storeName);
    if (!latest || latest.confirmed || latest.resolution === 'ignore') {
      setError('This listing is no longer available for review. Return to listings and select it again.');
      return;
    }
    setSources(items => items.map(source => source.id === id ? structuredClone(latest) : source));
    setMappings(value => Object.fromEntries(Object.entries(value).filter(([key]) => key !== id)));
    setReviewedIds(value => value.filter(reviewed => reviewed !== id));
    setVerifiedSingles(value => value.filter(verified => verified !== id));
    setError('');
    setReloadNotice(sourceSkuDataError(latest) ? 'SKU details are still missing from the imported data. Sync this listing from its channel, then reload here.' : 'Listing data reloaded. Review the updated SKU matches.');
  };
  const save = () => {
    if (groupEditing || (!editingDetails && !canSave) || saveLock.current || confirmationError) return;
    if (mode === 'existing' && !completing) {
      const accepted = [...new Set([...reviewedIds, current.id])];
      setReviewedIds(accepted);
      if (accepted.length < sources.length) {
        changeSource(sources.findIndex(item => !accepted.includes(item.id)));
        return;
      }
    }
    if (editingDetails && (!reviewProduct || completionError || !mediaReady || (mode === 'new' && !canSave))) return;
    saveLock.current = true;
    try {
      const result = confirmListingIntake(sources.map(item => item.id), mode === 'new' ? { ...draft, completion: completionFields(newProduct), variantMappings: newProduct.has_variants ? resolvedReviewMappings(sources, newProduct, mappings) : undefined, sourceId, verifiedSourceStructure: verifiedStructure, reviewedSources: sources.map(snapshotListingSource) } : { productId: master!.id, completion: completing && completion ? completionFields(completion) : undefined, activate: completing && master!.status !== 'published', variantMappings: completing && completion ? resolvedReviewMappings(sources, completion, mappings) : resolvedMappings, verifiedSingleListingIds: verifiedSingles, reviewed: sources.map(item => snapshotListingMatch(item, master!)) }, catalog);
      setDirty(false); onDirtyChange?.(false);
      onSaved(result, mode === 'new');
    } catch (reason) {
      saveLock.current = false;
      setError(reason instanceof Error ? reason.message : 'Could not save. Try again.');
    }
  };
  const saveForLater = () => {
    if (groupEditing || !canDefer || saveLock.current) return;
    saveLock.current = true;
    try {
      const candidate = reviewProduct ?? master!;
      const proposedMappings = resolvedReviewMappings(sources, candidate, mappings);
      const result = confirmListingIntake(sources.map(source => source.id), mode === 'new'
        ? { ...draft, sourceId, defer: true, completion: completionFields(candidate), variantMappings: proposedMappings, verifiedSourceStructure: verifiedStructure, reviewedSources: sources.map(snapshotListingSource) }
        : { productId: master!.id, defer: true, completion: completion ? completionFields(completion) : undefined, variantMappings: proposedMappings, verifiedSingleListingIds: verifiedSingles, reviewed: sources.map(source => snapshotListingMatch(source, master!)) }, catalog);
      setDirty(false); onDirtyChange?.(false); setDeferOpen(false); onSaved(result, mode === 'new');
    } catch (reason) { saveLock.current = false; setDeferOpen(false); setError(reason instanceof Error ? reason.message : 'Could not save progress. Try again.'); }
  };
  const sourceCard = (item: CatalogImportItem) => {
    const href = safeListingUrl(item.listingUrl);
    if (stage !== 'compare') return <div className="flex min-w-0 items-center gap-3">
      <Photo src={item.image || item.images?.[0]} name={item.title} onZoom={openImage} small />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
          <p className="min-w-0 break-words text-sm font-semibold leading-5">{item.title}</p>
          <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground"><ChannelLogo channel={{ key: item.channel }} /><span className="break-words">{item.storeName} · <span className="capitalize">{item.channel}</span></span></div>
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
    <div ref={scrollArea} className={`min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 ${stage === 'choose' || stage === 'create' ? 'space-y-3' : groupedComparison ? 'space-y-4' : 'space-y-6'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2"><Button variant="ghost" className="-ml-3 h-11" onClick={() => {
        if (stage === 'complete') { setCompleting(false); setError(''); }
        else if (dirty || groupDirty) setDiscardBack(true);
        else onBack();
      }}><ArrowLeft className="size-4" />{stage === 'complete' ? 'Back to review' : backLabel}</Button>{stage === 'create' && catalog.products().some(product => product.status !== 'archived') && <Button variant="outline" className="h-11" disabled={groupEditing} onClick={useExistingMaster}><ArrowLeft className="size-4" />Use existing Master</Button>}</div>
      {pending && <div role="status" className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm"><p className="font-medium">Linked · review unfinished</p><p className="mt-1 text-xs text-muted-foreground">{pending.issues.join(' · ')}. Confirming does not turn on sync.</p>{pending.master_draft && !savedDraftCurrent && <p className="mt-2 text-xs">The Master changed since this draft was saved. Review the current values; the older draft will not overwrite them automatically.</p>}</div>}
      {stage !== 'complete' && existingLinks.length > 0 && <div className="space-y-1 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs leading-5" role="note"><p className="font-medium">Review an existing link</p><p>{[...new Set(existingLinks.flatMap(item => item.existingLinkReview!.issues))].join(' · ')}</p><p className="text-muted-foreground">The current link is unchanged until you confirm. Choosing another Master or creating a new Master moves only the selected links; Master stock is not transferred.</p></div>}

      {sources.length > 1 && stage === 'choose' && <SelectedListingsOverview listings={sources} />}
      {groupedComparison && master && <ListingMappingContext listings={sources} activeIndex={sourceIndex} reviewedIds={reviewedIds} master={master} masterImage={<Photo src={master.images[0]} name={master.name} onZoom={openImage} small />} onView={changeSource} onChangeMaster={chooseAnother} onCreateMaster={createNewMaster} />}

      {current && stage !== 'complete' && !groupedComparison && !(stage === 'choose' && sources.length > 1) && <div className={master && mode === 'existing' ? 'grid gap-5 sm:grid-cols-2' : ''}>
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
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">{groupedComparison ? `Check listing ${sourceIndex + 1} of ${sources.length} before linking` : 'Check before linking'}</h3>{groupedComparison && safeListingUrl(current.listingUrl) && <a href={safeListingUrl(current.listingUrl)!} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1.5 text-xs text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">View shop listing<ExternalLink className="size-3.5" /></a>}</div>
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
        {(blocked || mappingError || !completionReadiness(master, sources).ready) && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4"><div className="min-w-0 flex-1"><p className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-300"><TriangleAlert className="size-4" />{blocked || mappingError ? 'SKU mapping needs review' : 'Master details can be completed here'}</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{blocked || mappingError ? 'Review imported SKUs and prepare missing variants here, or link now and finish later. Price and stock sync require confirmed SKU mappings.' : 'Linking does not require activation. Complete the required details here if you want to activate this Master now.'}</p></div><Button variant="outline" className="h-11" onClick={completeHere}>{blocked || mappingError ? 'Set up SKUs & details' : 'Complete Master details'}</Button></div>}
      </>}

      {stage === 'compare' && master && (master.has_variants || master.product_type === 'variant') && <ListingSkuMappings product={master} sources={[current]} mappings={mappings} onReload={reloadSource} onChange={value => { setMappings(value); setReviewedIds(ids => ids.filter(id => id !== current.id)); setDirty(true); setError(''); }} />}
      {stage === 'compare' && master && !blocked && !mappingError && completionReadiness(master, sources).ready && <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"><p className="max-w-lg text-xs leading-5 text-muted-foreground">Comparison checks product identity only. To copy or correct listing data, review the source and final value for each Master field.</p><Button variant="outline" className="h-11" onClick={completeHere}>Review data for Master</Button></div>}
      {stage === 'compare' && !blocked && mappingError && !sourceSkuDataError(current) && <p role="status" className="text-sm text-amber-700 dark:text-amber-300">{mappingError}</p>}
      {reloadNotice && <p role="status" className="text-sm text-muted-foreground">{reloadNotice}</p>}
      {stage === 'complete' && completion && <>
        {mode === 'existing' && <div role="note" className="space-y-1 rounded-lg border bg-muted/20 p-3 text-xs leading-5"><p>Review proposed Master changes before saving. Shop-specific categories and values stay with each listing; nothing is sent to shops.</p>{master && !master.has_variants && completion.has_variants && <p className="font-medium">This changes the Master to a product with variants. Existing SKUs and warehouse stock are preserved, not split. Other linked listings may need SKU mapping before price or stock sync.</p>}</div>}
        {mode === 'existing' && sources.filter(source => source.variants === 0).map(source => <label key={source.id} className="flex items-start gap-3 text-sm"><Checkbox checked={verifiedSingles.includes(source.id)} onCheckedChange={checked => setVerifiedSingles(ids => checked === true ? [...ids, source.id] : ids.filter(id => id !== source.id))} />I checked the SKU structure for {source.storeName} · {source.channelSku}.</label>)}
        <ListingMasterCompletion product={completion} baseline={mode === 'existing' ? master ?? undefined : undefined} sources={sources} preservedSkuIds={mode === 'existing' ? master?.skus.map(sku => sku.id) : undefined} onChange={product => { setCompletion(product); setDirty(true); setError(''); }} mappings={mappings} onMappingsChange={value => { setMappings(value); setDirty(true); }} onMediaReady={setMediaReady} />
        {sources.length > 1 && mode === 'existing' && <label className="flex items-start gap-3 text-sm"><Checkbox checked={acknowledged} onCheckedChange={checked => setAcknowledged(checked === true)} />I reviewed all selected listings and confirm they represent this product.</label>}
      </>}
      {stage === 'create' && <div className="space-y-3">
        {sources.length > 1 && <div className="space-y-2"><div className="flex items-center gap-1"><Label htmlFor="intake-source">Use product data from</Label><ListingReviewHelp label="Starting listing data">This sets the starting data. In Edit, use Change source for an individual field to take a value from another selected listing. Replacing the starting listing resets the proposal after confirmation.</ListingReviewHelp></div><select id="intake-source" disabled={groupEditing} className="h-11 w-full rounded-md border bg-background px-3 text-sm" value={sourceId} onChange={event => { if (creationDirty) setReplacementSourceId(event.target.value); else changeDraftSource(event.target.value); }}>{sources.map(item => <option key={item.id} value={item.id}>{item.storeName} · {item.channel} · {item.channelSku}</option>)}</select></div>}
        <ListingMasterCompletion key={sourceId} product={newProduct} sources={sources} onChange={updateNewProduct} mappings={mappings} onMappingsChange={value => { setMappings(value); setCreationDirty(true); setDirty(true); }} onMediaReady={setMediaReady} onEditingChange={(editing, changed) => { setGroupEditing(editing); setGroupDirty(changed); }} creationSetup={(editingProduct, editProduct) => <section className="space-y-3 border-t pt-3" aria-label="Master SKU and product structure">
          <div className="grid gap-4 sm:grid-cols-[1fr_2fr]"><div className="space-y-2"><div className="flex items-center gap-1"><Label htmlFor="intake-sku">Master SKU <span aria-hidden="true">*</span></Label><ListingReviewHelp label="Master SKU">Unique internal code. Shop SKUs stay unchanged.</ListingReviewHelp></div><Input id="intake-sku" required className="h-11 font-mono" value={editingProduct.sku_code} onChange={event => editProduct({ ...editingProduct, sku_code: event.target.value.toUpperCase() })} /></div><fieldset className="space-y-2"><legend className="text-sm font-medium">Product type *</legend><div className="flex flex-wrap gap-2">{[{ type: 'single', label: 'Single product', Icon: Package }, { type: 'variant', label: 'With variants', Icon: Layers3 }].map(option => <label key={option.type} className={`flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm ${editingProduct.product_type === option.type ? 'border-primary bg-primary/5' : ''} ${option.type === 'single' && sources.some(source => source.variants > 1) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}><input type="radio" name="intake-product-type" value={option.type} checked={editingProduct.product_type === option.type} disabled={option.type === 'single' && sources.some(source => source.variants > 1)} onChange={() => editProduct({ ...editingProduct, has_variants: option.type === 'variant', product_type: option.type === 'variant' ? 'variant' : 'single' })} className="size-4 accent-primary" /><option.Icon className="size-4" />{option.label}</label>)}</div><p className="text-xs text-muted-foreground">{current.variants > 1 ? `${current.variants} shop SKUs detected. Review prefilled variants and SKU mapping below.` : unknownStructure ? 'Check the source SKU structure before confirming the product type.' : 'Review variant options and SKU mapping below when using variants.'}</p></fieldset></div>
        </section>} />
        {unknownStructure && <label className="flex cursor-pointer items-start gap-3 text-sm leading-6"><Checkbox className="mt-1 shrink-0" checked={verifiedStructure} onCheckedChange={checked => setVerifiedStructure(checked === true)} />Source structure is not recorded. I checked the shop listing(s) and selected the correct product structure above.</label>}
        {sources.length > 1 && <details className="rounded-lg border px-3"><summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Listings to group into this Master · {sources.length}</summary>{sources.map(item => <p key={item.id} className="border-b py-2 text-sm last:border-0">{item.title}<span className="mt-1 block text-xs text-muted-foreground">{item.storeName} · {item.channelSku} · {item.brand || 'Brand not provided'}</span></p>)}</details>}
        {sources.length > 1 && <label className="flex cursor-pointer items-start gap-3 text-sm leading-6"><Checkbox checked={acknowledged} onCheckedChange={checked => setAcknowledged(checked === true)} className="mt-1 shrink-0" />I checked that the selected listings represent this product, including model and pack size.</label>}
      </div>}
    </div>
    <div role="group" aria-label="Review actions" className={`max-h-[55dvh] shrink-0 overflow-y-auto border-t bg-background px-4 py-3 sm:px-6 ${editingDetails ? 'grid gap-x-4 gap-y-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center' : 'space-y-3'}`}>
      {groupEditing && <p role="status" className="col-span-full text-xs text-muted-foreground">Apply or cancel your section edits before saving this Master.</p>}
      {editingDetails && !groupEditing && (confirmationError || completionError || !mediaReady) && <p className="col-span-full text-xs leading-5 text-amber-700 dark:text-amber-300" role="status">{confirmationError || (completionError.startsWith('Complete required details before activating:') ? 'Complete the highlighted sections to activate, or save a draft.' : completionError) || 'Wait for images to load, or replace any unavailable images.'}</p>}
      {error && <p role="alert" className="col-span-full rounded-lg border border-destructive/30 p-3 text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs leading-5 text-muted-foreground"><p className="flex items-start gap-2"><Info className="mt-0.5 size-3.5 shrink-0" />{mode === 'new' ? `Only Master data and links are saved. Nothing is published; sync stays off.` : completing ? 'Save the reviewed Master changes and links. Activation does not publish or turn on sync.' : 'Link only. Master status, details and images stay unchanged. Nothing is published; stock and sync are unchanged.'}</p><span role="status">{groupedComparison ? `${reviewedCount} of ${sources.length} checked · Changes not saved` : remainingCount !== undefined ? `${remainingCount} listing${remainingCount === 1 ? '' : 's'} left to review` : `${sources.length} listing${sources.length === 1 ? '' : 's'} selected`}</span></div>
      {stage !== 'choose' && <div className="flex flex-wrap justify-end gap-2">
        {stage === 'compare' && !groupedComparison && <><Button variant="outline" className="h-11" onClick={chooseAnother}>Choose another Master</Button><Button variant="outline" className="h-11" onClick={createNewMaster}><Plus className="size-4" />Create new Master</Button></>}
        <Button variant="outline" className="h-11" disabled={!canDefer || groupEditing} onClick={() => setDeferOpen(true)}>{deferLabel}</Button>
        <Button className="h-11" disabled={groupEditing || (editingDetails ? !reviewProduct || Boolean(confirmationError || completionError) || !mediaReady || (mode === 'new' && !canSave) : !canSave)} onClick={save}>{editingDetails ? completeLabel : sources.some(item => item.id !== current.id && !reviewedIds.includes(item.id)) ? 'Mark checked & continue' : confirmLabel}<ArrowRight className="size-4" /></Button>
      </div>}
    </div>
    <AlertDialog open={Boolean(replacementSourceId)} onOpenChange={open => { if (!open) setReplacementSourceId(''); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Replace the starting listing data?</AlertDialogTitle><AlertDialogDescription>This replaces your field edits, image choices and SKU mappings with data from the selected listing. Your internal category and Master SKU are kept. To change just one field, use Change source in the mapping table instead.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep editing</AlertDialogCancel><AlertDialogAction onClick={() => changeDraftSource(replacementSourceId)}>Replace draft data</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <AlertDialog open={deferOpen} onOpenChange={setDeferOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{mode === 'new' ? 'Save a draft Master and link these listings?' : alreadyLinkedHere ? 'Save review progress for later?' : 'Link now and finish the review later?'}</AlertDialogTitle><AlertDialogDescription>{sources.length} listing{sources.length === 1 ? '' : 's'} {alreadyLinkedHere ? 'stay linked' : 'will be linked'} to {mode === 'new' ? draft.name : master?.name}. {mode === 'new' ? 'The new Master stays Draft.' : 'Existing Master details and status stay unchanged; your proposed edits are saved for review.'} Unconfirmed SKU mappings cannot be used for price or stock sync. No shop data is changed and sync is not turned on.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep reviewing</AlertDialogCancel><AlertDialogAction onClick={saveForLater}>{mode === 'new' ? 'Save draft & link' : alreadyLinkedHere ? 'Save progress' : 'Link & save progress'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <Dialog open={Boolean(zoom)} onOpenChange={open => { if (!open) setZoom(null); }}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Product image</DialogTitle><DialogDescription>{zoom?.name}</DialogDescription></DialogHeader>{zoom && <img src={zoom.src} alt={zoom.name} className="max-h-[65vh] w-full object-contain" />}</DialogContent></Dialog>
    <AlertDialog open={discardBack} onOpenChange={setDiscardBack}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Discard unsaved details?</AlertDialogTitle><AlertDialogDescription>Your Master and listing links have not changed. Go back without saving these edits?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep editing</AlertDialogCancel><AlertDialogAction onClick={onBack}>Discard &amp; go back</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </section>;
}
