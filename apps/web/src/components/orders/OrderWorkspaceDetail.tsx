import { OrderShipmentJourney } from './OrderShipmentJourney';
import { OrderProcessingDialog } from './OrderProcessingDialog';
import { confirmationBlocker } from '@/lib/order-bulk';
import { orderNextAction, paymentAllowsPreparation, type ProcessingAction } from '@/lib/order-processing';
import { completionBlocker } from '@/lib/order-processing';
import { prototypePreparation } from '@/lib/order-preparation';
import { restartOrderPrototype } from '@/lib/order-prototype';
import { OrderLifecycleBadge } from './OrderLifecycleBadge';
import { hasActiveReturn } from '@/lib/order-work-queues';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { CopyValue } from './CopyValue';
import { ChannelLogo } from '@/components/channels/ChannelLogo';
import { orderAddressLines } from '@/lib/order-address';
import { HandlingTypeBadge } from './HandlingTypeBadge';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowRight, Box, Check, ChevronDown, ChevronLeft, ChevronRight, CircleAlert, Printer, UserRound } from 'lucide-react';
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
  confirm: { title: 'Confirm Order', description: 'Confirm the customer details and items, then prepare the order at your dispatch warehouse.', submit: 'Confirm Order' },
  cancel: { title: 'Cancel order', description: 'Stop this order before fulfillment. Cancellation does not automatically refund a payment.', label: 'Cancellation reason', submit: 'Cancel order' },
  close: { title: 'Complete order', description: 'Finish this delivered order. The order will become read-only for lifecycle changes.', submit: 'Complete order' },
  payment: { title: 'Confirm payment', description: 'Record a payment already received. This does not charge the customer.', label: 'Payment reference / Evidence', submit: 'Record payment' },
  assign: { title: 'Assign order owner', description: 'Choose the person or team responsible for following up on this order.', label: 'Person or team', submit: 'Save owner' },
  warehouse: { title: 'Change preferred warehouse', description: 'Update the warehouse preference before allocation. No inventory will be reserved by this change.', label: 'Preferred warehouse', submit: 'Save warehouse' },
  note: { title: 'Edit order notes', description: 'Save instructions or context for the operations team.', label: 'Order notes', submit: 'Save notes' },
  exception: { title: 'Record order exception', description: 'Describe the issue that needs investigation or follow-up.', label: 'Issue description', submit: 'Record exception' },
};
export function OrderWorkspaceDetail({ order, canWrite, onClose, onUpdated, onEditDraft, onNext, onPrevious, positionLabel, startProcessing = false }: {
  order: OrderRecord; canWrite: boolean; onClose: () => void; onUpdated: (order: OrderRecord) => void; onEditDraft: () => void; onNext?: () => void; onPrevious?: () => void; positionLabel?: string; startProcessing?: boolean;
}) {
  const nextWork = orderNextAction(order);
  const preparation = prototypePreparation(order);
  const marketplaceStep = preparation?.marketplace ? preparation : null;
  const [processingAction, setProcessingAction] = useState<ProcessingAction | null>(() => startProcessing && (order.source === 'demo' || (canWrite && order.source === 'manual')) && nextWork && !nextWork.blocker ? nextWork.key : null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const shipmentJourney = useRef<HTMLDivElement | null>(null);
  const sections = useRef<Partial<Record<DetailTab, HTMLElement | null>>>({});
  const setTab = (section: DetailTab) => {
    if (section === 'activity') { setHistoryOpen(true); return; }
    const element = sections.current[section];
    if (element instanceof HTMLDetailsElement) element.open = true;
    element?.scrollIntoView({behavior:'smooth',block:'start'});
  };
  const [action, setAction] = useState<Action | null>(null);
  const [value, setValue] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const flow = getOrderDetailFlow(order);
  const permissions = getOrderDetailPermissions(order, canWrite);
  const hasPackingSlip = order.lines.length > 0;
  const showPackingSlipInHeader = hasPackingSlip && order.metadata.handlingType === 'self'
    && ['acknowledged', 'allocated', 'fulfillment_in_progress'].includes(order.canonicalStatus);
  const packingSlipMenuLabel = ['partially_shipped', 'shipped', 'delivered', 'closed'].includes(order.canonicalStatus)
    ? 'Reprint packing slip' : 'Print packing slip';
  const packingSlipDisabled = pending || Boolean(order.hold?.active);
  const packingSlipDisabledReason = order.hold?.active ? 'Release the hold before printing packing slips.' : undefined;
  const openExceptions = order.exceptions.filter((issue) => issue.status === 'open');
  const history = getOrderActivity(order);
  // Read-only real orders still show the next step without enabling it.
  const actionPermissions = getOrderDetailPermissions(order, true);
  const needsPayment = !preparation && actionPermissions.payment && (order.needsPaymentVerification || Boolean(order.payment.reference) || (['acknowledged','allocated','fulfillment_in_progress'].includes(order.canonicalStatus) && !paymentAllowsPreparation(order)) || order.canonicalStatus === 'delivered');
  const primary: Action | null = order.hold?.active ? (actionPermissions.editable ? 'release-hold' : null) : flow.focus === 'returns' ? null : actionPermissions.submit ? 'submit' : actionPermissions.confirm ? 'confirm' : needsPayment ? 'payment' : actionPermissions.close ? 'close' : null;
  const processingNotice = order.source === 'demo'
    ? ''
    : !canWrite ? 'Read-only access — you can view this order but cannot process it.'
    : order.source !== 'manual' ? 'Channel actions are not connected yet. Process this order in the source channel.' : '';
  const nextStepHint = flow.focus === 'returns' ? flow.description
    : primary === 'confirm' ? `Review items, delivery address and payment terms.${!paymentAllowsPreparation(order) ? ' Payment is required before preparation.' : ''}`
    : primary ? actionCopy[primary].description
    : processingNotice && order.source !== 'demo' && order.source !== 'manual' ? 'Await the next update from the source channel.'
    : order.source === 'demo' && nextWork?.key === 'delivery' ? 'Follow Shipment journey and simulate the next carrier update.'
    : marketplaceStep ? marketplaceStep.action === 'marketplace-ready' ? 'The marketplace warehouse prepares this order. Simulate its ready-to-ship update.' : 'The marketplace arranges handover. Simulate the carrier pickup update.'
    : nextWork ? processingHints[nextWork.key] : flow.description;
  const actionBlocker = processingNotice || (order.canonicalStatus === 'created' && !primary && confirmationBlocker(order, canWrite)) || marketplaceStep?.blocker || (!primary && nextWork?.blocker) || (order.canonicalStatus === 'delivered' && !actionPermissions.close && completionBlocker(order)) || '';
  const begin = (next: Action, initial = '') => { setAction(next); setValue(initial || (order.source === 'demo' && next === 'payment' ? `DEMO-PAYMENT-${order.orderKey}` : '')); setError(''); setSuccess(''); };
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
      <SheetHeader className="shrink-0 space-y-2 border-b px-4 py-3 text-left sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-x-5 gap-y-2 pr-7">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <SheetTitle className="break-all text-lg sm:text-xl">{order.orderKey}</SheetTitle><CopyValue value={order.orderKey} label="order ID" />
            <OrderLifecycleBadge status={getOrderDetailStatus(order)} />
            {order.canonicalStatus === 'partially_shipped' && <StatusPill tone="attention">Partially shipped</StatusPill>}
            {order.hold?.active && <StatusPill tone="attention">On hold</StatusPill>}
            {hasActiveReturn(order) && <StatusPill tone="attention">Return in progress</StatusPill>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {showPackingSlipInHeader && <Button variant="outline" disabled={packingSlipDisabled} title={packingSlipDisabledReason} onClick={print}><Printer aria-hidden="true" className="size-4" />Print packing slip</Button>}
              {(permissions.editable || order.lines.length > 0) && <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" disabled={pending}>More<ChevronDown className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">{permissions.editable && !order.hold?.active && ['created','acknowledged','allocated','fulfillment_in_progress'].includes(order.canonicalStatus) && <DropdownMenuItem onSelect={()=>begin('hold')}>Hold Order</DropdownMenuItem>}<DropdownMenuItem onSelect={() => setTab('activity')}>View audit log</DropdownMenuItem>
                {hasPackingSlip && !showPackingSlipInHeader && <DropdownMenuItem disabled={packingSlipDisabled} title={packingSlipDisabledReason} onSelect={print}><Printer aria-hidden="true" className="mr-2 size-4" />{packingSlipMenuLabel}</DropdownMenuItem>}
                {permissions.editable && <><DropdownMenuItem onSelect={() => begin('assign', order.metadata.assignee)}>Assign owner</DropdownMenuItem><DropdownMenuItem onSelect={() => begin('note', order.metadata.notes)}>Edit notes</DropdownMenuItem><DropdownMenuItem onSelect={() => begin('exception')}>Record exception</DropdownMenuItem></>}
                {permissions.warehouse && <DropdownMenuItem onSelect={() => begin('warehouse', order.metadata.warehouse)}>Change preferred warehouse</DropdownMenuItem>}
                {permissions.cancel && <><DropdownMenuSeparator /><DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => begin('cancel')}>Cancel order</DropdownMenuItem></>}
              </DropdownMenuContent></DropdownMenu>}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <SheetDescription className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className="inline-flex items-center gap-1.5"><ChannelLogo channel={{key: ({primepos:'pos',tiktokshop:'tiktok'} as Record<string,string>)[order.metadata.store.toLowerCase().replace(/[^a-z0-9]/g,'')] || order.metadata.store.toLowerCase().replace(/[^a-z0-9]/g,''), label:order.metadata.store}} size="sm" />{order.metadata.store}</span>
            <span>{order.source === 'demo' ? 'Interactive prototype' : order.source === 'manual' ? 'Manual order' : 'Channel order'}</span>
            <span>{formatDate(order.orderedAt)}</span>
            {order.marketplaceOrderId && <span className="inline-flex max-w-full items-center gap-1">Marketplace ID: <span className="max-w-48 truncate">{order.marketplaceOrderId}</span><CopyValue value={order.marketplaceOrderId} label="marketplace order ID" /></span>}
            <span>{order.lines.length} {order.lines.length === 1 ? 'product' : 'products'} · {order.lines.reduce((sum, item) => sum + item.quantity, 0)} units</span>
          </SheetDescription>
          {(onNext || onPrevious || positionLabel) && <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground"><span className="mr-2">{positionLabel}</span><Button variant="ghost" size="icon" className="size-11 sm:size-8" aria-label="Previous order" disabled={!onPrevious || pending || Boolean(action) || Boolean(processingAction)} onClick={onPrevious}><ChevronLeft className="size-4" /></Button><Button variant="ghost" size="icon" className="size-11 sm:size-8" aria-label="Next order" disabled={!onNext || pending || Boolean(action) || Boolean(processingAction)} onClick={onNext}><ChevronRight className="size-4" /></Button></div>}
        </div>
      </SheetHeader>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <section aria-label="Current order step" className="border-b px-4 py-3 sm:px-6">
          <h2 className="sr-only">{flow.title}</h2>
          {order.source === 'demo' && <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs"><p className="text-muted-foreground"><span className="font-medium text-primary">Prototype</span> · Changes stay in this browser tab. No real payments, shipments or stock changes.</p><Button variant="outline" size="sm" disabled={pending || Boolean(action) || Boolean(processingAction)} onClick={() => { onUpdated(restartOrderPrototype(order)); setError(''); setSuccess('Prototype restarted. Confirm the order to try the flow again.'); }}>Restart prototype</Button></div>}
          <OrderProgress order={order} />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/30 px-3 py-2.5">
            <div className="min-w-0 flex-1 basis-64">
              <p className="text-sm font-medium">{['closed', 'canceled'].includes(order.canonicalStatus) ? 'Order finished' : 'Next step'}</p>
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{nextStepHint}</p>
              {actionBlocker && <p id="order-processing-blocker" className="mt-1 text-xs leading-5 text-amber-700 dark:text-amber-300">{actionBlocker}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {permissions.editDraft && <Button variant="outline" disabled={pending} onClick={onEditDraft}>Edit draft</Button>}
              {flow.focus === 'returns' ? <Button variant="outline" onClick={() => setTab('returns')}>Review return<ArrowRight className="size-4" /></Button>
                : primary ? <Button disabled={pending || !permissions.editable} aria-describedby={actionBlocker ? 'order-processing-blocker' : undefined} onClick={() => begin(primary)}>{actionCopy[primary].title}</Button>
                : marketplaceStep ? <Button disabled={pending || Boolean(marketplaceStep.blocker)} aria-describedby={actionBlocker ? 'order-processing-blocker' : undefined} onClick={() => void run({action:marketplaceStep.action})}>{marketplaceStep.action === 'marketplace-ready' ? 'Simulate marketplace update' : 'Simulate carrier pickup'}</Button>
                : order.source === 'demo' && nextWork?.key === 'delivery' && !nextWork.blocker ? <Button variant="outline" onClick={() => shipmentJourney.current?.scrollIntoView({behavior:'smooth',block:'start'})}>View shipment journey<ArrowRight className="size-4" /></Button>
                : nextWork && actionPermissions.editable ? <Button disabled={pending || !permissions.editable || Boolean(nextWork.blocker)} aria-describedby={actionBlocker ? 'order-processing-blocker' : undefined} onClick={() => setProcessingAction(nextWork.key)}>{nextWork.label}</Button>
                : <Button variant="outline" onClick={() => setTab(flow.focus)}>{flow.reviewLabel}<ArrowRight className="size-4" /></Button>}
            </div>
          </div>
        </section>
        <section aria-label="Order summary" className="grid grid-cols-2 gap-4 border-b px-4 py-3 sm:px-6 lg:grid-cols-4">
          <SummaryField label="Order total"><span className="text-lg font-semibold tabular-nums">{orderMoney(order.totals.grandTotal, order.currencyCode)}</span></SummaryField>
          <SummaryField label="Payment"><span>{order.payment.method} · {order.payment.method === 'COD' && order.payment.state === 'Unpaid' ? 'Collect on delivery' : order.payment.state}</span><TextAction onClick={() => setTab('payment')}>Payment details</TextAction></SummaryField>
          <ShipDeadline order={order} />
          <SummaryField label="Dispatch warehouse"><span>{order.metadata.warehouse || 'Not assigned'}</span>{permissions.warehouse && <TextAction onClick={() => begin('warehouse', order.metadata.warehouse)}>Change warehouse</TextAction>}</SummaryField>
        </section>
        {order.canonicalStatus === 'canceled' && order.payment.state === 'Paid' && <p role="alert" className="border-b px-4 py-2 text-sm text-amber-700 sm:px-6 dark:text-amber-300">Payment was received. Review the refund separately from cancellation.</p>}

        <div className="px-5 pb-6 sm:px-7">
          {success && <p role="status" className="mt-4 text-sm text-emerald-600 dark:text-emerald-400">{success}</p>}
          {error && !action && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
          {(order.hold?.active || openExceptions.length > 0 || order.syncError || order.reservation === 'Allocation failed' || order.pickupOverdue) && <section ref={(node) => { sections.current.exceptions = node; }} role="alert" className="my-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm"><h2 className="flex items-center gap-2 font-semibold"><CircleAlert className="size-4" />Needs review</h2>{order.hold?.active && <p className="mt-2">On hold: {order.hold.reason}</p>}{order.syncError && <p className="mt-2">Channel synchronization failed.</p>}{order.reservation === 'Allocation failed' && <p className="mt-2">Stock allocation failed. Review the warehouse.</p>}{order.pickupOverdue && <p className="mt-2">Carrier pickup is overdue.</p>}{openExceptions.map((issue) => <div key={issue.id} className="mt-2 flex items-center justify-between gap-3"><p>{issue.summary}</p>{permissions.editable && <Button variant="outline" size="sm" disabled={pending} onClick={() => void run({action:'resolve-exception',exceptionId:issue.id})}>Resolve</Button>}</div>)}</section>}
          <div className="mt-4">
              <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
                <div className="min-w-0 space-y-4"><div ref={(node) => { sections.current.items = node; }}><Panel title={`Products (${order.lines.length})`} icon={<Box className="size-4" />}>
                  <Items order={order} />
                  <details ref={(node) => { sections.current.payment = node; }} className="mt-3 border-t pt-3">
                    <summary className="cursor-pointer text-sm font-medium focus-visible:outline focus-visible:outline-primary">Payment breakdown &amp; settlement</summary>
                    <div className="mt-3"><Totals order={order} compact />
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm"><span>{order.payment.method} · {order.payment.state}</span>{permissions.payment && <Button size="sm" variant="outline" disabled={pending} onClick={() => begin('payment')}>Confirm payment</Button>}</div>
                      {order.payment.reference && <Field label="Payment reference" value={order.payment.reference} />}
                      {order.operations?.settlement && <Settlement order={order} />}
                      {order.canonicalStatus === 'canceled' && order.payment.state === 'Paid' && <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">Payment was received. Cancellation does not automatically refund it.</p>}
                    </div>
                  </details>
                </Panel></div>
                  <Panel title="Owner & notes" action={permissions.ownerAndNotes && <TextAction onClick={() => begin('note', order.metadata.notes)}>Edit note</TextAction>}>
                    <div className="flex items-center justify-between gap-2 text-sm"><span>{order.metadata.assignee}</span>{permissions.ownerAndNotes && <TextAction onClick={() => begin('assign', order.metadata.assignee)}>Assign</TextAction>}</div>
                    {order.buyerNote && <div className="mt-3"><p className="text-xs font-medium">Buyer note</p><p className="mt-1 whitespace-pre-wrap break-words text-sm">{order.buyerNote}</p></div>}{order.metadata.notes && <div className="mt-3"><p className="text-xs font-medium">Internal note</p><p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">{order.metadata.notes}</p></div>}
                  </Panel>
                  {order.returnRequests.length > 0 && <section ref={(node) => { sections.current.returns = node; }}><Panel title="Returns / RMA">{order.returnRequests.map((request) => <div key={request.id} className="border-b py-3 last:border-0"><p className="text-sm font-semibold">{request.id} · {({in_transit:'Returning to sender',awaiting_inspection:'Awaiting warehouse inspection'} as Record<string,string>)[request.status] || request.status}</p><p className="mt-1 text-sm">{request.reason}</p></div>)}<p className="mt-2 text-xs text-muted-foreground">Return receipt and payment refunds are tracked separately.</p></Panel></section>}
                </div>
                <div className="space-y-4">
                  <Panel title="Customer & delivery" icon={<UserRound className="size-4" />}>
                    <p className="text-sm font-semibold">{order.buyerSnapshot.name}</p><p className="flex flex-wrap items-center gap-1 break-words text-sm text-muted-foreground">{order.buyerSnapshot.phone || 'Phone not reported'}{order.buyerSnapshot.phone && <CopyValue value={order.buyerSnapshot.phone} label="phone number" />}</p>{order.buyerSnapshot.email && <p className="break-words text-xs text-muted-foreground">{order.buyerSnapshot.email}</p>}
                    <p className="mt-3 border-t pt-3 text-sm leading-6">{orderAddressLines(order.shippingAddressSnapshot, order.buyerSnapshot.phone, order.buyerSnapshot.email).map((line,index) => <span key={index} className="block">{line}</span>)}</p>
                    {order.metadata.tags.length > 0 && <p className="mt-2 text-xs text-muted-foreground">{order.metadata.tags.join(' · ')}</p>}
                  </Panel>
                  <section ref={(node) => { sections.current.delivery = node; }}><ShippingDetails order={order} /></section>
                  <div ref={shipmentJourney}><OrderShipmentJourney order={order} onUpdated={onUpdated} disabled={pending || Boolean(action) || Boolean(processingAction)} /></div>
                  {order.operations?.invoice?.requested && <Panel title="VAT invoice"><Field label="Company" value={order.operations.invoice.company} /><Field label="Tax ID" value={order.operations.invoice.taxId} /><Field label="Billing address" value={order.operations.invoice.address} /></Panel>}

                  <Panel title="Latest activity" action={<TextAction onClick={() => setTab('activity')}>View activity</TextAction>}>
                    {history.length ? <div className="space-y-3">{history.slice(0, 3).map((event) => <div key={event.key}><p className="break-words text-xs font-medium">{event.title}</p><p className="text-xs text-muted-foreground">{event.detail}</p><time className="mt-1 block text-xs text-muted-foreground">{formatDate(event.at)}</time></div>)}</div> : <p className="text-xs text-muted-foreground">No activity recorded.</p>}
                  </Panel>
                </div>
              </div>
          </div>
        </div>
      </div>
      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}><SheetContent className="overflow-y-auto sm:max-w-lg"><SheetHeader><SheetTitle>Order activity</SheetTitle><SheetDescription>Recorded events for {order.orderKey}</SheetDescription></SheetHeader><ol className="mt-6 space-y-4">{history.map((event) => <li key={event.key} className="border-b pb-3"><p className="text-sm font-medium">{event.title}</p><p className="text-sm text-muted-foreground">{event.detail}</p><time className="text-xs text-muted-foreground">{formatDate(event.at)}</time></li>)}</ol>{!history.length && <p className="mt-4 text-sm text-muted-foreground">No activity recorded.</p>}</SheetContent></Sheet>
      {processingAction && <OrderProcessingDialog order={order} action={processingAction} onClose={() => setProcessingAction(null)} onUpdated={updated => { onUpdated(updated); setSuccess('Order updated. Continue with the next step above.'); }} />}
      <Dialog open={action !== null} onOpenChange={(open) => !open && !pending && setAction(null)}>
        <DialogContent>{action && <><DialogHeader><DialogTitle>{actionCopy[action].title}</DialogTitle><DialogDescription>{actionCopy[action].description}</DialogDescription></DialogHeader><form onSubmit={(event) => { event.preventDefault(); submitAction(); }} className="space-y-4">{order.source === 'demo' && <p className="text-xs text-primary">Prototype · This action is simulated in this browser tab.</p>}<p className="text-xs text-muted-foreground">{order.orderKey} · {order.buyerSnapshot.name}</p>{actionCopy[action].label && <label className="grid gap-2 text-sm font-medium">{actionCopy[action].label}{['note', 'cancel', 'exception'].includes(action) ? <Textarea autoFocus required={action !== 'note'} maxLength={1000} disabled={pending} value={value} onChange={(e) => setValue(e.target.value)} rows={4} /> : <Input autoFocus required maxLength={1000} disabled={pending} value={value} onChange={(e) => setValue(e.target.value)} />}</label>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={pending} onClick={() => setAction(null)}>Back</Button><Button type="submit" variant={action === 'cancel' ? 'destructive' : 'default'} disabled={pending}>{pending ? 'Saving…' : actionCopy[action].submit}</Button></div></form></>}</DialogContent>
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
  return <div className="overflow-x-auto"><table aria-label="Order items" className="block w-full text-sm sm:table sm:min-w-[660px]">
    <thead className="hidden sm:table-header-group"><tr className="border-b text-xs text-muted-foreground"><th scope="col" className="pb-2 text-left font-medium">Product</th><th scope="col" className="px-3 pb-2 text-left font-medium">Inventory</th><th scope="col" className="px-3 pb-2 text-right font-medium">Qty</th><th scope="col" className="px-3 pb-2 text-right font-medium">Unit price</th><th scope="col" className="pb-2 pl-3 text-right font-medium">Amount</th></tr></thead>
    <tbody className="block sm:table-row-group">{order.lines.map((line, index) => {
      const stock = line.inventory;
      const available = stock ? stock.onHand - stock.committed + (stock.reservedForOrder ?? 0) : null;
      const sufficient = available !== null && available >= line.quantity;
      return <tr key={line.id || index} className="grid grid-cols-3 gap-x-3 border-b py-3 align-middle last:border-0 sm:table-row sm:py-0">
        <td className="col-span-3 block w-full min-w-0 pb-2 sm:table-cell sm:min-w-[230px] sm:py-3 sm:pr-3"><div className="flex items-start gap-2.5">
          {line.imageUrl ? <img src={line.imageUrl} alt={line.name} className="size-11 shrink-0 rounded-md border object-cover" /> : <span className="flex size-11 shrink-0 items-center justify-center rounded-md border bg-muted text-[10px] text-muted-foreground">No image</span>}
          <div className="min-w-0"><p className="break-words font-medium leading-5">{line.name}</p>{line.variant && <p className="mt-0.5 text-xs text-muted-foreground">{line.variant}</p>}<div className="flex items-center gap-1 text-xs text-muted-foreground"><span className="break-all">{line.sku}</span><CopyValue value={line.sku} label="SKU" /></div></div>
        </div></td>
        <td className="col-span-3 block pb-2 sm:table-cell sm:min-w-[140px] sm:px-3 sm:py-3">{stock ? <Popover><PopoverTrigger asChild><button type="button" aria-label={`Inventory details for ${line.sku}`} className="rounded-md px-2 py-1 text-left hover:bg-muted focus-visible:outline focus-visible:outline-primary"><span className={cn('block whitespace-nowrap text-xs font-medium', !sufficient && order.source !== 'demo' ? 'text-amber-700 dark:text-amber-300' : 'text-foreground')}>{order.source === 'demo' ? 'Sample stock' : 'Available'} · {available}</span><span className="mt-1 block whitespace-nowrap text-[11px] text-muted-foreground underline decoration-dotted underline-offset-4">Snapshot · {new Date(stock.checkedAt).toLocaleDateString('en-GB', {day:'2-digit', month:'short'})}</span></button></PopoverTrigger><PopoverContent align="start" className="w-80"><h3 className="text-sm font-semibold">Inventory snapshot</h3><p className="mt-1 break-words text-xs text-muted-foreground">{line.sku} · {stock.warehouse}</p><div className="mt-3"><Field label="On-hand" value={String(stock.onHand)} /><Field label="Committed" value={String(stock.committed)} /><Field label="Reserved for this order" value={stock.reservedForOrder == null ? 'Not reported' : String(stock.reservedForOrder)} /><Field label="Available to this order" value={String(available)} /></div><p className="mt-3 text-xs font-medium">{sufficient ? 'Sufficient at last check' : 'Insufficient at last check'}</p><p className="mt-1 text-xs text-muted-foreground">Checked {formatDate(stock.checkedAt)}</p><p className="mt-2 text-xs leading-5 text-muted-foreground">On-hand − committed + reserved for this order. This is the recorded snapshot, not a live inventory check.</p></PopoverContent></Popover> : <span className="text-xs text-muted-foreground">Not checked</span>}</td>
        <td className="block tabular-nums sm:table-cell sm:px-3 sm:py-3 sm:text-right"><span className="mb-1 block text-xs text-muted-foreground sm:hidden">Qty</span>{line.quantity}</td>
        <td className="block whitespace-nowrap tabular-nums sm:table-cell sm:px-3 sm:py-3 sm:text-right"><span className="mb-1 block text-xs text-muted-foreground sm:hidden">Unit price</span>{orderMoney(line.unitPrice, order.currencyCode)}</td>
        <td className="block whitespace-nowrap font-semibold tabular-nums sm:table-cell sm:py-3 sm:pl-3 sm:text-right"><span className="mb-1 block text-xs font-normal text-muted-foreground sm:hidden">Amount</span>{orderMoney(line.lineTotal ?? line.quantity * line.unitPrice, order.currencyCode)}</td>
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
  const [now,setNow]=useState(Date.now);
  useEffect(()=>{if(order.source === 'demo') return; const timer=setInterval(()=>setNow(Date.now()),60000);return()=>clearInterval(timer);},[order.source]);
  const due=Date.parse(order.operations?.shipBy || '');
  const active=['created','acknowledged','allocated','fulfillment_in_progress','partially_shipped'].includes(order.canonicalStatus);
  const minutes=Math.ceil((due-now)/60000);
  const overdue=order.source !== 'demo' && active && minutes < 0;
  const hours=Math.floor(Math.abs(minutes)/60);
  const duration=hours >= 24 ? `${Math.floor(hours/24)}d ${hours%24}h` : `${hours}h ${Math.abs(minutes)%60}m`;
  return <SummaryField label="Ship-by deadline">
    <span className={cn(overdue && 'text-rose-700 dark:text-rose-300')}>{Number.isFinite(due) ? new Date(due).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : 'Not provided'}</span>
    {order.source === 'demo' ? <span className="w-full text-xs font-normal text-muted-foreground">Sample deadline · No live SLA</span> : Number.isFinite(due) && active ? <span className={cn('w-full text-xs font-normal',overdue ? 'text-rose-700 dark:text-rose-300' : 'text-muted-foreground')}>{overdue ? 'Overdue' : 'Remaining'} · {duration}</span> : !active && <span className="w-full text-xs font-normal text-muted-foreground">{order.canonicalStatus === 'draft' ? 'Starts after submission' : order.canonicalStatus === 'canceled' ? 'Not applicable' : 'Dispatch complete'}</span>}
  </SummaryField>;
}

function ShippingDetails({ order }: { order: OrderRecord }) {
  const parcel = order.operations?.package;
  const carrier = order.operations?.carrier || order.shipments[0]?.carrier;
  const service = order.operations?.service || order.shipments[0]?.service;
  const showPacking = ['acknowledged', 'allocated', 'fulfillment_in_progress'].includes(order.canonicalStatus);
  return <Panel title="Shipping & packaging">
    <div className="flex flex-wrap items-center gap-2"><HandlingTypeBadge order={order} />{order.metadata.shippingMode && <span className="text-xs text-muted-foreground">{order.metadata.shippingMode === 'platform' ? 'Platform shipping' : 'Seller shipping'}</span>}</div>
    {carrier && <p className="mt-2 text-sm font-medium">{carrier}{service && <span className="font-normal text-muted-foreground"> · {service}</span>}</p>}
    {!carrier && <p className="mt-2 text-sm text-muted-foreground">Carrier not assigned</p>}
    {parcel && <p className="mt-3 border-t pt-3 text-sm"><span>{parcel.weightKg} kg</span><span className="mx-2 text-muted-foreground">·</span><span>{parcel.lengthCm} × {parcel.widthCm} × {parcel.heightCm} cm</span></p>}
    {showPacking && !parcel && <p className="mt-3 text-xs text-muted-foreground">Add package weight and dimensions when packing.</p>}
    {showPacking && <p className="mt-2 text-xs text-muted-foreground">{order.operations?.work?.labelAttachedAt ? 'Carrier label attached' : `Shipping label · ${order.operations?.printStatus?.shippingLabel || 'Not reported'}`}</p>}
    <details className="mt-3 border-t pt-3">
      <summary className="cursor-pointer text-xs font-medium text-muted-foreground">Stock reservation &amp; print status</summary>
      <div className="mt-2">
        <Field label="Reservation" value={order.reservation || 'Not reserved'} />
        <Field label="Pick list" value={order.operations?.printStatus?.pickList || 'Not reported'} />
        <Field label="Shipping label" value={order.operations?.work?.labelAttachedAt ? `Attached · ${formatDate(order.operations.work.labelAttachedAt)}` : order.operations?.printStatus?.shippingLabel || 'Not reported'} />
        <Field label="Packing slip" value={order.operations?.printStatus?.packingSlip || 'Not reported'} />
        <p className="mt-2 text-xs leading-5 text-muted-foreground">Opening the print dialog does not confirm a physical print. Verify the carrier label is attached before finishing packing.</p>
      </div>
    </details>
  </Panel>;
}

const processingHints: Record<ProcessingAction, string> = {
  'prepare-shipment': 'Review the prefilled details and verify packing, then mark the shipment ready in one form.',
  prepare: 'Choose the dispatch warehouse and check physical stock.',
  'record-shipment': 'Arrange shipping with the carrier, then add their tracking number and label.',
  pack: 'Verify each item, check parcel dimensions and attach the shipping label.',
  handover: 'Hand the parcel to the carrier, then record their pickup receipt.',
  delivery: 'Track the parcel. Record delivery only after receiving delivery evidence.',
};

function OrderProgress({ order }: { order: OrderRecord }) {
  if (order.canonicalStatus === 'draft' || order.canonicalStatus === 'canceled') return <p className="text-sm text-muted-foreground">{order.canonicalStatus === 'draft' ? 'Draft — not submitted yet.' : 'Cancelled — fulfillment stopped.'}</p>;
  return <ol aria-label="Order lifecycle" className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3 lg:grid-cols-6">
    {getOrderDetailSteps(order).map((step, index) => <li key={step.label} aria-current={step.current ? 'step' : undefined} className={cn('flex min-w-0 items-center gap-2 border-t-2 pt-2 text-xs', step.current || step.passed ? 'border-primary' : 'border-border')}>
      <span aria-hidden="true" className={cn('grid size-5 shrink-0 place-items-center rounded-full text-[11px]', step.current ? 'bg-primary text-primary-foreground' : step.passed ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>{step.passed ? <Check className="size-3" /> : index + 1}</span>
      <span className={cn('leading-4', step.current ? 'font-semibold' : 'text-muted-foreground')}>{step.label}{step.current && <span className="sr-only"> — Current step</span>}</span>
    </li>)}
  </ol>;
}

function SummaryField({ label, children }: { label: string; children: ReactNode }) {
  return <div className="min-w-0"><p className="text-xs text-muted-foreground">{label}</p><div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm font-medium">{children}</div></div>;
}
