import { useEffect, useRef, useState } from 'react';
import { ChannelLogo } from '@/components/channels/ChannelLogo';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export type PromoChannel = 'POS' | 'WebStore' | 'Inbox';

const channelBrands = {
  POS: { key: 'primepos', label: 'PrimePOS' },
  WebStore: { key: 'primeweb', label: 'PrimeWeb' },
  Inbox: { key: 'primeinbox', label: 'Prime Inbox' },
} satisfies Record<PromoChannel, { key: string; label: string }>;

function ChannelTrigger({ channel, open, onOpenChange }: {
  channel: PromoChannel;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const brand = channelBrands[channel];
  const pinned = useRef(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (!open) pinned.current = false; }, [open]);
  const close = () => { pinned.current = false; onOpenChange(false); };

  return <Tooltip open={open} onOpenChange={next => { if (next || !pinned.current) onOpenChange(next); }}>
    <TooltipTrigger asChild>
      <button
        ref={triggerRef}
        type="button"
        aria-label={brand.label}
        onClick={() => { if (pinned.current) close(); else { pinned.current = true; onOpenChange(true); } }}
        onBlur={close}
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-border bg-background transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
      >
        <ChannelLogo channel={brand} />
      </button>
    </TooltipTrigger>
    <TooltipContent
      side="top"
      onEscapeKeyDown={close}
      onPointerDownOutside={event => { if (!triggerRef.current?.contains(event.target as Node)) close(); }}
      className="text-xs font-medium motion-reduce:animate-none"
    >
      {brand.label}
    </TooltipContent>
  </Tooltip>;
}

export function PromotionChannelLogos({ channels }: { channels: PromoChannel[] }) {
  const [activeChannel, setActiveChannel] = useState<PromoChannel | null>(null);
  return <TooltipProvider delayDuration={150}>
    <div className="flex items-center gap-1.5">
      {channels.map(channel => <ChannelTrigger
        key={channel}
        channel={channel}
        open={activeChannel === channel}
        onOpenChange={open => setActiveChannel(current => open ? channel : current === channel ? null : current)}
      />)}
    </div>
  </TooltipProvider>;
}
