import { useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChannelLogo } from '@/components/channels/ChannelLogo';
import { confirmSuggestedListingLinks, type ListingMatchReview } from '@/lib/product-listing-intake';
import type { CatalogImportItem } from '@/lib/catalog-import-store';
import type { Product } from '@/lib/product-store';
import type { ListingIntakeCatalog } from '@/lib/listing-intake-catalog';

export type SuggestedLinkPreview = { listing: CatalogImportItem; master: Product; review: ListingMatchReview };

export function SuggestedListingLinksDialog({ catalog, pairs, onClose, onSaved }: {
  catalog?: ListingIntakeCatalog;
  pairs: SuggestedLinkPreview[];
  onClose: () => void;
  onSaved: (result: ReturnType<typeof confirmSuggestedListingLinks>) => void;
}) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState('');
  const saveLock = useRef(false);
  const masterCount = new Set(pairs.map(pair => pair.master.id)).size;
  const ready = pairs.length > 0;
  const confirm = () => {
    if (!acknowledged || !ready || saveLock.current) return;
    saveLock.current = true;
    try { onSaved(confirmSuggestedListingLinks(pairs.map(pair => pair.review), catalog)); }
    catch (reason) { saveLock.current = false; setError(reason instanceof Error ? reason.message : 'Could not save links. Return to review and try again.'); setAcknowledged(false); }
  };
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="flex max-h-[90dvh] w-[calc(100vw-2rem)] max-w-3xl flex-col p-0">
      <DialogHeader className="border-b p-5 pr-12">
        <DialogTitle>Review suggested links</DialogTitle>
        <DialogDescription>{pairs.length} listing{pairs.length === 1 ? '' : 's'} → {masterCount} Product Master{masterCount === 1 ? '' : 's'}. Each listing links to the Master shown beside it; Masters are not merged.</DialogDescription>
      </DialogHeader>
      <div className="min-h-0 space-y-4 overflow-y-auto p-5">
        <p className="text-sm text-muted-foreground">SKU and brand match. Check the actual product, model and pack size before confirming.</p>
        <ul className="divide-y rounded-lg border" aria-label="Listing to Master pairs">
          {pairs.map(({ listing, master }) => <li key={listing.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            <div className="min-w-0"><div className="mb-2 flex items-center gap-2"><ChannelLogo channel={{ key: listing.channel }} size="sm" /><span className="text-xs text-muted-foreground">{listing.storeName}</span></div><p className="text-sm font-medium">{listing.title}</p><p className="mt-1 break-words font-mono text-xs text-muted-foreground">{listing.channelSku}</p><p className="mt-1 text-xs text-muted-foreground">Brand: {listing.brand}</p></div>
            <ArrowRight aria-hidden="true" className="size-4 rotate-90 text-muted-foreground sm:rotate-0" />
            <div className="min-w-0"><p className="mb-2 text-xs text-muted-foreground">Product Master</p><p className="text-sm font-medium">{master.name}</p><p className="mt-1 break-words font-mono text-xs text-muted-foreground">{master.sku_code}</p><p className="mt-1 text-xs text-muted-foreground">Brand: {master.brand}</p></div>
          </li>)}
        </ul>
        <label className="flex cursor-pointer items-start gap-3 text-sm leading-6"><Checkbox className="mt-1" checked={acknowledged} onCheckedChange={value => setAcknowledged(value === true)} />I reviewed every Listing → Master pair, including model and pack size.</label>
        <p className="text-xs text-muted-foreground">Only listing relationships are saved. Master status, details and images stay unchanged. Shop content, stock and sync settings will not change.</p>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </div>
      <DialogFooter className="border-t p-4"><Button variant="outline" onClick={onClose}>Back to review</Button><Button disabled={!acknowledged || !ready} onClick={confirm}>Confirm links</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}
