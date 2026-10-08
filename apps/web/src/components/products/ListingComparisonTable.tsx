import { useEffect, useId, useRef, useState } from 'react';
import { Check, CircleHelp, LockKeyhole, Pencil, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Product } from '@/lib/product-store';
import type { CatalogImportItem } from '@/lib/catalog-import-store';
import { listingMatchEvidence, packTitleHint } from '@/lib/listing-match-evidence';
import { fieldMappingErrors, fieldValue, MASTER_MAPPING_TARGETS, type MappingTarget } from '@/lib/listing-field-mapping';
import { getProductCatalogSettings } from '@/lib/product-catalog-settings-store';
import { richTextPlainText } from '@/lib/product-master-readiness';
import { ListingFieldMappingRow } from './ListingFieldMappingRow';
import { ListingReviewHelp } from './ListingReviewHelp';

type Props = {
  baseline: Product; product: Product; current: CatalogImportItem; sources: CatalogImportItem[];
  onChange: (product: Product) => void; onEditingChange: (editing: boolean, dirty: boolean) => void;
  onSetupSkus: () => void;
};

/** All comparisons stay visible. Row edits only update a proposal, never the stored Master. */
export function ListingComparisonTable({ baseline, product, current, sources, onChange, onEditingChange, onSetupSkus }: Props) {
  const prefix = useId();
  const [editor, setEditor] = useState<{ key: string; product: Product } | null>(null);
  const [error, setError] = useState('');
  const callback = useRef(onEditingChange);
  callback.current = onEditingChange;
  const isEditing = Boolean(editor);
  const dirty = Boolean(editor && JSON.stringify(editor.product) !== JSON.stringify(product));
  useEffect(() => { callback.current(isEditing, dirty); }, [isEditing, dirty]);
  useEffect(() => () => callback.current(false, false), []);
  const settings = getProductCatalogSettings();
  const variant = product.has_variants || product.product_type === 'variant';
  const evidence = listingMatchEvidence(current, baseline);
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
  ];
  const format = (item: Product, key: string) => {
    if (key === 'brandId') return item.brand;
    if (key === 'categoryId') return item.category;
    if (key === 'description') return richTextPlainText(item.description);
    if (key === 'retail_price') return variant ? item.skus.filter(sku => sku.status === 'active').map(sku => `${sku.sku_code}: ${sku.price == null ? 'No price' : sku.price.toLocaleString()} ${item.price_currency}`).join('\n') : item.retail_price > 0 ? `${item.retail_price.toLocaleString()} ${item.price_currency}` : '';
    if (key === 'structure') return item.has_variants || item.product_type === 'variant' ? `With variants · ${item.skus.length} SKUs` : 'Single product · 1 SKU';
    return String(fieldValue(item, key));
  };
  const targetFor = (key: string): MappingTarget => {
    const target = MASTER_MAPPING_TARGETS.find(target => target.key === key)!;
    if (key === 'brandId') return { ...target, options: settings.brands.filter(brand => brand.status === 'Active').map(brand => ({ value: brand.id, label: brand.name })) };
    if (key === 'categoryId') return { ...target, options: settings.categories.filter(category => category.status === 'Active').map(category => ({ value: category.id, label: category.name })) };
    return target;
  };
  const close = (apply: boolean) => {
    if (!editor) return;
    const { key, product: draft } = editor;
    if (apply) {
      const problem = key === 'name' && !draft.name.trim() ? 'Enter a product title.'
        : key === 'description' && !richTextPlainText(draft.description) ? 'Enter a product description.'
        : key === 'retail_price' && (!/^[A-Z]{3}$/.test(draft.price_currency) || (variant
          ? !draft.skus.some(sku => sku.status === 'active') || draft.skus.some(sku => sku.status === 'active' && !(Number.isFinite(sku.price) && sku.price! > 0))
          : !(Number.isFinite(draft.retail_price) && draft.retail_price > 0))) ? 'Enter a valid price greater than zero for every Master SKU and a three-letter currency.'
        : fieldMappingErrors(draft, sources, baseline)[0];
      if (problem) { setError(problem); return; }
      if (dirty) onChange(draft);
    }
    setEditor(null); setError('');
    requestAnimationFrame(() => document.getElementById(`${prefix}-${key}-edit`)?.focus());
  };
  const text = (value: string, description = false) => !value ? <span className="text-muted-foreground">Not provided</span>
    : description && value.length > 180 ? <div><p className="line-clamp-3 whitespace-pre-line">{value}</p><details className="mt-1 text-xs"><summary className="w-fit cursor-pointer py-2 text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring">Read full description</summary><p className="whitespace-pre-line py-2">{value}</p></details></div>
    : <span className="whitespace-pre-line">{value}</span>;
  return <section aria-label="Comparison fields" className="overflow-hidden rounded-xl border">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
      <div className="flex items-center gap-1"><h3 className="text-sm font-semibold">Comparison fields</h3><ListingReviewHelp label="Comparison fields">Required labels apply to Master activation, not identical values across shops. Edit any supported row to change its source or proposed Master value. Nothing is saved until the final confirmation.</ListingReviewHelp></div>
      <span className="text-xs text-muted-foreground">Required Master fields first · {rows.length} fields</span>
    </div>
    <div role="table" aria-label="Product identity comparison">
      <div role="row" className="hidden gap-4 border-b bg-muted/30 px-4 py-3 text-xs font-medium text-muted-foreground md:grid md:grid-cols-[minmax(100px,.7fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(120px,.8fr)]">
        <span role="columnheader">Field</span><span role="columnheader">Source listing</span><span role="columnheader">Master · value to save</span><span role="columnheader">Review</span>
      </div>
      {rows.map(row => {
        const match = evidence.find(item => item.key === row.evidence);
        const value = format(product, row.key), previous = format(baseline, row.key);
        const changed = value !== previous;
        const editing = editor?.key === row.key;
        const missing = row.required && (!value || row.key === 'retail_price' && variant && product.skus.some(sku => sku.status === 'active' && !(sku.price! > 0)));
        const Icon = missing || match?.state === 'different' || match?.state === 'check' ? TriangleAlert : match?.state === 'missing' ? CircleHelp : Check;
        const caption = missing ? 'Master data missing' : match ? ({ match: 'Matches', different: 'Differs', missing: 'Unverified', check: 'SKU review needed' })[match.state] : row.required ? 'Master data provided' : 'Shop-specific';
        const decision = product.field_mappings?.[row.key];
        return <div key={row.key} role="rowgroup" className={`border-b last:border-b-0 ${editing ? 'bg-primary/[0.025]' : ''}`}>
          <div role="row" className="grid grid-cols-2 gap-x-4 gap-y-2 px-4 py-3 text-sm md:grid-cols-[minmax(100px,.7fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(120px,.8fr)]">
            <div role="rowheader" className="col-span-2 min-w-0 md:col-span-1"><p className="text-xs font-medium leading-5">{row.label}</p>{row.required && <span className="mt-1 block text-xs text-muted-foreground">Required</span>}</div>
            <div role="cell" className="min-w-0 break-words text-sm leading-5"><p className="mb-1 text-xs text-muted-foreground md:hidden">Source listing</p>{text(row.source, row.key === 'description')}{row.key === 'pack_quantity' && !row.source && packTitleHint(current.title) && <p className="mt-1 text-xs text-muted-foreground">{packTitleHint(current.title)}</p>}</div>
            <div role="cell" className="min-w-0 break-words text-sm leading-5"><p className="mb-1 text-xs text-muted-foreground md:hidden">Master · value to save</p>{text(value, row.key === 'description')}{changed && <p className="mt-1 text-xs text-muted-foreground">Current: {previous || 'Not provided'}</p>}{decision && changed && <p className="mt-1 text-xs text-muted-foreground">{decision.mode === 'source' && decision.source ? `${decision.source.shop} · ${decision.source.fieldLabel}` : 'Edited manually'} · Not saved</p>}{row.key === 'pack_quantity' && !value && packTitleHint(product.name) && <p className="mt-1 text-xs text-muted-foreground">{packTitleHint(product.name)}</p>}</div>
            <div role="cell" className="col-span-2 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2 gap-y-1 text-xs md:col-span-1">
              <p className={`flex items-start gap-1.5 leading-5 ${missing || match?.state === 'different' || match?.state === 'check' ? 'text-amber-700 dark:text-amber-300' : 'text-muted-foreground'}`}><Icon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />{caption}</p>
              {row.key === 'sku_code' ? <div className="col-span-2 flex items-center gap-1 text-muted-foreground"><LockKeyhole className="size-3.5" /><span>Internal code</span><ListingReviewHelp label="Master SKU identity">Shop and Master SKU codes can differ. Linking does not rename the existing Master. Use the dedicated Change Master SKU flow in Product data to safely change this identity.</ListingReviewHelp></div>
                : row.key === 'structure' ? <Button variant="ghost" className="col-span-2 -ml-2 h-11 justify-self-start px-2 text-xs" disabled={Boolean(editor)} onClick={onSetupSkus}>Set up SKUs & details</Button>
                : <Button id={`${prefix}-${row.key}-edit`} variant="ghost" className="-ml-2 h-11 px-2 text-xs" disabled={Boolean(editor)} aria-label={`Edit Master ${row.label}`} aria-expanded={editing} aria-controls={`${prefix}-${row.key}-editor`} onClick={() => { setEditor({ key: row.key, product: structuredClone(product) }); setError(''); requestAnimationFrame(() => document.getElementById(`${prefix}-${row.key}-editor`)?.querySelector<HTMLElement>('textarea, input, select')?.focus()); }}><Pencil className="size-3.5" />{changed ? 'Edit change' : 'Edit'}</Button>}
              {changed && <p className="col-span-2 font-medium text-primary">Proposed change</p>}
            </div>
          </div>
          {editing && editor && <div role="row"><div role="cell" aria-colspan={4} className="border-t px-4 py-3"><section id={`${prefix}-${row.key}-editor`} aria-label={`Edit Master ${row.label}`} className="space-y-3">
            {row.key === 'retail_price' && variant ? <div className="space-y-3">{editor.product.skus.filter(sku => sku.status === 'active').map(sku => <div key={sku.id} className="grid items-center gap-2 sm:grid-cols-2"><Label htmlFor={`${prefix}-${sku.id}-price`}>{sku.sku_code} · {sku.variation_name}</Label><Input id={`${prefix}-${sku.id}-price`} className="h-11" type="number" min="0" step="any" value={sku.price ?? ''} onChange={event => setEditor({ ...editor, product: { ...editor.product, skus: editor.product.skus.map(item => item.id === sku.id ? { ...item, price: event.target.value === '' ? undefined : Number(event.target.value) } : item) } })} /></div>)}</div>
              : <ListingFieldMappingRow product={editor.product} baseline={baseline} sources={sources} target={targetFor(row.key)} multiline={row.key === 'description'} onChange={next => { setEditor({ ...editor, product: next }); setError(''); }} />}
            {row.key === 'retail_price' && <div className="space-y-1.5"><Label htmlFor={`${prefix}-currency`}>Master currency</Label><Input id={`${prefix}-currency`} className="h-11 max-w-40" maxLength={3} value={editor.product.price_currency} onChange={event => { setEditor({ ...editor, product: { ...editor.product, price_currency: event.target.value.toUpperCase() } }); setError(''); }} /><p className="text-xs text-muted-foreground">Shop prices and currencies are unchanged. Changing currency does not convert amounts; review every Master price.</p></div>}
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-muted-foreground">Proposal only · applies to this shared Master, not the source listing.</p><div className="flex gap-2"><Button variant="ghost" className="h-11" onClick={() => close(false)}>Cancel edit</Button><Button className="h-11" onClick={() => close(true)}>Apply to review</Button></div></div>
          </section></div></div>}
        </div>;
      })}
    </div>
  </section>;
}
