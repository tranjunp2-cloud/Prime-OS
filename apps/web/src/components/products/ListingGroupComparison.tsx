import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, Columns3, LockKeyhole, Pencil, RotateCcw, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChannelLogo } from '@/components/channels/ChannelLogo';
import type { CatalogImportItem } from '@/lib/catalog-import-store';
import type { Product } from '@/lib/product-store';
import { importedFieldCandidates, MASTER_MAPPING_TARGETS, type FieldCandidate } from '@/lib/listing-field-mapping';
import { richTextPlainText } from '@/lib/product-master-readiness';
import { ListingReviewHelp } from './ListingReviewHelp';
import { ListingSkuMatrixRows, type SkuMatrixControls } from './ListingSkuMatrixRows';
import { sourceMatrixState } from '@/lib/listing-sku-matrix';

type Row = { key: string; label: string; source: string; required?: boolean; evidence?: string };
type Props = {
  baseline: Product; product: Product; sources: CatalogImportItem[]; rows: Row[]; prefix: string;
  format: (product: Product, key: string) => string;
  text: (value: string, description?: boolean) => ReactNode;
  editingKey?: string;
  renderEditor: (row: Row) => ReactNode;
  onEdit: (key: string, source?: CatalogImportItem, field?: FieldCandidate) => void;
  onUse: (key: string, field: FieldCandidate) => void;
  onReset: (key: string) => void;
  onSetupSkus: () => void;
  skuMatrix: SkuMatrixControls; skuEditing: boolean; onSkuEditingChange: (editing: boolean) => void;
  onChange: (product: Product) => void;
};

/** Columns are presentation only: hiding a source never acknowledges or excludes it from saving. */
export function ListingGroupComparison({ baseline, product, sources, rows, prefix, format, text, editingKey, renderEditor, onEdit, onUse, onReset, onSetupSkus, skuMatrix, skuEditing, onSkuEditingChange, onChange }: Props) {
  const [visibleIds, setVisibleIds] = useState(() => sources.slice(0, 4).map(source => source.id));
  const [differencesOnly, setDifferencesOnly] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const [editorWidth, setEditorWidth] = useState<number>();
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
  const candidateFor = (row: Row, source: CatalogImportItem) => {
    const target = MASTER_MAPPING_TARGETS.find(target => target.key === row.key);
    const provenance = product.field_mappings?.[row.key]?.source;
    const key = provenance?.listingId === source.listingId && provenance.channel === source.channel && provenance.shop === source.storeName ? provenance.fieldKey : target?.sourceKey;
    return candidates.find(field => field.source.id === source.id && field.key === key);
  };
  const sourceValue = (row: Row, source: CatalogImportItem) => {
    if (row.key === 'sku_code') return source.channelSku;
    if (row.key === 'structure') return source.variants === 0 ? 'Structure not recorded' : `${source.variants} SKU${source.variants === 1 ? '' : 's'}`;
    const field = candidateFor(row, source);
    if (!field) return '';
    return `${row.key === 'description' ? richTextPlainText(String(field.value)) : field.value}${field.unit ? ` ${field.unit}` : ''}${field.currency ? ` ${field.currency}` : ''}`;
  };
  const normal = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
  const missingMaster = (row: Row) => Boolean(row.required && (!format(product, row.key) || row.key === 'retail_price' && hasVariants && (!product.skus.some(sku => sku.status === 'active') || product.skus.some(sku => sku.status === 'active' && !(sku.price! > 0)))));
  const different = (row: Row) => missingMaster(row) || sources.some(source => !sourceValue(row, source) || normal(sourceValue(row, source)) !== normal(format(product, row.key)));
  const fieldRows = rows.filter(row => !['sku_code', 'structure', 'retail_price'].includes(row.key));
  const displayedRows = fieldRows.filter(row => !differencesOnly || row.key === editingKey || different(row) || format(product, row.key) !== format(baseline, row.key));
  const priceRow = rows.find(row => row.key === 'retail_price')!;
  const renderFieldRow = (row: Row) => {
          const value = format(product, row.key), previous = format(baseline, row.key);
          const decision = product.field_mappings?.[row.key];
          const changed = value !== previous;
          const selectionChanged = JSON.stringify(decision) !== JSON.stringify(baseline.field_mappings?.[row.key]);
          const edited = changed || selectionChanged;
          const missing = missingMaster(row);
          const editable = row.key !== 'structure' && row.key !== 'sku_code';
          const useSource = editable && !(row.key === 'retail_price' && hasVariants);
          return <Fragment key={row.key}>
            <tr>
              <th scope="row" className="border-b border-r bg-background p-3 align-top text-xs font-medium leading-5 md:sticky md:left-0 md:z-10">{row.label}{row.required && <span className="mt-1 block font-normal text-muted-foreground">Required</span>}</th>
              {visible.map(source => {
                const field = candidateFor(row, source), sourceText = sourceValue(row, source);
                const selected = decision?.mode === 'source' && decision.source?.listingId === source.listingId && decision.source.channel === source.channel && decision.source.shop === source.storeName && String(decision.source.rawValue) === String(field?.value) && decision.source.unit === field?.unit && decision.source.currency === field?.currency;
                const mismatch = sourceText && !['sku_code', 'retail_price', 'categoryId', 'structure'].includes(row.key) && normal(sourceText) !== normal(value);
                return <td key={source.id} className={`border-b border-r p-3 align-top ${selected ? 'bg-primary/5' : ''}`}>
                  <div className="break-words text-sm leading-5">{text(sourceText, row.key === 'description')}</div>
                  {field && <p className="mt-1 text-xs text-muted-foreground">Source: {field.label}</p>}
                  {mismatch && <p className="mt-1 flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300"><TriangleAlert className="size-3 shrink-0" aria-hidden="true" />Different value</p>}
                  {row.key === 'retail_price' && <p className="mt-1 text-xs text-muted-foreground">{hasVariants ? 'Listing price · review individual SKU prices' : source.currency !== product.price_currency ? 'Different currency · no automatic conversion' : 'Shop price can differ'}</p>}
                  {selected && <p className="mt-2 flex items-center gap-1 text-xs font-medium text-primary"><Check className="size-3" />Selected source</p>}
                  {useSource && <div className="mt-1 flex flex-wrap gap-x-2"><Button variant="ghost" className="h-9 px-0 text-xs text-primary [@media(pointer:coarse)]:h-11" disabled={locked || !field || selected} aria-label={`Use ${row.label} from ${source.storeName} · ${source.channelSku}`} onClick={() => field && onUse(row.key, field)}>Use value</Button><Button variant="ghost" className="h-9 px-0 text-xs text-muted-foreground [@media(pointer:coarse)]:h-11" disabled={locked} aria-label={`Change source field for ${row.label} in ${source.storeName} · ${source.channelSku}`} onClick={() => onEdit(row.key, source, field)}>Change field</Button></div>}
                </td>;
              })}
              <td className="border-b bg-muted p-3 align-top md:sticky md:right-0 md:z-10">
                <div className="break-words leading-5">{text(value, row.key === 'description')}</div>
                {missing && <p className="mt-1 flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300"><TriangleAlert className="size-3.5" />Master data missing</p>}
                {changed && <div className="mt-2 break-words text-xs text-muted-foreground">Current: {text(previous, row.key === 'description')}</div>}
                <p className="mt-1 break-words text-xs text-muted-foreground">{edited ? decision?.mode === 'source' && decision.source ? `${decision.source.shop} · ${decision.source.fieldLabel} · Not saved` : 'Edited in this review · Not saved' : 'Keep current Master value'}</p>
                <div className="mt-1 flex flex-wrap gap-2"><Button id={`${prefix}-${row.key}-edit`} variant="ghost" className="h-11 px-0 text-xs" disabled={locked} aria-label={`Edit Master ${row.label}`} aria-expanded={editingKey === row.key} onClick={() => onEdit(row.key)}><Pencil className="size-3.5" />{edited ? 'Edit change' : 'Edit'}</Button>{edited && <Button variant="ghost" className="h-11 px-0 text-xs" disabled={locked} aria-label={`Undo Master ${row.label} change`} onClick={() => onReset(row.key)}><RotateCcw className="size-3.5" />Undo</Button>}</div>
              </td>
            </tr>
            {editingKey === row.key && <tr><td colSpan={visible.length + 2} className="border-b bg-background p-0"><div className="sticky left-0 max-w-full" style={{ width: editorWidth }}>{renderEditor(row)}</div></td></tr>}
          </Fragment>;

  };
  return <section aria-label="Comparison fields" className="min-w-0 overflow-hidden rounded-xl border bg-background">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
      <div><div className="flex items-center gap-1"><h3 className="text-sm font-semibold">Compare all listings</h3><ListingReviewHelp label="Comparison fields">Each shop column is a read-only source. Use a value or change its source field to propose one shared Master value. SKU rows match the same variant across shops. Shop codes, prices and categories can differ. Linking does not make shop values identical or turn on sync.</ListingReviewHelp></div><p className="mt-1 text-xs text-muted-foreground">Product details and SKU pairs in one table · Nothing saved yet</p></div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-xs"><Checkbox checked={differencesOnly} disabled={locked} onCheckedChange={value => setDifferencesOnly(value === true)} />Differences & missing data</label>
        {sources.length > 4 && <Popover><PopoverTrigger asChild><Button variant="outline" className="h-11 text-xs" disabled={locked}><Columns3 className="size-4" />Listings {visible.length}/{sources.length}</Button></PopoverTrigger><PopoverContent align="end" className="w-80 space-y-3"><p className="text-sm font-medium">Choose up to 4 columns</p><p className="text-xs text-muted-foreground">All {sources.length} listings remain in this group. Hidden columns are not automatically reviewed.</p><div className="max-h-72 overflow-auto">{sources.map(source => <label key={source.id} className="flex min-h-11 items-start gap-2 py-2 text-xs"><Checkbox className="mt-1" checked={visibleIds.includes(source.id)} disabled={visibleIds.includes(source.id) ? visible.length === 1 : visible.length >= 4} onCheckedChange={checked => setVisibleIds(ids => checked === true ? [...ids, source.id] : ids.filter(id => id !== source.id))} /><span className="min-w-0"><span className="block font-medium">{source.storeName} · {source.channel}</span><span className="block break-words text-muted-foreground">{source.title} · {source.channelSku}</span></span></label>)}</div></PopoverContent></Popover>}
      </div>
    </div>
    {visible.length < sources.length && <p className="border-b bg-muted/20 px-4 py-2 text-xs text-muted-foreground">Showing {visible.length} of {sources.length} listings · {sources.length - visible.length} hidden. Saving still checks the entire group.</p>}
    {hiddenIssues.length > 0 && <div role="status" aria-label="Hidden listings need SKU review" className="flex flex-wrap items-center gap-x-3 border-b bg-amber-500/5 px-4 py-2"><p className="text-xs text-amber-700 dark:text-amber-300">{hiddenIssues.length} hidden listing(s) need SKU review:</p>{hiddenIssues.map(source => <Button key={source.id} variant="ghost" className="h-11 px-0 text-xs" disabled={locked} aria-label={`Show SKU review for ${source.storeName} · ${source.channelSku}`} onClick={() => setVisibleIds(ids => [...ids.slice(0, 3), source.id])}>{source.storeName} · {source.channelSku} — Show</Button>)}</div>}
    <p className="border-b px-4 py-2 text-xs text-muted-foreground md:hidden">Scroll sideways to compare shops and the Master result.</p>
    <div ref={scroller} className="max-h-[68dvh] overflow-auto overscroll-contain" tabIndex={0} role="region" aria-label="Scroll to compare listing fields">
      <table aria-label="Product identity comparison" className="w-full table-fixed border-separate border-spacing-0 text-left text-sm" style={{ minWidth: 150 + visible.length * 220 + 270 }}>
        <colgroup><col style={{ width: 150 }} />{visible.map(source => <col key={source.id} />)}<col style={{ width: 270 }} /></colgroup>
        <thead className="sticky top-0 z-30"><tr>
          <th scope="col" className="border-b border-r bg-muted p-3 align-top text-xs font-medium md:sticky md:left-0 md:z-20">Master field</th>
          {visible.map(source => <th key={source.id} scope="col" className="border-b border-r bg-background p-3 align-top font-normal"><div className="flex items-center gap-2"><ChannelLogo channel={{ key: source.channel }} size="sm" /><div className="min-w-0"><p className="break-words text-xs font-semibold">{source.storeName}</p><p className="text-xs capitalize text-muted-foreground">{source.channel}</p></div></div><p className="mt-2 break-words text-xs leading-5">{source.title}</p><p className="mt-1 break-all font-mono text-xs text-muted-foreground">{source.channelSku || 'SKU not provided'}</p><p className={`mt-2 text-xs ${skuStates[source.id].needsReview ? 'text-amber-700 dark:text-amber-300' : 'text-muted-foreground'}`}>{skuStates[source.id].verifiedWithoutSku ? 'Single product verified · SKU not recorded' : `${skuStates[source.id].matched}/${source.variants || skuStates[source.id].items.length} SKUs paired${skuStates[source.id].unknown ? ' · Verify structure' : ''}`}</p></th>)}
          <th scope="col" className="border-b bg-muted p-3 align-top md:sticky md:right-0 md:z-20"><p className="text-xs font-semibold">Master · value to save</p><p className="mt-1 text-xs font-normal text-muted-foreground">One shared result · Not saved</p><div className="mt-2 flex items-start gap-1 text-xs font-normal text-muted-foreground"><LockKeyhole className="mt-1 size-3 shrink-0" /><span className="min-w-0 break-all font-mono">{product.sku_code}</span><ListingReviewHelp label="Master SKU identity">This is the internal product code, not a variant match. It stays unchanged. Match sellable SKUs in the SKU & variants rows.</ListingReviewHelp></div></th>
        </tr></thead>
        <tbody>{displayedRows.filter(row => row.required).map(renderFieldRow)}</tbody>
        <ListingSkuMatrixRows {...skuMatrix} product={product} baseline={baseline} sources={sources} visible={visible} disabled={Boolean(editingKey)} editorWidth={editorWidth}
          onUsePrice={source => { const field = candidateFor(priceRow, source); if (field) onUse('retail_price', field); }} onUndoPrices={() => onReset('retail_price')}
          onChange={onChange} onSetup={onSetupSkus} onEditingChange={onSkuEditingChange} onEditPrices={() => onEdit('retail_price')} priceEditor={editingKey === 'retail_price' ? renderEditor(priceRow) : undefined} />
        <tbody>{displayedRows.filter(row => !row.required).map(renderFieldRow)}</tbody>
      </table>
      {!displayedRows.length && <p className="p-4 text-xs text-muted-foreground">No product field differences. SKU pairs remain visible for review.</p>}
    </div>
  </section>;
}
