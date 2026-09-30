import { useEffect, useState } from 'react';
import { Plus, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WorkspacePageHeader } from '@/components/system/WorkspacePageHeader';
import { PricingRuleDialog } from '@/components/settings/PricingRuleDialog';
import { migrateProductPricing, readPricing, type PricingRule } from '@/lib/pricing-rules';
import { usePricingRevision } from '@/hooks/use-pricing';
import { toast } from 'sonner';

export default function PricingRules() {
  usePricingRevision();
  useEffect(() => { migrateProductPricing(); }, []);
  const [editing, setEditing] = useState<PricingRule | 'new' | null>(null);
  const { rules, shops } = readPricing();
  return <main className="min-h-full bg-background p-4 md:p-6"><div className="mx-auto max-w-5xl space-y-6"><WorkspacePageHeader title="Pricing rules" description="Set up shared currency conversion and price adjustments. Assign a default rule to each shop." icon={SlidersHorizontal} actions={<Button onClick={() => setEditing('new')}><Plus className="size-4" />Create rule</Button>} />
    <p className="text-sm leading-6 text-muted-foreground">Product Master keeps the base price. Listings inherit their shop rule or use a manual price. Rule changes need listing review; nothing is sent to a marketplace automatically.</p>
    <section className="divide-y overflow-hidden rounded-xl border" aria-label="Pricing rules">{rules.length ? rules.map(rule => <div key={rule.id} className="flex flex-wrap items-center gap-4 p-4"><div className="min-w-0 flex-1"><h2 className="text-sm font-semibold">{rule.name}</h2><p className="mt-1 text-xs text-muted-foreground">{rule.baseCurrency} → {rule.targetCurrency} · {rule.adjustmentPct > 0 ? '+' : ''}{rule.adjustmentPct}% adjustment · {shops.filter(shop => shop.ruleId === rule.id).length} shops{!rule.enabled ? ' · Inactive' : ''}</p>{rule.migratedFrom && <p className="mt-1 text-xs text-muted-foreground">Moved from {rule.migratedFrom} · Assign to a shop to use</p>}</div><Button variant="outline" onClick={() => setEditing(rule)} aria-label={`Edit ${rule.name}`}>Edit rule</Button></div>) : <div className="space-y-2 px-6 py-12 text-center"><h2 className="font-medium">No pricing rules yet</h2><p className="text-sm text-muted-foreground">Selling in the same currency? You can use the Master price without a rule.</p></div>}</section>
    <p className="text-xs text-muted-foreground">Shop defaults are managed in Sales Channels → Manage shop → Pricing.</p>
    {editing && <PricingRuleDialog rule={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} onSaved={() => toast.success('Pricing rule saved. Existing listing prices remain unchanged.')} />}
  </div></main>;
}
