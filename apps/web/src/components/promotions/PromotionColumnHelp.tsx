import { useEffect, useRef } from 'react';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const explanations = {
  'Discount Type': {
    description: 'How the promotion gives a discount.',
    items: [
      ['Fixed', 'Subtracts a set amount, e.g. ₫200,000 off.'],
      ['Percentage', 'Reduces the eligible amount by a percentage, e.g. 15% off. A maximum discount may apply.'],
      ['Buy X Get Y', 'Buy the required quantity to receive a reward, e.g. buy 2, get 1 free.'],
    ],
    note: 'The exact offer is shown below the promotion name.',
  },
  Status: {
    description: 'Whether customers can currently use the promotion.',
    items: [
      ['Active', 'Enabled for use on eligible purchases.'],
      ['Scheduled', 'Not available yet; waiting for its start date.'],
      ['Paused', 'Temporarily disabled. Resume it while the promotion is still valid.'],
      ['Expired', 'The promotion has ended and can no longer be used.'],
    ],
    note: 'Usage limits and eligibility rules still apply.',
  },
} as const;

export function PromotionColumnHelp({ title, open, onOpenChange }: {
  title: keyof typeof explanations;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const help = explanations[title];
  const pinned = useRef(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (!open) pinned.current = false; }, [open]);
  const close = () => { pinned.current = false; onOpenChange(false); };

  return <TooltipProvider delayDuration={200}>
    <Tooltip open={open} onOpenChange={next => { if (next || !pinned.current) onOpenChange(next); }}>
      <TooltipTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          aria-label={`About ${title}`}
          onClick={() => { if (pinned.current) close(); else { pinned.current = true; onOpenChange(true); } }}
          onBlur={close}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-sm text-left font-semibold uppercase tracking-[0.08em] transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
        >
          {title}<Info aria-hidden="true" className="size-3.5 shrink-0" />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="start"
        onEscapeKeyDown={close}
        onPointerDownOutside={event => { if (!triggerRef.current?.contains(event.target as Node)) close(); }}
        className="w-80 max-w-[calc(100vw-2rem)] p-3 text-left text-xs font-normal normal-case leading-relaxed tracking-normal motion-reduce:animate-none"
      >
        <p className="font-semibold">{title}</p>
        <p className="mt-1">{help.description}</p>
        <dl className="mt-2 space-y-2">
          {help.items.map(([label, description]) => <div key={label}>
            <dt className="inline font-semibold">{label}: </dt>
            <dd className="inline">{description}</dd>
          </div>)}
        </dl>
        <p className="mt-2 border-t pt-2 text-muted-foreground">{help.note}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>;
}
