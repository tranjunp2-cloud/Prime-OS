import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCrm } from './context';
import { newId, validateLevels, type ReplyTemplate, type WhatsAppForm } from './model';
import { Blank, Field, fieldClass, MainLink } from './Shared';

const sections = [['templates', 'Response templates'], ['tags', 'Conversation tags'], ['keywords', 'Unsafe keywords'], ['levels', 'Guest levels'], ['whatsapp', 'WhatsApp order forms'], ['shared', 'Managed in Main']] as const;

export function CrmSettings() {
  const [params] = useSearchParams();
  const section = params.get('section') || 'templates';
  const { canConfigure } = useCrm();
  return <div className="space-y-5 p-4 md:p-6"><div><h2 className="text-lg font-semibold">CRM Settings</h2><p className="mt-1 text-sm text-muted-foreground">Tools for conversations and customer care. Shared business policies remain in Main.</p></div>
    <nav aria-label="CRM settings sections" className="flex flex-wrap gap-2 border-b pb-3">{sections.map(([key, label]) => <Link className={`inline-flex min-h-11 items-center rounded-md px-3 text-sm ${section === key ? 'bg-primary/10 font-semibold text-primary' : 'hover:bg-muted'}`} aria-current={section === key ? 'page' : undefined} key={key} to={`/inbox/settings?section=${key}`}>{label}</Link>)}</nav>
    {!canConfigure && section !== 'shared' && <p role="status" className="rounded-md border p-3 text-sm">Only administrators can change CRM configuration. Contact your administrator in Main → Team & Access.</p>}
    {section === 'templates' ? <Templates /> : section === 'tags' || section === 'keywords' ? <WordList key={section} kind={section} /> : section === 'levels' ? <Levels /> : section === 'whatsapp' ? <WhatsAppForms /> : section === 'shared' ? <SharedSettings /> : <Blank title="Unknown settings section"><Link to="/inbox/settings" className="underline">Open response templates</Link></Blank>}
  </div>;
}

function Templates() {
  const { state, update, canConfigure } = useCrm();
  const [draft, setDraft] = useState<ReplyTemplate | null>(null);
  const [error, setError] = useState('');
  return <section className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">Response templates</h3><p className="mt-1 text-sm text-muted-foreground">Quick replies and suggestions can be inserted into a reply. Automatic replies are configuration drafts; no messages are sent automatically.</p></div><Button className="min-h-11" disabled={!canConfigure} onClick={() => { setError(''); setDraft({ id: newId(), name: '', body: '', kind: 'quick', enabled: true }); }}>Add template</Button></div>
    <div className="divide-y rounded-lg border">{state.templates.map(template => <div key={template.id} className="flex flex-wrap items-start justify-between gap-3 p-4"><div className="min-w-0 flex-1"><h4 className="font-medium">{template.name}</h4><p className="mt-1 text-xs text-muted-foreground">{template.kind === 'automatic' ? 'Automatic · draft only' : `${template.kind} · ${template.enabled ? 'Available' : 'Disabled'}`}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm">{template.body}</p></div><div className="flex gap-2"><Button variant="outline" className="min-h-11" disabled={!canConfigure} onClick={() => { setError(''); setDraft({ ...template }); }}>Edit {template.name}</Button><Button variant="ghost" className="min-h-11" disabled={!canConfigure} onClick={() => { if (window.confirm(`Delete “${template.name}”?`)) update(current => ({ ...current, templates: current.templates.filter(item => item.id !== template.id) })); }}>Delete</Button></div></div>)}{!state.templates.length && <Blank title="No response templates">Add a template to help agents reply consistently.</Blank>}</div>
    <Dialog open={Boolean(draft)} onOpenChange={open => { if (!open) setDraft(null); }}><DialogContent>{draft && <form className="space-y-4" onSubmit={event => { event.preventDefault(); setError(''); if (!canConfigure) return; if (!draft.name.trim() || !draft.body.trim()) { setError('Enter a name and reply text.'); return; } const saved = update(current => ({ ...current, templates: [...current.templates.filter(item => item.id !== draft.id), { ...draft, name: draft.name.trim(), body: draft.body.trim() }] })); if (saved) setDraft(null); }}><DialogHeader><DialogTitle>Response template</DialogTitle><DialogDescription>Save a reusable reply in this CRM prototype.</DialogDescription></DialogHeader><Field label="Template name"><Input className="min-h-11" required maxLength={100} value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} /></Field><Field label="Template type"><select className={fieldClass} value={draft.kind} onChange={event => setDraft({ ...draft, kind: event.target.value as ReplyTemplate['kind'] })}><option value="quick">Quick reply</option><option value="suggestion">Suggestion</option><option value="automatic">Automatic reply draft</option></select></Field><Field label="Reply text"><textarea className={fieldClass} required rows={5} maxLength={5000} value={draft.body} onChange={event => setDraft({ ...draft, body: event.target.value })} /></Field><label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={draft.enabled} onChange={event => setDraft({ ...draft, enabled: event.target.checked })} />Available to agents (quick replies and suggestions)</label>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="outline" className="min-h-11" onClick={() => setDraft(null)}>Cancel</Button><Button className="min-h-11">Save template</Button></div></form>}</DialogContent></Dialog>
  </section>;
}

function WordList({ kind }: { kind: 'tags' | 'keywords' }) {
  const { state, update, canConfigure } = useCrm();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const tags = kind === 'tags';
  return <section className="max-w-3xl space-y-4"><div><h3 className="font-semibold">{tags ? 'Conversation tags' : 'Unsafe keywords'}</h3><p className="mt-1 text-sm text-muted-foreground">{tags ? 'Workflow labels for conversations. Shared customer classifications are managed in Main.' : 'Case-insensitive phrase matching blocks simulated replies containing these keywords. Channel-side moderation requires a provider integration.'}</p></div>
    <form className="flex flex-wrap items-end gap-3" onSubmit={event => { event.preventDefault(); if (!canConfigure) return; const word = value.trim(); if (!word || state[kind].some(item => item.toLowerCase() === word.toLowerCase())) { setError('Enter a unique, non-empty value.'); return; } if (update(current => { if (current[kind].some(item => item.toLowerCase() === word.toLowerCase())) throw new Error('This value already exists.'); return { ...current, [kind]: [...current[kind], word] }; })) { setValue(''); setError(''); } }}><div className="min-w-0 flex-1"><Field label={tags ? 'New conversation tag' : 'New unsafe keyword'}><Input className="min-h-11" required maxLength={80} disabled={!canConfigure} value={value} onChange={event => setValue(event.target.value)} /></Field></div><Button className="min-h-11" disabled={!canConfigure}>Add {tags ? 'tag' : 'keyword'}</Button></form>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <ul className="divide-y rounded-lg border">{state[kind].map(word => <li key={word} className="flex items-center justify-between gap-3 p-3"><span className="break-words text-sm">{word}</span><Button variant="ghost" className="min-h-11" disabled={!canConfigure} aria-label={`Remove ${word}`} onClick={() => { if (window.confirm(`Remove “${word}”${tags ? ' from all conversations' : ''}?`)) update(current => ({ ...current, [kind]: current[kind].filter(item => item !== word), conversations: tags ? current.conversations.map(item => ({ ...item, tags: item.tags.filter(tag => tag !== word) })) : current.conversations })); }}>Remove</Button></li>)}</ul>
    {!state[kind].length && <Blank title={tags ? 'No conversation tags' : 'No unsafe keywords'}>Add your first entry above.</Blank>}
    {tags && <MainLink to="/settings/customer-data">Customer classifications in Main</MainLink>}
  </section>;
}

function Levels() {
  const { state, update, canConfigure } = useCrm();
  const [levels, setLevels] = useState(() => state.levels.map(level => ({ ...level })));
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  return <form className="max-w-4xl space-y-4" onSubmit={event => { event.preventDefault(); if (!canConfigure) return; try { validateLevels(levels); if (update(current => ({ ...current, levels }))) { setError(''); setNotice('Guest levels saved.'); } } catch (failure) { setError(failure instanceof Error ? failure.message : 'Invalid levels.'); } }}><h3 className="font-semibold">Guest interaction levels</h3><p className="text-sm text-muted-foreground">A guest reaches the highest level where both incoming chat and comment thresholds are met. These levels are separate from purchase-based customer ranks in Main.</p>
    <fieldset disabled={!canConfigure} className="space-y-4">{levels.map((level, index) => <div key={index} className="grid gap-3 rounded-lg border p-4 sm:grid-cols-3"><Field label={`Level ${index + 1} name`}><Input className="min-h-11" required maxLength={80} value={level.name} onChange={event => setLevels(current => current.map((item, i) => i === index ? { ...item, name: event.target.value } : item))} /></Field>{(['chats', 'comments'] as const).map(key => <Field key={key} label={`${level.name} ${key}`}><Input className="min-h-11" required type="number" min={0} step={1} value={level[key]} onChange={event => setLevels(current => current.map((item, i) => i === index ? { ...item, [key]: Number(event.target.value) } : item))} /></Field>)}</div>)}</fieldset>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}{notice && <p role="status" className="text-sm">{notice}</p>}<div className="flex flex-wrap gap-3"><Button className="min-h-11" disabled={!canConfigure}>Save levels</Button><MainLink to="/customers?rank-settings=1">Customer ranks in Main</MainLink></div>
  </form>;
}

function WhatsAppForms() {
  const { state, update, canConfigure } = useCrm();
  const [draft, setDraft] = useState<WhatsAppForm | null>(null);
  const [preview, setPreview] = useState<WhatsAppForm | null>(null);
  return <section className="space-y-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">WhatsApp order forms</h3><p className="mt-1 max-w-3xl text-sm text-muted-foreground">Prepare and preview form content. Publishing and sending require a connected WhatsApp provider. Products, pricing, shipping and orders remain in Main.</p></div><Button className="min-h-11" disabled={!canConfigure} onClick={() => setDraft({ id: newId(), name: '', greeting: '', confirmation: '', enabled: false })}>Create form draft</Button></div>
    <div className="divide-y rounded-lg border">{state.forms.map(form => <div key={form.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div><h4 className="font-medium">{form.name}</h4><p className="mt-1 text-xs text-muted-foreground">Draft · not published</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" className="min-h-11" onClick={() => setPreview(form)}>Preview {form.name}</Button><Button variant="outline" className="min-h-11" disabled={!canConfigure} onClick={() => setDraft({ ...form })}>Edit</Button><Button variant="ghost" className="min-h-11" disabled={!canConfigure} onClick={() => { if (window.confirm(`Delete “${form.name}”?`)) update(current => ({ ...current, forms: current.forms.filter(item => item.id !== form.id) })); }}>Delete</Button></div></div>)}{!state.forms.length && <Blank title="No WhatsApp form drafts">Create a draft before connecting a publishing workflow.</Blank>}</div>
    <MainLink to="/sales-channels/conversation-channels">WhatsApp connection in Main</MainLink>
    <Dialog open={Boolean(draft)} onOpenChange={open => { if (!open) setDraft(null); }}><DialogContent>{draft && <form className="space-y-4" onSubmit={event => { event.preventDefault(); if (!canConfigure || !draft.name.trim() || !draft.greeting.trim() || !draft.confirmation.trim()) return; if (update(current => ({ ...current, forms: [...current.forms.filter(item => item.id !== draft.id), { ...draft, name: draft.name.trim(), enabled: false }] }))) setDraft(null); }}><DialogHeader><DialogTitle>WhatsApp form draft</DialogTitle><DialogDescription>Content preview only. This does not publish a form or send messages.</DialogDescription></DialogHeader><Field label="Form name"><Input className="min-h-11" required maxLength={100} value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} /></Field><Field label="Welcome message"><textarea className={fieldClass} required maxLength={1000} value={draft.greeting} onChange={event => setDraft({ ...draft, greeting: event.target.value })} /></Field><Field label="Confirmation message"><textarea className={fieldClass} required maxLength={1000} value={draft.confirmation} onChange={event => setDraft({ ...draft, confirmation: event.target.value })} /></Field><Button className="min-h-11">Save form draft</Button></form>}</DialogContent></Dialog>
    <Dialog open={Boolean(preview)} onOpenChange={open => { if (!open) setPreview(null); }}><DialogContent><DialogHeader><DialogTitle>{preview?.name}</DialogTitle><DialogDescription>WhatsApp order form · content preview</DialogDescription></DialogHeader><p className="whitespace-pre-wrap text-sm">{preview?.greeting}</p><div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">Customer contact → Products from Main → Delivery → Order review</div><p className="whitespace-pre-wrap text-sm">{preview?.confirmation}</p></DialogContent></Dialog>
  </section>;
}

function SharedSettings() {
  const rows = [
    ['Customers', 'Shared identity, purchase history and customer ranks.', '/customers'],
    ['Orders', 'Order processing, payments, fulfillment and returns.', '/orders'],
    ['Products & inventory', 'Product Master, SKUs and shared catalog.', '/products/master-catalog'],
    ['Promotions', 'Offer rules, eligibility and redemption limits.', '/promotions/discount-codes'],
    ['Conversation channels', 'Credentials, connection health and reconnect/disconnect.', '/sales-channels/conversation-channels'],
    ['Sales channels & pricing', 'Store connections and shop pricing rules.', '/sales-channels/connected-channels'],
    ['Team & Access', 'Staff accounts, workspace permissions and security.', '/settings/team-access'],
    ['Shipping & Delivery', 'Carriers, shipping fees and delivery policies.', '/settings/shipping-delivery'],
    ['Templates & Notifications', 'Order emails and shared transaction notifications.', '/settings/templates-notifications'],
  ];
  return <div className="divide-y rounded-lg border">{rows.map(([title, description, href]) => <div key={href} className="flex flex-wrap items-center justify-between gap-3 p-4"><div><h3 className="font-medium">{title}</h3><p className="mt-1 text-sm text-muted-foreground">{description}</p></div><MainLink to={href}>Manage {title} in Main</MainLink></div>)}</div>;
}
