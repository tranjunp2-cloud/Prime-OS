import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useSalesSetupPreferences } from '@/hooks/use-sales-setup';
import { firstIncompleteStep, readSellerDemo } from '@/components/seller-onboarding/demo-state';

export function SalesSetupSettings() {
  const { preferences, update, error } = useSalesSetupPreferences();
  const step = firstIncompleteStep(readSellerDemo());
  return <section id="sales-setup" className="rounded-xl border bg-card p-5" aria-labelledby="guidance-settings-title">
    <div className="flex items-center gap-4"><div className="min-w-0 flex-1"><h2 id="guidance-settings-title" className="text-base font-semibold">Sales setup guidance</h2><p className="mt-1 text-sm text-muted-foreground">Show suggested next steps on Home. Your saved workspace details are always available here.</p></div><Switch aria-label="Show sales setup on Home" checked={!preferences.hidden} onCheckedChange={checked => update({ hidden: !checked, collapsed: false })} /></div>
    <Button asChild variant="outline" className="mt-4 min-h-11"><Link to={step < 0 ? '/demo/no-data' : `/demo/no-data?step=${step + 1}`}>Review workspace details</Link></Button>
    {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
  </section>;
}
