import { useEffect, useId, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Link2, Package, RefreshCw, Search, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChannelLogo } from '@/components/channels/ChannelLogo';
import { getCatalogImportItems, type CatalogImportItem } from '@/lib/catalog-import-store';
import { getProducts, type Product } from '@/lib/product-store';
import { confirmListingIntake, listingOwner, snapshotListingMatch } from '@/lib/product-listing-intake';
import { listingMatchEvidence } from '@/lib/listing-match-evidence';
import { variantMappingError, type VariantMappings } from '@/lib/listing-master-completion';
import { ACTIVITY_CHANNEL_LABELS } from '@/lib/product-activity';
import { ListingSkuMappings } from './ListingSkuMappings';
import styles from './LinkExistingListingsDialog.module.css';

type Props = {
  master: Product;
  hasUnsavedMasterChanges?: boolean;
  onClose: () => void;
  restoreFocus: () => void;
  onLinked: (result: ReturnType<typeof confirmListingIntake>, previousVersion: number, listings: CatalogImportItem[]) => void;
};
type Review = { master: Product; listings: CatalogImportItem[] };

function readPool() {
  return {
    products: getProducts(),
    items: getCatalogImportItems({ requireConfirmation: true }).filter(item => item.status !== 'ignored' && item.resolution !== 'ignore'),
  };
}
function Photo({ src }: { src?: string }) {
  const [failed, setFailed] = useState<string>();
  return <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg border bg-muted/30">
    {src && failed !== src ? <img src={src} alt="" className="size-full object-contain" loading="lazy" onError={() => setFailed(src)} /> : <Package className="size-5 text-muted-foreground" />}
  </span>;
}
const number = (value: number) => Number.isFinite(value) && value >= 0 ? value.toLocaleString('en-US') : '—';
const price = (item: CatalogImportItem) => Number.isFinite(item.price) && item.price >= 0 && item.currency ? `${number(item.price)} ${item.currency}` : '—';
const shopKey = (item: CatalogImportItem) => JSON.stringify([item.channel, item.storeName]);
const eligible = (item: CatalogImportItem, products: Product[]) => !item.confirmed && !listingOwner(item, products);
function rank(item: CatalogImportItem, master: Product) {
  const weights: Record<string, number> = { sku: 30, gtin: 40, model: 15, mpn: 15, brand: 4, pack: 2 };
  return listingMatchEvidence(item, master).reduce((score, field) => score + (field.state === 'match' ? weights[field.key] ?? 0 : 0), item.suggestedProductId === master.id ? 8 : 0);
}

/** Select imported records, then confirm relationships to one fixed, saved Master. */
export function LinkExistingListingsDialog({ master, hasUnsavedMasterChanges, onClose, restoreFocus, onLinked }: Props) {
  const prefix = useId();
  const [pool, setPool] = useState(readPool);
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [channel, setChannel] = useState('all');
  const [shop, setShop] = useState('all');
  const [selectedOnly, setSelectedOnly] = useState(false);
  const [review, setReview] = useState<Review | null>(null);
  const [mappings, setMappings] = useState<VariantMappings>({});
  const [verifiedSingles, setVerifiedSingles] = useState<string[]>([]);
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const scrollArea = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (review) heading.current?.focus();
    else searchRef.current?.focus();
    if (scrollArea.current) scrollArea.current.scrollTop = 0;
  }, [review]);
  const target = review?.master ?? master;
  const available = pool.items.filter(item => eligible(item, pool.products));
  const selectionValid = selected.length > 0 && selected.every(id => available.some(item => item.id === id));
  const term = query.trim().toLocaleLowerCase();
  const visible = pool.items.filter(item => (
    selectedOnly ? selected.includes(item.id) : eligible(item, pool.products) || selected.includes(item.id) || Boolean(term)
  ) && (channel === 'all' || item.channel === channel) && (shop === 'all' || shopKey(item) === shop)
    && `${item.title} ${item.channelSku} ${item.listingId} ${item.storeName} ${ACTIVITY_CHANNEL_LABELS[item.channel]}`.toLocaleLowerCase().includes(term))
    .sort((a, b) => Number(eligible(b, pool.products)) - Number(eligible(a, pool.products)) || rank(b, target) - rank(a, target) || a.title.localeCompare(b.title));
  const channels = [...new Set(pool.items.map(item => item.channel))];
  const shops = [...new Map(pool.items.filter(item => channel === 'all' || item.channel === channel).map(item => [shopKey(item), item])).values()];
  const hiddenSelected = selected.filter(id => !visible.some(item => item.id === id)).length;
  const mappingError = review ? variantMappingError(review.listings, review.master, mappings, verifiedSingles) : '';
  const clearFilters = () => { setQuery(''); setChannel('all'); setShop('all'); setSelectedOnly(false); };
  const beginReview = () => {
    const fresh = readPool();
    setPool(fresh);
    const currentMaster = fresh.products.find(item => item.id === master.id);
    if (!currentMaster || currentMaster.status === 'archived') { setError('This Master is no longer available for linking. Close this dialog and refresh the product.'); return; }
    const listings = selected.map(id => fresh.items.find(item => item.id === id));
    if (!listings.length || listings.some(item => !item || !eligible(item, fresh.products))) {
      setError('Some selected listings are no longer available. Review your selection or clear it and select the remaining listings.'); return;
    }
    setReview(structuredClone({ master: currentMaster, listings: listings as CatalogImportItem[] }));
    setMappings({}); setVerifiedSingles([]); setAcknowledged(false); setError('');
  };
  const save = () => {
    if (!review || mappingError || !acknowledged || saveLock.current) return;
    saveLock.current = true; setSaving(true); setError('');
    try {
      const result = confirmListingIntake(review.listings.map(item => item.id), {
        productId: review.master.id,
        reviewed: review.listings.map(item => snapshotListingMatch(item, review.master)),
        variantMappings: mappings, verifiedSingleListingIds: verifiedSingles,
      });
      onLinked(result, review.master.record_version ?? 1, review.listings);
    } catch (reason) {
      saveLock.current = false; setSaving(false);
      setError(reason instanceof Error ? reason.message : 'Could not link listings. Try again.');
    }
  };
  const back = () => { setReview(null); setPool(readPool()); setError(''); };
  return <Dialog open onOpenChange={open => { if (!open && !saveLock.current) onClose(); }}>
    <DialogContent className="flex max-h-[90dvh] max-w-5xl flex-col gap-0 overflow-hidden p-0" onCloseAutoFocus={event => { event.preventDefault(); restoreFocus(); }} onInteractOutside={event => { if (selected.length) event.preventDefault(); }}>
      <DialogHeader className="shrink-0 border-b px-5 py-5 pr-12 text-left sm:px-6">
        <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground" aria-label={review ? 'Step 2 of 2: Review links' : 'Step 1 of 2: Select listings'}><span className={!review ? 'font-medium text-primary' : ''}>1. Select listings</span><ArrowRight className="size-3" /><span className={review ? 'font-medium text-primary' : ''}>2. Review links</span></div>
        <DialogTitle ref={heading} tabIndex={-1} className="outline-none">{review ? 'Review links' : 'Link existing listings'}</DialogTitle>
        <DialogDescription>{review ? 'Check that each listing represents this product and the same pack size.' : 'Choose imported shop listings that are not linked to a Product Master yet.'}</DialogDescription>
      </DialogHeader>
      <div ref={scrollArea} className="min-h-0 overflow-y-auto overscroll-contain">
        <div className="flex items-center gap-3 border-b bg-muted/20 px-5 py-4 sm:px-6" aria-label="Destination Product Master">
          <Photo src={target.images[0]} /><div className="min-w-0"><p className="text-xs text-muted-foreground">Link to this Master</p><p className="mt-0.5 break-words text-sm font-semibold">{target.name}</p><p className="mt-1 break-words text-xs text-muted-foreground">{target.sku_code}{target.brand ? ` · ${target.brand}` : ''}</p></div>
        </div>
        {hasUnsavedMasterChanges && <p className="border-b px-5 py-3 text-xs text-muted-foreground sm:px-6">Using saved Master data. Your unsaved product edits will stay in the editor.</p>}
        {!review ? <>
          <div className="grid gap-3 px-5 pt-4 sm:grid-cols-[minmax(0,1fr)_150px_190px] sm:px-6">
            <div className="space-y-2"><Label htmlFor={`${prefix}-search`}>Search listings</Label><div className="relative"><Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" /><Input ref={searchRef} id={`${prefix}-search`} placeholder="Name, SKU or listing ID" className="h-10 pl-9" value={query} onChange={event => setQuery(event.target.value)} /></div></div>
            <div className="space-y-2"><Label htmlFor={`${prefix}-channel`}>Channel</Label><select id={`${prefix}-channel`} className={styles.select} value={channel} onChange={event => { setChannel(event.target.value); setShop('all'); }}><option value="all">All channels</option>{channels.map(value => <option key={value} value={value}>{ACTIVITY_CHANNEL_LABELS[value]}</option>)}</select></div>
            <div className="space-y-2"><Label htmlFor={`${prefix}-shop`}>Shop</Label><select id={`${prefix}-shop`} className={styles.select} value={shop} onChange={event => setShop(event.target.value)}><option value="all">All shops</option>{shops.map(item => <option key={shopKey(item)} value={shopKey(item)}>{item.storeName} · {ACTIVITY_CHANNEL_LABELS[item.channel]}</option>)}</select></div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 sm:px-6"><p className="text-xs text-muted-foreground" role="status">{visible.length} {term || selectedOnly || channel !== 'all' || shop !== 'all' ? 'results' : 'unlinked listings'} · Best matches first</p><div className="flex items-center gap-1">{selected.length > 0 && <Button variant="ghost" size="sm" aria-pressed={selectedOnly} onClick={() => { clearFilters(); setSelectedOnly(!selectedOnly); }}>{selectedOnly ? 'Show all' : `Selected (${selected.length})`}</Button>}<Button variant="ghost" size="sm" aria-label="Refresh imported listings" onClick={() => { setPool(readPool()); setError(''); }}><RefreshCw className="size-3.5" />Refresh</Button></div></div>
          <div className="px-5 pb-4 sm:px-6"><table className={styles.table} aria-label="Imported shop listings">
            <thead><tr><th scope="col" className={styles.choice}><span className="sr-only">Select</span></th><th scope="col">Listing</th><th scope="col">Channel / Shop</th><th scope="col">Listing price</th><th scope="col">Shop stock</th></tr></thead>
            <tbody>{visible.map(item => {
              const owner = listingOwner(item, pool.products);
              const unavailable = !eligible(item, pool.products);
              const evidence = listingMatchEvidence(item, target);
              const differences = evidence.filter(row => row.state === 'different' && row.key !== 'sku');
              const skuMatch = evidence.some(row => row.key === 'sku' && row.state === 'match');
              const selectedRow = selected.includes(item.id);
              return <tr key={item.id} data-selected={selectedRow}>
                <td className={styles.choice}><Checkbox aria-label={`Select ${item.channelSku || item.listingId} from ${item.storeName}`} checked={selectedRow} disabled={unavailable && !selectedRow} onCheckedChange={checked => setSelected(current => checked && !unavailable ? [...new Set([...current, item.id])] : current.filter(id => id !== item.id))} /></td>
                <td className={styles.identity}><div className="flex items-start gap-3"><Photo src={item.image || item.images?.[0]} /><div className="min-w-0"><p className="break-words font-medium">{item.title}</p><p className="mt-1 break-all text-xs text-muted-foreground">{item.channelSku || 'SKU not recorded'} · {item.variants > 0 ? `${item.variants} SKU${item.variants === 1 ? '' : 's'}` : 'SKU structure not recorded'}</p>
                  {unavailable ? <p className="mt-1 text-xs text-muted-foreground">{owner ? owner.id === master.id ? 'Already linked to this Master' : `Linked to ${owner.name}` : 'Already confirmed'}</p> : differences.length ? <p className="mt-1 flex items-start gap-1 text-xs text-amber-700 dark:text-amber-300"><TriangleAlert className="mt-0.5 size-3 shrink-0" />{differences.map(row => row.label).join(', ')} differs · Review needed</p> : skuMatch ? <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Check className="size-3" />Matching SKU · Verify product</p> : null}
                </div></div></td>
                <td className={styles.shop}><div className="flex items-start gap-2"><ChannelLogo channel={{ key: item.channel === 'website' ? 'primeweb' : item.channel }} size="sm" /><div><p className="break-words text-xs font-medium">{item.storeName}</p><p className="mt-1 text-xs text-muted-foreground">{ACTIVITY_CHANNEL_LABELS[item.channel]}</p></div></div></td>
                <td className={styles.value}><span className={styles.mobileLabel}>Listing price</span>{price(item)}</td><td className={styles.value}><span className={styles.mobileLabel}>Shop stock</span>{number(item.channelStock)}{Number.isFinite(item.channelStock) && item.channelStock >= 0 ? ' units' : ''}</td>
              </tr>;
            })}</tbody>
          </table>
          {!visible.length && <div className="rounded-lg border border-dashed px-4 py-10 text-center"><Package className="mx-auto size-6 text-muted-foreground" /><h3 className="mt-3 text-sm font-semibold">{available.length ? 'No listings match your filters' : 'No unlinked listings available'}</h3><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{available.length ? 'Try another name, SKU, listing ID or shop.' : 'Import listings from a connected shop first. Listings already linked to a Master are not available here.'}</p>{available.length ? <Button variant="link" onClick={clearFilters}>Clear filters</Button> : <Button variant="link" asChild><a href="/sales-channels/connected-channels" target="_blank" rel="noopener noreferrer">Open connected channels<span className="sr-only"> in a new tab</span></a></Button>}</div>}
          </div>
        </> : <div className="space-y-4 px-5 py-5 sm:px-6">
          <div className="flex items-start gap-2 rounded-lg border bg-muted/20 p-3 text-sm"><Link2 className="mt-0.5 size-4 shrink-0 text-primary" /><p>Link only. Shop content, images, price and stock stay unchanged. <strong className="font-medium">Master sync stays off.</strong></p></div>
          {review.listings.map(item => {
            const differences = listingMatchEvidence(item, review.master).filter(row => row.state === 'different' && row.key !== 'sku');
            const variants = review.master.has_variants || review.master.product_type === 'variant';
            return <section key={item.id} className="space-y-3 rounded-xl border p-4" aria-label={`Review ${item.channelSku || item.listingId} from ${item.storeName}`}>
              <div className="flex items-start gap-3"><Photo src={item.image || item.images?.[0]} /><div className="min-w-0 flex-1"><h3 className="break-words text-sm font-semibold">{item.title}</h3><p className="mt-1 break-words text-xs text-muted-foreground">{ACTIVITY_CHANNEL_LABELS[item.channel]} · {item.storeName} · ID: {item.listingId}</p><p className="mt-1 text-xs text-muted-foreground">{price(item)} · {number(item.channelStock)} {Number.isFinite(item.channelStock) ? 'units' : 'stock'}</p></div><span className="shrink-0 rounded-md border px-2 py-1 text-xs text-muted-foreground">Sync off</span></div>
              {differences.length > 0 && <div className="space-y-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs"><p className="flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-300"><TriangleAlert className="size-3.5" />Check product identity before linking</p>{differences.map(row => <p key={row.key} className="break-words"><strong className="font-medium">{row.label}:</strong> {row.listing} <span className="text-muted-foreground">(listing) · {row.master} (Master)</span></p>)}</div>}
              {item.variants === 0 && !variants && <label className="flex cursor-pointer items-start gap-2 text-sm"><Checkbox className="mt-0.5" checked={verifiedSingles.includes(item.id)} onCheckedChange={checked => setVerifiedSingles(current => checked ? [...current, item.id] : current.filter(id => id !== item.id))} /><span>I verified this listing has one SKU.</span></label>}
              {variants ? <ListingSkuMappings product={review.master} sources={[item]} mappings={mappings} onChange={setMappings} /> : item.variants <= 1 ? <div className="flex flex-wrap items-center gap-2 border-t pt-3 text-xs"><span className="text-muted-foreground">SKU mapping</span><span className="break-all font-mono">{item.channelSku || 'Not recorded'}</span><ArrowRight className="size-3 shrink-0 text-muted-foreground" /><span className="break-all font-mono">{review.master.sku_code}</span></div> : <p className="text-sm text-amber-700 dark:text-amber-300">This listing has {item.variants} SKUs. It needs a variant Master; remove it from this selection.</p>}
            </section>;
          })}
          {mappingError && <p role="status" className="text-sm text-amber-700 dark:text-amber-300">{mappingError}</p>}
          <label className="flex cursor-pointer items-start gap-2.5 text-sm leading-5"><Checkbox className="mt-0.5" checked={acknowledged} onCheckedChange={checked => setAcknowledged(checked === true)} /><span>I checked that every selected listing represents this product and the same pack size.</span></label>
        </div>}
      </div>
      <div className="shrink-0 space-y-3 border-t bg-background px-5 py-4 sm:px-6">
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {!review && selected.length > 0 && !selectionValid && <p role="alert" className="text-sm text-destructive">Some selected listings are unavailable. Deselect them or clear the selection.</p>}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-sm"><span>{selected.length} selected{!review && hiddenSelected > 0 ? ` · ${hiddenSelected} outside filters` : ''}</span>{!review && selected.length > 0 && <Button variant="ghost" size="sm" onClick={() => { setSelected([]); setSelectedOnly(false); setError(''); }}>Clear selection</Button>}</div>
          <div className="flex items-center gap-2"><Button variant="outline" disabled={saving} onClick={review ? back : onClose}>{review ? <><ArrowLeft className="size-4" />Back</> : 'Cancel'}</Button><Button disabled={saving || (review ? !acknowledged || Boolean(mappingError) : !selectionValid)} onClick={review ? save : beginReview}>{saving ? 'Linking…' : review ? `Link ${selected.length} listing${selected.length === 1 ? '' : 's'}` : `Review links${selected.length ? ` (${selected.length})` : ''}`}{!review && <ArrowRight className="size-4" />}</Button></div>
        </div>
      </div>
    </DialogContent>
  </Dialog>;
}
