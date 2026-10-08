import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Database, UsersRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WorkspacePageHeader } from '@/components/system/WorkspacePageHeader';
import { CustomerProfileFloor } from '@/components/prime/customer-profile/CustomerProfileFloor';
import { getPrimeSnapshot } from '@/lib/prime/prime-data';
import { cn } from '@/lib/utils';

export function PrimeCrmCustomersPage() {
  const snapshot = useMemo(() => getPrimeSnapshot(), []);
  const [searchParams, setSearchParams] = useSearchParams();
  const demoState = searchParams.get('demo') === 'no-data' ? 'no-data' : 'data';

  function setDemoState(value: string) {
    const nextParams = new URLSearchParams(searchParams);
    if (value === 'no-data') nextParams.set('demo', 'no-data');
    else nextParams.delete('demo');
    setSearchParams(nextParams);
  }

  return (
    <div className="min-h-full space-y-5 bg-background p-4 pb-16 md:p-6" data-testid="crm-customer-directory">
      <WorkspacePageHeader
        title="Customers"
        description="Manage customer records, contact details, ownership, lifecycle, segments, and identity quality across every connected channel."
        icon={UsersRound}
        titleAccessory={(
          <div className="flex flex-wrap items-center gap-2 sm:ml-3" role="group" aria-label="Customers demo mode">
            <span className="text-xs font-medium text-muted-foreground">Demo</span>
            <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
              {([{ value: 'data', label: 'With data' }, { value: 'no-data', label: 'No customers' }] as const).map(({ value, label }) => {
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
          <Badge variant="outline" className="h-8 w-fit gap-2 whitespace-nowrap px-3 font-medium">
            <Database className="size-3.5 text-primary" aria-hidden="true" />
            System of record: Customer
          </Badge>
        ) : undefined}
      />
      <CustomerProfileFloor snapshot={snapshot} defaultSubFloor="account" />
    </div>
  );
}
