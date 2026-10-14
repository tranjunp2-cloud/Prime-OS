import { useState } from 'react';
import { Store, UsersRound } from 'lucide-react';
import { ChannelLogo } from '@/components/channels/ChannelLogo';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { customerChannels, type CustomerChannel } from '@/lib/customer-channels';
import type { OrderRecord } from '@/lib/orders-api';

function ChannelShopTooltip({ channel }: { channel: CustomerChannel }) {
  const [open, setOpen] = useState(false);
  return <Tooltip open={open} onOpenChange={setOpen}>
    <TooltipTrigger asChild>
      <button
        type="button"
        aria-label={`${channel.label}: ${channel.shops.join(', ')}`}
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background hover:border-primary/40 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={event => { event.preventDefault(); setOpen(true); }}
      >
        {channel.key === 'primecrm' ? <UsersRound className="size-6 text-primary" aria-hidden="true" />
          : channel.key === 'unknown' ? <Store className="size-6 text-muted-foreground" aria-hidden="true" />
            : <ChannelLogo channel={channel} />}
      </button>
    </TooltipTrigger>
    <TooltipContent side="top" className="max-w-64 break-words px-3 py-2 motion-reduce:animate-none">
      <p className="mb-1 text-xs text-muted-foreground">{channel.label}</p>
      <ul className="space-y-1 font-medium">{channel.shops.map(shop => <li key={shop}>{shop}</li>)}</ul>
    </TooltipContent>
  </Tooltip>;
}

export function CustomerChannelLogos({ orders }: { orders: OrderRecord[] }) {
  return <TooltipProvider delayDuration={150}>
    <div className="flex flex-wrap items-center gap-1.5" aria-label="Customer sales channels">
      {customerChannels(orders).map(channel => <ChannelShopTooltip key={channel.key} channel={channel} />)}
    </div>
  </TooltipProvider>;
}
