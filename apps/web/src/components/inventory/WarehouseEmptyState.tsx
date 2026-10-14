import { Plus, Warehouse } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/system/EmptyState';

export function WarehouseEmptyState({ onAddWarehouse }: { onAddWarehouse: () => void }) {
  return <section aria-label="Get started with warehouses">
    <EmptyState
      className="min-h-[320px] border-0 bg-transparent shadow-none sm:min-h-[360px]"
      icon={<Warehouse aria-hidden="true" />}
      title="No warehouses yet"
      description="Add your first location to track stock, see what’s available to sell, and choose which shops use it."
      action={<Button className="min-h-11" onClick={onAddWarehouse}><Plus className="size-4" aria-hidden="true" />Add warehouse</Button>}
    />
    <ol aria-label="Warehouse setup steps" className="mx-auto grid max-w-3xl gap-5 border-t border-border px-2 py-6 sm:grid-cols-3 sm:gap-6">
      {[
        ['Add a location', 'Give your warehouse a name and address.'],
        ['Record opening stock', 'Select your products and enter the quantities on hand.'],
        ['Choose shops', 'Set this warehouse as a shop’s default stock source when ready.'],
      ].map(([title, description], index) => <li key={title} className="flex items-start gap-3">
        <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">{index + 1}</span>
        <div><p className="text-sm font-medium">{title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p></div>
      </li>)}
    </ol>
  </section>;
}
