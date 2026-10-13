import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ordersApi, type OrderRecord } from '@/lib/orders-api';
import { pendingShippingLabels, shippingLabelQueueBlocker, shippingLabelUrl } from '@/lib/order-shipping-label';

type Shipment = OrderRecord['shipments'][number];

export function OrderShippingLabelsDialog({orders, onClose}: {orders: OrderRecord[]; onClose: () => void}) {
  const [freshOrders, setFreshOrders] = useState<OrderRecord[]>([]);
  const [checking, setChecking] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState('');
  const opening = useRef(false);
  useEffect(() => {
    let active = true;
    ordersApi.list().then(result => { if (active) { setFreshOrders(result.data); setHasLoaded(true); } })
      .catch(cause => { if (active) setError((cause as Error).message); })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, []);
  const entries = orders.map(original => {
    const order = freshOrders.find(item => item.id === original.id);
    return {original, order, reason: order ? shippingLabelQueueBlocker(order) : 'Order no longer available.'};
  });

  async function openLabel(original: OrderRecord, shipment: Shipment) {
    if (opening.current) return;
    const popup = window.open('', '_blank');
    if (!popup) { setError('Allow pop-ups to open shipping labels.'); return; }
    opening.current = true; setChecking(true); setError('');
    try {
      // Recheck at the click, including handovers/printing performed since the dialog opened.
      const result = await ordersApi.list();
      setFreshOrders(result.data);
      const order = result.data.find(item => item.id === original.id);
      const reason = order ? shippingLabelQueueBlocker(order) : 'Order no longer available.';
      if (reason) throw new Error(`${original.orderKey}: ${reason}`);
      const current = pendingShippingLabels(order!).find(item => shipment.id ? item.id === shipment.id : item.tracking === shipment.tracking);
      const url = current && shippingLabelUrl(order!, current);
      if (!url) throw new Error('This label is no longer awaiting printing. Review the updated order.');
      if (popup.closed) throw new Error('The label window was closed. Open the label again to continue.');
      popup.opener = null;
      popup.location.replace(url);
    } catch (cause) { popup.close(); setError((cause as Error).message); }
    finally { opening.current = false; setChecking(false); }
  }

  return <Dialog open onOpenChange={open => !open && !checking && onClose()}><DialogContent className="sm:max-w-xl">
    <DialogHeader><DialogTitle>Print shipping labels</DialogTitle><DialogDescription>{orders.length} orders to review. Open the original labels to print before carrier handover.</DialogDescription></DialogHeader>
    {checking && <p role="status" className="text-sm text-muted-foreground">Checking labels awaiting printing…</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {!checking && hasLoaded && <ul aria-label="Shipping label queue" className="max-h-[55vh] divide-y overflow-auto">{entries.map(({original, order, reason}) => <li key={original.id} className="py-3 text-sm">
      <p className="font-medium">{original.orderKey}</p>
      {reason ? <p className="mt-1 text-xs text-muted-foreground">Skipped · {reason}</p> : pendingShippingLabels(order!).map((shipment, index) => <Button key={shipment.id || index} className="mt-2 mr-2 h-auto min-h-10 max-w-full whitespace-normal break-all py-2" variant="outline" onClick={() => void openLabel(order!, shipment)}>Open {shippingLabelUrl(order!, shipment)?.startsWith('/') ? 'sample label' : 'label'} · {shipment.tracking}</Button>)}
    </li>)}</ul>}
    <p className="text-xs text-muted-foreground">Opening a label does not mark it as printed or change order status.</p>
    <div className="flex justify-end"><Button variant="outline" disabled={checking} onClick={onClose}>Done</Button></div>
  </DialogContent></Dialog>;
}
