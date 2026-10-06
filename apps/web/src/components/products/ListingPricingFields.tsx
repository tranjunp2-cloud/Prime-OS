import { useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShopPricingSettings } from '@/components/settings/ShopPricingSettings';
import { confirmedPricing, formatPrice, pricingNeedsReview, quoteListingPrice, readPricing, type ListingPricing } from '@/lib/pricing-rules';
import { usePricingRevision } from '@/hooks/use-pricing';

export function ListingPricingFields({ draft, basePrice, baseCurrency, shopLabel: defaultShopLabel, onChange, reviewMode = 'field', syncManaged = false }: { draft: ListingPricing; basePrice: number; baseCurrency: string; shopLabel: string; onChange: (patch: ListingPricing) => void; reviewMode?: 'field' | 'submit'; syncManaged?: boolean }) {
  usePricingRevision();
  const id = useId();
  const manualInput = useRef<HTMLInputElement>(null);
  const shopLabel = draft.pricing_shop_label || defaultShopLabel;
  const [setup, setSetup] = useState(false);
  const quote = quoteListingPrice(basePrice, baseCurrency, draft);
  const pending = pricingNeedsReview(draft, quote);
  const shopCurrency = readPricing().shops.find(shop => shop.shopId === draft.pricing_shop_id)?.currency || draft.channel_currency;
  const manual = draft.pricing_source === 'manual';
  const switchSource = (source: 'shop' | 'manual') => {
    onChange({ pricing_source: source, manual_price: draft.manual_price ?? (draft.channel_price == null ? '' : String(draft.channel_price)), pricing_signature: undefined });
    if (source === 'manual') { setSetup(false); requestAnimationFrame(() => manualInput.current?.focus()); }
  };
  return <section className="space-y-4 rounded-xl border p-5" data-listing-pricing>
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-sm font-semibold">Listing price</h3><p className="mt-1 text-xs text-muted-foreground">Master: {formatPrice(basePrice, baseCurrency)} · {shopLabel}</p></div>{draft.pricing_shop_id && !quote.error && <Button type="button" variant="ghost" size="sm" aria-expanded={setup} onClick={() => setSetup(!setup)}>Shop pricing</Button>}</div>
    {syncManaged && <p className="text-xs leading-5 text-muted-foreground">One-time draft price. Automatic price updates are controlled in Master sync settings.</p>}
    <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm">{syncManaged ? 'Draft price source' : 'Price source'}<select className="h-10 min-w-0 rounded-md border bg-background px-3 focus-visible:ring-2 focus-visible:ring-ring" value={draft.pricing_source ?? 'shop'} onChange={e => switchSource(e.target.value as 'shop' | 'manual')}><option value="shop">{syncManaged ? 'Calculate once from Master' : 'Calculate from Master'}</option><option value="manual">Enter a listing price</option></select></label>
    {manual && <label className="grid gap-2 text-sm"><span>Manual price ({shopCurrency || 'choose currency'})</span><Input ref={manualInput} type="number" min="0" step="any" aria-invalid={Boolean(quote.error)} aria-describedby={quote.error ? `${id}-error` : undefined} className={quote.error ? 'border-amber-500 focus-visible:ring-amber-500' : ''} value={draft.manual_price ?? draft.channel_price ?? ''} onChange={e => onChange({ manual_price: e.target.value, channel_currency: shopCurrency, pricing_signature: undefined })} /></label>}</div>
    {quote.error ? <div className="space-y-3"><div role="alert" id={`${id}-error`} className="text-sm"><p className="font-medium text-amber-800 dark:text-amber-300">{manual ? 'Complete the listing price' : `No selling price${shopCurrency ? ` in ${shopCurrency}` : ''}`}</p><p className="mt-1 text-muted-foreground">{quote.error}</p></div><div className="flex flex-wrap gap-2">{!manual && <Button type="button" variant="outline" onClick={() => switchSource('manual')}>Enter price{shopCurrency ? ` in ${shopCurrency}` : ''}</Button>}{draft.pricing_shop_id && <Button type="button" variant="outline" aria-expanded={setup} onClick={() => { switchSource('shop'); setSetup(!setup); }}>{shopCurrency ? `Set up ${baseCurrency} → ${shopCurrency} pricing` : 'Choose shop currency'}</Button>}</div></div> : <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/30 p-4" aria-live="polite"><div><p className="text-xs text-muted-foreground">{pending ? draft.channel_price == null ? 'Proposed listing price' : 'Current → proposed price' : 'Confirmed listing draft price'}</p><p className="mt-1 text-lg font-semibold tabular-nums">{pending && draft.channel_price != null ? `${formatPrice(draft.channel_price, draft.channel_currency)} → ` : ''}{formatPrice(quote.amount, quote.currency)}</p><p className="mt-1 text-xs text-muted-foreground">{quote.source}</p></div>{reviewMode === 'field' && pending && <Button type="button" size="sm" onClick={() => onChange(confirmedPricing(draft, quote))}>Confirm listing price</Button>}</div>
      <p className="text-xs leading-5 text-muted-foreground">{reviewMode === 'submit' ? 'Review this price with the rest of your listing before confirming. Nothing is sent while you edit.' : 'Applies to this listing draft only. Publishing to the marketplace is a separate step.'}</p>
    </>}
    {setup && draft.pricing_shop_id && <div role="region" aria-label="Set up shop pricing" className="space-y-4 border-t pt-4"><p className="text-xs leading-5 text-muted-foreground">Shop-wide default. Other listings using this default will need price review; their saved prices will not be overwritten.</p><ShopPricingSettings shopId={draft.pricing_shop_id} label={shopLabel} currency={draft.channel_currency} baseCurrency={baseCurrency} onSaved={() => setSetup(false)} /><Button type="button" variant="ghost" onClick={() => setSetup(false)}>Cancel shop setup</Button></div>}
  </section>;
}
