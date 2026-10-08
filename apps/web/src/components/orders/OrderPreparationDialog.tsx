import { useRef, useState } from 'react';
import { Check, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ordersApi, type OrderRecord } from '@/lib/orders-api';
import { paymentAllowsPreparation, workflowBlocker } from '@/lib/order-processing';
import { preparationPackageError, preparationPaymentKind } from '@/lib/order-preparation';

type Props = { order: OrderRecord; onClose: () => void; onUpdated: (order: OrderRecord) => void };
const emptyParcel = {weightKg: 0, lengthCm: 0, widthCm: 0, heightCm: 0};
const parcelLabels = {weightKg: 'Weight (kg)', lengthCm: 'Length (cm)', widthCm: 'Width (cm)', heightCm: 'Height (cm)'};
function localDate(value?: string) {
  const date = new Date(value || '');
  return Number.isFinite(date.getTime()) ? new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';
}
function Field({label, children}: {label: string; children: React.ReactNode}) {
  return <label className="grid gap-1.5 text-sm font-medium">{label}{children}</label>;
}
function Summary({label, children, action}: {label: string; children: React.ReactNode; action?: React.ReactNode}) {
  return <div className="flex items-start justify-between gap-3 py-2"><div className="min-w-0"><p className="text-xs text-muted-foreground">{label}</p><div className="mt-1 break-words text-sm font-medium">{children}</div></div>{action}</div>;
}

/** One local prototype submission; existing shipments and source-owned data remain intact. */
export function OrderPreparationDialog({order, onClose, onUpdated}: Props) {
  const shipment = order.shipments[0];
  const platform = order.metadata.shippingMode === 'platform';
  const needsPayment = !paymentAllowsPreparation(order);
  const gateway = preparationPaymentKind(order) === 'gateway';
  const prepared = Boolean(order.operations?.work?.preparedAt);
  const [paymentSynced, setPaymentSynced] = useState(false);
  const [paymentReceived, setPaymentReceived] = useState(false);
  const [paymentReference, setPaymentReference] = useState(order.payment.reference || '');
  const [paymentOpen, setPaymentOpen] = useState(needsPayment && !gateway);
  const [warehouse, setWarehouse] = useState(order.metadata.warehouse === 'Unassigned' ? '' : order.metadata.warehouse);
  const [warehouseOpen, setWarehouseOpen] = useState(!warehouse);
  const [shipBy, setShipBy] = useState(localDate(order.operations?.shipBy));
  const [carrier, setCarrier] = useState(shipment?.carrier || order.operations?.carrier || '');
  const [service, setService] = useState(shipment?.service || order.operations?.service || 'Standard');
  const [tracking, setTracking] = useState(shipment?.tracking || '');
  const [trackingOpen, setTrackingOpen] = useState(!tracking);
  const [collectionMethod, setCollectionMethod] = useState(shipment?.collectionMethod || 'pickup');
  const [shippingOpen, setShippingOpen] = useState(!shipment && !platform && (!carrier || !service));
  const [parcel, setParcel] = useState(order.operations?.package || emptyParcel);
  const [parcelOpen, setParcelOpen] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [scan, setScan] = useState('');
  const [scanFeedback, setScanFeedback] = useState('');
  const [labelAttached, setLabelAttached] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  const request = useRef<{signature: string; id: string} | null>(null);
  const blocker = workflowBlocker(order, 'prepare-shipment');
  const allVerified = order.lines.every((line, index) => quantities[line.id || String(index)] === line.quantity);
  const totalUnits = order.lines.reduce((sum, line) => sum + line.quantity, 0);
  const verifiedUnits = order.lines.reduce((sum, line, index) => sum + Math.min(line.quantity, quantities[line.id || String(index)] || 0), 0);
  const hasParcel = Object.values(parcel).some(value => value !== 0);
  const parcelError = preparationPackageError(hasParcel ? parcel : undefined);
  const paymentReady = !needsPayment || (gateway ? paymentSynced : paymentReceived && Boolean(paymentReference.trim()));
  const shippingReady = Boolean(shipment?.tracking) || (!shipment && (platform || Boolean(carrier.trim() && service.trim() && tracking.trim())));
  const remaining = blocker || (!paymentReady ? gateway ? 'Update the payment status to continue.' : 'Confirm the payment received to continue.'
    : !warehouse.trim() ? 'Choose a dispatch warehouse.' : !shippingReady ? 'Add the missing shipping details.'
    : parcelError ? 'Complete the parcel measurements or leave them empty.' : !allVerified ? `Verify all ${totalUnits} units to continue.`
    : !labelAttached ? 'Confirm the parcel is packed and the label is attached.' : null);

  function useSampleValues() {
    if (!warehouse) setWarehouse('Demo warehouse');
    if (!carrier) setCarrier('Demo carrier');
    if (!service) setService('Standard');
    if (!tracking) setTracking(`DEMO-${order.orderKey}`);
    setPaymentSynced(true); setPaymentReceived(true);
    if (!paymentReference) setPaymentReference(`DEMO-PAYMENT-${order.orderKey}`);
    setQuantities(Object.fromEntries(order.lines.map((line, index) => [line.id || String(index), line.quantity])));
    setLabelAttached(true);
    setWarehouseOpen(false); setShippingOpen(false); setTrackingOpen(false); setPaymentOpen(false);
  }
  function verifySku() {
    const matches = order.lines.map((line, index) => ({line, index})).filter(({line}) => line.sku.toLowerCase() === scan.trim().toLowerCase());
    if (matches.length !== 1) { setScanFeedback(matches.length ? 'Verify duplicate SKU lines separately.' : 'SKU not found in this order.'); return; }
    const {line, index} = matches[0]; const key = line.id || String(index); const count = quantities[key] || 0;
    if (count >= line.quantity) { setScanFeedback(`${line.sku}: all units are already verified.`); return; }
    setQuantities(current => ({...current, [key]: count + 1})); setScan('');
    setScanFeedback(`${line.sku}: ${count + 1} of ${line.quantity} verified.`);
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (inFlight.current || remaining) return;
    const payload = {
      action: 'prepare-shipment', warehouse, carrier, service, tracking, collectionMethod,
      shipBy: !platform && shipBy ? new Date(shipBy).toISOString() : undefined,
      package: hasParcel ? parcel : undefined, labelAttached,
      ...(needsPayment && gateway ? {paymentUpdate: paymentSynced ? 'gateway-paid' : undefined}
        : needsPayment ? {paymentReceived, paymentReference} : {}),
      items: order.lines.map((line, index) => ({lineId: line.id || String(index), quantity: quantities[line.id || String(index)] || 0})),
    };
    const signature = JSON.stringify(payload);
    if (request.current?.signature !== signature) request.current = {signature, id: crypto.randomUUID()};
    inFlight.current = true; setPending(true); setError('');
    try { const response = await ordersApi.command(order, {...payload, requestId: request.current.id}); onUpdated(response.data); onClose(); }
    catch (cause) { setError((cause as Error).message); }
    finally { inFlight.current = false; setPending(false); }
  }
  async function reload() {
    if (inFlight.current) return;
    inFlight.current = true; setPending(true);
    try {
      const response = await ordersApi.list(); const latest = response.data.find(item => item.id === order.id);
      if (!latest) throw new Error('Order no longer exists.');
      onUpdated(latest); onClose();
    } catch (cause) { setError((cause as Error).message); }
    finally { inFlight.current = false; setPending(false); }
  }
  const editButton = (label: string, open: boolean, toggle: () => void) => <Button type="button" size="sm" variant="ghost" className="shrink-0" aria-label={label} aria-expanded={open} disabled={pending} onClick={toggle}>{open ? 'Done' : 'Edit'}</Button>;

  return <Dialog open onOpenChange={open => !open && !pending && onClose()}>
    <DialogContent className="flex max-h-[90dvh] flex-col overflow-clip p-4 sm:max-w-2xl sm:p-6">
      <DialogHeader className="shrink-0 pr-5"><DialogTitle>Prepare shipment</DialogTitle><DialogDescription>Check the items and packing. Shipping details are filled in where available.</DialogDescription></DialogHeader>
      <form onSubmit={save} className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span>{order.orderKey} · Prototype</span><Button type="button" size="sm" variant="outline" disabled={pending} onClick={useSampleValues}>Use sample values</Button></div>
        <div className="min-h-0 flex-1 overflow-y-auto px-0.5"><fieldset disabled={pending} className="min-w-0 space-y-3">
          <section aria-label="Order preparation details" className="divide-y rounded-lg border px-3">
            <div><Summary label="Payment" action={needsPayment && gateway && !paymentSynced
              ? <Button type="button" variant="outline" size="sm" className="h-auto max-w-40 shrink-0 whitespace-normal py-2 sm:max-w-none" onClick={() => setPaymentSynced(true)}>Simulate payment update</Button>
              : needsPayment && !gateway ? editButton('Edit payment confirmation', paymentOpen, () => setPaymentOpen(!paymentOpen)) : undefined}>
              {order.payment.method} · {needsPayment && paymentReady ? 'Paid (simulated)' : order.payment.state}
              {!needsPayment && order.payment.method === 'COD' && order.payment.state !== 'Paid' && <span className="mt-0.5 block text-xs font-normal text-muted-foreground">Collect on delivery</span>}
              {needsPayment && gateway && !paymentSynced && <span className="mt-0.5 block text-xs font-normal text-muted-foreground">Awaiting payment gateway update</span>}
            </Summary>{paymentOpen && needsPayment && !gateway && <div className="space-y-3 pb-3"><Field label="Payment reference / Evidence"><Input required value={paymentReference} onChange={event => setPaymentReference(event.target.value)}/></Field><label className="flex items-start gap-2 text-sm"><Checkbox checked={paymentReceived} onCheckedChange={value => setPaymentReceived(value === true)}/>Payment has been received (simulated).</label></div>}</div>
            <div><Summary label="Dispatch warehouse" action={!prepared && editButton('Edit dispatch warehouse', warehouseOpen, () => setWarehouseOpen(!warehouseOpen))}>{warehouse || 'Choose a warehouse'}{shipBy && <span className="mt-0.5 block text-xs font-normal text-muted-foreground">Ship by {new Date(shipBy).toLocaleString('en-GB', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'})}{platform ? ' · From platform' : ''}</span>}</Summary>
              {warehouseOpen && !prepared && <div className="grid gap-3 pb-3 sm:grid-cols-2"><Field label="Dispatch warehouse"><Input required value={warehouse} onChange={event => setWarehouse(event.target.value)}/></Field>{!platform && <Field label="Ship-by deadline (optional)"><Input type="datetime-local" value={shipBy} onChange={event => setShipBy(event.target.value)}/></Field>}</div>}
            </div>
            <div><Summary label="Shipping" action={!shipment && !platform && editButton('Edit shipping details', shippingOpen, () => setShippingOpen(!shippingOpen))}>
              {shipment ? `${shipment.carrier}${shipment.service ? ` · ${shipment.service}` : ''}` : platform ? 'Platform shipping' : [carrier || 'Choose a carrier', service, collectionMethod === 'pickup' ? 'Carrier pickup' : 'Drop off'].filter(Boolean).join(' · ')}
              {(shipment || tracking && !platform && !trackingOpen && !shippingOpen) && <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{shipment ? 'Shipment assigned · ' : 'Tracking · '}{shipment?.tracking || tracking}</span>}
              {platform && !shipment && <span className="mt-0.5 block text-xs font-normal text-muted-foreground">Carrier and tracking are assigned by the simulated platform update.</span>}
            </Summary>
              {shippingOpen && !shipment && !platform && <div className="grid gap-3 pb-3 sm:grid-cols-2"><Field label="Carrier"><Input required value={carrier} onChange={event => setCarrier(event.target.value)}/></Field><Field label="Service"><Input required value={service} onChange={event => setService(event.target.value)}/></Field><Field label="Collection method"><select className="h-10 rounded-md border bg-background px-3" value={collectionMethod} onChange={event => setCollectionMethod(event.target.value as 'pickup' | 'dropoff')}><option value="pickup">Carrier pickup</option><option value="dropoff">Drop off at carrier</option></select></Field></div>}
              {!shipment && !platform && (trackingOpen || shippingOpen) && <div className="pb-3"><Field label="Carrier-issued tracking number"><Input required value={tracking} onChange={event => setTracking(event.target.value)}/></Field><p className="mt-1.5 text-xs text-muted-foreground">Enter the number issued by your carrier.</p></div>}
            </div>
          </section>
          <section aria-label="Verify order items" className="space-y-3">
            <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">Verify items</h3><span className="text-xs text-muted-foreground" aria-live="polite">{verifiedUnits} / {totalUnits} units</span></div>
            <div className="divide-y rounded-lg border px-3">{order.lines.map((line, index) => <label key={line.id || index} className="flex items-center gap-3 py-2 text-sm">{line.imageUrl ? <img src={line.imageUrl} alt="" className="size-10 shrink-0 rounded border object-cover"/> : <Package aria-hidden="true" className="size-5 shrink-0 text-muted-foreground"/>}<span className="min-w-0 flex-1"><span className="block font-medium">{line.name}</span><span className="text-xs text-muted-foreground">{line.sku} · Qty {line.quantity}</span></span><Input className="w-20 shrink-0" aria-label={`Verified quantity for ${line.sku}, line ${index + 1}`} required type="number" min={0} max={line.quantity} step={1} value={quantities[line.id || String(index)] || 0} onChange={event => setQuantities(current => ({...current, [line.id || String(index)]: Number(event.target.value)}))}/></label>)}</div>
            <details><summary className="cursor-pointer text-xs text-muted-foreground">Scan SKU instead</summary><div className="mt-2"><Field label="Scan or enter SKU"><div className="flex gap-2"><Input value={scan} onChange={event => setScan(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); verifySku(); } }}/><Button type="button" variant="outline" onClick={verifySku}>Verify unit</Button></div></Field>{scanFeedback && <p role="status" className="mt-2 text-xs">{scanFeedback}</p>}</div></details>
          </section>
          <section aria-label="Parcel measurements" className="rounded-lg border px-3"><Summary label="Parcel measurements" action={editButton('Edit parcel measurements', parcelOpen, () => setParcelOpen(!parcelOpen))}>{hasParcel && !parcelError ? `${parcel.weightKg} kg · ${parcel.lengthCm} × ${parcel.widthCm} × ${parcel.heightCm} cm` : 'Optional for this prototype'}</Summary>
            {parcelOpen && <div className="space-y-2 pb-3"><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{(Object.keys(parcelLabels) as (keyof typeof parcelLabels)[]).map(key => <Field key={key} label={parcelLabels[key]}><Input type="number" min={0.01} max={key === 'weightKg' ? 1000 : 500} step="any" value={parcel[key] || ''} onChange={event => setParcel(current => ({...current, [key]: Number(event.target.value)}))}/></Field>)}</div><p className="text-xs text-muted-foreground">Use the measured parcel size. Leave all fields empty if it is not available.</p></div>}
            {parcelError && <p role="alert" className="pb-3 text-xs text-destructive">{parcelError}</p>}
          </section>
          <label className="flex items-start gap-2 rounded-md bg-muted/40 p-3 text-sm"><Checkbox checked={labelAttached} onCheckedChange={value => setLabelAttached(value === true)}/>Parcel packed and shipping label attached.</label>
        </fieldset></div>
        <div className="shrink-0 space-y-2 border-t pt-3">
          {error ? <div role="alert" className="text-sm text-destructive">{error}<Button type="button" variant="link" className="ml-2 h-auto p-0" disabled={pending} onClick={() => void reload()}>Reload latest order</Button></div> : <p aria-live="polite" className="flex items-center gap-1.5 text-xs text-muted-foreground">{!remaining && <Check className="size-3.5" aria-hidden="true"/>}{remaining || 'All checks complete. Ready to ship.'}</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={pending} onClick={onClose}>Cancel</Button><Button disabled={pending || Boolean(remaining)}>{pending ? 'Saving…' : 'Mark ready to ship'}</Button></div>
        </div>
      </form>
    </DialogContent>
  </Dialog>;
}
