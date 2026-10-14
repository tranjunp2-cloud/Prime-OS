import { ArrowRight, Check, Circle, Loader2, TriangleAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { SalesSetupStatus } from '@/lib/sales-setup';

interface Props { open: boolean; onOpenChange: (open: boolean) => void; onboarding: SalesSetupStatus }

export function OnboardingChecklistDrawer({ open, onOpenChange, onboarding }: Props) {
  return <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="right" className="flex w-full flex-col overflow-hidden p-0 sm:max-w-[520px]">
      <SheetHeader className="border-b px-6 py-5 pr-14 text-left">
        <SheetTitle>Sales setup</SheetTitle>
        <SheetDescription>{onboarding.intent === 'later' ? 'Start with the option that suits your business. You can explore first and set up later.' : onboarding.intent === 'manual' ? 'Build your catalog at your pace. A sales channel is optional.' : 'These tasks follow your chosen way of getting started. One sales channel is enough.'}</SheetDescription>
        {onboarding.steps.length > 0 && <p className="text-sm text-muted-foreground">{onboarding.completed} of {onboarding.steps.length} completed · Updates as you save</p>}
      </SheetHeader>
      <div className="flex-1 overflow-y-auto p-6">
        {onboarding.steps.length ? <ol className="space-y-3" aria-label="Sales setup steps">
          {onboarding.steps.map(step => {
            const complete = step.status === 'complete';
            const Icon = complete ? Check : step.status === 'running' ? Loader2 : step.status === 'attention' ? TriangleAlert : Circle;
            return <li key={step.key} className="flex gap-3 rounded-xl border p-4">
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-muted text-foreground"><Icon className={`size-4 ${step.status === 'running' ? 'animate-spin motion-reduce:animate-none' : ''}`} aria-hidden="true" /></span>
              <div className="min-w-0 flex-1"><h3 className="text-sm font-semibold">{step.title}</h3>
                <p className="mt-1 text-xs font-medium text-muted-foreground">{{ complete: 'Completed', pending: 'To do', running: 'In progress', attention: 'Needs attention' }[step.status]}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.description}</p>
                <SheetClose asChild><Button asChild variant="outline" className="mt-3 min-h-11"><Link to={step.target_url}>{complete ? 'Review' : step.action}<ArrowRight className="size-4" aria-hidden="true" /></Link></Button></SheetClose>
              </div>
            </li>;
          })}
        </ol> : <div className="space-y-3">{[
          { title: 'Build your own catalog', description: 'Create your first product. A connected shop is optional.', label: 'Add product', to: '/products/new' },
          { title: 'Bring an existing shop', description: 'Connect a sales channel and check its first sync.', label: 'Connect channel', to: '/sales-channels/connected-channels' },
          { title: 'Manage your stock', description: 'Add a warehouse when you are ready to track inventory.', label: 'Set up warehouse', to: '/warehouses' },
        ].map(option => <div key={option.to} className="rounded-xl border p-4"><h3 className="text-sm font-semibold">{option.title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{option.description}</p><SheetClose asChild><Button asChild variant="outline" className="mt-3 min-h-11"><Link to={option.to}>{option.label}<ArrowRight className="size-4" aria-hidden="true" /></Link></Button></SheetClose></div>)}</div>}
      </div>
      <p className="border-t px-6 py-4 text-xs leading-5 text-muted-foreground">Choosing an option in your workspace details does not complete a sales task. You can manage this guidance in Settings → General &amp; Business.</p>
    </SheetContent>
  </Sheet>;
}
