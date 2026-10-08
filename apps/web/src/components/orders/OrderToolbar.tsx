import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Filter, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Field = {label: string; control: ReactNode; active: boolean};
type Props = {
  search: string; onSearch: (value: string) => void;
  status: Field; shop: Field; payment: Field; action: Field;
  tools: ReactNode; advancedFilters: ReactNode;
  open: boolean; onOpenChange: (open: boolean) => void; detailedCount: number;
};

/** Collapse according to the actual workspace width, including when a sidebar is open. */
export function OrderToolbar(props: Props) {
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1400);
  useLayoutEffect(() => {
    const measure = () => { const next = container.current?.getBoundingClientRect().width; if (next) setWidth(next); };
    measure();
    if (typeof ResizeObserver === 'undefined' || !container.current) return;
    const observer = new ResizeObserver(measure);
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  const fields = [
    {...props.status, visible: width >= 870, width: 'w-[200px]'},
    {...props.action, visible: width >= 660, width: 'w-[210px]'},
    {...props.shop, visible: width >= 1040, width: 'w-[140px]'},
    {...props.payment, visible: false, width: 'w-[140px]'},
  ];
  const collapsed = fields.filter(field => !field.visible);
  const count = props.detailedCount + collapsed.filter(field => field.active).length;
  return <div ref={container} className="min-w-0 space-y-3">
    <div aria-label="Order tools" className="flex min-w-0 flex-nowrap items-center gap-2 rounded-xl border bg-card p-3">
      <div className="relative min-w-0 flex-1"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground"/><Input aria-label="Search orders" value={props.search} onChange={event => props.onSearch(event.target.value)} placeholder={width < 620 ? 'Search orders…' : 'Search order, customer or tracking…'} className="h-11 min-w-0 pl-9"/></div>
      {fields.filter(field => field.visible).map(field => <div key={field.label} className={`shrink-0 ${field.width} [&_select]:h-11 [&_select]:w-full [&_select]:min-w-0`}>{field.control}</div>)}
      <Button variant="outline" onClick={() => props.onOpenChange(!props.open)} aria-expanded={props.open} aria-controls="order-filter-panel" className="h-11 shrink-0"><Filter aria-hidden="true" className="size-4"/>Filters{count > 0 && <span className="text-xs tabular-nums">({count})</span>}</Button>
      <div className="shrink-0">{props.tools}</div>
    </div>
    {props.open && <section id="order-filter-panel" aria-label="More order filters" className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Filters</h2><Button variant="ghost" size="sm" onClick={() => props.onOpenChange(false)}>Done</Button></div>
      {collapsed.length > 0 && <div className="mt-3 grid gap-3 sm:grid-cols-2">{collapsed.map(field => <label key={field.label} className="grid min-w-0 gap-1 text-sm">{field.label}{field.control}</label>)}</div>}
      {props.advancedFilters}
    </section>}
  </div>;
}
