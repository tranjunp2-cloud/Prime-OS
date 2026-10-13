import { useState } from 'react';
import { ChevronDown, Store, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { ordersApi, type OrderRecord, type ShipmentTrackingEvent, type ShipmentTrackingStatus } from '@/lib/orders-api';
import { getShipmentHistory, isStorePickup, isStorePickupOrder, prototypeTrackingOptions, shipmentReference, shipmentTrackingLabel, shipmentTrackingLabels } from '@/lib/order-shipment-history';
import { cn } from '@/lib/utils';
import { CopyValue } from './CopyValue';

const date = (value: string) => new Date(value).toLocaleString('en-GB', {day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'});
export function OrderShipmentJourney({order, onUpdated, disabled = false}: {order: OrderRecord; onUpdated: (order: OrderRecord) => void; disabled?: boolean}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<{orderId: string; index: number} | null>(null);
  const selectedShipment = history?.orderId === order.id ? order.shipments[history.index] : undefined;
  const fullHistory = selectedShipment ? getShipmentHistory(selectedShipment, order.source === 'demo') : [];
  const pickupOrder = isStorePickupOrder(order);
  const title = pickupOrder ? 'Pickup history' : 'Delivery history';
  const Icon = pickupOrder ? Store : Truck;
  const selectedReference = selectedShipment ? shipmentReference(order, selectedShipment) : null;
  async function simulate(shipmentKey: string, status: ShipmentTrackingStatus) {
    if (pending || disabled || order.source !== 'demo') return;
    setPending(true); setError('');
    try { const result = await ordersApi.command(order, {action: 'carrier-update', shipmentKey, status}); onUpdated(result.data); }
    catch (cause) { setError((cause as Error).message); }
    finally { setPending(false); }
  }
  return <section aria-label={title} className="overflow-hidden rounded-lg border bg-card">
    <div className="flex items-center gap-2 border-b px-3 py-2.5"><Icon className="size-4 text-muted-foreground" /><h2 className="text-sm font-semibold">{title}</h2></div>
    <div className="space-y-4 p-3">
      {!order.shipments.length && <p className="text-xs leading-5 text-muted-foreground">{pickupOrder ? 'Pickup updates will appear here when recorded.' : 'Create a shipment to start tracking its journey.'}</p>}
      {order.shipments.map((shipment, index) => {
        const events = getShipmentHistory(shipment, order.source === 'demo');
        const options = prototypeTrackingOptions(order, shipment);
        const latest = events[0];
        const storePickup = isStorePickup(shipment);
        const reference = shipmentReference(order, shipment);
        const key = shipment.id || shipment.tracking || String(index);
        return <div key={key} role="group" aria-label={`Journey for ${shipment.tracking}`} className="space-y-3 border-b pb-3 last:border-0 last:pb-0">
          <div><p className="text-sm font-medium">{shipment.carrier}<span className="font-normal text-muted-foreground"> · {latest ? shipmentTrackingLabel(latest.status, storePickup) : storePickup && shipment.status === 'Delivered' ? 'Collected by customer' : shipment.status}</span></p>
            {reference.value && <p className="flex flex-wrap items-center gap-1 break-all text-xs text-muted-foreground">{reference.label} · {reference.value}<CopyValue value={reference.value} label={reference.label.toLowerCase()} /></p>}
            {!storePickup && shipment.collectionMethod && <p className="mt-1 text-xs text-muted-foreground">{shipment.collectionMethod === 'pickup' ? 'Carrier pickup' : 'Drop-off'}{shipment.collectionAt && ` · ${date(shipment.collectionAt)}`}</p>}
            {!storePickup && shipment.labelUrl?.startsWith('https://') && <a className="inline-flex min-h-9 items-center text-xs font-medium text-primary underline underline-offset-4" href={shipment.labelUrl} target="_blank" rel="noopener noreferrer">Open carrier label</a>}
          </div>
          {events.length === 0 ? <p className="text-xs leading-5 text-muted-foreground">{storePickup ? 'No store pickup events have been recorded yet.' : 'No delivery events have been recorded yet.'}</p>
            : order.source !== 'demo' && !storePickup && !events.some(event => event.source === 'carrier') && <p className="text-xs leading-5 text-muted-foreground">No carrier tracking updates received. Seller records are shown below.</p>}
          {events.length > 0 && <><p className="text-xs text-muted-foreground">Latest updates · Newest first</p><TrackingEvents events={events.slice(0, 3)} storePickup={storePickup} compact label={`Latest tracking events for ${shipment.tracking}`} />
            <Button variant="link" size="sm" className="h-auto px-0 py-2" onClick={() => setHistory({orderId: order.id, index})}>View full history ({events.length})</Button>
          </>}
          {options.length > 0 && <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="sm" disabled={pending || disabled}>{pending ? 'Updating…' : 'Simulate tracking update'}<ChevronDown className="size-3" /></Button></DropdownMenuTrigger><DropdownMenuContent align="start">{options.map(status => <DropdownMenuItem key={status} onSelect={() => void simulate(key, status)}>{shipmentTrackingLabels[status]}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>}
          {order.source === 'demo' && !storePickup && !options.length && !shipment.pickedUpAt && !['delivered', 'closed', 'canceled'].includes(order.canonicalStatus) && <p className="text-xs text-muted-foreground">{order.canonicalStatus === 'shipped' ? 'This sample has no pickup record. Restart prototype to try the full journey.' : 'Record carrier pickup above to simulate tracking updates.'}</p>}
        </div>;
      })}
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
    <Sheet open={Boolean(selectedShipment)} onOpenChange={open => !open && setHistory(null)}>
      <SheetContent className="flex w-full flex-col sm:max-w-lg">
        {selectedShipment && <>
          <SheetHeader className="shrink-0 pr-5 text-left">
            <SheetTitle>{isStorePickup(selectedShipment) ? 'Pickup history' : 'Delivery history'}</SheetTitle>
            <SheetDescription>{order.orderKey} · {selectedShipment.carrier}{selectedReference?.label !== 'Order reference' && <span className="mt-1 block break-all">{selectedReference?.label} · {selectedReference?.value}</span>}</SheetDescription>
          </SheetHeader>
          <div className="flex items-center justify-between border-b pb-3 text-xs text-muted-foreground"><span>{fullHistory.length} events</span><span>Newest first</span></div>
          <div className="min-h-0 flex-1 overflow-y-auto py-2 pl-1"><TrackingEvents events={fullHistory} storePickup={isStorePickup(selectedShipment)} label={`Full history for ${selectedShipment.tracking}`} /></div>
        </>}
      </SheetContent>
    </Sheet>
  </section>;
}

function TrackingEvents({events, label, storePickup = false, compact = false}: {events: ShipmentTrackingEvent[]; label: string; storePickup?: boolean; compact?: boolean}) {
  return <ol aria-label={label} className="space-y-3 border-l border-border pl-3">
    {events.map(event => <li key={event.id} className="relative text-xs">
      <span aria-hidden="true" className={cn('absolute -left-[17px] top-1 size-2 rounded-full', event.status === 'delivery_failed' ? 'bg-amber-500' : ['delivered', 'collected'].includes(event.status) ? 'bg-emerald-500' : 'bg-muted-foreground')} />
      <p className="font-medium">{shipmentTrackingLabel(event.status, storePickup)}</p>
      <p className="mt-0.5 text-muted-foreground"><time dateTime={event.occurredAt}>{date(event.occurredAt)}</time>{(!compact || event.source !== 'prototype') && <> · {event.source === 'carrier' ? 'Carrier update' : event.source === 'seller' ? 'Seller record' : 'Sample event'}</>}</p>
      {event.location && <p className="mt-0.5 text-muted-foreground">{event.location}</p>}
      {!compact && event.description && <p className="mt-1 leading-5 text-muted-foreground">{event.description}</p>}
    </li>)}
  </ol>;
}
