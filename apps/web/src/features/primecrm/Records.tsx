import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ordersApi } from '@/lib/orders-api';
import { buildOrderCustomers, type OrderCustomer } from '@/lib/order-customers';
import { readCustomerGroups } from '@/lib/customer-grouping-storage';
import { customerProfileIdentity, readCustomerProfile } from '@/lib/customer-profile-details';
import { useCrm } from './context';
import { guestLevel, historyCsv, recordEvent, type Guest } from './model';
import { Blank, downloadCsv, Field, fieldClass, MainLink } from './Shared';

export function GuestDetails({ guest, compact = false }: { guest: Guest; compact?: boolean }) {
  const [editing, setEditing] = useState(!compact);
  const { state, scope, update } = useCrm();
  const [notes, setNotes] = useState(guest.notes);
  const [phone, setPhone] = useState(guest.phone);
  const [email, setEmail] = useState(guest.email);
  const [customers, setCustomers] = useState<OrderCustomer[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function loadCustomers() {
    setLoading(true); setError('');
    try {
      const response = await ordersApi.list();
      const grouping = readCustomerGroups(scope);
      if (grouping.error) throw new Error(grouping.error);
      setCustomers(buildOrderCustomers(response.data, grouping.groups).map(customer => ({ ...customer, name: readCustomerProfile(scope, customerProfileIdentity(customer, grouping.groups)).value.displayName || customer.name })));
      setLoaded(true);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to load customers. Try again.'); }
    finally { setLoading(false); }
  }
  function save(patch: Partial<Guest>, action: string) {
    const success = update(current => {
      const next = { ...current, guests: current.guests.map(item => item.id === guest.id ? { ...item, ...patch } : item) };
      const conversation = current.conversations.find(item => item.guestId === guest.id);
      return conversation ? recordEvent(next, conversation, action, guest.name) : next;
    });
    if (success) { setNotice('Saved in this browser.'); if (compact) setEditing(false); }
  }
  return <section className="space-y-4">
    <div><h2 className="font-semibold">Customer information</h2><p className="mt-3 font-medium">{guest.name}</p><p className="text-sm text-muted-foreground">{guest.channel} · @{guest.handle}</p><p className="mt-2 text-xs text-muted-foreground">Guest level: {guestLevel(state, guest.id)} · based on interaction, not spending</p></div>
    {!editing && <div className="space-y-3 text-sm"><dl className="space-y-3"><div><dt className="text-xs text-muted-foreground">Phone</dt><dd>{guest.phone || 'Not provided'}</dd></div><div><dt className="text-xs text-muted-foreground">Email</dt><dd className="break-all">{guest.email || 'Not provided'}</dd></div></dl><details><summary>Contact notes</summary><p className="mt-2 whitespace-pre-wrap break-words">{guest.notes || 'No notes yet.'}</p></details><Button variant="outline" onClick={() => setEditing(true)}>Edit contact</Button></div>}
    {editing && <form className="space-y-3" onSubmit={event => { event.preventDefault(); save({ phone: phone.trim(), email: email.trim(), notes: notes.trim() }, 'Guest details updated'); }}>
      <Field label="Guest phone"><Input className="min-h-11" type="tel" value={phone} onChange={event => setPhone(event.target.value)} maxLength={40} /></Field>
      <Field label="Guest email"><Input className="min-h-11" type="email" value={email} onChange={event => setEmail(event.target.value)} maxLength={200} /></Field>
      <Field label="Internal notes"><textarea className={fieldClass} rows={3} maxLength={4000} value={notes} onChange={event => setNotes(event.target.value)} /></Field>
      <Button variant="outline" className="min-h-11" type="submit">Save guest details</Button>
      {compact && <Button type="button" variant="ghost" onClick={() => { setPhone(guest.phone); setEmail(guest.email); setNotes(guest.notes); setEditing(false); }}>Cancel</Button>}
    </form>}
    {notice && <p role="status" className="text-xs text-muted-foreground">{notice}</p>}
    <div className="space-y-3 border-t pt-4"><h3 className="text-sm font-semibold">Customer in Main</h3>
      {(!compact || loaded) && <p className="text-xs leading-5 text-muted-foreground">A social guest can exist without a purchase. Link only after verifying the customer’s identity. Linking does not merge or overwrite either profile.</p>}
      {guest.customerId ? <><MainLink to={`/customers?customer=${encodeURIComponent(guest.customerId)}`}>Open customer in Main</MainLink><Button variant="ghost" className="min-h-11" onClick={() => save({ customerId: undefined }, 'Customer unlinked')}>Unlink customer</Button></> : <>
        <Button variant="outline" className="min-h-11" onClick={() => void loadCustomers()} disabled={loading}>{loading ? 'Loading customers…' : loaded ? 'Refresh Main customers' : 'Find customer in Main'}</Button>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {loaded && (customers.length ? <form className="space-y-3" onSubmit={event => { event.preventDefault(); if (customers.some(item => item.id === customerId)) save({ customerId }, 'Customer linked'); }}><Field label="Verified Main customer"><select className={fieldClass} required value={customerId} onChange={event => setCustomerId(event.target.value)}><option value="">Choose a customer</option>{customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name} · {customer.phone || customer.email || 'No contact details'}</option>)}</select></Field><Button className="min-h-11" disabled={!customerId}>Confirm customer link</Button></form> : <p className="text-sm text-muted-foreground">No customers in Main yet. Customers appear after orders are created.</p>)}
      </>}
    </div>
  </section>;
}

export function Guests() {
  const { state } = useCrm();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [linked, setLinked] = useState('all');
  const selected = state.guests.find(guest => guest.id === params.get('guest'));
  const rows = state.guests.filter(guest => `${guest.name} ${guest.channel} ${guest.phone} ${guest.email}`.toLowerCase().includes(query.toLowerCase()) && (linked === 'all' || Boolean(guest.customerId) === (linked === 'linked')));
  return <div className="space-y-5 p-4 md:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Contacts / Guests</h2><p className="mt-1 text-sm text-muted-foreground">People who have contacted your channels, including those who have not purchased.</p></div><MainLink to="/customers">Main customer directory</MainLink></div>
    <div className="grid gap-3 sm:grid-cols-2"><Field label="Search guests"><Input className="min-h-11" value={query} onChange={event => setQuery(event.target.value)} placeholder="Name, channel, phone or email" /></Field><Field label="Customer link"><select className={fieldClass} value={linked} onChange={event => setLinked(event.target.value)}><option value="all">All guests</option><option value="linked">Linked to Main</option><option value="unlinked">Not linked</option></select></Field></div>
    <div className={`grid gap-5 ${selected ? 'xl:grid-cols-[minmax(0,1fr)_340px]' : ''}`}><div className="overflow-x-auto rounded-lg border">{rows.length ? <table><thead><tr><th>Guest</th><th>Channel</th><th>Interaction level</th><th>Customer link</th><th>Actions</th></tr></thead><tbody>{rows.map(guest => <tr key={guest.id}><td><button className="min-h-11 text-left font-medium underline" onClick={() => { const next = new URLSearchParams(params); next.set('guest', guest.id); setParams(next); }}>{guest.name}</button></td><td>{guest.channel}</td><td>{guestLevel(state, guest.id)}</td><td>{guest.customerId ? 'Linked' : 'Not linked'}</td><td><Link className="inline-flex min-h-11 items-center whitespace-nowrap underline" to={`/inbox/conversation?conversation=${state.conversations.find(item => item.guestId === guest.id)?.id || ''}`}>Open conversation</Link></td></tr>)}</tbody></table> : <Blank title="No guests found">Guests appear when conversations arrive. Try another filter or connect a channel in Main.</Blank>}</div>
      {selected && <aside className="rounded-lg border p-4"><div className="mb-3 flex justify-end"><Button variant="ghost" className="min-h-11" onClick={() => { const next = new URLSearchParams(params); next.delete('guest'); setParams(next); }}>Close guest details</Button></div><GuestDetails key={selected.id} guest={selected} /></aside>}
    </div>
  </div>;
}

export function CrmHistory() {
  const { state } = useCrm();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const events = state.history.filter(event => (!params.get('conversation') || event.conversationId === params.get('conversation')) && `${event.action} ${event.detail} ${state.guests.find(guest => guest.id === event.guestId)?.name}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="space-y-5 p-4 md:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Response History</h2><p className="mt-1 text-sm text-muted-foreground">Replies, assignments, resolution and customer links recorded in this prototype.</p></div><Button variant="outline" className="min-h-11" disabled={!events.length} onClick={() => downloadCsv('prime-crm-history.csv', historyCsv(state, events))}>Export CSV</Button></div>
    <Field label="Search history"><Input className="min-h-11" value={query} onChange={event => setQuery(event.target.value)} /></Field>
    {params.get('conversation') && <Button variant="outline" className="min-h-11" onClick={() => { const next = new URLSearchParams(params); next.delete('conversation'); setParams(next); }}>Show all conversations</Button>}
    <div className="overflow-x-auto rounded-lg border">{events.length ? <table><thead><tr><th>Time</th><th>Guest</th><th>Action</th><th>Detail</th></tr></thead><tbody>{events.map(event => <tr key={event.id}><td className="whitespace-nowrap">{new Date(event.at).toLocaleString()}</td><td><Link className="inline-flex min-h-11 items-center underline" to={`/inbox/conversation?conversation=${event.conversationId}`}>{state.guests.find(guest => guest.id === event.guestId)?.name}</Link></td><td>{event.action}</td><td className="max-w-md whitespace-pre-wrap break-words">{event.detail}</td></tr>)}</tbody></table> : <Blank title="No history yet">Reply to, assign or resolve a conversation to record an event.</Blank>}</div>
  </div>;
}

export function CrmAnalytics() {
  const { state } = useCrm();
  const [channel, setChannel] = useState('all');
  const channels = [...new Set(state.guests.map(guest => guest.channel))];
  const guests = state.guests.filter(guest => channel === 'all' || guest.channel === channel);
  const conversations = state.conversations.filter(item => guests.some(guest => guest.id === item.guestId));
  const replies = conversations.reduce((sum, item) => sum + item.messages.filter(message => message.direction === 'outbound').length, 0);
  const metrics = [['Conversations', conversations.length], ['Guests', guests.length], ['Replies simulated', replies], ['Resolved', conversations.filter(item => item.status === 'resolved').length], ['Linked Main orders', new Set(conversations.flatMap(item => item.orderIds)).size]];
  return <div className="space-y-6 p-4 md:p-6"><div><h2 className="text-lg font-semibold">CRM Analytics</h2><p className="mt-1 text-sm text-muted-foreground">Counts are calculated from this browser’s CRM activity. Business revenue is reported in Main.</p></div><div className="max-w-sm"><Field label="Analytics channel"><select className={fieldClass} value={channel} onChange={event => setChannel(event.target.value)}><option value="all">All channels</option>{channels.map(name => <option key={name}>{name}</option>)}</select></Field></div>
    <dl className="grid grid-cols-2 gap-5 border-y py-5 lg:grid-cols-5">{metrics.map(([label, value]) => <div key={label}><dt className="text-sm text-muted-foreground">{label}</dt><dd className="mt-2 text-3xl font-semibold tabular-nums">{value}</dd></div>)}</dl>
    {!conversations.length ? <Blank title="No CRM activity yet">Conversation activity will appear here when available.</Blank> : <div className="overflow-x-auto"><table><thead><tr><th>Channel</th><th>Conversations</th><th>Open</th><th>Resolved</th></tr></thead><tbody>{channels.filter(name => channel === 'all' || channel === name).map(name => { const rows = conversations.filter(item => state.guests.find(guest => guest.id === item.guestId)?.channel === name); return <tr key={name}><td>{name}</td><td>{rows.length}</td><td>{rows.filter(item => item.status === 'open').length}</td><td>{rows.filter(item => item.status === 'resolved').length}</td></tr>; })}</tbody></table></div>}
    <MainLink to="/client-reports">Business analytics in Main</MainLink>
  </div>;
}
