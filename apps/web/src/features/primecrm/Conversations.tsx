import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, MessageCircle, PanelRight, Search, Send, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { EmptyState } from '@/components/system/EmptyState';
import { ManualOrderDialog } from '@/components/orders/ManualOrderDialog';
import { useCrm } from './context';
import { recordEvent, replyToConversation, type Conversation } from './model';
import { Blank, Field, fieldClass, MainLink } from './Shared';
import { GuestDetails } from './Records';

export function Conversations() {
  const { state, update, actor } = useCrm();
  const [params, setParams] = useSearchParams();
  const [wide, setWide] = useState(() => window.innerWidth >= 1440);
  const [profileOpen, setProfileOpen] = useState(() => window.innerWidth >= 1440);
  const [mobileChat, setMobileChat] = useState(() => Boolean(params.get('conversation')));
  useEffect(() => { const resize = () => setWide(window.innerWidth >= 1440); window.addEventListener('resize', resize); return () => window.removeEventListener('resize', resize); }, []);
  const [query, setQuery] = useState('');
  const [channel, setChannel] = useState('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [tag, setTag] = useState('all');
  const assignee = ['mine', 'unassigned'].includes(params.get('assignee') ?? '') ? params.get('assignee')! : 'all';
  const setAssignee = (value: string) => setParams(current => {
    const next = new URLSearchParams(current);
    next.delete('conversation');
    if (value === 'all') next.delete('assignee'); else next.set('assignee', value);
    return next;
  });
  const [type, setType] = useState('all');
  const [page, setPage] = useState('all');
  const [status, setStatus] = useState('open');
  const [unread, setUnread] = useState(false);
  const [orderFor, setOrderFor] = useState<string | null>(null);
  const [orderNotice, setOrderNotice] = useState('');
  const channels = [...new Set(state.guests.map(item => item.channel))];
  const pages = [...new Set(state.conversations.filter(item => channel === 'all' || state.guests.find(guest => guest.id === item.guestId)?.channel === channel).map(item => item.page))];
  const filterSummary = [status === 'open' ? 'Open' : status === 'resolved' ? 'Resolved' : '', type === 'all' ? '' : type === 'chat' ? 'Chats' : 'Comments', unread ? 'Unread only' : '', tag === 'all' ? '' : tag, assignee === 'mine' ? 'Assigned to me' : assignee === 'unassigned' ? 'Unassigned' : ''].filter(Boolean);
  const visible = state.conversations.filter(conversation => {
    const guest = state.guests.find(item => item.id === conversation.guestId);
    return (channel === 'all' || guest?.channel === channel) && (tag === 'all' || conversation.tags.includes(tag)) && (assignee === 'all' || (assignee === 'mine' ? conversation.assignedTo === actor : !conversation.assignedTo)) && (type === 'all' || conversation.type === type) && (page === 'all' || conversation.page === page) && (status === 'all' || conversation.status === status) && (!unread || conversation.unread) && `${guest?.name} ${guest?.channel} ${conversation.messages.at(-1)?.text}`.toLowerCase().includes(query.toLowerCase());
  });
  const requested = params.get('conversation');
  const active = requested ? state.conversations.find(item => item.id === requested) : visible[0];
  const guest = state.guests.find(item => item.id === active?.guestId);
  function select(conversation: Conversation) {
    setMobileChat(true);
    const next = new URLSearchParams(params); next.set('conversation', conversation.id); setParams(next);
    update(current => ({ ...current, conversations: current.conversations.map(item => item.id === conversation.id ? { ...item, unread: false } : item) }));
  }
  function changeFilters(change: () => void, clearAssignee = false) { change(); const next = new URLSearchParams(params); next.delete('conversation'); if (clearAssignee) next.delete('assignee'); setParams(next, { replace: true }); }
  function patchConversation(patch: Partial<Conversation>, action?: string) {
    if (!active) return;
    update(current => {
      const next = { ...current, conversations: current.conversations.map(item => item.id === active.id ? { ...item, ...patch } : item) };
      return action ? recordEvent(next, active, action, patch.assignedTo || patch.status || (patch.tags ?? []).join(', ')) : next;
    });
  }
  if (!state.conversations.length) return <div className="p-4 md:p-6" data-testid="inbox-no-data"><EmptyState className="min-h-80" icon={<MessageCircle aria-hidden="true" />} title="No conversations yet" description="Connect a channel to receive your first customer message. New conversations will appear here automatically." action={<Button className="min-h-11" asChild><Link to="/sales-channels/conversation-channels">Connect conversation channel</Link></Button>} /></div>;
  const orderConversation = state.conversations.find(item => item.id === orderFor);
  const orderGuest = state.guests.find(item => item.id === orderConversation?.guestId);
  return <>
    <div className={`crm-conversations ${wide && profileOpen ? 'crm-profile-visible' : ''} ${mobileChat ? 'crm-mobile-chat' : ''}`}>
      <aside className="crm-thread-list border-r">
        <div className="crm-list-controls grid gap-2 border-b p-3">
          <h2 className="flex items-center justify-between gap-2 text-sm font-semibold">Conversations <span className="text-xs font-normal text-muted-foreground">{state.conversations.filter(item => item.unread).length} unread</span></h2>
          <div className="relative"><Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" aria-hidden="true" /><Input aria-label="Search conversations" className="crm-compact-control pl-8" value={query} onChange={event => changeFilters(() => setQuery(event.target.value))} placeholder="Search conversations..." /></div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <select aria-label="Channel" className={`${fieldClass} crm-compact-control`} value={channel} onChange={event => changeFilters(() => { setChannel(event.target.value); setPage('all'); })}><option value="all">All channels</option>{channels.map(name => <option key={name}>{name}</option>)}</select>
            <Button className="crm-compact-control gap-1 px-2" variant="outline" aria-label={`Filters${filterSummary.length ? ` (${filterSummary.length})` : ''}`} title="Filters" aria-expanded={filtersOpen} aria-controls="crm-conversation-filters" onClick={() => setFiltersOpen(open => !open)}><SlidersHorizontal className="size-4" aria-hidden="true" />{filterSummary.length > 0 && <span className="text-xs">{filterSummary.length}</span>}</Button>
          </div>
          {channel !== 'all' && <select aria-label="Page / Shop" className={`${fieldClass} crm-compact-control`} value={page} onChange={event => changeFilters(() => setPage(event.target.value))}><option value="all">All pages / shops</option>{pages.map(name => <option key={name}>{name}</option>)}</select>}
          {filterSummary.length > 0 && <p className="break-words text-xs text-muted-foreground" aria-label="Active filters">{filterSummary.join(' · ')}</p>}
          <div id="crm-conversation-filters" hidden={!filtersOpen} className="space-y-3">
          <div className="grid grid-cols-2 gap-2"><Field label="Type"><select className={fieldClass} value={type} onChange={event => changeFilters(() => setType(event.target.value))}><option value="all">All</option><option value="chat">Chats</option><option value="comment">Comments</option></select></Field><Field label="Status"><select className={fieldClass} value={status} onChange={event => changeFilters(() => setStatus(event.target.value))}><option value="open">Open</option><option value="resolved">Resolved</option><option value="all">All</option></select></Field></div>
          <Field label="Assignee"><select className={fieldClass} value={assignee} onChange={event => setAssignee(event.target.value)}><option value="all">Everyone</option><option value="mine">Assigned to me</option><option value="unassigned">Unassigned</option></select></Field>
          <Field label="Tag"><select className={fieldClass} value={tag} onChange={event => changeFilters(() => setTag(event.target.value))}><option value="all">All tags</option>{state.tags.map(name => <option key={name}>{name}</option>)}</select></Field>
          <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={unread} onChange={event => changeFilters(() => setUnread(event.target.checked))} />Unread only</label>
          <Button variant="ghost" onClick={() => changeFilters(() => { setType('all'); setStatus('all'); setUnread(false); setTag('all'); }, true)}>Clear filters</Button>
          </div>
        </div>
        {visible.map(conversation => { const contact = state.guests.find(item => item.id === conversation.guestId); return <button key={conversation.id} onClick={() => select(conversation)} aria-pressed={active?.id === conversation.id} className={`block w-full border-b p-4 text-left hover:bg-muted focus-visible:ring-2 ${active?.id === conversation.id ? 'bg-primary/10' : ''}`}><span className="flex justify-between gap-2 font-medium">{contact?.name}{conversation.unread && <span className="text-xs text-primary">Unread</span>}</span><span className="mt-1 block text-xs text-muted-foreground">{contact?.channel} · {conversation.page} · {conversation.type}</span><span className="mt-2 block truncate text-sm text-muted-foreground">{conversation.messages.at(-1)?.text}</span><span className="mt-2 block text-xs text-muted-foreground">{conversation.assignedTo || 'Unassigned'} · {conversation.status}</span></button>; })}
        {!visible.length && <Blank title="No matching conversations">Try another filter.</Blank>}
      </aside>
      {active && guest ? <>
        <section className="crm-chat flex min-w-0 flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4"><div><Button variant="ghost" className="crm-back" onClick={() => setMobileChat(false)}><ArrowLeft className="size-4" />Conversations</Button><h2 className="font-semibold">{guest.name}</h2><p className="text-xs text-muted-foreground">{guest.channel} · {active.type} · {active.status}</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" className="min-h-11" onClick={() => patchConversation({ assignedTo: active.assignedTo ? '' : actor }, active.assignedTo ? 'Unassigned' : 'Assigned')}>{active.assignedTo ? 'Unassign' : 'Assign to me'}</Button><Button variant="outline" className="min-h-11" onClick={() => patchConversation({ status: active.status === 'open' ? 'resolved' : 'open' }, active.status === 'open' ? 'Resolved' : 'Reopened')}>{active.status === 'open' ? 'Resolve' : 'Reopen'}</Button><Button variant="outline" aria-label="Customer profile" aria-expanded={profileOpen} onClick={() => setProfileOpen(value => !value)}><PanelRight className="size-4" /></Button></div></div>
          <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2" aria-label="Conversation tags">{active.tags.map(tag => <span key={tag} className="rounded bg-muted px-2 py-1 text-xs">{tag}</span>)}<details className="relative"><summary className="cursor-pointer py-2 text-xs">+ Tags</summary><div className="absolute left-0 top-full z-20 w-60 rounded-lg border bg-popover p-3 shadow-md">{state.tags.map(tag => <label key={tag} className="flex min-h-11 items-center gap-2 text-xs"><input type="checkbox" checked={active.tags.includes(tag)} onChange={event => patchConversation({ tags: event.target.checked ? [...active.tags, tag] : active.tags.filter(item => item !== tag) }, 'Tags updated')} />{tag}</label>)}{!state.tags.length && <Link to="/inbox/settings?section=tags" className="min-h-11 text-sm underline">Set up conversation tags</Link>}</div></details></div>
          <div className="min-h-64 flex-1 space-y-4 bg-muted/20 p-4" role="log" aria-label="Conversation messages">{active.messages.map(message => <div key={message.id} className={`flex ${message.direction === 'outbound' ? 'justify-end' : ''}`}><div className={`max-w-[85%] rounded-xl border p-3 ${message.direction === 'outbound' ? 'bg-primary/10' : 'bg-background'}`}><p className="whitespace-pre-wrap break-words text-sm">{message.text}</p><p className="mt-2 text-xs text-muted-foreground">{new Date(message.at).toLocaleString()} · {message.direction === 'outbound' ? 'Simulated reply' : 'Sample incoming message'}</p></div></div>)}</div>
          <form className="space-y-3 border-t p-4" onSubmit={event => { event.preventDefault(); update(current => replyToConversation(current, active.id, active.draft)); }}>
            <details><summary className="cursor-pointer py-1 text-sm">Quick replies</summary><div className="flex flex-wrap gap-2 py-2">{state.templates.filter(item => item.enabled && item.kind !== 'automatic').map(template => <Button key={template.id} type="button" variant="outline" className="min-h-11" disabled={active.status === 'resolved'} onClick={() => patchConversation({ draft: template.body })}>{template.name}</Button>)}</div></details>
            <Field label="Reply"><textarea className={fieldClass} rows={3} maxLength={5000} placeholder="Reply to customer..." value={active.draft} disabled={active.status === 'resolved'} onChange={event => patchConversation({ draft: event.target.value })} /></Field>
            <div className="flex flex-wrap items-center justify-between gap-2"><Link className="inline-flex min-h-11 items-center text-sm underline" to={`/inbox/history?conversation=${active.id}`}>Resolution & response history</Link><Button className="min-h-11" disabled={!active.draft.trim() || active.status === 'resolved'}><Send className="size-4" />Simulate reply</Button></div>
          </form>
        </section>
        {wide ? profileOpen && <aside className="crm-customer-panel space-y-5 border-l p-4"><div className="flex justify-end"><Button variant="ghost" aria-label="Close customer profile" onClick={() => setProfileOpen(false)}><X className="size-4" /></Button></div><GuestDetails key={guest.id} guest={guest} compact />
          <section className="space-y-3 border-t pt-4"><h2 className="font-semibold">Orders & offers</h2><p className="text-sm text-muted-foreground">Create with Main’s order form. Stock, payment and fulfillment are managed in Main.</p>
            {import.meta.env.VITE_PRIME_PROTOTYPE === 'true' ? <Button className="min-h-11 w-full" onClick={() => { setOrderNotice(''); setOrderFor(active.id); }}>Create order from conversation</Button> : <MainLink to="/orders">Create order in Main</MainLink>}
            {orderNotice && <p role="status" className="text-sm">{orderNotice}</p>}
            {active.orderIds.map(id => <Link className="block break-all py-2 text-sm underline" key={id} to={`/orders?order=${encodeURIComponent(id)}`}>Open linked order in Main</Link>)}
            <div className="flex flex-wrap gap-2"><MainLink to="/orders">Orders</MainLink><MainLink to="/promotions/discount-codes">Promotions</MainLink><MainLink to="/products/master-catalog">Products</MainLink></div>
          </section>
        </aside> : <Sheet open={profileOpen} onOpenChange={setProfileOpen}><SheetContent className="w-[min(360px,100vw)] overflow-y-auto"><SheetTitle className="sr-only">Customer profile</SheetTitle><div className="space-y-5 pt-4"><GuestDetails key={guest.id} guest={guest} compact />
          <section className="space-y-3 border-t pt-4"><h2 className="font-semibold">Orders & offers</h2><p className="text-sm text-muted-foreground">Create with Main’s order form. Stock, payment and fulfillment are managed in Main.</p>
            {import.meta.env.VITE_PRIME_PROTOTYPE === 'true' ? <Button className="min-h-11 w-full" onClick={() => { setOrderNotice(''); setOrderFor(active.id); }}>Create order from conversation</Button> : <MainLink to="/orders">Create order in Main</MainLink>}
            {orderNotice && <p role="status" className="text-sm">{orderNotice}</p>}
            {active.orderIds.map(id => <Link className="block break-all py-2 text-sm underline" key={id} to={`/orders?order=${encodeURIComponent(id)}`}>Open linked order in Main</Link>)}
            <div className="flex flex-wrap gap-2"><MainLink to="/orders">Orders</MainLink><MainLink to="/promotions/discount-codes">Promotions</MainLink><MainLink to="/products/master-catalog">Products</MainLink></div>
          </section>
        </div></SheetContent></Sheet>}

      </> : <Blank title="Select a conversation">Choose a conversation from the list.</Blank>}
    </div>
    {orderConversation && orderGuest && <ManualOrderDialog warehouses={['Unassigned']} prefill={{ buyerSnapshot: { name: orderGuest.name, phone: orderGuest.phone, email: orderGuest.email }, store: orderConversation.page, notes: `Prime CRM conversation: ${orderConversation.id}; Guest: ${orderGuest.id}` }} onClose={() => setOrderFor(null)} onCreated={order => {
      const saved = update(current => recordEvent({ ...current, conversations: current.conversations.map(item => item.id === orderConversation.id ? { ...item, orderIds: [...new Set([...item.orderIds, order.id])] } : item) }, orderConversation, 'Order created in Main', order.orderKey));
      setOrderNotice(saved ? `${order.orderKey} created in Main (prototype).` : `${order.orderKey} exists in Main, but its CRM link could not be saved.`); setOrderFor(null);
    }} />}
  </>;
}
