import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ArrowRight, Check, ChevronDown, ChevronUp, Package, Plus } from 'lucide-react';
import { ChannelLogo } from '@/components/channels/ChannelLogo';
import { Button } from '@/components/ui/button';
import type { CatalogImportItem } from '@/lib/catalog-import-store';
import type { Product } from '@/lib/product-store';
import { ListingReviewHelp } from './ListingReviewHelp';

type Props = {
  disabled?: boolean;
  listings: CatalogImportItem[];
  activeIndex: number;
  reviewedIds: string[];
  master: Product;
  masterImage: ReactNode;
  onView: (index: number) => void;
  onChangeMaster: () => void;
  onCreateMaster: () => void;
};

function ListingThumbnail({ listing }: { listing: CatalogImportItem }) {
  const src = listing.image || listing.images?.[0];
  const [failedSrc, setFailedSrc] = useState<string>();
  return <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-md border bg-background">
    {src && src !== failedSrc
      ? <img src={src} alt="" className="size-full object-contain" onError={() => setFailedSrc(src)} />
      : <Package className="size-4 text-muted-foreground" aria-hidden="true" />}
  </span>;
}

/** Review navigation and the shared destination, not a preview of already-saved links. */
export function ListingMappingContext({ listings, activeIndex, reviewedIds, master, masterImage, onView, onChangeMaster, onCreateMaster, disabled = false }: Props) {
  const headingId = useId();
  const listId = useId();
  const [expanded, setExpanded] = useState(false);
  const queue = useRef<HTMLOListElement>(null);
  const activeRow = useRef<HTMLButtonElement>(null);
  // Keep the current listing visible when stepping through a larger selection.
  const visible = listings.map((listing, index) => ({ listing, index }))
    .filter(({ index }) => expanded || index < 4 || index === activeIndex);
  const hasVariants = master.has_variants || master.product_type === 'variant';
  useEffect(() => {
    const list = queue.current;
    const row = activeRow.current;
    if (!list || !row || list.scrollHeight <= list.clientHeight) return;
    const bounds = list.getBoundingClientRect();
    const activeBounds = row.getBoundingClientRect();
    // Scroll just the queue, not the whole review drawer, when advancing a large group.
    if (activeBounds.top < bounds.top) list.scrollTop -= bounds.top - activeBounds.top;
    else if (activeBounds.bottom > bounds.bottom) list.scrollTop += activeBounds.bottom - bounds.bottom;
  }, [activeIndex, expanded]);

  return <section aria-labelledby={headingId} className="space-y-3">
    <div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <h3 id={headingId} className="flex items-center gap-2 text-sm font-semibold">{listings.length} listings <span className="sr-only">to</span><ArrowRight className="size-4 text-muted-foreground" aria-hidden="true" /> 1 Product Master</h3>
        <ListingReviewHelp label="Linking multiple listings">Check each listing against the same Master. Checking a listing does not save its link. The final confirmation applies to every listing in this selection; it does not publish or turn on sync.</ListingReviewHelp>
      </div>
      <p className="text-xs leading-5 text-muted-foreground">Use one Master only for listings of the same product. Different products? Go back and change your selection.</p>
    </div>

    <div className="grid overflow-hidden rounded-xl border bg-muted/10 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="order-2 min-w-0 md:order-1 md:border-r">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 text-xs">
          <span className="font-semibold">Listings to check</span>
          <span className="tabular-nums text-muted-foreground">Viewing {activeIndex + 1} of {listings.length}</span>
        </div>
        <ol ref={queue} id={listId} className="space-y-1 p-2 md:max-h-80 md:overflow-y-auto" aria-label="Listing review queue">
          {visible.map(({ listing, index }) => {
            const active = activeIndex === index;
            const checked = reviewedIds.includes(listing.id);
            return <li key={listing.id}>
              <button ref={active ? activeRow : undefined} type="button" aria-label={`View listing ${index + 1}: ${listing.title} · ${listing.storeName}`} aria-pressed={active}
                className={`flex w-full min-w-0 items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none ${active ? 'border-primary bg-primary/5' : 'border-transparent'}`}
                disabled={disabled} onClick={() => onView(index)}>
                <ListingThumbnail listing={listing} />
                <span className="min-w-0 flex-1 space-y-1">
                  <span className="block break-words text-sm font-medium leading-5">{listing.title}</span>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><ChannelLogo channel={{ key: listing.channel }} size="sm" /><span className="min-w-0 break-words"><span className="text-foreground">{listing.storeName}</span> · <span className="capitalize">{listing.channel}</span></span></span>
                  <span className="block break-all font-mono text-xs leading-5 text-muted-foreground">{listing.channelSku || 'SKU not provided'}</span>
                  <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs leading-5">
                    <span className="break-words text-muted-foreground">{listing.brand || 'Brand not provided'} · {listing.variants === 0 ? 'SKU structure unknown' : `${listing.variants} SKU${listing.variants === 1 ? '' : 's'}`}</span>
                    <span className={`inline-flex items-center gap-1 ${active ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                      {checked && <Check className="size-3.5 shrink-0" aria-hidden="true" />}{checked ? 'Checked · not saved' : active ? 'Checking now' : 'To check'}
                    </span>
                  </span>
                </span>
              </button>
            </li>;
          })}
        </ol>
        {listings.length > 4 && <Button variant="ghost" className="h-11 w-full rounded-none border-t text-xs" aria-controls={listId} aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? 'Show fewer listings' : `Show all ${listings.length} listings`}{expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}</Button>}
      </div>

      <div role="group" aria-label="Shared destination Master" className="order-1 min-w-0 border-b md:order-2 md:border-b-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 text-xs">
          <span className="font-semibold">Destination Master</span>
          <span className="text-muted-foreground">For all {listings.length} listings</span>
        </div>
        <div className="space-y-4 p-4">
          <div className="flex items-start gap-3">
            {masterImage}
            <div className="min-w-0 space-y-1">
              <p className="break-words text-sm font-semibold leading-5">{master.name}</p>
              <p className="break-all font-mono text-xs leading-5 text-muted-foreground">{master.sku_code}</p>
              <p className="break-words text-xs leading-5 text-muted-foreground">{master.brand || 'Brand not provided'} · {master.category || 'No category'}</p>
              <p className="text-xs leading-5 text-muted-foreground">{hasVariants ? `${master.skus.length} variant SKUs` : 'Single product · 1 SKU'} · Master {master.status === 'published' ? 'Active' : 'Draft'}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 border-t pt-3">
            <Button variant="outline" className="h-11" disabled={disabled} onClick={onChangeMaster}>Change Master for all</Button>
            <ListingReviewHelp label="Changing the shared Master">The new Master applies to all {listings.length} selected listings. You will check them again; previous check marks and SKU mapping choices are cleared. No saved links change until you confirm.</ListingReviewHelp>
          </div>
          <Button variant="ghost" className="-ml-3 h-11 text-xs text-muted-foreground" disabled={disabled} onClick={onCreateMaster}><Plus className="size-3.5" />Create a new Master for all</Button>
        </div>
      </div>
    </div>
  </section>;
}
