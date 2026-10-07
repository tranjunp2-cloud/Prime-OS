import { useId, useState, type ReactNode } from 'react';
import { ArrowRight, RotateCcw, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Product } from '@/lib/product-store';
import type { CatalogImportItem } from '@/lib/catalog-import-store';
import { convertField, fieldCandidateId, fieldValue, importedFieldCandidates, mappingDecision, writeMappedField, type MappingTarget } from '@/lib/listing-field-mapping';

type Props = { product: Product; baseline?: Product; sources: CatalogImportItem[]; target: MappingTarget; onChange: (product: Product) => void; multiline?: boolean; children?: (value: string | number, set: (value: string | number) => void, id: string) => ReactNode };

/** Source snapshots are read-only. Editing the result never writes back to a shop. */
export function ListingFieldMappingRow({ product, baseline, sources, target, onChange, multiline, children }: Props) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState('');
  const [mappedValue, setMappedValue] = useState('');
  const value = fieldValue(product, target.key);
  const decision = product.field_mappings?.[target.key];
  const unchanged = baseline && String(value) === String(fieldValue(baseline, target.key));
  const candidates = importedFieldCandidates(sources).filter(field => field.kind === target.kind);
  const source = decision?.source;
  const current = source && candidates.find(field => field.source.channel === source.channel && field.source.storeName === source.shop && field.source.listingId === source.listingId && field.key === source.fieldKey);
  const selected = candidates.find(field => fieldCandidateId(field) === picked);
  const converted = selected ? convertField(selected, target, product.price_currency) : undefined;
  const mappedOption = target.options?.find(option => option.value === mappedValue);
  const sourceError = current && source && (String(current.value) !== String(source.rawValue) || current.unit !== source.unit || current.currency !== source.currency);
  const error = target.required && !String(value).trim() ? `Choose a source or enter ${target.label.toLowerCase()}.`
    : target.required && target.kind !== 'text' && !(Number(value) > 0) ? `Enter ${target.label.toLowerCase()} greater than zero.`
    : target.key === 'pack_quantity' && value !== '' && (!Number.isInteger(Number(value)) || Number(value) < 1) ? 'Enter a positive whole number.'
    : target.options && value !== '' && (target.multiple ? String(value).split(',') : [String(value)]).some(part => !target.options!.some(option => option.value === part.trim())) ? 'Choose an available Master value.' : '';
  const sourceLabel = unchanged ? 'Keep current Master value' : source ? `${source.shop} · ${source.channel}` : value === '' || value === 0 ? 'No source selected' : 'Entered in this review';
  const manual = (next: string | number) => onChange(writeMappedField(product, target, next, { ...decision, mode: 'manual', value: next }));
  const keepMaster = () => {
    if (!baseline) return;
    const previous = fieldValue(baseline, target.key);
    const next = writeMappedField(product, target, previous, { ...baseline.field_mappings?.[target.key], mode: 'master', value: previous });
    // Older Masters can have a brand/category name without a catalog ID.
    if (target.key === 'brandId') next.brand = baseline.brand;
    if (target.key === 'categoryId') next.category = baseline.category;
    onChange(next);
  };
  const apply = () => {
    if (!selected || !converted || (converted.error && !mappedOption)) return;
    const next = converted.error ? mappedOption!.value : converted.value;
    const transform = converted.error ? `${selected.value} → ${mappedOption!.label}` : converted.transform;
    onChange(writeMappedField(product, target, next, mappingDecision(selected, next, 'source', transform)));
    setOpen(false);
  };
  const restore = () => {
    if (!current) return;
    if (!sourceError && decision?.sourceResult !== undefined && target.options && (target.multiple ? String(decision.sourceResult).split(',') : [String(decision.sourceResult)]).every(part => target.options!.some(option => option.value === part.trim()))) {
      onChange(writeMappedField(product, target, decision.sourceResult, { ...decision, mode: 'source', value: decision.sourceResult }));
      return;
    }
    const result = convertField(current, target, product.price_currency);
    if (result.error) { setPicked(fieldCandidateId(current)); setMappedValue(''); setOpen(true); return; }
    onChange(writeMappedField(product, target, result.value, mappingDecision(current, result.value, 'source', result.transform)));
  };
  const display = (v: string | number) => target.options?.find(option => option.value === String(v))?.label || (target.key === 'brandId' && !v ? baseline?.brand : '') || (v === '' ? '—' : String(v));
  return <div role="group" aria-label={`Mapping for ${target.label}`} className="border-b py-2 last:border-0">
    <div className="grid min-w-0 gap-2 md:grid-cols-[minmax(120px,.7fr)_minmax(180px,1fr)_minmax(220px,1.4fr)] md:gap-4">
      <div><Label htmlFor={id} className="text-sm leading-6">{target.label}{target.required ? ' *' : ''}</Label>{baseline && !unchanged && <p className="mt-1 break-words text-xs text-muted-foreground">Current: {display(fieldValue(baseline, target.key))}</p>}</div>
      <div className="min-w-0 space-y-1 text-xs leading-5">
        <button type="button" className="flex min-h-11 w-full items-start gap-2 rounded-md border border-transparent bg-muted/30 px-2 py-1.5 text-left hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-expanded={open} aria-controls={`${id}-source`} aria-label={`Change source for ${target.label}`} onClick={() => { setPicked(current ? fieldCandidateId(current) : ''); setMappedValue(''); setQuery(''); setOpen(value => !value); }}>
          <span className="min-w-0 flex-1"><span className="flex flex-wrap justify-between gap-x-2"><span className="font-medium">{source && !unchanged ? source.fieldLabel : sourceLabel}</span><span className="text-primary">Change</span></span>{source && !unchanged && <><span className={sources.length > 1 ? 'block truncate text-muted-foreground' : 'sr-only'} title={sourceLabel}>{sourceLabel}</span><span className="line-clamp-1 break-all" title={`${source.rawValue}${source.unit ? ` ${source.unit}` : ''}${source.currency ? ` ${source.currency}` : ''}`}>{source.rawValue}{source.unit && ` ${source.unit}`}{source.currency && ` ${source.currency}`}</span></>}</span>
          <ArrowRight className="mt-1 size-3.5 shrink-0 text-muted-foreground" />
        </button>
        {decision?.transform && !unchanged && <p className="break-words text-muted-foreground">{decision.transform}</p>}
      </div>
      <div className="min-w-0 space-y-1.5">
        {target.multiple && <p className="text-xs text-muted-foreground">Use comma-separated values: {target.options?.map(option => option.label).join(', ')}</p>}
        {children ? children(value, manual, id) : multiline ? <textarea id={id} rows={3} value={value} aria-describedby={`${id}-feedback`} aria-invalid={Boolean(error)} onChange={event => manual(event.target.value)} className="w-full rounded-md border bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /> : target.options && !target.multiple ? <select id={id} value={value} aria-describedby={`${id}-feedback`} aria-invalid={Boolean(error)} onChange={event => manual(event.target.value)} className="h-11 w-full rounded-md border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><option value="">{target.key === 'brandId' && product.brand && !product.brandId ? `${product.brand} (current)` : `Select ${target.label.toLowerCase()}`}</option>{target.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : <Input id={id} className="h-11" value={value} type={target.kind === 'text' ? 'text' : 'number'} min={target.kind === 'text' ? undefined : 0} step={target.key === 'pack_quantity' ? 1 : 'any'} aria-describedby={`${id}-feedback`} aria-invalid={Boolean(error)} onChange={event => manual(target.kind === 'text' || event.target.value === '' ? event.target.value : Number(event.target.value))} />}
        <div id={`${id}-feedback`} className="text-xs leading-5 empty:hidden" aria-live="polite">{error ? <p className="text-amber-700 dark:text-amber-300">{error}</p> : decision?.mode === 'manual' && !unchanged ? <p className="text-muted-foreground">Edited manually · original source unchanged</p> : null}{sourceError && <p className="text-amber-700 dark:text-amber-300">Source changed since this choice. Review the source again.</p>}</div>
        <div className="flex flex-wrap gap-1">{decision?.mode === 'manual' && current && <Button variant="ghost" className="-ml-2 h-11 px-2 text-xs" onClick={restore}><RotateCcw className="size-3.5" />Restore source value</Button>}{baseline && !unchanged && <Button variant="ghost" className="h-11 px-2 text-xs" onClick={keepMaster}>Keep current Master value</Button>}</div>
      </div>
    </div>
    {open && <section id={`${id}-source`} aria-label={`Choose source for ${target.label}`} className="mt-3 space-y-3 rounded-lg border bg-muted/20 p-4">
      <div className="flex items-start justify-between gap-3"><div><h5 className="text-sm font-semibold">Choose source for {target.label}</h5><p className="mt-1 text-xs text-muted-foreground">Only imported fields are shown. This changes the proposal, not the shop listing or sync rules.</p></div><Button variant="ghost" className="size-11 shrink-0 p-0" aria-label="Cancel source change" onClick={() => setOpen(false)}><X className="size-4" /></Button></div>
      <div className="relative"><Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" /><Input aria-label="Search source fields" className="h-11 pl-9" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search field, value or shop…" /></div>
      <fieldset className="max-h-60 space-y-1 overflow-y-auto"><legend className="sr-only">Imported source fields</legend>{candidates.filter(field => `${field.source.storeName} ${field.label} ${field.value}`.toLowerCase().includes(query.toLowerCase())).map(field => <label key={fieldCandidateId(field)} className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-md border p-3 ${picked === fieldCandidateId(field) ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted/40'}`}><input className="mt-1 accent-primary" type="radio" name={`${id}-source-option`} value={fieldCandidateId(field)} checked={picked === fieldCandidateId(field)} onChange={() => { setPicked(fieldCandidateId(field)); setMappedValue(''); }} /><span className="min-w-0 text-xs leading-5"><span className="block font-medium">{field.source.storeName} · {field.label}</span><span className="block break-words text-muted-foreground">{field.source.channel} · {field.source.channelSku} · {field.normalized ? 'Imported field' : 'Provider field'}: {field.key}</span><span className="block break-words">{field.value}{field.unit && ` ${field.unit}`}{field.currency && ` ${field.currency}`}</span></span></label>)}{!candidates.length && <p className="py-3 text-sm text-muted-foreground">No compatible source data. Close this panel and enter a value manually.</p>}</fieldset>
      {converted?.error && <p role="status" className="text-xs text-amber-700 dark:text-amber-300">{converted.error}</p>}
      {converted?.error && target.options && <div className="space-y-2"><Label htmlFor={`${id}-mapped`}>Use this Master value</Label><select id={`${id}-mapped`} className="h-11 w-full rounded-md border bg-background px-3 text-sm" value={mappedValue} onChange={event => setMappedValue(event.target.value)}><option value="">Select an allowed value</option>{target.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>}
      {selected && converted && (!converted.error || mappedOption) && <p className="break-words text-sm">Value to save: <strong>{converted.error ? mappedOption?.label : display(converted.value)}</strong>{converted.transform && <span className="ml-2 text-xs text-muted-foreground">{converted.transform}</span>}</p>}
      <div className="flex flex-wrap justify-end gap-2"><Button variant="ghost" className="h-11" onClick={() => { manual(value); setOpen(false); document.getElementById(id)?.focus(); }}>Enter manually</Button><Button variant="outline" className="h-11" onClick={() => setOpen(false)}>Cancel</Button><Button className="h-11" disabled={!selected || !converted || Boolean(converted.error && !mappedOption)} onClick={apply}>Use this source</Button></div>
    </section>}
  </div>;
}
