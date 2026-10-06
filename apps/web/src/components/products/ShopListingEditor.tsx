import { Children, cloneElement, isValidElement, useId, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { ExternalLink, ImageOff, LockKeyhole, Plus, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { listingDraftErrors, listingEditSnapshot, listingHasMultipleSkus, listingIndependentPatch, listingStockManagedByAmazon, LISTING_CHANNEL_FIELDS, LISTING_DRAFT_FIELDS, type ListingSyncDraft } from '@/lib/listing-local-draft';
import { listingEditorData } from '@/lib/listing-editor-data';
import { initialMasterSyncPreference, listingMasterSync, masterSyncPlan, masterSyncSnapshot, masterSyncSourceChanges, MASTER_SYNC_FIELDS, MASTER_SYNC_GROUPS, MASTER_SYNC_VALUE_KEYS, syncListingOverride, syncsField, type MasterSyncField, type MasterSyncPreference } from '@/lib/listing-master-sync';
import { richTextPlainText } from '@/lib/product-master-readiness';
import { usePricingRevision } from '@/hooks/use-pricing';
import { ListingSyncConfiguration } from './ListingSyncConfiguration';
import { uploadProductImage, validateImageFile } from '@/lib/product-images';
import type { ChannelListing, ListingDraftValues, Product } from '@/lib/product-store';
import styles from './ShopListingEditor.module.css';

interface Props {
  product: Product;
  listing: ChannelListing;
  channelLabel: string;
  shopLabel?: string;
  onClose: () => void;
  restoreFocus: () => void;
  onSave: (patch: ListingDraftValues, snapshot: string, syncChange?: ListingSyncDraft) => void;
}
const tabs = ['Content', 'Images', 'Price & stock', 'Shipping', 'Channel details'] as const;
type Tab = typeof tabs[number];
const shippingNumbers = ['length', 'width', 'height', 'weight'] as const;
const groupHint: Record<MasterSyncField, string> = { content: 'Title, description and brand are read-only.', media: 'Listing images are read-only.', price: 'Listing price is read-only.', inventory: 'Shop stock is read-only.', shipping: 'Package and compliance data are read-only.' };
const groupName: Record<MasterSyncField, string> = { content: 'Content', media: 'Images', price: 'Price', inventory: 'Stock', shipping: 'Shipping' };
const numberText = (value?: number) => value === undefined ? '' : String(value);
function toForm(values: ListingDraftValues) {
  return { title: values.title ?? '', description: values.description ?? '', brand: values.brand ?? '', category: values.category ?? '',
    images: values.images ?? [], amount: numberText(values.price?.amount), currency: values.price?.currency ?? '', stock: numberText(values.stock),
    length: numberText(values.shipping?.length), width: numberText(values.shipping?.width), height: numberText(values.shipping?.height), weight: numberText(values.shipping?.weight),
    country: values.shipping?.country ?? '', hs_code: values.shipping?.hs_code ?? '', notes: values.shipping?.notes ?? '', channel_settings: values.channel_settings ?? {} };
}
type Form = ReturnType<typeof toForm>;
function changedValues(initial: Form, form: Form): ListingDraftValues {
  const patch: ListingDraftValues = {};
  for (const field of ['title', 'description', 'brand', 'category'] as const) if (initial[field] !== form[field]) patch[field] = form[field];
  if (JSON.stringify(initial.images) !== JSON.stringify(form.images)) patch.images = form.images;
  const settings = Object.fromEntries(Object.entries(form.channel_settings).filter(([key, value]) => value !== initial.channel_settings[key as keyof typeof initial.channel_settings]));
  if (Object.keys(settings).length) patch.channel_settings = settings;
  if (initial.amount !== form.amount || initial.currency !== form.currency) patch.price = { amount: form.amount.trim() ? Number(form.amount) : NaN, currency: form.currency.trim().toUpperCase() };
  if (initial.stock !== form.stock) patch.stock = form.stock.trim() ? Number(form.stock) : NaN;
  if ([...shippingNumbers, 'country', 'hs_code', 'notes'].some(key => initial[key as keyof Form] !== form[key as keyof Form])) {
    patch.shipping = {};
    for (const key of ['country', 'hs_code', 'notes'] as const) if (initial[key] !== form[key]) patch.shipping[key] = form[key];
    for (const key of shippingNumbers) if (initial[key] !== form[key]) patch.shipping[key] = form[key].trim() ? Number(form[key]) : NaN;
  }
  return patch;
}
function displayValue(value: unknown): string {
  if (value === undefined || value === '') return 'Not recorded';
  if (Array.isArray(value)) return `${value.length} image${value.length === 1 ? '' : 's'}`;
  if (typeof value === 'object' && value !== null) {
    if ('amount' in value && 'currency' in value) return `${value.amount} ${value.currency}`;
    return Object.entries(value).filter(([, entry]) => entry !== '').map(([key, entry]) => `${LISTING_CHANNEL_FIELDS[key as keyof typeof LISTING_CHANNEL_FIELDS] || key.replace(/_/g, ' ')}: ${entry}`).join(' · ') || 'Not recorded';
  }
  return String(value);
}

/** Recorded shop values with explicitly labelled, non-persisted fallbacks. No publication side effect. */
export function ShopListingEditor({ product, listing, channelLabel, shopLabel, onClose, restoreFocus, onSave }: Props) {
  usePricingRevision();
  const sourceId = useId();
  const [details] = useState(() => listingEditorData(product, listing));
  const original = details.values;
  const [snapshot] = useState(() => listingEditSnapshot(product, listing));
  const [initial] = useState(() => toForm(original));
  const [form, setForm] = useState(initial);
  const [tab, setTab] = useState<Tab>('Content');
  const [review, setReview] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof ListingDraftValues, string>>>({});
  const [saveError, setSaveError] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [initialSync] = useState(() => {
    const saved = listingMasterSync(listing, syncListingOverride(product, listing));
    return initialMasterSyncPreference(product, listing, { ...saved, fields: MASTER_SYNC_GROUPS.filter(group => syncsField(saved, group)) });
  });
  const [preference, setPreference] = useState(initialSync);
  const [masterSnapshot] = useState(() => masterSyncSnapshot(product));
  const [reviewedPlan, setReviewedPlan] = useState('');
  const body = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const metadata = details.metadata;
  const shop = shopLabel || metadata.shop || syncListingOverride(product, listing)?.pricing_shop_label || channelLabel;
  const follows = (field: MasterSyncField) => syncsField(preference, field);
  const committedPreference = { ...preference,
    pricing: follows('price') ? preference.pricing : initialSync.pricing,
    inventory: follows('inventory') ? preference.inventory : initialSync.inventory,
  };
  const independentGroups = MASTER_SYNC_GROUPS.filter(group => syncsField(initialSync, group) && !follows(group));
  const syncDirty = JSON.stringify(committedPreference) !== JSON.stringify(initialSync);
  const syncChanges = masterSyncSourceChanges(initialSync, committedPreference);
  const plan = masterSyncPlan(product, listing, committedPreference);
  const syncError = plan.groups.find(group => follows(group.field) && syncChanges.includes(group.field) && group.error);
  const multiSku = listingHasMultipleSkus(product, listing);
  const fba = listingStockManagedByAmazon(product, listing);
  const allEdits = changedValues(initial, form);
  // Retain typed values in memory when switching sources; do not save edits to Master-led groups.
  const editedPatch = Object.fromEntries(Object.entries(allEdits).filter(([key]) => {
    const group = LISTING_DRAFT_FIELDS[key as keyof ListingDraftValues].group;
    return !group || !follows(group);
  })) as ListingDraftValues;
  const ignoredEditGroups = MASTER_SYNC_GROUPS.filter(group => follows(group) && MASTER_SYNC_VALUE_KEYS[group].some(key => key in allEdits));
  const patch = listingIndependentPatch(original, editedPatch, independentGroups);
  const dirty = Object.keys(allEdits).length > 0 || syncDirty || Boolean(imageUrl.trim());
  const hasChanges = Object.keys(editedPatch).length > 0 || syncDirty;
  const set = <K extends keyof Form>(key: K, value: Form[K]) => { setForm(current => ({ ...current, [key]: value })); setSaveError(''); };
  const navigate = (next: Tab) => { setTab(next); body.current?.scrollTo?.({ top: 0 }); };
  function leave() {
    if (uploading) return;
    if (dirty) setDiscard(true);
    else onClose();
  }
  function validate() {
    const next = listingDraftErrors(product, listing, editedPatch, independentGroups);
    if (!follows('media') && imageUrl.trim()) next.images = 'Add this image URL or clear it before reviewing.';
    setErrors(next);
    return next;
  }
  function openReview() {
    const next = validate();
    const first = Object.keys(next)[0] as keyof ListingDraftValues | undefined;
    if (first) {
      navigate(first === 'channel_settings' ? 'Channel details' : first === 'images' ? 'Images' : first === 'price' || first === 'stock' ? 'Price & stock' : first === 'shipping' ? 'Shipping' : 'Content');
      requestAnimationFrame(() => body.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    if (syncError) {
      const group = syncError.field;
      navigate(group === 'media' ? 'Images' : group === 'price' || group === 'inventory' ? 'Price & stock' : group === 'shipping' ? 'Shipping' : 'Content');
      setSaveError(syncError.error!);
      return;
    }
    setReviewedPlan(plan.signature);
    setSaveError('');
    setReview(true);
    requestAnimationFrame(() => { body.current?.scrollTo?.({ top: 0 }); heading.current?.focus(); });
  }
  function addUrl() {
    const url = imageUrl.trim();
    if (!/^https?:\/\//i.test(url)) { setErrors(current => ({ ...current, images: 'Enter an http(s) image URL.' })); return; }
    if (form.images.includes(url)) { setErrors(current => ({ ...current, images: 'This image is already in the listing.' })); return; }
    set('images', [...form.images, url]); setImageUrl(''); setErrors(current => ({ ...current, images: undefined }));
  }
  function changeSync(patch: Partial<MasterSyncPreference>) { setPreference(current => ({ ...current, ...patch })); setSaveError(''); setErrors({}); }
  const status = (group: MasterSyncField) => <section aria-label={`${MASTER_SYNC_FIELDS[group]} data source`} className="mb-5 space-y-3 border-b pb-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0"><p className="text-sm font-medium">{group === 'price' ? 'Price source' : group === 'inventory' ? 'Stock source' : 'Data source'}</p>
        <p className="mt-1 flex items-start gap-1.5 text-xs leading-5 text-muted-foreground">{follows(group) && <LockKeyhole className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />}{follows(group) ? groupHint[group] : 'Changes apply to this listing only.'}</p>
      </div>
      <div role="radiogroup" aria-label={`${MASTER_SYNC_FIELDS[group]} data source`} className="flex flex-wrap gap-1 rounded-lg border bg-background p-1">
        {[true, false].map(on => <label key={String(on)} className={`relative flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-3 text-sm transition-colors focus-within:ring-2 focus-within:ring-ring ${follows(group) === on ? 'bg-primary/10 font-medium text-foreground' : 'text-muted-foreground hover:bg-muted'} ${uploading || (on && group === 'inventory' && fba) ? 'cursor-not-allowed opacity-60' : ''}`}>
          <input type="radio" name={`${sourceId}-${group}`} className="size-4 accent-primary" checked={follows(group) === on} disabled={uploading || (on && group === 'inventory' && fba)} onChange={() => {
            const fields = MASTER_SYNC_GROUPS.filter(field => field === group ? on : follows(field));
            changeSync({ fields, enabled: fields.length > 0 });
          }} />{on ? 'Follow Master' : 'Edit independently'}
        </label>)}
      </div>
    </div>
    {follows(group) && <ListingSyncConfiguration field={group} master={product} listing={listing} draft={preference} onChange={changeSync} />}
    {follows(group) && plan.groups.find(item => item.field === group)?.error && <p role="alert" className="text-xs text-destructive">{plan.groups.find(item => item.field === group)?.error}</p>}
    {follows(group) && !syncsField(initialSync, group) && <p className="text-xs leading-5 text-muted-foreground">Review changes will show the Master values that replace this group when sync runs.</p>}
    {ignoredEditGroups.includes(group) && <p className="text-xs leading-5 text-muted-foreground">Unsaved independent edits to this group will not be saved. Choose Edit independently to keep editing them.</p>}
  </section>;
  return <Sheet open onOpenChange={open => { if (!open) leave(); }}>
    <SheetContent className={`${styles.sheet} flex h-dvh w-full flex-col gap-0 p-0 sm:max-w-3xl motion-reduce:animate-none [&>button:last-child]:size-11 [&>button:last-child]:right-2 [&>button:last-child]:top-2`} onCloseAutoFocus={event => { event.preventDefault(); restoreFocus(); }}>
      <SheetHeader className={`${styles.header} shrink-0 space-y-3 border-b px-5 py-4 text-left sm:px-6`}>
        <SheetTitle className="pr-10 text-base">Manage listing</SheetTitle>
        <section aria-label="Listing summary" className="flex min-w-0 items-start gap-3">
          {form.images[0] ? <ListingImage key={form.images[0]} src={form.images[0]} index={0} summary /> : <div role="img" className="grid size-16 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground" aria-label="No recorded listing image"><ImageOff className="size-6" aria-hidden="true" /></div>}
          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="break-words text-sm font-semibold leading-5">{form.title || 'Listing title not recorded'}</h3>
            <SheetDescription className="break-words text-xs leading-5">{shop}{shop !== channelLabel ? ` · ${channelLabel}` : ''}</SheetDescription>
            <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs leading-5 text-muted-foreground"><span className="break-all">SKU: {metadata.sku || 'Not recorded'}</span><span>{metadata.variantCount ?? (multiSku ? listing.variant_mappings?.length : 1) ?? '—'} SKU{multiSku ? 's' : ''} · {form.images.length} image{form.images.length === 1 ? '' : 's'}</span></p>
          </div>
        </section>
        <p role="status" className="text-xs leading-5"><span className="text-muted-foreground">Following Master: </span><span className="font-medium">{preference.fields.map(group => groupName[group]).join(', ') || 'None · All groups independent'}</span>{syncDirty && <span className="ml-2 text-muted-foreground">· Unsaved changes</span>}</p>
      </SheetHeader>
      {!review && <div className="grid shrink-0 grid-cols-5 border-b px-2" role="tablist" aria-label="Listing details">
        {tabs.map(value => <button key={value} role="tab" aria-selected={tab === value} aria-controls="shop-listing-panel" id={`listing-tab-${tabs.indexOf(value)}`} tabIndex={tab === value ? 0 : -1} onClick={() => navigate(value)} onKeyDown={event => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault(); const index = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (tabs.indexOf(value) + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
          navigate(tabs[index]); document.getElementById(`listing-tab-${index}`)?.focus();
        }} className={`min-h-12 border-b-2 px-2 py-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm ${tab === value ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>{value}</button>)}
      </div>}
      <div ref={body} className={`${styles.body} min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6`}>
        {review ? <section aria-label="Review listing changes" className="space-y-5">
          <div><h3 ref={heading} tabIndex={-1} className="text-lg font-semibold outline-none">Review listing changes</h3><p className="mt-1 text-sm text-muted-foreground">Only {listing.store_name || 'this shop listing'} will change. Master data and other listings stay unchanged.</p></div>
          {ignoredEditGroups.length > 0 && <p className="rounded-lg border p-3 text-sm text-muted-foreground">Unsaved independent edits to {ignoredEditGroups.map(group => groupName[group]).join(', ')} will not be saved because these groups follow Master.</p>}
          {syncChanges.length > 0 && <section aria-label="Data source changes" className="divide-y rounded-lg border px-4">
            <h4 className="py-4 text-sm font-semibold">Data source changes</h4>
            {syncChanges.map(group => <div key={group} className="space-y-3 py-4">
              <p className="text-sm font-semibold">{MASTER_SYNC_FIELDS[group]}: {syncsField(initialSync, group) ? 'Follow Master' : 'Independent'} → {follows(group) ? 'Follow Master' : 'Independent'}</p>
              {follows(group) ? <>
                <p className="text-xs leading-5 text-muted-foreground">Master values replace this group when sync runs. This prototype saves the source choice only; no shop update is sent.</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="min-w-0"><p className="mb-2 text-xs text-muted-foreground">Current listing values</p>{(group === 'content' ? ['title', 'brand', 'description'] as const : MASTER_SYNC_VALUE_KEYS[group]).map(key => <p key={key} className={`whitespace-pre-wrap break-words text-sm ${key === 'description' ? 'mt-2' : ''}`}>{displayValue(original[key])}</p>)}{group === 'media' && <div className="mt-2 flex flex-wrap gap-2">{original.images?.map((src, index) => <ListingImage key={`${index}:${src}`} src={src} index={index} summary />)}</div>}</div>
                  <div className="min-w-0"><p className="mb-2 text-xs text-muted-foreground">From saved Master</p>{plan.groups.find(item => item.field === group)?.proposed.map((value, index) => <p key={index} className="break-words text-sm">{value}</p>)}{group === 'content' && <p className="mt-2 whitespace-pre-wrap break-words text-sm">{richTextPlainText(product.description) || 'Description not recorded'}</p>}{group === 'media' && <div className="mt-2 flex flex-wrap gap-2">{product.images.filter(image => image.trim()).map((src, index) => <ListingImage key={`${index}:${src}`} src={src} index={index} summary />)}</div>}</div>
                </div>
                {group === 'price' && <p className="text-xs text-muted-foreground">Currency: {preference.pricing?.currency} · Pricing rule: {preference.pricing?.rule_id || 'Master base price'}</p>}
                {group === 'inventory' && <p className="text-xs text-muted-foreground">Safety buffer: {preference.inventory?.safety_buffer} · Allocation cap: {preference.inventory?.allocation_cap ?? 'No cap'}{preference.inventory?.fulfillment ? ` · ${preference.inventory.fulfillment}` : ''}</p>}
              </> : <p className="text-xs leading-5 text-muted-foreground">Current values are kept unless you edited them below. Only this group stops following Master.</p>}
            </div>)}
          </section>}
          {Object.keys(editedPatch).length > 0 && <div className="divide-y rounded-xl border">{(Object.keys(editedPatch) as Array<keyof ListingDraftValues>).map(field => <div key={field} className="space-y-3 p-4"><h4 className="text-sm font-semibold">{LISTING_DRAFT_FIELDS[field].label}</h4><div className="grid gap-4 sm:grid-cols-2"><div><p className="mb-1 text-xs text-muted-foreground">Current listing value</p><p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{displayValue(independentGroups.includes(LISTING_DRAFT_FIELDS[field].group as MasterSyncField) ? original[field] : details.recorded[field])}</p></div><div><p className="mb-1 text-xs text-muted-foreground">Your change</p><p className="whitespace-pre-wrap break-words text-sm">{displayValue(editedPatch[field])}</p>{field === 'images' && <div className="mt-2 flex flex-wrap gap-2">{form.images.map((src, index) => <ListingImage key={`${index}:${src}`} src={src} index={index} />)}</div>}</div></div></div>)}</div>}
        </section> : <div id="shop-listing-panel" role="tabpanel" aria-labelledby={`listing-tab-${tabs.indexOf(tab)}`}>
          {tab === 'Content' && <>{status('content')}<div className="grid min-w-0 gap-5 sm:grid-cols-2">
            <Field label="Listing title" error={errors.title} wide><Input readOnly={follows('content')} value={form.title} onChange={event => set('title', event.target.value)} onBlur={validate} /></Field>
            <Field label="Brand" error={errors.brand}><Input readOnly={follows('content')} value={form.brand} onChange={event => set('brand', event.target.value)} /></Field>
            <Field label="Shop category" error={errors.category}><Input value={form.category} onChange={event => set('category', event.target.value)} /></Field>
            <Field label="Description" error={errors.description} wide><Textarea readOnly={follows('content')} rows={6} value={form.description} onChange={event => set('description', event.target.value)} /></Field>
          </div></>}
          {tab === 'Images' && <>{status('media')}<fieldset disabled={follows('media') || uploading} className="space-y-5">
            <div className="text-sm font-medium">{form.images.length} image{form.images.length === 1 ? '' : 's'}</div>
            <div className="flex flex-wrap gap-3">{form.images.map((src, index) => <div key={`${index}:${src}`} className="rounded-lg border p-2"><ListingImage src={src} index={index} /><p className="mt-2 text-center text-xs text-muted-foreground">{index === 0 ? 'Main image' : `Image ${index + 1}`}</p>{!follows('media') && <Button variant="ghost" className="mt-1 min-h-11 w-full" aria-label={`Remove listing image ${index + 1}`} onClick={() => set('images', form.images.filter((_, i) => i !== index))}><Trash2 className="size-4" /><span className="sr-only">Remove</span></Button>}</div>)}</div>
            {!form.images.length && <p className="text-sm text-muted-foreground">No listing images recorded. Master images are not copied automatically.</p>}
            {!follows('media') && <><label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-3 text-sm focus-within:ring-2 focus-within:ring-ring"><Upload className="size-4" />{uploading ? 'Reading images…' : 'Upload listing images'}<input className="sr-only" type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" aria-label="Upload listing images" onChange={async event => {
              const files = Array.from(event.currentTarget.files ?? []); event.currentTarget.value = ''; setUploading(true);
              try {
                const results: string[] = [];
                for (const file of files) { const validation = validateImageFile(file); if (!validation.valid) throw new Error(validation.error); results.push((await uploadProductImage(file, `listing-${listing.external_id}`)).url); }
                setForm(current => ({ ...current, images: [...current.images, ...results] })); setErrors(current => ({ ...current, images: undefined }));
              } catch (error) { setErrors(current => ({ ...current, images: error instanceof Error ? error.message : 'Unable to read images. Try again.' })); }
              finally { setUploading(false); }
            }} /></label>
            <div className="flex items-end gap-2"><div className="min-w-0 flex-1"><Field label="Image URL" error={errors.images}><Input type="url" value={imageUrl} onChange={event => setImageUrl(event.target.value)} placeholder="https://…" /></Field></div><Button variant="outline" className="min-h-11" onClick={addUrl} disabled={!imageUrl.trim()}><Plus className="size-4" />Add</Button></div>
            <p className="text-xs text-muted-foreground">Images belong to this listing only. The first image is the main image.</p></>}
          </fieldset></>}
          {tab === 'Price & stock' && <div className="space-y-6">
            {(details.sources.price === 'saved' || details.sources.stock === 'saved') && <p className="text-xs leading-5 text-muted-foreground">Saved settings are local listing values, not a verified shop snapshot.</p>}
            {multiSku && <p className="rounded-lg border bg-muted/20 p-3 text-sm">This listing has multiple SKUs. Price and stock are read-only totals here; edit each SKU in the shop.</p>}
            <section>{status('price')}<fieldset disabled={follows('price') || multiSku} className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_140px]">
              <Field label="Listing price" error={errors.price}><Input type="number" min="0" step="any" value={form.amount} onChange={event => set('amount', event.target.value)} onBlur={validate} /></Field>
              <Field label="Currency"><Input maxLength={3} readOnly={Boolean(original.price?.currency)} value={form.currency} onChange={event => set('currency', event.target.value.toUpperCase())} /></Field>
            </fieldset></section>
            <section className="border-t pt-6">{status('inventory')}<fieldset disabled={follows('inventory') || multiSku || fba}><Field label="Shop stock" error={errors.stock}><Input type="number" min="0" step="1" value={form.stock} onChange={event => set('stock', event.target.value)} onBlur={validate} /></Field></fieldset><p className="mt-2 text-xs text-muted-foreground">{fba ? 'Amazon manages FBA stock.' : 'Listing quantity only. Master warehouse stock is unchanged.'}</p></section>
            {metadata.variants?.length ? <section><h3 className="mb-3 text-sm font-semibold">Listing SKUs</h3><div className="overflow-x-auto rounded-lg border"><table className="w-full text-left text-sm"><thead className="border-b bg-muted/30 text-xs text-muted-foreground"><tr><th className="p-3 font-medium">Variant / SKU</th><th className="p-3 text-right font-medium">Price</th><th className="p-3 text-right font-medium">Stock</th></tr></thead><tbody className="divide-y">{metadata.variants.map((variant, index) => <tr key={`${variant.sku}:${index}`}><td className="p-3"><p className="break-words font-medium">{variant.label}</p><p className="mt-1 break-all text-xs text-muted-foreground">{variant.sku}</p></td><td className="p-3 text-right">{variant.price ? `${variant.price.amount.toLocaleString('en-US')} ${variant.price.currency}` : 'Not recorded'}</td><td className="p-3 text-right">{variant.stock ?? 'Not recorded'}</td></tr>)}</tbody></table></div></section> : null}
          </div>}
          {tab === 'Shipping' && <>{status('shipping')}<fieldset disabled={follows('shipping')} className="grid gap-5 sm:grid-cols-2">
            <h3 className="text-sm font-semibold sm:col-span-2">Package dimensions & compliance</h3>
            {shippingNumbers.map(key => <Field key={key} label={`${key[0].toUpperCase()}${key.slice(1)} (${key === 'weight' ? 'g' : 'cm'})`}><Input type="number" min="0" step="any" value={form[key]} onChange={event => set(key, event.target.value)} onBlur={validate} /></Field>)}
            <Field label="Country of origin"><Input value={form.country} onChange={event => set('country', event.target.value)} /></Field><Field label="HS code"><Input value={form.hs_code} onChange={event => set('hs_code', event.target.value)} /></Field>
            <Field label="Compliance notes" wide error={errors.shipping}><Textarea rows={4} value={form.notes} onChange={event => set('notes', event.target.value)} /></Field>
          </fieldset></>}
          {tab === 'Channel details' && <div className="space-y-6">
            <section className="rounded-lg border p-4"><h3 className="text-sm font-semibold">Listing identity</h3><dl className="mt-3 grid grid-cols-2 gap-4 text-sm">{[['Listing ID', details.listingId], ['Shop SKU', metadata.sku], ['GTIN / barcode', metadata.identifiers?.gtin], ['MPN', metadata.identifiers?.mpn], ['Model', metadata.identifiers?.model], ['Fulfillment', details.fulfillment]].map(([label, value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-all">{value || 'Not recorded'}</dd></div>)}</dl>{metadata.listingUrl && /^https?:\/\//i.test(metadata.listingUrl) && <a href={metadata.listingUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm text-primary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">Open listing on shop<ExternalLink className="size-4" /></a>}</section>
            {(details.hasMasterPreview || metadata.retrievedAt) && <p className="text-xs leading-5 text-muted-foreground">{details.hasMasterPreview && 'Master preview is not confirmed on the shop. '}{metadata.retrievedAt && `Shop data retrieved ${new Date(metadata.retrievedAt).toLocaleString()}.`}</p>}
            <section className="rounded-lg border p-4"><h3 className="text-sm font-semibold">SKU mapping</h3>
              {listing.variant_mappings?.length ? <dl className="mt-3 divide-y text-sm">{listing.variant_mappings.map((mapping, index) => <div key={index} className="grid grid-cols-2 gap-3 py-3"><dt className="break-all">{mapping.shop_sku}</dt><dd className="break-all text-muted-foreground">{product.skus.find(sku => sku.id === mapping.master_sku_id)?.sku_code || mapping.master_sku_id}</dd></div>)}</dl> : <p className="mt-2 text-sm text-muted-foreground">{product.has_variants || multiSku ? 'No SKU-level mappings recorded.' : `${metadata.sku || 'Listing SKU not recorded'} → ${product.sku_code}`}</p>}
              <p className="mt-3 text-xs text-muted-foreground">Linked to this Master. Editing listing details does not change SKU mapping.</p>
            </section>
            <div className="grid gap-5 sm:grid-cols-2">{(Object.keys(LISTING_CHANNEL_FIELDS) as Array<keyof typeof LISTING_CHANNEL_FIELDS>).filter(key => {
              if (form.channel_settings[key]?.trim()) return true;
              const channels: Partial<Record<keyof typeof LISTING_CHANNEL_FIELDS, string[]>> = { condition: ['amazon'], search_terms: ['amazon'], bullet_points: ['amazon'], preorder_days: ['shopee'], warranty: ['lazada'], certification: ['tiktok'], web_slug: ['website'], pos_barcode: ['pos'], visibility: ['website', 'pos'] };
              return !channels[key] || channels[key]!.includes(listing.channel);
            }).map(key => <Field key={key} label={LISTING_CHANNEL_FIELDS[key]} wide={key === 'bullet_points'}>
              {key === 'bullet_points' ? <Textarea rows={4} value={form.channel_settings[key] ?? ''} onChange={event => set('channel_settings', { ...form.channel_settings, [key]: event.target.value })} />
                : <Input placeholder={key === 'video_url' ? 'No video added (optional)' : 'Not recorded'} type={key === 'preorder_days' ? 'number' : 'text'} min={key === 'preorder_days' ? 0 : undefined} value={form.channel_settings[key] ?? ''} onChange={event => set('channel_settings', { ...form.channel_settings, [key]: event.target.value })} />}
            </Field>)}</div>
            {errors.channel_settings && <p role="alert" className="text-sm text-destructive">{errors.channel_settings}</p>}
          </div>}
        </div>}
        {saveError && <p role="alert" className="mt-5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{saveError}</p>}
      </div>
      <div className={`${styles.footer} shrink-0 space-y-3 border-t bg-background px-5 py-3 sm:flex sm:items-center sm:justify-between sm:gap-4 sm:space-y-0 sm:px-6`}>
        {discard ? <div role="alert" className="w-full space-y-3"><p className="text-sm font-medium">Discard unsaved listing changes?</p><div className="flex flex-wrap justify-end gap-2"><Button variant="outline" className="min-h-11" onClick={() => setDiscard(false)}>Keep editing</Button><Button variant="destructive" className="min-h-11" onClick={onClose}>Discard changes</Button></div></div> : <>
          <p className="text-xs leading-5 text-muted-foreground">Local draft only. No update is sent to the shop.</p>
          <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" className="min-h-11" disabled={uploading} onClick={() => review ? setReview(false) : leave()}>{review ? 'Back to edit' : 'Cancel'}</Button><Button className="min-h-11" disabled={uploading || !(hasChanges || (!follows('media') && imageUrl.trim()))} onClick={() => {
            if (!review) { openReview(); return; }
            try {
              if (syncDirty) {
                if (plan.signature !== reviewedPlan) throw new Error('Sync values changed. Go back and review the latest values before saving.');
                onSave(patch, snapshot, { preference: committedPreference, masterSnapshot, reviewedPlan });
              } else onSave(patch, snapshot);
            } catch (error) { setSaveError(error instanceof Error ? error.message : 'Unable to save. Try again.'); }
          }}>{review ? 'Save listing changes' : 'Review changes'}</Button></div>
        </>}
      </div>
    </SheetContent>
  </Sheet>;
}

function Field({ label, error, children, wide }: { label: string; error?: string; children: ReactNode; wide?: boolean }) {
  const id = useId();
  return <div className={`min-w-0 space-y-2 text-sm [&_input]:min-h-11 [&_textarea]:text-sm ${wide ? 'sm:col-span-2' : ''}`}><label htmlFor={id} className="block font-medium">{label}</label>{Children.map(children, child => isValidElement(child) ? cloneElement(child as ReactElement<Record<string, unknown>>, { placeholder: 'Not recorded', ...child.props as Record<string, unknown>, id, 'aria-invalid': Boolean(error), 'aria-describedby': error ? `${id}-error` : undefined }) : child)}{error && <p id={`${id}-error`} role="alert" className="text-xs text-destructive">{error}</p>}</div>;
}

function ListingImage({ src, index, summary }: { src: string; index: number; summary?: boolean }) {
  const [failed, setFailed] = useState(false);
  const size = summary ? 'size-16' : 'size-32';
  return failed ? <span role="img" aria-label={summary ? 'Listing thumbnail unavailable' : `Listing image ${index + 1} unavailable`} className={`grid ${size} shrink-0 place-items-center rounded-md bg-muted text-muted-foreground`}><ImageOff className="size-6" /></span>
    : <img src={src} alt={summary ? 'Listing thumbnail' : `Listing image ${index + 1}`} className={`${size} shrink-0 rounded-md border bg-white object-contain`} onError={() => setFailed(true)} />;
}
