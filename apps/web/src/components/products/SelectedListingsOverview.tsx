import { useId, useState } from 'react';
import { ArrowRight, Check, ChevronDown, ChevronUp, Package } from 'lucide-react';
import { ChannelLogo } from '@/components/channels/ChannelLogo';
import { Button } from '@/components/ui/button';
import type { CatalogImportItem } from '@/lib/catalog-import-store';

type Props = {
  listings: CatalogImportItem[];
  activeIndex?: number;
  reviewedIds?: string[];
  onView?: (index: number) => void;
};

function ListingImage({ listing }: { listing: CatalogImportItem }) {
  const src = listing.image || listing.images?.[0];
  const [failedSrc, setFailedSrc] = useState<string>();
  return <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg border bg-background/60">
    {src && src !== failedSrc
      ? <img src={src} alt="" className="size-full object-contain" onError={() => setFailedSrc(src)} />
      : <Package className="size-5 text-muted-foreground" aria-hidden="true" />}
  </span>;
}

/** The full selection is visible before choosing a destination; viewing is not confirmation. */
export function SelectedListingsOverview({ listings, activeIndex, reviewedIds = [], onView }: Props) {
  const headingId = useId();
  const listId = useId();
  const [expanded, setExpanded] = useState(false);
  const showAll = expanded || (activeIndex ?? 0) >= 4;
  const visible = showAll ? listings : listings.slice(0, 4);

  return <section aria-labelledby={headingId} className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <h3 id={headingId} className="flex items-center gap-2 text-sm font-semibold">Selected listings <span className="rounded-md bg-muted px-2 py-0.5 text-xs tabular-nums">{listings.length}</span></h3>
      <p className="flex items-center gap-2 text-xs text-muted-foreground"><span>All {listings.length} listings</span><ArrowRight className="size-3.5" aria-hidden="true" /><span>1 Product Master</span></p>
    </div>
    <ul id={listId} className="grid gap-3 sm:grid-cols-2">
      {visible.map((listing, index) => {
        const active = Boolean(onView && index === activeIndex);
        const reviewed = reviewedIds.includes(listing.id);
        const style = `block h-full w-full min-w-0 rounded-xl border p-3 text-left ${active ? 'border-primary bg-primary/5' : 'border-border bg-muted/20'}`;
        const content = <>
          <span className="mb-3 flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground"><ChannelLogo channel={{ key: listing.channel }} size="sm" /><span className="min-w-0 break-words"><span className="capitalize text-foreground">{listing.channel}</span> · {listing.storeName}</span></span>
            {onView ? <span className={`flex shrink-0 items-center gap-1 text-xs ${reviewed ? 'text-emerald-700 dark:text-emerald-300' : active ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
              {reviewed && <Check className="size-3.5" aria-hidden="true" />}{active ? (reviewed ? 'Viewing · Reviewed' : 'Viewing') : reviewed ? 'Reviewed' : 'To review'}
            </span> : <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{index + 1} / {listings.length}</span>}
          </span>
          <span className="flex items-start gap-3">
            <ListingImage listing={listing} />
            <span className="min-w-0 flex-1">
              <span className="block break-words text-sm font-semibold leading-5">{listing.title}</span>
              <span className="mt-1 block break-all font-mono text-xs leading-5 text-muted-foreground">{listing.channelSku || 'SKU not provided'}</span>
              <span className="mt-1 block break-words text-xs leading-5 text-muted-foreground">{listing.brand || 'Brand not provided'} · {listing.variants === 0 ? 'SKU structure not recorded' : listing.variants === 1 ? 'Single product' : `${listing.variants} SKUs`}</span>
            </span>
          </span>
        </>;
        return <li key={listing.id} className="min-w-0">
          {onView ? <button type="button" aria-label={`View listing ${index + 1}: ${listing.title} · ${listing.storeName}`} aria-pressed={active} className={`${style} cursor-pointer transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none`} onClick={() => onView(index)}>{content}</button>
            : <div role="group" aria-label={`Selected listing ${index + 1}`} className={style}>{content}</div>}
        </li>;
      })}
    </ul>
    {listings.length > 4 && (activeIndex ?? 0) < 4 && <Button variant="ghost" className="h-11 w-full text-xs" aria-controls={listId} aria-expanded={showAll} onClick={() => setExpanded(value => !value)}>{showAll ? 'Show fewer listings' : `Show all ${listings.length} listings`}{showAll ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}</Button>}
  </section>;
}
