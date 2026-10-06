import { useRef, useState } from 'react';
import { Info, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type WorkspaceScope = 'master' | 'listings';
const WORKSPACE_HELP = {
  master: {
    label: 'Product Master',
    title: 'One product, shared across shops',
    description: 'Set up product details, images, variants, base price and warehouse stock in one place. Reuse this shared data across your shop listings.',
    note: 'You can create a Master without a shop. Activating it does not publish a listing.',
  },
  listings: {
    label: 'Shop listings',
    title: 'Manage this product in each shop',
    description: 'Link shop listings to this Master, then manage each shop’s content, price, SKU mapping and sync settings.',
    note: 'A linked listing is not necessarily live. Publishing is handled separately for each shop.',
  },
} satisfies Record<WorkspaceScope, { label: string; title: string; description: string; note: string }>;

/** Match MasterStatusHelp: hover/focus previews; click/tap pins accessible help open. */
export function ProductWorkspaceHelp({ scope }: { scope: WorkspaceScope }) {
  const help = WORKSPACE_HELP[scope];
  const [open, setOpen] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const returningFocus = useRef(false);
  const contentClass = 'w-80 max-w-[calc(100vw-2rem)] p-4 text-left text-sm font-normal normal-case leading-5 tracking-normal motion-reduce:animate-none';
  const body = <div className="space-y-3">
    <p className="text-popover-foreground">{help.description}</p>
    <p className="border-t border-border pt-3 text-xs leading-5 text-muted-foreground">{help.note}</p>
  </div>;

  return <TooltipProvider delayDuration={200}>
    <Popover open={open} onOpenChange={next => { setOpen(next); setTooltipOpen(false); }}>
      <Tooltip open={tooltipOpen && !open} onOpenChange={next => setTooltipOpen(next && !returningFocus.current)}>
        <PopoverTrigger asChild><TooltipTrigger asChild>
          <button type="button" aria-label={`About ${help.label}`}
            onPointerEnter={() => { returningFocus.current = false; }}
            onBlur={() => { returningFocus.current = false; }}
            className="relative grid size-6 shrink-0 cursor-pointer place-items-center rounded text-muted-foreground transition-colors after:absolute after:-inset-2.5 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Info className="size-3.5" aria-hidden="true" />
          </button>
        </TooltipTrigger></PopoverTrigger>
        {!open && <TooltipContent side="right" align="start" sideOffset={12} className={contentClass}>
          <p className="mb-2 font-semibold text-popover-foreground">{help.title}</p>{body}
        </TooltipContent>}
      </Tooltip>
      <PopoverContent side="right" align="start" sideOffset={12} collisionPadding={16} aria-label={`${help.label} explained`} className={contentClass}
        onCloseAutoFocus={() => { returningFocus.current = true; }}>
        <div className="mb-2 flex items-start justify-between gap-3">
          <p className="font-semibold text-popover-foreground">{help.title}</p>
          <button type="button" aria-label={`Close ${help.label} help`} onClick={() => setOpen(false)}
            className="relative -mr-1 -mt-1 grid size-7 shrink-0 place-items-center rounded text-muted-foreground after:absolute after:-inset-2 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><X className="size-4" aria-hidden="true" /></button>
        </div>
        {body}
      </PopoverContent>
    </Popover>
  </TooltipProvider>;
}
