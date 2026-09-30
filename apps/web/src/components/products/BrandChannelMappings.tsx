import { useRef, useState } from 'react';
import { Check, ChevronDown, CircleAlert, ExternalLink, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChannelLogo } from '@/components/channels/ChannelLogo';
import { cn } from '@/lib/utils';
import type { CatalogBrand } from '@/lib/product-catalog-settings-store';
import { brandMarketplaceExamples, clearBrandMapping, getBrandMappingPresentation, searchDemoBrands, selectDemoBrand } from '@/lib/brand-marketplace-demo';

export function BrandChannelMappings({ value, onChange }: { value: CatalogBrand; onChange: (brand: CatalogBrand) => void }) {
  return <div className="space-y-4">
    <div className="space-y-1.5">
      <p className="text-sm font-semibold">Choose how this brand appears on each marketplace</p>
      <p className="text-xs leading-5 text-muted-foreground">Mapping identifies the brand. Listing requirements and any brand authorization are checked separately for each shop. Unmapped channels do not block Product Master.</p>
      <p className="rounded-lg border bg-muted/30 px-3 py-2 text-xs leading-5 text-muted-foreground"><span className="font-semibold text-foreground">Demo only.</span> Sample shops, catalog IDs and responses — no live marketplace checks. Saving changes only updates this local demo.</p>
    </div>
    <div className="space-y-3">{brandMarketplaceExamples.map(example => <MarketplaceBrandCard key={`${value.id}:${example.channel}`} brand={value} example={example} onChange={onChange} />)}</div>
  </div>;
}

function MarketplaceBrandCard({ brand, example, onChange }: { brand: CatalogBrand; example: typeof brandMarketplaceExamples[number]; onChange: (brand: CatalogBrand) => void }) {
  const { channel, label, market, shop, category, kind } = example;
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState(brand.name);
  const [helpOpen, setHelpOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const mapping = getBrandMappingPresentation(brand, channel);
  const options = searchDemoBrands(channel, query);
  const warning = mapping.state === 'approval_required';
  const statusClass = warning ? 'text-amber-800 dark:text-amber-300' : mapping.state === 'selected' ? 'text-emerald-800 dark:text-emerald-300' : 'text-muted-foreground';

  return <section aria-label={`${label} brand mapping`} className="overflow-hidden rounded-xl border bg-background">
    <div className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <ChannelLogo channel={{ key: channel, label }} size="lg" />
          <div className="min-w-0"><h3 className="text-sm font-semibold">{label} <span className="font-normal text-muted-foreground">· {market}</span></h3><p className="mt-0.5 text-xs text-muted-foreground">{shop}{category ? ` · ${category}` : ''}</p></div>
        </div>
        <p className={cn('inline-flex items-center gap-1.5 text-xs font-medium', statusClass)}>{warning ? <CircleAlert className="size-3.5" aria-hidden="true" /> : mapping.state === 'selected' ? <Check className="size-3.5" aria-hidden="true" /> : null}{mapping.label}</p>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="min-w-0 text-sm">
          {mapping.needsBrandSelection ? <p className="text-muted-foreground">Find and select your brand on {label}.</p> : mapping.name ? <><p className="break-words font-medium">{mapping.name}</p>{kind === 'catalog' ? <p className="mt-0.5 font-mono text-xs text-muted-foreground">Brand ID: {mapping.value}</p> : null}</> : <p className="text-muted-foreground">No marketplace brand selected</p>}
          {kind === 'suggested_name' ? <p className="mt-0.5 text-xs text-muted-foreground">{mapping.value ? 'Custom name for Rakuten' : 'From original brand name'}</p> : null}
        </div>
        <Button ref={trigger} type="button" variant="outline" size="sm" aria-expanded={expanded} aria-controls={`brand-mapping-${channel}`} onClick={() => setExpanded(!expanded)} className="shrink-0 gap-1.5">{kind === 'suggested_name' ? 'Edit' : kind === 'name' ? 'Edit name' : mapping.name ? 'Change' : 'Find brand'}<ChevronDown aria-hidden="true" className={cn('size-3.5', expanded && 'rotate-180')} /></Button>
      </div>
      {mapping.state === 'approval_required' ? <div className="mt-3 border-t pt-3 text-xs leading-5"><p className="text-amber-800 dark:text-amber-300">Sample response 5665: Amazon has not approved this brand name.</p><button type="button" className="mt-1 min-h-8 font-medium underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-expanded={helpOpen} onClick={() => setHelpOpen(!helpOpen)}>How to resolve</button>{helpOpen ? <div className="mt-2 space-y-2 text-muted-foreground"><p>Request brand-name approval in Seller Central using the application linked in the listing error. Follow Amazon’s requested product and packaging evidence. Prime OS cannot approve it for you.</p><p>Brand Registry is a separate program, not a “verify” switch here. Saving or changing the name does not resolve the marketplace restriction.</p><a href="https://sell.amazon.com/blog/sell-branded-products-on-amazon" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-foreground underline underline-offset-4">Amazon guidance<ExternalLink className="size-3" /></a></div> : null}</div> : null}
      {mapping.state === 'selected' ? <p className="mt-2 text-xs leading-5 text-muted-foreground">Sample catalog match only — not approval to publish.</p> : null}
      {kind === 'suggested_name' ? <p className="mt-2 text-xs leading-5 text-muted-foreground">Suggested for listing setup. Not checked with Rakuten.</p> : null}
    </div>
    {expanded ? <div id={`brand-mapping-${channel}`} className="space-y-3 border-t bg-muted/20 p-4">
      {kind === 'name' ? <>
        <Label htmlFor={`brand-${channel}`}>{label} brand name</Label>
        <Input id={`brand-${channel}`} value={brand.mappings[channel] ?? ''} onChange={event => onChange({ ...brand, mappings: { ...brand.mappings, [channel]: event.target.value } })} />
        <p className="text-xs leading-5 text-muted-foreground">Use the name shown on the product or packaging. A name is not a marketplace brand ID and does not confirm approval.</p>
      </> : kind === 'catalog' ? <>
        <Label htmlFor={`brand-search-${channel}`}>Search {label} sample catalog</Label>
        <div className="relative"><Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" aria-hidden="true" /><Input id={`brand-search-${channel}`} className="pl-9" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search by brand name" /></div>
        <div aria-live="polite" className="space-y-2">{options.length ? options.map(option => <button key={option.value} type="button" aria-label={`Select ${option.name} for ${label}`} onClick={() => { onChange(selectDemoBrand(brand, channel, option)); setExpanded(false); trigger.current?.focus(); }} className="flex min-h-12 w-full items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span><span className="block text-sm font-medium">{option.name}</span><span className="block font-mono text-xs text-muted-foreground">ID {option.value} · sample</span></span><span className="text-xs font-medium">Select</span></button>) : <div className="rounded-md border border-dashed p-3"><p className="text-sm font-medium">No brand found in this sample catalog</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{channel === 'tiktok' ? 'Check brand availability and any required brand authorization in this shop’s Seller Center.' : 'Check the spelling and marketplace context, or request the brand through Seller Center.'} Do not choose “No Brand” for a branded product just to continue.</p></div>}</div>
        <p className="text-xs leading-5 text-muted-foreground">Choose a name; the matching ID is stored automatically. These sample results do not query {label}.</p>
      </> : <>
        <Label htmlFor="brand-rakuten">Rakuten brand name</Label>
        <Input id="brand-rakuten" value={brand.mappings.rakuten ?? brand.name} placeholder={brand.name} aria-describedby="brand-rakuten-help" onChange={event => onChange({ ...brand, mappings: { ...brand.mappings, rakuten: event.target.value.trim() ? event.target.value : '' } })} />
        <p id="brand-rakuten-help" className="text-xs leading-5 text-muted-foreground">Leave blank to use the original brand name. This saves a suggestion only; existing listing names and Product Master stay unchanged.</p>
      </>}
      {mapping.value && !mapping.needsBrandSelection ? <Button type="button" variant="ghost" size="sm" onClick={() => onChange(clearBrandMapping(brand, channel))}>{kind === 'suggested_name' ? 'Use original brand name' : `Clear ${label} mapping`}</Button> : null}
    </div> : null}
  </section>;
}
