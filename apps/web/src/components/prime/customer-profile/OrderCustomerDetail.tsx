import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Check, Info, LockKeyhole, Save, Search, Settings2, ShoppingBag, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { OrderLifecycleBadge } from '@/components/orders/OrderLifecycleBadge';
import { orderDisplayStatus } from '@/lib/orders-api';
import { customerDate, customerMoney, customerSpendDescription, type OrderCustomer } from '@/lib/order-customers';
import { customerDateTime, customerOrderStats, customerProfileDrafts, customerProfileKey, customerRelativeTime, customerUpdatedAt, readCustomerProfile, saveCustomerProfile } from '@/lib/customer-profile-details';
import type { RankResult } from '@/lib/customer-ranks';
import { CustomerChannelLogos } from './CustomerChannelLogos';
import { CustomerAvatar } from './CustomerAvatar';
import { CustomerRankDetails } from './CustomerRankDetails';
import { RankLabel } from './CustomerRankBadge';

function Help({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return <TooltipProvider delayDuration={150}><Tooltip open={open} onOpenChange={setOpen}><TooltipTrigger asChild><button type="button" aria-label={label} onClick={() => setOpen(!open)} className="inline-flex size-11 items-center justify-center rounded text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Info className="size-3.5" aria-hidden="true" /></button></TooltipTrigger><TooltipContent className="max-w-72 leading-relaxed motion-reduce:animate-none">{children}</TooltipContent></Tooltip></TooltipProvider>;
}

function ReadOnlyField({ label, value, hint, wide = false }: { label: string; value: string; hint?: string; wide?: boolean }) {
  return <div className={wide ? 'sm:col-span-2' : ''}><label className="block text-xs font-medium text-muted-foreground"><span className="mb-2 flex items-center gap-1.5">{label}<LockKeyhole className="size-3" aria-hidden="true" /></span><Input value={value || 'Not provided'} readOnly className="h-11 bg-muted/35 text-sm font-normal text-foreground shadow-none" /></label>{hint && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{hint}</p>}</div>;
}

function CustomerOrders({ customer }: { customer: OrderCustomer }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const filtered = customer.orders.filter(order => `${order.orderKey} ${order.metadata.store} ${order.buyerSnapshot.name}`.toLowerCase().includes(search.trim().toLowerCase()));
  const current = Math.min(page, Math.max(0, Math.ceil(filtered.length / 15) - 1));
  const visible = filtered.slice(current * 15, (current + 1) * 15);
  return <section aria-label="Order history" className="min-w-0 overflow-hidden rounded-xl border bg-card">
    <div className="space-y-4 border-b p-5"><div><h2 className="text-base font-semibold">Order history</h2><p className="mt-1 text-sm text-muted-foreground">Every order linked to this profile, across all sales channels.</p></div><div className="relative min-w-0"><Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground" aria-hidden="true" /><Input aria-label="Search customer orders" placeholder="Search order ID, channel or buyer…" value={search} onChange={event => { setSearch(event.target.value); setPage(0); }} className="h-11 pl-9" /></div></div>
    {!filtered.length ? <div className="p-8 text-center"><p className="font-medium">No matching orders</p><p className="mt-2 text-sm text-muted-foreground">Try another order ID, channel or buyer, or clear your search.</p><Button type="button" variant="outline" className="mt-4 min-h-11" onClick={() => { setSearch(''); setPage(0); }}>Clear search</Button></div> : <>
      <div className="hidden overflow-x-auto md:block"><table className="w-full text-left text-sm"><caption className="sr-only">Orders for {customer.name}, newest first</caption><thead className="border-b bg-muted/30 text-xs text-muted-foreground"><tr>{['Order', 'Channel', 'Status', 'Payment', 'Order total'].map(label => <th key={label} scope="col" className={`px-5 py-3 font-medium ${label === 'Order total' ? 'text-right' : ''}`}>{label}</th>)}</tr></thead><tbody className="divide-y">{visible.map(order => <tr key={order.id} className="hover:bg-muted/20"><td className="px-5 py-4"><Link className="inline-flex min-h-11 items-center gap-1.5 rounded font-medium text-primary dark:text-violet-300 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" to={`/orders?order=${encodeURIComponent(order.id)}`} aria-label={`View order ${order.orderKey}`}>{order.orderKey}<ArrowUpRight className="size-3.5 shrink-0" aria-hidden="true" /></Link><p className="text-xs text-muted-foreground">{customerDate(order.orderedAt)}</p><p className="mt-1 text-xs text-muted-foreground">{order.buyerSnapshot.name || 'Name not provided'}</p></td><td className="px-5 py-4"><CustomerChannelLogos orders={[order]} /></td><td className="px-5 py-4"><OrderLifecycleBadge status={orderDisplayStatus(order)} /></td><td className="px-5 py-4 text-muted-foreground">{order.payment.state}</td><td className="whitespace-nowrap px-5 py-4 text-right font-medium tabular-nums">{customerMoney(order.totals.grandTotal, order.currencyCode)}</td></tr>)}</tbody></table></div>
      <div className="divide-y md:hidden">{visible.map(order => <article key={order.id} className="space-y-3 p-4"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><Link to={`/orders?order=${encodeURIComponent(order.id)}`} className="inline-flex min-h-11 items-center break-all text-sm font-medium text-primary underline-offset-4 hover:underline" aria-label={`View order ${order.orderKey}`}>{order.orderKey}<ArrowUpRight className="ml-1 size-4 shrink-0" aria-hidden="true" /></Link><p className="text-xs text-muted-foreground">{customerDate(order.orderedAt)}</p></div><CustomerChannelLogos orders={[order]} /></div><div className="flex flex-wrap justify-between gap-2"><OrderLifecycleBadge status={orderDisplayStatus(order)} /><span className="text-sm font-medium tabular-nums">{customerMoney(order.totals.grandTotal, order.currencyCode)}</span></div><p className="text-xs text-muted-foreground">{order.payment.state} · {order.buyerSnapshot.name || 'Name not provided'}</p></article>)}</div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3 text-xs text-muted-foreground"><p role="status">{current * 15 + 1}–{Math.min((current + 1) * 15, filtered.length)} of {filtered.length} orders</p>{filtered.length > 15 && <div className="flex gap-2"><Button type="button" variant="outline" className="min-h-11" disabled={current === 0} onClick={() => setPage(current - 1)}>Previous orders</Button><Button type="button" variant="outline" className="min-h-11" disabled={(current + 1) * 15 >= filtered.length} onClick={() => setPage(current + 1)}>Next orders</Button></div>}</div>
    </>}
  </section>;
}

export function OrderCustomerDetail({ customer, rank, scope, identity, canWrite, onBack, onSaved, onRankSettings }: {
  customer: OrderCustomer; rank: RankResult; scope: string; identity: string; canWrite: boolean;
  onBack: () => void; onSaved: () => void; onRankSettings: () => void;
}) {
  const [params, setParams] = useSearchParams();
  const [stored, setStored] = useState(() => readCustomerProfile(scope, identity));
  const draftKey = customerProfileKey(scope, identity);
  const [draft] = useState(() => customerProfileDrafts.read(draftKey));
  const [name, setName] = useState(draft?.name ?? (stored.value.displayName || customer.name));
  const [baselineName, setBaselineName] = useState(stored.value.displayName || customer.name);
  const [notes, setNotes] = useState(draft?.notes ?? stored.value.notes);
  const [error, setError] = useState('');
  const [savedNotice, setSavedNotice] = useState('');
  const [discard, setDiscard] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const savedName = stored.value.displayName || customer.name;
  const dirty = name.trim() !== baselineName || notes !== stored.value.notes;
  const [baseRevision, setBaseRevision] = useState(draft?.revision ?? stored.value.revision);
  const editable = canWrite && !stored.error;
  const tab = params.get('tab') === 'orders' ? 'orders' : 'details';
  const section = params.get('section');
  const stats = customerOrderStats(customer);
  const updatedAt = customerUpdatedAt(stats.lastActivity, stored.value.savedAt);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  const address = customer.address && [customer.address.address, customer.address.city, customer.address.postalCode, customer.address.country].filter(Boolean).join(', ');
  useEffect(() => {
    const target = section === 'rank' ? rootRef.current?.querySelector<HTMLElement>('[data-customer-rank]') : headingRef.current;
    target?.focus();
  }, [section]);
  useEffect(() => {
    // A background order refresh must not turn an untouched form into an edit.
    if (!dirty && savedName !== baselineName) { setName(savedName); setBaselineName(savedName); }
  }, [dirty, savedName, baselineName]);
  useEffect(() => {
    if (dirty) customerProfileDrafts.set(draftKey, { name, notes, revision: baseRevision });
    else customerProfileDrafts.clear(draftKey);
  }, [dirty, name, notes, baseRevision, draftKey]);

  function reset() { setName(savedName); setBaselineName(savedName); setNotes(stored.value.notes); setBaseRevision(stored.value.revision); setError(''); setSavedNotice(''); customerProfileDrafts.clear(draftKey); }
  function save() {
    if (!editable || !dirty) return;
    if (!name.trim() || name.trim().length > 100) { setError('Enter a display name of 1–100 characters.'); nameRef.current?.focus(); return; }
    try {
      const value = saveCustomerProfile(scope, identity, { displayName: name, notes }, baseRevision);
      setStored({ value }); setBaseRevision(value.revision); setName(value.displayName); setBaselineName(value.displayName); setError(''); customerProfileDrafts.clear(draftKey); setSavedNotice('Profile changes saved in this browser. Original orders are unchanged.'); onSaved();
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not save profile changes. Please try again.'); }
  }

  return <section ref={rootRef} aria-label="Customer detail" className="min-w-0 space-y-5">
    <header aria-label="Customer profile header" className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 max-w-full items-start gap-2">
        <Button type="button" variant="ghost" size="icon" className="size-11 shrink-0" aria-label="Back to customers" onClick={() => dirty ? setDiscard(true) : onBack()}><ArrowLeft className="size-5" aria-hidden="true" /></Button>
        <div className="grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1">
          <div className="sm:row-span-2"><CustomerAvatar name={savedName} /></div>
          <div className="flex flex-wrap items-center gap-2"><h1 ref={headingRef} tabIndex={-1} className="min-w-0 break-words text-xl font-semibold leading-7 tracking-tight outline-none">{savedName}</h1><RankLabel rank={rank.key} /></div>
          <div aria-label="Customer metadata" className="col-span-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground sm:col-span-1 sm:col-start-2">
            <span className="min-w-0 [overflow-wrap:anywhere]">{customer.email || 'Email not provided'}</span>
            <span className="inline-flex min-w-0 max-w-full items-center gap-2"><span aria-hidden="true">·</span><span className="shrink-0">ID</span><code className="min-w-0 rounded border bg-muted/50 px-1.5 py-0.5 font-mono text-xs [overflow-wrap:anywhere]">{customer.id}</code></span>
            <span className="inline-flex items-center gap-2"><span aria-hidden="true">·</span>{updatedAt ? <time dateTime={updatedAt} title={`Latest order activity or saved profile edit: ${customerDateTime(updatedAt)}`}>Updated {customerRelativeTime(updatedAt, now)}</time> : <span>Updated —</span>}</span>
          </div>
        </div>
      </div>
      {dirty && editable && <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto"><span className="mr-1 text-xs text-muted-foreground">Unsaved changes</span><Button type="button" variant="outline" className="min-h-11" onClick={reset}>Cancel edits</Button><Button type="button" className="min-h-11 gap-2" onClick={save}><Save className="size-4" aria-hidden="true" />Save changes</Button></div>}
    </header>
    {stored.error && <p role="alert" className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive">{stored.error}</p>}
    {error && <div role="alert" className="flex flex-wrap items-center gap-2 rounded-lg border border-destructive/30 p-3 text-sm text-destructive"><p>{error}</p><Button type="button" variant="outline" className="min-h-11 text-foreground" onClick={() => { const next = readCustomerProfile(scope, identity); setStored(next); setName(next.value.displayName || customer.name); setBaselineName(next.value.displayName || customer.name); setNotes(next.value.notes); setBaseRevision(next.value.revision); setError(''); customerProfileDrafts.clear(draftKey); }}>Reload saved details</Button></div>}
    {savedNotice && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Check className="size-4 shrink-0" aria-hidden="true" />{savedNotice}</p>}
    <Tabs value={tab} onValueChange={value => { const next = new URLSearchParams(params); if (value === 'orders') next.set('tab', 'orders'); else next.delete('tab'); next.delete('section'); setParams(next, { replace: true }); }}>
      <TabsList aria-label="Customer sections" className="h-auto w-full justify-start gap-1 rounded-none border-b bg-transparent p-0"><TabsTrigger value="details" className="min-h-12 rounded-none border-b-2 border-transparent px-4 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none dark:data-[state=active]:text-foreground motion-reduce:transition-none"><UserRound className="size-4" aria-hidden="true" />Details</TabsTrigger><TabsTrigger value="orders" className="min-h-12 rounded-none border-b-2 border-transparent px-4 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none dark:data-[state=active]:text-foreground motion-reduce:transition-none"><ShoppingBag className="size-4" aria-hidden="true" />Orders<span className="rounded bg-muted px-1.5 py-0.5 text-xs tabular-nums">{stats.count}</span></TabsTrigger></TabsList>
      <div className="mt-5 grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <TabsContent value="details" className="mt-0 space-y-5">
            <section aria-label="Contact details" className="rounded-xl border bg-card">
              <div className="border-b px-5 py-4 sm:px-6"><h2 className="text-base font-semibold">Customer information</h2><p className="mt-1 text-sm text-muted-foreground">Contact details are synced from orders. Only the display name and internal notes can be edited here.</p></div>
              <div className="space-y-6 p-5 sm:p-6">
                <div className="grid gap-x-6 gap-y-6 sm:grid-cols-2">
                  <ReadOnlyField label="Email" value={customer.email} hint="Latest available email from an order. Not used for automatic grouping." />
                  <div><label htmlFor="customer-display-name" className="mb-2 block text-xs font-medium text-muted-foreground">Display name <span aria-hidden="true">*</span></label><Input id="customer-display-name" ref={nameRef} value={name} maxLength={100} required readOnly={!editable} onChange={event => { setName(event.target.value); setSavedNotice(''); }} className="h-11" aria-describedby="customer-name-hint" aria-invalid={!name.trim()} /><p id="customer-name-hint" className="mt-2 text-xs leading-relaxed text-muted-foreground">A label for your team. Buyer names on existing orders stay unchanged.</p></div>
                  <ReadOnlyField label="Phone" value={customer.phone} hint="Orders with the same valid buyer phone are grouped across channels. Masked numbers remain separate." />
                  <div><p className="mb-2 text-xs font-medium text-muted-foreground">Rank</p><div className="flex min-h-11 flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/35 px-3"><RankLabel rank={rank.key} /><span className="text-xs text-muted-foreground">Automatic</span></div><button type="button" onClick={onRankSettings} className="mt-1 inline-flex min-h-11 items-center gap-1.5 rounded text-xs text-primary dark:text-violet-300 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Settings2 className="size-3.5" aria-hidden="true" />View rank rules</button></div>
                  <ReadOnlyField label="Latest address" value={address || 'Not provided on the latest order'} hint="Shipping address on the most recent order. This does not update earlier orders." wide />
                </div>
                <div className="border-t pt-5"><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><label htmlFor="customer-notes" className="text-sm font-medium">Internal notes</label><span className="text-xs text-muted-foreground">Not visible to the customer</span></div><Textarea id="customer-notes" value={notes} readOnly={!editable} maxLength={2000} onChange={event => { setNotes(event.target.value); setSavedNotice(''); }} className="min-h-28 resize-y" placeholder="Preferences, follow-up context or details your team should know…" aria-describedby="customer-notes-hint" /><div className="mt-2 flex items-start justify-between gap-3 text-xs text-muted-foreground"><p id="customer-notes-hint" className="max-w-lg leading-relaxed">{editable ? 'Prototype: edits are saved only in this browser for your workspace and account. Use demo information only.' : 'View only. You do not have permission to edit this profile.'}</p><span className="shrink-0 tabular-nums">{notes.length}/2,000</span></div>{stored.value.savedAt && <p className="mt-2 text-xs text-muted-foreground">Profile edits saved {customerDateTime(stored.value.savedAt)} (your local time).</p>}</div>
                <dl className="grid gap-x-6 gap-y-5 border-t pt-5 text-sm sm:grid-cols-2">{[['Latest order', customerDateTime(stats.latest)], ['First order', customerDateTime(stats.oldest)], ['Latest order activity', customerDateTime(stats.lastActivity)], ['Customer ID', customer.id]].map(([label, value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-2 break-all font-medium">{value}</dd></div>)}</dl><p className="text-xs text-muted-foreground">Dates use your local timezone. Activity is based on order events, not profile edits.</p>
              </div>
            </section>
          </TabsContent>
          <TabsContent value="orders" className="mt-0"><CustomerOrders customer={customer} /></TabsContent>
        </div>
        <aside aria-label="Customer summary" className="grid min-w-0 items-start gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <section aria-label="Purchase summary" className="overflow-hidden rounded-xl border bg-card"><h2 className="border-b px-4 py-3 text-sm font-semibold">Purchase summary</h2><dl className="divide-y">
            <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-2 px-4 py-1"><dt className="text-xs text-muted-foreground">Total orders</dt><dd className="text-sm font-semibold tabular-nums">{stats.count}</dd></div>
            <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-2 px-4 py-1"><dt className="flex items-center text-xs text-muted-foreground">Total spent<Help label="How total spent is calculated">{customerSpendDescription} This differs from qualifying spend used for rank.</Help></dt><dd className="ml-auto flex min-w-0 flex-col text-right text-sm font-semibold tabular-nums [overflow-wrap:anywhere]">{customer.spent.map(total => <span key={total.currency}>{customerMoney(total.amount, total.currency)}</span>)}</dd></div>
            <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-2 px-4 py-1"><dt className="flex items-center text-xs text-muted-foreground">Completed rate<Help label="How completed rate is calculated">Completed orders divided by all orders linked to this profile. Draft orders are excluded.</Help></dt><dd className="ml-auto text-right text-sm font-semibold tabular-nums">{stats.completedRate}%<span className="block text-xs font-normal text-muted-foreground">{stats.completed} of {stats.count} orders</span></dd></div>
            <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-2 px-4 py-1"><dt className="flex items-center text-xs text-muted-foreground">Cancelled rate<Help label="How cancelled rate is calculated">Cancelled orders divided by all orders linked to this profile. Delivery retries and returns are not counted as cancellations.</Help></dt><dd className="ml-auto text-right text-sm font-semibold tabular-nums">{stats.cancelledRate}%<span className="block text-xs font-normal text-muted-foreground">{stats.cancelled} of {stats.count} orders</span></dd></div>
          </dl></section>
          <CustomerRankDetails rank={rank} />
        </aside>
      </div>
    </Tabs>
    <AlertDialog open={discard} onOpenChange={setDiscard}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Discard profile changes?</AlertDialogTitle><AlertDialogDescription>Your display name and notes have not been saved. Leave this profile without those changes?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep editing</AlertDialogCancel><AlertDialogAction onClick={() => { reset(); onBack(); }}>Discard changes</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </section>;
}
