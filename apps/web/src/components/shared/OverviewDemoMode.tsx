import { Link } from 'react-router-dom';
import { BarChart3, ClipboardList, PlugZap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/system/EmptyState';
import { cn } from '@/lib/utils';
import { InitialSetupBanner } from '@/components/onboarding/InitialSetupBanner';
import { DemoDataModeToggle } from './DemoDataModeToggle';

export function OverviewDemoMode() {
  return <DemoDataModeToggle />;
}

export function OverviewNoData({ analytics = false }: { analytics?: boolean }) {
  const summaries = analytics
    ? ['Total Revenue', 'Total Orders', 'Total Products Sold', 'Repeat Purchase Rate', 'Avg Shipping Cost']
    : ['Orders', 'Fulfillment', 'Inventory', 'CRM'];
  const sections = analytics
    ? ['Unified Trend', 'Order Cancellation Reasons', 'Top 5 Regions by Revenue', 'Shipping Carrier Breakdown', 'Performance Breakdown']
    : ['Channel Revenue Today', 'Top Products', 'Connection Health'];
  return (
    <div className="grid gap-6">
      {analytics ? <EmptyState
        icon={<PlugZap aria-hidden="true" />}
        title="No analytics data yet"
        description="Connect your sales channels and sync your first orders to see revenue, trends, and customer insights."
        action={<Button asChild variant="outline"><Link to="/admin/dashboard?demo=no-data">Go to Home</Link></Button>}
      /> : <><InitialSetupBanner /><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">Your workspace is ready for its first activity.</p><Button asChild variant="ghost" className="min-h-11"><Link to="/client-reports?demo=no-data">View analytics</Link></Button></div></>}
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
