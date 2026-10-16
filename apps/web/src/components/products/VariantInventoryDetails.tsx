import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { VariantInventoryView } from '@/lib/variant-inventory-view';

type Props = { name: string; view: VariantInventoryView; canWrite: boolean; onAdd: () => void; onAdjust: (warehouseId: string) => void };

export function VariantInventoryDetails({ name, view, canWrite, onAdd, onAdjust }: Props) {
  const { sku, locations } = view;
  if (!sku) return <section aria-label={`Inventory for ${name}`} className="rounded-lg border bg-background px-4 py-4">
    <p className="text-sm font-medium">Save this variant before setting up stock</p>
    <p className="mt-1 text-xs leading-5 text-muted-foreground">Save the Product Master first, then choose where this SKU is stored. Existing stock is not copied or split between new variants.</p>
  </section>;
  return <section aria-label={`Inventory for ${name}`} className="space-y-3 rounded-lg border bg-background p-4">
    <div className="min-w-0"><h4 className="text-sm font-semibold">Inventory by location</h4><p className="mt-1 break-words text-xs text-muted-foreground">{name} · {sku.sku_code}</p></div>
    {!locations.length ? <div className="rounded-md bg-muted/30 px-4 py-4"><p className="text-sm font-medium">No stock recorded yet</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Add a warehouse and enter this variant’s opening stock. A count of 0 is valid.</p></div> : <div className="overflow-hidden rounded-md border">
      <ul aria-label={`Stock locations for ${name}`} className="divide-y">
        {locations.map(location => <li key={location.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2">
          <div className="min-w-0"><p className="break-words text-sm font-medium">{location.label}</p><p className="mt-0.5 text-xs text-muted-foreground">{location.code}{location.external ? ' · Channel-managed' : ''}</p></div>
          <div className="ml-auto flex flex-wrap items-center justify-end gap-3">
            <span className="text-sm font-semibold tabular-nums">{location.balance.onHand === null ? 'Not recorded' : `${location.balance.onHand.toLocaleString()} units`}</span>
            {canWrite && location.writable ? <Button type="button" variant="outline" className="h-11 text-xs" aria-label={`Adjust stock at ${location.label} for ${name}`} onClick={() => onAdjust(location.id)}>{location.balance.onHand === null ? 'Record opening stock' : 'Adjust stock'}</Button> : <span className="text-xs text-muted-foreground">Read only</span>}
          </div>
        </li>)}
      </ul>
      <div className="flex items-center justify-between gap-3 border-t bg-muted/20 px-4 py-3 text-xs"><span className="text-muted-foreground">Total recorded stock</span><strong className="tabular-nums">{view.total === null ? 'Not recorded' : `${view.total.toLocaleString()} units${view.incomplete ? ' · Partial' : ''}`}</strong></div>
      </div>
    }
    {canWrite && view.availableLocations.length > 0 && <Button type="button" variant="outline" className="h-11" aria-label={`Add stock location for ${name}`} onClick={onAdd}><Plus className="size-4" />Add stock location</Button>}
  </section>;
}
