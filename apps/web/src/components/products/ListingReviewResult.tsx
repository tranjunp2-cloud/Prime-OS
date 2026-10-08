import { CheckCircle2, ChevronDown, CircleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type ListingReviewReceipt = {
  pairs: { channel: string; listingId: string; listing: string; shop: string; masterId: string; master: string; readiness?: { label: string; ready: boolean; reasons: string[] } }[];
  deferred: boolean;
  masterState: string;
  reviewSaved: boolean;
};

/** A receipt describes saved work, never an AI suggestion or an unsaved check. */
export function ListingReviewResult({ receipt, onOpenMaster, onContinue }: {
  receipt: ListingReviewReceipt;
  onOpenMaster?: (id: string) => void;
  onContinue?: () => void;
}) {
  const masters = [...new Map(receipt.pairs.map(pair => [pair.masterId, pair])).values()];
  const Icon = receipt.deferred || !receipt.reviewSaved ? CircleAlert : CheckCircle2;
  return <section aria-label="Saved review result" className="rounded-lg border bg-card px-4 py-3">
    <div className="flex flex-wrap items-start gap-3">
      <Icon aria-hidden="true" className={`mt-0.5 size-5 shrink-0 ${receipt.deferred || !receipt.reviewSaved ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`} />
      <div className="min-w-0 flex-1" role="status">
        <p className="text-sm font-semibold">{receipt.pairs.length} listing{receipt.pairs.length === 1 ? '' : 's'} linked to {masters.length} Master{masters.length === 1 ? '' : 's'}{receipt.deferred ? ' · Review unfinished' : ''}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{receipt.masterState} Nothing published; sync was not turned on.</p>
        {receipt.deferred && <p className="mt-1 text-xs leading-5 text-amber-700 dark:text-amber-300">Unconfirmed SKU mappings cannot be used for price or stock sync.</p>}
        {!receipt.reviewSaved && <p className="mt-1 text-xs leading-5 text-amber-700 dark:text-amber-300">Links were saved, but review history could not be saved. Do not link these listings again.</p>}
      </div>
      {onContinue && <Button variant="outline" className="h-11" onClick={onContinue}>Continue unfinished review</Button>}
      {masters.length === 1 && onOpenMaster && <Button variant="ghost" className="h-11" onClick={() => onOpenMaster(masters[0].masterId)}>View updated Master</Button>}
    </div>
    <ul className="mt-3 divide-y border-t" aria-label="Linked listing readiness">{receipt.pairs.filter(pair => pair.readiness).map(pair => <li key={`${pair.channel}:${pair.shop}:${pair.listingId}`} className="flex flex-wrap items-start justify-between gap-2 py-3 text-xs"><span className="min-w-0"><strong>{pair.shop}</strong><span className="ml-2 capitalize text-muted-foreground">{pair.channel}</span><span className="mt-1 block break-words text-muted-foreground">{pair.listing}</span></span><span className={pair.readiness!.ready ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}>{pair.readiness!.label}{pair.readiness!.reasons.length > 0 && <span className="mt-1 block max-w-sm text-muted-foreground">{pair.readiness!.reasons.join(' · ')}</span>}</span></li>)}</ul>
    <details className="mt-2 pl-8">
      <summary className="flex min-h-8 w-fit cursor-pointer list-none items-center gap-1 text-xs text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">View saved links<ChevronDown aria-hidden="true" className="size-3.5" /></summary>
      <ul className="mt-1 space-y-2" aria-label="Saved Listing to Master pairs">{receipt.pairs.map(pair => <li key={JSON.stringify([pair.channel, pair.shop, pair.listingId])} className="grid gap-1 border-t py-2 text-xs sm:grid-cols-2"><span className="min-w-0 break-words">{pair.listing}<span className="mt-1 block text-muted-foreground">{pair.shop}</span></span><span className="min-w-0 break-words">→ {pair.master}{masters.length > 1 && onOpenMaster && <Button variant="link" className="ml-1 h-8 px-1 text-xs" onClick={() => onOpenMaster(pair.masterId)}>View Master</Button>}</span></li>)}</ul>
    </details>
  </section>;
}
