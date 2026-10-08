import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ManageStockHoldsButton } from '@/components/inventory/ManageStockHoldsDialog';
import { availabilityReasons } from '@/lib/warehouse-availability';
import type { Product } from '@/lib/product-store';
import type { VariantInventoryView } from '@/lib/variant-inventory-view';
import { ListingReviewHelp } from './ListingReviewHelp';

type Props = { name: string; product?: Product | null; view: VariantInventoryView; canWrite: boolean; onAdd: () => void; onAdjust: (warehouseId: string) => void };

export function VariantInventoryDetails({ name, product, view, canWrite, onAdd, onAdjust }: Props) {
  const { sku, locations } = view;
  if (!sku) return <section aria-label={`Inventory for ${name}`} className="rounded-lg border bg-background px-4 py-4">
    <p className="text-sm font-medium">Save this variant before setting up stock</p>
    <p className="mt-1 text-xs leading-5 text-muted-foreground">Save the Product Master first, then choose where this SKU is stored. Existing stock is not copied or split between new variants.</p>
  </section>;
  const groups = [
    { name: 'Stock locations', locations: locations.filter(location => !location.external) },
    { name: 'Channel-managed stock · read only', locations: locations.filter(location => location.external) },
  ];
  return <section aria-label={`Inventory for ${name}`} className="space-y-3 rounded-lg border bg-background p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><div className="flex items-center gap-1"><h4 className="text-sm font-semibold">Inventory for {name}</h4><ListingReviewHelp label={`Stock for ${name}`}>Recorded stock is the physical count, including zero. Available to sell is calculated only when holds are verified. Adding a location does not allocate stock to a listing or enable sync.</ListingReviewHelp></div><p className="text-xs text-muted-foreground">{sku.sku_code}</p></div>
      {canWrite && view.availableLocations.length > 0 && <Button type="button" variant="outline" className="h-11" aria-label={`Add stock location for ${name}`} onClick={onAdd}><Plus className="size-4" />Add stock location</Button>}
    </div>
    {!locations.length ? <div className="rounded-md bg-muted/30 px-4 py-4"><p className="text-sm font-medium">No stock recorded yet</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Choose the warehouse that physically holds this SKU and record its opening count. Other warehouses stay unassigned.</p></div> : groups.filter(group => group.locations.length).map(group => <div key={group.name} className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{group.name}</p>
      <div role="table" aria-label={`${name} · ${group.name}`} className="overflow-hidden rounded-md border">
        <div role="row" className="hidden grid-cols-[minmax(0,1.3fr)_minmax(90px,.6fr)_minmax(120px,.7fr)_minmax(0,1fr)] gap-3 border-b bg-muted/30 px-3 py-2 text-xs text-muted-foreground md:grid"><span role="columnheader">Warehouse</span><span role="columnheader">Recorded stock</span><span role="columnheader">Available to sell</span><span role="columnheader" className="text-right">Actions</span></div>
        {group.locations.map(location => <div key={location.id} role="row" className="grid gap-3 border-b px-3 py-3 last:border-0 sm:grid-cols-2 md:grid-cols-[minmax(0,1.3fr)_minmax(90px,.6fr)_minmax(120px,.7fr)_minmax(0,1fr)] md:items-center">
          <div role="cell" className="min-w-0"><p className="break-words text-sm font-medium">{location.label}</p><p className="mt-0.5 text-xs text-muted-foreground">{location.code}{location.presence.incoming ? ' · Incoming stock' : location.presence.outgoing ? ' · Transfer in progress' : ''}</p></div>
          <div role="cell" className="text-sm tabular-nums"><span className="mr-2 text-xs text-muted-foreground md:hidden">Recorded stock</span>{location.balance.onHand === null ? 'Not recorded' : `${location.balance.onHand.toLocaleString()} units`}</div>
          <div role="cell" className="flex items-center gap-1 text-sm tabular-nums"><span className="mr-2 text-xs text-muted-foreground md:hidden">Available to sell</span>{location.external ? <span className="text-xs text-muted-foreground">Managed by channel</span> : location.balance.state === 'ready' ? `${location.balance.atp!.toLocaleString()} units` : <><span className="text-xs text-muted-foreground">Not verified</span><ListingReviewHelp label={`Availability at ${location.label}`}>{availabilityReasons[location.balance.state]}</ListingReviewHelp></>}</div>
          <div role="cell" className="flex flex-wrap justify-start gap-2 md:justify-end">{canWrite && location.writable ? <><Button type="button" variant="outline" className="h-11 text-xs" aria-label={`Adjust stock at ${location.label} for ${name}`} onClick={() => onAdjust(location.id)}>{location.balance.onHand === null ? 'Record opening stock' : 'Adjust stock'}</Button>{product && <ManageStockHoldsButton product={product} warehouseId={location.id} sku={sku.sku_code} />}</> : <span className="text-xs text-muted-foreground">Read only</span>}</div>
        </div>)}
      </div>
    </div>)}
    <p className="text-xs leading-5 text-muted-foreground">Shop quantities and stock sync settings stay unchanged.</p>
  </section>;
}
