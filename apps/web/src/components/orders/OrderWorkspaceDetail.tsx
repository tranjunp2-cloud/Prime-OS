import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { CopyValue } from './CopyValue';
import { ChannelLogo } from '@/components/channels/ChannelLogo';
import { orderAddressLines } from '@/lib/order-address';
import { HandlingTypeBadge } from './HandlingTypeBadge';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowRight, Box, Check, ChevronDown, CircleAlert, Package, Printer, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { orderMoney, ordersApi, type OrderRecord } from '@/lib/orders-api';
import { getOrderDetailFlow, getOrderDetailStatus, getOrderDetailSteps, getOrderDetailPermissions, getOrderActivity, type DetailTab } from '@/lib/order-detail-flow';
import { printPackingSlips } from '@/lib/order-print';
import { cn } from '@/lib/utils';

type Action = 'hold' | 'release-hold' | 'submit' | 'confirm' | 'cancel' | 'close' | 'payment' | 'assign' | 'warehouse' | 'note' | 'exception';
const actionCopy: Record<Action, { title: string; description: string; label?: string; submit: string }> = {
  hold: {title:'Hold Order',description:'Pause processing until the issue is resolved.',label:'Hold reason',submit:'Put on hold'},
  'release-hold':{title:'Release hold',description:'Resume the order at its existing lifecycle step.',label:'Release reason',submit:'Release hold'},
  submit: { title: 'Submit draft order', description: 'Move this draft to the confirmation queue. This does not reserve stock.', submit: 'Submit order' },
  confirm: { title: 'Confirm Order', description: 'Confirm the customer details and items. Stock allocation is the next step.', submit: 'Confirm Order' },
  cancel: { title: 'Cancel order', description: 'Stop this order before fulfillment. Cancellation does not automatically refund a payment.', label: 'Cancellation reason', submit: 'Cancel order' },
  close: { title: 'Close order', description: 'Finish this delivered order. The order will become read-only for lifecycle changes.', submit: 'Close order' },
  payment: { title: 'Confirm payment', description: 'Record a payment already received. This does not charge the customer.', label: 'Payment reference / Evidence', submit: 'Record payment' },
  assign: { title: 'Assign order owner', description: 'Choose the person or team responsible for following up on this order.', label: 'Person or team', submit: 'Save owner' },
  warehouse: { title: 'Change preferred warehouse', description: 'Update the warehouse preference before allocation. No inventory will be reserved by this change.', label: 'Preferred warehouse', submit: 'Save warehouse' },
  note: { title: 'Edit order notes', description: 'Save instructions or context for the operations team.', label: 'Order notes', submit: 'Save notes' },
  exception: { title: 'Record order exception', description: 'Describe the issue that needs investigation or follow-up.', label: 'Issue description', submit: 'Record exception' },
};
export function OrderWorkspaceDetail({ order, canWrite, onClose, onUpdated, onEditDraft }: {
  order: OrderRecord; canWrite: boolean; onClose: () => void; onUpdated: (order: OrderRecord) => void; onEditDraft: () => void;
}) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const sections = useRef<Partial<Record<DetailTab, HTMLElement | null>>>({});
  const setTab = (section: DetailTab) => { if (section === 'activity') setHistoryOpen(true); else sections.current[section]?.scrollIntoView({behavior:'smooth',block:'start'}); };
  const [action, setAction] = useState<Action | null>(null);
  const [value, setValue] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const flow = getOrderDetailFlow(order);
  const permissions = getOrderDetailPermissions(order, canWrite);
  const openExceptions = order.exceptions.filter((issue) => issue.status === 'open');
  const history = getOrderActivity(order);
  const needsPayment = permissions.payment && (order.needsPaymentVerification || Boolean(order.payment.reference));
  const primary: Action | null = order.hold?.active ? (permissions.editable ? 'release-hold' : null) : flow.focus === 'returns' ? null : permissions.submit ? 'submit' : permissions.confirm ? 'confirm' : needsPayment ? 'payment' : permissions.close ? 'close' : null;
  const begin = (next: Action, initial = '') => { setAction(next); setValue(initial); setError(''); setSuccess(''); };
  async function run(payload: Record<string, unknown>) {
    if (pending) return;
    setPending(true); setError('');
    try { const result = await ordersApi.command(order, payload); onUpdated(result.data); setAction(null); setValue(''); setSuccess('Order updated.'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not update this order.'); }
    finally { setPending(false); }
  }
  function print() { try { printPackingSlips([order]); } catch (e) { setError((e as Error).message); } }
  function submitAction() {
    if (!action) return;
    const nextStatus = { submit: 'created', confirm: 'acknowledged', cancel: 'canceled', close: 'closed' };
    if (action === 'hold' || action === 'release-hold') { void run({action,reason:value}); } else if (action in nextStatus) {
      void run({ action: 'transition', toStatus: nextStatus[action as keyof typeof nextStatus], reason: action === 'cancel' ? value : undefined });
    } else {
      const field = { payment: 'reference', assign: 'assignee', warehouse: 'warehouse', note: 'note', exception: 'summary' };
      void run({ action, [field[action as keyof typeof field]]: value });
    }
  }

  return <Sheet open onOpenChange={(open) => !open && !pending && onClose()}>
    <SheetContent className="flex w-full flex-col gap-0 p-0 sm:w-[95vw] sm:max-w-[1440px]" aria-label={`Order ${order.orderKey}`}>
      <SheetHeader className="shrink-0 border-b px-5 py-3 text-left sm:px-6">
        <div className="flex items-center gap-2 pr-8 text-xs text-muted-foreground"><ChannelLogo channel={{key: ({primepos:'pos',tiktokshop:'tiktok'} as Record<string,string>)[order.metadata.store.toLowerCase().replace(/[^a-z0-9]/g,'')] || order.metadata.store.toLowerCase().replace(/[^a-z0-9]/g,''), label:order.metadata.store}} size="sm" />{order.metadata.store}<span>·</span>{order.source === 'demo' ? 'Sample order' : 'Manual order'}</div>
        <div className="flex flex-wrap items-center gap-3 pr-6"><SheetTitle className="text-xl sm:text-2xl">{order.orderKey}</SheetTitle><CopyValue value={order.orderKey} label="order ID" /><StatusPill>{getOrderDetailStatus(order)}</StatusPill>{order.canonicalStatus === 'partially_shipped' && <StatusPill tone="attention">Partially shipped</StatusPill>}{order.returnRequests.length > 0 && <StatusPill tone="attention">Return request</StatusPill>}</div>
        <SheetDescription className="flex flex-wrap gap-x-4 gap-y-1 text-xs"><span>{formatDate(order.orderedAt)}</span><span className="inline-flex max-w-full items-center gap-1">Marketplace ID: <span className="max-w-64 truncate" title={order.marketplaceOrderId}>{order.marketplaceOrderId || 'Not reported'}</span>{order.marketplaceOrderId && <CopyValue value={order.marketplaceOrderId} label="marketplace order ID" />}</span><span>{order.lines.length ? `${order.lines.reduce((sum, item) => sum + item.quantity, 0)} items` : 'Item count not reported'}</span></SheetDescription>
      </SheetHeader>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <section className="border-b bg-muted/20 px-5 py-3 sm:px-6" aria-label="Current order step">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 flex-1 gap-3"><div className={cn('mt-0.5 h-fit shrink-0 rounded-full p-2', flow.tone === 'success' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-primary/10 text-primary')}><Package className="size-5" /></div><div><h2 className="font-semibold">{flow.title}</h2><p className="mt-1 max-w-lg text-sm leading-6 text-muted-foreground">{flow.description}</p></div></div>
            <div className="flex flex-wrap gap-2">
              {permissions.editDraft && <Button variant="outline" disabled={pending} onClick={onEditDraft}>Edit draft</Button>}
              {order.canonicalStatus === 'created' && !permissions.confirm && !order.hold?.active ? <Button disabled title={order.source === 'demo' ? 'Sample order: lifecycle changes are disabled' : 'Order write permission required'}>Confirm Order</Button> : !order.hold?.active && !primary && ['allocated','fulfillment_in_progress'].includes(order.canonicalStatus) && order.metadata.handlingType === 'self' && order.lines.length > 0 ? <Button onClick={print}><Printer className="size-4" />Print packing slip</Button> : primary ? <Button disabled={pending} onClick={() => begin(primary)}>{actionCopy[primary].title}</Button> : <Button variant="outline" onClick={() => setTab(flow.focus)}>{flow.reviewLabel}<ArrowRight className="size-4" /></Button>}
              {(permissions.editable || order.lines.length > 0) && <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" disabled={pending}>More<ChevronDown className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">{permissions.editable && !order.hold?.active && ['created','acknowledged','allocated','fulfillment_in_progress'].includes(order.canonicalStatus) && <DropdownMenuItem onSelect={()=>begin('hold')}>Hold Order</DropdownMenuItem>}<DropdownMenuItem onSelect={() => setTab('activity')}>View audit log</DropdownMenuItem>
                {!order.hold?.active && order.lines.length > 0 && <DropdownMenuItem onSelect={print}><Printer className="mr-2 size-4" />Print packing slip</DropdownMenuItem>}
                {permissions.editable && <><DropdownMenuItem onSelect={() => begin('assign', order.metadata.assignee)}>Assign owner</DropdownMenuItem><DropdownMenuItem onSelect={() => begin('note', order.metadata.notes)}>Edit notes</DropdownMenuItem><DropdownMenuItem onSelect={() => begin('exception')}>Record exception</DropdownMenuItem></>}
                {permissions.warehouse && <DropdownMenuItem onSelect={() => begin('warehouse', order.metadata.warehouse)}>Change preferred warehouse</DropdownMenuItem>}
                {permissions.cancel && <><DropdownMenuSeparator /><DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => begin('cancel')}>Cancel order</DropdownMenuItem></>}
              </DropdownMenuContent></DropdownMenu>}
            </div>
          </div>
          {flow.stage >= 0 && <ol aria-label="Order lifecycle" className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">{getOrderDetailSteps(order).map((step) => <li key={step.label} aria-current={step.current ? 'step' : undefined} className="min-w-0"><div className={cn('h-1 rounded-full', step.current || step.passed ? 'bg-primary' : 'bg-border')} /><p className={cn('mt-2 text-xs', step.current ? 'font-semibold text-foreground' : 'text-muted-foreground')}>{step.label}</p>{step.at && <time className="mt-1 block text-[11px] text-muted-foreground">{formatDate(step.at)}</time>}</li>)}</ol>}
          {order.source === 'demo' ? <p className="mt-2 text-xs text-muted-foreground">Sample data · Owner and internal notes can be edited with write access.</p> : !canWrite && <p className="mt-4 text-xs text-muted-foreground">You have read-only access to this order.</p>}
        </section>

        <div className="px-5 pb-6 sm:px-7">
          {success && <p role="status" className="mt-4 text-sm text-emerald-600 dark:text-emerald-400">{success}</p>}
          {error && !action && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
          {(order.hold?.active || openExceptions.length > 0 || order.syncError || order.reservation === 'Allocation failed' || order.pickupOverdue) && <section ref={(node) => { sections.current.exceptions = node; }} role="alert" className="my-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm"><h2 className="flex items-center gap-2 font-semibold"><CircleAlert className="size-4" />Needs attention</h2>{order.hold?.active && <p className="mt-2">On hold: {order.hold.reason}</p>}{order.syncError && <p className="mt-2">Channel synchronization failed.</p>}{order.reservation === 'Allocation failed' && <p className="mt-2">Stock allocation failed. Review the warehouse.</p>}{order.pickupOverdue && <p className="mt-2">Carrier pickup is overdue.</p>}{openExceptions.map((issue) => <div key={issue.id} className="mt-2 flex items-center justify-between gap-3"><p>{issue.summary}</p>{permissions.editable && <Button variant="outline" size="sm" disabled={pending} onClick={() => void run({action:'resolve-exception',exceptionId:issue.id})}>Resolve</Button>}</div>)}</section>}
          <div className="mt-4">
              <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
                <div className="min-w-0 space-y-4"><div ref={(node) => { sections.current.items = node; }}><Panel title={`Items (${order.lines.reduce((sum, line) => sum + line.quantity, 0)})`} icon={<Box className="size-4" />}>
                  <Items order={order} />
                  <section ref={(node) => { sections.current.payment = node; }} className="mt-4 border-t pt-4"><h2 className="mb-3 text-sm font-semibold">Finance & settlement</h2><Totals order={order} /><div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm"><span>{order.payment.method} · {order.payment.state}</span>{permissions.payment && <Button size="sm" variant="outline" disabled={pending} onClick={() => begin('payment')}>Confirm payment</Button>}</div><Field label="Payment reference" value={order.payment.reference} /><Settlement order={order} />{order.canonicalStatus === 'canceled' && order.payment.state === 'Paid' && <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">Payment was received. Cancellation does not automatically refund it.</p>}</section>
                </Panel></div><section ref={(node) => { sections.current.delivery = node; }}><Panel title="Packaging & warehouse" action={permissions.warehouse && <TextAction onClick={() => begin('warehouse', order.metadata.warehouse)}>Change warehouse</TextAction>}><Field label="Fulfillment type" value={<HandlingTypeBadge order={order} />} /><Field label="Dispatch warehouse" value={order.metadata.warehouse} /><Field label="Reservation" value={order.reservation} /><Field label="Weight" value={order.operations?.package ? `${order.operations.package.weightKg} kg` : 'Not measured'} /><Field label="Dimensions (L × W × H)" value={order.operations?.package ? `${order.operations.package.lengthCm} × ${order.operations.package.widthCm} × ${order.operations.package.heightCm} cm` : 'Not measured'} />{!order.operations?.package && <p className="mt-2 text-xs text-muted-foreground">Package measurements must be supplied by fulfillment before requesting a carrier label.</p>}</Panel></section>
                  {order.returnRequests.length > 0 && <section ref={(node) => { sections.current.returns = node; }}><Panel title="Returns / RMA">{order.returnRequests.map((request) => <div key={request.id} className="border-b py-3 last:border-0"><p className="text-sm font-semibold">{request.id} · {request.status}</p><p className="mt-1 text-sm">{request.reason}</p></div>)}<p className="mt-2 text-xs text-muted-foreground">Return receipt and payment refunds are tracked separately.</p></Panel></section>}
                </div>
                <div className="space-y-4">
                  <Panel title="Customer & delivery" icon={<UserRound className="size-4" />}>
                    <p className="text-sm font-semibold">{order.buyerSnapshot.name}</p><p className="flex flex-wrap items-center gap-1 break-words text-sm text-muted-foreground">{order.buyerSnapshot.phone || 'Phone not reported'}{order.buyerSnapshot.phone && <CopyValue value={order.buyerSnapshot.phone} label="phone number" />}</p><p className="break-words text-xs text-muted-foreground">{order.buyerSnapshot.email || 'Email not reported'}</p>
                    <p className="mt-3 border-t pt-3 text-sm leading-6">{orderAddressLines(order.shippingAddressSnapshot, order.buyerSnapshot.phone, order.buyerSnapshot.email).map((line,index) => <span key={index} className="block">{line}</span>)}</p>
                    {order.metadata.tags.length > 0 && <p className="mt-2 text-xs text-muted-foreground">{order.metadata.tags.join(' · ')}</p>}
                  </Panel>
                  <Panel title="Shipping & deadlines"><ShipDeadline order={order} /><Field label="Carrier" value={order.operations?.carrier || order.shipments[0]?.carrier} /><Field label="Service" value={order.operations?.service} />{order.shipments.map((shipment,index) => <div key={index} className="mt-3 rounded-md border p-3"><p className="text-sm font-medium">{shipment.carrier} · {shipment.status}</p><p className="flex flex-wrap items-center gap-1 break-all text-sm">{shipment.tracking}<CopyValue value={shipment.tracking} label="tracking number" /></p></div>)}{!order.shipments.length && <p className="my-3 text-sm text-muted-foreground">Tracking number not assigned.</p>}<div className="mt-3 border-t pt-3"><h3 className="mb-2 text-xs font-semibold">Print status</h3><Field label="Pick list" value={order.operations?.printStatus?.pickList || 'Not reported'} /><Field label="Shipping label" value={order.operations?.printStatus?.shippingLabel || 'Not reported'} /><Field label="Packing slip" value={order.operations?.printStatus?.packingSlip || 'Not reported'} /><p className="mt-2 text-xs leading-5 text-muted-foreground">Opening the print dialog does not confirm a physical print. Carrier labels and print tracking require fulfillment integration.</p></div></Panel>
                  <Panel title="VAT invoice">{order.operations?.invoice ? order.operations.invoice.requested ? <><Field label="Company" value={order.operations.invoice.company} /><Field label="Tax ID" value={order.operations.invoice.taxId} /><Field label="Billing address" value={order.operations.invoice.address} /></> : <p className="text-sm text-muted-foreground">Not requested</p> : <p className="text-sm text-muted-foreground">Invoice request not reported.</p>}</Panel>
                  <Panel title="Owner & notes" action={permissions.ownerAndNotes && <TextAction onClick={() => begin('note', order.metadata.notes)}>Edit note</TextAction>}>
                    <div className="flex items-center justify-between gap-2 text-sm"><span>{order.metadata.assignee}</span>{permissions.ownerAndNotes && <TextAction onClick={() => begin('assign', order.metadata.assignee)}>Assign</TextAction>}</div>
                    <p className="mt-3 text-xs font-medium">Buyer note</p><p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">{order.buyerNote || 'No buyer note.'}</p><p className="mt-3 text-xs font-medium">Internal note</p><p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">{order.metadata.notes || 'No internal note.'}</p>
                  </Panel>
                  <Panel title="Latest activity" action={<TextAction onClick={() => setTab('activity')}>View all</TextAction>}>
                    {history.length ? <div className="space-y-3">{history.slice(0, 3).map((event) => <div key={event.key}><p className="break-words text-xs font-medium">{event.title}</p><p className="text-xs text-muted-foreground">{event.detail}</p><time className="mt-1 block text-xs text-muted-foreground">{formatDate(event.at)}</time></div>)}</div> : <p className="text-xs text-muted-foreground">No activity recorded.</p>}
                  </Panel>
                </div>
              </div>
          </div>
        </div>
      </div>
      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}><SheetContent className="overflow-y-auto sm:max-w-lg"><SheetHeader><SheetTitle>Order activity</SheetTitle><SheetDescription>Recorded events for {order.orderKey}</SheetDescription></SheetHeader><ol className="mt-6 space-y-4">{history.map((event) => <li key={event.key} className="border-b pb-3"><p className="text-sm font-medium">{event.title}</p><p className="text-sm text-muted-foreground">{event.detail}</p><time className="text-xs text-muted-foreground">{formatDate(event.at)}</time></li>)}</ol>{!history.length && <p className="mt-4 text-sm text-muted-foreground">No activity recorded.</p>}</SheetContent></Sheet>
      <Dialog open={action !== null} onOpenChange={(open) => !open && !pending && setAction(null)}>
        <DialogContent>{action && <><DialogHeader><DialogTitle>{actionCopy[action].title}</DialogTitle><DialogDescription>{actionCopy[action].description}</DialogDescription></DialogHeader><form onSubmit={(event) => { event.preventDefault(); submitAction(); }} className="space-y-4"><p className="text-xs text-muted-foreground">{order.orderKey} · {order.buyerSnapshot.name}</p>{actionCopy[action].label && <label className="grid gap-2 text-sm font-medium">{actionCopy[action].label}{['note', 'cancel', 'exception'].includes(action) ? <Textarea autoFocus required={action !== 'note'} maxLength={1000} disabled={pending} value={value} onChange={(e) => setValue(e.target.value)} rows={4} /> : <Input autoFocus required maxLength={1000} disabled={pending} value={value} onChange={(e) => setValue(e.target.value)} />}</label>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={pending} onClick={() => setAction(null)}>Back</Button><Button type="submit" variant={action === 'cancel' ? 'destructive' : 'default'} disabled={pending}>{pending ? 'Saving…' : actionCopy[action].submit}</Button></div></form></>}</DialogContent>
      </Dialog>
    </SheetContent>
  </Sheet>;
}

function StatusPill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'attention' | 'success' }) {
  return <span className={cn('inline-flex rounded-md border px-2 py-1 text-xs font-medium', tone === 'success' ? 'border-emerald-500/25 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400' : tone === 'attention' ? 'border-amber-500/25 bg-amber-500/5 text-amber-700 dark:text-amber-400' : 'border-border bg-muted/40 text-muted-foreground')}>{children}</span>;
}
function TextAction({ children, onClick }: { children: ReactNode; onClick: () => void }) { return <button type="button" className="min-h-8 text-xs font-semibold text-primary hover:underline" onClick={onClick}>{children}</button>; }
function Panel({ title, icon, action, children }: { title: string; icon?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return <section className="min-w-0 overflow-hidden rounded-lg border bg-card"><div className="flex min-h-10 items-center justify-between gap-3 border-b px-3"><h2 className="flex items-center gap-2 text-sm font-semibold">{icon && <span className="text-muted-foreground">{icon}</span>}{title}</h2>{action}</div><div className="p-3">{children}</div></section>;
}
function Field({ label, value }: { label: string; value?: ReactNode }) { return <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-3 py-1.5 text-sm"><span className="text-muted-foreground">{label}</span><span className="break-words text-right">{value || 'Not reported'}</span></div>; }
function Totals({ order, compact = false }: { order: OrderRecord; compact?: boolean }) { return <dl className={cn('text-sm', compact ? 'space-y-1.5' : 'space-y-2.5')}>{(['subtotal', 'discount', 'shipping', 'tax', 'grandTotal'] as const).map((key) => <div key={key} className={cn('flex justify-between gap-3', key === 'grandTotal' && 'border-t pt-3 font-semibold')}><dt className={key === 'grandTotal' ? '' : 'text-muted-foreground'}>{{ subtotal: 'Subtotal', discount: 'Discount', shipping: 'Shipping fee', tax: 'Tax', grandTotal: 'Order total' }[key]}</dt><dd className="tabular-nums">{order.totals[key] == null ? 'Not reported' : `${key === 'discount' && order.totals[key]! > 0 ? '−' : ''}${orderMoney(order.totals[key]!, order.currencyCode)}`}</dd></div>)}{!compact && <div className="border-t pt-3"><p className="text-xs leading-5 text-muted-foreground">Discount is the combined amount reported by the source; shop and marketplace voucher allocation is not available.</p></div>}</dl>; }
function Items({ order }: { order: OrderRecord }) {
  if (!order.lines.length) return <Empty icon={<Box className="size-6" />} title="Item details not available" detail="This record includes an order total but no product lines." />;
  return <div className="overflow-x-auto"><table aria-label="Order items" className="w-full min-w-[660px] text-sm">
    <thead><tr className="border-b text-xs text-muted-foreground"><th scope="col" className="pb-2 text-left font-medium">Product</th><th scope="col" className="px-3 pb-2 text-left font-medium">Inventory</th><th scope="col" className="px-3 pb-2 text-right font-medium">Qty</th><th scope="col" className="px-3 pb-2 text-right font-medium">Unit price</th><th scope="col" className="pb-2 pl-3 text-right font-medium">Amount</th></tr></thead>
    <tbody>{order.lines.map((line, index) => {
      const stock = line.inventory;
      const available = stock ? stock.onHand - stock.committed + (stock.reservedForOrder ?? 0) : null;
      const sufficient = available !== null && available >= line.quantity;
      return <tr key={line.id || index} className="border-b align-middle last:border-0">
        <td className="w-full min-w-[230px] py-3 pr-3"><div className="flex items-start gap-2.5">
          {line.imageUrl ? <img src={line.imageUrl} alt={line.name} className="size-11 shrink-0 rounded-md border object-cover" /> : <span className="flex size-11 shrink-0 items-center justify-center rounded-md border bg-muted text-[10px] text-muted-foreground">No image</span>}
          <div className="min-w-0"><p className="break-words font-medium leading-5">{line.name}</p>{line.variant && <p className="mt-0.5 text-xs text-muted-foreground">{line.variant}</p>}<div className="flex items-center gap-1 text-xs text-muted-foreground"><span className="break-all">{line.sku}</span><CopyValue value={line.sku} label="SKU" /></div></div>
        </div></td>
        <td className="min-w-[140px] px-3 py-3">{stock ? <Popover><PopoverTrigger asChild><button type="button" aria-label={`Inventory details for ${line.sku}`} className="rounded-md px-2 py-1 text-left hover:bg-muted focus-visible:outline focus-visible:outline-primary"><span className={cn('block whitespace-nowrap text-xs font-medium', sufficient ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300')}>{sufficient ? 'Sufficient' : 'Shortage'} · {available}</span><span className="mt-1 block whitespace-nowrap text-[11px] text-muted-foreground underline decoration-dotted underline-offset-4">Last check · Details</span></button></PopoverTrigger><PopoverContent align="start" className="w-80"><h3 className="text-sm font-semibold">Inventory snapshot</h3><p className="mt-1 break-words text-xs text-muted-foreground">{line.sku} · {stock.warehouse}</p><div className="mt-3"><Field label="On-hand" value={String(stock.onHand)} /><Field label="Committed" value={String(stock.committed)} /><Field label="Reserved for this order" value={stock.reservedForOrder == null ? 'Not reported' : String(stock.reservedForOrder)} /><Field label="Available to this order" value={String(available)} /></div><p className="mt-3 text-xs font-medium">{sufficient ? 'Sufficient at last check' : 'Insufficient at last check'}</p><p className="mt-1 text-xs text-muted-foreground">Checked {formatDate(stock.checkedAt)}</p><p className="mt-2 text-xs leading-5 text-muted-foreground">On-hand − committed + reserved for this order. This is the recorded snapshot, not a live inventory check.</p></PopoverContent></Popover> : <span className="text-xs text-muted-foreground">Not checked</span>}</td>
        <td className="px-3 py-3 text-right tabular-nums">{line.quantity}</td>
        <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">{orderMoney(line.unitPrice, order.currencyCode)}</td>
        <td className="whitespace-nowrap py-3 pl-3 text-right font-semibold tabular-nums">{orderMoney(line.lineTotal ?? line.quantity * line.unitPrice, order.currencyCode)}</td>
      </tr>;
    })}</tbody>
  </table></div>;
}
function Empty({ icon, title, detail }: { icon: ReactNode; title: string; detail: string }) { return <div className="py-5 text-center"><span className="inline-flex rounded-full bg-muted p-3 text-muted-foreground">{icon}</span><p className="mt-3 text-sm font-medium">{title}</p><p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-muted-foreground">{detail}</p></div>; }
function formatDate(value: string) { return new Date(value).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }

function Settlement({order}: {order: OrderRecord}) {
  const settlement=order.operations?.settlement;
  return <div className="mt-3 border-t pt-3"><h3 className="text-sm font-semibold">Shop settlement</h3>{settlement ? <><Field label="Platform fees" value={orderMoney(settlement.platformFees,order.currencyCode)} /><Field label="Seller shipping cost" value={orderMoney(settlement.sellerShipping,order.currencyCode)} /><Field label="Other adjustments" value={orderMoney(settlement.adjustments,order.currencyCode)} /><Field label={settlement.status === 'estimated' ? 'Estimated net settlement' : 'Settled amount'} value={orderMoney(settlement.netAmount,order.currencyCode)} /></> : <p className="mt-2 text-sm text-muted-foreground">Fees and net settlement not reported. Order value is not shop revenue.</p>}</div>;
}
function ShipDeadline({order}: {order: OrderRecord}) {
  const [now,setNow]=useState(Date.now());
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),60000);return()=>clearInterval(timer);},[]);
  const due=Date.parse(order.operations?.shipBy || '');
  const active=['created','acknowledged','allocated','fulfillment_in_progress','partially_shipped'].includes(order.canonicalStatus);
  const minutes=Math.ceil((due-now)/60000);
  return <div className={cn('rounded-md border p-3 text-sm',active && minutes < 0 ? 'border-rose-500/30 bg-rose-500/5' : 'border-border')}><p className="text-xs font-semibold">Ship-by deadline</p><p className="mt-1">{Number.isFinite(due) ? formatDate(order.operations!.shipBy!) : 'Not provided'}</p>{Number.isFinite(due) && active && <p className="mt-1 text-xs">{minutes < 0 ? 'Overdue by' : 'Remaining'} {Math.floor(Math.abs(minutes)/60)}h {Math.abs(minutes)%60}m</p>}{!active && <p className="mt-1 text-xs text-muted-foreground">{order.canonicalStatus === 'draft' ? 'Starts after submission' : 'Dispatch countdown inactive'}</p>}</div>;
}
