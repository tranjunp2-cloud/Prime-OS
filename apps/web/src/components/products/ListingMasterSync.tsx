import { useConnectedShops } from '@/hooks/use-connected-shops';
import { useState } from 'react';
import { CircleCheck, Info, SlidersHorizontal, CirclePause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { resolveListingShopData } from '@/lib/listing-shop-data';
import { getCatalogImportItems } from '@/lib/catalog-import-store';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { MASTER_SYNC_FIELDS, MASTER_SYNC_GROUPS, MASTER_SYNC_VALUE_KEYS, initialMasterSyncPreference, masterSyncPlan, refreshShopDefaultReview, syncsField, type MasterSyncField, type MasterSyncPreference } from '@/lib/listing-master-sync';
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
  useConnectedShops();
  const [draft, setDraft] = useState(() => initialMasterSyncPreference(master, listing, { ...preference, fields: preference.fields.length ? preference.fields : ['content', 'media'] }));
  const [reviewed, setReviewed] = useState<string>();
  const [activeGroup, setActiveGroup] = useState<MasterSyncField | 'mapping'>('content');
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const plan = masterSyncPlan(master, listing, draft);
  const resuming = draft.enabled ? draft.fields.filter(field => !syncsField(preference, field) && MASTER_SYNC_VALUE_KEYS[field].some(key => listing.local_draft?.values[key] !== undefined)) : [];
  const listingDescription = listing.local_draft?.values.description ?? currentDescription ?? resolveListingShopData(master, listing, getCatalogImportItems({ requireConfirmation: true })).description;
  const descriptions: Record<MasterSyncField, string> = {
    content: 'Product name, description and brand', media: 'Product Master images',
    price: 'Master base price → shop pricing rule', inventory: 'Mapped SKUs → warehouse stock, buffer and cap',
    shipping: 'Package size, weight, origin and HS code',
  };
  const change = (patch: Partial<MasterSyncPreference>) => { setDraft(current => ({ ...current, ...patch })); setReviewed(undefined); setError(undefined); };
  async function save() {
    if (plan.error || saving) return;
    if (!reviewed || reviewed !== plan.signature) { setError('Values changed. Review the updated settings before saving.'); setReviewed(undefined); return; }
    setSaving(true);
    try {
      if (syncsField(draft, 'inventory') && draft.inventory?.source === 'shop_default') await refreshShopDefaultReview(master, listing, draft, reviewed);
      onSave(draft, reviewed);
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not save. Please try again.'); setSaving(false); }
  }
  return <Dialog open onOpenChange={open => { if (!open && !saving) onClose(); }}>
    <DialogContent className="flex h-[min(760px,92dvh)] max-h-[92dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[1120px] motion-reduce:animate-none" onCloseAutoFocus={event => { event.preventDefault(); restoreFocus(); }}>
      <DialogHeader className="shrink-0 border-b p-4 pr-12 text-left"><div className="flex flex-wrap items-center justify-between gap-3"><div><DialogTitle>Master sync settings</DialogTitle><DialogDescription className="mt-1 break-words">{shop} · SKU: {sku}</DialogDescription></div><label className="flex items-center gap-3 text-xs" htmlFor="master-sync-enabled">Sync from Master<Switch id="master-sync-enabled" disabled={Boolean(reviewed) || saving} checked={draft.enabled} onCheckedChange={enabled => change({ enabled })} /></label></div></DialogHeader>
      <div className={cn('min-h-0 flex-1', !reviewed && 'flex flex-col md:grid md:grid-cols-[200px_minmax(0,1fr)]')}>
        {!reviewed && <>
          <nav aria-label="Sync data groups" className="hidden min-h-0 flex-col gap-1 overflow-y-auto border-r bg-muted/20 p-3 md:flex">
            {plan.groups.map(group => <div key={group.field} className={cn('flex items-center gap-2 rounded-md px-2', activeGroup === group.field && 'bg-primary/10')}><Checkbox aria-label={MASTER_SYNC_FIELDS[group.field]} disabled={!draft.enabled} checked={draft.fields.includes(group.field)} onCheckedChange={checked => change({ fields: MASTER_SYNC_GROUPS.filter(key => key === group.field ? Boolean(checked) : draft.fields.includes(key)) })} /><button type="button" aria-current={activeGroup === group.field ? 'page' : undefined} aria-label={`View ${MASTER_SYNC_FIELDS[group.field]}`} className="flex min-h-11 min-w-0 flex-1 items-center justify-between gap-2 py-2 text-left text-sm" onClick={() => setActiveGroup(group.field)}><span>{MASTER_SYNC_FIELDS[group.field]}</span>{syncsField(draft, group.field) && group.error && <span className="text-destructive" aria-label="Needs attention">!</span>}</button></div>)}
            <button type="button" className="mt-auto min-h-11 rounded-md border-t px-2 text-left text-sm" aria-current={activeGroup === 'mapping' ? 'page' : undefined} onClick={() => setActiveGroup('mapping')}>SKU mapping</button>
          </nav>
          <div className="shrink-0 space-y-2 border-b p-3 md:hidden"><label className="sr-only" htmlFor="sync-group-picker">Data group</label><select id="sync-group-picker" className="min-h-11 w-full rounded-md border bg-background px-3 text-sm" value={activeGroup} onChange={event => setActiveGroup(event.target.value as MasterSyncField | 'mapping')}>{plan.groups.map(group => <option key={group.field} value={group.field}>{MASTER_SYNC_FIELDS[group.field]}{syncsField(draft, group.field) ? group.error ? ' · Needs attention' : ' · Sync on' : ' · Keep shop data'}</option>)}<option value="mapping">SKU mapping</option></select>{activeGroup !== 'mapping' && <label className="flex min-h-9 items-center gap-2 text-sm"><Checkbox aria-label="Sync current group" disabled={!draft.enabled} checked={draft.fields.includes(activeGroup)} onCheckedChange={checked => change({ fields: MASTER_SYNC_GROUPS.filter(key => key === activeGroup ? Boolean(checked) : draft.fields.includes(key)) })} />Sync this group</label>}</div>
        </>}
        <div key={reviewed ? 'review' : activeGroup} className="h-full min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto p-4" data-testid="sync-group-content">
        {reviewed ? <section aria-label="Review sync settings" className="space-y-4">
          <h3 className="text-base font-semibold">Review {draft.enabled ? 'selected data groups' : 'turning sync off'}</h3>
          <p className="text-sm text-muted-foreground">{draft.enabled ? 'Only selected groups will follow this Master. Other shop data stays independent.' : 'All five groups stop following this Master. Existing shop values and the listing link stay unchanged.'}</p>
          {resuming.length > 0 && <p role="note" className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm leading-6">Resume Master control for {resuming.map(field => MASTER_SYNC_FIELDS[field]).join(', ')}? When sync runs, Master values replace the independent values in these groups. Review both sides before saving. This prototype saves the preference only.</p>}
          <div className="divide-y rounded-xl border px-4">{plan.groups.map(group => <div className="grid gap-2 py-4 sm:grid-cols-[180px_minmax(0,1fr)]" key={group.field}>
            <p className="text-sm font-semibold">{MASTER_SYNC_FIELDS[group.field]}</p>
            <div className="text-sm leading-6">{draft.enabled && draft.fields.includes(group.field) ? <div className="grid gap-4 sm:grid-cols-2"><div><p className="mb-1 text-xs text-muted-foreground">Current listing values</p>{group.current.map((value, index) => <p key={index} className="break-words">{value}</p>)}{group.field === 'content' && <p className="mt-2 whitespace-pre-wrap break-words text-xs text-muted-foreground">{richTextPlainText(listingDescription || '') || 'Description not recorded'}</p>}<SyncImagePreview images={group.currentImages} label="Current listing image" /></div><div><p className="mb-1 text-xs text-muted-foreground">From saved Master</p>{group.proposed.map((value, index) => <p key={index} className="break-words">{value}</p>)}{group.field === 'content' && <p className="mt-2 whitespace-pre-wrap break-words text-xs text-muted-foreground">{richTextPlainText(master.description) || 'Description not recorded'}</p>}<SyncImagePreview images={group.proposedImages} label="Master image" /></div></div> : <span className="text-muted-foreground">Keep shop data</span>}</div>
          </div>)}</div>
        </section> : <>
          {activeGroup === 'mapping' && <section aria-label="SKU mapping" className="space-y-3 text-sm"><h3 className="font-semibold">SKU mapping · {listing.variant_mappings?.length ? `${listing.variant_mappings.length} recorded pairs` : master.has_variants || master.product_type === 'variant' ? 'No variant mappings recorded' : 'Single product'}</h3>
            {listing.variant_mappings?.length ? <div className="space-y-2 pb-2">{listing.variant_mappings.map((mapping, index) => <div key={index} className="grid gap-2 border-t pt-2 sm:grid-cols-2"><span>Master SKU: {master.skus.find(item => item.id === mapping.master_sku_id)?.sku_code || mapping.master_sku_id}</span><span>Listing SKU: {mapping.shop_sku || 'Not recorded'}</span></div>)}</div> : <p className="pb-2 text-xs text-muted-foreground">Master: {master.sku_code} · Listing: {listing.shop_sku || sku || 'Not recorded'}</p>}
            <p className="pb-2 text-xs text-muted-foreground">Read-only mapping context. Selecting a sync group does not create or change SKU mappings.</p>
          </section>}
          {draft.enabled && [...new Set(plan.groups.filter(group => draft.fields.includes(group.field) && group.field === activeGroup).map(group => group.error).filter(Boolean))].map(message => <div key={message} role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm"><p className="font-medium text-destructive">{message}</p><p className="mt-1 text-xs text-muted-foreground">Affected: {plan.groups.filter(group => draft.fields.includes(group.field) && group.error === message).map(group => MASTER_SYNC_FIELDS[group.field]).join(', ')}</p></div>)}
          {plan.error && !plan.groups.some(group => syncsField(draft, group.field) && group.error === plan.error) && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{plan.error}</p>}
          <div>
            {plan.groups.filter(group => group.field === activeGroup).map(group => {
              const selected = syncsField(draft, group.field);
              const rows = group.field === 'content' ? [
                { label: 'Product name', current: group.current[0], proposed: group.proposed[0] },
                { label: 'Brand', current: group.current[1], proposed: group.proposed[1] },
                { label: 'Description', current: richTextPlainText(listingDescription || '') || 'Not recorded', proposed: richTextPlainText(master.description) || 'Not recorded' },
              ] : [{ label: MASTER_SYNC_FIELDS[group.field], current: group.current.join(' · ') || 'Not recorded', proposed: group.proposed.join(' · ') || 'Not available' }];
              return <section key={group.field} aria-label={MASTER_SYNC_FIELDS[group.field]} className="p-3 sm:p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="text-base font-semibold">{MASTER_SYNC_FIELDS[group.field]}</h3><span className={cn('text-xs', selected && group.error ? 'text-destructive' : 'text-muted-foreground')}>{!selected ? 'Keep shop data' : group.error ? 'Needs attention' : 'Selected for sync'}</span></div>
                <p className="mb-3 text-xs text-muted-foreground">{descriptions[group.field]}</p>
                {selected && <div className="mb-3"><ListingSyncConfiguration field={group.field} master={master} listing={listing} draft={draft} onChange={change} /></div>}
                <div className="hidden grid-cols-[120px_minmax(0,1fr)_minmax(0,1fr)_140px] gap-3 border-b pb-2 text-xs text-muted-foreground md:grid"><span>Data</span><span>Current listing values</span><span>From saved Master / Rule output</span><span>When applied</span></div>
                {rows.map(row => <div key={row.label} className="grid gap-3 border-b py-3 last:border-b-0 md:grid-cols-[120px_minmax(0,1fr)_minmax(0,1fr)_140px]">
                  <span className="text-xs font-medium">{row.label}</span>
                  <div className="min-w-0"><p className="mb-1 text-xs text-muted-foreground md:hidden">Current listing values</p><PreviewValue value={row.current} /><SyncImagePreview images={row.label === 'Images' ? group.currentImages : undefined} label="Current listing image" /></div>
                  <div className="min-w-0"><p className="mb-1 text-xs text-muted-foreground md:hidden">From saved Master / Rule output</p><PreviewValue value={row.proposed} /><SyncImagePreview images={row.label === 'Images' ? group.proposedImages : undefined} label="Master image" /></div>
                  <p className="text-xs text-muted-foreground">{!selected ? 'Keep shop data' : group.error ? '—' : row.current === 'Not recorded' || row.proposed === 'Not recorded' ? 'Cannot compare · data not recorded' : group.field === 'content' ? row.current === row.proposed ? 'No change' : 'Replace with Master' : 'Use calculated / Master values'}</p>
                </div>)}
              </section>;
            })}
          </div>
          <p className="text-xs text-muted-foreground">“Not recorded” means unavailable for comparison, not an empty shop value. Values shown may include locally saved listing drafts.</p>
        </>}
        <p className="text-xs leading-5 text-muted-foreground">Listing IDs, SKU mappings, variants and publication stay unchanged. Channel-specific attributes require their own mapping.</p>
        <div className="flex gap-2 rounded-lg bg-muted/50 p-3 text-xs leading-5 text-muted-foreground"><Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><p>Local demo: saves settings only. No background sync or shop update is sent.</p></div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {draft.enabled && !draft.fields.length && <p role="alert" className="text-sm text-destructive">Choose at least one data group to sync.</p>}
        </div>
      </div>
      <DialogFooter className="shrink-0 flex-wrap items-center gap-2 border-t p-4"><p className="mr-auto text-xs text-muted-foreground">{draft.enabled ? draft.fields.length : 0} groups selected · {draft.enabled ? plan.groups.filter(group => draft.fields.includes(group.field) && group.error).length : 0} groups need attention</p><Button type="button" className="min-h-11" variant="outline" disabled={saving} onClick={reviewed ? () => setReviewed(undefined) : onClose}>{reviewed ? 'Back to settings' : 'Cancel'}</Button><Button type="button" className="min-h-11" disabled={Boolean(plan.error) || saving} onClick={reviewed ? save : () => { setError(undefined); setReviewed(plan.signature); }}>{saving ? 'Saving…' : reviewed ? 'Save sync settings' : 'Review settings'}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}

function SyncImagePreview({ images, label }: { images?: string[]; label: string }) {
  return images?.length ? <div className="mt-2 flex flex-wrap gap-2">{images.map((src, index) => <img key={`${index}:${src}`} src={src} alt={`${label} ${index + 1}`} className="size-16 rounded border bg-white object-contain" />)}</div> : null;
}

function PreviewValue({ value }: { value: string }) {
  const [expanded, setExpanded] = useState(false);
  const long = value.length > 160 || value.split('\n').length > 3;
  return <div className="text-sm"><p className={cn('whitespace-pre-wrap break-words', long && !expanded && 'line-clamp-3')}>{value}</p>{long && <button type="button" className="mt-1 min-h-8 text-xs text-primary underline" aria-expanded={expanded} onClick={() => setExpanded(open => !open)}>{expanded ? 'Show less' : 'View full text'}</button>}</div>;
}
