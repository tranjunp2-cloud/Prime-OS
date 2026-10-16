import { useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

function StockActionItem({ label, description, onSelect }: { label: string; description: string; onSelect: () => void }) {
  return <Tooltip>
    <TooltipTrigger asChild><DropdownMenuItem onSelect={onSelect}>{label}</DropdownMenuItem></TooltipTrigger>
    <TooltipContent side="left" sideOffset={8} className="max-w-72 text-left text-xs leading-5 motion-reduce:animate-none">{description}</TooltipContent>
  </Tooltip>;
}

export function StockRowActions({ label, onAdjust, onInitialize, onManage, onTransfer, onReceive, onSetup, readOnly = true }: {
  label: string;
  onAdjust?: () => void;
  onInitialize?: () => void;
  onManage?: () => void;
  onTransfer?: () => void;
  onReceive?: () => void;
  onSetup?: () => void;
  readOnly?: boolean;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const openingDialog = useRef(false);
  const select = (action: () => void) => {
    openingDialog.current = true;
    trigger.current?.focus();
    action();
  };
  return <td className="sticky right-0 bg-card px-3 py-2 text-right">
    {onAdjust || onInitialize || onManage || onTransfer || onReceive || onSetup ? <DropdownMenu modal={false} onOpenChange={open => { if (open) openingDialog.current = false; }}>
      <DropdownMenuTrigger asChild><Button ref={trigger} variant="ghost" size="sm" className="h-9 gap-1 px-1 text-xs text-muted-foreground" aria-label={`Actions for ${label}`} onClick={event => event.stopPropagation()}>Actions<ChevronDown className="size-3.5" aria-hidden="true" /></Button></DropdownMenuTrigger>
      <TooltipProvider delayDuration={250}><DropdownMenuContent align="end" onClick={event => event.stopPropagation()} onCloseAutoFocus={event => { if (openingDialog.current) event.preventDefault(); }}>
        {onReceive && <StockActionItem label="Receive stock" description="Add newly received or returned units to the current stock. Enter only the quantity received: 20 in stock + 5 received = 25." onSelect={() => select(onReceive)} />}
        {onAdjust && <StockActionItem label="Adjust stock" description="Correct stock after a physical count and record the reason. Enter the actual total: if the system shows 20 but you count 18, enter 18." onSelect={() => select(onAdjust)} />}
        {onInitialize && <StockActionItem label="Record opening stock" description="Record the first verified count for this product at a warehouse, including 0 if empty. Use this before receiving or adjusting stock here." onSelect={() => select(onInitialize)} />}
        {onSetup && <StockActionItem label="Set up availability" description="Confirm that this recorded stock has no existing order holds or other holds so available-to-sell stock (ATP) can be calculated. The physical count stays the same." onSelect={() => select(onSetup)} />}
        {onTransfer && <StockActionItem label="Transfer stock" description="Move available units between warehouses. Stock leaves the source now and is added to the destination when receipt is confirmed. Held units cannot be transferred." onSelect={() => select(onTransfer)} />}
        {onManage && <StockActionItem label="Manage holds" description="Hold or release stock for safety, campaigns, or damaged goods. This changes Other holds and available-to-sell stock (ATP), while physical stock and order holds stay the same." onSelect={() => select(onManage)} />}
      </DropdownMenuContent></TooltipProvider>
    </DropdownMenu> : <span className="text-xs text-muted-foreground">{readOnly ? 'Read only' : 'No actions'}</span>}
  </td>;
}
