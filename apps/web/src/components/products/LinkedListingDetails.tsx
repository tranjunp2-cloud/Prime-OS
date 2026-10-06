import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { ChannelListing } from '@/lib/product-store';
import { listingMasterSync, MASTER_SYNC_FIELDS } from '@/lib/listing-master-sync';
import type { ListingShopData } from '@/lib/listing-shop-data';
import { formatPrice } from '@/lib/pricing-rules';
import { useState } from 'react';
import { ImageOff } from 'lucide-react';

export interface LinkedListingDetail {
  listing: ChannelListing;
  channelLabel: string;
  data: ListingShopData;
}

function ListingImage({ src, index }: { src: string; index: number }) {
  const [failed, setFailed] = useState(false);
  return failed
    ? <span role="img" aria-label={`Listing image ${index + 1} unavailable`} className="grid size-16 place-content-center rounded-md border bg-muted text-muted-foreground"><ImageOff className="size-5" aria-hidden="true" /></span>
    : <img src={src} alt={`Listing image ${index + 1}`} className="size-16 rounded-md border object-contain" loading="lazy" onError={() => setFailed(true)} />;
}

export function LinkedListingDetails({ detail, masterName, onClose, restoreFocus }: { detail: LinkedListingDetail | null; masterName: string; onClose: () => void; restoreFocus: () => void }) {
  const listing = detail?.listing;
  const stock = detail?.data.stock;
  const sync = listingMasterSync(listing);
  return <Sheet open={Boolean(detail)} onOpenChange={open => { if (!open) onClose(); }}>
    <SheetContent className="w-full overflow-y-auto sm:max-w-lg motion-reduce:animate-none" onCloseAutoFocus={event => { event.preventDefault(); restoreFocus(); }}>
      <SheetHeader className="pr-6"><SheetTitle>Linked listing details</SheetTitle><SheetDescription>Read-only shop data. Viewing this listing does not publish anything, enable sync or change your Product Master.</SheetDescription></SheetHeader>
      {detail && <>
        <p className="mt-6 break-words text-base font-semibold">{detail.data.title || listing?.store_name || detail.channelLabel}</p>
        {detail.data.images?.length ? <div className="mt-4 flex flex-wrap gap-2">{detail.data.images.map((image, index) => <ListingImage key={image} src={image} index={index} />)}</div> : null}
        <dl className="mt-4 divide-y text-sm">{[
          ['Shop', detail.data.shop || 'Not recorded'],
          ['Channel', detail.channelLabel],
          ['Shop SKU', detail.data.sku || 'Not recorded'],
          ['Listing ID', listing?.external_id || 'Not reported'],
          ['Linked Master', masterName || 'Untitled Product Master'],
          ['Price', detail.data.price ? `${formatPrice(detail.data.price.amount, detail.data.price.currency)} · ${detail.data.price.origin === 'shop' ? 'Imported shop data' : 'Saved locally, not verified on shop'}` : 'Shop data not loaded'],
          ['Reported shop stock', stock == null ? 'Shop data not loaded' : `${stock} units`],
          ['Shop data retrieved', detail.data.retrievedAt ? new Date(detail.data.retrievedAt).toLocaleString() : 'Retrieval time not recorded'],
          ['Publication', listing?.publication_unconfirmed ? 'Unknown · Not checked on shop' : listing?.status || 'Unknown'],
          ['Master data sync', sync.enabled ? `On · ${sync.fields.map(field => MASTER_SYNC_FIELDS[field]).join(', ')}` : 'Off · Keeps shop data'],
        ].map(([label, value]) => <div key={label} className="grid grid-cols-[120px_minmax(0,1fr)] gap-4 py-3"><dt className="text-muted-foreground">{label}</dt><dd className="break-words">{value}</dd></div>)}</dl>
        <p className="mt-4 rounded-lg border bg-muted/20 p-3 text-xs leading-5 text-muted-foreground">Shop values reflect the recorded listing data, not live inventory. Linking keeps shop data unchanged; publication and synchronization are separate actions.</p>
      </>}
      <Button type="button" variant="outline" className="mt-6 min-h-11" onClick={onClose}>Back to listings</Button>
    </SheetContent>
  </Sheet>;
}
