import { useState, type ReactNode } from 'react';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/** Help is available on hover, keyboard focus, and touch. */
export function ProductFieldHelp({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return <TooltipProvider delayDuration={150}><Tooltip open={open} onOpenChange={setOpen}>
    <TooltipTrigger asChild><button type="button" aria-label={label} onClick={event => { event.preventDefault(); setOpen(!open); }} className="inline-grid size-11 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Info className="size-4" aria-hidden="true" /></button></TooltipTrigger>
    <TooltipContent className="max-w-72 text-xs leading-5 motion-reduce:animate-none">{children}</TooltipContent>
  </Tooltip></TooltipProvider>;
}
