import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowRight, Check, Columns3, Ellipsis, ExternalLink, LockKeyhole, Pencil, Plus, RotateCcw, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChannelLogo } from '@/components/channels/ChannelLogo';
import type { CatalogImportItem } from '@/lib/catalog-import-store';
import type { Product } from '@/lib/product-store';
import { importedFieldCandidates, MASTER_MAPPING_TARGETS, type FieldCandidate } from '@/lib/listing-field-mapping';
import { richTextPlainText } from '@/lib/product-master-readiness';
import { ListingReviewHelp } from './ListingReviewHelp';
import { ListingSkuMatrixRows, type SkuMatrixControls } from './ListingSkuMatrixRows';
import { sourceMatrixState } from '@/lib/listing-sku-matrix';
import { chainReviewTouchScroll } from '@/lib/chain-review-touch-scroll';
import { sourceImages } from '@/lib/listing-master-completion';
import { listingMatchEvidence, packTitleHint, safeListingUrl } from '@/lib/listing-match-evidence';
import { ListingThumbnail } from './ListingMappingContext';

type Row = { key: string; label: string; source: string; required?: boolean; evidence?: string };
type Props = {
  baseline: Product; product: Product; sources: CatalogImportItem[]; rows: Row[]; prefix: string;
  format: (product: Product, key: string) => string;
  text: (value: string, description?: boolean) => ReactNode;
  editingKey?: string;
  renderEditor: (row: Row) => ReactNode;
  onEdit: (key: string, source?: CatalogImportItem, field?: FieldCandidate, returnFocus?: HTMLElement) => void;
  onUse: (key: string, field: FieldCandidate, returnFocus?: HTMLElement) => void;
  onReset: (key: string) => void;
  onSetupSkus: () => void;
  skuMatrix: SkuMatrixControls; skuEditing: boolean; onSkuEditingChange: (editing: boolean) => void;
  onChange: (product: Product) => void;
  creating?: boolean;
  activationChecks?: { id: string; label: string; done: boolean }[];
  onImagePreview?: (src: string, name: string) => void;
};

function SourceFieldMenu({ label, disabled, canUse, onUse, onEdit }: {
  label: string; disabled: boolean; canUse: boolean; onUse: (returnFocus?: HTMLElement) => void; onEdit: (returnFocus?: HTMLElement) => void;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  return <DropdownMenu open={open} onOpenChange={next => { setOpen(next); setTooltipOpen(false); }}>
    <Tooltip open={tooltipOpen && !open} onOpenChange={setTooltipOpen}>
      <DropdownMenuTrigger asChild><TooltipTrigger asChild>
        <Button ref={trigger} type="button" variant="ghost" size="icon" disabled={disabled} aria-label={`Data options for ${label}`}
          className="-my-1 -mr-1 size-8 shrink-0 text-muted-foreground hover:text-foreground data-[state=open]:bg-accent data-[state=open]:text-foreground [@media(pointer:coarse)]:size-11">
          <Ellipsis className="size-4" aria-hidden="true" />
        </Button>
      </TooltipTrigger></DropdownMenuTrigger>
      <TooltipContent className="text-xs motion-reduce:animate-none">Data options</TooltipContent>
    </Tooltip>
    <DropdownMenuContent align="end" collisionPadding={12} className="min-w-48 motion-reduce:animate-none" onCloseAutoFocus={event => {
      if (trigger.current?.disabled) event.preventDefault();
    }}>
      {canUse && <DropdownMenuItem className="min-h-9 gap-2 cursor-pointer [@media(pointer:coarse)]:min-h-11" onSelect={() => onUse(trigger.current ?? undefined)}><ArrowRight className="size-4" aria-hidden="true" />Use for Master</DropdownMenuItem>}
      <DropdownMenuItem className="min-h-9 gap-2 cursor-pointer [@media(pointer:coarse)]:min-h-11" onSelect={() => onEdit(trigger.current ?? undefined)}><Pencil className="size-4" aria-hidden="true" />Change source field</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>;
}

/** Columns are presentation only: hiding a source never acknowledges or excludes it from saving. */
export function ListingGroupComparison({ baseline, product, sources, rows, prefix, format, text, editingKey, renderEditor, onEdit, onUse, onReset, onSetupSkus, skuMatrix, skuEditing, onSkuEditingChange, onChange, creating = false, activationChecks, onImagePreview }: Props) {
  const [visibleIds, setVisibleIds] = useState(() => sources.slice(0, 4).map(source => source.id));
  const [differencesOnly, setDifferencesOnly] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const [editorWidth, setEditorWidth] = useState<number>();
  useEffect(() => {
    const element = scroller.current;
    const review = element?.closest<HTMLElement>('[data-listing-review-scroll]');
    if (element && review) return chainReviewTouchScroll(element, review);
  }, []);
  useEffect(() => {
    const element = scroller.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => setEditorWidth(element.clientWidth));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const visible = sources.filter(source => visibleIds.includes(source.id));
  const locked = Boolean(editingKey) || skuEditing;
  const skuStates = Object.fromEntries(sources.map(source => [source.id, sourceMatrixState(source, product, skuMatrix.mappings[source.id], skuMatrix.verifiedSingles)]));
  const hiddenIssues = sources.filter(source => !visibleIds.includes(source.id) && skuStates[source.id].needsReview);
  const candidates = importedFieldCandidates(sources);
  const hasVariants = product.has_variants || product.product_type === 'variant';
  // Compare identity with saved data, not a proposal that may already copy a conflicting source.
  const identity = sources.map(source => ({ source, fields: listingMatchEvidence(source, baseline).filter(field => !['sku', 'structure'].includes(field.key)) }));
  const identityIssues = creating ? [] : identity.filter(item => item.fields.some(field => field.state === 'different'));
  const identityRows = rows.filter(row => identityIssues.some(item => item.fields.some(field => field.key === row.evidence && field.state === 'different')));
  const newSkus = creating ? 0 : product.skus.filter(sku => !baseline.skus.some(previous => previous.id === sku.id)).length;
  const jumpTo = (key: string, sourceId?: string) => {
    setDifferencesOnly(false);
    if (sourceId && !visibleIds.includes(sourceId)) setVisibleIds(ids => [...ids.slice(0, 3), sourceId]);
    requestAnimationFrame(() => {
      const container = scroller.current;
      const target = document.getElementById(`${prefix}-${key}${sourceId ? `-${sourceId}` : ''}`);
      if (!container || !target) return;
      container.scrollIntoView?.({ block: 'nearest', behavior: 'auto' });
      const bounds = container.getBoundingClientRect(), cell = target.getBoundingClientRect();
      container.scrollTop += cell.top - bounds.top - (container.querySelector('thead')?.getBoundingClientRect().height ?? 0);
      if (sourceId) container.scrollLeft += cell.left - bounds.left - (window.innerWidth >= 768 ? 150 : 0);
      target.focus({ preventScroll: true });
    });
  };
  const candidateFor = (row: Row, source: CatalogImportItem) => {
    const target = MASTER_MAPPING_TARGETS.find(target => target.key === row.key);
    const provenance = product.field_mappings?.[row.key]?.source;
    const key = provenance?.listingId === source.listingId && provenance.channel === source.channel && provenance.shop === source.storeName ? provenance.fieldKey : target?.sourceKey ?? (row.key.startsWith('attribute:') ? `attribute_${row.key.slice(10)}` : undefined);
    return candidates.find(field => field.source.id === source.id && field.key === key);
  };
  const sourceValue = (row: Row, source: CatalogImportItem) => {
    if (row.key === 'sku_code') return source.channelSku;
    if (row.key === 'structure') return source.variants === 0 ? 'Structure not recorded' : `${source.variants} SKU${source.variants === 1 ? '' : 's'}`;
    if (row.key === 'images') return sourceImages(source).length ? `${sourceImages(source).length} images` : '';
    const field = candidateFor(row, source);
    if (!field) return '';
    return `${row.key === 'description' ? richTextPlainText(String(field.value)) : field.value}${field.unit ? ` ${field.unit}` : ''}${field.currency ? ` ${field.currency}` : ''}`;
  };
  const normal = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
  const missingMaster = (row: Row) => Boolean(row.required && (!format(product, row.key) || row.key === 'retail_price' && hasVariants && (!product.skus.some(sku => sku.status === 'active') || product.skus.some(sku => sku.status === 'active' && !(sku.price! > 0)))));
  const different = (row: Row) => missingMaster(row) || sources.some(source => !sourceValue(row, source) || normal(sourceValue(row, source)) !== normal(format(product, row.key)));
  const fieldRows = rows.filter(row => !(creating ? ['retail_price'] : ['sku_code', 'structure', 'retail_price']).includes(row.key));
  const displayedRows = fieldRows.filter(row => !differencesOnly || row.key === editingKey || different(row) || format(product, row.key) !== format(baseline, row.key));
  const priceRow = rows.find(row => row.key === 'retail_price')!;
  const renderFieldRow = (row: Row) => {
          const value = format(product, row.key), previous = format(baseline, row.key);
          const decision = product.field_mappings?.[row.key];
          const changed = value !== previous;
          const selectionChanged = JSON.stringify(decision) !== JSON.stringify(baseline.field_mappings?.[row.key]);
          const edited = changed || selectionChanged;
          const missing = missingMaster(row);
          const editable = !['structure', 'sku_code', 'images'].includes(row.key);
          const useSource = editable && !(row.key === 'retail_price' && hasVariants);
          return <Fragment key={row.key}>
            <tr id={`${prefix}-${row.key}`} tabIndex={-1} className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:-outline-offset-2">
              <th scope="row" className="border-b border-r bg-background p-3 align-top text-xs font-medium leading-5 md:sticky md:left-0 md:z-10">{row.label}{row.required && <span className="mt-1 block font-normal text-muted-foreground">Required</span>}</th>
              {visible.map(source => {
                const field = candidateFor(row, source), sourceText = sourceValue(row, source);
                const selected = decision?.mode === 'source' && decision.source?.listingId === source.listingId && decision.source.channel === source.channel && decision.source.shop === source.storeName && String(decision.source.rawValue) === String(field?.value) && decision.source.unit === field?.unit && decision.source.currency === field?.currency;
                const mismatch = sourceText && !['sku_code', 'retail_price', 'categoryId', 'structure'].includes(row.key) && normal(sourceText) !== normal(value);
                const identityDiffers = !creating && identity.find(item => item.source.id === source.id)?.fields.some(field => field.key === row.evidence && field.state === 'different');
                return <td id={`${prefix}-${row.key}-${source.id}`} tabIndex={-1} key={source.id} className={`border-b border-r p-3 align-top focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:-outline-offset-2 ${selected ? 'bg-primary/5' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 break-words text-sm leading-5">{text(sourceText, row.key === 'description')}</div>
                    {useSource && <SourceFieldMenu label={`${row.label} in ${source.storeName} · ${source.channelSku}`} disabled={locked} canUse={Boolean(field && sourceText.trim() && !selected)}
                      onUse={returnFocus => field && onUse(row.key, field, returnFocus)} onEdit={returnFocus => onEdit(row.key, source, field, returnFocus)} />}
                  </div>
                  {field && <p className="mt-1 text-xs text-muted-foreground">Source: {field.label}</p>}
                  {identityDiffers ? <p className="mt-1 flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300"><TriangleAlert className="size-3 shrink-0" aria-hidden="true" />Differs from saved Master</p> : mismatch && <p className="mt-1 text-xs text-muted-foreground">Different value</p>}
                  {row.key === 'pack_quantity' && !sourceText && packTitleHint(source.title) && <p className="mt-1 text-xs text-muted-foreground">{packTitleHint(source.title)}</p>}
                  {row.key === 'retail_price' && <p className="mt-1 text-xs text-muted-foreground">{hasVariants ? 'Listing price · review individual SKU prices' : source.currency !== product.price_currency ? 'Different currency · no automatic conversion' : 'Shop price can differ'}</p>}
                  {selected && <p className="mt-2 flex items-center gap-1 text-xs font-medium text-primary"><Check className="size-3" aria-hidden="true" />Selected</p>}
                </td>;
              })}
              <td className="border-b bg-muted p-3 align-top md:sticky md:right-0 md:z-10">
                <div className="break-words leading-5">{text(value, row.key === 'description')}</div>
                {missing && <p className="mt-1 flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300"><TriangleAlert className="size-3.5" />Master data missing</p>}
                {changed && <div className="mt-2 break-words text-xs text-muted-foreground">{creating ? 'Initial proposal: ' : 'Current: '}{text(previous, row.key === 'description')}</div>}
                {(creating || edited) && <p className="mt-1 break-words text-xs text-muted-foreground">{decision?.mode === 'source' && decision.source ? `${decision.source.shop} · ${decision.source.fieldLabel} · Not saved` : edited ? 'Edited in this review · Not saved' : row.key === 'sku_code' ? 'Generated internal code' : value ? 'Proposed for the new Master' : ''}</p>}
                {row.key === 'pack_quantity' && !value && packTitleHint(product.name) && <p className="mt-1 text-xs text-muted-foreground">{packTitleHint(product.name)}</p>}
                <div className="mt-1 flex flex-wrap gap-2"><Button id={`${prefix}-${row.key}-edit`} variant="ghost" className="h-11 px-0 text-xs" disabled={locked} aria-label={`Edit Master ${row.label}`} aria-expanded={editingKey === row.key} onClick={() => onEdit(row.key)}><Pencil className="size-3.5" />{edited ? 'Edit change' : 'Edit'}</Button>{edited && row.key !== 'structure' && <Button variant="ghost" className="h-11 px-0 text-xs" disabled={locked} aria-label={`Undo Master ${row.label} change`} onClick={() => onReset(row.key)}><RotateCcw className="size-3.5" />Undo</Button>}</div>
              </td>
            </tr>
            {editingKey === row.key && <tr><td colSpan={visible.length + 2} className="border-b bg-background p-0"><div className="sticky left-0 max-w-full" style={{ width: editorWidth }}>{renderEditor(row)}</div></td></tr>}
          </Fragment>;

  };
  return <TooltipProvider delayDuration={200}><section aria-label="Comparison fields" className="min-w-0 overflow-hidden rounded-xl border bg-background">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
      <div><div className="flex items-center gap-1"><h3 className="text-sm font-semibold">{creating ? 'Review data for the new Master' : sources.length === 1 ? 'Compare listing data' : 'Compare all listings'}</h3><ListingReviewHelp label="Comparison fields">Each shop column is a read-only source. Open a cell’s (…) Data options to use its value for the Master or change the source field. Selected marks the source used for the shared Master value. SKU rows match the same variant across shops. Shop codes, prices and categories can differ. Missing identity details do not prove a match. Linking does not make shop values identical or turn on sync.</ListingReviewHelp></div><p className="mt-1 text-xs text-muted-foreground">{creating ? `${sources.length} listing${sources.length === 1 ? '' : 's'} → 1 new Product Master · Nothing saved yet` : 'Product details and SKU pairs in one table · Nothing saved yet'}</p></div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-xs"><Checkbox checked={differencesOnly} disabled={locked} onCheckedChange={value => setDifferencesOnly(value === true)} />Differences & missing data</label>
        {sources.length > 4 && <Popover><PopoverTrigger asChild><Button variant="outline" className="h-11 text-xs" disabled={locked}><Columns3 className="size-4" />Listings {visible.length}/{sources.length}</Button></PopoverTrigger><PopoverContent align="end" className="w-80 space-y-3"><p className="text-sm font-medium">Choose up to 4 columns</p><p className="text-xs text-muted-foreground">All {sources.length} listings remain in this group. Hidden columns are not automatically reviewed.</p><div className="max-h-72 overflow-auto">{sources.map(source => <label key={source.id} className="flex min-h-11 items-start gap-2 py-2 text-xs"><Checkbox className="mt-1" checked={visibleIds.includes(source.id)} disabled={visibleIds.includes(source.id) ? visible.length === 1 : visible.length >= 4} onCheckedChange={checked => setVisibleIds(ids => checked === true ? [...ids, source.id] : ids.filter(id => id !== source.id))} /><span className="min-w-0"><span className="block font-medium">{source.storeName} · {source.channel}</span><span className="block break-words text-muted-foreground">{source.title} · {source.channelSku}</span></span></label>)}</div></PopoverContent></Popover>}
      </div>
    </div>
    {identityIssues.length > 0 && <div role="group" aria-label="Differences to check" className="border-b bg-amber-500/5 px-4 py-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1"><p className="flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-300"><TriangleAlert className="size-4 shrink-0" />Check product identity · {identityIssues.length} of {sources.length} listing{sources.length === 1 ? '' : 's'}</p>
        {identityRows.map(row => { const affected = identityIssues.filter(item => item.fields.some(field => field.key === row.evidence && field.state === 'different')); return <Button key={row.key} variant="ghost" disabled={locked} className="h-9 px-2 text-xs underline underline-offset-4 [@media(pointer:coarse)]:h-11" onClick={() => jumpTo(row.key, affected[0].source.id)}>{row.label} differs{sources.length > 1 ? ` · ${affected.length}` : ''}<ArrowRight className="size-3" /></Button>; })}
      </div><p className="pb-1 text-xs text-muted-foreground">SKU suggestions do not confirm these listings are the same product. Review highlighted values before linking.</p>
    </div>}
    {newSkus > 0 && <div role="note" aria-label="Automatic SKU proposals" className="flex flex-wrap items-center gap-x-3 border-b bg-primary/5 px-4 py-2"><Button variant="ghost" disabled={locked} className="h-9 px-0 text-xs [@media(pointer:coarse)]:h-11" onClick={() => jumpTo('skus')}><Plus className="size-3.5" />{newSkus} new Master SKU{newSkus === 1 ? '' : 's'} proposed · Not saved<ArrowRight className="size-3" /></Button>{!baseline.has_variants && <span className="text-xs text-muted-foreground">Saving adds variants. Existing stock is preserved, not split.</span>}<ListingReviewHelp label="Automatic mapping proposals">Review the suggested pairs and prices in the SKU rows. A proposed SKU does not prove a product match. Edit or remove incorrect proposals. Prices in different currencies are not automatically converted. Nothing is saved or synced yet.</ListingReviewHelp></div>}
    {activationChecks && <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b px-4 py-3 text-xs" aria-label="Master activation requirements">{activationChecks.map(check => <span key={check.id} className={`flex items-center gap-1.5 ${check.done ? 'text-muted-foreground' : 'text-amber-700 dark:text-amber-300'}`}>{check.done ? <Check className="size-3.5" /> : <TriangleAlert className="size-3.5" />}{({ identity: 'Title', sku: 'SKU', content: 'Description', price: 'Price' })[check.id as 'identity']}</span>)}<ListingReviewHelp label="Master activation">Title, unique SKU(s), description and valid price(s) are required to activate. You can save a Draft if something is missing. Channel requirements only affect that listing’s sync.</ListingReviewHelp></div>}
    {visible.length < sources.length && <p className="border-b bg-muted/20 px-4 py-2 text-xs text-muted-foreground">Showing {visible.length} of {sources.length} listings · {sources.length - visible.length} hidden. Saving still checks the entire group.</p>}
    {hiddenIssues.length > 0 && <div role="status" aria-label="Hidden listings need SKU review" className="flex flex-wrap items-center gap-x-3 border-b bg-amber-500/5 px-4 py-2"><p className="text-xs text-amber-700 dark:text-amber-300">{hiddenIssues.length} hidden listing(s) need SKU review:</p>{hiddenIssues.map(source => <Button key={source.id} variant="ghost" className="h-11 px-0 text-xs" disabled={locked} aria-label={`Show SKU review for ${source.storeName} · ${source.channelSku}`} onClick={() => setVisibleIds(ids => [...ids.slice(0, 3), source.id])}>{source.storeName} · {source.channelSku} — Show</Button>)}</div>}
    <p className="border-b px-4 py-2 text-xs text-muted-foreground md:hidden">Scroll sideways to compare shops and the Master result.</p>
    {/* Hand vertical scrolling to the review at either edge; keep horizontal gestures inside the matrix. */}
    <div ref={scroller} className="max-h-[68dvh] overflow-auto overscroll-x-contain overscroll-y-auto" tabIndex={0} role="region" aria-label="Scroll to compare listing fields">
      <table aria-label="Product identity comparison" className="w-full table-fixed border-separate border-spacing-0 text-left text-sm" style={{ minWidth: 150 + visible.length * 220 + 270 }}>
        <colgroup><col style={{ width: 150 }} />{visible.map(source => <col key={source.id} />)}<col style={{ width: visible.length === 1 ? 'calc((100% - 150px) / 2)' : 270 }} /></colgroup>
        <thead className="sticky top-0 z-30"><tr>
          <th scope="col" className="border-b border-r bg-muted p-3 align-top text-xs font-medium md:sticky md:left-0 md:z-20">Master field</th>
          {visible.map(source => {
            const state = skuStates[source.id], href = safeListingUrl(source.listingUrl);
            const missingIdentity = identity.find(item => item.source.id === source.id)!.fields.filter(field => field.state === 'missing');
            return <th key={source.id} scope="col" className="border-b border-r bg-background p-3 align-top font-normal">
              <div className="flex items-start gap-2"><ListingThumbnail listing={source} onZoom={onImagePreview} /><div className="min-w-0"><p className="break-words text-xs font-medium leading-5">{source.title}</p><div className="mt-1 flex items-center gap-1.5"><ChannelLogo channel={{ key: source.channel }} size="sm" /><span className="break-words text-xs text-muted-foreground">{source.storeName} · <span className="capitalize">{source.channel}</span></span></div></div></div>
              <p className="mt-2 break-all font-mono text-xs text-muted-foreground">{source.channelSku || 'SKU not provided'}</p>
              {!creating && missingIdentity.length > 0 && <p className="mt-1 text-xs text-muted-foreground">{missingIdentity.length} identity fields unverified</p>}
              <div className="mt-1 flex items-center gap-1"><p className={`text-xs ${state.needsReview ? 'text-amber-700 dark:text-amber-300' : 'text-muted-foreground'}`}>{state.verifiedWithoutSku ? 'Single product verified · SKU not recorded' : `${state.matched}/${source.variants || state.items.length} SKU pairs proposed${state.unknown ? ' · Verify structure' : ''}`}</p><ListingReviewHelp label={`Review status for ${source.storeName} · ${source.channelSku}`}>Proposed pairs are not confirmed product matches. {missingIdentity.length > 0 ? `Identity not fully verified. Missing: ${missingIdentity.map(field => field.label).join(', ')}. ` : ''}Review the product identity and SKU pairs before saving. Shop and Master codes can differ.</ListingReviewHelp></div>
              {href && <a className="mt-1 inline-flex min-h-8 items-center gap-1 text-xs underline underline-offset-4" href={href} target="_blank" rel="noopener noreferrer">Open source listing<ExternalLink className="size-3" /></a>}
            </th>;
          })}
          <th scope="col" className="border-b bg-muted p-3 align-top md:sticky md:right-0 md:z-20"><p className="text-xs font-semibold">{creating ? 'New Master · value to create' : 'Master · value to save'}</p><p className="mt-1 text-xs font-normal text-muted-foreground">One shared result · Not saved</p>{!creating && <p className="mt-2 text-xs font-normal leading-5 text-muted-foreground">Current Master values are kept unless edited.</p>}{!creating && <div className="mt-2 flex items-start gap-1 text-xs font-normal text-muted-foreground"><LockKeyhole className="mt-1 size-3 shrink-0" /><span className="min-w-0 break-all font-mono">{product.sku_code}</span><ListingReviewHelp label="Master SKU identity">This is the internal product code, not a variant match. It stays unchanged. Match sellable SKUs in the SKU & variants rows.</ListingReviewHelp></div>}</th>
        </tr></thead>
        <tbody>{displayedRows.filter(row => row.required).map(renderFieldRow)}</tbody>
        <ListingSkuMatrixRows id={`${prefix}-skus`} {...skuMatrix} creating={creating} product={product} baseline={baseline} sources={sources} visible={visible} disabled={Boolean(editingKey)} editorWidth={editorWidth}
          onUsePrice={source => { const field = candidateFor(priceRow, source); if (field) onUse('retail_price', field); }} onUndoPrices={() => onReset('retail_price')}
          onChange={onChange} onSetup={onSetupSkus} onEditingChange={onSkuEditingChange} onEditPrices={() => onEdit('retail_price')} priceEditor={editingKey === 'retail_price' ? renderEditor(priceRow) : undefined} />
        <tbody>{displayedRows.filter(row => !row.required).map(renderFieldRow)}</tbody>
      </table>
      {!displayedRows.length && <p className="p-4 text-xs text-muted-foreground">No product field differences. SKU pairs remain visible for review.</p>}
    </div>
  </section></TooltipProvider>;
}
