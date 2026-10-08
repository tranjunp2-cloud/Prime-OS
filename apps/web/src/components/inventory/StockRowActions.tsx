import { useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

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
      <DropdownMenuContent align="end" onClick={event => event.stopPropagation()} onCloseAutoFocus={event => { if (openingDialog.current) event.preventDefault(); }}>
        {onReceive && <DropdownMenuItem onSelect={() => select(onReceive)}>Receive stock</DropdownMenuItem>}
        {onAdjust && <DropdownMenuItem onSelect={() => select(onAdjust)}>Adjust stock</DropdownMenuItem>}
        {onInitialize && <DropdownMenuItem onSelect={() => select(onInitialize)}>Record opening stock</DropdownMenuItem>}
        {onSetup && <DropdownMenuItem onSelect={() => select(onSetup)}>Set up availability</DropdownMenuItem>}
        {onTransfer && <DropdownMenuItem onSelect={() => select(onTransfer)}>Transfer stock</DropdownMenuItem>}
        {onManage && <DropdownMenuItem onSelect={() => select(onManage)}>Manage holds</DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu> : <span className="text-xs text-muted-foreground">{readOnly ? 'Read only' : 'No actions'}</span>}
  </td>;
}
