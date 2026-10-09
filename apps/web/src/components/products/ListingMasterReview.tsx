import { useEffect, useId, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ExternalLink, Info, Layers3, Package, Plus, Search, TriangleAlert, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ChannelLogo } from '@/components/channels/ChannelLogo';
import type { CatalogImportItem } from '@/lib/catalog-import-store';
import type { Product, ListingDraftValues } from '@/lib/product-store';
import { ListingChannelReadiness } from './ListingChannelReadiness';
import { savedListingCatalog, type ListingIntakeCatalog } from '@/lib/listing-intake-catalog';
import { canCopyListingPrice, confirmListingIntake, intakeSku, pendingMappingReviews, snapshotListingMatch, snapshotListingSource, suggestedListingBrandId } from '@/lib/product-listing-intake';
import { resolveSourceSkuMappings, sourceSkuDataError } from '@/lib/listing-sku-mapping';
import { listingMappingRecovery } from '@/lib/listing-mapping-recovery';
import { pendingReviewFor, prepareReviewVariants, resolvedReviewMappings } from '@/lib/listing-review-progress';
import { evidenceSummary, groupEvidenceSummary, listingMatchEvidence, rankMasterCandidates, safeListingUrl, suggestedMasterForReview } from '@/lib/listing-match-evidence';
import { SelectedListingsOverview } from './SelectedListingsOverview';
import { ListingMappingContext } from './ListingMappingContext';

import { ListingMasterCompletion } from './ListingMasterCompletion';
import { ListingComparisonTable } from './ListingComparisonTable';
import { ListingSkuMappings } from './ListingSkuMappings';
import { ListingSaveSummary } from './ListingSaveSummary';
import { ListingReviewHelp } from './ListingReviewHelp';
import { assertMasterComplete, completionFields, newListingMasterPreview, prepareMasterCompletion, reviewMasterSignature, variantMappingError, type VariantMappings } from '@/lib/listing-master-completion';

export type IntakeStage = 'queue' | 'group' | 'choose' | 'compare' | 'create' | 'complete';
type Props = {
  catalog?: ListingIntakeCatalog;
  listings: CatalogImportItem[];
  initialMode: 'existing' | 'new';
  onBack: () => void;
  backLabel?: string;
  remainingCount?: number;
  batchProgress?: { index: number; total: number };
  onSkip?: () => void;
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

export function ListingMasterReview({ catalog = savedListingCatalog, listings, initialMode, onBack, backLabel = 'Back to listings', remainingCount, batchProgress, onSkip, onStageChange, onDirtyChange, onSaved }: Props) {
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
  const [mappingFocusRequest, setMappingFocusRequest] = useState(0);
  const recoveryId = useId();
  const structureCheck = useRef<HTMLButtonElement>(null);
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
  const [listingDrafts, setListingDrafts] = useState<Record<string, ListingDraftValues>>({});
  const mappings = mode === 'new' ? creationMappings : existingMappings;
  const setMappings = mode === 'new' ? setCreationMappings : setExistingMappings;
  const [dirty, setDirty] = useState(false);
  const [groupEditing, setGroupEditing] = useState(false);
  const [groupDirty, setGroupDirty] = useState(false);
  const [discardBack, setDiscardBack] = useState(false);
  const [deferOpen, setDeferOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [discardSkip, setDiscardSkip] = useState(false);
  const [replacementMasterMode, setReplacementMasterMode] = useState<'existing' | 'new' | null>(null);
  useEffect(() => { onDirtyChange?.(dirty || groupDirty); }, [dirty, groupDirty, onDirtyChange]);
  useEffect(() => () => { onDirtyChange?.(false); }, [onDirtyChange]);
  const [zoom, setZoom] = useState<{ src: string; name: string } | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const masterSearch = useRef<HTMLInputElement>(null);
  const scrollArea = useRef<HTMLDivElement>(null);
  const saveLock = useRef(false);
  const stage: IntakeStage = mode === 'new' ? 'create' : completing ? 'complete' : master ? 'compare' : 'choose';
  const editingDetails = stage === 'create' || stage === 'complete' || (stage === 'compare' && Boolean(completion));
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
  const differences = compareRows.filter(row => row.state === 'different' && row.key !== 'sku');
  const skuDifference = compareRows.find(row => row.key === 'sku' && row.state === 'different');
  const missing = compareRows.filter(row => row.state === 'missing');
  const matches = compareRows.filter(row => row.state === 'match');
  const comparisonMaster = completion ?? master;
  const blocked = Boolean(comparisonMaster && [current].some(item => (item.variants === 0 && !verifiedSingles.includes(item.id))
    || (item.variants > 1 && !comparisonMaster.has_variants && comparisonMaster.product_type !== 'variant')));
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
  const resolvedMappings = mode === 'existing' && comparisonMaster
    ? Object.fromEntries(sources.map(source => [source.id, resolveSourceSkuMappings(source, comparisonMaster, mappings[source.id])])) : mappings;
  const mappingError = comparisonMaster ? variantMappingError([current], comparisonMaster, resolvedMappings, verifiedSingles) : '';
  const mappingRecovery = stage === 'compare' && comparisonMaster ? listingMappingRecovery(current, comparisonMaster, resolvedMappings, verifiedSingles) : null;
  const needsSkuReviewIds = groupedComparison && comparisonMaster ? sources.filter(source => listingMappingRecovery(source, comparisonMaster, resolvedMappings, verifiedSingles)).map(source => source.id) : [];
  const canSave = mode === 'new' ? (sources.length === 1 || acknowledged) && (!unknownStructure || verifiedStructure) && Boolean(draft.name.trim()) && Boolean(draft.sku.trim()) : Boolean(master) && !blocked && !mappingError;
  const canDefer = mode === 'new' ? Boolean(draft.name.trim()) && Boolean(draft.sku.trim()) : Boolean(master);
  let completionError = '';
  if (editingDetails && reviewProduct) {
    try { assertMasterComplete(reviewProduct, sources, catalog.products()); }
    catch (reason) { completionError = reason instanceof Error ? reason.message : 'Complete required details.'; }
    completionError ||= variantMappingError(stage === 'compare' ? [current] : sources, reviewProduct, Object.fromEntries(sources.map(source => [source.id, resolveSourceSkuMappings(source, reviewProduct, mappings[source.id])])), mode === 'new' && verifiedStructure ? sources.map(item => item.id) : verifiedSingles);
  }
  const confirmationError = mode === 'new' && sources.length > 1 && !acknowledged ? 'Confirm that all selected listings represent the same product before activating.'
    : mode === 'new' && unknownStructure && !verifiedStructure ? 'Check the source SKU structure and confirm the product type before activating.'
    : mode === 'existing' && stage === 'complete' && sources.length > 1 && !acknowledged ? 'Confirm that you reviewed all selected listings before saving.' : '';
  const completionFeedback = completionError.startsWith('Complete required details before activating:')
    ? stage === 'compare' ? `${completionError.replace('Complete required details before activating:', 'Complete these Master fields:')} Or save progress and finish later.`
      : master?.status === 'published' ? 'Complete the highlighted sections before saving these changes, or save progress.' : 'Complete the highlighted sections to activate, or save a draft.'
    : completionError;
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
  const changeDestination = (nextMode: 'existing' | 'new') => {
    if (completion) { setReplacementMasterMode(nextMode); return; }
    if (nextMode === 'existing') chooseAnother(); else createNewMaster();
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
    setCompletion(previous => previous && (previous.has_variants || !sources.some(source => source.variants > 1)) ? previous : prepareReviewVariants(previous ?? master, sources));
    setReviewedIds([]); setAcknowledged(false);
    setCompleting(true); setMediaReady(false); setError('');
  };
  const changeSource = (index: number) => {
    if (groupEditing || index < 0 || index >= sources.length) return;
    setMappingFocusRequest(0);
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
  const save = (confirmedSummary = false) => {
    if (groupEditing || ((stage === 'compare' || !editingDetails) && !canSave) || saveLock.current || confirmationError) return;
    if (editingDetails && (!reviewProduct || completionError || !mediaReady || (mode === 'new' && !canSave))) return;
    if (mode === 'existing' && !completing) {
      const accepted = [...new Set([...reviewedIds, current.id])];
      setReviewedIds(accepted);
      if (sources.length > 1) setDirty(true);
      if (accepted.length < sources.length) {
        changeSource(sources.findIndex(item => !accepted.includes(item.id)));
        return;
      }
    }
    if (!confirmedSummary && (sources.length > 1 || editingDetails)) { setSummaryOpen(true); return; }
    saveLock.current = true;
    try {
      const result = confirmListingIntake(sources.map(item => item.id), mode === 'new' ? { ...draft, listingDrafts, completion: completionFields(newProduct), variantMappings: newProduct.has_variants ? resolvedReviewMappings(sources, newProduct, mappings) : undefined, sourceId, verifiedSourceStructure: verifiedStructure, reviewedSources: sources.map(snapshotListingSource) } : { productId: master!.id, listingDrafts, completion: completion ? completionFields(completion) : undefined, activate: Boolean(completion) && master!.status !== 'published', variantMappings: completion ? resolvedReviewMappings(sources, completion, mappings) : resolvedMappings, verifiedSingleListingIds: verifiedSingles, reviewed: sources.map(item => snapshotListingMatch(item, master!)) }, catalog);
      setDirty(false); onDirtyChange?.(false);
      onSaved(result, mode === 'new');
    } catch (reason) {
      saveLock.current = false; setSummaryOpen(false);
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
        ? { ...draft, sourceId, listingDrafts, defer: true, completion: completionFields(candidate), variantMappings: proposedMappings, verifiedSourceStructure: verifiedStructure, reviewedSources: sources.map(snapshotListingSource) }
        : { productId: master!.id, listingDrafts, defer: true, completion: completion ? completionFields(completion) : undefined, variantMappings: proposedMappings, verifiedSingleListingIds: verifiedSingles, reviewed: sources.map(source => snapshotListingMatch(source, master!)) }, catalog);
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
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><ChannelLogo channel={{ key: item.channel }} /><span>{item.storeName}</span><span className="capitalize">· {item.channel}</span></div>
        <p className="break-words text-sm font-semibold leading-5">{item.title}</p>
        <p className="break-words font-mono text-xs text-muted-foreground">{item.channelSku}</p>
        <p className="text-xs text-muted-foreground">{item.brand || 'Brand not provided'} · {item.variants === 0 ? 'SKU structure not recorded' : item.variants === 1 ? 'Single product' : `${item.variants} SKUs`}</p>
        {href && <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-8 items-center gap-1 text-xs underline underline-offset-4">Open source listing <ExternalLink className="size-3" /></a>}
      </div>
    </div>;
  };

  return <section aria-label={title} className="flex h-full min-h-0 flex-col">
    <h2 ref={heading} tabIndex={-1} className="sr-only">{title}</h2>
    <div ref={scrollArea} className={`min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 ${stage === 'choose' || stage === 'create' ? 'space-y-3' : 'space-y-4'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2"><Button variant="ghost" className="-ml-3 h-11" disabled={stage === 'complete' && groupEditing} onClick={() => {
        if (stage === 'complete') { setCompleting(false); setError(''); }
        else if (dirty || groupDirty) setDiscardBack(true);
        else onBack();
      }}><ArrowLeft className="size-4" />{stage === 'complete' ? 'Back to review' : backLabel}</Button>{stage === 'create' && catalog.products().some(product => product.status !== 'archived') && <Button variant="outline" className="h-11" disabled={groupEditing} onClick={useExistingMaster}><ArrowLeft className="size-4" />Use existing Master</Button>}</div>
      {batchProgress && <div role="status" className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 text-xs"><span className="font-medium">Reviewing listing {batchProgress.index} of {batchProgress.total}</span><span className="text-muted-foreground">Each listing links to its own selected Master</span></div>}
      {pending && <div role="status" className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm"><p className="font-medium">Linked · review unfinished</p><p className="mt-1 text-xs text-muted-foreground">{pending.issues.join(' · ')}. Confirming does not turn on sync.</p>{pending.master_draft && !savedDraftCurrent && <p className="mt-2 text-xs">The Master changed since this draft was saved. Review the current values; the older draft will not overwrite them automatically.</p>}</div>}
      {stage !== 'complete' && existingLinks.length > 0 && <div className="space-y-1 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs leading-5" role="note"><p className="font-medium">Review an existing link</p><p>{[...new Set(existingLinks.flatMap(item => item.existingLinkReview!.issues))].join(' · ')}</p><p className="text-muted-foreground">The current link is unchanged until you confirm. Choosing another Master or creating a new Master moves only the selected links; Master stock is not transferred.</p></div>}

      {sources.length > 1 && stage === 'choose' && <SelectedListingsOverview listings={sources} />}
      {groupedComparison && master && <ListingMappingContext disabled={groupEditing} listings={sources} activeIndex={sourceIndex} reviewedIds={reviewedIds} needsSkuReviewIds={needsSkuReviewIds} proposed={Boolean(completion)} master={comparisonMaster!} masterImage={<Photo src={comparisonMaster!.images[0]} name={comparisonMaster!.name} onZoom={openImage} small />} onView={changeSource} onChangeMaster={() => changeDestination('existing')} onCreateMaster={() => changeDestination('new')} />}

      {current && stage !== 'complete' && !groupedComparison && !(stage === 'choose' && sources.length > 1) && <div className={master && mode === 'existing' ? 'grid gap-3 sm:grid-cols-2' : ''}>
        <div role="group" aria-label="Source listing" className="min-w-0 rounded-xl border bg-muted/20 p-3">{stage === 'compare' && <p className="mb-2 text-xs font-medium text-muted-foreground">Source listing</p>}{sourceCard(current)}</div>
        {master && mode === 'existing' && <div className="min-w-0 rounded-xl border border-primary/30 bg-primary/[0.025] p-3"><div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs"><p className="font-medium text-muted-foreground">{current.existingLinkReview?.productId === master.id ? 'Current Product Master' : isSuggestedMaster ? 'Suggested Product Master' : 'Selected Product Master'}</p><span className="text-muted-foreground">{current.existingLinkReview?.productId === master.id ? 'Existing link · review required' : 'Not confirmed'}</span></div><div className="flex items-start gap-4"><Photo src={master.images[0]} name={master.name} onZoom={openImage} small /><div className="min-w-0 space-y-1.5"><p className="break-words text-sm font-semibold leading-5">{master.name}</p><p className="break-words font-mono text-xs text-muted-foreground">{master.sku_code}</p><p className="text-xs text-muted-foreground">{master.brand || 'Brand not provided'}</p><p className="text-xs text-muted-foreground">{master.category || 'No category'} · Master {master.status === 'published' ? 'Active' : 'Draft'}</p></div></div>{stage === 'compare' && <div className="mt-3 flex flex-wrap gap-1 border-t pt-1"><Button variant="ghost" className="h-9 px-2 text-xs" disabled={groupEditing} onClick={() => changeDestination('existing')}>Choose another Master</Button><Button variant="ghost" className="h-9 px-2 text-xs text-muted-foreground" disabled={groupEditing} onClick={() => changeDestination('new')}><Plus className="size-3.5" />Create new Master</Button></div>}</div>}
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
        {mappingRecovery && <div role="note" aria-label="SKU mapping needs review" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
          <div className="min-w-0 flex-1"><p className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-300"><TriangleAlert className="size-4 shrink-0" />{mappingRecovery.title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{mappingRecovery.detail}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">You can link and finish later. Unconfirmed mappings cannot be used for price or stock sync.</p></div>
          <Button variant="outline" className="h-11" disabled={groupEditing} onClick={() => {
            if (mappingRecovery.action === 'setup') completeHere();
            else if (mappingRecovery.action === 'reload') reloadSource(current.id);
            else if (mappingRecovery.action === 'matches') setMappingFocusRequest(value => value + 1);
            else { structureCheck.current?.focus({ preventScroll: true }); structureCheck.current?.scrollIntoView?.({ block: 'center', behavior: 'auto' }); }
          }}>{mappingRecovery.actionLabel}<ArrowRight className="size-4" /></Button>
        </div>}
        {current.variants === 0 && <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm leading-6"><Checkbox ref={structureCheck} disabled={groupEditing} className="mt-1 shrink-0" checked={verifiedSingles.includes(current.id)} onCheckedChange={checked => { setVerifiedSingles(ids => checked === true ? [...ids, current.id] : ids.filter(id => id !== current.id)); setReviewedIds([]); setDirty(true); }} /><span>Source structure is not recorded. I checked the shop listing: its product, pack quantity and SKU structure match this Master. I will map any variant SKUs below.</span></label>}
        {differences.length > 0 && <div role="group" aria-label="Differences to check" className="overflow-hidden rounded-lg border border-amber-500/30">
          <div className="flex items-center gap-2 bg-amber-500/5 px-3 py-2.5"><TriangleAlert aria-hidden="true" className="size-4 shrink-0 text-amber-700 dark:text-amber-300" /><h3 className="text-xs font-semibold">Check product identity</h3><ListingReviewHelp label="Product differences">Different values do not automatically mean a different product. Check brand, model and pack size before linking. No Master value is overwritten by linking.</ListingReviewHelp></div>
          {differences.map(row => <div key={row.key} className="grid gap-x-3 gap-y-1 px-3 py-2 text-xs sm:grid-cols-[120px_1fr_1fr]"><p className="font-medium text-amber-700 dark:text-amber-300">{row.label} differs</p><p className="min-w-0 break-words"><span className="text-muted-foreground">Listing: </span>{row.listing}</p><p className="min-w-0 break-words"><span className="text-muted-foreground">Master: </span>{row.master}</p></div>)}
        </div>}
        {(comparisonMaster!.has_variants || comparisonMaster!.product_type === 'variant') && <ListingSkuMappings key={`${current.id}:${master.id}`} compact focusRequest={mappingFocusRequest} verifiedSingles={verifiedSingles} product={comparisonMaster!} sources={[current]} mappings={mappings} onReload={mappingRecovery?.action === 'reload' ? undefined : reloadSource} onChange={value => { setMappings(value); setReviewedIds(ids => ids.filter(id => id !== current.id)); setDirty(true); setError(''); }} />}
        <div className="space-y-2">
          {(skuDifference || missing.length > 0) && <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground"><Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" /><span>{skuDifference && 'Shop and Master SKU codes differ; this can be normal. '}{missing.length > 0 && `${missing.length} identity fields unverified.`}</span><ListingReviewHelp label="Unverified product fields">{missing.length ? `Not provided: ${missing.map(row => row.label).join(', ')}. Missing data is not evidence of a match. Check the actual product before linking.` : 'Shop identifiers do not have to use the same code as the Master.'}</ListingReviewHelp></p>}
          {matches.length > 0 && <p className="flex items-center gap-2 text-xs text-muted-foreground"><Check className="size-3.5" />Matches: {matches.map(row => row.label).join(', ')}.</p>}
          <ListingComparisonTable key={`${current.id}:${master.id}`} baseline={master} product={comparisonMaster!} current={current} sources={sources}
            onSetupSkus={completeHere} onEditingChange={(editing, changed) => { setGroupEditing(editing); setGroupDirty(changed); }}
            onChange={next => { setCompletion(reviewMasterSignature(next) === reviewMasterSignature(master) ? null : next); setMediaReady(true); setReviewedIds([]); setDirty(true); setError(''); }} />
        </div>
      </>}
      {reloadNotice && <p role="status" className="text-sm text-muted-foreground">{reloadNotice}</p>}
      {stage === 'complete' && completion && <>
        {mode === 'existing' && <div role="note" className="space-y-1 rounded-lg border bg-muted/20 p-3 text-xs leading-5"><p>Review proposed Master changes before saving. Shop-specific categories and values stay with each listing; nothing is sent to shops.</p>{master && !master.has_variants && completion.has_variants && <p className="font-medium">This changes the Master to a product with variants. Existing SKUs and warehouse stock are preserved, not split. Other linked listings may need SKU mapping before price or stock sync.</p>}</div>}
        {mode === 'existing' && sources.filter(source => source.variants === 0).map(source => <label key={source.id} className="flex items-start gap-3 text-sm"><Checkbox checked={verifiedSingles.includes(source.id)} onCheckedChange={checked => { setVerifiedSingles(ids => checked === true ? [...ids, source.id] : ids.filter(id => id !== source.id)); setReviewedIds([]); setAcknowledged(false); }} />I checked the SKU structure for {source.storeName} · {source.channelSku}.</label>)}
        <ListingMasterCompletion verifiedSingles={mode === 'new' && verifiedStructure ? sources.map(source => source.id) : verifiedSingles} readFirst onEditingChange={(editing, changed) => { setGroupEditing(editing); setGroupDirty(changed); }} product={completion} baseline={mode === 'existing' ? master ?? undefined : undefined} sources={sources} preservedSkuIds={mode === 'existing' ? master?.skus.map(sku => sku.id) : undefined} onChange={product => { setCompletion(product); setReviewedIds([]); setAcknowledged(false); setDirty(true); setError(''); }} mappings={mappings} onMappingsChange={value => { setMappings(value); setReviewedIds([]); setAcknowledged(false); setDirty(true); }} onMediaReady={setMediaReady} />
        {sources.length > 1 && mode === 'existing' && <label className="flex items-start gap-3 text-sm"><Checkbox checked={acknowledged} onCheckedChange={checked => setAcknowledged(checked === true)} />I reviewed all selected listings and confirm they represent this product.</label>}
      </>}
      {stage === 'create' && <div className="space-y-3">
        {sources.length > 1 && <div className="space-y-2"><div className="flex items-center gap-1"><Label htmlFor="intake-source">Starting data from</Label><ListingReviewHelp label="Starting listing data">This sets the starting data. In Edit, use Change source for an individual field to take a value from another selected listing. Replacing the starting listing resets the proposal after confirmation.</ListingReviewHelp></div><select id="intake-source" disabled={groupEditing} className="h-11 w-full rounded-md border bg-background px-3 text-sm" value={sourceId} onChange={event => { if (creationDirty) setReplacementSourceId(event.target.value); else changeDraftSource(event.target.value); }}>{sources.map(item => <option key={item.id} value={item.id}>{item.storeName} · {item.channel} · {item.channelSku}</option>)}</select></div>}
        <ListingMasterCompletion verifiedSingles={mode === 'new' && verifiedStructure ? sources.map(source => source.id) : verifiedSingles} key={sourceId} product={newProduct} sources={sources} onChange={updateNewProduct} mappings={mappings} onMappingsChange={value => { setMappings(value); setCreationDirty(true); setDirty(true); }} onMediaReady={setMediaReady} onEditingChange={(editing, changed) => { setGroupEditing(editing); setGroupDirty(changed); }} creationSetup={(editingProduct, editProduct) => <section className="space-y-3 border-t pt-3" aria-label="Master SKU and product structure">
          <div className="grid gap-4 sm:grid-cols-[1fr_2fr]"><div className="space-y-2"><div className="flex items-center gap-1"><Label htmlFor="intake-sku">Master SKU <span aria-hidden="true">*</span></Label><ListingReviewHelp label="Master SKU">Unique internal code. Shop SKUs stay unchanged.</ListingReviewHelp></div><Input id="intake-sku" required className="h-11 font-mono" value={editingProduct.sku_code} onChange={event => editProduct({ ...editingProduct, sku_code: event.target.value.toUpperCase() })} /></div><fieldset className="space-y-2"><legend className="text-sm font-medium">Product type *</legend><div className="flex flex-wrap gap-2">{[{ type: 'single', label: 'Single product', Icon: Package }, { type: 'variant', label: 'With variants', Icon: Layers3 }].map(option => <label key={option.type} className={`flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm ${editingProduct.product_type === option.type ? 'border-primary bg-primary/5' : ''} ${option.type === 'single' && sources.some(source => source.variants > 1) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}><input type="radio" name="intake-product-type" value={option.type} checked={editingProduct.product_type === option.type} disabled={option.type === 'single' && sources.some(source => source.variants > 1)} onChange={() => editProduct({ ...editingProduct, has_variants: option.type === 'variant', product_type: option.type === 'variant' ? 'variant' : 'single' })} className="size-4 accent-primary" /><option.Icon className="size-4" />{option.label}</label>)}</div><p className="text-xs text-muted-foreground">{current.variants > 1 ? `${current.variants} shop SKUs detected. Review prefilled variants and SKU mapping below.` : unknownStructure ? 'Check the source SKU structure before confirming the product type.' : 'Review variant options and SKU mapping below when using variants.'}</p></fieldset></div>
        </section>} />
        {unknownStructure && <label className="flex cursor-pointer items-start gap-3 text-sm leading-6"><Checkbox className="mt-1 shrink-0" checked={verifiedStructure} onCheckedChange={checked => setVerifiedStructure(checked === true)} />Source structure is not recorded. I checked the shop listing(s) and selected the correct product structure above.</label>}
        {sources.length > 1 && <details className="rounded-lg border px-3"><summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Listings to group into this Master · {sources.length}</summary>{sources.map(item => <p key={item.id} className="border-b py-2 text-sm last:border-0">{item.title}<span className="mt-1 block text-xs text-muted-foreground">{item.storeName} · {item.channelSku} · {item.brand || 'Brand not provided'}</span></p>)}</details>}
        {sources.length > 1 && <label className="flex cursor-pointer items-start gap-3 text-sm leading-6"><Checkbox checked={acknowledged} onCheckedChange={checked => setAcknowledged(checked === true)} className="mt-1 shrink-0" />I checked that the selected listings represent this product, including model and pack size.</label>}
      </div>}
      {stage !== 'choose' && (reviewProduct || master) && <ListingChannelReadiness product={(reviewProduct || master)!} activateMaster={editingDetails} sources={sources} mappings={mappings} drafts={listingDrafts} disabled={groupEditing} onChange={value => { setListingDrafts(value); setDirty(true); }} />}
    </div>
    <div role="group" aria-label="Review actions" className={`max-h-[55dvh] shrink-0 overflow-y-auto border-t bg-background px-4 py-3 sm:px-6 ${editingDetails ? 'grid gap-x-4 gap-y-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center' : 'space-y-3'}`}>
      {groupEditing && <p role="status" className="col-span-full text-xs text-muted-foreground">Apply or cancel your edits before {groupedComparison ? 'switching listings or saving' : 'saving this Master'}.</p>}
      {mappingRecovery && !groupEditing && <p id={recoveryId} className="col-span-full text-xs leading-5 text-amber-700 dark:text-amber-300">{mappingRecovery.title}. {groupedComparison ? 'You can view another listing or link all and finish later.' : 'You can link now and finish later.'}</p>}
      {editingDetails && !groupEditing && (confirmationError || completionError || !mediaReady) && <p className="col-span-full text-xs leading-5 text-amber-700 dark:text-amber-300" role="status">{confirmationError || completionFeedback || 'Wait for the image upload to finish.'}</p>}
      {error && <p role="alert" className="col-span-full rounded-lg border border-destructive/30 p-3 text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs leading-5 text-muted-foreground"><p className="flex items-start gap-2"><Info className="mt-0.5 size-3.5 shrink-0" />{mode === 'new' ? 'Nothing is published; sync stays off.' : editingDetails ? 'Only reviewed Master changes and links are saved. Nothing is published; sync is unchanged.' : 'Link only. Master data, shop content, stock and sync stay unchanged.'}</p><span role="status">{groupedComparison ? `${reviewedCount} of ${sources.length} checked · Changes not saved` : remainingCount !== undefined ? `${remainingCount} listing${remainingCount === 1 ? '' : 's'} left to review` : `${sources.length} listing${sources.length === 1 ? '' : 's'} selected`}</span></div>
      {(stage !== 'choose' || onSkip) && <div className="col-span-full flex flex-wrap items-center justify-end gap-2">
        {groupedComparison && <nav aria-label="Browse selected listings" className="mr-auto flex items-center gap-1">
          <Button variant="ghost" className="h-11 px-2" aria-label="Previous listing" disabled={groupEditing || sourceIndex === 0} onClick={() => changeSource(sourceIndex - 1)}><ArrowLeft className="size-4" /></Button>
          <span className="text-xs tabular-nums text-muted-foreground">{sourceIndex + 1} / {sources.length}</span>
          <Button variant="ghost" className="h-11 px-2 text-xs" disabled={groupEditing || sourceIndex === sources.length - 1} onClick={() => changeSource(sourceIndex + 1)}>Next listing<ArrowRight className="size-4" /></Button>
          <ListingReviewHelp label="Browsing listings">Viewing another listing does not mark it checked or save any links. Your applied mapping choices are kept.</ListingReviewHelp>
        </nav>}
        {onSkip && <Button variant="ghost" className="mr-auto h-11" disabled={groupEditing} onClick={() => { if (dirty || groupDirty) setDiscardSkip(true); else onSkip(); }}>Skip for now</Button>}
        {stage !== 'choose' && <><Button variant="outline" className="h-11 w-full sm:w-auto" disabled={!canDefer || groupEditing} onClick={() => setDeferOpen(true)}>{deferLabel}</Button>
        <Button className="h-11 w-full sm:w-auto" aria-describedby={mappingRecovery && !groupEditing ? recoveryId : undefined} disabled={groupEditing || (editingDetails ? !reviewProduct || Boolean(confirmationError || completionError) || !mediaReady || ((mode === 'new' || stage === 'compare') && !canSave) : !canSave)} onClick={() => save()}>{stage === 'compare' && sources.some(item => item.id !== current.id && !reviewedIds.includes(item.id)) ? 'Mark checked & next' : editingDetails ? completeLabel : confirmLabel}<ArrowRight className="size-4" /></Button></>}
      </div>}
    </div>
    {summaryOpen && (reviewProduct || master) && <ListingSaveSummary product={editingDetails ? reviewProduct! : master!} baseline={mode === 'existing' ? master ?? undefined : undefined} sources={sources} mappings={mappings} listingDrafts={listingDrafts} editing={editingDetails} creating={mode === 'new'} confirmLabel={editingDetails ? completeLabel : confirmLabel} onBack={() => setSummaryOpen(false)} onConfirm={() => save(true)} />}
    <AlertDialog open={discardSkip} onOpenChange={setDiscardSkip}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Skip without saving these edits?</AlertDialogTitle><AlertDialogDescription>This listing stays in the review queue. No link or Master change will be saved.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep reviewing</AlertDialogCancel><AlertDialogAction onClick={() => { setDirty(false); onDirtyChange?.(false); onSkip?.(); }}>Discard edits & skip</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <AlertDialog open={Boolean(replacementMasterMode)} onOpenChange={open => { if (!open) setReplacementMasterMode(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Discard changes for this Master?</AlertDialogTitle><AlertDialogDescription>Your proposed Master values and SKU mappings will be discarded when you change the destination. No Master or shop data has been saved.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep reviewing</AlertDialogCancel><AlertDialogAction onClick={() => { if (replacementMasterMode === 'existing') chooseAnother(); else createNewMaster(); setReplacementMasterMode(null); }}>Discard & continue</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <AlertDialog open={Boolean(replacementSourceId)} onOpenChange={open => { if (!open) setReplacementSourceId(''); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Replace the starting listing data?</AlertDialogTitle><AlertDialogDescription>This replaces your field edits, image choices and SKU mappings with data from the selected listing. Your internal category and Master SKU are kept. To change just one field, use Change source in the mapping table instead.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep editing</AlertDialogCancel><AlertDialogAction onClick={() => changeDraftSource(replacementSourceId)}>Replace draft data</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <AlertDialog open={deferOpen} onOpenChange={setDeferOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{mode === 'new' ? 'Save a draft Master and link these listings?' : alreadyLinkedHere ? 'Save review progress for later?' : 'Link now and finish the review later?'}</AlertDialogTitle><AlertDialogDescription>{sources.length} listing{sources.length === 1 ? '' : 's'} {alreadyLinkedHere ? 'stay linked' : 'will be linked'} to {mode === 'new' ? draft.name : master?.name}. {mode === 'new' ? 'The new Master stays Draft.' : 'Existing Master details and status stay unchanged; your proposed edits are saved for review.'} Unconfirmed SKU mappings cannot be used for price or stock sync. No shop data is changed and sync is not turned on.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep reviewing</AlertDialogCancel><AlertDialogAction onClick={saveForLater}>{mode === 'new' ? 'Save draft & link' : alreadyLinkedHere ? 'Save progress' : 'Link & save progress'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <Dialog open={Boolean(zoom)} onOpenChange={open => { if (!open) setZoom(null); }}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Product image</DialogTitle><DialogDescription>{zoom?.name}</DialogDescription></DialogHeader>{zoom && <img src={zoom.src} alt={zoom.name} className="max-h-[65vh] w-full object-contain" />}</DialogContent></Dialog>
    <AlertDialog open={discardBack} onOpenChange={setDiscardBack}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Discard unsaved details?</AlertDialogTitle><AlertDialogDescription>Your Master and listing links have not changed. Go back without saving these edits?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep editing</AlertDialogCancel><AlertDialogAction onClick={onBack}>Discard &amp; go back</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </section>;
}
