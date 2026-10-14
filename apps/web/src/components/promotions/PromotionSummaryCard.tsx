import { useEffect, useRef } from 'react';
import { Info, type LucideIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export function PromotionSummaryCard({ label, value, description, icon: Icon, tone, open, onOpenChange }: {
  label: string;
  value: string;
  description: string;
  icon: LucideIcon;
  tone: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const pinned = useRef(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (!open) pinned.current = false; }, [open]);
  const close = () => { pinned.current = false; onOpenChange(false); };
  return <Tooltip open={open} onOpenChange={next => { if (next || !pinned.current) onOpenChange(next); }}>
    <TooltipTrigger asChild>
      <button
        type="button"
        ref={triggerRef}
        aria-label={`About ${label}: ${value}`}
        onClick={() => { if (pinned.current) close(); else { pinned.current = true; onOpenChange(true); } }}
        onBlur={close}
        className="min-w-0 rounded-lg border bg-card px-4 py-3 text-left text-card-foreground transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
      >
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Icon className={cn('size-3.5 shrink-0', tone)} aria-hidden="true" />
          <span className="min-w-0 [overflow-wrap:anywhere]">{label}</span><Info className="size-3.5 shrink-0" aria-hidden="true" />
        </span>
        <span className="mt-1 block text-lg font-semibold leading-7 tracking-tight tabular-nums [overflow-wrap:anywhere] 2xl:text-xl">{value}</span>
      </button>
    </TooltipTrigger>
    <TooltipContent
      side="bottom"
      align="start"
      onEscapeKeyDown={close}
      onPointerDownOutside={event => { if (!triggerRef.current?.contains(event.target as Node)) close(); }}
      className="w-72 max-w-[calc(100vw-2rem)] p-3 leading-relaxed motion-reduce:animate-none"
    >
      <p className="font-semibold">{label}</p>
      <p className="mt-1">{description}</p>
      <p className="mt-2 border-t pt-2 text-xs text-muted-foreground">Across all channels. List filters do not change this summary.</p>
    </TooltipContent>
  </Tooltip>;
}
