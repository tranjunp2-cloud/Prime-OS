import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, ChevronDown, ImagePlus, Pencil, Plus, Trash2, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Product } from '@/lib/product-store';
import type { CatalogImportItem } from '@/lib/catalog-import-store';
import { getProductCatalogSettings, resolveCatalogCategory } from '@/lib/product-catalog-settings-store';
import { assignedCategoryAttributes } from '@/lib/category-schema';
import { completionReadiness, sourceImages, variantMappingError, type VariantMappings } from '@/lib/listing-master-completion';
import { resolveSourceSkuMappings } from '@/lib/listing-sku-mapping';
import { MASTER_MAPPING_TARGETS, fieldValue, suggestAttributeFields } from '@/lib/listing-field-mapping';
import { ListingFieldMappingRow } from './ListingFieldMappingRow';
import { ListingSkuMappings } from './ListingSkuMappings';
import { ListingMasterSummary } from './ListingMasterSummary';
import { ListingReviewHelp } from './ListingReviewHelp';
import { getMasterMediaReadiness } from '@/lib/product-master-media';

type Props = {
  product: Product; sources: CatalogImportItem[]; onChange: (product: Product) => void;
  mappings: VariantMappings; onMappingsChange: (mappings: VariantMappings) => void;
  verifiedSingles?: string[];
  onMediaReady: (ready: boolean) => void;
  preservedSkuIds?: string[];
  baseline?: Product;
  creationSetup?: (product: Product, onChange: (product: Product) => void) => ReactNode;
  onEditingChange?: (editing: boolean, dirty: boolean) => void;
  readFirst?: boolean;
};

/** One review surface; collapsed groups preserve drafts and image validation. */
export function ListingMasterCompletion({ product: proposal, sources, onChange: applyProduct, mappings: proposalMappings, onMappingsChange: applyMappings, verifiedSingles = [], onMediaReady, preservedSkuIds, baseline, creationSetup, onEditingChange, readFirst }: Props) {
  const prefix = useId();
  const reviewFirst = readFirst ?? Boolean(creationSetup);
  const [editor, setEditor] = useState<{ group: string; product: Product; mappings: VariantMappings } | null>(null);
  const product = editor?.product ?? proposal;
  const mappings = editor?.mappings ?? proposalMappings;
  const onChange = (next: Product) => reviewFirst ? setEditor(current => current ? { ...current, product: next, mappings: next.has_variants !== current.product.has_variants ? {} : current.mappings } : current) : applyProduct(next);
  const onMappingsChange = (next: VariantMappings) => reviewFirst ? setEditor(current => current ? { ...current, mappings: next } : current) : applyMappings(next);
  const editingCallback = useRef(onEditingChange);
  editingCallback.current = onEditingChange;
  const isEditing = Boolean(editor);
  const editDirty = Boolean(editor && (JSON.stringify(editor.product) !== JSON.stringify(proposal) || JSON.stringify(editor.mappings) !== JSON.stringify(proposalMappings)));
  useEffect(() => { editingCallback.current?.(isEditing, editDirty); }, [isEditing, editDirty]);
  useEffect(() => () => { editingCallback.current?.(false, false); }, []);
  const [updated, setUpdated] = useState<Record<string, boolean>>({});
  const [editVersions, setEditVersions] = useState<Record<string, number>>({});
  const [originalSkuIds] = useState(() => new Set(preservedSkuIds ?? product.skus.map(sku => sku.id)));
  const checks = completionReadiness(product, sources).checks;
  const masterMedia = getMasterMediaReadiness(product.images);
  const [imageStates, setImageStates] = useState<Record<string, boolean>>({});
  const missing = checks.filter(check => !check.done);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ identity: true, variants: !creationSetup, price: true });
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);
  const mediaCallback = useRef(onMediaReady);
  mediaCallback.current = onMediaReady;
  useEffect(() => {
    mediaCallback.current(!uploading);
  }, [product.images, imageStates, uploading]);
  const settings = getProductCatalogSettings();
  const category = resolveCatalogCategory(product, settings.categories);
  const attributes = assignedCategoryAttributes(category, settings.attributes);
  const categoryLabel = (id: string) => {
    const path: string[] = [];
    const visited = new Set<string>();
    let current = settings.categories.find(item => item.id === id);
    while (current && !visited.has(current.id)) {
      path.unshift(current.name); visited.add(current.id);
      current = settings.categories.find(item => item.id === current?.parentId);
    }
    return path.join(' / ');
  };
  const imageSources = new Map(sources.flatMap(source => sourceImages(source).map(image => [image, `${source.channel} · ${source.storeName}`] as const)));
  const update = (patch: Partial<Product>) => onChange({ ...product, ...patch });
  const imageStatus = (src: string, loaded: boolean) => {
    setImageStates(previous => previous[src] === loaded ? previous : { ...previous, [src]: loaded });
  };
  const setImages = (images: string[]) => {
    update({ images });
    onMediaReady(!uploading);
  };
  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploadError(''); setUploading(true); onMediaReady(false);
    try {
      const selected = Array.from(files);
      if (product.images.length + selected.length > 9) throw new Error('Keep up to 9 images. Remove an image before adding more.');
      if (selected.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)) throw new Error('Use JPG, PNG or WebP images, up to 5 MB each.');
      const images = await Promise.all(selected.map(file => new Promise<string>((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Could not read this file. Choose it again.')); reader.readAsDataURL(file);
      })));
      setImages([...new Set([...product.images, ...images])]);
    } catch (error) { setUploadError(error instanceof Error ? error.message : 'Could not add images. Try again.'); }
    finally { setUploading(false); }
  };
  const skuError = product.has_variants ? variantMappingError(sources, product, Object.fromEntries(sources.map(source => [source.id, resolveSourceSkuMappings(source, product, mappings[source.id])])), verifiedSingles) : '';
  const groups = [
    { id: 'identity', title: 'Product essentials', checks: product.has_variants ? ['identity'] : ['identity', 'sku'], summary: 'Name, category, brand & product structure' },
    { id: product.has_variants ? 'variants' : 'price', title: product.has_variants ? 'Variants, pricing & SKU mapping' : 'Pricing', checks: product.has_variants ? ['sku', 'price'] : ['price'], summary: product.has_variants ? `${product.skus.length} Master SKUs · ${sources.length} source listing(s)` : `${product.retail_price || 'No price'} ${product.price_currency}` },
    { id: 'attributes', title: 'Category attributes', checks: [], summary: category?.name || 'Choose a category first' },
    { id: 'content', title: 'Description & images', checks: ['content'], summary: `${masterMedia.count} image${masterMedia.count === 1 ? '' : 's'} · description ${checks.find(check => check.id === 'content')?.done ? 'provided' : 'needs details'}` },
    { id: 'shipping', title: 'Shipping package', checks: [], summary: product.pkg_length > 0 && product.pkg_width > 0 && product.pkg_height > 0 && product.pkg_weight > 0 ? `${product.pkg_length} × ${product.pkg_width} × ${product.pkg_height} cm · ${product.pkg_weight} g` : 'Dimensions & weight' },
    { id: 'identifiers', title: 'Model, barcode & pack details', checks: [], summary: 'Optional product identifiers' },
  ];
  const issuesFor = (group: typeof groups[number]) => [
    ...missing.filter(check => group.checks.includes(check.id)).map(check => check.id === 'media' && masterMedia.ready ? product.images.some(image => imageStates[image] === false) ? 'Image unavailable. Master activation is not blocked; review it before syncing images.' : 'Wait for images to load.' : check.label),
    ...(group.id === 'variants' && skuError ? [skuError] : []),
    ...((group.id === 'variants' || group.id === 'price') && !/^[A-Z]{3}$/.test(product.price_currency) ? ['Choose a valid three-letter currency.'] : []),
  ];
  const incomplete = groups.filter(group => issuesFor(group).length > 0);
  const allExpanded = groups.every(group => expanded[group.id]);
  const reveal = (id: string) => {
    if (reviewFirst) {
      if (editor) return;
      setEditVersions(previous => ({ ...previous, [id]: (previous[id] ?? 0) + 1 }));
      setEditor({ group: id, product: structuredClone(proposal), mappings: structuredClone(proposalMappings) });
    } else setExpanded(previous => ({ ...previous, [id]: true }));
    requestAnimationFrame(() => {
      const trigger = document.getElementById(`${prefix}-${id}-${reviewFirst ? 'editor' : 'toggle'}`);
      trigger?.scrollIntoView?.({ block: 'start' });
      trigger?.focus({ preventScroll: true });
    });
  };
  const section = (id: string, body: ReactNode) => {
    const group = groups.find(item => item.id === id)!;
    const issues = issuesFor(group);
    if (reviewFirst) {
      const editing = editor?.group === id;
      const explanations: Record<string, string> = {
        identity: 'Review the proposed Master identity. Its internal SKU is separate from shop SKUs. In Edit, you can choose a different source field or enter a value manually. Shop categories are not copied into your internal taxonomy automatically.',
        variants: 'Suggestions are not confirmed links. Check each shop SKU against the proposed Master SKU, options and price. Applying edits only updates this proposal. Creating and linking confirms the reviewed mappings; warehouse stock is never copied.',
        price: 'This is the Master base price, in the displayed currency. No currency conversion is performed. Shop prices and warehouse stock remain unchanged.',
        attributes: 'These shared attributes enrich the Master but do not block activation. Channel-required attributes are checked separately for each listing. Exact source matches may be suggested; you can change the source or the final value in Edit.',
        content: 'Description and images start from imported listing data. Edit to change the source, upload images or choose a cover. Shop content is unchanged.',
        shipping: 'Package dimensions and weight belong to the Master. Open Edit to see or change the source for each measurement. Supported units are converted explicitly.',
        identifiers: 'Optional identifiers can help identify the product across shops. Missing values do not block activation, but any value you enter must be valid.',
      };
      const closeEditor = (apply: boolean) => {
        if (uploading) return;
        if (apply && editor && editDirty) { applyProduct(editor.product); applyMappings(editor.mappings); setUpdated(previous => ({ ...previous, [id]: true })); }
        setEditor(null); setUploadError('');
        requestAnimationFrame(() => document.getElementById(`${prefix}-${id}-edit`)?.focus({ preventScroll: true }));
      };
      return <section key={id} id={`${prefix}-${id}`} aria-label={id === 'variants' ? 'Variant setup' : group.title} className={`min-w-0 scroll-mt-3 rounded-lg border ${editing || ['identity', 'variants'].includes(id) || (id === 'identifiers' && product.has_variants) ? 'md:col-span-2' : ''} ${id === 'content' && !editor ? 'md:row-span-2' : ''} ${editing ? 'border-primary/40 bg-primary/[0.025]' : 'bg-card/40'}`}>
        <div className="flex min-h-14 items-center justify-between gap-3 px-4 py-1.5">
          <div className="flex min-w-0 flex-wrap items-center gap-x-1"><h4 className="text-sm font-semibold">{group.title}</h4><ListingReviewHelp label={group.title}>{explanations[id]}</ListingReviewHelp>{!group.checks.length && <span className="ml-1 text-xs text-muted-foreground">Optional</span>}{updated[id] && !editing && <span className="ml-2 text-xs text-muted-foreground">Updated</span>}</div>
          {!editing && <Button id={`${prefix}-${id}-edit`} variant="ghost" className="h-11 shrink-0 px-2 text-xs" disabled={Boolean(editor)} aria-label={`Edit ${group.title}`} onClick={() => reveal(id)}><Pencil className="size-3.5" />Edit</Button>}
        </div>
        {!editing && <div className="px-4 pb-4"><ListingMasterSummary group={id} product={product} sources={sources} mappings={mappings} imageStates={imageStates} />{issues.length > 0 && <ul className="mt-3 space-y-1 border-t border-amber-500/20 pt-2 text-xs leading-5 text-amber-700 dark:text-amber-300">{issues.map((issue, index) => <li key={index} className="flex gap-2"><TriangleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />{issue}</li>)}</ul>}</div>}
        <div key={editVersions[id] ?? 0} id={`${prefix}-${id}-editor`} tabIndex={-1} hidden={!editing} className="space-y-3 border-t px-4 pb-4 pt-2 focus:outline-none">
          {body}
          {issues.length > 0 && <ul className="space-y-1 text-xs leading-5 text-amber-700 dark:text-amber-300">{issues.map((issue, index) => <li key={index}>{issue}</li>)}</ul>}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3"><span className="text-xs text-muted-foreground">Only updates this proposal</span><div className="flex gap-2"><Button variant="ghost" className="h-11" disabled={uploading} onClick={() => closeEditor(false)}>Cancel edits</Button><Button className="h-11" disabled={uploading} onClick={() => closeEditor(true)}>Apply changes</Button></div></div>
        </div>
      </section>;
    }
    const open = Boolean(expanded[id]);
    return <section key={id} id={`${prefix}-${id}`} aria-label={id === 'variants' ? 'Variant setup' : group.title} className="scroll-mt-3 overflow-hidden rounded-lg border">
      <h4><button type="button" id={`${prefix}-${id}-toggle`} aria-expanded={open} aria-controls={`${prefix}-${id}-body`} onClick={() => setExpanded(previous => ({ ...previous, [id]: !previous[id] }))} className="flex min-h-14 w-full items-center gap-3 px-3 py-3 text-left hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-4">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">{groups.indexOf(group) + 1}</span>
        <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{group.title}</span>{!open && <span className="mt-0.5 block text-xs text-muted-foreground">{group.summary}</span>}</span>
        <span className={`flex shrink-0 items-center gap-1 text-xs ${issues.length ? 'text-amber-700 dark:text-amber-300' : 'text-muted-foreground'}`}>{issues.length ? <><TriangleAlert className="size-3.5" /><span>{issues.length} to complete</span></> : group.checks.length ? 'Review' : 'Optional'}</span>
        <ChevronDown className={`size-4 shrink-0 text-muted-foreground ${open ? 'rotate-180' : ''}`} />
      </button></h4>
      <div id={`${prefix}-${id}-body`} hidden={!open} className="space-y-3 border-t px-3 pb-3 pt-2 sm:px-4">
        {body}
        {issues.length > 0 && <ul className="space-y-1 text-xs text-amber-700 dark:text-amber-300">{issues.map((issue, index) => <li key={index}>{issue}</li>)}</ul>}
      </div>
    </section>;
  };
  const mappingRow = (key: string) => <ListingFieldMappingRow key={key} product={product} baseline={baseline} sources={sources} target={MASTER_MAPPING_TARGETS.find(target => target.key === key)!} onChange={onChange} multiline={key === 'description'} />;
  const changes = baseline ? MASTER_MAPPING_TARGETS.filter(target => String(fieldValue(product, target.key)) !== String(fieldValue(baseline, target.key))) : [];
  return <div className={reviewFirst ? 'grid items-start gap-3 md:grid-cols-2' : 'space-y-3'} aria-label="Complete Master details">
    {!creationSetup && <div className="md:col-span-2"><h3 className="break-words text-base font-semibold">{product.name || 'Complete product details'}</h3><p className="mt-1 break-words text-xs text-muted-foreground">Master SKU: <span className="break-all font-mono">{product.sku_code}</span> · {product.status === 'published' ? 'Active' : 'Draft'}</p></div>}
    <div className="flex min-h-12 flex-wrap items-center justify-between gap-x-3 rounded-lg bg-muted/40 px-3 py-1 md:col-span-2">
      <p role="status" className="flex flex-wrap items-center gap-2 text-xs">{incomplete.length ? <><TriangleAlert className="size-4 text-amber-700 dark:text-amber-300" /><strong>{incomplete.length} section{incomplete.length === 1 ? '' : 's'} to complete</strong><span className="text-muted-foreground">{baseline?.status === 'published' ? 'before saving these changes' : 'before activation'}</span></> : <><CheckCircle2 className="size-4 text-emerald-600" />Master core data complete</>}</p>
      <div className="flex flex-wrap gap-2">{incomplete.length > 0 && <Button variant="ghost" disabled={reviewFirst && Boolean(editor)} className="h-11 px-2 text-xs" onClick={() => reveal(incomplete[0].id)}>Review missing details</Button>}{!reviewFirst && <Button variant="ghost" className="h-11 px-2 text-xs" onClick={() => setExpanded(Object.fromEntries(groups.map(group => [group.id, !allExpanded])))}>{allExpanded ? 'Collapse all sections' : 'Expand all sections'}</Button>}</div>
    </div>
    {!reviewFirst && <p className="text-xs text-muted-foreground">Check the source → edit the Master value. These import choices do not change sync settings.</p>}
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-1 text-xs md:col-span-2" aria-label="Master activation requirements">{checks.map(check => <span key={check.id} className={`flex items-center gap-1.5 ${check.done ? 'text-muted-foreground' : 'text-amber-700 dark:text-amber-300'}`}>{check.done ? <CheckCircle2 className="size-3.5" /> : <TriangleAlert className="size-3.5" />}{({ identity: 'Title', sku: 'SKU', content: 'Description', price: 'Price' })[check.id as 'identity']}</span>)}<ListingReviewHelp label="Master activation">Only title, unique SKU(s), description and valid price(s) are required to activate the Master. Channel-specific requirements do not block activation or other listings. SKU mapping confirmation is a separate linking step.</ListingReviewHelp></div>
    {section('identity', <>
      <div className="hidden grid-cols-[minmax(120px,.7fr)_minmax(180px,1fr)_minmax(220px,1.4fr)] gap-4 py-1 text-xs text-muted-foreground md:grid"><span>Master field</span><span>Source field &amp; value · change</span><span>{baseline ? 'Value after saving' : 'Value to create'} · editable</span></div>
      {mappingRow('name')}
      <ListingFieldMappingRow product={product} baseline={baseline} sources={sources} target={{ ...MASTER_MAPPING_TARGETS.find(target => target.key === 'categoryId')!, options: settings.categories.filter(item => item.status === 'Active').map(item => ({ value: item.id, label: categoryLabel(item.id) })) }} onChange={next => onChange(suggestAttributeFields(next, sources))} />{(!reviewFirst || !settings.categories.some(item => item.status === 'Active')) && <p className="text-xs text-muted-foreground">{settings.categories.some(item => item.status === 'Active') ? 'Choose your internal category. Shop taxonomy is not copied automatically.' : 'No active categories. You can add one later in Categories & Attributes.'}</p>}
      <ListingFieldMappingRow product={product} baseline={baseline} sources={sources} target={{ ...MASTER_MAPPING_TARGETS.find(target => target.key === 'brandId')!, options: settings.brands.filter(brand => brand.status === 'Active').map(brand => ({ value: brand.id, label: brand.name })) }} onChange={onChange} />
      {creationSetup?.(product, onChange)}
    </>)}
    {product.has_variants && section('variants', <>{!reviewFirst && <p className="text-xs text-muted-foreground">Record the actual options and SKUs. No variants or warehouse stock are inferred from the listing count.</p>}{(product.variant_options ?? []).map((option, index) => <div key={index} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-start"><div className="space-y-2"><Label htmlFor={`${prefix}-option-${index}`}>Option {index + 1}</Label><select id={`${prefix}-option-${index}`} className="h-11 w-full rounded-md border bg-background px-3 text-sm" value={option.attributeKey} onChange={event => { const attr = settings.attributes.find(item => item.key === event.target.value); update({ variant_options: product.variant_options!.map((item, i) => i === index ? { ...item, attributeKey: attr?.key ?? '', name: attr?.name ?? '' } : item) }); }}><option value="">Select attribute</option>{settings.attributes.filter(attr => attr.status === 'Active' && ['Single select', 'Multi-select'].includes(attr.type) && attr.options.trim()).map(attr => <option key={attr.key} value={attr.key}>{attr.name}</option>)}</select></div><div className="space-y-2"><Label htmlFor={`${prefix}-values-${index}`}>Values (comma separated)</Label><Input id={`${prefix}-values-${index}`} className="h-11" value={option.values.join(', ')} onChange={event => update({ variant_options: product.variant_options!.map((item, i) => i === index ? { ...item, values: event.target.value.split(',').map(value => value.trim()) } : item) })} /><p className="text-xs text-muted-foreground">Available values: {settings.attributes.find(attribute => attribute.key === option.attributeKey)?.options || 'Select an option first'}</p></div><Button variant="ghost" className="h-11 sm:mt-7" aria-label={`Remove option ${index + 1}`} onClick={() => update({ variant_options: product.variant_options!.filter((_, i) => i !== index) })}><Trash2 className="size-4" /><span className="sm:sr-only">Remove option</span></Button></div>)}{(product.variant_options?.length ?? 0) < 2 && <Button variant="outline" className="h-11" onClick={() => update({ variant_options: [...(product.variant_options ?? []), { attributeKey: '', name: '', values: [] }] })}><Plus className="size-4" />Add variant option</Button>}
      <div className="max-w-48 space-y-1"><Label htmlFor={`${prefix}-master-currency`}>Master currency *</Label><Input id={`${prefix}-master-currency`} className="h-11" value={product.price_currency} maxLength={3} aria-invalid={!/^[A-Z]{3}$/.test(product.price_currency)} onChange={event => update({ price_currency: event.target.value.toUpperCase() })} /></div>
      <div className="hidden grid-cols-3 gap-3 px-3 text-xs text-muted-foreground sm:grid"><span>Master variant SKU</span><span>Option values (use / between options)</span><span>Price ({product.price_currency})</span></div>
      {product.skus.map((sku, index) => <div key={sku.id} className="grid gap-3 rounded-lg bg-muted/20 p-3 sm:grid-cols-3">{(['sku_code', 'variation_name', 'price'] as const).map(key => <div key={key} className="space-y-1"><Label className="sm:sr-only" htmlFor={`${prefix}-sku-${index}-${key}`}>{key === 'sku_code' ? 'Master variant SKU' : key === 'variation_name' ? 'Option values (use / between options)' : `Price (${product.price_currency})`}</Label><Input id={`${prefix}-sku-${index}-${key}`} className="h-11" value={sku[key] ?? ''} type={key === 'price' ? 'number' : 'text'} min={key === 'price' ? '0' : undefined} onChange={event => update({ skus: product.skus.map((item, i) => i === index ? { ...item, [key]: key === 'price' ? Number(event.target.value) : event.target.value } : item) })} /></div>)}{!originalSkuIds.has(sku.id) && <Button variant="ghost" className="h-11 sm:col-span-3" onClick={() => update({ skus: product.skus.filter(item => item.id !== sku.id) })}><Trash2 className="size-4" />Remove variant SKU</Button>}</div>)}<Button variant="outline" className="h-11" onClick={() => update({ skus: [...product.skus, { id: `intake-sku-${crypto.randomUUID()}`, sku_code: '', variation_name: '', price: undefined, weight_g: 0, units_per_carton: 1, status: 'active' }] })}><Plus className="size-4" />Add variant SKU</Button>
      <ListingSkuMappings product={product} sources={sources} mappings={mappings} verifiedSingles={verifiedSingles} onChange={onMappingsChange} />
    </>)}

    {!product.has_variants && section('price', <>{mappingRow('retail_price')}<div className="max-w-48 space-y-1"><Label htmlFor={`${prefix}-currency`}>Currency *</Label><Input id={`${prefix}-currency`} className="h-11" maxLength={3} value={product.price_currency} onChange={event => update({ price_currency: event.target.value.toUpperCase() })} /></div>{!reviewFirst && <p className="text-xs text-muted-foreground">No currency conversion. Warehouse stock and shop prices stay unchanged.</p>}</>)}
    {section('attributes', <>{attributes.filter(attribute => attribute.required).map(attribute => {
      if (product.has_variants && product.variant_options?.some(option => option.attributeKey === attribute.key)) return null;
      return <ListingFieldMappingRow key={attribute.key} product={product} baseline={baseline} sources={sources} target={{ key: `attribute:${attribute.key}`, label: attribute.name, kind: 'text', required: false, multiple: attribute.type === 'Multi-select', options: ['Single select', 'Multi-select'].includes(attribute.type) ? attribute.options.split(',').map(value => ({ value: value.trim(), label: value.trim() })) : undefined }} onChange={onChange} />;
    })}{!attributes.some(attribute => attribute.required) && <p className="text-xs text-muted-foreground">No required category attributes.</p>}</>)}

    {section('content', <>
      {mappingRow('description')}
    <section className="space-y-2 border-t pt-3" aria-label="Product images"><div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-semibold">Product images <span className="font-normal text-muted-foreground">{masterMedia.count} image{masterMedia.count === 1 ? '' : 's'} · optional for activation · 9 max</span></h4><label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm focus-within:ring-2 focus-within:ring-ring"><ImagePlus className="size-4" />{uploading ? 'Adding images…' : 'Add images'}<input className="sr-only" type="file" aria-label="Upload product images" accept="image/jpeg,image/png,image/webp" multiple disabled={uploading} onChange={event => { void upload(event.target.files); event.target.value = ''; }} /></label></div>{!reviewFirst && <p className="text-xs text-muted-foreground">Choose the cover and remove unwanted images. Shop images stay unchanged.</p>}
      <div className="flex flex-wrap gap-3">{product.images.map((src, index) => <div key={src} className="w-32 min-w-0 space-y-1"><div className="relative aspect-square overflow-hidden rounded-lg border bg-muted/30"><img src={src} alt={`Master image ${index + 1}`} className="size-full object-contain" onLoad={() => imageStatus(src, true)} onError={() => imageStatus(src, false)} />{imageStates[src] === false && <div className="absolute inset-0 grid place-content-center bg-background/95 p-2 text-center text-xs text-destructive">Image unavailable. Remove or replace it.</div>}</div><p className="truncate text-xs text-muted-foreground" title={imageSources.get(src)}>{imageSources.has(src) ? `From ${imageSources.get(src)}` : src.startsWith('data:') ? 'Uploaded image' : 'Existing Master image'}</p><div className="flex gap-1"><Button variant="outline" className="h-11 flex-1 px-2 text-xs" disabled={index === 0} onClick={() => setImages([src, ...product.images.filter(image => image !== src)])}>{index === 0 ? 'Cover' : 'Set cover'}</Button><Button variant="ghost" className="size-11 p-0" aria-label={`Remove image ${index + 1}`} onClick={() => setImages(product.images.filter(image => image !== src))}><Trash2 className="size-4" /></Button></div></div>)}</div>
      {product.images.some(image => imageStates[image] === false) && <p role="alert" className="text-xs text-destructive">Image unavailable. Master activation is not blocked; review it before syncing images.</p>}
      {!masterMedia.ready && <p className="text-xs text-amber-700 dark:text-amber-300">Images are optional for Master activation. Each listing is checked against its own channel requirements.</p>}{uploadError && <p role="alert" className="text-sm text-destructive">{uploadError}</p>}
    </section>

    </>)}
    {section('shipping', <>{['pkg_length', 'pkg_width', 'pkg_height', 'pkg_weight'].map(mappingRow)}</>)}
    {section('identifiers', <>{['model_number', 'mpn', 'gtin', 'pack_quantity'].map(mappingRow)}</>)}
    {baseline && <div className="rounded-lg border bg-muted/20 p-3 text-xs leading-5" aria-label="Master change summary"><p className="font-medium">{changes.length ? `Master fields to update: ${changes.map(target => target.label).join(', ')}` : 'Existing Master fields are kept unless you change them.'}</p><p className="mt-1 text-muted-foreground">Images, attributes and SKU changes are reviewed above. {baseline.channels.length ? `${baseline.channels.length} existing linked listing(s) may use these values in a future sync. ` : ''}Saving here does not send updates to shops.</p></div>}

  </div>;
}
