import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, ImagePlus, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Product } from '@/lib/product-store';
import type { CatalogImportItem } from '@/lib/catalog-import-store';
import { getProductCatalogSettings, resolveCatalogCategory } from '@/lib/product-catalog-settings-store';
import { assignedCategoryAttributes, matchesAttribute } from '@/lib/category-schema';
import { completionReadiness, sourceImages, type VariantMappings } from '@/lib/listing-master-completion';
import { richTextPlainText } from '@/lib/product-master-readiness';
import { getMasterMediaReadiness, MIN_MASTER_IMAGES } from '@/lib/product-master-media';

type Props = {
  product: Product; sources: CatalogImportItem[]; onChange: (product: Product) => void;
  mappings: VariantMappings; onMappingsChange: (mappings: VariantMappings) => void;
  onMediaReady: (ready: boolean) => void;
};

/** Required details for a new Master. Existing-Master mapping never opens this form. */
export function ListingMasterCompletion({ product, sources, onChange, mappings, onMappingsChange, onMediaReady }: Props) {
  const prefix = useId();
  const [originalSkuIds] = useState(() => new Set(product.skus.map(sku => sku.id)));
  const checks = completionReadiness(product, sources).checks;
  const masterMedia = getMasterMediaReadiness(product.images);
  const [imageStates, setImageStates] = useState<Record<string, boolean>>({});
  const missing = checks.filter(check => !check.done || (check.id === 'media' && product.images.some(image => imageStates[image] !== true)));
  const [initialMissing] = useState(() => new Set(missing.map(check => check.id)));
  const [showAll, setShowAll] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);
  const mediaCallback = useRef(onMediaReady);
  mediaCallback.current = onMediaReady;
  useEffect(() => {
    mediaCallback.current(!uploading && getMasterMediaReadiness(product.images).ready && product.images.every(image => imageStates[image] === true));
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
    onMediaReady(!uploading && getMasterMediaReadiness(images).ready && images.every(image => imageStates[image] === true));
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
  const section = (id: string, title: string, body: ReactNode) => {
    const check = checks.find(item => item.id === id);
    if (!showAll && !initialMissing.has(id) && check?.done !== false) return null;
    return <section tabIndex={-1} id={`${prefix}-${id}`} className="space-y-3 border-b pb-5" aria-label={title}><h4 className="text-sm font-semibold">{title}{check && !check.done && <span className="ml-2 text-xs font-normal text-amber-700 dark:text-amber-300">Required</span>}</h4>{body}{check && !check.done && <p className="text-xs text-amber-700 dark:text-amber-300">{check.label}</p>}</section>;
  };
  const numberField = (key: 'retail_price' | 'pkg_length' | 'pkg_width' | 'pkg_height' | 'pkg_weight', label: string) => <div className="space-y-2"><Label htmlFor={`${prefix}-${key}`}>{label} *</Label><Input id={`${prefix}-${key}`} className="h-11" type="number" min="0" step="any" value={product[key] || ''} aria-invalid={!(product[key] > 0)} onChange={event => update({ [key]: Number(event.target.value) })} /></div>;
  return <div className="space-y-5" aria-label="Complete Master details">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="break-words text-base font-semibold">{product.name || 'Complete product details'}</h3><p className="mt-1 break-words text-sm text-muted-foreground">{product.status === 'published' ? 'Active Master · save reviewed changes' : 'Draft → Active after confirmation'}. Master SKU: <span className="break-all font-mono">{product.sku_code}</span></p></div><Button variant="ghost" className="h-11" onClick={() => setShowAll(value => !value)}>{showAll ? 'Show required details' : 'View all details'}</Button></div>
    <div role="status" className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-sm">{missing.length ? <><strong>{missing.length} required sections remaining</strong>{missing.map(check => <a key={check.id} className="inline-flex min-h-11 items-center underline underline-offset-4" href={`#${prefix}-${check.id}`}>{check.id === 'content' ? 'Description' : check.id.charAt(0).toUpperCase() + check.id.slice(1)}</a>)}</> : <><CheckCircle2 className="size-4 text-emerald-600" />Required product details complete</>}</div>
    {section('identity', 'Product identity', <div className="space-y-2"><Label htmlFor={`${prefix}-name`}>Product name *</Label><Input className="h-11" id={`${prefix}-name`} value={product.name} onChange={event => update({ name: event.target.value })} /></div>)}
    <section tabIndex={-1} id={`${prefix}-media`} className="space-y-3 border-b pb-5" aria-label="Product images"><div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-semibold">Product images <span className="font-normal text-muted-foreground">{masterMedia.count} image{masterMedia.count === 1 ? '' : 's'} · {MIN_MASTER_IMAGES} required · 9 max</span></h4><label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm focus-within:ring-2 focus-within:ring-ring"><ImagePlus className="size-4" />{uploading ? 'Adding images…' : 'Add images'}<input className="sr-only" type="file" aria-label="Upload product images" accept="image/jpeg,image/png,image/webp" multiple disabled={uploading} onChange={event => { void upload(event.target.files); event.target.value = ''; }} /></label></div><p className="text-xs text-muted-foreground">Listing images are added automatically. Existing cover stays first. Review before saving; shop images are unchanged.</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{product.images.map((src, index) => <div key={src} className="min-w-0 space-y-2"><div className="relative aspect-square overflow-hidden rounded-lg border bg-muted/30"><img src={src} alt={`Master image ${index + 1}`} className="size-full object-contain" onLoad={() => imageStatus(src, true)} onError={() => imageStatus(src, false)} />{imageStates[src] === false && <div className="absolute inset-0 grid place-content-center bg-background/95 p-2 text-center text-xs text-destructive">Image unavailable. Remove or replace it.</div>}</div><p className="truncate text-xs text-muted-foreground" title={imageSources.get(src)}>{imageSources.has(src) ? `From ${imageSources.get(src)}` : src.startsWith('data:') ? 'Uploaded image' : 'Existing Master image'}</p><div className="flex gap-1"><Button variant="outline" className="h-11 flex-1 px-2 text-xs" disabled={index === 0} onClick={() => setImages([src, ...product.images.filter(image => image !== src)])}>{index === 0 ? 'Cover' : 'Set cover'}</Button><Button variant="ghost" className="size-11 p-0" aria-label={`Remove image ${index + 1}`} onClick={() => setImages(product.images.filter(image => image !== src))}><Trash2 className="size-4" /></Button></div></div>)}</div>
      {product.images.some(image => imageStates[image] === false) && <p role="alert" className="text-xs text-destructive">Remove or replace unavailable images before confirming.</p>}
      {!masterMedia.ready && <p className="text-xs text-amber-700 dark:text-amber-300">Add at least {MIN_MASTER_IMAGES} product image to continue. JPG, PNG or WebP · up to 5 MB each.</p>}{uploadError && <p role="alert" className="text-sm text-destructive">{uploadError}</p>}
    </section>
    {section('category', 'Category', <div className="space-y-2"><Label htmlFor={`${prefix}-category-input`}>Master category *</Label><select id={`${prefix}-category-input`} className="h-11 w-full rounded-md border bg-background px-3 text-sm" value={product.categoryId ?? category?.id ?? ''} onChange={event => { const next = settings.categories.find(item => item.id === event.target.value); update({ categoryId: next?.id, category: next?.name ?? '' }); }}><option value="">Select category</option>{settings.categories.filter(item => item.status === 'Active').map(item => <option key={item.id} value={item.id}>{categoryLabel(item.id)}</option>)}</select><p className="text-xs text-muted-foreground">Uses your internal category and its required attributes, not the shop category.</p></div>)}
    {section('content', 'Description', <div className="space-y-2"><Label htmlFor={`${prefix}-description`}>Product description *</Label><Textarea id={`${prefix}-description`} rows={5} value={product.description} onChange={event => update({ description: event.target.value })} /><p className="text-xs text-muted-foreground">{richTextPlainText(product.description).length}/100 minimum characters. {sources.some(source => source.description === product.description) ? 'Copied from the listing.' : ''}</p></div>)}
    {(product.has_variants || (!showAll && !initialMissing.has('price') && !/^[A-Z]{3}$/.test(product.price_currency))) && <div className="max-w-48 space-y-2"><Label htmlFor={`${prefix}-master-currency`}>Master currency *</Label><Input id={`${prefix}-master-currency`} className="h-11" value={product.price_currency} maxLength={3} aria-invalid={!/^[A-Z]{3}$/.test(product.price_currency)} onChange={event => update({ price_currency: event.target.value.toUpperCase() })} /></div>}
    {section('price', 'Pricing', product.has_variants ? <p className="text-sm text-muted-foreground">Enter prices for each active SKU below. Stock can stay at zero.</p> : <div className="space-y-3"><div className="grid gap-3 sm:grid-cols-2">{numberField('retail_price', 'Base price')}<div className="space-y-2"><Label htmlFor={`${prefix}-currency`}>Currency *</Label><Input id={`${prefix}-currency`} className="h-11" maxLength={3} value={product.price_currency} onChange={event => update({ price_currency: event.target.value.toUpperCase() })} /></div></div>{sources.filter(source => Number.isFinite(source.price) && source.price > 0).map(source => <Button key={source.id} variant="outline" className="h-auto min-h-11 whitespace-normal" onClick={() => update({ retail_price: source.price, price_currency: source.currency.toUpperCase() })}>Use {source.price} {source.currency} from {source.storeName}</Button>)}<p className="text-xs text-muted-foreground">No currency conversion. Warehouse stock and shop prices are not changed.</p></div>)}
    {section('attributes', 'Required category attributes', <div className="grid gap-4 sm:grid-cols-2">{attributes.filter(attribute => attribute.required).map(attribute => {
      if (product.has_variants && product.variant_options?.some(option => option.attributeKey === attribute.key)) return null;
      const value = product.specifications?.find(spec => matchesAttribute(spec, attribute))?.value ?? '';
      const setValue = (value: string) => update({ specifications: [...(product.specifications ?? []).filter(spec => !matchesAttribute(spec, attribute)), { attributeKey: attribute.key, name: attribute.name, value }] });
      return <div key={attribute.key} className="space-y-2"><Label htmlFor={`${prefix}-attr-${attribute.key}`}>{attribute.name} *</Label>{attribute.type === 'Single select' ? <select id={`${prefix}-attr-${attribute.key}`} className="h-11 w-full rounded-md border bg-background px-3 text-sm" value={value} onChange={event => setValue(event.target.value)}><option value="">Select {attribute.name.toLowerCase()}</option>{attribute.options.split(',').map(option => <option key={option.trim()} value={option.trim()}>{option.trim()}</option>)}</select> : <Input id={`${prefix}-attr-${attribute.key}`} className="h-11" value={value} onChange={event => setValue(event.target.value)} />}</div>;
    })}</div>)}
    {section('shipping', 'Shipping package', <div className="grid gap-3 sm:grid-cols-2">{numberField('pkg_length', 'Package length (cm)')}{numberField('pkg_width', 'Package width (cm)')}{numberField('pkg_height', 'Package height (cm)')}{numberField('pkg_weight', 'Package weight (g)')}</div>)}
    {product.has_variants && <section tabIndex={-1} id={`${prefix}-variants`} className="space-y-4 border-b pb-5" aria-label="Variant setup"><h4 className="text-sm font-semibold">Variant options &amp; SKUs</h4><p className="text-xs text-muted-foreground">Record the actual options and SKUs. No variants or warehouse stock are inferred from the listing count.</p>{(product.variant_options ?? []).map((option, index) => <div key={index} className="grid gap-3 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor={`${prefix}-option-${index}`}>Option {index + 1}</Label><select id={`${prefix}-option-${index}`} className="h-11 w-full rounded-md border bg-background px-3 text-sm" value={option.attributeKey} onChange={event => { const attr = settings.attributes.find(item => item.key === event.target.value); update({ variant_options: product.variant_options!.map((item, i) => i === index ? { ...item, attributeKey: attr?.key ?? '', name: attr?.name ?? '' } : item) }); }}><option value="">Select attribute</option>{settings.attributes.filter(attr => attr.status === 'Active' && ['Single select', 'Multi-select'].includes(attr.type) && attr.options.trim()).map(attr => <option key={attr.key} value={attr.key}>{attr.name}</option>)}</select></div><div className="space-y-2"><Label htmlFor={`${prefix}-values-${index}`}>Values (comma separated)</Label><Input id={`${prefix}-values-${index}`} className="h-11" value={option.values.join(', ')} onChange={event => update({ variant_options: product.variant_options!.map((item, i) => i === index ? { ...item, values: event.target.value.split(',').map(value => value.trim()) } : item) })} /><p className="text-xs text-muted-foreground">Available values: {settings.attributes.find(attribute => attribute.key === option.attributeKey)?.options || 'Select an option first'}</p></div><Button variant="ghost" className="h-11 sm:col-span-2" onClick={() => update({ variant_options: product.variant_options!.filter((_, i) => i !== index) })}>Remove option</Button></div>)}{(product.variant_options?.length ?? 0) < 2 && <Button variant="outline" className="h-11" onClick={() => update({ variant_options: [...(product.variant_options ?? []), { attributeKey: '', name: '', values: [] }] })}><Plus className="size-4" />Add variant option</Button>}
      {product.skus.map((sku, index) => <div key={sku.id} className="grid gap-3 rounded-lg bg-muted/20 p-3 sm:grid-cols-3">{(['sku_code', 'variation_name', 'price'] as const).map(key => <div key={key} className="space-y-2"><Label htmlFor={`${prefix}-sku-${index}-${key}`}>{key === 'sku_code' ? 'Master variant SKU' : key === 'variation_name' ? 'Option values (use / between options)' : `Price (${product.price_currency})`}</Label><Input id={`${prefix}-sku-${index}-${key}`} className="h-11" value={sku[key] ?? ''} type={key === 'price' ? 'number' : 'text'} min={key === 'price' ? '0' : undefined} onChange={event => update({ skus: product.skus.map((item, i) => i === index ? { ...item, [key]: key === 'price' ? Number(event.target.value) : event.target.value } : item) })} /></div>)}{!originalSkuIds.has(sku.id) && <Button variant="ghost" className="h-11 sm:col-span-3" onClick={() => update({ skus: product.skus.filter(item => item.id !== sku.id) })}><Trash2 className="size-4" />Remove variant SKU</Button>}</div>)}<Button variant="outline" className="h-11" onClick={() => update({ skus: [...product.skus, { id: `intake-sku-${crypto.randomUUID()}`, sku_code: '', variation_name: '', price: undefined, weight_g: 0, units_per_carton: 1, status: 'active' }] })}><Plus className="size-4" />Add variant SKU</Button>
      <h4 className="text-sm font-semibold">Map source SKUs</h4><p className="text-xs text-muted-foreground">Shop SKU → Master variant SKU</p>{sources.map(source => {
        const rows = mappings[source.id] ?? Array.from({ length: source.variants || Math.max(1, product.skus.length) }, (_, index) => ({ shop_sku: source.variantItems?.[index]?.sku ?? (source.variants === 1 ? source.channelSku : ''), master_sku_id: '' }));
        return <div key={source.id} className="space-y-2"><p className="text-xs text-muted-foreground">{source.storeName} · {source.channelSku}</p>{rows.map((row, index) => <div key={index} className="grid gap-2 sm:grid-cols-2"><Input className="h-11" aria-label={`Source SKU ${index + 1} from ${source.storeName}`} placeholder="Actual shop child SKU" value={row.shop_sku} readOnly={Boolean(source.variantItems?.[index]?.sku)} onChange={event => onMappingsChange({ ...mappings, [source.id]: rows.map((item, i) => i === index ? { ...item, shop_sku: event.target.value } : item) })} /><select aria-label={`Master SKU for source ${index + 1} from ${source.storeName}`} className="h-11 w-full rounded-md border bg-background px-3 text-sm" value={row.master_sku_id} onChange={event => onMappingsChange({ ...mappings, [source.id]: rows.map((item, i) => i === index ? { ...item, master_sku_id: event.target.value } : item) })}><option value="">Choose Master SKU</option>{product.skus.filter(sku => sku.status === 'active').map(sku => <option key={sku.id} value={sku.id}>{sku.sku_code || 'Enter SKU above'} · {sku.variation_name}</option>)}</select></div>)}</div>;
      })}
    </section>}
    <p className="text-xs text-muted-foreground">Only reviewed Master data and links are saved. Nothing is published to shops. Stock and sync stay unchanged.</p>
  </div>;
}
