import { ChevronDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { OrderQueue } from '@/lib/order-work-queues';
import './order-navigation.css';

export function OrderNavigation({ items, value, loaded, onChange }: {
  items: { key: OrderQueue; label: string; count: number }[];
  value: OrderQueue;
  loaded: boolean;
  onChange: (value: OrderQueue) => void;
}) {
  const extra = items.slice(6);
  const selectedExtra = extra.find(item => item.key === value);
  const buttonClass = (active: boolean) => cn('relative inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap px-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2', active ? 'text-primary after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-primary' : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground');
  return <div className="order-navigation">
    <nav aria-label="Order lifecycle" className="order-navigation__tabs border-b border-border">
      {items.map((item, index) => <button key={item.key} type="button" onClick={() => onChange(item.key)} aria-current={value === item.key ? 'page' : undefined} className={cn(buttonClass(value === item.key), index >= 6 && 'order-navigation__extra')}>
        {item.label}{' '}<span className="text-xs tabular-nums">{loaded ? item.count : '—'}</span>
      </button>)}
      <DropdownMenu><DropdownMenuTrigger asChild><button type="button" className={cn(buttonClass(Boolean(selectedExtra)), 'order-navigation__more')} aria-label={selectedExtra ? `More statuses: ${selectedExtra.label}` : 'More order statuses'}>{selectedExtra?.label || 'More'}{selectedExtra && <span className="text-xs tabular-nums">{loaded ? selectedExtra.count : '—'}</span>}<ChevronDown className="size-4" /></button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuRadioGroup value={value} onValueChange={next => onChange(next as OrderQueue)}>{extra.map(item => <DropdownMenuRadioItem key={item.key} value={item.key}>{item.label}{' '}<span className="ml-3 text-xs tabular-nums">{loaded ? item.count : '—'}</span></DropdownMenuRadioItem>)}</DropdownMenuRadioGroup></DropdownMenuContent></DropdownMenu>
    </nav>
    <label className="order-navigation__select items-center gap-3 text-sm font-medium">Order status
      <select aria-label="Order status view" value={value} onChange={event => onChange(event.target.value as OrderQueue)} className="h-11 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
        {value === 'draft' && <option value="draft">Drafts</option>}
        {items.map(item => <option key={item.key} value={item.key}>{item.label} ({loaded ? item.count : '—'})</option>)}
      </select>
    </label>
  </div>;
}
