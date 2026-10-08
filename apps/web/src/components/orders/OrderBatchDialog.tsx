import { useRef, useState } from 'react';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ordersApi, type OrderRecord } from '@/lib/orders-api';
import { batchBlocker, packingSlipBlocker, type BatchAction } from '@/lib/order-bulk';
import { printPackingSlips } from '@/lib/order-print';

const labels: Record<BatchAction, string> = {confirm: 'Confirm orders', prepare: 'Prepare orders', handover: 'Record carrier pickups', print: 'Print packing slips'};
type Result = {id: string; orderKey: string; status: 'success' | 'failed' | 'skipped'; message: string; order?: OrderRecord};
type Props = {orders: OrderRecord[]; canWrite: boolean; initialAction?: BatchAction; scope?: 'selected' | 'filtered'; onClose: () => void; onUpdated: (order: OrderRecord) => void};

export function OrderBatchDialog({orders, canWrite, initialAction, scope = 'selected', onClose, onUpdated}: Props) {
  const [action, setAction] = useState<BatchAction>(initialAction || (orders.some(order => order.canonicalStatus === 'created') ? 'confirm' : orders.some(order => order.readyForPickup) ? 'handover' : 'prepare'));
  const [warehouse, setWarehouse] = useState('');
  const carriers = [...new Set(orders.map(order => order.shipments[0]?.carrier).filter(Boolean))];
  const [carrier, setCarrier] = useState(carriers.length === 1 ? carriers[0] : '');
  const [reference, setReference] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  const [error, setError] = useState('');
  const [printNotice, setPrintNotice] = useState('');
  const [excludedIds, setExcludedIds] = useState<string[]>([]);
  const locked = useRef(false);
  const printAttempt = useRef<{ids: string[]; skipped: Result[]}>({ids: [], skipped: []});
  const requests = useRef(new Map<string, {signature: string; id: string; sent: boolean}>());
  const candidates = orders.map(order => ({order, reason: batchBlocker(order, action, canWrite, warehouse) || (action === 'handover' && order.shipments[0]?.carrier !== carrier ? 'Choose this carrier in a separate pickup batch.' : null)}));
  const eligible = candidates.filter(item => !item.reason);
  const chosen = eligible.filter(item => !excludedIds.includes(item.order.id));
  const blocked: Result[] = candidates.filter(item => item.reason).map(({order, reason}) => ({id: order.id, orderKey: order.orderKey, status: 'skipped', message: reason!}));
  const failures = results.filter(result => result.status === 'failed');
  const successes = results.filter(result => result.status === 'success');
  const printable = successes.filter(result => result.order && !packingSlipBlocker(result.order));
  const prototypeCount = orders.filter(order => order.source === 'demo').length;

  async function process(retry = false) {
    if (locked.current) return;
    locked.current = true; setPending(true); setError(''); setProgress(0);
    try {
      const ids = retry ? failures.map(result => result.id) : chosen.map(item => item.order.id);
      const fresh = await ordersApi.list();
      const output: Result[] = retry ? results.filter(result => result.status !== 'failed') : [...blocked];
      for (const [index, id] of ids.entries()) {
        const order = fresh.data.find(item => item.id === id);
        const original = orders.find(item => item.id === id)!;
        const body = action === 'confirm' ? {action: 'transition', toStatus: 'acknowledged'} : action === 'prepare' ? {action, warehouse: warehouse.trim() || order?.metadata.warehouse} : {action, reference, carrierAccepted: accepted};
        const signature = JSON.stringify(body);
        const previous = requests.current.get(id);
        const receipt = previous?.signature === signature ? previous : {signature, id: crypto.randomUUID(), sent: false};
        requests.current.set(id, receipt);
        try {
          if (!order) throw new Error('Order no longer exists.');
          if (order.source !== 'demo' && !fresh.canWrite) throw new Error('Order write access is no longer available.');
          if (action === 'handover' && order.shipments[0]?.carrier !== carrier) throw new Error('Carrier changed. Review this order in a separate pickup batch.');
          const blocker = batchBlocker(order, action, fresh.canWrite, warehouse);
          // Only an actually sent real command can have an uncertain receipt to replay.
          if (blocker && !(retry && previous?.signature === signature && previous.sent && order.source !== 'demo')) throw new Error(blocker);
          receipt.sent = true;
          const updated = await ordersApi.command(order, {...body, requestId: receipt.id});
          onUpdated(updated.data);
          output.push({id, orderKey: original.orderKey, status: 'success', message: action === 'confirm' ? 'Confirmed · Preparing' : 'Updated', order: updated.data});
        } catch (cause) {
          output.push({id, orderKey: original.orderKey, status: 'failed', message: (cause as Error).message});
        }
        setProgress(index + 1); setResults([...output]);
      }
    } catch (cause) { setError((cause as Error).message); }
    finally { locked.current = false; setPending(false); }
  }

  async function print(ids: string[], showResults: boolean, skipped: Result[] = []) {
    if (locked.current) return;
    // Reserve a window during the click; opening it after a fetch is blocked by browsers.
    const popup = window.open('', '_blank');
    if (!popup) { setError('Allow pop-ups to print packing slips.'); return; }
    if (showResults) printAttempt.current = {ids: [...ids], skipped};
    locked.current = true; setPending(true); setError(''); setPrintNotice('');
    let sent = false;
    try {
      const fresh = await ordersApi.list();
      const output: Result[] = [...skipped];
      const documents: OrderRecord[] = [];
      for (const id of ids) {
        const order = fresh.data.find(item => item.id === id);
        const original = orders.find(item => item.id === id)!;
        const reason = order ? packingSlipBlocker(order) : 'Order no longer exists.';
        if (reason) output.push({id, orderKey: original.orderKey, status: 'skipped', message: reason});
        else {
          documents.push(order!);
          output.push({id, orderKey: original.orderKey, status: 'success', message: 'Sent to print dialog', order});
        }
      }
      if (documents.length) {
        if (popup.closed) throw new Error('The print window was closed. Open it again to continue.');
        printPackingSlips(documents, popup); sent = true;
      }
      if (showResults) setResults(output);
      setPrintNotice(`${documents.length} packing slips sent to the print dialog · ${output.length - documents.length} skipped. This does not confirm physical printing or change order status.`);
      if (!showResults && output.some(result => result.status === 'skipped')) setPrintNotice(current => `${current} ${output.filter(result => result.status === 'skipped').map(result => `${result.orderKey}: ${result.message}`).join(' ')}`);
    } catch (cause) { setError((cause as Error).message); }
    finally { if (!sent) popup.close(); locked.current = false; setPending(false); }
  }

  return <Dialog open onOpenChange={open => !open && !pending && onClose()}><DialogContent className="flex max-h-[90dvh] flex-col sm:max-w-2xl"><DialogHeader><DialogTitle>{labels[action]}</DialogTitle><DialogDescription>{orders.length} {scope === 'filtered' ? 'matching orders across all pages' : 'orders in this batch'}. Review your selection. Eligibility is checked again before processing.</DialogDescription></DialogHeader>
    <div className="min-h-0 space-y-4 overflow-y-auto">
      {prototypeCount > 0 && <p className="rounded-md bg-primary/5 p-3 text-xs text-muted-foreground">{prototypeCount} prototype order(s) · Changes to these orders stay in this browser tab.</p>}
      {!initialAction && <label className="grid gap-1.5 text-sm font-medium">Action<select className="h-10 rounded-md border bg-background px-3" disabled={pending || results.length > 0} value={action} onChange={e => {setAction(e.target.value as BatchAction); setError(''); setPrintNotice('');}}>{Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>}
      {action === 'confirm' && <p className="text-xs text-muted-foreground">Confirmation moves orders to Preparing. Payment and physical stock checks remain separate.</p>}
      {action === 'prepare' && <label className="grid gap-1.5 text-sm font-medium">Dispatch warehouse override (optional)<Input disabled={pending || results.length > 0} placeholder="Use each order's assigned warehouse" value={warehouse} onChange={e => setWarehouse(e.target.value)}/><span className="text-xs font-normal text-muted-foreground">Preparation does not reserve inventory. Verify physical stock before packing.</span></label>}
      {action === 'handover' && <><label className="grid gap-1.5 text-sm font-medium">Pickup carrier<select className="h-10 rounded-md border bg-background px-3" disabled={pending || results.length > 0} value={carrier} onChange={e => {setCarrier(e.target.value); setAccepted(false);}}><option value="">Choose one carrier</option>{carriers.map(name => <option key={name} value={name}>{name}</option>)}</select></label><label className="grid gap-1.5 text-sm font-medium">Carrier pickup evidence / Reference<Input required disabled={pending || results.length > 0} value={reference} onChange={e => setReference(e.target.value)}/></label><label className="flex gap-2 text-sm"><Checkbox disabled={pending || results.length > 0} checked={accepted} onCheckedChange={checked => setAccepted(checked === true)}/>The carrier has accepted every eligible parcel in this selection.</label></>}
      {!results.length && <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2"><label className="flex min-h-11 items-center gap-2 text-sm font-semibold"><Checkbox aria-label="Select all eligible orders in this batch" disabled={pending || !eligible.length} checked={chosen.length === eligible.length && eligible.length > 0 ? true : chosen.length ? 'indeterminate' : false} onCheckedChange={checked => setExcludedIds(ids => checked === true ? ids.filter(id => !eligible.some(item => item.order.id === id)) : [...new Set([...ids, ...eligible.map(item => item.order.id)])])}/>{chosen.length} selected</label><p className="text-xs text-muted-foreground">{eligible.length} eligible · {blocked.length} will be skipped</p></div>
        <ul aria-label="Orders to review" className="divide-y rounded-md border">{candidates.map(({order, reason}) => <li key={order.id}><label className="flex min-h-14 items-center gap-3 px-3 py-2 text-sm"><Checkbox aria-label={`Include ${order.orderKey}`} disabled={pending || !!reason} checked={!reason && !excludedIds.includes(order.id)} onCheckedChange={checked => setExcludedIds(ids => checked === true ? ids.filter(id => id !== order.id) : [...ids, order.id])}/><span className="min-w-0"><span className="block break-words font-medium">{order.orderKey}</span><span className={reason ? 'block text-xs text-amber-700 dark:text-amber-300' : 'block text-xs text-muted-foreground'}>{reason || `${order.buyerSnapshot.name} · ${order.metadata.store}`}</span></span></label></li>)}</ul>
        <p className="text-xs text-muted-foreground">Newly synced orders are not added to this batch.</p>
      </div>}
      {!!results.length && <div aria-label="Batch results"><p role="status" className="text-sm font-semibold">{successes.length} {action === 'print' ? 'sent to print dialog' : 'succeeded'} · {failures.length} failed · {results.filter(item => item.status === 'skipped').length} skipped</p><ul className="divide-y rounded-md border px-3">{results.map(result => <li key={result.id} className="py-2 text-sm"><span className="font-medium">{result.orderKey}</span><p className={result.status === 'success' ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}>{result.message}</p></li>)}</ul></div>}
      {pending && <p role="status" className="text-sm">{action === 'print' ? 'Checking orders…' : `Processing orders… ${progress} processed`}</p>}
      {printNotice && <p role="status" className="text-sm">{printNotice}</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
    <div className="flex flex-wrap justify-end gap-2 border-t pt-3"><Button variant="outline" disabled={pending} onClick={onClose}>{results.length ? 'Done' : 'Cancel'}</Button>
      {!results.length ? <Button disabled={pending || !chosen.length || (action === 'handover' && (!accepted || !reference.trim()))} onClick={() => action === 'print' ? void print(chosen.map(item => item.order.id), true, blocked) : void process()}>{action === 'print' ? `Print ${chosen.length} packing slips` : action === 'confirm' ? `Confirm ${chosen.length} orders` : `Process ${chosen.length} eligible orders`}</Button> : <>
        {failures.length > 0 && <Button disabled={pending} onClick={() => void process(true)}>Retry {failures.length} failed orders</Button>}
        {action === 'confirm' && printable.length > 0 && <Button disabled={pending} onClick={() => void print(printable.map(item => item.id), false)}><Printer className="size-4" aria-hidden="true"/>Print packing slips ({printable.length})</Button>}
        {action === 'print' && <Button disabled={pending} variant="outline" onClick={() => void print(printAttempt.current.ids, true, printAttempt.current.skipped)}>Open print dialog again</Button>}
      </>}
    </div>
  </DialogContent></Dialog>;
}
