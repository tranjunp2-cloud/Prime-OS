import { Link, useSearchParams } from 'react-router-dom';
import { BarChart3, ClipboardList, PlugZap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/system/EmptyState';
import { cn } from '@/lib/utils';
import { firstIncompleteStep, isNoDataOverview, readSellerDemo, rememberOverviewDemoMode, steps } from '@/components/seller-onboarding/demo-state';

export function OverviewDemoMode() {
  const [params, setParams] = useSearchParams();
  const noData = isNoDataOverview(params);
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Demo mode">
      <span className="text-xs font-medium text-muted-foreground">Demo</span>
      <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
        {[{ empty: false, label: 'With data' }, { empty: true, label: 'No data' }].map(({ empty, label }) => (
          <Button key={label} type="button" size="sm" variant="ghost" aria-pressed={noData === empty}
            className={cn('h-9 border px-3 text-xs motion-reduce:transition-none', noData === empty ? 'border-primary/50 bg-primary/10 text-foreground hover:bg-primary/15' : 'border-transparent text-muted-foreground')}
            onClick={() => {
              rememberOverviewDemoMode(empty);
              const next = new URLSearchParams(params);
              if (empty) next.set('demo', 'no-data');
              else next.delete('demo');
              setParams(next);
            }}>{label}</Button>
        ))}
      </div>
    </div>
  );
}

export function OverviewNoData({ analytics = false }: { analytics?: boolean }) {
  const setup = readSellerDemo();
  const setupComplete = setup.completed.length === 5;
  const setupStarted = setup.view === 'home' || setup.completed.length > 0 || Boolean(setup.name);
  const setupLabel = setupComplete ? 'Review setup' : setupStarted ? 'Resume setup' : 'Start setup';
  const nextStep = firstIncompleteStep(setup);
  const setupHref = setupComplete ? '/demo/no-data' : `/demo/no-data?step=${nextStep + 1}`;
  const summaries = analytics
    ? ['Total Revenue', 'Total Orders', 'Total Products Sold', 'Repeat Purchase Rate', 'Avg Shipping Cost']
    : ['Orders', 'Fulfillment', 'Inventory', 'CRM'];
  const sections = analytics
    ? ['Unified Trend', 'Order Cancellation Reasons', 'Top 5 Regions by Revenue', 'Shipping Carrier Breakdown', 'Performance Breakdown']
    : ['Channel Revenue Today', 'Top Products', 'Connection Health'];
  return (
    <div className="grid gap-6">
      <EmptyState
        icon={<PlugZap aria-hidden="true" />}
        title={analytics ? 'No analytics data yet' : 'Your workspace is ready for its first activity'}
        description={analytics ? 'Connect your sales channels and sync your first orders to see revenue, trends, and customer insights.' : 'Your progress is saved. Explore your workspace and add or sync your first data whenever you are ready.'}
        action={<div className="flex flex-col items-center gap-3">
          {!analytics && setupStarted && <div className="space-y-1 text-sm text-muted-foreground">
            <p>{setupComplete ? 'Initial setup complete' : `${5 - setup.completed.length} setup ${setup.completed.length === 4 ? 'step' : 'steps'} left`} · {setup.completed.length}/5 steps completed</p>
            {!setupComplete && <p>Next: {steps[nextStep]} · Continue whenever you’re ready.</p>}
          </div>}
          <div className="flex flex-wrap justify-center gap-2">
            <Button asChild><Link to={setupHref}>{setupLabel}</Link></Button>
            <Button asChild variant="outline"><Link to={analytics ? '/admin/dashboard?demo=no-data' : '/client-reports?demo=no-data'}>{analytics ? 'Go to Home' : 'View analytics'}</Link></Button>
          </div>
        </div>}
      />
      <section className={cn('grid gap-3 sm:grid-cols-2', analytics ? 'xl:grid-cols-5' : 'xl:grid-cols-4')} aria-label={analytics ? 'Analytics KPI summary' : 'Operations Pipeline'}>
        {summaries.map((label) => <article key={label} className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-medium text-muted-foreground">{label}</h2>
          <p className="mt-3 text-2xl font-semibold text-foreground">—<span className="sr-only"> No data</span></p>
          <p className="mt-1 text-xs text-muted-foreground">{analytics ? 'Awaiting synced data' : 'No activity yet'}</p>
        </article>)}
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        {sections.map((title, index) => <section key={title} className={cn('overflow-hidden rounded-xl border border-border bg-card', index === 0 && 'lg:col-span-2')}>
          <h2 className="border-b border-border px-5 py-4 font-semibold text-foreground">{title}</h2>
          <EmptyState className="border-0 shadow-none" icon={analytics ? <BarChart3 aria-hidden="true" /> : <ClipboardList aria-hidden="true" />}
            title={title === 'Connection Health' ? 'No channels connected' : 'No data yet'}
            description={title === 'Connection Health' ? 'Your connected channels and sync status will appear here.' : 'This section will update when activity is available.'} />
        </section>)}
      </div>
    </div>
  );
}
