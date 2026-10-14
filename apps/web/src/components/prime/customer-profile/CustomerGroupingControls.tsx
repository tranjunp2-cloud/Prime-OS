import { useState } from 'react';
import { Info, Split } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import type { OrderRecord } from '@/lib/orders-api';
import { customerDate, separateCustomerOrders, undoCustomerSeparation, type CustomerGroups, type OrderCustomer } from '@/lib/order-customers';

const phoneIssueText = {
  missing: 'No buyer phone was provided.',
  masked: 'The sales channel has hidden this buyer phone.',
  country_unknown: 'The country code for this buyer phone is unknown.',
  invalid: 'The buyer phone is incomplete or has an unsupported format.',
};

export function CustomerGroupingControls({ customer, groups, records, disabled, onChange }: {
  customer: OrderCustomer;
  groups: CustomerGroups;
  records: OrderRecord[];
  disabled: boolean;
  onChange: (next: CustomerGroups, focusOrderId: string) => boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [undoOpen, setUndoOpen] = useState(false);
  const canSeparate = !customer.phoneIssue && customer.orders.length > 1;

  function separate() {
    try {
      if (onChange(separateCustomerOrders(customer, selected, groups), selected[0])) {
        setEditing(false); setSelected([]); setError('');
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to separate these orders.'); }
  }

  return <section aria-label="Customer grouping" className="space-y-3">
    {customer.buyerNames.length > 1 && <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
      <p className="flex items-center gap-2 font-medium"><Info className="size-4 shrink-0" aria-hidden="true" />Multiple names share this number</p>
      <p className="mt-1 break-words text-muted-foreground">{customer.buyerNames.join(' · ')}</p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">They may be the same buyer or different people using one phone. Review the orders before treating them as one person.</p>
    </div>}
    <p className="text-xs leading-relaxed text-muted-foreground">{customer.phoneIssue
      ? `${phoneIssueText[customer.phoneIssue]} This order is kept as a separate profile; email and delivery contacts are not used to merge it.`
      : customer.separated
        ? 'This phone has manually separated profiles. New orders using it stay separate until reviewed.'
        : 'Orders with the same normalized buyer phone are grouped across channels in this workspace. This is a grouping rule, not identity verification.'}</p>
    {editing ? <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
      <h3 className="text-sm font-semibold">Choose orders for a separate profile</h3>
      <p className="text-xs leading-relaxed text-muted-foreground">Select orders belonging to another buyer. Leave at least one in this profile. Original order details and payment totals will not be changed.</p>
      <fieldset className="max-h-64 overflow-y-auto rounded-md border bg-background"><legend className="sr-only">Orders to separate</legend>
        {customer.orders.map(order => <label key={order.id} className="flex min-h-12 cursor-pointer items-start gap-3 border-b p-3 last:border-0 hover:bg-muted/40">
          <input type="checkbox" className="mt-1 size-4 shrink-0 accent-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring" checked={selected.includes(order.id)} onChange={event => { setSelected(previous => event.target.checked ? [...previous, order.id] : previous.filter(id => id !== order.id)); setError(''); }} aria-label={`Separate order ${order.orderKey}`} />
          <span className="min-w-0 text-sm"><span className="block break-words font-medium">{order.orderKey}</span><span className="mt-1 block break-words text-xs text-muted-foreground">{order.buyerSnapshot.name || 'Unnamed buyer'} · {order.metadata.store} · {customerDate(order.orderedAt)}</span></span>
        </label>)}
      </fieldset>
      <p className="text-xs text-muted-foreground" role="status">{selected.length} of {customer.orders.length} orders selected. New orders with this phone will be kept separate.</p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2"><Button variant="ghost" onClick={() => { setEditing(false); setSelected([]); setError(''); }}>Cancel</Button><Button disabled={disabled || !selected.length || selected.length === customer.orders.length} onClick={separate}>Separate selected orders</Button></div>
    </div> : <div className="flex flex-wrap gap-2">
      {canSeparate && <Button variant="outline" size="sm" className="min-h-10 gap-2" disabled={disabled} onClick={() => setEditing(true)}><Split className="size-4" aria-hidden="true" />Separate orders</Button>}
      {customer.separated && <AlertDialog open={undoOpen} onOpenChange={open => { setUndoOpen(open); setError(''); }}><AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="min-h-10" disabled={disabled}>Undo phone separation</Button></AlertDialogTrigger>
        <AlertDialogContent className="w-[calc(100%-2rem)] rounded-xl"><AlertDialogHeader><AlertDialogTitle>Group this phone again?</AlertDialogTitle><AlertDialogDescription>All loaded profiles with {customer.phone}, including orders kept separate after the split, will become one profile again. Future orders with this buyer phone will be grouped automatically. Original orders will not change.</AlertDialogDescription></AlertDialogHeader>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <AlertDialogFooter><AlertDialogCancel>Keep separate</AlertDialogCancel><Button onClick={() => { if (onChange(undoCustomerSeparation(customer, records, groups), customer.orders[0].id)) setUndoOpen(false); else setError('Could not save the change. Profiles are still separate. Check browser storage and try again.'); }}>Group by phone again</Button></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>}
    </div>}
    {(canSeparate || customer.separated) && <p className="text-xs text-muted-foreground">Prototype: separations are saved only in this browser for the current account and workspace.</p>}
  </section>;
}
