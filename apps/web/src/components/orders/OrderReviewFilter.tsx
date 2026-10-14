import { Check, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export function OrderReviewFilter({ count, active, loaded, onChange }: {
  count: number;
  active: boolean;
  loaded: boolean;
  onChange: (active: boolean) => void;
}) {
  return <TooltipProvider delayDuration={150}><Tooltip>
    <TooltipTrigger asChild><Button type="button" size="sm" variant="outline" aria-pressed={active} onClick={() => onChange(!active)} className={cn('shrink-0 gap-1.5 px-2.5', active && 'border-amber-500/50 bg-amber-500/10 text-amber-700 hover:bg-amber-500/15 hover:text-amber-700 dark:text-amber-300 dark:hover:text-amber-300')}>
      <span aria-hidden="true" className={cn('flex size-3.5 shrink-0 items-center justify-center rounded-sm border', active ? 'border-current bg-amber-500/20' : 'border-muted-foreground/60')}>{active && <Check className="size-3" />}</span>
      Needs review <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-xs tabular-nums text-amber-700 dark:text-amber-300">{loaded ? count : '—'}</span><Info aria-hidden="true" className="size-3.5 shrink-0" />
    </Button></TooltipTrigger>
    <TooltipContent side="bottom" align="start" className="w-80 max-w-[calc(100vw-1.5rem)] space-y-2 whitespace-normal p-3 text-xs leading-relaxed">
      <p>Orders needing attention: payment verification, stock issues, holds, overdue processing or pickup, failed deliveries, sync errors, or unresolved issues.</p>
      <p>Some warnings only flag urgency. Blocking issues must be resolved before the affected action can continue.</p>
      <p className="text-muted-foreground">Each order is counted once within the current status tab. Turn this filter on or off to combine it with the selected stage and other filters.</p>
    </TooltipContent>
  </Tooltip></TooltipProvider>;
}
