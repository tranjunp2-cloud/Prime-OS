import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ChevronDown, Loader2, PartyPopper, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { fetchOnboardingStatus, updateOnboardingPreferences, type OnboardingStatus } from '@/lib/onboarding-api';
import { OnboardingChecklistDrawer } from './OnboardingChecklistDrawer';

const onboardingQueryKey = ['onboarding', 'status'];
const demoOnboardingStatus: OnboardingStatus = {
  total_steps: 4,
  completed_steps: 3,
  is_completed: false,
  is_collapsed: false,
  is_dismissed: false,
  celebration_active: false,
  celebration_expires_at: null,
  next_step: {
    key: 'connect_second_channel',
    title: 'Connect Lazada channel',
    description: 'Connect your Lazada channel to start syncing orders and inventory.',
    target_url: '/channels/lazada/connect',
    status: 'PENDING',
  },
  steps: [
    { key: 'create_warehouse', title: 'Set up a physical warehouse', description: 'Create the location that will hold and fulfill your inventory.', target_url: '/warehouses', status: 'COMPLETED' },
    { key: 'connect_first_channel', title: 'Connect your first sales channel', description: 'Connect Shopee to begin synchronizing commerce data.', target_url: '/sales-channels/connected-channels', status: 'COMPLETED' },
    { key: 'map_warehouse', title: 'Map a channel warehouse', description: 'Link the Shopee location to the physical warehouse that fulfills its orders.', target_url: '/warehouses?view=channel-mapping', status: 'COMPLETED' },
    { key: 'connect_second_channel', title: 'Connect Lazada channel', description: 'Connect your Lazada channel to start syncing orders and inventory.', target_url: '/channels/lazada/connect', status: 'PENDING' },
  ],
};
const confetti = Array.from({ length: 14 }, (_, index) => ({
  id: index,
  left: `${6 + ((index * 37) % 88)}%`,
  delay: `${(index % 7) * 90}ms`,
  color: ['bg-primary', 'bg-emerald-400', 'bg-amber-400', 'bg-rose-400'][index % 4],
}));

export function InitialSetupBanner() {
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dismissDialogOpen, setDismissDialogOpen] = useState(false);
  const { data } = useQuery({
    queryKey: onboardingQueryKey,
    queryFn: fetchOnboardingStatus,
    placeholderData: demoOnboardingStatus,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
  const onboarding = data ?? demoOnboardingStatus;
  const preferenceMutation = useMutation({
    mutationFn: updateOnboardingPreferences,
    onSuccess: (_preferences, variables) => {
      queryClient.setQueryData<OnboardingStatus>(onboardingQueryKey, (current) => current ? { ...current, ...variables } : current);
      void queryClient.invalidateQueries({ queryKey: onboardingQueryKey });
    },
  });

  const updatePreference = (preferences: Parameters<typeof updateOnboardingPreferences>[0]) => {
    preferenceMutation.mutate(preferences);
  };
  const progress = onboarding.total_steps > 0
    ? Math.round((onboarding.completed_steps / onboarding.total_steps) * 100)
    : 0;

  if (onboarding.is_completed) {
    if (!onboarding.celebration_active || onboarding.is_dismissed) return null;
    return (
      <section className="relative isolate overflow-hidden rounded-xl border border-primary/25 bg-card shadow-sm" aria-labelledby="onboarding-celebration-title">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          {confetti.map((piece) => <span key={piece.id} className={`onboarding-confetti-piece absolute top-0 size-2 rounded-sm ${piece.color}`} style={{ left: piece.left, animationDelay: piece.delay }} />)}
        </div>
        <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><PartyPopper className="size-5" /></span>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">Setup complete</div>
            <h2 id="onboarding-celebration-title" className="mt-1 text-lg font-semibold text-foreground">Prime OS is ready for omnichannel operations</h2>
            <p className="mt-1 text-sm text-muted-foreground">Your warehouse, sales channels, and fulfillment mapping are connected.</p>
          </div>
          <Button asChild className="min-h-11 shrink-0" onClick={() => updatePreference({ is_dismissed: true })}>
            <Link to="/home">Explore Dashboard</Link>
          </Button>
        </div>
      </section>
    );
  }

  if (onboarding.is_dismissed) return null;

  const nextStepLabel = onboarding.next_step?.title || 'Review setup checklist';

  return (
    <>
      {onboarding.is_collapsed ? (
        <section className="flex h-12 items-center gap-3 overflow-hidden rounded-xl border bg-card px-4 shadow-sm" aria-label="Initial setup progress">
          <CheckCircle2 className="size-4 shrink-0 text-primary" aria-hidden="true" />
          <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Initial Setup ({onboarding.completed_steps}/{onboarding.total_steps})</span>
            <span className="mx-2" aria-hidden="true">•</span>
            Next: {nextStepLabel}
          </p>
          <Button variant="ghost" size="sm" className="hidden shrink-0 sm:inline-flex" onClick={() => setDrawerOpen(true)}>Resume Setup</Button>
          <button type="button" onClick={() => updatePreference({ is_collapsed: false })} disabled={preferenceMutation.isPending} className="grid size-11 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50" aria-label="Expand initial setup">
            {preferenceMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <ChevronDown className="size-4" />}
          </button>
        </section>
      ) : (
        <section className="relative overflow-hidden rounded-xl border bg-card shadow-sm" aria-labelledby="initial-setup-title">
          <div className="flex items-start gap-4 p-5 pr-14 sm:pr-16">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><CheckCircle2 className="size-5" aria-hidden="true" /></span>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">Onboarding</div>
              <h2 id="initial-setup-title" className="mt-1 text-lg font-semibold text-foreground">Initial setup</h2>
              <p className="mt-1 text-sm font-medium text-muted-foreground">
                {onboarding.completed_steps} of {onboarding.total_steps} steps completed. {onboarding.next_step?.description}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button size="sm" className="min-h-10" onClick={() => setDrawerOpen(true)}>Complete setup</Button>
                <Button variant="ghost" size="sm" className="min-h-10" disabled={preferenceMutation.isPending} onClick={() => updatePreference({ is_collapsed: true })}>
                  {preferenceMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Collapse
                </Button>
              </div>
            </div>
          </div>
          <button type="button" onClick={() => setDismissDialogOpen(true)} className="absolute right-2 top-2 grid size-11 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label="Dismiss onboarding"><X className="size-4" /></button>
          <Progress value={progress} className="h-1.5 rounded-none" aria-label={`Initial setup ${progress}% complete`} />
        </section>
      )}

      <OnboardingChecklistDrawer open={drawerOpen} onOpenChange={setDrawerOpen} onboarding={onboarding} />
      <AlertDialog open={dismissDialogOpen} onOpenChange={setDismissDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dismiss initial setup guidance?</AlertDialogTitle>
            <AlertDialogDescription>
              The checklist will be hidden from Home. Your existing setup and connected data will not be changed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep guidance</AlertDialogCancel>
            <AlertDialogAction onClick={() => updatePreference({ is_dismissed: true })}>Dismiss guidance</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
