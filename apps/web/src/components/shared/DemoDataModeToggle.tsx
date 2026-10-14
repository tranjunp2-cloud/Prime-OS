import { Button } from '@/components/ui/button';
import { useDemoDataMode } from '@/hooks/use-demo-data-mode';
import { cn } from '@/lib/utils';

export function DemoDataModeToggle() {
  const { mode, setMode } = useDemoDataMode();
  return <div className="flex flex-wrap items-center gap-2 sm:ml-3" role="group" aria-label="Demo mode">
    <span className="text-xs font-medium text-muted-foreground">Demo</span>
    <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
      {(['with-data', 'no-data'] as const).map(value => <Button key={value} type="button" variant="ghost" size="sm" aria-pressed={mode === value}
        title="Applies to all screens. Saved data is kept."
        onClick={() => setMode(value, ['customer', 'order', 'warehouse', 'sku', 'rank-settings', 'section', 'q', 'review'])}
        className={cn('min-h-9 border px-3 text-xs motion-reduce:transition-none', mode === value ? 'border-primary/50 bg-primary/10 text-foreground hover:bg-primary/15' : 'border-transparent text-muted-foreground hover:text-foreground')}>
        {value === 'with-data' ? 'With data' : 'No data'}
      </Button>)}
    </div>
  </div>;
}
