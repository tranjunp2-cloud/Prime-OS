import { useId, useState } from 'react';
import { CheckCircle2, ChevronDown, CircleHelp, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChannelLogo } from '@/components/channels/ChannelLogo';
import type { Product, ListingDraftValues } from '@/lib/product-store';
import type { CatalogImportItem } from '@/lib/catalog-import-store';
import type { VariantMappings } from '@/lib/listing-master-completion';
import { resolveSourceSkuMappings } from '@/lib/listing-sku-mapping';
import { listingSyncReadiness, previewListing } from '@/lib/listing-sync-readiness';
import { patchRequirement, requirementValue } from '@/lib/listing-requirements';
import { ListingReviewHelp } from './ListingReviewHelp';

/** Channel blockers are visible, but never included in the Master activation checklist. */
export function ListingChannelReadiness({ product, sources, mappings, drafts = {}, onChange, disabled = false, activateMaster = false }: {
  product: Product; sources: CatalogImportItem[]; mappings: VariantMappings;
  drafts?: Record<string, ListingDraftValues>; onChange?: (drafts: Record<string, ListingDraftValues>) => void; disabled?: boolean;
  activateMaster?: boolean;
}) {
  const prefix = useId();
  const [open, setOpen] = useState<string>();
  return <section aria-label="Listing sync readiness" className="overflow-hidden rounded-lg border md:col-span-2">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/20 px-4 py-3">
      <div className="flex items-center gap-1"><h3 className="text-sm font-semibold">Listing sync readiness</h3><ListingReviewHelp label="Listing sync readiness">Required fields come from each listing’s channel and category, not the Master category. Ready data does not turn on sync: sync groups, pricing and stock settings still need a separate review. Unknown requirements are not treated as complete.</ListingReviewHelp></div>
      <span className="text-xs text-muted-foreground">Does not block Master activation</span>
    </div>
    <ul className="divide-y">{sources.map(source => {
      const link = previewListing(source, product, resolveSourceSkuMappings(source, product, mappings[source.id]), drafts[source.id]);
      const status = listingSyncReadiness(activateMaster ? { ...product, status: 'published' } : product, link);
      const fields = status.requirements.missing;
      const Icon = status.ready ? CheckCircle2 : status.requirements.state === 'unchecked' ? CircleHelp : TriangleAlert;
      const editable = fields.filter(field => field.kind !== 'images' && !link.master_data_sync?.enabled);
      return <li key={source.id} className="px-4 py-3">
        <div className="flex flex-wrap items-start gap-3"><ChannelLogo channel={{ key: source.channel }} /><div className="min-w-0 flex-1"><p className="text-sm font-medium">{source.storeName}<span className="ml-2 text-xs font-normal capitalize text-muted-foreground">{source.channel}</span></p><p className="mt-1 break-all font-mono text-xs text-muted-foreground">{source.channelSku}</p></div><div className="flex items-center gap-2"><span className={`flex items-center gap-1.5 text-xs ${status.ready ? 'text-emerald-700 dark:text-emerald-300' : fields.length || status.mappingPending ? 'text-amber-700 dark:text-amber-300' : 'text-muted-foreground'}`}><Icon className="size-3.5 shrink-0" />{status.ready ? 'Data ready after confirmation' : status.label}</span>{onChange && (editable.length > 0 || open === source.id) && <Button variant="ghost" className="h-11 px-2 text-xs" disabled={disabled} aria-expanded={open === source.id} onClick={() => setOpen(open === source.id ? undefined : source.id)}>Complete<ChevronDown className="size-3.5" /></Button>}</div></div>
        {fields.length > 0 && <p className="mt-2 text-xs leading-5 text-amber-700 dark:text-amber-300">{status.requirements.message}. Only this listing’s sync is blocked.</p>}
        {status.requirements.state === 'unchecked' && <p className="mt-2 text-xs leading-5 text-muted-foreground">Requirements must be checked for this shop category before enabling sync.</p>}
        {open === source.id && onChange && <div className="mt-3 grid gap-3 border-t pt-3 sm:grid-cols-2">{(source.requirements?.fields ?? []).filter(field => field.kind !== 'images').map(field => {
          const id = `${prefix}-${source.id}-${field.key}`;
          const value = requirementValue(status.values, field.key);
          const change = (value: string) => onChange({ ...drafts, [source.id]: patchRequirement(drafts[source.id] ?? {}, field.key, field.kind === 'number' ? value === '' ? '' : Number(value) : value) });
          return <div key={field.key} className="space-y-1.5"><Label htmlFor={id}>{field.label} <span aria-hidden="true">*</span></Label>{field.options ? <select id={id} className="h-11 w-full rounded-md border bg-background px-3 text-sm" disabled={disabled} value={String(value ?? '')} onChange={event => change(event.target.value)}><option value="">Choose a value</option>{field.options.map(option => <option key={option}>{option}</option>)}</select> : <Input id={id} className="h-11" disabled={disabled} type={field.kind === 'number' ? 'number' : 'text'} value={String(value ?? '')} onChange={event => change(event.target.value)} />}</div>;
        })}<p className="text-xs text-muted-foreground sm:col-span-2">Saved with the link as a local listing draft. Master and shop data stay unchanged.</p></div>}
      </li>;
    })}</ul>
  </section>;
}
