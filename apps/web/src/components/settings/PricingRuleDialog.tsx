import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatPrice, PRICING_CURRENCIES, quoteListingPrice, ruleImpacts, savePricingRule, validateRule, type PricingRule } from '@/lib/pricing-rules';

export function PricingRuleDialog({ rule, baseCurrency = 'JPY', targetCurrency = 'VND', onClose, onSaved }: { rule?: PricingRule; baseCurrency?: string; targetCurrency?: string; onClose: () => void; onSaved: (rule: PricingRule) => void }) {
  const [draft, setDraft] = useState<PricingRule>(() => rule ? { ...rule } : {
    id: crypto.randomUUID(), name: '', code: '', baseCurrency, targetCurrency, fxRate: baseCurrency === targetCurrency ? 1 : NaN,
    fxValidityHours: 0, adjustmentPct: 0, marketplaceFeePct: 0, taxPct: 0,
    roundingIncrement: 0, minPrice: 0, maxPrice: 0, enabled: true, version: 0, rateUpdatedAt: new Date().toISOString(),
  });
  const [samplePrice, setSamplePrice] = useState('1000');
  const [review, setReview] = useState(false);
  const [error, setError] = useState('');
  const patch = (values: Partial<PricingRule>) => { setDraft(current => ({ ...current, ...values })); setError(''); setReview(false); };
  const impacts = rule ? ruleImpacts(draft) : [];
  const preview = quoteListingPrice(Number(samplePrice), draft.baseCurrency, { pricing_source: 'shop', pricing_shop_id: 'preview', channel_currency: draft.targetCurrency }, { rules: [{ ...draft, name: draft.name || 'Preview' }], shops: [{ shopId: 'preview', label: 'Preview', currency: draft.targetCurrency, ruleId: draft.id }] });
  const save = () => {
    const invalid = validateRule(draft);
    if (invalid) { setError(invalid); return; }
    if (rule && !review) { setReview(true); return; }
    try { onSaved(savePricingRule(draft)); onClose(); } catch (e) { setError(e instanceof Error ? e.message : 'Could not save the rule.'); }
  };
  const numeric = (key: 'fxRate' | 'adjustmentPct' | 'roundingIncrement' | 'marketplaceFeePct' | 'taxPct' | 'minPrice' | 'maxPrice' | 'fxValidityHours', label: string, help?: string) => <label className="grid gap-2 text-sm"><span>{label}</span><Input type="number" step="any" value={Number.isNaN(draft[key]) ? '' : draft[key]} onChange={e => patch({ [key]: e.target.value === '' ? NaN : Number(e.target.value), ...(key === 'fxRate' ? { rateUpdatedAt: new Date().toISOString() } : {}) })} />{help && <span className="text-xs leading-5 text-muted-foreground">{help}</span>}</label>;
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}><DialogContent className="flex max-h-[90dvh] flex-col sm:max-w-2xl"><DialogHeader><DialogTitle>{review ? 'Review rule update' : rule ? 'Edit pricing rule' : 'Create pricing rule'}</DialogTitle><DialogDescription>{review ? 'Saving updates the rule, not listing prices. Review and confirm each listing separately before publishing.' : 'A reusable rule for shop pricing. Exchange rates are entered manually.'}</DialogDescription></DialogHeader>
    <div className="min-h-0 space-y-5 overflow-y-auto py-1">
      {review ? <><p className="text-sm">{impacts.length} linked listing{impacts.length === 1 ? '' : 's'} to review. Manual prices stay unchanged.</p><div className="divide-y rounded-lg border">{impacts.length ? impacts.map(item => <div key={`${item.productId}:${item.listingSku}`} className="space-y-1 p-3"><p className="text-sm font-medium">{item.listingSku} · {item.shop}</p><p className="text-xs text-muted-foreground">{formatPrice(item.current, item.currentCurrency)} → {item.next.error || formatPrice(item.next.amount, item.next.currency)}</p></div>) : <p className="p-4 text-sm text-muted-foreground">No saved listings currently inherit this rule.</p>}</div></> : <>
        <label className="grid gap-2 text-sm">Rule name<Input autoFocus value={draft.name} onChange={e => patch({ name: e.target.value })} placeholder="e.g. Japan to Vietnam retail" /></label>
        <div className="grid gap-4 sm:grid-cols-2">{(['baseCurrency', 'targetCurrency'] as const).map(key => <label key={key} className="grid gap-2 text-sm">{key === 'baseCurrency' ? 'Master currency' : 'Shop currency'}<select className="h-10 rounded-md border bg-background px-3 focus-visible:ring-2 focus-visible:ring-ring" value={draft[key]} onChange={e => patch({ [key]: e.target.value })}>{[...new Set([...PRICING_CURRENCIES, draft[key]])].map(currency => <option key={currency}>{currency}</option>)}</select></label>)}
        {numeric('fxRate', 'Exchange rate', `1 ${draft.baseCurrency} = ${Number.isFinite(draft.fxRate) ? draft.fxRate : '…'} ${draft.targetCurrency}`)}
        {numeric('adjustmentPct', 'Price adjustment (%)', 'Positive adds a markup; negative applies a discount.')}
        {numeric('roundingIncrement', 'Round down to increment', '0 keeps two decimals. Example: 1,000 VND.')}
        <label className="grid gap-2 text-sm">Example Master price<Input type="number" value={samplePrice} onChange={e => setSamplePrice(e.target.value)} /></label></div>
        <div className="rounded-lg border bg-muted/30 p-4 text-sm" aria-live="polite"><p className="text-xs text-muted-foreground">Calculated listing price · preview only</p><p className="mt-1 font-semibold tabular-nums">{preview.error || formatPrice(preview.amount, preview.currency)}</p></div>
        <details className="rounded-lg border p-4"><summary className="cursor-pointer text-sm font-medium">Advanced options</summary><div className="mt-4 grid gap-4 sm:grid-cols-2">{numeric('marketplaceFeePct', 'Fee uplift (%)', 'Added to price; not a commission margin guarantee.')}{numeric('taxPct', 'Tax uplift (%)')}{numeric('minPrice', 'Minimum price', '0 means no minimum.')}{numeric('maxPrice', 'Maximum price', '0 means no maximum.')}{numeric('fxValidityHours', 'Rate validity (hours)', '0 keeps a fixed rate until you update it.')}<div className="space-y-2 text-xs text-muted-foreground"><p>Rate confirmed: {new Date(draft.rateUpdatedAt).toLocaleString()}</p><Button type="button" variant="outline" size="sm" onClick={() => patch({ rateUpdatedAt: new Date().toISOString() })}>Confirm rate is current</Button></div></div></details>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.enabled} onChange={e => patch({ enabled: e.target.checked })} />Rule is active</label>
      </>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div><DialogFooter className="border-t pt-4"><Button type="button" variant="outline" onClick={() => review ? setReview(false) : onClose()}>{review ? 'Back to edit' : 'Cancel'}</Button><Button type="button" onClick={save}>{review ? 'Confirm rule update' : rule ? 'Review update' : 'Create rule'}</Button></DialogFooter>
  </DialogContent></Dialog>;
}
