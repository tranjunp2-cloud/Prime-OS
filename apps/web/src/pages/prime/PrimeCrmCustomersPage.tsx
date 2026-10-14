import { useSearchParams } from 'react-router-dom';
import { Settings2, UsersRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WorkspacePageHeader } from '@/components/system/WorkspacePageHeader';
import { OrderCustomerDirectory } from '@/components/prime/customer-profile/OrderCustomerDirectory';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useDemoDataMode } from '@/hooks/use-demo-data-mode';
import { writeDemoDataMode } from '@/lib/demo-data-mode';

export function PrimeCrmCustomersPage() {
  const { user } = useAuth();
  const customerScope = JSON.stringify([user?.workspace || '', user?.id || '']);
  const [searchParams, setSearchParams] = useSearchParams();
  const demoState = useDemoDataMode().noData ? 'no-data' : 'data';

  function setDemoState(value: string) {
    writeDemoDataMode(value === 'no-data' ? 'no-data' : 'with-data');
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('customer');
    nextParams.delete('floor');
    nextParams.delete('rank-settings');
    nextParams.delete('section');
    nextParams.delete('tab');
    if (value === 'no-data') nextParams.set('demo', 'no-data');
    else nextParams.delete('demo');
    setSearchParams(nextParams);
  }

  return (
    <div className="min-h-full space-y-5 bg-background p-4 pb-16 md:p-6" data-testid="crm-customer-directory">
      {(!searchParams.has('customer') || demoState === 'no-data') && <WorkspacePageHeader
        title="Customers"
        description="Customer contact details and purchase history, automatically collected from orders."
        icon={UsersRound}
        titleAccessory={(
          <div className="flex flex-wrap items-center gap-2 sm:ml-3" role="group" aria-label="Customers demo mode">
            <span className="text-xs font-medium text-muted-foreground">Demo</span>
            <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
              {([{ value: 'data', label: 'With data' }, { value: 'no-data', label: 'No data' }] as const).map(({ value, label }) => {
                const selected = demoState === value;
                return (
                  <Button
                    key={value}
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-pressed={selected}
                    onClick={() => setDemoState(value)}
                    className={cn('h-8 border px-3 text-xs motion-reduce:transition-none', selected ? 'border-primary/50 bg-primary/10 text-foreground hover:bg-primary/15' : 'border-transparent text-muted-foreground hover:text-foreground')}
                  >
                    {label}
                  </Button>
                );
              })}
            </div>
          </div>
        )}
        actions={demoState === 'data' ? (
          <div className="flex flex-wrap gap-2"><Button id="customer-rank-settings-trigger" variant="outline" className="min-h-11 gap-2" aria-haspopup="dialog" onClick={() => { const next = new URLSearchParams(searchParams); next.delete('customer'); next.delete('section'); next.set('rank-settings', '1'); setSearchParams(next, { replace: true }); }}><Settings2 className="size-4" aria-hidden="true" />Rank settings</Button></div>
        ) : undefined}
      />}
      {user && <OrderCustomerDirectory key={`${customerScope}:${demoState}`} scope={customerScope} rankScope={user.workspace || user.id} canManageRanks={user.role === 'admin'} noDataDemo={demoState === 'no-data'} />}
    </div>
  );
}
