import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ordersApi, type OrderRecord } from '@/lib/orders-api';
import { workflowBlocker } from '@/lib/order-processing';

export type BatchAction = 'confirm' | 'prepare' | 'handover';
const labels = {confirm:'Confirm orders',prepare:'Prepare orders',handover:'Record carrier pickups'};
type Result = {id:string;orderKey:string;success:boolean;message:string};
function batchBlocker(order: OrderRecord, action: BatchAction, warehouse = '') {
  if(action==='confirm') return order.source !== 'manual' ? 'Only manual orders can be confirmed here.' : order.hold?.active ? 'Release the hold first.' : order.canonicalStatus !== 'created' ? 'Not awaiting confirmation.' : null;
  const blocker=workflowBlocker(order,action);
  if(blocker) return blocker;
  if(action==='prepare' && !(warehouse.trim() || (order.metadata.warehouse !== 'Unassigned' && order.metadata.warehouse.trim()))) return 'Choose a dispatch warehouse.';
  return null;
}
export function OrderBatchDialog({orders, onClose, onUpdated}: {orders: OrderRecord[]; onClose:()=>void; onUpdated:(order:OrderRecord)=>void}) {
  const [action,setAction]=useState<BatchAction>(orders.some(order=>order.canonicalStatus==='created')?'confirm':orders.some(order=>order.readyForPickup)?'handover':'prepare');
  const [warehouse,setWarehouse]=useState('');
  const carriers = [...new Set(orders.map(order => order.shipments[0]?.carrier).filter(Boolean))];
  const [carrier,setCarrier]=useState(carriers.length === 1 ? carriers[0] : '');
  const [reference,setReference]=useState('');
  const [accepted,setAccepted]=useState(false);
  const [pending,setPending]=useState(false);
  const [progress,setProgress]=useState(0);
  const [results,setResults]=useState<Result[]>([]);
  const [error,setError]=useState('');
  const locked=useRef(false);
  const requests=useRef(new Map<string,{signature:string;id:string}>());
  const candidates=orders.map(order=>({order,reason:batchBlocker(order,action,warehouse) || (action === 'handover' && order.shipments[0]?.carrier !== carrier ? 'Choose this carrier in a separate pickup batch.' : null)}));
  const eligible=candidates.filter(item=>!item.reason);
  const failures=results.filter(result=>!result.success);
  async function process(retry=false) {
    if(locked.current) return;
    locked.current=true;setPending(true);setError('');setProgress(0);
    try {
      const ids=retry?failures.map(result=>result.id):eligible.map(item=>item.order.id);
      // Re-read before mutating: a hold/payment/status may have changed since selection.
      const fresh=await ordersApi.list();
      if(!fresh.canWrite) throw new Error('Order write access is no longer available.');
      const output:Result[]=retry?results.filter(result=>result.success):[];
      for(const [index,id] of ids.entries()) {
        const order=fresh.data.find(item=>item.id===id);
        const original=orders.find(item=>item.id===id)!;
        const body:Record<string,unknown>=action==='confirm'?{action:'transition',toStatus:'acknowledged'}:action==='prepare'?{action,warehouse:warehouse.trim()||order?.metadata.warehouse}:{action,reference,carrierAccepted:accepted};
        const signature=JSON.stringify(body); const previous=requests.current.get(id);
        const receipt=previous?.signature===signature?previous:{signature,id:crypto.randomUUID()}; requests.current.set(id,receipt);
        try {
          if(!order) throw new Error('Order no longer exists.');
          if(action === 'handover' && order.shipments[0]?.carrier !== carrier) throw new Error('Carrier changed. Review this order in a separate pickup batch.');
          // A retry can replay an uncertain successful request safely through its receipt.
          const blocker=batchBlocker(order,action,warehouse);
          if(blocker && !(retry && previous?.signature===signature)) throw new Error(blocker);
          const updated=await ordersApi.command(order,{...body,requestId:receipt.id});onUpdated(updated.data);
          output.push({id,orderKey:original.orderKey,success:true,message:'Updated'});
        } catch(cause) {output.push({id,orderKey:original.orderKey,success:false,message:(cause as Error).message});}
        setProgress(index+1);setResults([...output]);
      }
    } catch(cause) {setError((cause as Error).message);}
    finally {locked.current=false;setPending(false);}
  }
  return <Dialog open onOpenChange={open=>!open&&!pending&&onClose()}><DialogContent className="flex max-h-[90dvh] flex-col sm:max-w-2xl"><DialogHeader><DialogTitle>Process selected orders</DialogTitle><DialogDescription>Review eligibility before processing. Orders with issues stay unchanged; failed requests can be retried separately.</DialogDescription></DialogHeader>
    <div className="min-h-0 space-y-4 overflow-y-auto">
      <label className="grid gap-1.5 text-sm font-medium">Action<select className="h-10 rounded-md border bg-background px-3" disabled={pending||results.length>0} value={action} onChange={e=>setAction(e.target.value as BatchAction)}>{Object.entries(labels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
      {action==='prepare'&&<label className="grid gap-1.5 text-sm font-medium">Dispatch warehouse override (optional)<Input disabled={pending||results.length>0} placeholder="Use each order's assigned warehouse" value={warehouse} onChange={e=>setWarehouse(e.target.value)}/><span className="text-xs font-normal text-muted-foreground">Preparation does not reserve inventory. Verify physical stock before packing.</span></label>}
      {action==='handover'&&<><label className="grid gap-1.5 text-sm font-medium">Pickup carrier<select className="h-10 rounded-md border bg-background px-3" disabled={pending||results.length>0} value={carrier} onChange={e=>{setCarrier(e.target.value);setAccepted(false);}}><option value="">Choose one carrier</option>{carriers.map(name=><option key={name} value={name}>{name}</option>)}</select></label><label className="grid gap-1.5 text-sm font-medium">Carrier pickup evidence / Reference<Input required disabled={pending||results.length>0} value={reference} onChange={e=>setReference(e.target.value)}/></label><label className="flex gap-2 text-sm"><Checkbox disabled={pending||results.length>0} checked={accepted} onCheckedChange={checked=>setAccepted(checked===true)}/>The carrier has accepted every eligible parcel in this selection.</label></>}
      {!results.length&&<><p className="text-sm font-semibold">{eligible.length} eligible · {orders.length-eligible.length} need attention</p><ul className="divide-y rounded-md border px-3">{candidates.map(({order,reason})=><li key={order.id} className="py-2 text-sm"><span className="font-medium">{order.orderKey}</span><p className={reason?'text-amber-700 dark:text-amber-300':'text-muted-foreground'}>{reason||'Ready to process'}</p></li>)}</ul></>}
      {!!results.length&&<div aria-label="Batch results"><p role="status" className="text-sm font-semibold">{results.filter(item=>item.success).length} succeeded · {failures.length} failed</p><ul className="divide-y rounded-md border px-3">{results.map(result=><li key={result.id} className="py-2 text-sm"><span className="font-medium">{result.orderKey}</span><p className={result.success?'text-emerald-700 dark:text-emerald-300':'text-destructive'}>{result.message}</p></li>)}</ul></div>}
      {pending&&<p role="status" className="text-sm">Processing orders… {progress} processed</p>}
      {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
    <div className="flex justify-end gap-2 border-t pt-3"><Button variant="outline" disabled={pending} onClick={onClose}>{results.length?'Done':'Cancel'}</Button>{!results.length?<Button disabled={pending||!eligible.length||(action==='handover'&&(!accepted||!reference.trim()))} onClick={()=>void process()}>Process {eligible.length} eligible orders</Button>:failures.length>0&&<Button disabled={pending} onClick={()=>void process(true)}>Retry {failures.length} failed orders</Button>}</div>
  </DialogContent></Dialog>;
}
