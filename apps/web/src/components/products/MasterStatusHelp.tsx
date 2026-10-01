import { useRef, useState } from 'react';
import { Info, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

function StatusDefinitions() {
  return <dl className="space-y-3 text-left text-sm font-normal normal-case leading-5 tracking-normal">
    <div><dt className="font-semibold text-foreground">Draft</dt><dd className="mt-0.5 text-muted-foreground">Not published yet. Data may be incomplete, or complete and waiting for you to publish. A linked listing can already be live on a channel.</dd></div>
    <div><dt className="font-semibold text-foreground">Active</dt><dd className="mt-0.5 text-muted-foreground">Published in Product Master and available for listings. This does not mean it is live on a sales channel.</dd></div>
    <div><dt className="font-semibold text-foreground">Archived</dt><dd className="mt-0.5 text-muted-foreground">Stored away. Restore to edit or publish. Existing channel listings are not automatically removed.</dd></div>
  </dl>;
}

/** Hover/focus provides a quick explanation; click/tap pins the same help open. */
export function MasterStatusHelp() {
  const [open, setOpen] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const returningFocus = useRef(false);
  const contentClass = 'w-80 max-w-[calc(100vw-2rem)] p-4 motion-reduce:animate-none';

  return <Popover open={open} onOpenChange={next => { setOpen(next); setTooltipOpen(false); }}>
    <Tooltip open={tooltipOpen && !open} onOpenChange={next => setTooltipOpen(next && !returningFocus.current)} delayDuration={200}>
      <PopoverTrigger asChild>
        <TooltipTrigger asChild>
          <button type="button" aria-label="About Master status"
            onPointerEnter={() => { returningFocus.current = false; }}
            onBlur={() => { returningFocus.current = false; }}
            className="relative grid size-6 shrink-0 cursor-pointer place-items-center rounded text-muted-foreground transition-colors after:absolute after:-inset-2.5 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Info className="size-3.5" aria-hidden="true" />
          </button>
        </TooltipTrigger>
      </PopoverTrigger>
      {!open && <TooltipContent side="bottom" align="start" className={contentClass}><StatusDefinitions /></TooltipContent>}
    </Tooltip>
    <PopoverContent side="bottom" align="start" collisionPadding={16} aria-label="Master status explained" className={contentClass}
      onCloseAutoFocus={() => { returningFocus.current = true; }}>
      <div className="mb-3 flex items-center justify-between gap-3 border-b border-border pb-2">
        <p className="text-sm font-semibold normal-case tracking-normal text-foreground">Master status</p>
        <button type="button" aria-label="Close Master status help" onClick={() => setOpen(false)} className="relative grid size-7 shrink-0 place-items-center rounded text-muted-foreground after:absolute after:-inset-2 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><X className="size-4" aria-hidden="true" /></button>
      </div>
      <StatusDefinitions />
    </PopoverContent>
  </Popover>;
}
