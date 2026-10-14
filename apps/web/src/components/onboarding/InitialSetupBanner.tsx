import { useState } from 'react';
import { ArrowRight, CheckCircle2, ListChecks, Loader2, MoreHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useSalesSetup, useSalesSetupPreferences } from '@/hooks/use-sales-setup';
import { firstIncompleteStep } from '@/components/seller-onboarding/demo-state';
import { OnboardingChecklistDrawer } from './OnboardingChecklistDrawer';

export function InitialSetupBanner() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { data, setup, isPending, isError, isFetching, refetch } = useSalesSetup();
  const { preferences, update, error } = useSalesSetupPreferences();
  if (preferences.hidden) return null;
  const collapsed = preferences.collapsed;
  const complete = !isError && data?.complete;
  const next = data?.next;
  const profileStep = firstIncompleteStep(setup);
  const profileHref = profileStep < 0 ? '/demo/no-data' : `/demo/no-data?step=${profileStep + 1}`;

  return <>
    <section className="relative rounded-xl border border-border bg-card p-4 shadow-sm sm:px-5" aria-labelledby="sales-setup-title">
      <div className="flex items-start gap-3">
        <span className="mt-1 hidden size-10 shrink-0 place-items-center sm:grid rounded-lg bg-primary/10 text-primary" aria-hidden="true">
          {complete ? <CheckCircle2 className="size-5" /> : <ListChecks className="size-5" />}
        </span>
        <div className="grid min-w-0 flex-1 gap-x-5 gap-y-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:pr-12">
          <div>
          <div className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 pr-10 lg:min-h-8 lg:pr-0">
            <h2 id="sales-setup-title" className="text-base font-semibold">Sales setup</h2>
            {!isPending && !isError && data && <span className="text-xs text-muted-foreground">{complete ? 'Complete' : data.steps.length ? `${data.completed} of ${data.steps.length} completed` : 'At your pace'}</span>}
          </div>
          {isPending ? <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin motion-reduce:animate-none" />Checking your setup…</p>
            : isError ? <div role="alert" className="flex flex-wrap items-center gap-3"><p className="text-sm text-muted-foreground">We couldn’t check your setup. Your progress is unchanged.</p><Button variant="outline" className="min-h-11" disabled={isFetching} onClick={() => void refetch()}>{isFetching ? 'Checking…' : 'Try again'}</Button></div>
              : data ? <>
                {!collapsed && <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{complete ? 'Your selected sales setup is complete. You can add more channels whenever you need them.' : next?.description ?? 'Set up your catalog or connect a shop whenever you’re ready.'}</p>}
              </> : null}
          </div>
          {!isPending && !isError && data && <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            {next ? <Button asChild variant={collapsed ? 'outline' : 'default'} className="min-h-11 max-w-full whitespace-normal text-left">
              <Link to={next.target_url}>{next.action}<ArrowRight className="size-4 shrink-0" aria-hidden="true" /></Link>
            </Button> : <Button variant="outline" className="min-h-11" onClick={() => setDrawerOpen(true)}>{complete ? 'Review setup' : 'Get started'}<ArrowRight className="size-4" aria-hidden="true" /></Button>}
            {!collapsed && next?.status === 'running' && <span role="status" className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />Sync in progress</span>}
          </div>}
        </div>
        <div className="absolute right-2 top-4 flex shrink-0">
          <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-11 text-muted-foreground" aria-label="Sales setup options"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!isPending && !isError && next && <DropdownMenuItem className="min-h-11" onSelect={() => setDrawerOpen(true)}>View steps</DropdownMenuItem>}
              <DropdownMenuItem asChild className="min-h-11"><Link to={profileHref}>{profileStep < 0 ? 'Review workspace details' : 'Continue workspace details'}</Link></DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="min-h-11" onSelect={() => update({ collapsed: !collapsed })}>{collapsed ? 'Expand sales setup' : 'Collapse sales setup'}</DropdownMenuItem>
              <DropdownMenuItem className="min-h-11" onSelect={() => update({ hidden: true })}>Hide from Home</DropdownMenuItem>
              <DropdownMenuItem asChild className="min-h-11"><Link to="/settings/general#sales-setup">Guidance settings</Link></DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
    </section>
    {data && <OnboardingChecklistDrawer open={drawerOpen} onOpenChange={setDrawerOpen} onboarding={data} />}
  </>;
}
