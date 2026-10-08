import { useRef, useState } from 'react';
import { OrderPreparationDialog } from './OrderPreparationDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ordersApi, type OrderRecord } from '@/lib/orders-api';
import { workflowBlocker, workflowLabels, type ProcessingAction } from '@/lib/order-processing';

const descriptions: Record<ProcessingAction, string> = {
  'prepare-shipment': 'Review payment, shipping and packing in one place, then mark the parcel ready for pickup.',
  prepare: 'Choose where to prepare this order. Verify physical availability in your warehouse; this step does not reserve inventory.',
  'record-shipment': 'Arrange shipping with your carrier, then enter the tracking number and label they issued. Saving here does not book a pickup.',
  pack: 'Count or scan each SKU, check the parcel dimensions, and attach the carrier-issued label.',
  handover: 'Record pickup only after the carrier has accepted the parcel. The order will move to Shipping.',
  delivery: 'Use the carrier delivery record or customer receipt to confirm delivery. This does not record a payment.',
};
function Field({ label, children }: {label: string; children: React.ReactNode}) {return <label className="grid gap-1.5 text-sm font-medium">{label}{children}</label>;}
type ProcessingProps = {order: OrderRecord; action: ProcessingAction; onClose: () => void; onUpdated: (order: OrderRecord) => void};
export function OrderProcessingDialog(props: ProcessingProps) {
  return props.action === 'prepare-shipment' ? <OrderPreparationDialog {...props}/> : <ProcessingStepDialog {...props}/>;
}
function ProcessingStepDialog({order, action, onClose, onUpdated}: ProcessingProps) {
  const prototype = order.source === 'demo';
  const [warehouse, setWarehouse] = useState(order.metadata.warehouse === 'Unassigned' ? '' : order.metadata.warehouse);
  const [shipBy, setShipBy] = useState('');
  const [carrier, setCarrier] = useState(order.operations?.carrier || '');
  const [service, setService] = useState(order.operations?.service || 'Standard');
  const [tracking, setTracking] = useState('');
  const [labelUrl, setLabelUrl] = useState('');
  const [collectionMethod, setCollectionMethod] = useState('pickup');
  const [collectionAt, setCollectionAt] = useState('');
  const [parcel, setParcel] = useState(order.operations?.package || {weightKg:0,lengthCm:0,widthCm:0,heightCm:0});
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [scan, setScan] = useState('');
  const [scanFeedback, setScanFeedback] = useState('');
  const [attested, setAttested] = useState(false);
  const [reference, setReference] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  const request = useRef<{signature:string;id:string}|null>(null);
  const blocker = workflowBlocker(order, action);
  const allVerified = order.lines.every((line, i) => quantities[line.id || String(i)] === line.quantity);
  function useSampleValues() {
    setWarehouse(order.metadata.warehouse && order.metadata.warehouse !== 'Unassigned' ? order.metadata.warehouse : 'Demo warehouse');
    setCarrier(order.operations?.carrier || 'Demo carrier'); setService(order.operations?.service || 'Standard');
    setTracking(`DEMO-${order.orderKey}`); setLabelUrl('');
    setParcel(order.operations?.package || {weightKg: 1.2, lengthCm: 20, widthCm: 15, heightCm: 10});
    setQuantities(Object.fromEntries(order.lines.map((line, i) => [line.id || String(i), line.quantity])));
    setAttested(true); setReference(`DEMO-${action.toUpperCase()}-${order.orderKey}`);
  }
  function scanSku() {
    const matches = order.lines.map((line, index) => ({line,index})).filter(({line}) => line.sku.toLowerCase() === scan.trim().toLowerCase());
    if (matches.length !== 1) {setScanFeedback(matches.length ? 'This SKU appears on multiple lines. Verify each line manually.' : 'SKU not found in this order.');return;}
    const {line,index} = matches[0]; const key=line.id || String(index); const count=quantities[key] || 0;
    if (count >= line.quantity) {setScanFeedback(`${line.sku}: all units are already verified.`);return;}
    setQuantities(current => ({...current,[key]:count+1})); setScanFeedback(`${line.sku}: ${count+1} of ${line.quantity} verified.`);setScan('');
  }
  async function reload() {
    if (inFlight.current) return;
    inFlight.current = true; setPending(true);
    try {
      const response = await ordersApi.list();
      const latest = response.data.find(item => item.id === order.id);
      if (!latest) throw new Error('Order no longer exists.');
      onUpdated(latest); onClose();
    } catch (cause) { setError((cause as Error).message); }
    finally { inFlight.current = false; setPending(false); }
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (inFlight.current || blocker) return;
    const payload: Record<string, unknown> = {action};
    if (action === 'prepare') Object.assign(payload,{warehouse,shipBy:shipBy ? new Date(shipBy).toISOString() : undefined});
    if (action === 'record-shipment') Object.assign(payload,{carrier,service,tracking,labelUrl,collectionMethod,collectionAt:collectionAt ? new Date(collectionAt).toISOString() : undefined});
    if (action === 'pack') Object.assign(payload,{package:parcel,labelAttached:attested,items:order.lines.map((line,i)=>({lineId:line.id || String(i),quantity:quantities[line.id || String(i)] || 0}))});
    if (action === 'handover' || action === 'delivery') Object.assign(payload,{reference,carrierAccepted:attested});
    const signature=JSON.stringify(payload);
    if (request.current?.signature !== signature) request.current={signature,id:crypto.randomUUID()};
    inFlight.current=true;setPending(true);setError('');
    try { const response=await ordersApi.command(order,{...payload,requestId:request.current.id});onUpdated(response.data);onClose(); }
    catch (cause) {setError((cause as Error).message);}
    finally {inFlight.current=false;setPending(false);}
  }
  return <Dialog open onOpenChange={open=>!open&&!pending&&onClose()}><DialogContent className="flex max-h-[90dvh] flex-col overflow-clip sm:max-w-2xl"><DialogHeader className="shrink-0"><DialogTitle>{workflowLabels[action]}</DialogTitle><DialogDescription>{descriptions[action]}</DialogDescription></DialogHeader>
    <form onSubmit={save} className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">{prototype && <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-md bg-primary/5 p-3"><p className="text-xs text-muted-foreground">Prototype · Use sample values to try this step.</p><Button type="button" size="sm" variant="outline" disabled={pending} onClick={useSampleValues}>Use sample values</Button></div>}<p className="shrink-0 text-sm font-medium">{order.orderKey} · {order.buyerSnapshot.name}</p>
      <div className="min-h-0 flex-1 overflow-y-auto px-0.5"><fieldset disabled={pending} className="min-w-0 space-y-4">
        {action==='prepare' && <><Field label="Dispatch warehouse"><Input autoFocus required value={warehouse} onChange={event=>setWarehouse(event.target.value)} /></Field><Field label="Ship-by deadline (optional)"><Input type="datetime-local" value={shipBy} onChange={event=>setShipBy(event.target.value)} /></Field><p className="text-sm text-muted-foreground">{order.lines.reduce((sum,line)=>sum+line.quantity,0)} units to prepare · {order.payment.method} · {order.payment.state}</p></>}
        {action==='record-shipment' && <><div className="grid gap-4 sm:grid-cols-2"><Field label="Carrier"><Input required autoFocus={action==='record-shipment'} value={carrier} onChange={e=>setCarrier(e.target.value)} /></Field><Field label="Service"><Input required value={service} onChange={e=>setService(e.target.value)} /></Field></div><Field label="Carrier-issued tracking number"><Input required value={tracking} onChange={e=>setTracking(e.target.value)} /></Field><Field label="Carrier label link (optional)"><Input type="url" placeholder="https://…" value={labelUrl} onChange={e=>setLabelUrl(e.target.value)} /></Field><p className="text-xs text-muted-foreground">Use the original label from your carrier. You can attach a label printed outside Prime.</p><div className="grid gap-4 sm:grid-cols-2"><Field label="Collection method"><select className="h-10 rounded-md border bg-background px-3" value={collectionMethod} onChange={e=>setCollectionMethod(e.target.value)}><option value="pickup">Carrier pickup</option><option value="dropoff">Drop off at carrier</option></select></Field><Field label="Arranged collection time (optional)"><Input type="datetime-local" value={collectionAt} onChange={e=>setCollectionAt(e.target.value)} /></Field></div></>}
        {action==='pack' && <><div className="rounded-lg border p-3"><Field label="Scan or enter SKU"><div className="flex gap-2"><Input autoFocus={action==='pack'} value={scan} onChange={e=>setScan(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();scanSku();}}}/><Button type="button" variant="outline" onClick={scanSku}>Verify unit</Button></div></Field>{scanFeedback && <p role="status" className="mt-2 text-sm">{scanFeedback}</p>}<div className="mt-3 space-y-3">{order.lines.map((line,i)=><label key={line.id||i} className="flex items-center justify-between gap-3 text-sm"><span className="min-w-0"><span className="block font-medium">{line.name}</span><span className="text-xs text-muted-foreground">{line.sku} · Required {line.quantity}</span></span><Input className="w-24 shrink-0" aria-label={`Verified quantity for ${line.sku}, line ${i+1}`} required type="number" min={0} max={line.quantity} step={1} value={quantities[line.id||String(i)]||0} onChange={e=>setQuantities(current=>({...current,[line.id||String(i)]:Number(e.target.value)}))}/></label>)}</div></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{(['weightKg','lengthCm','widthCm','heightCm'] as const).map(key=><Field key={key} label={{weightKg:'Weight (kg)',lengthCm:'Length (cm)',widthCm:'Width (cm)',heightCm:'Height (cm)'}[key]}><Input required type="number" min={0.01} max={key==='weightKg'?1000:500} step="any" value={parcel[key]||''} onChange={e=>setParcel(current=>({...current,[key]:Number(e.target.value)}))}/></Field>)}</div><label className="flex items-start gap-2 text-sm"><Checkbox checked={attested} onCheckedChange={value=>setAttested(value===true)}/>I checked the contents and attached the carrier shipping label.</label>{!allVerified && <p className="text-xs text-muted-foreground">Verify all units before finishing packing.</p>}</>}
        {(action==='handover'||action==='delivery') && <><p className="rounded-lg border p-3 text-sm">{order.shipments[0]?.carrier} · {order.shipments[0]?.tracking}</p><Field label={action==='handover'?'Carrier pickup evidence / Reference':'Delivery evidence / Reference'}><Input required autoFocus value={reference} onChange={e=>setReference(e.target.value)} placeholder="Receipt number or evidence reference"/></Field><p className="text-xs text-muted-foreground">This event will be recorded as a seller update, with your account and the current time.</p>{action==='handover'&&<label className="flex items-start gap-2 text-sm"><Checkbox checked={attested} onCheckedChange={value=>setAttested(value===true)}/>The carrier has accepted this parcel.</label>}</>}
      </fieldset></div>
      {(error||blocker)&&<p role="alert" className="text-sm text-destructive">{error||blocker}</p>}
      {error && <Button type="button" variant="link" className="h-auto justify-start p-0" disabled={pending} onClick={() => void reload()}>Reload latest order</Button>}
      <div className="flex shrink-0 justify-end gap-2 border-t pt-3"><Button type="button" variant="outline" disabled={pending} onClick={onClose}>Cancel</Button><Button disabled={pending||Boolean(blocker)||(action==='pack'&&(!allVerified||!attested))||(action==='handover'&&!attested)}>{pending?'Saving…':action==='pack'?'Finish packing':workflowLabels[action]}</Button></div>
    </form></DialogContent></Dialog>;
}
