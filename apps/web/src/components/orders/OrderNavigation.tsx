import { cn } from '@/lib/utils';
import type { OrderQueue } from '@/lib/order-work-queues';
import './order-navigation.css';

export function OrderNavigation({ items, value, loaded, onChange }: {
  items: { key: OrderQueue; label: string; count: number }[];
  value: OrderQueue;
  loaded: boolean;
  onChange: (value: OrderQueue) => void;
}) {
  return <div className="order-navigation">
    <nav aria-label="Order lifecycle" className="order-navigation__tabs border-b border-border">
      {items.map(item => <button key={item.key} type="button" onClick={() => onChange(item.key)} aria-current={value === item.key ? 'page' : undefined} className={cn('order-navigation__tab relative inline-flex min-h-11 items-center gap-2 px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2', value === item.key ? 'font-medium text-primary after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-primary' : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground')}>
        <span>{item.label}</span>{' '}<span className={cn('shrink-0 rounded px-1.5 py-0.5 text-xs tabular-nums', value === item.key ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>{loaded ? item.count : '—'}</span>
      </button>)}
    </nav>
  </div>;
}
