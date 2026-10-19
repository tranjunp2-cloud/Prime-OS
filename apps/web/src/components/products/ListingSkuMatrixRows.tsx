import { useId, useState, type ReactNode } from 'react';
import { ArrowLeftRight, ArrowRight, Check, Pencil, Plus, TriangleAlert, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import type { CatalogImportItem } from '@/lib/catalog-import-store';
import type { Product } from '@/lib/product-store';
import type { VariantMappings } from '@/lib/listing-master-completion';
import { assignMatrixSku, proposeMatrixSku, sourceMatrixState } from '@/lib/listing-sku-matrix';
import { ListingReviewHelp } from './ListingReviewHelp';
import { proposedSkuPrice } from '@/lib/listing-auto-proposal';

export type SkuMatrixControls = {
  mappings: VariantMappings; verifiedSingles: string[];
  onMappingsChange: (value: VariantMappings) => void;
  onVerify: (id: string, checked: boolean) => void;
  onReload: (id: string) => void;
};
type Props = SkuMatrixControls & {
  id?: string;
  product: Product; baseline: Product; sources: CatalogImportItem[]; visible: CatalogImportItem[];
  disabled: boolean; editorWidth?: number; priceEditor?: ReactNode;
  onChange: (product: Product) => void; onEditPrices: () => void; onSetup: () => void;
  onUsePrice: (source: CatalogImportItem) => void; onUndoPrices: () => void;
  onEditingChange: (editing: boolean) => void;
  creating?: boolean;
};
const headClass = 'border-b border-r bg-background p-3 align-top text-xs font-medium leading-5 md:sticky md:left-0 md:z-10';
const cellClass = 'border-b border-r p-3 align-top';
const masterClass = 'border-b bg-muted p-3 align-top md:sticky md:right-0 md:z-10';
const warningClass = 'text-xs leading-5 text-amber-700 dark:text-amber-300';

/** Same shop columns as the field comparison. One row means one Master SKU, not a source's array index. */
export function ListingSkuMatrixRows({ id, product, baseline, sources, visible, mappings, verifiedSingles, disabled, editorWidth, priceEditor, onChange, onMappingsChange, onVerify, onReload, onEditPrices, onSetup, onEditingChange, onUsePrice, onUndoPrices, creating = false }: Props) {
  const prefix = useId();
  const [editingCell, setEditingCell] = useState('');
  const [adding, setAdding] = useState<{ sourceId: string; shopSku: string; code: string; label: string; price: string; editingId?: string } | null>(null);
  // Removing a proposed Master SKU is destructive to the review, so confirm before dropping it.
  const [removing, setRemoving] = useState<{ id: string; code: string } | null>(null);
  const [error, setError] = useState('');
  const variant = product.has_variants || product.product_type === 'variant';
  const states = Object.fromEntries(sources.map(source => [source.id, sourceMatrixState(source, product, mappings[source.id], verifiedSingles)]));
  const masterSkus = variant ? product.skus.filter(sku => sku.status === 'active').sort((a, b) => Number(!baseline.skus.some(sku => sku.id === b.id)) - Number(!baseline.skus.some(sku => sku.id === a.id))) : [{ id: '__single', sku_code: product.sku_code, variation_name: 'Single product', price: product.retail_price }];
  // Spell out the row count: existing Master SKUs vs. rows this review proposes to add, so a group union (e.g. 7) reads as "4 existing + 3 proposed".
  const proposedMasterSkus = variant ? masterSkus.filter(sku => creating || !baseline.skus.some(old => old.id === sku.id)).length : 0;
  const existingMasterSkus = masterSkus.length - proposedMasterSkus;
  const total = sources.reduce((sum, source) => sum + (source.variants || states[source.id].items.length), 0);
  const matched = sources.reduce((sum, source) => sum + states[source.id].matched, 0);
  const pricesChanged = product.price_currency !== baseline.price_currency || product.retail_price !== baseline.retail_price
    || product.skus.some(sku => { const old = baseline.skus.find(old => old.id === sku.id); return old && old.price !== sku.price; })
    || JSON.stringify(product.field_mappings?.retail_price) !== JSON.stringify(baseline.field_mappings?.retail_price);
  const locked = disabled || Boolean(adding);
  const price = (amount: number | undefined, currency: string) => amount != null && Number.isFinite(amount) ? `${amount.toLocaleString()} ${currency}` : 'Price missing';
  const assign = (source: CatalogImportItem, masterId: string, code: string) => {
    onMappingsChange({ ...mappings, [source.id]: assignMatrixSku(states[source.id].rows, masterId, code) });
    setEditingCell('');
  };
  const startAdding = (source: CatalogImportItem, code: string) => {
    const item = states[source.id].items.find(item => item.sku === code)!;
    setAdding({ sourceId: source.id, shopSku: code, code, label: item.label,
      price: item.price?.currency.toUpperCase() === product.price_currency.toUpperCase() ? String(item.price.amount) : '' });
    setEditingCell(''); setError(''); onEditingChange(true);
  };
  const cancelAdding = () => { setAdding(null); setError(''); onEditingChange(false); };
  const editProposal = (id: string) => {
    const sku = product.skus.find(sku => sku.id === id)!;
    const source = sources.find(source => states[source.id].valid.some(row => row.master_sku_id === id));
    setAdding({ sourceId: source?.id ?? '', shopSku: source ? states[source.id].valid.find(row => row.master_sku_id === id)!.shop_sku : '',
      code: sku.sku_code, label: sku.variation_name, price: sku.price == null ? '' : String(sku.price), editingId: id });
    setEditingCell(''); setError(''); onEditingChange(true);
  };
  const removeProposal = (id: string) => {
    onMappingsChange(Object.fromEntries(sources.map(source => [source.id, states[source.id].rows.map(row => row.master_sku_id === id ? { ...row, master_sku_id: '' } : row)])));
    onChange({ ...product, skus: product.skus.filter(sku => sku.id !== id) });
  };
  const addSku = () => {
    if (!adding) return;
    try {
      const id = adding.editingId ?? `review-${crypto.randomUUID()}`;
      const base = adding.editingId ? { ...product, skus: product.skus.filter(sku => sku.id !== id) } : product;
      const next = proposeMatrixSku(base, { id, code: adding.code, label: adding.label, price: adding.price === '' ? undefined : Number(adding.price) });
      if (adding.editingId) next.skus = product.skus.map(sku => sku.id === id ? next.skus.at(-1)! : sku);
      // Freeze the other proposals, including cleared selections, before adding a new target.
      const nextMappings = Object.fromEntries(sources.map(source => [source.id, states[source.id].rows]));
      if (!adding.editingId) nextMappings[adding.sourceId] = assignMatrixSku(nextMappings[adding.sourceId], id, adding.shopSku);
      onChange(next); onMappingsChange(nextMappings); cancelAdding();
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Could not add this SKU.'); }
  };
  return <tbody id={id} tabIndex={-1} aria-label="SKU & variants" className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:-outline-offset-2">
    <tr><th colSpan={visible.length + 2} className="border-b bg-muted/40 p-0 text-left font-normal"><div className="sticky left-0 max-w-full space-y-2 p-3" style={{ width: editorWidth }}>
      <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex flex-wrap items-center gap-2"><h4 className="text-sm font-semibold">SKU & variants</h4><span className="text-xs text-muted-foreground">{matched}/{total} shop SKUs paired · {masterSkus.length} Master SKU{masterSkus.length === 1 ? '' : 's'}{proposedMasterSkus > 0 ? ` · ${existingMasterSkus} existing + ${proposedMasterSkus} proposed` : ''}</span><ListingReviewHelp label="SKU matching across shops">One row represents one Master SKU. Different shops may match the same row. Each SKU within a listing needs its own row. Moving a SKU leaves the replaced one in Needs matching. Pairs are proposals until you confirm; pending pairs cannot sync price or stock. Master SKU codes and prices are required for activation.</ListingReviewHelp></div><div className="flex flex-wrap gap-2">{pricesChanged && <Button variant="ghost" className="h-11 text-xs" disabled={locked} aria-label={`Undo Master ${variant ? 'Variant prices' : 'Price'} change`} onClick={onUndoPrices}>Undo price changes</Button>}<Button variant="ghost" className="h-11 text-xs" disabled={locked} onClick={onSetup}>Manage Master variants</Button></div></div>
      <p className="text-xs text-muted-foreground">{creating ? 'Shop SKUs and proposed Master SKUs are filled for review. Edit only what needs to change.' : 'SKU pairs are filled for review. New rows are proposals to add to this Master — edit or remove only when needed.'}</p>
    </div></th></tr>
    {masterSkus.map((sku, index) => {
      const isNew = variant && (creating || !baseline.skus.some(old => old.id === sku.id));
      const origin = sources.find(source => states[source.id].valid.some(row => row.master_sku_id === sku.id));
      const originSku = origin && states[origin.id].valid.find(row => row.master_sku_id === sku.id)?.shop_sku;
      const priceHint = origin && originSku ? proposedSkuPrice(product, origin, originSku) : undefined;
      return <tr key={sku.id}>
      <th scope="row" className={headClass}><span className={`block ${isNew ? 'text-primary' : 'text-muted-foreground'}`}>{isNew ? 'New variant' : variant ? `Variant ${index + 1}` : 'Single SKU'}</span><span className="mt-1 block break-words">{sku.variation_name || sku.sku_code}</span></th>
      {visible.map(source => {
        const state = states[source.id];
        const selected = variant ? state.valid.find(row => row.master_sku_id === sku.id)?.shop_sku : state.singleMatch ? state.items[0]?.sku : undefined;
        const item = state.items.find(item => item.sku === selected);
        const suggestion = state.suggestions.find(row => row.shop_sku === selected);
        const chosen = mappings[source.id]?.find(row => row.shop_sku === selected);
        const automatic = !chosen || chosen.master_sku_id === suggestion?.master_sku_id
          || sku.id === `proposal-${source.id}-${state.items.findIndex(item => item.sku === selected)}`;
        const key = `${source.id}:${sku.id}`;
        const noOffer = variant && !state.needsReview && !selected;
        return <td key={source.id} className={cellClass}>
          {item ? <><p className="break-all font-mono text-xs">{item.sku}</p><p className="mt-1 break-words text-xs text-muted-foreground">{item.label}</p>{(item.price || !variant) && <p className="mt-1 text-xs">{item.price ? price(item.price.amount, item.price.currency) : price(source.price, source.currency)}</p>}<div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><Check className="size-3" /><span>{automatic ? 'Suggested pair' : 'Changed by you'}</span><ListingReviewHelp label={`SKU suggestion for ${item.sku}`}>{automatic ? `${suggestion?.reason || 'Single-SKU source'}: the proposed pair is filled from imported listing data. Review the product and variant before confirming. Nothing is saved or synced yet.` : 'Your selected pair is kept. It will not be replaced by an automatic suggestion.'}</ListingReviewHelp></div>{!variant && <Button variant="ghost" size="icon" className="mt-1 size-8 text-primary [@media(pointer:coarse)]:size-11" disabled={locked} title="Use price" aria-label={`Use Price from ${source.storeName} · ${source.channelSku}`} onClick={() => onUsePrice(source)}><ArrowRight className="size-3.5" /></Button>}</>
            : <p className={noOffer || state.verifiedWithoutSku ? 'text-xs text-muted-foreground' : warningClass}>{state.verifiedWithoutSku ? 'Structure verified · Shop SKU not recorded' : state.error ? 'SKU data unavailable' : state.unknown ? 'Verify source structure' : noOffer ? 'Not sold in this listing' : 'No SKU paired yet'}</p>}
          {item && source.variants === 1 && !item.price && variant && <p className="mt-1 text-xs">{price(source.price, source.currency)}</p>}
          {variant && !state.error && (editingCell === key ? <div className="mt-2 space-y-1"><select autoFocus aria-label={`Shop SKU for ${sku.sku_code} · ${source.storeName} · ${source.channelSku}`} className="h-11 w-full rounded-md border bg-background px-2 text-xs" value={selected || ''} disabled={locked} onChange={event => assign(source, sku.id, event.target.value)}><option value="">No shop SKU</option>{state.items.map(option => <option key={option.sku} value={option.sku}>{option.sku} · {option.label}{state.valid.some(row => row.shop_sku === option.sku && row.master_sku_id !== sku.id) ? ' · Move from another row' : ''}</option>)}</select><Button variant="ghost" className="h-11 px-0 text-xs" onClick={() => setEditingCell('')}>Cancel</Button></div>
            : <Button variant="ghost" size="icon" className="mt-1 size-8 text-primary [@media(pointer:coarse)]:size-11" disabled={locked} title={selected ? 'Change pair' : 'Choose shop SKU'} aria-label={`Change SKU pair for ${sku.sku_code} · ${source.storeName} · ${source.channelSku}`} onClick={() => setEditingCell(key)}><ArrowLeftRight className="size-3.5" /></Button>)}
        </td>;
      })}
      <td className={masterClass}>{isNew && <p className="mb-2 flex items-center gap-1 text-xs font-medium text-primary"><Plus className="size-3" />Proposed new SKU<ListingReviewHelp label={`New SKU proposal ${sku.sku_code}`}>No existing SKU was selected for this source. This additional Master SKU is proposed from the listing, not a verified product match. Confirm the product identity before saving. Existing SKUs and warehouse stock are unchanged.</ListingReviewHelp></p>}<p className="break-all font-mono text-xs font-medium">{sku.sku_code}</p><p className="mt-1 break-words text-xs text-muted-foreground">{sku.variation_name}</p><div className="mt-2 flex items-center gap-1"><p className={`text-xs ${!(sku.price! > 0) ? 'text-amber-700 dark:text-amber-300' : ''}`}>{price(sku.price, product.price_currency)}</p>{isNew && priceHint && <ListingReviewHelp label={`Price suggestion for ${sku.sku_code}`}>{sku.price === priceHint.amount ? priceHint.explanation : 'Price edited in this review.'} No shop price is changed.</ListingReviewHelp>}</div>{isNew && priceHint?.explanation.startsWith('Suggested Master base price') && sku.price === priceHint.amount && <p className="mt-1 text-xs text-muted-foreground">Suggested Master base price</p>}<div className="mt-1 flex flex-wrap gap-1"><Button variant="ghost" size="icon" className="size-8 [@media(pointer:coarse)]:size-11" disabled={locked} title={isNew ? 'Edit proposal' : 'Edit price'} aria-label={isNew ? `Edit SKU proposal ${sku.sku_code}` : `Edit Master price for ${sku.sku_code}`} onClick={() => isNew ? editProposal(sku.id) : onEditPrices()}><Pencil className="size-3.5" /></Button>{isNew && <Button variant="ghost" size="icon" className="size-8 text-muted-foreground [@media(pointer:coarse)]:size-11" disabled={locked} title="Remove" aria-label={`Remove SKU proposal ${sku.sku_code}`} onClick={() => setRemoving({ id: sku.id, code: sku.sku_code })}><X className="size-3.5" /></Button>}</div></td>
    </tr>; })}
    {priceEditor && <tr><td colSpan={visible.length + 2} className="border-b p-0"><div className="sticky left-0 max-w-full" style={{ width: editorWidth }}>{priceEditor}</div></td></tr>}
    {sources.some(source => states[source.id].needsReview || source.variants === 0) && <tr>
      <th scope="row" className={headClass}><span className="flex items-center gap-1 text-amber-700 dark:text-amber-300"><TriangleAlert className="size-3.5 shrink-0" />Needs matching</span><span className="mt-1 block font-normal text-muted-foreground">Review exceptions only</span></th>
      {visible.map(source => {
        const state = states[source.id];
        return <td key={source.id} className={`${cellClass} ${state.needsReview ? 'bg-amber-500/[0.035]' : ''}`}>
          {state.error ? <><p className={warningClass}>{state.error}</p><p className="mt-1 text-xs text-muted-foreground">{state.items.length} of {source.variants || '?'} SKU records loaded</p><Button variant="ghost" className="h-11 px-0 text-xs text-primary" disabled={locked} onClick={() => onReload(source.id)}>Reload listing data</Button></>
            : <div className="divide-y">{state.pending.map(item => <div key={item.sku} className="py-2 first:pt-0"><p className="break-all font-mono text-xs">{item.sku}</p><p className="mt-1 break-words text-xs text-muted-foreground">{item.label}</p>{item.price && <p className="mt-1 text-xs">{price(item.price.amount, item.price.currency)}</p>}{variant && <select aria-label={`Match unpaired SKU ${item.sku} · ${source.storeName} · ${source.channelSku}`} className="mt-2 h-11 w-full rounded-md border bg-background px-2 text-xs" disabled={locked} value="" onChange={event => event.target.value && assign(source, event.target.value, item.sku)}><option value="">Choose Master SKU</option>{masterSkus.map(master => <option key={master.id} value={master.id}>{master.sku_code} · {master.variation_name}{state.rows.some(row => row.master_sku_id === master.id) ? ' · Replace current pair' : ''}</option>)}</select>}<Button variant="ghost" className="mt-1 h-11 px-0 text-xs text-primary" disabled={locked} aria-label={`Add Master SKU from ${item.sku} · ${source.storeName} · ${source.channelSku}`} onClick={() => startAdding(source, item.sku)}><Plus className="size-3.5" />Add Master SKU</Button></div>)}</div>}
          {source.variants === 0 && <label className="mt-2 flex min-h-11 cursor-pointer items-start gap-2 text-xs leading-5"><Checkbox className="mt-1 shrink-0" checked={verifiedSingles.includes(source.id)} disabled={locked} onCheckedChange={checked => onVerify(source.id, checked === true)} /><span>I checked the source SKU structure for {source.storeName} · {source.channelSku}.</span></label>}
          {!state.needsReview && <p className="text-xs text-muted-foreground">{state.verifiedWithoutSku ? 'Single-product structure verified; no SKU pair created' : 'All shop SKUs paired'}</p>}
        </td>;
      })}
      <td className={masterClass}><p className="text-xs leading-5 text-muted-foreground">Choose an existing SKU, or add a missing variant to this Master.</p><p className="mt-2 text-xs leading-5">Unpaired SKUs cannot sync price or stock.</p></td>
    </tr>}
    {adding && <tr><td colSpan={visible.length + 2} className="border-b p-0"><section aria-label={adding.editingId ? 'Edit SKU proposal' : 'Add a Master SKU'} className="sticky left-0 max-w-full space-y-3 p-4" style={{ width: editorWidth }}>
      <div><h4 className="text-sm font-semibold">{adding.editingId ? 'Edit SKU proposal' : 'Add a Master SKU'}</h4><p className="mt-1 text-xs text-muted-foreground">From {sources.find(source => source.id === adding.sourceId)?.storeName} · {adding.shopSku} · Proposal only</p></div>
      {!variant && <p className={warningClass}>This changes the Master to a product with variants. Existing stock is preserved, not split. Other linked listings may need SKU review.</p>}
      <div className="grid gap-3 sm:grid-cols-3"><div className="space-y-1"><Label htmlFor={`${prefix}-code`}>Master SKU code</Label><Input autoFocus id={`${prefix}-code`} className="h-11" value={adding.code} onChange={event => setAdding({ ...adding, code: event.target.value })} /></div><div className="space-y-1"><Label htmlFor={`${prefix}-label`}>Variant name</Label><Input id={`${prefix}-label`} className="h-11" value={adding.label} onChange={event => setAdding({ ...adding, label: event.target.value })} /></div><div className="space-y-1"><Label htmlFor={`${prefix}-price`}>Price ({product.price_currency})</Label><Input id={`${prefix}-price`} className="h-11" type="number" min="0" step="any" value={adding.price} onChange={event => setAdding({ ...adding, price: event.target.value })} /></div></div>
      <p className="text-xs text-muted-foreground">Review the price in the Master currency. A suggested base price is not a currency conversion. No stock is copied.</p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2"><Button variant="ghost" className="h-11" onClick={cancelAdding}>Cancel SKU</Button><Button className="h-11" onClick={addSku}>{adding.editingId ? 'Apply proposal changes' : 'Add SKU & pair'}</Button></div>
    </section></td></tr>}
    <AlertDialog open={Boolean(removing)} onOpenChange={open => { if (!open) setRemoving(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remove this proposed SKU?</AlertDialogTitle><AlertDialogDescription>{removing?.code} is a review proposal, not a saved Master SKU. Removing it drops the proposed variant and returns its shop SKU to Needs matching. Existing Master SKUs and warehouse stock are unchanged.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep SKU</AlertDialogCancel><AlertDialogAction onClick={() => { if (removing) removeProposal(removing.id); setRemoving(null); }}>Remove SKU</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </tbody>;
}
