import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Circle, RefreshCw, Save, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import type { ChannelWizardDraft, WizardChannel } from './ChannelListingWizard';

type EditorTab = 'listing' | 'variants-media' | 'price-inventory' | 'requirements' | 'readiness';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: WizardChannel | null;
  draft: ChannelWizardDraft | null;
  masterSku: string;
  productVariants?: Array<{ id: string; label: string; sku: string }>;
  onSave: (patch: Partial<ChannelWizardDraft>) => void;
}

const DEMO_VARIANTS = [
  { id: 'black', label: 'Black', suffix: 'BLK', state: 'included' },
  { id: 'white', label: 'White', suffix: 'WHT', state: 'included' },
  { id: 'red', label: 'Red', suffix: 'RED', state: 'pending' },
] as const;

const TABS: Array<{ value: EditorTab; label: string }> = [
  { value: 'listing', label: 'Listing' },
  { value: 'variants-media', label: 'Variants & media' },
  { value: 'price-inventory', label: 'Price & inventory' },
  { value: 'requirements', label: 'Channel requirements' },
  { value: 'readiness', label: 'Readiness' },
];

export function ChannelListingEditorDrawer({ open, onOpenChange, channel, draft, masterSku, productVariants = [], onSave }: Props) {
  const [form, setForm] = useState<ChannelWizardDraft | null>(draft);
  const listingVariants = useMemo(() => productVariants.length ? productVariants.map(variant => ({ ...variant, state: 'included' as const })) : DEMO_VARIANTS.map(variant => ({ ...variant, sku: `${masterSku}-${variant.suffix}` })), [masterSku, productVariants]);
  const [variants, setVariants] = useState<string[]>([]);
  const [tab, setTab] = useState<EditorTab>('listing');
  const [publishing, setPublishing] = useState(false);
  const [providerFailed, setProviderFailed] = useState(true);
  const [baseline, setBaseline] = useState('');
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const initializedForRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      initializedForRef.current = null;
      return;
    }
    if (!channel || initializedForRef.current === channel.key) return;
    initializedForRef.current = channel.key;
    const initialVariants = listingVariants.filter(variant => variant.state === 'included').map(variant => variant.id);
    setForm(draft ? { ...draft } : null);
    setVariants(initialVariants);
    setBaseline(JSON.stringify({ form: draft, variants: [...initialVariants].sort() }));
    setSavedAt(null);
    setTab('listing');
    setProviderFailed(true);
  }, [channel, draft, listingVariants, open]);

  const blockers = useMemo(() => {
    if (!form || !channel) return [];
    const result: string[] = [];
    if (!form.listing_sku.trim()) result.push('Parent listing SKU is required');
    if (!variants.length) result.push('Include at least one variant');
    if (channel.key === 'webstore' && !form.web_slug.trim()) result.push('Storefront URL is required');
    if (channel.key === 'pos' && !form.pos_barcode.trim()) result.push('POS barcode is required');
    if (channel.key === 'social' && !form.visibility) result.push('Sales visibility is required');
    if (['shopee', 'lazada', 'tiktok', 'rakuten'].includes(channel.key) && !form.category.trim()) result.push(`${channel.label} category is required`);
    if (['shopee', 'lazada', 'tiktok', 'rakuten'].includes(channel.key) && !form.stock_quantity.trim()) result.push('Initial channel stock is required');
    if (['shopee', 'lazada'].includes(channel.key) && !form.shipping_option) result.push('Shipping option is required');
    if (channel.key === 'tiktok' && !form.warehouse) result.push('TikTok warehouse is required');
    if (channel.key === 'rakuten' && !form.identifier.trim()) result.push('Catalog ID is required');
    if (channel.key === 'amazon' && !form.identifier.trim()) result.push('ASIN or catalog match is required');
    if (channel.key === 'amazon' && !form.condition) result.push('Condition is required');
    if (channel.key === 'amazon' && !form.fulfillment) result.push('Fulfillment is required');
    return result;
  }, [channel, form, variants]);

  if (!channel || !form) return null;
  const Icon = channel.icon;
  const isMarketplace = ['amazon', 'shopee', 'lazada', 'tiktok', 'rakuten'].includes(channel.key);
  const patch = (next: Partial<ChannelWizardDraft>) => setForm(current => current ? { ...current, ...next } : current);
  const serializedState = JSON.stringify({ form, variants: [...variants].sort() });
  const hasUnsavedChanges = Boolean(baseline && serializedState !== baseline);
  const save = () => {
    onSave({ ...form, variant_scope: variants.length === listingVariants.length ? 'all' : 'selected' });
    setBaseline(serializedState);
    setSavedAt(Date.now());
  };
  const requestClose = () => {
    if (hasUnsavedChanges && !window.confirm('Discard unsaved listing changes?')) return;
    onOpenChange(false);
  };
  const sectionIssueCounts: Record<EditorTab, number> = {
    listing: Number(!form.listing_sku.trim()) + Number(channel.key === 'webstore' && !form.web_slug.trim()) + Number(channel.key === 'pos' && !form.pos_barcode.trim()) + Number(channel.key === 'social' && !form.visibility),
    'variants-media': Number(!variants.length) + Number(!form.media_scope),
    'price-inventory': Number(channel.key !== 'amazon' && !form.listing_mode) + Number(!form.sync_policy) + Number(['shopee', 'lazada', 'tiktok', 'rakuten'].includes(channel.key) && !form.stock_quantity.trim()) + Number(channel.key === 'tiktok' && !form.warehouse),
    requirements: blockers.filter(item => /category|Shipping|ASIN|Catalog ID|Condition|Fulfillment/.test(item)).length,
    readiness: blockers.length + Number(providerFailed),
  };
  const publish = () => {
    if (blockers.length) return;
    onSave({ ...form, variant_scope: variants.length === listingVariants.length ? 'all' : 'selected' });
    setBaseline(serializedState);
    setSavedAt(Date.now());
    setPublishing(true);
    window.setTimeout(() => { setPublishing(false); setProviderFailed(true); setTab('readiness'); }, 800);
  };

  return <Sheet open={open} onOpenChange={nextOpen => { if (!nextOpen) requestClose(); }}>
    <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-[720px]">
      <SheetHeader className="border-b px-6 py-5 pr-14 text-left">
        <div className="flex items-center gap-3">
          <span className={`grid size-10 place-items-center rounded-lg ${channel.iconClassName}`}><Icon className="size-5" /></span>
          <div className="min-w-0"><SheetTitle>{channel.label} listing</SheetTitle><SheetDescription className="truncate">{channel.account ?? channel.description} · Parent listing SKU: {form.listing_sku || 'Not configured'}</SheetDescription></div>
          <Badge variant="outline" className="ml-auto shrink-0 border-amber-300 text-amber-700">Draft</Badge>
        </div>
      </SheetHeader>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <nav className="flex shrink-0 gap-1 overflow-x-auto border-b px-4 pt-3 md:w-48 md:flex-col md:overflow-x-visible md:border-b-0 md:border-r md:px-3 md:py-5" aria-label="Listing editor sections">
          {TABS.map(item => { const issueCount = sectionIssueCounts[item.value]; return <button key={item.value} type="button" onClick={() => setTab(item.value)} className={`flex min-h-10 shrink-0 items-center gap-2 border-b-2 px-3 text-left text-sm font-medium md:border-b-0 md:border-l-2 ${tab === item.value ? 'border-primary bg-primary/5 text-primary' : 'border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground'}`}><span className="min-w-0 flex-1">{item.label}</span>{issueCount ? <span className="grid size-5 shrink-0 place-items-center rounded-full bg-amber-500/15 text-[10px] font-bold text-amber-600" aria-label={`${issueCount} missing`}>{issueCount}</span> : <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" aria-label="Complete" />}</button>; })}
        </nav>
        <div className="min-h-0 flex-1 overflow-y-auto p-5 md:p-6">
          {tab === 'listing' && <Section title="Listing identity & content" description="Inherited Product Master values remain unchanged; edits apply only to this store listing.">
            <Field label="Master SKU"><Input readOnly value={masterSku} className="bg-muted/40 font-mono" /></Field>
            <Field label={`${channel.label} parent listing SKU *`} helper="The parent-owned identifier for this channel listing."><Input value={form.listing_sku} onChange={event => patch({ listing_sku: event.target.value.toUpperCase() })} className="font-mono uppercase" /></Field>
            {channel.key === 'webstore' && <><Field label="Storefront URL *"><Input value={form.web_slug} onChange={event => patch({ web_slug: event.target.value })} placeholder="/products/product-name" /></Field><Field label="Visibility"><SelectControl value={form.visibility} onChange={value => patch({ visibility: value })} options={[['public', 'Public'], ['scheduled', 'Scheduled'], ['hidden', 'Hidden']]} /></Field><Field label="SEO title" wide><Input value={form.title} onChange={event => patch({ title: event.target.value })} /></Field><Field label="SEO description" wide><Textarea rows={4} value={form.description} onChange={event => patch({ description: event.target.value })} placeholder="Leave empty to inherit Product Master content" /></Field></>}
            {channel.key === 'pos' && <><Field label="POS barcode *"><Input value={form.pos_barcode} onChange={event => patch({ pos_barcode: event.target.value })} /></Field><Field label="Sell at locations"><Input value={form.warehouse} onChange={event => patch({ warehouse: event.target.value })} placeholder="All retail locations" /></Field><Field label="Receipt name" wide><Input value={form.title} onChange={event => patch({ title: event.target.value })} /></Field></>}
            {channel.key === 'social' && <><Field label="Sales visibility *"><SelectControl value={form.visibility} onChange={value => patch({ visibility: value })} options={[["agents", "All sales agents"], ["teams", "Selected teams"], ["hidden", "Hidden"]]} /></Field><Field label="Suggested reply title"><Input value={form.title} onChange={event => patch({ title: event.target.value })} /></Field><Field label="Sales description" wide><Textarea rows={4} value={form.description} onChange={event => patch({ description: event.target.value })} placeholder="Describe how agents should present this product" /></Field></>}
            {isMarketplace && <><Field label="Channel title" wide><Input value={form.title} onChange={event => patch({ title: event.target.value })} /></Field><Field label="Channel description" wide><Textarea rows={4} value={form.description} onChange={event => patch({ description: event.target.value })} placeholder="Leave empty to inherit Product Master content" /></Field></>}
          </Section>}

          {tab === 'variants-media' && <div className="space-y-5">
            <Section title="Variants to publish" description="Choose the sellable child SKUs included in this parent-owned listing.">
              <div className="space-y-3 sm:col-span-2">{listingVariants.map(variant => { const checked = variants.includes(variant.id); return <label key={variant.id} className="flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border p-4 hover:bg-muted/20"><Checkbox checked={checked} onCheckedChange={next => setVariants(current => next ? [...new Set([...current, variant.id])] : current.filter(id => id !== variant.id))} /><span className="grid size-9 place-items-center rounded-lg border bg-muted"><Circle className="size-4" /></span><span className="min-w-0 flex-1"><strong className="block text-sm">{variant.label}</strong><span className="font-mono text-xs text-muted-foreground">{variant.sku}</span></span>{variant.state === 'pending' && <Badge variant="outline" className="border-amber-300 text-amber-700">New · Review</Badge>}<Badge variant="secondary">{checked ? 'Included' : 'Excluded'}</Badge></label>; })}</div>
              {!variants.length && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive sm:col-span-2">Include at least one variant before publishing.</p>}
            </Section>
            <Section title="Channel media" description="Choose whether this listing inherits Product Master media or uses a channel-specific selection.">
              <Field label="Media selection"><SelectControl value={form.media_scope} onChange={value => patch({ media_scope: value })} options={[['all', 'Use all Product Master images'], ['selected', 'Choose Product Master images'], ['custom', 'Use channel-only media']]} /></Field>
              {['tiktok', 'rakuten'].includes(channel.key) && <Field label={channel.key === 'tiktok' ? 'Product video' : 'R-Cabinet media'}><Input value={form.video_url} onChange={event => patch({ video_url: event.target.value })} placeholder="Select an asset or enter a URL" /></Field>}
            </Section>
          </div>}

          {tab === 'price-inventory' && <div className="space-y-5">
            <Section title="Pricing" description="Set how this store listing receives its sell price.">
              {channel.key !== 'amazon' && <Field label="Price source"><SelectControl value={form.listing_mode} onChange={value => patch({ listing_mode: value })} options={[['master', 'Use Product Master price'], ['markup', 'Product Master price + markup'], ['manual', 'Manual channel price']]} /></Field>}
              <Field label={channel.key === 'pos' ? 'POS price' : 'Channel price / markup'}><Input type="number" min="0" value={form.price_markup} onChange={event => patch({ price_markup: event.target.value })} placeholder="Use Product Master price" /></Field>
            </Section>
            <Section title="Inventory & fulfillment" description="Product Master ATP remains the source; configure what Prime OS sends to this store.">
              <Field label="Inventory source"><SelectControl value={form.warehouse} onChange={value => patch({ warehouse: value })} options={[['all', 'All mapped warehouses'], ['primary', 'Primary fulfillment warehouse'], ['channel', `${channel.label} dedicated stock`]]} /></Field>
              <Field label="Stock sync policy"><SelectControl value={form.sync_policy} onChange={value => patch({ sync_policy: value })} options={[['automatic', 'Automatic sync'], ['manual', 'Manual update'], ['disabled', 'Do not publish stock']]} /></Field>
              <Field label="Safety buffer"><Input type="number" min="0" value={form.safety_buffer} onChange={event => patch({ safety_buffer: event.target.value })} /></Field>
              <Field label="Channel allocation cap"><Input type="number" min="0" value={form.allocation_cap} onChange={event => patch({ allocation_cap: event.target.value })} /></Field>
              {['shopee', 'lazada', 'tiktok', 'rakuten'].includes(channel.key) ? <Field label="Initial channel stock *" helper="Required for the first publish. Later updates follow the selected stock sync policy."><Input type="number" min="0" value={form.stock_quantity} onChange={event => patch({ stock_quantity: event.target.value })} placeholder="Enter initial stock" /></Field> : <Field label="Quantity to send" helper="Preview after applying the safety buffer and allocation cap."><Input readOnly value={form.stock_quantity || 'Calculated from Product Master ATP'} className="bg-muted/40" /></Field>}
              {channel.key === 'amazon' && <Field label="Fulfillment *"><SelectControl value={form.fulfillment} onChange={value => patch({ fulfillment: value })} options={[['FBA', 'FBA — Amazon fulfilled'], ['FBM', 'FBM — Merchant fulfilled']]} /></Field>}
            </Section>
          </div>}

          {tab === 'requirements' && <div className="space-y-5">
            {!isMarketplace && <div className="rounded-xl border border-dashed p-6 text-center"><p className="font-semibold">No additional marketplace requirements</p><p className="mt-1 text-sm text-muted-foreground">This channel is ready once its listing, variant, media, price and inventory setup is complete.</p></div>}
            {isMarketplace && <Section title={`${channel.label} requirements`} description="These fields are channel-owned and change with the selected provider category.">
              {channel.key === 'amazon' && <><Field label="Amazon listing mode"><SelectControl value={form.listing_mode} onChange={value => patch({ listing_mode: value })} options={[['offer_only', 'Offer on existing ASIN'], ['new_listing', 'Create a new Amazon listing']]} /></Field><Field label="ASIN / catalog match *"><Input value={form.identifier} onChange={event => patch({ identifier: event.target.value.toUpperCase() })} placeholder="ASIN, EAN, UPC, GTIN, JAN or ISBN" /></Field><Field label="Condition *"><SelectControl value={form.condition} onChange={value => patch({ condition: value })} options={[['new_new', 'New'], ['used_like_new', 'Used — Like new'], ['used_very_good', 'Used — Very good']]} /></Field><Field label="Search terms"><Input value={form.search_terms} onChange={event => patch({ search_terms: event.target.value })} /></Field><Field label="Bullet points" wide><Textarea rows={4} value={form.bullet_points} onChange={event => patch({ bullet_points: event.target.value })} placeholder="One benefit per line" /></Field></>}
              {channel.key !== 'amazon' && <Field label={`${channel.label} category *`} helper="Determines the required provider attributes."><Input value={form.category} onChange={event => patch({ category: event.target.value })} placeholder={`Search ${channel.label} category`} /></Field>}
              {['shopee', 'lazada'].includes(channel.key) && <Field label="Shipping option *"><SelectControl value={form.shipping_option} onChange={value => patch({ shipping_option: value })} options={channel.key === 'shopee' ? [['shopee_xpress', 'Shopee Xpress'], ['seller', 'Seller shipping'], ['pickup', 'Store pickup']] : [['fbl', 'Fulfilled by Lazada'], ['seller', 'Seller fulfilled']]} /></Field>}
              {channel.key === 'shopee' && <Field label="Pre-order days"><Input type="number" min="0" value={form.preorder_days} onChange={event => patch({ preorder_days: event.target.value })} /></Field>}
              {channel.key === 'lazada' && <><Field label="Brand"><Input value={form.brand} onChange={event => patch({ brand: event.target.value })} /></Field><Field label="Warranty"><Input value={form.warranty} onChange={event => patch({ warranty: event.target.value })} /></Field></>}
              {channel.key === 'tiktok' && <Field label="Certification"><Input value={form.certification} onChange={event => patch({ certification: event.target.value })} /></Field>}
              {channel.key === 'rakuten' && <Field label="Catalog ID *"><Input value={form.identifier} onChange={event => patch({ identifier: event.target.value })} placeholder="JAN, GTIN or Rakuten catalog ID" /></Field>}
              <Field label="Material"><Input value={form.attribute_material} onChange={event => patch({ attribute_material: event.target.value })} placeholder="Loaded from selected category" /></Field>
              <Field label="Color / pattern"><Input value={form.attribute_color} onChange={event => patch({ attribute_color: event.target.value })} placeholder="Loaded from selected category" /></Field>
              <Field label="Tax code"><Input value={form.tax_code} onChange={event => patch({ tax_code: event.target.value })} /></Field>
              <Field label="Compliance notes" wide><Textarea rows={3} value={form.compliance_notes} onChange={event => patch({ compliance_notes: event.target.value })} placeholder="Warnings, certifications or provider requirements" /></Field>
            </Section>}
          </div>}

          {tab === 'readiness' && <div className="space-y-4">
            <div className={`rounded-xl border p-5 ${blockers.length ? 'border-amber-500/35 bg-amber-500/10' : 'border-emerald-500/35 bg-emerald-500/10'}`}><div className={`flex items-center gap-2 font-semibold ${blockers.length ? 'text-amber-300' : 'text-emerald-300'}`}>{blockers.length ? <AlertTriangle className="size-5" /> : <CheckCircle2 className="size-5" />}{blockers.length ? `${blockers.length} item${blockers.length === 1 ? '' : 's'} need attention` : 'Listing setup is complete'}</div>{blockers.length ? <ul className="mt-3 space-y-2 text-sm text-foreground/80">{blockers.map(item => <li key={item}>• {item}</li>)}</ul> : <p className="mt-2 text-sm text-foreground/75">Required listing, variant, inventory and channel data is complete.</p>}</div>
            {providerFailed ? <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-5"><div className="flex items-center gap-2 font-semibold text-amber-300"><AlertTriangle className="size-5" />Provider validation needs attention</div><p className="mt-2 text-sm text-foreground/75">The latest validation timed out. Your listing changes are saved and can be retried safely.</p><Button type="button" variant="outline" className="mt-4" onClick={() => setProviderFailed(false)}><RefreshCw className="size-4" />Retry validation</Button></div> : <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 p-5"><div className="flex items-center gap-2 font-semibold text-emerald-300"><CheckCircle2 className="size-5" />Provider validation passed</div><p className="mt-2 text-sm text-foreground/75">The listing is ready to publish.</p></div>}
          </div>}
        </div>
      </div>

      <SheetFooter className="flex-row items-center justify-between border-t px-6 py-4 sm:justify-between">
        <Button type="button" variant="outline" onClick={requestClose}>Close</Button>
        <div className="flex items-center gap-2"><span className="hidden text-xs text-muted-foreground sm:inline" aria-live="polite">{hasUnsavedChanges ? 'Unsaved changes' : savedAt ? 'Saved just now' : 'No unsaved changes'}</span><Button type="button" variant="outline" disabled={!hasUnsavedChanges} onClick={save}><Save className="size-4" />Save draft</Button><Button type="button" disabled={publishing || blockers.length > 0} onClick={publish}>{publishing ? <RefreshCw className="size-4 animate-spin" /> : <Send className="size-4" />}{publishing ? 'Publishing…' : 'Publish update'}</Button></div>
      </SheetFooter>
    </SheetContent>
  </Sheet>;
}

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <section className="rounded-xl border"><header className="border-b bg-muted/20 px-5 py-4"><h3 className="text-sm font-semibold">{title}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p></header><div className="grid gap-4 p-5 sm:grid-cols-2">{children}</div></section>;
}

function Field({ label, helper, children, wide = false }: { label: string; helper?: string; children: ReactNode; wide?: boolean }) {
  return <div className={`space-y-2 ${wide ? 'sm:col-span-2' : ''}`}><Label>{label}</Label>{children}{helper ? <p className="text-xs leading-5 text-muted-foreground">{helper}</p> : null}</div>;
}

function SelectControl({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: string[][] }) {
  return <select value={value} onChange={event => onChange(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><option value="">Select an option</option>{options.map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{label}</option>)}</select>;
}
