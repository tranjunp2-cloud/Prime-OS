import { Info, Store, Truck } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { isStorePickupOrder } from '@/lib/order-shipment-history';
import { orderStockStatusLabel, type OrderRecord } from '@/lib/orders-api';
import { HandlingTypeBadge } from './HandlingTypeBadge';
import type { ReactNode } from 'react';

export function OrderShippingDetails({order}: {order: OrderRecord}) {
  const pickup = isStorePickupOrder(order);
  const parcel = order.operations?.package;
  const carrier = order.shipments[0]?.carrier || order.operations?.carrier;
  const service = order.shipments[0]?.service || order.operations?.service;
  const printing = order.operations?.printStatus;
  const showPacking = ['acknowledged', 'allocated', 'fulfillment_in_progress'].includes(order.canonicalStatus);
  const title = pickup ? 'Store pickup' : 'Shipping & packaging';
  const Icon = pickup ? Store : Truck;
  return <section aria-label={title} className="min-w-0 overflow-hidden rounded-lg border bg-card">
    <h2 className="flex min-h-10 items-center gap-2 border-b px-3 text-sm font-semibold"><Icon className="size-4 text-muted-foreground" />{title}</h2>
    <div className="p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2"><HandlingTypeBadge order={order} />{!pickup && order.metadata.shippingMode && <span className="text-xs text-muted-foreground">{order.metadata.shippingMode === 'platform' ? 'Platform shipping' : 'Seller shipping'}</span>}</div>
      {pickup
        ? <Fact label="Pickup location">{order.metadata.warehouse || 'Not assigned'}</Fact>
        : <>
          <Fact label="Carrier">{carrier || 'Not assigned'}{service && <span className="text-muted-foreground"> · {service}</span>}</Fact>
          {parcel && <Fact label="Parcel"><span className="block">{parcel.weightKg} kg</span><span className="block text-xs text-muted-foreground">{parcel.lengthCm} × {parcel.widthCm} × {parcel.heightCm} cm</span></Fact>}
          {showPacking && !parcel && <p className="py-1 text-xs text-muted-foreground">Add parcel measurements when packing.</p>}
        </>}
      <Fact label={<span className="inline-flex items-center gap-1">Stock status<InfoHint label="About stock status">Stock can be reserved while an order awaits confirmation. Reserving reduces stock available to other orders; on-hand stock is deducted at dispatch. Missing reservation data does not mean no stock is held.</InfoHint></span>}>
        {orderStockStatusLabel(order)}
      </Fact>
      <div className="relative mt-2 border-t pt-2">
        <details>
          <summary className="min-h-8 cursor-pointer content-center pr-9 text-xs font-medium focus-visible:outline focus-visible:outline-primary">Documents</summary>
          <div className="mt-1 space-y-1">
            <Fact label={<span className="inline-flex items-center gap-1">Pick list<InfoHint label="About pick lists">A list of products and quantities for staff to pick from stock.</InfoHint></span>}><PrintStatus value={printing?.pickList} /></Fact>
            {!pickup && <Fact label={<span className="inline-flex items-center gap-1">Shipping label<InfoHint label="About shipping labels">The carrier's label with the tracking code, attached to the parcel.</InfoHint></span>}><PrintStatus value={printing?.shippingLabel} />{order.operations?.work?.labelAttachedAt && <span className="block text-xs text-emerald-700 dark:text-emerald-400">Attached to parcel</span>}</Fact>}
            <Fact label={<span className="inline-flex items-center gap-1">Packing slip<InfoHint label="About packing slips">The order contents included with the items for the customer. Printing is optional.</InfoHint></span>}><PrintStatus value={printing?.packingSlip} /></Fact>
          </div>
        </details>
        <span className="absolute right-0 top-2"><InfoHint label="About document status">These are recorded print statuses. Opening the print dialog does not confirm that a document was printed.</InfoHint></span>
      </div>
    </div>
  </section>;
}

function Fact({label, children}: {label: ReactNode; children: ReactNode}) {
  return <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] items-start gap-3 py-1.5 text-sm"><span className="text-muted-foreground">{label}</span><span className="break-words text-right">{children}</span></div>;
}

function PrintStatus({value}: {value?: string}) {
  const [status, ...details] = (value || 'Not recorded').split(' · ');
  return <><span>{status}</span>{details.length > 0 && <span className="block text-xs text-muted-foreground">{details.join(' · ')}</span>}</>;
}

function InfoHint({label, children}: {label: string; children: ReactNode}) {
  return <Popover><PopoverTrigger asChild><button type="button" aria-label={label} className="inline-flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline focus-visible:outline-primary"><Info className="size-3.5" /></button></PopoverTrigger><PopoverContent side="top" className="max-w-[calc(100vw-2rem)] text-xs leading-5">{children}</PopoverContent></Popover>;
}
