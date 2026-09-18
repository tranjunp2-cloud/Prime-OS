import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AlertCircle, AlertTriangle, ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronRight, Loader2, PackageSearch, RefreshCw, Send, Store, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export interface ChannelWizardDraft {
  enabled: boolean;
  title: string;
  price_markup: string;
  description: string;
  listing_sku: string;
  category: string;
  fulfillment: string;
  variant_scope: string;
  listing_mode: string;
  identifier: string;
  condition: string;
  stock_quantity: string;
  warehouse: string;
  brand: string;
  shipping_option: string;
  bullet_points: string;
  search_terms: string;
  preorder_days: string;
  warranty: string;
  certification: string;
  video_url: string;
  web_slug: string;
  pos_barcode: string;
  visibility: string;
  sync_policy: string;
  safety_buffer: string;
  allocation_cap: string;
  media_scope: string;
  compliance_notes: string;
  tax_code: string;
  attribute_material: string;
  attribute_color: string;
}

export interface WizardChannel {
  key: string;
  label: string;
  description: string;
  icon: typeof Store;
  iconClassName: string;
  account?: string;
  connectionStatus?: 'connected' | 'attention' | 'not_connected';
  unavailableReason?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  embedded?: boolean;
  channels: WizardChannel[];
  drafts: Record<string, ChannelWizardDraft>;
  masterSku: string;
  productName: string;
  productCategory: string;
  availableStock: number;
  imageCount: number;
  productType: string;
  existingMatches?: Record<string, { listingId: string; title: string; status: string; differenceCount: number }>;
  onChange: (channel: string, patch: Partial<ChannelWizardDraft>) => void;
  onSubmitted?: () => void;
}

const steps = ['Choose channels', 'Channel setup', 'Review', 'Submit', 'Done'];

export function ChannelListingWizard({ open, onOpenChange, embedded = false, channels, drafts, masterSku, productName, productCategory, availableStock, imageCount, productType, existingMatches = {}, onChange, onSubmitted }: Props) {
  const [step, setStep] = useState(1);
  const [activeIndex, setActiveIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [failedChannels, setFailedChannels] = useState<string[]>([]);
  const [mergeStrategies, setMergeStrategies] = useState<Record<string, 'keep' | 'inherit' | 'review'>>({});
  const selected = useMemo(() => channels.filter(channel => drafts[channel.key]?.enabled), [channels, drafts]);
  const active = selected[activeIndex];

  useEffect(() => {
    if (!open) return;
    setStep(1); setActiveIndex(0); setSubmitting(false); setFailedChannels([]);
    setMergeStrategies(Object.fromEntries(Object.keys(existingMatches).map(key => [key, 'keep'])));
    // Reset only when the wizard opens; match data is stable for that session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function suggestedSku(key: string) {
    const prefix = key === 'webstore' ? 'WEB' : key === 'pos' ? 'POS' : key === 'tiktok' ? 'TTS' : key.slice(0, 3).toUpperCase();
    return `${prefix}-${masterSku || 'MASTER-SKU'}`;
  }

  function toggle(channel: WizardChannel, enabled: boolean) {
    if (enabled && channel.connectionStatus !== 'connected') return;
    const draft = drafts[channel.key];
    const slug = productName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    onChange(channel.key, {
      enabled,
      listing_sku: draft.listing_sku || suggestedSku(channel.key),
      variant_scope: draft.variant_scope || 'all',
      listing_mode: draft.listing_mode || (channel.key === 'amazon' ? 'offer_only' : 'master'),
      title: draft.title || productName,
      category: draft.category || (['shopee', 'lazada', 'tiktok', 'rakuten'].includes(channel.key) ? productCategory : ''),
      stock_quantity: draft.stock_quantity || (availableStock > 0 ? String(availableStock) : ''),
      web_slug: draft.web_slug || (slug ? `/products/${slug}` : ''),
      pos_barcode: draft.pos_barcode || masterSku,
      visibility: draft.visibility || (channel.key === 'webstore' ? 'public' : channel.key === 'social' ? 'agents' : ''),
      sync_policy: draft.sync_policy || 'automatic',
      safety_buffer: draft.safety_buffer || '0',
      allocation_cap: draft.allocation_cap || (availableStock > 0 ? String(availableStock) : ''),
      media_scope: draft.media_scope || 'all',
    });
  }

  const issuesFor = (channel: WizardChannel) => {
    const draft = drafts[channel.key];
    const issues: string[] = [];
    if (!draft.listing_sku.trim()) issues.push('Channel SKU');
    if (channel.key === 'webstore' && !draft.web_slug.trim()) issues.push('Storefront URL');
    if (channel.key === 'pos' && !draft.pos_barcode.trim()) issues.push('POS barcode');
    if (channel.key === 'social' && !draft.visibility) issues.push('Sales visibility');
    if (['shopee', 'lazada', 'tiktok', 'rakuten'].includes(channel.key) && !draft.category.trim()) issues.push('Category');
    if (['shopee', 'lazada'].includes(channel.key) && !draft.shipping_option) issues.push('Shipping option');
    if (channel.key === 'tiktok' && !draft.warehouse) issues.push('TikTok warehouse');
    if (channel.key === 'rakuten' && !draft.identifier.trim()) issues.push('Catalog ID');
    if (channel.key === 'amazon') {
      if (!draft.identifier.trim()) issues.push('ASIN / catalog match');
      if (!draft.condition) issues.push('Condition');
      if (!draft.fulfillment) issues.push('FBA / FBM');
    }
    return issues;
  };
  const issueCount = selected.filter(channel => issuesFor(channel).length > 0).length;

  function submit() {
    setStep(4); setSubmitting(true);
    window.setTimeout(() => {
      setSubmitting(false);
      setFailedChannels(selected.length > 1 ? [selected[selected.length - 1].key] : []);
      setStep(5);
      onSubmitted?.();
    }, 1100);
  }

  const stepTitle = step === 1 ? 'Create channel listings' : step === 2 ? `Set up ${active?.label ?? 'channel'} listing` : step === 3 ? 'Review channel listings' : step === 4 ? 'Submit channel listings' : 'Listings created';
  const stepDescription = step === 1 ? 'Choose where this Product Master should be listed.' : step === 2 ? 'Review the generated channel identity and complete channel-owned requirements.' : step === 3 ? 'Confirm every listing before anything is submitted.' : step === 4 ? 'Creating listing intents and queueing channel validation.' : 'Your Product Master remains the source; each channel now has its own listing record.';
  const content = <>
    {embedded ? <header className="flex items-start gap-3"><Button type="button" variant="ghost" size="icon" className="mt-0.5 shrink-0" aria-label="Back to Product Master" onClick={() => onOpenChange(false)}><ArrowLeft className="size-4" /></Button><div><h1 className="text-xl font-semibold tracking-tight">{stepTitle}</h1><p className="mt-1 text-sm text-muted-foreground">{stepDescription}</p></div></header> : <DialogHeader><DialogTitle>{stepTitle}</DialogTitle><DialogDescription>{stepDescription}</DialogDescription></DialogHeader>}
    <ol className="grid grid-cols-5 px-2 py-4" aria-label="Listing creation progress">{steps.map((label, index) => { const number = index + 1; const complete = number < step; const current = number === step; return <li key={label} className="relative flex flex-col items-center gap-2 text-center"><span className={cn('absolute top-4 h-px bg-border', index > 0 && 'right-1/2 left-0', index === 0 && 'hidden')} /><span className={cn('absolute top-4 h-px bg-border', index < 4 && 'left-1/2 right-0', index === 4 && 'hidden')} /><span className={cn('relative z-10 grid size-9 place-items-center rounded-full border text-xs font-semibold', complete || current ? 'border-primary bg-primary text-primary-foreground' : 'bg-background text-muted-foreground')}>{complete ? <Check className="size-4" /> : number}</span><span className={cn('hidden text-xs sm:block', complete || current ? 'font-semibold text-primary' : 'text-muted-foreground')}>{label}</span></li>; })}</ol>
    <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-2">
      {step === 1 && <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]"><div className="grid content-start gap-3 sm:grid-cols-2">{channels.map(channel => { const Icon = channel.icon; const checked = drafts[channel.key]?.enabled; const available = channel.connectionStatus === 'connected'; const disabled = !available && !checked; const existingMatch = existingMatches[channel.key]; return <button key={channel.key} type="button" disabled={disabled} onClick={() => toggle(channel, !checked)} className={cn('flex min-h-24 items-center gap-4 rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-55', checked ? 'border-primary bg-primary/5' : available ? 'hover:border-primary/40' : 'bg-muted/20')} aria-pressed={checked} aria-describedby={`${channel.key}-connection-detail`}><Checkbox checked={checked} disabled={disabled} tabIndex={-1} /><span className={cn('grid size-11 shrink-0 place-items-center rounded-xl', channel.iconClassName)}><Icon className="size-5" /></span><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><strong className="truncate text-sm">{channel.label}</strong><Badge variant="outline" className={cn('shrink-0 text-[10px]', existingMatch ? 'border-blue-500/35 bg-blue-500/10 text-blue-300' : available ? 'border-emerald-500/30 text-emerald-600' : channel.connectionStatus === 'attention' ? 'border-amber-500/30 text-amber-600' : '')}>{existingMatch ? 'Listing found' : available ? 'Connected' : channel.connectionStatus === 'attention' ? 'Needs attention' : 'Not connected'}</Badge></span><span className="mt-1 block truncate text-xs text-muted-foreground">{channel.account || channel.description}</span><span id={`${channel.key}-connection-detail`} className="mt-1 block text-[11px] text-muted-foreground">{existingMatch ? `${existingMatch.listingId} · Existing channel data will be preserved` : available ? channel.description : channel.unavailableReason || 'Connect this channel before creating a listing.'}</span></span></button>; })}</div><Summary selected={selected} productType={productType} /></div>}
      {step === 2 && active && <div className="grid gap-5 lg:grid-cols-[190px_minmax(0,1fr)_280px]"><nav className="space-y-2" aria-label="Selected channel listings">{selected.map((channel, index) => { const Icon = channel.icon; const issues = issuesFor(channel); return <button key={channel.key} type="button" onClick={() => setActiveIndex(index)} className={cn('flex min-h-16 w-full items-center gap-2 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', index === activeIndex ? 'border-primary bg-primary/5' : 'hover:bg-muted/30')}><span className={cn('grid size-8 shrink-0 place-items-center rounded-md', channel.iconClassName)}><Icon className="size-4" /></span><span className="min-w-0 flex-1"><strong className="block truncate text-xs">{channel.label}</strong><span className={cn('text-[11px]', existingMatches[channel.key] ? 'text-blue-400' : issues.length ? 'text-amber-600' : 'text-emerald-600')}>{existingMatches[channel.key] ? 'Existing listing' : issues.length ? `${issues.length} missing` : 'Ready'}</span></span>{!issues.length && <Check className="size-4 text-emerald-600" />}</button>; })}</nav><div className="space-y-4"><div className="flex items-center gap-3 rounded-xl border bg-muted/20 p-4">{(() => { const Icon = active.icon; return <span className={cn('grid size-11 place-items-center rounded-xl', active.iconClassName)}><Icon className="size-5" /></span>; })()}<div><p className="font-semibold">{active.label} listing</p><p className="text-xs text-muted-foreground">Channel-owned setup · Product Master remains unchanged</p></div><Badge variant={issuesFor(active).length ? 'outline' : 'default'} className="ml-auto">{existingMatches[active.key] ? 'Matched' : issuesFor(active).length ? `${issuesFor(active).length} missing` : 'Ready'}</Badge></div>{existingMatches[active.key] && <ExistingListingMatch match={existingMatches[active.key]} strategy={mergeStrategies[active.key] ?? 'keep'} onChange={strategy => setMergeStrategies(current => ({ ...current, [active.key]: strategy }))} />}<SectionCard title="Identity & channel content" description="Shared values are inherited; only channel overrides are editable."><FieldBlock label="Master SKU" helper="Shared identity; read only."><Input value={masterSku} readOnly className="bg-muted/40 font-mono" /></FieldBlock><FieldBlock label={`${active.label} SKU *`} helper="Generated from Master SKU; editable for this channel."><Input className="font-mono uppercase" value={drafts[active.key].listing_sku} onChange={event => onChange(active.key, { listing_sku: event.target.value.toUpperCase() })} /></FieldBlock><ProviderFields channel={active} draft={drafts[active.key]} productName={productName} onChange={patch => onChange(active.key, patch)} /></SectionCard><InventoryAndAvailability channel={active} draft={drafts[active.key]} masterStock={availableStock} onChange={patch => onChange(active.key, patch)} /><AdditionalListingData channel={active} draft={drafts[active.key]} imageCount={imageCount} onChange={patch => onChange(active.key, patch)} />{issuesFor(active).length > 0 && <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 p-3 text-sm text-foreground"><div className="flex items-center gap-2 font-semibold text-amber-300"><AlertTriangle className="size-4" />Complete {issuesFor(active).length} required fields</div><p className="mt-1 text-xs text-foreground/75">{issuesFor(active).join(' · ')}</p></div>}</div><Summary selected={selected} productType={productType} active={active.label} /></div>}
      {step === 3 && <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]"><div className="space-y-3">{selected.map((channel, index) => { const Icon = channel.icon; const issues = issuesFor(channel); return <button key={channel.key} type="button" onClick={() => { setActiveIndex(index); setStep(2); }} className="flex min-h-20 w-full items-center gap-3 rounded-xl border p-4 text-left hover:bg-muted/30"><span className={cn('grid size-10 place-items-center rounded-lg', channel.iconClassName)}><Icon className="size-5" /></span><span className="min-w-0 flex-1"><strong className="block">{channel.label}</strong><span className="block truncate font-mono text-xs text-muted-foreground">{drafts[channel.key].listing_sku}</span></span><span className="text-right">{issues.length ? <Badge variant="outline" className="border-amber-300 text-amber-700">Needs attention</Badge> : <Badge className="bg-emerald-600">Ready</Badge>}<span className="mt-1 block text-xs text-muted-foreground">{issues.length ? issues.join(', ') : listingSummary(channel.key, drafts[channel.key])}</span></span><ChevronRight className="size-4 text-muted-foreground" /></button>; })}</div><aside className="h-fit rounded-xl border p-5"><p className="font-semibold">Submission summary</p><dl className="mt-4 space-y-3 text-sm"><div className="flex justify-between"><dt className="text-muted-foreground">Selected</dt><dd className="font-semibold">{selected.length}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Ready</dt><dd className="font-semibold text-emerald-700">{selected.length - issueCount}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Needs attention</dt><dd className="font-semibold text-amber-700">{issueCount}</dd></div></dl><p className="mt-5 rounded-lg bg-primary/5 p-3 text-xs text-muted-foreground">Submission creates channel-owned listing records. Product Master data is not overwritten.</p></aside></div>}
      {step === 4 && <div className="mx-auto flex max-w-xl flex-col items-center py-14 text-center" aria-live="polite">{submitting ? <Loader2 className="size-12 animate-spin text-primary motion-reduce:animate-none" /> : <Send className="size-12 text-primary" />}<h3 className="mt-5 text-lg font-semibold">{submitting ? 'Creating listing drafts' : 'Drafts created'}</h3><p className="mt-2 text-sm text-muted-foreground">Saving {selected.length} channel-owned listing drafts from the current Product Master revision. No provider submission happens in this prototype.</p></div>}
      {step === 5 && <div className="mx-auto max-w-2xl py-8"><div className="text-center">{failedChannels.length ? <AlertCircle className="mx-auto size-14 text-amber-400" /> : <CheckCircle2 className="mx-auto size-14 text-emerald-400" />}<h3 className="mt-4 text-xl font-semibold">{failedChannels.length ? 'Some listings need attention' : 'Listing drafts created'}</h3><p className="mt-2 text-sm text-muted-foreground">{failedChannels.length ? 'Successful listings were kept. Retry only the channel that could not be validated.' : 'Review readiness and provider validation before publishing each listing.'}</p></div><div className="mt-6 space-y-2">{selected.map(channel => { const failed = failedChannels.includes(channel.key); return <div key={channel.key} className={cn('flex items-center gap-3 rounded-lg border p-3', failed && 'border-amber-500/35 bg-amber-500/10')}><span className="grid size-8 place-items-center">{failed ? <XCircle className="size-5 text-amber-300" /> : <CheckCircle2 className="size-5 text-emerald-400" />}</span><span className="min-w-0 flex-1"><span className="block font-semibold text-foreground">{channel.label}</span><span className="block truncate font-mono text-xs text-muted-foreground">{drafts[channel.key].listing_sku}</span>{failed && <span className="mt-1 block text-xs text-foreground/75">Provider validation timed out. Your setup was saved.</span>}</span>{failed ? <Button type="button" size="sm" variant="outline" className="border-amber-500/40 bg-background/70 text-foreground hover:bg-amber-500/10 hover:text-amber-200" onClick={() => setFailedChannels(current => current.filter(key => key !== channel.key))}><RefreshCw className="size-3.5" />Retry</Button> : <Badge variant="outline" className="border-emerald-500/35 text-emerald-300">Draft created</Badge>}</div>; })}</div></div>}
    </div>
    <div className="flex items-center justify-between border-t pt-4">{step > 1 && step < 4 ? <Button variant="outline" onClick={() => setStep(value => Math.max(1, value - 1))}><ArrowLeft className="size-4" />Back</Button> : <Button variant="outline" onClick={() => onOpenChange(false)}>{step === 5 ? 'Close' : 'Cancel'}</Button>}<Button onClick={() => { if (step === 1) { setActiveIndex(0); setStep(2); } else if (step === 2) setStep(3); else if (step === 3) submit(); else if (step === 5) onOpenChange(false); }} disabled={(step === 1 && selected.length === 0) || (step === 2 && issueCount > 0) || (step === 3 && issueCount > 0) || step === 4}>{step === 1 ? 'Continue' : step === 2 ? 'Review all listings' : step === 3 ? 'Submit listings' : step === 5 ? 'Done' : 'Submitting…'}{step < 4 && <ArrowRight className="size-4" />}</Button></div>
  </>;
  if (embedded) return <div className="mx-auto flex min-h-[calc(100vh-7rem)] w-full max-w-7xl flex-col px-5 py-6 lg:px-8">{content}</div>;
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="flex max-h-[92vh] flex-col overflow-hidden sm:max-w-6xl">{content}</DialogContent></Dialog>;
}

function ExistingListingMatch({ match, strategy, onChange }: { match: { listingId: string; title: string; status: string; differenceCount: number }; strategy: 'keep' | 'inherit' | 'review'; onChange: (strategy: 'keep' | 'inherit' | 'review') => void }) {
  const options: Array<{ value: 'keep' | 'inherit' | 'review'; label: string; description: string }> = [
    { value: 'keep', label: 'Keep channel data', description: 'Link the listing without replacing its current content, price or stock.' },
    { value: 'inherit', label: 'Update inherited fields', description: 'Apply Master data only where the channel has no override.' },
    { value: 'review', label: 'Review field by field', description: `Compare and choose how to resolve ${match.differenceCount} detected differences.` },
  ];
  return <section className="rounded-xl border border-blue-500/35 bg-blue-500/10 p-4" aria-labelledby="existing-listing-title"><div className="flex flex-wrap items-start gap-3"><PackageSearch className="mt-0.5 size-5 shrink-0 text-blue-300" /><div className="min-w-0 flex-1"><h3 id="existing-listing-title" className="font-semibold text-blue-200">Existing listing found</h3><p className="mt-1 truncate text-sm text-foreground/80">{match.title}</p><p className="mt-1 font-mono text-xs text-muted-foreground">{match.listingId} · {match.status} · {match.differenceCount} fields differ from Master</p></div><Badge variant="outline" className="border-blue-500/35 text-blue-300">No overwrite</Badge></div><fieldset className="mt-4 grid gap-2"><legend className="mb-2 text-xs font-semibold text-foreground">Choose how Master data should be applied</legend>{options.map(option => <label key={option.value} className={cn('flex min-h-14 cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors', strategy === option.value ? 'border-primary bg-primary/10' : 'border-border/80 bg-background/35 hover:bg-background/60')}><input type="radio" name={`merge-strategy-${match.listingId}`} value={option.value} checked={strategy === option.value} onChange={() => onChange(option.value)} className="mt-1 size-4 accent-primary" /><span><span className="block text-sm font-semibold">{option.label}</span><span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{option.description}</span></span></label>)}</fieldset></section>;
}

function FieldBlock({ label, helper, children, wide = false }: { label: string; helper?: string; children: ReactNode; wide?: boolean }) {
  return <div className={cn('space-y-2', wide && 'sm:col-span-2')}><Label>{label}</Label>{children}{helper && <p className="text-xs leading-5 text-muted-foreground">{helper}</p>}</div>;
}

function SectionCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <section className="rounded-xl border"><header className="border-b bg-muted/20 px-5 py-4"><h3 className="text-sm font-semibold">{title}</h3><p className="mt-1 text-xs text-muted-foreground">{description}</p></header><div className="grid gap-4 p-5 sm:grid-cols-2">{children}</div></section>;
}

function InventoryAndAvailability({ channel, draft, masterStock, onChange }: { channel: WizardChannel; draft: ChannelWizardDraft; masterStock: number; onChange: (patch: Partial<ChannelWizardDraft>) => void }) {
  const fba = channel.key === 'amazon' && draft.fulfillment === 'FBA';
  const sent = Math.max(0, Math.min(Number(draft.allocation_cap || masterStock), masterStock - Number(draft.safety_buffer || 0)));
  return <SectionCard title="Inventory & fulfillment" description="Master ATP remains the source. Configure what Prime OS is allowed to send to this channel."><FieldBlock label="Master ATP" helper="Calculated from warehouse on-hand minus reservations."><Input readOnly value={`${masterStock} available`} className="bg-muted/40 font-semibold" /></FieldBlock><FieldBlock label="Inventory source"><SelectInput value={draft.warehouse} onChange={value => onChange({ warehouse: value })} placeholder="Select warehouse / pool" options={[["all", "All mapped warehouses"], ["primary", "Primary fulfillment warehouse"], ["channel", `${channel.label} dedicated stock`]]} /></FieldBlock><FieldBlock label="Stock sync policy"><SelectInput value={draft.sync_policy} onChange={value => onChange({ sync_policy: value })} placeholder="Select sync policy" options={[["automatic", "Automatic sync"], ["manual", "Manual update"], ["disabled", "Do not publish stock"]]} /></FieldBlock><FieldBlock label="Channel allocation cap"><Input type="number" min="0" value={draft.allocation_cap} onChange={event => onChange({ allocation_cap: event.target.value })} /></FieldBlock><FieldBlock label="Safety buffer"><Input type="number" min="0" value={draft.safety_buffer} onChange={event => onChange({ safety_buffer: event.target.value })} /></FieldBlock><FieldBlock label={fba ? 'Amazon reported quantity' : 'Quantity to send'} helper={fba ? 'FBA quantity is owned and reported by Amazon.' : 'Preview based on ATP, buffer and allocation cap.'}><Input readOnly value={fba ? 'Waiting for Amazon sync' : String(sent)} className="bg-muted/40 font-semibold" /></FieldBlock><div className="sm:col-span-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">{fba ? 'Prime OS will monitor Amazon FBA stock; it will not overwrite FBA inventory from Master ATP.' : `Quantity sent = min(${masterStock} Master ATP − ${draft.safety_buffer || 0} buffer, ${draft.allocation_cap || masterStock} allocation cap) = ${sent}.`}</div></SectionCard>;
}

function AdditionalListingData({ channel, draft, imageCount, onChange }: { channel: WizardChannel; draft: ChannelWizardDraft; imageCount: number; onChange: (patch: Partial<ChannelWizardDraft>) => void }) {
  const marketplace = ['amazon', 'shopee', 'lazada', 'tiktok', 'rakuten'].includes(channel.key);
  return <section className="space-y-2"><details className="group rounded-xl border" open={marketplace}><summary className="flex min-h-12 cursor-pointer list-none items-center px-5 text-sm font-semibold">Variants & media<Badge variant="outline" className="ml-auto">{imageCount} master images</Badge><ChevronRight className="ml-2 size-4 transition-transform group-open:rotate-90" /></summary><div className="grid gap-4 border-t p-5 sm:grid-cols-2"><FieldBlock label="Variants to publish"><SelectInput value={draft.variant_scope} onChange={value => onChange({ variant_scope: value })} placeholder="Select variants" options={[["all", "All active variants"], ["selected", "Choose specific variants"], ["parent", "Parent only"]]} /></FieldBlock><FieldBlock label="Media selection"><SelectInput value={draft.media_scope} onChange={value => onChange({ media_scope: value })} placeholder="Select media" options={[["all", "Use all Product Master images"], ["selected", "Choose channel images"], ["custom", "Upload channel-only media"]]} /></FieldBlock></div></details>{marketplace && <details className="group rounded-xl border"><summary className="flex min-h-12 cursor-pointer list-none items-center px-5 text-sm font-semibold">Category attributes & compliance<span className="ml-auto text-xs font-normal text-muted-foreground">Schema-driven</span><ChevronRight className="ml-2 size-4 transition-transform group-open:rotate-90" /></summary><div className="grid gap-4 border-t p-5 sm:grid-cols-2"><FieldBlock label="Material"><Input value={draft.attribute_material} onChange={event => onChange({ attribute_material: event.target.value })} placeholder="Loaded from selected category" /></FieldBlock><FieldBlock label="Color / pattern"><Input value={draft.attribute_color} onChange={event => onChange({ attribute_color: event.target.value })} placeholder="Loaded from selected category" /></FieldBlock><FieldBlock label="Tax code"><Input value={draft.tax_code} onChange={event => onChange({ tax_code: event.target.value })} /></FieldBlock><FieldBlock label="Compliance notes" wide><Textarea rows={3} value={draft.compliance_notes} onChange={event => onChange({ compliance_notes: event.target.value })} placeholder="Warnings, certifications or provider requirements" /></FieldBlock><p className="sm:col-span-2 text-xs text-muted-foreground">Prototype fields update when a provider category is selected.</p></div></details>}</section>;
}

function SelectInput({ value, onChange, placeholder, options }: { value: string; onChange: (value: string) => void; placeholder: string; options: Array<[string, string]> }) {
  return <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={value} onChange={event => onChange(event.target.value)}><option value="">{placeholder}</option>{options.map(([valueOption, label]) => <option key={valueOption} value={valueOption}>{label}</option>)}</select>;
}

function ProviderFields({ channel, draft, productName, onChange }: { channel: WizardChannel; draft: ChannelWizardDraft; productName: string; onChange: (patch: Partial<ChannelWizardDraft>) => void }) {
  const common = <FieldBlock label="Price source"><SelectInput value={draft.listing_mode} onChange={value => onChange({ listing_mode: value })} placeholder="Select price source" options={[["master", "Use Product Master price"], ["markup", "Master price + markup"], ["manual", "Manual channel price"]]} /></FieldBlock>;
  const content = <><FieldBlock label="Channel title" wide><Input value={draft.title} onChange={event => onChange({ title: event.target.value })} placeholder={productName || 'Use Product Master title'} /></FieldBlock><FieldBlock label="Channel description" helper="Leave empty to inherit Product Master content." wide><Textarea rows={3} value={draft.description} onChange={event => onChange({ description: event.target.value })} /></FieldBlock></>;

  if (channel.key === 'amazon') return <><FieldBlock label="Amazon listing mode"><SelectInput value={draft.listing_mode} onChange={value => onChange({ listing_mode: value })} placeholder="Choose listing mode" options={[["offer_only", "Offer on existing ASIN"], ["new_listing", "Create a new Amazon listing"]]} /></FieldBlock><FieldBlock label="Search / match Amazon catalog *" helper="ASIN, EAN, UPC, GTIN, JAN or ISBN."><Input value={draft.identifier} onChange={event => onChange({ identifier: event.target.value.toUpperCase() })} placeholder="Search ASIN or product identifier" /></FieldBlock><FieldBlock label="Condition *"><SelectInput value={draft.condition} onChange={value => onChange({ condition: value })} placeholder="Select condition" options={[["new_new", "New"], ["used_like_new", "Used — Like new"], ["used_very_good", "Used — Very good"]]} /></FieldBlock><FieldBlock label="Fulfillment *"><SelectInput value={draft.fulfillment} onChange={value => onChange({ fulfillment: value })} placeholder="Select FBA or FBM" options={[["FBA", "FBA — Amazon fulfilled"], ["FBM", "FBM — Merchant fulfilled"]]} /></FieldBlock><FieldBlock label="Channel price"><Input type="number" value={draft.price_markup} onChange={event => onChange({ price_markup: event.target.value })} placeholder="Use Product Master price" /></FieldBlock><FieldBlock label="Search terms"><Input value={draft.search_terms} onChange={event => onChange({ search_terms: event.target.value })} placeholder="Separate terms with commas" /></FieldBlock><FieldBlock label="Bullet points" wide><Textarea rows={4} value={draft.bullet_points} onChange={event => onChange({ bullet_points: event.target.value })} placeholder="One benefit per line" /></FieldBlock></>;
  if (channel.key === 'shopee') return <>{common}<FieldBlock label="Shopee category *" helper="Drives required Shopee attributes."><Input value={draft.category} onChange={event => onChange({ category: event.target.value })} placeholder="Search Shopee category" /></FieldBlock><FieldBlock label="Shipping option *"><SelectInput value={draft.shipping_option} onChange={value => onChange({ shipping_option: value })} placeholder="Select logistics service" options={[["shopee_xpress", "Shopee Xpress"], ["seller", "Seller shipping"], ["pickup", "Store pickup"]]} /></FieldBlock><FieldBlock label="Pre-order"><Input type="number" value={draft.preorder_days} onChange={event => onChange({ preorder_days: event.target.value })} placeholder="Days to ship (optional)" /></FieldBlock>{content}</>;
  if (channel.key === 'tiktok') return <>{common}<FieldBlock label="TikTok category *"><Input value={draft.category} onChange={event => onChange({ category: event.target.value })} placeholder="Search TikTok Shop category" /></FieldBlock><FieldBlock label="Certification"><Input value={draft.certification} onChange={event => onChange({ certification: event.target.value })} placeholder="Required for regulated categories" /></FieldBlock><FieldBlock label="Product video"><Input value={draft.video_url} onChange={event => onChange({ video_url: event.target.value })} placeholder="Video asset or URL" /></FieldBlock>{content}</>;
  if (channel.key === 'rakuten') return <>{common}<FieldBlock label="Rakuten category *"><Input value={draft.category} onChange={event => onChange({ category: event.target.value })} placeholder="Search Rakuten category" /></FieldBlock><FieldBlock label="Catalog ID *" helper="JAN/GTIN or Rakuten catalog identifier."><Input value={draft.identifier} onChange={event => onChange({ identifier: event.target.value })} /></FieldBlock><FieldBlock label="R-Cabinet media"><Input value={draft.video_url} onChange={event => onChange({ video_url: event.target.value })} placeholder="Select linked media assets" /></FieldBlock>{content}</>;
  if (channel.key === 'lazada') return <>{common}<FieldBlock label="Lazada category *"><Input value={draft.category} onChange={event => onChange({ category: event.target.value })} placeholder="Search Lazada category" /></FieldBlock><FieldBlock label="Brand"><Input value={draft.brand} onChange={event => onChange({ brand: event.target.value })} /></FieldBlock><FieldBlock label="Shipping option *"><SelectInput value={draft.shipping_option} onChange={value => onChange({ shipping_option: value })} placeholder="Select shipping option" options={[["fbl", "Fulfilled by Lazada"], ["seller", "Seller fulfilled"]]} /></FieldBlock><FieldBlock label="Warranty"><Input value={draft.warranty} onChange={event => onChange({ warranty: event.target.value })} /></FieldBlock>{content}</>;
  if (channel.key === 'webstore') return <><FieldBlock label="Storefront URL *" helper="Generated from the Product Master title."><Input value={draft.web_slug} onChange={event => onChange({ web_slug: event.target.value })} placeholder="/products/product-name" /></FieldBlock><FieldBlock label="Visibility"><SelectInput value={draft.visibility} onChange={value => onChange({ visibility: value })} placeholder="Select visibility" options={[["public", "Public"], ["scheduled", "Scheduled"], ["hidden", "Hidden"]]} /></FieldBlock>{common}<FieldBlock label="SEO title" wide><Input value={draft.title} onChange={event => onChange({ title: event.target.value })} placeholder={productName} /></FieldBlock><FieldBlock label="SEO description" wide><Textarea rows={3} value={draft.description} onChange={event => onChange({ description: event.target.value })} /></FieldBlock></>;
  if (channel.key === 'pos') return <><FieldBlock label="POS barcode *"><Input value={draft.pos_barcode} onChange={event => onChange({ pos_barcode: event.target.value })} placeholder="EAN/UPC or internal barcode" /></FieldBlock><FieldBlock label="Sell at locations"><Input value={draft.warehouse} onChange={event => onChange({ warehouse: event.target.value })} placeholder="All retail locations" /></FieldBlock><FieldBlock label="Receipt name"><Input value={draft.title} onChange={event => onChange({ title: event.target.value })} placeholder={productName} /></FieldBlock><FieldBlock label="POS price"><Input type="number" value={draft.price_markup} onChange={event => onChange({ price_markup: event.target.value })} placeholder="Use Product Master price" /></FieldBlock></>;
  return <><FieldBlock label="Sales visibility *"><SelectInput value={draft.visibility} onChange={value => onChange({ visibility: value })} placeholder="Select visibility" options={[["agents", "All sales agents"], ["teams", "Selected teams"], ["hidden", "Hidden"]]} /></FieldBlock><FieldBlock label="Suggested reply title"><Input value={draft.title} onChange={event => onChange({ title: event.target.value })} placeholder={productName} /></FieldBlock><FieldBlock label="Sales description" wide><Textarea rows={4} value={draft.description} onChange={event => onChange({ description: event.target.value })} /></FieldBlock></>;
}

function listingSummary(key: string, draft: ChannelWizardDraft) {
  if (key === 'amazon') return `${draft.identifier} · ${draft.fulfillment}`;
  if (key === 'webstore') return draft.web_slug;
  if (key === 'pos') return `Barcode ${draft.pos_barcode}`;
  if (key === 'social') return draft.visibility;
  return `${draft.category} · Stock ${draft.stock_quantity}`;
}

function Summary({ selected, productType, active }: { selected: WizardChannel[]; productType: string; active?: string }) {
  return <aside className="h-fit rounded-xl border p-5"><p className="font-semibold">Summary</p><div className="mt-4 flex items-center justify-between text-sm"><span className="text-muted-foreground">Selected channels</span><strong>{selected.length}</strong></div><div className="mt-4 space-y-2">{selected.map(channel => <div key={channel.key} className="flex items-center gap-2 text-sm"><span className="size-1.5 rounded-full bg-primary" /><span className="truncate font-medium">{channel.label}</span></div>)}</div><div className="my-4 border-t" /><div className="space-y-3 text-sm"><p className="flex justify-between gap-3"><span className="text-muted-foreground">Listing type</span><strong className="text-right">{productType === 'variant' ? 'Product family with variants' : productType}</strong></p><p className="flex justify-between"><span className="text-muted-foreground">Product source</span><strong>Product Master</strong></p>{active && <p className="flex justify-between"><span className="text-muted-foreground">Configuring</span><strong>{active}</strong></p>}</div><p className="mt-5 rounded-lg bg-primary/5 p-3 text-xs text-muted-foreground"><PackageSearch className="mr-1 inline size-3.5" />Each selected channel is configured in sequence.</p></aside>;
}
