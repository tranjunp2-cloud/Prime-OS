import { useState } from 'react';
import { ArrowRight, CircleCheck, Info, SlidersHorizontal, CirclePause, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { MASTER_SYNC_FIELDS, MASTER_SYNC_GROUPS, MASTER_SYNC_VALUE_KEYS, initialMasterSyncPreference, masterSyncPlan, syncsField, type MasterSyncField, type MasterSyncPreference } from '@/lib/listing-master-sync';
import type { Product, ChannelListing } from '@/lib/product-store';
import { richTextPlainText } from '@/lib/product-master-readiness';
import { ListingSyncConfiguration } from './ListingSyncConfiguration';
import { usePricingRevision } from '@/hooks/use-pricing';

export function ListingMasterSyncControl({ preference, shop, onOpen, disabled, disabledReason }: {
  preference: MasterSyncPreference; shop: string; onOpen: () => void; disabled?: boolean; disabledReason?: string;
}) {
  const Icon = preference.enabled ? CircleCheck : CirclePause;
  return <div>
    <button type="button" disabled={disabled} onClick={onOpen} aria-label={`Master sync settings for ${shop}: ${preference.enabled ? 'on' : 'off'}`}
      className={cn('inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60',
        preference.enabled ? 'border-emerald-600/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300' : 'border-border bg-background/50 text-foreground hover:bg-muted')}>
      <Icon aria-hidden="true" className="size-4" />{preference.enabled ? 'Sync on' : 'Sync off'}<SlidersHorizontal aria-hidden="true" className="ml-1 size-3.5 opacity-60" />
    </button>
    {(disabledReason || disabled) && <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{disabledReason || 'View-only access'}</p>}
  </div>;
}

export function ListingMasterSyncDialog({ shop, sku, preference, master, listing, currentDescription, onClose, onSave, restoreFocus }: {
  shop: string; sku: string; preference: MasterSyncPreference; master: Product; listing: ChannelListing;
  currentContent?: string; currentImages?: number; currentBrand?: string; currentDescription?: string;
  onClose: () => void; onSave: (preference: MasterSyncPreference, reviewedPlan: string) => void; restoreFocus: () => void;
}) {
  usePricingRevision();
  const [draft, setDraft] = useState(() => initialMasterSyncPreference(master, listing, { ...preference, fields: preference.fields.length ? preference.fields : ['content', 'media'] }));
  const [reviewed, setReviewed] = useState<string>();
  const [expanded, setExpanded] = useState<MasterSyncField>();
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const plan = masterSyncPlan(master, listing, draft);
  const resuming = draft.enabled ? draft.fields.filter(field => !syncsField(preference, field) && MASTER_SYNC_VALUE_KEYS[field].some(key => listing.local_draft?.values[key] !== undefined)) : [];
  const listingDescription = listing.local_draft?.values.description ?? currentDescription;
  const descriptions: Record<MasterSyncField, string> = {
    content: 'Product name, description and brand', media: 'Product Master images',
    price: 'Master base price → shop pricing rule', inventory: 'Mapped SKUs → warehouse stock, buffer and cap',
    shipping: 'Package size, weight, origin and HS code',
  };
  const change = (patch: Partial<MasterSyncPreference>) => { setDraft(current => ({ ...current, ...patch })); setReviewed(undefined); setError(undefined); };
  function save() {
    if (plan.error || saving) return;
    if (!reviewed || reviewed !== plan.signature) { setError('Values changed. Review the updated settings before saving.'); setReviewed(undefined); return; }
    setSaving(true);
    try { onSave(draft, reviewed); } catch (error) { setError(error instanceof Error ? error.message : 'Could not save. Please try again.'); setSaving(false); }
  }
  return <Dialog open onOpenChange={open => { if (!open && !saving) onClose(); }}>
    <DialogContent className="flex max-h-[92dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[760px] motion-reduce:animate-none" onCloseAutoFocus={event => { event.preventDefault(); restoreFocus(); }}>
      <DialogHeader className="shrink-0 border-b p-5 pr-12 text-left"><DialogTitle>Master sync settings</DialogTitle><DialogDescription className="break-words">{shop} · SKU: {sku}</DialogDescription></DialogHeader>
      <div className="min-h-0 space-y-5 overflow-y-auto p-5">
        {reviewed ? <section aria-label="Review sync settings" className="space-y-4">
          <h3 className="text-base font-semibold">Review {draft.enabled ? 'selected data groups' : 'turning sync off'}</h3>
          <p className="text-sm text-muted-foreground">{draft.enabled ? 'Only selected groups will follow this Master. Other shop data stays independent.' : 'All five groups stop following this Master. Existing shop values and the listing link stay unchanged.'}</p>
          {resuming.length > 0 && <p role="note" className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm leading-6">Resume Master control for {resuming.map(field => MASTER_SYNC_FIELDS[field]).join(', ')}? When sync runs, Master values replace the independent values in these groups. Review both sides before saving. This prototype saves the preference only.</p>}
          <div className="divide-y rounded-xl border px-4">{plan.groups.map(group => <div className="grid gap-2 py-4 sm:grid-cols-[180px_minmax(0,1fr)]" key={group.field}>
            <p className="text-sm font-semibold">{MASTER_SYNC_FIELDS[group.field]}</p>
            <div className="text-sm leading-6">{draft.enabled && draft.fields.includes(group.field) ? <div className="grid gap-4 sm:grid-cols-2"><div><p className="mb-1 text-xs text-muted-foreground">Current listing values</p>{group.current.map((value, index) => <p key={index} className="break-words">{value}</p>)}{group.field === 'content' && <p className="mt-2 whitespace-pre-wrap break-words text-xs text-muted-foreground">{richTextPlainText(listingDescription || '') || 'Description not recorded'}</p>}<SyncImagePreview images={group.currentImages} label="Current listing image" /></div><div><p className="mb-1 text-xs text-muted-foreground">From saved Master</p>{group.proposed.map((value, index) => <p key={index} className="break-words">{value}</p>)}{group.field === 'content' && <p className="mt-2 whitespace-pre-wrap break-words text-xs text-muted-foreground">{richTextPlainText(master.description) || 'Description not recorded'}</p>}<SyncImagePreview images={group.proposedImages} label="Master image" /></div></div> : <span className="text-muted-foreground">Keep shop data</span>}</div>
          </div>)}</div>
        </section> : <>
          <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Master sync mode">
            {[false, true].map(on => <label key={String(on)} className={cn('flex min-h-20 cursor-pointer items-start gap-3 rounded-xl border p-4', draft.enabled === on ? 'border-primary bg-primary/5' : 'hover:bg-muted/30')}>
              <input className="mt-1 size-4 accent-primary" type="radio" name="master-sync-mode" checked={draft.enabled === on} onChange={() => change({ enabled: on })} />
              <span><span className="block text-sm font-semibold">{on ? 'Sync on' : 'Sync off'}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{on ? 'Use selected Master data.' : 'Keep all shop data independent.'}</span></span>
            </label>)}
          </div>
          {draft.enabled ? <div>
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold">Product Master <ArrowRight className="size-4" aria-hidden="true" /> This listing</p>
            <div className="divide-y rounded-xl border px-4">{plan.groups.map(group => {
              const field = group.field;
              const selected = draft.fields.includes(field);
              return <section key={field} className="py-3" aria-label={MASTER_SYNC_FIELDS[field]}>
                <div className="flex items-center gap-2"><label className="flex min-h-11 flex-1 cursor-pointer items-center gap-3"><Checkbox aria-label={MASTER_SYNC_FIELDS[field]} checked={selected} onCheckedChange={checked => { change({ fields: MASTER_SYNC_GROUPS.filter(key => key === field ? Boolean(checked) : draft.fields.includes(key)) }); setExpanded(checked ? field : undefined); }} /><span><span className="block text-sm font-semibold">{MASTER_SYNC_FIELDS[field]}</span><span className="mt-0.5 block text-xs text-muted-foreground">{descriptions[field]}</span></span></label>{selected && <Button type="button" variant="ghost" size="sm" className="min-h-11 shrink-0" aria-label={`Configure ${MASTER_SYNC_FIELDS[field]}`} aria-expanded={expanded === field} onClick={() => setExpanded(expanded === field ? undefined : field)}>Details<ChevronDown className={cn('size-4', expanded === field && 'rotate-180')} /></Button>}</div>
                {selected && expanded === field && <div className="space-y-3 pb-2 pt-3 sm:pl-7">
                  <ListingSyncConfiguration field={field} master={master} listing={listing} draft={draft} onChange={change} />
                  <div className="grid gap-3 rounded-lg bg-muted/30 p-3 sm:grid-cols-2 text-sm leading-6">
                    <div><p className="text-xs text-muted-foreground">Current listing values</p>{group.current.map((value, index) => <p key={index} className="break-words">{value}</p>)}{field === 'content' && <details><summary className="min-h-9 cursor-pointer text-xs text-muted-foreground">Description</summary><p className="whitespace-pre-wrap break-words">{richTextPlainText(listingDescription || '') || 'Not recorded'}</p></details>}</div>
                    <div><p className="text-xs text-muted-foreground">From saved Master</p>{group.proposed.map((value, index) => <p key={index} className="break-words">{value}</p>)}{field === 'content' && <details><summary className="min-h-9 cursor-pointer text-xs text-muted-foreground">Description</summary><p className="whitespace-pre-wrap break-words">{richTextPlainText(master.description) || 'Not recorded'}</p></details>}</div>
                  </div>
                </div>}
                {selected && group.error && <p role="alert" className="mt-2 text-sm text-destructive">{group.error}</p>}
              </section>;
            })}</div>
          </div> : <p className="text-sm leading-6 text-muted-foreground">No Master-driven content, images, price, stock or shipping updates. The listing stays linked and its shop data is kept.</p>}
        </>}
        <p className="text-xs leading-5 text-muted-foreground">Listing IDs, SKU mappings, variants and publication stay unchanged. Channel-specific attributes require their own mapping.</p>
        <div className="flex gap-2 rounded-lg bg-muted/50 p-3 text-xs leading-5 text-muted-foreground"><Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><p>Local demo: saves settings only. No background sync or shop update is sent.</p></div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {draft.enabled && !draft.fields.length && <p role="alert" className="text-sm text-destructive">Choose at least one data group to sync.</p>}
      </div>
      <DialogFooter className="shrink-0 border-t p-4"><Button type="button" className="min-h-11" variant="outline" disabled={saving} onClick={reviewed ? () => setReviewed(undefined) : onClose}>{reviewed ? 'Back to settings' : 'Cancel'}</Button><Button type="button" className="min-h-11" disabled={Boolean(plan.error) || saving} onClick={reviewed ? save : () => { setError(undefined); setReviewed(plan.signature); }}>{saving ? 'Saving…' : reviewed ? 'Save sync settings' : 'Review settings'}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}

function SyncImagePreview({ images, label }: { images?: string[]; label: string }) {
  return images?.length ? <div className="mt-2 flex flex-wrap gap-2">{images.map((src, index) => <img key={`${index}:${src}`} src={src} alt={`${label} ${index + 1}`} className="size-16 rounded border bg-white object-contain" />)}</div> : null;
}
