import { useMemo, useState } from 'react';
import { AlertCircle, ChevronDown, History, Package, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ACTIVITY_CHANNEL_LABELS, demoProductActivity, getProductActivity, groupRoutineSyncActivity, type ProductActivity } from '@/lib/product-activity';
import type { Product, ProductRevision } from '@/lib/product-store';
import { cn } from '@/lib/utils';

const formatTime = (time: string) => new Date(time).toLocaleString('en-GB', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short',
});
type Scope = 'all' | 'master' | 'listing';

export function ProductActivityHistory({ product, showDemoInitially = false, initialListingChannel, initialListingKey, initialRevisionId }: {
  product: Product; showDemoInitially?: boolean; initialListingChannel?: string | null; initialListingKey?: string | null; initialRevisionId?: string | null;
}) {
  const [scope, setScope] = useState<Scope>(initialListingChannel || initialListingKey ? 'listing' : 'all');
  const [listingKey, setListingKey] = useState(initialListingKey ?? 'all');
  const [shop, setShop] = useState('all');
  const [showDemo, setShowDemo] = useState(showDemoInitially);
  const [limit, setLimit] = useState(20);
  const [version, setVersion] = useState<ProductRevision | null>(() => product.revisions?.find(revision => revision.id === initialRevisionId) ?? null);
  const events = useMemo(() => [...getProductActivity(product), ...(showDemo ? demoProductActivity(product) : [])]
    .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt)), [product, showDemo]);
  const shops = useMemo(() => [...new Map(events.filter(event => event.listing).map(event => {
    const listing = event.listing!;
    return [JSON.stringify([listing.channel, listing.shop]), `${ACTIVITY_CHANNEL_LABELS[listing.channel]} · ${listing.shop}`];
  })).entries()], [events]);
  const [channel, setChannel] = useState(initialListingChannel ?? 'all');
  const filtered = events.filter(event => (scope === 'all' || event.scope === scope)
    && (scope !== 'listing' || ((shop === 'all' || JSON.stringify([event.listing?.channel, event.listing?.shop]) === shop)
      && (channel === 'all' || event.listing?.channel === channel)
      && (listingKey === 'all' || event.listing?.key === listingKey))));
  const groups = groupRoutineSyncActivity(filtered);

  function selectScope(value: Scope) { setScope(value); setShop('all'); setChannel('all'); setListingKey('all'); setLimit(20); }
  function viewVersion(event: ProductActivity) {
    setVersion(product.revisions?.find(revision => revision.id === event.revisionId) ?? null);
  }

  return <>
    <Card>
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div><CardTitle className="flex items-center gap-2 text-base"><History className="size-4 text-primary" />Activity history</CardTitle>
          <p className="mt-2 text-sm text-muted-foreground">Master changes and related listing activity, in one place.</p></div>
        <Button type="button" variant="outline" size="sm" aria-pressed={showDemo} onClick={() => { setShowDemo(!showDemo); setLimit(20); }}>
          {showDemo ? 'Hide demo events' : 'Show demo events'}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
          <div role="group" aria-label="Activity scope" className="flex flex-wrap gap-1 rounded-lg bg-muted/40 p-1">
            {([['all', 'All activity'], ['master', 'Master'], ['listing', 'Listings']] as const).map(([value, label]) =>
              <button key={value} type="button" aria-pressed={scope === value} onClick={() => selectScope(value)}
                className={cn('min-h-10 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', scope === value ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground')}>
                {label}
              </button>)}
          </div>
          {scope === 'listing' && <div className="flex flex-wrap items-center gap-2">
            {listingKey !== 'all' && <Button type="button" variant="ghost" size="sm" onClick={() => setListingKey('all')}>Selected listing · Clear filter</Button>}
            {channel !== 'all' && <Button type="button" variant="ghost" size="sm" onClick={() => setChannel('all')}>{ACTIVITY_CHANNEL_LABELS[channel as keyof typeof ACTIVITY_CHANNEL_LABELS] ?? channel} · Clear filter</Button>}
            <label htmlFor="activity-shop" className="text-xs text-muted-foreground">Shop</label>
            <select id="activity-shop" value={shop} onChange={event => { setShop(event.target.value); setChannel('all'); setListingKey('all'); setLimit(20); }} className="h-10 max-w-full rounded-md border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-72">
              <option value="all">All shops</option>{shops.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </div>}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 py-4 text-xs text-muted-foreground">
          <p aria-live="polite">{filtered.length} events · Newest first</p>
          <p>{showDemo ? 'Demo-labelled events are examples, not actual shop activity.' : 'Local prototype history · New saved changes are recorded here.'}</p>
        </div>
        {filtered.length ? <ol aria-label="Product activity timeline" className="divide-y">
          {groups.slice(0, limit).map(event => {
            const Icon = event.outcome === 'error' ? AlertCircle : event.scope === 'master' ? Package : Store;
            return <li key={event.id} className="flex gap-3 py-4 first:pt-1">
              <span className={cn('mt-1 grid size-9 shrink-0 place-items-center rounded-full border bg-background', event.outcome === 'error' ? 'text-destructive' : 'text-muted-foreground')}><Icon className="size-4" /></span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{event.scope === 'master' ? 'Product Master' : 'Listing'}</span>
                  {event.listing && <span>{ACTIVITY_CHANNEL_LABELS[event.listing.channel]} · {event.listing.shop}</span>}
                  {event.demo && <span className="rounded border border-dashed px-1.5 py-0.5 text-xs">Demo</span>}
                </div>
                <p className="mt-1 font-medium">{event.title}{event.repeated && <span className="ml-2 text-xs font-normal text-muted-foreground">{event.repeated.length} updates</span>}</p>
                <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs leading-5 text-muted-foreground">
                  <span>{event.actor}</span><span aria-hidden="true">·</span><time dateTime={event.occurredAt}>{formatTime(event.occurredAt)}</time>
                  {event.listing && <><span aria-hidden="true">·</span><span className="break-all">{event.listing.sku}</span></>}
                </div>
                {event.revisionId ? <Button type="button" variant="link" size="sm" className="mt-1 px-0" onClick={() => viewVersion(event)}>View version</Button>
                  : <details className="group mt-2">
                    <summary className="flex min-h-9 w-fit cursor-pointer list-none items-center gap-1 rounded text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">View details<ChevronDown className="size-3.5 group-open:rotate-180" /></summary>
                    <div className="mt-2 space-y-3 border-l-2 pl-4 text-sm">
                      <p className="max-w-2xl leading-6 text-muted-foreground">{event.detail}</p>
                      {event.listing?.externalId && <p className="break-all text-xs text-muted-foreground">Listing ID: {event.listing.externalId}</p>}
                      {event.repeated && <ul className="space-y-2 text-xs text-muted-foreground">{event.repeated.map(entry => <li key={entry.id}><time dateTime={entry.occurredAt}>{formatTime(entry.occurredAt)}</time> · {entry.changes?.map(change => `${change.field}: ${change.before} → ${change.after}`).join(' · ') || entry.detail}</li>)}</ul>}
                      {Boolean(event.changes?.length) && <dl className="space-y-2">{event.changes!.map(change => <div key={change.field} className="grid gap-1 sm:grid-cols-[160px_minmax(0,1fr)]">
                        <dt className="font-medium capitalize">{change.field}</dt><dd className="min-w-0 break-words text-muted-foreground"><span>{change.before}</span><span aria-label="changed to" className="mx-2">→</span><span className="text-foreground">{change.after}</span></dd>
                      </div>)}</dl>}
                    </div>
                  </details>}
              </div>
            </li>;
          })}
        </ol> : <div className="py-12 text-center"><History className="mx-auto mb-3 size-6 text-muted-foreground" /><p className="font-medium">No activity in this view</p><p className="mt-2 text-sm text-muted-foreground">New saved changes will appear here. Older listing activity was not recorded.</p></div>}
        {groups.length > limit && <Button type="button" variant="outline" className="mt-4 w-full" onClick={() => setLimit(limit + 20)}>Load more activity</Button>}
      </CardContent>
    </Card>
    <Sheet open={Boolean(version)} onOpenChange={open => { if (!open) setVersion(null); }}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader><SheetTitle>Master version {version ? `v${version.number}` : ''}</SheetTitle><SheetDescription>Version details for {product.sku_code}. Listing activity is not part of this version.</SheetDescription></SheetHeader>
        {version && <div className="mt-6 space-y-6"><dl className="space-y-4 text-sm">
          <div><dt className="text-muted-foreground">Recorded by</dt><dd className="mt-1 font-medium">{version.createdBy}</dd></div>
          <div><dt className="text-muted-foreground">Recorded at</dt><dd className="mt-1">{formatTime(version.createdAt)}</dd></div>
          <div><dt className="text-muted-foreground">Summary</dt><dd className="mt-1 leading-6">{version.summary === 'Published canonical Product Master revision' ? 'Product Master version activated' : version.summary}</dd></div>
        </dl><p className="border-t pt-4 text-sm leading-6 text-muted-foreground">This prototype retains version metadata, not a complete field-level snapshot. Viewing a version does not restore data or publish listings.</p></div>}
      </SheetContent>
    </Sheet>
  </>;
}
