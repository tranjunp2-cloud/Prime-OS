import { Check, Circle, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { OnboardingStatus } from '@/lib/onboarding-api';

interface OnboardingChecklistDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onboarding: OnboardingStatus;
}

export function OnboardingChecklistDrawer({ open, onOpenChange, onboarding }: OnboardingChecklistDrawerProps) {
  const progress = onboarding.total_steps > 0
    ? Math.round((onboarding.completed_steps / onboarding.total_steps) * 100)
    : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col overflow-hidden p-0 sm:max-w-[600px]">
        <SheetHeader className="border-b px-6 py-5 pr-14">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Onboarding checklist</div>
          <SheetTitle>Finish setting up Prime OS</SheetTitle>
          <SheetDescription>
            Complete these foundations once, then manage every connected sales channel from one workspace.
          </SheetDescription>
          <div className="pt-2">
            <div className="mb-2 flex items-center justify-between text-xs font-medium">
              <span>{onboarding.completed_steps} of {onboarding.total_steps} completed</span>
              <span className="text-primary">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" aria-label={`Onboarding ${progress}% complete`} />
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <ol className="space-y-3" aria-label="Initial setup steps">
            {onboarding.steps.map((step, index) => {
              const completed = step.status === 'COMPLETED';
              return (
                <li key={step.key} className="relative flex gap-4 rounded-xl border bg-card p-4 shadow-sm">
                  {index < onboarding.steps.length - 1 ? <span className="absolute left-[31px] top-12 h-[calc(100%-32px)] w-px bg-border" aria-hidden="true" /> : null}
                  <span className={completed
                    ? 'relative z-10 grid size-8 shrink-0 place-items-center rounded-full bg-emerald-500 text-white'
                    : 'relative z-10 grid size-8 shrink-0 place-items-center rounded-full border-2 border-primary bg-primary/10 text-primary'}>
                    {completed ? <Check className="size-4" aria-hidden="true" /> : <Circle className="size-3 fill-current" aria-hidden="true" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
                      <span className={completed
                        ? 'rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-300'
                        : 'rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300'}>
                        {completed ? 'Completed' : 'Pending'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.description}</p>
                    <SheetClose asChild>
                      <Button asChild variant={completed ? 'ghost' : 'outline'} size="sm" className="mt-3 min-h-9">
                        <Link to={step.target_url}>
                          {completed ? 'Review setup' : 'Complete step'}
                          <ExternalLink className="size-3.5" aria-hidden="true" />
                        </Link>
                      </Button>
                    </SheetClose>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="border-t bg-muted/30 px-6 py-4">
          <p className="text-xs leading-5 text-muted-foreground">
            Progress updates automatically when warehouses, channel connections, or mappings change.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
