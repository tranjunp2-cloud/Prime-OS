import { useRef, useState, type ReactNode } from 'react';
import { Info, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/** Secondary guidance is available on hover, keyboard focus, and click/tap. */
export function ListingReviewHelp({ label, children, caption }: { label: string; children: ReactNode; caption?: string }) {
  const [pinned, setPinned] = useState(false);
  const [preview, setPreview] = useState(false);
  const returningFocus = useRef(false);
  const contentClass = 'w-80 max-w-[calc(100vw-2rem)] break-words p-3 text-left text-xs font-normal leading-5 motion-reduce:animate-none';
  return <TooltipProvider delayDuration={200}><Popover open={pinned} onOpenChange={next => { setPinned(next); setPreview(false); }}>
    <Tooltip open={preview && !pinned} onOpenChange={next => setPreview(next && !returningFocus.current)}>
      <PopoverTrigger asChild><TooltipTrigger asChild>
        <button type="button" aria-label={`About ${label}`} className={`inline-flex min-h-8 max-w-full shrink-0 items-center gap-1 rounded text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [@media(pointer:coarse)]:min-h-11 ${caption ? 'text-left' : 'w-8 justify-center'}`}
          onPointerEnter={() => { returningFocus.current = false; }} onBlur={() => { returningFocus.current = false; }}>
          {caption && <span className="truncate">{caption}</span>}<Info aria-hidden="true" className="size-3.5 shrink-0" />
        </button>
      </TooltipTrigger></PopoverTrigger>
      {!pinned && <TooltipContent side="top" sideOffset={6} className={contentClass}><p className="mb-1 font-semibold">{label}</p>{children}</TooltipContent>}
    </Tooltip>
    <PopoverContent side="top" sideOffset={6} collisionPadding={12} aria-label={`${label} help`} className={contentClass} onCloseAutoFocus={() => { returningFocus.current = true; }}>
      <div className="mb-1 flex items-center justify-between gap-3"><p className="font-semibold">{label}</p><button type="button" aria-label={`Close ${label} help`} className="grid size-8 shrink-0 place-items-center rounded hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [@media(pointer:coarse)]:size-11" onClick={() => setPinned(false)}><X aria-hidden="true" className="size-4" /></button></div>
      {children}
    </PopoverContent>
  </Popover></TooltipProvider>;
}
