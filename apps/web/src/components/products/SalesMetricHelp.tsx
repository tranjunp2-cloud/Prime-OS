import { useRef, useState } from 'react';
import { Info, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/** Hover/focus explains a label; click/tap pins the same explanation. */
export function SalesMetricHelp({ label, description }: { label: string; description: string }) {
  const [pinned, setPinned] = useState(false);
  const [preview, setPreview] = useState(false);
  const returningFocus = useRef(false);
  const contentClass = 'w-80 max-w-[calc(100vw-2rem)] p-3 text-left text-xs font-normal leading-5 motion-reduce:animate-none';
  return <Popover open={pinned} onOpenChange={next => { setPinned(next); setPreview(false); }}>
    <Tooltip open={preview && !pinned} onOpenChange={next => setPreview(next && !returningFocus.current)}>
      <PopoverTrigger asChild><TooltipTrigger asChild>
        <button type="button" className="inline-flex max-w-full cursor-help items-center gap-1.5 rounded text-left align-middle transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none [@media(pointer:coarse)]:min-h-11"
          onPointerEnter={() => { returningFocus.current = false; }} onBlur={() => { returningFocus.current = false; }}>
          <span>{label}</span><Info aria-hidden="true" className="size-3 shrink-0 text-muted-foreground" />
        </button>
      </TooltipTrigger></PopoverTrigger>
      {!pinned && <TooltipContent side="top" align="center" sideOffset={8} className={contentClass}>
        <p className="mb-1 font-semibold">{label}</p><p>{description}</p>
      </TooltipContent>}
    </Tooltip>
    <PopoverContent side="top" align="center" sideOffset={8} collisionPadding={12} aria-label={`${label} explained`} className={contentClass}
      onCloseAutoFocus={() => { returningFocus.current = true; }}>
      <div className="mb-1 flex items-center justify-between gap-3"><p className="font-semibold">{label}</p><button type="button" aria-label={`Close ${label} help`} onClick={() => setPinned(false)} className="relative -mr-1 grid size-7 shrink-0 place-items-center rounded hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring after:absolute after:-inset-2"><X aria-hidden="true" className="size-4" /></button></div>
      <p>{description}</p>
    </PopoverContent>
  </Popover>;
}
