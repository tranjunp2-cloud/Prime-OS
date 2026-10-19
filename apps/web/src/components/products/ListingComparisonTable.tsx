import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Product } from '@/lib/product-store';
import type { CatalogImportItem } from '@/lib/catalog-import-store';
import { listingMatchEvidence } from '@/lib/listing-match-evidence';
import { convertField, fieldMappingErrors, fieldValue, mappingDecision, MASTER_MAPPING_TARGETS, suggestAttributeFields, writeMappedField, type FieldCandidate, type MappingTarget } from '@/lib/listing-field-mapping';
import { getProductCatalogSettings, resolveCatalogCategory } from '@/lib/product-catalog-settings-store';
import { assignedCategoryAttributes } from '@/lib/category-schema';
import { completionReadiness, type VariantMappings } from '@/lib/listing-master-completion';
import { richTextPlainText } from '@/lib/product-master-readiness';
import { ListingFieldMappingRow } from './ListingFieldMappingRow';
import { ListingGroupComparison } from './ListingGroupComparison';
import type { SkuMatrixControls } from './ListingSkuMatrixRows';
import { ListingMasterCompletion } from './ListingMasterCompletion';

type Props = {
  baseline: Product; product: Product; current: CatalogImportItem; sources: CatalogImportItem[];
  onChange: (product: Product) => void; onEditingChange: (editing: boolean, dirty: boolean) => void;
  onSetupSkus: () => void;
  skuMatrix: SkuMatrixControls;
  creating?: boolean;
  onMediaReady?: (ready: boolean) => void;
  onImagePreview?: (src: string, name: string) => void;
  onRemoveSource?: (id: string) => void;
};

/** All comparisons stay visible. Row edits only update a proposal, never the stored Master. */
export function ListingComparisonTable({ baseline, product, current, sources, onChange, onEditingChange, onSetupSkus, skuMatrix, creating = false, onMediaReady, onImagePreview, onRemoveSource }: Props) {
  const prefix = useId();
  const editorTrigger = useRef<HTMLElement | null>(null);
  const [editor, setEditor] = useState<{ key: string; product: Product; mappings?: VariantMappings; sourceId?: string; fieldKey?: string } | null>(null);
  const [error, setError] = useState('');
  const [skuEditing, setSkuEditing] = useState(false);
  const [mediaReady, setMediaReady] = useState(true);
  const mediaCallback = useRef(onMediaReady);
  mediaCallback.current = onMediaReady;
  useEffect(() => { if (creating) mediaCallback.current?.(true); }, [creating]);
  const callback = useRef(onEditingChange);
  callback.current = onEditingChange;
  const isEditing = Boolean(editor) || skuEditing;
  const dirty = skuEditing || Boolean(editor && (JSON.stringify(editor.product) !== JSON.stringify(product) || editor.mappings && JSON.stringify(editor.mappings) !== JSON.stringify(skuMatrix.mappings)));
  useEffect(() => { callback.current(isEditing, dirty); }, [isEditing, dirty]);
  useEffect(() => () => callback.current(false, false), []);
  const settings = getProductCatalogSettings();
  const variant = product.has_variants || product.product_type === 'variant';
  const evidence = listingMatchEvidence(current, baseline);
  const attributes = creating ? assignedCategoryAttributes(resolveCatalogCategory(product, settings.categories), settings.attributes)
    .filter(attribute => !(variant && product.variant_options?.some(option => option.attributeKey === attribute.key))) : [];
  const rows = [
    { key: 'name', label: 'Title', source: current.title, required: true },
    { key: 'sku_code', label: 'Master SKU', source: current.channelSku, required: true, evidence: 'sku' },
    { key: 'description', label: 'Description', source: richTextPlainText(current.description ?? ''), required: true },
    { key: 'retail_price', label: variant ? 'Variant prices' : 'Price', source: Number.isFinite(current.price) ? `${current.price.toLocaleString()} ${current.currency}` : '', required: true },
    { key: 'brandId', label: 'Brand', source: current.brand || '', evidence: 'brand' },
    { key: 'model_number', label: 'Model', source: current.modelNumber || '', evidence: 'model' },
    { key: 'mpn', label: 'Manufacturer part number', source: current.mpn || '', evidence: 'mpn' },
    { key: 'gtin', label: 'Barcode (GTIN)', source: current.gtin || '', evidence: 'gtin' },
    { key: 'pack_quantity', label: 'Pack quantity', source: current.packQuantity ? `${current.packQuantity} units` : '', evidence: 'pack' },
    { key: 'categoryId', label: 'Category', source: current.channelCategory || '' },
    { key: 'structure', label: 'Product structure', source: evidence.find(row => row.key === 'structure')?.listing || '', evidence: 'structure' },
    ...(creating ? [
      { key: 'images', label: 'Images', source: '' },
      ...attributes.map(attribute => ({ key: `attribute:${attribute.key}`, label: attribute.name, source: '' })),
      ...MASTER_MAPPING_TARGETS.filter(target => target.key.startsWith('pkg_')).map(target => ({ key: target.key, label: target.label, source: '' })),
    ] : []),
  ];
  const format = (item: Product, key: string) => {
    if (key === 'brandId') return item.brand;
    if (key === 'categoryId') return item.category;
    if (key === 'description') return richTextPlainText(item.description);
    if (key === 'images') return item.images.length ? `${item.images.length} images` : '';
    if (key.startsWith('pkg_')) return Number(fieldValue(item, key)) > 0 ? `${fieldValue(item, key)} ${key === 'pkg_weight' ? 'g' : 'cm'}` : '';
    if (key === 'retail_price') return item.has_variants || item.product_type === 'variant' ? item.skus.filter(sku => sku.status === 'active').map(sku => `${sku.sku_code}: ${sku.price == null ? 'No price' : sku.price.toLocaleString()} ${item.price_currency}`).join('\n') : item.retail_price > 0 ? `${item.retail_price.toLocaleString()} ${item.price_currency}` : '';
    if (key === 'structure') return item.has_variants || item.product_type === 'variant' ? `With variants · ${item.skus.length} SKUs` : 'Single product · 1 SKU';
    return String(fieldValue(item, key));
  };
  const targetFor = (key: string): MappingTarget => {
    if (key.startsWith('attribute:')) {
      const attribute = attributes.find(attribute => `attribute:${attribute.key}` === key)!;
      return { key, label: attribute.name, kind: 'text', sourceKey: `attribute_${attribute.key}`, multiple: attribute.type === 'Multi-select', options: ['Single select', 'Multi-select'].includes(attribute.type) ? attribute.options.split(',').map(value => ({ value: value.trim(), label: value.trim() })) : undefined };
    }
    const target = MASTER_MAPPING_TARGETS.find(target => target.key === key)!;
    if (key === 'brandId') return { ...target, options: settings.brands.filter(brand => brand.status === 'Active').map(brand => ({ value: brand.id, label: brand.name })) };
    if (key === 'categoryId') return { ...target, options: settings.categories.filter(category => category.status === 'Active').map(category => ({ value: category.id, label: category.name })) };
    return target;
  };
  const close = (apply: boolean) => {
    if (!editor || !mediaReady) return;
    const { key, product: draft } = editor;
    if (apply) {
      const problem = creating ? fieldMappingErrors(draft, sources)[0] : key === 'sku_code' && !draft.sku_code.trim() ? 'Enter a Master SKU.'
        : key === 'name' && !draft.name.trim() ? 'Enter a product title.'
        : key === 'description' && !richTextPlainText(draft.description) ? 'Enter a product description.'
        : key === 'retail_price' && (!/^[A-Z]{3}$/.test(draft.price_currency) || (variant
          ? !draft.skus.some(sku => sku.status === 'active') || draft.skus.some(sku => sku.status === 'active' && !(Number.isFinite(sku.price) && sku.price! > 0))
          : !(Number.isFinite(draft.retail_price) && draft.retail_price > 0))) ? 'Enter a valid price greater than zero for every Master SKU and a three-letter currency.'
        : fieldMappingErrors(draft, sources, creating ? undefined : baseline)[0];
      if (problem) { setError(problem); return; }
      if (dirty) {
        onChange(key === 'categoryId' ? suggestAttributeFields(draft, sources) : draft);
        if (editor.mappings && JSON.stringify(editor.mappings) !== JSON.stringify(skuMatrix.mappings)) skuMatrix.onMappingsChange(editor.mappings);
      }
    }
    setEditor(null); setError('');
    requestAnimationFrame(() => (editorTrigger.current?.isConnected ? editorTrigger.current : document.getElementById(`${prefix}-${key}-edit`))?.focus());
  };
  const text = (value: string, description = false) => !value ? <span className="text-muted-foreground">Not provided</span>
    : description && value.length > 180 ? <div><p className="line-clamp-3 whitespace-pre-line">{value}</p><details className="mt-1 text-xs"><summary className="w-fit cursor-pointer py-2 text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring">Read full description</summary><p className="whitespace-pre-line py-2">{value}</p></details></div>
    : <span className="whitespace-pre-line">{value}</span>;
  const openEditor = (key: string, source?: CatalogImportItem, field?: FieldCandidate, returnFocus?: HTMLElement) => {
    // Menu items unmount after selection; return to their persistent trigger instead.
    editorTrigger.current = returnFocus ?? document.activeElement as HTMLElement | null;
    setEditor({ key, product: structuredClone(product), mappings: structuredClone(skuMatrix.mappings), sourceId: source?.id, fieldKey: field?.key }); setError('');
    requestAnimationFrame(() => document.getElementById(`${prefix}-${key}-editor`)?.querySelector<HTMLElement>('textarea, input, select')?.focus());
  };
  const renderEditor = (row: typeof rows[number]) => editor?.key === row.key && <section id={`${prefix}-${row.key}-editor`} aria-label={`Edit Master ${row.label}`} className="space-y-3 p-4">
    {row.key === 'sku_code' ? <div className="space-y-2"><Label htmlFor={`${prefix}-master-sku`}>Master SKU</Label><Input id={`${prefix}-master-sku`} className="h-11 font-mono" value={editor.product.sku_code} onChange={event => setEditor({ ...editor, product: { ...editor.product, sku_code: event.target.value.toUpperCase() } })} /><p className="text-xs text-muted-foreground">Unique internal code for the new Master. Shop SKU codes stay unchanged.</p></div>
      : row.key === 'structure' || row.key === 'images' ? <>
        {row.key === 'structure' && <fieldset className="space-y-2"><legend className="text-sm font-medium">Product type</legend><div className="flex flex-wrap gap-2">{(['single', 'variant'] as const).map(type => <label key={type} className="flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:disabled]:opacity-50"><input type="radio" name={`${prefix}-product-type`} checked={editor.product.product_type === type} disabled={type === 'single' && sources.some(source => source.variants > 1)} onChange={() => setEditor({ ...editor, product: { ...editor.product, product_type: type, has_variants: type === 'variant' }, mappings: {} })} />{type === 'single' ? 'Single product' : 'With variants'}</label>)}</div></fieldset>}
        {(row.key === 'images' || editor.product.has_variants) && <ListingMasterCompletion embeddedGroup={row.key === 'images' ? 'content' : 'variants'} product={editor.product} sources={sources} preservedSkuIds={[]} mappings={editor.mappings ?? skuMatrix.mappings} verifiedSingles={skuMatrix.verifiedSingles}
          onChange={next => setEditor(value => value && { ...value, product: next })} onMappingsChange={next => setEditor(value => value && { ...value, mappings: next })}
          onMediaReady={ready => { setMediaReady(ready); onMediaReady?.(ready); }} />}
      </>
      : row.key === 'retail_price' && variant ? <div className="space-y-3">{editor.product.skus.filter(sku => sku.status === 'active').map(sku => <div key={sku.id} className="grid items-center gap-2 sm:grid-cols-2"><Label htmlFor={`${prefix}-${sku.id}-price`}>{sku.sku_code} · {sku.variation_name}</Label><Input id={`${prefix}-${sku.id}-price`} className="h-11" type="number" min="0" step="any" value={sku.price ?? ''} onChange={event => setEditor({ ...editor, product: { ...editor.product, skus: editor.product.skus.map(item => item.id === sku.id ? { ...item, price: event.target.value === '' ? undefined : Number(event.target.value) } : item) } })} /></div>)}</div>
      : <ListingFieldMappingRow key={`${editor.key}:${editor.sourceId || ''}`} product={editor.product} baseline={creating ? undefined : baseline} sources={sources} target={targetFor(row.key)} initialSourceId={editor.sourceId} initialFieldKey={editor.fieldKey} multiline={row.key === 'description'} onChange={next => { setEditor({ ...editor, product: next }); setError(''); }} />}
    {row.key === 'retail_price' && <div className="space-y-1.5"><Label htmlFor={`${prefix}-currency`}>Master currency</Label><Input id={`${prefix}-currency`} className="h-11 max-w-40" maxLength={3} value={editor.product.price_currency} onChange={event => { setEditor({ ...editor, product: { ...editor.product, price_currency: event.target.value.toUpperCase() } }); setError(''); }} /><p className="text-xs text-muted-foreground">Shop prices and currencies are unchanged. Changing currency does not convert amounts; review every Master price.</p></div>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-muted-foreground">Proposal only · applies to this shared Master, not the source listing.</p><div className="flex gap-2"><Button variant="ghost" className="h-11" disabled={!mediaReady} onClick={() => close(false)}>Cancel edit</Button><Button className="h-11" disabled={!mediaReady} onClick={() => close(true)}>Apply to review</Button></div></div>
  </section>;
  return <ListingGroupComparison creating={creating} activationChecks={creating ? completionReadiness(product, sources).checks : undefined} baseline={baseline} product={product} sources={sources} rows={rows} format={format} text={text} prefix={prefix} editingKey={editor?.key} onEdit={openEditor} renderEditor={renderEditor} onSetupSkus={creating ? () => openEditor('structure') : onSetupSkus}
    skuMatrix={skuMatrix} skuEditing={skuEditing} onSkuEditingChange={setSkuEditing} onChange={onChange} onImagePreview={onImagePreview} onRemoveSource={onRemoveSource}
    onUse={(key, candidate, returnFocus) => {
      const target = targetFor(key), result = convertField(candidate, target, product.price_currency);
      if (result.error || (target.required && (target.kind === 'text' ? !richTextPlainText(String(result.value)) : !(Number(result.value) > 0)))) { openEditor(key, candidate.source, candidate, returnFocus); return; }
      onChange(writeMappedField(product, target, result.value, mappingDecision(candidate, result.value, 'source', result.transform)));
    }} onReset={key => {
      if (key === 'sku_code' || key === 'images') { onChange({ ...product, [key]: structuredClone(baseline[key]) }); return; }
      const next = writeMappedField(product, targetFor(key), fieldValue(baseline, key), { mode: 'master', value: fieldValue(baseline, key) });
      if (key === 'brandId') next.brand = baseline.brand;
      if (key === 'categoryId') next.category = baseline.category;
      if (key === 'retail_price') { next.skus = structuredClone(product.skus).map(sku => { const previous = baseline.skus.find(old => old.id === sku.id); return previous ? { ...sku, price: previous.price } : sku; }); next.price_currency = baseline.price_currency; }
      if (baseline.field_mappings?.[key]) next.field_mappings![key] = structuredClone(baseline.field_mappings[key]); else delete next.field_mappings![key];
      if (!Object.keys(next.field_mappings!).length && !baseline.field_mappings) delete next.field_mappings;
      onChange(next);
    }} />;
}
