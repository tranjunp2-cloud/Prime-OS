import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { PricingRuleDialog } from './PricingRuleDialog';
import { formatPrice, migrateProductPricing, PRICING_CURRENCIES, quoteListingPrice, readPricing, saveShopPricing, type ShopPricing } from '@/lib/pricing-rules';
import { getProducts } from '@/lib/product-store';
import { usePricingRevision } from '@/hooks/use-pricing';

export function ShopPricingSettings({ shopId, label, currency = '', baseCurrency, onSaved }: { shopId: string; label: string; currency?: string; baseCurrency?: string; onSaved?: () => void }) {
  usePricingRevision();
  useEffect(() => { migrateProductPricing(); }, []);
  const registry = readPricing();
  const [draft, setDraft] = useState<ShopPricing>(() => registry.shops.find(shop => shop.shopId === shopId) ?? { shopId, label, currency });
  const [creating, setCreating] = useState(false);
  const [review, setReview] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const compatible = registry.rules.filter(rule => rule.enabled && rule.targetCurrency === draft.currency && (!baseCurrency || rule.baseCurrency === baseCurrency));
  const nextRegistry = { ...registry, shops: [...registry.shops.filter(shop => shop.shopId !== shopId), draft] };
  const impacts = getProducts().flatMap(product => Object.values(product.channel_overrides ?? {}).filter(listing => listing.enabled && listing.pricing_shop_id === shopId).map(listing => ({ sku: listing.listing_sku || product.sku_code, old: formatPrice(listing.channel_price, listing.channel_currency), quote: quoteListingPrice(product.retail_price, product.price_currency, listing, nextRegistry) })));
  const save = () => {
    if (!draft.currency) { setError('Choose the shop currency.'); return; }
    if (!review && impacts.length) { setReview(true); return; }
    try { saveShopPricing(draft); setSaved(true); setReview(false); onSaved?.(); } catch (e) { setError(e instanceof Error ? e.message : 'Could not save shop pricing.'); }
  };
  return <section className="space-y-5 text-foreground"><div><h3 className="text-base font-semibold">Shop pricing</h3><p className="mt-1 text-sm text-muted-foreground">{label}. Manual listing prices take priority over this default.</p></div>
    {review ? <div className="space-y-3"><p className="text-sm font-medium">Review {impacts.length} affected listings</p><div className="max-h-72 divide-y overflow-y-auto rounded-lg border">{impacts.map((item, index) => <div key={`${item.sku}:${index}`} className="p-3 text-sm"><p>{item.sku}</p><p className="mt-1 text-xs text-muted-foreground">{item.old} → {item.quote.error || formatPrice(item.quote.amount, item.quote.currency)}</p></div>)}</div><p className="text-xs text-muted-foreground">This saves the shop default only. Listing prices stay unchanged until reviewed and confirmed in each listing.</p></div> : <>
    <label className="grid gap-2 text-sm">Shop currency<select value={draft.currency} className="h-10 w-full rounded-md border bg-background px-3 focus-visible:ring-2 focus-visible:ring-ring" onChange={e => { setDraft(current => ({ ...current, currency: e.target.value, ruleId: undefined })); setSaved(false); }}><option value="">Choose currency</option>{[...new Set([...PRICING_CURRENCIES, draft.currency].filter(Boolean))].map(value => <option key={value}>{value}</option>)}</select></label>
    <label className="grid gap-2 text-sm">Default pricing rule<select value={draft.ruleId ?? ''} className="h-10 w-full rounded-md border bg-background px-3 focus-visible:ring-2 focus-visible:ring-ring" onChange={e => { setDraft(current => ({ ...current, ruleId: e.target.value || undefined })); setSaved(false); }}><option value="">Use Master price · same currency only</option>{draft.ruleId && !compatible.some(rule => rule.id === draft.ruleId) && <option value={draft.ruleId} disabled>Current rule unavailable — choose another</option>}{compatible.map(rule => <option value={rule.id} key={rule.id}>{rule.name} · {rule.baseCurrency} → {rule.targetCurrency}</option>)}</select><span className="text-xs leading-5 text-muted-foreground">Different currencies require a matching rule or a manual listing price. No automatic currency conversion without a rule.</span></label>
    <Button type="button" variant="outline" disabled={!draft.currency} onClick={() => setCreating(true)}>Create pricing rule</Button>
    </>}
    {error && <p className="text-sm text-destructive" role="alert">{error}</p>}{saved && <p className="text-sm text-muted-foreground" role="status">Shop default saved. Existing listing prices were not changed.</p>}
    <div className="flex flex-wrap justify-end gap-2 border-t pt-4">{review && <Button type="button" variant="outline" onClick={() => setReview(false)}>Back</Button>}<Button type="button" onClick={save}>{review ? 'Confirm shop default' : 'Save shop pricing'}</Button></div>
    {creating && <PricingRuleDialog baseCurrency={baseCurrency} targetCurrency={draft.currency} onClose={() => setCreating(false)} onSaved={rule => { setDraft(current => ({ ...current, ruleId: rule.id })); setSaved(false); }} />}
  </section>;
}
