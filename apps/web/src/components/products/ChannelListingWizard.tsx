import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronRight, Globe2, Loader2, PackageSearch, Send, Store } from 'lucide-react';
import { ChannelLogo } from '@/components/channels/ChannelLogo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CHANNEL_MARKET_LOCALES } from '@/lib/channel-market-locale';
import { cn } from '@/lib/utils';
import { ListingPricingFields } from './ListingPricingFields';
import { pricingNeedsReview, quoteListingPrice, formatPrice, type ListingPricing } from '@/lib/pricing-rules';
import { usePricingRevision } from '@/hooks/use-pricing';

export interface ChannelWizardDraft extends ListingPricing {
  enabled: boolean;
  title: string;
  price_markup: string;
  description: string;
  listing_sku: string;
  category: string;
  fulfillment: string;
  variant_scope: string;
  selected_variant_ids?: string[];
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
  localized_content_confirmed: boolean;
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
  rakutenBrandName?: string;
  availableStock: number;
  imageCount: number;
  productType: string;
  basePrice?: number;
  baseCurrency?: string;
  localizedContent?: Partial<Record<string, { name?: string; description?: string }>>;
  onChange: (channel: string, patch: Partial<ChannelWizardDraft>) => void;
  onSubmitted?: (selectedDrafts: Record<string, ChannelWizardDraft>) => void;
}

const steps = ['Choose shops', 'Set up & review', 'Done'];

export function ChannelListingWizard({ open, onOpenChange, embedded = false, channels, drafts, masterSku, productName, productCategory, rakutenBrandName = '', availableStock, imageCount, productType, basePrice, baseCurrency = 'JPY', localizedContent = {}, onChange, onSubmitted }: Props) {
  usePricingRevision();
  const [step, setStep] = useState(1);
  const [activeIndex, setActiveIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState('');
  const submitted = useRef(false);
  const selected = useMemo(() => channels.filter(channel => selectedKeys.includes(channel.key)), [channels, selectedKeys]);
  const active = selected[activeIndex];

  useEffect(() => {
    if (!open) return;
    setStep(1); setActiveIndex(0); setSubmitting(false); setSelectedKeys([]); setSubmitError('');
    submitted.current = false;
  }, [open]);

  function suggestedSku(key: string) {
    const prefix = key === 'webstore' ? 'WEB' : key === 'pos' ? 'POS' : key === 'tiktok' ? 'TTS' : key.slice(0, 3).toUpperCase();
    return `${prefix}-${masterSku || 'MASTER-SKU'}`;
  }

  function toggle(channel: WizardChannel, enabled: boolean) {
    if (enabled && channel.connectionStatus !== 'connected') return;
    setSelectedKeys(current => enabled ? [...current, channel.key] : current.filter(key => key !== channel.key));
    if (!enabled) return;
    const draft = drafts[channel.key];
    const slug = productName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const market = CHANNEL_MARKET_LOCALES[channel.key];
    const masterLocale = market ? localizedContent[market.locale] : undefined;
    onChange(channel.key, {
      brand: channel.key === 'rakuten' && !draft.brand.trim() ? rakutenBrandName : draft.brand,
      listing_sku: draft.listing_sku || suggestedSku(channel.key),
      variant_scope: draft.variant_scope || 'all',
      listing_mode: draft.listing_mode || (channel.key === 'amazon' ? 'offer_only' : 'master'),
      title: draft.title || masterLocale?.name || productName,
      description: draft.description || masterLocale?.description || '',
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
    if (basePrice !== undefined && pricingNeedsReview(draft, quoteListingPrice(basePrice, baseCurrency, draft))) issues.push('Listing price');
    if (!draft.listing_sku.trim()) issues.push('Channel SKU');
    if (channel.key === 'webstore' && !draft.web_slug.trim()) issues.push('Storefront URL');
    if (channel.key === 'pos' && !draft.pos_barcode.trim()) issues.push('POS barcode');
    if (channel.key === 'social' && !draft.visibility) issues.push('Sales visibility');
    if (['shopee', 'lazada', 'tiktok', 'rakuten'].includes(channel.key) && !draft.category.trim()) issues.push('Category');
    if (['shopee', 'lazada'].includes(channel.key) && !draft.shipping_option) issues.push('Shipping option');
    if (channel.key === 'tiktok' && !draft.warehouse) issues.push('TikTok warehouse');
    if (channel.key === 'rakuten' && !draft.identifier.trim()) issues.push('Catalog ID');
    if (channel.key === 'amazon') {
      if (!['offer_only', 'new_listing'].includes(draft.listing_mode)) issues.push('Amazon listing mode');
      if (!draft.identifier.trim()) issues.push('ASIN / catalog match');
      if (!draft.condition) issues.push('Condition');
      if (!draft.fulfillment) issues.push('FBA / FBM');
    }
    const market = CHANNEL_MARKET_LOCALES[channel.key];
    if (market?.policy === 'exact' && (!draft.localized_content_confirmed || !draft.title.trim() || !draft.description.trim())) issues.push(`Listing content · ${market.locale}`);
    return issues;
  };
  const issueCount = selected.filter(channel => issuesFor(channel).length > 0).length;
  const missingFieldCount = selected.reduce((total, channel) => total + issuesFor(channel).length, 0);
  const newCount = selected.length;

  function focusIssue(channel: WizardChannel, issue: string) {
    const highlight = (target?: Element | null) => {
      if (!(target instanceof HTMLElement)) return;
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.classList.add('ring-2', 'ring-amber-400', 'ring-offset-2', 'ring-offset-background');
      window.setTimeout(() => target.classList.remove('ring-2', 'ring-amber-400', 'ring-offset-2', 'ring-offset-background'), 1800);
    };
    if (issue.startsWith('Listing content')) {
      window.setTimeout(() => highlight(document.getElementById(`${channel.key}-locale-title`)?.closest('section')), 50);
      return;
    }
    if (issue === 'Listing price') { highlight(document.querySelector('[data-listing-pricing]')); return; }
    const labelText = issue === 'FBA / FBM' ? 'Fulfillment' : issue === 'ASIN / catalog match' ? 'Search / match Amazon catalog' : issue === 'Channel SKU' ? `${channel.label} SKU` : issue;
    const label = Array.from(document.querySelectorAll('label')).find(item => item.textContent?.includes(labelText));
    highlight(label?.closest('[data-field-block]'));
  }

  function submit() {
    if (!selected.length || submitted.current) return;
    if (selected.some(channel => issuesFor(channel).length)) { setStep(2); return; }
    submitted.current = true;
    setSubmitting(true); setSubmitError('');
    try {
      if (!onSubmitted) throw new Error('Creation is unavailable. Close setup and try again.');
      // Selection is temporary. Never pass unselected or existing listing settings to persistence.
      onSubmitted(Object.fromEntries(selected.map(channel => [channel.key, { ...drafts[channel.key], enabled: true }])));
      setStep(5);
    } catch (error) {
      submitted.current = false;
      setSubmitError(error instanceof Error ? error.message : 'Unable to save drafts. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const visibleStep = step <= 3 ? (step === 1 ? 1 : 2) : 3;
  const stepTitle = step === 1 ? 'Create channel listings' : step === 2 ? `Set up ${active?.account || active?.label || 'shop'} listing` : step === 3 ? 'Review new listings' : step === 4 ? 'Creating listing drafts' : 'Listing setup saved';
  const stepDescription = step === 1 ? 'Choose shops for new listings. Shops already linked to this Master are excluded.' : step === 2 ? 'Complete only the channel-specific requirements. Product Master data stays unchanged.' : step === 3 ? 'Only these new drafts will be added. Existing listings and Master data stay unchanged.' : step === 4 ? 'Saving listing drafts and validating each selected channel.' : 'New drafts are saved locally. Nothing has been sent to your shops.';
  function renderLocaleSetup(channel: WizardChannel) {
    const market = CHANNEL_MARKET_LOCALES[channel.key];
    if (market?.policy !== 'exact') return null;
    const draft = drafts[channel.key];
    const needsReview = !draft.localized_content_confirmed || !draft.title.trim() || !draft.description.trim();
    return (
      <section className="rounded-xl border bg-muted/10 p-5" aria-labelledby={`${channel.key}-locale-title`}>
        <div className="flex flex-wrap items-start gap-3">
          <Globe2 className={cn('mt-0.5 size-5 shrink-0', needsReview ? 'text-amber-300' : 'text-emerald-400')} />
          <div className="min-w-0 flex-1">
            <h3 id={`${channel.key}-locale-title`} className="text-sm font-semibold">{channel.label} listing content · {market.locale}</h3>
            <p className="mt-1 text-xs text-muted-foreground">Required for publishing on {market.market}. These values belong to this listing only.</p>
          </div>
          <Badge variant="outline" className={cn(needsReview ? 'border-amber-500/40 text-amber-300' : 'border-emerald-500/35 text-emerald-300')}>{needsReview ? 'Review required' : 'Listing ready'}</Badge>
        </div>
        <div className="mt-4 grid gap-4 border-t pt-4">
          <FieldBlock label={`Product name · ${market.locale}`} invalid={!draft.title.trim()}><Input value={draft.title} onChange={event => onChange(channel.key, { title: event.target.value, localized_content_confirmed: false })} /></FieldBlock>
          <FieldBlock label={`Description · ${market.locale}`} invalid={!draft.description.trim()}><Textarea rows={4} value={draft.description} onChange={event => onChange(channel.key, { description: event.target.value, localized_content_confirmed: false })} /></FieldBlock>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">Product Master will not be changed. After publishing, you can review and reuse this content in Master.</p>
            {needsReview ? <Button type="button" size="sm" disabled={!draft.title.trim() || !draft.description.trim()} onClick={() => onChange(channel.key, { localized_content_confirmed: true })}>Use for this listing</Button> : <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-300"><CheckCircle2 className="size-4" />Ready to publish</span>}
          </div>
        </div>
      </section>
    );
  }
  const content = <>
    {embedded ? <header className="flex items-start gap-3"><Button type="button" variant="ghost" size="icon" className="mt-0.5 shrink-0" aria-label="Back to Product Master" onClick={() => onOpenChange(false)}><ArrowLeft className="size-4" /></Button><div><h1 className="text-xl font-semibold tracking-tight">{stepTitle}</h1><p className="mt-1 text-sm text-muted-foreground">{stepDescription}</p></div></header> : <DialogHeader><DialogTitle>{stepTitle}</DialogTitle><DialogDescription>{stepDescription}</DialogDescription></DialogHeader>}
    <ol className="grid grid-cols-3 px-2 py-3" aria-label="Listing creation progress">{steps.map((label, index) => { const number = index + 1; const complete = number < visibleStep; const current = number === visibleStep; return <li key={label} className="relative flex items-center gap-2 first:justify-start last:justify-end even:justify-center"><span className={cn('absolute top-1/2 h-px -translate-y-1/2 bg-border', index > 0 && 'right-1/2 left-0', index === 0 && 'hidden')} /><span className={cn('absolute top-1/2 h-px -translate-y-1/2 bg-border', index < 2 && 'left-1/2 right-0', index === 2 && 'hidden')} /><span className={cn('relative z-10 grid size-7 place-items-center rounded-full border bg-background text-[11px] font-semibold', complete && 'border-primary bg-primary text-primary-foreground', current && 'border-primary text-primary')}>{complete ? <Check className="size-3.5" /> : number}</span><span className={cn('relative z-10 hidden bg-background px-1.5 text-xs sm:block', complete || current ? 'font-semibold text-foreground' : 'text-muted-foreground')}>{label}</span></li>; })}</ol>
    <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-2">
      {step === 1 && <div className="space-y-4">
        {channels.length ? <div className="grid content-start gap-3 sm:grid-cols-2">{channels.map(channel => {
          const checked = selectedKeys.includes(channel.key);
          const available = channel.connectionStatus === 'connected';
          return <button key={channel.key} type="button" disabled={!available} aria-pressed={checked}
            aria-label={`Select ${channel.account || channel.label} · ${channel.label}`}
            onClick={() => toggle(channel, !checked)}
            className={cn('flex min-h-24 cursor-pointer items-center gap-3 rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-45', checked ? 'border-primary bg-primary/5' : 'hover:border-primary/40 hover:bg-muted/20')}>
            <span aria-hidden="true" className={cn('grid size-4 shrink-0 place-items-center rounded border border-primary', checked && 'bg-primary text-primary-foreground')}>{checked && <Check className="size-3" />}</span>
            <WizardChannelLogo channel={channel} />
            <span className="min-w-0 flex-1"><strong className="block break-words text-sm">{channel.account || channel.label}</strong>
              <span className="mt-1 block text-xs text-muted-foreground">{channel.label}</span>
              {!available && <span className="mt-1 block text-xs text-muted-foreground">{channel.unavailableReason || 'Connect this shop first.'}</span>}
            </span>
          </button>;
        })}</div> : <div className="rounded-lg border border-dashed p-8 text-center">
          <Store className="mx-auto mb-3 size-6 text-muted-foreground" />
          <h3 className="text-sm font-semibold">No shops available for a new listing</h3>
          <p className="mt-2 text-sm text-muted-foreground">Return to Channel listings to manage linked listings or connect another shop.</p>
        </div>}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground" aria-live="polite">
          <span>{selected.length ? `${selected.length} shop${selected.length === 1 ? '' : 's'} selected` : 'No shops selected'}</span>
          <span>Already selling on a shop? Use “Link existing listings”.</span>
        </div>
      </div>}
      {step === 2 && active && issuesFor(active).length > 0 && <MissingTasksPanel channelLabel={active.account || active.label} issues={issuesFor(active)} onSelect={issue => focusIssue(active, issue)} />}
      {step === 2 && active && <div className="grid items-start gap-5 lg:grid-cols-[210px_minmax(0,1fr)]"><nav className="sticky top-0 z-10 max-h-[calc(92vh-12rem)] space-y-2 overflow-y-auto rounded-xl bg-background py-1 pr-1" aria-label="Selected channel listings">{selected.map((channel, index) => { const issues = issuesFor(channel); return <button key={channel.key} type="button" onClick={() => setActiveIndex(index)} className={cn('flex min-h-16 w-full items-center gap-2 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', index === activeIndex ? 'border-primary bg-primary/5' : 'hover:bg-muted/30')}><WizardChannelLogo channel={channel} size="md" /><span className="min-w-0 flex-1"><strong className="block break-words text-sm">{channel.account || channel.label}</strong><span className="mt-1 block text-xs text-muted-foreground">{channel.label}</span><span className={cn('text-[11px]', issues.length ? 'text-amber-600' : 'text-emerald-600')}>{issues.length ? <MissingBadge issues={issues} /> : 'Ready'}</span></span>{!issues.length && <Check className="size-4 text-emerald-600" />}</button>; })}</nav><div className="space-y-4"><div className="flex items-center gap-3 rounded-xl border bg-muted/20 p-4"><WizardChannelLogo channel={active} /><div className="min-w-0"><p className="break-words font-semibold">{active.account || active.label}</p><p className="mt-1 text-xs text-muted-foreground">{active.label}</p></div><Badge variant={issuesFor(active).length ? 'outline' : 'default'} className="ml-auto">{issuesFor(active).length ? `${issuesFor(active).length} missing` : 'Ready'}</Badge></div>{renderLocaleSetup(active)}<SectionCard title="Listing identity" description="Master values are read only. Edit only fields that need to differ on this channel."><FieldBlock label="Master SKU" helper="Shared identity; read only."><Input value={masterSku} readOnly className="bg-muted/40 font-mono" /></FieldBlock><FieldBlock label={`${active.label} SKU *`} helper="Generated from Master SKU; editable for this channel." invalid={!drafts[active.key].listing_sku.trim()}><Input className="font-mono uppercase" value={drafts[active.key].listing_sku} onChange={event => onChange(active.key, { listing_sku: event.target.value.toUpperCase() })} /></FieldBlock><ProviderFields channel={active} draft={drafts[active.key]} productName={productName} onChange={patch => onChange(active.key, patch)} /></SectionCard>{basePrice !== undefined && <ListingPricingFields syncManaged draft={drafts[active.key]} basePrice={basePrice} baseCurrency={baseCurrency} shopLabel={active.account || active.label} onChange={patch => onChange(active.key, patch)} />}<InventoryAndAvailability channel={active} draft={drafts[active.key]} masterStock={availableStock} onChange={patch => onChange(active.key, patch)} /><AdditionalListingData channel={active} draft={drafts[active.key]} imageCount={imageCount} onChange={patch => onChange(active.key, patch)} />{issuesFor(active).length > 0 && <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 p-3 text-sm text-foreground"><div className="flex items-center gap-2 font-semibold text-amber-300"><AlertTriangle className="size-4" />{issuesFor(active).length} item{issuesFor(active).length === 1 ? '' : 's'} missing</div><p className="mt-1 text-xs text-foreground/75">{issuesFor(active).join(' · ')}</p></div>}</div></div>}
      {step === 3 && <div className="mx-auto w-full max-w-4xl space-y-4">
        <div className="overflow-hidden rounded-xl border">
          <div className="border-b bg-muted/20 px-4 py-3"><h3 className="text-sm font-semibold">{newCount} new listing{newCount === 1 ? '' : 's'}</h3><p className="mt-1 text-xs text-muted-foreground">Select a shop to edit its setup.</p></div>
          <div className="divide-y">{selected.map((channel, index) => { return <button key={channel.key} type="button" onClick={() => { setActiveIndex(index); setStep(2); }} className="flex min-h-20 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
            <WizardChannelLogo channel={channel} />
            <span className="min-w-0 flex-1"><strong className="block break-words text-sm">{channel.account || channel.label}</strong><span className="mt-1 block text-xs text-muted-foreground">{channel.label} · {drafts[channel.key].listing_sku}</span></span>
            <span className="text-right"><span className="block text-sm font-medium">{basePrice !== undefined ? formatPrice(drafts[channel.key].channel_price, drafts[channel.key].channel_currency) : null}</span><span className="mt-1 block text-xs text-muted-foreground">New draft · Sync off</span></span><ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </button>; })}</div>
        </div>
        <div className="flex gap-3 rounded-xl border bg-muted/20 p-4 text-sm"><PackageSearch className="mt-0.5 size-4 shrink-0 text-primary" /><p>Only new drafts will be created. Existing listings, their sync settings, and Product Master data stay unchanged. No shop update is sent.</p></div>
        {submitError && <p role="alert" className="rounded-lg border border-destructive/40 p-3 text-sm text-destructive">{submitError}</p>}
      </div>}
      {step === 4 && <div className="mx-auto flex max-w-xl flex-col items-center py-14 text-center" aria-live="polite">{submitting ? <Loader2 className="size-12 animate-spin text-primary motion-reduce:animate-none" /> : <Send className="size-12 text-primary" />}<h3 className="mt-5 text-lg font-semibold">{submitting ? 'Creating listing drafts' : 'Drafts created'}</h3><p className="mt-2 text-sm text-muted-foreground">Saving {selected.length} channel-owned listing drafts from the current Product Master revision. No provider submission happens in this prototype.</p></div>}
      {step === 5 && <div className="mx-auto max-w-2xl py-8" role="status">
        <div className="text-center"><CheckCircle2 className="mx-auto size-12 text-emerald-400" /><h3 className="mt-4 text-xl font-semibold">Listing drafts created</h3><p className="mt-2 text-sm text-muted-foreground">Manage each draft from Channel listings. Existing listings are unchanged.</p></div>
        <div className="mt-6 divide-y rounded-lg border">{selected.map(channel => <div key={channel.key} className="flex items-center gap-3 p-4"><WizardChannelLogo channel={channel} /><span className="min-w-0 flex-1"><strong className="block break-words text-sm">{channel.account || channel.label}</strong><span className="mt-1 block text-xs text-muted-foreground">{channel.label} · {drafts[channel.key].listing_sku}</span></span><Badge variant="outline">Draft created</Badge></div>)}</div>
      </div>}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4"><div>{step === 2 ? <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="size-4" />Back to shops</Button> : step === 3 ? <Button variant="outline" onClick={() => setStep(2)}><ArrowLeft className="size-4" />Back to setup</Button> : <Button variant="outline" onClick={() => onOpenChange(false)}>{step === 5 ? 'Close' : 'Cancel'}</Button>}</div><div className="ml-auto flex items-center gap-3">{step === 2 && missingFieldCount > 0 && <button type="button" className="text-right text-xs text-amber-300 underline-offset-4 hover:underline" onClick={() => { const firstInvalidIndex = selected.findIndex(channel => issuesFor(channel).length > 0); if (firstInvalidIndex >= 0) setActiveIndex(firstInvalidIndex); }}>{missingFieldCount} missing across {issueCount} channel{issueCount === 1 ? '' : 's'}</button>}<Button onClick={() => { if (step === 1) { setActiveIndex(0); setStep(2); } else if (step === 2) setStep(3); else if (step === 3) submit(); else if (step === 5) onOpenChange(false); }} disabled={submitting || (step < 4 && selected.length === 0) || (step === 2 && issueCount > 0) || step === 4}>{step === 1 ? `Set up ${selected.length} shop${selected.length === 1 ? '' : 's'}` : step === 2 ? 'Review new listings' : step === 3 ? `Create ${newCount} draft${newCount === 1 ? '' : 's'}` : step === 5 ? 'Done' : 'Creating…'}{step < 4 && <ArrowRight className="size-4" />}</Button></div></div>
  </>;
  if (embedded) return <div className="mx-auto flex min-h-[calc(100vh-7rem)] w-full max-w-7xl flex-col px-5 py-6 lg:px-8">{content}</div>;
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className={cn('flex max-h-[92vh] flex-col overflow-hidden', step === 2 ? 'sm:max-w-7xl' : 'sm:max-w-5xl')}>{content}</DialogContent></Dialog>;
}

function WizardChannelLogo({ channel, size = 'lg' }: { channel: WizardChannel; size?: 'md' | 'lg' }) {
  return <ChannelLogo channel={{ key: channel.key === 'webstore' ? 'primeweb' : channel.key, label: channel.label }} size={size} />;
}

function MissingTasksPanel({ channelLabel, issues, onSelect }: { channelLabel: string; issues: string[]; onSelect: (issue: string) => void }) {
  return <section className="mb-4 rounded-xl border bg-muted/20 p-4" aria-label={`${issues.length} missing items for ${channelLabel}`}><div className="flex flex-wrap items-center gap-2"><AlertTriangle className="size-4 text-amber-300" /><p className="text-sm font-semibold">{issues.length} missing for {channelLabel}</p><p className="text-xs text-muted-foreground">Select an item to highlight its field.</p></div><div className="mt-3 flex flex-wrap gap-2">{issues.map(issue => <button key={issue} type="button" onClick={() => onSelect(issue)} className="rounded-md border bg-background/60 px-2.5 py-1.5 text-xs text-foreground transition-colors hover:border-primary/50 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{issue}</button>)}</div></section>;
}

function MissingBadge({ issues }: { issues: string[] }) {
  return <TooltipProvider delayDuration={150}><Tooltip><TooltipTrigger asChild><span className="cursor-help">{issues.length} missing</span></TooltipTrigger><TooltipContent side="right" className="max-w-64"><p className="font-semibold">Still needed</p><p className="mt-1 text-xs">{issues.join(' · ')}</p></TooltipContent></Tooltip></TooltipProvider>;
}

function FieldBlock({ label, helper, children, wide = false, invalid = false }: { label: string; helper?: string; children: ReactNode; wide?: boolean; invalid?: boolean }) {
  return <div data-field-block data-invalid={invalid || undefined} className={cn('space-y-2 rounded-lg', wide && 'sm:col-span-2', invalid && 'border border-amber-500/45 bg-amber-500/10 p-3')}><div className="flex items-center justify-between gap-2"><Label className={cn(invalid && 'text-amber-200')}>{label}</Label>{invalid && <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-amber-300"><AlertTriangle className="size-3" />Missing</span>}</div>{children}{helper && <p className="text-xs leading-5 text-muted-foreground">{helper}</p>}</div>;
}

function SectionCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <section className="rounded-xl border"><header className="border-b bg-muted/20 px-5 py-4"><h3 className="text-sm font-semibold">{title}</h3><p className="mt-1 text-xs text-muted-foreground">{description}</p></header><div className="grid gap-4 p-5 sm:grid-cols-2">{children}</div></section>;
}

function InventoryAndAvailability({ channel, draft, masterStock, onChange }: { channel: WizardChannel; draft: ChannelWizardDraft; masterStock: number; onChange: (patch: Partial<ChannelWizardDraft>) => void }) {
  const fba = channel.key === 'amazon' && draft.fulfillment === 'FBA';
  return <SectionCard title="Listing stock" description="One-time draft quantity. Master inventory stays unchanged; automatic stock sync is configured separately.">
    <FieldBlock label="Master stock" helper="Reference only; no stock is reserved or transferred."><Input readOnly value={`${masterStock} units`} className="bg-muted/40" /></FieldBlock>
    <FieldBlock label={fba ? 'Amazon FBA stock' : 'Draft quantity'} helper={fba ? 'Managed by Amazon after publication.' : 'Quantity for this listing draft only.'}>
      {fba ? <Input readOnly value="Managed by Amazon" className="bg-muted/40" /> : <Input aria-label="Draft quantity" type="number" min="0" step="1" value={draft.stock_quantity} onChange={event => onChange({ stock_quantity: event.target.value })} />}
    </FieldBlock>
    {channel.key === 'tiktok' && <FieldBlock label="TikTok warehouse *" invalid={!draft.warehouse}><Input value={draft.warehouse} onChange={event => onChange({ warehouse: event.target.value })} /></FieldBlock>}
  </SectionCard>;
}

function AdditionalListingData({ channel, draft, imageCount, onChange }: { channel: WizardChannel; draft: ChannelWizardDraft; imageCount: number; onChange: (patch: Partial<ChannelWizardDraft>) => void }) {
  const marketplace = ['amazon', 'shopee', 'lazada', 'tiktok', 'rakuten'].includes(channel.key);
  return <section className="space-y-2"><details className="group rounded-xl border" open={marketplace}><summary className="flex min-h-12 cursor-pointer list-none items-center px-5 text-sm font-semibold">Variants & media<Badge variant="outline" className="ml-auto">{imageCount} master images</Badge><ChevronRight className="ml-2 size-4 transition-transform group-open:rotate-90" /></summary><div className="grid gap-4 border-t p-5 sm:grid-cols-2"><FieldBlock label="Variants to publish"><SelectInput value={draft.variant_scope} onChange={value => onChange({ variant_scope: value })} placeholder="Select variants" options={[["all", "All active variants"], ["selected", "Choose specific variants"], ["parent", "Parent only"]]} /></FieldBlock><FieldBlock label="Media selection"><SelectInput value={draft.media_scope} onChange={value => onChange({ media_scope: value })} placeholder="Select media" options={[["all", "Use all Product Master images"], ["selected", "Choose channel images"], ["custom", "Upload channel-only media"]]} /></FieldBlock></div></details>{marketplace && <details className="group rounded-xl border"><summary className="flex min-h-12 cursor-pointer list-none items-center px-5 text-sm font-semibold">Category attributes & compliance<span className="ml-auto text-xs font-normal text-muted-foreground">Schema-driven</span><ChevronRight className="ml-2 size-4 transition-transform group-open:rotate-90" /></summary><div className="grid gap-4 border-t p-5 sm:grid-cols-2"><FieldBlock label="Material"><Input value={draft.attribute_material} onChange={event => onChange({ attribute_material: event.target.value })} placeholder="Loaded from selected category" /></FieldBlock><FieldBlock label="Color / pattern"><Input value={draft.attribute_color} onChange={event => onChange({ attribute_color: event.target.value })} placeholder="Loaded from selected category" /></FieldBlock><FieldBlock label="Tax code"><Input value={draft.tax_code} onChange={event => onChange({ tax_code: event.target.value })} /></FieldBlock><FieldBlock label="Compliance notes" wide><Textarea rows={3} value={draft.compliance_notes} onChange={event => onChange({ compliance_notes: event.target.value })} placeholder="Warnings, certifications or provider requirements" /></FieldBlock><p className="sm:col-span-2 text-xs text-muted-foreground">Prototype fields update when a provider category is selected.</p></div></details>}</section>;
}

function SelectInput({ value, onChange, placeholder, options }: { value: string; onChange: (value: string) => void; placeholder: string; options: Array<[string, string]> }) {
  return <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={value} onChange={event => onChange(event.target.value)}><option value="">{placeholder}</option>{options.map(([valueOption, label]) => <option key={valueOption} value={valueOption}>{label}</option>)}</select>;
}

function ProviderFields({ channel, draft, productName, onChange }: { channel: WizardChannel; draft: ChannelWizardDraft; productName: string; onChange: (patch: Partial<ChannelWizardDraft>) => void }) {
  const common = null; // Pricing has its own reviewable section.
  const content = CHANNEL_MARKET_LOCALES[channel.key]?.policy === 'exact' ? null : <><FieldBlock label="Channel title" wide><Input value={draft.title} onChange={event => onChange({ title: event.target.value })} placeholder={productName || 'Use Product Master title'} /></FieldBlock><FieldBlock label="Channel description" helper="Leave empty to inherit Product Master content." wide><Textarea rows={3} value={draft.description} onChange={event => onChange({ description: event.target.value })} /></FieldBlock></>;

  if (channel.key === 'amazon') return <><FieldBlock label="Amazon listing mode" invalid={!["offer_only", "new_listing"].includes(draft.listing_mode)}><SelectInput value={draft.listing_mode} onChange={value => onChange({ listing_mode: value })} placeholder="Choose listing mode" options={[["offer_only", "Offer on existing ASIN"], ["new_listing", "Create a new Amazon listing"]]} /></FieldBlock><FieldBlock label="Search / match Amazon catalog *" invalid={!draft.identifier.trim()} helper="ASIN, EAN, UPC, GTIN, JAN or ISBN."><Input value={draft.identifier} onChange={event => onChange({ identifier: event.target.value.toUpperCase() })} placeholder="Search ASIN or product identifier" /></FieldBlock><FieldBlock label="Condition *" invalid={!draft.condition}><SelectInput value={draft.condition} onChange={value => onChange({ condition: value })} placeholder="Select condition" options={[["new_new", "New"], ["used_like_new", "Used — Like new"], ["used_very_good", "Used — Very good"]]} /></FieldBlock><FieldBlock label="Fulfillment *" invalid={!draft.fulfillment}><SelectInput value={draft.fulfillment} onChange={value => onChange({ fulfillment: value })} placeholder="Select FBA or FBM" options={[["FBA", "FBA — Amazon fulfilled"], ["FBM", "FBM — Merchant fulfilled"]]} /></FieldBlock><FieldBlock label="Search terms"><Input value={draft.search_terms} onChange={event => onChange({ search_terms: event.target.value })} placeholder="Separate terms with commas" /></FieldBlock><FieldBlock label="Bullet points" wide><Textarea rows={4} value={draft.bullet_points} onChange={event => onChange({ bullet_points: event.target.value })} placeholder="One benefit per line" /></FieldBlock></>;
  if (channel.key === 'shopee') return <>{common}<FieldBlock label="Shopee category *" invalid={!draft.category.trim()} helper="Drives required Shopee attributes."><Input value={draft.category} onChange={event => onChange({ category: event.target.value })} placeholder="Search Shopee category" /></FieldBlock><FieldBlock label="Shipping option *" invalid={!draft.shipping_option}><SelectInput value={draft.shipping_option} onChange={value => onChange({ shipping_option: value })} placeholder="Select logistics service" options={[["shopee_xpress", "Shopee Xpress"], ["seller", "Seller shipping"], ["pickup", "Store pickup"]]} /></FieldBlock><FieldBlock label="Pre-order"><Input type="number" value={draft.preorder_days} onChange={event => onChange({ preorder_days: event.target.value })} placeholder="Days to ship (optional)" /></FieldBlock>{content}</>;
  if (channel.key === 'tiktok') return <>{common}<FieldBlock label="TikTok category *" invalid={!draft.category.trim()}><Input value={draft.category} onChange={event => onChange({ category: event.target.value })} placeholder="Search TikTok Shop category" /></FieldBlock><FieldBlock label="Certification"><Input value={draft.certification} onChange={event => onChange({ certification: event.target.value })} placeholder="Required for regulated categories" /></FieldBlock><FieldBlock label="Product video"><Input value={draft.video_url} onChange={event => onChange({ video_url: event.target.value })} placeholder="Video asset or URL" /></FieldBlock>{content}</>;
  if (channel.key === 'rakuten') return <>{common}<FieldBlock label="Rakuten brand name" helper="Suggestion only — not checked with Rakuten. Edit for this listing without changing Brand settings."><Input aria-label="Rakuten brand name" value={draft.brand} onChange={event => onChange({ brand: event.target.value })} /></FieldBlock><FieldBlock label="Rakuten category *" invalid={!draft.category.trim()}><Input value={draft.category} onChange={event => onChange({ category: event.target.value })} placeholder="Search Rakuten category" /></FieldBlock><FieldBlock label="Catalog ID *" invalid={!draft.identifier.trim()} helper="JAN/GTIN or Rakuten catalog identifier."><Input value={draft.identifier} onChange={event => onChange({ identifier: event.target.value })} /></FieldBlock><FieldBlock label="R-Cabinet media"><Input value={draft.video_url} onChange={event => onChange({ video_url: event.target.value })} placeholder="Select linked media assets" /></FieldBlock>{content}</>;
  if (channel.key === 'lazada') return <>{common}<FieldBlock label="Lazada category *" invalid={!draft.category.trim()}><Input value={draft.category} onChange={event => onChange({ category: event.target.value })} placeholder="Search Lazada category" /></FieldBlock><FieldBlock label="Brand"><Input value={draft.brand} onChange={event => onChange({ brand: event.target.value })} /></FieldBlock><FieldBlock label="Shipping option *" invalid={!draft.shipping_option}><SelectInput value={draft.shipping_option} onChange={value => onChange({ shipping_option: value })} placeholder="Select shipping option" options={[["fbl", "Fulfilled by Lazada"], ["seller", "Seller fulfilled"]]} /></FieldBlock><FieldBlock label="Warranty"><Input value={draft.warranty} onChange={event => onChange({ warranty: event.target.value })} /></FieldBlock>{content}</>;
  if (channel.key === 'webstore') return <><FieldBlock label="Storefront URL *" invalid={!draft.web_slug.trim()} helper="Generated from the Product Master title."><Input value={draft.web_slug} onChange={event => onChange({ web_slug: event.target.value })} placeholder="/products/product-name" /></FieldBlock><FieldBlock label="Visibility"><SelectInput value={draft.visibility} onChange={value => onChange({ visibility: value })} placeholder="Select visibility" options={[["public", "Public"], ["scheduled", "Scheduled"], ["hidden", "Hidden"]]} /></FieldBlock>{common}<FieldBlock label="SEO title" wide><Input value={draft.title} onChange={event => onChange({ title: event.target.value })} placeholder={productName} /></FieldBlock><FieldBlock label="SEO description" wide><Textarea rows={3} value={draft.description} onChange={event => onChange({ description: event.target.value })} /></FieldBlock></>;
  if (channel.key === 'pos') return <><FieldBlock label="POS barcode *" invalid={!draft.pos_barcode.trim()}><Input value={draft.pos_barcode} onChange={event => onChange({ pos_barcode: event.target.value })} placeholder="EAN/UPC or internal barcode" /></FieldBlock><FieldBlock label="Sell at locations"><Input value={draft.warehouse} onChange={event => onChange({ warehouse: event.target.value })} placeholder="All retail locations" /></FieldBlock><FieldBlock label="Receipt name"><Input value={draft.title} onChange={event => onChange({ title: event.target.value })} placeholder={productName} /></FieldBlock></>;
  return <><FieldBlock label="Sales visibility *"><SelectInput value={draft.visibility} onChange={value => onChange({ visibility: value })} placeholder="Select visibility" options={[["agents", "All sales agents"], ["teams", "Selected teams"], ["hidden", "Hidden"]]} /></FieldBlock><FieldBlock label="Suggested reply title"><Input value={draft.title} onChange={event => onChange({ title: event.target.value })} placeholder={productName} /></FieldBlock><FieldBlock label="Sales description" wide><Textarea rows={4} value={draft.description} onChange={event => onChange({ description: event.target.value })} /></FieldBlock></>;
}
