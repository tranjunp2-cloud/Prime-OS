import { useLayoutEffect, useRef, useState } from 'react';
import { BadgeCheck, ChevronDown, CircleX, ClipboardList, Clock3, FilePenLine, Package, PackageCheck, PackageOpen, RotateCcw, Truck } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { OrderQueue } from '@/lib/order-work-queues';
import './order-navigation.css';

type NavigationItem = { key: OrderQueue; label: string; count: number };

const icons = { all: ClipboardList, draft: FilePenLine, pending: Clock3, preparing: PackageOpen, pickup: Package, shipping: Truck, delivered: PackageCheck, completed: BadgeCheck, returns: RotateCcw, cancelled: CircleX };
const tabClassName = 'order-navigation__tab relative inline-flex min-h-11 items-center gap-2 px-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2';
const activeClassName = 'bg-primary/5 text-primary after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-primary';

function StatusLabel({ item, loaded, active }: { item: NavigationItem; loaded: boolean; active: boolean }) {
  const Icon = icons[item.key];
  return <>
    <Icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} />
    <span className="min-w-0 truncate">{item.label}</span>{' '}
    <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-xs tabular-nums', active ? 'bg-primary font-semibold text-primary-foreground' : 'bg-muted text-muted-foreground')}>{loaded ? item.count : '—'}</span>
  </>;
}

export function OrderNavigation({ items, value, loaded, onChange }: {
  items: NavigationItem[];
  value: OrderQueue;
  loaded: boolean;
  onChange: (value: OrderQueue) => void;
}) {
  const navigation = useRef<HTMLElement>(null);
  const measurements = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(items.length);
  const selected = items.find(item => item.key === value);

  useLayoutEffect(() => {
    const nav = navigation.current;
    const row = measurements.current;
    if (!nav || !row) return;
    const measure = () => {
      const available = nav.getBoundingClientRect().width;
      const widths = Array.from(row.querySelectorAll<HTMLElement>('[data-status-width]'), element => element.getBoundingClientRect().width);
      // Keep all tabs until a real layout is available (including SSR/test environments).
      if (!available || !widths.length || widths.some(width => !width)) return;
      const gap = parseFloat(getComputedStyle(nav).columnGap) || 0;
      const total = widths.reduce((sum, width) => sum + width, 0) + gap * (widths.length - 1);
      if (total <= available) { setVisibleCount(items.length); return; }

      const fit = (triggerWidth: number) => {
        // Keep All accessible on small screens; the selected trigger label can truncate.
        const roomForFirst = available >= widths[0] + gap + 64;
        const reserved = Math.min(triggerWidth, roomForFirst ? available - widths[0] - gap : available);
        let used = reserved;
        let count = 0;
        for (const width of widths) {
          if (used + gap + width > available) break;
          used += gap + width;
          count++;
        }
        return count;
      };
      const moreWidth = row.querySelector<HTMLElement>('[data-more-width]')!.getBoundingClientRect().width;
      let count = fit(moreWidth);
      const selectedIndex = items.findIndex(item => item.key === value);
      if (selectedIndex >= count) {
        const selectedWidth = row.querySelector<HTMLElement>('[data-selected-width]')!.getBoundingClientRect().width;
        count = fit(Math.max(moreWidth, selectedWidth));
      }
      setVisibleCount(count);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    // Font loading, count changes and zoom can change intrinsic tab widths as well.
    Array.from(row.children).forEach(element => observer.observe(element));
    return () => observer.disconnect();
  }, [items, loaded, value]);

  const visible = items.slice(0, visibleCount);
  const overflow = items.slice(visibleCount);
  const selectedInMore = overflow.some(item => item.key === value) ? selected : undefined;

  return <div className="order-navigation">
    <nav ref={navigation} aria-label="Order lifecycle" className="order-navigation__tabs border-b border-border">
      {visible.map(item => <button key={item.key} type="button" onClick={() => onChange(item.key)} aria-current={value === item.key ? 'page' : undefined} className={cn(tabClassName, value === item.key ? activeClassName : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground')}>
        <StatusLabel item={item} loaded={loaded} active={value === item.key} />
      </button>)}
      {overflow.length > 0 && <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" aria-label={selectedInMore ? `More order statuses, selected: ${selectedInMore.label} ${loaded ? selectedInMore.count : '—'}` : 'More order statuses'} aria-current={selectedInMore ? 'page' : undefined} className={cn(tabClassName, 'order-navigation__more', selectedInMore ? activeClassName : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground')}>
            {selectedInMore ? <StatusLabel item={selectedInMore} loaded={loaded} active /> : <span>More</span>}
            <ChevronDown aria-hidden="true" className="size-4 shrink-0" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-60 max-w-[calc(100vw-24px)] overflow-y-auto">
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">More statuses</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={value} onValueChange={next => onChange(next as OrderQueue)}>
            {overflow.map(item => <DropdownMenuRadioItem key={item.key} value={item.key} className={cn('min-h-11 gap-2 [&>span:last-child]:ml-auto', item.key === value && 'text-primary')}>
              <StatusLabel item={item} loaded={loaded} active={item.key === value} />
            </DropdownMenuRadioItem>)}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>}
    </nav>
    <div aria-hidden="true" className="order-navigation__measure">
      <div ref={measurements} className="order-navigation__measure-row">
        {items.map(item => <span key={item.key} data-status-width className={tabClassName}><StatusLabel item={item} loaded={loaded} active={value === item.key} /></span>)}
        <span data-more-width className={tabClassName}><span>More</span><ChevronDown className="size-4 shrink-0" /></span>
        {selected && <span data-selected-width className={tabClassName}><StatusLabel item={selected} loaded={loaded} active /><ChevronDown className="size-4 shrink-0" /></span>}
      </div>
    </div>
  </div>;
}
