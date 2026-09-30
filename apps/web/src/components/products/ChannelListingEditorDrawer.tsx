import { Children, cloneElement, createContext, isValidElement, useContext, useEffect, useId, useMemo, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, ChevronDown, Circle, Link2, RefreshCw, Save, Send, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import type { ChannelWizardDraft, WizardChannel } from './ChannelListingWizard';
import { ListingPricingFields } from './ListingPricingFields';
import { confirmedPricing, formatPrice, quoteListingPrice } from '@/lib/pricing-rules';
import { usePricingRevision } from '@/hooks/use-pricing';
import { listingEditorIssues, listingInventoryPreview, prefillListingDraft, type ListingEditorTab, type ListingInventorySource, type ListingIssue } from './listing-editor-state';

type EditorTab = ListingEditorTab;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: WizardChannel | null;
  draft: ChannelWizardDraft | null;
  masterSku: string;
  productName?: string;
  rakutenBrandName?: string;
  basePrice?: number;
  baseCurrency?: string;
  productVariants?: Array<{ id: string; label: string; sku: string }>;
  inventorySources?: ListingInventorySource[];
  masterImages?: string[];
  onUploadMasterImage?: (file: File) => Promise<void>;
  uploadingImages?: boolean;
  masterMissingItems?: Array<{ id: string; label: string }>;
  onEditMaster?: (checkId: string) => void;
  masterPersisted: boolean;
  masterHasUnsavedChanges: boolean;
  masterDataComplete: boolean;
  masterBlockingReason?: string;
  onSaveMaster: () => boolean;
  onSave: (patch: Partial<ChannelWizardDraft>) => void;
  onPublish?: (draft: ChannelWizardDraft) => Promise<void>;
}

const TABS: Array<{ value: EditorTab; label: string }> = [
  { value: 'listing', label: 'Listing' },
  { value: 'sku-mapping', label: 'SKU mapping' },
  { value: 'variants-media', label: 'Variants & channel media' },
  { value: 'price-inventory', label: 'Price & inventory' },
  { value: 'requirements', label: 'Channel requirements' },
];
const FieldIssuesContext = createContext<ListingIssue[]>([]);

export function ChannelListingEditorDrawer({ open, onOpenChange, channel, draft, masterSku, productName = '', rakutenBrandName = '', basePrice, baseCurrency = 'JPY', productVariants = [], inventorySources = [], masterImages = [], onUploadMasterImage, uploadingImages = false, masterMissingItems, onEditMaster, masterPersisted, masterHasUnsavedChanges, masterDataComplete, masterBlockingReason, onSaveMaster, onSave, onPublish }: Props) {
  usePricingRevision();
  const [form, setForm] = useState<ChannelWizardDraft | null>(draft);
  const listingVariants = useMemo(() => productVariants.length ? productVariants : [{ id: 'default', label: 'Default SKU', sku: masterSku }], [masterSku, productVariants]);
  const [variants, setVariants] = useState<string[]>([]);
  const [tab, setTab] = useState<EditorTab>('listing');
  const [publishing, setPublishing] = useState(false);
  const [providerError, setProviderError] = useState<string | null>(null);
  const [published, setPublished] = useState(false);
  const [baseline, setBaseline] = useState('');
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [inventoryExpanded, setInventoryExpanded] = useState(false);
  const [focusField, setFocusField] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const originalFormRef = useRef<ChannelWizardDraft | null>(draft);
  const reviewedSignatureRef = useRef('');
  const [reviewError, setReviewError] = useState('');
  const initializedForRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      initializedForRef.current = null;
      return;
    }
    if (!channel || initializedForRef.current === channel.key) return;
    initializedForRef.current = channel.key;
    const savedVariantIds = draft?.selected_variant_ids;
    const initialVariants = savedVariantIds ? listingVariants.filter(variant => savedVariantIds.includes(variant.id)).map(variant => variant.id) : listingVariants.map(variant => variant.id);
    const initialForm = draft ? prefillListingDraft(draft, channel.key, masterSku, productName, rakutenBrandName) : null;
    setForm(initialForm);
    originalFormRef.current = draft;
    setVariants(initialVariants);
    setBaseline(JSON.stringify({ form: draft, variants: [...initialVariants].sort() }));
    setSavedAt(null);
    setTab('listing');
    setProviderError(null); setPublished(false); setReviewError(''); setInventoryExpanded(false); setFocusField(null);
  }, [channel, draft, listingVariants, open, masterSku, productName, rakutenBrandName]);

  useEffect(() => { contentRef.current?.scrollTo?.({ top: 0 }); }, [tab]);
  useEffect(() => {
    if (!focusField) return;
    const element = contentRef.current?.querySelector<HTMLElement>(`[data-field="${focusField}"]`);
    element?.scrollIntoView({ block: 'center', behavior: 'auto' });
    (element?.querySelector<HTMLElement>('input, select, textarea, button') ?? element)?.focus();
    setFocusField(null);
  }, [tab, focusField]);

  if (!channel || !form) return null;
  const Icon = channel.icon;
  const isMarketplace = ['amazon', 'shopee', 'lazada', 'tiktok', 'rakuten'].includes(channel.key);
  const patch = (next: Partial<ChannelWizardDraft>) => { setForm(current => current ? { ...current, ...next } : current); setPublished(false); setProviderError(null); };
  const quote = basePrice === undefined ? undefined : quoteListingPrice(basePrice, baseCurrency, form);
  const inventory = listingInventoryPreview(form, inventorySources, variants, channel.key);
  const blockers = listingEditorIssues(form, channel.key, variants, quote, inventory);
  const missingMaster = masterDataComplete ? [] : masterMissingItems?.length ? masterMissingItems : [{ id: 'master', label: masterBlockingReason || 'Complete required Product Master data' }];
  const remainingCount = blockers.length + missingMaster.length;
  const goToIssue = (issue: ListingIssue) => { if (issue.tab === 'price-inventory' && issue.field !== 'price') setInventoryExpanded(true); setTab(issue.tab); setFocusField(issue.field); };
  const goToNext = () => blockers.length ? goToIssue(blockers[0]) : setTab('master');
  const serializedState = JSON.stringify({ form, variants: [...variants].sort() });
  const hasUnsavedChanges = Boolean(baseline && serializedState !== baseline);
  const draftPatch = () => ({ ...form, variant_scope: variants.length === listingVariants.length ? 'all' : 'selected', selected_variant_ids: variants });
  const save = () => {
    onSave(draftPatch());
    originalFormRef.current = draftPatch();
    setBaseline(serializedState);
    setSavedAt(Date.now());
  };
  const requestClose = () => {
    if (publishing || uploadingImages) return;
    if (hasUnsavedChanges && !window.confirm('Discard unsaved listing changes? Master edits remain in the product draft.')) return;
    onOpenChange(false);
  };
  const reviewSignature = JSON.stringify([quote, inventory.quantity, masterImages, masterHasUnsavedChanges, masterSku, productName]);
  const openReview = () => { reviewedSignatureRef.current = reviewSignature; setReviewError(''); setTab('review'); };
  const confirmReview = async () => {
    if (remainingCount) { goToNext(); return; }
    if (reviewedSignatureRef.current !== reviewSignature) { reviewedSignatureRef.current = reviewSignature; setReviewError('Source data changed. Review the updated values below, then confirm again.'); return; }
    if ((!masterPersisted || masterHasUnsavedChanges) && !onSaveMaster()) { setReviewError('Product Master could not be saved. Your listing draft is still here.'); return; }
    const reviewed = { ...draftPatch(), ...(quote && !quote.error ? confirmedPricing(form, quote) : {}), ...(inventory.quantity !== null ? { stock_quantity: String(inventory.quantity) } : {}) };
    setProviderError(null); setPublishing(true);
    try {
      onSave(reviewed); setForm(reviewed); setBaseline(JSON.stringify({ form: reviewed, variants: [...variants].sort() })); setSavedAt(Date.now());
      if (onPublish) { await onPublish(reviewed); setPublished(true); }
      else { setReviewError('Reviewed draft saved. No update was sent to the channel.'); }
    } catch (error) { setProviderError(error instanceof Error ? error.message : 'Could not send the listing. Please try again.'); }
    finally { setPublishing(false); }
  };

  return <Sheet open={open} onOpenChange={nextOpen => { if (!nextOpen) requestClose(); }}>
    <SheetContent side="right" className="flex h-dvh w-full flex-col gap-0 overflow-hidden p-0 sm:w-[calc(100vw-32px)] sm:max-w-[1200px]" onEscapeKeyDown={event => { if (publishing || uploadingImages) event.preventDefault(); }}>
      <FieldIssuesContext.Provider value={blockers}>
      <SheetHeader className="shrink-0 border-b px-4 py-4 pr-12 text-left sm:px-6 sm:pr-14">
        <div className="flex items-center gap-3">
          <span className={`grid size-10 place-items-center rounded-lg ${channel.iconClassName}`}><Icon className="size-5" /></span>
          <div className="min-w-0 flex-1"><SheetTitle>{channel.label} listing</SheetTitle><SheetDescription className="truncate">{channel.account ?? channel.description} · {form.listing_sku || 'Complete listing setup'}</SheetDescription></div>
          <span className="shrink-0 text-xs text-muted-foreground">{published ? 'Submitted' : 'Draft'}</span>
        </div>
      </SheetHeader>

      {!masterDataComplete && tab !== 'master' && <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b px-4 py-2 text-sm sm:px-6"><AlertTriangle className="size-4 shrink-0 text-amber-700 dark:text-amber-300" /><span className="min-w-0 flex-1 text-muted-foreground">Master: {missingMaster[0]?.label}{missingMaster.length > 1 ? ` · +${missingMaster.length - 1} more` : ''}</span><Button type="button" variant="ghost" size="sm" onClick={() => setTab('master')}>{missingMaster[0]?.id === 'media' ? 'Add images' : 'Complete Master'}</Button></div>}

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <nav className="flex shrink-0 gap-1 overflow-x-auto border-b px-3 py-2 md:w-[192px] md:flex-col md:overflow-y-auto md:overflow-x-hidden md:border-b-0 md:border-r md:py-5" aria-label="Listing editor sections">
          {TABS.map(item => { const issues = blockers.filter(issue => issue.tab === item.value); return <button key={item.value} type="button" aria-current={tab === item.value ? 'page' : undefined} onClick={() => issues.length ? goToIssue(issues[0]) : setTab(item.value)} className={`flex min-h-11 shrink-0 items-center gap-2 rounded-md px-3 text-left text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${tab === item.value ? 'bg-primary/10 text-foreground' : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'}`}><span className="min-w-0 flex-1">{item.label}</span>{issues.length > 0 && <span className="shrink-0 text-xs text-amber-800 dark:text-amber-300" aria-label={`${issues.length} missing`}>{issues.length}</span>}</button>; })}
          {missingMaster.length > 0 && <button type="button" onClick={() => setTab('master')} aria-current={tab === 'master' ? 'page' : undefined} className={`flex min-h-11 shrink-0 items-center gap-2 rounded-md px-3 text-left text-sm focus-visible:ring-2 focus-visible:ring-ring ${tab === 'master' ? 'bg-primary/10' : 'text-muted-foreground hover:bg-muted/40'}`}><span className="flex-1">Master requirements</span><span className="text-xs text-amber-800 dark:text-amber-300">{missingMaster.length}</span></button>}
        </nav>
        <div ref={contentRef} className="min-h-0 min-w-0 flex-1 space-y-5 overflow-y-auto p-4 md:p-6" aria-label="Listing setup content">
          {blockers.some(issue => issue.tab === tab) && <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"><span className="text-muted-foreground">Complete in this section:</span>{blockers.filter(issue => issue.tab === tab).map(issue => <button key={issue.field} type="button" onClick={() => goToIssue(issue)} className="min-h-9 rounded px-1 text-amber-800 underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring dark:text-amber-300">{issue.label}</button>)}</div>}
          {tab === 'listing' && <Section title="Listing identity & content" description="Inherited Product Master values remain unchanged; edits apply only to this store listing.">
            <Field label="Master SKU"><Input readOnly value={masterSku} className="bg-muted/40 font-mono" /></Field>
            <Field label={`${channel.label} parent listing SKU *`} helper="The parent-owned identifier for this channel listing."><Input value={form.listing_sku} onChange={event => patch({ listing_sku: event.target.value.toUpperCase() })} className="font-mono uppercase" /></Field>
            {channel.key === 'webstore' && <><Field label="Storefront URL *"><Input value={form.web_slug} onChange={event => patch({ web_slug: event.target.value })} placeholder="/products/product-name" /></Field><Field label="Visibility"><SelectControl value={form.visibility} onChange={value => patch({ visibility: value })} options={[['public', 'Public'], ['scheduled', 'Scheduled'], ['hidden', 'Hidden']]} /></Field><Field label="SEO title" wide><Input value={form.title} onChange={event => patch({ title: event.target.value })} /></Field><Field label="SEO description" wide><Textarea rows={4} value={form.description} onChange={event => patch({ description: event.target.value })} placeholder="Leave empty to inherit Product Master content" /></Field></>}
            {channel.key === 'pos' && <><Field label="POS barcode *"><Input value={form.pos_barcode} onChange={event => patch({ pos_barcode: event.target.value })} /></Field><Field label="Sell at locations"><Input value={form.warehouse} onChange={event => patch({ warehouse: event.target.value })} placeholder="All retail locations" /></Field><Field label="Receipt name" wide><Input value={form.title} onChange={event => patch({ title: event.target.value })} /></Field></>}
            {channel.key === 'social' && <><Field label="Sales visibility *"><SelectControl value={form.visibility} onChange={value => patch({ visibility: value })} options={[["agents", "All sales agents"], ["teams", "Selected teams"], ["hidden", "Hidden"]]} /></Field><Field label="Suggested reply title"><Input value={form.title} onChange={event => patch({ title: event.target.value })} /></Field><Field label="Sales description" wide><Textarea rows={4} value={form.description} onChange={event => patch({ description: event.target.value })} placeholder="Describe how agents should present this product" /></Field></>}
            {isMarketplace && <><Field label="Channel title" wide><Input value={form.title} onChange={event => patch({ title: event.target.value })} /></Field><Field label="Channel description" wide><Textarea rows={4} value={form.description} onChange={event => patch({ description: event.target.value })} placeholder="Leave empty to inherit Product Master content" /></Field></>}
          </Section>}

          {tab === 'sku-mapping' && <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border bg-muted/20 p-4"><p className="text-xs text-muted-foreground">Product Master</p><p className="mt-1 truncate text-sm font-semibold">{masterSku}</p></div>
              <div className="rounded-xl border bg-muted/20 p-4"><p className="text-xs text-muted-foreground">Channel listing</p><p className="mt-1 truncate font-mono text-sm font-semibold">{form.listing_sku || 'Not configured'}</p></div>
              <div className="rounded-xl border bg-muted/20 p-4"><p className="text-xs text-muted-foreground">Mapping coverage</p><p className="mt-1 text-sm font-semibold">{variants.length}/{listingVariants.length} SKUs mapped</p></div>
            </div>
            <section className="overflow-hidden rounded-xl border">
              <header className="flex flex-col gap-3 border-b bg-muted/20 px-5 py-4 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><h3 className="text-sm font-semibold">Product & SKU mapping</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Connect each sellable Master SKU to the child SKU used by this channel listing.</p></div><Badge variant="outline" className={variants.length === listingVariants.length ? 'border-emerald-500/30 text-emerald-500' : 'border-amber-500/30 text-amber-500'}>{variants.length === listingVariants.length ? 'All mapped' : `${listingVariants.length - variants.length} need mapping`}</Badge></header>
              <div className="divide-y">
                {listingVariants.map((variant, index) => { const mapped = variants.includes(variant.id); const channelSku = listingVariants.length === 1 ? form.listing_sku : `${form.listing_sku}-${String(index + 1).padStart(2, '0')}`; return <div key={variant.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_24px_minmax(0,1fr)_auto] sm:items-center"><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Master variant</p><p className="mt-1 truncate text-sm font-medium">{variant.label}</p><p className="truncate font-mono text-xs text-muted-foreground">{variant.sku}</p></div><Link2 className={mapped ? 'hidden size-4 text-emerald-500 sm:block' : 'hidden size-4 text-muted-foreground sm:block'} /><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{channel.label} variant</p>{mapped ? <><p className="mt-1 truncate text-sm font-medium">{variant.label}</p><p className="truncate font-mono text-xs text-muted-foreground">{channelSku}</p></> : <p className="mt-1 text-sm text-muted-foreground">Not connected</p>}</div><div className="flex items-center justify-between gap-2 sm:justify-end">{mapped ? <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-500">Mapped</Badge> : <Button type="button" size="sm" variant="outline" onClick={() => setVariants(current => [...new Set([...current, variant.id])])}>Include & map</Button>}</div></div>; })}
              </div>
            </section>
            <p className="rounded-lg bg-primary/5 p-3 text-xs leading-5 text-muted-foreground">Variant inclusion controls which mappings are published. Removing a variant from this listing keeps the Master SKU unchanged.</p>
          </div>}

          {tab === 'variants-media' && <div className="space-y-5">
            <Section title="Variants to publish" description="Choose the sellable child SKUs included in this parent-owned listing.">
              <div data-field="variants" className="space-y-3 sm:col-span-2">{listingVariants.map(variant => { const checked = variants.includes(variant.id); return <label key={variant.id} className="flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border p-4 hover:bg-muted/20"><Checkbox checked={checked} onCheckedChange={next => setVariants(current => next ? [...new Set([...current, variant.id])] : current.filter(id => id !== variant.id))} /><span className="grid size-9 place-items-center rounded-lg border bg-muted"><Circle className="size-4" /></span><span className="min-w-0 flex-1"><strong className="block text-sm">{variant.label}</strong><span className="font-mono text-xs text-muted-foreground">{variant.sku}</span></span><span className="text-xs text-muted-foreground">{checked ? 'Included' : 'Excluded'}</span></label>; })}</div>
              {!variants.length && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive sm:col-span-2">Include at least one variant before publishing.</p>}
            </Section>
            <Section title="Channel media override" description="Inherit canonical Product Master media by default, or define a channel-specific selection.">
              <Field label="Media selection"><SelectControl value={form.media_scope} onChange={value => patch({ media_scope: value })} options={[['all', 'Use all Product Master images'], ['selected', 'Choose Product Master images'], ['custom', 'Use channel-only media']]} /></Field>
              {['tiktok', 'rakuten'].includes(channel.key) && <Field label={channel.key === 'tiktok' ? 'Product video' : 'R-Cabinet media'}><Input value={form.video_url} onChange={event => patch({ video_url: event.target.value })} placeholder="Select an asset or enter a URL" /></Field>}
            </Section>
          </div>}

          {tab === 'price-inventory' && <div className="space-y-5">
            {basePrice !== undefined && <div data-field="price"><ListingPricingFields draft={form} basePrice={basePrice} baseCurrency={baseCurrency} shopLabel={channel.account || channel.label} onChange={patch} reviewMode="submit" /></div>}
            <section className="rounded-xl border p-5">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-sm font-semibold">Inventory & fulfillment</h3><p className="mt-2 text-lg font-semibold tabular-nums">{inventory.external ? 'Amazon manages FBA stock' : inventory.disabled ? 'Stock sync is off' : inventory.quantity === null ? 'Choose an available stock source' : `${inventory.quantity.toLocaleString()} units to send`}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{inventory.external ? 'Master stock will not overwrite Amazon inventory.' : inventory.disabled ? 'No inventory update will be sent.' : `${inventory.source?.label || 'No source selected'} · ${form.sync_policy === 'manual' ? 'Manual quantity' : 'Automatic sync'}`}</p></div><Button type="button" variant="ghost" size="sm" aria-expanded={inventoryExpanded} onClick={() => setInventoryExpanded(!inventoryExpanded)}>Adjust inventory<ChevronDown className={`size-4 ${inventoryExpanded ? 'rotate-180' : ''}`} /></Button></div>
              {(inventoryExpanded || blockers.some(issue => issue.tab === 'price-inventory' && issue.field !== 'price')) && <div className="mt-5 grid gap-4 border-t pt-5 sm:grid-cols-2">
                {channel.key === 'amazon' && <Field label="Fulfillment *"><SelectControl value={form.fulfillment} onChange={value => patch({ fulfillment: value })} options={[['FBA', 'FBA · Amazon fulfilled'], ['FBM', 'FBM · Merchant fulfilled']]} /></Field>}
                <Field label="Stock sync policy"><SelectControl value={form.sync_policy} onChange={value => patch({ sync_policy: value })} options={[['automatic', 'Automatic sync'], ['manual', 'Manual update'], ['disabled', 'Do not publish stock']]} /></Field>
                {!inventory.external && !inventory.disabled && <>
                  <Field label="Inventory source"><SelectControl value={form.warehouse} onChange={value => patch({ warehouse: value })} options={inventorySources.map(source => [source.value, source.label])} /></Field>
                  <Field label="Safety buffer"><Input type="number" min="0" step="1" value={form.safety_buffer} onChange={event => patch({ safety_buffer: event.target.value })} /></Field>
                  <Field label="Channel allocation cap" helper="Leave empty for no cap. Zero sends no stock."><Input type="number" min="0" step="1" value={form.allocation_cap} onChange={event => patch({ allocation_cap: event.target.value })} /></Field>
                  {form.sync_policy === 'manual' && <Field label="Quantity to send *" helper="A listing quantity, not a warehouse stock adjustment."><Input type="number" min="0" step="1" value={form.stock_quantity} onChange={event => patch({ stock_quantity: event.target.value })} /></Field>}
                  {form.sync_policy === 'automatic' && <p className="text-xs leading-5 text-muted-foreground sm:col-span-2">{inventory.available === null ? 'No complete stock record for this source.' : `${inventory.available} recorded units − ${form.safety_buffer || 0} buffer${form.allocation_cap.trim() ? `, capped at ${form.allocation_cap}` : ''}. Preview only; warehouse stock stays unchanged.`}</p>}
                </>}
              </div>}
            </section>
          </div>}

          {tab === 'requirements' && <div className="space-y-5">
            {!isMarketplace && <div className="rounded-xl border border-dashed p-6 text-center"><p className="font-semibold">No additional marketplace requirements</p><p className="mt-1 text-sm text-muted-foreground">This channel is ready once its listing, variant, media, price and inventory setup is complete.</p></div>}
            {isMarketplace && <Section title={`${channel.label} requirements`} description="These fields are channel-owned and change with the selected provider category.">
              {channel.key === 'amazon' && <><Field label="Amazon listing mode"><SelectControl value={form.listing_mode} onChange={value => patch({ listing_mode: value })} options={[['offer_only', 'Offer on existing ASIN'], ['new_listing', 'Create a new Amazon listing']]} /></Field><Field label="ASIN / catalog match *"><Input value={form.identifier} onChange={event => patch({ identifier: event.target.value.toUpperCase() })} placeholder="ASIN, EAN, UPC, GTIN, JAN or ISBN" /></Field><Field label="Condition *"><SelectControl value={form.condition} onChange={value => patch({ condition: value })} options={[['new_new', 'New'], ['used_like_new', 'Used — Like new'], ['used_very_good', 'Used — Very good']]} /></Field><Field label="Search terms"><Input value={form.search_terms} onChange={event => patch({ search_terms: event.target.value })} /></Field><Field label="Bullet points" wide><Textarea rows={4} value={form.bullet_points} onChange={event => patch({ bullet_points: event.target.value })} placeholder="One benefit per line" /></Field></>}
              {channel.key !== 'amazon' && <Field label={`${channel.label} category *`} helper="Determines the required provider attributes."><Input value={form.category} onChange={event => patch({ category: event.target.value })} placeholder={`Search ${channel.label} category`} /></Field>}
              {['shopee', 'lazada'].includes(channel.key) && <Field label="Shipping option *"><SelectControl value={form.shipping_option} onChange={value => patch({ shipping_option: value })} options={channel.key === 'shopee' ? [['shopee_xpress', 'Shopee Xpress'], ['seller', 'Seller shipping'], ['pickup', 'Store pickup']] : [['fbl', 'Fulfilled by Lazada'], ['seller', 'Seller fulfilled']]} /></Field>}
              {channel.key === 'shopee' && <Field label="Pre-order days"><Input type="number" min="0" value={form.preorder_days} onChange={event => patch({ preorder_days: event.target.value })} /></Field>}
              {channel.key === 'lazada' && <><Field label="Brand"><Input value={form.brand} onChange={event => patch({ brand: event.target.value })} /></Field><Field label="Warranty"><Input value={form.warranty} onChange={event => patch({ warranty: event.target.value })} /></Field></>}
              {channel.key === 'tiktok' && <Field label="Certification"><Input value={form.certification} onChange={event => patch({ certification: event.target.value })} /></Field>}
              {channel.key === 'rakuten' && <><Field label="Rakuten brand name" helper="Suggestion only — not checked with Rakuten. Edit for this listing without changing Brand settings."><Input value={form.brand} onChange={event => patch({ brand: event.target.value })} /></Field><Field label="Catalog ID *"><Input value={form.identifier} onChange={event => patch({ identifier: event.target.value })} placeholder="JAN, GTIN or Rakuten catalog ID" /></Field></>}
              <Field label="Material"><Input value={form.attribute_material} onChange={event => patch({ attribute_material: event.target.value })} placeholder="Loaded from selected category" /></Field>
              <Field label="Color / pattern"><Input value={form.attribute_color} onChange={event => patch({ attribute_color: event.target.value })} placeholder="Loaded from selected category" /></Field>
              <Field label="Tax code"><Input value={form.tax_code} onChange={event => patch({ tax_code: event.target.value })} /></Field>
              <Field label="Compliance notes" wide><Textarea rows={3} value={form.compliance_notes} onChange={event => patch({ compliance_notes: event.target.value })} placeholder="Warnings, certifications or provider requirements" /></Field>
            </Section>}
          </div>}

          {tab === 'master' && <section className="space-y-5 rounded-xl border p-5"><div><h3 className="font-semibold">Complete Product Master</h3><p className="mt-1 text-sm text-muted-foreground">Your listing edits stay here. Master changes are shared with other listings and are saved only when you confirm.</p></div>
            {(missingMaster.some(item => item.id === 'media') || onUploadMasterImage) && <div className="space-y-3"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium">Product images</p><span className="text-xs text-muted-foreground">{masterImages.length}/3 required · 9 max</span></div><div className="grid grid-cols-3 gap-3 sm:grid-cols-5">{masterImages.map((url, index) => <img key={`${url}:${index}`} src={url} alt={`Master product image ${index + 1}`} className="aspect-square w-full rounded-lg border object-cover" />)}</div>
              {onUploadMasterImage && masterImages.length < 9 && <label className={`flex min-h-24 items-center justify-center gap-3 rounded-lg border border-dashed px-4 text-sm focus-within:ring-2 focus-within:ring-ring ${uploadingImages ? 'text-muted-foreground' : 'cursor-pointer hover:bg-muted/30'}`}><Upload className="size-5" /><span>{uploadingImages ? 'Uploading images…' : 'Add product images'}</span><input type="file" multiple accept="image/*" aria-label="Add Master images" disabled={uploadingImages} className="sr-only" onChange={async event => { const files = Array.from(event.currentTarget.files ?? []).slice(0, 9 - masterImages.length); event.currentTarget.value = ''; for (const file of files) await onUploadMasterImage(file); }} /></label>}
              <p className="text-xs text-muted-foreground">Images are added to the Master draft, not just this listing.</p>
            </div>}
            {missingMaster.filter(item => item.id !== 'media').map(item => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-t pt-4"><p className="text-sm">{item.label}</p>{onEditMaster && <Button type="button" variant="outline" onClick={() => { save(); onEditMaster(item.id); }}>Save draft &amp; edit Master</Button>}</div>)}
            {!missingMaster.length && <p role="status" className="flex items-center gap-2 text-sm"><CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />Master requirements complete.</p>}
          </section>}
          {tab === 'review' && <section className="space-y-5"><div><h3 className="text-lg font-semibold">Review {channel.label} listing</h3><p className="mt-1 text-sm text-muted-foreground">Check the values below before confirming. Nothing is sent while you edit.</p></div>
            {remainingCount > 0 && <p role="alert" className="text-sm text-amber-800 dark:text-amber-300">Source data changed. Complete the remaining requirements before confirming.</p>}
            <div className="grid gap-4 rounded-xl border p-5 sm:grid-cols-2"><div><p className="text-xs text-muted-foreground">Listing SKU</p><p className="mt-1 break-all text-sm font-medium">{form.listing_sku}</p></div><div><p className="text-xs text-muted-foreground">Selling price</p><p className="mt-1 text-sm font-medium">{quote?.error || (quote ? formatPrice(quote.amount, quote.currency) : formatPrice(form.channel_price, form.channel_currency))}</p></div><div><p className="text-xs text-muted-foreground">Quantity to send</p><p className="mt-1 text-sm font-medium">{inventory.external ? 'Managed by Amazon FBA' : inventory.disabled ? 'Stock sync off' : inventory.quantity === null ? 'Unavailable' : `${inventory.quantity} units`}</p></div><div><p className="text-xs text-muted-foreground">Included SKUs</p><p className="mt-1 text-sm font-medium">{variants.length} of {listingVariants.length}</p></div></div>
            <ReviewChanges before={originalFormRef.current} after={form} price={quote && !quote.error ? formatPrice(quote.amount, quote.currency) : undefined} />
            {(!masterPersisted || masterHasUnsavedChanges) && <p className="rounded-lg border p-4 text-sm">Confirming also saves your current Product Master edits, including any images added here. These are shared Master data.</p>}
            {!onPublish && <p className="text-sm text-muted-foreground">Live publishing is not connected in this preview. You can save the reviewed draft; no update will be sent to the channel.</p>}
            {reviewError && <p role="status" className="text-sm">{reviewError}</p>}
            {providerError && <p role="alert" className="text-sm text-destructive">{providerError}</p>}
            {published && <p role="status" className="text-sm">Listing submitted. Marketplace approval is handled by the channel.</p>}
          </section>}
        </div>
      </div>

      <SheetFooter className="shrink-0 flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <span className="text-xs text-muted-foreground" aria-live="polite">{remainingCount ? `${remainingCount} ${remainingCount === 1 ? 'item' : 'items'} to complete` : hasUnsavedChanges ? 'Unsaved listing changes' : savedAt ? 'Draft saved' : 'Ready for review'}</span>
        <div className="flex flex-wrap items-center justify-end gap-2"><Button type="button" variant="ghost" disabled={publishing || uploadingImages} onClick={requestClose}>Close</Button><Button type="button" variant="outline" disabled={!hasUnsavedChanges || publishing} onClick={save}><Save className="size-4" />Save draft</Button><Button type="button" disabled={publishing || uploadingImages || published} onClick={() => remainingCount ? goToNext() : tab === 'review' ? void confirmReview() : openReview()}>{publishing ? <RefreshCw className="size-4 animate-spin" /> : tab === 'review' && !remainingCount ? <Send className="size-4" /> : <ArrowRight className="size-4" />}{publishing ? 'Saving…' : remainingCount ? 'Complete next item' : tab === 'review' ? onPublish ? 'Confirm & publish' : 'Save reviewed draft' : 'Review & publish'}</Button></div>
      </SheetFooter>
      </FieldIssuesContext.Provider>
    </SheetContent>
  </Sheet>;
}

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <section className="rounded-xl border"><header className="border-b bg-muted/20 px-5 py-4"><h3 className="text-sm font-semibold">{title}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p></header><div className="grid gap-4 p-5 sm:grid-cols-2">{children}</div></section>;
}

function Field({ label, helper, children, wide = false }: { label: string; helper?: string; children: ReactNode; wide?: boolean }) {
  const id = useId();
  const issues = useContext(FieldIssuesContext);
  const cleanLabel = label.replace(/\s*\*$/, '');
  const fields: Record<string, string> = { 'Storefront URL': 'web_slug', 'POS barcode': 'pos_barcode', 'Sales visibility': 'visibility', 'Media selection': 'media_scope', 'Inventory source': 'warehouse', 'Stock sync policy': 'sync_policy', 'Safety buffer': 'safety_buffer', 'Channel allocation cap': 'allocation_cap', 'Quantity to send': 'stock_quantity', 'Fulfillment': 'fulfillment', 'ASIN / catalog match': 'identifier', 'Catalog ID': 'identifier', 'Condition': 'condition', 'Shipping option': 'shipping_option' };
  const field = fields[cleanLabel] || (cleanLabel.endsWith('parent listing SKU') ? 'listing_sku' : cleanLabel.endsWith(' category') ? 'category' : undefined);
  const error = issues.find(issue => issue.field === field)?.message;
  return <div data-field={field} className={`min-w-0 space-y-2 [&_[aria-invalid=true]]:border-amber-500 ${wide ? 'sm:col-span-2' : ''}`}><Label htmlFor={id}>{label}</Label>{Children.map(children, child => isValidElement(child) ? cloneElement(child as ReactElement<Record<string, unknown>>, { id, 'aria-invalid': Boolean(error), 'aria-describedby': error ? `${id}-error` : helper ? `${id}-help` : undefined }) : child)}{error ? <p id={`${id}-error`} className="text-xs leading-5 text-amber-800 dark:text-amber-300">{error}</p> : helper ? <p id={`${id}-help`} className="text-xs leading-5 text-muted-foreground">{helper}</p> : null}</div>;
}

function SelectControl({ value, onChange, options, ...props }: { value: string; onChange: (value: string) => void; options: string[][]; id?: string }) {
  return <select {...props} value={value} onChange={event => onChange(event.target.value)} className="h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm aria-[invalid=true]:border-amber-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><option value="">Select an option</option>{value && !options.some(([key]) => key === value) && <option value={value}>{value}</option>}{options.map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{label}</option>)}</select>;
}

function ReviewChanges({ before, after, price }: { before: ChannelWizardDraft | null; after: ChannelWizardDraft; price?: string }) {
  const labels: Record<string, string> = { listing_sku: 'Listing SKU', web_slug: 'Storefront URL', title: 'Listing title', description: 'Listing description', category: 'Channel category', warehouse: 'Inventory source', sync_policy: 'Stock sync policy', safety_buffer: 'Safety buffer', allocation_cap: 'Allocation cap', stock_quantity: 'Manual quantity', media_scope: 'Media selection', variant_scope: 'Variants to publish', fulfillment: 'Fulfillment', identifier: 'Catalog identifier', condition: 'Condition', shipping_option: 'Shipping option', visibility: 'Visibility', pos_barcode: 'POS barcode', listing_mode: 'Listing mode', brand: 'Brand', bullet_points: 'Bullet points', search_terms: 'Search terms', preorder_days: 'Pre-order days', warranty: 'Warranty', certification: 'Certification', video_url: 'Video URL', compliance_notes: 'Compliance notes', tax_code: 'Tax code', attribute_material: 'Material', attribute_color: 'Color / pattern', pricing_source: 'Price source' };
  const changes = Object.entries(labels).flatMap(([key, label]) => {
    const old = before?.[key as keyof ChannelWizardDraft]; const next = after[key as keyof ChannelWizardDraft];
    return String(old ?? '') === String(next ?? '') ? [] : [{ label, old: String(old || 'Not set'), next: String(next || 'Not set') }];
  });
  const oldPrice = formatPrice(before?.channel_price, before?.channel_currency);
  if (price && price !== oldPrice) changes.unshift({ label: 'Selling price', old: oldPrice, next: price });
  return <div className="overflow-hidden rounded-xl border"><h4 className="px-5 py-4 text-sm font-semibold">Changes in this draft</h4>{changes.length ? changes.map(change => <div key={change.label} className="grid gap-2 border-t px-5 py-4 text-sm sm:grid-cols-[150px_minmax(0,1fr)_minmax(0,1fr)]"><p className="font-medium">{change.label}</p><div className="min-w-0"><p className="mb-1 text-xs text-muted-foreground">Saved</p><p className="whitespace-pre-wrap break-words text-muted-foreground">{change.old}</p></div><div className="min-w-0"><p className="mb-1 text-xs text-muted-foreground">Proposed</p><p className="whitespace-pre-wrap break-words">{change.next}</p></div></div>) : <p className="border-t px-5 py-4 text-sm text-muted-foreground">No changed fields. Review the listing values above.</p>}</div>;
}
