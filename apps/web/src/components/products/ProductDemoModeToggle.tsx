import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useDemoDataMode } from '@/hooks/use-demo-data-mode';
import { writeDemoDataMode } from '@/lib/demo-data-mode';
import { cn } from '@/lib/utils';

const scenarios = [
  { value: 'with-data', label: 'With data', hint: 'View the existing Product Master catalog. Saved data is kept.' },
  { value: 'no-products', label: 'No products', hint: 'Channels are connected and shop listings are ready to review. No Product Masters yet. Saved data is kept.' },
  { value: 'no-channels', label: 'No channels', hint: 'Start without connected channels or Product Masters. Saved data is kept.' },
] as const;

export function ProductDemoModeToggle() {
  const { noData } = useDemoDataMode();
  const [params, setParams] = useSearchParams();
  const selected = !noData ? 'with-data' : params.get('preview') === 'first-product' ? 'no-products' : 'no-channels';

  function selectScenario(value: typeof scenarios[number]['value']) {
    writeDemoDataMode(value === 'with-data' ? 'with-data' : 'no-data');
    const next = new URLSearchParams(params);
    for (const key of ['demo', 'preview', 'customer', 'order', 'warehouse', 'sku', 'rank-settings', 'section', 'q', 'review']) next.delete(key);
    if (value !== 'with-data') next.set('demo', 'no-data');
    // Keep the two onboarding scenarios distinct without touching saved catalog data.
    if (value === 'no-products') next.set('preview', 'first-product');
    setParams(next);
  }

  return <div className="flex flex-wrap items-center gap-2 sm:ml-3" role="group" aria-label="Demo mode">
    <span className="text-xs font-medium text-muted-foreground">Demo</span>
    <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1">
      {scenarios.map(({ value, label, hint }) => <Button key={value} type="button" variant="ghost" size="sm"
        aria-pressed={selected === value} title={hint} onClick={() => selectScenario(value)}
        className={cn('min-h-9 border px-3 text-xs motion-reduce:transition-none', selected === value ? 'border-primary/50 bg-primary/10 text-foreground hover:bg-primary/15' : 'border-transparent text-muted-foreground hover:text-foreground')}>
        {label}
      </Button>)}
    </div>
  </div>;
}
