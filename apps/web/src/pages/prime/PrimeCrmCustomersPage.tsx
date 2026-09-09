import { useMemo } from 'react';
import { Database, UsersRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CustomerProfileFloor } from '@/components/prime/customer-profile/CustomerProfileFloor';
import { getPrimeSnapshot } from '@/lib/prime/prime-data';

export function PrimeCrmCustomersPage() {
  const snapshot = useMemo(() => getPrimeSnapshot(), []);

  return (
    <div className="min-h-full bg-background p-4 pb-16 md:p-6" data-testid="crm-customer-directory">
      <div className="space-y-5">
        <header className="flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl border bg-card text-primary shadow-sm">
              <UsersRound className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                Manage customer records, contact details, ownership, lifecycle, segments, and identity quality across every connected channel.
              </p>
            </div>
          </div>

          <Badge variant="outline" className="h-8 w-fit gap-2 whitespace-nowrap px-3 font-medium">
            <Database className="size-3.5 text-primary" aria-hidden="true" />
            System of record: Customer
          </Badge>
        </header>

        <CustomerProfileFloor snapshot={snapshot} defaultSubFloor="account" />
      </div>
    </div>
  );
}
