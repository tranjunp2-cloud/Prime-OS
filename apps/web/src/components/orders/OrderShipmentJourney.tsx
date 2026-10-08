import { useState } from 'react';
import { ChevronDown, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { ordersApi, type OrderRecord, type ShipmentTrackingEvent, type ShipmentTrackingStatus } from '@/lib/orders-api';
import { getShipmentHistory, prototypeTrackingOptions, shipmentTrackingLabels } from '@/lib/order-shipment-history';
import { cn } from '@/lib/utils';
import { CopyValue } from './CopyValue';

const date = (value: string) => new Date(value).toLocaleString('en-GB', {day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit'});
export function OrderShipmentJourney({order, onUpdated, disabled = false}: {order: OrderRecord; onUpdated: (order: OrderRecord) => void; disabled?: boolean}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function simulate(shipmentKey: string, status: ShipmentTrackingStatus) {
    if (pending || disabled || order.source !== 'demo') return;
    setPending(true); setError('');
    try { const result = await ordersApi.command(order, {action: 'carrier-update', shipmentKey, status}); onUpdated(result.data); }
    catch (cause) { setError((cause as Error).message); }
    finally { setPending(false); }
  }
  return <section aria-label="Shipment journey" className="overflow-hidden rounded-lg border bg-card">
    <div className="flex items-center gap-2 border-b px-3 py-2.5"><Truck className="size-4 text-muted-foreground" /><h2 className="text-sm font-semibold">Shipment journey</h2></div>
    <div className="space-y-4 p-3">
      {!order.shipments.length && <p className="text-xs leading-5 text-muted-foreground">Create a shipment to start tracking its journey.</p>}
      {order.shipments.map((shipment, index) => {
        const events = getShipmentHistory(shipment, order.source === 'demo');
        const options = prototypeTrackingOptions(order, shipment);
        const latest = events[0];
        const key = shipment.id || shipment.tracking || String(index);
        return <div key={key} role="group" aria-label={`Journey for ${shipment.tracking}`} className="space-y-3 border-b pb-3 last:border-0 last:pb-0">
          <div><p className="text-sm font-medium">{shipment.carrier}<span className="font-normal text-muted-foreground"> · {latest ? shipmentTrackingLabels[latest.status] : shipment.status}</span></p>
            <p className="flex flex-wrap items-center gap-1 break-all text-xs text-muted-foreground">{shipment.tracking}<CopyValue value={shipment.tracking} label="tracking number" /></p>
            {shipment.collectionMethod && <p className="mt-1 text-xs text-muted-foreground">{shipment.collectionMethod === 'pickup' ? 'Carrier pickup' : 'Drop-off'}{shipment.collectionAt && ` · ${date(shipment.collectionAt)}`}</p>}
            {shipment.labelUrl?.startsWith('https://') && <a className="inline-flex min-h-9 items-center text-xs font-medium text-primary underline underline-offset-4" href={shipment.labelUrl} target="_blank" rel="noopener noreferrer">Open carrier label</a>}
          </div>
          {order.source === 'demo' ? <p className="text-xs text-primary">Simulated tracking · No carrier connection</p> : !events.some(event => event.source === 'carrier') && <p className="text-xs leading-5 text-muted-foreground">No carrier tracking updates received.{events.length > 0 && ' Seller records are shown below.'}</p>}
          {events.length > 0 && <><TrackingEvents events={events.slice(0, 3)} label={`Latest tracking events for ${shipment.tracking}`} />
            {events.length > 3 && <details><summary className="cursor-pointer py-1 text-xs font-medium text-primary focus-visible:outline focus-visible:outline-primary">Show {events.length - 3} earlier events</summary><div className="mt-3"><TrackingEvents events={events.slice(3)} label={`Earlier tracking events for ${shipment.tracking}`} /></div></details>}
          </>}
          {options.length > 0 && <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="sm" disabled={pending || disabled}>{pending ? 'Updating…' : 'Simulate tracking update'}<ChevronDown className="size-3" /></Button></DropdownMenuTrigger><DropdownMenuContent align="start">{options.map(status => <DropdownMenuItem key={status} onSelect={() => void simulate(key, status)}>{shipmentTrackingLabels[status]}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>}
          {order.source === 'demo' && !options.length && !shipment.pickedUpAt && !['delivered', 'closed', 'canceled'].includes(order.canonicalStatus) && <p className="text-xs text-muted-foreground">{order.canonicalStatus === 'shipped' ? 'This sample has no pickup record. Restart prototype to try the full journey.' : 'Record carrier pickup above to simulate tracking updates.'}</p>}
        </div>;
      })}
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  </section>;
}

function TrackingEvents({events, label}: {events: ShipmentTrackingEvent[]; label: string}) {
  return <ol aria-label={label} className="space-y-3 border-l border-border pl-3">
    {events.map(event => <li key={event.id} className="relative text-xs">
      <span aria-hidden="true" className={cn('absolute -left-[17px] top-1 size-2 rounded-full', event.status === 'delivery_failed' ? 'bg-amber-500' : event.status === 'delivered' ? 'bg-emerald-500' : 'bg-muted-foreground')} />
      <p className="font-medium">{shipmentTrackingLabels[event.status]}</p>
      <p className="mt-0.5 text-muted-foreground"><time dateTime={event.occurredAt}>{date(event.occurredAt)}</time> · {event.source === 'carrier' ? 'Carrier update' : event.source === 'seller' ? 'Seller record' : 'Simulated'}</p>
      {event.location && <p className="mt-0.5 text-muted-foreground">{event.location}</p>}
      {event.description && <p className="mt-1 leading-5 text-muted-foreground">{event.description}</p>}
    </li>)}
  </ol>;
}
